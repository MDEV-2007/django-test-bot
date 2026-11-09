# PHASE 3 — XP, coins, streak, premium and reward economy

Run date: 2026-11-06. Baseline: HEAD `8454d8f` plus the uncommitted working tree (63 entries). No project code was changed.

Reproducers: `audit/test-data/phase3_reproducers.py` (9 tests). They ran only against the throwaway SQLite test DB, with all Telegram and AI secrets blanked. Each test **passes when the weakness is present**. All 9 passed (`Ran 9 tests … OK`).

PostgreSQL race tests (`tests/test_concurrency_postgres.py`) were **not run**, because no local Postgres was approved (see Phase 1). Every statement about real parallel requests below is therefore static analysis, unless it says otherwise.

## 1. Reward architecture

| Question | Answer (evidence) |
|---|---|
| Where XP/coins are written | `Profile.add_xp` / `add_coins` (`backend/accounts/models.py:115`, `:154`) lock the row with `select_for_update` and update with `F()`. `award_profile_rewards_atomic` / `grant_rewards_atomic` (`backend/core/rewards.py:99`, `:131`) do the same. Shop spend: `backend/shop/services.py:54` (`coins__gte` guard). Direct `F()` writes: `backend/b2b_ads/services.py:285`. Admin edit: `backend/panel/api.py:779`. |
| Who calls them | Test finish `tests_app/api.py:858-860`, loop `learning_loop/views.py:536,625`, bot battle `battles/api.py:188`, PvP `battles/consumers.py:454`, games `games/api.py:58,105,145`, study/flashcards/reels `learning/api.py:532,602,904`, social `award_capped_xp` (`learning/api.py:1020…1862`), missions `core/missions.py:36`, chest `core/rewards.py:220-252`, lucky bonus `core/rewards.py:325-333`, referrals `accounts/referrals.py:103`, duel invite `growth/arena_views.py:326`, teacher bonus `core/services.py:152`. |
| Does the server trust client values? | Mostly no. Test results, sprint and loop answers, battle and arena outcomes, the timeline game and the study duration are all computed on the server (`learning_loop/views.py:432-434`, `learning/api.py:588-594`, `games/api.py:37-52`). Loop `cleared_count` is clamped and only used for stats (`learning_loop/views.py:501-502`). |
| Daily caps | `core/reward_caps.py:16-41` (per-source counts) plus `claim_once` (`:58`). **These are stored only in the cache** (Redis in production, LocMem locally). The DB has no ledger for them. |
| Idempotency | Atomic "claim" updates: attempt finish (`tests_app/api.py:844`), battle finish (`battles/api.py:175`, `consumers.py:434`), mission (`core/missions.py:33`), panel payment approve (`panel/api.py:1502`). Loop transition happens under `select_for_update` (`learning_loop/views.py:452`). Chest: `DailyChestClaim` is `unique_together (profile, date)` (`core/models.py:128`). |
| Streak | `Profile.update_streak` (`accounts/models.py:168`) uses `timezone.localdate()`. It is called from login (`accounts/api.py:49`), **dashboard GET** (`dashboard/api.py:22`), test finish, study, flashcards and reels. |
| Premium | `Profile.is_premium` + `premium_expires_at`. Access checks use expiry (`accounts/models.py:211-216`, `is_vip_active` `:219`). Only `Payment.apply_to_profile` (`premium/models.py:106`) sets it, called from the panel (`panel/api.py:1506`) or the Telegram callback (`telegrambot/payment_review.py:237`). |
| Payment provider | **None.** It is a manual card transfer, then a screenshot upload, then an admin approves in the panel or the Telegram channel. There are no webhook signatures, provider order IDs, refunds or chargebacks to audit. |

## 2. Findings

