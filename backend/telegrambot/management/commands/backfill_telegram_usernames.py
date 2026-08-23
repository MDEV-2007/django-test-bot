"""Mavjud hisoblarning Telegram @nomini Telegram'dan so'rab to'ldiradi.

Nega kerak: @nom ilgari faqat hisob birinchi marta yaratilganda yozilardi, ya'ni undan
oldin ro'yxatdan o'tganlarda maydon bo'sh. Panelda ular `tg_<id>` bo'lib ko'rinardi.
Kod tuzatilgach ham bu odamlar ilovaga qayta kirmaguncha maydon bo'sh qolaveradi —
bu buyruq esa ularni birdaniga to'ldiradi.

Ishlatish:
    docker compose exec web python manage.py backfill_telegram_usernames
    docker compose exec web python manage.py backfill_telegram_usernames --dry-run
    docker compose exec web python manage.py backfill_telegram_usernames --all

Telegram `getChat` faqat bot bilan aloqada bo'lgan foydalanuvchilarni biladi; boshqalar
uchun xato qaytadi va o'sha hisob shunchaki o'tkazib yuboriladi.
"""
import time

from django.core.management.base import BaseCommand

from accounts.models import Profile
from telegrambot.client import api_call


class Command(BaseCommand):
    help = "Profillardagi bo'sh telegram_username maydonini Telegram'dan to'ldiradi."

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run', action='store_true',
            help="Hech narsa saqlamaydi, faqat nima o'zgarishini ko'rsatadi.",
        )
        parser.add_argument(
            '--all', action='store_true',
            help="Bo'shlarni emas, telegram_id'si bor barcha hisoblarni tekshiradi "
                 "(kimdir @nomini o'zgartirgan bo'lsa).",
        )
        parser.add_argument(
            '--sleep', type=float, default=0.15,
            help="So'rovlar orasidagi tanaffus, soniya (standart 0.15).",
        )

    def handle(self, *args, **options):
        profiles = Profile.objects.exclude(telegram_id__isnull=True).exclude(telegram_id='')
        if not options['all']:
            profiles = profiles.filter(telegram_username__in=['', None])
        profiles = profiles.select_related('user').order_by('id')

        total = profiles.count()
        if not total:
            self.stdout.write("To'ldirish kerak bo'lgan hisob yo'q.")
            return

        self.stdout.write(f"Tekshiriladi: {total} ta hisob")
        updated = skipped = failed = 0

        for profile in profiles.iterator():
            res = api_call('getChat', chat_id=profile.telegram_id)
            if not res.get('ok'):
                # Bot bilan hech qachon yozishmagan foydalanuvchi — normal holat.
                failed += 1
                continue

            username = (res['result'].get('username') or '').lstrip('@')
            if not username:
                # Telegram'da @nom umuman qo'yilmagan.
                skipped += 1
            elif username != (profile.telegram_username or ''):
                self.stdout.write(f"  {profile.user.username} -> @{username}")
                if not options['dry_run']:
                    profile.telegram_username = username
                    profile.save(update_fields=['telegram_username'])
                updated += 1
            else:
                skipped += 1

            # Telegram sekundiga ~30 ta so'rovga ruxsat beradi; shoshilmaymiz.
            time.sleep(options['sleep'])

        prefix = '(sinov) ' if options['dry_run'] else ''
        self.stdout.write(self.style.SUCCESS(
            f"{prefix}Yangilandi: {updated} | @nomi yo'q yoki o'zgarmagan: {skipped} | "
            f"Telegram javob bermadi: {failed}"
        ))
