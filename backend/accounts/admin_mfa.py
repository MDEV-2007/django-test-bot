"""RFC 6238 TOTP Multi-Factor Authentication + Single-Use Recovery Codes for Django Admin (/admin/) & Super Admin (/panel/).

Security guarantees (SEC-NEW-001):
  - TOTP secrets are encrypted at rest using AES-256-GCM authenticated encryption
    (`enc:v1:<kid>:<urlsafe_b64(nonce_12 || ciphertext || gcm_tag_16)>`).
  - Encryption keys are derived via HKDF-SHA256 from `ADMIN_MFA_ENCRYPTION_KEY`, which is
    strictly separate from Django's `SECRET_KEY` (rotating `SECRET_KEY` never breaks MFA).
  - Supports seamless key rotation via `ADMIN_MFA_ENCRYPTION_KEY_ID` and
    `ADMIN_MFA_PREVIOUS_ENCRYPTION_KEYS` with automatic re-encryption on read or via
    `rotate_all_mfa_device_keys()`.
  - Legacy `django.core.signing` or raw Base32 records are transparently migrated to
    `enc:v1:<kid>:...` without invalidating existing user MFA enrollments.
  - Fails closed (`MFAEncryptionError` / HTTP 503) in production (`DEBUG=False`) if
    `ADMIN_MFA_ENCRYPTION_KEY` is missing, weak, or invalid.
"""
import base64
import hashlib
import hmac
import html
import json
import logging
import os
import re
import secrets
import struct
import sys
import time
import urllib.parse
from datetime import timedelta

from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from django.conf import settings
from django.core import signing
from django.db import transaction
from django.http import HttpResponse, HttpResponseForbidden, HttpResponseRedirect, JsonResponse
from django.middleware.csrf import get_token
from django.utils import timezone
from django.utils.http import url_has_allowed_host_and_scheme

from .models import AdminMFADevice

logger = logging.getLogger(__name__)

TOTP_PERIOD = 30
TOTP_DIGITS = 6
MAX_FAILED_ATTEMPTS = 5
LOCKOUT_SECONDS = 300
RECOVERY_CODE_COUNT = 8
SESSION_MFA_USER_KEY = 'admin_mfa_verified_user_id'
SESSION_MFA_TIME_KEY = 'admin_mfa_verified_at'
_SECRET_SALT = 'accounts.admin_mfa.secret.v1'
_ENVELOPE_PREFIX = 'enc:v1:'
_HKDF_SALT = b'ilmildizi-admin-mfa-aes256gcm-salt-v1'
_DEV_ONLY_MFA_KEY = 'dev-only-ilmildizi-mfa-aes256gcm-key-independent-of-secret-key'
_INSECURE_MFA_KEYS = {
    'changeme',
    'change-me',
    'change-me-to-a-random-value',
    'change-me-to-a-separate-32-byte-mfa-encryption-key',
    'secret',
    'password',
    'admin',
    '123456',
    'test',
    'default',
}
_BASE32_SECRET_RE = re.compile(r'^[A-Z2-7]{16,64}=*$', re.IGNORECASE)


class MFAEncryptionError(Exception):
    """Raised when MFA encryption key configuration is missing/invalid or ciphertext is tampered."""


def generate_totp_secret() -> str:
    """Returns a 160-bit (32 Base32 chars) RFC 6238 secret."""
    return base64.b32encode(secrets.token_bytes(20)).decode('ascii').rstrip('=')


def _parse_kid_and_key(raw_entry: str, default_kid: str = 'v1') -> tuple[str, str]:
    cleaned = str(raw_entry or '').strip()
    if ':' in cleaned:
        maybe_kid, rest = cleaned.split(':', 1)
        if maybe_kid and re.match(r'^[A-Za-z0-9_.-]{1,32}$', maybe_kid) and rest:
            return maybe_kid, rest.strip()
    return default_kid, cleaned


def _validate_raw_key_material(key_material: str) -> None:
    if not key_material or key_material.lower() in _INSECURE_MFA_KEYS or len(key_material) < 16:
        raise MFAEncryptionError(
            "ADMIN_MFA_ENCRYPTION_KEY is invalid, a placeholder, or shorter than 16 characters."
        )


def _derive_aes256_key(key_material: str, kid: str) -> bytes:
    _validate_raw_key_material(key_material)
    hkdf = HKDF(
        algorithm=hashes.SHA256(),
        length=32,
        salt=_HKDF_SALT,
        info=f"ilmildizi-admin-mfa-key:{kid}".encode('utf-8'),
    )
    return hkdf.derive(key_material.encode('utf-8'))


