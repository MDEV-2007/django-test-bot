import json
import re
import urllib.parse
from django.conf import settings
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.shortcuts import render, redirect
from django.urls import reverse
from django.contrib.auth import login, logout, authenticate
from django.contrib.auth.models import User
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone
from .models import Profile, ensure_profile_for_user
from .utils import (
    verify_telegram_webapp_data,
    login_is_locked, login_record_failure, login_clear_failures,
    get_telegram_photo_url,
    verify_google_id_token, generate_unique_username,
)
from .referrals import apply_referral, ensure_referral_code, get_referral_link, get_telegram_deep_link, referral_stats

def _post_login_redirect(profile):
    """Staff roles land in their panel; students (who haven't seen the onboarding splash
    screens) land on the onboarding flow first, then the dashboard."""
    if profile.is_superadmin:
        return redirect('panel:dashboard')
    if profile.is_teacher:
        return redirect('teacher:dashboard')
    if not profile.has_seen_onboarding:
        return redirect('accounts:onboarding')
    return redirect('dashboard:home')

def login_view(request):
    if request.user.is_authenticated:
        return redirect('dashboard:home')

    error_msg = None
    if request.method == 'POST':
        # Handle standard username/password login
        username = request.POST.get('username')
        password = request.POST.get('password')

        if login_is_locked(request, username):
            error_msg = "Juda ko'p urinish. Iltimos, 15 daqiqadan so'ng qayta urinib ko'ring."
            return render(request, 'accounts/login.html', {
                'error': error_msg,
                'google_client_id': settings.GOOGLE_OAUTH_CLIENT_ID,
            })

        user = authenticate(request, username=username, password=password)
        if user is not None:
            login_clear_failures(request, username)
            login(request, user)
            profile = ensure_profile_for_user(user)
            profile.update_streak()
            return _post_login_redirect(profile)
        else:
            try:
                potential_user = User.objects.get(username=username)
                if not potential_user.is_active and potential_user.check_password(password):
                    error_msg = f"{username} siz bot huquqlarni buzgan hisoblanasiz shuning uchun botimizda chetlashtirildingiz bir necha muddatga"
                else:
                    login_record_failure(request, username)
                    error_msg = "Foydalanuvchi nomi yoki parol xato!"
            except User.DoesNotExist:
                login_record_failure(request, username)
                error_msg = "Foydalanuvchi nomi yoki parol xato!"

    return render(request, 'accounts/login.html', {
        'error': error_msg,
        'google_client_id': settings.GOOGLE_OAUTH_CLIENT_ID,
    })

def register_view(request):
    if request.user.is_authenticated:
        return redirect('dashboard:home')
        
    error_msg = None
    form_values = {}
    # Carried through from ?ref=CODE on the initial GET (register.html stashes it into a
    # hidden field via JS) so it survives the POST regardless of which field it arrived in.
    ref_code = (request.POST.get('ref') or request.GET.get('ref') or '').strip()
    if request.method == 'POST':
        # Strip every field: without this a value of only spaces passed straight through,
        # so accounts were created with a whitespace username AND a whitespace password —
        # which nobody could ever type to log back in.
        username = (request.POST.get('username') or '').strip()
        first_name = (request.POST.get('first_name') or '').strip()
        last_name = (request.POST.get('last_name') or '').strip()
        # The password is NOT stripped (leading/trailing spaces can be intentional), but it
        # must contain more than whitespace.
        password = request.POST.get('password') or ''

        # Repopulate the form on error so the user doesn't retype everything.
        form_values = {'username': username, 'first_name': first_name, 'last_name': last_name}

        if not username or not first_name or not password.strip():
            error_msg = "Iltimos, barcha majburiy maydonlarni to'ldiring (bo'sh joy hisobga olinmaydi)."
        elif ' ' in username:
            error_msg = "Foydalanuvchi nomida bo'sh joy bo'lishi mumkin emas."
        elif len(username) < 3:
            error_msg = "Foydalanuvchi nomi kamida 3 ta belgidan iborat bo'lsin."
        elif not re.match(r'^[A-Za-z0-9_.]+$', username):
            error_msg = "Foydalanuvchi nomida faqat harflar, raqamlar, _ va . ishlatiladi."
        elif User.objects.filter(username__iexact=username).exists():
            error_msg = "Bu foydalanuvchi nomi band!"
        else:
            # Hold passwords to the project's configured validators (length, common
            # passwords, all-numeric, similarity to the username).
            try:
                validate_password(password, user=User(username=username, first_name=first_name))
            except ValidationError as e:
                error_msg = ' '.join(e.messages)

        if not error_msg:
            user = User.objects.create_user(
                username=username, password=password,
                first_name=first_name, last_name=last_name,
            )
            profile = ensure_profile_for_user(user)
            profile.avatar_url = f'https://api.dicebear.com/7.x/adventurer/svg?seed={username}'
            profile.save()
            if ref_code:
                apply_referral(profile, ref_code)
            login(request, user)
            return _post_login_redirect(profile)

    return render(request, 'accounts/register.html', {
        'error': error_msg,
        'values': form_values,
        'google_client_id': settings.GOOGLE_OAUTH_CLIENT_ID,
        'ref_code': ref_code,
    })

