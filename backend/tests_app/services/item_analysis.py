"""Psixometrik tahlil va Item Response Theory (Rasch) servisi.

Mock imtihon savollarining haqiqiy qiyinlik darajasi (Beta logit va p-value) hamda
diskriminatsiya koeffitsientini hisoblab beradi.
"""
import math
from collections import defaultdict
from typing import Dict, List, Any

from tests_app.models import Attempt, AttemptAnswer, Question, TestSet


def analyze_mock_items(test_id: int) -> Dict[str, Any]:
    """Testdagi har bir savol bo'yicha Rasch qiyinligi va psixometrik ko'rsatkichlarni hisoblaydi."""
    test = TestSet.objects.filter(id=test_id).first()
    if not test:
        return {'error': 'Test topilmadi'}

    completed_attempts = list(
        Attempt.objects.filter(test=test, is_completed=True)
        .order_by('-score')
        .values_list('id', 'score')
    )
    total_students = len(completed_attempts)
    if total_students == 0:
        return {
            'test_id': test.id,
            'test_title': test.title,
            'total_students': 0,
            'items': [],
            'message': "Hali bu imtihonni topshirgan o'quvchilar yo'q."
        }

    attempt_ids = [a[0] for a in completed_attempts]

    # Yuqori va quyi 27% guruh (Diskriminatsiya indeksi uchun)
    group_size = max(1, int(total_students * 0.27))
    top_attempt_ids = set(attempt_ids[:group_size])
    bottom_attempt_ids = set(attempt_ids[-group_size:])

    # Savollar bo'yicha javoblarni yig'amiz
    answers = AttemptAnswer.objects.filter(
        attempt_id__in=attempt_ids
    ).values('question_id', 'attempt_id', 'is_correct', 'open_grading')

    item_stats = defaultdict(lambda: {
        'total': 0, 'correct_weight': 0.0,
        'top_correct': 0.0, 'bottom_correct': 0.0
    })

    for ans in answers:
        qid = ans['question_id']
        att_id = ans['attempt_id']

        weight = 0.0
        if ans.get('open_grading'):
            parts = ans['open_grading'].values()
            if parts:
                weight = sum(1.0 for p in parts if p.get('is_correct')) / len(parts)
        elif ans.get('is_correct'):
            weight = 1.0

        item_stats[qid]['total'] += 1
        item_stats[qid]['correct_weight'] += weight

        if att_id in top_attempt_ids:
            item_stats[qid]['top_correct'] += weight
        if att_id in bottom_attempt_ids:
            item_stats[qid]['bottom_correct'] += weight

    questions = list(test.questions.all().order_by('exam_number', 'id'))
    items_report = []

    for idx, q in enumerate(questions, start=1):
        st = item_stats.get(q.id, {'total': 0, 'correct_weight': 0.0, 'top_correct': 0.0, 'bottom_correct': 0.0})
        n = st['total'] or total_students
        r = st['correct_weight']

        # Ekstremal holatlar uchun 0.5 qoldiq tuzatish
        r_adj = max(0.5, min(float(n) - 0.5, r))
        p_val = r / n if n > 0 else 0.0

        # Rasch qiyinlik logiti: beta = ln((N - R) / R)
        beta = math.log((n - r_adj) / r_adj)

        # Diskriminatsiya indeksi D = P(top) - P(bottom)
        p_top = st['top_correct'] / group_size if group_size > 0 else 0.0
        p_bottom = st['bottom_correct'] / group_size if group_size > 0 else 0.0
        discrim = round(p_top - p_bottom, 2)

        if beta > 1.0:
            category = "Juda qiyin"
            tone = "rose"
        elif beta > 0.3:
            category = "Qiyin"
            tone = "amber"
        elif beta < -0.5:
            category = "Oson"
            tone = "emerald"
        else:
            category = "O'rtacha"
            tone = "sky"

        items_report.append({
            'index': idx,
            'question_id': q.id,
            'exam_number': q.exam_number or idx,
            'type': q.question_type,
            'body_snippet': (q.body[:90] + '...') if len(q.body) > 90 else q.body,
            'total_answers': n,
            'correct_rate_pct': round(p_val * 100, 1),
            'rasch_beta': round(beta, 2),
            'discrimination_d': discrim,
            'difficulty_category': category,
            'tone': tone,
        })

    return {
        'test_id': test.id,
        'test_title': test.title,
        'total_students': total_students,
        'items_count': len(items_report),
        'items': items_report,
    }
