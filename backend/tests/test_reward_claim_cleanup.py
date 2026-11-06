"""Tests for Task 12 — RewardClaim table cleanup command & safety guarantees."""
import io
import time
from datetime import timedelta

from django.core.management import call_command
from django.test import TestCase
from django.utils import timezone

from accounts.utils import _TG_REPLAY_SOURCE
from core.models import RewardClaim
from core.reward_caps import _ONCE_DAY


class RewardClaimCleanupTests(TestCase):
    def setUp(self):
        self.today = timezone.localdate()
        self.now_ts = int(time.time())

        # 1. Expired daily rows (> 30 days old) -> MUST be deleted
        for i in range(5):
            RewardClaim.objects.create(
                subject_id=100 + i,
                source='sprint_finish',
                day=self.today - timedelta(days=35 + i),
                item='',
                count=3,
            )

        # 2. Recent/active daily rows (today and 10 days ago) -> MUST be kept
        self.active_today = RewardClaim.objects.create(
            subject_id=200,
            source='sprint_finish',
            day=self.today,
            item='',
            count=2,
        )
        self.active_recent = RewardClaim.objects.create(
            subject_id=201,
            source='ai_mentor',
            day=self.today - timedelta(days=10),
            item='',
            count=5,
        )

        # 3. Permanent one-time markers (day == _ONCE_DAY) -> MUST NEVER be deleted
        self.jwt_revoked = RewardClaim.objects.create(
            subject_id=300,
            source='jwt_revoked_at',
            day=_ONCE_DAY,
            item='',
            count=self.now_ts - 86400 * 90,
        )
        self.jwt_gen = RewardClaim.objects.create(
            subject_id=300,
            source='jwt_rev_gen',
            day=_ONCE_DAY,
            item='',
            count=4,
        )
        self.loop_share = RewardClaim.objects.create(
            subject_id=300,
            source='loop_share_post',
            day=_ONCE_DAY,
            item='42',
            count=1,
        )

        # 4. Expired and fresh Telegram initData replay hashes
        self.tg_expired = RewardClaim.objects.create(
            subject_id=0,
            source=_TG_REPLAY_SOURCE,
            day=_ONCE_DAY,
            item='expired_hash_1',
            count=self.now_ts - 3600,
        )
        self.tg_fresh = RewardClaim.objects.create(
            subject_id=0,
            source=_TG_REPLAY_SOURCE,
            day=_ONCE_DAY,
            item='fresh_hash_1',
            count=self.now_ts - 60,
        )

    def test_dry_run_counts_expired_rows_without_deleting_anything(self):
        before_total = RewardClaim.objects.count()
        out = io.StringIO()
        call_command('cleanup_reward_claims', days=30, batch_size=2, dry_run=True, stdout=out)
        self.assertEqual(RewardClaim.objects.count(), before_total)
        self.assertIn('daily_expired=5', out.getvalue())
        self.assertIn('tg_replay_expired=1', out.getvalue())

    def test_batch_cleanup_deletes_only_expired_rows_and_preserves_active_and_permanent_claims(self):
        out = io.StringIO()
        call_command('cleanup_reward_claims', days=30, batch_size=2, stdout=out)
        self.assertIn('daily_deleted=5', out.getvalue())
        self.assertIn('tg_replay_deleted=1', out.getvalue())

        # Expired rows are gone
        self.assertEqual(RewardClaim.objects.filter(day__gt=_ONCE_DAY, day__lt=self.today - timedelta(days=30)).count(), 0)
        self.assertFalse(RewardClaim.objects.filter(pk=self.tg_expired.pk).exists())

        # Active daily rows are preserved
        self.assertTrue(RewardClaim.objects.filter(pk=self.active_today.pk).exists())
        self.assertTrue(RewardClaim.objects.filter(pk=self.active_recent.pk).exists())

        # Permanent one-time markers and fresh TG replay hash are preserved
        self.assertTrue(RewardClaim.objects.filter(pk=self.jwt_revoked.pk).exists())
        self.assertTrue(RewardClaim.objects.filter(pk=self.jwt_gen.pk).exists())
        self.assertTrue(RewardClaim.objects.filter(pk=self.loop_share.pk).exists())
        self.assertTrue(RewardClaim.objects.filter(pk=self.tg_fresh.pk).exists())
