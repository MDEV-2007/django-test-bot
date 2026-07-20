"""Template hygiene.

Regression guard for a real bug: a Django `{# ... #}` comment is **single-line only**.
Written across two lines the lexer never recognises it, so the comment text is rendered
to the page as visible body text. Status-code and context assertions cannot catch that —
only inspecting the rendered HTML can.
"""
import pathlib

from django.test import TestCase

from .factories import make_subject, make_user

PAGES = [
    '/', '/tests/', '/tests/revision/', '/tests/history/', '/analytics/',
    '/shop/', '/shop/inventory/', '/leaderboard/', '/premium/',
    '/accounts/profile/', '/battles/', '/learning/',
]

TEMPLATE_DIR = pathlib.Path(__file__).resolve().parent.parent / 'templates'


class RenderedOutputTests(TestCase):
    def setUp(self):
        make_subject()
        self.user, self.profile = make_user()
        self.client.force_login(self.user)

    def test_no_template_syntax_leaks_into_rendered_pages(self):
        """No page may contain raw template syntax — that means something was written in
        a form Django did not parse (e.g. a multi-line {# #} comment)."""
        for url in PAGES:
            with self.subTest(url=url):
                html = self.client.get(url).content.decode()
                for token in ('{#', '#}', '{% comment %}', '{{ ', '{%'):
                    self.assertNotIn(
                        token, html,
                        f"{url} renders raw template syntax {token!r} — "
                        f"likely an unparsed tag or a multi-line {{# #}} comment",
                    )


class TemplateSourceTests(TestCase):
    """Catches the mistake at the source, across every template — including ones no test
    currently renders."""

    def test_no_multiline_django_comments(self):
        offenders = []
        for path in sorted(TEMPLATE_DIR.rglob('*.html')):
            for lineno, line in enumerate(path.read_text(encoding='utf-8', errors='ignore').splitlines(), 1):
                if '{#' in line and '#}' not in line.split('{#', 1)[1]:
                    rel = path.relative_to(TEMPLATE_DIR.parent)
                    offenders.append(f"{rel}:{lineno}")
        self.assertEqual(
            offenders, [],
            "Django {# #} comments must open and close on the SAME line — otherwise the "
            "text renders as visible page content. Use {% comment %}…{% endcomment %} "
            "for multi-line. Offenders: " + ', '.join(offenders),
        )
