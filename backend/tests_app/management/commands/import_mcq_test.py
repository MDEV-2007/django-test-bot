"""JSON fayldan VARIANTLI (single_choice) test import qiladi.

    python manage.py import_mcq_test fayl.json --title "CEFR B1 — Grammar 1" \\
        --subject "Ingliz tili" --category cefr

NEGA BU BUYRUQ BOR
------------------
Variantli savollarni import qilishning yagona yo'li PDF edi (`import_pdf_tests`,
`import_dtm_pdf`) va u parser DTM/Milliy sertifikat qog'ozining aniq joylashuviga
moslangan. Boshqa manbadan (masalan ingliz tili CEFR to'plamidan) kelgan variantli
savollarni yuklashning umuman yo'li yo'q edi — `import_qa_test` esa faqat YOZMA
(open_written) savollar yaratadi.

Bu buyruq shu bo'shliqni yopadi va formatga bog'liq emas: manba nima bo'lishidan
qat'i nazar, uni quyidagi oddiy JSON'ga keltirsangiz yetarli.

JSON SHAKLI
-----------
    {
      "test": {"fan": "Ingliz tili", "izoh": "ixtiyoriy"},
      "savollar": [
        {
          "savol": "She ___ to school every day.",
          "variantlar": ["go", "goes", "going", "gone"],
          "javob": "goes",
          "izoh": "Present Simple, 3-shaxs birlik.",
          "daraja": "B1",
          "qiyinlik": "medium"
        }
      ]
    }

`javob` uchta ko'rinishda bo'lishi mumkin va shu tartibda tekshiriladi:
  1. variant matnining O'ZI ("goes")
  2. harf ("B", "b", "B)")
  3. 1 dan boshlanadigan tartib raqami (2)

Tartib muhim: variantlarning o'zi "A"/"B" bo'lgan holatda matn bo'yicha moslik
harfdan ustun turadi, aks holda javob noto'g'ri savolga tushib qolardi.

`daraja` (ixtiyoriy) — CEFR darajasi. Bo'lsa, savol `cefr-<daraja>` mavzusiga
bog'lanadi (`seed_english_cefr` yaratadigan A1...C2 mavzulari). Shu tufayli
analitikadagi mavzular kesimi "daraja bo'yicha o'zlashtirish"ga aylanadi.
Bo'lmasa — `--topic` bilan berilgan umumiy mavzu ishlatiladi.

XATO MA'LUMOTNI JIMGINA YUTMAYDI
--------------------------------
Savolda variant yetarli bo'lmasa yoki `javob` variantlarning hech biriga tushmasa,
buyruq HECH NARSA saqlamay to'xtaydi va muammoli savollar ro'yxatini chiqaradi.
Sabab: bir marta PDF importida noto'g'ri javoblar bazaga tushib, imtihonga
tayyorlanayotgan o'quvchiga noto'g'ri material ko'rsatilgan edi. Yarim import
qilingan testdan ko'ra, umuman import qilinmagan test yaxshiroq.

Qayta ishga tushirish xavfsiz: xuddi shu nomli test bo'lsa, u (faqat o'ziga tegishli
savollari bilan) o'chirilib qayta yaratiladi — `import_qa_test` bilan bir xil naqsh.
"""
import json
import re
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from learning.models import Topic
from tests_app.models import AnswerOption, Question, Subject, TestSet

LETTERS = 'ABCDEFGH'


