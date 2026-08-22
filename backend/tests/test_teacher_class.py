"""Feature 1 — o'qituvchi-orqali-sinf testlari."""
from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import Profile, ensure_profile_for_user
from accounts.referrals import apply_referral, ensure_referral_code
from teacher.models import TeacherProfile, TeacherStudent
from tests_app.models import Attempt, AttemptAnswer, Question, Subject, Topic


def _api(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


class TeacherClassTests(TestCase):
    def setUp(self):
        self.teacher_user = User.objects.create_user('ustoz', password='x')
        self.teacher = ensure_profile_for_user(self.teacher_user)
        self.teacher.role = 'teacher'
        self.teacher.save(update_fields=['role'])
        ensure_referral_code(self.teacher)

        # Migratsiyalar bazaga standart fanlarni qo'shib qo'yadi — dublikat yaratmaymiz.
        self.subject, _ = Subject.objects.get_or_create(slug='tarix', defaults={'name': 'Tarix'})
        self.topic = Topic.objects.create(title='Amir Temur davri', slug='amir-temur-davri', subject=self.subject)

    def _student(self, username='oquvchi'):
        user = User.objects.create_user(username, password='x')
        return ensure_profile_for_user(user)

    def test_referral_by_teacher_links_student_to_class(self):
        student = self._student()
        apply_referral(student, self.teacher.referral_code)

        link = TeacherStudent.objects.get(student=student)
        self.assertEqual(link.teacher_id, self.teacher.id)

    def test_referral_by_student_does_not_create_class_link(self):
        """Oddiy o'quvchining referrali sinf bog'lanishini yaratmasligi kerak."""
        referrer = self._student('referrer')
        ensure_referral_code(referrer)
        invited = self._student('invited')

        apply_referral(invited, referrer.referral_code)

        self.assertFalse(TeacherStudent.objects.filter(student=invited).exists())

    def test_register_teacher_sets_role_and_profile(self):
        user = User.objects.create_user('yangi', password='x')
        response = _api(user).post('/api/teacher/register/', {
            'full_name': 'Aziz Karimov', 'subject': 'Tarix', 'institution': '11-maktab',
        }, format='json')

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()['referral_code'])
        self.assertEqual(Profile.objects.get(user=user).role, 'teacher')
        self.assertEqual(TeacherProfile.objects.get(profile__user=user).subject, 'Tarix')

    def test_dashboard_reports_students_and_weak_topics(self):
        student = self._student()
        apply_referral(student, self.teacher.referral_code)

        attempt = Attempt.objects.create(profile=student, is_completed=True, score=40)
        for i in range(4):
            question = Question.objects.create(
                body=f'Savol {i}', topic=self.topic, subject=self.subject, difficulty='medium',
            )
            AttemptAnswer.objects.create(attempt=attempt, question=question, is_correct=(i == 0))

        data = _api(self.teacher_user).get('/api/teacher/me/dashboard/').json()

        self.assertEqual(data['summary']['student_count'], 1)
        self.assertEqual(data['students'][0]['tests'], 1)
        weak = data['weak_topics'][0]
        self.assertEqual(weak['title'], 'Amir Temur davri')
        self.assertEqual(weak['avg_score'], 25)  # 4 tadan 1 tasi to'g'ri

    def test_student_detail_is_scoped_to_own_class(self):
        """Boshqa o'qituvchining o'quvchisi ko'rinmasligi kerak (IDOR)."""
        outsider = self._student('begona')

        response = _api(self.teacher_user).get(f'/api/teacher/me/students/{outsider.id}/')

        self.assertEqual(response.status_code, 404)

    def test_students_cannot_open_teacher_dashboard(self):
        student = self._student()

        response = _api(student.user).get('/api/teacher/me/dashboard/')

        self.assertEqual(response.status_code, 403)
