"""Reads an exam PDF into the raw material the parser needs: positioned text lines,
tables rendered as HTML, and figure regions rendered as PNG bytes.

Everything here is coordinate-aware. The parser works on a flat line stream, but a
question also needs to know *where* on the page it sat, so that a table or a map drawn
between two question numbers can be attached to the right question. Each Line therefore
carries its page number and vertical span, and tables/figures are looked up by
overlapping that span.
"""
import io
import logging
import re

import pymupdf

logger = logging.getLogger(__name__)

# Rendering DPI for cropped figures. 200 keeps a map's small numeric labels readable
# when the student views the question on a phone, without producing megabyte PNGs.
FIGURE_DPI = 200

# A raster that repeats on (almost) every page is the paper's watermark/logo, never
# question content. Anything appearing on this share of pages or more is dropped.
_WATERMARK_PAGE_SHARE = 0.6

# Decorative rules, bullets and stray glyphs come through as tiny images. A real figure
# in an A4 exam paper is never this small.
_MIN_FIGURE_WIDTH = 60
_MIN_FIGURE_HEIGHT = 60

# Telling a figure from a layout box. These papers box things that are not pictures at
# all - the shared A-F answer bank of a grouped question sits inside a bordered frame,
# which looks exactly like a diagram to a geometry-only detector. The difference is the
# text inside: a picture's own text is short labels ("9", "Pokiston"), never sentences.
_LABEL_MAX_CHARS = 25
_MAX_LONG_LINES_IN_FIGURE = 1

# A line only counts as a label to pull into the crop if it also reads like one: a name or
# a number, not the tail of a sentence. Without this the crop swallowed the second line of
# the question ("davlatlarni aniqlang.") and printed it inside the map.
_CAPTION_MAX_CHARS = 15
_SENTENCE_END_RE = re.compile(r'[.;:?!]\s*$')

# A country name printed just above its circle belongs to the diagram even though it is
# a normal text line outside the drawn rectangle. Short lines this close to a figure are
# pulled into the crop, so the student sees the labelled diagram, not a bare shape.
_LABEL_GAP = 32

# Lettered option markers at the start of a cell mean the detector framed an answer bank
# rather than a data table.
_OPTION_MARKER_RE = re.compile(r'(?:^|\s)[A-F]\s*\)')
_MAX_OPTION_MARKERS_IN_TABLE = 2

# Matching questions ("Atamalar va ularning izohlari...") are laid out as a table with no
# ruling lines at all: a narrow column of markers (I, II, III... on the left, a, b, c... on
# the right) each followed by its text. PyMuPDF's line-based detector cannot see such a
# table, and its text-based strategy chops words mid-syllable on these two-column pages -
# so the columns are rebuilt here from the marker positions instead. Without this the
# cells arrive as loose text and the question body becomes an unreadable run-on.
_ROMAN_MARKER_RE = re.compile(r'^(?:I{1,3}|IV|VI{0,3}|IX|X)$')
_LETTER_MARKER_RE = re.compile(r'^[a-z]$')

# A real matching list always has at least this many rows; two stray short lines in a
# column do not make a table.
_MIN_PAIR_ROWS = 3

# Markers belong to the same column when their left edges line up this closely.
_MARKER_COLUMN_TOLERANCE = 12

# ...and when they follow each other closely enough down the page. A cell holding three
# lines of definition is the widest real gap between two markers of one table.
_MAX_MARKER_GAP = 90

# How far outside the marker column a cell's own text may reach. A marker is printed
# level with the middle of its cell, so the cell's first line starts slightly above it -
# but only by a line or so. Allowing more lets the first row swallow the options line
# printed above the table.
_PAIR_TEXT_MARGIN = 24


class Line:
    """One text line with its position, as the parser sees it.

    `inside_figure` marks a line that is part of a table or a picture rather than of the
    question's prose. Such a line still bounds the question vertically, but the parser
    keeps it out of the body: a table's cells are re-rendered as HTML and a map's labels
    live in the cropped image, so repeating them as text would show the student the same
    data twice.
    """

    __slots__ = ('text', 'page', 'x0', 'x1', 'y0', 'y1', 'inside_figure')

    def __init__(self, text, page, y0, y1, inside_figure=False, x0=0.0, x1=0.0):
        self.text = text
        self.page = page
        self.x0 = x0
        self.x1 = x1
        self.y0 = y0
        self.y1 = y1
        self.inside_figure = inside_figure

    @property
    def height(self):
        return self.y1 - self.y0

    def __repr__(self):
        return f"Line(p{self.page} y={self.y0:.0f} {self.text[:40]!r})"


