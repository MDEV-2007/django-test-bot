"""DMT uslubidagi ko'p qismli test to'plami PDF'idan bir nechta TestSet yaratadi.

Bu importer `tests_app/importers/` dagi umumiy PDF importeridan ATAYLAB alohida: o'sha
importer har qanday imtihon varag'ini (jadval, rasm, moslashtirish savollari bilan) bitta
TestSet'ga yig'adi va to'g'ri javobni AI orqali taxmin qiladi — bu yerda esa PDF'ning o'zida
100% aniq javob kaliti bor va AI'ga ehtiyoj yo'q, natija esa bitta emas, o'nlab TestSet.

Kutilgan PDF tuzilishi (shu formatdagi boshqa to'plamlar uchun ham ishlaydi):

    Mavzu (Part Name)                          <- "N-QISM:" mundarija
    Savollar
    1-QISM: <sarlavha>
    1–30
    2-QISM: <sarlavha>
    31–60
    ...

    1-QISM: <SARLAVHA>                          <- savollar tanasi
    1. Savol matni?
    A) variant
    B) variant
    C) variant
    D) variant
    2. ...

    TO'G'RI JAVOBLAR KALITI (ANSWER KEY)        <- javob kaliti
    S#  P. 1  P. 2  ...  P. N
    1   C     B     ...  B
    2   B     A     ...  B
    ...

Har bir qism alohida TestSet (single_choice, 4 variant) bo'lib yuklanadi, sarlavha ToC'dagi
qism nomidan olinadi. Javob PDF'dagi jadvaldan o'qiladi — taxmin qilinmaydi.

Ishlatish:
    python manage.py import_dtm_pdf tests_app/fixtures/pdf_imports/....pdf \\
        --title-prefix "7-sinf DMT: O'zbekiston tarixi" --topic-prefix "O'zbekiston tarixi"

    --dry-run bilan hech narsa saqlanmaydi, faqat har qismdan bittadan savol va hisobot
    ko'rsatiladi — yangi PDF formati to'g'ri o'qilyaptimi, shuni tekshirish uchun.
"""
import re
from pathlib import Path

import pymupdf
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from learning.models import Topic
from tests_app.models import AnswerOption, Question, Subject, TestSet

# Har sahifada takrorlanadigan sarlavha/pastki matn — savol matniga aralashib ketmasligi
# uchun butunlay olib tashlanadi. Boshqa PDF'da matn boshqacha bo'lsa, shuni moslang.
_PAGE_BOILERPLATE = re.compile(
    r"^.{0,80}\n.{0,80}TESTLAR TO'PLAMI\s*\n.{0,120}\n\s*Sahifa \d+\s*\n?",
    re.MULTILINE,
)

_QISM_RE = re.compile(r"(\d{1,2})-QISM:\s*(.+?)\n(\d+)\D+(\d+)\n", re.DOTALL)
_MID_BODY_QISM_RE = re.compile(r"\n\d{1,2}-QISM:.+?(?=\n\d{1,3}\.\s)", re.DOTALL)
_QUESTION_RE = re.compile(
    r"(?P<num>\d{1,3})\.\s*(?P<body>.+?)\n"
    r"A\)\s*(?P<a>.+?)\nB\)\s*(?P<b>.+?)\nC\)\s*(?P<c>.+?)\nD\)\s*(?P<d>.+?)"
    r"(?=\n\d{1,3}\.\s|\Z)",
    re.DOTALL,
)
_KEY_NOISE = ("TESTLAR TO'PLAMI", "Tarix fani", "Sahifa", "JAVOBLAR KALITI",
              "Quyidagi muhtasham", "S#", "P. ")


def _clean(text):
    """Bir necha qatorga cho'zilgan matnni bitta bo'shliq bilan tekislaydi."""
    return ' '.join(text.split())


