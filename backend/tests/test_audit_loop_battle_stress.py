"""Architecture-audit fixes: answer leaks and paywall bypass through the stress hall, class
battles and the daily learning loop, plus the broken loop share-post and lost cycle combo.
Each test pins one hole that used to be open."""
from django.test import TestCase
from rest_framework_simplejwt.tokens import RefreshToken

from core.models import ClassBattleRoom, SystemFeatureFlags
from learning.models import CommunityPost
from learning_loop.models import DailyLearningLoop
from tests_app.models import Attempt, TestSet
from tests.factories import make_question, make_subject, make_test_set, make_topic, make_user
from tests.loop_helpers import answer_loop_questions, stage_question_ids


def auth(client, user):
    client.defaults['HTTP_AUTHORIZATION'] = f'Bearer {RefreshToken.for_user(user).access_token}'


def make_live_mock(subject, questions):
    mock = TestSet.objects.create(title='Jonli mock', subject=subject, duration_minutes=60,
                                  is_live_mock=True, is_published=True, is_premium=False)
    mock.questions.set(questions)
    return mock


class StressHallAccessTests(TestCase):
    def setUp(self):
        self.subject = make_subject()
        self.user, self.profile = make_user('stress_student')
        auth(self.client, self.user)
        self.q = make_question(subject=self.subject)

    def _start(self, **data):
        return self.client.post('/api/tests/start-stress/', data, content_type='application/json')

    def test_live_mock_cannot_be_opened_by_id(self):
        mock = make_live_mock(self.subject, [make_question(subject=self.subject, body='mock savol')])
        self.assertEqual(self._start(test_id=mock.id).status_code, 404)

    def test_someone_elses_draft_cannot_be_opened_by_id(self):
        teacher, _ = make_user('draft_owner', role='teacher')
        draft = make_test_set(subject=self.subject, questions=[self.q])
        TestSet.objects.filter(pk=draft.pk).update(is_published=False, created_by=teacher)
        self.assertEqual(self._start(test_id=draft.id).status_code, 404)

    def test_premium_test_needs_pro(self):
        premium = make_test_set(subject=self.subject, questions=[self.q])
        TestSet.objects.filter(pk=premium.pk).update(is_premium=True)
        self.assertEqual(self._start(test_id=premium.id).status_code, 403)

    def test_first_stress_run_is_free_then_pro_is_required(self):
        test = make_test_set(subject=self.subject, questions=[self.q])
        first = self._start(test_id=test.id)
        self.assertEqual(first.status_code, 200)
        # While it is unfinished, the student is sent back to the same attempt.
        self.assertEqual(self._start().json()['attempt_id'], first.json()['attempt_id'])

        Attempt.objects.filter(pk=first.json()['attempt_id']).update(is_completed=True)
        second = self._start(test_id=test.id)
        self.assertEqual(second.status_code, 403)
        self.assertTrue(second.json()['requires_pro'])
        # The regular start endpoint's `stress` flag is not a side door.
        res = self.client.post(f'/api/tests/{test.id}/start/', {'stress': True}, content_type='application/json')
        self.assertEqual(res.status_code, 403)


