"""Mock urinishi: server taymer, baholash va AI chegarasi.

Asosiy da'volar:
  * muddat SERVERDA hisoblanadi va klient uni siljita olmaydi;
  * kechikib kirgan o'quvchi mock oynasidan tashqariga chiqmaydi;
  * yopiq savollar so'rov ichida, esse esa fonda baholanadi;
  * oyiga 15 tadan ortiq AI baholash bo'lmaydi.
"""
from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import ensure_profile_for_user
from classroom.grading import (
    QUOTA_EXCEEDED_NOTE, close_expired_attempts, consume_ai_quota, finalize,
    grade_written_answers,
)
from classroom.models import AIGradingQuota, MockAttempt, MockTest, Subscription
from teacher.models import TeacherProfile, TeacherStudent
from tests_app.models import AnswerOption, Attempt, AttemptAnswer, Question, TestSet

from .factories import make_subject


def make_teacher(username):
    user = User.objects.create_user(username=username, password='pw-1234-teacher')
    profile = ensure_profile_for_user(user)
    profile.role = 'teacher'
    profile.save(update_fields=['role'])
    return TeacherProfile.objects.create(profile=profile, full_name=f'{username} F.')


def make_mcq(subject, body='2+2=?', correct='4', wrong='5'):
    question = Question.objects.create(body=body, question_type='single_choice', subject=subject)
    AnswerOption.objects.create(question=question, text=correct, is_correct=True)
    AnswerOption.objects.create(question=question, text=wrong, is_correct=False)
    return question


def make_essay(subject, body='Fikringizni yozing'):
    return Question.objects.create(
        body=body, question_type='open_written', subject=subject,
        reference_answer='Namunaviy javob')


