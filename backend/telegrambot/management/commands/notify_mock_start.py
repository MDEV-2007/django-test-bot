"""Django management command: Katta mock imtihon boshlanganda o'quvchilarga Telegram orqali xabar yuborish.

Foydalanish:
    python manage.py notify_mock_start <test_id>
    python manage.py notify_mock_start <test_id> --all
    python manage.py notify_mock_start <test_id> --dry-run
"""
from django.core.management.base import BaseCommand
from django.utils import timezone

from tests_app.models import TestSet
from telegrambot.mock_notifier import send_mock_announcement


class Command(BaseCommand):
    help = "Jonli Mock imtihon boshlanganda o'quvchilarga Telegram orqali eslatma/xabar jo'natadi."

    def add_arguments(self, parser):
        parser.add_argument(
            'test_id',
            type=int,
            nargs='?',
            help="Boshlangan TestSet ID raqami. Berilmasa, eng yaqin jonli mock avtomatik topiladi.",
        )
        parser.add_argument(
            '--all',
            action='store_true',
            help="Faqat eslatish so'raganlarga emas, platformadagi barcha Telegram foydalanuvchilariga ommaviy yuborish.",
        )
        parser.add_argument(
            '--remind-only',
            action='store_true',
            help="Faqat eslatma so'ragan (ro'yxatdan o'tgan) foydalanuvchilarga yuborish.",
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help="Xabarlarni yubormasdan faqat qabul qiluvchilar soni va matnini tekshiradi.",
        )

    def handle(self, *args, **options):
        test_id = options.get('test_id')
        send_all_opt = options.get('all', False)
        remind_only_opt = options.get('remind_only', False)
        dry_run = options.get('dry_run', False)

        if test_id:
            try:
                test = TestSet.objects.get(pk=test_id)
            except TestSet.DoesNotExist:
                self.stderr.write(self.style.ERROR(f"TestSet #{test_id} topilmadi."))
                return
        else:
            # Eng yaqin live mockni qidiramiz
            now = timezone.now()
            test = (
                TestSet.objects.filter(is_published=True, is_live_mock=True)
                .order_by('-scheduled_at')
                .first()
            )
            if not test:
                self.stderr.write(self.style.ERROR("Jonli mock test topilmadi."))
                return

        send_all = None
        if send_all_opt:
            send_all = True
        elif remind_only_opt:
            send_all = False

        self.stdout.write(f"Mock imtihon: '{test.title}' (#{test.id})")

        res = send_mock_announcement(test, send_all=send_all, dry_run=dry_run)

        if dry_run:
            self.stdout.write(self.style.WARNING("DRY RUN (Xabarlar yuborilmadi):"))
            self.stdout.write(f"Auditoriya: {res.get('audience')} (Jami: {res.get('total')} ta foydalanuvchi)")
            self.stdout.write("--- Xabar matni ---")
            self.stdout.write(res.get('message_preview', ''))
            return

        self.stdout.write(
            self.style.SUCCESS(
                f"Tugallandi ({res.get('audience')}): {res.get('sent_count')} ta muvaffaqiyatli jo'natildi, {res.get('fail_count')} ta yetib bormadi."
            )
        )
