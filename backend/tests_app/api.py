"""Test yechish oqimining JSON API'si — umumiy JWT naqshi uchun accounts/api.py ga qarang.

Baholash SERVER TOMONDA qoladi: `is_correct` finish()/feedback() dan oldin hech qachon
javobga qo'shilmaydi, aks holda to'g'ri javobni tarmoq so'rovidan o'qib olish mumkin
bo'lardi."""
import logging
from django.conf import settings
from django.core.paginator import Paginator
from django.http import Http404, HttpResponse
from django.db import transaction
from django.db.models import Avg, Count, F, Q, Case, When, IntegerField
from django.shortcuts import get_object_or_404
from django.utils import timezone
from core import background
from rest_framework.decorators import (
    api_view, authentication_classes, permission_classes,
)
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from accounts.models import ensure_profile_for_user
from accounts.permissions import IsChannelSubscribed
from .models import (
    AIFeedback, Attempt, AttemptAnswer, Question, RevisionItem, Subject, TestSet,
    ExamSurvey, StressExamConfig, MockRegistration,
)
from .subject_utils import resolve_subject as _resolve_subject
from .feedback import _dispatch_ai_feedback, seed_questions_if_needed
from .services.answering import apply_answer
from .services.grading import grade_open_answers
from .services.review import describe_answer, section_label, writing_payload
from core.ai_client import ask_groq
from analytics.tracking import track_event

logger = logging.getLogger(__name__)


def _answer_mode(t):
    total = getattr(t, 'q_count', None)
    open_count = getattr(t, 'open_count', None)
    if total is None or open_count is None:
        total = t.questions.count()
        open_count = t.questions.filter(question_type='open_written').count()
    if total == 0:
        return None
    if open_count == 0:
        return 'closed'
    if open_count == total:
        return 'open'
    return 'mixed'


def _iso_scheduled_at(dt):
    if not dt:
        return None
    tz = timezone.get_current_timezone()
    if timezone.is_aware(dt):
        dt = dt.astimezone(tz)
    else:
        dt = timezone.make_aware(dt, tz)
    return dt.isoformat()


def _author_payload(user):
    if not user:
        return None
    profile = getattr(user, 'profile', None)
    full_name = f"{user.last_name} {user.first_name}".strip() or user.get_full_name() or user.username
    role = getattr(profile, 'role', 'teacher') if profile else 'teacher'
    is_super = getattr(profile, 'is_superadmin', user.is_superuser) if profile else user.is_superuser
    is_teach = getattr(profile, 'is_teacher', True) if profile else True
    return {
        'id': user.id,
        'name': full_name,
        'username': user.username,
        'avatar': getattr(profile, 'avatar_url', '') if profile else '',
        'role': role,
        'is_superadmin': is_super,
        'is_teacher': is_teach,
    }


def _is_new_test(t, days=10):
    """Test so'nggi 10 kun ichida yuklangan yoki yaratilgan bo'lsa True."""
    created_at = getattr(t, 'created_at', None)
    if not created_at:
        return False
    from django.utils import timezone
    from datetime import timedelta
    return (timezone.now() - created_at) <= timedelta(days=days)


def _test_payload(t, social=None, unlocked=False):
    """`social` — shu testning so'nggi 7 kunlik ijtimoiy dalili
    ({'solvers': N, 'avg': X}); ma'lumot bo'lmasa None qaytadi."""
    return {
        'id': t.id, 'title': t.title, 'description': t.description, 'category': t.category,
        'subject': t.subject.slug if t.subject else None,
        'duration_minutes': t.duration_minutes,
        # `q_count` — ro'yxat so'rovida annotate qilingan (N+1 ni yo'q qilish uchun).
        'questions_count': getattr(t, 'q_count', None) if getattr(t, 'q_count', None) is not None else t.questions.count(),
        # 'closed' — hammasi variantli (single_choice/matching/grouped_item/...), 'open' —
        # hammasi yozma javob (open_written, Groq baholaydi), 'mixed' — ikkalasi ham bor.
        # Faqat shu ikki toifa mavjud: open_written'dan boshqa 5 tur ham "variantli" deb
        # hisoblanadi, chunki o'quvchi baribir tayyor javoblardan tanlaydi.
        'answer_mode': _answer_mode(t),
        'is_premium': t.is_premium,
        'price': float(t.price) if getattr(t, 'price', None) is not None else None,
        'is_live_mock': getattr(t, 'is_live_mock', False),
        'prize_description': getattr(t, 'prize_description', '') or '',
        'scheduled_at': _iso_scheduled_at(getattr(t, 'scheduled_at', None)),
        # `is_unlocked` — shu O'QUVCHI uchun: global mock-test kirishi yoki aynan shu
        # test uchun tasdiqlangan to'lov bo'lsa True.
        'is_unlocked': unlocked,
        'recent_solvers': (social or {}).get('solvers', 0),
        'recent_avg_score': (social or {}).get('avg'),
        'author': _author_payload(getattr(t, 'created_by', None)),
        'created_at': t.created_at.isoformat() if getattr(t, 'created_at', None) else None,
        'is_new': _is_new_test(t, days=10),
    }


@api_view(['GET'])
def center_api(request):
    seed_questions_if_needed()
    profile = ensure_profile_for_user(request.user)
    req_subject = request.GET.get('subject')
    if req_subject == 'all':
        subject = None
        subjects = list(Subject.objects.all())
    else:
        subject, subjects = _resolve_subject(request)

    category = request.GET.get('category', 'all')
    answer_mode = request.GET.get('answer_mode', 'all')
    search_query = request.GET.get('search', '')

    tests = (TestSet.objects.filter(is_random=False, is_archived=False, is_published=True)
             .exclude(id__in=_classroom_locked_test_ids()))
    if subject:
        tests = tests.filter(subject=subject)

    # Imtihon turlari ro'yxati TANLANGAN FANDAN kelib chiqadi: CEFR faqat ingliz
    # tilida, "Tarix" faqat tarixda ko'rinishi kerak — ilgari frontendda qattiq
    # yozilgan umumiy ro'yxat ishlatilgani uchun Tarix ostida ham CEFR chiqib turardi.
    #
    # Ro'yxat qattiq yozilmaydi, MAVJUD testlardan hisoblanadi: yangi fan yoki
    # kategoriya qo'shilganda hech narsa tahrirlanmaydi, o'zi to'g'ri qoladi.
    #
    # MUHIM: kategoriya filtri qo'llanishidan OLDIN hisoblanadi — aks holda bitta
    # kategoriya tanlangach ro'yxat o'sha bittaga qisqarib, boshqasiga o'tib bo'lmay
    # qolardi. `order_by()` — DISTINCT bilan tartiblash maydoni SELECT'ga tushib
    # ketmasligi uchun (Postgres bunga xato beradi).
    available_categories = sorted(
        tests.order_by().exclude(category='').values_list('category', flat=True).distinct()
    )

    tests = tests.select_related('subject', 'created_by', 'created_by__profile').annotate(
        q_count=Count('questions', distinct=True),
        open_count=Count(
            Case(When(questions__question_type='open_written', then=F('questions__id')),
                 output_field=IntegerField()),
            distinct=True,
        ),
    ).order_by('-created_at')

    if category != 'all':
        tests = tests.filter(category=category)
    if search_query:
        tests = tests.filter(title__icontains=search_query)
    if answer_mode == 'closed':
        tests = tests.filter(open_count=0, q_count__gt=0)
    elif answer_mode == 'open':
        tests = tests.filter(open_count=F('q_count'), q_count__gt=0)
    elif answer_mode == 'mixed':
        tests = tests.filter(open_count__gt=0, q_count__gt=0).exclude(open_count=F('q_count'))

    stats = profile.attempts.aggregate(total=Count('id'), avg=Avg('score', filter=Q(is_completed=True)))

    # Ijtimoiy dalil: so'nggi 7 kunda har bir testni nechta o'quvchi yechgani va o'rtacha
    # ball. Bitta guruhlangan so'rov — testlar soniga qarab ko'paymaydi.
    week_ago = timezone.now() - timezone.timedelta(days=7)
    social_rows = (Attempt.objects
                   .filter(is_completed=True, completed_at__gte=week_ago, test__in=tests)
                   .values('test_id')
                   .annotate(solvers=Count('profile_id', distinct=True), avg=Avg('score')))
    social_by_test = {r['test_id']: {'solvers': r['solvers'], 'avg': r['avg']} for r in social_rows}

    # Mock test tarifi endi BITTA testni ochadi (to'lov o'sha testga bog'lanadi).
    # Global bayroq esa admin qo'lda bergan yoki eski, testga bog'lanmagan xaridlar uchun.
    from premium.models import SubscriptionPlan, unlocked_test_ids
    unlocked_ids = unlocked_test_ids(profile)
    mock_plan = SubscriptionPlan.objects.filter(plan_type='mock_test', is_active=True).order_by('order').first()
    # Faol PRO obuna barcha mock testlarni ochadi. Ilgari obuna FAQAT darslarni ochardi
    # (ular esa hali yo'q edi) — ya'ni o'quvchi obuna sotib olib ham hech narsa olmasdi.
    has_sub = profile.is_vip_active

    # Pinned Katta Mock Imtihon: tanlangan fan va kategoriya bo'yicha eng yaqin yoki hozir ketayotgan jonli imtihon
    now = timezone.now()
    mock_qs = TestSet.objects.filter(
        is_published=True,
        is_archived=False,
        is_live_mock=True,
        scheduled_at__gte=now - timezone.timedelta(hours=3),
    ).select_related('subject', 'created_by', 'created_by__profile').order_by('scheduled_at')

    pinned_mock = None
    if subject:
        subj_mock_qs = mock_qs.filter(subject=subject)
        if category != 'all':
            pinned_mock = subj_mock_qs.filter(category=category).first()
        else:
            pinned_mock = subj_mock_qs.first()
    else:
        if category != 'all':
            pinned_mock = mock_qs.filter(category=category).first()
        else:
            pinned_mock = mock_qs.first()

    # Agar yaqin 3 soatda rejalashtirilgan mock topilmasa, mavjud eng so'nggi jonli mockni fallback sifatida ko'rsatamiz
    if not pinned_mock:
        fallback_qs = TestSet.objects.filter(
            is_published=True,
            is_archived=False,
            is_live_mock=True,
        ).select_related('subject', 'created_by', 'created_by__profile').order_by('-scheduled_at', '-id')
        if subject:
            pinned_mock = fallback_qs.filter(subject=subject).first()
        if not pinned_mock:
            pinned_mock = fallback_qs.first()

    pinned_payload = None
    if pinned_mock:
        pinned_payload = {
            'id': pinned_mock.id,
            'title': pinned_mock.title,
            'description': pinned_mock.description,
            'subject': pinned_mock.subject.name if pinned_mock.subject else 'Tarix',
            'subject_slug': pinned_mock.subject.slug if pinned_mock.subject else 'tarix',
            'category': pinned_mock.category,
            'duration_minutes': pinned_mock.duration_minutes,
            'questions_count': pinned_mock.questions.count(),
            'scheduled_at': _iso_scheduled_at(pinned_mock.scheduled_at),
            'is_live_mock': pinned_mock.is_live_mock,
            'is_reminded': pinned_mock.remind_users.filter(id=request.user.id).exists() if request.user.is_authenticated else False,
            'remind_users_count': pinned_mock.remind_users.count(),
            # Haqiqiy son (ilgari `count*3+18`, kamida 24 — sun'iy oshirilgan edi).
            'waiting_participants_count': max(
                pinned_mock.remind_users.count(),
                MockRegistration.objects.filter(test=pinned_mock, status='CONFIRMED').count(),
            ),
            'is_premium': pinned_mock.is_premium,
            'price': float(pinned_mock.price) if pinned_mock.price is not None else (float(mock_plan.price) if mock_plan else 0.0),
            'prize_description': getattr(pinned_mock, 'prize_description', '') or '',
            'is_unlocked': (not pinned_mock.is_premium) or (pinned_mock.price is not None and float(pinned_mock.price) <= 0) or has_sub or profile.premium_mock_test_unlocked or (pinned_mock.id in unlocked_ids),
            'author': _author_payload(getattr(pinned_mock, 'created_by', None)),
        }

    subject_counts = dict(
        TestSet.objects.filter(is_published=True, is_archived=False, is_random=False, subject__isnull=False)
        .values_list('subject_id')
        .annotate(cnt=Count('id'))
        .values_list('subject_id', 'cnt')
    )

    return Response({
        'pinned_mock': pinned_payload,
        'tests': [
            _test_payload(
                t, social_by_test.get(t.id),
                unlocked=(has_sub or profile.premium_mock_test_unlocked or t.id in unlocked_ids),
            ) for t in tests
        ],
        'subjects': [
            {
                'id': s.id,
                'name': s.name,
                'slug': s.slug,
                'color': s.color,
                'icon_name': s.icon_name,
                'tests_count': subject_counts.get(s.id, 0),
            }
            for s in subjects
        ],
        'selected_subject': subject.slug if subject else None,
        'selected_category': category,
        # Shu fanda haqiqatan mavjud imtihon turlari — filtr shundan quriladi.
        'available_categories': available_categories,
        'selected_answer_mode': answer_mode,
        'search_query': search_query,
        'total_attempts': stats['total'] or 0,
        'avg_score': stats['avg'] or 0,
        'has_mock_test_access': has_sub or profile.premium_mock_test_unlocked,
        'has_lessons_access': has_sub,
        # Qulflangan kartadan to'g'ridan-to'g'ri to'lovga o'tish uchun.
        'mock_plan': {'id': mock_plan.id, 'price': str(mock_plan.price)} if mock_plan else None,
    })