class AttemptFlowTests(TestCase):
    def setUp(self):
        self.teacher = make_teacher('ustoz_urinish')
        self.subject = make_subject()
        self.user = User.objects.create_user(username='oquvchi_urinish', password='pw-1234-student')
        self.student = ensure_profile_for_user(self.user)

        self.questions = [make_mcq(self.subject, body=f'Savol {i}') for i in range(4)]
        self.test_set = TestSet.objects.create(
            title='Mock to\'plami', subject=self.subject, duration_minutes=60,
            is_premium=False, is_published=True)
        self.test_set.questions.set(self.questions)

        now = timezone.now()
        self.mock = MockTest.objects.create(
            teacher=self.teacher, subject=self.subject, test_set=self.test_set,
            title='Haftalik mock', scheduled_start=now - timedelta(minutes=1),
            duration_minutes=60, status='live')
        Subscription.objects.create(
            student=self.student, teacher=self.teacher, price_tiyin=4_000_000, status='active',
            current_period_start=now, current_period_end=now + timedelta(days=30))

        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def _start(self):
        response = self.client.post(f'/api/classroom/mocks/{self.mock.id}/start/')
        self.assertIn(response.status_code, (200, 201))
        return response.json()

    def _answer(self, attempt_id, question, option_text):
        option = question.choices.get(text=option_text)
        return self.client.post(f'/api/tests/attempts/{attempt_id}/answer/', {
            'question_id': question.id, 'q_idx': 1, 'choice_id': option.id,
        }, format='json')

    # --- Boshlash ---

    def test_start_creates_one_attempt_with_every_question(self):
        data = self._start()
        self.assertEqual(MockAttempt.objects.count(), 1)
        self.assertEqual(AttemptAnswer.objects.filter(attempt_id=data['attempt_id']).count(), 4)
        self.assertGreater(data['seconds_left'], 3500)

    def test_starting_twice_returns_the_same_attempt(self):
        """Bitta o'quvchi bitta mock'ni faqat bir marta yechadi."""
        first = self._start()
        second = self._start()
        self.assertEqual(first['mock_attempt_id'], second['mock_attempt_id'])
        self.assertEqual(MockAttempt.objects.count(), 1)

    def test_without_a_subscription_start_is_refused(self):
        """Referral orqali kelgan, lekin hali to'lamagan o'quvchi: mock ko'rinadi
        (jadval kerak), kirish esa yopiq."""
        Subscription.objects.all().delete()
        TeacherStudent.objects.create(teacher=self.teacher.profile, student=self.student)

        response = self.client.post(f'/api/classroom/mocks/{self.mock.id}/start/')
        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.json()['entry_reason'], 'no_subscription')
        self.assertEqual(MockAttempt.objects.count(), 0)

    def test_a_stranger_does_not_even_see_the_mock(self):
        """Sinfga umuman aloqasi yo'q o'quvchiga 404 — "bor, lekin sizga emas" degan
        javob ham ortiqcha ma'lumot."""
        Subscription.objects.all().delete()
        response = self.client.post(f'/api/classroom/mocks/{self.mock.id}/start/')
        self.assertEqual(response.status_code, 404)

    def test_after_the_window_start_is_refused(self):
        self.mock.scheduled_start = timezone.now() - timedelta(hours=3)
        self.mock.save(update_fields=['scheduled_start'])
        response = self.client.post(f'/api/classroom/mocks/{self.mock.id}/start/')
        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.json()['entry_reason'], 'too_late')

    # --- Server taymer ---

    def test_a_late_starter_is_capped_by_the_mock_window(self):
        """Oynaning oxirgi 10 daqiqasida kirgan o'quvchi 60 emas, 10 daqiqa oladi —
        aks holda u boshqalardan ko'proq vaqt olib, reytingni buzardi."""
        self.mock.scheduled_start = timezone.now() - timedelta(minutes=50)
        self.mock.save(update_fields=['scheduled_start'])

        data = self._start()
        self.assertLessEqual(data['seconds_left'], 10 * 60)
        self.assertGreater(data['seconds_left'], 9 * 60)

    def test_answers_are_refused_after_the_deadline(self):
        data = self._start()
        mock_attempt = MockAttempt.objects.get(pk=data['mock_attempt_id'])

        # Muddat o'tdi: urinish 2 soat oldin boshlangan deb ko'rsatamiz.
        Attempt.objects.filter(pk=data['attempt_id']).update(
            started_at=timezone.now() - timedelta(hours=2))
        MockAttempt.objects.filter(pk=mock_attempt.pk).update(
            started_at=timezone.now() - timedelta(hours=2))

        response = self._answer(data['attempt_id'], self.questions[0], '4')
        self.assertEqual(response.status_code, 409)
        self.assertTrue(response.json()['time_up'])

        answer = AttemptAnswer.objects.get(attempt_id=data['attempt_id'], question=self.questions[0])
        self.assertIsNone(answer.selected_choice_id)

    def test_answers_within_the_window_are_accepted(self):
        data = self._start()
        response = self._answer(data['attempt_id'], self.questions[0], '4')
        self.assertEqual(response.status_code, 200)

    # --- Topshirish va baholash ---

    def test_submit_grades_closed_questions_immediately(self):
        data = self._start()
        self._answer(data['attempt_id'], self.questions[0], '4')
        self._answer(data['attempt_id'], self.questions[1], '4')
        self._answer(data['attempt_id'], self.questions[2], '5')

        response = self.client.post(f'/api/classroom/attempts/{data["mock_attempt_id"]}/submit/')
        self.assertEqual(response.status_code, 200)
        body = response.json()

        self.assertTrue(body['is_submitted'])
        self.assertEqual(body['score'], 50.0)  # 4 savoldan 2 tasi to'g'ri
        self.assertEqual(body['breakdown']['correct'], 2)
        self.assertEqual(body['breakdown']['wrong'], 1)
        self.assertEqual(body['breakdown']['skipped'], 1)
        self.assertEqual(body['breakdown']['pending_ai'], 0)

    def test_submitting_twice_changes_nothing(self):
        data = self._start()
        self._answer(data['attempt_id'], self.questions[0], '4')

        first = self.client.post(f'/api/classroom/attempts/{data["mock_attempt_id"]}/submit/').json()
        second = self.client.post(f'/api/classroom/attempts/{data["mock_attempt_id"]}/submit/').json()

        self.assertEqual(first['submitted_at'], second['submitted_at'])
        self.assertEqual(first['score'], second['score'])

    def test_a_late_submit_still_saves_the_work(self):
        """Kechikkan topshiriq rad etilmaydi: javoblar allaqachon muddat bilan
        to'silgan, tayyor ishni yo'qotishning ma'nosi yo'q."""
        data = self._start()
        self._answer(data['attempt_id'], self.questions[0], '4')

        MockAttempt.objects.filter(pk=data['mock_attempt_id']).update(
            started_at=timezone.now() - timedelta(hours=2))

        response = self.client.post(f'/api/classroom/attempts/{data["mock_attempt_id"]}/submit/')
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()['was_late'])
        self.assertTrue(response.json()['is_submitted'])

    def test_another_students_attempt_is_not_reachable(self):
        data = self._start()
        intruder = User.objects.create_user(username='begona_urinish', password='pw-1234-x')
        ensure_profile_for_user(intruder)
        self.client.force_authenticate(user=intruder)

        response = self.client.post(f'/api/classroom/attempts/{data["mock_attempt_id"]}/submit/')
        self.assertEqual(response.status_code, 404)

    def test_expired_attempts_are_closed_by_the_command(self):
        """Brauzerni yopib ketgan o'quvchining ishi ham baholanadi."""
        data = self._start()
        self._answer(data['attempt_id'], self.questions[0], '4')

        deadline = MockAttempt.objects.get(pk=data['mock_attempt_id']).deadline
        MockAttempt.objects.filter(pk=data['mock_attempt_id']).update(
            started_at=timezone.now() - timedelta(hours=2))

        self.assertEqual(close_expired_attempts(), 1)
        mock_attempt = MockAttempt.objects.get(pk=data['mock_attempt_id'])
        self.assertIsNotNone(mock_attempt.submitted_at)
        # Yakunlash vaqti — chinakam muddat oxiri, buyruq ishlagan payt emas.
        self.assertLess(mock_attempt.submitted_at, timezone.now() - timedelta(minutes=30))

    def test_a_submitted_attempt_is_left_alone_by_the_command(self):
        data = self._start()
        self.client.post(f'/api/classroom/attempts/{data["mock_attempt_id"]}/submit/')
        MockAttempt.objects.filter(pk=data['mock_attempt_id']).update(
            started_at=timezone.now() - timedelta(hours=2))
        self.assertEqual(close_expired_attempts(), 0)


