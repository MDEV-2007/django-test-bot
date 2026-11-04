"""2-kun: XP / tanga / reward iqtisodiyoti — server hisoblaydi, takror va parallel so'rov
mukofotni ko'paytirmaydi.

Qamrov:
- Avtopilot (learning loop): javob kaliti GET'da yo'q, sprint/arena natijasi serverda,
  arena yutqazilsa 1.0x, klient `arena_won` va `correct_count` qiymatlari e'tiborsiz;
- lenta / story / reel / so'rovnoma XP kunlik limit bilan, muallif o'z so'rovnomasidan XP olmaydi;
- mini-o'yinlar: xato javobdan keyin to'g'risini yuborib mukofot olinmaydi;
- fokus sessiyasi: davomiylik server qayd etgan boshlanish vaqtidan;
- flashcards: mavjud to'plam, bir to'plam kuniga bir marta;
- kunlik vazifa mukofoti bir marta; viral duel bonusi kunlik limit bilan.
"""
from datetime import timedelta
from unittest import mock

from django.core.cache import cache
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import Profile
from core.models import DailyMission, ProfileMission
from core.reward_caps import DAILY_REWARD_LIMITS
from games.models import HistoricalEvent, MapChallenge
from growth.models import ArenaGhostReplay, ViralDuelChallenge
from learning.models import CommunityPost
from learning_loop.models import DailyLearningLoop
from tests_app.models import AnswerOption

from .factories import make_question, make_subject, make_topic, make_user
from .loop_helpers import answer_loop_questions, stage_question_ids


def _keys(obj):
    if isinstance(obj, dict):
        for k, v in obj.items():
            yield k
            yield from _keys(v)
    elif isinstance(obj, list):
        for item in obj:
            yield from _keys(item)


def _balance(profile):
    p = Profile.objects.get(pk=profile.pk)
    return p.xp, p.coins


class _Base(TestCase):
    def setUp(self):
        cache.clear()
        self.user, self.profile = make_user('iqtisod')
        self.client = APIClient()
        self.client.force_authenticate(self.user)


