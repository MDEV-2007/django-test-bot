"""Turns ParsedQuestion objects into database rows inside one draft TestSet.

The set is always created unpublished. Every correct answer in it is an AI guess (see
`answer_key`), so it must pass a teacher's eye before a student ever sees it; creating it
as a draft makes that the default rather than something someone has to remember to do.
"""
from django.core.files.base import ContentFile
from django.db import transaction

from tests_app.models import (
    AnswerOption, GroupOption, Question, QuestionGroup, Subject, SubQuestion, TestSet,
)

# Below this, the AI's own confidence is not worth pre-selecting an answer for: an
# unmarked question tells the reviewer "decide this yourself", while a wrong pre-selected
# one invites a click-through.
MIN_CONFIDENCE_TO_APPLY = 0.55


class BuildReport:
    """What the import produced, for the command to print and for the reviewer to act on."""

    def __init__(self, test_set):
        self.test_set = test_set
        self.created = 0
        self.with_answer = 0
        self.needs_answer = []   # [(number, reason)]
        self.warnings = []       # [(number, reason)] - non-fatal, e.g. truncated text
        self.figures = 0
        self.tables = 0


@transaction.atomic
def build(questions, banks, *, title, subject_name, category, duration_minutes,
          created_by=None):
    """Create the draft TestSet and every question in it. Returns a BuildReport."""
    subject = _subject(subject_name)
    test_set = TestSet.objects.create(
        subject=subject,
        title=title,
        # Bo'sh: bu maydon o'quvchiga ko'rinadigan test tavsifi, admin uchun eslatma emas.
        # "AI taxmin qilgan, tekshiring" degan ogohlantirish avvalgi versiyada shu yerga
        # yozilib, is_published=False bo'lishiga qaramay tavsif sifatida chiqib qolgan
        # edi. Qoralama ekanligi is_published va panel review oqimi orqali allaqachon
        # ma'lum — buni takrorlashning hojati yo'q.
        description='',
        category=category,
        duration_minutes=duration_minutes,
        created_by=created_by,
        is_published=False,
    )

    report = BuildReport(test_set)
    groups = _build_groups(test_set, banks)
    created = []

    for parsed in questions:
        question = _build_question(parsed, subject, category, groups, report)
        if question is not None:
            created.append(question)
            report.created += 1

    test_set.questions.add(*created)
    test_set.question_order = [q.id for q in created]
    test_set.save(update_fields=['question_order'])
    return report


def _subject(name):
    subject, _ = Subject.objects.get_or_create(
        name=name, defaults={'slug': _slugify(name)},
    )
    return subject


def _slugify(name):
    from django.utils.text import slugify
    return slugify(name) or 'fan'


def _build_groups(test_set, banks):
    """One QuestionGroup per shared answer bank, keyed by the bank object so each
    grouped question can find the group it belongs to."""
    groups = {}
    for order, bank in enumerate(banks):
        if bank.first_number is None:
            # A bank whose instruction line was never matched covers no questions, so
            # there is nothing to attach it to.
            continue
        group = QuestionGroup.objects.create(
            test_set=test_set,
            instruction=bank.instruction,
            order=order,
        )
        options = [
            GroupOption.objects.create(group=group, label=label, text=text, order=index)
            for index, (label, text) in enumerate(bank.options)
        ]
        groups[id(bank)] = (group, {option.label: option for option in options})
    return groups


def _build_question(parsed, subject, category, groups, report):
    if parsed.kind == 'grouped_item':
        return _build_grouped(parsed, subject, category, groups, report)
    if parsed.kind == 'open_written':
        return _build_written(parsed, subject, category, report)
    return _build_choice(parsed, subject, category, report)


def _body_html(parsed):
    """The question body as CKEditor-ready HTML: the prose, then the table if it had one.

    The table follows the prose because these papers always introduce the table first
    ("Jadvalda harflar bilan belgilangan kataklarni aniqlang"), and a picture is attached
    as an image field rather than inlined, so it is positioned by `image_position`.
    """
    parts = []
    for kind, value in parsed.blocks:
        if kind == 'items':
            # Each sub-item on its own line. The paper prints its own markers ("1)", "a)")
            # inside the text, so these are paragraphs rather than a <ul> - a list would
            # add a second set of bullets beside the ones already there.
            parts.extend(f'<p>{_escape(item)}</p>' for item in value)
        elif value:
            parts.append(f'<p>{_escape(value)}</p>')
    return ''.join(parts) + (parsed.table_html or '')


