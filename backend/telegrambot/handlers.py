"""Telegram update handling.

Pure logic, importable from both transports:
  * webhook  (telegrambot.views.webhook)  — production
  * polling  (manage.py run_bot_polling)  — local development

Flow: /start -> open the Mini App or buy premium -> pick a plan -> a pending Payment is
created and the card details are sent -> the user replies with a screenshot, which is
attached to that Payment. Approval happens only in the web admin panel, so there is one
consistent review path.
"""
import json
import logging

from django.conf import settings
from django.contrib.auth.models import User
from django.core.files.base import ContentFile
from django.db.models import Q
from django.utils import timezone

from . import subscription
from .client import answer_callback, api_call, download_file, send_message

logger = logging.getLogger(__name__)


def _webapp_url():
    return getattr(settings, 'WEBAPP_URL', '') or 'http://127.0.0.1:8000/'


def get_or_create_profile(tg_user, referral_code=None):
    """Mirrors accounts.views.tg_login's user-creation logic for bot-initiated users.

    `referral_code` is only ever applied on the branch that creates a brand-new profile —
    an existing user re-sending /start (even with a stray ?start=CODE) can't retroactively
    farm a referral bonus."""
    from accounts.models import Profile, ensure_profile_for_user
    from accounts.referrals import apply_referral

    tg_id = str(tg_user['id'])
    tg_username = (tg_user.get('username') or '').lstrip('@')
    profile = Profile.objects.select_related('user').filter(telegram_id=tg_id).first()
    if profile:
        # @nom Telegram tomonida o'zgaradi (yoki keyinchalik qo'yiladi), shuning uchun
        # uni faqat yaratilishda emas, har murojaatda tekshiramiz.
        if tg_username != (profile.telegram_username or ''):
            profile.telegram_username = tg_username
            profile.save(update_fields=['telegram_username'])
        return profile

    user, created = User.objects.get_or_create(username=f"tg_{tg_id}")
    if created:
        user.first_name = tg_user.get('first_name', '')
        user.last_name = tg_user.get('last_name', '')
        user.save()

    profile = ensure_profile_for_user(user)
    profile.telegram_id = tg_id
    profile.telegram_username = tg_username
    if not profile.avatar_url:
        seed = tg_user.get('username') or tg_user.get('first_name') or tg_id
        profile.avatar_url = f"https://api.dicebear.com/7.x/adventurer/svg?seed={seed}"
    profile.last_active_date = timezone.localdate()
    profile.save()
    if referral_code:
        apply_referral(profile, referral_code)
    return profile



def send_subscribe_prompt(chat_id):
    """Kanalga obuna so'raladigan yagona ekran. Bu yerda "keyinroq" tugmasi ATAYLAB yo'q:
    yumshoq gate'ni deyarli hech kim bosmaydi, natijada kanal ham o'smaydi, foydalanuvchi
    ham ikki marta bezovta qilinadi."""
    # Obuna bo'lmagan foydalanuvchi uchun pastdagi menyu tugmasi (web_app) yopiladi,
    # aks holda o'quvchi kanalga kirmasdan pastdagi tugmani bosib ilovaga o'tib ketaveradi.
    try:
        api_call('setChatMenuButton', chat_id=chat_id, menu_button=json.dumps({'type': 'commands'}))
    except Exception:
        pass

    url = subscription.channel_url()
    rows = []
    if url:
        rows.append([{'text': "📢 Kanalga obuna bo'lish", 'url': url}])
    rows.append([{'text': "✅ Tekshirish", 'callback_data': 'check_subscription'}])
    send_message(
        chat_id,
        "Assalomu alaykum!\n\n"
        "IlmIldizi'dan foydalanish uchun avval rasmiy kanalimizga obuna bo'ling. "
        "Kanalda kunlik testlar, yangi funksiyalar va loyiha yangiliklari e'lon qilinadi.\n\n"
        "Obuna bo'lgach, ✅ Tekshirish tugmasini bosing.",
        reply_markup={'inline_keyboard': rows},
    )


def gate_blocks(chat_id, tg_user):
    """True bo'lsa — foydalanuvchi obuna emas va unga obuna ekrani yuborildi."""
    if subscription.is_subscribed(tg_user.get('id')):
        return False
    send_subscribe_prompt(chat_id)
    return True


