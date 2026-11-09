# PHASE 0 — Repository map and audit scope

Audit date: 2026-11-06. Read-only phase: no code, migrations or tests were run or changed.

## 1. Repository state (baseline)

| Item | Value |
|---|---|
| Path | `C:\Users\Murodulla\Desktop\django-test-bot` |
| Branch | `feat/emerald-studio-redesign` (not `main`) |
| HEAD | `8454d8f905d909600df56525cef7ed2f8c76f9a7` ("feat(ui): pastel redesign of login and register") |
| Working tree | 62 changed entries: ~52 modified tracked files (mostly frontend UI, plus `backend/learning/api.py`, `backend/learning/models.py`, `backend/tests/test_release_fixes.py`) and 10 untracked (incl. `backend/learning/migrations/0018_post_report_reasons.py`, several new frontend components, `check-task.md`, `IlmIldizi_7_kunlik_Claude_Code_reja.md`) |

**Audit target = working tree (uncommitted changes included).** Production (`main` on Contabo) may differ from this branch; findings must be checked against `main` before claiming they affect production. The uncommitted migration `learning/0018` means the local schema is ahead of HEAD.

## 2. Stack

- Backend: Python 3.12.10 (local), Django 6.1, DRF 3.18.0, SimpleJWT 5.5.1, Channels 4.1.0 + daphne, nh3 sanitizer, google-auth. Pins: `backend/requirements/{base,dev,prod}.txt` (`requirements.txt` → `prod.txt`).
- Production extras: psycopg 3.2.3, redis 5.2.1, channels-redis, gunicorn 23 + uvicorn worker, sentry-sdk (optional via `SENTRY_DSN`).
- Frontend: Next.js (App Router), TypeScript, in `frontend/`. Scripts: `build`, `typecheck` only — **no unit/E2E test framework** (no jest/vitest/playwright/cypress in `package.json`).
- No Celery. Background work: `core/background.py`, management commands, systemd timers (`deploy/systemd/*streak-reminder*`, `*backup*`).

## 3. Config and infra locations

| What | Where |
|---|---|
| Settings | `backend/config/settings.py` (525 lines; single file, env-driven, `load_dotenv(BASE_DIR/'.env')` at line 21) |
| URLs | `backend/config/urls.py` (all API under `/api/...`, Telegram webhook `/telegram/webhook/`, admin `/admin/`, `ckeditor5/`) |
| ASGI / WS auth | `backend/config/asgi.py`, `backend/config/ws_auth.py` (JWT via `?token=` query param) |
| Health | `backend/config/health.py` (`/healthz`, `/api/health/`) |
| DB switch | `settings.py:237-253` — `DATABASE_URL` → Postgres, else SQLite `backend/db.sqlite3` |
| Cache / Channels | `settings.py:262-303` — `REDIS_URL` → Redis, else LocMem / InMemoryChannelLayer |
| Prod guard | `settings.py:305-330` — refuses DEBUG=False without DATABASE_URL/REDIS_URL/real SECRET_KEY |
| DRF / JWT | `settings.py:448-475` — default `IsAuthenticated`, auth class `accounts.jwt_auth.AuditAwareJWTAuthentication`, throttle scopes only `quiz_session`, `quiz_answer`; access 60 min, refresh 30 days, `ROTATE_REFRESH_TOKENS: False` |
| Docker | `Dockerfile` (root, python:3.12-slim, no `USER` directive seen), `frontend/Dockerfile`, `docker-compose.yml` (nginx, frontend, web, db postgres:16, redis), `.dockerignore` |
| Nginx | `deploy/docker/nginx.conf`, `deploy/docker/app_routes.inc`, `deploy/nginx/ilmildizi.conf` |
| Deploy docs | `deploy/DEPLOY_DOCKER.md`, `deploy/DEPLOY_VPS.md`, `docs/stabilization/DEPLOY_CHECKLIST.md` |
| Backup | `deploy/scripts/backup.sh`, `deploy/systemd/ilmildizi-backup.{service,timer}` |
| CI | `.github/workflows/ci.yml` — on push/PR to `main`: `makemigrations --check`, `manage.py test --noinput` (SQLite + LocMem, DEBUG=True), frontend `typecheck` + `build` |
| Prior audit artifacts | `STUDENT_AUDIT.md`, `docs/stabilization/permission-matrix.md`, `backend/tests/RESULTS.md` (stale: 67 tests, Django 6.0.5) — reference only, not trusted as evidence |

