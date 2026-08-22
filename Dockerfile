FROM python:3.12-slim

# - PYTHONUNBUFFERED: log lines reach the container stream immediately (no buffering).
# - PYTHONDONTWRITEBYTECODE: no .pyc clutter in the layer.
# - PIP_NO_CACHE_DIR: smaller image, we never reinstall inside the container.
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Install dependencies first so this layer is cached until requirements change.
# psycopg[binary] and Pillow ship prebuilt wheels, so no compiler/system libs are needed.
COPY backend/requirements/ requirements/
COPY backend/requirements.txt .
RUN pip install -r requirements.txt

# Django kodi endi backend/ ichida (frontend/ alohida deploy qilinadi).
COPY backend/ .

# Hash + compress static assets into STATIC_ROOT so WhiteNoise can serve them.
# DEBUG is forced off here so ManifestStaticFilesStorage runs; SECRET_KEY is a throwaway
# used only for this build-time management command.
RUN DEBUG=False SECRET_KEY=build-only python manage.py collectstatic --noinput


# docker-compose.yml overrides this with its own `command:` (runs migrate first), but a
# default CMD means the image still does something sane under a plain `docker run` too.
CMD ["daphne", "-b", "0.0.0.0", "-p", "8000", "config.asgi:application"]
