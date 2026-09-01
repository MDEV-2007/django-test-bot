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

Qayta ishga tushirish xavfsiz: xuddi shu --title bilan test allaqachon bo'lsa, u savollari
bilan birga o'chirilib qayta yaratiladi (seed_demo_test bilan bir xil naqsh) — ya'ni faylni
tuzatib qayta import qilish eskisini ikkilantirmaydi.
"""
import json
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from learning.models import Topic
from tests_app.models import Question, Subject, TestSet


class Command(BaseCommand):
    help = "JSON fayldagi savol-javoblardan bitta yozma (open_written) TestSet yaratadi."

    def add_arguments(self, parser):
        parser.add_argument('json_path', help="Savol-javoblar fayli (masalan: tests_app/fixtures/qa_imports/...json)")
        parser.add_argument('--title', required=True, help="TestSet nomi — o'quvchi katalogda ko'radigan sarlavha.")
        parser.add_argument('--topic', default='', help="Mavzu nomi (ixtiyoriy). Berilsa, shu Subject ostida topiladi yoki yaratiladi.")
        parser.add_argument('--subject', default='', help="Fan nomi. Berilmasa JSON'dagi test.fan ishlatiladi.")
        parser.add_argument('--category', default='history', choices=[c[0] for c in Question.CATEGORY_CHOICES])
        parser.add_argument('--duration', type=int, default=30, help="Test uchun daqiqa (standart: 30).")
        parser.add_argument('--premium', action='store_true', help="Berilsa, test faqat xarid qilganlarga ochiq bo'ladi (standart: bepul).")
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
        title = options['title']
        dry = options['dry_run']

        self.stdout.write(f"Fan: {subject_name} | Sinf: {meta.get('sinf', '?')} | Savollar: {len(items)}")
        self.stdout.write(f"Test nomi: {title}")
        if options['topic']:
            self.stdout.write(f"Mavzu: {options['topic']}")

        if dry:
            for item in items[:3]:
                self.stdout.write(f"  #{item['id']}: {item['savol'][:70]}")
            self.stdout.write(f"  ... jami {len(items)} ta savol")
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

            # Xuddi shu nomdagi eski test bo'lsa — savollari bilan birga almashtiriladi
            # (Question.test_sets M2M orqali bog'langan, boshqa testda ishlatilmayotgan
            # savol shu bilan birga tozalanadi). Faylni tuzatib qayta ishga tushirish
            # xavfsiz bo'lishi uchun.
            old = TestSet.objects.filter(title=title).prefetch_related('questions__test_sets').first()
            if old:
                # Faqat aynan shu testgagina tegishli savollarni o'chiramiz — boshqa
                # test bilan baham ko'rilgan savol (masalan qo'lda qo'shilgan) qolaveradi.
                orphan_ids = [q.id for q in old.questions.all() if q.test_sets.count() == 1]
                Question.objects.filter(id__in=orphan_ids).delete()
                old.delete()

            test_set = TestSet.objects.create(
                subject=subject,
                title=title,
                description=f"{meta.get('manba', '')} manbasidan olingan savollar.".strip(),
                category=options['category'],
                duration_minutes=options['duration'],
                is_premium=options['premium'],
                is_published=True,
            )

            questions = []
            for item in items:
                explanation = item.get('izoh', '')
                q = Question.objects.create(
                    topic=topic,
                    subject=subject,
                    body=f"<p>{_escape(item['savol'])}</p>",
                    question_type='open_written',
                    difficulty='medium',
                    category=options['category'],
                    reference_answer=item['javob'],
                    explanation=explanation,
                )
                questions.append(q)

            test_set.questions.add(*questions)

        self.stdout.write(self.style.SUCCESS(
            f"Tayyor: '{title}' (id={test_set.id}), {len(questions)} ta savol, katalogda ko'rinadi."
        ))


def _escape(text):
    return text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
