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
5. Har bir baho uchun juda qisqa (5-10 so'z) izoh yoz.

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


def is_deterministic_match(student_text: str, reference_text: str) -> bool:
    """Aniq faktik savollar uchun o'quvchi javobi va namunaviy javobni tezkor,
    xatosiz solishtirish (AI ga muhtoj bo'lmagan holatlar)."""
    s_clean = normalize_text(student_text)
    r_clean = normalize_text(reference_text)

    if not s_clean or not r_clean:
        return False

    # 1. 100% aynan bir xil
    if s_clean == r_clean:
        return True

    # 2. Qavs ichida muqobil variantlar berilgan bo'lsa (masalan: "Zardusht (Zoroastr)")
    # yoki '/' bilan ajratilgan bo'lsa
    ref_alternatives = []
    # Qavslar ichidagi va tashqarisidagi qismlarni ajratish
    parts = re.split(r'[/()]', reference_text)
    for p in parts:
        c = normalize_text(p)
        if c and len(c) >= 3:
            ref_alternatives.append(c)

    for alt in ref_alternatives:
        if s_clean == alt or alt in s_clean:
            return True

    # 3. Katta javob ichida asosiy kalit so'z to'liq bo'lsa
    # Masalan: reference="Mixxat yozuvi", student="Mixxat" yoki "Mixxat yozuvlari"
    # Yoki: reference="Xammurapi", student="Xammurapi podshosi"
    s_words = set(s_clean.split())
    r_words = set(r_clean.split())

    # Agar reference bitta so'zdan iborat bo'lsa va o'quvchi javobida o'sha so'z bo'lsa
    # (masalan: "xammurapi", "zikkuratlar", "nineviya", "oshshur", "braxmanlar", "avesto")
    if len(r_words) == 1:
        single_r = next(iter(r_words))
        if len(single_r) >= 4 and any(single_r in w or w in single_r for w in s_words):
            return True

    # Agar barcha muhim kalit so'zlar o'quvchi javobida mavjud bo'lsa
    # Masalan: reference="Moxenjodaro va Xarappa" -> {"moxenjodaro", "xarappa"}
    # Masalan: reference="Mixxat yozuvi", student="Mixxat" -> "yozuvi" so'zsiz to'g'ri
    stop_words = {'va', 'hamda', 'yoki', 'davlati', 'shahri', 'kitobi', 'dini', 'odam', 'yili', 'yozuvi', 'sulolasi', 'podshosi', 'podsholigi', 'ilohasi', 'xudosi', 'qabilasi', 'guruhi', 'qozgoloni', 'qo`zg`oloni'}
    content_r_words = {w for w in r_words if w not in stop_words}
    if content_r_words and content_r_words.issubset(s_words):
        return True

    # Rim raqamli hukmdorlar (masalan "Kir II" -> "kir 2" yoki "kir ii", "Doro I" -> "doro 1" yoki "doro i")
    roman_map = {'1': 'i', '2': 'ii', '3': 'iii', '4': 'iv', '5': 'v'}
    s_roman = s_clean
    for digit, rom in roman_map.items():
        s_roman = re.sub(rf'\b{digit}\b', rom, s_roman)
    r_roman = r_clean
    for digit, rom in roman_map.items():
        r_roman = re.sub(rf'\b{digit}\b', rom, r_roman)
    if s_roman == r_roman:
        return True

    # Raqamli ifodalar: 720000 yoki 720 000 <-> 720 ming
    s_num = s_clean.replace('720000', '720 ming').replace('720 000', '720 ming')
    r_num = r_clean.replace('720000', '720 ming').replace('720 000', '720 ming')
    if '720 ming' in s_num and '720 ming' in r_num:
        return True

    # X / H harfi muqobilligi (Hammurapi <-> Xammurapi)
    if s_clean.replace('h', 'x') == r_clean.replace('h', 'x'):
        return True

    # Oshshur <-> Ashshur
    if s_clean.replace('a', 'o') == r_clean.replace('a', 'o'):
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

