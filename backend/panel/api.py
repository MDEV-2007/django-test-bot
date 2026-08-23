"""JSON API mirroring panel/views.py (Super Admin panel) for the Next.js frontend — see
accounts/api.py for the overall JWT-API pattern and panel/api_utils.py for the generic
list/search/filter/sort/paginate helper that replaces panel/generic.py's PanelListView.

Audit-log attribution (panel/signals.py) is handled globally by
accounts.jwt_auth.AuditAwareJWTAuthentication — see its docstring — so no per-view call is
needed here.
"""
import csv
import secrets
from datetime import timedelta

from django.contrib.auth.models import User
from django.core.cache import cache
from django.db.models import Count, Q
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.decorators import api_view, parser_classes, permission_classes
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import Profile
from accounts.permissions import IsSuperAdmin, is_last_active_superadmin
from accounts.utils import send_telegram_message, send_telegram_photo
from core.models import Notification
from games.models import Game
from learning.models import Lesson
from premium.models import Payment
from shop.models import ShopItem
from tests_app.models import Attempt, Question, Subject, TestSet

from .api_utils import bulk_action, list_response
from .forms import (
    BroadcastForm, GameForm, LessonForm, ShopItemForm, SiteSettingsForm, SubjectForm,
    TeacherCreateForm, TestSetForm, UserForm,
)
from .models import AuditLog, Broadcast, SiteSettings

DASHBOARD_CACHE_KEY = 'panel:dashboard:stats'


def _form_errors(form):
    return {field: errs[0] for field, errs in form.errors.items()}


# ============================================================ DASHBOARD
@api_view(['GET'])
@permission_classes([IsSuperAdmin])
def dashboard_api(request):
    ctx = cache.get(DASHBOARD_CACHE_KEY)
    if ctx is None:
        from django.db.models import Sum

        from tests_app.models import AttemptAnswer, Question

        today = timezone.localdate()
        days = [today - timedelta(days=i) for i in range(6, -1, -1)]
        reg_series, attempt_series, labels = [], [], []
        for d in days:
            labels.append(d.strftime('%d.%m'))
            reg_series.append(User.objects.filter(date_joined__date=d).count())
            attempt_series.append(Attempt.objects.filter(started_at__date=d).count())

        total_revenue = Payment.objects.filter(status='approved').aggregate(s=Sum('amount'))['s'] or 0
        active_today = Attempt.objects.filter(started_at__date=today).values('profile').distinct().count()
        premium_users = Profile.objects.filter(Q(is_premium=True) | Q(premium_mock_test_unlocked=True)).count()

        hard_q = (AttemptAnswer.objects
                  .filter(attempt__is_completed=True)
                  .values('question')
                  .annotate(total=Count('id'), correct=Count('id', filter=Q(is_correct=True)))
                  .filter(total__gte=5)
                  .order_by('correct'))[:8]
        qids = [row['question'] for row in hard_q]
        qmap = {q.id: q for q in Question.objects.filter(id__in=qids)}
        hardest_questions = []
        for row in hard_q:
            q = qmap.get(row['question'])
            if not q:
                continue
            rate = round(100 * row['correct'] / row['total']) if row['total'] else 0
            text = q.body[:90].replace('<p>', '').replace('</p>', '')
            hardest_questions.append({'id': q.id, 'text': text, 'rate': rate, 'total': row['total']})

        ctx = {
            'stats': {
                'users': User.objects.count(),
                'teachers': Profile.objects.filter(role='teacher').count(),
                'students': Profile.objects.filter(role='student').count(),
                'testsets': TestSet.objects.filter(is_random=False).count(),
                'lessons': Lesson.objects.count(),
                'games': Game.objects.count(),
                'attempts_today': Attempt.objects.filter(started_at__date=today).count(),
                'attempts_total': Attempt.objects.filter(is_completed=True).count(),
                'pending_payments': Payment.objects.filter(status='pending').count(),
                'total_revenue': str(total_revenue),
                'active_today': active_today,
                'premium_users': premium_users,
            },
            'chart_labels': labels, 'chart_reg': reg_series, 'chart_attempts': attempt_series,
            'hardest_questions': hardest_questions,
            'recent_logs': [{
                'id': log.id, 'summary': log.summary_uz, 'action': log.action, 'timestamp': log.timestamp,
            } for log in AuditLog.objects.select_related('user')[:12]],
        }
        cache.set(DASHBOARD_CACHE_KEY, ctx, 180)
    return Response(ctx)


