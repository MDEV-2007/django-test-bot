"""Fokus Sprint va 7-savollik Blitz uchun server tomonidagi javob tekshiruvi.

Javob kaliti hech qachon savollar GET javobida clientga chiqmaydi. Client har bir
javobni `submit_quiz_answer` orqali yuboradi; server:
  - sessiya shu foydalanuvchiniki ekanini (aks holda 404),
  - sessiya muddati tugamaganini (410),
  - savol shu sessiyaga kirganini (400),
  - tanlangan variant aynan shu savolga tegishli ekanini (400)
tekshiradi va natijani `QuizSessionAnswer`ga bir marta yozadi.
"""
from datetime import timedelta

from django.db import IntegrityError, transaction
from django.db.models import F
from django.utils import timezone

from tests_app.models import AnswerOption, Question

from .models import QuizSession, QuizSessionAnswer, UserMistakeNotebook

SESSION_TTL = timedelta(hours=1)
MAX_REVENGE_ATTEMPTS = 3


class QuizAnswerError(Exception):
    def __init__(self, message, status_code=400, code='invalid'):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.code = code


def create_quiz_session(user, mode, question_ids, ttl=SESSION_TTL):
    return QuizSession.objects.create(
        user=user,
        mode=mode,
        question_ids=[int(q) for q in question_ids],
        expires_at=timezone.now() + ttl,
    )


def _as_positive_int(value):
    try:
        number = int(str(value).strip())
    except (TypeError, ValueError):
        return None
    return number if number > 0 else None


def parse_question_id(value):
    """Client 'revenge_<id>_<ts>' ko'rinishidagi ID yuborishi mumkin — haqiqiy ID ajratiladi."""
    raw = str(value or '').strip()
    if raw.startswith('revenge_'):
        parts = raw.split('_')
        raw = parts[1] if len(parts) >= 2 else ''
    return _as_positive_int(raw)


def record_sprint_mistake(user, question, selected_option_id):
    """Xato javobni Xatolar daftari va spaced-repetition (RevisionItem) dastasiga yozadi."""
    UserMistakeNotebook.objects.update_or_create(
        user=user,
        question=question,
        defaults={'failed_option_id': selected_option_id, 'is_resolved': False, 'resolved_at': None},
    )
    from tests_app.models import RevisionItem
    profile = getattr(user, 'profile', None)
    if profile is None:
        return
    item, created = RevisionItem.objects.get_or_create(
        profile=profile,
        question=question,
        defaults={'subject_id': question.subject_id, 'times_wrong': 1, 'mastered': False},
    )
    if not created:
        RevisionItem.objects.filter(pk=item.pk).update(
            times_wrong=F('times_wrong') + 1, mastered=False, updated_at=timezone.now(),
        )


def _resolve_sprint_mistake(user, question_id):
    UserMistakeNotebook.objects.filter(user=user, question_id=question_id).update(
        is_resolved=True,
        resolved_at=timezone.now(),
        revenge_attempts_count=F('revenge_attempts_count') + 1,
    )


def submit_quiz_answer(user, mode, session_id, question_id, option_id, revenge=False):
    """Javobni tekshiradi va saqlaydi. Qaytaradi: natija dict. Xatoda QuizAnswerError."""
    session_pk = _as_positive_int(session_id)
    q_id = parse_question_id(question_id)
    opt_id = _as_positive_int(option_id)
    if not session_pk or not q_id or not opt_id:
        raise QuizAnswerError("session_id, question_id va option_id to'g'ri kiritilishi shart.")

    # Boshqa foydalanuvchi sessiyasi mavjudligini ham oshkor qilmaymiz — 404.
    session = QuizSession.objects.filter(pk=session_pk, user=user, mode=mode).first()
    if session is None:
        raise QuizAnswerError("Sessiya topilmadi.", status_code=404, code='session_not_found')
    if session.expires_at <= timezone.now():
        raise QuizAnswerError("Sessiya muddati tugagan. Yangi sprint boshlang.", status_code=410,
                              code='session_expired')
    if q_id not in (session.question_ids or []):
        raise QuizAnswerError("Bu savol sizning sessiyangizga kirmagan.", code='question_not_in_session')

    question = Question.objects.filter(pk=q_id).first()
    if question is None:
        raise QuizAnswerError("Savol topilmadi.", status_code=404, code='question_not_found')
    option = AnswerOption.objects.filter(pk=opt_id, question_id=q_id).first()
    if option is None:
        raise QuizAnswerError("Tanlangan variant bu savolga tegishli emas.", code='option_mismatch')

    correct_option = AnswerOption.objects.filter(question_id=q_id, is_correct=True).order_by('id').first()
    correct_option_id = correct_option.id if correct_option else None
    is_correct = bool(option.is_correct)

    base = {
        'question_id': q_id,
        'selected_option_id': opt_id,
        'correct_option_id': correct_option_id,
        'is_correct': is_correct,
        'duplicate': False,
        'revenge': bool(revenge),
    }

    if not revenge:
        try:
            with transaction.atomic():
                QuizSessionAnswer.objects.create(
                    session=session, question=question, selected_option=option, is_correct=is_correct,
                )
        except IntegrityError:
            # Takroriy / parallel yuborish: birinchi saqlangan natija qaytadi, hech narsa qayta yozilmaydi.
            stored = QuizSessionAnswer.objects.get(session=session, question=question)
            base.update({
                'duplicate': True,
                'is_correct': stored.is_correct,
                'selected_option_id': stored.selected_option_id,
            })
            return base
        if mode == QuizSession.MODE_SPRINT and not is_correct:
            record_sprint_mistake(user, question, opt_id)
        return base

    # ─── Qasos savoli: faqat birinchi javob xato bo'lgan savol uchun ───
    with transaction.atomic():
        stored = (QuizSessionAnswer.objects.select_for_update()
                  .filter(session=session, question=question).first())
        if stored is None or stored.is_correct:
            raise QuizAnswerError("Qasos savoli faqat xato javob berilgan savol uchun.",
                                  code='revenge_not_allowed')
        if stored.revenge_correct:
            base.update({'duplicate': True, 'is_correct': True})
            return base
        if stored.revenge_attempts >= MAX_REVENGE_ATTEMPTS:
            raise QuizAnswerError("Qasos urinishlari tugadi.", status_code=409, code='revenge_limit')
        stored.revenge_attempts = F('revenge_attempts') + 1
        update_fields = ['revenge_attempts']
        if is_correct:
            stored.revenge_correct = True
            update_fields.append('revenge_correct')
        stored.save(update_fields=update_fields)

    if mode == QuizSession.MODE_SPRINT:
        if is_correct:
            _resolve_sprint_mistake(user, q_id)
        else:
            record_sprint_mistake(user, question, opt_id)
    return base