class Figure:
    """A picture region on a page, already rendered to PNG bytes."""

    __slots__ = ('page', 'x0', 'x1', 'y0', 'y1', 'png')

    def __init__(self, page, x0, x1, y0, y1, png):
        self.page = page
        self.x0 = x0
        self.x1 = x1
        self.y0 = y0
        self.y1 = y1
        self.png = png


class Table:
    """A detected table, kept both as HTML (for the question body) and as plain text
    (so the AI answering the question sees the same data the student will)."""

    __slots__ = ('page', 'x0', 'x1', 'y0', 'y1', 'html', 'text')

    def __init__(self, page, x0, x1, y0, y1, html, text):
        self.page = page
        self.x0 = x0
        self.x1 = x1
        self.y0 = y0
        self.y1 = y1
        self.html = html
        self.text = text


class PdfDocument:
    """Parsed view of one exam PDF."""

    def __init__(self, lines, tables, figures, page_count):
        self.lines = lines
        self.tables = tables
        self.figures = figures
        self.page_count = page_count

    def tables_in(self, page, y0, y1):
        return [t for t in self.tables if t.page == page and _overlaps(t.y0, t.y1, y0, y1)]

    def figures_in(self, page, y0, y1):
        return [f for f in self.figures if f.page == page and _overlaps(f.y0, f.y1, y0, y1)]


def _overlaps(a0, a1, b0, b1):
    return a0 < b1 and b0 < a1


def load(pdf_path):
    """Open `pdf_path` and return a PdfDocument. Raises if the PDF has no text layer,
    since a scanned paper needs a different (OCR) pipeline and silently importing zero
    questions would look like a parser bug rather than a wrong input file."""
    doc = pymupdf.open(pdf_path)
    try:
        # Tables and figures are located first so that the text lines they contain can be
        # tagged as they are read.
        watermarks = _watermark_xrefs(doc)
        tables = _extract_tables(doc)
        figures = _extract_figures(doc, watermarks)
        # Pair tables are looked for last, in what is left: a ruled table's cells and a
        # diagram's own labels ("I", "II", "III" inside an Euler-Venn diagram) look exactly
        # like the marker column of a matching question.
        tables += _extract_pair_tables(doc, tables, figures)
        tables = _in_reading_order(tables)
        covered = _covered_bands(tables, figures)

        lines = _extract_lines(doc, covered)
        if not lines:
            raise ValueError(
                "PDF da matn qatlami topilmadi - bu skan qilingan hujjatga o'xshaydi. "
                "Bu import faqat matnli (raqamli) PDF bilan ishlaydi."
            )
        return PdfDocument(lines, tables, figures, doc.page_count)
    finally:
        doc.close()


def _in_reading_order(tables):
    """Order tables the way they are read: down the page, but left to right across it.

    A matching question is printed as two tables side by side - the terms on the left, the
    definitions on the right - and the definitions column often starts a little higher.
    Sorting by vertical position alone would therefore put the definitions first, leaving
    the student to read the answers before the question.
    """
    ordered = []
    for table in sorted(tables, key=lambda t: (t.page, t.y0)):
        row = next(
            (group for group in ordered
             if group[0].page == table.page
             and _overlaps(group[0].y0, group[0].y1, table.y0, table.y1)),
            None,
        )
        if row is None:
            ordered.append([table])
        else:
            row.append(table)
    return [table for row in ordered for table in sorted(row, key=lambda t: t.x0)]


def _covered_bands(tables, figures):
    """{page: [(x0, x1, y0, y1), ...]} for every region whose text is reproduced
    elsewhere. The horizontal extent matters as much as the vertical one: on a
    two-column page a diagram in the right column shares its vertical band with ordinary
    question text in the left column, which must not be dropped."""
    bands = {}
    for item in list(tables) + list(figures):
        bands.setdefault(item.page, []).append((item.x0, item.x1, item.y0, item.y1))
    return bands


