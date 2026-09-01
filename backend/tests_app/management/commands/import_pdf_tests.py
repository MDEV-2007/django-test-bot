"""Import a whole exam PDF into one draft TestSet.

    python manage.py import_pdf_tests tests.pdf --title "Tarix - 1-variant"

Run with --dry-run first: it parses and prints exactly what would be created, touching
neither the database nor an AI provider, which is the fastest way to see whether a new
paper's layout is handled before spending anything on it.
"""
import sys
from pathlib import Path

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand, CommandError

from tests_app.importers import answer_key, builder, parser, pdf_source
from tests_app.models import Question


def _allow_unicode_output():
    """Keep the preview printable on a Windows console.

    The default console code page cannot encode the Uzbek turned comma (o'zbek "o'"),
    and the whole import would otherwise die on a UnicodeEncodeError while merely
    printing a question - losing the run over its own progress report.
    """
    for stream in (sys.stdout, sys.stderr):
        reconfigure = getattr(stream, 'reconfigure', None)
        if reconfigure is None:
            continue
        try:
            reconfigure(encoding='utf-8', errors='backslashreplace')
        except (ValueError, OSError):
            pass


class Command(BaseCommand):
    help = (
        "PDF imtihon varaqasidan savollarni o'qib, bitta qoralama (draft) TestSet "
        "yaratadi. Jadvallar HTML jadval bo'lib, xarita/diagrammalar esa PDF dan "
        "kesib olingan rasm bo'lib saqlanadi. To'g'ri javoblarni AI taxmin qiladi - "
        "test nashr etilmagan holda qoladi, o'qituvchi tekshirib nashr etadi."
    )

    def add_arguments(self, parser_):
        parser_.add_argument('pdf', help="Import qilinadigan PDF fayl yo'li.")
        parser_.add_argument('--title', help="Test nomi (bo'sh bo'lsa - fayl nomi).")
        parser_.add_argument('--subject', default='Tarix', help="Fan nomi (default: Tarix).")
        parser_.add_argument(
            '--category', default='history',
            choices=[value for value, _ in Question.CATEGORY_CHOICES],
            help="Test toifasi (default: history).")
        parser_.add_argument('--duration', type=int, default=60,
                             help="Test davomiyligi, daqiqada (default: 60).")
        parser_.add_argument('--created-by', help="O'qituvchi/admin username.")
        parser_.add_argument('--no-ai', action='store_true',
                             help="AI dan javob so'ramaslik - hamma savol javobsiz keladi.")
        parser_.add_argument('--dry-run', action='store_true',
                             help="Hech narsa saqlanmaydi, faqat tahlil natijasi ko'rsatiladi.")

    def handle(self, *args, **options):
        _allow_unicode_output()
        path = Path(options['pdf'])
        if not path.exists():
            raise CommandError(f"Fayl topilmadi: {path}")

        self.stdout.write(f"PDF o'qilmoqda: {path}")
        try:
            document = pdf_source.load(str(path))
        except ValueError as exc:
            raise CommandError(str(exc)) from exc

        questions, banks = parser.parse(document)
        if not questions:
            raise CommandError(
                "Savollar topilmadi. PDF da savollar '1.', '2.' ko'rinishida "
                "raqamlangan bo'lishi kerak."
            )
        self._report_parse(document, questions, banks)

        if options['no_ai']:
            answer_key.reset(questions, note="AI o'chirilgan (--no-ai)")
        else:
            self.stdout.write("AI dan javoblar so'ralmoqda (har savol alohida)...")
            answered = answer_key.fill(questions, progress=self._progress)
            self.stdout.write(f"\n  AI {answered} ta savolga javob berdi.")

        if options['dry_run']:
            self._report_dry_run(questions)
            return

        report = builder.build(
            questions, banks,
            title=options['title'] or path.stem,
            subject_name=options['subject'],
            category=options['category'],
            duration_minutes=options['duration'],
            created_by=self._user(options.get('created_by')),
        )
        self._report_build(report)

    def _progress(self, index, total):
        # One line, rewritten in place: a local model takes a few seconds per question,
        # so a 45-question paper is several minutes of otherwise silent work.
        self.stdout.write(f"\r  {index}/{total}", ending='')
        self.stdout.flush()

    def _user(self, username):
        if not username:
            return None
        try:
            return User.objects.get(username=username)
        except User.DoesNotExist as exc:
            raise CommandError(f"Foydalanuvchi topilmadi: {username}") from exc

    def _report_parse(self, document, questions, banks):
        kinds = {}
        for question in questions:
            kinds[question.kind] = kinds.get(question.kind, 0) + 1
        summary = ', '.join(f"{kind}: {count}" for kind, count in sorted(kinds.items()))
        self.stdout.write(
            f"  {document.page_count} sahifa, {len(questions)} savol ({summary})")
        self.stdout.write(
            f"  {len(document.tables)} jadval, {len(document.figures)} rasm, "
            f"{len(banks)} umumiy javob banki")

        flagged = [(q.number, q.warnings) for q in questions if q.warnings]
        for number, warnings in flagged:
            self.stdout.write(self.style.WARNING(f"  {number}-savol: {'; '.join(warnings)}"))

    def _report_dry_run(self, questions):
        self.stdout.write(self.style.WARNING("\n--dry-run: hech narsa saqlanmadi.\n"))
        for question in questions:
            label = question.correct_label or '?'
            confidence = f"{question.confidence:.0%}" if question.confidence else '-'
            self.stdout.write(
                f"{question.number:>3}. [{question.kind}] javob={label} ishonch={confidence} "
                f"| {question.text[:60]}")

    def _report_build(self, report):
        test_set = report.test_set
        self.stdout.write(self.style.SUCCESS(
            f"\nQoralama test yaratildi: '{test_set.title}' (id={test_set.id}), "
            f"{report.created} savol."))
        self.stdout.write(
            f"  {report.figures} rasmli, {report.tables} jadvalli savol.")
        self.stdout.write(
            f"  {report.with_answer} savolga javob belgilandi, "
            f"{len(report.needs_answer)} tasi qo'lda tekshirishni talab qiladi.")

        for number, reason in report.needs_answer:
            self.stdout.write(self.style.WARNING(f"  {number}-savol: {reason}"))
        for number, reason in report.warnings:
            self.stdout.write(self.style.WARNING(f"  {number}-savol: {reason}"))

        self.stdout.write(
            "\nTest NASHR ETILMAGAN. Javoblarni tekshirib, panelda nashr eting.")
