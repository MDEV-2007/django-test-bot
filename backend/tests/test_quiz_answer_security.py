"""1-kun: Fokus Sprint va 7-savollik Blitz — javob kalitlari xavfsizligi.

Tekshiriladi:
- savollar GET javobida javob kaliti (correct_option_id / is_correct) yo'q;
- javob endpointlari autentifikatsiya talab qiladi;
- variant aynan shu savolga tegishli bo'lishi shart (400);
- savol foydalanuvchi sessiyasiga kirgan bo'lishi shart (400);
- boshqa foydalanuvchi sessiyasi (404), muddati o'tgan sessiya (410);
- takroriy va ketma-ket "parallel" yuborish natijani ikki marta yozmaydi;
- explain-mistake client yuborgan "to'g'ri javob" matniga ishonmaydi va javobdan
  oldin kalitni ochib bermaydi.
"""
from datetime import timedelta
from unittest import mock

from django.core.cache import cache
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from sprint.models import (MistakeExplanationCache, QuizSession, QuizSessionAnswer,
                           UserMistakeNotebook)
from tests_app.models import AnswerOption, Question, RevisionItem

from .factories import make_question, make_subject, make_user

SPRINT_Q = '/api/v1/sprint/questions/'
SPRINT_A = '/api/v1/sprint/answer/'
EXPLAIN = '/api/v1/sprint/explain-mistake/'
BLITZ_Q = '/api/growth/onboarding/blitz/'
BLITZ_A = '/api/growth/onboarding/blitz/answer/'


def _walk_keys(obj):
    if isinstance(obj, dict):
        for k, v in obj.items():
            yield k
            yield from _walk_keys(v)
    elif isinstance(obj, list):
        for item in obj:
            yield from _walk_keys(item)


class _Base(TestCase):
    def setUp(self):
        cache.clear()
        self.subject = make_subject()
        self.questions = [make_question(subject=self.subject, body=f"Savol {i}") for i in range(6)]
        self.user, self.profile = make_user('sprinter')
        self.other, _ = make_user('boshqa')
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def correct(self, q):
        return q.choices.get(is_correct=True)

    def wrong(self, q):
        return q.choices.filter(is_correct=False).first()

    def start_sprint(self, client=None):
        res = (client or self.client).get(SPRINT_Q, {'count': 5, 'subject_id': self.subject.id})
        self.assertEqual(res.status_code, 200, res.content)
        return res.json()


class SprintQuestionsTests(_Base):
    def test_anonymous_cannot_load_questions(self):
        res = APIClient().get(SPRINT_Q)
        self.assertIn(res.status_code, (401, 403))

    def test_questions_do_not_leak_answer_key(self):
        data = self.start_sprint()
        self.assertTrue(data['session_id'])
        self.assertEqual(data['count'], 5)
        keys = set(_walk_keys(data['questions']))
        self.assertFalse(keys & {'correct_option_id', 'is_correct', 'correct', 'explanation'}, keys)

    def test_session_contains_only_served_questions(self):
        data = self.start_sprint()
        session = QuizSession.objects.get(pk=data['session_id'])
        self.assertEqual(session.user, self.user)
        self.assertEqual(sorted(session.question_ids), sorted(q['id'] for q in data['questions']))

    def test_bad_count_param_does_not_500(self):
        res = self.client.get(SPRINT_Q, {'count': 'abc'})
        self.assertEqual(res.status_code, 200)