def _extract_lines(doc, covered_bands):
    """Flatten every page into Line objects in reading order.

    PyMuPDF splits a visual line into spans, each carrying its own spacing, so the spans
    are concatenated rather than space-joined - joining with a space would break every
    word whose apostrophe is set in a different font ("ko'mir" -> "ko ' mir"). Runs of
    whitespace are then collapsed, because these papers pad columns with long space runs
    ("A)   Gastings jangi          B)   Puni urushlari").
    """
    lines = []
    for page_no, page in enumerate(doc, start=1):
        bands = covered_bands.get(page_no, ())
        for bbox, text in _page_text_lines(page):
            rect = pymupdf.Rect(bbox)
            inside = any(_overlaps(bx0, bx1, rect.x0, rect.x1)
                         and _overlaps(by0, by1, rect.y0, rect.y1)
                         for bx0, bx1, by0, by1 in bands)
            lines.append(Line(text, page_no, rect.y0, rect.y1, inside, rect.x0, rect.x1))
    return lines


def _watermark_xrefs(doc):
    """xrefs of rasters that repeat across most pages - the paper's logo/watermark."""
    counts = {}
    for page in doc:
        for xref in {img[0] for img in page.get_images(full=True)}:
            counts[xref] = counts.get(xref, 0) + 1
    threshold = max(2, int(doc.page_count * _WATERMARK_PAGE_SHARE))
    return {xref for xref, n in counts.items() if n >= threshold}


def _extract_tables(doc):
    tables = []
    for page_no, page in enumerate(doc, start=1):
        try:
            found = page.find_tables()
        except Exception:
            logger.exception("find_tables failed on page %s", page_no)
            continue
        for table in found.tables:
            rows = table.extract()
            if not rows or len(rows) < 2 or not _looks_like_data_table(rows):
                continue
            x0, y0, x1, y1 = table.bbox
            tables.append(Table(page_no, x0, x1, y0, y1,
                                _rows_to_html(rows), _rows_to_text(rows)))
    return tables


def _looks_like_data_table(rows):
    """False for a bordered frame that merely holds lettered options.

    A grouped question's shared answer bank ("A) ... B) ... F) ...") is drawn inside a
    box, so the table detector reports it as a table. Importing it as one would put the
    answer options inside the question body and leave the question with no choices.

    A genuine data table may well contain a stray "A)" in one cell, so the test counts
    lettered markers across the whole table instead of rejecting on the first one.
    """
    if max(len(row) for row in rows) < 2:
        return False
    markers = sum(
        len(_OPTION_MARKER_RE.findall(_clean_cell(cell)))
        for row in rows for cell in row
    )
    return markers <= _MAX_OPTION_MARKERS_IN_TABLE


def _extract_pair_tables(doc, ruled_tables, figures):
    """Rebuild the unruled marker/text tables of matching questions.

    A marker column is a run of short lines - roman numerals or single letters - whose
    left edges line up. Everything to the right of that column, up to the next marker
    column, is the text belonging to those markers; each text line is given to whichever
    marker it sits closest to vertically, because a two-line definition brackets its own
    marker rather than starting level with it.
    """
    tables = []
    for page_no, page in enumerate(doc, start=1):
        taken = [t for t in list(ruled_tables) + list(figures) if t.page == page_no]
        entries = [
            (rect, text) for rect, text in (
                (pymupdf.Rect(bbox), text) for bbox, text in _page_text_lines(page)
            )
            if not any(_overlaps(t.y0, t.y1, rect.y0, rect.y1)
                       and _overlaps(t.x0, t.x1, rect.x0, rect.x1) for t in taken)
        ]
        for column in _marker_columns(entries):
            rows, bounds = _pair_rows(column, entries)
            if len(rows) >= _MIN_PAIR_ROWS:
                tables.append(_pair_table(page_no, rows, bounds))
    return tables


def _page_text_lines(page):
    out = []
    for block in page.get_text("dict").get("blocks", []):
        if block.get("type") != 0:
            continue
        for line in block.get("lines", []):
            text = "".join(span.get("text", "") for span in line.get("spans", []))
            text = " ".join(text.split())
            if text:
                out.append((line["bbox"], text))
    return out


def _marker_columns(entries):
    """Groups of aligned marker lines, as [(rect, marker_text), ...] sorted top to bottom.

    The markers must run in order (I, II, III... or a, b, c...) - a column of unrelated
    single letters is not a matching list, and requiring the sequence keeps stray glyphs
    from inventing a table.
    """
    columns = []
    for pattern in (_ROMAN_MARKER_RE, _LETTER_MARKER_RE):
        markers = [(rect, text) for rect, text in entries if pattern.match(text)]
        for group in _aligned_groups(markers):
            group.sort(key=lambda item: item[0].y0)
            for run in _contiguous_runs(group):
                if len(run) >= _MIN_PAIR_ROWS and _is_ordered(t for _, t in run):
                    columns.append(run)
    return columns


