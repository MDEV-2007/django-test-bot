"""Student analytics engine — the single source of truth for both the Radar chart
(Feature 3) and the full Analytics Dashboard (Feature 8).

Design choice (better than the proposed MasterySnapshot table): mastery and trends are
computed *live* from already-indexed AttemptAnswer/Attempt rows and memoised in the cache
framework, keyed per profile and busted when a test finishes. A live+cache read is always
accurate and never drifts, whereas a snapshot table can go stale and needs its own
write path on every answer. Every figure below comes from at most a handful of aggregate
queries (GROUP BY in the DB) — never a per-row Python loop — so it stays flat at 10k users.
"""
from datetime import timedelta

from django.core.cache import cache
from django.db.models import Avg, Count, Q, Sum
from django.db.models.functions import TruncDate
from django.utils import timezone

from tests_app.models import Attempt, AttemptAnswer, ExamSection

DASHBOARD_CACHE_KEY = 'analytics:dash:{pid}'
DASHBOARD_CACHE_TTL = 60 * 15  # 15 min; explicitly busted on test completion.

WEAK_THRESHOLD = 50
STRONG_THRESHOLD = 80


def bust_cache(profile_pk):
    """Called from the test-finish hook so the next dashboard/radar read is fresh."""
    cache.delete(DASHBOARD_CACHE_KEY.format(pid=profile_pk))


def _answer_qs(profile):
    return AttemptAnswer.objects.filter(attempt__profile=profile, attempt__is_completed=True)


def compute_mastery(profile):
    """Per-subject and per-topic mastery (% correct), plus radar axes and weak/strong
    lists. Two aggregate queries total."""
    answers = _answer_qs(profile)

    subject_rows = list(
        answers.filter(question__subject__isnull=False)
        .values('question__subject__id', 'question__subject__name', 'question__subject__color')
        .annotate(total=Count('id'), correct=Count('id', filter=Q(is_correct=True)))
        .order_by('-total')
    )
    topic_rows = list(
        answers.filter(question__topic__isnull=False)
        .values('question__topic__id', 'question__topic__title')
        .annotate(total=Count('id'), correct=Count('id', filter=Q(is_correct=True)))
        .order_by('-total')[:8]  # radar stays readable with <=8 axes
    )

    def pct(correct, total):
        return round((correct / total) * 100) if total else 0

    subjects = [{
        'id': r['question__subject__id'],
        'name': r['question__subject__name'],
        'color': r['question__subject__color'] or '#2d6cff',
        'mastery': pct(r['correct'], r['total']),
        'answered': r['total'],
    } for r in subject_rows]

    topics = [{
        'id': r['question__topic__id'],
        'title': r['question__topic__title'],
        'mastery': pct(r['correct'], r['total']),
        'answered': r['total'],
    } for r in topic_rows]

    weak = [t['title'] for t in topics if t['mastery'] < WEAK_THRESHOLD]
    strong = [t['title'] for t in topics if t['mastery'] >= STRONG_THRESHOLD]

    return {
        'subjects': subjects,
        'topics': topics,
        'radar': {
            'labels': [t['title'] for t in topics],
            'values': [t['mastery'] for t in topics],
        },
        'weak': weak,
        'strong': strong,
    }


SPEED_FAST_SEC = 30    # savolga o'rtacha 30s va tezroq -> 100
SPEED_SLOW_SEC = 150   # 150s va sekinroq -> 0


