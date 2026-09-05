"""Liveness/readiness probe for the container orchestrator.

Docker's healthcheck calls this from inside the container (http://127.0.0.1:8000/healthz),
so it is never reachable from the internet: nginx routes everything except /api, /telegram
and /admin to the Next.js frontend, and this path is not one of them.

It deliberately touches both backing services. A process that is still accepting sockets
but can no longer reach PostgreSQL or Redis serves nothing but 500s — reporting that as
"healthy" is worse than reporting nothing at all.
"""
from django.core.cache import cache
from django.db import connection
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt


@csrf_exempt
def healthz(request):
    checks = {}

    try:
        with connection.cursor() as cursor:
            cursor.execute('SELECT 1')
            cursor.fetchone()
        checks['database'] = 'ok'
    except Exception as exc:                       # noqa: BLE001 - any failure is unhealthy
        checks['database'] = f'error: {exc.__class__.__name__}'

    try:
        # A read is enough to force a round trip; nothing is written, so a probe running
        # every 30s leaves no trace in Redis.
        cache.get('healthz')
        checks['cache'] = 'ok'
    except Exception as exc:                       # noqa: BLE001
        checks['cache'] = f'error: {exc.__class__.__name__}'

    healthy = all(value == 'ok' for value in checks.values())
    return JsonResponse(
        {'status': 'ok' if healthy else 'unhealthy', **checks},
        status=200 if healthy else 503,
    )
