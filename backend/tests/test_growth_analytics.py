"""Growth analytics: daily activity, client events whitelist, growth metrics, and the
parent invoice price coming from the plan catalogue instead of a hard-coded number."""
from datetime import timedelta
from decimal import Decimal
from unittest.mock import patch

from django.core.cache import cache
from django.test import TestCase
from django.utils import timezone
from rest_framework_simplejwt.tokens import RefreshToken

from analytics.models import DailyActivity, ProductEvent
from analytics.tracking import record_activity
from premium.models import Payment, SubscriptionPlan
from tests.factories import make_user


def auth(client, user):
    client.defaults['HTTP_AUTHORIZATION'] = f'Bearer {RefreshToken.for_user(user).access_token}'


class ActivityTests(TestCase):
    def setUp(self):
        cache.clear()
        self.user, self.profile = make_user('act_student')

    def test_activity_is_written_once_per_day(self):
        record_activity(self.profile)
        record_activity(self.profile)
        self.assertEqual(DailyActivity.objects.filter(profile=self.profile).count(), 1)

    def test_authenticated_requests_record_activity(self):
        auth(self.client, self.user)
        self.client.get('/api/analytics/predicted-score/')
        self.assertTrue(DailyActivity.objects.filter(profile=self.profile, date=timezone.localdate()).exists())


class EventApiTests(TestCase):
    def setUp(self):
        cache.clear()
        self.user, self.profile = make_user('evt_student')
        auth(self.client, self.user)

    def _post(self, name, props=None):
        return self.client.post('/api/analytics/event/', {'name': name, 'props': props or {}},
                                content_type='application/json')

    def test_known_event_is_stored_with_whitelisted_props_only(self):
        self.assertEqual(self._post('paywall_view', {'feature': 'essay', 'evil': 'x' * 500}).status_code, 200)
        ev = ProductEvent.objects.get(profile=self.profile)
        self.assertEqual(ev.props, {'feature': 'essay'})

    def test_unknown_and_server_only_events_are_rejected(self):
        self.assertEqual(self._post('drop_table').status_code, 400)
        self.assertEqual(self._post('parent_invoice_sent').status_code, 400)

    def test_rate_limited(self):
        codes = [self._post('premium_view').status_code for _ in range(32)]
        self.assertIn(429, codes)
        self.assertEqual(ProductEvent.objects.count(), 30)

    def test_anonymous_cannot_post(self):
        self.client.defaults.pop('HTTP_AUTHORIZATION')
        self.assertEqual(self._post('premium_view').status_code, 401)


class GrowthMetricsTests(TestCase):
    def setUp(self):
        cache.clear()
        self.admin, _ = make_user('growth_admin', role='superadmin')
        self.plan = SubscriptionPlan.objects.create(name='PRO', plan_type='lessons', price=Decimal('25000'),
                                                    duration_days=30)

    def test_only_superadmin(self):
        student, _ = make_user('growth_student')
        auth(self.client, student)
        self.assertEqual(self.client.get('/api/analytics/growth/').status_code, 403)

    def test_metrics_count_students_and_retention(self):
        today = timezone.localdate()
        joined = today - timedelta(days=8)
        _, s1 = make_user('g1')
        _, s2 = make_user('g2')
        _, teacher = make_user('g_teacher', role='teacher')
        for p in (s1, s2):
            type(p).objects.filter(pk=p.pk).update(created_at=timezone.now() - timedelta(days=8))
        # make_user → ensure_profile_for_user bugungi faollikni o'zi yozadi; aniq holatdan boshlaymiz.
        DailyActivity.objects.all().delete()
        DailyActivity.objects.bulk_create([
            DailyActivity(profile=s1, date=joined),
            DailyActivity(profile=s1, date=joined + timedelta(days=1)),
            DailyActivity(profile=s1, date=joined + timedelta(days=7)),
            DailyActivity(profile=s2, date=joined),
            DailyActivity(profile=s1, date=today),
            DailyActivity(profile=teacher, date=today),  # o'qituvchi hisoblanmaydi
        ])
        ProductEvent.objects.create(profile=s1, name='paywall_view')
        ProductEvent.objects.create(profile=s1, name='paywall_view')
        Payment.objects.create(profile=s1, plan=self.plan, amount=Decimal('25000'), status='approved',
                               reviewed_at=timezone.now())

        auth(self.client, self.admin)
        data = self.client.get('/api/analytics/growth/').json()
        self.assertEqual(data['activity']['dau'], 1)
        self.assertEqual(data['activity']['mau'], 2)
        steps = {s['key']: s['users'] for s in data['monetization']['steps']}
        self.assertEqual(steps['paywall_view'], 1)
        self.assertEqual(steps['payment_approved'], 1)
        self.assertEqual(Decimal(data['monetization']['revenue']), Decimal('25000'))
        cohort = [c for c in data['retention'] if c['size']][0]
        self.assertEqual(cohort['size'], 2)
        self.assertEqual(cohort['d1'], 50.0)
        self.assertEqual(cohort['d7'], 50.0)


class ParentInvoicePriceTests(TestCase):
    def test_invoice_uses_catalogue_price(self):
        from core.models import ParentConnection
        from core.services import send_parent_vip_invoice

        SubscriptionPlan.objects.create(name='PRO', plan_type='lessons', price=Decimal('25000'), duration_days=30)
        _, profile = make_user('inv_student')
        ParentConnection.objects.create(student=profile, parent_chat_id='123', is_active=True)
        with patch('core.services.send_message', return_value={'ok': True}) as send:
            sent, _, text = send_parent_vip_invoice(profile)
        self.assertEqual(sent, 1)
        self.assertIn('25 000', text)
        self.assertNotIn('39', text)
        button = send.call_args.kwargs['reply_markup']['inline_keyboard'][0][0]['text']
        self.assertIn('25 000', button)
        self.assertNotIn('Payme', button)
