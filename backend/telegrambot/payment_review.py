"""Avtomatlashtirilgan to'lov cheki tahlili va tasdiqlash tizimi.

O'quvchi saytda yoki botda to'lov cheki (skrinshot) yuklaganda, bu modul:
1. To'lov cheki rasmini yashirin Telegram kanaliga inline tugmalar bilan yuboradi.
2. Admin kanalda "✅ Qabul qilish (Testni ochish)" tugmasini bosganda:
   - Payment holatini 'approved' qiladi
   - apply_to_profile() chaqirilib, o'sha o'quvchiga aynan sotib olingan mock test ochiladi
   - O'quvchiga bot orqali "To'lovingiz tasdiqlandi, test ochildi!" xabari yuboriladi
   - Kanaldagi post "✅ TASDIQLANDI" deb yangilanadi
3. "❌ Rad etish" bosilganda rad etiladi.
"""
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


def get_payment_channel_id():
    """To'lov cheklari yuboriladigan kanal ID sini aniqlash."""
    raw = getattr(settings, 'PAYMENT_CHANNEL_ID', '') or getattr(settings, 'ADMIN_TELEGRAM_CHAT_ID', '') or ''
    cid = str(raw).strip()
    return cid if cid else DEFAULT_PAYMENT_CHANNEL_ID


def update_channel_message(chat_id, message_id, text, reply_markup=None):
    """Xabar rasm bo'lsa caption ni, matn bo'lsa text ni yangilaydi."""
    res = edit_message_caption(chat_id, message_id, text, reply_markup=reply_markup)
    if not res.get('ok'):
        res = edit_message_text(chat_id, message_id, text, reply_markup=reply_markup)
    return res


