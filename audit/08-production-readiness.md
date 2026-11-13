# PHASE 8 — PostgreSQL, Redis, Docker and production configuration

Run date: 2026-11-06. Baseline: HEAD `8454d8f` plus the uncommitted working tree (63 entries). No project code was changed, and the production server was **not** accessed. Everything below comes from the repository's deploy configuration, which may differ from the live server; the memory notes mention a server-only nginx tweak.

Checks run locally:
- `manage.py check --deploy` with production-like env values: DEBUG off, random `SECRET_KEY`, a throwaway SQLite `DATABASE_URL`, a dummy `REDIS_URL`.
- A Docker build-context probe: `FROM scratch` with a local export. No image was pulled. The exported files were deleted straight after listing their names.
- `npm audit --omit=dev`.
- An OSV.dev lookup of the pinned Python packages. Only package names and versions were sent.

## 8.1 Django production settings

| Check | State | Evidence |
|---|---|---|
| `DEBUG=False` default | Yes: fail-safe default `False` | `backend/config/settings.py:40` |
| `SECRET_KEY` from env, strong | Refuses to start with the dev fallback or a placeholder when `DEBUG=False` | `:30`, `:323-327` |
| `ALLOWED_HOSTS` | Explicit list plus `EXTRA_ALLOWED_HOSTS`, **but dev tunnel suffixes are always included** | `:42-61` (Phase 5 AUTH-013) |
| HTTPS redirect, secure cookies, HSTS, nosniff, `X_FRAME_OPTIONS`, proxy SSL header | All enabled when `DEBUG=False` | `:408-424` |
| `check --deploy` | "System check identified no issues (0 silenced)" | local run |
| CORS / CSRF | CORS allow-list from `FRONTEND_ORIGINS`, credentials off. CSRF trusts tunnel domains. | `:50-72` |
| Middleware order | Security, WhiteNoise, GZip, CORS, Session, Common, CSRF, Auth, then project middleware. Correct order. | `:185-200` |
| Error reporting / logging | stdout logging with a plain format. Sentry only if `SENTRY_DSN` is set, with `send_default_pii=False`. **No request ID, no structured JSON.** | `:488-525` |
| Static / media | WhiteNoise manifest storage. Media served by nginx. `payment_screenshots`, `classroom/receipts` and `backups` are blocked at nginx. | `:371-384`; `deploy/docker/app_routes.inc:44-59` |
| Upload limits | nginx `client_max_body_size 150M`; Django in-memory data 20 MB / files 5 MB; screenshot size and type validated with Pillow | `app_routes.inc:8`; `settings.py:483-484`; `backend/premium/services.py:29-38` |
| Admin URL / MFA | Default `/admin/`, no MFA or IP allow-list. Reachable from the internet (nginx proxies `/admin`, `app_routes.inc:92`). | PROD-009 |
| Password validators | Django defaults (min length 8, common, numeric, similarity) | `:334-347` |
| `TIME_ZONE` / `USE_TZ` | `Asia/Tashkent`, `True`. Daily caps use `date.today()` (Phase 3 ECON-004). Containers have no `TZ`, so they run on UTC. | `:353-359` (duplicated at `:393-395`) |
| Development fallbacks in production | SQLite, LocMem and InMemoryChannelLayer are blocked by the `DEBUG=False` guard. **`TELEGRAM_BOT_TOKEN` empty is not blocked** (Phase 5 AUTH-006). | `:311-320` |

## 8.2 PostgreSQL

