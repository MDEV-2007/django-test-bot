"""Pullik sinf: to'lov, obuna davri va daromad defteri.

Bu yerdagi testlar bitta savolga javob beradi: PUL TO'G'RIMI. Shuning uchun ular
yaxlitlash, takroriy tasdiqlash va yarim bajarilgan tranzaksiyaga alohida e'tibor
qaratadi — aynan shu uch joyda xato uzoq vaqt sezilmay yuradi.
"""
from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth.models import User
from django.db import IntegrityError, transaction
from django.test import TestCase
from django.utils import timezone

from accounts.models import ensure_profile_for_user
from classroom.models import MockTest, Payment, PayoutEntry, Subscription
from classroom.services import (
    PaymentError, approve_payment, has_class_access, reject_payment, som, split_payment,
)
from teacher.models import TeacherProfile

from .factories import make_subject, make_test_set


def make_teacher(username='teacher_pay', share=75):
    user = User.objects.create_user(username=username, password='pw-1234-teacher')
    profile = ensure_profile_for_user(user)
    profile.role = 'teacher'
    profile.save(update_fields=['role'])
    return TeacherProfile.objects.create(
        profile=profile, full_name=f'{username} F.', revenue_share_percent=share)


def make_student(username='student_pay'):
    user = User.objects.create_user(username=username, password='pw-1234-student')
    return ensure_profile_for_user(user)


def make_subscription(student, teacher, price_tiyin=4_000_000, status='pending', days=0):
    now = timezone.now()
    return Subscription.objects.create(
        student=student, teacher=teacher, price_tiyin=price_tiyin, status=status,
        current_period_start=now, current_period_end=now + timedelta(days=days))


def make_payment(subscription, amount_tiyin=4_000_000, **kwargs):
    return Payment.objects.create(
        subscription=subscription, amount_tiyin=amount_tiyin,
        provider=kwargs.pop('provider', 'card'), **kwargs)


class SplitPaymentTests(TestCase):
    """Bo'linish butun sonda va qoldiqsiz bo'lishi shart."""

    def test_clean_split(self):
        self.assertEqual(split_payment(4_000_000, 75), (1_000_000, 3_000_000))

    def test_remainder_stays_with_the_platform(self):
        """Yaxlitlashdan qolgan tiyin platformada qoladi — o'qituvchiga ortiqcha
        hisoblanib ketmasligi kerak, va jami har doim to'liq bo'linadi."""
        fee, net = split_payment(3_333_333, 75)
        self.assertEqual(fee + net, 3_333_333)
        self.assertEqual(net, 2_499_999)

    def test_every_amount_adds_up(self):
        for amount in (0, 1, 7, 99, 12_345, 4_000_000, 5_999_999):
            for share in (0, 25, 60, 75, 100):
                fee, net = split_payment(amount, share)
                self.assertEqual(fee + net, amount, f'{amount} @ {share}%')
                self.assertGreaterEqual(fee, 0)
                self.assertGreaterEqual(net, 0)

    def test_invalid_share_is_refused(self):
        with self.assertRaises(ValueError):
            split_payment(1000, 120)
        with self.assertRaises(ValueError):
            split_payment(-1, 75)

    def test_som_is_display_only(self):
        self.assertEqual(som(4_000_000), "40 000 so'm")
        self.assertEqual(som(4_000_050), "40 000,50 so'm")


