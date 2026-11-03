"""O'sish analitikasi: kunlik faollik va monetizatsiya hodisalarini yozish.

Ikkala yozuv ham asosiy so'rov oqimini hech qachon buzmasligi kerak — xato bo'lsa
log qilinadi va jim o'tib ketiladi.
"""
import logging

from django.core.cache import cache
from django.utils import timezone

logger = logging.getLogger(__name__)

# Klient (brauzer) yuborishi mumkin bo'lgan hodisalar. Server o'zi yozadiganlari ham
# shu nomlardan foydalanadi, shunda voronka bitta joydan o'qiladi.
CLIENT_EVENTS = {'paywall_view', 'premium_view', 'checkout_view'}
SERVER_EVENTS = CLIENT_EVENTS | {'parent_invoice_sent'}
ALLOWED_PROP_KEYS = {'feature', 'plan_id', 'source'}


def record_activity(profile):
    """O'quvchining bugungi faolligini bir marta yozadi. Kesh kaliti tufayli bazaga
    kuniga ko'pi bilan bitta so'rov ketadi (ensure_profile_for_user har daqiqada chaqiradi)."""
    if profile is None or profile.pk is None:
        return
    today = timezone.localdate()
    key = f'dau:{profile.pk}:{today.isoformat()}'
    try:
        if not cache.add(key, 1, timeout=26 * 3600):
            return
        from .models import DailyActivity
        DailyActivity.objects.bulk_create(
            [DailyActivity(profile_id=profile.pk, date=today)], ignore_conflicts=True)
    except Exception:  # pragma: no cover — analitika asosiy oqimni to'xtatmasin
        logger.warning('record_activity failed', exc_info=True)


def clean_props(props):
    if not isinstance(props, dict):
        return {}
    out = {}
    for k in ALLOWED_PROP_KEYS:
        v = props.get(k)
        if v is None:
            continue
        out[k] = str(v)[:50]
    return out


def track_event(profile, name, **props):
    if name not in SERVER_EVENTS:
        raise ValueError(f'unknown event: {name}')
    try:
        from .models import ProductEvent
        ProductEvent.objects.create(profile=profile, name=name, props=clean_props(props))
    except Exception:  # pragma: no cover
        logger.warning('track_event failed', exc_info=True)


_SOURCE_ALLOWED = set('abcdefghijklmnopqrstuvwxyz0123456789_-.')


def clean_source(raw):
    """Havoladan kelgan belgini xavfsiz qisqa nomga aylantiradi: kichik harf,
    faqat [a-z0-9_-.], ko'pi bilan 64 belgi. Bo'sh bo'lsa — None."""
    if not raw:
        return None
    value = ''.join(ch for ch in str(raw).strip().lower() if ch in _SOURCE_ALLOWED)[:64]
    return value or None


def record_signup_source(profile, raw_source, referred=False):
    """Faqat yangi profil uchun, bir marta (birinchi tegish) yoziladi. Referal kod bilan
    kelganlar `referral` deb belgilanadi: har bir o'quvchining shaxsiy kodi alohida
    manba bo'lib jadvalni to'ldirib yubormasin."""
    source = 'referral' if referred else clean_source(raw_source)
    if not source or profile is None or profile.pk is None:
        return
    try:
        from .models import SignupSource
        SignupSource.objects.get_or_create(profile=profile, defaults={'source': source})
    except Exception:  # pragma: no cover
        logger.warning('record_signup_source failed', exc_info=True)
