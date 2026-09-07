"""Django management command: Foydalanuvchilarga kunlik Streak eslatmalarini Telegram orqali yuborish.

Foydalanish:
    python manage.py send_streak_reminders
    python manage.py send_streak_reminders --dry-run
    python manage.py send_streak_reminders --limit=100
"""
import json
import logging
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.conf import settings

from accounts.models import Profile
from telegrambot.client import api_call

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Bugun hali faol bo'lmagan o'quvchilarga Telegram orqali Streak eslatmasini yuboradi."

    def add_arguments(self, parser):
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
        limit = options['limit']

        today = timezone.localdate()
        # Bugun hali faol bo'lmagan, lekin olovi (streak > 0) bor foydalanuvchilar
        candidates = (
            Profile.objects.filter(
                telegram_id__isnull=False,
                streak__gt=0,
            )
            .exclude(last_active_date=today)
            .select_related('user')[:limit]
        )

        total = candidates.count()
        self.stdout.write(f"Bugungi streak eslatmasi uchun {total} ta foydalanuvchi topildi (Sana: {today}).")

        if dry_run:
            self.stdout.write(self.style.WARNING("DRY RUN rejimi: xabarlar yuborilmadi."))
            for p in candidates[:10]:
                self.stdout.write(f"  - {p.user.first_name or p.user.username} (TG: {p.telegram_id}, Streak: {p.streak})")
            return

        site_url = getattr(settings, 'NEXT_PUBLIC_SITE_URL', 'https://ilmildizi.uz')
        bot_username = getattr(settings, 'TELEGRAM_BOT_USERNAME', 'ilmildiziuz_bot')

        sent_count = 0
        fail_count = 0

        for profile in candidates:
            name = profile.user.first_name or profile.user.username
            streak = profile.streak

            text = (
                f"Salom, <b>{name}</b>! 🔥\n\n"
                f"Sizning <b>{streak} kunlik ketma-ketligingiz (streak)</b> bugun o'chib qolish xavfida!\n\n"
                f"Kunning yakunlanishiga oz vaqt qoldi. Olovingizni saqlab qolish va XP to'plash uchun "
                f"bugungi 5 ta qisqa savolni yeching 👇"
            )

            # WebApp tugmasi
            reply_markup = {
                "inline_keyboard": [
                    [
                        {
                            "text": "🔥 Streakni saqlab qolish",
                            "web_app": {"url": f"{site_url}/dashboard"},
                        }
                    ]
                ]
            }

            try:
                res = api_call(
                    'sendMessage',
                    chat_id=profile.telegram_id,
                    text=text,
                    parse_mode='HTML',
                    reply_markup=json.dumps(reply_markup),
                )
                if res.get('ok'):
                    sent_count += 1
                else:
                    fail_count += 1
                    logger.warning("Streak eslatmasi yuborilmadi: TG %s, xato: %s", profile.telegram_id, res)
            except Exception as e:
                fail_count += 1
                logger.error("Xatolik yuz berdi (%s): %s", profile.telegram_id, e)

        self.stdout.write(
            self.style.SUCCESS(
                f"Streak eslatmalari yakunlandi: {sent_count} ta muvaffaqiyatli yuborildi, {fail_count} ta xatolik."
            )
        )
