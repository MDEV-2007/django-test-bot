"""Telegram update handling.

Pure logic, importable from both transports:
  * webhook  (telegrambot.views.webhook)  — production
  * polling  (manage.py run_bot_polling)  — local development

Flow: /start -> open the Mini App or buy premium -> pick a plan -> a pending Payment is
created and the card details are sent -> the user replies with a screenshot, which is
attached to that Payment. Approval happens only in the web admin panel, so there is one
consistent review path.
"""
import logging

from django.conf import settings
from django.contrib.auth.models import User
from django.core.files.base import ContentFile
from django.db.models import Q
from django.utils import timezone

from .client import answer_callback, download_file, send_message

logger = logging.getLogger(__name__)


def _webapp_url():
    return getattr(settings, 'WEBAPP_URL', '') or 'http://127.0.0.1:8000/'


def get_or_create_profile(tg_user):
    """Mirrors accounts.views.tg_login's user-creation logic for bot-initiated users."""
    from accounts.models import Profile, ensure_profile_for_user

    tg_id = str(tg_user['id'])
    profile = Profile.objects.select_related('user').filter(telegram_id=tg_id).first()
    if profile:
        return profile

    user, created = User.objects.get_or_create(username=f"tg_{tg_id}")
    if created:
        user.first_name = tg_user.get('first_name', '')
        user.last_name = tg_user.get('last_name', '')
        user.save()

    profile = ensure_profile_for_user(user)
    profile.telegram_id = tg_id
    profile.telegram_username = tg_user.get('username', '')
    if not profile.avatar_url:
        seed = tg_user.get('username') or tg_user.get('first_name') or tg_id
        profile.avatar_url = f"https://api.dicebear.com/7.x/adventurer/svg?seed={seed}"
    profile.last_active_date = timezone.localdate()
    profile.save()
    return profile


def handle_start(chat_id, tg_user):
    get_or_create_profile(tg_user)

    # Telegram silently rejects "web_app" buttons whose URL isn't HTTPS — the whole
    # sendMessage call fails and nothing reaches the user. Fall back to a plain "url"
    # button so /start always works, even before a real HTTPS domain is configured.
    url = _webapp_url()
    if url.startswith('https://'):
        open_app_button = {'text': "\U0001F393 Ilm Mevasi'ni ochish", 'web_app': {'url': url}}
    else:
        open_app_button = {'text': "\U0001F393 Ilm Mevasi'ni ochish", 'url': url}

    keyboard = {'inline_keyboard': [
        [open_app_button],
        [{'text': "\U0001F48E Premium sotib olish", 'callback_data': 'premium_menu'}],
    ]}
    result = send_message(
        chat_id,
        "Assalomu alaykum! IlmMevasi botiga xush kelibsiz.\n\n"
        "Pastdagi tugma orqali ilovani oching yoki premium imkoniyatlarni ko'ring.",
        reply_markup=keyboard,
    )
    if not result.get('ok'):
        send_message(chat_id, "Assalomu alaykum! Botda vaqtincha texnik nosozlik bor, "
                              "birozdan so'ng qayta urinib ko'ring.")


def handle_premium_menu(chat_id):
    from premium.models import SubscriptionPlan
    from premium.views import seed_plans_if_needed

    seed_plans_if_needed()
    plans = SubscriptionPlan.objects.filter(is_active=True)
    buttons = [[{'text': f"{plan.name} — {plan.price:.0f} so'm",
                 'callback_data': f"buy_plan_{plan.id}"}] for plan in plans]
    send_message(chat_id, "Qaysi rejani xohlaysiz?", reply_markup={'inline_keyboard': buttons})


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
        f"Reja: {plan.name}\nSumma: {plan.price:.0f} so'm\n\n"
        f"Karta raqami: {settings.PREMIUM_CARD_NUMBER}\n"
        f"Karta egasi: {settings.PREMIUM_CARD_HOLDER}\n\n"
        "To'lovni amalga oshirib, to'lov skrinshotini shu chatga rasm qilib yuboring. "
        "Admin tekshirib chiqqach, premium avtomatik ochiladi.",
    )


def handle_photo(chat_id, tg_user, photo_sizes):
    from premium.models import Payment

    profile = get_or_create_profile(tg_user)
    payment = (Payment.objects
               .filter(profile=profile, status='awaiting_screenshot')
               .order_by('-created_at').first())
    if not payment:
        send_message(chat_id, "Hozircha kutilayotgan to'lov topilmadi. "
                              "Avval /start orqali premium sotib olishni boshlang.")
        return

    largest = photo_sizes[-1]  # Telegram sends smallest -> largest
    result = download_file(largest['file_id'])
    if not result:
        send_message(chat_id, "Rasmni yuklab bo'lmadi, qaytadan urinib ko'ring.")
        return

    content, filename = result
    payment.screenshot.save(filename, ContentFile(content), save=False)
    payment.status = 'pending'
    payment.save()

    send_message(chat_id, "Skrinshotingiz qabul qilindi! "
                          "Admin tekshirib chiqqach, premium avtomatik faollashadi.")
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
        answer_callback(cq['id'])
        if data == 'premium_menu':
            handle_premium_menu(chat_id)
        elif data.startswith('buy_plan_'):
            handle_buy_plan(chat_id, cq['from'], int(data.replace('buy_plan_', '')))
        return

    msg = update.get('message')
    if not msg:
        return
    chat_id = msg['chat']['id']
    tg_user = msg['from']

    if 'photo' in msg:
        handle_photo(chat_id, tg_user, msg['photo'])
        return

    text = msg.get('text', '')
    if text.startswith('/start'):
        handle_start(chat_id, tg_user)
    elif text.startswith('/myid'):
        send_message(chat_id,
                     f"Sizning Telegram chat ID raqamingiz: {chat_id}\n\n"
                     f"Admin bildirishnomalarini olish uchun .env faylida "
                     f"ADMIN_TELEGRAM_CHAT_ID={chat_id} deb yozing.")
    elif text:
        send_message(chat_id, "Buyruqlar uchun /start ni bosing.")
