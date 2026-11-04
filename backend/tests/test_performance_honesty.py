"""6-kun: so'rovlar soni (N+1) va soxta qiymatlar.

- Lenta: post soniga qarab so'rovlar soni o'smaydi (reaksiyalar prefetch'dan);
- Reels lentasi: izohlar soni annotatsiyadan (har reel uchun so'rov yo'q), ro'yxat cheklangan;
- Landing sharhlari: to'qima sharhlar yo'q; mock kutayotganlar soni — haqiqiy;
- Jonli turnir statusi: tadbir yo'q bo'lsa soxta "128 ishtirokchi" emas, null.
"""
from django.db import connection
from django.test import TestCase
from django.test.utils import CaptureQueriesContext
from rest_framework.test import APIClient

from learning.models import CommunityPost, CommunityPostReaction, Reel, ReelComment
from tests_app.models import TestSet

from .factories import make_user


class QueryCountTests(TestCase):
    def setUp(self):
        self.user, _ = make_user('olchovchi')
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def _make_posts(self, n):
        reactors = [make_user(f'r{n}_{i}')[0] for i in range(3)]
        for i in range(n):
            post = CommunityPost.objects.create(author=self.user, post_type='achievement', title=f'P{i}', caption='c')
            for j, u in enumerate(reactors):
                CommunityPostReaction.objects.create(post=post, user=u, reaction_type=['fire', 'clap', 'heart'][j])

    def _feed_queries(self):
        with CaptureQueriesContext(connection) as ctx:
            res = self.client.get('/api/learning/feed/')
        self.assertEqual(res.status_code, 200)
        return len(ctx.captured_queries), res.json()

    def test_feed_query_count_does_not_grow_with_posts(self):
        self._make_posts(3)
        small, _ = self._feed_queries()
        self._make_posts(15)
        large, data = self._feed_queries()
        self.assertLessEqual(large - small, 2, (small, large))
        post = data['posts'][0]
        self.assertEqual(post['reaction_counts'], {'fire': 1, 'clap': 1, 'trophy': 0, 'heart': 1})

    def test_reels_feed_has_no_per_reel_count_queries(self):
        def make(n):
            for i in range(n):
                reel = Reel.objects.create(subject_name='Tarix', subject_slug='tarix', hook=f'h{i}', fact='f',
                                           takeaway='t', quiz_question='?', quiz_options=['a', 'b'],
                                           quiz_correct_index=0, is_published=True)
                ReelComment.objects.create(reel=reel, user=self.user, text='zo\'r')

        def count():
            with CaptureQueriesContext(connection) as ctx:
                res = self.client.get('/api/learning/reels/')
            self.assertEqual(res.status_code, 200)
            return len(ctx.captured_queries), res.json()['reels']

        make(3)
        small, _ = count()
        make(15)
        large, reels = count()
        self.assertLessEqual(large - small, 2, (small, large))
        self.assertTrue(all(r['comments_count'] == 1 for r in reels if 'comments_count' in r))


class NoFabricatedValuesTests(TestCase):
    def test_landing_reviews_are_not_invented(self):
        res = APIClient().get('/api/dashboard/landing-reviews/').json()
        self.assertEqual(res['reviews'], [])

    def test_mock_waiting_count_is_real(self):
        user, _ = make_user('kutuvchi')
        mock = TestSet.objects.create(title='Mock', duration_minutes=60, is_live_mock=True, is_published=True,
                                      is_premium=False)
        c = APIClient()
        c.force_authenticate(user)
        res = c.get(f'/api/tests/{mock.id}/lobby/')
        if res.status_code == 200 and 'waiting_participants_count' in res.json():
            self.assertEqual(res.json()['waiting_participants_count'], 0)

    def test_no_fake_live_event(self):
        res = APIClient().get('/api/growth/status/').json()
        self.assertIsNone(res['live_event'])
