"""Ads Manager (ads.ilmildizi.uz): advertiser egalik, moderatsiya, lifecycle, lid maxfiyligi,
tracking dedup va analitika formulalari."""
import io
from datetime import timedelta

from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.utils import timezone
from PIL import Image
from rest_framework.test import APIClient

from b2b_ads.models import AdCreative, AdEvent, EduCenterCampaign, StudentLeadSubmission
from b2b_ads.services import live_campaigns, track_event
from core.models import EducationCenter
from panel.models import AuditLog

from .factories import make_subject, make_user

API = '/api/v1/advertiser/'


def client_for(user=None):
    c = APIClient()
    if user is not None:
        c.force_authenticate(user)
    return c


def make_center(user, status='approved', name='Markaz'):
    return EducationCenter.objects.create(name=name, owner=user, status=status, phone='+998901112233')


def make_lead(campaign, profile, consent=True, guardian=True, status='NEW', name='Ali Valiyev'):
    return StudentLeadSubmission.objects.create(
        campaign=campaign, student_profile=profile, full_name=name, phone_number='+998901234567',
        telegram_username='ali', consent_at=timezone.now() if consent else None,
        guardian_confirmed=guardian, status=status, weakest_topics='Amir Temur', predicted_dtm_score='150',
    )


class _Base(TestCase):
    def setUp(self):
        cache.clear()
        make_subject('Tarix', 'tarix')
        self.user_a, _ = make_user('adv_a')
        self.user_b, _ = make_user('adv_b')
        self.student, self.student_profile = make_user('oquvchi')
        self.admin, _ = make_user('boss', role='superadmin')
        self.center_a = make_center(self.user_a, name='A markaz')
        self.center_b = make_center(self.user_b, name='B markaz')
        self.a = client_for(self.user_a)
        self.b = client_for(self.user_b)

    def create_campaign(self, client=None, **extra):
        body = {'title': 'Tarix intensiv', 'description': 'Bepul sinov darsi', 'target_subject': 'Tarix'}
        body.update(extra)
        res = (client or self.a).post(API + 'campaigns/', body, format='json')
        self.assertEqual(res.status_code, 201, res.content)
        return res.json()['campaign']

    def approved_campaign(self, center=None, **extra):
        defaults = dict(center=center or self.center_a, center_name='A markaz', title='Kurs',
                        description='d', banner_url='/media/x.png', review_status='approved')
        defaults.update(extra)
        return EduCenterCampaign.objects.create(**defaults)


class OwnershipTests(_Base):
    def test_advertiser_cannot_see_other_advertiser_campaign(self):
        camp = self.create_campaign(self.b)
        self.assertEqual(self.a.get(f"{API}campaigns/{camp['id']}/").status_code, 404)
        self.assertEqual(self.a.patch(f"{API}campaigns/{camp['id']}/", {'title': 'hack'}, format='json').status_code, 404)
        for action in ('submit', 'pause', 'resume', 'end', 'duplicate'):
            self.assertEqual(self.a.post(f"{API}campaigns/{camp['id']}/{action}/").status_code, 404, action)
        ids = [c['id'] for c in self.a.get(API + 'campaigns/').json()['campaigns']]
        self.assertNotIn(camp['id'], ids)

    def test_advertiser_cannot_see_other_advertiser_leads(self):
        camp_b = self.approved_campaign(self.center_b)
        lead = make_lead(camp_b, self.student_profile)
        self.assertEqual(self.a.get(API + 'leads/').json()['total'], 0)
        self.assertEqual(self.a.get(f"{API}leads/{lead.id}/").status_code, 404)
        self.assertEqual(self.a.post(f"{API}leads/{lead.id}/status/", {'status': 'ENROLLED'}, format='json').status_code, 404)
        lead.refresh_from_db()
        self.assertEqual(lead.status, 'NEW')
        self.assertEqual(self.a.get(f"{API}analytics/?campaign={camp_b.id}").status_code, 404)

    def test_creative_of_other_center_cannot_be_attached(self):
        other = AdCreative.objects.create(center=self.center_b, kind='image', file='ads/creatives/x.png')
        res = self.a.post(API + 'campaigns/', {'title': 'Kurs', 'banner_creative_id': other.id}, format='json')
        self.assertEqual(res.status_code, 400)

    def test_student_and_anonymous_cannot_use_advertiser_api(self):
        student = client_for(self.student)
        for path in ('dashboard/', 'campaigns/', 'leads/', 'analytics/', 'creatives/', 'audiences/', 'billing/'):
            self.assertEqual(student.get(API + path).status_code, 403, path)
            self.assertIn(client_for().get(API + path).status_code, (401, 403), path)
        # me/ ochiq (kirgan foydalanuvchi uchun), lekin markaz yo'q.
        self.assertIsNone(student.get(API + 'me/').json()['center'])

    def test_pending_rejected_suspended_advertiser_blocked(self):
        for status in ('pending', 'rejected', 'suspended'):
            self.center_a.status = status
            self.center_a.save()
            self.assertEqual(self.a.get(API + 'campaigns/').status_code, 403, status)

    def test_superadmin_global_access(self):
        self.create_campaign(self.a)
        self.create_campaign(self.b)
        admin = client_for(self.admin)
        data = admin.get('/api/panel/campaigns/').json()
        self.assertEqual(len(data['campaigns']), 2)
        self.assertEqual(admin.get('/api/panel/advertisers/').json()['status_counts']['approved'], 2)


