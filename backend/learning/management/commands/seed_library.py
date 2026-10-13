"""Django management command: Kutubxona uchun maktab darsliklari va qo'llanmalarni bazaga yuklash.

Foydalanish:
    python manage.py seed_library
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from django.contrib.auth.models import User

from learning.models import Book
from tests_app.models import Subject


class Command(BaseCommand):
    help = "Kutubxona uchun 5-11-sinf darsliklari, tarix spravochniklari va qo'llanmalarni bazaga kiritadi."

    @transaction.atomic
    def handle(self, *args, **options):
        # 1. Fanlar
        subj_tarix, _ = Subject.objects.get_or_create(slug="tarix", defaults={"name": "Tarix", "color": "#a8846b", "icon_name": "landmark"})
        subj_onatili, _ = Subject.objects.get_or_create(slug="ona-tili", defaults={"name": "Ona tili", "color": "#10b981", "icon_name": "book-open"})
        subj_matem, _ = Subject.objects.get_or_create(slug="matematika", defaults={"name": "Matematika", "color": "#3b82f6", "icon_name": "calculator"})
        subj_ingliz, _ = Subject.objects.get_or_create(slug="ingliz-tili", defaults={"name": "Ingliz tili", "color": "#8b5cf6", "icon_name": "languages"})

        teacher_user = User.objects.filter(username="shohjahon").first() or User.objects.filter(is_superuser=True).first()

        books_data = [
            # ── 1. O'ZBEKISTON TARIXI VA JAHON TARIXI DARSLIKLARI ───────────────
            {
                "title": "Tarixdan hikoyalar (5-sinf darsligi)",
                "author": "A. Muhammadjonov",
                "subject": subj_tarix,
                "category": "textbook",
                "grade": "5",
                "year": 2021,
                "page_count": 144,
                "file_size": "14.2 MB",
                "description": "5-sinf o'quvchilari uchun O'zbekiston va jahon sivilizatsiyasi ilk qadamlari haqidagi boshlang'ich darslik.",
                "cover_color": "from-amber-600 to-amber-900",
                "views_count": 420,
                "downloads_count": 180,
            },
            {
                "title": "Qadimgi Dunyo Tarixi (6-sinf darsligi)",
                "author": "A. Sa'dullayev, V. Kostetskiy",
                "subject": subj_tarix,
                "category": "textbook",
                "grade": "6",
                "year": 2022,
                "page_count": 176,
                "file_size": "18.5 MB",
                "description": "Qadimgi Sharq, Yunoniston, Rim imperiyasi va O'rta Osiyo qadimgi davlatlari (Baqtriya, Xorazm, So'g'd).",
                "cover_color": "from-yellow-600 to-amber-900",
                "views_count": 890,
                "downloads_count": 340,
            },
            {
                "title": "O'zbekiston Tarixi: O'rta asrlar (7-sinf darsligi)",
                "author": "A. Muhammadjonov",
                "subject": subj_tarix,
                "category": "textbook",
                "grade": "7",
                "year": 2022,
                "page_count": 192,
                "file_size": "21.0 MB",
                "description": "Turk xoqonligi, Eftaliylar, Somoniylar, Qoraxoniylar, Xorazmshohlar davlati va mo'g'ullar istilosi davri.",
                "cover_color": "from-emerald-600 to-teal-900",
                "views_count": 1420,
                "downloads_count": 680,
            },
            {
                "title": "Jahon Tarixi: O'rta asrlar (7-sinf darsligi)",
                "author": "T. Salimov, F. Sultonov",
                "subject": subj_tarix,
                "category": "textbook",
                "grade": "7",
                "year": 2022,
                "page_count": 176,
                "file_size": "17.4 MB",
                "description": "V-XV asrlarda Yevropa, Arab xalifaligi, Vizantiya imperiyasi, salb yurishlari va Osiyo davlatlari.",
                "cover_color": "from-teal-600 to-emerald-950",
                "views_count": 910,
                "downloads_count": 420,
            },
            {
                "title": "O'zbekiston Tarixi: XVI-XIX asr o'rtalari (8-sinf darsligi)",
                "author": "H. Ziyoyev",
                "subject": subj_tarix,
                "category": "textbook",
                "grade": "8",
                "year": 2021,
                "page_count": 208,
                "file_size": "22.3 MB",
                "description": "Buxoro amirligi, Xiva xonligi va Qo'qon xonligi davri tarixi, madaniyati va ijtimoiy-siyosiy hayoti.",
                "cover_color": "from-blue-600 to-indigo-900",
                "views_count": 1150,
                "downloads_count": 510,
            },
            {
                "title": "Jahon Tarixi: Yangi davr (8-sinf darsligi)",
                "author": "A. Ergashev",
                "subject": subj_tarix,
                "category": "textbook",
                "grade": "8",
                "year": 2021,
                "page_count": 192,
                "file_size": "19.8 MB",
                "description": "Buyuk geografik kashfiyotlar, Yevropada burjua inqiloblari va sanoat to'ntarilishi davri.",
                "cover_color": "from-indigo-600 to-slate-900",
                "views_count": 780,
                "downloads_count": 320,
            },
            {
                "title": "O'zbekiston Tarixi: XIX asr oxiri - XX asr boshi (9-sinf darsligi)",
                "author": "N. Jo'rayev",
                "subject": subj_tarix,
                "category": "textbook",
                "grade": "9",
                "year": 2020,
                "page_count": 192,
                "file_size": "20.1 MB",
                "description": "Chor Rossiyasi mustamlakachiligi davri, jadidchilik harakati va Turkistondagi milliy ozodlik kurashlari.",
                "cover_color": "from-violet-600 to-purple-950",
                "views_count": 1340,
                "downloads_count": 590,
            },
            {
                "title": "Jahon Tarixi (9-sinf darsligi)",
                "author": "M. Lafasov",
                "subject": subj_tarix,
                "category": "textbook",
                "grade": "9",
                "year": 2020,
                "page_count": 192,
                "file_size": "19.5 MB",
                "description": "1870-yildan Birinchi jahon urushi yakunigacha bo'lgan davrdagi xalqaro munosabatlar va davlatlar tarixi.",
                "cover_color": "from-purple-700 to-indigo-950",
                "views_count": 690,
                "downloads_count": 270,
            },
            {
                "title": "O'zbekiston Tarixi (10-sinf darsligi)",
                "author": "Q. Rajabov",
                "subject": subj_tarix,
                "category": "textbook",
                "grade": "10",
                "year": 2022,
                "page_count": 224,
                "file_size": "24.6 MB",
                "description": "1917-1991-yillarda O'zbekiston sovet mustabid tuzumi davrida: qatag'onlar, Ikkinchi jahon urushi va qayta qurish.",
                "cover_color": "from-rose-600 to-red-950",
                "views_count": 1620,
                "downloads_count": 730,
            },
            {
                "title": "O'zbekiston Tarixi: Eng yangi tarix (11-sinf darsligi)",
                "author": "Q. Rajabov",
                "subject": subj_tarix,
                "category": "textbook",
                "grade": "11",
                "year": 2023,
                "page_count": 208,
                "file_size": "23.0 MB",
                "description": "O'zbekiston Respublikasining mustaqillik yillari, ijtimoiy-iqtisodiy islohotlar va xalqaro nufuzining yuksalishi.",
                "cover_color": "from-cyan-600 to-blue-950",
                "views_count": 2100,
                "downloads_count": 940,
            },

            # ── 2. EKSKLYUZIV QO'LLANMALAR VA SPRAVOCHNIKLAR ───────────────
            {
                "title": "Tarix: Milliy Sertifikat uchun to'liq spravochnik & konspektlar",
                "author": "Sodiqov Shohjahon (@TarixMilliyCertificate)",
                "subject": subj_tarix,
                "category": "manual",
                "grade": "abiturient",
                "year": 2026,
                "page_count": 184,
                "file_size": "15.4 MB",
                "description": "Milliy sertifikat va BBA imtihonlariga tayyorlanayotganlar uchun barcha davlatlar, sulolalar va qonunlar to'plami.",
                "cover_color": "from-amber-500 to-orange-900",
                "is_premium": False,
                "views_count": 3450,
                "downloads_count": 1620,
            },
            {
                "title": "Tarixiy sanalar, janglar va sulolalar xronologik jadvali",
                "author": "Sodiqov Shohjahon",
                "subject": subj_tarix,
                "category": "tables",
                "grade": "all",
                "year": 2026,
                "page_count": 64,
                "file_size": "8.2 MB",
                "description": "Mil. avv. davrdan XXI asrgacha bo'lgan barcha muhim janglar, sulola hukmdorlari va tinchlik shartnomalari tizimli jadvali.",
                "cover_color": "from-emerald-500 to-green-950",
                "views_count": 2890,
                "downloads_count": 1410,
            },
            {
                "title": "BBA va Milliy Sertifikat: 1000 ta saralangan qiyin savollar tahlili",
                "author": "Sodiqov Shohjahon",
                "subject": subj_tarix,
                "category": "collection",
                "grade": "abiturient",
                "year": 2026,
                "page_count": 240,
                "file_size": "26.8 MB",
                "description": "Yiqituvchi savollar, xarita va rasmga asoslangan topshiriqlar, xronologik moslashtirish testlari tahlili bilan.",
                "cover_color": "from-purple-600 to-indigo-950",
                "is_premium": True,
                "views_count": 4200,
                "downloads_count": 1980,
            },

            # ── 3. ONA TILI VA ADABIYOT ──────────────────────────────────────────
            {
                "title": "Ona tili va Adabiyot: Qoidalar va tahlillar spravochnigi",
                "author": "IlmIldizi Akademiyasi",
                "subject": subj_onatili,
                "category": "manual",
                "grade": "abiturient",
                "year": 2025,
                "page_count": 136,
                "file_size": "12.0 MB",
                "description": "Fonetika, leksikologiya, morfologiya va sintaksis qoidalari, adabiyotdan badiiy san'atlar va asarlar tahlili.",
                "cover_color": "from-teal-600 to-slate-900",
                "views_count": 1780,
                "downloads_count": 820,
            },

            # ── 4. MATEMATIKA VA INGLIZ TILI ────────────────────────────────────
            {
                "title": "Matematika: BBA va Milliy Sertifikat formulalar to'plami",
                "author": "IlmIldizi Matematika Kafedrasi",
                "subject": subj_matem,
                "category": "tables",
                "grade": "all",
                "year": 2025,
                "page_count": 48,
                "file_size": "6.5 MB",
                "description": "Algebra, geometriya va trigonometriyaning barcha zaruriy formulalari va qisqa amaliy namunalari.",
                "cover_color": "from-blue-600 to-sky-950",
                "views_count": 2340,
                "downloads_count": 1120,
            },
            {
                "title": "CEFR B2-C1 Essential Vocabulary & Grammar Guide",
                "author": "IlmIldizi Language Lab",
                "subject": subj_ingliz,
                "category": "manual",
                "grade": "abiturient",
                "year": 2025,
                "page_count": 160,
                "file_size": "14.8 MB",
                "description": "Multilevel va CEFR imtihonlariga tayyorlanish uchun ilg'or so'zlar, idiomalar, collocations va grammatika qoidalari.",
                "cover_color": "from-fuchsia-600 to-purple-950",
                "views_count": 1920,
                "downloads_count": 910,
            },
        ]

        created_count = 0
        for item in books_data:
            book, created = Book.objects.get_or_create(
                title=item["title"],
                defaults={
                    "author": item["author"],
                    "subject": item["subject"],
                    "category": item["category"],
                    "grade": item["grade"],
                    "year": item["year"],
                    "page_count": item["page_count"],
                    "file_size": item["file_size"],
                    "description": item["description"],
                    "cover_color": item["cover_color"],
                    "is_premium": item.get("is_premium", False),
                    "is_published": True,
                    "views_count": item.get("views_count", 0),
                    "downloads_count": item.get("downloads_count", 0),
                    "created_by": teacher_user,
                }
            )
            if created:
                created_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"\n🎉 KUTUBXONA TAYYOR! Jami {len(books_data)} ta kitob va qo'llanma tekshirildi/yuklandi (Yangi yaratilgan: {created_count} ta)."
            )
        )
