"""JSON'dan variantli test import qilish (`import_mcq_test`).

Eng muhim guruh — `RejectsBadDataTests`: buyruq YARIM import qilmasligi kerak. Bir
marta PDF importida noto'g'ri javoblar bazaga tushib, imtihonga tayyorlanayotgan
o'quvchiga noto'g'ri material ko'rsatilgan edi; shundan keyin qoida shu bo'ldi —
faylda bitta muammo bo'lsa ham, hech narsa saqlanmaydi.
"""
import json
from pathlib import Path
from tempfile import TemporaryDirectory

from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase

from learning.models import Topic
from tests_app.models import Question, Subject, TestSet


def _write(tmpdir, payload):
    path = Path(tmpdir) / 'savollar.json'
    path.write_text(json.dumps(payload, ensure_ascii=False), encoding='utf-8')
    return str(path)


def _question(savol="She ___ to school.", variantlar=None, javob="goes", **extra):
    item = {
        'savol': savol,
        'variantlar': variantlar if variantlar is not None else ['go', 'goes', 'going', 'gone'],
        'javob': javob,
    }
    item.update(extra)
    return item


class ImportMcqTests(TestCase):
    def _import(self, items, meta=None, **options):
        with TemporaryDirectory() as tmpdir:
            path = _write(tmpdir, {'test': meta or {'fan': 'Ingliz tili'}, 'savollar': items})
            call_command('import_mcq_test', path, title=options.pop('title', 'CEFR B1 — Test'),
                         verbosity=0, **options)

    def test_creates_a_published_test_with_options(self):
        self._import([_question()], subject='Ingliz tili', category='cefr')

        test_set = TestSet.objects.get(title='CEFR B1 — Test')
        self.assertEqual(test_set.subject.name, 'Ingliz tili')
        self.assertEqual(test_set.category, 'cefr')
        self.assertTrue(test_set.is_published)

        question = test_set.questions.get()
        self.assertEqual(question.question_type, 'single_choice')
        self.assertEqual(question.choices.count(), 4)
        self.assertEqual(question.choices.get(is_correct=True).text, 'goes')

    # ── Javobni aniqlashning uchta yo'li ──────────────────────────────────────────

    def test_answer_given_as_option_text(self):
        self._import([_question(javob='going')])
        self.assertEqual(self._correct_text(), 'going')

    def test_answer_given_as_letter(self):
        self._import([_question(javob='C')])
        self.assertEqual(self._correct_text(), 'going')

    def test_answer_given_as_number(self):
        self._import([_question(javob=4)])
        self.assertEqual(self._correct_text(), 'gone')

    def test_option_text_wins_over_letter_reading(self):
        """Variantlarning O'ZI harf bo'lsa, matn bo'yicha moslik ustun turishi kerak —
        aks holda javob butunlay boshqa variantga tushib qolardi."""
        self._import([_question(variantlar=['B', 'A', 'C'], javob='A')])
        # Matn bo'yicha 'A' — ikkinchi variant. Harf sifatida o'qilsa birinchisi bo'lardi.
        self.assertEqual(self._correct_text(), 'A')
        correct = Question.objects.get().choices.filter(is_correct=True).first()
        self.assertEqual(list(Question.objects.get().choices.all()).index(correct), 1)

    # ── CEFR darajasi ─────────────────────────────────────────────────────────────

    def test_level_links_the_question_to_the_matching_cefr_topic(self):
        call_command('seed_english_cefr', verbosity=0)

        self._import([_question(daraja='B1')], subject='Ingliz tili', category='cefr')

        self.assertEqual(Question.objects.get().topic.slug, 'cefr-b1')

    def test_unknown_level_falls_back_to_the_general_topic(self):
        self._import([_question(daraja='Z9')], topic='Grammar')

        self.assertEqual(Question.objects.get().topic.title, 'Grammar')

    # ── Qayta import ──────────────────────────────────────────────────────────────

    def test_reimport_replaces_instead_of_duplicating(self):
        self._import([_question()])
        self._import([_question(savol='Yangilangan savol')])

        self.assertEqual(TestSet.objects.filter(title='CEFR B1 — Test').count(), 1)
        self.assertEqual(Question.objects.count(), 1)
        self.assertIn('Yangilangan savol', Question.objects.get().body)

    def test_chunk_size_splits_into_several_tests(self):
        self._import([_question(savol=f"Savol {i}") for i in range(5)], chunk_size=2)

        titles = set(TestSet.objects.values_list('title', flat=True))
        self.assertEqual(len(titles), 3)
        self.assertIn('CEFR B1 — Test — 1-qism', titles)

    def test_draft_flag_keeps_the_test_out_of_the_catalogue(self):
        self._import([_question()], draft=True)

        self.assertFalse(TestSet.objects.get().is_published)

    def _correct_text(self):
        return Question.objects.get().choices.get(is_correct=True).text


class RejectsBadDataTests(TestCase):
    """Bitta muammoli savol butun importni to'xtatishi kerak."""

    def _expect_failure(self, items):
        with TemporaryDirectory() as tmpdir:
            path = _write(tmpdir, {'test': {}, 'savollar': items})
            with self.assertRaises(CommandError):
                call_command('import_mcq_test', path, title='Buzuq', verbosity=0)

        self.assertFalse(TestSet.objects.exists())
        self.assertFalse(Question.objects.exists())

    def test_answer_that_matches_no_option_is_rejected(self):
        self._expect_failure([_question(variantlar=['cat', 'dog'], javob='bird')])

    def test_question_with_a_single_option_is_rejected(self):
        self._expect_failure([_question(variantlar=['only'], javob='only')])

    def test_empty_question_body_is_rejected(self):
        self._expect_failure([_question(savol='   ')])

    def test_duplicate_options_are_rejected(self):
        self._expect_failure([_question(variantlar=['same', 'same', 'other'], javob='other')])

    def test_one_bad_question_blocks_the_whole_file(self):
        """Yaxshi savollar ham saqlanmasligi kerak — yarim test yaramaydi."""
        self._expect_failure([_question(), _question(savol='Yomon', javob='yo\'q-variant')])


class SeedEnglishCefrTests(TestCase):
    def test_creates_subject_and_six_levels(self):
        call_command('seed_english_cefr', verbosity=0)

        subject = Subject.objects.get(slug='ingliz-tili')
        levels = Topic.objects.filter(subject=subject, category='cefr')

        self.assertEqual(levels.count(), 6)
        self.assertEqual(
            list(levels.order_by('order').values_list('slug', flat=True)),
            ['cefr-a1', 'cefr-a2', 'cefr-b1', 'cefr-b2', 'cefr-c1', 'cefr-c2'],
        )

    def test_running_twice_does_not_duplicate(self):
        call_command('seed_english_cefr', verbosity=0)
        call_command('seed_english_cefr', verbosity=0)

        self.assertEqual(Subject.objects.filter(slug='ingliz-tili').count(), 1)
        self.assertEqual(Topic.objects.filter(category='cefr').count(), 6)