def _get_mfa_keyring() -> tuple[str, dict[str, bytes]]:
    """Returns `(active_kid, {kid: 32_byte_aes_key})`. Fails closed if key config is invalid."""
    raw_primary = getattr(settings, 'ADMIN_MFA_ENCRYPTION_KEY', None)
    if raw_primary is None:
        raw_primary = os.environ.get('ADMIN_MFA_ENCRYPTION_KEY', '')
    raw_primary = str(raw_primary or '').strip()

    configured_kid = str(
        getattr(settings, 'ADMIN_MFA_ENCRYPTION_KEY_ID', None)
        or os.environ.get('ADMIN_MFA_ENCRYPTION_KEY_ID', '')
        or 'v1'
    ).strip() or 'v1'

    is_test_run = len(sys.argv) > 1 and sys.argv[1] == 'test'
    require_explicit = (not getattr(settings, 'DEBUG', False) and not is_test_run) or bool(
        getattr(settings, 'ADMIN_MFA_REQUIRE_EXPLICIT_KEY', False)
    )

    if not raw_primary:
        if require_explicit:
            raise MFAEncryptionError(
                "ADMIN_MFA_ENCRYPTION_KEY must be configured in production (DEBUG=False)."
            )
        active_kid = configured_kid
        active_material = _DEV_ONLY_MFA_KEY
    else:
        active_kid, active_material = _parse_kid_and_key(raw_primary, default_kid=configured_kid)
        _validate_raw_key_material(active_material)

    keyring: dict[str, bytes] = {
        active_kid: _derive_aes256_key(active_material, active_kid),
    }

    raw_previous = getattr(settings, 'ADMIN_MFA_PREVIOUS_ENCRYPTION_KEYS', None)
    if raw_previous is None:
        raw_previous = os.environ.get('ADMIN_MFA_PREVIOUS_ENCRYPTION_KEYS', '')

    if isinstance(raw_previous, dict):
        for prev_kid, prev_mat in raw_previous.items():
            pkid = str(prev_kid).strip()
            pmat = str(prev_mat or '').strip()
            if pkid and pmat:
                keyring[pkid] = _derive_aes256_key(pmat, pkid)
    elif isinstance(raw_previous, (list, tuple)):
        for idx, item in enumerate(raw_previous, start=1):
            pkid, pmat = _parse_kid_and_key(str(item), default_kid=f"old{idx}")
            if pmat:
                keyring[pkid] = _derive_aes256_key(pmat, pkid)
    elif isinstance(raw_previous, str) and raw_previous.strip():
        for idx, part in enumerate(raw_previous.split(','), start=1):
            if not part.strip():
                continue
            pkid, pmat = _parse_kid_and_key(part.strip(), default_kid=f"old{idx}")
            keyring[pkid] = _derive_aes256_key(pmat, pkid)

    return active_kid, keyring


def is_encrypted_secret(stored_secret: str) -> bool:
    return bool(stored_secret and str(stored_secret).startswith(_ENVELOPE_PREFIX))


def encrypt_totp_secret(raw_secret: str, *, key_id: str | None = None) -> tuple[str, str]:
    """Encrypts `raw_secret` with AES-256-GCM. Returns `(envelope_str, key_id)`."""
    cleaned_secret = str(raw_secret or '').strip()
    if not cleaned_secret:
        raise MFAEncryptionError("Cannot encrypt an empty TOTP secret.")
    active_kid, keyring = _get_mfa_keyring()
    target_kid = key_id or active_kid
    if target_kid not in keyring:
        raise MFAEncryptionError(f"Requested MFA key_id '{target_kid}' is not in keyring.")
    aes_key = keyring[target_kid]
    nonce = secrets.token_bytes(12)
    aad = f"ilmildizi-admin-mfa:v1:{target_kid}".encode('utf-8')
    ciphertext_and_tag = AESGCM(aes_key).encrypt(nonce, cleaned_secret.encode('utf-8'), aad)
    payload_b64 = base64.urlsafe_b64encode(nonce + ciphertext_and_tag).decode('ascii')
    return f"{_ENVELOPE_PREFIX}{target_kid}:{payload_b64}", target_kid


def _is_valid_base32_secret(candidate: str) -> bool:
    s = str(candidate or '').strip().replace(' ', '').upper()
    if not _BASE32_SECRET_RE.match(s):
        return False
    pad_len = (8 - (len(s.rstrip('=')) % 8)) % 8
    try:
        decoded = base64.b32decode(s.rstrip('=') + ('=' * pad_len), casefold=True)
        return len(decoded) >= 10
    except Exception:
        return False


