import json
import logging
import re
from django.conf import settings
from core.ai_client import ask_groq

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """Sen O'zbekistondagi DTM (BBA) va Milliy Sertifikat imtihonlariga tayyorlovchi eng professional AI Mentorsan.
Talabgor test savolida XATO variantni tanladi.
Sening vazifang kitobiy quruq ma'ruza o'qish EMAS! Maksimal 2-3 qatorli, miyani chaqnatuvchi (Aha! Moment) va xotirada bir umrga muhrlanuvchi 2 ta narsani O'ZBEK TILIDA taqdim et:

1. why_wrong (Nega adashdingiz?):
   Talabgor tanlagan xato javob aslida nimani anglatishi, qaysi voqea/davr/atamaga oidligi yoki nima sababdan noto'g'riligini aniq 1 ta lo'nda jumlada tushuntir (masalan: "Xolchayon — Kushonlar davri yodgorligi, Oks ibodatxonasi esa Taxiti Sangin yodgorligida topilgan").
2. memory_hack (Eslab qolish kodi):
   To'g'ri javobni bir umr eslab qolish uchun o'zbek tilida formula, mnemonika, assotsiatsiya yoki qiyosiy zanjir ber (masalan: "Oks ibodatxonasi = Taxiti Sangin (Oks daryosi - Toshli Taxt)").

QAT'IY TALAB:
- Javobni FAQAT valid JSON formatida qaytar.
- JSON formati:
{
  "why_wrong": "...",
  "memory_hack": "..."
}"""


def _clean_json_output(raw_text: str) -> dict:
    """Markdown bloklar va <think> qoldiqlarini tozalab, qat'iy JSON ajratib oladi."""
    if not raw_text:
        return {}

    text = re.sub(r'<think>.*?</think>', '', raw_text, flags=re.DOTALL).strip()
    text = re.sub(r'^```json\s*', '', text)
    text = re.sub(r'\s*```$', '', text).strip()

    try:
        return json.loads(text)
    except Exception:
        # JSON regex orqali {...} qismini qidirish
        match = re.search(r'\{.*\}', text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(0))
            except Exception:
                pass
    return {}


def generate_mistake_explanation(
    question_body: str,
    selected_option_text: str,
    selected_option_id: int,
    correct_option_text: str,
    correct_option_id: int = None,
    topic_title: str = ""
) -> dict:
    """Xato qilingan savol uchun 1-2 jumlalik why_wrong va memory_hack yaratadi."""
    user_prompt = f"""SAVOL:
{question_body}
{f"Mavzu: {topic_title}" if topic_title else ""}

TALABGOR TANLAGAN XATO JAVOB:
"{selected_option_text}" (ID: {selected_option_id})

TO'G'RI JAVOB:
"{correct_option_text}" {f"(ID: {correct_option_id})" if correct_option_id else ""}

Iltimos, talabgorga nima uchun aynan shu xato variantni tanlaganini tushuntiruvchi why_wrong va bir umr eslab qolish kodi memory_hack JSON-ni yaratib ber."""

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_prompt},
    ]

    # Groq / LLM orqali JSON-schema asosida olish
    try:
        raw_response = ask_groq(
            messages=messages,
            temperature=0.2,
            response_format={"type": "json_object"},
            timeout=10,
        )

        if raw_response:
            parsed = _clean_json_output(raw_response)
            if parsed.get('why_wrong') and parsed.get('memory_hack'):
                return {
                    'why_wrong': parsed['why_wrong'].strip(),
                    'memory_hack': parsed['memory_hack'].strip(),
                    'is_fallback': False,
                }
    except Exception as e:
        logger.warning(f"Sprint AI Layfxak generatsiyasida xatolik: {e}")

    # Fallback (AI ishlamay qolganda ham o'quvchi to'xtab qolmasligi uchun)
    fallback_opt = selected_option_text or "Tanlangan variant"
    fallback_correct = correct_option_text or "to'g'ri javob"
    return {
        'why_wrong': f"Siz tanlagan \"{fallback_opt}\" bu savol mantiqiga to'g'ri kelmaydi.",
        'memory_hack': f"Kalit bog'liqlik: savol mohiyatini \"{fallback_correct}\" bilan mustahkamlang.",
        'is_fallback': True,
    }

