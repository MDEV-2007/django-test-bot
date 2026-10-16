"""Django management command: Tarix fanidan namunaviy test topshiriqlari (Milliy Sertifikat & Attestatsiya).

Mualliflar: Zaxiriddin Jumanazarov; Bahrom Hikmatov; Husanboy Xoldorov.
Telegram kanallar: @Tarixdan_tomchi, @Tarixdan_testlar_BH, @Tarix_tilsimi.

Tarkibi:
- 35 ta Variantli test (A, B, C, D) — xaritalar, diagrammalar, jadvallar birga-bir kiritilgan.
- 10 ta Yozma (ochiq) topshiriq (36–45-savollar, har birida a va b bandlari).
Jami: 45 ta topshiriq.

Nashr holati: is_published=False (talabga asosan).

Foydalanish:
    python manage.py seed_tarix_namunaviy_milliy
    python manage.py seed_tarix_namunaviy_milliy --force
"""
import base64
import os

from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import transaction
from django.contrib.auth.models import User

from accounts.models import Profile, ensure_profile_for_user
from tests_app.models import Subject, TestSet, Question, AnswerOption, SubQuestion
from ._embedded_images import BALKAN_MAP_B64, VENN_DIAGRAM_B64



MOCK_TITLE = "Tarix fanidan namunaviy test topshiriqlari (Milliy Sertifikat & Attestatsiya)"
MOCK_DESC = (
    "Tarix fanidan namunaviy test topshiriqlari. "
    "35 ta variantli test (A, B, C, D) va 10 ta yozma (ochiq) savol. Jami 45 ta topshiriq. "
    "Mualliflar: Zaxiriddin Jumanazarov, Bahrom Hikmatov, Husanboy Xoldorov."
)


