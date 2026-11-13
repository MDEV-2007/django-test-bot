"""Phase 3 audit reproducers. Run only against the throwaway SQLite test DB via run_phase3.py.
Each test PASSES when the suspected weakness is present (it documents current behaviour)."""
from datetime import timedelta
from decimal import Decimal
from unittest import mock

from django.core.cache import cache
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import Profile
from learning_loop.models import DailyLearningLoop as L
from premium.models import Payment, SubscriptionPlan
from shop.services import purchase_item
from tests.factories import make_question, make_shop_item, make_subject, make_topic, make_user


class _Base(TestCase):
    def setUp(self):
        cache.clear()
        self.user, self.profile = make_user('econ_audit')
        self.client = APIClient()
        self.client.force_authenticate(self.user)


class LoopZeroEffortTests(_Base):
    def setUp(self):
        super().setUp()
        subject = make_subject()
        topic = make_topic(subject=subject, title='Somoniylar')
        for i in range(20):
            make_question(subject=subject, topic=topic, body=f'loop savol {i}')

    def _advance_until_done(self):
        stages = []
        state = self.client.get('/api/v1/loop/current/').json()
        stage = L.objects.filter(user=self.user).order_by('-cycle_number', '-id').first().current_stage
        reward = None
        for _ in range(6):
            if stage == L.STAGE_5_COMPLETED:
                break
            r = self.client.post('/api/v1/loop/advance-stage/', {'from_stage': stage, 'payload': {}}, format='json')
            assert r.status_code == 200, r.content
            body = r.json()
            stages.append(body['current_stage'])
            reward = body['rewards_awarded'] or reward
            stage = body['current_stage']
        return stages, reward, state

    def test_ECON_001_loop_cycle_pays_without_answering_any_question(self):
        stages, reward, _ = self._advance_until_done()
        self.profile.refresh_from_db()
        print('\n[ECON-001] stages:', stages, '| reward:', {k: reward[k] for k in ('coins', 'xp', 'free_essay_credits', 'arena_won')},
              '| profile coins/xp:', self.profile.coins, self.profile.xp)
        self.assertEqual(stages[-1], L.STAGE_5_COMPLETED)
        self.assertGreater(self.profile.coins, 0)

    def test_ECON_001b_three_zero_effort_cycles_per_day(self):
        self._advance_until_done()
        for _ in range(2):
            r = self.client.post('/api/v1/loop/restart-cycle/', {}, format='json')
            self.assertEqual(r.status_code, 200, r.content)
            self._advance_until_done()
        self.profile.refresh_from_db()
        chest = self.client.post('/api/dashboard/daily-chest/open/', {}, format='json')
        print('\n[ECON-001b] after 3 zero-answer cycles coins/xp:', self.profile.coins, self.profile.xp,
              '| chest endpoint status:', chest.status_code)
        self.assertEqual(self.profile.coins, 600)


class StreakTests(_Base):
    def test_ECON_002_dashboard_get_increments_streak(self):
        Profile.objects.filter(pk=self.profile.pk).update(streak=5, last_active_date=timezone.localdate() - timedelta(days=1))
        r = self.client.get('/api/dashboard/home/')
        self.profile.refresh_from_db()
        print('\n[ECON-002] GET /api/dashboard/home/ ->', r.status_code, '| streak 5 ->', self.profile.streak)
        self.assertEqual(self.profile.streak, 6)

    def test_ECON_003_update_streak_full_save_restores_spent_coins(self):
        Profile.objects.filter(pk=self.profile.pk).update(coins=500, last_active_date=timezone.localdate() - timedelta(days=1))
        stale = Profile.objects.get(pk=self.profile.pk)            # request A loads profile (coins=500)
        item = make_shop_item(price=300)
        purchase_item(Profile.objects.get(pk=self.profile.pk), item)  # request B spends 300 coins
        after_purchase = Profile.objects.get(pk=self.profile.pk).coins
        stale.update_streak()                                        # request A: Profile.save() writes every field
        final = Profile.objects.get(pk=self.profile.pk).coins
        print('\n[ECON-003] coins: start 500 -> after purchase', after_purchase, '-> after stale update_streak()', final)
        self.assertEqual(after_purchase, 200)
        self.assertEqual(final, 500)

    def test_ECON_003b_update_streak_full_save_revokes_fresh_premium(self):
        Profile.objects.filter(pk=self.profile.pk).update(last_active_date=timezone.localdate() - timedelta(days=1))
        stale = Profile.objects.get(pk=self.profile.pk)
        plan = SubscriptionPlan.objects.create(name='PRO 30', price=Decimal('49000'), duration_days=30, plan_type='lessons')
        p = Payment.objects.create(profile=Profile.objects.get(pk=self.profile.pk), plan=plan, amount=plan.price, status='pending')
        p.apply_to_profile()
        stale.update_streak()
        fresh = Profile.objects.get(pk=self.profile.pk)
        print('\n[ECON-003b] is_premium after approval + stale update_streak():', fresh.is_premium, fresh.premium_expires_at)
        self.assertFalse(fresh.is_premium)


