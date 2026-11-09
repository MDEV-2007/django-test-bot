from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from accounts.models import ensure_profile_for_user
from tests_app.models import Subject, Question, AnswerOption
from growth.models import ArenaGhostReplay


class ArenaResilienceTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='test_resilience_user',
            password='Password123!',
            first_name='Ali'
        )
        self.profile = ensure_profile_for_user(self.user)
        self.profile.avatar_url = None  # Explicitly null to test Postgres NOT NULL safety
        self.profile.save()

        self.subject, _ = Subject.objects.get_or_create(slug='tarix', defaults={'name': 'Tarix'})
        self.q = Question.objects.create(
            subject=self.subject,
            question_type='single_choice',
            body='Tarixiy sinov savoli?'
        )
        AnswerOption.objects.create(question=self.q, text='Variant A', is_correct=True)
        AnswerOption.objects.create(question=self.q, text='Variant B', is_correct=False)

    def test_public_features_with_invalid_or_expired_jwt(self):
        # Audit: when frontend sends an expired token, public features must not throw 401
        self.client.credentials(HTTP_AUTHORIZATION='Bearer expired_or_garbage_token_xyz')
        res = self.client.get('/api/panel/features/public/')
        self.assertEqual(res.status_code, 200)

        res2 = self.client.get('/api/v1/system/feature-flags/')
        self.assertEqual(res2.status_code, 200)

    def test_arena_matchmake_anonymous_and_authenticated(self):
        # 1. Anonymous matchmake
        res_anon = self.client.post('/api/growth/arena/matchmake/', {'subject_slug': 'tarix'}, format='json')
        self.assertEqual(res_anon.status_code, 200)
        self.assertTrue(res_anon.data.get('ok'))
        self.assertGreaterEqual(len(res_anon.data.get('questions', [])), 1)

        # 2. Authenticated matchmake
        self.client.force_authenticate(user=self.user)
        res_auth = self.client.post('/api/growth/arena/matchmake/', {'subject_slug': 'tarix'}, format='json')
        self.assertEqual(res_auth.status_code, 200)
        self.assertTrue(res_auth.data.get('ok'))
        self.assertIsNotNone(res_auth.data.get('opponent'))

    def test_record_replay_with_null_avatar(self):
        self.client.force_authenticate(user=self.user)
        payload = {
            'moves_log': [
                {'question_id': self.q.id, 'selected_option_id': 1, 'is_correct': True, 'time_taken_ms': 2400, 'score': 10}
            ],
            'question_ids': [self.q.id],
        }
        res = self.client.post('/api/growth/arena/record-replay/', payload, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data.get('ok'))
        replay_id = res.data.get('replay_id')
        self.assertIsNotNone(replay_id)

        replay = ArenaGhostReplay.objects.get(pk=replay_id)
        self.assertIsNotNone(replay.avatar_url)
        self.assertEqual(replay.player_name, 'Ali')
