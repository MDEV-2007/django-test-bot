# IlmIldizi / django-test-bot — final audit report

Audit date: 2026-11-06. Auditor: Claude Code (Opus 5.5), working from `check-task.md`. The audit only read and tested; no project code was changed.

## 9.1 Executive summary

### Scope
- **Repository:** `django-test-bot`, branch `feat/emerald-studio-redesign`, HEAD `8454d8f`, with 63 uncommitted entries.
- **Applies to `main` too:** the backend, deploy config, `frontend/package.json`, `next.config.ts` and the API client differ from `main` only in 7 small files (`git diff --stat main`: about 96 changed lines in dashboard, learning, analytics and tests). Backend findings therefore apply to `main` and very likely to production as well.
- **Not applicable to `main`:** FE-003 only exists on this branch.
- **Confirmed on `main` by source:** FE-001, API-001 and PROD-001 were each re-checked on `main` itself.

### Phase status

| Phase | Report | Status |
|---|---|---|
| 0 Repository map | [00-repository-map.md](00-repository-map.md) | Done |
| 1 Test suite | [01-test-suite.md](01-test-suite.md) | Done (SQLite; 6 Postgres-only tests skipped) |
| 2 Open-answer grading | [02-open-answer-grading.md](02-open-answer-grading.md), [test-data/grading-cases.json](test-data/grading-cases.json) | Done (120 synthetic cases) |
| 3 Reward economy | [03-reward-economy.md](03-reward-economy.md), [test-data/phase3_reproducers.py](test-data/phase3_reproducers.py) | Done (no real Postgres concurrency) |
| 4 Learning Loop | [04-learning-loop.md](04-learning-loop.md), [test-data/phase4_reproducers.py](test-data/phase4_reproducers.py) | Done (19 scenarios) |
| 5 Auth / authorization | [05-auth-and-authorization.md](05-auth-and-authorization.md), [test-data/phase5_reproducers.py](test-data/phase5_reproducers.py) | Done |
| 6 API permissions | [06-api-permissions.md](06-api-permissions.md), [test-data/phase6-matrix.md](test-data/phase6-matrix.md) | Done (417 DRF method+path rows role-probed; ownership reviewed statically) |
| 7 Frontend ↔ backend | [07-frontend-backend-flows.md](07-frontend-backend-flows.md) | Done (isolated local servers, synthetic user) |
| 8 Production readiness | [08-production-readiness.md](08-production-readiness.md) | Done (repository config only; no server access) |

### Test suite
560 tests: 553 pass, 1 fails (stale test, QA-001), 6 are skipped (Postgres only). The result is deterministic under `--shuffle`, and 555 tests pass in parallel. Concurrency protections are **not verified** on Postgres.

### Findings by severity

62 findings in total. `AUTH-003` was a negative check, not a finding.

| Severity | Total | CONFIRMED | LIKELY | NEEDS VERIFICATION |
|---|---:|---:|---:|---:|
| P0 | 2 | 1 (SEC-PAY-001, server side) | 1 (PROD-001) | — |
| P1 | 9 | 9 | — | — |
| P2 | 23 | 18 | 3 | 2 |
| P3 | 28 | 26 | 1 | 1 |

Notes:
- Two P1 items are confirmed with simulated interleaving or by version: ECON-003 (lost update) and PROD-007 (vulnerable Pillow).
- PROD-002 (secrets in the image) was confirmed by a build-context probe.

### Production blockers
SEC-PAY-001, PROD-001, PROD-002, PROD-007 (Pillow), AUTH-001, AUTH-002, ECON-001, ECON-003, and GRADE-001…003.

