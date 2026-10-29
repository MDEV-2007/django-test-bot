"""Avtomatlashtirilgan to'lov cheki tahlili va tasdiqlash tizimi.

O'quvchi saytda, Telegram Mini App'da yoki botda to'lov cheki (skrinshot) yuklaganda, bu modul:
1. To'lov cheki rasmini yashirin Telegram kanaliga (-1004317888253) inline tugmalar bilan yuboradi.
2. Admin kanalda "✅ Qabul qilish" tugmasini bosganda:
   - Payment holatini 'approved' qiladi
   - apply_to_profile() chaqirilib, o'sha o'quvchiga PRO obuna yoki sotib olingan mock test ochiladi
   - O'quvchiga bot orqali tasdiqlanganlik haqida xabar yuboriladi
   - Kanaldagi post "✅ TASDIQLANDI" deb yangilanadi
3. "❌ Rad etish" bosilganda rad etiladi.
"""
import html
import logging
import os
from django.conf import settings
from django.utils import timezone
from .client import (
    send_photo,
    send_message,
    edit_message_caption,
    edit_message_text,
    answer_callback,
)

logger = logging.getLogger(__name__)

DEFAULT_PAYMENT_CHANNEL_ID = '-1004317888253'


def get_payment_channel_ids():
    """To'lov cheklari yuboriladigan kanal ID larini aniqlash.
    Har doim asosiy to'lov kanali (-1004317888253) ro'yxatda bo'lishini kafolatlaydi.
    """
    targets = [DEFAULT_PAYMENT_CHANNEL_ID]
    raw = getattr(settings, 'PAYMENT_CHANNEL_ID', '') or ''
    cid = str(raw).strip()
    if cid and cid.lstrip('-').isdigit() and cid not in targets:
        targets.insert(0, cid)
    return targets


def get_payment_channel_id():
    """Asosiy to'lov kanali ID si."""
    return get_payment_channel_ids()[0]


def update_channel_message(chat_id, message_id, text, reply_markup=None):
    """Xabar rasm bo'lsa caption ni, matn bo'lsa text ni yangilaydi."""
    res = edit_message_caption(chat_id, message_id, text, reply_markup=reply_markup)
    if not res.get('ok'):
        res = edit_message_text(chat_id, message_id, text, reply_markup=reply_markup)
    return res


def _read_screenshot_bytes(payment):
    """Skrinshot faylidan baytlarni xavfsiz o'qib olish."""
    if not payment.screenshot:
        return None
    try:
        if hasattr(payment.screenshot, 'path'):
            file_path = payment.screenshot.path
            if file_path and os.path.exists(file_path):
                with open(file_path, 'rb') as f:
                    data = f.read()
                if data:
                    return data
    except Exception:
        pass

    try:
        payment.screenshot.open('rb')
        if hasattr(payment.screenshot, 'seek'):
            payment.screenshot.seek(0)
        data = payment.screenshot.read()
        if hasattr(payment.screenshot, 'seek'):
            payment.screenshot.seek(0)
        if data:
            return data
    except Exception as exc:
        logger.warning("Skrinshot faylini o'qishda xatolik (payment_id=%s): %s", payment.id, exc)
    return None


