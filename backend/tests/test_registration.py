"""Ro'yxatdan o'tish validatsiyasi (API).

Haqiqiy bug tarixi: ilgari view `request.POST` ni to'g'ridan-to'g'ri o'qir, na trim, na
validatsiya bor edi — faqat bo'sh joydan iborat login/parol qabul qilinardi va hech kim
qayta kira olmaydigan hisob yaratilardi.

Django shablonlari olib tashlangach, ro'yxatdan o'tish faqat `/api/auth/register/`
orqali ketadi; shuning uchun bu testlar ham API kontraktini tekshiradi.
"""
from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient


class RegistrationValidationTests(TestCase):
    url = '/api/auth/register/'

    VALID = {
        'username': 'yangi_user',
        'first_name': 'Ali',
        'last_name': 'Valiyev',
        'password': 'Kuchli-Parol-2026',
    }

    def setUp(self):
        self.client = APIClient()

    def _post(self, **overrides):
        data = dict(self.VALID, **overrides)
        return self.client.post(self.url, data, format='json')

    def test_valid_registration_creates_a_user(self):
        response = self._post()

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()['access'])  # darhol tizimga kiritiladi
        user = User.objects.get(username='yangi_user')
        self.assertTrue(user.check_password('Kuchli-Parol-2026'))

    def test_whitespace_only_username_is_rejected(self):
        response = self._post(username='   ')

        self.assertEqual(response.status_code, 400)
        self.assertIn('maydonlarni', response.json()['error'])
        self.assertFalse(User.objects.exists())

    def test_whitespace_only_password_is_rejected(self):
        self._post(username='space_pw', password='     ')

        self.assertFalse(User.objects.filter(username='space_pw').exists())

    def test_username_is_stripped_not_stored_with_spaces(self):
        self._post(username='  trimmed  ', password='Kuchli-Parol-2026')

        self.assertTrue(User.objects.filter(username='trimmed').exists())

    def test_username_with_internal_space_is_rejected(self):
        self._post(username='ali valiyev')

        self.assertFalse(User.objects.filter(username='ali valiyev').exists())

    def test_too_short_username_is_rejected(self):
        self._post(username='ab')

        self.assertFalse(User.objects.filter(username='ab').exists())

    def test_weak_password_is_rejected_by_validators(self):
        self._post(username='weakpw', password='1234')

        self.assertFalse(User.objects.filter(username='weakpw').exists())

    def test_duplicate_username_is_rejected_case_insensitively(self):
        User.objects.create_user(username='existing', password='x')

        response = self._post(username='Existing')

        self.assertEqual(response.status_code, 400)
        self.assertIn('band', response.json()['error'])
        self.assertEqual(User.objects.filter(username__iexact='existing').count(), 1)
