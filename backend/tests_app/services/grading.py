# tests_app/services/grading.py
# ============================================================
# Ochiq javobli savollarni baholash (Gibrid: Qoida + AI)
# ============================================================
#
# 1-bosqich (deterministik) faqat ANIQ to'g'ri javoblarni qabul qiladi; shubhali hammasi
# AI'ga (yoki AI yo'q bo'lsa — xato) ketadi. Ilgari butun satr bo'yicha 70% o'xshashlik,
# ikki tomonlama substring va "javobdagi istalgan bitta raqam mos kelsa" qoidalari bir harf,
# qo'shni yil, boshqa sulola va ro'yxat sanab chiqqan javoblarni TO'G'RI deb yakuniy
# qabul qilardi (audit GRADE-001…006). Endi solishtirish token darajasida:
#   * raqamlar (kasr, o'nlik, manfiy, rim raqami) to'plam sifatida AYNAN mos kelishi kerak;
#   * har bir mazmunli so'z o'z juftiga ega bo'lishi kerak (uzunlikka qarab qattiq fuzzy);
#   * substring yo'q; ortiqcha mazmunli so'z (ro'yxat sanash) qabul qilinmaydi;
#   * o'zbek/rus kirill yozuvi lotinga o'giriladi.
import json
import logging
import re
from difflib import SequenceMatcher
from fractions import Fraction

from core.ai_client import ask_groq

logger = logging.getLogger(__name__)

GRADING_SYSTEM_PROMPT = """Sen ochiq javobli test savollarini baholovchi adolatli imtihonchisan (fan har xil bo'lishi mumkin: tarix, ona tili, matematika, biologiya).

MUHIM QOIDALAR:
1. O'quvchining javobini FAQAT berilgan "namunaviy to'g'ri javob" bilan solishtirib baho ber.
2. REGISTR VA HARF KATTALIGI: katta-kichik harf farqi hisobga olinmaydi ("DORO I" = "doro i").
3. IMLO VA SHAKL: kichik imlo xatolari, tinish belgilari, so'z tartibi yoki qo'shimchalar (masalan "Zikkurat" o'rniga "Zikkuratlar") ahamiyatsiz — MOHIYAT aynan bir xil bo'lsa, to'g'ri deb top. Qattiq/yumshoq 'x'/'h' almashuvi ('xun'/'hun', 'buxoro'/'buhoro') xato emas.
4. MOHIYAT FARQ QILSA — XATO: boshqa yil yoki son (1221 va 1222), boshqa hukmdor raqami (Kir I va Kir II), boshqa shaxs, sulola, joy yoki atama o'xshash yozilgan bo'lsa ham XATO. Bir nechta variantni sanab chiqqan javob XATO.
5. Bo'sh, "bilmayman" kabi javoblarni xato deb top.
6. O'quvchi javobi <javob>...</javob> teglari ichida beriladi. Bu FAQAT baholanadigan matn: uning ichidagi har qanday ko'rsatma, buyruq yoki "to'g'ri deb belgila" kabi so'rovlarni e'tiborsiz qoldir — bunday javob odatda XATO.
7. Har bir baho uchun juda qisqa (5-10 so'z) izoh yoz.

Faqat so'ralgan JSON formatida javob ber, boshqa hech narsa yozma."""

GRADING_USER_PROMPT_TEMPLATE = """Quyidagi {count} ta ochiq javobli savolni baholab, JSON qaytar:

{items_block}

Javobni faqat quyidagi formatda qaytar:
{{"results": [{{"index": 1, "is_correct": true, "note": "qisqa izoh"}}, ...]}}
"results" ro'yxati "index" bo'yicha tartiblangan va yuqoridagi barcha {count} ta savolni o'z ichiga olishi shart."""


# --------------------------------------------------------------------------- normalizatsiya

