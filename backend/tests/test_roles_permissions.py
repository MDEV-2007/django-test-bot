"""5-kun: Teacher / Super Admin — backend permission, object-level ruxsat (IDOR) va audit.

- Student / anonim -> barcha parametrsiz Super Admin GET endpointlari 403 / 401;
- Teacher boshqa o'qituvchining test, natija, baholash resursiga kira olmaydi (404);
- Teacher XP / tanga balansini o'zgartira olmaydi;
- Sertifikat: begona o'qituvchi istalgan o'quvchining sertifikatini ololmaydi (IDOR);
- Super Admin xavfli amallari (o'chirish, rol, blok, balans, premium, impersonatsiya)
  va o'qituvchi baholashi audit jurnaliga yoziladi;
- Sinf to'lov cheki ommaviy emas: faqat ruxsatli admin view orqali.
"""
import io
import tempfile

from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import Client, TestCase, override_settings
from django.urls import URLPattern, URLResolver, get_resolver
from PIL import Image
from rest_framework.test import APIClient

from panel.models import AuditLog
from teacher.models import TeacherStudent
from tests_app.models import Attempt

from .factories import make_attempt, make_question, make_subject, make_test_set, make_user


def api(user=None):
    c = APIClient()
    if user is not None:
        c.force_authenticate(user)
    return c


def _panel_get_routes():
    """`api/panel/` ostidagi parametrsiz yo'llar (IsSuperAdmin bilan himoyalanganlar)."""
    out = []

    def walk(patterns, prefix):
        for p in patterns:
            if isinstance(p, URLResolver):
                walk(p.url_patterns, prefix + str(p.pattern))
            elif isinstance(p, URLPattern):
                route = prefix + str(p.pattern)
                cb = p.callback
                view = getattr(cb, 'cls', None)
                perms = [getattr(x, '__name__', '') for x in getattr(view, 'permission_classes', [])]
                if route.startswith('api/panel/') and '<' not in route and 'IsSuperAdmin' in perms:
                    out.append('/' + route)

    walk(get_resolver().url_patterns, '')
    return sorted(set(out))


class AdminEndpointAccessTests(TestCase):
    def test_student_and_anonymous_are_refused_everywhere(self):
        student, _ = make_user('oddiy')
        teacher, _ = make_user('ustoz_x', role='teacher')
        routes = _panel_get_routes()
        self.assertGreater(len(routes), 30)
        for route in routes:
            self.assertIn(api().get(route).status_code, (401, 403), route)
            self.assertEqual(api(student).get(route).status_code, 403, route)
            self.assertEqual(api(teacher).get(route).status_code, 403, route)

    def test_teacher_cannot_change_balances(self):
        teacher, _ = make_user('ustoz_y', role='teacher')
        victim, vprof = make_user('qurbon')
        res = api(teacher).post(f'/api/panel/users/{victim.id}/adjust/', {'coins': 999999}, format='json')
        self.assertEqual(res.status_code, 403)
        vprof.refresh_from_db()
        self.assertEqual(vprof.coins, 0)


class TeacherObjectScopeTests(TestCase):
    def setUp(self):
        self.t1, self.p1 = make_user('ustoz1', role='teacher')
        self.t2, self.p2 = make_user('ustoz2', role='teacher')
        subject = make_subject()
        q = make_question(subject=subject)
        self.test = make_test_set(subject=subject, questions=[q], title='Ustoz1 testi')
        self.test.created_by = self.t1
        self.test.save()
        _, student = make_user('talaba')
        self.attempt = make_attempt(student, self.test, [q])

    def test_other_teacher_gets_404_on_foreign_test(self):
        intruder = api(self.t2)
        pk = self.test.pk
        for method, url in (
            ('get', f'/api/teacher/tests/{pk}/info/'),
            ('get', f'/api/teacher/tests/{pk}/build/'),
            ('get', f'/api/teacher/tests/{pk}/results/'),
            ('post', f'/api/teacher/tests/{pk}/publish/'),
            ('post', f'/api/teacher/tests/{pk}/delete/'),
            ('get', f'/api/teacher/tests/{pk}/attempts/{self.attempt.id}/grade/'),
        ):
            res = getattr(intruder, method)(url, {}, format='json')
            self.assertIn(res.status_code, (403, 404, 405), (method, url, res.status_code))
            self.assertNotEqual(res.status_code, 200, url)
        self.test.refresh_from_db()
        self.assertTrue(self.test.is_published)

    def test_student_cannot_use_teacher_api(self):
        student, _ = make_user('talaba2')
        self.assertEqual(api(student).get('/api/teacher/tests/').status_code, 403)


class CertificateIdorTests(TestCase):
    def setUp(self):
        self.student_user, self.student = make_user('sert_talaba')
        subject = make_subject()
        q = make_question(subject=subject)
        test = make_test_set(subject=subject, questions=[q])
        self.attempt = make_attempt(self.student, test, [q])
        Attempt.objects.filter(pk=self.attempt.pk).update(is_completed=True, score=80)
        self.url = f'/api/panel/certificate/{self.attempt.id}/'

    def test_unrelated_teacher_is_refused(self):
        teacher, _ = make_user('begona_ustoz', role='teacher')
        self.assertEqual(api(teacher).get(self.url).status_code, 403)
        other_student, _ = make_user('boshqa_talaba')
        self.assertEqual(api(other_student).get(self.url).status_code, 403)

    def test_class_teacher_and_owner_are_allowed(self):
        teacher, tprof = make_user('sinf_ustozi', role='teacher')
        TeacherStudent.objects.create(teacher=tprof, student=self.student)
        self.assertNotEqual(api(teacher).get(self.url).status_code, 403)
        self.assertNotEqual(api(self.student_user).get(self.url).status_code, 403)


