# Fix plan (from the 2026-11-06 audit)

This document is a plan only: no code has been changed. Source findings are in [09-final-report.md](09-final-report.md) and the linked phase reports. Fixing starts only after you say `FIX P0` / `FIX P1` (per `check-task.md`).

## Ground rules for every fix

1. **Test first.** Write a failing regression test, then fix, then run the whole suite. The reproducers in `audit/test-data/phase*_reproducers.py` are the starting point: each one is moved into `backend/tests/` with its assertion flipped.
2. **One finding (or one tight group) per commit.** Commit messages use the `fix(<area>): …` style, and each commit names its finding ID.
3. **Branching.** P0 hotfixes go on their own branch from `main` (`fix/p0-payment-callback`, `fix/p0-next-rce`), **not** on `feat/emerald-studio-redesign`: the backend on `main` is what production runs. P1 items go on `fix/audit-p1`, also from `main`. Afterwards this redesign branch is synced with `main`.
4. **Deploy** follows `AGENTS.md`, on the Contabo server in `/opt/ilmildizi`:
   - backend only: `docker compose up -d --build --no-deps web`
   - frontend only: `docker compose up -d --build --no-deps frontend`
   - both: `docker compose up -d --build --no-deps web frontend`

   Always followed by `docker compose exec nginx nginx -s reload`. The `web` container runs migrations on start, so no extra `exec migrate` is needed.
5. **No dependency bumps beyond those listed here.** Each bump gets its own commit, with `npm run build` and the full Django suite run after it.

## Wave 0 — Hotfix today (P0)

### W0.1 SEC-PAY-001 + ECON-006: lock down the Telegram payment callback
- **Files:** `backend/telegrambot/payment_review.py` (`handle_payment_callback`, `:185-290`); `backend/telegrambot/handlers.py` (`:413-427`, pass `chat_id` and `from` through unchanged).
- **Change:**
  1. Reject the callback unless `str(chat_id) in get_payment_channel_ids()` (`payment_review.py:30`).
  2. Reject it unless `str(from.id)` belongs to an admin. "Admin" means `Profile.telegram_id` of a superadmin or staff account (the same rule as `notify_admins`, `handlers.py:388-405`), or an optional `PAYMENT_REVIEWER_TELEGRAM_IDS` allow-list from the environment.
  3. On reject, call `answer_callback(…, "Ruxsat yo'q")` and log a warning (Telegram id only, no PII).
  4. Replace the read-then-save with an atomic claim: `Payment.objects.filter(pk=…, status='pending').update(status='approved', reviewed_at=…, admin_note=…)`. Only the request that wins the claim calls `apply_to_profile()`. Do the same for reject. This mirrors `panel/api.py:1500-1506`.
- **Migration:** none.
- **Tests** (new `backend/tests/test_payment_callback_security.py`):
  - callback from a private chat → still `pending`;
  - callback from the channel by a non-admin → `pending`;
  - callback from the channel by an admin → `approved`, premium granted;
  - two approve callbacks → premium duration added once;
  - approve after reject → no change.
- **Risk / compatibility:** any reviewer who is not a superadmin or staff account with a linked Telegram ID can no longer approve. Before deploying, confirm the real reviewers' `telegram_id` values, or set the allow-list env variable.
- **Deploy:** `web`. **Rollback:** previous image, no data impact.
- **Follow-up (needs your decision):** find payments approved by non-admins. Query `Payment.objects.filter(status='approved', admin_note__contains='tomonidan tasdiqlandi')` and compare the `@username` in each note with the real admin list. Done read-only first; any reversal is your call.

### W0.2 PROD-001: Next.js RCE
- **Files:** `frontend/package.json` and `package-lock.json` (`next` → latest 16.x ≥ 16.4.5). Check `node_modules/next/dist/docs/` for breaking notes (per `frontend/AGENTS.md`).
- **Stop-gap if the upgrade is blocked:** remove `'image/avif'` from `images.formats` in `frontend/next.config.ts:13`.
- **Tests:** `npm run typecheck`; `npm run build`; `npm audit --omit=dev` shows no critical issue for `next`; smoke-test the pages in the browser (landing, login, dashboard, tests, feed images).
- **Deploy:** `frontend`. **Rollback:** previous image.

