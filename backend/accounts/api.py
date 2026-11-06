"""JWT-based auth API for the Next.js frontend (frontend/).

Why a separate auth path instead of reusing the session-cookie login in accounts/views.py:
a cross-origin SPA can't reliably rely on Django's session cookie (SameSite=Lax blocks it
on cross-site fetch/WebSocket) or its cookie-based CSRF token. These endpoints issue a JWT
pair instead — the frontend sends it back as `Authorization: Bearer <token>`, which sidesteps
both problems. The verification logic itself (Google ID token, Telegram WebApp HMAC) is the
same as accounts/utils.py already uses for the session-based login in accounts/views.py —
only the "how do we hand the result back to the client" step differs.
"""
import json
import urllib.parse

from django.conf import settings
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.utils import timezone
from rest_framework.decorators import api_view, parser_classes, permission_classes, throttle_classes
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView
from core.parsers import ObjectJSONParser

from .models import Profile, ensure_profile_for_user
from .referrals import apply_referral
from .throttles import AuthThrottle, RefreshThrottle, RegisterThrottle
from analytics.tracking import record_signup_source
from .serializers import ProfileSerializer
from .utils import (
    generate_unique_username,
    login_clear_failures,
    login_is_locked,
    login_record_failure,
    sync_telegram_avatar,
    verify_google_id_token,
    verify_telegram_webapp_data,
)


def _tokens_for(user):
    refresh = RefreshToken.for_user(user)
    return {'access': str(refresh.access_token), 'refresh': str(refresh)}


def _auth_response(user):
    profile = ensure_profile_for_user(user)
    if user.is_staff or user.is_superuser or getattr(profile, 'is_superadmin', False):
        from .admin_mfa import clear_panel_mfa_verified
        clear_panel_mfa_verified(user)
    # Login streakni oshirmaydi — faqat o'qish amallari (audit ECON-002).
    return Response({**_tokens_for(user), 'user': ProfileSerializer(profile).data})


@api_view(['GET'])
@permission_classes([AllowAny])
def auth_config_api(request):
    return Response({
        'google_client_id': settings.GOOGLE_OAUTH_CLIENT_ID or None,
        'telegram_bot_username': settings.TELEGRAM_BOT_USERNAME or None,
    })


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([AuthThrottle])
def login_api(request):
    username = request.data.get('username')
    password = request.data.get('password')

    if login_is_locked(request, username):
        return Response({'error': "Juda ko'p urinish. Iltimos, 15 daqiqadan so'ng qayta urinib ko'ring."}, status=429)

    user = authenticate(request, username=username, password=password)
    if user is None or not user.is_active:
        login_record_failure(request, username)
        return Response({'error': 'Foydalanuvchi nomi yoki parol xato!'}, status=401)

    login_clear_failures(request, username)
    return _auth_response(user)


# Django'ning parol validatorlari xabarlarini inglizcha qaytaradi (o'zbekcha tarjimasi yo'q),
# shuning uchun ro'yxatdan o'tish formasi uchun kod bo'yicha o'zbekchalashtiriladi.
_PASSWORD_ERRORS_UZ = {
    'password_too_short': "Parol kamida 8 ta belgidan iborat bo'lsin.",
    'password_too_common': "Bu parol juda oddiy — boshqasini tanlang.",
    'password_entirely_numeric': "Parol faqat raqamlardan iborat bo'lmasin.",
    'password_too_similar': "Parol ismingiz yoki loginingizga juda o'xshash.",
}


