"""Django management command: Foydalanuvchilarga aqlli eslatmalar (Retention, Streak & D1 Activation)
Telegram orqali yuborish.

3 ta auditoriyani qamrab oladi:
1. Streak Saver: Olovi (streak > 0) bor, lekin bugun hali test topshirmagan o'quvchilar.
2. D1 Activation: Ro'yxatdan o'tgan, lekin hali birorta ham test tugatmagan (44% tashlab ketganlar).
3. Re-engagement: 3+ kundan beri kirmagan o'quvchilarni qaytarish.

Foydalanish:
    python manage.py send_streak_reminders
    python manage.py send_streak_reminders --mode=activation
    python manage.py send_streak_reminders --mode=streak
    python manage.py send_streak_reminders --dry-run
"""
import json
import logging
import time
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.conf import settings
from django.core.cache import cache

from accounts.models import Profile
from telegrambot.client import send_message

logger = logging.getLogger(__name__)


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

        today = timezone.localdate()
        now = timezone.now()
        yesterday_cutoff = now - timedelta(hours=18)
        three_days_ago = today - timedelta(days=3)

        site_url = getattr(settings, 'NEXT_PUBLIC_SITE_URL', 'https://ilmildizi.uz').rstrip('/')

        sent_streak = 0
        sent_activation = 0
        sent_reengage = 0
        failed_count = 0

        # ============================================================
        # 1. STREAK SAVER: Olovi bor, lekin bugun hali kirmaganlar
        # ============================================================
        if mode in ('all', 'streak'):
            streak_candidates = (
                Profile.objects.filter(
                    telegram_id__isnull=False,
                    streak__gt=0,
                )
                .exclude(last_active_date=today)
                .select_related('user')[:limit]
            )
            total_streak = streak_candidates.count()
            self.stdout.write(f"[Streak Saver] {total_streak} ta o'quvchi topildi.")

            if not dry_run:
                for profile in streak_candidates:
                    cache_key = f"retention:streak:{profile.id}:{today}"
                    if cache.get(cache_key):
                        continue

                    name = profile.user.first_name or profile.user.username or "O'quvchi"
                    streak = profile.streak

                    text = (
                        f"Salom, <b>{name}</b>! 🔥\n\n"
                        f"⏳ <b>{streak} kunlik ketma-ketligingiz (streak)</b> bugun o'chib qolish xavfida!\n\n"
                        f"Bugungi zanjir uzilmasligi va olovingiz yonib turishi uchun hoziroq 1 ta test ishlang 👇"
                    )

                    reply_markup = {
                        "inline_keyboard": [
                            [
                                {
                                    "text": "🔥 Olovni saqlab qolish",
                                    "web_app": {"url": f"{site_url}/dashboard"},
                                }
                            ]
                        ]
                    }

                    res = send_message(profile.telegram_id, text, reply_markup=reply_markup)
                    if res.get('ok'):
                        sent_streak += 1
                        cache.set(cache_key, '1', 86400)
                    else:
                        failed_count += 1
                    time.sleep(0.04)

        # ============================================================
        # 2. D1 ACTIVATION: 18+ soat oldin ro'yxatdan o'tgan, lekin 0 ta test tugatganlar
        # ============================================================
        if mode in ('all', 'activation'):
            activation_candidates = (
                Profile.objects.filter(
                    telegram_id__isnull=False,
                    role='student',
                    user__date_joined__lte=yesterday_cutoff,
                )
                .exclude(attempts__is_completed=True)
                .select_related('user')
                .distinct()[:limit]
            )
            total_act = activation_candidates.count()
            self.stdout.write(f"[D1 Activation] 0 ta test ishlagan {total_act} ta yangi o'quvchi topildi.")

            if not dry_run:
                for profile in activation_candidates:
                    cache_key = f"retention:d1_act:{profile.id}"
                    if cache.get(cache_key):
                        continue

                    name = profile.user.first_name or profile.user.username or "Do'stim"

                    text = (
                        f"Assalomu alaykum, <b>{name}</b>! 🎯\n\n"
                        f"IlmIldizi'dagi ilk <b>3 daqiqalik ekspress testingiz</b> sizni kutmoqda!\n\n"
                        f"• Bor-yo'g'i 5 ta qiziqarli savol\n"
                        f"• O'z darajangizni aniqlaysiz\n"
                        f"• <b>+50 Tanga</b> bonus yutib olasiz\n\n"
                        f"Bilimingizni sinab ko'rishga tayyormisiz? 👇"
                    )

                    reply_markup = {
                        "inline_keyboard": [
                            [
                                {
                                    "text": "🚀 3 daqiqalik testni boshlash",
                                    "web_app": {"url": f"{site_url}/tests"},
                                }
                            ],
                            [
                                {
                                    "text": "⚔️ 1v1 Arena'da kuch sinashish",
                                    "web_app": {"url": f"{site_url}/battles"},
                                }
                            ]
                        ]
                    }

                    res = send_message(profile.telegram_id, text, reply_markup=reply_markup)
                    if res.get('ok'):
                        sent_activation += 1
                        cache.set(cache_key, '1', 86400 * 3)  # 3 kunda 1 marta
                    else:
                        failed_count += 1
                    time.sleep(0.04)

        # ============================================================
        # 3. RE-ENGAGEMENT: 3+ kundan beri kirmagan o'quvchilarni uyg'otish
        # ============================================================
        if mode in ('all', 'reengage'):
            reengage_candidates = (
                Profile.objects.filter(
                    telegram_id__isnull=False,
                    role='student',
                    streak=0,
                    last_active_date__lt=three_days_ago,
                    attempts__is_completed=True,
                )
                .select_related('user')
                .distinct()[:limit]
            )
            total_re = reengage_candidates.count()
            self.stdout.write(f"[Re-engagement] 3+ kundan beri kirmagan {total_re} ta o'quvchi topildi.")

            if not dry_run:
                for profile in reengage_candidates:
                    cache_key = f"retention:reengage:{profile.id}"
                    if cache.get(cache_key):
                        continue

                    name = profile.user.first_name or profile.user.username or "O'quvchi"

                    text = (
                        f"Salom, <b>{name}</b>! ⚡️\n\n"
                        f"Sizni sog'indik! Bu orada umumiy reytingda raqiblaringiz ancha oldinga o'tib ketishdi.\n\n"
                        f"Yangi Milliy sertifikat savollari va 1v1 Battle Arena sizni kutmoqda. "
                        f"O'z o'rningizni qaytarib olish vaqti keldi! 🏆"
                    )

                    reply_markup = {
                        "inline_keyboard": [
                            [
                                {
                                    "text": "⚔️ 1v1 Jang yoki Testga kirish",
                                    "web_app": {"url": f"{site_url}/battles"},
                                }
                            ]
                        ]
                    }

                    res = send_message(profile.telegram_id, text, reply_markup=reply_markup)
                    if res.get('ok'):
                        sent_reengage += 1
                        cache.set(cache_key, '1', 86400 * 7)  # haftada 1 marta
                    else:
                        failed_count += 1
                    time.sleep(0.04)

        if dry_run:
            self.stdout.write(self.style.WARNING("DRY RUN tugadi: hech qanday xabar yuborilmadi."))
        else:
            self.stdout.write(
                self.style.SUCCESS(
                    f"Eslatmalar yuborildi: Streak: {sent_streak}, D1 Activation: {sent_activation}, "
                    f"Re-engagement: {sent_reengage}, Xatolik: {failed_count}."
                )
            )
