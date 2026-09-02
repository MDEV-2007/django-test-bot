"""Uzun test sarlavhalarini qidiriladigan, skanerlanadigan ko'rinishga keltiradi.

    python manage.py shorten_test_titles              # faqat ko'rsatadi (dry-run)
    python manage.py shorten_test_titles --apply      # yozadi
    python manage.py shorten_test_titles --max-len 40 --apply

MUAMMO
------
PDF'dan import qilingan testlar darslik bo'limining TO'LIQ nomini sarlavha qilib
oladi, masalan (156 belgi):

    7-sinf DMT: O'zbekiston tarixi (IV-XV asrlar) — 8-qism: Amir Temur —
    markazlashgan davlat asoschisi, davlat va harbiy boshqaruv tizimi (XIV—XV asr
    boshlari)

Bu darslik mundarijasining tili. Abituriyent esa katalogda "DMT Tarix 8-qism" kabi
qisqa nomni skanerlaydi. Uzun sarlavha karta ichida 4 qatorga cho'zilib ekranni
yeydi va ro'yxatni o'qib bo'lmaydigan qiladi.

QOIDA
-----
Sarlavha uch bo'lakka ajratiladi:

    {bosh qism}:  {umumiy mavzu} (…)  —  {N}-qism:  {batafsil tavsif} (…)
    ^^^^^^^^^^^                          ^^^^^^^^^   ^^^^^^^^^^^^^^^^^
    saqlanadi                            saqlanadi   qisqartiriladi

Natija: `7-sinf DMT — 8-qism: Amir Temur`

`N-qism` belgisi bo'lmasa, umumiy mavzuning dastlabki so'zlari olinadi.
Qavs ichidagi sana oralig'i ("(XIV—XV asr boshlari)") tashlanadi — u sarlavhada
emas, tavsifda turishi kerak.

MA'LUMOT YO'QOLMAYDI
--------------------
To'liq eski sarlavha `description` maydoniga ko'chiriladi (faqat u BO'SH bo'lsa —
mavjud tavsif hech qachon ustidan yozilmaydi). Ya'ni sana oralig'i va batafsil
mavzu nomi test kartasida ko'rinishda qoladi, shunchaki sarlavhadan tavsifga
tushadi.

XAVFSIZLIK
----------
Sukut bo'yicha HECH NIMA yozilmaydi: komanda eski -> yangi jadvalni chiqaradi,
siz ko'rib chiqasiz, keyin `--apply` bilan qayta ishga tushirasiz. Yangi sarlavha
takrorlanib qolsa (ikki test bir xil nom olsa), mavzudan yana bir so'z qo'shiladi.
"""
import re

from django.core.management.base import BaseCommand

from tests_app.models import TestSet

# Sarlavhadagi "8-qism", "8 - qism" kabi bo'lak belgisi.
PART_RE = re.compile(r'(\d+)\s*-\s*qism', re.IGNORECASE)
# Qavs ichidagi hamma narsa: "(IV-XV asrlar)", "(1-5-mavzular)", "(davomi)".
PARENS_RE = re.compile(r'\([^)]*\)')
# Em/en dash va oddiy tire — hammasi ajratuvchi sifatida bir xil ishlaydi.
DASH_RE = re.compile(r'\s*[—–]\s*')


# Mavzu bog'lovchi bilan tugab qolmasin ("Amir Temur va" -> "Amir Temur").
TRAILING_WORDS = {'va', 'bilan', 'hamda', 'yoki', 'hamda'}
# Chetlardan olib tashlanadigan tinish belgilari (tire va em-dash ham shu yerda —
# "Amir Temur —" kabi osilib qolgan ajratuvchini oldini oladi).
STRIP_CHARS = " \t:;,.—–-"


def _clean(text):
    """Qavslarni olib tashlaydi, ortiqcha tinish va bo'shliqni tozalaydi."""
    text = PARENS_RE.sub(' ', text)
    text = re.sub(r'\s+', ' ', text)
    return text.strip(STRIP_CHARS)


def _first_words(text, count):
    words = _clean(text).split()
    picked = words[:count]
    while picked and picked[-1].lower().strip(STRIP_CHARS) in TRAILING_WORDS:
        picked.pop()
    return ' '.join(picked).strip(STRIP_CHARS)