class ApprovePaymentTests(TestCase):
    def setUp(self):
        self.teacher = make_teacher()
        self.student = make_student()
        self.subscription = make_subscription(self.student, self.teacher)
        self.payment = make_payment(self.subscription, provider_transaction_id='TR-1')
        self.admin = User.objects.create_superuser('root_pay', password='pw-1234-admin')

    def test_approval_activates_the_subscription_and_writes_the_ledger(self):
        entry = approve_payment(self.payment, reviewer=self.admin)

        self.subscription.refresh_from_db()
        self.payment.refresh_from_db()

        self.assertEqual(self.subscription.status, 'active')
        self.assertTrue(self.subscription.is_active)
        self.assertEqual(self.payment.status, 'success')
        self.assertEqual(self.payment.reviewed_by, self.admin)

        self.assertEqual(entry.gross_tiyin, 4_000_000)
        self.assertEqual(entry.platform_fee_tiyin, 1_000_000)
        self.assertEqual(entry.net_tiyin, 3_000_000)
        self.assertEqual(entry.status, 'accrued')

    def test_approval_is_idempotent(self):
        """Takroriy tasdiqlash ikkinchi marta hisoblamaydi.

        Admin tugmani ikki marta bosishi mumkin; keyinchalik Click/Payme qo'shilganda
        webhook ham takrorlanadi. Ikkala holatda ham natija bir xil bo'lishi kerak."""
        first = approve_payment(self.payment, reviewer=self.admin)
        second = approve_payment(self.payment, reviewer=self.admin)

        self.assertEqual(first.pk, second.pk)
        self.assertEqual(PayoutEntry.objects.filter(payment=self.payment).count(), 1)

    def test_repeated_approval_does_not_stretch_the_period(self):
        approve_payment(self.payment, reviewer=self.admin)
        self.subscription.refresh_from_db()
        first_end = self.subscription.current_period_end

        approve_payment(self.payment, reviewer=self.admin)
        self.subscription.refresh_from_db()
        self.assertEqual(self.subscription.current_period_end, first_end)

    def test_second_payment_extends_from_the_existing_end(self):
        """Muddati tugamagan obuna yana to'lansa, davr oxiridan davom etadi."""
        approve_payment(self.payment, reviewer=self.admin)
        self.subscription.refresh_from_db()
        first_end = self.subscription.current_period_end

        second = make_payment(self.subscription, provider_transaction_id='TR-2')
        approve_payment(second, reviewer=self.admin)

        self.subscription.refresh_from_db()
        self.assertEqual(self.subscription.current_period_end, first_end + timedelta(days=30))

    def test_expired_subscription_restarts_from_now(self):
        self.subscription.status = 'expired'
        self.subscription.current_period_end = timezone.now() - timedelta(days=5)
        self.subscription.save()

        approve_payment(self.payment, reviewer=self.admin)
        self.subscription.refresh_from_db()

        # Eski, o'tib ketgan muddat davom ettirilmaydi.
        self.assertGreater(self.subscription.current_period_end, timezone.now() + timedelta(days=29))

    def test_rejected_payment_cannot_be_approved(self):
        reject_payment(self.payment, reviewer=self.admin, note='Chek soxta')
        with self.assertRaises(PaymentError):
            approve_payment(self.payment, reviewer=self.admin)
        self.assertEqual(PayoutEntry.objects.count(), 0)

    def test_approved_payment_cannot_be_rejected(self):
        approve_payment(self.payment, reviewer=self.admin)
        with self.assertRaises(PaymentError):
            reject_payment(self.payment, reviewer=self.admin)

    def test_ledger_write_and_activation_are_one_transaction(self):
        """Defter qatori yozilmasa, obuna ham faollashmasligi kerak.

        Aks holda o'quvchi kirish oladi, o'qituvchining puli esa hech qayerda
        qayd etilmay yo'qoladi."""
        with patch('classroom.services.PayoutEntry.objects.create', side_effect=RuntimeError('bazadagi nosozlik')):
            with self.assertRaises(RuntimeError):
                approve_payment(self.payment, reviewer=self.admin)

        self.subscription.refresh_from_db()
        self.payment.refresh_from_db()
        self.assertEqual(self.subscription.status, 'pending')
        self.assertEqual(self.payment.status, 'pending')
        self.assertEqual(PayoutEntry.objects.count(), 0)

    def test_teacher_share_is_read_from_the_profile(self):
        self.teacher.revenue_share_percent = 60
        self.teacher.save(update_fields=['revenue_share_percent'])

        entry = approve_payment(self.payment, reviewer=self.admin)
        self.assertEqual(entry.net_tiyin, 2_400_000)
        self.assertEqual(entry.platform_fee_tiyin, 1_600_000)


class DuplicateReferenceTests(TestCase):
    """Bir xil o'tkazma raqamini ikkinchi marta kiritib bo'lmaydi."""

    def setUp(self):
        self.teacher = make_teacher()
        self.student = make_student()
        self.subscription = make_subscription(self.student, self.teacher)

    def test_same_reference_twice_is_refused(self):
        make_payment(self.subscription, provider_transaction_id='TR-9')
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                make_payment(self.subscription, provider_transaction_id='TR-9')

    def test_blank_references_do_not_collide(self):
        """Karta o'tkazmasida raqam bo'lmasligi mumkin — bo'sh satrlar bir-biriga
        "takror" deb hisoblanmasligi kerak."""
        make_payment(self.subscription)
        make_payment(self.subscription)
        self.assertEqual(Payment.objects.filter(provider_transaction_id='').count(), 2)

    def test_same_number_on_another_provider_is_allowed(self):
        make_payment(self.subscription, provider='click', provider_transaction_id='12345')
        make_payment(self.subscription, provider='payme', provider_transaction_id='12345')
        self.assertEqual(Payment.objects.filter(provider_transaction_id='12345').count(), 2)


class ClassAccessTests(TestCase):
    def setUp(self):
        self.teacher = make_teacher()
        self.other_teacher = make_teacher(username='teacher_other_pay')
        self.student = make_student()
        self.subject = make_subject()
        self.test_set = make_test_set(subject=self.subject)
        self.mock = MockTest.objects.create(
            teacher=self.teacher, subject=self.subject, test_set=self.test_set,
            title='Haftalik mock', scheduled_start=timezone.now(), duration_minutes=60,
            status='scheduled')

    def test_without_a_subscription_there_is_no_access(self):
        self.assertFalse(has_class_access(self.student, self.mock))

    def test_active_subscription_grants_access(self):
        make_subscription(self.student, self.teacher, status='active', days=30)
        self.assertTrue(has_class_access(self.student, self.mock))

    def test_expired_period_does_not_grant_access(self):
        """Status hali 'active' bo'lsa ham, muddati o'tgan obuna kirish bermaydi."""
        subscription = make_subscription(self.student, self.teacher, status='active')
        subscription.current_period_end = timezone.now() - timedelta(minutes=1)
        subscription.save(update_fields=['current_period_end'])
        self.assertFalse(has_class_access(self.student, self.mock))

    def test_another_teachers_subscription_does_not_grant_access(self):
        make_subscription(self.student, self.other_teacher, status='active', days=30)
        self.assertFalse(has_class_access(self.student, self.mock))

    def test_free_preview_is_open_to_everyone(self):
        self.mock.is_free_preview = True
        self.mock.save(update_fields=['is_free_preview'])
        self.assertTrue(has_class_access(self.student, self.mock))
