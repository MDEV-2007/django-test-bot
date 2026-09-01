"""Turns the positioned line stream from `pdf_source` into ParsedQuestion objects.

Reading order is the hard part. These papers are laid out in two flowing columns with
boxed inserts, and PyMuPDF emits a boxed insert as its own block at the end of the page -
so the shared A-F answer bank for items 33-35, and the items themselves, arrive *after*
item 38 in the raw stream. Rather than trying to reconstruct the visual reading order
geometrically, the parser leans on the one ordering the paper states outright: the
question numbers. Segments are cut at numbered lines and then sorted by number, which is
correct no matter how the blocks were emitted.

Two kinds of line must be pulled out before segmenting, because they belong to no single
question and would otherwise be swallowed by whichever segment happens to precede them:
the shared answer bank of a grouped question, and the instruction naming that group's
range ("33-35-test topshiriqlariga...").
"""
import logging
import re

from .pdf_source import Line

logger = logging.getLogger(__name__)

# A question starts on a line like "17." or "17. Quyidagi...". Only a full stop counts:
# the sub-items inside a matching question are written "1)", "2)", and a bare digit run
# like "1949-yilda" must not open a new question either.
_QUESTION_START_RE = re.compile(r'^(\d{1,3})\.\s*(.*)$')

# How far the next question number may jump before we stop believing it is a question
# number at all. Real papers number consecutively; a big jump means we matched a year or
# a list item that merely happens to be followed by a full stop.
_MAX_NUMBER_JUMP = 5

# One lettered choice. Options are printed several to a line ("A) ... B) ...") on some
# pages and one per line on others, so the text is split on these markers rather than
# assumed to be line-aligned.
_OPTION_SPLIT_RE = re.compile(r'(?:^|\s)([A-F])\s*\)\s*')

# A shared answer bank: this many consecutive single-marker lines, labelled from A upward.
_BANK_MIN_OPTIONS = 5

# "33-35-test topshiriqlariga mos keluvchi javoblarni (A-F) javob variantlaridan tanlang."
_GROUP_INSTRUCTION_RE = re.compile(
    r'(\d{1,3})\s*[-–—]\s*(\d{1,3}).{0,80}?javob', re.IGNORECASE | re.DOTALL)

# A lettered sub-part of a written question: "a) Ushbu qirg'in ... ?"
_SUB_QUESTION_RE = re.compile(r'^([a-z])\s*\)\s*(.+)$')

# The answer slot printed under each sub-part. Its presence is what distinguishes a
# written question from a matching question, which also uses "a) b) c)" labels.
_ANSWER_SLOT_RE = re.compile(r'^Javob\s*:', re.IGNORECASE)

# A question's sub-items: "1) ...", "a) ...", "I) ...". Only a line that opens with one
# is a list line; the same marker inside a sentence is ordinary punctuation.
_ITEM_START_RE = re.compile(r'^\s*(?:\d{1,2}|[a-z]|[IVX]{1,4})\s*\)')
_ITEM_SPLIT_RE = re.compile(r'(?:^|\s)(\d{1,2}|[a-z]|[IVX]{1,4})\s*\)\s*')

# A continuation may sit up to this many line-heights below the option it belongs to;
# beyond that the text is a displaced block from elsewhere on the page.
_CONTINUATION_LINES = 1.6

# Lines are not perfectly aligned, and a wrapped tail can start a point or two above the
# bottom of the line before it.
_LINE_SLACK = 4

# Boilerplate printed on every written question and at the top of the paper.
_NOISE_RES = [
    re.compile(r'^Diqqat\s*!', re.IGNORECASE),
    re.compile(r'^TARIX\s*$', re.IGNORECASE),
    re.compile(r'^\d{1,3}\s*$'),          # bare page number
    re.compile(r'^[_\s]+$'),              # a rule left over from an answer slot
]


