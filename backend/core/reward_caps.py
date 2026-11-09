"""Kunlik mukofot chegaralari (XP/tanga "farm" himoyasi).

Mini-o'yinlar, reels savoli, flashcard va fokus sessiyasi natijani klientdan oladi
va har bir POST uchun XP/tanga berardi. Skript bilan (yoki to'g'ri javob ko'rsatilgan
ekrandan keyin qayta yuborib) cheksiz tanga yig'ish, do'kondagi narsalarni bepul
olish va reytingni sun'iy ko'tarish mumkin edi.

Har bir manba uchun foydalanuvchiga kunlik limit qo'yiladi. Limitdan oshganda
mashq davom etadi, faqat mukofot berilmaydi.
"""
from datetime import date

from django.utils import timezone

# Manba -> kuniga necha marta mukofot beriladi.
DAILY_REWARD_LIMITS = {
    'game_timeline': 10,
    'game_map': 10,
    'game_character': 10,
    'reels_quiz': 30,
    'flashcards': 5,
    'study_session': 6,
    'battle_bot': 15,
    # Jonli PvP jang (ikki akkaunt bilan o'zaro farm qilinmasin).
    'battle_pvp': 20,
    # Mukofot emas, AI xarajati: ochiq javobni Groq bilan baholash (user.id bo'yicha).
    'open_question_ai': 60,
    # Esse tekshiruvi: qulflangan (bepul) natija ham to'liq Groq chaqiruvi. Limitsiz bo'lsa,
    # bitta o'quvchi bepul kvotani tugatib, AI'ni hamma uchun o'chirib qo'yishi mumkin edi.
    'essay_ai': 10,
    # Fokus Sprint xato tushuntirishi: kesh topilmaganda pullik LLM chaqiruvi (user.id).
    'sprint_explain_ai': 40,
    # Ijtimoiy XP: lenta posti, natija ulashish, story va reel savoli — har POST uchun
    # XP berilardi (cheksiz, skript bilan reytingni ko'tarish mumkin edi). Umumiy limit.
    'social_post': 3,
    # Lentadagi SOS so'rovnomasini to'g'ri topish.
    'poll_vote': 10,
    # Viral duel: taklif qilgan o'quvchiga +100 tanga (ikkinchi akkaunt bilan farm qilinardi).
    'duel_invite_bonus': 5,
    # Referral: taklif qiluvchiga kuniga shuncha bonus (audit AUTH-009).
    'referral_bonus': 10,
    # Tasodifiy test va "Xatolar ustida ishlash" (`is_random=True`) har safar yangi TestSet
    # yaratgani uchun `is_repeat` cheklovidan o'tib ketardi; kunlik mukofot limiti qo'yiladi.
    'random_test': 5,
}

# "Bir marta" (claim_once) yozuvlari uchun sana belgisi: ular kunga bog'lanmaydi.
_ONCE_DAY = date(1970, 1, 1)


def _claim(subject_id, source, day, item, limit):
    """Atomik: (subject, source, day, item) hisoblagichi limitdan past bo'lsa oshiradi."""
    from django.db import IntegrityError, transaction
    from django.db.models import F

    from .models import RewardClaim

    lookup = {'subject_id': int(subject_id), 'source': source, 'day': day, 'item': str(item)[:128]}
    for _ in range(2):  # birinchi qator parallel yaratilsa — bir marta qayta urinamiz
        try:
            with transaction.atomic():
                row, _created = RewardClaim.objects.select_for_update().get_or_create(**lookup)
                if row.count >= limit:
                    return False
                RewardClaim.objects.filter(pk=row.pk).update(count=F('count') + 1)
                return True
        except IntegrityError:
            continue
    return False


def claim_daily_reward(profile_id, source):
    """Shu manbadan bugungi (Toshkent sanasi) mukofot hali limit ichidami. Har chaqiruv
    bitta urinishni sarflaydi. Hisob DB'da — Redis o'chsa ham limit saqlanadi (audit
    ECON-005), kun esa server soati (UTC) emas, `timezone.localdate()` (ECON-004)."""
    return _claim(profile_id, source, timezone.localdate(), '', DAILY_REWARD_LIMITS[source])


def claim_once(profile_id, source, item_id, ttl_days=30):
    """Bitta element (masalan, bitta reel savoli) uchun mukofot faqat bir marta. Kunlik
    takror kerak bo'lsa, chaqiruvchi sanani item_id ichiga qo'shadi. `ttl_days` eski
    kesh API'si bilan moslik uchun qoldirilgan."""
    return _claim(profile_id, source, _ONCE_DAY, item_id, 1)


def award_capped_xp(profile, source, amount):
    """Kunlik limit ichida bo'lsa XP'ni atomik qo'shadi (daraja ham qayta hisoblanadi).
    Qaytaradi: haqiqatda berilgan XP (limitdan oshsa 0)."""
    if profile is None or amount <= 0:
        return 0
    if not claim_daily_reward(profile.id, source):
        return 0
    profile.add_xp(amount)
    return 0 if profile.is_privileged else amount
