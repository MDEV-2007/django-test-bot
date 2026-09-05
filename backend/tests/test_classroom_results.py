"""Mock tugagandan keyin: reyting va natija xabari.

Da'volar:
  * reyting mock TUGAGANDAN KEYIN bir marta hisoblanadi, har topshiriqda emas;
  * teng ball teng o'rin oladi;
  * xabar ikkinchi marta yuborilmaydi;
  * Telegram ishlamasa ham natija yo'qolmaydi (ichki bildirishnoma qoladi);
  * reyting e'lon qilinmaguncha ko'rinmaydi.
"""
from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import ensure_profile_for_user
from classroom.models import MockAttempt, MockTest, Subscription
from classroom.results import publish_due_results, publish_results, rank_attempts, send_result
from core.models import Notification
from teacher.models import TeacherProfile
from tests_app.models import AnswerOption, Attempt, AttemptAnswer, Question, TestSet

from .factories import make_subject


def make_teacher(username):
    user = User.objects.create_user(username=username, password='pw-1234-teacher')
    profile = ensure_profile_for_user(user)
    profile.role = 'teacher'
    profile.save(update_fields=['role'])
    return TeacherProfile.objects.create(profile=profile, full_name=f'{username} F.')


class ResultsTestCase(TestCase):
    """Umumiy sozlash: tugagan mock va unga topshirilgan urinishlar."""

    def setUp(self):
        self.teacher = make_teacher('ustoz_natija')
        self.subject = make_subject()

        self.question = Question.objects.create(
            body='2+2=?', question_type='single_choice', subject=self.subject)
        AnswerOption.objects.create(question=self.question, text='4', is_correct=True)
        AnswerOption.objects.create(question=self.question, text='5', is_correct=False)

        self.test_set = TestSet.objects.create(
            title='Natija to\'plami', subject=self.subject, duration_minutes=30,
            is_premium=False, is_published=True)
        self.test_set.questions.set([self.question])

        # Mock allaqachon tugagan.
        self.mock = MockTest.objects.create(
            teacher=self.teacher, subject=self.subject, test_set=self.test_set,
            title='Haftalik mock', scheduled_start=timezone.now() - timedelta(hours=2),
            duration_minutes=30, status='live')

    def add_attempt(self, username, score, minutes_ago=60, telegram_id=None):
        user = User.objects.create_user(username=username, password='pw-1234-student')
        student = ensure_profile_for_user(user)
        if telegram_id:
            student.telegram_id = telegram_id
            student.save(update_fields=['telegram_id'])

        Subscription.objects.create(
            student=student, teacher=self.teacher, price_tiyin=4_000_000, status='active',
            current_period_start=timezone.now() - timedelta(days=1),
            current_period_end=timezone.now() + timedelta(days=29))

        attempt = Attempt.objects.create(profile=student, test=self.test_set)
        AttemptAnswer.objects.create(attempt=attempt, question=self.question)
        mock_attempt = MockAttempt.objects.create(
            student=student, mock=self.mock, attempt=attempt,
            submitted_at=timezone.now() - timedelta(minutes=minutes_ago),
            score=score, breakdown={'correct': 1, 'wrong': 0, 'skipped': 0, 'pending_ai': 0})
        return student, mock_attempt


