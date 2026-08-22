"""JSON test-taking API (tests_app/api.py) for the Next.js frontend — /api/tests/*.

Covers the core flow: start a test -> get a question -> answer it -> finish -> feedback
(pending, since AI grading runs off-thread) -> history shows the completed attempt.
Also checks correctness is never leaked before finish().
"""
from django.test import TestCase
from rest_framework_simplejwt.tokens import RefreshToken

from tests.factories import make_question, make_subject, make_test_set, make_user


class TestsApiFlowTests(TestCase):
    def setUp(self):
        self.user, self.profile = make_user('tests_api_student')
        self.subject = make_subject()
        self.q1 = make_question(subject=self.subject, body='2+2?', correct='4', wrong='5')
        self.q2 = make_question(subject=self.subject, body='3+3?', correct='6', wrong='7')
        self.test_set = make_test_set(subject=self.subject, questions=[self.q1, self.q2])
        access = str(RefreshToken.for_user(self.user).access_token)
        self.client.defaults['HTTP_AUTHORIZATION'] = f'Bearer {access}'

    def test_center_lists_the_test(self):
        response = self.client.get('/api/tests/')
        self.assertEqual(response.status_code, 200)
        titles = [t['title'] for t in response.json()['tests']]
        self.assertIn('Sinov testi', titles)

    def test_full_take_flow(self):
        start = self.client.post(f'/api/tests/{self.test_set.id}/start/')
        self.assertEqual(start.status_code, 200)
        attempt_id = start.json()['attempt_id']

        q = self.client.get(f'/api/tests/attempts/{attempt_id}/question/?q_idx=1')
        self.assertEqual(q.status_code, 200)
        q_data = q.json()
        self.assertEqual(q_data['question']['body'], '2+2?')
        # Correctness must never be present before finish().
        self.assertNotIn('is_correct', q_data)
        correct_choice_id = next(c['id'] for c in q_data['choices'] if c['text'] == '4')

        ans = self.client.post(f'/api/tests/attempts/{attempt_id}/answer/', {
            'question_id': self.q1.id, 'q_idx': 1, 'choice_id': correct_choice_id,
        }, content_type='application/json')
        self.assertEqual(ans.status_code, 200)
        self.assertEqual(ans.json()['selected_choice_id'], correct_choice_id)
        self.assertNotIn('is_correct', ans.json())

        finish = self.client.post(f'/api/tests/attempts/{attempt_id}/finish/')
        self.assertEqual(finish.status_code, 200)
        self.assertEqual(finish.json()['correct'], 1)  # only q1 was answered (correctly)

        feedback = self.client.get(f'/api/tests/attempts/{attempt_id}/feedback/')
        self.assertEqual(feedback.status_code, 200)
        self.assertIn(feedback.json()['status'], ('pending', 'ready'))

        history = self.client.get('/api/tests/history/')
        self.assertEqual(history.status_code, 200)
        self.assertEqual(len(history.json()['results']), 1)

    def test_question_requires_ownership(self):
        other_user, _ = make_user('someone_else')
        other_access = str(RefreshToken.for_user(other_user).access_token)
        start = self.client.post(f'/api/tests/{self.test_set.id}/start/')
        attempt_id = start.json()['attempt_id']

        response = self.client.get(
            f'/api/tests/attempts/{attempt_id}/question/?q_idx=1',
            HTTP_AUTHORIZATION=f'Bearer {other_access}',
        )
        self.assertEqual(response.status_code, 404)

    def test_leaderboard_returns_podium_and_rankings(self):
        response = self.client.get('/api/leaderboard/')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn('podium', data)
        self.assertIn('rankings', data)