def handle_check_subscription(chat_id, tg_user, callback_query_id):
    """"Tekshirish" tugmasi: keshni tashlab, Telegramdan yangi javob olamiz."""
    subscription.invalidate(tg_user.get('id'))
    if subscription.is_subscribed(tg_user.get('id'), use_cache=False):
        answer_callback(callback_query_id, "Rahmat! Obuna tasdiqlandi.")
        handle_start(chat_id, tg_user)
    else:
        answer_callback(callback_query_id, "Hali obuna ko'rinmadi. Obuna bo'lib, qayta bosing.")


def handle_start(chat_id, tg_user, referral_code=None):
    # Deep link: 'landing', 'pdf_gift' yoki 'mock_<id>' referal kodi emas, maxsus kirish belgisi
    is_landing = (referral_code == 'landing')
    is_pdf_gift = (referral_code == 'pdf_gift')
    is_mock = bool(referral_code and referral_code.startswith('mock_'))
    actual_ref = None if (is_landing or is_pdf_gift or is_mock) else referral_code

    # Profil gate'dan OLDIN yaratiladi
    get_or_create_profile(tg_user, referral_code=actual_ref)
    if gate_blocks(chat_id, tg_user):
        return

    # Faqat kanalga obuna bo'lgan foydalanuvchiga pastdagi WebApp menyu tugmasi ko'rsatiladi
    url = _webapp_url()
    if url.startswith('https://'):
        try:
            api_call('setChatMenuButton', chat_id=chat_id, menu_button=json.dumps({
                'type': 'web_app', 'text': 'Ilm Ildizi', 'web_app': {'url': url}
            }))
        except Exception:
            pass

    if is_mock:
        mock_id_str = referral_code.replace('mock_', '').strip()
        from tests_app.models import TestSet
        test = TestSet.objects.filter(pk=mock_id_str).first() if mock_id_str.isdigit() else None
        if test:
            subject_name = test.subject.name if test.subject else "Milliy sertifikat"
            base_url = url.rstrip('/')
            mock_url = f"{base_url}/tests/mock/{test.id}"
            mock_button = {'text': "🚀 Imtihonga kirish", 'web_app': {'url': mock_url}}
            mock_keyboard = {'inline_keyboard': [
                [mock_button],
                [{'text': "\U0001F393 Ilm Ildizi bosh sahifasi", 'web_app': {'url': url}}],
            ]}
            q_count = test.questions.count() or 45
            welcome_text = (
                f"🎯 <b>{test.title}</b> — Katta Jonli Mock Imtihoniga taklif qilindingiz!\n\n"
                f"📌 <b>Fan:</b> {subject_name}\n"
                f"⏳ <b>Berilgan vaqt:</b> {test.duration_minutes} daqiqa\n"
                f"📝 <b>Savollar soni:</b> {q_count} ta\n"
                f"🏆 <b>Baholash:</b> Milliy Sertifikat darajalari\n\n"
                "👇 Imtihon topshirish uchun quyidagi tugmani bosing:"
            )
            send_message(chat_id, welcome_text, reply_markup=mock_keyboard)
            return

    base_url = url.rstrip('/')
    if url.startswith('https://'):
        open_app_button = {'text': "🚀 3 daqiqalik ekspress test", 'web_app': {'url': f"{base_url}/tests"}}
        battle_button = {'text': "⚔️ 1v1 Battle Arena (Jang)", 'web_app': {'url': f"{base_url}/battles"}}
        home_button = {'text': "🎓 Bosh sahifa", 'web_app': {'url': base_url}}
    else:
        open_app_button = {'text': "🚀 3 daqiqalik ekspress test", 'url': f"{base_url}/tests"}
        battle_button = {'text': "⚔️ 1v1 Battle Arena (Jang)", 'url': f"{base_url}/battles"}
        home_button = {'text': "🎓 Bosh sahifa", 'url': base_url}

    keyboard = {'inline_keyboard': [
        [open_app_button],
        [battle_button],
        [
            home_button,
            {'text': "🎁 Do'stni taklif qilish", 'callback_data': 'referral_info'}
        ],
        [{'text': "💎 VIP & Premium", 'callback_data': 'premium_menu'}],
    ]}

    if is_pdf_gift:
        welcome_text = (
            "Assalomu alaykum! 🎁 2026-yilgi Milliy sertifikat namunaviy savollar to'plamiga xush kelibsiz.\n\n"
            "Quyidagi tugma orqali ilovaga kiring va bepul diagnostik test topshirib, "
            "zaif mavzularingizni AI Mentor orqali tahlil qilib oling!"
        )
    elif is_landing:
        welcome_text = (
            "Assalomu alaykum! IlmIldizi saytidan kelganingizdan xursandmiz.\n\n"
            "Platforma siz uchun to'liq tayyor. Pastdagi tugma orqali ilovani oching va "
            "10 ta savolli dastlabki diagnostik testni parolsiz, bepul yechib ko'ring!"
        )
    else:
        welcome_text = (
            "Assalomu alaykum! <b>IlmIldizi</b> ta'lim platformasiga xush kelibsiz. 🎓\n\n"
            "Bu yerda siz:\n"
            "• 🎯 <b>Milliy Sertifikat & BBA</b> formatidagi yangi testlarni topshirishingiz\n"
            "• ⚔️ Do'stlaringiz bilan <b>1v1 jonli intellektual janglarda</b> bellashishingiz\n"
            "• 🤖 <b>AI Xatolar tahlili</b> orqali kamchiliklaringizni to'g'rilashingiz mumkin.\n\n"
            "Bilimingizni sinab ko'rish uchun quyidagi tugmalardan birini tanlang 👇"
        )

    result = send_message(
        chat_id,
        welcome_text,
        reply_markup=keyboard,
    )
    if not result.get('ok'):
        send_message(chat_id, "Assalomu alaykum! Botda vaqtincha texnik nosozlik bor, "
                              "birozdan so'ng qayta urinib ko'ring.")


