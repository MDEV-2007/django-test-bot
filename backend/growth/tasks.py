import logging
from django.utils import timezone
from accounts.models import Profile
from telegrambot.client import send_message
from .models import LiveRepublicEvent

logger = logging.getLogger(__name__)


def broadcast_2030_republic_arena(stage: str = "15m"):
    """Har oqshom 20:15 (15 daqiqa qolganda) va 20:28 (2 daqiqa qolganda)
    faol o'quvchilarga Telegram Bot orqali Jonli Respublika Arenasiga chaqiruv xabari yuboradi.
    """
    today = timezone.localdate()
    event, _ = LiveRepublicEvent.objects.get_or_create(
        scheduled_time__date=today,
        defaults={
            'title': "20:30 Jonli Respublika Sprinti",
            'scheduled_time': timezone.make_aware(
                timezone.datetime.combine(today, timezone.datetime.min.time().replace(hour=20, minute=30))
            ),
            'status': 'lobby' if stage == "15m" else 'active',
            'rewards_description': "👑 Top-3 g'olibga 1 haftalik VIP va +500 Tanga!",
        }
    )

    if stage == "15m" and event.notification_sent_15m:
        logger.info("20:15 xabarnomasi allaqachon yuborilgan.")
        return
    if stage == "2m" and event.notification_sent_2m:
        logger.info("20:28 xabarnomasi allaqachon yuborilgan.")
        return

    # Faol profillarni saralab olish (oxirgi 7 kunda kirgan va telegram_id mavjudlar)
    recent_profiles = Profile.objects.filter(
        telegram_id__isnull=False
    ).exclude(telegram_id=0).order_by('-last_seen_at')[:500]

    bot_url = "https://t.me/ilmildiziuz_bot/app?startapp=republic_arena"

    if stage == "15m":
        text = (
            "🚨 <b>15 daqiqadan so'ng (20:30 da) JONLI RESPUBLIKA SPRINTI boshlanadi!</b>\n\n"
            "🔥 Hozir 120+ abituriyent kutish zolida to'plandi.\n"
            "Savollar: <b>Tarix va Ona tili</b> (15 ta tezkor savol).\n"
            "👑 <b>Mukofot:</b> Top-3 g'olibga 1 haftalik VIP obuna va +500 Tanga!\n\n"
            "O'rningizni band qilish uchun hoziroq kutish zoliga kiring 👇"
        )
        reply_markup = {
            "inline_keyboard": [
                [
                    {
                        "text": "🔴 Kutish Zoliga Kirish (Jonli)",
                        "web_app": {"url": bot_url}
                    }
                ]
            ]
        }
        event.notification_sent_15m = True
        event.status = 'lobby'
        event.save(update_fields=['notification_sent_15m', 'status'])
    else:
        text = (
            "⚡️ <b>DIQQAT: 2 daqiqadan so'ng 20:30 Turniri boshlanadi!</b>\n\n"
            "Barcha ishtirokchilar start chizig'ida. Respublika reytingida 1-o'rinni egallash imkoniyati!\n"
            "Jangni o'tkazib yubormang 👇"
        )
        reply_markup = {
            "inline_keyboard": [
                [
                    {
                        "text": "🔥 Turnirni Boshlash!",
                        "web_app": {"url": bot_url}
                    }
                ]
            ]
        }
        event.notification_sent_2m = True
        event.status = 'active'
        event.save(update_fields=['notification_sent_2m', 'status'])

    sent_count = 0
    for prof in recent_profiles:
        try:
            send_message(chat_id=prof.telegram_id, text=text, reply_markup=reply_markup)
            sent_count += 1
        except Exception as e:
            logger.debug(f"Telegram push failed for {prof.id}: {e}")

    logger.info(f"Republic Arena {stage} broadcast sent to {sent_count} students.")
    return sent_count
