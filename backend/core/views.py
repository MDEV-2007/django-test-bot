from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.utils import timezone
from accounts.models import ensure_profile_for_user
from accounts.permissions import IsSuperAdmin
from core.models import (
    ClassBattleParticipant, ClassBattleRoom, ParentConnection,
    SystemFeatureFlags, TopicCheatSheet,
)
from core.services import (
    calculate_class_battle_analytics, create_class_battle_room,
    get_or_generate_topic_cheat_sheet, send_parent_vip_invoice,
)
from learning.models import Topic
from tests_app.models import Question


# ─── 0-MODUL: Super Admin Feature Flags API ─────────────────────────────────
@api_view(['GET'])
@permission_classes([AllowAny])
def system_feature_flags_api(request):
    """Barcha foydalanuvchilar (Frontend) uchun tizimdagi global flaglar (Single Source of Truth)."""
    flags = SystemFeatureFlags.load()
    
    # Panel FeatureFlag bilan to'liq sinxronlashtiramiz
    panel_flags = {}
    try:
        from panel.models import FeatureFlag
        panel_flags = FeatureFlag.get_all_cached()
    except Exception:
        pass

    def _resolve(key, fallback):
        if key in panel_flags:
            return bool(panel_flags[key].get('is_enabled', fallback))
        return fallback

    return Response({
        'enable_stress_simulator': _resolve('stress_simulator', flags.enable_stress_simulator),
        'enable_cheat_sheet_maps': _resolve('cheat_sheet_maps', flags.enable_cheat_sheet_maps),
        'enable_parent_radar': _resolve('parent_radar', flags.enable_parent_radar),
        'enable_teacher_class_battles': _resolve('teacher_class_battles', flags.enable_teacher_class_battles),
        'enable_b2b_ads': _resolve('b2b_ads', getattr(flags, 'enable_b2b_ads', True)),
        'updated_at': flags.updated_at.isoformat() if flags.updated_at else None,
    })


@api_view(['PATCH', 'POST'])
@permission_classes([IsSuperAdmin])
def admin_feature_flags_toggle_api(request):
    """Super Admin tomonidan 1-click bilan xohlagan modulni yoqib-o'chirish."""
    flags = SystemFeatureFlags.load()
    data = request.data or {}

    if 'enable_stress_simulator' in data:
        flags.enable_stress_simulator = bool(data['enable_stress_simulator'])
    if 'enable_cheat_sheet_maps' in data:
        flags.enable_cheat_sheet_maps = bool(data['enable_cheat_sheet_maps'])
    if 'enable_parent_radar' in data:
        flags.enable_parent_radar = bool(data['enable_parent_radar'])
    if 'enable_teacher_class_battles' in data:
        flags.enable_teacher_class_battles = bool(data['enable_teacher_class_battles'])

    flags.save()
    return Response({
        'success': True,
        'message': "Funksiya holati real vaqtda yangilandi.",
        'flags': {
            'enable_stress_simulator': flags.enable_stress_simulator,
            'enable_cheat_sheet_maps': flags.enable_cheat_sheet_maps,
            'enable_parent_radar': flags.enable_parent_radar,
            'enable_teacher_class_battles': flags.enable_teacher_class_battles,
            'updated_at': flags.updated_at.isoformat() if flags.updated_at else None,
        }
    })


# ─── 2-MODUL: 60-Soniyalik Anti-Darslik Shpargalka API ───────────────────────
@api_view(['GET'])
@permission_classes([AllowAny])
def topic_cheat_sheet_api(request, topic_id):
    """Mavzu bo'yicha 60-soniyalik Shpargalka va BMB qopqonlarini olish (yoki Lazy AI bilan tuzish)."""
    flags = SystemFeatureFlags.load()
    if not flags.enable_cheat_sheet_maps:
        return Response({'error': "Anti-Darslik xaritasi vaqtincha faol emas."}, status=403)

    topic = get_object_or_404(Topic, id=topic_id)
    sheet = get_or_generate_topic_cheat_sheet(topic)

    return Response({
        'topic_id': topic.id,
        'topic_title': topic.title,
        'core_pills': sheet.core_pills or [],
        'exam_traps': sheet.exam_traps or [],
        'visual_chain': sheet.visual_chain or [],
        'sprint_question_ids': sheet.sprint_question_ids or [],
    })


