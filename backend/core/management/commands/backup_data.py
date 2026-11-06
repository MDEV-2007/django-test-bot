"""Daily backup: database + media (payment screenshots, avatars) with checksums, encryption & off-site copy.

    python manage.py backup_data                                  # backup now
    python manage.py backup_data --keep-days 14                   # also prune older backups (default 14)
    python manage.py backup_data --passphrase "$BACKUP_PASSPHRASE" --offsite-dir /mnt/offsite

Features (audit PROD-004 / TASK 4):
  - Works with PostgreSQL (`pg_dump`, gzip-compressed) and SQLite (`.sqlite3.gz`).
  - Verifies archive integrity immediately after creation.
  - Optional authenticated encryption (`.enc`) via PBKDF2-HMAC-SHA256 + HMAC-SHA256 tag.
  - Generates and verifies `.sha256` sidecar files for every backup artifact.
  - Optional off-site replication (`--offsite-dir` or `BACKUP_OFFSITE_DIR`).
"""
import gzip
import hashlib
import hmac
import os
import secrets
import shutil
import subprocess
import tarfile
from datetime import datetime, timezone
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

MAGIC_HEADER = b'ILMBKP01'
PBKDF2_ITERATIONS = 100_000


def compute_sha256(file_path: Path) -> str:
    h = hashlib.sha256()
    with open(file_path, 'rb') as f:
        for chunk in iter(lambda: f.read(65536), b''):
            h.update(chunk)
    return h.hexdigest()


def write_sha256_sidecar(file_path: Path) -> Path:
    digest = compute_sha256(file_path)
    sidecar = Path(f"{file_path}.sha256")
    sidecar.write_text(f"{digest}  {file_path.name}\n", encoding='utf-8')
    return sidecar


def verify_sha256_sidecar(file_path: Path) -> bool:
    sidecar = Path(f"{file_path}.sha256")
    if not sidecar.exists():
        raise CommandError(f"Checksum fayli topilmadi: {sidecar}")
    raw = sidecar.read_text(encoding='utf-8').strip()
    expected = raw.split()[0] if raw else ''
    actual = compute_sha256(file_path)
    if not expected or not hmac.compare_digest(expected.lower(), actual.lower()):
        raise CommandError(f"SHA-256 checksum mos kelmadi ({file_path.name}): expected={expected}, actual={actual}")
    return True


def _keystream_xor(data: bytes, enc_key: bytes, nonce: bytes) -> bytes:
    """Deterministic SHA-256 counter-mode stream cipher using stdlib hashlib."""
    out = bytearray(len(data))
    block_count = (len(data) + 31) // 32
    for counter in range(block_count):
        block = hashlib.sha256(enc_key + nonce + counter.to_bytes(8, 'big')).digest()
        start = counter * 32
        end = min(start + 32, len(data))
        for idx in range(start, end):
            out[idx] = data[idx] ^ block[idx - start]
    return bytes(out)


def encrypt_backup_file(src_path: Path, passphrase: str) -> Path:
    if not passphrase:
        return src_path
    salt = secrets.token_bytes(16)
    nonce = secrets.token_bytes(16)
    key_material = hashlib.pbkdf2_hmac('sha256', passphrase.encode('utf-8'), salt, PBKDF2_ITERATIONS, dklen=64)
    enc_key, mac_key = key_material[:32], key_material[32:]

    plaintext = src_path.read_bytes()
    ciphertext = _keystream_xor(plaintext, enc_key, nonce)
    header_and_body = MAGIC_HEADER + salt + nonce + ciphertext
    tag = hmac.new(mac_key, header_and_body, hashlib.sha256).digest()

    dest_path = Path(f"{src_path}.enc")
    dest_path.write_bytes(header_and_body + tag)
    src_path.unlink(missing_ok=True)
    return dest_path


def decrypt_backup_bytes(enc_path: Path, passphrase: str) -> bytes:
    if not passphrase:
        raise CommandError("Shifrlangan zaxirani ochish uchun --passphrase yoki BACKUP_PASSPHRASE talab qilinadi.")
    raw = enc_path.read_bytes()
    min_len = len(MAGIC_HEADER) + 16 + 16 + 32
    if len(raw) < min_len or not raw.startswith(MAGIC_HEADER):
        raise CommandError(f"Noto'g'ri yoki buzilgan shifrlangan fayl formati: {enc_path.name}")
    salt = raw[8:24]
    nonce = raw[24:40]
    ciphertext = raw[40:-32]
    expected_tag = raw[-32:]

    key_material = hashlib.pbkdf2_hmac('sha256', passphrase.encode('utf-8'), salt, PBKDF2_ITERATIONS, dklen=64)
    enc_key, mac_key = key_material[:32], key_material[32:]
    actual_tag = hmac.new(mac_key, raw[:-32], hashlib.sha256).digest()
    if not hmac.compare_digest(expected_tag, actual_tag):
        raise CommandError("Shifrlangan zaxira paroli noto'g'ri yoki fayl o'zgartirilgan (HMAC xatosi).")
    return _keystream_xor(ciphertext, enc_key, nonce)