class ApplicationTests(_Base):
    def body(self, **extra):
        data = {'center_name': 'Yangi markaz', 'city_or_region': 'Toshkent', 'contact_name': 'Olim',
                'phone': '90 123 45 67', 'accept_terms': True, 'username': 'yangi_markaz',
                'password': 'Murakkab-parol-2026'}
        data.update(extra)
        return data

    def test_apply_creates_pending_center_without_access(self):
        res = client_for().post(API + 'apply/', self.body(), format='json')
        self.assertEqual(res.status_code, 201, res.content)
        self.assertIn('access', res.json())
        center = EducationCenter.objects.get(name='Yangi markaz')
        self.assertEqual(center.status, 'pending')
        self.assertEqual(center.phone, '+998901234567')
        self.assertEqual(center.owner.profile.role, 'student')  # rol o'zgarmaydi
        owner_client = client_for(center.owner)
        self.assertEqual(owner_client.get(API + 'campaigns/').status_code, 403)
        self.assertEqual(owner_client.get(API + 'me/').json()['center']['status'], 'pending')

    def test_apply_requires_terms_and_valid_phone(self):
        self.assertEqual(client_for().post(API + 'apply/', self.body(accept_terms=False), format='json').status_code, 400)
        self.assertEqual(client_for().post(API + 'apply/', self.body(phone='123'), format='json').status_code, 400)

    def test_one_center_per_account(self):
        res = self.a.post(API + 'apply/', self.body(), format='json')
        self.assertEqual(res.status_code, 400)

    def test_superadmin_approves_and_suspends(self):
        client_for().post(API + 'apply/', self.body(), format='json')
        center = EducationCenter.objects.get(name='Yangi markaz')
        admin = client_for(self.admin)
        self.assertEqual(admin.post(f"/api/panel/advertisers/{center.id}/review/", {'action': 'reject'}, format='json').status_code, 400)
        self.assertEqual(admin.post(f"/api/panel/advertisers/{center.id}/review/", {'action': 'approve'}, format='json').status_code, 200)
        self.assertEqual(client_for(center.owner).get(API + 'campaigns/').status_code, 200)
        # Advertiser o'zi tasdiqlay olmaydi.
        self.assertEqual(client_for(center.owner).post(f"/api/panel/advertisers/{center.id}/review/", {'action': 'approve'}, format='json').status_code, 403)
        self.assertTrue(AuditLog.objects.filter(model_name='EducationCenter', object_id=str(center.id)).exists())

    def test_suspended_advertiser_campaigns_stop_delivery(self):
        camp = self.approved_campaign()
        self.assertIn(camp, live_campaigns())
        self.center_a.status = 'suspended'
        self.center_a.save()
        self.assertNotIn(camp, live_campaigns())


