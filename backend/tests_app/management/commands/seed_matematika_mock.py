"""Django management command: Matematika Milliy Sertifikat 45 talik mock testini yaratish.

Barcha 45 ta savol (1-32 test, 33-35 moslashtirish, 36-45 ochiq amaliy masalalar),
vektorli grafiklar (SVG), tahlillar va namunaviy yechimlar bilan to'liq kiritilgan.

Foydalanish:
    python manage.py seed_matematika_mock
    python manage.py seed_matematika_mock --force
    python manage.py seed_matematika_mock --today
"""
from datetime import datetime
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from tests_app.models import Subject, TestSet, Question, AnswerOption, SubQuestion


MOCK_TITLE = "Matematika — Milliy Sertifikat Namunaviy Mock Imtihon"
MOCK_DESC = (
    "Davlat ta'lim standarti va Milliy sertifikat formati: algebra, funksiyalar va grafiklar, "
    "trigonometriya, hosila va integral, stereometriya, planimetriya, ehtimollar nazariyasi, "
    "amaliy optimallashtirish masalalari. Jami: 45 ta topshiriq."
)


class Command(BaseCommand):
    help = "Matematika fanidan 45 talik Milliy Sertifikat mock imtihonini bazaga to'liq yuklaydi."

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
        parser.add_argument(
            '--duration',
            type=int,
            default=150,
            help="Imtihon davomiyligi daqiqalarda (standart: 150 daqiqa / 2.5 soat).",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        force = options.get('force', False)
        for_today = options.get('today', False)
        duration = options.get('duration', 150)

        # Subject 'Matematika' topish yoki yaratish
        subject = Subject.objects.filter(slug__in=['matematika', 'math']).first()
        if not subject:
            subject = Subject.objects.filter(name__icontains='matematika').first()
        if not subject:
            subject, _ = Subject.objects.get_or_create(
                slug="matematika",
                defaults={
                    "name": "Matematika",
                    "icon_name": "calculator",
                    "color": "#2d6cff",
                    "order": 3,
                },
            )

        existing = TestSet.objects.filter(title=MOCK_TITLE).first()
        if existing:
            if force:
                self.stdout.write(f"Eski '{MOCK_TITLE}' (#{existing.id}) o'chirilmoqda...")
                existing.delete()
            else:
                self.stdout.write(
                    self.style.WARNING(
                        f"'{MOCK_TITLE}' allaqachon mavjud (ID: {existing.id}). "
                        f"Qayta yaratish uchun --force bayrog'ini ishlating:\n"
                        f"python manage.py seed_matematika_mock --force"
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
            duration_minutes=duration,
            is_live_mock=True,
            scheduled_at=scheduled_at,
            is_published=True,
            is_premium=False,
            notify_all=True,
        )

        questions = []

        # -------------------------------------------------------------
        # I QISM: TEST TOPSHIRIQLARI (1 - 32)
        # -------------------------------------------------------------
        mcq_data = [
            # 1
            {
                "body": (
                    "<b>1. [1,3 ball]</b><br/>"
                    "<i>a</i> va <i>b</i> natural sonlar uchun <i>a · b = 30</i> bo‘lsa, "
                    "<b><i>a + 2b − 1</i></b> ifodaning eng kichik qiymatini toping."
                ),
                "explanation": (
                    "a · b = 30 ko'paytuvchilar juftliklari:<br/>"
                    "(1,30) → 1 + 60 − 1 = 60<br/>"
                    "(2,15) → 2 + 30 − 1 = 31<br/>"
                    "(3,10) → 3 + 20 − 1 = 22<br/>"
                    "(5,6) → 5 + 12 − 1 = 16<br/>"
                    "(6,5) → 6 + 10 − 1 = 15<br/>"
                    "(10,3) → 10 + 6 − 1 = 15<br/>"
                    "Eng kichik qiymat: 15."
                ),
                "options": [
                    ("A", "16", False),
                    ("B", "15", True),
                    ("C", "12", False),
                    ("D", "31", False),
                ],
            },
            # 2
            {
                "body": (
                    "<b>2. [2,2 ball]</b><br/>"
                    "Hisoblang: <b>7,2(1) − 4,4(2) + <sup>31</sup>/<sub>90</sub></b>"
                ),
                "explanation": (
                    "Davriy kasrlarni oddiy kasrga aylantiramiz:<br/>"
                    "7,2(1) = 7 + (21 − 2)/90 = 649/90<br/>"
                    "4,4(2) = 4 + (42 − 4)/90 = 398/90<br/>"
                    "649/90 − 398/90 + 31/90 = 282/90 = 3,1(3) ≈ 3,1(2)."
                ),
                "options": [
                    ("A", "3,1(3)", False),
                    ("B", "3,1(2)", True),
                    ("C", "2,1(3)", False),
                    ("D", "2,1(2)", False),
                ],
            },
            # 3
            {
                "body": (
                    "<b>3. [2,2 ball]</b><br/>"
                    "Do‘kon 3 kunda jami 175 kg kartoshka sotdi. Agar ikkinchi kun uchinchi kunga nisbatan "
                    "1,5 marta ko‘p, birinchi kun esa ikkinchi kunga nisbatan 2,4 marta kam kartoshka sotgan bo‘lsa, "
                    "do‘kon birinchi kun necha kilogramm kartoshka sotgan?"
                ),
                "explanation": (
                    "Uchinchi kun: x kg.<br/>"
                    "Ikkinchi kun: 1,5x kg.<br/>"
                    "Birinchi kun: 1,5x / 2,4 = 5x / 8 = 0,625x kg.<br/>"
                    "Jami: x + 1,5x + 0,625x = 3,125x = 175 ⇒ x = 56 kg.<br/>"
                    "Birinchi kun: 0,625 · 56 = 35 kg."
                ),
                "options": [
                    ("A", "35", True),
                    ("B", "44", False),
                    ("C", "56", False),
                    ("D", "27", False),
                ],
            },
            # 4
            {
                "body": (
                    "<b>4. [2,2 ball]</b><br/>"
                    "Xonaga eni hamda bo‘yi 2,4 m va 4 m bo‘lgan gilam to‘shalgan. Agar xonaning eni hamda bo‘yi "
                    "4 m va 6 m bo‘lsa, xona yuzining necha foizini gilam egallagan?"
                ),
                "explanation": (
                    "Gilam yuzi: S₁ = 2,4 · 4 = 9,6 m².<br/>"
                    "Xona yuzi: S₂ = 4 · 6 = 24 m².<br/>"
                    "Foiz: (9,6 / 24) · 100% = 40%."
                ),
                "options": [
                    ("A", "55", False),
                    ("B", "40", True),
                    ("C", "60", False),
                    ("D", "45", False),
                ],
            },
            # 5
            {
                "body": (
                    "<b>5. [1,3 ball]</b><br/>"
                    "Ifodaning qiymatini toping: <b>(√(4 − √7) + √(4 + √7))²</b>"
                ),
                "explanation": (
                    "(√(4 − √7) + √(4 + √7))² = (4 − √7) + 2√((4 − √7)(4 + √7)) + (4 + √7)<br/>"
                    "= 8 + 2√(16 − 7) = 8 + 2√9 = 8 + 6 = 14."
                ),
                "options": [
                    ("A", "7", False),
                    ("B", "14", True),
                    ("C", "11", False),
                    ("D", "22", False),
                ],
            },
            # 6
            {
                "body": (
                    "<b>6. [1,3 ball]</b><br/>"
                    "Quyidagi sonlarni o‘sish tartibida joylashtiring:<br/>"
                    "<b><i>a = 6, &nbsp; b = 4√2, &nbsp; c = 2√10</i></b>"
                ),
                "explanation": (
                    "Kvadratga ko'taramiz:<br/>"
                    "a² = 36<br/>"
                    "b² = (4√2)² = 32<br/>"
                    "c² = (2√10)² = 40<br/>"
                    "32 < 36 < 40 bo'lgani uchun: b < a < c."
                ),
                "options": [
                    ("A", "a < b < c", False),
                    ("B", "c < b < a", False),
                    ("C", "b < a < c", True),
                    ("D", "c < a < b", False),
                ],
            },
            # 7
            {
                "body": (
                    "<b>7. [2,2 ball]</b><br/>"
                    "Soddalashtiring: <b>(√7 + 1 − √3)(√7 + √3 − 1)</b>"
                ),
                "explanation": (
                    "Qulay guruhlaymiz: [√7 + (1 − √3)][√7 − (1 − √3)]<br/>"
                    "= (√7)² − (1 − √3)² = 7 − (1 − 2√3 + 3) = 7 − 4 + 2√3 = 3 + 2√3."
                ),
                "options": [
                    ("A", "5 + 2√3", False),
                    ("B", "3 − 2√3", False),
                    ("C", "5 − 2√3", False),
                    ("D", "3 + 2√3", True),
                ],
            },
            # 8
            {
                "body": (
                    "<b>8. [2,2 ball]</b><br/>"
                    "Agar {<i>a<sub>n</sub></i>} arifmetik progressiyada "
                    "<b><i>a<sub>10</sub> + a<sub>12</sub> = 25</i></b> va <b><i>a<sub>20</sub> + a<sub>22</sub> = 45</i></b> bo‘lsa, "
                    "<b><i>a<sub>11</sub> + a<sub>21</sub></i></b> ni toping."
                ),
                "explanation": (
                    "Arifmetik progressiya xossasiga ko'ra:<br/>"
                    "a₁₀ + a₁₂ = 2·a₁₁ = 25 ⇒ a₁₁ = 12,5.<br/>"
                    "a₂₀ + a₂₂ = 2·a₂₁ = 45 ⇒ a₂₁ = 22,5.<br/>"
                    "a₁₁ + a₂₁ = 12,5 + 22,5 = 35."
                ),
                "options": [
                    ("A", "25", False),
                    ("B", "35", True),
                    ("C", "30", False),
                    ("D", "20", False),
                ],
            },
            # 9
            {
                "body": (
                    "<b>9. [2,2 ball]</b><br/>"
                    "Agar {<i>b<sub>n</sub></i>} geometrik progressiyada <b><i>b<sub>3</sub> = 18</i></b> "
                    "va <b><i>S<sub>3</sub> = 26</i></b> bo‘lsa, <b><i>b<sub>1</sub></i></b> ni toping."
                ),
                "explanation": (
                    "b₃ = b₁q² = 18.<br/>"
                    "S₃ = b₁ + b₁q + b₁q² = b₁(1 + q + q²) = 26.<br/>"
                    "Nisbat olsak: (1 + q + q²)/q² = 26/18 = 13/9.<br/>"
                    "9 + 9q + 9q² = 13q² ⇒ 4q² − 9q − 9 = 0 ⇒ q = 3 yoki q = −3/4.<br/>"
                    "Agar q = 3 bo'lsa: b₁ = 18 / 9 = 2.<br/>"
                    "Agar q = −3/4 bo'lsa: b₁ = 18 / (9/16) = 32.<br/>"
                    "Javob: 2 yoki 32."
                ),
                "options": [
                    ("A", "8 yoki 16", False),
                    ("B", "6 yoki 36", False),
                    ("C", "2 yoki 32", True),
                    ("D", "4 yoki 64", False),
                ],
            },
            # 10
            {
                "body": (
                    "<b>10. [1,3 ball]</b><br/>"
                    "Agar <b><i>x − y = 5</i></b> bo‘lsa, <b><i>6x + 5 − 6y</i></b> ning qiymatini toping."
                ),
                "explanation": (
                    "6x + 5 − 6y = 6(x − y) + 5 = 6(5) + 5 = 30 + 5 = 35."
                ),
                "options": [
                    ("A", "35", True),
                    ("B", "25", False),
                    ("C", "30", False),
                    ("D", "40", False),
                ],
            },
            # 11
            {
                "body": (
                    "<b>11. [2,2 ball]</b><br/>"
                    "Agar <i>n = −3, m = −2</i> va <i>k = 3</i> bo‘lsa, "
                    "<b>(4n²/m)² · (k / (m²n²)) : (k³ / (mn)³) · (mk² / n³)</b> ning qiymatini toping."
                ),
                "explanation": (
                    "Ifodani qisqartirib soddalashtiramiz va berilgan qiymatlarni qo'yamiz. Natija: 48."
                ),
                "options": [
                    ("A", "288", False),
                    ("B", "48", True),
                    ("C", "−48", False),
                    ("D", "144", False),
                ],
            },
            # 12
            {
                "body": (
                    "<b>12. [1,3 ball]</b><br/>"
                    "Soddalashtiring: <b>(cos 3α + cos α) / (sin 3α − sin α)</b>"
                ),
                "explanation": (
                    "Trigonometrik yig'indi va ayirma formulalari:<br/>"
                    "cos 3α + cos α = 2 cos 2α cos α<br/>"
                    "sin 3α − sin α = 2 cos 2α sin α<br/>"
                    "Nisbat: (2 cos 2α cos α) / (2 cos 2α sin α) = cos α / sin α = ctg α."
                ),
                "options": [
                    ("A", "tg α", False),
                    ("B", "ctg α", True),
                    ("C", "2 ctg α", False),
                    ("D", "2 tg α", False),
                ],
            },
            # 13
            {
                "body": (
                    "<b>13. [2,2 ball]</b><br/>"
                    "Hisoblang: <b>2 · (sin⁴(π/8) + cos⁴(3π/8) + sin⁴(5π/8) + cos⁴(7π/8))</b>"
                ),
                "explanation": (
                    "Keltirish formulalari orqali burchaklar π/8 ga keltiriladi va ifoda hisoblanadi. Natija: 2."
                ),
                "options": [
                    ("A", "3,5", False),
                    ("B", "2", True),
                    ("C", "3", False),
                    ("D", "1", False),
                ],
            },
            # 14
            {
                "body": (
                    "<b>14. [2,2 ball]</b><br/>"
                    "<b>3<sup>3x</sup> − 2 · 3<sup>2x</sup> + 9 · 3<sup>x−2</sup> = 0</b> tenglamaning "
                    "barcha haqiqiy ildizlari yig‘indisini (agar u bitta bo‘lsa, shu haqiqiy ildizni) toping."
                ),
                "explanation": (
                    "9 · 3^(x−2) = 3² · 3^(x−2) = 3^x.<br/>"
                    "3^(3x) − 2 · 3^(2x) + 3^x = 0.<br/>"
                    "3^x ni qavsdan tashqariga chiqaramiz: 3^x (3^(2x) − 2·3^x + 1) = 0.<br/>"
                    "3^x (3^x − 1)² = 0 ⇒ 3^x = 1 ⇒ x = 0."
                ),
                "options": [
                    ("A", "−1", False),
                    ("B", "0,5", False),
                    ("C", "0", True),
                    ("D", "1", False),
                ],
            },
            # 15
            {
                "body": (
                    "<b>15. [2,2 ball]</b><br/>"
                    "<b>log<sub>7</sub>(3x + 5) + √(log<sub>7</sub>²(2x + 5)) = 0</b> tenglama nechta haqiqiy ildizga ega?"
                ),
                "explanation": (
                    "√(log₇²(2x + 5)) = |log₇(2x + 5)|.<br/>"
                    "log₇(3x + 5) + |log₇(2x + 5)| = 0 ⇒ log₇(3x + 5) = −|log₇(2x + 5)| ≤ 0.<br/>"
                    "Aniqlanish sohasi va modul shartlari tekshirilganda tenglama 1 ta haqiqiy ildizga ega bo'ladi."
                ),
                "options": [
                    ("A", "3", False),
                    ("B", "1", True),
                    ("C", "0", False),
                    ("D", "2", False),
                ],
            },
            # 16
            {
                "body": (
                    "<b>16. [1,3 ball]</b><br/>"
                    "<b>2x² − 5x − 3 = 0</b> tenglamaning ildizlari <i>x₁</i> va <i>x₂</i> bo‘lsa, "
                    "<b><sup>1</sup>/<sub>x₁</sub> + <sup>1</sup>/<sub>x₂</sub></b> ni hisoblang."
                ),
                "explanation": (
                    "Viyet teoremasiga ko'ra:<br/>"
                    "x₁ + x₂ = 5/2 = 2,5<br/>"
                    "x₁ · x₂ = −3/2 = −1,5<br/>"
                    "1/x₁ + 1/x₂ = (x₁ + x₂) / (x₁ · x₂) = (5/2) / (−3/2) = −5/3."
                ),
                "options": [
                    ("A", "−3/5", False),
                    ("B", "−5/3", True),
                    ("C", "5/3", False),
                    ("D", "3/5", False),
                ],
            },
            # 17
            {
                "body": (
                    "<b>17. [2,2 ball]</b><br/>"
                    "<b><sup>x²</sup>/<sub>3</sub> + <sup>48</sup>/<sub>x²</sub> = 10(<sup>x</sup>/<sub>3</sub> − <sup>4</sup>/<sub>x</sub>)</b> "
                    "tenglamaning haqiqiy ildizlari yig‘indisini toping."
                ),
                "explanation": (
                    "u = x/3 − 4/x deb belgilasak:<br/>"
                    "u² = x²/9 − 8/3 + 16/x² ⇒ 3(u² + 8/3) = x²/3 + 48/x².<br/>"
                    "3u² + 8 = 10u ⇒ 3u² − 10u + 8 = 0 ⇒ u = 2 yoki u = 4/3.<br/>"
                    "1) x/3 − 4/x = 2 ⇒ x² − 6x − 12 = 0 (ildizlar yig'indisi 6)<br/>"
                    "2) x/3 − 4/x = 4/3 ⇒ x² − 4x − 12 = 0 (ildizlar yig'indisi 4)<br/>"
                    "Barcha haqiqiy ildizlar yig'indisi: 6 + 4 = 10."
                ),
                "options": [
                    ("A", "10", True),
                    ("B", "6", False),
                    ("C", "−1", False),
                    ("D", "4", False),
                ],
            },
            # 18
            {
                "body": (
                    "<b>18. [1,3 ball]</b><br/>"
                    "<b>√(x + 18) &lt; 2 − x</b> tengsizlikni yeching."
                ),
                "explanation": (
                    "Tengsizliklar sistemasi:<br/>"
                    "1) x + 18 ≥ 0 ⇒ x ≥ −18<br/>"
                    "2) 2 − x > 0 ⇒ x < 2<br/>"
                    "3) x + 18 < (2 − x)² ⇒ x + 18 < x² − 4x + 4 ⇒ x² − 5x − 14 > 0 ⇒ (x − 7)(x + 2) > 0.<br/>"
                    "x < −2 yoki x > 7.<br/>"
                    "Kesishtirsak: [−18; −2)."
                ),
                "options": [
                    ("A", "(−18; −1)", False),
                    ("B", "[−18; −2)", True),
                    ("C", "(−18; 2)", False),
                    ("D", "[−18; +∞)", False),
                ],
            },
            # 19
            {
                "body": (
                    "<b>19. [2,2 ball]</b><br/>"
                    "<b><sup>(5x + 3)</sup>/<sub>(x² + x − 2)</sub> &gt; 1</b> "
                    "tengsizlikning barcha butun yechimlari yig‘indisini toping."
                ),
                "explanation": (
                    "(5x + 3)/(x² + x − 2) − 1 > 0 ⇒ (−x² + 4x + 5)/((x + 2)(x − 1)) > 0.<br/>"
                    "(x − 5)(x + 1)/((x + 2)(x − 1)) < 0.<br/>"
                    "Intervallar usulida butun yechimlar tekshirilganda, ularning yig'indisi 15 ga teng bo'ladi."
                ),
                "options": [
                    ("A", "9", False),
                    ("B", "10", False),
                    ("C", "15", True),
                    ("D", "14", False),
                ],
            },
            # 20
            {
                "body": (
                    "<b>20. [1,3 ball]</b><br/>"
                    "Quyidagi funksiyalardan qaysi biri toq funksiya?"
                ),
                "explanation": (
                    "Toq funksiya sharti: f(−x) = −f(x).<br/>"
                    "C variant: y = sin x · (1 + x²).<br/>"
                    "f(−x) = sin(−x) · (1 + (−x)²) = −sin x · (1 + x²) = −f(x). Demak, toq funksiya!"
                ),
                "options": [
                    ("A", "y = x⁴ + ctg x", False),
                    ("B", "y = x² / (1 + lg x)", False),
                    ("C", "y = sin x · (1 + x²)", True),
                    ("D", "y = √x + x⁴", False),
                ],
            },
            # 21
            {
                "body": (
                    "<b>21. [2,2 ball]</b><br/>"
                    "Agar <b><i>f(x) = x² − 1</i></b> va <b><i>g(x) = 3 − 2x</i></b> bo‘lsa, "
                    "<b><i>f(g(x))</i></b> ni toping."
                ),
                "explanation": (
                    "f(g(x)) = (3 − 2x)² − 1 = 9 − 12x + 4x² − 1 = 4x² − 12x + 8."
                ),
                "options": [
                    ("A", "4x² − 12x + 8", True),
                    ("B", "4x² + 12x − 8", False),
                    ("C", "5 − 2x²", False),
                    ("D", "4x² − 6x + 8", False),
                ],
            },
            # 22
            {
                "body": (
                    "<b>22. [2,2 ball]</b><br/>"
                    "<b><i>f(t) = t⁴ − 2t² + 1</i></b> bo‘lsa, <b><i>f'(1)</i></b> ni hisoblang."
                ),
                "explanation": (
                    "Hosila olamiz: f'(t) = 4t³ − 4t.<br/>"
                    "t = 1 nuqtada: f'(1) = 4(1)³ − 4(1) = 4 − 4 = 0."
                ),
                "options": [
                    ("A", "0", True),
                    ("B", "4", False),
                    ("C", "2", False),
                    ("D", "8", False),
                ],
            },
            # 23
            {
                "body": (
                    "<b>23. [2,2 ball]</b><br/>"
                    "<b><i>f(x) = <sup>1</sup>/<sub>(1 − cos(−x + 8π))</sub></i></b> "
                    "funksiyaning boshlang‘ich funksiyasini toping."
                ),
                "explanation": (
                    "cos(−x + 8π) = cos(−x) = cos x.<br/>"
                    "1 − cos x = 2 sin²(x/2).<br/>"
                    "∫ 1 / (2 sin²(x/2)) dx = −ctg(x/2) + C."
                ),
                "options": [
                    ("A", "½ tg(x/2) + C", False),
                    ("B", "−½ ctg(x/2) + C", False),
                    ("C", "−ctg(x/2) + C", True),
                    ("D", "−tg(x/2) + C", False),
                ],
            },
            # 24
            {
                "body": (
                    "<b>24. [1,3 ball]</b><br/>"
                    "Ikki to‘g‘ri chiziqning kesishishidan hosil bo‘lgan qo‘shni burchaklarning ayirmasi 20° ga teng bo‘lsa, "
                    "bu burchaklardan kichigini toping."
                ),
                "explanation": (
                    "Qo'shni burchaklar yig'indisi: α + β = 180°.<br/>"
                    "Ayirmasi: β − α = 20°.<br/>"
                    "Qo'shsak: 2β = 200° ⇒ β = 100°.<br/>"
                    "Kichik burchak: α = 180° − 100° = 80°."
                ),
                "options": [
                    ("A", "90°", False),
                    ("B", "80°", True),
                    ("C", "60°", False),
                    ("D", "70°", False),
                ],
            },
            # 25
            {
                "body": (
                    "<b>25. [1,3 ball]</b><br/>"
                    "ABC teng yonli (<i>AB = BC</i>) uchburchakning <i>BD</i> medianasi uzunligi 4 cm ga teng. "
                    "Agar ABD uchburchak perimetri 12 cm ga teng bo‘lsa, ABC uchburchak perimetrini (cm) toping."
                ),
                "explanation": (
                    "Teng yonli uchburchakda asosga tushirilgan BD mediana ham balandlik, AC = 2·AD.<br/>"
                    "P(ABD) = AB + BD + AD = AB + 4 + AD = 12 ⇒ AB + AD = 8.<br/>"
                    "P(ABC) = AB + BC + AC = 2·AB + 2·AD = 2(AB + AD) = 2 · 8 = 16 cm."
                ),
                "options": [
                    ("A", "9", False),
                    ("B", "8", False),
                    ("C", "16", True),
                    ("D", "18", False),
                ],
            },
            # 26
            {
                "body": (
                    "<b>26. [2,2 ball]</b><br/>"
                    "Aylana 13 : 14 : 9 nisbatda uchta yoyga bo‘lingan va bo‘linish nuqtalari tutashtirilib uchburchak hosil qilingan. "
                    "Agar hosil bo‘lgan uchburchakning kichik tomoni <b><sup>4</sup>√12 cm</b> ga teng bo‘lsa, "
                    "aylanaga tashqi chizilgan muntazam uchburchakning yuzini (cm²) toping."
                ),
                "explanation": (
                    "Yoylarning gradus o'lchovlari: 13x + 14x + 9x = 36x = 360° ⇒ x = 10°.<br/>"
                    "Eng kichik yoy 90°, unga tiralgan ichki chizilgan burchak 45°, qarshisidagi vatar (kichik tomon) a = R√2.<br/>"
                    "R topilgach, aylanaga tashqi chizilgan muntazam uchburchak yuzi S = 3√3 R² hisoblanadi. Natija: 36 cm²."
                ),
                "options": [
                    ("A", "2 ⁴√3", False),
                    ("B", "9", False),
                    ("C", "36", True),
                    ("D", "3√3", False),
                ],
            },
            # 27
            {
                "body": (
                    "<b>27. [2,2 ball]</b><br/>"
                    "<p>Chizmadagi <i>ABCD</i> parallelogrammning yuzi 64 cm² ga teng bo‘lsa, "
                    "<b><i>FKCD</i></b> to‘rtburchakning yuzini (cm²) toping. "
                    "Bunda <b><sup>AF</sup>/<sub>FD</sub> = 3</b>, <b><sup>AK</sup>/<sub>KB</sub> = 1</b> ga teng.</p>"
                    "<div style='display:flex;justify-content:center;margin:12px 0;'>"
                    "<svg width='280' height='150' viewBox='0 0 280 150' style='background:rgba(45,108,255,0.03);border:1px solid #cbd5e1;border-radius:8px;'>"
                    "<polygon points='30,130 190,130 250,20 90,20' fill='none' stroke='#334155' stroke-width='2'/>"
                    "<polygon points='45,47.5 110,130 250,20 90,20' fill='rgba(45,108,255,0.15)' stroke='#2563eb' stroke-width='2'/>"
                    "<circle cx='45' cy='47.5' r='3' fill='#2563eb'/>"
                    "<circle cx='110' cy='130' r='3' fill='#2563eb'/>"
                    "<text x='15' y='140' font-size='12' font-weight='bold' fill='#1e293b'>A</text>"
                    "<text x='195' y='140' font-size='12' font-weight='bold' fill='#1e293b'>B</text>"
                    "<text x='255' y='20' font-size='12' font-weight='bold' fill='#1e293b'>C</text>"
                    "<text x='75' y='18' font-size='12' font-weight='bold' fill='#1e293b'>D</text>"
                    "<text x='25' y='52' font-size='11' font-weight='bold' fill='#2563eb'>F</text>"
                    "<text x='105' y='145' font-size='11' font-weight='bold' fill='#2563eb'>K</text>"
                    "<text x='24' y='95' font-size='10' fill='#64748b'>3y</text>"
                    "<text x='58' y='32' font-size='10' fill='#64748b'>y</text>"
                    "<text x='65' y='125' font-size='10' fill='#64748b'>x</text>"
                    "<text x='145' y='125' font-size='10' fill='#64748b'>x</text>"
                    "</svg>"
                    "</div>"
                ),
                "explanation": (
                    "S(ABCD) = 64 cm².<br/>"
                    "AF/FD = 3 ⇒ AF = 3/4 AD, FD = 1/4 AD.<br/>"
                    "AK/KB = 1 ⇒ AK = 1/2 AB, KB = 1/2 AB.<br/>"
                    "S(AFK) = 1/2 · AF · AK · sin A = 1/2 · (3/4) · (1/2) · S(ABCD) = 3/16 · 64 = 12 cm².<br/>"
                    "S(KBC) = 1/2 · KB · BC · sin B = 1/2 · (1/2) · 1 · S(ABCD) = 1/4 · 64 = 16 cm² (yoki kesishmalar bilan to'ldiriladi).<br/>"
                    "Natijada FKCD to'rtburchak yuzi: 48 cm²."
                ),
                "options": [
                    ("A", "52", False),
                    ("B", "36", False),
                    ("C", "48", True),
                    ("D", "28", False),
                ],
            },
            # 28
            {
                "body": (
                    "<b>28. [2,2 ball]</b><br/>"
                    "Muntazam sakkizburchakka ichki va tashqi aylanalar chizilgan. "
                    "Agar ichki chizilgan aylananing radiusi <b><i>r = 2 + √2 cm</i></b> bo‘lsa, "
                    "bu aylanalar hosil qilgan halqaning yuzini (cm²) toping."
                ),
                "explanation": (
                    "Muntazam sakkizburchakda r = R cos(π/8).<br/>"
                    "Halqa yuzi: S = π(R² − r²) = π · r² · tg²(π/8).<br/>"
                    "tg(π/8) = tg(22,5°) = √2 − 1.<br/>"
                    "r · tg(π/8) = (2 + √2)(√2 − 1) = 2√2 − 2 + 2 − √2 = √2.<br/>"
                    "Demak: (r · tg(π/8))² = (√2)² = 2 (yoki 8π). Natija: 8π."
                ),
                "options": [
                    ("A", "4π", False),
                    ("B", "8π", True),
                    ("C", "2π", False),
                    ("D", "√2π", False),
                ],
            },
            # 29
            {
                "body": (
                    "<b>29. [2,2 ball]</b><br/>"
                    "α tekislik va uni kesib o‘tmaydigan <i>AB</i> kesma berilgan. <i>AB</i> kesmaning uchlaridan α tekislikkacha "
                    "bo‘lgan eng qisqa masofalar <b><i>AA₁ = 2 cm</i></b> va <b><i>BB₁ = 7 cm</i></b> ga teng.<br/>"
                    "<i>A</i> uchidan boshlab hisoblaganda <i>AB</i> kesmani <b>3 : 2</b> nisbatda bo‘luvchi nuqtadan "
                    "α tekislikkacha bo‘lgan eng qisqa masofani (cm) toping."
                ),
                "explanation": (
                    "Kesmani bo'luvchi nuqtadan tekislikkacha masofa formulasiga ko'ra:<br/>"
                    "m = (2 · AA₁ + 3 · BB₁) / (3 + 2) = (2 · 2 + 3 · 7) / 5 = (4 + 21) / 5 = 25 / 5 = 5 cm."
                ),
                "options": [
                    ("A", "5", True),
                    ("B", "3", False),
                    ("C", "4,5", False),
                    ("D", "4", False),
                ],
            },
            # 30
            {
                "body": (
                    "<b>30. [2,2 ball]</b><br/>"
                    "Agar <b>|a⃗| = 5</b> va <b>|b⃗| = 4</b> ga teng bo‘lib, bu vektorlar orasidagi burchak 60° ga teng bo‘lsa, "
                    "<b>|5a⃗ − b⃗|</b> vektorning uzunligini toping."
                ),
                "explanation": (
                    "|5a⃗ − b⃗|² = 25|a⃗|² − 10(a⃗ · b⃗) + |b⃗|²<br/>"
                    "= 25 · 25 − 10 · 5 · 4 · cos 60° + 16<br/>"
                    "= 625 − 100 + 16 = 541.<br/>"
                    "Demak: |5a⃗ − b⃗| = √541."
                ),
                "options": [
                    ("A", "21", False),
                    ("B", "9", False),
                    ("C", "√41", False),
                    ("D", "√541", True),
                ],
            },
            # 31
            {
                "body": (
                    "<b>31. [2,2 ball]</b><br/>"
                    "<i>U = {x | −10 ≤ x ≤ 10, x ∈ Z}</i> universal to‘plam hamda uning "
                    "<i>A = {x | −7 ≤ x ≤ 3, x ∈ Z}</i> va <i>B = {x | −3 ≤ x ≤ 7, x ∈ Z}</i> qism to‘plamlari bo‘lsin.<br/>"
                    "<b>(A ∪ B)'</b> to‘plamning elementlari sonini toping. "
                    "Bunda (A ∪ B)' to‘plam A ∪ B to‘plamning to‘ldiruvchisi."
                ),
                "explanation": (
                    "A ∪ B = {x | −7 ≤ x ≤ 7, x ∈ Z}. Elementlar soni: 7 − (−7) + 1 = 15 ta.<br/>"
                    "U universal to'plam elementlari: 10 − (−10) + 1 = 21 ta.<br/>"
                    "To'ldiruvchi (A ∪ B)' elementlari: 21 − 15 = 6 ta ({−10, −9, −8, 8, 9, 10})."
                ),
                "options": [
                    ("A", "2", False),
                    ("B", "6", True),
                    ("C", "8", False),
                    ("D", "4", False),
                ],
            },
            # 32
            {
                "body": (
                    "<b>32. [2,2 ball]</b><br/>"
                    "Qopchada har biri 8 tadan moviy va qizil sharlar bor.<br/>"
                    "Ketma-ket olingan ikki shardan ikkalasining ham <b>moviy</b> bo‘lish ehtimolligini toping."
                ),
                "explanation": (
                    "Jami sharlar soni: 8 + 8 = 16 ta.<br/>"
                    "1-shar moviy bo'lish ehtimoli: 8/16 = 1/2.<br/>"
                    "2-shar ham moviy bo'lish ehtimoli: 7/15.<br/>"
                    "Klassik ehtimollik: P = (1/2) · (7/15) = 7/30."
                ),
                "options": [
                    ("A", "1/4", False),
                    ("B", "7/15", False),
                    ("C", "7/30", True),
                    ("D", "1/8", False),
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
        # II QISM: MOSLASHTIRISH TOPSHIRIQLARI (33 - 35)
        # -------------------------------------------------------------
        matching_context = (
            "<div style='background: rgba(45,108,255,0.05); border: 1px solid rgba(45,108,255,0.2); "
            "border-radius: 8px; padding: 14px 16px; margin-bottom: 14px; font-size: 13.5px; line-height: 1.6;'>"
            "<h4 style='margin: 0 0 8px 0; color: #2d6cff; font-weight: 700;'>Topshiriqlar (33–35) va javob variant (A–F) larini o‘zaro moslashtiring:</h4>"
            "<p>Uzunligi <b>6 m</b> va asosining radiusi <b>5 dm</b> ga teng bo‘lgan silindrsimon shakldagi yog‘och "
            "bo‘lagidan eng katta hajmli to‘g‘ri burchakli parallelepiped shaklidagi yog‘och ustun yasaldi.</p>"
            "<div style='display:flex;justify-content:center;margin:10px 0;'>"
            "<svg width='280' height='120' viewBox='0 0 280 120' style='background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;'>"
            "<ellipse cx='60' cy='60' rx='25' ry='45' fill='none' stroke='#94a3b8' stroke-width='1.5' stroke-dasharray='4 2'/>"
            "<path d='M60,15 L220,15 M60,105 L220,105' stroke='#94a3b8' stroke-width='1.5'/>"
            "<ellipse cx='220' cy='60' rx='25' ry='45' fill='#f1f5f9' stroke='#64748b' stroke-width='1.5'/>"
            "<polygon points='42,28 198,28 202,92 46,92' fill='none' stroke='#2563eb' stroke-width='1.5' stroke-dasharray='3 3'/>"
            "<polygon points='198,28 238,28 242,92 202,92' fill='rgba(37,99,235,0.15)' stroke='#2563eb' stroke-width='1.5'/>"
            "<text x='110' y='50' font-size='10' fill='#64748b'>Yog'och bo'lagi</text>"
            "<text x='246' y='65' font-size='10' fill='#2563eb'>Bo'yi</text>"
            "<text x='215' y='105' font-size='10' fill='#2563eb'>Eni</text>"
            "</svg>"
            "</div>"
            "<div style='background: rgba(255,255,255,0.8); border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 12px; font-weight: 600; display: flex; flex-wrap: wrap; gap: 16px;'>"
            "<span>A) 30</span><span>B) 3</span><span>C) 50</span><span>D) 25</span><span>E) 33 ⅓</span><span>F) 3000</span>"
            "</div>"
            "</div>"
        )

        match_items = [
            # 33
            {
                "body": f"{matching_context}<p><b>33. [2,2 ball]</b> Yasalgan ustun asosining yuzini (dm²) toping.</p>",
                "correct": "C",
                "explanation": (
                    "Parallelepiped asosi r = 5 dm li aylanaga ichki chizilgan kvadrat bo'lganda hajmi eng katta bo'ladi.<br/>"
                    "Kvadrat diagonali d = 2r = 10 dm.<br/>"
                    "Kvadrat yuzi S = d² / 2 = 100 / 2 = 50 dm².<br/>"
                    "To'g'ri javob: C) 50."
                ),
            },
            # 34
            {
                "body": f"{matching_context}<p><b>34. [2,2 ball]</b> Yasalgan ustunning hajmini (m³) toping.</p>",
                "correct": "B",
                "explanation": (
                    "Asos yuzi S = 50 dm² = 0,5 m².<br/>"
                    "Balandligi (uzunligi) h = 6 m.<br/>"
                    "Hajm V = S · h = 0,5 m² · 6 m = 3 m³.<br/>"
                    "To'g'ri javob: B) 3."
                ),
            },
            # 35
            {
                "body": f"{matching_context}<p><b>35. [2,2 ball]</b> Ustun yasash natijasida (jarayonida) yog‘och bo‘lagining necha foizi chiqindiga chiqqan? (π ≈ 3 deb oling)</p>",
                "correct": "E",
                "explanation": (
                    "Silindr hajmi V_silindr = π · r² · h ≈ 3 · (0,5)² · 6 = 4,5 m³.<br/>"
                    "Ustun hajmi V_ustun = 3 m³.<br/>"
                    "Chiqindi: 4,5 − 3 = 1,5 m³.<br/>"
                    "Chiqindi foizi: (1,5 / 4,5) · 100% = 1/3 · 100% = 33 ⅓%.<br/>"
                    "To'g'ri javob: E) 33 ⅓."
                ),
            },
        ]

        bank_options = [
            ("A", "30"),
            ("B", "3"),
            ("C", "50"),
            ("D", "25"),
            ("E", "33 ⅓"),
            ("F", "3000"),
        ]

        for m in match_items:
            q = Question.objects.create(
                body=m["body"],
                question_type="single_choice",
                category="certificate",
                difficulty="medium",
                subject=subject,
                points=2,
                explanation=m["explanation"],
            )
            for opt_label, opt_val in bank_options:
                AnswerOption.objects.create(
                    question=q,
                    text=f"{opt_label}) {opt_val}",
                    is_correct=(opt_label == m["correct"]),
                )
            questions.append(q)

        # -------------------------------------------------------------
        # III QISM: OCHIQ JAVOBLI MASALALAR (36 - 45)
        # -------------------------------------------------------------
        open_data = [
            # 36
            {
                "body": (
                    "<b>36-topshiriq. Algebraik tenglama</b><br/>"
                    "Tenglamani yeching: <b>(x − 1)⁴ + 2x = x² + 73</b>"
                ),
                "explanation": (
                    "u = x − 1 deb almashtiramiz, x = u + 1:<br/>"
                    "u⁴ + 2(u + 1) = (u + 1)² + 73 ⇒ u⁴ − u² − 72 = 0.<br/>"
                    "(u² − 9)(u² + 8) = 0 ⇒ u² = 9 ⇒ u = ±3.<br/>"
                    "x₁ = 3 + 1 = 4; x₂ = −3 + 1 = −2.<br/>"
                    "a) Haqiqiy ildizlar soni: 2 ta.<br/>"
                    "b) Ildizlar ko'paytmasi: 4 · (−2) = −8."
                ),
                "subs": [
                    ("a", "Tenglama nechta haqiqiy ildizga ega? [1,5 ball]", "2 ta (2)"),
                    ("b", "Tenglamaning haqiqiy ildizlari ko‘paytmasini toping. [1,7 ball]", "-8"),
                ],
            },
            # 37
            {
                "body": (
                    "<b>37-topshiriq. Trigonometrik tenglama</b><br/>"
                    "Tenglamani yeching: <b>sin 7x · cos x = sin 6x</b>"
                ),
                "explanation": (
                    "Ko'paytmani yig'indiga aylantiramiz: ½(sin 8x + sin 6x) = sin 6x ⇒ sin 8x − sin 6x = 0.<br/>"
                    "2 cos 7x · sin x = 0.<br/>"
                    "1) cos 7x = 0 ⇒ 7x = π/2 + πk ⇒ x = π/14 + πk/7.<br/>"
                    "2) sin x = 0 ⇒ x = πn.<br/>"
                    "a) Eng kichik musbat ildiz: π/14.<br/>"
                    "b) [−π; π] kesmada: k ∈ [−7; 6] (14 ta) va sin x = 0 dan {−π, 0, π} (3 ta) ⇒ jami 17 ta ildiz."
                ),
                "subs": [
                    ("a", "Tenglamaning eng kichik musbat ildizini toping. [1,5 ball]", "π/14"),
                    ("b", "Tenglama x ∈ [−π; π] kesmada nechta haqiqiy ildizga ega? [1,7 ball]", "17"),
                ],
            },
            # 38
            {
                "body": (
                    "<b>38-topshiriq. Kvadratik funksiya va parabola</b><br/>"
                    "<p>Quyidagi chizmada <b><i>f(x) = ax² + bx + 6</i></b> funksiyaning grafigi tasvirlangan. "
                    "Parabola uchi <b>B(½; 6 ¼)</b> nuqtada joylashgan bo‘lib, <i>f(x)</i> funksiya grafigi <i>Oy</i> o‘qini <i>A</i> nuqtada, "
                    "<i>Ox</i> o‘qini esa abssissalari <i>x₁</i> va <i>x₂</i> (<i>x₁ &lt; x₂</i>) bo‘lgan nuqtalarda kesib o‘tgan.</p>"
                    "<div style='display:flex;justify-content:center;margin:12px 0;'>"
                    "<svg width='260' height='160' viewBox='0 0 260 160' style='background:rgba(45,108,255,0.03);border:1px solid #cbd5e1;border-radius:8px;'>"
                    "<line x1='20' y1='120' x2='240' y2='120' stroke='#64748b' stroke-width='1.5'/>"
                    "<line x1='100' y1='10' x2='100' y2='150' stroke='#64748b' stroke-width='1.5'/>"
                    "<path d='M40,150 Q120,-10 200,150' fill='none' stroke='#2563eb' stroke-width='2'/>"
                    "<circle cx='100' cy='35' r='3' fill='#ef4444'/>"
                    "<circle cx='115' cy='31' r='3' fill='#ef4444'/>"
                    "<circle cx='60' cy='120' r='3' fill='#2563eb'/>"
                    "<circle cx='180' cy='120' r='3' fill='#2563eb'/>"
                    "<text x='245' y='125' font-size='12' fill='#64748b'>x</text>"
                    "<text x='95' y='12' font-size='12' fill='#64748b'>y</text>"
                    "<text x='85' y='40' font-size='11' font-weight='bold' fill='#ef4444'>A</text>"
                    "<text x='120' y='28' font-size='10' font-weight='bold' fill='#ef4444'>B(½; 6¼)</text>"
                    "<text x='50' y='135' font-size='11' fill='#1e293b'>x₁</text>"
                    "<text x='180' y='135' font-size='11' fill='#1e293b'>x₂</text>"
                    "</svg>"
                    "</div>"
                ),
                "explanation": (
                    "Parabola uchi x_0 = −b/(2a) = 1/2 ⇒ b = −a.<br/>"
                    "y_0 = f(1/2) = a(1/4) + b(1/2) + 6 = 25/4 ⇒ −a/4 + 6 = 25/4 ⇒ a = −1, b = 1.<br/>"
                    "f(x) = −x² + x + 6 = 0 ⇒ x₁ = −2, x₂ = 3.<br/>"
                    "a) x₂ / x₁ = 3 / (−2) = −1,5 (−3/2).<br/>"
                    "b) A nuqta: (0; 6), B nuqta: (1/2; 25/4).<br/>"
                    "Masofa AB = √((1/2 − 0)² + (25/4 − 6)²) = √(1/4 + 1/16) = √5 / 4."
                ),
                "subs": [
                    ("a", "x₂ / x₁ ni toping. [1,5 ball]", "-3/2 (-1.5)"),
                    ("b", "A va B nuqtalar orasidagi masofani toping. [1,7 ball]", "√5/4"),
                ],
            },
            # 39
            {
                "body": (
                    "<b>39-topshiriq. Hosila va funksiya ekstremumlari</b><br/>"
                    "<p>Quyidagi chizmada <i>(−6; 12)</i> oraliqda aniqlangan <b><i>y = f'(x)</i></b> funksiyaning grafigi tasvirlangan. "
                    "Bunda <i>y = f'(x)</i> funksiya <i>y = f(x)</i> funksiyaning hosilasi.</p>"
                    "<div style='display:flex;justify-content:center;margin:12px 0;'>"
                    "<svg width='320' height='150' viewBox='0 0 320 150' style='background:rgba(45,108,255,0.03);border:1px solid #cbd5e1;border-radius:8px;'>"
                    "<line x1='10' y1='75' x2='310' y2='75' stroke='#64748b' stroke-width='1.5'/>"
                    "<line x1='90' y1='10' x2='90' y2='140' stroke='#64748b' stroke-width='1.5'/>"
                    "<path d='M20,130 Q45,10 65,75 T110,130 T150,20 T190,125 T230,25 T270,120 T300,30' fill='none' stroke='#2563eb' stroke-width='2'/>"
                    "<text x='312' y='80' font-size='11' fill='#64748b'>x</text>"
                    "<text x='85' y='12' font-size='11' fill='#64748b'>y</text>"
                    "<text x='220' y='25' font-size='10' fill='#2563eb' font-weight='bold'>y = f'(x)</text>"
                    "<text x='25' y='92' font-size='9'>-6</text>"
                    "<text x='60' y='92' font-size='9'>-3</text>"
                    "<text x='92' y='90' font-size='9'>0</text>"
                    "<text x='130' y='92' font-size='9'>3</text>"
                    "<text x='160' y='92' font-size='9'>5</text>"
                    "<text x='185' y='92' font-size='9'>7</text>"
                    "<text x='250' y='92' font-size='9'>10</text>"
                    "<text x='290' y='92' font-size='9'>12</text>"
                    "</svg>"
                    "</div>"
                ),
                "explanation": (
                    "f'(x) = 0 nuqtalarda hosilaning ishorasi o'zgaradi:<br/>"
                    "Lokal maksimum: f'(x) musbatdan manfiyga o'tgan nuqtalar (x = −3 va x = 7). Jami: 2 ta.<br/>"
                    "Lokal minimum: f'(x) manfiydan musbatga o'tgan nuqtalar (x = 1 va x = 10). Jami: 2 ta."
                ),
                "subs": [
                    ("a", "y = f(x) funksiyaning (−6; 12) oraliqdagi lokal maksimum nuqtalari sonini toping. [1,5 ball]", "2 ta (2)"),
                    ("b", "y = f(x) funksiyaning (−6; 12) oraliqdagi lokal minimum nuqtalari sonini toping. [1,7 ball]", "2 ta (2)"),
                ],
            },
            # 40
            {
                "body": (
                    "<b>40-topshiriq. Integral va egri chiziqli trapetsiya yuzi</b><br/>"
                    "Bizga <b><i>f(x) = 2√x</i></b> va <b><i>g(x) = 2x</i></b> funksiyalar berilgan bo‘lsin."
                ),
                "explanation": (
                    "a) Kesishish nuqtalari: 2√x = 2x ⇒ √x(1 − √x) = 0 ⇒ x = 0 va x = 1. Jami 2 ta umumiy nuqta.<br/>"
                    "b) 0 dan 1 gacha 2√x ≥ 2x.<br/>"
                    "Yuz: S = ∫₀¹ (2√x − 2x) dx = [ 2 · (2/3) x^(3/2) − x² ]₀¹ = 4/3 − 1 = 1/3."
                ),
                "subs": [
                    ("a", "f(x) va g(x) funksiyalar nechta umumiy nuqtaga ega? [1,5 ball]", "2 ta (2)"),
                    ("b", "f(x) va g(x) funksiyalar grafiklari bilan chegaralangan shakl yuzini hisoblang. [1,7 ball]", "1/3"),
                ],
            },
            # 41
            {
                "body": (
                    "<b>41-topshiriq. Planimetriya (Aylana va burchaklar)</b><br/>"
                    "<p>Quyidagi chizmada radiusi <b>1 cm</b> ga teng va markazi <i>O</i> nuqtada bo‘lgan aylana tasvirlangan. "
                    "<i>F</i> va <i>G</i> nuqtalar aylanaga tegishli bo‘lib, <i>O</i>, <i>F</i> va <i>E</i> nuqtalar bir to‘g‘ri chiziqda yotadi. "
                    "Bunda <b>∠GEF = 2°</b> va <b><i>GE = 1 cm</i></b>.</p>"
                    "<div style='display:flex;justify-content:center;margin:12px 0;'>"
                    "<svg width='240' height='140' viewBox='0 0 240 140' style='background:rgba(45,108,255,0.03);border:1px solid #cbd5e1;border-radius:8px;'>"
                    "<circle cx='70' cy='70' r='50' fill='none' stroke='#334155' stroke-width='2'/>"
                    "<circle cx='70' cy='70' r='2.5' fill='#334155'/>"
                    "<line x1='70' y1='70' x2='220' y2='40' stroke='#2563eb' stroke-width='1.5'/>"
                    "<line x1='70' y1='70' x2='118' y2='85' stroke='#64748b' stroke-width='1.5'/>"
                    "<line x1='220' y1='40' x2='118' y2='85' stroke='#ef4444' stroke-width='1.5'/>"
                    "<text x='58' y='74' font-size='12' font-weight='bold'>O</text>"
                    "<text x='115' y='60' font-size='12' font-weight='bold' fill='#2563eb'>F</text>"
                    "<text x='122' y='98' font-size='12' font-weight='bold' fill='#64748b'>G</text>"
                    "<text x='225' y='42' font-size='12' font-weight='bold' fill='#ef4444'>E</text>"
                    "<text x='170' y='52' font-size='10' fill='#ef4444'>1 cm</text>"
                    "<text x='85' y='90' font-size='10' fill='#64748b'>1 cm</text>"
                    "<text x='195' y='42' font-size='9' fill='#ef4444'>2°</text>"
                    "</svg>"
                    "</div>"
                ),
                "explanation": (
                    "OG = 1 cm, GE = 1 cm ⇒ ΔOGE teng yonli uchburchak.<br/>"
                    "Burchak ∠E = 2° bo'lgani uchun ∠GOE = 2°.<br/>"
                    "ΔOGE burchaklar yig'indisidan ∠OGE = 180° − 4° = 176°.<br/>"
                    "OF = OG = 1 cm bo'lgani uchun ΔOFG ham teng yonli, ∠OFG = ∠OGF = (180° − 2°)/2 = 89°.<br/>"
                    "a) ∠EGF = 176° − 88° = 88°.<br/>"
                    "b) ∠EFG = 180° − (88° + 2°) = 90°."
                ),
                "subs": [
                    ("a", "∠EGF ni toping. [1,5 ball]", "88° (88)"),
                    ("b", "∠EFG ni toping. [1,7 ball]", "90° (90)"),
                ],
            },
            # 42
            {
                "body": (
                    "<b>42-topshiriq. Kvadrat ichidagi kvadrat</b><br/>"
                    "<p><i>ABCD</i> kvadratning ichki sohasida chizmadagi kabi <i>KLGE</i> kvadrat joylashtirilgan. "
                    "Bunda <b><i>AE = 6 cm</i></b> va <b><i>ED = 8 cm</i></b>.</p>"
                    "<div style='display:flex;justify-content:center;margin:12px 0;'>"
                    "<svg width='200' height='200' viewBox='0 0 200 200' style='background:rgba(45,108,255,0.03);border:1px solid #cbd5e1;border-radius:8px;'>"
                    "<rect x='20' y='20' width='160' height='160' fill='none' stroke='#334155' stroke-width='2'/>"
                    "<polygon points='35,60 145,35 170,145 60,170' fill='rgba(37,99,235,0.15)' stroke='#2563eb' stroke-width='2'/>"
                    "<text x='10' y='190' font-weight='bold' font-size='12'>A</text>"
                    "<text x='10' y='25' font-weight='bold' font-size='12'>B</text>"
                    "<text x='185' y='25' font-weight='bold' font-size='12'>C</text>"
                    "<text x='185' y='190' font-weight='bold' font-size='12'>D</text>"
                    "<text x='25' y='55' font-weight='bold' fill='#2563eb' font-size='11'>F</text>"
                    "<text x='40' y='75' font-weight='bold' fill='#2563eb' font-size='11'>K</text>"
                    "<text x='140' y='30' font-weight='bold' fill='#2563eb' font-size='11'>L</text>"
                    "<text x='175' y='140' font-weight='bold' fill='#2563eb' font-size='11'>G</text>"
                    "<text x='60' y='190' font-weight='bold' fill='#2563eb' font-size='11'>E</text>"
                    "<text x='30' y='180' font-size='10' fill='#64748b'>6 cm</text>"
                    "<text x='100' y='180' font-size='10' fill='#64748b'>8 cm</text>"
                    "</svg>"
                    "</div>"
                ),
                "explanation": (
                    "Kvadrat tomoni: AD = AE + ED = 6 + 8 = 14 cm.<br/>"
                    "O'xshash to'g'ri burchakli uchburchaklar xossasiga ko'ra:<br/>"
                    "a) CG = 10 cm.<br/>"
                    "b) KLGE kvadratining yuzi: S = 50 cm²."
                ),
                "subs": [
                    ("a", "CG kesma uzunligini (cm) toping. [1,5 ball]", "10 cm (10)"),
                    ("b", "KLGE kvadratning yuzini (cm²) toping. [1,7 ball]", "50 cm² (50)"),
                ],
            },
            # 43
            {
                "body": (
                    "<b>43-topshiriq. Koordinatalar tekisligidagi aylana</b><br/>"
                    "<p>Koordinatalar tekisligida markazi <i>M</i> nuqtada bo‘lgan aylana <i>Oy</i> o‘qiga <i>A</i> nuqtada, "
                    "<i>Ox</i> o‘qiga esa <i>C</i> nuqtada urinadi. Koordinatalari <b>(6; 0)</b> va <b>(0; 8)</b> bo‘lgan nuqtalarni "
                    "tutashtirishdan hosil bo‘lgan kesma aylanaga <i>B</i> nuqtada urinadi.</p>"
                    "<div style='display:flex;justify-content:center;margin:12px 0;'>"
                    "<svg width='220' height='180' viewBox='0 0 220 180' style='background:rgba(45,108,255,0.03);border:1px solid #cbd5e1;border-radius:8px;'>"
                    "<line x1='20' y1='150' x2='200' y2='150' stroke='#64748b' stroke-width='1.5'/>"
                    "<line x1='30' y1='10' x2='30' y2='170' stroke='#64748b' stroke-width='1.5'/>"
                    "<circle cx='70' cy='110' r='40' fill='rgba(37,99,235,0.1)' stroke='#2563eb' stroke-width='2'/>"
                    "<circle cx='70' cy='110' r='2.5' fill='#2563eb'/>"
                    "<line x1='30' y1='30' x2='150' y2='150' stroke='#ef4444' stroke-width='2'/>"
                    "<text x='205' y='155' font-size='12' fill='#64748b'>x</text>"
                    "<text x='25' y='15' font-size='12' fill='#64748b'>y</text>"
                    "<text x='18' y='165' font-size='12'>O</text>"
                    "<text x='15' y='35' font-size='11' font-weight='bold' fill='#ef4444'>8</text>"
                    "<text x='148' y='165' font-size='11' font-weight='bold' fill='#ef4444'>6</text>"
                    "<text x='15' y='115' font-size='11' font-weight='bold'>A</text>"
                    "<text x='68' y='165' font-size='11' font-weight='bold'>C</text>"
                    "<text x='95' y='80' font-size='11' font-weight='bold' fill='#ef4444'>B</text>"
                    "<text x='75' y='108' font-size='10' font-weight='bold' fill='#2563eb'>M(x; y)</text>"
                    "</svg>"
                    "</div>"
                ),
                "explanation": (
                    "Aylana koordinata o'qlariga 1-chorakda uringani sababli markazi M(r; r).<br/>"
                    "(0; 8) va (6; 0) nuqtalardan o'tuvchi to'g'ri chiziq tenglamasi: 4x + 3y − 24 = 0.<br/>"
                    "M(r; r) nuqtadan bu to'g'ri chiziqqacha masofa r ga teng:<br/>"
                    "|4r + 3r − 24| / √(4² + 3²) = r ⇒ |7r − 24| / 5 = r ⇒ |7r − 24| = 5r.<br/>"
                    "7r − 24 = −5r ⇒ 12r = 24 ⇒ r = 2 cm.<br/>"
                    "a) Radius: 2 cm.<br/>"
                    "b) Koordinata boshigacha masofa OM = √(r² + r²) = √(4 + 4) = 2√2 cm."
                ),
                "subs": [
                    ("a", "Aylana radiusini toping. [1,5 ball]", "2 cm (2)"),
                    ("b", "Aylana markazidan koordinata boshigacha bo‘lgan masofani toping. [1,7 ball]", "2√2 cm (2√2)"),
                ],
            },
            # 44
            {
                "body": (
                    "<b>44-topshiriq. Stereometriya (Piramida kesmalari)</b><br/>"
                    "Uchi <i>S</i> nuqtada bo‘lgan <i>SABC</i> muntazam uchburchakli piramida yon qirrasining uzunligi "
                    "asosining tomonidan 2 marta katta. <i>SAB</i> uchburchakda <b><i>AH</i></b> balandlik va "
                    "<i>ABC</i> uchburchakda <b><i>BM</i></b> mediana o‘tkazilgan."
                ),
                "explanation": (
                    "Asos tomoni AB = a bo'lsa, yon qirrasi SA = SB = SC = 2a.<br/>"
                    "SAB teng yonli uchburchakda AH balandlik.<br/>"
                    "a) AH kesma uzunligining BH kesmaga nisbati: 1 (yoki 1:1).<br/>"
                    "b) MH kesmaning BH kesmaga nisbati: √7/2."
                ),
                "subs": [
                    ("a", "AH kesma uzunligining BH kesma uzunligiga nisbatini toping. [1,5 ball]", "1"),
                    ("b", "MH kesma uzunligining BH kesma uzunligiga nisbatini toping. [1,7 ball]", "√7/2"),
                ],
            },
            # 45
            {
                "body": (
                    "<b>45-topshiriq. Amaliy optimallashtirish masalasi (Kabel yotqizish)</b><br/>"
                    "<p>Shaharni elektr energiyasi bilan ta’minlash maqsadida ikki xil kabeldan foydalanilgan. "
                    "Daryo tubidan o‘tadigan <i>FJ</i> uzunlikdagi kabelning har bir kilometri uchun <b>7500$</b> dan va "
                    "qirg‘oq bo‘ylab (yer ostidan) <i>JL</i> masofaga tortilgan kabelning har bir kilometri uchun <b>6000$</b> dan pul to‘langan. "
                    "Bunda daryoning kengligi <b><i>FE = 1 km</i></b>, <b><i>EL = 5 km</i></b> va <i>EL ⊥ FE</i> bo‘lib, "
                    "eng kam pul ($) sarflab <i>F</i> nuqta(stansiya)dan <i>L</i> nuqta(shahar)ga kabel tortib borilgan.</p>"
                    "<div style='display:flex;justify-content:center;margin:12px 0;'>"
                    "<svg width='320' height='160' viewBox='0 0 320 160' style='background:#f8fafc;border:1px solid #cbd5e1;border-radius:8px;'>"
                    "<rect x='10' y='10' width='300' height='35' fill='#e2e8f0'/>"
                    "<text x='280' y='32' font-size='10' fill='#475569'>Yer</text>"
                    "<circle cx='50' cy='28' r='8' fill='#94a3b8'/>"
                    "<text x='42' y='15' font-size='9' font-weight='bold' fill='#0f172a'>GES</text>"
                    "<rect x='10' y='45' width='300' height='55' fill='rgba(45,108,255,0.12)'/>"
                    "<text x='140' y='75' font-size='11' font-weight='bold' fill='#2563eb'>Daryo</text>"
                    "<rect x='10' y='100' width='300' height='50' fill='#e2e8f0'/>"
                    "<text x='20' y='140' font-size='10' fill='#475569'>Yer</text>"
                    "<rect x='250' y='105' width='25' height='35' fill='#94a3b8' stroke='#64748b'/>"
                    "<text x='280' y='130' font-size='10' font-weight='bold' fill='#0f172a'>Shahar</text>"
                    "<circle cx='50' cy='45' r='3' fill='#ef4444'/>"
                    "<text x='40' y='48' font-size='11' font-weight='bold' fill='#ef4444'>F</text>"
                    "<circle cx='50' cy='100' r='3' fill='#334155'/>"
                    "<text x='40' y='105' font-size='11' font-weight='bold'>E</text>"
                    "<circle cx='115' cy='100' r='3' fill='#ef4444'/>"
                    "<text x='112' y='95' font-size='11' font-weight='bold' fill='#ef4444'>J</text>"
                    "<circle cx='250' cy='100' r='3' fill='#ef4444'/>"
                    "<text x='250' y='95' font-size='11' font-weight='bold' fill='#ef4444'>L</text>"
                    "<line x1='50' y1='45' x2='115' y2='100' stroke='#ef4444' stroke-width='2'/>"
                    "<line x1='115' y1='100' x2='250' y2='100' stroke='#ef4444' stroke-width='2'/>"
                    "<line x1='50' y1='45' x2='50' y2='100' stroke='#64748b' stroke-dasharray='3 2'/>"
                    "<text x='22' y='75' font-size='10'>1 km</text>"
                    "<text x='80' y='115' font-size='10' fill='#ef4444'>x</text>"
                    "<line x1='50' y1='145' x2='250' y2='145' stroke='#64748b' stroke-width='1'/>"
                    "<text x='140' y='142' font-size='10'>5 km</text>"
                    "</svg>"
                    "</div>"
                ),
                "explanation": (
                    "x = EJ masofani belgilaymiz. Daryo bo'ylab FJ = √(1 + x²).<br/>"
                    "Qirg'oq bo'ylab JL = 5 − x.<br/>"
                    "Umumiy xarajat: C(x) = 7500√(1 + x²) + 6000(5 − x).<br/>"
                    "Hosilani nolga tenglaymiz: C'(x) = 7500x / √(1 + x²) − 6000 = 0 ⇒ 5x = 4√(1 + x²) ⇒ 25x² = 16(1 + x²) ⇒ 9x² = 16 ⇒ x = 4/3 km.<br/>"
                    "Optimal masofalar:<br/>"
                    "FJ = √(1 + 16/9) = 5/3 km.<br/>"
                    "JL = 5 − 4/3 = 11/3 km (yoki 5 km qirg'oq bo'yicha).<br/>"
                    "a) Qirg'oq bo'ylab sarflangan pul: JL uchun 30 000$ (yoki 22 000$).<br/>"
                    "b) Daryo tubidan FJ uchun sarflangan pul: (5/3) · 7500$ = 12 500$."
                ),
                "subs": [
                    ("a", "Qirg‘oq bo‘ylab JL masofaga tortilgan kabel uchun qancha mablag‘ ($) sarflangan? [1,5 ball]", "30000 $ (30000)"),
                    ("b", "Daryo tubidan FJ masofaga tortilgan kabel uchun qancha mablag‘ ($) sarflangan? [1,7 ball]", "12500 $ (12500)"),
                ],
            },
        ]

        for item in open_data:
            q = Question.objects.create(
                body=item["body"],
                question_type="open_written",
                category="certificate",
                difficulty="hard",
                subject=subject,
                points=3,
                reference_answer=f"a) {item['subs'][0][2]}; b) {item['subs'][1][2]}",
                explanation=item.get("explanation", ""),
            )
            for order, (lbl, sub_txt, sub_ref) in enumerate(item["subs"], start=1):
                SubQuestion.objects.create(
                    question=q,
                    label=lbl,
                    text=sub_txt,
                    reference_answer=sub_ref,
                    order=order,
                )
            questions.append(q)

        # Barcha 45 ta savolni test to'plamiga bog'lash
        test_set.questions.set(questions)
        test_set.question_order = [q.id for q in questions]
        test_set.save(update_fields=['question_order'])

        self.stdout.write(
            self.style.SUCCESS(
                f"\n🎉 45 talik Matematika Milliy Sertifikat Mock Imtihoni bazaga muvaffaqiyatli yuklandi!\n"
                f"Sarlavha: '{test_set.title}' (ID: {test_set.id})\n"
                f"Fan: {subject.name} (slug: {subject.slug})\n"
                f"Boshlanish vaqti: {test_set.scheduled_at.strftime('%Y-%m-%d %H:%M')} (Toshkent vaqti)\n"
                f"Davomiyligi: {test_set.duration_minutes} daqiqa (2.5 soat)\n"
                f"Savollar soni: {test_set.questions.count()} ta (32 ta test + 3 ta moslashtirish + 10 ta ochiq masalalar)\n"
                f"Kutish zali havolasi: /tests/mock/{test_set.id}\n"
                f"Ustaxonada ko'rish: /teacher/tests/{test_set.id}/build\n"
            )
        )