class SprintAnswerTests(_Base):
    def setUp(self):
        super().setUp()
        data = self.start_sprint()
        self.session_id = data['session_id']
        self.served = [q['id'] for q in data['questions']]
        self.q = next(q for q in self.questions if q.id == self.served[0])

    def post(self, question_id, option_id, client=None, **extra):
        payload = {'session_id': self.session_id, 'question_id': question_id, 'option_id': option_id, **extra}
        return (client or self.client).post(SPRINT_A, payload, format='json')

    def test_anonymous_rejected(self):
        res = self.post(self.q.id, self.correct(self.q).id, client=APIClient())
        self.assertIn(res.status_code, (401, 403))

    def test_valid_correct_answer(self):
        res = self.post(self.q.id, self.correct(self.q).id)
        self.assertEqual(res.status_code, 200, res.content)
        body = res.json()
        self.assertTrue(body['is_correct'])
        self.assertEqual(body['correct_option_id'], self.correct(self.q).id)
        self.assertFalse(body['duplicate'])
        self.assertEqual(QuizSessionAnswer.objects.filter(session_id=self.session_id).count(), 1)

    def test_wrong_answer_returns_key_only_after_submission_and_records_mistake(self):
        res = self.post(self.q.id, self.wrong(self.q).id)
        self.assertEqual(res.status_code, 200)
        self.assertFalse(res.json()['is_correct'])
        self.assertEqual(res.json()['correct_option_id'], self.correct(self.q).id)
        self.assertTrue(UserMistakeNotebook.objects.filter(user=self.user, question=self.q).exists())
        item = RevisionItem.objects.get(profile=self.profile, question=self.q)
        self.assertEqual(item.times_wrong, 1)

    def test_option_from_another_question_is_400(self):
        other_q = next(q for q in self.questions if q.id == self.served[1])
        res = self.post(self.q.id, self.correct(other_q).id)
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.json()['code'], 'option_mismatch')
        self.assertFalse(QuizSessionAnswer.objects.exists())

    def test_question_outside_session_is_400(self):
        outsider = make_question(subject=self.subject, body="Sessiyada yo'q")
        res = self.post(outsider.id, self.correct(outsider).id)
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.json()['code'], 'question_not_in_session')

    def test_other_users_session_is_404(self):
        intruder = APIClient()
        intruder.force_authenticate(self.other)
        res = self.post(self.q.id, self.correct(self.q).id, client=intruder)
        self.assertEqual(res.status_code, 404)
        self.assertFalse(QuizSessionAnswer.objects.exists())

    def test_expired_session_is_410(self):
        QuizSession.objects.filter(pk=self.session_id).update(expires_at=timezone.now() - timedelta(seconds=1))
        res = self.post(self.q.id, self.correct(self.q).id)
        self.assertEqual(res.status_code, 410)

    def test_garbage_ids_are_400(self):
        res = self.client.post(SPRINT_A, {'session_id': 'x', 'question_id': None, 'option_id': -1}, format='json')
        self.assertEqual(res.status_code, 400)

    def test_duplicate_submission_is_idempotent(self):
        first = self.post(self.q.id, self.wrong(self.q).id).json()
        # Ikkinchi so'rov boshqa (to'g'ri) variant bilan — natijani o'zgartira olmaydi.
        second = self.post(self.q.id, self.correct(self.q).id).json()
        self.assertFalse(first['duplicate'])
        self.assertTrue(second['duplicate'])
        self.assertFalse(second['is_correct'])
        self.assertEqual(QuizSessionAnswer.objects.filter(session_id=self.session_id).count(), 1)
        # Xato ikki marta hisoblanmaydi.
        self.assertEqual(RevisionItem.objects.get(profile=self.profile, question=self.q).times_wrong, 1)

    def test_parallel_insert_race_is_absorbed(self):
        """Parallel so'rov qatorni birinchi bo'lib yozib ulgurgan holat: bizning INSERT
        unique constraintga uriladi — 500 emas, o'sha birinchi natija qaytadi."""
        QuizSessionAnswer.objects.create(
            session_id=self.session_id, question=self.q,
            selected_option=self.wrong(self.q), is_correct=False,
        )
        res = self.post(self.q.id, self.correct(self.q).id)
        self.assertEqual(res.status_code, 200, res.content)
        self.assertTrue(res.json()['duplicate'])
        self.assertFalse(res.json()['is_correct'])
        self.assertEqual(QuizSessionAnswer.objects.filter(session_id=self.session_id).count(), 1)

    def test_revenge_only_after_wrong_answer(self):
        res = self.post(self.q.id, self.correct(self.q).id, revenge=True)
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.json()['code'], 'revenge_not_allowed')

    def test_revenge_correct_resolves_mistake_once(self):
        self.post(self.q.id, self.wrong(self.q).id)
        res = self.post(f"revenge_{self.q.id}_123", self.correct(self.q).id, revenge=True)
        self.assertEqual(res.status_code, 200, res.content)
        self.assertTrue(res.json()['is_correct'])
        self.assertTrue(UserMistakeNotebook.objects.get(user=self.user, question=self.q).is_resolved)
        again = self.post(self.q.id, self.correct(self.q).id, revenge=True).json()
        self.assertTrue(again['duplicate'])
        stored = QuizSessionAnswer.objects.get(session_id=self.session_id, question=self.q)
        self.assertFalse(stored.is_correct)  # birinchi javob o'zgarmaydi
        self.assertTrue(stored.revenge_correct)
        self.assertEqual(stored.revenge_attempts, 1)

    def test_revenge_attempts_are_capped(self):
        self.post(self.q.id, self.wrong(self.q).id)
        for _ in range(3):
            self.assertEqual(self.post(self.q.id, self.wrong(self.q).id, revenge=True).status_code, 200)
        res = self.post(self.q.id, self.wrong(self.q).id, revenge=True)
        self.assertEqual(res.status_code, 409)