def _aligned_groups(markers):
    """Cluster markers whose left edges line up.

    Clustering by proximity rather than by rounding to a fixed grid: the numerals of one
    column drift a few points as they get wider (I, II, III, IV are not centred alike),
    which a fixed grid splits straight down the middle of a real table.
    """
    groups = []
    for rect, text in sorted(markers, key=lambda item: item[0].x0):
        if groups and rect.x0 - groups[-1][-1][0].x0 <= _MARKER_COLUMN_TOLERANCE:
            groups[-1].append((rect, text))
        else:
            groups.append([(rect, text)])
    return groups


def _contiguous_runs(group):
    """Split a column of aligned markers into runs that actually sit together.

    Single letters occur all over a page, and left-aligned ones land in the same column
    bucket however far apart they are. Only markers within a few lines of each other can
    be rows of one table, so a large vertical gap starts a new run.
    """
    runs, current = [], []
    for rect, text in group:
        if current and rect.y0 - current[-1][0].y1 > _MAX_MARKER_GAP:
            runs.append(current)
            current = []
        current.append((rect, text))
    if current:
        runs.append(current)
    return runs


def _is_ordered(markers):
    values = list(markers)
    if all(_LETTER_MARKER_RE.match(v) for v in values):
        return values == sorted(values) and len(set(values)) == len(values)
    order = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']
    try:
        positions = [order.index(v) for v in values]
    except ValueError:
        return False
    return positions == sorted(positions) and len(set(positions)) == len(positions)


def _pair_rows(column, entries):
    """Pair each marker with the text lines that belong to it."""
    left = min(rect.x1 for rect, _ in column)
    right = _next_column_start(column, entries)

    # The text of a table lies beside its markers, not anywhere further down the page:
    # without a vertical bound the first row would absorb the paper's title and the last
    # row the next question's options.
    top = min(rect.y0 for rect, _ in column) - _PAIR_TEXT_MARGIN
    bottom = max(rect.y1 for rect, _ in column) + _PAIR_TEXT_MARGIN

    candidates = [
        (rect, text) for rect, text in entries
        if rect.x0 >= left and rect.x1 <= right
        and top <= rect.y0 and rect.y1 <= bottom
        and (rect, text) not in column
    ]

    buckets = {index: [] for index in range(len(column))}
    bounds = pymupdf.Rect(column[0][0])
    for rect, text in sorted(candidates, key=lambda item: item[0].y0):
        centre = (rect.y0 + rect.y1) / 2
        nearest = min(
            range(len(column)),
            key=lambda index: abs(centre - (column[index][0].y0 + column[index][0].y1) / 2),
        )
        buckets[nearest].append(text)
        bounds |= rect

    for rect, _ in column:
        bounds |= rect

    rows = []
    for index, (_, marker) in enumerate(column):
        text = " ".join(buckets[index]).strip()
        if text:
            rows.append((marker, text))
    return rows, bounds


def _next_column_start(column, entries):
    """Where this column's text stops: at the next marker column to its right, if any."""
    column_right = max(rect.x1 for rect, _ in column)
    top = min(rect.y0 for rect, _ in column)
    bottom = max(rect.y1 for rect, _ in column)

    starts = [
        rect.x0 for rect, text in entries
        if rect.x0 > column_right and _overlaps(rect.y0, rect.y1, top, bottom)
        and (_ROMAN_MARKER_RE.match(text) or _LETTER_MARKER_RE.match(text))
    ]
    return min(starts) - 1 if starts else float('inf')


def _pair_table(page_no, rows, bounds):
    body = ''.join(
        f'<tr><td>{_escape(marker)}</td><td>{_escape(text)}</td></tr>' for marker, text in rows
    )
    html = f'<table border="1" style="border-collapse:collapse;">{body}</table>'
    plain = '\n'.join(f'{marker} | {text}' for marker, text in rows)
    return Table(page_no, bounds.x0, bounds.x1, bounds.y0, bounds.y1, html, plain)


def _clean_cell(value):
    return " ".join((value or "").split())


def _rows_to_html(rows):
    """Render as a CKEditor-compatible <table>. The first row becomes <th> - in these
    papers a table's first row is always its header ("No | Voqea | Natija")."""
    out = ['<table border="1" style="border-collapse:collapse;">']
    for index, row in enumerate(rows):
        tag = 'th' if index == 0 else 'td'
        cells = ''.join(f'<{tag}>{_escape(_clean_cell(cell))}</{tag}>' for cell in row)
        out.append(f'<tr>{cells}</tr>')
    out.append('</table>')
    return ''.join(out)


