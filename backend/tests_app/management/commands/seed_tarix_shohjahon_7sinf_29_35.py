"""Django management command: Sodiqov Shohjahon ustozning 7-sinf Jahon Tarixi Milliy Sertifikat mock testini yaratish.

Mavzu: 29–35-mavzular: Rus knyazliklari, mo’g’ullarga qarshi kurash, Yevropa madaniyati, Saljuqiylar, Usmonli turklar davlati.
35 ta test topshirig'i (A, B, C, D) va 10 ta yozma (ochiq) savol. Jami: 45 ta topshiriq.
Barcha diagrammalar, jadvallar, Eyler-Venn sxemalari va xronologik mosliklar birga-bir aniqlikda joylangan.

Muallif/O'qituvchi: shohjahon (Sodiqov Shohjahon, @TarixMilliyCertificate)
Nashr holati: is_published=False (qoralama).

Foydalanish:
    python manage.py seed_tarix_shohjahon_7sinf_29_35
    python manage.py seed_tarix_shohjahon_7sinf_29_35 --force
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from django.contrib.auth.models import User

from accounts.models import Profile, ensure_profile_for_user
from tests_app.models import Subject, TestSet, Question, AnswerOption, SubQuestion


MOCK_TITLE = "7-sinf Jahon Tarixi — Milliy Sertifikat (29–35-mavzular) | Shohjahon"
MOCK_DESC = (
    "29–35-mavzular: Rus knyazliklari, mo’g’ullarga qarshi kurash, Yevropa madaniyati, Saljuqiylar, Usmonli turklar davlati. "
    "35 ta test topshirig'i (A, B, C, D) va 10 ta yozma (ochiq) savol. Jami: 45 ta topshiriq. "
    "Muallif: Sodiqov Shohjahon (@TarixMilliyCertificate)."
)


class Command(BaseCommand):
    help = "Sodiqov Shohjahon ustoz nomidan 7-sinf Jahon Tarixi (29-35-mavzular) 45 talik Milliy Sertifikat testini yuklaydi."

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
                        f"Qayta yuklash uchun: python manage.py seed_tarix_shohjahon_7sinf_29_35 --force"
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
                "explanation": "Konstantinopolni Usmonli sultoni Mehmet II 1453-yilda egallagan, Ivan Kalita esa Moskva knyazi bo’lgan.",
                "options": [
                    ("A", "Aleksandr Nevskiy — 1240-yilda Neva jangida g’olib chiqqan", False),
                    ("B", "Dmitriy Donskoy — Kulikovo jangida g’olib chiqqan", False),
                    ("C", "Ivan Kalita — Konstantinopolni egallagan", True),
                    ("D", "Ivan III — 1480-yilda Oltin O’rdaga bo’ysunishdan bosh tortdirgan", False),
                ],
            },
            # 2
            {
                "body": (
                    "<p>Quyidagi hukmdorlar va ular bilan bog’liq ma’lumotlar mos ravishda berilgan javobni aniqlang.</p>"
                    "<div style='display:grid;grid-template-columns:repeat(auto-fit, minmax(240px, 1fr));gap:12px;margin:14px 0;'>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;'>"
                    "<b>1)</b> Aleksandr Nevskiy<br/>"
                    "<b>2)</b> Dmitriy Donskoy<br/>"
                    "<b>3)</b> Alp Arslon<br/>"
                    "<b>4)</b> Mehmet II"
                    "</div>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;'>"
                    "<b>a)</b> 1071-yilda Mansikert jangida g’olib chiqqan<br/>"
                    "<b>b)</b> 1240-yilda Neva jangida g’olib chiqqan<br/>"
                    "<b>c)</b> 1453-yilda Konstantinopolni egallagan<br/>"
                    "<b>d)</b> 1380-yilda Kulikovo jangida g’olib chiqqan"
                    "</div>"
                    "</div>"
                ),
                "explanation": "1-b (Aleksandr Nevskiy — Neva), 2-d (Dmitriy Donskoy — Kulikovo), 3-a (Alp Arslon — Mansikert), 4-c (Mehmet II — Konstantinopol).",
                "options": [
                    ("A", "1-b; 2-d; 3-a; 4-c", True),
                    ("B", "1-a; 2-b; 3-c; 4-d", False),
                    ("C", "1-b; 2-a; 3-d; 4-c", False),
                    ("D", "1-c; 2-a; 3-b; 4-d", False),
                ],
            },
            # 3
            {
                "body": "<p>Moskva shahriga nomini bergan qo’rg’onni aniqlang.</p>",
                "explanation": "Moskva daryosi bo'yidagi dastlabki qo'rg'on Kuchkovo deb atalgan.",
                "options": [
                    ("A", "Kuchkovo qo’rg’oni", True),
                    ("B", "Saroy Botu", False),
                    ("C", "Vladimir qal’asi", False),
                    ("D", "Suzdal qal’asi", False),
                ],
            },
            # 4
            {
                "body": (
                    "<p>Quyidagi voqealar to’g’ri xronologik ketma-ketlikda ko’rsatilgan javobni toping.</p>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;margin:12px 0;'>"
                    "1) Lyubech syezdi (1097)<br/>"
                    "2) Mo’g’ullar Rus yerlariga bostirib kirdi (1223)<br/>"
                    "3) Neva jangi (1240)<br/>"
                    "4) Chud ko’lidagi jang (1242)<br/>"
                    "5) Kulikovo jangi (1380)<br/>"
                    "6) Moskva Oltin O’rdaga bo’ysunmadi (1480)"
                    "</div>"
                ),
                "explanation": "Lyubech (1097) -> Mo'g'ullar bosqini (1223) -> Neva (1240) -> Chud (1242) -> Kulikovo (1380) -> Oltin O'rdaga bo'ysunmaslik (1480).",
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
                    "<p>Quyida berilgan shaxslar va ular bilan bog’liq voqealar to’g’ri moslashtirilgan javobni toping.</p>"
                    "<div style='display:grid;grid-template-columns:repeat(auto-fit, minmax(240px, 1fr));gap:12px;margin:14px 0;'>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;'>"
                    "<b>I.</b> Vladimir Monomax<br/>"
                    "<b>II.</b> Yuriy Dolgorukiy<br/>"
                    "<b>III.</b> Ivan Kalita<br/>"
                    "<b>IV.</b> Marko Polo"
                    "</div>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;'>"
                    "<b>a)</b> 1097-yilda knyazlar syezdini chaqirgan<br/>"
                    "<b>b)</b> Moskvaga asos solgan<br/>"
                    "<b>c)</b> Tver bilan kurashda g’olib chiqqan<br/>"
                    "<b>d)</b> Xitoyga sayohat qilgan venetsiyalik"
                    "</div>"
                    "</div>"
                ),
                "explanation": "Vladimir Monomax — Lyubech syezdi; Yuriy Dolgorukiy — Moskva asoschisi; Ivan Kalita — Tver bilan kurash; Marko Polo — sayyoh.",
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
                    "<p>Quyida berilgan me’moriy uslublar va ularning izohi to’g’ri moslashtirilgan javobni toping.</p>"
                    "<div style='display:grid;grid-template-columns:repeat(auto-fit, minmax(240px, 1fr));gap:12px;margin:14px 0;'>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;'>"
                    "<b>I.</b> Roman uslubi<br/>"
                    "<b>II.</b> Gotika uslubi<br/>"
                    "<b>III.</b> Vizantiya uslubi<br/>"
                    "<b>IV.</b> Arab uslubi"
                    "</div>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;'>"
                    "<b>a)</b> X-XII/XIII asrlarda hukm surgan, Rim unsurlaridan foydalangan<br/>"
                    "<b>b)</b> XII asr o’rtasidan yuzaga kelgan, baland uchli gumbazlar<br/>"
                    "<b>c)</b> Avliyo Mark ibodatxonasi, Dojlar saroyi kabi inshootlar<br/>"
                    "<b>d)</b> Al-Hamro saroyi, Al-Qasar qasri kabi inshootlar"
                    "</div>"
                    "</div>"
                ),
                "explanation": "Roman — Rim unsurlari; Gotika — baland gumbaz; Vizantiya — Avliyo Mark; Arab — Al-Hamro.",
                "options": [
                    ("A", "I-a, II-b, III-c, IV-d", True),
                    ("B", "I-b, II-a, III-c, IV-d", False),
                    ("C", "I-a, II-c, III-b, IV-d", False),
                    ("D", "I-a, II-b, III-d, IV-c", False),
                ],
            },
            # 7
            {
                "body": "<p>Tarixiy shaxsni aniqlang. Novgorod knyazi. 1240-yilda Neva daryosida shvedlarni, 1242-yilda Chud ko’lida nemis ritsarlarini mag’lub etgan.</p>",
                "explanation": "Aleksandr Nevskiy — 1240-yilda Neva jangi va 1242-yilda Chud ko'lidagi 'Muz ustidagi jang'da zafar quchgan.",
                "options": [
                    ("A", "Aleksandr Nevskiy", True),
                    ("B", "Yuriy Dolgorukiy", False),
                    ("C", "Dmitriy Donskoy", False),
                    ("D", "Ivan Kalita", False),
                ],
            },
            # 8
            {
                "body": "<p>Tarixiy shaxsni aniqlang. 1380-yilda Kulikovo maydonida Oltin O’rda tumanboshisi Mamayni mag’lub etgan Moskva knyazi.</p>",
                "explanation": "Dmitriy Donskoy 1380-yilda Kulikovo maydonida Mamay boshchiligidagi Oltin O'rda qo'shinlarini mag'lub etgan.",
                "options": [
                    ("A", "Dmitriy Donskoy", True),
                    ("B", "Ivan Kalita", False),
                    ("C", "Ivan III", False),
                    ("D", "Vladimir Monomax", False),
                ],
            },
            # 9
            {
                "body": "<p>Tarixiy hodisani aniqlang. 1071-yilda Vizantiya imperatori Roman IV Diogen asirga olingan, saljuqiylar g’olib chiqqan jang.</p>",
                "explanation": "1071-yilda Mansikert jangida Alp Arslon boshchiligidagi saljuqiylar Vizantiyani tor-mor etgan va imperator Roman Diogenni asir olgan.",
                "options": [
                    ("A", "Mansikert jangi", True),
                    ("B", "Anqara jangi", False),
                    ("C", "Kulikovo jangi", False),
                    ("D", "Chud ko’lidagi jang", False),
                ],
            },
            # 10
            {
                "body": "<p>Tarixiy shaxsni aniqlang. 1402-yilda Anqara jangida Amir Temur tomonidan mag’lub etilib, asirga olingan Usmonli sultoni.</p>",
                "explanation": "1402-yil Anqara jangida Amir Temur Usmonli sultoni Boyazid Yildirimni mag'lub etgan va asir olgan.",
                "options": [
                    ("A", "Boyazid Yildirim", True),
                    ("B", "Mehmet II", False),
                    ("C", "Usmon I", False),
                    ("D", "O’rxon", False),
                ],
            },
            # 11
            {
                "body": (
                    "<p>Quyidagi shaxslardan qaysilari Rus knyazliklariga tegishli?</p>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;margin:12px 0;'>"
                    "1) Vladimir Monomax<br/>"
                    "2) Yuriy Dolgorukiy<br/>"
                    "3) Ivan Kalita<br/>"
                    "4) Alp Arslon<br/>"
                    "5) Usmon I<br/>"
                    "6) Boyazid"
                    "</div>"
                ),
                "explanation": "Alp Arslon Saljuqiylar, Usmon I va Boyazid Usmonlilar sultonlari. 1, 2, 3 esa Rus knyazlari.",
                "options": [
                    ("A", "1, 2, 3", True),
                    ("B", "4, 5, 6", False),
                    ("C", "1, 3, 5", False),
                    ("D", "2, 4, 6", False),
                ],
            },
            # 12
            {
                "body": "<p>1445-yilda kitob bosish dastgohini kashf qilgan nemis muhandisini aniqlang.</p>",
                "explanation": "Iogann Gutenberg 1445-yilda harakatlanuvchi harflar asosida kitob bosish dastgohini ixtiro qilgan.",
                "options": [
                    ("A", "Iogann Gutenberg", True),
                    ("B", "Rojer Bekon", False),
                    ("C", "Marko Polo", False),
                    ("D", "Rober de Sorbon", False),
                ],
            },
            # 13
            {
                "body": "<p>XIII-XIV asrlar Rus knyazliklari uchun xos bo’lgan holatni aniqlang.</p>",
                "explanation": "XIII-XIV asrlarda Rus knyazliklarida mo'g'ullar hukmronligiga qarshi kurash hamda Moskva atrofida markazlashuv jarayoni kechgan.",
                "options": [
                    ("A", "Mo’g’ullar hukmronligiga qarshi kurash va markazlashish jarayoni davom etdi", True),
                    ("B", "Rus yerlari yagona markazlashgan davlat edi", False),
                    ("C", "Mo’g’ullar hech qanday ta’sir ko’rsatmadi", False),
                    ("D", "Yozuv umuman mavjud emas edi", False),
                ],
            },
            # 14
            {
                "body": (
                    "<p>Quyidagi shaharlardan qaysilarida dastlabki universitetlar tashkil etilgan?</p>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;margin:12px 0;'>"
                    "1) Bolonya<br/>"
                    "2) Parij<br/>"
                    "3) Oksford<br/>"
                    "4) Konstantinopol<br/>"
                    "5) Bag’dod<br/>"
                    "6) Buxoro"
                    "</div>"
                ),
                "explanation": "Yevropadagi dastlabki universitetlar Bolonya, Parij va Oksford shaharlarida tashkil etilgan.",
                "options": [
                    ("A", "1, 2, 3", True),
                    ("B", "4, 5, 6", False),
                    ("C", "1, 3, 5", False),
                    ("D", "2, 4, 6", False),
                ],
            },
            # 15
            {
                "body": "<p>Usmonlilar davlatiga kim asos solgan?</p>",
                "explanation": "1299-yilda Kichik Osiyoning shimoli-g'arbida Usmon I mustaqil Usmonli turklar bekligiga asos solgan.",
                "options": [
                    ("A", "Usmon I", True),
                    ("B", "O’rxon", False),
                    ("C", "Boyazid", False),
                    ("D", "Mehmet II", False),
                ],
            },
            # 16
            {
                "body": (
                    "<p>Quyidagi voqealar to’g’ri xronologik ketma-ketlikda ko’rsatilgan javobni toping.</p>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;margin:12px 0;'>"
                    "1) Saljuqiylar davlati tashkil topdi (1038)<br/>"
                    "2) Mansikert jangi (1071)<br/>"
                    "3) Usmonlilar davlati tashkil topdi (1299)<br/>"
                    "4) Boyazid hukmronligi boshlandi (1389)<br/>"
                    "5) Anqara jangi (1402)<br/>"
                    "6) Konstantinopol qulashi (1453)"
                    "</div>"
                ),
                "explanation": "1038 -> 1071 -> 1299 -> 1389 -> 1402 -> 1453.",
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
                    "<p>Sxematik diagrammada Rus knyazliklarining mo’g’ullarga qarshi kurashidagi uch muhim voqea ko’rsatilgan.</p>"
                    "<p><b>1–3 raqamlaridan qaysi biri Kulikovo jangiga to’g’ri keladi?</b></p>"
                    "<div style='max-width:320px;margin:16px auto;display:flex;flex-direction:column;gap:10px;'>"
                    "<div style='border:2px solid #3b82f6;background:rgba(59,130,246,0.06);border-radius:8px;padding:12px;text-align:center;font-weight:bold;font-size:15px;color:#1e3a8a;'>1 — 1240-yil</div>"
                    "<div style='text-align:center;color:#94a3b8;font-size:18px;margin:-6px 0;'>↓</div>"
                    "<div style='border:2px solid #3b82f6;background:rgba(59,130,246,0.06);border-radius:8px;padding:12px;text-align:center;font-weight:bold;font-size:15px;color:#1e3a8a;'>2 — 1242-yil</div>"
                    "<div style='text-align:center;color:#94a3b8;font-size:18px;margin:-6px 0;'>↓</div>"
                    "<div style='border:2px solid #3b82f6;background:rgba(59,130,246,0.06);border-radius:8px;padding:12px;text-align:center;font-weight:bold;font-size:15px;color:#1e3a8a;'>3 — 1380-yil</div>"
                    "</div>"
                ),
                "explanation": "Kulikovo jangi 1380-yilda (3-band) bo’lib o’tgan, Dmitriy Donskoy Mamayni mag’lub etgan.",
                "options": [
                    ("A", "3", True),
                    ("B", "1", False),
                    ("C", "2", False),
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
                    "<th style='padding:8px;border:1px solid #cbd5e1;width:42%;'>Voqea</th>"
                    "<th style='padding:8px;border:1px solid #cbd5e1;'>Natija</th>"
                    "</tr>"
                    "</thead>"
                    "<tbody>"
                    "<tr><td style='padding:8px;border:1px solid #cbd5e1;text-align:center;font-weight:bold;'>1</td><td style='padding:8px;border:1px solid #cbd5e1;'>Lyubech syezdi (1097)</td><td style='padding:8px;border:1px solid #cbd5e1;'>Har bir knyaz o’z yeriga egalik qilishi belgilandi</td></tr>"
                    "<tr><td style='padding:8px;border:1px solid #cbd5e1;text-align:center;font-weight:bold;'>2</td><td style='padding:8px;border:1px solid #cbd5e1;'>Aleksandr Nevskiyning g’alabalari</td><td style='padding:8px;border:1px solid #cbd5e1;'>Rus yerlari g’arbiy bosqinchilardan himoyalandi</td></tr>"
                    "<tr><td style='padding:8px;border:1px solid #cbd5e1;text-align:center;font-weight:bold;'>3</td><td style='padding:8px;border:1px solid #cbd5e1;'>Amir Temurning Oltin O’rdaga qarshi janglari</td><td style='padding:8px;border:1px solid #cbd5e1;'>Rus yerlarining mo’g’ullardan ozod bo’lishiga yordam berdi</td></tr>"
                    "<tr><td style='padding:8px;border:1px solid #cbd5e1;text-align:center;font-weight:bold;'>4</td><td style='padding:8px;border:1px solid #cbd5e1;'>Mansikert jangi (1071)</td><td style='padding:8px;border:1px solid #cbd5e1;'>Vizantiya turkiy qabilalarni butunlay mag’lub etdi</td></tr>"
                    "<tr><td style='padding:8px;border:1px solid #cbd5e1;text-align:center;font-weight:bold;'>5</td><td style='padding:8px;border:1px solid #cbd5e1;'>Konstantinopolning qulashi (1453)</td><td style='padding:8px;border:1px solid #cbd5e1;'>Usmonlilar imperiyasi poytaxtga ega bo’ldi</td></tr>"
                    "<tr><td style='padding:8px;border:1px solid #cbd5e1;text-align:center;font-weight:bold;'>6</td><td style='padding:8px;border:1px solid #cbd5e1;'>Ivan III ning siyosati (1480)</td><td style='padding:8px;border:1px solid #cbd5e1;'>Mo’g’ullar hukmronligi Rus yerlarida yanada mustahkamlandi</td></tr>"
                    "</tbody>"
                    "</table>"
                    "</div>"
                ),
                "explanation": "4 xato: aksincha, Vizantiya mag’lub bo’ldi. 6 xato: aksincha, mo’g’ullar hukmronligi tugadi.",
                "options": [
                    ("A", "1, 2, 3, 5", True),
                    ("B", "2, 4, 5, 6", False),
                    ("C", "1, 3, 4, 6", False),
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
                    "<th style='padding:8px;border:1px solid #cbd5e1;width:40%;'>Rus yerlari voqeasi</th>"
                    "<th style='padding:8px;border:1px solid #cbd5e1;'>Yaqin Sharq voqeasi</th>"
                    "</tr>"
                    "</thead>"
                    "<tbody>"
                    "<tr><td style='padding:8px;border:1px solid #cbd5e1;font-weight:bold;'>XI asr</td><td style='padding:8px;border:1px solid #cbd5e1;background:rgba(59,130,246,0.08);text-align:center;font-weight:bold;color:#1d4ed8;'>a</td><td style='padding:8px;border:1px solid #cbd5e1;'>Mansikert jangi (1071)</td></tr>"
                    "<tr><td style='padding:8px;border:1px solid #cbd5e1;font-weight:bold;'>XV asr</td><td style='padding:8px;border:1px solid #cbd5e1;'>Moskva mustaqillikka erishdi (1480)</td><td style='padding:8px;border:1px solid #cbd5e1;background:rgba(59,130,246,0.08);text-align:center;font-weight:bold;color:#1d4ed8;'>b</td></tr>"
                    "</tbody>"
                    "</table>"
                    "</div>"
                    "<div style='font-size:12.5px;color:#334155;background:rgba(100,116,139,0.05);padding:10px;border-radius:6px;border:1px solid #cbd5e1;margin-top:8px;'>"
                    "<b>Ma’lumotlar:</b> 1) Lyubech syezdi (1097); 2) Konstantinopol qulashi (1453); 3) Rim imperiyasi qulashi (476); 4) Amir Temur tug’ildi (1336)."
                    "</div>"
                ),
                "explanation": "a=1: Lyubech syezdi 1097-yilda (XI asr) bo’ldi. b=2: Konstantinopol 1453-yilda (XV asr) qulagan.",
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
                    "<p>Quyida berilgan ma’lumotlarni tahlil qilib <b>Eyler-Venn diagrammasiga</b> mos keladigan javoblarni aniqlang. <i>(Saljuqiylar va Usmonli turklar davlati)</i></p>"
                    "<div style='display:flex;justify-content:center;margin:16px 0;'>"
                    "<svg width='340' height='180' viewBox='0 0 340 180' style='max-width:100%;'>"
                    "<circle cx='120' cy='90' r='75' fill='rgba(59, 130, 246, 0.15)' stroke='#3b82f6' stroke-width='2'/>"
                    "<circle cx='220' cy='90' r='75' fill='rgba(16, 185, 129, 0.15)' stroke='#10b981' stroke-width='2'/>"
                    "<text x='85' y='75' font-size='16' font-weight='bold' fill='#1e40af' text-anchor='middle'>I</text>"
                    "<text x='85' y='95' font-size='12' fill='#1e3a8a' text-anchor='middle'>Saljuqiylar</text>"
                    "<text x='170' y='85' font-size='16' font-weight='bold' fill='#4338ca' text-anchor='middle'>III</text>"
                    "<text x='255' y='75' font-size='16' font-weight='bold' fill='#065f46' text-anchor='middle'>II</text>"
                    "<text x='255' y='95' font-size='12' fill='#064e3b' text-anchor='middle'>Usmonlilar</text>"
                    "</svg>"
                    "</div>"
                    "<div style='font-size:12.5px;color:#334155;line-height:1.7;background:rgba(100,116,139,0.05);padding:12px;border-radius:8px;border:1px solid #cbd5e1;'>"
                    "<b>a)</b> Turkiy sulola boshqargan;<br/>"
                    "<b>b)</b> Kichik Osiyoda tashkil topgan;<br/>"
                    "<b>c)</b> Vizantiyaga qarshi kurashgan;<br/>"
                    "<b>d)</b> 1038-yilda tashkil topgan;<br/>"
                    "<b>e)</b> 1299-yilda tashkil topgan;<br/>"
                    "<b>f)</b> XIV asrda parchalanib ketgan."
                    "</div>"
                ),
                "explanation": "I (faqat Saljuqiylar): 1038-yilda tashkil topgan, XIV asrda parchalangan. II (faqat Usmonlilar): 1299-yilda tashkil topgan. III (umumiy): turkiy sulola, Kichik Osiyo, Vizantiyaga qarshi kurash.",
                "options": [
                    ("A", "I-d,f; II-e; III-a,b,c", True),
                    ("B", "I-e; II-d,f; III-a,b,c", False),
                    ("C", "I-d; II-e,f; III-a,b,c", False),
                    ("D", "I-d,f; II-a,e; III-b,c", False),
                ],
            },
            # 21
            {
                "body": (
                    "<p>Quyidagi shaxslar va ularning ishlari to’g’ri moslashtirilgan javobni toping.</p>"
                    "<div style='display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:12px;margin:14px 0;'>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;'>"
                    "<b>1)</b> To’g’rulbek<br/>"
                    "<b>2)</b> Usmon I<br/>"
                    "<b>3)</b> Mehmet II"
                    "</div>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;'>"
                    "<b>a)</b> Saljuqiylar davlatiga asos solgan<br/>"
                    "<b>b)</b> Usmonlilar davlatiga asos solgan<br/>"
                    "<b>c)</b> Konstantinopolni egallagan"
                    "</div>"
                    "</div>"
                ),
                "explanation": "1-a (To'g'rulbek — Saljuqiylar), 2-b (Usmon I — Usmonlilar), 3-c (Mehmet II — Konstantinopol).",
                "options": [
                    ("A", "1-a; 2-b; 3-c", True),
                    ("B", "1-b; 2-a; 3-c", False),
                    ("C", "1-c; 2-a; 3-b", False),
                    ("D", "1-a; 2-c; 3-b", False),
                ],
            },
            # 22
            {
                "body": "<p>O’rxon davrida ta’sis etilgan, davlat boshqaruvidagi yangi lavozimni aniqlang.</p>",
                "explanation": "Usmonlilar davlatida vazir lavozimi sulton O'rxon davrida ta'sis etilgan.",
                "options": [
                    ("A", "Vazir", True),
                    ("B", "Sherif", False),
                    ("C", "Devonbegi", False),
                    ("D", "Amir", False),
                ],
            },
            # 23
            {
                "body": "<p>Rojer Bekon fandagi yutuqlarga qanday yo’l bilan erishish mumkinligini isbotlagan?</p>",
                "explanation": "Rojer Bekon fanda ilmiy kuzatishlar va tajribalar orqali haqiqatga erishish mumkinligini isbotlagan.",
                "options": [
                    ("A", "Ilmiy kuzatishlar va tajribalar", True),
                    ("B", "Faqat kitob o’qish orqali", False),
                    ("C", "Faqat cherkov ta’limotiga amal qilib", False),
                    ("D", "Faqat sayohat qilish orqali", False),
                ],
            },
            # 24
            {
                "body": (
                    "<p>Quyidagi inshootlardan qaysilari gotika uslubida qurilgan?</p>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;margin:12px 0;'>"
                    "1) Reyms ibodatxonasi<br/>"
                    "2) Shartr ibodatxonasi<br/>"
                    "3) Parijdagi Bibi Maryam ibodatxonasi<br/>"
                    "4) Laax monastiri<br/>"
                    "5) Al-Hamro saroyi<br/>"
                    "6) Avliyo Mark ibodatxonasi"
                    "</div>"
                ),
                "explanation": "Laax monastiri roman uslubida, Al-Hamro arab uslubida, Avliyo Mark vizantiya uslubida qurilgan. 1, 2, 3 gotika uslubiga mansub.",
                "options": [
                    ("A", "1, 2, 3", True),
                    ("B", "4, 5, 6", False),
                    ("C", "1, 3, 5", False),
                    ("D", "2, 4, 6", False),
                ],
            },
            # 25
            {
                "body": "<p>Novgorod respublikasida siyosiy hayotda asosiy o’rinni kim egallagan?</p>",
                "explanation": "Novgorodda oliy boshqaruv xalq vechesi, saylanadigan posadnik (shahar hokimi) va yepiskop qo'lida bo'lgan.",
                "options": [
                    ("A", "Xalq vechesi, shahar hokimi va yepiskop", True),
                    ("B", "Faqat knyaz", False),
                    ("C", "Faqat cherkov", False),
                    ("D", "Faqat harbiylar", False),
                ],
            },
            # 26
            {
                "body": "<p>Saljuqiylar davlatida xizmat evaziga, faqat xizmat muddatida foydalanish shartida berilgan yerni aniqlang.</p>",
                "explanation": "Saljuqiylarda harbiy xizmat evaziga beriladigan shartli yer-mulk 'iqto'' deb atalgan.",
                "options": [
                    ("A", "Iqto’", True),
                    ("B", "Domen", False),
                    ("C", "Fief", False),
                    ("D", "Benefitsiy", False),
                ],
            },
            # 27
            {
                "body": "<p>O’zaro muvofiqlik <b>SAQLANMAGAN</b> javobni toping.</p>",
                "explanation": "Alp Arslon Mansikert jangida (1071) g’olib chiqqan, Kulikovo jangida esa Dmitriy Donskoy g’olib chiqqan.",
                "options": [
                    ("A", "Vladimir Monomax — Lyubech syezdini chaqirgan", False),
                    ("B", "Yuriy Dolgorukiy — Moskvaga asos solgan", False),
                    ("C", "Alp Arslon — Kulikovo jangida g’olib chiqqan", True),
                    ("D", "Dmitriy Donskoy — Kulikovo jangida g’olib chiqqan", False),
                ],
            },
            # 28
            {
                "body": "<p>Parij universitetiga asos solgan ruhoniyni aniqlang.</p>",
                "explanation": "Rober de Sorbon XIII asrda Parij universitetida kollej ochib, uning rivojiga asos solgan.",
                "options": [
                    ("A", "Rober de Sorbon", True),
                    ("B", "Rojer Bekon", False),
                    ("C", "Iogann Gutenberg", False),
                    ("D", "Marko Polo", False),
                ],
            },
            # 29
            {
                "body": (
                    "<p>Quyida berilgan ma’lumotlarga mos yakuniy xulosalar (to’g’ri/noto’g’ri) keltirilgan javobni aniqlang.</p>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;margin:12px 0;'>"
                    "I. Universitetlar mahalliy hukmdorlarga to’liq bo’ysungan.<br/>"
                    "II. Gutenberg ixtirosi kitobni ommaviy tarqalishiga olib keldi.<br/>"
                    "III. Saljuqiylar davlatida davlat yerlari xususiy yerlarga nisbatan ko’proq bo’lgan."
                    "</div>"
                ),
                "explanation": "I noto’g’ri — universitetlar ko’plab imtiyozlarga ega bo’lib, mahalliy hukmdorlarga bo’ysunmagan. II to’g’ri. III to’g’ri.",
                "options": [
                    ("A", "I-noto’g’ri; II-to’g’ri; III-to’g’ri", True),
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
                    "<b>1)</b> Ivan Kalita<br/>"
                    "<b>2)</b> Dmitriy Donskoy<br/>"
                    "<b>3)</b> Ivan III"
                    "</div>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;'>"
                    "<b>a)</b> Tver bilan kurashda g’olib chiqqan<br/>"
                    "<b>b)</b> Kulikovo jangida g’olib chiqqan<br/>"
                    "<b>c)</b> Oltin O’rdaga bo’ysunishdan bosh tortgan"
                    "</div>"
                    "</div>"
                ),
                "explanation": "1-a (Ivan Kalita — Tver bilan kurash), 2-b (Dmitriy Donskoy — Kulikovo), 3-c (Ivan III — Oltin O'rda bo'yinturug'ini tugatish).",
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
                    "<p>Universitetlar va ularning joylashgan mamlakatlarini to’g’ri moslashtiring.</p>"
                    "<div style='display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:12px;margin:14px 0;'>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;'>"
                    "<b>1)</b> Bolonya<br/>"
                    "<b>2)</b> Parij<br/>"
                    "<b>3)</b> Oksford"
                    "</div>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;'>"
                    "<b>a)</b> Italiya<br/>"
                    "<b>b)</b> Fransiya<br/>"
                    "<b>c)</b> Angliya"
                    "</div>"
                    "</div>"
                ),
                "explanation": "1-a (Bolonya — Italiya), 2-b (Parij — Fransiya), 3-c (Oksford — Angliya).",
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
                    "<p>Quyidagi shaxslardan qaysilari Usmonlilar davlatiga tegishli?</p>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.8;margin:12px 0;'>"
                    "1) Usmon I<br/>"
                    "2) O’rxon<br/>"
                    "3) Boyazid Yildirim<br/>"
                    "4) To’g’rulbek<br/>"
                    "5) Alp Arslon<br/>"
                    "6) Malikshoh"
                    "</div>"
                ),
                "explanation": "To’g’rulbek, Alp Arslon va Malikshoh Saljuqiylar sultonlari. Usmon I, O'rxon va Boyazid Yildirim esa Usmonli hukmdorlari.",
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
                    "<b>A)</b> Lyubech syezdi (1097)<br/>"
                    "<b>B)</b> Mansikert jangi (1071)<br/>"
                    "<b>C)</b> Kulikovo jangi (1380)<br/>"
                    "<b>D)</b> Anqara jangi (1402)<br/>"
                    "<b>E)</b> Konstantinopol qulashi (1453)<br/>"
                    "<b>F)</b> Moskva Oltin O’rdaga bo’ysunmadi (1480)"
                    "</div>"
                    "<p><b>Berilgan voqealardan qaysi biri eng avval sodir bo’lgan?</b></p>"
                ),
                "explanation": "1071-yil — ro’yxatdagi eng qadimgi sana (Mansikert jangi).",
                "options": [
                    ("A", "A", False),
                    ("B", "B", True),
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
                    "<b>A)</b> Lyubech syezdi (1097)<br/>"
                    "<b>B)</b> Mansikert jangi (1071)<br/>"
                    "<b>C)</b> Kulikovo jangi (1380)<br/>"
                    "<b>D)</b> Anqara jangi (1402)<br/>"
                    "<b>E)</b> Konstantinopol qulashi (1453)<br/>"
                    "<b>F)</b> Moskva Oltin O’rdaga bo’ysunmadi (1480)"
                    "</div>"
                    "<p><b>Usmonlilar imperiyasi tashkil topishining yakunlanishiga olib kelgan voqeani aniqlang.</b></p>"
                ),
                "explanation": "Konstantinopol qulashi (1453) Usmonlilar imperiyasi tashkil topishini yakunlagan.",
                "options": [
                    ("A", "A", False),
                    ("B", "B", False),
                    ("C", "C", False),
                    ("D", "D", False),
                    ("E", "E", True),
                    ("F", "F", False),
                ],
            },
            # 35 (BANK)
            {
                "body": (
                    "<div style='border:1px solid #3b82f6;border-radius:10px;padding:12px;background:rgba(59,130,246,0.05);margin-bottom:14px;font-size:13px;line-height:1.7;'>"
                    "<b>33–35-topshiriqlarga mos javoblarni quyidagi banklardan (A–F) tanlang:</b><br/>"
                    "<b>A)</b> Lyubech syezdi (1097)<br/>"
                    "<b>B)</b> Mansikert jangi (1071)<br/>"
                    "<b>C)</b> Kulikovo jangi (1380)<br/>"
                    "<b>D)</b> Anqara jangi (1402)<br/>"
                    "<b>E)</b> Konstantinopol qulashi (1453)<br/>"
                    "<b>F)</b> Moskva Oltin O’rdaga bo’ysunmadi (1480)"
                    "</div>"
                    "<p><b>Berilgan voqealardan qaysi biri eng keyin sodir bo’lgan?</b></p>"
                ),
                "explanation": "1480-yil — ro’yxatdagi eng so’nggi sana (Moskva Oltin O’rdaga bo’ysunmadi).",
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
                "title": "Rus knyazliklari.",
                "parts": [
                    ("a", "1097-yilgi syezdni chaqirgan knyazni yozing.", "Vladimir Monomax (Monomax / Knyaz Vladimir Monomax)"),
                    ("b", "Syezd o’tkazilgan shaharni yozing.", "Lyubech (Lyubich / Lyubech shahri)"),
                ],
                "explanation": "a) Vladimir Monomax; b) Lyubech.",
            },
            # 37
            {
                "title": "Mo’g’ullarga qarshi kurash.",
                "parts": [
                    ("a", "Neva jangi qaysi yilda bo’lganini yozing.", "1240-yil (1240 / 1240 yil)"),
                    ("b", "”Muz ustida jang” qaysi ko’lda bo’lganini yozing.", "Chud ko'li (Chud / Chud koli / Chud koʻli)"),
                ],
                "explanation": "a) 1240-yil; b) Chud ko'li.",
            },
            # 38
            {
                "title": "Kulikovo jangi.",
                "parts": [
                    ("a", "Jang qaysi yilda bo’lganini yozing.", "1380-yil (1380 / 1380 yil)"),
                    ("b", "G’olib chiqqan Moskva knyazini yozing.", "Dmitriy Donskoy (Donskoy / Dmitriy)"),
                ],
                "explanation": "a) 1380-yil; b) Dmitriy Donskoy.",
            },
            # 39
            {
                "title": "Amir Temur va Oltin O’rda.",
                "parts": [
                    ("a", "Amir Temurning Oltin O’rdaga qarshi ikki jangini yozing.", "Qunduzcha (1391) va Terek (1395) (Qunduzcha va Terek / Qunduzcha, Terek / Qunduzcha hamda Terek)"),
                    ("b", "Moskva mustaqillikka erishgan yilni yozing.", "1480-yil (1480 / 1480 yil)"),
                ],
                "explanation": "a) Qunduzcha (1391) va Terek (1395); b) 1480-yil.",
            },
            # 40
            {
                "title": "Yevropa ta’limi.",
                "parts": [
                    ("a", "Parij universitetiga asos solgan ruhoniyni yozing.", "Rober de Sorbon (Sorbon / Robert de Sorbon)"),
                    ("b", "Kitob bosish dastgohini kashf etgan olimni yozing.", "Iogann Gutenberg (Gutenberg / Iogann Gutenberk)"),
                ],
                "explanation": "a) Rober de Sorbon; b) Iogann Gutenberg.",
            },
            # 41
            {
                "title": "Me’morchilik uslublari.",
                "parts": [
                    ("a", "X-XIII asrlarda hukm surgan uslubni yozing.", "Roman uslubi (Roman / Roman uslub)"),
                    ("b", "XII asrdan yuzaga kelgan, baland gumbazli uslubni yozing.", "Gotika uslubi (Gotika / Gotika uslub)"),
                ],
                "explanation": "a) Roman uslubi; b) Gotika uslubi.",
            },
            # 42
            {
                "title": "Saljuqiylar davlati.",
                "parts": [
                    ("a", "Davlatga asos solgan sultonni yozing.", "To’g’rulbek (To'g'rulbek / Tog'rulbek / Toʻgʻrulbek / Togrulbek / To'g'rul bek)"),
                    ("b", "1071-yilgi jangda g’olib chiqqan sultonni yozing.", "Alp Arslon (Alparslon / Alp Arslan)"),
                ],
                "explanation": "a) To'g'rulbek; b) Alp Arslon.",
            },
            # 43
            {
                "title": "Usmonlilar davlatining tashkil topishi.",
                "parts": [
                    ("a", "Davlatga asos solgan bekni yozing.", "Usmon I (Usmon / Usmon 1 / Usmon bek / Usmon G'ozi)"),
                    ("b", "Vazirlik lavozimini ta’sis etgan hukmdorni yozing.", "O’rxon (Orxon / Oʻrxon / Orhan / O'rxon bek)"),
                ],
                "explanation": "a) Usmon I; b) O'rxon.",
            },
            # 44
            {
                "title": "Anqara jangi.",
                "parts": [
                    ("a", "Jang qaysi yilda bo’lganini yozing.", "1402-yil (1402 / 1402 yil)"),
                    ("b", "Mag’lub bo’lgan Usmonli sultonini yozing.", "Boyazid Yildirim (Boyazid / Boyazid 1 / Boyazid I)"),
                ],
                "explanation": "a) 1402-yil; b) Boyazid Yildirim.",
            },
            # 45
            {
                "title": "Konstantinopolning qulashi.",
                "parts": [
                    ("a", "Shaharni egallagan sultonni yozing.", "Mehmet II (Mehmet 2 / Fotih Mehmet / Fotih sulton Mehmet / Muxammad II / Muhammad II)"),
                    ("b", "Shahar qaysi yangi nom bilan atalganini yozing.", "Istanbul (Istambul / Islambol)"),
                ],
                "explanation": "a) Mehmet II; b) Istanbul.",
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
