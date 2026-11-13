"""SOS: posting the question you're stuck on to the community while solving
(test / blitz / stress / sprint). The server builds the poll from the stored question,
so the client never needs — or gets — the answer key mid-test."""
from datetime import timedelta

from django.core.cache import cache
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from learning.models import CommunityPost

from .factories import make_question, make_subject, make_user

URL = '/api/learning/feed/sos/'


class SosFromQuestionTests(TestCase):
    def setUp(self):
        cache.clear()
        self.subject = make_subject()
        self.question = make_question(subject=self.subject, body='<p>Temur qachon tug\'ilgan?</p>',
                                      correct='1336', wrong='1405')
        self.user, _ = make_user('sos_author')
        self.c = APIClient()
        self.c.force_authenticate(self.user)

    def post(self, **data):
        body = {'question_id': self.question.id, 'source': 'test'}
        body.update(data)
        return self.c.post(URL, body, format='json')

    def test_builds_poll_from_server_question(self):
        res = self.post(source='stress')
        self.assertEqual(res.status_code, 201)
        post = CommunityPost.objects.get(author=self.user)
        self.assertEqual(post.post_type, 'sos_question')
        self.assertEqual(post.poll_data['question_text'], "Temur qachon tug'ilgan?")
        self.assertEqual(post.poll_data['options'], ['1336', '1405'])
        self.assertEqual(post.poll_data['correct_option'], 'A')
        self.assertEqual(post.poll_data['votes'], {'A': 0, 'B': 0})
        self.assertEqual(post.poll_data['source'], 'stress')

    def test_author_does_not_see_answer_while_test_may_be_running(self):
        res = self.post()
        poll = res.json()['post']['poll_data']
        self.assertNotIn('correct_option', poll)
        self.assertNotIn('explanation', poll)

    def test_author_cannot_vote_own_live_sos(self):
        post_id = self.post().json()['post']['id']
        res = self.c.post(f'/api/learning/feed/{post_id}/vote-poll/', {'selected_option': 'A'}, format='json')
        self.assertEqual(res.status_code, 403)
        self.assertNotIn('correct_option', res.json())

    def test_author_sees_answer_after_reveal_time(self):
        self.post()
        post = CommunityPost.objects.get(author=self.user)
        post.poll_data['author_reveal_at'] = (timezone.now() - timedelta(minutes=1)).isoformat()
        post.save(update_fields=['poll_data'])
        self.assertEqual(post.to_dict(current_user=self.user)['poll_data']['correct_option'], 'A')

    def test_other_students_get_answer_only_after_voting(self):
        post_id = self.post().json()['post']['id']
        other, _ = make_user('helper')
        c2 = APIClient()
        c2.force_authenticate(other)
        post = CommunityPost.objects.get(pk=post_id)
        self.assertNotIn('correct_option', post.to_dict(current_user=other)['poll_data'])
        res = c2.post(f'/api/learning/feed/{post_id}/vote-poll/', {'selected_option': 'A'}, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json()['is_correct'])

    def test_same_question_once_per_day(self):
        self.assertEqual(self.post().status_code, 201)
        self.assertEqual(self.post().status_code, 409)

    def test_daily_limit(self):
        for i in range(5):
            q = make_question(subject=self.subject, body=f'savol {i}')
            self.assertEqual(self.post(question_id=q.id).status_code, 201)
        q = make_question(subject=self.subject, body='oltinchi')
        self.assertEqual(self.post(question_id=q.id).status_code, 429)

    def test_rejects_bad_input(self):
        self.assertEqual(self.post(source='mock').status_code, 400)
        self.assertEqual(self.post(question_id='x').status_code, 400)
        self.assertEqual(self.post(question_id=999999).status_code, 404)
        self.question.question_type = 'open_written'
        self.question.save()
        self.assertEqual(self.post().status_code, 400)

    def test_requires_login(self):
        res = APIClient().post(URL, {'question_id': self.question.id, 'source': 'test'}, format='json')
        self.assertIn(res.status_code, (401, 403))
