"""3-kun: Revision, mastery va radar — haqiqiy ma'lumotdan, soxta qiymatlarsiz.

- Revision dastasi javobdan oldin izoh (u ko'pincha to'g'ri javobni aytadi) bermaydi;
- xato javob bitta RevisionItem yaratadi (takror xato — o'sha yozuvda times_wrong++);
- to'g'ri qayta yechish uni "o'zlashtirilgan" qiladi;
- tugallanmagan attempt mastery/radar'ga ta'sir qilmaydi;
- radar: yangi o'quvchida soxta qiymat yo'q (None), aniqlik 100% dan oshmaydi,
  proxy o'qlar belgilangan, profil radari va analitika bitta manbadan.
"""
from django.core.cache import cache
from django.test import TestCase
from rest_framework.test import APIClient

from analytics.services import compute_mastery, compute_skill_radar
from tests_app.models import RevisionItem

from .factories import make_attempt, make_question, make_subject, make_test_set, make_user


class _Base(TestCase):
    def setUp(self):
        cache.clear()
        self.user, self.profile = make_user('oquvchi')
        self.subject = make_subject()
        self.questions = [make_question(subject=self.subject, body=f'S{i}') for i in range(4)]
        self.test_set = make_test_set(subject=self.subject, questions=self.questions)
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def finish(self, correct_ids=(), finish=True):
        attempt = make_attempt(self.profile, self.test_set, self.questions)
        for answer in attempt.answers.select_related('question'):
            option = answer.question.choices.filter(is_correct=answer.question_id in correct_ids).first()
            self.client.post(f'/api/tests/attempts/{attempt.id}/answer/', {
                'question_id': answer.question_id, 'q_idx': 1, 'choice_id': option.id, 'time_spent_sec': 30,
            }, format='json')
        if finish:
            self.client.post(f'/api/tests/attempts/{attempt.id}/finish/')
        return attempt


class RevisionTests(_Base):
    def test_deck_has_no_explanation_before_answer(self):
        self.questions[0].explanation = "To'g'ri javob: 4"
        self.questions[0].save()
        self.finish()
        deck = self.client.get('/api/tests/revision/').json()['deck']
        self.assertTrue(deck)
        for card in deck:
            self.assertNotIn('explanation', card)
            self.assertNotIn('is_correct', str(card.get('choices')))

    def test_check_returns_explanation_after_answer(self):
        self.questions[0].explanation = "To'g'ri javob: 4"
        self.questions[0].save()
        self.finish()
        item = RevisionItem.objects.get(profile=self.profile, question=self.questions[0])
        wrong = self.questions[0].choices.get(is_correct=False)
        res = self.client.post(f'/api/tests/revision/{item.id}/check/', {'choice_id': wrong.id}, format='json').json()
        self.assertFalse(res['correct'])
        self.assertEqual(res['explanation'], "To'g'ri javob: 4")

    def test_repeat_mistake_does_not_duplicate_item(self):
        self.finish()
        self.finish()
        items = RevisionItem.objects.filter(profile=self.profile, question=self.questions[0])
        self.assertEqual(items.count(), 1)
        self.assertEqual(items.get().times_wrong, 2)

    def test_correct_retry_masters_item(self):
        self.finish()
        self.finish(correct_ids={q.id for q in self.questions})
        self.assertFalse(RevisionItem.objects.filter(profile=self.profile, mastered=False).exists())


class MasteryRadarTests(_Base):
    def test_new_student_radar_has_no_fabricated_values(self):
        radar = compute_skill_radar(self.profile)
        self.assertFalse(radar['has_data'])
        for key in ('subject_mastery', 'accuracy', 'speed', 'writing', 'logic'):
            self.assertIsNone(radar['axes'][key]['value'], key)

    def test_unfinished_attempt_does_not_count(self):
        self.finish(correct_ids={q.id for q in self.questions}, finish=False)
        self.assertEqual(compute_mastery(self.profile)['subjects'], [])
        self.assertFalse(compute_skill_radar(self.profile)['has_data'])

    def test_radar_reflects_real_results_and_marks_proxies(self):
        self.finish(correct_ids={self.questions[0].id})  # 1/4 to'g'ri
        radar = compute_skill_radar(self.profile)
        self.assertEqual(radar['axes']['accuracy']['value'], 25)
        self.assertEqual(radar['axes']['subject_mastery']['value'], 25)
        self.assertIsNotNone(radar['axes']['speed']['value'])
        self.assertLessEqual(radar['axes']['speed']['value'], 100)
        self.assertTrue(radar['axes']['logic']['is_proxy'])
        self.assertTrue(radar['axes']['consistency']['is_proxy'])
        self.assertFalse(radar['axes']['accuracy']['is_proxy'])
        self.assertIsNone(radar['axes']['writing']['value'])

    def test_profile_radar_and_analytics_share_one_source(self):
        self.finish(correct_ids={self.questions[0].id, self.questions[1].id})
        analytics = self.client.get('/api/analytics/').json()['skill_radar']
        legacy = self.client.get('/api/v1/system/profile/radar/').json()
        self.assertEqual(legacy['accuracy'], analytics['axes']['accuracy']['value'])
        self.assertEqual(legacy['overall_power'], analytics['overall'])
        self.assertLessEqual(legacy['accuracy'], 100)
