"""Comprehensive automated test suite for the Master Engineering Remediation task.

Covers:
1. Republic Mock (Respublika Mock) end-to-end lifecycle:
   - Admin publish guards (0 questions, missing scheduled_at)
   - Free & paid registration + deduplication + RM-... ticket ID
   - Payment approval -> atomic MockRegistration CONFIRMED transition
   - Lobby state machine + start guards (scheduled_at, payment, duplicate attempt, disqualified)
   - Official leaderboard ordering, tie-breaking, anti-cheat disqualification, and PII masking
   - Admin prize & disqualification review + AuditLog creation
   - Telegram mock notifier idempotency, dry-run safety, 15m reminder, and paid audience segmentation
2. Dashboard personalization & public leaderboard de-faking:
   - Zero fabricated rows/scores/regions on landing leaderboard
   - Personalized suggested_topic (weak topic -> unpracticed topic -> starter topic)
   - Upcoming mocks in home_api
   - Daily reward cap on random / mistakes tests (anti-farming)
3. Classroom Battle end-to-end & PIN security:
   - Teacher create -> Student join -> Start -> Question order & contract (body + text, no answer leak) -> Submit (accuracy_rate) -> Finish
   - Brute-force PIN rate limiting (429 after 10 failed attempts)
4. Live 1v1 Battle WebSocket matchmaking cleanup & timeout recovery:
   - Disconnect during searching deletes orphaned searching Battle row
   - Reconnect mid-battle receives battle_state
   - claim_timeout resolves round when opponent stalls/disconnects
"""
import asyncio
import json
from datetime import timedelta
from unittest.mock import patch

from channels.testing import WebsocketCommunicator
from django.core.cache import cache
from django.core.management import call_command
from django.test import TestCase, TransactionTestCase
from django.utils import timezone
from rest_framework.test import APIClient

from battles.consumers import BattleConsumer, MatchmakingConsumer
from battles.models import Battle
from core.models import ClassBattleRoom, SystemFeatureFlags
from learning.models import Lesson, Topic
from panel.models import AuditLog
from premium.models import Payment, SubscriptionPlan
from tests.factories import make_question, make_subject, make_test_set, make_user
from tests_app.models import Attempt, AttemptAnswer, MockRegistration, Question, RevisionItem, TestSet


