"""Phase 6: probe every DRF endpoint as anonymous / student / teacher on the throwaway test DB.
Outbound calls are mocked. Writes audit/test-data/phase6-probe.json."""
import json
import re
from unittest import mock

from django.core.cache import cache
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from tests.factories import make_question, make_subject, make_test_set, make_topic, make_user

INV = r"C:\Users\Murodulla\Desktop\django-test-bot\audit\test-data\phase6-endpoints.json"
OUT = r"C:\Users\Murodulla\Desktop\django-test-bot\audit\test-data\phase6-probe.json"


def concrete(path):
    p = re.sub(r"<int:[^>]+>", "1", path)
    p = re.sub(r"<str:[^>]+>|<slug:[^>]+>|<path:[^>]+>|<uuid:[^>]+>|<[^>]+>", "x1", p)
    return p.replace("^", "").replace("$", "")


@override_settings(TELEGRAM_BOT_TOKEN="", GROQ_API_KEY="", REQUIRE_CHANNEL_SUBSCRIPTION=False)
class Probe(TestCase):
    def test_probe_all(self):
        cache.clear()
        subj = make_subject(); topic = make_topic(subject=subj)
        q = make_question(subject=subj, topic=topic)
        make_test_set(subject=subj, questions=[q])
        stu, _ = make_user("probe_student")
        tea, tp = make_user("probe_teacher"); tp.role = "teacher"; tp.save()
        clients = {"anon": APIClient(), "student": APIClient(), "teacher": APIClient()}
        clients["student"].force_authenticate(stu); clients["teacher"].force_authenticate(tea)
        for c in clients.values():
            c.raise_request_exception = False
        rows = [r for r in json.load(open(INV, encoding="utf-8")) if r["kind"] == "drf"]
        results = []
        with mock.patch("core.ai_client.ask_groq", return_value=None), \
             mock.patch("telegrambot.client.SESSION.request", side_effect=RuntimeError("network blocked")), \
             mock.patch("requests.sessions.Session.request", side_effect=RuntimeError("network blocked")), \
             mock.patch("core.background.submit", return_value=None):
            for r in rows:
                url = concrete(r["path"])
                for method in (r["methods"] or ["GET"]):
                    if method in ("PUT", "PATCH", "DELETE") and "IsSuperAdmin" in (r["perms"] or []):
                        pass
                    rec = {"path": r["path"], "method": method, "perms": r["perms"], "src": r["src"]}
                    for who, c in clients.items():
                        fn = getattr(c, method.lower())
                        try:
                            resp = fn(url, {}, format="json") if method != "GET" else fn(url)
                            rec[who] = resp.status_code
                        except Exception as e:  # noqa
                            rec[who] = f"EXC:{type(e).__name__}"
                    results.append(rec)
        json.dump(results, open(OUT, "w", encoding="utf-8"), indent=1)
        print("\nprobed", len(results))