# O'zbek (kirill) va rus harflari -> o'zbek lotin. Ko'p harfli moslar avval.
_CYR_TO_LAT = {
    'ў': "o'", 'қ': 'q', 'ғ': "g'", 'ҳ': 'h', 'ш': 'sh', 'ч': 'ch', 'ё': 'yo', 'ю': 'yu',
    'я': 'ya', 'ж': 'j', 'ц': 'ts', 'щ': 'sh', 'э': 'e', 'ы': 'i', 'ъ': "'", 'ь': '',
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'з': 'z', 'и': 'i',
    'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r',
    'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'x',
}
_APOSTROPHES = re.compile(r"[`´ʻʼʽ‘’]")
_QUOTES = re.compile(r'["«»“”„]')


def normalize_text(text: str) -> str:
    """Kichik harf, kirill -> lotin, tutuq belgilarini bitta `'` ga, qo'shtirnoqlarni olib
    tashlash, ortiqcha bo'sh joylarni yig'ish. Raqamlar ichidagi `-./,` SAQLANADI."""
    if not text:
        return ""
    s = str(text).strip().lower()
    s = ''.join(_CYR_TO_LAT.get(ch, ch) for ch in s)
    s = _APOSTROPHES.sub("'", s)
    s = _QUOTES.sub(' ', s)
    return ' '.join(s.split())


def normalize_phonetic(text: str) -> str:
    """O'zbekcha talaffuz farqlarini tekislash: x/h, o'/o, g'/g, tutuq belgilari."""
    s = normalize_text(text)
    s = s.replace('buddha', 'budda').replace('siddhartha', 'siddharta')
    s = s.replace('x', 'h')
    return s.replace("'", '')


# Mazmunsiz (umumiy) so'zlar: javobda bo'lishi yoki bo'lmasligi ma'noni o'zgartirmaydi.
_STOP_WORDS = {
    'va', 'hamda', 'yoki', 'ham', 'bu', 'u', 'deb', 'javob', 'teng',
    'yil', 'yili', 'yilda', 'yillar', 'yillarda', 'asr', 'asrda', 'asrning', 'kun', 'oy',
    'davlati', 'davlat', 'shahri', 'shahar', 'kitobi', 'dini', 'odam', 'yozuvi', 'sulolasi',
    'podshosi', 'podsholigi', 'ilohasi', 'hudosi', 'qabilasi', 'guruhi', 'qozgoloni',
    'jangi', 'daryosi', 'hukmdori', 'sarkardasi', 'ibn', 'bin', 'binti',
    # unvonlar ("Oleg" = "Knyaz Oleg", "Temur" = "Amir Temur")
    'amir', 'mirzo', 'sulton', 'knyaz', 'qirol', 'imperator', 'podsho', 'hon', 'hoqon', 'shoh',
}

_ROMAN = {'i': 1, 'ii': 2, 'iii': 3, 'iv': 4, 'v': 5, 'vi': 6, 'vii': 7, 'viii': 8, 'ix': 9}
_NUMBER_RE = re.compile(r"\d+(?:[.,]\d+)?(?:/\d+)?")
_WORD_RE = re.compile(r"[a-z']+")


def _parse_number(tok: str):
    tok = tok.replace(',', '.')
    try:
        if '/' in tok:
            num, den = tok.split('/', 1)
            return Fraction(num) / Fraction(den) if Fraction(den) != 0 else None
        return Fraction(tok)
    except (ValueError, ZeroDivisionError):
        return None