class LifecycleTests(_Base):
    def test_draft_not_delivered_until_approved(self):
        camp = self.create_campaign(banner_creative_id=None)
        self.assertEqual(camp['status'], 'draft')
        obj = EduCenterCampaign.objects.get(pk=camp['id'])
        self.assertNotIn(obj, live_campaigns())
        # Banner yo'q — yuborib bo'lmaydi.
        self.assertEqual(self.a.post(f"{API}campaigns/{camp['id']}/submit/").status_code, 400)
        obj.banner_url = '/media/b.png'
        obj.save()
        res = self.a.post(f"{API}campaigns/{camp['id']}/submit/")
        self.assertEqual(res.json()['campaign']['status'], 'pending_review')
        self.assertNotIn(obj, live_campaigns())
        # Advertiser o'zini tasdiqlay olmaydi.
        self.assertEqual(self.a.post(f"/api/panel/campaigns/{camp['id']}/review/", {'action': 'approve'}, format='json').status_code, 403)
        admin = client_for(self.admin)
        self.assertEqual(admin.post(f"/api/panel/campaigns/{camp['id']}/review/", {'action': 'approve'}, format='json').status_code, 200)
        self.assertIn(obj, live_campaigns())

    def test_rejected_needs_note_and_edit_returns_to_draft(self):
        obj = self.approved_campaign(review_status='pending_review')
        admin = client_for(self.admin)
        self.assertEqual(admin.post(f"/api/panel/campaigns/{obj.id}/review/", {'action': 'reject'}, format='json').status_code, 400)
        admin.post(f"/api/panel/campaigns/{obj.id}/review/", {'action': 'reject', 'note': 'Banner sifatsiz'}, format='json')
        detail = self.a.get(f"{API}campaigns/{obj.id}/").json()['campaign']
        self.assertEqual(detail['status'], 'rejected')
        self.assertEqual(detail['review_note'], 'Banner sifatsiz')
        res = self.a.patch(f"{API}campaigns/{obj.id}/", {'title': 'Yangi sarlavha'}, format='json')
        self.assertEqual(res.json()['campaign']['status'], 'draft')

    def test_content_edit_of_approved_campaign_requires_rereview(self):
        obj = self.approved_campaign()
        res = self.a.patch(f"{API}campaigns/{obj.id}/", {'max_leads': 30}, format='json')
        self.assertEqual(res.json()['campaign']['status'], 'active')
        res = self.a.patch(f"{API}campaigns/{obj.id}/", {'title': 'Boshqa matn'}, format='json')
        self.assertEqual(res.json()['campaign']['status'], 'pending_review')
        obj.refresh_from_db()
        self.assertNotIn(obj, live_campaigns())

    def test_scheduled_paused_ended_exhausted_are_distinct(self):
        now = timezone.now()
        scheduled = self.approved_campaign(starts_at=now + timedelta(days=1))
        ended = self.approved_campaign(ends_at=now - timedelta(minutes=1))
        exhausted = self.approved_campaign(max_leads=1)
        make_lead(exhausted, self.student_profile)
        active = self.approved_campaign()
        statuses = {c['id']: c['status'] for c in self.a.get(API + 'campaigns/').json()['campaigns']}
        self.assertEqual(statuses[scheduled.id], 'scheduled')
        self.assertEqual(statuses[ended.id], 'ended')
        self.assertEqual(statuses[exhausted.id], 'exhausted')
        self.assertEqual(statuses[active.id], 'active')
        live = set(live_campaigns().values_list('id', flat=True))
        self.assertEqual(live, {active.id})

    def test_pause_resume_end(self):
        obj = self.approved_campaign()
        self.assertEqual(self.a.post(f"{API}campaigns/{obj.id}/pause/").json()['campaign']['status'], 'paused')
        self.assertNotIn(obj, live_campaigns())
        self.assertEqual(self.a.post(f"{API}campaigns/{obj.id}/resume/").json()['campaign']['status'], 'active')
        self.assertEqual(self.a.post(f"{API}campaigns/{obj.id}/end/").json()['campaign']['status'], 'ended')
        self.assertEqual(self.a.post(f"{API}campaigns/{obj.id}/resume/").status_code, 409)
        self.assertEqual(self.a.patch(f"{API}campaigns/{obj.id}/", {'title': 'x y z'}, format='json').status_code, 409)
        self.assertNotIn(obj, live_campaigns())
        copy = self.a.post(f"{API}campaigns/{obj.id}/duplicate/").json()['campaign']
        self.assertEqual(copy['status'], 'draft')

    def test_invalid_fields_rejected(self):
        self.assertEqual(self.a.post(API + 'campaigns/', {'title': 'Kurs', 'target_subject': "Yo'q fan"}, format='json').status_code, 400)
        self.assertEqual(self.a.post(API + 'campaigns/', {'title': 'Kurs', 'max_score_threshold': 150}, format='json').status_code, 400)
        self.assertEqual(self.a.post(API + 'campaigns/', {'title': 'Kurs', 'max_leads': 0}, format='json').status_code, 400)
        self.assertEqual(self.a.post(API + 'campaigns/', {
            'title': 'Kurs', 'starts_at': '2026-12-10T10:00:00', 'ends_at': '2026-12-01T10:00:00'}, format='json').status_code, 400)

    def test_legacy_superadmin_campaign_still_delivered(self):
        legacy = EduCenterCampaign.objects.create(center_name='Eski', title='Kurs')
        self.assertEqual(legacy.review_status, 'approved')
        self.assertIn(legacy, live_campaigns())


