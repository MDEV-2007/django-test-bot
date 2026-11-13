"""JSON version of dashboard.views.home for the Next.js frontend — same data, same
side effects (streak update, daily-mission auto-provisioning), just serialized instead
of rendered into dashboard/home.html. See accounts/api.py for the overall JWT-API pattern."""
from django.db.models import Count, Q
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from accounts.models import Profile, ensure_profile_for_user
from accounts.serializers import ProfileSerializer
from core.models import DailyMission, ProfileMission
from core.rewards import get_daily_chest_status, open_daily_chest
from learning.models import Topic
from shop.services import available_freezes
from tests_app.models import Attempt, AttemptAnswer, MockRegistration, RevisionItem, Subject, TestSet
from tests_app.subject_utils import current_subject


def _select_personalized_topic(profile, subject):
    """Talabaning tanlagan fani, zaif mavzulari va o'tilmagan mavzulariga qarab shaxsiy tavsiya."""
    topic_qs = Topic.objects.select_related('subject').all()
    effective_subject = subject or getattr(profile, 'target_subject', None)
    if effective_subject:
        subj_topics = topic_qs.filter(subject=effective_subject)
        if subj_topics.exists():
            topic_qs = subj_topics

    # 1. Zaif mavzu: RevisionItem (o'zlashtirilmagan xatolar) ichidan shu fandagi eng ko'p xato qilingan mavzu
    rev_qs = (
        RevisionItem.objects
        .filter(profile=profile, mastered=False, question__topic__isnull=False)
        .select_related('question__topic', 'question__topic__subject')
    )
    if effective_subject:
        subj_rev = rev_qs.filter(question__topic__subject=effective_subject)
        if subj_rev.exists():
            rev_qs = subj_rev
    top_rev = rev_qs.order_by('-times_wrong', 'updated_at').first()
    if top_rev and top_rev.question and top_rev.question.topic:
        t = top_rev.question.topic
        return {
            'id': t.id,
            'title': t.title,
            'description': t.description,
            'subject_name': t.subject.name if t.subject else None,
            'reason': f"Oxirgi urinishlarda {top_rev.times_wrong} marta xato qilingan — mustahkamlash tavsiya etiladi",
            'priority': 'weakness',
        }

    # 2. AttemptAnswer ichidan xato javoblar eng ko'p bo'lgan mavzu
    wrong_topic_row = (
        AttemptAnswer.objects
        .filter(
            attempt__profile=profile,
            attempt__is_completed=True,
            is_correct=False,
            question__topic__in=topic_qs,
        )
        .values('question__topic_id')
        .annotate(wrong_cnt=Count('id'))
        .order_by('-wrong_cnt')
        .first()
    )
    if wrong_topic_row:
        t = topic_qs.filter(id=wrong_topic_row['question__topic_id']).first()
        if t:
            return {
                'id': t.id,
                'title': t.title,
                'description': t.description,
                'subject_name': t.subject.name if t.subject else None,
                'reason': f"Testlarda {wrong_topic_row['wrong_cnt']} ta xato uchragan mavzu — qayta ko'rib chiqing",
                'priority': 'weakness',
            }

    # 3. Hali ishlanmagan keyingi yangi mavzu
    practiced_topic_ids = set(
        AttemptAnswer.objects
        .filter(attempt__profile=profile, question__topic__isnull=False)
        .values_list('question__topic_id', flat=True)
        .distinct()
    )
    if practiced_topic_ids:
        next_unlearned = topic_qs.exclude(id__in=practiced_topic_ids).order_by('order', 'id').first()
        if next_unlearned:
            return {
                'id': next_unlearned.id,
                'title': next_unlearned.title,
                'description': next_unlearned.description,
                'subject_name': next_unlearned.subject.name if next_unlearned.subject else None,
                'reason': "Keyingi yangi mavzu — o'rganishni davom ettiring",
                'priority': 'next_unlearned',
            }

    # 4. Boshlang'ich mavzu (yangi o'quvchi uchun tanlangan fandagi 1-mavzu)
    starter = topic_qs.order_by('order', 'id').first()
    if starter:
        subj_label = starter.subject.name if starter.subject else "fan"
        return {
            'id': starter.id,
            'title': starter.title,
            'description': starter.description,
            'subject_name': starter.subject.name if starter.subject else None,
            'reason': f"{subj_label} bo'yicha tavsiya etilgan boshlang'ich mavzu",
            'priority': 'starter',
        }
    return None