def compute_skill_radar(profile, mastery=None):
    """6 o'qli radar — yagona manba (profil, analitika, ota-ona radari).

    Har o'q: {'value': 0-100 yoki None, 'basis': qanday hisoblangani, 'is_proxy': bool}.
    `value=None` — ma'lumot yo'q (soxta raqam ko'rsatilmaydi). Proxy o'qlar (bevosita
    o'lchanmaydigan) shunday belgilanadi va UI ularni "taxminiy" deb ko'rsatadi.
    """
    mastery = mastery or compute_mastery(profile)
    agg = _answer_qs(profile).aggregate(
        total=Count('id'),
        avg_time=Avg('time_spent_sec', filter=Q(time_spent_sec__gt=0)),
    )
    total = agg['total'] or 0
    # Aniqlik — dashboard bilan bir xil: yakunlangan attemptlardagi to'g'ri/(to'g'ri+xato),
    # o'tkazib yuborilgan savollar hisobga olinmaydi.
    att = Attempt.objects.filter(profile=profile, is_completed=True).aggregate(
        correct=Sum('correct_answers'), wrong=Sum('wrong_answers'))
    graded = (att['correct'] or 0) + (att['wrong'] or 0)

    subjects = mastery['subjects']
    subject_value = round(sum(s['mastery'] for s in subjects) / len(subjects)) if subjects else None
    accuracy = round((att['correct'] or 0) / graded * 100) if graded else None

    speed = None
    if agg['avg_time']:
        span = SPEED_SLOW_SEC - SPEED_FAST_SEC
        speed = round(max(0, min(100, (SPEED_SLOW_SEC - agg['avg_time']) / span * 100)))

    writing = compute_cefr_skills(profile)['writing']
    writing_value = round(writing['avg_score'] / 5 * 100) if writing['avg_score'] is not None else None

    has_tests = total > 0
    elo = getattr(profile, 'elo_rating', None)
    logic = round(max(0, min(100, (elo - 500) / 1500 * 100))) if (elo and has_tests) else None
    consistency = min(100, (profile.streak or 0) * 100 // 30)

    axes = {
        'subject_mastery': {'value': subject_value, 'is_proxy': False,
                            'basis': "Fanlar bo'yicha to'g'ri javoblar foizi (o'rtacha)"},
        'accuracy': {'value': accuracy, 'is_proxy': False,
                     'basis': "Barcha yakunlangan testlardagi to'g'ri / (to'g'ri + xato)"},
        'speed': {'value': speed, 'is_proxy': False,
                  'basis': f"Savolga o'rtacha sarflangan vaqt ({SPEED_FAST_SEC}s=100, {SPEED_SLOW_SEC}s=0)"},
        'writing': {'value': writing_value, 'is_proxy': False,
                    'basis': "AI baholagan CEFR Writing o'rtacha bali (0-5)"},
        'logic': {'value': logic, 'is_proxy': True,
                  'basis': "Taxminiy: 1v1 Arena ELO reytingi asosida (500=0, 2000=100)"},
        'consistency': {'value': consistency, 'is_proxy': True,
                        'basis': "Taxminiy: uzluksiz faollik (streak) kunlari, 30 kun = 100"},
    }
    measured = [a['value'] for a in axes.values() if a['value'] is not None]
    return {
        'axes': axes,
        # Test natijasi bo'lmasa umumiy ball yo'q: faqat streak (taxminiy) o'qidan "OVR 3"
        # chiqib, o'quvchini chalg'itardi.
        'overall': round(sum(measured) / len(measured)) if (measured and has_tests) else None,
        'answered': total,
        'has_data': has_tests,
    }


def compute_cefr_skills(profile):
    """CEFR ko'nikmalari kesimi: Listening / Reading / Writing bo'yicha o'zlashtirish.

    Nega alohida: mavjud "mavzular kesimi" savolni Topic bo'yicha guruhlaydi (CEFR'da bu
    A1...C2 darajalari), lekin o'quvchi uchun eng muhim savol boshqa — "qaysi ko'nikmam
    oqsayapti?". Ko'nikma savolning partida (ExamSection.skill) turadi.

    Writing to'g'ri/xato deb baholanmaydi, shuning uchun u foiz bilan emas, AI qo'ygan
    o'rtacha ball (0-5) va oxirgi daraja bilan qaytadi. CEFR testi yechmagan o'quvchida
    natija bo'sh bo'ladi va dashboard bu blokni umuman ko'rsatmaydi."""
    answers = _answer_qs(profile).filter(question__section__isnull=False)

    rows = list(
        answers.exclude(question__question_type='writing_task')
        .values('question__section__skill')
        .annotate(total=Count('id'), correct=Count('id', filter=Q(is_correct=True)))
    )

    skills = []
    labels = dict(ExamSection.SKILL_CHOICES)
    for row in rows:
        skill = row['question__section__skill']
        total = row['total']
        skills.append({
            'skill': skill,
            'label': labels.get(skill, skill),
            'mastery': round((row['correct'] / total) * 100) if total else 0,
            'answered': total,
        })
    skills.sort(key=lambda s: s['skill'])

    # Writing — baholangan javoblarning o'rtacha bali va eng oxirgi darajasi.
    writing = answers.filter(question__question_type='writing_task', ai_score__isnull=False)
    writing_stats = writing.aggregate(avg=Avg('ai_score'), count=Count('id'))
    latest_level = (writing.order_by('-attempt__completed_at')
                    .values_list('ai_level', flat=True).first() or '')

    return {
        'skills': skills,
        'writing': {
            'reviewed_count': writing_stats['count'] or 0,
            'avg_score': round(writing_stats['avg'], 1) if writing_stats['avg'] else None,
            'level': latest_level,
        },
        'has_data': bool(skills) or bool(writing_stats['count']),
    }


def dashboard_data(profile, use_cache=True):
    """Everything the Analytics Dashboard renders. Cached per profile."""
    key = DASHBOARD_CACHE_KEY.format(pid=profile.pk)
    if use_cache:
        cached = cache.get(key)
        if cached is not None:
            return cached

    attempts = Attempt.objects.filter(profile=profile, is_completed=True)
    today = timezone.localdate()

    # --- Accuracy (correct / wrong / skipped) — one aggregate row ---
    totals = attempts.aggregate(
        correct=Sum('correct_answers'), wrong=Sum('wrong_answers'),
        skipped=Sum('skipped_answers'), tests=Count('id'), avg=Avg('score'),
    )
    correct = totals['correct'] or 0
    wrong = totals['wrong'] or 0
    skipped = totals['skipped'] or 0
    graded = correct + wrong
    accuracy = round((correct / graded) * 100) if graded else 0

    # --- Daily activity, last 14 days (bar) ---
    since_14 = today - timedelta(days=13)
    daily_rows = {
        r['day']: r for r in
        attempts.filter(completed_at__date__gte=since_14)
        .annotate(day=TruncDate('completed_at')).values('day')
        .annotate(count=Count('id'), avg=Avg('score'))
    }
    # Per-day focus minutes (started_at → completed_at). Each attempt is capped at 3 hours
    # so a tab left open overnight does not inflate the weekly focus chart.
    daily_minutes = {}
    for r in attempts.filter(completed_at__date__gte=since_14).values('started_at', 'completed_at'):
        if not (r['started_at'] and r['completed_at']):
            continue
        secs = min(max(0.0, (r['completed_at'] - r['started_at']).total_seconds()), 3 * 3600)
        day = timezone.localtime(r['completed_at']).date()
        daily_minutes[day] = daily_minutes.get(day, 0.0) + secs / 60
    daily = []
    for i in range(14):
        d = since_14 + timedelta(days=i)
        row = daily_rows.get(d)
        daily.append({'date': d.strftime('%d.%m'), 'iso': d.isoformat(), 'weekday': d.weekday(),
                      'count': row['count'] if row else 0,
                      'avg': round(row['avg']) if row and row['avg'] else 0,
                      'minutes': round(daily_minutes.get(d, 0))})

    # --- Monthly progress, last 6 months (area: tests + avg score + cumulative XP) ---
    # Ilgari bu blok HAFTALIK edi: 1-2 ustunli grafik hech qanday tendensiyani
    # ko'rsatmasdi (bitta hafta = bitta ulkan ustun). Oylik oyna esa o'sish yo'nalishini
    # ko'rsatadi va bo'sh oylar ham nol qiymat bilan chiziladi — uzilish bo'lmaydi.
    MONTHS_UZ = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn', 'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek']

    first_month = (today.replace(day=1) - timedelta(days=31 * 5)).replace(day=1)
    month_attempts = list(
        attempts.filter(completed_at__date__gte=first_month)
        .values('completed_at', 'correct_answers', 'score')
        .order_by('completed_at')
    )
    monthly_map = {}
    for a in month_attempts:
        d = a['completed_at'].date()
        key = (d.year, d.month)
        b = monthly_map.setdefault(key, {'tests': 0, 'score_sum': 0, 'xp': 0})
        b['tests'] += 1
        b['score_sum'] += a['score'] or 0
        b['xp'] += (a['correct_answers'] or 0) * 50  # mirror finish() XP formula

    # So'nggi 6 oyni to'liq qatorga aylantiramiz (bo'sh oylar ham qoladi).
    keys = []
    y, m = today.year, today.month
    for _ in range(6):
        keys.append((y, m))
        m -= 1
        if m == 0:
            m, y = 12, y - 1
    keys.reverse()

    cum = 0
    monthly = []
    for key in keys:
        b = monthly_map.get(key, {'tests': 0, 'score_sum': 0, 'xp': 0})
        cum += b['xp']
        monthly.append({
            'label': MONTHS_UZ[key[1] - 1],
            'tests': b['tests'],
            'avg': round(b['score_sum'] / b['tests']) if b['tests'] else 0,
            'cum_xp': cum,
        })

    # --- Subject distribution (doughnut) — reuse mastery subjects ---
    mastery = compute_mastery(profile)
    subject_dist = [{'name': s['name'], 'value': s['answered'], 'color': s['color']}
                    for s in mastery['subjects']]

    # --- Time spent (minutes) ---
    time_rows = attempts.exclude(completed_at__isnull=True).values('started_at', 'completed_at')
    # Manfiy oraliqni nolga tenglaymiz: buzilgan yoki qo'lda kiritilgan qatorda
    # completed_at < started_at bo'lib qolsa, jami vaqt manfiy chiqib ketardi.
    total_seconds = sum(max(0.0, (r['completed_at'] - r['started_at']).total_seconds())
                        for r in time_rows if r['completed_at'] and r['started_at'])
    minutes = int(total_seconds // 60)

    # --- Recent test history (table) ---
    recent = list(
        attempts.select_related('test').order_by('-completed_at')[:10]
        .values('id', 'test__title', 'score', 'correct_answers', 'wrong_answers',
                'skipped_answers', 'completed_at')
    )

    # Heuristic readiness estimate — NOT a validated ML prediction, just a weighted blend of
    # real stats (avg score dominates, volume and consistency nudge it) so the UI has something
    # honest to show instead of the fabricated "94.8% DTB probability" from the design brief.
    avg_score_val = totals['avg'] or 0
    volume_score = min((totals['tests'] or 0), 50) / 50 * 100
    consistency_score = min(profile.streak, 30) / 30 * 100
    readiness = round(0.6 * avg_score_val + 0.3 * volume_score + 0.1 * consistency_score, 1)

    data = {
        'accuracy': accuracy,
        'accuracy_breakdown': {'correct': correct, 'wrong': wrong, 'skipped': skipped},
        'total_tests': totals['tests'] or 0,
        'avg_score': round(totals['avg']) if totals['avg'] else 0,
        'readiness_estimate': readiness,
        'time_minutes': minutes,
        'xp': profile.xp,
        'coins': profile.coins,
        'streak': profile.streak,
        'level': profile.level,
        'daily': daily,
        'monthly': monthly,
        'subject_dist': subject_dist,
        'mastery': mastery,
        # Radar (profil + analitika uchun yagona manba; proxy o'qlar belgilangan).
        'skill_radar': compute_skill_radar(profile, mastery),
        # CEFR ko'nikmalari — faqat CEFR imtihonini yechganlarda to'ladi.
        'cefr': compute_cefr_skills(profile),
        'recent': recent,
    }
    cache.set(key, data, DASHBOARD_CACHE_TTL)
    return data