class ClassBattleTests(TestCase):
    def setUp(self):
        flags = SystemFeatureFlags.load()
        flags.enable_teacher_class_battles = True
        flags.save()
        self.subject = make_subject()
        self.questions = [make_question(subject=self.subject, body=f'savol {i}') for i in range(3)]
        self.teacher, _ = make_user('battle_teacher', role='teacher')
        self.student, _ = make_user('battle_student')
        self.own_test = make_test_set(subject=self.subject, questions=self.questions)
        TestSet.objects.filter(pk=self.own_test.pk).update(created_by=self.teacher)

    def _create(self, user, **data):
        auth(self.client, user)
        payload = {'title': 'Jang', 'question_count': 3, **data}
        return self.client.post('/api/v1/system/class-battles/create/', payload, content_type='application/json')

    def test_students_cannot_open_rooms(self):
        self.assertEqual(self._create(self.student).status_code, 403)

    def test_live_mock_cannot_be_used_as_room_questions(self):
        mock = make_live_mock(self.subject, [make_question(subject=self.subject, body='mock savol')])
        self.assertEqual(self._create(self.teacher, test_id=mock.id).status_code, 404)

    def test_bad_question_count_is_a_400_not_a_500(self):
        self.assertEqual(self._create(self.teacher, question_count='abc').status_code, 400)

    def test_answers_are_hidden_until_finish_and_submit_is_one_shot(self):
        room_id = self._create(self.teacher, test_id=self.own_test.id).json()['room_id']
        room = ClassBattleRoom.objects.get(pk=room_id)

        auth(self.client, self.student)
        self.client.post(f'/api/v1/system/class-battles/{room.pin_code}/join/', {}, content_type='application/json')
        submit_url = f'/api/v1/system/class-battles/{room_id}/submit/'
        wrong = {str(q.id): q.choices.get(is_correct=False).id for q in self.questions}
        right = {str(q.id): q.choices.get(is_correct=True).id for q in self.questions}
        # Not live yet.
        self.assertEqual(self.client.post(submit_url, {'answers': wrong}, content_type='application/json').status_code, 400)

        auth(self.client, self.teacher)
        self.client.post(f'/api/v1/system/class-battles/{room_id}/start/')

        auth(self.client, self.student)
        self.assertEqual(self.client.post(submit_url, {'answers': wrong}, content_type='application/json').status_code, 200)
        analytics_url = f'/api/v1/system/class-battles/{room_id}/analytics/'
        self.assertEqual(self.client.get(analytics_url).status_code, 403)
        state = self.client.get(f'/api/v1/system/class-battles/{room_id}/state/').json()
        self.assertTrue(state['participants'][0]['submitted'])
        self.assertEqual(state['question_count'], 3)

        auth(self.client, self.teacher)
        self.assertEqual(self.client.get(analytics_url).status_code, 200)
        self.client.post(f'/api/v1/system/class-battles/{room_id}/finish/')

        auth(self.client, self.student)
        self.assertEqual(self.client.get(analytics_url).status_code, 200)
        # Seeing the answers must not let the student re-submit for full marks.
        res = self.client.post(submit_url, {'answers': right}, content_type='application/json')
        self.assertEqual(res.status_code, 400)

        outsider, _ = make_user('battle_outsider')
        auth(self.client, outsider)
        self.assertEqual(self.client.get(analytics_url).status_code, 403)


