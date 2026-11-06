"""Haqiqiy parallel so'rovlar (threadlar) — faqat PostgreSQL'da.

SQLite butun bazani qulflaydi va `select_for_update`ni e'tiborsiz qoldiradi, shuning uchun
u yerda race condition'ni haqiqatan tekshirib bo'lmaydi; bu testlar faqat
`DATABASE_URL=postgres://...` bilan yuritilganda bajariladi.

Har bir test bir xil so'rovni N ta thread'dan bir vaqtda yuboradi va natija (javob qatori,
balans, mukofot) faqat bir marta yozilganini tekshiradi.
"""
import threading
import unittest
from unittest import mock

from django.db import connection
from django.test import TransactionTestCase
from rest_framework.test import APIClient

from .factories import make_freeze_item, make_question, make_subject, make_user

N_THREADS = 8


def run_parallel(fn, n=N_THREADS):
    """`fn`ni n ta threadda bir vaqtda ishga tushiradi; natijalar ro'yxatini qaytaradi."""
    barrier = threading.Barrier(n)
    results, errors = [None] * n, []

    def worker(i):
        try:
            barrier.wait()
            results[i] = fn()
        except Exception as exc:  # noqa: BLE001 — test xatoni yig'adi
            errors.append(exc)
        finally:
            connection.close()

    threads = [threading.Thread(target=worker, args=(i,)) for i in range(n)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    return results, errors


@unittest.skipUnless(connection.vendor == 'postgresql', "Faqat PostgreSQL'da (SQLite qatorlarni qulflamaydi)")
class ConcurrencyTests(TransactionTestCase):
    def client_for(self, user):
        c = APIClient()
        c.force_authenticate(user)
        return c

    def test_parallel_sprint_answer_written_once(self):
        from sprint.models import QuizSessionAnswer
        user, _ = make_user('par_sprint')
        subject = make_subject()
        for i in range(6):
            make_question(subject=subject, body=f'p{i}')
        data = self.client_for(user).get('/api/v1/sprint/questions/', {'count': 5}).json()
        q = data['questions'][0]
        body = {'session_id': data['session_id'], 'question_id': q['id'], 'option_id': q['options'][0]['id']}
        results, errors = run_parallel(lambda: self.client_for(user).post('/api/v1/sprint/answer/', body,
                                                                          format='json').status_code)
        self.assertEqual(errors, [])
        self.assertTrue(all(code == 200 for code in results), results)
        self.assertEqual(QuizSessionAnswer.objects.filter(session_id=data['session_id']).count(), 1)

    def test_parallel_shop_purchase_never_overdraws(self):
        from accounts.models import Profile
        from shop.models import Purchase
        _, profile = make_user('par_shop', coins=300)
        item = make_freeze_item(price=150)
        user = profile.user
        results, errors = run_parallel(lambda: self.client_for(user).post(
            f'/api/shop/buy/{item.slug}/', {}, format='json').status_code)
        profile = Profile.objects.get(pk=profile.pk)
        self.assertGreaterEqual(profile.coins, 0)
        self.assertEqual(Purchase.objects.filter(profile=profile).count(), (300 - profile.coins) // 150)
        self.assertLessEqual(Purchase.objects.filter(profile=profile).count(), 2)

    def test_parallel_lead_rewarded_once(self):
        from accounts.models import Profile
        from b2b_ads.models import EduCenterCampaign, StudentLeadSubmission
        user, profile = make_user('par_lead')
        campaign = EduCenterCampaign.objects.create(center_name='M', title='K')
        body = {'campaign_id': campaign.id, 'full_name': 'Ali Vali', 'phone_number': '+998901234567',
                'consent': True, 'guardian_confirmed': True}
        results, errors = run_parallel(lambda: self.client_for(user).post('/api/v1/b2b/submit-lead/', body,
                                                                          format='json').status_code)
        self.assertEqual(errors, [])
        self.assertEqual(StudentLeadSubmission.objects.filter(student_profile=profile).count(), 1)
        self.assertEqual(Profile.objects.get(pk=profile.pk).coins, 50)

    def test_parallel_campaign_lead_limit(self):
        from b2b_ads.models import EduCenterCampaign
        campaign = EduCenterCampaign.objects.create(center_name='M', title='K', max_leads=2)
        users = [make_user(f'par_cap{i}')[0] for i in range(N_THREADS)]
        it = iter(users)
        lock = threading.Lock()

        def submit():
            with lock:
                u = next(it)
            return self.client_for(u).post('/api/v1/b2b/submit-lead/', {
                'campaign_id': campaign.id, 'full_name': 'Ali Vali', 'phone_number': '+998901234567',
                'consent': True, 'guardian_confirmed': True}, format='json').status_code

        results, errors = run_parallel(submit)
        self.assertEqual(errors, [])
        self.assertEqual(campaign.leads.count(), 2)

    def test_parallel_ad_clicks_counted_once(self):
        """Ads Manager: bir foydalanuvchining parallel CTA bosishlari — AdEvent UniqueConstraint
        tufayli faqat bitta qator va counter faqat +1 (kesh emas, baza kafolatlaydi)."""
        from django.core.cache import cache
        from b2b_ads.models import AdEvent, EduCenterCampaign
        cache.clear()
        campaign = EduCenterCampaign.objects.create(center_name='M', title='K')
        user, _ = make_user('par_click')
        results, errors = run_parallel(lambda: self.client_for(user).post(
            '/api/v1/b2b/track/', {'campaign_id': campaign.id, 'event': 'click'}, format='json').json()['counted'])
        self.assertEqual(errors, [])
        self.assertEqual(results.count(True), 1, results)
        campaign.refresh_from_db()
        self.assertEqual(campaign.clicks_count, 1)
        self.assertEqual(AdEvent.objects.filter(campaign=campaign).count(), 1)

    def test_parallel_loop_finish_pays_once(self):
        from accounts.models import Profile
        from learning_loop.models import DailyLearningLoop
        from tests.loop_helpers import answer_loop_questions, stage_question_ids
        user, profile = make_user('par_loop')
        subject = make_subject()
        for i in range(20):
            make_question(subject=subject, body=f'l{i}')
        c = self.client_for(user)
        cur = c.get('/api/v1/loop/current/').json()
        c.post('/api/v1/loop/advance-stage/', {'from_stage': 'STAGE_1_WARMUP'}, format='json')
        answer_loop_questions(c, 'sprint', stage_question_ids(cur, 'sprint'))
        c.post('/api/v1/loop/advance-stage/', {'from_stage': 'STAGE_2_SPRINT'}, format='json')
        answer_loop_questions(c, 'arena', stage_question_ids(cur, 'arena'))
        coins_before = Profile.objects.get(pk=profile.pk).coins
        results, errors = run_parallel(lambda: self.client_for(user).post(
            '/api/v1/loop/advance-stage/', {'from_stage': 'STAGE_4_ARENA'}, format='json').status_code)
        self.assertEqual(errors, [])
        self.assertEqual(sorted(results).count(200), 1, results)
        loop = DailyLearningLoop.objects.get(user=user)
        self.assertTrue(loop.is_chest_claimed)
        gained = Profile.objects.get(pk=profile.pk).coins - coins_before
        self.assertIn(gained, (200, 400, 500))  # bir marta: 1.0x / 2.0x / 2.5x

    def test_parallel_loop_share_post_pays_once(self):
        from accounts.models import Profile
        from learning.models import CommunityPost
        from tests.loop_helpers import answer_loop_questions, stage_question_ids
        user, profile = make_user('par_loop_share')
        subject = make_subject()
        for i in range(20):
            make_question(subject=subject, body=f'ls{i}')
        c = self.client_for(user)
        cur = c.get('/api/v1/loop/current/').json()
        c.post('/api/v1/loop/advance-stage/', {'from_stage': 'STAGE_1_WARMUP'}, format='json')
        answer_loop_questions(c, 'sprint', stage_question_ids(cur, 'sprint'))
        c.post('/api/v1/loop/advance-stage/', {'from_stage': 'STAGE_2_SPRINT'}, format='json')
        answer_loop_questions(c, 'arena', stage_question_ids(cur, 'arena'))
        c.post('/api/v1/loop/advance-stage/', {'from_stage': 'STAGE_4_ARENA'}, format='json')
        xp_before = Profile.objects.get(pk=profile.pk).xp
        results, errors = run_parallel(lambda: self.client_for(user).post(
            '/api/v1/loop/share-post/', {}, format='json').status_code)
        self.assertEqual(errors, [])
        self.assertEqual(results.count(200), 1, results)
        self.assertEqual(CommunityPost.objects.filter(author=user, post_type='achievement').count(), 1)
        self.assertEqual(Profile.objects.get(pk=profile.pk).xp, xp_before + 15)

    def test_parallel_mission_reward_once(self):
        from accounts.models import Profile
        from core.missions import advance_missions
        from core.models import DailyMission, ProfileMission
        _, profile = make_user('par_mission')
        mission = DailyMission.objects.create(title='m', description='-', xp_reward=0, coin_reward=10,
                                              target_count=1, action_type='test')
        ProfileMission.objects.create(profile=profile, mission=mission)
        results, errors = run_parallel(lambda: len(advance_missions(Profile.objects.get(pk=profile.pk), 'test')))
        self.assertEqual(errors, [])
        self.assertEqual(sum(results), 1)
        self.assertEqual(Profile.objects.get(pk=profile.pk).coins, 10)

    def test_parallel_telegram_initdata_replay_accepted_once(self):
        from django.test import override_settings
        from tests.test_auth_p2 import TOKEN, init_data
        payload = init_data({'id': 888000111, 'first_name': 'Par', 'username': 'par_tg'})
        with override_settings(TELEGRAM_BOT_TOKEN=TOKEN, REQUIRE_CHANNEL_SUBSCRIPTION=False), \
             mock.patch('accounts.api.sync_telegram_avatar', return_value=None):
            def attempt():
                c = APIClient()
                c.raise_request_exception = False
                return c.post('/api/auth/telegram/', {'initData': payload}, format='json').status_code
            results, errors = run_parallel(attempt)
        self.assertEqual(errors, [])
        self.assertEqual(results.count(200), 1, results)
        self.assertEqual(results.count(401), 7, results)

    def test_post_2038_timestamp_in_reward_claim_on_postgres(self):
        from accounts.tokens import revoke_user_tokens, token_is_revoked
        from core.models import RewardClaim
        user, _ = make_user('par_2038')
        post_2038_ts = 2_500_000_000  # > 32-bit signed int max (2_147_483_647)
        with mock.patch('accounts.tokens.time.time', return_value=float(post_2038_ts)):
            revoke_user_tokens(user)
        claim = RewardClaim.objects.get(subject_id=user.pk, source='jwt_revoked_at')
        self.assertEqual(claim.count, post_2038_ts)
        self.assertTrue(token_is_revoked(user.pk, {'iat': post_2038_ts - 1}))
        self.assertFalse(token_is_revoked(user.pk, {'iat': post_2038_ts}))

    def test_parallel_payment_approval_grants_once(self):
        from decimal import Decimal
        from django.test import override_settings
        from django.utils import timezone
        from accounts.models import Profile
        from premium.models import Payment, SubscriptionPlan
        from telegrambot.handlers import process_update

        channel = '-1009990001112'
        admin_tg = '77001'
        _, _admin = make_user('par_pay_admin', role='superadmin', telegram_id=admin_tg)
        _, student = make_user('par_pay_student', telegram_id='77002')
        plan = SubscriptionPlan.objects.create(
            name='PRO 30', price=Decimal('49000'), duration_days=30, plan_type='lessons',
        )
        payment = Payment.objects.create(
            profile=student, plan=plan, amount=plan.price, status='pending',
        )
        upd = {
            'update_id': 1,
            'callback_query': {
                'id': 'cb-par-1',
                'from': {'id': int(admin_tg), 'first_name': 'Admin', 'username': 'par_admin'},
                'message': {'message_id': 10, 'chat': {'id': int(channel), 'type': 'channel'}},
                'data': f'pay_approve_{payment.id}',
            },
        }
        start_time = timezone.now()
        with override_settings(
            TELEGRAM_BOT_TOKEN='',
            PAYMENT_CHANNEL_ID=channel,
            PAYMENT_REVIEWER_TELEGRAM_IDS=[],
            REQUIRE_CHANNEL_SUBSCRIPTION=False,
        ), mock.patch('telegrambot.payment_review.answer_callback') as answer_mock:
            _, errors = run_parallel(lambda: process_update(upd))
            messages = [call.args[1] for call in answer_mock.call_args_list if len(call.args) > 1]

        self.assertEqual(errors, [])
        payment.refresh_from_db()
        student.refresh_from_db()
        self.assertEqual(payment.status, 'approved')
        self.assertTrue(student.is_premium)
        # Only 30 days should be granted (~30 days from start_time, never 60+ days)
        remaining_days = (student.premium_expires_at - start_time).total_seconds() / 86400.0
        self.assertGreater(remaining_days, 29.5)
        self.assertLess(remaining_days, 30.5)
        approved_toasts = [m for m in messages if 'tasdiqlandi' in m]
        already_toasts = [m for m in messages if 'allaqachon' in m]
        self.assertEqual(len(approved_toasts), 1, messages)
        self.assertEqual(len(already_toasts), N_THREADS - 1, messages)

    def test_parallel_loop_creation_creates_single_cycle_row(self):
        from learning_loop.models import DailyLearningLoop
        user, _ = make_user('par_loop_create')
        subject = make_subject()
        for i in range(15):
            make_question(subject=subject, body=f'plc_{i}')
        results, errors = run_parallel(
            lambda: self.client_for(user).get('/api/v1/loop/current/').status_code
        )
        self.assertEqual(errors, [])
        self.assertTrue(all(code == 200 for code in results), results)
        self.assertEqual(DailyLearningLoop.objects.filter(user=user, cycle_number=1).count(), 1)


