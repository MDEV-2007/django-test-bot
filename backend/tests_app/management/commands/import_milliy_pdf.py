"""Javoblari belgilangan "Milliy Sertifikat" PDF'ini bazaga ko'chiradi.

    python manage.py import_milliy_pdf FAYL.pdf --title "..." --dry-run
    python manage.py import_milliy_pdf FAYL.pdf --title "..."

NEGA ALOHIDA BUYRUQ
-------------------
Mavjud `import_pdf_tests` umumiy ajratuvchi: u javoblarni bilmaydi (AI taxmin qiladi)
va rasm/jadvalni tashlab yuboradi. Bu PDF esa boshqacha tuzilgan va uchta narsani
saqlab qolishni talab qiladi:

  1. JAVOBLAR PDF ICHIDA. To'g'ri variant `✓` belgisi bilan turibdi, ya'ni taxmin
     qilishning hojati yo'q — javoblar aniq ko'chiriladi.
  2. JADVALLAR. Moslashtirish savollari (5, 6) va tahlil savollari (18, 19) jadval
     shaklida. Ular matnga aylantirilsa savol ma'nosini yo'qotadi, shuning uchun
     HTML `<table>` bo'lib ko'chiriladi (`Question.body` — CKEditor maydoni).
  3. RASMLAR. 17-savolda sxematik xarita, 20-savolda Eyler-Venn diagrammasi bor.
     Ular PDF'da JOYLASHTIRILGAN RASM EMAS — vektor chizma. Shuning uchun
     `page.get_images()` ularni umuman ko'rmaydi (hujjatda 0 ta rasm topiladi).
     Yechim: sahifaning o'sha qismi PNG'ga render qilinadi.

SAVOLLARNI AJRATISH
-------------------
Savol raqami KETMA-KET qidiriladi (1, 2, 3 ... 45). Bu muhim: xarita afsonasida ham,
variantlar ichida ham ("A) 1, 5, 2, 4") yakka raqamlar uchraydi. Agar har qanday
raqam savol deb qabul qilinsa, matn parchalanib ketardi. Keyingi kutilayotgan
raqamdan boshqasi e'tiborga olinmaydi.

RASM VA JADVAL MATNI TAKRORLANMAYDI
-----------------------------------
Jadval yoki rasm chegarasi ichiga tushgan matn qatorlari savol matnidan chiqarib
tashlanadi — aks holda xarita yozuvlari ("1", "Burgundiya gersogligi") bir marta
rasmda, ikkinchi marta matnda ko'rinardi.
"""
import re
import shutil
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils.html import escape

from tests_app.models import AnswerOption, Question, SubQuestion, Subject, TestSet

# Sahifa kolontitullari — savol matniga tushmasligi kerak.
#
# Bu ro'yxat MATN BO'YICHA emas, BELGI bo'yicha tuzilgan. Sabab: birinchi urinishda
# bu yerda "Ko’proq testlar uchun" degan aniq ibora turgan edi, oxirgi sahifadagi
# kolontitul esa "Ko’proq MILLIY SERTIFIKAT testlari uchun..." deb yozilgan — bir
# so'z farq qilgani uchun filtr uni o'tkazib yuborgan va reklama matni 12 ta
# savolning ichiga yopishib qolgan edi. Endi kanal nomi va sahifa raqami bo'yicha
# tekshiriladi: kolontitul matni qanday o'zgarsa ham, ular o'zgarmaydi.
NOISE_MARKERS = ('Sodiqov Shohjahon', 'TarixMilliyCertificate', 'MILLIY SERTIFIKAT SHABLONIDAGI')
# "7 / 13" ko'rinishidagi sahifa raqami.
PAGE_NO_RE = re.compile(r'^\d{1,2}\s*/\s*\d{1,2}$')


def _is_noise(text):
    return any(m in text for m in NOISE_MARKERS) or bool(PAGE_NO_RE.match(text))
OPTION_RE = re.compile(r'^([A-D])\)\s*(.+)$', re.DOTALL)
SUB_RE = re.compile(r'^([a-z])\)\s*(.+)$')
ANSWER_RE = re.compile(r'^Javob:\s*(.+)$')
CHECK = '✓'

