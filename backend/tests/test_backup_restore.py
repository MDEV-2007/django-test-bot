"""Tests for Task 4 (Backup & Restore + SHA-256 + Encryption + Offsite) and Task 6 (DB Password Guard)."""
import os
import tempfile
from pathlib import Path

from django.core.exceptions import ImproperlyConfigured
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import SimpleTestCase, override_settings

from config.settings import validate_production_database_config


class ProductionDatabasePasswordGuardTests(SimpleTestCase):
    def test_sqlite_engine_is_ignored_by_postgres_password_guard(self):
        validate_production_database_config({
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': 'db.sqlite3',
        })

    def test_empty_or_default_postgres_passwords_raise_improperly_configured(self):
        for weak in ('', '   ', 'ilmildizi', 'ILMILDIZI', 'postgres', 'password', 'changeme', 'admin', '123456'):
            with self.subTest(password=weak):
                with self.assertRaises(ImproperlyConfigured):
                    validate_production_database_config({
                        'ENGINE': 'django.db.backends.postgresql',
                        'NAME': 'ilmildizi',
                        'USER': 'ilmildizi',
                        'PASSWORD': weak,
                    })

    def test_strong_postgres_password_passes_guard(self):
        validate_production_database_config({
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': 'ilmildizi',
            'USER': 'ilmildizi',
            'PASSWORD': 'StrongRandomProdPassword_2026_x9Qp!',
        })


class BackupAndRestoreCommandTests(SimpleTestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.sqlite_src = self.root / 'source.sqlite3'
        self.sqlite_src.write_bytes(b'SQLite format 3\x00' + b'test-payload-data-' * 200)
        self.media_src = self.root / 'media_src'
        self.media_src.mkdir()
        (self.media_src / 'receipt.txt').write_text('receipt-12345', encoding='utf-8')
        self.backup_dir = self.root / 'backups'
        self.offsite_dir = self.root / 'offsite'

    def _db_settings(self):
        return {
            'default': {
                'ENGINE': 'django.db.backends.sqlite3',
                'NAME': str(self.sqlite_src),
            }
        }

    def test_unencrypted_backup_writes_sha256_offsite_copy_and_restores_cleanly(self):
        with override_settings(DATABASES=self._db_settings(), MEDIA_ROOT=self.media_src):
            call_command(
                'backup_data',
                dir=str(self.backup_dir),
                offsite_dir=str(self.offsite_dir),
                allow_unencrypted=True,
            )
            db_backups = list(self.backup_dir.glob('db-*.sqlite3.gz'))
            media_backups = list(self.backup_dir.glob('media-*.tar.gz'))
            self.assertEqual(len(db_backups), 1)
            self.assertEqual(len(media_backups), 1)
            self.assertTrue(Path(f"{db_backups[0]}.sha256").exists())
            self.assertTrue(Path(f"{media_backups[0]}.sha256").exists())
            # Offsite copy also has both files and their .sha256 sidecars
            self.assertTrue((self.offsite_dir / db_backups[0].name).exists())
            self.assertTrue((self.offsite_dir / f"{db_backups[0].name}.sha256").exists())

            # Refuses to overwrite live database without --allow-production-overwrite
            with self.assertRaises(CommandError):
                call_command('restore_data', db_file=str(db_backups[0]))

            restored_sqlite = self.root / 'restored.sqlite3'
            restored_media = self.root / 'restored_media'
            call_command(
                'restore_data',
                db_file=str(db_backups[0]),
                media_file=str(media_backups[0]),
                target_sqlite=str(restored_sqlite),
                target_media_dir=str(restored_media),
            )
            self.assertEqual(restored_sqlite.read_bytes(), self.sqlite_src.read_bytes())
            self.assertEqual(
                (restored_media / 'media' / 'receipt.txt').read_text(encoding='utf-8'),
                'receipt-12345',
            )

    def test_encrypted_backup_roundtrip_and_tamper_detection(self):
        secret_pass = 'CorrectHorseBatteryStaple_2026!'
        with override_settings(DATABASES=self._db_settings(), MEDIA_ROOT=self.media_src):
            call_command(
                'backup_data',
                dir=str(self.backup_dir),
                passphrase=secret_pass,
            )
            enc_dbs = list(self.backup_dir.glob('db-*.sqlite3.gz.enc'))
            self.assertEqual(len(enc_dbs), 1)
            # Plaintext .gz was removed
            self.assertEqual(list(self.backup_dir.glob('db-*.sqlite3.gz')), [])

            # Wrong passphrase fails
            restored_sqlite = self.root / 'restored_enc.sqlite3'
            with self.assertRaises(CommandError):
                call_command(
                    'restore_data',
                    db_file=str(enc_dbs[0]),
                    passphrase='wrong-password',
                    target_sqlite=str(restored_sqlite),
                )

            # Correct passphrase succeeds
            call_command(
                'restore_data',
                db_file=str(enc_dbs[0]),
                passphrase=secret_pass,
                target_sqlite=str(restored_sqlite),
            )
            self.assertEqual(restored_sqlite.read_bytes(), self.sqlite_src.read_bytes())

            # Tampering with the backup file triggers SHA-256 mismatch
            raw = bytearray(enc_dbs[0].read_bytes())
            raw[-1] ^= 0xFF
            enc_dbs[0].write_bytes(bytes(raw))
            with self.assertRaises(CommandError):
                call_command(
                    'restore_data',
                    db_file=str(enc_dbs[0]),
                    passphrase=secret_pass,
                    target_sqlite=str(restored_sqlite),
                )

    def test_production_backup_fails_closed_without_passphrase(self):
        with override_settings(DEBUG=False, DATABASES=self._db_settings(), MEDIA_ROOT=self.media_src):
            # Without passphrase or --allow-unencrypted, production backup fails
            with self.assertRaises(CommandError) as ctx:
                call_command(
                    'backup_data',
                    dir=str(self.backup_dir),
                    passphrase='',
                )
            self.assertIn("fail-closed", str(ctx.exception))

            # With --allow-unencrypted explicitly passed, it passes in test
            call_command(
                'backup_data',
                dir=str(self.backup_dir),
                passphrase='',
                allow_unencrypted=True,
            )
            self.assertTrue(list(self.backup_dir.glob('db-*.sqlite3.gz')))

    def test_retention_pruning_policy(self):
        import time
        with override_settings(DATABASES=self._db_settings(), MEDIA_ROOT=self.media_src):
            self.backup_dir.mkdir(parents=True, exist_ok=True)
            old_file = self.backup_dir / 'db-20261001-000000.sqlite3.gz'
            old_file.write_bytes(b'dummy-old-backup')
            # Artificially age the file to 20 days ago
            past_time = time.time() - (20 * 86400)
            os.utime(old_file, (past_time, past_time))
            self.assertTrue(old_file.exists())

            # Run backup with keep_days=14 -> old file must be pruned
            call_command(
                'backup_data',
                dir=str(self.backup_dir),
                keep_days=14,
                allow_unencrypted=True,
            )
            self.assertFalse(old_file.exists())

