"""Rasch Modeli va Item Response Theory (IRT) servisi.

Bilim va malakalarni baholash agentligi (BMB / sobiq DTM) rasmiy Milliy Sertifikat
va Katta Jonli Mock imtihonlarini baholash standarti.

Formulalar:
1. Rasch modeli asosiy formulasi:
   P = e^(θ - b) / (1 + e^(θ - b))
   Bu yerda:
   - P: Talabgorning savolga to'g'ri javob berish ehtimoli
   - θ (theta): Talabgorning qobiliyati (bilim logiti, -4.0 dan +4.0 gacha)
   - b (beta): Savolning qiyinlik darajasi (qiyinlik logiti)

2. Savol qiyinligi (b):
   b = ln((N - R) / R)
   N: Jami talabgorlar soni
   R: Savolga to'g'ri javob berganlar soni
   (Ekstremal holatlar uchun 0.5 qoldiq tekislash ishlatiladi: ln((N - R + 0.5) / (R + 0.5)))

3. Talabgor qobiliyati (θ) - Maksimal haqiqatga o'xshashlik (MLE) / Bisection:
   R_student = Σ P(θ, b_i)
   Barcha savollar bo'yicha ehtimollar yig'indisi haqiqiy to'g'ri javoblar soniga
   teng bo'ladigan yagona θ topiladi.

4. Milliy Sertifikat 70 ballik shkalasiga o'tkazish:
   Ball = A + B * θ
   A = 48.0 (bazaviy logit medianasi)
   B = 7.333 (shkala koeffitsienti)
   Natijada:
   θ = +3.0 -> 70.0 ball (A+)
   θ = 0.0  -> 48.0 ball (C+)
   θ = -3.0 -> 26.0 ball
"""

import math
from typing import Dict, List, Any, Tuple
from django.core.cache import cache


# Rasmiy BMB Milliy Sertifikat darajalari (70 ballik shkala)
CERTIFICATE_BANDS = [
    (65.0, "A+", "A+ Daraja (100% OTM Imtiyozi)", "emerald"),
    (60.0, "A", "A Daraja (A'lo Sertifikat)", "teal"),
    (55.0, "B+", "B+ Daraja (Juda yaxshi)", "sky"),
    (50.0, "B", "B Daraja (Yaxshi natija)", "amber"),
    (46.0, "C+", "C+ Daraja (Qoniqarli)", "orange"),
    (42.0, "C", "C Daraja (O'tish darajasi)", "yellow"),
    (0.0, "—", "Sinovdan o'tmadi (Sertifikat berilmaydi)", "rose"),
]


def calculate_item_difficulties(test, cache_ttl: int = 300) -> Dict[int, float]:
    """Testdagi har bir savol uchun Rasch qiyinlik logitini (b) hisoblaydi.

    b = ln((N - R) / R)
    Natija 5 daqiqaga keshlanadi, shunda minglab o'quvchilar bir vaqtda topshirganda
    ma'lumotlar bazasiga ortiqcha yuk tushmaydi.
    """
    if not test:
        return {}

    cache_key = f"rasch_item_difficulties:{test.id}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    from tests_app.models import Attempt, AttemptAnswer, Question

    questions = list(test.questions.all().order_by('exam_number', 'id'))
    if not questions:
        return {}

    # Faqat tugallangan urinishlarni hisobga olamiz
    completed_attempt_ids = list(
        Attempt.objects.filter(test=test, is_completed=True).values_list('id', flat=True)
    )
    total_students = len(completed_attempt_ids)

    # Agar imtihon hali yangi boshlangan bo'lsa (talabgorlar < 5),
    # savol turi va belgilangan qiyinlik bo'yicha ekspert/aprior logit beramiz:
    if total_students < 5:
        priors = {}
        for q in questions:
            prior_b = 0.0
            if q.difficulty == 'hard':
                prior_b += 0.9
            elif q.difficulty == 'easy':
                prior_b -= 0.9

            if q.question_type == 'open_written':
                prior_b += 0.6
            elif q.question_type in ('matching', 'grouped_item'):
                prior_b += 0.2
            elif q.question_type == 'single_choice':
                prior_b -= 0.1

            priors[q.id] = round(prior_b, 3)

        cache.set(cache_key, priors, 60)
        return priors

    # Mavjud javoblar statistikasi
    answers = AttemptAnswer.objects.filter(
        attempt_id__in=completed_attempt_ids
    ).values('question_id', 'is_correct', 'open_grading', 'ai_score', 'text_answer', 'question__question_type')

    correct_counts = {q.id: 0.0 for q in questions}
    total_counts = {q.id: 0 for q in questions}

    for a in answers:
        qid = a['question_id']
        if qid not in correct_counts:
            continue
        total_counts[qid] += 1

        weight = 0.0
        qtype = a.get('question__question_type')
        if a.get('is_correct'):
            weight = 1.0
        elif a.get('open_grading'):
            parts = a['open_grading'].values()
            dict_parts = [p for p in parts if isinstance(p, dict)]
            if dict_parts:
                weight = sum(1.0 for p in dict_parts if p.get('is_correct')) / len(dict_parts)
            elif a.get('ai_score') is not None:
                weight = max(0.0, min(1.0, float(a['ai_score']) / 5.0))
        elif a.get('ai_score') is not None:
            weight = max(0.0, min(1.0, float(a['ai_score']) / 5.0))
        elif qtype == 'writing_task' and (a.get('text_answer') or '').strip():
            if len((a.get('text_answer') or '').split()) >= 30:
                weight = 0.7
        elif a.get('is_correct'):
            weight = 1.0

        correct_counts[qid] += weight

    difficulties = {}
    for q in questions:
        n = total_counts[q.id] or total_students
        r = correct_counts[q.id]

        # Tekislash (Haldane-Laplace smoothing: n - r + 0.5 va r + 0.5)
        # 0 ga bo'linish va cheksiz logitlarni oldini oladi
        r_adj = max(0.5, min(float(n) - 0.5, r + 0.25))
        n_adj = float(n) + 0.5

        # b = ln((N - R) / R)
        # R kam bo'lsa -> b musbat va katta (qiyin)
        # R ko'p bo'lsa -> b manfiy (oson)
        odds = (n_adj - r_adj) / r_adj
        beta = math.log(max(1e-4, odds))
        # Chegaralash [-3.5, +3.5]
        beta = max(-3.5, min(3.5, beta))
        difficulties[q.id] = round(beta, 3)

    cache.set(cache_key, difficulties, cache_ttl)
    return difficulties