def decrypt_totp_secret(stored_secret: str) -> tuple[str, str, bool]:
    """Decrypts an `AdminMFADevice.secret` value.

    Returns `(plaintext_secret, active_kid, needs_reencrypt)`.
    Raises `MFAEncryptionError` if key configuration is invalid or ciphertext is tampered.
    """
    active_kid, keyring = _get_mfa_keyring()
    raw = str(stored_secret or '').strip()
    if not raw:
        raise MFAEncryptionError("Stored MFA secret is empty.")

    if raw.startswith(_ENVELOPE_PREFIX):
        parts = raw.split(':', 3)
        if len(parts) != 4 or not parts[2] or not parts[3]:
            raise MFAEncryptionError("Malformed encrypted MFA secret envelope.")
        envelope_kid, payload_b64 = parts[2], parts[3]
        try:
            pad = '=' * ((4 - (len(payload_b64) % 4)) % 4)
            raw_bytes = base64.urlsafe_b64decode((payload_b64 + pad).encode('ascii'))
        except Exception as exc:
            raise MFAEncryptionError("Corrupted base64 payload in encrypted MFA secret.") from exc

        if len(raw_bytes) < 12 + 16 + 1:
            raise MFAEncryptionError("Truncated encrypted MFA secret payload.")

        nonce = raw_bytes[:12]
        ciphertext_and_tag = raw_bytes[12:]

        candidate_kids = [envelope_kid] if envelope_kid in keyring else list(keyring.keys())
        for cand_kid in candidate_kids:
            aad = f"ilmildizi-admin-mfa:v1:{cand_kid}".encode('utf-8')
            try:
                plaintext_bytes = AESGCM(keyring[cand_kid]).decrypt(nonce, ciphertext_and_tag, aad)
                plaintext = plaintext_bytes.decode('utf-8')
                if not _is_valid_base32_secret(plaintext):
                    raise MFAEncryptionError("Decrypted MFA secret is not a valid Base32 TOTP secret.")
                return plaintext, active_kid, (cand_kid != active_kid)
            except InvalidTag:
                continue
            except UnicodeDecodeError as exc:
                raise MFAEncryptionError("Decrypted MFA payload is not valid UTF-8.") from exc

        raise MFAEncryptionError("MFA secret authentication failed (invalid tag or unknown key version).")

    # Legacy compatibility path 1: django.core.signing value (`<b64>:<sig>`)
    try:
        legacy_unsealed = str(signing.loads(raw, salt=_SECRET_SALT)).strip()
        if _is_valid_base32_secret(legacy_unsealed):
            return legacy_unsealed, active_kid, True
    except signing.BadSignature:
        pass

    # Legacy compatibility path 2: raw Base32 secret stored prior to encryption
    if _is_valid_base32_secret(raw):
        return raw.upper(), active_kid, True

    raise MFAEncryptionError("Unrecognized or corrupted legacy MFA secret.")


def _seal_secret(raw_secret: str) -> str:
    envelope, _ = encrypt_totp_secret(raw_secret)
    return envelope


def _unseal_secret(stored_secret: str) -> str:
    plaintext, _, _ = decrypt_totp_secret(stored_secret)
    return plaintext


def get_device_raw_secret(device: AdminMFADevice, *, auto_upgrade: bool = True) -> str:
    """Decrypts `device.secret` and transparently upgrades legacy or rotated-key records."""
    plaintext, active_kid, needs_reencrypt = decrypt_totp_secret(device.secret)
    if auto_upgrade and (needs_reencrypt or device.key_version != active_kid) and getattr(device, 'pk', None):
        new_envelope, used_kid = encrypt_totp_secret(plaintext, key_id=active_kid)
        device.secret = new_envelope
        device.key_version = used_kid
        device.save(update_fields=['secret', 'key_version', 'updated_at'])
    return plaintext


def rotate_all_mfa_device_keys() -> int:
    """Re-encrypts all AdminMFADevice records to the currently active encryption key."""
    active_kid, _ = _get_mfa_keyring()
    rotated = 0
    for device in AdminMFADevice.objects.all():
        plaintext, _, needs_reencrypt = decrypt_totp_secret(device.secret)
        if needs_reencrypt or device.key_version != active_kid or not is_encrypted_secret(device.secret):
            new_envelope, used_kid = encrypt_totp_secret(plaintext, key_id=active_kid)
            device.secret = new_envelope
            device.key_version = used_kid
            device.save(update_fields=['secret', 'key_version', 'updated_at'])
            rotated += 1
    return rotated


def generate_totp_code(secret: str, *, for_time: int | float | None = None, period: int = TOTP_PERIOD) -> str:
    """Computes the 6-digit RFC 6238 TOTP code for `secret` at `for_time`."""
    ts = int(time.time() if for_time is None else for_time)
    timestep = ts // period
    return _hotp(secret, timestep)


def _hotp(secret: str, counter: int, digits: int = TOTP_DIGITS) -> str:
    cleaned = secret.strip().replace(' ', '').upper()
    pad_len = (8 - (len(cleaned) % 8)) % 8
    key = base64.b32decode(cleaned + ('=' * pad_len), casefold=True)
    msg = struct.pack('>Q', counter)
    digest = hmac.new(key, msg, hashlib.sha1).digest()
    offset = digest[-1] & 0x0F
    code_int = struct.unpack('>I', digest[offset:offset + 4])[0] & 0x7FFFFFFF
    return str(code_int % (10 ** digits)).zfill(digits)