@transaction.atomic
def _new_attempt(profile, test, is_stress=False):
    attempt = Attempt.objects.create(profile=profile, test=test, is_stress_mode=is_stress)
    q_ids = list(test.questions.values_list('id', flat=True))
    order = test.question_order or []
    if order:
        rank = {qid: i for i, qid in enumerate(order)}
        q_ids = sorted(q_ids, key=lambda qid: rank.get(qid, len(order) + qid))
    AttemptAnswer.objects.bulk_create([
        AttemptAnswer(attempt=attempt, question_id=qid)
        for qid in q_ids
    ])
    return attempt



def _classroom_locked_test_ids():
    """Pullik sinf mock'larida ishlatilayotgan test to'plamlari (bepul reklama mock'idan
    tashqari). Ular faqat sinf oqimi orqali (obuna + jadval) ochiladi — umumiy katalog va
    /tests/<id>/start/ orqali emas (audit API-002)."""
    from classroom.models import MockTest
    return set(MockTest.objects.filter(is_free_preview=False).values_list('test_set_id', flat=True))

@api_view(['POST'])
@permission_classes([IsAuthenticated, IsChannelSubscribed])
def start_test_api(request, test_id):
    test = get_object_or_404(TestSet, id=test_id)
    profile = ensure_profile_for_user(request.user)
    # Qoralama/arxivdagi test faqat muallifiga (va adminga) ochiq. Ilgari ID bilan
    # istalgan o'qituvchining nashr qilinmagan testini boshlash va javoblarini ko'rish
    # mumkin edi.
    if ((not test.is_published or test.is_archived)
            and test.created_by_id != request.user.id and not profile.is_superadmin):
        return Response({'error': 'Test topilmadi'}, status=404)
    if (test.id in _classroom_locked_test_ids()
            and test.created_by_id != request.user.id and not profile.is_superadmin):
        return Response({'error': "Bu sinf imtihoni — uni sinf sahifasidan, jadval bo'yicha boshlang."},
                        status=403)
    now = timezone.now()

    # Jonli Mock Imtihon vaqti tekshiruvi
    # Jonli Mock Imtihon ro'yxatdan o'tish va vaqt tekshiruvi
    mock_reg = MockRegistration.objects.filter(profile=profile, test=test).first() if test.is_live_mock else None
    if mock_reg and mock_reg.status == 'DISQUALIFIED':
        return Response({
            'error': "Siz ushbu mock imtihonidan qoidabuzarlik sababli chetlatilgansiz.",
            'code': 'DISQUALIFIED',
        }, status=403)
    if test.is_live_mock and test.scheduled_at and now < test.scheduled_at and test.created_by_id != request.user.id and not profile.is_superadmin:
        tz = timezone.get_current_timezone()
        local_sched = test.scheduled_at.astimezone(tz) if timezone.is_aware(test.scheduled_at) else test.scheduled_at
        return Response({
            'error': f"Imtihon hali boshlanmadi. Boshlanish vaqti: {local_sched.strftime('%H:%M')}.",
            'scheduled_at': _iso_scheduled_at(test.scheduled_at),
        }, status=400)

    # Agar test bo'yicha davom etayotgan urinish bo'lsa, o'shani qaytaramiz
    active_attempt = Attempt.objects.filter(profile=profile, test=test, is_completed=False).order_by('-started_at').first()
    if active_attempt:
        mode = 'cefr' if test.sections.exists() else 'classic'
        return Response({'attempt_id': active_attempt.id, 'mode': mode})

    # Agar mock imtihon bo'lsa va allaqachon topshirilgan bo'lsa
    completed_attempt = Attempt.objects.filter(profile=profile, test=test, is_completed=True).order_by('-completed_at').first()
    if completed_attempt and test.is_live_mock:
        return Response({'attempt_id': completed_attempt.id, 'completed': True, 'mode': 'feedback'})

    from premium.models import unlocked_test_ids as _unlocked_ids
    # PRO obuna ham, bir martalik mock-test xaridi ham ochadi (yuqoridagi center_api bilan
    # bir xil qoida — ikkalasi ajralib qolsa, katalogda "ochiq" ko'ringan test start'da
    # 403 berardi).
    is_free_price = test.price is not None and float(test.price) <= 0
    if (test.is_premium and not is_free_price
            and not profile.is_vip_active
            and not profile.premium_mock_test_unlocked
            and test.id not in _unlocked_ids(profile)):
        track_event(profile, 'paywall_view', feature='mock')
        return Response({'error': "Bu test PRO obuna yoki mock test xaridi bilan ochiladi.", 'code': 'PAYMENT_REQUIRED'}, status=403)
    if False and (test.is_premium
            and not profile.is_vip_active
            and not profile.premium_mock_test_unlocked
            and test.id not in _unlocked_ids(profile)):
        track_event(profile, 'paywall_view', feature='mock')
        return Response({'error': "Bu test PRO obuna yoki mock test xaridi bilan ochiladi."}, status=403)
    is_stress = bool(request.data.get('stress') or request.query_params.get('stress'))
    if (is_stress and not profile.is_vip_active
            and Attempt.objects.filter(profile=profile, is_stress_mode=True).exists()):
        # start_stress_test_api dagi "1-marta bepul, keyin PRO" qoidasini aylanib o'tmasin.
        return Response({'error': "Stress zali birinchi marta bepul edi. Davom etish uchun PRO obuna kerak.",
                         'requires_pro': True}, status=403)
    attempt = _new_attempt(profile, test, is_stress=is_stress)
    if test.is_live_mock:
        if mock_reg:
            mock_reg.checked_in_at = now
            if mock_reg.status != 'CONFIRMED':
                mock_reg.status = 'CONFIRMED'
                mock_reg.confirmed_at = mock_reg.confirmed_at or now
            mock_reg.save(update_fields=['checked_in_at', 'status', 'confirmed_at', 'updated_at'])
        else:
            u_obj = request.user
            full_name = f"{u_obj.first_name} {u_obj.last_name}".strip() or u_obj.username
            MockRegistration.objects.get_or_create(
                profile=profile,
                test=test,
                defaults={
                    'full_name': full_name,
                    'phone': getattr(profile, 'phone', '') or '',
                    'region': getattr(profile, 'region', '') or '',
                    'status': 'CONFIRMED',
                    'confirmed_at': now,
                    'checked_in_at': now,
                },
            )
    # `mode` — klient qaysi ekranni ochishini aytadi. Partlarga (ExamSection) bo'lingan
    # test CEFR imtihon ekranida ochiladi: matn/audio va butun part bir varaqda. Qolgan
    # hamma test eski "bitta savol — bitta ekran" oqimida qoladi.
    mode = 'cefr' if test.sections.exists() else 'classic'
    return Response({'attempt_id': attempt.id, 'mode': mode})


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsChannelSubscribed])
def mock_lobby_api(request, test_id):
    test = get_object_or_404(TestSet.objects.select_related('subject', 'created_by', 'created_by__profile'), id=test_id, is_published=True, is_archived=False)
    profile = ensure_profile_for_user(request.user)
    is_reminded = test.remind_users.filter(id=request.user.id).exists()
    now = timezone.now()

    # Foydalanuvchining ushbu test bo'yicha urinishlari
    active_attempt = Attempt.objects.filter(test=test, profile=profile, is_completed=False).order_by('-started_at').first()
    completed_attempt = Attempt.objects.filter(test=test, profile=profile, is_completed=True).order_by('-completed_at').first()

    return Response({
        'id': test.id,
        'title': test.title,
        'description': test.description,
        'subject': test.subject.name if test.subject else 'Tarix',
        'subject_slug': test.subject.slug if test.subject else 'tarix',
        'category': test.category,
        'duration_minutes': test.duration_minutes,
        'questions_count': test.questions.count(),
        'is_live_mock': test.is_live_mock,
        'scheduled_at': _iso_scheduled_at(test.scheduled_at),
        'server_now': now.astimezone(timezone.get_current_timezone()).strftime('%Y-%m-%dT%H:%M:%S+05:00'),
        'is_reminded': is_reminded,
        'remind_users_count': test.remind_users.count(),
        'waiting_participants_count': max(
            test.remind_users.count(),
            MockRegistration.objects.filter(test=test, status='CONFIRMED').count(),
        ),
        **_mock_lobby_extra_payload(test, profile, now, active_attempt, completed_attempt),
        'has_active_attempt': active_attempt is not None,
        'active_attempt_id': active_attempt.id if active_attempt else None,
        'has_completed': completed_attempt is not None,
        'completed_attempt_id': completed_attempt.id if completed_attempt else None,
        'completed_score': completed_attempt.score if completed_attempt else None,
        'author': _author_payload(getattr(test, 'created_by', None)),
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsChannelSubscribed])
def _unused_decorator_target_for_mock_lobby(request):
    return Response({})


