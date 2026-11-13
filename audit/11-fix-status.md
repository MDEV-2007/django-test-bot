# Fix status (2026-11-06)

This file tracks how the audit findings were handled.

- **Branches:**
  - P0 fixes are on `fix/p0-security`.
  - Everything else is on `fix/audit-remaining`, which is branched from `fix/p0-security` and includes it.
  - Worktree: `C:\Users\Murodulla\Desktop\django-test-bot-p0`.
- **Base:** `origin/main` @ `b294fa0`.
- **Not touched:** the redesign branch `feat/emerald-studio-redesign`.

Every fix has a regression test in `backend/tests/`, except the infra and frontend-only items, which are verified by build or probe.

## Fixed

| Finding | Severity | Fix | Proof |
|---|---|---|---|
| SEC-PAY-001, ECON-006 | P0 | The payment callback is accepted only from the payment channel and only from a reviewer. The status change is an atomic claim. | `test_payment_callback_security.py` (11) |
| PROD-001 | P0 | `next` upgraded to 16.4.5 | build + `npm audit` |
| PROD-002 | P1 | `.dockerignore` uses `**/` patterns, so `.env`, the DB, media and backups never reach the image | Docker context probe locally + new CI job |
| PROD-007 | P1 | Django 6.1.3, Pillow 13.0.0, DRF 3.18.3 | full suite on the new versions |
| PROD-003 | P2 | Non-root `app` user. The entrypoint hands volumes to `app`, then drops privileges with `setpriv`. | `docker run … id` → `uid=999(app)`; writing to media works |
| AUTH-001 | P1 | Client IP comes from `X-Real-IP` or the last XFF hop. Added a per-username cap of 30 per hour. | `test_auth_hardening.py` |
| AUTH-002, API-007 | P1 | `token_blacklist`, refresh rotation (14 days), `/api/auth/logout/` (one device or all). Password reset and block revoke all sessions. Impersonation lasts at most 1 hour. | `test_auth_hardening.py` |
| AUTH-004 | P2 | WebSocket rejects inactive users and revoked tokens (also fixed a `NameError` on bad tokens) | `test_auth_hardening.py` |
| ECON-001, LOOP-005, LOOP-006, LOOP-002 (loop) | P1/P3 | The loop pays only when every sprint and arena question has an answer. The chest opens only after a paid cycle. Cleanup is counted on the server. `from_stage` is required. A list body returns 400. | `test_economy_hardening.py` |
| ECON-003 | P1 | `update_streak` and `apply_to_profile` write only their own fields (`update_fields`, locked row) | `test_economy_hardening.py` |
| LOOP-001, LOOP-003, LOOP-007 | P3 | No combo when arena questions are reused. Creating the first loop is serialised. Restart order is fixed. The loop answer is throttled. | `test_economy_hardening.py` |
| GRADE-001…006, ECON-007 | P1/P2 | Token-based deterministic grader: exact numbers and roman numerals, strict fuzzy per word, no substring matching, no "shotgun" answers, Cyrillic → Latin | `test_open_answer_grading_cases.py` (all 120 audit cases: 0 false positives) |
| GRADE-007 | P3 | The gap grader keeps currency symbols and treats `-` as a space | same file |
| GRADE-008, API-005 | P3 | The growth grader uses the deterministic matcher and the question's `reference_answer`. The client's reference is ignored. There is no 0.70 fallback. | same file |
| GRADE-009 | P2 | Student text is fenced in `<javob>` with a "treat as data" rule. The 70% leniency rule is removed from the prompt. | unit test on the prompt (not tested against live Groq) |
| ECON-002 | P2 | Login and dashboard no longer bump the streak | `test_rewards_p2.py` |
| ECON-004, ECON-005, QA-004 | P2/P3 | Daily caps and "once" claims are stored in the DB (`core.RewardClaim`, migration `core/0009`) by Tashkent date | `test_rewards_p2.py` |
| API-001, FE-001, FE-004 | P2/P3 | Reels quiz: `streak` field fixed, unknown reel → 404, message reflects the real XP. Reel creation accepts `question` and `quiz_question`, and the UI sends `quiz_question`. The UI shows only the XP the server gave. | `test_rewards_p2.py` + build |
| API-002 | P2 | Test sets of paid classroom mocks are blocked on `/api/tests/<id>/start/` and hidden from the catalogue | `test_rewards_p2.py` |
| FE-005 | P3 | The test mission advances only for a real attempt: at least 1 correct answer and at least half answered | `test_rewards_p2.py` |
| AUTH-005, AUTH-006, AUTH-007, AUTH-012 | P2/P3 | `initData` max age is 15 min. Empty token → 503. No username-based account merge. Malformed user → 400. | `test_auth_p2.py` |
| AUTH-008, AUTH-009 | P2 | Throttles on login, register and refresh (`NUM_PROXIES=1`). Referral bonus capped at 10 per day. | `test_auth_p2.py` |
| AUTH-011 | P2 | `access_log off` on `/ws/` | `nginx -t` OK |
| AUTH-013 | P3 | Tunnel hosts allowed only in DEBUG. WS `AllowedHostsOriginValidator`. | suite |
| API-003, LOOP-002 | P3 | Global `ObjectJSONParser`: a non-object JSON body returns 400 everywhere | suite |
| API-004 | P3 | Length limits on profile names, region, post caption and title, and the reel create fields | — |
| API-006 | P3 | No raw exception text in the user-facing learning endpoints (also fixed a missing `logger` in `learning/api.py`) | — |
| API-008 | P3 | Class-battle room state is visible only to the owner and participants | — |
| FE-002 | P2 | A network error or 5xx on refresh no longer logs the user out. Handles a refresh token rotated in another tab. Logout calls the server. | typecheck + build |
| LOOP-004 | P2 | No optimistic fake loop transition on a network error | typecheck + build |
| QA-001 | P3 | Stale study-session test rewritten against the server-measured duration | `learning/tests.py` |
| QA-002 | P3 | `tblib` added to dev requirements; the suite now runs with `--parallel` | — |
| QA-003 | P2 | `manage.py test` blanks every outbound credential loaded from `.env` | — |
| PROD-008 | P3 | `flock -n` around every cron job | `crontab.example` |
| PROD-009 (partial) | P3 | nginx `limit_req` on `/admin/login/` and `server_tokens off` | `nginx -t` OK |
| PROD-010 | P3 | AI usage dashboard no longer inserts fake rows | — |
| CI | — | Runs on every PR. Build runs before typecheck. Adds `pip-audit`, `npm audit --audit-level=critical` and the image-context probe. `shadcn` moved to devDependencies (build-time only). | — |

