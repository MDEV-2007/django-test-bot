"""Phase 4 audit: Learning Loop state machine scenarios. SQLite test DB only (run_phase3.py runner).
Tests assert the CURRENT behaviour; the print lines are the evidence quoted in audit/04-learning-loop.md."""
from datetime import timedelta

from django.core.cache import cache
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import Profile
from learning_loop.models import DailyLearningLoop as L
from sprint.models import QuizSession
from tests.factories import make_question, make_subject, make_topic, make_user
from tests.loop_helpers import answer_loop_questions, stage_question_ids
from tests_app.models import AnswerOption

URL = '/api/v1/loop/'


class _LoopBase(TestCase):
    N_QUESTIONS = 20

    def setUp(self):
        cache.clear()
        subject = make_subject()
        topic = make_topic(subject=subject, title='Somoniylar')
        for i in range(self.N_QUESTIONS):
            make_question(subject=subject, topic=topic, body=f'loop savol {i}')
        self.user, self.profile = make_user('loop_audit')
        self.c = APIClient()
        self.c.force_authenticate(self.user)

    def cur(self, client=None):
        return (client or self.c).get(URL + 'current/').json()

    def adv(self, stage, payload=None, client=None):
        return (client or self.c).post(URL + 'advance-stage/', {'from_stage': stage, 'payload': payload or {}}, format='json')

    def loop(self):
        return L.objects.filter(user=self.user).order_by('-cycle_number', '-id').first()

    def coins(self):
        return Profile.objects.get(pk=self.profile.pk).coins


