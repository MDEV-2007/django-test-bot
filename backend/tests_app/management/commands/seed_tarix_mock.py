"""Django management command: 6-sinf Tarix Milliy Sertifikat 45 talik mock testini yaratish.

Foydalanish:
    python manage.py seed_tarix_mock
    python manage.py seed_tarix_mock --force
"""
from datetime import datetime
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from tests_app.models import Subject, TestSet, Question, AnswerOption, SubQuestion


MOCK_TITLE = "6-sinf Qadimgi Dunyo Tarixi — Milliy Sertifikat Namunaviy Mock Imtihon"
MOCK_DESC = (
    "11–20-mavzular: Mesopotamiya, Old Osiyo, Ahamoniylar, Qadimgi Hindiston-Xitoy, "
    "O'zbekiston hududidagi ilk davlatlar, Zardushtiylik. "
    "35 ta test topshirig'i (A, B, C, D) va 10 ta yozma (ochiq) savol. Jami: 45 ta topshiriq."
)


class Command(BaseCommand):
    help = "Tarix fanidan 45 talik Milliy Sertifikat mock imtihonini bazaga to'liq yuklaydi."

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help="Agar mavjud bo'lsa, eski testni o'chirib qayta yaratadi.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        force = options.get('force', False)
        subject, _ = Subject.objects.get_or_create(slug="tarix", defaults={"name": "Tarix"})

        existing = TestSet.objects.filter(title=MOCK_TITLE).first()
        if existing:
            if force:
                self.stdout.write(f"Eski '{MOCK_TITLE}' (#{existing.id}) o'chirilmoqda...")
                existing.delete()
            else:
                self.stdout.write(
                    self.style.WARNING(
                        f"'{MOCK_TITLE}' allaqachon mavjud (ID: {existing.id}). "
                        f"Qayta yaratish uchun --force bayrog'ini ishlating: python manage.py seed_tarix_mock --force"
                    )
                )
                return

        # Ertaga soat 21:30 (Toshkent vaqti)
        toshkent_tz = timezone.get_current_timezone()
        # Masalan ertangi kun soat 21:30
        now = timezone.now().astimezone(toshkent_tz)
        tomorrow = now + timezone.timedelta(days=1)
        scheduled_at = datetime(
            tomorrow.year, tomorrow.month, tomorrow.day, 21, 30, 0, tzinfo=toshkent_tz
        )

        test_set = TestSet.objects.create(
            title=MOCK_TITLE,
            description=MOCK_DESC,
            subject=subject,
            category="certificate",
            duration_minutes=90,
            is_live_mock=True,
            scheduled_at=scheduled_at,
            is_published=True,
            is_premium=False,
        )

        questions = []

        # -------------------------------------------------------------
        # I QISM: TEST TOPSHIRIQLARI (1 - 35)
        # -------------------------------------------------------------
        mcq_data = [
            {
                "body": "Quyidagilardan nomuvofiqlik saqlangan javobni aniqlang.",
                "options": [
                    ("A", "Xammurapi — Bobil podshosi, qonunlar tuzgan birinchi hukmdor", False),
                    ("B", "Oshshurbanapal — Ossuriya hukmdori, Nineviyada kutubxona to'plagan", False),
                    ("C", "Gilgamish — Fors davlati hukmdori", True),
                    ("D", "Kiaksar — Midiya podshosi", False),
                ],
            },
            {
                "body": (
                    "Quyidagi hukmdorlar va ular bilan bog'liq ma'lumotlar mos ravishda berilgan javobni aniqlang.\n"
                    "1) Sargon I\n"
                    "2) Xammurapi\n"
                    "3) Kir II\n"
                    "4) Doro I\n"
                    "a) Fors davlatiga asos solgan, Midiya va Bobilni zabt etgan\n"
                    "b) Akkad va Shumerni birlashtirib, muntazam qo'shin tuzgan\n"
                    "c) Saltanatni satrapliklarga bo'lgan, \"darik\" tangasini joriy etgan\n"
                    "d) Mesopotamiyani birlashtirib, qonunlar tuzgan"
                ),
                "options": [
                    ("A", "1-b; 2-d; 3-a; 4-c", True),
                    ("B", "1-a; 2-b; 3-c; 4-d", False),
                    ("C", "1-c; 2-a; 3-d; 4-b", False),
                    ("D", "1-b; 2-a; 3-d; 4-c", False),
                ],
            },
            {
                "body": "Yunonlar Dajla va Frot daryolari oralig'idagi vodiyni qanday atashgan?",
                "options": [
                    ("A", "Mesopotamiya", True),
                    ("B", "Baqtriana", False),
                    ("C", "Xorasmiya", False),
                    ("D", "Persepol", False),
                ],
            },
            {
                "body": (
                    "Quyidagi voqealar to'g'ri xronologik ketma-ketlikda ko'rsatilgan javobni toping.\n"
                    "1) Sargon I Akkad va Shumerni birlashtirdi (mil.avv. 3-ming yillik ikkinchi yarmi)\n"
                    "2) Xammurapi Mesopotamiyani birlashtirdi (mil.avv. XVIII asr)\n"
                    "3) Ossuriya Bobil va Midiya tomonidan bosib olindi (mil.avv. 605)\n"
                    "4) Bobil forslar tomonidan zabt etildi (mil.avv. 539)\n"
                    "5) Kir II Fors davlatiga asos soldi (mil.avv. 558)\n"
                    "6) Doro I taxtga chiqdi (mil.avv. 522)"
                ),
                "options": [
                    ("A", "1, 2, 3, 5, 4, 6", True),
                    ("B", "1, 2, 3, 4, 5, 6", False),
                    ("C", "2, 1, 3, 5, 4, 6", False),
                    ("D", "1, 2, 5, 3, 4, 6", False),
                ],
            },
            {
                "body": (
                    "Quyida berilgan Mesopotamiya xudolari va ularning izohi to'g'ri moslashtirilgan javobni toping.\n"
                    "I Shamash\n"
                    "II Sin\n"
                    "III Ea\n"
                    "IV Ishtar\n"
                    "a Quyosh xudosi, oliy hakam\n"
                    "b Oy xudosi\n"
                    "c Suv xudosi\n"
                    "d Hosildorlik, sevgi, urush va g'alaba ilohasi\n"
                    "e Yerosti saltanati xudosi"
                ),
                "options": [
                    ("A", "I-a, II-b, III-c, IV-d", True),
                    ("B", "I-b, II-a, III-c, IV-d", False),
                    ("C", "I-a, II-c, III-b, IV-d", False),
                    ("D", "I-a, II-b, III-d, IV-c", False),
                ],
            },
            {
                "body": (
                    "Quyida berilgan Hindiston tabaqalari (varnalar) va ularning izohi to'g'ri moslashtirilgan javobni toping.\n"
                    "I Braxmanlar\n"
                    "II Kshatriylar\n"
                    "III Vayshiylar\n"
                    "IV Shudralar\n"
                    "a Kohinlar, hind ruhoniylari\n"
                    "b Jangchilar\n"
                    "c Dehqon, hunarmand va savdogarlar\n"
                    "d Xizmatkorlar va qullar\n"
                    "e Hech qaysi tabaqaga mansub bo'lmaganlar"
                ),
                "options": [
                    ("A", "I-a, II-b, III-c, IV-d", True),
                    ("B", "I-b, II-a, III-c, IV-d", False),
                    ("C", "I-a, II-c, III-b, IV-d", False),
                    ("D", "I-a, II-b, III-d, IV-c", False),
                ],
            },
            {
                "body": (
                    "Tarixiy shaxsni aniqlang. Uruk shahri podshosi bo'lgan, Mesopotamiya rivoyatlarining eng sevimli qahramoni. "
                    "U boqiy hayotga erishish uchun sehrli giyoh izlagan, ammo ilon uni o'g'irlab ketgan."
                ),
                "options": [
                    ("A", "Gilgamish", True),
                    ("B", "Sargon I", False),
                    ("C", "Xammurapi", False),
                    ("D", "Oshshurbanapal", False),
                ],
            },
            {
                "body": (
                    "Tarixiy shaxsni aniqlang. U mil.avv. 522-yilda Fors taxtiga chiqdi, saltanatni satrapliklarga bo'ldi, "
                    "\"darik\" oltin tangasini joriy etdi va Persepoldan boshlangan \"shoh yo'li\"ni qurdirdi."
                ),
                "options": [
                    ("A", "Doro I", True),
                    ("B", "Kir II", False),
                    ("C", "Kambiz II", False),
                    ("D", "Kiaksar", False),
                ],
            },
            {
                "body": (
                    "Tarixiy davlatni aniqlang. Chandragupta tomonidan asos solingan, poytaxti Pataliputra bo'lgan, "
                    "Ashoka davrida yuksak taraqqiyotga erishgan Shimoliy Hindiston davlati."
                ),
                "options": [
                    ("A", "Maurya davlati", True),
                    ("B", "Magadha davlati", False),
                    ("C", "Koshala davlati", False),
                    ("D", "Malla davlati", False),
                ],
            },
            {
                "body": (
                    "Tarixiy shaxsni aniqlang. Mil.avv. 246-yilda Xitoyni birlashtirgan, o'ziga tirikligidayoq maqbara qurdirgan, "
                    "Buyuk Xitoy devorini mustahkamlashni buyurgan hukmdor."
                ),
                "options": [
                    ("A", "Sin Shixuandi", True),
                    ("B", "U-Di", False),
                    ("C", "Lyu Ban", False),
                    ("D", "Chandragupta", False),
                ],
            },
            {
                "body": (
                    "Quyidagi shaharlardan qaysilari qadimgi shumer shahar-davlatlariga tegishli?\n"
                    "1) Uruk, 2) Umma, 3) Nineviya, 4) Lagash, 5) Xattusa, 6) Ur"
                ),
                "options": [
                    ("A", "1, 2, 4, 6", True),
                    ("B", "1, 3, 5, 6", False),
                    ("C", "2, 3, 4, 5", False),
                    ("D", "1, 4, 5, 6", False),
                ],
            },
            {
                "body": "Ossuriya davlati qaysi ikki davlat tomonidan mil.avv. 605-yilda bosib olindi?",
                "options": [
                    ("A", "Bobil va Midiya", True),
                    ("B", "Fors va Misr", False),
                    ("C", "Xett va Mitanni", False),
                    ("D", "Lidiya va Urartu", False),
                ],
            },
            {
                "body": "Mil.avv. VII-VI asrlarda O'zbekiston hududi uchun xos bo'lgan holatni aniqlang.",
                "options": [
                    ("A", "Hududda so'g'dlar, xorazmiylar, baqtriyaliklar va saklar yashagan", True),
                    ("B", "Hudud yagona markazlashgan davlatga birlashgan edi", False),
                    ("C", "Butun hudud Xitoy tarkibida edi", False),
                    ("D", "Yozuv umuman mavjud emas edi", False),
                ],
            },
            {
                "body": (
                    "Quyidagi xudolardan qaysilari zardushtiylikka tegishli?\n"
                    "1) Ahuramazda, 2) Zevs, 3) Mitra, 4) Amon-Ra, 5) Anaxita, 6) Ahriman"
                ),
                "options": [
                    ("A", "1, 3, 5, 6", True),
                    ("B", "1, 2, 4, 5", False),
                    ("C", "2, 3, 4, 6", False),
                    ("D", "3, 4, 5, 6", False),
                ],
            },
            {
                "body": "Buyuk Xitoy devorining uzunligi qariyb qancha bo'lgan?",
                "options": [
                    ("A", "4000 kilometr", True),
                    ("B", "1000 kilometr", False),
                    ("C", "10 000 kilometr", False),
                    ("D", "500 kilometr", False),
                ],
            },
            {
                "body": (
                    "Quyidagi voqealar to'g'ri xronologik ketma-ketlikda ko'rsatilgan javobni toping.\n"
                    "1) Sin Shixuandi Xitoyni birlashtirdi (mil.avv. 246)\n"
                    "2) Lyu Ban qo'zg'oloni, Xan sulolasi boshlandi (mil.avv. 206)\n"
                    "3) \"Sariq ro'mollilar\" qo'zg'oloni (milodiy II asr)\n"
                    "4) Ashoka hukmronligi (mil.avv. III asr)\n"
                    "5) Makedoniyalik Aleksandr Ahamoniylarni bosib oldi (mil.avv. 330)"
                ),
                "options": [
                    ("A", "5, 4, 1, 2, 3", True),
                    ("B", "1, 5, 4, 2, 3", False),
                    ("C", "4, 5, 1, 2, 3", False),
                    ("D", "5, 1, 4, 2, 3", False),
                ],
            },
            {
                "body": (
                    "Sxematik diagrammada uch qadimgi sivilizatsiya daryo vodiysi ko'rsatilgan:\n"
                    "1: Dajla-Frot oralig'i\n"
                    "2: Hind-Gang vodiysi\n"
                    "3: Xuanxe-Yantszi vodiysi\n"
                    "1–3 raqamlaridan qaysi biri Qadimgi Xitoy sivilizatsiyasi vujudga kelgan hududni bildiradi?"
                ),
                "options": [
                    ("A", "3", True),
                    ("B", "1", False),
                    ("C", "2", False),
                    ("D", "Hech biri", False),
                ],
            },
            {
                "body": (
                    "Tarixiy voqea va uning natijasi o'zaro to'g'ri mos berilgan qatorlarni aniqlang.\n"
                    "1 Xammurapi Mesopotamiyani birlashtirishi — Bobil eng qudratli davlatga aylandi\n"
                    "2 Kir II ning Midiyani bo'ysundirishi — Fors davlati zaiflashib qoldi\n"
                    "3 Doro I ning satraplik islohoti — Saltanat boshqaruvi mustahkamlandi\n"
                    "4 Sin Shixuandi hukmronligi — Xitoy mayda davlatlarga bo'linib ketdi\n"
                    "5 Zardushtning va'zlari — \"Avesto\" kitobi vujudga keldi\n"
                    "6 Chandragupta kurashi — Yunon-makedon qo'shinlari Hindistonni butunlay egalladi"
                ),
                "options": [
                    ("A", "1, 3, 5", True),
                    ("B", "2, 4, 6", False),
                    ("C", "1, 2, 3", False),
                    ("D", "4, 5, 6", False),
                ],
            },
            {
                "body": (
                    "Jadvalda harflar bilan belgilangan o'rinlarga mos keluvchi ma'lumotni toping.\n"
                    "Davr: Mil.avv. VI asr -> O'rta Osiyo: a | Jahon: Doro I Fors taxtiga chiqdi (mil.avv. 522)\n"
                    "Davr: Mil.avv. III asr -> O'rta Osiyo: Zardusht va'zlari 21 ta kitobga jamlandi | Jahon: b\n\n"
                    "Ma'lumotlar: 1) O'rta Osiyoda so'g'd, xorazm, baqtriya davlatlari mavjud edi; "
                    "2) Ashoka hukmronligi (mil.avv. III asr); 3) Kir II Fors davlatiga asos soldi (mil.avv. 558); "
                    "4) Sin Shixuandi Xitoyni birlashtirdi (mil.avv. 246)."
                ),
                "options": [
                    ("A", "a-1, b-2", True),
                    ("B", "a-3, b-4", False),
                    ("C", "a-1, b-4", False),
                    ("D", "a-3, b-2", False),
                ],
            },
            {
                "body": (
                    "Quyida berilgan ma'lumotlarni tahlil qilib Eyler-Venn diagrammasiga mos keladigan javoblarni aniqlang (Bobil va Ossuriya davlatlari):\n"
                    "a) Poytaxti Bobil shahri bo'lgan\n"
                    "b) Poytaxti Nineviya (avval Oshshur) bo'lgan\n"
                    "c) Mesopotamiya hududida joylashgan\n"
                    "d) Xammurapi qonunlari bilan mashhur\n"
                    "e) Oshshurbanapal kutubxonasi bilan mashhur\n"
                    "f) Mil.avv. 605-yilda tarix sahnasidan ketdi"
                ),
                "options": [
                    ("A", "I-a,d; II-c,e; III-b,f", False),
                    ("B", "I-b,f; II-c,e; III-a,d", False),
                    ("C", "I-a,d; II-c,f; III-b,e", False),
                    ("D", "I-a,d; II-b,e; III-c,f", True),
                ],
            },
            {
                "body": (
                    "Quyidagi davlatlar va ularning poytaxtlarini to'g'ri moslashtiring.\n"
                    "1) Elam\n"
                    "2) Ossuriya (keyingi)\n"
                    "3) Xett\n"
                    "4) Urartu\n"
                    "a) Nineviya, b) Tushpa, c) Suza, d) Xattusa"
                ),
                "options": [
                    ("A", "1-c; 2-a; 3-d; 4-b", True),
                    ("B", "1-a; 2-c; 3-b; 4-d", False),
                    ("C", "1-c; 2-d; 3-a; 4-b", False),
                    ("D", "1-b; 2-a; 3-d; 4-c", False),
                ],
            },
            {
                "body": "Zardushtiylarning muqaddas kitobi qanday nomlangan?",
                "options": [
                    ("A", "\"Avesto\"", True),
                    ("B", "\"Bibliya\"", False),
                    ("C", "\"Rigveda\"", False),
                    ("D", "\"Zand\"", False),
                ],
            },
            {
                "body": "\"Avesto\" matnlariga yozilgan sharh qanday nomlangan?",
                "options": [
                    ("A", "\"Zand\"", True),
                    ("B", "\"Rigveda\"", False),
                    ("C", "\"Mahabharat\"", False),
                    ("D", "\"Bibliya\"", False),
                ],
            },
            {
                "body": (
                    "Quyidagi ixtirolardan qaysilari Qadimgi Xitoyga tegishli?\n"
                    "1) Qog'oz, 2) Kompas, 3) Alifbo (22 harf), 4) Seysmograf, 5) Shaxmat, 6) Nol raqami"
                ),
                "options": [
                    ("A", "1, 2, 4", True),
                    ("B", "3, 5, 6", False),
                    ("C", "1, 3, 5", False),
                    ("D", "2, 4, 6", False),
                ],
            },
            {
                "body": (
                    "Quyidagi xalqlardan qaysilari mil.avv. VII-VI asrlarda O'zbekiston hududida yashagan?\n"
                    "1) So'g'diylar, 2) Xorazmliklar, 3) Finikiyaliklar, 4) Baqtriyaliklar, 5) Ossuriyaliklar, 6) Saklar"
                ),
                "options": [
                    ("A", "1, 2, 4, 6", True),
                    ("B", "1, 3, 5, 6", False),
                    ("C", "2, 3, 4, 5", False),
                    ("D", "1, 2, 3, 4", False),
                ],
            },
            {
                "body": "Saklarning \"o'tkir uchli kigiz qalpoq kiyib yuruvchi\" guruhi qanday atalgan?",
                "options": [
                    ("A", "Saka-tigraxauda", True),
                    ("B", "Saka-tiay-taradarayya", False),
                    ("C", "Saka-xaumovarka", False),
                    ("D", "Saka-massaget", False),
                ],
            },
            {
                "body": "O'zaro muvofiqlik SAQLANMAGAN javobni toping.",
                "options": [
                    ("A", "Ahuramazda — zardushtiylarning oliy xudosi", False),
                    ("B", "Mitra — quyosh va yorug'lik xudosi", False),
                    ("C", "Anaxita — yovuzlik va o'lim xudosi", True),
                    ("D", "Ahriman — yovuzlik va o'lim xudosi", False),
                ],
            },
            {
                "body": "Doro I zabt etgan mamlakatlar qaysi alohida harbiy-ma'muriy o'lkalarga bo'lingan?",
                "options": [
                    ("A", "Satrapliklar", True),
                    ("B", "Nomlar", False),
                    ("C", "Kastalar", False),
                    ("D", "Polislar", False),
                ],
            },
            {
                "body": (
                    "Quyida berilgan ma'lumotlarga mos yakuniy xulosalar (to'g'ri/noto'g'ri) keltirilgan javobni aniqlang.\n"
                    "I. Hind jamiyatida bir tabaqadan boshqasiga o'tish taqiqlangan edi.\n"
                    "II. Buddaviylik dinida avvaliga xudo tushunchasi bo'lmagan.\n"
                    "III. Sin Shixuandi maqbarasi atigi bir necha oy ichida qurib bitkazilgan."
                ),
                "options": [
                    ("A", "I-to'g'ri; II-to'g'ri; III-noto'g'ri", True),
                    ("B", "I-noto'g'ri; II-to'g'ri; III-noto'g'ri", False),
                    ("C", "I-to'g'ri; II-noto'g'ri; III-to'g'ri", False),
                    ("D", "Hammasi noto'g'ri", False),
                ],
            },
            {
                "body": (
                    "Shaxslar va ularning ishlari to'g'ri moslashtirilgan javobni toping.\n"
                    "1) Chandragupta\n"
                    "2) Ashoka\n"
                    "3) Siddhartha Gautama\n"
                    "a) Maurya davlatiga asos solgan sarkarda\n"
                    "b) Maurya davlatini yuksaltirgan hukmdor\n"
                    "c) Buddaviylik diniga asos solgan shahzoda"
                ),
                "options": [
                    ("A", "1-a; 2-b; 3-c", True),
                    ("B", "1-b; 2-a; 3-c", False),
                    ("C", "1-c; 2-a; 3-b", False),
                    ("D", "1-a; 2-c; 3-b", False),
                ],
            },
            {
                "body": (
                    "Davlatlar va ularning poytaxtlarini to'g'ri moslashtiring.\n"
                    "1) Maurya davlati\n"
                    "2) Ahamoniylar davlati\n"
                    "3) Xett podsholigi\n"
                    "a) Persepol, b) Pataliputra, c) Xattusa"
                ),
                "options": [
                    ("A", "1-b; 2-a; 3-c", True),
                    ("B", "1-a; 2-b; 3-c", False),
                    ("C", "1-c; 2-a; 3-b", False),
                    ("D", "1-b; 2-c; 3-a", False),
                ],
            },
            {
                "body": (
                    "Quyidagi qo'zg'olonlardan qaysilari Qadimgi Xitoyga tegishli?\n"
                    "1) Lyu Ban qo'zg'oloni\n"
                    "2) \"Qizil qoshlilar\" qo'zg'oloni\n"
                    "3) \"Sariq ro'mollilar\" qo'zg'oloni\n"
                    "4) Spartak qo'zg'oloni\n"
                    "5) Muqanna qo'zg'oloni\n"
                    "6) Jakeriya qo'zg'oloni"
                ),
                "options": [
                    ("A", "1, 2, 3", True),
                    ("B", "4, 5, 6", False),
                    ("C", "1, 3, 5", False),
                    ("D", "2, 4, 6", False),
                ],
            },
            {
                "body": (
                    "Quyidagi bankdan foydalanib javob bering:\n"
                    "A) Xammurapi qonunlarining qabul qilinishi (mil.avv. XVIII asr)\n"
                    "B) Doro I ning satraplik islohoti (mil.avv. 522)\n"
                    "C) Sin Shixuandi Xitoyni birlashtirishi (mil.avv. 246)\n"
                    "D) Kir II Fors davlatiga asos solishi (mil.avv. 558)\n"
                    "E) Makedoniyalik Aleksandrning Ahamoniylarni bosib olishi (mil.avv. 330)\n"
                    "F) Ashoka hukmronligi davri (mil.avv. III asr)\n\n"
                    "Berilgan voqealardan qaysi biri eng avval sodir bo'lgan?"
                ),
                "options": [
                    ("A", "Xammurapi qonunlarining qabul qilinishi (mil.avv. XVIII asr)", True),
                    ("B", "Kir II Fors davlatiga asos solishi (mil.avv. 558)", False),
                    ("C", "Doro I ning satraplik islohoti (mil.avv. 522)", False),
                    ("D", "Makedoniyalik Aleksandrning Ahamoniylarni bosib olishi (mil.avv. 330)", False),
                ],
            },
            {
                "body": (
                    "Quyidagi bankdan foydalanib javob bering:\n"
                    "A) Xammurapi qonunlarining qabul qilinishi (mil.avv. XVIII asr)\n"
                    "B) Doro I ning satraplik islohoti (mil.avv. 522)\n"
                    "C) Sin Shixuandi Xitoyni birlashtirishi (mil.avv. 246)\n"
                    "D) Kir II Fors davlatiga asos solishi (mil.avv. 558)\n"
                    "E) Makedoniyalik Aleksandrning Ahamoniylarni bosib olishi (mil.avv. 330)\n"
                    "F) Ashoka hukmronligi davri (mil.avv. III asr)\n\n"
                    "Ahamoniylar davlatining tugatilishiga sabab bo'lgan voqeani aniqlang."
                ),
                "options": [
                    ("A", "Makedoniyalik Aleksandrning Ahamoniylarni bosib olishi (mil.avv. 330)", True),
                    ("B", "Doro I ning satraplik islohoti (mil.avv. 522)", False),
                    ("C", "Kir II Fors davlatiga asos solishi (mil.avv. 558)", False),
                    ("D", "Ashoka hukmronligi davri (mil.avv. III asr)", False),
                ],
            },
            {
                "body": (
                    "Quyidagi bankdan foydalanib javob bering:\n"
                    "A) Xammurapi qonunlarining qabul qilinishi (mil.avv. XVIII asr)\n"
                    "B) Doro I ning satraplik islohoti (mil.avv. 522)\n"
                    "C) Sin Shixuandi Xitoyni birlashtirishi (mil.avv. 246)\n"
                    "D) Kir II Fors davlatiga asos solishi (mil.avv. 558)\n"
                    "E) Makedoniyalik Aleksandrning Ahamoniylarni bosib olishi (mil.avv. 330)\n"
                    "F) Ashoka hukmronligi davri (mil.avv. III asr)\n\n"
                    "Berilgan voqealardan qaysi biri eng keyin sodir bo'lgan?"
                ),
                "options": [
                    ("A", "Sin Shixuandi Xitoyni birlashtirishi (mil.avv. 246)", True),
                    ("B", "Ashoka hukmronligi davri (mil.avv. III asr)", False),
                    ("C", "Makedoniyalik Aleksandrning Ahamoniylarni bosib olishi (mil.avv. 330)", False),
                    ("D", "Doro I ning satraplik islohoti (mil.avv. 522)", False),
                ],
            },
        ]

        for i, item in enumerate(mcq_data, start=1):
            q = Question.objects.create(
                body=item["body"],
                question_type="single_choice",
                category="certificate",
                difficulty="medium",
                subject=subject,
                points=1,
            )
            for opt_label, opt_text, is_corr in item["options"]:
                AnswerOption.objects.create(
                    question=q,
                    text=f"{opt_label}) {opt_text}",
                    is_correct=is_corr,
                )
            questions.append(q)

        # -------------------------------------------------------------
        # II QISM: YOZMA (OCHIQ) SAVOLLAR (36 - 45)
        # -------------------------------------------------------------
        open_data = [
            {
                "title": "Mesopotamiya.",
                "parts": [
                    ("a", "Shumerlar ixtiro qilgan, jahondagi eng qadimgi yozuvlardan birini yozing.", "Mixxat"),
                    ("b", "Mesopotamiya ibodatxonalari qanday nomlanganini yozing.", "Zikkurat"),
                ],
            },
            {
                "title": "Bobil podsholigi.",
                "parts": [
                    ("a", "\"Bobil\" so'zining ma'nosini yozing.", "Xudolar darvozasi"),
                    ("b", "Tarixda qonunlar tuzgan birinchi hukmdorni yozing.", "Xammurapi"),
                ],
            },
            {
                "title": "Old Osiyo davlatlari.",
                "parts": [
                    ("a", "Ossuriya davlatining dastlabki poytaxtini yozing.", "Oshshur"),
                    ("b", "Ossuriyaning ikkinchi (keyingi) poytaxtini yozing.", "Nineviya"),
                ],
            },
            {
                "title": "Ahamoniylar davlati.",
                "parts": [
                    ("a", "Fors davlatiga asos solgan hukmdorni yozing.", "Kir II"),
                    ("b", "Saltanatni satrapliklarga bo'lgan, \"darik\" tangasini joriy etgan hukmdorni yozing.", "Doro I"),
                ],
            },
            {
                "title": "Qadimgi Hindiston.",
                "parts": [
                    ("a", "Hind daryosi havzasidagi eng yirik ikki shaharni yozing.", "Xarappa va Moxenjodaro"),
                    ("b", "Hind jamiyati bo'lingan to'rt tabaqadan (kastadan) birinchisini — kohinlar tabaqasini yozing.", "Braxmanlar"),
                ],
            },
            {
                "title": "Buddaviylik.",
                "parts": [
                    ("a", "Buddaviylik diniga asos solgan shahzodani yozing.", "Siddhartha Gautama"),
                    ("b", "Bu din nima uchun \"xudolarsiz din\" deb atalganini qisqacha yozing.", "Chunki unda olamni yaratgan oliy xudo tushunchasi yo'q edi"),
                ],
            },
            {
                "title": "Qadimgi Xitoy.",
                "parts": [
                    ("a", "Xitoyni mil.avv. 246-yilda birlashtirgan hukmdorni yozing.", "Sin Shixuandi"),
                    ("b", "Uning maqbarasini qurgan odamlar sonini yozing.", "700 ming kishi"),
                ],
            },
            {
                "title": "Xitoy qo'zg'olonlari.",
                "parts": [
                    ("a", "Mil.avv. 206-yilda Sin sulolasiga qarshi qo'zg'olon ko'targan shaxsni yozing.", "Lyu Ban"),
                    ("b", "Milodiy II asrdagi eng yirik qo'zg'olon nomini yozing.", "Sariq ro'mollilar qo'zg'oloni"),
                ],
            },
            {
                "title": "O'zbekiston hududidagi ilk davlatlar.",
                "parts": [
                    ("a", "Sug'diylar yashagan hududning yunon manbalaridagi nomini yozing.", "Sug'diyona"),
                    ("b", "Amudaryoning quyi oqimida yashagan xalqni yozing.", "Xorazmiylar"),
                ],
            },
            {
                "title": "Zardushtiylik.",
                "parts": [
                    ("a", "Zardushtiylik diniga asos solgan shaxsni yozing.", "Zardusht"),
                    ("b", "Zardushtiylarning muqaddas kitobini yozing.", "Avesto"),
                ],
            },
        ]

        for i, item in enumerate(open_data, start=36):
            q = Question.objects.create(
                body=f"<b>{i}-topshiriq. {item['title']}</b>\nQuyidagi savollarga aniq va lo'nda javob yozing:",
                question_type="open_written",
                category="certificate",
                difficulty="hard",
                subject=subject,
                points=2,
            )
            for order, (lbl, text, ref_ans) in enumerate(item["parts"], start=1):
                SubQuestion.objects.create(
                    question=q,
                    label=lbl,
                    text=text,
                    reference_answer=ref_ans,
                    order=order,
                )
            questions.append(q)

        # Barcha 45 ta savolni testga bog'lash va tartibini belgilash
        test_set.questions.set(questions)
        test_set.question_order = [q.id for q in questions]
        test_set.save(update_fields=['question_order'])

        self.stdout.write(
            self.style.SUCCESS(
                f"\n🎉 45 talik Milliy Sertifikat Mock Imtihoni bazaga muvaffaqiyatli yuklandi!\n"
                f"Sarlavha: '{test_set.title}' (ID: {test_set.id})\n"
                f"Boshlanish vaqti: {test_set.scheduled_at.strftime('%Y-%m-%d %H:%M')} (Toshkent vaqti)\n"
                f"Davomiyligi: {test_set.duration_minutes} daqiqa\n"
                f"Savollar soni: {test_set.questions.count()} ta (35 ta test + 10 ta yozma ochiq savol)\n"
                f"Kutish zali havolasi: /tests/mock/{test_set.id}\n"
                f"Ustaxonada tahrirlash: /teacher/tests/{test_set.id}/build\n"
            )
        )
