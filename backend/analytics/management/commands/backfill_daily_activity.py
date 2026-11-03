"""Faollik tarixini mavjud ma'lumotlardan tiklash (DAU/retention darhol ko'rinishi uchun).

`DailyActivity` faqat yangi kirishlarni yozadi. Bu buyruq o'tmishdagi faollikni
ro'yxatdan o'tish, test urinishlari, kunlik sikllar, hamjamiyat postlari va to'lovlardan
yig'adi. Qayta ishga tushirish xavfsiz: mavjud qatorlar o'tkazib yuboriladi.

    python manage.py backfill_daily_activity            # hammasi
    python manage.py backfill_daily_activity --days 90  # faqat so'nggi 90 kun
"""
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.db.models.functions import TruncDate
from django.utils import timezone

from accounts.models import Profile
from analytics.models import DailyActivity

BATCH = 2000


class Command(BaseCommand):
    help = "Mavjud ma'lumotlardan DailyActivity tarixini tiklaydi."

    def add_arguments(self, parser):
        parser.add_argument('--days', type=int, default=0, help="Faqat so'nggi N kun (0 = hammasi)")

    def handle(self, *args, **opts):
        from learning.models import CommunityPost
        from learning_loop.models import DailyLearningLoop
        from premium.models import Payment
        from tests_app.models import Attempt

        since = timezone.now() - timedelta(days=opts['days']) if opts['days'] else None
        user_to_profile = dict(Profile.objects.values_list('user_id', 'id'))

        def dated(qs, field, profile_field):
            if since is not None:
                qs = qs.filter(**{f'{field}__gte': since})
            return qs.annotate(d=TruncDate(field)).values_list(profile_field, 'd').distinct()

        sources = {
            "ro'yxatdan o'tish": dated(Profile.objects.all(), 'created_at', 'id'),
            'test boshlash': dated(Attempt.objects.all(), 'started_at', 'profile_id'),
            'test tugatish': dated(Attempt.objects.filter(completed_at__isnull=False), 'completed_at', 'profile_id'),
            'hamjamiyat posti': (
                (user_to_profile.get(uid), d)
                for uid, d in dated(CommunityPost.objects.all(), 'created_at', 'author_id')),
            "to'lov": dated(Payment.objects.all(), 'created_at', 'profile_id'),
        }
        loops = DailyLearningLoop.objects.all()
        if since is not None:
            loops = loops.filter(date__gte=since.date())
        sources['kunlik sikl'] = (
            (user_to_profile.get(uid), d) for uid, d in loops.values_list('user_id', 'date').distinct())

        before = DailyActivity.objects.count()
        pairs = set()
        for label, rows in sources.items():
            n = 0
            for pid, d in rows:
                if pid and d:
                    pairs.add((pid, d))
                    n += 1
            self.stdout.write(f'  {label}: {n}')

        objs = [DailyActivity(profile_id=pid, date=d) for pid, d in pairs]
        for i in range(0, len(objs), BATCH):
            DailyActivity.objects.bulk_create(objs[i:i + BATCH], ignore_conflicts=True)

        added = DailyActivity.objects.count() - before
        self.stdout.write(self.style.SUCCESS(f"Yangi faollik qatorlari: {added} (jami {before + added})"))
