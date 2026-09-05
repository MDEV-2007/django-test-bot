"""Admin'dagi ko'rish chegarasi (IDOR).

Bu modul bitta savolni tekshiradi: A o'qituvchi B o'qituvchining ma'lumotiga TEGA
OLADIMI. Ro'yxatdan yashirish yetarli emas — to'g'ridan-to'g'ri havola bilan
(/admin/classroom/payment/42/change/) kirishga urinish ham yopiq bo'lishi kerak.

Django admin begona obyektga 302 (ro'yxatga qaytarish + "topilmadi" xabari) yoki 403
qaytaradi. Ikkalasi ham "kira olmadi" degani; test aynan MA'LUMOT ko'rinmasligini
tekshiradi.
"""
from datetime import timedelta

from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone

from accounts.models import ensure_profile_for_user
from classroom.models import MockTest, Payment, PayoutEntry, Subscription
from classroom.permissions import grant_admin_access
from classroom.services import approve_payment
from teacher.models import TeacherProfile

from .factories import make_subject, make_test_set


def make_teacher_with_admin(username):
    user = User.objects.create_user(username=username, password='pw-1234-teacher')
    profile = ensure_profile_for_user(user)
    profile.role = 'teacher'
    profile.save(update_fields=['role'])
    teacher = TeacherProfile.objects.create(profile=profile, full_name=f'{username} F.')
    grant_admin_access(user)
    return user, teacher


