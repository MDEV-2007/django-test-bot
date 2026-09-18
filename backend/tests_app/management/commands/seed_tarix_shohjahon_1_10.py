"""Django management command: Sodiqov Shohjahon ustozning 6-sinf Qadimgi Dunyo Tarixi (1–10-mavzular) Milliy Sertifikat mock testini yaratish.

1–10-mavzular: Eng qadimgi tuzum va Qadimgi Misr (eski va yangi darslik nashrlari asosida).
35 ta test topshirig'i (A, B, C, D) va 10 ta yozma (ochiq) savol. Jami: 45 ta topshiriq.

Muallif/O'qituvchi: shohjahon (Sodiqov Shohjahon, @TarixMilliyCertificate)

Foydalanish:
    python manage.py seed_tarix_shohjahon_1_10
    python manage.py seed_tarix_shohjahon_1_10 --force
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from django.contrib.auth.models import User

from accounts.models import Profile, ensure_profile_for_user
from tests_app.models import Subject, TestSet, Question, AnswerOption, SubQuestion


MOCK_TITLE = "6-sinf Qadimgi Dunyo Tarixi — Milliy Sertifikat (1–10-mavzular) | Shohjahon"
MOCK_DESC = (
    "1–10-mavzular: Eng qadimgi tuzum va Qadimgi Misr (eski va yangi darslik nashrlari asosida). "
    "35 ta test topshirig'i (A, B, C, D) va 10 ta yozma (ochiq) savol. Jami: 45 ta topshiriq. "
    "Ustoz: Sodiqov Shohjahon (@TarixMilliyCertificate)."
)


class Command(BaseCommand):
    help = "Sodiqov Shohjahon ustoz nomidan 6-sinf Tarix (1–10-mavzular) 45 talik Milliy Sertifikat testini yuklaydi."

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
                        f"Qayta yuklash uchun: python manage.py seed_tarix_shohjahon_1_10 --force"
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
                "explanation": "Tangalarni numizmatika fani o'rganadi, etnograf esa xalqlarning turmush tarzi, urf-odatlari va madaniyatini o'rganadi.",
                "options": [
                    ("A", "Arxeolog — qadimgi manzilgohlarda qazishma ishlarini olib boradi", False),
                    ("B", "Antropolog — suyak qoldiqlaridan tashqi qiyofani tiklaydi", False),
                    ("C", "Etnograf — qadimgi tangalarni o'rganadi", True),
                    ("D", "Yaxmos — giksoslarni Misrdan haydab chiqargan fir'avn", False),
                ],
            },
            # 2
            {
                "body": (
                    "<p>Quyidagi tarixchilar va ular yozgan asarlar mos ravishda berilgan javobni aniqlang.</p>"
                    "<div style='display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:12px;margin:14px 0;'>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.7;'>"
                    "<b>1)</b> Gerodot<br/>"
                    "<b>2)</b> Strabon<br/>"
                    "<b>3)</b> Kvint Kursiy Ruf<br/>"
                    "<b>4)</b> Arrian"
                    "</div>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.7;'>"
                    "<b>a)</b> «Geografiya» asari muallifi<br/>"
                    "<b>b)</b> «Tarix» (to'qqiz kitob) asari muallifi<br/>"
                    "<b>c)</b> «Aleksandrning harbiy yurishlari» asari muallifi<br/>"
                    "<b>d)</b> «Makedoniyalik Aleksandr tarixi» asari muallifi"
                    "</div>"
                    "</div>"
                ),
                "explanation": "1-b (Gerodot — «Tarix»), 2-a (Strabon — «Geografiya»), 3-d (Kvint Kursiy Ruf — «Makedoniyalik Aleksandr tarixi»), 4-c (Arrian — «Aleksandrning harbiy yurishlari»).",
                "options": [
                    ("A", "1-b; 2-a; 3-d; 4-c", True),
                    ("B", "1-a; 2-b; 3-c; 4-d", False),
                    ("C", "1-c; 2-a; 3-b; 4-d", False),
                    ("D", "1-b; 2-d; 3-a; 4-c", False),
                ],
            },
            # 3
            {
                "body": "<p>O'rta Osiyo tarixi bo'yicha eng qadimgi yozma manba qaysi kitob hisoblanadi?</p>",
                "explanation": "«Avesto» — zardushtiylikning muqaddas kitobi bo'lib, O'rta Osiyo xalqlarining eng qadimgi yozma manbasi hisoblanadi.",
                "options": [
                    ("A", "«Avesto»", True),
                    ("B", "«Tarix»", False),
                    ("C", "«Geografiya»", False),
                    ("D", "«Rigveda»", False),
                ],
            },
            # 4
            {
                "body": (
                    "<p>Quyidagi voqealar to'g'ri xronologik ketma-ketlikda ko'rsatilgan javobni toping.</p>"
                    "<div style='padding:12px;border:1px solid #cbd5e1;border-radius:8px;background:rgba(100,116,139,0.05);line-height:1.8;font-size:13.5px;margin:12px 0;'>"
                    "1) Mezolit davri boshlandi (mil.avv. 12-ming yillik)<br/>"
                    "2) Neolit davri boshlandi (mil.avv. 6-ming yillik)<br/>"
                    "3) Eneolit davri boshlandi (mil.avv. 4-ming yillik)<br/>"
                    "4) Bronza davri boshlandi (mil.avv. 3-ming yillik o'rtasi)<br/>"
                    "5) Xettlar temirdan foydalana boshladi (mil.avv. XIV–XIII asr)<br/>"
                    "6) O'rta Osiyoda temirdan foydalanish boshlandi (mil.avv. IX–VIII asr)"
                    "</div>"
                ),
                "explanation": "To'g'ri xronologik ketma-ketlik: 1, 2, 3, 4, 5, 6.",
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
                    "<p>Quyida berilgan qadimgi odam turlari va ular topilgan hududlar to'g'ri moslashtirilgan javobni toping.</p>"
                    "<div style='display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:12px;margin:14px 0;'>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.7;'>"
                    "<b>I</b> Avstralopitek<br/>"
                    "<b>II</b> Pitekantrop<br/>"
                    "<b>III</b> Sinantrop<br/>"
                    "<b>IV</b> Neandertal<br/>"
                    "<b>V</b> Kromanyon"
                    "</div>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.7;'>"
                    "<b>a</b> Yava orolidan (Indoneziya) topilgan<br/>"
                    "<b>b</b> Xitoy hududidan topilgan<br/>"
                    "<b>c</b> Janubiy Afrikadan topilgan<br/>"
                    "<b>d</b> Germaniyadan (va Teshiktoshdan) topilgan<br/>"
                    "<b>e</b> Fransiyadagi g'ordan topilgan, hozirgi qiyofadagi odam"
                    "</div>"
                    "</div>"
                ),
                "explanation": "Avstralopitek — Janubiy Afrika (c); Pitekantrop — Yava (a); Sinantrop — Xitoy (b); Neandertal — Germaniya/Teshiktosh (d); Kromanyon — Fransiya (e).",
                "options": [
                    ("A", "I-c, II-a, III-b, IV-d, V-e", True),
                    ("B", "I-a, II-c, III-b, IV-e, V-d", False),
                    ("C", "I-c, II-b, III-a, IV-d, V-e", False),
                    ("D", "I-d, II-a, III-b, IV-c, V-e", False),
                ],
            },
            # 6
            {
                "body": (
                    "<p>Quyida berilgan tushunchalar va ularning izohi to'g'ri moslashtirilgan javobni toping.</p>"
                    "<div style='display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:12px;margin:14px 0;'>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.7;'>"
                    "<b>I</b> Totemizm<br/>"
                    "<b>II</b> Animizm<br/>"
                    "<b>III</b> Fetishizm<br/>"
                    "<b>IV</b> Matriarxat<br/>"
                    "<b>V</b> Patriarxat"
                    "</div>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.7;'>"
                    "<b>a</b> Ayol — ona atrofida birlashgan urug' jamoasi davri<br/>"
                    "<b>b</b> Odamning biror hayvon yoki o'simlik bilan qarindoshligiga ishonish<br/>"
                    "<b>c</b> Jonlar va ruhlarning mavjudligiga e'tiqod<br/>"
                    "<b>d</b> Erkak — ota urug'i davri<br/>"
                    "<b>e</b> Buyumlarning omad keltirishi yoki balo-qazoni bartaraf etishiga ishonish"
                    "</div>"
                    "</div>"
                ),
                "explanation": "Totemizm — hayvon/o'simlik bilan qarindoshlik (b); Animizm — jon-ruhlarga e'tiqod (c); Fetishizm — jonsiz buyumlarga e'tiqod (e); Matriarxat — ona urug'i (a); Patriarxat — ota urug'i (d).",
                "options": [
                    ("A", "I-b, II-c, III-e, IV-a, V-d", True),
                    ("B", "I-a, II-c, III-e, IV-b, V-d", False),
                    ("C", "I-b, II-e, III-c, IV-a, V-d", False),
                    ("D", "I-c, II-b, III-e, IV-a, V-d", False),
                ],
            },
            # 7
            {
                "body": (
                    "<p>Tarixiy joyni aniqlang. Bu g'or Boysun tog'laridan topilgan, o'rta paleolit "
                    "davri madaniyatining jahonga mashhur yodgorligi hisoblanadi. Bu yerdan 8–9 yashar "
                    "neandertal bolaning suyak qoldiqlari topilgan.</p>"
                ),
                "explanation": "Teshiktosh g'ori — Boysun tog'larida joylashgan bo'lib, akademik A.P.Okladnikov tomonidan neandertal bola skeleti topilgan.",
                "options": [
                    ("A", "Teshiktosh g'ori", True),
                    ("B", "Selungur", False),
                    ("C", "Ko'lbuloq", False),
                    ("D", "Zarautsoy", False),
                ],
            },
            # 8
            {
                "body": (
                    "<p>Tarixiy shaxsni aniqlang. U bir necha jangda giksoslarni tor-mor etib, "
                    "bosqinchilarni Misrdan haydab chiqardi. Itoatsiz hukmdorlarni o'ziga bo'ysundirib, "
                    "yangi fir'avnlar sulolasiga asos soldi, shu davrdan Yangi podsholik boshlandi.</p>"
                ),
                "explanation": "Yaxmos I — giksoslar zulmini tugatib, Misrni qayta birlashtirgan va Yangi podsholikka asos solgan buyuk fir'avn.",
                "options": [
                    ("A", "Yaxmos", True),
                    ("B", "Tutmos II", False),
                    ("C", "Tutmos III", False),
                    ("D", "Kambiz II", False),
                ],
            },
            # 9
            {
                "body": (
                    "<p>Tarixiy joyni aniqlang. Bu manzilgoh Surxondaryo vohasida joylashgan, ikki qismdan "
                    "(qal'a va uning atrofi) iborat bo'lib, bronza davriga oid ilk shahar alomatlari saqlangan. "
                    "Bu yerdan ibodatxona qoldiqlari topilgan.</p>"
                ),
                "explanation": "Jarqo'ton — Surxondaryoda joylashgan, O'zbekiston hududidagi eng qadimgi ilk shahar va otashparastlik ibodatxonasi topilgan bronza davri yodgorligidir.",
                "options": [
                    ("A", "Jarqo'ton", True),
                    ("B", "Sopollitepa", False),
                    ("C", "Zamonbobo", False),
                    ("D", "Ko'lbuloq", False),
                ],
            },
            # 10
            {
                "body": (
                    "<p>Tarixiy shaxsni aniqlang. 1822-yilda bu fransuz olimi Rozett bitiktoshi yordamida "
                    "Misr iyerogliflarini birinchi bo'lib o'qishga muvaffaq bo'ldi.</p>"
                ),
                "explanation": "Jak-Fransua Shampolyon — qadimgi Misr iyerogliflarini birinchi marta o'qigan va misrshunoslik faniga asos solgan fransuz olimi.",
                "options": [
                    ("A", "Jak-Fransua Shampolyon", True),
                    ("B", "Gerodot", False),
                    ("C", "Strabon", False),
                    ("D", "Arrian", False),
                ],
            },
            # 11
            {
                "body": (
                    "<p>Quyidagi manzilgohlardan qaysilari O'rta Osiyoning mezolit davriga oid?</p>"
                    "<div style='padding:10px;border:1px solid #cbd5e1;border-radius:8px;background:rgba(100,116,139,0.05);line-height:1.7;font-size:13.5px;margin:10px 0;'>"
                    "1) Obishir<br/>"
                    "2) Qo'shilish<br/>"
                    "3) Machay<br/>"
                    "4) Sopollitepa<br/>"
                    "5) Jarqo'ton<br/>"
                    "6) Zarautsoy"
                    "</div>"
                ),
                "explanation": "Obishir, Qo'shilish, Machay va Zarautsoy mezolit (o'rta tosh) davriga oiddir (1, 2, 3, 6). Sopollitepa va Jarqo'ton bronza davriga tegishli.",
                "options": [
                    ("A", "1, 2, 3, 6", True),
                    ("B", "1, 4, 5, 6", False),
                    ("C", "2, 3, 4, 5", False),
                    ("D", "1, 2, 4, 6", False),
                ],
            },
            # 12
            {
                "body": "<p>Qadimgi Misrda vaqt necha bo'lakka ajratilgan suv soati yordamida o'lchangan?</p>",
                "explanation": "Qadimgi Misrda kecha va kunduz 12 soatdan, jami 24 soatga bo'lingan suv soatlari («klepsidra») yordamida o'lchangan.",
                "options": [
                    ("A", "24 ta", True),
                    ("B", "12 ta", False),
                    ("C", "30 ta", False),
                    ("D", "60 ta", False),
                ],
            },
            # 13
            {
                "body": "<p>Eng qadimgi davr (tosh davri) uchun xos bo'lgan holatni aniqlang.</p>",
                "explanation": "Tosh davrida odamlar ibtidoiy to'da va keyinchalik urug' jamoalariga birlashib, birgalikda oziq-ovqat topgan va mehnat qilgan.",
                "options": [
                    ("A", "Odamlar to'da va urug' jamoalariga birlashib, umumiy mehnat qilishgan", True),
                    ("B", "Yozma davlat qonunlari mavjud edi", False),
                    ("C", "Metall pul muomalada bo'lgan", False),
                    ("D", "Shaharlar allaqachon rivojlangan edi", False),
                ],
            },
            # 14
            {
                "body": (
                    "<p>Quyidagi xudolardan qaysilari Qadimgi Misrga tegishli?</p>"
                    "<div style='padding:10px;border:1px solid #cbd5e1;border-radius:8px;background:rgba(100,116,139,0.05);line-height:1.7;font-size:13.5px;margin:10px 0;'>"
                    "1) Ptax<br/>"
                    "2) Zevs<br/>"
                    "3) Osiris<br/>"
                    "4) Indra<br/>"
                    "5) Amon-Ra<br/>"
                    "6) Ahuramazda"
                    "</div>"
                ),
                "explanation": "Ptax, Osiris va Amon-Ra Misr panteoniga kiradi (1, 3, 5). Zevs — Yunoniston, Indra — Hindiston, Ahuramazda — Zardushtiylik xudolaridir.",
                "options": [
                    ("A", "1, 3, 5", True),
                    ("B", "2, 4, 6", False),
                    ("C", "1, 2, 3", False),
                    ("D", "4, 5, 6", False),
                ],
            },
            # 15
            {
                "body": "<p>Xufu (Xeops) piramidasining balandligi qancha bo'lgan?</p>",
                "explanation": "Giza shahridagi eng ulkan Xufu piramidasi qadimgi zamonda qariyb 147 metr balandlikda qad ko'targan.",
                "options": [
                    ("A", "147 metr", True),
                    ("B", "100 metr", False),
                    ("C", "200 metr", False),
                    ("D", "50 metr", False),
                ],
            },
            # 16
            {
                "body": (
                    "<p>Quyidagi voqealar to'g'ri xronologik ketma-ketlikda ko'rsatilgan javobni toping.</p>"
                    "<div style='padding:12px;border:1px solid #cbd5e1;border-radius:8px;background:rgba(100,116,139,0.05);line-height:1.8;font-size:13.5px;margin:12px 0;'>"
                    "1) Yagona Misr davlati tashkil topdi (mil.avv. 3000)<br/>"
                    "2) Xufu piramidasi qurildi (mil.avv. 2600)<br/>"
                    "3) Giksoslar Misrga bostirib kirdi (mil.avv. XVIII asr)<br/>"
                    "4) Yaxmos giksoslarni quvib chiqardi (mil.avv. XVI asr)<br/>"
                    "5) Kambiz II Misrni bosib oldi (mil.avv. 525)"
                    "</div>"
                ),
                "explanation": "Ketma-ketlik: mil.avv. 3000 (1) → 2600 (2) → XVIII asr (3) → XVI asr (4) → 525 (5). To'g'ri javob: 1, 2, 3, 4, 5.",
                "options": [
                    ("A", "1, 2, 3, 4, 5", True),
                    ("B", "1, 3, 2, 4, 5", False),
                    ("C", "2, 1, 3, 4, 5", False),
                    ("D", "1, 2, 4, 3, 5", False),
                ],
            },
            # 17 (Sxematik diagramma)
            {
                "body": (
                    "<p>Sxematik diagrammada tosh-metall davrlari darajama-daraja ko'rsatilgan "
                    "(paleolit → mezolit-neolit → eneolit → bronza). "
                    "1–4 raqamlaridan qaysi biri <b>eng so'nggi (metall) davrni</b> bildiradi?</p>"
                    "<div style='display:flex;flex-direction:column;align-items:center;gap:6px;margin:16px 0;'>"
                    "<div style='border:2px solid #3b82f6;border-radius:8px;padding:9px 22px;font-weight:bold;font-size:13.5px;background:rgba(59,130,246,0.08);width:270px;text-align:center;'>1 – eng qadimgi davr</div>"
                    "<div style='font-size:16px;color:#64748b;'>↓</div>"
                    "<div style='border:2px solid #3b82f6;border-radius:8px;padding:9px 22px;font-weight:bold;font-size:13.5px;background:rgba(59,130,246,0.08);width:270px;text-align:center;'>2</div>"
                    "<div style='font-size:16px;color:#64748b;'>↓</div>"
                    "<div style='border:2px solid #3b82f6;border-radius:8px;padding:9px 22px;font-weight:bold;font-size:13.5px;background:rgba(59,130,246,0.08);width:270px;text-align:center;'>3</div>"
                    "<div style='font-size:16px;color:#64748b;'>↓</div>"
                    "<div style='border:2px solid #3b82f6;border-radius:8px;padding:9px 22px;font-weight:bold;font-size:13.5px;background:rgba(59,130,246,0.08);width:270px;text-align:center;'>4 – eng so'nggi (metall) davr</div>"
                    "</div>"
                ),
                "explanation": "Bronza davri tosh-metall davrlarining eng so'nggi bosqichi bo'lib, diagrammada eng pastki (4-band)da ko'rsatilgan.",
                "options": [
                    ("A", "4", True),
                    ("B", "1", False),
                    ("C", "2", False),
                    ("D", "3", False),
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
                    "<tr style='border-bottom:1px solid #e2e8f0;'><td style='padding:8px;text-align:center;border-right:1px solid #cbd5e1;font-weight:bold;'>1</td><td style='padding:8px 12px;border-right:1px solid #cbd5e1;'>Yaxmosning giksoslarni haydashi</td><td style='padding:8px 12px;'>Yangi podsholik davri boshlandi</td></tr>"
                    "<tr style='border-bottom:1px solid #e2e8f0;background:rgba(100,116,139,0.03);'><td style='padding:8px;text-align:center;border-right:1px solid #cbd5e1;font-weight:bold;'>2</td><td style='padding:8px 12px;border-right:1px solid #cbd5e1;'>Kambiz II ning Misrni bosib olishi (525)</td><td style='padding:8px 12px;'>Misr mustaqilligini saqlab qoldi</td></tr>"
                    "<tr style='border-bottom:1px solid #e2e8f0;'><td style='padding:8px;text-align:center;border-right:1px solid #cbd5e1;font-weight:bold;'>3</td><td style='padding:8px 12px;border-right:1px solid #cbd5e1;'>J-F. Shampolyonning Rozett bitiktoshini o'qishi</td><td style='padding:8px 12px;'>Iyerogliflar sirlari ochildi</td></tr>"
                    "<tr style='border-bottom:1px solid #e2e8f0;background:rgba(100,116,139,0.03);'><td style='padding:8px;text-align:center;border-right:1px solid #cbd5e1;font-weight:bold;'>4</td><td style='padding:8px 12px;border-right:1px solid #cbd5e1;'>Menesning g'alabasi (mil.avv. 3000)</td><td style='padding:8px 12px;'>Yuqori va Quyi Misr birlashdi</td></tr>"
                    "<tr style='border-bottom:1px solid #e2e8f0;'><td style='padding:8px;text-align:center;border-right:1px solid #cbd5e1;font-weight:bold;'>5</td><td style='padding:8px 12px;border-right:1px solid #cbd5e1;'>Mezolit davrida o'q-yoy kashf etilishi</td><td style='padding:8px 12px;'>Dehqonchilik butunlay to'xtadi</td></tr>"
                    "<tr><td style='padding:8px;text-align:center;border-right:1px solid #cbd5e1;font-weight:bold;'>6</td><td style='padding:8px 12px;border-right:1px solid #cbd5e1;'>Bronza davrida g'ildirak kashf etilishi</td><td style='padding:8px 12px;'>Dastlabki aravalar paydo bo'ldi</td></tr>"
                    "</tbody></table></div>"
                ),
                "explanation": "2 xato: Kambiz II bosib olgach Misr mustaqilligini yo'qotdi. 5 xato: o'q-yoy ov qilishni yengillashtirgan. To'g'ri: 1, 3, 4, 6.",
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
                    "<th style='padding:8px 12px;border-right:1px solid #cbd5e1;width:140px;text-align:left;'>Davr</th>"
                    "<th style='padding:8px 12px;border-right:1px solid #cbd5e1;text-align:left;'>O'rta Osiyo voqeasi</th>"
                    "<th style='padding:8px 12px;text-align:left;'>Qadimgi Misr voqeasi</th>"
                    "</tr></thead>"
                    "<tbody>"
                    "<tr style='border-bottom:1px solid #e2e8f0;'><td style='padding:10px 12px;border-right:1px solid #cbd5e1;font-weight:bold;'>Bronza davri</td><td style='padding:10px 12px;border-right:1px solid #cbd5e1;font-weight:bold;color:#f59e0b;font-size:16px;'>a</td><td style='padding:10px 12px;'>Yangi podsholik davri boshlandi (Yaxmos)</td></tr>"
                    "<tr style='background:rgba(100,116,139,0.03);'><td style='padding:10px 12px;border-right:1px solid #cbd5e1;font-weight:bold;'>Mil.avv. 3000-yil atrofi</td><td style='padding:10px 12px;border-right:1px solid #cbd5e1;'>Bronza davriga o'tish davom etardi</td><td style='padding:10px 12px;font-weight:bold;color:#f59e0b;font-size:16px;'>b</td></tr>"
                    "</tbody></table></div>"
                    "<div style='padding:10px 14px;background:rgba(100,116,139,0.08);border-radius:8px;font-size:13px;line-height:1.6;margin-top:8px;'>"
                    "<b>Ma'lumotlar:</b><br/>"
                    "1) Yagona Misr davlati tashkil topdi;<br/>"
                    "2) Zamonbobo, Sopollitepa, Jarqo'ton manzilgohlari vujudga keldi;<br/>"
                    "3) Xufu piramidasi qurildi;<br/>"
                    "4) Mezolit davri davom etardi."
                    "</div>"
                ),
                "explanation": "a=2: Zamonbobo, Sopollitepa, Jarqo'ton O'rta Osiyoda bronza davri manzilgohlari. b=1: Mil.avv. 3000-yilda Menes tomonidan Yagona Misr davlati tashkil topdi.",
                "options": [
                    ("A", "a-2, b-1", True),
                    ("B", "a-3, b-4", False),
                    ("C", "a-2, b-4", False),
                    ("D", "a-1, b-2", False),
                ],
            },
            # 20 (Eyler-Venn diagrammasi)
            {
                "body": (
                    "<p>Quyida berilgan ma'lumotlarni tahlil qilib <b>Eyler-Venn diagrammasiga</b> mos keladigan javoblarni aniqlang.<br/>"
                    "<i>(Paleolit va neolit davri odami)</i></p>"
                    "<div style='display:flex;justify-content:center;margin:18px 0;'>"
                    "<svg width='360' height='190' viewBox='0 0 360 190' style='max-width:100%;height:auto;'>"
                    "<circle cx='130' cy='95' r='80' fill='rgba(59, 130, 246, 0.15)' stroke='#3b82f6' stroke-width='2.5' />"
                    "<circle cx='230' cy='95' r='80' fill='rgba(245, 158, 11, 0.15)' stroke='#f59e0b' stroke-width='2.5' />"
                    "<text x='85' y='85' font-size='18' font-weight='bold' fill='currentColor' text-anchor='middle'>I</text>"
                    "<text x='85' y='108' font-size='13' font-weight='600' fill='currentColor' text-anchor='middle'>Paleolit</text>"
                    "<text x='180' y='98' font-size='18' font-weight='bold' fill='currentColor' text-anchor='middle'>III</text>"
                    "<text x='275' y='85' font-size='18' font-weight='bold' fill='currentColor' text-anchor='middle'>II</text>"
                    "<text x='275' y='108' font-size='13' font-weight='600' fill='currentColor' text-anchor='middle'>Neolit</text>"
                    "</svg>"
                    "</div>"
                    "<div style='font-size:13.5px;line-height:1.8;padding:12px;background:rgba(100,116,139,0.06);border-radius:8px;'>"
                    "<b>a)</b> Termachilik va ovchilik bilan shug'ullangan (o'zlashtiruvchi xo'jalik);<br/>"
                    "<b>b)</b> Dehqonchilik va chorvachilik bilan shug'ullangan (ishlab chiqaruvchi xo'jalik);<br/>"
                    "<b>c)</b> Tosh qurollardan foydalangan;<br/>"
                    "<b>d)</b> G'orlarda yashagan;<br/>"
                    "<b>e)</b> Urug' jamoalariga birlashgan;<br/>"
                    "<b>f)</b> O'troq turmush tarzida, paxsa uylarda yashagan."
                    "</div>"
                ),
                "explanation": "I (faqat paleolit): termachilik-ovchilik (a), g'orda yashash (d). II (faqat neolit): dehqonchilik-chorvachilik (b), o'troq turmush (f). III (umumiy kesishma): tosh qurollar (c), urug' jamoasi (e).",
                "options": [
                    ("A", "I-a,d; II-c,e; III-b,f", False),
                    ("B", "I-b,f; II-c,e; III-a,d", True),
                    ("C", "I-a,e; II-c,d; III-b,f", False),
                    ("D", "I-a,d; II-e,f; III-b,c", False),
                ],
            },
            # 21
            {
                "body": (
                    "<p>Quyidagi tosh-metall davrlari va ularning sanalarini to'g'ri moslashtiring.</p>"
                    "<div style='display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:12px;margin:14px 0;'>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.7;'>"
                    "<b>1)</b> Paleolit<br/>"
                    "<b>2)</b> Mezolit<br/>"
                    "<b>3)</b> Neolit<br/>"
                    "<b>4)</b> Eneolit"
                    "</div>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.7;'>"
                    "<b>a)</b> mil.avv. 6–4 ming yillik<br/>"
                    "<b>b)</b> mil.avv. 12–7 ming yillik<br/>"
                    "<b>c)</b> mil.avv. 1 mln – 12 ming yil<br/>"
                    "<b>d)</b> mil.avv. 4–3 ming yillik o'rtasi"
                    "</div>"
                    "</div>"
                ),
                "explanation": "1-c (Paleolit — 1 mln - 12 ming yil), 2-b (Mezolit — 12-7 ming yillik), 3-a (Neolit — 6-4 ming yillik), 4-d (Eneolit — 4-3 ming yillik o'rtasi).",
                "options": [
                    ("A", "1-c; 2-b; 3-a; 4-d", True),
                    ("B", "1-b; 2-c; 3-d; 4-a", False),
                    ("C", "1-c; 2-a; 3-b; 4-d", False),
                    ("D", "1-d; 2-b; 3-a; 4-c", False),
                ],
            },
            # 22
            {
                "body": "<p>Qadimgi Misrda «nom»larni kim boshqargan?</p>",
                "explanation": "Qadimgi Misrdagi har bir viloyat («nom») boshqaruvchisi nomarx deb atalgan.",
                "options": [
                    ("A", "Nomarx", True),
                    ("B", "Kohin", False),
                    ("C", "Fir'avn", False),
                    ("D", "Vazir", False),
                ],
            },
            # 23
            {
                "body": "<p>Qadimgi Misr alifbosi nechta iyeroglifdan iborat bo'lgan?</p>",
                "explanation": "Qadimgi Misr yozuvida qariyb 750 ta asosiy iyeroglif belgisi ishlatilgan.",
                "options": [
                    ("A", "750 ta", True),
                    ("B", "500 ta", False),
                    ("C", "1000 ta", False),
                    ("D", "300 ta", False),
                ],
            },
            # 24
            {
                "body": (
                    "<p>Quyidagi xudolardan qaysilari Qadimgi Misrga tegishli?</p>"
                    "<div style='padding:10px;border:1px solid #cbd5e1;border-radius:8px;background:rgba(100,116,139,0.05);line-height:1.7;font-size:13.5px;margin:10px 0;'>"
                    "1) Ptax<br/>"
                    "2) Osiris<br/>"
                    "3) Zevs<br/>"
                    "4) Amon-Ra<br/>"
                    "5) Ahriman<br/>"
                    "6) Anubis"
                    "</div>"
                ),
                "explanation": "Ptax, Osiris, Amon-Ra va Anubis Misr xudolaridir (1, 2, 4, 6). Zevs — Yunoniston, Ahriman — Zardushtiylik.",
                "options": [
                    ("A", "1, 2, 4, 6", True),
                    ("B", "2, 3, 5, 6", False),
                    ("C", "1, 3, 4, 5", False),
                    ("D", "3, 4, 5, 6", False),
                ],
            },
            # 25
            {
                "body": (
                    "<p>Quyidagi manzilgohlardan qaysilari O'rta Osiyoning bronza davriga oid?</p>"
                    "<div style='padding:10px;border:1px solid #cbd5e1;border-radius:8px;background:rgba(100,116,139,0.05);line-height:1.7;font-size:13.5px;margin:10px 0;'>"
                    "1) Sopollitepa<br/>"
                    "2) Jarqo'ton<br/>"
                    "3) Zamonbobo<br/>"
                    "4) Teshiktosh<br/>"
                    "5) Selungur<br/>"
                    "6) Ko'lbuloq"
                    "</div>"
                ),
                "explanation": "Sopollitepa, Jarqo'ton va Zamonbobo bronza davrining mashhur yodgorliklaridir (1, 2, 3). Teshiktosh, Selungur va Ko'lbuloq paleolit davriga tegishli.",
                "options": [
                    ("A", "1, 2, 3", True),
                    ("B", "4, 5, 6", False),
                    ("C", "1, 4, 5", False),
                    ("D", "2, 3, 6", False),
                ],
            },
            # 26
            {
                "body": "<p>Ibtidoiy jamoada ayol-ona atrofida birlashish davri qanday atalgan?</p>",
                "explanation": "Matriarxat (ona urug'i) — ibtidoiy jamiyatda qarindoshlik ona avlodi orqali belgilangan va ayol yetakchilik qilgan davr.",
                "options": [
                    ("A", "Matriarxat", True),
                    ("B", "Patriarxat", False),
                    ("C", "Totemizm", False),
                    ("D", "Animizm", False),
                ],
            },
            # 27
            {
                "body": "<p>O'zaro muvofiqlik SAQLANMAGAN javobni toping.</p>",
                "explanation": "Anubis marhumlar va mumiyolash homiysi bo'lgan chiyabo'ri boshli xudo. Misrliklar quyosh xudosi sifatida Ra (Amon-Ra)ni bilishgan.",
                "options": [
                    ("A", "Xapi — Nil xudosi", False),
                    ("B", "Osiris — yerosti saltanati xudosi", False),
                    ("C", "Anubis — quyosh xudosi", True),
                    ("D", "Amon-Ra — quyosh xudosi", False),
                ],
            },
            # 28
            {
                "body": "<p>Sopol idishlar yasashning kashf etilishi qaysi davr boshlanishini belgilaydi?</p>",
                "explanation": "Kulolchilikning (loy idishlar pishirish) paydo bo'lishi yangi tosh davri — neolitning asosiy xususiyati hisoblanadi («neolit inqilobi»).",
                "options": [
                    ("A", "Neolit", True),
                    ("B", "Paleolit", False),
                    ("C", "Mezolit", False),
                    ("D", "Bronza", False),
                ],
            },
            # 29
            {
                "body": (
                    "<p>Quyida berilgan ma'lumotlarga mos yakuniy xulosalar (to'g'ri/noto'g'ri) keltirilgan javobni aniqlang.</p>"
                    "<div style='padding:10px;border:1px solid #cbd5e1;border-radius:8px;background:rgba(100,116,139,0.05);line-height:1.7;font-size:13.5px;margin:10px 0;'>"
                    "I. Kromanyon odami hozirgi qiyofadagi odamga o'xshash bo'lgan.<br/>"
                    "II. Sfinksning boshi sherniki, tanasi esa odamniki bo'lgan.<br/>"
                    "III. Mumiyolash jarayoni qariyb 70 kun davom etgan."
                    "</div>"
                ),
                "explanation": "I to'g'ri (kromanyon — hozirgi qiyofadagi odam). II noto'g'ri (tanasi sher, boshi fir'avn/odam qiyofasida). III to'g'ri (70 kun davom etgan).",
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
                    "<b>1)</b> Yaxmos<br/>"
                    "<b>2)</b> Menes<br/>"
                    "<b>3)</b> J-F. Shampolyon"
                    "</div>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.7;'>"
                    "<b>a)</b> Yuqori va Quyi Misrni birlashtirgan birinchi fir'avn<br/>"
                    "<b>b)</b> Giksoslarni Misrdan haydab, Yangi podsholikka asos solgan<br/>"
                    "<b>c)</b> 1822-yilda Misr iyerogliflarini o'qishga muvaffaq bo'lgan olim"
                    "</div>"
                    "</div>"
                ),
                "explanation": "1-b (Yaxmos — giksoslarni haydagan), 2-a (Menes — birlashtirgan birinchi fir'avn), 3-c (Shampolyon — iyerogliflarni o'qigan).",
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
                    "<p>Qadimgi odam turlari va ular topilgan hududlarni to'g'ri moslashtiring.</p>"
                    "<div style='display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:12px;margin:14px 0;'>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.7;'>"
                    "<b>1)</b> Avstralopitek<br/>"
                    "<b>2)</b> Sinantrop<br/>"
                    "<b>3)</b> Kromanyon"
                    "</div>"
                    "<div style='border:1px solid #cbd5e1;border-radius:8px;padding:12px;background:rgba(100,116,139,0.05);font-size:13.5px;line-height:1.7;'>"
                    "<b>a)</b> Fransiya<br/>"
                    "<b>b)</b> Janubiy Afrika<br/>"
                    "<b>c)</b> Xitoy"
                    "</div>"
                    "</div>"
                ),
                "explanation": "1-b (Avstralopitek — Janubiy Afrika), 2-c (Sinantrop — Xitoy), 3-a (Kromanyon — Fransiya).",
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
                    "<p>Neolit davrining kashfiyotlaridan qaysilari to'g'ri ko'rsatilgan?</p>"
                    "<div style='padding:10px;border:1px solid #cbd5e1;border-radius:8px;background:rgba(100,116,139,0.05);line-height:1.7;font-size:13.5px;margin:10px 0;'>"
                    "1) Kulolchilik<br/>"
                    "2) To'quvchilik<br/>"
                    "3) Yozuv<br/>"
                    "4) Metall pul<br/>"
                    "5) Silliqlash va parmalash usullari<br/>"
                    "6) Poyezd"
                    "</div>"
                ),
                "explanation": "Kulolchilik, to'quvchilik hamda toshlarni silliqlash va parmalash neolit davrining eng muhim texnologik kashfiyotlaridir (1, 2, 5).",
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
                    "<b>A)</b> Yaxmosning giksoslarni Misrdan haydab chiqarishi;<br/>"
                    "<b>B)</b> Kambiz II ning Misrni bosib olishi (mil.avv. 525);<br/>"
                    "<b>C)</b> Xufu piramidasining qurilishi (mil.avv. 2600);<br/>"
                    "<b>D)</b> Yagona Misr davlatining tashkil topishi (mil.avv. 3000);<br/>"
                    "<b>E)</b> J-F. Shampolyonning iyerogliflarni o'qishga muvaffaq bo'lishi (1822);<br/>"
                    "<b>F)</b> Giksoslarning Misrga bostirib kirishi (mil.avv. XVIII asr)"
                    "</div>"
                    "<p><b>Berilgan voqealardan qaysi biri eng avval sodir bo'lgan?</b></p>"
                ),
                "explanation": "Mil.avv. 3000-yil — ro'yxatdagi eng qadimgi sana. To'g'ri javob: D (Yagona Misr davlatining tashkil topishi).",
                "options": [
                    ("A", "Yaxmosning giksoslarni Misrdan haydab chiqarishi", False),
                    ("B", "Kambiz II ning Misrni bosib olishi (mil.avv. 525)", False),
                    ("C", "Xufu piramidasining qurilishi (mil.avv. 2600)", False),
                    ("D", "Yagona Misr davlatining tashkil topishi (mil.avv. 3000)", True),
                    ("E", "J-F. Shampolyonning iyerogliflarni o'qishga muvaffaq bo'lishi (1822)", False),
                    ("F", "Giksoslarning Misrga bostirib kirishi (mil.avv. XVIII asr)", False),
                ],
            },
            # 34 (Bank A-F)
            {
                "body": (
                    "<div style='padding:12px 14px;background:rgba(59,130,246,0.08);border:1px solid rgba(59,130,246,0.3);border-radius:8px;font-size:13px;line-height:1.7;margin-bottom:12px;'>"
                    "<b>33–35-topshiriqlarga mos javoblarni quyidagi banklardan (A–F) tanlang:</b><br/>"
                    "<b>A)</b> Yaxmosning giksoslarni Misrdan haydab chiqarishi;<br/>"
                    "<b>B)</b> Kambiz II ning Misrni bosib olishi (mil.avv. 525);<br/>"
                    "<b>C)</b> Xufu piramidasining qurilishi (mil.avv. 2600);<br/>"
                    "<b>D)</b> Yagona Misr davlatining tashkil topishi (mil.avv. 3000);<br/>"
                    "<b>E)</b> J-F. Shampolyonning iyerogliflarni o'qishga muvaffaq bo'lishi (1822);<br/>"
                    "<b>F)</b> Giksoslarning Misrga bostirib kirishi (mil.avv. XVIII asr)"
                    "</div>"
                    "<p><b>Yangi podsholik davri boshlanishiga bevosita sabab bo'lgan voqeani aniqlang.</b></p>"
                ),
                "explanation": "Yaxmos giksoslarni haydab chiqarib, Yangi podsholikka asos soldi. To'g'ri javob: A.",
                "options": [
                    ("A", "Yaxmosning giksoslarni Misrdan haydab chiqarishi", True),
                    ("B", "Kambiz II ning Misrni bosib olishi (mil.avv. 525)", False),
                    ("C", "Xufu piramidasining qurilishi (mil.avv. 2600)", False),
                    ("D", "Yagona Misr davlatining tashkil topishi (mil.avv. 3000)", False),
                    ("E", "J-F. Shampolyonning iyerogliflarni o'qishga muvaffaq bo'lishi (1822)", False),
                    ("F", "Giksoslarning Misrga bostirib kirishi (mil.avv. XVIII asr)", False),
                ],
            },
            # 35 (Bank A-F)
            {
                "body": (
                    "<div style='padding:12px 14px;background:rgba(59,130,246,0.08);border:1px solid rgba(59,130,246,0.3);border-radius:8px;font-size:13px;line-height:1.7;margin-bottom:12px;'>"
                    "<b>33–35-topshiriqlarga mos javoblarni quyidagi banklardan (A–F) tanlang:</b><br/>"
                    "<b>A)</b> Yaxmosning giksoslarni Misrdan haydab chiqarishi;<br/>"
                    "<b>B)</b> Kambiz II ning Misrni bosib olishi (mil.avv. 525);<br/>"
                    "<b>C)</b> Xufu piramidasining qurilishi (mil.avv. 2600);<br/>"
                    "<b>D)</b> Yagona Misr davlatining tashkil topishi (mil.avv. 3000);<br/>"
                    "<b>E)</b> J-F. Shampolyonning iyerogliflarni o'qishga muvaffaq bo'lishi (1822);<br/>"
                    "<b>F)</b> Giksoslarning Misrga bostirib kirishi (mil.avv. XVIII asr)"
                    "</div>"
                    "<p><b>Berilgan voqealardan qaysi biri eng keyin sodir bo'lgan?</b></p>"
                ),
                "explanation": "1822-yil — ro'yxatdagi eng so'nggi sana. To'g'ri javob: E (J-F. Shampolyonning iyerogliflarni o'qishi).",
                "options": [
                    ("A", "Yaxmosning giksoslarni Misrdan haydab chiqarishi", False),
                    ("B", "Kambiz II ning Misrni bosib olishi (mil.avv. 525)", False),
                    ("C", "Xufu piramidasining qurilishi (mil.avv. 2600)", False),
                    ("D", "Yagona Misr davlatining tashkil topishi (mil.avv. 3000)", False),
                    ("E", "J-F. Shampolyonning iyerogliflarni o'qishga muvaffaq bo'lishi (1822)", True),
                    ("F", "Giksoslarning Misrga bostirib kirishi (mil.avv. XVIII asr)", False),
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
                "title": "Qadimgi manbalar.",
                "parts": [
                    ("a", "O'rta Osiyo tarixi bo'yicha eng qadimgi yozma manbani yozing.", "Avesto"),
                    ("b", "Fors shohi Doro I buyrug'i bilan qoyaga yozdirilgan mashhur yozuvni yozing.", "Behistun yozuvlari (Behistun kitobasi)"),
                ],
                "explanation": "a) Avesto; b) Behistun yozuvlari.",
            },
            # 37
            {
                "title": "Eng qadimgi odam turlari.",
                "parts": [
                    ("a", "Yava orolidan topilgan qadimgi odam turini yozing.", "Pitekantrop"),
                    ("b", "Fransiyadagi g'ordan topilgan, hozirgi qiyofadagi odam turini yozing.", "Kromanyon (Kromanyon odami)"),
                ],
                "explanation": "a) Pitekantrop; b) Kromanyon (odami).",
            },
            # 38
            {
                "title": "Teshiktosh.",
                "parts": [
                    ("a", "Teshiktosh g'ori qaysi tog'lardan topilganini yozing.", "Boysun tog'lari (Boysun)"),
                    ("b", "Bu yerdan topilgan bolaning yoshini yozing.", "8–9 yosh (8-9 yashar)"),
                ],
                "explanation": "a) Boysun tog'lari; b) 8–9 yosh.",
            },
            # 39
            {
                "title": "Ibtidoiy diniy tushunchalar.",
                "parts": [
                    ("a", "Odamning biror hayvon yoki o'simlik bilan qarindoshligiga ishonish nima deb atalganini yozing.", "Totemizm"),
                    ("b", "Jonlar va ruhlarning mavjudligiga e'tiqod nima deb atalganini yozing.", "Animizm"),
                ],
                "explanation": "a) Totemizm; b) Animizm.",
            },
            # 40
            {
                "title": "O'rta Osiyoda temir davri.",
                "parts": [
                    ("a", "Temirdan birinchi bo'lib foydalangan xalqni yozing.", "Xettlar"),
                    ("b", "«Avesto»da qabilalar ittifoqi qanday atalganini yozing.", "Dax'yu (Daxyu)"),
                ],
                "explanation": "a) Xettlar; b) Dax'yu.",
            },
            # 41
            {
                "title": "Bronza davri manzilgohlari.",
                "parts": [
                    ("a", "Surxondaryo vohasidagi, ilk shahar alomatlari saqlangan bronza davri manzilgohini yozing.", "Jarqo'ton"),
                    ("b", "Buxoro viloyati, Qorako'l tumanidagi bronza davri manzilgohini yozing.", "Zamonbobo"),
                ],
                "explanation": "a) Jarqo'ton; b) Zamonbobo.",
            },
            # 42
            {
                "title": "Qadimgi Misr davlatchiligi.",
                "parts": [
                    ("a", "Yuqori va Quyi Misrni birlashtirgan birinchi fir'avnni yozing.", "Menes"),
                    ("b", "Yagona Misr davlatining birinchi poytaxtini yozing.", "Memfis"),
                ],
                "explanation": "a) Menes; b) Memfis.",
            },
            # 43
            {
                "title": "Giksoslar bosqini.",
                "parts": [
                    ("a", "Giksoslar Misrga qaysi asrda bostirib kirganini yozing.", "Mil.avv. XVIII asr (mil.avv. 18-asr)"),
                    ("b", "Giksoslarni Misrdan haydab chiqargan fir'avnni yozing.", "Yaxmos (Yaxmos I)"),
                ],
                "explanation": "a) Mil.avv. XVIII asr; b) Yaxmos.",
            },
            # 44
            {
                "title": "Piramidalar.",
                "parts": [
                    ("a", "Eng mashhur uch piramida qurilgan uch fir'avn nomini yozing.", "Xufu, Xafra, Menkaura (Xeops, Xefren, Mikerin)"),
                    ("b", "Piramidalarni qo'riqlaydigan, tanasi sher va boshi odamniki bo'lgan haykalni yozing.", "Sfinks (Katta sfinks)"),
                ],
                "explanation": "a) Xufu, Xafra, Menkaura; b) Sfinks.",
            },
            # 45
            {
                "title": "Misr yozuvi.",
                "parts": [
                    ("a", "Misrliklar yozuvini yunonlar qanday atashganini yozing.", "Iyerogliflar (Iyeroglif)"),
                    ("b", "Rozett bitiktoshini o'qishga muvaffaq bo'lgan olimni yozing.", "Jak-Fransua Shampolyon (Shampolyon)"),
                ],
                "explanation": "a) Iyerogliflar; b) Jak-Fransua Shampolyon.",
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
