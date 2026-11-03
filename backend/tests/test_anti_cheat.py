"""Anti-cheat: tab switches are counted on the server, only for live mocks and the
stress hall, and a flagged attempt keeps its score but loses its mock rank."""
from django.test import TestCase
from rest_framework_simplejwt.tokens import RefreshToken

from tests.factories import make_attempt, make_question, make_subject, make_test_set, make_user
from tests_app.api import TAB_SWITCH_LIMIT


def auth(client, user):
    client.defaults['HTTP_AUTHORIZATION'] = f'Bearer {RefreshToken.for_user(user).access_token}'


class TabSwitchTests(TestCase):
    def setUp(self):
        self.user, self.profile = make_user('ac_student')
        subject = make_subject()
        self.q = make_question(subject=subject)
        self.test_set = make_test_set(subject=subject, questions=[self.q])
        auth(self.client, self.user)

    def _switch(self, attempt):
        return self.client.post(f'/api/tests/attempts/{attempt.id}/tab-switch/').json()

    def test_ordinary_practice_test_is_not_tracked(self):
        attempt = make_attempt(self.profile, self.test_set, [self.q])
        res = self._switch(attempt)
        self.assertFalse(res['enabled'])
        attempt.refresh_from_db()
        self.assertEqual(attempt.tab_switch_count, 0)

    def test_live_mock_flags_at_the_limit_and_finish_cannot_reset_the_count(self):
        self.test_set.is_live_mock = True
        self.test_set.save(update_fields=['is_live_mock'])
        attempt = make_attempt(self.profile, self.test_set, [self.q])

        for i in range(1, TAB_SWITCH_LIMIT):
            res = self._switch(attempt)
            self.assertEqual(res['tab_switches'], i)
            self.assertFalse(res['is_cheating_flagged'])
        self.assertTrue(self._switch(attempt)['is_cheating_flagged'])

        self.client.post(f'/api/tests/attempts/{attempt.id}/finish/', {'tab_switches': 0},
                         content_type='application/json')
        attempt.refresh_from_db()
        self.assertEqual(attempt.tab_switch_count, TAB_SWITCH_LIMIT)
        self.assertTrue(attempt.is_cheating_flagged)
        self.assertTrue(attempt.is_completed)

    def test_question_screen_tells_the_client_when_tracking_is_on(self):
        attempt = make_attempt(self.profile, self.test_set, [self.q])
        attempt.is_stress_mode = True
        attempt.save(update_fields=['is_stress_mode'])
        res = self.client.get(f'/api/tests/attempts/{attempt.id}/question/?q_idx=1').json()
        self.assertTrue(res['anti_cheat'])


class MockRankingTests(TestCase):
    def test_flagged_attempt_gets_no_rank_and_does_not_push_others_down(self):
        admin, _ = make_user('ac_admin', role='superadmin')
        subject = make_subject()
        q = make_question(subject=subject)
        mock = make_test_set(subject=subject, questions=[q], title='Mock 1')
        mock.is_live_mock = True
        mock.save(update_fields=['is_live_mock'])
        for name, score, flagged in [('cheater', 100, True), ('honest', 80, False)]:
            _, profile = make_user(name)
            a = make_attempt(profile, mock, [q])
            a.is_completed, a.score, a.is_cheating_flagged = True, score, flagged
            a.save()

        auth(self.client, admin)
        res = self.client.get(f'/api/panel/mocks/?test_id={mock.id}')
        self.assertEqual(res.status_code, 200)
        items = {i['username']: i for i in res.json()['items']}
        self.assertEqual(items['honest']['rank'], 1)
        self.assertIsNone(items['cheater']['rank'])
        self.assertTrue(items['cheater']['is_cheating_flagged'])