## 4. Django apps (backend/)

| App | Lines (*.py top level) | Migrations | Role |
|---|---:|---:|---|
| accounts | 1627 | 12 | Profile, login/register, Google + Telegram login, JWT, referrals |
| core | 2434 | 7 | rewards, reward caps, missions, achievements, AI client, HTML sanitize |
| tests_app | 3837 (+services/) | 37 | tests, attempts, CEFR exam, open-answer grading, importers |
| learning | 3257 | 18 (+1 untracked) | feed/posts, revision, notifications |
| learning_loop | 946 | 3 | Daily Learning Loop state machine |
| sprint | 935 | 3 | Sprint questions/answers, mistake explain/revenge |
| growth | 1238 | 1 | AI grader, arena views |
| battles | 1032 | 5 | PvP battles (WebSocket consumers) |
| premium | 674 | 7 | plans, promo codes, Payment (manual card transfer + screenshot) |
| shop | 485 | 3 | coin shop, streak freeze |
| classroom | 1856 | 3 | paid classes, mock grading, payments ledger |
| teacher | 1661 | 3 | teacher panel API, AI importer |
| panel | 7280 | 8 | super-admin API, broadcasting, admin WS notifications, maintenance middleware |
| telegrambot | 1742 | 2 | webhook, handlers, payment review, retention/streak reminders |
| analytics, dashboard, leaderboard, games, b2b_ads | 950 / 389 / 247 / 343 / 534 | 3/0/0/5/5 | analytics, dashboard API, leaderboard cache, mini-games, ads |

## 5. Domain → entry point map

| Domain | Primary files / symbols |
|---|---|
| Auth / JWT | `accounts/api.py` (`login_api:64`, `register_api:96`, `google_login_api:130`, `telegram_login_api:186`, `me_api:274`), `accounts/jwt_auth.py:15`, `accounts/api_urls.py`, `config/ws_auth.py:23` |
| Telegram login / Mini App | `accounts/utils.py:406` `verify_telegram_webapp_data`; webhook `telegrambot/urls.py:10` → `telegrambot/views.py`; handlers `telegrambot/handlers.py` |
| User / profile / ownership | `accounts/models.py:7` `Profile`; `accounts/permissions.py`; `classroom/permissions.py` |
| Tests / attempts / grading | `tests_app/api.py`, `tests_app/cefr_api.py`, `tests_app/services/answering.py`, `tests_app/services/grading.py` (`normalize_text:34`, `normalize_phonetic:64`, `is_deterministic_match:77`, `grade_open_answers:180`), `tests_app/models.py:653` `normalize_gap_answer`; also `growth/ai_grader.py` (`calculate_similarity:25`, `evaluate_open_question:36`), `classroom/grading.py:163` |
| Sprint | `sprint/views.py` (`SprintQuestionsAPIView:269`, `SprintAnswerAPIView:362`, `ResolveRevengeMistakeAPIView:227`), `sprint/services.py` |
| Learning Loop | `learning_loop/views.py` (`CurrentLoopView:317`, `LoopAnswerView:377`, `AdvanceStageView:427`, `ShareLoopPostView:583`, `RestartCycleView:635`), `learning_loop/models.py` |
| XP / coins / streak / missions | `accounts/models.py` (`add_xp:115`, `add_coins:154`, `update_streak:168`), `core/rewards.py` (`award_profile_rewards_atomic:99`, `open_daily_chest:135`, `roll_test_lucky_bonus:302`), `core/reward_caps.py` (`claim_daily_reward:45`, `claim_once:58`, `award_capped_xp:63`), `core/missions.py:15`, `shop/services.py:182` `consume_freezes` |
| Premium / payments | `premium/api.py` (`CheckoutAPI:63`, `ParentCheckoutAPI:120`, `payment_status_api:190`, `PaymentScreenshotAPI:205`), `premium/models.py:67` `Payment` (sets `is_premium` at ~line 119), `telegrambot/payment_review.py`, `accounts/models.py:49,212,220` premium flags. **No online payment provider (Payme/Click/Stripe) found** — flow is manual card transfer + screenshot + admin review. |
| Revision / smart repetition | `learning/` (`api.py`, `services.py`), `tests_app/services/review.py`, `sprint` revenge-mistake |
| WebSocket / Channels | `config/asgi.py:34`, `battles/routing.py` (`ws/battles/matchmaking|lobby|<id>`), `battles/consumers.py`, `panel/routing.py` (`ws/panel/notifications/`), `panel/consumers.py` |
| Admin / staff | Django admin `/admin/`, `panel/api.py` + `panel/api_urls.py`, `panel/middleware.py` (`CurrentUserMiddleware`, `MaintenanceModeMiddleware`), `teacher/api.py` |