def verify_totp_code_with_timestep(
    secret: str,
    code: str,
    *,
    for_time: int | float | None = None,
    window: int = 2,
    last_used_timestep: int = 0,
) -> tuple[bool, int]:
    """Verifies a 6-digit TOTP code and prevents replay of any timestep <= `last_used_timestep`.

    RFC 6238 section 5.2 recommends a transmission latency / clock skew window of ±1 to ±2
    steps (±60 seconds). `last_used_timestep` strictly prevents replay within the window.
    """
    candidate = str(code or '').strip().replace(' ', '').replace('-', '')
    if len(candidate) != TOTP_DIGITS or not candidate.isdigit():
        return False, 0
    ts = int(time.time() if for_time is None else for_time)
    current_step = ts // TOTP_PERIOD
    for offset in range(-window, window + 1):
        step = current_step + offset
        if step <= last_used_timestep:
            continue
        expected = _hotp(secret, step)
        if hmac.compare_digest(candidate, expected):
            return True, step
    return False, 0


def build_otpauth_uri(username: str, secret: str, issuer: str = 'IlmIldizi Admin') -> str:
    label = urllib.parse.quote(f"{issuer}:{username}")
    params = urllib.parse.urlencode({
        'secret': secret,
        'issuer': issuer,
        'algorithm': 'SHA1',
        'digits': str(TOTP_DIGITS),
        'period': str(TOTP_PERIOD),
    })
    return f"otpauth://totp/{label}?{params}"


def normalize_recovery_code(code: str) -> str:
    return str(code or '').strip().upper().replace('-', '').replace(' ', '')


def hash_recovery_code(code: str) -> str:
    norm = normalize_recovery_code(code)
    return hashlib.sha256(f"ilmildizi-mfa-recovery-v1:{norm}".encode('utf-8')).hexdigest()


def generate_recovery_codes(count: int = RECOVERY_CODE_COUNT) -> tuple[list[str], list[str]]:
    """Returns (plaintext_codes, sha256_hashes)."""
    alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
    plain_codes = []
    hashes = []
    for _ in range(count):
        part1 = ''.join(secrets.choice(alphabet) for _ in range(4))
        part2 = ''.join(secrets.choice(alphabet) for _ in range(4))
        formatted = f"{part1}-{part2}"
        plain_codes.append(formatted)
        hashes.append(hash_recovery_code(formatted))
    return plain_codes, hashes


def consume_recovery_code(stored_hashes: list[str], candidate_code: str) -> tuple[bool, list[str]]:
    """Checks `candidate_code` against `stored_hashes` in constant time and removes the match."""
    norm = normalize_recovery_code(candidate_code)
    if len(norm) != 8:
        return False, stored_hashes
    cand_hash = hash_recovery_code(norm)
    matched_idx = None
    for idx, existing_hash in enumerate(stored_hashes):
        if hmac.compare_digest(str(existing_hash), cand_hash):
            matched_idx = idx
    if matched_idx is None:
        return False, stored_hashes
    remaining = [h for i, h in enumerate(stored_hashes) if i != matched_idx]
    return True, remaining


def enroll_or_get_pending_device(user) -> tuple[AdminMFADevice, str]:
    """Returns `(device, raw_secret)` for MFA enrollment. Raises `MFAEncryptionError` if key invalid."""
    device = AdminMFADevice.objects.filter(user=user).first()
    if device and device.is_confirmed:
        return device, get_device_raw_secret(device)
    if device is None:
        raw_secret = generate_totp_secret()
        envelope, used_kid = encrypt_totp_secret(raw_secret)
        device = AdminMFADevice.objects.create(
            user=user,
            secret=envelope,
            key_version=used_kid,
            is_confirmed=False,
        )
        return device, raw_secret
    raw_secret = get_device_raw_secret(device)
    return device, raw_secret


def mark_session_mfa_verified(request, user) -> None:
    request.session[SESSION_MFA_USER_KEY] = user.pk
    request.session[SESSION_MFA_TIME_KEY] = int(time.time())


def is_session_mfa_verified(request) -> bool:
    user = getattr(request, 'user', None)
    if not user or not user.is_authenticated:
        return False
    return request.session.get(SESSION_MFA_USER_KEY) == user.pk


def _wants_json(request) -> bool:
    content_type = (request.content_type or '').lower()
    accept = (request.headers.get('Accept') or '').lower()
    return 'application/json' in content_type or 'application/json' in accept


def _parse_request_data(request) -> dict:
    if 'application/json' in (request.content_type or '').lower():
        try:
            return json.loads(request.body.decode('utf-8') or '{}')
        except ValueError:
            return {}
    return request.POST.dict()


