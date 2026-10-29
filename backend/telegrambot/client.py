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


_DOWN_KEY = 'telegram:api_down'
DOWN_COOLDOWN = 300  # 5 minutes

# Network-level failures mean Telegram could not be reached at all (blocked proxy,
# firewall, DNS). Retrying those on every request just burns the timeout budget.
_UNREACHABLE = (requests.exceptions.ConnectionError, requests.exceptions.Timeout)


def api_call(method, **params):
    """Call a Bot API method. Never raises — a failed Telegram call must not take down
    the caller (a webhook request or an admin action).

    If the API is unreachable at the network level, a circuit breaker skips further
    calls for DOWN_COOLDOWN seconds. Without it, a blocked outbound route (e.g. a host
    that only allows whitelisted domains) makes every request that notifies a user hang
    for the full connect timeout plus retries.
    """
    if not settings.TELEGRAM_BOT_TOKEN:
        logger.warning("TELEGRAM_BOT_TOKEN is not set; skipping %s", method)
        return {'ok': False}

    from django.core.cache import cache
    if cache.get(_DOWN_KEY):
        return {'ok': False, 'description': 'telegram api unreachable (circuit open)'}

    try:
        # Telegram API expects complex objects (reply_markup, entities, etc.) as JSON strings
        clean_params = {}
        for k, v in params.items():
            if isinstance(v, (dict, list)):
                clean_params[k] = json.dumps(v)
            elif v is not None:
                clean_params[k] = v

        # (connect, read): fail fast on a dead connection instead of burning the
        # read-timeout window meant for slow responses.
        resp = SESSION.post(api_url(method), data=clean_params, timeout=(5, 15))
        data = resp.json()
        if not data.get('ok'):
            logger.warning("Telegram API %s failed: %s", method, data)
        return data
    except _UNREACHABLE as exc:
        cache.set(_DOWN_KEY, '1', DOWN_COOLDOWN)
        logger.warning("Telegram API unreachable (%s) — skipping calls for %ss",
                       type(exc).__name__, DOWN_COOLDOWN)
        return {'ok': False}
    except Exception:
        logger.exception("Telegram API call %s raised", method)
        return {'ok': False}


def send_message(chat_id, text, reply_markup=None, parse_mode='HTML'):
    kwargs = {'chat_id': chat_id, 'text': text}
    if parse_mode:
        kwargs['parse_mode'] = parse_mode
    if reply_markup:
        kwargs['reply_markup'] = json.dumps(reply_markup) if isinstance(reply_markup, dict) else reply_markup
    res = api_call('sendMessage', **kwargs)
    if not res.get('ok') and parse_mode and 'parse' in str(res.get('description', '')).lower():
        kwargs.pop('parse_mode', None)
        res = api_call('sendMessage', **kwargs)
    return res


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


def send_photo(chat_id, photo, caption=None, reply_markup=None, parse_mode='HTML'):
    """Send photo with caption and inline keyboard to a chat or channel."""
    if not settings.TELEGRAM_BOT_TOKEN:
        logger.warning("TELEGRAM_BOT_TOKEN is not set; skipping sendPhoto")
        return {'ok': False}

    import os

    data = {'chat_id': str(chat_id)}
    if caption:
        data['caption'] = caption
    if parse_mode:
        data['parse_mode'] = parse_mode
    if reply_markup:
        data['reply_markup'] = json.dumps(reply_markup) if isinstance(reply_markup, dict) else reply_markup

    files = None
    close_file = False
    file_obj = None

    try:
        if isinstance(photo, str):
            if os.path.exists(photo):
                file_obj = open(photo, 'rb')
                close_file = True
                files = {'photo': (os.path.basename(photo), file_obj, 'image/jpeg')}
            else:
                data['photo'] = photo
        elif hasattr(photo, 'read'):
            if hasattr(photo, 'open'):
                try:
                    photo.open('rb')
                except Exception:
                    pass
            if hasattr(photo, 'seek'):
                try:
                    photo.seek(0)
                except Exception:
                    pass
            fname = getattr(photo, 'name', 'screenshot.jpg')
            if fname:
                fname = os.path.basename(fname)
            files = {'photo': (fname or 'screenshot.jpg', photo.read(), 'image/jpeg')}
        elif isinstance(photo, bytes):
            files = {'photo': ('screenshot.jpg', photo, 'image/jpeg')}

        url = api_url('sendPhoto')
        if files:
            resp = SESSION.post(url, data=data, files=files, timeout=(10, 35))
        else:
            resp = SESSION.post(url, data=data, timeout=(10, 35))

        data_resp = resp.json()
        if not data_resp.get('ok'):
            logger.warning("Telegram sendPhoto failed: %s", data_resp)
        return data_resp
    except Exception:
        logger.exception("Telegram sendPhoto exception")
        return {'ok': False}
    finally:
        if close_file and file_obj:
            try:
                file_obj.close()
            except Exception:
                pass


def edit_message_caption(chat_id, message_id, caption, reply_markup=None, parse_mode='HTML'):
    kwargs = {
        'chat_id': chat_id,
        'message_id': message_id,
        'caption': caption,
    }
    if parse_mode:
        kwargs['parse_mode'] = parse_mode
    if reply_markup is not None:
        kwargs['reply_markup'] = json.dumps(reply_markup) if isinstance(reply_markup, dict) else reply_markup
    return api_call('editMessageCaption', **kwargs)


def edit_message_text(chat_id, message_id, text, reply_markup=None, parse_mode='HTML'):
    kwargs = {
        'chat_id': chat_id,
        'message_id': message_id,
        'text': text,
    }
    if parse_mode:
        kwargs['parse_mode'] = parse_mode
    if reply_markup is not None:
        kwargs['reply_markup'] = json.dumps(reply_markup) if isinstance(reply_markup, dict) else reply_markup
    return api_call('editMessageText', **kwargs)

