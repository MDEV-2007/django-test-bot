"""The PDF importer's parser and builder.

The parser is tested against hand-built line streams rather than a fixture PDF, because
what actually goes wrong is never "PyMuPDF failed to read the file" - it is the shape of
a real exam paper: two columns, boxed inserts emitted out of order, a question continuing
across a page break, options printed several to a line. Each of those is one short stream
here, which pins the behaviour far more precisely than a whole paper would.
"""
from django.test import TestCase

from tests_app.importers import builder, parser
from tests_app.importers.pdf_source import Line, PdfDocument, Table, _in_reading_order
from tests_app.models import AnswerOption, Question, SubQuestion


LINE_HEIGHT = 14


def line(text, page=1, y0=0.0, inside_figure=False):
    return Line(text, page, y0, y0 + 12, inside_figure)


def flow(*texts, page=1, start=40.0):
    """Consecutive lines down one page, as a real paper prints them.

    Positions matter: an option's wrapped tail is recognised by sitting directly under
    the option, so a stream where every line claims the same y is not a stream the parser
    can read.
    """
    return [line(text, page=page, y0=start + index * LINE_HEIGHT)
            for index, text in enumerate(texts)]


def document(lines, tables=(), figures=(), page_count=1):
    return PdfDocument(list(lines), list(tables), list(figures), page_count)


class OptionParsingTests(TestCase):
    def test_several_options_on_one_line(self):
        """Papers print options two or four to a line to save space."""
        questions, _ = parser.parse(document(flow(
            "1. Qaysi jang qadimgi dunyoda bo'lgan?",
            "A)   Gastings jangi                 B)   Puni urushlari",
            "C)  Trafalgar jangi                 D)   Sitsilliya oqshomi",
        )))

        self.assertEqual(len(questions), 1)
        self.assertEqual(
            questions[0].options,
            [('A', 'Gastings jangi'), ('B', 'Puni urushlari'),
             ('C', 'Trafalgar jangi'), ('D', 'Sitsilliya oqshomi')],
        )

    def test_wrapped_option_continues_the_previous_one(self):
        questions, _ = parser.parse(document(flow(
            "1. Savol matni?",
            "A) Juda uzun variant matni bu yerda",
            "davom etadi va tugaydi",
            "B) Ikkinchi variant",
        )))

        self.assertEqual(
            questions[0].options,
            [('A', 'Juda uzun variant matni bu yerda davom etadi va tugaydi'),
             ('B', 'Ikkinchi variant')],
        )


class ReadingOrderTests(TestCase):
    def test_boxed_insert_emitted_after_later_questions(self):
        """A boxed insert is drawn last on its page, so items 33-35 arrive after item 36.

        The parser must still place them at 33-35, and must not let the box's arrival
        steal the lines that belong to the question it interrupted.
        """
        lines = [
            line("36. Ochiq savol matni.", page=1, y0=400),
            line("a) Birinchi band?", page=1, y0=420),
            # The boxed insert, emitted at the end of page 1 despite sitting above item 36.
            line("33–35-test topshiriqlariga mos javoblarni tanlang.", page=1, y0=200),
            line("33. Birinchi guruh savoli?", page=1, y0=220),
            line("34. Ikkinchi guruh savoli?", page=1, y0=240),
            line("35. Uchinchi guruh savoli?", page=1, y0=260),
            line("A) Birinchi variant", page=1, y0=210),
            line("B) Ikkinchi variant", page=1, y0=225),
            line("C) Uchinchi variant", page=1, y0=240),
            line("D) To'rtinchi variant", page=1, y0=255),
            line("E) Beshinchi variant", page=1, y0=270),
            line("F) Oltinchi variant", page=1, y0=285),
            # Page 2 continues item 36, not the displaced item 35.
            line("Javob: a) ______", page=2, y0=50),
            line("b) Ikkinchi band?", page=2, y0=70),
            line("Javob: b) ______", page=2, y0=90),
        ]
        questions, banks = parser.parse(document(lines, page_count=2))

        self.assertEqual([q.number for q in questions], [33, 34, 35, 36])
        self.assertEqual(len(banks), 1)
        self.assertEqual(banks[0].first_number, 33)
        self.assertEqual(banks[0].last_number, 35)

        grouped = questions[0]
        self.assertEqual(grouped.kind, 'grouped_item')
        self.assertEqual(len(grouped.options), 6)

        written = questions[-1]
        self.assertEqual(written.kind, 'open_written')
        self.assertEqual([label for label, _ in written.sub_questions], ['a', 'b'])

    def test_a_number_is_never_reused(self):
        """A stray "1." further down the paper must not open a second question 1."""
        questions, _ = parser.parse(document(flow(
            "1. Birinchi savol?",
            "A) Bir",
            "B) Ikki",
            "2. Ikkinchi savol, unda 1. band bor",
            "A) Uch",
            "B) To'rt",
        )))

        self.assertEqual([q.number for q in questions], [1, 2])

    def test_a_far_number_is_not_a_question(self):
        """Numbers well past the running maximum are data, not question numbers."""
        questions, _ = parser.parse(document(flow(
            "1. Nechanchi asr?",
            "115. modda shu haqda.",
            "A) Bir",
            "B) Ikki",
        )))

        self.assertEqual([q.number for q in questions], [1])
        self.assertIn("115. modda shu haqda.", questions[0].text)


