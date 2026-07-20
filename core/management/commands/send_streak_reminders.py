"""Daily Telegram streak reminder (Feature 5).

Run once a day (evening) from the OS scheduler — no Celery needed:

    # Linux cron, 20:00 every day:
    0 20 * * *  cd /path/to/project && /path/to/venv/bin/python manage.py send_streak_reminders

    # Windows Task Scheduler: run  python manage.py send_streak_reminders  daily at 20:00

The command is idempotent: a (profile, date) row in StreakReminderLog dedupes, so running
it twice in one day never double-messages anyone. Students who already studied today, have
no linked Telegram account, or have nothing to lose (streak 0) are skipped.

    --dry-run   log who would be messaged without sending or writing dedupe rows
    --limit N   cap the number of messages this run (safety valve while testing)
"""
from django.core.management.base import BaseCommand
from django.db import IntegrityError
from django.utils import timezone

from accounts.models import Profile
from accounts.utils import send_telegram_message
from core.models import StreakReminderLog

DEFAULT_MESSAGE = (
    "🔥 Seriyangiz uzilish arafasida!\n\n"
    "Bugungi mashqni bajaring va {streak} kunlik faollik seriyangizni saqlab qoling. "
    "Ilm Mevasi sizni kutmoqda 🌱"
)


class Command(BaseCommand):
    help = "Bugun dars qilmagan, Telegram ulagan foydalanuvchilarga streak eslatmasi yuboradi."

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true', help="Yubormasdan faqat ro'yxatni ko'rsatadi.")
        parser.add_argument('--limit', type=int, default=0, help="Ushbu yugurishda maksimal xabarlar soni (0 = cheksiz).")

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        limit = options['limit']
        today = timezone.localdate()

        # Candidates: linked Telegram, not active today, an active streak worth saving,
        # and not already reminded today. select_related avoids an N+1 on user.
        candidates = (Profile.objects
                      .select_related('user')
                      .filter(telegram_id__isnull=False, streak__gt=0)
                      .exclude(last_active_date=today)
                      .exclude(streak_reminders__date=today))

        sent, skipped, failed = 0, 0, 0
        for profile in candidates.iterator():
            if not profile.telegram_id:
                skipped += 1
                continue
            if limit and sent >= limit:
                break

            text = DEFAULT_MESSAGE.format(streak=profile.streak)
            if dry_run:
                self.stdout.write(f"[dry-run] -> {profile.user.username} (streak {profile.streak})")
                sent += 1
                continue

            ok = send_telegram_message(profile.telegram_id, text)
            try:
                # Write the dedupe row even on a failed send so a transient Telegram
                # outage doesn't cause a retry storm; sent_ok records the outcome.
                StreakReminderLog.objects.create(profile=profile, date=today, sent_ok=ok)
            except IntegrityError:
                # Raced with a concurrent run — someone already logged today. Skip.
                continue
            if ok:
                sent += 1
            else:
                failed += 1

        self.stdout.write(self.style.SUCCESS(
            f"Streak eslatmalari: {sent} yuborildi, {failed} muvaffaqiyatsiz, {skipped} o'tkazib yuborildi"
            f"{' (dry-run)' if dry_run else ''}."
        ))