def _mock_lobby_extra_payload(test, profile, now, active_attempt, completed_attempt):
    from premium.models import SubscriptionPlan, Payment, unlocked_test_ids
    mock_plan = SubscriptionPlan.objects.filter(plan_type='mock_test', is_active=True).order_by('order').first()
    effective_price = float(test.price) if test.price is not None else (float(mock_plan.price) if (test.is_premium and mock_plan) else 0.0)
    is_free = (not test.is_premium) or effective_price <= 0
    unlocked_ids = unlocked_test_ids(profile)
    is_unlocked = is_free or profile.is_vip_active or profile.premium_mock_test_unlocked or (test.id in unlocked_ids)

    reg = MockRegistration.objects.select_related('payment').filter(profile=profile, test=test).first()
    if reg and reg.status == 'PENDING_PAYMENT' and is_unlocked:
        reg.status = 'CONFIRMED'
        reg.confirmed_at = reg.confirmed_at or now
        reg.save(update_fields=['status', 'confirmed_at', 'updated_at'])

    latest_payment = (reg.payment if reg and reg.payment_id else None) or (
        Payment.objects.filter(profile=profile, test=test).order_by('-created_at').first()
    )

    is_started = bool(not test.scheduled_at or now >= test.scheduled_at)
    end_dt = (test.scheduled_at + timezone.timedelta(minutes=(test.duration_minutes or 60) + 120)) if test.scheduled_at else None
    is_ended = bool(end_dt and now >= end_dt)

    if completed_attempt:
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

    can_start = bool(
        is_started
        and is_unlocked
        and completed_attempt is None
        and (not reg or reg.status != 'DISQUALIFIED')
    )

    reg_payload = None
    if reg:
        reg_payload = {
            'id': reg.id,
            'registration_id': reg.registration_id,
            'full_name': reg.full_name,
            'phone': reg.phone,
            'region': reg.region,
            'status': reg.status,
            'registered_at': reg.registered_at.isoformat() if reg.registered_at else None,
            'confirmed_at': reg.confirmed_at.isoformat() if reg.confirmed_at else None,
            'checked_in_at': reg.checked_in_at.isoformat() if reg.checked_in_at else None,
            'prize_status': reg.prize_status,
            'prize_title': reg.prize_title,
            'prize_amount': float(reg.prize_amount or 0),
            'payment_id': latest_payment.id if latest_payment else None,
            'payment_status': latest_payment.status if latest_payment else ('approved' if is_unlocked else None),
        }

    return {
        'is_premium': bool(test.is_premium and not is_free),
        'price': effective_price,
        'prize_description': getattr(test, 'prize_description', '') or '',
        'is_unlocked': is_unlocked,
        'is_started': is_started,
        'is_ended': is_ended,
        'can_start': can_start,
        'lifecycle_state': lifecycle_state,
        'plan_id': mock_plan.id if mock_plan else None,
        'checkout_url': f"/premium/checkout/{mock_plan.id}?test={test.id}" if (mock_plan and not is_unlocked) else None,
        'registration': reg_payload,
        'confirmed_participants_count': MockRegistration.objects.filter(test=test, status='CONFIRMED').count(),
    }


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsChannelSubscribed])
def mock_register_api(request, test_id):
    """Respublika Mock imtihoniga rasmiy ro'yxatdan o'tish."""
    import re
    from accounts.models import Profile
    from premium.models import SubscriptionPlan, Payment, unlocked_test_ids

    test = get_object_or_404(TestSet, id=test_id, is_published=True, is_archived=False)
    profile = ensure_profile_for_user(request.user)
    data = request.data or {}

    raw_name = (
        data.get('full_name')
        or f"{request.user.first_name} {request.user.last_name}".strip()
        or request.user.username
        or ''
    ).strip()
    raw_phone = str(data.get('phone') if 'phone' in data else (getattr(profile, 'phone', '') or '')).strip()
    raw_region = str(data.get('region') if 'region' in data else (getattr(profile, 'region', '') or '')).strip()

    if len(raw_name) < 2 or len(raw_name) > 150:
        return Response({'error': "Ism va familiyangizni to'liq kiriting (kamida 2 ta harf)."}, status=400)

    digits = re.sub(r'\D', '', raw_phone)
    if len(digits) < 7 or len(digits) > 15:
        return Response({'error': "Telefon raqamni to'g'ri formatda kiriting (masalan: +998 90 123 45 67)."}, status=400)

    now = timezone.now()
    mock_plan = SubscriptionPlan.objects.filter(plan_type='mock_test', is_active=True).order_by('order').first()
    effective_price = float(test.price) if test.price is not None else (float(mock_plan.price) if (test.is_premium and mock_plan) else 0.0)
    is_free = (not test.is_premium) or effective_price <= 0

    with transaction.atomic():
        locked_profile = Profile.objects.select_for_update().get(pk=profile.pk)
        profile_updates = []
        if raw_region and getattr(locked_profile, 'region', '') != raw_region[:64]:
            locked_profile.region = raw_region[:64]
            profile_updates.append('region')
        if profile_updates:
            locked_profile.save(update_fields=profile_updates)

        is_unlocked = (
            is_free
            or locked_profile.is_vip_active
            or locked_profile.premium_mock_test_unlocked
            or (test.id in unlocked_test_ids(locked_profile))
        )
        existing_payment = Payment.objects.filter(profile=locked_profile, test=test).order_by('-created_at').first()

        reg = MockRegistration.objects.select_for_update().filter(profile=locked_profile, test=test).first()
        if reg and reg.status == 'DISQUALIFIED':
            return Response({'error': "Siz ushbu mock imtihonidan chetlatilgansiz.", 'code': 'DISQUALIFIED'}, status=403)

        target_status = 'CONFIRMED' if is_unlocked else 'PENDING_PAYMENT'
        if reg is None:
            reg = MockRegistration.objects.create(
                profile=locked_profile,
                test=test,
                full_name=raw_name[:150],
                phone=raw_phone[:30],
                region=raw_region[:80],
                status=target_status,
                confirmed_at=now if target_status == 'CONFIRMED' else None,
                payment=existing_payment,
            )
            created = True
        else:
            reg.full_name = raw_name[:150]
            reg.phone = raw_phone[:30]
            if raw_region:
                reg.region = raw_region[:80]
            if reg.status != 'CONFIRMED':
                reg.status = target_status
            if reg.status == 'CONFIRMED' and not reg.confirmed_at:
                reg.confirmed_at = now
            if existing_payment and not reg.payment_id:
                reg.payment = existing_payment
            reg.save()
            created = False

        test.remind_users.add(request.user)

    checkout_url = f"/premium/checkout/{mock_plan.id}?test={test.id}" if (reg.status == 'PENDING_PAYMENT' and mock_plan) else None
    return Response({
        'created': created,
        'id': reg.id,
        'registration_id': reg.registration_id,
        'status': reg.status,
        'full_name': reg.full_name,
        'phone': reg.phone,
        'region': reg.region,
        'requires_payment': reg.status == 'PENDING_PAYMENT',
        'is_unlocked': reg.status == 'CONFIRMED',
        'price': effective_price,
        'plan_id': mock_plan.id if mock_plan else None,
        'checkout_url': checkout_url,
    }, status=201 if created else 200)


