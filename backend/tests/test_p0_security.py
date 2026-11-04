"""P0 audit fixes: stored XSS, coin/XP farming, double-finish races, anonymous AI and
answer-key access. Each test pins one hole that used to be open."""
from django.core.cache import cache
from django.test import TestCase
from rest_framework_simplejwt.tokens import RefreshToken

from b2b_ads.models import EduCenterCampaign, StudentLeadSubmission
from core.reward_caps import DAILY_REWARD_LIMITS
from games.models import HistoricalEvent
from growth.models import ArenaGhostReplay, UserUsageQuota, ViralDuelChallenge
from tests.factories import make_question, make_subject, make_test_set, make_user


def auth(client, user):
    client.defaults['HTTP_AUTHORIZATION'] = f'Bearer {RefreshToken.for_user(user).access_token}'


class QuestionBodySanitizeTests(TestCase):
    def test_script_and_event_handlers_are_stripped_on_save(self):
        q = make_question(body='<p>Savol <b>qalin</b></p><img src="/m/x.png" onerror="alert(1)">'
                               '<script>steal()</script><a href="javascript:alert(1)">x</a>')
        q.refresh_from_db()
        self.assertNotIn('<script', q.body)
        self.assertNotIn('onerror', q.body)
        self.assertNotIn('javascript:', q.body)
        self.assertIn('<b>qalin</b>', q.body)
        self.assertIn('src="/m/x.png"', q.body)

    def test_ckeditor_tables_keep_their_layout(self):
        q = make_question(body='<table border="1" style="width:100%"><tr><td colspan="2">A</td></tr></table>')
        q.refresh_from_db()
        self.assertIn('border="1"', q.body)
        self.assertIn('colspan="2"', q.body)
        self.assertIn('width:100%', q.body)


class LeadCoinFarmTests(TestCase):
    def setUp(self):
        self.user, self.profile = make_user('lead_student')
        self.campaign = EduCenterCampaign.objects.create(center_name='Markaz', title='Kurs')
        auth(self.client, self.user)

    def _submit(self):
        return self.client.post('/api/v1/b2b/submit-lead/', {
            'campaign_id': self.campaign.id, 'full_name': 'Ali', 'phone_number': '+998901234567',
        }, content_type='application/json')

    def test_coins_are_granted_only_for_the_first_lead_per_campaign(self):
        self.assertEqual(self._submit().json()['coins_earned'], 50)
        second = self._submit().json()
        self.assertEqual(second['coins_earned'], 0)
        self.assertTrue(second['already_submitted'])
        self.profile.refresh_from_db()
        self.assertEqual(self.profile.coins, 50)
        self.assertEqual(StudentLeadSubmission.objects.filter(student_profile=self.profile).count(), 1)


class DuelFarmTests(TestCase):
    def setUp(self):
        self.creator_user, self.creator = make_user('duel_creator')
        self.friend_user, self.friend = make_user('duel_friend')
        replay = ArenaGhostReplay.objects.create(player=self.creator, moves_log=[{'is_correct': True}])
        self.duel = ViralDuelChallenge.objects.create(duel_token='tok123', creator=self.creator, replay=replay)

    def _submit(self, user):
        auth(self.client, user)
        return self.client.post(f'/api/growth/arena/duel/{self.duel.duel_token}/submit/',
                                {'score': 50}, content_type='application/json')

    def test_creator_cannot_complete_own_duel_for_the_bonus(self):
        self.assertEqual(self._submit(self.creator_user).status_code, 400)
        self.creator.refresh_from_db()
        self.assertEqual(self.creator.coins, 0)

    def test_bonus_is_granted_once_and_duel_cannot_be_resubmitted(self):
        self.assertEqual(self._submit(self.friend_user).status_code, 200)
        self.assertEqual(self._submit(self.friend_user).status_code, 409)
        self.creator.refresh_from_db()
        self.assertEqual(self.creator.coins, 100)
        self.assertEqual(UserUsageQuota.objects.get(profile=self.creator).free_essay_credits, 2)

    def test_new_duel_token_is_stored_without_the_startapp_prefix(self):
        auth(self.client, self.creator_user)
        res = self.client.post('/api/growth/arena/create-duel/', {}, content_type='application/json').json()
        self.assertFalse(res['duel_token'].startswith('duel_'))
        self.assertIn(f"startapp=duel_{res['duel_token']}", res['share_url'])


