# tests_app/services/grading.py
# ============================================================
# Ochiq javobli savollarni baholash (Gibrid: Qoida + AI)
# ============================================================
import json
import logging
import re

from core.ai_client import ask_groq

logger = logging.getLogger(__name__)

GRADING_SYSTEM_PROMPT = """Sen ochiq javobli test savollarini baholovchi adolatli imtihonchisan (fan har xil bo'lishi mumkin: tarix, ona tili, matematika, biologiya).

MUHIM QOIDALAR:
1. O'quvchining javobini FAQAT berilgan "namunaviy to'g'ri javob" bilan solishtirib baho ber.
2. REGISTR VA HARF KATTALIGI: O'quvchi javobni HAMMASI KATTA HARFDA (masalan "XAMMURAPI", "DORO I", "MIXXAT YOZUVI"), hammasi kichik harfda ("xammurapi", "doro i", "mixxat") yoki bosh harf bilan yozganidan qat'i nazar — ALBATTA TO'G'RI deb top. Katta-kichik harf farqi mutlaqo hisobga olinmaydi!
3. IMLO VA SHAKL: Kichik imlo xatolari, tinish belgilari, so'z tartibi yoki qo'shimchalar (masalan "Zikkurat" o'rniga "Zikkuratlar" yoki "Zikkurat ibodatxonasi") ahamiyatsiz — MOHIYAT to'g'ri bo'lsa, to'g'ri deb top.
4. Bo'sh, "bilmayman" kabi javoblarni xato deb top.
5. BBA VA MILLIY SERTIFIKAT STANDARTI: O'quvchi javobi namunaviy javobga kamida 70% mos kelsa (yoki imlo jihatdan 70% o'xshash bo'lsa), shuningdek qattiq va yumshoq 'x' va 'h' harflari almashib qolgan bo'lsa (masalan 'xun' o'rniga 'hun', 'buxoro' o'rniga 'buhoro', 'gaznaviy' o'rniga 'g'aznaviy'), ALBATTA TO'G'RI (is_correct: true) deb bahola!
6. Har bir baho uchun juda qisqa (5-10 so'z) izoh yoz.

Faqat so'ralgan JSON formatida javob ber, boshqa hech narsa yozma."""

GRADING_USER_PROMPT_TEMPLATE = """Quyidagi {count} ta ochiq javobli savolni baholab, JSON qaytar:

{items_block}

Javobni faqat quyidagi formatda qaytar:
{{"results": [{{"index": 1, "is_correct": true, "note": "qisqa izoh"}}, ...]}}
"results" ro'yxati "index" bo'yicha tartiblangan va yuqoridagi barcha {count} ta savolni o'z ichiga olishi shart."""


def normalize_text(text: str) -> str:
    """Matnni solishtirish uchun tozalash:
    - Katta va kichik harflarni to'liq kichik harfga o'tkazish (case-insensitive)
    - Kirill va lotin alifbosidagi bir xil shaklli harflarni unifikatsiya qilish
    - Qo'shtirnoqlar, tutuq belgilari va barcha tinish belgilarini tozalash."""
    if not text:
        return ""
    # 1. Hammasini to'liq kichik harfga o'tkazamiz
    s = text.strip().lower()

    # 2. Klaviaturada kirill-lotin aralashib ketgan harflarni lotinga o'tkazamiz
    # (masalan ruscha 'а', 'о', 'е', 'х', 'р', 'с' o'rniga lotin 'a', 'o', 'e', 'x', 'p', 's')
    cyr_to_lat = {
        'а': 'a', 'в': 'b', 'е': 'e', 'к': 'k', 'м': 'm', 'н': 'h',
        'о': 'o', 'р': 'p', 'с': 's', 'т': 't', 'у': 'y', 'х': 'x'
    }
    for cyr, lat in cyr_to_lat.items():
        s = s.replace(cyr, lat)

    # 3. Qo'shtirnoqlar va maxsus belgilarni tozalash
    s = re.sub(r'["\'«»“”‘’`]', '', s)
    # 4. Tutuq belgilari
    s = re.sub(r'[ʻʼʽ]', "'", s)
    # 5. Tinish belgilari va ajratuvchilarni bo'shliqqa almashtirish
    s = re.sub(r'[,;:!?(){}\[\]\-_/\\|]', ' ', s)
    return ' '.join(s.split())


from difflib import SequenceMatcher

def normalize_phonetic(text: str) -> str:
    """O'zbek tilidagi qattiq/yumshoq 'x'/'h', tutuq belgilari va harf farqlarini tekislash.
    BBA va Milliy sertifikat qoidasiga ko'ra 'xun' va 'hun', 'buxoro' va 'buhoro' bir xil hisoblanadi."""
    s = normalize_text(text)
    # Tarixiy va xalqaro nomlar (Budda / Buddha, Siddhartha / Siddharta)
    s = s.replace('buddha', 'budda').replace('siddhartha', 'siddharta').replace('gautama', 'gautama')
    # Qattiq va yumshoq x/h ni unifikatsiya qilish
    s = s.replace('x', 'h')
    # Tutuq va o'/g' belgilarini tekislash
    s = s.replace("o'", "o").replace("g'", "g")
    return s


