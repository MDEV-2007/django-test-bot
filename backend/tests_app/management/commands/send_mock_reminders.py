from datetime import timedelta
from django.core.cache import cache
from django.core.management.base import BaseCommand
from django.utils import timezone
from tests_app.models import TestSet
from telegrambot.mock_notifier import send_mock_reminder_15m, send_mock_announcement


class Command(BaseCommand):
    help = "15 daqiqa qolgan yoki boshlangan jonli mock imtihonlar uchun Telegram eslatmalarini yuborish"

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            default=False,
            help="Takroriy yuborishdan himoyani (cache) chetlab o'tib yuborish",
        )

    def handle(self, *args, **options):
        now = timezone.now()
        force = options.get('force', False)

        # 1. Yaqin 20 daqiqa ichida boshlanadigan mocklar (15m eslatma)
        upcoming_window = now + timedelta(minutes=20)
        upcoming_mocks = TestSet.objects.filter(
            is_live_mock=True,
            is_published=True,
            scheduled_at__isnull=False,
            scheduled_at__gt=now,
            scheduled_at__lte=upcoming_window,
        )

        for mock in upcoming_mocks:
            cache_key = f"mock_reminder_15m_sent_{mock.id}"
            if not force and cache.get(cache_key):
                self.stdout.write(f"Mock #{mock.id} uchun 15 daqiqalik eslatma allaqachon yuborilgan.")
                continue

            self.stdout.write(f"Mock #{mock.id} ('{mock.title}') uchun 15 daqiqalik eslatma yuborilmoqda...")
            res = send_mock_reminder_15m(mock)
            cache.set(cache_key, True, 60 * 60 * 4)  # 4 soatlik himoya
            self.stdout.write(self.style.SUCCESS(f"✅ Yuborildi: {res.get('sent_count', 0)}/{res.get('total', 0)} ta o'quvchiga"))

        # 2. Hozir boshlangan mocklar (Live Broadcast)
        live_window = now - timedelta(minutes=10)
        starting_mocks = TestSet.objects.filter(
            is_live_mock=True,
            is_published=True,
            scheduled_at__isnull=False,
            scheduled_at__gte=live_window,
            scheduled_at__lte=now,
            notified_at__isnull=True,
        )

        for mock in starting_mocks:
            self.stdout.write(f"Mock #{mock.id} ('{mock.title}') boshlandi! Jonli e'lon yuborilmoqda...")
            res = send_mock_announcement(mock)
            self.stdout.write(self.style.SUCCESS(f"✅ Jonli e'lon yuborildi: {res.get('sent_count', 0)} ta o'quvchiga"))
