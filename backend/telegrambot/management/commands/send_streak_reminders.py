"""Django management command: Foydalanuvchilarga aqlli eslatmalar (Retention, Streak & D1 Activation)
Telegram orqali yuborish.
"""
from django.core.management.base import BaseCommand
from telegrambot.services.streak_reminder import send_unified_streak_reminders


class Command(BaseCommand):
    help = "O'quvchilarni faollashtirish va qayta jalb qilish uchun aqlli Telegram eslatmalarini yuboradi."

    def add_arguments(self, parser):
        parser.add_argument(
            '--mode',
            type=str,
            default='all',
            choices=['all', 'streak', 'activation', 'reengage'],
            help="Qaysi guruhga xabar yuborish: 'all', 'streak', 'activation', 'reengage'",
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help="Xabarlarni yubormasdan faqat qabul qiluvchilar sonini hisoblaydi.",
        )
        parser.add_argument(
            '--limit',
            type=int,
            default=500,
            help="Bitta chaqiruvda yuboriladigan maksimal xabarlar soni (sukut: 500).",
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        mode = options['mode']
        limit = options['limit']

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
