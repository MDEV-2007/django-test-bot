"""Bitta JSON fayldan savol-javob (qisqa yozma) testini import qiladi.

JSON shakli — @Tarix_quiz_testlar kabi kanallardan keladigan format:

    {
      "test": {"sinf": 6, "fan": "Tarix", "mavzular": "...", ...},
      "savollar": [
        {"id": 1, "savol": "...", "javob": "...", "izoh": "... (ixtiyoriy)"},
        ...
      ]
    }

Har bir savol `open_written` turida yaratiladi: variant emas, o'quvchi yozib javob beradi,
Groq uni `javob` maydoni bilan solishtirib baholaydi (tests_app.models.Question.reference_answer).
`izoh` bo'lsa — darslik variantlari orasidagi farq haqidagi eslatma, natija sahifasida
ko'rsatiladigan `explanation`ga qo'shiladi, baholashga aralashmasin deb `reference_answer`ga
kirmaydi.

Ishlatish:
    python manage.py import_qa_test tests_app/fixtures/qa_imports/tarix_6sinf_antik_va_rim.json \\
        --title "Tarix 6-sinf: Antik davlatlar va Qadimgi Rim (33-38-mavzular)" \\
        --topic "Antik davlatlar va Qadimgi Rim"

    --dry-run bilan hech narsa saqlanmaydi, faqat nima yaratilishi ko'rsatiladi.

    --chunk-size bilan bo'lib yuklash — masalan 61 ta ochiq savol bitta o'tirish uchun ko'p,
    --chunk-size 30 bersangiz ikkita TestSet yaratiladi: "... — 1-qism" (1-30) va
    "... — 2-qism (davomi)" (31-61), har biriga savol soniga mos qisqartirilgan vaqt bilan.

Qayta ishga tushirish xavfsiz: xuddi shu nom(lar) bilan test allaqachon bo'lsa, u savollari
bilan birga o'chirilib qayta yaratiladi (seed_demo_test bilan bir xil naqsh) — ya'ni faylni
tuzatib yoki --chunk-size'ni o'zgartirib qayta import qilish eskisini ikkilantirmaydi.
"""
import json
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from learning.models import Topic
from tests_app.models import Question, Subject, TestSet


class Command(BaseCommand):
    help = "JSON fayldagi savol-javoblardan bitta yoki bir nechta yozma (open_written) TestSet yaratadi."

    def add_arguments(self, parser):
        parser.add_argument('json_path', help="Savol-javoblar fayli (masalan: tests_app/fixtures/qa_imports/...json)")
        parser.add_argument('--title', required=True, help="TestSet nomi — o'quvchi katalogda ko'radigan sarlavha.")
        parser.add_argument('--topic', default='', help="Mavzu nomi (ixtiyoriy). Berilsa, shu Subject ostida topiladi yoki yaratiladi.")
        parser.add_argument('--subject', default='', help="Fan nomi. Berilmasa JSON'dagi test.fan ishlatiladi.")
        parser.add_argument('--category', default='history', choices=[c[0] for c in Question.CATEGORY_CHOICES])
        parser.add_argument('--duration', type=int, default=30, help="Butun test uchun daqiqa (standart: 30). Bo'lib yuklashda savol soniga mutanosib taqsimlanadi.")
        parser.add_argument('--premium', action='store_true', help="Berilsa, test faqat xarid qilganlarga ochiq bo'ladi (standart: bepul).")
        parser.add_argument('--chunk-size', type=int, default=0, help="Har shuncha savoldan bitta TestSet (masalan 30). Berilmasa — bitta test.")
        parser.add_argument('--dry-run', action='store_true', help="Hech narsa saqlamaydi, faqat nima yaratilishini ko'rsatadi.")

    def handle(self, *args, **options):
        path = Path(options['json_path'])
        if not path.exists():
            raise CommandError(f"Fayl topilmadi: {path}")

        data = json.loads(path.read_text(encoding='utf-8'))
        meta = data.get('test', {})
        items = data.get('savollar', [])
        if not items:
            raise CommandError("JSON'da 'savollar' ro'yxati bo'sh yoki yo'q.")

        subject_name = options['subject'] or meta.get('fan') or 'Tarix'
        base_title = options['title']
        chunk_size = options['chunk_size']
        chunks = [items[i:i + chunk_size] for i in range(0, len(items), chunk_size)] if chunk_size > 0 else [items]

        self.stdout.write(f"Fan: {subject_name} | Sinf: {meta.get('sinf', '?')} | Savollar: {len(items)}")
        if len(chunks) > 1:
            self.stdout.write(f"Bo'lib yuklanadi: {len(chunks)} ta test, har birida ~{chunk_size} savol")

        if options['dry_run']:
            for idx, chunk in enumerate(chunks, start=1):
                self.stdout.write(f"  {self._chunk_title(base_title, idx, len(chunks))} — {len(chunk)} ta savol")
                for item in chunk[:2]:
                    self.stdout.write(f"    #{item['id']}: {item['savol'][:65]}")
            self.stdout.write(self.style.WARNING("(sinov rejimi — hech narsa saqlanmadi)"))
            return

        with transaction.atomic():
            subject, _ = Subject.objects.get_or_create(
                name=subject_name, defaults={'slug': subject_name.lower().replace(' ', '-')},
            )

            topic = None
            if options['topic']:
                topic, _ = Topic.objects.get_or_create(
                    title=options['topic'],
                    defaults={
                        'slug': options['topic'].lower().replace(' ', '-').replace("'", ''),
                        'subject': subject,
                        'category': options['category'],
                    },
                )

            # Bo'lib yuklashga o'tilganda, avvalgi bir butun (bo'linmagan) TestSet bo'lsa,
            # u alohida nom ostida qolib ketmasligi uchun tozalanadi.
            if len(chunks) > 1:
                self._replace_testset(base_title)

            created = []
            for idx, chunk in enumerate(chunks, start=1):
                chunk_title = self._chunk_title(base_title, idx, len(chunks))
                self._replace_testset(chunk_title)

                duration = max(5, round(options['duration'] * len(chunk) / len(items)))
                test_set = TestSet.objects.create(
                    subject=subject, title=chunk_title, description='',
                    category=options['category'], duration_minutes=duration,
                    is_premium=options['premium'], is_published=True,
                )
                questions = [
                    Question.objects.create(
                        topic=topic, subject=subject,
                        body=f"<p>{_escape(item['savol'])}</p>",
                        question_type='open_written', difficulty='medium',
                        category=options['category'],
                        reference_answer=item['javob'],
                        explanation=item.get('izoh', ''),
                    )
                    for item in chunk
                ]
                test_set.questions.add(*questions)
                created.append((chunk_title, len(questions)))

        for chunk_title, count in created:
            self.stdout.write(self.style.SUCCESS(f"Tayyor: '{chunk_title}' — {count} ta savol, katalogda ko'rinadi."))

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
        (masalan qo'lda qo'shilgan) qolaveradi."""
        old = TestSet.objects.filter(title=title).prefetch_related('questions__test_sets').first()
        if not old:
            return
        orphan_ids = [q.id for q in old.questions.all() if q.test_sets.count() == 1]
        Question.objects.filter(id__in=orphan_ids).delete()
        old.delete()


def _escape(text):
    return text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
