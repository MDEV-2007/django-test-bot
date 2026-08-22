# tests_app/services/grading.py
# ============================================================
# Ochiq javobli savollarni Groq orqali baholash
# ============================================================
import json
import logging

from core.ai_client import ask_groq

logger = logging.getLogger(__name__)

GRADING_SYSTEM_PROMPT = """Sen ochiq javobli test savollarini baholovchi adolatli imtihonchisan (fan har xil bo'lishi mumkin: tarix, ona tili, matematika, biologiya).

QOIDALAR:
1. O'quvchining javobini FAQAT berilgan "namunaviy to'g'ri javob" bilan solishtirib baho ber.
2. Imlo xatolari, katta-kichik harf farqi yoki so'zlarning tartibi ahamiyatsiz — MOHIYAT to'g'ri bo'lsa, to'g'ri deb top.
3. Agar javobda to'g'ri narsa qisman bo'lsa-yu, asosiy jавоб (masalan sana, ism, atama) noto'g'ri yozilgan bo'lsa — xato deb top.
4. Bo'sh yoki "bilmayman" kabi javoblarni xato deb top.
5. Har bir baho uchun juda qisqa (5-10 so'z) izoh yoz.

Faqat so'ralgan JSON formatida javob ber, boshqa hech narsa yozma."""

GRADING_USER_PROMPT_TEMPLATE = """Quyidagi {count} ta ochiq javobli savolni baholab, JSON qaytar:

{items_block}

Javobni faqat quyidagi formatda qaytar:
{{"results": [{{"index": 1, "is_correct": true, "note": "qisqa izoh"}}, ...]}}
"results" ro'yxati "index" bo'yicha tartiblangan va yuqoridagi barcha {count} ta savolni o'z ichiga olishi shart."""


def _format_items(items):
    lines = []
    for i, item in enumerate(items, start=1):
        student_answer = item['student_answer'] or "(bo'sh qoldirilgan)"
        lines.append(
            f"{i}) Savol: {item['question_text']}\n"
            f"   Namunaviy to'g'ri javob: {item['reference_answer']}\n"
            f"   O'quvchi javobi: {student_answer}"
        )
    return "\n\n".join(lines)


def grade_open_answers(items):
    """items: [{'question_text', 'reference_answer', 'student_answer'}, ...]
    Returns a list of {'is_correct': bool, 'note': str} aligned by position with `items`,
    or None if Groq is unavailable/unreachable/returns something unusable — callers should
    fall back to marking everything unanswered/ungraded in that case."""
    if not items:
        return []

    user_prompt = GRADING_USER_PROMPT_TEMPLATE.format(
        count=len(items),
        items_block=_format_items(items),
    )
    raw = ask_groq(
        [
            {"role": "system", "content": GRADING_SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.2,
        response_format={"type": "json_object"},
    )
    if not raw:
        return None

    try:
        data = json.loads(raw)
        results = data['results']
        if not isinstance(results, list) or len(results) != len(items):
            raise ValueError("results length mismatch")
        by_index = {r['index']: r for r in results}
        ordered = [by_index[i] for i in range(1, len(items) + 1)]
        return [{'is_correct': bool(r['is_correct']), 'note': str(r.get('note', ''))} for r in ordered]
    except (json.JSONDecodeError, TypeError, KeyError, ValueError) as e:
        logger.warning("Groq grading response unusable: %r (%s)", raw, e)
        return None