def shorten(title, max_len=48, topic_words=3, enforce_max=True):
    """Bitta sarlavhani qisqartiradi. Allaqachon qisqa bo'lsa — o'zgarishsiz qaytaradi.

    `enforce_max` — natija `max_len`ga sig'guncha mavzu so'zlari birma-bir olib
    tashlanadi. Takrorlanishni bartaraf etish uchun ataylab uzunroq variant kerak
    bo'lganda chaqiruvchi buni False qilib berishi mumkin."""
    title = re.sub(r'\s+', ' ', title).strip()
    if len(title) <= max_len:
        return title

    part_match = PART_RE.search(title)

    # Bosh qism: birinchi ":" gacha ("7-sinf DMT"). ":" bo'lmasa — birinchi tire gacha.
    if ':' in title:
        head = title.split(':', 1)[0]
    else:
        head = DASH_RE.split(title, 1)[0]
    head = _clean(head)

    if part_match:
        part_no = part_match.group(1)
        mid = title[len(head):part_match.start()]
        detail = title[part_match.end():]
        base = f"{head} — {part_no}-qism"
        sources = [detail, mid]
    else:
        # Bo'lak raqami yo'q: ":" dan keyingi mavzuning dastlabki so'zlari.
        base = head
        sources = [title.split(':', 1)[1] if ':' in title else title[len(head):]]

    def build(n):
        for src in sources:
            topic = _first_words(src, n)
            if topic:
                return f"{base}: {topic}"
        return base

    result = build(topic_words)
    # Uzun so'zli mavzular ("Tohiriylar, Somoniylar, G'aznaviylar") chegaradan oshib
    # ketadi — sig'guncha so'z kamaytiriladi, lekin kamida bitta so'z qoldiriladi.
    if enforce_max:
        n = topic_words
        while len(result) > max_len and n > 1:
            n -= 1
            result = build(n)
    return result


class Command(BaseCommand):
    help = "Uzun test sarlavhalarini qisqartiradi (sukut bo'yicha dry-run)."

    def add_arguments(self, parser):
        parser.add_argument('--apply', action='store_true',
                            help="Bazaga yozadi. Berilmasa faqat ko'rsatadi.")
        parser.add_argument('--max-len', type=int, default=48,
                            help="Shu uzunlikdan uzun sarlavhalar qisqartiriladi (sukut: 48).")
        parser.add_argument('--include-drafts', action='store_true',
                            help="Nashr qilinmagan (qoralama) testlarni ham qamrab oladi.")

    def handle(self, *args, **options):
        apply_changes = options['apply']
        max_len = options['max_len']

        # `is_random` — tasodifiy testlar uchun har safar yaratiladigan bir martalik
        # qatorlar; ular katalogda ko'rinmaydi, shuning uchun tegilmaydi.
        qs = TestSet.objects.filter(is_random=False)
        if not options['include_drafts']:
            qs = qs.filter(is_published=True)

        taken = set(TestSet.objects.values_list('title', flat=True))
        changed = 0

        for test in qs.order_by('id'):
            if len(test.title) <= max_len:
                continue

            new_title = shorten(test.title, max_len=max_len)
            # Takrorlanish: mavzudan yana bir so'z qo'shib ko'ramiz. Bu yerda uzunlik
            # chegarasi bo'shatiladi — bir xil nomli ikki test chiqib qolgandan ko'ra
            # bir necha belgi uzunroq, lekin farqli sarlavha yaxshiroq.
            words = 3
            while new_title in taken and new_title != test.title and words < 8:
                words += 1
                new_title = shorten(test.title, max_len=max_len,
                                    topic_words=words, enforce_max=False)
            if new_title == test.title or new_title in taken:
                self.stdout.write(self.style.WARNING(
                    f"#{test.id}: noyob qisqa nom topilmadi, o'tkazib yuborildi."))
                continue

            changed += 1
            self.stdout.write(f"\n#{test.id}")
            self.stdout.write(f"  eski ({len(test.title)}): {test.title}")
            self.stdout.write(f"  yangi ({len(new_title)}): {new_title}")
            if not test.description:
                self.stdout.write("  -> to'liq sarlavha tavsifga ko'chiriladi")

            if apply_changes:
                if not test.description:
                    test.description = test.title
                    test.title = new_title
                    test.save(update_fields=['title', 'description'])
                else:
                    test.title = new_title
                    test.save(update_fields=['title'])
            taken.discard(test.title)
            taken.add(new_title)

        if changed == 0:
            self.stdout.write(self.style.SUCCESS(
                f"\n{max_len} belgidan uzun sarlavha topilmadi — hammasi joyida."))
            return

        if apply_changes:
            self.stdout.write(self.style.SUCCESS(f"\n{changed} ta sarlavha qisqartirildi."))
        else:
            self.stdout.write(self.style.WARNING(
                f"\n[DRY-RUN] {changed} ta sarlavha o'zgaradi. Yozish uchun: --apply"))
