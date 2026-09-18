"""Django management command: Sodiqov Shohjahon ustozning 6-sinf Qadimgi Dunyo Tarixi (21–30-mavzular) Milliy Sertifikat mock testini yaratish.

21–30-mavzular: Qadimgi Yunoniston (Afina, Sparta, yunon-fors urushlari, Makedoniya,
madaniyat, olimlar, afsonalar).
35 ta test topshirig'i (A, B, C, D) va 10 ta yozma (ochiq) savol. Jami: 45 ta topshiriq.

Muallif/O'qituvchi: shohjahon (Sodiqov Shohjahon, @TarixMilliyCertificate)

Foydalanish:
    python manage.py seed_tarix_shohjahon_21_30
    python manage.py seed_tarix_shohjahon_21_30 --force
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from django.contrib.auth.models import User

from accounts.models import Profile, ensure_profile_for_user
from tests_app.models import Subject, TestSet, Question, AnswerOption, SubQuestion


MOCK_TITLE = "6-sinf Qadimgi Dunyo Tarixi — Milliy Sertifikat (21–30-mavzular) | Shohjahon"
MOCK_DESC = (
    "21–30-mavzular: Qadimgi Yunoniston (Afina, Sparta, yunon-fors urushlari, Makedoniya, "
    "madaniyat, olimlar, afsonalar). "
    "35 ta test topshirig'i (A, B, C, D) va 10 ta yozma (ochiq) savol. Jami: 45 ta topshiriq. "
    "Ustoz: Sodiqov Shohjahon (@TarixMilliyCertificate)."
)


class Command(BaseCommand):
    help = "Sodiqov Shohjahon ustoz nomidan 6-sinf Tarix (21–30-mavzular) 45 talik Milliy Sertifikat testini yuklaydi."

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
                        f"Qayta yuklash uchun: python manage.py seed_tarix_shohjahon_21_30 --force"
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
                "explanation": "Leonid Sparta podshosi bo'lgan, Fermopil jangida 300 spartalikka boshchilik qilgan. U Makedoniya podshosi emas.",
                "options": [
                    ("A", "Drakont — Afinada juda qattiq qonunlar yozgan", False),
                    ("B", "Solon — Afinada demokratik islohotlar o'tkazgan", False),
                    ("C", "Perikl — 15 marta strateg etib saylangan", False),
                    ("D", "Leonid — Makedoniya podshosi", True),
                ],
            },
            # 2
            {
                "body": (
                    "<p>Quyidagi shaxslar va ular bilan bog'liq ma'lumotlar mos ravishda berilgan javobni aniqlang.</p>"
                    "<div style='display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:12px;margin:14px 0;'>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.7;'>"
                    "<b>1)</b> Drakont<br/>"
                    "<b>2)</b> Solon<br/>"
                    "<b>3)</b> Perikl<br/>"
                    "<b>4)</b> Filipp II"
                    "</div>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.7;'>"
                    "<b>a)</b> Mil.avv. 621-yilda qattiq qonunlar yozgan<br/>"
                    "<b>b)</b> Xeroniya jangida Yunonistonni bosib olgan<br/>"
                    "<b>c)</b> Aristokratiyani demokratiyaga almashtirgan<br/>"
                    "<b>d)</b> «Perikl asri»ga nom bergan, Parfenon qurdirgan"
                    "</div>"
                    "</div>"
                ),
                "explanation": "1-a (Drakont — mil.avv. 621), 2-c (Solon — demokratiya), 3-d (Perikl — Parfenon), 4-b (Filipp II — Xeroniya jangi).",
                "options": [
                    ("A", "1-a; 2-c; 3-d; 4-b", True),
                    ("B", "1-c; 2-a; 3-b; 4-d", False),
                    ("C", "1-a; 2-b; 3-c; 4-d", False),
                    ("D", "1-b; 2-a; 3-d; 4-c", False),
                ],
            },
            # 3
            {
                "body": "<p>Yunon shaharlarining birlashuvidan tashkil topgan shahar-davlat qanday atalgan?</p>",
                "explanation": "Polis — Qadimgi Yunonistondagi mustaqil shahar-davlat bo'lib, o'z qonunlari va boshqaruv tizimiga ega bo'lgan.",
                "options": [
                    ("A", "Polis", True),
                    ("B", "Agora", False),
                    ("C", "Akropol", False),
                    ("D", "Falanga", False),
                ],
            },
            # 4
            {
                "body": (
                    "<p>Quyidagi voqealar to'g'ri xronologik ketma-ketlikda ko'rsatilgan javobni toping.</p>"
                    "<div style='padding:12px;border:1px solid #cbd5e1;border-radius:8px;background:rgba(100,116,139,0.05);line-height:1.8;font-size:13.5px;margin:12px 0;'>"
                    "1) Drakont qonunlari qabul qilindi (mil.avv. 621)<br/>"
                    "2) Solon islohotlari o'tkazildi (mil.avv. 594)<br/>"
                    "3) Marafon jangi (mil.avv. 490)<br/>"
                    "4) Fermopil va Salamin janglari (mil.avv. 480)<br/>"
                    "5) Plateya jangi (mil.avv. 479)<br/>"
                    "6) Xeroniya jangi (mil.avv. 338)"
                    "</div>"
                ),
                "explanation": "To'g'ri ketma-ketlik: mil.avv. 621 (1) → 594 (2) → 490 (3) → 480 (4) → 479 (5) → 338 (6).",
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
                    "<p>Quyida berilgan yunon faylasuflari va ularning g'oyalari to'g'ri moslashtirilgan javobni toping.</p>"
                    "<div style='display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:12px;margin:14px 0;'>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.7;'>"
                    "<b>I</b> Geraklit<br/>"
                    "<b>II</b> Demokrit<br/>"
                    "<b>III</b> Diogen<br/>"
                    "<b>IV</b> Suqrot"
                    "</div>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.7;'>"
                    "<b>a</b> Hamma narsa olovdan kelib chiqqan, deb uqtirgan<br/>"
                    "<b>b</b> Hamma narsa ko'zga ko'rinmaydigan atomlardan tashkil topgan, degan<br/>"
                    "<b>c</b> Insonda hech qanday ehtiyoj bo'lmasligi kerak, deb bochkada yashagan<br/>"
                    "<b>d</b> «Hech narsani bilmasligimni bilganim uchun donishmandman» degan<br/>"
                    "<b>e</b> To'plangan bilimlarni alohida fanlarga ajratgan"
                    "</div>"
                    "</div>"
                ),
                "explanation": "Geraklit — olov (a); Demokrit — atomlar (b); Diogen — ehtiyojsizlik (c); Suqrot — o'zini bilmaslikni bilish (d).",
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
                    "<p>Quyida berilgan afsonaviy mavjudotlar va ularning izohi to'g'ri moslashtirilgan javobni toping.</p>"
                    "<div style='display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:12px;margin:14px 0;'>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.7;'>"
                    "<b>I</b> Titanlar<br/>"
                    "<b>II</b> Sirenalar<br/>"
                    "<b>III</b> Kentavrlar<br/>"
                    "<b>IV</b> Sikloplar"
                    "</div>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.7;'>"
                    "<b>a</b> Geya va Uranning farzandlari, Olimp xudolaridan oldin hukmronlik qilgan<br/>"
                    "<b>b</b> Yarim qush, yarim ayol qiyofasidagi mavjudotlar<br/>"
                    "<b>c</b> Yarim ot, yarim odam qiyofasidagi mavjudotlar<br/>"
                    "<b>d</b> Peshanasida bitta ko'zi bo'lgan mavjudotlar<br/>"
                    "<b>e</b> Yerosti saltanati xudolari"
                    "</div>"
                    "</div>"
                ),
                "explanation": "Titanlar — Geya va Uran farzandlari (a); Sirenalar — yarim qush-ayol (b); Kentavrlar — yarim ot-odam (c); Sikloplar — bir ko'zli bahaybatlar (d).",
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
                    "<p>Tarixiy shaxsni aniqlang. Sparta podshosi. Fermopil darasida 300 spartalik "
                    "bilan qahramonlarcha jang qilib halok bo'lgan.</p>"
                ),
                "explanation": "Leonid — Sparta podshosi, mil.avv. 480-yilda Fermopil yo'lagida forslarning ulkan qo'shinini to'xtatgan afsonaviy sarkarda.",
                "options": [
                    ("A", "Leonid", True),
                    ("B", "Filipp II", False),
                    ("C", "Perikl", False),
                    ("D", "Doro I", False),
                ],
            },
            # 8
            {
                "body": (
                    "<p>Tarixiy shaxsni aniqlang. Bochkada yashagan, hech qanday ehtiyoj bo'lmasligi "
                    "kerak degan ta'limotga amal qilgan. Makedoniyalik Aleksandrga «Nariroq tur, "
                    "quyoshni to'syapsan» deb javob bergan.</p>"
                ),
                "explanation": "Diogen Sinoplik — kiniklar maktabi namoyandasi bo'lib, barcha moddiy boyliklardan voz kechib oddiy bochkada kun kechirgan faylasuf.",
                "options": [
                    ("A", "Diogen", True),
                    ("B", "Geraklit", False),
                    ("C", "Demokrit", False),
                    ("D", "Suqrot", False),
                ],
            },
            # 9
            {
                "body": (
                    "<p>Tarixiy voqeani aniqlang. Mil.avv. 490-yilda Attika sohilida bo'lib o'tgan, "
                    "yunonlarning forslar ustidan qozongan birinchi yirik g'alabasi.</p>"
                ),
                "explanation": "Marafon jangi — mil.avv. 490-yilda Miltiad boshchiligidagi afinaliklar Doro I ning bosqinchi fors qo'shinini tor-mor etgan.",
                "options": [
                    ("A", "Marafon jangi", True),
                    ("B", "Fermopil jangi", False),
                    ("C", "Salamin jangi", False),
                    ("D", "Plateya jangi", False),
                ],
            },
            # 10
            {
                "body": (
                    "<p>Tarixiy shaxsni aniqlang. XIX asr oxirida Gomer hikoyalarini tadqiq qilib, "
                    "Troya shahri joylashgan yerni aniqlagan nemis olimi.</p>"
                ),
                "explanation": "Genrix Shliman — havaskor arxeolog va tadqiqotchi bo'lib, Kichik Osiyodagi Hisorlik tepaligidan qadimgi Troyani qazib topgan.",
                "options": [
                    ("A", "Genrix Shliman", True),
                    ("B", "Gerodot", False),
                    ("C", "Arximed", False),
                    ("D", "Aristotel", False),
                ],
            },
            # 11
            {
                "body": (
                    "<p>Quyidagi shaxslardan qaysilari yunon faylasuflari va olimlariga tegishli?</p>"
                    "<div style='padding:10px;border:1px solid #cbd5e1;border-radius:8px;background:rgba(100,116,139,0.05);line-height:1.7;font-size:13.5px;margin:10px 0;'>"
                    "1) Geraklit<br/>"
                    "2) Demokrit<br/>"
                    "3) Sofokl<br/>"
                    "4) Suqrot<br/>"
                    "5) Aristofan<br/>"
                    "6) Aristotel"
                    "</div>"
                ),
                "explanation": "Sofokl (tragediya) va Aristofan (komediya) dramaturglar bo'lgan. Geraklit, Demokrit, Suqrot va Aristotel esa buyuk faylasuf va olimlar.",
                "options": [
                    ("A", "1, 2, 4, 6", True),
                    ("B", "1, 3, 5, 6", False),
                    ("C", "2, 3, 4, 5", False),
                    ("D", "1, 2, 3, 4", False),
                ],
            },
            # 12
            {
                "body": "<p>Birinchi Olimpiya o'yinlari qaysi yilda o'tkazilgan?</p>",
                "explanation": "Milodiy avvalgi 776-yilda Janubiy Yunonistonning Olimpiya shahrida birinchi rasmiy Olimpiya o'yinlari o'tkazilgan.",
                "options": [
                    ("A", "Mil.avv. 776-yil", True),
                    ("B", "Mil.avv. 490-yil", False),
                    ("C", "Mil.avv. 338-yil", False),
                    ("D", "Milodiy 394-yil", False),
                ],
            },
            # 13
            {
                "body": "<p>Mil.avv. V asr Yunonistoni uchun xos bo'lgan holatni aniqlang.</p>",
                "explanation": "Mil.avv. V asrda yunon shahar-davlatlari Eron (fors) bosqinchilariga qarshi birlashib umumiy g'alabaga erishdilar.",
                "options": [
                    ("A", "Yunonlar forslarga qarshi birlashib kurashdilar", True),
                    ("B", "Yunoniston yagona markazlashgan davlat edi", False),
                    ("C", "Yunoniston Rim tarkibida edi", False),
                    ("D", "Yunonistonda yozuv mavjud emas edi", False),
                ],
            },
            # 14
            {
                "body": (
                    "<p>Quyidagi janglardan qaysilari yunon-fors urushlariga tegishli?</p>"
                    "<div style='padding:10px;border:1px solid #cbd5e1;border-radius:8px;background:rgba(100,116,139,0.05);line-height:1.7;font-size:13.5px;margin:10px 0;'>"
                    "1) Marafon jangi<br/>"
                    "2) Fermopil jangi<br/>"
                    "3) Xeroniya jangi<br/>"
                    "4) Salamin jangi<br/>"
                    "5) Kanna jangi<br/>"
                    "6) Plateya jangi"
                    "</div>"
                ),
                "explanation": "Xeroniya jangi Makedoniya va Yunoniston o'rtasida, Kanna jangi Rim va Karfagen o'rtasida bo'lgan. 1, 2, 4, 6 esa yunon-fors urushlari janglaridir.",
                "options": [
                    ("A", "1, 2, 4, 6", True),
                    ("B", "1, 3, 5, 6", False),
                    ("C", "2, 3, 4, 5", False),
                    ("D", "1, 2, 3, 4", False),
                ],
            },
            # 15
            {
                "body": "<p>«Iliada» va «Odisseya» dostonlari kimga tegishli?</p>",
                "explanation": "Gomer — Qadimgi Yunonistonning ko'zi ojiz buyuk baxshisi bo'lib, «Iliada» va «Odisseya» dostonlarini yaratgan.",
                "options": [
                    ("A", "Gomer", True),
                    ("B", "Gerodot", False),
                    ("C", "Sofokl", False),
                    ("D", "Aristofan", False),
                ],
            },
            # 16
            {
                "body": (
                    "<p>Quyidagi voqealar to'g'ri xronologik ketma-ketlikda ko'rsatilgan javobni toping.</p>"
                    "<div style='padding:12px;border:1px solid #cbd5e1;border-radius:8px;background:rgba(100,116,139,0.05);line-height:1.8;font-size:13.5px;margin:12px 0;'>"
                    "1) Birinchi Olimpiya o'yinlari (mil.avv. 776)<br/>"
                    "2) Drakont qonunlari (mil.avv. 621)<br/>"
                    "3) Solon islohotlari (mil.avv. 594)<br/>"
                    "4) Marafon jangi (mil.avv. 490)<br/>"
                    "5) «Perikl asri» boshlandi (mil.avv. 443)<br/>"
                    "6) Xeroniya jangi (mil.avv. 338)"
                    "</div>"
                ),
                "explanation": "Xronologik tartib: mil.avv. 776 → 621 → 594 → 490 → 443 → 338.",
                "options": [
                    ("A", "1, 2, 3, 4, 5, 6", True),
                    ("B", "2, 1, 3, 4, 5, 6", False),
                    ("C", "1, 3, 2, 4, 5, 6", False),
                    ("D", "1, 2, 4, 3, 5, 6", False),
                ],
            },
            # 17 (Sxematik diagramma)
            {
                "body": (
                    "<p>Sxematik diagrammada yunon-fors urushlarining to'rt asosiy jangi ko'rsatilgan. "
                    "1–4 raqamlaridan qaysi biri <b>dengizda bo'lib o'tgan</b> jangni bildiradi?</p>"
                    "<div style='display:flex;flex-direction:column;align-items:center;gap:6px;margin:16px 0;'>"
                    "<div style='border:2px solid #3b82f6;border-radius:8px;padding:9px 22px;font-weight:bold;font-size:13.5px;background:rgba(59,130,246,0.08);width:270px;text-align:center;'>1 – mil.avv. 490-yil</div>"
                    "<div style='font-size:16px;color:#64748b;'>↓</div>"
                    "<div style='border:2px solid #3b82f6;border-radius:8px;padding:9px 22px;font-weight:bold;font-size:13.5px;background:rgba(59,130,246,0.08);width:270px;text-align:center;'>2 – mil.avv. 480-yil (quruqlikda)</div>"
                    "<div style='font-size:16px;color:#64748b;'>↓</div>"
                    "<div style='border:2px solid #3b82f6;border-radius:8px;padding:9px 22px;font-weight:bold;font-size:13.5px;background:rgba(59,130,246,0.08);width:270px;text-align:center;'>3 – mil.avv. 480-yil (dengizda)</div>"
                    "<div style='font-size:16px;color:#64748b;'>↓</div>"
                    "<div style='border:2px solid #3b82f6;border-radius:8px;padding:9px 22px;font-weight:bold;font-size:13.5px;background:rgba(59,130,246,0.08);width:270px;text-align:center;'>4 – mil.avv. 479-yil</div>"
                    "</div>"
                ),
                "explanation": "Salamin jangi (3-band) tor dengiz bo'g'ozida triyeralar ishtirokida bo'lib o'tgan hal qiluvchi dengiz jangi edi.",
                "options": [
                    ("A", "3", True),
                    ("B", "1", False),
                    ("C", "2", False),
                    ("D", "4", False),
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
                    "<tr style='border-bottom:1px solid #e2e8f0;'><td style='padding:8px;text-align:center;border-right:1px solid #cbd5e1;font-weight:bold;'>1</td><td style='padding:8px 12px;border-right:1px solid #cbd5e1;'>Solon islohotlari (mil.avv. 594)</td><td style='padding:8px 12px;'>Aristokratiya demokratiyaga almashtirildi</td></tr>"
                    "<tr style='border-bottom:1px solid #e2e8f0;background:rgba(100,116,139,0.03);'><td style='padding:8px;text-align:center;border-right:1px solid #cbd5e1;font-weight:bold;'>2</td><td style='padding:8px 12px;border-right:1px solid #cbd5e1;'>Marafon jangi (mil.avv. 490)</td><td style='padding:8px 12px;'>Forslar Yunonistonni butunlay bosib oldi</td></tr>"
                    "<tr style='border-bottom:1px solid #e2e8f0;'><td style='padding:8px;text-align:center;border-right:1px solid #cbd5e1;font-weight:bold;'>3</td><td style='padding:8px 12px;border-right:1px solid #cbd5e1;'>Xeroniya jangi (mil.avv. 338)</td><td style='padding:8px 12px;'>Yunoniston Makedoniyaga qaram bo'lib qoldi</td></tr>"
                    "<tr style='border-bottom:1px solid #e2e8f0;background:rgba(100,116,139,0.03);'><td style='padding:8px;text-align:center;border-right:1px solid #cbd5e1;font-weight:bold;'>4</td><td style='padding:8px 12px;border-right:1px solid #cbd5e1;'>Perikl hukmronligi</td><td style='padding:8px 12px;'>Parfenon qurildi, Afina gullab-yashnadi</td></tr>"
                    "<tr style='border-bottom:1px solid #e2e8f0;'><td style='padding:8px;text-align:center;border-right:1px solid #cbd5e1;font-weight:bold;'>5</td><td style='padding:8px 12px;border-right:1px solid #cbd5e1;'>Drakont qonunlari</td><td style='padding:8px 12px;'>Jinoyatchilarga faqat pul jarimasi qo'llanildi</td></tr>"
                    "<tr><td style='padding:8px;text-align:center;border-right:1px solid #cbd5e1;font-weight:bold;'>6</td><td style='padding:8px 12px;border-right:1px solid #cbd5e1;'>Salamin jangi (mil.avv. 480)</td><td style='padding:8px 12px;'>Yunonlar dengizda g'alaba qozondi</td></tr>"
                    "</tbody></table></div>"
                ),
                "explanation": "2 xato: Marafonda yunonlar g'alaba qozondi. 5 xato: Drakont qonunlari nihoyatda qattiq bo'lib, kichik jinoyat uchun ham o'lim jazosi berilgan.",
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
                    "<th style='padding:8px 12px;border-right:1px solid #cbd5e1;text-align:left;'>O'rta Osiyo voqeasi</th>"
                    "<th style='padding:8px 12px;text-align:left;'>Yunoniston voqeasi</th>"
                    "</tr></thead>"
                    "<tbody>"
                    "<tr style='border-bottom:1px solid #e2e8f0;'><td style='padding:10px 12px;border-right:1px solid #cbd5e1;font-weight:bold;'>Mil.avv. VI asr</td><td style='padding:10px 12px;border-right:1px solid #cbd5e1;font-weight:bold;color:#f59e0b;font-size:16px;'>a</td><td style='padding:10px 12px;'>Yunon-fors urushlari boshlandi</td></tr>"
                    "<tr style='background:rgba(100,116,139,0.03);'><td style='padding:10px 12px;border-right:1px solid #cbd5e1;font-weight:bold;'>Mil.avv. IV asr</td><td style='padding:10px 12px;border-right:1px solid #cbd5e1;'>Makedoniyalik Aleksandr O'rta Osiyoga bostirib kirdi</td><td style='padding:10px 12px;font-weight:bold;color:#f59e0b;font-size:16px;'>b</td></tr>"
                    "</tbody></table></div>"
                    "<div style='padding:10px 14px;background:rgba(100,116,139,0.08);border-radius:8px;font-size:13px;line-height:1.6;margin-top:8px;'>"
                    "<b>Ma'lumotlar:</b><br/>"
                    "1) O'rta Osiyo Ahamoniylar tarkibida edi;<br/>"
                    "2) Xeroniya jangi bo'lib o'tdi (mil.avv. 338);<br/>"
                    "3) Zardushtiylik keng tarqaldi;<br/>"
                    "4) Salamin jangi bo'lib o'tdi (mil.avv. 480)."
                    "</div>"
                ),
                "explanation": "a=1: Mil.avv. VI asrda O'rta Osiyo Ahamoniylar imperiyasi tarkibida edi. b=2: Xeroniya jangi (338) mil.avv. IV asr Yunoniston voqeasi.",
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
                    "<i>(Afina va Sparta davlatlari)</i></p>"
                    "<div style='display:flex;justify-content:center;margin:18px 0;'>"
                    "<svg width='360' height='190' viewBox='0 0 360 190' style='max-width:100%;height:auto;'>"
                    "<circle cx='130' cy='95' r='80' fill='rgba(59, 130, 246, 0.15)' stroke='#3b82f6' stroke-width='2.5' />"
                    "<circle cx='230' cy='95' r='80' fill='rgba(245, 158, 11, 0.15)' stroke='#f59e0b' stroke-width='2.5' />"
                    "<text x='85' y='85' font-size='18' font-weight='bold' fill='currentColor' text-anchor='middle'>I</text>"
                    "<text x='85' y='108' font-size='13' font-weight='600' fill='currentColor' text-anchor='middle'>Afina</text>"
                    "<text x='180' y='98' font-size='18' font-weight='bold' fill='currentColor' text-anchor='middle'>III</text>"
                    "<text x='275' y='85' font-size='18' font-weight='bold' fill='currentColor' text-anchor='middle'>II</text>"
                    "<text x='275' y='108' font-size='13' font-weight='600' fill='currentColor' text-anchor='middle'>Sparta</text>"
                    "</svg>"
                    "</div>"
                    "<div style='font-size:13.5px;line-height:1.8;padding:12px;background:rgba(100,116,139,0.06);border-radius:8px;'>"
                    "<b>a)</b> Demokratik boshqaruvga ega bo'lgan;<br/>"
                    "<b>b)</b> Harbiy davlat, faqat jangchilikka ixtisoslashgan;<br/>"
                    "<b>c)</b> Yunon polisi hisoblangan;<br/>"
                    "<b>d)</b> Yunon-fors urushlarida qatnashgan;<br/>"
                    "<b>e)</b> Savdo-sotiq va san'at rivojlangan;<br/>"
                    "<b>f)</b> Ilotlar (qullar)ga tayangan."
                    "</div>"
                ),
                "explanation": "I (faqat Afina): demokratiya (a), savdo-san'at (e). II (faqat Sparta): harbiy davlat (b), ilotlar (f). III (umumiy kesishma): polis (c), yunon-fors urushlarida ishtirok (d).",
                "options": [
                    ("A", "I-a,e; II-b,f; III-c,d", True),
                    ("B", "I-b,f; II-a,e; III-c,d", False),
                    ("C", "I-a,d; II-b,f; III-c,e", False),
                    ("D", "I-a,e; II-c,d; III-b,f", False),
                ],
            },
            # 21
            {
                "body": (
                    "<p>Quyidagi shaxslar va ularning asarlarini to'g'ri moslashtiring.</p>"
                    "<div style='display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:12px;margin:14px 0;'>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.7;'>"
                    "<b>1)</b> Gomer<br/>"
                    "<b>2)</b> Sofokl<br/>"
                    "<b>3)</b> Aristofan<br/>"
                    "<b>4)</b> Gerodot"
                    "</div>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.7;'>"
                    "<b>a)</b> «Shoh Edip» tragediyasi<br/>"
                    "<b>b)</b> «Iliada» dostoni<br/>"
                    "<b>c)</b> «Tarix» kitobi<br/>"
                    "<b>d)</b> Komediyalar"
                    "</div>"
                    "</div>"
                ),
                "explanation": "1-b (Gomer — Iliada), 2-a (Sofokl — Shoh Edip), 3-d (Aristofan — komediyalar), 4-c (Gerodot — Tarix kitobi).",
                "options": [
                    ("A", "1-b; 2-a; 3-d; 4-c", True),
                    ("B", "1-a; 2-b; 3-c; 4-d", False),
                    ("C", "1-c; 2-a; 3-b; 4-d", False),
                    ("D", "1-b; 2-d; 3-a; 4-c", False),
                ],
            },
            # 22
            {
                "body": "<p>Parfenon qurilishi va Akropolning qayta qurilishiga boshchilik qilgan haykaltaroshni aniqlang.</p>",
                "explanation": "Fidiy — Afina Akropolini qayta qurishga boshchilik qilgan, Parfenon haykallari va Zevs haykalining muallifi bo'lgan buyuk yunon haykaltaroshi.",
                "options": [
                    ("A", "Fidiy", True),
                    ("B", "Dedal", False),
                    ("C", "Miron", False),
                    ("D", "Praksitel", False),
                ],
            },
            # 23
            {
                "body": "<p>«Evrika!» iborasi qaysi olimga tegishli?</p>",
                "explanation": "Arximed — suvga botirilgan jismga ta'sir qiluvchi gidrostatik qonunni kashf etgach «Evrika!» (Topdim!) deb hayqirgan.",
                "options": [
                    ("A", "Arximed", True),
                    ("B", "Aristotel", False),
                    ("C", "Gerodot", False),
                    ("D", "Demokrit", False),
                ],
            },
            # 24
            {
                "body": (
                    "<p>Quyidagi afsonaviy qahramonlardan qaysilari Troya urushi bilan bog'liq?</p>"
                    "<div style='padding:10px;border:1px solid #cbd5e1;border-radius:8px;background:rgba(100,116,139,0.05);line-height:1.7;font-size:13.5px;margin:10px 0;'>"
                    "1) Axilles<br/>"
                    "2) Odissey<br/>"
                    "3) Gerakl<br/>"
                    "4) Paris<br/>"
                    "5) Prometey<br/>"
                    "6) Sohibjamol Yelena"
                    "</div>"
                ),
                "explanation": "Axilles, Odissey, Paris va Yelena Troya urushining asosiy qahramonlaridir. Gerakl va Prometey esa mustaqil boshqa afsonalar qahramonlari.",
                "options": [
                    ("A", "1, 2, 4, 6", True),
                    ("B", "1, 3, 5, 6", False),
                    ("C", "2, 3, 4, 5", False),
                    ("D", "1, 2, 3, 4", False),
                ],
            },
            # 25
            {
                "body": (
                    "<p>Quyidagilardan qaysilari Sparta jamiyatiga xos edi?</p>"
                    "<div style='padding:10px;border:1px solid #cbd5e1;border-radius:8px;background:rgba(100,116,139,0.05);line-height:1.7;font-size:13.5px;margin:10px 0;'>"
                    "1) Qat'iy harbiy intizom<br/>"
                    "2) Ilotlarga tayanish<br/>"
                    "3) Rivojlangan san'at va me'morchilik<br/>"
                    "4) Bolalarni yoshlikdan harbiy tayyorlash<br/>"
                    "5) Rivojlangan savdo-sotiq<br/>"
                    "6) Chet elliklarni qabul qilmaslik"
                    "</div>"
                ),
                "explanation": "Spartada san'at, hashamat va savdo taqiqlangan. Qat'iy intizom, ilotlar mehnati, 7 yoshdan harbiy tarbiya va chet elliklarni haydash xos bo'lgan.",
                "options": [
                    ("A", "1, 2, 4, 6", True),
                    ("B", "1, 3, 5, 6", False),
                    ("C", "2, 3, 4, 5", False),
                    ("D", "1, 2, 3, 4", False),
                ],
            },
            # 26
            {
                "body": "<p>Suqrotning shogirdi bo'lgan, uning g'oyalarini yozib qoldirgan faylasufni aniqlang.</p>",
                "explanation": "Aflotun (Platon) — Suqrotning eng mashhur shogirdi bo'lib, ustozining suhbatlari va g'oyalarini o'z asarlarida saqlab qolgan.",
                "options": [
                    ("A", "Aflotun (Platon)", True),
                    ("B", "Aristotel", False),
                    ("C", "Demokrit", False),
                    ("D", "Geraklit", False),
                ],
            },
            # 27
            {
                "body": "<p>O'zaro muvofiqlik SAQLANMAGAN javobni toping.</p>",
                "explanation": "Fidiy buyuk haykaltarosh bo'lgan (Parfenon, Zevs haykali). «Tarix» kitobi muallifi esa Gerodotdir.",
                "options": [
                    ("A", "Sofokl — tragediyalar muallifi", False),
                    ("B", "Aristofan — komediyalar ustasi", False),
                    ("C", "Fidiy — tarixchi, «Tarix» kitobi muallifi", True),
                    ("D", "Gerodot — «tarixning otasi»", False),
                ],
            },
            # 28
            {
                "body": "<p>Aristotelni Sharqda qanday nom bilan atashgan?</p>",
                "explanation": "Aristotel musulmon Sharqida «Arastu» yoki «Muallimi avval» (Birinchi muallim) deb ulug'langan.",
                "options": [
                    ("A", "Arastu", True),
                    ("B", "Aflotun", False),
                    ("C", "Suqrot", False),
                    ("D", "Faylasuf", False),
                ],
            },
            # 29
            {
                "body": (
                    "<p>Quyida berilgan ma'lumotlarga mos yakuniy xulosalar (to'g'ri/noto'g'ri) keltirilgan javobni aniqlang.</p>"
                    "<div style='padding:10px;border:1px solid #cbd5e1;border-radius:8px;background:rgba(100,116,139,0.05);line-height:1.7;font-size:13.5px;margin:10px 0;'>"
                    "I. Suqrot Afinadagi tartiblarni tanqid qilgani uchun o'limga mahkum etilgan.<br/>"
                    "II. Olimpiya o'yinlari xudo Zevs sharafiga bag'ishlab o'tkazilgan.<br/>"
                    "III. Diogen boy-badavlat hayot kechirgan faylasuf bo'lgan."
                    "</div>"
                ),
                "explanation": "I to'g'ri (zaharlanish hukmi). II to'g'ri (Zevs sharafiga). III noto'g'ri — Diogen mol-dunyodan voz kechib bochkada yashagan.",
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
                    "<b>1)</b> Filipp II<br/>"
                    "<b>2)</b> Demosfen<br/>"
                    "<b>3)</b> Aleksandr"
                    "</div>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.7;'>"
                    "<b>a)</b> Yunonlarni Makedoniyaga qarshi birlashishga da'vat etgan notiq<br/>"
                    "<b>b)</b> Xeroniya jangida Yunonistonni bosib olgan Makedoniya podshosi<br/>"
                    "<b>c)</b> Xeroniya jangida suvoriy qo'shinlarga qo'mondonlik qilgan"
                    "</div>"
                    "</div>"
                ),
                "explanation": "1-b (Filipp II — Xeroniya g'olibi), 2-a (Demosfen — filippikalar notig'i), 3-c (Aleksandr — 18 yoshida otliqlar qo'mondoni).",
                "options": [
                    ("A", "1-b; 2-a; 3-c", True),
                    ("B", "1-a; 2-b; 3-c", False),
                    ("C", "1-c; 2-a; 3-b", False),
                    ("D", "1-b; 2-c; 3-a", False),
                ],
            },
            # 31
            {
                "body": (
                    "<p>Tushunchalar va ularning izohini to'g'ri moslashtiring.</p>"
                    "<div style='display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:12px;margin:14px 0;'>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.7;'>"
                    "<b>1)</b> Meteklar<br/>"
                    "<b>2)</b> Ellinlar<br/>"
                    "<b>3)</b> Varvarlar"
                    "</div>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.7;'>"
                    "<b>a)</b> Afinada yashovchi, fuqarolik huquqiga ega bo'lmagan chet elliklar<br/>"
                    "<b>b)</b> Yunonlarning o'zlariga bergan umumiy nomi<br/>"
                    "<b>c)</b> Yunon bo'lmagan xalqlar"
                    "</div>"
                    "</div>"
                ),
                "explanation": "1-a (Meteklar — chet elliklar), 2-b (Ellinlar — yunonlar o'zlari), 3-c (Varvarlar — yunon bo'lmaganlar).",
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
                    "<p>Quyidagi voqealardan qaysilari Perikl hukmronligi davriga (mil.avv. 443–429) tegishli?</p>"
                    "<div style='padding:10px;border:1px solid #cbd5e1;border-radius:8px;background:rgba(100,116,139,0.05);line-height:1.7;font-size:13.5px;margin:10px 0;'>"
                    "1) Parfenon qurilishi<br/>"
                    "2) Afinaning eng qudratli davlatga aylanishi<br/>"
                    "3) Xeroniya jangi<br/>"
                    "4) Demokratiyaning ravnaq topishi<br/>"
                    "5) Marafon jangi<br/>"
                    "6) Fermopil jangi"
                    "</div>"
                ),
                "explanation": "Perikl asrida (mil.avv. 443-429) Parfenon qurildi, Afina eng qudratli davlatga aylandi va afina demokratiyasi eng yuqori cho'qqiga chiqdi (1, 2, 4).",
                "options": [
                    ("A", "1, 2, 4", True),
                    ("B", "3, 5, 6", False),
                    ("C", "1, 3, 5", False),
                    ("D", "2, 4, 6", False),
                ],
            },
            # 33 (Bank A-F)
            {
                "body": (
                    "<div style='padding:12px 14px;background:rgba(59,130,246,0.08);border:1px solid rgba(59,130,246,0.3);border-radius:8px;font-size:13px;line-height:1.7;margin-bottom:12px;'>"
                    "<b>33–35-topshiriqlarga mos javoblarni quyidagi banklardan (A–F) tanlang:</b><br/>"
                    "<b>A)</b> Drakont qonunlarining qabul qilinishi (mil.avv. 621);<br/>"
                    "<b>B)</b> Marafon jangi (mil.avv. 490);<br/>"
                    "<b>C)</b> Salamin jangi (mil.avv. 480);<br/>"
                    "<b>D)</b> Perikl hukmronligining boshlanishi (mil.avv. 443);<br/>"
                    "<b>E)</b> Xeroniya jangi (mil.avv. 338);<br/>"
                    "<b>F)</b> Birinchi Olimpiya o'yinlari (mil.avv. 776)"
                    "</div>"
                    "<p><b>Berilgan voqealardan qaysi biri eng avval sodir bo'lgan?</b></p>"
                ),
                "explanation": "Mil.avv. 776-yil — ro'yxatdagi eng qadimgi sana. To'g'ri javob: F (Birinchi Olimpiya o'yinlari).",
                "options": [
                    ("A", "Drakont qonunlarining qabul qilinishi (mil.avv. 621)", False),
                    ("B", "Marafon jangi (mil.avv. 490)", False),
                    ("C", "Salamin jangi (mil.avv. 480)", False),
                    ("D", "Perikl hukmronligining boshlanishi (mil.avv. 443)", False),
                    ("E", "Xeroniya jangi (mil.avv. 338)", False),
                    ("F", "Birinchi Olimpiya o'yinlari (mil.avv. 776)", True),
                ],
            },
            # 34 (Bank A-F)
            {
                "body": (
                    "<div style='padding:12px 14px;background:rgba(59,130,246,0.08);border:1px solid rgba(59,130,246,0.3);border-radius:8px;font-size:13px;line-height:1.7;margin-bottom:12px;'>"
                    "<b>33–35-topshiriqlarga mos javoblarni quyidagi banklardan (A–F) tanlang:</b><br/>"
                    "<b>A)</b> Drakont qonunlarining qabul qilinishi (mil.avv. 621);<br/>"
                    "<b>B)</b> Marafon jangi (mil.avv. 490);<br/>"
                    "<b>C)</b> Salamin jangi (mil.avv. 480);<br/>"
                    "<b>D)</b> Perikl hukmronligining boshlanishi (mil.avv. 443);<br/>"
                    "<b>E)</b> Xeroniya jangi (mil.avv. 338);<br/>"
                    "<b>F)</b> Birinchi Olimpiya o'yinlari (mil.avv. 776)"
                    "</div>"
                    "<p><b>Yunonistonning Makedoniyaga qaram bo'lib qolishiga sabab bo'lgan voqeani aniqlang.</b></p>"
                ),
                "explanation": "Xeroniya jangi (mil.avv. 338) oqibatida Filipp II Yunoniston mustaqilligiga chek qo'yib, uni Makedoniyaga qaram qildi. To'g'ri javob: E.",
                "options": [
                    ("A", "Drakont qonunlarining qabul qilinishi (mil.avv. 621)", False),
                    ("B", "Marafon jangi (mil.avv. 490)", False),
                    ("C", "Salamin jangi (mil.avv. 480)", False),
                    ("D", "Perikl hukmronligining boshlanishi (mil.avv. 443)", False),
                    ("E", "Xeroniya jangi (mil.avv. 338)", True),
                    ("F", "Birinchi Olimpiya o'yinlari (mil.avv. 776)", False),
                ],
            },
            # 35 (Bank A-F)
            {
                "body": (
                    "<div style='padding:12px 14px;background:rgba(59,130,246,0.08);border:1px solid rgba(59,130,246,0.3);border-radius:8px;font-size:13px;line-height:1.7;margin-bottom:12px;'>"
                    "<b>33–35-topshiriqlarga mos javoblarni quyidagi banklardan (A–F) tanlang:</b><br/>"
                    "<b>A)</b> Drakont qonunlarining qabul qilinishi (mil.avv. 621);<br/>"
                    "<b>B)</b> Marafon jangi (mil.avv. 490);<br/>"
                    "<b>C)</b> Salamin jangi (mil.avv. 480);<br/>"
                    "<b>D)</b> Perikl hukmronligining boshlanishi (mil.avv. 443);<br/>"
                    "<b>E)</b> Xeroniya jangi (mil.avv. 338);<br/>"
                    "<b>F)</b> Birinchi Olimpiya o'yinlari (mil.avv. 776)"
                    "</div>"
                    "<p><b>Berilgan voqealardan qaysi biri eng keyin sodir bo'lgan?</b></p>"
                ),
                "explanation": "Mil.avv. 338-yil — ro'yxatdagi eng so'nggi sana. To'g'ri javob: E (Xeroniya jangi).",
                "options": [
                    ("A", "Drakont qonunlarining qabul qilinishi (mil.avv. 621)", False),
                    ("B", "Marafon jangi (mil.avv. 490)", False),
                    ("C", "Salamin jangi (mil.avv. 480)", False),
                    ("D", "Perikl hukmronligining boshlanishi (mil.avv. 443)", False),
                    ("E", "Xeroniya jangi (mil.avv. 338)", True),
                    ("F", "Birinchi Olimpiya o'yinlari (mil.avv. 776)", False),
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
                "title": "Qadimgi Yunoniston.",
                "parts": [
                    ("a", "Yunonistonning eng baland tog'ini yozing.", "Olimp tog'i (Olimp)"),
                    ("b", "Krit orolidagi qadimiy sivilizatsiyani yozing.", "Minoy sivilizatsiyasi (Minoy / Krit-Minoy)"),
                ],
                "explanation": "a) Olimp tog'i; b) Minoy sivilizatsiyasi.",
            },
            # 37
            {
                "title": "Afina davlati.",
                "parts": [
                    ("a", "Afinada 621-yilda qattiq qonunlar yozgan hukmdorni yozing.", "Drakont"),
                    ("b", "594-yilda islohotlar o'tkazgan islohotchini yozing.", "Solon"),
                ],
                "explanation": "a) Drakont; b) Solon.",
            },
            # 38
            {
                "title": "Sparta davlati.",
                "parts": [
                    ("a", "Spartaliklar tomonidan qul qilingan mahalliy aholini yozing.", "Ilotlar (Ilot)"),
                    ("b", "Sparta shahar-davlatiga asos solgan qabilani yozing.", "Doriylar (Doriy qabilalari)"),
                ],
                "explanation": "a) Ilotlar; b) Doriylar.",
            },
            # 39
            {
                "title": "Yunon-fors urushlari.",
                "parts": [
                    ("a", "Mil.avv. 490-yilda bo'lib o'tgan birinchi yirik jangni yozing.", "Marafon jangi (Marafon)"),
                    ("b", "300 spartalik halok bo'lgan jangni yozing.", "Fermopil jangi (Fermopil)"),
                ],
                "explanation": "a) Marafon jangi; b) Fermopil jangi.",
            },
            # 40
            {
                "title": "Makedoniya bosqini.",
                "parts": [
                    ("a", "Yunonistonni bosib olgan Makedoniya podshosini yozing.", "Filipp II (Filipp 2)"),
                    ("b", "Yunonlarni birlashishga da'vat etgan notiqni yozing.", "Demosfen"),
                ],
                "explanation": "a) Filipp II; b) Demosfen.",
            },
            # 41
            {
                "title": "Olimpiya o'yinlari.",
                "parts": [
                    ("a", "Birinchi Olimpiya o'yinlari o'tkazilgan yilni yozing.", "Mil.avv. 776-yil (mil.avv. 776)"),
                    ("b", "Olimpiya o'yinlari qayta tiklangan yilni yozing.", "1896-yil (1896)"),
                ],
                "explanation": "a) Mil.avv. 776-yil; b) 1896-yil.",
            },
            # 42
            {
                "title": "Yunon adabiyoti va teatri.",
                "parts": [
                    ("a", "«Iliada» va «Odisseya» dostonlari muallifini yozing.", "Gomer"),
                    ("b", "«Shoh Edip» tragediyasi muallifini yozing.", "Sofokl"),
                ],
                "explanation": "a) Gomer; b) Sofokl.",
            },
            # 43
            {
                "title": "Yunon faylasuflari.",
                "parts": [
                    ("a", "«Insonda hech qanday ehtiyoj bo'lmasligi kerak» degan faylasufni yozing.", "Diogen"),
                    ("b", "Afinada o'limga mahkum etilgan, «o'zini bilmaslikni bilish» haqida gapirgan faylasufni yozing.", "Suqrot (Sokrat)"),
                ],
                "explanation": "a) Diogen; b) Suqrot.",
            },
            # 44
            {
                "title": "Yunon olimlari.",
                "parts": [
                    ("a", "To'plangan bilimlarni fanlarga ajratgan, Sharqda «Arastu» deb atalgan olimni yozing.", "Aristotel (Arastu)"),
                    ("b", "«Evrika!» iborasi bilan mashhur bo'lgan olimni yozing.", "Arximed"),
                ],
                "explanation": "a) Aristotel; b) Arximed.",
            },
            # 45
            {
                "title": "Yunon afsonalari.",
                "parts": [
                    ("a", "Troya urushida qo'llanilgan hiyla-nayrangni yozing.", "Troya oti"),
                    ("b", "Troya shahri joylashuvini aniqlagan nemis olimini yozing.", "Genrix Shliman (Shliman)"),
                ],
                "explanation": "a) Troya oti; b) Genrix Shliman.",
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
