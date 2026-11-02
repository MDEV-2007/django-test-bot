"""Fire-and-forget background execution for slow, non-critical work.

Why this exists: post-test AI feedback calls Groq with a 10s timeout (60s for the Ollama
fallback). Running that inside the request meant every single test submission held a
worker hostage for seconds — a handful of concurrent submissions could freeze the whole
site. Dispatching here lets the request return immediately.

The pool is deliberately BOUNDED: spawning an unbounded thread per request is itself an
outage under load. If the queue is saturated the work is skipped rather than piling up —
nothing is lost, because the feedback page re-triggers generation lazily when it finds
the result still missing.
"""
import functools
import logging
import os
import threading
from concurrent.futures import ThreadPoolExecutor
from django.db import close_old_connections, connections

logger = logging.getLogger(__name__)

MAX_WORKERS = int(os.environ.get('BACKGROUND_WORKERS', '4'))
QUEUE_LIMIT = int(os.environ.get('BACKGROUND_QUEUE_LIMIT', '200'))

_executor = ThreadPoolExecutor(max_workers=MAX_WORKERS, thread_name_prefix='ilm-bg')


def run_in_background(fn):
    """Dekorator: har qanday funksiyani alohida thread'da xavfsiz ishga tushiradi.
    Har bir thread funksiyasi boshlanishida va finally: blokida majburiy close_old_connections()
    chaqiriladi (too many clients already / leak bo'lmasligi uchun). Xatolar esa logger.exception orqali yoziladi.
    """
    @functools.wraps(fn)
    def wrapper(*args, **kwargs):
        def _task():
            close_old_connections()
            try:
                fn(*args, **kwargs)
            except Exception as exc:
                logger.exception("Background task failed: %s", exc)
            finally:
                close_old_connections()
                try:
                    connections.close_all()
                except Exception:
                    pass

        t = threading.Thread(target=_task, name=f"ilm-bg-{getattr(fn, '__name__', 'task')}")
        t.daemon = True
        t.start()
        return t

    return wrapper


def submit(fn, *args, **kwargs):
    """Run `fn(*args)` off the request path. Returns True if it was queued."""
    queued = getattr(_executor, '_work_queue', None)
    if queued is not None and queued.qsize() >= QUEUE_LIMIT:
        # Shed load instead of queueing unboundedly; the lazy re-trigger will pick it up.
        logger.warning("Background queue full (%s); skipping %s", queued.qsize(), getattr(fn, '__name__', fn))
        return False

    def _run():
        close_old_connections()
        try:
            fn(*args, **kwargs)
        except Exception as exc:
            logger.exception("Background task failed: %s", exc)
        finally:
            close_old_connections()
            try:
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
