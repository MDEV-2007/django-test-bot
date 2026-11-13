"""Phase 5 audit: auth / JWT / Telegram login reproducers. SQLite test DB only; no network."""
import hashlib
import hmac
import json
import time
import urllib.parse
from unittest import mock

from asgiref.sync import async_to_sync
from django.contrib.auth.models import User
from django.core.cache import cache
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from accounts.models import Profile
from tests.factories import make_user

PW = 'Kuchli-Parol-2026'


def signed_init_data(bot_token, user, auth_date=None, extra=None):
    fields = {'auth_date': str(int(auth_date or time.time())), 'query_id': 'AAH',
              'user': json.dumps(user, separators=(',', ':'))}
    fields.update(extra or {})
    dcs = '\n'.join(f'{k}={v}' for k, v in sorted(fields.items()))
    secret = hmac.new(b'WebAppData', bot_token.encode(), hashlib.sha256).digest()
    fields['hash'] = hmac.new(secret, dcs.encode(), hashlib.sha256).hexdigest()
    return urllib.parse.urlencode(fields)


class _Base(TestCase):
    def setUp(self):
        cache.clear()
        self.c = APIClient()
        self.user = User.objects.create_user('victim', password=PW)

    def login(self, pw=PW, xff=None, client=None):
        extra = {'HTTP_X_FORWARDED_FOR': xff} if xff else {}
        return (client or self.c).post('/api/auth/login/', {'username': 'victim', 'password': pw}, format='json', **extra)


class BruteForceTests(_Base):
    def test_AUTH_001_lockout_bypass_by_rotating_x_forwarded_for(self):
        locked = [self.login('wrong').status_code for _ in range(9)]
        rotated = [self.login('wrong', xff=f'10.0.0.{i}').status_code for i in range(30)]
        ok = self.login(PW, xff='10.0.1.1').status_code
        print('\n[AUTH-001] same IP: last code', locked[-1], '| 30 tries with rotating XFF codes:', sorted(set(rotated)),
              '| correct password after 39 failures:', ok)
        self.assertEqual(locked[-1], 429)
        self.assertNotIn(429, rotated)
        self.assertEqual(ok, 200)

    def test_AUTH_008_register_and_social_login_have_no_throttle(self):
        codes = [self.c.post('/api/auth/register/', {'username': f'bot{i:03d}', 'first_name': 'B', 'password': PW},
                             format='json').status_code for i in range(40)]
        print('\n[AUTH-008] 40 rapid registrations ->', {c: codes.count(c) for c in set(codes)})
        self.assertEqual(codes.count(200), 40)


class ReferralFarmTests(_Base):
    def test_AUTH_009_unlimited_referral_coins_from_scripted_signups(self):
        from accounts.referrals import ensure_referral_code
        ref = Profile.objects.get(user=self.user)
        code = ensure_referral_code(ref)
        before = Profile.objects.get(pk=ref.pk).coins
        for i in range(25):
            APIClient().post('/api/auth/register/', {'username': f'sock{i:03d}', 'first_name': 'S', 'password': PW,
                                                     'ref': code}, format='json')
        after = Profile.objects.get(pk=ref.pk).coins
        print('\n[AUTH-009] referrer coins', before, '->', after, 'after 25 scripted signups')
        self.assertEqual(after - before, 250)


class TokenLifecycleTests(_Base):
    def test_AUTH_002_refresh_survives_admin_password_reset(self):
        tokens = self.login().json()
        self.user.set_password('Yangi-Parol-2026!'); self.user.save()
        r = self.c.post('/api/auth/refresh/', {'refresh': tokens['refresh']}, format='json')
        old_access = APIClient(); old_access.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
        me = old_access.get('/api/auth/me/')
        print('\n[AUTH-002] after password reset: refresh ->', r.status_code, '| old access /me ->', me.status_code)
        self.assertEqual(r.status_code, 200)
        self.assertEqual(me.status_code, 200)

    def test_AUTH_003_deactivated_user_http_and_refresh(self):
        tokens = self.login().json()
        User.objects.filter(pk=self.user.pk).update(is_active=False)
        r = self.c.post('/api/auth/refresh/', {'refresh': tokens['refresh']}, format='json')
        a = APIClient(); a.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
        me = a.get('/api/auth/me/')
        print('\n[AUTH-003] banned user: refresh ->', r.status_code, '| access /me ->', me.status_code)
        self.assertIn(me.status_code, (401, 403))

    def test_AUTH_004_websocket_accepts_token_of_deactivated_user(self):
        from config.ws_auth import _user_from_token
        tokens = self.login().json()
        User.objects.filter(pk=self.user.pk).update(is_active=False)
        u = async_to_sync(_user_from_token)(tokens['access'])
        print('\n[AUTH-004] WS user for banned account ->', getattr(u, 'username', u), '| authenticated:', u.is_authenticated)
        self.assertTrue(u.is_authenticated)

    def test_AUTH_010_refresh_not_rotated_and_reusable(self):
        tokens = self.login().json()
        r1 = self.c.post('/api/auth/refresh/', {'refresh': tokens['refresh']}, format='json').json()
        r2 = self.c.post('/api/auth/refresh/', {'refresh': tokens['refresh']}, format='json')
        print('\n[AUTH-010] refresh returns new refresh:', 'refresh' in r1, '| same refresh reused ->', r2.status_code)
        self.assertEqual(r2.status_code, 200)


