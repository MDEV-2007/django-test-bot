from django.core.management.base import BaseCommand
from django.db import transaction
from django.contrib.auth.models import User
from accounts.models import Profile, ensure_profile_for_user
from tests_app.models import Subject, TestSet, Question, AnswerOption

RUS_SUBJECT = {
    'slug': 'rus-tili',
    'name': 'Rus tili',
    'icon_name': 'languages',
    'color': '#0ea5e9',  # Sky blue
    'order': 6,
}

TEST_TITLE = "Rus tili — Boshlang'ich grammatika va leksika"


class Command(BaseCommand):
    help = "Rus tili fani, @shaxzoda o'qituvchi akkaunti va 8 ta test savolini yaratadi."

    @transaction.atomic
    def handle(self, *args, **options):
        # 1. Fan yaratish yoki yangilash
        subject, created = Subject.objects.get_or_create(
            slug=RUS_SUBJECT['slug'],
            defaults={k: v for k, v in RUS_SUBJECT.items() if k != 'slug'},
        )
        if not created:
            for k, v in RUS_SUBJECT.items():
                setattr(subject, k, v)
            subject.save()
            self.stdout.write(f"= Fan mavjud: {subject.name}")
        else:
            self.stdout.write(self.style.SUCCESS(f"+ Fan yaratildi: {subject.name}"))

        # 2. O'qituvchi (@shaxzoda - Farxodova Shaxzoda) akkaunti
        user = User.objects.filter(username__iexact='shaxzoda').first()
        if not user:
            user = User.objects.create_user(
                username='shaxzoda',
                first_name='Shaxzoda',
                last_name='Farxodova',
            )
            user.set_unusable_password()
            user.save()
            self.stdout.write(self.style.SUCCESS(f"+ O'qituvchi user yaratildi: @{user.username}"))
        else:
            user.first_name = 'Shaxzoda'
            user.last_name = 'Farxodova'
            user.save()
            self.stdout.write(f"= O'qituvchi user yangilandi: @{user.username} (Farxodova Shaxzoda)")

        profile = ensure_profile_for_user(user)
        if profile.role != 'teacher':
            profile.role = 'teacher'
            profile.save(update_fields=['role'])
            self.stdout.write(self.style.SUCCESS(f"+ Profil roli o'qituvchiga o'zgartirildi: role=teacher"))

        # 3. Eski bir xil sarlavhali test bo'lsa, tozalaymiz
        old_tests = TestSet.objects.filter(title=TEST_TITLE)
        for ot in old_tests:
            ot.questions.all().delete()
        old_tests.delete()

        test_set = TestSet.objects.create(
            subject=subject,
            title=TEST_TITLE,
            description="Rus tili grammatikasi, fe'l zamonlari, tushum/bosh kelishiklar, sinonim va antonimlar.",
            category='history',  # Mavzulashtirilgan mashq testi
            duration_minutes=15,
            created_by=user,
            is_published=True,
            is_premium=False,
            is_archived=False,
        )

        questions_data = [
            {
                'body': "Несмотря на сильный дождь, мы.... на прогулку",
                'options': [
                    ("пойдём", False),
                    ("идём", False),
                    ("пошли", True),
                    ("ходили", False),
                ],
                'explanation': "«Несмотря на сильный дождь, мы пошли на прогулку» — прошедшее время совершенного вида.",
            },
            {
                'body': "Найдите слово с ошибкой",
                'options': [
                    ("русский", False),
                    ("расказ", True),
                    ("красивый", False),
                    ("интересный", False),
                ],
                'explanation': "Слово «рассказ» пишется с двойной «с» (приставка рас- и корень -сказ-).",
            },
            {
                'body': "Мы гордимся своим город..",
                'options': [
                    ("-ом", True),
                    ("-а", False),
                    ("-е", False),
                    ("-у", False),
                ],
                'explanation': "Глагол «гордиться» требует творительного падежа (кем? чем?): своим городом.",
            },
            {
                'body': "Какое слово является синонимом слова «быстро»?",
                'options': [
                    ("тихо", False),
                    ("редко", False),
                    ("скоро", True),
                    ("медленно", False),
                ],
                'explanation': "Синоним слова «быстро» — «скоро».",
            },
            {
                'body': "Я каждый день .... кофе утром",
                'options': [
                    ("пью", True),
                    ("пьёт", False),
                    ("пьёшь", False),
                    ("пить", False),
                ],
                'explanation': "С местоимением 1-го лица ед. числа «Я» сочетается глагол в форме «пью».",
            },
            {
                'body': "Ты уже поел? -- нет, я ещё не ....",
                'options': [
                    ("есть", False),
                    ("ем", False),
                    ("ел", True),
                    ("будут есть", False),
                ],
                'explanation': "Ответ в прошедшем времени: «нет, я ещё не ел».",
            },
            {
                'body': "Выберите антоним к слову «большой»",
                'options': [
                    ("маленький", True),
                    ("широкий", False),
                    ("высокий", False),
                    ("длинный", False),
                ],
                'explanation': "Антонимом к слову «большой» является «маленький».",
            },
            {
                'body': "Какое слово является прилагательным?",
                'options': [
                    ("быстро", False),
                    ("красивый", True),
                    ("читать", False),
                    ("дом", False),
                ],
                'explanation': "Слово «красивый» отвечает на вопрос «какой?» и является именем прилагательным.",
            },
        ]

        created_questions = []
        for q_data in questions_data:
            q = Question.objects.create(
                body=f"<p>{q_data['body']}</p>",
                subject=subject,
                question_type='single_choice',
                difficulty='easy',
                category='history',
                explanation=q_data.get('explanation', ''),
            )
            AnswerOption.objects.bulk_create([
                AnswerOption(question=q, text=opt_text, is_correct=is_corr)
                for opt_text, is_corr in q_data['options']
            ])
            created_questions.append(q)

        test_set.questions.add(*created_questions)

        self.stdout.write(self.style.SUCCESS(
            f"\nTest to'plami muvaffaqiyatli yaratildi!\n"
            f"ID: {test_set.id}\n"
            f"Fan: {subject.name}\n"
            f"Muallif: {user.last_name} {user.first_name} (@{user.username})\n"
            f"Savollar soni: {len(created_questions)} ta\n"
        ))
