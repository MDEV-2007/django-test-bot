"""Panel'dagi test o'chirish oqimi.

Bu yerdagi asosiy shart — `test_edit_endpoint_reports_attempt_count`. Sabab: server
urinishlari bor testni ATAYLAB o'chirmaydi (o'quvchilar natijasi yo'qolmasligi
uchun), lekin interfeys buni bilmagani uchun "urinishlar ham o'chadi" deb va'da
berardi va foydalanuvchi tasdiqlagach xato olardi — tugma buzuqdek tuyulardi.

Endi interfeys urinishlar sonini oldindan oladi va o'chirish o'rniga arxivlashni
taklif qiladi. Shu sonni javobdan olib tashlash o'sha chalkashlikni qaytaradi,
shuning uchun u test bilan mahkamlangan.
"""
from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import ensure_profile_for_user
from tests_app.models import Attempt, TestSet


class PanelTestSetDeleteTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user('panel_admin', password='x', is_superuser=True)
        self.profile = ensure_profile_for_user(self.admin)
        self.client = APIClient()
        token = RefreshToken.for_user(self.admin).access_token
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

    def _url(self, ts):
        return f'/api/panel/testsets/{ts.id}/edit/'

    def test_test_without_attempts_is_deleted(self):
        ts = TestSet.objects.create(title='Urinishsiz test')

        response = self.client.delete(self._url(ts))

        self.assertEqual(response.status_code, 200)
        self.assertFalse(TestSet.objects.filter(id=ts.id).exists())

    def test_test_with_attempts_is_refused_with_a_reason(self):
        """O'quvchi natijasi bor test o'chirilmaydi — sabab javobda aytiladi."""
        ts = TestSet.objects.create(title='Urinishli test')
        Attempt.objects.create(profile=self.profile, test=ts)

        response = self.client.delete(self._url(ts))

        self.assertEqual(response.status_code, 400)
        self.assertIn('arxivlang', response.json()['error'])
        self.assertTrue(TestSet.objects.filter(id=ts.id).exists())

    def test_edit_endpoint_reports_attempt_count(self):
        """Interfeys qaysi amal mumkinligini SHU son bo'yicha hal qiladi."""
        ts = TestSet.objects.create(title='Urinishli test')
        Attempt.objects.create(profile=self.profile, test=ts)

        payload = self.client.get(self._url(ts)).json()

        self.assertEqual(payload['attempt_count'], 1)

    def test_archiving_keeps_the_test_and_its_attempts(self):
        """O'chirishning o'rnini bosuvchi yo'l: test ham, natijalar ham qoladi."""
        ts = TestSet.objects.create(title='Urinishli test', is_published=True)
        Attempt.objects.create(profile=self.profile, test=ts)

        response = self.client.put(self._url(ts), {
            'title': ts.title, 'description': '', 'category': ts.category,
            'duration_minutes': ts.duration_minutes,
            'is_premium': False, 'is_published': False, 'is_archived': True,
        })

        self.assertEqual(response.status_code, 200)
        ts.refresh_from_db()
        self.assertTrue(ts.is_archived)
        self.assertFalse(ts.is_published)
        self.assertEqual(ts.attempts.count(), 1)