def _safe_next_url(request, default: str = '/admin/') -> str:
    candidate = request.GET.get('next') or request.POST.get('next') or default
    if url_has_allowed_host_and_scheme(candidate, allowed_hosts={request.get_host()}, require_https=request.is_secure()):
        return candidate
    return default


def _fail_closed_response(request, message: str = "MFA xavfsizlik xizmati sozlanmagan (fail-closed).") -> HttpResponse:
    logger.error("Admin MFA operation aborted (fail-closed): encryption key missing, invalid, or ciphertext tampered.")
    if _wants_json(request):
        return JsonResponse({'ok': False, 'error': message}, status=503)
    return HttpResponse(
        f"<!doctype html><html><body><h2>503 — {html.escape(message)}</h2></body></html>",
        status=503,
    )


def admin_mfa_enroll_view(request):
    """Enroll TOTP MFA for a staff/superuser account."""
    user = getattr(request, 'user', None)
    if not user or not user.is_authenticated or not (user.is_staff or user.is_superuser):
        return HttpResponseForbidden('Forbidden')

    try:
        device, raw_secret = enroll_or_get_pending_device(user)
    except MFAEncryptionError:
        return _fail_closed_response(request)

    otpauth_uri = build_otpauth_uri(user.username, raw_secret)
    next_url = _safe_next_url(request)

    if request.method == 'POST':
        data = _parse_request_data(request)
        code = str(data.get('code') or '').strip()
        ok, used_step = verify_totp_code_with_timestep(
            raw_secret,
            code,
            last_used_timestep=device.last_used_timestep,
        )
        if not ok:
            if _wants_json(request):
                return JsonResponse({'ok': False, 'error': "Tasdiqlash kodi noto'g'ri yoki muddati o'tgan."}, status=400)
            return _render_enroll_html(request, raw_secret, otpauth_uri, next_url, error="Tasdiqlash kodi noto'g'ri.")

        plain_codes, code_hashes = generate_recovery_codes()
        device.is_confirmed = True
        device.last_used_timestep = used_step
        device.recovery_code_hashes = code_hashes
        device.failed_attempts = 0
        device.locked_until = None
        device.last_verified_at = timezone.now()
        device.save(update_fields=[
            'is_confirmed', 'last_used_timestep', 'recovery_code_hashes',
            'failed_attempts', 'locked_until', 'last_verified_at', 'updated_at',
        ])
        mark_session_mfa_verified(request, user)

        if _wants_json(request):
            return JsonResponse({
                'ok': True,
                'recovery_codes': plain_codes,
                'next': next_url,
            })
        return _render_recovery_codes_html(plain_codes, next_url)

    if _wants_json(request):
        return JsonResponse({
            'enrolled': device.is_confirmed,
            'secret': raw_secret if not device.is_confirmed else None,
            'otpauth_uri': otpauth_uri if not device.is_confirmed else None,
        })
    return _render_enroll_html(request, raw_secret, otpauth_uri, next_url)


def admin_mfa_verify_view(request):
    """Verify a 6-digit TOTP code or single-use recovery code for `/admin/`."""
    user = getattr(request, 'user', None)
    if not user or not user.is_authenticated or not (user.is_staff or user.is_superuser):
        return HttpResponseForbidden('Forbidden')

    device = AdminMFADevice.objects.filter(user=user, is_confirmed=True).first()
    next_url = _safe_next_url(request)
    if device is None:
        return HttpResponseRedirect(f"/admin/mfa/enroll/?next={urllib.parse.quote(next_url)}")

    if request.method == 'GET':
        try:
            _get_mfa_keyring()
        except MFAEncryptionError:
            return _fail_closed_response(request)
        if _wants_json(request):
            return JsonResponse({'mfa_required': True, 'verified': is_session_mfa_verified(request)})
        return _render_verify_html(request, next_url)

    if request.method != 'POST':
        return HttpResponseForbidden('Method not allowed')

    data = _parse_request_data(request)
    code = str(data.get('code') or '').strip()
    now = timezone.now()

    try:
        with transaction.atomic():
            locked_device = AdminMFADevice.objects.select_for_update().get(pk=device.pk)
            if locked_device.locked_until and locked_device.locked_until > now:
                retry_after = max(1, int((locked_device.locked_until - now).total_seconds()))
                msg = f"Juda ko'p noto'g'ri urinish. {retry_after} soniyadan keyin qayta urinib ko'ring."
                if _wants_json(request):
                    return JsonResponse({'ok': False, 'error': msg, 'retry_after': retry_after}, status=429)
                return _render_verify_html(request, next_url, error=msg, status=429)

            raw_secret = get_device_raw_secret(locked_device)
            ok_totp, used_step = verify_totp_code_with_timestep(
                raw_secret,
                code,
                last_used_timestep=locked_device.last_used_timestep,
            )
            used_recovery = False
            if not ok_totp:
                ok_rec, remaining_hashes = consume_recovery_code(
                    list(locked_device.recovery_code_hashes or []),
                    code,
                )
                if ok_rec:
                    used_recovery = True
                    locked_device.recovery_code_hashes = remaining_hashes

            if ok_totp or used_recovery:
                if ok_totp:
                    locked_device.last_used_timestep = used_step
                locked_device.failed_attempts = 0
                locked_device.locked_until = None
                locked_device.last_verified_at = now
                locked_device.save(update_fields=[
                    'last_used_timestep', 'recovery_code_hashes',
                    'failed_attempts', 'locked_until', 'last_verified_at', 'updated_at',
                ])
                mark_session_mfa_verified(request, user)
                if _wants_json(request):
                    return JsonResponse({
                        'ok': True,
                        'method': 'recovery_code' if used_recovery else 'totp',
                        'used_recovery_code': used_recovery,
                        'remaining_recovery_codes': len(locked_device.recovery_code_hashes or []),
                        'next': next_url,
                    })
                return HttpResponseRedirect(next_url)

            locked_device.failed_attempts += 1
            status_code = 400
            err_msg = "TOTP yoki zaxira kodi noto'g'ri (yoki allaqachon ishlatilgan)."
            if locked_device.failed_attempts >= MAX_FAILED_ATTEMPTS:
                locked_device.locked_until = now + timedelta(seconds=LOCKOUT_SECONDS)
                status_code = 429
                err_msg = f"Juda ko'p noto'g'ri urinish. Hisob {LOCKOUT_SECONDS} soniyaga vaqtincha bloklandi."
            locked_device.save(update_fields=['failed_attempts', 'locked_until', 'updated_at'])
    except MFAEncryptionError:
        return _fail_closed_response(request)

    if _wants_json(request):
        return JsonResponse({'ok': False, 'error': err_msg}, status=status_code)
    return _render_verify_html(request, next_url, error=err_msg, status=status_code)


