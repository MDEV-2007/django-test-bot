"""Django management command: Sodiqov Shohjahon ustozning 7-sinf Jahon Tarixi Milliy Sertifikat mock testini yaratish.

Mavzu: 40–44-mavzular (kitobning yakuniy bloki): Hindiston, Amerika, Afrika xalqlari o’rta asrlarda, Osiyo-Amerika-Afrika madaniyati.
35 ta test topshirig'i (A, B, C, D) va 10 ta yozma (ochiq) savol. Jami: 45 ta topshiriq.
Barcha diagrammalar, jadvallar, Eyler-Venn sxemalari va xronologik mosliklar birga-bir aniqlikda joylangan.

Muallif/O'qituvchi: shohjahon (Sodiqov Shohjahon, @TarixMilliyCertificate)
Nashr holati: is_published=False (qoralama).

Foydalanish:
    python manage.py seed_tarix_shohjahon_7sinf_40_44
    python manage.py seed_tarix_shohjahon_7sinf_40_44 --force
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from django.contrib.auth.models import User

from accounts.models import Profile, ensure_profile_for_user
from tests_app.models import Subject, TestSet, Question, AnswerOption, SubQuestion


MOCK_TITLE = "7-sinf Jahon Tarixi — Milliy Sertifikat (40–44-mavzular) | Shohjahon"
MOCK_DESC = (
    "40–44-mavzular (kitobning yakuniy bloki): Hindiston, Amerika, Afrika xalqlari o’rta asrlarda, Osiyo-Amerika-Afrika madaniyati. "
    "35 ta test topshirig'i (A, B, C, D) va 10 ta yozma (ochiq) savol. Jami: 45 ta topshiriq. "
    "Muallif: Sodiqov Shohjahon (@TarixMilliyCertificate)."
)


class Command(BaseCommand):
    help = "Sodiqov Shohjahon ustoz nomidan 7-sinf Jahon Tarixi (40-44-mavzular) 45 talik Milliy Sertifikat testini yuklaydi."

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
                        f"Qayta yuklash uchun: python manage.py seed_tarix_shohjahon_7sinf_40_44 --force"
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
                "explanation": "Xoja Sinon Usmonli me’mori bo’lgan, Inklar hukmdori esa ”Oliy Inka” unvoni bilan atalgan.",
                "options": [
                    ("A", "Qutbiddin Oybok — Dehli sultonligiga asos solgan", False),
                    ("B", "Sundiata Keyt — Mali hukmdori bo’lgan", False),
                    ("C", "Xoja Sinon — Inklar davlati hukmdori bo’lgan", True),
                    ("D", "Mansa Muso I — Makkaga haj safari uyushtirgan", False),
                ],
            },
            # 2
            {
                "body": (
                    "<p>Quyidagi hukmdorlar va ular bilan bog’liq ma’lumotlar mos ravishda berilgan javobni aniqlang.</p>"
                    "<div style='display:grid;grid-template-columns:repeat(auto-fit, minmax(240px, 1fr));gap:12px;margin:14px 0;'>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;'>"
                    "<b>1)</b> Qutbiddin Oybok<br/>"
                    "<b>2)</b> Muhammad Tug’luq<br/>"
                    "<b>3)</b> Sundiata Keyt<br/>"
                    "<b>4)</b> Mansa Muso I"
                    "</div>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;'>"
                    "<b>a)</b> Dehli sultonligiga asos solgan<br/>"
                    "<b>b)</b> O’zini ”Iskandar Zulqarnaynning davomchisi” deb atagan<br/>"
                    "<b>c)</b> Mali hukmdori, oltin konlarini egallagan<br/>"
                    "<b>d)</b> Makkaga haj safari uyushtirgan"
                    "</div>"
                    "</div>"
                ),
                "explanation": "1-a (Qutbiddin Oybok — Dehli sultonligi), 2-b (Muhammad Tug'luq — Iskandar Zulqarnayn davomchisi), 3-c (Sundiata Keyt — Mali oltin konlari), 4-d (Mansa Muso I — haj safari).",
                "options": [
                    ("A", "1-a; 2-b; 3-c; 4-d", True),
                    ("B", "1-b; 2-a; 3-d; 4-c", False),
                    ("C", "1-a; 2-c; 3-b; 4-d", False),
                    ("D", "1-c; 2-a; 3-b; 4-d", False),
                ],
            },
            # 3
            {
                "body": "<p>Amerika qit’asiga birinchi odamlar qaysi bo’g’oz orqali kelgan deb hisoblanadi?</p>",
                "explanation": "Amerika qit'asiga ilk insonlar Osiyodan Bering bo'g'ozi orqali o'tgan deb hisoblanadi.",
                "options": [
                    ("A", "Bering bo’g’ozi", True),
                    ("B", "Gibraltar bo’g’ozi", False),
                    ("C", "Bosfor bo’g’ozi", False),
                    ("D", "Dardanell bo’g’ozi", False),
                ],
            },
            # 4
            {
                "body": (
                    "<p>Quyidagi voqealar to’g’ri xronologik ketma-ketlikda ko’rsatilgan javobni toping.</p>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;margin:12px 0;'>"
                    "1) Dehli sultonligi tashkil topdi (1206)<br/>"
                    "2) Gana davlati vujudga keldi (VIII asr)<br/>"
                    "3) Mali davlati vujudga keldi (VIII asr)<br/>"
                    "4) Asteklar Tenochtitlanga asos soldi (XII asr)<br/>"
                    "5) Mansa Muso haj safari (1324)<br/>"
                    "6) Amir Temurning Hindiston yurishi (1398)"
                    "</div>"
                ),
                "explanation": "VIII asr (Gana va Mali) -> 1206 -> XII asr (Astek) -> 1324 -> 1398.",
                "options": [
                    ("A", "2, 3, 1, 4, 5, 6", True),
                    ("B", "1, 2, 3, 4, 5, 6", False),
                    ("C", "2, 1, 3, 4, 5, 6", False),
                    ("D", "1, 3, 2, 4, 5, 6", False),
                ],
            },
            # 5
            {
                "body": (
                    "<p>Quyida berilgan Amerika xalqlari va ularning davlatlariga oid ma’lumotlar to’g’ri moslashtirilgan javobni toping.</p>"
                    "<div style='display:grid;grid-template-columns:repeat(auto-fit, minmax(240px, 1fr));gap:12px;margin:14px 0;'>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;'>"
                    "<b>I.</b> Mayyalar<br/>"
                    "<b>II.</b> Asteklar<br/>"
                    "<b>III.</b> Inklar"
                    "</div>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;'>"
                    "<b>a)</b> Yukatan yarim orolida shahar-davlatlar tuzgan<br/>"
                    "<b>b)</b> Tenochtitlan shahriga asos solgan, ”suzuvchi dalalar” yaratgan<br/>"
                    "<b>c)</b> Kusko shahriga asos solgan, ”Oliy Inka” boshqargan"
                    "</div>"
                    "</div>"
                ),
                "explanation": "Mayyalar — Yukatan; Asteklar — Tenochtitlan; Inklar — Kusko.",
                "options": [
                    ("A", "I-a, II-b, III-c", True),
                    ("B", "I-b, II-a, III-c", False),
                    ("C", "I-c, II-b, III-a", False),
                    ("D", "I-a, II-c, III-b", False),
                ],
            },
            # 6
            {
                "body": (
                    "<p>Quyida berilgan Afrika davlatlari va ularning izohi to’g’ri moslashtirilgan javobni toping.</p>"
                    "<div style='display:grid;grid-template-columns:repeat(auto-fit, minmax(240px, 1fr));gap:12px;margin:14px 0;'>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;'>"
                    "<b>I.</b> Gana<br/>"
                    "<b>II.</b> Mali<br/>"
                    "<b>III.</b> Songay<br/>"
                    "<b>IV.</b> Aksum"
                    "</div>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;'>"
                    "<b>a)</b> VIII asrda vujudga kelgan, X asrda cho’qqisiga chiqqan<br/>"
                    "<b>b)</b> Poytaxti Niara, XIII asrda taraqqiyot cho’qqisi<br/>"
                    "<b>c)</b> Poytaxti Gao, XIV-XV asrlarda yuksalgan<br/>"
                    "<b>d)</b> Hozirgi Efiopiya shimolida, IV-V asrlarda yuksalgan"
                    "</div>"
                    "</div>"
                ),
                "explanation": "Gana — VIII-X asr; Mali — Niara, XIII asr; Songay — Gao; Aksum — Efiopiya, IV-V asr.",
                "options": [
                    ("A", "I-a, II-b, III-c, IV-d", True),
                    ("B", "I-b, II-a, III-c, IV-d", False),
                    ("C", "I-a, II-c, III-b, IV-d", False),
                    ("D", "I-a, II-b, III-d, IV-c", False),
                ],
            },
            # 7
            {
                "body": "<p>Tarixiy shaxsni aniqlang. Dehli sultonligining ilk hukmdori. Qo’shini turkiy suvoriylardan tashkil topgan.</p>",
                "explanation": "Qutbiddin Oybok 1206-yilda Dehli sultonligiga asos solgan ilk hukmdor.",
                "options": [
                    ("A", "Qutbiddin Oybok", True),
                    ("B", "Shamsiddin Eltutmish", False),
                    ("C", "Aloviddin Xiljiy", False),
                    ("D", "Muhammad Tug’luq", False),
                ],
            },
            # 8
            {
                "body": "<p>Tarixiy shaxsni aniqlang. 1324-yilda Makkaga haj safari uyushtirgan, 8 ming jangchi va ko’p miqdorda oltin olib borgan Mali hukmdori.</p>",
                "explanation": "Mansa Muso I 1324-yilda katta karvon va ko'p oltin bilan Makkaga haj safari qilgan.",
                "options": [
                    ("A", "Mansa Muso I", True),
                    ("B", "Sundiata Keyt", False),
                    ("C", "Almi", False),
                    ("D", "Abu Bakr", False),
                ],
            },
            # 9
            {
                "body": "<p>Tarixiy hodisani aniqlang. Asteklar ko’l tagidan loy ko’tarib yaratgan, dehqonchilik uchun mo’ljallangan sun’iy maydonlar.</p>",
                "explanation": "Asteklar ko'l ustida loy va qamishdan suzuvchi dalalar (chinampa) hosil qilishgan.",
                "options": [
                    ("A", "”Suzuvchi dalalar”", True),
                    ("B", "Terrasa dalalar", False),
                    ("C", "Chiqim", False),
                    ("D", "Xolisa yerlari", False),
                ],
            },
            # 10
            {
                "body": "<p>Tarixiy shaxsni aniqlang. 1418-1450-yillarda Koreya qiroli, koreys alifbosi yaratilishiga rahbarlik qilgan.</p>",
                "explanation": "Sechjon Buyuk 1418-1450-yillarda hukmronlik qilgan va koreys alifbosi (Hangul) yaratilishiga boshchilik qilgan.",
                "options": [
                    ("A", "Sechjon Buyuk", True),
                    ("B", "Van Gon", False),
                    ("C", "Li Son Ge", False),
                    ("D", "Van In", False),
                ],
            },
            # 11
            {
                "body": (
                    "<p>Quyidagi hukmdorlardan qaysilari Dehli sultonligiga tegishli?</p>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;margin:12px 0;'>"
                    "1) Qutbiddin Oybok<br/>"
                    "2) Shamsiddin Eltutmish<br/>"
                    "3) Aloviddin Xiljiy<br/>"
                    "4) Mansa Muso I<br/>"
                    "5) Sundiata Keyt<br/>"
                    "6) Almi"
                    "</div>"
                ),
                "explanation": "Mansa Muso, Sundiata Keyt va Almi Afrika davlatlari hukmdorlari. 1, 2, 3 Dehli sultonlaridir.",
                "options": [
                    ("A", "1, 2, 3", True),
                    ("B", "4, 5, 6", False),
                    ("C", "1, 3, 5", False),
                    ("D", "2, 4, 6", False),
                ],
            },
            # 12
            {
                "body": "<p>”Bahriya” atlasi muallifi bo’lgan turkiyalik dengiz sayyohini aniqlang.</p>",
                "explanation": "Piri Rais mashhur xaritalar va 'Bahriya' nomli dengizchilik atlasining muallifidir.",
                "options": [
                    ("A", "Piri Rais", True),
                    ("B", "Evliya Chalabiy", False),
                    ("C", "Xoja Xalifa", False),
                    ("D", "Xoja Sinon", False),
                ],
            },
            # 13
            {
                "body": "<p>XIII-XV asrlar Amerika va Afrika xalqlari uchun xos bo’lgan holatni aniqlang.</p>",
                "explanation": "XIII-XV asrlarda Amerika (Mayya, Astek, Ink) va Afrikada (Mali, Songay) o'ziga xos yirik davlatlar va yuksak madaniyatlar rivojlangan.",
                "options": [
                    ("A", "O’ziga xos yirik davlatlar va madaniyatlar rivojlandi", True),
                    ("B", "Butun qit’a yagona markazlashgan davlat edi", False),
                    ("C", "Yevropaliklar allaqachon bu yerlarni bosib olgan edi", False),
                    ("D", "Yozuv umuman mavjud emas edi", False),
                ],
            },
            # 14
            {
                "body": (
                    "<p>Quyidagi ekinlardan qaysilari Amerika qit’asida birinchi bo’lib yetishtirilgan?</p>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;margin:12px 0;'>"
                    "1) Makkajo’xori<br/>"
                    "2) Kartoshka<br/>"
                    "3) Pomidor<br/>"
                    "4) Bug’doy<br/>"
                    "5) Guruch<br/>"
                    "6) Arpa"
                    "</div>"
                ),
                "explanation": "Bug’doy, guruch va arpa Yevroosiyoda qadimdan yetishtirilgan. Makkajo'xori, kartoshka va pomidor Amerika zaminidan tarqalgan.",
                "options": [
                    ("A", "1, 2, 3", True),
                    ("B", "4, 5, 6", False),
                    ("C", "1, 3, 5", False),
                    ("D", "2, 4, 6", False),
                ],
            },
            # 15
            {
                "body": "<p>Inklarning tugunli yozuvini aniqlang.</p>",
                "explanation": "Inklar turli rangdagi iplarga tugunlar tugish orqali axborot uzatuvchi 'kipu' xatidan foydalangan.",
                "options": [
                    ("A", "Kipu", True),
                    ("B", "Piktografiya", False),
                    ("C", "Iyerogliflar", False),
                    ("D", "Run yozuvi", False),
                ],
            },
            # 16
            {
                "body": (
                    "<p>Quyidagi voqealar to’g’ri xronologik ketma-ketlikda ko’rsatilgan javobni toping.</p>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;margin:12px 0;'>"
                    "1) Gana davlati vujudga keldi (VIII asr)<br/>"
                    "2) Mali davlati vujudga keldi (VIII asr)<br/>"
                    "3) Marokash Ganani istilo qildi (1076)<br/>"
                    "4) Sundiata Keyt hukmronligi (1230)<br/>"
                    "5) Mansa Muso haj safari (1324)<br/>"
                    "6) Songay mustaqillikka erishdi (XIV asr oxiri)"
                    "</div>"
                ),
                "explanation": "VIII asr -> 1076 -> 1230 -> 1324 -> XIV asr oxiri.",
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
                    "<p>Sxematik diagrammada uch Amerika xalqi ko’rsatilgan.</p>"
                    "<p><b>1–3 raqamlaridan qaysi biri piktografik yozuv va aniq taqvim yaratgan, rasadxona qurgan xalqqa to’g’ri keladi?</b></p>"
                    "<div style='max-width:320px;margin:16px auto;display:flex;flex-direction:column;gap:10px;'>"
                    "<div style='border:2px solid #3b82f6;background:rgba(59,130,246,0.06);border-radius:8px;padding:12px;text-align:center;font-weight:bold;font-size:15px;color:#1e3a8a;'>1 — Mayyalar</div>"
                    "<div style='text-align:center;color:#94a3b8;font-size:18px;margin:-6px 0;'>↓</div>"
                    "<div style='border:2px solid #3b82f6;background:rgba(59,130,246,0.06);border-radius:8px;padding:12px;text-align:center;font-weight:bold;font-size:15px;color:#1e3a8a;'>2 — Asteklar</div>"
                    "<div style='text-align:center;color:#94a3b8;font-size:18px;margin:-6px 0;'>↓</div>"
                    "<div style='border:2px solid #3b82f6;background:rgba(59,130,246,0.06);border-radius:8px;padding:12px;text-align:center;font-weight:bold;font-size:15px;color:#1e3a8a;'>3 — Inklar</div>"
                    "</div>"
                ),
                "explanation": "Mayyalar (1-band) piktografik yozuv, aniq taqvim yaratgan va Chichen-Itsada rasadxona qurgan.",
                "options": [
                    ("A", "1", True),
                    ("B", "2", False),
                    ("C", "3", False),
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
                    "<tr><td style='padding:8px;border:1px solid #cbd5e1;text-align:center;font-weight:bold;'>1</td><td style='padding:8px;border:1px solid #cbd5e1;'>Amir Temurning Hindiston yurishi (1398)</td><td style='padding:8px;border:1px solid #cbd5e1;'>Dehli zabt etildi, hind hunarmandlari Samarqandga olib ketildi</td></tr>"
                    "<tr><td style='padding:8px;border:1px solid #cbd5e1;text-align:center;font-weight:bold;'>2</td><td style='padding:8px;border:1px solid #cbd5e1;'>Marokash sultonining Ganaga hujumi (1076)</td><td style='padding:8px;border:1px solid #cbd5e1;'>Gana o’z mustaqilligini butunlay saqlab qoldi</td></tr>"
                    "<tr><td style='padding:8px;border:1px solid #cbd5e1;text-align:center;font-weight:bold;'>3</td><td style='padding:8px;border:1px solid #cbd5e1;'>Sundiata Keytning g’alabalari</td><td style='padding:8px;border:1px solid #cbd5e1;'>Mali o’z taraqqiyoti cho’qqisiga chiqdi</td></tr>"
                    "<tr><td style='padding:8px;border:1px solid #cbd5e1;text-align:center;font-weight:bold;'>4</td><td style='padding:8px;border:1px solid #cbd5e1;'>Mansa Musoning haj safari</td><td style='padding:8px;border:1px solid #cbd5e1;'>Arab dunyosida oltin narxi bir muddat pasaydi</td></tr>"
                    "<tr><td style='padding:8px;border:1px solid #cbd5e1;text-align:center;font-weight:bold;'>5</td><td style='padding:8px;border:1px solid #cbd5e1;'>Songayning mustaqillikka erishishi</td><td style='padding:8px;border:1px solid #cbd5e1;'>Mali qudrati yanada mustahkamlandi</td></tr>"
                    "<tr><td style='padding:8px;border:1px solid #cbd5e1;text-align:center;font-weight:bold;'>6</td><td style='padding:8px;border:1px solid #cbd5e1;'>Sechjon Buyukning faoliyati</td><td style='padding:8px;border:1px solid #cbd5e1;'>Koreys alifbosi yaratildi</td></tr>"
                    "</tbody>"
                    "</table>"
                    "</div>"
                ),
                "explanation": "2 xato: aksincha, Gana Marokashga qaram bo’lib qoldi. 5 xato: aksincha, Songayning mustaqillashuvi Malining zaiflashuvi bilan bog’liq edi.",
                "options": [
                    ("A", "1, 3, 4, 6", True),
                    ("B", "2, 3, 5, 6", False),
                    ("C", "1, 2, 4, 5", False),
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
                    "<th style='padding:8px;border:1px solid #cbd5e1;width:40%;'>Afrika voqeasi</th>"
                    "<th style='padding:8px;border:1px solid #cbd5e1;'>Osiyo voqeasi</th>"
                    "</tr>"
                    "</thead>"
                    "<tbody>"
                    "<tr><td style='padding:8px;border:1px solid #cbd5e1;font-weight:bold;'>XIII asr</td><td style='padding:8px;border:1px solid #cbd5e1;'>Mali taraqqiyot cho’qqisiga chiqdi</td><td style='padding:8px;border:1px solid #cbd5e1;background:rgba(59,130,246,0.08);text-align:center;font-weight:bold;color:#1d4ed8;'>a</td></tr>"
                    "<tr><td style='padding:8px;border:1px solid #cbd5e1;font-weight:bold;'>XIV asr</td><td style='padding:8px;border:1px solid #cbd5e1;background:rgba(59,130,246,0.08);text-align:center;font-weight:bold;color:#1d4ed8;'>b</td><td style='padding:8px;border:1px solid #cbd5e1;'>Amir Temurning Hindiston yurishi (1398)</td></tr>"
                    "</tbody>"
                    "</table>"
                    "</div>"
                    "<div style='font-size:12.5px;color:#334155;background:rgba(100,116,139,0.05);padding:10px;border-radius:6px;border:1px solid #cbd5e1;margin-top:8px;'>"
                    "<b>Ma’lumotlar:</b> 1) Dehli sultonligi tashkil topdi (1206); 2) Mansa Muso haj safari (1324); 3) Rim imperiyasi qulashi (476); 4) Amir Temur tug’ildi (1336)."
                    "</div>"
                ),
                "explanation": "a=1: Dehli sultonligi 1206-yilda (XIII asr) tashkil topdi. b=2: Mansa Muso 1324-yilda (XIV asr) haj safarini uyushtirdi.",
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
                    "<p>Quyida berilgan ma’lumotlarni tahlil qilib <b>Eyler-Venn diagrammasiga</b> mos keladigan javoblarni aniqlang. <i>(Gana va Mali davlatlari)</i></p>"
                    "<div style='display:flex;justify-content:center;margin:16px 0;'>"
                    "<svg width='340' height='180' viewBox='0 0 340 180' style='max-width:100%;'>"
                    "<circle cx='120' cy='90' r='75' fill='rgba(59, 130, 246, 0.15)' stroke='#3b82f6' stroke-width='2'/>"
                    "<circle cx='220' cy='90' r='75' fill='rgba(16, 185, 129, 0.15)' stroke='#10b981' stroke-width='2'/>"
                    "<text x='85' y='75' font-size='16' font-weight='bold' fill='#1e40af' text-anchor='middle'>I</text>"
                    "<text x='85' y='95' font-size='12' fill='#1e3a8a' text-anchor='middle'>Gana</text>"
                    "<text x='170' y='85' font-size='16' font-weight='bold' fill='#4338ca' text-anchor='middle'>III</text>"
                    "<text x='255' y='75' font-size='16' font-weight='bold' fill='#065f46' text-anchor='middle'>II</text>"
                    "<text x='255' y='95' font-size='12' fill='#064e3b' text-anchor='middle'>Mali</text>"
                    "</svg>"
                    "</div>"
                    "<div style='font-size:12.5px;color:#334155;line-height:1.7;background:rgba(100,116,139,0.05);padding:12px;border-radius:8px;border:1px solid #cbd5e1;'>"
                    "<b>a)</b> VIII asrda vujudga kelgan;<br/>"
                    "<b>b)</b> X asrda taraqqiyot cho’qqisiga chiqqan;<br/>"
                    "<b>c)</b> XIII asrda taraqqiyot cho’qqisiga chiqqan;<br/>"
                    "<b>d)</b> G’arbiy Sudanda joylashgan;<br/>"
                    "<b>e)</b> Oltin savdosidan boy bo’lgan;<br/>"
                    "<b>f)</b> Marokash tomonidan istilo qilingan."
                    "</div>"
                ),
                "explanation": "I (faqat Gana): X asrda cho’qqi, Marokash istilosi. II (faqat Mali): XIII asrda cho’qqi. III (umumiy): VIII asrda vujudga kelgan, G’arbiy Sudanda, oltin savdosi.",
                "options": [
                    ("A", "I-b,f; II-c; III-a,d,e", True),
                    ("B", "I-c; II-b,f; III-a,d,e", False),
                    ("C", "I-b; II-c,f; III-a,d,e", False),
                    ("D", "I-b,f; II-a,c; III-d,e", False),
                ],
            },
            # 21
            {
                "body": (
                    "<p>Quyidagi shaxslar va ularning ishlari to’g’ri moslashtirilgan javobni toping.</p>"
                    "<div style='display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:12px;margin:14px 0;'>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;'>"
                    "<b>1)</b> Xoja Sinon<br/>"
                    "<b>2)</b> Piri Rais<br/>"
                    "<b>3)</b> Evliya Chalabiy"
                    "</div>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;'>"
                    "<b>a)</b> 300 dan ortiq inshoot qurgan me’mor<br/>"
                    "<b>b)</b> ”Bahriya” atlasi muallifi<br/>"
                    "<b>c)</b> ”Sayohatnoma” asari muallifi"
                    "</div>"
                    "</div>"
                ),
                "explanation": "1-a (Xoja Sinon — me'mor), 2-b (Piri Rais — Bahriya), 3-c (Evliya Chalabiy — Sayohatnoma).",
                "options": [
                    ("A", "1-a; 2-b; 3-c", True),
                    ("B", "1-b; 2-a; 3-c", False),
                    ("C", "1-c; 2-a; 3-b", False),
                    ("D", "1-a; 2-c; 3-b", False),
                ],
            },
            # 22
            {
                "body": "<p>Tombuktu madrasasida ilohiyotdan tashqari yana qanday fanlar o’qitilgan?</p>",
                "explanation": "Tombuktu madrasalarida islom ilohiyoti bilan birga tarix, fiqh, matematika va falakiyot fanlari chuqur o'qitilgan.",
                "options": [
                    ("A", "Tarix, fiqh, matematika, astronomiya", True),
                    ("B", "Faqat tibbiyot", False),
                    ("C", "Faqat harbiy ish", False),
                    ("D", "Faqat savdo hisobi", False),
                ],
            },
            # 23
            {
                "body": "<p>Aksumda mahalliy yozuv islohoti qaysi asrda o’tkazilgan?</p>",
                "explanation": "Aksum podsholigida IV asrda milliy yozuv islohoti amalga oshirilgan.",
                "options": [
                    ("A", "IV asr", True),
                    ("B", "VIII asr", False),
                    ("C", "X asr", False),
                    ("D", "XII asr", False),
                ],
            },
            # 24
            {
                "body": (
                    "<p>Quyidagi shaharlardan qaysilari Amerika qit’asiga tegishli?</p>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;margin:12px 0;'>"
                    "1) Tenochtitlan<br/>"
                    "2) Kusko<br/>"
                    "3) Chichen-Itsa<br/>"
                    "4) Niara<br/>"
                    "5) Gao<br/>"
                    "6) Tombuktu"
                    "</div>"
                ),
                "explanation": "Niara, Gao va Tombuktu Afrika shaharlari. Tenochtitlan, Kusko va Chichen-Itsa Amerika qit'asiga tegishli.",
                "options": [
                    ("A", "1, 2, 3", True),
                    ("B", "4, 5, 6", False),
                    ("C", "1, 3, 5", False),
                    ("D", "2, 4, 6", False),
                ],
            },
            # 25
            {
                "body": "<p>Beninda jezdan ishlangan podsho va a’yonlarning bo’rtma rasmlari nimalarni tasvirlaydi?</p>",
                "explanation": "Benin bronza san'atida ov, harbiy to'qnashuvlar hamda hukmdor saroyidagi tantanalar yuksak mahorat bilan tasvirlangan.",
                "options": [
                    ("A", "Ov, urushlar va saroy hayoti sahnalari", True),
                    ("B", "Faqat diniy marosimlar", False),
                    ("C", "Faqat qishloq xo’jaligi", False),
                    ("D", "Faqat savdo sahnalari", False),
                ],
            },
            # 26
            {
                "body": "<p>Inklarning poytaxti Kuskoni viloyatlar bilan bog’lagan yo’llarning umumiy uzunligini aniqlang.</p>",
                "explanation": "Inklarning tog'li yo'llari tarmog'i 15 minglab kilometrga cho'zilgan.",
                "options": [
                    ("A", "15 minglab kilometr", True),
                    ("B", "1000 kilometr", False),
                    ("C", "5000 kilometr", False),
                    ("D", "50 ming kilometr", False),
                ],
            },
            # 27
            {
                "body": "<p>O’zaro muvofiqlik <b>SAQLANMAGAN</b> javobni toping.</p>",
                "explanation": "Piktografik yozuvni mayyalar va asteklar yaratgan, inklarda esa yozuv o’rniga kipu (tugunli xat) bo’lgan.",
                "options": [
                    ("A", "Mayyalar — Chichen-Itsada rasadxona qurgan", False),
                    ("B", "Asteklar — Tenochtitlanga asos solgan", False),
                    ("C", "Inklar — piktografik yozuv yaratgan", True),
                    ("D", "Inklar — tugunli yozuv (kipu) ishlatgan", False),
                ],
            },
            # 28
            {
                "body": "<p>Mayyalar matematikaga qanday tushunchani hindlardan ham avval kiritishgan?</p>",
                "explanation": "Mayyalar matematikada 'nol' tushunchasini hindlardan ham oldinroq amaliyotga kiritgan deb hisoblanadi.",
                "options": [
                    ("A", "”Nol” belgisi", True),
                    ("B", "Manfiy sonlar", False),
                    ("C", "Kasr sonlar", False),
                    ("D", "Geometrik teoremalar", False),
                ],
            },
            # 29
            {
                "body": (
                    "<p>Quyida berilgan ma’lumotlarga mos yakuniy xulosalar (to’g’ri/noto’g’ri) keltirilgan javobni aniqlang.</p>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;margin:12px 0;'>"
                    "I. Dehli sultonligida barcha yerlar hukmdorniki hisoblangan.<br/>"
                    "II. Inklar davlatida rasman qulchilik mavjud bo’lgan.<br/>"
                    "III. Aksum davlati Vizantiya bilan yaqin iqtisodiy-madaniy aloqada bo’lgan."
                    "</div>"
                ),
                "explanation": "I to’g’ri. II noto’g’ri — rasman qulchilik bo’lmagan, lekin jamoa a’zolari deyarli huquqsiz bo’lgan. III to’g’ri.",
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
                    "<b>1)</b> Sundiata Keyt<br/>"
                    "<b>2)</b> Mansa Muso I<br/>"
                    "<b>3)</b> Almi"
                    "</div>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;'>"
                    "<b>a)</b> Mali hukmdori, oltin konlarini egallagan<br/>"
                    "<b>b)</b> Makkaga haj safari uyushtirgan<br/>"
                    "<b>c)</b> Songayga mustaqillik olib kelgan"
                    "</div>"
                    "</div>"
                ),
                "explanation": "1-a (Sundiata Keyt — Mali oltin konlari), 2-b (Mansa Muso — haj safari), 3-c (Almi — Songay mustaqilligi).",
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
                    "<b>1)</b> Mali<br/>"
                    "<b>2)</b> Songay<br/>"
                    "<b>3)</b> Dehli sultonligi"
                    "</div>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;'>"
                    "<b>a)</b> Niara<br/>"
                    "<b>b)</b> Gao<br/>"
                    "<b>c)</b> Dehli"
                    "</div>"
                    "</div>"
                ),
                "explanation": "Mali — Niara, Songay — Gao, Dehli sultonligi — Dehli.",
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
                    "<p>Quyidagi fanlardan qaysilari inklarda chuqur rivojlangan?</p>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;margin:12px 0;'>"
                    "1) Matematika<br/>"
                    "2) Astronomiya<br/>"
                    "3) Tibbiyot<br/>"
                    "4) Yadro fizikasi<br/>"
                    "5) Kompyuter fanlari<br/>"
                    "6) Kosmonavtika"
                    "</div>"
                ),
                "explanation": "Inklarda matematika, astronomiya va jarrohlik/tibbiyot ancha rivojlangan bo'lgan.",
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
                    "<b>A)</b> Gana davlatining vujudga kelishi (VIII asr)<br/>"
                    "<b>B)</b> Dehli sultonligining tashkil topishi (1206)<br/>"
                    "<b>C)</b> Marokash sultonining Ganani istilo qilishi (1076)<br/>"
                    "<b>D)</b> Mansa Musoning haj safari (1324)<br/>"
                    "<b>E)</b> Amir Temurning Hindiston yurishi (1398)<br/>"
                    "<b>F)</b> Sechjon Buyuk hukmronligining boshlanishi (1418)"
                    "</div>"
                    "<p><b>Berilgan voqealardan qaysi biri eng avval sodir bo’lgan?</b></p>"
                ),
                "explanation": "VIII asr — ro’yxatdagi eng qadimgi sana (Gana davlatining vujudga kelishi).",
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
                    "<b>A)</b> Gana davlatining vujudga kelishi (VIII asr)<br/>"
                    "<b>B)</b> Dehli sultonligining tashkil topishi (1206)<br/>"
                    "<b>C)</b> Marokash sultonining Ganani istilo qilishi (1076)<br/>"
                    "<b>D)</b> Mansa Musoning haj safari (1324)<br/>"
                    "<b>E)</b> Amir Temurning Hindiston yurishi (1398)<br/>"
                    "<b>F)</b> Sechjon Buyuk hukmronligining boshlanishi (1418)"
                    "</div>"
                    "<p><b>Gananing mustaqilligini yo’qotishiga sabab bo’lgan voqeani aniqlang.</b></p>"
                ),
                "explanation": "1076-yilda Marokash sultoni Abu Bakr Ganani istilo qilgan.",
                "options": [
                    ("A", "A", False),
                    ("B", "B", False),
                    ("C", "C", True),
                    ("D", "D", False),
                    ("E", "E", False),
                    ("F", "F", False),
                ],
            },
            # 35 (BANK)
            {
                "body": (
                    "<div style='border:1px solid #3b82f6;border-radius:10px;padding:12px;background:rgba(59,130,246,0.05);margin-bottom:14px;font-size:13px;line-height:1.7;'>"
                    "<b>33–35-topshiriqlarga mos javoblarni quyidagi banklardan (A–F) tanlang:</b><br/>"
                    "<b>A)</b> Gana davlatining vujudga kelishi (VIII asr)<br/>"
                    "<b>B)</b> Dehli sultonligining tashkil topishi (1206)<br/>"
                    "<b>C)</b> Marokash sultonining Ganani istilo qilishi (1076)<br/>"
                    "<b>D)</b> Mansa Musoning haj safari (1324)<br/>"
                    "<b>E)</b> Amir Temurning Hindiston yurishi (1398)<br/>"
                    "<b>F)</b> Sechjon Buyuk hukmronligining boshlanishi (1418)"
                    "</div>"
                    "<p><b>Berilgan voqealardan qaysi biri eng keyin sodir bo’lgan?</b></p>"
                ),
                "explanation": "1418-yil — ro’yxatdagi eng so’nggi sana (Sechjon Buyuk hukmronligi).",
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
                "title": "Dehli sultonligi.",
                "parts": [
                    ("a", "Sultonlikka asos solgan hukmdorni yozing.", "Qutbiddin Oybok (Qutbiddin Oybak / Qutbiddin Oybeg)"),
                    ("b", "Sultonlik faoliyat yuritgan yillarni yozing.", "1206-1526-yillar (1206-1526 / 1206-1526 yillar)"),
                ],
                "explanation": "a) Qutbiddin Oybok; b) 1206-1526-yillar.",
            },
            # 37
            {
                "title": "Amir Temur va Hindiston.",
                "parts": [
                    ("a", "Amir Temur Hindiston yurishini qaysi yillarda amalga oshirganini yozing.", "1398-1399-yillar (1398-1399 / 1398-1399 yillar / 1398-yil)"),
                    ("b", "Egallangan shaharni yozing.", "Dehli (Dehli shahri)"),
                ],
                "explanation": "a) 1398-1399-yillar; b) Dehli.",
            },
            # 38
            {
                "title": "Mayyalar davlati.",
                "parts": [
                    ("a", "Mayyalar yashagan yarim orolni yozing.", "Yukatan yarim oroli (Yukatan / Yukatan yarimoroli)"),
                    ("b", "Ularning rasadxona qurgan shahrini yozing.", "Chichen-Itsa (Chichen Itsa / Chichen-itsa shahri)"),
                ],
                "explanation": "a) Yukatan yarim oroli; b) Chichen-Itsa.",
            },
            # 39
            {
                "title": "Asteklar davlati.",
                "parts": [
                    ("a", "Asteklar asos solgan shaharni yozing.", "Tenochtitlan (Tenochtitlan shahri / Tenochtitlon)"),
                    ("b", "Ularning dehqonchilik uchun yaratgan sun’iy maydonlarini yozing.", "Suzuvchi dalalar (Suzuvchi dalalar / Chinampa)"),
                ],
                "explanation": "a) Tenochtitlan; b) ”Suzuvchi dalalar”.",
            },
            # 40
            {
                "title": "Inklar davlati.",
                "parts": [
                    ("a", "Inklar asos solgan shaharni yozing.", "Kusko (Kusko shahri / Cuzco)"),
                    ("b", "Ularning hukmdor unvonini yozing.", "Oliy Inka (Inka / Sapa Inka)"),
                ],
                "explanation": "a) Kusko; b) Oliy Inka.",
            },
            # 41
            {
                "title": "Gana davlati.",
                "parts": [
                    ("a", "Gana davlati qaysi asrda vujudga kelganini yozing.", "VIII asr (8-asr / VIII asrda / 8 asr)"),
                    ("b", "Ganani istilo qilgan Marokash sultonini yozing.", "Abu Bakr (Abu Bakr sultoni / Abu Bakr ibn Umar)"),
                ],
                "explanation": "a) VIII asr; b) Abu Bakr.",
            },
            # 42
            {
                "title": "Mali davlati.",
                "parts": [
                    ("a", "Mali taraqqiyot cho’qqisiga chiqqan hukmdorni yozing.", "Sundiata Keyt (Sundiata / Sundiata Keyta)"),
                    ("b", "1324-yilda haj qilgan hukmdorni yozing.", "Mansa Muso I (Mansa Muso / Mansa Musa / Mansa Muso 1)"),
                ],
                "explanation": "a) Sundiata Keyt; b) Mansa Muso I.",
            },
            # 43
            {
                "title": "Songay va Aksum.",
                "parts": [
                    ("a", "Songayga mustaqillik olib kelgan hukmdorni yozing.", "Almi (Ali Ber / Almi hukmdor)"),
                    ("b", "Aksum davlati joylashgan hozirgi mamlakatni yozing.", "Efiopiya (Habashiston / Efiopiya davlati)"),
                ],
                "explanation": "a) Almi; b) Efiopiya.",
            },
            # 44
            {
                "title": "Usmonli va turk madaniyati.",
                "parts": [
                    ("a", "300 dan ortiq inshoot qurgan me’morni yozing.", "Xoja Sinon (Sinon / Xo'ja Sinon / Mimar Sinon)"),
                    ("b", "”Bahriya” atlasi muallifini yozing.", "Piri Rais (Piri Reis / Piri Rais sayyoh)"),
                ],
                "explanation": "a) Xoja Sinon; b) Piri Rais.",
            },
            # 45
            {
                "title": "Koreys madaniyati.",
                "parts": [
                    ("a", "Koreys alifbosi yaratilishiga rahbarlik qilgan qirolni yozing.", "Sechjon Buyuk (Sechjon / Qirol Sechjon / Sejong)"),
                    ("b", "Uning hukmronlik yillarini yozing.", "1418-1450-yillar (1418-1450 / 1418-1450 yillar)"),
                ],
                "explanation": "a) Sechjon Buyuk; b) 1418-1450-yillar.",
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