@override_settings(TELEGRAM_BOT_TOKEN='', REQUIRE_CHANNEL_SUBSCRIPTION=False)
class PaymentCallbackTests(_Base):
    def _payment(self):
        plan = SubscriptionPlan.objects.create(name='PRO 30', price=Decimal('49000'), duration_days=30, plan_type='lessons')
        return Payment.objects.create(profile=self.profile, plan=plan, amount=plan.price, status='pending')

    def _forged_update(self, payment_id, chat_id=777000111, from_id=777000111):
        return {'update_id': 9, 'callback_query': {
            'id': 'cb1', 'from': {'id': from_id, 'first_name': 'Student', 'username': 'not_admin'},
            'message': {'message_id': 5, 'chat': {'id': chat_id, 'type': 'private'}},
            'data': f'pay_approve_{payment_id}'}}

    def test_SEC_PAY_001_callback_from_private_chat_of_non_admin_approves_payment(self):
        from telegrambot.handlers import process_update
        p = self._payment()
        with mock.patch('telegrambot.payment_review.answer_callback'), \
             mock.patch('telegrambot.payment_review.edit_message_caption', create=True), \
             mock.patch('telegrambot.payment_review.send_message', create=True):
            process_update(self._forged_update(p.id))
        p.refresh_from_db()
        self.profile.refresh_from_db()
        print('\n[SEC-PAY-001] forged callback from private chat -> payment.status =', p.status,
              '| is_premium =', self.profile.is_premium, '| admin_note =', p.admin_note)
        self.assertEqual(p.status, 'approved')
        self.assertTrue(self.profile.is_premium)

    def test_SEC_PAY_001b_webhook_accepts_forged_callback(self):
        p = self._payment()
        import json
        with override_settings(TELEGRAM_WEBHOOK_SECRET='s3cret'), \
             mock.patch('telegrambot.views.background.submit', side_effect=lambda fn, *a, **k: fn(*a, **k)), \
             mock.patch('telegrambot.payment_review.answer_callback'):
            r = self.client.post('/telegram/webhook/', json.dumps(self._forged_update(p.id)),
                                 content_type='application/json', HTTP_X_TELEGRAM_BOT_API_SECRET_TOKEN='s3cret')
        p.refresh_from_db()
        print('\n[SEC-PAY-001b] webhook status', r.status_code, '-> payment.status =', p.status)
        self.assertEqual(p.status, 'approved')


class CapDateTests(_Base):
    def test_ECON_004_cap_key_uses_server_os_date_not_tashkent_date(self):
        from datetime import date as real_date
        from core import reward_caps
        # 02:00 in Tashkent on Nov 7 is still Nov 6 in UTC.
        tashkent_now = timezone.make_aware(timezone.datetime(2026, 11, 7, 2, 0))
        class FakeDate(real_date):
            @classmethod
            def today(cls):
                return real_date(2026, 11, 6)  # container clock (UTC)
        with mock.patch.object(reward_caps, 'date', FakeDate), mock.patch('django.utils.timezone.now', return_value=tashkent_now):
            reward_caps.claim_daily_reward(self.profile.id, 'flashcards')
            keys = [k for k in cache._cache.keys() if 'reward_cap:flashcards' in k]
        print('\n[ECON-004] localdate =', timezone.localdate(tashkent_now), '| cap key =', keys)
        self.assertTrue(any('2026-11-06' in k for k in keys))


class NegativeAndOverflowInputTests(_Base):
    def test_ECON_005_study_session_rejects_negative_and_huge_values(self):
        self.client.post('/api/learning/study/start/')
        later = timezone.now() + timedelta(minutes=30)
        with mock.patch('learning.api.timezone.now', return_value=later):
            r = self.client.post('/api/learning/study/complete/',
                                 {'duration_minutes': -999, 'goals_done': 10**12}, format='json').json()
        print('\n[ECON-005] negative/huge input ->', r['xp_earned'], r['coins_earned'])
        self.assertGreaterEqual(r['xp_earned'], 0)
        self.assertLessEqual(r['xp_earned'], 150)