def handle_referral_info(chat_id, tg_user):
    import urllib.parse
    from accounts.referrals import get_referral_link, get_telegram_deep_link, referral_stats

    profile = get_or_create_profile(tg_user)
    link = get_telegram_deep_link(profile) or get_referral_link(profile)
    stats = referral_stats(profile)

    share_text = (
        "🎯 Milliy sertifikat va BBA imtihonlariga eng zamonaviy formatda tayyorlanamiz!\n\n"
        "Ochiq savollar, 1v1 jonli janglar va AI tahlil bilan bilimingni oshir. "
        "Havola orqali kiring va 20 ta bepul tanga oling 👇"
    )
    share_url = f"https://t.me/share/url?url={urllib.parse.quote(link)}&text={urllib.parse.quote(share_text)}"

    rows = [
        [{'text': "📤 Do'stlarga yuborish (1-klik)", 'url': share_url}],
        [{'text': "🔙 Asosiy menyu", 'callback_data': 'main_menu'}],
    ]

    send_message(
        chat_id,
        "🎁 <b>Do'stlaringizni taklif qiling va bepul imtihon yuting!</b>\n\n"
        "✨ <b>Qoidalar juda oddiy:</b>\n"
        "• Havolangiz orqali ro'yxatdan o'tgan har bir do'st uchun — ikkalangiz ham <b>+15 tanga</b> olasiz.\n"
        "• <b>3 ta do'stingizni taklif qilsangiz</b> — Yakshanba kungi Katta Respublika Mock Imtihoniga <b>100% BEPUL chipta</b> olasiz!\n\n"
        f"🔗 <b>Sizning shaxsiy havolangiz:</b>\n<code>{link}</code>\n\n"
        f"👥 Taklif qilganlaringiz: <b>{stats['referral_count']} nafar</b>\n"
        f"🪙 Ishlangan tangalar: <b>{stats['coins_earned']} ta</b>",
        reply_markup={'inline_keyboard': rows},
        parse_mode='HTML',
    )