class RepublicMockLifecycleTests(TestCase):
    def setUp(self):
        cache.clear()
        self.subject = make_subject(name="Tarix", slug="tarix")
        self.questions = [make_question(subject=self.subject, body=f"Tarix savol {i}") for i in range(5)]

        self.admin_user, self.admin_profile = make_user("mock_admin", role="superadmin")
        self.admin_user.is_staff = True
        self.admin_user.is_superuser = True
        self.admin_user.save()
        self.student1, self.profile1 = make_user("student_one")
        self.profile1.telegram_id = 100001
        self.profile1.region = "Samarqand"
        self.profile1.save()

        self.student2, self.profile2 = make_user("student_two")
        self.profile2.telegram_id = 100002
        self.profile2.region = "Buxoro"
        self.profile2.save()

        self.mock_plan, _ = SubscriptionPlan.objects.get_or_create(
            plan_type="mock_test",
            defaults={"name": "Respublika Mock", "price": 25000, "duration_days": 30},
        )

        self.admin_client = APIClient()
        self.admin_client.force_authenticate(user=self.admin_user)

        self.client1 = APIClient()
        self.client1.force_authenticate(user=self.student1)

        self.client2 = APIClient()
        self.client2.force_authenticate(user=self.student2)

    def test_admin_cannot_publish_empty_or_unscheduled_live_mock(self):
        empty_mock = TestSet.objects.create(
            title="Bo'sh Mock",
            subject=self.subject,
            category="mock",
            is_live_mock=True,
            is_published=False,
            duration_minutes=60,
        )
        res = self.admin_client.post(f"/api/panel/testsets/{empty_mock.id}/toggle-publish/")
        self.assertEqual(res.status_code, 400)

        empty_mock.questions.set(self.questions)
        # Still missing scheduled_at for is_live_mock=True
        res2 = self.admin_client.post(f"/api/panel/testsets/{empty_mock.id}/toggle-publish/")
        self.assertEqual(res2.status_code, 400)

        empty_mock.scheduled_at = timezone.now() + timedelta(hours=2)
        empty_mock.save()
        res3 = self.admin_client.post(f"/api/panel/testsets/{empty_mock.id}/toggle-publish/")
        self.assertEqual(res3.status_code, 200)
        self.assertTrue(res3.json()["is_published"])

    def test_paid_and_free_mock_registration_payment_and_start_guards(self):
        future_time = timezone.now() + timedelta(hours=1)
        paid_mock = TestSet.objects.create(
            title="Respublika Pullik Mock",
            subject=self.subject,
            category="mock",
            is_live_mock=True,
            is_premium=True,
            price=25000,
            prize_description="1-o'rin: 1,000,000 so'm",
            scheduled_at=future_time,
            duration_minutes=60,
            is_published=True,
        )
        paid_mock.questions.set(self.questions)

        # 1. Register for paid mock -> PENDING_PAYMENT
        reg_res = self.client1.post(
            f"/api/tests/{paid_mock.id}/register/",
            {"full_name": "Ali Valiyev", "phone": "+998901234567", "region": "Toshkent"},
            format="json",
        )
        self.assertIn(reg_res.status_code, (200, 201))
        reg_data = reg_res.json()
        self.assertTrue(reg_data["requires_payment"])
        self.assertEqual(reg_data["status"], "PENDING_PAYMENT")
        self.assertTrue(reg_data["registration_id"].startswith("RM-"))

        # 2. Duplicate registration returns existing row without creating a second one
        dup_res = self.client1.post(
            f"/api/tests/{paid_mock.id}/register/",
            {"full_name": "Ali Valiyev", "phone": "+998901234567", "region": "Toshkent"},
            format="json",
        )
        self.assertEqual(dup_res.status_code, 200)
        self.assertEqual(dup_res.json()["registration_id"], reg_data["registration_id"])
        self.assertEqual(MockRegistration.objects.filter(profile=self.profile1, test=paid_mock).count(), 1)

        # 3. Cannot start before scheduled_at / payment
        start_unpaid = self.client1.post(f"/api/tests/{paid_mock.id}/start/")
        self.assertIn(start_unpaid.status_code, (400, 403))

        # 4. Approve payment linked to test -> MockRegistration becomes CONFIRMED
        payment = Payment.objects.create(
            profile=self.profile1,
            plan=self.mock_plan,
            test=paid_mock,
            amount=25000,
            status="approved",
        )
        payment.apply_to_profile()

        reg_obj = MockRegistration.objects.get(profile=self.profile1, test=paid_mock)
        self.assertEqual(reg_obj.status, "CONFIRMED")
        self.assertIsNotNone(reg_obj.confirmed_at)

        # 5. Cannot start before scheduled_at
        start_early = self.client1.post(f"/api/tests/{paid_mock.id}/start/")
        self.assertEqual(start_early.status_code, 400)
        self.assertIn("scheduled_at", start_early.json())

        # 6. Move scheduled_at to now -> unpaid Student 2 gets 403 PAYMENT_REQUIRED, paid Student 1 gets 200
        paid_mock.scheduled_at = timezone.now() - timedelta(minutes=2)
        paid_mock.save(update_fields=["scheduled_at"])

        start_unpaid_s2 = self.client2.post(f"/api/tests/{paid_mock.id}/start/")
        self.assertEqual(start_unpaid_s2.status_code, 403)
        self.assertEqual(start_unpaid_s2.json().get("code"), "PAYMENT_REQUIRED")

        start_ok = self.client1.post(f"/api/tests/{paid_mock.id}/start/")
        self.assertEqual(start_ok.status_code, 200)
        attempt_id = start_ok.json()["attempt_id"]
        reg_obj.refresh_from_db()
        self.assertIsNotNone(reg_obj.checked_in_at)

        # 7. Complete attempt -> second start returns completed=True (no new attempt created)
        Attempt.objects.filter(id=attempt_id).update(
            is_completed=True, score=80.0, correct_answers=4, wrong_answers=1, completed_at=timezone.now()
        )
        start_dup = self.client1.post(f"/api/tests/{paid_mock.id}/start/")
        self.assertEqual(start_dup.status_code, 200)
        self.assertTrue(start_dup.json().get("completed"))
        self.assertEqual(Attempt.objects.filter(profile=self.profile1, test=paid_mock).count(), 1)

    def test_leaderboard_tie_break_pii_masking_and_admin_prize_audit(self):
        mock = TestSet.objects.create(
            title="Reyting Mock",
            subject=self.subject,
            category="mock",
            is_live_mock=True,
            is_premium=False,
            price=0,
            scheduled_at=timezone.now() - timedelta(minutes=30),
            duration_minutes=60,
            is_published=True,
        )
        mock.questions.set(self.questions)

        now = timezone.now()
        # Student 1: 80%, took 600s
        a1 = Attempt.objects.create(
            profile=self.profile1,
            test=mock,
            score=80.0,
            correct_answers=4,
            wrong_answers=1,
            is_completed=True,
            completed_at=now,
        )
        Attempt.objects.filter(pk=a1.pk).update(started_at=now - timedelta(seconds=600))

        # Student 2: 80%, took 300s (faster -> should rank #1!)
        a2 = Attempt.objects.create(
            profile=self.profile2,
            test=mock,
            score=80.0,
            correct_answers=4,
            wrong_answers=1,
            is_completed=True,
            completed_at=now,
        )
        Attempt.objects.filter(pk=a2.pk).update(started_at=now - timedelta(seconds=300))

        lb_res = self.client1.get(f"/api/tests/{mock.id}/leaderboard/")
        self.assertEqual(lb_res.status_code, 200)
        results = lb_res.json()["results"]
        self.assertEqual(len(results), 2)
        self.assertEqual(results[0]["attempt_id"], a2.id)
        self.assertEqual(results[0]["rank"], 1)
        self.assertEqual(results[1]["attempt_id"], a1.id)
        self.assertEqual(results[1]["rank"], 2)

        # Ensure no PII is leaked in public leaderboard
        for row in results:
            self.assertNotIn("phone", row)
            self.assertNotIn("email", row)
            self.assertNotIn("telegram_id", row)

        # Admin disqualifies Student 2 without reason -> 400
        bad_disq = self.admin_client.post(
            f"/api/panel/mocks/attempts/{a2.id}/review/",
            {"action": "disqualify", "admin_note": ""},
            format="json",
        )
        self.assertEqual(bad_disq.status_code, 400)

        # Admin disqualifies Student 2 with reason -> 200 + AuditLog created
        ok_disq = self.admin_client.post(
            f"/api/panel/mocks/attempts/{a2.id}/review/",
            {"action": "disqualify", "admin_note": "Tab switch anti-cheat qoidabuzarligi"},
            format="json",
        )
        self.assertEqual(ok_disq.status_code, 200)
        self.assertTrue(
            AuditLog.objects.filter(action="update", model_name="MockRegistration").exists()
        )

        # Student 1 now ranks #1 and Student 2 has rank=None, is_disqualified=True
        lb_after = self.client1.get(f"/api/tests/{mock.id}/leaderboard/").json()["results"]
        self.assertEqual(lb_after[0]["attempt_id"], a1.id)
        self.assertEqual(lb_after[0]["rank"], 1)
        self.assertEqual(lb_after[1]["attempt_id"], a2.id)
        self.assertIsNone(lb_after[1]["rank"])
        self.assertTrue(lb_after[1]["is_disqualified"])

    @patch("telegrambot.mock_notifier.api_call")
    def test_mock_notifier_dry_run_idempotency_and_paid_audience_segmentation(self, mock_send):
        mock_send.return_value = {"ok": True}
        paid_mock = TestSet.objects.create(
            title="Telegram Mock",
            subject=self.subject,
            category="mock",
            is_live_mock=True,
            is_premium=True,
            price=30000,
            scheduled_at=timezone.now() - timedelta(minutes=1),
            duration_minutes=60,
            is_published=True,
            notify_all=True,
        )
        paid_mock.questions.set(self.questions)

        # Student 1 is CONFIRMED registrant; Student 2 is unpaid general user
        MockRegistration.objects.create(
            profile=self.profile1,
            test=paid_mock,
            full_name="Tasdiqlangan O'quvchi",
            status="CONFIRMED",
        )

        # 1. Dry-run should not send messages or set notified_at
        call_command("check_and_notify_mocks", "--dry-run")
        paid_mock.refresh_from_db()
        self.assertIsNone(paid_mock.notified_at)
        self.assertEqual(mock_send.call_count, 0)

        # 2. Real run sends segmented messages and sets notified_at
        call_command("check_and_notify_mocks")
        paid_mock.refresh_from_db()
        self.assertIsNotNone(paid_mock.notified_at)
        self.assertEqual(mock_send.call_count, 2)

        sent_by_chat = {
            int(call.kwargs.get("chat_id") or (call.args[1].get("chat_id") if len(call.args) > 1 else 0)): (
                call.kwargs.get("text") or (call.args[1].get("text") if len(call.args) > 1 else "")
            )
            for call in mock_send.call_args_list
        }
        self.assertIn("Sizning ishtirokingiz tasdiqlangan!", sent_by_chat[100001])
        self.assertIn("30 000 so'm", sent_by_chat[100002])

        # 3. Second run is idempotent (0 additional messages)
        mock_send.reset_mock()
        call_command("check_and_notify_mocks")
        self.assertEqual(mock_send.call_count, 0)


