"""Smoke tests: every student-facing page must render, and login-required pages must
actually require a login. Catches broken templates, bad {% url %} names and view errors."""
from django.test import TestCase

from .factories import make_subject, make_user

STUDENT_PAGES = [
    '/', '/tests/', '/tests/revision/', '/tests/history/', '/analytics/',
    '/shop/', '/shop/inventory/', '/leaderboard/', '/premium/',
    '/accounts/profile/', '/battles/', '/learning/',
]

PANEL_PAGES = [
    '/panel/', '/panel/users/', '/panel/shop/', '/panel/shop/create/',
    '/panel/subjects/', '/panel/tests/', '/panel/lessons/', '/panel/results/',
    '/panel/payments/', '/panel/settings/', '/panel/audit/',
]


class StudentPageTests(TestCase):
    def setUp(self):
        make_subject()
        self.user, self.profile = make_user()
        self.client.force_login(self.user)

    def test_all_student_pages_render(self):
        for url in STUDENT_PAGES:
            with self.subTest(url=url):
                self.assertEqual(self.client.get(url).status_code, 200)


class AuthenticationRequiredTests(TestCase):
    def test_pages_redirect_anonymous_users_to_login(self):
        for url in STUDENT_PAGES:
            with self.subTest(url=url):
                response = self.client.get(url)
                self.assertEqual(response.status_code, 302)
                self.assertIn('/login', response['Location'])


class PanelAccessTests(TestCase):
    def setUp(self):
        make_subject()
        self.admin, _ = make_user(username='boss', role='superadmin')
        self.student, _ = make_user(username='pupil')

    def test_superadmin_can_open_every_panel_page(self):
        self.client.force_login(self.admin)
        for url in PANEL_PAGES:
            with self.subTest(url=url):
                self.assertEqual(self.client.get(url).status_code, 200)

    def test_student_is_blocked_from_the_panel(self):
        self.client.force_login(self.student)
        response = self.client.get('/panel/')
        self.assertNotEqual(response.status_code, 200,
                            "a student must never reach the super admin panel")
