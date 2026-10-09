"""Django management command: Sodiqov Shohjahon ustozning 7-sinf Jahon Tarixi Milliy Sertifikat mock testini yaratish.

Mavzu: 29--44-mavzular · Rus knyazliklari, Mo'g'ullar, Usmonlilar-Saljuqiylar, Dehli sultonligi, Amerika va Afrika xalqlari.
35 ta test topshirig'i (A, B, C, D) va 10 ta yozma (ochiq) savol. Jami: 45 ta topshiriq.
Barcha diagrammalar, jadvallar, Eyler-Venn sxemalari va xronologik mosliklar birga-bir aniqlikda joylangan.

Muallif/O'qituvchi: shohjahon (Sodiqov Shohjahon, @TarixMilliyCertificate)

Foydalanish:
    python manage.py seed_tarix_shohjahon_7sinf_jahon
    python manage.py seed_tarix_shohjahon_7sinf_jahon --force
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from django.contrib.auth.models import User

from accounts.models import Profile, ensure_profile_for_user
from tests_app.models import Subject, TestSet, Question, AnswerOption, SubQuestion


MOCK_TITLE = "7-sinf Jahon Tarixi — Milliy Sertifikat (29–44-mavzular) | Shohjahon"
MOCK_DESC = (
    "29--44-mavzular · Rus knyazliklari, Mo'g'ullar, Usmonlilar-Saljuqiylar, Dehli sultonligi, Amerika va Afrika xalqlari. "
    "35 ta test topshirig'i (A, B, C, D) va 10 ta yozma (ochiq) savol. Jami: 45 ta topshiriq. "
    "Ustoz: Sodiqov Shohjahon (@TarixMilliyCertificate)."
)


class Command(BaseCommand):
    help = "Sodiqov Shohjahon ustoz nomidan 7-sinf Jahon Tarixi 45 talik Milliy Sertifikat testini yuklaydi."

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
                        f"Qayta yuklash uchun: python manage.py seed_tarix_shohjahon_7sinf_jahon --force"
                    )
                )
                return

        # ── 4. TestSet yaratish ─────────────────────────────────────────────
        test_set = TestSet.objects.create(
            title=MOCK_TITLE,
            description=MOCK_DESC,
            subject=subject,
            category="certificate",
            duration_minutes=80,
            created_by=teacher_user,
            is_published=True,
            is_premium=False,
            is_random=False,
        )

        questions = []

        # ── 5. I va II qism: 35 ta Variantli Test topshiriqlari ──────────────
        mcq_data = [
            # 1
            {
                "body": "<p>Quyidagi hukmdor va voqea juftliklaridan nomuvofiqini toping.</p>",
                "explanation": "To'g'rulbek Anqara jangida qatnashmagan -- bu g'alabani Amir Temur qozongan (1402).",
                "options": [
                    ("A", "Ivan III – Oltin O’rdaga boj to’lashni bekor qildi (1480)", False),
                    ("B", "Aleksandr Nevskiy – Neva jangida shvedlarni yengdi (1240)", False),
                    ("C", "Mehmet II – Konstantinopolni egalladi (1453)", False),
                    ("D", "To’g’rulbek – Anqara jangida Boyazid Yildirimni yengib asirga olgan", True),
                ],
            },
            # 2
            {
                "body": (
                    "<p>Quyidagi ma’lumotlardan qaysilari to’g’ri?</p>"
                    "<div style='background:#f8fafc;padding:12px 16px;border-radius:10px;border:1px solid #e2e8f0;margin:12px 0;font-size:13px;line-height:1.7;'>"
                    "<b>I.</b> Yuriy Dolgorukiy – XII asrda Volga-Oka daryolari havzasini boshqargan, uning nomi bilan 1147-yilda Moskva asos solingan.<br/>"
                    "<b>II.</b> Dmitriy Donskoy – 1380-yilda Kulikovo maydonida Oltin O’rda tumanboshisi Mamayni mag’lub etgan.<br/>"
                    "<b>III.</b> Ivan Kalita – 1480-yilda Moskvani Oltin O’rdaga boj to’lashdan bosh tortdirgan."
                    "</div>"
                ),
                "explanation": "Ivan Kalita emas, Ivan III 1480-yilda Oltin O'rdaga boj to'lashni bekor qilgan.",
                "options": [
                    ("A", "I, II", True),
                    ("B", "I, III", False),
                    ("C", "II, III", False),
                    ("D", "I, II, III", False),
                ],
            },
            # 3
            {
                "body": (
                    "<p>Quyidagi hukmdorlar va ularga oid voqealarni to’g’ri moslashtiring.</p>"
                    "<div style='background:#f8fafc;padding:12px 16px;border-radius:10px;border:1px solid #e2e8f0;margin:12px 0;font-size:13px;line-height:1.7;'>"
                    "<b>I.</b> To’g’rulbek<br/>"
                    "<b>II.</b> Alp Arslon<br/>"
                    "<b>III.</b> Usmon I<br/>"
                    "<b>IV.</b> Mehmet II<br/><br/>"
                    "<b>a)</b> 1038-yilda Saljuqiylar davlatiga asos solgan<br/>"
                    "<b>b)</b> 1071-yilda Mansikert jangida Vizantiya imperatorini mag’lub etgan<br/>"
                    "<b>c)</b> 1299-yilda Usmonlilar davlatiga asos solgan<br/>"
                    "<b>d)</b> 1453-yilda Konstantinopolni egallagan"
                    "</div>"
                ),
                "explanation": "To'g'rulbek -- Saljuqiylar davlatiga asos (1038); Alp Arslon -- Mansikert jangi (1071); Usmon I -- Usmonlilar davlatiga asos (1299); Mehmet II -- Konstantinopol (1453).",
                "options": [
                    ("A", "I-b, II-a, III-d, IV-c", False),
                    ("B", "I-a, II-b, III-c, IV-d", True),
                    ("C", "I-d, II-c, III-b, IV-a", False),
                    ("D", "I-c, II-d, III-a, IV-b", False),
                ],
            },
            # 4
            {
                "body": (
                    "<p>Quyidagi voqealarni to’g’ri xronologik ketma-ketlikda joylashtiring.</p>"
                    "<div style='background:#f8fafc;padding:12px 16px;border-radius:10px;border:1px solid #e2e8f0;margin:12px 0;font-size:13px;line-height:1.7;'>"
                    "1) Chingizxon Onon daryosi qurultoyida ulug’ xon deb e’lon qilindi (1206)<br/>"
                    "2) Sundiata Keyt Mali hukmdori bo’ldi (1230)<br/>"
                    "3) Kulikovo jangi (1380)<br/>"
                    "4) Mansa Muso I ning haj safari (1324)<br/>"
                    "5) Konstantinopol qulashi (1453)<br/>"
                    "6) Moskva Oltin O’rdaga bo’ysunishdan bosh tortdi (1480)"
                    "</div>"
                ),
                "explanation": "Xronologik tartib: 1206 (1) → 1230 (2) → 1324 (4) → 1380 (3) → 1453 (5) → 1480 (6).",
                "options": [
                    ("A", "1, 2, 3, 4, 5, 6", False),
                    ("B", "2, 1, 4, 3, 5, 6", False),
                    ("C", "1, 2, 4, 3, 5, 6", True),
                    ("D", "1, 2, 4, 3, 6, 5", False),
                ],
            },
            # 5
            {
                "body": (
                    "<p>Quyida berilgan davlat boshqaruvi atamalarini izohi bilan to’g’ri moslashtiring.</p>"
                    "<div style='background:#f8fafc;padding:12px 16px;border-radius:10px;border:1px solid #e2e8f0;margin:12px 0;font-size:13px;line-height:1.7;'>"
                    "<b>I.</b> Ulus<br/>"
                    "<b>II.</b> Suyurg’ol<br/>"
                    "<b>III.</b> Bosqoq<br/>"
                    "<b>IV.</b> Iqto’<br/><br/>"
                    "<b>a)</b> Mo’g’ulcha ”davlat, xalq”, Chingizxon farzandlariga bo’lib berilgan hudud<br/>"
                    "<b>b)</b> Hukmdor tomonidan xizmat evaziga berilgan, naslga meros bo’ladigan yer-mulk<br/>"
                    "<b>c)</b> Soliq va bojlarning to’lanishini nazorat qilgan mo’g’ul noibi<br/>"
                    "<b>d)</b> Dehli sultonligida xizmat evaziga berilgan yer egaligi turi"
                    "</div>"
                ),
                "explanation": "Ulus -- a; Suyurg'ol -- b; Bosqoq -- c; Iqto' -- d.",
                "options": [
                    ("A", "I-b, II-a, III-d, IV-c", False),
                    ("B", "I-c, II-d, III-a, IV-b", False),
                    ("C", "I-d, II-c, III-b, IV-a", False),
                    ("D", "I-a, II-b, III-c, IV-d", True),
                ],
            },
            # 6
            {
                "body": (
                    "<p>Quyida berilgan Yaponiya davlat tizimi atamalarini izohi bilan to’g’ri moslashtiring.</p>"
                    "<div style='background:#f8fafc;padding:12px 16px;border-radius:10px;border:1px solid #e2e8f0;margin:12px 0;font-size:13px;line-height:1.7;'>"
                    "<b>I.</b> Syogun<br/>"
                    "<b>II.</b> Xanke<br/>"
                    "<b>III.</b> Mikado<br/>"
                    "<b>IV.</b> Samuray<br/><br/>"
                    "<b>a)</b> Yaponiyada real hokimiyatni qo’lga olgan eng kuchli harbiy qo’mondon<br/>"
                    "<b>b)</b> Eng nufuzli yirik yer egalari toifasi<br/>"
                    "<b>c)</b> Yaponiya imperatorining unvoni<br/>"
                    "<b>d)</b> Harbiy jangchilar"
                    "</div>"
                ),
                "explanation": "Syogun -- a; Xanke -- b; Mikado -- c; Samuray -- d.",
                "options": [
                    ("A", "I-a, II-b, III-c, IV-d", True),
                    ("B", "I-c, II-a, III-d, IV-b", False),
                    ("C", "I-d, II-c, III-a, IV-b", False),
                    ("D", "I-b, II-d, III-c, IV-a", False),
                ],
            },
            # 7
            {
                "body": "<p>Tarixiy shaxsni aniqlang. 1206-yilda Onon daryosi bo’yidagi qurultoyda ulug’ xon deb e’lon qilingan, mo’g’ul qabilalarini birlashtirgan shaxs.</p>",
                "explanation": "Temuchin (Chingizxon) 1206-yilda Onon daryosi qurultoyida ulug' xon bo'lgan.",
                "options": [
                    ("A", "Botuxon", False),
                    ("B", "Temuchin (Chingizxon)", True),
                    ("C", "O’qtoy", False),
                    ("D", "Jonibek", False),
                ],
            },
            # 8
            {
                "body": "<p>Tarixiy shaxsni aniqlang. 1230–1255-yillarda Mali hukmdori bo’lib, kuchli qo’shin tuzib, oltin konlari va Gana yerlarini egallagan shaxs.</p>",
                "explanation": "Sundiata Keyt 1230-1255-yillarda Mali hukmdori bo'lgan.",
                "options": [
                    ("A", "Mansa Muso I", False),
                    ("B", "Almi", False),
                    ("C", "Sundiata Keyt", True),
                    ("D", "Abu Bakr", False),
                ],
            },
            # 9
            {
                "body": "<p>Tarixiy davlatni aniqlang. 1038–1308-yillarda mavjud bo’lgan, 1071-yilda Mansikert jangida Vizantiya imperatorini mag’lub etib asirga olgan davlat.</p>",
                "explanation": "Saljuqiylar davlati (1038-1308), Mansikert jangi -- 1071.",
                "options": [
                    ("A", "Usmonlilar davlati", False),
                    ("B", "G’aznaviylar davlati", False),
                    ("C", "Dehli sultonligi", False),
                    ("D", "Saljuqiylar davlati", True),
                ],
            },
            # 10
            {
                "body": "<p>Tarixiy davlatni aniqlang. Mo’g’ullar sulolasi Xitoyda tashkil etgan, Xubilayxon asos solgan, 1279–1368-yillarda hukmronlik qilgan sulola.</p>",
                "explanation": "Yuan sulolasi -- Xubilayxon asos solgan, 1279-1368.",
                "options": [
                    ("A", "Yuan sulolasi", True),
                    ("B", "Min imperiyasi", False),
                    ("C", "Koryo sulolasi", False),
                    ("D", "Choson", False),
                ],
            },
            # 11
            {
                "body": (
                    "<p>Quyidagilardan qaysilari Oltin O’rda davlatining zaiflashishi va parchalanishiga olib kelgan omillar bo’lgan?</p>"
                    "<div style='background:#f8fafc;padding:12px 16px;border-radius:10px;border:1px solid #e2e8f0;margin:12px 0;font-size:13px;line-height:1.7;'>"
                    "1) To’xtamishxon va Amir Temur o’rtasidagi raqobat (Terek jangi, 1395)<br/>"
                    "2) Ichki taxt talashlar va mahalliy noiblarning mustaqillashuvi<br/>"
                    "3) Islom dinining 1314-yilda davlat dini deb e’lon qilinishi<br/>"
                    "4) XV asrning birinchi yarmida Qrim, Qozon, Sibir, Qozoq xonliklarining ajralib chiqishi<br/>"
                    "5) Chingizxonning davlatni to’rt ulusga bo’lib berishi (1224)<br/>"
                    "6) Chjan Xening dengiz ekspeditsiyalari"
                    "</div>"
                ),
                "explanation": "Oltin O'rda zaiflashishi: Amir Temur-To'xtamish raqobati, ichki taxt talashlar, XV asrda xonliklarga bo'linishi (1,2,4). 3,5,6 bu jarayonga bevosita aloqasi yo'q.",
                "options": [
                    ("A", "1, 3, 5", False),
                    ("B", "1, 2, 4", True),
                    ("C", "2, 3, 6", False),
                    ("D", "1, 4, 6", False),
                ],
            },
            # 12
            {
                "body": (
                    "<p>Quyidagi mo’g’ul lavozimlarini vazifasi bilan to’g’ri moslashtiring.</p>"
                    "<div style='background:#f8fafc;padding:12px 16px;border-radius:10px;border:1px solid #e2e8f0;margin:12px 0;font-size:13px;line-height:1.7;'>"
                    "<b>I.</b> Beklarbegi<br/>"
                    "<b>II.</b> Bosqoq<br/>"
                    "<b>III.</b> No’yon<br/>"
                    "<b>IV.</b> Kashik<br/><br/>"
                    "<b>a)</b> Chingizxon ixtiyoridagi maxsus gvardiya<br/>"
                    "<b>b)</b> Mo’g’ul urug’ boshliqlari<br/>"
                    "<b>c)</b> Oltin O’rdaning ijro hokimiyati boshlig’i<br/>"
                    "<b>d)</b> Soliq va bojlarning to’lanishini nazorat qiluvchi noib"
                    "</div>"
                ),
                "explanation": "Beklarbegi -- c; Bosqoq -- d; No'yon -- b; Kashik -- a.",
                "options": [
                    ("A", "I-a, II-b, III-c, IV-d", False),
                    ("B", "I-b, II-a, III-d, IV-c", False),
                    ("C", "I-c, II-d, III-b, IV-a", True),
                    ("D", "I-d, II-c, III-a, IV-b", False),
                ],
            },
            # 13
            {
                "body": "<p>1224-yilda Chingizxon davlatni o’g’illariga bo’lib bergan to’rt ulusni to’g’ri ko’rsating.</p>",
                "explanation": "To'rt ulus: Jo'ji, Chig'atoy, O'qtoy, Tuli (1224).",
                "options": [
                    ("A", "Jo’ji, O’qtoy, Tuli, Yuan", False),
                    ("B", "Jo’ji, Chig’atoy, Tuli, Yuan", False),
                    ("C", "Chig’atoy, O’qtoy, Tuli, Yuan", False),
                    ("D", "Jo’ji, Chig’atoy, O’qtoy, Tuli", True),
                ],
            },
            # 14
            {
                "body": "<p>1395-yilda Amir Temur Shimoliy Kavkazda To’xtamishxonni qaysi jangda mag’lub etgan?</p>",
                "explanation": "Terek jangi (1395), Shimoliy Kavkazda.",
                "options": [
                    ("A", "Terek jangi", True),
                    ("B", "Qunduzcha jangi", False),
                    ("C", "Kalka jangi", False),
                    ("D", "Mansikert jangi", False),
                ],
            },
            # 15
            {
                "body": "<p>Dehli sultonligida davlat ixtiyoridagi, soliqlari to’g’ridan-to’g’ri xazinaga tushadigan yerlar qanday atalgan?</p>",
                "explanation": "Xolisa -- davlat ixtiyoridagi yer, soliqlari xazinaga tushadi.",
                "options": [
                    ("A", "Iqto’", False),
                    ("B", "Xolisa", True),
                    ("C", "Suyurg’ol", False),
                    ("D", "Syoyen", False),
                ],
            },
            # 16
            {
                "body": (
                    "<p>Quyidagilardan qaysilari Oltin O’rda parchalanishi natijasida XV asrning birinchi yarmida vujudga kelgan xonliklar?</p>"
                    "<div style='background:#f8fafc;padding:12px 16px;border-radius:10px;border:1px solid #e2e8f0;margin:12px 0;font-size:13px;line-height:1.7;'>"
                    "1) Qrim xonligi<br/>"
                    "2) Qozon xonligi<br/>"
                    "3) Yuan sulolasi<br/>"
                    "4) Sibir xonligi<br/>"
                    "5) Qozoq xonligi<br/>"
                    "6) Songay davlati"
                    "</div>"
                ),
                "explanation": "Qrim, Qozon, Sibir, Qozoq xonliklari (Yuan sulolasi Xitoyda, Songay Afrikada -- bu ro'yxatga aloqasi yo'q).",
                "options": [
                    ("A", "1, 2, 3, 4", False),
                    ("B", "2, 3, 4, 5", False),
                    ("C", "1, 2, 4, 5", True),
                    ("D", "1, 3, 5, 6", False),
                ],
            },
            # 17 (SXEMATIK DIAGRAMMA)
            {
                "body": (
                    "<p>Sxematik diagrammada Usmonlilar davlatining uchta hukmdori hukmronlik davri ko’rsatilgan. 1–3 raqamlaridan qaysi biri Boyazid Yildirim hukmronligiga to’g’ri keladi?</p>"
                    "<div style='display:flex;flex-direction:column;gap:10px;max-width:380px;margin:16px auto;'>"
                    "<div style='border:2px solid #3b82f6;border-radius:10px;padding:12px;text-align:center;font-weight:bold;background:#eff6ff;color:#1e3a8a;'>"
                    "1 – 1299–1326-yillar (Usmon I)"
                    "</div>"
                    "<div style='border:2px solid #f59e0b;border-radius:10px;padding:12px;text-align:center;font-weight:bold;background:#fffbeb;color:#92400e;'>"
                    "2 – 1389–1402-yillar"
                    "</div>"
                    "<div style='border:2px solid #10b981;border-radius:10px;padding:12px;text-align:center;font-weight:bold;background:#ecfdf5;color:#065f46;'>"
                    "3 – 1451–1481-yillar (Mehmet II)"
                    "</div>"
                    "</div>"
                ),
                "explanation": "Boyazid Yildirim 1389-1402-yillarda hukmronlik qilgan -- bu 2-sonli davrga to'g'ri keladi.",
                "options": [
                    ("A", "1", False),
                    ("B", "3", False),
                    ("C", "Hech biri", False),
                    ("D", "2", True),
                ],
            },
            # 18 (JADVAL: VOQEA VA NATIJA)
            {
                "body": (
                    "<p>Jadvaldagi voqea va natijalardan qaysi birlari to’g’ri moslashtirilgan?</p>"
                    "<div style='overflow-x:auto;'>"
                    "<table style='width:100%;border-collapse:collapse;margin:12px 0;font-size:13px;'>"
                    "<tr style='background:#f1f5f9;border-bottom:2px solid #cbd5e1;'>"
                    "<th style='padding:8px 10px;text-align:center;width:40px;'>#</th>"
                    "<th style='padding:8px 12px;text-align:left;'>Voqea</th>"
                    "<th style='padding:8px 12px;text-align:left;'>Natija</th>"
                    "</tr>"
                    "<tr style='border-bottom:1px solid #e2e8f0;'>"
                    "<td style='padding:8px 10px;text-align:center;font-weight:bold;'>1</td>"
                    "<td style='padding:8px 12px;'>Kalka jangi (1223)</td>"
                    "<td style='padding:8px 12px;'>Rus-qipchoq qo’shini mag’lub bo’ldi</td>"
                    "</tr>"
                    "<tr style='border-bottom:1px solid #e2e8f0;'>"
                    "<td style='padding:8px 10px;text-align:center;font-weight:bold;'>2</td>"
                    "<td style='padding:8px 12px;'>Mansikert jangi (1071)</td>"
                    "<td style='padding:8px 12px;'>Vizantiya imperatori Roman IV Diogen asirga olindi</td>"
                    "</tr>"
                    "<tr style='border-bottom:1px solid #e2e8f0;'>"
                    "<td style='padding:8px 10px;text-align:center;font-weight:bold;'>3</td>"
                    "<td style='padding:8px 12px;'>Anqara jangi (1402)</td>"
                    "<td style='padding:8px 12px;'>Boyazid Yildirim mag’lub etilib asirga olindi</td>"
                    "</tr>"
                    "<tr style='border-bottom:1px solid #e2e8f0;'>"
                    "<td style='padding:8px 10px;text-align:center;font-weight:bold;'>4</td>"
                    "<td style='padding:8px 12px;'>Terek jangi (1395)</td>"
                    "<td style='padding:8px 12px;'>To’xtamishxon mag’lub bo’ldi</td>"
                    "</tr>"
                    "<tr style='border-bottom:1px solid #e2e8f0;'>"
                    "<td style='padding:8px 10px;text-align:center;font-weight:bold;'>5</td>"
                    "<td style='padding:8px 12px;'>Kulikovo jangi (1380)</td>"
                    "<td style='padding:8px 12px;'>Oltin O’rda tumanboshisi Mamay g’olib chiqdi</td>"
                    "</tr>"
                    "<tr style='border-bottom:1px solid #e2e8f0;'>"
                    "<td style='padding:8px 10px;text-align:center;font-weight:bold;'>6</td>"
                    "<td style='padding:8px 12px;'>Neva jangi (1240)</td>"
                    "<td style='padding:8px 12px;'>Shvedlar mag’lub etildi</td>"
                    "</tr>"
                    "</table>"
                    "</div>"
                ),
                "explanation": "5-band xato: Kulikovo jangida (1380) Mamay emas, Dmitriy Donskoy g'olib chiqqan. (1, 2, 3, 4, 6 to'g'ri).",
                "options": [
                    ("A", "1, 2, 3, 4, 6", True),
                    ("B", "1, 2, 3, 4, 5, 6", False),
                    ("C", "2, 3, 4, 5, 6", False),
                    ("D", "1, 3, 4, 5, 6", False),
                ],
            },
            # 19 (JADVAL: ASR VA VOQEALAR)
            {
                "body": (
                    "<p>Jadvalda harflar bilan belgilangan o’rinlarga mos keluvchi ma’lumotni toping.</p>"
                    "<div style='overflow-x:auto;'>"
                    "<table style='width:100%;border-collapse:collapse;margin:12px 0;font-size:13px;'>"
                    "<tr style='background:#f1f5f9;border-bottom:2px solid #cbd5e1;'>"
                    "<th style='padding:8px 12px;text-align:left;'>Asr</th>"
                    "<th style='padding:8px 12px;text-align:left;'>O’zbekiston tarixidagi voqea</th>"
                    "<th style='padding:8px 12px;text-align:left;'>Jahon tarixidagi voqea</th>"
                    "</tr>"
                    "<tr style='border-bottom:1px solid #e2e8f0;'>"
                    "<td style='padding:8px 12px;font-weight:bold;'>VIII asr</td>"
                    "<td style='padding:8px 12px;color:#2563eb;font-weight:bold;'>a</td>"
                    "<td style='padding:8px 12px;'>Gana davlati vujudga keldi</td>"
                    "</tr>"
                    "<tr style='border-bottom:1px solid #e2e8f0;'>"
                    "<td style='padding:8px 12px;font-weight:bold;'>XIII asr</td>"
                    "<td style='padding:8px 12px;'>Mo’g’ullar Xorazmni bosib oldi</td>"
                    "<td style='padding:8px 12px;color:#2563eb;font-weight:bold;'>b</td>"
                    "</tr>"
                    "</table>"
                    "</div>"
                    "<div style='background:#f8fafc;padding:10px 14px;border-radius:8px;border:1px solid #e2e8f0;margin-top:8px;font-size:12.5px;'>"
                    "<b>Ma’lumotlar:</b><br/>"
                    "1) Qutayba ibn Muslimning Movarounnahrni zabt etishni boshlashi (705);<br/>"
                    "2) Mali davlati taraqqiyot cho’qqisiga chiqdi (XIII asr);<br/>"
                    "3) Birinchi salib yurishi boshlandi (1096);<br/>"
                    "4) Yuan sulolasi tashkil topdi (1279)."
                    "</div>"
                ),
                "explanation": "a-1 (Qutayba, 705, VIII asr); b-2 (Mali davlati XIII asrda cho'qqiga chiqdi).",
                "options": [
                    ("A", "a-3, b-4", False),
                    ("B", "a-1, b-2", True),
                    ("C", "a-1, b-4", False),
                    ("D", "a-3, b-2", False),
                ],
            },
            # 20 (EYLER-VENN DIAGRAMMA)
            {
                "body": (
                    "<p>Quyida berilgan ma’lumotlarni tahlil qilib <b>Eyler-Venn diagrammasiga</b> mos keladigan javoblarni aniqlang. <i>(Dehli sultonligi va Usmonlilar davlati)</i></p>"
                    "<div style='display:flex;justify-content:center;margin:16px 0;'>"
                    "<svg width='360' height='180' viewBox='0 0 360 180' style='max-width:100%;'>"
                    "<circle cx='130' cy='90' r='75' fill='rgba(37, 99, 235, 0.12)' stroke='#2563eb' stroke-width='2'/>"
                    "<circle cx='230' cy='90' r='75' fill='rgba(16, 185, 129, 0.12)' stroke='#10b981' stroke-width='2'/>"
                    "<text x='95' y='75' font-size='16' font-weight='bold' fill='#1d4ed8' text-anchor='middle'>I</text>"
                    "<text x='95' y='95' font-size='12' font-weight='600' fill='#1e40af' text-anchor='middle'>Dehli sult.</text>"
                    "<text x='180' y='85' font-size='16' font-weight='bold' fill='#6d28d9' text-anchor='middle'>III</text>"
                    "<text x='265' y='75' font-size='16' font-weight='bold' fill='#047857' text-anchor='middle'>II</text>"
                    "<text x='265' y='95' font-size='12' font-weight='600' fill='#065f46' text-anchor='middle'>Usmonlilar</text>"
                    "</svg>"
                    "</div>"
                    "<div style='font-size:12.5px;color:#334155;line-height:1.7;background:#f8fafc;padding:12px;border-radius:8px;border:1px solid #e2e8f0;'>"
                    "<b>a)</b> Hindistonda joylashgan;<br/>"
                    "<b>b)</b> Konstantinopolni 1453-yilda egallagan;<br/>"
                    "<b>c)</b> Musulmon davlat;<br/>"
                    "<b>d)</b> 1206-yilda asos solingan;<br/>"
                    "<b>e)</b> Boshqaruvda iqto’ tizimidan foydalangan;<br/>"
                    "<b>f)</b> XIII–XVI asrlarda mavjud bo’lgan."
                    "</div>"
                ),
                "explanation": "Faqat Dehli sultonligiga xos -- a, d (Hindiston, 1206); faqat Usmonlilarga xos -- b, f (Konstantinopol, XIII-XVI asr); ikkalasiga umumiy -- c, e (musulmon davlat, iqto' tizimi).",
                "options": [
                    ("A", "I-a, d; II-b; III-c, e, f", False),
                    ("B", "I-b, d; II-a; III-c, e, f", False),
                    ("C", "I-a, d; II-b, f; III-c, e", True),
                    ("D", "I-d; II-a, b; III-c, e, f", False),
                ],
            },
            # 21
            {
                "body": (
                    "<p>Quyidagi shaxslar va ularning asarlarini to’g’ri moslashtiring.</p>"
                    "<div style='background:#f8fafc;padding:12px 16px;border-radius:10px;border:1px solid #e2e8f0;margin:12px 0;font-size:13px;line-height:1.7;'>"
                    "<b>I.</b> Piri Rais<br/>"
                    "<b>II.</b> Evliya Chalabiy<br/>"
                    "<b>III.</b> Xoja Sinon<br/>"
                    "<b>IV.</b> Sechjon Buyuk<br/><br/>"
                    "<b>a)</b> ”Bahriya” atlasi muallifi<br/>"
                    "<b>b)</b> Ko’p jildli ”Sayohatnoma” muallifi<br/>"
                    "<b>c)</b> 300 dan ortiq inshoot qurilishiga boshchilik qilgan Usmonli bosh me’mori<br/>"
                    "<b>d)</b> Koreys alifbosi yaratilishiga rahbarlik qilgan Koreya qiroli"
                    "</div>"
                ),
                "explanation": "Piri Rais -- a; Evliya Chalabiy -- b; Xoja Sinon -- c; Sechjon Buyuk -- d.",
                "options": [
                    ("A", "I-b, II-a, III-d, IV-c", False),
                    ("B", "I-c, II-d, III-a, IV-b", False),
                    ("C", "I-d, II-c, III-b, IV-a", False),
                    ("D", "I-a, II-b, III-c, IV-d", True),
                ],
            },
            # 22
            {
                "body": "<p>Yukatan yarim orolida shahar-davlatlar tuzgan, kohinlari yulduzlar harakatini hisoblagan xalqni aniqlang.</p>",
                "explanation": "Mayyalar Yukatan yarim orolida shahar-davlatlar tuzgan.",
                "options": [
                    ("A", "Mayyalar", True),
                    ("B", "Asteklar", False),
                    ("C", "Inklar", False),
                    ("D", "Kechua", False),
                ],
            },
            # 23
            {
                "body": "<p>Sabab va natija bo’yicha quyidagi juftliklardan qaysi birida xatolik bor?</p>",
                "explanation": "Xato: Mehmet IIning Konstantinopolni egallashi (1453) Vizantiya imperiyasiga butunlay barham berdi, uni mustahkamlamadi.",
                "options": [
                    ("A", "Sabab: Dmitriy Donskoyning Kulikovo jangidagi g’alabasi (1380) → Natija: rus knyazliklari birlashish jarayoni kuchaydi", False),
                    ("B", "Sabab: Mehmet IIning Konstantinopolni egallashi (1453) → Natija: Vizantiya imperiyasi mustahkamlandi", True),
                    ("C", "Sabab: Ivan IIIning Oltin O’rdaga boj to’lashdan bosh tortishi (1480) → Natija: Moskva mustaqil davlatga aylandi", False),
                    ("D", "Sabab: Amir Temurning Anqara jangidagi g’alabasi (1402) → Natija: Boyazid Yildirim asirga olindi", False),
                ],
            },
            # 24
            {
                "body": (
                    "<p>Quyidagi Afrika davlatlariga oid voqealarni to’g’ri xronologik ketma-ketlikda joylashtiring.</p>"
                    "<div style='background:#f8fafc;padding:12px 16px;border-radius:10px;border:1px solid #e2e8f0;margin:12px 0;font-size:13px;line-height:1.7;'>"
                    "1) Aksum davlati yuksaldi (IV–V asr)<br/>"
                    "2) Gana davlati taraqqiyot cho’qqisiga chiqdi (X asr)<br/>"
                    "3) Sundiata Keyt Mali hukmdori bo’ldi (1230)<br/>"
                    "4) Mansa Muso I ning haj safari (1324)<br/>"
                    "5) Songay davlati Malidan mustaqil bo’ldi (XIV asr oxiri)"
                    "</div>"
                ),
                "explanation": "To'g'ri tartib: Aksum (IV-V asr) → Gana (X asr) → Sundiata Keyt (1230) → Mansa Muso haji (1324) → Songay mustaqilligi (XIV asr oxiri).",
                "options": [
                    ("A", "2, 1, 3, 4, 5", False),
                    ("B", "1, 2, 4, 3, 5", False),
                    ("C", "1, 2, 3, 4, 5", True),
                    ("D", "1, 3, 2, 4, 5", False),
                ],
            },
            # 25
            {
                "body": (
                    "<p>Nuqtalar o’rniga to’g’ri ma’lumotlarni joylashtiring. <i>Dehli sultonligi 1206-yilda Qutbiddin Oybok tomonidan tashkil etilgan. Uning qo’shini asosan ...(1)... suvoriylaridan tashkil topgan edi. Keyinchalik Aloviddin Xiljiy ...(2)... bo’ysundirib, davlat qudratini tiklagan edi.</i></p>"
                ),
                "explanation": "Dehli sultonligi qo'shini turkiy suvoriylardan tashkil topgan; Aloviddin Xiljiy o'zboshimcha feodallarni bo'ysundirgan.",
                "options": [
                    ("A", "1-mo’g’ul, 2-qo’shni davlatlarni", False),
                    ("B", "1-arab, 2-qo’shni davlatlarni", False),
                    ("C", "1-fors, 2-o’zboshimcha feodallarni", False),
                    ("D", "1-turkiy, 2-o’zboshimcha feodallarni", True),
                ],
            },
            # 26
            {
                "body": "<p>Asteklar va Inklar boshqaruvida umumiy bo’lgan jihatni aniqlang.</p>",
                "explanation": "Tlatoani ham, Oliy Inka ham diniy (bosh kohin) va harbiy (lashkarboshi) hokimiyatni birlashtirgan.",
                "options": [
                    ("A", "Ikkalasida ham hukmdor diniy va harbiy hokimiyatni birlashtirgan", True),
                    ("B", "Ikkalasi ham tugunli yozuvdan foydalangan", False),
                    ("C", "Ikkalasi ham Yukatan yarim orolida joylashgan", False),
                    ("D", "Ikkalasi ham Bering bo’g’ozi orqali kelgan birinchi davlat", False),
                ],
            },
            # 27
            {
                "body": "<p>Quyidagi xalq va poytaxt juftliklaridan qaysi birida muvofiqlik saqlanmagan?</p>",
                "explanation": "Xato: Songay davlatining poytaxti Niani emas, Gao bo'lgan (Niani -- Mali poytaxti).",
                "options": [
                    ("A", "Asteklar – Tenochtitlan", False),
                    ("B", "Songay davlati – Niani", True),
                    ("C", "Mali davlati – Niani", False),
                    ("D", "Inklar – Kusko", False),
                ],
            },
            # 28
            {
                "body": "<p>Millati yunon bo’lgan, 300 dan ortiq inshoot (masjid, madrasa, saroy) qurilishiga boshchilik qilgan Usmonli bosh me’morini aniqlang.</p>",
                "explanation": "Xoja Sinon -- millati yunon, 300dan ortiq inshoot qurgan Usmonli bosh me'mori.",
                "options": [
                    ("A", "Piri Rais", False),
                    ("B", "Evliya Chalabiy", False),
                    ("C", "Xoja Sinon", True),
                    ("D", "Sechjon Buyuk", False),
                ],
            },
            # 29
            {
                "body": "<p>Ko’p jildli ”Sayohatnoma” asarining muallifini aniqlang.</p>",
                "explanation": "Evliya Chalabiy -- ko'p jildli 'Sayohatnoma' muallifi.",
                "options": [
                    ("A", "Piri Rais", False),
                    ("B", "Xoja Sinon", False),
                    ("C", "Marko Polo", False),
                    ("D", "Evliya Chalabiy", True),
                ],
            },
            # 30
            {
                "body": (
                    "<p>Quyidagi asarlar va ularning mualliflarini to’g’ri moslashtiring.</p>"
                    "<div style='background:#f8fafc;padding:12px 16px;border-radius:10px;border:1px solid #e2e8f0;margin:12px 0;font-size:13px;line-height:1.7;'>"
                    "<b>I.</b> ”Bahriya”<br/>"
                    "<b>II.</b> ”Sayohatnoma”<br/>"
                    "<b>III.</b> Koreys alifbosi yaratilishi<br/>"
                    "<b>IV.</b> 300dan ortiq inshoot qurilishi<br/><br/>"
                    "<b>a)</b> Piri Rais<br/>"
                    "<b>b)</b> Evliya Chalabiy<br/>"
                    "<b>c)</b> Sechjon Buyuk<br/>"
                    "<b>d)</b> Xoja Sinon"
                    "</div>"
                ),
                "explanation": "Bahriya -- Piri Rais; Sayohatnoma -- Evliya Chalabiy; Koreys alifbosi -- Sechjon Buyuk; 300dan ortiq inshoot -- Xoja Sinon.",
                "options": [
                    ("A", "I-a, II-b, III-c, IV-d", True),
                    ("B", "I-b, II-c, III-d, IV-a", False),
                    ("C", "I-c, II-d, III-a, IV-b", False),
                    ("D", "I-d, II-a, III-b, IV-c", False),
                ],
            },
            # 31
            {
                "body": (
                    "<p>Quyidagi shaxslar va ularning unvonlarini to’g’ri moslashtiring.</p>"
                    "<div style='background:#f8fafc;padding:12px 16px;border-radius:10px;border:1px solid #e2e8f0;margin:12px 0;font-size:13px;line-height:1.7;'>"
                    "<b>I.</b> Tlatoani<br/>"
                    "<b>II.</b> Oliy Inka<br/>"
                    "<b>III.</b> Mikado<br/>"
                    "<b>IV.</b> Syogun<br/><br/>"
                    "<b>a)</b> Asteklar oliy hukmdori-lashkarboshisi unvoni<br/>"
                    "<b>b)</b> ”Quyoshning o’g’li”, Inklar hukmdori unvoni<br/>"
                    "<b>c)</b> Yaponiya imperatorining unvoni<br/>"
                    "<b>d)</b> Yaponiyada real hokimiyatni olgan eng kuchli harbiy qo’mondon"
                    "</div>"
                ),
                "explanation": "Tlatoani -- Asteklar unvoni; Oliy Inka -- 'Quyoshning o'g'li'; Mikado -- Yaponiya imperatori; Syogun -- Yaponiya harbiy hukmdori.",
                "options": [
                    ("A", "I-b, II-a, III-d, IV-c", False),
                    ("B", "I-a, II-b, III-c, IV-d", True),
                    ("C", "I-c, II-d, III-a, IV-b", False),
                    ("D", "I-d, II-c, III-b, IV-a", False),
                ],
            },
            # 32
            {
                "body": "<p>Tarixiy shaxsni aniqlang. Musulmon dengiz sayyohi. 1405–1433-yillarda Hindiston, Sharqiy Afrika va Makkagacha yetti marta ekspeditsiya uyushtirgan.</p>",
                "explanation": "Chjan Xe -- 1405-1433-yillarda yetti marta ekspeditsiya uyushtirgan musulmon dengiz sayyohi.",
                "options": [
                    ("A", "Piri Rais", False),
                    ("B", "Marko Polo", False),
                    ("C", "Chjan Xe", True),
                    ("D", "Qutbiddin Oybok", False),
                ],
            },
            # 33 (33-35 MATRIX QUESTION 1)
            {
                "body": (
                    "<p><b>33–35-topshiriqlarga mos keluvchi javoblarni (A–F) javob variantlaridan tanlang.</b></p>"
                    "<div style='background:#f8fafc;padding:10px 14px;border-radius:8px;border:1px solid #e2e8f0;margin-bottom:12px;font-size:12.5px;'>"
                    "<b>Javob variantlari:</b><br/>"
                    "A) Abu Bakr<br/>"
                    "B) Almi<br/>"
                    "C) Sundiata Keyt<br/>"
                    "D) Mansa Muso I<br/>"
                    "E) Xubilayxon<br/>"
                    "F) Chju Yuan-Chjan"
                    "</div>"
                    "<p><b>33-topshiriq:</b> Qaysi hukmdor 1324-yilda Makkaga haj qilib, ko’p miqdorda oltin olib borgan?</p>"
                ),
                "explanation": "Mansa Muso I -- 1324-yilda Makkaga haj, ko'p oltin olib borgan.",
                "options": [
                    ("A", "Abu Bakr", False),
                    ("B", "Almi", False),
                    ("C", "Sundiata Keyt", False),
                    ("D", "Mansa Muso I", True),
                ],
            },
            # 34 (33-35 MATRIX QUESTION 2)
            {
                "body": (
                    "<p><b>33–35-topshiriqlarga mos keluvchi javoblarni (A–F) javob variantlaridan tanlang.</b></p>"
                    "<div style='background:#f8fafc;padding:10px 14px;border-radius:8px;border:1px solid #e2e8f0;margin-bottom:12px;font-size:12.5px;'>"
                    "<b>Javob variantlari:</b><br/>"
                    "A) Abu Bakr<br/>"
                    "B) Almi<br/>"
                    "C) Sundiata Keyt<br/>"
                    "D) Mansa Muso I<br/>"
                    "E) Xubilayxon<br/>"
                    "F) Chju Yuan-Chjan"
                    "</div>"
                    "<p><b>34-topshiriq:</b> Qaysi hukmdor 1076-yilda Ganani istilo qilgan?</p>"
                ),
                "explanation": "Abu Bakr -- 1076-yilda Ganani istilo qilgan Marokash sultoni.",
                "options": [
                    ("A", "Abu Bakr", True),
                    ("B", "Almi", False),
                    ("C", "Sundiata Keyt", False),
                    ("D", "Mansa Muso I", False),
                ],
            },
            # 35 (33-35 MATRIX QUESTION 3)
            {
                "body": (
                    "<p><b>33–35-topshiriqlarga mos keluvchi javoblarni (A–F) javob variantlaridan tanlang.</b></p>"
                    "<div style='background:#f8fafc;padding:10px 14px;border-radius:8px;border:1px solid #e2e8f0;margin-bottom:12px;font-size:12.5px;'>"
                    "<b>Javob variantlari:</b><br/>"
                    "A) Abu Bakr<br/>"
                    "B) Almi<br/>"
                    "C) Sundiata Keyt<br/>"
                    "D) Mansa Muso I<br/>"
                    "E) Xubilayxon<br/>"
                    "F) Chju Yuan-Chjan"
                    "</div>"
                    "<p><b>35-topshiriq:</b> Qaysi hukmdor XIV asr oxirida Malini yengib, Songay davlatiga mustaqillik olib kelgan?</p>"
                ),
                "explanation": "Almi -- XIV asr oxirida Malini yengib, Songayga mustaqillik olib kelgan.",
                "options": [
                    ("A", "Abu Bakr", False),
                    ("B", "Almi", True),
                    ("C", "Sundiata Keyt", False),
                    ("D", "Mansa Muso I", False),
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
                explanation=item.get("explanation", ""),
            )
            for opt_letter, opt_text, is_corr in item["options"]:
                AnswerOption.objects.create(
                    question=q,
                    text=f"{opt_letter}) {opt_text}",
                    is_correct=is_corr,
                )
            questions.append(q)
            self.stdout.write(f"  [{i:02d}] MCQ qo'shildi...")

        # ── 6. III qism: 10 ta Yozma (ochiq) Savollar (36--45) ──────────────
        open_data = [
            # 36
            {
                "title": "Rus knyazliklari.",
                "parts": [
                    ("a", "Kulikovo jangi qaysi yilda bo’lib o’tganini yozing.", "1380-yil sentyabr (1380)"),
                    ("b", "Ushbu jangda qaysi rus knyazi g’olib chiqqanini yozing.", "Dmitriy Donskoy"),
                ],
                "explanation": "a) 1380-yil sentyabr; b) Dmitriy Donskoy.",
            },
            # 37
            {
                "title": "Mo’g’ullar davlati.",
                "parts": [
                    ("a", "Chingizxon davlatining poytaxtini yozing.", "Qoraqurum"),
                    ("b", "Qaysi yilda va qaysi daryo bo’yidagi qurultoyda Temuchin ulug’ xon deb e’lon qilinganini yozing.", "1206-yilda, Onon daryosi bo'yida (1206, Onon)"),
                ],
                "explanation": "a) Qoraqurum; b) 1206-yilda, Onon daryosi bo'yida.",
            },
            # 38
            {
                "title": "Oltin O’rda xonligi.",
                "parts": [
                    ("a", "Islom dinini davlat dini deb e’lon qilgan xonni yozing.", "O'zbekxon (Ozbekxon)"),
                    ("b", "Bu qaysi yilda sodir bo’lganini yozing.", "1314-yil (1314)"),
                ],
                "explanation": "a) O'zbekxon; b) 1314-yil.",
            },
            # 39
            {
                "title": "Dehli sultonligi.",
                "parts": [
                    ("a", "Sultonlikning ilk hukmdorini yozing.", "Qutbiddin Oybok (Qutbiddin Oybek / Qutbiddin Oybak)"),
                    ("b", "Dehli sultonligi qaysi yillar oralig’ida faoliyat yuritganini yozing.", "1206-1526-yillar (1206-1526)"),
                ],
                "explanation": "a) Qutbiddin Oybok; b) 1206-1526-yillar.",
            },
            # 40
            {
                "title": "Usmonlilar davlati.",
                "parts": [
                    ("a", "Davlatga asos solgan hukmdorni yozing.", "Usmon I (Usmon 1 / Usmon G'oziy)"),
                    ("b", "Konstantinopolni egallagan yil va oyni yozing.", "1453-yil may (1453 may)"),
                ],
                "explanation": "a) Usmon I; b) 1453-yil may.",
            },
            # 41
            {
                "title": "Saljuqiylar davlati.",
                "parts": [
                    ("a", "Davlatga asos solgan sultonni yozing.", "To'g'rulbek (Togrulbek)"),
                    ("b", "Mansikert jangi qaysi yilda bo’lib o’tganini yozing.", "1071-yil (1071)"),
                ],
                "explanation": "a) To'g'rulbek; b) 1071-yil.",
            },
            # 42
            {
                "title": "Amerika xalqlari.",
                "parts": [
                    ("a", "Asteklar asos solgan shaharni yozing.", "Tenochtitlan"),
                    ("b", "Inklar asos solgan shaharni yozing.", "Kusko (Cusco)"),
                ],
                "explanation": "a) Tenochtitlan; b) Kusko.",
            },
            # 43
            {
                "title": "Afrika davlatlari.",
                "parts": [
                    ("a", "Mansa Muso I qaysi davlat hukmdori bo’lganini yozing.", "Mali davlati (Mali)"),
                    ("b", "Uning Makkaga haj safari qaysi yilda bo’lganini yozing.", "1324-yil (1324)"),
                ],
                "explanation": "a) Mali davlati; b) 1324-yil.",
            },
            # 44
            {
                "title": "Xitoy, Yaponiya va Koreya.",
                "parts": [
                    ("a", "Yuan sulolasiga asos solgan hukmdorni yozing.", "Xubilayxon (Xubilay)"),
                    ("b", "918–1392-yillarda hukmronlik qilib, ”Koreya” nomini bergan sulolani yozing.", "Koryo sulolasi (Koryo)"),
                ],
                "explanation": "a) Xubilayxon; b) Koryo sulolasi.",
            },
            # 45
            {
                "title": "Madaniyat arboblari.",
                "parts": [
                    ("a", "”Bahriya” atlasi muallifini yozing.", "Piri Rais"),
                    ("b", "Koreys alifbosi yaratilishiga rahbarlik qilgan shaxsni yozing.", "Sechjon Buyuk (Qirol Sechjon / Sechjon)"),
                ],
                "explanation": "a) Piri Rais; b) Sechjon Buyuk.",
            },
        ]

        for i, item in enumerate(open_data, start=36):
            q = Question.objects.create(
                body=f"<p><b>{i}-topshiriq. {item['title']}</b></p><p>Quyidagi savollarga aniq va lo'nda javob yozing:</p>",
                question_type="open_written",
                category="certificate",
                difficulty="hard",
                subject=subject,
                points=2,
                explanation=item.get("explanation", ""),
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
            self.stdout.write(f"  [{i:02d}] Ochiq savol qo'shildi: {item['title']}...")

        # ── 7. Barcha savollarni testga ulash va tartibni saqlash ────────────
        test_set.questions.set(questions)
        test_set.question_order = [q.id for q in questions]
        test_set.save(update_fields=["question_order"])

        self.stdout.write(
            self.style.SUCCESS(
                f"\n🎉 TABRIKLAYMIZ! '{MOCK_TITLE}' muvaffaqiyatli yuklandi!\n"
                f"   • TestSet ID     : {test_set.id}\n"
                f"   • Fan            : {subject.name}\n"
                f"   • Kategoriya     : Milliy Sertifikat (certificate)\n"
                f"   • Ustoz          : @{teacher_user.username} ({teacher_user.get_full_name()})\n"
                f"   • Savollar soni  : {test_set.questions.count()} ta (35 test + 10 yozma ochiq savol)\n"
                f"   • Davomiyligi    : {test_set.duration_minutes} daqiqa\n"
                f"   • Holati         : Nashr etilgan (is_published=True)\n"
            )
        )
