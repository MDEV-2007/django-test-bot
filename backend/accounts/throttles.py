"""Rate limits for the unauthenticated auth endpoints (audit AUTH-008).

Keyed on the client IP as DRF sees it. settings.REST_FRAMEWORK['NUM_PROXIES'] = 1 makes
DRF use the address our nginx appended to X-Forwarded-For, not a value the client typed.
Rates are generous because schools put many students behind one NAT address.
"""
from rest_framework.throttling import AnonRateThrottle, SimpleRateThrottle


class _CacheResilientThrottleMixin:
    """When Redis is down, rate-limit cache reads/writes must not crash auth endpoints with 500."""

    def allow_request(self, request, view):
        try:
            return super().allow_request(request, view)
        except Exception:
            return True


class AuthThrottle(_CacheResilientThrottleMixin, AnonRateThrottle):
    """login / Google / Telegram login."""
    scope = 'auth'


class RegisterThrottle(_CacheResilientThrottleMixin, AnonRateThrottle):
    scope = 'register'


class RefreshThrottle(_CacheResilientThrottleMixin, SimpleRateThrottle):
    """Token refresh is anonymous by nature (the refresh token is the credential)."""
    scope = 'auth_refresh'

    def get_cache_key(self, request, view):
        return self.cache_format % {'scope': self.scope, 'ident': self.get_ident(request)}
