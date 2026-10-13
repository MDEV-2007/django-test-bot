"""Django management command: Sodiqov Shohjahon ustozning Tarix Milliy Sertifikat Mock Test №2 yaratish.

Mavzu: Tarixiy davlat va shaxsni aniqlash (Qiyinlashtirilgan)
30 ta savol (A, B, C, D variantli testlar). Vaqt: 45 daqiqa.
Barcha xronologik mosliklar, jadvallar va tuzilmalar birga-bir aniqlikda joylangan.
Nashr holati: is_published=False (talabga ko'ra qoralama/yopiq holatda).

Muallif/O'qituvchi: shohjahon (Sodiqov Shohjahon, @TarixMilliyCertificate)

Foydalanish:
    python manage.py seed_tarix_shohjahon_mock_2
    python manage.py seed_tarix_shohjahon_mock_2 --force
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from django.contrib.auth.models import User

from accounts.models import Profile, ensure_profile_for_user
from tests_app.models import Subject, TestSet, Question, AnswerOption


MOCK_TITLE = "Tarix Milliy Sertifikat — Mock test №2 (Qiyinlashtirilgan)"
MOCK_DESC = (
    "Mavzu: tarixiy davlat va shaxsni aniqlash · 30 ta savol (Qiyinlashtirilgan). "
    "Vaqt: 45 daqiqa. Har bir savol: faqat bitta to‘g‘ri javob. "
    "Ustoz: Sodiqov Shohjahon (@TarixMilliyCertificate)."
)


class Command(BaseCommand):
    help = "Sodiqov Shohjahon ustoz nomidan Tarix Milliy Sertifikat Mock Test №2 (30 ta savol) ni yuklaydi."

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
                        f"Qayta yuklash uchun: python manage.py seed_tarix_shohjahon_mock_2 --force"
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
                "body": "<p>Sosoniy shohi Peroz I ni mag‘lub etgan, taxminan 567-yilda Turk xoqonligi va Sosoniylar ittifoqi tomonidan tor-mor etilgan davlat:</p>",
                "explanation": "Eftaliylar davlati. Eftaliylar (oq xunlar) V–VI asrlar.",
                "options": [
                    ("A", "Kushon davlati", False),
                    ("B", "Eftaliylar davlati", True),
                    ("C", "Kidariylar davlati", False),
                    ("D", "Xioniylar davlati", False),
                ],
            },
            # 2
            {
                "body": "<p>Taxminan 440-yillarda Yazdigard II tomonidan Baqtriyadan siqib chiqarilib, Shimoliy Hindistonda saqlanib qolgan va keyin eftaliylar tomonidan tugatilgan davlat:</p>",
                "explanation": "Kidariylar davlati. Kidariylar – V asr.",
                "options": [
                    ("A", "Eftaliylar davlati", False),
                    ("B", "Kushon davlati", False),
                    ("C", "Kidariylar davlati", True),
                    ("D", "Xioniylar davlati", False),
                ],
            },
            # 3
            {
                "body": "<p>IV asrning 70-yillaridan V asrning ikkinchi yarmigacha O‘rta Osiyoda siyosiy hukmronlik qilgan, g‘arb tarixchilari «oq xunlar» deb atagan davlat:</p>",
                "explanation": "Xioniylar davlati. Xioniylar – IV–V asrlar.",
                "options": [
                    ("A", "Kidariylar davlati", False),
                    ("B", "Xioniylar davlati", True),
                    ("C", "Turk xoqonligi", False),
                    ("D", "Kushon davlati", False),
                ],
            },
            # 4
            {
                "body": (
                    "<p>Davlatlarni vujudga kelgan vaqti bo‘yicha tartiblang:</p>"
                    "<div style='background:#f8fafc;padding:12px 16px;border-radius:10px;border:1px solid #e2e8f0;margin:12px 0;line-height:1.7;'>"
                    "1) Turk xoqonligi<br/>"
                    "2) Xioniylar<br/>"
                    "3) Eftaliylar<br/>"
                    "4) Kidariylar"
                    "</div>"
                ),
                "explanation": "2, 4, 3, 1. Xioniylar (IV asr 70-y.) → Kidariylar (V asr boshi) → Eftaliylar (V asr) → Turk xoqonligi (VI asr o‘rtasi).",
                "options": [
                    ("A", "4, 2, 3, 1", False),
                    ("B", "2, 3, 4, 1", False),
                    ("C", "2, 4, 1, 3", False),
                    ("D", "2, 4, 3, 1", True),
                ],
            },
            # 5
            {
                "body": "<p>Amir dargohi va devonlardan iborat boshqaruv tuzgan, Nasr ibn Ahmad davrida Buxoro Registonida devonlar uchun maxsus saroy qurilgan davlat:</p>",
                "explanation": "Somoniylar davlati. Somoniylar 819–999.",
                "options": [
                    ("A", "Tohiriylar davlati", False),
                    ("B", "Qoraxoniylar davlati", False),
                    ("C", "G‘aznaviylar davlati", False),
                    ("D", "Somoniylar davlati", True),
                ],
            },
            # 6
            {
                "body": "<p>Somoniylar davlati boshqaruvi haqida <b>to‘g‘ri</b> ma’lumotni toping.</p>",
                "explanation": "10 ta devon bo‘lib, vazir devoni bosh mahkama hisoblangan. Vazir devoni – bosh boshqaruv mahkamasi.",
                "options": [
                    ("A", "10 ta devon bo‘lib, vazir devoni bosh mahkama hisoblangan", True),
                    ("B", "12 ta devon bo‘lib, mustavfiy devoni bosh mahkama hisoblangan", False),
                    ("C", "8 ta devon bo‘lib, sohibi barid devoni bosh mahkama hisoblangan", False),
                    ("D", "10 ta devon bo‘lib, qozi devoni bosh mahkama hisoblangan", False),
                ],
            },
            # 7
            {
                "body": "<p>900-yilda Ismoil Somoniydan mag‘lubiyatga uchragan hukmdor:</p>",
                "explanation": "Amr ibn Lays. Amr – Safforiylar asoschisi Ya’qubning ukasi.",
                "options": [
                    ("A", "Ya’qub ibn Lays", False),
                    ("B", "Amr ibn Lays", True),
                    ("C", "Tohir ibn Husayn", False),
                    ("D", "Rofe ibn Harsama", False),
                ],
            },
            # 8
            {
                "body": "<p>Hukmdori Abdulkarim davrida sulola islomni qabul qilgan, keyin Farg‘ona, Isfijob, Samarqand va Buxoroni egallagan davlat:</p>",
                "explanation": "Qoraxoniylar davlati. Satuq Bug‘roxon (Abdulkarim).",
                "options": [
                    ("A", "Qarluqlar davlati", False),
                    ("B", "O‘g‘uzlar davlati", False),
                    ("C", "Qoraxitoylar davlati", False),
                    ("D", "Qoraxoniylar davlati", True),
                ],
            },
            # 9
            {
                "body": "<p>Somoniylar davlati haqidagi <b>noto‘g‘ri</b> ma’lumotni toping.</p>",
                "explanation": "Davlat Tohiriylar tomonidan tugatilgan. Somoniylarni 999-yilda Qoraxoniylar tugatgan.",
                "options": [
                    ("A", "819–999-yillarda mavjud bo‘lgan", False),
                    ("B", "Davlat Tohiriylar tomonidan tugatilgan", True),
                    ("C", "Ismoil Somoniy 892–907-yillarda hukmronlik qilgan", False),
                    ("D", "Bu davrda Rudakiy va Ibn Sino yetishib chiqqan", False),
                ],
            },
            # 10
            {
                "body": (
                    "<p>Sulola va uning mashhur hukmdorini moslang:</p>"
                    "<div style='display:grid;grid-template-columns:1fr 1fr;gap:14px;background:#f8fafc;padding:14px 18px;border-radius:10px;border:1px solid #e2e8f0;margin:12px 0;line-height:1.7;'>"
                    "<div><b>Sulolalar:</b><br/>"
                    "1) Qora qo‘yunlilar<br/>"
                    "2) Oq qo‘yunlilar<br/>"
                    "3) Jaloyiriylar<br/>"
                    "4) Muzaffariylar</div>"
                    "<div><b>Hukmdorlar:</b><br/>"
                    "a) Hasan Buzurg<br/>"
                    "b) Uzun Hasan<br/>"
                    "c) Muboriziddin Muhammad<br/>"
                    "d) Qora Yusuf</div>"
                    "</div>"
                ),
                "explanation": "1d, 2b, 3a, 4c. Hasan Buzurg – Jaloyiriylar asoschisi.",
                "options": [
                    ("A", "1d, 2b, 3c, 4a", False),
                    ("B", "1d, 2b, 3a, 4c", True),
                    ("C", "1b, 2d, 3a, 4c", False),
                    ("D", "1a, 2b, 3d, 4c", False),
                ],
            },
            # 11
            {
                "body": "<p>Ilxoniylar zaiflashganidan keyin vujudga kelgan, poytaxti ko‘pincha Sheroz bo‘lgan va 1393-yilda Amir Temur tomonidan tugatilgan davlat:</p>",
                "explanation": "Muzaffariylar davlati. Asoschisi – Muboriziddin Muhammad.",
                "options": [
                    ("A", "Qora qo‘yunlilar davlati", False),
                    ("B", "Jaloyiriylar davlati", False),
                    ("C", "Muzaffariylar davlati", True),
                    ("D", "Sarbadorlar davlati", False),
                ],
            },
            # 12
            {
                "body": "<p>Ilxoniylar parchalanishidan so‘ng Iroq va G‘arbiy Eronda vujudga kelgan, XV asr boshida Temuriylar va Qora qo‘yunlilar tomonidan tugatilgan davlat:</p>",
                "explanation": "Jaloyiriylar davlati. Asoschisi – Hasan Buzurg.",
                "options": [
                    ("A", "Muzaffariylar davlati", False),
                    ("B", "Oq qo‘yunlilar davlati", False),
                    ("C", "Jaloyiriylar davlati", True),
                    ("D", "Sarbadorlar davlati", False),
                ],
            },
            # 13
            {
                "body": "<p>V–VIII asrlarda mavjud bo‘lib, 711-yilda arablar tomonidan tugatilgan german davlati:</p>",
                "explanation": "Vestgot qirolligi. Pireney yarimoroli.",
                "options": [
                    ("A", "Franklar davlati", False),
                    ("B", "Ostgot qirolligi", False),
                    ("C", "Langobard qirolligi", False),
                    ("D", "Vestgot qirolligi", True),
                ],
            },
            # 14
            {
                "body": "<p>1806-yilda Napoleon bosimi ostida imperator Frans II tomonidan rasman tugatilgan davlat:</p>",
                "explanation": "Muqaddas Rim imperiyasi. 962–1806.",
                "options": [
                    ("A", "Muqaddas Rim imperiyasi", True),
                    ("B", "Franklar davlati", False),
                    ("C", "Prussiya qirolligi", False),
                    ("D", "Avstriya imperiyasi", False),
                ],
            },
            # 15
            {
                "body": "<p>1701–1918-yillarda mavjud bo‘lgan, harbiy-intizomli davlat sifatida tanilgan, oxirgi hukmdori Vilgelm II bo‘lgan davlat:</p>",
                "explanation": "Prussiya qirolligi. Brandenburg-Prussiya asosida shakllangan.",
                "options": [
                    ("A", "Avstriya-Vengriya", False),
                    ("B", "Italiya qirolligi", False),
                    ("C", "Muqaddas Rim imperiyasi", False),
                    ("D", "Prussiya qirolligi", True),
                ],
            },
            # 16
            {
                "body": "<p>1861-yilda tashkil topgan va 1946-yilgi referendum natijasida respublikaga aylangan davlat:</p>",
                "explanation": "Italiya qirolligi. Monarxiya 1946-yil referendumida tugatilgan.",
                "options": [
                    ("A", "Italiya qirolligi", True),
                    ("B", "Prussiya qirolligi", False),
                    ("C", "Ispaniya qirolligi", False),
                    ("D", "Gretsiya qirolligi", False),
                ],
            },
            # 17
            {
                "body": "<p>Italiyaning birlashishida faol rol <b>o‘ynamagan</b> shaxsni toping.</p>",
                "explanation": "Otto fon Bismark. Bismark – Germaniyaning birlashtiruvchisi.",
                "options": [
                    ("A", "Juzeppe Madzini", False),
                    ("B", "Kamillo Kavur", False),
                    ("C", "Otto fon Bismark", True),
                    ("D", "Juzeppe Garibaldi", False),
                ],
            },
            # 18
            {
                "body": "<p>Mil. avv. 250-yil atrofida asos solingan, mashhur hukmdori Mitridat I bo‘lgan davlat:</p>",
                "explanation": "Parfiya. Parfiya – Arshakiylar sulolasi.",
                "options": [
                    ("A", "Parfiya", True),
                    ("B", "Yunon-Baqtriya", False),
                    ("C", "Salavkiylar davlati", False),
                    ("D", "Sosoniylar davlati", False),
                ],
            },
            # 19
            {
                "body": "<p>Sosoniylar davlatiga asos solgan hukmdor:</p>",
                "explanation": "Ardasher I. III asr boshi.",
                "options": [
                    ("A", "Peroz I", False),
                    ("B", "Xusrav I Anushirvon", False),
                    ("C", "Shopur I", False),
                    ("D", "Ardasher I", True),
                ],
            },
            # 20
            {
                "body": "<p>747-yilda Xurosonda qo‘zg‘olon boshlagan, Umaviylarni ag‘darishda hal qiluvchi rol o‘ynagan, 755-yilda xalifa al-Mansur buyrug‘i bilan qatl etilgan shaxs:</p>",
                "explanation": "Abu Muslim. Abbosiylar 750-yilda hokimiyatga kelgan.",
                "options": [
                    ("A", "Abu Muslim", True),
                    ("B", "Tohir ibn Husayn", False),
                    ("C", "Qutayba ibn Muslim", False),
                    ("D", "Hoshim ibn Hakim", False),
                ],
            },
            # 21
            {
                "body": "<p>849-yilda tug‘ilgan, 892-yilda Movarounnahr hokimi bo‘lgan va Buxoroni poytaxtga aylantirgan hukmdor:</p>",
                "explanation": "Ismoil Somoniy. 892–907-yillarda hukmronlik qilgan.",
                "options": [
                    ("A", "Ismoil Somoniy", True),
                    ("B", "Nasr ibn Ahmad", False),
                    ("C", "Amr ibn Lays", False),
                    ("D", "Tohir ibn Husayn", False),
                ],
            },
            # 22
            {
                "body": "<p>1501-yilda Tabrizni egallab o‘zini shoh deb e’lon qilgan va Oq qo‘yunlilar davlatiga barham bergan hukmdor:</p>",
                "explanation": "Ismoil Safaviy. Safaviylar sulolasi asoschisi; 1524-yilda vafot etgan.",
                "options": [
                    ("A", "Uzun Hasan", False),
                    ("B", "Ismoil Safaviy", True),
                    ("C", "Qora Yusuf", False),
                    ("D", "Shoh Abbos I", False),
                ],
            },
            # 23
            {
                "body": "<p>Alp Arslon va Malikshoh davrida vazirlik qilgan, adolatli boshqaruv haqidagi «Siyosatnoma» asari muallifi:</p>",
                "explanation": "Nizomulmulk. Abu Ali Hasan ibn Ali at-Tusiy.",
                "options": [
                    ("A", "Mahmud Qoshg‘ariy", False),
                    ("B", "Ahmad Yugnakiy", False),
                    ("C", "Anushtegin", False),
                    ("D", "Nizomulmulk", True),
                ],
            },
            # 24
            {
                "body": "<p>Kichik jinoyatlar uchun ham o‘lim jazosi belgilangan ilk yozma qonunlar muallifi:</p>",
                "explanation": "Drakont. ~mil. avv. 621; «drakoncha qonunlar».",
                "options": [
                    ("A", "Hammurapi", False),
                    ("B", "Perikl", False),
                    ("C", "Drakont", True),
                    ("D", "Solon", False),
                ],
            },
            # 25
            {
                "body": "<p>Kambag‘al fuqarolar davlat ishlarida qatnashishi uchun haq to‘lash tizimini joriy etgan, Parfenon qurilishi tashabbuskori bo‘lgan arbob:</p>",
                "explanation": "Perikl. Afina demokratiyasining eng rivojlangan bosqichi.",
                "options": [
                    ("A", "Perikl", True),
                    ("B", "Solon", False),
                    ("C", "Drakont", False),
                    ("D", "Klisfen", False),
                ],
            },
            # 26
            {
                "body": "<p>Aleksandrning ustozi, «Metafizika», «Siyosat» va «Nikomax axloqi» asarlari muallifi:</p>",
                "explanation": "Aristotel. Mil. avv. IV asr.",
                "options": [
                    ("A", "Arrian", False),
                    ("B", "Platon", False),
                    ("C", "Aristotel", True),
                    ("D", "Sokrat", False),
                ],
            },
            # 27
            {
                "body": "<p>Shaxs va davr bo‘yicha <b>noto‘g‘ri</b> juftlikni toping.</p>",
                "explanation": "Kanishka – mil. avv. I asr. Kanishka – milodiy II asr (~127–150).",
                "options": [
                    ("A", "Qutayba ibn Muslim – VIII asr boshi", False),
                    ("B", "Frada – mil. avv. 522–521-yillar", False),
                    ("C", "Kanishka – mil. avv. I asr", True),
                    ("D", "Diodot – mil. avv. III asr o‘rtasi", False),
                ],
            },
            # 28
            {
                "body": "<p>SPD yetakchisi bo‘lgan, 1919–1925-yillarda Veymar respublikasi prezidenti bo‘lib, o‘rniga Tannenberg g‘olibi saylangan shaxs:</p>",
                "explanation": "Fridrix Ebert. Ebertdan keyin – Gindenburg (1925).",
                "options": [
                    ("A", "Gustav Shtrezeman", False),
                    ("B", "Fridrix Ebert", True),
                    ("C", "Vilgelm II", False),
                    ("D", "Paul fon Gindenburg", False),
                ],
            },
            # 29
            {
                "body": "<p>Turkiy tillarning ilk ensiklopedik lug‘atini yaratgan XI asr allomasi:</p>",
                "explanation": "Mahmud Qoshg‘ariy. «Devonu lug‘otit-turk».",
                "options": [
                    ("A", "Mahmud Qoshg‘ariy", True),
                    ("B", "Yusuf Xos Hojib", False),
                    ("C", "Ahmad Yugnakiy", False),
                    ("D", "Abu Rayhon Beruniy", False),
                ],
            },
            # 30
            {
                "body": "<p>Tasavvuf allomalari haqidagi <b>to‘g‘ri</b> ma’lumotni toping.</p>",
                "explanation": "Najmiddin Kubro mo‘g‘ullar istilosi paytida shahid bo‘lgan. Kubro 1145–1221 (Xorazm); Naqshband 1318–1389.",
                "options": [
                    ("A", "Kubroviya tariqati Buxoroda vujudga kelgan", False),
                    ("B", "Najmiddin Kubro mo‘g‘ullar istilosi paytida shahid bo‘lgan", True),
                    ("C", "Bahouddin Naqshband XII asrda yashagan", False),
                    ("D", "Bahouddin Naqshband Najmiddin Kubrodan oldin yashagan", False),
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
