from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase
from rest_framework.test import APIClient


class StudyCompleteTests(TestCase):
    URL = '/api/learning/study/complete/'

    def setUp(self):
        cache.clear()
        user = get_user_model().objects.create_user('stud1', password='x12345678')
        self.profile = user.profile
        self.profile.role = 'student'
        self.profile.save()
        self.client = APIClient()
        self.client.force_authenticate(user)

    def test_standard_session_rewards_25xp_10coins_and_streak(self):
        r = self.client.post(self.URL, {'duration_minutes': 25, 'goals_done': 0}, format='json')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['xp_earned'], 25)
        self.assertEqual(r.data['coins_earned'], 10)
        self.assertEqual(r.data['streak'], 1)
        self.profile.refresh_from_db()
        self.assertEqual(self.profile.xp, 25)
        self.assertEqual(self.profile.coins, 10)

    def test_client_values_are_clamped(self):
        r = self.client.post(self.URL, {'duration_minutes': 99999, 'goals_done': 999}, format='json')
        self.assertLessEqual(r.data['xp_earned'], 85)
        self.assertLessEqual(r.data['coins_earned'], 24)

    def test_daily_cap_blocks_farming(self):
        for _ in range(6):
            self.client.post(self.URL, {'duration_minutes': 25, 'goals_done': 0}, format='json')
        r = self.client.post(self.URL, {'duration_minutes': 25, 'goals_done': 0}, format='json')
        self.assertEqual(r.data['xp_earned'], 0)
        self.assertEqual(r.data['coins_earned'], 0)

    def test_streak_counted_once_per_day(self):
        self.client.post(self.URL, {}, format='json')
        r = self.client.post(self.URL, {}, format='json')
        self.assertEqual(r.data['streak'], 1)

    def test_requires_auth(self):
        r = APIClient().post(self.URL, {}, format='json')
        self.assertIn(r.status_code, (401, 403))