class Command(BaseCommand):
    help = "JSON fayldagi variantli savollardan TestSet yaratadi."

    def add_arguments(self, parser):
        parser.add_argument('json_path', help="Savollar fayli.")
        parser.add_argument('--title', required=True, help="TestSet nomi — katalogda ko'rinadigan sarlavha.")
        parser.add_argument('--subject', default='', help="Fan nomi. Berilmasa JSON'dagi test.fan ishlatiladi.")
        parser.add_argument('--category', default='cefr', choices=[c[0] for c in Question.CATEGORY_CHOICES])
        parser.add_argument('--topic', default='', help="Umumiy mavzu (ixtiyoriy). Savoldagi `daraja` undan ustun turadi.")
        parser.add_argument('--duration', type=int, default=30, help="Butun test uchun daqiqa (standart: 30).")
        parser.add_argument('--premium', action='store_true', help="Test faqat xarid qilganlarga ochiq bo'ladi.")
        parser.add_argument('--draft', action='store_true', help="Nashr qilinmagan holda yaratadi (panelda tekshirib, keyin nashr qilasiz).")
        parser.add_argument('--chunk-size', type=int, default=0, help="Har shuncha savoldan bitta TestSet.")
        parser.add_argument('--dry-run', action='store_true', help="Hech narsa saqlamaydi — tekshiradi va ko'rsatadi.")

    # ── Javobni aniqlash ──────────────────────────────────────────────────────────

    @staticmethod
    def _resolve_answer(raw, options):
        """`javob` qaysi variantga tegishli ekanini aniqlaydi. Topilmasa None."""
        if raw is None:
            return None
        text = str(raw).strip()
        if not text:
            return None

        # 1. Variant matnining o'zi (registrga sezgir emas).
        for idx, option in enumerate(options):
            if option.strip().lower() == text.lower():
                return idx

        # 2. Harf: "B", "b", "B)", "B."
        letter = text.rstrip(').').upper()
        if len(letter) == 1 and letter in LETTERS:
            idx = LETTERS.index(letter)
            if idx < len(options):
                return idx

        # 3. 1 dan boshlanadigan tartib raqami.
        if re.fullmatch(r'\d+', text):
            idx = int(text) - 1
            if 0 <= idx < len(options):
                return idx

        return None

    def _validate(self, items):
        """Butun faylni tekshiradi. Muammolar ro'yxatini qaytaradi (bo'sh = toza)."""
        problems = []
        for number, item in enumerate(items, start=1):
            body = (item.get('savol') or '').strip()
            options = [str(o).strip() for o in (item.get('variantlar') or []) if str(o).strip()]

            if not body:
                problems.append(f"#{number}: savol matni bo'sh")
                continue
            if len(options) < 2:
                problems.append(f"#{number}: kamida 2 ta variant kerak (hozir {len(options)} ta)")
                continue
            if len(set(o.lower() for o in options)) != len(options):
                problems.append(f"#{number}: bir xil variant ikki marta yozilgan")
                continue
            if self._resolve_answer(item.get('javob'), options) is None:
                problems.append(
                    f"#{number}: 'javob' ({item.get('javob')!r}) variantlarning hech biriga tushmadi")
        return problems

    # ── Asosiy oqim ───────────────────────────────────────────────────────────────

    def handle(self, *args, **options):
        path = Path(options['json_path'])
        if not path.exists():
            raise CommandError(f"Fayl topilmadi: {path}")

        try:
            data = json.loads(path.read_text(encoding='utf-8'))
        except json.JSONDecodeError as exc:
            raise CommandError(f"JSON o'qib bo'lmadi: {exc}")

        meta = data.get('test', {})
        items = data.get('savollar', [])
        if not items:
            raise CommandError("JSON'da 'savollar' ro'yxati bo'sh yoki yo'q.")

        problems = self._validate(items)
        if problems:
            self.stdout.write(self.style.ERROR(f"{len(problems)} ta savolda muammo topildi:"))
            for line in problems[:25]:
                self.stdout.write(f"  {line}")
            if len(problems) > 25:
                self.stdout.write(f"  ... yana {len(problems) - 25} ta")
            raise CommandError("Hech narsa saqlanmadi. Faylni tuzatib, qayta urinib ko'ring.")

        subject_name = options['subject'] or meta.get('fan') or 'Ingliz tili'
        base_title = options['title']
        chunk_size = options['chunk_size']
        chunks = ([items[i:i + chunk_size] for i in range(0, len(items), chunk_size)]
                  if chunk_size > 0 else [items])

        self.stdout.write(f"Fan: {subject_name} | Savollar: {len(items)} | Kategoriya: {options['category']}")
        if len(chunks) > 1:
            self.stdout.write(f"Bo'lib yuklanadi: {len(chunks)} ta test, har birida ~{chunk_size} savol")

        if options['dry_run']:
            for idx, chunk in enumerate(chunks, start=1):
                self.stdout.write(f"\n  {self._chunk_title(base_title, idx, len(chunks))} — {len(chunk)} ta savol")
                for item in chunk[:3]:
                    opts = [str(o).strip() for o in item['variantlar']]
                    correct = self._resolve_answer(item.get('javob'), opts)
                    self.stdout.write(f"    {item['savol'][:60]}")
                    self.stdout.write(f"      -> to'g'ri javob: {opts[correct]}")
            self.stdout.write(self.style.WARNING("\n(sinov rejimi — hech narsa saqlanmadi)"))
            return

        with transaction.atomic():
            subject, _ = Subject.objects.get_or_create(
                name=subject_name,
                defaults={'slug': subject_name.lower().replace(' ', '-').replace("'", '')},
            )

            default_topic = None
            if options['topic']:
                default_topic, _ = Topic.objects.get_or_create(
                    title=options['topic'],
                    defaults={
                        'slug': options['topic'].lower().replace(' ', '-').replace("'", ''),
                        'subject': subject,
                        'category': options['category'],
                    },
                )

            if len(chunks) > 1:
                self._replace_testset(base_title)

            created = []
            for idx, chunk in enumerate(chunks, start=1):
                chunk_title = self._chunk_title(base_title, idx, len(chunks))
                self._replace_testset(chunk_title)

                duration = max(5, round(options['duration'] * len(chunk) / len(items)))
                test_set = TestSet.objects.create(
                    subject=subject, title=chunk_title, description=meta.get('izoh', ''),
                    category=options['category'], duration_minutes=duration,
                    is_premium=options['premium'], is_published=not options['draft'],
                )

                questions = []
                for item in chunk:
                    opts = [str(o).strip() for o in item['variantlar'] if str(o).strip()]
                    correct = self._resolve_answer(item.get('javob'), opts)

                    question = Question.objects.create(
                        topic=self._topic_for(item, subject, default_topic),
                        subject=subject,
                        body=f"<p>{_escape(item['savol'].strip())}</p>",
                        question_type='single_choice',
                        difficulty=item.get('qiyinlik') or 'medium',
                        category=options['category'],
                        explanation=item.get('izoh', ''),
                    )
                    AnswerOption.objects.bulk_create([
                        AnswerOption(question=question, text=text, is_correct=(pos == correct))
                        for pos, text in enumerate(opts)
                    ])
                    questions.append(question)

                test_set.questions.add(*questions)
                created.append((chunk_title, len(questions)))

        for chunk_title, count in created:
            state = 'qoralama' if options['draft'] else 'katalogda ko\'rinadi'
            self.stdout.write(self.style.SUCCESS(f"Tayyor: '{chunk_title}' — {count} ta savol, {state}."))

    # ── Yordamchilar ──────────────────────────────────────────────────────────────

    @staticmethod
    def _topic_for(item, subject, default_topic):
        """Savoldagi `daraja` CEFR mavzusiga bog'laydi; bo'lmasa umumiy mavzu."""
        level = (item.get('daraja') or '').strip().lower()
        if not level:
            return default_topic
        topic = Topic.objects.filter(slug=f"cefr-{level}").first()
        return topic or default_topic

    @staticmethod
    def _chunk_title(base_title, idx, total):
        if total == 1:
            return base_title
        suffix = f"{idx}-qism" + (" (davomi)" if idx > 1 else "")
        return f"{base_title} — {suffix}"

    @staticmethod
    def _replace_testset(title):
        """Xuddi shu nomdagi eski test bo'lsa, faqat aynan shu testgagina tegishli
        savollari bilan birga o'chiradi — boshqa test bilan baham ko'rilgan savol
        qolaveradi (import_qa_test bilan bir xil naqsh)."""
        old = TestSet.objects.filter(title=title).prefetch_related('questions__test_sets').first()
        if not old:
            return
        orphan_ids = [q.id for q in old.questions.all() if q.test_sets.count() == 1]
        Question.objects.filter(id__in=orphan_ids).delete()
        old.delete()


def _escape(text):
    return text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