### Top 5 risks
1. **SEC-PAY-001 (P0).** Any Telegram user can approve their own pending payment, getting free PRO or paid mock tests, or reject other people's payments. The Telegram callback has no chat or admin check.
2. **PROD-001 (P0, LIKELY).** Critical unauthenticated RCE advisory for Next.js 16.3.1; the AVIF image optimisation it needs is enabled.
3. **PROD-002 (P1).** `backend/.env` (all secrets), the local DB and payment screenshots are copied into the web Docker image.
4. **Account security (P1).**
   - AUTH-001: unlimited password brute force by spoofing `X-Forwarded-For`.
   - AUTH-002: tokens cannot be revoked; they survive a password reset and there is no logout, for 30 days.
5. **Score and economy integrity (P1).**
   - GRADE-001…003: one-letter, off-by-one-year and "shotgun" answers are graded correct, including in paid mocks.
   - ECON-001: the Learning Loop pays 600 coins, 300 XP and 3 AI credits a day with zero answers.
   - ECON-003: `Profile.save()` races revert coin spends and premium approvals.

### Limitations
- **Not done:** a production pentest; inspection of the live server (env, nginx, logs, backups); real Postgres or Redis concurrency and restart tests; any live Telegram, Groq or payment calls.
- **Not exercised:** Telegram Mini App login and the WebSocket battle UI.
- **No coverage measurement:** `coverage` was not installed.
- **No frontend automated tests exist,** so frontend behaviour was checked by code review plus a browser session.
- **Synthetic data only:** grading cases are synthetic (not real curriculum), and the probes used a sparse test DB, so list or filter leaks with large data were not exercised.

## 9.2 Findings table

All file references are repository-relative. Details, repro steps and regression tests are in the linked phase reports.

### P0
| ID | Confidence | Module | Problem | File:line | User impact | Recommendation |
|---|---|---|---|---|---|---|
| SEC-PAY-001 | CONFIRMED (server); client forging per Telegram docs | Telegram / premium | `pay_approve_<id>` callback accepted from any chat or user | `backend/telegrambot/handlers.py:413-427`, `backend/telegrambot/payment_review.py:185-238` | Free PRO and paid tests; sabotage of others' payments | Require the payment channel and an admin `from.id`; atomic `status='pending'` claim |
| PROD-001 | LIKELY | Frontend infra | Next 16.3.1 critical RCE advisory with AVIF optimisation on | `frontend/package.json` (`next`), `frontend/next.config.ts:12-13` | Possible RCE in the production frontend container | Upgrade `next` to ≥ 16.4.5; drop `image/avif` as a stop-gap |

### P1
| ID | Confidence | Module | Problem | File:line | User impact | Recommendation |
|---|---|---|---|---|---|---|
| PROD-002 | CONFIRMED | Docker | `.dockerignore` root-only patterns copy `backend/.env`, `db.sqlite3` and `media/` into the image | `.dockerignore`, `Dockerfile` (`COPY backend/ .`) | Secret and PII leak to anyone with the image | `**/` patterns, rebuild, rotate secrets if the image left the host |
| PROD-007 | CONFIRMED (version) | Dependencies | Pillow 12.2.0 (85 advisories incl. decoder RCE); DRF 3.18.0 DoS | `backend/requirements/base.txt` | Upload-triggered memory corruption; API CPU DoS | Pillow ≥ 13.0.0, DRF ≥ 3.18.2 |
| AUTH-001 | CONFIRMED | Auth | Login lockout keyed on a spoofable first XFF value | `backend/accounts/utils.py:67-76`, `deploy/docker/app_routes.inc:98` | Unlimited password guessing | Use `REMOTE_ADDR` / `X-Real-IP`; per-username cap |
| AUTH-002 | CONFIRMED | Auth / JWT | No blacklist or rotation; refresh lives 30 days and survives a password reset | `backend/config/settings.py:470-475` | Stolen sessions cannot be killed | `token_blacklist`, rotation, logout, invalidate on password change |
| ECON-001 | CONFIRMED | Learning Loop | Full reward with zero answers, 3 cycles a day, plus chest unlock | `backend/learning_loop/views.py:473-548` | Coin, XP and AI-credit farming | Require answers; pay 0 when the arena has no results |
| ECON-003 | CONFIRMED (simulated) | Accounts | `update_streak()` full `save()` overwrites concurrent coins and premium | `backend/accounts/models.py:193`, `backend/premium/models.py:121` | Free items; paying users lose premium | `save(update_fields=...)` |
| GRADE-001 | CONFIRMED | Grading | Whole-string ratio ≥ 0.70 accepts wrong years, rulers and dynasties | `backend/tests_app/services/grading.py:98`, `:162` | Wrong scores in tests and paid mocks | Exact numeric and roman tokens; stricter fuzzy on letters; borderline answers to AI |
| GRADE-002 | CONFIRMED | Grading | Two-way substring accepts one-letter or fragment answers | `grading.py:112`, `:128` | Trivially gamed open answers | Whole-token matching, minimum length |
| GRADE-003 | CONFIRMED | Grading | Shotgun lists or any shared number accepted | `grading.py:112`, `:136`, `:151` | Gamed open answers | All numbers must match; length guard |