def _rows_to_text(rows):
    return '\n'.join(' | '.join(_clean_cell(cell) for cell in row) for row in rows)


def _escape(text):
    return text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')


def _extract_figures(doc, watermark_xrefs):
    """Render each non-watermark picture region to PNG.

    The region is re-rendered from the page rather than pulled out as the embedded
    raster, so that vector artwork drawn on top of (or instead of) a raster - the arrows
    and numeric labels on a map, an Euler-Venn diagram made purely of vector circles -
    ends up in the image the student sees. Extracting the raster alone would drop them.
    """
    figures = []
    for page_no, page in enumerate(doc, start=1):
        text_rects = _text_line_rects(page)
        for rect in _figure_rects(page, watermark_xrefs, text_rects):
            png = _render_clip(page, rect)
            if png:
                figures.append(Figure(page_no, rect.x0, rect.x1, rect.y0, rect.y1, png))
    return figures


def _text_line_rects(page):
    """(rect, char_count, is_label) for every text line on the page, used to tell a picture
    from a bordered block of prose and to find the labels that belong to a picture."""
    out = []
    for block in page.get_text("dict").get("blocks", []):
        if block.get("type") != 0:
            continue
        for line in block.get("lines", []):
            text = " ".join(span.get("text", "") for span in line.get("spans", []))
            text = " ".join(text.split())
            if text:
                is_label = (len(text) <= _CAPTION_MAX_CHARS
                            and not _SENTENCE_END_RE.search(text))
                out.append((pymupdf.Rect(line["bbox"]), len(text), is_label))
    return out


def _figure_rects(page, watermark_xrefs, text_rects):
    """Picture regions on one page: embedded rasters plus clusters of vector drawings,
    merged so that a map and the labels drawn over it become one figure, not twenty."""
    rects = []
    for img in page.get_images(full=True):
        if img[0] in watermark_xrefs:
            continue
        try:
            rects.append(page.get_image_bbox(img))
        except Exception:
            continue

    for drawing in page.get_drawings():
        rect = drawing.get("rect")
        # Table borders and the answer-line underscores are also "drawings"; requiring
        # both dimensions to be substantial keeps rules and cell edges out.
        if rect and rect.width >= _MIN_FIGURE_WIDTH and rect.height >= _MIN_FIGURE_HEIGHT:
            rects.append(rect)

    result = []
    for rect in _merge_rects(rects):
        if rect.width < _MIN_FIGURE_WIDTH or rect.height < _MIN_FIGURE_HEIGHT:
            continue
        if _holds_prose(rect, text_rects):
            continue
        result.append(_with_labels(rect, text_rects))
    return result


def _holds_prose(rect, text_rects):
    """True when the region is a layout box around sentences rather than a picture."""
    long_lines = sum(
        1 for line_rect, length, _ in text_rects
        if length > _LABEL_MAX_CHARS and rect.intersects(line_rect)
    )
    return long_lines > _MAX_LONG_LINES_IN_FIGURE


def _with_labels(rect, text_rects):
    """Grow the crop to include short label lines sitting just outside it - the country
    names above an Euler-Venn diagram's circles, a legend under a chart."""
    grown = pymupdf.Rect(rect)
    probe = pymupdf.Rect(rect)
    probe += (-_LABEL_GAP, -_LABEL_GAP, _LABEL_GAP, _LABEL_GAP)
    for line_rect, _, is_label in text_rects:
        if is_label and probe.intersects(line_rect):
            grown |= line_rect
    return grown


def _merge_rects(rects, gap=12):
    """Union any rectangles that touch or nearly touch, repeatedly until stable."""
    remaining = [pymupdf.Rect(r) for r in rects]
    merged = []
    while remaining:
        current = remaining.pop()
        changed = True
        while changed:
            changed = False
            for other in list(remaining):
                probe = pymupdf.Rect(current)
                probe += (-gap, -gap, gap, gap)
                if probe.intersects(other):
                    current |= other
                    remaining.remove(other)
                    changed = True
        merged.append(current)
    return merged


def _render_clip(page, rect):
    clip = pymupdf.Rect(rect) & page.rect
    if clip.is_empty:
        return None
    try:
        pix = page.get_pixmap(dpi=FIGURE_DPI, clip=clip)
    except Exception:
        logger.exception("Figure render failed")
        return None
    return io.BytesIO(pix.tobytes("png")).getvalue()
