"""Mock jadvali: holat o'tishlari va kirish oynasi.

Bu yerdagi asosiy da'vo: kirish qarori HECH QACHON bazadagi `status` ustuniga tayanmaydi.
Ustun keshdan boshqa narsa emas — cron ishlamay qolsa u eskirib qoladi, lekin kirish
oynasi baribir server soati bo'yicha yopilishi kerak.
"""
from datetime import timedelta

from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import ensure_profile_for_user
from classroom.models import MockTest, Subscription
from classroom.services import (
    ENTRY_DRAFT, ENTRY_NO_SUBSCRIPTION, ENTRY_TOO_EARLY, ENTRY_TOO_LATE,
    check_entry, computed_status, sync_mock_statuses, visible_mocks,
)
from teacher.models import TeacherProfile, TeacherStudent

from .factories import make_subject, make_test_set


def make_teacher(username):
    user = User.objects.create_user(username=username, password='pw-1234-teacher')
    profile = ensure_profile_for_user(user)
    profile.role = 'teacher'
    profile.save(update_fields=['role'])
    return TeacherProfile.objects.create(profile=profile, full_name=f'{username} F.')


def make_student(username):
    return ensure_profile_for_user(
        User.objects.create_user(username=username, password='pw-1234-student'))


def subscribe(student, teacher, days=30):
    now = timezone.now()
    return Subscription.objects.create(
        student=student, teacher=teacher, price_tiyin=4_000_000, status='active',
        current_period_start=now, current_period_end=now + timedelta(days=days))


class ScheduleStateTests(TestCase):
    def setUp(self):
        self.teacher = make_teacher('ustoz_jadval')
        self.subject = make_subject()
        self.now = timezone.now()
        self.mock = MockTest.objects.create(
            teacher=self.teacher, subject=self.subject,
            test_set=make_test_set(subject=self.subject),
            title='Haftalik mock', scheduled_start=self.now, duration_minutes=60,
            status='scheduled')

    def test_before_the_start_it_is_scheduled(self):
        self.assertEqual(computed_status(self.mock, self.now - timedelta(seconds=1)), 'scheduled')

    def test_at_the_start_it_is_live(self):
        self.assertEqual(computed_status(self.mock, self.now), 'live')

    def test_the_last_second_is_still_live(self):
        self.assertEqual(computed_status(self.mock, self.now + timedelta(minutes=59, seconds=59)), 'live')

    def test_after_the_end_it_is_finished(self):
        self.assertEqual(computed_status(self.mock, self.now + timedelta(minutes=60)), 'finished')

    def test_a_draft_never_moves_on_its_own(self):
        """Qoralamani e'lon qilish — o'qituvchining ongli qarori, vaqtning ishi emas."""
        self.mock.status = 'draft'
        self.mock.save(update_fields=['status'])
        self.assertEqual(computed_status(self.mock, self.now + timedelta(hours=5)), 'draft')

    def test_a_stale_status_column_does_not_open_the_window(self):
        """Cron ishlamay qolgan holat: ustunda hamon 'live', lekin vaqt o'tib ketgan."""
        self.mock.scheduled_start = self.now - timedelta(hours=3)
        self.mock.status = 'live'
        self.mock.save(update_fields=['scheduled_start', 'status'])

        self.assertEqual(computed_status(self.mock), 'finished')
        allowed, reason = check_entry(make_student('kechikkan'), self.mock)
        self.assertFalse(allowed)
        self.assertEqual(reason, ENTRY_TOO_LATE)

    def test_sync_updates_the_column(self):
        self.mock.scheduled_start = self.now - timedelta(hours=3)
        self.mock.save(update_fields=['scheduled_start'])

        self.assertEqual(sync_mock_statuses(), 1)
        self.mock.refresh_from_db()
        self.assertEqual(self.mock.status, 'finished')

    def test_sync_leaves_drafts_alone(self):
        self.mock.status = 'draft'
        self.mock.scheduled_start = self.now - timedelta(hours=3)
        self.mock.save(update_fields=['status', 'scheduled_start'])

        sync_mock_statuses()
        self.mock.refresh_from_db()
        self.assertEqual(self.mock.status, 'draft')


class EntryRuleTests(TestCase):
    def setUp(self):
        self.teacher = make_teacher('ustoz_kirish')
        self.other_teacher = make_teacher('ustoz_begona')
        self.subject = make_subject()
        self.student = make_student('oquvchi_kirish')
        self.now = timezone.now()
        self.mock = MockTest.objects.create(
            teacher=self.teacher, subject=self.subject,
            test_set=make_test_set(subject=self.subject),
            title='Haftalik mock', scheduled_start=self.now, duration_minutes=60,
            status='scheduled')

    def test_subscriber_enters_during_the_window(self):
        subscribe(self.student, self.teacher)
        allowed, reason = check_entry(self.student, self.mock, self.now)
        self.assertTrue(allowed)

    def test_no_subscription_no_entry(self):
        allowed, reason = check_entry(self.student, self.mock, self.now)
        self.assertFalse(allowed)
        self.assertEqual(reason, ENTRY_NO_SUBSCRIPTION)

    def test_free_preview_is_open_to_everyone(self):
        self.mock.is_free_preview = True
        self.mock.save(update_fields=['is_free_preview'])
        allowed, _ = check_entry(self.student, self.mock, self.now)
        self.assertTrue(allowed)

    def test_time_is_checked_before_the_subscription(self):
        """Tugagan mock uchun "obuna soting" degan xabar chiqmasligi kerak — bu shunchaki
        noto'g'ri maslahat."""
        allowed, reason = check_entry(self.student, self.mock, self.now + timedelta(hours=2))
        self.assertFalse(allowed)
        self.assertEqual(reason, ENTRY_TOO_LATE)

    def test_subscriber_cannot_enter_early(self):
        subscribe(self.student, self.teacher)
        allowed, reason = check_entry(self.student, self.mock, self.now - timedelta(minutes=1))
        self.assertFalse(allowed)
        self.assertEqual(reason, ENTRY_TOO_EARLY)

    def test_draft_is_closed_even_for_a_subscriber(self):
        subscribe(self.student, self.teacher)
        self.mock.status = 'draft'
        self.mock.save(update_fields=['status'])
        allowed, reason = check_entry(self.student, self.mock, self.now)
        self.assertFalse(allowed)
        self.assertEqual(reason, ENTRY_DRAFT)

    def test_another_teachers_subscription_does_not_open_this_mock(self):
        subscribe(self.student, self.other_teacher)
        allowed, reason = check_entry(self.student, self.mock, self.now)
        self.assertFalse(allowed)
        self.assertEqual(reason, ENTRY_NO_SUBSCRIPTION)


