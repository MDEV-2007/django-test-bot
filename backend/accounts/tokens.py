"""JWT revocation helpers (audit AUTH-002 / AUTH-004 / API-007).

Refresh tokens are revoked through SimpleJWT's token_blacklist app. Access tokens are
stateless and short-lived (60 min), so instead of a per-token blacklist a user-wide
"revoked at" timestamp is kept in the cache for one access-token lifetime: any access
token issued before it is refused. That makes logout-everywhere / password reset /
deactivation take effect immediately rather than after up to an hour.
"""
import time
from datetime import timedelta

from django.conf import settings
from django.core.cache import cache
from rest_framework_simplejwt.tokens import RefreshToken

# Impersonation sessions are a superadmin-level credential (stop-impersonation turns them
# back into the admin's own tokens), so they get a short absolute lifetime that refresh
# rotation cannot extend.
IMPERSONATION_LIFETIME = timedelta(hours=1)


def _revoked_key(user_id):
    return f"jwt_revoked_at:{user_id}"


def _access_lifetime_seconds():
    lifetime = settings.SIMPLE_JWT.get('ACCESS_TOKEN_LIFETIME', timedelta(minutes=60))
    return int(lifetime.total_seconds())


def revoke_user_tokens(user):
    """Blacklist every outstanding refresh token of `user` and invalidate their access tokens."""
    from django.db import IntegrityError, models, transaction
    from django.db.models import Case, F, Value, When
    from core.models import RewardClaim
    from core.reward_caps import _ONCE_DAY
    from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken

    for token in OutstandingToken.objects.filter(user=user).exclude(blacklistedtoken__isnull=False):
        BlacklistedToken.objects.get_or_create(token=token)
    # `iat` has whole-second resolution: tokens issued in an EARLIER second are refused, so a
    # fresh login right after "log out everywhere" keeps working. Stored durably in DB so
    # Redis restart/eviction or outage cannot resurrect revoked access tokens (SEC-001).
    now_ts = int(time.time())
    key = dict(subject_id=user.pk, source='jwt_revoked_at', day=_ONCE_DAY, item='')
    if not RewardClaim.objects.filter(**key).exists():
        try:
            with transaction.atomic():
                RewardClaim.objects.create(**key, count=now_ts)
        except IntegrityError:
            pass
    RewardClaim.objects.filter(**key).update(
        count=Case(
            When(count__lt=now_ts, then=Value(now_ts, output_field=models.PositiveBigIntegerField())),
            default=F('count'),
            output_field=models.PositiveBigIntegerField(),
        )
    )
    try:
        cache.set(_revoked_key(user.pk), now_ts, _access_lifetime_seconds() + 60)
    except Exception:
        pass


def token_is_revoked(user_id, payload) -> bool:
    """True if this (validated) token must be refused for a non-signature reason."""
    from core.models import RewardClaim
    from core.reward_caps import _ONCE_DAY

    db_revoked_at = int(
        RewardClaim.objects.filter(
            subject_id=user_id,
            source='jwt_revoked_at',
            day=_ONCE_DAY,
            item='',
        )
        .values_list('count', flat=True)
        .first()
        or 0
    )
    try:
        cached = cache.get(_revoked_key(user_id))
        cached_revoked_at = int(cached) if cached is not None else 0
    except Exception:
        cached_revoked_at = 0

    revoked_at = max(db_revoked_at, cached_revoked_at)
    if db_revoked_at and cached_revoked_at < db_revoked_at:
        try:
            cache.set(_revoked_key(user_id), db_revoked_at, _access_lifetime_seconds() + 60)
        except Exception:
            pass

    issued_at = payload.get('iat')
    if revoked_at and issued_at is not None and int(issued_at) < revoked_at:
        return True
    imp_exp = payload.get('imp_exp')
    if imp_exp is not None and time.time() > float(imp_exp):
        return True
    return False


def impersonation_tokens(target_user, impersonator):
    """A short-lived token pair for an admin acting as `target_user`."""
    refresh = RefreshToken.for_user(target_user)
    refresh.set_exp(lifetime=IMPERSONATION_LIFETIME)
    expires_at = int(time.time() + IMPERSONATION_LIFETIME.total_seconds())
    refresh['impersonator_id'] = impersonator.pk
    refresh['imp_exp'] = expires_at
    access = refresh.access_token  # copies the custom claims above
    return refresh, access