def is_deterministic_match(student_text: str, reference_text: str) -> bool:
    """Aniq faktik savollar uchun o'quvchi javobi va namunaviy javobni tezkor,
    xatosiz solishtirish (BBA 70% o'xshashlik va x/h qoidalariga to'liq mos)."""
    s_clean = normalize_text(student_text)
    r_clean = normalize_text(reference_text)

    if not s_clean or not r_clean:
        return False

    # 1. 100% aynan bir xil
    if s_clean == r_clean:
        return True

    s_phon = normalize_phonetic(s_clean)
    r_phon = normalize_phonetic(r_clean)

    # 2. Fonetik jihatdan bir xil (x <-> h, masalan "xun" <-> "hun", "buxoro" <-> "buhoro")
    if s_phon == r_phon:
        return True

    # 3. 70% va undan yuqori o'xshashlik (BBA / Milliy sertifikat standarti)
    if SequenceMatcher(None, s_phon, r_phon).ratio() >= 0.70:
        return True

    # 4. Qavs ichida yoki '/' yoki ';' bilan ajratilgan muqobil variantlar
    # Masalan: "892-yil (888/892)", "Hind (Sind) daryosi", "Parvon jangi (1221-yil)"
    parts = re.split(r'[/();,]', reference_text)
    ref_alternatives = []
    for p in parts:
        c = normalize_text(p)
        if c:
            ref_alternatives.append(c)

    for alt in ref_alternatives:
        alt_phon = normalize_phonetic(alt)
        if s_phon == alt_phon or alt_phon in s_phon or s_phon in alt_phon:
            return True
        if len(alt_phon) >= 3 and SequenceMatcher(None, s_phon, alt_phon).ratio() >= 0.70:
            return True

    # 5. Katta javob ichida asosiy kalit so'z to'liq bo'lsa
    # Masalan: reference="Qutayba ibn Muslim", student="Qutayba" yoki "Qutayba ibn Muslim sarkardasi"
    s_words = set(s_clean.split())
    r_words = set(r_clean.split())
    s_phon_words = set(s_phon.split())
    r_phon_words = set(r_phon.split())

    # Agar reference bitta so'zdan iborat bo'lsa va o'quvchi javobida o'sha so'z bo'lsa
    if len(r_words) == 1:
        single_r = next(iter(r_words))
        single_r_phon = next(iter(r_phon_words))
        if any(single_r_phon in w or w in single_r_phon for w in s_phon_words):
            return True

    # Agar barcha muhim kalit so'zlar o'quvchi javobida mavjud bo'lsa
    stop_words = {'va', 'hamda', 'yoki', 'davlati', 'shahri', 'kitobi', 'dini', 'odam', 'yili', 'yozuvi',
                  'sulolasi', 'podshosi', 'podsholigi', 'ilohasi', 'xudosi', 'qabilasi', 'guruhi', 'qozgoloni',
                  'jangi', 'daryosi', 'qo`zg`oloni', 'hukmdori', 'sarkardasi', 'javob', 'teng'}
    content_r_words = {w for w in r_phon_words if w not in stop_words}
    if content_r_words and content_r_words.issubset(s_phon_words):
        return True

    # 6. Matematik raqamlar, kasrlar va yillarni moslashtirish (masalan: "24", "-5", "2.5", "1/2")
    # Kasrlar ekvivalentligi:
    fractions_map = {'1/2': '0.5', '1/4': '0.25', '3/4': '0.75', '0,5': '0.5', '0,25': '0.25', '0,75': '0.75'}
    s_frac = fractions_map.get(s_clean, s_clean)
    r_frac = fractions_map.get(r_clean, r_clean)
    if s_frac == r_frac:
        return True

    s_digits = re.findall(r'[-+]?\d*\.?\d+', s_clean.replace(',', '.'))
    r_digits = re.findall(r'[-+]?\d*\.?\d+', r_clean.replace(',', '.'))
    if s_digits and r_digits:
        # Barcha raqamlar to'g'ri kelgan bo'lsa
        if any(d in r_digits for d in s_digits if d not in ('', '.', '-')):
            return True

    # 7. Rim raqamli hukmdorlar (masalan "Kir II" -> "kir 2" yoki "kir ii", "Doro I" -> "doro 1" yoki "doro i")
    roman_map = {'1': 'i', '2': 'ii', '3': 'iii', '4': 'iv', '5': 'v'}
    s_roman = s_phon
    for digit, rom in roman_map.items():
        s_roman = re.sub(rf'\b{digit}\b', rom, s_roman)
    r_roman = r_phon
    for digit, rom in roman_map.items():
        r_roman = re.sub(rf'\b{digit}\b', rom, r_roman)
    if s_roman == r_roman or SequenceMatcher(None, s_roman, r_roman).ratio() >= 0.70:
        return True

    return False


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
