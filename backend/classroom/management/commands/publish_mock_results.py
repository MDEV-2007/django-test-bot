"""Tugagan mock'lar bo'yicha reyting hisoblaydi va natijani yuboradi.

    python manage.py publish_mock_results

Har 5 daqiqada `sync_mock_statuses` va `close_expired_mock_attempts` bilan birga
ishga tushiriladi. Idempotent: natijasi e'lon qilingan mock ikkinchi marta
qayta ishlanmaydi va xabar takror ketmaydi.
"""
from django.core.management.base import BaseCommand

from classroom.results import publish_due_results


class Command(BaseCommand):
    help = "Tugagan mock'lar reytingini hisoblab, natijani o'quvchilarga yuboradi."

    def handle(self, *args, **options):
        published = publish_due_results()
        self.stdout.write(self.style.SUCCESS(f"{published} ta mock natijasi e'lon qilindi."))