class Command(BaseCommand):
    help = "Tarix fanidan namunaviy 45 talik Milliy Sertifikat testini yuklaydi."

    def add_arguments(self, parser):
        parser.add_argument(
            "--force",
            action="store_true",
            help="Agar mavjud bo'lsa, eski testni o'chirib qayta yaratadi.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        force = options.get("force", False)

        # ── 0. Ensure embedded images (map & diagram) are saved to MEDIA_ROOT ──
        maps_dir = os.path.join(settings.MEDIA_ROOT, "tests", "maps")
        os.makedirs(maps_dir, exist_ok=True)
        balkan_bytes = base64.b64decode(BALKAN_MAP_B64)
        with open(os.path.join(maps_dir, "balkan_map_q17.jpg"), "wb") as f:
            f.write(balkan_bytes)
        with open(os.path.join(maps_dir, "balkan_map_q17_numbered.jpg"), "wb") as f:
            f.write(balkan_bytes)
        with open(os.path.join(maps_dir, "venn_diagram_q20.jpg"), "wb") as f:
            f.write(base64.b64decode(VENN_DIAGRAM_B64))
        self.stdout.write(f"Xarita va diagramma rasmlari saqlandi: {maps_dir}")


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

        # ── 2. Teacher: zaxiriddin yoki shohjahon ─────────────────────────────
        teacher_user = User.objects.filter(username__iexact="zaxiriddin").first()
        if not teacher_user:
            teacher_user = User.objects.filter(username__iexact="shohjahon").first()
        if not teacher_user:
            teacher_user = User.objects.filter(is_superuser=True).first()
        if not teacher_user:
            teacher_user = User.objects.create(
                username="zaxiriddin",
                first_name="Zaxiriddin",
                last_name="Jumanazarov",
                email="zaxiriddin@ilmildizi.uz",
            )
            teacher_user.set_unusable_password()
            teacher_user.save()
            prof = ensure_profile_for_user(teacher_user)
            prof.role = "teacher"
            prof.save()
            self.stdout.write(self.style.SUCCESS(f"Yangi muallif yaratildi: @{teacher_user.username}"))
        else:
            prof = ensure_profile_for_user(teacher_user)
            if prof.role != "teacher" and not teacher_user.is_superuser:
                prof.role = "teacher"
                prof.save(update_fields=["role"])
            self.stdout.write(f"Muallif topildi: @{teacher_user.username} (ID: {teacher_user.id})")

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
                        f"Qayta yuklash uchun: python manage.py seed_tarix_namunaviy_milliy --force"
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
            created_by=teacher_user,
            is_published=False,  # Foydalanuvchi talabiga asosan False
            is_premium=False,
            is_random=False,
        )

        questions = []

        # ── 5. I va II qism: 35 ta Variantli Test topshiriqlari ──────────────
        mcq_data = [
            # 1
            {
                "body": "<p>Quyidagi tarixiy shaxslar faoliyatiga oid ta’riflar <b>xato</b> berilgan javob variantini aniqlang.</p>",
                "explanation": "Fidiy Panteonni emas, Afinadagi Parfenon ibodatxonasini barpo etgan. Panteon esa Rim me'morchiligiga oid.",
                "options": [
                    ("A", "Mark Krass – Spartak qo’zg’olonini bostirgan Rim sarkardasi", False),
                    ("B", "Ssipion – Gannibal boshliq Karfagen armiyasini tor-mor etgan Rim sarkardasi", False),
                    ("C", "Alarix – 410-yilda Rimni bosib olgan germanlarning got qabilalari yetakchisi", False),
                    ("D", "Fidiy – mashhur Zevs haykalini, Panteon ibodatxonasini barpo etgan hamda Akropolning qayta qurilishiga boshchilik qilgan me’mor", True),
                ],
            },
            # 2
            {
                "body": (
                    "<p>Quyidagi shaxslarga oid to’g’ri ta’rifni aniqlang.</p>"
                    "<div style='background:rgba(148,163,184,0.08);color:inherit;padding:12px 16px;border-radius:10px;border:1px solid rgba(148,163,184,0.2);margin:12px 0;line-height:1.7;font-size:13.5px;'>"
                    "<b>1)</b> Skunxa; <b>2)</b> Bess; <b>3)</b> Diodot; <b>4)</b> Miltiad.<br/>"
                    "<b>a)</b> Makedoniyalik Aleksandr bosqini davrida Baqtriya satrapi;<br/>"
                    "<b>b)</b> Marafon jangida yunon qo’shinlari sarkardasi;<br/>"
                    "<b>c)</b> Doro I ga qarshi kurashgan saklar sardori;<br/>"
                    "<b>d)</b> Yunon-Baqtriya davlati asoschisi."
                    "</div>"
                ),
                "explanation": "Skunxa – Doro I ga qarshi saklar sardori (1-c); Bess – Baqtriya satrapi (2-a); Diodot – Yunon-Baqtriya asoschisi (3-d); Miltiad – Marafon sarkardasi (4-b).",
                "options": [
                    ("A", "1-c, 2-a, 3-d, 4-b", True),
                    ("B", "1-c, 2-a, 3-b, 4-d", False),
                    ("C", "1-c, 2-d, 3-a, 4-b", False),
                    ("D", "1-a, 2-c, 3-d, 4-b", False),
                ],
            },
            # 3
            {
                "body": "<p>O’rta asrlarda qaysi Angliya qiroli davrida “Mayl End” dasturi qabul qilingan?</p>",
                "explanation": "Uot Tayler qo'zg'oloni davrida qirol Richard II (1377–1399) bilan Mayl Endda uchrashuv bo'lib, Mayl End dasturi topshirilgan.",
                "options": [
                    ("A", "Ioann", False),
                    ("B", "Richard I", False),
                    ("C", "Richard II", True),
                    ("D", "Genrix II", False),
                ],
            },
            # 4
            {
                "body": (
                    "<p>Quyidagi tarixiy voqealar (ma’lumotlar) to‘g‘ri xronologik ketma-ketlikda ko‘rsatilgan javobni toping.</p>"
                    "<div style='background:rgba(148,163,184,0.08);color:inherit;padding:12px 16px;border-radius:10px;border:1px solid rgba(148,163,184,0.2);margin:12px 0;line-height:1.7;font-size:13.5px;'>"
                    "1) Emiliano Sapata o’z agrar dasturini e’lon qildi;<br/>"
                    "2) Fransiyada kasaba uyushmalarining erkin faoliyatiga hamda ish tashlashga ruxsat etuvchi qonun qabul qilindi;<br/>"
                    "3) Britaniya o’z qirolichasi Viktoriyani Hindistonning imperatori deb e’lon qildi;<br/>"
                    "4) Italiyada “Fiat” aksiyadorlik jamiyati tashkil etildi;<br/>"
                    "5) Xitoyda demokratik kuchlar tomonidan “Gomindan” tuzildi;<br/>"
                    "6) Sudanda mustaqil Mahdiylar davlati tuzildi."
                    "</div>"
                ),
                "explanation": "Xronologiya: Viktoriya Hindiston imperatori (1876) -> Fransiyada kasaba uyushmalari (1884) -> Mahdiylar davlati (1885) -> Fiat (1899) -> Sapata dasturi (1911) -> Gomindan (1912). Tartib: 3, 2, 6, 4, 1, 5.",
                "options": [
                    ("A", "3, 4, 6, 1, 5, 2", False),
                    ("B", "3, 2, 6, 4, 1, 5", True),
                    ("C", "3, 2, 1, 4, 6, 5", False),
                    ("D", "6, 2, 1, 4, 5, 3", False),
                ],
            },
            # 5
            {
                "body": (
                    "<p>Quyida berilgan atamalar va ularning izohi to’g‘ri moslashtirilgan javobni toping.</p>"
                    "<div style='display:grid;grid-template-columns:1fr 2fr;gap:14px;background:rgba(148,163,184,0.08);color:inherit;padding:14px 18px;border-radius:12px;border:1px solid rgba(148,163,184,0.2);margin:12px 0;line-height:1.6;font-size:13.5px;'>"
                    "<div><b>Atamalar:</b><br/>"
                    "<b>I.</b> Panturkizm<br/>"
                    "<b>II.</b> Rezidensiya<br/>"
                    "<b>III.</b> Konsessiya<br/>"
                    "<b>IV.</b> Komprador</div>"
                    "<div><b>Izohlar:</b><br/>"
                    "<b>a)</b> turkiy xalqlarni birlashtirish g‘oyasiga Rossiya va Buyuk Britaniya imperiyalari, shuningdek, sobiq Ittifoq tomonidan berilgan rasmiy nom<br/>"
                    "<b>b)</b> bir davlatning ikkinchi davlatga maxsus topshiriq bilan yuborgan vakillari<br/>"
                    "<b>c)</b> davlat organlarining muayyan shartlar asosida yerosti boyliklari, yerusti obyektlarini ekspluatatsiyaga berish to‘g‘risidagi bitim<br/>"
                    "<b>d)</b> bir davlat diplomatik vakillari qarorgohi<br/>"
                    "<b>e)</b> iqtisodiy qoloq va qaram davlatlar burjuaziyasining chet el kapitali bilan ichki bozor o‘rtasida vositachilik qiluvchi qismi<br/>"
                    "<b>f)</b> butun musulmon olamini mustamlakachilarga qarshi birlashtirish harakatiga Rossiya, Buyuk Britaniya va sobiq Ittifoq tomonidan berilgan sun’iy nom</div>"
                    "</div>"
                ),
                "explanation": "Panturkizm (I-a), Rezidensiya (II-d), Konsessiya (III-c), Komprador (IV-e).",
                "options": [
                    ("A", "I-a, II-b, III-f, IV-c", False),
                    ("B", "I-a, II-c, III-d, IV-e", False),
                    ("C", "I-b, II-d, III-f, IV-c", False),
                    ("D", "I-a, II-d, III-c, IV-e", True),
                ],
            },
            # 6
            {
                "body": (
                    "<p>Quyida berilgan atamalar va ularning izohi to’g‘ri moslashtirilgan javobni toping.</p>"
                    "<div style='display:grid;grid-template-columns:1fr 2fr;gap:14px;background:rgba(148,163,184,0.08);color:inherit;padding:14px 18px;border-radius:12px;border:1px solid rgba(148,163,184,0.2);margin:12px 0;line-height:1.6;font-size:13.5px;'>"
                    "<div><b>Atamalar:</b><br/>"
                    "<b>I.</b> Avtonomiya<br/>"
                    "<b>II.</b> Federatsiya<br/>"
                    "<b>III.</b> Byuro<br/>"
                    "<b>IV.</b> Deklaratsiya</div>"
                    "<div><b>Izohlar:</b><br/>"
                    "<b>a)</b> eski tuzum tarafdorlari, islohotlar va o‘zgarishlarga qarshi turuvchilar<br/>"
                    "<b>b)</b> biron-bir hududning davlat hokimiyatini mustaqil amalga oshirish huquqi<br/>"
                    "<b>c)</b> biror-bir hududning qonun bilan chegaralangan davlat hokimiyatini mustaqil amalga oshirish huquqi<br/>"
                    "<b>d)</b> hukumatning, biror tashkilotning muhim bir hujjatni, qonunni, voqeani ko‘pchilik e’tiboriga yetkazuvchi bayonoti<br/>"
                    "<b>e)</b> davlatlarning o‘z siyosiy mustaqilligini muayyan doirada cheklash yo‘li bilan yagona ittifoqqa birlashuvi<br/>"
                    "<b>f)</b> ba’zi muassasa, tashkilotda rahbarlik ishini olib borish maqsadida saylanadigan yoki ta’sis etiladigan kollegial organ</div>"
                    "</div>"
                ),
                "explanation": "Avtonomiya (I-c), Federatsiya (II-e), Byuro (III-f), Deklaratsiya (IV-d).",
                "options": [
                    ("A", "I-c, II-e, III-f, IV-d", True),
                    ("B", "I-a, II-f, III-b, IV-c", False),
                    ("C", "I-c, II-f, III-b, IV-a", False),
                    ("D", "I-a, II-e, III-b, IV-d", False),
                ],
            },
            # 7
            {
                "body": (
                    "<p><b>Tarixiy shaxsni aniqlang.</b></p>"
                    "<p><i>U XX asrning birinchi choragida tuzilgan “Sho‘roi Islomiya” faoliyatida muhim rol o‘ynagan shaxslardan biri edi. Butunturkiston musulmonlarining I qurultoyida tashkil etilgan Turkiston o‘lka musulmonlar kengashida (Kraymussovet) rais lavozimini egallagan. Turkiston Muxtoriyati hukumatida esa tashqi ishlar vaziri, keyinchalik Bosh vazir lavozimini bajarishga kirishgan.</i></p>"
                ),
                "explanation": "Mustafo Cho'qay – Kraymussovet raisi, Turkiston Muxtoriyatida tashqi ishlar vaziri va keyin Bosh vazir bo'lgan.",
                "options": [
                    ("A", "Obidjon Mahmudov", False),
                    ("B", "Ubaydulla Xo‘jayev", False),
                    ("C", "Ahmad Zaki Validiy", False),
                    ("D", "Mustafo Cho‘qay", True),
                ],
            },
            # 8
            {
                "body": (
                    "<p><b>Tarixiy shaxsni aniqlang.</b></p>"
                    "<p><i>U 1937-yilda hokimiyat tepasiga kelgan Konservatorlar partiyasi rahbari edi. U o‘zining 3 yillik bosh vazirlik faoliyati davomida Gitlerni “tinchlantirish” siyosatining tashabbuskori bo‘lib maydonga chiqdi. Shuning uchun ham u Germaniyaning Avstriya, Chexoslovakiyani bosib olishiga amalda yordamlashdi. U bunday “kichik” yon berishlar bilan butun bir avlod uchun tinchlikni saqlab qolmoqdaman, deb qayta-qayta uqtirardi.</i></p>"
                ),
                "explanation": "Nevil Chemberlen – 1937–1940-yillarda Buyuk Britaniya bosh vaziri, 'tinchlantirish' siyosati yuritgan.",
                "options": [
                    ("A", "R.Makdonald", False),
                    ("B", "S.Bolduin", False),
                    ("C", "N.Chemberlen", True),
                    ("D", "U.Cherchill", False),
                ],
            },
            # 9
            {
                "body": (
                    "<p><b>Tarixiy davlatni aniqlang.</b></p>"
                    "<p><i>Ushbu davlat Janubiy Amerikaning And tog‘lari yonbag‘ridagi vohalarda vujudga kelgan. XII–XIII asrlarda o’z shahriga asos soladilar. Davlat hukmdori “Quyoshning o‘g‘li”, uning yerdagi ramzi sanalgan. Aholisi Quyosh xudosiga sig‘inganlar. Ular uchun din hayotning muhim qismi sifatida qaralgan. Ular doimiy ravishda Quyosh xudosi uchun diniy marosimlarni o‘tkazganlar. Ularning o‘ziga xos “tugunli xati” bo‘lib, uning sirlari faqat ruhoniylarga ma’lum edi.</i></p>"
                ),
                "explanation": "Inklar davlati – And tog'larida vujudga kelgan, poytaxti Kusko, hukmdori Quyosh o'g'li, tugunli xati (kipu) bo'lgan.",
                "options": [
                    ("A", "Asteklar davlati", False),
                    ("B", "Inklar davlati", True),
                    ("C", "Mayyalar davlati", False),
                    ("D", "Aksum davlati", False),
                ],
            },
            # 10
            {
                "body": (
                    "<p>Quyida berilgan ma’lumotlar qaysi tarixiy mahalliy hokimlik haqida ekanligini aniqlang.</p>"
                    "<p><i>Ushbu hokimlik hozirgi Janubiy O‘zbekiston va Janubiy Tojikiston, Shimoliy Afg‘onistonni o‘z ichiga olgan. Qunduz, Termiz, Chag‘oniyon, Xuttal kabi tog‘ va tog‘oldi viloyatlardan iborat bo‘lgan. Poytaxti Balx shahri bo‘lgan. Hunarmandchilikda qurolsozlik, shishasozlik, to‘qimachilik yuksalgan. Hindiston, Yaqin va Uzoq Sharq mamlakatlari bilan savdo-madaniy aloqalar o‘rnatgan.</i></p>"
                ),
                "explanation": "Toxariston – poytaxti Balx bo'lgan, Janubiy O'zbekiston, Tojikiston va Shimoliy Afg'onistonni egallagan ilk o'rta asrlar hokimligi.",
                "options": [
                    ("A", "Farg‘ona", False),
                    ("B", "Choch", False),
                    ("C", "Toxariston", True),
                    ("D", "Sug‘d", False),
                ],
            },
            # 11
            {
                "body": (
                    "<p>XIX asr o‘rtalarida Qo‘qonda alohida ajralib turgan, har birida 38 tadan 100 tagacha hujrasi bo‘lgan madrasalarni aniqlang.</p>"
                    "<div style='background:rgba(148,163,184,0.08);color:inherit;padding:12px 16px;border-radius:10px;border:1px solid rgba(148,163,184,0.2);margin:12px 0;line-height:1.7;font-size:13.5px;'>"
                    "1) Rahmonqul Inoq; 2) Hokimoyim; 3) Madalixon; 4) Sulton Murodbek; 5) Mingoyim; 6) Mo‘yi muborak; 7) Jome; 8) Muhammad Aminxon; 9) Hoja dodxoh; 10) Norbo‘tabiy."
                    "</div>"
                ),
                "explanation": "Qo'qondagi yirik madrasalar (38-100 hujrali): Hokimoyim (2), Madalixon (3), Mingoyim (5), Jome (7), Hoja dodxoh (9), Norbo'tabiy (10).",
                "options": [
                    ("A", "1, 4, 5, 6, 7, 9", False),
                    ("B", "1, 3, 4, 6, 8, 10", False),
                    ("C", "2, 4, 5, 6, 7, 8", False),
                    ("D", "2, 3, 5, 7, 9, 10", True),
                ],
            },
            # 12
            {
                "body": "<p>Quyida berilgan ma’lumotlardan qaysi biri <b>XIX asr O‘rta Osiyo davlatlari tarixi</b> uchun xos?</p>",
                "explanation": "Xiva xoni Olloqulixon davrida shahar devor bilan o'ralib, Ichan qal'a va Dishan qal'aga bo'lingan (XIX asr).",
                "options": [
                    ("A", "Buxoroda hokimiyat mang’itlar sulolasi qo’liga o’tdi", False),
                    ("B", "Xiva shahri – Ichan qal’a va Dishan qal’aga bo’lindi", True),
                    ("C", "Samarqand Registon ansamblining hozirgi qiyofasi shakllantirildi", False),
                    ("D", "Toshkent hozirgi nomi bilan atala boshlandi", False),
                ],
            },
            # 13
            {
                "body": (
                    "<p>Sobiq Ittifoq davrida qaysi shaharlar mahalliy hokimiyatga bo’ysunmagan va “yopiq shaharlar” deb atalgan?</p>"
                    "<div style='background:rgba(148,163,184,0.08);color:inherit;padding:12px 16px;border-radius:10px;border:1px solid rgba(148,163,184,0.2);margin:12px 0;line-height:1.7;font-size:13.5px;'>"
                    "1) Navoiy; 2) Bekobod; 3) Uchquduq; 4) Chirchiq; 5) Zarafshon; 6) Olmaliq."
                    "</div>"
                ),
                "explanation": "O'zbekistondagi yopiq atom/uran va oltin sanoati shaharlari: Navoiy (1), Uchquduq (3), Zarafshon (5).",
                "options": [
                    ("A", "1, 3, 5", True),
                    ("B", "2, 4, 6", False),
                    ("C", "1, 4, 6", False),
                    ("D", "2, 3, 5", False),
                ],
            },
            # 14
            {
                "body": "<p>Quyidagilardan qaysi biri 2009-yilda YUNESKOning nomoddiy madaniy merosi ro’yxatiga kiritilgan?</p>",
                "explanation": "Navro'z bayrami 2009-yilda YUNESKOning Insoniyat nomoddiy madaniy merosi reprezentativ ro'yxatiga kiritilgan.",
                "options": [
                    ("A", "Navro‘z", True),
                    ("B", "Askiya", False),
                    ("C", "O‘zbek palovi", False),
                    ("D", "Shashmaqom", False),
                ],
            },
            # 15
            {
                "body": (
                    "<p>Quyidagi inshootlar qaysi me’moriy uslubda barpo etilgan?</p>"
                    "<div style='background:rgba(148,163,184,0.08);color:inherit;padding:12px 16px;border-radius:10px;border:1px solid rgba(148,163,184,0.2);margin:12px 0;line-height:1.7;font-size:13.5px;'>"
                    "1) Avliyo Mark ibodatxonasi;<br/>"
                    "2) Laax monastiri;<br/>"
                    "3) Shartr ibodatxonasi;<br/>"
                    "4) Al-Qasar qasri.<br/>"
                    "<b>a)</b> arab uslubi; <b>b)</b> vizantiya uslubi; <b>c)</b> gotika uslubi; <b>d)</b> roman uslubi."
                    "</div>"
                ),
                "explanation": "Avliyo Mark – vizantiya (1-b); Laax – roman (2-d); Shartr – gotika (3-c); Al-Qasar – arab (4-a).",
                "options": [
                    ("A", "1-a, 2-d, 3-c, 4-b", False),
                    ("B", "1-b, 2-c, 3-a, 4-d", False),
                    ("C", "1-b, 2-d, 3-c, 4-a", True),
                    ("D", "1-c, 2-b, 3-d, 4-a", False),
                ],
            },
            # 16
            {
                "body": (
                    "<p>Quyidagi tarixiy voqealar (ma’lumotlar) to‘g‘ri xronologik ketma-ketlikda ko‘rsatilgan javobni toping.</p>"
                    "<div style='background:rgba(148,163,184,0.08);color:inherit;padding:12px 16px;border-radius:10px;border:1px solid rgba(148,163,184,0.2);margin:12px 0;line-height:1.7;font-size:13.5px;'>"
                    "1) Olimxon hukmronligi davrida Toshkent Qo‘qon xonligi tarkibiga qo‘shib olindi;<br/>"
                    "2) Qoraqalpoqlar Sirdaryoning quyi etagiga ko‘chib keldilar va qozoqlarning Kichik Juz xonligi tarkibiga kiradi;<br/>"
                    "3) Xivaga Eron va qozoqlarning O‘rta juz xonligidan elchilar kelishdi;<br/>"
                    "4) Xiva xoni Abulg‘oziy Bahodirxon Yangi Urganch shahrini qurdirdi;<br/>"
                    "5) Orenburgda Buxoro amirligi savdogarlarining qarorgohi qurildi;<br/>"
                    "6) Abdullaxon II ning harbiy yordami bilan Shayboniy Ko‘chimxon Sibir xonligi taxtini egalladi."
                    "</div>"
                ),
                "explanation": "To'g'ri xronologik ketma-ketlik: 2, 6, 4, 5, 1, 3.",
                "options": [
                    ("A", "2, 1, 3, 4, 6, 5", False),
                    ("B", "4, 6, 5, 2, 1, 3", False),
                    ("C", "2, 6, 4, 5, 1, 3", True),
                    ("D", "1, 3, 4, 6, 5, 2", False),
                ],
            },
            # 17 (MAP QUESTION)
            {
                "body": (
                    "<p>1911-yili Italiya bilan bo’lgan urushda Usmonli davlatining yengilishidan foydalanib «Bolqon ittifoqi»ni tuzgan davlatlar xaritada qaysi raqamlar ostida berilgan?</p>"
                ),
                "image": "tests/maps/balkan_map_q17_numbered.jpg",
                "explanation": "Bolqon ittifoqi (1912): Bolgariya (1), Serbiya (4), Chernogoriya (6), Gretsiya (7). Javob: 1, 4, 6, 7.",
                "options": [

                    ("A", "1, 3, 5, 6", False),
                    ("B", "1, 4, 5, 6", False),
                    ("C", "2, 4, 5, 6", False),
                    ("D", "1, 4, 6, 7", True),
                ],
            },
            # 18 (TABLE QUESTION)
            {
                "body": (
                    "<p>Tarixiy voqea va uning natijasi o‘zaro mos berilgan qatorlarni aniqlang.</p>"
                    "<div style='overflow-x:auto;margin:12px 0;'>"
                    "<table style='width:100%;border-collapse:collapse;font-size:13px;border:1px solid rgba(148,163,184,0.2);background:transparent;'>"
                    "<thead><tr style='background:rgba(148,163,184,0.12);border-bottom:2px solid rgba(148,163,184,0.25);text-align:left;'>"
                    "<th style='padding:8px 12px;width:35px;'>№</th><th style='padding:8px 12px;width:48%;'>Voqea</th><th style='padding:8px 12px;'>Natija</th></tr></thead>"
                    "<tbody>"
                    "<tr style='border-bottom:1px solid rgba(148,163,184,0.15);'><td style='padding:8px 12px;font-weight:bold;'>1.</td><td style='padding:8px 12px;'>Xitoyda 1351-yil boshlangan dehqonlar qo’zg’oloni</td><td style='padding:8px 12px;'>Yuan sulolasiga asos solinishi</td></tr>"
                    "<tr style='border-bottom:1px solid rgba(148,163,184,0.15);background:rgba(148,163,184,0.08);color:inherit;'><td style='padding:8px 12px;font-weight:bold;'>2.</td><td style='padding:8px 12px;'>XVII asrdagi Angliyadagi burjua inqilobi</td><td style='padding:8px 12px;'>Angliya qishloq xo’jaligida kapitalistlik munosabatlarning tez rivojlanishi va sanoat to’ntarishining boshlanishi</td></tr>"
                    "<tr style='border-bottom:1px solid rgba(148,163,184,0.15);'><td style='padding:8px 12px;font-weight:bold;'>3.</td><td style='padding:8px 12px;'>1917-yil Rossiyadagi fevral inqilobi</td><td style='padding:8px 12px;'>Xiva xoni Asfandiyorxon islohotlar o’tkazish to’g’risidagi manifestga imzo chekdi</td></tr>"
                    "<tr style='border-bottom:1px solid rgba(148,163,184,0.15);background:rgba(148,163,184,0.08);color:inherit;'><td style='padding:8px 12px;font-weight:bold;'>4.</td><td style='padding:8px 12px;'>2003-yil “Atirgullar inqilobi”</td><td style='padding:8px 12px;'>Gruziyada “yangi demokratlar”ning hokimiyatga kelishi</td></tr>"
                    "<tr style='border-bottom:1px solid rgba(148,163,184,0.15);'><td style='padding:8px 12px;font-weight:bold;'>5.</td><td style='padding:8px 12px;'>Giksoslarning tor-mor etilishi va fir'avn Yaxmos tomonidan ularning Misrdan quvib chiqilishi</td><td style='padding:8px 12px;'>Misrda O’rta podsholikka asos solinishi</td></tr>"
                    "<tr style='border-bottom:1px solid rgba(148,163,184,0.15);background:rgba(148,163,184,0.08);color:inherit;'><td style='padding:8px 12px;font-weight:bold;'>6.</td><td style='padding:8px 12px;'>Vilgelm II ning Germaniya taxtiga kelishi</td><td style='padding:8px 12px;'>Germaniyada ikkinchi imperiyaning boshlanishi</td></tr>"
                    "<tr><td style='padding:8px 12px;font-weight:bold;'>7.</td><td style='padding:8px 12px;'>IV-VI asrlardagi xalqlarning buyuk ko’chishlari</td><td style='padding:8px 12px;'>German qabilalari tomonidan G’arbiy Rim imperiyasining bosib olinishi</td></tr>"
                    "</tbody></table></div>"
                ),
                "explanation": "To'g'ri juftliklar: 2, 3, 4, 7.",
                "options": [
                    ("A", "2, 3, 4, 7", True),
                    ("B", "1, 3, 6, 7", False),
                    ("C", "2, 4, 5, 7", False),
                    ("D", "1, 2, 6, 7", False),
                ],
            },
            # 19 (MATRIX TABLE)
            {
                "body": (
                    "<p>Jadvalda harflar bilan belgilangan kataklarga quyida berilgan ma’lumotlardan moslarini qo‘yib to‘g‘ri javobni toping.</p>"
                    "<div style='overflow-x:auto;margin:12px 0;'>"
                    "<table style='width:100%;border-collapse:collapse;font-size:13px;border:1px solid rgba(148,163,184,0.2);background:transparent;'>"
                    "<thead><tr style='background:rgba(148,163,184,0.12);border-bottom:2px solid rgba(148,163,184,0.25);text-align:left;'>"
                    "<th style='padding:8px 12px;width:70px;'>Asr</th><th style='padding:8px 12px;width:45%;'>O‘zbekiston tarixidagi voqea</th><th style='padding:8px 12px;'>Jahon tarixidagi voqea</th></tr></thead>"
                    "<tbody>"
                    "<tr style='border-bottom:1px solid rgba(148,163,184,0.15);'><td style='padding:8px 12px;font-weight:bold;color:#3b82f6;'>a</td><td style='padding:8px 12px;'>Xoqoniya rivoj topib kuchaygach, u “Qarluq-Qoraxoniylar” davlati nomini olgan.</td><td style='padding:8px 12px;font-weight:bold;color:#3b82f6;'>b</td></tr>"
                    "<tr style='border-bottom:1px solid rgba(148,163,184,0.15);background:rgba(148,163,184,0.08);color:inherit;'><td style='padding:8px 12px;font-weight:bold;color:#3b82f6;'>c</td><td style='padding:8px 12px;font-weight:bold;color:#3b82f6;'>d</td><td style='padding:8px 12px;'>Yaponiyada xristian dinining tarqalishi taqiqlandi</td></tr>"
                    "<tr style='border-bottom:1px solid rgba(148,163,184,0.15);'><td style='padding:8px 12px;font-weight:bold;'>XIX</td><td style='padding:8px 12px;font-weight:bold;color:#3b82f6;'>e</td><td style='padding:8px 12px;font-weight:bold;color:#3b82f6;'>f</td></tr>"
                    "<tr style='border-bottom:1px solid rgba(148,163,184,0.15);background:rgba(148,163,184,0.08);color:inherit;'><td style='padding:8px 12px;font-weight:bold;color:#3b82f6;'>g</td><td style='padding:8px 12px;'>Islom Karimov Amerika jamoatchiligi tomonidan “Xalqaro miqyosda lider” mukofoti bilan taqdirlandi</td><td style='padding:8px 12px;font-weight:bold;color:#3b82f6;'>h</td></tr>"
                    "<tr style='border-bottom:1px solid rgba(148,163,184,0.15);'><td style='padding:8px 12px;font-weight:bold;color:#3b82f6;'>i</td><td style='padding:8px 12px;font-weight:bold;color:#3b82f6;'>j</td><td style='padding:8px 12px;'>Qul savdosida yetakchilikni gollandlar o’z qo’liga oldi</td></tr>"
                    "<tr><td style='padding:8px 12px;font-weight:bold;'>IV</td><td style='padding:8px 12px;font-weight:bold;color:#3b82f6;'>k</td><td style='padding:8px 12px;font-weight:bold;color:#3b82f6;'>l</td></tr>"
                    "</tbody></table></div>"
                    "<div style='background:rgba(148,163,184,0.08);color:inherit;padding:12px 16px;border-radius:10px;border:1px solid rgba(148,163,184,0.2);margin:10px 0;font-size:12px;line-height:1.6;'>"
                    "<b>Ma’lumotlar:</b> 1) Qoraqum eshon madrasasi qurildi; 2) 2002-yil; 3) Subxonqulixon Balxni egallaydi; 4) XI-XII asrlar; 5) Imperializm atamasi keng iste’molga aylandi; 6) Xiva xonligi ikki marta Buxoro xonligi tomonidan bosib olingan; 7) XVI asr; 8) Malta Yevroittifoqqa a’zo bo’ldi; 9) XVII asr; 10) Yaponiyada yer egaligi munosabatlari o’rnatildi; 11) Rim imperiyasi ikki qismga bo’linib ketdi; 12) XVI asr; 13) Buxoro, Karki, Termiz, Kogonda Rossiya firmalarining idora va omborxonalari ochildi; 14) Xorazmda Afrig’iylar sulolasi poytaxtni Kat shahriga ko’chiradi; 15) XIV asr; 16) Toshkent bekligi tashkil topdi; 17) XVII asr; 18) Hindistonning shimoliy hududlarida turk va afg’on qabilalarining joylashuvi kuchaydi; 19) AQSH Gavayi orollarini anneksiya qilib, Filippinni bosib oldi."
                    "</div>"
                ),
                "explanation": "To'g'ri moslik: a-4, b-18, c-7, d-6, e-13, f-5, g-2, h-8, i-17, j-3, k-14, l-11.",
                "options": [
                    ("A", "a-4, b-10, c-9, d-16, e-1, f-18, g-2, h-8, i-12, j-6, k-14, l-3", False),
                    ("B", "a-4, b-18, c-7, d-6, e-13, f-5, g-2, h-8, i-17, j-3, k-14, l-11", True),
                    ("C", "a-4, b-10, c-12, d-16, e-1, f-17, g-2, h-5, i-15, j-6, k-8, l-3", False),
                    ("D", "a-4, b-18, c-15, d-6, e-5, f-19, g-4, h-3, i-12, j-6, k-6, l-11", False),
                ],
            },
            # 20 (EULER-VENN DIAGRAM)
            {
                "body": (
                    "<p>Quyida berilgan ma’lumotlarni tahlil qilib Eyler-Venn diagrammasiga mos keladigan javoblarni aniqlang.</p>"
                    "<div style='background:rgba(148,163,184,0.08);color:inherit;padding:12px 16px;border-radius:10px;border:1px solid rgba(148,163,184,0.2);margin:10px 0;font-size:13px;line-height:1.7;'>"
                    "<b>a)</b> mamlakatda musulmon bo’lmagan aholining o’z kiyimiga sariq belgi taqib yurishi haqida dekret qabul qilindi<br/>"
                    "<b>b)</b> 2001-yil Nyu-Yorkda amalga oshirilgan terrorchilik aktidan so’ng AQSH bu davlatni “xalqaro terrorizmning sherigi” deb atadi<br/>"
                    "<b>c)</b> mamlakat hududidan SSSR qo’shinlari olib chiqib ketildi<br/>"
                    "<b>d)</b> Semnodagi kosmodromdan “Safir-2” raketasi yordamida “Umid” nomli sun’iy yo’ldosh fazoga chiqarildi (2009-yil)<br/>"
                    "<b>e)</b> mamlakat Islom Respublikasi hisoblanadi<br/>"
                    "<b>f)</b> “Sahrodagi bo’ron” operatsiyasi amalga oshirilgan"
                    "</div>"
                ),
                "image": "tests/maps/venn_diagram_q20.jpg",
                "explanation": "Eron (I: b, d), Afg'oniston (II: a, c), Ikkalasiga xos (III: e - ikkalasi ham Islom Respublikasi).",
                "options": [
                    ("A", "I-b, d; II-a, c; III-e", True),
                    ("B", "I-b, c; II-a, d; III-e", False),
                    ("C", "I-a, d; II-b, c; III-f", False),
                    ("D", "I-b, c; II-d, e; III-f", False),
                ],
            },
            # 21
            {
                "body": (
                    "<p>Ma’lumki, XIII asr boshlarida Xorazm juda keng maydonni egallagan buyuk davlatga aylangan edi. Uning chegaralari to’g’ri moslashtirilgan javobni aniqlang.</p>"
                    "<div style='background:rgba(148,163,184,0.08);color:inherit;padding:12px 16px;border-radius:10px;border:1px solid rgba(148,163,184,0.2);margin:12px 0;line-height:1.7;font-size:13.5px;'>"
                    "1) janubiy sharqda; 2) shimoli sharqda; 3) shimoli g’arbiy va g’arbida; 4) janubi g’arbda.<br/>"
                    "<b>a)</b> G’azna viloyati; <b>b)</b> Iroq; <b>c)</b> Orol va Kaspiy dengizi; <b>d)</b> Yettisuv va Dashti Qipchoq."
                    "</div>"
                ),
                "explanation": "Janubi-sharqda: G'azna viloyati (1-a); shimoli-sharqda: Yettisuv va Dashti Qipchoq (2-d); shimoli-g'arb va g'arbda: Orol va Kaspiy dengizi (3-c); janubi-g'arbda: Iroq (4-b).",
                "options": [
                    ("A", "1-b; 2-a; 3-c; 4-b", False),
                    ("B", "1-a; 2-d; 3-c; 4-b", True),
                    ("C", "1-c; 2-a; 3-b; 4-d", False),
                    ("D", "1-a; 2-d; 3-b; 4-c", False),
                ],
            },
            # 22
            {
                "body": "<p>Quyidagilar orasidan Fransiyadagi ikkinchi imperiya davrida bir oilaning hayoti va ijtimoiy tarixiga bag’ishlangan asar va uning muallifi to’g’ri ko’rsatilgan javobni aniqlang.</p>",
                "explanation": "Emil Zolya – «Rugon-Makkarlar: Ikkinchi imperiya davrida bir oilaning tabiiy va ijtimoiy tarixi» ko'p jildli asari.",
                "options": [
                    ("A", "G. Man “Imperiya”", False),
                    ("B", "Jek London “Marten Iden”", False),
                    ("C", "Bernard Shou “Mayor Barbara”", False),
                    ("D", "Emil Zolya “Rugon-Makkarlar”", True),
                ],
            },
            # 23
            {
                "body": "<p>XIX asr oxiri – XX asr boshlarida Xiva xonligida o’tloqlardan foydalanganlik uchun qanday soliq olingan?</p>",
                "explanation": "Cho'p puli – o'tloq va yaylovlardan foydalanganlik uchun to'lanadigan soliq.",
                "options": [
                    ("A", "cho’p puli", True),
                    ("B", "o’tov puli", False),
                    ("C", "afanak puli", False),
                    ("D", "kafsan", False),
                ],
            },
            # 24
            {
                "body": (
                    "<p>Quyida sanab o’tilganlardan qaysilar Yaponiya tashqi siyosatining 1870-1918-yillar tarixiga aloqadar?</p>"
                    "<div style='background:rgba(148,163,184,0.08);color:inherit;padding:12px 16px;border-radius:10px;border:1px solid rgba(148,163,184,0.2);margin:12px 0;line-height:1.7;font-size:13.5px;'>"
                    "1) AQSH bilan Yaponiya o’rtasida “Tinchlik va do’stlik to’g’risida”gi Shartnomaning imzolanishi;<br/>"
                    "2) Veyxayvey portining bosib olinishi;<br/>"
                    "3) Koreya yarim orolini harbiy kuch bilan o’ziga qo’shib olishi;<br/>"
                    "4) Erondagi aksiinqilobiy davlat to’ntarishida ishtirok etishi;<br/>"
                    "5) Rossiyada Kuril orollarining ajratib olinishi;<br/>"
                    "6) Ryukyu orolini bosib olishi"
                    "</div>"
                ),
                "explanation": "3 (1910 - Koreya anneksiyasi), 5 (1875 - Peterburg shartnomasi bo'yicha Kuril orollari), 6 (1879 - Ryukyu orollari bosib olinishi). Javob: 3, 5, 6.",
                "options": [
                    ("A", "3, 4, 6", False),
                    ("B", "1, 2, 5", False),
                    ("C", "3, 5, 6", True),
                    ("D", "1, 2, 4", False),
                ],
            },
            # 25
            {
                "body": (
                    "<p>Saljuqiylar davlati XII asr boshlaridayoq Sharqiy va G’arbiy qismlarga bo’linib ketgan edi. Quyidagilar orasidan G’arbiy Saljuqiylar tarkibiga kirgan hududlarni aniqlang.</p>"
                    "<div style='background:rgba(148,163,184,0.08);color:inherit;padding:12px 16px;border-radius:10px;border:1px solid rgba(148,163,184,0.2);margin:12px 0;line-height:1.7;font-size:13.5px;'>"
                    "1) Xorazm; 2) Iroq; 3) Xuroson; 4) Eron; 5) Ozarbayjon; 6) Afg’oniston."
                    "</div>"
                ),
                "explanation": "G'arbiy Saljuqiylar: Iroq (2), Eron (4), Ozarbayjon (5). Sharqiy qismi: Xuroson, Afg'oniston, Xorazm (Sulton Sanjar tasarrufida).",
                "options": [
                    ("A", "1, 3, 5", False),
                    ("B", "2, 4, 5", True),
                    ("C", "2, 3, 6", False),
                    ("D", "1, 4, 6", False),
                ],
            },
            # 26
            {
                "body": (
                    "<p>XIX asrning 60-90-yillarida Amerika madaniyati rivojlanishining ikkita bosqichi bo’lib, bu davrda tasviriy san’atda kimlar faoliyat olib borgan?</p>"
                    "<div style='background:rgba(148,163,184,0.08);color:inherit;padding:12px 16px;border-radius:10px;border:1px solid rgba(148,163,184,0.2);margin:12px 0;line-height:1.7;font-size:13.5px;'>"
                    "1) Uolt Uitmen; 2) Tomas Ikins; 3) Mark Tven; 4) Jeyms Uistler; 5) Uinslou Homer."
                    "</div>"
                ),
                "explanation": "Tasviriy san'at (rassomlik): Tomas Ikins (2) va Uinslou Homer (5). Uitmen va Mark Tven – adabiyot namoyandalari.",
                "options": [
                    ("A", "1, 4", False),
                    ("B", "2, 5", True),
                    ("C", "3, 5", False),
                    ("D", "1, 2", False),
                ],
            },
            # 27
            {
                "body": (
                    "<p>O’zaro muvofiqlik <b>SAQLANMAGAN</b> javobni toping.</p>"
                    "<div style='background:rgba(148,163,184,0.08);color:inherit;padding:12px 16px;border-radius:10px;border:1px solid rgba(148,163,184,0.2);margin:12px 0;line-height:1.7;font-size:13.5px;'>"
                    "<b>I.</b> Qadimgi Misr; <b>II.</b> Qadimgi Yunoniston; <b>III.</b> Mesopotamiya; <b>IV.</b> Qadimgi Rim.<br/>"
                    "<b>a)</b> Tot; <b>b)</b> Apollon; <b>c)</b> Ishtar; <b>d)</b> Yupiter; <b>e)</b> Maat; <b>f)</b> Fortuna.<br/>"
                    "1) oy xudosi; 2) momaqaldiroq va yashin podshosi; 3) musiqa va she'riyat xudosi; 4) donishmandlik xudosi; 5) urush va g'alaba xudosi; 6) yorug'lik xudosi; 7) chaqmoq xudosi; 8) tabobat xudosi; 9) hosildorlik xudosi; 10) adolat xudosi; 11) taqdir ilohasi."
                    "</div>"
                ),
                "explanation": "D variantda: II-b-4 (Apollon donishmandlik xudosi emas, Afina donishmandlik ilohasi), shuning uchun muvofiqlik saqlanmagan.",
                "options": [
                    ("A", "I-a-1; II-b-3; III-c-9; IV-d-7", False),
                    ("B", "I-e-10; II-b-6; III-c-5; IV-f-11", False),
                    ("C", "I-a-4; II-b-3; III-c-9; IV-d-2", False),
                    ("D", "I-e-10; II-b-4; III-c-9; IV-d-7", True),
                ],
            },
            # 28
            {
                "body": "<p>XX asrning 80-yillarida Ruminiyada ko’tarilgan qo’zg’olonning boshlanishiga sabab bo’lgan omilni aniqlang.</p>",
                "explanation": "1989-yil dekabrda Timishiora shahrida N. Chaushesku rejimiga qarshi tinch namoyishchilar harbiylar tomonidan o'qqa tutilishi inqilob boshlanishiga sabab bo'lgan.",
                "options": [
                    ("A", "rumin va rus millatiga mansub aholi o’rtasida nizolarning kuchayishi", False),
                    ("B", "Ruminiyaning NATOga a’zo bo’lishiga qarshi Timishiora maydonidagi norozilik chiqishlari", False),
                    ("C", "Timishiora shahrida aholining N.Chaushesku rejimiga qarshi tinch namoyishning harbiylar tomonidan o’qqa tutilganligi", True),
                    ("D", "aholining Ion Iliyesku rejimiga qarshi tinch namoyishning harbiylar tomonidan kuch bilan bostirilganligi", False),
                ],
            },
            # 29
            {
                "body": "<p>2017-2018-yillarda Andijon viloyatida quyidagi qaysi ijodkorning xotirasini abadiylashtirish bo’yicha tadbir o’tkazilgan va uning nomi bilan atalgan markaz, ijod maktabi ochilgan?</p>",
                "explanation": "O'zbekiston xalq shoiri Muhammad Yusuf xotirasiga Andijon viloyatida ijod maktabi va muzey tashkil etilgan.",
                "options": [
                    ("A", "Erkin Vohidov", False),
                    ("B", "Is’hoqxon Ibrat", False),
                    ("C", "Ibroyim Yusupov", False),
                    ("D", "Muhammad Yusuf", True),
                ],
            },
            # 30
            {
                "body": (
                    "<p>Asarlar va ularning mualliflari to’g’ri moslashtirilgan javobni toping.</p>"
                    "<div style='display:grid;grid-template-columns:1fr 1fr;gap:14px;background:rgba(148,163,184,0.08);color:inherit;padding:14px 18px;border-radius:10px;border:1px solid rgba(148,163,184,0.2);margin:12px 0;line-height:1.7;font-size:13.5px;'>"
                    "<div><b>Asarlar:</b><br/>"
                    "1. “Girdob”<br/>"
                    "2. “Mobi dik”<br/>"
                    "3. “Soliq”</div>"
                    "<div><b>Mualliflar:</b><br/>"
                    "a) Stiven Kreyn<br/>"
                    "b) Frenk Norris<br/>"
                    "c) Ajiniyoz<br/>"
                    "d) Berdaq<br/>"
                    "e) Fenimor Kuper<br/>"
                    "f) German Melvill</div>"
                    "</div>"
                ),
                "explanation": "“Girdob” – Frenk Norris (1-b); “Mobi dik” – German Melvill (2-f); “Soliq” – Berdaq (3-d).",
                "options": [
                    ("A", "1-b; 2-f; 3-d", True),
                    ("B", "1-e; 2-f; 3-c", False),
                    ("C", "1-e; 2-c; 3-d", False),
                    ("D", "1-b; 2-d; 3-a", False),
                ],
            },
            # 31
            {
                "body": (
                    "<p>Chizmada nomi keltirilgan shaxslar va ularga tegishli ma’lumotlar to‘g‘ri moslashtirilgan javobni toping.</p>"
                    "<div style='display:grid;grid-template-columns:1fr 2fr;gap:14px;background:rgba(148,163,184,0.08);color:inherit;padding:14px 18px;border-radius:10px;border:1px solid rgba(148,163,184,0.2);margin:12px 0;line-height:1.7;font-size:13.5px;'>"
                    "<div><b>Olimlar:</b><br/>"
                    "1. F.Lyofler<br/>"
                    "2. J.Tomson<br/>"
                    "3. Maksvell</div>"
                    "<div><b>Kashfiyotlar / Ta'riflar:</b><br/>"
                    "a) amyoba dizenteriyasi tug`diruvchi mikrobni aniqladi<br/>"
                    "b) bo`g`ma tug`diruvchi mikrobni aniqladi<br/>"
                    "c) yorug’likning elektromagnit nazariyasini aniqladi<br/>"
                    "d) katod nurlari manfiy zaryadli zarrachalar ekanligini aniqladi<br/>"
                    "e) Gen muhandisligini aniqladi<br/>"
                    "f) elektromagnit to`lqinlari haqida nazariya asoschisi</div>"
                    "</div>"
                ),
                "explanation": "Lyofler – bo'g'ma mikrobi (1-b); Tomson – katod nurlari manfiy zaryadli zarrachalar (2-d); Maksvell – elektromagnit to'lqinlar nazariyasi (3-f).",
                "options": [
                    ("A", "1-a; 2-e; 3-d", False),
                    ("B", "1-b; 2-d; 3-f", True),
                    ("C", "1-b; 2-a; 3-c", False),
                    ("D", "1-c; 2-a; 3-f", False),
                ],
            },
            # 32
            {
                "body": (
                    "<p>Quyida berilganlar orasidan Sovuq Urush davri ixtirolarini aniqlang.</p>"
                    "<div style='background:rgba(148,163,184,0.08);color:inherit;padding:12px 16px;border-radius:10px;border:1px solid rgba(148,163,184,0.2);margin:12px 0;line-height:1.7;font-size:13.5px;'>"
                    "1) Plastmassa; 2) Internet; 3) Penitsilin; 4) Kosmonavtika; 5) “Motorola”; 6) Plastik; 7) Atom texnologiyalari (AES); 8) Lazer; 9) Poloniy; 10) Rentgen nurlari."
                    "</div>"
                ),
                "explanation": "Sovuq urush davri ixtirolari: Internet (2), Kosmonavtika (4), Motorola mobil aloqasi (5), Plastik (6), Atom texnologiyalari (7), Lazer (8).",
                "options": [
                    ("A", "1, 2, 4, 5, 7, 8", False),
                    ("B", "2, 3, 4, 5, 6, 9", False),
                    ("C", "2, 4, 5, 6, 7, 8", True),
                    ("D", "1, 4, 5, 7, 9, 10", False),
                ],
            },
            # 33 (MATRIX A-F QUESTION 1)
            {
                "body": (
                    "<div style='background:rgba(148,163,184,0.08);color:inherit;padding:12px 16px;border-radius:10px;border:1px solid rgba(148,163,184,0.2);margin-bottom:12px;font-size:13px;line-height:1.6;'>"
                    "<b>33–35-test topshiriqlariga mos keluvchi javoblarni (A–F) variantlaridan tanlang:</b><br/>"
                    "A) Simonoseki sulhi imzolandi (1895)<br/>"
                    "B) Nyu-York fond birjasidagi inqiroz (1929)<br/>"
                    "C) SSSR va Yaponiya o’rtasidagi neytralitet to’g’risidagi shartnoma (1941)<br/>"
                    "D) Yaponiyada Duglas Makkartur hukumati ag’darildi (1952)<br/>"
                    "E) Turkmanchoy shartnomasi imzolandi (1828)<br/>"
                    "F) AQSHda fuqarolar urushi bo’lib o’tdi (1861–1865)"
                    "</div>"
                    "<p><b>33-topshiriq:</b> Berilgan voqealardan qaysi biri AQSHning ijtimoiy-iqtisodiy taraqqiyoti masalalarini burjuacha ruhda hal qildi?</p>"
                ),
                "explanation": "F) AQSHda fuqarolar urushi (1861–1865) qullikni bekor qilib, mamlakat ijtimoiy-iqtisodiy rivojlanishini to'liq burjuacha yo'lga soldi.",
                "options": [
                    ("A", "Simonoseki sulhi imzolandi", False),
                    ("B", "Nyu-York fond birjasidagi inqiroz", False),
                    ("C", "SSSR va Yaponiya neytralitet shartnomasi", False),
                    ("D", "AQSHda fuqarolar urushi bo’lib o’tdi", True),
                ],
            },
            # 34 (MATRIX A-F QUESTION 2)
            {
                "body": (
                    "<div style='background:rgba(148,163,184,0.08);color:inherit;padding:12px 16px;border-radius:10px;border:1px solid rgba(148,163,184,0.2);margin-bottom:12px;font-size:13px;line-height:1.6;'>"
                    "<b>33–35-test topshiriqlariga mos keluvchi javoblarni (A–F) variantlaridan tanlang:</b><br/>"
                    "A) Simonoseki sulhi imzolandi (1895)<br/>"
                    "B) Nyu-York fond birjasidagi inqiroz (1929)<br/>"
                    "C) SSSR va Yaponiya o’rtasidagi neytralitet to’g’risidagi shartnoma (1941)<br/>"
                    "D) Yaponiyada Duglas Makkartur hukumati ag’darildi (1952)<br/>"
                    "E) Turkmanchoy shartnomasi imzolandi (1828)<br/>"
                    "F) AQSHda fuqarolar urushi bo’lib o’tdi (1861–1865)"
                    "</div>"
                    "<p><b>34-topshiriq:</b> Qaysi voqea natijasida Tayvan oroli Yaponiya ta’sir doirasiga o’tkazilgan?</p>"
                ),
                "explanation": "A) 1895-yilgi Simonoseki sulhi natijasida Xitoy Tayvan orolini Yaponiyaga berishga majbur bo'lgan.",
                "options": [
                    ("A", "Simonoseki sulhi imzolandi", True),
                    ("B", "Nyu-York fond birjasidagi inqiroz", False),
                    ("C", "Turkmanchoy shartnomasi imzolandi", False),
                    ("D", "AQSHda fuqarolar urushi bo’lib o’tdi", False),
                ],
            },
            # 35 (MATRIX A-F QUESTION 3)
            {
                "body": (
                    "<div style='background:rgba(148,163,184,0.08);color:inherit;padding:12px 16px;border-radius:10px;border:1px solid rgba(148,163,184,0.2);margin-bottom:12px;font-size:13px;line-height:1.6;'>"
                    "<b>33–35-test topshiriqlariga mos keluvchi javoblarni (A–F) variantlaridan tanlang:</b><br/>"
                    "A) Simonoseki sulhi imzolandi (1895)<br/>"
                    "B) Nyu-York fond birjasidagi inqiroz (1929)<br/>"
                    "C) SSSR va Yaponiya o’rtasidagi neytralitet to’g’risidagi shartnoma (1941)<br/>"
                    "D) Yaponiyada Duglas Makkartur hukumati ag’darildi (1952)<br/>"
                    "E) Turkmanchoy shartnomasi imzolandi (1828)<br/>"
                    "F) AQSHda fuqarolar urushi bo’lib o’tdi (1861–1865)"
                    "</div>"
                    "<p><b>35-topshiriq:</b> Berilgan voqealardan qaysi biri eng keyin sodir bo’lgan?</p>"
                ),
                "explanation": "D) Yaponiyada Duglas Makkartur ma'muriyati tugatilib mustaqillik tiklanishi (1952-yil) sanalgan voqealar orasida eng so'nggisi hisoblanadi.",
                "options": [
                    ("A", "Simonoseki sulhi imzolandi (1895)", False),
                    ("B", "Nyu-York fond birjasidagi inqiroz (1929)", False),
                    ("C", "SSSR va Yaponiya neytralitet shartnomasi (1941)", False),
                    ("D", "Yaponiyada Duglas Makkartur hukumati ag’darildi (1952)", True),
                ],
            },
        ]

        for i, item in enumerate(mcq_data, start=1):
            img_val = item.get("image", None)
            img_url = f"/media/{img_val}" if img_val else None
            q = Question.objects.create(
                body=item["body"],
                image=img_val,
                image_url=img_url,
                question_type="single_choice",
                category="certificate",
                difficulty="hard",
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
            self.stdout.write(f"  [{i:02d}] Test savoli qo'shildi...")

        # ── 6. III qism: 10 ta Yozma (Ochiq) topshiriq (36–45) ───────────────
        open_data = [
            # 36
            {
                "title": "Kiyev Rusi davlati 882-yilda asos solingan.",
                "parts": [
                    ("a", "Rus tarixida birinchi bor podsholik tojini kiygan hukmdorni yozing.", "Ivan IV (Ivan Grozniy / Ivan 4)"),
                    ("b", "Ushbu davlatga qaysi sulola vakillari tomonidan asos solingan?", "Ryuriklar (Ryurikovichlar / Ryurik)"),
                ],
                "explanation": "a) Ivan IV (1547-yilda toj kiygan); b) Ryuriklar sulolasi.",
            },
            # 37
            {
                "title": "XIX asr oxiri XX asr boshlarida AQSh Lotin Amerikasida hukmron bo‘lib olish uchun kurash olib bordi.",
                "parts": [
                    ("a", "IV Panamerika konferensiyasi qaysi davlatda o‘tkazilgan?", "Argentina (Buenos-Ayres)"),
                    ("b", "Ushbu kurash davomida Amerika prezidentlari qaysi hujjatga asosan ish olib borgan?", "Monro doktrinasi (Monro)"),
                ],
                "explanation": "a) Argentina (1910-yil Buenos-Ayresda); b) Monro doktrinasi.",
            },
            # 38
            {
                "title": "1940-yillar oxirida Markaziy va Sharqiy Yevropa mamlakatlarida o‘rnatilgan tuzum “xalq-demokratik”, keyin esa “sotsialistik” deb ataldi.",
                "parts": [
                    ("a", "1948-yil fevralida qaysi davlat siyosiy hayotida tub burilish yuz berishi natijasida G‘arb bilan aloqalarni uzib, Sovet Ittifoqi ta’siri ostiga o‘tdi?", "Chexoslovakiya"),
                    ("b", "1949-yili kommunistik partiyalar hokimiyat tepasiga kelgan davlatlarni yozing (kamida 3 ta davlat nomi).", "Albaniya, Bolgariya, Vengriya, Polsha, Ruminiya, Chexoslovakiya, Yugoslaviya"),
                ],
                "explanation": "a) Chexoslovakiya; b) Albaniya, Bolgariya, Vengriya, Polsha, Ruminiya, Chexoslovakiya, Yugoslaviya.",
            },
            # 39
            {
                "title": "XX asrning oxirlarida dunyoda ro‘y berayotgan o‘zgarishlar Turkiyaga ham o‘z ta’sirini o‘tkazdi.",
                "parts": [
                    ("a", "2002-yilgi parlament saylovlaridan so‘ng bosh vazir lavozimini egallagan shaxsni aniqlang.", "Abdulloh Gul (Abdullah Gul / Abdulla Gul)"),
                    ("b", "Ushbu shaxs qaysi partiya vakili bo‘lgan?", "Adolat va taraqqiyot (Adolat va taraqqiyot partiyasi / AKP)"),
                ],
                "explanation": "a) Abdulloh Gul; b) Adolat va taraqqiyot partiyasi (AKP).",
            },
            # 40
            {
                "title": "Somoniylar davlatida turk hojiblaridan iborat saroy qo‘shinining siyosiy nufuzi nihoyatda kuchaydi. 962-963-yillarda G‘azna viloyatini Alptegin noib va lashkar sifatida boshqargan.",
                "parts": [
                    ("a", "Mahmud G‘aznaviyning Xorazmga qilgan yurishi davomida qaysi hudud yaqinida Xorazm qo‘shinlari mag‘lub etilgan?", "Hazorasp (Hazorasp yaqinida)"),
                    ("b", "Mahmud G‘aznaviydan so‘ng bevosita hokimiyat ishlarini qo‘lga olgan davlat amaldorini yozing.", "Ali Qarib (Ali Qorib)"),
                ],
                "explanation": "a) Hazorasp; b) Ali Qarib (hukumat ishlari noziri).",
            },
            # 41
            {
                "title": "Arab tarixchisi Maqdisiy keltirgan ma’lumotlarga ko‘ra: Xorazmda ishlab chiqarilgan ……(a), Chochning ……(b) hamda Samarqandning qog‘ozlari Buyuk Ipak yo‘lida ayirboshlanadigan mollar ichida eng mashhuri va bebahosi bo’lgan.",
                "parts": [
                    ("a", "Nuqtalar o‘rniga mos keluvchi javobni yozing: Xorazmda ishlab chiqarilgan ... (a)", "kamon (Xorazm kamoni)"),
                    ("b", "Nuqtalar o‘rniga mos keluvchi javobni yozing: Chochning ... (b)", "sopol idish (sopol idishlar / idish)"),
                ],
                "explanation": "a) kamon; b) sopol idish.",
            },
            # 42
            {
                "title": "Abulfayzxon davrida o‘zbeklarning mang‘it qabilasi katta siyosiy ta’sirga ega bo‘ldi. Bu boshqa qabila aslzodalarining qat’iy noroziligiga sabab bo‘ldi.",
                "parts": [
                    ("a", "Bunday holatdan norozi bo‘lib, mustaqillikni da’vo qilgan shaxs qaysi hudud hokimlari bilan til biriktirib harakat qilgan?", "Urgut va Miyonqol (Urgut, Miyonqol)"),
                    ("b", "Ushbu shaxs olgan unvonning nomini yozing.", "amir ul-umaro (Amirul umaro / amir-ul-umaro)"),
                ],
                "explanation": "a) Urgut va Miyonqol; b) amir ul-umaro (Muhammad Rahim olgan unvon).",
            },
            # 43
            {
                "title": "Rossiya imperiyasi 1864-1885-yillar davomida O‘rta Osiyo hududining katta qismini bosib olib, mustamlakaga aylantirdi.",
                "parts": [
                    ("a", "Rossiya imperiyasi va Buxoro amirligi qo’shinlari o’rtasidagi birinchi jang qaysi hududda bo’lgan?", "Erjar (Yerjar / Erjar qishlog‘i)"),
                    ("b", "Ushbu harbiy harakatlarga rahbarlik qilgan rus generalini yozing.", "Romanovskiy (general Romanovskiy)"),
                ],
                "explanation": "a) Erjar (1866-yil 8-may); b) general Romanovskiy.",
            },
            # 44
            {
                "title": "O‘rta Osiyoda milliy-hududiy chegaralanish o‘tkazilgandan so‘ng 1925–1929-yillarda yer-suv islohotining ikkinchi bosqichi amalga oshirildi.",
                "parts": [
                    ("a", "Ushbu islohot davomida butunlay tugatilishi nazarda tutilgan qatlam rasmiy hujjatlarda qanday nom bilan yuritilgan?", "quloqlar – mushtumzo‘rlar (quloqlar / mushtumzo'rlar / quloq)"),
                    ("b", "Ushbu islohotning yakuniy bosqichida O’zbekiston SSR Xalq komissarlari raisi lavozimida ishlagan shaxsni yozing.", "Fayzulla Xo‘jayev (Fayzulla Xojayev)"),
                ],
                "explanation": "a) quloqlar – mushtumzo‘rlar; b) Fayzulla Xo‘jayev.",
            },
            # 45
            {
                "title": "Xiva xonligida barcha yerlar davlat mulki sanalgan.",
                "parts": [
                    ("a", "Xonlikda xususiy yerini ijaraga oluvchilar qanday nomlangan?", "koranda (korandalar)"),
                    ("b", "Yirik martabali amaldorlarga davlat oldidagi xizmatlari uchun qanday yerlar berilgan?", "tarxon yerlari (tarxon)"),
                ],
                "explanation": "a) koranda; b) tarxon yerlari.",
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
            self.stdout.write(f"  [{i:02d}] Ochiq savol qo'shildi: {item['title'][:40]}...")

        # ── 7. Barcha savollarni test to'plamiga biriktirish ────────────────
        test_set.questions.set(questions)
        test_set.question_order = [q.id for q in questions]
        test_set.save(update_fields=["question_order"])

        self.stdout.write(
            self.style.SUCCESS(
                f"\n🎉 TABRIKLAYMIZ! '{MOCK_TITLE}' muvaffaqiyatli saqlandi!\n"
                f"   • TestSet ID     : {test_set.id}\n"
                f"   • Fan            : {subject.name}\n"
                f"   • Kategoriya     : Milliy Sertifikat (certificate)\n"
                f"   • Mualliflar     : Zaxiriddin Jumanazarov, Bahrom Hikmatov, Husanboy Xoldorov\n"
                f"   • Savollar soni  : {test_set.questions.count()} ta (35 test + 10 yozma ochiq savol)\n"
                f"   • Davomiyligi    : {test_set.duration_minutes} daqiqa\n"
                f"   • Nashr holati   : is_published=False (Qoralama/yopiq holatda)\n"
            )
        )
