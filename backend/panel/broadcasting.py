"""Broadcast qabul qiluvchilarini tanlash va xabarni shaxsiylashtirish.

`broadcast_api` (darhol yuborish) va `send_scheduled_broadcasts` (rejalashtirilgan)
ikkalasi ham shu yerdan foydalanadi, shunda segment va sinov guruhi qoidalari bir xil.
"""
from datetime import timedelta

from django.db.models import Q
from django.utils import timezone

from accounts.models import Profile

SEGMENTS = {'active_7d', 'lapsed', 'dormant', 'no_test'}
NAME_PLACEHOLDER = '{ism}'


def has_telegram(profile):
    return bool(profile.telegram_id) and str(profile.telegram_id).strip() not in ('', '0')


def audience_profiles(audience):
    qs = Profile.objects.select_related('user').filter(user__is_active=True)
    if audience == 'students':
        return qs.filter(role='student')
    if audience == 'teachers':
        return qs.filter(role='teacher')
    if audience == 'premium':
        return qs.filter(Q(is_premium=True) | Q(premium_mock_test_unlocked=True))
    if audience in SEGMENTS:
        students = qs.filter(role='student')
        now = timezone.now()
        if audience == 'active_7d':
            return students.filter(last_seen_at__gte=now - timedelta(days=7))
        if audience == 'lapsed':
            return students.filter(last_seen_at__lt=now - timedelta(days=7),
                                   last_seen_at__gte=now - timedelta(days=30))
        if audience == 'dormant':
            return students.filter(Q(last_seen_at__lt=now - timedelta(days=30)) | Q(last_seen_at__isnull=True))
        from tests_app.models import Attempt
        return students.exclude(id__in=Attempt.objects.filter(is_completed=True).values('profile_id'))
    return qs


def select_recipients(bc):
    """Auditoriya → oldingi xabar olganlarni chiqarish → sinov guruhi (limit).

    Telegram orqali yuborilganda sinov guruhi Telegram ulangan profillardan olinadi:
    aks holda 100 kishilik sinovning yarmi Telegram'siz bo'lib, natijani o'lchab bo'lmasdi."""
    qs = audience_profiles(bc.audience)
    if bc.exclude_broadcast_id and bc.exclude_broadcast and bc.exclude_broadcast.recipient_ids:
        qs = qs.exclude(id__in=bc.exclude_broadcast.recipient_ids)
    if bc.limit:
        if bc.via_telegram:
            qs = qs.exclude(telegram_id__isnull=True).exclude(telegram_id__in=['', '0'])
        return list(qs.order_by('?')[:bc.limit])
    return list(qs)


def personalize(text, profile):
    if NAME_PLACEHOLDER not in text:
        return text
    name = (profile.user.first_name or profile.user.username or '').strip() or "do'stim"
    return text.replace(NAME_PLACEHOLDER, name)


def caption_lookup(bc, profiles):
    """chat_id → shaxsiy matn (execute_telegram_broadcast uchun)."""
    template = f"{bc.title}\n\n{bc.message}"
    if NAME_PLACEHOLDER not in template:
        return None
    by_chat = {str(p.telegram_id).strip(): personalize(template, p) for p in profiles if has_telegram(p)}
    return lambda chat_id: by_chat.get(str(chat_id).strip(), template.replace(NAME_PLACEHOLDER, "do'stim"))