### P2
| ID | Confidence | Module | Problem | File:line | Recommendation |
|---|---|---|---|---|---|
| QA-003 | LIKELY | Tests | Tests load the real `.env`; payment-review notification unmocked; fallback admin chat id hardcoded | `backend/config/settings.py:21`, `:98`; `backend/premium/api.py:89-90` | Blank secrets under tests; mock HTTP globally |
| GRADE-004 | CONFIRMED | Grading | `-` and `/` stripped, so `5` == `-5` | `grading.py:58` | Keep numeric punctuation |
| GRADE-006 | CONFIRMED | Grading | No Cyrillic transliteration | `grading.py:47-51` | Full Uzbek Cyrillic → Latin map |
| GRADE-009 | NEEDS VERIFICATION | Grading AI | Lenient 70% prompt; student text injected raw | `grading.py:20`, `:168-176`; `backend/growth/ai_grader.py:94-102` | Delimit input; remove 70% rule; injection canary |
| ECON-002 | CONFIRMED | Streak | Dashboard GET or login increments the streak | `backend/dashboard/api.py:22`, `backend/accounts/api.py:49` | Streak only on real learning actions |
| ECON-005 | LIKELY | Rewards | Caps and first-try guards only in Redis | `backend/core/reward_caps.py:45-60` | DB-backed claims |
| ECON-006 | LIKELY | Payments | Telegram approve is check-then-act | `backend/telegrambot/payment_review.py:210-238` | Conditional update claim |
| ECON-007 | CONFIRMED | Rewards | Grading false positives pay XP and coins | `backend/tests_app/api.py:856-857` | Fixed by GRADE-001…003 |
| LOOP-004 | CONFIRMED (code) | Frontend | Offline fake stage, chest and 2.5× combo | `frontend/src/hooks/useContinuousLoop.ts:572-610` | Keep the stage; show retry |
| AUTH-004 | CONFIRMED | WebSocket | Banned users accepted | `backend/config/ws_auth.py:21-28` | Check `is_active` |
| AUTH-005 | CONFIRMED | Telegram login | initData replayable for 24 h | `backend/accounts/utils.py:403` | 5–15 min max age |
| AUTH-006 | CONFIRMED (test) / NEEDS VERIFICATION (prod) | Telegram login | Empty bot token lets anyone forge a login | `backend/accounts/api.py:186-192` | 503 when the token is empty; boot guard |
| AUTH-008 | CONFIRMED | Rate limiting | No throttle on register, social login or refresh | `backend/config/settings.py:464-467` | Anonymous throttles plus `NUM_PROXIES` |
| AUTH-009 | CONFIRMED | Referrals | Unlimited referral coins | `backend/accounts/referrals.py:15`, `:20-47` | Pay after activity; cap |
| AUTH-011 | CONFIRMED (config) | Infra | WS JWT in URL written to the access log | `deploy/docker/app_routes.inc:79-90`, `backend/config/ws_auth.py:34-37` | `access_log off` or a WS ticket |
| API-001 | CONFIRMED | Reels | Quiz 500 for every logged-in user; unknown reel pays | `backend/learning/api.py:873`, `:900-906` | `profile.streak`; 404 for an unknown reel |
| API-002 | CONFIRMED (published set) | Classroom | Paid mock set startable early without a subscription through `/api/tests/<id>/start/` | `backend/tests_app/api.py:308-360`, `backend/classroom/models.py:244-246` | Block sets used by non-free mocks |
| FE-001 | CONFIRMED | Reels | UI sends `question`, API reads `quiz_question`, so always 400 | `frontend/src/app/reels/page.tsx:470`, `backend/learning/api.py:985` | Align the key |
| FE-002 | CONFIRMED | Frontend auth | Network error on refresh logs out and deletes tokens | `frontend/src/lib/api-client.ts:89-91`, `:122` | Log out only on 400/401 |
| FE-003 | CONFIRMED | Frontend | Loop entry not mounted on this branch | `frontend/src/components/dashboard/MagneticLoopCard.tsx` (no importer) | Re-add before merging |
| PROD-003 | CONFIRMED | Docker | Django container runs as root | `Dockerfile` | Non-root `USER` |
| PROD-004 | CONFIRMED (config) | Backup | Same-host, unencrypted, untested restore | `deploy/scripts/backup.sh` | Off-site encrypted plus restore drill |
| PROD-005 | NEEDS VERIFICATION | DB | `CONN_MAX_AGE=60` under ASGI, no pool | `backend/config/settings.py:241` | `CONN_MAX_AGE=0` plus psycopg pool |

