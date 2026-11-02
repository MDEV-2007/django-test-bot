import random
from datetime import timedelta
from django.utils import timezone
from django.db.models import Count, Q
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from accounts.models import Profile, ensure_profile_for_user
from tests_app.models import Question, AnswerOption, Subject, AttemptAnswer
from learning.models import Topic, Lesson, Flashcard, CommunityPost
from growth.models import UserUsageQuota, ArenaGhostReplay
from .models import DailyLearningLoop, UserEcoTree


GHOST_OPPONENT_NAMES = [
    "Sardor Temurov", "Madina Karimova", "Javohir Aliyev", "Shahlo Mirzayeva",
    "Bekzod Rustamov", "Dilnoza Olimova", "Farrux Xolmatov", "Zilola Yusupova",
    "Bobur Samadov", "Nilufar Rahimova", "Akmal Zokirov", "Gulbahor Toshmatova"
]


def _format_question_dict(q: Question) -> dict:
    """Savol va uning variantlarini qulay JSON formatiga o'tkazish."""
    options = []
    for opt in q.options.all():
        options.append({
            'id': opt.id,
            'text': opt.text,
            'is_correct': opt.is_correct,
        })
    # Variantlar tartibini aralashtiramiz
    random.shuffle(options)

    # AI Mentor tahlili va eslab qolish kodi
    explanation_text = q.explanation or (
        f"Ushbu savolda asosiy kalit so'zga e'tibor qarating. "
        f"To'g'ri javob variantini mavzuning qoidasi bilan bog'lab yodda saqlang."
    )

    return {
        'id': q.id,
        'text': q.text,
        'image_url': q.image.url if getattr(q, 'image', None) and q.image else None,
        'options': options,
        'ai_hint': {
            'aha_moment': "Nega adashdingiz: Diqqat qiling, savoldagi chalg'ituvchi terminlar bir-biriga yaqin!",
            'memory_code': explanation_text,
            'analysis_time': '10s tahlil',
        },
        'explanation': explanation_text,
    }


def _get_or_create_today_loop(user) -> DailyLearningLoop:
    """Bugungi kunlik yopiq siklni topish yoki eng zaif mavzu asosida yaratish."""
    today = timezone.localdate()
    
    # 1. Hali tugallanmagan yoki bugungi eng oxirgi siklni qidiramiz
    loop = DailyLearningLoop.objects.filter(
        user=user,
        date=today
    ).order_by('-cycle_number', '-id').first()

    if loop:
        return loop

    # 2. Yangi sikl: O'quvchining eng zaif mavzusini yoki fanni aniqlaymiz
    weak_subject = None
    weak_topic = None

    # O'quvchining so'nggi noto'g'ri javoblarini tekshiramiz
    recent_wrong = AttemptAnswer.objects.filter(
        attempt__user=user,
        is_correct=False
    ).select_related('question__test__subject').order_by('-id')[:10]

    if recent_wrong.exists():
        for wa in recent_wrong:
            if wa.question and wa.question.test and wa.question.test.subject:
                weak_subject = wa.question.test.subject
                break

    if not weak_subject:
        # Eng ko'p savolga ega fanlardan birini tanlaymiz
        weak_subject = Subject.objects.annotate(
            q_cnt=Count('tests__questions')
        ).filter(q_cnt__gt=5).first() or Subject.objects.first()

    if weak_subject:
        weak_topic = Topic.objects.filter(subject=weak_subject).first()
    
    if not weak_topic:
        weak_topic = Topic.objects.first()

    # Yangi loop yaratamiz
    loop = DailyLearningLoop.objects.create(
        user=user,
        date=today,
        cycle_number=1,
        topic=weak_topic,
        subject=weak_subject,
        current_stage=DailyLearningLoop.STAGE_1_WARMUP,
        combo_multiplier=1.0,
        dtm_score_delta=0.4,
    )
    return loop


