"""Telegram webhook endpoint.

Why webhook instead of long polling: polling runs one process calling getUpdates in a
loop — a single point of failure that cannot be scaled horizontally. A webhook is just
another HTTP request, so it is served by every gunicorn worker on every app server and
scales with the web tier.

Two rules make this safe and fast:
  1. Authenticate. Anyone who learns the URL could otherwise POST fake updates, so we
     require the secret Telegram echoes back in X-Telegram-Bot-Api-Secret-Token.
  2. Acknowledge immediately. Telegram retries (and eventually throttles) slow endpoints,
     and handling an update can involve several outbound API calls plus a file download.
     We hand the work to the background pool and return 200 straight away.
"""
import json
import logging

from django.conf import settings
from django.http import HttpResponse, HttpResponseForbidden
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

from core import background

from .handlers import process_update

logger = logging.getLogger(__name__)


def _secret_ok(request):
    expected = getattr(settings, 'TELEGRAM_WEBHOOK_SECRET', '')
    if not expected:
        # No secret configured — refuse rather than run an unauthenticated endpoint.
        logger.error("TELEGRAM_WEBHOOK_SECRET is not set; rejecting webhook call")
        return False
    return request.headers.get('X-Telegram-Bot-Api-Secret-Token') == expected


@csrf_exempt
@require_POST
def webhook(request):
    if not _secret_ok(request):
        return HttpResponseForbidden('forbidden')

    try:
        update = json.loads(request.body.decode('utf-8'))
    except (ValueError, UnicodeDecodeError):
        # Malformed body: 200 anyway, otherwise Telegram retries this forever.
        logger.warning("Telegram webhook received an unparsable body")
        return HttpResponse('ok')

    background.submit(_handle, update)
    return HttpResponse('ok')


def _handle(update):
    try:
        process_update(update)
    except Exception:
        # Swallow: the update is already acknowledged, and raising here would only kill
        # a background thread. Logged so failures stay visible.
        logger.exception("Failed to process Telegram update %s", update.get('update_id'))
