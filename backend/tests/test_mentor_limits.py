"""AI Mentor kunlik chegarasi tarif farqi bo'lishi kerak.

Ilgari chegara hamma uchun bitta raqam (30/kun) edi. Ikki oqibat bor edi:

  1. Groq xarajati obuna sotib olmagan foydalanuvchilarga ham to'liq ketardi.
  2. PRO obuna AI Mentor bo'yicha HECH QANDAY ustunlik bermasdi — ya'ni ishlaydigan
     asosiy funksiya obunaning qiymati emas edi.

Endi: obunasiz 5/kun, PRO 50/kun. Chegaradan oshganda mentor javob berishda davom
etadi, lekin LLM'siz (qoidaga asoslangan zaxira javob) — shuning uchun test
`_mentor_ai_allowed` qaytargan bayroqni tekshiradi, javob matnini emas.
"""
from django.contrib.auth.models import User
from django.core.cache import cache
from django.test import TestCase

from accounts.models import ensure_profile_for_user
from learning.services import (
    MENTOR_AI_DAILY_LIMIT_FREE, MENTOR_AI_DAILY_LIMIT_PRO,
    _mentor_ai_allowed, mentor_daily_limit,
)


class MentorDailyLimitTests(TestCase):
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user('mentor_user', password='x')
        self.profile = ensure_profile_for_user(self.user)

    def _burn(self, count, is_pro):
        """`count` marta so'rov yuboradi va oxirgi javobni qaytaradi."""
        allowed = None
        for _ in range(count):
            allowed = _mentor_ai_allowed(self.user.id, is_pro=is_pro)
        return allowed

    def test_free_user_is_cut_off_after_the_free_limit(self):
        # Chegaragacha bo'lgan so'rovlar AI'ga o'tadi.
        self.assertTrue(self._burn(MENTOR_AI_DAILY_LIMIT_FREE, is_pro=False))
        # Keyingisi — yo'q.
        self.assertFalse(_mentor_ai_allowed(self.user.id, is_pro=False))

    def test_pro_user_keeps_going_past_the_free_limit(self):
        self._burn(MENTOR_AI_DAILY_LIMIT_FREE + 1, is_pro=True)
        self.assertTrue(_mentor_ai_allowed(self.user.id, is_pro=True))

    def test_pro_user_is_cut_off_at_the_pro_limit(self):
        self.assertTrue(self._burn(MENTOR_AI_DAILY_LIMIT_PRO, is_pro=True))
        self.assertFalse(_mentor_ai_allowed(self.user.id, is_pro=True))

    def test_pro_limit_is_higher_than_free(self):
        self.assertGreater(mentor_daily_limit(True), mentor_daily_limit(False))

    def test_counter_is_shared_so_upgrading_mid_day_does_not_reset_usage(self):
        """Obuna kun o'rtasida yoqilsa: ishlatilgan javoblar qaytarilmaydi, lekin
        o'quvchi darhol yuqoriroq chegaraga o'tadi."""
        self._burn(MENTOR_AI_DAILY_LIMIT_FREE + 1, is_pro=False)
        self.assertFalse(_mentor_ai_allowed(self.user.id, is_pro=False))

        # Xuddi shu hisoblagich bilan, lekin PRO chegarasi ostida — yana ishlaydi.
        self.assertTrue(_mentor_ai_allowed(self.user.id, is_pro=True))
