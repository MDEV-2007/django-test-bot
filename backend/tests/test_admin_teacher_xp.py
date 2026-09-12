"""Tests verifying superadmins and teachers cannot gain XP and are excluded from leaderboards."""
from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import Profile, ensure_profile_for_user
from leaderboard import services as leaderboard_services
from tests.factories import make_question, make_subject, make_test_set, make_user
from tests_app.models import SubjectScore


class AdminTeacherXpTests(TestCase):
    def setUp(self):
        # Student
        self.student_user, self.student_profile = make_user('student1')
        
        # Superadmin via is_superuser
        self.admin_user = User.objects.create_superuser('superadmin1', 'admin@example.com', 'adminpass123')
        self.admin_profile = ensure_profile_for_user(self.admin_user)
        self.admin_profile.role = 'superadmin'
        self.admin_profile.save()

        # Teacher
        self.teacher_user = User.objects.create_user('teacher1', 'teacher@example.com', 'teacherpass123')
        self.teacher_profile = ensure_profile_for_user(self.teacher_user)
        self.teacher_profile.role = 'teacher'
        self.teacher_profile.save()

        self.subject = make_subject(name='Tarix', slug='tarix')

    def test_add_xp_denied_for_superadmin_and_teacher(self):
        # Adding XP to superadmin returns False and leaves xp at 0
        res = self.admin_profile.add_xp(500)
        self.assertFalse(res)
        self.assertEqual(self.admin_profile.xp, 0)
        self.assertEqual(self.admin_profile.level, 1)

        # Adding XP to teacher returns False and leaves xp at 0
        res_t = self.teacher_profile.add_xp(500)
        self.assertFalse(res_t)
        self.assertEqual(self.teacher_profile.xp, 0)
        self.assertEqual(self.teacher_profile.level, 1)

        # Student gets XP normally
        res_s = self.student_profile.add_xp(500)
        self.assertEqual(self.student_profile.xp, 500)

    def test_save_enforces_zero_xp_for_privileged_users(self):
        # Manually tampering with xp
        self.admin_profile.xp = 9999
        self.admin_profile.level = 10
        self.admin_profile.save()
        self.admin_profile.refresh_from_db()
        self.assertEqual(self.admin_profile.xp, 0)
        self.assertEqual(self.admin_profile.level, 1)

        self.teacher_profile.xp = 8888
        self.teacher_profile.level = 9
        self.teacher_profile.save()
        self.teacher_profile.refresh_from_db()
        self.assertEqual(self.teacher_profile.xp, 0)
        self.assertEqual(self.teacher_profile.level, 1)

    def test_leaderboard_excludes_superadmin_and_teacher(self):
        leaderboard_services.invalidate()

        # Student has XP
        self.student_profile.add_xp(150)
        self.student_profile.refresh_from_db()

        # Force privileged profiles to have XP in DB bypassing save (raw update)
        Profile.objects.filter(id=self.admin_profile.id).update(xp=10000)
        Profile.objects.filter(id=self.teacher_profile.id).update(xp=5000)

        # Overall ranking must ONLY include students
        top = leaderboard_services.get_top_ranking('all')
        pids = [r['profile_id'] for r in top]
        self.assertNotIn(self.admin_profile.id, pids)
        self.assertNotIn(self.teacher_profile.id, pids)
        self.assertIn(self.student_profile.id, pids)

        # Subject ranking must ONLY include students
        SubjectScore.objects.create(profile=self.admin_profile, subject=self.subject, xp=10000)
        SubjectScore.objects.create(profile=self.teacher_profile, subject=self.subject, xp=5000)
        SubjectScore.objects.create(profile=self.student_profile, subject=self.subject, xp=150)
        leaderboard_services.invalidate('tarix')

        top_subject = leaderboard_services.get_top_ranking('tarix')
        sub_pids = [r['profile_id'] for r in top_subject]
        self.assertNotIn(self.admin_profile.id, sub_pids)
        self.assertNotIn(self.teacher_profile.id, sub_pids)
        self.assertIn(self.student_profile.id, sub_pids)

    def test_rank_and_neighbors_for_privileged_users(self):
        # Admin gets (0, [])
        rank, neighbors = leaderboard_services.get_rank_and_neighbors(self.admin_profile, 'all')
        self.assertEqual(rank, 0)
        self.assertEqual(neighbors, [])

        # Teacher gets (0, [])
        rank_t, neighbors_t = leaderboard_services.get_rank_and_neighbors(self.teacher_profile, 'all')
        self.assertEqual(rank_t, 0)
        self.assertEqual(neighbors_t, [])

        # Student gets valid rank
        rank_s, neighbors_s = leaderboard_services.get_rank_and_neighbors(self.student_profile, 'all')
        self.assertGreater(rank_s, 0)
        self.assertTrue(any(n['profile_id'] == self.student_profile.id for n in neighbors_s))

    def test_finish_test_api_gives_no_xp_to_admin(self):
        q = make_question(subject=self.subject, body='2+2?', correct='4', wrong='5')
        test_set = make_test_set(subject=self.subject, questions=[q])

        token = str(RefreshToken.for_user(self.admin_user).access_token)
        self.client.defaults['HTTP_AUTHORIZATION'] = f'Bearer {token}'

        start = self.client.post(f'/api/tests/{test_set.id}/start/')
        attempt_id = start.json()['attempt_id']

        q_data = self.client.get(f'/api/tests/attempts/{attempt_id}/question/?q_idx=1').json()
        correct_choice_id = next(c['id'] for c in q_data['choices'] if c['text'] == '4')

        self.client.post(f'/api/tests/attempts/{attempt_id}/answer/', {
            'question_id': q.id, 'q_idx': 1, 'choice_id': correct_choice_id,
        }, content_type='application/json')

        finish = self.client.post(f'/api/tests/attempts/{attempt_id}/finish/')
        self.assertEqual(finish.status_code, 200)

        self.admin_profile.refresh_from_db()
        self.assertEqual(self.admin_profile.xp, 0)
        self.assertEqual(self.admin_profile.level, 1)
        self.assertFalse(SubjectScore.objects.filter(profile=self.admin_profile).exists())