# ============================================================ USERS
def _role_tone(role):
    return {'superadmin': 'rose', 'teacher': 'blue', 'student': 'slate'}.get(role, 'slate')


def _user_row(u):
    profile = getattr(u, 'profile', None)
    return {
        'id': u.id, 'username': u.username, 'full_name': u.get_full_name() or u.username,
        'telegram_username': profile.telegram_username if profile else '',
        'role': profile.role if profile else None,
        'role_display': profile.get_role_display() if profile else '',
        'role_tone': _role_tone(profile.role) if profile else 'slate',
        'is_active': u.is_active, 'date_joined': u.date_joined,
    }


@api_view(['GET', 'POST'])
@permission_classes([IsSuperAdmin])
def users_api(request):
    qs = User.objects.select_related('profile').all()
    if request.method == 'GET':
        return list_response(
            request, queryset=qs,
            search_fields=['username', 'first_name', 'last_name', 'email',
                            'profile__telegram_username', 'profile__telegram_id'],
            filters=[
                {'param': 'role', 'lookup': 'profile__role'},
                {'param': 'active', 'lookup': 'is_active'},
                {'param': 'tg', 'lookup': 'profile__telegram_id__isnull'},
            ],
            sortable_fields=['username', 'date_joined'], default_order='-date_joined',
            row_fn=_user_row,
        )

    def perform(action, queryset):
        if action == 'block':
            return queryset.exclude(is_superuser=True).update(is_active=False)
        if action == 'unblock':
            return queryset.update(is_active=True)
        return 0
    return bulk_action(request, base_queryset=qs, allowed_actions={'block', 'unblock'}, perform_fn=perform)


@api_view(['GET'])
@permission_classes([IsSuperAdmin])
def user_detail_api(request, pk):
    u = get_object_or_404(User.objects.select_related('profile'), pk=pk)
    attempts = (Attempt.objects.filter(profile=u.profile, is_completed=True)
                .select_related('test').order_by('-started_at')[:20])
    payments = Payment.objects.filter(profile=u.profile).select_related('plan').order_by('-created_at')[:10]
    return Response({
        'user': _user_row(u),
        'email': u.email, 'first_name': u.first_name, 'last_name': u.last_name,
        'profile': {
            'xp': u.profile.xp, 'coins': u.profile.coins, 'level': u.profile.level,
            'elo_rating': u.profile.elo_rating, 'is_premium': u.profile.is_premium,
            'premium_mock_test_unlocked': u.profile.premium_mock_test_unlocked,
        },
        'test_count': TestSet.objects.filter(created_by=u).count(),
        'lesson_count': Lesson.objects.filter(created_by=u).count(),
        'attempts': [{'id': a.id, 'test_title': a.test.title if a.test else '—', 'score': a.score,
                      'started_at': a.started_at} for a in attempts],
        'payments': [{'id': p.id, 'plan_name': p.plan.name, 'amount': str(p.amount), 'status': p.status,
                      'created_at': p.created_at} for p in payments],
        'role_options': [{'value': v, 'label': l} for v, l in Profile.ROLE_CHOICES],
    })


@api_view(['PUT', 'DELETE'])
@permission_classes([IsSuperAdmin])
def user_edit_api(request, pk):
    u = get_object_or_404(User, pk=pk)
    if request.method == 'DELETE':
        if u.is_superuser:
            return Response({'error': "Super foydalanuvchini (superuser) o'chirib bo'lmaydi."}, status=400)
        if u == request.user:
            return Response({'error': "O'zingizni o'chira olmaysiz."}, status=400)
        if is_last_active_superadmin(u):
            return Response({'error': "Oxirgi faol super adminni o'chirib bo'lmaydi."}, status=400)
        u.delete()
        return Response({'deleted': True})

    form = UserForm(request.data, instance=u)
    if not form.is_valid():
        return Response({'errors': _form_errors(form)}, status=400)
    form.save()
    return Response({'ok': True})


@api_view(['POST'])
@permission_classes([IsSuperAdmin])
def user_toggle_block_api(request, pk):
    u = get_object_or_404(User, pk=pk)
    if u.is_superuser:
        return Response({'error': "Super foydalanuvchini bloklab bo'lmaydi."}, status=400)
    if u == request.user:
        return Response({'error': "O'zingizni bloklay olmaysiz."}, status=400)
    if u.is_active and is_last_active_superadmin(u):
        return Response({'error': "Oxirgi faol super adminni bloklab bo'lmaydi."}, status=400)
    u.is_active = not u.is_active
    u.save(update_fields=['is_active'])
    return Response({'is_active': u.is_active})


