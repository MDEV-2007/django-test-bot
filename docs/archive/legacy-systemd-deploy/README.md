# Legacy systemd deployment (archived)

These files describe the original bare-metal deployment (daphne under systemd
template units behind a host nginx, `/srv/ilmildizi`). Production now runs on
Docker Compose from `/opt/ilmildizi` — see `deploy/DEPLOY_DOCKER.md` and
`deploy/scripts/crontab.example`, which replace every unit here (backup and
streak reminders are cron jobs that call `docker compose exec web ...`).

Kept for reference only. Nothing in the build or deploy pipeline reads them.