def _build_stage_data(loop: DailyLearningLoop, user) -> dict:
    """Har bir bosqich uchun boy ma'lumotlar to'plami."""
    topic = loop.topic
    subject = loop.subject or (topic.subject if topic else None)

    # 1. STAGE 1: WARMUP (90s Shpargalka)
    warmup_data = {
        'title': topic.title if topic else (subject.name if subject else "Umumiy Tayyorgarlik"),
        'subject_name': subject.name if subject else "DTM Fanlari",
        'duration_seconds': 90,
        'summary_bullets': [
            "BMB/DTM standartidagi eng ko'p tushadigan 3 ta savol mexanizmi.",
            "Asosiy formulalar va kalit atamalar: chalkashuvchi nuqtalar tahlili.",
            "Vaqtni tejash layfxaki: 1 daqiqada to'g'ri variantni topish strategiyasi.",
        ],
        'bmb_traps': [
            "1-Qopqon: O'xshash nomdagi atamalarning chalkashishi.",
            "2-Qopqon: Vaqt yetishmasligida birinchi ko'ringan variantga shoshilish.",
            "3-Qopqon: Inkor qo'shimchalari ('...emas', '...xato')ga e'tiborsizlik.",
        ],
        'cheat_sheet_content': (
            f"⚡ 90s ANTI-DARSLIK SHPARGALKA: {topic.title if topic else 'Mavzu'}\n\n"
            f"Ushbu mavzu bo'yicha DTM imtihonida har yili o'rtacha 2-3 ta asosiy test savoli tushadi. "
            f"Asosiy e'tiborni qoidalar ketma-ketligiga va variantlar orasidagi nozik farqlarga qarating. "
            f"Sprint davomida tezlik va aniqlik yuqori Combo ko'paytirgichini faollashtiradi!"
        )
    }

    # 2. STAGE 2: SPRINT SAVOLLARI (15 ta savol + Qasos)
    q_filter = Q()
    if topic:
        q_filter |= Q(topic=topic)
    if subject:
        q_filter |= Q(test__subject=subject)

    questions_qs = Question.objects.filter(q_filter).prefetch_related('options').distinct()
    if questions_qs.count() < 15:
        questions_qs = Question.objects.all().prefetch_related('options')[:20]
    else:
        questions_qs = questions_qs[:20]

    sprint_questions = [_format_question_dict(q) for q in questions_qs]
    # Agar savollar kam bo'lsa zaxiradan to'ldiramiz
    if not sprint_questions:
        all_q = Question.objects.prefetch_related('options')[:15]
        sprint_questions = [_format_question_dict(q) for q in all_q]

    # 3. STAGE 3: CLEANUP (Flashcards for Session Mistakes)
    cleanup_cards = []
    if loop.session_mistakes_ids:
        mistake_qs = Question.objects.filter(id__in=loop.session_mistakes_ids).prefetch_related('options')
        for q in mistake_qs:
            correct_opt = q.options.filter(is_correct=True).first()
            correct_text = correct_opt.text if correct_opt else "To'g'ri javob"
            cleanup_cards.append({
                'id': q.id,
                'front': q.text,
                'back': correct_text,
                'tip': q.explanation or "Kalit atama va mantiqiy bog'liqlikni eslab qoling.",
                'memory_code': f"Aha Moment: {correct_text}",
            })

    # 4. STAGE 4: 1v1 GHOST ARENA
    profile = ensure_profile_for_user(user)
    user_elo = getattr(profile, 'elo_rating', None) or 1000
    ghost_name = random.choice(GHOST_OPPONENT_NAMES)
    ghost_avatar = f"https://api.dicebear.com/7.x/adventurer/svg?seed={ghost_name.replace(' ', '')}"
    ghost_elo = max(900, user_elo + random.randint(-30, 30))

    arena_questions = sprint_questions[:5] if len(sprint_questions) >= 5 else sprint_questions

    arena_data = {
        'opponent': {
            'name': ghost_name,
            'avatar_url': ghost_avatar,
            'elo_rating': ghost_elo,
            'title': "Abituriyent 2026",
        },
        'duration_seconds': 60,
        'questions': arena_questions,
    }

    # 5. STAGE 5: COMPLETED (Sirli Sandiq & Eco-Daraxt)
    rewards_data = {
        'coins': int(200 * loop.combo_multiplier),
        'xp': int(100 * loop.combo_multiplier),
        'free_essay_credits': 1,
        'dtm_score_delta': loop.dtm_score_delta,
        'water_reward': 35,
        'share_caption': (
            f"🚀 Bugungi 4-bosqichli Avtopilot Marafonini 100% yopdim! "
            f"DTM ballimga +{loop.dtm_score_delta} qo'shildi, Eco-Daraxtim o'sdi va Sirli Sandiq ochildi! 🎁🔥"
        ),
    }

    return {
        'warmup': warmup_data,
        'sprint': {
            'questions': sprint_questions,
            'target_count': min(15, len(sprint_questions)),
        },
        'cleanup': {
            'cards': cleanup_cards,
            'count': len(cleanup_cards),
        },
        'arena': arena_data,
        'rewards': rewards_data,
    }