class StateMachineTests(_LoopBase):
    def test_01_normal_flow_all_correct(self):
        cur = self.cur()
        self.assertEqual(self.adv(L.STAGE_1_WARMUP).status_code, 200)
        answer_loop_questions(self.c, 'sprint', stage_question_ids(self.cur(), 'sprint'))
        r = self.adv(L.STAGE_2_SPRINT).json()
        self.assertEqual(r['current_stage'], L.STAGE_4_ARENA)  # 0 mistakes skips stage 3
        answer_loop_questions(self.c, 'arena', stage_question_ids(self.cur(), 'arena'))
        r = self.adv(L.STAGE_4_ARENA).json()
        print('\n[LOOP-01] perfect run reward:', {k: r['rewards_awarded'][k] for k in ('coins', 'xp', 'arena_won')})
        self.assertTrue(r['rewards_awarded']['arena_won'])

    def test_02_refresh_keeps_stage_and_questions(self):
        a = self.cur()
        self.adv(L.STAGE_1_WARMUP)
        ids1 = stage_question_ids(self.cur(), 'sprint')
        answer_loop_questions(self.c, 'sprint', ids1[:4])
        b, c2 = self.cur(), self.cur()
        print('\n[LOOP-02] refresh: stage', b['loop']['current_stage'], '| same sprint ids:',
              ids1 == stage_question_ids(b, 'sprint') == stage_question_ids(c2, 'sprint'))
        self.assertEqual(b['loop']['current_stage'], L.STAGE_2_SPRINT)
        self.assertEqual(ids1, stage_question_ids(c2, 'sprint'))

    def test_05_duplicate_answer_keeps_first_result(self):
        self.cur(); self.adv(L.STAGE_1_WARMUP)
        qid = stage_question_ids(self.cur(), 'sprint')[0]
        wrong = AnswerOption.objects.filter(question_id=qid, is_correct=False).first()
        right = AnswerOption.objects.filter(question_id=qid, is_correct=True).first()
        r1 = self.c.post(URL + 'answer/', {'stage': 'sprint', 'question_id': qid, 'option_id': wrong.id}, format='json').json()
        r2 = self.c.post(URL + 'answer/', {'stage': 'sprint', 'question_id': qid, 'option_id': right.id}, format='json').json()
        print('\n[LOOP-05] first wrong:', r1['is_correct'], '| resubmit right ->', r2['is_correct'], 'duplicate', r2['duplicate'],
              '| correct_option_id revealed after 1st answer:', r1['correct_option_id'] == right.id)
        self.assertFalse(r2['is_correct'])
        self.assertTrue(r2['duplicate'])

    def test_06_double_advance_same_stage(self):
        self.cur()
        r1, r2 = self.adv(L.STAGE_1_WARMUP), self.adv(L.STAGE_1_WARMUP)
        print('\n[LOOP-06] same from_stage twice ->', r1.status_code, r2.status_code, r2.json().get('current_stage'))
        self.assertEqual(r2.status_code, 409)

    def test_07_skip_stage(self):
        self.cur()
        r = self.adv(L.STAGE_4_ARENA)
        a = self.c.post(URL + 'answer/', {'stage': 'arena', 'question_id': 1, 'option_id': 1}, format='json')
        print('\n[LOOP-07] advance from STAGE_4 while at STAGE_1 ->', r.status_code, '| arena answer at STAGE_1 ->', a.status_code)
        self.assertEqual(r.status_code, 409)
        self.assertEqual(a.status_code, 409)

    def test_08_no_from_stage_advances_current(self):
        self.cur()
        r = self.c.post(URL + 'advance-stage/', {}, format='json')
        print('\n[LOOP-08] advance without from_stage ->', r.status_code, r.json().get('current_stage'))
        self.assertEqual(r.json()['current_stage'], L.STAGE_2_SPRINT)

    def test_11_malformed_payloads(self):
        self.c.raise_request_exception = False
        self.cur(); self.adv(L.STAGE_1_WARMUP)
        codes = {}
        for name, body in {
            'bad_stage': {'stage': 'boss', 'question_id': 1, 'option_id': 1},
            'str_ids': {'stage': 'sprint', 'question_id': 'abc', 'option_id': 'x'},
            'null_ids': {'stage': 'sprint', 'question_id': None, 'option_id': None},
            'neg_ids': {'stage': 'sprint', 'question_id': -1, 'option_id': -5},
            'huge_ids': {'stage': 'sprint', 'question_id': 10 ** 30, 'option_id': 10 ** 30},
            'list_body': ['x'],
        }.items():
            codes[name] = self.c.post(URL + 'answer/', body, format='json').status_code
        codes['adv_payload_list'] = self.c.post(URL + 'advance-stage/', {'from_stage': L.STAGE_2_SPRINT, 'payload': [1, 2]}, format='json').status_code
        codes['adv_list_body'] = self.c.post(URL + 'advance-stage/', [1], format='json').status_code
        codes['restart_list_body'] = self.c.post(URL + 'restart-cycle/', [1], format='json').status_code
        codes['adv_from_stage_int'] = self.c.post(URL + 'advance-stage/', {'from_stage': 5}, format='json').status_code
        print('\n[LOOP-11] malformed ->', codes)
        self.assertNotIn(500, codes.values())

    def test_12_client_cannot_fake_arena_result(self):
        self.cur(); self.adv(L.STAGE_1_WARMUP); self.adv(L.STAGE_2_SPRINT); self.adv(L.STAGE_3_CLEANUP)
        r = self.adv(L.STAGE_4_ARENA, {'arena_won': True, 'correct_count': 99, 'player_correct': 99, 'cleared_count': 999}).json()
        print('\n[LOOP-12] fake payload -> arena_won', r['rewards_awarded']['arena_won'], 'coins', r['rewards_awarded']['coins'],
              '| cleanup_cleared', self.loop().cleanup_cleared, 'of', len(self.loop().session_mistakes_ids))
        self.assertFalse(r['rewards_awarded']['arena_won'])

    def test_13_loss_rule_and_zero_answer_rule(self):
        self.cur(); self.adv(L.STAGE_1_WARMUP)
        answer_loop_questions(self.c, 'sprint', stage_question_ids(self.cur(), 'sprint'))
        self.adv(L.STAGE_2_SPRINT)
        ids = stage_question_ids(self.cur(), 'arena')
        answer_loop_questions(self.c, 'arena', ids, wrong_ids=set(ids))  # every arena answer wrong -> loss
        r = self.adv(L.STAGE_4_ARENA).json()['rewards_awarded']
        print('\n[LOOP-13] all-wrong arena -> arena_won', r['arena_won'], 'coins', r['coins'], 'xp', r['xp'])
        self.assertFalse(r['arena_won'])
        self.assertEqual(r['coins'], 200)

    def test_14_retry_after_reward_lost_response(self):
        self.cur(); self.adv(L.STAGE_1_WARMUP); self.adv(L.STAGE_2_SPRINT); self.adv(L.STAGE_3_CLEANUP)
        self.adv(L.STAGE_4_ARENA)
        before = self.coins()
        retry = self.adv(L.STAGE_4_ARENA)
        cur = self.cur()
        print('\n[LOOP-14] retry final advance ->', retry.status_code, '| coins unchanged:', before == self.coins(),
              '| GET current exposes is_chest_claimed:', cur['loop']['is_chest_claimed'],
              '| awarded amounts recoverable from GET:', 'rewards_awarded' in cur or 'rewards_awarded' in cur.get('stage_data', {}))
        self.assertEqual(retry.status_code, 409)
        self.assertEqual(before, self.coins())

    def test_15_cache_loss_mid_loop(self):
        self.cur(); self.adv(L.STAGE_1_WARMUP)
        ids = stage_question_ids(self.cur(), 'sprint')
        answer_loop_questions(self.c, 'sprint', ids[:5])
        cache.clear()
        cur = self.cur()
        print('\n[LOOP-15] after cache.clear(): stage', cur['loop']['current_stage'], '| same questions', ids == stage_question_ids(cur, 'sprint'))
        self.assertEqual(cur['loop']['current_stage'], L.STAGE_2_SPRINT)

    def test_16_two_devices_same_loop(self):
        other = APIClient(); other.force_authenticate(self.user)
        self.cur(); self.adv(L.STAGE_1_WARMUP)
        qid = stage_question_ids(self.cur(), 'sprint')[0]
        right = AnswerOption.objects.filter(question_id=qid, is_correct=True).first()
        wrong = AnswerOption.objects.filter(question_id=qid, is_correct=False).first()
        a = self.c.post(URL + 'answer/', {'stage': 'sprint', 'question_id': qid, 'option_id': right.id}, format='json').json()
        b = other.post(URL + 'answer/', {'stage': 'sprint', 'question_id': qid, 'option_id': wrong.id}, format='json').json()
        r1 = self.adv(L.STAGE_2_SPRINT); r2 = self.adv(L.STAGE_2_SPRINT, client=other)
        print('\n[LOOP-16] device B sees duplicate', b['duplicate'], b['is_correct'], '| advances ->', r1.status_code, r2.status_code)
        self.assertTrue(b['duplicate'])
        self.assertEqual(r2.status_code, 409)

    def test_17_restart_rules(self):
        self.cur()
        early = self.c.post(URL + 'restart-cycle/', {}, format='json').status_code
        for n in range(3):
            self.adv(L.STAGE_1_WARMUP); self.adv(L.STAGE_2_SPRINT); self.adv(L.STAGE_3_CLEANUP); self.adv(L.STAGE_4_ARENA)
            r = self.c.post(URL + 'restart-cycle/', {}, format='json')
        print('\n[LOOP-17] restart before finish ->', early, '| 4th restart ->', r.status_code,
              '| loops today:', L.objects.filter(user=self.user).count())
        self.assertEqual(early, 409)
        self.assertEqual(r.status_code, 429)

    def test_18_old_loop_reward_not_reclaimable(self):
        self.cur(); self.adv(L.STAGE_1_WARMUP); self.adv(L.STAGE_2_SPRINT); self.adv(L.STAGE_3_CLEANUP)
        L.objects.filter(user=self.user).update(date=timezone.localdate() - timedelta(days=1))  # yesterday, stuck at arena
        before = self.coins()
        r = self.adv(L.STAGE_4_ARENA)
        print('\n[LOOP-18] yesterday loop at ARENA, advance today ->', r.status_code, r.json().get('current_stage'),
              '| coins delta', self.coins() - before, '| loops:', list(L.objects.filter(user=self.user).values_list('date', 'current_stage')))
        self.assertEqual(self.coins(), before)