@api_view(['POST'])
@permission_classes([IsSuperAdmin])
def user_reset_password_api(request, pk):
    u = get_object_or_404(User, pk=pk)
    new_password = secrets.token_urlsafe(8)
    u.set_password(new_password)
    u.save()
    return Response({'new_password': new_password})


@api_view(['POST'])
@permission_classes([IsSuperAdmin])
def user_adjust_api(request, pk):
    u = get_object_or_404(User.objects.select_related('profile'), pk=pk)
    profile = u.profile

    def _clean_int(name, current, lo=0, hi=10_000_000):
        raw = request.data.get(name, '')
        if raw == '' or raw is None:
            return current
        try:
            return max(lo, min(hi, int(raw)))
        except (TypeError, ValueError):
            return current

    profile.xp = _clean_int('xp', profile.xp)
    profile.coins = _clean_int('coins', profile.coins)
    profile.elo_rating = _clean_int('elo_rating', profile.elo_rating, lo=100, hi=5000)
    profile.level = max(1, profile.xp // 1000 + 1)
    profile.save()
    return Response({'xp': profile.xp, 'coins': profile.coins, 'elo_rating': profile.elo_rating, 'level': profile.level})


@api_view(['POST'])
@permission_classes([IsSuperAdmin])
def user_set_premium_api(request, pk):
    u = get_object_or_404(User.objects.select_related('profile'), pk=pk)
    profile = u.profile
    grant = str(request.data.get('grant')) == '1' or request.data.get('grant') is True
    profile.is_premium = grant
    profile.premium_mock_test_unlocked = grant
    if grant:
        profile.premium_expires_at = timezone.now() + timedelta(days=30)
    profile.save()
    Notification.objects.create(
        profile=profile, type='system', title="Premium holati o'zgardi",
        message=("Sizga premium kirish berildi!" if grant else "Premium kirishingiz to'xtatildi."),
    )
    return Response({'is_premium': profile.is_premium})


@api_view(['POST'])
@permission_classes([IsSuperAdmin])
def user_impersonate_api(request, pk):
    target = get_object_or_404(User.objects.select_related('profile'), pk=pk)
    if target.is_superuser or (hasattr(target, 'profile') and target.profile.is_superadmin):
        return Response({'error': "Boshqa adminni impersonatsiya qilib bo'lmaydi."}, status=400)
    if not target.is_active:
        return Response({'error': "Bloklangan foydalanuvchi sifatida kirib bo'lmaydi."}, status=400)

    refresh = RefreshToken.for_user(target)
    refresh['impersonator_id'] = request.user.id
    access = refresh.access_token
    access['impersonator_id'] = request.user.id
    return Response({'access': str(access), 'refresh': str(refresh), 'username': target.username})


@api_view(['POST'])
@permission_classes([])
def stop_impersonation_api(request):
    """Available to the impersonated (JWT-authenticated) session only — the
    `impersonator_id` claim on the current access token is the trust boundary, not a
    role check, matching stop_impersonation()'s session-based original."""
    original_id = getattr(request, 'auth', None) and request.auth.get('impersonator_id')
    if not original_id:
        return Response({'error': 'Impersonatsiya holati topilmadi.'}, status=400)
    admin_user = User.objects.filter(pk=original_id).first()
    if not admin_user:
        return Response({'error': 'Asl admin topilmadi.'}, status=404)
    refresh = RefreshToken.for_user(admin_user)
    return Response({'access': str(refresh.access_token), 'refresh': str(refresh), 'username': admin_user.username})


# ============================================================ TEACHERS
@api_view(['GET'])
@permission_classes([IsSuperAdmin])
def teachers_api(request):
    qs = (User.objects.select_related('profile').filter(profile__role='teacher')
          .annotate(testsets_count=Count('test_sets', distinct=True),
                    lessons_count=Count('lessons', distinct=True),
                    games_count=Count('games', distinct=True)))
    return list_response(
        request, queryset=qs, search_fields=['username', 'first_name', 'last_name', 'email'],
        sortable_fields=['username'], default_order='-date_joined',
        row_fn=lambda u: {**_user_row(u), 'testsets_count': u.testsets_count,
                           'lessons_count': u.lessons_count, 'games_count': u.games_count},
    )


@api_view(['POST'])
@permission_classes([IsSuperAdmin])
def teacher_create_api(request):
    form = TeacherCreateForm(request.data)
    if not form.is_valid():
        return Response({'errors': _form_errors(form)}, status=400)
    teacher = form.save()
    return Response({'id': teacher.id})


# ============================================================ SUBJECTS
def _subject_row(s):
    return {'id': s.id, 'name': s.name, 'slug': s.slug, 'testsets_count': s.testsets_count}


@api_view(['GET', 'POST'])
@permission_classes([IsSuperAdmin])
def subjects_api(request):
    qs = Subject.objects.annotate(testsets_count=Count('test_sets', distinct=True))
    if request.method == 'GET':
        return list_response(request, queryset=qs, search_fields=['name'],
                              sortable_fields=['name'], default_order='name', row_fn=_subject_row)
    form = SubjectForm(request.data)
    if not form.is_valid():
        return Response({'errors': _form_errors(form)}, status=400)
    obj = form.save()
    return Response({'id': obj.id})


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsSuperAdmin])
def subject_detail_api(request, pk):
    obj = get_object_or_404(Subject, pk=pk)
    if request.method == 'GET':
        return Response({'id': obj.id, 'name': obj.name, 'slug': obj.slug,
                          'icon_name': obj.icon_name, 'color': obj.color, 'order': obj.order})
    if request.method == 'DELETE':
        obj.delete()
        return Response({'deleted': True})
    form = SubjectForm(request.data, instance=obj)
    if not form.is_valid():
        return Response({'errors': _form_errors(form)}, status=400)
    form.save()
    return Response({'ok': True})