class AdminScopeTests(TestCase):
    def setUp(self):
        self.subject = make_subject()

        self.user_a, self.teacher_a = make_teacher_with_admin('ustoz_a')
        self.user_b, self.teacher_b = make_teacher_with_admin('ustoz_b')

        self.student = ensure_profile_for_user(
            User.objects.create_user(username='oquvchi_scope', password='pw-1234-student'))

        now = timezone.now()
        self.subscription_b = Subscription.objects.create(
            student=self.student, teacher=self.teacher_b, price_tiyin=4_000_000,
            current_period_start=now, current_period_end=now + timedelta(days=30))
        self.payment_b = Payment.objects.create(
            subscription=self.subscription_b, amount_tiyin=4_000_000,
            provider='card', provider_transaction_id='B-1')
        self.mock_b = MockTest.objects.create(
            teacher=self.teacher_b, subject=self.subject,
            test_set=make_test_set(subject=self.subject, title='B testi'),
            title='B ning mocki', scheduled_start=now, duration_minutes=60)

        self.client.force_login(self.user_a)

    # --- Ro'yxatlar ---

    def test_payment_list_hides_another_class(self):
        response = self.client.get('/admin/classroom/payment/')
        self.assertEqual(response.status_code, 200)
        self.assertNotContains(response, 'B-1')

    def test_mock_list_hides_another_class(self):
        response = self.client.get('/admin/classroom/mocktest/')
        self.assertEqual(response.status_code, 200)
        self.assertNotContains(response, "B ning mocki")

    def test_payout_list_hides_another_class(self):
        entry = approve_payment(self.payment_b)
        response = self.client.get('/admin/classroom/payoutentry/')
        self.assertEqual(response.status_code, 200)
        self.assertNotContains(response, f'/payoutentry/{entry.pk}/')

    # --- To'g'ridan-to'g'ri havola ---

    def test_direct_link_to_another_payment_is_blocked(self):
        response = self.client.get(f'/admin/classroom/payment/{self.payment_b.pk}/change/')
        self.assertIn(response.status_code, (302, 403))
        if response.status_code == 200:  # himoya buzilgan bo'lsa, aniq ayting
            self.fail("Begona to'lov sahifasi ochildi")

    def test_direct_link_to_another_mock_is_blocked(self):
        response = self.client.get(f'/admin/classroom/mocktest/{self.mock_b.pk}/change/')
        self.assertIn(response.status_code, (302, 403))

    def test_direct_link_to_another_attempt_list_is_empty(self):
        response = self.client.get('/admin/classroom/mockattempt/')
        self.assertEqual(response.status_code, 200)
        self.assertNotContains(response, "B ning mocki")

    # --- Amallar (actions) ---

    def test_approving_another_teachers_payment_does_nothing(self):
        """Eng muhim tekshiruv: begona to'lovni tasdiqlash daromad yozmasligi kerak.

        Amal `get_queryset` orqali filtrlangan ro'yxat ustida ishlaydi, shuning uchun
        begona id yuborilsa ham u tanlovga tushmaydi."""
        response = self.client.post('/admin/classroom/payment/', {
            'action': 'approve_selected',
            '_selected_action': [str(self.payment_b.pk)],
        }, follow=True)
        self.assertEqual(response.status_code, 200)

        self.payment_b.refresh_from_db()
        self.assertEqual(self.payment_b.status, 'pending')
        self.assertEqual(PayoutEntry.objects.count(), 0)

    def test_approving_own_payment_works(self):
        """Chegara o'z sinfini to'smasligi kerak — o'qituvchi o'z to'lovini tasdiqlaydi."""
        now = timezone.now()
        subscription_a = Subscription.objects.create(
            student=self.student, teacher=self.teacher_a, price_tiyin=4_000_000,
            current_period_start=now, current_period_end=now + timedelta(days=30))
        payment_a = Payment.objects.create(
            subscription=subscription_a, amount_tiyin=4_000_000,
            provider='card', provider_transaction_id='A-1')

        self.client.post('/admin/classroom/payment/', {
            'action': 'approve_selected',
            '_selected_action': [str(payment_a.pk)],
        }, follow=True)

        payment_a.refresh_from_db()
        subscription_a.refresh_from_db()
        self.assertEqual(payment_a.status, 'success')
        self.assertEqual(subscription_a.status, 'active')
        self.assertEqual(PayoutEntry.objects.filter(teacher=self.teacher_a).count(), 1)

    # --- Faqat super adminga tegishli amallar ---

    def test_teacher_cannot_mark_a_payout_as_paid(self):
        """Pul o'tkazilganini o'qituvchining o'zi tasdiqlay olmaydi."""
        now = timezone.now()
        subscription_a = Subscription.objects.create(
            student=self.student, teacher=self.teacher_a, price_tiyin=4_000_000,
            current_period_start=now, current_period_end=now + timedelta(days=30))
        payment_a = Payment.objects.create(
            subscription=subscription_a, amount_tiyin=4_000_000, provider='card')
        entry = approve_payment(payment_a)

        self.client.post('/admin/classroom/payoutentry/', {
            'action': 'mark_paid',
            '_selected_action': [str(entry.pk)],
        }, follow=True)

        entry.refresh_from_db()
        self.assertEqual(entry.status, 'accrued')

    def test_teacher_cannot_edit_a_subscription(self):
        """Obunani qo'lda 'active' qilish — to'lovsiz kirish berish degani."""
        now = timezone.now()
        subscription_a = Subscription.objects.create(
            student=self.student, teacher=self.teacher_a, price_tiyin=4_000_000,
            current_period_start=now, current_period_end=now + timedelta(days=30))

        # Django tahrirlash huquqi yo'q foydalanuvchiga sahifani FAQAT KO'RISH rejimida
        # ochadi (200), lekin saqlashga ruxsat bermaydi. Muhimi — yozib bo'lmasligi.
        response = self.client.get(f'/admin/classroom/subscription/{subscription_a.pk}/change/')
        self.assertEqual(response.status_code, 200)

        self.client.post(f'/admin/classroom/subscription/{subscription_a.pk}/change/', {
            'student': str(self.student.pk),
            'teacher': str(self.teacher_a.pk),
            'price_tiyin': '1',
            'status': 'active',
            'current_period_start_0': '2030-01-01', 'current_period_start_1': '00:00:00',
            'current_period_end_0': '2030-12-31', 'current_period_end_1': '00:00:00',
        }, follow=True)

        subscription_a.refresh_from_db()
        self.assertEqual(subscription_a.status, 'pending')
        self.assertEqual(subscription_a.price_tiyin, 4_000_000)

    def test_quota_module_is_hidden_from_teachers(self):
        response = self.client.get('/admin/classroom/aigradingquota/')
        self.assertIn(response.status_code, (302, 403))


class NonTeacherStaffTests(TestCase):
    """O'qituvchi ham, superuser ham bo'lmagan xodim hech narsa ko'rmasligi kerak."""

    def test_staff_without_a_teacher_profile_sees_nothing(self):
        user = User.objects.create_user(username='xodim', password='pw-1234-staff')
        ensure_profile_for_user(user)
        grant_admin_access(user)

        make_subject()
        teacher_user, teacher = make_teacher_with_admin('ustoz_c')
        student = ensure_profile_for_user(
            User.objects.create_user(username='oquvchi_c', password='pw-1234-student'))
        now = timezone.now()
        subscription = Subscription.objects.create(
            student=student, teacher=teacher, price_tiyin=4_000_000,
            current_period_start=now, current_period_end=now + timedelta(days=30))
        Payment.objects.create(subscription=subscription, amount_tiyin=4_000_000,
                               provider='card', provider_transaction_id='C-1')

        self.client.force_login(user)
        response = self.client.get('/admin/classroom/payment/')
        self.assertEqual(response.status_code, 200)
        self.assertNotContains(response, 'C-1')
