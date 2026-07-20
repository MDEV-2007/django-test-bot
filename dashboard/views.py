from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from accounts.models import Profile, ensure_profile_for_user
from core.models import DailyMission, ProfileMission, Badge, Notification
from tests_app.models import Attempt
from learning.models import Topic
from django.utils import timezone

@login_required
def home(request):
    profile = ensure_profile_for_user(request.user)
    
    # Refresh/update user daily streak on dashboard load
    profile.update_streak()
    
    # Fetch user details
    xp = profile.xp
    level = profile.level
    coins = profile.coins
    streak = profile.streak
    xp_progress = profile.xp_progress
    
    # Daily missions: ensure today's missions are assigned to this profile
    # Get profile missions for today
    today = timezone.localdate()
    # Check if missions are initialized for today, if not build/assign them
    # select_related('mission') — template har mission kartasida pm.mission
    # maydonlarini o'qiydi; busiz har biri alohida so'rov bo'lardi (N+1).
    missions_today = ProfileMission.objects.filter(profile=profile, date=today).select_related('mission')
    if not missions_today.exists():
        # Get up to 3 daily missions
        all_missions = DailyMission.objects.all()
        # If no missions exist, create a few defaults
        if not all_missions.exists():
            DailyMission.objects.create(title="Milliy sertifikat testi", description="Milliy sertifikat bo'limida 1 ta test topshirish", xp_reward=150, coin_reward=15, target_count=1, action_type='test')
            DailyMission.objects.create(title="Arena jangi", description="Battle Arenada 1 ta jangda qatnashish", xp_reward=200, coin_reward=20, target_count=1, action_type='battle')
            DailyMission.objects.create(title="Dars o'qish", description="O'qish bo'limida kamida 2 ta video dars ko'rish", xp_reward=100, coin_reward=10, target_count=2, action_type='lesson')
            all_missions = DailyMission.objects.all()
            
        for m in all_missions[:3]:
            ProfileMission.objects.get_or_create(profile=profile, mission=m, date=today)
        missions_today = ProfileMission.objects.filter(profile=profile, date=today).select_related('mission')
    
    # Streak-freeze count (Feature 6) — shown next to the streak so the student knows
    # how many missed days they're currently protected against.
    from shop.services import available_freezes
    freeze_count = available_freezes(profile)

    # Recent test results (select_related — har attempt.test uchun alohida so'rov bo'lmasin)
    recent_attempts = Attempt.objects.filter(profile=profile, is_completed=True).select_related('test').order_by('-completed_at')[:3]
    
    # Continue course info — suggest a topic from the subject the student is studying.
    from tests_app.subject_utils import current_subject
    subject = current_subject(request)
    topic_qs = Topic.objects.all()
    if subject:
        topic_qs = topic_qs.filter(subject=subject)
    suggested_topic = topic_qs.order_by('order').first()

    return render(request, 'dashboard/home.html', {
        'profile': profile,
        'xp': xp,
        'level': level,
        'coins': coins,
        'streak': streak,
        'xp_progress': xp_progress,
        'missions': missions_today,
        'recent_attempts': recent_attempts,
        'suggested_topic': suggested_topic,
        'selected_subject': subject,
        'freeze_count': freeze_count,
    })

@login_required
def design_system(request):
    return render(request, 'partials/design_system.html')
