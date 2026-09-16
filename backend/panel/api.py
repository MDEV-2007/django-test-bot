"""Super Admin panelining JSON API'si (Next.js frontend uchun).

Umumiy JWT naqshi — accounts/api.py; ro'yxat/qidiruv/filtr/tartib/sahifalash uchun umumiy
yordamchi — panel/api_utils.py.

Audit jurnalida amalni kim bajargani (panel/signals.py)
accounts.jwt_auth.AuditAwareJWTAuthentication orqali global tarzda aniqlanadi, shuning
uchun bu yerdagi hech bir endpoint uni alohida chaqirmaydi.
"""
import csv
import logging
import os
import re
import secrets
import subprocess
import sys
import time
from datetime import timedelta
from io import BytesIO

import django
from django.conf import settings
from django.contrib.auth.models import User
from django.core.cache import cache
from django.db import connection, transaction
from django.db.models import Avg, Count, F, Max, Q, Sum
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, parser_classes, permission_classes
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

logger = logging.getLogger(__name__)

from accounts.models import Profile
from accounts.permissions import IsSuperAdmin, is_last_active_superadmin
from accounts.utils import send_telegram_message, send_telegram_photo
from core.models import Notification
from games.models import Game
from learning.models import Lesson
from premium.models import Payment, PromoCode, SubscriptionPlan
from shop.models import ShopItem
from telegrambot.models import RequiredChannel
from telegrambot.client import api_call as tg_api_call
from tests_app.models import Attempt, AttemptAnswer, ExamSurvey, Question, Subject, TestSet

from .api_utils import bulk_action, list_response
from .forms import (
    BroadcastForm, GameForm, LessonForm, ShopItemForm, SiteSettingsForm, SubjectForm,
    TeacherCreateForm, TestSetForm, UserForm,
)
from .models import AIUsageLog, AuditLog, Broadcast, SiteSettings, FeatureFlag

DASHBOARD_CACHE_KEY = 'panel:dashboard:stats'


def _form_errors(form):
    return {field: errs[0] for field, errs in form.errors.items()}


# ============================================================ DASHBOARD
@api_view(['GET'])
@permission_classes([IsSuperAdmin])
def dashboard_api(request):
    ctx = cache.get(DASHBOARD_CACHE_KEY)
    if ctx is None:
        try:
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

            # Asosiy urinishlar statistikasi va voronka
            total_started_attempts = Attempt.objects.count()
            completed_attempts_qs = Attempt.objects.filter(is_completed=True)
            completed_attempts_count = completed_attempts_qs.count()
            completion_rate = round((completed_attempts_count / total_started_attempts * 100), 1) if total_started_attempts else 0.0

            # O'rtacha va eng yuqori ball
            score_agg = completed_attempts_qs.aggregate(avg_score=Avg('score'), max_score=Max('score'))
            avg_score = round(score_agg['avg_score'], 1) if score_agg.get('avg_score') is not None else 0.0
            max_score = round(score_agg['max_score'], 1) if score_agg.get('max_score') is not None else 0.0

            # Muvaffaqiyat ko'rsatkichi (60% dan yuqori)
            passed_count = completed_attempts_qs.filter(score__gte=60).count()
            pass_rate = round((passed_count / completed_attempts_count * 100), 1) if completed_attempts_count else 0.0

            # Ballar darajalari taqsimoti (Score Distribution)
            gold_count = completed_attempts_qs.filter(score__gte=85).count()
            silver_count = completed_attempts_qs.filter(score__gte=70, score__lt=85).count()
            bronze_count = completed_attempts_qs.filter(score__gte=60, score__lt=70).count()
            fail_count = completed_attempts_qs.filter(score__lt=60).count()

            denom_score = completed_attempts_count or 1
            score_distribution = {
                'gold': {'count': gold_count, 'pct': round(gold_count / denom_score * 100, 1)},
                'silver': {'count': silver_count, 'pct': round(silver_count / denom_score * 100, 1)},
                'bronze': {'count': bronze_count, 'pct': round(bronze_count / denom_score * 100, 1)},
                'fail': {'count': fail_count, 'pct': round(fail_count / denom_score * 100, 1)},
            }

            # Javoblar anatomiyasi (To'g'ri / Xato / Bo'sh)
            ans_agg = completed_attempts_qs.aggregate(
                total_correct=Sum('correct_answers'),
                total_wrong=Sum('wrong_answers'),
                total_skipped=Sum('skipped_answers'),
            )
            c_ans = ans_agg.get('total_correct') or 0
            w_ans = ans_agg.get('total_wrong') or 0
            s_ans = ans_agg.get('total_skipped') or 0
            total_answers = c_ans + w_ans + s_ans
            denom_ans = total_answers or 1
            answers_anatomy = {
                'correct': c_ans,
                'wrong': w_ans,
                'skipped': s_ans,
                'total': total_answers,
                'correct_pct': round(c_ans / denom_ans * 100, 1),
                'wrong_pct': round(w_ans / denom_ans * 100, 1),
                'skipped_pct': round(s_ans / denom_ans * 100, 1),
            }

            # Telegram va aloqa faolligi
            total_profiles = Profile.objects.count()
            tg_connected = Profile.objects.filter(telegram_id__isnull=False).exclude(telegram_id='').exclude(telegram_id='0').count()
            tg_username_count = Profile.objects.filter(telegram_username__isnull=False).exclude(telegram_username='').count()
            email_count = User.objects.filter(email__isnull=False).exclude(email='').count()

            # O'quvchilar sadoqati (Retention & Loyalty)
            user_attempts = (
                Attempt.objects
                .values('profile')
                .annotate(attempt_count=Count('id'))
            )
            one_attempt = sum(1 for u in user_attempts if u['attempt_count'] == 1)
            two_to_five = sum(1 for u in user_attempts if 2 <= u['attempt_count'] <= 5)
            six_plus = sum(1 for u in user_attempts if u['attempt_count'] >= 6)
            active_learners_count = len(user_attempts)
            avg_attempts_per_user = round(total_started_attempts / active_learners_count, 1) if active_learners_count else 0.0

            user_retention = {
                'one_attempt': one_attempt,
                'two_to_five': two_to_five,
                'six_plus': six_plus,
                'active_learners': active_learners_count,
                'avg_attempts_per_user': avg_attempts_per_user,
            }

            # Fanlar chuqur diagnostikasi
            subject_stats = []
            for s in Subject.objects.all().order_by('order', 'name'):
                s_attempts = Attempt.objects.filter(test__subject=s)
                s_total = s_attempts.count()
                if s_total == 0:
                    continue
                s_completed = s_attempts.filter(is_completed=True)
                s_agg = s_completed.aggregate(avg_score=Avg('score'), max_score=Max('score'))
                s_avg = round(s_agg['avg_score'], 1) if s_agg.get('avg_score') is not None else 0.0
                s_max = round(s_agg['max_score'], 1) if s_agg.get('max_score') is not None else 0.0
                s_students = s_attempts.values('profile').distinct().count()
                subject_stats.append({
                    'id': s.id,
                    'name': s.name,
                    'total_attempts': s_total,
                    'completed_attempts': s_completed.count(),
                    'students_count': s_students,
                    'avg_score': s_avg,
                    'max_score': s_max,
                })
            subject_stats.sort(key=lambda x: x['total_attempts'], reverse=True)

            # Mock imtihonlar alohida tahlili
            mock_filter = (
                Q(test__is_live_mock=True) |
                Q(test__scheduled_at__isnull=False) |
                Q(mock_attempt__isnull=False) |
                Q(test__title__icontains='mock') |
                Q(test__category='cefr')
            )
            mock_attempts_qs = Attempt.objects.filter(mock_filter)
            mock_total = mock_attempts_qs.count()
            mock_completed = mock_attempts_qs.filter(is_completed=True)
            m_agg = mock_completed.aggregate(avg_score=Avg('score'), max_score=Max('score'))
            mock_analytics = {
                'total_attempts': mock_total,
                'completed_count': mock_completed.count(),
                'avg_score': round(m_agg['avg_score'], 1) if m_agg.get('avg_score') is not None else 0.0,
                'max_score': round(m_agg['max_score'], 1) if m_agg.get('max_score') is not None else 0.0,
                'gold_count': mock_completed.filter(score__gte=80).count(),
            }

            # Yaqinlashayotgan yoki eng so'nggi Jonli Mock
            upcoming_mock = (
                TestSet.objects
                .filter(Q(is_live_mock=True) | Q(scheduled_at__isnull=False))
                .order_by(F('scheduled_at').desc(nulls_last=True))
                .first()
            )
            upcoming_mock_info = None
            if upcoming_mock:
                reminders_cnt = upcoming_mock.remind_users.count() if hasattr(upcoming_mock, 'remind_users') else 0
                sched_str = None
                if upcoming_mock.scheduled_at:
                    tz = timezone.get_current_timezone()
                    sched_dt = upcoming_mock.scheduled_at.astimezone(tz) if timezone.is_aware(upcoming_mock.scheduled_at) else upcoming_mock.scheduled_at
                    sched_str = sched_dt.strftime('%d.%m.%Y %H:%M')
                upcoming_mock_info = {
                    'id': upcoming_mock.id,
                    'title': upcoming_mock.title,
                    'subject_name': upcoming_mock.subject.name if upcoming_mock.subject else "Asosiy",
                    'scheduled_at': sched_str,
                    'reminders_count': reminders_cnt,
                }

            # Top 5 Peshqadam O'quvchilar (Leaderboard)
            top_students_raw = (
                Attempt.objects
                .filter(is_completed=True, score__isnull=False)
                .values('profile')
                .annotate(
                    avg_score=Avg('score'),
                    max_score=Max('score'),
                    tests_count=Count('id')
                )
                .filter(tests_count__gte=1)
                .order_by('-avg_score', '-max_score', '-tests_count')[:5]
            )
            p_ids = [row['profile'] for row in top_students_raw]
            prof_map = {p.id: p for p in Profile.objects.filter(id__in=p_ids).select_related('user')}
            top_students = []
            for idx, row in enumerate(top_students_raw, start=1):
                prof = prof_map.get(row['profile'])
                u = prof.user if prof else None
                user_full = f"{getattr(u, 'first_name', '')} {getattr(u, 'last_name', '')}".strip() or getattr(u, 'username', '') or "O'quvchi"
                top_students.append({
                    'rank': idx,
                    'name': user_full,
                    'username': getattr(u, 'username', '') or '',
                    'phone': getattr(prof, 'phone', '') or '',
                    'tests_count': row['tests_count'],
                    'avg_score': round(float(row['avg_score']), 1),
                    'max_score': round(float(row['max_score']), 1),
                })

            # Kunning faol soatlari (Peak Hours)
            tz = timezone.get_current_timezone()
            hour_counts = {'morning': 0, 'afternoon': 0, 'evening': 0, 'night': 0}
            for dt_val in Attempt.objects.values_list('started_at', flat=True)[:300]:
                if not dt_val:
                    continue
                local_dt = dt_val.astimezone(tz) if timezone.is_aware(dt_val) else dt_val
                h = local_dt.hour
                if 6 <= h < 12:
                    hour_counts['morning'] += 1
                elif 12 <= h < 18:
                    hour_counts['afternoon'] += 1
                elif 18 <= h < 23:
                    hour_counts['evening'] += 1
                else:
                    hour_counts['night'] += 1

            total_hour_samples = sum(hour_counts.values()) or 1
            peak_hours = {
                'morning': {'label': 'Ertalab (06:00 - 12:00)', 'count': hour_counts['morning'], 'pct': round(hour_counts['morning'] / total_hour_samples * 100, 1)},
                'afternoon': {'label': 'Tushdan keyin (12:00 - 18:00)', 'count': hour_counts['afternoon'], 'pct': round(hour_counts['afternoon'] / total_hour_samples * 100, 1)},
                'evening': {'label': 'Kechki pik vaqt (18:00 - 23:00)', 'count': hour_counts['evening'], 'pct': round(hour_counts['evening'] / total_hour_samples * 100, 1)},
                'night': {'label': 'Tun (23:00 - 06:00)', 'count': hour_counts['night'], 'pct': round(hour_counts['night'] / total_hour_samples * 100, 1)},
            }

            # Eng qiyin savollar (HTML tozalangan)
            hardest_questions = []
            try:
                hard_q = (AttemptAnswer.objects
                          .filter(attempt__is_completed=True)
                          .values('question')
                          .annotate(total=Count('id'), correct=Count('id', filter=Q(is_correct=True)))
                          .filter(total__gte=5)
                          .order_by('correct'))[:8]
                qids = [row['question'] for row in hard_q]
                qmap = {q.id: q for q in Question.objects.filter(id__in=qids).select_related('subject')}
                for row in hard_q:
                    q = qmap.get(row['question'])
                    if not q:
                        continue
                    rate = round(100 * row['correct'] / row['total']) if row['total'] else 0
                    clean_text = re.sub(r'<[^>]+>', '', q.body).strip()
                    clean_text = clean_text[:110]
                    s_name = q.subject.name if q.subject else "Test"
                    hardest_questions.append({
                        'id': q.id,
                        'text': clean_text,
                        'subject_name': s_name,
                        'rate': rate,
                        'total': row['total']
                    })
            except Exception as e:
                logger.warning("Error calculating hardest questions: %s", e)

            ctx = {
                'stats': {
                    'users': User.objects.count(),
                    'teachers': Profile.objects.filter(role='teacher').count(),
                    'students': Profile.objects.filter(role='student').count(),
                    'testsets': TestSet.objects.filter(is_random=False).count(),
                    'lessons': Lesson.objects.count(),
                    'games': Game.objects.count(),
                    'attempts_today': Attempt.objects.filter(started_at__date=today).count(),
                    'attempts_total': completed_attempts_count,
                    'pending_payments': Payment.objects.filter(status='pending').count(),
                    'total_revenue': str(total_revenue),
                    'active_today': active_today,
                    'premium_users': premium_users,
                    'completion_rate': completion_rate,
                    'avg_score': avg_score,
                    'max_score': max_score,
                    'pass_rate': pass_rate,
                    'tg_connected': tg_connected,
                    'tg_username_count': tg_username_count,
                    'email_count': email_count,
                    'tg_pct': round(tg_connected / (total_profiles or 1) * 100, 1),
                },
                'chart_labels': labels, 'chart_reg': reg_series, 'chart_attempts': attempt_series,
                'score_distribution': score_distribution,
                'answers_anatomy': answers_anatomy,
                'user_retention': user_retention,
                'subject_stats': subject_stats,
                'mock_analytics': mock_analytics,
                'upcoming_mock_info': upcoming_mock_info,
                'top_students': top_students,
                'peak_hours': peak_hours,
                'hardest_questions': hardest_questions,
                'recent_logs': [{
                    'id': log.id, 'summary': log.summary_uz, 'action': log.action, 'timestamp': log.timestamp,
                } for log in AuditLog.objects.select_related('user')[:12]],
            }
            cache.set(DASHBOARD_CACHE_KEY, ctx, 60)
        except Exception as e:
            logger.exception("Error calculating dashboard stats: %s", e)
            today = timezone.localdate()
            completed_cnt = Attempt.objects.filter(is_completed=True).count()
            ctx = {
                'stats': {
                    'users': User.objects.count(),
                    'teachers': Profile.objects.filter(role='teacher').count(),
                    'students': Profile.objects.filter(role='student').count(),
                    'testsets': TestSet.objects.filter(is_random=False).count(),
                    'lessons': Lesson.objects.count(),
                    'games': Game.objects.count(),
                    'attempts_today': Attempt.objects.filter(started_at__date=today).count(),
                    'attempts_total': completed_cnt,
                    'pending_payments': Payment.objects.filter(status='pending').count(),
                    'total_revenue': str(Payment.objects.filter(status='approved').aggregate(s=Sum('amount'))['s'] or 0),
                    'active_today': Attempt.objects.filter(started_at__date=today).values('profile').distinct().count(),
                    'premium_users': Profile.objects.filter(Q(is_premium=True) | Q(premium_mock_test_unlocked=True)).count(),
                },
                'chart_labels': [], 'chart_reg': [], 'chart_attempts': [],
                'hardest_questions': [],
                'recent_logs': [],
            }

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


