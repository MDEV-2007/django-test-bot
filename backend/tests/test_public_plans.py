"""Landing sahifasi uchun ochiq tariflar endpointi.

Bu YAGONA ochiq (autentifikatsiyasiz) premium endpoint, shuning uchun ikki narsa
tekshiriladi:

  1. Kirmasdan ham ishlaydi — landing sahifasi narxlarni shu yerdan oladi. Ilgari
     narxlar frontendda qo'lda yozilgan edi va tariflar o'zgargach eskirib qoldi.
  2. Foydalanuvchi holatini SIZDIRMAYDI — `plans_api` dan farqli o'laroq, bu yerda
     `is_premium`, obuna muddati kabi maydonlar bo'lmasligi kerak.
"""
from decimal import Decimal

from django.test import TestCase
from rest_framework.test import APIClient

from premium.models import SubscriptionPlan


class PublicPlansTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_works_without_authentication(self):
        response = self.client.get('/api/premium/public-plans/')

        self.assertEqual(response.status_code, 200)
        self.assertIn('plans', response.json())

    def test_returns_the_canonical_catalogue(self):
        """Ro'yxat `premium/plan_catalog.py` dan keladi — bootstrap uni o'zi yaratadi."""
        payload = self.client.get('/api/premium/public-plans/').json()['plans']

        by_type = {}
        for plan in payload:
            by_type.setdefault(plan['plan_type'], []).append(plan)

        self.assertIn('mock_test', by_type)
        self.assertIn('lessons', by_type)
        # Landing sahifasi aynan 30 kunlik tarifni "boshlanish narxi" deb ko'rsatadi.
        self.assertTrue(any(p['duration_days'] == 30 for p in by_type['lessons']))

    def test_does_not_leak_user_state(self):
        payload = self.client.get('/api/premium/public-plans/').json()

        for leaked in ('is_premium', 'has_active_premium_lessons', 'premium_mock_test_unlocked',
                       'premium_expires_at'):
            self.assertNotIn(leaked, payload)

    def test_inactive_plans_are_hidden(self):
        SubscriptionPlan.objects.create(
            name="O'chirilgan tarif", plan_type='lessons', price=Decimal('1'),
            duration_days=30, is_active=False,
        )

        names = [p['name'] for p in self.client.get('/api/premium/public-plans/').json()['plans']]

        self.assertNotIn("O'chirilgan tarif", names)

    def test_authenticated_plans_endpoint_still_requires_login(self):
        """Ochiq endpoint qo'shilgani eski, holatli endpointni ochib yubormasligi kerak."""
        self.assertEqual(self.client.get('/api/premium/plans/').status_code, 401)
