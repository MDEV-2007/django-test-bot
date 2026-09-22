"""Telegram Bot Smart Retention Services:
1. Overtake Alerts: Reytingda boshqa o'quvchi quvib o'tganda zudlik bilan shaxsiy xabar yuborish.
2. Streak Saver: Kun yakuniga yetmasdan avval olovi (streak) bor o'quvchilarga eslatma yuborish.
"""
import logging
from django.conf import settings
from django.core.cache import cache
from django.utils import timezone

from telegrambot.client import send_message

logger = logging.getLogger(__name__)

OVERTAKE_COOLDOWN_SECONDS = 4 * 3600  # Har bir foydalanuvchiga 4 soatda ko'pi bilan 1 marta quvib o'tish xabari


def check_and_send_overtake_alerts(overtaker_profile, old_xp: int, new_xp: int):
    """Foydalanuvchi XP yig'ib reytingda ko'tarilganda, u quvib o'tgan o'quvchilarga

    Telegram orqali raqobat xabarnomasini jo'natadi.
    """
    if overtaker_profile.is_privileged or overtaker_profile.role != 'student':
        return

    if new_xp <= old_xp:
        return

    # Faqat Telegram ID si bor va rostdan ham ortda qolgan studentlar
    from accounts.models import Profile

    overtaken_students = (
        Profile.objects.filter(
            role='student',
            telegram_id__isnull=False,
            xp__gte=old_xp,
            xp__lt=new_xp,
        )
        .exclude(id=overtaker_profile.id)
        .select_related('user')[:3]  # Bir chaqiruvda maksimal 3 ta eng yaqin kishiga
    )

    if not overtaken_students:
        return

    # Quvib o'tgan o'quvchining yangi o'rni
    overtaker_rank = Profile.objects.filter(role='student', xp__gt=new_xp).count() + 1
    overtaker_name = (
        overtaker_profile.user.first_name or
        overtaker_profile.user.username or
        "Raqibingiz"
    )

    site_url = getattr(settings, 'NEXT_PUBLIC_SITE_URL', 'https://ilmildizi.uz')

    reply_markup = {
        "inline_keyboard": [
            [
                {
                    "text": "⚔️ O'rnimni qaytarib olaman",
                    "web_app": {"url": f"{site_url}/tests"},
                }
            ],
            [
                {
                    "text": "🏆 Reytingni ko'rish",
                    "web_app": {"url": f"{site_url}/leaderboard"},
                }
            ]
        ]
    }

    for student in overtaken_students:
        cache_key = f"retention:overtake_alert:{student.id}"
        if cache.get(cache_key):
            continue

        student_name = student.user.first_name or student.user.username

        text = (
            f"Salom, <b>{student_name}</b>! ⚡️\n\n"
            f"⚠️ <b>{overtaker_name}</b> sizdan o'tib ketdi va umumiy reytingda "
            f"<b>#{overtaker_rank}-o'ringa</b> ko'tarildi!\n\n"
            f"O'z o'rningizni qaytarib olish va reytingingizni tushirmaslik uchun "
            f"hozirning o'zida bitta test ishlang 👇"
        )

        res = send_message(
            chat_id=student.telegram_id,
            text=text,
            reply_markup=reply_markup,
            parse_mode='HTML',
        )

        if res.get('ok'):
            cache.set(cache_key, '1', OVERTAKE_COOLDOWN_SECONDS)
            logger.info("Overtake alert sent to user %s (TG: %s)", student.id, student.telegram_id)


def send_streak_saver_reminders(limit: int = 500) -> dict:
    """Kun yakunlanishi oldidan streak'i o'chib qolish xavfidagi o'quvchilarga

    Telegram orqali retention xabarlarini yuboradi.
    """
    from accounts.models import Profile

    today = timezone.localdate()
    candidates = (
        Profile.objects.filter(
            telegram_id__isnull=False,
            streak__gt=0,
            role='student',
        )
        .exclude(last_active_date=today)
        .select_related('user')[:limit]
    )

    site_url = getattr(settings, 'NEXT_PUBLIC_SITE_URL', 'https://ilmildizi.uz')
    sent_count = 0
    fail_count = 0

    reply_markup = {
        "inline_keyboard": [
            [
                {
                    "text": "🔥 Streakni saqlab qolish",
                    "web_app": {"url": f"{site_url}/tests"},
                }
            ]
        ]
    }

    for profile in candidates:
        cache_key = f"retention:streak_reminder:{profile.id}:{today}"
        if cache.get(cache_key):
            continue

        name = profile.user.first_name or profile.user.username
        streak = profile.streak

        text = (
            f"Salom, <b>{name}</b>! 🔥\n\n"
            f"⏳ <b>Olovingiz o'chib qolishiga oz vaqt qoldi!</b>\n"
            f"Sizning <b>{streak} kunlik seriyangiz (streak)</b> bugun uzilib qolish xavfida!\n\n"
            f"Olovingizni saqlab qolish va XP to'plash uchun hoziroq bitta test ishlang 👇"
        )

        res = send_message(
            chat_id=profile.telegram_id,
            text=text,
            reply_markup=reply_markup,
            parse_mode='HTML',
        )

        if res.get('ok'):
            sent_count += 1
            # Bugun qayta bormasligi uchun 24 soat keshlaymiz
            cache.set(cache_key, '1', 86400)
        else:
            fail_count += 1

    return {
        'total_candidates': len(candidates),
        'sent': sent_count,
        'failed': fail_count,
    }