def _build_upcoming_mocks(profile, user, subject=None):
    """Dashboard uchun Respublika Mock imtihonlari ro'yxati va o'quvchining ro'yxatdan o'tish holati."""
    from premium.models import Payment, SubscriptionPlan, unlocked_test_ids

    now = timezone.now()
    base_qs = (
        TestSet.objects
        .filter(is_published=True, is_archived=False, is_live_mock=True)
        .select_related('subject')
        .annotate(
            q_cnt=Count('questions', distinct=True),
            remind_cnt=Count('remind_users', distinct=True),
        )
    )
    active_upcoming = list(
        base_qs.filter(
            Q(scheduled_at__gte=now - timezone.timedelta(hours=6)) | Q(scheduled_at__isnull=True)
        ).order_by('scheduled_at', '-id')[:4]
    )
    if not active_upcoming:
        active_upcoming = list(base_qs.order_by('-scheduled_at', '-id')[:2])

    if not active_upcoming:
        return []

    mock_ids = [m.id for m in active_upcoming]
    unlocked_ids = unlocked_test_ids(profile)
    mock_plan = SubscriptionPlan.objects.filter(plan_type='mock_test', is_active=True).order_by('order').first()
    regs_by_test = {
        r.test_id: r
        for r in MockRegistration.objects.select_related('payment').filter(profile=profile, test_id__in=mock_ids)
    }
    reminded_ids = set(
        TestSet.remind_users.through.objects
        .filter(user_id=user.id, testset_id__in=mock_ids)
        .values_list('testset_id', flat=True)
    ) if user and user.is_authenticated else set()
    completed_by_test = {
        a.test_id: a
        for a in Attempt.objects.filter(profile=profile, test_id__in=mock_ids, is_completed=True).order_by('-completed_at')
    }

    result = []
    tz = timezone.get_current_timezone()
    for m in active_upcoming:
        effective_price = float(m.price) if m.price is not None else (float(mock_plan.price) if (m.is_premium and mock_plan) else 0.0)
        is_free = (not m.is_premium) or effective_price <= 0
        is_unlocked = is_free or profile.is_vip_active or profile.premium_mock_test_unlocked or (m.id in unlocked_ids)

        reg = regs_by_test.get(m.id)
        if reg and reg.status == 'PENDING_PAYMENT' and is_unlocked:
            reg.status = 'CONFIRMED'
            reg.confirmed_at = reg.confirmed_at or now
            reg.save(update_fields=['status', 'confirmed_at', 'updated_at'])

        comp = completed_by_test.get(m.id)
        is_started = bool(not m.scheduled_at or now >= m.scheduled_at)
        end_dt = (m.scheduled_at + timezone.timedelta(minutes=(m.duration_minutes or 60) + 120)) if m.scheduled_at else None
        is_ended = bool(end_dt and now >= end_dt)

        if comp:
            lifecycle_state = 'RESULTS_PUBLISHED' if is_ended else 'COMPLETED'
        elif reg and reg.status == 'DISQUALIFIED':
            lifecycle_state = 'DISQUALIFIED'
        elif is_started and not is_ended:
            lifecycle_state = 'LIVE_NOW'
        elif reg and reg.status == 'CONFIRMED':
            lifecycle_state = 'REGISTERED_CONFIRMED'
        elif reg and reg.status == 'PENDING_PAYMENT':
            lifecycle_state = 'REGISTERED_PENDING_PAYMENT'
        else:
            lifecycle_state = 'OPEN_REGISTRATION'

        confirmed_cnt = MockRegistration.objects.filter(test_id=m.id, status='CONFIRMED').count()
        participants_cnt = max(getattr(m, 'remind_cnt', 0) or 0, confirmed_cnt)

        sched_iso = None
        if m.scheduled_at:
            local_dt = m.scheduled_at.astimezone(tz) if timezone.is_aware(m.scheduled_at) else m.scheduled_at
            sched_iso = local_dt.strftime('%Y-%m-%dT%H:%M:%S+05:00')

        result.append({
            'id': m.id,
            'title': m.title,
            'subject_name': m.subject.name if m.subject else 'Asosiy fan',
            'scheduled_at': sched_iso,
            'duration_minutes': m.duration_minutes or 60,
            'question_count': getattr(m, 'q_cnt', 0) or m.questions.count(),
            'participants_count': participants_cnt,
            'is_reminded': (m.id in reminded_ids) or bool(reg),
            'is_premium': bool(m.is_premium and not is_free),
            'price': effective_price,
            'prize_description': getattr(m, 'prize_description', '') or '',
            'is_unlocked': is_unlocked,
            'registration_id': reg.registration_id if reg else None,
            'registration_status': reg.status if reg else 'NONE',
            'payment_status': reg.payment.status if (reg and reg.payment_id) else ('approved' if is_unlocked else None),
            'lifecycle_state': lifecycle_state,
            'has_completed': comp is not None,
            'completed_attempt_id': comp.id if comp else None,
            'checkout_url': f"/premium/checkout/{mock_plan.id}?test={m.id}" if (mock_plan and not is_unlocked) else None,
        })

    return result


