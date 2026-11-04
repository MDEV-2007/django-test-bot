"""Release oldidan ochiq qolgan muammolar tuzatilgani:

- moliyaviy tarixli foydalanuvchi o'chirilmaydi (faqat bloklanadi);
- o'z-o'ziga ro'yxatdan o'tgan o'qituvchi tasdiqlanmaguncha ommaviy nashr / "hammaga xabar"
  qila olmaydi; Super Admin tasdiqlaydi (audit bilan);
- postga shikoyat: takrorsiz, o'z postiga emas, yetarli shikoyatda yashiriladi;
- lenta sahifalanadi;
- Stress: vaqt tugagach titulga yozib bo'lmaydi;
- Loop deploy migratsiyasi o'rtada qolgan sprintni 1-bosqichga qaytaradi.
"""
import importlib
from datetime import timedelta
from decimal import Decimal

from django.apps import apps as global_apps
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from learning.models import CommunityPost
from learning_loop.models import DailyLearningLoop
from panel.models import AuditLog
from premium.models import Payment, SubscriptionPlan
from teacher.models import TeacherProfile
from tests_app.models import Attempt

from .factories import make_attempt, make_question, make_subject, make_test_set, make_user


def api(user=None):
    c = APIClient()
    if user is not None:
        c.force_authenticate(user)
    return c


class UserDeleteFinancialHistoryTests(TestCase):
    def setUp(self):
        self.admin, _ = make_user('del_admin', role='superadmin')

    def test_user_with_payments_is_not_deleted(self):
        user, profile = make_user('tolovchi')
        plan = SubscriptionPlan.objects.create(name='Pro', price=Decimal('10000'))
        Payment.objects.create(profile=profile, plan=plan, amount=Decimal('10000'))
        res = api(self.admin).delete(f'/api/panel/users/{user.id}/edit/')
        self.assertEqual(res.status_code, 409)
        self.assertEqual(res.json()['code'], 'financial_history')
        self.assertTrue(Payment.objects.filter(profile=profile).exists())
        user.refresh_from_db()  # hali mavjud

    def test_user_without_financial_history_can_be_deleted(self):
        user, _ = make_user('oddiy_del')
        self.assertEqual(api(self.admin).delete(f'/api/panel/users/{user.id}/edit/').status_code, 200)