@api_view(['GET'])
@permission_classes([AllowAny])
def mock_leaderboard_api(request, test_id):
    """Respublika Mock imtihoni rasmiy reyting jadvali (PII yashirilgan, adolatli tie-break)."""
    test = get_object_or_404(TestSet.objects.select_related('subject'), id=test_id, is_published=True, is_archived=False)
    req_profile_id = getattr(getattr(request.user, 'profile', None), 'id', None) if request.user and request.user.is_authenticated else None

    attempts_qs = (
        Attempt.objects
        .filter(test=test, is_completed=True)
        .select_related('profile__user')
        .order_by('-score', '-correct_answers', 'completed_at', 'id')
    )
    regs_by_profile = {
        r.profile_id: r
        for r in MockRegistration.objects.filter(test=test)
    }

    # Har bir o'quvchining birinchi yakunlangan urinishini olamiz (dublikat urinish bo'lmasligi uchun)
    seen_profiles = set()
    valid_entries = []
    disqualified_entries = []
    total_q_default = test.questions.count() or 30

    for a in attempts_qs:
        if a.profile_id in seen_profiles:
            continue
        seen_profiles.add(a.profile_id)
        reg = regs_by_profile.get(a.profile_id)
        is_disq = bool(a.is_cheating_flagged or (reg and reg.status == 'DISQUALIFIED'))

        duration_sec = 999999
        if a.started_at and a.completed_at:
            try:
                duration_sec = max(0, int((a.completed_at - a.started_at).total_seconds()))
            except Exception:
                duration_sec = 999999

        mins, secs = divmod(duration_sec if duration_sec < 999999 else 0, 60)
        duration_str = f"{mins} daq {secs} son" if mins > 0 else f"{secs} son"

        u = a.profile.user if a.profile else None
        student_name = (
            (reg.full_name if reg and reg.full_name else '')
            or (f"{getattr(u, 'first_name', '')} {getattr(u, 'last_name', '')}".strip() if u else '')
            or (getattr(u, 'username', '') if u else '')
            or "Ishtirokchi"
        )
        region = (reg.region if reg and reg.region else '') or (getattr(a.profile, 'region', '') if a.profile else '') or ''
        score_val = round(float(a.score or 0.0), 1)
        c_ans = a.correct_answers or 0
        w_ans = a.wrong_answers or 0
        s_ans = a.skipped_answers or 0
        tot_q = (c_ans + w_ans + s_ans) or total_q_default

        entry = {
            'attempt_id': a.id,
            'student_name': student_name,
            'region': region,
            'registration_id': reg.registration_id if reg else None,
            'score': score_val,
            'correct_answers': c_ans,
            'wrong_answers': w_ans,
            'total_questions': tot_q,
            'duration_seconds': duration_sec if duration_sec < 999999 else None,
            'duration_str': duration_str,
            'completed_at': a.completed_at.isoformat() if a.completed_at else None,
            'is_disqualified': is_disq,
            'prize_status': reg.prize_status if reg else 'NOT_ELIGIBLE',
            'prize_title': reg.prize_title if reg else '',
            'is_me': bool(req_profile_id and a.profile_id == req_profile_id),
            '_sort_key': (-score_val, -c_ans, duration_sec, a.completed_at.timestamp() if a.completed_at else 0, a.id),
        }
        if is_disq:
            disqualified_entries.append(entry)
        else:
            valid_entries.append(entry)

    valid_entries.sort(key=lambda x: x['_sort_key'])
    leaderboard = []
    my_rank = None
    for idx, item in enumerate(valid_entries, start=1):
        item.pop('_sort_key', None)
        item['rank'] = idx
        if item['is_me']:
            my_rank = idx
        leaderboard.append(item)

    for item in disqualified_entries:
        item.pop('_sort_key', None)
        item['rank'] = None
        leaderboard.append(item)

    return Response({
        'test_id': test.id,
        'test_title': test.title,
        'subject': test.subject.name if test.subject else 'Asosiy',
        'prize_description': getattr(test, 'prize_description', '') or '',
        'total_completed': len(valid_entries),
        'my_rank': my_rank,
        'results': leaderboard[:200],
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsChannelSubscribed])
def toggle_mock_reminder_api(request, test_id):
    test = get_object_or_404(TestSet, id=test_id)
    user = request.user
    if test.remind_users.filter(id=user.id).exists():
        test.remind_users.remove(user)
        reminded = False
    else:
        test.remind_users.add(user)
        reminded = True
    return Response({'reminded': reminded, 'message': "Eslatma yoqildi" if reminded else "Eslatma o'chirildi"})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mock_broadcast_api(request, test_id):
    """O'qituvchi yoki admin tomonidan jonli mock xabarini Telegramga darhol chiqarish."""
    test = get_object_or_404(TestSet, id=test_id)
    user = request.user
    if not (user.is_superuser or user.is_staff or test.created_by == user):
        return Response({'detail': "Faqat test muallifi yoki admin xabar yuborishi mumkin."}, status=403)

    send_all = request.data.get('send_all')
    if send_all is None:
        send_all = getattr(test, 'notify_all', True)
    else:
        send_all = bool(send_all)

    from telegrambot.mock_notifier import send_mock_announcement
    background.submit(send_mock_announcement, test.id, send_all=send_all)
    return Response({'ok': True, 'queued': True, 'message': "Xabarnoma yuborish fon rejimida boshlandi."})


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsChannelSubscribed])
def start_random_test_api(request):
    seed_questions_if_needed()
    profile = ensure_profile_for_user(request.user)
    subject, _ = _resolve_subject(request)

    # Faqat id'lar olinadi: ilgari butun savol banki (matn, HTML) har so'rovda xotiraga
    # yuklanib aralashtirilardi.
    pool = Question.objects.filter(subject=subject) if subject else Question.objects.all()
    q_ids = list(pool.values_list('id', flat=True))
    if not q_ids:
        return Response({'error': "Bu fanda hali savollar yo'q."}, status=400)

    import random
    picked = random.sample(q_ids, min(10, len(q_ids)))
    questions_to_use = list(Question.objects.filter(id__in=picked))
    random.shuffle(questions_to_use)

    test = TestSet.objects.create(
        title=f"Tasodifiy {subject.name if subject else 'Tarix'} Testi",
        description="Tanlangan fandan tasodifiy tuzilgan savollar to'plami.",
        subject=subject, category='history', duration_minutes=10, is_random=True, is_premium=False,
    )
    test.questions.set(questions_to_use)
    attempt = Attempt.objects.create(profile=profile, test=test)
    AttemptAnswer.objects.bulk_create([AttemptAnswer(attempt=attempt, question=q) for q in questions_to_use])
    return Response({'attempt_id': attempt.id})


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsChannelSubscribed])
def start_mistakes_test_api(request):
    profile = ensure_profile_for_user(request.user)
    subject, _ = _resolve_subject(request)

    wrong_answers = (AttemptAnswer.objects
                      .filter(attempt__profile=profile, attempt__is_completed=True, is_correct=False)
                      .select_related('question').order_by('-attempt__completed_at'))
    if subject:
        wrong_answers = wrong_answers.filter(question__subject=subject)

    seen, questions_to_use = set(), []
    for ans in wrong_answers:
        if ans.question_id in seen or ans.is_skipped:
            continue
        seen.add(ans.question_id)
        questions_to_use.append(ans.question)
        if len(questions_to_use) >= 15:
            break

    if not questions_to_use:
        return Response({'error': "Bu fanda hali xato javoblaringiz yo'q."}, status=400)

    test = TestSet.objects.create(
        title="Xatolar ustida ishlash", description="Avval noto'g'ri javob bergan savollaringizdan tuzilgan mashq testi.",
        subject=subject, category='history', duration_minutes=max(5, len(questions_to_use)),
        is_random=True, is_premium=False,
    )
    test.questions.set(questions_to_use)
    attempt = Attempt.objects.create(profile=profile, test=test)
    # bulk create attempt answers
    AttemptAnswer.objects.bulk_create([AttemptAnswer(attempt=attempt, question=q) for q in questions_to_use])
    return Response({'attempt_id': attempt.id})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def mistakes_summary_api(request):
    """Foydalanuvchining umumiy va fanlar kesimidagi xato savollar tahlili."""
    profile = ensure_profile_for_user(request.user)

    wrong_answers = (AttemptAnswer.objects
                      .filter(attempt__profile=profile, attempt__is_completed=True, is_correct=False)
                      .select_related('question__subject')
                      .order_by('-attempt__completed_at'))

    seen = set()
    unique_mistakes = []
    subject_counts = {}

    for ans in wrong_answers:
        if not ans.question or ans.question_id in seen or ans.is_skipped:
            continue
        seen.add(ans.question_id)
        q = ans.question
        s_name = q.subject.name if q.subject else "Umumiy"
        s_slug = q.subject.slug if q.subject else "all"
        subject_counts[s_name] = subject_counts.get(s_name, 0) + 1

        if len(unique_mistakes) < 10:
            unique_mistakes.append({
                'id': q.id,
                'body': q.body[:200] if q.body else "",
                'subject_name': s_name,
                'subject_slug': s_slug,
                'difficulty': q.difficulty,
                'explanation': q.explanation[:160] if q.explanation else "",
            })

    return Response({
        'total_mistakes': len(seen),
        'subject_counts': [{'name': k, 'count': v} for k, v in subject_counts.items()],
        'recent_mistakes': unique_mistakes,
    })


def _question_screen_data(attempt, q_idx, current_answer, total_questions, seconds_left=None):
    question = current_answer.question
    data = {
        'attempt_id': attempt.id,
        'is_stress_mode': attempt.is_stress_mode,
        'anti_cheat': anti_cheat_enabled(attempt),
        'titul_answers': attempt.titul_answers or {},
        'test_title': attempt.test.title if attempt.test else "BMB Rasmiy Test",
        'subject_name': attempt.test.subject.name if (attempt.test and attempt.test.subject) else "BMB Standart",
        'q_idx': q_idx,
        'total_questions': total_questions,
        'has_prev': q_idx > 1,
        'has_next': q_idx < total_questions,
        'prev_idx': q_idx - 1,
        'next_idx': q_idx + 1,
        'question': {
            'id': question.id,
            'body': question.body,
            'type': 'single_choice' if question.question_type == 'mcq' else question.question_type,
            'difficulty': question.difficulty,
            'image': question.image.url if question.image else (question.image_url or ''),
            'image_position': question.image_position,
            'audio_url': question.audio_url or '',
        },
    }
    if seconds_left is not None:
        data['seconds_left'] = seconds_left

    qtype = 'single_choice' if question.question_type == 'mcq' else question.question_type
    if qtype in Question.SINGLE_ANSWER_TYPES or qtype == 'single_choice':
        data['choices'] = [{'id': c.id, 'text': c.text} for c in question.choices.all()]
        data['selected_choice_id'] = current_answer.selected_choice_id
    elif qtype == 'matching':
        pairs = list(question.matching_pairs.all())
        submitted = current_answer.matching_data or {}
        data['matching_options'] = [{'right_key': p.right_key, 'right_text': p.right_text} for p in pairs]
        data['matching_rows'] = [
            {'left_key': p.left_key, 'left_text': p.left_text, 'selected_right_key': submitted.get(p.left_key, '')}
            for p in pairs if p.left_key
        ]
    elif qtype == 'grouped_item':
        data['group_instruction'] = question.group.instruction if question.group_id else ''
        data['group_options'] = (
            [{'id': o.id, 'label': o.label, 'text': o.text} for o in question.group.options.all()]
            if question.group_id else []
        )
        data['selected_group_option_id'] = current_answer.grouped_option_id
    elif qtype == 'open_written':
        sub_qs = list(question.sub_questions.all())
        submitted_open = current_answer.open_answers or {}
        data['sub_question_rows'] = [
            {'label': sq.label, 'text': sq.text, 'answer': submitted_open.get(sq.label, '')} for sq in sub_qs
        ]
        data['text_answer'] = current_answer.text_answer
    elif qtype in Question.TEXT_INPUT_TYPES:
        data['text_answer'] = current_answer.text_answer
        data['max_words'] = question.max_words
        if qtype == 'tfng':
            data['tfng_options'] = question.tfng_options
    elif qtype == 'writing_task':
        data['text_answer'] = current_answer.text_answer
        data['min_words'] = question.min_words
        data['max_words'] = question.max_words

    return data


def _get_answers_and_current(attempt, q_idx):
    answers = list(attempt.answers.select_related('question').all().order_by('id'))
    total = len(answers)
    if total == 0:
        return None, None, 0
    q_idx = max(1, min(q_idx, total))
    return answers, answers[q_idx - 1], total


@api_view(['GET'])
def question_api(request, attempt_id):
    attempt = get_object_or_404(Attempt, id=attempt_id, profile=request.user.profile)
    if attempt.is_completed:
        return Response({'error': 'attempt already finished', 'completed': True}, status=409)

    q_idx = int(request.GET.get('q_idx', 1))
    answers, current_answer, total = _get_answers_and_current(attempt, q_idx)
    if current_answer is None:
        return Response({'error': 'no questions'}, status=404)
    q_idx = max(1, min(q_idx, total))

    return Response(_question_screen_data(attempt, q_idx, current_answer, total, attempt.seconds_left()))