class TelegramLoginTests(TestCase):
    URL = '/api/auth/telegram/'
    TG = {'id': 555000111, 'first_name': 'Ali', 'username': 'ali_tg'}

    def setUp(self):
        cache.clear()

    def post(self, init):
        with mock.patch('accounts.api.sync_telegram_avatar', return_value=None):
            return APIClient().post(self.URL, {'initData': init}, format='json')

    @override_settings(TELEGRAM_BOT_TOKEN='123:REAL')
    def test_valid_and_tampered(self):
        good = self.post(signed_init_data('123:REAL', self.TG)).status_code
        tampered = signed_init_data('123:REAL', self.TG).replace('555000111', '555000999')
        bad = self.post(tampered).status_code
        old = self.post(signed_init_data('123:REAL', self.TG, auth_date=time.time() - 25 * 3600)).status_code
        print('\n[TG-OK] valid ->', good, '| tampered user id ->', bad, '| auth_date 25h old ->', old)
        self.assertEqual((good, bad, old), (200, 401, 401))

    @override_settings(TELEGRAM_BOT_TOKEN='123:REAL')
    def test_AUTH_005_init_data_replay_within_24h(self):
        init = signed_init_data('123:REAL', self.TG, auth_date=time.time() - 23 * 3600)
        codes = [self.post(init).status_code for _ in range(3)]
        print('\n[AUTH-005] same 23h-old initData replayed 3x ->', codes)
        self.assertEqual(codes, [200, 200, 200])

    @override_settings(TELEGRAM_BOT_TOKEN='')
    def test_AUTH_006_empty_bot_token_lets_anyone_forge_login(self):
        victim, _ = make_user('tg_victim')
        Profile.objects.filter(user=victim).update(telegram_id='777')
        forged = signed_init_data('', {'id': 777, 'first_name': 'X'})
        r = self.post(forged)
        print('\n[AUTH-006] TELEGRAM_BOT_TOKEN empty -> forged initData for tg_id 777 ->', r.status_code,
              r.json().get('user', {}).get('username'))
        self.assertEqual(r.status_code, 200)

    @override_settings(TELEGRAM_BOT_TOKEN='123:REAL')
    def test_AUTH_007_merge_by_telegram_username(self):
        legacy, _ = make_user('legacy_web')
        Profile.objects.filter(user=legacy).update(telegram_username='ali_tg', telegram_id=None)
        r = self.post(signed_init_data('123:REAL', self.TG))
        print('\n[AUTH-007] first Mini App login of @ali_tg lands in account ->', r.json()['user']['username'])
        self.assertEqual(r.json()['user']['username'], 'legacy_web')

    @override_settings(TELEGRAM_BOT_TOKEN='123:REAL')
    def test_malformed_user_json_is_not_500(self):
        init = signed_init_data('123:REAL', self.TG)
        bad = signed_init_data('123:REAL', {'id': 1}).replace(urllib.parse.quote('{"id":1}'), 'notjson')
        c = APIClient(); c.raise_request_exception = False
        # valid signature over a non-JSON "user" field
        fields = {'auth_date': str(int(time.time())), 'user': 'notjson'}
        dcs = '\n'.join(f'{k}={v}' for k, v in sorted(fields.items()))
        secret = hmac.new(b'WebAppData', b'123:REAL', hashlib.sha256).digest()
        fields['hash'] = hmac.new(secret, dcs.encode(), hashlib.sha256).hexdigest()
        r = c.post(self.URL, {'initData': urllib.parse.urlencode(fields)}, format='json')
        print('\n[TG-MALFORMED] signed non-JSON user ->', r.status_code)
