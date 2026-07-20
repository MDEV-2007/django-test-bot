"""Seed scripts must actually run against the current schema.

These scripts rot silently: they were written against an older model layout and kept
importing `Choice`/`Test` (renamed to `AnswerOption`/`TestSet`) and passing
`Question(text=...)` (renamed to `body`) long after those changed. Nothing caught it
until someone ran them on the server.

Static import checks are not enough — the field errors only surface at runtime — so each
content seeder is executed here against the test database.
"""
import importlib.util
import io
import pathlib
import sys
from contextlib import redirect_stdout

from django.test import TestCase

from tests_app.models import AnswerOption, Question, TestSet

SCRIPTS_DIR = pathlib.Path(__file__).resolve().parent.parent / 'scripts'

# seed.py is excluded on purpose: it is a one-off importer that copies rows out of an
# external `test.db` SQLite file, not a content seeder, so it cannot run in CI.
CONTENT_SEEDERS = [
    'seed_milliy_sertifikat_25.py',
    'seed_shanba_test.py',
    'seed_expand_content.py',
]


def load(script_name):
    path = SCRIPTS_DIR / script_name
    spec = importlib.util.spec_from_file_location(f'_seed_{path.stem}', path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


class SeedScriptTests(TestCase):
    def test_content_seeders_run_and_create_questions(self):
        for name in CONTENT_SEEDERS:
            with self.subTest(script=name):
                before = Question.objects.count()
                module = load(name)
                with redirect_stdout(io.StringIO()):   # keep test output readable
                    module.main()
                self.assertGreater(
                    Question.objects.count(), before,
                    f"{name} ran without creating any questions",
                )

    def test_seeded_questions_use_valid_types(self):
        module = load('seed_milliy_sertifikat_25.py')
        with redirect_stdout(io.StringIO()):
            module.main()

        valid = {c[0] for c in Question.QUESTION_TYPE_CHOICES}
        used = set(Question.objects.values_list('question_type', flat=True))
        self.assertTrue(
            used <= valid,
            f"seeded invalid question_type(s): {used - valid}. Valid: {sorted(valid)}",
        )

    def test_seeded_questions_have_body_and_options(self):
        module = load('seed_milliy_sertifikat_25.py')
        with redirect_stdout(io.StringIO()):
            module.main()

        self.assertFalse(
            Question.objects.filter(body='').exists(),
            "a seeded question has an empty body — the text probably went to the wrong field",
        )
        # Choice-based questions must actually offer options, and exactly one correct one.
        for question in Question.objects.filter(question_type__in=Question.SINGLE_ANSWER_TYPES):
            options = AnswerOption.objects.filter(question=question)
            self.assertTrue(options.exists(), f"Q{question.id} has no answer options")
            self.assertEqual(options.filter(is_correct=True).count(), 1,
                             f"Q{question.id} must have exactly one correct option")

    def test_seeder_builds_a_test_set(self):
        module = load('seed_milliy_sertifikat_25.py')
        with redirect_stdout(io.StringIO()):
            module.main()
        self.assertTrue(TestSet.objects.exists(), "no TestSet was created")
