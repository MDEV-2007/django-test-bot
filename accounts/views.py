import json
import urllib.parse
from django.conf import settings
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
)

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
            return render(request, 'accounts/login.html', {'error': error_msg})

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

    return render(request, 'accounts/login.html', {'error': error_msg})

def register_view(request):
    if request.user.is_authenticated:
        return redirect('dashboard:home')
        
    error_msg = None
    if request.method == 'POST':
        username = request.POST.get('username')
        first_name = request.POST.get('first_name')
        last_name = request.POST.get('last_name')
        password = request.POST.get('password')
        
        if User.objects.filter(username=username).exists():
            error_msg = "Bu foydalanuvchi nomi band!"
        else:
            # Create user
            user = User.objects.create_user(username=username, password=password, first_name=first_name, last_name=last_name)
            profile = ensure_profile_for_user(user)
            profile.avatar_url = f'https://api.dicebear.com/7.x/adventurer/svg?seed={username}'
            profile.save()
            login(request, user)
            return _post_login_redirect(profile)
            
    return render(request, 'accounts/register.html', {'error': error_msg})

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
        'badges': badges
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