class DailyLoopTests(TestCase):
    def setUp(self):
        self.subject = make_subject()
        self.topic = make_topic(subject=self.subject, title='Temuriylar')
        self.practice = [make_question(subject=self.subject, topic=self.topic, body=f'mashq {i}')
                         for i in range(20)]
        self.secret = make_question(subject=self.subject, topic=self.topic, body='MOCK SIRI', correct='SIRLI_JAVOB')
        make_live_mock(self.subject, [self.secret])
        self.user, self.profile = make_user('loop_student')
        auth(self.client, self.user)

    def _current(self):
        return self.client.get('/api/v1/loop/current/').json()

    def _advance(self, stage, payload=None):
        return self.client.post('/api/v1/loop/advance-stage/', {'from_stage': stage, 'payload': payload or {}},
                                content_type='application/json')

    def test_live_mock_questions_never_reach_the_loop(self):
        data = self._current()['stage_data']
        bodies = [q['text'] for q in data['sprint']['questions'] + data['arena']['questions']]
        self.assertTrue(bodies)
        self.assertNotIn('MOCK SIRI', bodies)

    def test_sprint_payload_is_bounded_by_the_real_sprint(self):
        sprint_ids = [q['id'] for q in self._current()['stage_data']['sprint']['questions']]
        self._advance('STAGE_1_WARMUP')
        # Natija serverda tekshirilgan javoblardan olinadi; payload'dagi soxta qiymatlar
        # (begona savol ID'si, 999 ta to'g'ri javob) e'tiborsiz qoladi.
        answer_loop_questions(self.client, 'sprint', sprint_ids, wrong_ids={sprint_ids[0]})
        res = self._advance('STAGE_2_SPRINT', {
            'mistake_question_ids': [self.secret.id, sprint_ids[0]],
            'correct_count': 999, 'total_count': 999,
        }).json()
        # Injected id dropped, so its answer never shows up as a cleanup card.
        self.assertEqual(res['session_mistakes_ids'], [sprint_ids[0]])
        self.assertNotIn('SIRLI_JAVOB', [c['back'] for c in res['stage_data']['cleanup']['cards']])
        loop = DailyLearningLoop.objects.get(user=self.user)
        self.assertEqual(loop.sprint_total, len(sprint_ids))
        self.assertEqual(loop.sprint_score, len(sprint_ids) - 1)

    def _complete_cycle(self):
        current = self._current()
        self._advance('STAGE_1_WARMUP')
        answer_loop_questions(self.client, 'sprint', stage_question_ids(current, 'sprint'))
        self._advance('STAGE_2_SPRINT')
        answer_loop_questions(self.client, 'arena', stage_question_ids(current, 'arena'))
        return self._advance('STAGE_4_ARENA')

    def test_share_post_needs_a_finished_cycle_and_pays_once(self):
        self._current()
        share = lambda: self.client.post('/api/v1/loop/share-post/', {}, content_type='application/json')
        self.assertEqual(share().status_code, 409)

        self.assertEqual(self._complete_cycle().status_code, 200)
        xp_before = type(self.profile).objects.get(pk=self.profile.pk).xp
        self.assertEqual(share().status_code, 200)
        self.assertEqual(share().status_code, 409)
        self.assertEqual(CommunityPost.objects.filter(author=self.user, post_type='achievement').count(), 1)
        self.assertEqual(type(self.profile).objects.get(pk=self.profile.pk).xp, xp_before + 15)

    def test_second_cycle_keeps_its_combo(self):
        self._complete_cycle()
        self.assertEqual(self.client.post('/api/v1/loop/restart-cycle/').status_code, 200)
        self.assertEqual(self._advance('STAGE_1_WARMUP').json()['combo_multiplier'], 2.0)

    def test_cycle_restart_after_incomplete_sprint_answers(self):
        current = self._current()
        self._advance('STAGE_1_WARMUP')
        sprint_ids = stage_question_ids(current, 'sprint')
        answer_loop_questions(self.client, 'sprint', sprint_ids[:-1])
        res_sprint = self._advance('STAGE_2_SPRINT')
        if res_sprint.json().get('current_stage') == 'STAGE_3_CLEANUP':
            self._advance('STAGE_3_CLEANUP')
        answer_loop_questions(self.client, 'arena', stage_question_ids(current, 'arena'))
        self._advance('STAGE_4_ARENA')
        res = self.client.post('/api/v1/loop/restart-cycle/')
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json()['ok'])
        self.assertEqual(res.json()['loop']['cycle_number'], 2)


    def test_set_subject_adapts_loop_and_sprint(self):
        bio = make_subject(name='Biologiya', slug='biologiya')
        bio_topic = make_topic(subject=bio, title='Hujayra')
        for i in range(15):
            make_question(subject=bio, topic=bio_topic, body=f'bio savol {i}')

        initial = self._current()
        self.assertEqual(initial['subject']['slug'], self.subject.slug)

        res = self.client.post('/api/v1/loop/set-subject/', {'subject_slug': 'biologiya'}, content_type='application/json')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data['ok'])
        self.assertEqual(data['subject']['slug'], 'biologiya')
        self.assertEqual(data['topic']['title'], 'Hujayra')

        self.profile.refresh_from_db()
        self.assertEqual(self.profile.target_subject_id, bio.id)

        sprint_bodies = [q['text'] for q in data['stage_data']['sprint']['questions']]
        self.assertTrue(len(sprint_bodies) > 0)
        for b in sprint_bodies:
            self.assertTrue(b.startswith('bio savol'))

    def test_loop_auto_adapts_to_user_target_subject(self):
        bio = make_subject(name='Biologiya2', slug='biologiya2')
        bio_topic = make_topic(subject=bio, title='Genetika')
        for i in range(15):
            make_question(subject=bio, topic=bio_topic, body=f'genetika savol {i}')

        user2, profile2 = make_user('bio_student')
        profile2.target_subject = bio
        profile2.save(update_fields=['target_subject'])

        auth(self.client, user2)
        res = self.client.get('/api/v1/loop/current/')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data['subject']['slug'], 'biologiya2')
        self.assertEqual(data['topic']['title'], 'Genetika')
        sprint_bodies = [q['text'] for q in data['stage_data']['sprint']['questions']]
        for b in sprint_bodies:
            self.assertTrue(b.startswith('genetika savol'))
