"""CEFR mock testini JSON fayldan import qiladi (idempotent — bir xil sarlavha qayta
yuklansa, eski partlar va savollar almashtiriladi).

    python manage.py import_cefr_json mocks/reading_19.json
    python manage.py import_cefr_json mocks/listening_16.json --audio-dir mocks/audio/

NEGA JSON
---------
CEFR varaqasi PDF'da har xil ko'rinishda keladi (matn ustunlarga bo'lingan, bo'shliqlar
chizib qo'yilgan, javob kaliti alohida faylda). PDF'ni avtomatik ajratish bu yerda
noaniqlikka olib keladi, shuning uchun oraliq format — inson tekshirgan JSON. PDF'dan
JSON'ga o'tkazishni bir marta qilasiz, undan keyingi hamma narsa avtomatik.

JSON SHAKLI
-----------
{
  "title": "CEFR Reading Mock 19",
  "subject": "Ingliz tili",          // ixtiyoriy, standart: "Ingliz tili"
  "duration_minutes": 60,
  "is_premium": true,                 // ixtiyoriy, standart: true
  "is_published": true,               // ixtiyoriy, standart: false (qoralama)
  "sections": [
    {
      "skill": "reading",             // reading | listening | writing
      "part": 1,
      "title": "INJURED BIRD",
      "instruction": "Read the texts. Fill in each gap with ONE word.",
      "passage": "There was a narrow path in the {{1}} that he often followed.",
      "audio": "part1.mp3",           // listening uchun (--audio-dir ga nisbatan)
      "audio_play_limit": 2,
      "image": "map.png",             // xarita rasmi (--audio-dir ga nisbatan)
      "bank": {                       // umumiy javob banki (A-F) — matching uchun
        "instruction": "Choose the correct heading for each paragraph.",
        "options": {"K": "Weekends as time to recharge", "L": "..."}
      },
      "questions": [
        {"number": 1, "type": "gap_fill", "max_words": 1, "answers": ["forest", "the forest"]},
        {"number": 21, "type": "single_choice", "body": "Why did he leave?",
         "choices": {"A": "...", "B": "...", "C": "...", "D": "..."}, "answer": "C"},
        {"number": 25, "type": "tfng", "body": "Humboldt believed...", "answer": "NOT GIVEN"},
        {"number": 15, "type": "grouped_item", "body": "15. The night before...", "answer": "L"},
        {"number": 1, "type": "writing_task", "body": "Write an email...",
         "min_words": 60, "max_words": 80}
      ]
    }
  ]
}
"""
import json
import re
from pathlib import Path

from django.core.files import File
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from learning.models import Topic
from tests_app.models import (
    AcceptedAnswer, AnswerOption, ExamSection, GroupOption, Question, QuestionGroup, Subject,
)

VALID_SKILLS = {'reading', 'listening', 'writing'}


class _DryRun(Exception):
    """Tranzaksiyani ataylab bekor qilish uchun — `--dry-run` da hech narsa saqlanmaydi."""

    def __init__(self, counts):
        super().__init__('dry run')
        self.counts = counts