def estimate_theta(item_difficulties: List[float], correct_count: float, total_questions: int) -> float:
    """Maksimal haqiqatga o'xshashlik va bisection usuli orqali θ (talabgor qobiliyati) ni topadi.

    Tenglama:
    Σ [ e^(θ - b_i) / (1 + e^(θ - b_i)) ] = R_student
    """
    if not item_difficulties:
        total_questions = max(1, total_questions)
        # Agar qiyinliklar bo'lmasa, proportsional logit
        p = max(0.01, min(0.99, correct_count / total_questions))
        return round(math.log(p / (1.0 - p)), 3)

    m = len(item_difficulties)
    # Ekstremal chegaralar
    if correct_count <= 0.05:
        return -3.8
    if correct_count >= m - 0.05:
        return +3.8

    # Monoton o'suvchi funksiya bo'lgani uchun bisection juda aniq va tez ishlaydi (< 0.0001 soniya)
    low = -4.0
    high = 4.0
    for _ in range(35):
        mid = (low + high) / 2.0
        # Σ P(mid, b_i)
        expected = sum(1.0 / (1.0 + math.exp(-(mid - b))) for b in item_difficulties)
        if expected < correct_count:
            low = mid
        else:
            high = mid

    theta = (low + high) / 2.0
    return round(theta, 3)


def theta_to_scaled_score(theta: float, max_scale: float = 70.0, correct_count: float = None) -> float:
    """Rasch logitini (θ) rasmiy Milliy Sertifikat 70 ballik shkalasiga o'tkazadi.

    Shkala kalibratsiyasi:
    - 0 ta to'g'ri javob yoki ekstremal past logit (θ <= -3.8) -> qat'iy 0.0 ball
    - θ = 0.0 bo'lganda (o'rtacha bilim) -> 48.0 ball (C+/B chegarasi)
    - θ >= +3.0 bo'lganda (a'lo) -> 70.0 ball (A+)
    - 0 < θ < 3.0: 48.0 dan 70.0 gacha
    - -3.8 < θ < 0: 0.0 dan 48.0 gacha silliq chiziqli proportsiya
    """
    if correct_count is not None and correct_count <= 0.001:
        return 0.0

    if theta <= -3.8:
        return 0.0

    if theta >= 3.0:
        return float(max_scale)

    if theta >= 0.0:
        raw_ball = 48.0 + (22.0 / 3.0) * theta
    else:
        raw_ball = 48.0 + (48.0 / 3.8) * theta

    clamped = max(0.0, min(max_scale, raw_ball))
    return round(clamped, 1)


def get_certificate_grade(scaled_score: float) -> Tuple[str, str, str]:
    """70 ballik shkala bo'yicha rasmiy sertifikat darajasi, matni va rangini qaytaradi."""
    for min_score, grade, label, tone in CERTIFICATE_BANDS:
        if scaled_score >= min_score:
            return grade, label, tone
    return "—", "Sinovdan o'tmadi", "rose"