class LearningLoopRewardTests(_Base):
    def setUp(self):
        super().setUp()
        subject = make_subject()
        topic = make_topic(subject=subject, title='Somoniylar')
        for i in range(20):
            make_question(subject=subject, topic=topic, body=f'loop savol {i}')

    def current(self):
        return self.client.get('/api/v1/loop/current/').json()

    def advance(self, stage, payload=None):
        return self.client.post('/api/v1/loop/advance-stage/', {'from_stage': stage, 'payload': payload or {}},
                                format='json')

    def test_stage_data_has_no_answer_key(self):
        data = self.current()['stage_data']
        keys = set(_keys(data['sprint']['questions'] + data['arena']['questions']))
        self.assertFalse(keys & {'is_correct', 'explanation', 'correct_option_id'}, keys)

    def test_answer_only_in_active_stage(self):
        cur = self.current()
        qid = stage_question_ids(cur, 'sprint')[0]
        opt = AnswerOption.objects.filter(question_id=qid, is_correct=True).first()
        res = self.client.post('/api/v1/loop/answer/', {'stage': 'sprint', 'question_id': qid, 'option_id': opt.id},
                               format='json')
        self.assertEqual(res.status_code, 409)  # hali STAGE_1_WARMUP

    def test_answer_returns_key_after_submission_and_is_idempotent(self):
        cur = self.current()
        self.advance('STAGE_1_WARMUP')
        qid = stage_question_ids(cur, 'sprint')[0]
        wrong = AnswerOption.objects.filter(question_id=qid, is_correct=False).first()
        right = AnswerOption.objects.filter(question_id=qid, is_correct=True).first()
        first = self.client.post('/api/v1/loop/answer/', {'stage': 'sprint', 'question_id': qid,
                                                          'option_id': wrong.id}, format='json').json()
        self.assertFalse(first['is_correct'])
        self.assertEqual(first['correct_option_id'], right.id)
        again = self.client.post('/api/v1/loop/answer/', {'stage': 'sprint', 'question_id': qid,
                                                          'option_id': right.id}, format='json').json()
        self.assertTrue(again['duplicate'])
        self.assertFalse(again['is_correct'])

    def test_unanswered_sprint_is_not_a_perfect_sprint(self):
        self.current()
        self.advance('STAGE_1_WARMUP')
        res = self.advance('STAGE_2_SPRINT', {'mistake_question_ids': [], 'correct_count': 12}).json()
        self.assertEqual(res['current_stage'], 'STAGE_3_CLEANUP')
        loop = DailyLearningLoop.objects.get(user=self.user)
        self.assertEqual(loop.sprint_score, 0)
        self.assertLess(loop.combo_multiplier, 2.0 + 0.001)

    def _to_arena(self, cur):
        self.advance('STAGE_1_WARMUP')
        answer_loop_questions(self.client, 'sprint', stage_question_ids(cur, 'sprint'))
        res = self.advance('STAGE_2_SPRINT').json()
        self.assertEqual(res['current_stage'], 'STAGE_4_ARENA')

    def test_lost_arena_pays_base_reward_even_if_client_claims_a_win(self):
        cur = self.current()
        self._to_arena(cur)
        arena_ids = stage_question_ids(cur, 'arena')
        answer_loop_questions(self.client, 'arena', arena_ids, wrong_ids=set(arena_ids))
        xp0, coins0 = _balance(self.profile)
        with mock.patch('learning_loop.views.GHOST_ACCURACY', 1.0):
            res = self.advance('STAGE_4_ARENA', {'arena_won': True}).json()
        self.assertFalse(res['rewards_awarded']['arena_won'])
        xp1, coins1 = _balance(self.profile)
        self.assertEqual(coins1 - coins0, 200)
        self.assertEqual(xp1 - xp0, 100)
        self.assertEqual(res['stage_data']['rewards']['coins'], 200)

    def test_won_arena_pays_combo_reward(self):
        cur = self.current()
        self._to_arena(cur)
        answer_loop_questions(self.client, 'arena', stage_question_ids(cur, 'arena'))
        xp0, coins0 = _balance(self.profile)
        with mock.patch('learning_loop.views.GHOST_ACCURACY', 0.0):
            res = self.advance('STAGE_4_ARENA').json()
        self.assertTrue(res['rewards_awarded']['arena_won'])
        # Mukammal sprint 2.0x + g'alaba 0.5 = 2.5x
        self.assertEqual(_balance(self.profile)[1] - coins0, 500)

    def test_repeat_stage4_does_not_pay_twice(self):
        cur = self.current()
        self._to_arena(cur)
        answer_loop_questions(self.client, 'arena', stage_question_ids(cur, 'arena'))
        self.assertEqual(self.advance('STAGE_4_ARENA').status_code, 200)
        coins_after = _balance(self.profile)[1]
        self.assertEqual(self.advance('STAGE_4_ARENA').status_code, 409)
        self.assertEqual(_balance(self.profile)[1], coins_after)

    def test_arena_without_any_answer_is_a_loss(self):
        cur = self.current()
        self._to_arena(cur)
        with mock.patch('learning_loop.views.GHOST_ACCURACY', 0.0):
            res = self.advance('STAGE_4_ARENA', {'arena_won': True}).json()
        self.assertFalse(res['rewards_awarded']['arena_won'])