# ============================================================ SHOP ITEMS
def _shop_item_row(i):
    return {
        'id': i.id, 'slug': i.slug, 'name': i.name,
        'category_display': i.get_category_display(),
        'price_coins': i.price_coins,
        'rarity_display': i.get_rarity_display(),
        'rarity_tone': {'legendary': 'amber', 'epic': 'rose', 'rare': 'blue'}.get(i.rarity, 'gray'),
        'is_consumable': i.is_consumable, 'owned_by_count': i.owned_by_count, 'is_active': i.is_active,
    }


@api_view(['GET', 'POST'])
@permission_classes([IsSuperAdmin])
def shop_items_api(request):
    qs = ShopItem.objects.annotate(owned_by_count=Count('owned_by', distinct=True))
    if request.method == 'GET':
        return list_response(
            request, queryset=qs, search_fields=['name', 'slug'],
            filters=[{'param': 'category', 'lookup': 'category'}, {'param': 'active', 'lookup': 'is_active'}],
            sortable_fields=['name', 'price_coins'], default_order='order', row_fn=_shop_item_row,
        )
    action = request.data.get('action')
    if action:
        return bulk_action(request, base_queryset=qs, allowed_actions={'delete'},
                            perform_fn=lambda a, q: (q.count(), q.delete())[0])
    form = ShopItemForm(request.data)
    if not form.is_valid():
        return Response({'errors': _form_errors(form)}, status=400)
    obj = form.save()
    return Response({'id': obj.id})


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsSuperAdmin])
def shop_item_detail_api(request, pk):
    obj = get_object_or_404(ShopItem, pk=pk)
    if request.method == 'GET':
        return Response({
            'id': obj.id, 'category': obj.category, 'slug': obj.slug, 'name': obj.name,
            'description': obj.description, 'icon_name': obj.icon_name, 'price_coins': obj.price_coins,
            'rarity': obj.rarity, 'payload': obj.payload, 'is_consumable': obj.is_consumable,
            'required_level': obj.required_level, 'is_active': obj.is_active, 'order': obj.order,
        })
    if request.method == 'DELETE':
        obj.delete()
        return Response({'deleted': True})
    form = ShopItemForm(request.data, instance=obj)
    if not form.is_valid():
        return Response({'errors': _form_errors(form)}, status=400)
    form.save()
    return Response({'ok': True})


# ============================================================ TEST SETS
def _testset_status(ts):
    if ts.is_archived:
        return {'display': 'Arxivlangan', 'tone': 'gray'}
    return {'display': 'Nashr etilgan', 'tone': 'green'} if ts.is_published else {'display': 'Qoralama', 'tone': 'amber'}