def evaluate_attempt_rasch(attempt) -> Dict[str, Any]:
    """Urinish natijasini Rasch modeli asosida to'liq tahlil qiladi."""
    test = attempt.test
    correct_cnt = float(attempt.correct_answers or 0.0)

    if not test:
        score_pct = float(attempt.score or 0.0)
        scaled = round((score_pct / 100.0) * 70.0, 1) if correct_cnt > 0.001 else 0.0
        grade, label, tone = get_certificate_grade(scaled)
        return {
            'theta': 0.0 if correct_cnt > 0.001 else -4.0,
            'scaled_score': scaled,
            'max_scale': 70.0,
            'percentage': score_pct if correct_cnt > 0.001 else 0.0,
            'correct_count': int(correct_cnt),
            'total_questions': int(
                (attempt.correct_answers or 0) + (attempt.wrong_answers or 0) + (attempt.skipped_answers or 0)
            ),
            'grade': grade,
            'grade_label': label,
            'tone': tone,
            'difficulty_breakdown': {'easy_total': 0, 'easy_correct': 0, 'medium_total': 0, 'medium_correct': 0, 'hard_total': 0, 'hard_correct': 0},
        }

    difficulties_map = calculate_item_difficulties(test)
    questions = list(test.questions.all().order_by('exam_number', 'id'))
    total_q = len(questions) or max(1, (attempt.correct_answers or 0) + (attempt.wrong_answers or 0) + (attempt.skipped_answers or 0))

    # Savollar bo'yicha qiyinlik logitlari ro'yxati
    item_betas = []
    for q in questions:
        beta = difficulties_map.get(q.id, 0.0)
        item_betas.append(beta)

    # 4. Qiyinlik toifalari bo'yicha savollar va yechilgan javoblar taqsimoti
    # Oson: b < -0.4, O'rtacha: -0.4 <= b <= 0.4, Qiyin: b > 0.4
    breakdown = {
        'easy_total': 0, 'easy_correct': 0,
        'medium_total': 0, 'medium_correct': 0,
        'hard_total': 0, 'hard_correct': 0,
    }

    answers_map = {ans.question_id: ans for ans in attempt.answers.all()}
    for q in questions:
        b = difficulties_map.get(q.id, 0.0)
        ans = answers_map.get(q.id)
        is_corr = bool(ans and ans.is_correct)

        if b < -0.4:
            breakdown['easy_total'] += 1
            if is_corr:
                breakdown['easy_correct'] += 1
        elif b > 0.4:
            breakdown['hard_total'] += 1
            if is_corr:
                breakdown['hard_correct'] += 1
        else:
            breakdown['medium_total'] += 1
            if is_corr:
                breakdown['medium_correct'] += 1

    # Agar o'quvchi birorta ham to'g'ri javob topmagan bo'lsa (0 to'g'ri) -> qat'iy 0.0 ball
    if correct_cnt <= 0.001:
        theta = -4.0
        scaled_score = 0.0
        grade, label, tone = get_certificate_grade(0.0)
        pct = 0.0
        meaning = "Talabgor testda birorta ham to'g'ri javob qayd etmadi (0.0 ball)."
    else:
        # 1. Talabgor qobiliyati θ
        theta = estimate_theta(item_betas, correct_cnt, total_q)

        # 2. 70 ballik rasmiy shkalaga o'tkazish
        scaled_score = theta_to_scaled_score(theta, max_scale=70.0, correct_count=correct_cnt)

        # 3. Sertifikat darajasi
        grade, label, tone = get_certificate_grade(scaled_score)

        pct = round((correct_cnt / float(total_q)) * 100.0, 1) if total_q else 0.0
        meaning = (
            f"Talabgorning qobiliyati θ = {theta:+.2f} logit deb baholandi. "
            f"Qiyinlik darajasi b < {theta:.2f} bo'lgan savollarni yechish ehtimoli 50% dan yuqori bo'ldi."
        )

    return {
        'theta': theta,
        'scaled_score': scaled_score,
        'max_scale': 70.0,
        'percentage': pct,
        'correct_count': int(correct_cnt),
        'total_questions': total_q,
        'grade': grade,
        'grade_label': label,
        'tone': tone,
        'difficulty_breakdown': breakdown,
        'formula_info': {
            'formula': 'P = e^(θ - b) / (1 + e^(θ - b))',
            'b_formula': 'b = ln((N - R) / R)',
            'scale_formula': 'Ball = 48.0 + 7.33 * θ (Nol tozalangan)',
            'meaning': meaning,
        }
    }
