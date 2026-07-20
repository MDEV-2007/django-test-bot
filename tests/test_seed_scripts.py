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
from unittest.mock import patch

from django.test import TestCase

from tests_app.models import AnswerOption, Question, TestSet

from .factories import make_user

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

    def test_seeded_tests_are_publishable_and_have_a_subject(self):
        """The catalogue filters on is_published=True and (when one is selected) subject.
        A seeded test that misses either exists in the admin but is invisible to students —
        exactly the symptom that showed up in production."""
        for name in ('seed_milliy_sertifikat_25.py', 'seed_shanba_test.py'):
            with self.subTest(script=name):
                module = load(name)
                with redirect_stdout(io.StringIO()):
                    module.main()

        for test_set in TestSet.objects.filter(is_random=False):
            self.assertTrue(test_set.is_published,
                            f"'{test_set.title}' is a draft — students will never see it")
            self.assertIsNotNone(test_set.subject,
                                 f"'{test_set.title}' has no subject — the subject filter hides it")

    def test_seeded_test_has_its_questions_attached(self):
        """The TestSet is created before its questions and only linked at the very end.
        A crash in between left an orphan test showing '0 ta savol' — listed in the
        catalogue but impossible to start. main() is atomic now; this proves the link."""
        for name in ('seed_milliy_sertifikat_25.py', 'seed_shanba_test.py'):
            with self.subTest(script=name):
                module = load(name)
                with redirect_stdout(io.StringIO()):
                    module.main()

        for test_set in TestSet.objects.filter(is_random=False):
            self.assertGreater(test_set.questions.count(), 0,
                               f"'{test_set.title}' has no questions — it cannot be started")

    def test_a_failing_seeder_leaves_no_orphan_test(self):
        """Atomicity: if question creation blows up, the TestSet must roll back too."""
        module = load('seed_milliy_sertifikat_25.py')
        before = TestSet.objects.count()

        with patch.object(module.Question.objects, 'create',
                          side_effect=RuntimeError('simulated failure')):
            with self.assertRaises(RuntimeError):
                with redirect_stdout(io.StringIO()):
                    module.main()

        self.assertEqual(TestSet.objects.count(), before,
                         "a half-finished seeder must not leave a TestSet behind")

    def test_seeded_test_actually_appears_in_the_catalogue(self):
        """End-to-end: seed, then load the student test centre and assert it is listed."""
        module = load('seed_milliy_sertifikat_25.py')
        with redirect_stdout(io.StringIO()):
            module.main()

        user, _ = make_user(username='catalogue_viewer')
        self.client.force_login(user)
        listed = self.client.get('/tests/').context['tests']

        self.assertTrue(listed, "the test centre is empty after seeding")
        seeded = TestSet.objects.filter(is_random=False).first()
        self.assertIn(seeded, listed, f"'{seeded.title}' was seeded but is not in the catalogue")