@api_view(['POST'])
def answer_api(request, attempt_id):
    attempt = get_object_or_404(Attempt, id=attempt_id, profile=request.user.profile)
    if attempt.is_completed:
        return Response({'error': 'attempt already finished', 'completed': True}, status=409)

    # Vaqt serverda tugagan bo'lsa, javob qabul qilinmaydi: aks holda taymer nolga
    # tushgach ham (masalan brauzer yopilib qayta ochilsa) javob yozish mumkin bo'lardi.
    if attempt.is_time_up:
        return Response({'error': 'time_up', 'time_up': True,
                          'message': "Test vaqti tugadi."}, status=409)

    question_id = request.data.get('question_id')
    q_idx = int(request.data.get('q_idx', 1))
    answer = get_object_or_404(AttemptAnswer, attempt=attempt, question_id=question_id)

    apply_answer(answer, request.data)
    answer.save()

    answers, current_answer, total = _get_answers_and_current(attempt, q_idx)
    if current_answer is None:
        return Response({'error': 'no questions'}, status=404)
    return Response(_question_screen_data(attempt, q_idx, current_answer, total))


@api_view(['POST'])
@transaction.atomic
def finish_api(request, attempt_id):
    attempt = get_object_or_404(Attempt, id=attempt_id, profile=request.user.profile)
    if attempt.is_completed:
        return Response({'attempt_id': attempt.id, 'already_completed': True})

    answers = list(
        attempt.answers
        .select_related('question__topic', 'selected_choice', 'grouped_option', 'question__correct_group_option')
        .prefetch_related('question__choices', 'question__matching_pairs')
    )
    total = len(answers)
    if total == 0:
        return Response({'error': 'no questions'}, status=400)

    open_written_answers = [a for a in answers if a.question.question_type == 'open_written' and not a.is_skipped]
    grading_items, item_targets = [], []
    for a in open_written_answers:
        sub_qs = list(a.question.sub_questions.all())
        if sub_qs:
            submitted = a.open_answers or {}
            for sq in sub_qs:
                student_answer = submitted.get(sq.label, '')
                if not student_answer.strip():
                    continue
                grading_items.append({'question_text': f"{a.question.body} — qism {sq.label})",
                                       'reference_answer': sq.reference_answer, 'student_answer': student_answer})
                item_targets.append((a, sq))
        else:
            grading_items.append({'question_text': a.question.body, 'reference_answer': a.question.reference_answer,
                                   'student_answer': a.text_answer})
            item_targets.append((a, None))

    if grading_items:
        results = grade_open_answers(grading_items)
        if results:
            per_answer_entries = {}
            for (a, sq), result in zip(item_targets, results):
                per_answer_entries.setdefault(a.id, []).append((sq, result))
            for a in open_written_answers:
                entries = per_answer_entries.get(a.id)
                if not entries:
                    continue
                if entries[0][0] is None:
                    _, result = entries[0]
                    a.is_correct = result['is_correct']
                    a.ai_grading_note = result['note'][:300]
                    a.save(update_fields=['is_correct', 'ai_grading_note'])
                else:
                    total_parts = a.question.sub_questions.count()
                    correct_parts = sum(1 for _, r in entries if r.get('is_correct'))
                    a.is_correct = (correct_parts == total_parts)
                    a.open_grading = {sq.label: {'is_correct': r['is_correct'], 'note': r['note'][:300]} for sq, r in entries}
                    if correct_parts > 0 and correct_parts < total_parts:
                        a.ai_grading_note = f"{total_parts} ta qismdan {correct_parts} tasi to'g'ri topildi."
                    elif a.is_correct:
                        a.ai_grading_note = "Barcha qismlar to'g'ri topildi."
                    else:
                        a.ai_grading_note = "Javoblar to'g'ri kelmadi."
                    a.save(update_fields=['is_correct', 'open_grading', 'ai_grading_note'])

    # Writing topshirig'i to'g'ri/xato deb sanalmaydi — u alohida, mezonlar bo'yicha
    # (0-5 ball va CEFR darajasi) baholanadi va tekshiruvi premium. Shuning uchun u
    # foizli natijaning maxrajiga kirmaydi: aks holda esse yozgan o'quvchi shu savol
    # hisobiga avtomatik "xato" olardi.
    scored = [a for a in answers if a.question.question_type != 'writing_task']
    scored_total = len(scored)

    # SubQuestion qismlarini proporsional hisoblash: masalan 2 ta qismdan 1 tasi to'g'ri bo'lsa,
    # 0.5 ball qo'shiladi — o'quvchining to'g'ri topgan qismi bekor ketmaydi.
    correct_points = 0.0
    fully_or_partially_correct = 0
    for a in scored:
        if a.question.question_type == 'open_written' and a.question.sub_questions.exists():
            total_parts = a.question.sub_questions.count()
            if a.open_grading and total_parts > 0:
                parts_correct = sum(1 for v in a.open_grading.values() if v.get('is_correct'))
                correct_points += (parts_correct / total_parts)
                if parts_correct > 0:
                    fully_or_partially_correct += 1
            elif a.is_correct:
                correct_points += 1.0
                fully_or_partially_correct += 1
        elif a.is_correct:
            correct_points += 1.0
            fully_or_partially_correct += 1

    score = round((correct_points / scored_total) * 100, 1) if scored_total else 0.0
    correct = fully_or_partially_correct
    skipped = sum(1 for a in scored if a.is_skipped)
    wrong = max(0, scored_total - correct - skipped)

    # ─── BMB Titul Varaqasi (Bubble Sheet) va Stress Tahlili ────────
    client_titul = request.data.get('titul_answers') if (hasattr(request, 'data') and isinstance(request.data, dict)) else None
    # Vaqt tugaganidan keyin yuborilgan titul qabul qilinmaydi — serverda vaqt ichida
    # (/bubble-answer/) saqlangan titul hisoblanadi.
    if client_titul and isinstance(client_titul, dict) and not attempt.is_time_up:
        current_titul = attempt.titul_answers or {}
        current_titul.update({str(k): str(v).upper() for k, v in client_titul.items()})
        attempt.titul_answers = current_titul

    stress_cfg = StressExamConfig.load()
    if attempt.is_stress_mode:
        titul_map = attempt.titul_answers or {}
        titul_correct = 0
        draft_correct = correct
        unfilled_count = 0
        misaligned_count = 0

        for idx, a in enumerate(scored, 1):
            s_idx = str(idx)
            chosen_bubble = titul_map.get(s_idx)
            qtype = a.question.question_type
            if qtype in Question.SINGLE_ANSWER_TYPES or qtype == 'single_choice' or qtype == 'mcq':
                choices_list = list(a.question.choices.all())
                correct_letter = None
                draft_letter = None
                for c_i, c in enumerate(choices_list):
                    c_letter = chr(65 + c_i)
                    if c.is_correct:
                        correct_letter = c_letter
                    if a.selected_choice_id == c.id:
                        draft_letter = c_letter

                if not chosen_bubble:
                    unfilled_count += 1
                elif draft_letter and chosen_bubble != draft_letter:
                    misaligned_count += 1

                if chosen_bubble and chosen_bubble == correct_letter:
                    titul_correct += 1
            else:
                if a.is_correct:
                    titul_correct += 1

        if stress_cfg.require_bubble_sheet and scored_total > 0:
            score = round((titul_correct / scored_total) * 100, 1)
            correct = titul_correct
            wrong = max(0, scored_total - correct - skipped)

        lost_pts = max(0.0, round(((draft_correct - titul_correct) / max(1, scored_total)) * 100, 1))
        attempt.stress_stats = {
            'is_stress_mode': True,
            'draft_score': round((draft_correct / max(1, scored_total)) * 100, 1),
            'titul_score': score,
            'draft_correct': draft_correct,
            'titul_correct': titul_correct,
            'unfilled_on_titul': unfilled_count,
            'misaligned_on_titul': misaligned_count,
            'lost_points': lost_pts,
            'dtm_simulated_ball': round(correct * 3.1, 1),
            'stress_level': 'hardcore',
        }

    attempt.correct_answers = correct
    attempt.wrong_answers = wrong
    attempt.skipped_answers = skipped
    attempt.score = score
    attempt.is_completed = True
    attempt.completed_at = timezone.now()

    # ─── Anti-Cheat: 3 soniyalik Vaqt filtri ("Tavakkal bosish") ───────────────────
    # Agar savolga 3 soniyadan kam vaqtda (< 3s) javob berilgan bo'lsa, bu "Tavakkal bosish"
    # deb hisoblanadi va ball berilmaydi.
    rushed_answers_count = 0
    for a in scored:
        if a.time_spent_sec is not None and 0 < a.time_spent_sec < 3 and a.is_correct:
            a.is_correct = False
            a.ai_grading_note = "3 soniyadan tez belgilandi (Tavakkal bosish)."
            a.save(update_fields=['is_correct', 'ai_grading_note'])
            rushed_answers_count += 1

    if rushed_answers_count > 0:
        correct_points = max(0.0, correct_points - rushed_answers_count)
        correct = max(0, correct - rushed_answers_count)
        wrong = max(0, scored_total - correct - skipped)
        score = round((correct_points / scored_total) * 100, 1) if scored_total else 0.0
        attempt.correct_answers = correct
        attempt.wrong_answers = wrong
        attempt.score = score

    # ─── Anti-Cheat: Speed Detection ─────────────────────────────────
    # Agar test juda tez topshirilsa — bayroq tiklanadi.
    # Shubhali chegara: ajratilgan vaqtning 20% dan kamida tugallangan va kamida 10 ta savol.
    if attempt.started_at and scored_total >= 10:
        elapsed = (attempt.completed_at - attempt.started_at).total_seconds()
        allowed = (attempt.test.duration_minutes * 60) if attempt.test else 600
        if elapsed < allowed * 0.20:
            attempt.is_speed_flagged = True

    # Tab almashishlar soni endi serverda (/tab-switch/) yuritiladi; klient yuborgan
    # qiymat bilan uni kamaytirib yoki nolga tushirib bo'lmaydi.

    # ─── Rasch Modeli (IRT) Hisoblash ─────────────────────────────────
    rasch_metrics = None
    try:
        from tests_app.services.rasch import evaluate_attempt_rasch
        rasch_metrics = evaluate_attempt_rasch(attempt)
        if not isinstance(attempt.annotations, dict):
            attempt.annotations = {}
        attempt.annotations['rasch'] = rasch_metrics
    except Exception as e:
        logger.warning(f"Rasch baholashda xatolik: {e}")

    # Yakunlashni atomik "egallash": ikki marta bosilgan tugma yoki parallel so'rov
    # ikkalasi ham yuqoridagi `is_completed` tekshiruvidan o'tib, XP/tangani ikki marta
    # berardi. Faqat qatorni birinchi bo'lib False -> True qilgan so'rov davom etadi.
    if not Attempt.objects.filter(pk=attempt.pk, is_completed=False).update(is_completed=True):
        return Response({'attempt_id': attempt.id, 'already_completed': True})
    attempt.save()

    profile = request.user.profile
    # Mukofot faqat testni BIRINCHI marta yakunlaganda beriladi. Ilgari bir testni
    # qayta-qayta topshirib (javoblar natija sahifasida ko'rinadi) cheksiz XP va tanga
    # yig'ish, reytingni sun'iy ko'tarish mumkin edi.
    is_repeat = bool(attempt.test_id) and Attempt.objects.filter(
        profile=profile, test_id=attempt.test_id, is_completed=True,
    ).exclude(pk=attempt.pk).exists()
    if not is_repeat and attempt.test and getattr(attempt.test, 'is_random', False):
        from core.reward_caps import claim_daily_reward
        if not claim_daily_reward(profile.id, 'random_test'):
            is_repeat = True
    # ─── Anti-Cheat: Aniqlik koeffitsiyenti (kamida 60%) ───────────────────────────
    # Testning kamida 60% qismi to'g'ri topilmaguncha, Streak ham, XP ham hisoblanmaydi.
    meets_accuracy = bool(score >= 60.0)
    multiplier = stress_cfg.bonus_xp_multiplier if (attempt.is_stress_mode and stress_cfg.bonus_xp_multiplier > 1.0) else 1.0
    xp_awarded = 0 if (profile.is_privileged or is_repeat or not meets_accuracy) else int(correct * 50 * multiplier)
    coins_awarded = 0 if (is_repeat or not meets_accuracy) else int(correct * 5 * (1.5 if attempt.is_stress_mode else 1.0))
    # Barqarorlik koeffitsiyenti (streak 3/7/14/30 kun → 1.2x/1.5x/1.75x/2x) — dashboard'da va'da qilingan.
    stability_bonus_coins = int(coins_awarded * (profile.stability_multiplier - 1.0))
    coins_awarded += stability_bonus_coins
    # Do'stlik Zanjiri: test hisoblanadi; bugun ikkala do'st ham ishlagan bo'lsa tanga 1.5x.
    buddy_bonus_coins = 0
    if meets_accuracy and not is_repeat:
        from core.services import buddy_coin_bonus
        buddy_bonus_coins = buddy_coin_bonus(profile, coins_awarded)
        coins_awarded += buddy_bonus_coins
    profile.add_xp(xp_awarded)
    profile.add_coins(coins_awarded)
    if meets_accuracy and not is_repeat:
        profile.update_streak()
        profile.refresh_dtm_estimate()

    # O'zgaruvchan Mukofot (Variable Reward): 25% omadli test bonusi
    lucky_bonus = None
    if not profile.is_privileged and not is_repeat:
        try:
            from core.rewards import roll_test_lucky_bonus
            lucky_bonus = roll_test_lucky_bonus(profile, correct, xp_awarded, coins_awarded)
        except Exception as e:
            logger.warning(f"Failed to roll test lucky bonus: {e}")

    subject = attempt.test.subject if attempt.test else None
    if subject and xp_awarded:
        from .models import SubjectScore
        score_row, _ = SubjectScore.objects.get_or_create(profile=profile, subject=subject)
        score_row.xp = F('xp') + xp_awarded
        score_row.save(update_fields=['xp'])

    # ─── Teacher Telegram Notification ──────────────────────────────────
    try:
        if attempt.test and attempt.test.created_by:
            teacher_user = attempt.test.created_by
            teacher_profile = getattr(teacher_user, 'profile', None)
            if teacher_profile and teacher_profile.telegram_id and request.user != teacher_user:
                from telegrambot.client import send_message
                student_name = f"{request.user.first_name} {request.user.last_name}".strip() or request.user.username
                tg_user = f" (@{profile.telegram_username})" if profile.telegram_username else ""
                msg = (
                    f"🎓 <b>O'quvchingiz test topshirdi!</b>\n\n"
                    f"📝 <b>Test:</b> {attempt.test.title}\n"
                    f"👤 <b>O'quvchi:</b> {student_name}{tg_user}\n"
                    f"📊 <b>Natija:</b> {score}% ({correct}/{scored_total})\n"
                    f"⏱ <b>Vaqt:</b> {timezone.localtime(attempt.completed_at).strftime('%d.%m.%Y %H:%M')}\n\n"
                    f"<i>Batafsil natijalarni o'qituvchi panelida ko'rishingiz mumkin.</i>"
                )
                send_message(int(teacher_profile.telegram_id), msg)
    except Exception as e:
        logger.warning(f"Failed to send teacher telegram notification: {e}")

    # Batch revision items update (yuqori yuklamada so'rovlar sonini 95% ga qisqartiradi)
    unskipped = [ans for ans in scored if not ans.is_skipped]
    wrong_q_map = {ans.question_id: ans.question for ans in unskipped if not ans.is_correct}
    correct_q_ids = [ans.question_id for ans in unskipped if ans.is_correct]

    if wrong_q_map or correct_q_ids:
        now_dt = timezone.now()
        if correct_q_ids:
            RevisionItem.objects.filter(profile=profile, question_id__in=correct_q_ids, mastered=False).update(
                mastered=True, times_reviewed=F('times_reviewed') + 1, last_reviewed_at=now_dt
            )

        if wrong_q_map:
            existing_items = {
                r.question_id: r for r in RevisionItem.objects.filter(
                    profile=profile, question_id__in=wrong_q_map.keys()
                )
            }
            to_create = []
            to_update = []
            for q_id, q_obj in wrong_q_map.items():
                if q_id in existing_items:
                    r = existing_items[q_id]
                    r.times_wrong = F('times_wrong') + 1
                    r.mastered = False
                    r.updated_at = now_dt
                    to_update.append(r)
                else:
                    to_create.append(RevisionItem(
                        profile=profile,
                        question=q_obj,
                        subject=q_obj.subject,
                        times_wrong=1,
                        mastered=False
                    ))

            if to_create:
                RevisionItem.objects.bulk_create(to_create, ignore_conflicts=True)
            if to_update:
                RevisionItem.objects.bulk_update(to_update, ['times_wrong', 'mastered', 'updated_at'])

    from analytics.services import bust_cache as _bust_analytics
    _bust_analytics(profile.pk)

    # "Test yechish" vazifasi faqat haqiqatan yechilgan test uchun: kamida yarmiga javob
    # berilgan va hech bo'lmasa bitta to'g'ri. Ilgari 1 ta xato javob bilan tugatilgan test
    # ham vazifa mukofotini (+150 XP) berardi (audit FE-005). Takroriy test hisobga olinmaydi.
    answered = correct + wrong
    if not is_repeat and correct > 0 and scored_total and answered * 2 >= scored_total:
        from core.missions import advance_missions
        advance_missions(profile, 'test')

    _dispatch_ai_feedback(attempt.id)

    return Response({
        'attempt_id': attempt.id,
        'score': score,
        'correct': correct,
        'wrong': wrong,
        'skipped': skipped,
        'xp_awarded': xp_awarded,
        'coins_awarded': coins_awarded,
        'buddy_bonus_coins': buddy_bonus_coins,
        'stability_bonus_coins': stability_bonus_coins,
        'streak': profile.streak,
        'meets_accuracy': meets_accuracy,
        'rushed_answers_count': rushed_answers_count,
        'estimated_dtm_score': profile.estimated_dtm_score,
        'lucky_bonus': lucky_bonus,
        'rasch': rasch_metrics,
    })