class LeadPrivacyTests(_Base):
    def test_pii_hidden_without_consent_or_guardian(self):
        camp = self.approved_campaign()
        ok = make_lead(camp, self.student_profile)
        other, other_profile = make_user('ikkinchi')
        no_guardian = make_lead(camp, other_profile, guardian=False, name='Vali Aliyev')
        rows = {r['id']: r for r in self.a.get(API + 'leads/').json()['leads']}
        self.assertEqual(rows[ok.id]['phone_number'], '+998901234567')
        self.assertTrue(rows[ok.id]['pii_visible'])
        self.assertNotIn('1234567', rows[no_guardian.id]['phone_number'])
        self.assertEqual(rows[no_guardian.id]['full_name'], 'V*** A***')
        self.assertEqual(rows[no_guardian.id]['telegram_username'], '')
        detail = self.a.get(f"{API}leads/{no_guardian.id}/").json()['lead']
        self.assertEqual(detail['weakest_topics'], '')
        # Ichki identifikatorlar hech qachon qaytmaydi.
        self.assertNotIn('student_profile', detail)
        self.assertNotIn('username', detail)
        # Qidiruv maskalangan telefonni oshkor qilmaydi.
        self.assertEqual(self.a.get(API + 'leads/?q=1234567').json()['total'], 1)

    def test_export_only_consented_and_audited(self):
        camp = self.approved_campaign()
        make_lead(camp, self.student_profile)
        other, other_profile = make_user('ikkinchi')
        make_lead(camp, other_profile, consent=False, name='Yashirin Odam')
        self.assertEqual(self.a.get(API + 'leads/export/').status_code, 400)
        res = self.a.get(API + 'leads/export/?confirm=1')
        body = res.content.decode('utf-8')
        self.assertIn('Ali Valiyev', body)
        self.assertNotIn('Yashirin', body)
        self.assertTrue(AuditLog.objects.filter(object_repr__startswith='Lidlar CSV').exists())

    def test_status_update_and_invalid_status(self):
        camp = self.approved_campaign()
        lead = make_lead(camp, self.student_profile)
        self.assertEqual(self.a.post(f"{API}leads/{lead.id}/status/", {'status': 'PAID'}, format='json').status_code, 400)
        res = self.a.post(f"{API}leads/{lead.id}/status/", {'status': 'contacted', 'note': "Qo'ng'iroq qilindi"}, format='json')
        self.assertEqual(res.json()['lead']['status'], 'CONTACTED')
        self.assertTrue(AuditLog.objects.filter(model_name='StudentLeadSubmission', object_id=str(lead.id)).exists())

    def test_duplicate_lead_prevented(self):
        camp = self.approved_campaign()
        student = client_for(self.student)
        body = {'campaign_id': camp.id, 'full_name': 'Ali Valiyev', 'phone_number': '+998901234567',
                'consent': True, 'guardian_confirmed': True}
        first = student.post('/api/v1/b2b/submit-lead/', body, format='json').json()
        second = student.post('/api/v1/b2b/submit-lead/', body, format='json').json()
        self.assertFalse(first['already_submitted'])
        self.assertTrue(second['already_submitted'])
        self.assertEqual(StudentLeadSubmission.objects.filter(campaign=camp).count(), 1)