## 6. Tests

- Framework: Django `TestCase` (unittest). Command used by CI: `python manage.py test --noinput` from `backend/`.
- Files: 54 modules in `backend/tests/` + `battles/tests.py`, `learning/tests.py`, `panel/tests.py`, `teacher/tests.py`; ~560 `def test_` functions in total (static count, not a run result).
- Helpers: `tests/factories.py`, `tests/loop_helpers.py`.
- Notable groups already present: `test_auth_api`, `test_p0_security`, `test_quiz_answer_security`, `test_anti_cheat`, `test_reward_economy`, `test_rewards_b2b_safety`, `test_audit_loop_battle_stress`, `test_telegram_webhook`, `test_roles_permissions`, `test_revision`, `test_streak_freeze`, `test_concurrency_postgres` (skipped unless DB vendor is PostgreSQL, line 44).
- 23 test modules use `mock`/`patch`. Frontend: no automated tests.

## 7. Test environment safety (pre-Phase-1 findings)

- Local `backend/.env`: `DEBUG=True`, **no `DATABASE_URL` and no `REDIS_URL`** → tests use SQLite test DB and LocMem cache. Production Postgres is not reachable from this config. ✔
- **Risk:** `settings.py:21` loads `backend/.env` in tests too, and `.env` defines real-looking `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `PAYMENT_CHANNEL_ID`, `ADMIN_TELEGRAM_CHAT_ID`, `GROQ_API_KEY`, `OLLAMA_API_URL` (values not inspected/recorded). Any test path that is not mocked could send a real Telegram message or AI request. Also `settings.py:98` hardcodes a fallback `ADMIN_TELEGRAM_CHAT_ID`. **Phase 1 must run tests with these variables blanked** (e.g. env override to empty strings) or confirm every outbound call is mocked.
- Postgres-only concurrency tests will be skipped on SQLite; race-condition evidence needs a local Postgres (docker) — to be decided in Phase 1/3.

## 8. Audit scope

In scope: backend `backend/**` (all 19 apps), WebSocket consumers, Telegram webhook/login, premium/manual payment flow, Docker/compose/nginx/CI config, frontend API client (`frontend/src/lib/api-client.ts`, `auth-store.ts`, `jwt.ts`, `ws-client.ts`, `telegram.ts`) and pages calling reward/test/loop endpoints.

Out of scope / not possible here: production server, real Telegram users, real payments, production DB/backups (only config review), load/stress against production.

## 9. Not done in Phase 0 (by design)

- No tests, `manage.py check` or migrations executed.
- `.env` values not read (names only); no secrets recorded.
- Endpoint inventory, permission matrix and line-level findings deferred to Phases 5–6.
- `main` vs. current branch diff for backend not yet compared.

## 10. Inputs for Phase 1

`backend/config/settings.py`, `.github/workflows/ci.yml`, `backend/tests/*`, `*/tests.py`, `backend/requirements/dev.txt`; decide env override for Telegram/AI secrets; optionally start local Postgres for `test_concurrency_postgres`.
