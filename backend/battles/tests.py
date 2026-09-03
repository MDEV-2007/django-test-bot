"""Live PvP (Battle Arena WebSockets) end-to-end test.

Uses channels' WebsocketCommunicator to drive two independent, differently-authenticated
connections against the real consumers — this exercises the actual matchmaking + round
exchange + finish flow, not just the underlying model/view logic. TransactionTestCase
(not TestCase) is required: consumers run their DB work via database_sync_to_async in a
separate thread, which can't see TestCase's uncommitted per-test transaction.
"""
import asyncio
import json

from channels.testing import WebsocketCommunicator
from django.test import TransactionTestCase

from tests.factories import make_question, make_subject, make_user

from .consumers import BattleConsumer, LobbyConsumer, MatchmakingConsumer
from tests_app.models import Subject

from .models import Battle


class LivePvpBattleTests(TransactionTestCase):
    def setUp(self):
        self.subject = make_subject()
        # ROUNDS_PER_BATTLE questions in consumers.py is 5; a couple more than the
        # single-answer minimum so a `[:5]` slice always has enough rows either way.
        self.questions = [make_question(subject=self.subject, body=f"Savol {i}") for i in range(6)]
        self.user1, self.profile1 = make_user('pvp_player_one')
        self.user2, self.profile2 = make_user('pvp_player_two')

    def _connect_matchmaking(self, user):
        communicator = WebsocketCommunicator(MatchmakingConsumer.as_asgi(), '/ws/battles/matchmaking/')
        communicator.scope['user'] = user
        communicator.scope['session'] = {'selected_subject': self.subject.slug}
        return communicator

    def _connect_battle(self, user, battle_id):
        communicator = WebsocketCommunicator(BattleConsumer.as_asgi(), f'/ws/battles/{battle_id}/')
        communicator.scope['user'] = user
        communicator.scope['url_route'] = {'kwargs': {'battle_id': str(battle_id)}}
        return communicator

    def test_two_players_are_matched_and_can_play_a_full_battle(self):
        async def run():
            mm1 = self._connect_matchmaking(self.user1)
            connected1, _ = await mm1.connect()
            self.assertTrue(connected1)

            mm2 = self._connect_matchmaking(self.user2)
            connected2, _ = await mm2.connect()
            self.assertTrue(connected2)

            # Player 2 completes the match — its own consumer sends 'matched' to the
            # whole group, so BOTH sockets (including player 2's own) receive it.
            matched2 = await mm2.receive_json_from(timeout=5)
            self.assertEqual(matched2['event'], 'matched')
            matched1 = await mm1.receive_json_from(timeout=5)
            self.assertEqual(matched1['event'], 'matched')
            self.assertEqual(matched1['battle_id'], matched2['battle_id'])

            battle_id = matched1['battle_id']
            questions = matched1['questions']
            self.assertGreaterEqual(len(questions), 2)
            # Neither player's payload should leak which choice is correct.
            for q in questions:
                for choice in q['choices']:
                    self.assertNotIn('is_correct', choice)

            await mm1.disconnect()
            await mm2.disconnect()

            b1 = self._connect_battle(self.user1, battle_id)
            b2 = self._connect_battle(self.user2, battle_id)
            self.assertTrue((await b1.connect())[0])
            self.assertTrue((await b2.connect())[0])

            battle = await self._get_battle(battle_id)
            self.assertEqual(battle.status, 'active')
            self.assertIsNotNone(battle.player2_id)

            for q in questions:
                correct_id, wrong_id = await self._correct_and_wrong_choice_ids(q['choices'])

                # Player 1 always answers correctly, player 2 always wrong — a
                # deterministic, checkable outcome (player 1 should win overall).
                await b1.send_to(text_data=json.dumps({
                    'action': 'answer', 'round_number': q['round_number'], 'choice_id': correct_id,
                }))
                # Only one player has answered so far — no group broadcast yet, just a
                # private "waiting" ack to the player who just answered.
                waiting = await b1.receive_json_from(timeout=5)
                self.assertEqual(waiting['event'], 'waiting_for_opponent')

                await b2.send_to(text_data=json.dumps({
                    'action': 'answer', 'round_number': q['round_number'], 'choice_id': wrong_id,
                }))

                result1 = await b1.receive_json_from(timeout=5)
                result2 = await b2.receive_json_from(timeout=5)
                self.assertEqual(result1['event'], 'round_result')
                self.assertEqual(result2['event'], 'round_result')
                self.assertEqual(result1['correct_choice_id'], correct_id)
                self.assertTrue(result1['answers'][str(self.profile1.id)]['is_correct'])
                self.assertFalse(result1['answers'][str(self.profile2.id)]['is_correct'])

            finished1 = await b1.receive_json_from(timeout=5)
            finished2 = await b2.receive_json_from(timeout=5)
            self.assertEqual(finished1['event'], 'battle_finished')
            self.assertEqual(finished1['results'][str(self.profile1.id)]['result'], 'win')
            self.assertEqual(finished2['results'][str(self.profile2.id)]['result'], 'loss')

            await b1.disconnect()
            await b2.disconnect()

            battle = await self._get_battle(battle_id)
            self.assertEqual(battle.status, 'finished')
            self.assertEqual(battle.winner_id, self.profile1.id)

        asyncio.run(run())

    async def _get_battle(self, battle_id):
        from channels.db import database_sync_to_async
        return await database_sync_to_async(Battle.objects.get)(id=battle_id)

    async def _correct_and_wrong_choice_ids(self, choices):
        from channels.db import database_sync_to_async
        from tests_app.models import AnswerOption
        ids = [c['id'] for c in choices]
        correct_ids = await database_sync_to_async(
            lambda: list(AnswerOption.objects.filter(id__in=ids, is_correct=True).values_list('id', flat=True))
        )()
        correct_id = correct_ids[0]
        wrong_id = next(i for i in ids if i != correct_id)
        return correct_id, wrong_id