@api_view(['GET'])
def home_api(request):
    profile = ensure_profile_for_user(request.user)
    # Streak faqat haqiqiy o'qish amalidan oshadi (test, sikl, dars sessiyasi) — dashboardni
    # ochishning o'zi uni oshirmaydi (audit ECON-002).

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
    online_qs = (Profile.objects
                 .filter(last_seen_at__gte=timezone.now() - timezone.timedelta(minutes=5))
                 .select_related('user')
                 .order_by('-last_seen_at'))
    online_count = max(online_qs.count(), 1)
    online_peers = [{
        'name': (pr.user.first_name or pr.user.username),
        'username': pr.user.username,
        'avatar_url': pr.avatar_url,
        'is_me': pr.pk == profile.pk,
    } for pr in online_qs[:10]]

    if not any(p.get('is_me') for p in online_peers):
        online_peers.insert(0, {
            'name': (profile.user.first_name or profile.user.username),
            'username': profile.user.username,
            'avatar_url': profile.avatar_url,
            'is_me': True,
        })

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

    subject = current_subject(request) or getattr(profile, 'target_subject', None)
    suggested_topic_payload = _select_personalized_topic(profile, subject)

    from analytics.services import compute_mastery
    try:
        mastery_res = compute_mastery(profile)
        subject_mastery = mastery_res.get('subjects', [])
    except Exception:
        subject_mastery = []

    if not subject_mastery:
        all_subs = Subject.objects.all().order_by('order', 'name')[:5]
        subject_mastery = [{
            'id': s.id,
            'name': s.name,
            'color': s.color or '#2d6cff',
            'mastery': 0,
            'answered': 0,
        } for s in all_subs]

    upcoming_mocks = _build_upcoming_mocks(profile, request.user, subject=subject)

    return Response({
        'profile': ProfileSerializer(profile).data,
        'xp_progress': profile.xp_progress,
        'freeze_count': freeze_count,
        'online_count': online_count,
        'online_peers': online_peers,
        'solved_today': solved_today,
        'weak_review': weak_review,
        'subject_mastery': subject_mastery,
        'upcoming_mocks': upcoming_mocks,
        'missions': [{
            'title': pm.mission.title,
            'description': pm.mission.description,
            'xp_reward': pm.mission.xp_reward,
            'coin_reward': pm.mission.coin_reward,
            'target_count': pm.mission.target_count,
            'current_count': pm.current_count,
            'is_completed': pm.is_completed,
            'action_type': pm.mission.action_type,
        } for pm in missions_today],
        'recent_attempts': [{
            'id': a.id,
            'test_title': a.test.title if a.test else "Tasodifiy Test",
            'score': a.score,
            'completed_at': a.completed_at,
            'time_spent_display': a.time_spent_display,
        } for a in recent_attempts],
        'suggested_topic': suggested_topic_payload,
        'selected_subject': {'id': subject.id, 'name': subject.name} if subject else None,
        'unread_notifications_count': profile.notifications.filter(is_read=False).count(),
        'daily_chest': get_daily_chest_status(profile),
    })