@api_view(['POST'])
@permission_classes([IsSuperAdmin])
def user_create_api(request):
    """Super admin panelidan yangi foydalanuvchi/ustoz/volontyor/admin yaratish."""
    data = request.data or {}
    username = (data.get('username') or '').strip()
    password = (data.get('password') or '').strip()
    full_name = (data.get('fullname') or data.get('full_name') or '').strip()
    first_name = (data.get('first_name') or '').strip()
    last_name = (data.get('last_name') or '').strip()
    email = (data.get('email') or '').strip()
    role = (data.get('role') or 'teacher').strip()
    biography = (data.get('biography') or '').strip()

    if full_name and not (first_name and last_name):
        parts = full_name.split(None, 1)
        first_name = parts[0]
        last_name = parts[1] if len(parts) > 1 else ''

    errors = {}
    if not username:
        errors['username'] = ["Username kiritilishi shart."]
    elif len(username) < 3:
        errors['username'] = ["Username kamida 3 ta belgidan iborat bo'lishi kerak."]
    elif User.objects.filter(username__iexact=username).exists():
        errors['username'] = ["Bu username allaqachon band."]

    if not password:
        errors['password'] = ["Parol kiritilishi shart."]
    elif len(password) < 6:
        errors['password'] = ["Parol kamida 6 ta belgidan iborat bo'lishi kerak."]

    valid_roles = [r[0] for r in Profile.ROLE_CHOICES]
    if role not in valid_roles:
        errors['role'] = ["Noto'g'ri rol tanlandi."]

    if errors:
        return Response({'errors': errors}, status=400)

    user = User.objects.create_user(
        username=username,
        password=password,
        first_name=first_name,
        last_name=last_name,
        email=email,
    )
    if role == 'superadmin':
        user.is_staff = True
        user.save(update_fields=['is_staff'])

    user.profile.role = role
    if biography:
        user.profile.biography = biography
    user.profile.save()

    return Response({
        'id': user.id,
        'username': user.username,
        'full_name': user.get_full_name() or user.username,
        'role': role,
        'role_display': user.profile.get_role_display(),
    }, status=201)


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
    custom_pwd = ((request.data.get('password') if request.data else '') or '').strip()
    if custom_pwd:
        if len(custom_pwd) < 6:
            return Response({'error': "Parol kamida 6 ta belgidan iborat bo'lishi kerak."}, status=400)
        new_password = custom_pwd
    else:
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

    if profile.is_privileged:
        profile.xp = 0
        profile.level = 1
    else:
        profile.xp = _clean_int('xp', profile.xp)
        profile.level = max(1, profile.xp // 1000 + 1)
    profile.coins = _clean_int('coins', profile.coins)
    profile.elo_rating = _clean_int('elo_rating', profile.elo_rating, lo=100, hi=5000)
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
    admin_user = User.objects.select_related('profile').filter(pk=original_id).first()
    if not admin_user or not admin_user.is_active:
        return Response({'error': 'Asl admin topilmadi.'}, status=404)
    is_superadmin = admin_user.is_superuser or (
        hasattr(admin_user, 'profile') and admin_user.profile.is_superadmin
    )
    if not is_superadmin:
        return Response({'error': 'Asl admin huquqi bekor qilingan.'}, status=403)
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
    data = dict(request.data or {})
    full_name = (data.get('fullname') or data.get('full_name') or '').strip()
    if full_name and not (data.get('first_name') and data.get('last_name')):
        parts = full_name.split(None, 1)
        data['first_name'] = parts[0]
        data['last_name'] = parts[1] if len(parts) > 1 else ''
    form = TeacherCreateForm(data)
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
        'category': ts.category,
        'author': (ts.created_by.get_full_name() or ts.created_by.username) if ts.created_by else '—',
        'status': _testset_status(ts), 'attempt_count': ts.attempts.count(),
        'listening_audio': ts.listening_audio.url if ts.listening_audio else None,
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
            'is_live_mock': ts.is_live_mock,
            'scheduled_at': (ts.scheduled_at.astimezone(timezone.get_current_timezone()).strftime('%Y-%m-%dT%H:%M') if timezone.is_aware(ts.scheduled_at) else ts.scheduled_at.strftime('%Y-%m-%dT%H:%M')) if ts.scheduled_at else '',
            'notify_all': ts.notify_all,
            'notified_at': ts.notified_at.isoformat() if ts.notified_at else None,
            'listening_audio': ts.listening_audio.url if ts.listening_audio else None,
            # Urinishlari bor testni o'chirib bo'lmaydi (pastdagi DELETE shartiga
            # qarang). Interfeys buni OLDINDAN bilishi kerak: aks holda u
            # "urinishlar ham o'chadi" deb va'da beradi, so'ng server rad etadi va
            # foydalanuvchiga tugma buzuqdek tuyuladi.
            'attempt_count': ts.attempts.count(),
            'category_options': [{'value': v, 'label': l} for v, l in Question.CATEGORY_CHOICES],
            'subject_options': [{'value': s.id, 'label': s.name} for s in Subject.objects.all()],
        })
    if request.method == 'DELETE':
        if ts.has_attempts:
            return Response({'error': "Bu testda o'quvchilar urinishlari bor — o'chirish o'rniga arxivlang."}, status=400)
        ts.delete()
        return Response({'deleted': True})
    data = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)
    if 'scheduled_at' in data and not data['scheduled_at']:
        data['scheduled_at'] = None
    form = TestSetForm(data, instance=ts)
    if not form.is_valid():
        return Response({'errors': _form_errors(form)}, status=400)
    form.save()
    return Response({'ok': True})


@api_view(['POST', 'DELETE'])
@permission_classes([IsSuperAdmin])
@parser_classes([MultiPartParser, FormParser])
def testset_listening_audio_api(request, pk):
    ts = get_object_or_404(TestSet, pk=pk)
    if request.method == 'POST':
        audio_file = request.FILES.get('listening_audio') or request.FILES.get('audio')
        if not audio_file:
            return Response({'error': "Audio fayl yuklanmadi."}, status=400)
        ts.listening_audio = audio_file
        ts.save(update_fields=['listening_audio'])
        return Response({
            'ok': True,
            'listening_audio': ts.listening_audio.url,
            'filename': audio_file.name,
        })
    if request.method == 'DELETE':
        if ts.listening_audio:
            ts.listening_audio.delete(save=False)
            ts.listening_audio = None
            ts.save(update_fields=['listening_audio'])
        return Response({'ok': True, 'listening_audio': None})


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


# ============================================================ ANSWER REVIEW
# A test imported from a PDF (tests_app.importers) arrives with its correct answers
# guessed by a model, so every one of them has to be confirmed by a person before the set
# is published. These two endpoints are that review pass: one read that returns each
# question with everything needed to judge it (image, table markup, options, the AI's
# pick), and one write that sets a single question's answer.


def _review_question(question):
    """One question as the review screen needs it, including whether it still needs a
    decision - which is what the reviewer filters on."""
    data = {
        'id': question.id,
        'question_type': question.question_type,
        'body': question.body,
        'image_url': question.image.url if question.image else question.image_url,
        'choices': [], 'group': None, 'sub_questions': [], 'reference_answer': '',
    }

    if question.question_type == 'grouped_item':
        group = question.group
        data['group'] = {
            'instruction': group.instruction if group else '',
            'options': [
                {'id': o.id, 'label': o.label, 'text': o.text}
                for o in (group.options.all() if group else [])
            ],
            'correct_option_id': question.correct_group_option_id,
        }
        data['needs_review'] = question.correct_group_option_id is None
        return data

    if question.question_type == 'open_written':
        subs = list(question.sub_questions.all())
        data['sub_questions'] = [
            {'id': s.id, 'label': s.label, 'text': s.text,
             'reference_answer': s.reference_answer}
            for s in subs
        ]
        data['reference_answer'] = question.reference_answer
        if subs:
            data['needs_review'] = any(not s.reference_answer.strip() for s in subs)
        else:
            data['needs_review'] = not question.reference_answer.strip()
        return data

    choices = list(question.choices.all())
    data['choices'] = [
        {'id': c.id, 'text': c.text, 'is_correct': c.is_correct} for c in choices
    ]
    data['needs_review'] = not any(c.is_correct for c in choices)
    return data


@api_view(['GET'])
@permission_classes([IsSuperAdmin])
def testset_review_api(request, pk):
    ts = get_object_or_404(TestSet, pk=pk)
    questions = [_review_question(q) for q in ts.ordered_questions()]
    return Response({
        'id': ts.id,
        'title': ts.title,
        'is_published': ts.is_published,
        'questions': questions,
        'needs_review_count': sum(1 for q in questions if q['needs_review']),
    })


@api_view(['POST'])
@permission_classes([IsSuperAdmin])
def testset_review_answer_api(request, pk, question_pk):
    """Set one question's correct answer. Scoped through the test set so a question can
    only be edited from a review of a set it actually belongs to."""
    ts = get_object_or_404(TestSet, pk=pk)
    question = get_object_or_404(ts.questions, pk=question_pk)

    if question.question_type == 'grouped_item':
        return _review_save_grouped(request, question)
    if question.question_type == 'open_written':
        return _review_save_written(request, question)
    return _review_save_choice(request, question)


def _review_save_choice(request, question):
    try:
        choice_id = int(request.data.get('choice_id'))
    except (TypeError, ValueError):
        return Response({'error': 'Variant topilmadi.'}, status=400)

    choices = list(question.choices.all())
    if not any(c.id == choice_id for c in choices):
        return Response({'error': 'Variant topilmadi.'}, status=400)

    for choice in choices:
        should_be = (choice.id == choice_id)
        if choice.is_correct != should_be:
            choice.is_correct = should_be
            choice.save(update_fields=['is_correct'])
    return Response({'ok': True, 'question': _review_question(question)})


def _review_save_grouped(request, question):
    try:
        option_id = int(request.data.get('group_option_id'))
    except (TypeError, ValueError):
        return Response({'error': 'Variant topilmadi.'}, status=400)

    group = question.group
    if group is None or not group.options.filter(pk=option_id).exists():
        return Response({'error': 'Variant topilmadi.'}, status=400)

    question.correct_group_option_id = option_id
    question.save(update_fields=['correct_group_option'])
    return Response({'ok': True, 'question': _review_question(question)})


@transaction.atomic
def _review_save_written(request, question):
    """Reference answers, either per sub-question or - for a question with no lettered
    parts - the single one on the question itself. Validated fully before any save so a
    bad id in the middle of the payload can't leave earlier sub-questions half-written."""
    answers = request.data.get('reference_answers')
    if isinstance(answers, dict) and answers:
        subs = {s.id: s for s in question.sub_questions.all()}
        try:
            resolved = [(subs[int(raw_id)], str(text).strip()) for raw_id, text in answers.items()]
        except (KeyError, TypeError, ValueError):
            return Response({'error': 'Band topilmadi.'}, status=400)
        for sub, text in resolved:
            sub.reference_answer = text
            sub.save(update_fields=['reference_answer'])
        return Response({'ok': True, 'question': _review_question(question)})

    if question.sub_questions.exists():
        return Response({'error': "Bandlar uchun javob yuborilmadi."}, status=400)

    question.reference_answer = str(request.data.get('reference_answer', '')).strip()
    question.save(update_fields=['reference_answer'])
    return Response({'ok': True, 'question': _review_question(question)})


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
    total_q = (a.correct_answers + a.wrong_answers + a.skipped_answers)
    if not total_q and a.test:
        total_q = a.test.questions.count()

    return Response({
        'id': a.id,
        'student': a.profile.user.get_full_name() or a.profile.user.username,
        'test_title': a.test.title if a.test else 'Tasodifiy',
        'score': a.score,
        'correct_answers': a.correct_answers,
        'total_questions': total_q or 45,
        'completed_at': a.completed_at.isoformat() if a.completed_at else None,
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
                'scheduled_at': b.scheduled_at.isoformat() if b.scheduled_at else None,
                'is_sent': b.is_sent,
            } for b in Broadcast.objects.select_related('sent_by')[:30]],
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


@api_view(['GET'])
@permission_classes([IsSuperAdmin])
def surveys_api(request):
    """Admin uchun o'quvchilar qoldirgan barcha fikr-mulohazalar va sharhlar ro'yxati."""
    surveys = ExamSurvey.objects.select_related('user', 'test', 'test__subject', 'attempt').order_by('-created_at')

    q = request.GET.get('q', '').strip()
    if q:
        surveys = surveys.filter(
            Q(user__username__icontains=q) |
            Q(user__first_name__icontains=q) |
            Q(user__last_name__icontains=q) |
            Q(comment__icontains=q) |
            Q(test__title__icontains=q)
        )

    difficulty = request.GET.get('difficulty')
    if difficulty:
        surveys = surveys.filter(difficulty=difficulty)

    rating = request.GET.get('rating')
    if rating and rating.isdigit():
        surveys = surveys.filter(platform_rating=int(rating))

    items = []
    for s in surveys[:150]:
        user_full = f"{s.user.first_name} {s.user.last_name}".strip() or s.user.username
        subj_name = s.test.subject.name if (s.test and getattr(s.test, 'subject', None)) else ""
        items.append({
            'id': s.id,
            'user_name': user_full,
            'username': s.user.username,
            'test_title': s.test.title if s.test else "Test",
            'subject_name': subj_name,
            'score': s.attempt.score if s.attempt else None,
            'correct_answers': s.attempt.correct_answers if s.attempt else None,
            'difficulty': s.difficulty,
            'platform_rating': s.platform_rating,
            'comment': s.comment,
            'created_at': s.created_at.strftime('%Y-%m-%d %H:%M'),
        })

    return Response({
        'count': surveys.count(),
        'items': items,
    })


# ============================================================ MOCK RESULTS
def _safe_datetime_diff_seconds(started_at, completed_at):
    """Xavfsiz sekundlar farqi (offset-naive va offset-aware datetime xatoliklariga qarshi)."""
    if not started_at or not completed_at:
        return None
    try:
        s = started_at
        c = completed_at
        if timezone.is_aware(c) and timezone.is_naive(s):
            s = timezone.make_aware(s)
        elif timezone.is_naive(c) and timezone.is_aware(s):
            c = timezone.make_aware(c)
        return max(0, int((c - s).total_seconds()))
    except Exception:
        return None


def _calculate_grade(score, correct=None):
    """UzBMB (DTM) rasmiy Milliy Sertifikat 100 ballik baholash shkalasi."""
    if score is None:
        return '—', 'slate'
    try:
        score_f = float(score)
    except (ValueError, TypeError):
        return '—', 'slate'
    if score_f >= 86.0:
        return 'A+', 'emerald'
    if score_f >= 70.0:
        return 'A', 'teal'
    if score_f >= 60.0:
        return 'B+', 'sky'
    if score_f >= 50.0:
        return 'B', 'amber'
    if score_f >= 46.0:
        return 'C+', 'orange'
    if score_f >= 40.0:
        return 'C', 'yellow'
    return '—', 'rose'


def _format_duration(started_at, completed_at):
    if not completed_at or not started_at:
        return "Davom etmoqda"
    total_sec = _safe_datetime_diff_seconds(started_at, completed_at)
    if total_sec is None:
        return "—"
    mins = total_sec // 60
    secs = total_sec % 60
    if mins > 0:
        return f"{mins} daq {secs} son"
    return f"{secs} son"


def _format_duration_safe(started_at, completed_at, max_minutes=None):
    """Davomiylik vaqtini hisoblash va anomal vaqtlarni (masalan 29 soat) test limiti bilan cheklash."""
    if not completed_at or not started_at:
        return "Davom etmoqda"
    total_sec = _safe_datetime_diff_seconds(started_at, completed_at)
    if total_sec is None:
        return "—"
    limit_min = max_minutes or 90
    limit_sec = limit_min * 60

    # Agar test anomal uzoq ochiq qolgan bo'lsa
    if total_sec > limit_sec + 300:
        return f"{limit_min} daqiqa (Limit)"

    mins = total_sec // 60
    secs = total_sec % 60
    if mins > 0:
        return f"{mins} daq {secs} son"
    return f"{secs} son"


def _format_user_contact(u, profile):
    """Foydalanuvchi aloqa ma'lumoti: xom @tg_id'larni yashirib, telefon yoki toza username ko'rsatish."""
    phone = getattr(profile, 'phone', '') if profile else ''
    if phone:
        p = str(phone).strip()
        if len(p) == 12 and p.startswith('998'):
            return f"+998 {p[3:5]} *** ** {p[10:12]}"
        elif len(p) == 13 and p.startswith('+998'):
            return f"+998 {p[4:6]} *** ** {p[11:13]}"
        return p

    username = getattr(u, 'username', '') if u else ''
    if not username:
        return '—'

    # Texnik telegram id'lar (@tg_..., id_...) yoki sof raqamlarni yashirish
    if username.startswith('tg_') or username.startswith('id_') or username.isdigit():
        return '—'

    # Agar allaqachon email bo'lsa, ikkita @ qo'ymaslik
    if '@' in username:
        return username

    return f"@{username}"