def handle_premium_menu(chat_id):
    from premium.models import SubscriptionPlan
    from premium.services import seed_plans_if_needed

    seed_plans_if_needed()
    plans = SubscriptionPlan.objects.filter(is_active=True)
    buttons = [[{'text': f"💎 {plan.name} — {plan.price:,.0f} so'm".replace(',', ' '),
                 'callback_data': f"buy_plan_{plan.id}"}] for plan in plans]
    send_message(
        chat_id,
        "💎 <b>PRO Kurslar va Mock Testlar tariflari:</b>\n\n"
        "O'zingizga mos rejani tanlang va to'lov cheki skrinshotini shu yerga yuboring:",
        reply_markup={'inline_keyboard': buttons},
    )


def handle_buy_plan(chat_id, tg_user, plan_id):
    from premium.models import Payment, SubscriptionPlan

    profile = get_or_create_profile(tg_user)
    plan = SubscriptionPlan.objects.filter(id=plan_id, is_active=True).first()
    if not plan:
        send_message(chat_id, "Bu reja topilmadi. Qaytadan /start bosing.")
        return

    Payment.objects.create(profile=profile, plan=plan, amount=plan.price,
                           status='awaiting_screenshot', source='bot')
    send_message(
        chat_id,
        f"🎯 <b>Tanlangan reja:</b> {plan.name}\n"
        f"💰 <b>To'lov summasi:</b> {plan.price:,.0f} so'm\n\n"
        f"💳 <b>Karta raqami:</b> <code>{settings.PREMIUM_CARD_NUMBER}</code>\n"
        f"👤 <b>Karta egasi:</b> {settings.PREMIUM_CARD_HOLDER}\n\n"
        "📸 To'lovni amalga oshirib, <b>to'lov cheki (skrinshot) rasmini</b> shu chatga yuboring. "
        "Admin tekshirib chiqqach, kurs / premium obunangiz avtomatik ochiladi.",
    )


def handle_photo(chat_id, tg_user, photo_sizes, file_id_override=None):
    from premium.models import Payment, SubscriptionPlan
    from premium.services import seed_plans_if_needed

    profile = get_or_create_profile(tg_user)
    payment = (Payment.objects
               .filter(profile=profile, status='awaiting_screenshot')
               .order_by('-created_at').first())
    if not payment:
        # Agar o'quvchi saytda kartani ko'rib, to'g'ridan-to'g'ri botga chek rasm yuborgan bo'lsa,
        # uni rad etmasdan avtomatik Payment yaratib kanalga yuboramiz.
        seed_plans_if_needed()
        default_plan = (
            SubscriptionPlan.objects.filter(is_active=True, plan_type='lessons').order_by('price').first()
            or SubscriptionPlan.objects.filter(is_active=True).first()
        )
        if not default_plan:
            send_message(chat_id, "Hozircha faol tarif topilmadi. /start buyrug'ini bosing.")
            return
        payment = Payment.objects.create(
            profile=profile,
            plan=default_plan,
            amount=default_plan.price,
            status='awaiting_screenshot',
            source='bot',
        )

    target_file_id = file_id_override or (photo_sizes[-1]['file_id'] if photo_sizes else None)
    if not target_file_id:
        send_message(chat_id, "Rasmni o'qib bo'lmadi, qaytadan yuboring.")
        return

    result = download_file(target_file_id)
    if not result:
        send_message(chat_id, "Rasmni yuklab bo'lmadi, qaytadan urinib ko'ring.")
        return

    content, filename = result
    payment.screenshot.save(filename, ContentFile(content), save=False)
    payment.status = 'pending'
    payment.save()

    send_message(
        chat_id,
        "✅ <b>To'lov chekingiz qabul qilindi!</b>\n\n"
        "Moderatorlarimiz 5–15 daqiqa ichida tekshirib tasdiqlaydi va "
        "PRO kurs / test ruxsatingiz avtomatik ochiladi.",
    )
    try:
        from .payment_review import send_payment_review_notification
        if not send_payment_review_notification(payment):
            notify_admins(
                f"Yangi to'lov: {profile.user.username} — {payment.plan.name} "
                f"({payment.amount:.0f} so'm). Ko'rib chiqish uchun admin panelga o'ting."
            )
    except Exception:
        notify_admins(
            f"Yangi to'lov: {profile.user.username} — {payment.plan.name} "
            f"({payment.amount:.0f} so'm). Ko'rib chiqish uchun admin panelga o'ting."
        )


