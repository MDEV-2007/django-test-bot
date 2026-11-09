#!/bin/sh
# Entrypoint for the Django (web) image — audit PROD-003.
#
# The container starts as root only long enough to hand the mounted volumes (media,
# staticfiles) to the unprivileged `app` user — existing volumes were created by earlier
# root-run containers — and then drops privileges for the real process (migrate,
# collectstatic, gunicorn). An RCE in the app (for example an image-decoder bug) no
# longer runs as uid 0 with write access to everything.
set -e

if [ "$(id -u)" = "0" ]; then
    for dir in /app/media /app/staticfiles; do
        mkdir -p "$dir"
        # Only touch what is not ours yet: on a large media volume a blanket chown -R on
        # every start would be slow.
        find "$dir" ! -user app -exec chown app:app {} + 2>/dev/null || true
    done
    exec setpriv --reuid=app --regid=app --init-groups "$@"
fi

exec "$@"