class AdminMFAMiddleware:
    """Enforces MFA verification on `/admin/` for staff and superusers."""

    EXEMPT_PREFIXES = (
        '/admin/login/',
        '/admin/logout/',
        '/admin/mfa/verify/',
        '/admin/mfa/enroll/',
        '/admin/jsi18n/',
    )

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        path = request.path_info or ''
        if path.startswith('/admin/') and not any(path.startswith(p) for p in self.EXEMPT_PREFIXES):
            user = getattr(request, 'user', None)
            if user and user.is_authenticated and (user.is_staff or user.is_superuser):
                device = AdminMFADevice.objects.filter(user=user, is_confirmed=True).first()
                is_test_run = len(sys.argv) > 1 and sys.argv[1] == 'test'
                mfa_required = bool(getattr(settings, 'ADMIN_MFA_REQUIRED', not is_test_run))
                if device is not None:
                    if not is_session_mfa_verified(request):
                        next_q = urllib.parse.quote(request.get_full_path())
                        return HttpResponseRedirect(f"/admin/mfa/verify/?next={next_q}")
                elif mfa_required:
                    next_q = urllib.parse.quote(request.get_full_path())
                    return HttpResponseRedirect(f"/admin/mfa/enroll/?next={next_q}")
        return self.get_response(request)


PANEL_MFA_MAX_AGE_SECONDS = 12 * 3600


def mark_panel_mfa_verified(user) -> None:
    if not user or not user.is_authenticated:
        return
    AdminMFADevice.objects.filter(user=user).update(last_verified_at=timezone.now())


def clear_panel_mfa_verified(user) -> None:
    if not user or not getattr(user, 'pk', None):
        return
    AdminMFADevice.objects.filter(user=user).update(last_verified_at=None)


def is_panel_mfa_verified(user) -> bool:
    if not user or not user.is_authenticated:
        return False
    device = AdminMFADevice.objects.filter(user=user, is_confirmed=True).first()
    if device is None or device.last_verified_at is None:
        return False
    age = (timezone.now() - device.last_verified_at).total_seconds()
    return 0 <= age <= PANEL_MFA_MAX_AGE_SECONDS


from rest_framework.decorators import api_view, permission_classes  # noqa: E402
from rest_framework.response import Response  # noqa: E402
from .permissions import IsSuperAdmin  # noqa: E402


@api_view(['GET'])
@permission_classes([IsSuperAdmin])
def panel_mfa_status_api(request):
    """Returns MFA enrollment & current session verification status for Next.js `/panel`."""
    user = request.user
    try:
        device = AdminMFADevice.objects.filter(user=user).first()
        if request.GET.get('reset') in ('1', 'true') and (device is None or not device.is_confirmed):
            if device:
                device.delete()
            device = None
        if device is None or not device.is_confirmed:
            device, raw_secret = enroll_or_get_pending_device(user)
            otpauth_uri = build_otpauth_uri(user.username, raw_secret)
            return Response({
                'enrolled': False,
                'verified': False,
                'secret': raw_secret,
                'otpauth_uri': otpauth_uri,
            })
        # Also verify key ring & auto-upgrade if needed
        get_device_raw_secret(device)
        verified = is_panel_mfa_verified(user)
        return Response({
            'enrolled': True,
            'verified': verified,
            'remaining_recovery_codes': len(device.recovery_code_hashes or []),
        })
    except MFAEncryptionError:
        return Response({'ok': False, 'error': "MFA shifrlash kaliti sozlanmagan (fail-closed)."}, status=503)