| Check | State |
|---|---|
| Version / exposure | `postgres:16-alpine`; no host port published (internal Docker network only) — `docker-compose.yml:111-125` |
| Credentials | `POSTGRES_PASSWORD` defaults to **`ilmildizi`** when unset (`docker-compose.yml:75`, `:118`). The app connects as the DB owner, so there is no least-privilege role. Production value not verified (PROD-006). |
| TLS | `DB_SSL_REQUIRE` defaults to False; acceptable on an internal network |
| Connection handling | `CONN_MAX_AGE=60` with health checks (`settings.py:241-242`) while serving through **ASGI** (gunicorn + UvicornWorker, `WEB_CONCURRENCY=4`, `ASGI_THREADS=16`). There is no pool. `max_connections=200`. See PROD-005. |
| Atomic reward updates | `select_for_update` and `F()` are used (Phase 3). Isolation is the default READ COMMITTED. The lost-update bug is in the app (ECON-003), not in the DB settings. |
| Constraints / indexes | Unique constraints exist on chest, mission, quiz answer and attempt answer. Missing: `DailyLearningLoop (user, date, cycle_number)` (Phase 4 LOOP-003). |
| Migrations | Run on every container start (`docker-compose.yml:107`). Rollback is documented (`docs/stabilization/DEPLOY_CHECKLIST.md:68-81`). CI checks for missing migrations. |
| Backup | Nightly `pg_dump -Fc` plus a media tar, 14-day retention, size sanity check (`deploy/scripts/backup.sh`; systemd timer 03:20 with `Persistent=true`). **Stored on the same host, unencrypted, with no off-site copy.** Restore is documented (`deploy/DEPLOY_DOCKER.md:367-372`), but there is no evidence a restore was ever tested. See PROD-004. |
| User data export / delete | Admin delete exists (`panel/api.py:534`, `:705`). There is no self-service export or delete. Whether it is required is a legal question (not assessed). |

## 8.3 Redis / Celery / Channels