def notify_admins(text):
    """Notify admins of a new payment, deduplicated across two audiences: the configured
    ADMIN_TELEGRAM_CHAT_ID (only when it is a real numeric chat id — the common mistake of
    setting it to the bot's own @username is ignored, since a bot cannot message itself),
    and every superadmin/staff account with a linked telegram_id."""
    from accounts.models import Profile

    targets = set()
    admin_id = (getattr(settings, 'ADMIN_TELEGRAM_CHAT_ID', '') or '').strip()
    if admin_id and admin_id.lstrip('-').isdigit():
        targets.add(admin_id)

    for profile in (Profile.objects
                    .filter(Q(role='superadmin') | Q(user__is_staff=True))
                    .exclude(telegram_id__isnull=True).exclude(telegram_id='')):
        targets.add(str(profile.telegram_id))

    for target in targets:
        send_message(target, text)


def process_update(update):
    """Entry point for a single Telegram update, from webhook or polling."""
    if 'callback_query' in update:
        cq = update['callback_query']
        chat_id = cq['message']['chat']['id']
        data = cq.get('data', '')

        # Yashirin kanaldan to'lovni tasdiqlash yoki rad etish
        if data.startswith('pay_approve_') or data.startswith('pay_reject_'):
            from .payment_review import handle_payment_callback
            handle_payment_callback(
                chat_id=chat_id,
                message_id=cq['message']['message_id'],
                callback_query_id=cq['id'],
                admin_user=cq.get('from', {}),
                callback_data=data,
            )
            return

        if data == 'check_subscription':
            handle_check_subscription(chat_id, cq['from'], cq['id'])
            return
        answer_callback(cq['id'])
        if gate_blocks(chat_id, cq['from']):
            return
        if data == 'premium_menu':
            handle_premium_menu(chat_id)
        elif data == 'referral_info':
            handle_referral_info(chat_id, tg_user=cq['from'])
        elif data == 'main_menu':
            handle_start(chat_id, cq['from'])
        elif data.startswith('buy_plan_'):
            handle_buy_plan(chat_id, cq['from'], int(data.replace('buy_plan_', '')))
        return

    msg = update.get('message')
    if not msg:
        return
    chat_id = msg['chat']['id']
    chat_type = msg.get('chat', {}).get('type', 'private')
    tg_user = msg.get('from') or {}
    text = msg.get('text', '')

    # Guruh va kanallardagi oddiy yozishmalarga bot javob bermasligi kerak
    if chat_type != 'private':
        if text.startswith('/myid'):
            send_message(chat_id, f"Ushbu guruh/kanal ID raqami: <code>{chat_id}</code>")
        return

    # /start ning o'zi gate'ni ichida bajaradi (profil + referal avval yaratilishi kerak);
    # qolgan hamma narsa shu yerda to'xtatiladi.
    if not text.startswith('/start') and gate_blocks(chat_id, tg_user):
        return

    if 'photo' in msg:
        handle_photo(chat_id, tg_user, msg['photo'])
        return

    if 'document' in msg:
        doc = msg['document']
        mime = (doc.get('mime_type') or '').lower()
        fname = (doc.get('file_name') or '').lower()
        if mime.startswith('image/') or fname.endswith(('.jpg', '.jpeg', '.png', '.webp', '.heic')):
            handle_photo(chat_id, tg_user, [], file_id_override=doc.get('file_id'))
            return

    if text.startswith('/start'):
        # Deep link: t.me/<bot>?start=CODE arrives as the literal text "/start CODE".
        parts = text.split(maxsplit=1)
        referral_code = parts[1].strip() if len(parts) > 1 else None
        handle_start(chat_id, tg_user, referral_code=referral_code)
    elif text.startswith('/myid'):
        send_message(chat_id,
                     f"Sizning Telegram chat ID raqamingiz: {chat_id}\n\n"
                     f"Admin bildirishnomalarini olish uchun .env faylida "
                     f"ADMIN_TELEGRAM_CHAT_ID={chat_id} deb yozing.")
    elif text.startswith('/referral') or text.startswith('/invite'):
        handle_referral_info(chat_id, tg_user)
    elif text:
        send_message(chat_id, "Buyruqlar uchun /start ni bosing.")
