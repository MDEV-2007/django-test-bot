# PHASE 5 — Authentication, JWT, Telegram login and authorization

Run date: 2026-11-06. Baseline: HEAD `8454d8f` plus the uncommitted working tree (63 entries). No project code was changed.

Reproducers: `audit/test-data/phase5_reproducers.py`, 12 tests run on the SQLite test DB with the network mocked (`Ran 12 tests … OK`). They use synthetic bot tokens such as `123:REAL`; the real token was never used.

This phase is not a production pentest. The full endpoint permission matrix is Phase 6; this phase covers the auth layer and the high-risk ownership spots.

## 1. JWT (spec §5.1)

| Item | State | Evidence |
|---|---|---|
| Library / algorithm | SimpleJWT 5.5.1, HS256 signed with `SECRET_KEY` (default) | `backend/config/settings.py:470-475` |
| Lifetimes | Access 60 min, refresh **30 days** | same |
| `iss` / `aud` / `nbf` | Not set or checked. `exp`, `iat` and `jti` are present by default. | same |
| Rotation / reuse detection | `ROTATE_REFRESH_TOKENS: False`; `rest_framework_simplejwt.token_blacklist` is not installed (`INSTALLED_APPS`, `settings.py:148-182`) | AUTH-010 |
| Logout / revoke | Client-side only: the frontend clears `localStorage` (`frontend/src/lib/auth-store.ts:111-114`). There is no server endpoint. | AUTH-002 |
| Password change / reset invalidates tokens | **No.** The only reset is the admin one, `panel/api.py:742-751`. | AUTH-002 |
| Signing key rotation | Rotating `SECRET_KEY` kills every token and session at once. No separate `SIGNING_KEY` and no key ID. | — |
| Storage | Access and refresh in `localStorage` (`auth-store.ts:79-81`), so any XSS steals a 30-day refresh. HTML sanitising is in place (`core/html_sanitize.py`, nh3); XSS itself is out of scope here. | — |
| Cookies | The API does not use cookies (Authorization header, `CORS_ALLOW_CREDENTIALS` off, `settings.py:65-72`). The Django admin session cookie is `Secure` in production (`:409-410`) with the default `SameSite=Lax`. | — |
| Token in URL | **WebSocket uses `?token=<access JWT>`** (`config/ws_auth.py:34-37`, `frontend/src/lib/ws-client.ts:12`), and nginx `/ws/` has access logging on (`deploy/docker/app_routes.inc:79-90`, no `access_log off`). | AUTH-011 |
| Deactivated user | HTTP access token → 401, refresh → 401 (SimpleJWT `CHECK_USER_IS_ACTIVE`). **WebSocket still accepts the token.** | AUTH-003 / AUTH-004 |

## 2. Telegram login / Mini App (spec §5.2)

| Check | State | Evidence |
|---|---|---|
| HMAC per the official algorithm | Correct: secret = `HMAC_SHA256("WebAppData", bot_token)`, data-check-string sorted `key=value` with `\n`, `compare_digest` | `backend/accounts/utils.py:406-450`; `[TG-OK] tampered user id -> 401` |
| `auth_date` freshness | 24 h max; older is rejected | `utils.py:403`, `:444-449`; `auth_date 25h old -> 401` |
| Replay | Not prevented inside 24 h (no nonce or `query_id` store) | AUTH-005 |
| Bot token only on the server | Yes (`settings.py:74`). The frontend gets only `telegram_bot_username` (`accounts/api.py:55-61`). | — |
| Client `user_id` / username trusted only after HMAC | Yes; `user` is parsed only after verification (`accounts/api.py:191-199`) | — |
| Empty bot token | **Not guarded**: HMAC with an empty key is forgeable | AUTH-006 |
| Account linking | Falls back to `telegram_username` when no profile has the `telegram_id` | AUTH-007 |
| Webhook | Secret header is required and compared with `compare_digest`; it refuses when the secret is unset | `telegrambot/views.py:31-49` |
| Bot command / callback authorization | **Payment approve/reject callback has no admin or chat check** (Phase 3 SEC-PAY-001, P0). Other callbacks (`premium_menu`, `referral_info`, `buy_plan_*`, `check_subscription`) act only on the caller's own chat. | `telegrambot/handlers.py:411-450` |

