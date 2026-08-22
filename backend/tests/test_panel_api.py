"""JSON API for the Super Admin panel (panel/api.py) — /api/panel/*.

Covers: role gating, the CurrentUserMiddleware audit-log attribution fix (the real bug
found while porting this to JWT — see panel/middleware.py's set_current_user docstring),
impersonation via a JWT custom claim, and the higher-risk mutating endpoints (block/unblock,
reset-password, testset duplicate/publish, payment approve/reject).
"""
import io
from decimal import Decimal

from django.contrib.auth.models import User
from django.test import TestCase
from PIL import Image
from rest_framework_simplejwt.tokens import AccessToken, RefreshToken

from panel.models import AuditLog
from premium.models import Payment, SubscriptionPlan
from tests.factories import make_subject, make_test_set, make_user


def _auth_client(client, user):
    access = str(RefreshToken.for_user(user).access_token)
    client.defaults['HTTP_AUTHORIZATION'] = f'Bearer {access}'
    return client


class PanelApiTests(TestCase):
    def setUp(self):
        self.admin, self.admin_profile = make_user('super_admin', role='superadmin')
        _auth_client(self.client, self.admin)

    def test_non_admin_gets_403(self):
        student, _ = make_user('plain_student')
        response = self.client.get('/api/panel/users/', HTTP_AUTHORIZATION=f"Bearer {RefreshToken.for_user(student).access_token}")
        self.assertEqual(response.status_code, 403)

    def test_dashboard_loads(self):
        response = self.client.get('/api/panel/')
        self.assertEqual(response.status_code, 200)
        self.assertIn('stats', response.json())

    def test_users_list_and_search(self):
        make_user('findable_zzz')
        response = self.client.get('/api/panel/users/?q=findable_zzz')
        self.assertEqual(response.status_code, 200)
        usernames = [r['username'] for r in response.json()['results']]
        self.assertIn('findable_zzz', usernames)

    def test_audit_log_attributes_change_to_the_real_admin_not_system(self):
        # This is the CurrentUserMiddleware bug: without set_current_user() in the view,
        # this create would be logged with user=None ("Tizim") instead of self.admin.
        response = self.client.post('/api/panel/subjects/', {
            'name': 'Yangi Fan', 'slug': 'yangi-fan', 'icon_name': 'book', 'color': '#000000', 'order': 0,
        }, content_type='application/json')
        self.assertEqual(response.status_code, 200)

        log = AuditLog.objects.filter(model_name='Fan', action='create').order_by('-timestamp').first()
        self.assertIsNotNone(log)
        self.assertEqual(log.user_id, self.admin.id)

    def test_toggle_block_guards_against_blocking_self(self):
        response = self.client.post(f'/api/panel/users/{self.admin.id}/toggle-block/')
        self.assertEqual(response.status_code, 400)

    def test_toggle_block_a_regular_user(self):
        target, _ = make_user('blockable_user')
        response = self.client.post(f'/api/panel/users/{target.id}/toggle-block/')
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.json()['is_active'])
        target.refresh_from_db()
        self.assertFalse(target.is_active)

    def test_reset_password_returns_a_usable_plaintext_password_once(self):
        target, _ = make_user('resettable_user')
        response = self.client.post(f'/api/panel/users/{target.id}/reset-password/')
        self.assertEqual(response.status_code, 200)
        new_password = response.json()['new_password']
        target.refresh_from_db()
        self.assertTrue(target.check_password(new_password))

    def test_impersonate_then_stop_impersonation_round_trip(self):
        target, _ = make_user('impersonatable_user')
        start = self.client.post(f'/api/panel/users/{target.id}/impersonate/')
        self.assertEqual(start.status_code, 200)
        impersonated_access = start.json()['access']

        token = AccessToken(impersonated_access)
        self.assertEqual(token['impersonator_id'], self.admin.id)
        self.assertEqual(int(token['user_id']), target.id)

        stop = self.client.post('/api/panel/stop-impersonation/', HTTP_AUTHORIZATION=f'Bearer {impersonated_access}')
        self.assertEqual(stop.status_code, 200)
        self.assertEqual(stop.json()['username'], self.admin.username)

    def test_cannot_impersonate_another_admin(self):
        other_admin, _ = make_user('other_admin', role='superadmin')
        response = self.client.post(f'/api/panel/users/{other_admin.id}/impersonate/')
        self.assertEqual(response.status_code, 400)

    def test_testset_duplicate_and_publish(self):
        subject = make_subject()
        ts = make_test_set(subject=subject, title='Original test')
        dup = self.client.post(f'/api/panel/testsets/{ts.id}/duplicate/')
        self.assertEqual(dup.status_code, 200)
        new_id = dup.json()['id']
        self.assertNotEqual(new_id, ts.id)

        publish = self.client.post(f'/api/panel/testsets/{new_id}/toggle-publish/')
        self.assertEqual(publish.status_code, 200)
        self.assertTrue(publish.json()['is_published'])

    def test_payment_approve_grants_entitlement(self):
        user, profile = make_user('payer')
        plan = SubscriptionPlan.objects.create(plan_type='mock_test', name='Mock', price=Decimal('15000'), duration_days=0)
        payment = Payment.objects.create(profile=profile, plan=plan, amount=plan.price, status='pending')

        response = self.client.post(f'/api/panel/payments/{payment.id}/approve/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['status'], 'approved')
        payment.refresh_from_db()
        self.assertEqual(payment.status, 'approved')

    def test_broadcast_with_image_and_no_telegram(self):
        make_user('broadcast_recipient')
        buf = io.BytesIO()
        Image.new('RGB', (5, 5)).save(buf, format='PNG')
        buf.seek(0)
        from django.core.files.uploadedfile import SimpleUploadedFile
        response = self.client.post('/api/panel/broadcast/', {
            'title': 'Salom', 'message': 'Xabar matni', 'audience': 'all', 'via_telegram': False,
            'image': SimpleUploadedFile('b.png', buf.read(), content_type='image/png'),
        }, format='multipart')
        self.assertEqual(response.status_code, 200)
        self.assertGreaterEqual(response.json()['recipients_count'], 1)
