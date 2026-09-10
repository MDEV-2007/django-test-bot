"""Django management command: 6-sinf Tarix Milliy Sertifikat 45 talik mock testini yaratish.

Barcha to'g'ri javoblar, tahlillar va namunaviy yozma javoblar rasmiy kalit bo'yicha to'liq kiritilgan.

Foydalanish:
    python manage.py seed_tarix_mock
    python manage.py seed_tarix_mock --force
"""
from datetime import datetime
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from tests_app.models import Subject, TestSet, Question, AnswerOption, SubQuestion


MOCK_TITLE = "6-sinf Qadimgi Dunyo Tarixi — Milliy Sertifikat Namunaviy Mock Imtihon"
MOCK_DESC = (
    "11–20-mavzular: Mesopotamiya, Old Osiyo, Ahamoniylar, Qadimgi Hindiston-Xitoy, "
    "O'zbekiston hududidagi ilk davlatlar, Zardushtiylik. "
    "35 ta test topshirig'i (A, B, C, D) va 10 ta yozma (ochiq) savol. Jami: 45 ta topshiriq."
)


class Command(BaseCommand):
    help = "Tarix fanidan 45 talik Milliy Sertifikat mock imtihonini bazaga to'liq yuklaydi."

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help="Agar mavjud bo'lsa, eski testni o'chirib qayta yaratadi.",
        )
        parser.add_argument(
            '--today',
            action='store_true',
            help="Ertaga emas, aynan BUGUN soat 21:30 ga rejalashtirish.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        force = options.get('force', False)
        for_today = options.get('today', False)
        subject, _ = Subject.objects.get_or_create(slug="tarix", defaults={"name": "Tarix"})

        existing = TestSet.objects.filter(title=MOCK_TITLE).first()
        if existing:
            if force:
                self.stdout.write(f"Eski '{MOCK_TITLE}' (#{existing.id}) o'chirilmoqda...")
                existing.delete()
            else:
                self.stdout.write(
                    self.style.WARNING(
                        f"'{MOCK_TITLE}' allaqachon mavjud (ID: {existing.id}). "
                        f"Qayta yaratish uchun --force bayrog'ini ishlating: python manage.py seed_tarix_mock --force"
                    )
                )
                return

        # Toshkent vaqti bilan 21:30
        from zoneinfo import ZoneInfo
        toshkent_tz = ZoneInfo("Asia/Tashkent")
        now = timezone.now().astimezone(toshkent_tz)
        target_day = now if for_today else (now + timezone.timedelta(days=1))
        scheduled_at = datetime(
            target_day.year, target_day.month, target_day.day, 21, 30, 0, tzinfo=toshkent_tz
        )

        test_set = TestSet.objects.create(
            title=MOCK_TITLE,
            description=MOCK_DESC,
            subject=subject,
            category="certificate",
            duration_minutes=90,
            is_live_mock=True,
            scheduled_at=scheduled_at,
            is_published=True,
            is_premium=False,
            notify_all=True,
        )

        questions = []

        # -------------------------------------------------------------
        # I QISM: TEST TOPSHIRIQLARI (1 - 35)
        # -------------------------------------------------------------
        mcq_data = [
            {
                "body": "Quyidagilardan nomuvofiqlik saqlangan javobni aniqlang.",
                "explanation": "Gilgamish Uruk shahri podshosi va Mesopotamiya rivoyatlari qahramoni bo'lgan, Fors davlatiga aloqasi yo'q.",
                "options": [
                    ("A", "Xammurapi — Bobil podshosi, qonunlar tuzgan birinchi hukmdor", False),
                    ("B", "Oshshurbanapal — Ossuriya hukmdori, Nineviyada kutubxona to'plagan", False),
                    ("C", "Gilgamish — Fors davlati hukmdori", True),
                    ("D", "Kiaksar — Midiya podshosi", False),
                ],
            },
            {
                "body": (
                    "<p>Quyidagi hukmdorlar va ular bilan bog'liq ma'lumotlar mos ravishda berilgan javobni aniqlang.</p>"
                    "<div style='display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:12px;margin:14px 0;'>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;font-size:13.5px;line-height:1.8;background:rgba(100,116,139,0.05);'>"
                    "<b>1)</b> Sargon I<br/>"
                    "<b>2)</b> Xammurapi<br/>"
                    "<b>3)</b> Kir II<br/>"
                    "<b>4)</b> Doro I"
                    "</div>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;font-size:13.5px;line-height:1.8;background:rgba(100,116,139,0.05);'>"
                    "<b>a)</b> Fors davlatiga asos solgan, Midiya va Bobilni zabt etgan<br/>"
                    "<b>b)</b> Akkad va Shumerni birlashtirib, muntazam qo'shin tuzgan<br/>"
                    "<b>c)</b> Saltanatni satrapliklarga bo'lgan, \"darik\" tangasini joriy etgan<br/>"
                    "<b>d)</b> Mesopotamiyani birlashtirib, qonunlar tuzgan"
                    "</div>"
                    "</div>"
                ),
                "explanation": "1-b (Sargon I Akkad va Shumerni birlashtirdi); 2-d (Xammurapi qonunlar tuzgan); 3-a (Kir II Fors davlatiga asos solgan); 4-c (Doro I satrapliklar va 'darik' tangasi).",
                "options": [
                    ("A", "1-b; 2-d; 3-a; 4-c", True),
                    ("B", "1-a; 2-b; 3-c; 4-d", False),
                    ("C", "1-c; 2-a; 3-d; 4-b", False),
                    ("D", "1-b; 2-a; 3-d; 4-c", False),
                ],
            },
            {
                "body": "Yunonlar Dajla va Frot daryolari oralig'idagi vodiyni qanday atashgan?",
                "explanation": "Yunonlar Dajla va Frot oralig'idagi hududni Mesopotamiya (Ikki daryo oralig'i) deb atashgan.",
                "options": [
                    ("A", "Mesopotamiya", True),
                    ("B", "Baqtriana", False),
                    ("C", "Xorasmiya", False),
                    ("D", "Persepol", False),
                ],
            },
            {
                "body": (
                    "Quyidagi voqealar to'g'ri xronologik ketma-ketlikda ko'rsatilgan javobni toping.\n"
                    "1) Sargon I Akkad va Shumerni birlashtirdi (mil.avv. 3-ming yillik ikkinchi yarmi)\n"
                    "2) Xammurapi Mesopotamiyani birlashtirdi (mil.avv. XVIII asr)\n"
                    "3) Ossuriya Bobil va Midiya tomonidan bosib olindi (mil.avv. 605)\n"
                    "4) Bobil forslar tomonidan zabt etildi (mil.avv. 539)\n"
                    "5) Kir II Fors davlatiga asos soldi (mil.avv. 558)\n"
                    "6) Doro I taxtga chiqdi (mil.avv. 522)"
                ),
                "explanation": "3000-yillik ikkinchi yarmi -> 1792 (XVIII asr) -> 605 -> 558 -> 539 -> 522.",
                "options": [
                    ("A", "1, 2, 3, 5, 4, 6", True),
                    ("B", "1, 2, 3, 4, 5, 6", False),
                    ("C", "2, 1, 3, 5, 4, 6", False),
                    ("D", "1, 2, 5, 3, 4, 6", False),
                ],
            },
            {
                "body": (
                    "<p>Quyida berilgan Mesopotamiya xudolari va ularning izohi to'g'ri moslashtirilgan javobni toping.</p>"
                    "<div style='display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:12px;margin:14px 0;'>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;font-size:13.5px;line-height:1.8;background:rgba(100,116,139,0.05);'>"
                    "<b>I</b> Shamash<br/>"
                    "<b>II</b> Sin<br/>"
                    "<b>III</b> Ea<br/>"
                    "<b>IV</b> Ishtar"
                    "</div>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;font-size:13.5px;line-height:1.8;background:rgba(100,116,139,0.05);'>"
                    "<b>a</b> Quyosh xudosi, oliy hakam<br/>"
                    "<b>b</b> Oy xudosi<br/>"
                    "<b>c</b> Suv xudosi<br/>"
                    "<b>d</b> Hosildorlik, sevgi, urush va g'alaba ilohasi<br/>"
                    "<b>e</b> Yerosti saltanati xudosi"
                    "</div>"
                    "</div>"
                ),
                "explanation": "Shamash — quyosh; Sin — oy; Ea — suv; Ishtar — hosildorlik-sevgi-urush ilohasi.",
                "options": [
                    ("A", "I-a, II-b, III-c, IV-d", True),
                    ("B", "I-b, II-a, III-c, IV-d", False),
                    ("C", "I-a, II-c, III-b, IV-d", False),
                    ("D", "I-a, II-b, III-d, IV-c", False),
                ],
            },
            {
                "body": (
                    "<p>Quyida berilgan Hindiston tabaqalari (varnalar) va ularning izohi to'g'ri moslashtirilgan javobni toping.</p>"
                    "<div style='display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:12px;margin:14px 0;'>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;font-size:13.5px;line-height:1.8;background:rgba(100,116,139,0.05);'>"
                    "<b>I</b> Braxmanlar<br/>"
                    "<b>II</b> Kshatriylar<br/>"
                    "<b>III</b> Vayshiylar<br/>"
                    "<b>IV</b> Shudralar"
                    "</div>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;font-size:13.5px;line-height:1.8;background:rgba(100,116,139,0.05);'>"
                    "<b>a</b> Kohinlar, hind ruhoniylari<br/>"
                    "<b>b</b> Jangchilar<br/>"
                    "<b>c</b> Dehqon, hunarmand va savdogarlar<br/>"
                    "<b>d</b> Xizmatkorlar va qullar<br/>"
                    "<b>e</b> Hech qaysi tabaqaga mansub bo'lmaganlar"
                    "</div>"
                    "</div>"
                ),
                "explanation": "Braxmanlar — kohinlar; Kshatriylar — jangchilar; Vayshiylar — dehqon-hunarmand-savdogar; Shudralar — xizmatkor-qul.",
                "options": [
                    ("A", "I-a, II-b, III-c, IV-d", True),
                    ("B", "I-b, II-a, III-c, IV-d", False),
                    ("C", "I-a, II-c, III-b, IV-d", False),
                    ("D", "I-a, II-b, III-d, IV-c", False),
                ],
            },
            {
                "body": (
                    "Tarixiy shaxsni aniqlang. Uruk shahri podshosi bo'lgan, Mesopotamiya rivoyatlarining eng sevimli qahramoni. "
                    "U boqiy hayotga erishish uchun sehrli giyoh izlagan, ammo ilon uni o'g'irlab ketgan."
                ),
                "explanation": "Gilgamish — Uruk shahri podshosi bo'lgan, Mesopotamiya dostonining bosh qahramoni.",
                "options": [
                    ("A", "Gilgamish", True),
                    ("B", "Sargon I", False),
                    ("C", "Xammurapi", False),
                    ("D", "Oshshurbanapal", False),
                ],
            },
            {
                "body": (
                    "Tarixiy shaxsni aniqlang. U mil.avv. 522-yilda Fors taxtiga chiqdi, saltanatni satrapliklarga bo'ldi, "
                    "\"darik\" oltin tangasini joriy etdi va Persepoldan boshlangan \"shoh yo'li\"ni qurdirdi."
                ),
                "explanation": "Doro I mil.avv. 522-yilda taxtga chiqib, satrapliklar va 'darik' oltin tangasini joriy etgan, 'shoh yo'li'ni qurdorgan.",
                "options": [
                    ("A", "Doro I", True),
                    ("B", "Kir II", False),
                    ("C", "Kambiz II", False),
                    ("D", "Kiaksar", False),
                ],
            },
            {
                "body": (
                    "Tarixiy davlatni aniqlang. Chandragupta tomonidan asos solingan, poytaxti Pataliputra bo'lgan, "
                    "Ashoka davrida yuksak taraqqiyotga erishgan Shimoliy Hindiston davlati."
                ),
                "explanation": "Chandragupta Maurya davlatiga asos solgan, poytaxti Pataliputra, Ashoka davrida eng yuksak taraqqiyotga erishgan.",
                "options": [
                    ("A", "Maurya davlati", True),
                    ("B", "Magadha davlati", False),
                    ("C", "Koshala davlati", False),
                    ("D", "Malla davlati", False),
                ],
            },
            {
                "body": (
                    "Tarixiy shaxsni aniqlang. Mil.avv. 246-yilda Xitoyni birlashtirgan, o'ziga tirikligidayoq maqbara qurdirgan, "
                    "Buyuk Xitoy devorini mustahkamlashni buyurgan hukmdor."
                ),
                "explanation": "Sin Shixuandi mil.avv. 246-yilda Xitoyni birlashtirgan, Buyuk Xitoy devorini mustahkamlagan va tirikligidayoq ulkan maqbara qurdirgan.",
                "options": [
                    ("A", "Sin Shixuandi", True),
                    ("B", "U-Di", False),
                    ("C", "Lyu Ban", False),
                    ("D", "Chandragupta", False),
                ],
            },
            {
                "body": (
                    "Quyidagi shaharlardan qaysilari qadimgi shumer shahar-davlatlariga tegishli?\n"
                    "1) Uruk, 2) Umma, 3) Nineviya, 4) Lagash, 5) Xattusa, 6) Ur"
                ),
                "explanation": "Nineviya — Ossuriya poytaxti, Xattusa — Xett poytaxti, shumer shaharlari emas. Uruk, Umma, Lagash, Ur esa Shumerga tegishli.",
                "options": [
                    ("A", "1, 2, 4, 6", True),
                    ("B", "1, 3, 5, 6", False),
                    ("C", "2, 3, 4, 5", False),
                    ("D", "1, 4, 5, 6", False),
                ],
            },
            {
                "body": "Ossuriya davlati qaysi ikki davlat tomonidan mil.avv. 605-yilda bosib olindi?",
                "explanation": "Ossuriya davlati mil.avv. 605-yilda Bobil va Midiya davlatlari ittifoqi tomonidan butunlay tugatilgan.",
                "options": [
                    ("A", "Bobil va Midiya", True),
                    ("B", "Fors va Misr", False),
                    ("C", "Xett va Mitanni", False),
                    ("D", "Lidiya va Urartu", False),
                ],
            },
            {
                "body": "Mil.avv. VII-VI asrlarda O'zbekiston hududi uchun xos bo'lgan holatni aniqlang.",
                "explanation": "Mil.avv. VII-VI asrlarda O'zbekiston hududida ilk davlatchilik kurtaklari: So'g'd, Baqtriya, Xorazm va sak qabilalari mavjud bo'lgan.",
                "options": [
                    ("A", "Hududda so'g'dlar, xorazmiylar, baqtriyaliklar va saklar yashagan", True),
                    ("B", "Hudud yagona markazlashgan davlatga birlashgan edi", False),
                    ("C", "Butun hudud Xitoy tarkibida edi", False),
                    ("D", "Yozuv umuman mavjud emas edi", False),
                ],
            },
            {
                "body": (
                    "Quyidagi xudolardan qaysilari zardushtiylikka tegishli?\n"
                    "1) Ahuramazda, 2) Zevs, 3) Mitra, 4) Amon-Ra, 5) Anaxita, 6) Ahriman"
                ),
                "explanation": "Ahuramazda (oliy xudo), Mitra (quyosh/yorug'lik), Anaxita (hosildorlik/suv), Ahriman (yovuzlik). Zevs — yunon, Amon-Ra — misr xudosi.",
                "options": [
                    ("A", "1, 3, 5, 6", True),
                    ("B", "1, 2, 4, 5", False),
                    ("C", "2, 3, 4, 6", False),
                    ("D", "3, 4, 5, 6", False),
                ],
            },
            {
                "body": "Buyuk Xitoy devorining uzunligi qariyb qancha bo'lgan?",
                "explanation": "Buyuk Xitoy devorining uzunligi qariyb 4000 kilometr bo'lgan.",
                "options": [
                    ("A", "4000 kilometr", True),
                    ("B", "1000 kilometr", False),
                    ("C", "10 000 kilometr", False),
                    ("D", "500 kilometr", False),
                ],
            },
            {
                "body": (
                    "Quyidagi voqealar to'g'ri xronologik ketma-ketlikda ko'rsatilgan javobni toping.\n"
                    "1) Sin Shixuandi Xitoyni birlashtirdi (mil.avv. 246)\n"
                    "2) Lyu Ban qo'zg'oloni, Xan sulolasi boshlandi (mil.avv. 206)\n"
                    "3) \"Sariq ro'mollilar\" qo'zg'oloni (milodiy II asr)\n"
                    "4) Ashoka hukmronligi (mil.avv. III asr)\n"
                    "5) Makedoniyalik Aleksandr Ahamoniylarni bosib oldi (mil.avv. 330)"
                ),
                "explanation": "330 (Aleksandr) -> mil.avv. III asr (Ashoka) -> 246 (Sin Shixuandi) -> 206 (Lyu Ban) -> milodiy II asr (Sariq ro'mollilar).",
                "options": [
                    ("A", "5, 4, 1, 2, 3", True),
                    ("B", "1, 5, 4, 2, 3", False),
                    ("C", "4, 5, 1, 2, 3", False),
                    ("D", "5, 1, 4, 2, 3", False),
                ],
            },
            {
                "body": (
                    "<p>Sxematik diagrammada uch qadimgi sivilizatsiya daryo vodiysi ko'rsatilgan. "
                    "1–3 raqamlaridan qaysi biri <b>Qadimgi Xitoy sivilizatsiyasi</b> vujudga kelgan hududni bildiradi?</p>"
                    "<div style='display:flex;gap:12px;justify-content:center;margin:18px 0;flex-wrap:wrap;'>"
                    "<div style='border:2px solid #94a3b8;border-radius:10px;width:140px;overflow:hidden;background:rgba(148,163,184,0.08);text-align:center;'>"
                    "<div style='background:rgba(148,163,184,0.2);padding:6px;font-weight:bold;font-size:16px;border-bottom:1px solid #94a3b8;'>1</div>"
                    "<div style='padding:12px 8px;font-size:13px;font-weight:500;min-height:54px;display:flex;align-items:center;justify-content:center;'>Dajla-Frot oralig'i</div>"
                    "<div style='padding:6px;font-weight:bold;font-size:18px;color:#f59e0b;border-top:1px dashed #94a3b8;'>?</div>"
                    "</div>"
                    "<div style='border:2px solid #94a3b8;border-radius:10px;width:140px;overflow:hidden;background:rgba(148,163,184,0.08);text-align:center;'>"
                    "<div style='background:rgba(148,163,184,0.2);padding:6px;font-weight:bold;font-size:16px;border-bottom:1px solid #94a3b8;'>2</div>"
                    "<div style='padding:12px 8px;font-size:13px;font-weight:500;min-height:54px;display:flex;align-items:center;justify-content:center;'>Hind-Gang vodiysi</div>"
                    "<div style='padding:6px;font-weight:bold;font-size:18px;color:#f59e0b;border-top:1px dashed #94a3b8;'>?</div>"
                    "</div>"
                    "<div style='border:2px solid #94a3b8;border-radius:10px;width:140px;overflow:hidden;background:rgba(148,163,184,0.08);text-align:center;'>"
                    "<div style='background:rgba(148,163,184,0.2);padding:6px;font-weight:bold;font-size:16px;border-bottom:1px solid #94a3b8;'>3</div>"
                    "<div style='padding:12px 8px;font-size:13px;font-weight:500;min-height:54px;display:flex;align-items:center;justify-content:center;'>Xuanxe-Yantszi vodiysi</div>"
                    "<div style='padding:6px;font-weight:bold;font-size:18px;color:#f59e0b;border-top:1px dashed #94a3b8;'>?</div>"
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
            {
                "body": (
                    "<p>Tarixiy voqea va uning natijasi o'zaro to'g'ri mos berilgan qatorlarni aniqlang.</p>"
                    "<div style='overflow-x:auto;margin:16px 0;border-radius:8px;border:1px solid #cbd5e1;'>"
                    "<table style='width:100%;border-collapse:collapse;font-size:14px;'>"
                    "<thead><tr style='background:rgba(100,116,139,0.12);border-bottom:2px solid #94a3b8;'>"
                    "<th style='padding:8px 10px;border-right:1px solid #cbd5e1;width:44px;text-align:center;'>№</th>"
                    "<th style='padding:8px 12px;border-right:1px solid #cbd5e1;text-align:left;'>Voqea</th>"
                    "<th style='padding:8px 12px;text-align:left;'>Natija</th>"
                    "</tr></thead>"
                    "<tbody>"
                    "<tr style='border-bottom:1px solid #e2e8f0;'><td style='padding:8px 10px;border-right:1px solid #cbd5e1;text-align:center;font-weight:bold;'>1</td><td style='padding:8px 12px;border-right:1px solid #cbd5e1;'>Xammurapi Mesopotamiyani birlashtirishi</td><td style='padding:8px 12px;'>Bobil eng qudratli davlatga aylandi</td></tr>"
                    "<tr style='border-bottom:1px solid #e2e8f0;background:rgba(100,116,139,0.04);'><td style='padding:8px 10px;border-right:1px solid #cbd5e1;text-align:center;font-weight:bold;'>2</td><td style='padding:8px 12px;border-right:1px solid #cbd5e1;'>Kir II ning Midiyani bo'ysundirishi</td><td style='padding:8px 12px;'>Fors davlati zaiflashib qoldi</td></tr>"
                    "<tr style='border-bottom:1px solid #e2e8f0;'><td style='padding:8px 10px;border-right:1px solid #cbd5e1;text-align:center;font-weight:bold;'>3</td><td style='padding:8px 12px;border-right:1px solid #cbd5e1;'>Doro I ning satraplik islohoti</td><td style='padding:8px 12px;'>Saltanat boshqaruvi mustahkamlandi</td></tr>"
                    "<tr style='border-bottom:1px solid #e2e8f0;background:rgba(100,116,139,0.04);'><td style='padding:8px 10px;border-right:1px solid #cbd5e1;text-align:center;font-weight:bold;'>4</td><td style='padding:8px 12px;border-right:1px solid #cbd5e1;'>Sin Shixuandi hukmronligi</td><td style='padding:8px 12px;'>Xitoy mayda davlatlarga bo'linib ketdi</td></tr>"
                    "<tr style='border-bottom:1px solid #e2e8f0;'><td style='padding:8px 10px;border-right:1px solid #cbd5e1;text-align:center;font-weight:bold;'>5</td><td style='padding:8px 12px;border-right:1px solid #cbd5e1;'>Zardushtning va'zlari</td><td style='padding:8px 12px;'>\"Avesto\" kitobi vujudga keldi</td></tr>"
                    "<tr><td style='padding:8px 10px;border-right:1px solid #cbd5e1;text-align:center;font-weight:bold;'>6</td><td style='padding:8px 12px;border-right:1px solid #cbd5e1;'>Chandragupta kurashi</td><td style='padding:8px 12px;'>Yunon-makedon qo'shinlari Hindistonni butunlay egalladi</td></tr>"
                    "</tbody></table></div>"
                ),
                "explanation": "2 xato: aksincha, Kir II davrida Fors kuchaydi. 4 xato: Sin Shixuandi Xitoyni birlashtirdi. 6 xato: Chandragupta yunon-makedon qo'shinlariga qarshi kurashib g'alaba qozondi.",
                "options": [
                    ("A", "1, 3, 5", True),
                    ("B", "2, 4, 6", False),
                    ("C", "1, 2, 3", False),
                    ("D", "4, 5, 6", False),
                ],
            },
            {
                "body": (
                    "<p>Jadvalda harflar bilan belgilangan o'rinlarga mos keluvchi ma'lumotni toping.</p>"
                    "<div style='overflow-x:auto;margin:16px 0;border-radius:8px;border:1px solid #cbd5e1;'>"
                    "<table style='width:100%;border-collapse:collapse;font-size:14px;'>"
                    "<thead><tr style='background:rgba(100,116,139,0.12);border-bottom:2px solid #94a3b8;'>"
                    "<th style='padding:8px 12px;border-right:1px solid #cbd5e1;text-align:left;width:130px;'>Davr</th>"
                    "<th style='padding:8px 12px;border-right:1px solid #cbd5e1;text-align:left;'>O'rta Osiyo voqeasi</th>"
                    "<th style='padding:8px 12px;text-align:left;'>Jahon voqeasi</th>"
                    "</tr></thead>"
                    "<tbody>"
                    "<tr style='border-bottom:1px solid #e2e8f0;'><td style='padding:10px 12px;border-right:1px solid #cbd5e1;font-weight:bold;'>Mil.avv. VI asr</td><td style='padding:10px 12px;border-right:1px solid #cbd5e1;font-weight:bold;color:#f59e0b;font-size:16px;'>a</td><td style='padding:10px 12px;'>Doro I Fors taxtiga chiqdi (mil.avv. 522)</td></tr>"
                    "<tr style='background:rgba(100,116,139,0.04);'><td style='padding:10px 12px;border-right:1px solid #cbd5e1;font-weight:bold;'>Mil.avv. III asr</td><td style='padding:10px 12px;border-right:1px solid #cbd5e1;'>Zardusht va'zlari 21 ta kitobga jamlandi</td><td style='padding:10px 12px;font-weight:bold;color:#f59e0b;font-size:16px;'>b</td></tr>"
                    "</tbody></table></div>"
                    "<div style='padding:10px 14px;background:rgba(100,116,139,0.08);border-radius:8px;font-size:13px;line-height:1.6;'>"
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
            {
                "body": (
                    "<p>Quyida berilgan ma'lumotlarni tahlil qilib <b>Eyler-Venn diagrammasiga</b> mos keladigan javoblarni aniqlang (Bobil va Ossuriya davlatlari):</p>"
                    "<div style='display:flex;justify-content:center;margin:18px 0;'>"
                    "<svg width='360' height='190' viewBox='0 0 360 190' style='max-width:100%;height:auto;'>"
                    "<circle cx='130' cy='95' r='80' fill='rgba(59, 130, 246, 0.12)' stroke='#3b82f6' stroke-width='2.5' />"
                    "<circle cx='230' cy='95' r='80' fill='rgba(245, 158, 11, 0.12)' stroke='#f59e0b' stroke-width='2.5' />"
                    "<text x='85' y='85' font-size='18' font-weight='bold' fill='currentColor' text-anchor='middle'>I</text>"
                    "<text x='85' y='108' font-size='14' font-weight='600' fill='currentColor' text-anchor='middle'>Bobil</text>"
                    "<text x='180' y='100' font-size='18' font-weight='bold' fill='currentColor' text-anchor='middle'>III</text>"
                    "<text x='275' y='85' font-size='18' font-weight='bold' fill='currentColor' text-anchor='middle'>II</text>"
                    "<text x='275' y='108' font-size='14' font-weight='600' fill='currentColor' text-anchor='middle'>Ossuriya</text>"
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
                "explanation": "I (faqat Bobil): Bobil poytaxti (a), Xammurapi qonunlari (d). II (umumiy kesishma): Mesopotamiya hududi (c), mil.avv. 605-yilda tarix sahnasidan ketishi (f). III (faqat Ossuriya): Nineviya poytaxti (b), Oshshurbanapal kutubxonasi (e).",
                "options": [
                    ("A", "I-a,d; II-c,e; III-b,f", False),
                    ("B", "I-b,f; II-c,e; III-a,d", False),
                    ("C", "I-a,d; II-c,f; III-b,e", True),
                    ("D", "I-a,e; II-c,d; III-b,f", False),
                ],
            },
            {
                "body": (
                    "<p>Quyidagi davlatlar va ularning poytaxtlarini to'g'ri moslashtiring.</p>"
                    "<div style='display:grid;grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));gap:12px;margin:14px 0;'>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;font-size:13.5px;line-height:1.8;background:rgba(100,116,139,0.05);'>"
                    "<b>1)</b> Elam<br/>"
                    "<b>2)</b> Ossuriya (keyingi)<br/>"
                    "<b>3)</b> Xett<br/>"
                    "<b>4)</b> Urartu"
                    "</div>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;font-size:13.5px;line-height:1.8;background:rgba(100,116,139,0.05);'>"
                    "<b>a)</b> Nineviya<br/>"
                    "<b>b)</b> Tushpa<br/>"
                    "<b>c)</b> Suza<br/>"
                    "<b>d)</b> Xattusa"
                    "</div>"
                    "</div>"
                ),
                "explanation": "Elam — Suza; Ossuriya — Nineviya; Xett — Xattusa; Urartu — Tushpa.",
                "options": [
                    ("A", "1-c; 2-a; 3-d; 4-b", True),
                    ("B", "1-a; 2-c; 3-b; 4-d", False),
                    ("C", "1-c; 2-d; 3-a; 4-b", False),
                    ("D", "1-b; 2-a; 3-d; 4-c", False),
                ],
            },
            {
                "body": "Zardushtiylarning muqaddas kitobi qanday nomlangan?",
                "explanation": "Zardushtiylarning muqaddas kitobi 'Avesto' deb ataladi.",
                "options": [
                    ("A", "\"Avesto\"", True),
                    ("B", "\"Bibliya\"", False),
                    ("C", "\"Rigveda\"", False),
                    ("D", "\"Zand\"", False),
                ],
            },
            {
                "body": "\"Avesto\" matnlariga yozilgan sharh qanday nomlangan?",
                "explanation": "'Avesto' matnlariga keyinchalik yozilgan sharh 'Zand' deb ataladi.",
                "options": [
                    ("A", "\"Zand\"", True),
                    ("B", "\"Rigveda\"", False),
                    ("C", "\"Mahabharat\"", False),
                    ("D", "\"Bibliya\"", False),
                ],
            },
            {
                "body": (
                    "Quyidagi ixtirolardan qaysilari Qadimgi Xitoyga tegishli?\n"
                    "1) Qog'oz, 2) Kompas, 3) Alifbo (22 harf), 4) Seysmograf, 5) Shaxmat, 6) Nol raqami"
                ),
                "explanation": "Qog'oz, kompas, seysmograf — Qadimgi Xitoy ixtirolari. Alifbo (22 harf) — Finikiya, shaxmat va nol raqami — Hindiston.",
                "options": [
                    ("A", "1, 2, 4", True),
                    ("B", "3, 5, 6", False),
                    ("C", "1, 3, 5", False),
                    ("D", "2, 4, 6", False),
                ],
            },
            {
                "body": (
                    "Quyidagi xalqlardan qaysilari mil.avv. VII-VI asrlarda O'zbekiston hududida yashagan?\n"
                    "1) So'g'diylar, 2) Xorazmliklar, 3) Finikiyaliklar, 4) Baqtriyaliklar, 5) Ossuriyaliklar, 6) Saklar"
                ),
                "explanation": "So'g'diylar, xorazmliklar, baqtriyaliklar va saklar mil.avv. VII-VI asrlarda O'zbekiston hududida yashagan.",
                "options": [
                    ("A", "1, 2, 4, 6", True),
                    ("B", "1, 3, 5, 6", False),
                    ("C", "2, 3, 4, 5", False),
                    ("D", "1, 2, 3, 4", False),
                ],
            },
            {
                "body": "Saklarning \"o'tkir uchli kigiz qalpoq kiyib yuruvchi\" guruhi qanday atalgan?",
                "explanation": "Saka-tigraxauda — o'tkir uchli kigiz qalpoq kiyib yuruvchi saklar guruhi.",
                "options": [
                    ("A", "Saka-tigraxauda", True),
                    ("B", "Saka-tiay-taradarayya", False),
                    ("C", "Saka-xaumovarka", False),
                    ("D", "Saka-massaget", False),
                ],
            },
            {
                "body": "O'zaro muvofiqlik SAQLANMAGAN javobni toping.",
                "explanation": "Anaxita hosildorlik va suv ilohasi hisoblanadi, yovuzlik va o'lim xudosi esa Ahrimandir.",
                "options": [
                    ("A", "Ahuramazda — zardushtiylarning oliy xudosi", False),
                    ("B", "Mitra — quyosh va yorug'lik xudosi", False),
                    ("C", "Anaxita — yovuzlik va o'lim xudosi", True),
                    ("D", "Ahriman — yovuzlik va o'lim xudosi", False),
                ],
            },
            {
                "body": "Doro I zabt etgan mamlakatlar qaysi alohida harbiy-ma'muriy o'lkalarga bo'lingan?",
                "explanation": "Doro I davlatni satraplik deb atalgan harbiy-ma'muriy o'lkalarga bo'lgan.",
                "options": [
                    ("A", "Satrapliklar", True),
                    ("B", "Nomlar", False),
                    ("C", "Kastalar", False),
                    ("D", "Polislar", False),
                ],
            },
            {
                "body": (
                    "Quyida berilgan ma'lumotlarga mos yakuniy xulosalar (to'g'ri/noto'g'ri) keltirilgan javobni aniqlang.\n"
                    "I. Hind jamiyatida bir tabaqadan boshqasiga o'tish taqiqlangan edi.\n"
                    "II. Buddaviylik dinida avvaliga xudo tushunchasi bo'lmagan.\n"
                    "III. Sin Shixuandi maqbarasi atigi bir necha oy ichida qurib bitkazilgan."
                ),
                "explanation": "I to'g'ri. II to'g'ri. III noto'g'ri — Sin Shixuandi maqbarasi bir necha oyda emas, 720 ming odam tomonidan 37 yil davomida qurilgan.",
                "options": [
                    ("A", "I-to'g'ri; II-to'g'ri; III-noto'g'ri", True),
                    ("B", "I-noto'g'ri; II-to'g'ri; III-noto'g'ri", False),
                    ("C", "I-to'g'ri; II-noto'g'ri; III-to'g'ri", False),
                    ("D", "Hammasi noto'g'ri", False),
                ],
            },
            {
                "body": (
                    "<p>Shaxslar va ularning ishlari to'g'ri moslashtirilgan javobni toping.</p>"
                    "<div style='display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:12px;margin:14px 0;'>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;font-size:13.5px;line-height:1.8;background:rgba(100,116,139,0.05);'>"
                    "<b>1)</b> Chandragupta<br/>"
                    "<b>2)</b> Ashoka<br/>"
                    "<b>3)</b> Siddhartha Gautama"
                    "</div>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;font-size:13.5px;line-height:1.8;background:rgba(100,116,139,0.05);'>"
                    "<b>a)</b> Maurya davlatiga asos solgan sarkarda<br/>"
                    "<b>b)</b> Maurya davlatini yuksaltirgan hukmdor<br/>"
                    "<b>c)</b> Buddaviylik diniga asos solgan shahzoda"
                    "</div>"
                    "</div>"
                ),
                "explanation": "Chandragupta — Maurya davlatiga asos solgan; Ashoka — Maurya davlatini yuksaltirgan; Siddhartha Gautama — Buddaviylik diniga asos solgan.",
                "options": [
                    ("A", "1-a; 2-b; 3-c", True),
                    ("B", "1-b; 2-a; 3-c", False),
                    ("C", "1-c; 2-a; 3-b", False),
                    ("D", "1-a; 2-c; 3-b", False),
                ],
            },
            {
                "body": (
                    "<p>Davlatlar va ularning poytaxtlarini to'g'ri moslashtiring.</p>"
                    "<div style='display:grid;grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));gap:12px;margin:14px 0;'>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;font-size:13.5px;line-height:1.8;background:rgba(100,116,139,0.05);'>"
                    "<b>1)</b> Maurya davlati<br/>"
                    "<b>2)</b> Ahamoniylar davlati<br/>"
                    "<b>3)</b> Xett podsholigi"
                    "</div>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;font-size:13.5px;line-height:1.8;background:rgba(100,116,139,0.05);'>"
                    "<b>a)</b> Persepol<br/>"
                    "<b>b)</b> Pataliputra<br/>"
                    "<b>c)</b> Xattusa"
                    "</div>"
                    "</div>"
                ),
                "explanation": "Maurya davlati — Pataliputra; Ahamoniylar davlati — Persepol; Xett podsholigi — Xattusa.",
                "options": [
                    ("A", "1-b; 2-a; 3-c", True),
                    ("B", "1-a; 2-b; 3-c", False),
                    ("C", "1-c; 2-a; 3-b", False),
                    ("D", "1-b; 2-c; 3-a", False),
                ],
            },
            {
                "body": (
                    "Quyidagi qo'zg'olonlardan qaysilari Qadimgi Xitoyga tegishli?\n"
                    "1) Lyu Ban qo'zg'oloni\n"
                    "2) \"Qizil qoshlilar\" qo'zg'oloni\n"
                    "3) \"Sariq ro'mollilar\" qo'zg'oloni\n"
                    "4) Spartak qo'zg'oloni\n"
                    "5) Muqanna qo'zg'oloni\n"
                    "6) Jakeriya qo'zg'oloni"
                ),
                "explanation": "Lyu Ban qo'zg'oloni, 'Qizil qoshlilar', 'Sariq ro'mollilar' — Qadimgi Xitoydagi qo'zg'olonlar.",
                "options": [
                    ("A", "1, 2, 3", True),
                    ("B", "4, 5, 6", False),
                    ("C", "1, 3, 5", False),
                    ("D", "2, 4, 6", False),
                ],
            },
            {
                "body": (
                    "33–35-topshiriqlarga mos javoblarni quyidagi banklardan (A–F) tanlang:\n"
                    "A) Xammurapi qonunlarining qabul qilinishi (mil.avv. XVIII asr)\n"
                    "B) Doro I ning satraplik islohoti (mil.avv. 522)\n"
                    "C) Sin Shixuandi Xitoyni birlashtirishi (mil.avv. 246)\n"
                    "D) Kir II Fors davlatiga asos solishi (mil.avv. 558)\n"
                    "E) Makedoniyalik Aleksandrning Ahamoniylarni bosib olishi (mil.avv. 330)\n"
                    "F) Ashoka hukmronligi davri (mil.avv. III asr)\n\n"
                    "<b>33-topshiriq:</b> Berilgan voqealardan qaysi biri eng avval sodir bo'lgan?"
                ),
                "explanation": "Mil.avv. XVIII asr — ro'yxatdagi eng qadimgi sana. To'g'ri javob: A (Xammurapi qonunlarining qabul qilinishi).",
                "options": [
                    ("A", "Xammurapi qonunlarining qabul qilinishi (mil.avv. XVIII asr)", True),
                    ("B", "Kir II Fors davlatiga asos solishi (mil.avv. 558)", False),
                    ("C", "Doro I ning satraplik islohoti (mil.avv. 522)", False),
                    ("D", "Makedoniyalik Aleksandrning Ahamoniylarni bosib olishi (mil.avv. 330)", False),
                ],
            },
            {
                "body": (
                    "33–35-topshiriqlarga mos javoblarni quyidagi banklardan (A–F) tanlang:\n"
                    "A) Xammurapi qonunlarining qabul qilinishi (mil.avv. XVIII asr)\n"
                    "B) Doro I ning satraplik islohoti (mil.avv. 522)\n"
                    "C) Sin Shixuandi Xitoyni birlashtirishi (mil.avv. 246)\n"
                    "D) Kir II Fors davlatiga asos solishi (mil.avv. 558)\n"
                    "E) Makedoniyalik Aleksandrning Ahamoniylarni bosib olishi (mil.avv. 330)\n"
                    "F) Ashoka hukmronligi davri (mil.avv. III asr)\n\n"
                    "<b>34-topshiriq:</b> Ahamoniylar davlatining tugatilishiga sabab bo'lgan voqeani aniqlang."
                ),
                "explanation": "Makedoniyalik Aleksandr mil.avv. 330-yilda Ahamoniylar davlatini bosib oldi. To'g'ri javob: E.",
                "options": [
                    ("A", "Makedoniyalik Aleksandrning Ahamoniylarni bosib olishi (mil.avv. 330)", True),
                    ("B", "Doro I ning satraplik islohoti (mil.avv. 522)", False),
                    ("C", "Kir II Fors davlatiga asos solishi (mil.avv. 558)", False),
                    ("D", "Ashoka hukmronligi davri (mil.avv. III asr)", False),
                ],
            },
            {
                "body": (
                    "33–35-topshiriqlarga mos javoblarni quyidagi banklardan (A–F) tanlang:\n"
                    "A) Xammurapi qonunlarining qabul qilinishi (mil.avv. XVIII asr)\n"
                    "B) Doro I ning satraplik islohoti (mil.avv. 522)\n"
                    "C) Sin Shixuandi Xitoyni birlashtirishi (mil.avv. 246)\n"
                    "D) Kir II Fors davlatiga asos solishi (mil.avv. 558)\n"
                    "E) Makedoniyalik Aleksandrning Ahamoniylarni bosib olishi (mil.avv. 330)\n"
                    "F) Ashoka hukmronligi davri (mil.avv. III asr)\n\n"
                    "<b>35-topshiriq:</b> Berilgan voqealardan qaysi biri eng keyin sodir bo'lgan?"
                ),
                "explanation": "Mil.avv. 246-yil — ro'yxatdagi eng so'nggi sana. To'g'ri javob: C (Sin Shixuandi Xitoyni birlashtirishi).",
                "options": [
                    ("A", "Sin Shixuandi Xitoyni birlashtirishi (mil.avv. 246)", True),
                    ("B", "Ashoka hukmronligi davri (mil.avv. III asr)", False),
                    ("C", "Makedoniyalik Aleksandrning Ahamoniylarni bosib olishi (mil.avv. 330)", False),
                    ("D", "Doro I ning satraplik islohoti (mil.avv. 522)", False),
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

        # -------------------------------------------------------------
        # II QISM: YOZMA (OCHIQ) SAVOLLAR (36 - 45)
        # -------------------------------------------------------------
        open_data = [
            {
                "title": "Mesopotamiya.",
                "parts": [
                    ("a", "Shumerlar ixtiro qilgan, jahondagi eng qadimgi yozuvlardan birini yozing.", "Mixxat yozuvi"),
                    ("b", "Mesopotamiya ibodatxonalari qanday nomlanganini yozing.", "Zikkuratlar"),
                ],
                "explanation": "a) Mixxat yozuvi; b) Zikkuratlar.",
            },
            {
                "title": "Bobil podsholigi.",
                "parts": [
                    ("a", "\"Bobil\" so'zining ma'nosini yozing.", "\"Xudolar darvozasi\""),
                    ("b", "Tarixda qonunlar tuzgan birinchi hukmdorni yozing.", "Xammurapi"),
                ],
                "explanation": "a) \"Xudolar darvozasi\"; b) Xammurapi.",
            },
            {
                "title": "Old Osiyo davlatlari.",
                "parts": [
                    ("a", "Ossuriya davlatining dastlabki poytaxtini yozing.", "Oshshur"),
                    ("b", "Ossuriyaning ikkinchi (keyingi) poytaxtini yozing.", "Nineviya"),
                ],
                "explanation": "a) Oshshur; b) Nineviya.",
            },
            {
                "title": "Ahamoniylar davlati.",
                "parts": [
                    ("a", "Fors davlatiga asos solgan hukmdorni yozing.", "Kir II"),
                    ("b", "Saltanatni satrapliklarga bo'lgan, \"darik\" tangasini joriy etgan hukmdorni yozing.", "Doro I"),
                ],
                "explanation": "a) Kir II; b) Doro I.",
            },
            {
                "title": "Qadimgi Hindiston.",
                "parts": [
                    ("a", "Hind daryosi havzasidagi eng yirik ikki shaharni yozing.", "Moxenjodaro va Xarappa"),
                    ("b", "Hind jamiyati bo'lingan to'rt tabaqadan (kastadan) birinchisini — kohinlar tabaqasini yozing.", "Braxmanlar"),
                ],
                "explanation": "a) Moxenjodaro va Xarappa; b) Braxmanlar.",
            },
            {
                "title": "Buddaviylik.",
                "parts": [
                    ("a", "Buddaviylik diniga asos solgan shahzodani yozing.", "Siddhartha Gautama"),
                    ("b", "Bu din nima uchun \"xudolarsiz din\" deb atalganini qisqacha yozing.", "Avvaliga xudo tushunchasi bo'lmagan, xudolar inson azobini yengillashtira olmaydi deb hisoblangan"),
                ],
                "explanation": "a) Siddhartha Gautama; b) Avvaliga xudo tushunchasi bo'lmagan, xudolar inson azobini yengillashtira olmaydi deb hisoblangan.",
            },
            {
                "title": "Qadimgi Xitoy.",
                "parts": [
                    ("a", "Xitoyni mil.avv. 246-yilda birlashtirgan hukmdorni yozing.", "Sin Shixuandi"),
                    ("b", "Uning maqbarasini qurgan odamlar sonini yozing.", "720 ming odam"),
                ],
                "explanation": "a) Sin Shixuandi; b) 720 ming odam.",
            },
            {
                "title": "Xitoy qo'zg'olonlari.",
                "parts": [
                    ("a", "Mil.avv. 206-yilda Sin sulolasiga qarshi qo'zg'olon ko'targan shaxsni yozing.", "Lyu Ban"),
                    ("b", "Milodiy II asrdagi eng yirik qo'zg'olon nomini yozing.", "\"Sariq ro'mollilar\" qo'zg'oloni"),
                ],
                "explanation": "a) Lyu Ban; b) \"Sariq ro'mollilar\" qo'zg'oloni.",
            },
            {
                "title": "O'zbekiston hududidagi ilk davlatlar.",
                "parts": [
                    ("a", "Sug'diylar yashagan hududning yunon manbalaridagi nomini yozing.", "So'g'diyona"),
                    ("b", "Amudaryoning quyi oqimida yashagan xalqni yozing.", "Xorazmliklar"),
                ],
                "explanation": "a) So'g'diyona; b) Xorazmliklar.",
            },
            {
                "title": "Zardushtiylik.",
                "parts": [
                    ("a", "Zardushtiylik diniga asos solgan shaxsni yozing.", "Zardusht (Zoroastr)"),
                    ("b", "Zardushtiylarning muqaddas kitobini yozing.", "\"Avesto\""),
                ],
                "explanation": "a) Zardusht (Zoroastr); b) \"Avesto\".",
            },
        ]

        for i, item in enumerate(open_data, start=36):
            q = Question.objects.create(
                body=f"<b>{i}-topshiriq. {item['title']}</b>\nQuyidagi savollarga aniq va lo'nda javob yozing:",
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

        # Barcha 45 ta savolni testga bog'lash va tartibini belgilash
        test_set.questions.set(questions)
        test_set.question_order = [q.id for q in questions]
        test_set.save(update_fields=['question_order'])

        self.stdout.write(
            self.style.SUCCESS(
                f"\n🎉 45 talik Milliy Sertifikat Mock Imtihoni barcha to'g'ri javoblar va tahlillar bilan bazaga muvaffaqiyatli yuklandi!\n"
                f"Sarlavha: '{test_set.title}' (ID: {test_set.id})\n"
                f"Boshlanish vaqti: {test_set.scheduled_at.strftime('%Y-%m-%d %H:%M')} (Toshkent vaqti)\n"
                f"Davomiyligi: {test_set.duration_minutes} daqiqa\n"
                f"Savollar soni: {test_set.questions.count()} ta (35 ta test + 10 ta yozma ochiq savol)\n"
                f"Kutish zali havolasi: /tests/mock/{test_set.id}\n"
                f"Ustaxonada ko'rish: /teacher/tests/{test_set.id}/build\n"
            )
        )
