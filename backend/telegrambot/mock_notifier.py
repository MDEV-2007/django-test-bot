"""Katta Jonli Mock imtihon boshlanganda Telegram orqali xabar yuborish xizmati.

Ushbu modul har qanday mock test uchun xoh avtomatik cron orqali, xoh boshqaruv buyrug'i
(manage.py), xoh veb-paneldagi tugma orqali ishlatilishi mumkin.
"""
import json
import logging
import time
from django.conf import settings
from django.core.cache import cache
from django.db import transaction
from django.utils import timezone

from accounts.models import Profile
from tests_app.models import TestSet, MockRegistration
from telegrambot.client import api_call

logger = logging.getLogger(__name__)


def _valid_tg_profiles_qs():
    return (
        Profile.objects
        .filter(telegram_id__isnull=False)
        .exclude(telegram_id='')
        .exclude(telegram_id='0')
    )


def send_mock_announcement(test_or_id, send_all=None, dry_run=False, force=False):
    """Jonli mock test boshlangani haqida Telegram foydalanuvchilariga xabar yuboradi.

    Atomik deduplikatsiya:
    - Parallel worker yoki takroriy cron chaqiruvi bir xil test uchun ikki marta xabar yubormaydi.
    - `dry_run=True` bo'lganda `notified_at` o'zgarmaydi.
    - Pullik mockda to'lovi tasdiqlangan ishtirokchilarga "Ishtirokingiz tasdiqlangan — Imtihonga kirish",
      to'lov qilmaganlarga esa narx ko'rsatilgan holda "Ro'yxatdan o'tish va qatnashish" xabari yuboriladi.
    """
    if isinstance(test_or_id, TestSet):
        test_id = test_or_id.pk
    else:
        test_id = test_or_id

    try:
        test = TestSet.objects.select_related('subject').get(pk=test_id)
    except TestSet.DoesNotExist:
        return {'ok': False, 'error': f"TestSet #{test_id} topilmadi."}

    lock_key = f"mock_announce_lock:{test.id}"
    if not dry_run and not force:
        if test.notified_at is not None:
            return {
                'ok': True,
                'skipped': True,
                'reason': 'already_notified',
                'total': 0,
                'sent_count': 0,
                'fail_count': 0,
                'notified_at': test.notified_at.isoformat(),
            }
        if not cache.add(lock_key, '1', timeout=300):
            return {
                'ok': True,
                'skipped': True,
                'reason': 'in_progress',
                'total': 0,
                'sent_count': 0,
                'fail_count': 0,
            }

    try:
        if not dry_run and not force:
            with transaction.atomic():
                locked = TestSet.objects.select_for_update().filter(pk=test.id).first()
                if not locked or locked.notified_at is not None:
                    return {
                        'ok': True,
                        'skipped': True,
                        'reason': 'already_notified',
                        'total': 0,
                        'sent_count': 0,
                        'fail_count': 0,
                    }

        if send_all is None:
            send_all = getattr(test, 'notify_all', True)

        subject_name = test.subject.name if test.subject else "Tarix"
        q_count = test.questions.count() or 45
        duration = test.duration_minutes or 90
        is_paid_mock = bool(test.is_premium and (test.price is None or float(test.price) > 0))
        price_val = int(float(test.price)) if test.price is not None else 0

        site_url = getattr(settings, 'NEXT_PUBLIC_SITE_URL', 'https://ilmildizi.uz').rstrip('/')
        test_link = f"{site_url}/tests/mock/{test.id}"

        base_tg_profiles = _valid_tg_profiles_qs()
        confirmed_profile_ids = set(
            MockRegistration.objects
            .filter(test=test, status='CONFIRMED')
            .values_list('profile_id', flat=True)
        )
        if is_paid_mock:
            from premium.models import Payment
            paid_profile_ids = set(
                Payment.objects
                .filter(test=test, status='approved')
                .values_list('profile_id', flat=True)
            )
            confirmed_profile_ids |= paid_profile_ids
        else:
            remind_uids = set(test.remind_users.values_list('id', flat=True))
            confirmed_profile_ids |= set(
                base_tg_profiles.filter(user_id__in=remind_uids).values_list('id', flat=True)
            )

        confirmed_tg_ids = list(
            base_tg_profiles
            .filter(id__in=confirmed_profile_ids)
            .values_list('telegram_id', flat=True)
            .distinct()
        )
        confirmed_tg_set = set(confirmed_tg_ids)

        if send_all:
            all_tg_ids = list(base_tg_profiles.values_list('telegram_id', flat=True).distinct())
            general_tg_ids = [tg for tg in all_tg_ids if tg not in confirmed_tg_set]
            audience_desc = "barcha bot a'zolariga"
        else:
            remind_user_ids = list(test.remind_users.values_list('id', flat=True))
            remind_tg_ids = list(
                base_tg_profiles
                .filter(user_id__in=remind_user_ids)
                .values_list('telegram_id', flat=True)
                .distinct()
            )
            general_tg_ids = [tg for tg in remind_tg_ids if tg not in confirmed_tg_set]
            audience_desc = "ro'yxatdan o'tgan va eslatma so'ragan o'quvchilarga"

        confirmed_message = (
            f"🔔 <b>DIQQAT! {subject_name} fanidan Respublika Mock Imtihoni boshlandi!</b>\n\n"
            f"✅ <b>Sizning ishtirokingiz tasdiqlangan!</b>\n"
            f"📝 <b>Savollar soni:</b> {q_count} ta\n"
            f"⏳ <b>Berilgan vaqt:</b> {duration} daqiqa\n"
            f"🎯 <b>Baholash:</b> Rasmiy reyting va sertifikat darajalari\n\n"
            f"⚡️ Imtihon hozirgina boshlandi! Quyidagi tugma orqali darhol imtihonga kiring:"
        )

        if is_paid_mock:
            price_str = f"{price_val:,}".replace(",", " ") if price_val else "PRO"
            general_message = (
                f"🔔 <b>{subject_name} fanidan Katta Respublika Mock Imtihoni boshlandi!</b>\n\n"
                f"📝 <b>Savollar soni:</b> {q_count} ta\n"
                f"⏳ <b>Berilgan vaqt:</b> {duration} daqiqa\n"
                f"💳 <b>Qatnashish narxi:</b> {price_str} so'm\n\n"
                f"⚡️ Imtihonda qatnashish uchun ro'yxatdan o'ting va to'lovni tasdiqlang:"
            )
        else:
            general_message = (
                f"🔔 <b>DIQQAT! {subject_name} fanidan Milliy Sertifikat Katta Mock Imtihoni boshlandi!</b>\n\n"
                f"📝 <b>Savollar soni:</b> {q_count} ta\n"
                f"⏳ <b>Berilgan vaqt:</b> {duration} daqiqa\n"
                f"🎯 <b>Baholash:</b> Milliy sertifikat darajalari (A+ dan C+ gacha)\n\n"
                f"⚡️ Imtihon hozirgina boshlandi! O'z bilimingizni sinab ko'ring.\n\n"
                f"👇 <b>Imtihonni topshirish uchun bosing:</b>"
            )

        confirmed_markup = {
            'inline_keyboard': [
                [{'text': "🚀 Imtihonga kirish", 'web_app': {'url': test_link}}],
                [{'text': "🌐 Brauzerda ochish", 'url': test_link}],
            ]
        }
        general_markup = {
            'inline_keyboard': [
                [{'text': "📝 Ro'yxatdan o'tish va kirish" if is_paid_mock else "🚀 Imtihonga kirish", 'web_app': {'url': test_link}}],
                [{'text': "🌐 Brauzerda ochish", 'url': test_link}],
            ]
        }

        total_recipients = len(confirmed_tg_ids) + len(general_tg_ids)
        if dry_run:
            return {
                'ok': True,
                'dry_run': True,
                'audience': audience_desc,
                'total': total_recipients,
                'confirmed_count': len(confirmed_tg_ids),
                'general_count': len(general_tg_ids),
                'sent_count': 0,
                'fail_count': 0,
                'message_preview': confirmed_message if confirmed_tg_ids else general_message,
            }

        sent_count = 0
        fail_count = 0

        for tg_id in confirmed_tg_ids:
            try:
                res = api_call(
                    'sendMessage',
                    chat_id=tg_id,
                    text=confirmed_message,
                    parse_mode='HTML',
                    reply_markup=json.dumps(confirmed_markup),
                )
                if res and res.get('ok'):
                    sent_count += 1
                else:
                    fail_count += 1
            except Exception as e:
                logger.error("Telegram mock confirmed notification error (%s): %s", tg_id, e)
                fail_count += 1
            time.sleep(0.04)

        for tg_id in general_tg_ids:
            try:
                res = api_call(
                    'sendMessage',
                    chat_id=tg_id,
                    text=general_message,
                    parse_mode='HTML',
                    reply_markup=json.dumps(general_markup),
                )
                if res and res.get('ok'):
                    sent_count += 1
                else:
                    fail_count += 1
            except Exception as e:
                logger.error("Telegram mock general notification error (%s): %s", tg_id, e)
                fail_count += 1
            time.sleep(0.04)

        # Faqat xabarlar haqiqatan yuborilganda yoki qabul qiluvchilar bo'sh bo'lganda notified_at yoziladi
        if total_recipients == 0 or sent_count > 0:
            now_ts = timezone.now()
            TestSet.objects.filter(pk=test.id).update(notified_at=now_ts)
            test.notified_at = now_ts

        return {
            'ok': True,
            'dry_run': False,
            'audience': audience_desc,
            'total': total_recipients,
            'confirmed_count': len(confirmed_tg_ids),
            'general_count': len(general_tg_ids),
            'sent_count': sent_count,
            'fail_count': fail_count,
            'notified_at': test.notified_at.isoformat() if test.notified_at else None,
        }
    finally:
        if not dry_run and not force:
            cache.delete(lock_key)


