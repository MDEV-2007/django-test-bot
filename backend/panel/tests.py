"""Live Super Admin panel notifications (WebSocket push on a new pending payment /
new registration — panel/consumers.py, panel/realtime_signals.py).

TransactionTestCase, not TestCase: the consumer's DB access runs via
database_sync_to_async in a separate thread, which can't see TestCase's uncommitted
per-test transaction — same reason battles/tests.py uses it.
"""
import asyncio

from channels.testing import WebsocketCommunicator
from django.test import TransactionTestCase

from premium.models import Payment, SubscriptionPlan
from tests.factories import make_user

from .consumers import AdminNotificationsConsumer


class AdminRealtimeNotificationTests(TransactionTestCase):
    def setUp(self):
        self.admin_user, self.admin_profile = make_user('super_admin_1', role='superadmin')
        self.student_user, self.student_profile = make_user('plain_student_1')
        self.plan = SubscriptionPlan.objects.create(
            plan_type='mock_test', name='Mock Test', price=15000, duration_days=0,
        )

    def _connect(self, user):
        communicator = WebsocketCommunicator(
            AdminNotificationsConsumer.as_asgi(), '/ws/panel/notifications/'
        )
        communicator.scope['user'] = user
        return communicator

    def test_non_superadmin_connection_is_rejected(self):
        async def run():
            comm = self._connect(self.student_user)
            connected, _ = await comm.connect()
            self.assertFalse(connected)

        asyncio.run(run())

    def test_superadmin_receives_push_on_new_pending_payment(self):
        async def run():
            comm = self._connect(self.admin_user)
            connected, _ = await comm.connect()
            self.assertTrue(connected)

            from channels.db import database_sync_to_async
            await database_sync_to_async(Payment.objects.create)(
                profile=self.student_profile, plan=self.plan, amount=self.plan.price,
                status='pending', source='web',
            )

            event = await comm.receive_json_from(timeout=5)
            self.assertEqual(event['kind'], 'payment')
            self.assertIn(self.student_user.username, event['message'] or self.student_user.get_full_name() or '')
            await comm.disconnect()

        asyncio.run(run())

    def test_superadmin_receives_push_on_new_registration(self):
        async def run():
            comm = self._connect(self.admin_user)
            connected, _ = await comm.connect()
            self.assertTrue(connected)

            from channels.db import database_sync_to_async
            await database_sync_to_async(make_user)('brand_new_student')

            event = await comm.receive_json_from(timeout=5)
            self.assertEqual(event['kind'], 'new_user')
            await comm.disconnect()

        asyncio.run(run())

    def test_re_saving_an_already_pending_payment_does_not_re_notify(self):
        async def run():
            from channels.db import database_sync_to_async
            payment = await database_sync_to_async(Payment.objects.create)(
                profile=self.student_profile, plan=self.plan, amount=self.plan.price,
                status='pending', source='web',
            )

            comm = self._connect(self.admin_user)
            connected, _ = await comm.connect()
            self.assertTrue(connected)

            def _resave():
                payment.admin_note = 'looking into it'
                payment.save()
            await database_sync_to_async(_resave)()

            # No event should arrive for this re-save — receive_nothing() waits briefly
            # and asserts nothing was sent, which is exactly what we're checking here.
            self.assertTrue(await comm.receive_nothing(timeout=1))
            await comm.disconnect()

        asyncio.run(run())
