"""Katta Jonli Mock imtihon boshlanganda Telegram orqali xabar yuborish xizmati.

Ushbu modul har qanday mock test uchun xoh avtomatik cron orqali, xoh boshqaruv buyrug'i
(manage.py), xoh veb-paneldagi tugma orqali ishlatilishi mumkin.
"""
import json
import logging
import time
from django.conf import settings
from django.utils import timezone

from accounts.models import Profile
from tests_app.models import TestSet
from telegrambot.client import api_call

logger = logging.getLogger(__name__)


def send_mock_announcement(test_or_id, send_all=None, dry_run=False):
    """Jonli mock test boshlangani haqida Telegram foydalanuvchilariga xabar yuboradi.

    :param test_or_id: TestSet obyekti yoki uning ID raqami.
    :param send_all: True bo'lsa barcha foydalanuvchilarga, False bo'lsa faqat eslatma
                     so'raganlarga. None berilsa, test.notify_all qiymatidan olinadi.
    :param dry_run: True bo'lsa haqiqiy xabar yuborilmaydi, faqat hisob-kitob qilinadi.
    :return: dict (natijalar statistikasi bilan)
    """
    if isinstance(test_or_id, TestSet):
        test = test_or_id
    else:
        try:
            test = TestSet.objects.get(pk=test_or_id)
        except TestSet.DoesNotExist:
            return {'ok': False, 'error': f"TestSet #{test_or_id} topilmadi."}

    if send_all is None:
        send_all = getattr(test, 'notify_all', True)

    subject_name = test.subject.name if test.subject else "Tarix"
    q_count = test.questions.count() or 45
    duration = test.duration_minutes or 90

    site_url = getattr(settings, 'NEXT_PUBLIC_SITE_URL', 'https://ilmildizi.uz').rstrip('/')
    test_link = f"{site_url}/tests/mock/{test.id}"

    # Auditoriyani aniqlash
    if send_all:
        recipients = list(
            Profile.objects.filter(telegram_id__isnull=False)
            .values_list('telegram_id', flat=True)
            .distinct()
        )
        audience_desc = "barcha bot a'zolariga"
    else:
        remind_user_ids = test.remind_users.values_list('id', flat=True)
        recipients = list(
            Profile.objects.filter(user_id__in=remind_user_ids, telegram_id__isnull=False)
            .values_list('telegram_id', flat=True)
            .distinct()
        )
        audience_desc = "eslatma so'ragan o'quvchilarga"

    message_text = (
        f"🔔 <b>DIQQAT! {subject_name} fanidan Milliy Sertifikat Katta Mock Imtihoni boshlandi!</b>\n\n"
        f"📝 <b>Savollar soni:</b> {q_count} ta\n"
        f"⏳ <b>Berilgan vaqt:</b> {duration} daqiqa\n"
        f"🎯 <b>Baholash:</b> Milliy sertifikat darajalari (A+ dan C+ gacha)\n\n"
        f"⚡️ Imtihon hozirgina boshlandi! O'z bilimingizni sinab ko'ring va milliy sertifikat darajangizni aniqlang.\n\n"
        f"👇 <b>Imtihonni topshirish uchun bosing:</b>"
    )

    reply_markup = {
        'inline_keyboard': [
            [
                {
                    'text': "🚀 Imtihonga kirish",
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
        return {
            'ok': True,
            'dry_run': True,
            'audience': audience_desc,
            'total': len(recipients),
            'sent_count': 0,
            'fail_count': 0,
            'message_preview': message_text,
        }

    sent_count = 0
    fail_count = 0

    for tg_id in recipients:
        try:
            res = api_call(
                'sendMessage',
                chat_id=tg_id,
                text=message_text,
                parse_mode='HTML',
                reply_markup=json.dumps(reply_markup),
            )
            if res and res.get('ok'):
                sent_count += 1
            else:
                fail_count += 1
        except Exception as e:
            logger.error(f"Telegram mock notification error ({tg_id}): {e}")
            fail_count += 1

        # Telegram limitlariga tushmaslik uchun ozgina oraliq
        time.sleep(0.04)

    test.notified_at = timezone.now()
    test.save(update_fields=['notified_at'])

    return {
        'ok': True,
        'dry_run': False,
        'audience': audience_desc,
        'total': len(recipients),
        'sent_count': sent_count,
        'fail_count': fail_count,
        'notified_at': test.notified_at.isoformat(),
    }
