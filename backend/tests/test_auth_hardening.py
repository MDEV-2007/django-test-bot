"""Auth hardening from the 2026-11 audit: AUTH-001 (lockout keyed on a spoofable IP),
AUTH-002 (no token revocation), AUTH-004 (WebSocket accepted banned users), API-007
(long-lived impersonation tokens)."""
import time
from unittest import mock

from asgiref.sync import async_to_sync
from django.contrib.auth.models import User
from django.core.cache import cache
from django.test import TestCase
from rest_framework.test import APIClient

from .factories import make_user

PW = 'Kuchli-Parol-2026'


class _Base(TestCase):
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user('victim', password=PW)
        self.c = APIClient()

    def login(self, pw=PW, **extra):
        # JWT `iat` has 1-second resolution and revocation refuses tokens from EARLIER
        # seconds; tests that revoke right after logging in step past that second first.
        return self.c.post('/api/auth/login/', {'username': 'victim', 'password': pw}, format='json', **extra)

    def bearer(self, access):
        c = APIClient()
        c.credentials(HTTP_AUTHORIZATION=f'Bearer {access}')
        return c


class LoginLockoutTests(_Base):
    def test_rotating_x_forwarded_for_does_not_bypass_the_lockout(self):
        codes = [self.login('wrong', HTTP_X_FORWARDED_FOR=f'10.0.0.{i}, 203.0.113.7').status_code
                 for i in range(12)]
        self.assertEqual(codes[-1], 429)

    def test_x_real_ip_from_the_proxy_is_used(self):
        for i in range(8):
            self.login('wrong', HTTP_X_REAL_IP='198.51.100.1', HTTP_X_FORWARDED_FOR=f'1.1.1.{i}')
        self.assertEqual(self.login('wrong', HTTP_X_REAL_IP='198.51.100.1').status_code, 429)
        # A different real client is not locked by someone else's failures (per-IP part).
        self.assertEqual(self.login(PW, HTTP_X_REAL_IP='198.51.100.2').status_code, 200)

    def test_per_username_cap_holds_across_many_real_ips(self):
        for i in range(30):
            self.login('wrong', HTTP_X_REAL_IP=f'192.0.2.{i}')
        self.assertEqual(self.login(PW, HTTP_X_REAL_IP='192.0.2.250').status_code, 429)