def _testset_row(t):
    return {
        'id': t.id, 'title': t.title, 'subject': t.subject.name if t.subject else '—',
        'questions_count': t.questions_count,
        'author': (t.created_by.get_full_name() or t.created_by.username) if t.created_by else '—',
        'status': _testset_status(t), 'attempts_count': t.attempts_count,
    }


@api_view(['GET'])
@permission_classes([IsSuperAdmin])
def testsets_api(request):
    qs = (TestSet.objects.select_related('subject', 'created_by').filter(is_random=False)
          .annotate(questions_count=Count('questions', distinct=True), attempts_count=Count('attempts', distinct=True)))
    return list_response(
        request, queryset=qs, search_fields=['title', 'description'],
        filters=[{'param': 'subject', 'lookup': 'subject_id'}, {'param': 'status', 'lookup': 'is_published'}],
        sortable_fields=['title'], default_order='-created_at', row_fn=_testset_row,
        extra={'subject_options': [{'value': str(s.id), 'label': s.name} for s in Subject.objects.all()]},
    )


@api_view(['POST'])
@permission_classes([IsSuperAdmin])
def testsets_bulk_api(request):
    qs = TestSet.objects.filter(is_random=False)

    def perform(action, queryset):
        if action == 'publish':
            return queryset.update(is_published=True, is_archived=False)
        if action == 'unpublish':
            return queryset.update(is_published=False)
        if action == 'archive':
            return queryset.update(is_archived=True)
        return 0
    return bulk_action(request, base_queryset=qs, allowed_actions={'publish', 'unpublish', 'archive'}, perform_fn=perform)


@api_view(['GET'])
@permission_classes([IsSuperAdmin])
def testset_detail_api(request, pk):
    ts = get_object_or_404(TestSet.objects.select_related('subject', 'created_by'), pk=pk)
    questions = ts.questions.all()[:100]
    return Response({
        'id': ts.id, 'title': ts.title, 'description': ts.description,
        'subject': ts.subject.name if ts.subject else None,
        'author': (ts.created_by.get_full_name() or ts.created_by.username) if ts.created_by else '—',
        'status': _testset_status(ts), 'attempt_count': ts.attempts.count(),
        'questions': [{'id': q.id, 'body': q.body, 'question_type': q.question_type} for q in questions],
    })


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsSuperAdmin])
def testset_edit_api(request, pk):
    ts = get_object_or_404(TestSet, pk=pk)
    if request.method == 'GET':
        return Response({
            'id': ts.id, 'title': ts.title, 'subject_id': ts.subject_id,
            'description': ts.description, 'category': ts.category,
            'duration_minutes': ts.duration_minutes, 'created_by_id': ts.created_by_id,
            'is_premium': ts.is_premium, 'is_published': ts.is_published, 'is_archived': ts.is_archived,
            'category_options': [{'value': v, 'label': l} for v, l in Question.CATEGORY_CHOICES],
            'subject_options': [{'value': s.id, 'label': s.name} for s in Subject.objects.all()],
        })
    if request.method == 'DELETE':
        if ts.has_attempts:
            return Response({'error': "Bu testda o'quvchilar urinishlari bor — o'chirish o'rniga arxivlang."}, status=400)
        ts.delete()
        return Response({'deleted': True})
    form = TestSetForm(request.data, instance=ts)
    if not form.is_valid():
        return Response({'errors': _form_errors(form)}, status=400)
    form.save()
    return Response({'ok': True})


@api_view(['POST'])
@permission_classes([IsSuperAdmin])
def testset_duplicate_api(request, pk):
    ts = get_object_or_404(TestSet, pk=pk)
    questions = list(ts.questions.all())
    ts.pk = None
    ts.title = f"{ts.title} (nusxa)"
    ts.is_published = False
    ts.created_by = request.user
    ts.save()
    ts.questions.set(questions)
    return Response({'id': ts.id})


@api_view(['POST'])
@permission_classes([IsSuperAdmin])
def testset_toggle_publish_api(request, pk):
    ts = get_object_or_404(TestSet, pk=pk)
    ts.is_published = not ts.is_published
    if ts.is_published:
        ts.is_archived = False
    ts.save()
    return Response({'is_published': ts.is_published})


# ============================================================ LESSONS
def _lesson_row(l):
    return {
        'id': l.id, 'title': l.title, 'topic': l.topic.title if l.topic else '—',
        'author': (l.created_by.get_full_name() or l.created_by.username) if l.created_by else '—',
        'is_published': l.is_published,
    }


