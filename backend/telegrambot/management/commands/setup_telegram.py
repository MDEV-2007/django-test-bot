"""Telegram botni bitta buyruq bilan sozlaydi: webhook, menyu tugmasi, buyruqlar.

Nega kerak: deploydan keyin bu uchta narsani qo'lda `curl` bilan qo'yish oson unutiladi
va bot jim qolib ketadi. Bu buyruq idempotent — necha marta chaqirilsa ham natija bir xil.

Ishlatish (Docker ichida):
    docker compose exec web python manage.py setup_telegram
    docker compose exec web python manage.py setup_telegram --status
"""
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from telegrambot.client import api_call


class Command(BaseCommand):
    help = "Telegram webhook, menyu tugmasi va buyruqlar ro'yxatini o'rnatadi."

    def add_arguments(self, parser):
        parser.add_argument(
            '--url', default='',
            help="Saytning ochiq manzili. Berilmasa FRONTEND_URL/WEBAPP_URL ishlatiladi.",
        )
        parser.add_argument(
            '--status', action='store_true',
            help="Hech narsani o'zgartirmaydi, faqat joriy holatni ko'rsatadi.",
        )

    def handle(self, *args, **options):
        if not settings.TELEGRAM_BOT_TOKEN:
            raise CommandError("TELEGRAM_BOT_TOKEN sozlanmagan (backend/.env).")

        me = api_call('getMe')
        if not me.get('ok'):
            raise CommandError(f"Bot tokeni ishlamayapti: {me.get('description')}")
        username = me['result']['username']

        if options['status']:
            info = api_call('getWebhookInfo').get('result', {})
            menu = api_call('getChatMenuButton').get('result', {})
            self.stdout.write(f"Bot:        @{username}")
            self.stdout.write(f"Webhook:    {info.get('url') or '(yo`q)'}")
            self.stdout.write(f"Navbatda:   {info.get('pending_update_count', 0)}")
            self.stdout.write(f"So`nggi xato: {info.get('last_error_message') or '(yo`q)'}")
            self.stdout.write(f"Menyu:      {menu.get('type')} -> {(menu.get('web_app') or {}).get('url', '-')}")
            return

        base = (options['url']
                or getattr(settings, 'FRONTEND_URL', '')
                or getattr(settings, 'WEBAPP_URL', '')).rstrip('/')
        if not base.startswith('https://'):
            # Telegram HTTPS talab qiladi: HTTP manzil bilan webhook ham, Mini App
            # tugmasi ham ishlamaydi (xatosiz, shunchaki jim qoladi).
            raise CommandError(
                f"Manzil HTTPS bo'lishi shart, hozir: '{base or '(bo`sh)'}'. "
                "backend/.env dagi FRONTEND_URL ni to'g'rilang yoki --url bering."
            )

        secret = getattr(settings, 'TELEGRAM_WEBHOOK_SECRET', '')
        if not secret:
            raise CommandError("TELEGRAM_WEBHOOK_SECRET sozlanmagan (backend/.env).")
        # Telegram sirda faqat A-Z a-z 0-9 _ - ni qabul qiladi (1..256 belgi). Buni shu
        # yerda tekshiramiz, chunki serverning javobi ("secret token contains unallowed
        # characters") qaysi belgi aybdorligini ham, uni qayerdan tuzatishni ham aytmaydi.
        # `openssl rand -base64` chiqaradigan + / = belgilari aynan shu xatoga olib keladi.
        bad = sorted(set(ch for ch in secret if not (ch.isascii() and (ch.isalnum() or ch in '_-'))))
        if bad or len(secret) > 256:
            raise CommandError(
                "TELEGRAM_WEBHOOK_SECRET Telegram qoidasiga mos emas "
                f"(ruxsat: A-Z a-z 0-9 _ - , 1..256 belgi; muammo: {'uzunligi' if not bad else ' '.join(bad)}). "
                "Yangisini shunday yarating: openssl rand -hex 32"
            )

        res = api_call(
            'setWebhook',
            url=f'{base}/telegram/webhook/',
            secret_token=secret,
            drop_pending_updates='true',
        )
        if not res.get('ok'):
            raise CommandError(f"setWebhook muvaffaqiyatsiz: {res.get('description')}")
        self.stdout.write(self.style.SUCCESS(f"Webhook: {base}/telegram/webhook/"))

        import json
        menu = api_call('setChatMenuButton', menu_button=json.dumps({
            'type': 'web_app', 'text': 'Ilm Ildizi', 'web_app': {'url': base},
        }))
        if not menu.get('ok'):
            raise CommandError(f"setChatMenuButton muvaffaqiyatsiz: {menu.get('description')}")
        self.stdout.write(self.style.SUCCESS(f"Menyu tugmasi: {base}"))

        api_call('setMyCommands', commands=json.dumps([
            {'command': 'start', 'description': 'Ilovani ochish'},
            {'command': 'referral', 'description': "Do'stlarni taklif qilish"},
            {'command': 'myid', 'description': 'Telegram ID raqamim'},
        ]))
        self.stdout.write(self.style.SUCCESS(f"Tayyor: @{username}"))