class OwnershipAndSessionTests(_LoopBase):
    def test_09_other_users_session_via_sprint_endpoint(self):
        self.cur(); self.adv(L.STAGE_1_WARMUP)
        loop = self.loop()
        qid = loop.sprint_session.question_ids[0]
        opt = AnswerOption.objects.filter(question_id=qid).first()
        intruder, _ = make_user('intruder')
        ic = APIClient(); ic.force_authenticate(intruder)
        r = ic.post('/api/v1/sprint/answer/', {'session_id': loop.sprint_session_id, 'question_id': qid, 'option_id': opt.id}, format='json')
        r_own_loop_sess = self.c.post('/api/v1/sprint/answer/', {'session_id': loop.sprint_session_id, 'question_id': qid, 'option_id': opt.id}, format='json')
        print('\n[LOOP-09] intruder answers victim loop session ->', r.status_code,
              '| owner via plain sprint endpoint (mode mismatch) ->', r_own_loop_sess.status_code)
        self.assertEqual(r.status_code, 404)
        self.assertEqual(r_own_loop_sess.status_code, 404)

    def test_10_expired_session(self):
        self.cur(); self.adv(L.STAGE_1_WARMUP)
        loop = self.loop()
        QuizSession.objects.filter(pk=loop.sprint_session_id).update(expires_at=timezone.now() - timedelta(seconds=1))
        qid = loop.sprint_session.question_ids[0]
        opt = AnswerOption.objects.filter(question_id=qid).first()
        r = self.c.post(URL + 'answer/', {'stage': 'sprint', 'question_id': qid, 'option_id': opt.id}, format='json')
        adv = self.adv(L.STAGE_2_SPRINT)
        print('\n[LOOP-10] expired sprint session answer ->', r.status_code, '| advance still allowed ->', adv.status_code,
              adv.json().get('current_stage'))
        self.assertEqual(r.status_code, 410)

    def test_question_not_in_session(self):
        self.cur(); self.adv(L.STAGE_1_WARMUP)
        loop = self.loop()
        outside = [q for q in AnswerOption.objects.values_list('question_id', flat=True) if q not in loop.sprint_session.question_ids][0]
        opt = AnswerOption.objects.filter(question_id=outside).first()
        r = self.c.post(URL + 'answer/', {'stage': 'sprint', 'question_id': outside, 'option_id': opt.id}, format='json')
        print('\n[LOOP-08b] question outside session ->', r.status_code, r.json().get('code'))
        self.assertEqual(r.status_code, 400)