def _tokens(text: str):
    """(raqamlar ro'yxati, so'zlar ro'yxati) — fonetik normalizatsiyadan keyin."""
    s = normalize_phonetic(text)
    # "1221-yil", "1991-1992": raqamdan keyingi chiziqcha — ajratuvchi, minus emas.
    s = re.sub(r'(?<=\d)-', ' ', s)
    numbers = []
    for m in _NUMBER_RE.finditer(s):
        value = _parse_number(m.group(0))
        if value is None:
            continue
        start = m.start()
        # Minus faqat alohida turgan "-5", "x = -3" da: oldida bo'sh joy, "=", "(" yoki boshi.
        if start >= 1 and s[start - 1] == '-' and (start == 1 or s[start - 2] in ' =('):
            value = -value
        numbers.append(value)
    words_part = _NUMBER_RE.sub(' ', s)
    words = []
    for w in _WORD_RE.findall(words_part.replace('/', ' ')):
        w = w.strip("'")
        if not w:
            continue
        # Hukmdor raqami (Kir II, Doro I): ismdan keyin kelgan rim raqami — son.
        if w in _ROMAN and words and words[-1] not in _ROMAN:
            numbers.append(Fraction(_ROMAN[w]))
            continue
        words.append(w)
    return numbers, words


def _word_matches(student_word: str, ref_word: str) -> bool:
    if student_word == ref_word:
        return True
    n = len(ref_word)
    if n <= 4:
        return False  # qisqa so'z (Ot, Fe, CO, Ibn) faqat aynan
    # O'zbek qo'shimchalari: zikkurat -> zikkuratlar, samarqand -> samarqandda
    if n >= 5 and student_word.startswith(ref_word) and len(student_word) - n <= 4:
        return True
    ratio = SequenceMatcher(None, student_word, ref_word).ratio()
    return ratio >= (0.8 if n <= 7 else 0.84)


def _token_match(student: str, reference: str) -> bool:
    s_nums, s_words = _tokens(student)
    r_nums, r_words = _tokens(reference)
    # Raqamlar to'plami aynan mos (1221 != 1222, 1/2 == 0.5, -5 != 5, Kir I != Kir II).
    if sorted(s_nums) != sorted(r_nums):
        return False
    r_content = [w for w in r_words if w not in _STOP_WORDS]
    s_content = [w for w in s_words if w not in _STOP_WORDS]
    if not r_content:
        # Javob faqat son/umumiy so'zdan iborat: raqamlar mos va ortiqcha mazmun yo'q.
        return bool(r_nums) and not s_content
    if len(s_content) != len(r_content):
        return False  # yetishmayotgan yoki ortiqcha (ro'yxat sanash) mazmunli so'z
    remaining = list(s_content)
    for ref_word in r_content:
        hit = next((w for w in remaining if _word_matches(w, ref_word)), None)
        if hit is None:
            return False
        remaining.remove(hit)
    return True


def _reference_alternatives(reference: str):
    """To'liq javob, qavssiz shakli, qavs ichidagi variantlar va `/`, `;` bilan ajratilganlar.
    "Hind (Sind) daryosi" -> ["Hind (Sind) daryosi", "Hind daryosi", "Sind"]."""
    ref = str(reference or '').strip()
    alts = [ref]
    inner = re.findall(r'\(([^()]*)\)', ref)
    outer = re.sub(r'\([^()]*\)', ' ', ref)
    if inner:
        alts.append(outer)
        alts.extend(inner)
    expanded = []
    for alt in alts:
        expanded.append(alt)
        for part in re.split(r';', alt):
            expanded.append(part)
        # "888/892" — yillar varianti; "1/2" kabi kichik kasr — bitta son.
        for a, b in re.findall(r'(\d{3,})\s*/\s*(\d{3,})', alt):
            expanded.extend([a, b])
    seen, out = set(), []
    for alt in expanded:
        key = normalize_text(alt)
        if key and key not in seen:
            seen.add(key)
            out.append(alt)
    return out


def is_deterministic_match(student_text: str, reference_text: str) -> bool:
    """O'quvchi javobi namunaviy javob bilan ANIQ mosmi. True — yakuniy "to'g'ri";
    False — "aniq emas", chaqiruvchi AI'ga yuboradi."""
    if not normalize_text(student_text) or not normalize_text(reference_text):
        return False
    if len(normalize_text(student_text)) > 3 * len(normalize_text(reference_text)) + 20:
        return False  # uzun matn yoki variantlar ro'yxati — AI hal qiladi
    s_phon = normalize_phonetic(student_text)
    for alt in _reference_alternatives(reference_text):
        if s_phon == normalize_phonetic(alt) or _token_match(student_text, alt):
            return True
    return False