def _password_error_uz(err):
    return _PASSWORD_ERRORS_UZ.get(err.code, ' '.join(err.messages))


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([RegisterThrottle])
def register_api(request):
    username = (request.data.get('username') or '').strip()
    first_name = (request.data.get('first_name') or '').strip()
    last_name = (request.data.get('last_name') or '').strip()
    password = request.data.get('password') or ''
    ref_code = (request.data.get('ref') or '').strip()

    if not username or not first_name or not password.strip():
        return Response({'error': "Iltimos, barcha majburiy maydonlarni to'ldiring."}, status=400)
    if ' ' in username:
        return Response({'error': "Foydalanuvchi nomida bo'sh joy bo'lishi mumkin emas."}, status=400)
    if len(username) < 3:
        return Response({'error': "Foydalanuvchi nomi kamida 3 ta belgidan iborat bo'lsin."}, status=400)
    if User.objects.filter(username__iexact=username).exists():
        return Response({'error': 'Bu foydalanuvchi nomi band!'}, status=400)
    try:
        validate_password(password, user=User(username=username, first_name=first_name))
    except ValidationError as e:
        return Response({'error': ' '.join(_password_error_uz(err) for err in e.error_list)}, status=400)

    user = User.objects.create_user(
        username=username, password=password, first_name=first_name, last_name=last_name,
    )
    profile = ensure_profile_for_user(user)
    profile.avatar_url = f'https://api.dicebear.com/7.x/adventurer/svg?seed={username}'
    profile.save()
    referrer = apply_referral(profile, ref_code) if ref_code else None
    record_signup_source(profile, request.data.get('source') or 'web', referred=bool(referrer))

    return _auth_response(user)


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([AuthThrottle])
def google_login_api(request):
    if not settings.GOOGLE_OAUTH_CLIENT_ID:
        return Response({'error': 'Google kirish sozlanmagan.'}, status=503)

    claims = verify_google_id_token(request.data.get('credential'))
    if not claims:
        return Response({'error': "Google orqali kirishni tasdiqlab bo'lmadi."}, status=401)

    google_sub = str(claims.get('sub'))
    email = (claims.get('email') or '').strip().lower()
    first_name = claims.get('given_name', '') or ''
    last_name = claims.get('family_name', '') or ''
    picture = claims.get('picture', '') or ''

    profile = Profile.objects.filter(google_id=google_sub).select_related('user').first()
    if profile is None and email:
        existing = User.objects.filter(email__iexact=email).order_by('id').first()
        if existing is not None:
            profile = ensure_profile_for_user(existing)

    if profile is None:
        username = generate_unique_username(email.split('@')[0] if email else 'user')
        user = User.objects.create_user(username=username, email=email)
        user.first_name = first_name
        user.last_name = last_name
        user.save()
        profile = ensure_profile_for_user(user)
        profile.google_id = google_sub
        profile.avatar_url = picture or f'https://api.dicebear.com/7.x/adventurer/svg?seed={username}'
        profile.save()
        ref_code = (request.data.get('ref') or '').strip()
        referrer = apply_referral(profile, ref_code) if ref_code else None
        record_signup_source(profile, request.data.get('source') or 'web_google', referred=bool(referrer))

    user = profile.user
    if not user.is_active:
        return Response({'error': "Hisobingiz vaqtincha chetlashtirilgan."}, status=403)

    update_fields = []
    if profile.google_id != google_sub:
        profile.google_id = google_sub
        update_fields.append('google_id')
    if picture and profile.avatar_url != picture:
        profile.avatar_url = picture
        update_fields.append('avatar_url')
    if update_fields:
        profile.save(update_fields=update_fields)
    if email and not user.email:
        user.email = email
        user.save(update_fields=['email'])

    return _auth_response(user)


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([AuthThrottle])
def telegram_login_api(request):
    init_data = request.data.get('initData') if isinstance(request.data, dict) else None
    if not init_data or not isinstance(init_data, str):
        return Response({'error': 'Missing initData'}, status=400)

    # Bo'sh token bilan HMAC'ni istalgan odam hisoblay oladi — bunday muhitda Telegram
    # orqali kirish butunlay o'chiriladi (audit AUTH-006).
    if not settings.TELEGRAM_BOT_TOKEN:
        return Response({'error': "Telegram orqali kirish sozlanmagan."}, status=503)

    if not verify_telegram_webapp_data(init_data, settings.TELEGRAM_BOT_TOKEN):
        return Response({'error': 'Invalid signature'}, status=401)

    parsed = urllib.parse.parse_qs(init_data)
    user_json = parsed.get('user', [None])[0]
    if not user_json:
        return Response({'error': 'User data missing in initData'}, status=400)

    try:
        user_data = json.loads(user_json)
    except (TypeError, ValueError):
        return Response({'error': 'Invalid user data in initData'}, status=400)  # AUTH-012
    if not isinstance(user_data, dict) or not str(user_data.get('id') or '').isdigit():
        return Response({'error': 'Invalid user data in initData'}, status=400)
    tg_id = str(user_data.get('id'))
    first_name = user_data.get('first_name', '')
    last_name = user_data.get('last_name', '')
    # Telegram username ixtiyoriy: hisobda @nom bo'lmasa, kalit umuman kelmaydi.
    # Uni `tg_<id>` bilan to'ldirmaymiz — u Django ichki nomi, foydalanuvchining
    # Telegram nomi emas; bo'sh maydonni interfeys o'zi to'g'ri ko'rsatadi.
    tg_username = (user_data.get('username') or '').lstrip('@')

    try:
        profile = Profile.objects.get(telegram_id=tg_id)
        user = profile.user
        if not user.is_active:
            return Response({'error': 'Hisobingiz chetlashtirilgan.'}, status=403)
        # @nomni har kirishda yangilaymiz: u Telegram tomonida istalgan payt o'zgaradi
        # va ilgari faqat hisob birinchi marta yaratilganda yozilar edi, ya'ni eski
        # foydalanuvchilarda bu maydon abadiy bo'sh qolardi.
        if tg_username != (profile.telegram_username or ''):
            profile.telegram_username = tg_username
            profile.save(update_fields=['telegram_username'])
    except Profile.DoesNotExist:
        # Hisob faqat Telegram ID bo'yicha bog'lanadi. Ilgari ID topilmasa @username bo'yicha
        # boshqa (telegram_id'siz) hisobga ulanardi — Telegram username'lari qayta beriladi,
        # ya'ni handle'ning yangi egasi eski hisobni egallab olardi (audit AUTH-007).
        django_username = f'tg_{tg_id}'
        user, created = User.objects.get_or_create(username=django_username)
        if not created and not user.is_active:
            return Response({'error': 'Hisobingiz chetlashtirilgan.'}, status=403)
        if created:
            user.first_name = first_name
            user.last_name = last_name
            user.save()

        profile = ensure_profile_for_user(user)
        profile.telegram_id = tg_id
        profile.telegram_username = tg_username
        profile.avatar_url = f'https://api.dicebear.com/7.x/adventurer/svg?seed={tg_username or tg_id}'
        profile.last_active_date = timezone.localdate()
        profile.save()

        start_param = (request.data.get('start_param') or '').strip()
        referrer = None
        if start_param and not start_param.startswith(('mock_', 'arena_', 'landing', 'pdf_')):
            referrer = apply_referral(profile, start_param)
        record_signup_source(profile, request.data.get('source') or start_param or 'telegram_miniapp',
                             referred=bool(referrer))

    tg_photo = sync_telegram_avatar(tg_id)
    if tg_photo:
        profile.avatar_url = tg_photo
        profile.save(update_fields=['avatar_url'])

    return _auth_response(user)


