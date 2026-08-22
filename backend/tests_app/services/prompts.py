# tests_app/services/prompts.py
# ============================================================
# AI FEEDBACK PROMPTLARI — RAG'siz, maksimal aniqlik uchun
# ============================================================


# ------------------------------------------------------------
# SYSTEM PROMPT — AI'ning shaxsiyati, qoidalari, chegaralari
# Bu har doim o'zgarmaydi. Modelning "xarakterini" belgilaydi.
# ------------------------------------------------------------
SYSTEM_PROMPT = """Sen — "Milliy Sertifikat" imtihoniga tayyorlanayotgan o'quvchilar uchun tajribali, mehribon va aqlli o'qituvchisan. Qaysi fanni baholayotganing user promptida "Fan:" qatorida ko'rsatiladi — o'sha fanga mos tahlil qil. Isming — AI Mentor.

SENING VAZIFANG:
O'quvchining test natijasini chuqur tahlil qilib, unga AYNAN nimani, NEGA bilmasligini ko'rsatish va qanday tuzatishni o'rgatish. Sen shunchaki baho qo'ymaysan — sen yo'l ko'rsatasan.

QAT'IY QOIDALAR:
1. HECH QACHON umumiy gap ishlatma. "Ko'proq o'qing", "muntazam mashq qiling" kabi bo'sh maslahatlar TAQIQLANADI. Har bir gap aniq va amaliy bo'lsin.
2. Har bir xato uchun AYNAN nima xato qilinganini ko'rsat: "Sen X deb javob berding, aslida Y". Tахmin qilma — faqat berilgan ma'lumotdan foydalan.
3. Faqat berilgan savol va javoblarга asoslan. Ma'lumot yetishmasa, o'zingdan to'qib chiqarma (hallucination qilma).
4. Ohanging: do'stona, rag'batlantiruvchi, lekin halol. Bolani ranjitma, lekin yolg'on maqtov ham berma.
5. Har bir xatoни eslab qolish uchun ODDIY, yodda qoladigan usul yoki bog'lanish taklif qil (masalan sana, voqea, mnemonik).
6. Faqat o'zbek tilida yoz. Sof, tushunarli til ishlat — murakkab so'zlardan qoch.

TAHLIL CHUQURLIGI:
- Xatolarni MAVZU bo'yicha guruhla — agar bir mavzuda ko'p xato bo'lsa, bu tizimli bilim bo'shlig'i, buni ta'kidla.
- Bola javobsiz qoldirgan savollarni alohida ko'r — bu "bilmaslik" emas, "vaqt yetmaslik" yoki "ishonchsizlik" bo'lishi mumkin.
- Kuchli tomonlarни ham top (agar bo'lsa) — bola nimani yaxshi biladi.

JAVOB FORMATI:
Har doim FAQAT quyidagi JSON strukturasida javob ber. JSON'dan tashqari hech qanday matn, izoh yoki belgi qo'shma."""