### P3
| ID | Confidence | Module | Problem | File:line |
|---|---|---|---|---|
| QA-001 | CONFIRMED | Tests | Stale study-session test (fails CI) | `backend/learning/tests.py:22` |
| QA-002 | CONFIRMED | Tests | Parallel run crashes on failure (no `tblib`) | `backend/requirements/dev.txt` |
| QA-004 | CONFIRMED | Dates | `date.today()` used for daily keys | `backend/core/reward_caps.py:48`, `backend/learning/api.py:169`, `backend/learning/services.py:29` |
| GRADE-005 | CONFIRMED | Grading | Fraction map dead code; `1/2` vs `0.5` rejected | `grading.py:141-151` |
| GRADE-007 | CONFIRMED | CEFR gap | `$50` = `£50`; `NOT-GIVEN` ≠ `NOT GIVEN` | `backend/tests_app/models.py:660` |
| GRADE-008 | CONFIRMED | Growth grader | ≥ 0.85 fuzzy and 0.70 fallback accept wrong answers | `backend/growth/ai_grader.py:68-80`, `:129` |
| ECON-004 | CONFIRMED | Rewards | Caps reset at 05:00 Tashkent time | `backend/core/reward_caps.py:48` |
| LOOP-001 | CONFIRMED | Loop | Small bank: arena reuses revealed sprint answers | `backend/learning_loop/views.py:122` |
| LOOP-002 | CONFIRMED | Loop | JSON array body returns 500 | `backend/learning_loop/views.py:395`, `:445` |
| LOOP-003 | CONFIRMED (code) / simulated | Loop | No unique constraint; duplicates block restart | `backend/learning_loop/views.py:160-212`, `:655-658`; `backend/learning_loop/models.py:92-95` |
| LOOP-005 | CONFIRMED | Loop | Stages 1 and 3 unchecked; client `cleared_count` | `backend/learning_loop/views.py:466-471`, `:499-506` |
| LOOP-006 | CONFIRMED | Loop | `from_stage` optional | `backend/learning_loop/views.py:461-464` |
| LOOP-007 | CONFIRMED | Loop | No throttle on loop answer | `backend/learning_loop/views.py:377-385` |
| AUTH-007 | CONFIRMED | Telegram login | Linking by `telegram_username` | `backend/accounts/api.py:220-227` |
| AUTH-012 | CONFIRMED | Telegram login | Signed non-JSON user returns 500 | `backend/accounts/api.py:199` |
| AUTH-013 | CONFIRMED | Settings | Tunnel domains trusted in production; no WS origin validator | `backend/config/settings.py:42-55`, `backend/config/asgi.py:34-36` |
| API-003 | CONFIRMED | API | JSON array returns 500 on 61 routes | see [test-data/phase6-leaks-and-bodies.json](test-data/phase6-leaks-and-bodies.json) |
| API-004 | CONFIRMED | API | No text length limits | `backend/accounts/api.py:328-330`, `backend/learning/api.py:1139` |
| API-005 | CONFIRMED | Growth | Grader uses `explanation` as the reference | `backend/growth/views.py:30`, `:39-40` |
| API-006 | CONFIRMED | API | `str(e)` returned to clients | `backend/learning/api.py:976`, `:1295`; `backend/panel/api.py` (many) |
| API-007 | CONFIRMED | Panel | Impersonation tokens are 30-day superadmin keys | `backend/panel/api.py:846-879` |
| API-008 | CONFIRMED | Class battles | Room state readable by any user | `backend/core/views.py:239-241` |
| FE-004 | CONFIRMED | Reels UI | Shows +20 XP when the server gave 0 | `frontend/src/app/reels/page.tsx:481-482` |
| FE-005 | CONFIRMED | Missions | Test mission pays with 0 correct | `backend/tests_app/api.py:944` |
| PROD-006 | NEEDS VERIFICATION | DB | Default Postgres password, owner role | `docker-compose.yml:75`, `:118` |
| PROD-008 | LIKELY | Cron | Every-minute jobs without `flock` | `deploy/scripts/crontab.example` |
| PROD-009 | CONFIRMED | Admin | `/admin/` public, no MFA or throttle | `deploy/docker/app_routes.inc:92` |
| PROD-010 | CONFIRMED | Panel | AI usage dashboard inserts fake rows | `backend/panel/api.py:3791-3810` |

