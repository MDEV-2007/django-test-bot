"""Signup attribution: every signup path records a first-touch source, referral codes are
grouped as `referral`, existing users are never re-attributed, and the growth panel shows
the per-source funnel."""
from django.test import TestCase
from rest_framework_simplejwt.tokens import RefreshToken

from analytics.models import SignupSource
from analytics.tracking import clean_source
from tests.factories import make_attempt, make_question, make_test_set, make_user


def auth(client, user):
    client.defaults['HTTP_AUTHORIZATION'] = f'Bearer {RefreshToken.for_user(user).access_token}'


class CleanSourceTests(TestCase):
    def test_clean_source_is_safe_and_short(self):
        self.assertEqual(clean_source('  IG_W1_A '), 'ig_w1_a')
        self.assertEqual(clean_source('<script>x</script>'), 'scriptxscript')
        self.assertEqual(len(clean_source('a' * 200)), 64)
        self.assertIsNone(clean_source('!!!'))


class WebSignupTests(TestCase):
    def _register(self, username, **extra):
        return self.client.post('/api/auth/register/', {
            'username': username, 'first_name': 'Ali', 'password': 'Kuchli-parol-2026', **extra,
        }, content_type='application/json')

    def test_web_signup_records_ad_source(self):
        self.assertEqual(self._register('src_ig', source='ig_w1_a').status_code, 200)
        self.assertEqual(SignupSource.objects.get(profile__user__username='src_ig').source, 'ig_w1_a')

    def test_web_signup_without_source_is_web(self):
        self._register('src_plain')
        self.assertEqual(SignupSource.objects.get(profile__user__username='src_plain').source, 'web')

    def test_referral_code_is_grouped_as_referral(self):
        from accounts.referrals import ensure_referral_code
        _, referrer = make_user('src_referrer')
        code = ensure_referral_code(referrer)
        self._register('src_friend', ref=code, source='ig_w1_a')
        self.assertEqual(SignupSource.objects.get(profile__user__username='src_friend').source, 'referral')


class BotSignupTests(TestCase):
    def test_bot_start_param_becomes_source_once(self):
        from telegrambot.handlers import get_or_create_profile
        tg = {'id': 777001, 'first_name': 'Vali'}
        profile = get_or_create_profile(tg, referral_code='ig_w2_b')
        self.assertEqual(profile.signup_source.source, 'ig_w2_b')
        # Existing user re-opening another ad link is not re-attributed.
        get_or_create_profile(tg, referral_code='tg_channel')
        self.assertEqual(SignupSource.objects.get(profile=profile).source, 'ig_w2_b')


class GrowthSourcesTests(TestCase):
    def test_growth_panel_shows_source_funnel(self):
        admin, _ = make_user('src_admin', role='superadmin')
        _, a = make_user('src_a')
        _, b = make_user('src_b')
        SignupSource.objects.create(profile=a, source='ig_w1_a')
        SignupSource.objects.create(profile=b, source='ig_w1_a')
        q = make_question()
        attempt = make_attempt(a, make_test_set(questions=[q]), [q])
        type(attempt).objects.filter(pk=attempt.pk).update(is_completed=True)

        auth(self.client, admin)
        rows = {r['source']: r for r in self.client.get('/api/analytics/growth/').json()['sources']}
        self.assertEqual(rows['ig_w1_a']['signups'], 2)
        self.assertEqual(rows['ig_w1_a']['activated'], 1)
        self.assertEqual(rows['ig_w1_a']['paid'], 0)