# ------------------------------------------------------------
# USER PROMPT SHABLONI — har test uchun to'ldiriladi
# .format() yoki f-string bilan qiymatlar joylashtiriladi
# ------------------------------------------------------------
USER_PROMPT_TEMPLATE = """O'QUVCHI TEST NATIJASI

Fan: {subject}
Umumiy natija: {percent}% ({correct} to'g'ri / {total} savol)
Xato javoblar: {wrong_count} ta
Javobsiz qoldirilgan: {skipped_count} ta

═══════════════════════════════════
XATO QILINGAN SAVOLLAR (tahlil uchun):
═══════════════════════════════════
{wrong_block}

═══════════════════════════════════
JAVOBSIZ QOLDIRILGAN SAVOLLAR:
═══════════════════════════════════
{skipped_block}

═══════════════════════════════════
VAZIFA:
═══════════════════════════════════
Yuqoridagi ma'lumotni tahlil qilib, quyidagi JSON'ni to'ldir.
Eng muhim 3-5 ta xatoni chuqur tahlil qil (hammasini emas, eng muhimlarini).

{{
  "umumiy_xulosa": "3-4 gapli samimiy xulosa. Bolaning haqiqiy holatini halol, lekin rag'batlantiruvchi tarzda ayt. Foizni emas, MAZMUNNI izohla.",

  "kuchli_tomonlar": ["Agar bola biror mavzuni yaxshi bilsa, shuni yoz. Yo'q bo'lsa, bo'sh massiv []"],

  "aniq_xatolar": [
    {{
      "mavzu": "qaysi mavzuga tegishli",
      "savol_mazmuni": "savolning qisqa mohiyati",
      "bola_javobi": "bola nima deb javob berdi",
      "togri_javob": "to'g'ri javob nima edi",
      "nega_muhim": "bu bilim nega kerak, qayerda uchraydi (1 gap)",
      "eslab_qolish": "buni eslab qolishning ODDIY usuli — sana bog'lash, mnemonika yoki mantiqiy izoh"
    }}
  ],

  "kuchsiz_mavzular": ["eng ko'p xato qilingan mavzular ro'yxati, muhimlik tartibida"],

  "keyingi_qadamlar": [
    "ANIQ, bugun bajarish mumkin bo'lgan qadam. Masalan: 'Amir Temur yurishlarini xronologik tartibda 5 ta sanani yozib chiq' — 'ko'proq o'qi' EMAS."
  ],

  "motivatsiya": "1 ta qisqa, samimiy rag'batlantiruvchi gap — bolaning kelajagiga ishonch bildir"
}}

MUHIM ESLATMA:
- Agar xato juda ko'p bo'lsa, faqat MAVZU jihatidan eng muhim va takrorlanadigan xatolarni tanlab tahlil qil.
- "eslab_qolish" maydonini har doim ijodiy va foydali qil — bu bolага eng ko'p yordam beradigan qism.
- JSON to'g'ri va to'liq bo'lsin."""


# ------------------------------------------------------------
# YORDAMCHI: xato va javobsiz bloklarni matnga aylantirish
# ------------------------------------------------------------
def format_wrong_block(wrong_answers):
    """
    wrong_answers: [{'mavzu','savol','bola_javobi','togri_javob'}, ...]
    LLM yaxshi o'qishi uchun raqamlangan, tuzilgan matn qaytaradi.
    """
    if not wrong_answers:
        return "(Xato javoblar yo'q — barcha javoblar to'g'ri!)"

    lines = []
    for i, w in enumerate(wrong_answers, start=1):
        lines.append(
            f"{i}) [{w['mavzu']}]\n"
            f"   Savol: {w['savol']}\n"
            f"   ❌ Bola javobi: {w['bola_javobi']}\n"
            f"   ✅ To'g'ri javob: {w['togri_javob']}"
        )
    return "\n\n".join(lines)


def format_skipped_block(skipped_answers):
    """
    skipped_answers: [{'mavzu','savol','togri_javob'}, ...]
    """
    if not skipped_answers:
        return "(Javobsiz qoldirilgan savol yo'q)"

    lines = []
    for i, s in enumerate(skipped_answers, start=1):
        lines.append(
            f"{i}) [{s['mavzu']}] {s['savol']}\n"
            f"   ✅ To'g'ri javob: {s['togri_javob']}"
        )
    return "\n\n".join(lines)


# ------------------------------------------------------------
# ASOSIY: to'liq user promptni yig'ish
# ------------------------------------------------------------
def build_user_prompt(*, subject, total, correct,
                      wrong_answers, skipped_answers):
    """
    Barcha qismlarni birlashtirib, tayyor user promptni qaytaradi.

    Token tejash uchun: agar xato juda ko'p bo'lsa,
    eng muhim 12 tasini olamiz (mavzu xilma-xilligini saqlab).
    """
    percent = round((correct / total) * 100) if total else 0

    # Token nazorati: 12 tadan ko'p xato bo'lsa, cheklaymiz
    wrong_sample = wrong_answers[:12]
    skipped_sample = skipped_answers[:6]

    return USER_PROMPT_TEMPLATE.format(
        subject=subject,
        percent=percent,
        correct=correct,
        total=total,
        wrong_count=len(wrong_answers),
        skipped_count=len(skipped_answers),
        wrong_block=format_wrong_block(wrong_sample),
        skipped_block=format_skipped_block(skipped_sample),
    )
