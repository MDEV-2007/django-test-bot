"""Phase 6 audit reproducers: malformed bodies, big input, response leaks, specific authz gaps.
Throwaway SQLite test DB only; outbound calls mocked."""
import json
import re
from datetime import timedelta
from unittest import mock

from django.contrib.auth.models import User
from django.core.cache import cache
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import ensure_profile_for_user
from tests.factories import make_question, make_subject, make_test_set, make_topic, make_user

INV = r"C:\Users\Murodulla\Desktop\django-test-bot\audit\test-data\phase6-endpoints.json"
OUT = r"C:\Users\Murodulla\Desktop\django-test-bot\audit\test-data\phase6-leaks-and-bodies.json"
SENSITIVE = re.compile(r'"(password|is_correct|correct_option_id|correct_index|reference_answer|accepted_answers|'
                       r'phone|phone_number|email|telegram_id|card_number|screenshot|admin_note|token|refresh|access)"')


def concrete(path):
    p = re.sub(r"<int:[^>]+>", "1", path)
    return re.sub(r"<[^>]+>", "x1", p).replace("^", "").replace("$", "")


NET = [mock.patch("core.ai_client.ask_groq", return_value=None),
       mock.patch("requests.sessions.Session.request", side_effect=RuntimeError("network blocked")),
       mock.patch("core.background.submit", return_value=None)]


@override_settings(TELEGRAM_BOT_TOKEN="", REQUIRE_CHANNEL_SUBSCRIPTION=False)
class BodyAndLeakProbe(TestCase):
    def test_probe(self):
        cache.clear()
        subj = make_subject(); topic = make_topic(subject=subj)
        q = make_question(subject=subj, topic=topic)
        make_test_set(subject=subj, questions=[q])
        other, op = make_user("other_student")
        User.objects.filter(pk=other.pk).update(email="other@example.com")
        stu, _ = make_user("probe_student")
        c = APIClient(); c.force_authenticate(stu); c.raise_request_exception = False
        rows = [r for r in json.load(open(INV, encoding="utf-8")) if r["kind"] == "drf"
                and "IsSuperAdmin" not in (r["perms"] or []) and "IsTeacher" not in (r["perms"] or [])]
        list_500, leaks = [], []
        for p in NET: p.start()
        try:
            for r in rows:
                url = concrete(r["path"])
                for m in (r["methods"] or []):
                    if m in ("POST", "PUT", "PATCH"):
                        code = getattr(c, m.lower())(url, [1, 2], format="json").status_code
                        if code >= 500:
                            list_500.append(f"{m} {r['path']} ({r['src']})")
                    if m == "GET":
                        resp = c.get(url)
                        if resp.status_code == 200 and resp.get("Content-Type", "").startswith("application/json"):
                            body = resp.content.decode("utf-8", "replace")
                            keys = sorted(set(SENSITIVE.findall(body)))
                            if keys or "other@example.com" in body:
                                leaks.append({"path": r["path"], "keys": keys, "other_users_email": "other@example.com" in body})
        finally:
            for p in NET: p.stop()
        json.dump({"list_body_5xx": list_500, "sensitive_keys_in_student_GET": leaks},
                  open(OUT, "w", encoding="utf-8"), indent=1)
        print("\n[API-BODY] list body -> 5xx on", len(list_500), "endpoints")
        for x in list_500: print("   ", x)
        print("[API-LEAK] student GET responses with sensitive keys:", len(leaks))
        for x in leaks: print("   ", x)


@override_settings(TELEGRAM_BOT_TOKEN="", REQUIRE_CHANNEL_SUBSCRIPTION=False)
class SpecificTests(TestCase):
    def setUp(self):
        cache.clear()
        self.user, self.profile = make_user("api_audit")
        self.c = APIClient(); self.c.force_authenticate(self.user); self.c.raise_request_exception = False

    def test_API_001_reels_quiz_500_for_every_logged_in_user_and_unknown_reel_pays(self):
        r1 = self.c.post("/api/learning/reels/quiz/", {"reel_id": 999001, "answer_index": 0}, format="json")
        self.profile.refresh_from_db()
        r2 = APIClient().post("/api/learning/reels/quiz/", {"reel_id": 999001, "answer_index": 0}, format="json")
        print("\n[API-001] logged-in reels quiz (unknown reel 999001, answer 0) ->", r1.status_code,
              "| xp after:", self.profile.xp, "streak:", self.profile.streak, "| anonymous ->", r2.status_code, r2.json())
        self.assertEqual(r1.status_code, 500)

    def test_API_002_classroom_mock_test_set_takeable_without_subscription(self):
        from classroom.models import MockTest
        from teacher.models import TeacherProfile
        from tests_app.models import AnswerOption, Question, TestSet
        tuser = User.objects.create_user("ustoz_x", password="x")
        tprof = ensure_profile_for_user(tuser); tprof.role = "teacher"; tprof.save(update_fields=["role"])
        teacher = TeacherProfile.objects.create(profile=tprof, full_name="Ustoz X")
        subj = make_subject()
        q = Question.objects.create(body="Pullik mock savoli", question_type="single_choice", subject=subj)
        AnswerOption.objects.create(question=q, text="A", is_correct=True); AnswerOption.objects.create(question=q, text="B", is_correct=False)
        ts = TestSet.objects.create(title="Haftalik pullik mock", subject=subj, duration_minutes=60, is_premium=False, is_published=True)
        ts.questions.set([q])
        mock_ = MockTest.objects.create(teacher=teacher, subject=subj, test_set=ts, title="Haftalik mock",
                                        scheduled_start=timezone.now() + timedelta(days=2), duration_minutes=60, status="scheduled")
        via_class = self.c.post(f"/api/classroom/mocks/{mock_.id}/start/")
        via_tests = self.c.post(f"/api/tests/{ts.id}/start/")
        print("\n[API-002] non-subscriber: classroom start ->", via_class.status_code,
              "| /api/tests/<test_set>/start/ two days before mock ->", via_tests.status_code, list(via_tests.json())[:5])
        self.assertEqual(via_tests.status_code, 200)

    def test_API_003_oversized_text_input(self):
        big = "A" * 200_000
        r = self.c.post("/api/auth/profile/", {"first_name": big}, format="json")
        r2 = self.c.post("/api/learning/feed/create/", {"caption": big, "title": "t", "post_type": "question"}, format="json")
        self.user.refresh_from_db()
        print("\n[API-003] 200k first_name ->", r.status_code, "stored len", len(self.user.first_name),
              "| 200k feed caption ->", r2.status_code)

    def test_API_004_growth_open_question_is_answer_oracle(self):
        from tests_app.models import Question
        subj = make_subject()
        q = Question.objects.create(body="Anqara jangi qachon?", question_type="open_written", subject=subj,
                                    reference_answer="1402-yil", explanation="1402-yil Amir Temur Boyazidni yengdi")
        with mock.patch("growth.ai_grader.ask_groq", return_value=None):
            a = self.c.post("/api/growth/open-question/evaluate/", {"question_id": q.id, "student_answer": "1402-yil"}, format="json").json()
            b = self.c.post("/api/growth/open-question/evaluate/", {"question_id": q.id, "student_answer": "1399"}, format="json").json()
        print("\n[API-004] oracle on question", q.id, "| '1402-yil' ->", a["data"]["is_correct"], a["data"].get("similarity"),
              "| '1399' ->", b["data"]["is_correct"])
