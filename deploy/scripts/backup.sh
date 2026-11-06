#!/bin/sh
# Daily backup of the production database and uploaded media (Docker deploy).
#
#   Run from cron on the VPS (see deploy/scripts/crontab.example):
#     15 3 * * * /opt/ilmildizi/deploy/scripts/backup.sh >> /var/log/ilmildizi-backup.log 2>&1
#
# Features (audit PROD-004 / TASK 4):
#   1. Atomic staging (.part -> final) + pg_restore --list integrity verification
#   2. Optional AES-256-CBC PBKDF2 encryption when BACKUP_PASSPHRASE or BACKUP_PASSPHRASE_FILE is set
#   3. SHA-256 checksum generation (.sha256) and immediate verification
#   4. Off-site copy support via BACKUP_RCLONE_DEST, BACKUP_SCP_DEST, or BACKUP_OFFSITE_DIR
#   5. Retention policy (KEEP_DAYS, default 14)
set -eu

PROJECT_DIR="${PROJECT_DIR:-/opt/ilmildizi}"
BACKUP_DIR="${BACKUP_DIR:-/opt/ilmildizi-backups}"
KEEP_DAYS="${KEEP_DAYS:-14}"
MEDIA_VOLUME="${MEDIA_VOLUME:-ilmildizi_media}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"

mkdir -p "$BACKUP_DIR"
chmod 0700 "$BACKUP_DIR" 2>/dev/null || true
cd "$PROJECT_DIR"

echo "[$(date -Iseconds)] backup start stamp=$STAMP dir=$BACKUP_DIR"

# 1. Database dump (custom compressed format)
DB_RAW="$BACKUP_DIR/db-$STAMP.dump"
docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$DB_RAW.part"

if [ "$(wc -c < "$DB_RAW.part")" -lt 1024 ]; then
    echo "[$(date -Iseconds)] ERROR: database dump is too small (<1024 bytes), aborting" >&2
    rm -f "$DB_RAW.part"
    exit 1
fi

# Verify archive TOC structure using pg_restore --list
if ! docker compose exec -T db pg_restore --list < "$DB_RAW.part" >/dev/null 2>&1; then
    echo "[$(date -Iseconds)] ERROR: pg_restore --list failed on dump archive, aborting" >&2
    rm -f "$DB_RAW.part"
    exit 1
fi
mv "$DB_RAW.part" "$DB_RAW"

# 2. Media volume archive
MEDIA_RAW="$BACKUP_DIR/media-$STAMP.tgz"
docker run --rm -v "$MEDIA_VOLUME":/media:ro -v "$BACKUP_DIR":/backup alpine \
    tar czf "/backup/media-$STAMP.tgz.part" -C /media .
gzip -t "$MEDIA_RAW.part"
mv "$MEDIA_RAW.part" "$MEDIA_RAW"

# 3. Optional encryption (AES-256-CBC with PBKDF2 100k iterations)
encrypt_if_configured() {
    src_file="$1"
    if [ -n "${BACKUP_PASSPHRASE_FILE:-}" ] && [ -f "$BACKUP_PASSPHRASE_FILE" ]; then
        enc_file="${src_file}.enc"
        openssl enc -aes-256-cbc -pbkdf2 -iter 100000 -salt \
            -pass "file:$BACKUP_PASSPHRASE_FILE" \
            -in "$src_file" -out "$enc_file.part"
        mv "$enc_file.part" "$enc_file"
        rm -f "$src_file"
        echo "$enc_file"
    elif [ -n "${BACKUP_PASSPHRASE:-}" ]; then
        enc_file="${src_file}.enc"
        openssl enc -aes-256-cbc -pbkdf2 -iter 100000 -salt \
            -pass env:BACKUP_PASSPHRASE \
            -in "$src_file" -out "$enc_file.part"
        mv "$enc_file.part" "$enc_file"
        rm -f "$src_file"
        echo "$enc_file"
    else
        echo "$src_file"
    fi
}

DB_FINAL="$(encrypt_if_configured "$DB_RAW")"
MEDIA_FINAL="$(encrypt_if_configured "$MEDIA_RAW")"

# 4. SHA-256 checksums + immediate verification
write_and_verify_sha256() {
    target="$1"
    dir_name="$(dirname "$target")"
    base_name="$(basename "$target")"
    (
        cd "$dir_name"
        sha256sum "$base_name" > "${base_name}.sha256"
        sha256sum -c "${base_name}.sha256" >/dev/null
    )
}

write_and_verify_sha256 "$DB_FINAL"
write_and_verify_sha256 "$MEDIA_FINAL"

# 5. Off-site replication (S3/B2 via rclone, remote host via scp, or secondary mount)
OFFSITE_STATUS="skipped(not_configured)"
if [ -n "${BACKUP_OFFSITE_DIR:-}" ]; then
    mkdir -p "$BACKUP_OFFSITE_DIR"
    cp -f "$DB_FINAL" "${DB_FINAL}.sha256" "$MEDIA_FINAL" "${MEDIA_FINAL}.sha256" "$BACKUP_OFFSITE_DIR/"
    OFFSITE_STATUS="ok(dir:$BACKUP_OFFSITE_DIR)"
fi
if [ -n "${BACKUP_RCLONE_DEST:-}" ]; then
    rclone copy "$DB_FINAL" "$BACKUP_RCLONE_DEST"
    rclone copy "${DB_FINAL}.sha256" "$BACKUP_RCLONE_DEST"
    rclone copy "$MEDIA_FINAL" "$BACKUP_RCLONE_DEST"
    rclone copy "${MEDIA_FINAL}.sha256" "$BACKUP_RCLONE_DEST"
    OFFSITE_STATUS="ok(rclone:$BACKUP_RCLONE_DEST)"
fi
if [ -n "${BACKUP_SCP_DEST:-}" ]; then
    scp -B -q "$DB_FINAL" "${DB_FINAL}.sha256" "$MEDIA_FINAL" "${MEDIA_FINAL}.sha256" "$BACKUP_SCP_DEST"
    OFFSITE_STATUS="ok(scp:$BACKUP_SCP_DEST)"
fi

# 6. Retention cleanup
find "$BACKUP_DIR" -maxdepth 1 -type f \
    \( -name 'db-*.dump*' -o -name 'media-*.tgz*' \) \
    -mtime +"$KEEP_DAYS" -delete

echo "[$(date -Iseconds)] backup ok: db=$(basename "$DB_FINAL") ($(du -h "$DB_FINAL" | cut -f1)), media=$(basename "$MEDIA_FINAL") ($(du -h "$MEDIA_FINAL" | cut -f1)), offsite=$OFFSITE_STATUS"