class ParsedQuestion:
    """One question recovered from the PDF, before it becomes database rows."""

    def __init__(self, number, page, y0, y1):
        self.number = number
        self.page = page
        self.y0 = y0
        self.y1 = y1
        # Per-page vertical band the question's lines occupy. A question that starts on
        # one page and is continued on the next (a boxed insert pushes the tail of a
        # question onto later pages) has an entry for each page it touches, so a table or
        # figure printed on the continuation page is still found by `_classify_choice`
        # instead of only ever being looked up on `page`.
        self.spans = {page: [y0, y1]}
        self.kind = 'single_choice'
        self.lines = []            # pdf_source.Line, kept until classification
        self.blocks = []           # body, as ('text', str) / ('items', [str]) pairs
        self.options = []          # [(label, text)]
        self.sub_questions = []    # [(label, text)]
        self.table_html = ''
        self.table_text = ''
        self.figure_png = None
        self.group = None          # GroupBank, for grouped_item questions
        self.warnings = []

    @property
    def text_lines(self):
        return [line.text for line in self.lines]

    @property
    def text(self):
        """The body as one string - what the AI is shown, and what the tests assert on."""
        parts = []
        for kind, value in self.blocks:
            parts.extend(value if kind == 'items' else [value])
        return ' '.join(parts or self.text_lines).strip()

    def __repr__(self):
        return f"<Q{self.number} {self.kind} opts={len(self.options)} {self.text[:40]!r}>"


class GroupBank:
    """A shared A-F answer bank plus the range of questions that pick from it."""

    def __init__(self, options, page, y0, y1):
        self.options = options     # [(label, text)]
        self.page = page
        self.y0 = y0
        self.y1 = y1
        self.instruction = ''
        self.first_number = None
        self.last_number = None

    def covers(self, number):
        if self.first_number is None:
            return False
        return self.first_number <= number <= self.last_number


def parse(document):
    """document: pdf_source.PdfDocument -> (questions, banks). Questions come back in
    paper order (by number), each already classified and carrying its table/figure."""
    kept, banks, instructions = _extract_banks_and_instructions(document.lines)
    _attach_instructions(banks, instructions)
    lines = _restore_orphan_banks(kept, banks)

    questions = _segment(lines)
    for question in questions:
        _classify(question, document, banks)
    banks = [b for b in banks if b.first_number is not None]
    return questions, banks


def _is_noise(text):
    return any(pattern.match(text) for pattern in _NOISE_RES)


def _split_options(text):
    """Split "A) foo B) bar" into [('A', 'foo'), ('B', 'bar')].

    Returns [] when the line has no markers, so callers can treat the line as prose.
    """
    parts = _OPTION_SPLIT_RE.split(text)
    if len(parts) < 3:
        return []
    options = []
    # parts = [before, label, body, label, body, ...]
    for index in range(1, len(parts) - 1, 2):
        body = parts[index + 1].strip().rstrip(';').strip()
        options.append((parts[index], body))
    return options


def _extract_banks_and_instructions(lines):
    """Pull shared answer banks and their instruction lines out of the stream.

    A bank is a run of consecutive lines each holding exactly one lettered option, with
    the labels ascending from A. Ordinary four-choice questions print two options per
    line, or all four on one line, so they never form such a run.

    `kept` carries each line's original index alongside it (rather than just the line)
    so `_restore_orphan_banks` can put a bank's lines back in the right place if it turns
    out to belong to no instruction.
    """
    kept, banks, instructions = [], [], []
    index = 0
    while index < len(lines):
        run = _bank_run(lines, index)
        if run:
            options, length = run
            first, last = lines[index], lines[index + length - 1]
            bank = GroupBank(options, first.page, first.y0, last.y1)
            bank._source_start = index
            bank._source_lines = lines[index:index + length]
            banks.append(bank)
            index += length
            continue

        line = lines[index]
        match = _GROUP_INSTRUCTION_RE.search(line.text)
        if match and not _QUESTION_START_RE.match(line.text):
            instructions.append((int(match.group(1)), int(match.group(2)), line))
            index += 1
            continue

        if not _is_noise(line.text):
            kept.append((index, line))
        index += 1
    return kept, banks, instructions


def _restore_orphan_banks(kept, banks):
    """A bank whose instruction line was never matched (`first_number` stays None)
    covers no question, so `_build_groups` silently drops it later - and every question
    that would have picked its options from that bank ends up with none at all, visible
    only as a "variantlar topilmadi" line buried in the report. Putting the bank's lines
    back where they came from at least keeps them in the stream (each still carries its
    single "A) ..." option marker) so the questions around it get some options instead
    of none, and logs a warning naming the page so the gap is easy to find."""
    orphaned = [b for b in banks if b.first_number is None]
    if not orphaned:
        return [line for _, line in kept]

    for bank in orphaned:
        logger.warning(
            "javob banki (%s variant, sahifa %s) hech bir savol topshirig'iga "
            "bog'lanmadi - qatorlar oqimga qaytarildi",
            len(bank.options), bank.page,
        )
        for offset, line in enumerate(bank._source_lines):
            kept.append((bank._source_start + offset, line))

    kept.sort(key=lambda pair: pair[0])
    return [line for _, line in kept]


