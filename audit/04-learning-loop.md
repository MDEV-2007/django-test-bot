# PHASE 4 — Learning Loop: state, refresh, interruption and parallel requests

Run date: 2026-11-06. Baseline: HEAD `8454d8f` plus the uncommitted working tree (63 entries). No project code was changed.

Reproducers: `audit/test-data/phase4_reproducers.py`, 19 scenario tests, run on the SQLite test DB with secrets blanked. 18 tests pass as written. `test_11_malformed_payloads` **fails on purpose**: it asserts "no 500" and found two (LOOP-002).

Postgres-only true parallel runs were not executed (not approved). "Parallel" below means sequential replays under the same lock path, unless stated otherwise.

## 1. State machine

Server-side state is `DailyLearningLoop` (`backend/learning_loop/models.py:7`): `current_stage`, `combo_multiplier`, `session_mistakes_ids`, `sprint_score/total`, `cleanup_cleared`, `arena_won`, `is_chest_claimed`, and FK `sprint_session` / `arena_session` → `sprint.QuizSession`. Answers are stored in `QuizSessionAnswer`, which is unique on `(session, question)` (`backend/sprint/models.py:158`). A loop belongs to `(user, date=localdate, cycle_number)`, but **there is no unique constraint** (`learning_loop/models.py:92-95`).

| From → To | Endpoint | Server condition | What the client sends | Reward |
|---|---|---|---|---|
| (none) → STAGE_1_WARMUP | `GET /api/v1/loop/current/` (`learning_loop/views.py:317`) | Creates today's loop if missing (`_get_or_create_today_loop`, `:160`) | — | — |
| 1 → 2 SPRINT | `POST advance-stage` (`:438`) | `from_stage` (optional) must equal the current stage (`:462`). **No check that warm-up happened.** | `from_stage` | — |
| answers | `POST /loop/answer/` (`:392`) | Stage must be active (`:404`). Session owner, mode, expiry and question membership are checked (`sprint/services.py:98-105`). The first answer wins (`:127-140`). | `stage, question_id, option_id, revenge` | — |
| 2 → 3 CLEANUP or 4 ARENA | advance | Score comes from stored answers; unanswered counts as wrong (`:473-497`) | — | — |
| 3 → 4 ARENA | advance | **No check.** `cleared_count` is taken from the client, clamped, and used for stats only (`:501-504`) | `payload.cleared_count` | — |
| 4 → 5 COMPLETED | advance | `arena_won = bool(results) and player_correct >= ghost_correct` (`:517`). The ghost is deterministic per loop (`:126`). | — | 200 coins / 100 XP × combo (win) or × 1.0 (loss), +1 essay credit, eco-tree water. Paid once, guarded by `is_chest_claimed` (`:526-548`). |
| 5 → new cycle | `POST restart-cycle` (`:642`) | Previous loop is in STAGE_5, and the cycle count is < 3 (`MAX_CYCLES_PER_DAY`, `:25`). The user row is locked. | — | Next cycle's combo is 2.0× / 2.5× |

The whole transition runs inside `transaction.atomic()` with `select_for_update` on the loop row (`:452-453`).

## 2. Scenario results (spec §4.2)

