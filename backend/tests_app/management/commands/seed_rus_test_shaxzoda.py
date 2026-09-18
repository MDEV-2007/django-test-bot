"""Django management command: Shaxzoda ustozning Rus tili test to'plamini bazaga yuklash.

Foydalanish:
    python manage.py seed_rus_test_shaxzoda
    python manage.py seed_rus_test_shaxzoda --force
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from django.contrib.auth.models import User

from tests_app.models import Subject, TestSet, Question, AnswerOption


MOCK_TITLE = "Rus tili — Grammatika va Leksika (Shaxzoda)"
MOCK_DESC = (
    "Rus tili bo'yicha grammatika, leksika va umumiy bilimlar testi. "
    "Savollar: predloglar, fe'l boshqaruvi, leksik so'zlar va boshqalar. "
    "Ustoz: Shaxzoda."
)


# =============================================================================
# SAVOLLAR (savol matni, variantlar: {text, correct})
# =============================================================================

RAW_QUESTIONS = [
    {
        "body": "Мы долго говорили .... предстоящем экзамене",
        "choices": [
            {"text": "о", "correct": True},
            {"text": "об", "correct": False},
            {"text": "на", "correct": False},
            {"text": "за", "correct": False},
        ],
    },
    {
        "body": "...сильного дождя футбольный матч был отменён.",
        "choices": [
            {"text": "Благодаря", "correct": False},
            {"text": "Согласно", "correct": False},
            {"text": "Из-за", "correct": True},
            {"text": "Вопреки", "correct": False},
        ],
    },
    {
        "body": "Во время экскурсии мы узнали много нового о древн... здании.",
        "choices": [
            {"text": "здании", "correct": True},
            {"text": "зданию", "correct": False},
            {"text": "зданием", "correct": False},
            {"text": "зданий", "correct": False},
        ],
    },
    {
        "body": "Что нужно растениям?",
        "choices": [
            {"text": "Свет, воздух, вода", "correct": True},
            {"text": "Жара", "correct": False},
            {"text": "Камни", "correct": False},
            {"text": "Соль", "correct": False},
        ],
    },
    {
        "body": "Что из продуктов питания называют «белым ядом»?",
        "choices": [
            {"text": "Мука", "correct": False},
            {"text": "Сахар", "correct": True},
            {"text": "Соль", "correct": False},
            {"text": "Суп", "correct": False},
        ],
    },
    {
        "body": "Чем мы дышим?",
        "choices": [
            {"text": "Ртом", "correct": False},
            {"text": "Носом", "correct": True},
            {"text": "Лбом", "correct": False},
        ],
    },
    {
        "body": "У какого насекомого нет крови?",
        "choices": [
            {"text": "Червь", "correct": False},
            {"text": "Хрущ", "correct": False},
            {"text": "Бабочка", "correct": True},
        ],
    },
    {
        "body": "Ирина завтра уезжает, она уже .... вещи в чемодан.",
        "choices": [
            {"text": "Вложила", "correct": False},
            {"text": "Сложила", "correct": True},
            {"text": "Разложила", "correct": False},
            {"text": "Отложила", "correct": False},
        ],
    },
    {
        "body": "Кто ... за ребёнком, когда мама на работе?",
        "choices": [
            {"text": "Досматривает", "correct": False},
            {"text": "Осматривает", "correct": False},
            {"text": "Высматривает", "correct": False},
            {"text": "Присматривает", "correct": True},
        ],
    },
    {
        "body": "Мы ещё не ... обед.",
        "choices": [
            {"text": "Указали", "correct": False},
            {"text": "Приказали", "correct": False},
            {"text": "Заказали", "correct": True},
            {"text": "Сказали", "correct": False},
        ],
    },
    {
        "body": "Моего брата недавно ... в армию.",
        "choices": [
            {"text": "Призвали", "correct": True},
            {"text": "Назвали", "correct": False},
            {"text": "Вызвали", "correct": False},
            {"text": "Отозвали", "correct": False},
        ],
    },
    {
        "body": "Этот кандидат не ... на выборах нужного количества голосов.",
        "choices": [
            {"text": "Набрал", "correct": True},
            {"text": "Забрал", "correct": False},
            {"text": "Выбрал", "correct": False},
            {"text": "Отобрал", "correct": False},
        ],
    },
]


class Command(BaseCommand):
    help = "Shaxzoda ustozning Rus tili testini bazaga yuklaydi (12 savol)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--force",
            action="store_true",
            help="Agar mavjud bo'lsa, eski testni o'chirib qayta yaratadi.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        force = options.get("force", False)

        # ── 1. Subject: Rus tili ────────────────────────────────────────────
        subject = Subject.objects.filter(slug__icontains="rus").first()
        if not subject:
            subject = Subject.objects.filter(name__icontains="рус").first()
        if not subject:
            subject, created = Subject.objects.get_or_create(
                slug="rus-tili",
                defaults={
                    "name": "Rus tili",
                    "icon_name": "languages",
                    "color": "#e64646",
                    "order": 6,
                },
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f"Yangi fan yaratildi: '{subject.name}'"))
        else:
            self.stdout.write(f"Fan topildi: '{subject.name}' (slug={subject.slug})")

        # ── 2. Teacher: shaxzoda ────────────────────────────────────────────
        teacher_user = User.objects.filter(username__iexact="shaxzoda").first()
        if teacher_user:
            self.stdout.write(
                f"O'qituvchi topildi: @{teacher_user.username} (id={teacher_user.id})"
            )
        else:
            self.stdout.write(
                self.style.WARNING(
                    "Ogohlantirish: 'shaxzoda' username topilmadi. "
                    "Test created_by=None saqlanadi."
                )
            )

        # ── 3. Mavjud testni tekshirish ──────────────────────────────────────
        existing = TestSet.objects.filter(title=MOCK_TITLE).first()
        if existing:
            if force:
                self.stdout.write(
                    self.style.WARNING(f"Eski test (#{existing.id}) o'chirilmoqda...")
                )
                if existing.has_attempts:
                    self.stdout.write(
                        self.style.ERROR(
                            "Bu testda o'quvchi urinishlari bor! "
                            "O'chirish o'rniga arxivlanadi."
                        )
                    )
                    existing.is_archived = True
                    existing.save()
                else:
                    existing.delete()
            else:
                self.stdout.write(
                    self.style.WARNING(
                        f"'{MOCK_TITLE}' allaqachon mavjud (ID: {existing.id}). "
                        f"Qayta yaratish uchun --force bayrog'ini ishlating:\n"
                        f"  python manage.py seed_rus_test_shaxzoda --force"
                    )
                )
                return

        # ── 4. TestSet yaratish ──────────────────────────────────────────────
        test_set = TestSet.objects.create(
            title=MOCK_TITLE,
            description=MOCK_DESC,
            subject=subject,
            category="certificate",  # Milliy Sertifikat
            duration_minutes=20,
            is_published=True,
            is_premium=False,
            is_live_mock=False,
            created_by=teacher_user,
        )
        self.stdout.write(f"TestSet yaratildi: '{test_set.title}' (id={test_set.id})")

        # ── 5. Savollar va variantlar ────────────────────────────────────────
        all_questions = []
        for i, q_data in enumerate(RAW_QUESTIONS, start=1):
            question = Question.objects.create(
                body=q_data["body"],
                question_type="single_choice",
                category="certificate",
                subject=subject,
                difficulty=1,
            )
            for choice_data in q_data["choices"]:
                AnswerOption.objects.create(
                    question=question,
                    text=choice_data["text"],
                    is_correct=choice_data["correct"],
                )
            all_questions.append(question)
            self.stdout.write(f"  [{i:02d}] {question.body[:65]}...")

        test_set.questions.set(all_questions)
        test_set.save()

        # ── 6. Natija ────────────────────────────────────────────────────────
        self.stdout.write(
            self.style.SUCCESS(
                f"\n✅ Tayyor! '{MOCK_TITLE}' muvaffaqiyatli yaratildi.\n"
                f"   TestSet ID   : {test_set.id}\n"
                f"   Fan          : {subject.name}\n"
                f"   Kategoriya   : Milliy Sertifikat (certificate)\n"
                f"   Yaratuvchi   : {'@' + teacher_user.username if teacher_user else 'Topilmadi'}\n"
                f"   Savollar     : {test_set.questions.count()} ta\n"
                f"   Holati       : Nashr etilgan\n"
            )
        )
