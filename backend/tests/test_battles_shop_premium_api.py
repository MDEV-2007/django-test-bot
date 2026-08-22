"""JSON API for Battle Arena (AI-bot flow), Shop, and Premium checkout — Bosqich 1b of the
Next.js migration. WebSocket PvP (battles/consumers.py) isn't covered here — Channels
consumers need an async test client, out of scope for this smoke-level API check."""
import io

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from PIL import Image
from rest_framework_simplejwt.tokens import RefreshToken

from premium.models import SubscriptionPlan
from shop.models import ShopItem
from tests.factories import make_question, make_subject, make_user


def _auth_client(client, user):
    access = str(RefreshToken.for_user(user).access_token)
    client.defaults['HTTP_AUTHORIZATION'] = f'Bearer {access}'
    return client


class BattleApiTests(TestCase):
    def setUp(self):
        self.user, self.profile = make_user('battle_student')
        self.subject = make_subject()
        make_question(subject=self.subject, body='1+1?', correct='2', wrong='3')
        make_question(subject=self.subject, body='2+2?', correct='4', wrong='5')
        _auth_client(self.client, self.user)

    def test_ai_battle_full_flow(self):
        start = self.client.post('/api/battles/start-quiz/')
        self.assertEqual(start.status_code, 200)
        data = start.json()
        battle_id = data['battle_id']
        self.assertEqual(len(data['questions']), 2)

        for q in data['questions']:
            choice_id = q['choices'][0]['id']
            resp = self.client.post('/api/battles/submit-round/', {
                'battle_id': battle_id, 'round_number': q['round_number'], 'choice_id': choice_id,
            }, content_type='application/json')
            self.assertEqual(resp.status_code, 200)

        finish = self.client.post('/api/battles/finish/', {'battle_id': battle_id}, content_type='application/json')
        self.assertEqual(finish.status_code, 200)
        self.assertIn(finish.json()['result'], ('win', 'loss', 'draw'))

    def test_battle_mission_counts_participation_not_only_wins(self):
        """Vazifa matni "1 ta jangda qatnashish" — natija muhim emas.

        Regressiya: ilgari progress faqat g'alaba holatida oshardi, shuning uchun
        yutqazgan o'quvchining vazifasi jang qilgani bilan 0/1 bo'lib qolaverardi."""
        from core.models import DailyMission, ProfileMission

        mission = DailyMission.objects.create(
            title='Arena jangi', description='Battle Arenada 1 ta jangda qatnashish',
            xp_reward=200, coin_reward=20, target_count=1, action_type='battle',
        )
        pm = ProfileMission.objects.create(profile=self.profile, mission=mission)

        start = self.client.post('/api/battles/start-quiz/')
        battle_id = start.json()['battle_id']
        # Har bir raundda ATAYLAB noto'g'ri javob: g'alaba imkoniyati qolmasin.
        for q in start.json()['questions']:
            wrong = [c for c in q['choices'] if c['text'] != '2' and c['text'] != '4']
            choice_id = (wrong or q['choices'])[0]['id']
            self.client.post('/api/battles/submit-round/', {
                'battle_id': battle_id, 'round_number': q['round_number'], 'choice_id': choice_id,
            }, content_type='application/json')

        finish = self.client.post('/api/battles/finish/', {'battle_id': battle_id},
                                  content_type='application/json')
        self.assertEqual(finish.status_code, 200)

        pm.refresh_from_db()
        self.assertEqual(pm.current_count, 1)
        self.assertTrue(pm.is_completed)

    def test_arena_stats(self):
        response = self.client.get('/api/battles/')
        self.assertEqual(response.status_code, 200)
        self.assertIn('elo_rating', response.json())


class ShopApiTests(TestCase):
    def setUp(self):
        self.user, self.profile = make_user('shop_student', coins=500)
        self.item = ShopItem.objects.create(
            slug='test_title', name='Test Unvon', category=ShopItem.CATEGORY_TITLE,
            price_coins=100, payload={'title': 'Sinovchi'}, is_active=True,
        )
        _auth_client(self.client, self.user)

    def test_purchase_then_equip_then_unequip(self):
        buy = self.client.post(f'/api/shop/buy/{self.item.slug}/')
        self.assertEqual(buy.status_code, 200)
        self.assertTrue(buy.json()['ok'])
        self.assertEqual(buy.json()['coins'], 400)

        equip = self.client.post(f'/api/shop/equip/{self.item.slug}/')
        self.assertTrue(equip.json()['ok'])

        unequip = self.client.post(f'/api/shop/unequip/{self.item.slug}/')
        self.assertTrue(unequip.json()['ok'])

    def test_purchase_without_enough_coins_fails_cleanly(self):
        poor_user, _ = make_user('poor_student', coins=0)
        _auth_client(self.client, poor_user)
        response = self.client.post(f'/api/shop/buy/{self.item.slug}/')
        self.assertEqual(response.status_code, 400)
        self.assertFalse(response.json()['ok'])

    def test_shop_home_lists_categories(self):
        response = self.client.get('/api/shop/')
        self.assertEqual(response.status_code, 200)
        self.assertIn('Unvon', response.json()['categories'])


class PremiumApiTests(TestCase):
    def setUp(self):
        self.user, self.profile = make_user('premium_student')
        self.plan = SubscriptionPlan.objects.create(
            plan_type='mock_test', name='Mock test', price='15000', duration_days=0,
        )
        _auth_client(self.client, self.user)

    def _fake_screenshot(self):
        buf = io.BytesIO()
        Image.new('RGB', (10, 10), color='white').save(buf, format='PNG')
        buf.seek(0)
        return SimpleUploadedFile('proof.png', buf.read(), content_type='image/png')

    def test_checkout_creates_a_pending_payment(self):
        response = self.client.post(f'/api/premium/checkout/{self.plan.id}/', {
            'screenshot': self._fake_screenshot(),
        }, format='multipart')
        self.assertEqual(response.status_code, 200)
        payment_id = response.json()['payment_id']

        status_resp = self.client.get(f'/api/premium/payments/{payment_id}/')
        self.assertEqual(status_resp.json()['status'], 'pending')

    def test_checkout_without_a_screenshot_is_rejected(self):
        response = self.client.post(f'/api/premium/checkout/{self.plan.id}/', {}, format='multipart')
        self.assertEqual(response.status_code, 400)

    def test_payment_screenshot_requires_token_and_ownership(self):
        checkout = self.client.post(f'/api/premium/checkout/{self.plan.id}/', {
            'screenshot': self._fake_screenshot(),
        }, format='multipart')
        payment_id = checkout.json()['payment_id']

        no_token = self.client.get(f'/api/premium/payments/{payment_id}/screenshot/')
        self.assertEqual(no_token.status_code, 404)

        access = str(RefreshToken.for_user(self.user).access_token)
        ok = self.client.get(f'/api/premium/payments/{payment_id}/screenshot/?token={access}')
        self.assertEqual(ok.status_code, 200)

        other_user, _ = make_user('someone_else_premium')
        other_access = str(RefreshToken.for_user(other_user).access_token)
        forbidden = self.client.get(f'/api/premium/payments/{payment_id}/screenshot/?token={other_access}')
        self.assertEqual(forbidden.status_code, 404)
