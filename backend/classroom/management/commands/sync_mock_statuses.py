"""Mock holatlarini server vaqti bo'yicha yangilaydi (cron uchun).

    python manage.py sync_mock_statuses

Har 5 daqiqada ishga tushirilishi mumkin. KIRISH QARORI bunga bog'liq emas — u har
so'rovda `classroom.services.computed_status` orqali qaytadan hisoblanadi. Bu buyruq
faqat ro'yxatlar va admin paneli to'g'ri ko'rinishi uchun kerak.
"""
from django.core.management.base import BaseCommand

from classroom.services import sync_mock_statuses


class Command(BaseCommand):
    help = "Mock testlarning holatini (scheduled/live/finished) server vaqtiga moslaydi."

    def handle(self, *args, **options):
        changed = sync_mock_statuses()
        self.stdout.write(self.style.SUCCESS(f"{changed} ta mock holati yangilandi."))