class Command(BaseCommand):
    help = "Backs up the database and media files to BACKUP_DIR with SHA-256 checksums and optional encryption."

    def add_arguments(self, parser):
        parser.add_argument(
            '--keep-days', type=int, default=14,
            help="Delete backups older than this many days after a successful run (default: 14).",
        )
        parser.add_argument(
            '--dir', default=None,
            help="Override the backup directory (default: $BACKUP_DIR or <project>/backups).",
        )
        parser.add_argument(
            '--passphrase', default=None,
            help="Encrypt backup archives using this passphrase (or set $BACKUP_PASSPHRASE).",
        )
        parser.add_argument(
            '--offsite-dir', default=None,
            help="Copy completed backup artifacts and .sha256 sidecars to an off-site directory.",
        )
        parser.add_argument(
            '--allow-unencrypted', action='store_true',
            help="Allow unencrypted backup in development/testing only.",
        )

    def handle(self, *args, **options):
        backup_dir = Path(options['dir'] or os.environ.get('BACKUP_DIR', '') or (settings.BASE_DIR / 'backups'))
        backup_dir.mkdir(parents=True, exist_ok=True)
        passphrase = options['passphrase'] if options['passphrase'] is not None else os.environ.get('BACKUP_PASSPHRASE', '')
        offsite_raw = options['offsite_dir'] or os.environ.get('BACKUP_OFFSITE_DIR', '')

        allow_unencrypted = options.get('allow_unencrypted') or os.environ.get('ALLOW_UNENCRYPTED_BACKUP') == '1'
        if not getattr(settings, 'DEBUG', False) and not passphrase and not allow_unencrypted:
            raise CommandError(
                "Production muhitida (DEBUG=False) zaxira shifrlanishi shart: "
                "--passphrase yoki BACKUP_PASSPHRASE ni o'rnating (fail-closed). "
                "Faqat lokal test muhitida --allow-unencrypted ishlatish mumkin."
            )

        stamp = datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')
        artifacts = []

        db_path = self._backup_database(backup_dir, stamp)
        self._verify_gzip_file(db_path)
        if passphrase:
            db_path = encrypt_backup_file(db_path, passphrase)
        db_sha = write_sha256_sidecar(db_path)
        verify_sha256_sidecar(db_path)
        for p in (db_path, db_sha):
            try:
                os.chmod(p, 0o600)
            except OSError:
                pass
        artifacts.extend([db_path, db_sha])
        self.stdout.write(self.style.SUCCESS(f"Baza zaxirasi: {db_path} (SHA-256 OK)"))

        media_path = self._backup_media(backup_dir, stamp)
        if media_path:
            self._verify_gzip_file(media_path)
            if passphrase:
                media_path = encrypt_backup_file(media_path, passphrase)
            media_sha = write_sha256_sidecar(media_path)
            verify_sha256_sidecar(media_path)
            for p in (media_path, media_sha):
                try:
                    os.chmod(p, 0o600)
                except OSError:
                    pass
            artifacts.extend([media_path, media_sha])
            self.stdout.write(self.style.SUCCESS(f"Media zaxirasi: {media_path} (SHA-256 OK)"))
        else:
            self.stdout.write("Media papka topilmadi yoki bo'sh — o'tkazib yuborildi.")

        if offsite_raw:
            offsite_dir = Path(offsite_raw)
            offsite_dir.mkdir(parents=True, exist_ok=True)
            for item in artifacts:
                dest = offsite_dir / item.name
                shutil.copy2(item, dest)
                try:
                    os.chmod(dest, 0o600)
                except OSError:
                    pass
            self.stdout.write(self.style.SUCCESS(f"Off-site nusxa ko'chirildi: {offsite_dir}"))

        removed = self._prune_old(backup_dir, options['keep_days'])
        if removed:
            self.stdout.write(f"{removed} ta eski zaxira o'chirildi ({options['keep_days']} kundan katta).")

    def _verify_gzip_file(self, gz_path: Path):
        if not gz_path.exists() or gz_path.stat().st_size < 20:
            raise CommandError(f"Zaxira fayli bo'sh yoki shikastlangan: {gz_path}")
        try:
            with gzip.open(gz_path, 'rb') as f:
                while f.read(65536):
                    pass
        except Exception as exc:
            gz_path.unlink(missing_ok=True)
            raise CommandError(f"Gzip butunligini tekshirishda xato ({gz_path.name}): {exc}")

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
                dest.unlink(missing_ok=True)
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