@api_view(['POST'])
@permission_classes([IsSuperAdmin])
def panel_mfa_enroll_api(request):
    """Confirms TOTP enrollment for Next.js `/panel` and returns 8 single-use recovery codes."""
    user = request.user
    try:
        device, raw_secret = enroll_or_get_pending_device(user)
    except MFAEncryptionError:
        return Response({'ok': False, 'error': "MFA shifrlash kaliti sozlanmagan (fail-closed)."}, status=503)

    code = str((request.data or {}).get('code') or '').strip()
    ok, used_step = verify_totp_code_with_timestep(
        raw_secret,
        code,
        last_used_timestep=device.last_used_timestep,
    )
    if not ok:
        return Response(
            {'ok': False, 'error': "Tasdiqlash kodi noto'g'ri yoki muddati o'tgan."},
            status=400,
        )
    plain_codes, code_hashes = generate_recovery_codes()
    now = timezone.now()
    device.is_confirmed = True
    device.last_used_timestep = used_step
    device.recovery_code_hashes = code_hashes
    device.failed_attempts = 0
    device.locked_until = None
    device.last_verified_at = now
    device.save(update_fields=[
        'is_confirmed', 'last_used_timestep', 'recovery_code_hashes',
        'failed_attempts', 'locked_until', 'last_verified_at', 'updated_at',
    ])
    return Response({
        'ok': True,
        'recovery_codes': plain_codes,
    })


@api_view(['POST'])
@permission_classes([IsSuperAdmin])
def panel_mfa_verify_api(request):
    """Verifies a 6-digit TOTP code or single-use recovery code for Next.js `/panel`."""
    user = request.user
    device = AdminMFADevice.objects.filter(user=user, is_confirmed=True).first()
    if device is None:
        return Response({'ok': False, 'error': "MFA hali sozlanmagan.", 'needs_enroll': True}, status=400)

    code = str((request.data or {}).get('code') or '').strip()
    now = timezone.now()

    try:
        with transaction.atomic():
            locked_device = AdminMFADevice.objects.select_for_update().get(pk=device.pk)
            if locked_device.locked_until and locked_device.locked_until > now:
                retry_after = max(1, int((locked_device.locked_until - now).total_seconds()))
                return Response(
                    {
                        'ok': False,
                        'error': f"Juda ko'p noto'g'ri urinish. {retry_after} soniyadan keyin qayta urinib ko'ring.",
                        'retry_after': retry_after,
                    },
                    status=429,
                )

            raw_secret = get_device_raw_secret(locked_device)
            ok_totp, used_step = verify_totp_code_with_timestep(
                raw_secret,
                code,
                last_used_timestep=locked_device.last_used_timestep,
            )
            used_recovery = False
            if not ok_totp:
                ok_rec, remaining_hashes = consume_recovery_code(
                    list(locked_device.recovery_code_hashes or []),
                    code,
                )
                if ok_rec:
                    used_recovery = True
                    locked_device.recovery_code_hashes = remaining_hashes

            if ok_totp or used_recovery:
                if ok_totp:
                    locked_device.last_used_timestep = used_step
                locked_device.failed_attempts = 0
                locked_device.locked_until = None
                locked_device.last_verified_at = now
                locked_device.save(update_fields=[
                    'last_used_timestep', 'recovery_code_hashes',
                    'failed_attempts', 'locked_until', 'last_verified_at', 'updated_at',
                ])
                return Response({
                    'ok': True,
                    'used_recovery_code': used_recovery,
                    'remaining_recovery_codes': len(locked_device.recovery_code_hashes or []),
                })

            locked_device.failed_attempts += 1
            status_code = 400
            err_msg = "TOTP yoki zaxira kodi noto'g'ri (yoki allaqachon ishlatilgan)."
            if locked_device.failed_attempts >= MAX_FAILED_ATTEMPTS:
                locked_device.locked_until = now + timedelta(seconds=LOCKOUT_SECONDS)
                status_code = 429
                err_msg = f"Juda ko'p noto'g'ri urinish. Hisob {LOCKOUT_SECONDS} soniyaga vaqtincha bloklandi."
            locked_device.save(update_fields=['failed_attempts', 'locked_until', 'updated_at'])
    except MFAEncryptionError:
        return Response({'ok': False, 'error': "MFA shifrlash kaliti sozlanmagan (fail-closed)."}, status=503)

    return Response({'ok': False, 'error': err_msg}, status=status_code)


