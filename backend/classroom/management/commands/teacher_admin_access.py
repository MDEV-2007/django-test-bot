"""O'qituvchiga Django admin huquqini beradi yoki olib qo'yadi.

    python manage.py teacher_admin_access --grant ustoz1
    python manage.py teacher_admin_access --revoke ustoz1

Nega buyruq, avtomatik emas: o'qituvchi bo'lib ro'yxatdan o'tish moderatsiyasiz, ya'ni
avtomatik `is_staff` xohlagan odamga admin eshigini ochib qo'yardi.
"""
from django.contrib.auth.models import User
from django.core.management.base import BaseCommand, CommandError

from classroom.permissions import grant_admin_access, revoke_admin_access


class Command(BaseCommand):
    help = "O'qituvchiga admin panelidan foydalanish huquqini beradi/olib qo'yadi."

    def add_arguments(self, parser):
        parser.add_argument('username')
        group = parser.add_mutually_exclusive_group(required=True)
        group.add_argument('--grant', action='store_true', help="Huquq beradi.")
        group.add_argument('--revoke', action='store_true', help="Huquqni olib qo'yadi.")

    def handle(self, *args, **options):
        username = options['username']
        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            raise CommandError(f"Foydalanuvchi topilmadi: {username}")

        teacher_profile = getattr(getattr(user, 'profile', None), 'teacher_profile', None)
        if options['grant'] and teacher_profile is None:
            raise CommandError(
                f"{username} o'qituvchi emas — avval o'qituvchi profilini yaratsin. "
                f"Aks holda admin ochiladi-yu, hech qanday sinf ko'rinmaydi."
            )

        if options['grant']:
            grant_admin_access(user)
            self.stdout.write(self.style.SUCCESS(f"{username} endi admin panelga kira oladi."))
        else:
            revoke_admin_access(user)
            self.stdout.write(self.style.SUCCESS(f"{username} ning admin huquqi olib qo'yildi."))
