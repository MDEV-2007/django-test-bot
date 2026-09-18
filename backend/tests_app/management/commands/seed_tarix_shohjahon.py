"""Django management command: Sodiqov Shohjahon ustozning 6-sinf Qadimgi Dunyo Tarixi Milliy Sertifikat mock testini yaratish.

41–44-mavzular (yakuniy blok): Qullar va gladiatorlar, Rim respublikasining qulashi,
G'arbiy Rim imperiyasining tanazzuli, Qadimgi Rim madaniyati.
35 ta test topshirig'i (A, B, C, D) va 10 ta yozma (ochiq) savol. Jami: 45 ta topshiriq.

Muallif/O'qituvchi: shohjahon (Sodiqov Shohjahon, @TarixMilliyCertificate)

Foydalanish:
    python manage.py seed_tarix_shohjahon
    python manage.py seed_tarix_shohjahon --force
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from django.contrib.auth.models import User

from accounts.models import Profile, ensure_profile_for_user
from tests_app.models import Subject, TestSet, Question, AnswerOption, SubQuestion


MOCK_TITLE = "6-sinf Qadimgi Dunyo Tarixi — Milliy Sertifikat (41–44-mavzular) | Shohjahon"
MOCK_DESC = (
    "41–44-mavzular (yakuniy blok): Qullar va gladiatorlar, Rim respublikasining qulashi, "
    "G'arbiy Rim imperiyasining tanazzuli, Qadimgi Rim madaniyati. "
    "35 ta test topshirig'i (A, B, C, D) va 10 ta yozma (ochiq) savol. Jami: 45 ta topshiriq. "
    "Ustoz: Sodiqov Shohjahon (@TarixMilliyCertificate)."
)


class Command(BaseCommand):
    help = "Sodiqov Shohjahon ustoz nomidan 6-sinf Qadimgi Dunyo Tarixi 45 talik Milliy Sertifikat testini yuklaydi."

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
                        f"Qayta yuklash uchun: python manage.py seed_tarix_shohjahon --force"
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
                "explanation": "Rim imperiyasiga asos solgan birinchi imperator Oktavian (Avgust) bo'lgan, Brut esa Sezarga qarshi fitna uyushtirgan.",
                "options": [
                    ("A", "Spartak — mil.avv. 74-71-yillardagi qullar qo'zg'oloni boshlig'i", False),
                    ("B", "Mark Krass — Spartak qo'zg'olonini bostirgan sarkarda", False),
                    ("C", "Brut — Rim imperiyasiga asos solgan birinchi imperator", True),
                    ("D", "Yuliy Sezar — mil.avv. 44-yilda fitna natijasida o'ldirilgan", False),
                ],
            },
            # 2
            {
                "body": (
                    "<p>Quyidagi shaxslar va ular bilan bog'liq ma'lumotlar mos ravishda berilgan javobni aniqlang.</p>"
                    "<div style='display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:12px;margin:14px 0;'>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.7;'>"
                    "<b>1)</b> Spartak<br/>"
                    "<b>2)</b> Yuliy Sezar<br/>"
                    "<b>3)</b> Oktavian<br/>"
                    "<b>4)</b> Trayan"
                    "</div>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.7;'>"
                    "<b>a)</b> Mil.avv. 49-yilda Rubikondan o'tib hokimiyatni egalladi<br/>"
                    "<b>b)</b> Milodiy 98-yilda imperator bo'ldi, «oltin asr»ga nom bergan<br/>"
                    "<b>c)</b> Frakiyalik qul, qullar qo'zg'oloniga boshchilik qilgan<br/>"
                    "<b>d)</b> Mil.avv. 29-yilda «Avgust» unvonini oldi"
                    "</div>"
                    "</div>"
                ),
                "explanation": "1-c (Spartak — qullar qo'zg'oloni), 2-a (Sezar — Rubikon, mil.avv. 49), 3-d (Oktavian — Avgust unvoni, mil.avv. 29), 4-b (Trayan — oltin asr, milodiy 98).",
                "options": [
                    ("A", "1-c; 2-a; 3-d; 4-b", True),
                    ("B", "1-a; 2-c; 3-b; 4-d", False),
                    ("C", "1-c; 2-b; 3-a; 4-d", False),
                    ("D", "1-b; 2-a; 3-d; 4-c", False),
                ],
            },
            # 3
            {
                "body": "<p>Rimning eng katta amfiteatri, 50 ming tomoshabin sig'adigan inshootni aniqlang.</p>",
                "explanation": "Kolizey — milodiy I asrda qurilgan, 50 minggacha tomoshabin sig'dirgan Rimning eng muhtasham amfiteatridir.",
                "options": [
                    ("A", "Kolizey", True),
                    ("B", "Panteon", False),
                    ("C", "Forum", False),
                    ("D", "Akveduk", False),
                ],
            },
            # 4
            {
                "body": (
                    "<p>Quyidagi voqealar to'g'ri xronologik ketma-ketlikda ko'rsatilgan javobni toping.</p>"
                    "<div style='padding:12px;border:1px solid #cbd5e1;border-radius:8px;background:rgba(100,116,139,0.05);line-height:1.8;font-size:13.5px;margin:12px 0;'>"
                    "1) Spartak qo'zg'oloni boshlandi (mil.avv. 74)<br/>"
                    "2) Yuliy Sezar Rubikondan o'tdi (mil.avv. 49)<br/>"
                    "3) Sezar o'ldirildi (mil.avv. 44)<br/>"
                    "4) Oktavian Antoniyni mag'lub etdi (mil.avv. 31)<br/>"
                    "5) Oktavian imperator unvonini oldi (mil.avv. 29)<br/>"
                    "6) Trayan imperator bo'ldi (milodiy 98)"
                    "</div>"
                ),
                "explanation": "Xronologik tartib: 74-yil (1) → 49-yil (2) → 44-yil (3) → 31-yil (4) → 29-yil (5) → milodiy 98-yil (6).",
                "options": [
                    ("A", "1, 2, 3, 4, 5, 6", True),
                    ("B", "2, 1, 3, 4, 5, 6", False),
                    ("C", "1, 2, 4, 3, 5, 6", False),
                    ("D", "1, 3, 2, 4, 5, 6", False),
                ],
            },
            # 5
            {
                "body": (
                    "<p>Quyida berilgan shaxslar va ular bilan bog'liq voqealar to'g'ri moslashtirilgan javobni toping.</p>"
                    "<div style='display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:12px;margin:14px 0;'>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.7;'>"
                    "<b>I</b> Konstantin<br/>"
                    "<b>II</b> Alarix<br/>"
                    "<b>III</b> Attila<br/>"
                    "<b>IV</b> Odoakr"
                    "</div>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.7;'>"
                    "<b>a</b> Milodiy 330-yilda Konstantinopolni poytaxt qildi<br/>"
                    "<b>b</b> Milodiy 410-yilda Rimni bosib olib talagan gotlar sardori<br/>"
                    "<b>c</b> Milodiy 452-yilda Italiyaga bostirib kirgan xunnlar sardori<br/>"
                    "<b>d</b> Milodiy 476-yilda G'arbiy Rim imperiyasiga barham bergan<br/>"
                    "<b>e</b> Rim imperiyasini G'arbiy va Sharqiyga bo'lgan imperator"
                    "</div>"
                    "</div>"
                ),
                "explanation": "Konstantin — Konstantinopol (a); Alarix — gotlar, 410-yil (b); Attila — xunnlar, 452-yil (c); Odoakr — 476-yil, imperiya qulashi (d).",
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
                    "<p>Quyida berilgan Rim tarixchilari va ularning asarlari to'g'ri moslashtirilgan javobni toping.</p>"
                    "<div style='display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:12px;margin:14px 0;'>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.7;'>"
                    "<b>I</b> Tit Liviy<br/>"
                    "<b>II</b> Plutarx<br/>"
                    "<b>III</b> Kvint Kursiy Ruf"
                    "</div>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.7;'>"
                    "<b>a</b> «Rim tarixi»<br/>"
                    "<b>b</b> Yunon-rim sarkardalari hayoti haqida asar<br/>"
                    "<b>c</b> «Makedoniyalik Aleksandr tarixi»"
                    "</div>"
                    "</div>"
                ),
                "explanation": "Tit Liviy — «Rim tarixi»; Plutarx — sarkardalar hayoti; Kvint Kursiy Ruf — Aleksandr haqida.",
                "options": [
                    ("A", "I-a, II-b, III-c", True),
                    ("B", "I-b, II-a, III-c", False),
                    ("C", "I-c, II-b, III-a", False),
                    ("D", "I-a, II-c, III-b", False),
                ],
            },
            # 7
            {
                "body": (
                    "<p>Tarixiy shaxsni aniqlang. Frakiyalik qul, gladiator. "
                    "Mil.avv. 74-71-yillarda eng yirik qullar qo'zg'oloniga boshchilik qildi, "
                    "Vezuviy tog'ida qarorgoh qurdi.</p>"
                ),
                "explanation": "Spartak — Frakiyalik gladiator, mil.avv. 74-71-yillardagi mashhur qo'zg'olon rahbari.",
                "options": [
                    ("A", "Spartak", True),
                    ("B", "Brut", False),
                    ("C", "Odoakr", False),
                    ("D", "Alarix", False),
                ],
            },
            # 8
            {
                "body": (
                    "<p>Tarixiy shaxsni aniqlang. Mil.avv. 49-yilda Rubikon daryosidan o'tib, "
                    "«Qur'a tashlandi!» degan, keyinchalik Rim diktatori bo'lgan sarkarda.</p>"
                ),
                "explanation": "Yuliy Sezar — mil.avv. 49-yilda Rubikondan o'tib hokimiyatni egallagan va Rim diktatoriga aylangan.",
                "options": [
                    ("A", "Yuliy Sezar", True),
                    ("B", "Oktavian", False),
                    ("C", "Mark Krass", False),
                    ("D", "Pompey", False),
                ],
            },
            # 9
            {
                "body": (
                    "<p>Tarixiy voqeani aniqlang. Milodiy 476-yilda german sarkardasi Odoakr "
                    "so'nggi Rim imperatorini taxtdan ag'darib, bu davlatga barham berdi.</p>"
                ),
                "explanation": "Milodiy 476-yilda Odoakr Rim imperatori Romul Avgustulni taxtdan ag'darishi bilan G'arbiy Rim imperiyasi butunlay quladi.",
                "options": [
                    ("A", "G'arbiy Rim imperiyasining qulashi", True),
                    ("B", "Rim respublikasining e'lon qilinishi", False),
                    ("C", "Rim imperiyasining bo'linishi", False),
                    ("D", "Spartak qo'zg'oloni", False),
                ],
            },
            # 10
            {
                "body": (
                    "<p>Tarixiy shaxsni aniqlang. Falastinning Vifleem shahrida tug'ilgan, "
                    "«Xudoning o'g'li» deb e'tiqod qilingan, izdoshlari xristianlar deb atalgan payg'ambar.</p>"
                ),
                "explanation": "Iso Masih — Vifleemda tug'ilgan, xristianlik diniga asos solgan payg'ambar.",
                "options": [
                    ("A", "Iso Masih", True),
                    ("B", "Pontiy Pilat", False),
                    ("C", "Konstantin", False),
                    ("D", "Zardusht", False),
                ],
            },
            # 11
            {
                "body": (
                    "<p>Quyidagi shaxslardan qaysilari G'arbiy Rim imperiyasining qulashi bilan bog'liq?</p>"
                    "<div style='padding:10px;border:1px solid #cbd5e1;border-radius:8px;background:rgba(100,116,139,0.05);line-height:1.7;font-size:13.5px;margin:10px 0;'>"
                    "1) Alarix<br/>"
                    "2) Attila<br/>"
                    "3) Odoakr<br/>"
                    "4) Trayan<br/>"
                    "5) Spartak<br/>"
                    "6) Konstantin"
                    "</div>"
                ),
                "explanation": "Alarix (410-yil Rimni talagan), Attila (452-yil Italiyaga yurish qilgan), Odoakr (476-yil imperiyani tugatgan), Konstantin (330-yil poytaxtni ko'chirgan) Rim imperiyasi inqirozi va qulashi bilan bevosita bog'liq.",
                "options": [
                    ("A", "1, 2, 3, 6", True),
                    ("B", "1, 4, 5, 6", False),
                    ("C", "2, 3, 4, 5", False),
                    ("D", "1, 2, 4, 5", False),
                ],
            },
            # 12
            {
                "body": "<p>Rim imperiyasi G'arbiy va Sharqiy qismlarga qaysi yilda bo'lindi?</p>",
                "explanation": "Milodiy 395-yilda imperator Feodosiy vafotidan so'ng Rim imperiyasi G'arbiy va Sharqiy (Vizantiya) qismlarga bo'linib ketdi.",
                "options": [
                    ("A", "Milodiy 395-yil", True),
                    ("B", "Milodiy 330-yil", False),
                    ("C", "Milodiy 410-yil", False),
                    ("D", "Milodiy 476-yil", False),
                ],
            },
            # 13
            {
                "body": "<p>Milodiy III-V asrlar Rim imperiyasi uchun xos bo'lgan holatni aniqlang.</p>",
                "explanation": "III-V asrlarda Rim imperiyasi ichki inqiroz va varvar qabilalari (gotlar, vandallar, xunnlar)ning uzluksiz hujumlari tufayli zaiflashib, qulab bordi.",
                "options": [
                    ("A", "Imperiya «varvar» qabilalari hujumlari ostida zaiflashib, qulab bordi", True),
                    ("B", "Imperiya hech qanday tashqi tahdidga duch kelmadi", False),
                    ("C", "Imperiya yanada kengaydi va mustahkamlandi", False),
                    ("D", "Rimda yozuv birinchi marta paydo bo'ldi", False),
                ],
            },
            # 14
            {
                "body": (
                    "<p>Quyidagi qabilalardan qaysilari Rimga bostirib kirgan «varvar» xalqlarga tegishli?</p>"
                    "<div style='padding:10px;border:1px solid #cbd5e1;border-radius:8px;background:rgba(100,116,139,0.05);line-height:1.7;font-size:13.5px;margin:10px 0;'>"
                    "1) Gotlar<br/>"
                    "2) Xunnlar<br/>"
                    "3) Vandallar<br/>"
                    "4) Saklar<br/>"
                    "5) Massagetlar<br/>"
                    "6) Germanlar"
                    "</div>"
                ),
                "explanation": "Saklar va massagetlar O'rta Osiyo ko'chmanchi xalqlari bo'lib, Rimga bostirib kirmagan. Gotlar, xunnlar, vandallar va germanlar Rimga hujum qilgan.",
                "options": [
                    ("A", "1, 2, 3, 6", True),
                    ("B", "1, 4, 5, 6", False),
                    ("C", "2, 3, 4, 5", False),
                    ("D", "1, 2, 4, 5", False),
                ],
            },
            # 15
            {
                "body": "<p>Rimda barcha xudolarga bag'ishlangan mashhur gumbazli ibodatxonani aniqlang.</p>",
                "explanation": "Panteon — «barcha xudolar ibodatxonasi» bo'lib, o'zining ulkan gumbazi bilan mashhur qadimgi me'moriy obidadir.",
                "options": [
                    ("A", "Panteon", True),
                    ("B", "Kolizey", False),
                    ("C", "Forum", False),
                    ("D", "Akveduk", False),
                ],
            },
            # 16
            {
                "body": (
                    "<p>Quyidagi voqealar to'g'ri xronologik ketma-ketlikda ko'rsatilgan javobni toping.</p>"
                    "<div style='padding:12px;border:1px solid #cbd5e1;border-radius:8px;background:rgba(100,116,139,0.05);line-height:1.8;font-size:13.5px;margin:12px 0;'>"
                    "1) Konstantinopol poytaxt bo'ldi (330)<br/>"
                    "2) Rim imperiyasi bo'lindi (395)<br/>"
                    "3) Alarix Rimni taladi (410)<br/>"
                    "4) Attila Italiyaga bostirib kirdi (452)<br/>"
                    "5) Vandallar Rimni taladi (455)<br/>"
                    "6) G'arbiy Rim imperiyasi quladi (476)"
                    "</div>"
                ),
                "explanation": "Barcha sanalar ketma-ket to'g'ri berilgan: 330 → 395 → 410 → 452 → 455 → 476.",
                "options": [
                    ("A", "1, 2, 3, 4, 5, 6", True),
                    ("B", "2, 1, 3, 4, 5, 6", False),
                    ("C", "1, 2, 4, 3, 5, 6", False),
                    ("D", "1, 3, 2, 4, 5, 6", False),
                ],
            },
            # 17 (Sxematik diagramma)
            {
                "body": (
                    "<p>Sxematik diagrammada G'arbiy Rim imperiyasining qulashiga olib kelgan uch bosqich ko'rsatilgan. "
                    "1–3 raqamlaridan qaysi biri imperiyaning yakuniy qulashiga tegishli?</p>"
                    "<div style='display:flex;flex-direction:column;align-items:center;gap:6px;margin:16px 0;'>"
                    "<div style='border:2px solid #3b82f6;border-radius:8px;padding:10px 24px;font-weight:bold;font-size:14px;background:rgba(59,130,246,0.08);width:260px;text-align:center;'>1 – milodiy 330-yil</div>"
                    "<div style='font-size:18px;color:#64748b;'>↓</div>"
                    "<div style='border:2px solid #3b82f6;border-radius:8px;padding:10px 24px;font-weight:bold;font-size:14px;background:rgba(59,130,246,0.08);width:260px;text-align:center;'>2 – milodiy 410-yil</div>"
                    "<div style='font-size:18px;color:#64748b;'>↓</div>"
                    "<div style='border:2px solid #3b82f6;border-radius:8px;padding:10px 24px;font-weight:bold;font-size:14px;background:rgba(59,130,246,0.08);width:260px;text-align:center;'>3 – milodiy 476-yil</div>"
                    "</div>"
                ),
                "explanation": "Milodiy 476-yilda (3-band) Odoakr so'nggi imperatorni ag'darib, G'arbiy Rim imperiyasiga yakunlovchi zarba berdi.",
                "options": [
                    ("A", "3", True),
                    ("B", "1", False),
                    ("C", "2", False),
                    ("D", "Hech biri", False),
                ],
            },
            # 18 (Jadval)
            {
                "body": (
                    "<p>Tarixiy voqea va uning natijasi o'zaro to'g'ri mos berilgan qatorlarni aniqlang.</p>"
                    "<div style='overflow-x:auto;margin:14px 0;border:1px solid #cbd5e1;border-radius:8px;'>"
                    "<table style='width:100%;border-collapse:collapse;font-size:13.5px;'>"
                    "<thead><tr style='background:rgba(100,116,139,0.12);border-bottom:2px solid #94a3b8;'>"
                    "<th style='padding:8px 10px;border-right:1px solid #cbd5e1;width:36px;text-align:center;'>№</th>"
                    "<th style='padding:8px 12px;border-right:1px solid #cbd5e1;text-align:left;'>Voqea</th>"
                    "<th style='padding:8px 12px;text-align:left;'>Natija</th>"
                    "</tr></thead>"
                    "<tbody>"
                    "<tr style='border-bottom:1px solid #e2e8f0;'><td style='padding:8px;text-align:center;border-right:1px solid #cbd5e1;font-weight:bold;'>1</td><td style='padding:8px 12px;border-right:1px solid #cbd5e1;'>Spartak qo'zg'oloni</td><td style='padding:8px 12px;'>Mag'lubiyatga uchradi, Spartak halok bo'ldi</td></tr>"
                    "<tr style='border-bottom:1px solid #e2e8f0;background:rgba(100,116,139,0.03);'><td style='padding:8px;text-align:center;border-right:1px solid #cbd5e1;font-weight:bold;'>2</td><td style='padding:8px 12px;border-right:1px solid #cbd5e1;'>Yuliy Sezarning o'ldirilishi</td><td style='padding:8px 12px;'>Respublika darhol tinch tiklandi</td></tr>"
                    "<tr style='border-bottom:1px solid #e2e8f0;'><td style='padding:8px;text-align:center;border-right:1px solid #cbd5e1;font-weight:bold;'>3</td><td style='padding:8px 12px;border-right:1px solid #cbd5e1;'>Oktavianning g'alabasi (mil.avv. 31)</td><td style='padding:8px 12px;'>Rim imperiyasiga asos solindi</td></tr>"
                    "<tr style='border-bottom:1px solid #e2e8f0;background:rgba(100,116,139,0.03);'><td style='padding:8px;text-align:center;border-right:1px solid #cbd5e1;font-weight:bold;'>4</td><td style='padding:8px 12px;border-right:1px solid #cbd5e1;'>Konstantinning farmoni (313)</td><td style='padding:8px 12px;'>Xristianlik boshqa dinlar bilan teng huquqli deb topildi</td></tr>"
                    "<tr style='border-bottom:1px solid #e2e8f0;'><td style='padding:8px;text-align:center;border-right:1px solid #cbd5e1;font-weight:bold;'>5</td><td style='padding:8px 12px;border-right:1px solid #cbd5e1;'>Alarixning Rimga hujumi</td><td style='padding:8px 12px;'>Rim shahri butunlay tiklanmas darajada yo'q qilindi</td></tr>"
                    "<tr><td style='padding:8px;text-align:center;border-right:1px solid #cbd5e1;font-weight:bold;'>6</td><td style='padding:8px 12px;border-right:1px solid #cbd5e1;'>Odoakrning hujumi (476)</td><td style='padding:8px 12px;'>G'arbiy Rim imperiyasi quladi</td></tr>"
                    "</tbody></table></div>"
                ),
                "explanation": "2 xato: Sezar o'ldirilgach fuqarolar urushi boshlandi, respublika tiklanmadi. 5 xato: Rim talandi, lekin shahar butunlay yo'q qilinmadi, keyinchalik yana talangan.",
                "options": [
                    ("A", "1, 3, 4, 6", True),
                    ("B", "2, 3, 5, 6", False),
                    ("C", "1, 2, 4, 5", False),
                    ("D", "3, 4, 5, 6", False),
                ],
            },
            # 19 (Jadval)
            {
                "body": (
                    "<p>Jadvalda harflar bilan belgilangan o'rinlarga mos keluvchi ma'lumotni toping.</p>"
                    "<div style='overflow-x:auto;margin:14px 0;border:1px solid #cbd5e1;border-radius:8px;'>"
                    "<table style='width:100%;border-collapse:collapse;font-size:13.5px;'>"
                    "<thead><tr style='background:rgba(100,116,139,0.12);border-bottom:2px solid #94a3b8;'>"
                    "<th style='padding:8px 12px;border-right:1px solid #cbd5e1;width:130px;text-align:left;'>Davr</th>"
                    "<th style='padding:8px 12px;border-right:1px solid #cbd5e1;text-align:left;'>Rim voqeasi</th>"
                    "<th style='padding:8px 12px;text-align:left;'>Diniy hayot voqeasi</th>"
                    "</tr></thead>"
                    "<tbody>"
                    "<tr style='border-bottom:1px solid #e2e8f0;'><td style='padding:10px 12px;border-right:1px solid #cbd5e1;font-weight:bold;'>Milodiy I asr</td><td style='padding:10px 12px;border-right:1px solid #cbd5e1;font-weight:bold;color:#f59e0b;font-size:16px;'>a</td><td style='padding:10px 12px;'>Xristianlik dini vujudga keldi</td></tr>"
                    "<tr style='background:rgba(100,116,139,0.03);'><td style='padding:10px 12px;border-right:1px solid #cbd5e1;font-weight:bold;'>Milodiy IV asr</td><td style='padding:10px 12px;border-right:1px solid #cbd5e1;'>Konstantinopol poytaxt bo'ldi (330)</td><td style='padding:10px 12px;font-weight:bold;color:#f59e0b;font-size:16px;'>b</td></tr>"
                    "</tbody></table></div>"
                    "<div style='padding:10px 14px;background:rgba(100,116,139,0.08);border-radius:8px;font-size:13px;line-height:1.6;margin-top:8px;'>"
                    "<b>Ma'lumotlar:</b><br/>"
                    "1) Iso Masih Falastinda faoliyat yuritdi;<br/>"
                    "2) Konstantin xristianlikka teng huquq berdi (313);<br/>"
                    "3) Trayan imperator bo'ldi (98);<br/>"
                    "4) Rim respublika e'lon qilindi (mil.avv. 509)."
                    "</div>"
                ),
                "explanation": "a=1: Iso Masih milodiy I asrda Falastinda faoliyat yuritgan. b=2: Konstantin 313-yilda (IV asr) xristianlikka teng huquq bergan.",
                "options": [
                    ("A", "a-1, b-2", True),
                    ("B", "a-3, b-4", False),
                    ("C", "a-1, b-4", False),
                    ("D", "a-3, b-2", False),
                ],
            },
            # 20 (Eyler-Venn diagrammasi)
            {
                "body": (
                    "<p>Quyida berilgan ma'lumotlarni tahlil qilib <b>Eyler-Venn diagrammasiga</b> mos keladigan javoblarni aniqlang.<br/>"
                    "<i>(G'arbiy va Sharqiy Rim imperiyalari, milodiy 395-yildan keyin)</i></p>"
                    "<div style='display:flex;justify-content:center;margin:18px 0;'>"
                    "<svg width='360' height='190' viewBox='0 0 360 190' style='max-width:100%;height:auto;'>"
                    "<circle cx='130' cy='95' r='80' fill='rgba(59, 130, 246, 0.15)' stroke='#3b82f6' stroke-width='2.5' />"
                    "<circle cx='230' cy='95' r='80' fill='rgba(245, 158, 11, 0.15)' stroke='#f59e0b' stroke-width='2.5' />"
                    "<text x='85' y='85' font-size='18' font-weight='bold' fill='currentColor' text-anchor='middle'>I</text>"
                    "<text x='85' y='108' font-size='13' font-weight='600' fill='currentColor' text-anchor='middle'>G'arbiy Rim</text>"
                    "<text x='180' y='98' font-size='18' font-weight='bold' fill='currentColor' text-anchor='middle'>III</text>"
                    "<text x='275' y='85' font-size='18' font-weight='bold' fill='currentColor' text-anchor='middle'>II</text>"
                    "<text x='275' y='108' font-size='13' font-weight='600' fill='currentColor' text-anchor='middle'>Sharqiy Rim</text>"
                    "</svg>"
                    "</div>"
                    "<div style='font-size:13.5px;line-height:1.8;padding:12px;background:rgba(100,116,139,0.06);border-radius:8px;'>"
                    "<b>a)</b> Italiya va Yevropa viloyatlarini o'z ichiga olgan;<br/>"
                    "<b>b)</b> Bolqon, Kichik Osiyo va Misrni o'z ichiga olgan;<br/>"
                    "<b>c)</b> Alohida davlatlarga parchalanib, 476-yilda qulagan;<br/>"
                    "<b>d)</b> Konstantinopoldan boshqarilgan, yagona hokimiyat saqlangan;<br/>"
                    "<b>e)</b> Bir vaqtlar yagona Rim imperiyasi tarkibida bo'lgan;<br/>"
                    "<b>f)</b> Xristianlik dinini tan olgan."
                    "</div>"
                ),
                "explanation": "I (faqat G'arbiy): Italiya-Yevropa (a), parchalanib qulagan (c). II (faqat Sharqiy): Bolqon-Kichik Osiyo-Misr (b), yagona hokimiyat saqlangan (d). III (umumiy kesishma): avval yagona imperiya edi (e), xristianlikni tan olgan (f).",
                "options": [
                    ("A", "I-a,c; II-b,d; III-e,f", True),
                    ("B", "I-b,d; II-a,c; III-e,f", False),
                    ("C", "I-a,d; II-b,c; III-e,f", False),
                    ("D", "I-a,c; II-b,f; III-d,e", False),
                ],
            },
            # 21
            {
                "body": (
                    "<p>Quyidagi shaxslar va ularning rollarini to'g'ri moslashtiring.</p>"
                    "<div style='display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:12px;margin:14px 0;'>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.7;'>"
                    "<b>1)</b> Brut<br/>"
                    "<b>2)</b> Antoniy<br/>"
                    "<b>3)</b> Pontiy Pilat<br/>"
                    "<b>4)</b> Feodosiy"
                    "</div>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.7;'>"
                    "<b>a)</b> Sezarga qarshi fitna boshlig'i<br/>"
                    "<b>b)</b> Kleopatraga uylangan Rim sarkardasi<br/>"
                    "<b>c)</b> Iso Masihni hukm qilishni tasdiqlagan Rim noibi<br/>"
                    "<b>d)</b> O'limidan keyin imperiya bo'lingan imperator"
                    "</div>"
                    "</div>"
                ),
                "explanation": "1-a (Brut — Sezarga fitna), 2-b (Antoniy — Kleopatra), 3-c (Pontiy Pilat — Iso hukmi), 4-d (Feodosiy — 395-yil bo'linish).",
                "options": [
                    ("A", "1-a; 2-b; 3-c; 4-d", True),
                    ("B", "1-b; 2-a; 3-d; 4-c", False),
                    ("C", "1-c; 2-a; 3-b; 4-d", False),
                    ("D", "1-a; 2-c; 3-b; 4-d", False),
                ],
            },
            # 22
            {
                "body": "<p>Rimliklar toshdan mustahkamroq, tez qurilishga imkon bergan qanday materialni ixtiro qilishgan?</p>",
                "explanation": "Beton — ohak, qum, vulqon kuli va mayda tosh aralashmasidan olingan mustahkam Rim ixtirosi.",
                "options": [
                    ("A", "Beton", True),
                    ("B", "Marmar", False),
                    ("C", "G'isht", False),
                    ("D", "Shisha", False),
                ],
            },
            # 23
            {
                "body": "<p>Suvni tog'dagi buloqlardan shaharga oqizib keluvchi, jarlar ustidan o'tkazilgan ko'prik-quvurlarni ayting.</p>",
                "explanation": "Akveduklar — toza tog' suvini Rim shaharlariga yetkazib beruvchi maxsus ko'prik-quvurlardir.",
                "options": [
                    ("A", "Akveduklar", True),
                    ("B", "Termalar", False),
                    ("C", "Forumlar", False),
                    ("D", "Amfiteatrlar", False),
                ],
            },
            # 24
            {
                "body": (
                    "<p>Quyidagi tarixchilardan qaysilari Qadimgi Rimga tegishli?</p>"
                    "<div style='padding:10px;border:1px solid #cbd5e1;border-radius:8px;background:rgba(100,116,139,0.05);line-height:1.7;font-size:13.5px;margin:10px 0;'>"
                    "1) Tit Liviy<br/>"
                    "2) Plutarx<br/>"
                    "3) Gerodot<br/>"
                    "4) Kvint Kursiy Ruf<br/>"
                    "5) Strabon<br/>"
                    "6) Arrian"
                    "</div>"
                ),
                "explanation": "Gerodot, Strabon va Arrian yunon tarixchilari bo'lgan. Tit Liviy, Plutarx va Kvint Kursiy Ruf esa Rim davri tarixchilari.",
                "options": [
                    ("A", "1, 2, 4", True),
                    ("B", "3, 5, 6", False),
                    ("C", "1, 3, 5", False),
                    ("D", "2, 4, 6", False),
                ],
            },
            # 25
            {
                "body": (
                    "<p>Quyidagi voqealardan qaysilari xristianlik dini tarixiga tegishli?</p>"
                    "<div style='padding:10px;border:1px solid #cbd5e1;border-radius:8px;background:rgba(100,116,139,0.05);line-height:1.7;font-size:13.5px;margin:10px 0;'>"
                    "1) Iso Masihning Vifleemda tug'ilishi<br/>"
                    "2) Pontiy Pilat hukmi<br/>"
                    "3) Golgofa tog'idagi voqea<br/>"
                    "4) Konstantinning 313-yilgi farmoni<br/>"
                    "5) Zardushtning va'zlari<br/>"
                    "6) Buddaviylikning tarqalishi"
                    "</div>"
                ),
                "explanation": "Zardushtiylik va buddaviylik mustaqil boshqa dinlar bo'lib, xristianlikka aloqador emas.",
                "options": [
                    ("A", "1, 2, 3, 4", True),
                    ("B", "1, 3, 5, 6", False),
                    ("C", "2, 3, 4, 5", False),
                    ("D", "1, 2, 5, 6", False),
                ],
            },
            # 26
            {
                "body": "<p>«Barcha yo'llar ... ga boradi» degan mashhur maqolda qaysi shahar nomi tushirib qoldirilgan?</p>",
                "explanation": "«Barcha yo'llar Rimga boradi» — qudratli Rim imperiyasining mustahkam tosh yo'llar tarmog'iga nisbatan aytilgan maqol.",
                "options": [
                    ("A", "Rimga", True),
                    ("B", "Afinaga", False),
                    ("C", "Bobilga", False),
                    ("D", "Konstantinopolga", False),
                ],
            },
            # 27
            {
                "body": "<p>O'zaro muvofiqlik SAQLANMAGAN javobni toping.</p>",
                "explanation": "Termalar ko'rkam jamoat hammomlari bo'lgan, Rim armiyasining harbiy bo'linmasi emas.",
                "options": [
                    ("A", "Kolizey — gladiatorlar jangi o'tkaziladigan amfiteatr", False),
                    ("B", "Panteon — barcha xudolar ibodatxonasi", False),
                    ("C", "Termalar — Rim armiyasining harbiy bo'linmasi", True),
                    ("D", "Akveduk — suv o'tkazish inshooti", False),
                ],
            },
            # 28
            {
                "body": "<p>Milodiy 452-yilda Italiyaga bostirib kirgan xunnlar sardorini aniqlang.</p>",
                "explanation": "Attila — xunnlar podshosi bo'lib, 452-yilda Italiyaga bostirib kirib Rim sari yurish qilgan.",
                "options": [
                    ("A", "Attila", True),
                    ("B", "Alarix", False),
                    ("C", "Odoakr", False),
                    ("D", "Spartak", False),
                ],
            },
            # 29
            {
                "body": (
                    "<p>Quyida berilgan ma'lumotlarga mos yakuniy xulosalar (to'g'ri/noto'g'ri) keltirilgan javobni aniqlang.</p>"
                    "<div style='padding:10px;border:1px solid #cbd5e1;border-radius:8px;background:rgba(100,116,139,0.05);line-height:1.7;font-size:13.5px;margin:10px 0;'>"
                    "I. Spartak qo'zg'oloni mag'lubiyat bilan yakunlangan.<br/>"
                    "II. Sharqiy Rim imperiyasida ham G'arbiy Rim kabi hokimiyat parchalanib ketgan.<br/>"
                    "III. G'arbiy Rim imperiyasining qulashi qadimgi dunyo tarixining yakunlanish sanasi hisoblanadi."
                    "</div>"
                ),
                "explanation": "I to'g'ri (qo'zg'olon bostirildi). II noto'g'ri — Sharqiy Rimda (Vizantiyada) imperatorning yagona hokimiyati saqlanib qoldi. III to'g'ri (milodiy 476-yil qadimgi dunyo yakuni).",
                "options": [
                    ("A", "I-to'g'ri; II-noto'g'ri; III-to'g'ri", True),
                    ("B", "I-noto'g'ri; II-to'g'ri; III-noto'g'ri", False),
                    ("C", "I-to'g'ri; II-to'g'ri; III-noto'g'ri", False),
                    ("D", "Hammasi noto'g'ri", False),
                ],
            },
            # 30
            {
                "body": (
                    "<p>Shaxslar va ularning ishlari to'g'ri moslashtirilgan javobni toping.</p>"
                    "<div style='display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:12px;margin:14px 0;'>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.7;'>"
                    "<b>1)</b> Konstantin<br/>"
                    "<b>2)</b> Alarix<br/>"
                    "<b>3)</b> Odoakr"
                    "</div>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.7;'>"
                    "<b>a)</b> Milodiy 330-yilda Konstantinopolni poytaxt qildi<br/>"
                    "<b>b)</b> Milodiy 410-yilda Rimni bosib olib talagan<br/>"
                    "<b>c)</b> Milodiy 476-yilda G'arbiy Rim imperiyasiga barham bergan"
                    "</div>"
                    "</div>"
                ),
                "explanation": "1-a (Konstantin — Konstantinopol), 2-b (Alarix — 410-yil Rimni taladi), 3-c (Odoakr — 476-yil imperiya barhami).",
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
                    "<p>Atamalar va ularning izohini to'g'ri moslashtiring.</p>"
                    "<div style='display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:12px;margin:14px 0;'>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.7;'>"
                    "<b>1)</b> Gladiator<br/>"
                    "<b>2)</b> Provinsiya<br/>"
                    "<b>3)</b> Imperator"
                    "</div>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.7;'>"
                    "<b>a)</b> Cheklanmagan hokimiyatga ega Rim yakka hukmdori<br/>"
                    "<b>b)</b> Tomoshabinlar uchun jang qiluvchi qul yoki jinoyatchi<br/>"
                    "<b>c)</b> Rim tomonidan bosib olingan hudud"
                    "</div>"
                    "</div>"
                ),
                "explanation": "1-b (Gladiator — jang qiluvchi qul), 2-c (Provinsiya — bosib olingan hudud), 3-a (Imperator — yakka hukmdor).",
                "options": [
                    ("A", "1-b; 2-c; 3-a", True),
                    ("B", "1-a; 2-b; 3-c", False),
                    ("C", "1-c; 2-a; 3-b", False),
                    ("D", "1-b; 2-a; 3-c", False),
                ],
            },
            # 32
            {
                "body": (
                    "<p>Quyidagi inshootlardan qaysilari Qadimgi Rimga tegishli?</p>"
                    "<div style='padding:10px;border:1px solid #cbd5e1;border-radius:8px;background:rgba(100,116,139,0.05);line-height:1.7;font-size:13.5px;margin:10px 0;'>"
                    "1) Kolizey<br/>"
                    "2) Panteon<br/>"
                    "3) Akropol<br/>"
                    "4) Parfenon<br/>"
                    "5) Forum<br/>"
                    "6) Akveduklar"
                    "</div>"
                ),
                "explanation": "Akropol va Parfenon Qadimgi Afinaga (Yunonistonga) tegishli inshootlar. Kolizey, Panteon, Forum va akveduklar esa Rimga tegishli.",
                "options": [
                    ("A", "1, 2, 5, 6", True),
                    ("B", "1, 3, 4, 5", False),
                    ("C", "2, 3, 4, 6", False),
                    ("D", "3, 4, 5, 6", False),
                ],
            },
            # 33 (Bank A-F)
            {
                "body": (
                    "<div style='padding:12px 14px;background:rgba(59,130,246,0.08);border:1px solid rgba(59,130,246,0.3);border-radius:8px;font-size:13px;line-height:1.7;margin-bottom:12px;'>"
                    "<b>33–35-topshiriqlarga mos javoblarni quyidagi banklardan (A–F) tanlang:</b><br/>"
                    "<b>A)</b> Spartak qo'zg'olonining bostirilishi (mil.avv. 71);<br/>"
                    "<b>B)</b> Yuliy Sezarning o'ldirilishi (mil.avv. 44);<br/>"
                    "<b>C)</b> Rim imperiyasining bo'linishi (milodiy 395);<br/>"
                    "<b>D)</b> Alarixning Rimni bosib olishi (milodiy 410);<br/>"
                    "<b>E)</b> G'arbiy Rim imperiyasining qulashi (milodiy 476);<br/>"
                    "<b>F)</b> Konstantinning xristianlikka teng huquq berishi (milodiy 313)"
                    "</div>"
                    "<p><b>Berilgan voqealardan qaysi biri eng avval sodir bo'lgan?</b></p>"
                ),
                "explanation": "Mil.avv. 71-yil — ro'yxatdagi eng qadimgi sana. To'g'ri javob: A (Spartak qo'zg'olonining bostirilishi).",
                "options": [
                    ("A", "Spartak qo'zg'olonining bostirilishi (mil.avv. 71)", True),
                    ("B", "Yuliy Sezarning o'ldirilishi (mil.avv. 44)", False),
                    ("C", "Rim imperiyasining bo'linishi (milodiy 395)", False),
                    ("D", "Alarixning Rimni bosib olishi (milodiy 410)", False),
                    ("E", "G'arbiy Rim imperiyasining qulashi (milodiy 476)", False),
                    ("F", "Konstantinning xristianlikka teng huquq berishi (milodiy 313)", False),
                ],
            },
            # 34 (Bank A-F)
            {
                "body": (
                    "<div style='padding:12px 14px;background:rgba(59,130,246,0.08);border:1px solid rgba(59,130,246,0.3);border-radius:8px;font-size:13px;line-height:1.7;margin-bottom:12px;'>"
                    "<b>33–35-topshiriqlarga mos javoblarni quyidagi banklardan (A–F) tanlang:</b><br/>"
                    "<b>A)</b> Spartak qo'zg'olonining bostirilishi (mil.avv. 71);<br/>"
                    "<b>B)</b> Yuliy Sezarning o'ldirilishi (mil.avv. 44);<br/>"
                    "<b>C)</b> Rim imperiyasining bo'linishi (milodiy 395);<br/>"
                    "<b>D)</b> Alarixning Rimni bosib olishi (milodiy 410);<br/>"
                    "<b>E)</b> G'arbiy Rim imperiyasining qulashi (milodiy 476);<br/>"
                    "<b>F)</b> Konstantinning xristianlikka teng huquq berishi (milodiy 313)"
                    "</div>"
                    "<p><b>Qadimgi dunyo tarixining yakunlanish sanasi sifatida qayd etilgan voqeani aniqlang.</b></p>"
                ),
                "explanation": "Milodiy 476-yilda G'arbiy Rim imperiyasi qulab, qadimgi dunyo tarixi yakunlandi. To'g'ri javob: E.",
                "options": [
                    ("A", "Spartak qo'zg'olonining bostirilishi (mil.avv. 71)", False),
                    ("B", "Yuliy Sezarning o'ldirilishi (mil.avv. 44)", False),
                    ("C", "Rim imperiyasining bo'linishi (milodiy 395)", False),
                    ("D", "Alarixning Rimni bosib olishi (milodiy 410)", False),
                    ("E", "G'arbiy Rim imperiyasining qulashi (milodiy 476)", True),
                    ("F", "Konstantinning xristianlikka teng huquq berishi (milodiy 313)", False),
                ],
            },
            # 35 (Bank A-F)
            {
                "body": (
                    "<div style='padding:12px 14px;background:rgba(59,130,246,0.08);border:1px solid rgba(59,130,246,0.3);border-radius:8px;font-size:13px;line-height:1.7;margin-bottom:12px;'>"
                    "<b>33–35-topshiriqlarga mos javoblarni quyidagi banklardan (A–F) tanlang:</b><br/>"
                    "<b>A)</b> Spartak qo'zg'olonining bostirilishi (mil.avv. 71);<br/>"
                    "<b>B)</b> Yuliy Sezarning o'ldirilishi (mil.avv. 44);<br/>"
                    "<b>C)</b> Rim imperiyasining bo'linishi (milodiy 395);<br/>"
                    "<b>D)</b> Alarixning Rimni bosib olishi (milodiy 410);<br/>"
                    "<b>E)</b> G'arbiy Rim imperiyasining qulashi (milodiy 476);<br/>"
                    "<b>F)</b> Konstantinning xristianlikka teng huquq berishi (milodiy 313)"
                    "</div>"
                    "<p><b>Berilgan voqealardan qaysi biri eng keyin sodir bo'lgan?</b></p>"
                ),
                "explanation": "Milodiy 476-yil — ro'yxatdagi eng so'nggi sana. To'g'ri javob: E (G'arbiy Rim imperiyasining qulashi).",
                "options": [
                    ("A", "Spartak qo'zg'olonining bostirilishi (mil.avv. 71)", False),
                    ("B", "Yuliy Sezarning o'ldirilishi (mil.avv. 44)", False),
                    ("C", "Rim imperiyasining bo'linishi (milodiy 395)", False),
                    ("D", "Alarixning Rimni bosib olishi (milodiy 410)", False),
                    ("E", "G'arbiy Rim imperiyasining qulashi (milodiy 476)", True),
                    ("F", "Konstantinning xristianlikka teng huquq berishi (milodiy 313)", False),
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
            self.stdout.write(f"  [{i:02d}] MCQ qo'shildi: {item['body'][:50]}...")

        # ── 6. III QISM: YOZMA (OCHIQ) SAVOLLAR (36 - 45) ────────────────────
        open_data = [
            # 36
            {
                "title": "Qullar va gladiatorlar.",
                "parts": [
                    ("a", "Mayda yer ijarachilarini yozing.", "Kolonlar"),
                    ("b", "Gladiatorlar jangi o'tkaziladigan eng katta amfiteatrni yozing.", "Kolizey"),
                ],
                "explanation": "a) Kolonlar; b) Kolizey.",
            },
            # 37
            {
                "title": "Spartak qo'zg'oloni.",
                "parts": [
                    ("a", "Qo'zg'olon boshlig'ini yozing.", "Spartak"),
                    ("b", "Qo'zg'olonni bostirgan Rim sarkardasini yozing.", "Mark Krass"),
                ],
                "explanation": "a) Spartak; b) Mark Krass.",
            },
            # 38
            {
                "title": "Yuliy Sezar.",
                "parts": [
                    ("a", "Sezar Rubikon daryosidan o'tgan yilni yozing.", "Mil.avv. 49-yil"),
                    ("b", "Sezarga qarshi fitna boshlig'ini yozing.", "Brut"),
                ],
                "explanation": "a) Mil.avv. 49-yil; b) Brut.",
            },
            # 39
            {
                "title": "Oktavian Avgust.",
                "parts": [
                    ("a", "Oktavian imperator unvonini olgan yilni yozing.", "Mil.avv. 29-yil"),
                    ("b", "Oktavian mag'lub etgan Misr malikasini yozing.", "Kleopatra"),
                ],
                "explanation": "a) Mil.avv. 29-yil; b) Kleopatra.",
            },
            # 40
            {
                "title": "Rim imperiyasining «oltin asri».",
                "parts": [
                    ("a", "«Oltin asr»ga nom bergan imperatorni yozing.", "Trayan"),
                    ("b", "Unga bag'ishlangan, balandligi 40 metr bo'lgan yodgorlikni yozing.", "Trayan ustuni"),
                ],
                "explanation": "a) Trayan; b) Trayan ustuni.",
            },
            # 41
            {
                "title": "Rim imperiyasining bo'linishi.",
                "parts": [
                    ("a", "Konstantinopolni poytaxt qilgan imperatorni yozing.", "Konstantin"),
                    ("b", "Imperiya G'arbiy va Sharqiyga bo'lingan yilni yozing.", "Milodiy 395-yil"),
                ],
                "explanation": "a) Konstantin; b) Milodiy 395-yil.",
            },
            # 42
            {
                "title": "G'arbiy Rim imperiyasining qulashi.",
                "parts": [
                    ("a", "Milodiy 410-yilda Rimni bosib olgan gotlar sardorini yozing.", "Alarix"),
                    ("b", "Milodiy 476-yilda G'arbiy Rim imperiyasiga barham bergan sarkardani yozing.", "Odoakr"),
                ],
                "explanation": "a) Alarix; b) Odoakr.",
            },
            # 43
            {
                "title": "Rim madaniyati.",
                "parts": [
                    ("a", "Barcha xudolarga bag'ishlangan Rim ibodatxonasini yozing.", "Panteon"),
                    ("b", "Rimliklar ixtiro qilgan qurilish materialini yozing.", "Beton"),
                ],
                "explanation": "a) Panteon; b) Beton.",
            },
            # 44
            {
                "title": "Rim tarixchilari.",
                "parts": [
                    ("a", "«Rim tarixi» asari muallifini yozing.", "Tit Liviy"),
                    ("b", "«Makedoniyalik Aleksandr tarixi» asari muallifini yozing.", "Kvint Kursiy Ruf"),
                ],
                "explanation": "a) Tit Liviy; b) Kvint Kursiy Ruf.",
            },
            # 45
            {
                "title": "Xristianlik dini.",
                "parts": [
                    ("a", "Iso Masih tug'ilgan shaharni yozing.", "Vifleem"),
                    ("b", "Xristianlikka teng huquq bergan farmon chiqargan imperatorni yozing.", "Konstantin"),
                ],
                "explanation": "a) Vifleem; b) Konstantin.",
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
