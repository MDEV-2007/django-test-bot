"""Xatolar ustida ishlash: xato javob dastaga tushadi, to'g'ri takror uni "o'zlashtirilgan"
qiladi va to'g'ri javob mijozga oldindan hech qachon oshkor qilinmaydi.

Django shablonlari olib tashlangach, bu oqim faqat API orqali ketadi
(`/api/tests/...`), shuning uchun testlar ham API kontraktini tekshiradi.
"""
from django.test import TestCase
from rest_framework.test import APIClient

from tests_app.models import RevisionItem

from .factories import (make_attempt, make_question, make_subject, make_test_set, make_user)


class RevisionDeckTests(TestCase):
    def setUp(self):
        self.user, self.profile = make_user()
        self.subject = make_subject()
        self.questions = [make_question(subject=self.subject, body=f"Savol {i}") for i in range(3)]
        self.test_set = make_test_set(subject=self.subject, questions=self.questions)
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def _finish_attempt(self, answer_correctly):
        attempt = make_attempt(self.profile, self.test_set, self.questions)
        for answer in attempt.answers.select_related('question'):
            option = answer.question.choices.filter(is_correct=answer_correctly).first()
            self.client.post(f'/api/tests/attempts/{attempt.id}/answer/', {
                'question_id': answer.question_id, 'q_idx': 1, 'choice_id': option.id,
            }, format='json')
        self.client.post(f'/api/tests/attempts/{attempt.id}/finish/')
        return attempt

    def test_wrong_answers_are_added_to_the_deck(self):
        self._finish_attempt(answer_correctly=False)

        self.assertEqual(
            RevisionItem.objects.filter(profile=self.profile, mastered=False).count(),
            len(self.questions),
        )

    def test_correct_answers_do_not_enter_the_deck(self):
        self._finish_attempt(answer_correctly=True)

        self.assertEqual(RevisionItem.objects.filter(profile=self.profile).count(), 0)

    def test_correct_retry_masters_and_removes_the_item(self):
        self._finish_attempt(answer_correctly=False)
        item = RevisionItem.objects.filter(profile=self.profile, mastered=False).first()
        correct = item.question.choices.get(is_correct=True)

        response = self.client.post(f'/api/tests/revision/{item.id}/check/',
                                    {'choice_id': correct.id}, format='json')
        item.refresh_from_db()

        self.assertTrue(response.json()['correct'])
        self.assertTrue(item.mastered)

    def test_wrong_retry_keeps_the_item_in_the_deck(self):
        self._finish_attempt(answer_correctly=False)
        item = RevisionItem.objects.filter(profile=self.profile, mastered=False).first()
        wrong = item.question.choices.filter(is_correct=False).first()

        response = self.client.post(f'/api/tests/revision/{item.id}/check/',
                                    {'choice_id': wrong.id}, format='json')
        item.refresh_from_db()

        self.assertFalse(response.json()['correct'])
        self.assertFalse(item.mastered)

    def test_deck_payload_does_not_leak_which_choice_is_correct(self):
        self._finish_attempt(answer_correctly=False)

        deck = self.client.get('/api/tests/revision/').json()['deck']

        self.assertTrue(deck, 'deck should not be empty')
        for card in deck:
            for choice in card['choices']:
                self.assertNotIn('is_correct', choice)

    def test_cannot_grade_another_users_revision_item(self):
        self._finish_attempt(answer_correctly=False)
        item = RevisionItem.objects.filter(profile=self.profile).first()

        other_user, _ = make_user(username='intruder')
        other = APIClient()
        other.force_authenticate(user=other_user)
        response = other.post(f'/api/tests/revision/{item.id}/check/',
                              {'choice_id': 1}, format='json')

        self.assertEqual(response.status_code, 404)
