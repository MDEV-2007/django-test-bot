from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from django.db import transaction

from tests_app.models import Subject, TestSet, Question, AnswerOption
from learning.models import Topic, Lesson
from games.models import Game, GameItem


class Command(BaseCommand):
    help = ("Creates demo panel accounts and content: 1 superadmin, 2 teachers, and for "
            "each teacher 2 tests / 2 lessons / 2 games. Idempotent (re-running updates the "
            "same accounts rather than duplicating).")

    @transaction.atomic
    def handle(self, *args, **options):
        subject, _ = Subject.objects.get_or_create(name="Tarix", defaults={'slug': 'tarix'})
        topic = Topic.objects.filter(category='history').first()
        if topic is None:
            topic = Topic.objects.create(title="Umumiy tarix", slug="umumiy-tarix", category='history')

        # --- Super admin ---
        admin = self._user('demo_admin', 'Demo', 'Admin', 'superadmin')
        self.stdout.write(self.style.SUCCESS(f"Super Admin: demo_admin / parol: demo12345"))

        # --- Teachers ---
        for n in (1, 2):
            teacher = self._user(f'demo_teacher{n}', f'Ustoz{n}', 'Tarixchi', 'teacher')
            self.stdout.write(self.style.SUCCESS(f"O'qituvchi: demo_teacher{n} / parol: demo12345"))
            for t in (1, 2):
                self._make_test(teacher, subject, n, t)
                self._make_lesson(teacher, topic, n, t)
                self._make_game(teacher, subject, n, t)

        self.stdout.write(self.style.SUCCESS("Demo ma'lumotlar tayyor."))

    def _user(self, username, first, last, role):
        user, created = User.objects.get_or_create(
            username=username, defaults={'first_name': first, 'last_name': last})
        user.first_name, user.last_name = first, last
        user.is_active = True
        if role == 'superadmin':
            user.is_staff = True
            user.is_superuser = True
        user.set_password('demo12345')
        user.save()
        user.profile.role = role
        user.profile.save()
        return user

    def _make_test(self, teacher, subject, n, t):
        title = f"Ustoz{n} — Demo test {t}"
        if TestSet.objects.filter(title=title, created_by=teacher).exists():
            return
        test = TestSet.objects.create(
            title=title, subject=subject, category='history', duration_minutes=10,
            created_by=teacher, is_published=(t == 1),
            description="Demo test — panel namoyishi uchun.",
        )
        order = []
        for i in range(1, 4):
            q = Question.objects.create(
                body=f"<p>Demo savol {i}: O'zbekiston tarixidan qaysi javob to'g'ri?</p>",
                question_type='single_choice', category='history', difficulty='easy',
            )
            AnswerOption.objects.bulk_create([
                AnswerOption(question=q, text=f"To'g'ri javob {i}", is_correct=True),
                AnswerOption(question=q, text="Noto'g'ri A", is_correct=False),
                AnswerOption(question=q, text="Noto'g'ri B", is_correct=False),
            ])
            test.questions.add(q)
            order.append(q.id)
        test.question_order = order
        test.save(update_fields=['question_order'])

    def _make_lesson(self, teacher, topic, n, t):
        title = f"Ustoz{n} — Demo dars {t}"
        Lesson.objects.get_or_create(
            title=title, created_by=teacher,
            defaults={'topic': topic, 'content': "<p>Demo dars matni. Bu yerda o'quv materiali bo'ladi.</p>",
                      'is_published': (t == 1), 'order': t},
        )

    def _make_game(self, teacher, subject, n, t):
        title = f"Ustoz{n} — Demo o'yin {t}"
        if Game.objects.filter(title=title, created_by=teacher).exists():
            return
        game = Game.objects.create(
            title=title, game_type='flashcards', subject=subject,
            created_by=teacher, is_published=(t == 1),
            description="Demo flesh-karta o'yini.",
        )
        GameItem.objects.bulk_create([
            GameItem(game=game, front_text="Amir Temur tavalludi", back_text="1336-yil", order=0),
            GameItem(game=game, front_text="Mustaqillik yili", back_text="1991-yil", order=1),
            GameItem(game=game, front_text="Registon qayerda?", back_text="Samarqand", order=2),
        ])