class TrackingAnalyticsTests(_Base):
    def test_event_dedup_in_database_survives_cache_clear(self):
        camp = self.approved_campaign()
        self.assertTrue(track_event(camp, 'click', self.student.id))
        cache.clear()  # kesh yo'qolsa ham qayta sanalmaydi
        self.assertFalse(track_event(camp, 'click', self.student.id))
        camp.refresh_from_db()
        self.assertEqual(camp.clicks_count, 1)
        self.assertEqual(AdEvent.objects.filter(campaign=camp, event='click').count(), 1)

    def test_tracking_rejected_for_non_live_campaign(self):
        draft = self.approved_campaign(review_status='draft')
        res = client_for(self.student).post('/api/v1/b2b/track/', {'campaign_id': draft.id, 'event': 'impression'}, format='json')
        self.assertEqual(res.status_code, 404)

    def test_metrics_formulas_and_reach(self):
        camp = self.approved_campaign()
        users = [make_user(f'u{i}')[0] for i in range(4)]
        today = timezone.localdate()
        for u in users:
            AdEvent.objects.create(campaign=camp, user=u, event='impression', day=today)
        AdEvent.objects.create(campaign=camp, user=users[0], event='impression', day=today - timedelta(days=1))
        AdEvent.objects.create(campaign=camp, user=users[0], event='click', day=today)
        make_lead(camp, self.student_profile, status='ENROLLED')
        make_lead(camp, users[1].profile)
        data = self.a.get(API + 'analytics/').json()
        totals = data['totals']
        self.assertEqual(totals['impressions'], 5)
        self.assertEqual(totals['reach'], 4)
        self.assertEqual(totals['clicks'], 1)
        self.assertEqual(totals['ctr'], 20.0)
        self.assertEqual(totals['leads'], 2)
        self.assertEqual(totals['conversion_rate'], 50.0)
        self.assertIsNone(totals['spend'])
        self.assertIsNone(totals['cpl'])
        self.assertEqual(sum(d['impressions'] for d in data['series']), 5)

    def test_empty_metrics_are_null_not_zero_division(self):
        self.approved_campaign()
        totals = self.a.get(API + 'dashboard/').json()['totals']
        self.assertIsNone(totals['ctr'])
        self.assertIsNone(totals['conversion_rate'])

    def test_billing_reports_unavailable(self):
        self.assertFalse(self.a.get(API + 'billing/').json()['available'])


@override_settings(MEDIA_ROOT='test_media_ads')
class CreativeUploadTests(_Base):
    def tearDown(self):
        import shutil
        shutil.rmtree('test_media_ads', ignore_errors=True)

    def png(self, size=(800, 400)):
        buf = io.BytesIO()
        Image.new('RGB', size, 'green').save(buf, 'PNG')
        return SimpleUploadedFile('banner.png', buf.getvalue(), content_type='image/png')

    def test_valid_image_upload_and_attach(self):
        res = self.a.post(API + 'creatives/', {'file': self.png(), 'kind': 'image'}, format='multipart')
        self.assertEqual(res.status_code, 201, res.content)
        creative = res.json()['creative']
        self.assertEqual(creative['width'], 800)
        self.assertNotIn('banner.png', creative['url'])  # fayl nomi klientdan olinmaydi
        camp = self.create_campaign(banner_creative_id=creative['id'])
        self.assertEqual(camp['banner_url'], creative['url'])
        self.assertEqual(self.a.delete(f"{API}creatives/{creative['id']}/").status_code, 409)

    def test_invalid_uploads_rejected(self):
        fake = SimpleUploadedFile('x.png', b'not an image', content_type='image/png')
        self.assertEqual(self.a.post(API + 'creatives/', {'file': fake, 'kind': 'image'}, format='multipart').status_code, 400)
        tiny = self.png(size=(50, 50))
        self.assertEqual(self.a.post(API + 'creatives/', {'file': tiny, 'kind': 'image'}, format='multipart').status_code, 400)
        exe = SimpleUploadedFile('v.mp4', b'MZ' + b'\0' * 100, content_type='video/mp4')
        self.assertEqual(self.a.post(API + 'creatives/', {'file': exe, 'kind': 'video'}, format='multipart').status_code, 400)
        self.assertEqual(self.a.post(API + 'creatives/', {'kind': 'image'}, format='multipart').status_code, 400)

    def test_other_center_cannot_delete_creative(self):
        res = self.a.post(API + 'creatives/', {'file': self.png(), 'kind': 'image'}, format='multipart')
        cid = res.json()['creative']['id']
        self.assertEqual(self.b.delete(f"{API}creatives/{cid}/").status_code, 404)
        self.assertTrue(AdCreative.objects.filter(pk=cid).exists())


class AudienceTests(_Base):
    def test_small_segments_not_disclosed(self):
        for i in range(3):
            make_user(f's{i}', region='Xiva', last_seen_at=timezone.now())
        data = self.a.get(API + 'audiences/').json()
        self.assertEqual([r for r in data['regions'] if r['value'] == 'Xiva'], [])
        self.assertIn({'value': 'Tarix'}, data['subjects'])