def _bank_run(lines, start):
    """If a shared answer bank begins at `start`, return (options, line_count)."""
    options = []
    index = start
    while index < len(lines):
        found = _split_options(lines[index].text)
        if len(found) != 1:
            break
        label, text = found[0]
        expected = chr(ord('A') + len(options))
        # The run must start at A and stay contiguous; a stray "D) ..." line elsewhere
        # in the paper therefore cannot be mistaken for the start of a bank.
        if label != expected or not text:
            break
        options.append((label, text))
        index += 1
    if len(options) >= _BANK_MIN_OPTIONS:
        return options, index - start
    return None


def _attach_instructions(banks, instructions):
    """Give each bank the question range from the instruction printed next to it."""
    for first, last, line in instructions:
        bank = _nearest_bank(banks, line)
        if bank is None:
            continue
        bank.first_number, bank.last_number = first, last
        bank.instruction = line.text


def _nearest_bank(banks, line):
    """The bank the instruction refers to: on the same page, closest vertically. The
    instruction is printed directly above its bank, so page + distance is unambiguous
    even when a paper has several banks."""
    same_page = [b for b in banks if b.page == line.page]
    pool = same_page or banks
    if not pool:
        return None
    return min(pool, key=lambda b: abs(b.y0 - line.y0))


def _segment(lines):
    """Cut the stream at question-number lines, then order segments by number."""
    questions = []
    current = None
    seen = set()
    page = None
    for line in lines:
        if line.page != page:
            page = line.page
            # A boxed insert is emitted at the end of its page, so the segment left open
            # when the page ends is usually not the one the next page continues. What a
            # new page continues is the last question in *reading* order, and since the
            # paper numbers questions in reading order, that is the highest number so
            # far - item 38, not the displaced items 33-35 drawn after it.
            current = max(questions, key=lambda q: q.number, default=None)
        number = _question_number(line.text, seen)
        if number is not None:
            match = _QUESTION_START_RE.match(line.text)
            current = ParsedQuestion(number, line.page, line.y0, line.y1)
            remainder = match.group(2).strip()
            if remainder:
                # The number and the first words share a line; keep the rest of that line
                # with its own position so later steps can still reason geometrically.
                current.lines.append(_replace_text(line, remainder))
            questions.append(current)
            seen.add(number)
            continue
        if current is None:
            continue  # cover page / paper title, before the first question
        # A line inside a table or a picture still extends the question's band (that is
        # how the table gets attached to it) but never enters the body text.
        if not line.inside_figure:
            current.lines.append(line)
        span = current.spans.setdefault(line.page, [line.y0, line.y1])
        span[0] = min(span[0], line.y0)
        span[1] = max(span[1], line.y1)
        if line.page == current.page:
            current.y1 = max(current.y1, line.y1)
    questions.sort(key=lambda q: q.number)
    return questions


def _replace_text(line, text):
    return Line(text, line.page, line.y0, line.y1, line.inside_figure, line.x0, line.x1)


def _question_number(text, seen):
    match = _QUESTION_START_RE.match(text)
    if not match:
        return None
    number = int(match.group(1))
    # The number cannot simply be required to increase: a boxed insert is emitted after
    # the rest of its page, so items 33-35 legitimately arrive after item 45. What does
    # hold is that each number appears once and that no number runs far past the highest
    # seen - which is what rules out a stray "12." inside a table cell.
    if number in seen:
        return None
    # The first number is taken as given - a paper may be one section of a larger exam
    # and start at 26. From then on the jump rule applies.
    if seen and number > max(seen) + _MAX_NUMBER_JUMP:
        return None
    return number


def _classify(question, document, banks):
    """Decide the question's type and split its lines into body / options / sub-parts."""
    bank = next((b for b in banks if b.covers(question.number)), None)
    if bank is not None:
        question.kind = 'grouped_item'
        question.group = bank
        question.options = list(bank.options)
        return

    if any(_ANSWER_SLOT_RE.match(line) for line in question.text_lines):
        _classify_written(question)
        return

    _classify_choice(question, document)


