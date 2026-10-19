"""Django management command: Sodiqov Shohjahon ustozning 7-sinf Jahon Tarixi Milliy Sertifikat mock testini yaratish.

Mavzu: 7–14-mavzular: Slavyanlar-Kiyev Rusi, Yevropa madaniyati, Arabiston-Arab xalifaligi, Hindiston, Xitoy, Osiyo madaniyati.
35 ta test topshirig'i (A, B, C, D) va 10 ta yozma (ochiq) savol. Jami: 45 ta topshiriq.
Barcha diagrammalar, jadvallar, Eyler-Venn sxemalari va xronologik mosliklar birga-bir aniqlikda joylangan.

Muallif/O'qituvchi: shohjahon (Sodiqov Shohjahon, @TarixMilliyCertificate)
Nashr holati: is_published=False (qoralama).

Foydalanish:
    python manage.py seed_tarix_shohjahon_7sinf_7_14
    python manage.py seed_tarix_shohjahon_7sinf_7_14 --force
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from django.contrib.auth.models import User

from accounts.models import Profile, ensure_profile_for_user
from tests_app.models import Subject, TestSet, Question, AnswerOption, SubQuestion


MOCK_TITLE = "7-sinf Jahon Tarixi — Milliy Sertifikat (7–14-mavzular) | Shohjahon"
MOCK_DESC = (
    "7–14-mavzular: Slavyanlar-Kiyev Rusi, Yevropa madaniyati, Arabiston-Arab xalifaligi, Hindiston, Xitoy, Osiyo madaniyati. "
    "35 ta test topshirig'i (A, B, C, D) va 10 ta yozma (ochiq) savol. Jami: 45 ta topshiriq. "
    "Muallif: Sodiqov Shohjahon (@TarixMilliyCertificate)."
)


class Command(BaseCommand):
    help = "Sodiqov Shohjahon ustoz nomidan 7-sinf Jahon Tarixi (7-14-mavzular) 45 talik Milliy Sertifikat testini yuklaydi."

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
                        f"Qayta yuklash uchun: python manage.py seed_tarix_shohjahon_7sinf_7_14 --force"
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
                "explanation": "Svyatoslav Xazar xoqonligi bilan urushgan, Toriq ibn Sayid esa Ispaniyani bosib olgan arab sarkardasi bo’lgan.",
                "options": [
                    ("A", "Oleg — 882-yilda Kiyevni egallagan", False),
                    ("B", "Vladimir — 988-yilda Rusni xristianlashtirgan", False),
                    ("C", "Yaroslav — ”Rus haqiqati”ni tuzdirgan", False),
                    ("D", "Svyatoslav — Toriq ibn Sayid bilan urushgan", True),
                ],
            },
            # 2
            {
                "body": (
                    "<p>Quyidagi xalifalar va ular bilan bog’liq ma’lumotlar mos ravishda berilgan javobni aniqlang.</p>"
                    "<div style='display:grid;grid-template-columns:repeat(auto-fit, minmax(240px, 1fr));gap:12px;margin:14px 0;'>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;'>"
                    "<b>1)</b> Abu Bakr<br/>"
                    "<b>2)</b> Umar<br/>"
                    "<b>3)</b> Usmon<br/>"
                    "<b>4)</b> Ali"
                    "</div>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;'>"
                    "<b>a)</b> Falastin, Suriya, Misr va Liviyani istilo qilgan<br/>"
                    "<b>b)</b> Birinchi xalifa, Arabiston to’liq islomlashdi<br/>"
                    "<b>c)</b> Qur’on oyatlarini yagona kitobga jamlagan<br/>"
                    "<b>d)</b> So’nggi xalifa, ichki urushlar davri"
                    "</div>"
                    "</div>"
                ),
                "explanation": "1-b (Abu Bakr — birinchi xalifa); 2-a (Umar — istilolar); 3-c (Usmon — Qur'onni jamlagan); 4-d (Ali — so'nggi xalifa).",
                "options": [
                    ("A", "1-b; 2-a; 3-c; 4-d", True),
                    ("B", "1-a; 2-b; 3-d; 4-c", False),
                    ("C", "1-b; 2-c; 3-a; 4-d", False),
                    ("D", "1-c; 2-a; 3-b; 4-d", False),
                ],
            },
            # 3
            {
                "body": "<p>Slavyanlarda xalq yig’ini qanday atalgan?</p>",
                "explanation": "Slavyanlarda xalq yig'ini Veche deb atalgan.",
                "options": [
                    ("A", "Veche", True),
                    ("B", "Sinklit", False),
                    ("C", "Kortes", False),
                    ("D", "Vitan", False),
                ],
            },
            # 4
            {
                "body": (
                    "<p>Quyidagi voqealar to’g’ri xronologik ketma-ketlikda ko’rsatilgan javobni toping.</p>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;margin:12px 0;'>"
                    "1) Muhammad (s.a.v.) tug’ildi (570)<br/>"
                    "2) Birinchi vahiy keldi (610)<br/>"
                    "3) Hijrat (622)<br/>"
                    "4) Makka islom markaziga aylandi (630)<br/>"
                    "5) Oleg Kiyevni egalladi (882)<br/>"
                    "6) Vladimir Rusni xristianlashtirdi (988)"
                    "</div>"
                ),
                "explanation": "To'g'ri xronologik ketma-ketlik: 570 -> 610 -> 622 -> 630 -> 882 -> 988.",
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
                    "<p>Quyida berilgan Arab xalifaligi soliqlari va ularning izohi to’g’ri moslashtirilgan javobni toping.</p>"
                    "<div style='display:grid;grid-template-columns:repeat(auto-fit, minmax(240px, 1fr));gap:12px;margin:14px 0;'>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;'>"
                    "<b>I.</b> Xiroj<br/>"
                    "<b>II.</b> Jizya<br/>"
                    "<b>III.</b> Zakot<br/>"
                    "<b>IV.</b> Ushr"
                    "</div>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;'>"
                    "<b>a)</b> Yer solig’i, hosilning 1/3 qismi<br/>"
                    "<b>b)</b> Musulmon bo’lmaganlardan olinadigan jon solig’i<br/>"
                    "<b>c)</b> Chorva va savdodan olinadigan, 1/40 hissa<br/>"
                    "<b>d)</b> Daromadning 1/10 qismi<br/>"
                    "<b>e)</b> Yer ijarasi solig’i"
                    "</div>"
                    "</div>"
                ),
                "explanation": "Xiroj — 1/3 yer solig’i; Jizya — jon solig’i; Zakot — 1/40 mol-mulk; Ushr — 1/10 daromad.",
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
                    "<p>Quyida berilgan Hindiston tabaqalari (varna) va ularning izohi to’g’ri moslashtirilgan javobni toping.</p>"
                    "<div style='display:grid;grid-template-columns:repeat(auto-fit, minmax(240px, 1fr));gap:12px;margin:14px 0;'>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;'>"
                    "<b>I.</b> Braxmanlar<br/>"
                    "<b>II.</b> Kshatriylar<br/>"
                    "<b>III.</b> Vayshiylar<br/>"
                    "<b>IV.</b> Shudralar"
                    "</div>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;'>"
                    "<b>a)</b> Kohinlar, ruhoniylar<br/>"
                    "<b>b)</b> Jangchilar<br/>"
                    "<b>c)</b> Dehqon, hunarmand, savdogarlar<br/>"
                    "<b>d)</b> Xizmatkorlar<br/>"
                    "<b>e)</b> Yerga egalik qiluvchi zodagonlar"
                    "</div>"
                    "</div>"
                ),
                "explanation": "Braxmanlar — kohinlar; Kshatriylar — jangchilar; Vayshiylar — dehqon-hunarmand-savdogar; Shudralar — xizmatkorlar.",
                "options": [
                    ("A", "I-a, II-b, III-c, IV-d", True),
                    ("B", "I-b, II-a, III-c, IV-d", False),
                    ("C", "I-a, II-c, III-b, IV-d", False),
                    ("D", "I-a, II-b, III-d, IV-c", False),
                ],
            },
            # 7
            {
                "body": "<p>Tarixiy shaxsni aniqlang. Slavyanlar taklifi bilan Rusga kelgan, Novgorodda knyazlik qilgan, sulolaga asos solgan varyag sardori.</p>",
                "explanation": "Ryurik — slavyanlar taklifi bilan Rusga kelgan va Ryurikovichlar sulolasiga asos solgan varyag sardori.",
                "options": [
                    ("A", "Ryurik", True),
                    ("B", "Oleg", False),
                    ("C", "Igor", False),
                    ("D", "Svyatoslav", False),
                ],
            },
            # 8
            {
                "body": "<p>Tarixiy shaxsni aniqlang. 964-yilda Xazar xoqonligini mag’lub etib, uning poytaxti Itilni egallagan mohir sarkarda.</p>",
                "explanation": "Svyatoslav 964-yilda Xazar xoqonligini mag'lub etib, uning poytaxti Itilni egallagan.",
                "options": [
                    ("A", "Svyatoslav", True),
                    ("B", "Oleg", False),
                    ("C", "Vladimir", False),
                    ("D", "Yaroslav", False),
                ],
            },
            # 9
            {
                "body": "<p>Tarixiy hodisani aniqlang. 622-yilda Muhammad (s.a.v.) Makkadan Madinaga ko’chgan voqea, musulmon yil hisobining boshlanish sanasi.</p>",
                "explanation": "622-yilda payg'ambarimiz Muhammad (s.a.v.) Makkadan Madinaga hijrat qilganlar.",
                "options": [
                    ("A", "Hijrat", True),
                    ("B", "Miroj", False),
                    ("C", "Ramazon", False),
                    ("D", "Hajj", False),
                ],
            },
            # 10
            {
                "body": "<p>Tarixiy shaxsni aniqlang. 711-yilda Gibraltar bo’g’ozidan o’tib, Ispaniyani bosib olgan arab sarkardasi (Gibraltar nomi undan kelib chiqqan).</p>",
                "explanation": "Toriq ibn Sayid (Tariq ibn Ziyod) 711-yilda Gibraltar bo'g'ozidan o'tib Ispaniyani bosib olgan.",
                "options": [
                    ("A", "Toriq ibn Sayid", True),
                    ("B", "Abu Muslim", False),
                    ("C", "Bobak", False),
                    ("D", "Muqanna", False),
                ],
            },
            # 11
            {
                "body": (
                    "<p>Quyidagi hukmdorlardan qaysilari Kiyev Rusiga tegishli?</p>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;margin:12px 0;'>"
                    "1) Oleg<br/>"
                    "2) Igor<br/>"
                    "3) Svyatoslav<br/>"
                    "4) Meshko I<br/>"
                    "5) Vatslav<br/>"
                    "6) Vladimir"
                    "</div>"
                ),
                "explanation": "Meshko I Polsha, Vatslav Chexiya hukmdori bo’lgan. Oleg, Igor, Svyatoslav va Vladimir Kiyev Rusiga tegishli.",
                "options": [
                    ("A", "1, 2, 3, 6", True),
                    ("B", "1, 4, 5, 6", False),
                    ("C", "2, 3, 4, 5", False),
                    ("D", "1, 2, 4, 5", False),
                ],
            },
            # 12
            {
                "body": "<p>732-yilda Puate jangida arablarni mag’lub etgan Frank hukmdorini aniqlang.</p>",
                "explanation": "Karl Martell 732-yilda Puate jangida arablarni mag'lub etib, ularning Yevropaga siljishini to'xtatgan.",
                "options": [
                    ("A", "Karl Martell", True),
                    ("B", "Xlodvig", False),
                    ("C", "Buyuk Karl", False),
                    ("D", "Pipin", False),
                ],
            },
            # 13
            {
                "body": "<p>VII-VIII asrlar Arab xalifaligi uchun xos bo’lgan holatni aniqlang.</p>",
                "explanation": "VII-VIII asrlarda Arab xalifaligi keng istilolar natijasida ulkan hududlarni o'z ichiga olgan imperiyaga aylandi.",
                "options": [
                    ("A", "Xalifalik ulkan hududlarni o’z ichiga olgan yirik davlatga aylandi", True),
                    ("B", "Xalifalik hech qanday tashqi yurish qilmagan", False),
                    ("C", "Islom dini faqat Arabistonda qolgan", False),
                    ("D", "Yozuv umuman mavjud emas edi", False),
                ],
            },
            # 14
            {
                "body": (
                    "<p>Quyidagi qo’zg’olonlardan qaysilari Arab xalifaligiga qarshi bo’lgan?</p>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;margin:12px 0;'>"
                    "1) Abu Muslim qo’zg’oloni<br/>"
                    "2) Muqanna qo’zg’oloni<br/>"
                    "3) Bobak qo’zg’oloni<br/>"
                    "4) Sarbadorlar harakati<br/>"
                    "5) Jakeriya<br/>"
                    "6) Uott Tayler qo’zg’oloni"
                    "</div>"
                ),
                "explanation": "Abu Muslim, Muqanna va Bobak qo'zg'olonlari Arab xalifaligiga qarshi ko'tarilgan. Sarbadorlar, Jakeriya va Uott Tayler boshqa davrlarga oid.",
                "options": [
                    ("A", "1, 2, 3", True),
                    ("B", "4, 5, 6", False),
                    ("C", "1, 3, 5", False),
                    ("D", "2, 4, 6", False),
                ],
            },
            # 15
            {
                "body": "<p>Xitoyda Buyuk kanalni qurdirgan sulolani aniqlang.</p>",
                "explanation": "Xitoyda Buyuk kanalni 581-618-yillarda hukmronlik qilgan Suy sulolasi qurdirgan.",
                "options": [
                    ("A", "Suy sulolasi", True),
                    ("B", "Tan sulolasi", False),
                    ("C", "Sun sulolasi", False),
                    ("D", "Xan sulolasi", False),
                ],
            },
            # 16
            {
                "body": (
                    "<p>Quyidagi voqealar to’g’ri xronologik ketma-ketlikda ko’rsatilgan javobni toping.</p>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;margin:12px 0;'>"
                    "1) Toriq ibn Sayid Ispaniyani bosdi (711)<br/>"
                    "2) Puate jangi (732)<br/>"
                    "3) Abu Muslim qo’zg’oloni (747)<br/>"
                    "4) Abbosiylar hokimiyatga keldi (750)<br/>"
                    "5) Muqanna qo’zg’oloni (769-783)<br/>"
                    "6) Bobak qo’zg’oloni (815)"
                    "</div>"
                ),
                "explanation": "To'g'ri xronologik ketma-ketlik: 711 -> 732 -> 747 -> 750 -> 769 -> 815.",
                "options": [
                    ("A", "1, 2, 3, 4, 5, 6", True),
                    ("B", "2, 1, 3, 4, 5, 6", False),
                    ("C", "1, 3, 2, 4, 5, 6", False),
                    ("D", "1, 2, 4, 3, 5, 6", False),
                ],
            },
            # 17 (SCHEMATIC DIAGRAM)
            {
                "body": (
                    "<p>Sxematik diagrammada dastlabki uch xalifaning hukmronlik davri ko’rsatilgan. 1–3 raqamlaridan qaysi biri Umar hukmronligiga to’g’ri keladi?</p>"
                    "<div style='display:flex;justify-content:center;margin:16px 0;'>"
                    "<div style='width:320px;border:2px solid #3b82f6;border-radius:12px;overflow:hidden;background:rgba(59,130,246,0.03);box-shadow:0 2px 10px rgba(0,0,0,0.05);'>"
                    "<div style='padding:12px 16px;border-bottom:1px solid #cbd5e1;display:flex;align-items:center;gap:12px;'>"
                    "<span style='background:#64748b;color:white;width:26px;height:26px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-weight:bold;font-size:13px;'>1</span>"
                    "<span style='font-weight:600;font-size:14px;color:#1e293b;'>632–634-yillar</span>"
                    "</div>"
                    "<div style='padding:12px 16px;border-bottom:1px solid #cbd5e1;display:flex;align-items:center;gap:12px;background:rgba(59,130,246,0.08);'>"
                    "<span style='background:#2563eb;color:white;width:26px;height:26px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-weight:bold;font-size:13px;'>2</span>"
                    "<span style='font-weight:600;font-size:14px;color:#1e40af;'>634–644-yillar</span>"
                    "</div>"
                    "<div style='padding:12px 16px;display:flex;align-items:center;gap:12px;'>"
                    "<span style='background:#64748b;color:white;width:26px;height:26px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-weight:bold;font-size:13px;'>3</span>"
                    "<span style='font-weight:600;font-size:14px;color:#1e293b;'>644–656-yillar</span>"
                    "</div>"
                    "</div>"
                    "</div>"
                ),
                "explanation": "Umar 634-644-yillarda (2-band) xalifalik qilgan, Falastin-Suriya-Misr-Liviyani istilo qilgan. 1 — Abu Bakr (632-634), 3 — Usmon (644-656).",
                "options": [
                    ("A", "2", True),
                    ("B", "1", False),
                    ("C", "3", False),
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
                    "<tr><td style='padding:6px;border:1px solid #cbd5e1;text-align:center;'>1</td><td style='padding:6px;border:1px solid #cbd5e1;'>Olegning Kiyevni egallashi (882)</td><td style='padding:6px;border:1px solid #cbd5e1;'>Kiyev Rusi davlatiga asos solindi</td></tr>"
                    "<tr><td style='padding:6px;border:1px solid #cbd5e1;text-align:center;'>2</td><td style='padding:6px;border:1px solid #cbd5e1;'>Vladimirning xristianlikni qabul qilishi (988)</td><td style='padding:6px;border:1px solid #cbd5e1;'>Rus butunlay islom dinini qabul qildi</td></tr>"
                    "<tr><td style='padding:6px;border:1px solid #cbd5e1;text-align:center;'>3</td><td style='padding:6px;border:1px solid #cbd5e1;'>Puate jangi (732)</td><td style='padding:6px;border:1px solid #cbd5e1;'>Arablarning Yevropaga yurishlariga chek qo’yildi</td></tr>"
                    "<tr><td style='padding:6px;border:1px solid #cbd5e1;text-align:center;'>4</td><td style='padding:6px;border:1px solid #cbd5e1;'>Abu Muslim qo’zg’oloni (747)</td><td style='padding:6px;border:1px solid #cbd5e1;'>Umaviylar hukmronligi tugadi, Abbosiylar keldi</td></tr>"
                    "<tr><td style='padding:6px;border:1px solid #cbd5e1;text-align:center;'>5</td><td style='padding:6px;border:1px solid #cbd5e1;'>Xuloku Bag’dodni egallashi (1258)</td><td style='padding:6px;border:1px solid #cbd5e1;'>Arab xalifaligi yanada mustahkamlandi</td></tr>"
                    "<tr><td style='padding:6px;border:1px solid #cbd5e1;text-align:center;'>6</td><td style='padding:6px;border:1px solid #cbd5e1;'>Yaroslav davridagi bijanaklar ustidan g’alaba</td><td style='padding:6px;border:1px solid #cbd5e1;'>Avliyo Sofiya ibodatxonasi qurildi</td></tr>"
                    "</tbody>"
                    "</table>"
                ),
                "explanation": "2 xato: aksincha, Rus xristianlikni qabul qildi. 5 xato: aksincha, xalifalik barham topdi.",
                "options": [
                    ("A", "1, 3, 4, 6", True),
                    ("B", "2, 3, 5, 6", False),
                    ("C", "1, 2, 4, 5", False),
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
                    "<th style='padding:8px;border:1px solid #cbd5e1;'>Sharqiy Yevropa voqeasi</th>"
                    "<th style='padding:8px;border:1px solid #cbd5e1;'>Osiyo voqeasi</th>"
                    "</tr>"
                    "</thead>"
                    "<tbody>"
                    "<tr><td style='padding:8px;border:1px solid #cbd5e1;text-align:center;font-weight:bold;'>VII asr</td><td style='padding:8px;border:1px solid #cbd5e1;text-align:center;font-weight:bold;color:#2563eb;'>a</td><td style='padding:8px;border:1px solid #cbd5e1;'>Islom dini vujudga keldi</td></tr>"
                    "<tr><td style='padding:8px;border:1px solid #cbd5e1;text-align:center;font-weight:bold;'>IX asr</td><td style='padding:8px;border:1px solid #cbd5e1;'>Kiyev Rusi tashkil topdi (882)</td><td style='padding:8px;border:1px solid #cbd5e1;text-align:center;font-weight:bold;color:#2563eb;'>b</td></tr>"
                    "</tbody>"
                    "</table>"
                    "<div style='font-size:12.5px;color:#475569;margin-top:8px;'>"
                    "<b>Ma’lumotlar:</b> 1) Bolgariya podsholigi tashkil topdi (VII asr oxiri); 2) Tan sulolasi boshlandi (618); 3) Rim imperiyasi qulashi (476); 4) Amir Temur tug’ildi (1336)."
                    "</div>"
                ),
                "explanation": "a=1: Bolgariya podsholigi VII asr oxirida tashkil topdi. b=2: Tan sulolasi 618-yilda (IX asrga yaqin davr) boshlandi.",
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
                    "<p>Quyida berilgan ma’lumotlarni tahlil qilib Eyler-Venn diagrammasiga mos keladigan javoblarni aniqlang. <i>(Kiyev Rusi va Arab xalifaligi)</i></p>"
                    "<div style='display:flex;justify-content:center;margin:16px 0;'>"
                    "<svg width='340' height='180' viewBox='0 0 340 180' style='max-width:100%;'>"
                    "<circle cx='120' cy='90' r='75' fill='rgba(59, 130, 246, 0.15)' stroke='#3b82f6' stroke-width='2'/>"
                    "<circle cx='220' cy='90' r='75' fill='rgba(16, 185, 129, 0.15)' stroke='#10b981' stroke-width='2'/>"
                    "<text x='85' y='75' font-size='16' font-weight='bold' fill='#1e40af' text-anchor='middle'>I</text>"
                    "<text x='85' y='95' font-size='12' fill='#1e3a8a' text-anchor='middle'>Kiyev Rusi</text>"
                    "<text x='170' y='85' font-size='16' font-weight='bold' fill='#4338ca' text-anchor='middle'>III</text>"
                    "<text x='255' y='75' font-size='16' font-weight='bold' fill='#065f46' text-anchor='middle'>II</text>"
                    "<text x='255' y='95' font-size='12' fill='#064e3b' text-anchor='middle'>Arab xalifaligi</text>"
                    "</svg>"
                    "</div>"
                    "<div style='font-size:12.5px;color:#334155;line-height:1.7;background:rgba(100,116,139,0.05);padding:12px;border-radius:8px;border:1px solid #cbd5e1;'>"
                    "<b>a)</b> Slavyan xalqlari asosida tuzilgan;<br/>"
                    "<b>b)</b> Islom dini asosida birlashgan;<br/>"
                    "<b>c)</b> IX-X asrlarda vujudga kelgan;<br/>"
                    "<b>d)</b> Xristianlikni davlat dini qilib oldi;<br/>"
                    "<b>e)</b> Yozma qonunlar to’plamiga ega bo’lgan;<br/>"
                    "<b>f)</b> Xalifa boshchiligida boshqarilgan."
                    "</div>"
                ),
                "explanation": "I (faqat Kiyev Rusi): slavyan asosida, xristianlik. II (faqat Arab xalifaligi): islom asosida, xalifa boshchiligi. III (umumiy): IX-X asrda vujudga kelgan, yozma qonunlar.",
                "options": [
                    ("A", "I-a,d; II-b,f; III-c,e", True),
                    ("B", "I-b,f; II-a,d; III-c,e", False),
                    ("C", "I-a,f; II-b,d; III-c,e", False),
                    ("D", "I-a,d; II-b,e; III-c,f", False),
                ],
            },
            # 21
            {
                "body": (
                    "<p>Quyidagi hukmdorlar va davlatlarni to’g’ri moslashtiring.</p>"
                    "<div style='display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:12px;margin:14px 0;'>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;'>"
                    "<b>1)</b> Asparux<br/>"
                    "<b>2)</b> Vatslav<br/>"
                    "<b>3)</b> Meshko I<br/>"
                    "<b>4)</b> Chandragupta I"
                    "</div>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;'>"
                    "<b>a)</b> Bolgariya<br/>"
                    "<b>b)</b> Chexiya<br/>"
                    "<b>c)</b> Polsha<br/>"
                    "<b>d)</b> Hindiston (guptalar)"
                    "</div>"
                    "</div>"
                ),
                "explanation": "1-a (Asparux — Bolgariya), 2-b (Vatslav — Chexiya), 3-c (Meshko I — Polsha), 4-d (Chandragupta I — Hindiston guptalar).",
                "options": [
                    ("A", "1-a; 2-b; 3-c; 4-d", True),
                    ("B", "1-b; 2-a; 3-d; 4-c", False),
                    ("C", "1-a; 2-c; 3-b; 4-d", False),
                    ("D", "1-c; 2-a; 3-b; 4-d", False),
                ],
            },
            # 22
            {
                "body": "<p>Xitoyda X asrda ixtiro qilingan, dastlab mushakbozlikda ishlatilgan moddani aniqlang.</p>",
                "explanation": "Porox Xitoyda X asrda ixtiro qilingan bo'lib, dastlab mushakbozlikda foydalanilgan.",
                "options": [
                    ("A", "Porox", True),
                    ("B", "Qog’oz", False),
                    ("C", "Chinni", False),
                    ("D", "Ipak", False),
                ],
            },
            # 23
            {
                "body": "<p>Guptalar davlatining poytaxtini aniqlang.</p>",
                "explanation": "Guptalar davlatining poytaxti Pataliputra shahri bo'lgan.",
                "options": [
                    ("A", "Pataliputra", True),
                    ("B", "Dehli", False),
                    ("C", "Bombay", False),
                    ("D", "Kalkutta", False),
                ],
            },
            # 24
            {
                "body": (
                    "<p>Quyidagi tarixchi/olimlardan qaysilari Vizantiya va Franklar madaniyatiga tegishli?</p>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;margin:12px 0;'>"
                    "1) Eynxard<br/>"
                    "2) Alkuin<br/>"
                    "3) Platon<br/>"
                    "4) Syuan Szyan<br/>"
                    "5) Abu Muslim<br/>"
                    "6) Toriq ibn Sayid"
                    "</div>"
                ),
                "explanation": "Syuan Szyan xitoylik sayyoh, Abu Muslim va Toriq ibn Sayid arab dunyosiga tegishli. Eynxard, Alkuin va Platon Vizantiya va Franklar madaniyatiga tegishli.",
                "options": [
                    ("A", "1, 2, 3", True),
                    ("B", "4, 5, 6", False),
                    ("C", "1, 3, 5", False),
                    ("D", "2, 4, 6", False),
                ],
            },
            # 25
            {
                "body": "<p>Vizantiyaning oltin puli qanday nomlangan?</p>",
                "explanation": "Vizantiyada zarb etilgan oltin tanga pul Numisma deb nomlangan.",
                "options": [
                    ("A", "Numisma", True),
                    ("B", "Dirham", False),
                    ("C", "Dinor", False),
                    ("D", "Solidus", False),
                ],
            },
            # 26
            {
                "body": "<p>”Grek olovi” qaysi asrda ixtiro qilingan?</p>",
                "explanation": "”Grek olovi” VII asrda kashf etilgan va Vizantiya harbiy flotida dushmanga qarshi keng qo'llanilgan.",
                "options": [
                    ("A", "VII asr", True),
                    ("B", "VI asr", False),
                    ("C", "IX asr", False),
                    ("D", "XI asr", False),
                ],
            },
            # 27
            {
                "body": "<p>O’zaro muvofiqlik SAQLANMAGAN javobni toping.</p>",
                "explanation": "Qur’onni yagona kitobga jamlash xalifa Usmonga tegishli, Yaroslav esa ”Rus haqiqati”ni tuzdirgan.",
                "options": [
                    ("A", "Oleg — Kiyev Rusiga asos solgan", False),
                    ("B", "Vladimir — Rusni xristianlashtirgan", False),
                    ("C", "Yaroslav — ”Qur’on”ni yagona kitobga jamlagan", True),
                    ("D", "Svyatoslav — Xazar xoqonligini mag’lub etgan", False),
                ],
            },
            # 28
            {
                "body": "<p>Xitoyda yer o’lchov birligini aniqlang.</p>",
                "explanation": "Xitoyda qadimdan va o'rta asrlarda yer o'lchov birligi \"Mu\" deb atalgan.",
                "options": [
                    ("A", "Mu", True),
                    ("B", "Gektar", False),
                    ("C", "Tanob", False),
                    ("D", "Jarib", False),
                ],
            },
            # 29
            {
                "body": (
                    "<p>Quyida berilgan ma’lumotlarga mos yakuniy xulosalar (to’g’ri/noto’g’ri) keltirilgan javobni aniqlang.</p>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;margin:12px 0;'>"
                    "<b>I.</b> Kiyev Rusi Ryurik, Sineus va Truvor birgalikda boshqargan davlat sifatida uzoq yillar saqlanib qoldi.<br/>"
                    "<b>II.</b> Arab xalifaligida yer-mulk avvalgi egalari qo’lida qolgan, lekin davlatniki deb e’lon qilingan.<br/>"
                    "<b>III.</b> Xitoyda Tan sulolasi davrida barcha yerlar xususiy mulk hisoblangan."
                    "</div>"
                ),
                "explanation": "I noto’g’ri — Sineus va Truvor tez orada vafot etib, Ryurik yakka hukmronlik qilgan. II to’g’ri. III noto’g’ri — yerlar davlatniki deb e’lon qilingan.",
                "options": [
                    ("A", "I-noto’g’ri; II-to’g’ri; III-noto’g’ri", True),
                    ("B", "I-to’g’ri; II-to’g’ri; III-noto’g’ri", False),
                    ("C", "I-noto’g’ri; II-noto’g’ri; III-to’g’ri", False),
                    ("D", "Hammasi to’g’ri", False),
                ],
            },
            # 30
            {
                "body": (
                    "<p>Shaxslar va ularning ishlari to’g’ri moslashtirilgan javobni toping.</p>"
                    "<div style='display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:12px;margin:14px 0;'>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;'>"
                    "<b>1)</b> Toriq ibn Sayid<br/>"
                    "<b>2)</b> Karl Martell<br/>"
                    "<b>3)</b> Abu Muslim"
                    "</div>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;'>"
                    "<b>a)</b> 711-yilda Ispaniyani bosib olgan<br/>"
                    "<b>b)</b> 732-yilda arablarni mag’lub etgan<br/>"
                    "<b>c)</b> 747-yilda qo’zg’olon boshlagan"
                    "</div>"
                    "</div>"
                ),
                "explanation": "1-a (Toriq ibn Sayid — 711-yilda Ispaniyani bosgan), 2-b (Karl Martell — 732-yilda Puate jangida arablarni yenggan), 3-c (Abu Muslim — 747-yilda qo'zg'olon boshlagan).",
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
                    "<p>Sulolalar va davlatlarni to’g’ri moslashtiring.</p>"
                    "<div style='display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:12px;margin:14px 0;'>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;'>"
                    "<b>1)</b> Umaviylar<br/>"
                    "<b>2)</b> Abbosiylar<br/>"
                    "<b>3)</b> Ryurikovichlar"
                    "</div>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;'>"
                    "<b>a)</b> Kiyev Rusi<br/>"
                    "<b>b)</b> 750-1258-yillarda hukmronlik qilgan<br/>"
                    "<b>c)</b> 661-750-yillarda hukmronlik qilgan"
                    "</div>"
                    "</div>"
                ),
                "explanation": "1-c (Umaviylar — 661-750), 2-b (Abbosiylar — 750-1258), 3-a (Ryurikovichlar — Kiyev Rusi).",
                "options": [
                    ("A", "1-c; 2-b; 3-a", True),
                    ("B", "1-a; 2-b; 3-c", False),
                    ("C", "1-b; 2-c; 3-a", False),
                    ("D", "1-c; 2-a; 3-b", False),
                ],
            },
            # 32
            {
                "body": (
                    "<p>Quyidagi shaharlardan qaysilari Xitoyda savdo-hunarmandchilik markazi bo’lgan?</p>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;margin:12px 0;'>"
                    "1) Yanchjou<br/>"
                    "2) Xanchjou<br/>"
                    "3) Kayfin<br/>"
                    "4) Konstantinopol<br/>"
                    "5) Bag’dod<br/>"
                    "6) Kordova"
                    "</div>"
                ),
                "explanation": "Yanchjou, Xanchjou va Kayfin Xitoyning savdo-hunarmandchilik markazlari bo'lgan. Konstantinopol — Vizantiya, Bag'dod — xalifalik, Kordova — Ispaniya.",
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
                    "<b>A)</b> Olegning Kiyevni egallashi (882)<br/>"
                    "<b>B)</b> Toriq ibn Sayidning Ispaniyani bosib olishi (711)<br/>"
                    "<b>C)</b> Abu Muslim qo’zg’oloni (747)<br/>"
                    "<b>D)</b> Vladimirning xristianlikni qabul qilishi (988)<br/>"
                    "<b>E)</b> Xuloku Bag’dodni egallashi (1258)<br/>"
                    "<b>F)</b> Yaroslav hukmronligining boshlanishi (1019)"
                    "</div>"
                    "<p><b>Berilgan voqealardan qaysi biri eng avval sodir bo’lgan?</b></p>"
                ),
                "explanation": "711-yil — ro’yxatdagi eng qadimgi sana (Toriq ibn Sayidning Ispaniyani bosib olishi).",
                "options": [
                    ("A", "Olegning Kiyevni egallashi (882)", False),
                    ("B", "Toriq ibn Sayidning Ispaniyani bosib olishi (711)", True),
                    ("C", "Abu Muslim qo’zg’oloni (747)", False),
                    ("D", "Vladimirning xristianlikni qabul qilishi (988)", False),
                    ("E", "Xuloku Bag’dodni egallashi (1258)", False),
                    ("F", "Yaroslav hukmronligining boshlanishi (1019)", False),
                ],
            },
            # 34 (BANK)
            {
                "body": (
                    "<div style='border:1px solid #3b82f6;border-radius:10px;padding:12px;background:rgba(59,130,246,0.05);margin-bottom:14px;font-size:13px;line-height:1.7;'>"
                    "<b>33–35-topshiriqlarga mos javoblarni quyidagi banklardan (A–F) tanlang:</b><br/>"
                    "<b>A)</b> Olegning Kiyevni egallashi (882)<br/>"
                    "<b>B)</b> Toriq ibn Sayidning Ispaniyani bosib olishi (711)<br/>"
                    "<b>C)</b> Abu Muslim qo’zg’oloni (747)<br/>"
                    "<b>D)</b> Vladimirning xristianlikni qabul qilishi (988)<br/>"
                    "<b>E)</b> Xuloku Bag’dodni egallashi (1258)<br/>"
                    "<b>F)</b> Yaroslav hukmronligining boshlanishi (1019)"
                    "</div>"
                    "<p><b>Umaviylar hukmronligining tugatilishiga sabab bo’lgan voqeani aniqlang.</b></p>"
                ),
                "explanation": "Abu Muslim qo’zg’oloni (747) Umaviylar sulolasi hukmronligini ag'darib, Abbosiylarni hokimiyatga olib kelgan.",
                "options": [
                    ("A", "Olegning Kiyevni egallashi (882)", False),
                    ("B", "Toriq ibn Sayidning Ispaniyani bosib olishi (711)", False),
                    ("C", "Abu Muslim qo’zg’oloni (747)", True),
                    ("D", "Vladimirning xristianlikni qabul qilishi (988)", False),
                    ("E", "Xuloku Bag’dodni egallashi (1258)", False),
                    ("F", "Yaroslav hukmronligining boshlanishi (1019)", False),
                ],
            },
            # 35 (BANK)
            {
                "body": (
                    "<div style='border:1px solid #3b82f6;border-radius:10px;padding:12px;background:rgba(59,130,246,0.05);margin-bottom:14px;font-size:13px;line-height:1.7;'>"
                    "<b>33–35-topshiriqlarga mos javoblarni quyidagi banklardan (A–F) tanlang:</b><br/>"
                    "<b>A)</b> Olegning Kiyevni egallashi (882)<br/>"
                    "<b>B)</b> Toriq ibn Sayidning Ispaniyani bosib olishi (711)<br/>"
                    "<b>C)</b> Abu Muslim qo’zg’oloni (747)<br/>"
                    "<b>D)</b> Vladimirning xristianlikni qabul qilishi (988)<br/>"
                    "<b>E)</b> Xuloku Bag’dodni egallashi (1258)<br/>"
                    "<b>F)</b> Yaroslav hukmronligining boshlanishi (1019)"
                    "</div>"
                    "<p><b>Berilgan voqealardan qaysi biri eng keyin sodir bo’lgan?</b></p>"
                ),
                "explanation": "1258-yil — ro’yxatdagi eng so’nggi sana (Xuloku Bag’dodni egallashi va Arab xalifaligining qulashi).",
                "options": [
                    ("A", "Olegning Kiyevni egallashi (882)", False),
                    ("B", "Toriq ibn Sayidning Ispaniyani bosib olishi (711)", False),
                    ("C", "Abu Muslim qo’zg’oloni (747)", False),
                    ("D", "Vladimirning xristianlikni qabul qilishi (988)", False),
                    ("E", "Xuloku Bag’dodni egallashi (1258)", True),
                    ("F", "Yaroslav hukmronligining boshlanishi (1019)", False),
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
                "title": "Kiyev Rusi.",
                "parts": [
                    ("a", "Kiyev Rusi davlatiga asos solgan knyazni yozing.", "Oleg (Knyaz Oleg)"),
                    ("b", "Bu voqea qaysi yilda sodir bo’lganini yozing.", "882-yil (882)"),
                ],
                "explanation": "a) Oleg; b) 882-yil.",
            },
            # 37
            {
                "title": "Rusda xristianlik.",
                "parts": [
                    ("a", "Rusni xristianlashtirgan knyazni yozing.", "Vladimir (Knyaz Vladimir)"),
                    ("b", "Bu voqea qaysi yilda sodir bo’lganini yozing.", "988-yil (988)"),
                ],
                "explanation": "a) Vladimir; b) 988-yil.",
            },
            # 38
            {
                "title": "Yaroslav Donishmand.",
                "parts": [
                    ("a", "Uning tuzdirgan qonunlar to’plamini yozing.", "Rus haqiqati (\"Rus haqiqati\" / Russkaya pravda)"),
                    ("b", "Uning davrida qurilgan ibodatxonani yozing.", "Avliyo Sofiya ibodatxonasi (Avliyo Sofiya / Sofiya ibodatxonasi)"),
                ],
                "explanation": "a) ”Rus haqiqati”; b) Avliyo Sofiya ibodatxonasi.",
            },
            # 39
            {
                "title": "Islom dinining paydo bo’lishi.",
                "parts": [
                    ("a", "Muhammad (s.a.v.) tug’ilgan yilni yozing.", "570-yil (570)"),
                    ("b", "Hijrat sodir bo’lgan yilni yozing.", "622-yil (622)"),
                ],
                "explanation": "a) 570-yil; b) 622-yil.",
            },
            # 40
            {
                "title": "Dastlabki xalifalar.",
                "parts": [
                    ("a", "Birinchi xalifani yozing.", "Abu Bakr (Abu Bakr Siddiq / Hazrati Abu Bakr)"),
                    ("b", "Qur’onni yagona kitobga jamlagan xalifani yozing.", "Usmon (Usmon ibn Affon / Hazrati Usmon)"),
                ],
                "explanation": "a) Abu Bakr; b) Usmon.",
            },
            # 41
            {
                "title": "Arablarning Yevropaga yurishi.",
                "parts": [
                    ("a", "711-yilda Ispaniyani bosib olgan sarkardani yozing.", "Toriq ibn Sayid (Tariq ibn Ziyod / Toriq ibn Ziyod / Toriq)"),
                    ("b", "732-yilda arablarni to’xtatgan Frank hukmdorini yozing.", "Karl Martell (Karl Martel)"),
                ],
                "explanation": "a) Toriq ibn Sayid; b) Karl Martell.",
            },
            # 42
            {
                "title": "Xalifalikka qarshi qo’zg’olonlar.",
                "parts": [
                    ("a", "747-yilgi qo’zg’olon boshlig’ini yozing.", "Abu Muslim (Abu Muslim Xurosoniy)"),
                    ("b", "769-783-yillardagi qo’zg’olon boshlig’ini yozing.", "Muqanna (Hoshim ibn Hakim)"),
                ],
                "explanation": "a) Abu Muslim; b) Muqanna.",
            },
            # 43
            {
                "title": "Hindiston (guptalar).",
                "parts": [
                    ("a", "Guptalar sulolasiga asos solgan hukmdorni yozing.", "Chandragupta I (Chandragupta 1 / Chandragupta)"),
                    ("b", "Hindiston jamiyati bo’lingan to’rt tabaqani yozing.", "Braxmanlar, kshatriylar, vayshiylar, shudralar (Braxman, kshatriy, vayshiya, shudra)"),
                ],
                "explanation": "a) Chandragupta I; b) Braxmanlar, kshatriylar, vayshiylar, shudralar.",
            },
            # 44
            {
                "title": "Xitoy sulolalari.",
                "parts": [
                    ("a", "Buyuk kanalni qurdirgan sulolani yozing.", "Suy sulolasi (Suy)"),
                    ("b", "618-907-yillarda hukmronlik qilgan sulolani yozing.", "Tan sulolasi (Tan)"),
                ],
                "explanation": "a) Suy sulolasi; b) Tan sulolasi.",
            },
            # 45
            {
                "title": "Vizantiya madaniyati.",
                "parts": [
                    ("a", "Konstantinopolda ochilgan oliy maktabni yozing.", "Magnavr oliy maktabi (Magnavr)"),
                    ("b", "Vizantiya harbiy kemalarida ishlatilgan yonuvchi moddani yozing.", "Grek olovi (\"Grek olovi\")"),
                ],
                "explanation": "a) Magnavr oliy maktabi; b) ”Grek olovi”.",
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