class SocialXpCapTests(_Base):
    def test_feed_posts_give_xp_only_up_to_daily_cap(self):
        cap = DAILY_REWARD_LIMITS['social_post']
        xp0, _ = _balance(self.profile)
        earned = []
        for i in range(cap + 2):
            res = self.client.post('/api/learning/feed/create/', {'title': f'Yutuq {i}', 'caption': 'x'})
            self.assertEqual(res.status_code, 200, res.content)
            earned.append(res.json()['xp_earned'])
        self.assertEqual(earned, [15] * cap + [0, 0])
        self.assertEqual(_balance(self.profile)[0] - xp0, 15 * cap)

    def _sos_post(self, author):
        return CommunityPost.objects.create(
            author=author, post_type='sos_question', title='SOS', caption='?',
            poll_data={'options': ['A', 'B'], 'correct_option': 'A', 'votes': {'A': 0, 'B': 0},
                       'voted_users': {}, 'explanation': ''},
        )

    def test_author_gets_no_xp_for_own_poll(self):
        post = self._sos_post(self.user)
        xp0, _ = _balance(self.profile)
        self.client.post(f'/api/learning/feed/{post.id}/vote-poll/', {'selected_option': 'A'}, format='json')
        self.assertEqual(_balance(self.profile)[0], xp0)

    def test_voter_gets_xp_once(self):
        author, _ = make_user('muallif')
        post = self._sos_post(author)
        xp0, _ = _balance(self.profile)
        for _ in range(3):
            res = self.client.post(f'/api/learning/feed/{post.id}/vote-poll/', {'selected_option': 'A'},
                                   format='json')
            self.assertEqual(res.status_code, 200)
        self.assertEqual(_balance(self.profile)[0] - xp0, 5)
        post.refresh_from_db()
        self.assertEqual(post.poll_data['votes']['A'], 1)


class GameRewardTests(_Base):
    def setUp(self):
        super().setUp()
        self.challenge = MapChallenge.objects.create(title='Poytaxt', description='?', correct_location='Buxoro',
                                                     options=['Buxoro', 'Xiva'])

    def test_map_wrong_then_right_pays_nothing(self):
        url = '/api/games/map/'
        wrong = self.client.post(url, {'challenge_id': self.challenge.id, 'region': 'Xiva'}, format='json').json()
        self.assertFalse(wrong['correct'])
        xp0, _ = _balance(self.profile)
        right = self.client.post(url, {'challenge_id': self.challenge.id, 'region': 'Buxoro'}, format='json').json()
        self.assertTrue(right['correct'])
        self.assertEqual(right['xp'], 0)
        self.assertEqual(_balance(self.profile)[0], xp0)

    def test_map_first_right_answer_pays(self):
        res = self.client.post('/api/games/map/', {'challenge_id': self.challenge.id, 'region': 'Buxoro'},
                               format='json').json()
        self.assertEqual(res['xp'], 80)

    def test_timeline_rejects_unserved_events(self):
        events = [HistoricalEvent.objects.create(title=f'V{i}', year=1000 + i) for i in range(6)]
        res = self.client.post('/api/games/timeline/', {'event_ids': [e.id for e in events[:4]]}, format='json')
        self.assertEqual(res.status_code, 400)

    def test_timeline_served_set_pays_once(self):
        subject = make_subject()
        for i in range(4):
            HistoricalEvent.objects.create(subject=subject, title=f'V{i}', year=1000 + i)
        served = self.client.get(f'/api/games/timeline/?subject={subject.slug}').json()['events']
        self.assertEqual(len(served), 4)
        ids = [e['id'] for e in sorted(served, key=lambda e: HistoricalEvent.objects.get(pk=e['id']).year)]
        first = self.client.post('/api/games/timeline/', {'event_ids': ids}, format='json')
        self.assertEqual(first.json()['xp'], 100)
        again = self.client.post('/api/games/timeline/', {'event_ids': ids}, format='json')
        self.assertEqual(again.status_code, 400)


