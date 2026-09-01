"""PDF -> TestSet import pipeline.

The PDFs we import are digitally generated exam papers, not scans: the text layer is
exact, so the structure (question numbers, A/B/C/D options, tables, sub-questions) is
recovered by deterministic parsing rather than by asking a model to read a picture of
the page. A vision model transcribing a page would be slower and would silently
paraphrase; here the only thing an AI is asked for is the one piece of information the
PDF genuinely does not contain — which option is correct (see `answer_key`).

Modules:
    pdf_source  — page text with coordinates, tables as HTML, figures as cropped PNGs
    parser      — line stream -> ParsedQuestion objects (type, body, options, sub-parts)
    answer_key  — AI guess for the correct option, always teacher-reviewed
    builder     — ParsedQuestion -> Question/AnswerOption/SubQuestion rows in a draft TestSet
"""
