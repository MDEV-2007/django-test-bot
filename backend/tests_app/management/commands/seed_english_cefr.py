"""Ingliz tili fanini va CEFR darajalarini yaratadi (idempotent).

    python manage.py seed_english_cefr

NIMA YARATADI
-------------
1. `Subject` — "Ingliz tili". Fan qo'shish uchun sxema o'zgarishi kerak emas: har bir
   TestSet allaqachon Subject'ga bog'langan (tests_app/models.py), shuning uchun bu
   shunchaki yangi qator.

2. Oltita `Topic` — A1, A2, B1, B2, C1, C2.

NEGA DARAJALAR "TOPIC" QILIB SAQLANADI
--------------------------------------
CEFR darajasi uchun alohida maydon qo'shish ham mumkin edi, lekin `Topic` allaqachon
aynan shu vazifani bajaradi: fanga bog'langan, tartiblangan bo'lim. Muhimi — savol
`Question.topic` orqali mavzuga bog'langanda, analitikadagi mavjud "mavzular kesimi"
(analytics/prediction.py `topic_breakdown`) hech qanday qo'shimcha kodsiz
"DARAJA bo'yicha o'zlashtirish"ga aylanadi: o'quvchi B1'da 78%, B2'da 41% ekanini
ko'radi. Bu CEFR o'quvchisi uchun eng qimmatli ko'rsatkich.

TESTLARNI YUKLASH
-----------------
Fan yaratilgach, mavjud import buyruqlari o'zgarishsiz ishlaydi:

    python manage.py import_qa_test savollar.json --subject "Ingliz tili" --category cefr
    python manage.py import_pdf_tests test.pdf   --subject "Ingliz tili" --category cefr

Savollarni darajaga bog'lash uchun import qilingandan keyin panelda mavzuni tanlang
(yoki `--topic` qo'llab-quvvatlanadigan importerdan foydalaning).
"""
from django.core.management.base import BaseCommand
from django.db import transaction

from learning.models import Topic
from tests_app.models import Subject

SUBJECT = {
    'slug': 'ingliz-tili',
    'name': 'Ingliz tili',
    # Lucide ikonkasi. Mavjud fanlar: book, pen-line, calculator, leaf.
    'icon_name': 'languages',
    # Mavjud ranglardan farqli (tarix amber, ona tili emerald, matematika ko'k,
    # biologiya yashil) — fanlar bir-biridan rang bilan ajralib tursin.
    'color': '#a855f7',
    'order': 5,
}

# CEFR darajalari. Tavsiflar o'quvchiga "men qayerdaman" degan savolga javob beradi.
LEVELS = [
    ('a1', 'A1 — Boshlang\'ich', "Eng oddiy iboralar, tanishuv, kundalik so'zlar."),
    ('a2', 'A2 — Elementar', "Oddiy jumlalar, o'tmish zamon, kundalik mavzular."),
    ('b1', 'B1 — O\'rta', "Fikrni bog'lab bayon qilish, matn mazmunini tushunish."),
    ('b2', 'B2 — O\'rtadan yuqori', "Murakkab matnlar, bahs-munozara, aniq grammatika."),
    ('c1', 'C1 — Ilg\'or', "Erkin va aniq nutq, akademik va kasbiy matnlar."),
    ('c2', 'C2 — Mukammal', "Ona tilida so'zlashuvchiga yaqin daraja."),
]


class _Silent:
    """`verbosity=0` uchun: yozishni yutadi, lekin `self.style...` bilan bezatilgan
    matnni ham qabul qiladi."""

    def write(self, *args, **kwargs):
        pass


class Command(BaseCommand):
    help = "Ingliz tili fanini va CEFR darajalarini (A1-C2) yaratadi."

    @transaction.atomic
    def handle(self, *args, **options):
        # `verbosity=0` bilan chaqirilganda (testlar, boshqa skriptlar) jim ishlaydi.
        if not options.get('verbosity', 1):
            self.stdout = _Silent()

        subject, created = Subject.objects.get_or_create(
            slug=SUBJECT['slug'],
            defaults={k: v for k, v in SUBJECT.items() if k != 'slug'},
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f"+ Fan yaratildi: {subject.name}"))
        else:
            # Mavjud qatorning nomi/ko'rinishini kanonik holatga keltiramiz, lekin
            # o'chirib qayta yaratmaymiz — unga testlar bog'langan bo'lishi mumkin.
            for field, value in SUBJECT.items():
                setattr(subject, field, value)
            subject.save()
            self.stdout.write(f"= Fan allaqachon bor, yangilandi: {subject.name}")

        made = 0
        for order, (slug, title, description) in enumerate(LEVELS, start=1):
            topic, topic_created = Topic.objects.get_or_create(
                slug=f"cefr-{slug}",
                defaults={
                    'title': title,
                    'description': description,
                    'subject': subject,
                    'category': 'cefr',
                    'order': order,
                    'icon_name': 'languages',
                },
            )
            if topic_created:
                made += 1
                self.stdout.write(f"  + {title}")
            else:
                # Fan bog'lanmagan bo'lsa (qo'lda yaratilgan bo'lsa) — bog'laymiz.
                if topic.subject_id != subject.id or topic.category != 'cefr':
                    topic.subject = subject
                    topic.category = 'cefr'
                    topic.save(update_fields=['subject', 'category'])
                self.stdout.write(f"  = {title} (bor edi)")

        self.stdout.write(self.style.SUCCESS(
            f"\nTayyor: {subject.name} + {made} ta yangi daraja "
            f"(jami {len(LEVELS)} ta CEFR darajasi)."
        ))
        self.stdout.write(
            "\nTest yuklash uchun:\n"
            '  python manage.py import_qa_test fayl.json --subject "Ingliz tili" --category cefr'
        )