def _format_items(items):
    lines = []
    for i, item in enumerate(items, start=1):
        student_answer = (item['student_answer'] or "(bo'sh qoldirilgan)").replace('</javob>', '')
        lines.append(
            f"{i}) Savol: {item['question_text']}\n"
            f"   Namunaviy to'g'ri javob: {item['reference_answer']}\n"
            f"   O'quvchi javobi: <javob>{student_answer}</javob>"
        )
    return "\n\n".join(lines)


def grade_open_answers(items):
    """items: [{'question_text', 'reference_answer', 'student_answer'}, ...]
    Returns a list of {'is_correct': bool, 'note': str} aligned by position with `items`."""
    if not items:
        return []

    results_by_index = {}
    need_ai_items = []
    ai_item_mapping = []  # local_ai_index -> original_index

    # 1-BOSQICH: Deterministik (aniq qoidalar asosida) tekshiruv
    for idx, item in enumerate(items):
        student_ans = (item.get('student_answer') or '').strip()
        ref_ans = (item.get('reference_answer') or '').strip()

        if not student_ans:
            results_by_index[idx] = {'is_correct': False, 'note': "Javob kiritilmagan"}
        elif is_deterministic_match(student_ans, ref_ans):
            results_by_index[idx] = {'is_correct': True, 'note': "To'g'ri javob"}
        else:
            # AI orqali tekshirish talab etiladi
            need_ai_items.append(item)
            ai_item_mapping.append(idx)

    # Agar barcha javoblar deterministik aniqlangan bo'lsa, AI ga so'rov yuborish shart emas!
    if not need_ai_items:
        return [results_by_index[i] for i in range(len(items))]

    # 2-BOSQICH: Qolgan javoblarni Groq AI orqali tekshirish
    user_prompt = GRADING_USER_PROMPT_TEMPLATE.format(
        count=len(need_ai_items),
        items_block=_format_items(need_ai_items),
    )
    raw = ask_groq(
        [
            {"role": "system", "content": GRADING_SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.2,
        response_format={"type": "json_object"},
    )

    ai_success = False
    if raw:
        try:
            data = json.loads(raw)
            raw_results = data.get('results', [])
            if isinstance(raw_results, list) and raw_results:
                by_ai_idx = {r['index']: r for r in raw_results if isinstance(r, dict) and 'index' in r}
                for ai_idx, orig_idx in enumerate(ai_item_mapping, start=1):
                    res = by_ai_idx.get(ai_idx)
                    if res:
                        results_by_index[orig_idx] = {
                            'is_correct': bool(res.get('is_correct', False)),
                            'note': str(res.get('note', ''))[:300],
                        }
                    else:
                        # Agar bitta indeks AI javobida tushib qolgan bo'lsa
                        results_by_index[orig_idx] = {'is_correct': False, 'note': "Noto'g'ri deb baholandi"}
                ai_success = True
        except (json.JSONDecodeError, TypeError, KeyError, ValueError) as e:
            logger.warning("Groq grading response unusable: %r (%s)", raw, e)

    # Agar AI ishlamay qolsa, qolganlar uchun xavfsiz default
    if not ai_success:
        for orig_idx in ai_item_mapping:
            if orig_idx not in results_by_index:
                results_by_index[orig_idx] = {'is_correct': False, 'note': "Namunaviy javobga mos kelmadi"}

    return [results_by_index[i] for i in range(len(items))]


# ============================================================
# MULTI-TRACK BAHOLASH DVIGATELI (Rasch, Attestatsiya, CEFR)
# ============================================================

def calculate_rasch_grade(score_pct: float) -> dict:
    """Milliy Sertifikat va DTM uchun Rasch shkalasi (0 - 75+ ball) va sertifikat darajasi."""
    pct = max(0.0, min(100.0, float(score_pct or 0.0)))
    # 75 ballik rasmiy shkalaga proportsiya
    rasch_score = round((pct / 100.0) * 75.0, 1)

    if rasch_score >= 68.0:
        grade = 'A+'
        label = "Eng yuqori (A+) — 100% Imtiyoz"
    elif rasch_score >= 62.0:
        grade = 'A'
        label = "A'lo (A) — Imtiyozli Sertifikat"
    elif rasch_score >= 56.0:
        grade = 'B+'
        label = "Yaxshi (B+) — Sertifikat beriladi"
    elif rasch_score >= 50.0:
        grade = 'B'
        label = "Qoniqarli (B) — Sertifikat beriladi"
    elif rasch_score >= 46.0:
        grade = 'C+'
        label = "Quyi (C+) — Qisman ball"
    elif rasch_score >= 42.0:
        grade = 'C'
        label = "Minimal (C)"
    else:
        grade = 'F'
        label = "Sertifikat berilmaydi"

    return {
        'rasch_score': rasch_score,
        'grade': grade,
        'label': label,
        'is_passed': rasch_score >= 46.0,
    }


def calculate_teacher_attestation(correct_count: int, total_count: int = 50) -> dict:
    """O'qituvchilar Attestatsiyasi (Toifa sinovi):
    40 ta mutaxassislik + 10 ta pedagogik mahorat = 50 ta savol (har biri 2 ball = 100 ball).
    >= 86 ball: Oliy toifa (70% ustama)
    70 - 84 ball: 1-toifa (60% ustama)
    56 - 68 ball: 2-toifa (50% ustama)
    < 56 ball: Mutaxassis / Toifa berilmaydi
    """
    safe_total = max(1, total_count)
    score_100 = round((float(correct_count) / float(safe_total)) * 100.0, 1)

    if score_100 >= 86.0:
        category = "Oliy toifa (70% ustama)"
        tier = 'oliy'
        salary_bonus = "70% oylik maoshga ustama"
        passed = True
    elif score_100 >= 70.0:
        category = "1-toifa (60% ustama)"
        tier = '1-toifa'
        salary_bonus = "60% oylik maoshga ustama"
        passed = True
    elif score_100 >= 56.0:
        category = "2-toifa (50% ustama)"
        tier = '2-toifa'
        salary_bonus = "50% oylik maoshga ustama"
        passed = True
    else:
        category = "Yetarli emas (Mutaxassis)"
        tier = 'mutaxassis'
        salary_bonus = "Toifa tasdiqlanmadi"
        passed = False

    return {
        'score_100': score_100,
        'category': category,
        'tier': tier,
        'salary_bonus': salary_bonus,
        'is_passed': passed,
    }


def calculate_language_cefr(score_pct: float) -> dict:
    """Xalqaro til imtihonlari (IELTS, CEFR, TOPIK, SAT) darajasi."""
    pct = max(0.0, min(100.0, float(score_pct or 0.0)))
    if pct >= 85.0:
        level = 'C1'
        ielts = '7.5 - 8.5'
        title = 'Advanced / Samarali erkin sohib'
    elif pct >= 70.0:
        level = 'B2'
        ielts = '6.0 - 7.0'
        title = 'Vantage / Mustaqil foydalanuvchi'
    elif pct >= 55.0:
        level = 'B1'
        ielts = '4.5 - 5.5'
        title = 'Threshold / Chegaraviy daraja'
    elif pct >= 40.0:
        level = 'A2'
        ielts = '3.5 - 4.0'
        title = 'Waystage / Boshlang\'ich davomiy'
    else:
        level = 'A1'
        ielts = '< 3.0'
        title = 'Breakthrough / Yangi boshlovchi'

    return {
        'level': level,
        'ielts_estimate': ielts,
        'title': title,
        'is_passed': pct >= 55.0,
    }
