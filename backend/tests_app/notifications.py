"""Automatic notifications when a new test is published.

Sends:
1. In-App Notifications: Stored in `core.Notification` for each registered profile (appears on web dashboard bell).
2. Telegram Bot Notifications: Broadcasted to all connected Telegram users and the official channel (@ilmildizi).
"""
import logging
import time
from django.conf import settings
from django.utils import timezone

from accounts.models import Profile
from core.models import Notification
from tests_app.models import TestSet
from telegrambot.client import api_call

logger = logging.getLogger(__name__)


def send_new_test_notifications(test_id: int):
    """Deliver in-app and Telegram notifications for a newly published test."""
    try:
        test = TestSet.objects.select_related('subject').get(pk=test_id)
    except TestSet.DoesNotExist:
        logger.warning("send_new_test_notifications: TestSet #%s not found", test_id)
        return

    # Security / sanity checks
    if not test.is_published or test.is_random or test.is_archived:
        return

    # Check if questions exist yet (avoid announcing empty tests)
    q_count = test.questions.count()
    if q_count == 0:
        logger.info("Test #%s has 0 questions yet, deferring notification", test_id)
        return

    # Prevent duplicate broadcasting
    if test.notified_at is not None:
        logger.info("Test #%s was already notified at %s", test_id, test.notified_at)
        return

    # Mark as notified right away to prevent race conditions
    test.notified_at = timezone.now()
    test.save(update_fields=['notified_at'])

    subject_name = test.subject.name if test.subject else "Umumiy"
    duration = test.duration_minutes or 30
    title_text = f"🎯 Yangi test: {test.title}"
    msg_text = (
        f"{subject_name} fanidan yangi test bazaga yuklandi! "
        f"Topshiriqlar soni: {q_count} ta, ajratilgan vaqt: {duration} daqiqa. "
        f"Hoziroq bilimingizni sinab ko'ring va XP to'plang!"
    )

    # ── 1. IN-APP NOTIFICATIONS (Dashboard qo'ng'iroqchasi) ──
    try:
        profiles = list(Profile.objects.all().only('id', 'telegram_id'))
        in_app_items = [
            Notification(
                profile=p,
                title=title_text[:200],
                message=msg_text,
                type='system'
            )
            for p in profiles
        ]
        Notification.objects.bulk_create(in_app_items, batch_size=500)
        logger.info("Created %d in-app notifications for test #%s", len(in_app_items), test_id)
    except Exception as e:
        logger.exception("Failed to create in-app notifications for test #%s: %s", test_id, e)

    # ── 2. TELEGRAM NOTIFICATIONS ──
    site_url = getattr(settings, 'NEXT_PUBLIC_SITE_URL', 'https://ilmildizi.uz').rstrip('/')
    test_link = f"{site_url}/tests/mock/{test.id}"

    tg_text = (
        f"🎯 <b>Yangi Test Yuklandi!</b>\n\n"
        f"📚 <b>Fan:</b> {subject_name}\n"
        f"📝 <b>Nomi:</b> {test.title}\n"
        f"❓ <b>Savollar soni:</b> {q_count} ta\n"
        f"⏱ <b>Ajratilgan vaqt:</b> {duration} daqiqa\n\n"
        f"🚀 <i>Hoziroq testni yeching, o'z natijangizni tekshiring va Respublika reytingida yuqori o'rinlarni egallang!</i>"
    )

    reply_markup = {
        'inline_keyboard': [
            [{'text': "🎯 Testni boshlash", 'web_app': {'url': test_link}}],
            [{'text': "🌐 Saytda ochish", 'url': test_link}]
        ]
    }

    # 2a. Rasmiy kanalga yuborish (masalan @ilmildizi)
    channel = getattr(settings, 'TELEGRAM_REQUIRED_CHANNEL', '')
    if channel:
        try:
            res = api_call(
                'sendMessage',
                chat_id=channel,
                text=tg_text,
                parse_mode='HTML',
                reply_markup=reply_markup
            )
            logger.info("Posted new test #%s to channel %s: %s", test_id, channel, res.get('ok'))
        except Exception as e:
            logger.warning("Could not post test #%s to channel %s: %s", test_id, channel, e)

    # 2b. Botga ulangan o'quvchilar shaxsiy Telegramiga yuborish
    tg_profiles = [
        p for p in profiles
        if p.telegram_id and p.telegram_id not in ('', '0')
    ]
    sent_count = 0
    for p in tg_profiles:
        try:
            res = api_call(
                'sendMessage',
                chat_id=p.telegram_id,
                text=tg_text,
                parse_mode='HTML',
                reply_markup=reply_markup
            )
            if res.get('ok'):
                sent_count += 1
            # Telegram Bot API cheklovi: sekundiga ~30 ta xabar
            time.sleep(0.04)
        except Exception as e:
            logger.debug("Failed sending test notification to tg_id %s: %s", p.telegram_id, e)

    logger.info("Telegram notifications sent for test #%s to %d/%d users", test_id, sent_count, len(tg_profiles))
