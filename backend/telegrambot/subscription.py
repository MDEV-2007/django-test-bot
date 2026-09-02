"""Majburiy kanal obunasi (@ilmildizi).

Why a shared module instead of an inline check in the bot: the gate has to hold in two
places at once. The bot is where a user first arrives, but the Mini App is reachable
directly by URL — a user can subscribe once at /start, leave the channel, and keep using
the app forever. So the same answer is needed by the webhook handlers and by the JSON API
the Next.js frontend calls.

Two rules keep it cheap and safe:

  1. Cache. `getChatMember` is a network round trip to Telegram; doing it on every request
     would add latency to every page load and burn the bot's rate limit. A positive answer
     is cached for CACHE_OK seconds, a negative one for only CACHE_MISS — a user who has
     just subscribed should not wait ten minutes to get in (and the "Tekshirish" button
     invalidates the entry anyway).

  2. Fail OPEN. If the channel is unconfigured, the bot is not an admin there, or Telegram
     is unreachable, `is_subscribed` returns True. A gate that fails closed would lock the
     entire product out of the hands of every user the moment a token expires or an admin
     right is dropped — a far worse outcome than a few unsubscribed users slipping through.
"""
import logging

from django.conf import settings
from django.core.cache import cache

from .client import api_call

logger = logging.getLogger(__name__)

CACHE_OK = 600      # obuna tasdiqlandi — 10 daqiqa
CACHE_MISS = 30     # obuna yo'q — tez qayta tekshiriladi
CACHE_UNKNOWN = 60  # Telegram javob bermadi — qisqa vaqt "ochiq" deb yuriladi

# Telegram statuslari: shu uchtasi kanal a'zosi degani. 'left'/'kicked' — emas.
MEMBER_STATUSES = {'member', 'administrator', 'creator'}

# Telegram bunday deganda foydalanuvchi kanalda umuman yo'q — bu "xato" emas, "obuna emas".
_NOT_A_MEMBER_ERRORS = ('user not found', 'participant_id_invalid', 'member list is inaccessible')


def channel():
    """Konfiguratsiyadagi kanal: `@username` yoki raqamli `-100...` id."""
    return (getattr(settings, 'TELEGRAM_REQUIRED_CHANNEL', '') or '').strip()


def channel_url():
    """Obuna bo'lish uchun havola. Raqamli id uchun havola qurib bo'lmaydi."""
    name = channel()
    if name.startswith('@'):
        return f"https://t.me/{name[1:]}"
    if name.startswith('https://') or name.startswith('t.me/'):
        return name if name.startswith('https://') else f"https://{name}"
    return ''


def is_required():
    """Gate umuman yoqilganmi. Token yoki kanal bo'lmasa — yo'q (masalan, testlarda)."""
    return bool(
        getattr(settings, 'REQUIRE_CHANNEL_SUBSCRIPTION', False)
        and channel()
        and settings.TELEGRAM_BOT_TOKEN
    )


def _key(telegram_id):
    return f"tg:sub:{channel()}:{telegram_id}"


def invalidate(telegram_id):
    """"Tekshirish" tugmasi bosilganda keshni tashlab, Telegramdan yangi javob olamiz."""
    if telegram_id:
        cache.delete(_key(telegram_id))


def is_subscribed(telegram_id, use_cache=True):
    """`telegram_id` majburiy kanalga obunami?

    Telegram hisobi ulanmagan foydalanuvchi (faqat sayt orqali kirgan) tekshirib
    bo'lmaydi — uni bloklash mumkin emas, shuning uchun True qaytadi."""
    if not is_required():
        return True
    telegram_id = str(telegram_id or '').strip()
    if not telegram_id:
        return True

    key = _key(telegram_id)
    if use_cache:
        cached = cache.get(key)
        if cached is not None:
            return cached == '1'

    data = api_call('getChatMember', chat_id=channel(), user_id=telegram_id)
    if not data.get('ok'):
        description = (data.get('description') or '').lower()
        if any(marker in description for marker in _NOT_A_MEMBER_ERRORS):
            cache.set(key, '0', CACHE_MISS)
            return False
        # Bot kanalda admin emas / Telegram yetib bormadi — gate'ni ochiq qoldiramiz.
        logger.warning("Kanal obunasini tekshirib bo'lmadi (%s): %s", channel(), description or data)
        cache.set(key, '1', CACHE_UNKNOWN)
        return True

    status = (data.get('result') or {}).get('status')
    subscribed = status in MEMBER_STATUSES
    cache.set(key, '1' if subscribed else '0', CACHE_OK if subscribed else CACHE_MISS)
    return subscribed


def state_for(profile, use_cache=True, in_miniapp=True):
    """Frontend uchun holat: gate kerakmi, obunami, qaysi kanalga.

    `in_miniapp=False` — so'rov oddiy brauzerdan keldi. Bunday holda talab UMUMAN
    qo'yilmaydi: obuna sharti bot orqali kirgan foydalanuvchiga tegishli, saytga
    kirgan odamga emas (hatto hisobiga Telegram ulangan bo'lsa ham). Shu tufayli
    bloklovchi ekran brauzerda hech qachon chiqmaydi."""
    telegram_id = getattr(profile, 'telegram_id', '') if profile else ''
    required = in_miniapp and is_required() and bool(telegram_id)
    return {
        'required': required,
        'subscribed': True if not required else is_subscribed(telegram_id, use_cache=use_cache),
        'channel': channel(),
        'channel_url': channel_url(),
    }
