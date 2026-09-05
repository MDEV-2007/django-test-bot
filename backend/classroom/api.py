"""O'quvchi ko'radigan mock jadvali.

O'qituvchi tomonida API yo'q — mock Django admin orqali yaratiladi (spec: alohida
o'qituvchi paneli v1 da qurilmaydi). Bu yerda faqat o'quvchiga kerak bo'lgan narsa bor:
qaysi mock qachon, va hozir kira olamanmi.

VAQT: javobda ikkalasi ham bo'ladi — mashina uchun ISO (UTC) va odam uchun Toshkent
vaqtidagi satr. Sanoq (`starts_in_seconds`) SERVERDA hisoblanadi; klientning soati
noto'g'ri bo'lsa ham kirish oynasi o'zgarmaydi.
"""
from django.db import IntegrityError, transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.models import ensure_profile_for_user
from tests_app.models import Attempt, AttemptAnswer

from .grading import finalize
from .models import MockAttempt, MockTest
from .results import leaderboard
from .services import (
    ENTRY_MESSAGES, ENTRY_OK, ENTRY_WARMUP_MINUTES, check_entry, computed_status,
    format_tashkent, teacher_ids_for, visible_mocks,
)


def _mock_payload(mock, student, moment):
    status = computed_status(mock, moment)
    allowed, reason = check_entry(student, mock, moment)

    return {
        'id': mock.id,
        'title': mock.title,
        'teacher': mock.teacher.full_name,
        'subject': mock.subject.name if mock.subject else None,
        'duration_minutes': mock.duration_minutes,
        'is_free_preview': mock.is_free_preview,
        # Bazadagi ustun emas, server vaqti bo'yicha hisoblangan holat.
        'status': status,
        'scheduled_start': mock.scheduled_start.isoformat(),
        'scheduled_end': mock.scheduled_end.isoformat(),
        'scheduled_start_display': format_tashkent(mock.scheduled_start),
        # Manfiy bo'lmaydi: boshlangan mock uchun 0.
        'starts_in_seconds': max(0, int((mock.scheduled_start - moment).total_seconds())),
        'ends_in_seconds': max(0, int((mock.scheduled_end - moment).total_seconds())),
        'can_enter': allowed,
        'entry_reason': reason,
        'entry_message': '' if allowed else ENTRY_MESSAGES.get(reason, ''),
        # Sahifa "tayyorlaning" holatiga o'tadigan payt — kirish hali YOPIQ.
        'is_warming_up': status == 'scheduled' and (mock.scheduled_start - moment).total_seconds() <= ENTRY_WARMUP_MINUTES * 60,
    }


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def mocks_api(request):
    """O'quvchining mock jadvali: kelayotgan, ketayotgan va tugaganlari."""
    student = ensure_profile_for_user(request.user)
    moment = timezone.now()

    mocks = list(visible_mocks(student))
    payloads = [_mock_payload(mock, student, moment) for mock in mocks]

    upcoming = [p for p in payloads if p['status'] == 'scheduled']
    live = [p for p in payloads if p['status'] == 'live']
    # Tugaganlar teskari tartibda: eng oxirgisi birinchi bo'lib kerak bo'ladi.
    finished = [p for p in payloads if p['status'] == 'finished'][::-1]

    return Response({
        'live': live,
        'upcoming': upcoming,
        'finished': finished[:20],
        'has_teacher': bool(teacher_ids_for(student)),
        'server_time': moment.isoformat(),
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def mock_detail_api(request, mock_id):
    """Bitta mock: kirish holati va sanoq.

    Qoralama va begona sinfning mock'i 404 qaytaradi — "bor, lekin sizga emas" degan
    javob ham ortiqcha ma'lumot beradi.
    """
    student = ensure_profile_for_user(request.user)
    mock = get_object_or_404(
        MockTest.objects.select_related('teacher', 'subject', 'test_set'),
        id=mock_id, teacher_id__in=teacher_ids_for(student))
    if mock.status == 'draft':
        return Response({'detail': 'Topilmadi.'}, status=404)

    payload = _mock_payload(mock, student, timezone.now())
    payload['questions_count'] = mock.test_set.questions.count()
    if payload['entry_reason'] == ENTRY_OK:
        payload['entry_message'] = ''
    return Response(payload)


# ---------------------------------------------------------------------------
# Urinish: boshlash, holat, topshirish
# ---------------------------------------------------------------------------

def _attempt_payload(mock_attempt, moment=None):
    moment = moment or timezone.now()
    attempt = mock_attempt.attempt
    return {
        'mock_attempt_id': mock_attempt.id,
        # Javoblar MAVJUD test endpointlari orqali saqlanadi:
        #   POST /api/tests/attempts/<attempt_id>/answer/       (klassik)
        #   POST /api/tests/attempts/<attempt_id>/exam/answer/  (CEFR)
        # Ular vaqt tugaganini o'zlari tekshiradi (Attempt.deadline mock oynasini biladi).
        'attempt_id': attempt.id if attempt else None,
        'mock': {'id': mock_attempt.mock_id, 'title': mock_attempt.mock.title},
        'started_at': mock_attempt.started_at.isoformat(),
        'deadline': mock_attempt.deadline.isoformat(),
        'deadline_display': format_tashkent(mock_attempt.deadline),
        # Sanoq serverda: klientning soati o'zgarsa ham chegara o'zgarmaydi.
        'seconds_left': max(0, int((mock_attempt.deadline - moment).total_seconds())),
        'is_submitted': mock_attempt.submitted_at is not None,
        'submitted_at': mock_attempt.submitted_at.isoformat() if mock_attempt.submitted_at else None,
        'score': mock_attempt.score,
        'breakdown': mock_attempt.breakdown,
        'rank': mock_attempt.rank,
    }


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def start_mock_api(request, mock_id):
    """Mock'ni boshlaydi (yoki boshlangan urinishga qaytaradi).

    Bitta o'quvchi bitta mock'ni FAQAT BIR MARTA yechadi: qayta chaqirilsa mavjud
    urinish qaytadi, yangisi yaratilmaydi. Bu qoida bazada ham turadi
    (`MockAttempt` unique_together), ya'ni ikkita so'rov bir vaqtda kelsa ham
    ikkinchisi qator yarata olmaydi.
    """
    student = ensure_profile_for_user(request.user)
    mock = get_object_or_404(
        MockTest.objects.select_related('teacher', 'test_set'),
        id=mock_id, teacher_id__in=teacher_ids_for(student))

    existing = MockAttempt.objects.filter(student=student, mock=mock).select_related(
        'attempt', 'mock').first()
    if existing is not None:
        return Response(_attempt_payload(existing))

    allowed, reason = check_entry(student, mock)
    if not allowed:
        return Response({
            'detail': ENTRY_MESSAGES.get(reason, "Kirish yopiq."),
            'entry_reason': reason,
        }, status=403)

    questions = mock.test_set.ordered_questions()
    if not questions:
        return Response({'detail': "Bu mock'da savol yo'q."}, status=400)

    try:
        with transaction.atomic():
            attempt = Attempt.objects.create(profile=student, test=mock.test_set)
            AttemptAnswer.objects.bulk_create(
                [AttemptAnswer(attempt=attempt, question=question) for question in questions])
            mock_attempt = MockAttempt.objects.create(
                student=student, mock=mock, attempt=attempt)
    except IntegrityError:
        # Ikkita so'rov bir vaqtda kelgan — g'olibning urinishi qaytariladi.
        mock_attempt = MockAttempt.objects.select_related('attempt', 'mock').get(
            student=student, mock=mock)

    return Response(_attempt_payload(mock_attempt), status=201)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def attempt_state_api(request, mock_attempt_id):
    """Urinish holati: qolgan vaqt, topshirildimi, ball."""
    student = ensure_profile_for_user(request.user)
    mock_attempt = get_object_or_404(
        MockAttempt.objects.select_related('attempt', 'mock'),
        id=mock_attempt_id, student=student)
    return Response(_attempt_payload(mock_attempt))


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def submit_attempt_api(request, mock_attempt_id):
    """Urinishni topshiradi.

    Vaqt tugagandan keyin kelgan topshiriq ham QABUL QILINADI, lekin bu hech narsani
    o'zgartirmaydi: javoblar allaqachon `Attempt.deadline` bilan to'silgan (kechikkan
    javob saqlanmaydi), ya'ni yakunlanadigan narsa — muddat ichida yozilgani. Kechikkan
    topshiriqni butunlay rad etish esa o'quvchining tayyor ishini yo'qotgan bo'lardi.
    """
    student = ensure_profile_for_user(request.user)
    mock_attempt = get_object_or_404(
        MockAttempt.objects.select_related('attempt', 'mock'),
        id=mock_attempt_id, student=student)

    was_late = timezone.now() > mock_attempt.deadline
    mock_attempt = finalize(mock_attempt)

    payload = _attempt_payload(mock_attempt)
    payload['was_late'] = was_late
    return Response(payload)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def leaderboard_api(request, mock_id):
    """Mock reytingi.

    Natija E'LON QILINMAGUNCHA bo'sh qaytadi: test davomida raqiblarining ballini
    ko'rish imtihonni imtihon bo'lishdan chiqaradi.
    """
    student = ensure_profile_for_user(request.user)
    mock = get_object_or_404(
        MockTest.objects.select_related('teacher'),
        id=mock_id, teacher_id__in=teacher_ids_for(student))

    rows = leaderboard(mock)
    my_attempt = MockAttempt.objects.filter(mock=mock, student=student).first()
    return Response({
        'mock': {'id': mock.id, 'title': mock.title},
        'published': mock.results_published_at is not None,
        'published_at': format_tashkent(mock.results_published_at) if mock.results_published_at else None,
        'rows': rows,
        'my_rank': my_attempt.rank if my_attempt else None,
        'my_score': my_attempt.score if my_attempt else None,
    })