class ClassificationTests(TestCase):
    def test_table_is_attached_and_not_repeated_in_the_body(self):
        table = Table(1, 0, 500, 20, 60, '<table><tr><td>1</td></tr></table>', '1 | Voqea')
        questions, _ = parser.parse(document(
            [
                line("1. Jadvalga qarab javob bering.", y0=10),
                line("1 Voqea Natija", y0=30, inside_figure=True),
                line("A) Bir", y0=80),
                line("B) Ikki", y0=95),
            ],
            tables=[table],
        ))

        question = questions[0]
        self.assertEqual(question.kind, 'table_based')
        self.assertEqual(question.table_html, table.html)
        self.assertNotIn("Voqea Natija", question.text)

    def test_written_question_without_lettered_parts(self):
        questions, _ = parser.parse(document(flow(
            "1. Bu voqea qanday nom bilan kirgan?",
            "Javob: ______",
        )))

        question = questions[0]
        self.assertEqual(question.kind, 'open_written')
        self.assertEqual(question.sub_questions, [])
        self.assertTrue(question.warnings)


class BuilderTests(TestCase):
    def _parse(self, lines, **kwargs):
        questions, banks = parser.parse(document(lines, **kwargs))
        return questions, banks

    def test_import_creates_an_unpublished_set_with_the_answer_marked(self):
        questions, banks = self._parse(flow(
            "1. Qaysi jang qadimgi dunyoda bo'lgan?",
            "A) Gastings jangi   B) Puni urushlari",
        ))
        questions[0].correct_label = 'B'
        questions[0].confidence = 0.9
        questions[0].reference_answers = {}
        questions[0].answer_note = ''

        report = builder.build(
            questions, banks, title="Sinov", subject_name="Tarix",
            category='history', duration_minutes=30,
        )

        self.assertFalse(report.test_set.is_published)
        self.assertEqual(report.created, 1)
        self.assertEqual(report.with_answer, 1)
        correct = AnswerOption.objects.get(is_correct=True)
        self.assertEqual(correct.text, "B) Puni urushlari")

    def test_a_low_confidence_guess_is_reported_instead_of_applied(self):
        """A pre-selected wrong answer invites a click-through; an unmarked one asks."""
        questions, banks = self._parse(flow(
            "1. Savol?",
            "A) Bir   B) Ikki",
        ))
        questions[0].correct_label = 'A'
        questions[0].confidence = 0.2
        questions[0].reference_answers = {}
        questions[0].answer_note = ''

        report = builder.build(
            questions, banks, title="Sinov", subject_name="Tarix",
            category='history', duration_minutes=30,
        )

        self.assertEqual(report.with_answer, 0)
        self.assertEqual(len(report.needs_answer), 1)
        self.assertFalse(AnswerOption.objects.filter(is_correct=True).exists())

    def test_written_sub_questions_get_their_reference_answers(self):
        questions, banks = self._parse(flow(
            "1. Kontekst matni.",
            "a) Birinchi band?",
            "Javob: a) ______",
            "b) Ikkinchi band?",
            "Javob: b) ______",
        ))
        questions[0].correct_label = None
        questions[0].confidence = 0.8
        questions[0].reference_answers = {'a': 'Birinchi javob', 'b': 'Ikkinchi javob'}
        questions[0].answer_note = ''

        report = builder.build(
            questions, banks, title="Sinov", subject_name="Tarix",
            category='history', duration_minutes=30,
        )

        self.assertEqual(report.with_answer, 1)
        question = Question.objects.get()
        self.assertEqual(question.question_type, 'open_written')
        self.assertEqual(
            list(SubQuestion.objects.filter(question=question)
                 .values_list('label', 'reference_answer')),
            [('a', 'Birinchi javob'), ('b', 'Ikkinchi javob')],
        )