def send_payment_review_notification(payment):
    """To'lov chekini yashirin Telegram kanaliga inline tasdiqlash tugmalari bilan yuborish."""
    try:
        channel_ids = get_payment_channel_ids()
        logger.info(
            "send_payment_review_notification boshlandi: payment_id=%s, channels=%s",
            payment.id, channel_ids,
        )

        profile = payment.profile
        user = profile.user
        raw_full_name = f"{user.first_name} {user.last_name}".strip() or user.username or f"User#{user.id}"
        full_name = html.escape(raw_full_name)
        username = html.escape(getattr(user, 'username', '') or '')
        tg_username = getattr(profile, 'telegram_username', None)
        tg_id = getattr(profile, 'telegram_id', None)
        if tg_username:
            tg_user_str = f"@{html.escape(str(tg_username))}"
        elif tg_id:
            tg_user_str = f"ID: <code>{html.escape(str(tg_id))}</code>"
        else:
            tg_user_str = "Bog'lanmagan"

        email_str = html.escape(getattr(user, 'email', '') or "Kiritilmagan")

        is_course_or_pro = bool(payment.plan and payment.plan.plan_type == 'lessons' and not payment.test_id)
        raw_title = (
            payment.test.title
            if payment.test
            else (payment.plan.name if payment.plan else "PRO Kurs / Mock Test")
        )
        item_title = html.escape(str(raw_title))
        item_type_label = "Kurs / PRO Obuna" if is_course_or_pro else "Mock Test / Tarif"

        amount_str = f"{payment.amount:,.0f}".replace(",", " ")
        source_str = "Veb-sayt / Mini App" if payment.source == 'web' else "Telegram Bot"
        created_time = timezone.localtime(payment.created_at).strftime("%Y-%m-%d %H:%M")

        caption = (
            f"🧾 <b>YANGI TO'LOV CHEKI #{payment.id}</b>\n\n"
            f"👤 <b>O'quvchi:</b> {full_name} (@{username})\n"
            f"💬 <b>Telegram:</b> {tg_user_str}\n"
            f"📧 <b>Email / ID:</b> {email_str} (Profil ID: {profile.id})\n"
            f"🎯 <b>{item_type_label}:</b> {item_title}\n"
            f"💰 <b>To'lov summasi:</b> <b>{amount_str} so'm</b>\n"
            f"🌐 <b>Manba:</b> {source_str}\n"
            f"⏰ <b>Vaqt:</b> {created_time}\n\n"
            f"<i>Tasdiqlash yoki rad etish uchun quyidagi tugmani bosing:</i>"
        )

        approve_btn_text = "✅ Qabul qilish (Obunani ochish)" if is_course_or_pro else "✅ Qabul qilish (Testni ochish)"
        reply_markup = {
            'inline_keyboard': [
                [
                    {'text': approve_btn_text, 'callback_data': f"pay_approve_{payment.id}"},
                    {'text': "❌ Rad etish", 'callback_data': f"pay_reject_{payment.id}"},
                ]
            ]
        }

        photo_bytes = _read_screenshot_bytes(payment)
        any_sent = False

        for channel_id in channel_ids:
            res = {'ok': False}
            if photo_bytes:
                try:
                    res = send_photo(
                        channel_id,
                        photo_bytes,
                        caption=caption,
                        reply_markup=reply_markup,
                    )
                except Exception as photo_err:
                    logger.warning("send_photo xatosi (channel=%s): %s", channel_id, photo_err)

            if not res.get('ok'):
                logger.info(
                    "Rasm yuborilmadi yoki xato berdi (channel=%s), send_message orqali yuborilmoqda...",
                    channel_id,
                )
                res = send_message(channel_id, caption, reply_markup=reply_markup)

            if res.get('ok'):
                any_sent = True
                logger.info(
                    "To'lov xabari kanalga muvaffaqiyatli yuborildi: payment_id=%s, channel=%s",
                    payment.id, channel_id,
                )
            else:
                logger.warning(
                    "To'lov xabarini Telegram kanalga yuborishda xatolik (channel=%s): %s",
                    channel_id, res,
                )

        return any_sent
    except Exception:
        logger.exception("send_payment_review_notification da kutilmagan xatolik yuz berdi")
        return False