class TestRetakeRewardTests(TestCase):
    def setUp(self):
        self.user, self.profile = make_user('retake_student')
        subject = make_subject()
        self.q = make_question(subject=subject)
        self.test_set = make_test_set(subject=subject, questions=[self.q])
        auth(self.client, self.user)

    def _take_and_answer_correctly(self):
        attempt_id = self.client.post(f'/api/tests/{self.test_set.id}/start/').json()['attempt_id']
        correct = self.q.choices.get(is_correct=True)
        self.client.post(f'/api/tests/attempts/{attempt_id}/answer/', {
            'question_id': self.q.id, 'q_idx': 1, 'choice_id': correct.id,
        }, content_type='application/json')
        return attempt_id

    def test_second_finish_of_same_attempt_awards_nothing(self):
        attempt_id = self._take_and_answer_correctly()
        first = self.client.post(f'/api/tests/attempts/{attempt_id}/finish/').json()
        self.assertGreater(first['coins_awarded'], 0)
        self.profile.refresh_from_db()
        coins = self.profile.coins
        second = self.client.post(f'/api/tests/attempts/{attempt_id}/finish/').json()
        self.assertTrue(second['already_completed'])
        self.profile.refresh_from_db()
        self.assertEqual(self.profile.coins, coins)

    def test_retaking_a_finished_test_gives_no_xp_or_coins(self):
        self.client.post(f'/api/tests/attempts/{self._take_and_answer_correctly()}/finish/')
        retake = self.client.post(f'/api/tests/attempts/{self._take_and_answer_correctly()}/finish/').json()
        self.assertEqual(retake['xp_awarded'], 0)
        self.assertEqual(retake['coins_awarded'], 0)


class MiniGameFarmTests(TestCase):
    def setUp(self):
        cache.clear()
        self.user, self.profile = make_user('game_student')
        self.events = [HistoricalEvent.objects.create(title=f'E{i}', year=1000 + i) for i in range(4)]
        auth(self.client, self.user)

    def _post_timeline(self, ids):
        return self.client.post('/api/games/timeline/', {'event_ids': ids}, content_type='application/json')

    def test_single_event_is_not_a_free_win(self):
        self.assertEqual(self._post_timeline([self.events[0].id]).status_code, 400)

    def _play_round(self):
        # Har urinish yangi GET'dan boshlanadi: server faqat o'zi bergan to'plamni qabul qiladi.
        subject = make_subject()
        HistoricalEvent.objects.filter(pk__in=[e.pk for e in self.events]).update(subject=subject)
        served = self.client.get(f'/api/games/timeline/?subject={subject.slug}').json()['events']
        years = {e.id: e.year for e in self.events}
        return self._post_timeline(sorted((e['id'] for e in served), key=years.get))

    def test_rewards_stop_after_the_daily_limit(self):
        for _ in range(DAILY_REWARD_LIMITS['game_timeline']):
            self.assertEqual(self._play_round().json()['xp'], 100)
        over = self._play_round().json()
        self.assertTrue(over['correct'])
        self.assertEqual(over['coins'], 0)
        self.profile.refresh_from_db()
        self.assertEqual(self.profile.coins, 10 * DAILY_REWARD_LIMITS['game_timeline'])


class AnonymousAccessTests(TestCase):
    def test_arena_matchmake_requires_login(self):
        res = self.client.post('/api/growth/arena/matchmake/', {}, content_type='application/json')
        self.assertEqual(res.status_code, 401)

    def test_open_question_ai_requires_login(self):
        res = self.client.post('/api/growth/open-question/evaluate/', {'student_answer': 'x'},
                               content_type='application/json')
        self.assertEqual(res.status_code, 401)