# ─── 3-MODUL: Ota-Ona Radari & VIP Invoys API ───────────────────────────────
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def parent_radar_status_api(request):
    """O'quvchining ota-onasi ulanganligi holati va shaxsiy taklif havolasi."""
    profile = ensure_profile_for_user(request.user)
    conns = list(profile.parent_connections.filter(is_active=True))

    bot_username = "ilmildiziuz_bot"
    invite_url = f"https://t.me/{bot_username}?start=parent_{request.user.id}"

    return Response({
        'is_connected': len(conns) > 0,
        'connections_count': len(conns),
        'invite_url': invite_url,
        'parents': [
            {
                'id': c.id,
                'name': c.parent_name or "Ota-ona",
                'chat_id': c.parent_chat_id,
                'linked_at': c.linked_at.isoformat() if c.linked_at else None,
                'last_report': c.last_report_sent_at.isoformat() if c.last_report_sent_at else None,
            }
            for c in conns
        ],
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def parent_radar_send_invoice_api(request):
    """Ota-onaga Telegram orqali VIP to'lov invoysini yuborish."""
    profile = ensure_profile_for_user(request.user)
    plan_id = request.data.get('plan_id')

    sent_count, checkout_url, invoice_text = send_parent_vip_invoice(profile, plan_id)

    return Response({
        'sent_count': sent_count,
        'checkout_url': checkout_url,
        'message_text': invoice_text,
        'success': True,
        'message': f"{sent_count} ta ulangan ota-onaga to'lov so'rovi yuborildi." if sent_count > 0 else "Ulanmagan. Havolani Telegram orqali yuborishingiz mumkin.",
    })


# ─── 4-MODUL: B2B2C Sinf Janglari (Teacher Live Room) API ───────────────────
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def class_battle_create_api(request):
    """O'qituvchi tomonidan yangi PIN-kodli sinf jangi yaratish."""
    flags = SystemFeatureFlags.load()
    if not flags.enable_teacher_class_battles:
        return Response({'error': "Sinf janglari moduli vaqtincha faol emas."}, status=403)

    title = request.data.get('title') or "Guruh Imtihon Jangi"
    subject_id = request.data.get('subject_id')
    topic_id = request.data.get('topic_id')
    test_id = request.data.get('test_id')
    question_count = int(request.data.get('question_count', 10))

    room = create_class_battle_room(
        teacher_user=request.user,
        title=title,
        subject_id=subject_id,
        topic_id=topic_id,
        test_id=test_id,
        question_count=question_count,
    )

    return Response({
        'room_id': room.id,
        'pin_code': room.pin_code,
        'title': room.title,
        'status': room.status,
        'questions_count': len(room.question_ids),
        'share_url': f"https://t.me/ilmildiziuz_bot?startapp=battle_{room.pin_code}",
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def class_battle_join_api(request, pin_code):
    """O'quvchi 6 xonali PIN-kod orqali xonaga qo'shilishi."""
    flags = SystemFeatureFlags.load()
    if not flags.enable_teacher_class_battles:
        return Response({'error': "Sinf janglari moduli vaqtincha faol emas."}, status=403)

    room = get_object_or_404(ClassBattleRoom, pin_code=str(pin_code).strip())
    if room.status == 'finished':
        return Response({'error': "Bu jang allaqachon yakunlangan."}, status=400)

    profile = ensure_profile_for_user(request.user)
    nickname = request.data.get('nickname') or (request.user.get_full_name() or request.user.username)

    part, _ = ClassBattleParticipant.objects.get_or_create(
        room=room,
        profile=profile,
        defaults={'nickname': nickname[:90]},
    )

    return Response({
        'room_id': room.id,
        'pin_code': room.pin_code,
        'title': room.title,
        'status': room.status,
        'nickname': part.nickname,
        'participant_id': part.id,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def class_battle_state_api(request, room_id):
    """Xona holatini (qatnashchilar, reyting, savollar) kuzatish."""
    room = get_object_or_404(ClassBattleRoom, id=room_id)
    participants = list(room.participants.all().order_by('-score', '-correct_count'))

    # Savollar faqat jang boshlanganda beriladi
    questions_data = []
    if room.status in ['live', 'finished']:
        questions = Question.objects.filter(id__in=room.question_ids).prefetch_related('choices')
        for q in questions:
            questions_data.append({
                'id': q.id,
                'body': q.body,
                'choices': [{'id': c.id, 'text': c.text} for c in q.choices.all()],
            })

    return Response({
        'room_id': room.id,
        'title': room.title,
        'pin_code': room.pin_code,
        'status': room.status,
        'is_teacher': room.teacher_id == request.user.id,
        'participants_count': len(participants),
        'participants': [
            {
                'id': p.id,
                'nickname': p.nickname,
                'avatar': p.profile.avatar_url,
                'score': p.score,
                'correct_count': p.correct_count,
            }
            for p in participants
        ],
        'questions': questions_data,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def class_battle_start_api(request, room_id):
    """O'qituvchi tomonidan 'Jangni Boshlash' buyrug'i."""
    room = get_object_or_404(ClassBattleRoom, id=room_id, teacher=request.user)
    room.status = 'live'
    room.started_at = timezone.now()
    room.save(update_fields=['status', 'started_at'])
    return Response({'success': True, 'status': 'live'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def class_battle_submit_api(request, room_id):
    """O'quvchi savollarga bergan javoblarini yuborishi va ball olishi."""
    room = get_object_or_404(ClassBattleRoom, id=room_id)
    profile = ensure_profile_for_user(request.user)
    part = get_object_or_404(ClassBattleParticipant, room=room, profile=profile)

    # Javoblarni baholash
    submitted_answers = request.data.get('answers') or {}  # { "qid": choice_id }
    correct_count = 0
    total_score = 0
    evaluated = {}

    questions = {q.id: q for q in Question.objects.filter(id__in=room.question_ids).prefetch_related('choices')}

    for qid_str, choice_id in submitted_answers.items():
        try:
            qid = int(qid_str)
            q_obj = questions.get(qid)
            if q_obj:
                correct_c = next((c for c in q_obj.choices.all() if c.is_correct), None)
                is_correct = bool(correct_c and correct_c.id == choice_id)
                if is_correct:
                    correct_count += 1
                    total_score += 100
                evaluated[qid_str] = {
                    'choice_id': choice_id,
                    'is_correct': is_correct,
                }
        except (ValueError, TypeError):
            pass

    part.score = total_score
    part.correct_count = correct_count
    part.answers = evaluated
    part.finished_at = timezone.now()
    part.save(update_fields=['score', 'correct_count', 'answers', 'finished_at'])

    return Response({
        'score': total_score,
        'correct_count': correct_count,
        'total_questions': len(room.question_ids),
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def class_battle_analytics_api(request, room_id):
    """Jang yakunidagi tahlil (Podest, Eng ko'p xato savollar)."""
    room = get_object_or_404(ClassBattleRoom, id=room_id)
    analytics = calculate_class_battle_analytics(room)
    return Response(analytics)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def class_battle_my_rooms_api(request):
    """O'qituvchining yaratgan barcha sinf janglari ro'yxati."""
    rooms = ClassBattleRoom.objects.filter(teacher=request.user).order_by('-created_at')[:30]
    return Response([
        {
            'id': r.id,
            'title': r.title,
            'pin_code': r.pin_code,
            'status': r.status,
            'subject_name': r.subject.name if r.subject else 'Umumiy',
            'created_at': r.created_at.isoformat(),
            'participants_count': r.participants.count(),
            'questions_count': len(r.question_ids),
        }
        for r in rooms
    ])



# ─── B2B HYPER-TARGET ADS & LEAD GEN APIS ───────────────────────────────────

@api_view(['GET'])
@permission_classes([AllowAny])
def targeted_offer_api(request):
    """Test natijasi va zaifliklarga qarab O'quv Markaz taklifini olish."""
    from core.services import get_hyper_targeted_offer

    profile = ensure_profile_for_user(request.user) if request.user.is_authenticated else None
    subject = request.GET.get('subject', '')
    try:
        score = float(request.GET.get('score', 0))
    except (TypeError, ValueError):
        score = 0.0
    region = request.GET.get('region', '')

    offer = get_hyper_targeted_offer(profile, subject=subject, score=score, region=region)
    return Response(offer or {})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def lead_submit_api(request):
    """1-bosishda O'quv Markaziga lid va zaif mavzular tahlilini yuborish."""
    from core.services import submit_center_lead

    profile = ensure_profile_for_user(request.user)
    campaign_id = request.data.get('campaign_id')
    phone = (request.data.get('phone') or '').strip()
    name = (request.data.get('name') or '').strip()
    subject = (request.data.get('subject') or '').strip()
    score = float(request.data.get('score', 0))
    weak_topics = (request.data.get('weak_topics') or '').strip()

    if not campaign_id:
        return Response({'error': "campaign_id kiritilishi shart."}, status=400)

    try:
        res = submit_center_lead(
            profile=profile,
            campaign_id=campaign_id,
            phone=phone,
            name=name,
            subject=subject,
            score=score,
            weak_topics=weak_topics,
        )
        return Response(res)
    except Exception as e:
        return Response({'error': str(e)}, status=400)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def student_radar_api(request):
    """O'quvchining 6 burchakli Spider-Radar analitikasi."""
    from core.services import calculate_student_radar

    profile = ensure_profile_for_user(request.user)
    data = calculate_student_radar(profile)
    return Response(data)
