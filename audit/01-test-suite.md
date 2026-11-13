# PHASE 1 — Django test suite and test infrastructure

Run date: 2026-11-06. Baseline: branch `feat/emerald-studio-redesign`, HEAD `8454d8f`, working tree with 63 uncommitted entries (same as Phase 0 plus `audit/`). No code was changed.

## 1. Environment (no secrets)

| Item | Value |
|---|---|
| Python | 3.12.10 (Windows 11) |
| Django | 6.1 |
| Command | `cd backend && python manage.py test --noinput -v 2` |
| DB | SQLite in-memory test DB (`file:memorydb_default?mode=memory&cache=shared`); `DATABASE_URL` not set, so production Postgres is unreachable |
| Cache / Channels | LocMem / InMemoryChannelLayer (`REDIS_URL` not set) |
| Outbound secrets | Blanked for every run via env vars that take precedence over `.env` (`load_dotenv` does not override, `config/settings.py:21`): `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `PAYMENT_CHANNEL_ID`, `ADMIN_TELEGRAM_CHAT_ID`, `TELEGRAM_CHANNEL_ID`, `GROQ_API_KEY`, `OLLAMA_API_URL`, `PREMIUM_CARD_NUMBER` |
| Celery | Not used in the project |
| Coverage / tblib | Not installed; not installed during the audit (no dependency changes) |

Pre-checks: `manage.py check` → "System check identified no issues". `makemigrations --check --dry-run` → "No changes detected" (the untracked `learning/0018_post_report_reasons.py` matches the models).

## 2. Results

| Run | Tests | Result | Time | Log |
|---|---:|---|---:|---|
| Serial, full | 560 | **FAILED (failures=1, skipped=6)**, 553 passed | 337 s | `test-data/phase1-test-run.log` |
| Shuffled (`--shuffle 20261106`) | 560 | Same: same 1 failure, 6 skipped | 335 s | `test-data/phase1-test-shuffle.log` |
| Parallel 4, full | — | **Crashed**: `TypeError: cannot pickle 'traceback' object` | 12 s | `test-data/phase1-test-parallel.log` |
| Parallel 4, without `learning` app (`tests battles panel teacher`) | 555 | **OK (skipped=6)** | 88 s | `test-data/phase1-test-parallel-nolearning.log` |
| Reward group (`test_reward_economy`, `test_rewards_b2b_safety`, `test_anti_cheat`, `test_streak_freeze`, `test_shop`) | 54 | OK | 27 s | console |
| Auth group (`test_auth_api`, `test_p0_security`, `test_registration`, `test_roles_permissions`, `test_telegram_webhook`) | 46 | OK | 31 s | console |
| Learning/loop group (`test_audit_loop_battle_stress`, `test_p1_fixes`, `test_release_fixes`, `test_quiz_answer_security`, `test_revision`) | 67 | OK | 49 s | console |

Skipped (6): all in `tests/test_concurrency_postgres.py` (`skipUnless(connection.vendor == 'postgresql')`, line 44): parallel loop finish, sprint answer, mission reward, shop purchase, lead reward, campaign lead limit. **Race-condition protection is therefore not verified by this run.** Verifying it needs a local Postgres (docker `postgres:16`); planned for Phase 3/4, needs your OK to start a container.

## 3. Failures by cause

### QA-001 — Stale test: `learning.tests.StudyCompleteTests.test_standard_session_rewards_25xp_10coins_and_streak`
- Severity P3, **CONFIRMED** (fails alone, in the module, serial and shuffled → deterministic, not isolation or flaky).
- `backend/learning/tests.py:22` — `AssertionError: 0 != 25`.
- Cause: commit `e48af8e` (2026-11-04, "server-verified loop … close reward farms") changed `study_session_complete_api` (`backend/learning/api.py:571`) so duration comes from a server-recorded start (`STUDY_SESSION_KEY`, lines 549, 590-594) and pays nothing below `STUDY_MIN_MINUTES = 5` (line 550). The test posts `complete` with no `start`, so 0 XP is now the **correct** anti-cheat result. Product is fine; the test is outdated.
- Side effect: `test_client_values_are_clamped` (line 29) and `test_daily_cap_blocks_farming` (line 34) in the same class still pass but now pass trivially (every response is 0), so they no longer test clamping or the daily cap. The current behaviour is properly covered by `tests/test_reward_economy.py:234-255` (`StudySessionTests`, uses `mock.patch` on `timezone.now`).
- Fix: rewrite `learning/tests.py:StudyCompleteTests` to call `/study/start/` and patch `learning.api.timezone.now` (or delete it as a duplicate of `StudySessionTests`).

### QA-002 — Parallel runner crashes on any failure
- Severity P3, **CONFIRMED**. `--parallel 4` aborts the whole run with `TypeError: cannot pickle 'traceback' object` once a test fails (here QA-001), because `tblib` is not installed. Without failing tests, parallel works (555 OK in 88 s vs 337 s serial).
- Impact: dev/CI only. CI runs serially (`.github/workflows/ci.yml`), so no CI impact today.
- Fix: add `tblib` to `requirements/dev.txt` if parallel runs are wanted.

No product bugs, isolation problems or flaky tests found in this run.

## 4. Test-infrastructure risks

### QA-003 — Tests reach real outbound code paths; with the default `.env` they could message the real admin channel
- Severity P2, **LIKELY** (deliberately not reproduced: it would send a real Telegram message).
- `send_payment_review_notification` (`backend/telegrambot/payment_review.py:84`) is called **without a mock** from `premium/api.py:89-90` and `:173-174` in `tests.test_battles_shop_premium_api.PremiumApiTests.test_payment_screenshot_requires_auth_header_and_ownership` and `tests.test_growth_analytics.ParentCheckoutTests.test_open_payments_are_capped`. The log shows `channels=['-1004317888253']`: the fallback chat id hardcoded in `backend/config/settings.py:98`, used even with `ADMIN_TELEGRAM_CHAT_ID` blank.
- In this run the token was blank, so `telegrambot/client.py:44,116` skipped the send. But `settings.py:21` loads `backend/.env`, which defines `TELEGRAM_BOT_TOKEN`. A developer who runs `python manage.py test` normally would send a fake "new payment" photo/message with real buttons to the real payment channel.
- Network evidence: tests using `override_settings(TELEGRAM_BOT_TOKEN='test-token')` (`tests/test_channel_subscription.py:16`) made real HTTPS calls to `api.telegram.org` (log: `setChatMenuButton failed: {'ok': False, 'error_code': 404 ...}`). Harmless with a fake token, but it means the test suite is not network-isolated.
- Fix: in tests, force `TELEGRAM_BOT_TOKEN=''`, `GROQ_API_KEY=''`, etc. (test settings or `setUpModule`), or skip `load_dotenv` under `manage.py test`; mock `telegrambot.client.SESSION` globally; remove the hardcoded fallback chat id. Regression: a test that fails if `requests.Session.request` is called.

### QA-004 — Date keys use `date.today()` instead of `timezone.localdate()`
- Severity P3 here (economy impact is assessed in Phase 3), **CONFIRMED in code**: `backend/core/reward_caps.py:48`, `backend/learning/api.py:169`, `backend/learning/services.py:29`. `TIME_ZONE='Asia/Tashkent'`, `USE_TZ=True`. `date.today()` uses the OS/container clock (UTC in `python:3.12-slim`), so daily caps reset at 05:00 Tashkent time, not at midnight, and differ from code that uses `timezone.localdate()`. Tests pass because the test clock and the cap use the same source; no test covers the boundary.

## 5. Assertion quality (static review)

- Business-outcome assertions are common in the reward, classroom, CEFR and loop suites (XP/coin deltas, DB state after `refresh_from_db`, idempotent second call).
- Mostly status-code tests: `tests/test_telegram_webhook.py` (7 tests, 6 of 7 asserts are `status_code`), `tests/test_essay_ai_cap.py` (2 tests, 4 asserts), `tests/test_optimization.py` (6 tests, 6 asserts).
- Gaps (no test found by grep):
  - **Telegram Mini App login** (`accounts/api.py:186`, `accounts/utils.py:406` `verify_telegram_webapp_data`): 0 tests for HMAC, `auth_date` freshness or replay.
  - Google login (`accounts/api.py:130`): no test.
  - Open-answer grading: only `tests/test_tests_api.py:80` (a handful of `is_deterministic_match` cases); `grade_open_answers` is always mocked in `test_classroom_attempt.py`; `growth/ai_grader.py` is untested. Phase 2 covers this.
  - WebSocket consumers: only `battles/tests.py` and `panel/tests.py`.
- Determinism: 15 test modules use `timezone.now`/`date.today`/`random`; only 1 freezes or patches time. 20 places call `cache.clear()`. The shuffle run showed no order dependence.

## 6. Coverage

Not measured: `coverage` is not installed, and installing packages is outside the audit rules. If you want module coverage, allow `pip install coverage tblib` (local venv only, `requirements` unchanged).

## 7. Blockers / decisions for you

1. Local Postgres container for the 6 skipped concurrency tests (Phase 3/4).
2. Optional `coverage` + `tblib` install (local only).

## 8. Summary (10 lines)

- 560 tests, 553 pass, 1 fail, 6 skip; result is deterministic (shuffle gives the same result).
- The 1 failure is a stale test (QA-001); the anti-cheat behaviour behind it is correct and covered elsewhere.
- Parallel mode only crashes because `tblib` is missing (QA-002); 555 tests pass in parallel.
- Reward, auth and learning groups each pass on their own.
- Postgres race tests are skipped: concurrency safety is **unverified**.
- Test runs are not network-isolated; with the default `.env` two tests could post to the real payment channel (QA-003).
- `date.today()` is used for daily caps (QA-004); impact goes to Phase 3.
- No tests for Telegram/Google login; open-answer grading is barely tested.
- Inputs for Phase 2: `backend/tests_app/services/grading.py`, `backend/tests_app/models.py:653`, `backend/growth/ai_grader.py`, `backend/tests_app/services/answering.py`, `backend/classroom/grading.py`, `backend/tests/test_tests_api.py:80`.
