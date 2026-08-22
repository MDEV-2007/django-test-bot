"""Live notifications for the Super Admin panel — a new pending payment or a new user
registration pushes here (see panel/realtime_signals.py), and every connected admin's
browser tab shows it immediately, without a page refresh.

One-way: the server pushes, the client never sends anything meaningful back — so unlike
battles/consumers.py there's just a single group every admin joins, no per-object rooms.
"""
import json

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer

from .realtime import ADMIN_GROUP


class AdminNotificationsConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        user = self.scope['user']
        if not user or not user.is_authenticated:
            await self.close()
            return
        is_admin = await database_sync_to_async(self._is_superadmin)(user)
        if not is_admin:
            await self.close()
            return
        await self.channel_layer.group_add(ADMIN_GROUP, self.channel_name)
        await self.accept()

    async def disconnect(self, code):
        if self.scope.get('user') and self.scope['user'].is_authenticated:
            await self.channel_layer.group_discard(ADMIN_GROUP, self.channel_name)

    def _is_superadmin(self, user):
        profile = getattr(user, 'profile', None)
        return bool(profile and profile.is_superadmin)

    # Group event handler (channels maps 'admin.notify' -> admin_notify)
    async def admin_notify(self, event):
        payload = dict(event)
        payload.pop('type', None)
        await self.send(text_data=json.dumps(payload))
