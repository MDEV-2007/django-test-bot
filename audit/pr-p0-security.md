## Summary

Hotfix for the two P0 findings from the 2026-11-06 audit (`audit/09-final-report.md` on `feat/emerald-studio-redesign`).

### SEC-PAY-001 + ECON-006: Telegram payment-review callback (`ec2bbd5`)
- `pay_approve_<id>` / `pay_reject_<id>` callbacks were accepted from **any chat and any user**. A Telegram client can send arbitrary callback data for any bot message it can see, so a student could approve their own pending payment (free PRO or paid mocks) or reject someone else's.
- The callback is now accepted only from a payment channel (`get_payment_channel_ids()`) **and** only from a reviewer:
  - a superadmin or staff account with a linked `telegram_id`, **or**
  - an id listed in the new `PAYMENT_REVIEWER_TELEGRAM_IDS` setting (comma-separated env var).
- The decision is applied with an atomic `pending → approved/rejected` claim, in the same transaction as `apply_to_profile()`. A double press, or two admins pressing at once, extends premium only once.
- Unknown actions and payments that are not `pending` yet are rejected.

### PROD-001: Next.js RCE advisory (`c3e7958`)
- `next` goes from 16.3.1 to **16.4.5**. Versions 16.0.0–16.4.0 carry a critical advisory: unauthenticated RCE in the Image Optimization API when AVIF is used, and this app enables `images.formats: ['image/avif', 'image/webp']`.
- In the lockfile, only `next` and its own image dependencies change.

## Test plan
- [x] `backend/tests/test_payment_callback_security.py` adds 11 tests. Before the fix, 5 failed and reproduced the bug; after it, all 11 pass.
- [x] Full backend suite: 601 tests, 1 failure, 7 skipped. The failure is the pre-existing stale test `learning.tests.StudyCompleteTests.test_standard_session_rewards_25xp_10coins_and_streak`, which also fails on `main` today and is unrelated to this change.
- [x] `makemigrations --check`: no changes.
- [x] `npm run build` passes (93 pages).
- [x] `npm run typecheck` passes, after build-generated types exist.
- [x] `npm audit --omit=dev` no longer lists `next`.

## Before deploying
Make sure everyone who approves payments in the channel is either a superadmin or staff account with a linked `telegram_id`, or is listed in `PAYMENT_REVIEWER_TELEGRAM_IDS` in the server's `backend/.env`. Otherwise nobody can approve.

Deploy, both services:
```bash
cd /opt/ilmildizi && \
git pull origin main && \
docker compose up -d --build --no-deps web frontend && \
docker compose exec nginx nginx -s reload
```

🤖 Generated with [Claude Code](https://claude.com/claude-code)
