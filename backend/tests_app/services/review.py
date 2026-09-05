"""Tugagan urinishdagi javobni odam o'qiydigan matnga aylantiradi.

Natijalar sahifasi har bir savol uchun ikki qatorni ko'rsatadi: "sizning javobingiz" va
"to'g'ri javob". Ilgari bu faqat variantli savollar uchun to'ldirilgan edi, shuning uchun
CEFR testining bo'shliqli, TRUE/FALSE va moslashtirish savollari natijalar sahifasida
bo'sh chiqardi — o'quvchi qayerda xato qilganini ko'rmasdi. Shu modul har bir tur uchun
javobni matnga aylantiradi.

MUHIM: bu yerdagi hech narsa test TUGAMASDAN oldin chaqirilmasligi kerak — to'g'ri
javoblar shu funksiyalar orqali ochiladi.
"""
from ..models import Question


def _joined(values):
    return ', '.join(v for v in values if v)


def describe_answer(answer):
    """`{'your_answer': str, 'correct_answer': str}` — ikkalasi ham odam o'qiydigan matn."""
    question = answer.question
    qtype = question.question_type

    if qtype in Question.SINGLE_ANSWER_TYPES:
        return {
            'your_answer': answer.selected_choice.text if answer.selected_choice else '',
            'correct_answer': _joined(c.text for c in question.choices.all() if c.is_correct),
        }

    if qtype == 'grouped_item':
        chosen = answer.grouped_option
        correct = question.correct_group_option
        return {
            'your_answer': f"{chosen.label}) {chosen.text}" if chosen else '',
            'correct_answer': f"{correct.label}) {correct.text}" if correct else '',
        }

    if qtype in Question.TEXT_INPUT_TYPES:
        # Bo'shliq va TRUE/FALSE/NOT GIVEN — bir nechta maqbul javob bo'lishi mumkin,
        # hammasi ko'rsatiladi ("forest / the forest").
        return {
            'your_answer': answer.text_answer,
            'correct_answer': ' / '.join(a.text for a in question.accepted_answers.all()),
        }

    if qtype == 'matching':
        submitted = answer.matching_data or {}
        pairs = [p for p in question.matching_pairs.all() if p.left_key]
        return {
            'your_answer': _joined(f"{p.left_key}→{submitted[p.left_key]}"
                                   for p in pairs if submitted.get(p.left_key)),
            'correct_answer': _joined(f"{p.left_key}→{p.right_key}" for p in pairs),
        }

    if qtype == 'open_written':
        sub_qs = list(question.sub_questions.all())
        if sub_qs:
            submitted = answer.open_answers or {}
            return {
                'your_answer': _joined(f"{sq.label}) {submitted.get(sq.label, '')}"
                                       for sq in sub_qs if submitted.get(sq.label)),
                'correct_answer': _joined(f"{sq.label}) {sq.reference_answer}" for sq in sub_qs),
            }
        return {'your_answer': answer.text_answer, 'correct_answer': question.reference_answer}

    if qtype == 'writing_task':
        # Writing "to'g'ri javob"ga ega emas — o'quvchi matni va (baholatgan bo'lsa)
        # AI bahosi alohida `writing` blokida qaytadi.
        return {'your_answer': answer.text_answer, 'correct_answer': ''}

    return {'your_answer': '', 'correct_answer': ''}


def writing_payload(answer):
    """Writing topshirig'i uchun natijalar sahifasidagi baho bloki (baholanmagan bo'lsa None)."""
    if answer.question.question_type != 'writing_task':
        return None
    if answer.ai_score is None:
        return {'reviewed': False}
    return {
        'reviewed': True,
        'overall': answer.ai_score,
        'level': answer.ai_level,
        **(answer.open_grading or {}),
    }


def section_label(question):
    """Savol qaysi partdan ekani — natijalar ro'yxatini bo'limlarga ajratish uchun."""
    section = question.section
    if section is None:
        return None
    return {
        'skill': section.skill,
        'skill_label': section.get_skill_display(),
        'part_number': section.part_number,
        'title': section.title,
    }
