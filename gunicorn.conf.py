"""Gunicorn configuration for production.

    gunicorn -c gunicorn.conf.py config.wsgi:application

Why these values: this app is I/O-bound (DB queries plus outbound calls to Telegram/Groq),
not CPU-bound, so threaded workers give far more concurrency per core than plain sync
workers. Each worker is a separate process, so total concurrent requests ≈ workers×threads.

Tune with env vars — WEB_CONCURRENCY (workers) and GUNICORN_THREADS — rather than editing
this file, so the same image runs on a small VPS and a big one.
"""
import multiprocessing
import os

bind = os.environ.get('GUNICORN_BIND', '0.0.0.0:8000')

# (2 × cores) + 1 is the standard starting point; override with WEB_CONCURRENCY.
workers = int(os.environ.get('WEB_CONCURRENCY', multiprocessing.cpu_count() * 2 + 1))
threads = int(os.environ.get('GUNICORN_THREADS', '4'))
worker_class = 'gthread'

# A slow request must never pin a worker forever. Background AI work is already off the
# request path, so 30s is generous for anything that still runs inline.
timeout = int(os.environ.get('GUNICORN_TIMEOUT', '30'))
graceful_timeout = 30
keepalive = 5

# Recycle workers periodically so a slow leak in any dependency can't grow unbounded.
# The jitter stops every worker restarting at the same instant.
max_requests = int(os.environ.get('GUNICORN_MAX_REQUESTS', '1000'))
max_requests_jitter = 100

# Load the app before forking: workers share memory pages, so each one costs less RAM.
preload_app = True

accesslog = '-'
errorlog = '-'
loglevel = os.environ.get('GUNICORN_LOG_LEVEL', 'info')
# Log the real client IP and the request time, which is what you need when diagnosing a
# slow endpoint under load.
access_log_format = '%(h)s %(l)s %(t)s "%(r)s" %(s)s %(b)s %(D)sus "%(a)s"'
