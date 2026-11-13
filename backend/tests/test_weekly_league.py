from datetime import timedelta

from django.test import TestCase

from accounts.models import Profile
from core.models import Notification
from leaderboard.services import (
    get_otm_mandat_simulator, get_weekly_micro_league, rollover_micro_leagues,
)
from tests.factories import make_user


def _students(n, tier=1):
    out = []
    for i in range(n):
        _, p = make_user(f'league_{tier}_{i}')
        Profile.objects.filter(pk=p.pk).update(league_tier=tier)
        p.refresh_from_db()
        out.append(p)
    return out


class WeeklyXpTests(TestCase):
    def test_xp_counts_only_for_the_current_week(self):
        _, p = make_user('wk')
        p.add_xp(120)
        p.refresh_from_db()
        self.assertEqual(p.current_weekly_xp, 120)
        # O'tgan hafta yozuvi joriy haftada 0 hisoblanadi va keyingi XP noldan boshlanadi
        Profile.objects.filter(pk=p.pk).update(weekly_xp_week=Profile.current_week_start() - timedelta(days=7))
        p.refresh_from_db()
        self.assertEqual(p.current_weekly_xp, 0)
        p.add_xp(30)
        p.refresh_from_db()
        self.assertEqual(p.current_weekly_xp, 30)
        self.assertEqual(p.xp, 150)


class MicroLeagueTests(TestCase):
    def test_league_ranks_by_weekly_xp_not_lifetime_xp(self):
        veteran, newcomer = _students(2)
        Profile.objects.filter(pk=veteran.pk).update(xp=900)  # eski XP — bu hafta faol emas
        newcomer.add_xp(50)
        data = get_weekly_micro_league(newcomer)
        self.assertEqual(data['rows'][0]['profile_id'], newcomer.id)
        self.assertEqual(data['rows'][0]['xp'], 50)
        self.assertEqual(data['my_cohort_rank'], 1)

    def test_rollover_promotes_top5_demotes_bottom5_and_resets(self):
        players = _students(12, tier=2)
        for i, p in enumerate(players):
            p.add_xp(1000 - i * 50) if i < 10 else None  # oxirgi 2 tasi bu hafta XP'siz
            get_weekly_micro_league(p)  # divizionga joylash

        res = rollover_micro_leagues()

        self.assertEqual(res, {'promoted': 5, 'demoted': 5})
        tiers = dict(Profile.objects.filter(pk__in=[p.pk for p in players]).values_list('id', 'league_tier'))
        self.assertTrue(all(tiers[p.id] == 3 for p in players[:5]))
        self.assertTrue(all(tiers[p.id] == 2 for p in players[5:7]))
        self.assertTrue(all(tiers[p.id] == 1 for p in players[7:]))
        self.assertFalse(Profile.objects.filter(pk__in=[p.pk for p in players], weekly_xp__gt=0).exists())
        self.assertTrue(Notification.objects.filter(profile=players[0], type='achievement').exists())

    def test_small_division_has_no_demotion(self):
        players = _students(4, tier=2)
        for p in players:
            get_weekly_micro_league(p)
        self.assertEqual(rollover_micro_leagues()['demoted'], 0)

    def test_league_info_uses_stored_tier(self):
        _, p = make_user('tiered')
        Profile.objects.filter(pk=p.pk).update(league_tier=4, xp=0)
        p.refresh_from_db()
        self.assertEqual(p.league_info['level'], 4)


class StabilityAndDtmTests(TestCase):
    def test_otm_simulator_without_estimate_is_not_ready(self):
        _, p = make_user('no_dtm')
        data = get_otm_mandat_simulator(p, 'TATU')
        self.assertFalse(data['ready'])
        self.assertIsNone(data['my_dtm'])
        self.assertNotIn('admission_probability_pct', data)

    def test_otm_simulator_uses_real_estimate_and_platform_rank(self):
        _, me = make_user('me_dtm', target_university='TATU')
        _, rival = make_user('rival_dtm', target_university='TATU')
        Profile.objects.filter(pk=me.pk).update(estimated_dtm_score=130.0)
        Profile.objects.filter(pk=rival.pk).update(estimated_dtm_score=160.0)
        me.refresh_from_db()
        data = get_otm_mandat_simulator(me, 'TATU')
        self.assertTrue(data['ready'])
        self.assertEqual(data['status'], 'contract')
        self.assertEqual(data['platform_rank'], 2)
        self.assertEqual(data['platform_total'], 2)

    def test_new_profile_has_no_fake_dtm(self):
        _, p = make_user('fresh')
        self.assertIsNone(p.estimated_dtm_score)
