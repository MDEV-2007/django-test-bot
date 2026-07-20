"""Custom error pages.

Django only uses templates/404.html, 500.html and 403.html when DEBUG is False, so a
broken one is invisible in development and only shows up in production — exactly when it
is most needed. These tests render them the way Django will.
"""
from django.template.loader import render_to_string
from django.test import TestCase, override_settings

from .factories import make_user


@override_settings(DEBUG=False, ALLOWED_HOSTS=['testserver', 'localhost'])
class NotFoundPageTests(TestCase):
    def test_unknown_url_returns_404_with_the_custom_template(self):
        response = self.client.get('/bunday-sahifa-yoq/')
        self.assertEqual(response.status_code, 404)
        self.assertTemplateUsed(response, '404.html')

    def test_404_page_is_branded_and_offers_a_way_out(self):
        html = self.client.get('/yoq/').content.decode()
        self.assertIn('404', html)
        self.assertIn("Bu meva shoxda yo'q ekan", html)
        # Must give the visitor somewhere to go, not just a dead end.
        for link in ('/tests/', '/learning/', '/leaderboard/'):
            self.assertIn(link, html)

    def test_404_works_for_logged_in_users_too(self):
        user, _ = make_user(username='lost_student')
        self.client.force_login(user)
        response = self.client.get('/yana-yoq/')
        self.assertEqual(response.status_code, 404)
        self.assertTemplateUsed(response, '404.html')

    def test_404_does_not_leak_raw_template_syntax(self):
        html = self.client.get('/yoq/').content.decode()
        for token in ('{#', '#}', '{%', '{{ '):
            self.assertNotIn(token, html)


class ServerErrorPageTests(TestCase):
    """500.html is rendered by Django with an EMPTY context — no context processors and
    no `request`. Rendering it with nothing at all proves it can't cascade into a second
    failure while handling the first."""

    def test_500_renders_with_no_context_at_all(self):
        html = render_to_string('500.html')
        self.assertIn('500', html)
        self.assertIn('Serverda kutilmagan xatolik', html)

    def test_500_does_not_extend_base(self):
        # Inheriting base.html would depend on the machinery that may have just failed.
        from pathlib import Path
        from django.conf import settings
        source = (Path(settings.BASE_DIR) / 'templates' / '500.html').read_text(encoding='utf-8')
        self.assertNotIn("{% extends", source)


class OfflineStateTests(TestCase):
    """A lost connection must read as a clear message, not as buttons that silently do
    nothing. The overlay ships in base.html, so every page inherits it."""

    def setUp(self):
        self.user, _ = make_user(username='offline_student')
        self.client.force_login(self.user)

    def test_offline_overlay_is_present_on_every_page(self):
        for url in ('/', '/tests/', '/shop/', '/accounts/profile/'):
            with self.subTest(url=url):
                html = self.client.get(url).content.decode()
                self.assertIn('id="offline-overlay"', html)
                self.assertIn("Internet aloqasi yo'q", html)

    def test_offline_overlay_offers_a_retry(self):
        html = self.client.get('/').content.decode()
        self.assertIn('id="offline-retry"', html)
        self.assertIn('Qayta urinish', html)

    def test_weak_connection_toast_is_present(self):
        html = self.client.get('/').content.decode()
        self.assertIn('id="net-toast"', html)
        self.assertIn('Aloqa yaxshi emas', html)

    def test_offline_state_is_wired_to_browser_events(self):
        """Without these listeners the markup would never be shown."""
        html = self.client.get('/').content.decode()
        for hook in ("addEventListener('offline'", "addEventListener('online'",
                     'htmx:sendError', 'navigator.onLine'):
            self.assertIn(hook, html)


class ForbiddenPageTests(TestCase):
    def test_403_renders(self):
        user, _ = make_user(username='no_access')
        self.client.force_login(user)
        html = render_to_string('403.html', request=self.client.request().wsgi_request)
        self.assertIn('403', html)
        self.assertIn("ruxsatingiz yo'q", html)
