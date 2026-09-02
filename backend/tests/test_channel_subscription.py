"""Majburiy kanal obunasi: bot gate'i, JSON API va server tomonidagi ikkinchi qatlam.

Eng muhim tekshiruv — `test_unreachable_telegram_does_not_lock_users_out`: gate ATAYLAB
ochiq holatga tushishi kerak, aks holda bot kanalda admin huquqini yo'qotgan kuni butun
platforma hamma uchun yopilib qoladi."""
from unittest.mock import patch

from django.contrib.auth.models import User
from django.core.cache import cache
from django.test import TestCase, override_settings

from accounts.models import ensure_profile_for_user
from telegrambot import subscription

GATE = dict(
    TELEGRAM_BOT_TOKEN='test-token',
    TELEGRAM_REQUIRED_CHANNEL='@ilmildizi',
    REQUIRE_CHANNEL_SUBSCRIPTION=True,
)


def member(status):
    return {'ok': True, 'result': {'status': status}}


@override_settings(**GATE)
class IsSubscribedTests(TestCase):
    def setUp(self):
        cache.clear()

    def test_channel_member_passes(self):
        with patch('telegrambot.subscription.api_call', return_value=member('member')) as call:
            self.assertTrue(subscription.is_subscribed('42'))
        call.assert_called_once()

    def test_left_channel_is_blocked(self):
        with patch('telegrambot.subscription.api_call', return_value=member('left')):
            self.assertFalse(subscription.is_subscribed('42'))

    def test_answer_is_cached(self):
        with patch('telegrambot.subscription.api_call', return_value=member('member')) as call:
            subscription.is_subscribed('42')
            subscription.is_subscribed('42')
        self.assertEqual(call.call_count, 1)

    def test_invalidate_forces_a_fresh_call(self):
        with patch('telegrambot.subscription.api_call', return_value=member('member')) as call:
            subscription.is_subscribed('42')
            subscription.invalidate('42')
            subscription.is_subscribed('42')
        self.assertEqual(call.call_count, 2)

    def test_unknown_user_id_is_treated_as_not_subscribed(self):
        error = {'ok': False, 'description': 'Bad Request: user not found'}
        with patch('telegrambot.subscription.api_call', return_value=error):
            self.assertFalse(subscription.is_subscribed('42'))

    def test_unreachable_telegram_does_not_lock_users_out(self):
        # Bot kanalda admin emas / API yetib bormadi -> hech kim bloklanmaydi.
        error = {'ok': False, 'description': 'Bad Request: chat not found'}
        with patch('telegrambot.subscription.api_call', return_value=error):
            self.assertTrue(subscription.is_subscribed('42'))

    def test_user_without_a_linked_telegram_account_is_never_blocked(self):
        with patch('telegrambot.subscription.api_call') as call:
            self.assertTrue(subscription.is_subscribed(''))
        call.assert_not_called()

    @override_settings(REQUIRE_CHANNEL_SUBSCRIPTION=False)
    def test_disabled_gate_skips_the_api_entirely(self):
        with patch('telegrambot.subscription.api_call') as call:
            self.assertTrue(subscription.is_subscribed('42'))
        call.assert_not_called()

    def test_channel_url_is_built_from_the_username(self):
        self.assertEqual(subscription.channel_url(), 'https://t.me/ilmildizi')


@override_settings(TELEGRAM_WEBHOOK_SECRET='s', **GATE)
class BotGateTests(TestCase):
    def setUp(self):
        cache.clear()

    def _start(self):
        from telegrambot.handlers import process_update
        process_update({'update_id': 1, 'message': {
            'message_id': 1, 'chat': {'id': 42},
            'from': {'id': 42, 'first_name': 'QA'}, 'text': '/start'}})

    @patch('telegrambot.handlers.send_message', return_value={'ok': True})
    @patch('telegrambot.subscription.api_call', return_value=member('left'))
    def test_start_asks_an_unsubscribed_user_to_join(self, _api, send_message):
        self._start()
        text = send_message.call_args[0][1]
        self.assertIn('obuna', text.lower())
        buttons = send_message.call_args.kwargs['reply_markup']['inline_keyboard']
        self.assertEqual(buttons[0][0]['url'], 'https://t.me/ilmildizi')
        self.assertEqual(buttons[1][0]['callback_data'], 'check_subscription')

    @patch('telegrambot.handlers.send_message', return_value={'ok': True})
    @patch('telegrambot.subscription.api_call', return_value=member('left'))
    def test_the_profile_is_still_created_so_the_referral_bonus_survives(self, _api, _send):
        from accounts.models import Profile
        self._start()
        self.assertTrue(Profile.objects.filter(telegram_id='42').exists())

    @patch('telegrambot.handlers.send_message', return_value={'ok': True})
    @patch('telegrambot.subscription.api_call', return_value=member('member'))
    def test_a_subscribed_user_gets_the_normal_menu(self, _api, send_message):
        self._start()
        self.assertIn('xush kelibsiz', send_message.call_args[0][1].lower())

    @patch('telegrambot.handlers.answer_callback')
    @patch('telegrambot.handlers.send_message', return_value={'ok': True})
    def test_check_button_reruns_the_check_and_opens_the_menu(self, send_message, answer):
        from telegrambot.handlers import process_update
        with patch('telegrambot.subscription.api_call', return_value=member('left')):
            self._start()
        with patch('telegrambot.subscription.api_call', return_value=member('member')):
            process_update({'update_id': 2, 'callback_query': {
                'id': 'cq1', 'from': {'id': 42, 'first_name': 'QA'},
                'message': {'chat': {'id': 42}}, 'data': 'check_subscription'}})
        self.assertIn('xush kelibsiz', send_message.call_args[0][1].lower())
        self.assertIn('tasdiqlandi', answer.call_args[0][1].lower())