class WrittenGradingTests(TestCase):
    """Esse baholash: fonda, chegara bilan."""

    def setUp(self):
        self.teacher = make_teacher('ustoz_esse')
        self.subject = make_subject()
        self.user = User.objects.create_user(username='oquvchi_esse', password='pw-1234-student')
        self.student = ensure_profile_for_user(self.user)

        self.mcq = make_mcq(self.subject)
        self.essay = make_essay(self.subject)
        self.test_set = TestSet.objects.create(
            title='Esseli mock', subject=self.subject, duration_minutes=60,
            is_premium=False, is_published=True)
        self.test_set.questions.set([self.mcq, self.essay])

        now = timezone.now()
        self.mock = MockTest.objects.create(
            teacher=self.teacher, subject=self.subject, test_set=self.test_set,
            title='Esseli mock', scheduled_start=now - timedelta(minutes=1),
            duration_minutes=60, status='live')

        self.attempt = Attempt.objects.create(profile=self.student, test=self.test_set)
        AttemptAnswer.objects.create(attempt=self.attempt, question=self.mcq)
        self.essay_answer = AttemptAnswer.objects.create(
            attempt=self.attempt, question=self.essay, text_answer='Mening javobim')
        self.mock_attempt = MockAttempt.objects.create(
            student=self.student, mock=self.mock, attempt=self.attempt)

    def test_submit_does_not_wait_for_the_ai(self):
        """Yakunlash so'rovi AI ni chaqirmaydi — 200 ta topshiriq bir vaqtda kelsa ham
        so'rov navbatga tushmasligi kerak."""
        with patch('classroom.grading.grade_open_answers') as ai_call:
            finalize(self.mock_attempt)
            ai_call.assert_not_called()

        self.mock_attempt.refresh_from_db()
        self.assertIsNotNone(self.mock_attempt.submitted_at)
        self.assertEqual(self.mock_attempt.breakdown['pending_ai'], 1)

    def test_background_grading_updates_the_score(self):
        finalize(self.mock_attempt)
        with patch('classroom.grading.grade_open_answers',
                   return_value=[{'is_correct': True, 'note': "To'g'ri"}]):
            grade_written_answers(self.mock_attempt.pk)

        self.mock_attempt.refresh_from_db()
        self.essay_answer.refresh_from_db()
        self.assertTrue(self.essay_answer.is_correct)
        self.assertEqual(self.mock_attempt.breakdown['pending_ai'], 0)
        self.assertEqual(self.mock_attempt.score, 50.0)  # 2 savoldan 1 tasi

    def test_ai_failure_leaves_the_score_alone_and_refunds_the_quota(self):
        finalize(self.mock_attempt)
        with patch('classroom.grading.grade_open_answers', return_value=None):
            grade_written_answers(self.mock_attempt.pk)

        self.assertEqual(
            AIGradingQuota.objects.get(student=self.student).used, 0,
            "Ishlamagan xizmat uchun chegara sarflanmasligi kerak")
        self.essay_answer.refresh_from_db()
        self.assertFalse(self.essay_answer.is_correct)


class AIQuotaTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='oquvchi_chegara', password='pw-1234-student')
        self.student = ensure_profile_for_user(self.user)

    def test_quota_counts_down(self):
        self.assertEqual(consume_ai_quota(self.student, 3), 3)
        self.assertEqual(consume_ai_quota(self.student, 3), 3)
        self.assertEqual(AIGradingQuota.objects.get(student=self.student).used, 6)

    def test_quota_stops_at_the_monthly_limit(self):
        consume_ai_quota(self.student, AIGradingQuota.MONTHLY_LIMIT)
        self.assertEqual(consume_ai_quota(self.student, 5), 0)

    def test_a_partial_grant_is_possible(self):
        consume_ai_quota(self.student, AIGradingQuota.MONTHLY_LIMIT - 2)
        self.assertEqual(consume_ai_quota(self.student, 5), 2)

    def test_a_new_month_starts_fresh(self):
        consume_ai_quota(self.student, AIGradingQuota.MONTHLY_LIMIT)
        next_month = timezone.now() + timedelta(days=40)
        self.assertEqual(consume_ai_quota(self.student, 3, moment=next_month), 3)

    def test_answers_over_the_limit_are_marked_not_graded(self):
        """Chegara tugagach esse jimgina "xato" bo'lib qolmasligi kerak — sabab
        yozib qo'yiladi."""
        consume_ai_quota(self.student, AIGradingQuota.MONTHLY_LIMIT)

        subject = make_subject()
        teacher = make_teacher('ustoz_chegara')
        essay = make_essay(subject)
        test_set = TestSet.objects.create(
            title='Chegara mocki', subject=subject, duration_minutes=60,
            is_premium=False, is_published=True)
        test_set.questions.set([essay])
        mock = MockTest.objects.create(
            teacher=teacher, subject=subject, test_set=test_set, title='Chegara mocki',
            scheduled_start=timezone.now(), duration_minutes=60, status='live')
        attempt = Attempt.objects.create(profile=self.student, test=test_set)
        answer = AttemptAnswer.objects.create(attempt=attempt, question=essay, text_answer='Javob')
        mock_attempt = MockAttempt.objects.create(student=self.student, mock=mock, attempt=attempt)

        finalize(mock_attempt)
        with patch('classroom.grading.grade_open_answers') as ai_call:
            grade_written_answers(mock_attempt.pk)
            ai_call.assert_not_called()

        answer.refresh_from_db()
        self.assertEqual(answer.ai_grading_note, QUOTA_EXCEEDED_NOTE)
