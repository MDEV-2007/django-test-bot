"""Super admin uchun o'sish metrikalari: faollik, qaytish va monetizatsiya voronkasi.

Faqat o'quvchilar hisoblanadi (o'qituvchi va adminlar statistikani buzmasin). Qaytish
(retention) faqat faollik yozila boshlagan kundan keyin qo'shilgan kogortalar uchun
ko'rsatiladi — undan oldingi kogortalarda ma'lumot yo'q, nol emas.
"""
from datetime import timedelta

from django.db.models import Count, Q, Sum
from django.utils import timezone

from accounts.models import Profile
from premium.models import Payment

from .models import DailyActivity, ProductEvent

FUNNEL_WINDOW_DAYS = 30
COHORT_WEEKS = 6


def _students():
    return Profile.objects.filter(role='student')


def _activity():
    return DailyActivity.objects.filter(profile__role='student')


def activity_summary(today):
    act = _activity()
    series_rows = dict(
        act.filter(date__gt=today - timedelta(days=30)).values('date')
        .annotate(n=Count('id')).values_list('date', 'n')
    )
    series = [{'date': (today - timedelta(days=i)).isoformat(),
               'dau': series_rows.get(today - timedelta(days=i), 0)} for i in range(29, -1, -1)]
    return {
        'dau': act.filter(date=today).count(),
        'wau': act.filter(date__gt=today - timedelta(days=7)).values('profile').distinct().count(),
        'mau': act.filter(date__gt=today - timedelta(days=30)).values('profile').distinct().count(),
        'series': series,
    }


def retention_cohorts(today, tracking_since):
    """Haftalik kogortalar: shu haftada ro'yxatdan o'tganlarning qanchasi 1-kuni va
    7-kuni qaytib keldi. Hali 7 kun o'tmagan kogortaning D7 qiymati `None`."""
    if tracking_since is None:
        return []
    cohorts = []
    for w in range(COHORT_WEEKS - 1, -1, -1):
        start = today - timedelta(days=today.weekday() + 7 * w)
        end = start + timedelta(days=7)
        if end <= tracking_since:
            continue
        members = {
            p.id: timezone.localtime(p.created_at).date()
            for p in _students().filter(created_at__date__gte=max(start, tracking_since),
                                        created_at__date__lt=end).only('id', 'created_at')
        }
        if not members:
            cohorts.append({'week_start': start.isoformat(), 'size': 0, 'd1': None, 'd7': None})
            continue
        active = set(DailyActivity.objects.filter(profile_id__in=members.keys())
                     .values_list('profile_id', 'date'))

        def rate(offset):
            eligible = [pid for pid, joined in members.items() if joined + timedelta(days=offset) < today]
            if not eligible:
                return None
            back = sum(1 for pid in eligible if (pid, members[pid] + timedelta(days=offset)) in active)
            return round(back / len(eligible) * 100, 1)

        cohorts.append({'week_start': start.isoformat(), 'size': len(members), 'd1': rate(1), 'd7': rate(7)})
    return cohorts


def monetization_funnel(now):
    since = now - timedelta(days=FUNNEL_WINDOW_DAYS)

    def uniq_event(name):
        return (ProductEvent.objects.filter(name=name, created_at__gte=since, profile__role='student')
                .values('profile').distinct().count())

    pays = Payment.objects.filter(created_at__gte=since, profile__role='student')
    steps = [
        ('paywall_view', "Paywall ko'rdi", uniq_event('paywall_view')),
        ('premium_view', "Tariflar sahifasini ochdi", uniq_event('premium_view')),
        ('checkout_view', "To'lov sahifasini ochdi", uniq_event('checkout_view')),
        ('payment_created', "To'lovni boshladi", pays.values('profile').distinct().count()),
        ('payment_submitted', "Chek yubordi",
         pays.exclude(status='awaiting_screenshot').values('profile').distinct().count()),
        ('payment_approved', "To'lov tasdiqlandi",
         pays.filter(status='approved').values('profile').distinct().count()),
    ]
    revenue = (Payment.objects.filter(status='approved', reviewed_at__gte=since)
               .aggregate(s=Sum('amount'))['s'] or 0)
    paying_now = _students().filter(is_premium=True).filter(
        Q(premium_expires_at__isnull=True) | Q(premium_expires_at__gt=now)).count()
    return {
        'window_days': FUNNEL_WINDOW_DAYS,
        'steps': [{'key': k, 'label': label, 'users': n} for k, label, n in steps],
        'revenue': str(revenue),
        'paying_now': paying_now,
        'parent_invoices_sent': ProductEvent.objects.filter(name='parent_invoice_sent', created_at__gte=since).count(),
    }


def growth_metrics():
    now = timezone.now()
    today = timezone.localdate()
    tracking_since = DailyActivity.objects.order_by('date').values_list('date', flat=True).first()
    return {
        'generated_at': now.isoformat(),
        'tracking_since': tracking_since.isoformat() if tracking_since else None,
        'students_total': _students().count(),
        'activity': activity_summary(today),
        'retention': retention_cohorts(today, tracking_since),
        'monetization': monetization_funnel(now),
    }
