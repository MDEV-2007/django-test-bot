"""Mashq rejimlari (kunlik sikl, stress zali tasodifiy testi, sinf jangi) uchun xavfsiz savol puli.

Bu rejimlar savolni to'g'ri javobi bilan birga klientga beradi yoki natijada javobni
ochadi. Shuning uchun jonli mock va hali nashr qilinmagan (qoralama) testlarning savollari
bu puldan chiqariladi — aks holda o'quvchi mockdan oldin javoblarni ko'rib olardi.
"""
from django.db.models import Q

from tests_app.models import Question, TestSet


def protected_test_q():
    """Savollari mashq rejimiga chiqmasligi kerak bo'lgan testlar."""
    return Q(is_live_mock=True) | Q(is_published=False, is_random=False)


def practice_question_pool():
    # NULL'ni chiqarib tashlaymiz: savolsiz test `NOT IN (NULL)` qilib butun pulni bo'shatib qo'yardi.
    protected_ids = (TestSet.objects.filter(protected_test_q(), questions__isnull=False)
                     .values('questions'))
    return Question.objects.exclude(id__in=protected_ids)
