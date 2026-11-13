# PHASE 7 — Frontend ↔ backend real user flows

Run date: 2026-11-06. Baseline: branch `feat/emerald-studio-redesign`, HEAD `8454d8f` plus the uncommitted working tree (63 entries). No project code was changed.

## Method and environment

- **Test infrastructure.** The frontend has no E2E or unit framework (Phase 0). Testing therefore combined three methods:
  1. A static API contract check of every frontend call.
  2. Code review of the API client and the hooks that hold state.
  3. Real journeys in the built-in browser against isolated local servers.
- **Isolated stack.**
  - Backend: `runserver 127.0.0.1:8001` on a **copy** of the local dev DB (`scratchpad/e2e/e2e.db`, migrations already up to date), started through a wrapper script. In that process the Telegram, Groq, payment-channel, Redis and Sentry variables were empty and `REQUIRE_CHANNEL_SUBSCRIPTION=0`.
  - Frontend: Next dev on `:3500`, using the existing `ilmildizi-frontend` launch config, which rewrites `/api` to `:8001`.
  - A temporary `ilmildizi-audit-backend` entry was added to `.claude/launch.json` to start the backend, then removed again. The file is back to its original content.
  - No production data, real accounts, Telegram or payments were touched.
- **Test user.** A new synthetic account, `audit_e2e_student`, created through the UI register form. Its generated password stays in the session scratchpad only.
- **SQLite caveat.** Two parallel `finish` calls produced `database is locked` (500) on the copy DB. That comes from SQLite through `DATABASE_URL`, which sets no `timeout` option. It is an environment artifact, not a production finding: production runs on Postgres.

## 1. API contract check (spec §7.2: path and payload match)

- Every `/api/...` string literal in `frontend/src/**` (250 distinct paths) was checked against the backend route inventory (`audit/test-data/phase6-endpoints.json`).
  - **All 250 resolve to a backend route.** The 17 apparent misses were query-string templates such as `` `/api/tests/${query}` `` with `query = "?…"`; each was confirmed by reading the source.
- Payload shapes were checked for the journeys in §2. One real mismatch was found (FE-001).

## 2. Journeys