class Command(BaseCommand):
    help = "CEFR mock testini JSON fayldan import qiladi."

    def add_arguments(self, parser):
        parser.add_argument('json_path', help="Import qilinadigan JSON fayl.")
        parser.add_argument('--audio-dir', default=None,
                            help="Audio va rasm fayllari joylashgan papka (JSON'dagi nomlar shunga nisbatan).")
        parser.add_argument('--subject', default=None, help="Fan nomi (JSON'dagi qiymatni bekor qiladi).")
        parser.add_argument('--publish', action='store_true', help="Testni darhol nashr etadi.")
        parser.add_argument('--dry-run', action='store_true',
                            help="Faylni faqat tekshiradi — bazaga hech narsa yozmaydi.")

    def handle(self, *args, **options):
        path = Path(options['json_path'])
        if not path.exists():
            raise CommandError(f"Fayl topilmadi: {path}")

        data = json.loads(path.read_text(encoding='utf-8'))
        media_dir = Path(options['audio_dir']) if options['audio_dir'] else path.parent

        title = (data.get('title') or '').strip()
        if not title:
            raise CommandError("JSON'da 'title' bo'lishi shart.")

        subject_name = options['subject'] or data.get('subject') or 'Ingliz tili'
        subject = Subject.objects.filter(name__iexact=subject_name).first()
        if subject is None:
            raise CommandError(
                f"'{subject_name}' fani topilmadi. Avval: python manage.py seed_english_cefr")

        # `--dry-run` — fayl to'g'ri tuzilganini bazani o'zgartirmasdan tekshirish.
        # Yangi mockni tayyorlashda qulay: xatolar (yetishmayotgan javob, noto'g'ri
        # variant) darhol ko'rinadi, yarim yozilgan test esa qolib ketmaydi.
        dry_run = options['dry_run']
        self.missing_files = []
        try:
            with transaction.atomic():
                self.dry_run = dry_run
                test = self._upsert_test(data, title, subject, options['publish'])
                counts = self._build_sections(data, test, subject, media_dir)
                if dry_run:
                    raise _DryRun(counts)
        except _DryRun as done:
            self.stdout.write(self.style.SUCCESS(
                f"Fayl to'g'ri: {done.counts['sections']} part, {done.counts['questions']} savol. "
                f"Bazaga hech narsa yozilmadi (--dry-run)."
            ))
            # Tekshiruv rejimida yo'q audio/rasm ish to'xtatmaydi — ular odatda
            # keyinroq qo'shiladi. Lekin ro'yxati ko'rsatiladi.
            for missing in self.missing_files:
                self.stdout.write(self.style.WARNING(f"  Fayl hali yo'q: {missing}"))
            return

        self.stdout.write(self.style.SUCCESS(
            f"'{test.title}' tayyor — {counts['sections']} part, {counts['questions']} savol "
            f"(id={test.id}, {test.status_label})."
        ))

    # -- test to'plami ------------------------------------------------------

    def _upsert_test(self, data, title, subject, publish):
        from tests_app.models import TestSet

        test, created = TestSet.objects.get_or_create(
            title=title,
            defaults={'subject': subject, 'category': 'cefr'},
        )
        test.subject = subject
        test.category = 'cefr'
        test.description = data.get('description', test.description)
        test.duration_minutes = int(data.get('duration_minutes') or 60)
        test.is_premium = bool(data.get('is_premium', True))
        if publish or data.get('is_published'):
            test.is_published = True
        test.save()

        if not created:
            # Qayta import — eski partlar va ularning savollari tozalanadi. Urinishlar
            # (Attempt) tegilmaydi: ular o'z savollariga bog'langan holda qoladi, faqat
            # bu to'plamdan chiqariladi.
            old_question_ids = list(
                Question.objects.filter(section__test_set=test).values_list('id', flat=True))
            ExamSection.objects.filter(test_set=test).delete()
            QuestionGroup.objects.filter(test_set=test).delete()
            test.questions.remove(*old_question_ids)
            Question.objects.filter(id__in=old_question_ids, attemptanswer__isnull=True).delete()
        return test

    # -- partlar ------------------------------------------------------------

    def _build_sections(self, data, test, subject, media_dir):
        sections = data.get('sections') or []
        if not sections:
            raise CommandError("JSON'da hech qanday 'sections' yo'q.")

        question_ids, section_count = [], 0
        for index, raw in enumerate(sections):
            skill = (raw.get('skill') or 'reading').lower()
            if skill not in VALID_SKILLS:
                raise CommandError(f"Noma'lum skill: {skill!r} (reading/listening/writing)")

            section = ExamSection.objects.create(
                test_set=test,
                skill=skill,
                part_number=int(raw.get('part') or index + 1),
                title=(raw.get('title') or '').strip(),
                instruction=(raw.get('instruction') or '').strip(),
                passage=raw.get('passage') or '',
                audio_url=raw.get('audio_url') or '',
                audio_play_limit=int(raw.get('audio_play_limit', 2)),
                duration_minutes=raw.get('duration_minutes'),
                order=index,
            )
            self._attach_file(section, 'audio', raw.get('audio'), media_dir)
            self._attach_file(section, 'image', raw.get('image'), media_dir)
            if raw.get('audio') or raw.get('image'):
                section.save()

            group = self._build_bank(raw.get('bank'), test, index)
            topic = self._resolve_topic(raw.get('level'), subject)

            for order, item in enumerate(raw.get('questions') or []):
                question = self._build_question(item, section, group, subject, topic, order)
                question_ids.append(question.id)

            section_count += 1

        test.questions.add(*question_ids)
        test.question_order = question_ids
        test.save(update_fields=['question_order'])
        return {'sections': section_count, 'questions': len(question_ids)}

    def _attach_file(self, section, field, name, media_dir):
        if not name:
            return
        source = Path(name)
        if not source.is_absolute():
            source = media_dir / name
        if not source.exists():
            if getattr(self, 'dry_run', False):
                self.missing_files.append(str(source))
                return
            raise CommandError(f"Fayl topilmadi: {source}")
        with source.open('rb') as handle:
            getattr(section, field).save(source.name, File(handle), save=False)

    def _build_bank(self, bank, test, order):
        """Umumiy javob banki (A-F) — matching/headings/map turlari uchun."""
        if not bank:
            return None
        group = QuestionGroup.objects.create(
            test_set=test,
            instruction=(bank.get('instruction') or '').strip(),
            order=order,
        )
        options = bank.get('options') or {}
        pairs = options.items() if isinstance(options, dict) else enumerate(options)
        for position, (label, text) in enumerate(pairs):
            GroupOption.objects.create(
                group=group, label=str(label).strip(), text=str(text).strip(), order=position)
        return group

    def _resolve_topic(self, level, subject):
        if not level:
            return None
        return Topic.objects.filter(subject=subject, title__iexact=str(level).strip()).first()

    # -- savollar -----------------------------------------------------------

    def _build_question(self, item, section, group, subject, topic, order):
        qtype = (item.get('type') or 'single_choice').strip()
        # Shablonda javob o'rniga "TODO" turadi. Uni jimgina qabul qilib bo'lmaydi:
        # bunday test yechilganda hamma javob xato bo'lib chiqardi.
        self._reject_placeholders(item)
        number = item.get('number')
        body = (item.get('body') or '').strip()
        if not body and qtype in ('gap_fill', 'tfng'):
            # Bo'shliq matn ichida turadi, alohida savol matni shart emas — raqamning
            # o'zi savol. TFNG uchun esa tasdiq gap `body`da bo'lishi kerak.
            body = f"{number}."

        question = Question.objects.create(
            subject=subject,
            topic=topic,
            section=section,
            exam_number=number,
            body=body,
            question_type=qtype,
            category='cefr',
            difficulty=item.get('difficulty', 'medium'),
            points=int(item.get('points') or 1),
            explanation=(item.get('explanation') or '').strip(),
            max_words=item.get('max_words'),
            min_words=item.get('min_words'),
            tfng_style=item.get('tfng_style', 'tf'),
        )

        if qtype in Question.SINGLE_ANSWER_TYPES:
            self._build_choices(question, item)
        elif qtype == 'grouped_item':
            self._link_group(question, item, group)
        elif qtype in Question.TEXT_INPUT_TYPES:
            self._build_accepted(question, item)
        elif qtype == 'writing_task':
            pass  # javob AI tomonidan baholanadi, kalit kerak emas
        elif qtype == 'open_written':
            question.reference_answer = (item.get('reference_answer') or '').strip()
            question.save(update_fields=['reference_answer'])
        else:
            raise CommandError(f"Bu importer {qtype!r} turini qo'llab-quvvatlamaydi.")

        return question

    def _reject_placeholders(self, item):
        values = [item.get('answer')] + list(item.get('answers') or [])
        if any(str(v).strip().upper() == 'TODO' for v in values if v is not None):
            raise CommandError(
                f"{item.get('number')}-savolda javob hali yozilmagan ('TODO'). "
                f"Shablondagi barcha TODO'larni to'ldiring."
            )

    def _build_choices(self, question, item):
        choices = item.get('choices') or {}
        answer = str(item.get('answer') or '').strip().upper()
        pairs = choices.items() if isinstance(choices, dict) else [
            (chr(65 + i), text) for i, text in enumerate(choices)]

        matched = False
        for label, text in pairs:
            label = str(label).strip().upper()
            is_correct = label == answer
            matched = matched or is_correct
            AnswerOption.objects.create(
                question=question, text=f"{label}) {text}".strip(), is_correct=is_correct)
        if not matched:
            raise CommandError(
                f"{question.exam_number}-savol: {answer!r} javobi variantlar orasida yo'q.")

    def _link_group(self, question, item, group):
        if group is None:
            raise CommandError(
                f"{question.exam_number}-savol grouped_item, lekin partda 'bank' berilmagan.")
        answer = str(item.get('answer') or '').strip().upper()
        option = group.options.filter(label__iexact=answer).first()
        if option is None:
            raise CommandError(f"{question.exam_number}-savol: bankda {answer!r} varianti yo'q.")
        question.group = group
        question.correct_group_option = option
        question.save(update_fields=['group', 'correct_group_option'])

    def _build_accepted(self, question, item):
        answers = item.get('answers')
        if answers is None and item.get('answer') is not None:
            answers = [item['answer']]
        answers = [str(a).strip() for a in (answers or []) if str(a).strip()]
        if not answers:
            raise CommandError(f"{question.exam_number}-savol uchun to'g'ri javob berilmagan.")
        for position, text in enumerate(answers):
            AcceptedAnswer.objects.create(question=question, text=text, order=position)
