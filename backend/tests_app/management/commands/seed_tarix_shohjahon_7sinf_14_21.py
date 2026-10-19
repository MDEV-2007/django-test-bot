"""Django management command: Sodiqov Shohjahon ustozning 7-sinf Jahon Tarixi Milliy Sertifikat mock testini yaratish.

Mavzu: 14–21-mavzular: Osiyo madaniyati, Yevropa o’rta asr shaharlari, bozor-yarmarka, Osiyo shaharlari, xristianlik, Salib yurishlari.
35 ta test topshirig'i (A, B, C, D) va 10 ta yozma (ochiq) savol. Jami: 45 ta topshiriq.
Barcha diagrammalar, jadvallar, Eyler-Venn sxemalari va xronologik mosliklar birga-bir aniqlikda joylangan.

Muallif/O'qituvchi: shohjahon (Sodiqov Shohjahon, @TarixMilliyCertificate)
Nashr holati: is_published=False (qoralama).

Foydalanish:
    python manage.py seed_tarix_shohjahon_7sinf_14_21
    python manage.py seed_tarix_shohjahon_7sinf_14_21 --force
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from django.contrib.auth.models import User

from accounts.models import Profile, ensure_profile_for_user
from tests_app.models import Subject, TestSet, Question, AnswerOption, SubQuestion


MOCK_TITLE = "7-sinf Jahon Tarixi — Milliy Sertifikat (14–21-mavzular) | Shohjahon"
MOCK_DESC = (
    "14–21-mavzular: Osiyo madaniyati, Yevropa o’rta asr shaharlari, bozor-yarmarka, Osiyo shaharlari, xristianlik, Salib yurishlari. "
    "35 ta test topshirig'i (A, B, C, D) va 10 ta yozma (ochiq) savol. Jami: 45 ta topshiriq. "
    "Muallif: Sodiqov Shohjahon (@TarixMilliyCertificate)."
)


class Command(BaseCommand):
    help = "Sodiqov Shohjahon ustoz nomidan 7-sinf Jahon Tarixi (14-21-mavzular) 45 talik Milliy Sertifikat testini yuklaydi."

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
            self.stdout.write(self.style.SUCCESS(f"Yangi muallif yaratildi: @{teacher_user.username} (Shohjahon Sodiqov)"))
        else:
            prof = ensure_profile_for_user(teacher_user)
            if prof.role != "teacher" and not teacher_user.is_superuser:
                prof.role = "teacher"
                prof.save(update_fields=["role"])
            self.stdout.write(f"Muallif tanlandi: @{teacher_user.username} ({teacher_user.get_full_name()})")

        # ── 3. TestSet tekshiruvi ───────────────────────────────────────────
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
                        f"Qayta yuklash uchun: python manage.py seed_tarix_shohjahon_7sinf_14_21 --force"
                    )
                )
                return

        # ── 4. TestSet yaratish (is_published=False) ────────────────────────
        test_set = TestSet.objects.create(
            title=MOCK_TITLE,
            description=MOCK_DESC,
            subject=subject,
            category="certificate",
            duration_minutes=80,
            is_published=False,  # Nashr etilmagan qoralama holatda
            created_by=teacher_user,
        )
        self.stdout.write(f"TestSet yaratildi: '{test_set.title}' (ID: {test_set.id}, is_published=False)")

        questions = []

        # ── 5. I VA II QISM: 1 - 35 TEST SAVOLLARI ──────────────────────────
        mcq_data = [
            # 1
            {
                "body": "<p>Quyidagilardan nomuvofiqlik saqlangan javobni aniqlang.</p>",
                "explanation": "Innokentiy III Rim papasi bo’lgan (1198-1216), Xorazmshohlarga aloqasi yo’q.",
                "options": [
                    ("A", "Urban II — birinchi salib yurishiga chaqirgan papa", False),
                    ("B", "Salohiddin Ayubiy — 1187-yilda Quddusni qaytarib olgan", False),
                    ("C", "Marko Polo — Xitoyga sayohat qilgan venetsiyalik savdogar", False),
                    ("D", "Innokentiy III — Xorazmshohlar davlati hukmdori", True),
                ],
            },
            # 2
            {
                "body": (
                    "<p>Quyidagi shaxslar va ular bilan bog’liq ma’lumotlar mos ravishda berilgan javobni aniqlang.</p>"
                    "<div style='display:grid;grid-template-columns:repeat(auto-fit, minmax(240px, 1fr));gap:12px;margin:14px 0;'>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;'>"
                    "<b>1)</b> Urban II<br/>"
                    "<b>2)</b> Salohiddin Ayubiy<br/>"
                    "<b>3)</b> Mixail VIII Paleolog<br/>"
                    "<b>4)</b> Lyudovik IX"
                    "</div>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;'>"
                    "<b>a)</b> 1187-yilda Quddusni qaytarib olgan<br/>"
                    "<b>b)</b> 1095-yilda salib yurishiga chaqirgan<br/>"
                    "<b>c)</b> 1261-yilda Vizantiyani tiklagan<br/>"
                    "<b>d)</b> So’nggi salib yurishiga boshchilik qilgan"
                    "</div>"
                    "</div>"
                ),
                "explanation": "1-b (Urban II — 1095-yilda chaqirgan), 2-a (Salohiddin Ayubiy — 1187-yilda Quddusni olgan), 3-c (Mixail VIII — 1261-yilda Vizantiyani tiklagan), 4-d (Lyudovik IX — so'nggi yurish).",
                "options": [
                    ("A", "1-b; 2-a; 3-c; 4-d", True),
                    ("B", "1-a; 2-b; 3-d; 4-c", False),
                    ("C", "1-b; 2-c; 3-a; 4-d", False),
                    ("D", "1-c; 2-a; 3-b; 4-d", False),
                ],
            },
            # 3
            {
                "body": "<p>Kasb ustalarining o’z uyushmasi (nemischa) qanday atalgan?</p>",
                "explanation": "Kasb ustalarining o’z uyushmasi nemischa \"Sex\" deb atalgan (savdogarlarniki esa gildiya).",
                "options": [
                    ("A", "Sex", True),
                    ("B", "Gildiya", False),
                    ("C", "Kommuna", False),
                    ("D", "Korporatsiya", False),
                ],
            },
            # 4
            {
                "body": (
                    "<p>Quyidagi voqealar to’g’ri xronologik ketma-ketlikda ko’rsatilgan javobni toping.</p>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;margin:12px 0;'>"
                    "1) Birinchi salib yurishi boshlandi (1096)<br/>"
                    "2) Salohiddin Ayubiy Quddusni oldi (1187)<br/>"
                    "3) Uchinchi salib yurishi (1189-1192)<br/>"
                    "4) To’rtinchi salib yurishi, Konstantinopol egallandi (1204)<br/>"
                    "5) Vizantiya tiklandi (1261)<br/>"
                    "6) So’nggi salib yurishi (1269-1270)"
                    "</div>"
                ),
                "explanation": "To'g'ri ketma-ketlik: 1096 -> 1187 -> 1189 -> 1204 -> 1261 -> 1269-1270.",
                "options": [
                    ("A", "1, 2, 3, 4, 5, 6", True),
                    ("B", "2, 1, 3, 4, 5, 6", False),
                    ("C", "1, 3, 2, 4, 5, 6", False),
                    ("D", "1, 2, 4, 3, 5, 6", False),
                ],
            },
            # 5
            {
                "body": (
                    "<p>Quyida berilgan diniy-ritsarlik ordenlari va ularning izohi to’g’ri moslashtirilgan javobni toping.</p>"
                    "<div style='display:grid;grid-template-columns:repeat(auto-fit, minmax(240px, 1fr));gap:12px;margin:14px 0;'>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;'>"
                    "<b>I.</b> Gospitalyerlar<br/>"
                    "<b>II.</b> Tampliyerlar<br/>"
                    "<b>III.</b> Tevton ordeni"
                    "</div>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;'>"
                    "<b>a)</b> Dastlabki diniy-ritsarlik ordeni, ioanniylar ham deyilgan<br/>"
                    "<b>b)</b> Muqaddas Bibi Maryamga bag’ishlangan, asosan nemislardan iborat<br/>"
                    "<b>c)</b> Quddusdagi tepalik nomi bilan atalgan, sudxo’rlik bilan ham shug’ullangan"
                    "</div>"
                    "</div>"
                ),
                "explanation": "Gospitalyerlar — dastlabki orden; Tampliyerlar — Quddus tepaligi, sudxo’rlik; Tevton — Bibi Maryamga bag’ishlangan.",
                "options": [
                    ("A", "I-a, II-c, III-b", True),
                    ("B", "I-b, II-a, III-c", False),
                    ("C", "I-a, II-b, III-c", False),
                    ("D", "I-c, II-a, III-b", False),
                ],
            },
            # 6
            {
                "body": (
                    "<p>Quyida berilgan savdo atamalari va ularning izohi to’g’ri moslashtirilgan javobni toping.</p>"
                    "<div style='display:grid;grid-template-columns:repeat(auto-fit, minmax(240px, 1fr));gap:12px;margin:14px 0;'>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;'>"
                    "<b>I.</b> Faktoriya<br/>"
                    "<b>II.</b> Yarmarka<br/>"
                    "<b>III.</b> Bank<br/>"
                    "<b>IV.</b> Birja"
                    "</div>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;'>"
                    "<b>a)</b> Chet elda tashkil etilgan savdo manzilgohi<br/>"
                    "<b>b)</b> Turli mamlakat savdogarlari qatnashadigan ulgurji savdo joyi<br/>"
                    "<b>c)</b> Pul saqlash va qarz berish muassasasi<br/>"
                    "<b>d)</b> Savdogarlar pul almashtiradigan joy"
                    "</div>"
                    "</div>"
                ),
                "explanation": "Faktoriya — savdo manzilgohi; Yarmarka — ulgurji savdo; Bank — pul muassasasi; Birja — pul almashish joyi.",
                "options": [
                    ("A", "I-a, II-b, III-c, IV-d", True),
                    ("B", "I-b, II-a, III-c, IV-d", False),
                    ("C", "I-a, II-c, III-b, IV-d", False),
                    ("D", "I-a, II-b, III-d, IV-c", False),
                ],
            },
            # 7
            {
                "body": "<p>Tarixiy shaxsni aniqlang. Misr sultoni. 1187-yilda salibchilardan Quddusni tortib olgan, bu 3-salib yurishiga sabab bo’lgan.</p>",
                "explanation": "Salohiddin Ayubiy 1187-yilda Hittin jangida salibchilarni mag'lub etib Quddusni qaytarib olgan.",
                "options": [
                    ("A", "Salohiddin Ayubiy", True),
                    ("B", "Boyazid Yildirim", False),
                    ("C", "Toriq ibn Sayid", False),
                    ("D", "Xuloku", False),
                ],
            },
            # 8
            {
                "body": "<p>Tarixiy shaxsni aniqlang. Ukasi tomonidan taxtdan tushirilib, ko’ziga mil tortilgan Vizantiya imperatori. 4-salib yurishiga bahona bo’lgan.</p>",
                "explanation": "Isaak II Angel ukasi Aleksey III tomonidan taxtdan ag'darilib ko'r qilingan, uning o'g'li Aleksey salibchilardan yordam so'rab 4-salib yurishiga sabab bo'lgan.",
                "options": [
                    ("A", "Isaak II Angel", True),
                    ("B", "Feodosiy", False),
                    ("C", "Mixail VIII Paleolog", False),
                    ("D", "Yustinian I", False),
                ],
            },
            # 9
            {
                "body": "<p>Tarixiy hodisani aniqlang. 1204-yilda salibchilar tomonidan egallangan, Vizantiya o’rnida tuzilgan davlat.</p>",
                "explanation": "1204-yilda salibchilar Konstantinopolni egallab, Lotin imperiyasiga asos solishgan.",
                "options": [
                    ("A", "Lotin imperiyasi", True),
                    ("B", "Nikeya imperiyasi", False),
                    ("C", "Trapezund imperiyasi", False),
                    ("D", "Epir despotligi", False),
                ],
            },
            # 10
            {
                "body": "<p>Tarixiy shaxsni aniqlang. 1261-yilda Konstantinopolni qaytarib olib, Vizantiya imperiyasini tiklagan Nikeya imperatori.</p>",
                "explanation": "Mixail VIII Paleolog 1261-yilda Lotin imperiyasini tor-mor etib, Vizantiyani qayta tiklagan.",
                "options": [
                    ("A", "Mixail VIII Paleolog", True),
                    ("B", "Isaak II Angel", False),
                    ("C", "Aleksey I", False),
                    ("D", "Konstantin XI", False),
                ],
            },
            # 11
            {
                "body": (
                    "<p>Quyidagi shaharlardan qaysilari Osiyoning yirik o’rta asr shaharlariga tegishli?</p>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;margin:12px 0;'>"
                    "1) Dehli<br/>"
                    "2) Bag’dod<br/>"
                    "3) Buxoro<br/>"
                    "4) Venetsiya<br/>"
                    "5) Genuya<br/>"
                    "6) Parij"
                    "</div>"
                ),
                "explanation": "Venetsiya, Genuya va Parij Yevropa shaharlari. Dehli, Bag'dod va Buxoro Osiyo shaharlari.",
                "options": [
                    ("A", "1, 2, 3", True),
                    ("B", "4, 5, 6", False),
                    ("C", "1, 3, 5", False),
                    ("D", "2, 4, 6", False),
                ],
            },
            # 12
            {
                "body": "<p>Yevropadagi ilk banklar qaysi asrda paydo bo’lgan?</p>",
                "explanation": "Yevropada dastlabki banklar XIV-XV asrlarda Shimoliy Italiya (Genua, Venetsiya, Florensiya) shaharlarida paydo bo'lgan.",
                "options": [
                    ("A", "XIV-XV asrlar", True),
                    ("B", "IX-X asrlar", False),
                    ("C", "XI-XII asrlar", False),
                    ("D", "XVI-XVII asrlar", False),
                ],
            },
            # 13
            {
                "body": "<p>XI-XV asrlar Yevropa uchun xos bo’lgan holatni aniqlang.</p>",
                "explanation": "XI-XV asrlarda Yevropada shaharlarning yuksalishi, tovar-pul munosabatlarining rivojlanishi natijasida banklar va birjalar paydo bo'ldi.",
                "options": [
                    ("A", "Hunarmandchilik va savdoning yuksalishi natijasida shaharlar, bank va birjalar vujudga keldi", True),
                    ("B", "Yevropa yagona markazlashgan davlat edi", False),
                    ("C", "Feodal tarqoqlik butunlay tugagan edi", False),
                    ("D", "Yozuv umuman mavjud emas edi", False),
                ],
            },
            # 14
            {
                "body": (
                    "<p>Quyidagi tushunchalardan qaysilari xristian cherkoviga tegishli?</p>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;margin:12px 0;'>"
                    "1) Indulgensiya<br/>"
                    "2) Inkvizitsiya<br/>"
                    "3) Autodafe<br/>"
                    "4) Jizya<br/>"
                    "5) Xiroj<br/>"
                    "6) Zakot"
                    "</div>"
                ),
                "explanation": "Jizya, xiroj va zakot islom dini/xalifalik soliqlariga tegishli. Indulgensiya, inkvizitsiya va autodafe xristian cherkoviga tegishli.",
                "options": [
                    ("A", "1, 2, 3", True),
                    ("B", "4, 5, 6", False),
                    ("C", "1, 3, 5", False),
                    ("D", "2, 4, 6", False),
                ],
            },
            # 15
            {
                "body": "<p>Katolik cherkovida ruhoniylarga uylanishni taqiqlash qoidasi qanday atalgan?</p>",
                "explanation": "Katolik cherkovida ruhoniylarga uylanishni taqiqlash qoidasi Selebat deb ataladi.",
                "options": [
                    ("A", "Selebat", True),
                    ("B", "Indulgensiya", False),
                    ("C", "Inkvizitsiya", False),
                    ("D", "Autodafe", False),
                ],
            },
            # 16
            {
                "body": (
                    "<p>Quyidagi voqealar to’g’ri xronologik ketma-ketlikda ko’rsatilgan javobni toping.</p>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;margin:12px 0;'>"
                    "1) Xristianlik Yevropada tarqaldi (IV asr)<br/>"
                    "2) Papa viloyati tashkil topdi (756)<br/>"
                    "3) Cherkovlar rasman ajraldi (XI asr o’rtasi)<br/>"
                    "4) Innokentiy III papaligi boshlandi (1198)<br/>"
                    "5) Birinchi salib yurishi (1096)<br/>"
                    "6) To’rtinchi salib yurishi (1202-1204)"
                    "</div>"
                ),
                "explanation": "Xronologiya: IV asr -> 756 -> XI asr (1054) -> 1096 -> 1198 -> 1202-1204.",
                "options": [
                    ("A", "1, 2, 3, 5, 4, 6", True),
                    ("B", "1, 2, 3, 4, 5, 6", False),
                    ("C", "2, 1, 3, 5, 4, 6", False),
                    ("D", "1, 3, 2, 4, 5, 6", False),
                ],
            },
            # 17 (SCHEMATIC DIAGRAM)
            {
                "body": (
                    "<p>Sxematik diagrammada uch salib yurishi davri ko’rsatilgan. 1–3 raqamlaridan qaysi biri Konstantinopolning egallanishiga to’g’ri keladi?</p>"
                    "<div style='display:flex;justify-content:center;margin:16px 0;'>"
                    "<div style='width:320px;border:2px solid #3b82f6;border-radius:12px;overflow:hidden;background:rgba(59,130,246,0.03);box-shadow:0 2px 10px rgba(0,0,0,0.05);'>"
                    "<div style='padding:12px 16px;border-bottom:1px solid #cbd5e1;display:flex;align-items:center;gap:12px;'>"
                    "<span style='background:#64748b;color:white;width:26px;height:26px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-weight:bold;font-size:13px;'>1</span>"
                    "<span style='font-weight:600;font-size:14px;color:#1e293b;'>1096–1099-yillar</span>"
                    "</div>"
                    "<div style='padding:12px 16px;border-bottom:1px solid #cbd5e1;display:flex;align-items:center;gap:12px;'>"
                    "<span style='background:#64748b;color:white;width:26px;height:26px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-weight:bold;font-size:13px;'>2</span>"
                    "<span style='font-weight:600;font-size:14px;color:#1e293b;'>1189–1192-yillar</span>"
                    "</div>"
                    "<div style='padding:12px 16px;display:flex;align-items:center;gap:12px;background:rgba(59,130,246,0.08);'>"
                    "<span style='background:#2563eb;color:white;width:26px;height:26px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-weight:bold;font-size:13px;'>3</span>"
                    "<span style='font-weight:600;font-size:14px;color:#1e40af;'>1202–1204-yillar</span>"
                    "</div>"
                    "</div>"
                    "</div>"
                ),
                "explanation": "To’rtinchi salib yurishi (1202-1204, 3-band) davomida Konstantinopol egallanib, Lotin imperiyasi tuzilgan.",
                "options": [
                    ("A", "3", True),
                    ("B", "1", False),
                    ("C", "2", False),
                    ("D", "Hech biri", False),
                ],
            },
            # 18 (TABLE)
            {
                "body": (
                    "<p>Tarixiy voqea va uning natijasi o’zaro to’g’ri mos berilgan qatorlarni aniqlang.</p>"
                    "<table style='width:100%;border-collapse:collapse;margin:12px 0;font-size:13px;'>"
                    "<thead>"
                    "<tr style='background:rgba(100,116,139,0.1);border-bottom:2px solid #cbd5e1;'>"
                    "<th style='padding:8px;border:1px solid #cbd5e1;text-align:center;width:40px;'>№</th>"
                    "<th style='padding:8px;border:1px solid #cbd5e1;text-align:left;'>Voqea</th>"
                    "<th style='padding:8px;border:1px solid #cbd5e1;text-align:left;'>Natija</th>"
                    "</tr>"
                    "</thead>"
                    "<tbody>"
                    "<tr><td style='padding:6px;border:1px solid #cbd5e1;text-align:center;'>1</td><td style='padding:6px;border:1px solid #cbd5e1;'>Urban IIning Klermon nutqi (1095)</td><td style='padding:6px;border:1px solid #cbd5e1;'>Birinchi salib yurishi boshlandi</td></tr>"
                    "<tr><td style='padding:6px;border:1px solid #cbd5e1;text-align:center;'>2</td><td style='padding:6px;border:1px solid #cbd5e1;'>Salohiddin Ayubiyning Quddusni olishi (1187)</td><td style='padding:6px;border:1px solid #cbd5e1;'>Uchinchi salib yurishi tashkil etildi</td></tr>"
                    "<tr><td style='padding:6px;border:1px solid #cbd5e1;text-align:center;'>3</td><td style='padding:6px;border:1px solid #cbd5e1;'>To’rtinchi salib yurishi (1204)</td><td style='padding:6px;border:1px solid #cbd5e1;'>Konstantinopol tinch yo’l bilan saqlanib qoldi</td></tr>"
                    "<tr><td style='padding:6px;border:1px solid #cbd5e1;text-align:center;'>4</td><td style='padding:6px;border:1px solid #cbd5e1;'>Mixail VIII Paleologning g’alabasi (1261)</td><td style='padding:6px;border:1px solid #cbd5e1;'>Vizantiya imperiyasi tiklandi</td></tr>"
                    "<tr><td style='padding:6px;border:1px solid #cbd5e1;text-align:center;'>5</td><td style='padding:6px;border:1px solid #cbd5e1;'>Sexlarning tashkil topishi</td><td style='padding:6px;border:1px solid #cbd5e1;'>Ishlab chiqarish nazoratsiz qoldi</td></tr>"
                    "<tr><td style='padding:6px;border:1px solid #cbd5e1;text-align:center;'>6</td><td style='padding:6px;border:1px solid #cbd5e1;'>Marko Polo sayohati</td><td style='padding:6px;border:1px solid #cbd5e1;'>Yevropaliklar Xitoy haqida ma’lumot oldi</td></tr>"
                    "</tbody>"
                    "</table>"
                ),
                "explanation": "3 xato: aksincha, Konstantinopol egallandi. 5 xato: aksincha, sexlar ishlab chiqarishni qat'iy nazorat qildi.",
                "options": [
                    ("A", "1, 2, 4, 6", True),
                    ("B", "2, 3, 5, 6", False),
                    ("C", "1, 3, 4, 5", False),
                    ("D", "3, 4, 5, 6", False),
                ],
            },
            # 19 (TABLE / ASLAR)
            {
                "body": (
                    "<p>Jadvalda harflar bilan belgilangan o’rinlarga mos keluvchi ma’lumotni toping.</p>"
                    "<table style='width:100%;border-collapse:collapse;margin:12px 0;font-size:13px;'>"
                    "<thead>"
                    "<tr style='background:rgba(100,116,139,0.1);border-bottom:2px solid #cbd5e1;'>"
                    "<th style='padding:8px;border:1px solid #cbd5e1;text-align:center;width:90px;'>Asr</th>"
                    "<th style='padding:8px;border:1px solid #cbd5e1;'>G’arbiy Yevropa voqeasi</th>"
                    "<th style='padding:8px;border:1px solid #cbd5e1;'>Sharq voqeasi</th>"
                    "</tr>"
                    "</thead>"
                    "<tbody>"
                    "<tr><td style='padding:8px;border:1px solid #cbd5e1;text-align:center;font-weight:bold;'>XI asr</td><td style='padding:8px;border:1px solid #cbd5e1;'>Birinchi salib yurishi boshlandi (1096)</td><td style='padding:8px;border:1px solid #cbd5e1;text-align:center;font-weight:bold;color:#2563eb;'>a</td></tr>"
                    "<tr><td style='padding:8px;border:1px solid #cbd5e1;text-align:center;font-weight:bold;'>XIII asr</td><td style='padding:8px;border:1px solid #cbd5e1;text-align:center;font-weight:bold;color:#2563eb;'>b</td><td style='padding:8px;border:1px solid #cbd5e1;'>Marko Polo Xitoyga sayohat qildi</td></tr>"
                    "</tbody>"
                    "</table>"
                    "<div style='font-size:12.5px;color:#475569;margin-top:8px;'>"
                    "<b>Ma’lumotlar:</b> 1) Saljuqiylar Kichik Osiyoni egalladi; 2) To’rtinchi salib yurishi (1204); 3) Rim imperiyasi qulashi (476); 4) Amir Temur tug’ildi (1336)."
                    "</div>"
                ),
                "explanation": "a=1: Saljuqiylar Kichik Osiyoni XI asrda egalladi. b=2: To’rtinchi salib yurishi 1204-yilda (XIII asr) bo’ldi.",
                "options": [
                    ("A", "a-1, b-2", True),
                    ("B", "a-3, b-4", False),
                    ("C", "a-1, b-4", False),
                    ("D", "a-3, b-2", False),
                ],
            },
            # 20 (EYLER-VENN DIAGRAM)
            {
                "body": (
                    "<p>Quyida berilgan ma’lumotlarni tahlil qilib Eyler-Venn diagrammasiga mos keladigan javoblarni aniqlang. <i>(Katolik va Pravoslav cherkovlari)</i></p>"
                    "<div style='display:flex;justify-content:center;margin:16px 0;'>"
                    "<svg width='340' height='180' viewBox='0 0 340 180' style='max-width:100%;'>"
                    "<circle cx='120' cy='90' r='75' fill='rgba(59, 130, 246, 0.15)' stroke='#3b82f6' stroke-width='2'/>"
                    "<circle cx='220' cy='90' r='75' fill='rgba(16, 185, 129, 0.15)' stroke='#10b981' stroke-width='2'/>"
                    "<text x='85' y='75' font-size='16' font-weight='bold' fill='#1e40af' text-anchor='middle'>I</text>"
                    "<text x='85' y='95' font-size='12' fill='#1e3a8a' text-anchor='middle'>Katolik</text>"
                    "<text x='170' y='85' font-size='16' font-weight='bold' fill='#4338ca' text-anchor='middle'>III</text>"
                    "<text x='255' y='75' font-size='16' font-weight='bold' fill='#065f46' text-anchor='middle'>II</text>"
                    "<text x='255' y='95' font-size='12' fill='#064e3b' text-anchor='middle'>Pravoslav</text>"
                    "</svg>"
                    "</div>"
                    "<div style='font-size:12.5px;color:#334155;line-height:1.7;background:rgba(100,116,139,0.05);padding:12px;border-radius:8px;border:1px solid #cbd5e1;'>"
                    "<b>a)</b> Rim papasi boshchiligida;<br/>"
                    "<b>b)</b> Konstantinopol patriarxi boshchiligida;<br/>"
                    "<b>c)</b> Xristian dini asosida;<br/>"
                    "<b>d)</b> Ruhoniylarga uylanish taqiqlangan (selebat);<br/>"
                    "<b>e)</b> Faqat rohiblar oila qurmaydi;<br/>"
                    "<b>f)</b> Lotin tilida ibodat qilinadi."
                    "</div>"
                ),
                "explanation": "I (faqat katolik): Rim papasi, selebat, lotin tili. II (faqat pravoslav): Konstantinopol patriarxi, faqat rohiblar oila qurmaydi. III (umumiy): xristian dini asosida.",
                "options": [
                    ("A", "I-a,d,f; II-b,e; III-c", True),
                    ("B", "I-b,e; II-a,d,f; III-c", False),
                    ("C", "I-a,e; II-b,d; III-c,f", False),
                    ("D", "I-a,f; II-b,e; III-c,d", False),
                ],
            },
            # 21
            {
                "body": (
                    "<p>Quyidagi shaxslar va ularning ishlarini to’g’ri moslashtiring.</p>"
                    "<div style='display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:12px;margin:14px 0;'>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;'>"
                    "<b>1)</b> Muhammad Xorazmiy<br/>"
                    "<b>2)</b> Ibn Sino<br/>"
                    "<b>3)</b> Ibn Battuta"
                    "</div>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;'>"
                    "<b>a)</b> Algebra faniga asos solgan<br/>"
                    "<b>b)</b> Tibbiyot asarlari Yevropada asrlar davomida qo’llanilgan<br/>"
                    "<b>c)</b> Uzoq mamlakatlarga sayohat qilib, xotiralar yozgan"
                    "</div>"
                    "</div>"
                ),
                "explanation": "1-a (Xorazmiy — algebra), 2-b (Ibn Sino — tibbiyot), 3-c (Ibn Battuta — sayohatnoma).",
                "options": [
                    ("A", "1-a; 2-b; 3-c", True),
                    ("B", "1-b; 2-a; 3-c", False),
                    ("C", "1-c; 2-a; 3-b", False),
                    ("D", "1-a; 2-c; 3-b", False),
                ],
            },
            # 22
            {
                "body": "<p>O’rta asr Yevropasining eng mashhur yarmarkasi qaysi graflikda joylashgan edi?</p>",
                "explanation": "O'rta asr Yevropasidagi eng mashhur va yirik xalqaro yarmarka Shampan grafligida o'tkazilgan.",
                "options": [
                    ("A", "Shampan grafligi", True),
                    ("B", "Flandriya grafligi", False),
                    ("C", "Normandiya gersogligi", False),
                    ("D", "Burgundiya gersogligi", False),
                ],
            },
            # 23
            {
                "body": "<p>Birja atamasi qaysi shahardan kelib chiqqan?</p>",
                "explanation": "Birja atamasi Niderlandiya (hozirgi Belgiya)ning Bryugge shahridagi \"van der Burse\" xonadoni nomi bilan bog'liq.",
                "options": [
                    ("A", "Bryugge", True),
                    ("B", "Venetsiya", False),
                    ("C", "Genuya", False),
                    ("D", "London", False),
                ],
            },
            # 24
            {
                "body": (
                    "<p>Quyidagi shaharlardan qaysilari monastir yoki feodal qal’alari atrofida vujudga kelgan?</p>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;margin:12px 0;'>"
                    "1) Strasburg<br/>"
                    "2) Gamburg<br/>"
                    "3) Augsburg<br/>"
                    "4) Venetsiya<br/>"
                    "5) Genuya<br/>"
                    "6) Marsel"
                    "</div>"
                ),
                "explanation": "Strasburg, Gamburg, Augsburg feodal qal'alari (burg) atrofida vujudga kelgan. Venetsiya, Genuya, Marsel dengiz savdosi tufayli rivojlangan.",
                "options": [
                    ("A", "1, 2, 3", True),
                    ("B", "4, 5, 6", False),
                    ("C", "1, 3, 5", False),
                    ("D", "2, 4, 6", False),
                ],
            },
            # 25
            {
                "body": "<p>Bag’dod va Damashqda qurilgan, murakkab o’lchovlar bilan Yer meridianini hisoblagan ilm maskanini aniqlang.</p>",
                "explanation": "Bag’dod va Damashqda rasadxonalar qurilib, ularda Yer meridiani hisoblab chiqilgan.",
                "options": [
                    ("A", "Rasadxonalar", True),
                    ("B", "Madrasalar", False),
                    ("C", "Bayt ul-hikma", False),
                    ("D", "Kutubxonalar", False),
                ],
            },
            # 26
            {
                "body": "<p>Arab yozuvi nechta harfdan iborat?</p>",
                "explanation": "Arab alifbosi 28 ta harfdan iborat.",
                "options": [
                    ("A", "28 ta", True),
                    ("B", "22 ta", False),
                    ("C", "33 ta", False),
                    ("D", "40 ta", False),
                ],
            },
            # 27
            {
                "body": "<p>O’zaro muvofiqlik SAQLANMAGAN javobni toping.</p>",
                "explanation": "Tevton ordeni asosan nemislardan iborat bo’lgan, shuning uchun ”nemis” (Tevton) deb atalgan.",
                "options": [
                    ("A", "Gospitalyerlar — dastlabki diniy-ritsarlik ordeni", False),
                    ("B", "Tampliyerlar — Quddus tepaligi nomi bilan atalgan", False),
                    ("C", "Tevton ordeni — asosan fransuzlardan iborat bo’lgan", True),
                    ("D", "Salohiddin Ayubiy — Misr sultoni", False),
                ],
            },
            # 28
            {
                "body": "<p>Marko Polo necha yil davom etgan sayohat qilgan?</p>",
                "explanation": "Marko Polo jami 25 yil davomida (1271-1295) sayohatda bo'lgan, shundan 17 yilini Xitoyda Xubilay saroyida o'tkazgan.",
                "options": [
                    ("A", "25 yil", True),
                    ("B", "17 yil", False),
                    ("C", "10 yil", False),
                    ("D", "30 yil", False),
                ],
            },
            # 29
            {
                "body": (
                    "<p>Quyida berilgan ma’lumotlarga mos yakuniy xulosalar (to’g’ri/noto’g’ri) keltirilgan javobni aniqlang.</p>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;margin:12px 0;'>"
                    "<b>I.</b> Salib yurishlari G’arbiy Yevropa feodallarining Yaqin Sharqdagi bosqinchilik urushlari edi.<br/>"
                    "<b>II.</b> Lotin imperiyasi mahalliy yunon aholisi tomonidan yaxshi qabul qilingan.<br/>"
                    "<b>III.</b> Vizantiya 1261-yildan keyin ilgarigidek qudratli jahon davlati bo’lib qoldi."
                    "</div>"
                ),
                "explanation": "I to’g’ri. II noto’g’ri — mahalliy yunonlar lotinlarni yoqtirmagan. III noto’g’ri — Vizantiya kichikroq yunon davlatiga aylandi.",
                "options": [
                    ("A", "I-to’g’ri; II-noto’g’ri; III-noto’g’ri", True),
                    ("B", "I-noto’g’ri; II-to’g’ri; III-noto’g’ri", False),
                    ("C", "I-to’g’ri; II-to’g’ri; III-noto’g’ri", False),
                    ("D", "Hammasi to’g’ri", False),
                ],
            },
            # 30
            {
                "body": (
                    "<p>Shaxslar va ularning ishlari to’g’ri moslashtirilgan javobni toping.</p>"
                    "<div style='display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:12px;margin:14px 0;'>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;'>"
                    "<b>1)</b> Urban II<br/>"
                    "<b>2)</b> Innokentiy III<br/>"
                    "<b>3)</b> Grigoriy IX"
                    "</div>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;'>"
                    "<b>a)</b> Birinchi salib yurishiga chaqirgan<br/>"
                    "<b>b)</b> Katolik cherkovi qudrati cho’qqisi davri papasi<br/>"
                    "<b>c)</b> Inkvizitsiya qudrati cho’qqisi davri papasi"
                    "</div>"
                    "</div>"
                ),
                "explanation": "1-a (Urban II — 1095-yil Klermonda chaqirgan), 2-b (Innokentiy III — cherkov qudrati cho'qqisi), 3-c (Grigoriy IX — inkvizitsiya qudrati cho'qqisi).",
                "options": [
                    ("A", "1-a; 2-b; 3-c", True),
                    ("B", "1-b; 2-a; 3-c", False),
                    ("C", "1-c; 2-a; 3-b", False),
                    ("D", "1-a; 2-c; 3-b", False),
                ],
            },
            # 31
            {
                "body": (
                    "<p>Shaharlar va ularning joylashuv asosini to’g’ri moslashtiring.</p>"
                    "<div style='display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:12px;margin:14px 0;'>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;'>"
                    "<b>1)</b> Strasburg<br/>"
                    "<b>2)</b> Bremen<br/>"
                    "<b>3)</b> Venetsiya"
                    "</div>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;'>"
                    "<b>a)</b> Feodal qal’asi atrofida<br/>"
                    "<b>b)</b> Daryo sohilida<br/>"
                    "<b>c)</b> Dengiz savdo yo’lida"
                    "</div>"
                    "</div>"
                ),
                "explanation": "1-a (Strasburg — feodal qal'asi atrofida), 2-b (Bremen — daryo sohilida), 3-c (Venetsiya — dengiz savdo yo'lida).",
                "options": [
                    ("A", "1-a; 2-b; 3-c", True),
                    ("B", "1-b; 2-a; 3-c", False),
                    ("C", "1-c; 2-b; 3-a", False),
                    ("D", "1-a; 2-c; 3-b", False),
                ],
            },
            # 32
            {
                "body": (
                    "<p>Quyidagi olimlardan qaysilari sayohatnoma va geografik asarlar yozgan?</p>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;margin:12px 0;'>"
                    "1) Al-Masudiy<br/>"
                    "2) Ibn Dast<br/>"
                    "3) Ibn Fadlan<br/>"
                    "4) Muhammad Xorazmiy<br/>"
                    "5) Ibn Sino<br/>"
                    "6) Ziryab"
                    "</div>"
                ),
                "explanation": "Al-Masudiy, Ibn Dast va Ibn Fadlan sayohatnoma va geografik asarlar yozgan.",
                "options": [
                    ("A", "1, 2, 3", True),
                    ("B", "4, 5, 6", False),
                    ("C", "1, 3, 5", False),
                    ("D", "2, 4, 6", False),
                ],
            },
            # 33 (BANK)
            {
                "body": (
                    "<div style='border:1px solid #3b82f6;border-radius:10px;padding:12px;background:rgba(59,130,246,0.05);margin-bottom:14px;font-size:13px;line-height:1.7;'>"
                    "<b>33–35-topshiriqlarga mos javoblarni quyidagi banklardan (A–F) tanlang:</b><br/>"
                    "<b>A)</b> Birinchi salib yurishi boshlanishi (1096)<br/>"
                    "<b>B)</b> Salohiddin Ayubiyning Quddusni olishi (1187)<br/>"
                    "<b>C)</b> To’rtinchi salib yurishi, Konstantinopol egallanishi (1204)<br/>"
                    "<b>D)</b> Vizantiyaning tiklanishi (1261)<br/>"
                    "<b>E)</b> So’nggi salib yurishi (1269-1270)<br/>"
                    "<b>F)</b> Innokentiy III papaligining boshlanishi (1198)"
                    "</div>"
                    "<p><b>Berilgan voqealardan qaysi biri eng avval sodir bo’lgan?</b></p>"
                ),
                "explanation": "1096-yil — ro’yxatdagi eng qadimgi sana (Birinchi salib yurishi).",
                "options": [
                    ("A", "Birinchi salib yurishi boshlanishi (1096)", True),
                    ("B", "Salohiddin Ayubiyning Quddusni olishi (1187)", False),
                    ("C", "To’rtinchi salib yurishi, Konstantinopol egallanishi (1204)", False),
                    ("D", "Vizantiyaning tiklanishi (1261)", False),
                    ("E", "So’nggi salib yurishi (1269-1270)", False),
                    ("F", "Innokentiy III papaligining boshlanishi (1198)", False),
                ],
            },
            # 34 (BANK)
            {
                "body": (
                    "<div style='border:1px solid #3b82f6;border-radius:10px;padding:12px;background:rgba(59,130,246,0.05);margin-bottom:14px;font-size:13px;line-height:1.7;'>"
                    "<b>33–35-topshiriqlarga mos javoblarni quyidagi banklardan (A–F) tanlang:</b><br/>"
                    "<b>A)</b> Birinchi salib yurishi boshlanishi (1096)<br/>"
                    "<b>B)</b> Salohiddin Ayubiyning Quddusni olishi (1187)<br/>"
                    "<b>C)</b> To’rtinchi salib yurishi, Konstantinopol egallanishi (1204)<br/>"
                    "<b>D)</b> Vizantiyaning tiklanishi (1261)<br/>"
                    "<b>E)</b> So’nggi salib yurishi (1269-1270)<br/>"
                    "<b>F)</b> Innokentiy III papaligining boshlanishi (1198)"
                    "</div>"
                    "<p><b>To’rtinchi salib yurishini tashkil etishga kirishgan papani aniqlash uchun tegishli voqeani ko’rsating.</b></p>"
                ),
                "explanation": "Innokentiy III 1198-yildan papa bo’lib, 4-salib yurishini tashkil etgan.",
                "options": [
                    ("A", "Birinchi salib yurishi boshlanishi (1096)", False),
                    ("B", "Salohiddin Ayubiyning Quddusni olishi (1187)", False),
                    ("C", "To’rtinchi salib yurishi, Konstantinopol egallanishi (1204)", False),
                    ("D", "Vizantiyaning tiklanishi (1261)", False),
                    ("E", "So’nggi salib yurishi (1269-1270)", False),
                    ("F", "Innokentiy III papaligining boshlanishi (1198)", True),
                ],
            },
            # 35 (BANK)
            {
                "body": (
                    "<div style='border:1px solid #3b82f6;border-radius:10px;padding:12px;background:rgba(59,130,246,0.05);margin-bottom:14px;font-size:13px;line-height:1.7;'>"
                    "<b>33–35-topshiriqlarga mos javoblarni quyidagi banklardan (A–F) tanlang:</b><br/>"
                    "<b>A)</b> Birinchi salib yurishi boshlanishi (1096)<br/>"
                    "<b>B)</b> Salohiddin Ayubiyning Quddusni olishi (1187)<br/>"
                    "<b>C)</b> To’rtinchi salib yurishi, Konstantinopol egallanishi (1204)<br/>"
                    "<b>D)</b> Vizantiyaning tiklanishi (1261)<br/>"
                    "<b>E)</b> So’nggi salib yurishi (1269-1270)<br/>"
                    "<b>F)</b> Innokentiy III papaligining boshlanishi (1198)"
                    "</div>"
                    "<p><b>Berilgan voqealardan qaysi biri eng keyin sodir bo’lgan?</b></p>"
                ),
                "explanation": "1269-1270-yillar — ro’yxatdagi eng so’nggi sana (So'nggi salib yurishi).",
                "options": [
                    ("A", "Birinchi salib yurishi boshlanishi (1096)", False),
                    ("B", "Salohiddin Ayubiyning Quddusni olishi (1187)", False),
                    ("C", "To’rtinchi salib yurishi, Konstantinopol egallanishi (1204)", False),
                    ("D", "Vizantiyaning tiklanishi (1261)", False),
                    ("E", "So’nggi salib yurishi (1269-1270)", True),
                    ("F", "Innokentiy III papaligining boshlanishi (1198)", False),
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
            for opt_label, opt_text, is_corr in item["options"]:
                AnswerOption.objects.create(
                    question=q,
                    text=f"{opt_label}) {opt_text}",
                    is_correct=is_corr,
                )
            questions.append(q)
            self.stdout.write(f"  [{i:02d}] MCQ qo'shildi...")

        # ── 6. III QISM: YOZMA (OCHIQ) SAVOLLAR (36 - 45) ────────────────────
        open_data = [
            # 36
            {
                "title": "Islom madaniyati.",
                "parts": [
                    ("a", "”Bayt ul-hikma” tashkil etilgan xalifani yozing.", "Horun ar-Rashid (Horun ar Rashid / Xorun ar-Rashid)"),
                    ("b", "Algebra faniga asos solgan olimni yozing.", "Muhammad Xorazmiy (Al-Xorazmiy / Xorazmiy)"),
                ],
                "explanation": "a) Horun ar-Rashid; b) Muhammad Xorazmiy.",
            },
            # 37
            {
                "title": "Yevropa shaharlari.",
                "parts": [
                    ("a", "Kasb ustalari uyushmasini yozing.", "Sex (Sexlar)"),
                    ("b", "Shahar kengashi binosini yozing.", "Ratusha"),
                ],
                "explanation": "a) Sex; b) Ratusha.",
            },
            # 38
            {
                "title": "Savdo va bank.",
                "parts": [
                    ("a", "Ilk banklar paydo bo’lgan mamlakatni yozing.", "Italiya (Shimoliy Italiya)"),
                    ("b", "Birja atamasi kelib chiqqan shaharni yozing.", "Bryugge (Bryugge shahri)"),
                ],
                "explanation": "a) Italiya; b) Bryugge.",
            },
            # 39
            {
                "title": "Marko Polo.",
                "parts": [
                    ("a", "U necha yil sayohat qilganini yozing.", "25 yil (25)"),
                    ("b", "U xizmat qilgan mo’g’ul xonini yozing.", "Xubilayxon (Xubilay / Hubilayxon / Hubilay)"),
                ],
                "explanation": "a) 25 yil; b) Xubilayxon.",
            },
            # 40
            {
                "title": "Xristianlik bo’linishi.",
                "parts": [
                    ("a", "G’arbiy cherkovni yozing.", "Katolik cherkovi (Katolitsizm / Katolik)"),
                    ("b", "Sharqiy cherkovni yozing.", "Pravoslav cherkovi (Pravoslaviye / Pravoslav)"),
                ],
                "explanation": "a) Katolik cherkovi; b) Pravoslav cherkovi.",
            },
            # 41
            {
                "title": "Inkvizitsiya.",
                "parts": [
                    ("a", "Inkvizitsiya qudrat cho’qqisiga chiqqan papani yozing.", "Grigoriy IX (Grigoriy 9)"),
                    ("b", "Mahkumlarni gulxanda yondirish atamasini yozing.", "Autodafe (Autodafe marosimi)"),
                ],
                "explanation": "a) Grigoriy IX; b) Autodafe.",
            },
            # 42
            {
                "title": "Birinchi salib yurishi.",
                "parts": [
                    ("a", "Salib yurishiga chaqirgan papani yozing.", "Urban II (Urban 2)"),
                    ("b", "Bu voqea sodir bo’lgan yilni yozing.", "1095-1096-yil (1095 / 1096 / 1095-yil)"),
                ],
                "explanation": "a) Urban II; b) 1095-1096-yil.",
            },
            # 43
            {
                "title": "Diniy-ritsarlik ordenlari.",
                "parts": [
                    ("a", "Dastlabki ordenni yozing.", "Gospitalyerlar (Gospitalyerlar ordeni / Ioanniylar)"),
                    ("b", "Nemislardan iborat bo’lgan ordenni yozing.", "Tevton ordeni (Tevtonlar / Tevton)"),
                ],
                "explanation": "a) Gospitalyerlar (ioanniylar); b) Tevton ordeni.",
            },
            # 44
            {
                "title": "To’rtinchi salib yurishi.",
                "parts": [
                    ("a", "Bu yurish natijasida tuzilgan davlatni yozing.", "Lotin imperiyasi (Lotin davlati)"),
                    ("b", "Bu davlat mavjud bo’lgan yillarni yozing.", "1204-1261-yillar (1204-1261)"),
                ],
                "explanation": "a) Lotin imperiyasi; b) 1204-1261-yillar.",
            },
            # 45
            {
                "title": "Vizantiyaning tiklanishi.",
                "parts": [
                    ("a", "Vizantiyani tiklagan imperatorni yozing.", "Mixail VIII Paleolog (Mixail 8 / Mixail Paleolog)"),
                    ("b", "Bu voqea sodir bo’lgan yilni yozing.", "1261-yil (1261)"),
                ],
                "explanation": "a) Mixail VIII Paleolog; b) 1261-yil.",
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
                f"   • Holati         : Qoralama (is_published=False)\n"
            )
        )