## Not fixed in code: needs your decision or server access

| Finding | Why | What to do |
|---|---|---|
| Secret rotation (PROD-002 follow-up) | Only matters if a `web` image ever left the server | If yes: rotate `SECRET_KEY` (everyone is logged out), the bot token, the webhook secret and the Groq key |
| PROD-004 off-site encrypted backups and a restore drill | Server-side operations | Add `restic` or `rclone` to object storage and do one restore into a scratch container |
| PROD-005 DB pooling | Needs measuring under load first | Check `pg_stat_activity`; then `CONN_MAX_AGE=0` + psycopg pool (adds the `psycopg[pool]` dependency) |
| PROD-006 Postgres password | Changing it on an initialised volume breaks the app connection | Check `POSTGRES_PASSWORD` on the server; rotate with `ALTER USER` + `.env` in one maintenance window |
| PROD-009 MFA for admins | New dependency (`django-otp`) and enrolment for every admin | Optional: an IP allow-list for `/admin/` in nginx is a lighter alternative |
| FE-003 Learning Loop card missing on the redesign branch | Exists only on `feat/emerald-studio-redesign`, not on `main` | Re-mount `MagneticLoopCard` on the pastel dashboard before that branch is merged |
| GRADE-009 live verification | Calling Groq needs your OK | Run the injection canary against live Groq once |
| Past data | Business decisions | (a) re-grade past paid-mock open answers? (b) review past Telegram approvals for non-admin `@username`s? (c) delete the seeded fake `AIUsageLog` rows? |

## Deploy notes for `fix/audit-remaining`

1. **Migrations run automatically on start:**
   - `core.0009_reward_claim` (new table);
   - SimpleJWT `token_blacklist` (new tables).

   No data migration is needed.
2. **The first deploy logs nobody out**, but old refresh tokens are now rotated on their next use.
3. **New optional env variables** (all have defaults):
   - `PAYMENT_REVIEWER_TELEGRAM_IDS`
   - `JWT_REFRESH_DAYS` (default 14)
   - `TELEGRAM_INITDATA_MAX_AGE_SECONDS` (default 900)
   - `THROTTLE_AUTH`, `THROTTLE_REGISTER`, `THROTTLE_AUTH_REFRESH`
   - `NUM_PROXIES` (default 1; must stay 1 behind our nginx)
4. **The web image entrypoint changed** (non-root). The first start `chown`s the existing media and static volumes, which can take a little while on a large media volume.
5. **Deploy all three services:** `web`, `frontend` and `nginx`. The nginx config changed (rate limit, `server_tokens`, `/ws/` log), so nginx needs a recreate, not just a reload:
   ```bash
   cd /opt/ilmildizi && \
   git pull origin main && \
   docker compose up -d --build --no-deps web frontend && \
   docker compose up -d --force-recreate --no-deps nginx
   ```
6. **Install the cron change** after deploy: `crontab deploy/scripts/crontab.example` (review it first if the server crontab has local edits).
