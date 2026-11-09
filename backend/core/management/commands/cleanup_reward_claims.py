"""Prunes expired daily `RewardClaim` rows and expired Telegram initData replay hashes in batches.

    python manage.py cleanup_reward_claims                      # delete daily rows > 30 days old
    python manage.py cleanup_reward_claims --days 14 --dry-run  # preview without deleting
    python manage.py cleanup_reward_claims --batch-size 500

Safety guarantees (TASK 12):
  1. Permanent one-time markers (`day == _ONCE_DAY`, e.g., `jwt_revoked_at`, `jwt_rev_gen`,
     `loop_share_post`, `reel_quiz`) are NEVER deleted so users cannot re-claim one-time
     rewards or bypass JWT revocation.
  2. Active daily reward-cap rows (`day >= today - days`) are NEVER deleted.
  3. Ephemeral `tg_initdata_hash` rows older than `TELEGRAM_AUTH_MAX_AGE_SECONDS + 60` are
     pruned in batches alongside expired daily rows.
"""
import time
from datetime import timedelta

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from accounts.utils import TELEGRAM_AUTH_MAX_AGE_SECONDS, _TG_REPLAY_SOURCE
from core.models import RewardClaim
from core.reward_caps import _ONCE_DAY


def cleanup_reward_claims_table(
    *,
    retention_days: int = 30,
    batch_size: int = 1000,
    dry_run: bool = False,
    now_ts: int | None = None,
) -> dict:
    if retention_days < 1:
        raise ValueError("retention_days must be >= 1")
    if batch_size < 1:
        raise ValueError("batch_size must be >= 1")

    today = timezone.localdate()
    cutoff_day = today - timedelta(days=retention_days)
    current_ts = int(time.time() if now_ts is None else now_ts)
    tg_cutoff_ts = current_ts - (TELEGRAM_AUTH_MAX_AGE_SECONDS + 60)

    daily_qs = RewardClaim.objects.filter(day__gt=_ONCE_DAY, day__lt=cutoff_day)
    tg_qs = RewardClaim.objects.filter(
        source=_TG_REPLAY_SOURCE,
        day=_ONCE_DAY,
        count__lt=tg_cutoff_ts,
    )

    if dry_run:
        daily_count = daily_qs.count()
        tg_count = tg_qs.count()
        return {
            'dry_run': True,
            'cutoff_day': str(cutoff_day),
            'daily_expired_count': daily_count,
            'tg_replay_expired_count': tg_count,
            'total_deleted': 0,
        }

    daily_deleted = _delete_in_batches(daily_qs, batch_size)
    tg_deleted = _delete_in_batches(tg_qs, batch_size)
    return {
        'dry_run': False,
        'cutoff_day': str(cutoff_day),
        'daily_expired_count': daily_deleted,
        'tg_replay_expired_count': tg_deleted,
        'total_deleted': daily_deleted + tg_deleted,
    }


def _delete_in_batches(queryset, batch_size: int) -> int:
    total = 0
    while True:
        pks = list(queryset.order_by('pk').values_list('pk', flat=True)[:batch_size])
        if not pks:
            break
        deleted, _ = RewardClaim.objects.filter(pk__in=pks).delete()
        total += deleted
    return total


class Command(BaseCommand):
    help = "Deletes expired daily RewardClaim rows and expired Telegram initData hashes in batches."

    def add_arguments(self, parser):
        parser.add_argument(
            '--days', type=int, default=30,
            help="Retention period in days for daily reward-cap rows (default: 30, minimum: 1).",
        )
        parser.add_argument(
            '--batch-size', type=int, default=1000,
            help="Number of rows to delete per batch (default: 1000).",
        )
        parser.add_argument(
            '--dry-run', action='store_true',
            help="Count expired rows without deleting them.",
        )

    def handle(self, *args, **options):
        days = options['days']
        batch_size = options['batch_size']
        if days < 1:
            raise CommandError("--days kamida 1 bo'lishi kerak.")
        if batch_size < 1:
            raise CommandError("--batch-size kamida 1 bo'lishi kerak.")

        summary = cleanup_reward_claims_table(
            retention_days=days,
            batch_size=batch_size,
            dry_run=options['dry_run'],
        )
        if summary['dry_run']:
            self.stdout.write(
                f"[DRY-RUN] cutoff={summary['cutoff_day']} "
                f"daily_expired={summary['daily_expired_count']} "
                f"tg_replay_expired={summary['tg_replay_expired_count']}"
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(
                    f"RewardClaim tozalandi: cutoff={summary['cutoff_day']} "
                    f"daily_deleted={summary['daily_expired_count']} "
                    f"tg_replay_deleted={summary['tg_replay_expired_count']} "
                    f"total={summary['total_deleted']}"
                )
            )