# Umumiy javob banki: "33–35-topshiriqlarga mos javoblarni quyidagi banklardan (A–F)
# tanlang: A) ...; B) ...". Bunday savollarda variantlar savolning ostida emas,
# ULARDAN OLDIN, bitta umumiy ro'yxatda turadi va javob "Javob: C" ko'rinishida
# beriladi — shuning uchun ular alohida ajratiladi (`grouped_item` turi).
BANK_RE = re.compile(r'(\d+)\s*[–-]\s*(\d+)-topshiriq\w*\s+mos javoblarni', re.IGNORECASE)
BANK_OPTION_RE = re.compile(r'([A-F])\)\s*([^;]+?)(?=;\s*[A-F]\)|$)')

# Rasm sifatida render qilinadigan vektor chizmalar: chegarasi chizilgan (fill yo'q),
# sahifa kengligini egallamaydigan yetarlicha katta shakllar.
FIG_MIN = 40
FIG_MAX_WIDTH = 500
# 2x — ekranda ham, bosmada ham aniq chiqadigan o'lcham.
FIG_ZOOM = 2.0


def _clean(text):
    return re.sub(r'\s+', ' ', text).strip()


class Command(BaseCommand):
    help = "Javoblari ✓ bilan belgilangan Milliy Sertifikat PDF'ini import qiladi."

    def add_arguments(self, parser):
        parser.add_argument('pdf', help="PDF fayl YOKI PDF'lar turgan papka yo'li.")
        parser.add_argument('--title', default=None,
                            help="Test nomi. Berilmasa fayl nomidan olinadi — bu papka "
                                 "rejimida majburiy, chunki har faylga alohida nom kerak.")
        parser.add_argument('--subject', default='Tarix')
        parser.add_argument('--category', default='certificate',
                            choices=[c[0] for c in Question.CATEGORY_CHOICES])
        parser.add_argument('--duration', type=int, default=60)
        parser.add_argument('--premium', action='store_true')
        parser.add_argument('--publish', action='store_true',
                            help="Darhol nashr etadi. Berilmasa qoralama bo'lib qoladi "
                                 "(tavsiya: avval panelda ko'rib chiqing).")
        parser.add_argument('--dry-run', action='store_true')

    # ── Ajratish ──────────────────────────────────────────────────────────────

    def _lines(self, doc):
        """Matn qatorlari: (sahifa, y0, y1, x0, kegl, matn).

        Kegl (shrift o'lchami) muhim: bu PDF'da savol va variantlar 10pt, TAHLIL
        matni esa 8pt bilan yozilgan. Shu farq izohni variantning ko'chgan
        satridan ajratishning eng ishonchli yo'li — matnning o'ziga qarab taxmin
        qilish 17-savolda xato bergan edi.

        `x0` esa ikki ustunli joylashuvni ochadi: A/C chapda (~49), B/D o'ngda
        (~307). Ko'chgan satr o'z variantining ustunida qoladi."""
        out = []
        for pno, page in enumerate(doc):
            for block in page.get_text('dict')['blocks']:
                if block.get('type') != 0:
                    continue
                for line in block['lines']:
                    text = ''.join(s['text'] for s in line['spans']).strip()
                    if not text or _is_noise(text):
                        continue
                    x0, y0, _x1, y1 = line['bbox']
                    size = line['spans'][0]['size'] if line['spans'] else 10.0
                    out.append((pno, y0, y1, x0, size, text))
        return out

    def _figures(self, doc):
        """Sahifadagi vektor rasm(lar) chegarasi: {sahifa: (x0, y0, x1, y1)}."""
        found = {}
        for pno, page in enumerate(doc):
            rects = [d['rect'] for d in page.get_drawings()
                     if d.get('fill') is None
                     and d['rect'].width > FIG_MIN and d['rect'].height > FIG_MIN
                     and d['rect'].width < FIG_MAX_WIDTH]
            if rects:
                found[pno] = (min(r.x0 for r in rects), min(r.y0 for r in rects),
                              max(r.x1 for r in rects), max(r.y1 for r in rects))
        return found

    def _tables(self, doc):
        """Jadvallar: {sahifa: [(bbox, satrlar), ...]}."""
        found = {}
        for pno, page in enumerate(doc):
            items = [(t.bbox, t.extract()) for t in page.find_tables().tables]
            if items:
                found[pno] = items
        return found

    def _parse(self, doc):
        lines = self._lines(doc)
        figures = self._figures(doc)
        tables = self._tables(doc)

        # Savol boshlari — ketma-ket raqam bo'yicha (izohga qarang).
        starts, expected = [], 1
        for idx, (pno, y0, _y1, _x0, _size, text) in enumerate(lines):
            if expected > 45:
                break
            m = re.match(rf'^{expected}(?:\s+(.*))?$', text)
            if m:
                starts.append({'num': expected, 'idx': idx, 'page': pno, 'y': y0,
                               'head': (m.group(1) or '').strip()})
                expected += 1
        if len(starts) != 45:
            raise CommandError(
                f"45 ta savol kutilgan edi, {len(starts)} ta topildi. PDF tuzilishi "
                f"boshqacha — ajratuvchini moslash kerak.")

        questions = []
        for i, s in enumerate(starts):
            end_idx = starts[i + 1]['idx'] if i + 1 < len(starts) else len(lines)
            end_page = starts[i + 1]['page'] if i + 1 < len(starts) else doc.page_count - 1
            end_y = starts[i + 1]['y'] if i + 1 < len(starts) else 1e6

            # Shu savolga tegishli rasm va jadvallar.
            q_figs, q_tables = [], []
            for pno in range(s['page'], end_page + 1):
                lo = s['y'] if pno == s['page'] else -1
                hi = end_y if pno == end_page else 1e6
                fig = figures.get(pno)
                if fig and lo <= fig[1] < hi:
                    q_figs.append((pno, fig))
                for bbox, rows in tables.get(pno, []):
                    if lo <= bbox[1] < hi:
                        q_tables.append((pno, bbox, rows))

            # Rasm/jadval ichidagi matn takrorlanmasligi uchun chiqarib tashlanadi.
            def _inside_box(pno, y0, y1):
                for fp, (_x0, fy0, _x1, fy1) in q_figs:
                    if fp == pno and fy0 - 4 <= y0 and y1 <= fy1 + 4:
                        return True
                for tp, bbox, _rows in q_tables:
                    if tp == pno and bbox[1] - 4 <= y0 and y1 <= bbox[3] + 4:
                        return True
                return False

            body_lines, options, explanation, subs = [], [], [], []
            current_sub = None
            bank_answer = ''
            # Oxirgi variant qaysi ustunda va qanday keglda boshlangani — ko'chgan
            # satrni izohdan ajratish uchun. Kegl O'ZI yetarli emas: ba'zi savollarda
            # (19, 20) variantlar ham 8pt bilan yozilgan, ya'ni izoh bilan bir xil.
            option_x = option_size = None
            for pno, y0, y1, x0, size, text in lines[s['idx'] + 1:end_idx]:
                if _inside_box(pno, y0, y1):
                    continue
                opt = OPTION_RE.match(text)
                ans = ANSWER_RE.match(text)
                sub = SUB_RE.match(text)
                if opt:
                    # "A)" bilan boshlangan satr HAR DOIM variant: izoh matni hech
                    # qachon variant harfi bilan boshlanmaydi.
                    options.append([opt.group(1), opt.group(2)])
                    option_x, option_size = x0, size
                elif ans and current_sub is not None:
                    current_sub['answer'] = ans.group(1).strip()
                elif ans and not options:
                    # "Javob: C" — umumiy bankdan tanlangan harf (33-35-savollar).
                    bank_answer = ans.group(1).strip()
                elif sub and s['num'] >= 36:
                    current_sub = {'label': sub.group(1), 'text': sub.group(2), 'answer': ''}
                    subs.append(current_sub)
                elif options:
                    # Variantlardan keyingi satr: o'z variantining ustunida va bir xil
                    # keglda bo'lsa — ko'chgan davomi, aks holda tahlil matni.
                    same_column = option_x is not None and abs(x0 - option_x) < 12
                    same_size = option_size is not None and abs(size - option_size) < 0.6
                    if same_column and same_size:
                        options[-1][1] += ' ' + text
                    else:
                        explanation.append(text)
                elif current_sub is not None:
                    current_sub['text'] += ' ' + text
                else:
                    body_lines.append(text)

            head = s['head']
            body_parts = ([head] if head else []) + body_lines
            # Bank e'loni savol matni emas — u guruhga tegishli ko'rsatma.
            body_parts = [b for b in body_parts if not BANK_RE.search(b)]
            body = _clean(' '.join(body_parts))
            questions.append({
                'num': s['num'], 'body': body,
                'options': [(k, _clean(v.replace(CHECK, '')), CHECK in v) for k, v in options],
                'explanation': _clean(' '.join(explanation)),
                'subs': [{**x, 'text': _clean(x['text']), 'answer': _clean(x['answer'])} for x in subs],
                'figures': q_figs, 'tables': q_tables,
                'bank_answer': bank_answer,
            })

        # Umumiy javob banki butun hujjatda bir marta e'lon qilinadi — uni alohida
        # topamiz va qaysi savollarga tegishli ekanini o'sha e'londan o'qiymiz.
        bank = None
        for idx, (_pno, _y0, _y1, x0, size, text) in enumerate(lines):
            m = BANK_RE.search(text)
            if not m:
                continue
            # E'lon bir necha qatorga cho'ziladi ("...A) Kres" / "(1358); C) Trua ...").
            # Davomi bir xil ustun va keglda bo'ladi, shuning uchun shu ikki belgi
            # bo'yicha yig'iladi — aks holda faqat birinchi qatordagi variantlar
            # topilib, bank yarim qolardi.
            joined = text
            for nxt_x0, nxt_size, nxt_text in ((l[3], l[4], l[5]) for l in lines[idx + 1:idx + 6]):
                if abs(nxt_x0 - x0) > 4 or abs(nxt_size - size) > 0.6:
                    break
                joined += ' ' + nxt_text
            # Variantlar FAQAT ikki nuqtadan keyin sanaladi. E'lonning o'zida "(A–F)"
            # yozuvi bor va undagi "F)" ham variant deb topilib, bank ikki marta
            # "F" oladi — bu esa `unique_together` cheklovini buzadi.
            head, _, tail = joined.partition(':')
            opts, seen = [], set()
            for g in BANK_OPTION_RE.finditer(tail):
                label = g.group(1)
                if label in seen:
                    continue
                seen.add(label)
                opts.append((label, _clean(g.group(2))))
            if opts:
                bank = {'from': int(m.group(1)), 'to': int(m.group(2)),
                        'instruction': _clean(head) + '.', 'options': opts}
            break
        return questions, bank

    # ── Chiqarish ─────────────────────────────────────────────────────────────

    def _table_html(self, rows):
        """Jadvalni HTML'ga aylantiradi.

        PDF'dan kelgan katak ko'pincha butun ustunni bitta satrga qamrab oladi
        (`'I\\nII\\nIII'`), shuning uchun kataklar qator bo'yicha yoyiladi."""
        expanded = []
        for row in rows:
            cells = [(c or '').split('\n') for c in row]
            depth = max(len(c) for c in cells) if cells else 0
            for i in range(depth):
                expanded.append([c[i].strip() if i < len(c) else '' for c in cells])
        if not expanded:
            return ''
        head, *body = expanded
        html = ['<table><thead><tr>']
        html += [f'<th>{escape(c)}</th>' for c in head]
        html.append('</tr></thead><tbody>')
        for row in body:
            html.append('<tr>' + ''.join(f'<td>{escape(c)}</td>' for c in row) + '</tr>')
        html.append('</tbody></table>')
        return ''.join(html)

    def _render_figure(self, doc, pno, bbox, dest: Path):
        import pymupdf

        page = doc[pno]
        # Chetidan biroz keng olinadi — chegara chiziqlari kesilib qolmasin.
        clip = pymupdf.Rect(bbox[0] - 8, bbox[1] - 8, bbox[2] + 8, bbox[3] + 8)
        pix = page.get_pixmap(clip=clip, matrix=pymupdf.Matrix(FIG_ZOOM, FIG_ZOOM))
        dest.parent.mkdir(parents=True, exist_ok=True)
        pix.save(dest)

    @staticmethod
    def _title_from_filename(path):
        """Fayl nomidan o'qiladigan test nomi yasaydi.

        13 ta PDF'ni qo'lda nomlash — 13 marta xato qilish imkoniyati, shuning uchun
        nom fayl nomidan olinadi:

            Milliy_Sertifikat_1-2-mavzu_TAHLIL_JAVOBLAR.pdf
            -> "Milliy Sertifikat 1-2-mavzu"

        Xizmatchi so'zlar ("TAHLIL", "JAVOBLAR") tashlanadi: ular faylning
        o'qituvchi uchun ekanini bildiradi, test nomiga aloqasi yo'q."""
        name = re.sub(r'[_\s]+', ' ', path.stem).strip()
        name = re.sub(r'\b(TAHLIL|JAVOBLAR|VA)\b', ' ', name, flags=re.IGNORECASE)
        return re.sub(r'\s+', ' ', name).strip(' -')

    def handle(self, *args, **options):
        try:
            import pymupdf  # noqa: F401
        except ImportError:
            raise CommandError("pymupdf o'rnatilmagan.")

        path = Path(options['pdf'])
        if not path.exists():
            raise CommandError(f"Fayl topilmadi: {path}")

        if path.is_dir():
            pdfs = sorted(p for p in path.iterdir() if p.suffix.lower() == '.pdf')
            if not pdfs:
                raise CommandError(f"Papkada PDF topilmadi: {path}")
            if options['title']:
                raise CommandError(
                    "--title papka rejimida ishlatilmaydi: har bir faylga alohida nom "
                    "kerak, u fayl nomidan olinadi."
                )
            return self._handle_folder(pdfs, options)

        title = options['title'] or self._title_from_filename(path)
        self._import_one(path, title, options)

    def _handle_folder(self, pdfs, options):
        """Papkadagi hamma PDF'ni ketma-ket import qiladi.

        Har fayl ALOHIDA tranzaksiyada: bittasi xato bersa qolgan 12 tasi baribir
        yuklanadi. Aks holda 13-fayldagi bitta nuqson butun ishni bekor qilardi."""
        self.stdout.write(f"{len(pdfs)} ta PDF topildi.\n")
        ok, failed = [], []

        for index, pdf in enumerate(pdfs, start=1):
            title = self._title_from_filename(pdf)
            self.stdout.write(self.style.HTTP_INFO(f"\n[{index}/{len(pdfs)}] {pdf.name}"))
            try:
                self._import_one(pdf, title, options)
                ok.append(title)
            except Exception as exc:  # noqa: BLE001 — bitta fayl butun partiyani to'xtatmasin
                failed.append((pdf.name, str(exc)))
                self.stdout.write(self.style.ERROR(f"  XATO: {exc}"))

        self.stdout.write(self.style.SUCCESS(f"\n\nTayyor: {len(ok)} ta import qilindi."))
        if failed:
            self.stdout.write(self.style.ERROR(f"{len(failed)} ta fayl o'tmadi:"))
            for name, err in failed:
                self.stdout.write(self.style.ERROR(f"  - {name}: {err}"))

    def _import_one(self, path, title, options):
        import pymupdf

        doc = pymupdf.open(path)
        questions, bank = self._parse(doc)

        grouped_nums = set(range(bank['from'], bank['to'] + 1)) if bank else set()
        mcq = [q for q in questions if q['options']]
        grouped = [q for q in questions if q['num'] in grouped_nums]
        openq = [q for q in questions if not q['options'] and q['num'] not in grouped_nums]
        no_answer = [q['num'] for q in mcq if not any(c for _, _, c in q['options'])]
        no_answer += [q['num'] for q in grouped if not q['bank_answer']]
        if bank:
            self.stdout.write(f"Javob banki: {bank['from']}-{bank['to']}-savollar, "
                              f"{len(bank['options'])} variant")
        figs = [(q['num'], len(q['figures'])) for q in questions if q['figures']]
        tabs = [(q['num'], len(q['tables'])) for q in questions if q['tables']]

        self.stdout.write(f"Savollar: {len(questions)} (variantli {len(mcq)}, "
                          f"guruhli {len(grouped)}, yozma {len(openq)})")
        self.stdout.write(f"Rasmli savollar : {figs}")
        self.stdout.write(f"Jadvalli savollar: {tabs}")
        if no_answer:
            self.stdout.write(self.style.ERROR(f"JAVOBI BELGILANMAGAN: {no_answer}"))
        sub_counts = sum(len(q['subs']) for q in openq)
        self.stdout.write(f"Yozma savollardagi qism-savollar: {sub_counts}")

        if options['dry_run']:
            for q in questions[:3] + questions[16:17] + questions[19:20] + questions[-1:]:
                self.stdout.write(f"\n#{q['num']} {q['body'][:100]}")
                for key, text, correct in q['options']:
                    self.stdout.write(f"   {'*' if correct else ' '} {key}) {text[:80]}")
                for sub in q['subs']:
                    self.stdout.write(f"   {sub['label']}) {sub['text'][:70]} -> {sub['answer'][:50]}")
            self.stdout.write(self.style.WARNING("\n(sinov rejimi — hech narsa saqlanmadi)"))
            return

        media_dir = Path(settings.MEDIA_ROOT) / 'questions'
        slug = re.sub(r'[^a-z0-9]+', '-', title.lower()).strip('-')[:40]

        with transaction.atomic():
            subject, _ = Subject.objects.get_or_create(
                name=options['subject'],
                defaults={'slug': options['subject'].lower().replace(' ', '-')},
            )
            TestSet.objects.filter(title=title).delete()
            test = TestSet.objects.create(
                subject=subject, title=title, description='',
                category=options['category'], duration_minutes=options['duration'],
                is_premium=options['premium'], is_published=options['publish'],
            )

            # Umumiy javob banki — savollardan OLDIN yaratiladi, chunki 33-35-savollar
            # unga bog'lanadi (`Question.clean()` guruhsiz `grouped_item`ga ruxsat bermaydi).
            group, group_options = None, {}
            if bank:
                from tests_app.models import GroupOption, QuestionGroup

                group = QuestionGroup.objects.create(test_set=test, instruction=bank['instruction'])
                for order, (label, text) in enumerate(bank['options']):
                    group_options[label] = GroupOption.objects.create(
                        group=group, label=label, text=text[:500], order=order)

            created = []
            for q in questions:
                body = f"<p>{escape(q['body'])}</p>"
                for _pno, _bbox, rows in q['tables']:
                    body += self._table_html(rows)

                image_url = ''
                if q['figures']:
                    pno, bbox = q['figures'][0]
                    name = f"{slug}-q{q['num']}.png"
                    self._render_figure(doc, pno, bbox, media_dir / name)
                    image_url = f"{settings.MEDIA_URL.rstrip('/')}/questions/{name}"
                    if not image_url.startswith('/'):
                        image_url = '/' + image_url

                is_grouped = q['num'] in grouped_nums
                if q['options']:
                    qtype = 'single_choice'
                elif is_grouped:
                    qtype = 'grouped_item'
                else:
                    qtype = 'open_written'

                question = Question(
                    subject=subject, body=body, question_type=qtype,
                    difficulty='medium', category=options['category'],
                    explanation=q['explanation'],
                    image_url=image_url or None,
                    group=group if is_grouped else None,
                    correct_group_option=group_options.get(q['bank_answer']) if is_grouped else None,
                )
                question.save()
                for key, text, correct in q['options']:
                    AnswerOption.objects.create(question=question, text=f"{key}) {text}",
                                                is_correct=correct)
                for order, sub in enumerate(q['subs']):
                    SubQuestion.objects.create(question=question, label=sub['label'],
                                               text=sub['text'], reference_answer=sub['answer'],
                                               order=order)
                created.append(question)

            test.questions.set(created)
            test.question_order = [c.id for c in created]
            test.save(update_fields=['question_order'])

        state = 'nashr etildi' if options['publish'] else "QORALAMA (panelda ko'rib chiqing)"
        self.stdout.write(self.style.SUCCESS(
            f"\n'{title}' — {len(created)} ta savol, {state}."))
        if figs:
            self.stdout.write(f"Rasmlar saqlandi: {media_dir}")