### SEC-PAY-001 — Any Telegram user can approve their own payment by sending a forged callback
- **P0. Server side CONFIRMED. Client side NEEDS VERIFICATION on live Telegram.**
- `backend/telegrambot/handlers.py:413-427` sends every `callback_query` whose `data` starts with `pay_approve_` / `pay_reject_` to `handle_payment_callback` (`backend/telegrambot/payment_review.py:185`). **Neither function checks that `chat_id` is the payment channel (`get_payment_channel_ids()`, `:30`) or that `from.id` is an admin.**
- Repro (`PaymentCallbackTests` in the reproducer file):
  1. Create a pending `Payment`. The checkout flow allows this with any image (`premium/api.py:66-93`).
  2. Deliver a `callback_query` from a **private chat**, from a non-admin user (`username: not_admin`), with data `pay_approve_<id>`. It goes through `process_update` and also through `/telegram/webhook/` with a valid secret.
  3. Result: `payment.status = approved`, `is_premium = True`, and `admin_note = "…@not_admin tomonidan tasdiqlandi."`
- Why a real user can send this: per the Telegram Bot API docs, `CallbackQuery.data` can contain data that is not present in any button of the message. Custom MTProto clients can send arbitrary data for any bot message they can see, for example the `check_subscription` button the bot sends to every user (`handlers.py:430`). The payment ID is returned to the buyer (`premium/api.py:93`). Not reproduced against real Telegram on purpose.
- Effect: free PRO subscription or paid mock tests for anyone. It also gives a free **reject** of other users' payments (`pay_reject_<other id>`) — a sabotage vector, because IDs are sequential.
- Fix: in `handle_payment_callback`, require `str(chat_id) in get_payment_channel_ids()` **and** that `from.id` belongs to a staff or superadmin `Profile.telegram_id` (or an allow-list in settings). Make the transition atomic with `filter(pk=…, status='pending').update(...)`, as `panel/api.py:1502` already does.
- Regression: the two reproducer tests, flipped to expect `pending`, plus a positive test from the channel by an admin.

### ECON-001 — Learning Loop pays its full reward without answering a single question
- **P1, CONFIRMED.** `backend/learning_loop/views.py:438-548`.
- Repro (`test_ECON_001…`): GET `/api/v1/loop/current/`, then 4× POST `/advance-stage/` with `payload: {}` and **no** `/loop/answer/` calls. Stages go 2 → 3 → 4 → 5. The reward is `coins 200, xp 100, free_essay_credits 1, arena_won False`. Then `restart-cycle` twice more (`MAX_CYCLES_PER_DAY = 3`, `:25`) gives **600 coins + 300 XP + 3 free AI essay credits per day**. It also unlocks the daily chest, because `daily_chain_completed` (`core/rewards.py:27`) is true once any loop reaches STAGE_5. The chest pays up to 400 coins times the streak bonus.
- Cause: the server checks stage *order*, but not that a stage was *done*. Stage 2 with zero answers counts all questions as mistakes and moves on to Stage 3. Stage 3 has no check. Stage 4 pays the 1.0× base on a loss (`:532`), and a loss includes "no answers at all" (`arena_won = bool(results) and …`, `:517`).
- Effect: a script or bot farms coins (shop items, streak freezes), XP (leaderboard) and paid AI essay credits (real Groq cost) for each account. It needs no study at all.
- Fix: require answers to all sprint questions before advancing from Stage 2, and require at least one answered arena question before paying (or pay 0 when `results` is empty). Optionally scale the reward by `player_correct`.
- Regression: advancing with no answers must give `rewards_awarded.coins == 0` (or a 409).

### ECON-002 — Streak grows by just opening the dashboard (or logging in)
- **P2, CONFIRMED.** `backend/dashboard/api.py:22` (`GET /api/dashboard/home/` calls `profile.update_streak()`) and `backend/accounts/api.py:49` (every login or token issue).
- Repro (`test_ECON_002…`): with streak 5 and last active yesterday, one GET makes the streak 6.
- This contradicts the guard in `learning/api.py:604-606` ("streak only from a real ≥ 5-minute session"). The streak drives money: the chest streak bonus (`core/rewards.py:79`, `calculate_streak_bonus_pct` `:14`), achievements, and the Telegram streak reminder. Streak freezes are also spent by this path (`shop/services.py:182`).
- Fix: count the streak only on a real learning action (test finish, a loop stage with answers, a study session) and remove it from `home_api` and `_auth_response`.

