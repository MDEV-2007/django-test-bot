"""JSON version of dashboard.views.home for the Next.js frontend — same data, same
side effects (streak update, daily-mission auto-provisioning), just serialized instead
of rendered into dashboard/home.html. See accounts/api.py for the overall JWT-API pattern."""
from django.utils import timezone
from rest_framework.decorators import api_view
from rest_framework.response import Response

from accounts.models import Profile, ensure_profile_for_user
from accounts.serializers import ProfileSerializer
from core.models import DailyMission, ProfileMission
from learning.models import Topic
from shop.services import available_freezes
from tests_app.models import Attempt, RevisionItem
from tests_app.subject_utils import current_subject


@api_view(['GET'])
def home_api(request):
    profile = ensure_profile_for_user(request.user)
    profile.update_streak()

    today = timezone.localdate()
    missions_today = ProfileMission.objects.filter(profile=profile, date=today).select_related('mission')
    if not missions_today.exists():
        all_missions = DailyMission.objects.all()
        if not all_missions.exists():
            DailyMission.objects.create(title="Milliy sertifikat testi", description="Milliy sertifikat bo'limida 1 ta test topshirish", xp_reward=150, coin_reward=15, target_count=1, action_type='test')
            DailyMission.objects.create(title="Arena jangi", description="Battle Arenada 1 ta jangda qatnashish", xp_reward=200, coin_reward=20, target_count=1, action_type='battle')
            DailyMission.objects.create(title="Dars o'qish", description="O'qish bo'limida kamida 2 ta video dars ko'rish", xp_reward=100, coin_reward=10, target_count=2, action_type='lesson')
            all_missions = DailyMission.objects.all()
        for m in all_missions[:3]:
            ProfileMission.objects.get_or_create(profile=profile, mission=m, date=today)
        missions_today = ProfileMission.objects.filter(profile=profile, date=today).select_related('mission')

    freeze_count = available_freezes(profile)
    # Mavjudlik (presence): "yolg'iz emasman" hissi uchun. Raqamdan tashqari bir nechta
    # avatar ham qaytariladi — o'zi bundan mustasno, tasodifiy emas, eng yaqinda ko'ringanlar.
    online_qs = (Profile.objects
                 .filter(last_seen_at__gte=timezone.now() - timezone.timedelta(minutes=5))
                 .select_related('user')
                 .order_by('-last_seen_at'))
    online_count = online_qs.count()
    online_peers = [{
        'name': (pr.user.first_name or pr.user.username),
        'avatar_url': pr.avatar_url,
    } for pr in online_qs.exclude(pk=profile.pk)[:5]]

    # Bugun nechta o'quvchi test yakunlagani — ijtimoiy dalil (raqobat emas, hamrohlik).
    solved_today = (Attempt.objects
                    .filter(is_completed=True, completed_at__date=today)
                    .values('profile_id').distinct().count())

    recent_attempts = (Attempt.objects.filter(profile=profile, is_completed=True)
                        .select_related('test').order_by('-completed_at')[:3])

    weak_item = (RevisionItem.objects.filter(profile=profile, mastered=False)
                 .select_related('question__topic').order_by('-times_wrong', 'updated_at').first())
    weak_review = None
    if weak_item and weak_item.question.topic:
        days_ago = (timezone.now() - weak_item.updated_at).days
        weak_review = {
            'topic_title': weak_item.question.topic.title,
            'times_wrong': weak_item.times_wrong,
            'days_ago': days_ago,
        }

    subject = current_subject(request)
    topic_qs = Topic.objects.all()
    if subject:
        topic_qs = topic_qs.filter(subject=subject)
    suggested_topic = topic_qs.order_by('order').first()

    return Response({
        'profile': ProfileSerializer(profile).data,
        'xp_progress': profile.xp_progress,
        'freeze_count': freeze_count,
        'online_count': online_count,
        'online_peers': online_peers,
        'solved_today': solved_today,
        'weak_review': weak_review,
        'missions': [{
            'title': pm.mission.title,
            'description': pm.mission.description,
            'xp_reward': pm.mission.xp_reward,
            'coin_reward': pm.mission.coin_reward,
            'target_count': pm.mission.target_count,
            'current_count': pm.current_count,
            'is_completed': pm.is_completed,
        } for pm in missions_today],
        'recent_attempts': [{
            'id': a.id,
            'test_title': a.test.title if a.test else "Tasodifiy Test",
            'score': a.score,
            'completed_at': a.completed_at,
            'time_spent_display': a.time_spent_display,
        } for a in recent_attempts],
        'suggested_topic': {'id': suggested_topic.id, 'title': suggested_topic.title,
                             'description': suggested_topic.description} if suggested_topic else None,
        'selected_subject': {'id': subject.id, 'name': subject.name} if subject else None,
    })