@api_view(['GET'])
def feedback_api(request, attempt_id):
    attempt = get_object_or_404(Attempt.objects.select_related('test'), id=attempt_id, profile=request.user.profile)
    if not attempt.is_completed:
        return Response({'error': 'attempt not finished'}, status=409)

    ai_feedback = AIFeedback.objects.filter(attempt=attempt).first()
    if not ai_feedback:
        _dispatch_ai_feedback(attempt.id)
        return Response({'status': 'pending'})

    # Rasch model ma'lumotlarini olish / hisoblash
    rasch_data = (attempt.annotations or {}).get('rasch') if isinstance(attempt.annotations, dict) else None
    if rasch_data and (attempt.correct_answers or 0) == 0 and rasch_data.get('scaled_score', 0) > 0:
        rasch_data = None  # Eski xatolik bilan keshlangan rasch ma'lumotini yangilash

    if not rasch_data:
        try:
            from tests_app.services.rasch import evaluate_attempt_rasch
            rasch_data = evaluate_attempt_rasch(attempt)
            if not isinstance(attempt.annotations, dict):
                attempt.annotations = {}
            attempt.annotations['rasch'] = rasch_data
            attempt.save(update_fields=['annotations'])
        except Exception as e:
            logger.warning(f"Rasch feedback hisoblashda xatolik: {e}")

    # Savollar imtihon raqami bo'yicha tartiblanadi (CEFR uchun 1-35), raqami yo'q
    # savollar esa eski tartibda — id bo'yicha.
    answers = (attempt.answers
               .select_related('question', 'question__section', 'selected_choice',
                                'grouped_option', 'question__correct_group_option')
               .prefetch_related('question__choices', 'question__accepted_answers',
                                  'question__matching_pairs', 'question__sub_questions')
               .order_by('question__exam_number', 'question_id'))
    review_items = []
    for ans in answers:
        q = ans.question
        review_items.append({
            'question_id': q.id, 'body': q.body, 'is_correct': ans.is_correct, 'is_skipped': ans.is_skipped,
            'explanation': q.explanation, 'grading_note': ans.ai_grading_note,
            # Har bir savol turi uchun javob matni — bo'shliqli, TRUE/FALSE, moslashtirish
            # va guruhlangan savollar ham ko'rinadi (tests_app/services/review.py).
            **describe_answer(ans),
            'exam_number': q.exam_number,
            'type': q.question_type,
            'section': section_label(q),
            'writing': writing_payload(ans),
        })

    return Response({
        'status': 'ready',
        'attempt': {
            'id': attempt.id,
            'is_stress_mode': attempt.is_stress_mode,
            'stress_stats': attempt.stress_stats or {},
            'titul_answers': attempt.titul_answers or {},
            'score': attempt.score,
            'correct_answers': attempt.correct_answers,
            'wrong_answers': attempt.wrong_answers,
            'skipped_answers': attempt.skipped_answers,
            'test_title': attempt.test.title if attempt.test else 'Rasmiy Formatdagi Sinov Testi',
            'completed_at': attempt.completed_at.isoformat() if attempt.completed_at else None,
            'rasch': rasch_data,
        },
        'rasch': rasch_data,
        'overall_analysis': ai_feedback.overall_analysis,
        'weak_topics': [t.strip() for t in ai_feedback.weak_topics.split(',') if t.strip()],
        'strong_topics': [t.strip() for t in ai_feedback.strong_topics.split(',') if t.strip()],
        'recommendations': ai_feedback.recommendations,
        'predicted_score': (
            "— (0.0 ball)" if (attempt.correct_answers or 0) == 0
            else (f"{rasch_data['grade']} ({rasch_data['scaled_score']} ball)" if (rasch_data and rasch_data.get('grade')) else ai_feedback.predicted_score)
        ),
        'roadmap': ai_feedback.roadmap,
        'ai_motivation': ai_feedback.ai_motivation,
        'detailed_mistakes': ai_feedback.detailed_mistakes,
        'review_items': review_items,
        'daily_chest': (lambda p: {
            'can_claim': not p.daily_chest_claims.filter(date=timezone.localdate()).exists(),
            'streak': p.streak,
        })(request.user.profile),
    })


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def exam_survey_api(request, attempt_id):
    attempt = get_object_or_404(Attempt.objects.select_related('test'), id=attempt_id, profile=request.user.profile)

    if request.method == 'GET':
        existing = ExamSurvey.objects.filter(attempt=attempt, user=request.user).first()
        if existing:
            return Response({
                'submitted': True,
                'difficulty': existing.difficulty,
                'platform_rating': existing.platform_rating,
                'comment': existing.comment,
            })
        return Response({'submitted': False})

    data = request.data
    difficulty = data.get('difficulty', 'medium')
    if difficulty not in ('easy', 'medium', 'hard', 'very_hard'):
        difficulty = 'medium'
    try:
        platform_rating = max(1, min(5, int(data.get('platform_rating', 5))))
    except (TypeError, ValueError):
        platform_rating = 5
    comment = (data.get('comment') or '').strip()[:1000]

    survey, created = ExamSurvey.objects.update_or_create(
        attempt=attempt,
        user=request.user,
        defaults={
            'test': attempt.test,
            'difficulty': difficulty,
            'platform_rating': platform_rating,
            'comment': comment,
        }
    )

    admin_id = (getattr(settings, 'ADMIN_TELEGRAM_CHAT_ID', '') or '').strip()
    if admin_id and admin_id.isdigit():
        try:
            from telegrambot.client import send_message
            diff_labels = {'easy': "🟢 Oson", 'medium': "🟡 O'rtacha", 'hard': "🔴 Qiyin", 'very_hard': "🔥 Juda murakkab"}
            stars = "⭐" * platform_rating
            user_display = request.user.get_full_name() or request.user.username
            tg_user = f"@{request.user.username}" if request.user.username else user_display
            score_text = f"{attempt.score:.0f}%" if attempt.score is not None else "Noma'lum"

            msg = (
                f"📝 <b>Yangi Imtihon Fikr-Mulohazasi!</b>\n\n"
                f"👤 <b>O'quvchi:</b> {user_display} ({tg_user})\n"
                f"🎯 <b>Test:</b> {attempt.test.title}\n"
                f"📊 <b>Natija:</b> {score_text} ({attempt.correct_answers} to'g'ri)\n"
                f"⚖️ <b>Qiyinlik:</b> {diff_labels.get(difficulty, difficulty)}\n"
                f"✨ <b>Platforma bahosi:</b> {stars} ({platform_rating}/5)\n"
            )
            if comment:
                msg += f"💬 <b>Fikr/Taklif:</b> <i>{comment}</i>\n"
            send_message(int(admin_id), msg)
        except Exception as e:
            logger.warning("Admin telegram xabarnomasini yuborishda xatolik: %s", e)

    return Response({'ok': True, 'message': "Fikringiz uchun tashakkur!"})