def send_mock_reminder_15m(test_or_id, dry_run=False, force=False):
    """Jonli mock test boshlanishiga 15 daqiqa qolganida eslatma so'ragan va ro'yxatdan o'tganlarga xabar yuboradi."""
    if isinstance(test_or_id, TestSet):
        test_id = test_or_id.pk
    else:
        test_id = test_or_id

    try:
        test = TestSet.objects.select_related('subject').get(pk=test_id)
    except TestSet.DoesNotExist:
        return {'ok': False, 'error': f"TestSet #{test_id} topilmadi."}

    lock_key = f"mock_remind15m_lock:{test.id}"
    if not dry_run and not force:
        if getattr(test, 'reminder_15m_sent_at', None) is not None:
            return {'ok': True, 'skipped': True, 'reason': 'already_reminded', 'total': 0, 'sent_count': 0}
        if not cache.add(lock_key, '1', timeout=300):
            return {'ok': True, 'skipped': True, 'reason': 'in_progress', 'total': 0, 'sent_count': 0}

    try:
        subject_name = test.subject.name if test.subject else "Tarix"
        duration = test.duration_minutes or 90
        site_url = getattr(settings, 'NEXT_PUBLIC_SITE_URL', 'https://ilmildizi.uz').rstrip('/')
        test_link = f"{site_url}/tests/mock/{test.id}"

        remind_user_ids = set(test.remind_users.values_list('id', flat=True))
        confirmed_user_ids = set(
            MockRegistration.objects
            .filter(test=test, status='CONFIRMED')
            .values_list('profile__user_id', flat=True)
        )
        target_user_ids = remind_user_ids | confirmed_user_ids

        recipients = list(
            _valid_tg_profiles_qs()
            .filter(user_id__in=target_user_ids)
            .values_list('telegram_id', flat=True)
            .distinct()
        )

        if dry_run:
            return {'ok': True, 'dry_run': True, 'total': len(recipients), 'sent_count': 0, 'fail_count': 0}

        if not recipients:
            now_ts = timezone.now()
            TestSet.objects.filter(pk=test.id).update(reminder_15m_sent_at=now_ts)
            test.reminder_15m_sent_at = now_ts
            return {'ok': True, 'total': 0, 'sent_count': 0, 'fail_count': 0}

        message_text = (
            f"⏳ <b>Eslatma! {subject_name} fanidan Jonli Mock Imtihoni 15 daqiqadan so'ng boshlanadi!</b>\n\n"
            f"📝 <b>Imtihon davomiyligi:</b> {duration} daqiqa\n"
            f"💡 Qoralama qog'oz, ruchka tayyorlang va internetingizni tekshiring.\n\n"
            f"👇 <b>Kutish zaliga hoziroq ulaning:</b>"
        )

        reply_markup = {
            'inline_keyboard': [
                [{'text': "🚪 Kutish zaliga kirish", 'web_app': {'url': test_link}}],
                [{'text': "🌐 Brauzerda ochish", 'url': test_link}],
            ]
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
                logger.error("Telegram reminder error (%s): %s", tg_id, e)
                fail_count += 1
            time.sleep(0.04)

        if sent_count > 0:
            now_ts = timezone.now()
            TestSet.objects.filter(pk=test.id).update(reminder_15m_sent_at=now_ts)
            test.reminder_15m_sent_at = now_ts

        return {'ok': True, 'total': len(recipients), 'sent_count': sent_count, 'fail_count': fail_count}
    finally:
        if not dry_run and not force:
            cache.delete(lock_key)
