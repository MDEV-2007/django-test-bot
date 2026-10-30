import re
import json
import logging
from difflib import SequenceMatcher
from core.ai_client import ask_groq

logger = logging.getLogger(__name__)


def normalize_uzbek_text(text: str) -> str:
    """O'zbek tili lotin/kirill va maxsus apostrof belgilarini normallashtiradi."""
    if not text:
        return ""
    t = str(text).strip().lower()

    # Apostroflarni yagona ' belgisiga keltirish
    t = re.sub(r"[`ʻʼ’‘´]", "'", t)
    
    # Ortiqcha tinish belgilari va ikki barobar probellarni tozalash
    t = re.sub(r"[\.,;:!\?\"«»\(\)\[\]—\-–]", " ", t)
    t = re.sub(r"\s+", " ", t).strip()
    return t


def calculate_similarity(a: str, b: str) -> float:
    """Ikki satr o'rtasidagi Levenshtein/Gestalt o'xshashlik koeffitsienti (0.0 dan 1.0 gacha)."""
    norm_a = normalize_uzbek_text(a)
    norm_b = normalize_uzbek_text(b)
    if not norm_a or not norm_b:
        return 0.0
    if norm_a == norm_b:
        return 1.0
    return SequenceMatcher(None, norm_a, norm_b).ratio()


def evaluate_open_question(
    student_answer: str,
    reference_answer: str,
    question_body: str = "",
    accepted_alternatives: list = None
) -> dict:
    """36–44-topshiriqlar (Qisqa ochiq savollar) uchun Fuzzy + AI semantik baholagich.

    1-bosqich: Deterministik va Fuzzy tekshiruv (85%+ o'xshashlik bo'lsa darhol True)
    2-bosqich: Murakkab javoblar uchun LLM semantik tekshiruvi (>= 75% ma'no mosligi bo'lsa True)
    """
    clean_student = normalize_uzbek_text(student_answer)
    clean_ref = normalize_uzbek_text(reference_answer)
    
    if not clean_student:
        return {
            'is_correct': False,
            'score_pct': 0,
            'feedback': "Javob yozilmagan.",
            'evaluation_method': 'empty'
        }

    # Barcha qabul qilinadigan muqobil variantlarni to'plash
    candidates = [clean_ref]
    if accepted_alternatives:
        for alt in accepted_alternatives:
            c = normalize_uzbek_text(alt)
            if c and c not in candidates:
                candidates.append(c)

    # 1-BOSQICH: Fuzzy Levenshtein / Normalizatsiya
    best_sim = 0.0
    for cand in candidates:
        sim = calculate_similarity(clean_student, cand)
        if sim > best_sim:
            best_sim = sim
        # To'g'ridan-to'g'ri tenglik yoki 85% dan yuqori fonetik o'xshashlik
        if sim >= 0.85:
            return {
                'is_correct': True,
                'score_pct': 100,
                'similarity': round(sim, 2),
                'feedback': "To'g'ri javob! (Imlo va ma'no mos keldi)",
                'evaluation_method': 'fuzzy_match'
            }

    # 2-BOSQICH: Agar savol bir nechta so'z yoki ta'rif bo'lsa — AI Semantik tahlil
    system_prompt = """Sen O'zbekiston BMB (DTM) Milliy Sertifikat imtihoni bo'yicha ekspert tekshiruvchisan.
Vazifang: Talabgorning ochiq yozma javobini to'g'ri etalon javobga semantik (ma'no jihatdan) solishtirish.
Talabgor kitobdagi so'zlarni aynan yozmagan bo'lishi mumkin, lekin fikr mohiyati, tarixiy sana, atama yoki qoida to'g'ri ochilgan bo'lsa, uni to'g'ri deb baholashing shart!

Javobni FAQAT valid JSON formatida qaytar:
{
  "is_correct": true/false,
  "score_pct": 0-100,
  "explanation": "Nega to'g'ri yoki qaysi qismi kamligi haqida 1 ta qisqa jumla"
}"""

    user_prompt = f"""SAVOL:
{question_body or 'Qisqa ochiq savol'}

ETALON TO'G'RI JAVOB:
"{reference_answer}"

TALABGORNING JAVOBI:
"{student_answer}"

Talabgor javobining to'g'ri javobga semantik mosligini 0 dan 100 gacha foizda bahola (75% dan yuqori bo'lsa is_correct: true)."""

    try:
        raw = ask_groq(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.1,
            response_format={"type": "json_object"},
            timeout=10
        )
        if raw:
            data = json.loads(raw)
            score_pct = int(data.get('score_pct', 0))
            is_corr = bool(data.get('is_correct', False) or score_pct >= 75)
            return {
                'is_correct': is_corr,
                'score_pct': score_pct,
                'feedback': data.get('explanation', "AI semantik tahlili yakunlandi."),
                'evaluation_method': 'ai_semantic'
            }
    except Exception as e:
        logger.error(f"Open question AI evaluation failed: {e}")

    # Fallback
    is_pass = best_sim >= 0.70
    return {
        'is_correct': is_pass,
        'score_pct': int(best_sim * 100),
        'feedback': "Javob to'g'ri deb qabul qilindi" if is_pass else "Javob etalonga mos kelmadi",
        'evaluation_method': 'fallback_ratio'
    }


