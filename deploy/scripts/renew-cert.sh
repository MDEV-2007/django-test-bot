#!/bin/sh
# Renews the Let's Encrypt certificate for the site and reloads nginx (Docker deploy).
#
#   Run from cron twice a day (certbot only renews when < 30 days remain, so most runs
#   do nothing): see deploy/scripts/crontab.example.
#
# CERT_NAME limits renewal to this site's certificate. The shared certbot volume also
# holds certificates of other domains; renewing those is their own job, and a failing
# one must not block this one.
set -eu

PROJECT_DIR="${PROJECT_DIR:-/opt/ilmildizi}"
CERT_NAME="${CERT_NAME:-ilmildizi.uz}"

cd "$PROJECT_DIR"
echo "[$(date -Iseconds)] renew check for $CERT_NAME"
docker compose run --rm certbot renew --cert-name "$CERT_NAME" --webroot -w /var/www/certbot --quiet
# Reload is cheap and picks up a renewed certificate; without it nginx keeps serving the
# old one until the next restart.
docker compose exec -T nginx nginx -s reload
echo "[$(date -Iseconds)] renew done"