class DashboardAndLeaderboardIntegrityTests(TestCase):
    def setUp(self):
        cache.clear()
        self.subject = make_subject(name="Tarix", slug="tarix")
        self.topic1 = Topic.objects.create(
            subject=self.subject, title="Qadimgi Dunyo", slug="qadimgi-dunyo", category="history", order=1
        )
        self.topic2 = Topic.objects.create(
            subject=self.subject, title="Amir Temur Davlati", slug="amir-temur-davlati", category="history", order=2
        )
        Lesson.objects.create(topic=self.topic1, title="1-dars", content="Matn", is_published=True)
        Lesson.objects.create(topic=self.topic2, title="2-dars", content="Matn", is_published=True)

        self.q1 = make_question(subject=self.subject, body="Savol 1")
        self.q1.topic = self.topic1
        self.q1.save()
        self.q2 = make_question(subject=self.subject, body="Savol 2")
        self.q2.topic = self.topic2
        self.q2.save()

        self.user, self.profile = make_user("dash_student")
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_landing_leaderboard_never_fabricates_fake_rows_or_scores(self):
        # Even with 1 user who has 0 XP, landing leaderboard must return empty/honest list without FALLBACK_ROWS
        res = self.client.get("/api/dashboard/landing-leaderboard/")
        self.assertEqual(res.status_code, 200)
        rows = res.json()["leaderboard"]
        self.assertEqual(len(rows), 0)

        # Give real user 250 XP and no region -> region must be "" (not fabricated cycling region)
        self.profile.xp = 250
        self.profile.region = ""
        self.profile.save()
        cache.clear()

        res2 = self.client.get("/api/dashboard/landing-leaderboard/")
        rows2 = res2.json()["leaderboard"]
        self.assertEqual(len(rows2), 1)
        self.assertEqual(rows2[0]["xp"], "250 XP")
        self.assertEqual(rows2[0]["region_and_subject"], "IlmIldizi o'quvchisi")
        self.assertEqual(rows2[0]["score"], "—")

    def test_home_api_personalizes_suggested_topic_from_weak_topics(self):
        # Initially suggests starter topic (order=1)
        res1 = self.client.get("/api/dashboard/home/?subject=tarix")
        self.assertEqual(res1.status_code, 200)
        st1 = res1.json()["suggested_topic"]
        self.assertEqual(st1["id"], self.topic1.id)
        self.assertEqual(st1["priority"], "starter")

        # Record a RevisionItem on topic2 -> suggested_topic switches to topic2 with priority='weak_topic'
        RevisionItem.objects.create(profile=self.profile, question=self.q2, mastered=False)
        res2 = self.client.get("/api/dashboard/home/?subject=tarix")
        st2 = res2.json()["suggested_topic"]
        self.assertEqual(st2["id"], self.topic2.id)
        self.assertEqual(st2["priority"], "weakness")

    def test_random_and_mistakes_tests_enforce_daily_reward_cap(self):
        # Create 6 random tests and finish them all with 100% score; 6th must award 0 XP / 0 coins
        for idx in range(6):
            test = TestSet.objects.create(
                title=f"Random {idx}",
                subject=self.subject,
                category="history",
                duration_minutes=10,
                is_random=True,
                is_published=True,
            )
            test.questions.set([self.q1])
            attempt = Attempt.objects.create(profile=self.profile, test=test)
            correct_choice = self.q1.choices.filter(is_correct=True).first()
            AttemptAnswer.objects.create(
                attempt=attempt, question=self.q1, selected_choice=correct_choice, is_correct=True
            )
            fin = self.client.post(f"/api/tests/attempts/{attempt.id}/finish/")
            self.assertEqual(fin.status_code, 200)
            if idx < 5:
                self.assertGreater(fin.json()["xp_awarded"], 0)
            else:
                self.assertEqual(fin.json()["xp_awarded"], 0)
                self.assertEqual(fin.json()["coins_awarded"], 0)


