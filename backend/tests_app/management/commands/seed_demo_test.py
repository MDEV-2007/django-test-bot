from django.core.management.base import BaseCommand
from django.db import transaction

from tests_app.models import (
    Subject, TestSet, Question, AnswerOption, MatchingPair,
    QuestionGroup, GroupOption, SubQuestion,
)

DEMO_TITLE = "Demo — 6 ta savol turi namunasi"


class Command(BaseCommand):
    help = (
        "Creates (or resets) one archived demo TestSet containing exactly one question of "
        "each of the 6 supported types, as a concrete reference for admins building real "
        "tests. Hidden from the student catalog (is_archived=True) but fully visible/editable "
        "in Django admin."
    )

    @transaction.atomic
    def handle(self, *args, **options):
        TestSet.objects.filter(title=DEMO_TITLE).delete()

        subject, _ = Subject.objects.get_or_create(name="Tarix", defaults={"slug": "tarix"})
        test_set = TestSet.objects.create(
            subject=subject,
            title=DEMO_TITLE,
            description="Har bir savol turidan bittadan namuna — admin uchun ko'rsatma.",
            category="history",
            duration_minutes=15,
            is_archived=True,
        )

        questions = [
            self._single_choice(),
            self._image_based(),
            self._table_based(),
            self._matching(),
            self._grouped_item(test_set),
            self._open_written(),
        ]
        test_set.questions.add(*questions)

        self.stdout.write(self.style.SUCCESS(
            f"Demo test tayyor: '{DEMO_TITLE}' (id={test_set.id}), {len(questions)} ta savol."
        ))

    def _single_choice(self):
        q = Question.objects.create(
            body="<p>Amir Temur qachon tug'ilgan?</p>",
            question_type="single_choice",
            difficulty="easy",
            category="history",
            explanation="Amir Temur 1336-yil 9-aprelda Kesh (hozirgi Shahrisabz)da tug'ilgan.",
        )
        AnswerOption.objects.bulk_create([
            AnswerOption(question=q, text="1336-yil", is_correct=True),
            AnswerOption(question=q, text="1370-yil", is_correct=False),
            AnswerOption(question=q, text="1405-yil", is_correct=False),
            AnswerOption(question=q, text="1299-yil", is_correct=False),
        ])
        return q

    def _image_based(self):
        q = Question.objects.create(
            body="<p>Quyidagi xaritada belgilangan davlat qaysi?</p>",
            question_type="image_based",
            image_position="before_body",
            difficulty="medium",
            category="history",
            explanation="Rasmga admin panelida 'image' maydonidan xarita/diagramma yuklanadi.",
        )
        AnswerOption.objects.bulk_create([
            AnswerOption(question=q, text="Temuriylar davlati", is_correct=True),
            AnswerOption(question=q, text="Qorachonli davlati", is_correct=False),
            AnswerOption(question=q, text="Xorazmshohlar davlati", is_correct=False),
        ])
        return q

    def _table_based(self):
        body = (
            "<p>Jadvaldagi asr va voqeani solishtirib, noto'g'ri javobni toping:</p>"
            "<table><tbody>"
            "<tr><th>Asr</th><th>Voqea</th></tr>"
            "<tr><td>XIV asr</td><td>Amir Temur davlati</td></tr>"
            "<tr><td>XV asr</td><td>Mirzo Ulug'bek rasadxonasi</td></tr>"
            "</tbody></table>"
        )
        q = Question.objects.create(
            body=body,
            question_type="table_based",
            difficulty="medium",
            category="history",
        )
        AnswerOption.objects.bulk_create([
            AnswerOption(question=q, text="Ikkala qator ham to'g'ri", is_correct=True),
            AnswerOption(question=q, text="Faqat birinchi qator to'g'ri", is_correct=False),
            AnswerOption(question=q, text="Ikkala qator ham noto'g'ri", is_correct=False),
        ])
        return q

    def _matching(self):
        q = Question.objects.create(
            body="<p>Hukmdorlarni ular boshqargan davlat bilan moslashtiring.</p>",
            question_type="matching",
            difficulty="hard",
            category="history",
        )
        MatchingPair.objects.bulk_create([
            MatchingPair(question=q, left_key="I", left_text="Amir Temur", right_key="a", right_text="Temuriylar davlati", order=1),
            MatchingPair(question=q, left_key="II", left_text="Muhammad Shayboniy", right_key="b", right_text="Shayboniylar davlati", order=2),
            MatchingPair(question=q, left_key="", left_text="", right_key="c", right_text="Ashtarxoniylar davlati", order=3),
        ])
        return q

    def _grouped_item(self, test_set):
        group = QuestionGroup.objects.create(
            test_set=test_set,
            instruction="Quyidagi savollarga mos javobni A-C variantlaridan tanlang.",
            order=1,
        )
        options = GroupOption.objects.bulk_create([
            GroupOption(group=group, label="A", text="1370-yil", order=1),
            GroupOption(group=group, label="B", text="1500-yil", order=2),
            GroupOption(group=group, label="C", text="1876-yil", order=3),
        ])
        q = Question.objects.create(
            body="<p>Amir Temur davlat tepasiga qaysi yili keldi?</p>",
            question_type="grouped_item",
            difficulty="medium",
            category="history",
            group=group,
            correct_group_option=options[0],
        )
        return q

    def _open_written(self):
        q = Question.objects.create(
            body=(
                "<p>1572-yilgi Varfolomey kechasi voqeasi haqida quyidagi savollarga javob bering:</p>"
            ),
            question_type="open_written",
            difficulty="hard",
            category="history",
        )
        SubQuestion.objects.bulk_create([
            SubQuestion(
                question=q, label="a",
                text="Voqea qaysi mamlakatda sodir bo'lgan?",
                reference_answer="Fransiya",
                order=1,
            ),
            SubQuestion(
                question=q, label="b",
                text="Voqea davridagi qirolicha-ona kim bo'lgan?",
                reference_answer="Katerina Medichi",
                order=2,
            ),
        ])
        return q