@api_view(['GET', 'POST'])
@permission_classes([IsSuperAdmin])
def lessons_api(request):
    qs = Lesson.objects.select_related('topic', 'created_by').all()
    if request.method == 'GET':
        return list_response(request, queryset=qs, search_fields=['title', 'content'],
                              sortable_fields=['title'], default_order='-created_at', row_fn=_lesson_row)
    action = request.data.get('action')
    if action:
        def perform(a, q):
            if a == 'publish':
                return q.update(is_published=True)
            if a == 'delete':
                n = q.count(); q.delete(); return n
            return 0
        return bulk_action(request, base_queryset=qs, allowed_actions={'publish', 'delete'}, perform_fn=perform)
    form = LessonForm(request.data)
    if not form.is_valid():
        return Response({'errors': _form_errors(form)}, status=400)
    obj = form.save()
    return Response({'id': obj.id})


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsSuperAdmin])
def lesson_detail_api(request, pk):
    obj = get_object_or_404(Lesson, pk=pk)
    if request.method == 'GET':
        return Response({'id': obj.id, 'topic_id': obj.topic_id, 'title': obj.title, 'content': obj.content,
                          'video_url': obj.video_url, 'created_by_id': obj.created_by_id,
                          'is_published': obj.is_published, 'order': obj.order})
    if request.method == 'DELETE':
        obj.delete()
        return Response({'deleted': True})
    form = LessonForm(request.data, instance=obj)
    if not form.is_valid():
        return Response({'errors': _form_errors(form)}, status=400)
    form.save()
    return Response({'ok': True})


# ============================================================ GAMES
def _game_row(g):
    return {
        'id': g.id, 'title': g.title, 'game_type_display': g.get_game_type_display(),
        'items_count': g.items_count,
        'author': (g.created_by.get_full_name() or g.created_by.username) if g.created_by else '—',
        'is_published': g.is_published,
    }


@api_view(['GET', 'POST'])
@permission_classes([IsSuperAdmin])
def games_api(request):
    qs = Game.objects.select_related('subject', 'created_by').annotate(items_count=Count('items', distinct=True))
    if request.method == 'GET':
        return list_response(request, queryset=qs, search_fields=['title', 'description'],
                              sortable_fields=['title'], default_order='-created_at', row_fn=_game_row)
    action = request.data.get('action')
    if action:
        return bulk_action(request, base_queryset=qs, allowed_actions={'delete'},
                            perform_fn=lambda a, q: (q.count(), q.delete())[0])
    form = GameForm(request.data)
    if not form.is_valid():
        return Response({'errors': _form_errors(form)}, status=400)
    obj = form.save()
    return Response({'id': obj.id})


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsSuperAdmin])
def game_detail_api(request, pk):
    obj = get_object_or_404(Game, pk=pk)
    if request.method == 'GET':
        return Response({'id': obj.id, 'title': obj.title, 'game_type': obj.game_type, 'subject_id': obj.subject_id,
                          'description': obj.description, 'is_published': obj.is_published,
                          'created_by_id': obj.created_by_id})
    if request.method == 'DELETE':
        obj.delete()
        return Response({'deleted': True})
    form = GameForm(request.data, instance=obj)
    if not form.is_valid():
        return Response({'errors': _form_errors(form)}, status=400)
    form.save()
    return Response({'ok': True})


# ============================================================ ATTEMPTS (RESULTS)
def _attempt_row(a):
    return {
        'id': a.id, 'student': a.profile.user.get_full_name() or a.profile.user.username,
        'test_title': a.test.title if a.test else 'Tasodifiy',
        'score': a.score, 'correct_answers': a.correct_answers, 'started_at': a.started_at,
    }


@api_view(['GET'])
@permission_classes([IsSuperAdmin])
def attempts_api(request):
    qs = Attempt.objects.select_related('profile__user', 'test').all()
    return list_response(
        request, queryset=qs, search_fields=['profile__user__username', 'test__title'],
        filters=[{'param': 'completed', 'lookup': 'is_completed'}],
        sortable_fields=['started_at'], default_order='-started_at', row_fn=_attempt_row,
    )


@api_view(['GET'])
@permission_classes([IsSuperAdmin])
def attempt_detail_api(request, pk):
    a = get_object_or_404(Attempt.objects.select_related('profile__user', 'test'), pk=pk)
    answers = a.answers.select_related('question', 'selected_choice').all()
    return Response({
        'id': a.id, 'student': a.profile.user.get_full_name() or a.profile.user.username,
        'test_title': a.test.title if a.test else 'Tasodifiy', 'score': a.score,
        'answers': [{
            'question_body': ans.question.body, 'is_correct': ans.is_correct,
            'selected_choice': ans.selected_choice.text if ans.selected_choice else None,
        } for ans in answers],
    })