## Wave 1 — Before the next release (P1)

| # | Finding(s) | Files | Change | Migration | Regression test | Risk / note |
|---|---|---|---|---|---|---|
| W1.1 | PROD-002 | `.dockerignore` | Add `**/.env`, `**/.env.*` (keep `!**/.env.example`), `**/db.sqlite3*`, `**/media/`, `**/staticfiles/`, `**/backups/`, `**/logs/` | — | CI job: `docker build` of a `FROM scratch` probe from the repo root (same as Phase 8) fails if `.env` or `db.sqlite3` is present | Then rebuild `web`. **Rotate secrets** if any image ever left the server: `SECRET_KEY` (logs out everyone, invalidates parent payment links), bot token, webhook secret, Groq key. Your decision. |
| W1.2 | PROD-007 | `backend/requirements/base.txt` | `Pillow>=13.0.0` (pinned exact), `djangorestframework==3.18.2+`, `Django==6.1.x` latest patch | — | Full suite; upload screenshot test; story PNG render (`tests_app/story.py`) | Pillow major bump: check deprecated APIs in `story.py` and the PDF importer |
| W1.3 | AUTH-001 | `backend/accounts/utils.py:67-76` | Client IP = `REMOTE_ADDR` when there is no trusted proxy, else `X-Real-IP` (nginx sets it, `app_routes.inc:97`). Add a per-username global failure cap (for example 30 per hour) independent of IP. | — | Rotating-XFF test expects 429; global-cap test | Users behind one NAT share the IP bucket, so the per-username cap matters more |
| W1.4 | AUTH-002 (+API-007) | `backend/config/settings.py` (`INSTALLED_APPS += token_blacklist`, `ROTATE_REFRESH_TOKENS=True`, `BLACKLIST_AFTER_ROTATION=True`, `REFRESH_TOKEN_LIFETIME=14d`); `backend/accounts/api.py` (new `POST /api/auth/logout/` that blacklists the refresh); `backend/panel/api.py:742-751` (on admin password reset, blacklist all of that user's outstanding tokens); impersonation tokens issued with a short lifetime and no refresh | **Yes** (`token_blacklist` app tables) | Logout → refresh 401; password reset → old refresh 401; rotated refresh reused → 401 | `frontend/src/lib/api-client.ts:83-86` already stores a rotated refresh. Add a logout call in `auth-store.ts:111`. Concurrent tabs refreshing at the same time are handled by the existing dedupe in a single tab; across tabs the second gets 401 and falls back to login (acceptable, or add a short grace window). Deploy `web` + `frontend`. |
| W1.5 | ECON-001, LOOP-005, LOOP-006 | `backend/learning_loop/views.py:438-548` | `from_stage` required (400 when missing). Advancing from STAGE_2 needs every sprint question answered (409 otherwise). STAGE_3 cleanup counted from server answers (`revenge`) instead of the client's `cleared_count`. STAGE_4 pays 0 when the arena has no answers. Optionally scale coins by `player_correct`. | — | Zero-answer cycle → no coins (reproducer flipped); full cycle unchanged (existing `test_reward_economy` loop tests) | The current frontend always sends `from_stage` and answers through `/loop/answer/`. The loop UI must show "answer all questions" on 409. FE-003 means the loop UI is not mounted on this branch anyway. |
| W1.6 | ECON-003 | `backend/accounts/models.py:168-193` (`update_streak` → `save(update_fields=['streak', 'last_active_date'])`); `backend/premium/models.py:106-121` (`apply_to_profile` → `update_fields`) | — | Stale-instance reproducers flipped (coins and premium survive); add a Postgres two-thread variant to `test_concurrency_postgres.py` | Check `consume_freezes` (`shop/services.py:182`), which also mutates the profile, and grep other full `profile.save()` calls in request paths. Keep it minimal. |
| W1.7 | GRADE-001…005, ECON-007 | `backend/tests_app/services/grading.py:34-165` | Rewrite `is_deterministic_match` as a token-based matcher. (1) Normalise: keep numeric punctuation; full Cyrillic→Latin (also GRADE-006). (2) Exact or phonetic equality. (3) Numbers and roman numerals: the set of numeric tokens must be equal. (4) Letter tokens: fuzzy per token, threshold scaled by length (≥ 0.85; none under 4 characters). (5) Alternatives split on `/ ; ( )` only, each compared with the same rules, never by substring. (6) Reject answers longer than 3× the reference or containing several candidates. Anything not clearly matched goes to Groq (unchanged). | — | Load `audit/test-data/grading-cases.json` as a parametrised test: 0 false positives for the `open_written` grader; every typo and normalisation case still True. Keep `test_tests_api.py:80-90` passing. | More items reach Groq, so cost and latency rise (watch `AIUsageLog`). Decide whether to re-grade past paid-mock attempts (separate command, your call). |

**Wave 1 deploy:** `web` + `frontend` together (W1.4 touches both), after W1.1 so the new image is clean.

## Wave 2 — Next sprint (P2)

| Group | Findings | Files | Main change | Migration |
|---|---|---|---|---|
| Telegram login | AUTH-005, AUTH-006, AUTH-012, AUTH-007 | `backend/accounts/utils.py:403`, `backend/accounts/api.py:186-252`, `backend/config/settings.py:311-330` | Max age 10 min; 503 when the token is empty; `TELEGRAM_BOT_TOKEN` in the `DEBUG=False` guard; `json.loads` in try → 400; drop the username-based merge | — |
| WebSocket | AUTH-004, AUTH-011, AUTH-013 (WS) | `backend/config/ws_auth.py`, `backend/config/asgi.py`, `deploy/docker/app_routes.inc:79-90` | `is_active` check; `AllowedHostsOriginValidator`; `access_log off` on `/ws/` (or a one-time WS ticket endpoint) | — |
| Throttling / abuse | AUTH-008, AUTH-009, LOOP-007 | `backend/config/settings.py` (anon + user throttles, `NUM_PROXIES=1`), `backend/accounts/api.py`, `backend/accounts/referrals.py`, `backend/learning_loop/views.py:377` | Throttle scopes for auth endpoints; referral bonus paid after the referee's first finished test, with a daily cap; `quiz_answer` throttle on the loop answer | — |
| Streak | ECON-002 | `backend/dashboard/api.py:22`, `backend/accounts/api.py:49` | Remove `update_streak()` from home and login; keep it on learning actions | — |
| Durable caps | ECON-005, QA-004/ECON-004 | `backend/core/reward_caps.py` + new model `RewardClaim(profile, source, day, item, count)` | DB-backed `claim_daily_reward` / `claim_once` using `timezone.localdate()`; the cache stays only as a fast path | **Yes** (new table) |
| Reels | API-001, FE-001, FE-004 | `backend/learning/api.py:873-916`, `frontend/src/app/reels/page.tsx:470`, `:481-482` | `profile.streak`; unknown reel → 404; frontend sends `quiz_question`; show only server XP | — |
| Classroom mock | API-002 | `backend/tests_app/api.py:308-360` (+ catalogue query) | Refuse or hide a `TestSet` used by a non-free `MockTest` unless the caller has class access inside the mock window | — |
| Frontend resilience | FE-002, LOOP-004 | `frontend/src/lib/api-client.ts:57-130`, `frontend/src/hooks/useContinuousLoop.ts:565-611` | Log out only on 400/401 from refresh; no optimistic loop transitions (show retry) | — |
| Branch | FE-003 | `frontend/src/app/dashboard/page.tsx` | Re-mount `MagneticLoopCard` in the pastel dashboard, or confirm removal is intended | — |
| Grading AI | GRADE-006 (done in W1.7), GRADE-009 | `backend/tests_app/services/grading.py:13-31`, `backend/growth/ai_grader.py:84-104` | Delimit student text; "treat as data"; remove the 70% rule; canary tests (live Groq run needs your OK) | — |
| Test isolation | QA-003 | `backend/config/settings.py:21`, new `backend/tests/__init__.py` setup or test settings | Do not load `.env` under `manage.py test` (or blank the outbound secrets); global `requests` mock; remove the hardcoded `ADMIN_TELEGRAM_CHAT_ID` fallback (`settings.py:98`) and `DEFAULT_PAYMENT_CHANNEL_ID` (`payment_review.py:27`) → read from env only | — |
| Infra | PROD-003, PROD-004, PROD-005 | `Dockerfile`, `deploy/scripts/backup.sh`, `backend/config/settings.py:237-245` | Non-root user; off-site encrypted backup plus a documented restore drill; `CONN_MAX_AGE=0` + `OPTIONS={'pool': True}` (test under load first) | — |

## Wave 3 — Backlog (P3)

- **Tests:** QA-001 rewrite `learning/tests.py:StudyCompleteTests` (needed for green CI; can go in Wave 1). QA-002 add `tblib` to `requirements/dev.txt`.
- **Grading leftovers:** GRADE-007 (`models.py:660`); GRADE-008 / API-005 (`growth/views.py:30-40`: use `reference_answer`, ignore any client reference when `question_id` is given).
- **Loop:**
  - LOOP-001: no multiplier when arena ⊆ sprint.
  - LOOP-002 / API-003: one global "JSON body must be an object" guard (DRF parser subclass or a decorator).
  - LOOP-003: deduplicate existing rows, then `UniqueConstraint(user, date, cycle_number)`, and add `-id` to the restart ordering. **Migration needed;** run the dedup data migration first.
- **API:** API-004 (length validation), API-006 (generic error messages), API-007 (in W1.4), API-008 (participant check on room state).
- **Missions:** FE-005, minimum answered or correct share in `advance_missions(profile, 'test')` (`tests_app/api.py:944`).
- **Infra / admin:**
  - PROD-006: `${POSTGRES_PASSWORD:?}`.
  - PROD-008: `flock` in cron.
  - PROD-009: admin IP allow-list or 2FA plus nginx `limit_req`.
  - PROD-010: remove `_ensure_initial_ai_logs`, then a one-off cleanup of the seeded rows (your decision).
  - AUTH-013: tunnel hosts only when `DEBUG`.
  - Minor: duplicate TZ settings, nginx `server_tokens off`.
  - Move `shadcn` to `devDependencies`.

## CI additions (with Wave 1)

1. `pip-audit -r backend/requirements/prod.txt` and `npm audit --omit=dev --audit-level=high` (fail on high or critical).
2. A Postgres service job that runs `tests.test_concurrency_postgres` plus the new race tests.
3. The `.dockerignore` probe job (W1.1).
4. Triggers on PRs to any branch, so this redesign branch also gets checked before merge.

## Order and estimates

| Step | Content | Rough size |
|---|---|---|
| Today | W0.1 (+ the read-only check for wrongly approved payments), W0.2 | ~0.5 day |
| This week | W1.1 → W1.2 → W1.3 → W1.6 → W1.5 → W1.4 → W1.7, plus QA-001 | ~3–4 days |
| Next sprint | Wave 2 | ~1 week |
| Backlog | Wave 3 | as capacity allows |

## Decisions needed from you before fixing

1. **W0.1:** which Telegram accounts may approve payments? Superadmin/staff profiles with `telegram_id`, an explicit allow-list, or both.
2. **W1.1:** rotate secrets? Has any `web` image ever left the server (`docker save`, a registry, a backup of `/var/lib/docker`)?
3. **W1.4:** refresh lifetime (suggested 14 days) and whether a password reset should force logout on every device.
4. **W1.7:** re-grade past `open_written` answers in paid classroom mocks after the grader fix, or not?
5. **PROD-010 / payments review:** delete the seeded fake AI log rows? Review past Telegram approvals?
