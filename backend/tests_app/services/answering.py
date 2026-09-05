"""Bitta javobni saqlash mantig'i — savol turiga qarab qaysi maydonga yozilishi.

Ikkita ekran bir xil qoidadan foydalanadi: klassik "bitta savol — bitta ekran" oqimi
(tests_app.api.answer_api) va CEFR imtihon ekrani (tests_app.cefr_api), u butun partni
bir varaqda ko'rsatadi. Mantiq shu yerda bir marta turadi, aks holda yangi savol turi
qo'shilganda ikkita joyni yangilash kerak bo'lardi.
"""
from django.shortcuts import get_object_or_404
from django.utils import timezone

from ..models import AnswerOption, GroupOption, Question


def apply_answer(answer, data):
    """`answer` (AttemptAnswer) ga klientdan kelgan `data`ni yozadi va (AI baholaydigan
    turlardan tashqari) darhol baholaydi. Saqlashni chaqiruvchi bajaradi."""
    question = answer.question
    qtype = question.question_type

    if qtype == 'open_written':
        sub_qs = question.sub_questions.all()
        if sub_qs:
            subanswers = data.get('subanswers') or {}
            answer.open_answers = {
                sq.label: (subanswers.get(sq.label) or '').strip()
                for sq in sub_qs if (subanswers.get(sq.label) or '').strip()
            }
        else:
            answer.text_answer = (data.get('text_answer') or '').strip()
    elif qtype == 'writing_task':
        # Writing hech qachon shu yerda baholanmaydi: o'quvchi bepul yozadi, AI tekshiruvi
        # esa alohida (premium) so'rov bilan chaqiriladi.
        answer.text_answer = (data.get('text_answer') or '').strip()
    elif qtype in Question.TEXT_INPUT_TYPES:
        answer.text_answer = (data.get('text_answer') or '').strip()
        answer.grade()
    elif qtype == 'matching':
        left_keys = [p.left_key for p in question.matching_pairs.all() if p.left_key]
        matches = data.get('matches') or {}
        answer.matching_data = {k: matches[k] for k in left_keys if matches.get(k)}
        answer.grade()
    elif qtype == 'grouped_item':
        option_id = data.get('group_option_id')
        answer.grouped_option = (
            get_object_or_404(GroupOption, id=option_id, group=question.group) if option_id else None
        )
        answer.grade()
    else:
        choice_id = data.get('choice_id')
        answer.selected_choice = (
            get_object_or_404(AnswerOption, id=choice_id, question_id=question.id) if choice_id else None
        )
        answer.grade()

    # Javob vaqti: klient shu savolda qancha turganini yuboradi. Ishonchsiz manba
    # bo'lgani uchun oqilona chegara qo'yiladi (0-1 soat).
    try:
        spent = int(data.get('time_spent_sec') or 0)
    except (TypeError, ValueError):
        spent = 0
    answer.time_spent_sec = max(0, min(spent, 3600)) or None
    answer.answered_at = timezone.now()
    return answer
