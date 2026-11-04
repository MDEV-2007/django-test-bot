"""4-kun: Feed va reklama (B2B o'quv markazlari) — real tracking, lifecycle, PII rozilik.

Loyihada alohida advertiser roli YO'Q: kampaniya va lidlarni faqat Super Admin boshqaradi
(markazga lid Telegram orqali boradi). Shuning uchun "Advertiser A -> B" o'rniga
student/teacher/anonim -> admin lid API rad etilishi tekshiriladi.
"""
from datetime import timedelta

from django.core.cache import cache
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from b2b_ads.models import EduCenterCampaign, StudentLeadSubmission
from b2b_ads.services import campaign_metrics, live_campaigns
from learning.models import CommunityPost, Reel
from panel.models import AuditLog

from .factories import make_user

TRACK = '/api/v1/b2b/track/'
LEAD = '/api/v1/b2b/submit-lead/'


def client_for(user):
    c = APIClient()
    c.force_authenticate(user)
    return c


class _Base(TestCase):
    def setUp(self):
        cache.clear()
        self.user, self.profile = make_user('kitobxon')
        self.client = client_for(self.user)
        self.campaign = EduCenterCampaign.objects.create(center_name='Markaz', title='Kurs')

    def lead(self, client=None, **extra):
        body = {'campaign_id': self.campaign.id, 'full_name': 'Ali Valiyev',
                'phone_number': '+998901234567', 'consent': True, 'guardian_confirmed': True}
        body.update(extra)
        return (client or self.client).post(LEAD, body, format='json')


class TrackingTests(_Base):
    def test_get_does_not_count_impressions(self):
        self.client.get('/api/v1/b2b/active-campaign/')
        self.client.get('/api/v1/system/ads/targeted-offer/')
        self.campaign.refresh_from_db()
        self.assertEqual(self.campaign.impressions_count, 0)

    def test_impression_and_click_counted_once_per_user_per_day(self):
        for _ in range(3):
            self.client.post(TRACK, {'campaign_id': self.campaign.id, 'event': 'impression'}, format='json')
            self.client.post(TRACK, {'campaign_id': self.campaign.id, 'event': 'click'}, format='json')
        other, _ = make_user('ikkinchi')
        client_for(other).post(TRACK, {'campaign_id': self.campaign.id, 'event': 'click'}, format='json')
        self.campaign.refresh_from_db()
        self.assertEqual(self.campaign.impressions_count, 1)
        self.assertEqual(self.campaign.clicks_count, 2)

    def test_tracking_requires_auth_and_valid_event(self):
        self.assertIn(APIClient().post(TRACK, {'campaign_id': self.campaign.id, 'event': 'click'},
                                       format='json').status_code, (401, 403))
        self.assertEqual(self.client.post(TRACK, {'campaign_id': self.campaign.id, 'event': 'lead'},
                                          format='json').status_code, 400)

    def test_cannot_track_ended_campaign(self):
        self.campaign.ends_at = timezone.now() - timedelta(minutes=1)
        self.campaign.save()
        res = self.client.post(TRACK, {'campaign_id': self.campaign.id, 'event': 'click'}, format='json')
        self.assertEqual(res.status_code, 404)

    def test_metrics_formulas(self):
        self.campaign.impressions_count, self.campaign.clicks_count = 200, 10
        m = campaign_metrics(self.campaign, leads_count=4, enrolled_count=1)
        self.assertEqual(m['ctr'], 5.0)
        self.assertEqual(m['lead_rate'], 40.0)
        self.assertEqual(m['conversion_rate'], 25.0)
        self.assertIsNone(m['cpl'])
        self.assertIsNone(m['spent'])
        empty = campaign_metrics(EduCenterCampaign(center_name='x', title='y'), 0, 0)
        self.assertIsNone(empty['ctr'])


class LifecycleTests(_Base):
    def test_paused_scheduled_ended_campaigns_are_not_shown(self):
        now = timezone.now()
        for kwargs in ({'is_active': False}, {'starts_at': now + timedelta(days=1)},
                       {'ends_at': now - timedelta(seconds=1)}):
            state = {'is_active': True, 'starts_at': None, 'ends_at': None}
            state.update(kwargs)
            EduCenterCampaign.objects.filter(pk=self.campaign.pk).update(**state)
            self.assertFalse(live_campaigns().filter(pk=self.campaign.pk).exists(), kwargs)
            self.assertIsNone(self.client.get('/api/v1/b2b/active-campaign/').json()['campaign'])
            self.assertEqual(self.lead().status_code, 400)

    def test_lead_budget_exhausted_hides_campaign_and_blocks_leads(self):
        self.campaign.max_leads = 1
        self.campaign.save()
        self.assertEqual(self.lead().status_code, 200)
        other, _ = make_user('kech_qolgan')
        self.assertEqual(self.lead(client=client_for(other)).status_code, 400)
        self.assertEqual(self.campaign.leads.count(), 1)
        self.assertEqual(self.campaign.lifecycle_status(), 'exhausted')
        self.assertIsNone(self.client.get('/api/v1/b2b/active-campaign/').json()['campaign'])


