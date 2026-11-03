#!/bin/sh
# Daily backup of the production database and uploaded media (Docker deploy).
#
#   Run from cron on the VPS (see deploy/scripts/crontab.example):
#     15 3 * * * /opt/ilmildizi/deploy/scripts/backup.sh >> /var/log/ilmildizi-backup.log 2>&1
#
# Writes to BACKUP_DIR (default /opt/ilmildizi-backups — outside the repo, so `git pull`
# and container rebuilds never touch it):
#   db-YYYYmmdd-HHMM.dump     pg_dump custom format (compressed; restore with pg_restore)
#   media-YYYYmmdd-HHMM.tgz   uploaded files (payment receipts, audio, avatars)
# Files older than KEEP_DAYS (default 14) are deleted. A copy should also leave this
# server periodically (scp to another machine or object storage): a backup on the same
# disk does not survive a lost VPS.
set -eu

PROJECT_DIR="${PROJECT_DIR:-/opt/ilmildizi}"
BACKUP_DIR="${BACKUP_DIR:-/opt/ilmildizi-backups}"
KEEP_DAYS="${KEEP_DAYS:-14}"
MEDIA_VOLUME="${MEDIA_VOLUME:-ilmildizi_media}"
STAMP="$(date +%Y%m%d-%H%M)"

mkdir -p "$BACKUP_DIR"
cd "$PROJECT_DIR"

echo "[$(date -Iseconds)] backup start"

# Database: credentials come from the db container's own environment.
DB_FILE="$BACKUP_DIR/db-$STAMP.dump"
docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$DB_FILE.part"
# An empty or tiny dump means pg_dump failed silently — keep the old backups and stop.
if [ "$(wc -c < "$DB_FILE.part")" -lt 1024 ]; then
    echo "ERROR: database dump is too small, keeping previous backups" >&2
    rm -f "$DB_FILE.part"
    exit 1
fi
mv "$DB_FILE.part" "$DB_FILE"

# Media volume.
MEDIA_FILE="$BACKUP_DIR/media-$STAMP.tgz"
docker run --rm -v "$MEDIA_VOLUME":/media:ro -v "$BACKUP_DIR":/backup alpine \
    tar czf "/backup/media-$STAMP.tgz.part" -C /media .
mv "$MEDIA_FILE.part" "$MEDIA_FILE"

# Rotation.
find "$BACKUP_DIR" -maxdepth 1 -type f \( -name 'db-*.dump' -o -name 'media-*.tgz' \) -mtime +"$KEEP_DAYS" -delete

echo "[$(date -Iseconds)] backup ok: $(du -h "$DB_FILE" | cut -f1) db, $(du -h "$MEDIA_FILE" | cut -f1) media"
