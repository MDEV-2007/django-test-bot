<div align="center">

<img src="static/img/icon.png" width="96" height="96" alt="IlmMevasi" />

# IlmMevasi

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

```bash
git clone <repo-url> && cd django-test-bot

python -m venv .venv
.venv\Scripts\activate                 # Windows
# source .venv/bin/activate            # macOS / Linux

pip install -r requirements/dev.txt
cp .env.example .env                    # then set SECRET_KEY

python manage.py migrate
python manage.py seed_shop              # shop catalogue
python manage.py createsuperuser
python manage.py runserver
```

Open <http://127.0.0.1:8000>.

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
config/          settings, root urls, wsgi/asgi
accounts/        users, profiles, roles, auth
tests_app/       questions, test sets, attempts, revision deck
learning/        topics, lessons, video/audio, flashcards
analytics/       mastery + dashboard aggregation (service-only, no models)
shop/            coin shop, inventory, purchases, streak freeze
leaderboard/     cached rankings
telegrambot/     bot handlers, webhook, management commands
panel/           super-admin panel (config-driven CRUD engine)
teacher/         teacher panel (scoped to own content)
core/            missions, badges, notifications, background executor, AI client
scripts/         one-off seed scripts
tests/           automated test suite  →  see tests/RESULTS.md
requirements/    base / dev / prod dependency split
```

Apps live at the repository root — the conventional Django layout.

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

## Deployment

Everything scale-related is an **environment variable** — no code changes.

| Variable | Effect |
|---|---|
| `DATABASE_URL` | SQLite → PostgreSQL, with persistent connections |
| `REDIS_URL` | Moves **cache and sessions** to Redis (shared across workers) |
| `DEBUG=False` | HTTPS redirect, HSTS, secure cookies, hashed + compressed static |
| `TELEGRAM_WEBHOOK_SECRET` | Required — the webhook refuses to run without it |

> **Linux/macOS only.** `gunicorn` depends on `fork()` and does **not** run on Windows —
> there it fails with *"'gunicorn' is not recognized"*. Develop on Windows with
> `runserver` (+ a tunnel for the bot webhook); deploy on a Linux server.

```bash
pip install -r requirements/prod.txt
python manage.py migrate
python manage.py collectstatic --noinput
gunicorn -c gunicorn.conf.py config.wsgi:application
python manage.py set_webhook --url https://your-domain.com
```

Daily streak reminder (cron / Task Scheduler):

```bash
python manage.py send_streak_reminders        # --dry-run to preview
```

### Scale notes

- **Never** run `manage.py runserver` in production.
- The bot uses a **webhook** in production. Polling is a single process — it can't be
  scaled or made redundant; the webhook is served by every gunicorn worker.
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
| `python manage.py test tests` | Run the test suite |

---

<div align="center">
<sub>Ilm — eng shirin meva 🍏</sub>
</div>