class BodyFormattingTests(TestCase):
    """How a question's body is broken up, which is what makes an imported test readable.

    The first imports rendered every question as one unbroken paragraph, sub-items and
    all, and a matching question's two columns arrived as a run-on of terms followed by a
    run-on of definitions - correct data, unusable presentation.
    """

    def test_sub_items_each_get_their_own_line(self):
        questions, _ = parser.parse(document(flow(
            "4. Voqealarni xronologik tartibda joylashtiring.",
            "1) Birinchi voqea; 2) Ikkinchi voqea; 3) Uchinchi voqea;",
            "A) 1, 2, 3   B) 3, 2, 1",
        )))

        self.assertEqual(
            questions[0].blocks,
            [('text', "Voqealarni xronologik tartibda joylashtiring."),
             ('items', ["1) Birinchi voqea;", "2) Ikkinchi voqea;", "3) Uchinchi voqea;"])],
        )

    def test_a_wrapped_sub_item_stays_with_its_own_item(self):
        questions, _ = parser.parse(document(flow(
            "4. Savol.",
            "1) Juda uzun birinchi band bo'lib, u",
            "keyingi qatorda davom etadi;",
            "2) Ikkinchi band;",
        )))

        self.assertEqual(
            questions[0].blocks[-1],
            ('items', ["1) Juda uzun birinchi band bo'lib, u keyingi qatorda davom etadi;",
                       "2) Ikkinchi band;"]),
        )

    def test_a_marker_inside_a_sentence_is_not_a_list(self):
        """"...45% aksiyasini sotib oldi" must not be cut at the "1)" in mid-sentence."""
        questions, _ = parser.parse(document(flow(
            "4. Quyidagi hukm 1) raqami bilan berilgan.",
            "A) Ha   B) Yo'q",
        )))

        self.assertEqual(questions[0].blocks,
                         [('text', "Quyidagi hukm 1) raqami bilan berilgan.")])

    def test_a_distant_block_is_not_glued_onto_the_last_option(self):
        """A displaced block is emitted after a question's options but belongs elsewhere.

        Joining it on as a wrapped continuation produced options carrying a whole other
        question's text - the single worst-looking defect in the first import.
        """
        questions, _ = parser.parse(document([
            line("10. Tarixiy davlatni aniqlang.", y0=560),
            line("A) Usmonli imperiyasi; B) Kayzer Germaniyasi", y0=731),
            line("C) Avstriya-Vengriya; D) Bolgariya;", y0=745),
            # Drawn last on the page, but printed at the top of the other column.
            line("Komprador I Induvidualizm II Konsessiya III", y0=106),
        ]))

        self.assertEqual([text for _, text in questions[0].options],
                         ['Usmonli imperiyasi', 'Kayzer Germaniyasi',
                          'Avstriya-Vengriya', 'Bolgariya'])


class TableOrderTests(TestCase):
    def test_side_by_side_tables_are_read_left_to_right(self):
        """A matching question is two tables side by side: terms left, definitions right.

        The definitions column often starts a few points higher than the terms column, so
        ordering by vertical position alone put the answers before the question.
        """
        terms = Table(1, 51, 152, 561, 747, '<table>terms</table>', 'I | Repatriatsiya')
        definitions = Table(1, 186, 555, 524, 786, '<table>defs</table>', 'a | Devalvatsiya')

        questions, _ = parser.parse(document(
            flow("5. Atamalarni izohlari bilan moslashtiring.",
                 "A) I-a  B) I-b", start=560),
            tables=_in_reading_order([definitions, terms]),
        ))

        self.assertEqual(questions[0].table_html, '<table>terms</table><table>defs</table>')
