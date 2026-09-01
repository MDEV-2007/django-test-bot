"""Fills in the one thing the PDF does not contain: which answer is correct.

An exam paper prints the questions, not the key. Everything else in this pipeline is
recovered exactly from the file, so this module is deliberately the only place where a
guess enters the data - and it never pretends otherwise. Each guess carries a confidence,
nothing is published straight to students (the importer creates a draft), and the case a
text model genuinely cannot judge is refused rather than guessed: an image_based question
hides its answer in a map or diagram the model cannot see.

One question per request. Batching several into one call looks cheaper and was tried
first, but a JSON-mode reply is a single object: the model answers the first question of
the batch and drops the rest, so five questions per call produced one answer per call.

Answers come back through `core.ai_client`, so this inherits the platform's existing
Groq-then-local-Ollama chain and its circuit breaker. With no provider configured at all
the pipeline still runs: every question simply arrives unanswered for the teacher.
"""
import json
import logging
import re
import time

from core.ai_client import ask_groq

logger = logging.getLogger(__name__)

# One 429 mid-import is normal load; back off and retry rather than burning the rest of
# the questions on a request that will just get rejected again immediately.
_RATE_LIMIT_BACKOFF = 15
_MAX_ASK_ATTEMPTS = 3

# If the provider itself is broken (bad key, decommissioned model, unreachable) every
# question fails the same way and the import would otherwise run to completion producing
# zero answers with no indication why. Bail out early instead once this many *in a row*
# fail at the provider level (as opposed to the model just declining to answer).
_ABORT_AFTER_CONSECUTIVE_PROVIDER_FAILURES = 5

# Grouped items share one answer bank, so their distractors are the other items' correct
# answers - a text model gets these wrong far more often than it thinks it does.
_GROUPED_CONFIDENCE_CAP = 0.5

_JSON_OBJECT_RE = re.compile(r'\{.*\}', re.DOTALL)

_CHOICE_SYSTEM = (
    "Sen tarix fanidan tajribali o'qituvchisan. Senga bitta test savoli beriladi. "
    "Faqat bitta to'g'ri variant harfini tanlaysan. Ishonching qanchalik ekanini "
    "halol ko'rsatasan: bilmasang yoki savol matni to'liq bo'lmasa, confidence past "
    "bo'lsin. Javobni faqat JSON obyekt ko'rinishida qaytar, boshqa matnsiz: "
    '{"answer": "<harf>", "confidence": <0 dan 1 gacha son>}'
)

_WRITTEN_SYSTEM = (
    "Sen tarix fanidan tajribali o'qituvchisan. Senga yozma (ochiq) savol va uning "
    "bandlari beriladi. Har bir band uchun qisqa namunaviy to'g'ri javob yozasan - "
    "bir yoki ikki jumla, faqat javobning o'zi. Bilmasang, o'sha bandni tashlab ket. "
    "Javobni faqat JSON obyekt ko'rinishida qaytar, boshqa matnsiz: "
    '{"answers": {"a": "<javob>", "b": "<javob>"}, "confidence": <0 dan 1 gacha son>}'
)


def reset(questions, note=''):
    """Give every question the answer attributes the builder expects, unanswered.

    Called on its own when the import runs without AI, so that path produces exactly the
    same shape of data - a set of questions for the teacher to answer - rather than a
    different one that the builder would have to special-case.
    """
    for question in questions:
        question.correct_label = None
        question.reference_answers = {}
        question.confidence = 0.0
        question.answer_note = note


_PROVIDER_FAILURE_REASONS = {'rate_limited', 'provider_error', 'no_provider'}

_REASON_NOTES = {
    'rate_limited': "AI limiti tugadi (rate limit) - keyinroq qayta import qiling.",
    'provider_error': "AI provider xatosi (kalit yoki model muammosi) - server logini tekshiring.",
    'no_provider': "AI sozlanmagan (kalit yo'q) - qo'lda belgilang.",
    'bad_reply': "AI javobi noto'g'ri formatda edi.",
}


def fill(questions, timeout=60, progress=None):
    """Annotate each question in place with `correct_label` / `reference_answers` and a
    `confidence` in 0..1. Returns the number of questions an answer was produced for.

    `progress` is called as progress(index, total) before each request, so a long import
    can show where it is instead of sitting silent for minutes.

    Aborts early if the provider itself is failing (bad key, unreachable, decommissioned
    model) rather than running every remaining question through a call that can only
    fail the same way - the abort's answer_note says why, instead of the generic
    "AI didn't answer" that used to cover every question when the real cause was a
    misconfigured key.
    """
    reset(questions)
    answered = 0
    consecutive_provider_failures = 0
    total = len(questions)
    for index, question in enumerate(questions, start=1):
        if progress:
            progress(index, total)
        ok, reason = _answer_one(question, timeout)
        if ok:
            answered += 1
            consecutive_provider_failures = 0
            continue
        if reason in _PROVIDER_FAILURE_REASONS:
            consecutive_provider_failures += 1
        else:
            consecutive_provider_failures = 0
        if consecutive_provider_failures >= _ABORT_AFTER_CONSECUTIVE_PROVIDER_FAILURES:
            note = f"{_REASON_NOTES[reason]} Import to'xtatildi, qolgan savollar qo'lda belgilanadi."
            logger.error("AI answer_key import aborted after %s consecutive %s failures",
                          consecutive_provider_failures, reason)
            for remaining in questions[index:]:
                if remaining.kind != 'image_based':
                    remaining.answer_note = note
            break
    return answered


