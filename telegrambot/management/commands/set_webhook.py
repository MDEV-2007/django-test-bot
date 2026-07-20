"""Register / inspect / remove the Telegram webhook.

    python manage.py set_webhook --url https://your-domain.com
    python manage.py set_webhook --info
    python manage.py set_webhook --delete     # back to polling for local dev

Telegram requires HTTPS and a publicly reachable host. The secret is sent with the
registration and echoed back in every update, which is how the endpoint authenticates
callers — so TELEGRAM_WEBHOOK_SECRET must be set before registering.
"""
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.urls import reverse

from telegrambot.client import api_call


class Command(BaseCommand):
    help = "Telegram webhook'ni o'rnatadi, ko'rsatadi yoki o'chiradi."

    def add_arguments(self, parser):
        parser.add_argument('--url', help="Public base URL, e.g. https://ilmmevasi.uz")
        parser.add_argument('--info', action='store_true', help="Show current webhook status.")
        parser.add_argument('--delete', action='store_true', help="Remove the webhook (use polling).")

    def handle(self, *args, **options):
        if not settings.TELEGRAM_BOT_TOKEN:
            raise CommandError("TELEGRAM_BOT_TOKEN .env faylida o'rnatilmagan.")

        if options['info']:
            data = api_call('getWebhookInfo')
            result = data.get('result', {})
            self.stdout.write(self.style.SUCCESS("Webhook holati:"))
            for key in ('url', 'has_custom_certificate', 'pending_update_count',
                        'last_error_date', 'last_error_message', 'max_connections'):
                if key in result:
                    self.stdout.write(f"  {key}: {result[key]}")
            if not result.get('url'):
                self.stdout.write("  (webhook o'rnatilmagan — polling rejimida)")
            return

        if options['delete']:
            data = api_call('deleteWebhook', drop_pending_updates='false')
            if data.get('ok'):
                self.stdout.write(self.style.SUCCESS("Webhook o'chirildi. Endi polling ishlatishingiz mumkin."))
            else:
                raise CommandError(f"O'chirib bo'lmadi: {data}")
            return

        base = (options['url'] or getattr(settings, 'WEBAPP_URL', '') or '').rstrip('/')
        if not base:
            raise CommandError("--url bering yoki .env da WEBAPP_URL ni o'rnating.")
        if not base.startswith('https://'):
            raise CommandError("Telegram faqat HTTPS manzilni qabul qiladi (https://...).")

        secret = getattr(settings, 'TELEGRAM_WEBHOOK_SECRET', '')
        if not secret:
            raise CommandError(
                "TELEGRAM_WEBHOOK_SECRET .env faylida o'rnatilmagan — webhook autentifikatsiyasi "
                "shunga bog'liq. Masalan: TELEGRAM_WEBHOOK_SECRET=" +
                "".join(__import__('secrets').token_urlsafe(32))
            )

        url = base + reverse('telegrambot:webhook')
        data = api_call(
            'setWebhook',
            url=url,
            secret_token=secret,
            max_connections=getattr(settings, 'TELEGRAM_WEBHOOK_MAX_CONNECTIONS', 40),
            allowed_updates='["message","callback_query"]',
            drop_pending_updates='false',
        )
        if data.get('ok'):
            self.stdout.write(self.style.SUCCESS(f"Webhook o'rnatildi: {url}"))
            self.stdout.write("Tekshirish: python manage.py set_webhook --info")
        else:
            raise CommandError(f"O'rnatib bo'lmadi: {data}")