class ExplainMistakeTests(_Base):
    def setUp(self):
        super().setUp()
        data = self.start_sprint()
        self.session_id = data['session_id']
        self.q = next(q for q in self.questions if q.id == data['questions'][0]['id'])

    def explain(self, **payload):
        return self.client.post(EXPLAIN, payload, format='json')

    def test_requires_auth(self):
        res = APIClient().post(EXPLAIN, {'question_id': self.q.id, 'selected_option_id': 1}, format='json')
        self.assertIn(res.status_code, (401, 403))

    def test_cannot_get_explanation_before_answering(self):
        res = self.explain(question_id=self.q.id, selected_option_id=self.wrong(self.q).id)
        self.assertEqual(res.status_code, 403)

    def test_option_must_belong_to_question(self):
        other = make_question(subject=self.subject, body='Boshqa')
        res = self.explain(question_id=self.q.id, selected_option_id=self.wrong(other).id)
        self.assertEqual(res.status_code, 400)

    def test_client_supplied_texts_are_ignored(self):
        self.client.post(SPRINT_A, {'session_id': self.session_id, 'question_id': self.q.id,
                                    'option_id': self.wrong(self.q).id}, format='json')
        captured = {}

        def fake_ai(**kwargs):
            captured.update(kwargs)
            return {'why_wrong': 'w', 'memory_hack': 'm', 'is_fallback': False}

        with mock.patch('sprint.views.generate_mistake_explanation', side_effect=fake_ai):
            res = self.explain(
                question_id=self.q.id,
                selected_option_id=self.wrong(self.q).id,
                correct_option_text='ZAHARLANGAN JAVOB',
                question_body='soxta savol',
            )
        self.assertEqual(res.status_code, 200, res.content)
        self.assertEqual(captured['correct_option_text'], self.correct(self.q).text)
        self.assertEqual(captured['question_body'], self.q.body)
        self.assertTrue(MistakeExplanationCache.objects.filter(question=self.q).exists())
        # Tushuntirish xatoni ikkinchi marta yozmaydi (yozish /answer/ ichida).
        self.assertEqual(RevisionItem.objects.get(profile=self.profile, question=self.q).times_wrong, 1)


class BlitzTests(_Base):
    def setUp(self):
        super().setUp()
        for i in range(4):
            make_question(subject=self.subject, body=f"Qo'shimcha {i}")

    def test_get_does_not_leak_is_correct(self):
        res = self.client.get(BLITZ_Q)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data['session_id'])
        self.assertNotIn('is_correct', set(_walk_keys(data['questions'])))

    def test_anonymous_get_has_no_session_and_answer_is_rejected(self):
        anon = APIClient()
        data = anon.get(BLITZ_Q).json()
        self.assertIsNone(data['session_id'])
        q = data['questions'][0]
        res = anon.post(BLITZ_A, {'session_id': 1, 'question_id': q['id'], 'choice_id': q['choices'][0]['id']},
                        format='json')
        self.assertIn(res.status_code, (401, 403))

    def test_answer_flow_and_ownership(self):
        data = self.client.get(BLITZ_Q).json()
        q = data['questions'][0]
        question = Question.objects.get(pk=q['id'])
        right = self.correct(question)

        res = self.client.post(BLITZ_A, {'session_id': data['session_id'], 'question_id': q['id'],
                                         'choice_id': right.id}, format='json')
        self.assertEqual(res.status_code, 200, res.content)
        self.assertTrue(res.json()['is_correct'])
        self.assertEqual(res.json()['correct_choice_id'], right.id)

        dup = self.client.post(BLITZ_A, {'session_id': data['session_id'], 'question_id': q['id'],
                                         'choice_id': self.wrong(question).id}, format='json')
        self.assertTrue(dup.json()['duplicate'])
        self.assertTrue(dup.json()['is_correct'])

        intruder = APIClient()
        intruder.force_authenticate(self.other)
        res = intruder.post(BLITZ_A, {'session_id': data['session_id'], 'question_id': q['id'],
                                      'choice_id': right.id}, format='json')
        self.assertEqual(res.status_code, 404)

    def test_blitz_session_cannot_be_used_on_sprint_endpoint(self):
        data = self.client.get(BLITZ_Q).json()
        q = data['questions'][0]
        res = self.client.post(SPRINT_A, {'session_id': data['session_id'], 'question_id': q['id'],
                                          'option_id': q['choices'][0]['id']}, format='json')
        self.assertEqual(res.status_code, 404)

    def test_blitz_wrong_answer_does_not_touch_revision(self):
        data = self.client.get(BLITZ_Q).json()
        q = data['questions'][0]
        wrong = AnswerOption.objects.filter(question_id=q['id'], is_correct=False).first()
        self.client.post(BLITZ_A, {'session_id': data['session_id'], 'question_id': q['id'],
                                   'choice_id': wrong.id}, format='json')
        self.assertFalse(RevisionItem.objects.exists())