@api_view(['GET'])
@permission_classes([IsSuperAdmin])
def attempts_export_api(request):
    response = HttpResponse(content_type='text/csv; charset=utf-8')
    response['Content-Disposition'] = 'attachment; filename="natijalar.csv"'
    response.write('﻿')
    writer = csv.writer(response)
    writer.writerow(["O'quvchi", "Username", "Test", "Ball", "To'g'ri", "Xato", "O'tkazib yuborilgan", "Sana"])
    qs = Attempt.objects.select_related('profile__user', 'test').filter(is_completed=True).order_by('-started_at')
    for a in qs:
        writer.writerow([
            a.profile.user.get_full_name() or a.profile.user.username, a.profile.user.username,
            a.test.title if a.test else 'Tasodifiy',
            f"{a.score:.0f}" if a.score is not None else '',
            a.correct_answers, a.wrong_answers, a.skipped_answers,
            a.started_at.strftime('%Y-%m-%d %H:%M'),
        ])
    return response


# ============================================================ PAYMENTS
def _payment_row(p):
    return {
        'id': p.id, 'username': p.profile.user.username, 'plan_name': p.plan.name,
        'amount': str(p.amount), 'status': p.status, 'status_display': p.get_status_display(),
        'status_tone': {'pending': 'amber', 'approved': 'green', 'rejected': 'rose'}.get(p.status, 'slate'),
        'created_at': p.created_at,
    }


@api_view(['GET'])
@permission_classes([IsSuperAdmin])
def payments_api(request):
    qs = Payment.objects.select_related('profile__user', 'plan').all()
    return list_response(request, queryset=qs, search_fields=['profile__user__username'],
                          filters=[{'param': 'status', 'lookup': 'status'}],
                          sortable_fields=[], default_order='-created_at', row_fn=_payment_row)


@api_view(['GET'])
@permission_classes([IsSuperAdmin])
def payment_detail_api(request, pk):
    p = get_object_or_404(Payment.objects.select_related('profile__user', 'plan'), pk=pk)
    return Response({**_payment_row(p), 'admin_note': p.admin_note,
                      'screenshot': p.screenshot.url if p.screenshot else None})


@api_view(['POST'])
@permission_classes([IsSuperAdmin])
def payment_approve_api(request, pk):
    p = get_object_or_404(Payment, pk=pk)
    if p.status == 'pending':
        p.status = 'approved'
        p.reviewed_by = request.user
        p.reviewed_at = timezone.now()
        p.save()
        p.apply_to_profile()
        Notification.objects.create(profile=p.profile, title="Premium faollashtirildi",
                                     message=f"To'lovingiz tasdiqlandi! '{p.plan.name}' faollashtirildi.", type='system')
    return Response({'status': p.status})


@api_view(['POST'])
@permission_classes([IsSuperAdmin])
def payment_reject_api(request, pk):
    p = get_object_or_404(Payment, pk=pk)
    if p.status == 'pending':
        p.status = 'rejected'
        p.reviewed_by = request.user
        p.reviewed_at = timezone.now()
        p.save()
    return Response({'status': p.status})


@api_view(['POST'])
@permission_classes([IsSuperAdmin])
def payments_grant_api(request):
    username = (request.data.get('username') or '').strip()
    action = request.data.get('grant_action', 'grant')
    user = User.objects.filter(username=username).select_related('profile').first()
    if not user:
        return Response({'error': "Bunday foydalanuvchi topilmadi."}, status=404)
    profile = user.profile
    grant = action == 'grant'
    profile.is_premium = grant
    profile.premium_mock_test_unlocked = grant
    profile.save()
    return Response({'username': username, 'is_premium': grant})


# ============================================================ SETTINGS
@api_view(['GET', 'PUT'])
@permission_classes([IsSuperAdmin])
def settings_api(request):
    settings_obj = SiteSettings.load()
    if request.method == 'GET':
        return Response({
            'site_name': settings_obj.site_name, 'logo_url': settings_obj.logo_url,
            'contact_email': settings_obj.contact_email, 'contact_phone': settings_obj.contact_phone,
            'telegram_channel': settings_obj.telegram_channel, 'announcement': settings_obj.announcement,
            'maintenance_mode': settings_obj.maintenance_mode,
        })
    form = SiteSettingsForm(request.data, instance=settings_obj)
    if not form.is_valid():
        return Response({'errors': _form_errors(form)}, status=400)
    form.save()
    cache.delete('maintenance_mode')
    return Response({'ok': True})


