"""JWT authentication that also fixes the CurrentUserMiddleware audit-log gap (see
panel/middleware.py's set_current_user docstring): CurrentUserMiddleware stashes
request.user into a thread-local before DRF's own authentication runs, so a JWT request
always looks anonymous to it. Authenticating through this class instead of the stock
JWTAuthentication re-syncs that thread-local the moment a token is verified, so every
mutating API endpoint across the whole project (teacher/api.py, panel/api.py, ...) gets a
correctly-attributed audit log for free, instead of each view having to remember to call
set_current_user itself — a per-view opt-in that's easy to miss (and was missed here once
already, on teacher/api.py, before this was made global)."""
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import AuthenticationFailed

from panel.middleware import set_current_user

from .tokens import token_is_revoked


class AuditAwareJWTAuthentication(JWTAuthentication):
    def authenticate(self, request):
        result = super().authenticate(request)
        if result is not None:
            user, token = result
            # Logout-everywhere / password reset / expired impersonation (audit AUTH-002, API-007).
            if token_is_revoked(user.pk, token.payload):
                raise AuthenticationFailed('Token has been revoked.', code='token_revoked')
            set_current_user(user)
        return result