class SmallBankTests(_LoopBase):
    N_QUESTIONS = 12  # fewer than sprint(12) + arena(5)

    def test_arena_reuses_sprint_questions_with_known_answers(self):
        self.cur(); self.adv(L.STAGE_1_WARMUP)
        sprint = stage_question_ids(self.cur(), 'sprint')
        answer_loop_questions(self.c, 'sprint', sprint)
        self.adv(L.STAGE_2_SPRINT)
        arena = stage_question_ids(self.cur(), 'arena')
        print('\n[LOOP-SB] bank=12: arena ⊆ sprint:', set(arena) <= set(sprint), '| arena', arena)
        self.assertTrue(set(arena) <= set(sprint))


class DuplicateLoopRowTests(_LoopBase):
    def test_parallel_first_get_duplicates_simulated(self):
        self.cur()
        first = self.loop()
        # Simulates two parallel first GETs: no unique (user, date, cycle_number) constraint.
        dup = L.objects.create(user=self.user, date=first.date, cycle_number=1, topic=first.topic, subject=first.subject,
                               current_stage=L.STAGE_1_WARMUP)
        self.adv(L.STAGE_1_WARMUP); self.adv(L.STAGE_2_SPRINT); self.adv(L.STAGE_3_CLEANUP); self.adv(L.STAGE_4_ARENA)
        stages = dict(L.objects.filter(user=self.user).values_list('id', 'current_stage'))
        r = self.c.post(URL + 'restart-cycle/', {}, format='json')
        print('\n[LOOP-DUP] rows:', stages, '| restart after completing newest ->', r.status_code, r.json().get('error'))
        self.assertEqual(L.objects.filter(user=self.user, cycle_number=1).count(), 2)
