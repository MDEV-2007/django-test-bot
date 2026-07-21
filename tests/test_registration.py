"""Registration validation.

A real bug: the view read request.POST straight through with no stripping or validation,
so a username and password made of only spaces were accepted. The account was created with
whitespace credentials that nobody could ever type to log in again.
"""
from django.contrib.auth.models import User
from django.test import TestCase


class RegistrationValidationTests(TestCase):
    url = '/accounts/register/'

    VALID = {
        'username': 'yangi_user',
        'first_name': 'Ali',
        'last_name': 'Valiyev',
        'password': 'Kuchli-Parol-2026',
    }

    def _post(self, **overrides):
        data = dict(self.VALID, **overrides)
        return self.client.post(self.url, data)

    def test_valid_registration_creates_a_user(self):
        response = self._post()
        self.assertEqual(response.status_code, 302)  # logged in and redirected
        user = User.objects.get(username='yangi_user')
        self.assertTrue(user.check_password('Kuchli-Parol-2026'))

    def test_whitespace_only_username_is_rejected(self):
        response = self._post(username='   ')
        self.assertEqual(response.status_code, 200)  # re-rendered with an error
        self.assertFalse(User.objects.exclude(username='yangi_user').exists())
        # Django auto-escapes the apostrophe in "to'ldiring", so match the plain part.
        self.assertContains(response, 'maydonlarni')

    def test_whitespace_only_password_is_rejected(self):
        self._post(username='space_pw', password='     ')
        self.assertFalse(User.objects.filter(username='space_pw').exists())

    def test_username_is_stripped_not_stored_with_spaces(self):
        self._post(username='  trimmed  ', password='Kuchli-Parol-2026')
        # Stored trimmed, and inner spaces would have been rejected anyway.
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
        self.assertContains(response, 'band')
        self.assertEqual(User.objects.filter(username__iexact='existing').count(), 1)

    def test_form_repopulates_on_error(self):
        response = self._post(username='ab', first_name='Sardor')
        # The valid fields come back so the user doesn't retype them.
        self.assertContains(response, 'value="Sardor"')
        self.assertContains(response, 'value="ab"')
