"""Kunlik mukofot chegaralari (XP/tanga "farm" himoyasi).

Mini-o'yinlar, reels savoli, flashcard va fokus sessiyasi natijani klientdan oladi
va har bir POST uchun XP/tanga berardi. Skript bilan (yoki to'g'ri javob ko'rsatilgan
ekrandan keyin qayta yuborib) cheksiz tanga yig'ish, do'kondagi narsalarni bepul
olish va reytingni sun'iy ko'tarish mumkin edi.

Har bir manba uchun foydalanuvchiga kunlik limit qo'yiladi. Limitdan oshganda
mashq davom etadi, faqat mukofot berilmaydi.
"""
from datetime import date

from django.core.cache import cache

# Manba -> kuniga necha marta mukofot beriladi.
DAILY_REWARD_LIMITS = {
    'game_timeline': 10,
    'game_map': 10,
    'game_character': 10,
    'reels_quiz': 30,
    'flashcards': 5,
    'study_session': 6,
    'battle_bot': 15,
    # Mukofot emas, AI xarajati: ochiq javobni Groq bilan baholash (user.id bo'yicha).
    'open_question_ai': 60,
    # Esse tekshiruvi: qulflangan (bepul) natija ham to'liq Groq chaqiruvi. Limitsiz bo'lsa,
    # bitta o'quvchi bepul kvotani tugatib, AI'ni hamma uchun o'chirib qo'yishi mumkin edi.
    'essay_ai': 10,
    # Fokus Sprint xato tushuntirishi: kesh topilmaganda pullik LLM chaqiruvi (user.id).
    'sprint_explain_ai': 40,
}

_DAY_SECONDS = 60 * 60 * 26


def claim_daily_reward(profile_id, source):
    """Shu manbadan bugungi mukofot hali limit ichidami. Har chaqiruv bitta urinishni sarflaydi."""
    limit = DAILY_REWARD_LIMITS[source]
    key = f"reward_cap:{source}:{profile_id}:{date.today().isoformat()}"
    cache.add(key, 0, _DAY_SECONDS)
    try:
        count = cache.incr(key)
    except ValueError:
        cache.set(key, 1, _DAY_SECONDS)
        count = 1
    return count <= limit


def claim_once(profile_id, source, item_id, ttl_days=30):
    """Bitta element (masalan, bitta reel savoli) uchun mukofot faqat bir marta."""
    return cache.add(f"reward_once:{source}:{profile_id}:{item_id}", 1, ttl_days * 24 * 60 * 60)
