"""Haqiqiy parallel so'rovlar (threadlar) — faqat PostgreSQL'da.

SQLite butun bazani qulflaydi va `select_for_update`ni e'tiborsiz qoldiradi, shuning uchun
u yerda race condition'ni haqiqatan tekshirib bo'lmaydi; bu testlar faqat
`DATABASE_URL=postgres://...` bilan yuritilganda bajariladi.

Har bir test bir xil so'rovni N ta thread'dan bir vaqtda yuboradi va natija (javob qatori,
balans, mukofot) faqat bir marta yozilganini tekshiradi.
"""
import threading
import unittest

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
