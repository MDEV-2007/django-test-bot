"""Feature 2 — DTM ball bashorati testlari."""
from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import ensure_profile_for_user
from analytics import prediction
from analytics.models import ScorePrediction
from tests_app.models import Attempt, AttemptAnswer, Question, Subject, Topic


class ScorePredictionTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user('bashorat', password='x')
        self.profile = ensure_profile_for_user(self.user)
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

        self.subject, _ = Subject.objects.get_or_create(slug='tarix', defaults={'name': 'Tarix'})
        self.topics = [
            Topic.objects.create(title=f'Mavzu {i}', slug=f'mavzu-{i}', subject=self.subject) for i in range(4)
        ]
        self.attempt = Attempt.objects.create(profile=self.profile, is_completed=True, score=70)

    def _answer(self, topic, correct, difficulty='medium'):
        q = Question.objects.create(
            body='Savol', topic=topic, subject=self.subject, difficulty=difficulty,
        )
        return AttemptAnswer.objects.create(
            attempt=self.attempt, question=q, is_correct=correct, answered_at=timezone.now(),
        )

    def test_not_ready_below_minimum_sample(self):
        for i in range(10):
            self._answer(self.topics[0], correct=True)

        data = prediction.predict(self.profile)

        self.assertFalse(data['ready'])
        self.assertIsNone(data['predicted_percent'])
        self.assertEqual(data['needed'], prediction.MIN_ANSWERS)

    def test_prediction_ready_and_weights_topics_equally(self):
        # 1-mavzu: 40 ta javob, hammasi to'g'ri. 2-mavzu: 20 ta javob, hammasi xato.
        # Mavzular TENG og'irlik bilan birlashadi → natija ~50%, 66% emas.
        for _ in range(40):
            self._answer(self.topics[0], correct=True)
        for _ in range(20):
            self._answer(self.topics[1], correct=False)

        data = prediction.predict(self.profile)

        self.assertTrue(data['ready'])
        self.assertEqual(data['sample_size'], 60)
        self.assertAlmostEqual(data['predicted_percent'], 50.0, delta=0.1)
        self.assertEqual(data['predicted_dtm'], round(50 / 100 * prediction.DTM_MAX_SCORE))

    def test_hard_questions_weigh_more_than_easy(self):
        """Qiyin savollarni to'g'ri yechish ballni ko'proq ko'taradi."""
        for _ in range(25):
            self._answer(self.topics[0], correct=True, difficulty='hard')
        for _ in range(25):
            self._answer(self.topics[0], correct=False, difficulty='easy')

        data = prediction.predict(self.profile)

        # 25*1.4 to'g'ri / (25*1.4 + 25*0.7) = 66.7%
        self.assertGreater(data['predicted_percent'], 60)

    def test_confidence_grows_with_sample_and_coverage(self):
        for topic in self.topics:
            for _ in range(15):
                self._answer(topic, correct=True)

        data = prediction.predict(self.profile)

        self.assertEqual(data['topics_covered'], 4)
        self.assertGreater(data['confidence'], 0)
        self.assertIn(data['confidence_label'], ('low', 'medium', 'high'))

    def test_api_saves_history_once_per_day(self):
        for _ in range(60):
            self._answer(self.topics[0], correct=True)

        first = self.client.get('/api/analytics/predicted-score/')
        self.client.get('/api/analytics/predicted-score/')

        self.assertEqual(first.status_code, 200)
        self.assertTrue(first.json()['ready'])
        self.assertEqual(ScorePrediction.objects.filter(profile=self.profile).count(), 1)

    def test_history_endpoint_returns_points(self):
        for _ in range(60):
            self._answer(self.topics[0], correct=True)
        self.client.get('/api/analytics/predicted-score/')

        data = self.client.get('/api/analytics/score-history/').json()

        self.assertEqual(len(data['history']), 1)
        self.assertIn('predicted_dtm', data['history'][0])

    def test_tagging_status_requires_admin(self):
        response = self.client.get('/api/analytics/tagging-status/')

        self.assertEqual(response.status_code, 403)
