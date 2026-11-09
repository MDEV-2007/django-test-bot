"""Safe restore command for database & media backups created by `backup_data`.

    # Restore SQLite backup into an isolated target file (safe):
    python manage.py restore_data --db-file backups/db-20261106-120000.sqlite3.gz --target-sqlite /tmp/restored.sqlite3

    # Restore encrypted backup:
    python manage.py restore_data --db-file backups/db-20261106-120000.sqlite3.gz.enc --passphrase "$BACKUP_PASSPHRASE" --target-sqlite /tmp/restored.sqlite3
"""
import gzip
import io
import os
import shutil
import subprocess
import tarfile
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from .backup_data import decrypt_backup_bytes, verify_sha256_sidecar


class Command(BaseCommand):
    help = "Verifies SHA-256 checksum, decrypts if needed, and restores a database/media backup safely."

    def add_arguments(self, parser):
        parser.add_argument('--db-file', default=None, help="Path to database backup (.gz or .gz.enc).")
        parser.add_argument('--media-file', default=None, help="Path to media backup (.tar.gz or .tar.gz.enc).")
        parser.add_argument('--passphrase', default=None, help="Decryption passphrase (or $BACKUP_PASSPHRASE).")
        parser.add_argument('--target-sqlite', default=None, help="Target file path when restoring a SQLite backup.")
        parser.add_argument('--target-db', default=None, help="Target database name when restoring a PostgreSQL backup.")
        parser.add_argument('--target-media-dir', default=None, help="Target directory when restoring a media archive.")
        parser.add_argument(
            '--allow-production-overwrite', action='store_true',
            help="Explicitly allow overwriting the configured default database or MEDIA_ROOT.",
        )

    def handle(self, *args, **options):
        db_file = options['db_file']
        media_file = options['media_file']
        if not db_file and not media_file:
            raise CommandError("Kamida --db-file yoki --media-file ko'rsatilishi shart.")

        passphrase = options['passphrase'] if options['passphrase'] is not None else os.environ.get('BACKUP_PASSPHRASE', '')

        if db_file:
            self._restore_db(
                Path(db_file),
                passphrase=passphrase,
                target_sqlite=options['target_sqlite'],
                target_db=options['target_db'],
                allow_overwrite=options['allow_production_overwrite'],
            )

        if media_file:
            self._restore_media(
                Path(media_file),
                passphrase=passphrase,
                target_media_dir=options['target_media_dir'],
                allow_overwrite=options['allow_production_overwrite'],
            )

    def _read_gzip_payload(self, path: Path, passphrase: str) -> bytes:
        if not path.exists():
            raise CommandError(f"Zaxira fayli topilmadi: {path}")
        verify_sha256_sidecar(path)
        raw_gz = decrypt_backup_bytes(path, passphrase) if path.name.endswith('.enc') else path.read_bytes()
        try:
            return gzip.decompress(raw_gz)
        except Exception as exc:
            raise CommandError(f"Arxivni ochishda xatolik ({path.name}): {exc}")

    def _restore_db(self, path: Path, *, passphrase: str, target_sqlite, target_db, allow_overwrite: bool):
        payload = self._read_gzip_payload(path, passphrase)
        logical_name = path.name[:-4] if path.name.endswith('.enc') else path.name

        if logical_name.endswith('.sqlite3.gz'):
            default_sqlite = Path(settings.DATABASES['default']['NAME']).resolve()
            dest = Path(target_sqlite).resolve() if target_sqlite else default_sqlite
            if dest == default_sqlite and not allow_overwrite:
                raise CommandError(
                    "Asosiy SQLite bazani ustidan yozish uchun --allow-production-overwrite yoki "
                    "alohida --target-sqlite ko'rsating."
                )
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(payload)
            self.stdout.write(self.style.SUCCESS(f"SQLite baza tiklandi: {dest} ({len(payload)} bytes)"))
            return

        if logical_name.endswith('.sql.gz'):
            db_cfg = settings.DATABASES['default']
            prod_db_name = str(db_cfg.get('NAME') or '')
            dest_db = target_db or f"{prod_db_name}_restore_test"
            if dest_db == prod_db_name and not allow_overwrite:
                raise CommandError(
                    f"Asosiy PostgreSQL bazani ({prod_db_name}) ustidan yozish rad etildi: "
                    "--allow-production-overwrite yoki --target-db ko'rsating."
                )
            env = os.environ.copy()
            if db_cfg.get('PASSWORD'):
                env['PGPASSWORD'] = db_cfg['PASSWORD']
            cmd = [
                'psql',
                '-h', db_cfg.get('HOST') or 'localhost',
                '-p', str(db_cfg.get('PORT') or 5432),
                '-U', db_cfg.get('USER') or '',
                '-d', dest_db,
                '-v', 'ON_ERROR_STOP=1',
            ]
            try:
                subprocess.run(cmd, input=payload, env=env, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
            except FileNotFoundError:
                raise CommandError("psql topilmadi. postgresql-client paketini o'rnating.")
            except subprocess.CalledProcessError as exc:
                raise CommandError(f"psql tiklashda xato: {exc.stderr.decode(errors='replace')}")
            self.stdout.write(self.style.SUCCESS(f"PostgreSQL baza tiklandi: {dest_db}"))
            return

        raise CommandError(f"Noma'lum zaxira fayl turi: {path.name}")

    def _restore_media(self, path: Path, *, passphrase: str, target_media_dir, allow_overwrite: bool):
        if not path.exists():
            raise CommandError(f"Media zaxira fayli topilmadi: {path}")
        verify_sha256_sidecar(path)
        raw_gz = decrypt_backup_bytes(path, passphrase) if path.name.endswith('.enc') else path.read_bytes()

        default_media = Path(settings.MEDIA_ROOT).resolve()
        dest_root = Path(target_media_dir).resolve() if target_media_dir else default_media
        if dest_root == default_media and not allow_overwrite:
            raise CommandError(
                "Asosiy MEDIA_ROOT ustidan yozish uchun --allow-production-overwrite yoki "
                "--target-media-dir ko'rsating."
            )
        dest_root.mkdir(parents=True, exist_ok=True)
        with tarfile.open(fileobj=io.BytesIO(raw_gz), mode='r:gz') as tar:
            for member in tar.getmembers():
                member_path = (dest_root / member.name).resolve()
                if not str(member_path).startswith(str(dest_root)):
                    raise CommandError(f"Xavfli tar yo'li aniqlandi (path traversal): {member.name}")
            tar.extractall(path=dest_root)
        self.stdout.write(self.style.SUCCESS(f"Media fayllar tiklandi: {dest_root}"))
