"""Telegram webhook: it is a public URL, so authentication and a fast, non-retrying
acknowledgement are the two things that must hold."""
import json
from unittest.mock import patch

from django.test import TestCase, override_settings

SECRET = 'test-webhook-secret'


@override_settings(TELEGRAM_WEBHOOK_SECRET=SECRET)
class WebhookAuthTests(TestCase):
    url = '/telegram/webhook/'
    payload = json.dumps({
        'update_id': 1,
        'message': {'message_id': 1, 'chat': {'id': 42},
                    'from': {'id': 42, 'first_name': 'QA'}, 'text': '/start'},
    })

    def _post(self, secret=None, body=None):
        headers = {'HTTP_X_TELEGRAM_BOT_API_SECRET_TOKEN': secret} if secret else {}
        return self.client.post(self.url, body or self.payload,
                                content_type='application/json', **headers)

    def test_get_is_rejected(self):
        self.assertEqual(self.client.get(self.url).status_code, 405)

    def test_missing_secret_is_forbidden(self):
        self.assertEqual(self._post().status_code, 403)

    def test_wrong_secret_is_forbidden(self):
        self.assertEqual(self._post(secret='not-the-secret').status_code, 403)

    @patch('telegrambot.views.background.submit')
    def test_valid_secret_is_accepted_and_dispatched(self, submit):
        response = self._post(secret=SECRET)
        self.assertEqual(response.status_code, 200)
        submit.assert_called_once()

    @patch('telegrambot.views.background.submit')
    def test_malformed_body_is_acknowledged_without_dispatching(self, submit):
        # Returning non-200 here would make Telegram retry the bad update forever.
        response = self._post(secret=SECRET, body='this is not json')
        self.assertEqual(response.status_code, 200)
        submit.assert_not_called()


@override_settings(TELEGRAM_WEBHOOK_SECRET='')
class WebhookUnconfiguredTests(TestCase):
    def test_refuses_to_run_without_a_configured_secret(self):
        response = self.client.post('/telegram/webhook/', '{}',
                                    content_type='application/json',
                                    HTTP_X_TELEGRAM_BOT_API_SECRET_TOKEN='anything')
        self.assertEqual(response.status_code, 403)


@override_settings(TELEGRAM_WEBHOOK_SECRET=SECRET)
class WebhookHandlerTests(TestCase):
    @patch('telegrambot.handlers.send_message')
    def test_start_creates_a_profile_for_a_new_telegram_user(self, send_message):
        from accounts.models import Profile
        from telegrambot.handlers import process_update

        process_update({'update_id': 2, 'message': {
            'message_id': 1, 'chat': {'id': 555},
            'from': {'id': 555, 'first_name': 'Yangi'}, 'text': '/start'}})

        self.assertTrue(Profile.objects.filter(telegram_id='555').exists())
        send_message.assert_called()
