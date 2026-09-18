"""Django management command: Sodiqov Shohjahon ustozning 6-sinf Qadimgi Dunyo Tarixi (11–20-mavzular) Milliy Sertifikat mock testini yaratish.

11–20-mavzular: Mesopotamiya, Old Osiyo, Ahamoniylar, Qadimgi Hindiston-Xitoy,
O'zbekiston hududidagi ilk davlatlar, Zardushtiylik.
35 ta test topshirig'i (A, B, C, D) va 10 ta yozma (ochiq) savol. Jami: 45 ta topshiriq.

Muallif/O'qituvchi: shohjahon (Sodiqov Shohjahon, @TarixMilliyCertificate)

Foydalanish:
    python manage.py seed_tarix_shohjahon_11_20
    python manage.py seed_tarix_shohjahon_11_20 --force
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from django.contrib.auth.models import User

from accounts.models import Profile, ensure_profile_for_user
from tests_app.models import Subject, TestSet, Question, AnswerOption, SubQuestion


MOCK_TITLE = "6-sinf Qadimgi Dunyo Tarixi — Milliy Sertifikat (11–20-mavzular) | Shohjahon"
MOCK_DESC = (
    "11–20-mavzular: Mesopotamiya, Old Osiyo, Ahamoniylar, Qadimgi Hindiston-Xitoy, "
    "O'zbekiston hududidagi ilk davlatlar, Zardushtiylik. "
    "35 ta test topshirig'i (A, B, C, D) va 10 ta yozma (ochiq) savol. Jami: 45 ta topshiriq. "
    "Ustoz: Sodiqov Shohjahon (@TarixMilliyCertificate)."
)


class Command(BaseCommand):
    help = "Sodiqov Shohjahon ustoz nomidan 6-sinf Tarix (11–20-mavzular) 45 talik Milliy Sertifikat testini yuklaydi."

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
                        f"Qayta yuklash uchun: python manage.py seed_tarix_shohjahon_11_20 --force"
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
                "explanation": "Gilgamish Uruk shahri podshosi va Mesopotamiya rivoyatlari qahramoni bo'lgan, Fors davlatiga hech qanday aloqasi yo'q.",
                "options": [
                    ("A", "Xammurapi — Bobil podshosi, qonunlar tuzgan birinchi hukmdor", False),
                    ("B", "Oshshurbanapal — Ossuriya hukmdori, Nineviyada kutubxona to'plagan", False),
                    ("C", "Gilgamish — Fors davlati hukmdori", True),
                    ("D", "Kiaksar — Midiya podshosi", False),
                ],
            },
            # 2
            {
                "body": (
                    "<p>Quyidagi hukmdorlar va ular bilan bog'liq ma'lumotlar mos ravishda berilgan javobni aniqlang.</p>"
                    "<div style='display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:12px;margin:14px 0;'>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.7;'>"
                    "<b>1)</b> Sargon I<br/>"
                    "<b>2)</b> Xammurapi<br/>"
                    "<b>3)</b> Kir II<br/>"
                    "<b>4)</b> Doro I"
                    "</div>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.7;'>"
                    "<b>a)</b> Fors davlatiga asos solgan, Midiya va Bobilni zabt etgan<br/>"
                    "<b>b)</b> Akkad va Shumerni birlashtirib, muntazam qo'shin tuzgan<br/>"
                    "<b>c)</b> Saltanatni satrapliklarga bo'lgan, «darik» tangasini joriy etgan<br/>"
                    "<b>d)</b> Mesopotamiyani birlashtirib, qonunlar tuzgan"
                    "</div>"
                    "</div>"
                ),
                "explanation": "1-b (Sargon I — Akkad va Shumer birlashuvi), 2-d (Xammurapi — qonunlar), 3-a (Kir II — Fors davlati), 4-c (Doro I — satrapliklar va darik).",
                "options": [
                    ("A", "1-b; 2-d; 3-a; 4-c", True),
                    ("B", "1-a; 2-b; 3-c; 4-d", False),
                    ("C", "1-c; 2-a; 3-d; 4-b", False),
                    ("D", "1-b; 2-a; 3-d; 4-c", False),
                ],
            },
            # 3
            {
                "body": "<p>Yunonlar Dajla va Frot daryolari oralig'idagi vodiyni qanday atashgan?</p>",
                "explanation": "Yunonlar ikki daryo — Dajla va Frot oralig'idagi unumdor vodiyni «Mesopotamiya» (Ikki daryo oralig'i) deb atashgan.",
                "options": [
                    ("A", "Mesopotamiya", True),
                    ("B", "Baqtriana", False),
                    ("C", "Xorasmiya", False),
                    ("D", "Persepol", False),
                ],
            },
            # 4
            {
                "body": (
                    "<p>Quyidagi voqealar to'g'ri xronologik ketma-ketlikda ko'rsatilgan javobni toping.</p>"
                    "<div style='padding:12px;border:1px solid #cbd5e1;border-radius:8px;background:rgba(100,116,139,0.05);line-height:1.8;font-size:13.5px;margin:12px 0;'>"
                    "1) Sargon I Akkad va Shumerni birlashtirdi (mil.avv. 3-ming yillik ikkinchi yarmi)<br/>"
                    "2) Xammurapi Mesopotamiyani birlashtirdi (mil.avv. XVIII asr)<br/>"
                    "3) Ossuriya Bobil va Midiya tomonidan bosib olindi (mil.avv. 605)<br/>"
                    "4) Bobil forslar tomonidan zabt etildi (mil.avv. 539)<br/>"
                    "5) Kir II Fors davlatiga asos soldi (mil.avv. 558)<br/>"
                    "6) Doro I taxtga chiqdi (mil.avv. 522)"
                    "</div>"
                ),
                "explanation": "Xronologik tartib: mil.avv. 3-ming yillik (1) → XVIII asr (2) → 605 (3) → 558 (5) → 539 (4) → 522 (6). To'g'ri javob: 1, 2, 3, 5, 4, 6.",
                "options": [
                    ("A", "1, 2, 3, 5, 4, 6", True),
                    ("B", "1, 2, 3, 4, 5, 6", False),
                    ("C", "2, 1, 3, 5, 4, 6", False),
                    ("D", "1, 2, 5, 3, 4, 6", False),
                ],
            },
            # 5
            {
                "body": (
                    "<p>Quyida berilgan Mesopotamiya xudolari va ularning izohi to'g'ri moslashtirilgan javobni toping.</p>"
                    "<div style='display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:12px;margin:14px 0;'>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.7;'>"
                    "<b>I</b> Shamash<br/>"
                    "<b>II</b> Sin<br/>"
                    "<b>III</b> Ea<br/>"
                    "<b>IV</b> Ishtar"
                    "</div>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.7;'>"
                    "<b>a</b> Quyosh xudosi, oliy hakam<br/>"
                    "<b>b</b> Oy xudosi<br/>"
                    "<b>c</b> Suv xudosi<br/>"
                    "<b>d</b> Hosildorlik, sevgi, urush va g'alaba ilohasi<br/>"
                    "<b>e</b> Yerosti saltanati xudosi"
                    "</div>"
                    "</div>"
                ),
                "explanation": "Shamash — quyosh xudosi (a); Sin — oy xudosi (b); Ea — suv xudosi (c); Ishtar — hosildorlik, sevgi va urush ilohasi (d).",
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
                    "<p>Quyida berilgan Hindiston tabaqalari (varnalar) va ularning izohi to'g'ri moslashtirilgan javobni toping.</p>"
                    "<div style='display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:12px;margin:14px 0;'>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.7;'>"
                    "<b>I</b> Braxmanlar<br/>"
                    "<b>II</b> Kshatriylar<br/>"
                    "<b>III</b> Vayshiylar<br/>"
                    "<b>IV</b> Shudralar"
                    "</div>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.7;'>"
                    "<b>a</b> Kohinlar, hind ruhoniylari<br/>"
                    "<b>b</b> Jangchilar<br/>"
                    "<b>c</b> Dehqon, hunarmand va savdogarlar<br/>"
                    "<b>d</b> Xizmatkorlar va qullar<br/>"
                    "<b>e</b> Hech qaysi tabaqaga mansub bo'lmaganlar"
                    "</div>"
                    "</div>"
                ),
                "explanation": "Braxmanlar — kohinlar (a); Kshatriylar — jangchilar (b); Vayshiylar — dehqon, hunarmand, savdogarlar (c); Shudralar — xizmatkorlar (d).",
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
                    "<p>Tarixiy shaxsni aniqlang. Uruk shahri podshosi bo'lgan, Mesopotamiya "
                    "rivoyatlarining eng sevimli qahramoni. U boqiy hayotga erishish uchun sehrli "
                    "giyoh izlagan, ammo ilon uni o'g'irlab ketgan.</p>"
                ),
                "explanation": "Gilgamish — Uruk hukmdori bo'lib, o'lmaslik sirini izlab dunyo kezgan afsonaviy shumer qahramonidir.",
                "options": [
                    ("A", "Gilgamish", True),
                    ("B", "Sargon I", False),
                    ("C", "Xammurapi", False),
                    ("D", "Oshshurbanapal", False),
                ],
            },
            # 8
            {
                "body": (
                    "<p>Tarixiy shaxsni aniqlang. U mil.avv. 522-yilda Fors taxtiga chiqdi, "
                    "saltanatni satrapliklarga bo'ldi, «darik» oltin tangasini joriy etdi va "
                    "Persepoldan boshlangan «shoh yo'li»ni qurdirdi.</p>"
                ),
                "explanation": "Doro I — Ahamoniylar saltanatining eng qudratli shohi, davlatni 20 ta satraplikka bo'lib, yagona pul va pochta-aloqa («shoh yo'li») tizimini yaratgan.",
                "options": [
                    ("A", "Doro I", True),
                    ("B", "Kir II", False),
                    ("C", "Kambiz II", False),
                    ("D", "Kiaksar", False),
                ],
            },
            # 9
            {
                "body": (
                    "<p>Tarixiy davlatni aniqlang. Chandragupta tomonidan asos solingan, "
                    "poytaxti Pataliputra bo'lgan, Ashoka davrida yuksak taraqqiyotga erishgan "
                    "Shimoliy Hindiston davlati.</p>"
                ),
                "explanation": "Maurya imperiyasi — Aleksandr istilosidan so'ng Chandragupta Maurya tomonidan tashkil qilingan, Ashoka davrida deyarli butun Hindistonni birlashtirgan ulkan davlat.",
                "options": [
                    ("A", "Maurya davlati", True),
                    ("B", "Magadha davlati", False),
                    ("C", "Koshala davlati", False),
                    ("D", "Malla davlati", False),
                ],
            },
            # 10
            {
                "body": (
                    "<p>Tarixiy shaxsni aniqlang. Mil.avv. 246-yilda Xitoyni birlashtirgan, "
                    "o'ziga tirikligidayoq maqbara qurdirgan, Buyuk Xitoy devorini mustahkamlashni "
                    "buyurgan hukmdor.</p>"
                ),
                "explanation": "Sin Shixuandi — Xitoyni yagona markazlashgan davlatga birlashtirgan birinchi imperator, terrakota armiyasi va Buyuk devor qurilishi bilan mashhur.",
                "options": [
                    ("A", "Sin Shixuandi", True),
                    ("B", "U-Di", False),
                    ("C", "Lyu Ban", False),
                    ("D", "Chandragupta", False),
                ],
            },
            # 11
            {
                "body": (
                    "<p>Quyidagi shaharlardan qaysilari qadimgi shumer shahar-davlatlariga tegishli?</p>"
                    "<div style='padding:10px;border:1px solid #cbd5e1;border-radius:8px;background:rgba(100,116,139,0.05);line-height:1.7;font-size:13.5px;margin:10px 0;'>"
                    "1) Uruk<br/>"
                    "2) Umma<br/>"
                    "3) Nineviya<br/>"
                    "4) Lagash<br/>"
                    "5) Xattusa<br/>"
                    "6) Ur"
                    "</div>"
                ),
                "explanation": "Nineviya — Ossuriya poytaxti, Xattusa — Xettlar poytaxti. Uruk, Umma, Lagash va Ur esa Janubiy Mesopotamiyadagi mashhur shumer shahar-davlatlaridir.",
                "options": [
                    ("A", "1, 2, 4, 6", True),
                    ("B", "1, 3, 5, 6", False),
                    ("C", "2, 3, 4, 5", False),
                    ("D", "1, 4, 5, 6", False),
                ],
            },
            # 12
            {
                "body": "<p>Ossuriya davlati qaysi ikki davlat tomonidan mil.avv. 605-yilda bosib olindi?</p>",
                "explanation": "Yangi Bobil podsholigi va Midiya harbiy ittifoq tuzib, mil.avv. 612-yilda Nineviyani, 605-yilda esa Karxemish jangida Ossuriyani butunlay tor-mor keltirishdi.",
                "options": [
                    ("A", "Bobil va Midiya", True),
                    ("B", "Fors va Misr", False),
                    ("C", "Xett va Mitanni", False),
                    ("D", "Lidiya va Urartu", False),
                ],
            },
            # 13
            {
                "body": "<p>Mil.avv. VII-VI asrlarda O'zbekiston hududi uchun xos bo'lgan holatni aniqlang.</p>",
                "explanation": "Mil.avv. VII-VI asrlarda O'zbekiston hududida o'troq so'g'diylar, xorazmiylar, baqtriyaliklar hamda ko'chmanchi sak-massaget qabilalari yashagan.",
                "options": [
                    ("A", "Hududda so'g'dlar, xorazmiylar, baqtriyaliklar va saklar yashagan", True),
                    ("B", "Hudud yagona markazlashgan davlatga birlashgan edi", False),
                    ("C", "Butun hudud Xitoy tarkibida edi", False),
                    ("D", "Yozuv umuman mavjud emas edi", False),
                ],
            },
            # 14
            {
                "body": (
                    "<p>Quyidagi xudolardan qaysilari zardushtiylikka tegishli?</p>"
                    "<div style='padding:10px;border:1px solid #cbd5e1;border-radius:8px;background:rgba(100,116,139,0.05);line-height:1.7;font-size:13.5px;margin:10px 0;'>"
                    "1) Ahuramazda<br/>"
                    "2) Zevs<br/>"
                    "3) Mitra<br/>"
                    "4) Amon-Ra<br/>"
                    "5) Anaxita<br/>"
                    "6) Ahriman"
                    "</div>"
                ),
                "explanation": "Ahuramazda (ezgulik tangrisi), Mitra (quyosh-yorug'lik), Anaxita (suv va hosildorlik) va Ahriman (yovuzlik ruhi) zardushtiylik panteoniga kiradi. Zevs — Yunoniston, Amon-Ra — Misr xudosi.",
                "options": [
                    ("A", "1, 3, 5, 6", True),
                    ("B", "1, 2, 4, 5", False),
                    ("C", "2, 3, 4, 6", False),
                    ("D", "3, 4, 5, 6", False),
                ],
            },
            # 15
            {
                "body": "<p>Buyuk Xitoy devorining uzunligi qariyb qancha bo'lgan?</p>",
                "explanation": "Qadimgi davrda asosiy mudofaa devorining umumiy cho'ziqligi qariyb 4000 kilometrni tashkil etgan.",
                "options": [
                    ("A", "4000 kilometr", True),
                    ("B", "1000 kilometr", False),
                    ("C", "10 000 kilometr", False),
                    ("D", "500 kilometr", False),
                ],
            },
            # 16
            {
                "body": (
                    "<p>Quyidagi voqealar to'g'ri xronologik ketma-ketlikda ko'rsatilgan javobni toping.</p>"
                    "<div style='padding:12px;border:1px solid #cbd5e1;border-radius:8px;background:rgba(100,116,139,0.05);line-height:1.8;font-size:13.5px;margin:12px 0;'>"
                    "1) Sin Shixuandi Xitoyni birlashtirdi (mil.avv. 246)<br/>"
                    "2) Lyu Ban qo'zg'oloni, Xan sulolasi boshlandi (mil.avv. 206)<br/>"
                    "3) «Sariq ro'mollilar» qo'zg'oloni (milodiy II asr)<br/>"
                    "4) Ashoka hukmronligi (mil.avv. III asr)<br/>"
                    "5) Makedoniyalik Aleksandr Ahamoniylarni bosib oldi (mil.avv. 330)"
                    "</div>"
                ),
                "explanation": "Ketma-ketlik: mil.avv. 330 (5) → mil.avv. III asr o'rtalari (4) → mil.avv. 246 (1) → mil.avv. 206 (2) → milodiy II asr (3). To'g'ri javob: 5, 4, 1, 2, 3.",
                "options": [
                    ("A", "5, 4, 1, 2, 3", True),
                    ("B", "1, 5, 4, 2, 3", False),
                    ("C", "4, 5, 1, 2, 3", False),
                    ("D", "5, 1, 4, 2, 3", False),
                ],
            },
            # 17 (Sxematik diagramma)
            {
                "body": (
                    "<p>Sxematik diagrammada uch qadimgi sivilizatsiya daryo vodiysi ko'rsatilgan. "
                    "1–3 raqamlaridan qaysi biri <b>Qadimgi Xitoy sivilizatsiyasi</b> vujudga kelgan hududni bildiradi?</p>"
                    "<div style='display:grid;grid-template-columns:repeat(3, 1fr);gap:12px;max-width:440px;margin:18px auto;text-align:center;'>"
                    "<div style='border:2px solid #3b82f6;border-radius:8px;padding:12px 6px;background:rgba(59,130,246,0.08);'>"
                    "<div style='font-size:16px;font-weight:bold;margin-bottom:6px;'>1</div>"
                    "<div style='font-size:12.5px;'>Dajla-Frot oralig'i</div>"
                    "<div style='margin-top:8px;font-size:16px;font-weight:bold;color:#64748b;'>?</div>"
                    "</div>"
                    "<div style='border:2px solid #3b82f6;border-radius:8px;padding:12px 6px;background:rgba(59,130,246,0.08);'>"
                    "<div style='font-size:16px;font-weight:bold;margin-bottom:6px;'>2</div>"
                    "<div style='font-size:12.5px;'>Hind-Gang vodiysi</div>"
                    "<div style='margin-top:8px;font-size:16px;font-weight:bold;color:#64748b;'>?</div>"
                    "</div>"
                    "<div style='border:2px solid #3b82f6;border-radius:8px;padding:12px 6px;background:rgba(59,130,246,0.08);'>"
                    "<div style='font-size:16px;font-weight:bold;margin-bottom:6px;'>3</div>"
                    "<div style='font-size:12.5px;'>Xuanxe-Yantszi vodiysi</div>"
                    "<div style='margin-top:8px;font-size:16px;font-weight:bold;color:#64748b;'>?</div>"
                    "</div>"
                    "</div>"
                ),
                "explanation": "Qadimgi Xitoy sivilizatsiyasi Xuanxe va Yantszi daryolari vodiysida vujudga kelgan (3-hudud). 1-hudud — Mesopotamiya, 2-hudud — Hindiston.",
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
                    "<tr style='border-bottom:1px solid #e2e8f0;'><td style='padding:8px;text-align:center;border-right:1px solid #cbd5e1;font-weight:bold;'>1</td><td style='padding:8px 12px;border-right:1px solid #cbd5e1;'>Xammurapi Mesopotamiyani birlashtirishi</td><td style='padding:8px 12px;'>Bobil eng qudratli davlatga aylandi</td></tr>"
                    "<tr style='border-bottom:1px solid #e2e8f0;background:rgba(100,116,139,0.03);'><td style='padding:8px;text-align:center;border-right:1px solid #cbd5e1;font-weight:bold;'>2</td><td style='padding:8px 12px;border-right:1px solid #cbd5e1;'>Kir II ning Midiyani bo'ysundirishi</td><td style='padding:8px 12px;'>Fors davlati zaiflashib qoldi</td></tr>"
                    "<tr style='border-bottom:1px solid #e2e8f0;'><td style='padding:8px;text-align:center;border-right:1px solid #cbd5e1;font-weight:bold;'>3</td><td style='padding:8px 12px;border-right:1px solid #cbd5e1;'>Doro I ning satraplik islohoti</td><td style='padding:8px 12px;'>Saltanat boshqaruvi mustahkamlandi</td></tr>"
                    "<tr style='border-bottom:1px solid #e2e8f0;background:rgba(100,116,139,0.03);'><td style='padding:8px;text-align:center;border-right:1px solid #cbd5e1;font-weight:bold;'>4</td><td style='padding:8px 12px;border-right:1px solid #cbd5e1;'>Sin Shixuandi hukmronligi</td><td style='padding:8px 12px;'>Xitoy mayda davlatlarga bo'linib ketdi</td></tr>"
                    "<tr style='border-bottom:1px solid #e2e8f0;'><td style='padding:8px;text-align:center;border-right:1px solid #cbd5e1;font-weight:bold;'>5</td><td style='padding:8px 12px;border-right:1px solid #cbd5e1;'>Zardushtning va'zlari</td><td style='padding:8px 12px;'>«Avesto» kitobi vujudga keldi</td></tr>"
                    "<tr><td style='padding:8px;text-align:center;border-right:1px solid #cbd5e1;font-weight:bold;'>6</td><td style='padding:8px 12px;border-right:1px solid #cbd5e1;'>Chandragupta kurashi</td><td style='padding:8px 12px;'>Yunon-makedon qo'shinlari Hindistonni butunlay egalladi</td></tr>"
                    "</tbody></table></div>"
                ),
                "explanation": "2 xato: Kir II davrida Fors davlati nihoyatda kuchaydi. 4 xato: Sin Shixuandi Xitoyni birlashtirdi. 6 xato: Chandragupta yunon-makedonlarni quvib chiqardi. To'g'ri: 1, 3, 5.",
                "options": [
                    ("A", "1, 3, 5", True),
                    ("B", "2, 4, 6", False),
                    ("C", "1, 2, 3", False),
                    ("D", "4, 5, 6", False),
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
                    "<th style='padding:8px 12px;text-align:left;'>Jahon voqeasi</th>"
                    "</tr></thead>"
                    "<tbody>"
                    "<tr style='border-bottom:1px solid #e2e8f0;'><td style='padding:10px 12px;border-right:1px solid #cbd5e1;font-weight:bold;'>Mil.avv. VI asr</td><td style='padding:10px 12px;border-right:1px solid #cbd5e1;font-weight:bold;color:#f59e0b;font-size:16px;'>a</td><td style='padding:10px 12px;'>Doro I Fors taxtiga chiqdi (mil.avv. 522)</td></tr>"
                    "<tr style='background:rgba(100,116,139,0.03);'><td style='padding:10px 12px;border-right:1px solid #cbd5e1;font-weight:bold;'>Mil.avv. III asr</td><td style='padding:10px 12px;border-right:1px solid #cbd5e1;'>Zardusht va'zlari 21 ta kitobga jamlandi</td><td style='padding:10px 12px;font-weight:bold;color:#f59e0b;font-size:16px;'>b</td></tr>"
                    "</tbody></table></div>"
                    "<div style='padding:10px 14px;background:rgba(100,116,139,0.08);border-radius:8px;font-size:13px;line-height:1.6;margin-top:8px;'>"
                    "<b>Ma'lumotlar:</b><br/>"
                    "1) O'rta Osiyoda so'g'd, xorazm, baqtriya davlatlari mavjud edi;<br/>"
                    "2) Ashoka hukmronligi (mil.avv. III asr);<br/>"
                    "3) Kir II Fors davlatiga asos soldi (mil.avv. 558);<br/>"
                    "4) Sin Shixuandi Xitoyni birlashtirdi (mil.avv. 246)."
                    "</div>"
                ),
                "explanation": "a=1: O'rta Osiyoda so'g'd-xorazm-baqtriya davlatlari VI asrda mavjud edi. b=2: Ashoka hukmronligi mil.avv. III asrga to'g'ri keladi.",
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
                    "<i>(Bobil va Ossuriya davlatlari)</i></p>"
                    "<div style='display:flex;justify-content:center;margin:18px 0;'>"
                    "<svg width='360' height='190' viewBox='0 0 360 190' style='max-width:100%;height:auto;'>"
                    "<circle cx='130' cy='95' r='80' fill='rgba(59, 130, 246, 0.15)' stroke='#3b82f6' stroke-width='2.5' />"
                    "<circle cx='230' cy='95' r='80' fill='rgba(245, 158, 11, 0.15)' stroke='#f59e0b' stroke-width='2.5' />"
                    "<text x='85' y='85' font-size='18' font-weight='bold' fill='currentColor' text-anchor='middle'>I</text>"
                    "<text x='85' y='108' font-size='13' font-weight='600' fill='currentColor' text-anchor='middle'>Bobil</text>"
                    "<text x='180' y='98' font-size='18' font-weight='bold' fill='currentColor' text-anchor='middle'>II</text>"
                    "<text x='275' y='85' font-size='18' font-weight='bold' fill='currentColor' text-anchor='middle'>III</text>"
                    "<text x='275' y='108' font-size='13' font-weight='600' fill='currentColor' text-anchor='middle'>Ossuriya</text>"
                    "</svg>"
                    "</div>"
                    "<div style='font-size:13.5px;line-height:1.8;padding:12px;background:rgba(100,116,139,0.06);border-radius:8px;'>"
                    "<b>a)</b> Poytaxti Bobil shahri bo'lgan;<br/>"
                    "<b>b)</b> Poytaxti Nineviya (avval Oshshur) bo'lgan;<br/>"
                    "<b>c)</b> Mesopotamiya hududida joylashgan;<br/>"
                    "<b>d)</b> Xammurapi qonunlari bilan mashhur;<br/>"
                    "<b>e)</b> Oshshurbanapal kutubxonasi bilan mashhur;<br/>"
                    "<b>f)</b> Mil.avv. 605-yilda tarix sahnasidan ketdi."
                    "</div>"
                ),
                "explanation": "I (faqat Bobil): Bobil poytaxti (a), Xammurapi qonunlari (d). II (umumiy kesishma): Mesopotamiya hududi (c), mil.avv. 605-yilda Ossuriyaning yiqilishi/munosabatlar (f). III (faqat Ossuriya): Nineviya poytaxti (b), Oshshurbanapal kutubxonasi (e).",
                "options": [
                    ("A", "I-a,d; II-c,e; III-b,f", False),
                    ("B", "I-b,f; II-c,e; III-a,d", False),
                    ("C", "I-a,d; II-c,f; III-b,e", True),
                    ("D", "I-a,e; II-c,d; III-b,f", False),
                ],
            },
            # 21
            {
                "body": (
                    "<p>Quyidagi davlatlar va ularning poytaxtlarini to'g'ri moslashtiring.</p>"
                    "<div style='display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:12px;margin:14px 0;'>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.7;'>"
                    "<b>1)</b> Elam<br/>"
                    "<b>2)</b> Ossuriya (keyingi)<br/>"
                    "<b>3)</b> Xett<br/>"
                    "<b>4)</b> Urartu"
                    "</div>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.7;'>"
                    "<b>a)</b> Nineviya<br/>"
                    "<b>b)</b> Tushpa<br/>"
                    "<b>c)</b> Suza<br/>"
                    "<b>d)</b> Xattusa"
                    "</div>"
                    "</div>"
                ),
                "explanation": "1-c (Elam — Suza), 2-a (Ossuriya — Nineviya), 3-d (Xett — Xattusa), 4-b (Urartu — Tushpa).",
                "options": [
                    ("A", "1-c; 2-a; 3-d; 4-b", True),
                    ("B", "1-a; 2-c; 3-b; 4-d", False),
                    ("C", "1-c; 2-d; 3-a; 4-b", False),
                    ("D", "1-b; 2-a; 3-d; 4-c", False),
                ],
            },
            # 22
            {
                "body": "<p>Zardushtiylarning muqaddas kitobi qanday nomlangan?</p>",
                "explanation": "Zardushtiylik dinining muqaddas kitobi «Avesto» deb nomlanadi.",
                "options": [
                    ("A", "«Avesto»", True),
                    ("B", "«Bibliya»", False),
                    ("C", "«Rigveda»", False),
                    ("D", "«Zand»", False),
                ],
            },
            # 23
            {
                "body": "<p>«Avesto» matnlariga yozilgan sharh qanday nomlangan?</p>",
                "explanation": "Pahlaviy tilida «Avesto» matnlariga bitilgan sharhlar «Zand» («Zend») deb ataladi.",
                "options": [
                    ("A", "«Zand»", True),
                    ("B", "«Rigveda»", False),
                    ("C", "«Mahabharat»", False),
                    ("D", "«Bibliya»", False),
                ],
            },
            # 24
            {
                "body": (
                    "<p>Quyidagi ixtirolardan qaysilari Qadimgi Xitoyga tegishli?</p>"
                    "<div style='padding:10px;border:1px solid #cbd5e1;border-radius:8px;background:rgba(100,116,139,0.05);line-height:1.7;font-size:13.5px;margin:10px 0;'>"
                    "1) Qog'oz<br/>"
                    "2) Kompas<br/>"
                    "3) Alifbo (22 harf)<br/>"
                    "4) Seysmograf<br/>"
                    "5) Shaxmat<br/>"
                    "6) Nol raqami"
                    "</div>"
                ),
                "explanation": "Qog'oz, kompas va seysmograf (Chjan Xen) Qadimgi Xitoy ixtirolaridir (1, 2, 4). Alifbo — Finikiya, shaxmat va nol raqami — Hindiston.",
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
                    "<p>Quyidagi xalqlardan qaysilari mil.avv. VII-VI asrlarda O'zbekiston hududida yashagan?</p>"
                    "<div style='padding:10px;border:1px solid #cbd5e1;border-radius:8px;background:rgba(100,116,139,0.05);line-height:1.7;font-size:13.5px;margin:10px 0;'>"
                    "1) So'g'diylar<br/>"
                    "2) Xorazmliklar<br/>"
                    "3) Finikiyaliklar<br/>"
                    "4) Baqtriyaliklar<br/>"
                    "5) Ossuriyaliklar<br/>"
                    "6) Saklar"
                    "</div>"
                ),
                "explanation": "So'g'diylar, xorazmliklar, baqtriyaliklar va saklar O'zbekiston hududidagi qadimgi tub elatlar hisoblanadi (1, 2, 4, 6).",
                "options": [
                    ("A", "1, 2, 4, 6", True),
                    ("B", "1, 3, 5, 6", False),
                    ("C", "2, 3, 4, 5", False),
                    ("D", "1, 2, 3, 4", False),
                ],
            },
            # 26
            {
                "body": "<p>Saklarning «o'tkir uchli kigiz qalpoq kiyib yuruvchi» guruhi qanday atalgan?</p>",
                "explanation": "Saka-tigraxauda forschada «o'tkir uchli qalpoqli saklar» ma'nosini bildiradi.",
                "options": [
                    ("A", "Saka-tigraxauda", True),
                    ("B", "Saka-tiay-taradarayya", False),
                    ("C", "Saka-xaumovarka", False),
                    ("D", "Saka-massaget", False),
                ],
            },
            # 27
            {
                "body": "<p>O'zaro muvofiqlik SAQLANMAGAN javobni toping.</p>",
                "explanation": "Anaxita zardushtiylikda suv, hosildorlik va tozalik ma'budasi hisoblangan. Yovuzlik xudosi esa Ahrimandir.",
                "options": [
                    ("A", "Ahuramazda — zardushtiylarning oliy xudosi", False),
                    ("B", "Mitra — quyosh va yorug'lik xudosi", False),
                    ("C", "Anaxita — yovuzlik va o'lim xudosi", True),
                    ("D", "Ahriman — yovuzlik va o'lim xudosi", False),
                ],
            },
            # 28
            {
                "body": "<p>Doro I zabt etgan mamlakatlar qaysi alohida harbiy-ma'muriy o'lkalarga bo'lingan?</p>",
                "explanation": "Doro I butun imperiyani «satraplik» deb nomlangan harbiy-ma'muriy viloyatlarga ajratgan.",
                "options": [
                    ("A", "Satrapliklar", True),
                    ("B", "Nomlar", False),
                    ("C", "Kastalar", False),
                    ("D", "Polislar", False),
                ],
            },
            # 29
            {
                "body": (
                    "<p>Quyida berilgan ma'lumotlarga mos yakuniy xulosalar (to'g'ri/noto'g'ri) keltirilgan javobni aniqlang.</p>"
                    "<div style='padding:10px;border:1px solid #cbd5e1;border-radius:8px;background:rgba(100,116,139,0.05);line-height:1.7;font-size:13.5px;margin:10px 0;'>"
                    "I. Hind jamiyatida bir tabaqadan boshqasiga o'tish taqiqlangan edi.<br/>"
                    "II. Buddaviylik dinida avvaliga xudo tushunchasi bo'lmagan.<br/>"
                    "III. Sin Shixuandi maqbarasi atigi bir necha oy ichida qurib bitkazilgan."
                    "</div>"
                ),
                "explanation": "I to'g'ri. II to'g'ri. III noto'g'ri — maqbara 720 ming kishi tomonidan 37 yil davomida qurilgan.",
                "options": [
                    ("A", "I-to'g'ri; II-to'g'ri; III-noto'g'ri", True),
                    ("B", "I-noto'g'ri; II-to'g'ri; III-noto'g'ri", False),
                    ("C", "I-to'g'ri; II-noto'g'ri; III-to'g'ri", False),
                    ("D", "Hammasi noto'g'ri", False),
                ],
            },
            # 30
            {
                "body": (
                    "<p>Shaxslar va ularning ishlari to'g'ri moslashtirilgan javobni toping.</p>"
                    "<div style='display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:12px;margin:14px 0;'>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.7;'>"
                    "<b>1)</b> Chandragupta<br/>"
                    "<b>2)</b> Ashoka<br/>"
                    "<b>3)</b> Siddhartha Gautama"
                    "</div>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.7;'>"
                    "<b>a)</b> Maurya davlatiga asos solgan sarkarda<br/>"
                    "<b>b)</b> Maurya davlatini yuksaltirgan hukmdor<br/>"
                    "<b>c)</b> Buddaviylik diniga asos solgan shahzoda"
                    "</div>"
                    "</div>"
                ),
                "explanation": "1-a (Chandragupta — Maurya asoschisi), 2-b (Ashoka — Maurya yuksaltiruvchisi), 3-c (Siddhartha Gautama — Budda).",
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
                    "<p>Davlatlar va ularning poytaxtlarini to'g'ri moslashtiring.</p>"
                    "<div style='display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:12px;margin:14px 0;'>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.7;'>"
                    "<b>1)</b> Maurya davlati<br/>"
                    "<b>2)</b> Ahamoniylar davlati<br/>"
                    "<b>3)</b> Xett podsholigi"
                    "</div>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.7;'>"
                    "<b>a)</b> Persepol<br/>"
                    "<b>b)</b> Pataliputra<br/>"
                    "<b>c)</b> Xattusa"
                    "</div>"
                    "</div>"
                ),
                "explanation": "1-b (Maurya — Pataliputra), 2-a (Ahamoniylar — Persepol), 3-c (Xett — Xattusa).",
                "options": [
                    ("A", "1-b; 2-a; 3-c", True),
                    ("B", "1-a; 2-b; 3-c", False),
                    ("C", "1-c; 2-a; 3-b", False),
                    ("D", "1-b; 2-c; 3-a", False),
                ],
            },
            # 32
            {
                "body": (
                    "<p>Quyidagi qo'zg'olonlardan qaysilari Qadimgi Xitoyga tegishli?</p>"
                    "<div style='padding:10px;border:1px solid #cbd5e1;border-radius:8px;background:rgba(100,116,139,0.05);line-height:1.7;font-size:13.5px;margin:10px 0;'>"
                    "1) Lyu Ban qo'zg'oloni<br/>"
                    "2) «Qizil qoshlilar» qo'zg'oloni<br/>"
                    "3) «Sariq ro'mollilar» qo'zg'oloni<br/>"
                    "4) Spartak qo'zg'oloni<br/>"
                    "5) Muqanna qo'zg'oloni<br/>"
                    "6) Jakeriya qo'zg'oloni"
                    "</div>"
                ),
                "explanation": "Lyu Ban, «Qizil qoshlilar» va «Sariq ro'mollilar» qo'zg'olonlari Xitoy tarixiga oiddir (1, 2, 3). Spartak — Rim, Muqanna — Movarounnahr, Jakeriya — Fransiya.",
                "options": [
                    ("A", "1, 2, 3", True),
                    ("B", "4, 5, 6", False),
                    ("C", "1, 3, 5", False),
                    ("D", "2, 4, 6", False),
                ],
            },
            # 33 (Bank A-F)
            {
                "body": (
                    "<div style='padding:12px 14px;background:rgba(59,130,246,0.08);border:1px solid rgba(59,130,246,0.3);border-radius:8px;font-size:13px;line-height:1.7;margin-bottom:12px;'>"
                    "<b>33–35-topshiriqlarga mos javoblarni quyidagi banklardan (A–F) tanlang:</b><br/>"
                    "<b>A)</b> Xammurapi qonunlarining qabul qilinishi (mil.avv. XVIII asr);<br/>"
                    "<b>B)</b> Doro I ning satraplik islohoti (mil.avv. 522);<br/>"
                    "<b>C)</b> Sin Shixuandi Xitoyni birlashtirishi (mil.avv. 246);<br/>"
                    "<b>D)</b> Kir II Fors davlatiga asos solishi (mil.avv. 558);<br/>"
                    "<b>E)</b> Makedoniyalik Aleksandrning Ahamoniylarni bosib olishi (mil.avv. 330);<br/>"
                    "<b>F)</b> Ashoka hukmronligi davri (mil.avv. III asr)"
                    "</div>"
                    "<p><b>Berilgan voqealardan qaysi biri eng avval sodir bo'lgan?</b></p>"
                ),
                "explanation": "Mil.avv. XVIII asr — ro'yxatdagi eng qadimgi sana. To'g'ri javob: A (Xammurapi qonunlari).",
                "options": [
                    ("A", "Xammurapi qonunlarining qabul qilinishi (mil.avv. XVIII asr)", True),
                    ("B", "Doro I ning satraplik islohoti (mil.avv. 522)", False),
                    ("C", "Sin Shixuandi Xitoyni birlashtirishi (mil.avv. 246)", False),
                    ("D", "Kir II Fors davlatiga asos solishi (mil.avv. 558)", False),
                    ("E", "Makedoniyalik Aleksandrning Ahamoniylarni bosib olishi (mil.avv. 330)", False),
                    ("F", "Ashoka hukmronligi davri (mil.avv. III asr)", False),
                ],
            },
            # 34 (Bank A-F)
            {
                "body": (
                    "<div style='padding:12px 14px;background:rgba(59,130,246,0.08);border:1px solid rgba(59,130,246,0.3);border-radius:8px;font-size:13px;line-height:1.7;margin-bottom:12px;'>"
                    "<b>33–35-topshiriqlarga mos javoblarni quyidagi banklardan (A–F) tanlang:</b><br/>"
                    "<b>A)</b> Xammurapi qonunlarining qabul qilinishi (mil.avv. XVIII asr);<br/>"
                    "<b>B)</b> Doro I ning satraplik islohoti (mil.avv. 522);<br/>"
                    "<b>C)</b> Sin Shixuandi Xitoyni birlashtirishi (mil.avv. 246);<br/>"
                    "<b>D)</b> Kir II Fors davlatiga asos solishi (mil.avv. 558);<br/>"
                    "<b>E)</b> Makedoniyalik Aleksandrning Ahamoniylarni bosib olishi (mil.avv. 330);<br/>"
                    "<b>F)</b> Ashoka hukmronligi davri (mil.avv. III asr)"
                    "</div>"
                    "<p><b>Ahamoniylar davlatining tugatilishiga sabab bo'lgan voqeani aniqlang.</b></p>"
                ),
                "explanation": "Makedoniyalik Aleksandr mil.avv. 330-yilda Doro III ni yengib, Ahamoniylar imperiyasiga barham berdi. To'g'ri javob: E.",
                "options": [
                    ("A", "Xammurapi qonunlarining qabul qilinishi (mil.avv. XVIII asr)", False),
                    ("B", "Doro I ning satraplik islohoti (mil.avv. 522)", False),
                    ("C", "Sin Shixuandi Xitoyni birlashtirishi (mil.avv. 246)", False),
                    ("D", "Kir II Fors davlatiga asos solishi (mil.avv. 558)", False),
                    ("E", "Makedoniyalik Aleksandrning Ahamoniylarni bosib olishi (mil.avv. 330)", True),
                    ("F", "Ashoka hukmronligi davri (mil.avv. III asr)", False),
                ],
            },
            # 35 (Bank A-F)
            {
                "body": (
                    "<div style='padding:12px 14px;background:rgba(59,130,246,0.08);border:1px solid rgba(59,130,246,0.3);border-radius:8px;font-size:13px;line-height:1.7;margin-bottom:12px;'>"
                    "<b>33–35-topshiriqlarga mos javoblarni quyidagi banklardan (A–F) tanlang:</b><br/>"
                    "<b>A)</b> Xammurapi qonunlarining qabul qilinishi (mil.avv. XVIII asr);<br/>"
                    "<b>B)</b> Doro I ning satraplik islohoti (mil.avv. 522);<br/>"
                    "<b>C)</b> Sin Shixuandi Xitoyni birlashtirishi (mil.avv. 246);<br/>"
                    "<b>D)</b> Kir II Fors davlatiga asos solishi (mil.avv. 558);<br/>"
                    "<b>E)</b> Makedoniyalik Aleksandrning Ahamoniylarni bosib olishi (mil.avv. 330);<br/>"
                    "<b>F)</b> Ashoka hukmronligi davri (mil.avv. III asr)"
                    "</div>"
                    "<p><b>Berilgan voqealardan qaysi biri eng keyin sodir bo'lgan?</b></p>"
                ),
                "explanation": "Mil.avv. 246-yil — ro'yxatdagi eng so'nggi sana. To'g'ri javob: C (Sin Shixuandi Xitoyni birlashtirishi).",
                "options": [
                    ("A", "Xammurapi qonunlarining qabul qilinishi (mil.avv. XVIII asr)", False),
                    ("B", "Doro I ning satraplik islohoti (mil.avv. 522)", False),
                    ("C", "Sin Shixuandi Xitoyni birlashtirishi (mil.avv. 246)", True),
                    ("D", "Kir II Fors davlatiga asos solishi (mil.avv. 558)", False),
                    ("E", "Makedoniyalik Aleksandrning Ahamoniylarni bosib olishi (mil.avv. 330)", False),
                    ("F", "Ashoka hukmronligi davri (mil.avv. III asr)", False),
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
                "title": "Mesopotamiya.",
                "parts": [
                    ("a", "Shumerlar ixtiro qilgan, jahondagi eng qadimgi yozuvlardan birini yozing.", "Mixxat yozuvi (Mixxat)"),
                    ("b", "Mesopotamiya ibodatxonalari qanday nomlanganini yozing.", "Zikkuratlar (Zikkurat)"),
                ],
                "explanation": "a) Mixxat yozuvi; b) Zikkuratlar.",
            },
            # 37
            {
                "title": "Bobil podsholigi.",
                "parts": [
                    ("a", "«Bobil» so'zining ma'nosini yozing.", "«Xudolar darvozasi» (Xudo darvozasi)"),
                    ("b", "Tarixda qonunlar tuzgan birinchi hukmdorni yozing.", "Xammurapi"),
                ],
                "explanation": "a) «Xudolar darvozasi»; b) Xammurapi.",
            },
            # 38
            {
                "title": "Old Osiyo davlatlari.",
                "parts": [
                    ("a", "Ossuriya davlatining dastlabki poytaxtini yozing.", "Oshshur (Ashshur)"),
                    ("b", "Ossuriyaning ikkinchi (keyingi) poytaxtini yozing.", "Nineviya"),
                ],
                "explanation": "a) Oshshur; b) Nineviya.",
            },
            # 39
            {
                "title": "Ahamoniylar davlati.",
                "parts": [
                    ("a", "Fors davlatiga asos solgan hukmdorni yozing.", "Kir II (Kir 2)"),
                    ("b", "Saltanatni satrapliklarga bo'lgan, «darik» tangasini joriy etgan hukmdorni yozing.", "Doro I (Doro 1)"),
                ],
                "explanation": "a) Kir II; b) Doro I.",
            },
            # 40
            {
                "title": "Qadimgi Hindiston.",
                "parts": [
                    ("a", "Hind daryosi havzasidagi eng yirik ikki shaharni yozing.", "Moxenjodaro va Xarappa"),
                    ("b", "Hind jamiyati bo'lingan to'rt tabaqadan (kastadan) birinchisini — kohinlar tabaqasini yozing.", "Braxmanlar"),
                ],
                "explanation": "a) Moxenjodaro va Xarappa; b) Braxmanlar.",
            },
            # 41
            {
                "title": "Buddaviylik.",
                "parts": [
                    ("a", "Buddaviylik diniga asos solgan shahzodani yozing.", "Siddhartha Gautama (Budda)"),
                    ("b", "Bu din nima uchun «xudolarsiz din» deb atalganini qisqacha yozing.", "Avvaliga xudo tushunchasi bo'lmagan, xudolar inson azobini yengillashtira olmaydi deb hisoblangan"),
                ],
                "explanation": "a) Siddhartha Gautama; b) Avvaliga xudo tushunchasi bo'lmagan, xudolar inson azobini yengillashtira olmaydi deb hisoblangan.",
            },
            # 42
            {
                "title": "Qadimgi Xitoy.",
                "parts": [
                    ("a", "Xitoyni mil.avv. 246-yilda birlashtirgan hukmdorni yozing.", "Sin Shixuandi"),
                    ("b", "Uning maqbarasini qurgan odamlar sonini yozing.", "720 ming odam (720 000 kishi)"),
                ],
                "explanation": "a) Sin Shixuandi; b) 720 ming odam.",
            },
            # 43
            {
                "title": "Xitoy qo'zg'olonlari.",
                "parts": [
                    ("a", "Mil.avv. 206-yilda Sin sulolasiga qarshi qo'zg'olon ko'targan shaxsni yozing.", "Lyu Ban"),
                    ("b", "Milodiy II asrdagi eng yirik qo'zg'olon nomini yozing.", "«Sariq ro'mollilar» qo'zg'oloni"),
                ],
                "explanation": "a) Lyu Ban; b) «Sariq ro'mollilar» qo'zg'oloni.",
            },
            # 44
            {
                "title": "O'zbekiston hududidagi ilk davlatlar.",
                "parts": [
                    ("a", "So'g'diylar yashagan hududning yunon manbalaridagi nomini yozing.", "So'g'diyona"),
                    ("b", "Amudaryoning quyi oqimida yashagan xalqni yozing.", "Xorazmliklar"),
                ],
                "explanation": "a) So'g'diyona; b) Xorazmliklar.",
            },
            # 45
            {
                "title": "Zardushtiylik.",
                "parts": [
                    ("a", "Zardushtiylik diniga asos solgan shaxsni yozing.", "Zardusht (Zoroastr)"),
                    ("b", "Zardushtiylarning muqaddas kitobini yozing.", "«Avesto»"),
                ],
                "explanation": "a) Zardusht; b) «Avesto».",
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