| # | Journey | How tested | Result |
|---|---|---|---|
| 1 | Register | UI form `/register` | **OK.** Lands on `/onboarding`; tokens stored. The streak is already 1 straight after registering (Phase 3 ECON-002). |
| 1b | Telegram Mini App login | Not possible locally (needs a real Telegram WebView and bot token). HMAC was covered in Phase 5. | NOT TESTED |
| 2 | Login / logout / refresh | API client review plus a forced-failure test in the browser | **Refresh network error logs the user out** (FE-002) |
| 3 | Profile / account | UI dashboard; `/api/auth/me` and `/profile` | OK |
| 4 | Catalogue | UI `/tests`, standard → subjects | OK (19 tests, 200) |
| 5 | Start test, answer, see result | Start via API (same origin, user's token), then answer in the UI, refresh mid-test, finish, open `/tests/185/feedback` | **OK.** After refresh the selected answer and the server timer were restored (`34:25` kept counting). The result page matched the server (0 correct / 1 wrong / 29 blank, 0.0 points). A second finish returned `already_completed: true`. The finish button is disabled while finishing (`tests/[attemptId]/page.tsx:886`). |
| 5b | Reward shown after the test | Notifications API | A "Milliy sertifikat testi" mission paid **+150 XP / +15 coins for a test with 0 correct answers** (FE-005) |
| 6 | Open-answer grading | Phases 2 and 6 (graders) | See GRADE-001…009 and API-005 |
| 7 | Sprint | API contract only (`useNeuralSprint.ts` → `/api/v1/sprint/*`) | Paths and keys OK. No UI run. |
| 8 | Learning Loop | Source review | **Not reachable from the UI on this branch** (FE-003). Offline fake completion is LOOP-004 (Phase 4). |
| 9 | XP / coins / streak / missions | Dashboard plus `/me` before and after the test | Values come from the server. Exceptions: FE-004 (reels), FE-005 (mission). |
| 10 | Revision | Contract only (`/api/tests/revision/?…`) | OK (path) |
| 11 | Premium paywall / subscription | `/api/premium/plans/`, and the checkout GET shown in Phase 6 | OK (no premium is granted by the client; the status comes from `/plans`) |
| 12 | Teacher / student roles | Phase 6 role probe | OK |
| 13 | Offline / network failure | Fetch patched in the page | FE-002 confirmed. LOOP-004 confirmed by code. |
| 14 | Loading / empty / error states | API client review | 401/403/404/429/5xx/timeout map to Uzbek messages without exposing server 5xx text (`frontend/src/lib/api-client.ts:268-284`). The 60 s timeout is in place (`:17`). Blank first frame of options (an animation), no defect. |
| — | Reels: create question (student) | UI payload vs view | **Always 400** (FE-001) |
| — | Reels: quiz answer | Phase 6 | **Always 500 for logged-in users** (API-001) |

## 3. Findings

### FE-001 — Student "create reel question" always fails: the payload key does not match
- **P2, CONFIRMED.** The frontend sends `question` (`frontend/src/app/reels/page.tsx:470`). The backend reads `quiz_question` (`backend/learning/api.py:985`) and returns `400 "Savol matni kiritilishi shart"`.
- Repro in the browser session: 4 POSTs with the UI's body shape → `[400, 400, 400, 400]`.
- The admin panel sends the right key (`frontend/src/app/panel/reels/page.tsx:390`). The same mismatch exists on `main` (checked with `git show main:…`), so production is affected.
- Effect: the student UGC feature cannot be used. The UI shows the server error toast.
- Fix: send `quiz_question` (or have the backend accept both). Regression: an API test with the frontend's exact body.

### FE-002 — A network error during token refresh logs the user out and deletes a valid refresh token
- **P2, CONFIRMED (browser).** In `refreshAccessToken` (`frontend/src/lib/api-client.ts:57-130`), a network error on `/api/auth/refresh/` is only logged (`:89-91`). When the session is not inside Telegram, execution then reaches `useAuthStore.getState().logout()` (`:122`), which clears `ilmildizi_access` / `ilmildizi_refresh` (`frontend/src/lib/auth-store.ts:111-114`). The code comment says logout should happen only when the refresh is "aniq yaroqsiz" (definitely invalid).
- Repro: API responses forced to 401 and `/api/auth/refresh/` forced to throw `TypeError('Failed to fetch')`, then one client-side navigation → `{"access": null, "refresh": false}`. The user was logged out.
- Effect: on flaky mobile networks (the main audience), any access-token expiry (every 60 min) that coincides with a dropped request signs the user out. A refresh that returns 5xx does the same, so a short backend outage logs out everyone whose token expires during it.
- Fix: call `logout()` only on 400/401 from the refresh endpoint. On network errors or 5xx keep the tokens and throw `ApiError(0)` for a retry.

### FE-003 — The Learning Loop entry point is not mounted on this branch
- **P2, CONFIRMED (static).** `MagneticLoopCard` (the only component that opens `ContinuousLoopController` / `useContinuousLoop`) is not imported by any page in the working tree. On `main` it is used by `frontend/src/app/dashboard/page.tsx` (`git grep MagneticLoopCard main`). The redesigned dashboard (diff vs `main`: +229 / −492 lines) dropped it.
- Effect: if this branch is merged as is, students lose the daily loop. The daily chest still opens through a finished battle, but the "Sprint → Xatolar → Arena" chain on the dashboard disappears. Backend `/api/v1/loop/*` stays live but unused.
- Fix: decide whether this is intended. If not, re-add the loop card to the pastel dashboard before merging. Release checklist item for this branch.

### FE-004 — The reels UI shows XP the server did not give
- **P3, CONFIRMED (code).** `frontend/src/app/reels/page.tsx:481-482`: `res.message || "…+20 XP berildi"` and `setTodayXpEarned(prev + (res.xp_earned || 20))`. When the daily social cap gives `xp_earned: 0`, the "today's XP" counter still adds 20. The quiz answer path is correct (`:419`, "XP faqat server bergan miqdor"). This conflicts with spec §7.2.
- Currently masked by FE-001.
- Fix: `res.xp_earned ?? 0`.

### FE-005 — A daily mission pays out for a test with zero correct answers
- **P3, CONFIRMED (browser).** Finishing a test with 1 wrong answer and 29 blank completed the "Milliy sertifikat testi" mission and paid **+150 XP / +15 coins** (notification text). `advance_missions(profile, 'test')` (`backend/tests_app/api.py:944`) has no score or answered-count threshold.
- Bounded at one payout per mission per day, but it is the same zero-effort pattern as Phase 3 ECON-001.
- Fix: require a minimum answered or correct share before advancing test missions.

### Already reported, observed again in the UI flow
- Streak +1 on register or login (ECON-002).
- Reels quiz 500 (API-001).
- Loop offline fake completion (LOOP-004).

## 4. Journey checklist (reproducible manually)

1. `/register` → fill in the 4 fields → expect `/onboarding`; `localStorage.ilmildizi_access` is set.
2. Skip onboarding → `/dashboard` shows level 1, streak 1, 0 XP.
3. `/tests` → Standart → subject → start a test → answer Q1 → **reload** → the answer is still selected and the timer keeps going.
4. Finish → `/tests/<id>/feedback` numbers match `GET /api/tests/attempts/<id>/feedback/`. A second finish returns `already_completed`.
5. DevTools offline right after the 60-minute token expiry → navigate. **Expected:** stay logged in and see an error. **Today:** logged out (FE-002).
6. `/reels` → create a question → **expected** 200; **today** 400 (FE-001).
7. `/reels` → answer a quiz while logged in → **expected** 200; **today** 500 (API-001).
8. Dashboard → find the Learning Loop card → **missing on this branch** (FE-003).

## 5. Summary

- Contract: all 250 frontend API paths exist on the backend. One payload key mismatch (FE-001).
- Core test-taking works end to end: register → catalogue → start → answer → refresh-resume → finish → result. The double-finish guard and server-confirmed results behave correctly.
- **P2:**
  - FE-001: student reel creation is always 400 (also on `main`).
  - FE-002: a refresh network error logs users out.
  - FE-003: the Learning Loop is unreachable on this branch.
- **P3:**
  - FE-004: the reels UI adds unconfirmed XP.
  - FE-005: the test mission pays out with 0 correct answers.
- **Not tested:**
  - Telegram Mini App (needs a real WebView and token);
  - payment upload end to end (it would notify the real channel if configured; covered by code review);
  - WebSocket battles in the UI;
  - mobile viewport.
- Inputs for Phase 8: `backend/config/settings.py`, `Dockerfile`, `frontend/Dockerfile`, `docker-compose.yml`, `.dockerignore`, `deploy/docker/*`, `deploy/nginx/*`, `deploy/scripts/backup.sh`, `deploy/systemd/*`, `.github/workflows/ci.yml`, `backend/config/health.py`, `backend/requirements/*.txt`, `frontend/package.json`.