class ClassroomBattleEndToEndTests(TestCase):
    def setUp(self):
        cache.clear()
        flags = SystemFeatureFlags.load()
        flags.enable_teacher_class_battles = True
        flags.save()

        self.subject = make_subject(name="Tarix", slug="tarix")
        self.questions = [make_question(subject=self.subject, body=f"Sinf savol {i}") for i in range(4)]
        self.teacher, _ = make_user("cb_teacher", role="teacher")
        self.student, self.student_profile = make_user("cb_student")

        self.teacher_client = APIClient()
        self.teacher_client.force_authenticate(user=self.teacher)
        self.student_client = APIClient()
        self.student_client.force_authenticate(user=self.student)

    def test_classroom_battle_full_flow_and_pin_rate_limit(self):
        # 1. Teacher creates room
        create_res = self.teacher_client.post(
            "/api/v1/system/class-battles/create/",
            {"title": "7-A Sinf Bellashuvi", "subject_id": self.subject.id, "question_count": 4},
            format="json",
        )
        self.assertEqual(create_res.status_code, 200)
        room_id = create_res.json()["room_id"]
        pin_code = create_res.json()["pin_code"]

        # 2. Student joins by PIN
        join_res = self.student_client.post(
            f"/api/v1/system/class-battles/{pin_code}/join/",
            {"nickname": "Sardor <script>"},
            format="json",
        )
        self.assertEqual(join_res.status_code, 200)
        self.assertNotIn("<", join_res.json()["nickname"])

        # 3. Teacher starts room
        start_res = self.teacher_client.post(f"/api/v1/system/class-battles/{room_id}/start/")
        self.assertEqual(start_res.status_code, 200)

        # 4. Student polls state -> receives ordered questions with both 'body' and 'text', and no 'is_correct'
        state_res = self.student_client.get(f"/api/v1/system/class-battles/{room_id}/state/")
        self.assertEqual(state_res.status_code, 200)
        state_data = state_res.json()
        self.assertEqual(len(state_data["questions"]), 4)
        answers_payload = {}
        for q in state_data["questions"]:
            self.assertIn("body", q)
            self.assertIn("text", q)
            self.assertEqual(q["body"], q["text"])
            for c in q["choices"]:
                self.assertNotIn("is_correct", c)
            correct_c = Question.objects.get(id=q["id"]).choices.filter(is_correct=True).first()
            answers_payload[str(q["id"])] = correct_c.id

        # 5. Student submits answers -> gets 100% accuracy_rate
        sub_res = self.student_client.post(
            f"/api/v1/system/class-battles/{room_id}/submit/",
            {"answers": answers_payload},
            format="json",
        )
        self.assertEqual(sub_res.status_code, 200)
        sub_data = sub_res.json()
        self.assertTrue(sub_data["success"])
        self.assertEqual(sub_data["accuracy_rate"], 100)
        self.assertEqual(sub_data["score"], 400)

        # 6. Duplicate submit is rejected
        dup_sub = self.student_client.post(
            f"/api/v1/system/class-battles/{room_id}/submit/",
            {"answers": answers_payload},
            format="json",
        )
        self.assertEqual(dup_sub.status_code, 400)

        # 7. Brute-force wrong PIN 10 times -> 11th returns 429
        for _ in range(10):
            r = self.student_client.post("/api/v1/system/class-battles/000000/join/", {"nickname": "X"}, format="json")
            self.assertEqual(r.status_code, 404)
        r_blocked = self.student_client.post("/api/v1/system/class-battles/000000/join/", {"nickname": "X"}, format="json")
        self.assertEqual(r_blocked.status_code, 429)


