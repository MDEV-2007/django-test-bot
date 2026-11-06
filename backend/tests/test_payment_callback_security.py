"""Telegram payment-review callbacks (audit SEC-PAY-001 / ECON-006).

`pay_approve_<id>` / `pay_reject_<id>` arrive as Telegram callback_query updates. A
client can put arbitrary `data` into a callback for any bot message it can see, so the
server must check *where* the callback came from (the payment channel) and *who* pressed
it (a payment reviewer) — and must apply a decision exactly once.
"""
from decimal import Decimal
from unittest import mock

from django.test import TestCase, override_settings

from accounts.models import Profile
from premium.models import Payment, SubscriptionPlan
from telegrambot.handlers import process_update

from .factories import make_user

CHANNEL = '-1009990001112'
ADMIN_TG = '7001'
STUDENT_TG = '7002'


def callback(payment_id, *, action='approve', chat_id=CHANNEL, from_id=ADMIN_TG, username='reviewer'):
    return {'update_id': 1, 'callback_query': {
        'id': 'cb-1',
        'from': {'id': int(from_id), 'first_name': 'R', 'username': username},
        'message': {'message_id': 10, 'chat': {'id': int(chat_id), 'type': 'channel'}},
        'data': f'pay_{action}_{payment_id}',
    }}


@override_settings(TELEGRAM_BOT_TOKEN='', PAYMENT_CHANNEL_ID=CHANNEL, PAYMENT_REVIEWER_TELEGRAM_IDS=[],
                   REQUIRE_CHANNEL_SUBSCRIPTION=False)
class PaymentCallbackSecurityTests(TestCase):
    def setUp(self):
        _, self.admin = make_user('pay_admin', role='superadmin', telegram_id=ADMIN_TG)
        self.student_user, self.student = make_user('pay_student', telegram_id=STUDENT_TG)
        self.plan = SubscriptionPlan.objects.create(
            name='PRO 30', price=Decimal('49000'), duration_days=30, plan_type='lessons')
        self.payment = Payment.objects.create(
            profile=self.student, plan=self.plan, amount=self.plan.price, status='pending')
        patcher = mock.patch('telegrambot.payment_review.answer_callback')
        self.answer = patcher.start()
        self.addCleanup(patcher.stop)

    def run_update(self, update):
        process_update(update)
        self.payment.refresh_from_db()
        return Profile.objects.get(pk=self.student.pk)

    def test_callback_from_a_private_chat_is_ignored(self):
        student = self.run_update(callback(self.payment.id, chat_id=STUDENT_TG, from_id=STUDENT_TG))
        self.assertEqual(self.payment.status, 'pending')
        self.assertFalse(student.is_premium)

    def test_admin_pressing_outside_the_payment_channel_is_ignored(self):
        self.run_update(callback(self.payment.id, chat_id=ADMIN_TG))
        self.assertEqual(self.payment.status, 'pending')

    def test_non_reviewer_in_the_channel_is_ignored(self):
        student = self.run_update(callback(self.payment.id, from_id=STUDENT_TG, username='not_admin'))
        self.assertEqual(self.payment.status, 'pending')
        self.assertFalse(student.is_premium)

    def test_non_reviewer_cannot_reject_someone_elses_payment(self):
        self.run_update(callback(self.payment.id, action='reject', from_id=STUDENT_TG))
        self.assertEqual(self.payment.status, 'pending')

    def test_superadmin_in_the_channel_approves(self):
        student = self.run_update(callback(self.payment.id))
        self.assertEqual(self.payment.status, 'approved')
        self.assertTrue(student.is_premium)
        self.assertIsNotNone(student.premium_expires_at)

    def test_staff_user_with_linked_telegram_can_review(self):
        staff_user, _ = make_user('pay_staff', telegram_id='7003')
        staff_user.is_staff = True
        staff_user.save(update_fields=['is_staff'])
        self.run_update(callback(self.payment.id, action='reject', from_id='7003'))
        self.assertEqual(self.payment.status, 'rejected')

    @override_settings(PAYMENT_REVIEWER_TELEGRAM_IDS=['7004'])
    def test_allow_listed_reviewer_can_approve(self):
        self.run_update(callback(self.payment.id, from_id='7004'))
        self.assertEqual(self.payment.status, 'approved')

    def test_double_approve_extends_premium_once(self):
        self.run_update(callback(self.payment.id))
        first_expiry = Profile.objects.get(pk=self.student.pk).premium_expires_at
        student = self.run_update(callback(self.payment.id))
        self.assertEqual(student.premium_expires_at, first_expiry)

    def test_approve_after_reject_changes_nothing(self):
        self.run_update(callback(self.payment.id, action='reject'))
        student = self.run_update(callback(self.payment.id))
        self.assertEqual(self.payment.status, 'rejected')
        self.assertFalse(student.is_premium)

    def test_unknown_action_changes_nothing(self):
        self.run_update(callback(self.payment.id, action='refund'))
        self.assertEqual(self.payment.status, 'pending')

    def test_payment_still_awaiting_screenshot_cannot_be_approved(self):
        Payment.objects.filter(pk=self.payment.pk).update(status='awaiting_screenshot')
        student = self.run_update(callback(self.payment.id))
        self.assertEqual(self.payment.status, 'awaiting_screenshot')
        self.assertFalse(student.is_premium)

    def test_non_existent_payment_id_is_handled_gracefully(self):
        student = self.run_update(callback(99999999))
        self.assertEqual(self.payment.status, 'pending')
        self.assertFalse(student.is_premium)
        self.answer.assert_called_with('cb-1', "To'lov bazadan topilmadi!")

    def test_bot_sender_is_rejected_even_with_admin_id(self):
        upd = callback(self.payment.id)
        upd['callback_query']['from']['is_bot'] = True
        student = self.run_update(upd)
        self.assertEqual(self.payment.status, 'pending')
        self.assertFalse(student.is_premium)
        self.answer.assert_called_with('cb-1', "Ruxsat yo'q.")

    def test_malformed_callback_payloads_are_rejected(self):
        for raw_data in (
            f'pay_approve_{self.payment.id}_extra',
            'pay_approve_notanint',
            'pay_approve_-5',
            'pay_approve_0',
            'pay_onlytwo',
        ):
            upd = callback(self.payment.id)
            upd['callback_query']['data'] = raw_data
            student = self.run_update(upd)
            self.assertEqual(self.payment.status, 'pending', raw_data)
            self.assertFalse(student.is_premium, raw_data)

    def test_approved_payment_records_reviewer_user_and_timestamp(self):
        self.run_update(callback(self.payment.id))
        self.assertEqual(self.payment.status, 'approved')
        self.assertEqual(self.payment.reviewed_by_id, self.admin.user_id)
        self.assertIsNotNone(self.payment.reviewed_at)
        self.assertIn('@reviewer', self.payment.admin_note)