class RankingTests(ResultsTestCase):
    def test_ranks_go_by_score(self):
        _, low = self.add_attempt('past_ball', 40.0)
        _, high = self.add_attempt('yuqori_ball', 90.0)
        _, middle = self.add_attempt('orta_ball', 70.0)

        rank_attempts(self.mock)
        for attempt in (low, middle, high):
            attempt.refresh_from_db()

        self.assertEqual(high.rank, 1)
        self.assertEqual(middle.rank, 2)
        self.assertEqual(low.rank, 3)

    def test_a_tie_is_broken_by_the_earlier_submission(self):
        _, late = self.add_attempt('kech_topshirdi', 80.0, minutes_ago=10)
        _, early = self.add_attempt('erta_topshirdi', 80.0, minutes_ago=50)

        rank_attempts(self.mock)
        early.refresh_from_db()
        late.refresh_from_db()

        # Teng ball — teng o'rin, lekin ro'yxatda ertaroq topshirgan yuqorida turadi.
        self.assertEqual(early.rank, 1)
        self.assertEqual(late.rank, 1)

    def test_equal_scores_share_a_rank_and_the_next_one_skips(self):
        """Standart raqobat tartibi: 1, 2, 2, 4."""
        self.add_attempt('birinchi', 100.0, minutes_ago=60)
        self.add_attempt('ikkinchi', 80.0, minutes_ago=50)
        self.add_attempt('uchinchi', 80.0, minutes_ago=40)
        self.add_attempt('tortinchi', 50.0, minutes_ago=30)

        ranks = [a.rank for a in rank_attempts(self.mock)]
        self.assertEqual(ranks, [1, 2, 2, 4])

    def test_unsubmitted_attempts_are_not_ranked(self):
        _, submitted = self.add_attempt('topshirgan', 60.0)
        user = User.objects.create_user(username='topshirmagan', password='pw-1234-x')
        student = ensure_profile_for_user(user)
        open_attempt = MockAttempt.objects.create(student=student, mock=self.mock)

        rank_attempts(self.mock)
        open_attempt.refresh_from_db()
        self.assertIsNone(open_attempt.rank)


class PublishTests(ResultsTestCase):
    def test_publishing_ranks_and_sends_once(self):
        self.add_attempt('alisher', 90.0)
        self.add_attempt('bobur', 60.0)

        with patch('classroom.results.background.submit') as submit:
            publish_results(self.mock)
            self.assertEqual(submit.call_count, 2)

        self.mock.refresh_from_db()
        self.assertIsNotNone(self.mock.results_published_at)
        self.assertEqual(self.mock.status, 'finished')

    def test_publishing_twice_sends_nothing_extra(self):
        self.add_attempt('alisher', 90.0)
        with patch('classroom.results.background.submit'):
            publish_results(self.mock)

        self.mock.refresh_from_db()
        with patch('classroom.results.background.submit') as submit:
            self.assertIsNone(publish_results(self.mock))
            submit.assert_not_called()

    def test_a_running_mock_is_not_published(self):
        """Yarim yo'lda reyting berish — o'quvchilarga noto'g'ri natija ko'rsatish."""
        self.mock.scheduled_start = timezone.now() - timedelta(minutes=5)
        self.mock.save(update_fields=['scheduled_start'])
        self.add_attempt('alisher', 90.0)

        self.assertIsNone(publish_results(self.mock))
        self.mock.refresh_from_db()
        self.assertIsNone(self.mock.results_published_at)

    def test_unsubmitted_attempts_are_closed_before_ranking(self):
        """Brauzerni yopib ketgan o'quvchi ham reytingga kiradi."""
        user = User.objects.create_user(username='yopib_ketdi', password='pw-1234-x')
        student = ensure_profile_for_user(user)
        attempt = Attempt.objects.create(profile=student, test=self.test_set)
        AttemptAnswer.objects.create(attempt=attempt, question=self.question)
        abandoned = MockAttempt.objects.create(student=student, mock=self.mock, attempt=attempt)
        MockAttempt.objects.filter(pk=abandoned.pk).update(
            started_at=timezone.now() - timedelta(hours=2))

        with patch('classroom.results.background.submit'):
            publish_results(self.mock)

        abandoned.refresh_from_db()
        self.assertIsNotNone(abandoned.submitted_at)
        self.assertIsNotNone(abandoned.rank)

    def test_the_command_finds_finished_mocks(self):
        self.add_attempt('alisher', 90.0)
        with patch('classroom.results.background.submit'):
            self.assertEqual(publish_due_results(), 1)
            self.assertEqual(publish_due_results(), 0)

    def test_drafts_are_never_published(self):
        self.mock.status = 'draft'
        self.mock.save(update_fields=['status'])
        self.add_attempt('alisher', 90.0)
        with patch('classroom.results.background.submit'):
            self.assertEqual(publish_due_results(), 0)