| # | Scenario | Result | Evidence (print line from the run) |
|---|---|---|---|
| 1 | Normal flow, all correct | OK | `perfect run reward: {'coins': 500, 'xp': 250, 'arena_won': True}` |
| 2 | Refresh at each stage | OK: stage and question IDs are stable | `stage STAGE_2_SPRINT \| same sprint ids: True` |
| 3 | Tab closed and reopened | OK, same as #2: all state is in the DB | — |
| 4 | Network drop and reconnect | **Frontend drift** (LOOP-004) | `useContinuousLoop.ts:572-610` |
| 5 | Same answer submitted twice | OK: first answer kept | `first wrong: False \| resubmit right -> False duplicate True` |
| 6 | Same advance sent twice | OK: second returns 409 | `same from_stage twice -> 200 409` |
| 7 | Stage 2/4 endpoint while at Stage 1 | OK: 409 | `advance from STAGE_4 while at STAGE_1 -> 409 \| arena answer at STAGE_1 -> 409` |
| 8 | Reusing an old stage or a question outside the session | OK | `question outside session -> 400 question_not_in_session` |
| 8b | Advance **without** `from_stage` | Accepted, advances blindly | `advance without from_stage -> 200 STAGE_2_SPRINT` (LOOP-006) |
| 9 | Another user's session ID | OK: 404, existence not revealed | `intruder answers victim loop session -> 404` |
| 10 | Expired session | Answers return 410. The loop still advances, so unanswered counts as wrong. | `expired sprint session answer -> 410 \| advance still allowed -> 200` |
| 11 | Wrong, empty or malformed payload | **Top-level JSON array → 500** (LOOP-002). Bad stage, string, null, negative or huge IDs → 400. | `{'list_body': 500, 'adv_list_body': 500, ...}` |
| 12 | Faked `arena_won` / `correct_count` | Ignored. `cleared_count=999` is clamped, but still records "12 of 12 cleared" with no work (LOOP-005). | `arena_won False coins 200 \| cleanup_cleared 12 of 12` |
| 13 | Arena lost | Pays 1.0× (200 / 100), which is what the code intends. Also pays with **zero answers** (Phase 3 ECON-001). | `all-wrong arena -> arena_won False coins 200 xp 100` |
| 14 | Response lost after reward, client retries | Server is safe: 409, coins unchanged. The reward amount cannot be recovered from GET (UX). | `retry final advance -> 409 \| coins unchanged: True \| awarded amounts recoverable from GET: False` |
| 15 | Server restart or cache loss | OK: loop state does not depend on the cache | `after cache.clear(): stage STAGE_2_SPRINT \| same questions True` |
| 16 | Two devices on one loop | OK: answers idempotent, second advance 409 | `device B sees duplicate True True \| advances -> 200 409` |
| 17 | Two loops in parallel for one user | **Duplicate rows possible; the user then gets stuck** (LOOP-003, simulated) | `rows: {2: 'STAGE_5_COMPLETED', 1: 'STAGE_1_WARMUP'} \| restart … -> 409 Avval joriy siklni yakunlang` |
| 18 | Old request after the loop ended / yesterday's loop | OK: always today's loop; yesterday's unpaid ARENA cannot be cashed | `yesterday loop at ARENA, advance today -> 409 … coins delta 0` |
| — | Restart rules | OK: early restart 409, 4th 429 | `restart before finish -> 409 \| 4th restart -> 429` |
| — | Small question bank | **Arena reuses sprint questions whose answers are already revealed** (LOOP-001) | `bank=12: arena ⊆ sprint: True` |

## 3. Findings

### LOOP-001 — With a small question bank, the arena reuses sprint questions after their answers were shown
- **P3, CONFIRMED.** `backend/learning_loop/views.py:122`: if the pool has fewer than 17 questions (12 sprint + 5 arena), `arena_qs = sprint_qs[:5]`. Every sprint answer response returns `correct_option_id` (`sprint/services.py:114-124`; `[LOOP-05] correct_option_id revealed after 1st answer: True`).
- Effect: a guaranteed arena win, so the 2.0–2.5× multiplier gives 400–500 coins per cycle instead of 200. This only happens when the whole practice pool is small (`_pick_sprint_questions` falls back to subject, then the global pool, `:41-56`), so in production it mainly affects new or sparse subjects. Production bank size was not checked.
- Fix: when the pool is short, give no multiplier, or draw arena questions from a different subject. Regression: bank = 12 gives `arena_won` without a multiplier.

### LOOP-002 — A top-level JSON array returns 500 on `/loop/answer/` and `/loop/advance-stage/`
- **P3, CONFIRMED.** `learning_loop/views.py:395` and `:445` call `request.data.get(...)`, but DRF parses `[1]` as a `list`, so the result is `AttributeError: 'list' object has no attribute 'get'` and a 500. `restart-cycle` ignores the body (409).
- Effect: log noise, Sentry alerts and 500 counters; anyone can trigger it. No data is corrupted.
- Fix: `if not isinstance(request.data, dict): return 400`. This is a cross-cutting pattern, and Phase 6 will grep for it.

### LOOP-003 — No unique `(user, date, cycle_number)`: parallel first loads create duplicates, then the user is stuck
- **P3. Lock-free creation CONFIRMED in code. Outcome simulated.** `_get_or_create_today_loop` (`:160-212`) runs a plain `filter().first()` and then `create()`, with no lock and no constraint. When two first GETs race (two tabs, mobile plus web, or a prefetch and a page load), two `cycle_number=1` loops appear.
  - GET and advance pick the newest (`order_by('-cycle_number','-id')`, `:168`).
  - `restart-cycle` uses `order_by('-cycle_number').first()` (`:655-658`), which has **no id tie-break**. On SQLite it returned the older, unfinished row, so the response was "Avval joriy siklni yakunlang" (409) for the rest of the day.
  - On Postgres the tie order is undefined.
- Effect: the user cannot start cycles 2–3 that day.
- Fix: a `UniqueConstraint(user, date, cycle_number)` plus `get_or_create` / `IntegrityError` retry, and the same ordering in both queries. Regression: a two-thread Postgres test, and the simulated-duplicate test flipped.