def _parse_pdf(path):
    doc = pymupdf.open(str(path))
    text = ''.join(p.get_text() for p in doc)
    # PDF generatorlari apostrof o'rniga ‘/’ (U+2018/2019) ishlatadi — saytning boshqa
    # joylaridagi o'zbekcha matn bilan bir xil ko'rinishi uchun oddiy apostrofga
    # almashtiramiz.
    text = text.replace('‘', "'").replace('’', "'")
    text = _PAGE_BOILERPLATE.sub('', text)

    toc_start = text.find('Mavzu (Part Name)')
    if toc_start == -1:
        raise CommandError("Mundarija (\"Mavzu (Part Name)\") topilmadi — PDF tuzilishi kutilganidan farq qiladi.")
    first_qism = text.find('1-QISM:', toc_start)
    second_qism = text.find('1-QISM:', first_qism + 1)
    if second_qism == -1:
        raise CommandError("Savollar tanasi (ikkinchi \"1-QISM:\") topilmadi.")

    parts = [
        {'idx': int(idx), 'title': _clean(title), 'start': int(start), 'end': int(end)}
        for idx, title, start, end in _QISM_RE.findall(text[toc_start:second_qism])
    ]
    if not parts:
        raise CommandError("Mundarijadan bironta \"N-QISM:\" topilmadi.")

    key_start = text.find("JAVOBLAR KALITI")
    if key_start == -1:
        raise CommandError("Javob kaliti bo'limi (\"JAVOBLAR KALITI\") topilmadi.")

    body = _MID_BODY_QISM_RE.sub('', text[second_qism:key_start])
    questions = {}
    for m in _QUESTION_RE.finditer(body):
        num = int(m.group('num'))
        questions[num] = {k: _clean(m.group(k)) for k in ('body', 'a', 'b', 'c', 'd')}

    expected = set(range(1, parts[-1]['end'] + 1))
    missing = sorted(expected - set(questions))
    if missing:
        raise CommandError(
            f"{len(missing)} ta savol topilmadi (masalan #{missing[0]}) — PDF formatini tekshiring."
        )

    # Javob kaliti jadvali: "S# / P.1 / ... / P.N" sarlavhasidan keyin qator raqami va
    # o'sha qatordagi harflar ketma-ket keladi; sahifa chegarasida orada boshqa matn
    # bo'lishi mumkin, shuning uchun faqat "raqam" yoki "bitta A-D harfi" bo'lgan
    # qatorlarni saqlab, qolganini shovqin sifatida tashlaymiz.
    key_lines = [ln.strip() for ln in text[key_start:].split('\n') if ln.strip()]
    key_lines = [ln for ln in key_lines if not any(ln.startswith(s) or s in ln for s in _KEY_NOISE)]
    rows, current_row, buf = {}, None, []
    for ln in key_lines:
        if re.fullmatch(r'\d{1,2}', ln):
            if current_row is not None:
                rows[current_row] = buf
            current_row, buf = int(ln), []
        elif re.fullmatch(r'[A-D]', ln):
            buf.append(ln)
    if current_row is not None:
        rows[current_row] = buf

    max_row = max(p['end'] - p['start'] + 1 for p in parts)
    bad_rows = {r: v for r, v in rows.items() if r <= max_row and len(v) != len(parts)}
    if bad_rows:
        raise CommandError(
            f"Javob kaliti jadvalida {len(bad_rows)} ta qatorda kutilgan {len(parts)} ta "
            f"harf yo'q (masalan qator {next(iter(bad_rows))}) — jadval formatini tekshiring."
        )

    for part in parts:
        for num in range(part['start'], part['end'] + 1):
            row = num - part['start'] + 1
            questions[num]['answer'] = rows[row][part['idx'] - 1]

    return parts, questions


