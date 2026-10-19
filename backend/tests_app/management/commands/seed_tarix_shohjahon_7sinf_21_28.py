"""Django management command: Sodiqov Shohjahon ustozning 7-sinf Jahon Tarixi Milliy Sertifikat mock testini yaratish.

Mavzu: 21–28-mavzular: Fransiyada markazlashgan davlat, General shtatlar, Yuz yillik urush, Angliyada markazlashgan davlat, Germaniya.
35 ta test topshirig'i (A, B, C, D) va 10 ta yozma (ochiq) savol. Jami: 45 ta topshiriq.
Barcha diagrammalar, jadvallar, Eyler-Venn sxemalari va xronologik mosliklar birga-bir aniqlikda joylangan.

Muallif/O'qituvchi: shohjahon (Sodiqov Shohjahon, @TarixMilliyCertificate)
Nashr holati: is_published=False (qoralama).

Foydalanish:
    python manage.py seed_tarix_shohjahon_7sinf_21_28
    python manage.py seed_tarix_shohjahon_7sinf_21_28 --force
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from django.contrib.auth.models import User

from accounts.models import Profile, ensure_profile_for_user
from tests_app.models import Subject, TestSet, Question, AnswerOption, SubQuestion


MOCK_TITLE = "7-sinf Jahon Tarixi — Milliy Sertifikat (21–28-mavzular) | Shohjahon"
MOCK_DESC = (
    "21–28-mavzular: Fransiyada markazlashgan davlat, General shtatlar, Yuz yillik urush, Angliyada markazlashgan davlat, Germaniya. "
    "35 ta test topshirig'i (A, B, C, D) va 10 ta yozma (ochiq) savol. Jami: 45 ta topshiriq. "
    "Muallif: Sodiqov Shohjahon (@TarixMilliyCertificate)."
)


class Command(BaseCommand):
    help = "Sodiqov Shohjahon ustoz nomidan 7-sinf Jahon Tarixi (21-28-mavzular) 45 talik Milliy Sertifikat testini yuklaydi."

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
                        f"Qayta yuklash uchun: python manage.py seed_tarix_shohjahon_7sinf_21_28 --force"
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
                "explanation": "Yuz yillik urushni Angliya qiroli Eduard III boshlagan, Genrix VII esa 1485-yilda Bosvort jangidan keyin taxtga kelgan.",
                "options": [
                    ("A", "Filipp IV — General shtatlarni chaqirgan", False),
                    ("B", "Vilgelm I — 1066-yilda Gastings jangida g’olib chiqqan", False),
                    ("C", "Janna d’Ark — Orlean qizi deb atalgan", False),
                    ("D", "Genrix VII — Yuz yillik urushni boshlagan", True),
                ],
            },
            # 2
            {
                "body": (
                    "<p>Quyidagi hukmdorlar va ular bilan bog’liq ma’lumotlar mos ravishda berilgan javobni aniqlang.</p>"
                    "<div style='display:grid;grid-template-columns:repeat(auto-fit, minmax(240px, 1fr));gap:12px;margin:14px 0;'>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;'>"
                    "<b>1)</b> Filipp IV<br/>"
                    "<b>2)</b> Karl VII<br/>"
                    "<b>3)</b> Vilgelm I<br/>"
                    "<b>4)</b> Ioann"
                    "</div>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;'>"
                    "<b>a)</b> Birinchi General shtatlarni chaqirgan (1302)<br/>"
                    "<b>b)</b> Janna d’Ark yordamida g’alaba qozongan<br/>"
                    "<b>c)</b> 1066-yilda Angliya taxtini egallagan<br/>"
                    "<b>d)</b> ”Buyuk ozodlik xartiyasi”ni imzolagan"
                    "</div>"
                    "</div>"
                ),
                "explanation": "1-a (Filipp IV — 1302-yil General shtatlar), 2-b (Karl VII — Janna d'Ark yordamida), 3-c (Vilgelm I — 1066 Angliya taxti), 4-d (Ioann — Buyuk ozodlik xartiyasi).",
                "options": [
                    ("A", "1-a; 2-b; 3-c; 4-d", True),
                    ("B", "1-b; 2-a; 3-d; 4-c", False),
                    ("C", "1-a; 2-c; 3-b; 4-d", False),
                    ("D", "1-c; 2-a; 3-b; 4-d", False),
                ],
            },
            # 3
            {
                "body": "<p>Fransiyadagi oliy tabaqaviy-vakillik muassasasini aniqlang.</p>",
                "explanation": "Fransiyada 1302-yilda tashkil topgan oliy tabaqaviy-vakillik organi General shtatlar deb atalgan.",
                "options": [
                    ("A", "General shtatlar", True),
                    ("B", "Parlament", False),
                    ("C", "Kortes", False),
                    ("D", "Sinklit", False),
                ],
            },
            # 4
            {
                "body": (
                    "<p>Quyidagi voqealar to’g’ri xronologik ketma-ketlikda ko’rsatilgan javobni toping.</p>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;margin:12px 0;'>"
                    "1) General shtatlar birinchi chaqirildi (1302)<br/>"
                    "2) Yuz yillik urush boshlandi (1337)<br/>"
                    "3) Kresi jangi (1346)<br/>"
                    "4) Jakeriya qo’zg’oloni (1358)<br/>"
                    "5) Azenkur jangi (1415)<br/>"
                    "6) Yuz yillik urush yakunlandi (1453)"
                    "</div>"
                ),
                "explanation": "Xronologik ketma-ketlik: 1302 -> 1337 -> 1346 -> 1358 -> 1415 -> 1453.",
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
                    "<p>Quyida berilgan shaxslar va ular bilan bog’liq qo’zg’olonlar to’g’ri moslashtirilgan javobni toping.</p>"
                    "<div style='display:grid;grid-template-columns:repeat(auto-fit, minmax(240px, 1fr));gap:12px;margin:14px 0;'>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;'>"
                    "<b>I.</b> Gilyom Kal<br/>"
                    "<b>II.</b> Uot Tayler<br/>"
                    "<b>III.</b> Jon Boll<br/>"
                    "<b>IV.</b> Robin Gud"
                    "</div>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;'>"
                    "<b>a)</b> Jakeriya qo’zg’oloni rahbari<br/>"
                    "<b>b)</b> 1381-yilgi Angliya qo’zg’oloni rahbari<br/>"
                    "<b>c)</b> Qo’zg’olon g’oyachisi, ”hamma teng” tamoyili tarafdori<br/>"
                    "<b>d)</b> Xalq og’zaki ijodining afsonaviy qahramoni"
                    "</div>"
                    "</div>"
                ),
                "explanation": "Gilyom Kal — Jakeriya; Uot Tayler — 1381-yil qo’zg’oloni; Jon Boll — g’oyachi; Robin Gud — afsonaviy qahramon.",
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
                    "<p>Quyida berilgan atamalar va ularning izohi to’g’ri moslashtirilgan javobni toping.</p>"
                    "<div style='display:grid;grid-template-columns:repeat(auto-fit, minmax(240px, 1fr));gap:12px;margin:14px 0;'>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;'>"
                    "<b>I.</b> Domen<br/>"
                    "<b>II.</b> Dvoryanlar<br/>"
                    "<b>III.</b> Parlament<br/>"
                    "<b>IV.</b> Sherif"
                    "</div>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;'>"
                    "<b>a)</b> Qirol va feodallarning shaxsiy yer-mulklari<br/>"
                    "<b>b)</b> Feodallar toifasining imtiyozli qismi<br/>"
                    "<b>c)</b> Qonun chiqaruvchi vakillik organi<br/>"
                    "<b>d)</b> Angliyada grafliklarga tayinlangan qirol vakili"
                    "</div>"
                    "</div>"
                ),
                "explanation": "Domen — yer-mulk; Dvoryanlar — imtiyozli feodallar; Parlament — vakillik organi; Sherif — qirol vakili.",
                "options": [
                    ("A", "I-a, II-b, III-c, IV-d", True),
                    ("B", "I-b, II-a, III-c, IV-d", False),
                    ("C", "I-a, II-c, III-b, IV-d", False),
                    ("D", "I-a, II-b, III-d, IV-c", False),
                ],
            },
            # 7
            {
                "body": "<p>Tarixiy shaxsni aniqlang. 16 yoshli dehqon qizi, Orlean qizi deb atalgan, fransuzlarga g’alaba keltirgan, 1431-yilda gulxanda yondirilgan.</p>",
                "explanation": "Janna d’Ark — 16 yoshli qiz, Orlean qamali qahramoni, 1431-yilda inglizlar tomonidan Ruanda gulxanda yoqilgan.",
                "options": [
                    ("A", "Janna d’Ark", True),
                    ("B", "Izabella", False),
                    ("C", "Katarina", False),
                    ("D", "Margarita", False),
                ],
            },
            # 8
            {
                "body": "<p>Tarixiy shaxsni aniqlang. Normandiya gersogi. 1066-yilda Gastings jangida g’olib chiqib, Angliya taxtini egallagan.</p>",
                "explanation": "Vilgelm I (Fathkor Vilgelm) 1066-yilda Gastings jangida g'alaba qozonib Angliya taxtiga o'tirgan.",
                "options": [
                    ("A", "Vilgelm I", True),
                    ("B", "Genrix II", False),
                    ("C", "Ioann", False),
                    ("D", "Richard I", False),
                ],
            },
            # 9
            {
                "body": "<p>Tarixiy hodisani aniqlang. 1215-yilda qirol Ioann imzolashga majbur bo’lgan, baronlar va ruhoniylar manfaatini himoya qilgan hujjat.</p>",
                "explanation": "1215-yilda qirol Ioann Yersiz \"Buyuk ozodlik xartiyasi\" (Magna Charta)ni imzolagan.",
                "options": [
                    ("A", "”Buyuk ozodlik xartiyasi”", True),
                    ("B", "”Mayl End” dasturi", False),
                    ("C", "General shtatlar nizomi", False),
                    ("D", "”Rus haqiqati”", False),
                ],
            },
            # 10
            {
                "body": "<p>Tarixiy shaxsni aniqlang. 1381-yilgi Angliya dehqonlar qo’zg’oloni rahbari.</p>",
                "explanation": "1381-yilgi Angliya dehqonlar qo'zg'oloniga Uot Tayler boshchilik qilgan.",
                "options": [
                    ("A", "Uot Tayler", True),
                    ("B", "Jon Boll", False),
                    ("C", "Robin Gud", False),
                    ("D", "Gilyom Kal", False),
                ],
            },
            # 11
            {
                "body": (
                    "<p>Quyidagi janglardan qaysilari Yuz yillik urushga tegishli?</p>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;margin:12px 0;'>"
                    "1) Kresi jangi<br/>"
                    "2) Puate jangi<br/>"
                    "3) Azenkur jangi<br/>"
                    "4) Gastings jangi<br/>"
                    "5) Bosvort jangi<br/>"
                    "6) Kann jangi"
                    "</div>"
                ),
                "explanation": "Kresi (1346), Puate (1356), Azenkur (1415) Yuz yillik urushga tegishli. Gastings (1066), Bosvort (1485) boshqa davrlarga, Kann jangi Rim davriga oid.",
                "options": [
                    ("A", "1, 2, 3", True),
                    ("B", "4, 5, 6", False),
                    ("C", "1, 3, 5", False),
                    ("D", "2, 4, 6", False),
                ],
            },
            # 12
            {
                "body": "<p>Angliyada birinchi parlament qaysi yilda chaqirilgan?</p>",
                "explanation": "Angliyada birinchi parlament Simon de Monfor boshchiligida 1265-yilda chaqirilgan.",
                "options": [
                    ("A", "1265-yil", True),
                    ("B", "1215-yil", False),
                    ("C", "1337-yil", False),
                    ("D", "1381-yil", False),
                ],
            },
            # 13
            {
                "body": "<p>XIV-XV asrlar G’arbiy Yevropa uchun xos bo’lgan holatni aniqlang.</p>",
                "explanation": "XIV-XV asrlarda Fransiya va Angliyada feodal tarqoqlik tugatilib, markazlashgan milliy davlatlar shakllandi.",
                "options": [
                    ("A", "Fransiya va Angliyada markazlashgan davlatlar shakllandi", True),
                    ("B", "Yevropa yagona imperiya edi", False),
                    ("C", "Feodal tarqoqlik yanada kuchaydi", False),
                    ("D", "Yozuv umuman mavjud emas edi", False),
                ],
            },
            # 14
            {
                "body": (
                    "<p>Quyidagi qo’zg’olonlardan qaysilari o’rta asr Yevropasiga tegishli?</p>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;margin:12px 0;'>"
                    "1) Jakeriya<br/>"
                    "2) Uot Tayler qo’zg’oloni<br/>"
                    "3) Abu Muslim qo’zg’oloni<br/>"
                    "4) Muqanna qo’zg’oloni<br/>"
                    "5) Bobak qo’zg’oloni<br/>"
                    "6) Spartak qo’zg’oloni"
                    "</div>"
                ),
                "explanation": "Jakeriya (Fransiya) va Uot Tayler (Angliya) o'rta asr Yevropasiga tegishli. Qolganlari arab xalifaligi yoki Rim davriga oid.",
                "options": [
                    ("A", "1, 2", True),
                    ("B", "3, 4, 5", False),
                    ("C", "1, 3, 5", False),
                    ("D", "2, 4, 6", False),
                ],
            },
            # 15
            {
                "body": "<p>1086-yilda Vilgelm I o’tkazgan yer-mulk va aholi ro’yxati xalq orasida qanday nom olgan?</p>",
                "explanation": "1086-yildagi ro'yxatga olish hujjati xalq orasida \"Dahshatli sud kitobi\" (Domesday Book) deb atalgan.",
                "options": [
                    ("A", "”Dahshatli sud kitobi”", True),
                    ("B", "”Rus haqiqati”", False),
                    ("C", "”Sali haqiqati”", False),
                    ("D", "”Buyuk ozodlik xartiyasi”", False),
                ],
            },
            # 16
            {
                "body": (
                    "<p>Quyidagi voqealar to’g’ri xronologik ketma-ketlikda ko’rsatilgan javobni toping.</p>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;margin:12px 0;'>"
                    "1) Gastings jangi (1066)<br/>"
                    "2) ”Buyuk ozodlik xartiyasi” (1215)<br/>"
                    "3) Angliyada birinchi parlament (1265)<br/>"
                    "4) Yuz yillik urush boshlandi (1337)<br/>"
                    "5) Uot Tayler qo’zg’oloni (1381)<br/>"
                    "6) ”Qizil va oq gullar” urushi (1455)"
                    "</div>"
                ),
                "explanation": "Xronologik ketma-ketlik: 1066 -> 1215 -> 1265 -> 1337 -> 1381 -> 1455.",
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
                    "<p>Sxematik diagrammada Yuz yillik urushning uch muhim voqeasi ko’rsatilgan. 1–3 raqamlaridan qaysi biri Janna d’Arkning Orleanni ozod qilishiga to’g’ri keladi?</p>"
                    "<div style='display:flex;justify-content:center;margin:16px 0;'>"
                    "<div style='width:320px;border:2px solid #3b82f6;border-radius:12px;overflow:hidden;background:rgba(59,130,246,0.03);box-shadow:0 2px 10px rgba(0,0,0,0.05);'>"
                    "<div style='padding:12px 16px;border-bottom:1px solid #cbd5e1;display:flex;align-items:center;gap:12px;'>"
                    "<span style='background:#64748b;color:white;width:26px;height:26px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-weight:bold;font-size:13px;'>1</span>"
                    "<span style='font-weight:600;font-size:14px;color:#1e293b;'>1346-yil</span>"
                    "</div>"
                    "<div style='padding:12px 16px;border-bottom:1px solid #cbd5e1;display:flex;align-items:center;gap:12px;'>"
                    "<span style='background:#64748b;color:white;width:26px;height:26px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-weight:bold;font-size:13px;'>2</span>"
                    "<span style='font-weight:600;font-size:14px;color:#1e293b;'>1415-yil</span>"
                    "</div>"
                    "<div style='padding:12px 16px;display:flex;align-items:center;gap:12px;background:rgba(59,130,246,0.08);'>"
                    "<span style='background:#2563eb;color:white;width:26px;height:26px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-weight:bold;font-size:13px;'>3</span>"
                    "<span style='font-weight:600;font-size:14px;color:#1e40af;'>1429-yil</span>"
                    "</div>"
                    "</div>"
                    "</div>"
                ),
                "explanation": "1429-yilda (3-band) Janna d’Ark Orleanni ingliz qamalidan ozod qilgan.",
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
                    "<tr><td style='padding:6px;border:1px solid #cbd5e1;text-align:center;'>1</td><td style='padding:6px;border:1px solid #cbd5e1;'>Filipp IVning General shtatlarni chaqirishi (1302)</td><td style='padding:6px;border:1px solid #cbd5e1;'>Fransiyada toifaviy monarxiya shakllandi</td></tr>"
                    "<tr><td style='padding:6px;border:1px solid #cbd5e1;text-align:center;'>2</td><td style='padding:6px;border:1px solid #cbd5e1;'>Janna d’Arkning jasorati</td><td style='padding:6px;border:1px solid #cbd5e1;'>Fransuzlarning vatanparvarlik tuyg’usi kuchaydi</td></tr>"
                    "<tr><td style='padding:6px;border:1px solid #cbd5e1;text-align:center;'>3</td><td style='padding:6px;border:1px solid #cbd5e1;'>1215-yildagi voqealar</td><td style='padding:6px;border:1px solid #cbd5e1;'>Angliyada qirol hokimiyati cheklandi</td></tr>"
                    "<tr><td style='padding:6px;border:1px solid #cbd5e1;text-align:center;'>4</td><td style='padding:6px;border:1px solid #cbd5e1;'>Vilgelm I ning istilosi</td><td style='padding:6px;border:1px solid #cbd5e1;'>Angliyada feodal tarqoqlik yanada kuchaydi</td></tr>"
                    "<tr><td style='padding:6px;border:1px solid #cbd5e1;text-align:center;'>5</td><td style='padding:6px;border:1px solid #cbd5e1;'>Uot Tayler qo’zg’oloni</td><td style='padding:6px;border:1px solid #cbd5e1;'>Dehqonlar mehnat majburiyatidan voz kechildi</td></tr>"
                    "<tr><td style='padding:6px;border:1px solid #cbd5e1;text-align:center;'>6</td><td style='padding:6px;border:1px solid #cbd5e1;'>Bosvort jangi (1485)</td><td style='padding:6px;border:1px solid #cbd5e1;'>Fransiyada Valualar sulolasi boshlandi</td></tr>"
                    "</tbody>"
                    "</table>"
                ),
                "explanation": "4 xato: aksincha, Vilgelm markazlashgan kuchli qirol hokimiyatini o’rnatdi. 6 xato: Bosvort jangi Angliyada Tyudorlar sulolasini boshladi, Fransiyaga aloqasi yo’q.",
                "options": [
                    ("A", "1, 2, 3, 5", True),
                    ("B", "2, 4, 5, 6", False),
                    ("C", "1, 3, 4, 6", False),
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
                    "<th style='padding:8px;border:1px solid #cbd5e1;'>Fransiya voqeasi</th>"
                    "<th style='padding:8px;border:1px solid #cbd5e1;'>Angliya voqeasi</th>"
                    "</tr>"
                    "</thead>"
                    "<tbody>"
                    "<tr><td style='padding:8px;border:1px solid #cbd5e1;text-align:center;font-weight:bold;'>XIII asr</td><td style='padding:8px;border:1px solid #cbd5e1;text-align:center;font-weight:bold;color:#2563eb;'>a</td><td style='padding:8px;border:1px solid #cbd5e1;'>Birinchi parlament chaqirildi (1265)</td></tr>"
                    "<tr><td style='padding:8px;border:1px solid #cbd5e1;text-align:center;font-weight:bold;'>XV asr</td><td style='padding:8px;border:1px solid #cbd5e1;'>Yuz yillik urush yakunlandi (1453)</td><td style='padding:8px;border:1px solid #cbd5e1;text-align:center;font-weight:bold;color:#2563eb;'>b</td></tr>"
                    "</tbody>"
                    "</table>"
                    "<div style='font-size:12.5px;color:#475569;margin-top:8px;'>"
                    "<b>Ma’lumotlar:</b> 1) General shtatlar birinchi chaqirildi (1302); 2) Bosvort jangi (1485); 3) Rim imperiyasi qulashi (476); 4) Amir Temur tug’ildi (1336)."
                    "</div>"
                ),
                "explanation": "a=1: General shtatlar 1302-yilda (XIII asr oxiri/XIV asr boshi) chaqirildi. b=2: Bosvort jangi 1485-yilda (XV asr) bo’ldi.",
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
                    "<p>Quyida berilgan ma’lumotlarni tahlil qilib Eyler-Venn diagrammasiga mos keladigan javoblarni aniqlang. <i>(Fransiya va Angliya markazlashuvi)</i></p>"
                    "<div style='display:flex;justify-content:center;margin:16px 0;'>"
                    "<svg width='340' height='180' viewBox='0 0 340 180' style='max-width:100%;'>"
                    "<circle cx='120' cy='90' r='75' fill='rgba(59, 130, 246, 0.15)' stroke='#3b82f6' stroke-width='2'/>"
                    "<circle cx='220' cy='90' r='75' fill='rgba(16, 185, 129, 0.15)' stroke='#10b981' stroke-width='2'/>"
                    "<text x='85' y='75' font-size='16' font-weight='bold' fill='#1e40af' text-anchor='middle'>I</text>"
                    "<text x='85' y='95' font-size='12' fill='#1e3a8a' text-anchor='middle'>Fransiya</text>"
                    "<text x='170' y='85' font-size='16' font-weight='bold' fill='#4338ca' text-anchor='middle'>III</text>"
                    "<text x='255' y='75' font-size='16' font-weight='bold' fill='#065f46' text-anchor='middle'>II</text>"
                    "<text x='255' y='95' font-size='12' fill='#064e3b' text-anchor='middle'>Angliya</text>"
                    "</svg>"
                    "</div>"
                    "<div style='font-size:12.5px;color:#334155;line-height:1.7;background:rgba(100,116,139,0.05);padding:12px;border-radius:8px;border:1px solid #cbd5e1;'>"
                    "<b>a)</b> General shtatlar tashkil topdi;<br/>"
                    "<b>b)</b> Parlament tashkil topdi;<br/>"
                    "<b>c)</b> Markazlashgan davlat vujudga keldi;<br/>"
                    "<b>d)</b> Dehqonlar qo’zg’oloni bo’lib o’tdi (Jakeriya);<br/>"
                    "<b>e)</b> Dehqonlar qo’zg’oloni bo’lib o’tdi (Uot Tayler);<br/>"
                    "<b>f)</b> Yuz yillik urushda ishtirok etdi."
                    "</div>"
                ),
                "explanation": "I (faqat Fransiya): General shtatlar, Jakeriya. II (faqat Angliya): Parlament, Uot Tayler qo’zg’oloni. III (umumiy): markazlashgan davlat, Yuz yillik urush ishtiroki.",
                "options": [
                    ("A", "I-a,d; II-b,e; III-c,f", True),
                    ("B", "I-b,e; II-a,d; III-c,f", False),
                    ("C", "I-a,e; II-b,d; III-c,f", False),
                    ("D", "I-a,d; II-c,f; III-b,e", False),
                ],
            },
            # 21
            {
                "body": (
                    "<p>Quyidagi shaxslar va ularning ishlari to’g’ri moslashtirilgan javobni toping.</p>"
                    "<div style='display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:12px;margin:14px 0;'>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;'>"
                    "<b>1)</b> Bonifatsiy VIII<br/>"
                    "<b>2)</b> Dyugeklan<br/>"
                    "<b>3)</b> Karl V"
                    "</div>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;'>"
                    "<b>a)</b> Rim papasi, Filipp IV bilan ziddiyatga kirishgan<br/>"
                    "<b>b)</b> Harbiy islohotlar o’tkazgan Fransiya qiroli<br/>"
                    "<b>c)</b> Yagona qo’mondon, inglizlardan hududlarni ozod qilgan"
                    "</div>"
                    "</div>"
                ),
                "explanation": "1-a (Bonifatsiy VIII — Rim papasi), 2-c (Bertran Dyugeklan — fransuz qo'mondoni), 3-b (Karl V — harbiy islohotlar qiroli).",
                "options": [
                    ("A", "1-a; 2-c; 3-b", True),
                    ("B", "1-b; 2-a; 3-c", False),
                    ("C", "1-c; 2-a; 3-b", False),
                    ("D", "1-a; 2-b; 3-c", False),
                ],
            },
            # 22
            {
                "body": "<p>Fransiya qirolining muntazam yollanma qo’shin tuzishga imkon bergan, Angliyada joriy etilgan soliqni aniqlang.</p>",
                "explanation": "Angliyada feodallarning harbiy xizmati evaziga to'lanadigan \"Qalqon puli\" joriy etilib, uning hisobiga yollanma muntazam qo'shin tuzilgan.",
                "options": [
                    ("A", "”Qalqon puli”", True),
                    ("B", "Jizya", False),
                    ("C", "Xiroj", False),
                    ("D", "Tampliyerlar solig’i", False),
                ],
            },
            # 23
            {
                "body": "<p>1420-yilgi sulh shartnomasiga ko’ra, Angliya va Fransiya birlashgan qirollikning bo’lajak qiroli kim bo’lishi belgilangan edi?</p>",
                "explanation": "1420-yilgi Trua shartnomasiga ko'ra, Angliya qiroli Genrix V Fransiya malikasi Yekaterinaga uylanib, ularning bo'lajak o'g'li ikkala davlat qiroli bo'lishi belgilangan.",
                "options": [
                    ("A", "Angliya qiroli va Fransiya malikasidan tug’iladigan o’g’il", True),
                    ("B", "Faqat Angliya qiroli", False),
                    ("C", "Faqat Fransiya qiroli", False),
                    ("D", "Ikkala mamlakat alohida qirolga ega bo’lishi", False),
                ],
            },
            # 24
            {
                "body": (
                    "<p>Quyidagi shaharlardan qaysilari Germaniyaning yirik hunarmandchilik-savdo markazlari bo’lgan?</p>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;margin:12px 0;'>"
                    "1) Kyoln<br/>"
                    "2) Nyurnberg<br/>"
                    "3) Augsburg<br/>"
                    "4) Parij<br/>"
                    "5) London<br/>"
                    "6) Rim"
                    "</div>"
                ),
                "explanation": "Kyoln, Nyurnberg va Augsburg Germaniyaning yirik savdo-hunarmandchilik markazlari bo'lgan.",
                "options": [
                    ("A", "1, 2, 3", True),
                    ("B", "4, 5, 6", False),
                    ("C", "1, 3, 5", False),
                    ("D", "2, 4, 6", False),
                ],
            },
            # 25
            {
                "body": "<p>Fransiya markazlashuvi qaysi asr oxirida to’liq yakunlangan?</p>",
                "explanation": "Fransiyaning birlashishi va markazlashuvi Lyudovik XI davrida (XV asr oxirida) to'liq yakunlandi.",
                "options": [
                    ("A", "XV asr", True),
                    ("B", "XIII asr", False),
                    ("C", "XIV asr", False),
                    ("D", "XVI asr", False),
                ],
            },
            # 26
            {
                "body": "<p>Angliya taxtini 1485-yilda egallab, Tyudorlar sulolasiga asos solgan hukmdorni aniqlang.</p>",
                "explanation": "1485-yilda Bosvort jangida g'alaba qozongan Genrix VII Tyudorlar sulolasiga asos solgan.",
                "options": [
                    ("A", "Genrix VII", True),
                    ("B", "Genrix II", False),
                    ("C", "Richard II", False),
                    ("D", "Ioann", False),
                ],
            },
            # 27
            {
                "body": "<p>O’zaro muvofiqlik SAQLANMAGAN javobni toping.</p>",
                "explanation": "”Buyuk ozodlik xartiyasi”ni qirol Ioann imzolagan, Vilgelm I esa 1066-yilda Angliyani istilo qilgan.",
                "options": [
                    ("A", "Filipp IV — birinchi General shtatlarni chaqirgan", False),
                    ("B", "Karl VII — Janna d’Ark yordamida g’alaba qozongan", False),
                    ("C", "Vilgelm I — ”Buyuk ozodlik xartiyasi”ni imzolagan", True),
                    ("D", "Genrix VII — Tyudorlar sulolasiga asos solgan", False),
                ],
            },
            # 28
            {
                "body": "<p>Yuz yillik urush davomida qaysi mamlakatda qo’shinda erkin dehqonlardan tuzilgan kamonchilar bo’linmasi g’alaba omillaridan biri bo’lgan?</p>",
                "explanation": "Angliya qo'shinidagi erkin dehqonlardan tuzilgan uzoqqa otar mohir kamonchilar (longbow) inglizlarning ko'plab janglardagi g'alabasini ta'minlagan.",
                "options": [
                    ("A", "Angliya", True),
                    ("B", "Fransiya", False),
                    ("C", "Germaniya", False),
                    ("D", "Ispaniya", False),
                ],
            },
            # 29
            {
                "body": (
                    "<p>Quyida berilgan ma’lumotlarga mos yakuniy xulosalar (to’g’ri/noto’g’ri) keltirilgan javobni aniqlang.</p>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;margin:12px 0;'>"
                    "<b>I.</b> Yuz yillik urush yakunida Angliya ixtiyorida faqat Kale porti qoldi.<br/>"
                    "<b>II.</b> Jakeriya qo’zg’oloni g’alaba bilan yakunlanib, dehqonlar butunlay ozod bo’ldi.<br/>"
                    "<b>III.</b> Buyuk ozodlik xartiyasi 63 moddadan iborat edi."
                    "</div>"
                ),
                "explanation": "I to’g’ri. II noto’g’ri — qo’zg’olon mag’lubiyatga uchradi, Gilyom Kal boshchiligidagi qo’zg’olonchilar bostirildi. III to’g’ri (63 modda).",
                "options": [
                    ("A", "I-to’g’ri; II-noto’g’ri; III-to’g’ri", True),
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
                    "<b>1)</b> Uot Tayler<br/>"
                    "<b>2)</b> Jon Boll<br/>"
                    "<b>3)</b> Robin Gud"
                    "</div>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;'>"
                    "<b>a)</b> 1381-yilgi qo’zg’olon rahbari<br/>"
                    "<b>b)</b> Qo’zg’olon g’oyachisi<br/>"
                    "<b>c)</b> Afsonaviy xalq qahramoni"
                    "</div>"
                    "</div>"
                ),
                "explanation": "1-a (Uot Tayler — qo'zg'olon rahbari), 2-b (Jon Boll — g'oyachi ruhoniy), 3-c (Robin Gud — afsonaviy mergan qahramon).",
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
                    "<p>Voqealar va ularning sanalarini to’g’ri moslashtiring.</p>"
                    "<div style='display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:12px;margin:14px 0;'>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;'>"
                    "<b>1)</b> Kresi jangi<br/>"
                    "<b>2)</b> Azenkur jangi<br/>"
                    "<b>3)</b> Bosvort jangi"
                    "</div>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;'>"
                    "<b>a)</b> 1346-yil<br/>"
                    "<b>b)</b> 1415-yil<br/>"
                    "<b>c)</b> 1485-yil"
                    "</div>"
                    "</div>"
                ),
                "explanation": "1-a (Kresi — 1346), 2-b (Azenkur — 1415), 3-c (Bosvort — 1485).",
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
                    "<p>Quyidagi hujjatlardan qaysilari o’rta asr Angliyasiga tegishli?</p>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;margin:12px 0;'>"
                    "1) ”Buyuk ozodlik xartiyasi”<br/>"
                    "2) ”Mayl End” dasturi<br/>"
                    "3) ”Dahshatli sud kitobi”<br/>"
                    "4) ”Rus haqiqati”<br/>"
                    "5) ”Sali haqiqati”<br/>"
                    "6) ”Hidoya”"
                    "</div>"
                ),
                "explanation": "Buyuk ozodlik xartiyasi, Mayl End dasturi, Dahshatli sud kitobi Angliyaga tegishli.",
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
                    "<b>A)</b> General shtatlar birinchi chaqirilishi (1302)<br/>"
                    "<b>B)</b> Gastings jangi (1066)<br/>"
                    "<b>C)</b> ”Buyuk ozodlik xartiyasi” imzolanishi (1215)<br/>"
                    "<b>D)</b> Yuz yillik urush yakunlanishi (1453)<br/>"
                    "<b>E)</b> Bosvort jangi (1485)<br/>"
                    "<b>F)</b> Uot Tayler qo’zg’oloni (1381)"
                    "</div>"
                    "<p><b>Berilgan voqealardan qaysi biri eng avval sodir bo’lgan?</b></p>"
                ),
                "explanation": "1066-yil — ro’yxatdagi eng qadimgi sana (Gastings jangi).",
                "options": [
                    ("A", "General shtatlar birinchi chaqirilishi (1302)", False),
                    ("B", "Gastings jangi (1066)", True),
                    ("C", "”Buyuk ozodlik xartiyasi” imzolanishi (1215)", False),
                    ("D", "Yuz yillik urush yakunlanishi (1453)", False),
                    ("E", "Bosvort jangi (1485)", False),
                    ("F", "Uot Tayler qo’zg’oloni (1381)", False),
                ],
            },
            # 34 (BANK)
            {
                "body": (
                    "<div style='border:1px solid #3b82f6;border-radius:10px;padding:12px;background:rgba(59,130,246,0.05);margin-bottom:14px;font-size:13px;line-height:1.7;'>"
                    "<b>33–35-topshiriqlarga mos javoblarni quyidagi banklardan (A–F) tanlang:</b><br/>"
                    "<b>A)</b> General shtatlar birinchi chaqirilishi (1302)<br/>"
                    "<b>B)</b> Gastings jangi (1066)<br/>"
                    "<b>C)</b> ”Buyuk ozodlik xartiyasi” imzolanishi (1215)<br/>"
                    "<b>D)</b> Yuz yillik urush yakunlanishi (1453)<br/>"
                    "<b>E)</b> Bosvort jangi (1485)<br/>"
                    "<b>F)</b> Uot Tayler qo’zg’oloni (1381)"
                    "</div>"
                    "<p><b>Angliyada qirol hokimiyatini birinchi bo’lib huquqiy jihatdan cheklagan voqeani aniqlang.</b></p>"
                ),
                "explanation": "”Buyuk ozodlik xartiyasi” 1215-yilda qirol hokimiyatini birinchi bo'lib qonuniy jihatdan cheklagan.",
                "options": [
                    ("A", "General shtatlar birinchi chaqirilishi (1302)", False),
                    ("B", "Gastings jangi (1066)", False),
                    ("C", "”Buyuk ozodlik xartiyasi” imzolanishi (1215)", True),
                    ("D", "Yuz yillik urush yakunlanishi (1453)", False),
                    ("E", "Bosvort jangi (1485)", False),
                    ("F", "Uot Tayler qo’zg’oloni (1381)", False),
                ],
            },
            # 35 (BANK)
            {
                "body": (
                    "<div style='border:1px solid #3b82f6;border-radius:10px;padding:12px;background:rgba(59,130,246,0.05);margin-bottom:14px;font-size:13px;line-height:1.7;'>"
                    "<b>33–35-topshiriqlarga mos javoblarni quyidagi banklardan (A–F) tanlang:</b><br/>"
                    "<b>A)</b> General shtatlar birinchi chaqirilishi (1302)<br/>"
                    "<b>B)</b> Gastings jangi (1066)<br/>"
                    "<b>C)</b> ”Buyuk ozodlik xartiyasi” imzolanishi (1215)<br/>"
                    "<b>D)</b> Yuz yillik urush yakunlanishi (1453)<br/>"
                    "<b>E)</b> Bosvort jangi (1485)<br/>"
                    "<b>F)</b> Uot Tayler qo’zg’oloni (1381)"
                    "</div>"
                    "<p><b>Berilgan voqealardan qaysi biri eng keyin sodir bo’lgan?</b></p>"
                ),
                "explanation": "1485-yil — ro’yxatdagi eng so’nggi sana (Bosvort jangi).",
                "options": [
                    ("A", "General shtatlar birinchi chaqirilishi (1302)", False),
                    ("B", "Gastings jangi (1066)", False),
                    ("C", "”Buyuk ozodlik xartiyasi” imzolanishi (1215)", False),
                    ("D", "Yuz yillik urush yakunlanishi (1453)", False),
                    ("E", "Bosvort jangi (1485)", True),
                    ("F", "Uot Tayler qo’zg’oloni (1381)", False),
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
                "title": "Fransiyada markazlashuv.",
                "parts": [
                    ("a", "Qirol shaxsiy yer-mulklarini yozing.", "Domen (Qirol domeni)"),
                    ("b", "Birinchi bo’lib cherkovdan soliq talab qilgan qirolni yozing.", "Filipp IV (Filipp 4 / Filipp Chiroyli)"),
                ],
                "explanation": "a) Domen; b) Filipp IV.",
            },
            # 37
            {
                "title": "General shtatlar.",
                "parts": [
                    ("a", "Birinchi General shtatlar chaqirilgan yilni yozing.", "1302-yil (1302)"),
                    ("b", "Uchta toifani yozing.", "Ruhoniylar, dvoryanlar, shaharliklar (Ruhoniy, dvoryan, shahar aholisi)"),
                ],
                "explanation": "a) 1302-yil; b) Ruhoniylar, dvoryanlar, shaharliklar.",
            },
            # 38
            {
                "title": "Yuz yillik urush.",
                "parts": [
                    ("a", "Urush qaysi yillar oralig’ida bo’lganini yozing.", "1337-1453-yillar (1337-1453)"),
                    ("b", "Dastlabki yirik jangni yozing.", "Kresi jangi (1346 / Kresi)"),
                ],
                "explanation": "a) 1337-1453-yillar; b) Kresi jangi (1346).",
            },
            # 39
            {
                "title": "Jakeriya qo’zg’oloni.",
                "parts": [
                    ("a", "Qo’zg’olon boshlangan yilni yozing.", "1358-yil (1358)"),
                    ("b", "Qo’zg’olon rahbarini yozing.", "Gilyom Kal (Gilyom Cale)"),
                ],
                "explanation": "a) 1358-yil; b) Gilyom Kal.",
            },
            # 40
            {
                "title": "Janna d’Ark.",
                "parts": [
                    ("a", "U qaysi shaharni ozod qilganini yozing.", "Orlean (Orlean shahri)"),
                    ("b", "U vafot etgan yil va shaharni yozing.", "1431-yil, Ruan (1431, Ruan / 1431-yil Ruan / 1431 Ruan)"),
                ],
                "explanation": "a) Orlean; b) 1431-yil, Ruan.",
            },
            # 41
            {
                "title": "Normand istilosi.",
                "parts": [
                    ("a", "1066-yilgi jangni yozing.", "Gastings jangi (Gastings)"),
                    ("b", "G’olib chiqqan Normandiya gersogini yozing.", "Vilgelm I (Vilgelm / Fathkor Vilgelm / Vilgelm 1)"),
                ],
                "explanation": "a) Gastings jangi; b) Vilgelm I.",
            },
            # 42
            {
                "title": "Buyuk ozodlik xartiyasi.",
                "parts": [
                    ("a", "Hujjatni imzolagan qirolni yozing.", "Ioann (Ioann Yersiz / Qirol Ioann)"),
                    ("b", "Imzolangan yilni yozing.", "1215-yil (1215)"),
                ],
                "explanation": "a) Ioann; b) 1215-yil.",
            },
            # 43
            {
                "title": "Angliya parlamenti.",
                "parts": [
                    ("a", "Birinchi parlament chaqirilgan yilni yozing.", "1265-yil (1265)"),
                    ("b", "Parlament qaysi ikki palataga bo’linganini yozing.", "Lordlar palatasi va umumpalata (Lordlar va jamoalar palatasi / Lordlar palatasi, vakillar palatasi)"),
                ],
                "explanation": "a) 1265-yil; b) Lordlar palatasi va umumpalata.",
            },
            # 44
            {
                "title": "Uot Tayler qo’zg’oloni.",
                "parts": [
                    ("a", "Qo’zg’olon boshlangan yilni yozing.", "1381-yil (1381)"),
                    ("b", "Qo’zg’olon g’oyachisini yozing.", "Jon Boll"),
                ],
                "explanation": "a) 1381-yil; b) Jon Boll.",
            },
            # 45
            {
                "title": "Angliya XV asrda.",
                "parts": [
                    ("a", "”Qizil va oq gullar” urushi qatnashchi ikki xonadonni yozing.", "Lankasterlar va Yorklar (Lankaster, York / Lankasterlar, Yorklar)"),
                    ("b", "Urushdan keyin taxtga kelgan sulolani yozing.", "Tyudorlar (Tyudorlar sulolasi / Tyudor)"),
                ],
                "explanation": "a) Lankasterlar va Yorklar; b) Tyudorlar.",
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
