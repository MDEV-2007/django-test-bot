"""Telegram botning umumiy Chat Menu tugmasini buyruqlarga (commands) qaytarish.

Barcha obuna bo'lmagan foydalanuvchilarda Telegram pastidagi "Ilm Ildizi" (web_app)
tugmasi ko'rinmaydi. Faqat kanalga obuna bo'lib /start bosgan foydalanuvchiga
alohida ochiladi.
"""
import json
from django.core.management.base import BaseCommand
from telegrambot.client import api_call


class Command(BaseCommand):
    help = "Botning global menu tugmasini 'commands' ga qaytaradi (web_app olib tashlanadi)."

    def handle(self, *args, **options):
        res = api_call('setChatMenuButton', menu_button=json.dumps({'type': 'commands'}))
        if res.get('ok'):
            self.stdout.write(self.style.SUCCESS("Telegram botning umumiy menu tugmasi muvaffaqiyatli 'commands' ga o'zgartirildi."))
        else:
            self.stdout.write(self.style.ERROR(f"Xatolik: {res.get('description') or res}"))
