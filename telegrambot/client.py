"""Thin Telegram Bot API client.

A single shared `requests.Session` keeps the TCP+TLS connection to Telegram alive between
calls instead of paying a fresh handshake every time, with two quick connect retries so a
single dropped SYN doesn't surface as a user-visible failure.
"""
import json
import logging

import requests
from django.conf import settings
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

logger = logging.getLogger(__name__)

SESSION = requests.Session()
_retry = Retry(total=2, connect=2, read=0, backoff_factor=0.5, status_forcelist=[])
SESSION.mount('https://', HTTPAdapter(max_retries=_retry, pool_maxsize=50))
SESSION.mount('http://', HTTPAdapter(max_retries=_retry, pool_maxsize=50))


def api_url(method):
    return f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/{method}"


def api_call(method, **params):
    """Call a Bot API method. Never raises — a failed Telegram call must not take down
    the caller (a webhook request or an admin action)."""
    if not settings.TELEGRAM_BOT_TOKEN:
        logger.warning("TELEGRAM_BOT_TOKEN is not set; skipping %s", method)
        return {'ok': False}
    try:
        # (connect, read): fail fast on a dead connection instead of burning the
        # read-timeout window meant for slow responses.
        resp = SESSION.post(api_url(method), data=params, timeout=(10, 15))
        data = resp.json()
        if not data.get('ok'):
            logger.warning("Telegram API %s failed: %s", method, data)
        return data
    except Exception:
        logger.exception("Telegram API call %s raised", method)
        return {'ok': False}


def send_message(chat_id, text, reply_markup=None):
    kwargs = {'chat_id': chat_id, 'text': text}
    if reply_markup:
        kwargs['reply_markup'] = json.dumps(reply_markup)
    return api_call('sendMessage', **kwargs)


def answer_callback(callback_query_id, text=None):
    kwargs = {'callback_query_id': callback_query_id}
    if text:
        kwargs['text'] = text
    return api_call('answerCallbackQuery', **kwargs)


def download_file(file_id):
    """Fetch a user-uploaded file (payment screenshot). Returns (bytes, filename)."""
    info = api_call('getFile', file_id=file_id)
    if not info.get('ok'):
        return None
    file_path = info['result']['file_path']
    url = f"https://api.telegram.org/file/bot{settings.TELEGRAM_BOT_TOKEN}/{file_path}"
    try:
        resp = SESSION.get(url, timeout=(10, 30))
        resp.raise_for_status()
    except Exception:
        logger.exception("Failed downloading Telegram file %s", file_id)
        return None
    return resp.content, file_path.split('/')[-1]
