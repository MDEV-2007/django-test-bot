"""SEC-NEW-001: Upgrade AdminMFADevice secret storage to AES-256-GCM authenticated encryption
with key versioning and session verification timestamp, preserving all existing enrollments."""
from django.db import migrations, models


def upgrade_legacy_mfa_secrets(apps, schema_editor):
    from accounts.admin_mfa import MFAEncryptionError, decrypt_totp_secret, encrypt_totp_secret, is_encrypted_secret

    AdminMFADevice = apps.get_model('accounts', 'AdminMFADevice')
    for row in AdminMFADevice.objects.all():
        if is_encrypted_secret(row.secret):
            continue
        try:
            plaintext, active_kid, _ = decrypt_totp_secret(row.secret)
            envelope, used_kid = encrypt_totp_secret(plaintext, key_id=active_kid)
            row.secret = envelope
            row.key_version = used_kid
            row.save(update_fields=['secret', 'key_version'])
        except MFAEncryptionError:
            # Do not delete or disable the row; leave untouched for manual inspection if corrupted
            continue


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0013_adminmfadevice'),
    ]

    operations = [
        migrations.AddField(
            model_name='adminmfadevice',
            name='key_version',
            field=models.CharField(default='v1', max_length=32),
        ),
        migrations.AddField(
            model_name='adminmfadevice',
            name='last_verified_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='adminmfadevice',
            name='secret',
            field=models.CharField(max_length=255),
        ),
        migrations.RunPython(upgrade_legacy_mfa_secrets, migrations.RunPython.noop),
    ]
