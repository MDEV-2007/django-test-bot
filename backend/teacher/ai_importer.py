"""AI and Document Test Parser for Teacher Smart Test Importer.

Supports .docx (Word), .pdf (PyMuPDF), .txt, and raw text inputs.
Uses core.ai_client (Groq/Ollama) with JSON mode to reliably extract
questions, options, correct choices, and explanations, with an automatic
heuristic rule-based parser fallback if AI is offline.
"""
import io
import json
import logging
import re
import xml.etree.ElementTree as ET
import zipfile

from core.ai_client import ask_groq

logger = logging.getLogger(__name__)


def extract_text_from_docx(file_bytes: bytes) -> str:
    """Word (.docx) faylidan paragraflar va jadvallar matnini ajratib oladi."""
    try:
        with zipfile.ZipFile(io.BytesIO(file_bytes)) as z:
            xml_content = z.read('word/document.xml')
            tree = ET.fromstring(xml_content)
            ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
            paragraphs = []
            for p in tree.findall('.//w:p', ns):
                texts = [node.text for node in p.findall('.//w:t', ns) if node.text]
                if texts:
                    paragraphs.append(''.join(texts))
            return '\n'.join(paragraphs)
    except Exception as exc:
        logger.warning("DOCX dan matn ajratishda xatolik: %s", exc)
        return ""


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """PDF faylidan har bir sahifa matnini ajratib oladi."""
    try:
        import pymupdf
        doc = pymupdf.open(stream=file_bytes, filetype='pdf')
        pages_text = []
        for page in doc:
            txt = page.get_text() or ''
            if txt.strip():
                pages_text.append(txt)
        return '\n\n'.join(pages_text)
    except Exception as exc:
        logger.warning("PDF dan matn ajratishda xatolik: %s", exc)
        return ""


def extract_text_from_upload(uploaded_file) -> str:
    """Yuklangan fayl formati (docx, pdf, txt) bo'yicha toza matnni qaytaradi."""
    name = (getattr(uploaded_file, 'name', '') or '').lower()
    content = uploaded_file.read()

    if name.endswith('.docx'):
        return extract_text_from_docx(content)
    elif name.endswith('.pdf'):
        return extract_text_from_pdf(content)
    else:
        # Standart matn (.txt, .md yoki erkin matn)
        for enc in ('utf-8', 'cp1251', 'latin-1'):
            try:
                return content.decode(enc)
            except UnicodeDecodeError:
                continue
        return content.decode('utf-8', errors='ignore')


def rule_based_fallback_parser(raw: str) -> list[dict]:
    """AI mavjud bo'lmaganda ishlaydigan qoidaga asoslangan zaxira tahlilchi."""
    if not raw.strip():
        return []

    blocks = re.split(r'\n\s*(?=(?:\d+[\.\)]\s+))', raw)
    questions = []

    for block in blocks:
        lines = [line.strip() for line in block.split('\n') if line.strip()]
        if not lines:
            continue

        body = ""
        options = []
        explanation = ""
        detected_ans_letter = None

        for line in lines:
            ans_match = re.search(r'(?:Javob|Kalit|To[\'‘`]?g[\'‘`]?ri javob|Answer)\s*[:=-]\s*([A-Za-z])', line, re.I)
            if ans_match:
                detected_ans_letter = ans_match.group(1).upper()
                continue

            exp_match = re.search(r'(?:Izoh|Tushuntirish|Explanation)\s*[:=-]\s*(.+)', line, re.I)
            if exp_match:
                explanation = exp_match.group(1).strip()
                continue

            opt_match = re.match(r'^([*+]?)\s*([A-Za-z])[\)\.\]]\s*(.+)$', line)
            if opt_match:
                is_marked = bool(opt_match.group(1))
                letter = opt_match.group(2).upper()
                opt_text = opt_match.group(3).strip()
                options.append({
                    'text': opt_text,
                    'is_correct': is_marked or (detected_ans_letter is not None and letter == detected_ans_letter),
                })
            elif not options:
                clean = re.sub(r'^\d+[\.\)]\s*', '', line)
                body = f"{body}\n{clean}" if body else clean

        if detected_ans_letter and not any(o['is_correct'] for o in options):
            idx = ord(detected_ans_letter) - 65
            if 0 <= idx < len(options):
                options[idx]['is_correct'] = True

        if options and not any(o['is_correct'] for o in options):
            options[0]['is_correct'] = True

        if body and len(options) >= 2:
            questions.append({
                'body': body,
                'options': options,
                'explanation': explanation,
                'difficulty': 'medium',
                'points': 1,
            })

    return questions


