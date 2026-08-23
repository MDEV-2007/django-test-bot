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
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView

from .models import Profile, ensure_profile_for_user
from .referrals import apply_referral
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
    profile.update_streak()
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


@api_view(['POST'])
@permission_classes([AllowAny])
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
        return Response({'error': ' '.join(e.messages)}, status=400)

    user = User.objects.create_user(
        username=username, password=password, first_name=first_name, last_name=last_name,
    )
    profile = ensure_profile_for_user(user)
    profile.avatar_url = f'https://api.dicebear.com/7.x/adventurer/svg?seed={username}'
    profile.save()
    if ref_code:
        apply_referral(profile, ref_code)

    return _auth_response(user)


@api_view(['POST'])
@permission_classes([AllowAny])
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
        if ref_code:
            apply_referral(profile, ref_code)

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
def telegram_login_api(request):
    init_data = request.data.get('initData')
    if not init_data:
        return Response({'error': 'Missing initData'}, status=400)

    if not verify_telegram_webapp_data(init_data, settings.TELEGRAM_BOT_TOKEN):
        return Response({'error': 'Invalid signature'}, status=401)

    parsed = urllib.parse.parse_qs(init_data)
    user_json = parsed.get('user', [None])[0]
    if not user_json:
        return Response({'error': 'User data missing in initData'}, status=400)

    user_data = json.loads(user_json)
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
        django_username = f'tg_{tg_id}'
        user, created = User.objects.get_or_create(username=django_username)
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
        if start_param:
            apply_referral(profile, start_param)

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
    def post(self, request, *args, **kwargs):
        try:
            return super().post(request, *args, **kwargs)
        except User.DoesNotExist:
            return Response({'detail': 'User no longer exists.'}, status=401)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me_api(request):
    profile = ensure_profile_for_user(request.user)
    return Response(ProfileSerializer(profile).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def profile_api(request):
    from battles.models import Battle
    from django.db.models import Q as _Q

    from core.achievements import BADGE_DEFS, TOTAL_BADGES, evaluate_badges

    from .referrals import ensure_referral_code, get_telegram_deep_link, referral_stats

    profile = ensure_profile_for_user(request.user)
    evaluate_badges(profile)
    recent_attempts = profile.attempts.select_related('test').order_by('-started_at')[:5]
    recent_battles = (Battle.objects.filter(_Q(player1=profile) | _Q(player2=profile))
                       .select_related('player1__user', 'player2__user', 'winner')
                       .order_by('-created_at')[:5])
    badges = profile.badges.select_related('badge')

    return Response({
        'profile': ProfileSerializer(profile).data,
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