def logout_view(request):
    logout(request)
    return redirect('accounts:login')

@csrf_exempt
def tg_login(request):
    """
    Endpoint for Telegram WebApp to authenticate.
    Expects json payload: { "initData": "..." }
    """
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Method not allowed'}, status=405)
        
    try:
        data = json.loads(request.body)
        init_data = data.get('initData')
        if not init_data:
            return JsonResponse({'success': False, 'error': 'Missing initData'}, status=400)
            
        # Verify the signature
        is_valid = verify_telegram_webapp_data(init_data, settings.TELEGRAM_BOT_TOKEN)
        if not is_valid:
            return JsonResponse({'success': False, 'error': 'Invalid signature'}, status=401)
            
        # Extract user info from initData
        parsed = urllib.parse.parse_qs(init_data)
        user_json = parsed.get('user', [None])[0]
        if not user_json:
            return JsonResponse({'success': False, 'error': 'User data missing in initData'}, status=400)
            
        user_data = json.loads(user_json)
        tg_id = str(user_data.get('id'))
        first_name = user_data.get('first_name', '')
        last_name = user_data.get('last_name', '')
        username = user_data.get('username', f"tg_{tg_id}")
        
        # Check if user exists or create
        try:
            profile = Profile.objects.get(telegram_id=tg_id)
            user = profile.user
            if not user.is_active:
                return JsonResponse({
                    'success': False,
                    'error': f"{username} siz bot huquqlarni buzgan hisoblanasiz shuning uchun botimizda chetlashtirildingiz bir necha muddatga"
                }, status=403)
        except Profile.DoesNotExist:
            # Create django user
            # Username must be unique
            django_username = f"tg_{tg_id}"
            user, created = User.objects.get_or_create(username=django_username)
            if created:
                user.first_name = first_name
                user.last_name = last_name
                user.save()

            profile = ensure_profile_for_user(user)
            profile.telegram_id = tg_id
            profile.telegram_username = username
            profile.avatar_url = f'https://api.dicebear.com/7.x/adventurer/svg?seed={username}'
            profile.last_active_date = timezone.localdate()
            profile.save()

            # start_param carries a referral code when the user opened the Mini App via a
            # t.me/bot?start=CODE deep link (login.html forwards Telegram's
            # initDataUnsafe.start_param here). Only meaningful for a just-created profile.
            start_param = (data.get('start_param') or '').strip()
            if start_param:
                apply_referral(profile, start_param)

        # --- Sync Telegram profile photo on every login ---
        tg_photo = get_telegram_photo_url(tg_id)
        if tg_photo:
            profile.avatar_url = tg_photo
            profile.save(update_fields=['avatar_url'])

        # Log in the user
        login(request, user)
        profile.update_streak()

        redirect_url = reverse('accounts:onboarding') if not profile.has_seen_onboarding else '/'
        return JsonResponse({'success': True, 'redirect': redirect_url})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)

