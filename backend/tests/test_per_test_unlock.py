"""Mock test tarifi BITTA testni ochadi.

Qoida: o'quvchi qaysi test kartasidan to'lovga o'tgan bo'lsa, tasdiqlangandan keyin
faqat o'sha test ochiladi. Boshqa premium testlar qulf bo'lib qoladi.

Eski xulq saqlanadi: testga bog'lanmagan mock-test to'lovi (bot orqali xarid yoki
adminning qo'lda ruxsati) hamon barcha mock testlarni ochadi.
"""
from decimal import Decimal

from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import ensure_profile_for_user
from premium.models import Payment, SubscriptionPlan, unlocked_test_ids
from tests_app.models import Subject, TestSet


class PerTestUnlockTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user('xaridor', password='x')
        self.profile = ensure_profile_for_user(self.user)
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

        self.subject, _ = Subject.objects.get_or_create(slug='tarix', defaults={'name': 'Tarix'})
        self.paid_test = TestSet.objects.create(
            title='Sotib olingan test', subject=self.subject, category='certificate',
            is_premium=True, is_published=True, duration_minutes=10,
        )
        self.other_test = TestSet.objects.create(
            title='Boshqa premium test', subject=self.subject, category='certificate',
            is_premium=True, is_published=True, duration_minutes=10,
        )
        self.plan = SubscriptionPlan.objects.create(
            name='Mock Test — bir martalik', plan_type='mock_test',
            price=Decimal('15000'), duration_days=0,
        )

    def _approve(self, test=None):
        payment = Payment.objects.create(
            profile=self.profile, plan=self.plan, amount=self.plan.price,
            status='approved', test=test,
        )
        payment.apply_to_profile()
        self.profile.refresh_from_db()
        return payment

    def test_paid_test_is_unlocked_and_others_stay_locked(self):
        self._approve(test=self.paid_test)

        data = self.client.get('/api/tests/').json()
        by_id = {t['id']: t for t in data['tests']}

        self.assertTrue(by_id[self.paid_test.id]['is_unlocked'])
        self.assertFalse(by_id[self.other_test.id]['is_unlocked'])
        # Global bayroq TEGILMAYDI — aks holda hamma test ochilib ketardi.
        self.assertFalse(self.profile.premium_mock_test_unlocked)

    def test_paid_test_can_be_started_but_other_cannot(self):
        self._approve(test=self.paid_test)

        ok = self.client.post(f'/api/tests/{self.paid_test.id}/start/')
        denied = self.client.post(f'/api/tests/{self.other_test.id}/start/')

        self.assertEqual(ok.status_code, 200)
        self.assertEqual(denied.status_code, 403)

    def test_payment_without_a_test_still_unlocks_everything(self):
        """Bot orqali xarid / eski to'lovlar: test bog'lanmagan — eski xulq saqlanadi."""
        self._approve(test=None)

        data = self.client.get('/api/tests/').json()

        self.assertTrue(self.profile.premium_mock_test_unlocked)
        self.assertTrue(all(t['is_unlocked'] for t in data['tests'] if t['is_premium']))

    def test_pending_payment_does_not_unlock_anything(self):
        Payment.objects.create(
            profile=self.profile, plan=self.plan, amount=self.plan.price,
            status='pending', test=self.paid_test,
        )

        self.assertEqual(unlocked_test_ids(self.profile), set())
        response = self.client.post(f'/api/tests/{self.paid_test.id}/start/')
        self.assertEqual(response.status_code, 403)

    def test_checkout_links_the_payment_to_the_chosen_test(self):
        info = self.client.get(f'/api/premium/checkout/{self.plan.id}/?test={self.paid_test.id}').json()

        self.assertEqual(info['test']['id'], self.paid_test.id)
        self.assertEqual(info['test']['title'], 'Sotib olingan test')

    def test_active_pro_subscription_unlocks_every_mock_test(self):
        """PRO obuna BARCHA mock testlarni ochadi.

        Ilgari obuna faqat video/audio darslarni ochardi — darslar esa hali
        deyarli yo'q edi, ya'ni obunachi to'lab hech narsa olmasdi. Endi obuna
        ochadigan asosiy narsa aynan mock testlar."""
        sub_plan = SubscriptionPlan.objects.create(
            name='PRO — Oylik', plan_type='lessons', price=Decimal('25000'), duration_days=30,
        )
        payment = Payment.objects.create(
            profile=self.profile, plan=sub_plan, amount=sub_plan.price, status='approved',
        )
        payment.apply_to_profile()
        self.profile.refresh_from_db()

        data = self.client.get('/api/tests/').json()

        self.assertTrue(data['has_mock_test_access'])
        self.assertTrue(all(t['is_unlocked'] for t in data['tests'] if t['is_premium']))
        # Katalog "ochiq" desa, start ham ruxsat berishi shart — ikkalasi bir qoidaga
        # tayanmasa, o'quvchi ochiq ko'ringan testni bosib 403 olardi.
        self.assertEqual(self.client.post(f'/api/tests/{self.other_test.id}/start/').status_code, 200)

    def test_expired_subscription_does_not_unlock_mock_tests(self):
        """Muddati tugagan obuna kirish bermaydi (aks holda bir marta to'lagan
        o'quvchi abadiy ochiq qolardi)."""
        from django.utils import timezone

        sub_plan = SubscriptionPlan.objects.create(
            name='PRO — Oylik', plan_type='lessons', price=Decimal('25000'), duration_days=30,
        )
        Payment.objects.create(
            profile=self.profile, plan=sub_plan, amount=sub_plan.price, status='approved',
        ).apply_to_profile()
        self.profile.premium_expires_at = timezone.now() - timezone.timedelta(days=1)
        self.profile.save(update_fields=['premium_expires_at'])

        data = self.client.get('/api/tests/').json()

        self.assertFalse(data['has_mock_test_access'])
        self.assertEqual(self.client.post(f'/api/tests/{self.other_test.id}/start/').status_code, 403)
