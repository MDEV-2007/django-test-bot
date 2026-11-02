"""Daily Telegram streak reminder command (delegating to unified service)."""
from django.core.management.base import BaseCommand
from telegrambot.services.streak_reminder import send_unified_streak_reminders


class Command(BaseCommand):
    help = "Bugun dars qilmagan, Telegram ulagan foydalanuvchilarga streak eslatmasi yuboradi."

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true', help="Yubormasdan faqat ro'yxatni ko'rsatadi.")
        parser.add_argument('--limit', type=int, default=500, help="Ushbu yugurishda maksimal xabarlar soni (0 = cheksiz).")
        parser.add_argument(
            '--mode',
            type=str,
            default='streak',
            choices=['all', 'streak', 'activation', 'reengage'],
            help="Qaysi guruhga xabar yuborish: 'all', 'streak', 'activation', 'reengage'",
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        limit = options['limit'] or 500
        mode = options['mode']

        res = send_unified_streak_reminders(
            mode=mode,
            dry_run=dry_run,
            limit=limit,
            stdout=self.stdout,
        )

        if dry_run:
            self.stdout.write(self.style.WARNING("DRY RUN tugadi: hech qanday xabar yuborilmadi."))
        else:
            self.stdout.write(
                self.style.SUCCESS(
                    f"Eslatmalar yuborildi: Streak: {res['sent_streak']}, "
                    f"D1 Activation: {res['sent_activation']}, Re-engagement: {res['sent_reengage']}, "
                    f"Xatolik: {res['failed_count']}."
                )
            )
