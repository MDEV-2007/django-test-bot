"""P1 audit fixes: endpoints that returned 500, draft tests reachable by id, and the
random-test builder."""
from django.test import TestCase
from rest_framework_simplejwt.tokens import RefreshToken

from b2b_ads.models import EduCenterCampaign
from tests.factories import make_attempt, make_question, make_subject, make_test_set, make_user
from tests_app.models import Attempt


def auth(client, user):
    client.defaults['HTTP_AUTHORIZATION'] = f'Bearer {RefreshToken.for_user(user).access_token}'


class LearningLoopTests(TestCase):
    def test_first_loop_of_the_day_picks_the_subject_of_a_recent_mistake(self):
        user, profile = make_user('loop_student')
        subject = make_subject(name='Biologiya', slug='biologiya')
        q = make_question(subject=subject)
        attempt = make_attempt(profile, make_test_set(subject=subject, questions=[q]), [q])
        attempt.answers.update(is_correct=False)
        auth(self.client, user)

        res = self.client.get('/api/v1/loop/current/')

        self.assertEqual(res.status_code, 200)
        from learning_loop.models import DailyLearningLoop
        self.assertEqual(DailyLearningLoop.objects.get(user=user).subject, subject)


class TargetedOfferTests(TestCase):
    def setUp(self):
        user, _ = make_user('offer_student')
        auth(self.client, user)

    def test_no_campaign_means_no_offer_and_no_fake_center(self):
        res = self.client.get('/api/v1/system/ads/targeted-offer/?subject=Tarix&score=42')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json(), {})
        self.assertFalse(EduCenterCampaign.objects.exists())

    def test_active_campaign_is_returned_and_its_impression_counted(self):
        campaign = EduCenterCampaign.objects.create(center_name='Markaz', title='Kurs')
        res = self.client.get('/api/v1/system/ads/targeted-offer/?subject=Tarix&score=42')
        self.assertEqual(res.json()['id'], campaign.id)
        campaign.refresh_from_db()
        self.assertEqual(campaign.impressions_count, 1)


class DraftTestAccessTests(TestCase):
    def setUp(self):
        self.author, _ = make_user('draft_author', role='teacher')
        self.student, _ = make_user('draft_student')
        subject = make_subject()
        self.draft = make_test_set(subject=subject, questions=[make_question(subject=subject)])
        self.draft.is_published = False
        self.draft.created_by = self.author
        self.draft.save(update_fields=['is_published', 'created_by'])

    def test_student_cannot_start_an_unpublished_test_by_id(self):
        auth(self.client, self.student)
        self.assertEqual(self.client.post(f'/api/tests/{self.draft.id}/start/').status_code, 404)

    def test_author_can_still_try_their_own_draft(self):
        auth(self.client, self.author)
        self.assertEqual(self.client.post(f'/api/tests/{self.draft.id}/start/').status_code, 200)


class RandomTestTests(TestCase):
    def test_random_test_uses_at_most_ten_questions_of_the_subject(self):
        user, _ = make_user('random_student')
        subject = make_subject()
        for i in range(12):
            make_question(subject=subject, body=f'Savol {i}')
        auth(self.client, user)

        res = self.client.post(f'/api/tests/start-random/?subject={subject.slug}')

        self.assertEqual(res.status_code, 200)
        attempt = Attempt.objects.get(id=res.json()['attempt_id'])
        self.assertEqual(attempt.answers.count(), 10)


class LearningLoopFlowTests(TestCase):
    def setUp(self):
        self.user, self.profile = make_user('loop_flow_student')
        subject = make_subject()
        for i in range(3):
            make_question(subject=subject, body=f'Savol {i}')
        auth(self.client, self.user)
        self.assertEqual(self.client.get('/api/v1/loop/current/').status_code, 200)

    def _advance(self, stage, payload=None):
        return self.client.post('/api/v1/loop/advance-stage/', {'from_stage': stage, 'payload': payload or {}},
                                content_type='application/json')

    def _complete_cycle(self):
        for stage in ('STAGE_1_WARMUP', 'STAGE_2_SPRINT', 'STAGE_4_ARENA'):
            self.assertEqual(self._advance(stage, {'mistake_question_ids': []}).status_code, 200, stage)

    def test_cannot_jump_straight_to_the_chest(self):
        self.assertEqual(self._advance('STAGE_4_ARENA').status_code, 409)
        self.profile.refresh_from_db()
        self.assertEqual(self.profile.coins, 0)

    def test_full_cycle_pays_once_and_restart_needs_a_finished_cycle(self):
        self.assertEqual(self.client.post('/api/v1/loop/restart-cycle/').status_code, 409)
        self._complete_cycle()
        self.profile.refresh_from_db()
        self.assertGreater(self.profile.coins, 0)
        self.assertEqual(self.client.post('/api/v1/loop/restart-cycle/').status_code, 200)

    def test_cycles_are_capped_per_day(self):
        from learning_loop.views import MAX_CYCLES_PER_DAY
        for _ in range(MAX_CYCLES_PER_DAY - 1):
            self._complete_cycle()
            self.assertEqual(self.client.post('/api/v1/loop/restart-cycle/').status_code, 200)
        self._complete_cycle()
        self.assertEqual(self.client.post('/api/v1/loop/restart-cycle/').status_code, 429)
