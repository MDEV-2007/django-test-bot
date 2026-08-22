"""Fire-and-forget background execution for slow, non-critical work.

Why this exists: post-test AI feedback calls Groq with a 20s timeout (60s for the Ollama
fallback). Running that inside the request meant every single test submission held a
worker hostage for seconds — a handful of concurrent submissions could freeze the whole
site. Dispatching here lets the request return immediately.

The pool is deliberately BOUNDED: spawning an unbounded thread per request is itself an
outage under load. If the queue is saturated the work is skipped rather than piling up —
nothing is lost, because the feedback page re-triggers generation lazily when it finds
the result still missing.

Upgrade path: once a Celery/RQ worker is running, replace the body of `submit()` with
`some_task.delay(...)`. Callers never change.
"""
import logging
import os
from concurrent.futures import ThreadPoolExecutor

logger = logging.getLogger(__name__)

MAX_WORKERS = int(os.environ.get('BACKGROUND_WORKERS', '4'))
QUEUE_LIMIT = int(os.environ.get('BACKGROUND_QUEUE_LIMIT', '200'))

_executor = ThreadPoolExecutor(max_workers=MAX_WORKERS, thread_name_prefix='ilm-bg')


def submit(fn, *args, **kwargs):
    """Run `fn(*args)` off the request path. Returns True if it was queued."""
    queued = getattr(_executor, '_work_queue', None)
    if queued is not None and queued.qsize() >= QUEUE_LIMIT:
        # Shed load instead of queueing unboundedly; the lazy re-trigger will pick it up.
        logger.warning("Background queue full (%s); skipping %s", queued.qsize(), getattr(fn, '__name__', fn))
        return False

    def _run():
        try:
            fn(*args, **kwargs)
        except Exception:
            logger.exception("Background task %s failed", getattr(fn, '__name__', fn))
        finally:
            # A worker thread owns its own DB connections — close them or they leak,
            # which is exactly how a busy site runs out of Postgres connections.
            try:
                from django.db import connections
                connections.close_all()
            except Exception:
                pass

    try:
        _executor.submit(_run)
        return True
    except RuntimeError:
        # Interpreter shutting down — run inline rather than losing the work.
        _run()
        return False
