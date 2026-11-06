"""Tests for Task 7 — Admin MFA (TOTP + Single-Use Recovery Codes + Replay & Rate Limit Protection)."""
from django.core import signing
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from accounts.admin_mfa import (
    MFAEncryptionError,
    _SECRET_SALT,
    decrypt_totp_secret,
    encrypt_totp_secret,
    generate_totp_code,
    generate_totp_secret,
    get_device_raw_secret,
    is_encrypted_secret,
    rotate_all_mfa_device_keys,
)
from accounts.models import AdminMFADevice

from .factories import make_user


@override_settings(ADMIN_MFA_REQUIRED=True)
class AdminMFATests(TestCase):
    def setUp(self):
        self.admin_user, self.admin_profile = make_user('mfa_admin', role='superadmin')
        self.admin_user.is_staff = True
        self.admin_user.is_superuser = True
        self.admin_user.save(update_fields=['is_staff', 'is_superuser'])

        self.student_user, _ = make_user('mfa_student', role='student')

    def _enroll_mfa(self) -> tuple[str, list[str]]:
        self.client.force_login(self.admin_user)
        info = self.client.get('/admin/mfa/enroll/', HTTP_ACCEPT='application/json').json()
        secret = info['secret']
        self.assertTrue(secret)
        code = generate_totp_code(secret)
        res = self.client.post(
            '/admin/mfa/enroll/',
            data={'code': code},
            content_type='application/json',
            HTTP_ACCEPT='application/json',
        )
        self.assertEqual(res.status_code, 200, res.content)
        payload = res.json()
        self.assertTrue(payload['ok'])
        self.assertEqual(len(payload['recovery_codes']), 8)
        return secret, payload['recovery_codes']

    def test_unenrolled_admin_is_redirected_to_enroll_when_mfa_required(self):
        self.client.force_login(self.admin_user)
        res = self.client.get('/admin/')
        self.assertEqual(res.status_code, 302)
        self.assertTrue(res['Location'].startswith('/admin/mfa/enroll/'))

    def test_mfa_enrollment_and_valid_totp_grants_admin_access(self):
        secret, _codes = self._enroll_mfa()
        # Enrolled session is immediately verified
        res = self.client.get('/admin/')
        self.assertEqual(res.status_code, 200)

        # Log out and log back in: now redirected to /admin/mfa/verify/
        self.client.logout()
        self.client.force_login(self.admin_user)
        res2 = self.client.get('/admin/')
        self.assertEqual(res2.status_code, 302)
        self.assertTrue(res2['Location'].startswith('/admin/mfa/verify/'))

        # Advance time by 30s so we have a fresh TOTP window
        device = AdminMFADevice.objects.get(user=self.admin_user)
        device.last_used_timestep -= 2
        device.save(update_fields=['last_used_timestep'])

        valid_code = generate_totp_code(secret)
        verify_res = self.client.post(
            '/admin/mfa/verify/',
            data={'code': valid_code},
            content_type='application/json',
            HTTP_ACCEPT='application/json',
        )
        self.assertEqual(verify_res.status_code, 200)
        self.assertEqual(verify_res.json()['method'], 'totp')
        self.assertEqual(self.client.get('/admin/').status_code, 200)

    def test_invalid_totp_is_rejected(self):
        self._enroll_mfa()
        self.client.logout()
        self.client.force_login(self.admin_user)
        res = self.client.post(
            '/admin/mfa/verify/',
            data={'code': '000000'},
            content_type='application/json',
            HTTP_ACCEPT='application/json',
        )
        self.assertEqual(res.status_code, 400)
        self.assertFalse(res.json()['ok'])
        # Still blocked from /admin/
        self.assertEqual(self.client.get('/admin/').status_code, 302)

    def test_replayed_totp_in_same_timestep_is_rejected(self):
        secret, _ = self._enroll_mfa()
        same_window_code = generate_totp_code(secret)
        self.client.logout()
        self.client.force_login(self.admin_user)
        res = self.client.post(
            '/admin/mfa/verify/',
            data={'code': same_window_code},
            content_type='application/json',
            HTTP_ACCEPT='application/json',
        )
        self.assertEqual(res.status_code, 400)
        self.assertFalse(res.json()['ok'])

    def test_recovery_code_is_single_use(self):
        _secret, recovery_codes = self._enroll_mfa()
        first_recovery = recovery_codes[0]

        self.client.logout()
        self.client.force_login(self.admin_user)
        res1 = self.client.post(
            '/admin/mfa/verify/',
            data={'code': first_recovery},
            content_type='application/json',
            HTTP_ACCEPT='application/json',
        )
        self.assertEqual(res1.status_code, 200)
        self.assertEqual(res1.json()['method'], 'recovery_code')

        # Attempting to reuse the same recovery code in a new session must fail
        self.client.logout()
        self.client.force_login(self.admin_user)
        res2 = self.client.post(
            '/admin/mfa/verify/',
            data={'code': first_recovery},
            content_type='application/json',
            HTTP_ACCEPT='application/json',
        )
        self.assertEqual(res2.status_code, 400)
        self.assertFalse(res2.json()['ok'])

    def test_rate_limiting_locks_after_five_failed_attempts(self):
        secret, _ = self._enroll_mfa()
        self.client.logout()
        self.client.force_login(self.admin_user)

        for i in range(4):
            r = self.client.post(
                '/admin/mfa/verify/',
                data={'code': '999999'},
                content_type='application/json',
                HTTP_ACCEPT='application/json',
            )
            self.assertEqual(r.status_code, 400, f"attempt {i + 1}")

        # 5th failed attempt triggers lockout (429)
        r5 = self.client.post(
            '/admin/mfa/verify/',
            data={'code': '999999'},
            content_type='application/json',
            HTTP_ACCEPT='application/json',
        )
        self.assertEqual(r5.status_code, 429)

        # Even a valid TOTP code is rejected while locked out
        device = AdminMFADevice.objects.get(user=self.admin_user)
        device.last_used_timestep -= 2
        device.save(update_fields=['last_used_timestep'])
        valid_code = generate_totp_code(secret)
        r_locked = self.client.post(
            '/admin/mfa/verify/',
            data={'code': valid_code},
            content_type='application/json',
            HTTP_ACCEPT='application/json',
        )
        self.assertEqual(r_locked.status_code, 429)

    def test_student_api_login_is_unaffected_by_admin_mfa(self):
        api = APIClient()
        login_res = api.post(
            '/api/auth/login/',
            {'username': 'mfa_student', 'password': 'pw-for-tests-1234'},
            format='json',
        )
        self.assertEqual(login_res.status_code, 200)
        access = login_res.json()['access']
        api.credentials(HTTP_AUTHORIZATION=f'Bearer {access}')
        me_res = api.get('/api/auth/me/')
        self.assertEqual(me_res.status_code, 200)
        self.assertEqual(me_res.json()['username'], 'mfa_student')

    def test_encrypt_decrypt_roundtrip_and_database_never_stores_plaintext_or_signing_only(self):
        secret, _ = self._enroll_mfa()
        device = AdminMFADevice.objects.get(user=self.admin_user)
        self.assertTrue(is_encrypted_secret(device.secret))
        self.assertTrue(device.secret.startswith('enc:v1:'))
        self.assertNotIn(secret, device.secret)
        decrypted, kid, needs_reencrypt = decrypt_totp_secret(device.secret)
        self.assertEqual(decrypted, secret)
        self.assertEqual(kid, 'v1')
        self.assertFalse(needs_reencrypt)

    def test_tampered_ciphertext_is_rejected_and_fails_closed(self):
        self._enroll_mfa()
        device = AdminMFADevice.objects.get(user=self.admin_user)
        parts = device.secret.split(':', 3)
        payload = parts[3]
        flipped = ('A' if payload[-2] != 'A' else 'B')
        tampered = f"{parts[0]}:{parts[1]}:{parts[2]}:{payload[:-2]}{flipped}{payload[-1]}"
        with self.assertRaises(MFAEncryptionError):
            decrypt_totp_secret(tampered)

        device.secret = tampered
        device.save(update_fields=['secret'])
        self.client.logout()
        self.client.force_login(self.admin_user)
        res = self.client.post(
            '/admin/mfa/verify/',
            data={'code': '123456'},
            content_type='application/json',
            HTTP_ACCEPT='application/json',
        )
        self.assertEqual(res.status_code, 503)

    def test_missing_or_weak_encryption_key_fails_closed(self):
        with override_settings(DEBUG=False, ADMIN_MFA_REQUIRE_EXPLICIT_KEY=True, ADMIN_MFA_ENCRYPTION_KEY=''):
            with self.assertRaises(MFAEncryptionError):
                encrypt_totp_secret(generate_totp_secret())
            self.client.force_login(self.admin_user)
            res = self.client.get('/admin/mfa/enroll/', HTTP_ACCEPT='application/json')
            self.assertEqual(res.status_code, 503)

        for bad_key in ('short', 'changeme', 'change-me-to-a-separate-32-byte-mfa-encryption-key'):
            with override_settings(ADMIN_MFA_ENCRYPTION_KEY=bad_key):
                with self.assertRaises(MFAEncryptionError):
                    encrypt_totp_secret(generate_totp_secret())

    def test_legacy_signing_and_raw_base32_records_transparently_upgrade_without_breaking_mfa(self):
        raw_secret = generate_totp_secret()
        legacy_signed = signing.dumps(raw_secret, salt=_SECRET_SALT)
        device = AdminMFADevice.objects.create(
            user=self.admin_user,
            secret=legacy_signed,
            key_version='legacy',
            is_confirmed=True,
        )
        recovered = get_device_raw_secret(device)
        self.assertEqual(recovered, raw_secret)
        device.refresh_from_db()
        self.assertTrue(is_encrypted_secret(device.secret))
        self.assertEqual(device.key_version, 'v1')
        self.assertTrue(device.is_confirmed)

        # Also verify raw Base32 legacy record upgrades cleanly
        device.secret = raw_secret
        device.key_version = 'raw'
        device.save(update_fields=['secret', 'key_version'])
        recovered2 = get_device_raw_secret(device)
        self.assertEqual(recovered2, raw_secret)
        device.refresh_from_db()
        self.assertTrue(is_encrypted_secret(device.secret))

    def test_key_rotation_and_secret_key_independence(self):
        key_v1 = 'mfa-key-version-1-strong-secret-material-32bytes'
        key_v2 = 'mfa-key-version-2-rotated-secret-material-32bytes'

        with override_settings(
            SECRET_KEY='django-secret-key-before-rotation-111111111111',
            ADMIN_MFA_ENCRYPTION_KEY=key_v1,
            ADMIN_MFA_ENCRYPTION_KEY_ID='v1',
        ):
            secret, _ = self._enroll_mfa()
            device = AdminMFADevice.objects.get(user=self.admin_user)
            self.assertTrue(device.secret.startswith('enc:v1:v1:'))

        # 1. Rotating Django's SECRET_KEY must NEVER break MFA decryption
        with override_settings(
            SECRET_KEY='completely-new-django-secret-key-after-rotation-2222222',
            ADMIN_MFA_ENCRYPTION_KEY=key_v1,
            ADMIN_MFA_ENCRYPTION_KEY_ID='v1',
        ):
            device.refresh_from_db()
            self.assertEqual(get_device_raw_secret(device), secret)

        # 2. Rotating ADMIN_MFA_ENCRYPTION_KEY from v1 -> v2 with v1 in ADMIN_MFA_PREVIOUS_ENCRYPTION_KEYS
        with override_settings(
            ADMIN_MFA_ENCRYPTION_KEY=key_v2,
            ADMIN_MFA_ENCRYPTION_KEY_ID='v2',
            ADMIN_MFA_PREVIOUS_ENCRYPTION_KEYS=f'v1:{key_v1}',
        ):
            rotated_count = rotate_all_mfa_device_keys()
            self.assertEqual(rotated_count, 1)
            device.refresh_from_db()
            self.assertTrue(device.secret.startswith('enc:v1:v2:'))
            self.assertEqual(device.key_version, 'v2')

        # 3. Once rotated, v1 can be removed from ADMIN_MFA_PREVIOUS_ENCRYPTION_KEYS and v2 alone works
        with override_settings(
            ADMIN_MFA_ENCRYPTION_KEY=key_v2,
            ADMIN_MFA_ENCRYPTION_KEY_ID='v2',
            ADMIN_MFA_PREVIOUS_ENCRYPTION_KEYS='',
        ):
            device.refresh_from_db()
            self.assertEqual(get_device_raw_secret(device), secret)