class LeadPiiTests(_Base):
    def test_lead_requires_explicit_consent(self):
        res = self.lead(consent=False)
        self.assertEqual(res.status_code, 400)
        self.assertFalse(StudentLeadSubmission.objects.exists())

    def test_lead_requires_adult_or_guardian_confirmation(self):
        res = self.lead(guardian_confirmed=False)
        self.assertEqual(res.status_code, 400)
        self.assertFalse(StudentLeadSubmission.objects.exists())

    def test_consent_time_is_recorded(self):
        self.lead()
        lead = StudentLeadSubmission.objects.get()
        self.assertIsNotNone(lead.consent_at)
        self.assertTrue(lead.guardian_confirmed)

    def test_client_cannot_inject_score_or_topics(self):
        self.lead(weakest_topics='SOXTA', predicted_dtm_score='189')
        lead = StudentLeadSubmission.objects.get()
        self.assertNotIn('SOXTA', lead.weakest_topics)
        self.assertNotEqual(lead.predicted_dtm_score, '189')

    def test_duplicate_lead_rewarded_once(self):
        self.assertEqual(self.lead().json()['coins_earned'], 50)
        self.assertEqual(self.lead().json()['coins_earned'], 0)
        self.assertEqual(StudentLeadSubmission.objects.count(), 1)

    def test_non_admin_cannot_read_leads_or_change_status(self):
        self.lead()
        lead = StudentLeadSubmission.objects.get()
        teacher, _ = make_user('ustoz', role='teacher')
        for c in (self.client, client_for(teacher), APIClient()):
            self.assertIn(c.get('/api/panel/campaigns/leads/').status_code, (401, 403))
            self.assertIn(c.post(f'/api/panel/campaigns/leads/{lead.id}/status/', {'status': 'ENROLLED'},
                                 format='json').status_code, (401, 403))
        lead.refresh_from_db()
        self.assertEqual(lead.status, 'NEW')

    def test_admin_status_change_is_audited(self):
        self.lead()
        lead = StudentLeadSubmission.objects.get()
        admin, _ = make_user('bosh_admin', role='superadmin')
        c = client_for(admin)
        self.assertEqual(c.post(f'/api/panel/campaigns/leads/{lead.id}/status/', {'status': 'XATO'},
                                format='json').status_code, 400)
        res = c.post(f'/api/panel/campaigns/leads/{lead.id}/status/', {'status': 'ENROLLED'}, format='json')
        self.assertEqual(res.status_code, 200)
        log = AuditLog.objects.get(model_name='StudentLeadSubmission', object_id=str(lead.id))
        self.assertEqual(log.changes['status'], ['NEW', 'ENROLLED'])
        listing = c.get('/api/panel/campaigns/').json()['campaigns'][0]
        self.assertEqual(listing['metrics']['enrolled'], 1)
        self.assertEqual(listing['status'], 'active')


class FeedAnswerLeakTests(_Base):
    def test_poll_answer_hidden_until_vote_and_voters_private(self):
        author, _ = make_user('muallif')
        post = CommunityPost.objects.create(
            author=author, post_type='sos_question', title='SOS', caption='?',
            poll_data={'options': ['A', 'B'], 'correct_option': 'A', 'explanation': 'chunki',
                       'votes': {'A': 1, 'B': 0}, 'voted_users': {str(author.id + 999): 'A'}},
        )
        before = post.to_dict(current_user=self.user)['poll_data']
        self.assertNotIn('correct_option', before)
        self.assertNotIn('voted_users', before)
        self.assertIsNone(before['user_choice'])
        self.client.post(f'/api/learning/feed/{post.id}/vote-poll/', {'selected_option': 'B'}, format='json')
        post.refresh_from_db()
        after = post.to_dict(current_user=self.user)['poll_data']
        self.assertEqual(after['correct_option'], 'A')
        self.assertEqual(after['user_choice'], 'B')
        self.assertNotIn('voted_users', after)

    def test_reels_feed_hides_quiz_answer(self):
        Reel.objects.create(subject_name='Tarix', subject_slug='tarix', hook='h', fact='f', takeaway='t',
                            quiz_question='?', quiz_options=['a', 'b'], quiz_correct_index=1,
                            quiz_explanation='izoh', is_published=True)
        reels = self.client.get('/api/learning/reels/').json()['reels']
        self.assertTrue(reels)
        for r in reels:
            self.assertNotIn('correct_index', r['quiz'])
            self.assertNotIn('explanation', r['quiz'])