class ResultMessageTests(ResultsTestCase):
    def test_the_message_reaches_telegram_and_the_site(self):
        student, mock_attempt = self.add_attempt('alisher', 90.0, telegram_id='555001')
        mock_attempt.rank = 1
        mock_attempt.save(update_fields=['rank'])

        with patch('classroom.results.send_message', return_value={'ok': True}) as telegram:
            send_result(mock_attempt.pk, total_participants=1)
            telegram.assert_called_once()
            text = telegram.call_args[0][1]

        self.assertIn('90%', text)
        self.assertIn("O'rin: 1 / 1", text)
        self.assertEqual(Notification.objects.filter(profile=student).count(), 1)

        mock_attempt.refresh_from_db()
        self.assertIsNotNone(mock_attempt.result_sent_at)

    def test_a_result_is_never_sent_twice(self):
        _, mock_attempt = self.add_attempt('alisher', 90.0, telegram_id='555002')
        with patch('classroom.results.send_message', return_value={'ok': True}):
            send_result(mock_attempt.pk, 1)
        with patch('classroom.results.send_message') as telegram:
            send_result(mock_attempt.pk, 1)
            telegram.assert_not_called()

    def test_a_failed_telegram_call_does_not_lose_the_result(self):
        """Telegram ishlamasa ham o'quvchi natijani saytda ko'radi."""
        student, mock_attempt = self.add_attempt('alisher', 90.0, telegram_id='555003')
        with patch('classroom.results.send_message', return_value={'ok': False}):
            send_result(mock_attempt.pk, 1)

        self.assertEqual(Notification.objects.filter(profile=student).count(), 1)

    def test_a_student_without_telegram_still_gets_a_notification(self):
        student, mock_attempt = self.add_attempt('telegramsiz', 70.0)
        with patch('classroom.results.send_message') as telegram:
            send_result(mock_attempt.pk, 1)
            telegram.assert_not_called()

        self.assertEqual(Notification.objects.filter(profile=student).count(), 1)

    def test_pending_ai_answers_are_flagged_in_the_message(self):
        _, mock_attempt = self.add_attempt('esseli', 50.0, telegram_id='555004')
        mock_attempt.breakdown = {'correct': 1, 'wrong': 1, 'skipped': 0, 'pending_ai': 2}
        mock_attempt.save(update_fields=['breakdown'])

        with patch('classroom.results.send_message', return_value={'ok': True}) as telegram:
            send_result(mock_attempt.pk, 1)
            text = telegram.call_args[0][1]

        self.assertIn('tekshirilmoqda', text)


class LeaderboardApiTests(ResultsTestCase):
    def setUp(self):
        super().setUp()
        self.student, self.mock_attempt = self.add_attempt('alisher', 90.0)
        self.add_attempt('bobur', 60.0)
        self.client = APIClient()
        self.client.force_authenticate(user=self.student.user)

    def test_the_board_is_hidden_until_results_are_published(self):
        response = self.client.get(f'/api/classroom/mocks/{self.mock.id}/leaderboard/')
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertFalse(body['published'])
        self.assertEqual(body['rows'], [])

    def test_the_board_appears_after_publishing(self):
        with patch('classroom.results.background.submit'):
            publish_results(self.mock)

        body = self.client.get(f'/api/classroom/mocks/{self.mock.id}/leaderboard/').json()
        self.assertTrue(body['published'])
        self.assertEqual(len(body['rows']), 2)
        self.assertEqual(body['rows'][0]['rank'], 1)
        self.assertEqual(body['my_rank'], 1)

    def test_another_classes_board_is_not_found(self):
        other_teacher = make_teacher('ustoz_begona_natija')
        other_mock = MockTest.objects.create(
            teacher=other_teacher, subject=self.subject, test_set=self.test_set,
            title='Begona mock', scheduled_start=timezone.now() - timedelta(hours=2),
            duration_minutes=30, status='finished')

        response = self.client.get(f'/api/classroom/mocks/{other_mock.id}/leaderboard/')
        self.assertEqual(response.status_code, 404)
