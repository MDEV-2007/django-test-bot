"""Texnik ishlar rejimi adminni QULFLAB QO'YMASLIGI kerak.

Bu fayldagi eng muhim testlar — `test_panel_api_stays_reachable...` va
`test_auth_api_stays_reachable...`. Ular real hodisadan keyin yozildi: rejim panel
orqali yoqilgach, panelning o'zi ishlamay qoldi va uni o'chirishning yagona yo'li
serverdagi shell bo'lib qoldi.

Sabab ikkita edi:
  1. Middleware ruxsat ro'yxatida faqat eski `/panel/` yo'li bor edi; Next.js paneli
     esa `/api/panel/` dan ma'lumot oladi.
  2. JWT so'rovida `request.user` middleware bosqichida hali AnonymousUser — ya'ni
     "super admin bo'lsa o'tkaz" istisnosi umuman ishlamasdi.
"""
from django.contrib.auth.models import User
from django.core.cache import cache
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import ensure_profile_for_user
from panel.models import SiteSettings


class MaintenanceModeTests(TestCase):
    def setUp(self):
        cache.clear()
        self.admin = User.objects.create_user('bosh_admin', password='x', is_superuser=True)
        ensure_profile_for_user(self.admin)
        self.student = User.objects.create_user('oquvchi', password='x')
        ensure_profile_for_user(self.student)

        settings_obj = SiteSettings.load()
        settings_obj.maintenance_mode = True
        settings_obj.save()
        cache.delete('maintenance_mode')

    def tearDown(self):
        cache.clear()

    def _client_for(self, user):
        client = APIClient()
        token = RefreshToken.for_user(user).access_token
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        return client

    # ── Qulflab qo'ymaslik ────────────────────────────────────────────────────────

    def test_panel_api_stays_reachable_for_superadmin_during_maintenance(self):
        """Rejimni O'CHIRADIGAN ekranning ma'lumot manbai ochiq qolishi shart."""
        response = self._client_for(self.admin).get('/api/panel/settings/')

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()['maintenance_mode'])

    def test_superadmin_can_turn_maintenance_off_through_the_api(self):
        """To'liq tiklanish yo'li: admin panel orqali rejimni o'chira olishi kerak."""
        client = self._client_for(self.admin)

        response = client.put('/api/panel/settings/', {
            'site_name': 'Ilm Ildizi', 'maintenance_mode': False,
        })

        self.assertEqual(response.status_code, 200)
        SiteSettings.load()  # keshni yangilaydi
        self.assertFalse(SiteSettings.objects.get(pk=1).maintenance_mode)

    def test_auth_api_stays_reachable_during_maintenance(self):
        """Token yangilash ishlamasa, tokeni eskirgan admin qayta kira olmaydi."""
        response = APIClient().post('/api/auth/login/', {
            'username': 'bosh_admin', 'password': 'x',
        })

        self.assertNotEqual(response.status_code, 503)

    def test_superadmin_is_recognised_through_a_jwt_on_a_gated_path(self):
        """JWT bilan kelgan super admin oddiy sahifalarni ham ko'ra olishi kerak —
        middleware bosqichida `request.user` hali AnonymousUser bo'lsa ham."""
        response = self._client_for(self.admin).get('/api/tests/')

        self.assertNotEqual(response.status_code, 503)

    # ── Rejim haqiqatan ishlashi ──────────────────────────────────────────────────

    def test_student_is_blocked_during_maintenance(self):
        response = self._client_for(self.student).get('/api/tests/')

        self.assertEqual(response.status_code, 503)
        self.assertTrue(response.json()['maintenance'])

    def test_anonymous_request_is_blocked_during_maintenance(self):
        response = APIClient().get('/api/tests/')

        self.assertEqual(response.status_code, 503)

    def test_invalid_token_does_not_crash_the_middleware(self):
        """Yaroqsiz token — bu shunchaki "admin emas", 500 emas."""
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION='Bearer aslo-token-emas')

        response = client.get('/api/tests/')

        self.assertEqual(response.status_code, 503)

    def test_everything_reopens_when_maintenance_is_off(self):
        settings_obj = SiteSettings.load()
        settings_obj.maintenance_mode = False
        settings_obj.save()
        cache.delete('maintenance_mode')

        response = self._client_for(self.student).get('/api/tests/')

        self.assertNotEqual(response.status_code, 503)


class MaintenanceCommandTests(TestCase):
    """Panel butunlay ishlamay qolganda ishlatiladigan zaxira yo'l."""

    def tearDown(self):
        cache.clear()

    def test_command_turns_maintenance_off_and_clears_the_cache(self):
        from django.core.management import call_command

        settings_obj = SiteSettings.load()
        settings_obj.maintenance_mode = True
        settings_obj.save()
        cache.set('maintenance_mode', True, 30)

        call_command('maintenance_mode', 'off')

        self.assertFalse(SiteSettings.objects.get(pk=1).maintenance_mode)
        # Kesh tozalanmasa, o'zgarish 30 soniyagacha kuchga kirmasdi.
        self.assertIsNone(cache.get('maintenance_mode'))