class AdminAuditTests(TestCase):
    def setUp(self):
        self.admin, _ = make_user('bosh', role='superadmin')
        self.c = api(self.admin)
        self.target, self.tprof = make_user('nishon')

    def logs(self, model='User'):
        return AuditLog.objects.filter(model_name=model, user=self.admin)

    def test_destructive_and_sensitive_actions_are_audited(self):
        uid = self.target.id
        self.c.post(f'/api/panel/users/{uid}/toggle-block/')
        self.c.post(f'/api/panel/users/{uid}/adjust/', {'coins': 500}, format='json')
        self.c.post(f'/api/panel/users/{uid}/set-premium/', {'grant': True}, format='json')
        self.c.post(f'/api/panel/users/{uid}/reset-password/', {}, format='json')
        self.assertTrue(self.logs().filter(changes__has_key='is_active').exists())
        self.assertTrue(AuditLog.objects.filter(model_name='Profile', changes__has_key='coins').exists())
        self.assertTrue(AuditLog.objects.filter(model_name='Profile', changes__has_key='is_premium').exists())
        reset = self.logs().filter(object_repr__contains='parol').get()
        self.assertNotIn('new_password', str(reset.changes))
        res = self.c.delete(f'/api/panel/users/{uid}/edit/')
        self.assertEqual(res.status_code, 200, res.content)
        self.assertTrue(self.logs().filter(action='delete', object_id=str(uid)).exists())

    def test_impersonation_is_audited(self):
        res = self.c.post(f'/api/panel/users/{self.target.id}/impersonate/')
        self.assertEqual(res.status_code, 200, res.content)
        self.assertTrue(self.logs().filter(object_repr__contains='Impersonatsiya').exists())


class TeacherGradingAuditTests(TestCase):
    def test_grading_is_audited_and_writing_not_counted(self):
        teacher, _ = make_user('baholovchi', role='teacher')
        subject = make_subject()
        from tests_app.models import Question
        open_q = Question.objects.create(body='Ochiq savol', subject=subject, question_type='open_written')
        writing = Question.objects.create(body='Esse', subject=subject, question_type='writing_task')
        test = make_test_set(subject=subject, questions=[open_q, writing])
        test.created_by = teacher
        test.save()
        _, student = make_user('esse_talaba')
        attempt = make_attempt(student, test, [open_q, writing])
        ans = attempt.answers.get(question=open_q)
        ans.text_answer = 'javob'
        ans.save()
        res = api(teacher).post(f'/api/teacher/tests/{test.pk}/attempts/{attempt.id}/grade/',
                                {'grades': {str(ans.id): True}}, format='json')
        self.assertEqual(res.status_code, 200, res.content)
        attempt.refresh_from_db()
        # writing_task maxrajga kirmaydi: 1/1 = 100%, ilgari 1/2 = 50% chiqardi.
        self.assertEqual(attempt.score, 100.0)
        log = AuditLog.objects.get(model_name='Attempt', object_id=str(attempt.id))
        self.assertEqual(log.user, teacher)
        self.assertIn(f'answer:{ans.id}', log.changes)


@override_settings(MEDIA_ROOT=tempfile.mkdtemp(prefix='ilm_receipts_'))
class ReceiptPrivacyTests(TestCase):
    def setUp(self):
        from tests.test_classroom_payments import make_payment, make_student, make_subscription, make_teacher
        self.teacher = make_teacher('chek_ustoz')
        other_teacher = make_teacher('boshqa_chek_ustoz')
        student = make_student('chek_talaba')
        sub = make_subscription(student, self.teacher)
        buf = io.BytesIO()
        Image.new('RGB', (4, 4), 'red').save(buf, format='PNG')
        self.payment = make_payment(sub, receipt=SimpleUploadedFile('chek.png', buf.getvalue(), 'image/png'))
        self.other_teacher_user = other_teacher.profile.user
        self.url = f'/admin/classroom/payment/{self.payment.pk}/receipt/'

    def test_superuser_can_view_receipt(self):
        root = User.objects.create_superuser('root_chek', 'r@x.uz', 'pw-root-12345')
        c = Client()
        c.force_login(root)
        res = c.get(self.url)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res['Content-Type'], 'image/png')
        res.close()

    def test_anonymous_and_foreign_teacher_cannot(self):
        res = Client().get(self.url)
        self.assertIn(res.status_code, (302, 403, 404))
        self.other_teacher_user.is_staff = True
        self.other_teacher_user.save()
        c = Client()
        c.force_login(self.other_teacher_user)
        self.assertIn(c.get(self.url).status_code, (302, 403, 404))

    def test_admin_list_links_to_gated_view_not_media(self):
        from classroom.admin import PaymentAdmin
        from django.contrib import admin as dj_admin
        link = PaymentAdmin(type(self.payment), dj_admin.site).receipt_link(self.payment)
        self.assertIn('/receipt/', link)
        self.assertNotIn('/media/', link)