### ECON-003 — `update_streak()` does a full `Profile.save()` and overwrites concurrent changes (coins, premium)
- **P1. Lost update CONFIRMED with simulated interleaving. Real race LIKELY (Postgres not run).**
- `backend/accounts/models.py:193` calls `self.save()` with no `update_fields`, so every column is written from the in-memory object. `Payment.apply_to_profile` (`backend/premium/models.py:121`) also uses a full `profile.save()`.
- Repro (single-threaded interleaving that stands in for two overlapping requests):
  - `test_ECON_003…`: request A loads the profile (coins 500). Request B buys a 300-coin item (coins 200). Then A's `update_streak()` runs and **coins are back to 500**: a free item.
  - `test_ECON_003b…`: A loads the profile. Then a payment is approved (`is_premium=True`). Then A's `update_streak()` runs and gives **`is_premium=False`, `premium_expires_at=None`**: the customer paid but lost premium.
- Real window: `home_api` loads the profile and then saves it (`dashboard/api.py:21-22`). Test finish loads `request.user.profile` and calls `add_xp`, `add_coins`, then `update_streak` (`tests_app/api.py:851-860`). Any shop purchase, chest, loop reward, admin approval or ELO update that commits inside that window is reverted. The dashboard is called on every app open, so these collisions are realistic.
- Fix: in `update_streak`, use `save(update_fields=['streak', 'last_active_date'])` (or a locked `select_for_update` re-read plus `update()`). In `apply_to_profile`, use `update_fields=['is_premium', 'premium_expires_at', 'premium_mock_test_unlocked']`. Also check `Profile.save()` callers in `panel/api.py:779` and the elsewhere-noted battles code.
- Regression: both reproducers, flipped. Add a Postgres two-thread test in `tests/test_concurrency_postgres.py`.

### ECON-004 — Daily caps keyed on the server OS date, not the Tashkent date
- **P3, CONFIRMED.** `backend/core/reward_caps.py:48` uses `date.today()`. The project uses `TIME_ZONE='Asia/Tashkent'`, and the container has no `TZ` set (`Dockerfile`, `docker-compose.yml`), so it runs on UTC.
- Repro (`test_ECON_004…`): at 02:00 Tashkent on Nov 7, the cap key is `…:2026-11-06`, while `localdate = 2026-11-07`.
- Effect: caps reset at 05:00 Tashkent time, not midnight. A user can collect up to 2× a daily cap inside one local calendar day, but still 1× per 24 hours. Caps also disagree with `claim_once` keys that use `timezone.localdate()` (`games/api.py:96`, `learning/api.py:529`). The same pattern appears in `learning/api.py:169` and `learning/services.py:29`.
- Fix: `timezone.localdate()`.

### ECON-005 — Caps and "first try" guards live only in the cache
- **P2, LIKELY** (Redis restart not reproduced).
- `core/reward_caps.py:45-60` stores counts and `claim_once` markers only in the cache. Production Redis is `redis:7-alpine` with a `/data` volume and default RDB snapshots (`docker-compose.yml`). A restart, a manual `FLUSHALL` or `allkeys-*` eviction loses up to several minutes of keys, or all of them.
- Then:
  - daily caps restart from 0;
  - `game_map_try` / `game_character_try` "first attempt" markers disappear, so a student who saw the correct answer after a wrong try can resubmit and be paid (`games/api.py:96-98`);
  - `study_session_started` keys disappear (harmless, they pay 0);
  - and so on.
- Locally (LocMem, a cache per process) caps are per worker, so with `WEB_CONCURRENCY=4` the cap is up to 4×. That only applies if Redis is not configured, and production refuses to start without `REDIS_URL` (`settings.py:305-320`).
- Fix: keep money-relevant idempotency in the DB (unique `(profile, source, date, item)` rows). Keep the cache only for rate limits.

### ECON-006 — Telegram approve/reject is check-then-act (double approval)
- **P2, LIKELY** (race needs Postgres).
- `telegrambot/payment_review.py:210-238` reads `payment.status`, then calls `apply_to_profile()` and `save()` with no lock or conditional update. If two admins press "approve" at the same time, the plan duration is added twice (`premium/models.py:117-120`), or an approve and a reject both run. The panel path already does this correctly (`panel/api.py:1500-1506`).
- Fix: the same conditional `update(status='approved')` claim. It is part of the SEC-PAY-001 fix.

