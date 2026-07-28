"""Daily backup: database + media (payment screenshots, avatars) to a local directory.

    python manage.py backup_data                  # backup now
    python manage.py backup_data --keep-days 14    # also prune older backups (default 14)

Works with either database backend:
  - PostgreSQL (DATABASE_URL set): shells out to `pg_dump`, gzip-compressed.
  - SQLite (dev/no DATABASE_URL): copies the .sqlite3 file directly (safe to copy while
    the app is running — SQLite's file format tolerates this; WAL-mode edge cases aside,
    this matches how the rest of this project already treats SQLite as a dev-only backend).

Media (MEDIA_ROOT) is tar+gzipped alongside the DB dump, so a single BACKUP_DIR holds
everything needed to restore: `pg_restore` (or copy back the .sqlite3) + `tar -xzf`.

This is deliberately a *local-disk* backup, not off-server — the point is protecting
against "a bad migration/deploy corrupted the data", not "the whole VPS died". Copy the
BACKUP_DIR to a second location periodically (a cheap S3/B2 bucket, or even scp to your own
machine) for real disaster recovery; that step needs your own storage credentials, which
this command deliberately doesn't ask for.
"""
import gzip
import os
import shutil
import subprocess
import tarfile
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import urlparse

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = "Backs up the database and media files to BACKUP_DIR (default: <project>/backups)."

    def add_arguments(self, parser):
        parser.add_argument(
            '--keep-days', type=int, default=14,
            help="Delete backups older than this many days after a successful run (default: 14).",
        )
        parser.add_argument(
            '--dir', default=None,
            help="Override the backup directory (default: $BACKUP_DIR or <project>/backups).",
        )

    def handle(self, *args, **options):
        backup_dir = Path(options['dir'] or os.environ.get('BACKUP_DIR', '') or (settings.BASE_DIR / 'backups'))
        backup_dir.mkdir(parents=True, exist_ok=True)

        stamp = datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')

        db_path = self._backup_database(backup_dir, stamp)
        self.stdout.write(self.style.SUCCESS(f"Baza zaxirasi: {db_path}"))

        media_path = self._backup_media(backup_dir, stamp)
        if media_path:
            self.stdout.write(self.style.SUCCESS(f"Media zaxirasi: {media_path}"))
        else:
            self.stdout.write("Media papka topilmadi yoki bo'sh — o'tkazib yuborildi.")

        removed = self._prune_old(backup_dir, options['keep_days'])
        if removed:
            self.stdout.write(f"{removed} ta eski zaxira o'chirildi ({options['keep_days']} kundan katta).")

    def _backup_database(self, backup_dir, stamp):
        db_config = settings.DATABASES['default']
        engine = db_config['ENGINE']

        if 'sqlite3' in engine:
            src = Path(db_config['NAME'])
            if not src.exists():
                raise CommandError(f"SQLite fayli topilmadi: {src}")
            dest = backup_dir / f'db-{stamp}.sqlite3.gz'
            with open(src, 'rb') as f_in, gzip.open(dest, 'wb') as f_out:
                shutil.copyfileobj(f_in, f_out)
            return dest

        if 'postgresql' in engine:
            dest = backup_dir / f'db-{stamp}.sql.gz'
            env = os.environ.copy()
            if db_config.get('PASSWORD'):
                env['PGPASSWORD'] = db_config['PASSWORD']
            cmd = [
                'pg_dump',
                '-h', db_config.get('HOST') or 'localhost',
                '-p', str(db_config.get('PORT') or 5432),
                '-U', db_config.get('USER') or '',
                '-d', db_config['NAME'],
                '--no-owner', '--no-privileges',
            ]
            try:
                with gzip.open(dest, 'wb') as f_out:
                    result = subprocess.run(cmd, env=env, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
                    f_out.write(result.stdout)
            except FileNotFoundError:
                raise CommandError(
                    "pg_dump topilmadi. PostgreSQL client vositalarini o'rnating: "
                    "sudo apt install postgresql-client"
                )
            except subprocess.CalledProcessError as e:
                dest.unlink(missing_ok=True)
                raise CommandError(f"pg_dump xato bilan tugadi: {e.stderr.decode(errors='replace')}")
            return dest

        raise CommandError(f"Noma'lum baza turi uchun zaxira qo'llab-quvvatlanmaydi: {engine}")

    def _backup_media(self, backup_dir, stamp):
        media_root = Path(settings.MEDIA_ROOT)
        if not media_root.exists() or not any(media_root.iterdir()):
            return None
        dest = backup_dir / f'media-{stamp}.tar.gz'
        with tarfile.open(dest, 'w:gz') as tar:
            tar.add(media_root, arcname='media')
        return dest

    def _prune_old(self, backup_dir, keep_days):
        if keep_days <= 0:
            return 0
        cutoff = datetime.now(timezone.utc).timestamp() - keep_days * 86400
        removed = 0
        for f in backup_dir.glob('*'):
            if f.is_file() and f.stat().st_mtime < cutoff:
                f.unlink()
                removed += 1
        return removed