@override_settings(**GATE)
class SubscriptionApiTests(TestCase):
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user('tg_42', password='pw12345!')
        self.profile = ensure_profile_for_user(self.user)
        self.profile.telegram_id = '42'
        self.profile.save()

    def _auth(self):
        from rest_framework_simplejwt.tokens import RefreshToken
        token = RefreshToken.for_user(self.user).access_token
        return {'HTTP_AUTHORIZATION': f'Bearer {token}'}

    def _miniapp(self):
        """Telegram Mini App ichidan kelgan so'rov — obuna talabi FAQAT shunda ishlaydi."""
        return {**self._auth(), 'HTTP_X_TELEGRAM_MINIAPP': '1'}

    def test_state_endpoint_reports_a_missing_subscription(self):
        with patch('telegrambot.subscription.api_call', return_value=member('left')):
            res = self.client.get('/api/auth/subscription/', **self._miniapp())
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json(),
                         {'required': True, 'subscribed': False,
                          'channel': '@ilmildizi', 'channel_url': 'https://t.me/ilmildizi'})

    def test_check_endpoint_bypasses_the_cache(self):
        with patch('telegrambot.subscription.api_call', return_value=member('left')):
            self.client.get('/api/auth/subscription/', **self._miniapp())
        with patch('telegrambot.subscription.api_call', return_value=member('member')):
            res = self.client.post('/api/auth/subscription/check/', **self._miniapp())
        self.assertTrue(res.json()['subscribed'])

    def test_starting_a_test_is_blocked_for_an_unsubscribed_user(self):
        from tests_app.models import TestSet
        test = TestSet.objects.create(title='Sinov', is_premium=False)
        with patch('telegrambot.subscription.api_call', return_value=member('left')):
            res = self.client.post(f'/api/tests/{test.id}/start/', **self._miniapp())
        self.assertEqual(res.status_code, 403)

    def test_starting_a_test_works_once_subscribed(self):
        from tests_app.models import TestSet
        test = TestSet.objects.create(title='Sinov', is_premium=False)
        with patch('telegrambot.subscription.api_call', return_value=member('member')):
            res = self.client.post(f'/api/tests/{test.id}/start/', **self._miniapp())
        self.assertEqual(res.status_code, 200)

    # ── Saytdan kirgan foydalanuvchi ──────────────────────────────────────────────
    # Qoida: obuna talabi BOT orqali kirgan foydalanuvchiga tegishli. Brauzerdan
    # saytga kirgan odam hech qachon bloklanmaydi — hisobiga Telegram ulangan
    # bo'lsa ham. Quyidagi testlarda `X-Telegram-Miniapp` sarlavhasi ATAYLAB
    # yuborilmaydi: aynan shu "brauzerdan kelgan so'rov" degani.

    def test_website_user_is_never_blocked_from_starting_a_test(self):
        from tests_app.models import TestSet
        test = TestSet.objects.create(title='Sinov', is_premium=False)

        with patch('telegrambot.subscription.api_call', return_value=member('left')):
            res = self.client.post(f'/api/tests/{test.id}/start/', **self._auth())

        self.assertEqual(res.status_code, 200)

    def test_state_endpoint_reports_no_requirement_on_the_website(self):
        """Brauzerda bloklovchi ekran umuman chiqmasligi kerak."""
        with patch('telegrambot.subscription.api_call', return_value=member('left')):
            res = self.client.get('/api/auth/subscription/', **self._auth())

        self.assertFalse(res.json()['required'])
        self.assertTrue(res.json()['subscribed'])

    def test_website_user_reaches_the_ai_mentor(self):
        with patch('telegrambot.subscription.api_call', return_value=member('left')):
            res = self.client.post(
                '/api/learning/mentor/stream/', {'message': 'salom'},
                content_type='application/json', **self._auth(),
            )

        self.assertNotEqual(res.status_code, 403)