@api_view(['GET'])
def history_api(request):
    attempts = (Attempt.objects.filter(profile=request.user.profile, is_completed=True)
                .select_related('test').order_by('-completed_at'))
    page_obj = Paginator(attempts, 25).get_page(request.GET.get('page'))
    return Response({
        'results': [{
            'id': a.id, 'test_title': a.test.title if a.test else 'Tasodifiy Test',
            'score': a.score, 'correct_answers': a.correct_answers, 'wrong_answers': a.wrong_answers,
            'skipped_answers': a.skipped_answers, 'completed_at': a.completed_at,
        } for a in page_obj],
        'page': page_obj.number, 'num_pages': page_obj.paginator.num_pages,
        'has_next': page_obj.has_next(), 'has_prev': page_obj.has_previous(),
    })


@api_view(['GET'])
def revision_api(request):
    profile = ensure_profile_for_user(request.user)
    base = RevisionItem.objects.filter(profile=profile)
    active = (base.filter(mastered=False).select_related('question', 'question__topic', 'subject')
              .prefetch_related('question__choices', 'question__accepted_answers'))

    subject_slug = request.GET.get('subject', '')
    topic_id = request.GET.get('topic', '')
    if subject_slug:
        active = active.filter(subject__slug=subject_slug)

    # Mavzular ro'yxati topic filtri QO'LLANISHIDAN OLDIN yig'iladi — aks holda mavzu
    # tanlangach ro'yxat bittaga qisqarib, boshqasiga o'tib bo'lmay qolardi.
    topic_rows = (active.exclude(question__topic__isnull=True)
                  .values('question__topic_id', 'question__topic__title')
                  .annotate(count=Count('id')).order_by('-count'))
    topics = [{'id': r['question__topic_id'], 'title': r['question__topic__title'],
               'count': r['count']} for r in topic_rows]

    if topic_id.isdigit():
        active = active.filter(question__topic_id=int(topic_id))

    deck = []
    for item in active[:50]:
        q = item.question
        is_choice = q.question_type in Question.SINGLE_ANSWER_TYPES
        # Bo'shliqli va TRUE/FALSE savollar ham dastada joyida yechiladi: ular AI'siz,
        # aniq solishtirish bilan baholanadi, ya'ni javobni shu yerda tekshirsa bo'ladi.
        is_text = q.question_type in Question.TEXT_INPUT_TYPES
        deck.append({
            'item_id': item.id, 'question_id': q.id, 'body': q.body, 'type': q.question_type,
            # `explanation` bu yerda yo'q: u odatda to'g'ri javobni aytadi — faqat
            # /revision/<id>/check/ javobidan keyin qaytadi.
            'image': q.image.url if q.image else (q.image_url or ''),
            'topic': q.topic.title if q.topic else '', 'times_wrong': item.times_wrong,
            'inline': is_choice or is_text,
            # 'choice' — variantlardan tanlanadi, 'text' — javob yoziladi (yoki
            # TRUE/FALSE/NOT GIVEN tugmalaridan tanlanadi).
            'answer_mode': 'text' if is_text else 'choice',
            'choices': [{'id': c.id, 'text': c.text} for c in q.choices.all()] if is_choice else [],
            'tfng_options': q.tfng_options if q.question_type == 'tfng' else [],
            'max_words': q.max_words,
        })

    return Response({
        'deck': deck, 'active_count': len(deck), 'total': base.count(),
        'mastered_count': base.filter(mastered=True).count(),
        'subjects': [{'id': s.id, 'name': s.name, 'slug': s.slug} for s in Subject.objects.all()],
        'selected_subject': subject_slug,
        'topics': topics,
        'selected_topic': topic_id if topic_id.isdigit() else '',
    })


