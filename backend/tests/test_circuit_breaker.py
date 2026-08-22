"""Outbound APIs must fail fast when they are unreachable.

Some hosts (PythonAnywhere's free tier, corporate firewalls) only allow outbound traffic
to whitelisted domains. Everything else fails at the proxy — but only after the full
connect timeout, and then again on every single request. That turned a blocked Groq host
into ~20s of dead wait per page, and with the Ollama fallback behind it up to 80s.

A circuit breaker fixes this: the first network-level failure short-circuits subsequent
calls for a cooldown, so callers drop onto their rule-based fallback immediately.
"""
from unittest.mock import patch

import requests
from django.core.cache import cache
from django.test import TestCase, override_settings

from core import ai_client
from telegrambot import client as tg_client


class AIClientBreakerTests(TestCase):
    def setUp(self):
        cache.clear()

    @override_settings(GROQ_API_KEY='test-key', OLLAMA_API_URL='')
    def test_unreachable_provider_is_only_called_once(self):
        boom = requests.exceptions.ConnectionError('proxy blocked')
        with patch('core.ai_client.requests.post', side_effect=boom) as post:
            first = ai_client.ask_groq([{'role': 'user', 'content': 'salom'}])
            second = ai_client.ask_groq([{'role': 'user', 'content': 'salom'}])
            third = ai_client.ask_groq([{'role': 'user', 'content': 'salom'}])

        self.assertIsNone(first)
        self.assertIsNone(second)
        self.assertIsNone(third)
        self.assertEqual(post.call_count, 1,
                         "after the first network failure the provider must be skipped")

    @override_settings(GROQ_API_KEY='test-key', OLLAMA_API_URL='')
    def test_http_errors_do_not_open_the_circuit(self):
        """A 429/500 means the host is reachable — keep trying, don't disable it."""
        response = requests.Response()
        response.status_code = 429
        with patch('core.ai_client.requests.post', return_value=response) as post:
            ai_client.ask_groq([{'role': 'user', 'content': 'a'}])
            ai_client.ask_groq([{'role': 'user', 'content': 'b'}])
        self.assertEqual(post.call_count, 2)

    @override_settings(GROQ_API_KEY='test-key', OLLAMA_API_URL='')
    def test_uses_a_short_connect_timeout(self):
        """A blocked host must be given up on in seconds, not the full read window."""
        with patch('core.ai_client.requests.post') as post:
            post.return_value.json.return_value = {
                'choices': [{'message': {'content': 'ok'}}]}
            ai_client.ask_groq([{'role': 'user', 'content': 'a'}], timeout=20)

        connect, read = post.call_args.kwargs['timeout']
        self.assertLessEqual(connect, 5)
        self.assertEqual(read, 20)


class TelegramBreakerTests(TestCase):
    def setUp(self):
        cache.clear()

    @override_settings(TELEGRAM_BOT_TOKEN='123:abc')
    def test_unreachable_telegram_is_only_called_once(self):
        boom = requests.exceptions.ConnectionError('proxy blocked')
        with patch.object(tg_client.SESSION, 'post', side_effect=boom) as post:
            for _ in range(3):
                result = tg_client.api_call('sendMessage', chat_id=1, text='hi')
                self.assertFalse(result['ok'])
        self.assertEqual(post.call_count, 1,
                         "a blocked Telegram API must not be retried on every request")

    @override_settings(TELEGRAM_BOT_TOKEN='123:abc')
    def test_send_message_never_raises_when_unreachable(self):
        boom = requests.exceptions.ConnectionError('proxy blocked')
        with patch.object(tg_client.SESSION, 'post', side_effect=boom):
            self.assertFalse(tg_client.send_message(1, 'salom')['ok'])