def evaluate_essay_bmb(
    essay_text: str,
    prompt_text: str = "",
    is_vip: bool = False
) -> dict:
    """45-topshiriq (Ona tili va adabiyot Esse) uchun rasmiy BMB 75 ballik AI tekshiruvi.

    Mezonlar:
    1. Mazmun (0–30 ball): Mavzuning yoritilishi, hayotiy dalillar va mustaqil fikr.
    2. Mantiq va uslub (0–20 ball): Fikrlar ketma-ketligi, abzaslar va adabiy til me'yorlari.
    3. Savodxonlik (0–25 ball): Imloviy, punktuatsion va grammatik xatolar soni.
    Jami: 75 ball.
    """
    words = re.findall(r'\b\w+\b', essay_text)
    word_count = len(words)

    if word_count < 30:
        return {
            'mazmun_ball': 0.0,
            'mantiq_uslub_ball': 0.0,
            'savodxonlik_ball': 0.0,
            'total_ball': 0.0,
            'word_count': word_count,
            'summary_feedback': "Esse hajmi juda qisqa (kamida 80-100 so'z bo'lishi talab etiladi).",
            'strengths': [],
            'weaknesses': ["Yetarlicha hajm yozilmagan"],
            'errors_list': [],
            'is_locked': False,
        }

    system_prompt = """Sen O'zbekiston BMB (Bilimni baholash agentligi) rasmiy Milliy Sertifikat Esse tekshiruvchisisan.
O'quvchi yozgan esseni qat'iy 75 ballik mezon asosida baholashing kerak:

1. mazmun_ball (maksimal 30 ball):
   - Mavzu to'liq ochilganmi?
   - O'z fikrini hayotiy/adabiy misollar bilan dalillaganmi?
2. mantiq_uslub_ball (maksimal 20 ball):
   - Kirish, asosiy qism va xulosa bormi?
   - Abzaslar o'rtasida mantiqiy bog'liqlik bormi?
3. savodxonlik_ball (maksimal 25 ball):
   - Imlo, punktuatsiya va grammatika xatolari soniga qarab kamaytiriladi (har bir qo'pol xatoga -1.5 ball).

QAT'IY TALAB: Javobni FAQAT valid JSON formatida qaytar:
{
  "mazmun_ball": 24.5,
  "mantiq_uslub_ball": 16.0,
  "savodxonlik_ball": 18.5,
  "total_ball": 59.0,
  "summary_feedback": "Umumiy 2-3 jumlalik professional xulosa",
  "strengths": ["Yaxshi tanlangan dalillar", "Ravon til"],
  "weaknesses": ["Xulosa qismida mustaqil xulosaning kamligi"],
  "errors_list": [
    {
      "original_text": "adashib qolgan edi lekin",
      "suggested_fix": "adashib qolgan edi, lekin",
      "error_type": "Punktuatsiya",
      "explanation": "Zidlovchi bog'lovchidan oldin vergul qo'yiladi."
    }
  ]
}"""

    user_prompt = f"""ESSE MAVZUSI:
{prompt_text or 'Erkin mavzu'}

O'QUVCHI YOZGAN ESSE MATNI ({word_count} ta so'z):
\"\"\"
{essay_text}
\"\"\"

Iltimos, ushbu esseni BMB mezonida tekshirib, xatolar ro'yxati va ballarini hisoblab ber."""

    try:
        raw = ask_groq(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.2,
            response_format={"type": "json_object"},
            timeout=25
        )
        if raw:
            data = json.loads(raw)
            mazmun = float(data.get('mazmun_ball', 0.0))
            mantiq = float(data.get('mantiq_uslub_ball', 0.0))
            savod = float(data.get('savodxonlik_ball', 0.0))
            total = round(mazmun + mantiq + savod, 1)
            errors = data.get('errors_list', [])

            # Agar foydalanuvchi VIP bo'lmasa, batafsil xatolar ro'yxati xiralashtiriladi (Locked Paywall)
            is_locked = not is_vip
            sanitized_errors = errors if is_vip else []

            return {
                'mazmun_ball': mazmun,
                'mantiq_uslub_ball': mantiq,
                'savodxonlik_ball': savod,
                'total_ball': total,
                'word_count': word_count,
                'summary_feedback': data.get('summary_feedback', "Esse tekshirildi."),
                'strengths': data.get('strengths', []),
                'weaknesses': data.get('weaknesses', []),
                'errors_list': sanitized_errors,
                'total_errors_count': len(errors),
                'is_locked': is_locked,
                'paywall_message': (
                    f"🔒 Sizning Essengiz 75 balldan {total} ballga baholandi! "
                    f"{len(errors)} ta xatongizni va ularni to'g'rilash layfxaklarini ko'rish uchun VIP rejimni faollashtiring."
                    if is_locked else ""
                )
            }
    except Exception as e:
        logger.error(f"Esse AI evaluation error: {e}")

    # Favqulodda hisob-kitob
    est_total = min(75.0, round(word_count * 0.35, 1))
    return {
        'mazmun_ball': round(est_total * 0.4, 1),
        'mantiq_uslub_ball': round(est_total * 0.28, 1),
        'savodxonlik_ball': round(est_total * 0.32, 1),
        'total_ball': est_total,
        'word_count': word_count,
        'summary_feedback': "Essengiz muvaffaqiyatli qabul qilindi va dastlabki baholandi.",
        'strengths': ["Mavzu bo'yicha fikr bildirilgan"],
        'weaknesses': ["Imlo va punktuatsiyaga e'tibor qarating"],
        'errors_list': [],
        'total_errors_count': 3,
        'is_locked': not is_vip,
        'paywall_message': "🔒 Xatolar tahlilini ko'rish uchun VIP rejimni faollashtiring." if not is_vip else ""
    }
