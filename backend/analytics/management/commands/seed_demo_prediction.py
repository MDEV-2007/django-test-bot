"""Namoyish (video/skrinshot) uchun DTM ball bashoratini tayyorlaydi.

    python manage.py seed_demo_prediction --user murra --dtm 186
    python manage.py seed_demo_prediction --user murra --undo

NEGA KODGA "murra uchun 186 ko'rsat" DEB YOZILMAGAN
---------------------------------------------------
Eng oson yo'l bashorat funksiyasiga istisno qo'shish bo'lardi. Bu qilinmadi: o'sha
istisno mahsulot kodida qolib ketardi va bir kun kelib har qanday foydalanuvchining
balli qo'lda "chizib" qo'yilishi mumkin bo'lgan joyga aylanardi. Ya'ni mahsulotning
eng qimmatli va'dasi — "bu raqam sizning javoblaringizdan hisoblangan" — yolg'onga
aylanardi.

Buning o'rniga bu yerda HAQIQIY javoblar yaratiladi va bashorat funksiyasi ularni
odatdagidek o'qiydi. Algoritm o'zgarmaydi; unga shunchaki kirish ma'lumoti beriladi.

QANDAY ISHLAYDI
---------------
`analytics/prediction.py` bashoratni shunday hisoblaydi:

  - har javob QIYINLIK bo'yicha og'irlik oladi (oson 0.7, o'rta 1.0, qiyin 1.4);
  - har MAVZU alohida hisoblanadi, so'ng mavzular TENG og'irlik bilan birlashtiriladi;
  - foiz DTM ballga chiziqli o'tkaziladi (189 ball = 100%).

Demak kerakli ballni olish uchun har mavzuda to'g'ri javoblar ulushini bir xil qilib
qo'yish kifoya. Aniq songa tushish uchun shu ulush ikkilik qidiruv bilan tanlanadi —
"taxminan" emas, so'ralgan ballning O'ZI chiqadi.

ISHONCH DARAJASI
----------------
Video uchun muhim: kam javob bo'lsa interfeys qizil "Past ishonch" yorlig'ini
ko'rsatadi. Ishonch javoblar soni (300 ta = to'liq) va mavzular qamroviga (8 ta =
to'liq) bog'liq, shuning uchun sukut bo'yicha 300 ta javob va imkon qadar ko'p mavzu
olinadi — natijada yashil "Yuqori ishonch" chiqadi.

QAYTARIB OLISH
--------------
Yaratilgan urinishlar alohida test to'plamiga bog'lanadi, shuning uchun `--undo`
ularni to'liq o'chiradi va foydalanuvchining haqiqiy natijalariga tegmaydi. XP va
tanga BERILMAYDI — liderlar ligasi sun'iy ravishda ko'tarilib ketmasligi uchun.
"""
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from accounts.models import Profile
from analytics.prediction import DIFFICULTY_WEIGHT, DTM_MAX_SCORE, predict
from tests_app.models import Attempt, AttemptAnswer, Question, TestSet

# Shu sarlavha bilan yaratilgan to'plam — `--undo` aynan shuni topadi.
DEMO_TEST_TITLE = 'Demo mashqlari (bashorat uchun)'