# ============================================================ AUDIT LOG
def _audit_row(log):
    return {
        'id': log.id, 'who': (log.user.get_full_name() or log.user.username) if log.user else 'Tizim',
        'action': log.action, 'action_display': log.get_action_display(),
        'action_tone': {'create': 'green', 'update': 'blue', 'delete': 'rose'}.get(log.action, 'slate'),
        'model_name': log.model_name, 'object_repr': log.object_repr, 'timestamp': log.timestamp,
    }


@api_view(['GET'])
@permission_classes([IsSuperAdmin])
def audit_log_api(request):
    qs = AuditLog.objects.select_related('user').all()
    return list_response(request, queryset=qs, search_fields=['object_repr', 'model_name', 'user__username'],
                          filters=[{'param': 'action', 'lookup': 'action'}],
                          sortable_fields=[], default_order='-timestamp', row_fn=_audit_row)


# ============================================================ BROADCAST
def _audience_profiles(audience):
    qs = Profile.objects.select_related('user').filter(user__is_active=True)
    if audience == 'students':
        return qs.filter(role='student')
    if audience == 'teachers':
        return qs.filter(role='teacher')
    if audience == 'premium':
        return qs.filter(Q(is_premium=True) | Q(premium_mock_test_unlocked=True))
    return qs


@api_view(['GET', 'POST'])
@permission_classes([IsSuperAdmin])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def broadcast_api(request):
    if request.method == 'GET':
        return Response({
            'history': [{
                'id': b.id, 'title': b.title, 'audience': b.audience, 'recipients_count': b.recipients_count,
                'telegram_sent_count': b.telegram_sent_count, 'sent_at': b.sent_at,
                'image': b.image.url if b.image else None,
            } for b in Broadcast.objects.select_related('sent_by')[:20]],
            'audience_counts': {a[0]: _audience_profiles(a[0]).count() for a in Broadcast.AUDIENCE_CHOICES},
        })

    form = BroadcastForm(request.data, request.FILES)
    if not form.is_valid():
        return Response({'errors': _form_errors(form)}, status=400)
    bc = form.save(commit=False)
    bc.sent_by = request.user
    profiles = list(_audience_profiles(bc.audience))

    Notification.objects.bulk_create([
        Notification(profile=p, title=bc.title, message=bc.message, type='system') for p in profiles
    ])
    bc.recipients_count = len(profiles)
    bc.save()

    photo_failed = 0
    if bc.via_telegram:
        sent = 0
        caption = f"{bc.title}\n\n{bc.message}"
        has_image = bool(bc.image)
        image_path = bc.image.path if has_image else None
        # Birinchi yuborish rasmni Telegram'ga yuklaydi va uning file_id'sini qaytaradi;
        # qolganlariga o'sha nusxaga havola ketadi — yuzta qayta yuklash o'rniga bitta.
        file_id = ''
        for p in profiles:
            if not p.telegram_id:
                continue
            if has_image:
                result = send_telegram_photo(p.telegram_id, image_path, caption, file_id=file_id)
                if isinstance(result, str):
                    file_id = result
                else:
                    # Rasm o'tmadi — xabar matn holida ketgan bo'lishi mumkin.
                    photo_failed += 1
                ok = bool(result)
            else:
                ok = send_telegram_message(p.telegram_id, caption)
            if ok:
                sent += 1
        bc.telegram_sent_count = sent
        bc.save(update_fields=['telegram_sent_count'])

    return Response({
        'id': bc.id,
        'recipients_count': bc.recipients_count,
        'telegram_sent_count': bc.telegram_sent_count,
        # Panelda ko'rsatiladi: ilgari rasm jimgina tushib qolar, admin esa xabar rasm
        # bilan ketdi deb o'ylardi.
        'photo_failed_count': photo_failed,
    })


@api_view(['DELETE'])
@permission_classes([IsSuperAdmin])
def broadcast_delete_api(request, pk):
    bc = get_object_or_404(Broadcast, pk=pk)
    if bc.image:
        try:
            bc.image.delete(save=False)
        except Exception:
            pass
    bc.delete()
    return Response({'deleted': True})