AI_PARSE_PROMPT = """Sen professional o'qituvchilar va test tuzuvchilar uchun testlarni tahlil qiluvchi aqlli tizimsan.
Vazifang: Berilgan xom matndan (Word/PDF dan olingan testlardan) barcha test savollarini ajratib olish va qat'iy JSON formatida qaytarish.

Har bir savol uchun:
- "body": Savol matni (boshidagi raqamlarsiz, toza).
- "options": Variantlar ro'yxati (kamida 2 ta, odatda 4 ta). Har biri {"text": "...", "is_correct": true/false}.
- "explanation": Izoh yoki to'g'ri javob sababi (matnda berilgan bo'lsa yoki bo'sh satr "").
- "difficulty": "easy", "medium", yoki "hard".
- "points": 1.

To'g'ri javobni qanday aniqlash kerak:
- Agar variant oldida * yoki + belgisi bo'lsa (masalan: *A) yoki +B)), bu to'g'ri variant.
- Agar savol tagida "Javob: B" yoki "To'g'ri javob: C" yozilgan bo'lsa, o'sha variantga "is_correct": true qo'y.
- Agar javob ko'rsatilmagan bo'lsa, mantiqiy to'g'ri javobni "is_correct": true qilib belgilagin.

Qat'iy format:
{
  "questions": [
    {
      "body": "Amir Temur qachon tavallud topgan?",
      "options": [
        {"text": "1336-yil 9-aprel", "is_correct": true},
        {"text": "1340-yil 5-may", "is_correct": false},
        {"text": "1330-yil 1-mart", "is_correct": false},
        {"text": "1405-yil 18-fevral", "is_correct": false}
      ],
      "explanation": "Amir Temur 1336-yil 9-aprelda Shahrisabz yaqinida tavallud topgan.",
      "difficulty": "medium",
      "points": 1
    }
  ]
}"""


def ai_parse_test_questions(raw_text: str) -> list[dict]:
    """Berilgan matnni Groq / Ollama AI orqali to'liq strukturalangan savollar ro'yxatiga aylantiradi."""
    clean_text = raw_text.strip()
    if not clean_text:
        return []

    # Agar matn juda katta bo'lsa, AI context window chegarasiga moslab qirqamiz
    truncated_text = clean_text[:14000]

    messages = [
        {"role": "system", "content": AI_PARSE_PROMPT},
        {"role": "user", "content": f"Quyidagi test matnini tahlil qil va JSON qaytar:\n\n{truncated_text}"}
    ]

    try:
        response_json = ask_groq(
            messages=messages,
            temperature=0.2,  # Past harorat — faktlar va variantlar aniq chiqishi uchun
            response_format={"type": "json_object"},
            timeout=35,
        )

        if response_json:
            parsed = json.loads(response_json)
            questions = parsed.get('questions') or []
            valid_questions = []

            for q in questions:
                body = (q.get('body') or '').strip()
                options = q.get('options') or []
                if not body or len(options) < 2:
                    continue

                # Variantlar to'g'riligini tekshirish
                valid_opts = []
                for opt in options:
                    t = (opt.get('text') or '').strip()
                    if t:
                        valid_opts.append({'text': t, 'is_correct': bool(opt.get('is_correct'))})

                # Kamida bitta to'g'ri javob bo'lishini ta'minlash
                if valid_opts and not any(o['is_correct'] for o in valid_opts):
                    valid_opts[0]['is_correct'] = True

                valid_questions.append({
                    'body': body,
                    'options': valid_opts,
                    'explanation': (q.get('explanation') or '').strip(),
                    'difficulty': q.get('difficulty') or 'medium',
                    'points': int(q.get('points') or 1),
                })

            if valid_questions:
                return valid_questions

    except Exception as exc:
        logger.warning("AI orqali test tahlilida xatolik: %s. Qoidali parserga o'tilmoqda.", exc)

    # Fallback to regex parser
    return rule_based_fallback_parser(clean_text)