## 9.3 Fix priority

### Immediate / P0 (stop-the-line)

| Fix | Files | Migration | Regression test | Compatibility / deploy risk |
|---|---|---|---|---|
| SEC-PAY-001 + ECON-006 | `backend/telegrambot/payment_review.py`, `backend/telegrambot/handlers.py`, settings allow-list for admin Telegram IDs | No | Reproducers `PaymentCallbackTests` flipped to expect `pending`; positive channel-admin test; double-approve test | Admins must press from the channel with an allow-listed account. Backend-only deploy (`web`). Low rollback risk. |
| PROD-001 | `frontend/package.json` and `package-lock.json` (`next` ≥ 16.4.5); optionally `frontend/next.config.ts` | No | `npm audit --omit=dev` shows no criticals; `npm run build`; smoke the pages | Next minor upgrade; run typecheck and build. Frontend-only deploy. |

### Before release / P1

| Fix | Files | Migration | Regression test | Compatibility / risk |
|---|---|---|---|---|
| PROD-002 | `.dockerignore` | No | CI build-context probe fails on `.env` / `db.sqlite3` | Rebuild `web`. **Rotate secrets** (SECRET_KEY rotation logs everyone out). |
| PROD-007 | `backend/requirements/base.txt` | No | Full suite; upload tests | Pillow major bump: check `story.py` rendering and image validation |
| AUTH-001 | `backend/accounts/utils.py` | No | Rotating-XFF test expects 429 | None |
| AUTH-002 | `backend/config/settings.py` (`token_blacklist`, rotation); `backend/accounts/api.py` (logout); password-change hook; `frontend/src/lib/api-client.ts` (store rotated refresh — it already does) | **Yes** (`token_blacklist` tables) | Refresh rejected after logout or password change; old refresh rejected after rotation | Existing refresh tokens keep working until expiry unless forced out. Deploy `web` + `frontend`. |
| ECON-001 (+ LOOP-005/006) | `backend/learning_loop/views.py` | No | Zero-answer cycle pays 0 or returns 409; full run pays | Students mid-cycle at deploy may get 409 once; the frontend refetches on 409 |
| ECON-003 | `backend/accounts/models.py`, `backend/premium/models.py` | No | Stale-instance reproducers flipped; Postgres two-thread test | None |
| GRADE-001…003 (+004/005, ECON-007) | `backend/tests_app/services/grading.py` | No | `grading-cases.json` as a parametrised test: 0 false positives; typo cases stay True | More answers go to Groq, so cost and latency rise. Previously graded attempts are not re-graded (decide whether to re-grade paid mocks). |

