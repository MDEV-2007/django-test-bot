"""Reward fixes from the 2026-11 audit: ECON-002 (streak from opening the app),
ECON-004/005 (caps keyed on UTC date and stored only in the cache), API-001 (reels quiz
500 + free XP for unknown reels), FE-001 (reel create key), API-002 (paid classroom mock
set takeable through the public test endpoint), FE-005 (test mission with 0 correct)."""
from datetime import timedelta
from unittest import mock

from django.core.cache import cache
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import Profile
from core.models import DailyMission, ProfileMission
from core.reward_caps import DAILY_REWARD_LIMITS, claim_daily_reward, claim_once

from .factories import make_question, make_subject, make_test_set, make_user


class _Base(TestCase):
    def setUp(self):
        cache.clear()
        self.user, self.profile = make_user('rewards_p2')
        self.c = APIClient()
        self.c.force_authenticate(self.user)


class StreakTests(_Base):
    def test_opening_the_dashboard_does_not_bump_the_streak(self):
        Profile.objects.filter(pk=self.profile.pk).update(streak=5, last_active_date=timezone.localdate() - timedelta(days=1))
        self.assertEqual(self.c.get('/api/dashboard/home/').status_code, 200)
        self.assertEqual(Profile.objects.get(pk=self.profile.pk).streak, 5)

    def test_logging_in_does_not_bump_the_streak(self):
        self.user.set_password('Kuchli-Parol-2026'); self.user.save()
        Profile.objects.filter(pk=self.profile.pk).update(streak=5, last_active_date=timezone.localdate() - timedelta(days=1))
        APIClient().post('/api/auth/login/', {'username': self.user.username, 'password': 'Kuchli-Parol-2026'}, format='json')
        self.assertEqual(Profile.objects.get(pk=self.profile.pk).streak, 5)


class DurableCapTests(_Base):
    def test_daily_cap_survives_a_cache_flush(self):
        limit = DAILY_REWARD_LIMITS['flashcards']
        for _ in range(limit):
            self.assertTrue(claim_daily_reward(self.profile.id, 'flashcards'))
        cache.clear()
        self.assertFalse(claim_daily_reward(self.profile.id, 'flashcards'))

    def test_claim_once_survives_a_cache_flush(self):
        self.assertTrue(claim_once(self.profile.id, 'game_map_try', 'q1:today'))
        cache.clear()
        self.assertFalse(claim_once(self.profile.id, 'game_map_try', 'q1:today'))

    def test_cap_uses_the_tashkent_date(self):
        from core.models import RewardClaim
        tashkent_2am = timezone.make_aware(timezone.datetime(2026, 11, 7, 2, 0))
        with mock.patch('django.utils.timezone.now', return_value=tashkent_2am):
            claim_daily_reward(self.profile.id, 'flashcards')
        self.assertEqual(str(RewardClaim.objects.get(source='flashcards').day), '2026-11-07')


class ReelsTests(_Base):
    def test_logged_in_quiz_answer_is_200_and_pays_once(self):
        from learning.api import REELS_DATA
        reel = REELS_DATA[0]
        body = {'reel_id': reel['id'], 'answer_index': reel['quiz']['correct_index']}
        first = self.c.post('/api/learning/reels/quiz/', body, format='json')
        self.assertEqual(first.status_code, 200)
        self.assertEqual(first.json()['xp_earned'], 5)
        self.assertEqual(self.c.post('/api/learning/reels/quiz/', body, format='json').json()['xp_earned'], 0)

    def test_unknown_reel_is_404_and_pays_nothing(self):
        res = self.c.post('/api/learning/reels/quiz/', {'reel_id': 999001, 'answer_index': 0}, format='json')
        self.assertEqual(res.status_code, 404)
        self.assertEqual(Profile.objects.get(pk=self.profile.pk).xp, 0)

    def test_student_reel_create_accepts_the_ui_payload(self):
        res = self.c.post('/api/learning/reels/create/', {
            'subject_slug': 'tarix', 'question': 'Anqara jangi qachon bo\'lgan?',
            'options': ['1402', '1370', '1405', '1398'], 'correct_index': 0, 'explanation': 'Temur va Boyazid',
        }, format='json')
        self.assertIn(res.status_code, (200, 201), res.content)


class ClassroomMockLockTests(_Base):
    def setUp(self):
        super().setUp()
        from django.contrib.auth.models import User

        from accounts.models import ensure_profile_for_user
        from classroom.models import MockTest
        from teacher.models import TeacherProfile
        tuser = User.objects.create_user('ustoz_lock', password='x')
        tprof = ensure_profile_for_user(tuser); tprof.role = 'teacher'; tprof.save(update_fields=['role'])
        teacher = TeacherProfile.objects.create(profile=tprof, full_name='Ustoz')
        subj = make_subject()
        self.test_set = make_test_set(subject=subj, questions=[make_question(subject=subj)], title='Pullik mock')
        MockTest.objects.create(teacher=teacher, subject=subj, test_set=self.test_set, title='Haftalik',
                                scheduled_start=timezone.now() + timedelta(days=2), duration_minutes=60,
                                status='scheduled')

    @override_settings(REQUIRE_CHANNEL_SUBSCRIPTION=False)
    def test_public_start_is_refused(self):
        self.assertEqual(self.c.post(f'/api/tests/{self.test_set.id}/start/').status_code, 403)

    @override_settings(REQUIRE_CHANNEL_SUBSCRIPTION=False)
    def test_set_is_hidden_from_the_catalogue(self):
        ids = [t['id'] for t in self.c.get('/api/tests/').json().get('tests', [])]
        self.assertNotIn(self.test_set.id, ids)


@override_settings(REQUIRE_CHANNEL_SUBSCRIPTION=False)
class TestMissionTests(_Base):
    def setUp(self):
        super().setUp()
        subj = make_subject()
        self.q = [make_question(subject=subj, body=f'Savol {i}') for i in range(4)]
        self.test_set = make_test_set(subject=subj, questions=self.q)
        mission = DailyMission.objects.create(title='1 test', description='-', xp_reward=150, coin_reward=15,
                                              target_count=1, action_type='test')
        self.pm = ProfileMission.objects.create(profile=self.profile, mission=mission)

    def take(self, n_correct, n_answered):
        attempt_id = self.c.post(f'/api/tests/{self.test_set.id}/start/').json()['attempt_id']
        for i, q in enumerate(self.q[:n_answered], start=1):
            choice = q.choices.get(is_correct=i <= n_correct)
            self.c.post(f'/api/tests/attempts/{attempt_id}/answer/',
                        {'question_id': q.id, 'q_idx': i, 'choice_id': choice.id}, format='json')
        self.c.post(f'/api/tests/attempts/{attempt_id}/finish/')
        self.pm.refresh_from_db()

    def test_one_wrong_answer_does_not_complete_the_mission(self):
        self.take(n_correct=0, n_answered=1)
        self.assertFalse(self.pm.is_completed)

    def test_real_attempt_completes_the_mission(self):
        self.take(n_correct=2, n_answered=3)
        self.assertTrue(self.pm.is_completed)
