<div align="center">

<img src="frontend/public/icon.png" width="96" height="96" alt="IlmIldizi" />

# IlmIldizi

**Gamified education platform for Uzbek students — as a website *and* a Telegram Mini App.**

Tests · spaced-repetition revision · analytics · coin shop · streaks · battles · mini-games

[![Django](https://img.shields.io/badge/Django-6.0-092E20?logo=django&logoColor=white)](https://www.djangoproject.com/)
[![Python](https://img.shields.io/badge/Python-3.12+-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![Tests](https://img.shields.io/badge/tests-67%20passing-success)](tests/RESULTS.md)
[![Telegram](https://img.shields.io/badge/Telegram-Mini%20App-26A5E4?logo=telegram&logoColor=white)](https://core.telegram.org/bots/webapps)

</div>

---

## What it does

| | |
|---|---|
| 📝 **Tests** | Six question types — single choice, image, table, matching, grouped, and open written (AI-graded) |
| 🔁 **Mistake revision** | Wrong answers become a spaced-repetition deck you retry until correct |
| 📊 **Analytics** | Radar mastery chart, accuracy, weekly/daily progress, subject distribution |
| 🛍️ **Coin shop** | Earn coins, buy avatars, frames, themes, titles — and Streak Freeze |
| 🔥 **Streaks** | Daily streak with automatic freeze protection and Telegram reminders |
| ⚔️ **Battles & games** | 1v1 arena, timeline, map challenge, guess-the-figure |
| 👩‍🏫 **Two panels** | Super-admin panel and a teacher panel scoped to a teacher's own content |

Built with **Django 6 · Tailwind · Alpine · HTMX · Chart.js**.

---

## Quick start

**Backend (Django — faqat JSON API):**

```bash
git clone <repo-url> && cd django-test-bot/backend

python -m venv .venv
.venv\Scripts\activate                 # Windows
# source .venv/bin/activate            # macOS / Linux

pip install -r requirements/dev.txt
cp .env.example .env                    # then set SECRET_KEY

python manage.py migrate
python manage.py seed_shop              # shop catalogue
python manage.py createsuperuser
python manage.py runserver 8001
```

**Frontend (Next.js — butun interfeys):**

```bash
cd frontend
npm install
npm run dev                             # http://localhost:3000
```

Django sahifalari yo'q: `/api/...` (JSON) va `/admin/` dan boshqa marshrut qolmagan.

<details>
<summary><b>Running the Telegram bot locally</b></summary>

**Option 1 — polling.** Needs no public URL, simplest for development:

```bash
python manage.py set_webhook --delete
python manage.py run_bot_polling
```

**Option 2 — webhook via a tunnel.** Exercises the real production path. Telegram
requires HTTPS, so `localhost` alone will not work. Three terminals:

```bash
python manage.py runserver 8000                      # 1
ngrok http --url=https://<your>.ngrok-free.dev 8000   # 2  (port must match!)
python manage.py set_webhook --url https://<your>.ngrok-free.dev   # 3, once
python manage.py set_webhook --info                   # verify: url set, no last_error
```

Webhook and polling are mutually exclusive — always `set_webhook --delete` before
switching back to polling, or Telegram will keep delivering to the webhook instead.

</details>

---

## Project layout

```
backend/         Django — JSON API, modellar, biznes mantiq
  config/        settings, root urls, wsgi/asgi
  accounts/      users, profiles, roles, auth
  tests_app/     questions, test sets, attempts, revision deck
  learning/      topics, lessons, video/audio, flashcards
  analytics/     mastery, dashboard aggregation, DTM ball bashorati
  shop/          coin shop, inventory, purchases, streak freeze
  leaderboard/   cached rankings
  telegrambot/   bot handlers, webhook, management commands
  panel/         super-admin API
  teacher/       teacher API + o'qituvchi-orqali-sinf (referral, sinf dashboardi)
  core/          missions, badges, notifications, background executor, AI client
  scripts/       one-off seed scripts
  tests/         automated test suite  →  see backend/tests/RESULTS.md
  requirements/  base / dev / prod dependency split
frontend/        Next.js 16 + shadcn/ui — butun foydalanuvchi interfeysi
deploy/          nginx, systemd, VPS qo'llanma
```

---

## Tests

```bash
python manage.py test tests
```

```
Ran 67 tests — OK
```

Coverage spans every page, shop money-safety, streak-freeze rules, the revision
deck, webhook authentication and role-based access.
**Full breakdown → [`tests/RESULTS.md`](tests/RESULTS.md)**

---

## Frontend

Interfeys `frontend/` da: Next.js 16, Tailwind v4, shadcn/ui, `motion`.
Django shablonlari (`templates/`, `static/`) **butunlay olib tashlandi** — eski
Tailwind CLI qurilishi ham kerak emas.

```bash
cd frontend
npm run dev            # ishlab chiqish serveri
npm run build          # produksiya qurilishi
```

## Deployment

Everything scale-related is an **environment variable** — no code changes.

| Variable | Effect |
|---|---|
| `DATABASE_URL` | SQLite → PostgreSQL, with persistent connections |
| `REDIS_URL` | Moves **cache and sessions** to Redis (shared across workers) |
| `DEBUG=False` | HTTPS redirect, HSTS, secure cookies, hashed + compressed static |
| `TELEGRAM_WEBHOOK_SECRET` | Required — the webhook refuses to run without it |

> Served by **Daphne** (ASGI) rather than gunicorn — needed for Battle Arena's live PvP
> WebSockets. Unlike gunicorn, Daphne isn't `fork()`-only, so `manage.py runserver` (which
> Channels makes ASGI-capable the moment `daphne` is in `INSTALLED_APPS`) also serves
> WebSockets locally on Windows — no tunnel-only workaround needed for that part.

```bash
pip install -r requirements/prod.txt
python manage.py migrate
python manage.py collectstatic --noinput
daphne -b 0.0.0.0 -p 8000 config.asgi:application
python manage.py set_webhook --url https://your-domain.com
```

Daily streak reminder (cron / Task Scheduler):

```bash
python manage.py send_streak_reminders        # --dry-run to preview
```

Daily backup of the database + media (see `core/management/commands/backup_data.py`):

```bash
python manage.py backup_data                  # writes to BACKUP_DIR (default: ./backups)
```

**Deploying to a bare VPS** (Nginx, systemd, SSL, firewall, and the two daily jobs above
wired up as timers instead of manual cron): see `deploy/DEPLOY_VPS.md` for the full,
copy-pasteable walkthrough, and `deploy/nginx/` + `deploy/systemd/` for the config files
it installs.

### Scale notes

- **Never** run `manage.py runserver` in production.
- The bot uses a **webhook** in production. Polling is a single process — it can't be
  scaled or made redundant; the webhook is served by every ASGI worker process.
- Post-test AI feedback runs **off the request path** (`core/background.py`). The Groq
  call can take 20s+, which would otherwise block one worker per submission.
- SQLite serialises every write behind one lock — set `DATABASE_URL` before real traffic.

---

## Useful commands

| Command | Purpose |
|---|---|
| `python manage.py seed_shop` | Create/refresh the shop catalogue (idempotent) |
| `python manage.py set_webhook --info` | Show current webhook status |
| `python manage.py set_webhook --delete` | Switch back to polling |
| `python manage.py run_bot_polling` | Local bot without a public URL |
| `python manage.py send_streak_reminders` | Daily Telegram streak nudge |
| `python manage.py backup_data` | Back up the database + media to `BACKUP_DIR` |
| `python manage.py test tests` | Run the test suite |

---

<div align="center">
<sub>Ilm — eng shirin meva 🍏</sub>
</div>