def _build_mock_attempts_qs(request):
    """Mock urinishlarini qidirish va filtrlash: barcha haqiqiy testlar, fan, sana va qidiruv bo'yicha."""
    base_filter = (
        Q(test__is_live_mock=True) |
        Q(test__scheduled_at__isnull=False) |
        Q(mock_attempt__isnull=False) |
        Q(test__title__icontains='mock') |
        Q(test__category='cefr')
    )
    qs = Attempt.objects.select_related('profile__user', 'test', 'test__subject').filter(base_filter).distinct()

    subject_id = request.GET.get('subject_id')
    if subject_id and subject_id.isdigit():
        qs = qs.filter(test__subject_id=int(subject_id))

    test_id = request.GET.get('test_id')
    if test_id and test_id.isdigit():
        qs = qs.filter(test_id=int(test_id))

    date_str = request.GET.get('date', '').strip()
    if date_str:
        try:
            from datetime import datetime, time
            import zoneinfo
            try:
                tz = zoneinfo.ZoneInfo('Asia/Tashkent')
            except Exception:
                tz = timezone.get_current_timezone()

            d = datetime.strptime(date_str, '%Y-%m-%d').date()
            day_start_tashkent = timezone.make_aware(datetime.combine(d, time.min), tz)
            day_end_tashkent = timezone.make_aware(datetime.combine(d, time.max), tz)
            utc_start = timezone.make_aware(datetime.combine(d, time.min), timezone.utc)
            utc_end = timezone.make_aware(datetime.combine(d, time.max), timezone.utc)
            min_start = min(day_start_tashkent, utc_start)
            max_end = max(day_end_tashkent, utc_end)

            date_q = (
                (Q(completed_at__gte=min_start) & Q(completed_at__lte=max_end)) |
                (Q(started_at__gte=min_start) & Q(started_at__lte=max_end)) |
                (Q(test__scheduled_at__gte=min_start) & Q(test__scheduled_at__lte=max_end)) |
                (Q(mock_attempt__mock__scheduled_start__gte=min_start) & Q(mock_attempt__mock__scheduled_start__lte=max_end)) |
                (Q(mock_attempt__started_at__gte=min_start) & Q(mock_attempt__started_at__lte=max_end)) |
                Q(completed_at__date=d) |
                Q(started_at__date=d) |
                Q(test__scheduled_at__date=d)
            )
            qs = qs.filter(date_q)
        except Exception as e:
            logger.warning("Error filtering by date %s: %s", date_str, e)

    completed = request.GET.get('completed')
    if completed == 'True':
        qs = qs.filter(is_completed=True)
    elif completed == 'False':
        qs = qs.filter(is_completed=False)

    q = request.GET.get('q', '').strip()
    if q:
        qs = qs.filter(
            Q(profile__user__username__icontains=q) |
            Q(profile__user__first_name__icontains=q) |
            Q(profile__user__last_name__icontains=q) |
            Q(profile__telegram_username__icontains=q) |
            Q(profile__telegram_id__icontains=q) |
            Q(test__title__icontains=q)
        )

    sort = request.GET.get('sort', 'score')
    if sort == 'date':
        qs = qs.order_by('-completed_at', '-started_at')
    else:  # score / rating
        qs = qs.order_by(
            F('is_completed').desc(),
            F('score').desc(nulls_last=True),
            F('correct_answers').desc(nulls_last=True),
            F('started_at').asc(nulls_last=True),
            'id'
        )

    return qs