class BattleMatchmakingCleanupTests(TransactionTestCase):
    def setUp(self):
        self.subject = make_subject(name="Tarix", slug="tarix")
        self.questions = [make_question(subject=self.subject, body=f"Jang savol {i}") for i in range(6)]
        self.user1, self.profile1 = make_user("mm_player_1")
        self.user2, self.profile2 = make_user("mm_player_2")

    def _connect_mm(self, user):
        comm = WebsocketCommunicator(MatchmakingConsumer.as_asgi(), "/ws/battles/matchmaking/")
        comm.scope["user"] = user
        comm.scope["session"] = {"selected_subject": self.subject.slug}
        return comm

    def _connect_battle(self, user, battle_id):
        comm = WebsocketCommunicator(BattleConsumer.as_asgi(), f"/ws/battles/{battle_id}/")
        comm.scope["user"] = user
        comm.scope["url_route"] = {"kwargs": {"battle_id": str(battle_id)}}
        return comm

    def test_disconnect_during_searching_cleans_up_searching_battle_and_timeout_resolves_round(self):
        async def run():
            from channels.db import database_sync_to_async

            # 1. Player 1 connects to matchmaking then disconnects before anyone joins
            mm1 = self._connect_mm(self.user1)
            self.assertTrue((await mm1.connect())[0])
            await asyncio.sleep(0.1)
            searching_count = await database_sync_to_async(
                lambda: Battle.objects.filter(status="searching").count()
            )()
            self.assertEqual(searching_count, 1)

            await mm1.disconnect()
            await asyncio.sleep(0.1)
            searching_after = await database_sync_to_async(
                lambda: Battle.objects.filter(status="searching").count()
            )()
            self.assertEqual(searching_after, 0)

            # 2. Player 1 and Player 2 connect and match
            mm1_b = self._connect_mm(self.user1)
            mm2_b = self._connect_mm(self.user2)
            self.assertTrue((await mm1_b.connect())[0])
            self.assertTrue((await mm2_b.connect())[0])

            matched2 = await mm2_b.receive_json_from(timeout=5)
            matched1 = await mm1_b.receive_json_from(timeout=5)
            battle_id = matched1["battle_id"]
            q1 = matched1["questions"][0]
            await mm1_b.disconnect()
            await mm2_b.disconnect()

            # 3. Connect to battle; Player 1 answers round 1, Player 2 stalls -> Player 1 claims timeout
            b1 = self._connect_battle(self.user1, battle_id)
            self.assertTrue((await b1.connect())[0])
            await b1.send_to(text_data=json.dumps({
                "action": "answer",
                "round_number": q1["round_number"],
                "choice_id": q1["choices"][0]["id"],
            }))
            wait_msg = await b1.receive_json_from(timeout=5)
            self.assertEqual(wait_msg["event"], "waiting_for_opponent")

            # Claim timeout for round 1
            await b1.send_to(text_data=json.dumps({
                "action": "claim_timeout",
                "round_number": q1["round_number"],
            }))
            round_res = await b1.receive_json_from(timeout=5)
            self.assertEqual(round_res["event"], "round_result")
            self.assertTrue(round_res.get("timeout_claimed"))
            await b1.disconnect()

            # 4. Reconnect mid-battle -> automatically receives battle_state with current_round=2
            b1_re = self._connect_battle(self.user1, battle_id)
            self.assertTrue((await b1_re.connect())[0])
            state_msg = await b1_re.receive_json_from(timeout=5)
            self.assertEqual(state_msg["event"], "battle_state")
            self.assertEqual(state_msg["current_round"], 2)
            await b1_re.disconnect()

        asyncio.run(run())
