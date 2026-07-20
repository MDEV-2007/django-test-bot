import hashlib
import hmac
import logging
import urllib.parse

import requests
from django.conf import settings
from django.core.cache import cache

logger = logging.getLogger(__name__)


# --- Login brute-force throttle ---------------------------------------------
# After LOGIN_MAX_FAILURES failed attempts for the same (username, IP) within the
# window, further attempts are refused for LOGIN_LOCKOUT_SECONDS — without even
# checking the password. This protects the shared login form that teacher and
# super-admin accounts also use, without a heavyweight dependency.
LOGIN_MAX_FAILURES = 8
LOGIN_LOCKOUT_SECONDS = 15 * 60


def _client_ip(request):
    xff = request.META.get('HTTP_X_FORWARDED_FOR', '')
    if xff:
        return xff.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR', 'unknown')


def _login_throttle_key(username, ip):
    ident = hashlib.sha256(f"{(username or '').lower()}|{ip}".encode('utf-8')).hexdigest()[:32]
    return f"login_fail:{ident}"


def login_is_locked(request, username):
    key = _login_throttle_key(username, _client_ip(request))
    return (cache.get(key, 0) or 0) >= LOGIN_MAX_FAILURES


def login_record_failure(request, username):
    key = _login_throttle_key(username, _client_ip(request))
    try:
        cache.add(key, 0, LOGIN_LOCKOUT_SECONDS)
        cache.incr(key)
    except ValueError:
        cache.set(key, 1, LOGIN_LOCKOUT_SECONDS)


def login_clear_failures(request, username):
    cache.delete(_login_throttle_key(username, _client_ip(request)))


def send_telegram_message(chat_id: str, text: str) -> bool:
    """Best-effort notification to a Telegram user. Never raises — a failed
    notification (e.g. bot token not configured, user blocked the bot) should
    never break the calling view (payment approval, etc.)."""
    if not chat_id:
        return False
    try:
        resp = requests.post(
            f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/sendMessage",
            data={"chat_id": chat_id, "text": text},
            timeout=5,
        )
        return resp.ok
    except Exception:
        logger.warning("Failed to send Telegram message to %s", chat_id, exc_info=True)
        return False


def send_telegram_photo(chat_id: str, image_path: str, caption: str) -> bool:
    """Send a photo with caption to a Telegram user via sendPhoto (multipart upload).
    Falls back to a plain sendMessage if the file cannot be read.
    Never raises.
    """
    if not chat_id:
        return False
    token = settings.TELEGRAM_BOT_TOKEN
    if not token:
        return False
    try:
        with open(image_path, 'rb') as f:
            resp = requests.post(
                f"https://api.telegram.org/bot{token}/sendPhoto",
                data={
                    "chat_id": chat_id,
                    # Telegram caption limit is 1024 characters
                    "caption": caption[:1024],
                },
                files={"photo": f},
                timeout=15,
            )
        return resp.ok
    except FileNotFoundError:
        logger.warning("Broadcast image not found at %s — falling back to text", image_path)
        return send_telegram_message(chat_id, caption)
    except Exception:
        logger.warning("Failed to send Telegram photo to %s", chat_id, exc_info=True)
        return False


def get_telegram_photo_url(tg_id: str) -> str | None:
    """Fetch the largest available Telegram profile photo URL for *tg_id*.

    Uses two Bot API calls:
      1. getUserProfilePhotos  — returns file_ids for the user's photos
      2. getFile               — resolves a file_id to a downloadable path

    Returns the full URL on success, or None if the user has no photo,
    the token is missing, or any network/API error occurs.  Never raises.
    """
    token = settings.TELEGRAM_BOT_TOKEN
    if not token or not tg_id:
        return None
    try:
        # Step 1: get photo file_ids
        resp1 = requests.get(
            f"https://api.telegram.org/bot{token}/getUserProfilePhotos",
            params={"user_id": tg_id, "limit": 1},
            timeout=5,
        )
        data1 = resp1.json()
        if not data1.get("ok"):
            return None
        photos = data1.get("result", {}).get("photos", [])
        if not photos:
            return None  # user has no profile photo
        # Pick the largest size (last item in the sizes list)
        file_id = photos[0][-1]["file_id"]

        # Step 2: resolve file_id → file_path
        resp2 = requests.get(
            f"https://api.telegram.org/bot{token}/getFile",
            params={"file_id": file_id},
            timeout=5,
        )
        data2 = resp2.json()
        if not data2.get("ok"):
            return None
        file_path = data2.get("result", {}).get("file_path")
        if not file_path:
            return None

        return f"https://api.telegram.org/file/bot{token}/{file_path}"
    except Exception:
        logger.warning("Failed to fetch Telegram photo for user %s", tg_id, exc_info=True)
        return None


# initData imzosi to'g'ri bo'lsa ham, undagi auth_date shu muddatdan eski bo'lsa
# rad etiladi — o'g'irlangan/eski initData'ni qayta ishlatish (replay) hujumidan himoya.
TELEGRAM_INITDATA_MAX_AGE_SECONDS = 24 * 60 * 60  # 24 soat


def verify_telegram_webapp_data(init_data_str: str, bot_token: str) -> bool:
    """
    Verifies the data received from the Telegram Web App.
    See: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app

    Ikki bosqichli tekshiruv:
      1. HMAC-SHA256 imzo (ma'lumot haqiqatan Telegram'dan kelganmi)
      2. auth_date yoshi (eski initData replay qilinmayaptimi)
    """
    try:
        # Parse query string
        parsed = urllib.parse.parse_qs(init_data_str, keep_blank_values=True)
        if 'hash' not in parsed:
            return False

        received_hash = parsed.pop('hash')[0]

        # Sort and join all parameters with \n (key=value)
        # Note: parsed values from parse_qs are lists, we need the first element
        sorted_params = sorted(parsed.items())
        data_check_lines = []
        for key, val_list in sorted_params:
            # We take the first element (which is the actual value)
            data_check_lines.append(f"{key}={val_list[0]}")

        data_check_string = "\n".join(data_check_lines)

        # Calculate secret key
        # secret_key = HMAC_SHA256(key="WebAppData", msg=bot_token)
        secret_key = hmac.new(b"WebAppData", bot_token.encode('utf-8'), hashlib.sha256).digest()

        # Calculate validation hash
        # calculated_hash = HMAC_SHA256(key=secret_key, msg=data_check_string).hexdigest()
        calculated_hash = hmac.new(secret_key, data_check_string.encode('utf-8'), hashlib.sha256).hexdigest()

        if not hmac.compare_digest(calculated_hash, received_hash):
            return False

        # --- auth_date muddati: imzo to'g'ri, lekin juda eski bo'lsa ham rad etamiz ---
        import time as _time
        auth_date = int(parsed.get('auth_date', ['0'])[0])
        if auth_date <= 0:
            return False
        if _time.time() - auth_date > TELEGRAM_INITDATA_MAX_AGE_SECONDS:
            logger.warning("Telegram initData rad etildi: auth_date juda eski (%s)", auth_date)
            return False

        return True
    except Exception:
        return False