@api_view(['POST'])
@permission_classes([IsSuperAdmin])
def panel_mfa_lock_api(request):
    """Locks the current Super Admin MFA session so the user must re-verify."""
    clear_panel_mfa_verified(request.user)
    return Response({'ok': True, 'verified': False})


def _render_enroll_html(request, secret: str, otpauth_uri: str, next_url: str, error: str = '') -> HttpResponse:
    csrf_token = get_token(request)
    err_block = f'<p style="color:#dc2626;font-weight:600;">{html.escape(error)}</p>' if error else ''
    qr_url = f"https://api.qrserver.com/v1/create-qr-code/?size=200x200&data={urllib.parse.quote(otpauth_uri)}"
    body = f"""<!doctype html>
<html lang="uz"><head><meta charset="utf-8"><title>Admin MFA Sozlash</title></head>
<body style="font-family:system-ui,sans-serif;max-width:480px;margin:40px auto;padding:24px;">
  <h2>Django Admin — 2-Bosqichli Himoya (TOTP MFA)</h2>
  {err_block}
  <p>Google Authenticator yoki 1Password ilovasida QR-kodni skanerlang yoki maxfiy kalitni kiriting:</p>
  <div style="text-align:center;margin:16px 0;">
    <img src="{html.escape(qr_url)}" alt="TOTP QR Code" width="200" height="200" style="border:1px solid #e5e7eb;border-radius:12px;padding:8px;background:#fff;">
  </div>
  <pre style="background:#f3f4f6;padding:12px;border-radius:8px;font-size:16px;text-align:center;letter-spacing:2px;">{html.escape(secret)}</pre>
  <p style="font-size:12px;color:#4b5563;word-break:break-all;">URI: {html.escape(otpauth_uri)}</p>
  <form method="post" action="/admin/mfa/enroll/">
    <input type="hidden" name="csrfmiddlewaretoken" value="{html.escape(csrf_token)}">
    <input type="hidden" name="next" value="{html.escape(next_url)}">
    <label>6 xonali kodni kiriting:</label><br>
    <input type="text" name="code" inputmode="numeric" autocomplete="one-time-code" required style="padding:8px;font-size:16px;margin:8px 0;width:100%;">
    <button type="submit" style="padding:10px 18px;background:#059669;color:#fff;border:none;border-radius:6px;cursor:pointer;">Faollashtirish</button>
  </form>
</body></html>"""
    return HttpResponse(body, status=400 if error else 200)


def _render_recovery_codes_html(codes: list[str], next_url: str) -> HttpResponse:
    items = ''.join(f'<li><code>{html.escape(c)}</code></li>' for c in codes)
    body = f"""<!doctype html>
<html lang="uz"><head><meta charset="utf-8"><title>Zaxira Kodlari</title></head>
<body style="font-family:system-ui,sans-serif;max-width:480px;margin:40px auto;padding:24px;">
  <h2>MFA Muvaffaqiyatli Faollashtirildi</h2>
  <p>Quyidagi bir martalik zaxira kodlarini xavfsiz joyga saqlab qo'ying (ular faqat bir marta ko'rsatiladi):</p>
  <ul style="background:#f3f4f6;padding:16px 32px;border-radius:8px;line-height:1.8;">{items}</ul>
  <a href="{html.escape(next_url)}" style="display:inline-block;padding:10px 18px;background:#059669;color:#fff;text-decoration:none;border-radius:6px;">Admin panelga o'tish</a>
</body></html>"""
    return HttpResponse(body, status=200)


def _render_verify_html(request, next_url: str, error: str = '', status: int = 200) -> HttpResponse:
    csrf_token = get_token(request)
    err_block = f'<p style="color:#dc2626;font-weight:600;">{html.escape(error)}</p>' if error else ''
    body = f"""<!doctype html>
<html lang="uz"><head><meta charset="utf-8"><title>Admin MFA Tasdiqlash</title></head>
<body style="font-family:system-ui,sans-serif;max-width:440px;margin:40px auto;padding:24px;">
  <h2>Admin MFA Tasdiqlash</h2>
  {err_block}
  <form method="post" action="/admin/mfa/verify/">
    <input type="hidden" name="csrfmiddlewaretoken" value="{html.escape(csrf_token)}">
    <input type="hidden" name="next" value="{html.escape(next_url)}">
    <label>6 xonali TOTP kod yoki zaxira kodni kiriting:</label><br>
    <input type="text" name="code" autocomplete="one-time-code" required style="padding:8px;font-size:16px;margin:8px 0;width:100%;">
    <button type="submit" style="padding:10px 18px;background:#059669;color:#fff;border:none;border-radius:6px;cursor:pointer;">Tasdiqlash</button>
  </form>
</body></html>"""
    return HttpResponse(body, status=status)