class TeacherModerationTests(TestCase):
    def setUp(self):
        self.user, self.profile = make_user('yangi_ustoz')
        res = api(self.user).post('/api/teacher/register/', {'full_name': 'Yangi Ustoz'}, format='json')
        self.assertEqual(res.status_code, 200)
        self.user.refresh_from_db()
        subject = make_subject()
        self.test = make_test_set(subject=subject, questions=[make_question(subject=subject)])
        self.test.created_by = self.user
        self.test.is_published = False
        self.test.save()

    def test_unverified_teacher_cannot_publish_or_broadcast(self):
        c = api(self.user)
        res = c.post(f'/api/teacher/tests/{self.test.pk}/publish/')
        self.assertEqual(res.status_code, 403)
        self.assertEqual(res.json()['code'], 'teacher_not_verified')
        self.test.refresh_from_db()
        self.assertFalse(self.test.is_published)

        c.put(f'/api/teacher/tests/{self.test.pk}/info/', {
            'title': 'T', 'subject': self.test.subject_id, 'category': self.test.category,
            'duration_minutes': 10, 'description': '', 'notify_all': True, 'is_live_mock': True,
        }, format='json')
        self.test.refresh_from_db()
        self.assertFalse(self.test.notify_all)
        self.assertFalse(self.test.is_live_mock)

    def test_admin_verification_unlocks_publishing_and_is_audited(self):
        admin, _ = make_user('mod_admin', role='superadmin')
        res = api(admin).post(f'/api/panel/teachers/{self.user.id}/verify/', {'verify': True}, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertTrue(TeacherProfile.objects.get(profile=self.profile).is_verified)
        self.assertTrue(AuditLog.objects.filter(model_name='TeacherProfile').exists())
        self.assertEqual(api(self.user).post(f'/api/teacher/tests/{self.test.pk}/publish/').status_code, 200)

    def test_only_superadmin_can_verify(self):
        other, _ = make_user('boshqa_ustoz', role='teacher')
        self.assertEqual(api(other).post(f'/api/panel/teachers/{self.user.id}/verify/', {}, format='json').status_code,
                         403)


class PostReportTests(TestCase):
    def setUp(self):
        self.author, _ = make_user('post_muallif')
        self.post = CommunityPost.objects.create(author=self.author, post_type='achievement', title='P', caption='c')

    def report(self, user):
        return api(user).post(f'/api/learning/feed/{self.post.id}/report/', {'reason': 'spam'}, format='json')

    def test_report_rules_and_auto_hide(self):
        self.assertEqual(self.report(self.author).status_code, 400)
        reporters = [make_user(f'shikoyatchi{i}')[0] for i in range(5)]
        first = self.report(reporters[0]).json()
        self.assertFalse(first['already_reported'])
        self.assertTrue(self.report(reporters[0]).json()['already_reported'])
        self.assertEqual(self.post.reports.count(), 1)
        for u in reporters[1:]:
            self.report(u)
        self.post.refresh_from_db()
        self.assertTrue(self.post.is_hidden)
        feed = api(reporters[0]).get('/api/learning/feed/').json()
        self.assertNotIn(self.post.id, [p['id'] for p in feed['posts']])

    def test_admin_can_restore_with_audit(self):
        CommunityPost.objects.filter(pk=self.post.pk).update(is_hidden=True)
        admin, _ = make_user('mod_admin2', role='superadmin')
        res = api(admin).post(f'/api/panel/community/{self.post.id}/visibility/', {'hidden': False}, format='json')
        self.assertEqual(res.status_code, 200)
        self.post.refresh_from_db()
        self.assertFalse(self.post.is_hidden)
        self.assertTrue(AuditLog.objects.filter(model_name='CommunityPost', object_id=str(self.post.id)).exists())
        listing = api(admin).get('/api/panel/community/?moderation=1').json()['posts']
        self.assertEqual(listing, [])


class FeedPaginationTests(TestCase):
    def test_pages(self):
        user, _ = make_user('sahifa')
        for i in range(25):
            CommunityPost.objects.create(author=user, post_type='achievement', title=f'P{i}', caption='c')
        c = api(user)
        p1 = c.get('/api/learning/feed/?page=1').json()
        p2 = c.get('/api/learning/feed/?page=2').json()
        self.assertEqual(len(p1['posts']), 20)
        self.assertTrue(p1['has_more'])
        self.assertEqual(len(p2['posts']), 5)
        self.assertFalse(p2['has_more'])
        self.assertFalse({p['id'] for p in p1['posts']} & {p['id'] for p in p2['posts']})
        self.assertEqual(len(c.get('/api/learning/feed/?page=abc').json()['posts']), 20)


class StressTitulTimeTests(TestCase):
    def test_bubble_rejected_after_time_up(self):
        user, profile = make_user('stress_vaqt')
        subject = make_subject()
        q = make_question(subject=subject)
        test = make_test_set(subject=subject, questions=[q])
        attempt = make_attempt(profile, test, [q])
        Attempt.objects.filter(pk=attempt.pk).update(is_stress_mode=True)
        c = api(user)
        ok = c.post(f'/api/tests/attempts/{attempt.id}/bubble-answer/', {'q_idx': 1, 'letter': 'A'}, format='json')
        self.assertEqual(ok.status_code, 200)
        Attempt.objects.filter(pk=attempt.pk).update(started_at=timezone.now() - timedelta(hours=5))
        late = c.post(f'/api/tests/attempts/{attempt.id}/bubble-answer/', {'q_idx': 1, 'letter': 'B'}, format='json')
        self.assertEqual(late.status_code, 409)
        attempt.refresh_from_db()
        self.assertEqual(attempt.titul_answers.get('1'), 'A')


class LoopDeployMigrationTests(TestCase):
    def test_inflight_sprint_without_session_is_reset(self):
        user, _ = make_user('loop_deploy')
        inflight = DailyLearningLoop.objects.create(user=user, current_stage='STAGE_2_SPRINT')
        other_user, _ = make_user('loop_deploy2')
        arena = DailyLearningLoop.objects.create(user=other_user, current_stage='STAGE_4_ARENA')
        mod = importlib.import_module('learning_loop.migrations.0003_reset_inflight_sprints')
        mod.reset_inflight_sprints(global_apps, None)
        inflight.refresh_from_db()
        arena.refresh_from_db()
        self.assertEqual(inflight.current_stage, 'STAGE_1_WARMUP')
        self.assertEqual(arena.current_stage, 'STAGE_4_ARENA')