class ChallengeSubjectTests(TransactionTestCase):
    """Direct challenges (LobbyConsumer) used to ignore the subject the challenger had
    picked and fall back to `Subject.objects.first()`. When that subject had no
    single-answer questions the battle was still created, both clients got an empty
    question list, and both were left staring at a blank screen with no way out.
    """

    def setUp(self):
        self.empty = make_subject(name='Ona tili', slug='ona-tili')
        Subject.objects.filter(pk=self.empty.pk).update(order=0)
        self.full = make_subject(name='Tarix', slug='tarix')
        Subject.objects.filter(pk=self.full.pk).update(order=5)
        for i in range(6):
            make_question(subject=self.full, body=f'Savol {i}')
        self.user1, self.profile1 = make_user('lobby_challenger')
        self.user2, self.profile2 = make_user('lobby_target')

    def _lobby(self, user):
        communicator = WebsocketCommunicator(LobbyConsumer.as_asgi(), '/ws/battles/lobby/')
        communicator.scope['user'] = user
        communicator.scope['query_string'] = b''
        return communicator

    async def _mark_both_online(self):
        from channels.db import database_sync_to_async
        from django.utils import timezone

        from accounts.models import Profile
        await database_sync_to_async(
            lambda: Profile.objects.filter(id__in=[self.profile1.id, self.profile2.id])
            .update(last_seen_at=timezone.now())
        )()

    def test_challenge_uses_the_subject_the_challenger_picked(self):
        async def run():
            await self._mark_both_online()
            a, b = self._lobby(self.user1), self._lobby(self.user2)
            self.assertTrue((await a.connect())[0])
            self.assertTrue((await b.connect())[0])

            await a.send_to(text_data=json.dumps({
                'action': 'challenge', 'target_id': self.profile2.id, 'subject': self.full.slug,
            }))
            self.assertEqual((await a.receive_json_from(timeout=5))['event'], 'challenge_sent')
            invite = await b.receive_json_from(timeout=5)
            self.assertEqual(invite['event'], 'challenge_received')

            await b.send_to(text_data=json.dumps({
                'action': 'respond', 'battle_id': invite['battle_id'], 'accept': True,
            }))
            accepted_b = await b.receive_json_from(timeout=5)
            accepted_a = await a.receive_json_from(timeout=5)
            # Both sides get a playable battle — this is what used to come back empty.
            self.assertEqual(len(accepted_a['questions']), len(accepted_b['questions']))
            self.assertGreaterEqual(len(accepted_a['questions']), 2)

            await a.disconnect()
            await b.disconnect()

        asyncio.run(run())

    def test_challenge_on_a_question_less_subject_is_refused(self):
        async def run():
            await self._mark_both_online()
            a, b = self._lobby(self.user1), self._lobby(self.user2)
            self.assertTrue((await a.connect())[0])
            self.assertTrue((await b.connect())[0])

            await a.send_to(text_data=json.dumps({
                'action': 'challenge', 'target_id': self.profile2.id, 'subject': self.empty.slug,
            }))
            failed = await a.receive_json_from(timeout=5)
            self.assertEqual(failed['event'], 'challenge_failed')
            # The target is never bothered, and no half-built battle is left behind.
            self.assertTrue(await b.receive_nothing(timeout=1))
            from channels.db import database_sync_to_async
            self.assertEqual(await database_sync_to_async(Battle.objects.count)(), 0)

            await a.disconnect()
            await b.disconnect()

        asyncio.run(run())

    def test_matchmaking_on_a_question_less_subject_is_refused(self):
        async def run():
            communicator = WebsocketCommunicator(MatchmakingConsumer.as_asgi(), '/ws/battles/matchmaking/')
            communicator.scope['user'] = self.user1
            communicator.scope['session'] = {'selected_subject': self.empty.slug}
            self.assertTrue((await communicator.connect())[0])
            failed = await communicator.receive_json_from(timeout=5)
            self.assertEqual(failed['event'], 'search_failed')
            from channels.db import database_sync_to_async
            self.assertEqual(await database_sync_to_async(Battle.objects.count)(), 0)
            await communicator.disconnect()

        asyncio.run(run())