### Next sprint / P2
- **Telegram login hardening:** AUTH-004, AUTH-005, AUTH-006.
- **Throttles and referrals:** AUTH-008, AUTH-009, plus nginx `limit_req`.
- **WS token logging:** AUTH-011.
- **Reels:** API-001, FE-001.
- **Classroom mock bypass:** API-002.
- **Frontend resilience:** FE-002, LOOP-004.
- **Branch:** re-mount the Loop before merging (FE-003).
- **Streak:** ECON-002.
- **DB-backed caps:** ECON-005 (needs a migration for the claims table).
- **Grading:** Cyrillic (GRADE-006); AI prompt hardening (GRADE-009, verify with an approved Groq test).
- **Test isolation:** QA-003.
- **Infra:** non-root container (PROD-003), off-site backups and a restore drill (PROD-004), DB pooling (PROD-005).

### Backlog / P3
- **Tests:** QA-001/002/004.
- **Grading:** GRADE-005/007/008.
- **Rewards and loop:** ECON-004; LOOP-001/002/003 (LOOP-003 needs a migration for the unique constraint, after deduplicating existing rows)/007.
- **Auth:** AUTH-007/012/013.
- **API:** API-003…008 (API-003 is best fixed once, globally).
- **Frontend:** FE-004/005.
- **Infra and panel:** PROD-006/008/009/010.

## 9.4 Release decision

**`NO-GO`**

Evidence:
- **A confirmed P0 (SEC-PAY-001).** Free premium through a forged Telegram callback is accepted by the server: `payment.status = approved | is_premium = True | admin_note = … @not_admin tomonidan tasdiqlandi`. This is a revenue-integrity and payment-sabotage hole on the live payment path.
- **A likely P0 (PROD-001).** A critical unauthenticated RCE advisory exists for the deployed Next.js version, with the vulnerable feature enabled.
- **Release-blocking P1s, all confirmed by reproducers:**
  - secrets and payment screenshots inside the image (PROD-002);
  - unlimited password brute force (AUTH-001);
  - non-revocable sessions (AUTH-002);
  - zero-effort reward farming (ECON-001);
  - lost updates that revert payments and coins (ECON-003);
  - an open-answer grader that accepts single letters and wrong dates in paid mocks (GRADE-001…003).

Because the backend on this branch is essentially identical to `main`, these risks very likely exist in the **current production deployment** as well. The two P0 items warrant a hotfix independent of this branch's release.

### Path to `CONDITIONAL GO`
1. Fix SEC-PAY-001 and PROD-001.
2. Rebuild the image with a corrected `.dockerignore` and rotate the exposed secrets.
3. Upgrade Pillow and DRF.
4. Fix AUTH-001, AUTH-002, ECON-001, ECON-003 and GRADE-001…003 with the regression tests listed above.
5. Make CI green (QA-001).
6. Run the Postgres concurrency tests once.
7. For this branch only: re-mount the Learning Loop entry (FE-003).

### What a later "GO" would still not mean
The live server has not been inspected, there was no production pentest, the backup restore was not tested, and Telegram, Groq and payment behaviour was not exercised live. These remain open limitations even after the fixes.

Fix plan: [10-fix-plan.md](10-fix-plan.md).