def google_login(request):
    """Website "Sign in with Google" endpoint (NOT the Telegram Mini App).

    The browser's Google Identity Services widget hands us a signed ID token (JWT) which
    we verify server-side, then find-or-create the matching account and log in. CSRF stays
    ON: the fetch() on the login page sends the X-CSRFToken header, so this is a normal
    protected POST (unlike tg_login, which is signed by Telegram instead)."""
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Method not allowed'}, status=405)

    if not settings.GOOGLE_OAUTH_CLIENT_ID:
        return JsonResponse({'success': False, 'error': 'Google kirish sozlanmagan.'}, status=503)

    try:
        data = json.loads(request.body or '{}')
    except (ValueError, TypeError):
        data = {}
    credential = data.get('credential')

    claims = verify_google_id_token(credential)
    if not claims:
        return JsonResponse({'success': False, 'error': "Google orqali kirishni tasdiqlab bo'lmadi."}, status=401)

    google_sub = str(claims.get('sub'))
    email = (claims.get('email') or '').strip().lower()
    first_name = claims.get('given_name', '') or ''
    last_name = claims.get('family_name', '') or ''
    picture = claims.get('picture', '') or ''

    # Match order: existing Google link -> existing account with the same verified email
    # (so a user who first registered classically can later just click Google) -> brand new.
    profile = Profile.objects.filter(google_id=google_sub).select_related('user').first()
    if profile is None and email:
        existing = User.objects.filter(email__iexact=email).order_by('id').first()
        if existing is not None:
            # Classic/Telegram account with this verified email — link it below (the
            # google_id is persisted by the shared save block, not here, so the guard
            # there still fires).
            profile = ensure_profile_for_user(existing)

    if profile is None:
        username = generate_unique_username(email.split('@')[0] if email else 'user')
        user = User.objects.create_user(username=username, email=email)
        user.first_name = first_name
        user.last_name = last_name
        user.save()
        profile = ensure_profile_for_user(user)
        profile.google_id = google_sub
        if picture:
            profile.avatar_url = picture
        elif not profile.avatar_url:
            profile.avatar_url = f'https://api.dicebear.com/7.x/adventurer/svg?seed={username}'
        profile.save()
        ref_code = (data.get('ref') or '').strip()
        if ref_code:
            apply_referral(profile, ref_code)

    user = profile.user
    if not user.is_active:
        return JsonResponse({
            'success': False,
            'error': "Hisobingiz vaqtincha chetlashtirilgan. Iltimos, administrator bilan bog'laning."
        }, status=403)

    # Persist any first-time link / email backfill, and refresh the avatar to Google's.
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

    login(request, user)
    profile.update_streak()

    redirect_url = _post_login_redirect(profile).url
    return JsonResponse({'success': True, 'redirect': redirect_url})


@login_required
def profile_view(request):
    profile = ensure_profile_for_user(request.user)
    # Fetch user history (attempts, battles, badges).
    # select_related — template'da har attempt.test / battle.player uchun alohida
    # so'rov ketmasligi uchun (N+1 oldini oladi).
    recent_attempts = profile.attempts.select_related('test').order_by('-started_at')[:5]
    # We want both battles as p1 and p2
    from battles.models import Battle
    from django.db.models import Q
    recent_battles = (Battle.objects.filter(Q(player1=profile) | Q(player2=profile))
                      .select_related('player1', 'player2', 'winner')
                      .order_by('-created_at')[:5])
    badges = profile.badges.all()

    return render(request, 'accounts/profile.html', {
        'profile': profile,
        'recent_attempts': recent_attempts,
        'recent_battles': recent_battles,
        'badges': badges,
        'referral_link': get_referral_link(profile, request),
        'telegram_deep_link': get_telegram_deep_link(profile),
        'referral_stats': referral_stats(profile),
        'referral_share_text': "IlmMevasi'da bilim sinovidan o'ting va men bilan bonus tanga yutib oling!",
    })

@login_required
def onboarding_view(request):
    """Two-slide splash intro shown once to a user right after their first
    login/registration, explaining what IlmMevasi is and what it offers."""
    profile = ensure_profile_for_user(request.user)

    if request.method == 'POST':
        profile.has_seen_onboarding = True
        profile.save(update_fields=['has_seen_onboarding'])
        return redirect('dashboard:home')

    return render(request, 'accounts/onboarding.html', {'profile': profile})
