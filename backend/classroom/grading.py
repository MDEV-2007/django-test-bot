"""Mock urinishini yakunlash va baholash.

IKKI TEZLIKDA BAHOLASH
----------------------
Yopiq savollar (test, moslashtirish, bo'shliq, TRUE/FALSE) javob berilgan paytdayoq
baholangan — `AttemptAnswer.grade()` buni javob saqlanganda bajaradi. Shuning uchun
yakunlash ularni faqat SANAB chiqadi: hech qanday tashqi chaqiruv yo'q, so'rov
millisekundlarda tugaydi. Bir daqiqada 200 ta topshiriq kelganda ham shunday qoladi.

Esse va yozma javoblar AI ga boradi, ya'ni sekundlar. Ular fon rejimiga uzatiladi
(`core.background`) — so'rov ularni kutmaydi. Natija kelgach ball qayta hisoblanadi.

CHEGARA
-------
Har bir AI baholash pul turadi, shuning uchun o'quvchiga oyiga 15 ta. Hisob birligi —
BITTA YOZMA JAVOB (`AIGradingQuota.MONTHLY_LIMIT`). Chegaradan oshgan javoblar
baholanmay qoladi va o'quvchiga shu haqda izoh yoziladi; qolgan ball baribir chiqadi.
"""
import logging

from django.db import transaction
from django.utils import timezone

from core import background
from tests_app.models import Question
from tests_app.services.grading import grade_open_answers

from .models import AIGradingQuota, MockAttempt

logger = logging.getLogger(__name__)

QUOTA_EXCEEDED_NOTE = "Oylik AI baholash chegarasi tugagan — bu javob baholanmadi."


def current_period(moment=None):
    """Chegara davri — UTC bo'yicha YYYY-MM."""
    return (moment or timezone.now()).strftime('%Y-%m')


def consume_ai_quota(student, wanted, moment=None):
    """Chegaradan `wanted` ta baholash so'raydi va HAQIQATDA berilganini qaytaradi.

    Qator qulflanadi: bir vaqtda ikkita topshiriq yakunlansa, ikkalasi ham bir xil
    "qolgan" sonni ko'rib, chegaradan oshib ketardi.
    """
    if wanted <= 0:
        return 0

    period = current_period(moment)
    with transaction.atomic():
        row, _ = AIGradingQuota.objects.get_or_create(student=student, period=period)
        row = AIGradingQuota.objects.select_for_update().get(pk=row.pk)
        remaining = max(0, AIGradingQuota.MONTHLY_LIMIT - row.used)
        granted = min(wanted, remaining)
        if granted:
            row.used += granted
            row.save(update_fields=['used', 'updated_at'])
    return granted


def _breakdown(answers):
    """Natijaning tur bo'yicha kesimi — natija sahifasi va Telegram xabari uchun.

    AI kutayotgan javoblar alohida sanaladi: o'quvchi "ballim nega o'zgardi?" deb
    hayron bo'lmasligi uchun uni oldindan ko'rishi kerak.
    """
    by_type = {}
    for answer in answers:
        qtype = answer.question.question_type
        bucket = by_type.setdefault(qtype, {'total': 0, 'correct': 0, 'skipped': 0})
        bucket['total'] += 1
        if answer.is_skipped:
            bucket['skipped'] += 1
        elif answer.is_correct:
            bucket['correct'] += 1
    return by_type


def _score_now(answers):
    """Hozirgi ma'lumot bo'yicha ball (foiz), to'g'ri/xato/tashlangan sonlari bilan.

    Maxrajda BARCHA savollar turadi, AI hali baholamaganlari ham: ular vaqtincha
    "to'g'ri emas" bo'lib turadi va baho kelgach ball o'zi ko'tariladi. Teskarisi —
    ularni maxrajdan chiqarib tashlash — esse yozmagan o'quvchini mukofotlagan bo'lardi.
    """
    total = len(answers)
    correct = sum(1 for a in answers if a.is_correct)
    skipped = sum(1 for a in answers if a.is_skipped)
    wrong = total - correct - skipped
    score = (correct / total) * 100 if total else 0.0
    return score, correct, wrong, skipped


def _pending_ai_answers(answers):
    """AI baholashi kerak bo'lgan, bo'sh qoldirilmagan javoblar."""
    return [a for a in answers
            if a.question.question_type in Question.AI_GRADED_TYPES and not a.is_skipped]


def _load_answers(attempt):
    return list(
        attempt.answers
        .select_related('question')
        .prefetch_related('question__sub_questions')
        .order_by('question__exam_number', 'id')
    )


