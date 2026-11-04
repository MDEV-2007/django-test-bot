"""Avtopilot (learning loop) testlari uchun yordamchi: savollarga server orqali javob berish.

Loop GET javobida endi javob kaliti yo'q, shuning uchun test to'g'ri/xato variantni
bazadan oladi va POST /api/v1/loop/answer/ orqali yuboradi.
"""
from tests_app.models import AnswerOption


def answer_loop_questions(client, stage, question_ids, wrong_ids=()):
    """`stage` ('sprint' | 'arena') savollariga javob beradi: `wrong_ids` dagilarga xato,
    qolganlariga to'g'ri. Javoblar ro'yxatini qaytaradi."""
    responses = []
    for qid in question_ids:
        option = AnswerOption.objects.filter(question_id=qid, is_correct=qid not in wrong_ids).first()
        responses.append(client.post('/api/v1/loop/answer/', {
            'stage': stage, 'question_id': qid, 'option_id': option.id,
        }, content_type='application/json'))
    return responses


def stage_question_ids(current_json, stage):
    return [q['id'] for q in current_json['stage_data'][stage]['questions']]
