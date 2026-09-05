"""CEFR Writing topshirig'ini AI orqali baholash.

Nega alohida modul (grading.py'dan farqli): ochiq savol "to'g'ri/xato" deb baholanadi,
Writing esa hech qachon shunday baholanmaydi — u to'rt mezon bo'yicha 0-5 ballga va taxminiy
CEFR darajasiga qo'yiladi. Shuning uchun prompt ham, natija shakli ham butunlay boshqa.
"""
import json
import logging
import re

from core.ai_client import ask_groq

logger = logging.getLogger(__name__)

CRITERIA = ('task', 'coherence', 'lexis', 'grammar')

WRITING_SYSTEM_PROMPT = """Sen CEFR imtihonining Writing qismini baholovchi tajribali ekspertsan.

BAHOLASH MEZONLARI (har biri 0 dan 5 gacha, yarim ball ishlatilmaydi):
- task: topshiriq talablari bajarilganmi, barcha nuqtalar yoritilganmi, hajm yetarlimi.
- coherence: matn tuzilishi, abzatslar, bog'lovchilar, fikrlar ketma-ketligi.
- lexis: so'z boyligi, so'zlarning to'g'ri va xilma-xil ishlatilishi.
- grammar: grammatik tuzilmalar rang-barangligi va aniqligi.

QOIDALAR:
1. Faqat o'quvchi yozgan matnni bahola. Uni yaxshilab qayta yozma.
2. Hajm talabidan sezilarli kam bo'lsa, "task" ballini pasaytir va buni izohda ayt.
3. Mavzuga umuman aloqasi bo'lmagan matnga "task" bo'yicha 0 qo'y.
4. Baho izohlarini O'ZBEK TILIDA yoz — o'quvchi o'zbek. Lekin xato jumlalarni ingliz tilida keltir.
5. "corrections" — matndagi eng muhim 3-6 ta xato: har biri {"wrong": "...", "better": "...", "why": "..."}.
6. "level" — umumiy CEFR darajasi: A1, A2, B1, B2, C1 yoki C2.

Faqat so'ralgan JSON'ni qaytar, boshqa hech narsa yozma."""

WRITING_USER_TEMPLATE = """TOPSHIRIQ:
{prompt}

TALAB QILINGAN HAJM: kamida {min_words} so'z{max_part}
O'QUVCHI YOZGAN SO'ZLAR SONI: {word_count}

O'QUVCHI MATNI:
\"\"\"
{answer}
\"\"\"

Javobni faqat quyidagi JSON formatida qaytar:
{{"task": 4, "coherence": 3, "lexis": 4, "grammar": 3, "level": "B1",
  "summary": "2-3 jumlalik umumiy xulosa",
  "strengths": ["kuchli tomon", "..."],
  "improvements": ["nimani yaxshilash kerak", "..."],
  "corrections": [{{"wrong": "I go yesterday", "better": "I went yesterday", "why": "O'tgan zamon"}}]}}"""


def count_words(text):
    """Writing hajmini sanaydi — apostrofli so'z ("don't") bitta so'z, tinish belgilari
    sanalmaydi. Frontenddagi jonli hisoblagich ham aynan shu qoidani takrorlaydi, shuning
    uchun o'quvchi ko'rgan raqam bilan baholashdagi raqam bir xil bo'ladi."""
    return len(re.findall(r"[A-Za-zЀ-ӿ][A-Za-zЀ-ӿ'’\-]*", text or ''))


def _clamp_score(value):
    try:
        score = float(value)
    except (TypeError, ValueError):
        return 0.0
    return max(0.0, min(5.0, round(score * 2) / 2))


def review_writing(prompt, answer, min_words=None, max_words=None):
    """Bitta Writing javobini baholaydi.

    Qaytaradi: {'task','coherence','lexis','grammar','overall','level','summary',
    'strengths','improvements','corrections','word_count'} yoki AI ishlamasa None —
    chaqiruvchi bunda o'quvchiga "keyinroq urinib ko'ring" deydi va ballni saqlamaydi.
    """
    text = (answer or '').strip()
    if not text:
        return None

    word_count = count_words(text)
    max_part = f", ko'pi bilan {max_words} so'z" if max_words else ""
    user_prompt = WRITING_USER_TEMPLATE.format(
        prompt=prompt or '(topshiriq matni berilmagan)',
        min_words=min_words or 0,
        max_part=max_part,
        word_count=word_count,
        answer=text[:6000],
    )

    raw = ask_groq(
        [
            {"role": "system", "content": WRITING_SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.2,
        response_format={"type": "json_object"},
        timeout=45,
    )
    if not raw:
        logger.warning("writing review: AI provider unavailable")
        return None

    try:
        data = json.loads(raw)
    except (TypeError, ValueError):
        logger.warning("writing review: unparsable AI response")
        return None

    scores = {key: _clamp_score(data.get(key)) for key in CRITERIA}
    overall = round(sum(scores.values()) / len(CRITERIA) * 2) / 2

    level = str(data.get('level') or '').strip().upper()
    if level not in ('A1', 'A2', 'B1', 'B2', 'C1', 'C2'):
        # AI daraja bermasa yoki noto'g'ri bersa — o'rtacha balldan kelib chiqamiz.
        level = ('A1', 'A2', 'B1', 'B1', 'B2', 'C1')[min(5, int(overall))]

    def _str_list(value, limit=5):
        if not isinstance(value, list):
            return []
        return [str(item).strip()[:200] for item in value[:limit] if str(item).strip()]

    corrections = []
    for item in (data.get('corrections') or [])[:6]:
        if not isinstance(item, dict):
            continue
        wrong = str(item.get('wrong') or '').strip()[:300]
        if not wrong:
            continue
        corrections.append({
            'wrong': wrong,
            'better': str(item.get('better') or '').strip()[:300],
            'why': str(item.get('why') or '').strip()[:200],
        })

    return {
        **scores,
        'overall': overall,
        'level': level,
        'summary': str(data.get('summary') or '').strip()[:600],
        'strengths': _str_list(data.get('strengths')),
        'improvements': _str_list(data.get('improvements')),
        'corrections': corrections,
        'word_count': word_count,
    }
