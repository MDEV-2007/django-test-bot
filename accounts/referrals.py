"""Referral (viral loop) domain logic — kept out of views so it's reusable from the
website, the Telegram bot, and the Mini App login paths, and unit-testable without HTTP.

Mechanics: a referral link/code carries a Profile's `referral_code`. When a BRAND NEW
account is created with that code, both sides get +REFERRAL_BONUS_COINS coins, once,
forever — enforced at the database level by ReferralBonus.referred being a OneToOneField
(see accounts.models), not just by the check in `apply_referral` below.
"""
import secrets

from django.db import transaction

from .models import Profile, ReferralBonus

REFERRAL_BONUS_COINS = 10

# Excludes visually ambiguous characters (0/O, 1/I/L) so a code read aloud or hand-typed
# from a screenshot doesn't get mistyped.
_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
_CODE_LENGTH = 8


def generate_referral_code() -> str:
    return ''.join(secrets.choice(_CODE_ALPHABET) for _ in range(_CODE_LENGTH))


def ensure_referral_code(profile: Profile) -> str:
    """Return this profile's referral code, generating and persisting one if it doesn't
    have one yet. Lazy generation means every pre-existing profile is backfilled on first
    use instead of needing a data migration."""
    if profile.referral_code:
        return profile.referral_code
    # Collision odds are astronomically low (32^8 codes), but loop anyway rather than trust it.
    for _ in range(10):
        code = generate_referral_code()
        if not Profile.objects.filter(referral_code=code).exists():
            profile.referral_code = code
            profile.save(update_fields=['referral_code'])
            return code
    raise RuntimeError("Could not generate a unique referral code")


def get_referral_link(profile: Profile, request=None) -> str:
    """Absolute link to share. With a `request` (web views) it's built off the current
    host; without one (bot context, no request object) it falls back to WEBAPP_URL."""
    from django.conf import settings
    from django.urls import reverse

    code = ensure_referral_code(profile)
    path = reverse('accounts:register') + f'?ref={code}'
    if request is not None:
        return request.build_absolute_uri(path)
    base = (getattr(settings, 'WEBAPP_URL', '') or '').rstrip('/')
    return f'{base}{path}'


def get_telegram_deep_link(profile: Profile) -> str:
    """t.me/<bot>?start=CODE deep link, or '' if TELEGRAM_BOT_USERNAME isn't configured.

    Used instead of the website link when sharing from INSIDE the Telegram Mini App: a
    plain website URL opened from Telegram's share sheet just opens a browser, dropping the
    recipient out of Telegram entirely, whereas this deep link reopens Telegram itself and
    triggers the bot's /start handler (which applies the referral and offers the Mini App)."""
    from django.conf import settings

    username = (getattr(settings, 'TELEGRAM_BOT_USERNAME', '') or '').lstrip('@')
    if not username:
        return ''
    code = ensure_referral_code(profile)
    return f'https://t.me/{username}?start={code}'


@transaction.atomic
def apply_referral(new_profile: Profile, code: str) -> Profile | None:
    """Link `new_profile` to the referrer identified by `code` and award coins to both
    sides. Returns the referrer profile on success, or None if the code is invalid, the
    user is referring themselves, or `new_profile` was already referred (already linked or
    already has a bonus row) — all silent no-ops, since a bad/missing code should never
    block signup.

    Must be called ONLY at account-creation time (new_profile.referred_by is still None) —
    callers are responsible for that, since applying it later would let an existing user
    farm bonuses by "discovering" a code after the fact.
    """
    code = (code or '').strip().upper()
    if not code or new_profile.referred_by_id is not None:
        return None

    referrer = Profile.objects.select_for_update().filter(referral_code=code).first()
    if referrer is None or referrer.pk == new_profile.pk:
        return None
    if ReferralBonus.objects.filter(referred=new_profile).exists():
        return None  # already rewarded (defensive; OneToOneField would also raise below)

    new_profile.referred_by = referrer
    new_profile.save(update_fields=['referred_by'])

    referrer.add_coins(REFERRAL_BONUS_COINS)
    new_profile.add_coins(REFERRAL_BONUS_COINS)

    ReferralBonus.objects.create(referrer=referrer, referred=new_profile, coins_awarded=REFERRAL_BONUS_COINS)
    return referrer


def referral_stats(profile: Profile) -> dict:
    """Summary for the profile page / dashboard: how many people this profile has
    referred and how many coins that has earned them so far."""
    count = profile.referral_bonuses_given.count()
    return {
        'referral_count': count,
        'coins_earned': count * REFERRAL_BONUS_COINS,
    }
