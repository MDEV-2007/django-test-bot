"""RFC 6238 TOTP Multi-Factor Authentication + Single-Use Recovery Codes for Django Admin (/admin/).

Protects staff/superuser access to `/admin/` against credential stuffing, phishing, and
TOTP replay attacks without adding external native dependencies.
"""
import base64
import hashlib
import hmac
import html
import json
import secrets
import struct
import time
import urllib.parse
from datetime import timedelta

from django.conf import settings
from django.core import signing
from django.db import transaction
from django.http import HttpResponse, HttpResponseForbidden, HttpResponseRedirect, JsonResponse
from django.middleware.csrf import get_token
from django.utils import timezone
from django.utils.http import url_has_allowed_host_and_scheme

from .models import AdminMFADevice

TOTP_PERIOD = 30
TOTP_DIGITS = 6
MAX_FAILED_ATTEMPTS = 5
LOCKOUT_SECONDS = 300
RECOVERY_CODE_COUNT = 8
SESSION_MFA_USER_KEY = 'admin_mfa_verified_user_id'
SESSION_MFA_TIME_KEY = 'admin_mfa_verified_at'
_SECRET_SALT = 'accounts.admin_mfa.secret.v1'


def generate_totp_secret() -> str:
    """Returns a 160-bit (32 Base32 chars) RFC 6238 secret."""
    return base64.b32encode(secrets.token_bytes(20)).decode('ascii').rstrip('=')


def _seal_secret(raw_secret: str) -> str:
    return signing.dumps(raw_secret, salt=_SECRET_SALT)


def _unseal_secret(stored_secret: str) -> str:
    if not stored_secret:
        return ''
    try:
        return str(signing.loads(stored_secret, salt=_SECRET_SALT))
    except signing.BadSignature:
        # Fallback if a raw Base32 secret was stored directly in tests
        return stored_secret


def get_device_raw_secret(device: AdminMFADevice) -> str:
    return _unseal_secret(device.secret)


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
    window: int = 1,
    last_used_timestep: int = 0,
) -> tuple[bool, int]:
    """Verifies a 6-digit TOTP code and prevents replay of any timestep <= `last_used_timestep`."""
    candidate = str(code or '').strip().replace(' ', '')
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


def enroll_or_get_pending_device(user) -> tuple[AdminMFADevice, str]:
    """Returns `(device, raw_secret)` for MFA enrollment."""
    device = AdminMFADevice.objects.filter(user=user).first()
    if device and device.is_confirmed:
        return device, get_device_raw_secret(device)
    if device is None:
        raw_secret = generate_totp_secret()
        device = AdminMFADevice.objects.create(
            user=user,
            secret=_seal_secret(raw_secret),
            is_confirmed=False,
        )
        return device, raw_secret
    raw_secret = get_device_raw_secret(device)
    if not raw_secret:
        raw_secret = generate_totp_secret()
        device.secret = _seal_secret(raw_secret)
        device.save(update_fields=['secret', 'updated_at'])
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


def admin_mfa_enroll_view(request):
    """Enroll TOTP MFA for a staff/superuser account."""
    user = getattr(request, 'user', None)
    if not user or not user.is_authenticated or not (user.is_staff or user.is_superuser):
        return HttpResponseForbidden('Forbidden')

    device, raw_secret = enroll_or_get_pending_device(user)
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
        device.save(update_fields=[
            'is_confirmed', 'last_used_timestep', 'recovery_code_hashes',
            'failed_attempts', 'locked_until', 'updated_at',
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
        if _wants_json(request):
            return JsonResponse({'mfa_required': True, 'verified': is_session_mfa_verified(request)})
        return _render_verify_html(request, next_url)

    if request.method != 'POST':
        return HttpResponseForbidden('Method not allowed')

    data = _parse_request_data(request)
    code = str(data.get('code') or '').strip()
    now = timezone.now()

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
            candidate_hash = hash_recovery_code(code)
            existing_hashes = list(locked_device.recovery_code_hashes or [])
            matched_idx = None
            for idx, stored_hash in enumerate(existing_hashes):
                if hmac.compare_digest(str(stored_hash), candidate_hash):
                    matched_idx = idx
                    break
            if matched_idx is not None:
                existing_hashes.pop(matched_idx)
                locked_device.recovery_code_hashes = existing_hashes
                used_recovery = True

        if ok_totp or used_recovery:
            if ok_totp:
                locked_device.last_used_timestep = used_step
            locked_device.failed_attempts = 0
            locked_device.locked_until = None
            locked_device.save(update_fields=[
                'last_used_timestep', 'recovery_code_hashes',
                'failed_attempts', 'locked_until', 'updated_at',
            ])
            mark_session_mfa_verified(request, user)
            if _wants_json(request):
                return JsonResponse({
                    'ok': True,
                    'method': 'recovery_code' if used_recovery else 'totp',
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
                mfa_required = bool(getattr(settings, 'ADMIN_MFA_REQUIRED', not settings.DEBUG))
                if device is not None:
                    if not is_session_mfa_verified(request):
                        next_q = urllib.parse.quote(request.get_full_path())
                        return HttpResponseRedirect(f"/admin/mfa/verify/?next={next_q}")
                elif mfa_required:
                    next_q = urllib.parse.quote(request.get_full_path())
                    return HttpResponseRedirect(f"/admin/mfa/enroll/?next={next_q}")
        return self.get_response(request)


def _render_enroll_html(request, secret: str, otpauth_uri: str, next_url: str, error: str = '') -> HttpResponse:
    csrf_token = get_token(request)
    err_block = f'<p style="color:#dc2626;font-weight:600;">{html.escape(error)}</p>' if error else ''
    body = f"""<!doctype html>
<html lang="uz"><head><meta charset="utf-8"><title>Admin MFA Sozlash</title></head>
<body style="font-family:system-ui,sans-serif;max-width:480px;margin:40px auto;padding:24px;">
  <h2>Django Admin — 2-Bosqichli Himoya (TOTP MFA)</h2>
  {err_block}
  <p>Google Authenticator yoki 1Password ilovasiga quyidagi maxfiy kalitni kiriting:</p>
  <pre style="background:#f3f4f6;padding:12px;border-radius:8px;font-size:16px;">{html.escape(secret)}</pre>
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