| Check | State |
|---|---|
| Exposure / auth / TLS | `redis:7-alpine`, internal network only, **no password**, no TLS (`docker-compose.yml:128-137`). Acceptable on an isolated Docker network. Add `requirepass` if the network is ever shared. |
| In-memory fallback in production | Blocked by the settings guard |
| Cache vs durable state | **Daily reward caps and "first try" guards live only in Redis** (Phase 3 ECON-005). Sessions use `cached_db`, so they are durable. Loop and quiz state are in the DB (Phase 4 #15). |
| Persistence / eviction | Default RDB snapshots to the `redisdata` volume. No `maxmemory` or eviction policy set (Redis 7 default `noeviction`, so writes fail under memory pressure instead of evicting). |
| Celery | Not used. Periodic work runs through host cron, `docker compose exec web python manage.py …` (`deploy/scripts/crontab.example`), with **no overlap lock**, including jobs every minute (PROD-008). |
| Channels | Redis layer in production. Battle sockets check membership (`battles/consumers.py:325-337`). Admin notifications are superadmin-only (`panel/consumers.py:18-22`). Banned users stay connected (Phase 5 AUTH-004). Token in the URL is logged (AUTH-011). |

## 8.4 Docker / CI/CD

| Check | State |
|---|---|
| Non-root containers | Frontend runs as `nextjs` (`frontend/Dockerfile`). **The web (Django) image has no `USER` and runs as root** (`Dockerfile`). See PROD-003. |
| Secrets / data in the image | **`backend/.env`, `backend/db.sqlite3` and `backend/media/` (including `payment_screenshots/`) are copied into the web image** (PROD-002). |
| `.dockerignore` / `.gitignore` | `.gitignore` covers `.env`, `db.sqlite3`, `media/` and `backups/`. The root `.dockerignore` uses **root-only patterns** (`.env`, `db.sqlite3`, `media/`), which do not match `backend/...`. |
| Dependency pinning | Python is pinned exactly; npm uses a lockfile. |
| Known vulnerabilities | **Next.js critical, Pillow high, DRF moderate, Django low** (PROD-001, PROD-007) |
| Health and readiness | web: `/healthz` checks DB and cache. nginx: `/nginx-health`. frontend: `/healthz`. db and redis have health checks. web `start_period` is 90 s. |
| Startup order | web starts after db and redis are healthy. `migrate`, then `collectstatic`, then gunicorn. |
| Restart / shutdown | `restart: unless-stopped` everywhere. Graceful shutdown uses gunicorn defaults (30 s), with `--timeout 120`. |
| CI | `.github/workflows/ci.yml` runs only on push/PR to `main`: missing-migration check, backend tests (SQLite, serial), frontend typecheck and build. **There is no dependency or security scan, no Postgres test job (concurrency tests are always skipped) and no deploy gate:** deploys are a manual `git pull` and build on the server (AGENTS.md). This branch currently has 1 failing test (Phase 1 QA-001), so CI on `main` would go red after a merge. |
| Logs | Everything goes to stdout and `docker compose logs`. Cron jobs write to separate `/var/log/*.log` files on the host. No log rotation for those files is defined in the repo. |

## 8.5 Observability and recovery

- **Error monitoring:** Sentry is supported. Whether it is enabled in production is unknown (`SENTRY_DSN` not verified).
- **Structured logs / request ID:** none.
- **Audit log:** `panel` AuditLog through `CurrentUserMiddleware` plus `AuditAwareJWTAuthentication` covers admin and teacher mutations.
- **Alerting** (5xx, DB, Redis, cron failures, payment-review delivery): nothing is defined in the repo.
- **Restore test / incident runbook:** the rollback steps are documented. No record of a performed restore drill.
- **Admin AI usage monitor:** fabricates demo data when empty (`_ensure_initial_ai_logs`, `panel/api.py:3791-3810`, random token counts and costs). Admins may read fake AI cost figures as real (PROD-010).

## Findings

### PROD-001 — Next.js 16.3.1 has a critical unauthenticated RCE, and AVIF image optimisation is enabled
- **P0, LIKELY.** Based on the advisory and the config match; not exploited.
- `npm audit --omit=dev` reports `next 16.0.0 - 16.4.0` as **critical**: "Unauthenticated Remote Code Execution in Image Optimization API when AVIF files are used" (fix: `16.4.5`). It also reports a Windows-hosted RCE, which does not apply to the Linux containers.
- The project pins `"next": "16.3.1"` (`frontend/package.json`; the same on `main`) and enables `images.formats: ['image/avif', 'image/webp']` (`frontend/next.config.ts:12-13`). `/_next/image` is publicly reachable through nginx (`location /`).
- Effect: possible remote code execution in the production frontend container. The container runs as non-root `nextjs`, but it is on the same Docker network as `web`, `db` and `redis`.
- Fix (immediate): upgrade `next` to ≥ 16.4.5 and redeploy the frontend. As a stop-gap, remove `image/avif` from `formats` or set `images.unoptimized`. Verify with `npm audit` in CI.

### PROD-002 — The web image bakes in `backend/.env` (secrets), the local SQLite DB and media files, including payment screenshots
- **P1, CONFIRMED** (build-context probe on this machine).
- The root `.dockerignore` lists `.env`, `db.sqlite3` and `media/`. These patterns only match at the context root, but the Dockerfile copies the `backend/` subtree (`COPY backend/ .`). The export of a `FROM scratch` + `COPY backend/` build from the repo root contained `.env`, `.env.example`, `db.sqlite3`, `media/` (with `payment_screenshots`, `avatars`, `classroom`, …) and `staticfiles/`, 77 MB in total.
- On the server this means: the image layer contains the production `backend/.env` (Telegram bot token, webhook secret, Groq key, card details, `SECRET_KEY`) and any media or DB files in the checkout. The running container hides `/app/media` behind the volume, but the image layer still holds the files.
- Effect: anyone with access to the image (`docker save`, a registry push, a backup of `/var/lib/docker`, a CI cache) gets every secret and the users' payment screenshots. Locally built images contain the developer's real `.env` and local user DB.
- Fix: use `**/.env`, `**/db.sqlite3`, `**/media/`, `**/staticfiles/`, `**/backups/` and `**/*.sqlite3*` in `.dockerignore`. Rebuild. Rotate `SECRET_KEY`, the bot token, the webhook secret and the Groq key if any image ever left the server. Regression: a CI step that runs the same probe and fails on `.env` or `db.sqlite3`.

### PROD-003 — The Django container runs as root
- **P2, CONFIRMED.** The `Dockerfile` has no `USER`. Gunicorn and the cron-invoked `manage.py` run as uid 0, and media and static volumes are written as root.
- Effect: combined with any RCE (for example the Pillow decoder bugs in PROD-007), the attacker is root inside the container, with write access to all mounted volumes.
- Fix: add an unprivileged user, `chown` `/app/media` and `/app/staticfiles`, and set `USER app`.

### PROD-004 — Backups are on the same host, unencrypted, and the restore has never been tested
- **P2, CONFIRMED (config).** `deploy/scripts/backup.sh` writes to `/opt/ilmildizi-backups` on the same VPS and keeps 14 days. There is no off-site copy (S3, rsync or another host), no encryption, and no restore drill on record.
- The panel's in-app backup (`/api/panel/system/backups/…`) also stores dumps under `media/backups`. They are blocked at nginx, but they sit in the same volume.
- Effect: a disk failure, a ransomware event or a VPS provider incident loses the data together with its backups. The dumps contain password hashes, phone numbers and payment metadata in clear text.
- Fix: nightly encrypted off-site copy (for example `restic` or `rclone` to object storage) and a quarterly restore test into a scratch container, with the result recorded.

### PROD-005 — Persistent DB connections under ASGI without a pool
- **P2, NEEDS VERIFICATION** (production connection counts not observed).
- `CONN_MAX_AGE=60` (`settings.py:241`) while Django serves through ASGI (UvicornWorker). Django's documentation advises disabling persistent connections under ASGI and using a pool instead, because connections are tied to worker threads (up to `WEB_CONCURRENCY × ASGI_THREADS` = 64 sync threads, plus Channels consumers and cron `exec` processes), and idle ones are only reaped on their next use.
- `max_connections=200` gives headroom today, but spikes can exhaust it and cause 500s ("too many clients").
- Fix: `CONN_MAX_AGE=0` plus Django's native psycopg pool (`OPTIONS={'pool': True}`) or pgbouncer. Monitor `pg_stat_activity`.

### PROD-006 — Weak default Postgres password and no least-privilege DB role
- **P3, NEEDS VERIFICATION** (production `.env` not inspected). `docker-compose.yml` falls back to `ilmildizi/ilmildizi` when `POSTGRES_PASSWORD` is unset. The DB is not exposed outside the Docker network, which limits the risk. The app uses the owner role for both migrations and runtime.
- Fix: require the variable (`${POSTGRES_PASSWORD:?}`) and optionally use a separate runtime role without DDL rights.

### PROD-007 — Known-vulnerable Python dependencies
- **P1 for Pillow, CONFIRMED by version.** Exploitability NEEDS VERIFICATION. OSV.dev reports:
  - `Pillow==12.2.0`: 85 advisories fixed in 13.0.0, including heap overflows in the JPEG/FPX decoders ("leads to code execution", 2026-10-23). The app decodes **untrusted user images** with Pillow (payment screenshots `premium/services.py:33-38`, plus 5 other `Image.open` call sites, avatars and posts).
  - `djangorestframework==3.18.0`: 3 advisories fixed in 3.18.2. One of them: an Accept header with many large quoted parameters burns about 19 s of CPU per request, which is unauthenticated DoS on every API route.
  - `Django==6.1`: 1 advisory (GeoDjango DoS, fixed in 6.1.1). GeoDjango is not used, so the impact is low.
  - `daphne==4.1.2`: 4 advisories (fixed in 4.2.2). Production serves through gunicorn + uvicorn, so daphne only runs `runserver` locally (low).
- npm (production deps): 22 more, of which 2 critical (`next`, `proxy-addr`) and 11 high. Most come from the `shadcn` CLI, which is listed under `dependencies` (MCP SDK, hono, body-parser, …) although it is a build-time tool and probably not in the standalone server bundle (NEEDS VERIFICATION).
- Fix: Pillow ≥ 13.0.0, DRF ≥ 3.18.2, Django ≥ 6.1.1. Move `shadcn` to `devDependencies`. Add `pip-audit` and `npm audit --omit=dev` to CI.

### PROD-008 — Cron jobs every minute with no overlap protection
- **P3, LIKELY.** `check_and_notify_mocks` and `send_scheduled_broadcasts` run `* * * * *` through `docker compose exec`, and the classroom jobs every 5 minutes (`deploy/scripts/crontab.example`), all without `flock`. If one run takes more than 60 s (Telegram slowness, many recipients), two runs overlap and can send duplicate notifications or broadcasts unless every command is idempotent (not audited per command). Log files in `/var/log/*.log` have no rotation in the repo.
- Fix: `flock -n /tmp/<job>.lock …` per job, logrotate, or a single scheduler process.

### PROD-009 — Django admin exposed at the default path without MFA or IP restriction
- **P3, CONFIRMED (config).** `/admin/` is proxied publicly (`app_routes.inc:92`). It uses password-only login, and session login does not go through the Phase 5 JWT lockout. Django admin login has no lockout or throttle at all.
- Fix: IP allow-list or VPN for `/admin`, a non-default path, `django-otp` / 2FA for superusers, and `limit_req` on `/admin/login/`.

### PROD-010 — The AI usage dashboard shows generated fake data
- **P3, CONFIRMED (code).** When `AIUsageLog` is empty, `_ensure_initial_ai_logs` (`backend/panel/api.py:3791-3810`) **inserts** about 100 random log rows (random tokens, costs, response times and success flags) into the production table.
- Effect: admins may make cost or usage decisions from fabricated numbers, and real logs are mixed with demo rows.
- Fix: remove the seeding from the API path and show an empty state instead.

### Minor (not separate findings)
- `TIME_ZONE` / `USE_TZ` / `LANGUAGE_CODE` are defined twice (`settings.py:353-359` and `:393-395`).
- The nginx `location /_next/static/` block sets its own `add_header`, so the server-level HSTS / nosniff headers are not inherited for static assets.
- `/api/health/` is public through the `/api` prefix and reveals DB and cache status and exception class names.
- There is no `server_tokens off;` and no nginx `limit_req` anywhere, which would also help with AUTH-001 and AUTH-008.

## Pre-production conditions (deploy blockers / must-do)

1. **Upgrade Next.js** to ≥ 16.4.5, or disable AVIF optimisation (PROD-001).
2. **Fix `.dockerignore`**, rebuild `web`, and rotate secrets if any image left the host (PROD-002).
3. **Upgrade Pillow** to ≥ 13.0.0 and DRF to ≥ 3.18.2 (PROD-007).
4. Off-site encrypted backup plus one tested restore (PROD-004).
5. Fix the Phase 3 P0 (SEC-PAY-001) and the P1 items from Phases 3, 5 and 6 before the next release (see Phase 9).

## Summary

- The Django settings are solid: `check --deploy` is clean, settings are fail-safe, the DEBUG=False guard covers DB, Redis and the secret key, security headers and HTTPS are on, and the internal-only DB and Redis are not exposed.
- **P0 (LIKELY):** PROD-001, critical Next.js RCE advisory matching the AVIF config.
- **P1:**
  - PROD-002 (CONFIRMED): secrets, local DB and payment screenshots are copied into the web image.
  - PROD-007: vulnerable Pillow decoders on user uploads, plus DRF DoS.
- **P2:**
  - PROD-003: root container.
  - PROD-004: same-host unencrypted backups with no restore drill.
  - PROD-005: ASGI persistent connections without a pool.
- **P3:**
  - PROD-006: default DB password.
  - PROD-008: cron overlap.
  - PROD-009: admin exposure.
  - PROD-010: fake AI usage data.
- **Not verified:** live server env values, the real nginx config, Sentry, backups on disk, connection counts, image registry usage. All of them need server access, which this audit did not have.
