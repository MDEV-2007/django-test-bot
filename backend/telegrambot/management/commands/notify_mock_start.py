"""Django management command: Katta mock imtihon boshlanganda o'quvchilarga Telegram orqali xabar yuborish.

Foydalanish:
    python manage.py notify_mock_start <test_id>
    python manage.py notify_mock_start <test_id> --all
    python manage.py notify_mock_start <test_id> --dry-run
"""
import json
import logging
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.conf import settings

from accounts.models import Profile
from tests_app.models import TestSet
from telegrambot.client import api_call

logger = logging.getLogger(__name__)


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
            '--dry-run',
            action='store_true',
            help="Xabarlarni yubormasdan faqat qabul qiluvchilar soni va matnini tekshiradi.",
        )

    def handle(self, *args, **options):
        test_id = options.get('test_id')
        send_all = options.get('all', False)
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

        subject_name = test.subject.name if test.subject else "Tarix"
        q_count = test.questions.count() or 45
        duration = test.duration_minutes or 90

        site_url = getattr(settings, 'NEXT_PUBLIC_SITE_URL', 'https://ilmildizi.uz')
        test_link = f"{site_url}/tests/mock/{test.id}"

        # Qabul qiluvchilarni aniqlash
        if send_all:
            recipients = list(
                Profile.objects.filter(telegram_id__isnull=False)
                .select_related('user')
            )
            mode_desc = "BARCHA o'quvchilarga"
        else:
            remind_user_ids = test.remind_users.values_list('id', flat=True)
            recipients = list(
                Profile.objects.filter(user_id__in=remind_user_ids, telegram_id__isnull=False)
                .select_related('user')
            )
            mode_desc = "Eslatma so'ragan o'quvchilarga"

        self.stdout.write(f"Mock imtihon: '{test.title}' (#{test.id})")
        self.stdout.write(f"Auditoriya: {mode_desc} (Jami: {len(recipients)} ta foydalanuvchi)")

        message_text = (
            f"🔔 <b>DIQQAT! {subject_name} fanidan Katta Mock Imtihon boshlandi!</b>\n\n"
            f"📝 <b>Savollar soni:</b> {q_count} ta\n"
            f"⏳ <b>Ajratilgan vaqt:</b> {duration} daqiqa\n"
            f"🎯 <b>Format:</b> Milliy Sertifikat (A+, A, B+, B, C+)\n\n"
            f"⚡️ Imtihon hozirgina boshlandi! Barcha ishtirokchilar bir vaqtda topshirmoqda. O'z bilimingizni sinab ko'ring va rasmiy darajangizni oling!\n\n"
            f"👇 <b>Imtihonga kirish uchun quyidagi tugmani bosing:</b>"
        )

        reply_markup = {
            'inline_keyboard': [
                [
                    {
                        'text': "🚀 Imtihonni boshlash",
                        'web_app': {'url': test_link},
                    }
                ],
                [
                    {
                        'text': "🌐 Brauzerda ochish",
                        'url': test_link,
                    }
                ]
            ]
        }

        if dry_run:
            self.stdout.write(self.style.WARNING("DRY RUN: Xabarlar yuborilmadi. Xabar matni:"))
            self.stdout.write(message_text)
            return

        sent_count = 0
        fail_count = 0

        for profile in recipients:
            try:
                res = api_call(
                    'sendMessage',
                    chat_id=profile.telegram_id,
                    text=message_text,
                    parse_mode='HTML',
                    reply_markup=json.dumps(reply_markup),
                )
                if res.get('ok'):
                    sent_count += 1
                else:
                    fail_count += 1
            except Exception as e:
                logger.error(f"Telegram yuborishda xatolik ({profile.telegram_id}): {e}")
                fail_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Tugallandi: {sent_count} ta muvaffaqiyatli jo'natildi, {fail_count} ta yetib bormadi."
            )
        )