def _escape(text):
    return (text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;'))


def _new_question(parsed, subject, category, **extra):
    question = Question(
        subject=subject,
        body=_body_html(parsed),
        question_type=parsed.kind,
        difficulty='medium',
        # The question carries the same category as the set it is imported into, so a
        # certificate paper's questions are still tagged correctly if they are later
        # reused in another set.
        category=category,
        **extra,
    )
    # The grouped-item wizard flag: a grouped question is saved before it can point at
    # its group in the admin flow, and the same is true here.
    question._skip_group_validation = True
    question.save()
    _attach_figure(parsed, question)
    return question


def _attach_figure(parsed, question):
    """Deferred to after the transaction commits: `build` wraps the whole import in
    `transaction.atomic`, and saving the image field writes straight to storage - if a
    later question in the same import failed and rolled back the DB rows, a figure saved
    eagerly here would already be on disk with nothing left pointing at it."""
    if not parsed.figure_png:
        return
    name = f"import-q{parsed.number}.png"
    content = ContentFile(parsed.figure_png)
    transaction.on_commit(
        lambda question=question, name=name, content=content:
            question.image.save(name, content, save=True)
    )


def _build_choice(parsed, subject, category, report):
    if not parsed.options:
        report.needs_answer.append((parsed.number, "variantlar topilmadi"))
        return None

    question = _new_question(parsed, subject, category)
    if parsed.figure_png:
        report.figures += 1
    if parsed.table_html:
        report.tables += 1

    correct = _applied_label(parsed, report)
    for label, text in parsed.options:
        AnswerOption.objects.create(
            question=question,
            text=_option_text(label, text, parsed.number, report),
            is_correct=(label == correct),
        )
    if correct:
        report.with_answer += 1
    return question


def _option_text(label, text, number, report):
    """AnswerOption has no label column - the letter is part of the displayed text, the
    same way the seeded demo test writes its options."""
    full = f"{label}) {text}"
    if len(full) > 500:
        report.warnings.append(
            (number, f"{label}) variant matni 500 belgigacha qisqartirildi"))
    return full[:500]


def _applied_label(parsed, report):
    """The AI's answer, or None when it was refused or too unsure to pre-select."""
    note = getattr(parsed, 'answer_note', '')
    label = getattr(parsed, 'correct_label', None)
    confidence = getattr(parsed, 'confidence', 0.0)

    if not label:
        report.needs_answer.append((parsed.number, note or "AI javob bermadi"))
        return None
    if confidence < MIN_CONFIDENCE_TO_APPLY:
        report.needs_answer.append(
            (parsed.number, f"AI ishonchi past ({confidence:.0%}) - taxmin: {label}"))
        return None
    return label


def _build_grouped(parsed, subject, category, groups, report):
    entry = groups.get(id(parsed.group)) if parsed.group else None
    if entry is None:
        report.needs_answer.append((parsed.number, "javob banki topilmadi"))
        return None
    group, options_by_label = entry

    question = _new_question(parsed, subject, category, group=group)
    correct = _applied_label(parsed, report)
    if correct and correct in options_by_label:
        question.correct_group_option = options_by_label[correct]
        question.save(update_fields=['correct_group_option'])
        report.with_answer += 1
    return question


def _build_written(parsed, subject, category, report):
    references = getattr(parsed, 'reference_answers', {}) or {}
    question = _new_question(parsed, subject, category)

    if parsed.sub_questions:
        missing = []
        for order, (label, text) in enumerate(parsed.sub_questions):
            reference = references.get(label, '')
            if not reference:
                missing.append(label)
            SubQuestion.objects.create(
                question=question,
                label=label,
                text=text,
                reference_answer=reference,
                order=order,
            )
        if missing:
            report.needs_answer.append(
                (parsed.number, f"namunaviy javob yo'q: {', '.join(missing)}"))
        else:
            report.with_answer += 1
        return question

    # No lettered parts: a single-part written question graded off the question's own
    # reference answer, which is where `answer_key` puts the sole "a" entry.
    reference = references.get('a', '')
    if reference:
        question.reference_answer = reference
        question.save(update_fields=['reference_answer'])
        report.with_answer += 1
    else:
        report.needs_answer.append((parsed.number, "namunaviy javob yo'q"))
    return question
