"""Role-based access control for the Super Admin (/panel/) and Teacher (/teacher/) panels.

Provides both function-view decorators (the codebase is predominantly function-based) and
CBV mixins. A logged-out user is sent to the login page; a logged-in user with the wrong
role gets a styled 403 page (rendered directly with status=403 so it looks the same whether
DEBUG is on or off), not Django's default traceback/forbidden screen."""
from functools import wraps

from django.contrib.auth.mixins import LoginRequiredMixin
from django.contrib.auth.views import redirect_to_login
from django.http import JsonResponse
from django.utils.cache import add_never_cache_headers


def _profile(user):
    return getattr(user, 'profile', None)


def is_last_active_superadmin(user):
    """True if `user` is an active super admin and no OTHER active super admin exists.
    Used to block the actions (delete / block / role-demote) that would otherwise leave
    the platform with zero people able to reach the Super Admin panel."""
    from django.contrib.auth.models import User
    from django.db.models import Q

    if not user.is_active:
        return False
    profile = _profile(user)
    is_sa = user.is_superuser or (profile is not None and profile.role == 'superadmin')
    if not is_sa:
        return False
    others = (User.objects.filter(is_active=True)
              .filter(Q(is_superuser=True) | Q(profile__role='superadmin'))
              .exclude(pk=user.pk))
    return not others.exists()


def _forbidden(request):
    # Django endi faqat backend — 403 sahifasi shablon emas, JSON javob.
    resp = JsonResponse({'detail': "Bu bo'limga ruxsatingiz yo'q."}, status=403)
    add_never_cache_headers(resp)
    return resp


def _no_store(response):
    """Marks a privileged-panel response as non-cacheable (Cache-Control: no-store, ...).
    Without this, a browser can serve a cached admin/teacher page from its back-forward
    cache after the user logs out — leaking data on shared devices."""
    add_never_cache_headers(response)
    return response


def superadmin_required(view_func):
    @wraps(view_func)
    def _wrapped(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return redirect_to_login(request.get_full_path())
        profile = _profile(request.user)
        if profile is None or not profile.is_superadmin:
            return _forbidden(request)
        return _no_store(view_func(request, *args, **kwargs))
    return _wrapped


def teacher_required(view_func):
    """Teacher panel access. A superadmin is allowed in too (they simply see only the
    content they themselves created, thanks to the created_by scoping) — harmless, and it
    lets an admin preview the teacher experience."""
    @wraps(view_func)
    def _wrapped(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return redirect_to_login(request.get_full_path())
        profile = _profile(request.user)
        if profile is None or not (profile.is_teacher or profile.is_superadmin):
            return _forbidden(request)
        return _no_store(view_func(request, *args, **kwargs))
    return _wrapped


class _RoleRequiredMixin(LoginRequiredMixin):
    role_check = None  # name of the Profile boolean property to require

    def dispatch(self, request, *args, **kwargs):
        if not request.user.is_authenticated:
            return self.handle_no_permission()
        profile = _profile(request.user)
        if profile is None or not self._passes(profile):
            return _forbidden(request)
        return _no_store(super().dispatch(request, *args, **kwargs))

    def _passes(self, profile):
        raise NotImplementedError


class SuperAdminRequiredMixin(_RoleRequiredMixin):
    def _passes(self, profile):
        return profile.is_superadmin


class TeacherRequiredMixin(_RoleRequiredMixin):
    def _passes(self, profile):
        return profile.is_teacher or profile.is_superadmin


# ---- DRF permission classes for the Next.js JWT API (accounts/api.py, teacher/api.py,
# panel/api.py) — same role checks as above, just returning 401/403 JSON instead of a
# redirect/rendered 403 page, since there's no Django session or template response here.
from rest_framework.permissions import BasePermission  # noqa: E402


class IsTeacher(BasePermission):
    message = "Faqat o'qituvchilar uchun."

    def has_permission(self, request, view):
        profile = _profile(request.user)
        return bool(profile and (profile.is_teacher or profile.is_superadmin))


class IsSuperAdmin(BasePermission):
    message = "Faqat administrator uchun."

    def has_permission(self, request, view):
        profile = _profile(request.user)
        return bool(profile and profile.is_superadmin)