@api_view(['POST'])
def revision_check_api(request, item_id):
    from django.core.cache import cache
    from django.db.models import F

    item = get_object_or_404(RevisionItem.objects.select_related('question'), id=item_id, profile=request.user.profile)
    q = item.question
    action = request.data.get('action', '')

    if action == 'master':
        is_inline = (q.question_type in Question.SINGLE_ANSWER_TYPES
                     or q.question_type in Question.TEXT_INPUT_TYPES)
        if is_inline:
            return Response(
                {'ok': False, 'error': "Bu savolni o'zlashtirish uchun to'g'ri javobni belgilang."},
                status=400,
            )
        item.mastered = True
        item.times_reviewed = F('times_reviewed') + 1
        item.last_reviewed_at = timezone.now()
        item.save(update_fields=['mastered', 'times_reviewed', 'last_reviewed_at', 'updated_at'])
        return Response({'ok': True, 'correct': True, 'mastered': True})

    choice_id = request.data.get('choice_id')
    correct_choice = q.choices.filter(is_correct=True).first()

    if q.question_type in Question.TEXT_INPUT_TYPES:
        from .models import normalize_gap_answer
        given = normalize_gap_answer(request.data.get('text_answer'))
        accepted = {a.normalized for a in q.accepted_answers.all()}
        is_correct = bool(given) and given in accepted
    else:
        is_correct = bool(choice_id and correct_choice and str(correct_choice.id) == str(choice_id))

    item.times_reviewed = F('times_reviewed') + 1
    item.last_reviewed_at = timezone.now()
    if is_correct:
        item.mastered = True
    item.save(update_fields=['times_reviewed', 'last_reviewed_at', 'mastered', 'updated_at'])

    explanation = q.explanation or ''
    if not is_correct and not explanation and correct_choice and q.question_type not in Question.TEXT_INPUT_TYPES:
        cache_key = f'ai_expl:{q.id}'
        explanation = cache.get(cache_key) or ''
        if not explanation:
            from django.utils.html import strip_tags
            ai_text = ask_groq([
                {'role': 'system', 'content': ("Sen o'quvchiga xatosini tushuntiradigan qisqa va aniq mentorsan. "
                                                "Faqat o'zbek tilida, 2-3 jumla bilan javob ber. Formulalar yoki "
                                                "keraksiz kirish so'zlarisiz, to'g'ridan-to'g'ri mohiyatni ayt.")},
                {'role': 'user', 'content': (f"Savol: {strip_tags(q.body)[:600]}\n"
                                              f"To'g'ri javob: {correct_choice.text[:200]}\n"
                                              f"Nega aynan shu javob to'g'ri ekanini qisqa tushuntir.")},
            ], temperature=0.4, timeout=12)
            if ai_text:
                explanation = ai_text.strip()[:800]
                cache.set(cache_key, explanation, 7 * 24 * 3600)

    return Response({
        'ok': True, 'correct': is_correct, 'mastered': is_correct,
        'correct_choice_id': correct_choice.id if correct_choice else None, 'explanation': explanation,
        # Bo'shliqli/TRUE-FALSE savol uchun to'g'ri javob matni — o'quvchi xato qilsa
        # darhol ko'radi (variantli savolda buni `correct_choice_id` bajaradi).
        'correct_answer': (' / '.join(a.text for a in q.accepted_answers.all())
                            if q.question_type in Question.TEXT_INPUT_TYPES else ''),
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def story_link_api(request, attempt_id):
    """Telegram Story uchun imzolangan rasm manzili.

    Manzil OCHIQ (imzo bilan himoyalangan), chunki rasmni Telegram serverlari yuklab
    oladi — ular JWT sarlavhasini yubormaydi. Shu sababli havolani faqat urinish egasi
    oladi, lekin havolaning o'zi autentifikatsiyasiz ochiladi.
    """
    from .story import sign_attempt

    attempt = get_object_or_404(Attempt, id=attempt_id, profile=request.user.profile)
    if not attempt.is_completed:
        return Response({'error': 'attempt not finished'}, status=409)

    base = (getattr(settings, 'FRONTEND_URL', '') or getattr(settings, 'WEBAPP_URL', '') or '').rstrip('/')
    if not base or 'localhost' in base or '127.0.0.1' in base:
        base = request.build_absolute_uri('/').rstrip('/')
    if 'localhost' in base or '127.0.0.1' in base:
        base = 'https://ilmildizi.uz'

    path = f'/api/tests/attempts/{attempt.id}/story/?sig={sign_attempt(attempt.id)}'
    media_url = f'{base}{path}'
    if media_url.startswith('http://') and not ('localhost' in media_url or '127.0.0.1' in media_url):
        media_url = 'https://' + media_url[7:]

    return Response({
        'media_url': media_url,
        'text': f"IlmIldizi'da {round(attempt.score or 0)}% natija oldim!",
    })


@api_view(['GET'])
@authentication_classes([])
@permission_classes([AllowAny])
def story_image_api(request, attempt_id):
    """Natija kartasi (PNG) — saytdagi Pastel Studio kartasi bilan bir xil.

    `?kind=story` (standart) — Telegram Story uchun 1080x1920; `?kind=card` — karta.
    (`format` emas: DRF uni renderer tanlash uchun ishlatadi.)
    Imzo to'g'ri bo'lmasa — 404.
    """
    from .certificate_render import certificate_data, render_certificate_png
    from .story import signature_ok

    if not signature_ok(attempt_id, request.GET.get('sig')):
        raise Http404

    attempt = get_object_or_404(
        Attempt.objects.select_related('test', 'profile__user'),
        id=attempt_id, is_completed=True,
    )
    fmt = 'card' if request.GET.get('kind') == 'card' else 'story'
    png = render_certificate_png(certificate_data(attempt), fmt)
    response = HttpResponse(png, content_type='image/png')
    # Telegram rasmni bir necha marta so'rashi mumkin; natija o'zgarmaydi.
    response['Cache-Control'] = 'public, max-age=86400'
    return response


# ============================================================ ANTI-CHEAT: TAB SWITCH
TAB_SWITCH_LIMIT = 3


def anti_cheat_enabled(attempt):
    """Anti-cheat faqat sovrinli/qat'iy rejimlarda: jonli mock va Stress Zali. Oddiy
    mashqda Telegram'dan chiqib qaytgan o'quvchi jazolanmasligi kerak."""
    return bool(attempt.is_stress_mode or (attempt.test and attempt.test.is_live_mock))


@api_view(['POST'])
def report_tab_switch_api(request, attempt_id):
    """Frontend o'quvchi imtihon oynasidan chiqqanda chaqiradi. Hisob serverda yuritiladi;
    TAB_SWITCH_LIMIT ga yetganda urinish chetlatiladi (natija saqlanadi, lekin mock
    reytingida o'rin olmaydi va panelda belgi bilan ko'rinadi)."""
    attempt = (Attempt.objects.select_related('test')
               .filter(id=attempt_id, profile=request.user.profile, is_completed=False).first())
    if not attempt:
        return Response({'error': 'Urinish topilmadi'}, status=404)
    if not anti_cheat_enabled(attempt):
        return Response({'ok': True, 'enabled': False, 'tab_switches': 0, 'limit': TAB_SWITCH_LIMIT,
                         'is_cheating_flagged': False})

    Attempt.objects.filter(pk=attempt.pk).update(tab_switch_count=F('tab_switch_count') + 1)
    Attempt.objects.filter(pk=attempt.pk, tab_switch_count__gte=TAB_SWITCH_LIMIT).update(is_cheating_flagged=True)
    attempt.refresh_from_db(fields=['tab_switch_count', 'is_cheating_flagged'])
    return Response({'ok': True, 'enabled': True, 'tab_switches': attempt.tab_switch_count,
                     'limit': TAB_SWITCH_LIMIT, 'is_cheating_flagged': attempt.is_cheating_flagged})


@api_view(['GET'])
@permission_classes([AllowAny])
def stress_config_api(request):
    """Stress simulyatori umumiy sozlamalarini qaytarish."""
    config = StressExamConfig.load()
    return Response({
        'ambient_sound_enabled': config.ambient_sound_enabled,
        'ambient_volume': config.ambient_volume,
        'supervisor_voice_enabled': config.supervisor_voice_enabled,
        'require_bubble_sheet': config.require_bubble_sheet,
        'warning_time_minutes': config.warning_time_minutes,
        'bonus_xp_multiplier': config.bonus_xp_multiplier,
        'supervisor_messages': config.supervisor_messages or [],
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsChannelSubscribed])
def start_stress_test_api(request):
    """Maxsus Real BMB Imtihon Zali (Stress Mode) da testni boshlash."""
    try:
        from premium.models import unlocked_test_ids as _unlocked_ids
        from tests_app.services.question_pool import practice_question_pool

        profile = ensure_profile_for_user(request.user)
        test_id = request.data.get('test_id')
        subject_slug = request.data.get('subject_slug')
        has_pro = profile.is_vip_active

        # Stress zali: birinchi marta bepul, keyingilari PRO. Davom etayotgan stress
        # urinishiga qaytish limitga kirmaydi.
        if not has_pro and Attempt.objects.filter(profile=profile, is_stress_mode=True).exists():
            resumable = (Attempt.objects.select_related('test')
                         .filter(profile=profile, is_stress_mode=True, is_completed=False)
                         .order_by('-started_at').first())
            if not resumable:
                track_event(profile, 'paywall_view', feature='stress')
                return Response({'error': "Stress zali birinchi marta bepul edi. Davom etish uchun PRO obuna kerak.",
                                 'requires_pro': True}, status=403)
            mode = 'cefr' if resumable.test and resumable.test.sections.exists() else 'classic'
            return Response({'attempt_id': resumable.id, 'mode': mode, 'is_stress_mode': True})

        if test_id:
            # Oddiy start_test_api bilan bir xil ruxsat qoidalari. Ilgari bu yerda ID bo'yicha
            # istalgan test (qoralama, premium, hali boshlanmagan jonli mock) ochilardi.
            test = TestSet.objects.filter(id=test_id).first()
            if (not test or test.is_live_mock
                    or ((not test.is_published or test.is_archived)
                        and test.created_by_id != request.user.id and not profile.is_superadmin)):
                return Response({'error': 'Test topilmadi'}, status=404)
            is_free_price = test.price is not None and float(test.price) <= 0
            if (test.is_premium and not is_free_price and not has_pro
                    and not profile.premium_mock_test_unlocked
                    and test.id not in _unlocked_ids(profile)):
                return Response({'error': "Bu test PRO obuna yoki mock test xaridi bilan ochiladi."}, status=403)
        else:
            qs = TestSet.objects.filter(is_published=True, is_archived=False, is_live_mock=False)
            if not has_pro and not profile.premium_mock_test_unlocked:
                qs = qs.filter(Q(is_premium=False) | Q(id__in=_unlocked_ids(profile)))
            if subject_slug and subject_slug != 'all':
                qs = qs.filter(subject__slug=subject_slug)
            test = qs.order_by('?').first()

        if not test or not test.questions.exists():
            # Savollardan avtomatik test tuzish
            q_qs = practice_question_pool()
            if subject_slug and subject_slug != 'all':
                sub_q = q_qs.filter(subject__slug=subject_slug)
                if sub_q.exists():
                    q_qs = sub_q
            questions = list(q_qs.order_by('?')[:30])
            if not questions:
                return Response({'error': "Imtihon savollari topilmadi."}, status=404)
            test = TestSet.objects.create(
                title="Real BMB Standart Imtihon Testi",
                description="BMB DTM rasmiy standartiga mos tuzilgan stress testi.",
                duration_minutes=60,
                is_random=True,
                is_premium=False,
            )
            test.questions.set(questions)

        # Faol urinishni tekshirish
        active_attempt = Attempt.objects.filter(profile=profile, test=test, is_completed=False).order_by('-started_at').first()
        if active_attempt:
            if not active_attempt.is_stress_mode:
                active_attempt.is_stress_mode = True
                active_attempt.save(update_fields=['is_stress_mode'])
            mode = 'cefr' if test.sections.exists() else 'classic'
            return Response({'attempt_id': active_attempt.id, 'mode': mode, 'is_stress_mode': True})

        attempt = _new_attempt(profile, test, is_stress=True)
        mode = 'cefr' if test.sections.exists() else 'classic'
        return Response({'attempt_id': attempt.id, 'mode': mode, 'is_stress_mode': True})
    except Exception as e:
        logger.exception("start_stress_test_api error: %s", e)
        return Response({'error': "Imtihonni yuklashda xatolik yuz berdi."}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def bubble_answer_api(request, attempt_id):
    """BMB Titul Varaqasi (Bubble Sheet) katagini to'ldirish/yangilash."""
    attempt = get_object_or_404(Attempt, id=attempt_id, profile=request.user.profile)
    if attempt.is_completed:
        return Response({'error': 'attempt already finished', 'completed': True}, status=409)
    # Vaqt tugagach titul varaqasiga yozish yo'q (javob endpointi bilan bir xil qoida):
    # ilgari javob kalitini ko'rgach yoki vaqtdan keyin titulni to'ldirib ball olish mumkin edi.
    if attempt.is_time_up:
        return Response({'error': 'time_up', 'time_up': True, 'message': "Test vaqti tugadi."}, status=409)

    q_idx = request.data.get('q_idx')
    letter = request.data.get('letter')
    bulk_answers = request.data.get('answers')

    current_titul = attempt.titul_answers or {}
    if bulk_answers and isinstance(bulk_answers, dict):
        current_titul.update({str(k): str(v).upper() for k, v in bulk_answers.items() if v})
    elif q_idx is not None:
        s_idx = str(q_idx)
        if letter:
            current_titul[s_idx] = str(letter).upper()
        elif s_idx in current_titul:
            del current_titul[s_idx]

    attempt.titul_answers = current_titul
    attempt.save(update_fields=['titul_answers'])
    return Response({'titul_answers': attempt.titul_answers, 'saved': True})
