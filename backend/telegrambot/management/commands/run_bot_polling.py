"""Long-polling bot runner — for LOCAL DEVELOPMENT only.

    python manage.py run_bot_polling

Production uses the webhook (`set_webhook`), because polling is a single process that
can't be scaled or made redundant. This command exists so you can develop without a
public HTTPS URL. Delete the webhook first, otherwise Telegram won't deliver updates
here: `python manage.py set_webhook --delete`.
"""
import logging
import time

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from telegrambot.client import SESSION, api_url
from telegrambot.handlers import process_update

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Telegram botni polling rejimida ishga tushiradi (faqat lokal ishlab chiqish uchun)."

    def handle(self, *args, **options):
        if not settings.TELEGRAM_BOT_TOKEN:
            raise CommandError("TELEGRAM_BOT_TOKEN .env faylida o'rnatilmagan.")

        logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
        self.stdout.write(self.style.SUCCESS("Polling boshlandi (Ctrl+C to'xtatadi)..."))
        offset = 0
        while True:
            try:
                # Telegram holds this open up to 30s waiting for an update (long polling),
                # so the read timeout must comfortably exceed that while the connect
                # timeout stays short enough to retry a dead connection quickly.
                resp = SESSION.get(api_url('getUpdates'),
                                   params={'offset': offset, 'timeout': 30},
                                   timeout=(10, 35))
                data = resp.json()
                if not data.get('ok'):
                    logger.warning("getUpdates failed: %s", data)
                    time.sleep(3)
                    continue
                for update in data['result']:
                    offset = update['update_id'] + 1
                    try:
                        process_update(update)
                    except Exception:
                        logger.exception("Failed to process update %s", update.get('update_id'))
            except KeyboardInterrupt:
                self.stdout.write(self.style.WARNING("\nTo'xtatildi."))
                break
            except Exception:
                logger.warning("Polling error, retrying in 3s...", exc_info=True)
                time.sleep(3)