def _answer_one(question, timeout):
    if question.kind == 'image_based':
        question.answer_note = (
            "Rasm/xaritali savol - javob rasmda, AI uni ko'ra olmaydi. Qo'lda belgilang."
        )
        return False, None
    if question.kind == 'open_written':
        return _fill_written(question, timeout)
    if not question.options:
        return False, None
    return _fill_choice(question, timeout)


def _fill_choice(question, timeout):
    entry, reason = _ask(_CHOICE_SYSTEM, _choice_prompt(question), timeout)
    if not entry:
        question.answer_note = _REASON_NOTES.get(reason, "AI javob bermadi.")
        return False, reason

    label = str(entry.get('answer', '')).strip().upper()[:1]
    if label not in {option_label for option_label, _ in question.options}:
        question.answer_note = "AI mavjud bo'lmagan variantni ko'rsatdi."
        return False, None

    question.correct_label = label
    question.confidence = _confidence(entry, question.kind)
    return True, None


def _fill_written(question, timeout):
    entry, reason = _ask(_WRITTEN_SYSTEM, _written_prompt(question), timeout)
    if not entry:
        question.answer_note = _REASON_NOTES.get(reason, "AI javob bermadi.")
        return False, reason

    parts = entry.get('answers')
    if not isinstance(parts, dict):
        return False, None
    cleaned = {
        str(label): str(text).strip()
        for label, text in parts.items() if str(text).strip()
    }
    if not cleaned:
        return False, None

    question.reference_answers = cleaned
    question.confidence = _confidence(entry, question.kind)
    return True, None


def _confidence(entry, kind):
    try:
        value = float(entry.get('confidence', 0))
    except (TypeError, ValueError):
        value = 0.0
    value = min(max(value, 0.0), 1.0)
    if kind == 'grouped_item':
        value = min(value, _GROUPED_CONFIDENCE_CAP)
    return value


def _choice_prompt(question):
    options = '\n'.join(f"{label}) {text}" for label, text in question.options)
    return f"SAVOL:\n{_question_text(question)}\n\nVARIANTLAR:\n{options}"


def _written_prompt(question):
    # A written question with no lettered parts is asked as a single part "a", matching
    # how the builder stores it.
    parts = question.sub_questions or [('a', _question_text(question))]
    listed = '\n'.join(f"{label}) {text}" for label, text in parts)
    return f"MATN:\n{_question_text(question)}\n\nBANDLAR:\n{listed}"


def _question_text(question):
    """What the model is shown. A table is included as plain text so the model sees the
    same data the student will - the HTML version goes to the browser, not to the model."""
    text = question.text
    if question.table_text:
        text = f"{text}\n{question.table_text}"
    return text.strip()


def _ask(system, prompt, timeout):
    """Returns (reply_dict, None) on success, or (None, reason) when no provider
    answered usefully. On a 429 from Groq, retries after a short wait instead of
    giving up immediately - a single rate-limited question used to fail outright and
    look identical to a broken API key."""
    status = {}

    def on_error(provider, code, body):
        status[provider] = code

    for attempt in range(_MAX_ASK_ATTEMPTS):
        raw = ask_groq(
            [{"role": "system", "content": system},
             {"role": "user", "content": prompt}],
            temperature=0.1,
            response_format={"type": "json_object"},
            timeout=timeout,
            on_error=on_error,
        )
        if raw:
            parsed = _parse_object(raw)
            return (parsed, None) if parsed else (None, 'bad_reply')
        if status.get('groq') == 429 and attempt < _MAX_ASK_ATTEMPTS - 1:
            time.sleep(_RATE_LIMIT_BACKOFF)
            status.clear()
            continue
        break

    if status.get('groq') == 429:
        return None, 'rate_limited'
    if status:
        return None, 'provider_error'
    return None, 'no_provider'


def _parse_object(raw):
    """Pull the JSON object out of the reply. Models wrap it in prose or in a fenced code
    block often enough that scanning for the object is cheaper than losing the answer."""
    try:
        data = json.loads(raw)
    except ValueError:
        match = _JSON_OBJECT_RE.search(raw)
        if not match:
            logger.warning("AI javobida JSON topilmadi: %s", raw[:200])
            return None
        try:
            data = json.loads(match.group(0))
        except ValueError:
            logger.warning("AI javobidagi JSON buzuq: %s", raw[:200])
            return None
    return data if isinstance(data, dict) else None
