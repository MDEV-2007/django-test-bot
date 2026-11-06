"""Reward-economy fixes from the 2026-11 audit: ECON-001 (loop paid with zero answers),
ECON-003 (full Profile.save() reverted concurrent changes), LOOP-002/003/005/006."""
from datetime import timedelta
from decimal import Decimal

from django.core.cache import cache
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import Profile
from learning_loop.models import DailyLearningLoop as L
from premium.models import Payment, SubscriptionPlan
from shop.services import purchase_item

from .factories import make_question, make_shop_item, make_subject, make_topic, make_user
from .loop_helpers import answer_loop_questions, stage_question_ids

URL = '/api/v1/loop/'


class _LoopBase(TestCase):
    def setUp(self):
        cache.clear()
        subject = make_subject()
        topic = make_topic(subject=subject, title='Somoniylar')
        for i in range(20):
            make_question(subject=subject, topic=topic, body=f'loop savol {i}')
        self.user, self.profile = make_user('econ_fix')
        self.c = APIClient()
        self.c.force_authenticate(self.user)

    def cur(self):
        return self.c.get(URL + 'current/').json()

    def adv(self, stage, payload=None):
        return self.c.post(URL + 'advance-stage/', {'from_stage': stage, 'payload': payload or {}}, format='json')

    def coins(self):
        return Profile.objects.get(pk=self.profile.pk).coins


class LoopRewardRequiresWorkTests(_LoopBase):
    def test_zero_answer_cycle_pays_nothing_and_opens_no_chest(self):
        self.cur()
        for stage in (L.STAGE_1_WARMUP, L.STAGE_2_SPRINT, L.STAGE_3_CLEANUP):
            self.assertEqual(self.adv(stage).status_code, 200)
        res = self.adv(L.STAGE_4_ARENA).json()
        self.assertEqual(res['rewards_awarded']['coins'], 0)
        self.assertEqual(res['rewards_awarded']['xp'], 0)
        self.assertEqual(self.coins(), 0)
        from core.rewards import daily_chain_completed
        self.assertFalse(daily_chain_completed(Profile.objects.get(pk=self.profile.pk)))
        self.assertEqual(res['stage_data']['rewards']['coins'], 0)
        self.assertEqual(res['stage_data']['rewards']['xp'], 0)
        self.assertEqual(res['stage_data']['rewards']['free_essay_credits'], 0)

    def test_zero_answer_cycle_cannot_share_post_or_restart_cycle(self):
        self.cur()
        for stage in (L.STAGE_1_WARMUP, L.STAGE_2_SPRINT, L.STAGE_3_CLEANUP, L.STAGE_4_ARENA):
            self.assertEqual(self.adv(stage).status_code, 200)
        xp_before = Profile.objects.get(pk=self.profile.pk).xp
        share_res = self.c.post(URL + 'share-post/', {}, format='json')
        self.assertEqual(share_res.status_code, 409)
        self.assertEqual(Profile.objects.get(pk=self.profile.pk).xp, xp_before)
        restart_res = self.c.post(URL + 'restart-cycle/', {}, format='json')
        self.assertEqual(restart_res.status_code, 409)

    def test_partly_answered_sprint_pays_nothing(self):
        cur = self.cur()
        self.adv(L.STAGE_1_WARMUP)
        sprint = stage_question_ids(cur, 'sprint')
        answer_loop_questions(self.c, 'sprint', sprint[:3])
        self.adv(L.STAGE_2_SPRINT); self.adv(L.STAGE_3_CLEANUP)
        answer_loop_questions(self.c, 'arena', stage_question_ids(cur, 'arena'))
        self.assertEqual(self.adv(L.STAGE_4_ARENA).json()['rewards_awarded']['coins'], 0)

    def test_fully_answered_cycle_still_pays(self):
        cur = self.cur()
        self.adv(L.STAGE_1_WARMUP)
        answer_loop_questions(self.c, 'sprint', stage_question_ids(cur, 'sprint'))
        self.adv(L.STAGE_2_SPRINT)
        answer_loop_questions(self.c, 'arena', stage_question_ids(cur, 'arena'))
        res = self.adv(L.STAGE_4_ARENA).json()
        self.assertGreaterEqual(res['rewards_awarded']['coins'], 200)
        from core.rewards import daily_chain_completed
        self.assertTrue(daily_chain_completed(Profile.objects.get(pk=self.profile.pk)))

    def test_from_stage_is_required(self):
        self.cur()
        res = self.c.post(URL + 'advance-stage/', {}, format='json')
        self.assertEqual(res.status_code, 400)

    def test_list_body_is_400_not_500(self):
        self.c.raise_request_exception = False
        self.cur()
        self.assertEqual(self.c.post(URL + 'advance-stage/', [1], format='json').status_code, 400)
        self.assertEqual(self.c.post(URL + 'answer/', [1], format='json').status_code, 400)

    def test_cleanup_count_comes_from_server_not_client(self):
        self.cur()
        self.adv(L.STAGE_1_WARMUP); self.adv(L.STAGE_2_SPRINT)
        self.adv(L.STAGE_3_CLEANUP, {'cleared_count': 999})
        self.assertEqual(L.objects.get(user=self.user).cleanup_cleared, 0)

    def test_duplicate_first_loops_do_not_block_restart(self):
        from django.db import IntegrityError, transaction
        cur = self.cur()
        first = L.objects.get(user=self.user)
        # DB UniqueConstraint(user, date, cycle_number) prevents creating a duplicate cycle 1 row
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                L.objects.create(
                    user=self.user, date=first.date, cycle_number=1,
                    topic=first.topic, subject=first.subject, current_stage=L.STAGE_1_WARMUP,
                )
        # Re-fetching current loop returns the existing cycle 1 row and allows completing + restarting
        cur = self.cur()
        self.assertEqual(L.objects.filter(user=self.user, date=first.date, cycle_number=1).count(), 1)
        self.adv(L.STAGE_1_WARMUP)
        answer_loop_questions(self.c, 'sprint', stage_question_ids(cur, 'sprint'))
        self.adv(L.STAGE_2_SPRINT)
        answer_loop_questions(self.c, 'arena', stage_question_ids(cur, 'arena'))
        self.adv(L.STAGE_4_ARENA)
        self.assertEqual(self.c.post(URL + 'restart-cycle/', {}, format='json').status_code, 200)

    def test_share_post_pays_once_even_if_post_deleted(self):
        from learning.models import CommunityPost
        cur = self.cur()
        self.adv(L.STAGE_1_WARMUP)
        answer_loop_questions(self.c, 'sprint', stage_question_ids(cur, 'sprint'))
        self.adv(L.STAGE_2_SPRINT)
        answer_loop_questions(self.c, 'arena', stage_question_ids(cur, 'arena'))
        self.adv(L.STAGE_4_ARENA)
        xp_before = Profile.objects.get(pk=self.profile.pk).xp
        self.assertEqual(self.c.post(URL + 'share-post/', {}, format='json').status_code, 200)
        CommunityPost.objects.filter(author=self.user).delete()
        self.assertEqual(self.c.post(URL + 'share-post/', {}, format='json').status_code, 409)
        self.assertEqual(Profile.objects.get(pk=self.profile.pk).xp, xp_before + 15)


