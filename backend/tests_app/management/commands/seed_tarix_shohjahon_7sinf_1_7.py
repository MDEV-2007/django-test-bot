"""Django management command: Sodiqov Shohjahon ustozning 7-sinf Jahon Tarixi Milliy Sertifikat mock testini yaratish.

1–7-mavzular: German qabilalari-Rim, Franklar davlati-imperiyasi, Britaniyadan Angliyaga, Muqaddas Rim imperiyasi, Vizantiya, Slavyanlar.
35 ta test topshirig'i (A, B, C, D) va 10 ta yozma (ochiq) savol. Jami: 45 ta topshiriq.

Muallif/O'qituvchi: shohjahon (Sodiqov Shohjahon, @TarixMilliyCertificate)

Foydalanish:
    python manage.py seed_tarix_shohjahon_7sinf_1_7
    python manage.py seed_tarix_shohjahon_7sinf_1_7 --force
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from django.contrib.auth.models import User

from accounts.models import Profile, ensure_profile_for_user
from tests_app.models import Subject, TestSet, Question, AnswerOption, SubQuestion


MOCK_TITLE = "7-sinf Jahon Tarixi — Milliy Sertifikat (1–7-mavzular) | Shohjahon"
MOCK_DESC = (
    "1–7-mavzular: German qabilalari-Rim, Franklar davlati-imperiyasi, Britaniyadan Angliyaga, "
    "Muqaddas Rim imperiyasi, Vizantiya, Slavyanlar. "
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
                        f"Qayta yuklash uchun: python manage.py seed_tarix_shohjahon_7sinf_1_7 --force"
                    )
                )
                return

        # ── 4. TestSet yaratish ─────────────────────────────────────────────
        test_set = TestSet.objects.create(
            title=MOCK_TITLE,
            description=MOCK_DESC,
            subject=subject,
            category="certificate",  # Milliy Sertifikat
            duration_minutes=80,
            is_published=True,
            is_premium=False,
            is_live_mock=False,
            created_by=teacher_user,
        )
        self.stdout.write(f"TestSet yaratildi: '{test_set.title}' (ID: {test_set.id})")

        questions = []

        # ── 5. I VA II QISM: 1 - 35 TEST SAVOLLARI ──────────────────────────
        mcq_data = [
            # 1
            {
                "body": "<p>Quyidagilardan nomuvofiqlik saqlangan javobni aniqlang.</p>",
                "explanation": "Otton I Germaniya (Muqaddas Rim imperiyasi) hukmdori bo’lgan, Vizantiyaga aloqasi yo’q.",
                "options": [
                    ("A", "Xlodvig — 486-yilda franklar davlatiga asos solgan", False),
                    ("B", "Buyuk Karl — 800-yilda imperator toji kiygan", False),
                    ("C", "Otton I — Vizantiya imperatori", True),
                    ("D", "Genrix I — 919-yilda Germaniya qiroli bo’lgan", False),
                ],
            },
            # 2
            {
                "body": (
                    "<p>Quyidagi hukmdorlar va ular bilan bog’liq ma’lumotlar mos ravishda berilgan javobni aniqlang.</p>"
                    "<div style='display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:12px;margin:14px 0;'>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;'>"
                    "<b>1)</b> Xlodvig<br/>"
                    "<b>2)</b> Buyuk Karl<br/>"
                    "<b>3)</b> Buyuk Alfred<br/>"
                    "<b>4)</b> Otton I"
                    "</div>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;'>"
                    "<b>a)</b> 486-yilda franklar davlatiga asos solgan<br/>"
                    "<b>b)</b> 800-yilda imperator toji kiygan<br/>"
                    "<b>c)</b> 879-yilda daniyaliklar bilan sulh tuzgan<br/>"
                    "<b>d)</b> 962-yilda Muqaddas Rim imperiyasiga asos solgan"
                    "</div>"
                    "</div>"
                ),
                "explanation": "Xlodvig (486) — a; Buyuk Karl (800) — b; Buyuk Alfred (879) — c; Otton I (962) — d.",
                "options": [
                    ("A", "1-a; 2-b; 3-c; 4-d", True),
                    ("B", "1-b; 2-a; 3-d; 4-c", False),
                    ("C", "1-a; 2-c; 3-b; 4-d", False),
                    ("D", "1-c; 2-a; 3-b; 4-d", False),
                ],
            },
            # 3
            {
                "body": "<p>Rimliklar madaniy taraqqiyotning quyi bosqichidagi xalqlarni qanday atashgan?</p>",
                "explanation": "Rimliklar madaniy taraqqiyotning quyi bosqichidagi xalqlarni varvarlar deb atashgan.",
                "options": [
                    ("A", "Varvarlar", True),
                    ("B", "Barbarlar", False),
                    ("C", "Vandallar", False),
                    ("D", "Gotlar", False),
                ],
            },
            # 4
            {
                "body": (
                    "<p>Quyidagi voqealar to’g’ri xronologik ketma-ketlikda ko’rsatilgan javobni toping.</p>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;margin:12px 0;'>"
                    "1) G’arbiy Rim imperiyasi qulashi (476)<br/>"
                    "2) Xlodvig franklar davlatiga asos soldi (486)<br/>"
                    "3) Buyuk Karl imperator toji kiydi (800)<br/>"
                    "4) Verden shartnomasi (843)<br/>"
                    "5) Genrix I Germaniya qiroli bo’ldi (919)<br/>"
                    "6) Muqaddas Rim imperiyasi tashkil topdi (962)"
                    "</div>"
                ),
                "explanation": "Xronologik ketma-ketlik: 476 -> 486 -> 800 -> 843 -> 919 -> 962.",
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
                    "<b>I.</b> Senyor<br/>"
                    "<b>II.</b> Vassal<br/>"
                    "<b>III.</b> Benefitsiy<br/>"
                    "<b>IV.</b> Allod<br/>"
                    "<b>V.</b> Graf"
                    "</div>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;'>"
                    "<b>a)</b> Qaram dehqonlarga ega bo’lgan yer egasi<br/>"
                    "<b>b)</b> Senyorga bo’ysunuvchi feodal<br/>"
                    "<b>c)</b> Harbiy xizmat evaziga in’om etilgan yer-mulk<br/>"
                    "<b>d)</b> Avloddan-avlodga meros bo’lib o’tadigan xususiy yer<br/>"
                    "<b>e)</b> Qirol tayinlagan viloyat amaldori"
                    "</div>"
                    "</div>"
                ),
                "explanation": "Senyor — yer egasi; Vassal — bo’ysunuvchi feodal; Benefitsiy — xizmat yeri; Allod — meros yer; Graf — qirol amaldori.",
                "options": [
                    ("A", "I-a, II-b, III-c, IV-d, V-e", True),
                    ("B", "I-b, II-a, III-c, IV-e, V-d", False),
                    ("C", "I-a, II-c, III-b, IV-d, V-e", False),
                    ("D", "I-a, II-b, III-d, IV-c, V-e", False),
                ],
            },
            # 6
            {
                "body": (
                    "<p>Quyida berilgan Vizantiya atamalari va ularning izohi to’g’ri moslashtirilgan javobni toping.</p>"
                    "<div style='display:grid;grid-template-columns:repeat(auto-fit, minmax(240px, 1fr));gap:12px;margin:14px 0;'>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;'>"
                    "<b>I.</b> Vasilevs<br/>"
                    "<b>II.</b> Sinklit<br/>"
                    "<b>III.</b> Numisma<br/>"
                    "<b>IV.</b> Romeylar"
                    "</div>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;'>"
                    "<b>a)</b> Yunoncha ”podsho”, imperator<br/>"
                    "<b>b)</b> Maslahat organi (lotincha ”senat”)<br/>"
                    "<b>c)</b> Vizantiya oltin puli<br/>"
                    "<b>d)</b> Vizantiya fuqarolarining o’zlariga bergan nomi"
                    "</div>"
                    "</div>"
                ),
                "explanation": "Vasilevs — imperator; Sinklit — senat; Numisma — oltin pul; Romeylar — vizantiyaliklarning o’z nomi.",
                "options": [
                    ("A", "I-a, II-b, III-c, IV-d", True),
                    ("B", "I-b, II-a, III-c, IV-d", False),
                    ("C", "I-a, II-c, III-b, IV-d", False),
                    ("D", "I-a, II-b, III-d, IV-c", False),
                ],
            },
            # 7
            {
                "body": "<p>Tarixiy shaxsni aniqlang. Buyuk Karlning jiyani. 778-yilda Ispaniyaga yurishda halok bo’lgan, keyinchalik doston qahramoniga aylangan.</p>",
                "explanation": "Roland — Buyuk Karlning jiyani, 778-yilda Ispaniyaga yurishda qahramonlarcha halok bo’lgan, 'Roland haqida doston' bosh qahramoni.",
                "options": [
                    ("A", "Roland", True),
                    ("B", "Xlodvig", False),
                    ("C", "Otton", False),
                    ("D", "Genrix", False),
                ],
            },
            # 8
            {
                "body": "<p>Tarixiy shaxsni aniqlang. VI asr boshida brittlarni birlashtirib, angl-sakslarga qarshi g’alaba qozongan so’nggi rimlik. Uning obrazi asosida afsonaviy qirol shakllangan.</p>",
                "explanation": "Amvrosiy Avrelian — VI asr boshida brittlarni birlashtirgan so'nggi rimlik sarkarda, uning timsoli asosida Qirol Artur afsonasi shakllangan.",
                "options": [
                    ("A", "Amvrosiy Avrelian", True),
                    ("B", "Buyuk Alfred", False),
                    ("C", "Xlodvig", False),
                    ("D", "Genrix I", False),
                ],
            },
            # 9
            {
                "body": "<p>Tarixiy hodisani aniqlang. 843-yilda tuzilgan, Franklar imperiyasini uchga bo’lgan shartnoma.</p>",
                "explanation": "Verden shartnomasi 843-yilda Buyuk Karlning uch nabirasi o'rtasida tuzilgan va imperiyani uchga bo'lgan.",
                "options": [
                    ("A", "Verden shartnomasi", True),
                    ("B", "Vestfaliya sulhi", False),
                    ("C", "Parij sulhi", False),
                    ("D", "London shartnomasi", False),
                ],
            },
            # 10
            {
                "body": "<p>Tarixiy shaxsni aniqlang. Yustinian I ning rafiqasi, yoshligida aktrisa bo’lgan, aqli va shuhratparastligi bilan mashhur bo’lgan malika.</p>",
                "explanation": "Feodora — imperator Yustinian I ning aql-idrokli, qat'iyatli va ta'sirchan rafiqasi.",
                "options": [
                    ("A", "Feodora", True),
                    ("B", "Feodosiya", False),
                    ("C", "Irina", False),
                    ("D", "Zoya", False),
                ],
            },
            # 11
            {
                "body": (
                    "<p>Quyidagi qabilalardan qaysilari german qabilalariga tegishli?</p>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;margin:12px 0;'>"
                    "1) Franklar<br/>"
                    "2) Vestgotlar<br/>"
                    "3) Vandallar<br/>"
                    "4) Slavyanlar<br/>"
                    "5) Skotlar<br/>"
                    "6) Ostgotlar"
                    "</div>"
                ),
                "explanation": "Slavyanlar va skotlar german qabilalariga kirmaydi. Franklar, vestgotlar, vandallar, ostgotlar — german qabilalari.",
                "options": [
                    ("A", "1, 2, 3, 6", True),
                    ("B", "1, 4, 5, 6", False),
                    ("C", "2, 3, 4, 5", False),
                    ("D", "1, 2, 4, 5", False),
                ],
            },
            # 12
            {
                "body": "<p>Otliq, jangovar ot va qurol-aslahaga ega bo’lgan zodagon jangchilar qanday atalgan (nemischa)?</p>",
                "explanation": "Ritsarlar — nemischa 'ritter' (otliq) so'zidan kelib chiqqan zodagon jangchilar.",
                "options": [
                    ("A", "Ritsarlar", True),
                    ("B", "Vassallar", False),
                    ("C", "Grafliklar", False),
                    ("D", "Legionerlar", False),
                ],
            },
            # 13
            {
                "body": "<p>V-VI asrlar Yevropa uchun xos bo’lgan holatni aniqlang.</p>",
                "explanation": "V-VI asrlarda G'arbiy Rim imperiyasi yerlarida german qabilalari o'zlarining yangi davlatlarini (varvar qirolliklarini) tuzgan.",
                "options": [
                    ("A", "German qabilalari Rim imperiyasi yerlarida yangi davlatlar tuzgan", True),
                    ("B", "Yevropa yagona markazlashgan davlat edi", False),
                    ("C", "German qabilalari o’troq turmush tarzini butunlay tark etgan", False),
                    ("D", "Yozuv umuman mavjud emas edi", False),
                ],
            },
            # 14
            {
                "body": (
                    "<p>Quyidagi shaxslardan qaysilari Angliya tarixiga tegishli?</p>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;margin:12px 0;'>"
                    "1) Buyuk Alfred<br/>"
                    "2) Amvrosiy Avrelian<br/>"
                    "3) Qirol Artur<br/>"
                    "4) Otton I<br/>"
                    "5) Yustinian I<br/>"
                    "6) Genrix I"
                    "</div>"
                ),
                "explanation": "Otton I va Genrix I Germaniyaga, Yustinian I Vizantiyaga tegishli. Buyuk Alfred, Amvrosiy Avrelian va Qirol Artur Angliya tarixiga oid.",
                "options": [
                    ("A", "1, 2, 3", True),
                    ("B", "4, 5, 6", False),
                    ("C", "1, 3, 5", False),
                    ("D", "2, 4, 6", False),
                ],
            },
            # 15
            {
                "body": "<p>Vizantiya imperiyasi qaysi yilda Rim imperiyasidan ajralib chiqqan?</p>",
                "explanation": "395-yilda imperator Feodosiy Rim imperiyasini ikki o'g'liga bo'lib berishi natijasida Sharqiy Rim (Vizantiya) ajralib chiqqan.",
                "options": [
                    ("A", "395-yil", True),
                    ("B", "476-yil", False),
                    ("C", "486-yil", False),
                    ("D", "800-yil", False),
                ],
            },
            # 16
            {
                "body": (
                    "<p>Quyidagi voqealar to’g’ri xronologik ketma-ketlikda ko’rsatilgan javobni toping.</p>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;margin:12px 0;'>"
                    "1) Rim imperiyasi ikkiga bo’lindi (395)<br/>"
                    "2) G’arbiy Rim imperiyasi qulashi (476)<br/>"
                    "3) Xlodvig franklar davlatiga asos soldi (486)<br/>"
                    "4) Yustinian I hukmronligi boshlandi (527)<br/>"
                    "5) Buyuk Karl imperator bo’ldi (800)<br/>"
                    "6) Muqaddas Rim imperiyasi tashkil topdi (962)"
                    "</div>"
                ),
                "explanation": "To'g'ri xronologik tartib: 395 -> 476 -> 486 -> 527 -> 800 -> 962.",
                "options": [
                    ("A", "1, 2, 3, 4, 5, 6", True),
                    ("B", "2, 1, 3, 4, 5, 6", False),
                    ("C", "1, 3, 2, 4, 5, 6", False),
                    ("D", "1, 2, 4, 3, 5, 6", False),
                ],
            },
            # 17 (DIAGRAM)
            {
                "body": (
                    "<p>Sxematik diagrammada 395-yildan keyingi Rim imperiyasining ikki qismi ko’rsatilgan. 1 va 2 raqamlaridan qaysi biri Sharqiy Rim (Vizantiya)ni bildiradi?</p>"
                    "<div style='display:flex;justify-content:center;gap:20px;margin:16px 0;font-family:sans-serif;flex-wrap:wrap;'>"
                    "<div style='border:2px solid #94a3b8;border-radius:12px;padding:16px;width:180px;text-align:center;background:#f8fafc;box-shadow:0 2px 8px rgba(0,0,0,0.05);'>"
                    "<div style='background:#64748b;color:white;width:28px;height:28px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-weight:bold;margin-bottom:8px;'>1</div>"
                    "<div style='font-size:13px;color:#475569;margin-bottom:4px;'>Poytaxti: <b>Rim</b></div>"
                    "<div style='font-size:12px;color:#dc2626;font-weight:bold;margin-bottom:8px;'>476-yilda qulagan</div>"
                    "<div style='font-weight:bold;font-size:14px;border-top:1px solid #cbd5e1;padding-top:6px;color:#1e293b;'>G’ARBIY RIM</div>"
                    "</div>"
                    "<div style='border:2px solid #3b82f6;border-radius:12px;padding:16px;width:180px;text-align:center;background:#eff6ff;box-shadow:0 2px 8px rgba(59,130,246,0.1);'>"
                    "<div style='background:#2563eb;color:white;width:28px;height:28px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-weight:bold;margin-bottom:8px;'>2</div>"
                    "<div style='font-size:13px;color:#1e40af;margin-bottom:4px;'>Poytaxti: <b>Konstantinopol</b></div>"
                    "<div style='font-size:12px;color:#16a34a;font-weight:bold;margin-bottom:8px;'>1453-yilgacha mavjud</div>"
                    "<div style='font-weight:bold;font-size:14px;border-top:1px solid #bfdbfe;padding-top:6px;color:#1e3a8a;'>SHARQIY RIM</div>"
                    "</div>"
                    "</div>"
                ),
                "explanation": "Sharqiy Rim imperiyasi (Vizantiya) poytaxti Konstantinopol bo’lgan va 1453-yilgacha mavjud bo’lgan (2-band).",
                "options": [
                    ("A", "2", True),
                    ("B", "1", False),
                    ("C", "Ikkalasi ham", False),
                    ("D", "Hech biri", False),
                ],
            },
            # 18 (TABLE)
            {
                "body": (
                    "<p>Tarixiy voqea va uning natijasi o’zaro to’g’ri mos berilgan qatorlarni aniqlang.</p>"
                    "<table style='width:100%;border-collapse:collapse;margin:12px 0;font-size:13px;'>"
                    "<thead>"
                    "<tr style='background:#f1f5f9;border-bottom:2px solid #cbd5e1;'>"
                    "<th style='padding:8px;border:1px solid #cbd5e1;text-align:center;width:40px;'>№</th>"
                    "<th style='padding:8px;border:1px solid #cbd5e1;text-align:left;'>Voqea</th>"
                    "<th style='padding:8px;border:1px solid #cbd5e1;text-align:left;'>Natija</th>"
                    "</tr>"
                    "</thead>"
                    "<tbody>"
                    "<tr><td style='padding:6px;border:1px solid #cbd5e1;text-align:center;'>1</td><td style='padding:6px;border:1px solid #cbd5e1;'>Xlodvigning xristianlikni qabul qilishi</td><td style='padding:6px;border:1px solid #cbd5e1;'>Gall yepiskopligi qirolni qo’llab-quvvatladi</td></tr>"
                    "<tr><td style='padding:6px;border:1px solid #cbd5e1;text-align:center;'>2</td><td style='padding:6px;border:1px solid #cbd5e1;'>Buyuk Karlning sakslarga qarshi urushi</td><td style='padding:6px;border:1px solid #cbd5e1;'>Sakslar o’z dinini butunlay saqlab qoldi</td></tr>"
                    "<tr><td style='padding:6px;border:1px solid #cbd5e1;text-align:center;'>3</td><td style='padding:6px;border:1px solid #cbd5e1;'>Verden shartnomasi (843)</td><td style='padding:6px;border:1px solid #cbd5e1;'>Fransiya, Germaniya, Italiya davlatlari asosi qo’yildi</td></tr>"
                    "<tr><td style='padding:6px;border:1px solid #cbd5e1;text-align:center;'>4</td><td style='padding:6px;border:1px solid #cbd5e1;'>Alfredning daniyaliklar bilan sulhi</td><td style='padding:6px;border:1px solid #cbd5e1;'>Butun orol Alfredga o’tdi</td></tr>"
                    "<tr><td style='padding:6px;border:1px solid #cbd5e1;text-align:center;'>5</td><td style='padding:6px;border:1px solid #cbd5e1;'>Otton I ning vengerlar ustidan g’alabasi</td><td style='padding:6px;border:1px solid #cbd5e1;'>Vengerlarning Germaniyaga bosqinlari to’xtadi</td></tr>"
                    "<tr><td style='padding:6px;border:1px solid #cbd5e1;text-align:center;'>6</td><td style='padding:6px;border:1px solid #cbd5e1;'>Yustinian I ning Shimoliy Afrikaga yurishi</td><td style='padding:6px;border:1px solid #cbd5e1;'>Vandallar qirolligi bo’ysundirildi</td></tr>"
                    "</tbody>"
                    "</table>"
                ),
                "explanation": "2 xato: aksincha, sakslar xristianlikka o’tkazildi. 4 xato: orol ikkiga bo’lindi, faqat janubi Alfredga tegdi.",
                "options": [
                    ("A", "1, 3, 5, 6", True),
                    ("B", "2, 3, 4, 6", False),
                    ("C", "1, 2, 4, 5", False),
                    ("D", "3, 4, 5, 6", False),
                ],
            },
            # 19 (TIMELINE / ASLAR)
            {
                "body": (
                    "<p>Jadvalda harflar bilan belgilangan o’rinlarga mos keluvchi ma’lumotni toping.</p>"
                    "<table style='width:100%;border-collapse:collapse;margin:12px 0;font-size:13px;'>"
                    "<thead>"
                    "<tr style='background:#f1f5f9;border-bottom:2px solid #cbd5e1;'>"
                    "<th style='padding:8px;border:1px solid #cbd5e1;width:90px;text-align:center;'>Asr</th>"
                    "<th style='padding:8px;border:1px solid #cbd5e1;'>G’arbiy Yevropa voqeasi</th>"
                    "<th style='padding:8px;border:1px solid #cbd5e1;'>Sharqiy voqea</th>"
                    "</tr>"
                    "</thead>"
                    "<tbody>"
                    "<tr><td style='padding:8px;border:1px solid #cbd5e1;text-align:center;font-weight:bold;'>VIII asr</td><td style='padding:8px;border:1px solid #cbd5e1;'>Buyuk Karl imperator bo’ldi (800)</td><td style='padding:8px;border:1px solid #cbd5e1;text-align:center;font-weight:bold;color:#2563eb;'>a</td></tr>"
                    "<tr><td style='padding:8px;border:1px solid #cbd5e1;text-align:center;font-weight:bold;'>X asr</td><td style='padding:8px;border:1px solid #cbd5e1;text-align:center;font-weight:bold;color:#2563eb;'>b</td><td style='padding:8px;border:1px solid #cbd5e1;'>Vizantiya feodal munosabatlari kuchaydi</td></tr>"
                    "</tbody>"
                    "</table>"
                    "<p style='font-size:12px;color:#475569;'><b>Ma’lumotlar:</b> 1) Abbosiylar sulolasi hokimiyatga keldi (750); 2) Otton I imperator bo’ldi (962); 3) Rim imperiyasi qulashi (476); 4) Amir Temur tug’ildi (1336).</p>"
                ),
                "explanation": "a=1: Abbosiylar 750-yilda (VIII asr) hokimiyatga keldi. b=2: Otton I 962-yilda (X asr) imperator bo’ldi.",
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
                    "<p>Quyida berilgan ma’lumotlarni tahlil qilib Eyler-Venn diagrammasiga mos keladigan javoblarni aniqlang. <i>(Buyuk Karl va Otton I)</i></p>"
                    "<div style='display:flex;justify-content:center;margin:16px 0;'>"
                    "<svg width='340' height='180' viewBox='0 0 340 180' style='max-width:100%;'>"
                    "<circle cx='120' cy='90' r='75' fill='rgba(59, 130, 246, 0.15)' stroke='#3b82f6' stroke-width='2'/>"
                    "<circle cx='220' cy='90' r='75' fill='rgba(16, 185, 129, 0.15)' stroke='#10b981' stroke-width='2'/>"
                    "<text x='85' y='75' font-size='16' font-weight='bold' fill='#1e40af' text-anchor='middle'>I</text>"
                    "<text x='85' y='95' font-size='12' fill='#1e3a8a' text-anchor='middle'>Buyuk Karl</text>"
                    "<text x='170' y='85' font-size='16' font-weight='bold' fill='#4338ca' text-anchor='middle'>III</text>"
                    "<text x='255' y='75' font-size='16' font-weight='bold' fill='#065f46' text-anchor='middle'>II</text>"
                    "<text x='255' y='95' font-size='12' fill='#064e3b' text-anchor='middle'>Otton I</text>"
                    "</svg>"
                    "</div>"
                    "<div style='font-size:12.5px;color:#334155;line-height:1.7;background:#f8fafc;padding:12px;border-radius:8px;border:1px solid #e2e8f0;'>"
                    "<b>a)</b> Frank hukmdori bo’lgan;<br/>"
                    "<b>b)</b> Germaniya hukmdori bo’lgan;<br/>"
                    "<b>c)</b> Rim papasi tomonidan imperator toji kiydirilgan;<br/>"
                    "<b>d)</b> Vengerlarga qarshi kurashgan;<br/>"
                    "<b>e)</b> Sakslarga qarshi kurashgan;<br/>"
                    "<b>f)</b> Muqaddas Rim imperiyasiga asos solgan."
                    "</div>"
                ),
                "explanation": "I (faqat Karl): frank hukmdori, sakslarga qarshi kurash. II (faqat Otton): Germaniya hukmdori, vengerlarga qarshi, Muqaddas Rim imperiyasi asoschisi. III (umumiy): Rim papasi tojlagan.",
                "options": [
                    ("A", "I-a,e; II-b,d,f; III-c", True),
                    ("B", "I-b,d; II-a,e,f; III-c", False),
                    ("C", "I-a,d; II-b,e,f; III-c", False),
                    ("D", "I-a,e; II-b,f; III-c,d", False),
                ],
            },
            # 21
            {
                "body": (
                    "<p>Quyidagi shaxslar va ularning ishlarini to’g’ri moslashtiring.</p>"
                    "<div style='display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:12px;margin:14px 0;'>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;'>"
                    "<b>1)</b> Velisariy<br/>"
                    "<b>2)</b> Feodosiy<br/>"
                    "<b>3)</b> Ioann XII"
                    "</div>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;'>"
                    "<b>a)</b> Rim imperiyasini ikkiga bo’lgan imperator<br/>"
                    "<b>b)</b> Otton I ga imperator tojini kiydirgan papa<br/>"
                    "<b>c)</b> Yustinian I yuborgan sarkarda"
                    "</div>"
                    "</div>"
                ),
                "explanation": "1-c (Velisariy — Yustinian I sarkardasi), 2-a (Feodosiy — Rimni ikkiga bo'lgan imperator), 3-b (Ioann XII — Otton I ga toj kiygan papa).",
                "options": [
                    ("A", "1-c; 2-a; 3-b", True),
                    ("B", "1-a; 2-c; 3-b", False),
                    ("C", "1-b; 2-a; 3-c", False),
                    ("D", "1-c; 2-b; 3-a", False),
                ],
            },
            # 22
            {
                "body": "<p>Slavyanlarda xalq yig’ini qanday atalgan?</p>",
                "explanation": "Slavyanlarda qabila va xalq yig'ini Veche deb atalgan.",
                "options": [
                    ("A", "Veche", True),
                    ("B", "Sinklit", False),
                    ("C", "Vitan", False),
                    ("D", "Kortes", False),
                ],
            },
            # 23
            {
                "body": "<p>G’arbiy slavyanlarga qaysi xalqlar kiradi?</p>",
                "explanation": "G’arbiy slavyanlar: chexlar, polyaklar, slovaklar. Janubiy: bolgarlar, serblar, xorvatlar. Sharqiy: ruslar, ukrainlar, beloruslar.",
                "options": [
                    ("A", "Cheхlar, polyaklar, slovaklar", True),
                    ("B", "Bolgarlar, serblar, xorvatlar", False),
                    ("C", "Ruslar, ukrainlar, beloruslar", False),
                    ("D", "Danlar, shvedlar, norveglar", False),
                ],
            },
            # 24
            {
                "body": (
                    "<p>Quyidagi xalqlardan qaysilari janubiy slavyanlarga tegishli?</p>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;margin:12px 0;'>"
                    "1) Bolgarlar<br/>"
                    "2) Serblar<br/>"
                    "3) Xorvatlar<br/>"
                    "4) Cheхlar<br/>"
                    "5) Polyaklar<br/>"
                    "6) Ruslar"
                    "</div>"
                ),
                "explanation": "Bolgarlar, serblar, xorvatlar — janubiy slavyanlar. Chexlar va polyaklar g’arbiy, ruslar sharqiy slavyanlarga kiradi.",
                "options": [
                    ("A", "1, 2, 3", True),
                    ("B", "4, 5, 6", False),
                    ("C", "1, 3, 5", False),
                    ("D", "2, 4, 6", False),
                ],
            },
            # 25
            {
                "body": "<p>Angliyaga bostirib kelgan german qabilalaridan qaysi biri birinchi bo’lib Kent viloyatini bosib olgan?</p>",
                "explanation": "V asr o'rtalarida german qabilalaridan yutlar birinchi bo'lib Britaniyaning Kent viloyatini egallashgan.",
                "options": [
                    ("A", "Yutlar", True),
                    ("B", "Angllar", False),
                    ("C", "Sakslar", False),
                    ("D", "Danlar", False),
                ],
            },
            # 26
            {
                "body": "<p>Britaniyaning asosiy mahalliy aholisi bo’lgan kelt qabilalarini ayting.</p>",
                "explanation": "Britaniyaning mahalliy kelt aholisi brittlar deb atalgan.",
                "options": [
                    ("A", "Brittlar", True),
                    ("B", "Frizlar", False),
                    ("C", "Longobardlar", False),
                    ("D", "Alemannlar", False),
                ],
            },
            # 27
            {
                "body": "<p>O’zaro muvofiqlik SAQLANMAGAN javobni toping.</p>",
                "explanation": "Muqaddas Rim imperiyasiga Buyuk Karl emas, Otton I asos solgan (962-yil).",
                "options": [
                    ("A", "Xlodvig — franklar davlatiga asos solgan", False),
                    ("B", "Buyuk Karl — Muqaddas Rim imperiyasiga asos solgan", True),
                    ("C", "Otton I — 962-yilda imperator bo’lgan", False),
                    ("D", "Yustinian I — Vizantiyaning ”oltin asri” hukmdori", False),
                ],
            },
            # 28
            {
                "body": "<p>”Anglosakson solnomasi” qaysi qirol davrida tuzilgan?</p>",
                "explanation": "Anglosakson solnomasi IX asr oxirida Buyuk Alfred topshirig'i bilan tuzila boshlagan.",
                "options": [
                    ("A", "Buyuk Alfred", True),
                    ("B", "Genrix I", False),
                    ("C", "Otton I", False),
                    ("D", "Xlodvig", False),
                ],
            },
            # 29
            {
                "body": (
                    "<p>Quyida berilgan ma’lumotlarga mos yakuniy xulosalar (to’g’ri/noto’g’ri) keltirilgan javobni aniqlang.</p>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;margin:12px 0;'>"
                    "<b>I.</b> Franklar davlatida ritsarlar qo’shini Buyuk Karl davrida vujudga kelgan.<br/>"
                    "<b>II.</b> Vizantiya imperiyasida davlat tili sifatida lotin tili yunon tilini surib chiqargan.<br/>"
                    "<b>III.</b> Otton I Germaniyadagi yepiskop va abbatlarga ko’plab huquq va imtiyozlar bergan."
                    "</div>"
                ),
                "explanation": "I to’g’ri. II noto’g’ri — aksincha, yunon tili lotin tilini surib chiqardi. III to’g’ri.",
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
                    "<b>1)</b> Xlodvig<br/>"
                    "<b>2)</b> Buyuk Karl<br/>"
                    "<b>3)</b> Otton I"
                    "</div>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;'>"
                    "<b>a)</b> 486-yilda franklar davlatiga asos solgan<br/>"
                    "<b>b)</b> 800-yilda imperator toji kiygan<br/>"
                    "<b>c)</b> 962-yilda Muqaddas Rim imperiyasiga asos solgan"
                    "</div>"
                    "</div>"
                ),
                "explanation": "Xlodvig (486) — a; Buyuk Karl (800) — b; Otton I (962) — c.",
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
                    "<p>Davlatlar va ularning poytaxtlarini to’g’ri moslashtiring.</p>"
                    "<div style='display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:12px;margin:14px 0;'>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;'>"
                    "<b>1)</b> Franklar davlati (dastlab)<br/>"
                    "<b>2)</b> Vizantiya<br/>"
                    "<b>3)</b> Germaniya qirolligi"
                    "</div>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;'>"
                    "<b>a)</b> Doimiy poytaxt yo’q edi<br/>"
                    "<b>b)</b> Konstantinopol<br/>"
                    "<b>c)</b> Turli shaharlar (doimiy poytaxt yo’q)"
                    "</div>"
                    "</div>"
                ),
                "explanation": "Franklar dastlab doimiy poytaxtga ega bo'lmagan; Vizantiya poytaxti — Konstantinopol; Germaniyada qirollar turli shaharlarda turgan.",
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
                    "<p>Quyidagi shaharlardan qaysilari Vizantiyaning yirik savdo-hunarmandchilik markazlari bo’lgan?</p>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;margin:12px 0;'>"
                    "1) Konstantinopol<br/>"
                    "2) Aleksandriya<br/>"
                    "3) Antioxiya<br/>"
                    "4) Parij<br/>"
                    "5) London<br/>"
                    "6) Rim"
                    "</div>"
                ),
                "explanation": "Konstantinopol, Aleksandriya va Antioxiya Vizantiya imperiyasining eng yirik savdo va hunarmandchilik markazlari edi.",
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
                    "<b>A)</b> G’arbiy Rim imperiyasining qulashi (476)<br/>"
                    "<b>B)</b> Xlodvigning franklar davlatiga asos solishi (486)<br/>"
                    "<b>C)</b> Verden shartnomasi (843)<br/>"
                    "<b>D)</b> Genrix I ning Germaniya qiroli bo’lishi (919)<br/>"
                    "<b>E)</b> Otton I ning imperator bo’lishi (962)<br/>"
                    "<b>F)</b> Yustinian I hukmronligining boshlanishi (527)"
                    "</div>"
                    "<p><b>Berilgan voqealardan qaysi biri eng avval sodir bo’lgan?</b></p>"
                ),
                "explanation": "476-yil — ro’yxatdagi eng qadimgi sana (G'arbiy Rim imperiyasining qulashi).",
                "options": [
                    ("A", "G’arbiy Rim imperiyasining qulashi (476)", True),
                    ("B", "Xlodvigning franklar davlatiga asos solishi (486)", False),
                    ("C", "Verden shartnomasi (843)", False),
                    ("D", "Genrix I ning Germaniya qiroli bo’lishi (919)", False),
                ],
            },
            # 34 (BANK)
            {
                "body": (
                    "<div style='border:1px solid #3b82f6;border-radius:10px;padding:12px;background:rgba(59,130,246,0.05);margin-bottom:14px;font-size:13px;line-height:1.7;'>"
                    "<b>33–35-topshiriqlarga mos javoblarni quyidagi banklardan (A–F) tanlang:</b><br/>"
                    "<b>A)</b> G’arbiy Rim imperiyasining qulashi (476)<br/>"
                    "<b>B)</b> Xlodvigning franklar davlatiga asos solishi (486)<br/>"
                    "<b>C)</b> Verden shartnomasi (843)<br/>"
                    "<b>D)</b> Genrix I ning Germaniya qiroli bo’lishi (919)<br/>"
                    "<b>E)</b> Otton I ning imperator bo’lishi (962)<br/>"
                    "<b>F)</b> Yustinian I hukmronligining boshlanishi (527)"
                    "</div>"
                    "<p><b>Muqaddas Rim imperiyasining tashkil topishiga bevosita olib kelgan voqeani aniqlang.</b></p>"
                ),
                "explanation": "Otton I 962-yilda imperator bo’lib, Muqaddas Rim imperiyasiga asos solgan.",
                "options": [
                    ("A", "Otton I ning imperator bo’lishi (962)", True),
                    ("B", "Verden shartnomasi (843)", False),
                    ("C", "Genrix I ning Germaniya qiroli bo’lishi (919)", False),
                    ("D", "Xlodvigning franklar davlatiga asos solishi (486)", False),
                ],
            },
            # 35 (BANK)
            {
                "body": (
                    "<div style='border:1px solid #3b82f6;border-radius:10px;padding:12px;background:rgba(59,130,246,0.05);margin-bottom:14px;font-size:13px;line-height:1.7;'>"
                    "<b>33–35-topshiriqlarga mos javoblarni quyidagi banklardan (A–F) tanlang:</b><br/>"
                    "<b>A)</b> G’arbiy Rim imperiyasining qulashi (476)<br/>"
                    "<b>B)</b> Xlodvigning franklar davlatiga asos solishi (486)<br/>"
                    "<b>C)</b> Verden shartnomasi (843)<br/>"
                    "<b>D)</b> Genrix I ning Germaniya qiroli bo’lishi (919)<br/>"
                    "<b>E)</b> Otton I ning imperator bo’lishi (962)<br/>"
                    "<b>F)</b> Yustinian I hukmronligining boshlanishi (527)"
                    "</div>"
                    "<p><b>Berilgan voqealardan qaysi biri eng keyin sodir bo’lgan?</b></p>"
                ),
                "explanation": "962-yil — ro’yxatdagi eng so’nggi sana (Otton I ning imperator bo'lishi).",
                "options": [
                    ("A", "Otton I ning imperator bo’lishi (962)", True),
                    ("B", "Genrix I ning Germaniya qiroli bo’lishi (919)", False),
                    ("C", "Verden shartnomasi (843)", False),
                    ("D", "Yustinian I hukmronligining boshlanishi (527)", False),
                ],
            },
        ]

        for i, item in enumerate(mcq_data, start=1):
            q = Question.objects.create(
                body=item["body"],
                question_type="mcq",
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
            self.stdout.write(f"  [{i:02d}] MCQ qo'shildi: {item['body'][:50]}...")

        # ── 6. III QISM: YOZMA (OCHIQ) SAVOLLAR (36 - 45) ────────────────────
        open_data = [
            # 36
            {
                "title": "German qabilalari.",
                "parts": [
                    ("a", "”Xalqlarning buyuk ko’chishlari”ga boshchilik qilgan xalqni yozing.", "Hunnlar"),
                    ("b", "German qabilalarida qabila boshlig’ini yozing.", "Konung"),
                ],
                "explanation": "a) Hunnlar (Hunlar); b) Konung.",
            },
            # 37
            {
                "title": "Franklar davlati.",
                "parts": [
                    ("a", "Franklar davlatiga asos solgan shaxsni yozing.", "Xlodvig"),
                    ("b", "Bu voqea qaysi yilda sodir bo’lganini yozing.", "486-yil"),
                ],
                "explanation": "a) Xlodvig; b) 486-yil.",
            },
            # 38
            {
                "title": "Buyuk Karl.",
                "parts": [
                    ("a", "Uning hukmronlik yillarini yozing.", "768-814-yillar"),
                    ("b", "U imperator toji kiygan yilni yozing.", "800-yil"),
                ],
                "explanation": "a) 768-814-yillar; b) 800-yil.",
            },
            # 39
            {
                "title": "Franklar imperiyasining bo’linishi.",
                "parts": [
                    ("a", "Imperiya uchga bo’lingan shartnomani yozing.", "Verden shartnomasi (843)"),
                    ("b", "Bo’linishdan keyin tashkil topgan uch davlatni yozing.", "Fransiya, Germaniya, Italiya"),
                ],
                "explanation": "a) Verden shartnomasi (843); b) Fransiya, Germaniya, Italiya.",
            },
            # 40
            {
                "title": "Angliya tarixi.",
                "parts": [
                    ("a", "Daniyaliklarni mag’lub etgan Uesseks qirolini yozing.", "Buyuk Alfred"),
                    ("b", "U tuzdirgan tarixiy yilnomani yozing.", "”Anglosakson solnomasi”"),
                ],
                "explanation": "a) Buyuk Alfred; b) Anglosakson solnomasi.",
            },
            # 41
            {
                "title": "Germaniya qirolligi.",
                "parts": [
                    ("a", "919-yilda Germaniya qiroli bo’lgan shaxsni yozing.", "Genrix I"),
                    ("b", "955-yilda vengerlarni mag’lub etgan qirolni yozing.", "Otton I"),
                ],
                "explanation": "a) Genrix I; b) Otton I.",
            },
            # 42
            {
                "title": "Muqaddas Rim imperiyasi.",
                "parts": [
                    ("a", "Imperiya tashkil topgan yilni yozing.", "962-yil"),
                    ("b", "Otton I ga imperator tojini kiydirgan papani yozing.", "Ioann XII"),
                ],
                "explanation": "a) 962-yil; b) Ioann XII.",
            },
            # 43
            {
                "title": "Vizantiya imperiyasi.",
                "parts": [
                    ("a", "Rim imperiyasi ikkiga bo’lingan yilni yozing.", "395-yil"),
                    ("b", "Buni amalga oshirgan imperatorni yozing.", "Feodosiy"),
                ],
                "explanation": "a) 395-yil; b) Feodosiy.",
            },
            # 44
            {
                "title": "Yustinian I.",
                "parts": [
                    ("a", "Uning hukmronlik yillarini yozing.", "527-565-yillar"),
                    ("b", "Uning rafiqasini yozing.", "Feodora"),
                ],
                "explanation": "a) 527-565-yillar; b) Feodora.",
            },
            # 45
            {
                "title": "Slavyanlar.",
                "parts": [
                    ("a", "Slavyanlarning uch guruhini yozing.", "G’arbiy, janubiy, sharqiy slavyanlar"),
                    ("b", "Sharqiy slavyanlarni tashkil etgan xalqlarni yozing.", "Ruslar, ukrainlar, beloruslar"),
                ],
                "explanation": "a) G’arbiy, janubiy, sharqiy slavyanlar; b) Ruslar, ukrainlar, beloruslar.",
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
