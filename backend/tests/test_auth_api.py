"""JWT auth API for the Next.js frontend (accounts/api.py) — /api/auth/*.

Covers the basic contract each frontend call depends on: login issues a usable token pair,
wrong credentials don't, /me/ requires that token, and refresh actually rotates it.
"""
from django.contrib.auth.models import User
from django.test import TestCase


class AuthApiTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='api_user', password='Kuchli-Parol-2026')

    def test_login_returns_access_and_refresh_tokens(self):
        response = self.client.post('/api/auth/login/', {
            'username': 'api_user', 'password': 'Kuchli-Parol-2026',
        }, content_type='application/json')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn('access', data)
        self.assertIn('refresh', data)
        self.assertEqual(data['user']['username'], 'api_user')

    def test_wrong_password_is_rejected(self):
        response = self.client.post('/api/auth/login/', {
            'username': 'api_user', 'password': 'wrong',
        }, content_type='application/json')
        self.assertEqual(response.status_code, 401)
        self.assertNotIn('access', response.json())

    def test_me_requires_a_valid_token(self):
        response = self.client.get('/api/auth/me/')
        self.assertEqual(response.status_code, 401)

    def test_me_returns_profile_with_a_valid_token(self):
        login = self.client.post('/api/auth/login/', {
            'username': 'api_user', 'password': 'Kuchli-Parol-2026',
        }, content_type='application/json').json()

        response = self.client.get('/api/auth/me/', HTTP_AUTHORIZATION=f"Bearer {login['access']}")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['username'], 'api_user')

    def test_refresh_issues_a_new_access_token(self):
        login = self.client.post('/api/auth/login/', {
            'username': 'api_user', 'password': 'Kuchli-Parol-2026',
        }, content_type='application/json').json()

        response = self.client.post('/api/auth/refresh/', {'refresh': login['refresh']},
                                     content_type='application/json')
        self.assertEqual(response.status_code, 200)
        self.assertIn('access', response.json())

    def test_refresh_with_a_deleted_users_token_is_401_not_500(self):
        # Real crash found while smoke-testing the Next.js frontend: a refresh token minted
        # for a user who is later deleted (stale browser localStorage, deleted test account,
        # etc.) made simplejwt's TokenRefreshView raise an uncaught User.DoesNotExist -> 500.
        login = self.client.post('/api/auth/login/', {
            'username': 'api_user', 'password': 'Kuchli-Parol-2026',
        }, content_type='application/json').json()
        self.user.delete()

        response = self.client.post('/api/auth/refresh/', {'refresh': login['refresh']},
                                     content_type='application/json')
        self.assertEqual(response.status_code, 401)

    def test_register_creates_a_user_and_returns_tokens(self):
        response = self.client.post('/api/auth/register/', {
            'username': 'yangi_api_user', 'first_name': 'Ali', 'password': 'Kuchli-Parol-2026',
        }, content_type='application/json')
        self.assertEqual(response.status_code, 200)
        self.assertIn('access', response.json())
        self.assertTrue(User.objects.filter(username='yangi_api_user').exists())
