"""Daily Telegram Daily Chest reminder (Variable Reward).

Kundalik sirli sandiqni hali ochmagan o'quvchilarga Telegram orqali qiziqarli eslatma yuboradi.
"""
from django.core.management.base import BaseCommand
from telegrambot.retention import send_daily_chest_reminders


class Command(BaseCommand):
    help = "Kundalik sirli sandiqni (Variable Reward) hali ochmagan o'quvchilarga Telegram eslatmasi yuboradi."

    def add_arguments(self, parser):
        parser.add_argument('--limit', type=int, default=500, help="Yuboriladigan maksimal xabarlar soni.")

    def handle(self, *args, **options):
        limit = options['limit']
        self.stdout.write("Kundalik sirli sandiq eslatmalari yuborilmoqda...")
        result = send_daily_chest_reminders(limit=limit)
        self.stdout.write(self.style.SUCCESS(
            f"Tugallandi: Jami nomzodlar: {result['total_candidates']}, "
            f"Yuborildi: {result['sent']}, Xatolar: {result['failed']}."
        ))
