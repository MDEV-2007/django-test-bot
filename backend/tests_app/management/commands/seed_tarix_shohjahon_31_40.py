"""Django management command: Sodiqov Shohjahon ustozning 6-sinf Qadimgi Dunyo Tarixi (31–40-mavzular) Milliy Sertifikat mock testini yaratish.

31–40-mavzular: Mil.avv. VI–mil. III asrlarda O'rta Osiyo (Ahamoniylar, Aleksandr, Yunon-Baqtriya,
Xorazm-Qang'-Davan, Kushon, Ipak yo'li) va Qadimgi Rim boshlanishi.
35 ta test topshirig'i (A, B, C, D) va 10 ta yozma (ochiq) savol. Jami: 45 ta topshiriq.

Muallif/O'qituvchi: shohjahon (Sodiqov Shohjahon, @TarixMilliyCertificate)

Foydalanish:
    python manage.py seed_tarix_shohjahon_31_40
    python manage.py seed_tarix_shohjahon_31_40 --force
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from django.contrib.auth.models import User

from accounts.models import Profile, ensure_profile_for_user
from tests_app.models import Subject, TestSet, Question, AnswerOption, SubQuestion


MOCK_TITLE = "6-sinf Qadimgi Dunyo Tarixi — Milliy Sertifikat (31–40-mavzular) | Shohjahon"
MOCK_DESC = (
    "31–40-mavzular: Mil.avv. VI–mil. III asrlarda O'rta Osiyo (Ahamoniylar, Aleksandr, "
    "Yunon-Baqtriya, Xorazm-Qang'-Davan, Kushon, Ipak yo'li) va Qadimgi Rim boshlanishi. "
    "35 ta test topshirig'i (A, B, C, D) va 10 ta yozma (ochiq) savol. Jami: 45 ta topshiriq. "
    "Ustoz: Sodiqov Shohjahon (@TarixMilliyCertificate)."
)


class Command(BaseCommand):
    help = "Sodiqov Shohjahon ustoz nomidan 6-sinf Tarix (31–40-mavzular) 45 talik Milliy Sertifikat testini yuklaydi."

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
                        f"Qayta yuklash uchun: python manage.py seed_tarix_shohjahon_31_40 --force"
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
                "explanation": "Salavk Makedoniyalik Aleksandrning lashkarboshisi bo'lib, Salavkiylar davlatiga asos solgan. Karfagenga hech qanday aloqasi yo'q.",
                "options": [
                    ("A", "Kir II — massagetlar bilan jangda halok bo'lgan Fors shohi", False),
                    ("B", "Spitaman — Aleksandrga qarshi qo'zg'olon boshlig'i", False),
                    ("C", "Salavk — Karfagen sarkardasi", True),
                    ("D", "Kanishka — Kushon davlatini yuksaltirgan hukmdor", False),
                ],
            },
            # 2
            {
                "body": (
                    "<p>Quyidagi hukmdorlar va ular bilan bog'liq ma'lumotlar mos ravishda berilgan javobni aniqlang.</p>"
                    "<div style='display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:12px;margin:14px 0;'>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.7;'>"
                    "<b>1)</b> Kir II<br/>"
                    "<b>2)</b> Doro I<br/>"
                    "<b>3)</b> Aleksandr<br/>"
                    "<b>4)</b> Salavk"
                    "</div>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.7;'>"
                    "<b>a)</b> Mil.avv. 334-yilda Sharqqa yurish boshlagan<br/>"
                    "<b>b)</b> Mil.avv. 312-yilda Bobil hukmdori bo'lgan<br/>"
                    "<b>c)</b> Mil.avv. 530-yilda massagetlar bilan jangda halok bo'lgan<br/>"
                    "<b>d)</b> Saklarga qarshi yurish qilib, Shiroq hiylasiga duch kelgan"
                    "</div>"
                    "</div>"
                ),
                "explanation": "1-c (Kir II — mil.avv. 530 massagetlar), 2-d (Doro I — Shiroq hiylasi), 3-a (Aleksandr — mil.avv. 334 Sharqqa yurish), 4-b (Salavk — mil.avv. 312 Bobil).",
                "options": [
                    ("A", "1-c; 2-d; 3-a; 4-b", True),
                    ("B", "1-a; 2-b; 3-c; 4-d", False),
                    ("C", "1-c; 2-a; 3-d; 4-b", False),
                    ("D", "1-b; 2-d; 3-a; 4-c", False),
                ],
            },
            # 3
            {
                "body": "<p>Ahamoniylar davrida O'rta Osiyo qanday harbiy-ma'muriy viloyatlarga bo'lingan edi?</p>",
                "explanation": "Ahamoniylar saltanatida harbiy-ma'muriy viloyatlar «satraplik» deb atalgan va ularni satraplar boshqargan.",
                "options": [
                    ("A", "Satrapliklar", True),
                    ("B", "Provinsiyalar", False),
                    ("C", "Nomlar", False),
                    ("D", "Polislar", False),
                ],
            },
            # 4
            {
                "body": (
                    "<p>Quyidagi voqealar to'g'ri xronologik ketma-ketlikda ko'rsatilgan javobni toping.</p>"
                    "<div style='padding:12px;border:1px solid #cbd5e1;border-radius:8px;background:rgba(100,116,139,0.05);line-height:1.8;font-size:13.5px;margin:12px 0;'>"
                    "1) Kir II massagetlar bilan jangda halok bo'ldi (mil.avv. 530)<br/>"
                    "2) Frada qo'zg'oloni (mil.avv. 522)<br/>"
                    "3) Aleksandrning Sharqqa yurishi boshlandi (mil.avv. 334)<br/>"
                    "4) Maroqanda egallandi (mil.avv. 329)<br/>"
                    "5) Spitaman halok bo'ldi (mil.avv. 328)<br/>"
                    "6) Aleksandr vafot etdi (mil.avv. 323)"
                    "</div>"
                ),
                "explanation": "To'g'ri xronologik ketma-ketlik: mil.avv. 530 (1) → 522 (2) → 334 (3) → 329 (4) → 328 (5) → 323 (6).",
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
                    "<p>Quyida berilgan hukmdorlar va ular bilan bog'liq davlatlar to'g'ri moslashtirilgan javobni toping.</p>"
                    "<div style='display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:12px;margin:14px 0;'>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.7;'>"
                    "<b>I</b> Diodot<br/>"
                    "<b>II</b> Kudzula Kadfiz<br/>"
                    "<b>III</b> Salavk<br/>"
                    "<b>IV</b> Kanishka"
                    "</div>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.7;'>"
                    "<b>a</b> Yunon-Baqtriya davlatiga asos solgan<br/>"
                    "<b>b</b> Kushon davlatiga asos solgan<br/>"
                    "<b>c</b> Salavkiylar davlatiga asos solgan<br/>"
                    "<b>d</b> Kushon davlatini taraqqiyot cho'qqisiga olib chiqqan<br/>"
                    "<b>e</b> Rim respublikasiga asos solgan"
                    "</div>"
                    "</div>"
                ),
                "explanation": "Diodot — Yunon-Baqtriya (a); Kudzula Kadfiz — Kushon davlatiga asos (b); Salavk — Salavkiylar (c); Kanishka — Kushonni yuksaltirgan (d).",
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
                    "<p>Quyida berilgan Rim harbiy atamalari va ularning izohi to'g'ri moslashtirilgan javobni toping.</p>"
                    "<div style='display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:12px;margin:14px 0;'>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.7;'>"
                    "<b>I</b> Senturiya<br/>"
                    "<b>II</b> Kogorta<br/>"
                    "<b>III</b> Legion<br/>"
                    "<b>IV</b> Triumf"
                    "</div>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.7;'>"
                    "<b>a</b> 80 kishidan iborat jangchilar guruhi<br/>"
                    "<b>b</b> Bir necha senturiyadan tashkil topgan bo'linma<br/>"
                    "<b>c</b> O'nta kogortadan tashkil topgan yirik harbiy qism<br/>"
                    "<b>d</b> G'alaba sharafiga o'tkaziladigan tantana<br/>"
                    "<b>e</b> Qamal quroli"
                    "</div>"
                    "</div>"
                ),
                "explanation": "Senturiya — 80 kishi (a); Kogorta — senturiyalar to'plami (b); Legion — 10 kogorta (c); Triumf — g'alaba tantanasi (d).",
                "options": [
                    ("A", "I-a, II-b, III-c, IV-d", True),
                    ("B", "I-b, II-a, III-c, IV-d", False),
                    ("C", "I-a, II-c, III-b, IV-d", False),
                    ("D", "I-a, II-b, III-d, IV-c", False),
                ],
            },
            # 7
            {
                "body": (
                    "<p>Tarixiy shaxsni aniqlang. Massagetlar malikasi. "
                    "Mil.avv. 530-yilda Kir II boshchiligidagi fors qo'shinini tor-mor etdi, "
                    "Kir II shu jangda halok bo'ldi.</p>"
                ),
                "explanation": "To'maris — massagetlarning jasur malikasi bo'lib, mil.avv. 530-yilda bosqinchi Kir II qo'shinini yenggan.",
                "options": [
                    ("A", "To'maris", True),
                    ("B", "Ravshanak", False),
                    ("C", "Spitaman", False),
                    ("D", "Frada", False),
                ],
            },
            # 8
            {
                "body": (
                    "<p>Tarixiy shaxsni aniqlang. Sak cho'poni. Doro I qo'shinini suvsiz cho'lga "
                    "adashtirib olib borib, ularni halokatga mahkum etgan, so'ng o'zi ham fors "
                    "qo'shini tomonidan o'ldirilgan.</p>"
                ),
                "explanation": "Shiroq — o'z tanasini tilkalab, Doro I qo'shinini aldab Qizilqum sahrosiga boshlab borgan va vatanini qutqargan qahramon cho'pon.",
                "options": [
                    ("A", "Shiroq", True),
                    ("B", "Skunxa", False),
                    ("C", "Bess", False),
                    ("D", "Spitaman", False),
                ],
            },
            # 9
            {
                "body": (
                    "<p>Tarixiy voqeani aniqlang. Karfagen sarkardasi Alp tog'laridan oshib o'tib, "
                    "mil.avv. 216-yilda Rim armiyasini tor-mor etgan jang.</p>"
                ),
                "explanation": "Kann jangi — mil.avv. 216-yilda Gannibal boshchiligidagi Karfagen qo'shini Rim legionlarini qurshovga olib qirg'in qilgan jang.",
                "options": [
                    ("A", "Kann jangi", True),
                    ("B", "Zama jangi", False),
                    ("C", "Marafon jangi", False),
                    ("D", "Salamin jangi", False),
                ],
            },
            # 10
            {
                "body": (
                    "<p>Tarixiy shaxsni aniqlang. Rimlik sarkarda. Mil.avv. 202-yilda Zama jangida "
                    "Gannibal qo'shinini tor-mor etdi.</p>"
                ),
                "explanation": "Korneliy Ssipion — mil.avv. 202-yilda Shimoliy Afrikadagi Zama jangida Gannibalni yengib, Rimning g'alabasini ta'minlagan sarkarda.",
                "options": [
                    ("A", "Ssipion", True),
                    ("B", "Salavk", False),
                    ("C", "Antiox", False),
                    ("D", "Diodot", False),
                ],
            },
            # 11
            {
                "body": (
                    "<p>Quyidagi shaharlardan qaysilari Buyuk Ipak yo'lida joylashgan bo'lgan?</p>"
                    "<div style='padding:10px;border:1px solid #cbd5e1;border-radius:8px;background:rgba(100,116,139,0.05);line-height:1.7;font-size:13.5px;margin:10px 0;'>"
                    "1) Samarqand<br/>"
                    "2) Buxoro<br/>"
                    "3) Termiz<br/>"
                    "4) Marv<br/>"
                    "5) Afina<br/>"
                    "6) Rim"
                    "</div>"
                ),
                "explanation": "Samarqand, Buxoro, Termiz va Marv Buyuk Ipak yo'lining asosiy markaziy bekatlari va yirik karvon yo'llari chorrahasi bo'lgan.",
                "options": [
                    ("A", "1, 2, 3, 4", True),
                    ("B", "1, 3, 5, 6", False),
                    ("C", "2, 3, 4, 5", False),
                    ("D", "1, 2, 5, 6", False),
                ],
            },
            # 12
            {
                "body": "<p>Buyuk Ipak yo'li nomini 1877-yilda kim bergan?</p>",
                "explanation": "Nemis geografi va sayyohi Ferdinand fon Rixtgofen 1877-yilda ushbu transkontinental savdo yo'liga «Buyuk Ipak yo'li» nomini bergan.",
                "options": [
                    ("A", "F. Rixtgofen", True),
                    ("B", "Chjan Syan", False),
                    ("C", "Gerodot", False),
                    ("D", "Strabon", False),
                ],
            },
            # 13
            {
                "body": "<p>Mil.avv. IV-III asrlar O'rta Osiyo uchun xos bo'lgan holatni aniqlang.</p>",
                "explanation": "Aleksandr istilosi va ellinizm davrida O'rta Osiyoda mahalliy madaniyat bilan qadimgi yunon madaniyati qorishib, yuksak ellinistik madaniyat shakllandi.",
                "options": [
                    ("A", "Yunon-makedon istilosidan keyin mahalliy va yunon madaniyatlari qo'shilishi yuz berdi", True),
                    ("B", "O'rta Osiyo yagona markazlashgan davlat edi", False),
                    ("C", "Butun hudud Xitoy tarkibida edi", False),
                    ("D", "Yozuv umuman mavjud emas edi", False),
                ],
            },
            # 14
            {
                "body": (
                    "<p>Quyidagi davlatlardan qaysilari mil.avv. IV-III asrlarda O'rta Osiyoda mavjud bo'lgan?</p>"
                    "<div style='padding:10px;border:1px solid #cbd5e1;border-radius:8px;background:rgba(100,116,139,0.05);line-height:1.7;font-size:13.5px;margin:10px 0;'>"
                    "1) Xorazm<br/>"
                    "2) Qang' davlati<br/>"
                    "3) Davan davlati<br/>"
                    "4) Karfagen<br/>"
                    "5) Rim respublikasi<br/>"
                    "6) Yunon-Baqtriya"
                    "</div>"
                ),
                "explanation": "Karfagen va Rim O'rtayer dengizi mintaqasida joylashgan. Xorazm, Qang', Davan va Yunon-Baqtriya esa O'rta Osiyo hududida mavjud bo'lgan.",
                "options": [
                    ("A", "1, 2, 3, 6", True),
                    ("B", "1, 4, 5, 6", False),
                    ("C", "2, 3, 4, 5", False),
                    ("D", "1, 2, 4, 5", False),
                ],
            },
            # 15
            {
                "body": "<p>Rim shahriga rivoyatga ko'ra qaysi yilda asos solingan?</p>",
                "explanation": "Rivoyatga ko'ra, aka-uka Romul va Rem tomonidan milodiy avvalgi 753-yilda Rim shahriga asos solingan.",
                "options": [
                    ("A", "Mil.avv. 753-yil", True),
                    ("B", "Mil.avv. 509-yil", False),
                    ("C", "Mil.avv. 216-yil", False),
                    ("D", "Mil.avv. 146-yil", False),
                ],
            },
            # 16
            {
                "body": (
                    "<p>Quyidagi voqealar to'g'ri xronologik ketma-ketlikda ko'rsatilgan javobni toping.</p>"
                    "<div style='padding:12px;border:1px solid #cbd5e1;border-radius:8px;background:rgba(100,116,139,0.05);line-height:1.8;font-size:13.5px;margin:12px 0;'>"
                    "1) Rim shahriga asos solindi (mil.avv. 753)<br/>"
                    "2) Rim respublika deb e'lon qilindi (mil.avv. 509)<br/>"
                    "3) Kann jangi (mil.avv. 216)<br/>"
                    "4) Zama jangi (mil.avv. 202)<br/>"
                    "5) Karfagen vayron qilindi (mil.avv. 146)"
                    "</div>"
                ),
                "explanation": "To'g'ri xronologiya: mil.avv. 753 → 509 → 216 → 202 → 146.",
                "options": [
                    ("A", "1, 2, 3, 4, 5", True),
                    ("B", "2, 1, 3, 4, 5", False),
                    ("C", "1, 2, 4, 3, 5", False),
                    ("D", "1, 3, 2, 4, 5", False),
                ],
            },
            # 17 (Sxematik diagramma)
            {
                "body": (
                    "<p>Sxematik diagrammada O'rta Osiyoda ketma-ket hukmronlik qilgan uch davr ko'rsatilgan. "
                    "1–3 raqamlaridan qaysi biri <b>Kushon davlati</b> davriga tegishli?</p>"
                    "<div style='display:flex;flex-direction:column;align-items:center;gap:6px;margin:16px 0;'>"
                    "<div style='border:2px solid #3b82f6;border-radius:8px;padding:10px 24px;font-weight:bold;font-size:14px;background:rgba(59,130,246,0.08);width:280px;text-align:center;'>1 – Ahamoniylar (mil.avv. VI asr)</div>"
                    "<div style='font-size:18px;color:#64748b;'>↓</div>"
                    "<div style='border:2px solid #3b82f6;border-radius:8px;padding:10px 24px;font-weight:bold;font-size:14px;background:rgba(59,130,246,0.08);width:280px;text-align:center;'>2 – Yunon-Baqtriya (mil.avv. III-II asr)</div>"
                    "<div style='font-size:18px;color:#64748b;'>↓</div>"
                    "<div style='border:2px solid #3b82f6;border-radius:8px;padding:10px 24px;font-weight:bold;font-size:14px;background:rgba(59,130,246,0.08);width:280px;text-align:center;'>3 – Kushon davlati (milodiy I-III asr)</div>"
                    "</div>"
                ),
                "explanation": "Kushon davlati milodiy I-III asrlarda mavjud bo'lgan (3-band). 1-band — Ahamoniylar (mil.avv. VI asr), 2-band — Yunon-Baqtriya (mil.avv. III-II asr).",
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
                    "<tr style='border-bottom:1px solid #e2e8f0;'><td style='padding:8px;text-align:center;border-right:1px solid #cbd5e1;font-weight:bold;'>1</td><td style='padding:8px 12px;border-right:1px solid #cbd5e1;'>Kir IIning massagetlarga yurishi</td><td style='padding:8px 12px;'>Kir II halok bo'ldi</td></tr>"
                    "<tr style='border-bottom:1px solid #e2e8f0;background:rgba(100,116,139,0.03);'><td style='padding:8px;text-align:center;border-right:1px solid #cbd5e1;font-weight:bold;'>2</td><td style='padding:8px 12px;border-right:1px solid #cbd5e1;'>Spitaman qo'zg'oloni</td><td style='padding:8px 12px;'>Yunon-makedon qo'shinlari butunlay O'rta Osiyodan haydab chiqarildi</td></tr>"
                    "<tr style='border-bottom:1px solid #e2e8f0;'><td style='padding:8px;text-align:center;border-right:1px solid #cbd5e1;font-weight:bold;'>3</td><td style='padding:8px 12px;border-right:1px solid #cbd5e1;'>Kanishka hukmronligi</td><td style='padding:8px 12px;'>Kushon davlati taraqqiyot cho'qqisiga chiqdi</td></tr>"
                    "<tr style='border-bottom:1px solid #e2e8f0;background:rgba(100,116,139,0.03);'><td style='padding:8px;text-align:center;border-right:1px solid #cbd5e1;font-weight:bold;'>4</td><td style='padding:8px 12px;border-right:1px solid #cbd5e1;'>Gannibalning Kann jangidagi g'alabasi</td><td style='padding:8px 12px;'>Karfagen darhol Rimni butunlay bosib oldi</td></tr>"
                    "<tr style='border-bottom:1px solid #e2e8f0;'><td style='padding:8px;text-align:center;border-right:1px solid #cbd5e1;font-weight:bold;'>5</td><td style='padding:8px 12px;border-right:1px solid #cbd5e1;'>Ssipionning Zama jangidagi g'alabasi</td><td style='padding:8px 12px;'>Karfagen qudrati singdi, keyinchalik vayron qilindi</td></tr>"
                    "<tr><td style='padding:8px;text-align:center;border-right:1px solid #cbd5e1;font-weight:bold;'>6</td><td style='padding:8px 12px;border-right:1px solid #cbd5e1;'>F. Rixtgofenning tadqiqotlari</td><td style='padding:8px 12px;'>Savdo yo'liga «Ipak yo'li» nomi berildi</td></tr>"
                    "</tbody></table></div>"
                ),
                "explanation": "2 xato: Aleksandr O'rta Osiyoning bir qismini bo'ysundirdi. 4 xato: Kann jangidan keyin Rim taslim bo'lmadi, urush davom etdi.",
                "options": [
                    ("A", "1, 3, 5, 6", True),
                    ("B", "2, 3, 4, 6", False),
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
                    "<th style='padding:8px 12px;border-right:1px solid #cbd5e1;text-align:left;'>O'rta Osiyo voqeasi</th>"
                    "<th style='padding:8px 12px;text-align:left;'>O'rtayer dengizi voqeasi</th>"
                    "</tr></thead>"
                    "<tbody>"
                    "<tr style='border-bottom:1px solid #e2e8f0;'><td style='padding:10px 12px;border-right:1px solid #cbd5e1;font-weight:bold;'>Mil.avv. III asr</td><td style='padding:10px 12px;border-right:1px solid #cbd5e1;'>Yunon-Baqtriya davlati tashkil topdi (250-yil)</td><td style='padding:10px 12px;font-weight:bold;color:#f59e0b;font-size:16px;'>a</td></tr>"
                    "<tr style='background:rgba(100,116,139,0.03);'><td style='padding:10px 12px;border-right:1px solid #cbd5e1;font-weight:bold;'>Mil.avv. III-II asr</td><td style='padding:10px 12px;border-right:1px solid #cbd5e1;font-weight:bold;color:#f59e0b;font-size:16px;'>b</td><td style='padding:10px 12px;'>Kann va Zama janglari (216, 202-yillar)</td></tr>"
                    "</tbody></table></div>"
                    "<div style='padding:10px 14px;background:rgba(100,116,139,0.08);border-radius:8px;font-size:13px;line-height:1.6;margin-top:8px;'>"
                    "<b>Ma'lumotlar:</b><br/>"
                    "1) Birinchi Puni urushi boshlandi;<br/>"
                    "2) Qang' va Davan davlatlari mavjud edi;<br/>"
                    "3) Rim respublika deb e'lon qilindi;<br/>"
                    "4) Kir II vafot etdi."
                    "</div>"
                ),
                "explanation": "a=1: Birinchi Puni urushi mil.avv. III asr o'rtalarida boshlandi. b=2: Qang' va Davan davlatlari mil.avv. III-II asrlarda O'rta Osiyoda mavjud edi.",
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
                    "<i>(Yunon-Baqtriya va Kushon davlatlari)</i></p>"
                    "<div style='display:flex;justify-content:center;margin:18px 0;'>"
                    "<svg width='360' height='190' viewBox='0 0 360 190' style='max-width:100%;height:auto;'>"
                    "<circle cx='130' cy='95' r='80' fill='rgba(59, 130, 246, 0.15)' stroke='#3b82f6' stroke-width='2.5' />"
                    "<circle cx='230' cy='95' r='80' fill='rgba(245, 158, 11, 0.15)' stroke='#f59e0b' stroke-width='2.5' />"
                    "<text x='85' y='85' font-size='18' font-weight='bold' fill='currentColor' text-anchor='middle'>I</text>"
                    "<text x='85' y='108' font-size='12' font-weight='600' fill='currentColor' text-anchor='middle'>Yunon-Baqtriya</text>"
                    "<text x='180' y='98' font-size='18' font-weight='bold' fill='currentColor' text-anchor='middle'>III</text>"
                    "<text x='275' y='85' font-size='18' font-weight='bold' fill='currentColor' text-anchor='middle'>II</text>"
                    "<text x='275' y='108' font-size='13' font-weight='600' fill='currentColor' text-anchor='middle'>Kushon</text>"
                    "</svg>"
                    "</div>"
                    "<div style='font-size:13.5px;line-height:1.8;padding:12px;background:rgba(100,116,139,0.06);border-radius:8px;'>"
                    "<b>a)</b> Yunon madaniyati ta'sirida bo'lgan;<br/>"
                    "<b>b)</b> Poytaxti Peshovarga ko'chirilgan;<br/>"
                    "<b>c)</b> Baqtriya hududida joylashgan;<br/>"
                    "<b>d)</b> Yuechji qabilalari tomonidan tugatilgan;<br/>"
                    "<b>e)</b> Buddaviylik dini tarqalgan;<br/>"
                    "<b>f)</b> Tanga zarb qilingan."
                    "</div>"
                ),
                "explanation": "I (faqat Yunon-Baqtriya): yunon madaniyati (a), yuechjilar tomonidan tugatilgan (d). II (faqat Kushon): poytaxt Peshovar (b), buddaviylik (e). III (umumiy kesishma): Baqtriya hududi (c), tanga zarb qilish (f).",
                "options": [
                    ("A", "I-a,d; II-b,e; III-c,f", True),
                    ("B", "I-b,e; II-a,d; III-c,f", False),
                    ("C", "I-a,d; II-c,f; III-b,e", False),
                    ("D", "I-a,e; II-c,d; III-b,f", False),
                ],
            },
            # 21
            {
                "body": (
                    "<p>Quyidagi davlatlar va ularning poytaxtlarini to'g'ri moslashtiring.</p>"
                    "<div style='display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:12px;margin:14px 0;'>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.7;'>"
                    "<b>1)</b> Qang' davlati<br/>"
                    "<b>2)</b> Davan davlati<br/>"
                    "<b>3)</b> Kushon davlati (keyingi)<br/>"
                    "<b>4)</b> Rim"
                    "</div>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.7;'>"
                    "<b>a)</b> Ershi<br/>"
                    "<b>b)</b> Qang'dez (Bityan)<br/>"
                    "<b>c)</b> Peshovar<br/>"
                    "<b>d)</b> Tibr bo'yida"
                    "</div>"
                    "</div>"
                ),
                "explanation": "1-b (Qang' — Qang'dez/Bityan), 2-a (Davan — Ershi), 3-c (Kushon — Peshovar), 4-d (Rim — Tibr bo'yi).",
                "options": [
                    ("A", "1-b; 2-a; 3-c; 4-d", True),
                    ("B", "1-a; 2-b; 3-d; 4-c", False),
                    ("C", "1-c; 2-a; 3-b; 4-d", False),
                    ("D", "1-b; 2-d; 3-a; 4-c", False),
                ],
            },
            # 22
            {
                "body": "<p>Rimda «oqsoqollar kengashi» ma'nosini bildiruvchi oliy davlat organi qanday atalgan?</p>",
                "explanation": "Senat (lotincha «senex» — qariya/oqsoqol so'zidan) — Qadimgi Rimdagi oqsoqollar kengashi va oliy davlat organi bo'lgan.",
                "options": [
                    ("A", "Senat", True),
                    ("B", "Forum", False),
                    ("C", "Xalq majlisi", False),
                    ("D", "Diktatura", False),
                ],
            },
            # 23
            {
                "body": "<p>Rimning tub aholisi qanday atalgan?</p>",
                "explanation": "Patritsiylar — Rimning eng qadimgi tub zodagon aholisi bo'lgan. Ko'chib kelganlar esa plebeylar deb atalgan.",
                "options": [
                    ("A", "Patritsiylar", True),
                    ("B", "Plebeylar", False),
                    ("C", "Meteklar", False),
                    ("D", "Provinsiyalar", False),
                ],
            },
            # 24
            {
                "body": (
                    "<p>Quyidagi xudolardan qaysilari Qadimgi Rimga tegishli?</p>"
                    "<div style='padding:10px;border:1px solid #cbd5e1;border-radius:8px;background:rgba(100,116,139,0.05);line-height:1.7;font-size:13.5px;margin:10px 0;'>"
                    "1) Yupiter<br/>"
                    "2) Amon-Ra<br/>"
                    "3) Mars<br/>"
                    "4) Osiris<br/>"
                    "5) Vulqon<br/>"
                    "6) Fortuna"
                    "</div>"
                ),
                "explanation": "Amon-Ra va Osiris Qadimgi Misr xudolari hisoblanadi. Yupiter, Mars, Vulqon va Fortuna Rim xudolaridir.",
                "options": [
                    ("A", "1, 3, 5, 6", True),
                    ("B", "1, 2, 4, 5", False),
                    ("C", "2, 3, 4, 6", False),
                    ("D", "1, 2, 3, 4", False),
                ],
            },
            # 25
            {
                "body": (
                    "<p>Quyidagi shaxslardan qaysilari Yunon-Baqtriya podsholigi hukmdorlariga tegishli?</p>"
                    "<div style='padding:10px;border:1px solid #cbd5e1;border-radius:8px;background:rgba(100,116,139,0.05);line-height:1.7;font-size:13.5px;margin:10px 0;'>"
                    "1) Diodot<br/>"
                    "2) Yevtidem<br/>"
                    "3) Demetriy<br/>"
                    "4) Kanishka<br/>"
                    "5) Vima Kadfiz<br/>"
                    "6) Salavk"
                    "</div>"
                ),
                "explanation": "Kanishka va Vima Kadfiz Kushon hukmdorlari, Salavk esa Salavkiylar asoschisi. Diodot, Yevtidem va Demetriy Yunon-Baqtriya podsholaridir.",
                "options": [
                    ("A", "1, 2, 3", True),
                    ("B", "4, 5, 6", False),
                    ("C", "1, 3, 5", False),
                    ("D", "2, 4, 6", False),
                ],
            },
            # 26
            {
                "body": "<p>Ikkinchi Puni urushida Gannibal qaysi tog'lardan oshib Italiyaga bostirib kirdi?</p>",
                "explanation": "Gannibal o'z qo'shini va harbiy fillari bilan qorli Alp tog'laridan mashaqqatli o'tishni amalga oshirib, kutilmaganda Rimga zarba bergan.",
                "options": [
                    ("A", "Alp tog'lari", True),
                    ("B", "Pomir tog'lari", False),
                    ("C", "Kavkaz tog'lari", False),
                    ("D", "Olimp tog'lari", False),
                ],
            },
            # 27
            {
                "body": "<p>O'zaro muvofiqlik SAQLANMAGAN javobni toping.</p>",
                "explanation": "Prokonsul Rim provinsiyalarini boshqargan sobiq konsul (harbiy noib) bo'lgan, din xudosi emas.",
                "options": [
                    ("A", "Diktator — urush davrida cheklanmagan hokimiyatga ega bo'lgan Rim mansabdori", False),
                    ("B", "Xalq tribuni — qashshoq rimliklar manfaatini himoya qilgan", False),
                    ("C", "Prokonsul — Rim respublikasining asosiy dini xudosi", True),
                    ("D", "Konsul — respublikaning bosh mansabdor shaxsi", False),
                ],
            },
            # 28
            {
                "body": "<p>Rim bosib olgan yerlarni qanday atagan?</p>",
                "explanation": "Rim o'z hududidan tashqarida bosib olgan barcha o'lkalarni «provinsiya» deb atagan.",
                "options": [
                    ("A", "Provinsiyalar", True),
                    ("B", "Satrapliklar", False),
                    ("C", "Nomlar", False),
                    ("D", "Polislar", False),
                ],
            },
            # 29
            {
                "body": (
                    "<p>Quyida berilgan ma'lumotlarga mos yakuniy xulosalar (to'g'ri/noto'g'ri) keltirilgan javobni aniqlang.</p>"
                    "<div style='padding:10px;border:1px solid #cbd5e1;border-radius:8px;background:rgba(100,116,139,0.05);line-height:1.7;font-size:13.5px;margin:10px 0;'>"
                    "I. Makedoniyalik Aleksandr O'rta Osiyoning butun hududini bo'ysundirishga muvaffaq bo'ldi.<br/>"
                    "II. Kanishka davrida Kushon davlatiga buddaviylik dini kirib kelgan.<br/>"
                    "III. Uchinchi Puni urushida Karfagen butunlay vayron qilingan."
                    "</div>"
                ),
                "explanation": "I noto'g'ri — Aleksandr O'rta Osiyoning kichik qisminigina bo'ysundirdi, Xorazm, Toshkent va Farg'ona mustaqil qoldi. II to'g'ri. III to'g'ri (mil.avv. 146).",
                "options": [
                    ("A", "I-noto'g'ri; II-to'g'ri; III-to'g'ri", True),
                    ("B", "I-to'g'ri; II-to'g'ri; III-noto'g'ri", False),
                    ("C", "I-noto'g'ri; II-noto'g'ri; III-to'g'ri", False),
                    ("D", "Hammasi to'g'ri", False),
                ],
            },
            # 30
            {
                "body": (
                    "<p>Shaxslar va ularning ishlari to'g'ri moslashtirilgan javobni toping.</p>"
                    "<div style='display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:12px;margin:14px 0;'>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.7;'>"
                    "<b>1)</b> Gannibal<br/>"
                    "<b>2)</b> Ssipion<br/>"
                    "<b>3)</b> Chjan Syan"
                    "</div>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.7;'>"
                    "<b>a)</b> Karfagen sarkardasi, Kann jangida g'olib chiqqan<br/>"
                    "<b>b)</b> Rimlik sarkarda, Zama jangida g'olib chiqqan<br/>"
                    "<b>c)</b> Xitoy elchisi, Farg'onaga borgan"
                    "</div>"
                    "</div>"
                ),
                "explanation": "1-a (Gannibal — Kann jangi), 2-b (Ssipion — Zama jangi), 3-c (Chjan Syan — Farg'ona elchisi).",
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
                    "<p>Xorazm shaharlari va ularning ta'rifini to'g'ri moslashtiring.</p>"
                    "<div style='display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:12px;margin:14px 0;'>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.7;'>"
                    "<b>1)</b> Ko'zaliqir<br/>"
                    "<b>2)</b> Tuproqqal'a<br/>"
                    "<b>3)</b> Oybo'yirqal'a"
                    "</div>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.7;'>"
                    "<b>a)</b> Mahalliy hukmdor qarorgohi bo'lgan qal'a (mil.avv. VII asr)<br/>"
                    "<b>b)</b> Milodiy II-III asrda ulug'vor qurilish olib borilgan shahar<br/>"
                    "<b>c)</b> Eng qadimgi mahalliy yozuv topilgan yodgorlik"
                    "</div>"
                    "</div>"
                ),
                "explanation": "1-a (Ko'zaliqir — VII asr qal'a), 2-b (Tuproqqal'a — II-III asr saroyi), 3-c (Oybo'yirqal'a — eng qadimgi yozuv).",
                "options": [
                    ("A", "1-a; 2-b; 3-c", True),
                    ("B", "1-b; 2-a; 3-c", False),
                    ("C", "1-c; 2-a; 3-b", False),
                    ("D", "1-a; 2-c; 3-b", False),
                ],
            },
            # 32
            {
                "body": (
                    "<p>Buyuk Ipak yo'li orqali qaysi mahsulotlar Xitoyga olib borilgan?</p>"
                    "<div style='padding:10px;border:1px solid #cbd5e1;border-radius:8px;background:rgba(100,116,139,0.05);line-height:1.7;font-size:13.5px;margin:10px 0;'>"
                    "1) Jun gazlama<br/>"
                    "2) Zeb-ziynat buyumlari<br/>"
                    "3) Guruch<br/>"
                    "4) Ipak matolar<br/>"
                    "5) Qimmatbaho toshlar<br/>"
                    "6) Choy"
                    "</div>"
                ),
                "explanation": "Guruch, ipak matolar va choy aksincha Xitoydan O'rta Osiyo va G'arbga olib kelingan. Xitoyga esa jun gazlamalar, zeb-ziynat va qimmatbaho toshlar olib borilgan.",
                "options": [
                    ("A", "1, 2, 5", True),
                    ("B", "3, 4, 6", False),
                    ("C", "1, 3, 5", False),
                    ("D", "2, 4, 6", False),
                ],
            },
            # 33 (Bank A-F)
            {
                "body": (
                    "<div style='padding:12px 14px;background:rgba(59,130,246,0.08);border:1px solid rgba(59,130,246,0.3);border-radius:8px;font-size:13px;line-height:1.7;margin-bottom:12px;'>"
                    "<b>33–35-topshiriqlarga mos javoblarni quyidagi banklardan (A–F) tanlang:</b><br/>"
                    "<b>A)</b> Kir IIning massagetlar bilan jangda halok bo'lishi (mil.avv. 530);<br/>"
                    "<b>B)</b> Spitaman qo'zg'olonining bostirilishi (mil.avv. 328);<br/>"
                    "<b>C)</b> Kann jangi (mil.avv. 216);<br/>"
                    "<b>D)</b> Zama jangi (mil.avv. 202);<br/>"
                    "<b>E)</b> Karfagenning vayron qilinishi (mil.avv. 146);<br/>"
                    "<b>F)</b> Yunon-Baqtriya davlatining tashkil topishi (mil.avv. 250)"
                    "</div>"
                    "<p><b>Berilgan voqealardan qaysi biri eng avval sodir bo'lgan?</b></p>"
                ),
                "explanation": "Mil.avv. 530-yil — ro'yxatdagi eng qadimgi sana. To'g'ri javob: A (Kir IIning massagetlar bilan jangda halok bo'lishi).",
                "options": [
                    ("A", "Kir IIning massagetlar bilan jangda halok bo'lishi (mil.avv. 530)", True),
                    ("B", "Spitaman qo'zg'olonining bostirilishi (mil.avv. 328)", False),
                    ("C", "Kann jangi (mil.avv. 216)", False),
                    ("D", "Zama jangi (mil.avv. 202)", False),
                    ("E", "Karfagenning vayron qilinishi (mil.avv. 146)", False),
                    ("F", "Yunon-Baqtriya davlatining tashkil topishi (mil.avv. 250)", False),
                ],
            },
            # 34 (Bank A-F)
            {
                "body": (
                    "<div style='padding:12px 14px;background:rgba(59,130,246,0.08);border:1px solid rgba(59,130,246,0.3);border-radius:8px;font-size:13px;line-height:1.7;margin-bottom:12px;'>"
                    "<b>33–35-topshiriqlarga mos javoblarni quyidagi banklardan (A–F) tanlang:</b><br/>"
                    "<b>A)</b> Kir IIning massagetlar bilan jangda halok bo'lishi (mil.avv. 530);<br/>"
                    "<b>B)</b> Spitaman qo'zg'olonining bostirilishi (mil.avv. 328);<br/>"
                    "<b>C)</b> Kann jangi (mil.avv. 216);<br/>"
                    "<b>D)</b> Zama jangi (mil.avv. 202);<br/>"
                    "<b>E)</b> Karfagenning vayron qilinishi (mil.avv. 146);<br/>"
                    "<b>F)</b> Yunon-Baqtriya davlatining tashkil topishi (mil.avv. 250)"
                    "</div>"
                    "<p><b>Gannibalning yakuniy mag'lubiyatga uchrashiga sabab bo'lgan jangni aniqlang.</b></p>"
                ),
                "explanation": "Zama jangida (mil.avv. 202) Ssipion Gannibal qo'shinini tor-mor etdi. To'g'ri javob: D.",
                "options": [
                    ("A", "Kir IIning massagetlar bilan jangda halok bo'lishi (mil.avv. 530)", False),
                    ("B", "Spitaman qo'zg'olonining bostirilishi (mil.avv. 328)", False),
                    ("C", "Kann jangi (mil.avv. 216)", False),
                    ("D", "Zama jangi (mil.avv. 202)", True),
                    ("E", "Karfagenning vayron qilinishi (mil.avv. 146)", False),
                    ("F", "Yunon-Baqtriya davlatining tashkil topishi (mil.avv. 250)", False),
                ],
            },
            # 35 (Bank A-F)
            {
                "body": (
                    "<div style='padding:12px 14px;background:rgba(59,130,246,0.08);border:1px solid rgba(59,130,246,0.3);border-radius:8px;font-size:13px;line-height:1.7;margin-bottom:12px;'>"
                    "<b>33–35-topshiriqlarga mos javoblarni quyidagi banklardan (A–F) tanlang:</b><br/>"
                    "<b>A)</b> Kir IIning massagetlar bilan jangda halok bo'lishi (mil.avv. 530);<br/>"
                    "<b>B)</b> Spitaman qo'zg'olonining bostirilishi (mil.avv. 328);<br/>"
                    "<b>C)</b> Kann jangi (mil.avv. 216);<br/>"
                    "<b>D)</b> Zama jangi (mil.avv. 202);<br/>"
                    "<b>E)</b> Karfagenning vayron qilinishi (mil.avv. 146);<br/>"
                    "<b>F)</b> Yunon-Baqtriya davlatining tashkil topishi (mil.avv. 250)"
                    "</div>"
                    "<p><b>Berilgan voqealardan qaysi biri eng keyin sodir bo'lgan?</b></p>"
                ),
                "explanation": "Mil.avv. 146-yil — ro'yxatdagi eng so'nggi sana. To'g'ri javob: E (Karfagenning vayron qilinishi).",
                "options": [
                    ("A", "Kir IIning massagetlar bilan jangda halok bo'lishi (mil.avv. 530)", False),
                    ("B", "Spitaman qo'zg'olonining bostirilishi (mil.avv. 328)", False),
                    ("C", "Kann jangi (mil.avv. 216)", False),
                    ("D", "Zama jangi (mil.avv. 202)", False),
                    ("E", "Karfagenning vayron qilinishi (mil.avv. 146)", True),
                    ("F", "Yunon-Baqtriya davlatining tashkil topishi (mil.avv. 250)", False),
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
                "title": "Ahamoniylar bosqini.",
                "parts": [
                    ("a", "Kir II bilan jangda g'olib chiqqan massagetlar malikasini yozing.", "To'maris"),
                    ("b", "Doro I ni saklarga qarshi yurishida aldagan sak cho'ponini yozing.", "Shiroq"),
                ],
                "explanation": "a) To'maris; b) Shiroq.",
            },
            # 37
            {
                "title": "Aleksandr yurishlari.",
                "parts": [
                    ("a", "Aleksandr Sharqqa yurishni qaysi yilda boshlaganini yozing.", "Mil.avv. 334-yilda (mil.avv. 334)"),
                    ("b", "So'g'diyonalik qo'zg'olon boshlig'ini yozing.", "Spitaman"),
                ],
                "explanation": "a) Mil.avv. 334-yilda; b) Spitaman.",
            },
            # 38
            {
                "title": "Salavkiylar va Yunon-Baqtriya.",
                "parts": [
                    ("a", "Salavkiylar davlatiga asos solgan shaxsni yozing.", "Salavk"),
                    ("b", "Yunon-Baqtriya davlatiga asos solgan hukmdorni yozing.", "Diodot"),
                ],
                "explanation": "a) Salavk; b) Diodot.",
            },
            # 39
            {
                "title": "Qadimgi Xorazm.",
                "parts": [
                    ("a", "Eng qadimgi mahalliy yozuv topilgan Xorazm yodgorligini yozing.", "Oybo'yirqal'a"),
                    ("b", "Milodiy II-III asrda ulug'vor qurilish olib borilgan Xorazm shahrini yozing.", "Tuproqqal'a"),
                ],
                "explanation": "a) Oybo'yirqal'a; b) Tuproqqal'a.",
            },
            # 40
            {
                "title": "Qang' va Davan davlatlari.",
                "parts": [
                    ("a", "Qang' davlatining poytaxtini yozing.", "Qang'dez (Bityan)"),
                    ("b", "Davan davlatining poytaxtini yozing.", "Ershi"),
                ],
                "explanation": "a) Qang'dez (Bityan); b) Ershi.",
            },
            # 41
            {
                "title": "Kushon davlati.",
                "parts": [
                    ("a", "Kushon davlatiga asos solgan hukmdorni yozing.", "Kudzula Kadfiz"),
                    ("b", "Kushon davlatini taraqqiyot cho'qqisiga olib chiqqan, poytaxtni Peshovarga ko'chirgan hukmdorni yozing.", "Kanishka"),
                ],
                "explanation": "a) Kudzula Kadfiz; b) Kanishka.",
            },
            # 42
            {
                "title": "Buyuk Ipak yo'li.",
                "parts": [
                    ("a", "«Ipak yo'li» nomini bergan nemis geografini yozing.", "F. Rixtgofen (Ferdinand Rixtgofen)"),
                    ("b", "Xunnlarga qarshi ittifoqchi izlab yuborilgan Xitoy elchisini yozing.", "Chjan Syan"),
                ],
                "explanation": "a) F. Rixtgofen; b) Chjan Syan.",
            },
            # 43
            {
                "title": "Rim shahrining tashkil topishi.",
                "parts": [
                    ("a", "Rimga asos solgan aka-ukalarni yozing.", "Romul va Rem"),
                    ("b", "Rim respublika deb e'lon qilingan yilni yozing.", "Mil.avv. 509-yil (mil.avv. 509)"),
                ],
                "explanation": "a) Romul va Rem; b) Mil.avv. 509-yil.",
            },
            # 44
            {
                "title": "Rim respublikasi boshqaruvi.",
                "parts": [
                    ("a", "Rimning tub aholisini yozing.", "Patritsiylar"),
                    ("b", "Rimga ko'chib kelganlar va ularning avlodlarini yozing.", "Plebeylar"),
                ],
                "explanation": "a) Patritsiylar; b) Plebeylar.",
            },
            # 45
            {
                "title": "Puni urushlari.",
                "parts": [
                    ("a", "Karfagen sarkardasini yozing.", "Gannibal"),
                    ("b", "Uni tor-mor etgan rimlik sarkardani yozing.", "Ssipion"),
                ],
                "explanation": "a) Gannibal; b) Ssipion.",
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
                f"   • Bildirishnoma  : O'quvchilarga (Sayt & Telegram) avtomatik yuboriladi\n"
            )
        )
