## Summary

Fixes for every code-fixable finding of the 2026-11-06 audit. This PR **includes the two P0 hotfix commits** from `fix/p0-security`, so it can replace that PR. Full mapping: `audit/11-fix-status.md` (on `feat/emerald-studio-redesign`).

| Commit | Area | Findings |
|---|---|---|
| `ec2bbd5` | Telegram payment callback: reviewer and channel check, atomic claim | SEC-PAY-001 (P0), ECON-006 |
| `c3e7958` | Next.js 16.4.5 | PROD-001 (P0) |
| `d83ce77` | `.dockerignore` (no `.env`, DB or screenshots in the image), non-root web container, Django 6.1.3 / Pillow 13 / DRF 3.18.3, nginx WS log off and admin rate limit, cron `flock`, CI hardening | PROD-002/003/007/008/009, AUTH-011 |
| `a1800b3` | Token-based open-answer grader (0 false positives on 120 audit cases), growth grader, CEFR gap, prompt fencing | GRADE-001…009, ECON-007, API-005 |
| `126d5c5` | Loop pays only for answered cycles, `update_fields` on profile writes, DB-backed caps (`core.RewardClaim`), reels 500, paid classroom mock lock, mission threshold, length limits | ECON-001…005, LOOP-*, API-001/002/004/006/008, FE-001/005, QA-001/004 |
| `3829bef` | Revocable JWTs (blacklist, rotation, logout, revoke on reset or block), real client IP lockout, Telegram login hardening, throttles, referral cap, global JSON-object parser | AUTH-001…013, API-003/007, PROD-010, QA-003 |
| `421adf2` | Frontend: no logout on network errors, no fake loop or XP state | FE-002/004, LOOP-004 |

## Test plan
- [x] Backend: 653 tests, OK (7 skipped, Postgres-only), run with `--parallel 4`
- [x] `makemigrations --check` clean (new migration `core/0009_reward_claim`, plus SimpleJWT `token_blacklist`)
- [x] `check --deploy` with production settings clean
- [x] Frontend `npm run build` and `npm run typecheck` pass
- [x] `npm audit --omit=dev --audit-level=critical` passes
- [x] Web image builds; `docker run … id` gives `uid=999(app)`; media is writable; no `.env`, DB or media in the image
- [x] `nginx -t` passes with the new config

## Deploy notes
1. Make sure the payment reviewers are superadmin or staff accounts with a linked `telegram_id`, or are listed in `PAYMENT_REVIEWER_TELEGRAM_IDS` in `backend/.env`.
2. Deploy, then recreate nginx (its config changed):
   ```bash
   cd /opt/ilmildizi && \
   git pull origin main && \
   docker compose up -d --build --no-deps web frontend && \
   docker compose up -d --force-recreate --no-deps nginx
   ```
3. The first `web` start `chown`s the existing media and static volumes to the new non-root user.
4. Install the updated cron: `crontab deploy/scripts/crontab.example` (review any local server edits first).
5. If a `web` image ever left the server, rotate `SECRET_KEY`, the bot token, the webhook secret and the Groq key.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
