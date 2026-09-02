"""Texnik ishlar rejimini terminaldan boshqaradi — panel ishlamay qolgan holat uchun.

    python manage.py maintenance_mode          # holatni ko'rsatadi
    python manage.py maintenance_mode off      # o'chiradi
    python manage.py maintenance_mode on       # yoqadi

NEGA KERAK
----------
Rejimni odatda panel orqali o'chiriladi. Lekin bir marta shunday bo'ldi: rejim
yoqilgach, panelning O'ZI ishlamay qoldi (middleware `/api/panel/` ni ham bloklab
qo'ygan edi), ya'ni rejimni o'chiradigan yagona tugmaga yetib bo'lmasdi.

Bu komanda o'sha holatdan chiqish yo'li: u HTTP qatlamidan butunlay tashqarida
ishlaydi, shuning uchun middleware qanday sozlangan bo'lishidan qat'i nazar ishlaydi.

Keshni ham tozalaydi: `SiteSettings` obyekti ham, `maintenance_mode` bayrog'i ham
alohida keshlanadi (qarang: panel/models.py va panel/middleware.py), shuning uchun
faqat bazani o'zgartirish kifoya emas — eski qiymat 30 soniyagacha yashab qolardi.
"""
from django.core.cache import cache
from django.core.management.base import BaseCommand

from panel.models import SiteSettings


class Command(BaseCommand):
    help = "Texnik ishlar rejimini ko'rsatadi/yoqadi/o'chiradi."

    def add_arguments(self, parser):
        parser.add_argument(
            'state', nargs='?', choices=['on', 'off'], default=None,
            help="Berilmasa — faqat joriy holat ko'rsatiladi.",
        )

    def handle(self, *args, **options):
        settings_obj = SiteSettings.load()
        state = options['state']

        if state is None:
            current = 'YOQILGAN' if settings_obj.maintenance_mode else "o'chirilgan"
            self.stdout.write(f"Texnik ishlar rejimi: {current}")
            if settings_obj.maintenance_mode:
                self.stdout.write(self.style.WARNING(
                    "O'chirish uchun: python manage.py maintenance_mode off"))
            return

        want = state == 'on'
        if settings_obj.maintenance_mode == want:
            self.stdout.write(f"Rejim allaqachon {'yoqilgan' if want else "o'chirilgan"}.")
            return

        settings_obj.maintenance_mode = want
        settings_obj.save()
        # `save()` SiteSettings keshini yangilaydi, lekin middleware'ning alohida
        # bayrog'ini emas — usiz o'zgarish 30 soniyagacha kuchga kirmasdi.
        cache.delete('maintenance_mode')

        if want:
            self.stdout.write(self.style.WARNING(
                "Texnik ishlar rejimi YOQILDI — oddiy foydalanuvchilar uchun sayt yopiq."))
        else:
            self.stdout.write(self.style.SUCCESS(
                "Texnik ishlar rejimi o'chirildi — sayt hamma uchun ochiq."))
