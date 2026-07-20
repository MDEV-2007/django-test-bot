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
from django.db.models import Avg, Count, F, Q, Sum
from django.db.models.functions import TruncDate
from django.utils import timezone

from tests_app.models import Attempt, AttemptAnswer

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


def dashboard_data(profile, use_cache=True):
    """Everything the Analytics Dashboard renders. Cached per profile."""
    key = DASHBOARD_CACHE_KEY.format(pid=profile.pk)
    if use_cache:
        cached = cache.get(key)
        if cached is not None:
            return cached

    answers = _answer_qs(profile)
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
    daily = []
    for i in range(14):
        d = since_14 + timedelta(days=i)
        row = daily_rows.get(d)
        daily.append({'date': d.strftime('%d.%m'), 'count': row['count'] if row else 0,
                      'avg': round(row['avg']) if row and row['avg'] else 0})

    # --- Weekly progress, last 8 weeks (line: tests + avg score + cumulative XP) ---
    since_56 = today - timedelta(days=55)
    week_attempts = list(
        attempts.filter(completed_at__date__gte=since_56)
        .values('completed_at', 'correct_answers', 'score')
        .order_by('completed_at')
    )
    weekly_map = {}
    for a in week_attempts:
        wk = a['completed_at'].date().isocalendar()
        label = f"{wk[0]}-W{wk[1]:02d}"
        b = weekly_map.setdefault(label, {'tests': 0, 'score_sum': 0, 'xp': 0})
        b['tests'] += 1
        b['score_sum'] += a['score'] or 0
        b['xp'] += (a['correct_answers'] or 0) * 50  # mirror finish() XP formula
    weekly_labels = sorted(weekly_map.keys())
    cum = 0
    weekly = []
    for label in weekly_labels:
        b = weekly_map[label]
        cum += b['xp']
        weekly.append({'label': label, 'tests': b['tests'],
                       'avg': round(b['score_sum'] / b['tests']) if b['tests'] else 0,
                       'cum_xp': cum})

    # --- Subject distribution (doughnut) — reuse mastery subjects ---
    mastery = compute_mastery(profile)
    subject_dist = [{'name': s['name'], 'value': s['answered'], 'color': s['color']}
                    for s in mastery['subjects']]

    # --- Time spent (minutes) ---
    time_rows = attempts.exclude(completed_at__isnull=True).values('started_at', 'completed_at')
    total_seconds = sum((r['completed_at'] - r['started_at']).total_seconds()
                        for r in time_rows if r['completed_at'] and r['started_at'])
    minutes = int(total_seconds // 60)

    # --- Recent test history (table) ---
    recent = list(
        attempts.select_related('test').order_by('-completed_at')[:10]
        .values('id', 'test__title', 'score', 'correct_answers', 'wrong_answers',
                'skipped_answers', 'completed_at')
    )

    data = {
        'accuracy': accuracy,
        'accuracy_breakdown': {'correct': correct, 'wrong': wrong, 'skipped': skipped},
        'total_tests': totals['tests'] or 0,
        'avg_score': round(totals['avg']) if totals['avg'] else 0,
        'time_minutes': minutes,
        'xp': profile.xp,
        'coins': profile.coins,
        'streak': profile.streak,
        'level': profile.level,
        'daily': daily,
        'weekly': weekly,
        'subject_dist': subject_dist,
        'mastery': mastery,
        'recent': recent,
    }
    cache.set(key, data, DASHBOARD_CACHE_TTL)
    return data
