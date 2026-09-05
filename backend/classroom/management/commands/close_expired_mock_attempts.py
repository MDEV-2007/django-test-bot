"""Vaqti tugagan, lekin topshirilmagan mock urinishlarini yakunlaydi.

    python manage.py close_expired_mock_attempts

Har 5 daqiqada `sync_mock_statuses` bilan birga ishga tushiriladi. Brauzerni yopib
ketgan o'quvchining ishi shu yerda baholanadi va reytingga kiradi.
"""
from django.core.management.base import BaseCommand

from classroom.grading import close_expired_attempts


class Command(BaseCommand):
    help = "Muddati o'tgan mock urinishlarini yakunlaydi."

    def handle(self, *args, **options):
        closed = close_expired_attempts()
        self.stdout.write(self.style.SUCCESS(f"{closed} ta urinish yakunlandi."))
