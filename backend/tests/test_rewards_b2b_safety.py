"""Stage 2 safety: daily chest is gated on the daily chain and opens once, the shared
reward helper never lets XP leak to privileged roles, and B2B leads are consent-based,
phone-validated and rewarded once per campaign."""
from django.test import TestCase
from django.utils import timezone
from rest_framework_simplejwt.tokens import RefreshToken

from b2b_ads.models import EduCenterCampaign, StudentLeadSubmission
from b2b_ads.services import normalize_uz_phone, pick_campaign
from battles.models import Battle
from core.models import DailyChestClaim
from core.rewards import award_profile_rewards_atomic, daily_chain_completed
from learning_loop.models import DailyLearningLoop
from tests.factories import make_user


def auth(client, user):
    client.defaults['HTTP_AUTHORIZATION'] = f'Bearer {RefreshToken.for_user(user).access_token}'


class DailyChestGateTests(TestCase):
    def setUp(self):
        self.user, self.profile = make_user('chest_student')
        auth(self.client, self.user)

    def _open(self):
        return self.client.post('/api/dashboard/daily-chest/open/')

    def test_chest_is_locked_until_the_daily_chain_is_done(self):
        status = self.client.get('/api/dashboard/daily-chest/').json()
        self.assertFalse(status['can_claim'])
        self.assertFalse(status['chain_completed'])

        res = self._open()
        self.assertEqual(res.status_code, 400)
        self.assertTrue(res.json()['locked'])
        self.assertEqual(DailyChestClaim.objects.filter(profile=self.profile).count(), 0)

    def test_finished_battle_today_unlocks_and_chest_opens_only_once(self):
        Battle.objects.create(player1=self.profile, status='finished', is_vs_bot=True, finished_at=timezone.now())
        self.assertTrue(daily_chain_completed(self.profile))

        first = self._open()
        self.assertEqual(first.status_code, 200)
        self.assertTrue(first.json()['success'])

        second = self._open()
        self.assertEqual(second.status_code, 400)
        self.assertTrue(second.json()['already_claimed'])
        self.assertEqual(DailyChestClaim.objects.filter(profile=self.profile).count(), 1)

    def test_completed_marathon_loop_unlocks(self):
        # Sikl haqiqatan yechilgan (mukofoti berilgan) bo'lsagina sandiq ochiladi.
        DailyLearningLoop.objects.create(user=self.user, current_stage=DailyLearningLoop.STAGE_5_COMPLETED,
                                         is_chest_claimed=True)
        self.assertTrue(daily_chain_completed(self.profile))

    def test_loop_closed_without_answers_does_not_unlock(self):
        # Audit ECON-001: javobsiz yopilgan sikl (mukofotsiz) sandiqni ochmaydi.
        DailyLearningLoop.objects.create(user=self.user, current_stage=DailyLearningLoop.STAGE_5_COMPLETED)
        self.assertFalse(daily_chain_completed(self.profile))

    def test_yesterdays_battle_does_not_count(self):
        Battle.objects.create(
            player1=self.profile, status='finished', is_vs_bot=True,
            finished_at=timezone.now() - timezone.timedelta(days=2),
        )
        self.assertFalse(daily_chain_completed(self.profile))


class AwardRewardsAtomicTests(TestCase):
    def test_student_gets_coins_and_xp(self):
        _, profile = make_user('reward_student')
        locked = award_profile_rewards_atomic(profile.pk, coins_delta=30, xp_delta=40)
        self.assertEqual(locked.coins, profile.coins + 30)
        self.assertEqual(locked.xp, profile.xp + 40)

    def test_teacher_gets_coins_but_no_xp(self):
        _, profile = make_user('reward_teacher', role='teacher')
        locked = award_profile_rewards_atomic(profile.pk, coins_delta=30, xp_delta=40)
        self.assertEqual(locked.coins, profile.coins + 30)
        self.assertEqual(locked.xp, 0)

    def test_spending_more_than_balance_is_refused(self):
        from django.core.exceptions import ValidationError
        _, profile = make_user('reward_poor')
        with self.assertRaises(ValidationError):
            award_profile_rewards_atomic(profile.pk, coins_delta=-(profile.coins + 1))


class B2BLeadTests(TestCase):
    def setUp(self):
        self.user, self.profile = make_user('b2b_student', region='Samarqand')
        self.other = EduCenterCampaign.objects.create(center_name='Toshkent Markaz', title='Kurs', target_region='Toshkent')
        self.local = EduCenterCampaign.objects.create(center_name='Samarqand Markaz', title='Kurs', target_region='Samarqand')
        auth(self.client, self.user)

    def _submit(self, **overrides):
        body = {'campaign_id': self.local.id, 'full_name': 'Ali Valiyev', 'phone_number': '+998 90 123-45-67',
                'consent': True, 'guardian_confirmed': True}
        body.update(overrides)
        return self.client.post('/api/v1/b2b/submit-lead/', body, content_type='application/json')

    def test_phone_normalization(self):
        self.assertEqual(normalize_uz_phone('+998 90 123-45-67'), '+998901234567')
        self.assertEqual(normalize_uz_phone('901234567'), '+998901234567')
        self.assertIsNone(normalize_uz_phone('+998'))
        self.assertIsNone(normalize_uz_phone('+7 900 123 45 67'))

    def test_campaign_matches_student_region(self):
        self.assertEqual(pick_campaign(self.profile), self.local)
        res = self.client.get('/api/v1/b2b/active-campaign/').json()
        self.assertEqual(res['campaign']['id'], self.local.id)
        self.assertFalse(res['already_submitted'])

    def test_invalid_phone_is_rejected_without_reward(self):
        coins_before = self.profile.coins
        res = self._submit(phone_number='+998')
        self.assertEqual(res.status_code, 400)
        self.profile.refresh_from_db()
        self.assertEqual(self.profile.coins, coins_before)
        self.assertFalse(StudentLeadSubmission.objects.exists())

    def test_confirmed_details_are_stored_and_rewarded_once(self):
        coins_before = self.profile.coins
        first = self._submit().json()
        self.assertEqual(first['coins_earned'], 50)
        lead = StudentLeadSubmission.objects.get()
        self.assertEqual(lead.full_name, 'Ali Valiyev')
        self.assertEqual(lead.phone_number, '+998901234567')

        second = self._submit(full_name='Boshqa Ism').json()
        self.assertTrue(second['already_submitted'])
        self.assertEqual(second['coins_earned'], 0)

        self.profile.refresh_from_db()
        self.assertEqual(self.profile.coins, coins_before + 50)
        self.assertEqual(StudentLeadSubmission.objects.count(), 1)
        self.assertTrue(self.client.get('/api/v1/b2b/active-campaign/').json()['already_submitted'])

    def test_inactive_campaign_is_refused(self):
        self.local.is_active = False
        self.local.save(update_fields=['is_active'])
        self.assertEqual(self._submit().status_code, 400)
