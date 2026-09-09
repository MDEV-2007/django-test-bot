"""Django management command: Har qanday vaqti yetgan Jonli Mock imtihonlarni avtomatik aniqlab,
Telegram orqali xabar yuboruvchi cron komandasi.

Foydalanish (Cron orqali har 1 daqiqada ishga tushirish uchun):
    * * * * * cd /opt/ilmildizi && docker compose exec -T web python manage.py check_and_notify_mocks >> /var/log/mock_notify.log 2>&1
"""
import logging
from django.core.management.base import BaseCommand
from django.utils import timezone

from tests_app.models import TestSet
from telegrambot.mock_notifier import send_mock_announcement

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Vaqti yetib kelgan jonli mock imtihonlar uchun Telegram xabarnomalarini avtomatik jo'natadi."

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help="Haqiqiy xabar yubormasdan faqat navbatdagi mocklarni tekshiradi.",
        )

    def handle(self, *args, **options):
        dry_run = options.get('dry_run', False)
        now = timezone.now()

        # Oxirgi 24 soat ichida rejalashtirilgan, vaqti yetgan va hali xabar yuborilmagan jonli mocklar
        pending_mocks = list(
            TestSet.objects.filter(
                is_published=True,
                is_archived=False,
                is_live_mock=True,
                scheduled_at__lte=now,
                scheduled_at__gte=now - timezone.timedelta(hours=24),
                notified_at__isnull=True,
            ).order_by('scheduled_at')
        )

        if not pending_mocks:
            self.stdout.write(f"[{now.strftime('%Y-%m-%d %H:%M:%S')}] Xabar kutayotgan jonli mocklar yo'q.")
            return

        self.stdout.write(
            self.style.NOTICE(f"[{now.strftime('%Y-%m-%d %H:%M:%S')}] {len(pending_mocks)} ta mock imtihon boshlandi!")
        )

        for test in pending_mocks:
            self.stdout.write(f"--> Mock #{test.id}: '{test.title}' xabarnomasi yuborilmoqda...")
            res = send_mock_announcement(test, dry_run=dry_run)
            if dry_run:
                self.stdout.write(self.style.WARNING(f"    DRY RUN: {res.get('total')} ta o'quvchiga yuboriladi."))
            else:
                self.stdout.write(
                    self.style.SUCCESS(
                        f"    Yuborildi: {res.get('sent_count')} ta yetdi, {res.get('fail_count')} ta xato."
                    )
                )
