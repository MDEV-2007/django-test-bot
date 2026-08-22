"""Live PvP for Battle Arena: matchmaking + in-battle round exchange over WebSockets.

Two consumers:
  - MatchmakingConsumer: pairs two waiting players (same subject) into a Battle row,
    reusing the existing Battle/BattleRound models. First player to connect creates a
    'searching' Battle and waits in its group; the second player to connect for the
    same subject joins that row, flips it to 'active', and both sides get a
    `matched` event carrying the battle_id + question set.
  - BattleConsumer: once matched, each client opens a fresh socket here. Answers are
    persisted the same way the AI-battle HTTP view does (BattlePlayerAnswer, unique
    per battle_round+player), but a round only resolves — broadcast to BOTH players —
    once both have actually answered, since neither side's answer is known in advance
    the way the bot's is.

Known simplification (v1): no server-side round timer and no reconnect/forfeit
handling — if one player closes the tab mid-round, the other is left waiting. Fine
for an initial rollout; worth revisiting once real usage shows it's needed.
"""
import json
import random
from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.db import IntegrityError, transaction
from django.utils import timezone

from core.missions import advance_missions
from core.models import Notification
from tests_app.models import AnswerOption, Question, Subject
from .models import Battle, BattlePlayerAnswer, BattleRound

ROUNDS_PER_BATTLE = 5
POINTS_PER_CORRECT = 10


def _resolve_ws_subject(scope):
    """Same-origin Django template clients carry a session (selected_subject key, set by
    tests_app.subject_utils.resolve_subject on the HTTP side). The Next.js frontend has no
    Django session at all — it connects with `?subject=<slug>` in the WS URL instead (see
    config/ws_auth.py for the matching `?token=` JWT pattern). Session wins when present,
    since it reflects the subject the same browser most recently browsed on the site."""
    session = scope.get('session')
    slug = session.get('selected_subject') if session else None
    if not slug:
        query = parse_qs((scope.get('query_string') or b'').decode())
        slug = query.get('subject', [None])[0]
    subject = Subject.objects.filter(slug=slug).first() if slug else None
    return subject or Subject.objects.first()


def _avatar_for(profile):
    return profile.avatar_url or f'https://api.dicebear.com/7.x/adventurer/svg?seed={profile.user.username}'


def _player_info(profile):
    if not profile:
        return None
    return {
        'id': profile.id,
        'name': profile.user.first_name or profile.user.username,
        'avatar': _avatar_for(profile),
        'elo': profile.elo_rating,
    }


class MatchmakingConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        user = self.scope['user']
        if not user or not user.is_authenticated:
            await self.close()
            return
        self.profile = await database_sync_to_async(lambda: user.profile)()
        self.battle_group = None
        await self.accept()
        await self._find_or_wait()

    async def disconnect(self, code):
        if self.battle_group:
            await self.channel_layer.group_discard(self.battle_group, self.channel_name)

    async def _find_or_wait(self):
        subject = await database_sync_to_async(_resolve_ws_subject)(self.scope)
        battle, just_matched = await database_sync_to_async(self._match_or_create)(subject)
        self.battle_group = f'battle_{battle.id}'
        await self.channel_layer.group_add(self.battle_group, self.channel_name)

        if just_matched:
            payload = await database_sync_to_async(self._battle_payload)(battle)
            await self.channel_layer.group_send(self.battle_group, {'type': 'match.found', 'battle': payload})

    def _match_or_create(self, subject):
        with transaction.atomic():
            waiting = (
                Battle.objects.select_for_update()
                .filter(status='searching', subject=subject, player2__isnull=True)
                .exclude(player1=self.profile)
                .order_by('created_at')
                .first()
            )
            if waiting:
                waiting.player2 = self.profile
                waiting.status = 'active'
                waiting.save(update_fields=['player2', 'status'])
                self._create_rounds(waiting, subject)
                return waiting, True
            return Battle.objects.create(player1=self.profile, status='searching', subject=subject), False

    def _create_rounds(self, battle, subject):
        q_filter = Question.objects.filter(question_type__in=Question.SINGLE_ANSWER_TYPES)
        if subject:
            q_filter = q_filter.filter(subject=subject)
        questions = list(q_filter.prefetch_related('choices').order_by('?')[:ROUNDS_PER_BATTLE])
        BattleRound.objects.bulk_create([
            BattleRound(battle=battle, question=q, round_number=idx)
            for idx, q in enumerate(questions, start=1)
        ])

    def _battle_payload(self, battle):
        battle.refresh_from_db()
        rounds = list(
            battle.rounds.select_related('question')
            .prefetch_related('question__choices')
            .order_by('round_number')
        )
        questions = []
        for r in rounds:
            choices = list(r.question.choices.all())
            random.shuffle(choices)
            questions.append({
                'round_number': r.round_number,
                'question_id': r.question_id,
                'text': r.question.body,
                'choices': [{'id': c.id, 'text': c.text} for c in choices],
            })
        return {
            'battle_id': battle.id,
            'questions': questions,
            'player1': _player_info(battle.player1),
            'player2': _player_info(battle.player2),
        }

    # Group event handler (channels maps 'match.found' -> match_found)
    async def match_found(self, event):
        await self.send(text_data=json.dumps({'event': 'matched', **event['battle']}))


class BattleConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        user = self.scope['user']
        if not user or not user.is_authenticated:
            await self.close()
            return
        self.profile = await database_sync_to_async(lambda: user.profile)()
        self.battle_id = int(self.scope['url_route']['kwargs']['battle_id'])
        member = await database_sync_to_async(self._is_member)()
        if not member:
            await self.close()
            return
        self.group = f'battle_{self.battle_id}'
        await self.channel_layer.group_add(self.group, self.channel_name)
        await self.accept()

    async def disconnect(self, code):
        if hasattr(self, 'group'):
            await self.channel_layer.group_discard(self.group, self.channel_name)

    def _is_member(self):
        battle = Battle.objects.filter(id=self.battle_id).first()
        return bool(battle and self.profile.id in (battle.player1_id, battle.player2_id))

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
        except ValueError:
            return
        if data.get('action') == 'answer':
            await self._handle_answer(data.get('round_number'), data.get('choice_id'))

    async def _handle_answer(self, round_number, choice_id):
        outcome = await database_sync_to_async(self._save_answer)(round_number, choice_id)
        if outcome is None:
            return  # duplicate/late answer for a round already resolved — ignore
        if not outcome['both_answered']:
            await self.send(text_data=json.dumps({'event': 'waiting_for_opponent', 'round_number': round_number}))
            return

        await self.channel_layer.group_send(self.group, {'type': 'round.result', **outcome['payload']})
        if outcome['battle_finished']:
            finish_payload = await database_sync_to_async(self._finish_battle)()
            if finish_payload:
                await self.channel_layer.group_send(self.group, {'type': 'battle.finished', **finish_payload})

    def _save_answer(self, round_number, choice_id):
        try:
            battle = Battle.objects.select_related('player1', 'player2').get(id=self.battle_id)
            battle_round = BattleRound.objects.select_related('question').get(
                battle=battle, round_number=round_number
            )
        except (Battle.DoesNotExist, BattleRound.DoesNotExist):
            return None

        selected = None
        is_correct = False
        if choice_id:
            selected = AnswerOption.objects.filter(id=choice_id, question=battle_round.question).first()
            is_correct = bool(selected and selected.is_correct)

        try:
            BattlePlayerAnswer.objects.create(
                battle_round=battle_round, player=self.profile,
                selected_choice=selected, is_correct=is_correct,
            )
        except IntegrityError:
            return None  # this player already answered this round

        answers = list(BattlePlayerAnswer.objects.filter(battle_round=battle_round))
        expected = {battle.player1_id, battle.player2_id}
        answered = {a.player_id for a in answers}
        if not expected.issubset(answered):
            return {'both_answered': False}

        def score_for(pid):
            return BattlePlayerAnswer.objects.filter(
                battle_round__battle=battle, player_id=pid, is_correct=True
            ).count() * POINTS_PER_CORRECT

        correct_choice = battle_round.question.choices.filter(is_correct=True).first()
        payload = {
            'round_number': round_number,
            'correct_choice_id': correct_choice.id if correct_choice else None,
            'answers': {
                str(a.player_id): {'choice_id': a.selected_choice_id, 'is_correct': a.is_correct}
                for a in answers
            },
            'scores': {
                str(battle.player1_id): score_for(battle.player1_id),
                str(battle.player2_id): score_for(battle.player2_id),
            },
        }
        total_rounds = battle.rounds.count()
        return {'both_answered': True, 'payload': payload, 'battle_finished': round_number >= total_rounds}

    def _finish_battle(self):
        battle = Battle.objects.select_related('player1', 'player2').get(id=self.battle_id)
        if battle.status == 'finished':
            return None

        def score_for(pid):
            return BattlePlayerAnswer.objects.filter(
                battle_round__battle=battle, player_id=pid, is_correct=True
            ).count() * POINTS_PER_CORRECT

        p1_score, p2_score = score_for(battle.player1_id), score_for(battle.player2_id)
        battle.status = 'finished'
        battle.finished_at = timezone.now()
        if p1_score > p2_score:
            battle.winner = battle.player1
        elif p2_score > p1_score:
            battle.winner = battle.player2
        battle.save()

        results = {}
        for profile, my_score, opp_score in (
            (battle.player1, p1_score, p2_score), (battle.player2, p2_score, p1_score),
        ):
            if my_score > opp_score:
                result, xp, coins, elo = 'win', 200, 20, 25
            elif my_score < opp_score:
                result, xp, coins, elo = 'loss', 20, 0, -15
            else:
                result, xp, coins, elo = 'draw', 50, 5, 0

            profile.add_xp(xp)
            profile.add_coins(coins)
            profile.elo_rating = max(500, profile.elo_rating + elo)
            profile.save()

            # Qatnashish yetarli — g'alaba sharti emas (battles/api.py bilan bir xil).
            advance_missions(profile, 'battle')

            titles = {
                'win': ("Battle g'olibi!", f"Jonli jangda g'olib bo'ldingiz! +{xp} XP, +{coins} tanga, +{elo} ELO."),
                'loss': ("Battle yakunlandi", f"Jonli jangda yutqazdingiz. ELO reytingingiz: {elo} balli o'zgardi."),
                'draw': ("Battle durang!", f"Jonli jang durang bilan yakunlandi. +{xp} XP, +{coins} tanga berildi."),
            }
            title, message = titles[result]
            Notification.objects.create(profile=profile, title=title, message=message, type='battle')
            results[str(profile.id)] = {'result': result, 'xp_gained': xp, 'coins_gained': coins, 'elo_change': elo, 'score': my_score}

        return {'results': results}

    # Group event handlers
    async def round_result(self, event):
        event = dict(event)
        event.pop('type', None)
        await self.send(text_data=json.dumps({'event': 'round_result', **event}))

    async def battle_finished(self, event):
        event = dict(event)
        event.pop('type', None)
        await self.send(text_data=json.dumps({'event': 'battle_finished', **event}))
