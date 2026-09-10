from datetime import datetime
from zoneinfo import ZoneInfo
from django.core.management.base import BaseCommand
from django.utils import timezone
from tests_app.models import TestSet


class Command(BaseCommand):
    help = "Jonli mock testining boshlanish vaqtini (scheduled_at) Toshkent vaqti bilan to'g'rilash"

    def add_arguments(self, parser):
        parser.add_argument(
            '--id',
            type=int,
            default=None,
            help="TestSet ID (berilmasa oxirgi jonli mock olinadi)",
        )
        parser.add_argument(
            '--time',
            type=str,
            default='21:30',
            help="Boshlanish vaqti HH:MM (masalan: 21:30)",
        )
        parser.add_argument(
            '--today',
            action='store_true',
            default=True,
            help="Bugungi kunga belgilash (sukut bo'yicha True)",
        )

    def handle(self, *args, **options):
        test_id = options.get('id')
        time_str = options.get('time')
        
        if test_id:
            test = TestSet.objects.filter(id=test_id).first()
        else:
            test = TestSet.objects.filter(is_live_mock=True).order_by('-id').first()

        if not test:
            self.stdout.write(self.style.ERROR("Jonli mock testi topilmadi!"))
            return

        toshkent_tz = ZoneInfo("Asia/Tashkent")
        now_local = timezone.now().astimezone(toshkent_tz)
        hour, minute = [int(p) for p in time_str.split(':')]

        new_scheduled = datetime(
            now_local.year, now_local.month, now_local.day,
            hour, minute, 0,
            tzinfo=toshkent_tz
        )

        test.scheduled_at = new_scheduled
        test.is_live_mock = True
        test.is_published = True
        test.save(update_fields=['scheduled_at', 'is_live_mock', 'is_published'])

        self.stdout.write(
            self.style.SUCCESS(
                f"✅ Mock #{test.id} ('{test.title}') vaqti muvaffaqiyatli yangilandi!\n"
                f"   Toshkent vaqti: {new_scheduled.strftime('%Y-%m-%d %H:%M:%S %Z')}\n"
                f"   UTC saqlangan:  {test.scheduled_at.astimezone(ZoneInfo('UTC')).strftime('%Y-%m-%d %H:%M:%S UTC')}"
            )
        )
