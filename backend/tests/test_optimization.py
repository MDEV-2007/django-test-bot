"""Query-count guards for the hottest pages.

These lock in the caching/select_related work: a future change that reintroduces an N+1 or
an uncached per-request DB read will trip the assertion instead of silently slowing the
site down.
"""
from django.contrib.auth.models import User
from django.core.cache import cache
from django.test import TestCase
from django.test.utils import CaptureQueriesContext
from django.db import connection

from panel.models import SiteSettings

from .factories import make_subject, make_user


class SiteSettingsCacheTests(TestCase):
    def setUp(self):
        cache.clear()

    def test_load_hits_the_db_once_then_serves_from_cache(self):
        with CaptureQueriesContext(connection) as ctx:
            SiteSettings.load()
        first = len(ctx)
        with CaptureQueriesContext(connection) as ctx:
            SiteSettings.load()
            SiteSettings.load()
        self.assertGreaterEqual(first, 1)
        self.assertEqual(len(ctx), 0, "cached load must not touch the database")

    def test_saving_refreshes_the_cache_immediately(self):
        s = SiteSettings.load()
        s.site_name = 'Yangi Nom'
        s.save()  # save() must repopulate the cache
        with CaptureQueriesContext(connection) as ctx:
            reloaded = SiteSettings.load()
        self.assertEqual(reloaded.site_name, 'Yangi Nom')
        self.assertEqual(len(ctx), 0, "after save the fresh value must be served from cache")


class PageQueryBudgetTests(TestCase):
    """A generous ceiling — the point is to catch a regression that doubles the query
    count, not to chase an exact number."""

    def setUp(self):
        cache.clear()
        make_subject()
        self.user, _ = make_user(username='budget_user')
        self.client.force_login(self.user)
        # Warm caches the same way a real second request would be served.
        for url in ('/', '/leaderboard/', '/shop/'):
            self.client.get(url)

    def _assert_budget(self, url, limit):
        with CaptureQueriesContext(connection) as ctx:
            self.client.get(url)
        self.assertLessEqual(
            len(ctx), limit,
            f"{url} used {len(ctx)} queries (budget {limit}) — likely a new N+1 or an "
            f"uncached per-request read",
        )

    def test_dashboard_query_budget(self):
        self._assert_budget('/', 20)

    def test_leaderboard_query_budget(self):
        self._assert_budget('/leaderboard/', 15)

    def test_shop_query_budget(self):
        self._assert_budget('/shop/', 15)

    def test_no_page_reads_site_settings_from_db_when_warm(self):
        with CaptureQueriesContext(connection) as ctx:
            self.client.get('/')
        sql = ' '.join(q['sql'] for q in ctx.captured_queries)
        self.assertNotIn('panel_sitesettings', sql,
                         'SiteSettings must be served from cache, not queried per request')
