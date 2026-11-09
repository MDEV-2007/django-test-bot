from django.test import TestCase
from django.utils import timezone
from datetime import timedelta
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import Profile, ensure_profile_for_user
from core.models import BuddyStreak, DailyChestClaim
from core.services import (
    create_or_get_buddy_invite,
    join_buddy_streak,
    get_buddy_streak_state,
    record_buddy_daily_activity,
    nudge_buddy_partner,
    send_parent_honor_certificate,
)
from leaderboard.services import (
    get_weekly_micro_league,
    get_otm_mandat_simulator,
    get_clans_ranking,
    resolve_league_tier,
)
from tests.factories import make_question, make_subject, make_test_set, make_user
from tests_app.models import Attempt, AttemptAnswer


class GamificationMasterTests(TestCase):
    def setUp(self):
        self.u1, self.p1 = make_user('gamer_ali')
        self.u2, self.p2 = make_user('gamer_vali')
        self.subject = make_subject(name='Matematika', slug='matematika')
        self.q1 = make_question(subject=self.subject, body='1+1?', correct='2', wrong='3')
        self.q2 = make_question(subject=self.subject, body='2+2?', correct='4', wrong='5')
        self.test_set = make_test_set(subject=self.subject, questions=[self.q1, self.q2])

        self.t1 = str(RefreshToken.for_user(self.u1).access_token)
        self.t2 = str(RefreshToken.for_user(self.u2).access_token)

    def test_buddy_streak_lifecycle(self):
        # 1. Ali creates buddy invite
        invite = create_or_get_buddy_invite(self.p1)
        self.assertIsNotNone(invite['invite_code'])
        code = invite['invite_code']

        # 2. Vali joins via invite code
        ok, msg, state = join_buddy_streak(self.p2, code)
        self.assertTrue(ok)
        self.p1.refresh_from_db()
        self.p2.refresh_from_db()
        # +30 coins awarded to both
        self.assertGreaterEqual(self.p1.coins, 30)
        self.assertGreaterEqual(self.p2.coins, 30)

        # 3. Both active today -> streak increases and +25 coins
        c1_before = self.p1.coins
        record_buddy_daily_activity(self.p1)
        record_buddy_daily_activity(self.p2)
        self.p1.refresh_from_db()
        self.p2.refresh_from_db()
        bs = BuddyStreak.objects.filter(user1=self.p1, user2=self.p2).first()
        self.assertIsNotNone(bs)
        self.assertGreaterEqual(bs.current_streak, 1)

        # 4. Nudge test
        nudge_ok, nudge_msg = nudge_buddy_partner(self.p1)
        self.assertTrue(nudge_ok)

    def test_weekly_micro_leagues(self):
        self.p1.xp = 6000
        self.p1.save()
        tier = resolve_league_tier(self.p1.xp)
        self.assertEqual(tier['tier'], 'kontrakt')

        self.p2.xp = 12000
        self.p2.save()
        tier2 = resolve_league_tier(self.p2.xp)
        self.assertEqual(tier2['tier'], 'grant')
        self.assertTrue(tier2['has_gold_border'])

        league_data = get_weekly_micro_league(self.p1)
        self.assertEqual(league_data['current_league']['tier'], 'kontrakt')
        self.assertGreaterEqual(len(league_data['rows']), 1)
        self.assertGreater(league_data['seconds_until_reset'], 0)

    def test_otm_mandat_simulator(self):
        self.p1.target_university = 'TATU'
        self.p1.estimated_dtm_score = 145.2
        self.p1.save()

        sim = get_otm_mandat_simulator(self.p1, 'TATU')
        self.assertEqual(sim['selected_otm']['code'], 'TATU')
        self.assertEqual(sim['my_dtm_score'], 145.2)
        self.assertGreater(sim['points_to_grant'], 0)
        self.assertIn('TATU', [o['code'] for o in sim['available_otms']])

    def test_clans_ranking(self):
        self.p1.region = 'Samarqand'
        self.p1.school = '42-IDUM'
        self.p1.save()

        clans = get_clans_ranking(self.p1)
        self.assertIn('derby', clans)
        self.assertGreaterEqual(len(clans['regions']), 1)

    def test_1v1_battle_with_stake_and_rematch(self):
        self.client.defaults['HTTP_AUTHORIZATION'] = f'Bearer {self.t1}'
        self.p1.coins = 200
        self.p1.save()

        # Start with 50 stake
        res = self.client.post(f'/api/battles/start-quiz/?subject={self.subject.slug}', {'stake_coins': 50}, content_type='application/json')
        self.assertEqual(res.status_code, 200)
        b_data = res.json()
        self.assertEqual(b_data['stake_coins'], 50)
        self.assertEqual(b_data['pot_coins'], 100)
        self.p1.refresh_from_db()
        self.assertEqual(self.p1.coins, 150)  # 50 deducted for stake

        battle_id = b_data['battle_id']
        questions = b_data['questions']

        # Answer all rounds correctly
        for q in questions:
            choice_id = q['choices'][0]['id']
            ans_res = self.client.post('/api/battles/submit-round/', {
                'battle_id': battle_id,
                'round_number': q['round_number'],
                'choice_id': choice_id,
            }, content_type='application/json')
            self.assertEqual(ans_res.status_code, 200)

        # Finish battle
        fin = self.client.post('/api/battles/finish/', {'battle_id': battle_id}, content_type='application/json')
        self.assertEqual(fin.status_code, 200)
        fin_data = fin.json()
        self.assertTrue(fin_data['can_rematch'])
        self.assertIn('rematch_cta', fin_data)

    def test_anti_cheat_accuracy_and_time_filter(self):
        self.client.defaults['HTTP_AUTHORIZATION'] = f'Bearer {self.t1}'
        start = self.client.post(f'/api/tests/{self.test_set.id}/start/')
        attempt_id = start.json()['attempt_id']

        # Answer q1 with time_spent_sec = 1 (< 3s -> tavakkal rushed!)
        correct_1 = self.q1.choices.get(is_correct=True)
        self.client.post(f'/api/tests/attempts/{attempt_id}/answer/', {
            'question_id': self.q1.id, 'q_idx': 1, 'choice_id': correct_1.id, 'time_spent_sec': 1,
        }, content_type='application/json')

        finish = self.client.post(f'/api/tests/attempts/{attempt_id}/finish/').json()
        self.assertFalse(finish['meets_accuracy'])
        self.assertEqual(finish['rushed_answers_count'], 1)
        self.assertEqual(finish['xp_awarded'], 0)

    def test_daily_chest_trial_pro_and_rewards(self):
        from core.rewards import open_daily_chest
        # Mark daily chain as done
        from learning_loop.models import DailyLearningLoop
        DailyLearningLoop.objects.create(
            user=self.u1,
            current_stage=DailyLearningLoop.STAGE_5_COMPLETED,
            is_chest_claimed=True,
            date=timezone.localdate(),
        )

        res = open_daily_chest(self.p1.id)
        self.assertTrue(res['success'])
        self.assertIn(res['claim']['reward_type'], ('coins', 'xp', 'streak_freeze', 'cheat_sheet_pdf', 'vip_24h', 'legendary_bundle'))

    def test_otm_simulator_and_clans_data_alignment(self):
        from leaderboard.services import get_otm_mandat_simulator, get_clans_ranking

        # 1. Authenticated profile
        otm_data = get_otm_mandat_simulator(self.p1, 'TATU')
        self.assertIn('catalog', otm_data)
        self.assertIn('selected_university', otm_data)
        self.assertIn('my_dtm', otm_data)
        self.assertIn('max_dtm', otm_data)
        self.assertIn('simulated_rank', otm_data)
        self.assertIn('admission_probability_pct', otm_data)
        self.assertIn('status', otm_data)
        self.assertIn('name', otm_data['selected_university'])
        self.assertIn('faculty', otm_data['selected_university'])

        clans_data = get_clans_ranking(self.p1)
        self.assertIn('derby', clans_data)
        self.assertIn('region1', clans_data['derby'])
        self.assertIn('region2', clans_data['derby'])
        self.assertIn('name', clans_data['derby']['region1'])
        self.assertIn('total_xp', clans_data['derby']['region1'])
        self.assertIn('students', clans_data['derby']['region1'])
        self.assertIn('description', clans_data['derby'])
        self.assertIn('regions', clans_data)
        self.assertIn('schools', clans_data)

        # 2. Anonymous / None profile (guest visitor)
        otm_anon = get_otm_mandat_simulator(None, 'TDYU')
        self.assertIn('catalog', otm_anon)
        self.assertEqual(otm_anon['selected_university']['code'], 'TDYU')

        clans_anon = get_clans_ranking(None)
        self.assertIn('region1', clans_anon['derby'])
        self.assertIn('regions', clans_anon)

        # 3. API endpoint works anonymously
        self.client.logout()
        res = self.client.get('/api/leaderboard/')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn('otm_simulator', data)
        self.assertIn('catalog', data['otm_simulator'])
        self.assertIn('clans', data)
        self.assertIn('region1', data['clans']['derby'])
