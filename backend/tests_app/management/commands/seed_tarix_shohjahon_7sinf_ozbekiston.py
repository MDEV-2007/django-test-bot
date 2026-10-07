"""Django management command: Sodiqov Shohjahon ustozning 7-sinf O'zbekiston Tarixi Milliy Sertifikat mock testini yaratish.

Mavzu: Eski va yangi nashr darsliklari asosida · IV--XIII asrlar.
35 ta test topshirig'i (A, B, C, D) va 10 ta yozma (ochiq) savol. Jami: 45 ta topshiriq.
Barcha diagrammalar, jadvallar, Eyler-Venn sxemalari va xronologik mosliklar birga-bir aniqlikda joylangan.

Muallif/O'qituvchi: shohjahon (Sodiqov Shohjahon, @TarixMilliyCertificate)

Foydalanish:
    python manage.py seed_tarix_shohjahon_7sinf_ozbekiston
    python manage.py seed_tarix_shohjahon_7sinf_ozbekiston --force
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from django.contrib.auth.models import User

from accounts.models import Profile, ensure_profile_for_user
from tests_app.models import Subject, TestSet, Question, AnswerOption, SubQuestion


MOCK_TITLE = "7-sinf O'zbekiston Tarixi — Milliy Sertifikat (IV–XIII asrlar) | Shohjahon"
MOCK_DESC = (
    "Eski va yangi nashr darsliklari asosida · IV--XIII asrlar. "
    "35 ta test topshirig'i (A, B, C, D) va 10 ta yozma (ochiq) savol. Jami: 45 ta topshiriq. "
    "Ustoz: Sodiqov Shohjahon (@TarixMilliyCertificate)."
)


class Command(BaseCommand):
    help = "Sodiqov Shohjahon ustoz nomidan 7-sinf O'zbekiston Tarixi 45 talik Milliy Sertifikat testini yuklaydi."

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
                        f"Qayta yuklash uchun: python manage.py seed_tarix_shohjahon_7sinf_ozbekiston --force"
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
                "body": "<p>Sosoniylar shohi Pero’z eftallar qo’lida qaysi yilda halok bo’lgan?</p>",
                "explanation": "484-yilda eftallar bilan bo'lgan jangda Eftallar hukmdori Vaxshunvor qo'shinlari Sosoniylar shohi Pero'zni mag'lub etib, uni halok qilgan.",
                "options": [
                    ("A", "456-yil", False),
                    ("B", "484-yil", True),
                    ("C", "563-yil", False),
                    ("D", "552-yil", False),
                ],
            },
            # 2
            {
                "body": (
                    "<p>Quyida berilgan ilk o’rta asr davlatlari va ularga oid ma’lumotlarni to’g’ri moslashtiring.</p>"
                    "<div style='background:#f8fafc;padding:12px 16px;border-radius:10px;border:1px solid #e2e8f0;margin:12px 0;font-size:13px;line-height:1.7;'>"
                    "<b>I.</b> Xioniylar<br/>"
                    "<b>II.</b> Kidariylar<br/>"
                    "<b>III.</b> Eftallar<br/>"
                    "<b>IV.</b> Turk xoqonligi<br/><br/>"
                    "<b>a)</b> 552-yilda tashkil topgan, asoschisi Bumin<br/>"
                    "<b>b)</b> IV asrning 70-yillarida kuchaygan birinchi ilk o’rta asr davlati<br/>"
                    "<b>c)</b> 456-yilda sosoniylar bilan jang qilgan<br/>"
                    "<b>d)</b> 484-yilda shoh Pero’zni mag’lub etgan"
                    "</div>"
                ),
                "explanation": "I - b (Xioniylar IV asr 70-yillarida kuchaygan), II - c (Kidariylar 456-yilda jang qilgan), III - d (Eftallar 484-yilda Pero'zni mag'lub etgan), IV - a (Turk xoqonligi 552-yilda Bumin tomonidan asos solingan).",
                "options": [
                    ("A", "I-c, II-b, III-a, IV-d", False),
                    ("B", "I-a, II-d, III-b, IV-c", False),
                    ("C", "I-d, II-a, III-c, IV-b", False),
                    ("D", "I-b, II-c, III-d, IV-a", True),
                ],
            },
            # 3
            {
                "body": "<p>Ilk o’rta asrlarda yirik yer egalari qanday atalgan?</p>",
                "explanation": "Ilk o'rta asrlarda yirik yer egalari dehqonlar, ularga qaram erkin dehqonlar esa kadivarlar deb atalgan.",
                "options": [
                    ("A", "Dehqonlar", True),
                    ("B", "Kadivarlar", False),
                    ("C", "Chokarlar", False),
                    ("D", "Qullar", False),
                ],
            },
            # 4
            {
                "body": (
                    "<p>Quyidagi voqealarni to’g’ri xronologik ketma-ketlikda joylashtiring.</p>"
                    "<div style='background:#f8fafc;padding:12px 16px;border-radius:10px;border:1px solid #e2e8f0;margin:12px 0;font-size:13px;line-height:1.7;'>"
                    "1) Bumin Turk xoqonligiga asos solishi (552)<br/>"
                    "2) Abruy qo’zg’oloni (585–586)<br/>"
                    "3) Qutaybaning Xorazmni zabt etishi (711)<br/>"
                    "4) Ismoil Somoniyning Movarounnahrni birlashtirishi (892)<br/>"
                    "5) Mahmud G’aznaviyning Dandanaqonda mag’lub bo’lishi (1040)<br/>"
                    "6) Anushteginiylar sulolasining boshlanishi (1097)"
                    "</div>"
                ),
                "explanation": "Ketma-ketlik: 552 (1) -> 585-586 (2) -> 711 (3) -> 892 (4) -> 1040 (5) -> 1097 (6). Ya'ni 1, 2, 3, 4, 5, 6.",
                "options": [
                    ("A", "2, 1, 3, 4, 5, 6", False),
                    ("B", "1, 3, 2, 4, 5, 6", False),
                    ("C", "1, 2, 3, 4, 5, 6", True),
                    ("D", "1, 2, 4, 3, 5, 6", False),
                ],
            },
            # 5
            {
                "body": (
                    "<p>Quyida berilgan Arab xalifaligi soliqlari va ularning izohini to’g’ri moslashtiring.</p>"
                    "<div style='background:#f8fafc;padding:12px 16px;border-radius:10px;border:1px solid #e2e8f0;margin:12px 0;font-size:13px;line-height:1.7;'>"
                    "<b>I.</b> Xiroj<br/>"
                    "<b>II.</b> Jizya<br/>"
                    "<b>III.</b> Zakot<br/>"
                    "<b>IV.</b> Ushr<br/><br/>"
                    "<b>a)</b> Yer solig’i, hosilning 1/3 qismi<br/>"
                    "<b>b)</b> Musulmon bo’lmaganlardan olinadigan jon solig’i<br/>"
                    "<b>c)</b> Chorva va savdodan olinadigan, 1/40 hissa<br/>"
                    "<b>d)</b> Daromadning 1/10 qismi<br/>"
                    "<b>e)</b> Yer ijarasi solig’i"
                    "</div>"
                ),
                "explanation": "Xiroj - hosilning 1/3 qismi (a), Jizya - g'ayridinlardan olinadigan jon solig'i (b), Zakot - mol-mulk va chorvadan 1/40 hissa (c), Ushr - daromadning 1/10 qismi (d).",
                "options": [
                    ("A", "I-b, II-a, III-c, IV-d", False),
                    ("B", "I-a, II-b, III-c, IV-d", True),
                    ("C", "I-a, II-c, III-b, IV-d", False),
                    ("D", "I-a, II-b, III-d, IV-c", False),
                ],
            },
            # 6
            {
                "body": (
                    "<p>Quyida berilgan ijtimoiy tabaqalar va ularning izohini to’g’ri moslashtiring.</p>"
                    "<div style='background:#f8fafc;padding:12px 16px;border-radius:10px;border:1px solid #e2e8f0;margin:12px 0;font-size:13px;line-height:1.7;'>"
                    "<b>I.</b> Dehqon<br/>"
                    "<b>II.</b> Kadivar<br/>"
                    "<b>III.</b> Chokar<br/>"
                    "<b>IV.</b> Qul<br/><br/>"
                    "<b>a)</b> Yer egasi, zodagon<br/>"
                    "<b>b)</b> Yarim qaram dehqon, yer egasiga bog’liq<br/>"
                    "<b>c)</b> Xizmatkor, otliq harbiy xizmatchi<br/>"
                    "<b>d)</b> To’liq huquqsiz, mol-mulk kabi sotiladigan shaxs"
                    "</div>"
                ),
                "explanation": "Dehqon - yer egasi, zodagon (a); Kadivar - qaram dehqon (b); Chokar - otliq harbiy soqchi/xizmatkor (c); Qul - to'liq huquqsiz shaxs (d).",
                "options": [
                    ("A", "I-b, II-a, III-d, IV-c", False),
                    ("B", "I-a, II-c, III-b, IV-d", False),
                    ("C", "I-c, II-b, III-a, IV-d", False),
                    ("D", "I-a, II-b, III-c, IV-d", True),
                ],
            },
            # 7
            {
                "body": "<p>Tarixiy shaxsni aniqlang. 552-yilda Yabg’u unvonini qabul qilib, Turk xoqonligiga asos solgan sardor.</p>",
                "explanation": "552-yilda Bumin jo'janlar (avariyaliklar) ustidan g'alaba qozonib, Yabg'u (xoqon) unvonini oldi va Turk xoqonligiga asos soldi.",
                "options": [
                    ("A", "Bumin", True),
                    ("B", "Istami", False),
                    ("C", "Mug’an xon", False),
                    ("D", "To’n yabg’u", False),
                ],
            },
            # 8
            {
                "body": "<p>Tarixiy shaxsni aniqlang. 712-yilda Samarqandni egallab, mahalliy hukmdor G’urakni taslim bo’lishga majbur etgan arab sarkardasi.</p>",
                "explanation": "Qutayba ibn Muslim 712-yilda Samarqandni qamal qilib egallagan va So'g'd hukmdori G'urak bilan sulh tuzib taslim etgan.",
                "options": [
                    ("A", "Nasr ibn Sayyor", False),
                    ("B", "Abu Muslim", False),
                    ("C", "Qutayba ibn Muslim", True),
                    ("D", "Muhammad ibn Qosim", False),
                ],
            },
            # 9
            {
                "body": "<p>Tarixiy hodisani aniqlang. 585–586-yillarda Buxoroda turk hukmronligiga qarshi ko’tarilgan qo’zg’olon.</p>",
                "explanation": "585-586-yillarda Buxoroda mahalliy boylar va turk zodagonlariga qarshi Abruy boshchiligida xalq qo'zg'oloni ko'tarilgan.",
                "options": [
                    ("A", "Rofe ibn Lays qo’zg’oloni", False),
                    ("B", "Abruy qo’zg’oloni", True),
                    ("C", "Muqanna qo’zg’oloni", False),
                    ("D", "Abu Muslim qo’zg’oloni", False),
                ],
            },
            # 10
            {
                "body": "<p>Tarixiy shaxsni aniqlang. 751-yilgi Talos jangida arab lashkarini boshqargan va g’alabadan so’ng xitoylik asir ustalar orqali qog’oz ishlab chiqarish sirini o’zlashtirgan qo’mondon.</p>",
                "explanation": "751-yilda Talos daryosi bo'yida Ziyod ibn Solih boshchiligidagi arab qo'shini Tan imperiyasi lashkarini yengdi va qog'oz ishlab chiqarish Samarqandda yo'lga qo'yildi.",
                "options": [
                    ("A", "Qutayba ibn Muslim", False),
                    ("B", "Abu Muslim", False),
                    ("C", "Nasr ibn Sayyor", False),
                    ("D", "Ziyod ibn Solih", True),
                ],
            },
            # 11
            {
                "body": (
                    "<p>Quyidagi hukmdorlardan qaysilari Somoniylar sulolasiga tegishli?</p>"
                    "<div style='background:#f8fafc;padding:12px 16px;border-radius:10px;border:1px solid #e2e8f0;margin:12px 0;font-size:13px;line-height:1.7;'>"
                    "1) Ismoil Somoniy<br/>"
                    "2) Nasr ibn Ahmad<br/>"
                    "3) Ahmad ibn Asad<br/>"
                    "4) Nuh ibn Mansur<br/>"
                    "5) Alptegin<br/>"
                    "6) Sobuqtegin"
                    "</div>"
                ),
                "explanation": "1, 2, 3, 4 Somoniylar sulolasi vakillari. 5 (Alptegin) va 6 (Sobuqtegin) esa G'aznaviylar sulolasiga mansub.",
                "options": [
                    ("A", "1, 2, 3, 4", True),
                    ("B", "1, 2, 3, 6", False),
                    ("C", "2, 3, 4, 5", False),
                    ("D", "1, 4, 5, 6", False),
                ],
            },
            # 12
            {
                "body": "<p>Talos jangi (751-yil) qaysi ikki davlat o’rtasida bo’lib o’tgan?</p>",
                "explanation": "Talos jangi 751-yilda Arab xalifaligi (hamda qarluqlar ittifoqi) va Xitoyning Tang (Tan) imperiyasi o'rtasida sodir bo'lgan.",
                "options": [
                    ("A", "Turk xoqonligi va Sosoniylar", False),
                    ("B", "Arab xalifaligi va Vizantiya", False),
                    ("C", "Arab xalifaligi va Tang imperiyasi (Xitoy)", True),
                    ("D", "Somoniylar va Qoraxoniylar", False),
                ],
            },
            # 13
            {
                "body": "<p>VIII asr boshlarida Movarounnahr uchun xos bo’lgan holatni aniqlang.</p>",
                "explanation": "VIII asr boshlarida (705-715-yillar) Qutayba ibn Muslim boshchiligidagi arab qo'shinlari Movarounnahr shaharlarini bosqichma-bosqich zabt etdi.",
                "options": [
                    ("A", "Mintaqada hech qanday qarshilik ko’rsatilmadi", False),
                    ("B", "Qutayba ibn Muslim boshchiligida arablar bosqichma-bosqich hududni zabt etdi", True),
                    ("C", "Islom dini faqat shaharlarda tarqaldi, qishloqlarga kirmadi", False),
                    ("D", "Mahalliy sulolalar butunlay yo’q qilindi", False),
                ],
            },
            # 14
            {
                "body": (
                    "<p>Quyidagi qo’zg’olonlardan qaysilari arab xalifaligiga qarshi Movarounnahr va Xurosonda bo’lib o’tgan?</p>"
                    "<div style='background:#f8fafc;padding:12px 16px;border-radius:10px;border:1px solid #e2e8f0;margin:12px 0;font-size:13px;line-height:1.7;'>"
                    "1) Abu Muslim qo’zg’oloni<br/>"
                    "2) Muqanna qo’zg’oloni<br/>"
                    "3) G’urak-Divashtich qo’zg’oloni<br/>"
                    "4) Spartak qo’zg’oloni<br/>"
                    "5) Rofe ibn Lays qo’zg’oloni<br/>"
                    "6) Vat Tayler qo’zg’oloni"
                    "</div>"
                ),
                "explanation": "1, 2, 3 va 5 Arab xalifaligiga qarshi Movarounnahr va Xurosonda bo'lgan. 4 (Spartak) qadimgi Rimda, 6 (Vat Tayler) Angliyada bo'lgan.",
                "options": [
                    ("A", "1, 2, 3, 4", False),
                    ("B", "1, 3, 4, 6", False),
                    ("C", "2, 3, 5, 6", False),
                    ("D", "1, 2, 3, 5", True),
                ],
            },
            # 15
            {
                "body": "<p>Talos jangidan keyin Movarounnahrda mashhur bo’lib ketgan va dastlab Xitoyda ixtiro etilgan mahsulotni aniqlang.</p>",
                "explanation": "751-yilgi Talos jangidan so'ng Samarqandda qog'oz ishlab chiqarish yo'lga qo'yildi va mashhur 'Samarqand qog'ozi' butun dunyoga tarqaldi.",
                "options": [
                    ("A", "Qog’oz", True),
                    ("B", "Chinni", False),
                    ("C", "Ipak", False),
                    ("D", "Porox", False),
                ],
            },
            # 16
            {
                "body": "<p>Tarixiy shaxsni aniqlang. 705–715-yillarda Xurosonga noib etib tayinlanib, Movarounnahrda arab hokimiyatini mustahkamlagan, biroq 715-yilda Farg’onada halok bo’lgan sarkarda.</p>",
                "explanation": "Qutayba ibn Muslim 705-715 yillarda Movarounnahrni zabt etgan va 715-yilda xalifaga bo'ysunmay isyon ko'tarib, Farg'onada o'z lashkarlari tomonidan o'ldirilgan.",
                "options": [
                    ("A", "Nasr ibn Sayyor", False),
                    ("B", "Asad ibn Abdulloh", False),
                    ("C", "Qutayba ibn Muslim", True),
                    ("D", "Said ibn Usmon", False),
                ],
            },
            # 17 (DIAGRAMMA)
            {
                "body": (
                    "<p>Sxematik diagrammada Somoniylar sulolasining uchta hukmdori hukmronlik davri ko’rsatilgan. 1–3 raqamlaridan qaysi biri <b>Ismoil Somoniy</b> hukmronligiga to’g’ri keladi?</p>"
                    "<div style='display:flex;flex-direction:column;align-items:center;gap:8px;margin:18px auto;max-width:440px;'>"
                    "<div style='width:100%;padding:10px 14px;border:2px solid #3b82f6;border-radius:10px;background:#eff6ff;text-align:center;font-weight:600;color:#1e40af;box-shadow:0 1px 3px rgba(0,0,0,0.05);'>"
                    "1 – 864–892-yillar (Nasr I ibn Ahmad)"
                    "</div>"
                    "<div style='color:#64748b;font-size:16px;'>↓</div>"
                    "<div style='width:100%;padding:10px 14px;border:2px solid #2563eb;border-radius:10px;background:#dbeafe;text-align:center;font-weight:700;color:#1d4ed8;box-shadow:0 1px 3px rgba(0,0,0,0.05);'>"
                    "2 – 892–907-yillar"
                    "</div>"
                    "<div style='color:#64748b;font-size:16px;'>↓</div>"
                    "<div style='width:100%;padding:10px 14px;border:2px solid #3b82f6;border-radius:10px;background:#eff6ff;text-align:center;font-weight:600;color:#1e40af;box-shadow:0 1px 3px rgba(0,0,0,0.05);'>"
                    "3 – 907–914-yillar (Ahmad ibn Ismoil)"
                    "</div>"
                    "</div>"
                ),
                "explanation": "Ismoil Somoniy 892–907-yillarda butun Movarounnahr va Xurosonni yagona Somoniylar davlatiga birlashtirib boshqargan (2-raqam).",
                "options": [
                    ("A", "1", False),
                    ("B", "2", True),
                    ("C", "3", False),
                    ("D", "Hech biri", False),
                ],
            },
            # 18 (JADVAL VOQEA-NATIJA)
            {
                "body": (
                    "<p>Jadvaldagi voqea va natijalardan qaysi birlari to’g’ri moslashtirilgan?</p>"
                    "<div style='overflow-x:auto;margin:14px 0;'>"
                    "<table style='width:100%;border-collapse:collapse;font-size:13px;border:1px solid #cbd5e1;'>"
                    "<thead>"
                    "<tr style='background:#f1f5f9;border-bottom:2px solid #cbd5e1;'>"
                    "<th style='padding:8px 10px;border:1px solid #cbd5e1;text-align:center;width:35px;'>#</th>"
                    "<th style='padding:8px 12px;border:1px solid #cbd5e1;text-align:left;'>Voqea</th>"
                    "<th style='padding:8px 12px;border:1px solid #cbd5e1;text-align:left;'>Natija</th>"
                    "</tr>"
                    "</thead>"
                    "<tbody>"
                    "<tr><td style='padding:7px;border:1px solid #cbd5e1;text-align:center;font-weight:600;'>1</td><td style='padding:7px 10px;border:1px solid #cbd5e1;'>Qutaybaning Samarqandni egallashi (712)</td><td style='padding:7px 10px;border:1px solid #cbd5e1;'>G’urak taslim bo’lib, shahar arablar nazoratiga o’tdi</td></tr>"
                    "<tr style='background:#f8fafc;'><td style='padding:7px;border:1px solid #cbd5e1;text-align:center;font-weight:600;'>2</td><td style='padding:7px 10px;border:1px solid #cbd5e1;'>Ismoil Somoniyning Movarounnahrni birlashtirishi (892)</td><td style='padding:7px 10px;border:1px solid #cbd5e1;'>Somoniylar davlati markazlashdi</td></tr>"
                    "<tr><td style='padding:7px;border:1px solid #cbd5e1;text-align:center;font-weight:600;'>3</td><td style='padding:7px 10px;border:1px solid #cbd5e1;'>Dandanaqon jangi (1040)</td><td style='padding:7px 10px;border:1px solid #cbd5e1;'>Saljuqiylar mustaqil davlat tuzdi</td></tr>"
                    "<tr style='background:#f8fafc;'><td style='padding:7px;border:1px solid #cbd5e1;text-align:center;font-weight:600;'>4</td><td style='padding:7px 10px;border:1px solid #cbd5e1;'>Qatvon jangi (1141)</td><td style='padding:7px 10px;border:1px solid #cbd5e1;'>Qoraxoniylar davlati qoraxitoylar tomonidan tor-mor etildi</td></tr>"
                    "<tr><td style='padding:7px;border:1px solid #cbd5e1;text-align:center;font-weight:600;'>5</td><td style='padding:7px 10px;border:1px solid #cbd5e1;'>Urganchning mo’g’ullar tomonidan bosib olinishi (1221)</td><td style='padding:7px 10px;border:1px solid #cbd5e1;'>Xorazmshohlar davlati saqlanib qoldi</td></tr>"
                    "<tr style='background:#f8fafc;'><td style='padding:7px;border:1px solid #cbd5e1;text-align:center;font-weight:600;'>6</td><td style='padding:7px 10px;border:1px solid #cbd5e1;'>Mahmud G’aznaviyning Hindistonga yurishlari</td><td style='padding:7px 10px;border:1px solid #cbd5e1;'>Islom dini Hindistonda tarqala boshladi</td></tr>"
                    "</tbody>"
                    "</table>"
                    "</div>"
                ),
                "explanation": "5-band xato: 1221-yilda Urganch vayron qilindi va Xorazmshohlar davlati quladi (saqlanib qolmadi). 1, 2, 3, 4 va 6 to'g'ri moslashtirilgan.",
                "options": [
                    ("A", "1, 2, 4, 5, 6", False),
                    ("B", "2, 3, 4, 5, 6", False),
                    ("C", "1, 3, 4, 5, 6", False),
                    ("D", "1, 2, 3, 4, 6", True),
                ],
            },
            # 19 (TIMELINE JADVAL)
            {
                "body": (
                    "<p>Jadvalda harflar bilan belgilangan o’rinlarga mos keluvchi ma’lumotni toping.</p>"
                    "<div style='overflow-x:auto;margin:14px 0;'>"
                    "<table style='width:100%;border-collapse:collapse;font-size:13px;border:1px solid #cbd5e1;'>"
                    "<thead>"
                    "<tr style='background:#f1f5f9;border-bottom:2px solid #cbd5e1;'>"
                    "<th style='padding:8px 10px;border:1px solid #cbd5e1;text-align:center;width:85px;'>Asr</th>"
                    "<th style='padding:8px 12px;border:1px solid #cbd5e1;text-align:left;'>O’zbekiston tarixidagi voqea</th>"
                    "<th style='padding:8px 12px;border:1px solid #cbd5e1;text-align:left;'>Jahon tarixidagi voqea</th>"
                    "</tr>"
                    "</thead>"
                    "<tbody>"
                    "<tr>"
                    "<td style='padding:8px;border:1px solid #cbd5e1;text-align:center;font-weight:bold;'>VIII asr</td>"
                    "<td style='padding:8px;border:1px solid #cbd5e1;text-align:center;font-weight:bold;color:#2563eb;background:#eff6ff;'>a</td>"
                    "<td style='padding:8px;border:1px solid #cbd5e1;'>Abbosiylar xalifaligi boshlandi (750)</td>"
                    "</tr>"
                    "<tr style='background:#f8fafc;'>"
                    "<td style='padding:8px;border:1px solid #cbd5e1;text-align:center;font-weight:bold;'>X asr</td>"
                    "<td style='padding:8px;border:1px solid #cbd5e1;'>Somoniylar davlati gullab-yashnadi</td>"
                    "<td style='padding:8px;border:1px solid #cbd5e1;text-align:center;font-weight:bold;color:#2563eb;background:#eff6ff;'>b</td>"
                    "</tr>"
                    "</tbody>"
                    "</table>"
                    "</div>"
                    "<div style='font-size:12.5px;color:#334155;background:#f8fafc;padding:10px 14px;border-radius:8px;border:1px solid #e2e8f0;margin-top:8px;'>"
                    "<b>Ma’lumotlar:</b><br/>"
                    "1) Qutayba ibn Muslimning Movarounnahrni zabt etishni boshlashi (705);<br/>"
                    "2) Muqaddas Rim imperiyasi tashkil topdi (962);<br/>"
                    "3) Birinchi salib yurishi boshlandi (1096);<br/>"
                    "4) Chjurchjenlar davlati tuzildi (1115)."
                    "</div>"
                ),
                "explanation": "a=1 (705-yil VIII asrga to'g'ri keladi), b=2 (962-yil X asrga to'g'ri keladi).",
                "options": [
                    ("A", "a-1, b-2", True),
                    ("B", "a-3, b-4", False),
                    ("C", "a-1, b-4", False),
                    ("D", "a-3, b-2", False),
                ],
            },
            # 20 (EYLER-VENN DIAGRAMMA)
            {
                "body": (
                    "<p>Quyida berilgan ma’lumotlarni tahlil qilib <b>Eyler-Venn diagrammasiga</b> mos keladigan javoblarni aniqlang. <i>(Somoniylar davlati va Qoraxoniylar davlati)</i></p>"
                    "<div style='display:flex;justify-content:center;margin:16px 0;'>"
                    "<svg width='360' height='180' viewBox='0 0 360 180' style='max-width:100%;'>"
                    "<circle cx='130' cy='90' r='75' fill='rgba(37, 99, 235, 0.12)' stroke='#2563eb' stroke-width='2'/>"
                    "<circle cx='230' cy='90' r='75' fill='rgba(16, 185, 129, 0.12)' stroke='#10b981' stroke-width='2'/>"
                    "<text x='95' y='75' font-size='16' font-weight='bold' fill='#1d4ed8' text-anchor='middle'>I</text>"
                    "<text x='95' y='95' font-size='12' font-weight='600' fill='#1e40af' text-anchor='middle'>Somoniylar</text>"
                    "<text x='180' y='85' font-size='16' font-weight='bold' fill='#6d28d9' text-anchor='middle'>III</text>"
                    "<text x='265' y='75' font-size='16' font-weight='bold' fill='#047857' text-anchor='middle'>II</text>"
                    "<text x='265' y='95' font-size='12' font-weight='600' fill='#065f46' text-anchor='middle'>Qoraxoniylar</text>"
                    "</svg>"
                    "</div>"
                    "<div style='font-size:12.5px;color:#334155;line-height:1.7;background:#f8fafc;padding:12px;border-radius:8px;border:1px solid #e2e8f0;'>"
                    "<b>a)</b> Turkiy sulola boshqargan;<br/>"
                    "<b>b)</b> Islom dinini davlat dini sifatida tutgan;<br/>"
                    "<b>c)</b> Movarounnahrda hukmronlik qilgan;<br/>"
                    "<b>d)</b> Forscha-tojikcha til rasmiy til bo’lgan;<br/>"
                    "<b>e)</b> Turkiy adabiyot (Qutadg’u bilig, Devonu lug’otit turk) shu davrda yuksaldi;<br/>"
                    "<b>f)</b> IX–XI asrlarda vujudga kelgan."
                    "</div>"
                ),
                "explanation": "I (faqat Somoniylar): d (forscha-tojikcha rasmiy til); II (faqat Qoraxoniylar): a (turkiy sulola), e (turkiy adabiyot yuksalgan); III (ikkalasiga umumiy): b, c, f (islom davlat dini, Movarounnahrda hukmronlik qilgan, IX–XI asrlarda vujudga kelgan).",
                "options": [
                    ("A", "I-a, e; II-d; III-b, c, f", False),
                    ("B", "I-d; II-a; III-b, c, e, f", False),
                    ("C", "I-d; II-a, e; III-b, c, f", True),
                    ("D", "I-a; II-d, e; III-b, c, f", False),
                ],
            },
            # 21
            {
                "body": (
                    "<p>Quyidagi hukmdorlar va ularga oid ma’lumotlarni to’g’ri moslashtiring.</p>"
                    "<div style='background:#f8fafc;padding:12px 16px;border-radius:10px;border:1px solid #e2e8f0;margin:12px 0;font-size:13px;line-height:1.7;'>"
                    "<b>I.</b> Anushtegin<br/>"
                    "<b>II.</b> Takash<br/>"
                    "<b>III.</b> Alovuddin Muhammad<br/>"
                    "<b>IV.</b> Jaloliddin Manguberdi<br/><br/>"
                    "<b>a)</b> Xorazmga noib tayinlangan, sulolaga asos solgan<br/>"
                    "<b>b)</b> Saljuqiylar davlatini tugatgan<br/>"
                    "<b>c)</b> Qoraxoniylar davlatini tugatgan<br/>"
                    "<b>d)</b> Mo’g’ullarga qarshi so’nggi kurashni olib borgan"
                    "</div>"
                ),
                "explanation": "I - a (Anushtegin sulolaga asos solgan), II - b (Takash 1194-yilda Saljuqiylarni tugatgan), III - c (Alovuddin Muhammad 1211-1212-yillarda Qoraxoniylarni tugatgan), IV - d (Jaloliddin mo'g'ullarga qarshi kurashgan).",
                "options": [
                    ("A", "I-b, II-a, III-d, IV-c", False),
                    ("B", "I-a, II-b, III-c, IV-d", True),
                    ("C", "I-c, II-d, III-a, IV-b", False),
                    ("D", "I-d, II-c, III-b, IV-a", False),
                ],
            },
            # 22
            {
                "body": "<p>Movarounnahrda Talos jangidan keyin yo’lga qo’yilgan va dastlab yozuv uchun ishlatilgan mahsulotni aniqlang.</p>",
                "explanation": "Qog'oz ishlab chiqarish Talos jangidan keyin Samarqandda yo'lga qo'yilib, yozuv materiali sifatida keng foydalanilgan.",
                "options": [
                    ("A", "Porox", False),
                    ("B", "Ipak", False),
                    ("C", "Chinni", False),
                    ("D", "Qog’oz", True),
                ],
            },
            # 23
            {
                "body": "<p>Anushteginiylar (Xorazmshohlar) davlatining poytaxtini aniqlang.</p>",
                "explanation": "Anushteginiylar davlatining bosh poytaxti Gurganch (Ko'hna Urganch) shahri bo'lgan.",
                "options": [
                    ("A", "Gurganch", True),
                    ("B", "Samarqand", False),
                    ("C", "Buxoro", False),
                    ("D", "Marv", False),
                ],
            },
            # 24
            {
                "body": (
                    "<p>Quyidagi olimlardan qaysilari IX–X asrlarda Movarounnahr va Xurosonda yashab ijod etgan?</p>"
                    "<div style='background:#f8fafc;padding:12px 16px;border-radius:10px;border:1px solid #e2e8f0;margin:12px 0;font-size:13px;line-height:1.7;'>"
                    "1) Imom Buxoriy<br/>"
                    "2) Ahmad Farg’oniy<br/>"
                    "3) Platon<br/>"
                    "4) Narshaxiy<br/>"
                    "5) Syuan Szyan<br/>"
                    "6) Forobiy"
                    "</div>"
                ),
                "explanation": "1 (Imom Buxoriy), 2 (Ahmad Farg'oniy), 4 (Narshaxiy) va 6 (Forobiy) IX-X asrlarda Movarounnahr va Xurosonda yashab ijod etgan.",
                "options": [
                    ("A", "1, 3, 5, 6", False),
                    ("B", "2, 3, 4, 5", False),
                    ("C", "1, 2, 4, 6", True),
                    ("D", "1, 2, 5, 6", False),
                ],
            },
            # 25
            {
                "body": "<p>Tarixiy shaxsni aniqlang. 711-yilda Xorazmni zabt etgan va mahalliy hukmdor Xurazodni mag’lub etgan arab sarkardasi.</p>",
                "explanation": "711-yilda Qutayba ibn Muslim Xorazmshoh Chagan taklifi bilan Xorazmga bostirib kirib, isyonchi Xurazodni mag'lub etgan.",
                "options": [
                    ("A", "Abu Muslim", False),
                    ("B", "Qutayba ibn Muslim", True),
                    ("C", "Nasr ibn Sayyor", False),
                    ("D", "Said ibn Usmon", False),
                ],
            },
            # 26
            {
                "body": "<p>Tarixiy shaxsni aniqlang. 747–749-yillarda Xurosonda qo’zg’olon ko’tarib, Abbosiylar sulolasini hokimiyatga olib kelgan sarkarda.</p>",
                "explanation": "Abu Muslim 747-749 yillarda Umaviylarga qarshi Xurosonda qo'zg'olon ko'tarib, Abbosiylar xalifaligini taxtga chiqardi.",
                "options": [
                    ("A", "Muqanna", False),
                    ("B", "Rofe ibn Lays", False),
                    ("C", "Nasr ibn Sayyor", False),
                    ("D", "Abu Muslim", True),
                ],
            },
            # 27
            {
                "body": "<p>IX–X asrlarda Arab xalifaligi uchun xos bo’lgan holatni aniqlang.</p>",
                "explanation": "IX-X asrlarda xalifalik markaziy boshqaruvi kuchsizlanib, uning o'rnida Tohiriylar, Safforiylar, Somoniylar kabi mustaqil sulolalar vujudga keldi.",
                "options": [
                    ("A", "Xalifalik markaziy hokimiyati zaiflashib, mahalliy sulolalar (Tohiriylar, Somoniylar) mustaqillasha boshladi", True),
                    ("B", "Xalifalik yana kengaydi", False),
                    ("C", "Islom dini tarqalishi to’xtadi", False),
                    ("D", "Xalifalik poytaxti Samarqandga ko’chirildi", False),
                ],
            },
            # 28
            {
                "body": (
                    "<p>Quyidagi qo’zg’olonlardan qaysilari arab xalifaligiga qarshi bo’lgan?</p>"
                    "<div style='background:#f8fafc;padding:12px 16px;border-radius:10px;border:1px solid #e2e8f0;margin:12px 0;font-size:13px;line-height:1.7;'>"
                    "1) Abu Muslim qo’zg’oloni<br/>"
                    "2) Muqanna qo’zg’oloni<br/>"
                    "3) Bobak qo’zg’oloni<br/>"
                    "4) Sarbadorlar harakati<br/>"
                    "5) Spartak qo’zg’oloni<br/>"
                    "6) Vat Tayler qo’zg’oloni"
                    "</div>"
                ),
                "explanation": "1 (Abu Muslim), 2 (Muqanna) va 3 (Ozarbayjondagi Bobak qo'zg'oloni) Arab xalifaligiga qarshi bo'lgan.",
                "options": [
                    ("A", "4, 5, 6", False),
                    ("B", "2, 4, 6", False),
                    ("C", "1, 2, 3", True),
                    ("D", "1, 3, 5", False),
                ],
            },
            # 29
            {
                "body": "<p>Buyuk ipak yo’lidagi savdo markazlaridan biri bo’lgan va Ma’mun akademiyasi joylashgan Xorazm shahrini aniqlang.</p>",
                "explanation": "Ma'mun akademiyasi (Dorul-hikma) Xorazm poytaxti Gurganch shahrida faoliyat yuritgan.",
                "options": [
                    ("A", "Kot", False),
                    ("B", "Xiva", False),
                    ("C", "Vazir", False),
                    ("D", "Gurganch", True),
                ],
            },
            # 30
            {
                "body": (
                    "<div style='background:#f1f5f9;padding:10px 14px;border-radius:8px;border:1px solid #cbd5e1;margin-bottom:12px;font-size:12.5px;'>"
                    "<b>30–32-topshiriqlarga mos keluvchi javoblarni (A–F) javob variantlaridan tanlang:</b><br/>"
                    "A) Ismoil Somoniy &nbsp;&nbsp; B) Mahmud G’aznaviy &nbsp;&nbsp; C) Alovuddin Muhammad<br/>"
                    "D) Jaloliddin Manguberdi &nbsp;&nbsp; E) Alp Arslon &nbsp;&nbsp; F) Anushtegin"
                    "</div>"
                    "<p><b>30.</b> Qaysi hukmdor Hindistonga 17 marta yurish uyushtirgan?</p>"
                ),
                "explanation": "Mahmud G'aznaviy 1000–1027-yillar oralig'ida Hindistonga jami 17 marta yurish qilgan.",
                "options": [
                    ("A", "Ismoil Somoniy", False),
                    ("B", "Mahmud G’aznaviy", True),
                    ("C", "Alovuddin Muhammad", False),
                    ("D", "Jaloliddin Manguberdi", False),
                ],
            },
            # 31
            {
                "body": (
                    "<div style='background:#f1f5f9;padding:10px 14px;border-radius:8px;border:1px solid #cbd5e1;margin-bottom:12px;font-size:12.5px;'>"
                    "<b>30–32-topshiriqlarga mos keluvchi javoblarni (A–F) javob variantlaridan tanlang:</b><br/>"
                    "A) Ismoil Somoniy &nbsp;&nbsp; B) Mahmud G’aznaviy &nbsp;&nbsp; C) Alovuddin Muhammad<br/>"
                    "D) Jaloliddin Manguberdi &nbsp;&nbsp; E) Alp Arslon &nbsp;&nbsp; F) Anushtegin"
                    "</div>"
                    "<p><b>31.</b> Qaysi hukmdor mo’g’ullarga qarshi Parvon jangida g’alaba qozongan?</p>"
                ),
                "explanation": "Jaloliddin Manguberdi 1221-yilda Parvon jangida Chingizxonning Shiki Xutuxu boshchiligidagi qo'shinini tor-mor etgan.",
                "options": [
                    ("A", "Ismoil Somoniy", False),
                    ("B", "Mahmud G’aznaviy", False),
                    ("C", "Alovuddin Muhammad", False),
                    ("D", "Jaloliddin Manguberdi", True),
                ],
            },
            # 32
            {
                "body": (
                    "<div style='background:#f1f5f9;padding:10px 14px;border-radius:8px;border:1px solid #cbd5e1;margin-bottom:12px;font-size:12.5px;'>"
                    "<b>30–32-topshiriqlarga mos keluvchi javoblarni (A–F) javob variantlaridan tanlang:</b><br/>"
                    "A) Ismoil Somoniy &nbsp;&nbsp; B) Mahmud G’aznaviy &nbsp;&nbsp; C) Alovuddin Muhammad<br/>"
                    "D) Jaloliddin Manguberdi &nbsp;&nbsp; E) Alp Arslon &nbsp;&nbsp; F) Anushtegin"
                    "</div>"
                    "<p><b>32.</b> Qaysi hukmdor 1211-yilda Qoraxoniylar davlatini tugatgan?</p>"
                ),
                "explanation": "Xorazmshoh Alovuddin Muhammad 1211-1212 yillarda Qoraxoniylar sulolasini tugatgan va Samarqandni egallagan.",
                "options": [
                    ("A", "Ismoil Somoniy", False),
                    ("B", "Mahmud G’aznaviy", False),
                    ("C", "Alovuddin Muhammad", True),
                    ("D", "Jaloliddin Manguberdi", False),
                ],
            },
            # 33
            {
                "body": (
                    "<p>Quyidagi olimlar va ularning asarlarini to’g’ri moslashtiring.</p>"
                    "<div style='background:#f8fafc;padding:12px 16px;border-radius:10px;border:1px solid #e2e8f0;margin:12px 0;font-size:13px;line-height:1.7;'>"
                    "1. ”Qonuni Mas’udiy”<br/>"
                    "2. ”Hidoya”<br/>"
                    "3. ”Devonu lug’otit turk”<br/><br/>"
                    "a) Imom Buxoriy<br/>"
                    "b) Marg’inoniy<br/>"
                    "c) Beruniy<br/>"
                    "d) Mahmud Qoshg’ariy"
                    "</div>"
                ),
                "explanation": "1 - c ('Qonuni Mas'udiy' - Beruniy), 2 - b ('Hidoya' - Burhoniddin Marg'inoniy), 3 - d ('Devonu lug'otit turk' - Mahmud Qoshg'ariy).",
                "options": [
                    ("A", "1-c, 2-b, 3-d", True),
                    ("B", "1-d, 2-a, 3-b", False),
                    ("C", "1-a, 2-d, 3-c", False),
                    ("D", "1-b, 2-c, 3-a", False),
                ],
            },
            # 34
            {
                "body": (
                    "<p>Quyidagi voqealarni xronologik tartibda joylashtiring.</p>"
                    "<div style='background:#f8fafc;padding:12px 16px;border-radius:10px;border:1px solid #e2e8f0;margin:12px 0;font-size:13px;line-height:1.7;'>"
                    "1) Nasr ibn Sayyor moliya islohoti (738–748)<br/>"
                    "2) Ismoil Somoniyning birlashtirishi (892)<br/>"
                    "3) Muqanna qo’zg’oloni (769–783)<br/>"
                    "4) Qutaybaning Xorazmni zabt etishi (711)<br/>"
                    "5) Abu Muslim qo’zg’oloni (747–749)"
                    "</div>"
                ),
                "explanation": "Ketma-ketlik: 4 (Qutayba, 711) -> 1 (Nasr ibn Sayyor, 738-748) -> 5 (Abu Muslim, 747-749) -> 3 (Muqanna, 769-783) -> 2 (Ismoil Somoniy, 892). Ya'ni: 4, 1, 5, 3, 2.",
                "options": [
                    ("A", "4, 5, 1, 3, 2", False),
                    ("B", "4, 1, 5, 3, 2", True),
                    ("C", "1, 4, 5, 2, 3", False),
                    ("D", "4, 1, 3, 5, 2", False),
                ],
            },
            # 35
            {
                "body": (
                    "<p>IX–X asrlarda Movarounnahrda mustaqil davlatchilik tiklandi. Quyidagi sulolalardan qaysi biri shu davrga <b>xos emas</b>?</p>"
                    "<div style='background:#f8fafc;padding:12px 16px;border-radius:10px;border:1px solid #e2e8f0;margin:12px 0;font-size:13px;line-height:1.7;'>"
                    "1) Tohiriylar<br/>"
                    "2) Safforiylar<br/>"
                    "3) Somoniylar<br/>"
                    "4) Qarluqlar<br/>"
                    "5) Saljuqiylar<br/>"
                    "6) O’g’uzlar"
                    "</div>"
                ),
                "explanation": "Saljuqiylar (5) XI asrda (Dandanaqon jangi 1040-yildan so'ng) kuchaygan bo'lib, IX-X asrlarga xos emas.",
                "options": [
                    ("A", "1", False),
                    ("B", "3", False),
                    ("C", "4", False),
                    ("D", "5", True),
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
                "title": "Turk xoqonligi.",
                "parts": [
                    ("a", "Turk xoqonligiga asos solgan sardorni yozing.", "Bumin"),
                    ("b", "Bu voqea qaysi yilda sodir bo’lganini yozing.", "552-yil"),
                ],
                "explanation": "a) Bumin; b) 552-yil.",
            },
            # 37
            {
                "title": "Abruy qo’zg’oloni.",
                "parts": [
                    ("a", "Qo’zg’olon qaysi shaharda bo’lib o’tganini yozing.", "Buxoro"),
                    ("b", "Qo’zg’olon qaysi yillarda bo’lib o’tganini yozing.", "585-586-yillar"),
                ],
                "explanation": "a) Buxoro; b) 585-586-yillar.",
            },
            # 38
            {
                "title": "Ismoil Somoniy.",
                "parts": [
                    ("a", "U Movarounnahrni qaysi yilda birlashtirganini yozing.", "892-yil (888/892)"),
                    ("b", "Uning poytaxti bo’lgan shaharni yozing.", "Buxoro"),
                ],
                "explanation": "a) 892-yil (888/892); b) Buxoro.",
            },
            # 39
            {
                "title": "Arab istilosi.",
                "parts": [
                    ("a", "Movarounnahrni zabt etishni boshlagan arab sarkardasini yozing.", "Qutayba ibn Muslim"),
                    ("b", "U halok bo’lgan yilni yozing.", "715-yil"),
                ],
                "explanation": "a) Qutayba ibn Muslim; b) 715-yil.",
            },
            # 40
            {
                "title": "Dastlabki qo’zg’olonlar.",
                "parts": [
                    ("a", "747–749-yillardagi qo’zg’olon boshlig’ini yozing.", "Abu Muslim"),
                    ("b", "769–783-yillardagi qo’zg’olon boshlig’ini yozing.", "Muqanna"),
                ],
                "explanation": "a) Abu Muslim; b) Muqanna.",
            },
            # 41
            {
                "title": "G’aznaviylar davlati.",
                "parts": [
                    ("a", "G’aznaviylar sulolasiga asos solgan hukmdorni yozing.", "Sobuqtegin"),
                    ("b", "Hindistonga 17 marta yurish qilgan hukmdorni yozing.", "Mahmud G’aznaviy"),
                ],
                "explanation": "a) Sobuqtegin; b) Mahmud G’aznaviy.",
            },
            # 42
            {
                "title": "Buyuk jang va voqealar.",
                "parts": [
                    ("a", "1040-yilgi jangda saljuqiylar kimni mag’lub etganini yozing.", "G’aznaviylarni"),
                    ("b", "Ushbu jangning nomini yozing.", "Dandanaqon jangi"),
                ],
                "explanation": "a) G’aznaviylarni; b) Dandanaqon jangi.",
            },
            # 43
            {
                "title": "Xorazmshohlar davlati.",
                "parts": [
                    ("a", "Xorazmga birinchi bo’lib noib etib tayinlangan va sulolaga asos solgan shaxsni yozing.", "Anushtegin"),
                    ("b", "Davlat nomi qaysi sulola nomi bilan atalishini yozing.", "Anushteginiylar"),
                ],
                "explanation": "a) Anushtegin; b) Anushteginiylar.",
            },
            # 44
            {
                "title": "Jaloliddin Manguberdi.",
                "parts": [
                    ("a", "Uning mo’g’ullar ustidan g’alaba qozongan jangi nomini yozing.", "Parvon jangi (1221-yil)"),
                    ("b", "U mo’g’ullardan qochib, qaysi daryodan suzib o’tganini yozing.", "Hind (Sind) daryosi"),
                ],
                "explanation": "a) Parvon jangi (1221-yil); b) Hind (Sind) daryosi.",
            },
            # 45
            {
                "title": "Ilmu fan.",
                "parts": [
                    ("a", "”Al-jome’ as-sahih” asarining muallifini yozing.", "Imom Buxoriy"),
                    ("b", "”Tib qonunlari” asarining muallifini yozing.", "Ibn Sino"),
                ],
                "explanation": "a) Imom Buxoriy; b) Ibn Sino.",
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
