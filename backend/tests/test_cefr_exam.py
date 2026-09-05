"""CEFR imtihon oqimi: partlar (matn/audio), bo'shliqli javoblar, TRUE/FALSE/NOT GIVEN,
belgilar (highlight) va Writing tekshiruvining premium darvozasi.

Muhim kontrakt: to'g'ri javob imtihon payload'ida HECH QACHON bo'lmaydi — o'quvchi
sahifaning manbasidan kalitni ko'ra olmasligi kerak.
"""
import json
from unittest.mock import patch

from django.test import TestCase
from rest_framework.test import APIClient

from tests_app.models import (
    AcceptedAnswer, AttemptAnswer, ExamSection, Question, normalize_gap_answer,
)
from tests_app.services.writing import count_words

from .factories import make_attempt, make_subject, make_test_set, make_user


def make_gap_question(section, number, answers, subject=None, max_words=1):
    question = Question.objects.create(
        body=f"{number}.", question_type='gap_fill', category='cefr',
        section=section, exam_number=number, max_words=max_words, subject=subject,
    )
    for order, text in enumerate(answers):
        AcceptedAnswer.objects.create(question=question, text=text, order=order)
    return question


def make_tfng_question(section, number, answer, body="Statement.", subject=None):
    question = Question.objects.create(
        body=body, question_type='tfng', category='cefr',
        section=section, exam_number=number, subject=subject,
    )
    AcceptedAnswer.objects.create(question=question, text=answer)
    return question


class GapFillGradingTests(TestCase):
    """Bo'shliqli javob AI'siz, aniq solishtirish bilan baholanadi."""

    def setUp(self):
        self.user, self.profile = make_user()
        self.subject = make_subject()
        self.test_set = make_test_set(subject=self.subject)
        self.section = ExamSection.objects.create(
            test_set=self.test_set, skill='reading', part_number=1,
            passage="<p>A narrow path in the {{1}}.</p>",
        )
        self.question = make_gap_question(self.section, 1, ['forest', 'the forest'], self.subject)
        self.test_set.questions.set([self.question])
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def _answer(self, text):
        attempt = make_attempt(self.profile, self.test_set, [self.question])
        response = self.client.post(f'/api/tests/attempts/{attempt.id}/exam/answer/', {
            'question_id': self.question.id, 'text_answer': text,
        }, format='json')
        self.assertEqual(response.status_code, 200)
        return AttemptAnswer.objects.get(attempt=attempt, question=self.question)

    def test_exact_answer_is_correct(self):
        self.assertTrue(self._answer('forest').is_correct)

    def test_case_and_punctuation_are_ignored(self):
        """Imtihon varaqasida "Forest." va "forest" bir xil javob."""
        self.assertTrue(self._answer('  Forest. ').is_correct)

    def test_second_accepted_variant_also_counts(self):
        self.assertTrue(self._answer('The Forest').is_correct)

    def test_wrong_word_is_incorrect(self):
        self.assertFalse(self._answer('river').is_correct)

    def test_empty_answer_counts_as_skipped(self):
        answer = self._answer('')
        self.assertFalse(answer.is_correct)
        self.assertTrue(answer.is_skipped)

    def test_normalizer_collapses_spacing_and_quotes(self):
        self.assertEqual(normalize_gap_answer("  don’t   worry! "), "don't worry")


class TrueFalseNotGivenTests(TestCase):
    def setUp(self):
        self.user, self.profile = make_user()
        self.subject = make_subject()
        self.test_set = make_test_set(subject=self.subject)
        self.section = ExamSection.objects.create(
            test_set=self.test_set, skill='reading', part_number=4)
        self.question = make_tfng_question(self.section, 25, 'NOT GIVEN', subject=self.subject)
        self.test_set.questions.set([self.question])
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_options_are_served_but_not_the_key(self):
        attempt = make_attempt(self.profile, self.test_set, [self.question])
        response = self.client.get(f'/api/tests/attempts/{attempt.id}/exam/')
        payload = response.json()['sections'][0]['questions'][0]
        self.assertEqual(payload['tfng_options'], ['TRUE', 'FALSE', 'NOT GIVEN'])
        self.assertNotIn('NOT GIVEN', json.dumps(payload['body']))

    def test_matching_verdict_is_correct(self):
        attempt = make_attempt(self.profile, self.test_set, [self.question])
        self.client.post(f'/api/tests/attempts/{attempt.id}/exam/answer/', {
            'question_id': self.question.id, 'text_answer': 'not given',
        }, format='json')
        self.assertTrue(AttemptAnswer.objects.get(attempt=attempt).is_correct)

    def test_opposite_verdict_is_wrong(self):
        attempt = make_attempt(self.profile, self.test_set, [self.question])
        self.client.post(f'/api/tests/attempts/{attempt.id}/exam/answer/', {
            'question_id': self.question.id, 'text_answer': 'TRUE',
        }, format='json')
        self.assertFalse(AttemptAnswer.objects.get(attempt=attempt).is_correct)