class SmallBankComboTests(_LoopBase):
    def setUp(self):
        cache.clear()
        subject = make_subject()
        topic = make_topic(subject=subject, title='Kichik bank')
        for i in range(12):
            make_question(subject=subject, topic=topic, body=f'kichik {i}')
        self.user, self.profile = make_user('econ_small')
        self.c = APIClient()
        self.c.force_authenticate(self.user)

    def test_reused_arena_questions_pay_no_combo(self):
        from unittest import mock
        cur = self.cur()
        self.adv(L.STAGE_1_WARMUP)
        answer_loop_questions(self.c, 'sprint', stage_question_ids(cur, 'sprint'))
        self.adv(L.STAGE_2_SPRINT)
        answer_loop_questions(self.c, 'arena', stage_question_ids(cur, 'arena'))
        with mock.patch('learning_loop.views.GHOST_ACCURACY', 0.0):
            res = self.adv(L.STAGE_4_ARENA).json()
        self.assertEqual(res['rewards_awarded']['coins'], 200)


class ProfileLostUpdateTests(TestCase):
    def setUp(self):
        self.user, self.profile = make_user('lost_update')

    def test_stale_update_streak_keeps_coins_spent_elsewhere(self):
        Profile.objects.filter(pk=self.profile.pk).update(
            coins=500, last_active_date=timezone.localdate() - timedelta(days=1))
        stale = Profile.objects.get(pk=self.profile.pk)
        purchase_item(Profile.objects.get(pk=self.profile.pk), make_shop_item(price=300))
        stale.update_streak()
        self.assertEqual(Profile.objects.get(pk=self.profile.pk).coins, 200)

    def test_stale_update_streak_keeps_premium_granted_elsewhere(self):
        Profile.objects.filter(pk=self.profile.pk).update(last_active_date=timezone.localdate() - timedelta(days=1))
        stale = Profile.objects.get(pk=self.profile.pk)
        plan = SubscriptionPlan.objects.create(name='PRO', price=Decimal('49000'), duration_days=30, plan_type='lessons')
        Payment.objects.create(profile=self.profile, plan=plan, amount=plan.price, status='pending').apply_to_profile()
        stale.update_streak()
        fresh = Profile.objects.get(pk=self.profile.pk)
        self.assertTrue(fresh.is_premium)
        self.assertIsNotNone(fresh.premium_expires_at)

    def test_apply_to_profile_keeps_coins_changed_since_the_payment_was_loaded(self):
        plan = SubscriptionPlan.objects.create(name='PRO', price=Decimal('49000'), duration_days=30, plan_type='lessons')
        payment = Payment.objects.create(profile=self.profile, plan=plan, amount=plan.price, status='pending')
        payment = Payment.objects.select_related('profile').get(pk=payment.pk)  # caches profile (coins 0)
        Profile.objects.filter(pk=self.profile.pk).update(coins=777)
        payment.apply_to_profile()
        self.assertEqual(Profile.objects.get(pk=self.profile.pk).coins, 777)
