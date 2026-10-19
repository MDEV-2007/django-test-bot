"""Django management command: Sodiqov Shohjahon ustozning 7-sinf Jahon Tarixi Milliy Sertifikat mock testini yaratish.

Mavzu: 36–40-mavzular: Mo’g’ullar davlati, Oltin O’rda xonligi, Xitoy, Yaponiya, Koreya.
35 ta test topshirig'i (A, B, C, D) va 10 ta yozma (ochiq) savol. Jami: 45 ta topshiriq.
Barcha diagrammalar, jadvallar, Eyler-Venn sxemalari va xronologik mosliklar birga-bir aniqlikda joylangan.

Muallif/O'qituvchi: shohjahon (Sodiqov Shohjahon, @TarixMilliyCertificate)
Nashr holati: is_published=False (qoralama).

Foydalanish:
    python manage.py seed_tarix_shohjahon_7sinf_36_40
    python manage.py seed_tarix_shohjahon_7sinf_36_40 --force
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from django.contrib.auth.models import User

from accounts.models import Profile, ensure_profile_for_user
from tests_app.models import Subject, TestSet, Question, AnswerOption, SubQuestion


MOCK_TITLE = "7-sinf Jahon Tarixi — Milliy Sertifikat (36–40-mavzular) | Shohjahon"
MOCK_DESC = (
    "36–40-mavzular: Mo’g’ullar davlati, Oltin O’rda xonligi, Xitoy, Yaponiya, Koreya. "
    "35 ta test topshirig'i (A, B, C, D) va 10 ta yozma (ochiq) savol. Jami: 45 ta topshiriq. "
    "Muallif: Sodiqov Shohjahon (@TarixMilliyCertificate)."
)


class Command(BaseCommand):
    help = "Sodiqov Shohjahon ustoz nomidan 7-sinf Jahon Tarixi (36-40-mavzular) 45 talik Milliy Sertifikat testini yuklaydi."

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
                        f"Qayta yuklash uchun: python manage.py seed_tarix_shohjahon_7sinf_36_40 --force"
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
                "explanation": "Xubilayxon Xitoyda Yuan sulolasiga asos solgan, Yaponiyada syogunlikka Minamoto asos solgan.",
                "options": [
                    ("A", "Temuchin — 1206-yilda ulug’ xon deb e’lon qilingan", False),
                    ("B", "Botuxon — Oltin O’rdaga asos solgan", False),
                    ("C", "Xubilayxon — Yaponiyada syogunlikka asos solgan", True),
                    ("D", "O’zbekxon — islomni davlat dini deb e’lon qilgan", False),
                ],
            },
            # 2
            {
                "body": (
                    "<p>Quyidagi hukmdorlar va ular bilan bog’liq ma’lumotlar mos ravishda berilgan javobni aniqlang.</p>"
                    "<div style='display:grid;grid-template-columns:repeat(auto-fit, minmax(240px, 1fr));gap:12px;margin:14px 0;'>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;'>"
                    "<b>1)</b> Botuxon<br/>"
                    "<b>2)</b> O’zbekxon<br/>"
                    "<b>3)</b> Chju Yuan-Chjan<br/>"
                    "<b>4)</b> Van Gon"
                    "</div>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;'>"
                    "<b>a)</b> 1314-yilda islomni davlat dini deb e’lon qilgan<br/>"
                    "<b>b)</b> Oltin O’rdaga asos solgan<br/>"
                    "<b>c)</b> Min imperiyasiga asos solgan<br/>"
                    "<b>d)</b> Koryo sulolasiga asos solgan"
                    "</div>"
                    "</div>"
                ),
                "explanation": "1-b (Botuxon — Oltin O'rda), 2-a (O'zbekxon — islom), 3-c (Chju Yuan-Chjan — Min imperiyasi), 4-d (Van Gon — Koryo).",
                "options": [
                    ("A", "1-b; 2-a; 3-c; 4-d", True),
                    ("B", "1-a; 2-b; 3-d; 4-c", False),
                    ("C", "1-b; 2-c; 3-a; 4-d", False),
                    ("D", "1-c; 2-a; 3-b; 4-d", False),
                ],
            },
            # 3
            {
                "body": "<p>Chingizxon davlatining poytaxtini aniqlang.</p>",
                "explanation": "Chingizxon davlati poytaxti Qoraqurum shahri bo'lgan.",
                "options": [
                    ("A", "Qoraqurum", True),
                    ("B", "Saroy Botu", False),
                    ("C", "Pekin", False),
                    ("D", "Kioto", False),
                ],
            },
            # 4
            {
                "body": (
                    "<p>Quyidagi voqealar to’g’ri xronologik ketma-ketlikda ko’rsatilgan javobni toping.</p>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;margin:12px 0;'>"
                    "1) Onon daryosi qurultoyi (1206)<br/>"
                    "2) Xorazmshohlar davlatiga bosqin (1219-1221)<br/>"
                    "3) Rus yerlarining istilosi (1237-1240)<br/>"
                    "4) Xitoy to’liq bo’ysundirildi (1279)<br/>"
                    "5) Min imperiyasi tashkil topdi (1368)<br/>"
                    "6) Amir Temur-To’xtamish jangi (1395)"
                    "</div>"
                ),
                "explanation": "1206 -> 1219-1221 -> 1237-1240 -> 1279 -> 1368 -> 1395.",
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
                    "<p>Quyida berilgan atamalar va ularning izohi to’g’ri moslashtirilgan javobni toping.</p>"
                    "<div style='display:grid;grid-template-columns:repeat(auto-fit, minmax(240px, 1fr));gap:12px;margin:14px 0;'>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;'>"
                    "<b>I.</b> Ulus<br/>"
                    "<b>II.</b> Suyurg’ol<br/>"
                    "<b>III.</b> Bosqoq<br/>"
                    "<b>IV.</b> Shomonlik"
                    "</div>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;'>"
                    "<b>a)</b> Chingizxon farzandlariga bo’lib berilgan hudud<br/>"
                    "<b>b)</b> Xizmat evaziga berilgan meros yer-mulk<br/>"
                    "<b>c)</b> Soliq yig’ilishini nazorat qiluvchi noib<br/>"
                    "<b>d)</b> Ruhlarga ishonishga asoslangan e’tiqod"
                    "</div>"
                    "</div>"
                ),
                "explanation": "Ulus — hudud; Suyurg’ol — yer-mulk; Bosqoq — soliq noibi; Shomonlik — diniy e’tiqod.",
                "options": [
                    ("A", "I-a, II-b, III-c, IV-d", True),
                    ("B", "I-b, II-a, III-c, IV-d", False),
                    ("C", "I-a, II-c, III-b, IV-d", False),
                    ("D", "I-a, II-b, III-d, IV-c", False),
                ],
            },
            # 6
            {
                "body": (
                    "<p>Quyida berilgan Yaponiya-Koreya atamalari va ularning izohi to’g’ri moslashtirilgan javobni toping.</p>"
                    "<div style='display:grid;grid-template-columns:repeat(auto-fit, minmax(240px, 1fr));gap:12px;margin:14px 0;'>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;'>"
                    "<b>I.</b> Syogun<br/>"
                    "<b>II.</b> Samuray<br/>"
                    "<b>III.</b> Xanke<br/>"
                    "<b>IV.</b> Mikado"
                    "</div>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;'>"
                    "<b>a)</b> Yaponiyada real hokimiyatga ega harbiy qo’mondon<br/>"
                    "<b>b)</b> Yaponiya harbiy jangchisi<br/>"
                    "<b>c)</b> Yaponiya yirik yer egalari toifasi<br/>"
                    "<b>d)</b> Yaponiya imperatorining unvoni"
                    "</div>"
                    "</div>"
                ),
                "explanation": "Syogun — harbiy qo’mondon; Samuray — jangchi; Xanke — yer egalari; Mikado — imperator.",
                "options": [
                    ("A", "I-a, II-b, III-c, IV-d", True),
                    ("B", "I-b, II-a, III-c, IV-d", False),
                    ("C", "I-a, II-c, III-b, IV-d", False),
                    ("D", "I-a, II-b, III-d, IV-c", False),
                ],
            },
            # 7
            {
                "body": "<p>Tarixiy shaxsni aniqlang. Mo’g’ul qabilalarini birlashtirgan, 1206-yilda Onon daryosi bo’yidagi qurultoyda ulug’ xon deb e’lon qilingan.</p>",
                "explanation": "1206-yilda Temuchin Onon daryosi bo'yidagi qurultoyda Chingizxon nomi bilan ulug' xon deb e'lon qilingan.",
                "options": [
                    ("A", "Temuchin (Chingizxon)", True),
                    ("B", "Botuxon", False),
                    ("C", "O’qtoy", False),
                    ("D", "Jo’jixon", False),
                ],
            },
            # 8
            {
                "body": "<p>Tarixiy shaxsni aniqlang. Jo’jixonning o’g’li. 1236-1255-yillarda Oltin O’rdaga asos solgan, 1237-1240-yillarda Rus yerlarini istilo qilgan.</p>",
                "explanation": "Botuxon Jo'jixonning o'g'li bo'lib, Oltin O'rdaga asos solgan va Rus yerlarini istilo qilgan.",
                "options": [
                    ("A", "Botuxon", True),
                    ("B", "O’zbekxon", False),
                    ("C", "To’xtamishxon", False),
                    ("D", "Berkaxon", False),
                ],
            },
            # 9
            {
                "body": "<p>Tarixiy hodisani aniqlang. 1314-yilda Oltin O’rdada davlat dini deb e’lon qilingan din.</p>",
                "explanation": "1314-yilda O'zbekxon Oltin O'rdada islom dinini davlat dini deb e'lon qilgan.",
                "options": [
                    ("A", "Islom", True),
                    ("B", "Xristianlik", False),
                    ("C", "Buddizm", False),
                    ("D", "Shomonlik", False),
                ],
            },
            # 10
            {
                "body": "<p>Tarixiy shaxsni aniqlang. Musulmon dengiz sayyohi. 1405-1433-yillarda Hindiston, Sharqiy Afrika va Makkagacha yetti marta ekspeditsiya uyushtirgan.</p>",
                "explanation": "Chjan Xe Min imperiyasi davrida 1405-1433-yillarda ulkan dengiz ekspeditsiyalariga qo'mondonlik qilgan.",
                "options": [
                    ("A", "Chjan Xe", True),
                    ("B", "Marko Polo", False),
                    ("C", "Xubilayxon", False),
                    ("D", "Chju Yuan-Chjan", False),
                ],
            },
            # 11
            {
                "body": (
                    "<p>Quyidagi xonlardan qaysilari Oltin O’rdaga tegishli?</p>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;margin:12px 0;'>"
                    "1) Botuxon<br/>"
                    "2) O’zbekxon<br/>"
                    "3) Jonibek<br/>"
                    "4) Xubilayxon<br/>"
                    "5) To’g’rulbek<br/>"
                    "6) Alp Arslon"
                    "</div>"
                ),
                "explanation": "Xubilayxon Yuan sulolasi (Xitoy), To’g’rulbek va Alp Arslon Saljuqiylar sultonlari. 1, 2, 3 esa Oltin O'rda xonlari.",
                "options": [
                    ("A", "1, 2, 3", True),
                    ("B", "4, 5, 6", False),
                    ("C", "1, 3, 5", False),
                    ("D", "2, 4, 6", False),
                ],
            },
            # 12
            {
                "body": "<p>1368-yilda Xitoyda tashkil topgan yangi sulolani aniqlang.</p>",
                "explanation": "1368-yilda Chju Yuan-Chjan boshchiligida Min imperiyasi qaror topgan.",
                "options": [
                    ("A", "Min imperiyasi", True),
                    ("B", "Yuan sulolasi", False),
                    ("C", "Sun sulolasi", False),
                    ("D", "Tan sulolasi", False),
                ],
            },
            # 13
            {
                "body": "<p>XIII-XIV asrlar Osiyo uchun xos bo’lgan holatni aniqlang.</p>",
                "explanation": "XIII-XIV asrlarda mo'g'ul istilolari oqibatida butun Osiyo va Sharqiy Yevropani qamrab olgan ulkan imperiya vujudga keldi.",
                "options": [
                    ("A", "Mo’g’ullar istilosi natijasida ulkan imperiya tashkil topdi", True),
                    ("B", "Osiyo yagona markazlashgan davlat edi", False),
                    ("C", "Mo’g’ullar hech qanday ta’sir ko’rsatmadi", False),
                    ("D", "Yozuv umuman mavjud emas edi", False),
                ],
            },
            # 14
            {
                "body": (
                    "<p>Quyidagi qirolliklardan qaysilari qadimgi Koreyaning uch qirolligiga tegishli?</p>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;margin:12px 0;'>"
                    "1) Pekche<br/>"
                    "2) Silla<br/>"
                    "3) Koguryo<br/>"
                    "4) Yamato<br/>"
                    "5) Yuan<br/>"
                    "6) Min"
                    "</div>"
                ),
                "explanation": "Yamato Yaponiyaga, Yuan va Min Xitoyga tegishli. Pekche, Silla va Koguryo Koreyaning uch qirolligidir.",
                "options": [
                    ("A", "1, 2, 3", True),
                    ("B", "4, 5, 6", False),
                    ("C", "1, 3, 5", False),
                    ("D", "2, 4, 6", False),
                ],
            },
            # 15
            {
                "body": "<p>Koreyada ”Koreya” nomini bergan sulolani aniqlang.</p>",
                "explanation": "Van Gon asos solgan Koryo sulolasi (918-1392) mamlakatga bugungi 'Koreya' nomini bergan.",
                "options": [
                    ("A", "Koryo sulolasi", True),
                    ("B", "Choson sulolasi", False),
                    ("C", "Silla sulolasi", False),
                    ("D", "Pekche sulolasi", False),
                ],
            },
            # 16
            {
                "body": (
                    "<p>Quyidagi voqealar to’g’ri xronologik ketma-ketlikda ko’rsatilgan javobni toping.</p>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;margin:12px 0;'>"
                    "1) Chingizxon Shimoliy Xitoyga yurish boshladi (1211)<br/>"
                    "2) Xorazmshohlar davlatiga bosqin (1219)<br/>"
                    "3) Kalka daryosi jangi (1223)<br/>"
                    "4) Chingizxon davlatni to’rt ulusga bo’ldi (1224)<br/>"
                    "5) Botuxon Oltin O’rdaga asos soldi (1236)<br/>"
                    "6) Xitoy to’liq bo’ysundirildi (1279)"
                    "</div>"
                ),
                "explanation": "1211 -> 1219 -> 1223 -> 1224 -> 1236 -> 1279.",
                "options": [
                    ("A", "1, 2, 3, 4, 5, 6", True),
                    ("B", "2, 1, 3, 4, 5, 6", False),
                    ("C", "1, 3, 2, 4, 5, 6", False),
                    ("D", "1, 2, 4, 3, 5, 6", False),
                ],
            },
            # 17 (DIAGRAMMA)
            {
                "body": (
                    "<p>Sxematik diagrammada mo’g’ullar tarixining uch muhim voqeasi ko’rsatilgan.</p>"
                    "<p><b>1–3 raqamlaridan qaysi biri Min imperiyasining tashkil topishiga to’g’ri keladi?</b></p>"
                    "<div style='max-width:320px;margin:16px auto;display:flex;flex-direction:column;gap:10px;'>"
                    "<div style='border:2px solid #3b82f6;background:rgba(59,130,246,0.06);border-radius:8px;padding:12px;text-align:center;font-weight:bold;font-size:15px;color:#1e3a8a;'>1 — 1206-yil</div>"
                    "<div style='text-align:center;color:#94a3b8;font-size:18px;margin:-6px 0;'>↓</div>"
                    "<div style='border:2px solid #3b82f6;background:rgba(59,130,246,0.06);border-radius:8px;padding:12px;text-align:center;font-weight:bold;font-size:15px;color:#1e3a8a;'>2 — 1236-yil</div>"
                    "<div style='text-align:center;color:#94a3b8;font-size:18px;margin:-6px 0;'>↓</div>"
                    "<div style='border:2px solid #3b82f6;background:rgba(59,130,246,0.06);border-radius:8px;padding:12px;text-align:center;font-weight:bold;font-size:15px;color:#1e3a8a;'>3 — 1368-yil</div>"
                    "</div>"
                ),
                "explanation": "Min imperiyasi 1368-yilda (3-band) Chju Yuan-Chjan tomonidan tashkil etilgan.",
                "options": [
                    ("A", "3", True),
                    ("B", "1", False),
                    ("C", "2", False),
                    ("D", "Hech biri", False),
                ],
            },
            # 18 (JADVAL)
            {
                "body": (
                    "<p>Tarixiy voqea va uning natijasi o’zaro to’g’ri mos berilgan qatorlarni aniqlang.</p>"
                    "<div style='overflow-x:auto;margin:14px 0;'>"
                    "<table style='width:100%;border-collapse:collapse;font-size:13px;text-align:left;'>"
                    "<thead>"
                    "<tr style='background:rgba(100,116,139,0.1);border-bottom:2px solid #cbd5e1;'>"
                    "<th style='padding:8px;border:1px solid #cbd5e1;width:40px;text-align:center;'>№</th>"
                    "<th style='padding:8px;border:1px solid #cbd5e1;width:44%;'>Voqea</th>"
                    "<th style='padding:8px;border:1px solid #cbd5e1;'>Natija</th>"
                    "</tr>"
                    "</thead>"
                    "<tbody>"
                    "<tr><td style='padding:8px;border:1px solid #cbd5e1;text-align:center;font-weight:bold;'>1</td><td style='padding:8px;border:1px solid #cbd5e1;'>Onon daryosi qurultoyi (1206)</td><td style='padding:8px;border:1px solid #cbd5e1;'>Mo’g’ul davlati tashkil topdi</td></tr>"
                    "<tr><td style='padding:8px;border:1px solid #cbd5e1;text-align:center;font-weight:bold;'>2</td><td style='padding:8px;border:1px solid #cbd5e1;'>O’zbekxonning islomni qabul qilishi (1314)</td><td style='padding:8px;border:1px solid #cbd5e1;'>Oltin O’rda qudrati mustahkamlandi</td></tr>"
                    "<tr><td style='padding:8px;border:1px solid #cbd5e1;text-align:center;font-weight:bold;'>3</td><td style='padding:8px;border:1px solid #cbd5e1;'>Amir Temur-To’xtamish janglari</td><td style='padding:8px;border:1px solid #cbd5e1;'>Oltin O’rda uzil-kesil zaiflashtirildi</td></tr>"
                    "<tr><td style='padding:8px;border:1px solid #cbd5e1;text-align:center;font-weight:bold;'>4</td><td style='padding:8px;border:1px solid #cbd5e1;'>Chju Yuan-Chjan qo’zg’oloni</td><td style='padding:8px;border:1px solid #cbd5e1;'>Mo’g’ullar Xitoyda hokimiyatni saqlab qoldi</td></tr>"
                    "<tr><td style='padding:8px;border:1px solid #cbd5e1;text-align:center;font-weight:bold;'>5</td><td style='padding:8px;border:1px solid #cbd5e1;'>Chjan Xe ekspeditsiyalari</td><td style='padding:8px;border:1px solid #cbd5e1;'>Xitoyning tashqi savdosi kengaydi</td></tr>"
                    "<tr><td style='padding:8px;border:1px solid #cbd5e1;text-align:center;font-weight:bold;'>6</td><td style='padding:8px;border:1px solid #cbd5e1;'>Minamoto g’alabalari</td><td style='padding:8px;border:1px solid #cbd5e1;'>Yaponiyada qo’sh hokimiyatchilik paydo bo’ldi</td></tr>"
                    "</tbody>"
                    "</table>"
                    "</div>"
                ),
                "explanation": "4 xato: aksincha, qo’zg’olon natijasida mo’g’ullar Xitoydan haydab chiqarilgan.",
                "options": [
                    ("A", "1, 2, 3, 5, 6", True),
                    ("B", "2, 4, 5, 6", False),
                    ("C", "1, 3, 4, 6", False),
                    ("D", "3, 4, 5, 6", False),
                ],
            },
            # 19 (JADVAL MOSLASH)
            {
                "body": (
                    "<p>Jadvalda harflar bilan belgilangan o’rinlarga mos keluvchi ma’lumotni toping.</p>"
                    "<div style='overflow-x:auto;margin:14px 0;'>"
                    "<table style='width:100%;border-collapse:collapse;font-size:13px;text-align:left;'>"
                    "<thead>"
                    "<tr style='background:rgba(100,116,139,0.1);border-bottom:2px solid #cbd5e1;'>"
                    "<th style='padding:8px;border:1px solid #cbd5e1;width:25%;'>Asr</th>"
                    "<th style='padding:8px;border:1px solid #cbd5e1;width:40%;'>Oltin O’rda voqeasi</th>"
                    "<th style='padding:8px;border:1px solid #cbd5e1;'>Yaqin Sharq voqeasi</th>"
                    "</tr>"
                    "</thead>"
                    "<tbody>"
                    "<tr><td style='padding:8px;border:1px solid #cbd5e1;font-weight:bold;'>XIV asr</td><td style='padding:8px;border:1px solid #cbd5e1;'>O’zbekxon islomni qabul qildi (1314)</td><td style='padding:8px;border:1px solid #cbd5e1;background:rgba(59,130,246,0.08);text-align:center;font-weight:bold;color:#1d4ed8;'>a</td></tr>"
                    "<tr><td style='padding:8px;border:1px solid #cbd5e1;font-weight:bold;'>XV asr</td><td style='padding:8px;border:1px solid #cbd5e1;background:rgba(59,130,246,0.08);text-align:center;font-weight:bold;color:#1d4ed8;'>b</td><td style='padding:8px;border:1px solid #cbd5e1;'>Konstantinopol qulashi (1453)</td></tr>"
                    "</tbody>"
                    "</table>"
                    "</div>"
                    "<div style='font-size:12.5px;color:#334155;background:rgba(100,116,139,0.05);padding:10px;border-radius:6px;border:1px solid #cbd5e1;margin-top:8px;'>"
                    "<b>Ma’lumotlar:</b> 1) Anqara jangi (1402); 2) Amir Temur To’xtamishni mag’lub etdi (1395); 3) Rim imperiyasi qulashi (476); 4) Amir Temur tug’ildi (1336)."
                    "</div>"
                ),
                "explanation": "a=1: Anqara jangi 1402-yilda (XIV asr oxiri/XV asr) bo’ldi. b=2: Amir Temur 1395-yilda (XV asr yaqinida) To’xtamishni mag’lub etdi.",
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
                    "<p>Quyida berilgan ma’lumotlarni tahlil qilib <b>Eyler-Venn diagrammasiga</b> mos keladigan javoblarni aniqlang. <i>(Yuan sulolasi va Min imperiyasi)</i></p>"
                    "<div style='display:flex;justify-content:center;margin:16px 0;'>"
                    "<svg width='340' height='180' viewBox='0 0 340 180' style='max-width:100%;'>"
                    "<circle cx='120' cy='90' r='75' fill='rgba(59, 130, 246, 0.15)' stroke='#3b82f6' stroke-width='2'/>"
                    "<circle cx='220' cy='90' r='75' fill='rgba(16, 185, 129, 0.15)' stroke='#10b981' stroke-width='2'/>"
                    "<text x='85' y='75' font-size='16' font-weight='bold' fill='#1e40af' text-anchor='middle'>I</text>"
                    "<text x='85' y='95' font-size='12' fill='#1e3a8a' text-anchor='middle'>Yuan sulolasi</text>"
                    "<text x='170' y='85' font-size='16' font-weight='bold' fill='#4338ca' text-anchor='middle'>III</text>"
                    "<text x='255' y='75' font-size='16' font-weight='bold' fill='#065f46' text-anchor='middle'>II</text>"
                    "<text x='255' y='95' font-size='12' fill='#064e3b' text-anchor='middle'>Min imperiyasi</text>"
                    "</svg>"
                    "</div>"
                    "<div style='font-size:12.5px;color:#334155;line-height:1.7;background:rgba(100,116,139,0.05);padding:12px;border-radius:8px;border:1px solid #cbd5e1;'>"
                    "<b>a)</b> Mo’g’ullar tomonidan boshqarilgan;<br/>"
                    "<b>b)</b> Xitoyliklar tomonidan tashkil etilgan;<br/>"
                    "<b>c)</b> Xitoyni boshqargan;<br/>"
                    "<b>d)</b> Marko Polo bilan bog’liq;<br/>"
                    "<b>e)</b> Chju Yuan-Chjan bilan bog’liq;<br/>"
                    "<b>f)</b> Chjan Xe ekspeditsiyalari shu davrda bo’lgan."
                    "</div>"
                ),
                "explanation": "I (faqat Yuan): mo’g’ullar, Marko Polo. II (faqat Min): xitoyliklar, Chju Yuan-Chjan, Chjan Xe. III (umumiy): Xitoyni boshqargan.",
                "options": [
                    ("A", "I-a,d; II-b,e,f; III-c", True),
                    ("B", "I-b,e; II-a,d,f; III-c", False),
                    ("C", "I-a,d; II-b,f; III-c,e", False),
                    ("D", "I-a,e; II-b,d; III-c,f", False),
                ],
            },
            # 21
            {
                "body": (
                    "<p>Quyidagi shaxslar va ularning ishlari to’g’ri moslashtirilgan javobni toping.</p>"
                    "<div style='display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:12px;margin:14px 0;'>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;'>"
                    "<b>1)</b> Xubilayxon<br/>"
                    "<b>2)</b> Chju Yuan-Chjan<br/>"
                    "<b>3)</b> Chjan Xe"
                    "</div>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;'>"
                    "<b>a)</b> Yuan sulolasiga asos solgan<br/>"
                    "<b>b)</b> Min imperiyasiga asos solgan<br/>"
                    "<b>c)</b> Dengiz ekspeditsiyalarini boshqargan"
                    "</div>"
                    "</div>"
                ),
                "explanation": "1-a (Xubilayxon — Yuan), 2-b (Chju Yuan-Chjan — Min), 3-c (Chjan Xe — dengiz ekspeditsiyalari).",
                "options": [
                    ("A", "1-a; 2-b; 3-c", True),
                    ("B", "1-b; 2-a; 3-c", False),
                    ("C", "1-c; 2-a; 3-b", False),
                    ("D", "1-a; 2-c; 3-b", False),
                ],
            },
            # 22
            {
                "body": "<p>Chjan Xe qaysi shahar/joyni ziyorat qilgan musulmon bo’lgan?</p>",
                "explanation": "Chjan Xe musulmon bo'lib, o'z ekspeditsiyalaridan birida Makkai Mukarramani ziyorat qilgan.",
                "options": [
                    ("A", "Makka", True),
                    ("B", "Madina", False),
                    ("C", "Quddus", False),
                    ("D", "Qohira", False),
                ],
            },
            # 23
            {
                "body": "<p>Xitoy imperatorlari 1415-1420-yillarda elchilar yuborgan Movarounnahr shahrini aniqlang.</p>",
                "explanation": "Min sulolasi imperatorlari 1415-1420-yillarda Samarqandga Mirzo Ulug'bek saroyiga elchilar yuborgan.",
                "options": [
                    ("A", "Samarqand (Ulug’bek saroyiga)", True),
                    ("B", "Buxoro", False),
                    ("C", "Toshkent", False),
                    ("D", "Xiva", False),
                ],
            },
            # 24
            {
                "body": (
                    "<p>Quyidagi xonliklardan qaysilari Oltin O’rda parchalanishidan vujudga kelgan?</p>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;margin:12px 0;'>"
                    "1) Qrim xonligi<br/>"
                    "2) Qozon xonligi<br/>"
                    "3) Sibir xonligi<br/>"
                    "4) Xorazm xonligi<br/>"
                    "5) Buxoro xonligi<br/>"
                    "6) Qo’qon xonligi"
                    "</div>"
                ),
                "explanation": "Xorazm, Buxoro va Qo’qon xonliklari O’rta Osiyoda, Oltin O’rdaga aloqasi yo’q. Qrim, Qozon, Sibir xonliklari Oltin O'rda parchalanishidan vujudga kelgan.",
                "options": [
                    ("A", "1, 2, 3", True),
                    ("B", "4, 5, 6", False),
                    ("C", "1, 3, 5", False),
                    ("D", "2, 4, 6", False),
                ],
            },
            # 25
            {
                "body": "<p>Yaponiyada Minamoto o’zining qal’a-saroyidan turib mamlakatni boshqargan shaharni aniqlang.</p>",
                "explanation": "Minamoto Kamakura shahrida o'z harbiy qarorgohini qurib, Kamakura syogunligiga asos solgan.",
                "options": [
                    ("A", "Kamakura", True),
                    ("B", "Kioto", False),
                    ("C", "Osaka", False),
                    ("D", "Nagasaki", False),
                ],
            },
            # 26
            {
                "body": "<p>Koreyaning afsonaviy asoschisi Tangun asos solgan qadimgi qirollikni aniqlang.</p>",
                "explanation": "Qadimgi koreys afsonasiga ko'ra, mil. avv. 2333-yilda Tangun Choson (Qadimgi Choson) davlatiga asos solgan.",
                "options": [
                    ("A", "Choson", True),
                    ("B", "Koryo", False),
                    ("C", "Silla", False),
                    ("D", "Koguryo", False),
                ],
            },
            # 27
            {
                "body": "<p>O’zaro muvofiqlik <b>SAQLANMAGAN</b> javobni toping.</p>",
                "explanation": "Xubilayxon Xitoyda Yuan sulolasiga asos solgan, Koryo sulolasiga esa Van Gon asos solgan.",
                "options": [
                    ("A", "Botuxon — Oltin O’rdaga asos solgan", False),
                    ("B", "O’zbekxon — islomni davlat dini qilgan", False),
                    ("C", "Xubilayxon — Koryo sulolasiga asos solgan", True),
                    ("D", "Chju Yuan-Chjan — Min imperiyasiga asos solgan", False),
                ],
            },
            # 28
            {
                "body": "<p>1483-yilda yapon savdogarlari chet mamlakatlarga necha dona qilich olib ketishgan?</p>",
                "explanation": "1483-yilda yapon savdogarlari Xitoy va boshqa mamlakatlarga 67 ming dona sifatli yapon qilichlarini olib borgan.",
                "options": [
                    ("A", "67 ming dona", True),
                    ("B", "10 ming dona", False),
                    ("C", "100 ming dona", False),
                    ("D", "5 ming dona", False),
                ],
            },
            # 29
            {
                "body": (
                    "<p>Quyida berilgan ma’lumotlarga mos yakuniy xulosalar (to’g’ri/noto’g’ri) keltirilgan javobni aniqlang.</p>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;margin:12px 0;'>"
                    "I. Chingizxon barcha diniy e’tiqodlarga birday munosabatda bo’lishni vasiyat qilgan.<br/>"
                    "II. Oltin O’rdada Rus knyazlari mustaqil ravishda, hech qanday yorliqsiz hukmronlik qilishgan.<br/>"
                    "III. Yaponiyada real hokimiyat imperator qo’lida bo’lgan."
                    "</div>"
                ),
                "explanation": "I to’g’ri. II noto’g’ri — barcha knyazlar Oltin O’rdadan boshqaruv yorlig’i olgan. III noto’g’ri — real hokimiyat syogun qo’lida bo’lgan.",
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
                    "<b>1)</b> O’zbekxon<br/>"
                    "<b>2)</b> Jonibek<br/>"
                    "<b>3)</b> To’xtamishxon"
                    "</div>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;'>"
                    "<b>a)</b> Islomni davlat dini qilgan<br/>"
                    "<b>b)</b> O’zbekxon ishini davom ettirgan<br/>"
                    "<b>c)</b> Oltin O’rdani vaqtincha birlashtirgan"
                    "</div>"
                    "</div>"
                ),
                "explanation": "1-a (O'zbekxon — islom), 2-b (Jonibek — davom ettirgan), 3-c (To'xtamishxon — birlashtirgan).",
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
                    "<p>Davlatlar va poytaxtlarini to’g’ri moslashtiring.</p>"
                    "<div style='display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:12px;margin:14px 0;'>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;'>"
                    "<b>1)</b> Mo’g’ullar davlati<br/>"
                    "<b>2)</b> Oltin O’rda (dastlabki)<br/>"
                    "<b>3)</b> Koryo"
                    "</div>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;'>"
                    "<b>a)</b> Qoraqurum<br/>"
                    "<b>b)</b> Saroy Botu<br/>"
                    "<b>c)</b> Sonak (Keson)"
                    "</div>"
                    "</div>"
                ),
                "explanation": "Mo'g'ullar davlati — Qoraqurum, Oltin O'rda — Saroy Botu, Koryo — Sonak (Keson).",
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
                    "<p>Quyidagi hunarmandchilik mahsulotlaridan qaysilari Xitoy uchun an’anaviy bo’lgan?</p>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;margin:12px 0;'>"
                    "1) Kulolchilik<br/>"
                    "2) Chinni buyumlar<br/>"
                    "3) Shoyi gazlama<br/>"
                    "4) Qilichlar (Yaponiya)<br/>"
                    "5) Chinampa (Amerika)<br/>"
                    "6) Papirus (Misr)"
                    "</div>"
                ),
                "explanation": "Qilichlar — Yaponiya, chinampa — Amerika, papirus — Misr. 1, 2, 3 Xitoyga xos.",
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
                    "<b>A)</b> Onon daryosi qurultoyi (1206)<br/>"
                    "<b>B)</b> Botuxonning Oltin O’rdaga asos solishi (1236)<br/>"
                    "<b>C)</b> O’zbekxonning islomni qabul qilishi (1314)<br/>"
                    "<b>D)</b> Min imperiyasining tashkil topishi (1368)<br/>"
                    "<b>E)</b> Amir Temur-To’xtamish, Terek jangi (1395)<br/>"
                    "<b>F)</b> Chjan Xe ekspeditsiyalarining boshlanishi (1405)"
                    "</div>"
                    "<p><b>Berilgan voqealardan qaysi biri eng avval sodir bo’lgan?</b></p>"
                ),
                "explanation": "1206-yil — ro’yxatdagi eng qadimgi sana (Onon daryosi qurultoyi).",
                "options": [
                    ("A", "A", True),
                    ("B", "B", False),
                    ("C", "C", False),
                    ("D", "D", False),
                    ("E", "E", False),
                    ("F", "F", False),
                ],
            },
            # 34 (BANK)
            {
                "body": (
                    "<div style='border:1px solid #3b82f6;border-radius:10px;padding:12px;background:rgba(59,130,246,0.05);margin-bottom:14px;font-size:13px;line-height:1.7;'>"
                    "<b>33–35-topshiriqlarga mos javoblarni quyidagi banklardan (A–F) tanlang:</b><br/>"
                    "<b>A)</b> Onon daryosi qurultoyi (1206)<br/>"
                    "<b>B)</b> Botuxonning Oltin O’rdaga asos solishi (1236)<br/>"
                    "<b>C)</b> O’zbekxonning islomni qabul qilishi (1314)<br/>"
                    "<b>D)</b> Min imperiyasining tashkil topishi (1368)<br/>"
                    "<b>E)</b> Amir Temur-To’xtamish, Terek jangi (1395)<br/>"
                    "<b>F)</b> Chjan Xe ekspeditsiyalarining boshlanishi (1405)"
                    "</div>"
                    "<p><b>Oltin O’rdaning uzil-kesil zaiflashishiga sabab bo’lgan voqeani aniqlang.</b></p>"
                ),
                "explanation": "1395-yildagi Terek jangida Amir Temur To’xtamishni mag’lub etib, Oltin O’rdani zaiflashtirgan.",
                "options": [
                    ("A", "A", False),
                    ("B", "B", False),
                    ("C", "C", False),
                    ("D", "D", False),
                    ("E", "E", True),
                    ("F", "F", False),
                ],
            },
            # 35 (BANK)
            {
                "body": (
                    "<div style='border:1px solid #3b82f6;border-radius:10px;padding:12px;background:rgba(59,130,246,0.05);margin-bottom:14px;font-size:13px;line-height:1.7;'>"
                    "<b>33–35-topshiriqlarga mos javoblarni quyidagi banklardan (A–F) tanlang:</b><br/>"
                    "<b>A)</b> Onon daryosi qurultoyi (1206)<br/>"
                    "<b>B)</b> Botuxonning Oltin O’rdaga asos solishi (1236)<br/>"
                    "<b>C)</b> O’zbekxonning islomni qabul qilishi (1314)<br/>"
                    "<b>D)</b> Min imperiyasining tashkil topishi (1368)<br/>"
                    "<b>E)</b> Amir Temur-To’xtamish, Terek jangi (1395)<br/>"
                    "<b>F)</b> Chjan Xe ekspeditsiyalarining boshlanishi (1405)"
                    "</div>"
                    "<p><b>Berilgan voqealardan qaysi biri eng keyin sodir bo’lgan?</b></p>"
                ),
                "explanation": "1405-yil — ro’yxatdagi eng so’nggi sana (Chjan Xe ekspeditsiyalari).",
                "options": [
                    ("A", "A", False),
                    ("B", "B", False),
                    ("C", "C", False),
                    ("D", "D", False),
                    ("E", "E", False),
                    ("F", "F", True),
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
                "title": "Chingizxon davlati.",
                "parts": [
                    ("a", "Chingizxon asl ismini yozing.", "Temuchin (Temujin / Temuchin xon)"),
                    ("b", "U ulug’ xon deb e’lon qilingan yilni yozing.", "1206-yil (1206 / 1206 yil)"),
                ],
                "explanation": "a) Temuchin; b) 1206-yil.",
            },
            # 37
            {
                "title": "Mo’g’ul ulusi.",
                "parts": [
                    ("a", "Chingizxon davlatni bo’lib bergan to’rt o’g’lini yozing.", "Jo’ji, Chig’atoy, O’qtoy, Tuli (Joji, Chigatoy, Oqtoy, Tuli / Joʻji, Chigʻatoy, Oʻqtoy, Tuli)"),
                    ("b", "Taxt vorisi etib tayinlangan o’g’lini yozing.", "O’qtoy (Oqtoy / Oʻqtoy / O'qtoyxon)"),
                ],
                "explanation": "a) Jo’ji, Chig’atoy, O’qtoy, Tuli; b) O’qtoy.",
            },
            # 38
            {
                "title": "Oltin O’rda.",
                "parts": [
                    ("a", "Oltin O’rdaga asos solgan xonni yozing.", "Botuxon (Botu / Botu xon)"),
                    ("b", "Dastlabki poytaxtini yozing.", "Saroy Botu (Saroy-Botu / Saroy Botu shahri)"),
                ],
                "explanation": "a) Botuxon; b) Saroy Botu.",
            },
            # 39
            {
                "title": "Oltin O’rdada islom.",
                "parts": [
                    ("a", "Islomni davlat dini deb e’lon qilgan xonni yozing.", "O’zbekxon (Ozbekxon / Oʻzbekxon / O'zbek xon)"),
                    ("b", "Bu voqea yilini yozing.", "1314-yil (1314 / 1314 yil)"),
                ],
                "explanation": "a) O’zbekxon; b) 1314-yil.",
            },
            # 40
            {
                "title": "Amir Temur va Oltin O’rda.",
                "parts": [
                    ("a", "Amir Temur To’xtamishni mag’lub etgan jangni yozing.", "Terek jangi (1395) (Terek / Terek jangi / Terek boyidagi jang)"),
                    ("b", "Bu jangdan keyin vayron bo’lgan shaharlarni yozing.", "Saroy, Saroy Berka, Astraxan (Saroy, Saroy Berka va Astraxan / Saroy Berka, Saroy, Astraxon)"),
                ],
                "explanation": "a) Terek jangi (1395); b) Saroy, Saroy Berka, Astraxan.",
            },
            # 41
            {
                "title": "Xitoyda Yuan sulolasi.",
                "parts": [
                    ("a", "Yuan sulolasiga asos solgan hukmdorni yozing.", "Xubilayxon (Xubilay / Hubilayxon / Hubilay)"),
                    ("b", "Uning saroyida xizmat qilgan venetsiyalik sayyohni yozing.", "Marko Polo"),
                ],
                "explanation": "a) Xubilayxon; b) Marko Polo.",
            },
            # 42
            {
                "title": "Min imperiyasi.",
                "parts": [
                    ("a", "Imperiyaga asos solgan shaxsni yozing.", "Chju Yuan-Chjan (Chju Yuanchjan / Chju Yuan Chjan / Chju Yuanjan)"),
                    ("b", "Bu voqea yilini yozing.", "1368-yil (1368 / 1368 yil)"),
                ],
                "explanation": "a) Chju Yuan-Chjan; b) 1368-yil.",
            },
            # 43
            {
                "title": "Chjan Xe ekspeditsiyalari.",
                "parts": [
                    ("a", "Ekspeditsiyalar davom etgan yillarni yozing.", "1405-1433-yillar (1405-1433 / 1405-1433 yillar)"),
                    ("b", "Necha marta yurish uyushtirilganini yozing.", "Yetti marta (7 marta / 7 / Yetti)"),
                ],
                "explanation": "a) 1405-1433-yillar; b) Yetti marta.",
            },
            # 44
            {
                "title": "Yaponiya syogunlari.",
                "parts": [
                    ("a", "Birinchi syogunlikni o’rnatgan shaxsni yozing.", "Minamoto (Minamoto Yoritomo / Yoritomo Minamoto)"),
                    ("b", "U mamlakatni boshqargan qal’a-saroy shahrini yozing.", "Kamakura (Kamakura shahri)"),
                ],
                "explanation": "a) Minamoto; b) Kamakura.",
            },
            # 45
            {
                "title": "Koreya tarixi.",
                "parts": [
                    ("a", "Qadimgi Choson bo’lingan uch qirollikni yozing.", "Pekche, Silla, Koguryo (Pekche, Silla va Koguryo / Silla, Pekche, Koguryo)"),
                    ("b", "”Koreya” nomini bergan sulolani yozing.", "Koryo sulolasi (Koryo / Koryo sulolasi davlati)"),
                ],
                "explanation": "a) Pekche, Silla, Koguryo; b) Koryo sulolasi.",
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