class VisibilityTests(TestCase):
    def setUp(self):
        self.teacher = make_teacher('ustoz_ko_rinish')
        self.other_teacher = make_teacher('ustoz_uchinchi')
        self.subject = make_subject()
        self.student = make_student('oquvchi_ko_rinish')
        self.now = timezone.now()

        self.mock = MockTest.objects.create(
            teacher=self.teacher, subject=self.subject,
            test_set=make_test_set(subject=self.subject),
            title='Mening mockim', scheduled_start=self.now + timedelta(days=1),
            duration_minutes=60, status='scheduled')
        self.foreign_mock = MockTest.objects.create(
            teacher=self.other_teacher, subject=self.subject,
            test_set=make_test_set(subject=self.subject, title='Begona to\'plam'),
            title='Begona mock', scheduled_start=self.now + timedelta(days=1),
            duration_minutes=60, status='scheduled')

    def test_a_student_without_a_teacher_sees_nothing(self):
        self.assertEqual(list(visible_mocks(self.student)), [])

    def test_a_subscriber_sees_their_teachers_mock_only(self):
        subscribe(self.student, self.teacher)
        titles = [m.title for m in visible_mocks(self.student)]
        self.assertEqual(titles, ['Mening mockim'])

    def test_a_linked_student_sees_the_class_without_paying(self):
        """Referral orqali kelgan, hali to'lamagan o'quvchi jadvalni ko'radi —
        aks holda bepul reklama mock'ini u umuman topa olmasdi."""
        TeacherStudent.objects.create(teacher=self.teacher.profile, student=self.student)
        titles = [m.title for m in visible_mocks(self.student)]
        self.assertEqual(titles, ['Mening mockim'])

    def test_drafts_are_never_listed(self):
        subscribe(self.student, self.teacher)
        self.mock.status = 'draft'
        self.mock.save(update_fields=['status'])
        self.assertEqual(list(visible_mocks(self.student)), [])


class MockApiTests(TestCase):
    def setUp(self):
        self.teacher = make_teacher('ustoz_api')
        self.subject = make_subject()
        self.user = User.objects.create_user(username='oquvchi_api', password='pw-1234-student')
        self.student = ensure_profile_for_user(self.user)
        self.now = timezone.now()
        self.mock = MockTest.objects.create(
            teacher=self.teacher, subject=self.subject,
            test_set=make_test_set(subject=self.subject),
            title='Haftalik mock', scheduled_start=self.now + timedelta(hours=2),
            duration_minutes=60, status='scheduled')
        subscribe(self.student, self.teacher)

        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_list_groups_by_state(self):
        response = self.client.get('/api/classroom/mocks/')
        self.assertEqual(response.status_code, 200)
        data = response.json()

        self.assertEqual(len(data['upcoming']), 1)
        self.assertEqual(data['live'], [])
        self.assertTrue(data['has_teacher'])

        item = data['upcoming'][0]
        self.assertFalse(item['can_enter'])
        self.assertEqual(item['entry_reason'], 'too_early')
        # Sanoq serverda hisoblanadi va manfiy bo'lmaydi.
        self.assertGreater(item['starts_in_seconds'], 7000)

    def test_detail_reports_the_entry_state(self):
        response = self.client.get(f'/api/classroom/mocks/{self.mock.id}/')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['status'], 'scheduled')
        self.assertEqual(data['entry_reason'], 'too_early')
        self.assertIn('questions_count', data)

    def test_another_classes_mock_is_not_found(self):
        other_teacher = make_teacher('ustoz_api_begona')
        foreign = MockTest.objects.create(
            teacher=other_teacher, subject=self.subject,
            test_set=make_test_set(subject=self.subject, title='Begona'),
            title='Begona mock', scheduled_start=self.now, duration_minutes=60,
            status='scheduled')

        response = self.client.get(f'/api/classroom/mocks/{foreign.id}/')
        self.assertEqual(response.status_code, 404)

    def test_a_draft_is_not_found(self):
        self.mock.status = 'draft'
        self.mock.save(update_fields=['status'])
        response = self.client.get(f'/api/classroom/mocks/{self.mock.id}/')
        self.assertEqual(response.status_code, 404)

    def test_live_mock_can_be_entered(self):
        self.mock.scheduled_start = timezone.now() - timedelta(minutes=5)
        self.mock.save(update_fields=['scheduled_start'])

        data = self.client.get(f'/api/classroom/mocks/{self.mock.id}/').json()
        self.assertEqual(data['status'], 'live')
        self.assertTrue(data['can_enter'])
        self.assertEqual(data['starts_in_seconds'], 0)
        self.assertGreater(data['ends_in_seconds'], 0)