class CurrentLoopView(APIView):
    """
    GET /api/v1/loop/current/
    O'quvchi uchun bugungi 'Avtopilot Konveyeri' holatini (State-Machine) qaytaradi.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        loop = _get_or_create_today_loop(user)

        # Eco-Tree holatini tekshiramiz va kunlik susayishni (decay) bajaramiz
        eco_tree, _ = UserEcoTree.objects.get_or_create(user=user)
        eco_tree.check_daily_decay()

        stage_data = _build_stage_data(loop, user)

        topic_data = None
        if loop.topic:
            topic_data = {
                'id': loop.topic.id,
                'title': loop.topic.title,
                'subject_name': loop.topic.subject.name if loop.topic.subject else "Umumiy",
            }
        elif loop.subject:
            topic_data = {
                'id': 0,
                'title': f"{loop.subject.name} (Aralash)",
                'subject_name': loop.subject.name,
            }

        return Response({
            'ok': True,
            'loop': {
                'id': loop.id,
                'date': str(loop.date),
                'cycle_number': loop.cycle_number,
                'current_stage': loop.current_stage,
                'combo_multiplier': loop.combo_multiplier,
                'dtm_score_delta': loop.dtm_score_delta,
                'session_mistakes_ids': loop.session_mistakes_ids,
                'is_chest_claimed': loop.is_chest_claimed,
                'sprint_score': loop.sprint_score,
                'sprint_total': loop.sprint_total,
                'cleanup_cleared': loop.cleanup_cleared,
                'arena_won': loop.arena_won,
            },
            'topic': topic_data,
            'eco_tree': {
                'growth_stage': eco_tree.growth_stage,
                'stage_name': eco_tree.stage_name,
                'water_level': eco_tree.water_level,
                'root_depth_xp': eco_tree.root_depth_xp,
                'total_cycles_completed': eco_tree.total_cycles_completed,
                'needs_water': eco_tree.water_level < 25,
            },
            'stage_data': stage_data,
        })


class AdvanceStageView(APIView):
    """
    POST /api/v1/loop/advance-stage/
    Zanjirni oldinga siljitish (State transition).
    1-bosqich -> 2-bosqich -> (agar xato bo'lsa 3-bosqich, yo'qsa 4-bosqich) -> 5-bosqich
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        loop = _get_or_create_today_loop(user)
        eco_tree, _ = UserEcoTree.objects.get_or_create(user=user)

        from_stage = request.data.get('from_stage') or loop.current_stage
        payload = request.data.get('payload', {})

        water_result = None
        rewards_awarded = None

        if from_stage == DailyLearningLoop.STAGE_1_WARMUP:
            # 1-bosqich tugadi -> 2-bosqich (Sprint) boshlanadi
            loop.current_stage = DailyLearningLoop.STAGE_2_SPRINT
            loop.combo_multiplier = 1.0
            loop.dtm_score_delta = round(loop.dtm_score_delta + 0.4, 2)
            loop.save()

        elif from_stage == DailyLearningLoop.STAGE_2_SPRINT:
            # 2-bosqich (Sprint) yakunlandi
            mistake_ids = payload.get('mistake_question_ids', [])
            correct_count = payload.get('correct_count', 0)
            total_count = payload.get('total_count', 10)

            loop.sprint_score = correct_count
            loop.sprint_total = total_count
            loop.dtm_score_delta = round(loop.dtm_score_delta + (correct_count * 0.15), 2)

            if len(mistake_ids) > 0:
                # Xatolar bor -> 3-bosqichga (Flashcard tozalash) o'tkazamiz
                loop.session_mistakes_ids = mistake_ids
                loop.current_stage = DailyLearningLoop.STAGE_3_CLEANUP
                loop.combo_multiplier = 1.5
            else:
                # 0 ta xato! Mukammal sprint -> 3-bosqichdan sakrab, 2.0x Combo bilan to'g'ri Arenaga!
                loop.session_mistakes_ids = []
                loop.current_stage = DailyLearningLoop.STAGE_4_ARENA
                loop.combo_multiplier = 2.0

            loop.save()

        elif from_stage == DailyLearningLoop.STAGE_3_CLEANUP:
            # 3-bosqich (Xatolar Dueli) yakunlandi
            cleared_count = payload.get('cleared_count', len(loop.session_mistakes_ids))
            loop.cleanup_cleared = cleared_count
            loop.dtm_score_delta = round(loop.dtm_score_delta + 0.6, 2)
            loop.current_stage = DailyLearningLoop.STAGE_4_ARENA
            loop.combo_multiplier = 2.0
            loop.save()

        elif from_stage == DailyLearningLoop.STAGE_4_ARENA:
            # 4-bosqich (1v1 Ghost Duel) yakunlandi -> Sikl to'liq yopildi!
            from core.rewards import grant_rewards_atomic
            from django.db import transaction

            with transaction.atomic():
                locked_loop = DailyLearningLoop.objects.select_for_update().get(pk=loop.pk)
                arena_won = payload.get('arena_won', True)
                locked_loop.arena_won = arena_won
                if arena_won:
                    locked_loop.dtm_score_delta = round(locked_loop.dtm_score_delta + 0.8, 2)
                    locked_loop.combo_multiplier = min(2.5, round(locked_loop.combo_multiplier + 0.5, 1))

                locked_loop.current_stage = DailyLearningLoop.STAGE_5_COMPLETED

                # Agar sandiq ochilmagan bo'lsa mukofot beriladi (Double-spend oldini olish)
                if not locked_loop.is_chest_claimed:
                    # 1. Eco-Daraxtga suv quyiladi (+35%)
                    water_result = eco_tree.water(35)

                    # 2. Atomik tanga va XP
                    coins = int(200 * locked_loop.combo_multiplier)
                    xp = int(100 * locked_loop.combo_multiplier)
                    profile = ensure_profile_for_user(user)
                    grant_rewards_atomic(profile.id, coins_delta=coins, xp_delta=xp)

                    # 3. Bepul AI Esse krediti
                    quota, _ = UserUsageQuota.objects.get_or_create(profile=profile)
                    quota.free_essay_credits = (quota.free_essay_credits or 0) + 1
                    quota.save(update_fields=['free_essay_credits'])

                    locked_loop.is_chest_claimed = True
                else:
                    water_result = {'water_level': eco_tree.water_level, 'grew': False}
                    coins = 0
                    xp = 0

                locked_loop.save()
                loop = locked_loop

            rewards_awarded = {
                'coins': coins,
                'xp': xp,
                'free_essay_credits': 1,
                'dtm_score_delta': loop.dtm_score_delta,
                'water_result': water_result,
            }

        # Keyingi yangilangan ma'lumotlar
        stage_data = _build_stage_data(loop, user)

        return Response({
            'ok': True,
            'current_stage': loop.current_stage,
            'combo_multiplier': loop.combo_multiplier,
            'dtm_score_delta': loop.dtm_score_delta,
            'session_mistakes_ids': loop.session_mistakes_ids,
            'rewards_awarded': rewards_awarded,
            'eco_tree': {
                'growth_stage': eco_tree.growth_stage,
                'stage_name': eco_tree.stage_name,
                'water_level': eco_tree.water_level,
                'root_depth_xp': eco_tree.root_depth_xp,
                'total_cycles_completed': eco_tree.total_cycles_completed,
            },
            'stage_data': stage_data,
        })