@api_view(['GET', 'POST'])
def notifications_api(request):
    profile = ensure_profile_for_user(request.user)
    if request.method == 'POST':
        action = request.data.get('action', 'mark_all_read')
        if action == 'mark_all_read':
            profile.notifications.filter(is_read=False).update(is_read=True)
        elif 'id' in request.data:
            profile.notifications.filter(id=request.data['id']).update(is_read=True)
        return Response({'success': True, 'unread_count': profile.notifications.filter(is_read=False).count()})

    notifs = profile.notifications.all()[:40]
    return Response({
        'notifications': [{
            'id': n.id,
            'title': n.title,
            'message': n.message,
            'type': n.type,
            'is_read': n.is_read,
            'created_at': n.created_at.strftime('%d.%m.%Y %H:%M') if n.created_at else '',
        } for n in notifs],
        'unread_count': profile.notifications.filter(is_read=False).count(),
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def landing_reviews_api(request):
    """Landing sahifasi uchun super admin tanlagan (is_featured=True) sharhlar."""
    from tests_app.models import ExamSurvey

    featured_qs = (
        ExamSurvey.objects.filter(is_featured=True)
        .select_related('user', 'test', 'test__subject')
        .order_by('-created_at')[:8]
    )
    reviews = []

    for s in featured_qs:
        author = s.author_name.strip()
        if not author and s.user:
            author = f"{s.user.first_name} {s.user.last_name}".strip() or s.user.username
        if not author:
            author = "O'quvchi"

        role = s.custom_role.strip()
        if not role:
            subj = s.test.subject.name if (s.test and getattr(s.test, 'subject', None)) else ""
            role = f"{subj} yo'nalishi abituriyenti" if subj else "IlmIldizi o'quvchisi"

        tag = s.featured_badge.strip()
        if not tag:
            if s.platform_rating >= 5:
                tag = "5.0 A'lo baho"
            else:
                tag = f"{s.platform_rating}.0 Baho"

        first_char = author[0].upper() if author else "U"
        reviews.append({
            'id': s.id,
            'author': author,
            'role': role,
            'tag': tag,
            'quote': s.comment,
            'rating': s.platform_rating,
            'avatar_letter': first_char,
        })

    return Response({
        'reviews': reviews[:6],
        'total_featured': len(reviews),
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def landing_leaderboard_api(request):
    """Landing sahifasi uchun haftalik real peshqadamlar reytingi (faqat haqiqiy DB ko'rsatkichlari)."""
    from django.core.cache import cache
    from django.db.models import Avg, Count, Sum

    CACHE_KEY = 'landing:weekly_leaderboard:v3'
    cached = cache.get(CACHE_KEY)
    if cached is not None:
        return Response(cached)

    students_qs = (
        Profile.objects.filter(
            role='student',
            user__is_superuser=False,
            user__is_staff=False,
            xp__gt=0,
        )
        .select_related('user', 'target_subject')
        .order_by('-xp', 'id')
    )

    one_week_ago = timezone.now() - timezone.timedelta(days=7)
    recent_attempts_qs = Attempt.objects.filter(is_completed=True, completed_at__gte=one_week_ago)
    if not recent_attempts_qs.exists():
        recent_attempts_qs = Attempt.objects.filter(is_completed=True)

    stats_by_profile = {
        item['profile_id']: item
        for item in recent_attempts_qs.values('profile_id').annotate(
            total_correct=Sum('correct_answers'),
            total_wrong=Sum('wrong_answers'),
            total_skipped=Sum('skipped_answers'),
            avg_score=Avg('score'),
            count_tests=Count('id'),
        )
    }

    subject_by_profile = {}
    for item in (
        recent_attempts_qs
        .filter(test__subject__isnull=False)
        .values('profile_id', 'test__subject__name')
        .order_by('-completed_at')
    ):
        pid = item['profile_id']
        if pid not in subject_by_profile:
            subject_by_profile[pid] = item['test__subject__name']

    rows = []
    medals = ['gold', 'silver', 'bronze', 'number', 'number']

    for p in students_qs[:10]:
        st = stats_by_profile.get(p.id)
        u = p.user
        full_name = f"{u.first_name} {u.last_name}".strip() or u.username

        if st and ((st.get('total_correct') or 0) > 0 or (st.get('count_tests') or 0) > 0):
            c = st['total_correct'] or 0
            w = st['total_wrong'] or 0
            s = st['total_skipped'] or 0
            tot = c + w + s
            score_text = f"{c} / {tot}" if tot > 0 else "—"
            avg = float(st.get('avg_score') or 0.0)
        else:
            score_text = "—"
            avg = 0.0

        grade_badge = 'A+' if avg >= 86 else ('A' if avg >= 70 else ('B+' if avg >= 60 else ''))
        region = (getattr(p, 'region', '') or '').strip()
        subj = subject_by_profile.get(p.id) or (p.target_subject.name if getattr(p, 'target_subject', None) else '')
        meta_parts = [part for part in (region, subj) if part]
        region_and_subject = " • ".join(meta_parts) if meta_parts else "IlmIldizi o'quvchisi"

        formatted_xp = f"{int(p.xp or 0):,} XP".replace(',', ' ')

        rows.append({
            'rank': len(rows) + 1,
            'name': full_name,
            'grade_badge': grade_badge,
            'region_and_subject': region_and_subject,
            'score': score_text,
            'xp': formatted_xp,
            'badge_type': medals[min(len(rows), 4)],
        })
        if len(rows) >= 5:
            break

    data = {
        'leaderboard': rows,
        'refreshed_at': timezone.now().isoformat(),
        'cache_ttl_seconds': 900,
    }
    cache.set(CACHE_KEY, data, 900)
    return Response(data)


@api_view(['GET'])
def daily_chest_api(request):
    """Bugungi sirli sandiq holati, qolgan vaqt va streak multiplikatori."""
    profile = ensure_profile_for_user(request.user)
    data = get_daily_chest_status(profile)
    return Response(data)


@api_view(['POST'])
def daily_chest_open_api(request):
    """Kunlik sirli sandiqni ochish va o'zgaruvchan mukofot (Variable Reward) olish."""
    profile = ensure_profile_for_user(request.user)
    result = open_daily_chest(profile.pk)
    status_code = 200 if result.get('success') else 400
    return Response(result, status=status_code)