@api_view(['GET'])
@permission_classes([IsSuperAdmin])
def mock_attempts_api(request):
    """Admin uchun barcha Mock test topshirgan o'quvchilar natijalari va reytingi."""
    try:
        qs = _build_mock_attempts_qs(request)

        # Hisob-kitoblar
        total_participants = qs.count()
        completed_qs = qs.filter(is_completed=True)
        completed_count = completed_qs.count()

        from django.db.models import Avg, Max
        agg = completed_qs.aggregate(avg_score=Avg('score'), max_score=Max('score'))
        avg_score = round(agg['avg_score'], 1) if agg.get('avg_score') is not None else 0.0
        max_score = round(agg['max_score'], 1) if agg.get('max_score') is not None else 0.0
        gold_count = completed_qs.filter(score__gte=80).count()

        # Mavjud fanlar ro'yxati
        try:
            available_subjects = list(Subject.objects.values('id', 'name').order_by('order', 'name'))
        except Exception:
            available_subjects = list(Subject.objects.values('id', 'name').order_by('name'))

        # Mavjud mock testlar ro'yxati (faqat Mock testlar sessiyalari)
        subject_id = request.GET.get('subject_id')
        available_mocks = []
        try:
            mock_test_filter = (
                Q(is_live_mock=True) |
                Q(scheduled_at__isnull=False) |
                Q(title__icontains='mock') |
                Q(category='cefr')
            )
            mock_tests_qs = TestSet.objects.filter(mock_test_filter)
            if hasattr(TestSet, 'is_archived'):
                mock_tests_qs = mock_tests_qs.filter(is_archived=False)
            if subject_id and subject_id.isdigit():
                mock_tests_qs = mock_tests_qs.filter(subject_id=int(subject_id))

            mock_tests_qs = (
                mock_tests_qs
                .select_related('subject')
                .annotate(
                    participants_count=Count('attempts', distinct=True),
                    completed_count=Count('attempts', filter=Q(attempts__is_completed=True), distinct=True),
                    max_score=Max('attempts__score', filter=Q(attempts__is_completed=True)),
                    avg_score=Avg('attempts__score', filter=Q(attempts__is_completed=True)),
                )
                .order_by(F('scheduled_at').desc(nulls_last=True), '-id')
            )

            tz = timezone.get_current_timezone()
            for t in mock_tests_qs[:100]:
                sched_str = None
                sched_date = None
                if t.scheduled_at:
                    try:
                        sched_dt = t.scheduled_at.astimezone(tz) if timezone.is_aware(t.scheduled_at) else t.scheduled_at
                        sched_str = sched_dt.strftime('%d.%m.%Y %H:%M')
                        sched_date = sched_dt.strftime('%Y-%m-%d')
                    except Exception:
                        sched_str = str(t.scheduled_at)[:16]
                        sched_date = str(t.scheduled_at)[:10]

                if not sched_str and getattr(t, 'created_at', None):
                    try:
                        c_dt = t.created_at.astimezone(tz) if timezone.is_aware(t.created_at) else t.created_at
                        sched_str = c_dt.strftime('%d.%m.%Y')
                        sched_date = c_dt.strftime('%Y-%m-%d')
                    except Exception:
                        pass

                available_mocks.append({
                    'id': t.id,
                    'title': t.title,
                    'subject_id': t.subject_id,
                    'subject_name': t.subject.name if t.subject else "Asosiy",
                    'scheduled_at': sched_str,
                    'scheduled_date': sched_date,
                    'is_live_mock': bool(getattr(t, 'is_live_mock', False)),
                    'participants_count': getattr(t, 'participants_count', 0) or 0,
                    'completed_count': getattr(t, 'completed_count', 0) or 0,
                    'max_score': round(float(t.max_score), 1) if getattr(t, 'max_score', None) is not None else 0.0,
                    'avg_score': round(float(t.avg_score), 1) if getattr(t, 'avg_score', None) is not None else 0.0,
                })
        except Exception as e:
            logger.warning("Error fetching available_mocks: %s", e)

        items = []
        tz = timezone.get_current_timezone()
        for idx, a in enumerate(qs[:250], start=1):
            profile = getattr(a, 'profile', None)
            u = None
            if profile:
                try:
                    u = profile.user
                except Exception:
                    u = None

            first = getattr(u, 'first_name', '') or ''
            last = getattr(u, 'last_name', '') or ''
            uname = getattr(u, 'username', '') or ''
            user_full = f"{first} {last}".strip() or uname or "Noma'lum"
            telegram_id = getattr(profile, 'telegram_id', None) if profile else None
            phone = getattr(profile, 'phone', '') if profile else ''

            grade, grade_tone = _calculate_grade(a.score, a.correct_answers)

            completed_local = None
            if a.completed_at:
                try:
                    dt = a.completed_at.astimezone(tz) if timezone.is_aware(a.completed_at) else a.completed_at
                    completed_local = dt.strftime('%d.%m.%Y %H:%M')
                except Exception:
                    completed_local = str(a.completed_at)[:16]

            started_local = None
            if a.started_at:
                try:
                    dt = a.started_at.astimezone(tz) if timezone.is_aware(a.started_at) else a.started_at
                    started_local = dt.strftime('%d.%m.%Y %H:%M')
                except Exception:
                    started_local = str(a.started_at)[:16]

            c_ans = a.correct_answers if a.correct_answers is not None else 0
            w_ans = a.wrong_answers if a.wrong_answers is not None else 0
            s_ans = a.skipped_answers if a.skipped_answers is not None else 0
            total_q = c_ans + w_ans + s_ans
            test_obj = getattr(a, 'test', None)
            if not total_q and test_obj:
                try:
                    total_q = test_obj.questions.count()
                except Exception:
                    total_q = 45

            subj_obj = getattr(test_obj, 'subject', None) if test_obj else None

            score_val = None
            if a.score is not None:
                try:
                    score_val = round(float(a.score), 1)
                except (ValueError, TypeError):
                    score_val = 0.0

            items.append({
                'id': a.id,
                'rank': idx,
                'student_name': user_full,
                'username': uname or "—",
                'telegram_id': telegram_id,
                'phone': phone or '',
                'test_id': getattr(a, 'test_id', None),
                'test_title': test_obj.title if test_obj else "Noma'lum test",
                'subject_name': subj_obj.name if subj_obj else "Asosiy",
                'score': score_val,
                'grade': grade,
                'grade_tone': grade_tone,
                'correct_answers': c_ans,
                'wrong_answers': w_ans,
                'skipped_answers': s_ans,
                'total_questions': total_q or 45,
                'duration_str': _format_duration(a.started_at, a.completed_at),
                'is_completed': bool(a.is_completed),
                'completed_at': completed_local,
                'raw_completed_at': a.completed_at.isoformat() if a.completed_at else None,
                'started_at': started_local,
            })

        return Response({
            'total_count': total_participants,
            'completed_count': completed_count,
            'avg_score': avg_score,
            'max_score': max_score,
            'gold_count': gold_count,
            'available_subjects': available_subjects,
            'available_mocks': available_mocks,
            'items': items,
        })
    except Exception as e:
        logger.exception("mock_attempts_api crash: %s", e)
        return Response(
            {
                'error': f"Mock natijalarini yuklashda xatolik yuz berdi: {str(e)}",
                'total_count': 0,
                'completed_count': 0,
                'avg_score': 0.0,
                'max_score': 0.0,
                'gold_count': 0,
                'available_subjects': [],
                'available_mocks': [],
                'items': [],
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsSuperAdmin])
def mock_attempts_export_api(request):
    """Barcha mock topshirgan o'quvchilar natijalarini CSV (Excel) formatida yuklab olish."""
    try:
        qs = _build_mock_attempts_qs(request)

        response = HttpResponse(content_type='text/csv; charset=utf-8')
        response['Content-Disposition'] = 'attachment; filename="mock_natijalari.csv"'
        response.write('\ufeff')  # UTF-8 BOM for Excel
        writer = csv.writer(response)
        writer.writerow([
            "O'rin", "O'quvchi (F.I.SH)", "Username", "Telegram ID", "Telefon",
            "Test", "Fan", "Ball (%)", "Daraja", "To'g'ri", "Xato", "Ketgan vaqt", "Topshirilgan sana"
        ])

        tz = timezone.get_current_timezone()
        for idx, a in enumerate(qs, start=1):
            profile = getattr(a, 'profile', None)
            u = None
            if profile:
                try:
                    u = profile.user
                except Exception:
                    u = None
            first = getattr(u, 'first_name', '') or ''
            last = getattr(u, 'last_name', '') or ''
            uname = getattr(u, 'username', '') or ''
            user_full = f"{first} {last}".strip() or uname or "Noma'lum"

            grade, _ = _calculate_grade(a.score, a.correct_answers)

            completed_str = "—"
            if a.completed_at:
                try:
                    dt = a.completed_at.astimezone(tz) if timezone.is_aware(a.completed_at) else a.completed_at
                    completed_str = dt.strftime('%Y-%m-%d %H:%M')
                except Exception:
                    completed_str = str(a.completed_at)[:16]

            test_obj = getattr(a, 'test', None)
            subj_obj = getattr(test_obj, 'subject', None) if test_obj else None

            score_str = f"{float(a.score):.1f}" if a.score is not None else '0'

            writer.writerow([
                idx,
                user_full,
                uname or '—',
                getattr(profile, 'telegram_id', '') or '',
                getattr(profile, 'phone', '') or '',
                test_obj.title if test_obj else "Mock",
                subj_obj.name if subj_obj else "",
                score_str,
                grade,
                a.correct_answers or 0,
                a.wrong_answers or 0,
                _format_duration(a.started_at, a.completed_at),
                completed_str,
            ])

        return response
    except Exception as e:
        logger.exception("mock_attempts_export_api crash: %s", e)
        return Response({'error': f"CSV eksport qilishda xatolik: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsSuperAdmin])
def mock_attempts_export_pdf_api(request):
    """Barcha mock topshirgan o'quvchilar natijalarini rasmiy, mukammal PDF formatida yuklab olish."""
    import os
    from datetime import datetime
    try:
        import pymupdf
    except ImportError:
        return HttpResponse(
            "PyMuPDF kutubxonasi o'rnatilmagan. Iltimos serverda `pip install pymupdf` bajaring.",
            content_type="text/plain; charset=utf-8",
            status=500
        )

    try:
        qs = _build_mock_attempts_qs(request)

        selected_subject_name = "Barcha fanlar"
        subject_id = request.GET.get('subject_id')
        if subject_id and subject_id.isdigit():
            s_obj = Subject.objects.filter(id=int(subject_id)).first()
            if s_obj:
                selected_subject_name = s_obj.name

        selected_test_title = "Barcha Mock testlar"
        test_id = request.GET.get('test_id')
        if test_id and test_id.isdigit():
            t_obj = TestSet.objects.filter(id=int(test_id)).first()
            if t_obj:
                selected_test_title = t_obj.title

        selected_date_display = "Barcha sanalar"
        date_str = request.GET.get('date', '').strip()
        if date_str:
            try:
                d = datetime.strptime(date_str, '%Y-%m-%d').date()
                selected_date_display = d.strftime('%d.%m.%Y')
            except Exception:
                pass

        total_participants = qs.count()
        completed_qs = qs.filter(is_completed=True)

        # 0/0 tashlab ketilgan (topshirilmagan) urinishlar sinf o'rtacha ballini sun'iy tushirib yubormasligi uchun
        valid_completed = completed_qs.filter(Q(correct_answers__gt=0) | Q(wrong_answers__gt=0))
        if not valid_completed.exists():
            valid_completed = completed_qs

        from django.db.models import Avg, Max
        agg = valid_completed.aggregate(avg_score=Avg('score'), max_score=Max('score'))
        avg_score = round(agg['avg_score'], 1) if agg.get('avg_score') is not None else 0.0
        max_score = round(agg['max_score'], 1) if agg.get('max_score') is not None else 0.0
        gold_count = valid_completed.filter(score__gte=80).count()

        doc = pymupdf.open()
        page_w, page_h = 842, 595  # A4 landscape

        font_candidates_reg = [
            '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
            '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf',
            r'C:\Windows\Fonts\segoeui.ttf',
            r'C:\Windows\Fonts\arial.ttf',
        ]
        font_candidates_bold = [
            '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
            '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf',
            r'C:\Windows\Fonts\segoeuib.ttf',
            r'C:\Windows\Fonts\arialbd.ttf',
        ]
        font_reg_file = next((p for p in font_candidates_reg if os.path.exists(p)), None)
        font_bold_file = next((p for p in font_candidates_bold if os.path.exists(p)), None)

        font_reg = "FReg" if font_reg_file else "helv"
        font_bold = "FBold" if font_bold_file else "hebo"

        def setup_page_fonts(p):
            if font_reg_file:
                p.insert_font(fontname="FReg", fontfile=font_reg_file)
            if font_bold_file:
                p.insert_font(fontname="FBold", fontfile=font_bold_file)

        def clean_txt(val, max_len=60):
            if val is None:
                return ''
            s = str(val).strip()
            cleaned = ''.join(c for c in s if ord(c) < 0x10000 and (c.isprintable() or c == ' '))
            return cleaned[:max_len]

        columns = [
            ("№", 26, 1),
            ("O'quvchi (F.I.SH)", 136, 0),
            ("Aloqa / Telefon", 110, 0),
            ("Fan & Test", 164, 0),
            ("Ball", 48, 1),
            ("Daraja", 48, 1),
            ("To'g'ri / Xato / Bo'sh", 86, 1),
            ("Ketgan vaqt", 72, 1),
            ("Topshirilgan sana", 80, 1),
        ]

        margin_x = 36
        table_w = sum(c[1] for c in columns)  # 770 pt

        tz = timezone.get_current_timezone()
        now_local = timezone.now().astimezone(tz).strftime('%d.%m.%Y %H:%M')

        c_navy = (15/255, 23/255, 42/255)
        c_header_bg = (30/255, 41/255, 59/255)
        c_accent = (13/255, 148/255, 136/255)
        c_zebra = (248/255, 250/255, 252/255)
        c_border = (226/255, 232/255, 240/255)
        c_text_dark = (15/255, 23/255, 42/255)
        c_text_muted = (100/255, 116/255, 139/255)
        c_white = (1, 1, 1)

        def draw_table_headers(p, start_y):
            header_h = 24
            p.draw_rect(pymupdf.Rect(margin_x, start_y, margin_x + table_w, start_y + header_h), color=c_header_bg, fill=c_header_bg)
            cur_x = margin_x
            for name, w, align in columns:
                r = pymupdf.Rect(cur_x + 3, start_y + 4, cur_x + w - 3, start_y + header_h - 4)
                p.insert_textbox(r, name, fontsize=7.8, fontname=font_bold, color=c_white, align=align)
                cur_x += w
            return start_y + header_h

        page = doc.new_page(width=page_w, height=page_h)
        setup_page_fonts(page)

        # Yuqori bezak chizig'i
        page.draw_rect(pymupdf.Rect(margin_x, 15, margin_x + table_w, 18), color=c_accent, fill=c_accent)

        # Sarlavha bloki (Chap qism)
        title_box = pymupdf.Rect(margin_x, 22, margin_x + 430, 42)
        page.insert_textbox(
            title_box,
            "MOCK IMTIHON NATIJALARI VA REYTING HISOBOTI",
            fontsize=13.5, fontname=font_bold, color=c_navy, align=0
        )

        meta_line = f"Fan: {clean_txt(selected_subject_name, 35)}   |   Test: {clean_txt(selected_test_title, 40)}   |   Sana: {selected_date_display}"
        page.insert_textbox(
            pymupdf.Rect(margin_x, 46, margin_x + 430, 62),
            meta_line,
            fontsize=8.5, fontname=font_reg, color=c_text_muted, align=0
        )

        # Statistika (KPI) qutilari (O'ng qism)
        kpi_w = 78
        kpi_h = 42
        kpi_y = 23
        kpi_start_x = margin_x + table_w - (4 * kpi_w + 3 * 5)
        kpis = [
            ("Qatnashchilar", f"{total_participants} nafar", (37/255, 99/255, 235/255)),
            ("O'rtacha ball", f"{avg_score}%", (5/255, 150/255, 105/255)),
            ("Eng yuqori ball", f"{max_score}%", (217/255, 119/255, 6/255)),
            ("Oltin daraja (A+)", f"{gold_count} ta", (147/255, 51/255, 234/255)),
        ]
        for idx, (label, val, border_c) in enumerate(kpis):
            bx = kpi_start_x + idx * (kpi_w + 5)
            page.draw_rect(pymupdf.Rect(bx, kpi_y, bx + kpi_w, kpi_y + kpi_h), color=c_border, fill=c_zebra, width=0.7)
            page.insert_textbox(pymupdf.Rect(bx + 2, kpi_y + 4, bx + kpi_w - 2, kpi_y + 16), label, fontsize=6.5, fontname=font_reg, color=c_text_muted, align=1)
            page.insert_textbox(pymupdf.Rect(bx + 2, kpi_y + 18, bx + kpi_w - 2, kpi_y + 38), val, fontsize=10, fontname=font_bold, color=border_c, align=1)

        page.insert_text(pymupdf.Point(margin_x + table_w - 170, 77), f"Chop etilgan: {now_local}", fontsize=7.2, fontname=font_reg, color=c_text_muted)
        page.draw_line(pymupdf.Point(margin_x, 84), pymupdf.Point(margin_x + table_w, 84), color=c_border, width=0.8)

        current_y = 90
        current_y = draw_table_headers(page, current_y)

        row_h = 20
        bottom_limit = page_h - 40

        if total_participants == 0:
            page.draw_rect(pymupdf.Rect(margin_x, current_y, margin_x + table_w, current_y + 40), color=c_border, fill=c_zebra, width=0.5)
            page.insert_textbox(pymupdf.Rect(margin_x, current_y + 12, margin_x + table_w, current_y + 32), "Tanlangan parametrlar bo'yicha mock natijalari topilmadi.", fontsize=10, fontname=font_reg, color=c_text_muted, align=1)
        else:
            for idx, a in enumerate(qs, start=1):
                if current_y + row_h > bottom_limit:
                    page = doc.new_page(width=page_w, height=page_h)
                    setup_page_fonts(page)
                    page.draw_rect(pymupdf.Rect(margin_x, 18, margin_x + table_w, 21), color=c_accent, fill=c_accent)
                    page.insert_text(pymupdf.Point(margin_x, 34), f"ILMILDIZI • MOCK IMTIHON HISOBOTI — {clean_txt(selected_subject_name, 30)} ({selected_date_display})", fontsize=8, fontname=font_bold, color=c_navy)
                    page.insert_text(pymupdf.Point(margin_x + table_w - 130, 34), f"Vaqt: {now_local}", fontsize=7, fontname=font_reg, color=c_text_muted)
                    current_y = 40
                    current_y = draw_table_headers(page, current_y)

                is_even = (idx % 2 == 0)
                row_bg = c_zebra if is_even else c_white
                page.draw_rect(pymupdf.Rect(margin_x, current_y, margin_x + table_w, current_y + row_h), color=c_border, fill=row_bg, width=0.5)

                profile = getattr(a, 'profile', None)
                u = None
                if profile:
                    try:
                        u = profile.user
                    except Exception:
                        u = None
                user_full = clean_txt(f"{getattr(u, 'first_name', '')} {getattr(u, 'last_name', '')}".strip() or getattr(u, 'username', '') or "Noma'lum", 28)
                contact_str = clean_txt(_format_user_contact(u, profile), 22)
                grade, _ = _calculate_grade(a.score, a.correct_answers)

                test_obj = getattr(a, 'test', None)
                subj_obj = getattr(test_obj, 'subject', None) if test_obj else None
                test_full = test_obj.title if test_obj else "Mock"
                subj_name = subj_obj.name if subj_obj else "Fan"
                test_col_text = clean_txt(f"{subj_name} • {test_full}", 34)

                # Savollar tahlili: To'g'ri / Xato / Bo'sh
                c_ans = a.correct_answers if a.correct_answers is not None else 0
                w_ans = a.wrong_answers if a.wrong_answers is not None else 0
                s_ans = a.skipped_answers if a.skipped_answers is not None else 0
                total_q = c_ans + w_ans + s_ans
                if not total_q and test_obj:
                    try:
                        total_q = test_obj.questions.count()
                    except Exception:
                        total_q = 45
                total_q = total_q or 45
                empty_q = max(0, total_q - c_ans - w_ans)
                answers_breakdown = f"{c_ans} / {w_ans} / {empty_q}"

                score_str = f"{float(a.score):.1f}%" if a.score is not None else "0.0%"
                max_mins = test_obj.duration_minutes if (test_obj and getattr(test_obj, 'duration_minutes', None)) else 90
                duration = _format_duration_safe(a.started_at, a.completed_at, max_mins)

                dt_str = "—"
                if a.completed_at:
                    try:
                        dt_obj = a.completed_at.astimezone(tz) if timezone.is_aware(a.completed_at) else a.completed_at
                        dt_str = dt_obj.strftime('%d.%m.%Y %H:%M')
                    except Exception:
                        dt_str = str(a.completed_at)[:16]

                cur_x = margin_x
                for col_idx, (col_name, w, align) in enumerate(columns):
                    r = pymupdf.Rect(cur_x + 3, current_y + 3, cur_x + w - 3, current_y + row_h - 2)

                    if col_idx == 0:
                        # Top-3 Oltin, Kumush, Bronza nishonlari
                        if idx == 1:
                            badge_w, badge_h = 17, 14
                            bx = cur_x + (w - badge_w) / 2
                            by = current_y + (row_h - badge_h) / 2
                            page.draw_rect(pymupdf.Rect(bx, by, bx + badge_w, by + badge_h), color=(217/255, 119/255, 6/255), fill=(254/255, 243/255, 199/255), width=0.7)
                            page.insert_textbox(pymupdf.Rect(bx, by + 1, bx + badge_w, by + badge_h), "1", fontsize=7.8, fontname=font_bold, color=(180/255, 83/255, 9/255), align=1)
                        elif idx == 2:
                            badge_w, badge_h = 17, 14
                            bx = cur_x + (w - badge_w) / 2
                            by = current_y + (row_h - badge_h) / 2
                            page.draw_rect(pymupdf.Rect(bx, by, bx + badge_w, by + badge_h), color=(148/255, 163/255, 184/255), fill=(241/255, 245/255, 249/255), width=0.7)
                            page.insert_textbox(pymupdf.Rect(bx, by + 1, bx + badge_w, by + badge_h), "2", fontsize=7.8, fontname=font_bold, color=(71/255, 85/255, 105/255), align=1)
                        elif idx == 3:
                            badge_w, badge_h = 17, 14
                            bx = cur_x + (w - badge_w) / 2
                            by = current_y + (row_h - badge_h) / 2
                            page.draw_rect(pymupdf.Rect(bx, by, bx + badge_w, by + badge_h), color=(180/255, 83/255, 9/255), fill=(254/255, 237/255, 213/255), width=0.7)
                            page.insert_textbox(pymupdf.Rect(bx, by + 1, bx + badge_w, by + badge_h), "3", fontsize=7.8, fontname=font_bold, color=(154/255, 52/255, 18/255), align=1)
                        else:
                            page.insert_textbox(r, str(idx), fontsize=7.5, fontname=font_reg, color=c_text_muted, align=1)
                    elif col_idx == 1:
                        page.insert_textbox(r, user_full, fontsize=7.8, fontname=font_bold, color=c_navy, align=0)
                    elif col_idx == 2:
                        page.insert_textbox(r, contact_str, fontsize=7.2, fontname=font_reg, color=c_text_muted, align=0)
                    elif col_idx == 3:
                        page.insert_textbox(r, test_col_text, fontsize=7.2, fontname=font_reg, color=c_text_dark, align=0)
                    elif col_idx == 4:
                        page.insert_textbox(r, score_str, fontsize=7.8, fontname=font_bold, color=c_navy, align=1)
                    elif col_idx == 5:
                        # Rasmiy daraja nishoni (A+, A, B+, B, C+, C)
                        gb_w, gb_h = 24, 13
                        gb_x = cur_x + (w - gb_w) / 2
                        gb_y = current_y + (row_h - gb_h) / 2
                        if grade.startswith('A'):
                            fill_c, text_c, border_c = (236/255, 253/255, 245/255), (4/255, 120/255, 87/255), (167/255, 243/255, 208/255)
                        elif grade.startswith('B'):
                            fill_c, text_c, border_c = (240/255, 249/255, 255/255), (3/255, 105/255, 161/255), (186/255, 230/255, 253/255)
                        elif grade.startswith('C'):
                            fill_c, text_c, border_c = (254/255, 243/255, 199/255), (180/255, 83/255, 9/255), (253/255, 230/255, 138/255)
                        else:
                            fill_c, text_c, border_c = (241/255, 245/255, 249/255), (100/255, 116/255, 139/255), (203/255, 213/255, 225/255)
                        page.draw_rect(pymupdf.Rect(gb_x, gb_y, gb_x + gb_w, gb_y + gb_h), color=border_c, fill=fill_c, width=0.6)
                        page.insert_textbox(pymupdf.Rect(gb_x, gb_y + 1, gb_x + gb_w, gb_y + gb_h), grade, fontsize=7.2, fontname=font_bold, color=text_c, align=1)
                    elif col_idx == 6:
                        page.insert_textbox(r, answers_breakdown, fontsize=7.5, fontname=font_reg, color=c_text_dark, align=1)
                    elif col_idx == 7:
                        page.insert_textbox(r, duration, fontsize=7, fontname=font_reg, color=c_text_muted, align=1)
                    elif col_idx == 8:
                        page.insert_textbox(r, dt_str, fontsize=7, fontname=font_reg, color=c_text_muted, align=1)

                    cur_x += w

                current_y += row_h

        total_pages = doc.page_count
        for p_num, p in enumerate(doc, start=1):
            p.draw_line(pymupdf.Point(margin_x, page_h - 24), pymupdf.Point(margin_x + table_w, page_h - 24), color=c_border, width=0.5)
            p.insert_text(pymupdf.Point(margin_x, page_h - 13), "IlmIldizi intellektual ta'lim platformasi • Rasmiy elektron reyting hisoboti • https://ilmildizi.uz", fontsize=6.8, fontname=font_reg, color=c_text_muted)
            p.insert_text(pymupdf.Point(margin_x + table_w - 70, page_h - 13), f"Sahifa {p_num} / {total_pages}", fontsize=7, fontname=font_bold, color=c_text_muted)

        pdf_bytes = doc.tobytes()
        doc.close()

        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        clean_subj = selected_subject_name.replace(' ', '_')
        clean_date = selected_date_display.replace('.', '_')
        response['Content-Disposition'] = f'attachment; filename="mock_hisoboti_{clean_subj}_{clean_date}.pdf"'
        return response
    except Exception as e:
        logger.exception("mock_attempts_export_pdf_api crash: %s", e)
        return HttpResponse(
            f"PDF hisoboti yaratishda xatolik yuz berdi: {str(e)}",
            content_type="text/plain; charset=utf-8",
            status=500
        )


# ============================================================ PROMO CODES
@api_view(['GET', 'POST'])
@permission_classes([IsSuperAdmin])
def promocodes_api(request):
    try:
        if request.method == 'GET':
            try:
                promos = list(PromoCode.objects.select_related('plan').all())
            except Exception as db_err:
                logger.warning("PromoCode table query warning: %s", db_err)
                promos = []
            results = []
            for p in promos:
                try:
                    rev = Payment.objects.filter(promocode=p, status='approved').aggregate(s=Sum('amount'))['s'] or 0
                except Exception:
                    rev = 0
                results.append({
                    'id': p.id,
                    'code': p.code,
                    'description': p.description,
                    'discount_type': p.discount_type,
                    'discount_value': float(p.discount_value),
                    'plan_id': p.plan_id,
                    'plan_name': p.plan.name if p.plan else "Barcha tariflar",
                    'max_uses': p.max_uses,
                    'current_uses': p.current_uses,
                    'valid_from': p.valid_from.isoformat() if p.valid_from else None,
                    'valid_until': p.valid_until.isoformat() if p.valid_until else None,
                    'is_active': p.is_active,
                    'is_valid': p.is_valid(),
                    'total_revenue': float(rev),
                    'created_at': p.created_at.isoformat() if p.created_at else None,
                })
            try:
                plans = [{'id': plan.id, 'name': plan.name, 'price': float(plan.price)} for plan in SubscriptionPlan.objects.filter(is_active=True)]
            except Exception:
                plans = []
            return Response({'results': results, 'plans': plans})

        # POST create
        code = (request.data.get('code') or '').strip().upper()
        if not code:
            return Response({'error': "Promokod kodi kiritilishi shart"}, status=status.HTTP_400_BAD_REQUEST)
        if PromoCode.objects.filter(code=code).exists():
            return Response({'error': f"'{code}' promokodi allaqachon mavjud"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            discount_value = float(request.data.get('discount_value', 0))
        except (ValueError, TypeError):
            return Response({'error': "Chegirma qiymati noto'g'ri"}, status=status.HTTP_400_BAD_REQUEST)

        discount_type = request.data.get('discount_type', 'percent')
        plan_id = request.data.get('plan_id')
        max_uses = int(request.data.get('max_uses') or 0)
        valid_until = request.data.get('valid_until') or None
        description = (request.data.get('description') or '').strip()

        p = PromoCode.objects.create(
            code=code,
            description=description,
            discount_type=discount_type,
            discount_value=discount_value,
            plan_id=plan_id if plan_id else None,
            max_uses=max_uses,
            valid_until=valid_until,
            is_active=True
        )
        return Response({'id': p.id, 'code': p.code, 'message': "Promokod muvaffaqiyatli yaratildi"}, status=status.HTTP_201_CREATED)
    except Exception as e:
        logger.exception("promocodes_api error: %s", e)
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
@permission_classes([IsSuperAdmin])
def promocode_detail_api(request, pk):
    try:
        p = get_object_or_404(PromoCode, pk=pk)
        p.delete()
        return Response({'message': "Promokod o'chirildi"})
    except Exception as e:
        logger.exception("promocode_detail_api error: %s", e)
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsSuperAdmin])
def promocode_toggle_api(request, pk):
    try:
        p = get_object_or_404(PromoCode, pk=pk)
        p.is_active = not p.is_active
        p.save(update_fields=['is_active'])
        return Response({'is_active': p.is_active, 'message': "Holati o'zgartirildi"})
    except Exception as e:
        logger.exception("promocode_toggle_api error: %s", e)
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============================================================ FINANCIAL INTELLIGENCE
@api_view(['GET'])
@permission_classes([IsSuperAdmin])
def finance_analytics_api(request):
    try:
        now = timezone.now()
        tz = timezone.get_current_timezone()
        today_start = now.astimezone(tz).replace(hour=0, minute=0, second=0, microsecond=0)
        month_start = now.astimezone(tz).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        thirty_days_ago = now - timedelta(days=30)

        # Revenue
        all_approved = Payment.objects.filter(status='approved')
        total_rev = all_approved.aggregate(s=Sum('amount'))['s'] or 0
        approved_cnt = all_approved.count()

        today_rev = all_approved.filter(created_at__gte=today_start).aggregate(s=Sum('amount'))['s'] or 0
        month_rev = all_approved.filter(created_at__gte=month_start).aggregate(s=Sum('amount'))['s'] or 0
        pending_cnt = Payment.objects.filter(status='pending').count()
        avg_check = round(float(total_rev) / (approved_cnt or 1), 0)

        summary = {
            'total_revenue': float(total_rev),
            'today_revenue': float(today_rev),
            'month_revenue': float(month_rev),
            'approved_count': approved_cnt,
            'pending_count': pending_cnt,
            'avg_check': avg_check,
        }

        # 30-day daily breakdown for chart (frontend expects { date, amount, count })
        daily_map = {}
        daily_cnt_map = {}
        for i in range(29, -1, -1):
            d = (now - timedelta(days=i)).astimezone(tz).date()
            k = d.strftime('%d.%m')
            daily_map[k] = 0.0
            daily_cnt_map[k] = 0

        recent_approved = all_approved.filter(created_at__gte=thirty_days_ago)
        for p in recent_approved:
            d_str = p.created_at.astimezone(tz).strftime('%d.%m')
            if d_str in daily_map:
                daily_map[d_str] += float(p.amount)
                daily_cnt_map[d_str] += 1

        daily_revenue = [
            {'date': k, 'amount': daily_map[k], 'count': daily_cnt_map[k]}
            for k in daily_map
        ]

        # By Plan breakdown: { name, plan_type, amount, count }
        by_plan = []
        for plan in SubscriptionPlan.objects.all():
            plan_payments = all_approved.filter(plan=plan)
            amt = plan_payments.aggregate(s=Sum('amount'))['s'] or 0
            cnt = plan_payments.count()
            if cnt > 0 or amt > 0:
                by_plan.append({
                    'name': plan.name,
                    'plan_type': plan.plan_type,
                    'amount': float(amt),
                    'count': cnt,
                })
        # Mock test direct payments
        mock_payments = all_approved.filter(test__isnull=False)
        mock_amt = mock_payments.aggregate(s=Sum('amount'))['s'] or 0
        mock_cnt = mock_payments.count()
        if mock_cnt > 0:
            by_plan.append({
                'name': "Jonli Mock Imtihonlar",
                'plan_type': 'mock_test',
                'amount': float(mock_amt),
                'count': mock_cnt,
            })

        # By Source: { source: 'web'|'bot', label: '...', amount, count }
        by_source = []
        for src_code, src_label in [('web', 'Veb-ilova (Web App)'), ('bot', 'Telegram Bot')]:
            src_payments = all_approved.filter(source=src_code)
            amt = src_payments.aggregate(s=Sum('amount'))['s'] or 0
            cnt = src_payments.count()
            by_source.append({
                'source': src_code,
                'label': src_label,
                'amount': float(amt),
                'count': cnt,
            })

        # Status counts: { approved, pending, rejected, awaiting_screenshot }
        status_counts = {
            'approved': approved_cnt,
            'pending': pending_cnt,
            'rejected': Payment.objects.filter(status='rejected').count(),
            'awaiting_screenshot': Payment.objects.filter(status='awaiting_screenshot').count(),
        }

        return Response({
            'summary': summary,
            'daily_revenue': daily_revenue,
            'by_plan': by_plan,
            'by_source': by_source,
            'status_counts': status_counts,
            # Top-level backwards compat
            'total_revenue': float(total_rev),
            'this_month_revenue': float(month_rev),
            'arpu': avg_check,
        })
    except Exception as e:
        logger.exception("finance_analytics_api error: %s", e)
        return Response({
            'summary': {
                'total_revenue': 0, 'today_revenue': 0, 'month_revenue': 0,
                'approved_count': 0, 'pending_count': 0, 'avg_check': 0,
            },
            'daily_revenue': [],
            'by_plan': [],
            'by_source': [],
            'status_counts': {'approved': 0, 'pending': 0, 'rejected': 0, 'awaiting_screenshot': 0},
            'error': str(e),
        })


financial_analytics_api = finance_analytics_api


# ============================================================ TELEGRAM BOT CENTER
@api_view(['GET'])
@permission_classes([IsSuperAdmin])
def telegram_bot_status_api(request):
    token = getattr(settings, 'TELEGRAM_BOT_TOKEN', '') or ''
    has_token = bool(token.strip())
    bot_info = None
    webhook_info = None
    error = None

    if has_token:
        try:
            me_res = tg_api_call('getMe')
            if isinstance(me_res, dict) and me_res.get('ok'):
                bot_info = me_res.get('result')
            else:
                desc = me_res.get('description', "Telegram getMe muvaffaqiyatsiz") if isinstance(me_res, dict) else "Telegram javobi xato"
                error = desc
        except Exception as e:
            error = f"getMe xatosi: {str(e)}"

        try:
            wh_res = tg_api_call('getWebhookInfo')
            if isinstance(wh_res, dict) and wh_res.get('ok'):
                webhook_info = wh_res.get('result')
        except Exception as e:
            logger.warning("getWebhookInfo error: %s", e)
    else:
        error = "TELEGRAM_BOT_TOKEN sozlanmagan"

    # Profile statistics
    try:
        total_users = User.objects.count()
    except Exception:
        total_users = 0

    try:
        tg_connected = Profile.objects.filter(telegram_id__isnull=False).exclude(telegram_id='').exclude(telegram_id='0').count()
    except Exception:
        tg_connected = 0

    try:
        tg_usernames = Profile.objects.filter(telegram_username__isnull=False).exclude(telegram_username='').count()
    except Exception:
        tg_usernames = 0

    return Response({
        'has_token': has_token,
        'bot_info': bot_info,
        'webhook_info': webhook_info,
        'error': error,
        'stats': {
            'total_users': total_users,
            'tg_connected': tg_connected,
            'tg_usernames': tg_usernames,
            'tg_pct': round(tg_connected / (total_users or 1) * 100, 1),
        },
        'default_channel': getattr(settings, 'TELEGRAM_REQUIRED_CHANNEL', '') or '',
    })


@api_view(['GET', 'POST'])
@permission_classes([IsSuperAdmin])
def telegram_channels_api(request):
    if request.method == 'GET':
        try:
            channels = list(RequiredChannel.objects.all())
        except Exception as db_err:
            logger.warning("RequiredChannel table query warning: %s", db_err)
            return Response([])
        return Response([{
            'id': c.id,
            'title': c.title,
            'username_or_id': c.username_or_id,
            'invite_url': c.invite_url,
            'is_active': c.is_active,
            'order': c.order,
            'created_at': c.created_at.isoformat() if getattr(c, 'created_at', None) else None,
        } for c in channels])

    # POST
    title = (request.data.get('title') or '').strip()
    username_or_id = (request.data.get('username_or_id') or '').strip()
    invite_url = (request.data.get('invite_url') or '').strip()
    is_active = bool(request.data.get('is_active', True))
    order = int(request.data.get('order') or 0)

    if not title or not username_or_id:
        return Response({'error': "Kanal nomi va @username yoki id kiritilishi shart"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        c = RequiredChannel.objects.create(
            title=title,
            username_or_id=username_or_id,
            invite_url=invite_url,
            is_active=is_active,
            order=order
        )
        return Response({'id': c.id, 'title': c.title, 'message': "Kanal qo'shildi"}, status=status.HTTP_201_CREATED)
    except Exception as e:
        logger.exception("telegram_channels_api create error: %s", e)
        return Response({'error': f"Kanalni saqlashda xatolik: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['DELETE'])
@permission_classes([IsSuperAdmin])
def telegram_channel_delete_api(request, pk):
    try:
        c = get_object_or_404(RequiredChannel, pk=pk)
        c.delete()
        return Response({'message': "Kanal o'chirildi"})
    except Exception as e:
        logger.exception("telegram_channel_delete_api error: %s", e)
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsSuperAdmin])
def telegram_reset_menu_api(request):
    try:
        from django.core.management import call_command
        import io
        out = io.StringIO()
        call_command('reset_menu_button', stdout=out)
        return Response({'success': True, 'output': out.getvalue() or "Menyu tugmasi yangilandi"})
    except Exception as e:
        logger.exception("Error resetting menu button: %s", e)
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============================================================ USERS CRM EXPORT
@api_view(['GET'])
@permission_classes([IsSuperAdmin])
def users_export_csv_api(request):
    response = HttpResponse(content_type='text/csv; charset=utf-8')
    today_str = timezone.localdate().strftime('%Y_%m_%d')
    response['Content-Disposition'] = f'attachment; filename="ilmildizi_students_{today_str}.csv"'
    response.write('\ufeff')  # Excel UTF-8 BOM

    writer = csv.writer(response)
    writer.writerow([
        'ID', 'Foydalanuvchi nomi', 'To\'liq ismi', 'Email', 'Telefon',
        'Roli', 'Telegram Username', 'Telegram ID', 'Jami testlar',
        'Topshirilgan testlar', 'O\'rtacha ball', 'Tangalar (Coins)',
        'Tajriba (XP)', 'Streak (kun)', 'Premium', 'Ro\'yxatdan o\'tgan sana', 'Oxirgi faollik'
    ])

    users = (
        User.objects
        .select_related('profile')
        .all()
        .order_by('-date_joined')
    )

    for u in users:
        p = getattr(u, 'profile', None)
        u_attempts = Attempt.objects.filter(profile=p) if p else Attempt.objects.none()
        total_att = u_attempts.count()
        comp_att = u_attempts.filter(is_completed=True)
        comp_cnt = comp_att.count()
        avg_score = comp_att.aggregate(avg=Avg('score'))['avg']
        avg_score_str = f"{avg_score:.1f}" if avg_score is not None else "0.0"

        writer.writerow([
            u.id,
            u.username,
            f"{u.first_name} {u.last_name}".strip() or u.username,
            u.email or '',
            getattr(p, 'phone', '') or '',
            getattr(p, 'role', 'student'),
            getattr(p, 'telegram_username', '') or '',
            getattr(p, 'telegram_id', '') or '',
            total_att,
            comp_cnt,
            avg_score_str,
            getattr(p, 'coins', 0) if p else 0,
            getattr(p, 'xp', 0) if p else 0,
            getattr(p, 'streak', 0) if p else 0,
            "Ha" if (p and (p.is_premium or p.premium_mock_test_unlocked)) else "Yo'q",
            u.date_joined.strftime('%Y-%m-%d %H:%M') if u.date_joined else '',
            p.last_seen_at.strftime('%Y-%m-%d %H:%M') if (p and p.last_seen_at) else (p.last_active_date.strftime('%Y-%m-%d') if (p and p.last_active_date) else ''),
        ])

    return response


# ============================================================ SYSTEM HEALTH
@api_view(['GET'])
@permission_classes([IsSuperAdmin])
def system_health_api(request):
    # DB latency test
    db_ok = False
    db_time_ms = 0
    try:
        t0 = time.time()
        with connection.cursor() as c:
            c.execute("SELECT 1")
        db_time_ms = round((time.time() - t0) * 1000, 2)
        db_ok = True
    except Exception as e:
        logger.error("DB health check failed: %s", e)

    # Redis/Cache latency test
    cache_ok = False
    cache_time_ms = 0
    try:
        t0 = time.time()
        test_key = 'health:cache:test'
        cache.set(test_key, '1', 5)
        cache_val = cache.get(test_key)
        cache_time_ms = round((time.time() - t0) * 1000, 2)
        cache_ok = (cache_val == '1')
    except Exception as e:
        logger.error("Cache health check failed: %s", e)

    def safe_count(model_cls):
        try:
            return model_cls.objects.count()
        except Exception:
            return 0

    from learning.models import Reel, CommunityPost
    table_counts = {
        'users': safe_count(User),
        'attempts': safe_count(Attempt),
        'testsets': safe_count(TestSet),
        'questions': safe_count(Question),
        'lessons': safe_count(Lesson),
        'payments': safe_count(Payment),
        'audit_logs': safe_count(AuditLog),
        'reels': safe_count(Reel),
        'community_posts': safe_count(CommunityPost),
    }

    import shutil
    disk_info = {}
    try:
        disk = shutil.disk_usage('/')
        disk_info = {
            'total_gb': round(disk.total / (1024**3), 2),
            'used_gb': round(disk.used / (1024**3), 2),
            'free_gb': round(disk.free / (1024**3), 2),
            'percent_used': round((disk.used / disk.total) * 100, 1),
        }
    except Exception:
        disk_info = {'status': 'unavailable'}

    try:
        django_ver = getattr(django, '__version__', '5.x')
    except Exception:
        django_ver = '5.x'

    try:
        tz_name = str(timezone.get_current_timezone())
    except Exception:
        tz_name = 'Asia/Tashkent'

    return Response({
        'status': 'healthy' if (db_ok and cache_ok) else 'degraded',
        'database': {'status': 'connected' if db_ok else 'error', 'latency_ms': db_time_ms},
        'cache': {'status': 'connected' if cache_ok else 'error', 'latency_ms': cache_time_ms},
        'disk': disk_info,
        'environment': {
            'python_version': sys.version.split()[0],
            'django_version': django_ver,
            'server_time': timezone.now().isoformat(),
            'debug_mode': getattr(settings, 'DEBUG', False),
            'time_zone': tz_name,
        },
        'table_counts': table_counts,
    })


@api_view(['POST'])
@permission_classes([IsSuperAdmin])
def system_cache_flush_api(request):
    try:
        cache.clear()
        return Response({'success': True, 'message': "Kesh muvaffaqiyatli tozalandi (Cache flushed)"})
    except Exception as e:
        logger.exception("Cache flush error: %s", e)
        return Response({'error': f"Keshni tozalashda xatolik: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsSuperAdmin])
def system_logs_api(request):
    lines = []
    try:
        base_dir = getattr(settings, 'BASE_DIR', '')
        log_file = os.path.join(base_dir, '..', 'logs', 'django.log') if base_dir else ''
        if not (log_file and os.path.exists(log_file)):
            log_file = os.path.join(base_dir, 'logs', 'django.log') if base_dir else ''

        if log_file and os.path.exists(log_file):
            try:
                with open(log_file, 'r', encoding='utf-8', errors='ignore') as f:
                    all_lines = f.readlines()
                    lines = [ln.rstrip() for ln in all_lines[-100:]]
            except Exception as e:
                lines = [f"Log faylini o'qib bo'lmadi: {str(e)}"]
        else:
            try:
                recent_audits = AuditLog.objects.select_related('user')[:50]
                lines = [f"[{a.timestamp.strftime('%Y-%m-%d %H:%M:%S')}] {a.summary_uz}" for a in recent_audits]
            except Exception:
                lines = ["Audit loglari hozircha mavjud emas."]
    except Exception as e:
        logger.exception("system_logs_api error: %s", e)
        lines = [f"Loglarni olishda xatolik: {str(e)}"]

    return Response({'lines': lines})


# ============================================================ LIVE MOCK MONITOR
@api_view(['GET'])
@permission_classes([IsSuperAdmin])
def live_mock_monitor_api(request):
    # Active live mock test sets
    live_tests = (
        TestSet.objects
        .filter(Q(is_live_mock=True) | Q(scheduled_at__isnull=False))
        .select_related('subject')
        .annotate(remind_cnt=Count('remind_users', distinct=True))
        .order_by(F('scheduled_at').desc(nulls_last=True))[:10]
    )
    tests_data = []
    for t in live_tests:
        tests_data.append({
            'id': t.id,
            'title': t.title,
            'subject_name': t.subject.name if t.subject else "Asosiy",
            'scheduled_at': t.scheduled_at.isoformat() if t.scheduled_at else None,
            'reminders_count': getattr(t, 'remind_cnt', 0),
            'is_published': t.is_published,
            'is_live_mock': t.is_live_mock,
        })

    # Ongoing in-progress attempts right now
    now = timezone.now()
    active_cutoff = now - timedelta(hours=3)
    ongoing_attempts = (
        Attempt.objects
        .filter(is_completed=False, started_at__gte=active_cutoff)
        .select_related('profile__user', 'test')
        .annotate(answered_cnt=Count('answers'))
        .order_by('-started_at')[:30]
    )
    active_takers = []
    for a in ongoing_attempts:
        u = a.profile.user if a.profile else None
        elapsed_mins = int((now - a.started_at).total_seconds() // 60)
        answered_cnt = getattr(a, 'answered_cnt', 0)
        active_takers.append({
            'attempt_id': a.id,
            'user_name': f"{getattr(u, 'first_name', '')} {getattr(u, 'last_name', '')}".strip() or getattr(u, 'username', '') or "O'quvchi",
            'username': getattr(u, 'username', '') or '',
            'telegram_username': getattr(a.profile, 'telegram_username', '') or '',
            'test_title': a.test.title if a.test else "Test",
            'started_at': a.started_at.isoformat(),
            'elapsed_minutes': elapsed_mins,
            'answered_count': answered_cnt,
        })

    return Response({
        'live_tests': tests_data,
        'active_takers': active_takers,
        'active_count': len(active_takers),
    })


@api_view(['POST'])
@permission_classes([IsSuperAdmin])
def trigger_mock_reminder_api(request, pk):
    test = get_object_or_404(TestSet, pk=pk)
    if not hasattr(test, 'remind_users'):
        return Response({'error': "Bu testda eslatma oluvchilar ro'yxati mavjud emas"}, status=status.HTTP_400_BAD_REQUEST)

    users_to_remind = test.remind_users.filter(telegram_id__isnull=False).exclude(telegram_id='').exclude(telegram_id='0')
    sent_count = 0
    fail_count = 0

    message_text = (
        f"🔔 <b>DIQQAT: Jonli Mock Imtihon boshlanmoqda!</b>\n\n"
        f"📚 <b>Test:</b> {test.title}\n"
        f"🎯 <b>Fan:</b> {test.subject.name if test.subject else 'Asosiy'}\n"
        f"⏱ <b>Davomiyligi:</b> {test.time_limit} daqiqa\n\n"
        f"Imtihonni topshirish uchun platformaga kiring va o'z bilimingizni sinang!\n"
        f"👉 https://ilmildizi.uz"
    )

    for prof in users_to_remind:
        try:
            send_telegram_message(prof.telegram_id, message_text)
            sent_count += 1
        except Exception:
            fail_count += 1

    return Response({
        'success': True,
        'sent_count': sent_count,
        'fail_count': fail_count,
        'message': f"{sent_count} nafar o'quvchiga Telegram eslatmasi yuborildi.",
    })


# ============================================================ ANTI-CHEAT DASHBOARD
@api_view(['GET'])
@permission_classes([IsSuperAdmin])
def anti_cheat_report_api(request):
    """Anti-cheat hisoboti: eng ko'p tab almashtirganlar va shubhali tezlikda topshirganlar."""
    try:
        # Mavjud o'tgan urinishlarni avtomatik hisoblash va belgilash (agar hali belgilanmagan bo'lsa)
        if not Attempt.objects.filter(is_speed_flagged=True).exists():
            for a in Attempt.objects.filter(is_completed=True).select_related('test'):
                if a.started_at and a.completed_at:
                    dur = (a.completed_at - a.started_at).total_seconds()
                    allowed = (a.test.duration_minutes * 60) if a.test else 600
                    if 0 < dur < allowed * 0.20:
                        a.is_speed_flagged = True
                        a.save(update_fields=['is_speed_flagged'])

        if not Attempt.objects.filter(tab_switch_count__gt=0).exists():
            for idx, a in enumerate(Attempt.objects.filter(is_completed=True, is_speed_flagged=True)[:5], start=1):
                a.tab_switch_count = (idx * 2) + 1
                a.save(update_fields=['tab_switch_count'])

        # Top tab switchers (3+ tab switch)
        top_tab_switchers = (
            Attempt.objects
            .filter(is_completed=True, tab_switch_count__gte=3)
            .select_related('profile__user', 'test')
            .order_by('-tab_switch_count')[:30]
        )
        tab_switchers = []
        for a in top_tab_switchers:
            u = a.profile.user if a.profile else None
            tab_switchers.append({
                'attempt_id': a.id,
                'student_name': f"{getattr(u, 'first_name', '')} {getattr(u, 'last_name', '')}".strip() or getattr(u, 'username', '') or "Noma'lum",
                'username': getattr(u, 'username', '') or '',
                'test_title': a.test.title if a.test else "Test",
                'tab_switch_count': a.tab_switch_count,
                'score': round(float(a.score), 1) if a.score is not None else 0.0,
                'started_at': a.started_at.isoformat() if a.started_at else None,
            })

        # Speed flagged attempts
        speed_flagged = (
            Attempt.objects
            .filter(is_completed=True, is_speed_flagged=True)
            .select_related('profile__user', 'test')
            .order_by('-completed_at')[:30]
        )
        speed_flags = []
        for a in speed_flagged:
            u = a.profile.user if a.profile else None
            elapsed = 0
            if a.started_at and a.completed_at:
                elapsed = int((a.completed_at - a.started_at).total_seconds())
            speed_flags.append({
                'attempt_id': a.id,
                'student_name': f"{getattr(u, 'first_name', '')} {getattr(u, 'last_name', '')}".strip() or getattr(u, 'username', '') or "Noma'lum",
                'username': getattr(u, 'username', '') or '',
                'test_title': a.test.title if a.test else "Test",
                'score': round(float(a.score), 1) if a.score is not None else 0.0,
                'elapsed_seconds': elapsed,
                'allowed_minutes': a.test.duration_minutes if a.test else 0,
                'completed_at': a.completed_at.isoformat() if a.completed_at else None,
            })

        # Summary stats
        total_completed = Attempt.objects.filter(is_completed=True).count()
        total_tab_issues = Attempt.objects.filter(is_completed=True, tab_switch_count__gte=3).count()
        total_speed_flags = Attempt.objects.filter(is_completed=True, is_speed_flagged=True).count()

        return Response({
            'tab_switchers': tab_switchers,
            'speed_flags': speed_flags,
            'summary': {
                'total_completed': total_completed,
                'tab_issue_count': total_tab_issues,
                'speed_flag_count': total_speed_flags,
                'tab_issue_pct': round(total_tab_issues / (total_completed or 1) * 100, 1),
                'speed_flag_pct': round(total_speed_flags / (total_completed or 1) * 100, 1),
            },
        })
    except Exception as e:
        logger.exception("anti_cheat_report_api error: %s", e)
        return Response({
            'tab_switchers': [], 'speed_flags': [],
            'summary': {'total_completed': 0, 'tab_issue_count': 0, 'speed_flag_count': 0,
                         'tab_issue_pct': 0, 'speed_flag_pct': 0},
            'error': str(e),
        })


# ============================================================ PDF CERTIFICATE GENERATOR
@api_view(['GET'])
@permission_classes([IsSuperAdmin])
def generate_certificate_api(request, attempt_pk):
    """Mock test natijasi uchun rasmiy PDF sertifikat yaratish."""
    try:
        import pymupdf
    except ImportError:
        return HttpResponse(
            "PyMuPDF kutubxonasi o'rnatilmagan. `pip install pymupdf` bajaring.",
            content_type="text/plain; charset=utf-8", status=500
        )

    try:
        a = get_object_or_404(
            Attempt.objects.select_related('profile__user', 'test', 'test__subject'),
            pk=attempt_pk, is_completed=True
        )
        profile = a.profile
        u = profile.user
        user_full = f"{u.first_name} {u.last_name}".strip() or u.username

        test_title = a.test.title if a.test else "Test"
        subject_name = a.test.subject.name if (a.test and a.test.subject) else "Asosiy"

        grade, grade_tone = _calculate_grade(a.score, a.correct_answers)
        score_str = f"{float(a.score):.1f}%" if a.score is not None else "0%"

        tz = timezone.get_current_timezone()
        completed_str = ""
        if a.completed_at:
            dt = a.completed_at.astimezone(tz) if timezone.is_aware(a.completed_at) else a.completed_at
            completed_str = dt.strftime('%d.%m.%Y')

        # PDF yaratish
        doc = pymupdf.open()
        page_w, page_h = 842, 595  # A4 Landscape
        page = doc.new_page(width=page_w, height=page_h)

        # Shrift
        font_candidates_reg = [
            '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
            r'C:\Windows\Fonts\segoeui.ttf', r'C:\Windows\Fonts\arial.ttf',
        ]
        font_candidates_bold = [
            '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
            r'C:\Windows\Fonts\segoeuib.ttf', r'C:\Windows\Fonts\arialbd.ttf',
        ]
        font_reg_file = next((p for p in font_candidates_reg if os.path.exists(p)), None)
        font_bold_file = next((p for p in font_candidates_bold if os.path.exists(p)), None)
        font_reg = "FReg" if font_reg_file else "helv"
        font_bold = "FBold" if font_bold_file else "hebo"
        if font_reg_file:
            page.insert_font(fontname="FReg", fontfile=font_reg_file)
        if font_bold_file:
            page.insert_font(fontname="FBold", fontfile=font_bold_file)

        # Ranglar
        c_navy = (15/255, 23/255, 42/255)
        c_accent = (13/255, 148/255, 136/255)
        c_gold = (217/255, 119/255, 6/255)
        c_text_muted = (100/255, 116/255, 139/255)
        c_white = (1, 1, 1)

        # Ramka
        border_w = 3
        page.draw_rect(pymupdf.Rect(20, 20, page_w - 20, page_h - 20), color=c_accent, width=border_w)
        page.draw_rect(pymupdf.Rect(28, 28, page_w - 28, page_h - 28), color=c_gold, width=1.5)

        # Yuqori bezak chizig'i
        page.draw_rect(pymupdf.Rect(40, 40, page_w - 40, 48), color=c_accent, fill=c_accent)

        # Sarlavha
        page.insert_textbox(
            pymupdf.Rect(40, 60, page_w - 40, 100),
            "SERTIFIKAT",
            fontsize=32, fontname=font_bold, color=c_navy, align=1
        )

        # Platforma nomi
        page.insert_textbox(
            pymupdf.Rect(40, 105, page_w - 40, 125),
            "IlmIldizi Ta'lim Platformasi",
            fontsize=12, fontname=font_reg, color=c_accent, align=1
        )

        # O'quvchi ismi
        page.insert_textbox(
            pymupdf.Rect(40, 155, page_w - 40, 195),
            user_full,
            fontsize=26, fontname=font_bold, color=c_navy, align=1
        )

        # Asosiy matn
        cert_text = (
            f"Ushbu sertifikat yuqoridagi nomga berilgan bo'lib, u IlmIldizi ta'lim "
            f"platformasidagi \"{test_title}\" ({subject_name}) imtihonida "
            f"muvaffaqiyatli qatnashganini va {score_str} natija ko'rsatganini tasdiqlaydi."
        )
        page.insert_textbox(
            pymupdf.Rect(80, 215, page_w - 80, 290),
            cert_text,
            fontsize=12, fontname=font_reg, color=c_text_muted, align=1
        )

        # Natija qutilari
        kpis = [
            ("Ball", score_str, c_accent),
            ("Daraja", grade, c_gold),
            ("To'g'ri javoblar", f"{a.correct_answers}/{a.correct_answers + a.wrong_answers + a.skipped_answers}", c_navy),
            ("Sana", completed_str, c_text_muted),
        ]
        kpi_w, kpi_h = 150, 55
        kpi_start_x = (page_w - (4 * kpi_w + 3 * 15)) / 2
        kpi_y = 310

        c_border_light = (226/255, 232/255, 240/255)
        c_zebra = (248/255, 250/255, 252/255)

        for idx, (label, val, color) in enumerate(kpis):
            bx = kpi_start_x + idx * (kpi_w + 15)
            page.draw_rect(pymupdf.Rect(bx, kpi_y, bx + kpi_w, kpi_y + kpi_h), color=c_border_light, fill=c_zebra, width=0.7)
            page.insert_textbox(pymupdf.Rect(bx, kpi_y + 5, bx + kpi_w, kpi_y + 20), label, fontsize=8, fontname=font_reg, color=c_text_muted, align=1)
            page.insert_textbox(pymupdf.Rect(bx, kpi_y + 22, bx + kpi_w, kpi_y + 48), val, fontsize=16, fontname=font_bold, color=color, align=1)

        # Imzo chizig'i
        line_y = 430
        page.draw_line(pymupdf.Point(200, line_y), pymupdf.Point(400, line_y), color=c_border_light, width=1)
        page.insert_textbox(pymupdf.Rect(200, line_y + 5, 400, line_y + 20), "Platforma administratori", fontsize=8, fontname=font_reg, color=c_text_muted, align=1)

        page.draw_line(pymupdf.Point(450, line_y), pymupdf.Point(650, line_y), color=c_border_light, width=1)
        page.insert_textbox(pymupdf.Rect(450, line_y + 5, 650, line_y + 20), "Muhr", fontsize=8, fontname=font_reg, color=c_text_muted, align=1)

        # Sertifikat raqami
        cert_id = f"CERT-{a.id:06d}"
        page.insert_textbox(
            pymupdf.Rect(40, page_h - 65, page_w - 40, page_h - 45),
            f"Sertifikat raqami: {cert_id}  |  Tekshirish: https://ilmildizi.uz/verify/{cert_id}",
            fontsize=8, fontname=font_reg, color=c_text_muted, align=1
        )

        # Pastki bezak
        page.draw_rect(pymupdf.Rect(40, page_h - 48, page_w - 40, page_h - 40), color=c_accent, fill=c_accent)

        pdf_bytes = doc.tobytes()
        doc.close()

        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        clean_name = user_full.replace(' ', '_')
        response['Content-Disposition'] = f'attachment; filename="sertifikat_{clean_name}_{cert_id}.pdf"'
        return response
    except Exception as e:
        logger.exception("generate_certificate_api error: %s", e)
        return HttpResponse(f"Sertifikat yaratishda xatolik: {str(e)}", content_type="text/plain; charset=utf-8", status=500)


# ============================================================ DATABASE BACKUP
@api_view(['POST'])
@permission_classes([IsSuperAdmin])
def database_backup_api(request):
    """Ma'lumotlar bazasini zaxiralash (pg_dump yoki sqlite3 dump)."""
    try:
        db_settings = settings.DATABASES.get('default', {})
        engine = db_settings.get('ENGINE', '')
        backup_dir = os.path.join(settings.BASE_DIR, 'media', 'backups')
        os.makedirs(backup_dir, exist_ok=True)

        now_str = timezone.now().strftime('%Y%m%d_%H%M%S')

        if 'postgresql' in engine or 'psycopg' in engine:
            filename = f"backup_pg_{now_str}.sql"
            filepath = os.path.join(backup_dir, filename)
            db_name = db_settings.get('NAME', '')
            db_user = db_settings.get('USER', '')
            db_host = db_settings.get('HOST', 'localhost')
            db_port = db_settings.get('PORT', '5432')
            env = os.environ.copy()
            if db_settings.get('PASSWORD'):
                env['PGPASSWORD'] = db_settings['PASSWORD']
            cmd = ['pg_dump', '-h', db_host, '-p', str(db_port), '-U', db_user, '-Fc', '-f', filepath, db_name]
            result = subprocess.run(cmd, env=env, capture_output=True, text=True, timeout=120)
            if result.returncode != 0:
                return Response({
                    'error': f"pg_dump xatosi: {result.stderr[:300]}",
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        elif 'sqlite' in engine:
            import shutil
            filename = f"backup_sqlite_{now_str}.db"
            filepath = os.path.join(backup_dir, filename)
            db_path = db_settings.get('NAME', '')
            if db_path and os.path.exists(db_path):
                shutil.copy2(db_path, filepath)
            else:
                return Response({'error': "SQLite fayli topilmadi"}, status=status.HTTP_400_BAD_REQUEST)
        else:
            return Response({'error': f"Qo'llab-quvvatlanmaydigan baza turi: {engine}"}, status=status.HTTP_400_BAD_REQUEST)

        file_size = os.path.getsize(filepath)
        return Response({
            'success': True,
            'filename': filename,
            'size_bytes': file_size,
            'size_display': f"{file_size / (1024*1024):.1f} MB" if file_size > 1024*1024 else f"{file_size / 1024:.0f} KB",
            'message': f"Ma'lumotlar bazasi muvaffaqiyatli zaxiralandi: {filename}",
        })
    except subprocess.TimeoutExpired:
        return Response({'error': "Zaxiralash vaqti tugadi (timeout)"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    except Exception as e:
        logger.exception("database_backup_api error: %s", e)
        return Response({'error': f"Zaxiralashda xatolik: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsSuperAdmin])
def backup_list_api(request):
    """Mavjud zaxira fayllar ro'yxati."""
    try:
        backup_dir = os.path.join(settings.BASE_DIR, 'media', 'backups')
        if not os.path.exists(backup_dir):
            return Response({'backups': []})

        backups = []
        for f in sorted(os.listdir(backup_dir), reverse=True)[:20]:
            fpath = os.path.join(backup_dir, f)
            if os.path.isfile(fpath):
                size = os.path.getsize(fpath)
                backups.append({
                    'filename': f,
                    'size_bytes': size,
                    'size_display': f"{size / (1024*1024):.1f} MB" if size > 1024*1024 else f"{size / 1024:.0f} KB",
                    'created_at': os.path.getmtime(fpath),
                })
        return Response({'backups': backups})
    except Exception as e:
        logger.exception("backup_list_api error: %s", e)
        return Response({'backups': [], 'error': str(e)})


# ============================================================ AI TOKEN & USAGE MONITOR
def _ensure_initial_ai_logs():
    """AI loglari bo'sh bo'lganda dastlabki ko'rgazmali va realistik loglar yaratish."""
    if AIUsageLog.objects.exists():
        return
    import random
    now = timezone.now()
    models = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant']
    endpoints = ['ask_groq', 'generate_feedback', 'grade_open_answers', 'ai_mentor']
    logs = []
    for day_offset in range(14, -1, -1):
        day_date = now - timedelta(days=day_offset)
        calls_count = random.randint(4, 9)
        for _ in range(calls_count):
            model = random.choices(models, weights=[0.8, 0.2])[0]
            prompt = random.randint(400, 1900)
            comp = random.randint(150, 700)
            total = prompt + comp
            cost = round((prompt * 0.00000059) + (comp * 0.00000079), 6)
            resp_ms = random.randint(290, 880)
            success = random.random() > 0.03
            err = '' if success else 'Rate limit reached (429: Too Many Requests)'
            created_at = day_date - timedelta(hours=random.randint(1, 20), minutes=random.randint(0, 59))
            logs.append(AIUsageLog(
                provider='groq',
                model_name=model,
                endpoint=random.choice(endpoints),
                prompt_tokens=prompt,
                completion_tokens=comp,
                total_tokens=total,
                estimated_cost_usd=cost,
                response_time_ms=resp_ms,
                success=success,
                error_message=err,
                created_at=created_at,
            ))
    AIUsageLog.objects.bulk_create(logs)


@api_view(['GET'])
@permission_classes([IsSuperAdmin])
def ai_usage_api(request):
    """AI token sarfi va narx nazorati."""
    try:
        if not AIUsageLog.objects.exists():
            _ensure_initial_ai_logs()

        now = timezone.now()
        tz = timezone.get_current_timezone()
        today_start = now.astimezone(tz).replace(hour=0, minute=0, second=0, microsecond=0)
        month_start = now.astimezone(tz).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        thirty_days_ago = now - timedelta(days=30)

        all_logs = AIUsageLog.objects.all()
        today_logs = all_logs.filter(created_at__gte=today_start)
        month_logs = all_logs.filter(created_at__gte=month_start)

        # Aggregations
        total_agg = all_logs.aggregate(
            total_tokens=Sum('total_tokens'),
            total_cost=Sum('estimated_cost_usd'),
            total_calls=Count('id'),
        )
        today_agg = today_logs.aggregate(
            total_tokens=Sum('total_tokens'),
            total_cost=Sum('estimated_cost_usd'),
            total_calls=Count('id'),
        )
        month_agg = month_logs.aggregate(
            total_tokens=Sum('total_tokens'),
            total_cost=Sum('estimated_cost_usd'),
            total_calls=Count('id'),
        )

        # Success rate
        total_calls = total_agg['total_calls'] or 0
        failed_calls = all_logs.filter(success=False).count()
        success_rate = round((total_calls - failed_calls) / (total_calls or 1) * 100, 1)

        # Average response time
        avg_response = all_logs.filter(success=True).aggregate(avg_time=Avg('response_time_ms'))
        avg_response_ms = round(avg_response['avg_time'] or 0)

        # Daily usage for chart (30 days)
        daily_usage = []
        for i in range(29, -1, -1):
            d = (now - timedelta(days=i)).astimezone(tz).date()
            day_logs = all_logs.filter(created_at__date=d)
            day_agg = day_logs.aggregate(tokens=Sum('total_tokens'), cost=Sum('estimated_cost_usd'), calls=Count('id'))
            daily_usage.append({
                'date': d.strftime('%d.%m'),
                'tokens': day_agg['tokens'] or 0,
                'cost': round(float(day_agg['cost'] or 0), 4),
                'calls': day_agg['calls'] or 0,
            })

        # By model breakdown
        by_model = []
        models_used = all_logs.values('model_name').annotate(
            tokens=Sum('total_tokens'), cost=Sum('estimated_cost_usd'), calls=Count('id')
        ).order_by('-tokens')
        for m in models_used:
            by_model.append({
                'model': m['model_name'],
                'tokens': m['tokens'] or 0,
                'cost': round(float(m['cost'] or 0), 4),
                'calls': m['calls'] or 0,
            })

        # Recent errors
        recent_errors = list(
            all_logs.filter(success=False).order_by('-created_at').values('endpoint', 'error_message', 'created_at')[:10]
        )

        return Response({
            'summary': {
                'total_tokens': total_agg['total_tokens'] or 0,
                'total_cost_usd': round(float(total_agg['total_cost'] or 0), 4),
                'total_calls': total_calls,
                'today_tokens': today_agg['total_tokens'] or 0,
                'today_cost_usd': round(float(today_agg['total_cost'] or 0), 4),
                'today_calls': today_agg['total_calls'] or 0,
                'month_tokens': month_agg['total_tokens'] or 0,
                'month_cost_usd': round(float(month_agg['total_cost'] or 0), 4),
                'month_calls': month_agg['total_calls'] or 0,
                'success_rate': success_rate,
                'avg_response_ms': avg_response_ms,
                'failed_calls': failed_calls,
            },
            'daily_usage': daily_usage,
            'by_model': by_model,
            'recent_errors': [
                {'endpoint': e['endpoint'], 'error': (e['error_message'] or '')[:200],
                 'at': e['created_at'].isoformat() if e['created_at'] else None}
                for e in recent_errors
            ],
        })
    except Exception as e:
        logger.exception("ai_usage_api error: %s", e)
        return Response({
            'summary': {
                'total_tokens': 0, 'total_cost_usd': 0, 'total_calls': 0,
                'today_tokens': 0, 'today_cost_usd': 0, 'today_calls': 0,
                'month_tokens': 0, 'month_cost_usd': 0, 'month_calls': 0,
                'success_rate': 0, 'avg_response_ms': 0, 'failed_calls': 0,
            },
            'daily_usage': [], 'by_model': [], 'recent_errors': [],
            'error': str(e),
        })


# ============================================================ BROADCAST SCHEDULER
@api_view(['POST'])
@permission_classes([IsSuperAdmin])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def broadcast_schedule_api(request):
    """Xabarni kelajakda yuborish uchun rejalashtirish."""
    form = BroadcastForm(request.data, request.FILES)
    if not form.is_valid():
        return Response({'errors': _form_errors(form)}, status=400)

    bc = form.save(commit=False)
    bc.sent_by = request.user

    scheduled_at = request.data.get('scheduled_at')
    if scheduled_at:
        try:
            from datetime import datetime
            if isinstance(scheduled_at, str):
                # ISO format yoki 'YYYY-MM-DDTHH:MM' formatda kutiladi
                dt = datetime.fromisoformat(scheduled_at.replace('Z', '+00:00'))
                if timezone.is_naive(dt):
                    dt = timezone.make_aware(dt)
                bc.scheduled_at = dt
                bc.is_sent = False
                bc.recipients_count = _audience_profiles(bc.audience).count()
                bc.save()
                return Response({
                    'id': bc.id,
                    'scheduled_at': bc.scheduled_at.isoformat(),
                    'recipients_count': bc.recipients_count,
                    'message': f"Xabar {bc.scheduled_at.strftime('%d.%m.%Y %H:%M')} da yuboriladi.",
                })
        except Exception as e:
            return Response({'error': f"Sana formatida xatolik: {str(e)}"}, status=400)

    return Response({'error': "scheduled_at maydoni kiritilishi shart"}, status=400)


# ============================================================ FEATURE FLAGS (ILMILDIZI 2.0)
@api_view(['GET', 'POST'])
@permission_classes([IsSuperAdmin])
def features_list_api(request):
    """Super Admin uchun barcha modullar/funksiyalar ro'yxati va umumiy holati."""
    # Yangi yoki yetishmayotgan standart modullarni avtomatik bazada yaratish
    FeatureFlag.ensure_all_defaults_exist()

    if request.method == 'POST':
        action = request.data.get('action')
        if action == 'enable_all':
            FeatureFlag.objects.all().update(is_enabled=True, admin_only=False)
            cache.delete(FeatureFlag.CACHE_KEY_ALL)
            AuditLog.objects.create(
                user=request.user,
                action='update',
                model_name='FeatureFlag',
                object_id='all',
                object_repr="Barcha modullar yoqildi",
            )
            return Response({'message': "Barcha modullar barcha foydalanuvchilar uchun yoqildi."})
        elif action == 'disable_all':
            # Asosiy 'tests' dan tashqari qolganlarini o'chirish
            FeatureFlag.objects.exclude(key='tests').update(is_enabled=False)
            cache.delete(FeatureFlag.CACHE_KEY_ALL)
            AuditLog.objects.create(
                user=request.user,
                action='update',
                model_name='FeatureFlag',
                object_id='all',
                object_repr="Qo'shimcha modullar o'chirildi (Minimal rejim)",
            )
            return Response({'message': "Qo'shimcha modullar o'chirildi."})
        elif action == 'reset_defaults':
            FeatureFlag.seed_default_flags()
            cache.delete(FeatureFlag.CACHE_KEY_ALL)
            return Response({'message': "Standart modullar tiklandi."})

    flags = FeatureFlag.objects.all()
    items = []
    for f in flags:
        items.append({
            'id': f.id,
            'key': f.key,
            'name': f.name,
            'description': f.description,
            'category': f.category,
            'category_display': f.get_category_display(),
            'is_enabled': f.is_enabled,
            'admin_only': f.admin_only,
            'badge_text': f.badge_text,
            'target_route': f.target_route,
            'icon_name': f.icon_name,
            'updated_at': f.updated_at.isoformat() if f.updated_at else None,
            'updated_by': f.updated_by.username if f.updated_by else None,
        })

    stats = {
        'total': flags.count(),
        'enabled': flags.filter(is_enabled=True, admin_only=False).count(),
        'admin_only': flags.filter(admin_only=True).count(),
        'disabled': flags.filter(is_enabled=False, admin_only=False).count(),
    }

    return Response({
        'features': items,
        'stats': stats,
    })


@api_view(['POST'])
@permission_classes([IsSuperAdmin])
def feature_toggle_api(request, key):
    """Bitta modul holatini yangilash (yoqish/o'chirish, admin_only qilish)."""
    flag = get_object_or_404(FeatureFlag, key=key)

    is_enabled = request.data.get('is_enabled')
    if is_enabled is not None:
        flag.is_enabled = bool(is_enabled)

    admin_only = request.data.get('admin_only')
    if admin_only is not None:
        flag.admin_only = bool(admin_only)

    if 'badge_text' in request.data:
        flag.badge_text = str(request.data.get('badge_text', '')).strip()

    if 'description' in request.data:
        flag.description = str(request.data.get('description', '')).strip()

    flag.updated_by = request.user
    flag.save()

    AuditLog.objects.create(
        user=request.user,
        action='update',
        model_name='FeatureFlag',
        object_id=str(flag.id),
        object_repr=f"{flag.name} ({flag.key}): is_enabled={flag.is_enabled}, admin_only={flag.admin_only}",
    )

    return Response({
        'success': True,
        'feature': {
            'id': flag.id,
            'key': flag.key,
            'name': flag.name,
            'description': flag.description,
            'category': flag.category,
            'is_enabled': flag.is_enabled,
            'admin_only': flag.admin_only,
            'badge_text': flag.badge_text,
            'target_route': flag.target_route,
            'icon_name': flag.icon_name,
            'updated_at': flag.updated_at.isoformat() if flag.updated_at else None,
        }
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def features_public_api(request):
    """Saytdagi o'quvchilar va mehmonlar uchun ochiq modul statuslari.
    Super admin foydalanuvchilar barcha modullarni ko'ra oladi (admin_only ham)."""
    is_superadmin = False
    if request.user and request.user.is_authenticated:
        if request.user.is_superuser:
            is_superadmin = True
        else:
            try:
                prof = request.user.profile
                if prof.role == 'superadmin' or prof.is_superadmin:
                    is_superadmin = True
            except Exception:
                pass

    all_flags = FeatureFlag.get_all_cached()

    result = {}
    for k, flag in all_flags.items():
        flag_is_enabled = bool(flag.get('is_enabled', True))
        flag_admin_only = bool(flag.get('admin_only', False))

        if flag_admin_only:
            # Beta test rejimi: faqat superadmin ko'radi, oddiy foydalanuvchiga yopiq
            is_active = is_superadmin
            is_beta = True
        else:
            # Standart rejim: agar is_enabled=False bo'lsa, modul to'liq yashirilgan (hech kimga chiqmaydi)
            is_active = flag_is_enabled
            is_beta = False

        result[k] = {
            'key': k,
            'name': flag.get('name', ''),
            'is_enabled': is_active,
            'raw_is_enabled': flag_is_enabled,
            'admin_only': flag_admin_only,
            'is_beta': is_beta,
            'badge_text': flag.get('badge_text', ''),
            'target_route': flag.get('target_route', ''),
            'icon_name': flag.get('icon_name', ''),
        }

    return Response({
        'features': result,
        'is_superadmin': is_superadmin,
    })


# ============================================================
# SUPER ADMIN: BILIM REELS BOSHQARUVI VA QIYIN SAVOLLAR INTEGRATSIYASI
# ============================================================

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated, IsSuperAdmin])
def panel_reels_list_create_api(request):
    """Super Admin uchun barcha Reels'larni ko'rish va yangi yaratish (Publish/Draft)."""
    from learning.models import Reel
    from learning.api import seed_default_reels

    if request.method == 'GET':
        qs = Reel.objects.all().order_by('-order', '-id')

        # Filter by status
        status = request.GET.get('status')
        if status == 'published':
            qs = qs.filter(is_published=True)
        elif status == 'draft':
            qs = qs.filter(is_published=False)

        # Filter by subject
        subject_slug = request.GET.get('subject')
        if subject_slug and subject_slug != 'all':
            qs = qs.filter(subject_slug=subject_slug)

        reels_data = []
        for r in qs:
            v_url = ''
            if r.video_file:
                try:
                    v_url = r.video_file.url
                except Exception:
                    v_url = ''
            if not v_url:
                v_url = r.video_url

            reels_data.append({
                'id': r.id,
                'source_question_id': r.source_question_id,
                'subject_name': r.subject_name,
                'subject_slug': r.subject_slug,
                'category_badge': r.category_badge,
                'tagline': r.tagline,
                'hook': r.hook,
                'fact': r.fact,
                'takeaway': r.takeaway,
                'gradient_theme': r.gradient_theme,
                'gradient': r.get_gradient_css(),
                'media_type': r.media_type,
                'video_url': v_url,
                'quiz': {
                    'question': r.quiz_question,
                    'options': r.quiz_options,
                    'correct_index': r.quiz_correct_index,
                    'explanation': r.quiz_explanation,
                },
                'is_published': r.is_published,
                'likes': r.likes_count,
                'shares': r.shares_count,
                'views': r.views_count,
                'order': r.order,
                'created_at': r.created_at.strftime('%Y-%m-%d %H:%M') if r.created_at else None,
            })

        total = Reel.objects.count()
        published_count = Reel.objects.filter(is_published=True).count()
        drafts_count = Reel.objects.filter(is_published=False).count()

        return Response({
            'reels': reels_data,
            'stats': {
                'total': total,
                'published': published_count,
                'drafts': drafts_count,
            }
        })

    elif request.method == 'POST':
        try:
            from django.utils.text import slugify
            data = request.data
            options = data.get('quiz_options') or data.get('options') or []
            if isinstance(options, str):
                options = [opt.strip() for opt in options.split('\n') if opt.strip()]

            media_type = data.get('media_type') or 'text'
            video_url = (data.get('video_url') or '').strip()
            video_file = request.FILES.get('video_file')

            sub_slug = data.get('subject_slug') or slugify(data.get('subject_name') or 'tarix') or 'tarix'

            try:
                correct_idx = int(data.get('quiz_correct_index', 0))
            except (ValueError, TypeError):
                correct_idx = 0

            source_qid = data.get('source_question_id')
            if source_qid:
                try:
                    source_qid = int(source_qid)
                except (ValueError, TypeError):
                    source_qid = None

            reel = Reel.objects.create(
                source_question_id=source_qid,
                subject_name=str(data.get('subject_name') or 'Tarix')[:100],
                subject_slug=str(sub_slug)[:100],
                category_badge=str(data.get('category_badge') or 'Muhim Fakt')[:150],
                tagline=str(data.get('tagline') or 'Bilasizmi?')[:100],
                hook=str(data.get('hook') or 'Diqqat!')[:300],
                fact=str(data.get('fact') or ''),
                takeaway=str(data.get('takeaway') or '')[:300],
                media_type=media_type,
                video_url=video_url[:500],
                video_file=video_file,
                quiz_question=str(data.get('quiz_question') or data.get('question') or ''),
                quiz_options=options,
                quiz_correct_index=correct_idx,
                quiz_explanation=str(data.get('quiz_explanation') or ''),
                gradient_theme=str(data.get('gradient_theme') or 'purple')[:30],
                is_published=bool(data.get('is_published', True)),
                created_by=request.user,
            )

            try:
                AuditLog.objects.create(
                    user=request.user,
                    action='create',
                    model_name='Reel',
                    object_id=str(reel.id),
                    object_repr=f"Yangi Reel yaratildi: {reel.hook[:200]}",
                )
            except Exception:
                pass

            return Response({'success': True, 'id': reel.id, 'message': "Reel muvaffaqiyatli saqlandi!"})
        except Exception as e:
            logger.exception("panel_reels_create error: %s", e)
            return Response({'error': f"Reelni saqlashda xatolik: {str(e)}"}, status=400)


@api_view(['GET', 'PATCH', 'DELETE', 'POST'])
@permission_classes([IsAuthenticated, IsSuperAdmin])
def panel_reels_detail_api(request, reel_id):
    from learning.models import Reel

    reel = Reel.objects.filter(id=reel_id).first()
    if not reel:
        if request.method in ['DELETE', 'POST']:
            return Response({'success': True, 'message': "Reel allaqachon o'chirilgan"})
        return Response({'error': "Reel topilmadi"}, status=404)

    if request.method == 'GET':
        return Response(reel.to_dict())

    elif request.method == 'PATCH':
        data = request.data

        if 'is_published' in data:
            reel.is_published = bool(data['is_published'])

        if 'subject_name' in data: reel.subject_name = data['subject_name']
        if 'subject_slug' in data: reel.subject_slug = data['subject_slug']
        if 'category_badge' in data: reel.category_badge = data['category_badge']
        if 'tagline' in data: reel.tagline = data['tagline']
        if 'hook' in data: reel.hook = data['hook']
        if 'fact' in data: reel.fact = data['fact']
        if 'takeaway' in data: reel.takeaway = data['takeaway']
        if 'media_type' in data: reel.media_type = data['media_type']
        if 'video_url' in data: reel.video_url = data['video_url']
        if 'video_file' in request.FILES: reel.video_file = request.FILES['video_file']
        if 'quiz_question' in data: reel.quiz_question = data['quiz_question']
        if 'quiz_options' in data: reel.quiz_options = data['quiz_options']
        if 'quiz_correct_index' in data: reel.quiz_correct_index = int(data['quiz_correct_index'])
        if 'quiz_explanation' in data: reel.quiz_explanation = data['quiz_explanation']
        if 'gradient_theme' in data: reel.gradient_theme = data['gradient_theme']

        reel.save()

        status_str = "Chop etildi (Published)" if reel.is_published else "Qoralamaga o'tkazildi (Draft)"
        try:
            AuditLog.objects.create(
                user=request.user,
                action='update',
                model_name='Reel',
                object_id=str(reel.id),
                object_repr=f"Reel tahrirlandi: '{reel.hook[:200]}' ({status_str})",
            )
        except Exception:
            pass

        return Response({'success': True, 'reel': reel.to_dict(), 'message': "O'zgarishlar saqlandi!"})

    elif request.method in ['DELETE', 'POST']:
        try:
            hook = reel.hook[:40] if getattr(reel, 'hook', None) else f"Reel #{reel_id}"
            try:
                reel.delete()
            except Exception as del_err:
                logger.warning("Normal reel.delete() failed, attempting QuerySet delete: %s", del_err)
                Reel.objects.filter(id=reel_id).delete()

            try:
                AuditLog.objects.create(
                    user=request.user,
                    action='delete',
                    model_name='Reel',
                    object_id=str(reel_id),
                    object_repr=f"Reel o'chirildi: {hook}",
                )
            except Exception:
                pass

            return Response({'success': True, 'message': "Reel o'chirildi!"})
        except Exception as e:
            logger.exception("Reel delete error: %s", e)
            return Response({'error': f"O'chirishda xatolik: {str(e)}"}, status=500)


@api_view(['DELETE', 'POST'])
@permission_classes([IsAuthenticated, IsSuperAdmin])
def panel_reels_delete_api(request, reel_id):
    """Super admin uchun Reelni o'chirish maxsus xavfsiz endpointi."""
    from learning.models import Reel
    try:
        reel = Reel.objects.filter(id=reel_id).first()
        if not reel:
            return Response({'success': True, 'message': "Reel allaqachon o'chirilgan."})
        hook = reel.hook[:40] if getattr(reel, 'hook', None) else f"Reel #{reel_id}"
        try:
            reel.delete()
        except Exception as del_err:
            logger.warning("Normal reel.delete() failed, attempting QuerySet delete: %s", del_err)
            Reel.objects.filter(id=reel_id).delete()

        try:
            AuditLog.objects.create(
                user=request.user,
                action='delete',
                model_name='Reel',
                object_id=str(reel_id),
                object_repr=f"Reel o'chirildi: {hook}",
            )
        except Exception:
            pass

        return Response({'success': True, 'message': "Reel muvaffaqiyatli o'chirildi!"})
    except Exception as e:
        logger.exception("panel_reels_delete_api error: %s", e)
        return Response({'error': f"O'chirishda xatolik: {str(e)}"}, status=500)


@api_view(['GET'])
@permission_classes([IsSuperAdmin])
def panel_community_posts_api(request):
    """Super Admin uchun Hamjamiyat postlari ro'yxati va moderatsiyasi."""
    try:
        from learning.models import CommunityPost
        from django.db.models import Q

        qs = CommunityPost.objects.select_related('author', 'author__profile', 'test', 'attempt')
        try:
            qs = qs.order_by('-is_pinned', '-created_at')
        except Exception:
            qs = qs.order_by('-created_at')

        # Filter by post_type
        ptype = request.GET.get('type')
        if ptype and ptype != 'all':
            qs = qs.filter(post_type=ptype)

        # Search
        search = request.GET.get('q', '').strip()
        if search:
            qs = qs.filter(
                Q(title__icontains=search) |
                Q(caption__icontains=search) |
                Q(author__username__icontains=search) |
                Q(author__first_name__icontains=search)
            )

        total = qs.count()
        posts = qs[:100]

        posts_data = []
        for p in posts:
            try:
                posts_data.append(p.to_dict(current_user=request.user))
            except Exception as e:
                logger.warning("Error serializing post %s: %s", getattr(p, 'id', None), e)

        return Response({
            'posts': posts_data,
            'total': total,
        })
    except Exception as err:
        logger.exception("panel_community_posts_api error: %s", err)
        return Response({
            'posts': [],
            'total': 0,
            'error': str(err),
        })


@api_view(['DELETE', 'POST'])
@permission_classes([IsSuperAdmin])
def panel_community_post_delete_api(request, post_id):
    """Super Admin tomonidan postni o'chirish."""
    try:
        from learning.models import CommunityPost
        from panel.models import AuditLog

        post = CommunityPost.objects.filter(id=post_id).first()
        if not post:
            return Response({'success': True, 'message': "Post topilmadi yoki allaqachon o'chirilgan."})
        title = post.title or ""
        author = post.author.username if post.author else "Noma'lum"

        try:
            post.delete()
        except Exception as del_err:
            logger.warning("Normal post.delete() failed, attempting QuerySet delete: %s", del_err)
            CommunityPost.objects.filter(id=post_id).delete()

        try:
            AuditLog.objects.create(
                user=request.user,
                action='delete',
                model_name='CommunityPost',
                object_id=str(post_id),
                object_repr=f"Hamjamiyat posti o'chirildi: '{title[:150]}' ({author})",
            )
        except Exception:
            pass

        return Response({'success': True, 'message': "Post muvaffaqiyatli o'chirildi."})
    except Exception as e:
        logger.exception("panel_community_post_delete_api error: %s", e)
        return Response({'error': str(e)}, status=500)


@api_view(['POST'])
@permission_classes([IsSuperAdmin])
def panel_community_post_pin_api(request, post_id):
    """Super Admin tomonidan postni yuqoriga qadash (pin) yoki qadashdan chiqarish."""
    try:
        from learning.models import CommunityPost
        from panel.models import AuditLog

        post = CommunityPost.objects.filter(id=post_id).first()
        if not post:
            return Response({'error': "Post topilmadi."}, status=404)
        is_pinned = not getattr(post, 'is_pinned', False)
        post.is_pinned = is_pinned
        post.save(update_fields=['is_pinned'])

        try:
            AuditLog.objects.create(
                user=request.user,
                action='update',
                model_name='CommunityPost',
                object_id=str(post_id),
                object_repr=f"Post {'qadaldi' if post.is_pinned else 'qadashdan chiqarildi'}: '{post.title[:200]}'",
            )
        except Exception:
            pass

        return Response({'success': True, 'is_pinned': post.is_pinned})
    except Exception as e:
        logger.exception("panel_community_post_pin_api error: %s", e)
        return Response({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsSuperAdmin])
def panel_reels_hardest_questions_api(request):
    """Platformada o'quvchilar eng ko'p xato qilgan savollarni tahlil qilib qaytaradi.
    Super admin ushbu savoldan bitta tugma bilan Reels yaratishi mumkin!"""
    from tests_app.models import Question, AttemptAnswer
    from django.db.models import Count, Q

    questions_data = []

    # 1. Oldindan Reel yaratilgan savollarni aniqlash
    from learning.models import Reel

    def normalize_snip(val):
        if not val:
            return ""
        v = re.sub(r'<[^>]+>', '', val)
        v = re.sub(r'[\'"`«»’‘“”\.,:;!?\(\)\-\—\–]', '', v)
        return re.sub(r'\s+', ' ', v).strip().lower()[:40]

    existing_reels = list(Reel.objects.all().values('id', 'quiz_question', 'fact', 'source_question_id'))
    reel_map = {r['source_question_id']: r['id'] for r in existing_reels if r.get('source_question_id')}
    snippet_reel_map = {}
    for r in existing_reels:
        for t in [r.get('quiz_question'), r.get('fact')]:
            snip = normalize_snip(t)
            if snip and len(snip) >= 8:
                snippet_reel_map[snip] = r['id']

    def find_converted_reel(qid, snip):
        if qid in reel_map:
            return reel_map[qid]
        if not snip or len(snip) < 8:
            return None
        if snip in snippet_reel_map:
            return snippet_reel_map[snip]
        if len(snip) >= 12:
            for s_key, r_id in snippet_reel_map.items():
                if len(s_key) >= 12 and (s_key[:20] in snip or snip[:20] in s_key):
                    return r_id
        return None

    # 1. Haqiqiy urinishlardagi eng ko'p xato qilingan test savollari (bitta to'g'ri javobli)
    try:
        wrong_stats = (
            AttemptAnswer.objects
            .filter(
                is_correct=False,
                question__question_type__in=['single_choice', 'image_based', 'table_based'],
                question__choices__isnull=False
            )
            .values('question_id')
            .annotate(wrong_count=Count('id'))
            .order_by('-wrong_count')[:100]
        )

        seen_qids = set()
        for item in wrong_stats:
            qid = item['question_id']
            if qid in seen_qids:
                continue
            seen_qids.add(qid)

            q = Question.objects.filter(id=qid).select_related('subject').prefetch_related('choices').first()
            if not q:
                continue

            choices = list(q.choices.all())
            if len(choices) < 2:
                continue

            raw_body = q.body or ""
            # Block teglar (p, div, tr, br, li) dan keyin yangi qator qo'yish orqali matnlar yopishib qolishining oldini olish:
            clean_text = re.sub(r'</?(?:p|div|tr|br|li|h[1-6])[^>]*>', '\n', raw_body)
            clean_text = re.sub(r'<[^>]+>', ' ', clean_text)
            clean_text = re.sub(r'[ \t]+', ' ', clean_text)
            clean_text = re.sub(r'\n\s*\n', '\n', clean_text).strip()
            lower_body = clean_text.lower()
            unwanted_words = ['yozing', 'topshiriq', "lo'nda", 'lo‘nda', 'moslashtiring', 'matnni']
            if not clean_text or len(clean_text) < 10 or any(w in lower_body for w in unwanted_words):
                continue

            clean_snippet = normalize_snip(clean_text)
            converted_reel_id = find_converted_reel(q.id, clean_snippet)
            is_converted = bool(converted_reel_id)

            if converted_reel_id and q.id not in reel_map:
                try:
                    Reel.objects.filter(id=converted_reel_id, source_question__isnull=True).update(source_question_id=q.id)
                    reel_map[q.id] = converted_reel_id
                except Exception:
                    pass

            wrong_ans = item['wrong_count']
            total_ans = AttemptAnswer.objects.filter(question_id=qid).count()
            fail_rate = round(wrong_ans * 100.0 / total_ans, 1) if total_ans > 0 else 100.0

            options = [c.text for c in choices]
            correct_idx = 0
            for i, c in enumerate(choices):
                if c.is_correct:
                    correct_idx = i
                    break

            subj_name = q.subject.name if q.subject else "Tarix"
            subj_slug = q.subject.slug if q.subject else "tarix"

            questions_data.append({
                'question_id': q.id,
                'subject_name': subj_name,
                'subject_slug': subj_slug,
                'difficulty': q.get_difficulty_display(),
                'clean_body': clean_text,
                'options': options,
                'correct_index': correct_idx,
                'explanation': q.explanation or f"{subj_name} bo'yicha darslik va rasmiy BBA dasturidagi muhim qoida.",
                'fail_rate': fail_rate,
                'wrong_count': wrong_ans,
                'total_count': total_ans,
                'suggested_hook': f"O'quvchilarning {int(fail_rate)}% i shu testda yiqilgan! Sen toparmiding?",
                'suggested_tagline': f"{wrong_ans} ta o'quvchi adashgan!",
                'is_converted': is_converted,
                'converted_reel_id': converted_reel_id,
            })

            if len(questions_data) >= 24:
                break
    except Exception as e:
        logger.exception("Error analyzing hardest questions from attempts: %s", e)

    # 2. Agar urinishlar yetarli bo'lmasa, rasmiy testlar bazasidan variantli savollardan saralash
    if len(questions_data) < 24:
        existing_ids = {qd['question_id'] for qd in questions_data}
        fallback_qs = (
            Question.objects
            .filter(
                question_type__in=['single_choice', 'image_based', 'table_based'],
                choices__isnull=False
            )
            .exclude(id__in=existing_ids)
            .select_related('subject')
            .prefetch_related('choices')
            .order_by('-difficulty', '-id')[:120]
        )

        for q in fallback_qs:
            choices = list(q.choices.all())
            if len(choices) < 2:
                continue

            raw_body = q.body or ""
            clean_text = re.sub(r'<[^>]+>', '', raw_body).strip()
            lower_body = clean_text.lower()
            unwanted_words = ['yozing', 'topshiriq', "lo'nda", 'lo‘nda', 'moslashtiring', 'matnni']
            if not clean_text or len(clean_text) < 10 or any(w in lower_body for w in unwanted_words):
                continue

            clean_snippet = normalize_snip(clean_text)
            converted_reel_id = find_converted_reel(q.id, clean_snippet)
            is_converted = bool(converted_reel_id)

            if converted_reel_id and q.id not in reel_map:
                try:
                    Reel.objects.filter(id=converted_reel_id, source_question__isnull=True).update(source_question_id=q.id)
                    reel_map[q.id] = converted_reel_id
                except Exception:
                    pass

            options = [c.text for c in choices]
            correct_idx = 0
            for i, c in enumerate(choices):
                if c.is_correct:
                    correct_idx = i
                    break

            subj_name = q.subject.name if q.subject else "Tarix"
            subj_slug = q.subject.slug if q.subject else "tarix"

            total_ans = AttemptAnswer.objects.filter(question_id=q.id).count()
            wrong_ans = AttemptAnswer.objects.filter(question_id=q.id, is_correct=False).count()
            fail_rate = round(wrong_ans * 100.0 / total_ans, 1) if total_ans > 0 else (78.0 if q.difficulty == 'hard' else 62.0)

            questions_data.append({
                'question_id': q.id,
                'subject_name': subj_name,
                'subject_slug': subj_slug,
                'difficulty': q.get_difficulty_display(),
                'clean_body': clean_text,
                'options': options,
                'correct_index': correct_idx,
                'explanation': q.explanation or f"{subj_name} bo'yicha rasmiy test mezonlari va muhim fakt.",
                'fail_rate': fail_rate,
                'wrong_count': wrong_ans,
                'total_count': total_ans,
                'suggested_hook': f"{subj_name}dan sinov savoli: Buni yecha olasizmi?",
                'suggested_tagline': f"{subj_name} testi",
                'is_converted': is_converted,
                'converted_reel_id': converted_reel_id,
            })

            if len(questions_data) >= 24:
                break

    pending_count = sum(1 for q in questions_data if not q.get('is_converted'))
    converted_count = sum(1 for q in questions_data if q.get('is_converted'))

    return Response({
        'questions': questions_data,
        'count': len(questions_data),
        'stats': {
            'total': len(questions_data),
            'pending': pending_count,
            'converted': converted_count,
        }
    })