### ECON-007 — Open-answer false positives turn into XP and coins
- **P2, CONFIRMED (code path).** Test finish pays `correct × 50 XP` and `correct × 5 coins` (`tests_app/api.py:856-857`). `correct` includes `open_written` items graded by `is_deterministic_match`, which accepts one-letter and shotgun answers (Phase 2: GRADE-001…003).
- Repeats of the same test pay nothing (`:852-854`), so the gain is limited to the first attempt on each test, but it is still free XP or coins and a wrong leaderboard rank. Fixing Phase 2 fixes this.

### Checked and not reproduced / OK
- **Client-sent reward values.** `study/complete` with `duration_minutes=-999, goals_done=10**12` pays 0 (`test_ECON_005`, NOT REPRODUCED). Existing tests also cover client `from_stage` skipping, instant study completion, timeline replay, flashcard repeats, mission double pay and battle double finish (`tests/test_reward_economy.py`, `tests/test_rewards_b2b_safety.py`, `tests/test_anti_cheat.py`). All pass (Phase 1).
- **Premium expiry.** Access goes through `has_active_premium_lessons` (`accounts/models.py:211-216`), which checks `premium_expires_at > now`. An expired subscription gives no access (static check). No code path reads a raw `is_premium` for gating, apart from the achievement badge (`core/achievements.py:43`) and display or export.
- **Refund / cancel.** Not implemented. There is no path that revokes premium after approval. With manual card transfers, refunds are an off-platform admin action. This is documented as a gap, not a bug.
- **Amount and ownership on checkout.** The amount comes from the server (`premium/api.py:81-82`), and the payment belongs to `request.user`. The screenshot is validated (`validate_screenshot`).
- **Shop overdraw.** Guarded by `select_for_update` plus `coins__gte` (`shop/services.py:36-57`). Not verified under real concurrency (needs Postgres).

## 3. Regression tests to add (when fixing)

| Finding | Test |
|---|---|
| SEC-PAY-001 | Callback from a non-channel chat or a non-admin leaves the payment `pending`. A channel admin approves. Two approvals add the duration once. |
| ECON-001 | A loop advanced with zero answers pays 0 (or returns 409). A loop with all answers pays the full reward. |
| ECON-002 | `GET /api/dashboard/home/` and login do not change `streak`. |
| ECON-003 | Stale-instance `update_streak()` keeps coins and premium changed by others. Postgres two-thread variant. |
| ECON-004 | The cap key uses `timezone.localdate()` at 02:00 Tashkent time. |
| ECON-005 | A DB-backed claim survives `cache.clear()`. |
| ECON-006 | Two sequential callbacks for the same payment extend premium once. |

## 4. Summary

- **P0:** SEC-PAY-001. The Telegram payment approval callback does not check chat or admin, so a self-approved free PRO is confirmed server side.
- **P1:**
  - ECON-001: the loop pays 600 coins, 300 XP and 3 AI credits a day, plus the chest, with zero answers.
  - ECON-003: full `Profile.save()` in `update_streak` reverts concurrent coin spends and premium approvals.
- **P2:**
  - ECON-002: the streak grows from a dashboard GET or a login.
  - ECON-005: caps live only in the cache.
  - ECON-006: Telegram approval is a check-then-act race.
  - ECON-007: grading false positives turn into XP and coins.
- **P3:** ECON-004, daily caps follow the UTC date.
- **Not verified:** real-parallel behaviour on Postgres, Redis restart behaviour, and live Telegram callback forgery.
- Inputs for Phase 4: `backend/learning_loop/views.py`, `backend/learning_loop/models.py`, `backend/sprint/services.py` (`submit_quiz_answer`, `create_quiz_session`), `backend/sprint/models.py:150-160`, `backend/tests/test_audit_loop_battle_stress.py`, `backend/tests/loop_helpers.py`, and the frontend loop page under `frontend/src/app/` (Learning Loop / autopilot).