class ShareLoopPostView(APIView):
    """
    POST /api/v1/loop/share-post/
    Strava 1-Click Auto-Post: 4-bosqichli marafon natijasini to'g'ridan-to'g'ri hamjamiyat lentasiga chiqarish (+15 XP).
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        loop = _get_or_create_today_loop(user)

        caption = request.data.get('caption') or (
            f"🚀 Bugungi 4-bosqichli Marafonni 100% yopdim (+{loop.dtm_score_delta} DTM Ball)! "
            f"Sirli Sandiq ochildi va Ilm Ildizi Daraxtimga suv quydim! 🔥🎁"
        )

        post = CommunityPost.objects.create(
            author=user,
            post_type='achievement',
            title="Kunlik Avtopilot Marafoni Yakunlandi! 🎯",
            content=caption,
        )

        profile = ensure_profile_for_user(user)
        profile.xp = (profile.xp or 0) + 15
        profile.save(update_fields=['xp'])

        return Response({
            'ok': True,
            'post_id': post.id,
            'xp_awarded': 15,
            'message': "Post muvaffaqiyatli lentaga chiqarildi! (+15 XP berildi 🔥)",
        })


class RestartCycleView(APIView):
    """
    POST /api/v1/loop/restart-cycle/
    Agar bugungi 1-sikl to'liq yakunlangan bo'lsa, 2.5x Super-Combo bilan 2-siklni boshlash.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        today = timezone.localdate()

        last_loop = DailyLearningLoop.objects.filter(
            user=user,
            date=today
        ).order_by('-cycle_number').first()

        new_cycle_number = (last_loop.cycle_number + 1) if last_loop else 1
        combo = 2.0 if new_cycle_number == 2 else 2.5

        # Keyingi yangi mavzuni tanlaymiz
        new_topic = Topic.objects.order_by('?').first()

        new_loop = DailyLearningLoop.objects.create(
            user=user,
            date=today,
            cycle_number=new_cycle_number,
            topic=new_topic,
            subject=new_topic.subject if new_topic else None,
            current_stage=DailyLearningLoop.STAGE_1_WARMUP,
            combo_multiplier=combo,  # 2-raund 2.0x, 3-raund 2.5x Super-Combo!
            dtm_score_delta=0.4,
        )

        eco_tree, _ = UserEcoTree.objects.get_or_create(user=user)
        stage_data = _build_stage_data(new_loop, user)

        return Response({
            'ok': True,
            'loop': {
                'id': new_loop.id,
                'cycle_number': new_loop.cycle_number,
                'current_stage': new_loop.current_stage,
                'combo_multiplier': new_loop.combo_multiplier,
                'dtm_score_delta': new_loop.dtm_score_delta,
            },
            'stage_data': stage_data,
            'message': f"🔥 {new_cycle_number}-sikl 2.5x Super-Combo bilan boshlandi!",
        })
