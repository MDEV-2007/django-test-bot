"""Tarif katalogi: nomni o'zgartirish dublikat yaratmasligi kerak.

Real xato: `seed_plans_if_needed()` (har `/api/premium/plans/` so'rovida ishlaydi)
tarifni NOM bo'yicha qidirardi — `get_or_create(name=...)`. Tarif nomi o'zgargan
zahoti (management komanda orqali yoki admin panelda qo'lda) u tarifni "yo'q" deb
hisoblab, eski nom va ESKI NARX bilan yangi qator yaratardi. Natijada o'quvchi
katalogda ikki xil narxli bir xil tarifni ko'rardi.

Shu test o'sha stsenariyni takrorlaydi.
"""
from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import ensure_profile_for_user
from premium.models import SubscriptionPlan
from premium.plan_catalog import duplicate_plans, plans, sync_plans
from premium.services import seed_plans_if_needed


class PlanCatalogTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user('tarifchi', password='x')
        ensure_profile_for_user(self.user)
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_bootstrap_creates_the_canonical_plans_once(self):
        seed_plans_if_needed()
        first = SubscriptionPlan.objects.count()

        seed_plans_if_needed()

        self.assertEqual(first, len(plans()))
        self.assertEqual(SubscriptionPlan.objects.count(), first)

    def test_renaming_a_plan_does_not_create_a_duplicate(self):
        seed_plans_if_needed()
        plan = SubscriptionPlan.objects.filter(plan_type='lessons', duration_days=30).first()
        plan.name = 'Butunlay boshqa nom'
        plan.save(update_fields=['name'])

        seed_plans_if_needed()

        self.assertEqual(
            SubscriptionPlan.objects.filter(plan_type='lessons', duration_days=30).count(), 1)
        self.assertEqual(duplicate_plans(), [])

    def test_bootstrap_never_overwrites_a_manually_set_price(self):
        """Admin panelda qo'lda qo'yilgan narx har so'rovda qayta yozilmasligi kerak."""
        seed_plans_if_needed()
        plan = SubscriptionPlan.objects.filter(plan_type='lessons', duration_days=30).first()
        plan.price = 1
        plan.save(update_fields=['price'])

        seed_plans_if_needed()

        plan.refresh_from_db()
        self.assertEqual(int(plan.price), 1)

    def test_management_sync_does_update_existing_content(self):
        seed_plans_if_needed()
        plan = SubscriptionPlan.objects.filter(plan_type='lessons', duration_days=30).first()
        plan.price = 1
        plan.name = 'eskirgan'
        plan.save(update_fields=['price', 'name'])

        sync_plans(update_existing=True)

        plan.refresh_from_db()
        self.assertEqual(plan.name, 'PRO — Oylik')
        self.assertEqual(int(plan.price), 25000)

    def test_no_plan_advertises_lessons_that_do_not_exist_yet(self):
        """Darslar bazasi bo'sh ekan, hech bir tarif ularni MAVJUD deb sotmasligi kerak.

        Ruxsat etilgan yagona shakl — kelasi zamondagi va'da ("tayyor bo'lgach"),
        u xususiyat ro'yxatida ochiq yozilgan."""
        for spec in plans():
            for feature in spec['features']:
                low = feature.lower()
                if 'dars' in low:
                    self.assertIn("tayyor bo'lgach", low, msg=(
                        f"{spec['name']} tarifi darslarni mavjud deb va'da qilyapti: {feature!r}"
                    ))

    def test_longer_plans_cost_less_per_day(self):
        """Narx zinapoyasi: uzoqroq muddat — arzonroq kunlik narx. Aks holda uzoq
        muddatni tanlashning sababi qolmaydi (ilgari 12 oylik 6 oylikdan qimmat edi)."""
        subs = sorted(
            (p for p in plans() if p['duration_days'] > 0),
            key=lambda p: p['duration_days'],
        )
        per_day = [float(p['price']) / p['duration_days'] for p in subs]
        self.assertEqual(per_day, sorted(per_day, reverse=True), msg=f"kunlik narxlar: {per_day}")

    def test_plans_endpoint_returns_exactly_the_catalog(self):
        data = self.client.get('/api/premium/plans/').json()

        self.assertEqual(len(data['plans']), len(plans()))
        self.assertEqual(
            {p['name'] for p in data['plans']},
            {p['name'] for p in plans()},
        )
