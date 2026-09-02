import threading

from django.core.cache import cache
from django.http import JsonResponse

_thread_locals = threading.local()


def get_current_user():
    """The user handling the current request, or None outside a request (shell, management
    commands, background tasks). The audit-log signals use this to attribute changes."""
    return getattr(_thread_locals, 'user', None)


def set_current_user(user):
    """Overrides the thread-local for the rest of this request. Needed by the JWT API
    (panel/api.py): CurrentUserMiddleware runs before DRF's own authentication resolves
    `request.user` from the Authorization header, so it always captures AnonymousUser for
    a JWT request — every mutating panel API view calls this once DRF has actually
    authenticated the caller, so audit-log entries get attributed to the real admin instead
    of "Tizim" (System)."""
    _thread_locals.user = user


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
    can still turn it back off. The flag is cached briefly to avoid a query per request.

    ADMINNI QULFLAB QO'YMASLIK — bu sinfning eng muhim talabi.

    Ilgari ruxsat ro'yxatida faqat ESKI, Django tomonidan chiziladigan sahifalar
    (`/panel/`, `/accounts/login`) bor edi. Interfeys Next.js'ga ko'chgach, admin paneli
    ma'lumotni `/api/panel/` dan, tokenni esa `/api/auth/` dan oladi — ikkalasi ham
    ro'yxatda yo'q edi. Natijada rejim yoqilgan zahoti:

      - `/panel/settings` sahifasi ochilardi (uni Next chizadi), lekin ma'lumot so'rovi
        503 olardi va sahifa cheksiz "yuklanmoqda" holatida qolardi;
      - ya'ni rejimni O'CHIRADIGAN yagona ekran ham ishlamasdi.

    Ikkinchi sabab: JWT bilan kelgan so'rovda `request.user` bu bosqichda hali
    AnonymousUser — DRF autentifikatsiyani KEYINROQ, view ichida bajaradi. Shuning uchun
    "super admin bo'lsa o'tkaz" istisnosi yangi interfeys uchun umuman ishlamasdi.

    Ikkalasi ham quyida tuzatilgan. Qo'shimcha zaxira: `manage.py maintenance_mode off`
    (panel butunlay ishlamay qolgan holat uchun)."""

    ALLOW_PREFIXES = (
        # Eski, server tomonda chiziladigan panel va kirish sahifalari.
        '/panel/', '/accounts/login', '/accounts/logout', '/admin/',
        # Next.js paneli SHU manzillardan ma'lumot oladi. Ularsiz admin rejimni
        # o'chira olmaydi — bu qulflab qo'yishning aynan o'zi.
        # Xavfsizlik: `/api/panel/` ning har bir view'i `IsSuperAdmin` bilan
        # himoyalangan, ya'ni bu yerda ochish hech kimga ortiqcha huquq bermaydi.
        '/api/panel/',
        # Token yangilash va kirish. Bo'lmasa, tokeni eskirgan admin qayta kira
        # olmaydi va yana qulf ostida qoladi.
        '/api/auth/',
        '/static/', '/media/',
    )

    def __init__(self, get_response):
        self.get_response = get_response

    def _maintenance_on(self):
        val = cache.get('maintenance_mode')
        if val is None:
            from .models import SiteSettings
            val = SiteSettings.load().maintenance_mode
            cache.set('maintenance_mode', val, 30)
        return val

    def _is_superadmin(self, request):
        """Sessiya bilan ham, JWT bilan ham ishlaydi.

        Middleware DRF autentifikatsiyasidan OLDIN ishlaydi, shuning uchun JWT
        so'rovida `request.user` hali AnonymousUser bo'ladi — tokenni shu yerda o'zimiz
        tekshiramiz."""
        profile = getattr(getattr(request, 'user', None), 'profile', None)
        if profile is not None and profile.is_superadmin:
            return True

        header = request.META.get('HTTP_AUTHORIZATION', '')
        if not header.startswith('Bearer '):
            return False
        try:
            from rest_framework_simplejwt.authentication import JWTAuthentication

            result = JWTAuthentication().authenticate(request)
        except Exception:
            # Yaroqsiz/muddati o'tgan token — bu shunchaki "admin emas" degani.
            # Bu yerda xato ko'tarilsa, texnik ishlar rejimi butun saytni 500 qilardi.
            return False
        if not result:
            return False
        user = result[0]
        user_profile = getattr(user, 'profile', None)
        return bool(user_profile is not None and user_profile.is_superadmin)

    def __call__(self, request):
        if self._maintenance_on() and not request.path.startswith(self.ALLOW_PREFIXES):
            if not self._is_superadmin(request):
                # Frontend bu javobni ko'rib, o'z "texnik ishlar" ekranini chizadi.
                return JsonResponse(
                    {
                        'detail': "Saytda texnik ishlar olib borilmoqda. Birozdan so'ng urinib ko'ring.",
                        'maintenance': True,
                    },
                    status=503,
                )
        return self.get_response(request)
