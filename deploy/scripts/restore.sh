#!/bin/sh
# Safe database & media restore script (Docker deploy / TASK 4).
#
# By default, restores into an isolated test database (`ilmildizi_restore_test`) so a
# verification drill NEVER overwrites the live production database.
#
# Usage:
#   # Restore drill into isolated test database (safe):
#   /opt/ilmildizi/deploy/scripts/restore.sh --db-file /opt/ilmildizi-backups/db-20261106-031500.dump
#
#   # Restore into live database (requires explicit flag):
#   /opt/ilmildizi/deploy/scripts/restore.sh \
#       --db-file /opt/ilmildizi-backups/db-20261106-031500.dump \
#       --target-db ilmildizi \
#       --allow-production-overwrite
set -eu

PROJECT_DIR="${PROJECT_DIR:-/opt/ilmildizi}"
DB_FILE=""
MEDIA_FILE=""
TARGET_DB="ilmildizi_restore_test"
ALLOW_PROD="false"
MEDIA_VOLUME="${MEDIA_VOLUME:-ilmildizi_media}"

while [ "$#" -gt 0 ]; do
    case "$1" in
        --db-file)
            DB_FILE="$2"
            shift 2
            ;;
        --media-file)
            MEDIA_FILE="$2"
            shift 2
            ;;
        --target-db)
            TARGET_DB="$2"
            shift 2
            ;;
        --allow-production-overwrite)
            ALLOW_PROD="true"
            shift 1
            ;;
        *)
            echo "Unknown option: $1" >&2
            exit 2
            ;;
    esac
done

if [ -z "$DB_FILE" ] && [ -z "$MEDIA_FILE" ]; then
    echo "Usage: $0 --db-file <path> [--media-file <path>] [--target-db <name>] [--allow-production-overwrite]" >&2
    exit 2
fi

cd "$PROJECT_DIR"

verify_checksum() {
    file_path="$1"
    if [ ! -f "$file_path" ]; then
        echo "ERROR: backup file not found: $file_path" >&2
        exit 1
    fi
    if [ -f "${file_path}.sha256" ]; then
        dir_name="$(dirname "$file_path")"
        base_name="$(basename "$file_path")"
        (
            cd "$dir_name"
            sha256sum -c "${base_name}.sha256" >/dev/null
        )
        echo "[$(date -Iseconds)] checksum verified: ${file_path}.sha256"
    else
        echo "[$(date -Iseconds)] WARNING: no .sha256 sidecar found for $file_path" >&2
    fi
}

decrypt_if_needed() {
    in_file="$1"
    out_tmp="$2"
    case "$in_file" in
        *.enc)
            if [ -n "${BACKUP_PASSPHRASE_FILE:-}" ] && [ -f "$BACKUP_PASSPHRASE_FILE" ]; then
                openssl enc -d -aes-256-cbc -pbkdf2 -iter 100000 \
                    -pass "file:$BACKUP_PASSPHRASE_FILE" \
                    -in "$in_file" -out "$out_tmp"
            elif [ -n "${BACKUP_PASSPHRASE:-}" ]; then
                openssl enc -d -aes-256-cbc -pbkdf2 -iter 100000 \
                    -pass env:BACKUP_PASSPHRASE \
                    -in "$in_file" -out "$out_tmp"
            else
                echo "ERROR: encrypted backup ($in_file) requires BACKUP_PASSPHRASE or BACKUP_PASSPHRASE_FILE" >&2
                exit 1
            fi
            echo "$out_tmp"
            ;;
        *)
            echo "$in_file"
            ;;
    esac
}

if [ -n "$DB_FILE" ]; then
    verify_checksum "$DB_FILE"

    PROD_DB_NAME="$(docker compose exec -T db sh -c 'printf "%s" "$POSTGRES_DB"')"
    if [ "$TARGET_DB" = "$PROD_DB_NAME" ] && [ "$ALLOW_PROD" != "true" ]; then
        echo "ERROR: refusing to overwrite live database '$PROD_DB_NAME' without --allow-production-overwrite" >&2
        exit 1
    fi

    TMP_DUMP="$(mktemp "${TMPDIR:-/tmp}/ilmildizi-restore-XXXXXX.dump")"
    trap 'rm -f "$TMP_DUMP"' EXIT
    RESTORE_SRC="$(decrypt_if_needed "$DB_FILE" "$TMP_DUMP")"

    # Verify archive TOC before touching the target database
    docker compose exec -T db pg_restore --list < "$RESTORE_SRC" >/dev/null

    if [ "$TARGET_DB" != "$PROD_DB_NAME" ]; then
        docker compose exec -T db sh -c "psql -U \"\$POSTGRES_USER\" -d postgres -v ON_ERROR_STOP=1 -c \"DROP DATABASE IF EXISTS \\\"$TARGET_DB\\\";\" -c \"CREATE DATABASE \\\"$TARGET_DB\\\";\""
    fi

    docker compose exec -T db sh -c "pg_restore -U \"\$POSTGRES_USER\" -d \"$TARGET_DB\" --clean --if-exists --no-owner --no-privileges" < "$RESTORE_SRC"

    TABLE_COUNT="$(docker compose exec -T db sh -c "psql -U \"\$POSTGRES_USER\" -d \"$TARGET_DB\" -tAc \"SELECT count(*) FROM information_schema.tables WHERE table_schema='public';\"")"
    echo "[$(date -Iseconds)] database restore ok: target_db=$TARGET_DB tables=$TABLE_COUNT"
fi

if [ -n "$MEDIA_FILE" ]; then
    verify_checksum "$MEDIA_FILE"
    TMP_MEDIA="$(mktemp "${TMPDIR:-/tmp}/ilmildizi-media-XXXXXX.tgz")"
    trap 'rm -f "$TMP_MEDIA"' EXIT
    MEDIA_SRC="$(decrypt_if_needed "$MEDIA_FILE" "$TMP_MEDIA")"
    gzip -t "$MEDIA_SRC"

    SRC_DIR="$(dirname "$(realpath "$MEDIA_SRC")")"
    SRC_BASE="$(basename "$MEDIA_SRC")"
    docker run --rm -v "$MEDIA_VOLUME":/media -v "$SRC_DIR":/backup:ro alpine \
        tar xzf "/backup/$SRC_BASE" -C /media
    echo "[$(date -Iseconds)] media restore ok: volume=$MEDIA_VOLUME"
fi
