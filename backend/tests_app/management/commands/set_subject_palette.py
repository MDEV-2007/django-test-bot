"""Fan ranglarini past to'yingan (desaturated) tinch palitraga o'tkazadi.

    python manage.py set_subject_palette            # ko'rsatadi
    python manage.py set_subject_palette --apply

MUAMMO
------
Fan ranglari yorqin va to'yingan edi, ularning biri esa to'g'ridan-to'g'ri brend
oltini bilan bir xil:

    tarix        #f59e0b   <- oltin
    ona-tili     #10b981
    matematika   #2d6cff
    biologiya    #22c55e
    ingliz-tili  #a855f7

Oqibati: interfeysda oltin bir vaqtning o'zida PREMIUM, TANGA, STREAK va TARIX
degan to'rt xil ma'noni bildirardi. Bir rang to'rt narsani bildirsa, u hech
narsani bildirmaydi — aksent bo'lishdan to'xtab, oddiy rangga aylanadi.

Ustiga yorqin ranglar bir necha karta yonma-yon turganda bir-biri bilan
raqobatlashadi va ko'z qayerga qarashni bilmay qoladi.

YECHIM
------
Ikki qoida:

  1. Oltin FAQAT bitta rol uchun qoladi (premium / tanlangan / natija). Shuning
     uchun tarix oltindan uzoqlashtirildi.
  2. Fanlar past to'yingan, bir-biriga yaqin yorqinlikdagi ranglar oladi: ular
     bir-biridan ajralib turadi, lekin diqqatni tortish uchun kurashmaydi.

Ranglar `Subject.color` maydonida saqlanadi va butun interfeysga shu yerdan
tarqaladi (test kartalari naqshi, fan chiplari), shuning uchun bitta joyni
o'zgartirish kifoya — komponentlarga tegilmaydi.
"""
from django.core.management.base import BaseCommand

from tests_app.models import Subject

# Past to'yingan, yaqin yorqinlikdagi palitra. Hech biri oltinga (#f59e0b) yaqin
# emas — bu ataylab: oltin faqat premium/natija uchun qolishi kerak.
PALETTE = {
    'tarix': ('#a8846b', "iliq gil — me'morchilik va qadimiylik hissi, lekin oltin emas"),
    'ona-tili': ('#6f9c8a', "bosiq zumrad"),
    'matematika': ('#7089a8', "bosiq ko'k — aniqlik"),
    'biologiya': ('#7fa06f', "bosiq o't rangi"),
    'ingliz-tili': ('#907fa8', "bosiq siyohrang"),
}


class Command(BaseCommand):
    help = "Fan ranglarini tinch, past to'yingan palitraga o'tkazadi."

    def add_arguments(self, parser):
        parser.add_argument('--apply', action='store_true',
                            help="Bazaga yozadi. Berilmasa faqat ko'rsatadi.")

    def handle(self, *args, **options):
        apply_changes = options['apply']
        changed = 0

        for subject in Subject.objects.all().order_by('order', 'name'):
            target = PALETTE.get(subject.slug)
            if target is None:
                self.stdout.write(
                    f"  ? {subject.slug:<14} {subject.color}  (palitrada yo'q — tegilmadi)")
                continue

            color, reason = target
            if subject.color.lower() == color.lower():
                self.stdout.write(f"  = {subject.slug:<14} {color}")
                continue

            self.stdout.write(f"  ~ {subject.slug:<14} {subject.color} -> {color}  ({reason})")
            changed += 1
            if apply_changes:
                subject.color = color
                subject.save(update_fields=['color'])

        if not changed:
            self.stdout.write(self.style.SUCCESS("\nHamma fan allaqachon to'g'ri rangda."))
            return

        if apply_changes:
            self.stdout.write(self.style.SUCCESS(f"\n{changed} ta fan rangi yangilandi."))
        else:
            self.stdout.write(self.style.WARNING(
                f"\n[DRY-RUN] {changed} ta rang o'zgaradi. Yozish uchun: --apply"))
