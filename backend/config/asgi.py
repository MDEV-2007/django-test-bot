"""
ASGI config for config project.

Routes HTTP through Django as always, and WebSocket connections (Battle Arena live
PvP — matchmaking + in-battle round exchange) through Channels. `scope['user']` is
resolved either from a `?token=` JWT (the Next.js frontend, see config/ws_auth.py)
or the session cookie (existing same-origin Django templates).

For more information on this file, see
https://docs.djangoproject.com/en/6.0/howto/deployment/asgi/
"""

import os

from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

# Must resolve the Django ASGI app before importing anything that touches models —
# this populates django.apps registry that channels/routing imports below rely on.
django_asgi_app = get_asgi_application()

from channels.routing import ProtocolTypeRouter, URLRouter  # noqa: E402

from config.ws_auth import JWTAuthMiddlewareStack  # noqa: E402
import battles.routing  # noqa: E402
import panel.routing  # noqa: E402

application = ProtocolTypeRouter({
    'http': django_asgi_app,
    # JWTAuthMiddlewareStack tries a `?token=` JWT first (the Next.js frontend), falling
    # back to the session cookie (existing same-origin Django templates) — see
    # config/ws_auth.py for why both paths are needed.
    'websocket': JWTAuthMiddlewareStack(
        URLRouter(battles.routing.websocket_urlpatterns + panel.routing.websocket_urlpatterns)
    ),
})