### LOOP-004 — On a network error the frontend fakes the stage transition locally
- **P2, CONFIRMED (code).** `frontend/src/hooks/useContinuousLoop.ts:572-610`: on any non-409 error, `advanceStage` moves the local stage forward (up to `STAGE_5_COMPLETED`), sets `combo_multiplier` to 2.5 and `is_chest_claimed: true`, and adds DTM points, with no server confirmation. `fetchLoop` errors also switch to a hardcoded offline loop with built-in questions (`:507-524`, `DEFAULT_FALLBACK_*` at `:121+`).
- Effect: after a dropped request the student sees "loop completed, chest opened, 2.5× combo" while the server is still at the earlier stage and paid nothing. The state silently resets on the next load, which reads as "my reward disappeared" and creates support tickets. This contradicts spec §7.2 ("frontend must not show unconfirmed XP or results").
- Fix: on network error, keep the current stage and show a retry button. Never set `is_chest_claimed` or the combo locally. Show offline mode explicitly as practice only.

### LOOP-005 — Stages 1 and 3 have no completion check; Stage 3 stats come from the client
- **P3, CONFIRMED.** Warm-up (`:466-471`) and cleanup (`:499-506`) advance on request. `cleanup_cleared` is the client's `cleared_count`, clamped to the number of mistakes. `dtm_score_delta` grows by +0.4 / +0.6 regardless.
- Effect: inflated "DTM points" and "mistakes cleared" figures that appear in the auto-share post caption (`:606-609`) and the UI. No coins come from these two stages by themselves; the reward is ECON-001 in Phase 3.
- Fix: record cleanup on the server (re-answer the mistakes through `/loop/answer/` with `revenge`) and compute `cleanup_cleared` from that.

### LOOP-006 — `from_stage` is optional
- **P3, CONFIRMED.** `:461-464` only compares when the client sends it. Without it, every POST advances one stage. The current frontend always sends it (`useContinuousLoop.ts:548`), so its double-clicks are safe (#6). A double-click from any other client could skip a stage unintentionally (for example closing the sprint before answers arrive).
- Fix: make `from_stage` required and return 400 when it is missing.

### LOOP-007 — No throttle on `/loop/answer/`
- **P3, CONFIRMED (code).** `LoopAnswerView` (`:377-385`) has no `throttle_scope`, while the equivalent `SprintAnswerAPIView` uses `quiz_answer` (120/min, `sprint/views.py:370-371`). Answers are idempotent, so there is no reward impact, only free DB writes and load.

## 4. Data consistency (spec §4.3)

- **Transactions.** The transition runs under `select_for_update` on the loop. The reward runs inside the same atomic block through `grant_rewards_atomic` (row lock on Profile). Answer insert relies on the unique constraint and `IntegrityError`. `restart-cycle` locks the auth user row.
- **Idempotency.** `is_chest_claimed` (per loop) and the unique `QuizSessionAnswer`. There is no idempotency key on advance; that is acceptable because `from_stage` gives the same effect when it is sent (LOOP-006).
- **Race conditions.** Loop creation (LOOP-003). Profile lost update from Phase 3 ECON-003 also applies to the loop reward window.
- **Recovery.** All state is in the DB and survives cache loss and restarts (#15). The frontend recovery gap is LOOP-004.

## 5. Regression tests to add

| Finding | Test |
|---|---|
| LOOP-001 | Bank < 17: either `set(arena) ∩ set(sprint) == ∅` or a win pays 1.0×. |
| LOOP-002 | A list body returns 400 on answer and advance. |
| LOOP-003 | Two concurrent first GETs (Postgres) create one loop; restart works after duplicates. |
| LOOP-004 | Frontend unit or E2E: a network error on advance leaves the stage unchanged. |
| LOOP-005/006 | Advance without `from_stage` returns 400; `cleanup_cleared` comes from server answers. |

## 6. Summary

- The core state machine is sound. It is server-driven and locked; replays, double clicks, a second device, an intruder session, an expired session, cache loss and yesterday's loop are all handled correctly (15 of 19 scenarios OK).
- The reward flaw from Phase 3 (ECON-001: pays with zero answers) is the main loop risk. It is not repeated here.
- New problems found:
  - The frontend fakes completion offline (LOOP-004, P2).
  - Duplicate loop rows block restart (LOOP-003).
  - A small bank lets the arena reuse revealed answers (LOOP-001).
  - A list body causes a 500 (LOOP-002).
  - Stages 1 and 3 are unchecked (LOOP-005).
  - `from_stage` is optional (LOOP-006).
  - `/loop/answer/` has no throttle (LOOP-007).
- Not verified: real concurrency on Postgres, production question-bank size.
- Inputs for Phase 5: `backend/accounts/api.py`, `backend/accounts/jwt_auth.py`, `backend/accounts/utils.py:1-60,406-460`, `backend/accounts/api_urls.py`, `backend/config/ws_auth.py`, `backend/config/settings.py` (JWT/CORS/CSRF/cookies), `backend/accounts/permissions.py`, `backend/telegrambot/views.py`, `backend/telegrambot/handlers.py`, `frontend/src/lib/{api-client,auth-store,jwt,telegram,ws-client}.ts`.
