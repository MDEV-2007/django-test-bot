"""Django management command: Sodiqov Shohjahon ustozning Tarix Milliy Sertifikat Mock Test №1 yaratish.

Mavzu: Tarixiy davlat va shaxsni aniqlash (Qiyinlashtirilgan)
30 ta savol (A, B, C, D variantli testlar). Vaqt: 45 daqiqa.
Barcha xronologik mosliklar, jadvallar va tuzilmalar birga-bir aniqlikda joylangan.
Nashr holati: is_published=False (talabga ko'ra qoralama/yopiq holatda).

Muallif/O'qituvchi: shohjahon (Sodiqov Shohjahon, @TarixMilliyCertificate)

Foydalanish:
    python manage.py seed_tarix_shohjahon_mock_1
    python manage.py seed_tarix_shohjahon_mock_1 --force
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from django.contrib.auth.models import User

from accounts.models import Profile, ensure_profile_for_user
from tests_app.models import Subject, TestSet, Question, AnswerOption


MOCK_TITLE = "Tarix Milliy Sertifikat — Mock test №1 (Qiyinlashtirilgan)"
MOCK_DESC = (
    "Mavzu: tarixiy davlat va shaxsni aniqlash · 30 ta savol (Qiyinlashtirilgan). "
    "Vaqt: 45 daqiqa. Har bir savol: faqat bitta to‘g‘ri javob. "
    "Ustoz: Sodiqov Shohjahon (@TarixMilliyCertificate)."
)


class Command(BaseCommand):
    help = "Sodiqov Shohjahon ustoz nomidan Tarix Milliy Sertifikat Mock Test №1 (30 ta savol) ni yuklaydi."

    def add_arguments(self, parser):
        parser.add_argument(
            "--force",
            action="store_true",
            help="Agar mavjud bo'lsa, eski testni o'chirib qayta yaratadi.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        force = options.get("force", False)

        # ── 1. Subject: Tarix ───────────────────────────────────────────────
        subject = Subject.objects.filter(slug="tarix").first()
        if not subject:
            subject = Subject.objects.filter(name__icontains="tarix").first()
        if not subject:
            subject, _ = Subject.objects.get_or_create(
                slug="tarix",
                defaults={"name": "Tarix", "icon_name": "landmark", "color": "#a8846b", "order": 1},
            )
        self.stdout.write(f"Fan tanlandi: '{subject.name}' (slug={subject.slug})")

        # ── 2. Teacher: shohjahon ───────────────────────────────────────────
        teacher_user = User.objects.filter(username__iexact="shohjahon").first()
        if not teacher_user:
            teacher_user = User.objects.filter(username__icontains="shohjahon").first()
        if not teacher_user:
            teacher_user = User.objects.create(
                username="shohjahon",
                first_name="Shohjahon",
                last_name="Sodiqov",
                email="shohjahon@ilmildizi.uz",
            )
            teacher_user.set_unusable_password()
            teacher_user.save()
            prof = ensure_profile_for_user(teacher_user)
            prof.role = "teacher"
            prof.save()
            self.stdout.write(self.style.SUCCESS(f"Yangi o'qituvchi akkaunti yaratildi: @{teacher_user.username}"))
        else:
            prof = ensure_profile_for_user(teacher_user)
            if prof.role != "teacher" and not teacher_user.is_superuser:
                prof.role = "teacher"
                prof.save(update_fields=["role"])
            self.stdout.write(f"O'qituvchi topildi: @{teacher_user.username} (ID: {teacher_user.id})")

        # ── 3. Mavjud test tekshiruvi ───────────────────────────────────────
        existing = TestSet.objects.filter(title=MOCK_TITLE).first()
        if existing:
            if force:
                self.stdout.write(self.style.WARNING(f"Eski test (#{existing.id}) o'chirilmoqda..."))
                if existing.has_attempts:
                    existing.is_archived = True
                    existing.save(update_fields=["is_archived"])
                    self.stdout.write(self.style.WARNING("Eski test urinishlari saqlanib arxivlandi."))
                else:
                    existing.delete()
            else:
                self.stdout.write(
                    self.style.WARNING(
                        f"'{MOCK_TITLE}' allaqachon mavjud (ID: {existing.id}).\n"
                        f"Qayta yuklash uchun: python manage.py seed_tarix_shohjahon_mock_1 --force"
                    )
                )
                return

        # ── 4. TestSet yaratish (is_published=False) ────────────────────────
        test_set = TestSet.objects.create(
            title=MOCK_TITLE,
            description=MOCK_DESC,
            subject=subject,
            category="certificate",
            duration_minutes=45,
            created_by=teacher_user,
            is_published=False,  # Foydalanuvchi talabiga asosan nashr etilmagan (False)
            is_premium=False,
            is_random=False,
        )

        questions = []

        # ── 5. 30 ta Savol va Variantlar ───────────────────────────────────
        raw_questions = [
            # 1
            {
                "body": "<p>Hukmdori «yabg‘u» deb atalgan, poytaxti Chu daryosidan shimolroqdagi Suyob shahri bo‘lgan, X asr o‘rtalarida aholisining katta qismi islomni qabul qilgan davlatni aniqlang.</p>",
                "explanation": "Qarluqlar davlati. Qarluqlar VIII asr o‘rtalarida Yettisuvda davlat tuzgan; poytaxti – Suyob.",
                "options": [
                    ("A", "G‘arbiy Turk xoqonligi", False),
                    ("B", "O‘g‘uzlar davlati", False),
                    ("C", "Qoraxoniylar davlati", False),
                    ("D", "Qarluqlar davlati", True),
                ],
            },
            # 2
            {
                "body": "<p>Asoschisi Abbosiylar taxti uchun kurashda al-Ma’mun tarafida g‘alaba qozongan, 821-yilda xutbadan xalifa nomini olib tashlagan, markazi Nishopur bo‘lgan davlat qaysi?</p>",
                "explanation": "Tohiriylar davlati. Tohir ibn Husayn; davlatni 873-yilda Ya’qub ibn Lays tugatgan.",
                "options": [
                    ("A", "Somoniylar davlati", False),
                    ("B", "Tohiriylar davlati", True),
                    ("C", "G‘aznaviylar davlati", False),
                    ("D", "Safforiylar davlati", False),
                ],
            },
            # 3
            {
                "body": "<p>1137-yilda Xo‘jand yaqinida qoraxoniylarni, 1141-yilda Qatvon jangida saljuqiy sulton Sanjarni tor-mor keltirgan davlat:</p>",
                "explanation": "Qoraxitoylar davlati. Qatvon jangi (1141) – Sanjar mag‘lubiyati.",
                "options": [
                    ("A", "Qoraxoniylar davlati", False),
                    ("B", "Qoraxitoylar davlati", True),
                    ("C", "G‘aznaviylar davlati", False),
                    ("D", "Xorazmshohlar davlati", False),
                ],
            },
            # 4
            {
                "body": (
                    "<p>Quyidagi davlatlarni tugatilgan vaqti bo‘yicha xronologik tartibda joylashtiring:</p>"
                    "<div style='background:#f8fafc;padding:12px 16px;border-radius:10px;border:1px solid #e2e8f0;margin:12px 0;line-height:1.7;'>"
                    "1) Tohiriylar<br/>"
                    "2) Somoniylar<br/>"
                    "3) Eftaliylar<br/>"
                    "4) Vestgot qirolligi"
                    "</div>"
                ),
                "explanation": "3, 4, 1, 2. Eftaliylar ~567 → Vestgotlar 711 → Tohiriylar 873 → Somoniylar 999.",
                "options": [
                    ("A", "3, 4, 1, 2", True),
                    ("B", "4, 3, 1, 2", False),
                    ("C", "3, 1, 4, 2", False),
                    ("D", "3, 4, 2, 1", False),
                ],
            },
            # 5
            {
                "body": "<p>Qaysi juftlikda davlat va unga barham bergan kuch to‘g‘ri ko‘rsatilgan?</p>",
                "explanation": "Oq qo‘yunlilar – Ismoil Safaviy. Oq qo‘yunlilar 1501-yilda Ismoil Safaviy tomonidan tugatilgan; Qora qo‘yunlilarni 1468-yilda Oq qo‘yunlilar, Muzaffariylarni 1393-yilda Amir Temur, Tohiriylarni Safforiylar tugatgan.",
                "options": [
                    ("A", "Qora qo‘yunlilar – Safaviylar", False),
                    ("B", "Tohiriylar – Somoniylar", False),
                    ("C", "Oq qo‘yunlilar – Ismoil Safaviy", True),
                    ("D", "Muzaffariylar – Qora qo‘yunlilar", False),
                ],
            },
            # 6
            {
                "body": "<p>O‘zini ataylab sotqin qilib ko‘rsatib, fors qo‘shinini suvsiz cho‘lga boshlab kirgan; bu voqea milodiy II asrda yashagan muallifning harbiy hiylalarga bag‘ishlangan asarida keltirilgan. Bu kim?</p>",
                "explanation": "Shiroq. Poliyen, «Strategemata»; Doro I ning saklarga yurishi.",
                "options": [
                    ("A", "Spitamen", False),
                    ("B", "Sparangiz", False),
                    ("C", "Frada", False),
                    ("D", "Shiroq", True),
                ],
            },
            # 7
            {
                "body": "<p>Massaget malikasining o‘g‘li bo‘lgan, Kir II hiylasi bilan asir tushib, o‘z joniga qasd qilgan; bu voqeani «tarix otasi» yozib qoldirgan. Shaxsni aniqlang.</p>",
                "explanation": "Sparangiz. Gerodot; To‘maris (Tomiris)ning o‘g‘li.",
                "options": [
                    ("A", "Sparangiz", True),
                    ("B", "Spitamen", False),
                    ("C", "Shiroq", False),
                    ("D", "Frada", False),
                ],
            },
            # 8
            {
                "body": "<p>Mil. avv. 522–521-yillarda Ahamoniylarga qarshi Marg‘iyonada qo‘zg‘olonga boshchilik qilgan shaxs kim?</p>",
                "explanation": "Frada. Qo‘zg‘olon Doro I hukmronligining boshida bo‘lgan; Behistun yozuvida tilga olinadi.",
                "options": [
                    ("A", "Shiroq", False),
                    ("B", "Gaumata", False),
                    ("C", "Spitamen", False),
                    ("D", "Frada", True),
                ],
            },
            # 9
            {
                "body": "<p>Dastlab Salavkiylar satrapi bo‘lgan, markaziy hokimiyat zaiflashganidan foydalanib, mil. avv. III asr o‘rtalarida mustaqil davlat e’lon qilgan shaxs:</p>",
                "explanation": "Diodot. Diodot – Yunon-Baqtriya davlati asoschisi (~mil. avv. 250).",
                "options": [
                    ("A", "Salavk I", False),
                    ("B", "Diodot", True),
                    ("C", "Antiox I", False),
                    ("D", "Mitridat I", False),
                ],
            },
            # 10
            {
                "body": "<p>Milodiy II asrda hukmronlik qilib, davlatini eng yuqori taraqqiyot bosqichiga olib chiqqan Kushon podshosi:</p>",
                "explanation": "Kanishka. Kanishka ~127–150-yillar.",
                "options": [
                    ("A", "Kanishka", True),
                    ("B", "Vima Kadfiz", False),
                    ("C", "Kudzula Kadfiz", False),
                    ("D", "Diodot", False),
                ],
            },
            # 11
            {
                "body": "<p>705-yildan Xuroson noibi bo‘lgan, Buxoro, Samarqand, Xorazm va Farg‘onani bo‘ysundirgan, 715-yilda Farg‘onada qo‘zg‘olon vaqtida o‘ldirilgan sarkarda:</p>",
                "explanation": "Qutayba ibn Muslim. Qutayba – Umaviylar sarkardasi.",
                "options": [
                    ("A", "Abu Muslim", False),
                    ("B", "Tohir ibn Husayn", False),
                    ("C", "Qutayba ibn Muslim", True),
                    ("D", "Nasr ibn Sayyor", False),
                ],
            },
            # 12
            {
                "body": "<p>Qo‘zg‘oloni xalifa al-Mansur davrida boshlanib, al-Mahdiy davrida (783-yil) bostirilgan, «niqobli kishi» laqabli rahbar kim?</p>",
                "explanation": "Hoshim ibn Hakim (Muqanna). Muqanna – «niqobli»; Abbosiylarga qarshi qo‘zg‘olon.",
                "options": [
                    ("A", "Hoshim ibn Hakim (Muqanna)", True),
                    ("B", "Qutayba ibn Muslim", False),
                    ("C", "Abu Muslim", False),
                    ("D", "Rofe ibn Lays", False),
                ],
            },
            # 13
            {
                "body": (
                    "<p>Shaxs va asarni moslang:</p>"
                    "<div style='display:grid;grid-template-columns:1fr 1fr;gap:14px;background:#f8fafc;padding:14px 18px;border-radius:10px;border:1px solid #e2e8f0;margin:12px 0;line-height:1.7;'>"
                    "<div><b>Shaxslar:</b><br/>"
                    "1) Nizomulmulk<br/>"
                    "2) Yugnakiy<br/>"
                    "3) Mahmud Qoshg‘ariy<br/>"
                    "4) Poliyen</div>"
                    "<div><b>Asarlar:</b><br/>"
                    "a) «Strategemata»<br/>"
                    "b) «Siyosatnoma»<br/>"
                    "c) «Hibat ul-haqoyiq»<br/>"
                    "d) «Devonu lug‘otit-turk»</div>"
                    "</div>"
                ),
                "explanation": "1b, 2c, 3d, 4a. Hibat ul-haqoyiq – «Haqiqatlar hadyasi».",
                "options": [
                    ("A", "1b, 2d, 3c, 4a", False),
                    ("B", "1b, 2c, 3d, 4a", True),
                    ("C", "1a, 2c, 3d, 4b", False),
                    ("D", "1c, 2b, 3d, 4a", False),
                ],
            },
            # 14
            {
                "body": "<p>Mahmud G‘aznaviy haqidagi <b>noto‘g‘ri</b> ma’lumotni toping.</p>",
                "explanation": "Xurosonni Tohiriylardan tortib olgan. Mahmud Xurosonni Somoniylardan ajratib olgan.",
                "options": [
                    ("A", "Saroyida Beruniy va Firdavsiy ijod qilgan", False),
                    ("B", "Otasi – Sabuktegin", False),
                    ("C", "Xurosonni Tohiriylardan tortib olgan", True),
                    ("D", "Hindistonga 17 marta yurish qilgan", False),
                ],
            },
            # 15
            {
                "body": "<p>Saljuqiy sulton Malikshoh tomonidan Xorazmga noib etib tayinlangan va o‘z sulolasining siyosiy poydevorini yaratgan shaxs:</p>",
                "explanation": "Anushtegin. Anushteginiylar (Xorazmshohlar) sulolasi asoschisi.",
                "options": [
                    ("A", "Anushtegin", True),
                    ("B", "Otsiz", False),
                    ("C", "Takash", False),
                    ("D", "Sabuktegin", False),
                ],
            },
            # 16
            {
                "body": "<p>«Dil ba yor, dast ba kor» shiorini ilgari surgan, jahriy emas, xufiy zikrni targ‘ib etgan tariqat asoschisi:</p>",
                "explanation": "Bahouddin Naqshband. Naqshband (1318–1389).",
                "options": [
                    ("A", "Ahmad Yassaviy", False),
                    ("B", "Abduxoliq G‘ijduvoniy", False),
                    ("C", "Bahouddin Naqshband", True),
                    ("D", "Najmiddin Kubro", False),
                ],
            },
            # 17
            {
                "body": "<p>1221-yilda Urganchda mo‘g‘ullarga qarshi kurashda shahid bo‘lgan tariqat asoschisi kim?</p>",
                "explanation": "Najmiddin Kubro. Kubroviya tariqati; 1145-yilda Xorazmda tug‘ilgan.",
                "options": [
                    ("A", "Ahmad Yassaviy", False),
                    ("B", "Bahouddin Naqshband", False),
                    ("C", "Abduxoliq G‘ijduvoniy", False),
                    ("D", "Najmiddin Kubro", True),
                ],
            },
            # 18
            {
                "body": "<p>282 moddadan iborat qonunlar majmuasini qoldirgan mil. avv. XVIII asr hukmdori:</p>",
                "explanation": "Hammurapi. Bobil podshosi, ~mil. avv. 1792–1750.",
                "options": [
                    ("A", "Hammurapi", True),
                    ("B", "Drakont", False),
                    ("C", "Sargon", False),
                    ("D", "Navuxodonosor II", False),
                ],
            },
            # 19
            {
                "body": "<p>Afina islohotchilari bo‘yicha qaysi juftlik to‘g‘ri?</p>",
                "explanation": "Solon – qarz evaziga qullikni bekor qilgan. Drakont – ilk yozma qonunlar; Perikl – Parfenon, lavozimlarga haq to‘lash.",
                "options": [
                    ("A", "Drakont – fuqarolarni mulkiga ko‘ra tabaqalarga ajratgan", False),
                    ("B", "Solon – Parfenon qurilishi tashabbuskori", False),
                    ("C", "Perikl – ilk yozma qonunlarni tuzgan", False),
                    ("D", "Solon – qarz evaziga qullikni bekor qilgan", True),
                ],
            },
            # 20
            {
                "body": "<p>Milodiy I–II asrlarda yashagan yunon tarixchisi va Rim davlat arbobi, Aleksandrning Markaziy Osiyoga yurishini batafsil yozgan «Anabasis» muallifi:</p>",
                "explanation": "Arrian. «Anabasis Aleksandri» – «Aleksandr yurishlari».",
                "options": [
                    ("A", "Strabon", False),
                    ("B", "Poliyen", False),
                    ("C", "Gerodot", False),
                    ("D", "Arrian", True),
                ],
            },
            # 21
            {
                "body": "<p>486-yilda asos solingan, 800-yilda imperiyaga aylangan va 843-yilda Verden shartnomasi bilan uchga bo‘lingan davlat:</p>",
                "explanation": "Franklar davlati. Xlodvik (486) → Buyuk Karl (800) → Verden (843).",
                "options": [
                    ("A", "Muqaddas Rim imperiyasi", False),
                    ("B", "Franklar davlati", True),
                    ("C", "Vestgot qirolligi", False),
                    ("D", "Ostgot qirolligi", False),
                ],
            },
            # 22
            {
                "body": "<p>Quyidagi davlatlardan qaysi biri eng uzoq mavjud bo‘lgan?</p>",
                "explanation": "Muqaddas Rim imperiyasi. 962–1806 (844 yil); Franklar 486–843; Prussiya 1701–1918; Italiya 1861–1946.",
                "options": [
                    ("A", "Prussiya qirolligi", False),
                    ("B", "Italiya qirolligi", False),
                    ("C", "Muqaddas Rim imperiyasi", True),
                    ("D", "Franklar davlati", False),
                ],
            },
            # 23
            {
                "body": "<p>1921-yilda to‘ntarish orqali hokimiyatni olgan, 1925-yilda Qojarlarni ag‘darib, 1941-yilda ittifoqchilar bosimi bilan taxtdan voz kechgan hukmdor:</p>",
                "explanation": "Rizo Shoh Pahlaviy. Pahlaviylar sulolasi asoschisi.",
                "options": [
                    ("A", "Ismoil Safaviy", False),
                    ("B", "Nodirshoh", False),
                    ("C", "Rizo Shoh Pahlaviy", True),
                    ("D", "Muhammad Rizo Shoh", False),
                ],
            },
            # 24
            {
                "body": "<p>«Oq inqilob» deb atalgan islohotlarni o‘tkazgan, 1979-yilgi inqilob natijasida taxtdan ag‘darilgan Eron shohi:</p>",
                "explanation": "Muhammad Rizo Shoh. 1941–1979; 1979 – Islom inqilobi.",
                "options": [
                    ("A", "Muhammad Rizo Shoh", True),
                    ("B", "Rizo Shoh Pahlaviy", False),
                    ("C", "Nodirshoh", False),
                    ("D", "Ismoil Safaviy", False),
                ],
            },
            # 25
            {
                "body": "<p>Tannenberg jangida (1914) g‘alaba qozongan, 1925-yilda prezident etib saylangan va 1933-yilda Gitlerni kansler etib tayinlagan shaxs:</p>",
                "explanation": "Paul fon Gindenburg. Gindenburg – Veymar respublikasining 2-prezidenti.",
                "options": [
                    ("A", "Otto fon Bismark", False),
                    ("B", "Paul fon Gindenburg", True),
                    ("C", "Fridrix Ebert", False),
                    ("D", "Vilgelm II", False),
                ],
            },
            # 26
            {
                "body": (
                    "<p>Shaxslarni faoliyat ko‘rsatgan davri bo‘yicha tartiblang:</p>"
                    "<div style='background:#f8fafc;padding:12px 16px;border-radius:10px;border:1px solid #e2e8f0;margin:12px 0;line-height:1.7;'>"
                    "1) Abu Muslim<br/>"
                    "2) Ismoil Somoniy<br/>"
                    "3) Qutayba ibn Muslim<br/>"
                    "4) Hoshim ibn Hakim"
                    "</div>"
                ),
                "explanation": "3, 1, 4, 2. Qutayba 705–715 → Abu Muslim 747–755 → Muqanna –783 → Ismoil 892–907.",
                "options": [
                    ("A", "3, 4, 1, 2", False),
                    ("B", "3, 1, 4, 2", True),
                    ("C", "1, 3, 4, 2", False),
                    ("D", "3, 1, 2, 4", False),
                ],
            },
            # 27
            {
                "body": "<p>Xalifalik markazi Bag‘dodni egallagan, sultoni Alp Arslon Kichik Osiyoda Vizantiya qo‘shinlarini tor-mor etgan davlat:</p>",
                "explanation": "Saljuqiylar davlati. 1071 – Malazgird jangi.",
                "options": [
                    ("A", "Saljuqiylar davlati", True),
                    ("B", "G‘aznaviylar davlati", False),
                    ("C", "Qoraxoniylar davlati", False),
                    ("D", "Xorazmshohlar davlati", False),
                ],
            },
            # 28
            {
                "body": "<p>Poytaxti Sirdaryo quyi oqimidagi Yangikent bo‘lgan, IX asr oxiri – X asr boshida tuzilgan davlat:</p>",
                "explanation": "O‘g‘uzlar davlati. X asrdan o‘g‘uzlar islomni qabul qilgan.",
                "options": [
                    ("A", "Kimaklar xoqonligi", False),
                    ("B", "O‘g‘uzlar davlati", True),
                    ("C", "Qarluqlar davlati", False),
                    ("D", "Qoraxoniylar davlati", False),
                ],
            },
            # 29
            {
                "body": "<p>Hukmdori To‘n yabg‘u qarorgohini Choch yaqinidagi Mingbuloq mavzesiga ko‘chirgan davlat:</p>",
                "explanation": "G‘arbiy Turk xoqonligi. Chochni teginlar sulolasi boshqargan; soliq nozirlari – tudunlar.",
                "options": [
                    ("A", "Turk xoqonligi", False),
                    ("B", "Eftaliylar davlati", False),
                    ("C", "Qarluqlar davlati", False),
                    ("D", "G‘arbiy Turk xoqonligi", True),
                ],
            },
            # 30
            {
                "body": "<p>1337-yilda Sabzavor yaqinidagi Boshtin qishlog‘ida qo‘zg‘olon ko‘tarib, o‘zlarini «boshini dorga tikkanlar» deb atagan harakat ishtirokchilari tuzgan davlat:</p>",
                "explanation": "Sarbadorlar davlati. Sarbadorlar – mo‘g‘ullar zulmiga qarshi.",
                "options": [
                    ("A", "Qora qo‘yunlilar davlati", False),
                    ("B", "Muzaffariylar davlati", False),
                    ("C", "Sarbadorlar davlati", True),
                    ("D", "Jaloyiriylar davlati", False),
                ],
            },
        ]

        for i, item in enumerate(raw_questions, start=1):
            q = Question.objects.create(
                body=item["body"],
                question_type="single_choice",
                category="certificate",
                difficulty="hard",
                subject=subject,
                points=1,
                explanation=item.get("explanation", ""),
            )
            for opt_label, opt_text, is_corr in item["options"]:
                AnswerOption.objects.create(
                    question=q,
                    text=f"{opt_label}) {opt_text}",
                    is_correct=is_corr,
                )
            questions.append(q)
            self.stdout.write(f"  [{i:02d}] Savol qo'shildi...")

        # ── 6. Savollarni test to'plamiga ulash va tartibni saqlash ─────────
        test_set.questions.set(questions)
        test_set.question_order = [q.id for q in questions]
        test_set.save(update_fields=["question_order"])

        self.stdout.write(
            self.style.SUCCESS(
                f"\n🎉 TABRIKLAYMIZ! '{MOCK_TITLE}' muvaffaqiyatli saqlandi!\n"
                f"   • TestSet ID     : {test_set.id}\n"
                f"   • Fan            : {subject.name}\n"
                f"   • Kategoriya     : Milliy Sertifikat (certificate)\n"
                f"   • Ustoz          : @{teacher_user.username} ({teacher_user.get_full_name()})\n"
                f"   • Savollar soni  : {test_set.questions.count()} ta test savoli\n"
                f"   • Davomiyligi    : {test_set.duration_minutes} daqiqa\n"
                f"   • Nashr holati   : is_published=False (Qoralama/yopiq holatda)\n"
            )
        )