class TokenRevocationTests(_Base):
    def test_refresh_rotates_and_the_old_refresh_is_dead(self):
        tokens = self.login().json()
        first = self.c.post('/api/auth/refresh/', {'refresh': tokens['refresh']}, format='json')
        self.assertEqual(first.status_code, 200)
        self.assertIn('refresh', first.json())
        reuse = self.c.post('/api/auth/refresh/', {'refresh': tokens['refresh']}, format='json')
        self.assertEqual(reuse.status_code, 401)

    def test_logout_blacklists_the_refresh(self):
        tokens = self.login().json()
        self.assertEqual(self.c.post('/api/auth/logout/', {'refresh': tokens['refresh']}, format='json').status_code, 200)
        self.assertEqual(self.c.post('/api/auth/refresh/', {'refresh': tokens['refresh']}, format='json').status_code, 401)

    def test_logout_everywhere_also_kills_live_access_tokens(self):
        tokens = self.login().json()
        time.sleep(1.1)
        client = self.bearer(tokens['access'])
        self.assertEqual(client.post('/api/auth/logout/', {'all_devices': True}, format='json').status_code, 200)
        self.assertEqual(client.get('/api/auth/me/').status_code, 401)
        self.assertEqual(self.c.post('/api/auth/refresh/', {'refresh': tokens['refresh']}, format='json').status_code, 401)

    def test_admin_password_reset_revokes_existing_sessions(self):
        tokens = self.login().json()
        time.sleep(1.1)
        admin, _ = make_user('root_admin', role='superadmin')
        ac = APIClient(); ac.force_authenticate(admin)
        self.assertEqual(ac.post(f'/api/panel/users/{self.user.pk}/reset-password/', {}, format='json').status_code, 200)
        self.assertEqual(self.bearer(tokens['access']).get('/api/auth/me/').status_code, 401)
        self.assertEqual(self.c.post('/api/auth/refresh/', {'refresh': tokens['refresh']}, format='json').status_code, 401)

    def test_admin_block_revokes_existing_sessions(self):
        tokens = self.login().json()
        time.sleep(1.1)
        admin, _ = make_user('root_admin2', role='superadmin')
        ac = APIClient(); ac.force_authenticate(admin)
        ac.post(f'/api/panel/users/{self.user.pk}/toggle-block/', {}, format='json')
        self.user.refresh_from_db()
        self.assertFalse(self.user.is_active)
        self.assertEqual(self.bearer(tokens['access']).get('/api/auth/me/').status_code, 401)

    def test_new_login_after_logout_everywhere_works(self):
        tokens = self.login().json()
        self.bearer(tokens['access']).post('/api/auth/logout/', {'all_devices': True}, format='json')
        fresh = self.login().json()
        self.assertEqual(self.bearer(fresh['access']).get('/api/auth/me/').status_code, 200)

    def test_revocation_survives_cache_flush(self):
        tokens = self.login().json()
        time.sleep(1.1)
        client = self.bearer(tokens['access'])
        self.assertEqual(client.post('/api/auth/logout/', {'all_devices': True}, format='json').status_code, 200)
        cache.clear()
        self.assertEqual(client.get('/api/auth/me/').status_code, 401)

    def test_revocation_works_when_redis_cache_raises_error(self):
        tokens = self.login().json()
        time.sleep(1.1)
        client = self.bearer(tokens['access'])
        with mock.patch('accounts.tokens.cache.get', side_effect=RuntimeError('Redis down')), \
             mock.patch('accounts.tokens.cache.set', side_effect=RuntimeError('Redis down')):
            self.assertEqual(client.post('/api/auth/logout/', {'all_devices': True}, format='json').status_code, 200)
            self.assertEqual(client.get('/api/auth/me/').status_code, 401)
            self.assertEqual(self.c.post('/api/auth/refresh/', {'refresh': tokens['refresh']}, format='json').status_code, 401)
            fresh = self.login().json()
            self.assertEqual(self.bearer(fresh['access']).get('/api/auth/me/').status_code, 200)

    def test_stale_cache_does_not_hide_db_revocation(self):
        from accounts.tokens import revoke_user_tokens
        tokens = self.login().json()
        time.sleep(1.1)
        revoke_user_tokens(self.user)
        # Simulate stale cache holding 0 (unrevoked) or an older timestamp
        cache.set(f'jwt_revoked_at:{self.user.pk}', 0, timeout=3600)
        self.assertEqual(self.bearer(tokens['access']).get('/api/auth/me/').status_code, 401)
        self.assertEqual(self.c.post('/api/auth/refresh/', {'refresh': tokens['refresh']}, format='json').status_code, 401)

    def test_jwt_revocation_handles_64bit_post_2038_timestamps(self):
        from accounts.tokens import revoke_user_tokens, token_is_revoked
        from core.models import RewardClaim
        post_2038_ts = 2_500_000_000  # 2049-03-22 (> 2**31 - 1)
        with mock.patch('accounts.tokens.time.time', return_value=float(post_2038_ts)):
            revoke_user_tokens(self.user)
        claim = RewardClaim.objects.get(subject_id=self.user.pk, source='jwt_revoked_at')
        self.assertEqual(claim.count, post_2038_ts)
        cache.clear()
        self.assertTrue(token_is_revoked(self.user.pk, {'iat': post_2038_ts - 1}))
        self.assertFalse(token_is_revoked(self.user.pk, {'iat': post_2038_ts}))

    def test_same_second_token_revocation_invalidates_pre_revoke_token_and_allows_post_revoke_login(self):
        # Task 11: no time.sleep() between login, revoke, and re-login (same wall-clock second!)
        pre_revoke = self.login().json()
        self.assertEqual(
            self.bearer(pre_revoke['access']).post('/api/auth/logout/', {'all_devices': True}, format='json').status_code,
            200,
        )
        # Pre-revoke access and refresh tokens issued in the exact same second must be rejected immediately
        self.assertEqual(self.bearer(pre_revoke['access']).get('/api/auth/me/').status_code, 401)
        self.assertEqual(self.c.post('/api/auth/refresh/', {'refresh': pre_revoke['refresh']}, format='json').status_code, 401)
        # Post-revoke login in the exact same second must succeed
        post_revoke = self.login().json()
        self.assertEqual(self.bearer(post_revoke['access']).get('/api/auth/me/').status_code, 200)



class WebSocketAuthTests(_Base):
    def test_banned_user_token_is_anonymous_on_websocket(self):
        from config.ws_auth import _user_from_token
        tokens = self.login().json()
        self.assertTrue(_user_from_token.__wrapped__(tokens['access']).is_authenticated)
        User.objects.filter(pk=self.user.pk).update(is_active=False)
        self.assertFalse(_user_from_token.__wrapped__(tokens['access']).is_authenticated)

    def test_garbage_token_is_anonymous_not_an_error(self):
        from config.ws_auth import _user_from_token
        self.assertFalse(_user_from_token.__wrapped__('not-a-jwt').is_authenticated)


class ImpersonationTests(_Base):
    def test_impersonation_session_expires_and_cannot_be_renewed(self):
        admin, _ = make_user('imp_admin', role='superadmin')
        ac = APIClient(); ac.force_authenticate(admin)
        res = ac.post(f'/api/panel/users/{self.user.pk}/impersonate/', {}, format='json').json()
        self.assertEqual(self.bearer(res['access']).get('/api/auth/me/').status_code, 200)
        later = time.time() + 2 * 3600
        with mock.patch('accounts.tokens.time.time', return_value=later):
            self.assertEqual(self.bearer(res['access']).get('/api/auth/me/').status_code, 401)
            self.assertEqual(self.c.post('/api/auth/refresh/', {'refresh': res['refresh']}, format='json').status_code, 401)