class SafeTokenRefreshView(TokenRefreshView):
    """simplejwt's own TokenRefreshView 500s (uncaught User.DoesNotExist) instead of 401
    when a still-unexpired refresh token names a user that no longer exists in the DB —
    e.g. an account deleted after the browser already cached the token, or leftover test
    data. A stale/invalid token is a normal client-side condition, not a server error."""
    throttle_classes = [RefreshThrottle]

    def post(self, request, *args, **kwargs):
        from rest_framework_simplejwt.exceptions import TokenError

        from .tokens import token_is_revoked

        # Expired impersonation sessions must not be renewed by rotation (audit API-007).
        raw = request.data.get('refresh') if isinstance(request.data, dict) else None
        if raw:
            try:
                parsed = RefreshToken(raw)
                if token_is_revoked(parsed.payload.get('user_id'), parsed.payload):
                    return Response({'detail': 'Token has been revoked.', 'code': 'token_revoked'}, status=401)
            except TokenError:
                pass  # let the parent view produce its normal 401
        try:
            return super().post(request, *args, **kwargs)
        except User.DoesNotExist:
            return Response({'detail': 'User no longer exists.'}, status=401)


@api_view(['POST'])
@permission_classes([AllowAny])
def logout_api(request):
    """Revoke the caller's refresh token (audit AUTH-002). With `all_devices: true` and a
    valid access token, every session of the user is revoked."""
    from rest_framework_simplejwt.exceptions import TokenError

    from .tokens import revoke_user_tokens

    data = request.data if isinstance(request.data, dict) else {}
    if data.get('all_devices') and request.user and request.user.is_authenticated:
        revoke_user_tokens(request.user)
        return Response({'ok': True})
    raw = data.get('refresh')
    if raw:
        try:
            RefreshToken(raw).blacklist()
        except TokenError:
            pass  # already invalid/blacklisted — logout is idempotent
    return Response({'ok': True})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me_api(request):
    profile = ensure_profile_for_user(request.user)
    return Response(ProfileSerializer(profile).data)