class StudySessionTests(_Base):
    URL_START = '/api/learning/study/start/'
    URL_DONE = '/api/learning/study/complete/'

    def test_complete_without_start_pays_nothing(self):
        res = self.client.post(self.URL_DONE, {'duration_minutes': 60}, format='json').json()
        self.assertEqual(res['xp_earned'], 0)

    def test_instant_complete_pays_nothing(self):
        self.client.post(self.URL_START)
        res = self.client.post(self.URL_DONE, {'duration_minutes': 60}, format='json').json()
        self.assertEqual(res['xp_earned'], 0)

    def test_real_session_pays_by_server_elapsed_time_once(self):
        self.client.post(self.URL_START)
        later = timezone.now() + timedelta(minutes=25, seconds=5)
        with mock.patch('learning.api.timezone.now', return_value=later):
            res = self.client.post(self.URL_DONE, {'duration_minutes': 60, 'goals_done': 0}, format='json').json()
            # Klient 60 deydi, server 25 daqiqa o'lchadi -> 25 XP.
            self.assertEqual(res['xp_earned'], 25)
            again = self.client.post(self.URL_DONE, {'duration_minutes': 60}, format='json').json()
        self.assertEqual(again['xp_earned'], 0)


class FlashcardRewardTests(_Base):
    URL = '/api/learning/flashcards/complete/'

    def test_unknown_deck_is_404(self):
        self.assertEqual(self.client.post(self.URL, {'deck_id': 'yoq'}, format='json').status_code, 404)

    def test_same_deck_pays_once_per_day(self):
        first = self.client.post(self.URL, {'deck_id': 101}, format='json').json()
        second = self.client.post(self.URL, {'deck_id': 101}, format='json').json()
        self.assertEqual(first['xp_earned'], 25)
        self.assertEqual(second['xp_earned'], 0)


class MissionAndDuelTests(_Base):
    def test_mission_reward_paid_once(self):
        from core.missions import advance_missions
        mission = DailyMission.objects.create(title='1 test', description='-', xp_reward=100, coin_reward=10,
                                              target_count=1, action_type='test')
        ProfileMission.objects.create(profile=self.profile, mission=mission)
        _, coins0 = _balance(self.profile)
        advance_missions(self.profile, 'test')
        advance_missions(self.profile, 'test')
        self.assertEqual(_balance(self.profile)[1] - coins0, 10)
        self.assertTrue(ProfileMission.objects.get(profile=self.profile, mission=mission).is_completed)

    def test_duel_invite_bonus_is_capped(self):
        cap = DAILY_REWARD_LIMITS['duel_invite_bonus']
        _, coins0 = _balance(self.profile)
        for i in range(cap + 2):
            replay = ArenaGhostReplay.objects.create(player=self.profile)
            duel = ViralDuelChallenge.objects.create(creator=self.profile, replay=replay,
                                                     duel_token=f'tok{i}', creator_score=10)
            friend, _ = make_user(f'dost{i}')
            c = APIClient()
            c.force_authenticate(friend)
            self.assertEqual(c.post(f'/api/growth/arena/duel/{duel.duel_token}/submit/', {'score': 5},
                                    format='json').status_code, 200)
        self.assertEqual(_balance(self.profile)[1] - coins0, 100 * cap)


class ShopDoubleSpendTests(TestCase):
    def test_stale_profile_cannot_double_spend(self):
        """Ikki "parallel" so'rov bir xil eski balansni ko'rsa ham (bir xil stale obyekt),
        server balansni qulf ostida qayta o'qiydi — ikkinchi xarid rad etiladi."""
        from shop import services
        from .factories import make_freeze_item
        _, profile = make_user('xaridor', coins=150)
        item = make_freeze_item(price=150)
        stale_a = Profile.objects.get(pk=profile.pk)
        stale_b = Profile.objects.get(pk=profile.pk)
        services.purchase_item(stale_a, item)
        with self.assertRaises(services.ShopError):
            services.purchase_item(stale_b, item)
        self.assertEqual(Profile.objects.get(pk=profile.pk).coins, 0)

    def test_negative_price_item_cannot_exist(self):
        """Manfiy narx (tanga "yaratish") DB darajasida taqiqlangan."""
        from django.db import IntegrityError, transaction
        from .factories import make_shop_item
        with self.assertRaises(IntegrityError), transaction.atomic():
            make_shop_item(slug='bug_item', price=-500)