def _body_blocks(body_lines):
    """Split the body into paragraphs and lists.

    A paper prints a question's sub-items several to a line to save space - "1) Diodot;
    2) Diomed; 3) Diokletian;" - and wraps long ones onto the next line. Run together into
    one paragraph they are unreadable, which is exactly how the first imported tests
    looked. Here each item becomes its own entry, so the question renders as the list it
    is on paper.
    """
    blocks, prose, items = [], [], []

    def flush_prose():
        if prose:
            blocks.append(('text', ' '.join(prose).strip()))
            prose.clear()

    def flush_items():
        if items:
            blocks.append(('items', list(items)))
            items.clear()

    for text in body_lines:
        found = _split_items(text)
        if found:
            flush_prose()
            items.extend(found)
        elif items:
            # The wrapped tail of the item above it.
            items[-1] = f"{items[-1]} {text}".strip()
        else:
            prose.append(text)
    flush_prose()
    flush_items()
    return blocks


def _split_items(text):
    """["1) Diodot", "2) Diomed"] for a line of sub-items, [] for ordinary prose.

    The line must *start* with a marker: a sentence that merely happens to contain
    "1)" halfway through is prose, and splitting it there would behead it.
    """
    if not _ITEM_START_RE.match(text):
        return []
    parts = _ITEM_SPLIT_RE.split(text)
    items = []
    for index in range(1, len(parts) - 1, 2):
        content = parts[index + 1].strip()
        if content:
            items.append(f"{parts[index]}) {content}")
    return items


def _continues(previous, line):
    """True when `line` is the wrapped tail of the option that `previous` ended with.

    A long option runs onto the next line, so its tail has to be joined back on. But the
    lines after a question's options are just as often a displaced block belonging to
    another question - the two-column layout means such a block can be emitted anywhere -
    and joining those on produced options carrying a whole other question's text. A real
    continuation sits on the same page directly under its option; anything else does not.
    """
    if previous is None or line.page != previous.page:
        return False
    gap = line.y0 - previous.y1
    return -_LINE_SLACK <= gap <= max(previous.height, line.height) * _CONTINUATION_LINES


def _classify_written(question):
    """An open_written question: a shared context paragraph, then lettered sub-parts each
    followed by an answer slot. A paper occasionally prints a single-part written question
    with no lettered parts at all; that stays a plain open_written with no SubQuestions."""
    question.kind = 'open_written'
    body, current_label, current_text = [], None, []

    def flush():
        if current_label and current_text:
            question.sub_questions.append((current_label, ' '.join(current_text).strip()))

    for line in question.text_lines:
        if _ANSWER_SLOT_RE.match(line):
            flush()
            current_label, current_text = None, []
            continue
        match = _SUB_QUESTION_RE.match(line)
        if match:
            flush()
            current_label, current_text = match.group(1), [match.group(2)]
            continue
        if current_label:
            current_text.append(line)
        else:
            body.append(line)
    flush()
    question.blocks = _body_blocks(body)
    if not question.sub_questions:
        question.warnings.append("Yozma savol qism-bandlarga bo'linmadi.")


def _classify_choice(question, document):
    """A lettered-choice question. Whether it is plain, table-backed or image-backed
    depends on what `pdf_source` found in the vertical band the question occupies."""
    body, options, last = [], [], None
    for line in question.lines:
        found = _split_options(line.text)
        if found:
            options.extend(found)
            last = line
            continue
        if options and _continues(last, line):
            label, text = options[-1]
            options[-1] = (label, f"{text} {line.text}".strip())
            last = line
            continue
        body.append(line.text)

    question.blocks = _body_blocks(body)
    question.options = options
    if not options:
        question.warnings.append("Variantlar topilmadi.")

    tables = [
        table
        for page, (y0, y1) in question.spans.items()
        for table in document.tables_in(page, y0, y1)
    ]
    if tables:
        question.kind = 'table_based'
        question.table_html = ''.join(t.html for t in tables)
        question.table_text = '\n'.join(t.text for t in tables)

    figures = [
        figure
        for page, (y0, y1) in question.spans.items()
        for figure in document.figures_in(page, y0, y1)
    ]
    if figures:
        # One image per question in the schema; the largest region is the real figure if
        # a question somehow overlaps two.
        question.figure_png = max(figures, key=lambda f: len(f.png)).png
        if not tables:
            question.kind = 'image_based'