def _from_miniapp(request):
    """So'rov Telegram Mini App ichidan keldimi.

    Frontend Telegram muhitini aniqlagach shu sarlavhani qo'shadi
    (frontend/src/lib/api-client.ts). Kanal obunasi talabi faqat shu holatda
    qo'llanadi — brauzerdan kirgan foydalanuvchi hech qachon bloklanmaydi."""
    return bool(request.META.get('HTTP_X_TELEGRAM_MINIAPP'))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def subscription_api(request):
    """Majburiy kanal obunasi holati (telegrambot/subscription.py).

    Alohida endpoint, `me_api` ichida emas: javob Telegramga tarmoq so'rovi bo'lishi mumkin,
    va u ilovaning eng issiq yo'lini (har ochilishdagi /me/) sekinlashtirmasligi kerak."""
    from telegrambot.subscription import state_for

    profile = ensure_profile_for_user(request.user)
    return Response(state_for(profile, in_miniapp=_from_miniapp(request)))


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def subscription_check_api(request):
    """"Tekshirdim" tugmasi: keshni chetlab o'tib, Telegramdan yangi javob oladi."""
    from telegrambot.subscription import invalidate, state_for

    profile = ensure_profile_for_user(request.user)
    invalidate(profile.telegram_id)
    return Response(state_for(profile, use_cache=False, in_miniapp=_from_miniapp(request)))