def send_payment_review_notification(payment):
    """To'lov chekini yashirin Telegram kanaliga inline tasdiqlash tugmalari bilan yuborish."""
    try:
        channel_id = get_payment_channel_id()
        logger.info("send_payment_review_notification boshlandi: payment_id=%s, channel_id=%s", payment.id, channel_id)

        profile = payment.profile
        user = profile.user
        full_name = f"{user.first_name} {user.last_name}".strip() or user.username
        username = getattr(user, 'username', '')
        tg_user = f"@{profile.telegram_username}" if getattr(profile, 'telegram_username', None) else "Bog'lanmagan"
        email_str = getattr(user, 'email', '') or "Kiritilmagan"
        
        test_title = payment.test.title if payment.test else (payment.plan.name if payment.plan else "Mock Test")
        amount_str = f"{payment.amount:,.0f}".replace(",", " ")
        source_str = "Veb-sayt" if payment.source == 'web' else "Telegram Bot"
        created_time = timezone.localtime(payment.created_at).strftime("%Y-%m-%d %H:%M")

        caption = (
            f"🧾 <b>YANGI TO'LOV CHEKI #{payment.id}</b>\n\n"
            f"👤 <b>O'quvchi:</b> {full_name} (@{username})\n"
            f"💬 <b>Telegram:</b> {tg_user}\n"
            f"📧 <b>Email / ID:</b> {email_str} (Profil ID: {profile.id})\n"
            f"🎯 <b>Mock Test / Reja:</b> {test_title}\n"
            f"💰 <b>To'lov summasi:</b> <b>{amount_str} so'm</b>\n"
            f"🌐 <b>Manba:</b> {source_str}\n"
            f"⏰ <b>Vaqt:</b> {created_time}\n\n"
            f"<i>Testni ochish yoki rad etish uchun quyidagi tugmani bosing:</i>"
        )

        reply_markup = {
            'inline_keyboard': [
                [
                    {'text': "✅ Qabul qilish (Testni ochish)", 'callback_data': f"pay_approve_{payment.id}"},
                    {'text': "❌ Rad etish", 'callback_data': f"pay_reject_{payment.id}"},
                ]
            ]
        }

        # Skrinshot faylini tekshirish va yuborish
        res = {'ok': False}
        if payment.screenshot:
            try:
                file_path = None
                try:
                    if hasattr(payment.screenshot, 'path'):
                        file_path = payment.screenshot.path
                except Exception:
                    file_path = None

                if file_path and os.path.exists(file_path):
                    res = send_photo(channel_id, file_path, caption=caption, reply_markup=reply_markup)
                else:
                    payment.screenshot.open('rb')
                    photo_bytes = payment.screenshot.read()
                    res = send_photo(channel_id, photo_bytes, caption=caption, reply_markup=reply_markup)
            except Exception as photo_err:
                logger.warning("send_photo xatosi: %s", photo_err)

        # Agar rasm orqali yuborilmagan bo'lsa (yoki xato bersa), albatta matnli xabarni yuboramiz
        if not res.get('ok'):
            logger.info("Rasm yuborilmadi yoki xato berdi, send_message orqali yuborilmoqda...")
            res = send_message(channel_id, caption, reply_markup=reply_markup)

        if not res.get('ok'):
            logger.warning("To'lov xabarini Telegram kanalga yuborishda xatolik: %s", res)
            return False

        logger.info("To'lov xabari kanalga muvaffaqiyatli yuborildi: payment_id=%s, result=%s", payment.id, res)
        return True
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
    admin_name = f"@{admin_username}" if admin_username else (admin_user.get('first_name') or 'Admin')

    if payment.status == 'approved':
        answer_callback(callback_query_id, "⚠️ Bu to'lov allaqachon tasdiqlangan!")
        return
    elif payment.status == 'rejected':
        answer_callback(callback_query_id, "⚠️ Bu to'lov allaqachon rad etilgan!")
        return

    test_title = payment.test.title if payment.test else (payment.plan.name if payment.plan else "Mock Test")
    amount_str = f"{payment.amount:,.0f}".replace(",", " ")
    user_full_name = f"{payment.profile.user.first_name} {payment.profile.user.last_name}".strip() or payment.profile.user.username
    now_time = timezone.localtime(timezone.now()).strftime("%Y-%m-%d %H:%M")

    if action_type == 'approve':
        payment.status = 'approved'
        payment.reviewed_at = timezone.now()
        payment.admin_note = f"Telegram kanalida {admin_name} tomonidan tasdiqlandi."
        payment.apply_to_profile()
        payment.save()

        answer_callback(callback_query_id, f"✅ To'lov #{payment.id} tasdiqlandi! Test ochildi.")

        # Kanaldagi xabarni yangilash (tugmalarni olib tashlash)
        approved_caption = (
            f"🧾 <b>TO'LOV #{payment.id} — TASDIQLANDI ✅</b>\n\n"
            f"👤 <b>O'quvchi:</b> {user_full_name}\n"
            f"🎯 <b>Test / Reja:</b> {test_title}\n"
            f"💰 <b>Summa:</b> {amount_str} so'm\n"
            f"✅ <b>Tasdiqlagan admin:</b> {admin_name}\n"
            f"⏰ <b>Tasdiqlangan vaqt:</b> {now_time}\n\n"
            f"🔓 <b>O'quvchiga test muvaffaqiyatli ochildi!</b>"
        )
        update_channel_message(chat_id, message_id, approved_caption, reply_markup={'inline_keyboard': []})

        # O'quvchiga Telegram bot orqali xushxabar yuborish
        if payment.profile.telegram_id:
            test_url = f"https://ilmildizi.uz/tests/{payment.test_id}" if payment.test_id else "https://ilmildizi.uz/tests"
            student_msg = (
                f"🎉 <b>Tabriklaymiz, to'lovingiz tasdiqlandi!</b>\n\n"
                f"Sizga <b>«{test_title}»</b> mock testi muvaffaqiyatli ochildi.\n\n"
                f"Hoziroq kirib testni boshlashingiz mumkin:\n"
                f"👉 <a href='{test_url}'>{test_url}</a>\n\n"
                f"Omad tilaymiz! 🚀"
            )
            send_message(payment.profile.telegram_id, student_msg)

    elif action_type == 'reject':
        payment.status = 'rejected'
        payment.reviewed_at = timezone.now()
        payment.admin_note = f"Telegram kanalida {admin_name} tomonidan rad etildi."
        payment.save()

        answer_callback(callback_query_id, f"❌ To'lov #{payment.id} rad etildi.")

        rejected_caption = (
            f"🧾 <b>TO'LOV #{payment.id} — RAD ETILDI ❌</b>\n\n"
            f"👤 <b>O'quvchi:</b> {user_full_name}\n"
            f"🎯 <b>Test / Reja:</b> {test_title}\n"
            f"💰 <b>Summa:</b> {amount_str} so'm\n"
            f"❌ <b>Rad etgan admin:</b> {admin_name}\n"
            f"⏰ <b>Vaqt:</b> {now_time}\n\n"
            f"<i>Chek rad etildi, test ochilmadi.</i>"
        )
        update_channel_message(chat_id, message_id, rejected_caption, reply_markup={'inline_keyboard': []})

        if payment.profile.telegram_id:
            student_reject_msg = (
                f"⚠️ <b>To'lovingiz tasdiqlanmadi.</b>\n\n"
                f"Yuborilgan to'lov chekida xatolik aniqlandi yoki to'lov to'liq tushmadi. "
                f"Iltimos, ma'lumotlarni tekshirib, chekni qayta yuklang yoki qo'llab-quvvatlash xizmatiga murojaat qiling."
            )
            send_message(payment.profile.telegram_id, student_reject_msg)