Google login: `verify_oauth2_token` checks signature, issuer, expiry and audience, and requires `email_verified` (`backend/accounts/utils.py:15-38`). Linking to an existing user by verified email (`accounts/api.py:144-148`) is acceptable.

## 3. Authorization and ownership (spec §5.3) — spot checks

- **Default.** DRF uses `IsAuthenticated` (`settings.py:452-454`). Role classes are `IsTeacher` and `IsSuperAdmin` (`backend/accounts/permissions.py:111-124`). Roles cannot be self-assigned: `profile_api` only writes `first_name`, `last_name`, `exam_track`, `region` and avatar (`accounts/api.py:327-360`), and `ProfileSerializer` marks identity fields read-only (`accounts/serializers.py:6-25`).
- **AllowAny endpoints.** 32 across 11 files: accounts 5, learning 11, core 3, dashboard 2, growth 3, panel 2, premium 2, tests_app 2, sprint 1, b2b_ads 1. `premium/api.py:127` also sets `authentication_classes = []` (parent checkout by token). Each one is checked in Phase 6.
- **Ownership examples checked OK:**
  - `payment_status_api` filters by `profile__user=request.user` (`premium/api.py:192`);
  - the payment screenshot is served only to the owner or staff (`premium/api.py:212-220`);
  - the loop/sprint session is filtered by `user` (Phase 4 #9 → 404);
  - nginx blocks `/media/payment_screenshots/`, `/media/classroom/receipts/` and `/media/backups/` (`deploy/docker/app_routes.inc:44-59`).
- **Broken authorization found:** SEC-PAY-001 (Phase 3). There the actor is any Telegram user, not an API user.

## 4. Findings

### AUTH-001 — Login brute-force lockout bypassed by rotating `X-Forwarded-For`
- **P1, CONFIRMED.**
- `backend/accounts/utils.py:67-71` takes the **first** XFF entry as the client IP. Production nginx appends to the incoming header (`proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;`, `deploy/docker/app_routes.inc:98`), so the first value is whatever the client sent. The lock key is `(username, ip)` (`utils.py:74-76`).
- Repro: 9 failures from one IP → 429. Then 30 more failures with `X-Forwarded-For: 10.0.0.<i>` → all 401, never 429. The correct password still works after 39 failures: `[AUTH-001] … rotating XFF codes: [401] | correct password after 39 failures: 200`.
- Effect: unlimited online password guessing against any username. Usernames are public on leaderboards and profiles. The password policy (Django validators, min 8) is the only defence.
- Fix: use `REMOTE_ADDR` behind the trusted proxy (nginx sets `X-Real-IP $remote_addr`, `:97`; or take the **last** XFF hop). Add a per-username global cap independent of IP. Regression: rotating XFF still hits 429.

### AUTH-002 — Tokens survive a password reset; there is no server-side logout
- **P1, CONFIRMED.**
- With no blacklist and no password-bound claim (`settings.py:470-475`), the refresh token keeps working for 30 days after the password changes. Repro: `after password reset: refresh -> 200 | old access /me -> 200`.
- Also: refresh is not rotated and can be reused indefinitely (`[AUTH-010] refresh returns new refresh: False | same refresh reused -> 200`).
- Effect: after a phone loss, an XSS or a stolen `localStorage`, neither the user nor an admin can kick the attacker out. An admin password reset (`panel/api.py:742`) gives no protection for 30 days. Deactivating the user does work (AUTH-003), except for WebSockets (AUTH-004).
- Fix: enable `token_blacklist`, `ROTATE_REFRESH_TOKENS=True` and `BLACKLIST_AFTER_ROTATION=True`; add a logout endpoint that blacklists; on password change, blacklist the user's outstanding tokens (or add a `password_changed_at` / token-version claim checked in `AuditAwareJWTAuthentication`). Shorten refresh to 7–14 days.

### AUTH-003 — Deactivated users: HTTP is correctly blocked (not a finding)
- NOT REPRODUCED. `banned user: refresh -> 401 | access /me -> 401`.

### AUTH-004 — WebSocket ignores `is_active` and stays open after a ban
- **P2, CONFIRMED.** `backend/config/ws_auth.py:21-28` resolves `User` from the token without checking `is_active`. Repro: `WS user for banned account -> victim | authenticated: True`.
- Effect: a banned user keeps PvP battles (with XP/coin rewards, `battles/consumers.py:454`) for up to 60 min per access token. A demoted superadmin's open `ws/panel/notifications/` socket keeps receiving admin events until it disconnects (the role is checked only on connect, `panel/consumers.py:18-22`).
- Fix: `if not user.is_active: return AnonymousUser()`. Re-check the role periodically or close sockets on role change.

### AUTH-005 — Telegram `initData` can be replayed for 24 h
- **P2, CONFIRMED.** `utils.py:403` allows 24 h and nothing records used `hash` / `query_id` values. Repro: `same 23h-old initData replayed 3x -> [200, 200, 200]`.
- Effect: anyone who gets a user's `initData` in that window (shared screen, logs, a browser extension, a forwarded Mini App link with a `tgWebAppData` fragment) gets a fresh 30-day refresh token for that account.
- Fix: cut the max age to 5–15 min (the Mini App re-signs on every open); optionally store the hash with a short TTL to block exact replay.

### AUTH-006 — Telegram login is forgeable when `TELEGRAM_BOT_TOKEN` is empty
- **P2, CONFIRMED in test settings. Production state NEEDS VERIFICATION.**
- `telegram_login_api` (`accounts/api.py:186-192`) passes `settings.TELEGRAM_BOT_TOKEN` straight to the HMAC check. With `''` anyone can compute the hash. Repro: `TELEGRAM_BOT_TOKEN empty -> forged initData for tg_id 777 -> 200 tg_victim` (that is a takeover of the account linked to Telegram ID 777).
- The production guard (`settings.py:305-330`) checks only `DATABASE_URL`, `REDIS_URL` and `SECRET_KEY`. Production almost certainly has the token (the bot works), but staging, preview or any environment with Mini App login and no token is open to full account takeover.
- Fix: return 503 when the token is empty, and add `TELEGRAM_BOT_TOKEN` to the `DEBUG=False` guard.

### AUTH-007 — First Mini App login is linked by `telegram_username`
- **P3, CONFIRMED (behaviour). Exploitability LIKELY low.**
- `accounts/api.py:220-227`: when no profile has this `telegram_id`, the login attaches to any profile whose `telegram_username` matches and whose `telegram_id` is null. Repro: `first Mini App login of @ali_tg lands in account -> legacy_web`.
- Users cannot set `telegram_username` through the API (it is not editable in `profile_api`). It comes from the bot, the backfill command (`telegrambot/management/commands/backfill_telegram_usernames.py:70`) and admin edits. Telegram usernames are reassignable, so a new holder of a released handle would take over the old web account.
- Fix: link only by `telegram_id`; offer explicit linking from a logged-in session.

### AUTH-008 — No rate limit on register, Telegram login, Google login or refresh
- **P2, CONFIRMED.** `DEFAULT_THROTTLE_RATES` has only `quiz_session` and `quiz_answer` (`settings.py:464-467`), and there is no global throttle. Repro: `40 rapid registrations -> {200: 40}`.
- Effect: mass fake accounts (see AUTH-009), leaderboard spam, DB growth. Each Telegram login also triggers a `getUserProfilePhotos` request to Telegram (`accounts/api.py:252`, `sync_telegram_avatar`), which amplifies load.
- DRF anonymous throttles key on the full XFF string when `NUM_PROXIES` is unset, so they also need `NUM_PROXIES=1` to resist spoofing (same root cause as AUTH-001).

### AUTH-009 — Referral bonus is unlimited, so scripted signups farm coins
- **P2, CONFIRMED.** `accounts/referrals.py:20-47` pays the referrer `REFERRAL_BONUS_COINS = 10` (`:15`) per new account with no cap, no per-IP or device limit and no activity requirement. Combined with AUTH-008: `referrer coins 0 -> 250 after 25 scripted signups`. Each new account also gets 10 coins.
- Fix: pay the referrer only after the referee does a real learning action, with a daily or total cap.

### AUTH-011 — Access JWT in the WebSocket URL is written to nginx access logs
- **P2, CONFIRMED (config). Logs not inspected.** `/ws/` is proxied with the default access log (`deploy/docker/app_routes.inc:79-90`). The `combined` format logs the request line, including `?token=…`. Everyone with log access (docker logs, backups, log shipping) can reuse a token for up to 60 min. Spec §5.1 asks that tokens never go in URLs.
- Fix: `access_log off;` (or a custom format without `$request_uri`) on `/ws/`, or authenticate the socket with a short-lived one-time ticket from `POST /api/ws-ticket/`.

### AUTH-012 — Signed but malformed `initData.user` gives 500
- **P3, CONFIRMED.** `accounts/api.py:199`: `json.loads(user_json)` has no try/except. Repro: `signed non-JSON user -> 500`. Only Telegram (or anyone holding the token) can sign, so this is robustness, not security.

### AUTH-013 — Dev tunnel domains trusted in production
- **P3, CONFIRMED (config).** `settings.py:42-55` always adds `.loca.lt`, `.ngrok-free.*` and `.ngrok.io` to `ALLOWED_HOSTS` and `CSRF_TRUSTED_ORIGINS`, including when `DEBUG=False`. Anyone can register those subdomains.
- Impact is limited: the API uses no cookies, the admin session cookie is `SameSite=Lax`, and those suffixes are separate sites. It is still an unneeded trust; drop them when `DEBUG=False`.
- WebSockets also lack `AllowedHostsOriginValidator` (`config/asgi.py:34-36`). With the session-cookie fallback and `SameSite=Lax` this is low risk; marked P3 LIKELY.

## 5. Rate limiting and abuse (spec §5.4)

| Endpoint | Limit | Status |
|---|---|---|
| `POST /api/auth/login/` | 8 failures per (username, IP) per 15 min | Bypassable (AUTH-001) |
| register / telegram / google / refresh | none | AUTH-008 |
| Test submit, sprint answer | `quiz_answer` 120/min, `quiz_session` 30/min (`sprint/views.py:277,370`, `growth/views.py:229`) | OK |
| Loop answer | none | Phase 4 LOOP-007 |
| Reward endpoints | Daily caps in the cache (Phase 3) | ECON-005 |
| Account lockout / adaptive throttling | none beyond the above | — |
| Enumeration | Register says "Bu foydalanuvchi nomi band!" (`accounts/api.py:109-110`); login uses a generic error | Acceptable (usernames are public anyway) |
| Upload | Payment screenshot validated (`validate_screenshot`); nginx `client_max_body_size 150M` | Detailed in Phase 6 |

## 6. Regression tests to add

AUTH-001 rotating XFF still locks out · AUTH-002 refresh rejected after password reset or logout, and rotation blacklists the old refresh · AUTH-004 WS rejects an inactive user · AUTH-005 initData older than N minutes is rejected · AUTH-006 empty token returns 503 · AUTH-007 no username-based merge · AUTH-008/009 register throttled and referral capped · AUTH-011 nginx config test (no `$request_uri` on `/ws/`) · AUTH-012 malformed user returns 400.

## 7. Summary

- **What holds:** Telegram HMAC and Google ID-token verification are implemented correctly (tampered and old data rejected, `email_verified` required). The webhook secret is enforced. Roles cannot be self-assigned. Spot-checked ownership filters are correct.
- **P1:**
  - AUTH-001: login lockout bypassed through a spoofed `X-Forwarded-For` (unlimited brute force).
  - AUTH-002: no token revocation — tokens survive a password reset, there is no logout and refresh is reusable for 30 days.
- **P2:**
  - AUTH-004: WebSocket accepts banned users.
  - AUTH-005: 24 h initData replay.
  - AUTH-006: forgeable Telegram login when the token is empty.
  - AUTH-008: no throttle on register or social login.
  - AUTH-009: unlimited referral coins.
  - AUTH-011: JWT in the WS URL is logged.
- **P3:** AUTH-007, AUTH-012, AUTH-013.
- Phase 3 SEC-PAY-001 (P0) is the most serious authorization flaw found so far.
- **Not verified:** production env values (token presence, real nginx log format), live Telegram behaviour, XSS surface.
- Inputs for Phase 6: every `*/api_urls.py` / `urls.py`, `backend/panel/api.py` (largest surface), `backend/teacher/api.py`, `backend/classroom/api.py`, `backend/learning/api.py`, `backend/tests_app/api.py`, `backend/tests_app/cefr_api.py`, `backend/growth/*.py`, `backend/b2b_ads/views.py`, `backend/core/views.py`, `docs/stabilization/permission-matrix.md` (prior matrix, to compare).