class Command(BaseCommand):
    help = "DMT uslubidagi ko'p qismli PDF test to'plamidan har qism uchun alohida TestSet yaratadi."

    def add_arguments(self, parser):
        parser.add_argument('pdf', help="Import qilinadigan PDF fayl yo'li.")
        parser.add_argument('--title-prefix', required=True, help="Har TestSet nomining boshi — qism sarlavhasi shu bilan qo'shiladi.")
        parser.add_argument('--topic-prefix', default='', help="Topic nomi prefiksi (ixtiyoriy). Berilmasa Topic yaratilmaydi.")
        parser.add_argument('--subject', default='Tarix', help="Fan nomi (default: Tarix).")
        parser.add_argument('--category', default='certificate', choices=[c[0] for c in Question.CATEGORY_CHOICES])
        parser.add_argument('--duration', type=int, default=35, help="Har bir qism testi uchun daqiqa (default: 35 — 30 savol uchun yetarli).")
        parser.add_argument('--premium', action='store_true', help="Berilsa, testlar faqat xarid qilganlarga ochiq bo'ladi (standart: bepul).")
        parser.add_argument('--dry-run', action='store_true', help="Hech narsa saqlamaydi, faqat tahlil natijasini ko'rsatadi.")

    def handle(self, *args, **options):
        path = Path(options['pdf'])
        if not path.exists():
            raise CommandError(f"Fayl topilmadi: {path}")

        parts, questions = _parse_pdf(path)
        self.stdout.write(f"Qismlar: {len(parts)} | Savollar: {len(questions)}")

        if options['dry_run']:
            for part in parts:
                sample_num = part['start']
                q = questions[sample_num]
                self.stdout.write(
                    f"  {part['idx']}-QISM: {part['title'][:70]} "
                    f"({part['start']}-{part['end']}, {part['end']-part['start']+1} savol)"
                )
                self.stdout.write(f"    masalan #{sample_num} (javob={q['answer']}): {q['body'][:70]}")
            self.stdout.write(self.style.WARNING("(sinov rejimi — hech narsa saqlanmadi)"))
            return

        with transaction.atomic():
            subject, _ = Subject.objects.get_or_create(
                name=options['subject'], defaults={'slug': options['subject'].lower().replace(' ', '-')},
            )
            topic = None
            if options['topic_prefix']:
                topic, _ = Topic.objects.get_or_create(
                    title=options['topic_prefix'],
                    defaults={
                        'slug': options['topic_prefix'].lower().replace(' ', '-').replace("'", ''),
                        'subject': subject,
                        'category': options['category'],
                    },
                )

            created = []
            for part in parts:
                title = f"{options['title_prefix']} — {part['idx']}-qism: {part['title']}"
                self._replace_testset(title)

                test_set = TestSet.objects.create(
                    subject=subject, title=title, description='',
                    category=options['category'], duration_minutes=options['duration'],
                    is_premium=options['premium'], is_published=True,
                )
                qs = []
                for num in range(part['start'], part['end'] + 1):
                    q = questions[num]
                    question = Question.objects.create(
                        topic=topic, subject=subject,
                        body=f"<p>{_escape(q['body'])}</p>",
                        question_type='single_choice', difficulty='medium',
                        category=options['category'],
                    )
                    AnswerOption.objects.bulk_create([
                        AnswerOption(question=question, text=q['a'], is_correct=q['answer'] == 'A'),
                        AnswerOption(question=question, text=q['b'], is_correct=q['answer'] == 'B'),
                        AnswerOption(question=question, text=q['c'], is_correct=q['answer'] == 'C'),
                        AnswerOption(question=question, text=q['d'], is_correct=q['answer'] == 'D'),
                    ])
                    qs.append(question)
                test_set.questions.add(*qs)
                created.append((title, len(qs)))

        for title, count in created:
            self.stdout.write(self.style.SUCCESS(f"Tayyor: '{title}' — {count} ta savol, katalogda ko'rinadi."))

    @staticmethod
    def _replace_testset(title):
        """Xuddi shu nomdagi eski test bo'lsa, faqat aynan shu testgagina tegishli
        savollari bilan birga o'chiradi — boshqa test bilan baham ko'rilgan savol
        qolaveradi."""
        old = TestSet.objects.filter(title=title).prefetch_related('questions__test_sets').first()
        if not old:
            return
        orphan_ids = [q.id for q in old.questions.all() if q.test_sets.count() == 1]
        Question.objects.filter(id__in=orphan_ids).delete()
        old.delete()


def _escape(text):
    return text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
