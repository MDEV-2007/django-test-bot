"""Push helper for live Super Admin panel notifications.

One shared WebSocket group ('admin_notifications') that every currently-connected
superadmin browser tab joins (see panel/consumers.py). Call notify_admins(...) from
anywhere — a signal, a view, a management command — to have it show up immediately in
every open panel tab, instead of admins only finding out on their next page load (or,
for payments, only via the existing Telegram alert in telegrambot/handlers.py).
"""
import logging

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

logger = logging.getLogger(__name__)

ADMIN_GROUP = 'admin_notifications'


def notify_admins(kind, title, message, url=''):
    """Fire-and-forget. Never raises — a notification failing to reach a websocket
    must not be allowed to break whatever real database write triggered it (a payment
    being saved, a user registering)."""
    layer = get_channel_layer()
    if not layer:
        return
    try:
        async_to_sync(layer.group_send)(ADMIN_GROUP, {
            'type': 'admin.notify',
            'kind': kind,
            'title': title,
            'message': message,
            'url': url,
        })
    except Exception:
        logger.exception("Failed to push realtime admin notification (kind=%s)", kind)