@api_view(['GET', 'POST', 'PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser, ObjectJSONParser])
def profile_api(request):
    from battles.models import Battle
    from django.db.models import Q as _Q

    from core.achievements import BADGE_DEFS, TOTAL_BADGES, evaluate_badges

    from .referrals import ensure_referral_code, get_telegram_deep_link, referral_stats

    profile = ensure_profile_for_user(request.user)

    if request.method in ('POST', 'PUT', 'PATCH'):
        user = request.user
        updated_user_fields = []
        if 'first_name' in request.data:
            user.first_name = str(request.data.get('first_name', '')).strip()[:150]  # DB limit (API-004)
            updated_user_fields.append('first_name')
        if 'last_name' in request.data:
            user.last_name = str(request.data.get('last_name', '')).strip()[:150]
            updated_user_fields.append('last_name')
        if updated_user_fields:
            user.save(update_fields=updated_user_fields)

        updated_profile_fields = []
        if 'exam_track' in request.data:
            track = request.data.get('exam_track')
            if track in ('DTM_SERTIFIKAT', 'IELTS_SAT', 'TOPIK_KOREAN', 'ARABIC_CEFR'):
                profile.exam_track = track
                updated_profile_fields.append('exam_track')
        if 'region' in request.data:
            profile.region = str(request.data.get('region', '')).strip()[:100]
            updated_profile_fields.append('region')
        if updated_profile_fields:
            profile.save(update_fields=updated_profile_fields)

        remove_avatar = request.data.get('remove_avatar')
        if remove_avatar in (True, 'true', '1'):
            if profile.avatar_url and profile.avatar_url.startswith('/media/avatars/'):
                from django.core.files.storage import default_storage
                old_rel = profile.avatar_url.replace('/media/', '', 1)
                if default_storage.exists(old_rel):
                    try:
                        default_storage.delete(old_rel)
                    except Exception:
                        pass
            profile.avatar_url = ''
            profile.save(update_fields=['avatar_url'])
            try:
                from shop.models import InventoryItem
                from shop.services import _bust_equipped_cache
                InventoryItem.objects.filter(profile=profile, item__category='avatar', is_equipped=True).update(is_equipped=False)
                _bust_equipped_cache(profile.pk)
            except Exception:
                pass

        avatar_file = request.FILES.get('avatar')
        if avatar_file:
            if avatar_file.size > 10 * 1024 * 1024:
                return Response({'error': "Rasm hajmi 10 MB dan oshmasligi kerak."}, status=400)

            import secrets
            from django.core.files.storage import default_storage
            ext = avatar_file.name.rsplit('.', 1)[-1].lower() if '.' in avatar_file.name else 'jpg'
            if ext not in ('jpg', 'jpeg', 'png', 'webp', 'gif'):
                ext = 'jpg'
            fname = f"avatars/user_{user.id}_{secrets.token_hex(4)}.{ext}"

            if profile.avatar_url and profile.avatar_url.startswith('/media/avatars/'):
                old_rel = profile.avatar_url.replace('/media/', '', 1)
                if default_storage.exists(old_rel):
                    try:
                        default_storage.delete(old_rel)
                    except Exception:
                        pass

            saved_name = default_storage.save(fname, avatar_file)
            profile.avatar_url = default_storage.url(saved_name)
            profile.save(update_fields=['avatar_url'])

            try:
                from shop.models import InventoryItem
                from shop.services import _bust_equipped_cache
                InventoryItem.objects.filter(profile=profile, item__category='avatar', is_equipped=True).update(is_equipped=False)
                _bust_equipped_cache(profile.pk)
            except Exception:
                pass

        profile.refresh_from_db()

    evaluate_badges(profile)
    today = timezone.localdate()
    solved_today = profile.attempts.filter(is_completed=True, completed_at__date=today).count()
    recent_attempts = profile.attempts.select_related('test').order_by('-started_at')[:5]
    recent_battles = (Battle.objects.filter(_Q(player1=profile) | _Q(player2=profile))
                       .select_related('player1__user', 'player2__user', 'winner')
                       .order_by('-created_at')[:5])
    badges = profile.badges.select_related('badge')

    return Response({
        'ok': True,
        'profile': ProfileSerializer(profile).data,
        'solved_today': solved_today,
        'referral_code': ensure_referral_code(profile),
        # Telegram Mini App ichidan ulashish uchun: oddiy veb-havola brauzerni ochib,
        # odamni Telegramdan chiqarib yuboradi; deep link esa botning /start handler'ini
        # ishga tushiradi va referralni qo'llaydi. TELEGRAM_BOT_USERNAME sozlanmagan
        # bo'lsa bo'sh satr qaytadi — frontend o'shanda tugmani ko'rsatmaydi.
        'telegram_deep_link': get_telegram_deep_link(profile),
        'referral_stats': referral_stats(profile),
        'recent_attempts': [{
            'id': a.id, 'test_title': a.test.title if a.test else 'Tasodifiy Test',
            'score': a.score, 'started_at': a.started_at,
        } for a in recent_attempts],
        'recent_battles': [{
            'id': b.id,
            'opponent': (b.bot_name if b.is_vs_bot else
                         (b.player2.user.first_name or b.player2.user.username if b.player1_id == profile.id and b.player2
                          else (b.player1.user.first_name or b.player1.user.username))),
            'won': b.winner_id == profile.id, 'created_at': b.created_at,
        } for b in recent_battles],
        'badges': [{'name': pb.badge.name, 'description': pb.badge.description,
                    'icon_name': pb.badge.icon_name, 'rarity': pb.badge.rarity} for pb in badges],
        # Qulflangan yutuqlar ham nomi bilan qaytariladi — profilda bir xil "Qulflangan"
        # kataklar o'rniga o'quvchi qaysi yutuq qolganini va sharti nimaligini ko'radi.
        'locked_badges': [{'name': d['name'], 'description': d['description'],
                           'icon_name': d['icon_name'], 'rarity': d['rarity']}
                          for d in BADGE_DEFS
                          if d['name'] not in {pb.badge.name for pb in badges}],
        'total_badges': TOTAL_BADGES,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def onboarding_complete_api(request):
    profile = ensure_profile_for_user(request.user)
    profile.has_seen_onboarding = True
    profile.save(update_fields=['has_seen_onboarding'])
    return Response({'ok': True})