class ExamPayloadTests(TestCase):
    """Butun urinish bitta so'rovda: partlar, matn, audio va savollar."""

    def setUp(self):
        self.user, self.profile = make_user()
        self.subject = make_subject()
        self.test_set = make_test_set(subject=self.subject)
        self.reading = ExamSection.objects.create(
            test_set=self.test_set, skill='reading', part_number=1, order=0,
            title='INJURED BIRD', instruction='Fill in each gap with ONE word.',
            passage="<p>A narrow path in the {{1}}.</p>",
        )
        self.listening = ExamSection.objects.create(
            test_set=self.test_set, skill='listening', part_number=2, order=1,
            audio_url='https://cdn.example.com/part2.mp3', audio_play_limit=2,
        )
        self.q1 = make_gap_question(self.reading, 1, ['forest'], self.subject)
        self.q2 = make_gap_question(self.listening, 9, ['July'], self.subject)
        self.test_set.questions.set([self.q1, self.q2])
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_sections_carry_passage_audio_and_questions(self):
        attempt = make_attempt(self.profile, self.test_set, [self.q1, self.q2])
        data = self.client.get(f'/api/tests/attempts/{attempt.id}/exam/').json()

        self.assertEqual([s['skill'] for s in data['sections']], ['reading', 'listening'])
        reading, listening = data['sections']
        self.assertIn('{{1}}', reading['passage'])
        self.assertEqual(reading['title'], 'INJURED BIRD')
        self.assertEqual(listening['audio'], 'https://cdn.example.com/part2.mp3')
        self.assertEqual(listening['audio_play_limit'], 2)
        self.assertEqual([q['exam_number'] for q in listening['questions']], [9])

    def test_answer_key_never_leaves_the_server(self):
        attempt = make_attempt(self.profile, self.test_set, [self.q1, self.q2])
        raw = json.dumps(self.client.get(f'/api/tests/attempts/{attempt.id}/exam/').json())
        self.assertNotIn('forest', raw.lower())
        self.assertNotIn('july', raw.lower())

    def test_another_students_attempt_is_not_readable(self):
        attempt = make_attempt(self.profile, self.test_set, [self.q1])
        other_user, _ = make_user(username='intruder')
        self.client.force_authenticate(user=other_user)
        response = self.client.get(f'/api/tests/attempts/{attempt.id}/exam/')
        self.assertEqual(response.status_code, 404)

    def test_questions_without_a_section_are_still_returned(self):
        loose = make_gap_question(None, None, ['answer'], self.subject)
        loose.section = None
        loose.save(update_fields=['section'])
        self.test_set.questions.add(loose)
        attempt = make_attempt(self.profile, self.test_set, [self.q1, loose])
        data = self.client.get(f'/api/tests/attempts/{attempt.id}/exam/').json()
        self.assertEqual([q['id'] for q in data['loose_questions']], [loose.id])


class AnnotationTests(TestCase):
    """Matn ustidagi sariq belgilar — o'quvchining shaxsiy qaydlari, baholashga ta'siri yo'q."""

    def setUp(self):
        self.user, self.profile = make_user()
        self.subject = make_subject()
        self.test_set = make_test_set(subject=self.subject)
        self.section = ExamSection.objects.create(
            test_set=self.test_set, skill='reading', part_number=1)
        self.question = make_gap_question(self.section, 1, ['forest'], self.subject)
        self.test_set.questions.set([self.question])
        self.attempt = make_attempt(self.profile, self.test_set, [self.question])
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_highlights_survive_a_reload(self):
        payload = {str(self.section.id): [{'start': 4, 'end': 18, 'color': 'yellow', 'note': 'kalit'}]}
        response = self.client.post(f'/api/tests/attempts/{self.attempt.id}/annotations/',
                                    {'annotations': payload}, format='json')
        self.assertEqual(response.status_code, 200)

        data = self.client.get(f'/api/tests/attempts/{self.attempt.id}/exam/').json()
        self.assertEqual(data['annotations'][str(self.section.id)][0]['note'], 'kalit')

    def test_non_object_payload_is_rejected(self):
        response = self.client.post(f'/api/tests/attempts/{self.attempt.id}/annotations/',
                                    {'annotations': ['nope']}, format='json')
        self.assertEqual(response.status_code, 400)