class Command(BaseCommand):
    help = "Namoyish uchun DTM bashoratini kerakli ballga keltiradi (qaytarib olinadi)."

    def add_arguments(self, parser):
        parser.add_argument('--user', required=True, help="Foydalanuvchi nomi (username).")
        parser.add_argument('--dtm', type=int, default=186,
                            help=f"Kerakli DTM ball (0-{DTM_MAX_SCORE}). Sukut: 186.")
        parser.add_argument('--answers', type=int, default=300,
                            help="Nechta javob yaratilsin. 300 — to'liq ishonch uchun.")
        parser.add_argument('--undo', action='store_true',
                            help="Shu komanda yaratgan demo javoblarni o'chiradi.")

    def handle(self, *args, **options):
        profile = self._profile(options['user'])

        if options['undo']:
            return self._undo(profile)

        target = options['dtm']
        if not 0 < target <= DTM_MAX_SCORE:
            raise CommandError(f"--dtm 1 va {DTM_MAX_SCORE} orasida bo'lishi kerak.")

        buckets = self._pick_questions(options['answers'])
        if not buckets:
            raise CommandError(
                "Mavzuga biriktirilgan savol topilmadi. Bashorat mavzular kesimida "
                "hisoblanadi, shuning uchun savollarda `topic` to'ldirilgan bo'lishi shart."
            )

        ratio = self._solve_ratio(buckets, target)
        with transaction.atomic():
            self._undo(profile, quiet=True)
            created = self._write(profile, buckets, ratio)

        result = predict(profile)
        self.stdout.write(self.style.SUCCESS(
            f"\n{created} ta javob yaratildi ({len(buckets)} ta mavzu)."))
        self.stdout.write(f"  DTM ball        : {result['predicted_dtm']} / {DTM_MAX_SCORE}")
        self.stdout.write(f"  O'zlashtirish   : {result['predicted_percent']}%")
        self.stdout.write(f"  Ishonch         : {result['confidence_label']} "
                          f"({round((result['confidence'] or 0) * 100)}%)")
        if result['predicted_dtm'] != target:
            self.stdout.write(self.style.WARNING(
                f"  Diqqat: so'ralgan {target} ball aniq chiqmadi — savollar taqsimoti "
                f"buni imkonsiz qilyapti."))
        self.stdout.write("\nQaytarib olish: --undo")

    # ── Yordamchilar ──────────────────────────────────────────────────────────

    def _profile(self, username):
        profile = Profile.objects.filter(user__username=username).select_related('user').first()
        if profile is None:
            raise CommandError(f"'{username}' foydalanuvchisi topilmadi.")
        return profile

    def _pick_questions(self, limit):
        """Savollarni mavzular bo'yicha guruhlab, imkon qadar KENG qamrab oladi.

        Mavzular navbat bilan aylanib chiqiladi: bitta katta mavzu butun kvotani
        egallab, qamrov past bo'lib qolmasligi uchun (qamrov ishonch darajasiga
        bevosita ta'sir qiladi)."""
        by_topic = {}
        for question in (Question.objects
                         .filter(topic__isnull=False)
                         .only('id', 'difficulty', 'topic_id')
                         .order_by('id')):
            by_topic.setdefault(question.topic_id, []).append(question)

        buckets, taken = {}, 0
        while taken < limit:
            progressed = False
            for topic_id, questions in by_topic.items():
                chosen = buckets.setdefault(topic_id, [])
                if len(chosen) >= len(questions):
                    continue
                chosen.append(questions[len(chosen)])
                taken += 1
                progressed = True
                if taken >= limit:
                    break
            if not progressed:
                break  # savollar tugadi
        return {k: v for k, v in buckets.items() if v}

    def _percent_for(self, buckets, ratio):
        """Berilgan ulush bilan chiqadigan foizni hisoblaydi.

        `prediction.predict()` bilan bir xil formula: mavzu ichida og'irlikli ulush,
        so'ng mavzular bo'yicha oddiy o'rtacha."""
        scores = []
        for questions in buckets.values():
            weights = [DIFFICULTY_WEIGHT.get(q.difficulty, 1.0) for q in questions]
            total = sum(weights)
            if not total:
                continue
            need = ratio * total
            acc = 0.0
            for weight in weights:
                # Keyingi javobni to'g'ri deb belgilash kerakli qiymatdan uzoqlashtirsa,
                # to'xtaymiz — shu tariqa ulush maqsadga eng yaqin bo'ladi.
                if abs(acc + weight - need) > abs(acc - need):
                    break
                acc += weight
            scores.append(acc / total * 100)
        return sum(scores) / len(scores) if scores else 0.0

    def _solve_ratio(self, buckets, target_dtm):
        """Kerakli DTM ballni beradigan ulushni ikkilik qidiruv bilan topadi."""
        low, high = 0.0, 1.0
        best, best_gap = 1.0, None
        for _ in range(40):
            mid = (low + high) / 2
            dtm = round(self._percent_for(buckets, mid) / 100 * DTM_MAX_SCORE)
            gap = abs(dtm - target_dtm)
            if best_gap is None or gap < best_gap:
                best, best_gap = mid, gap
            if gap == 0:
                return mid
            if dtm < target_dtm:
                low = mid
            else:
                high = mid
        return best

    def _write(self, profile, buckets, ratio):
        now = timezone.now()
        test, _ = TestSet.objects.get_or_create(
            title=DEMO_TEST_TITLE,
            defaults={
                'description': "Namoyish uchun yaratilgan mashq javoblari.",
                # `is_random` — katalogda ko'rinmaydi; `is_published=False` — qo'shimcha kafolat.
                'is_random': True, 'is_published': False, 'is_premium': False,
                'duration_minutes': 30,
            },
        )

        rows, correct_total = [], 0
        for questions in buckets.values():
            weights = [DIFFICULTY_WEIGHT.get(q.difficulty, 1.0) for q in questions]
            need = ratio * sum(weights)
            acc = 0.0
            for question, weight in zip(questions, weights):
                is_correct = abs(acc + weight - need) <= abs(acc - need)
                if is_correct:
                    acc += weight
                    correct_total += 1
                rows.append((question, is_correct))

        attempt = Attempt.objects.create(
            profile=profile, test=test, completed_at=now, is_completed=True,
            score=round(correct_total / len(rows) * 100, 1) if rows else 0,
            correct_answers=correct_total, wrong_answers=len(rows) - correct_total,
            skipped_answers=0,
        )
        AttemptAnswer.objects.bulk_create([
            AttemptAnswer(attempt=attempt, question=question, is_correct=is_correct,
                          answered_at=now)
            for question, is_correct in rows
        ])
        return len(rows)

    def _undo(self, profile, quiet=False):
        attempts = Attempt.objects.filter(profile=profile, test__title=DEMO_TEST_TITLE)
        count = attempts.count()
        attempts.delete()  # AttemptAnswer CASCADE bilan o'chadi
        if quiet:
            return
        if count:
            self.stdout.write(self.style.SUCCESS(f"{count} ta demo urinish o'chirildi."))
        else:
            self.stdout.write("O'chiriladigan demo urinish topilmadi.")
