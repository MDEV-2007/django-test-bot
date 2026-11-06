"""Audit and monitor database connection budget and active connections (TASK 5 / PROD-005).

    python manage.py check_db_connections
    python manage.py check_db_connections --workers 4 --threads 16 --fail-on-warn
"""
import json
import os

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import connection


def calculate_connection_budget(
    *,
    workers: int | None = None,
    threads_per_worker: int | None = None,
    max_connections: int = 200,
    reserved_super: int = 3,
) -> dict:
    w = int(workers if workers is not None else os.environ.get('WEB_CONCURRENCY', 4))
    t = int(threads_per_worker if threads_per_worker is not None else os.environ.get('ASGI_THREADS', 16))
    db_cfg = settings.DATABASES.get('default', {})
    conn_max_age = int(db_cfg.get('CONN_MAX_AGE', 0) or 0)
    conn_health_checks = bool(db_cfg.get('CONN_HEALTH_CHECKS', False))

    steady_state_estimate = w * 2
    worst_case_burst = w * t
    usable_max = max(1, max_connections - reserved_super)
    utilization_pct = round((worst_case_burst / usable_max) * 100.0, 1)
    needs_pgbouncer = worst_case_burst > int(usable_max * 0.75)

    return {
        'engine': db_cfg.get('ENGINE', ''),
        'workers': w,
        'threads_per_worker': t,
        'conn_max_age': conn_max_age,
        'conn_health_checks': conn_health_checks,
        'steady_state_connections': steady_state_estimate,
        'worst_case_connections': worst_case_burst,
        'postgres_max_connections': max_connections,
        'usable_max_connections': usable_max,
        'worst_case_utilization_pct': utilization_pct,
        'pgbouncer_recommended': needs_pgbouncer,
    }


class Command(BaseCommand):
    help = "Checks database connection pooling settings, worker budget, and live PostgreSQL pg_stat_activity."

    def add_arguments(self, parser):
        parser.add_argument('--workers', type=int, default=None, help="Override WEB_CONCURRENCY worker count.")
        parser.add_argument('--threads', type=int, default=None, help="Override ASGI_THREADS per worker.")
        parser.add_argument('--max-connections', type=int, default=200, help="Expected PostgreSQL max_connections.")
        parser.add_argument('--fail-on-warn', action='store_true', help="Exit non-zero if budget exceeds 75%%.")

    def handle(self, *args, **options):
        max_conn = options['max_connections']
        live_stats = {}

        if connection.vendor == 'postgresql':
            with connection.cursor() as cur:
                cur.execute("SHOW max_connections;")
                row = cur.fetchone()
                if row and str(row[0]).isdigit():
                    max_conn = int(row[0])
                cur.execute(
                    """
                    SELECT
                        count(*) AS total,
                        count(*) FILTER (WHERE state = 'active') AS active,
                        count(*) FILTER (WHERE state = 'idle') AS idle,
                        count(*) FILTER (WHERE state LIKE 'idle in transaction%') AS idle_in_tx
                    FROM pg_stat_activity
                    WHERE datname = current_database();
                    """
                )
                stat_row = cur.fetchone()
                if stat_row:
                    live_stats = {
                        'live_total': int(stat_row[0] or 0),
                        'live_active': int(stat_row[1] or 0),
                        'live_idle': int(stat_row[2] or 0),
                        'live_idle_in_tx': int(stat_row[3] or 0),
                    }

        report = calculate_connection_budget(
            workers=options['workers'],
            threads_per_worker=options['threads'],
            max_connections=max_conn,
        )
        report.update(live_stats)

        self.stdout.write(json.dumps(report, indent=2))

        if options['fail_on_warn'] and report['pgbouncer_recommended']:
            raise CommandError(
                f"Worst-case connection budget ({report['worst_case_connections']}) exceeds 75% "
                f"of usable max_connections ({report['usable_max_connections']}). Enable PgBouncer or lower ASGI_THREADS."
            )