def handle_payment_callback(chat_id, message_id, callback_query_id, admin_user, callback_data):
    """Admin kanalida 'Qabul qilish' yoki 'Rad etish' tugmasi bosilganda ishlaydi."""
    from premium.models import Payment

    parts = callback_data.split('_')
    if len(parts) < 3:
        answer_callback(callback_query_id, "Xato buyruq.")
        return

    action_type = parts[1]  # "approve" yoki "reject"
    try:
        payment_id = int(parts[2])
    except ValueError:
        answer_callback(callback_query_id, "Noto'g'ri to'lov ID.")
        return

    try:
        payment = Payment.objects.select_related('profile', 'profile__user', 'plan', 'test').get(id=payment_id)
    except Payment.DoesNotExist:
        answer_callback(callback_query_id, "To'lov bazadan topilmadi!")
        return

    admin_username = admin_user.get('username')
    raw_admin_name = f"@{admin_username}" if admin_username else (admin_user.get('first_name') or 'Admin')
    admin_name = html.escape(str(raw_admin_name))

    if payment.status == 'approved':
        answer_callback(callback_query_id, "⚠️ Bu to'lov allaqachon tasdiqlangan!")
        return
    elif payment.status == 'rejected':
        answer_callback(callback_query_id, "⚠️ Bu to'lov allaqachon rad etilgan!")
        return

    is_course_or_pro = bool(payment.plan and payment.plan.plan_type == 'lessons' and not payment.test_id)
    raw_test_title = (
        payment.test.title
        if payment.test
        else (payment.plan.name if payment.plan else "PRO Kurs / Mock Test")
    )
    test_title = html.escape(str(raw_test_title))
    amount_str = f"{payment.amount:,.0f}".replace(",", " ")
    raw_user_name = (
        f"{payment.profile.user.first_name} {payment.profile.user.last_name}".strip()
        or payment.profile.user.username
    )
    user_full_name = html.escape(str(raw_user_name))
    now_time = timezone.localtime(timezone.now()).strftime("%Y-%m-%d %H:%M")

    if action_type == 'approve':
        payment.status = 'approved'
        payment.reviewed_at = timezone.now()
        payment.admin_note = f"Telegram kanalida {raw_admin_name} tomonidan tasdiqlandi."
        payment.apply_to_profile()
        payment.save()

        answer_callback(callback_query_id, f"✅ To'lov #{payment.id} tasdiqlandi!")

        unlocked_note = (
            "🔓 <b>O'quvchiga PRO obuna va barcha dars/testlar muvaffaqiyatli ochildi!</b>"
            if is_course_or_pro
            else "🔓 <b>O'quvchiga mock test muvaffaqiyatli ochildi!</b>"
        )
        approved_caption = (
            f"🧾 <b>TO'LOV #{payment.id} — TASDIQLANDI ✅</b>\n\n"
            f"👤 <b>O'quvchi:</b> {user_full_name}\n"
            f"🎯 <b>Kurs / Reja:</b> {test_title}\n"
            f"💰 <b>Summa:</b> {amount_str} so'm\n"
            f"✅ <b>Tasdiqlagan admin:</b> {admin_name}\n"
            f"⏰ <b>Tasdiqlangan vaqt:</b> {now_time}\n\n"
            f"{unlocked_note}"
        )
        update_channel_message(chat_id, message_id, approved_caption, reply_markup={'inline_keyboard': []})

        # O'quvchiga Telegram bot orqali xushxabar yuborish
        if payment.profile.telegram_id:
            if is_course_or_pro:
                target_url = "https://ilmildizi.uz/dashboard"
                student_msg = (
                    f"🎉 <b>Tabriklaymiz, to'lovingiz tasdiqlandi!</b>\n\n"
                    f"Sizning <b>«{test_title}»</b> obunangiz muvaffaqiyatli faollashtirildi. "
                    f"Barcha PRO darslar, kurslar va mock testlar siz uchun ochildi!\n\n"
                    f"Hoziroq kirib o'qishni boshlashingiz mumkin:\n"
                    f"👉 <a href='{target_url}'>{target_url}</a>\n\n"
                    f"Omad tilaymiz! 🚀"
                )
            else:
                test_url = f"https://ilmildizi.uz/tests/{payment.test_id}" if payment.test_id else "https://ilmildizi.uz/tests"
                student_msg = (
                    f"🎉 <b>Tabriklaymiz, to'lovingiz tasdiqlandi!</b>\n\n"
                    f"Sizga <b>«{test_title}»</b> muvaffaqiyatli ochildi.\n\n"
                    f"Hoziroq kirib testni boshlashingiz mumkin:\n"
                    f"👉 <a href='{test_url}'>{test_url}</a>\n\n"
                    f"Omad tilaymiz! 🚀"
                )
            send_message(payment.profile.telegram_id, student_msg)

    elif action_type == 'reject':
        payment.status = 'rejected'
        payment.reviewed_at = timezone.now()
        payment.admin_note = f"Telegram kanalida {raw_admin_name} tomonidan rad etildi."
        payment.save()

        answer_callback(callback_query_id, f"❌ To'lov #{payment.id} rad etildi.")

        rejected_caption = (
            f"🧾 <b>TO'LOV #{payment.id} — RAD ETILDI ❌</b>\n\n"
            f"👤 <b>O'quvchi:</b> {user_full_name}\n"
            f"🎯 <b>Kurs / Reja:</b> {test_title}\n"
            f"💰 <b>Summa:</b> {amount_str} so'm\n"
            f"❌ <b>Rad etgan admin:</b> {admin_name}\n"
            f"⏰ <b>Vaqt:</b> {now_time}\n\n"
            f"<i>Chek rad etildi, ruxsat ochilmadi.</i>"
        )
        update_channel_message(chat_id, message_id, rejected_caption, reply_markup={'inline_keyboard': []})

        if payment.profile.telegram_id:
            student_reject_msg = (
                f"⚠️ <b>To'lovingiz tasdiqlanmadi.</b>\n\n"
                f"Yuborilgan to'lov chekida xatolik aniqlandi yoki to'lov to'liq tushmadi. "
                f"Iltimos, ma'lumotlarni tekshirib, chekni qayta yuklang yoki qo'llab-quvvatlash xizmatiga murojaat qiling."
            )
            send_message(payment.profile.telegram_id, student_reject_msg)
