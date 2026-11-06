"""JWT-based WebSocket auth for the Next.js frontend (frontend/).

Channels' built-in AuthMiddlewareStack authenticates a WS connection from the Django
session cookie carried on the handshake — that's fine for the existing same-origin Django
templates (templates/battles/arena.html), but a cross-origin Next.js client can't reliably
rely on that cookie arriving at all (SameSite=Lax blocks it on a cross-site handshake; see
accounts/api.py for the matching HTTP-side reasoning). Next.js instead connects with
`?token=<JWT access token>` and this middleware resolves *that* into scope['user'],
overriding whatever AuthMiddlewareStack resolved (or didn't) from the session cookie.

Wire this as the innermost layer, i.e. AuthMiddlewareStack(JWTAuthMiddleware(router)) — so
session-cookie auth still works for same-origin clients when no token is present.
"""
from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import AccessToken


@database_sync_to_async
def _user_from_token(token):
    # Imported here (apps must be ready) but BEFORE the try: the except clause below
    # references User, which used to raise NameError when AccessToken() failed first.
    from django.contrib.auth.models import User

    from accounts.tokens import token_is_revoked

    try:
        validated = AccessToken(token)
        user = User.objects.get(id=validated['user_id'])
    except (TokenError, User.DoesNotExist, KeyError):
        return AnonymousUser()
    # Banned users and revoked tokens must not keep live sockets (audit AUTH-004).
    if not user.is_active or token_is_revoked(user.pk, validated.payload):
        return AnonymousUser()
    return user


class JWTAuthMiddleware:
    def __init__(self, inner):
        self.inner = inner

    async def __call__(self, scope, receive, send):
        query = parse_qs((scope.get('query_string') or b'').decode())
        token = query.get('token', [None])[0]
        if token:
            scope['user'] = await _user_from_token(token)
        return await self.inner(scope, receive, send)


def JWTAuthMiddlewareStack(inner):
    from channels.auth import AuthMiddlewareStack
    return AuthMiddlewareStack(JWTAuthMiddleware(inner))