class WritingTaskTests(TestCase):
    """Yozish bepul, AI tekshiruvi premium."""

    def setUp(self):
        self.user, self.profile = make_user()
        self.subject = make_subject()
        self.test_set = make_test_set(subject=self.subject)
        self.section = ExamSection.objects.create(
            test_set=self.test_set, skill='writing', part_number=1)
        self.question = Question.objects.create(
            body='Write an email to your friend about your holiday.',
            question_type='writing_task', category='cefr', subject=self.subject,
            section=self.section, exam_number=1, min_words=60, max_words=80,
        )
        self.gap = make_gap_question(self.section, 2, ['forest'], self.subject)
        self.test_set.questions.set([self.question, self.gap])
        self.attempt = make_attempt(self.profile, self.test_set, [self.question, self.gap])
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def _write(self, text='Hello, my holiday was great and I visited the mountains.'):
        return self.client.post(f'/api/tests/attempts/{self.attempt.id}/exam/answer/', {
            'question_id': self.question.id, 'text_answer': text,
        }, format='json')

    def test_writing_is_saved_without_premium(self):
        self.assertEqual(self._write().status_code, 200)
        answer = AttemptAnswer.objects.get(attempt=self.attempt, question=self.question)
        self.assertIn('holiday', answer.text_answer)
        self.assertIsNone(answer.ai_score)

    def test_review_requires_premium(self):
        self._write()
        response = self.client.post(f'/api/tests/attempts/{self.attempt.id}/writing-review/',
                                    {'question_id': self.question.id}, format='json')
        self.assertEqual(response.status_code, 402)
        self.assertEqual(response.json()['error'], 'premium_required')

    @patch('tests_app.cefr_api.review_writing')
    def test_premium_student_gets_scored(self, mocked_review):
        mocked_review.return_value = {
            'task': 4.0, 'coherence': 3.5, 'lexis': 4.0, 'grammar': 3.0,
            'overall': 3.5, 'level': 'B1', 'summary': 'Yaxshi xat.',
            'strengths': ['Aniq tuzilma'], 'improvements': ["So'z boyligi"],
            'corrections': [], 'word_count': 11,
        }
        self.profile.premium_mock_test_unlocked = True
        self.profile.save(update_fields=['premium_mock_test_unlocked'])
        self._write()

        response = self.client.post(f'/api/tests/attempts/{self.attempt.id}/writing-review/',
                                    {'question_id': self.question.id}, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['level'], 'B1')

        answer = AttemptAnswer.objects.get(attempt=self.attempt, question=self.question)
        self.assertEqual(answer.ai_score, 3.5)
        self.assertEqual(answer.ai_level, 'B1')
        self.assertEqual(answer.open_grading['strengths'], ['Aniq tuzilma'])

    def test_empty_answer_is_not_sent_to_the_ai(self):
        self.profile.premium_mock_test_unlocked = True
        self.profile.save(update_fields=['premium_mock_test_unlocked'])
        response = self.client.post(f'/api/tests/attempts/{self.attempt.id}/writing-review/',
                                    {'question_id': self.question.id}, format='json')
        self.assertEqual(response.status_code, 400)

    def test_writing_is_excluded_from_the_percentage_score(self):
        """Esse to'g'ri/xato deb sanalmaydi — aks holda uni yozgan o'quvchi avtomatik
        "xato" olardi. Faqat bo'shliqli savol maxrajga kiradi."""
        self._write()
        self.client.post(f'/api/tests/attempts/{self.attempt.id}/exam/answer/', {
            'question_id': self.gap.id, 'text_answer': 'forest',
        }, format='json')

        response = self.client.post(f'/api/tests/attempts/{self.attempt.id}/finish/', {}, format='json')
        data = response.json()
        self.assertEqual(data['score'], 100.0)
        self.assertEqual(data['correct'], 1)
        self.assertEqual(data['wrong'], 0)
        self.assertEqual(data['skipped'], 0)


class WordCountTests(TestCase):
    def test_counts_words_not_punctuation(self):
        self.assertEqual(count_words("Don't worry — it's fine, really!"), 5)

    def test_empty_text_is_zero(self):
        self.assertEqual(count_words(''), 0)
        self.assertEqual(count_words(None), 0)
