"""Telegram login / throttling / referral fixes from the 2026-11 audit:
AUTH-005 (24 h initData replay), AUTH-006 (forgeable with an empty bot token),
AUTH-007 (linking by Telegram username), AUTH-008 (no auth throttles),
AUTH-009 (unlimited referral coins), AUTH-012 (500 on malformed user JSON)."""
import hashlib
import hmac
import json
import time
import urllib.parse
from unittest import mock

from django.core.cache import cache
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from accounts.models import Profile

from .factories import make_user

TOKEN = '123:TEST'


def signed(fields, bot_token=TOKEN):
    fields = dict(fields)
    dcs = '\n'.join(f'{k}={v}' for k, v in sorted(fields.items()))
    secret = hmac.new(b'WebAppData', bot_token.encode(), hashlib.sha256).digest()
    fields['hash'] = hmac.new(secret, dcs.encode(), hashlib.sha256).hexdigest()
    return urllib.parse.urlencode(fields)


def init_data(user, age_seconds=0, bot_token=TOKEN):
    return signed({'auth_date': str(int(time.time() - age_seconds)),
                   'user': json.dumps(user, separators=(',', ':'))}, bot_token)


@override_settings(TELEGRAM_BOT_TOKEN=TOKEN, REQUIRE_CHANNEL_SUBSCRIPTION=False)
class TelegramLoginTests(TestCase):
    URL = '/api/auth/telegram/'
    TG = {'id': 555000111, 'first_name': 'Ali', 'username': 'ali_tg'}

    def setUp(self):
        cache.clear()
        self.c = APIClient()
        self.c.raise_request_exception = False

    def post(self, data):
        with mock.patch('accounts.api.sync_telegram_avatar', return_value=None):
            return self.c.post(self.URL, {'initData': data}, format='json')

    def test_fresh_init_data_logs_in(self):
        self.assertEqual(self.post(init_data(self.TG)).status_code, 200)

    def test_init_data_older_than_15_minutes_is_rejected(self):
        self.assertEqual(self.post(init_data(self.TG, age_seconds=20 * 60)).status_code, 401)

    @override_settings(TELEGRAM_BOT_TOKEN='')
    def test_empty_bot_token_disables_telegram_login(self):
        res = self.post(init_data({'id': 777, 'first_name': 'X'}, bot_token=''))
        self.assertEqual(res.status_code, 503)

    def test_signed_but_malformed_user_is_400(self):
        res = self.post(signed({'auth_date': str(int(time.time())), 'user': 'notjson'}))
        self.assertEqual(res.status_code, 400)

    def test_first_login_is_not_merged_into_an_account_by_username(self):
        legacy, _ = make_user('legacy_web')
        Profile.objects.filter(user=legacy).update(telegram_username='ali_tg', telegram_id=None)
        res = self.post(init_data(self.TG))
        self.assertNotEqual(res.json()['user']['username'], 'legacy_web')
        self.assertIsNone(Profile.objects.get(user=legacy).telegram_id)


class AuthThrottleTests(TestCase):
    def setUp(self):
        cache.clear()

    @override_settings(REST_FRAMEWORK={
        'DEFAULT_AUTHENTICATION_CLASSES': ('accounts.jwt_auth.AuditAwareJWTAuthentication',),
        'DEFAULT_PERMISSION_CLASSES': ('rest_framework.permissions.IsAuthenticated',),
        'DEFAULT_THROTTLE_RATES': {'auth': '1000/min', 'register': '3/hour', 'auth_refresh': '1000/min',
                                   'quiz_session': '30/min', 'quiz_answer': '120/min'},
        'NUM_PROXIES': 1,
    })
    def test_register_is_throttled_per_client(self):
        from rest_framework.throttling import SimpleRateThrottle
        with mock.patch.object(SimpleRateThrottle, 'THROTTLE_RATES',
                               {'auth': '1000/min', 'register': '3/hour', 'auth_refresh': '1000/min'}):
            codes = [APIClient().post('/api/auth/register/', {'username': f'bot{i}', 'first_name': 'B',
                                                              'password': 'Kuchli-Parol-2026'}, format='json').status_code
                     for i in range(5)]
        self.assertEqual(codes[:3], [200, 200, 200])
        self.assertEqual(codes[3], 429)


class ReferralCapTests(TestCase):
    def setUp(self):
        cache.clear()

    def test_referrer_bonus_is_capped_per_day(self):
        from accounts.referrals import REFERRAL_BONUS_COINS, ensure_referral_code
        from core.reward_caps import DAILY_REWARD_LIMITS
        _, referrer = make_user('ref_owner')
        code = ensure_referral_code(referrer)
        limit = DAILY_REWARD_LIMITS['referral_bonus']
        for i in range(limit + 5):
            APIClient().post('/api/auth/register/', {'username': f'sock{i:03d}', 'first_name': 'S',
                                                     'password': 'Kuchli-Parol-2026', 'ref': code}, format='json')
        self.assertEqual(Profile.objects.get(pk=referrer.pk).coins, limit * REFERRAL_BONUS_COINS)
        # every new account is still linked and gets its own welcome bonus
        self.assertEqual(Profile.objects.filter(referred_by=referrer).count(), limit + 5)