def finalize(mock_attempt, moment=None):
    """Urinishni yakunlaydi: yopiq savollarni sanaydi, esselarni navbatga qo'yadi.

    IDEMPOTENT: ikkinchi chaqiruv (klient "topshirish"ni ikki marta bosdi, yoki taymer
    ham, o'quvchi ham bir vaqtda yubordi) hech narsani o'zgartirmaydi.
    """
    moment = moment or timezone.now()

    with transaction.atomic():
        mock_attempt = (MockAttempt.objects.select_for_update()
                        .select_related('attempt', 'mock', 'student')
                        .get(pk=mock_attempt.pk))
        if mock_attempt.submitted_at is not None:
            return mock_attempt

        attempt = mock_attempt.attempt
        answers = _load_answers(attempt) if attempt else []

        score, correct, wrong, skipped = _score_now(answers)
        pending = _pending_ai_answers(answers)

        mock_attempt.submitted_at = moment
        mock_attempt.score = score
        mock_attempt.breakdown = {
            'total': len(answers),
            'correct': correct,
            'wrong': wrong,
            'skipped': skipped,
            'pending_ai': len(pending),
            'by_type': _breakdown(answers),
        }
        mock_attempt.save(update_fields=['submitted_at', 'score', 'breakdown'])

        if attempt is not None:
            attempt.is_completed = True
            attempt.completed_at = moment
            attempt.score = score
            attempt.correct_answers = correct
            attempt.wrong_answers = wrong
            attempt.skipped_answers = skipped
            attempt.save(update_fields=['is_completed', 'completed_at', 'score',
                                         'correct_answers', 'wrong_answers', 'skipped_answers'])

    if pending:
        # Tranzaksiya YOPILGANDAN keyin: fon oqimi o'z ulanishidan foydalanadi va
        # hali saqlanmagan qatorlarni ko'ra olmaydi.
        transaction.on_commit(lambda: background.submit(grade_written_answers, mock_attempt.pk))

    return mock_attempt


def grade_written_answers(mock_attempt_id):
    """Fon vazifasi: yozma javoblarni AI orqali baholaydi va ballni qayta hisoblaydi.

    So'rov oqimidan tashqarida ishlaydi, shuning uchun bu yerdagi sekinlik hech kimni
    kutdirmaydi. Xatolik bo'lsa ball o'zgarishsiz qoladi — yopiq savollar bo'yicha
    natija allaqachon chiqarilgan.
    """
    mock_attempt = (MockAttempt.objects
                    .select_related('attempt', 'student')
                    .filter(pk=mock_attempt_id).first())
    if mock_attempt is None or mock_attempt.attempt is None:
        return

    answers = _load_answers(mock_attempt.attempt)
    pending = _pending_ai_answers(answers)
    if not pending:
        return

    granted = consume_ai_quota(mock_attempt.student, len(pending))
    graded, skipped_for_quota = pending[:granted], pending[granted:]

    for answer in skipped_for_quota:
        answer.ai_grading_note = QUOTA_EXCEEDED_NOTE
        answer.save(update_fields=['ai_grading_note'])

    if graded:
        items = [{
            'question_text': a.question.body,
            'reference_answer': a.question.reference_answer,
            'student_answer': a.text_answer,
        } for a in graded]

        results = grade_open_answers(items)
        if results:
            for answer, result in zip(graded, results):
                answer.is_correct = result['is_correct']
                answer.ai_grading_note = result['note'][:300]
                answer.save(update_fields=['is_correct', 'ai_grading_note'])
        else:
            # AI yetib bo'lmadi: chegaradan olingan hisobni qaytarib beramiz, aks holda
            # o'quvchi ishlamagan xizmat uchun chegarasini yo'qotgan bo'lardi.
            _refund_ai_quota(mock_attempt.student, granted)
            logger.warning("Mock %s: AI baholash ishlamadi", mock_attempt_id)
            return

    _recompute_score(mock_attempt_id)


def _refund_ai_quota(student, count, moment=None):
    if count <= 0:
        return
    period = current_period(moment)
    with transaction.atomic():
        row = AIGradingQuota.objects.select_for_update().filter(
            student=student, period=period).first()
        if row is None:
            return
        row.used = max(0, row.used - count)
        row.save(update_fields=['used', 'updated_at'])


def _recompute_score(mock_attempt_id):
    """AI baholari kelgandan keyin ballni yangilaydi."""
    with transaction.atomic():
        mock_attempt = (MockAttempt.objects.select_for_update()
                        .select_related('attempt').get(pk=mock_attempt_id))
        attempt = mock_attempt.attempt
        if attempt is None:
            return

        answers = _load_answers(attempt)
        score, correct, wrong, skipped = _score_now(answers)

        breakdown = dict(mock_attempt.breakdown or {})
        breakdown.update({
            'total': len(answers), 'correct': correct, 'wrong': wrong, 'skipped': skipped,
            'pending_ai': 0, 'by_type': _breakdown(answers),
        })

        mock_attempt.score = score
        mock_attempt.breakdown = breakdown
        mock_attempt.save(update_fields=['score', 'breakdown'])

        attempt.score = score
        attempt.correct_answers = correct
        attempt.wrong_answers = wrong
        attempt.skipped_answers = skipped
        attempt.save(update_fields=['score', 'correct_answers', 'wrong_answers', 'skipped_answers'])


def close_expired_attempts(moment=None):
    """Vaqti tugagan, lekin topshirilmagan urinishlarni yakunlaydi.

    O'quvchi brauzerni yopib ketishi, interneti uzilishi mumkin — bunda "topshirish"
    so'rovi hech qachon kelmaydi. Bunday urinish ochiq qolsa, reyting hisoblanganda u
    hisobga kirmasdan qolardi. Yakunlash vaqti sifatida CHINAKAM muddat oxiri yoziladi,
    buyruq ishga tushgan payt emas — o'quvchi kechikkandek ko'rinmasligi kerak.

    Qaytaradi: yakunlangan urinishlar soni.
    """
    moment = moment or timezone.now()
    closed = 0
    candidates = (MockAttempt.objects
                  .filter(submitted_at__isnull=True)
                  .select_related('mock', 'attempt', 'student'))
    for mock_attempt in candidates.iterator():
        if mock_attempt.is_expired(moment):
            finalize(mock_attempt, moment=mock_attempt.deadline)
            closed += 1
    return closed
