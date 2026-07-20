import threading

from django.core.cache import cache
from django.shortcuts import render

_thread_locals = threading.local()


def get_current_user():
    """The user handling the current request, or None outside a request (shell, management
    commands, background tasks). The audit-log signals use this to attribute changes."""
    return getattr(_thread_locals, 'user', None)


class CurrentUserMiddleware:
    """Stashes request.user in a thread-local so model signals (which don't receive the
    request) can attribute AuditLog entries to whoever is logged in."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        _thread_locals.user = getattr(request, 'user', None)
        try:
            response = self.get_response(request)
        finally:
            _thread_locals.user = None
        return response


class MaintenanceModeMiddleware:
    """When SiteSettings.maintenance_mode is on, everyone except a super admin gets a
    maintenance page. The panel, login/logout and static/media stay reachable so an admin
    can still turn it back off. The flag is cached briefly to avoid a query per request."""

    ALLOW_PREFIXES = ('/panel/', '/accounts/login', '/accounts/logout', '/static/', '/media/', '/admin/')

    def __init__(self, get_response):
        self.get_response = get_response

    def _maintenance_on(self):
        val = cache.get('maintenance_mode')
        if val is None:
            from .models import SiteSettings
            val = SiteSettings.load().maintenance_mode
            cache.set('maintenance_mode', val, 30)
        return val

    def __call__(self, request):
        if self._maintenance_on() and not request.path.startswith(self.ALLOW_PREFIXES):
            profile = getattr(getattr(request, 'user', None), 'profile', None)
            is_super = bool(profile and profile.is_superadmin)
            if not is_super:
                return render(request, 'panel/maintenance.html', status=503)
        return self.get_response(request)
