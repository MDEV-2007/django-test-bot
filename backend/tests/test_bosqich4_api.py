"""JSON API for Bosqich 4: Learning center, mini-games (session-free redesign), Analytics,
Profile/Onboarding — see accounts/api.py for the JWT-API pattern.
"""
from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework_simplejwt.tokens import RefreshToken

from games.models import HistoricalCharacter, HistoricalEvent, MapChallenge
from learning.models import Lesson, Topic
from tests.factories import make_subject, make_user


def _auth_client(client, user):
    access = str(RefreshToken.for_user(user).access_token)
    client.defaults['HTTP_AUTHORIZATION'] = f'Bearer {access}'
    return client


class LearningApiTests(TestCase):
    def setUp(self):
        self.user, self.profile = make_user('learning_student')
        self.subject = make_subject()
        self.topic = Topic.objects.create(title='Mavzu', slug='mavzu', subject=self.subject, category='history')
        self.lesson = Lesson.objects.create(topic=self.topic, title='Dars 1', content='<p>Matn</p>', is_published=True)
        _auth_client(self.client, self.user)

    def test_center_returns_selected_lesson(self):
        response = self.client.get('/api/learning/')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['lesson']['title'], 'Dars 1')

    def test_toggle_bookmark(self):
        on = self.client.post(f'/api/learning/toggle-bookmark/{self.lesson.id}/')
        self.assertTrue(on.json()['bookmarked'])
        off = self.client.post(f'/api/learning/toggle-bookmark/{self.lesson.id}/')
        self.assertFalse(off.json()['bookmarked'])


class GamesApiTests(TestCase):
    def setUp(self):
        self.user, self.profile = make_user('games_student')
        self.subject = make_subject()
        for year in (1300, 1400, 1500, 1600):
            HistoricalEvent.objects.create(subject=self.subject, title=f'Voqea {year}', year=year, era='medieval')
        self.challenge = MapChallenge.objects.create(
            subject=self.subject, title='Test', description='...', correct_location='Samarqand',
            options=['Samarqand', 'Buxoro'],
        )
        self.character = HistoricalCharacter.objects.create(
            subject=self.subject, name='Amir Temur', clue_1='a', clue_2='b', clue_3='c', difficulty='easy',
        )
        _auth_client(self.client, self.user)

    def test_timeline_correct_order(self):
        get = self.client.get('/api/games/timeline/')
        event_ids = sorted(e['id'] for e in get.json()['events'])
        # sorted by id happens to also be sorted by year here (created in year order)
        post = self.client.post('/api/games/timeline/', {'event_ids': event_ids}, content_type='application/json')
        self.assertTrue(post.json()['correct'])
        self.profile.refresh_from_db()
        self.assertEqual(self.profile.xp, 100)

    def test_timeline_wrong_order_returns_correct_order_not_xp(self):
        get = self.client.get('/api/games/timeline/')
        event_ids = sorted((e['id'] for e in get.json()['events']), reverse=True)
        post = self.client.post('/api/games/timeline/', {'event_ids': event_ids}, content_type='application/json')
        self.assertFalse(post.json()['correct'])
        self.assertIn('correct_order', post.json())

    def test_map_challenge_correct_and_wrong(self):
        correct = self.client.post('/api/games/map/', {
            'challenge_id': self.challenge.id, 'region': 'Samarqand',
        }, content_type='application/json')
        self.assertTrue(correct.json()['correct'])

        wrong = self.client.post('/api/games/map/', {
            'challenge_id': self.challenge.id, 'region': 'Buxoro',
        }, content_type='application/json')
        self.assertFalse(wrong.json()['correct'])
        self.assertEqual(wrong.json()['correct_location'], 'Samarqand')

    def test_character_guess(self):
        response = self.client.post('/api/games/character/', {
            'character_id': self.character.id, 'guess': 'Amir Temur',
        }, content_type='application/json')
        self.assertTrue(response.json()['correct'])


class AnalyticsAndProfileApiTests(TestCase):
    def setUp(self):
        self.user, self.profile = make_user('analytics_student')
        _auth_client(self.client, self.user)

    def test_analytics_dashboard_shape(self):
        response = self.client.get('/api/analytics/')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        for key in ('accuracy', 'daily', 'monthly', 'mastery', 'recent'):
            self.assertIn(key, data)

    def test_profile_returns_referral_code_and_stats(self):
        response = self.client.get('/api/auth/profile/')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data['referral_code'])
        self.assertIn('referral_count', data['referral_stats'])

    def test_onboarding_complete(self):
        response = self.client.post('/api/auth/onboarding-complete/')
        self.assertEqual(response.status_code, 200)
        self.profile.refresh_from_db()
        self.assertTrue(self.profile.has_seen_onboarding)
