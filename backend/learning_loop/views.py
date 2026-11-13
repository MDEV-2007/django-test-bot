import random
from datetime import timedelta
from django.utils import timezone
from django.db.models import Count, Q
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from accounts.models import Profile, ensure_profile_for_user
from tests_app.models import Question, AnswerOption, Subject, AttemptAnswer
from learning.models import Topic, Lesson, Flashcard, CommunityPost
from growth.models import UserUsageQuota, ArenaGhostReplay
from .models import DailyLearningLoop, UserEcoTree
from tests_app.services.question_pool import practice_question_pool


GHOST_OPPONENT_NAMES = [
    "Sardor Temurov", "Madina Karimova", "Javohir Aliyev", "Shahlo Mirzayeva",
    "Bekzod Rustamov", "Dilnoza Olimova", "Farrux Xolmatov", "Zilola Yusupova",
    "Bobur Samadov", "Nilufar Rahimova", "Akmal Zokirov", "Gulbahor Toshmatova"
]


MAX_CYCLES_PER_DAY = 3
SPRINT_QUESTION_COUNT = 12
ARENA_QUESTION_COUNT = 5


def _topic_with_questions(subject=None, exclude_id=None, user=None):
    """Savoli bor mavzu. Ilgari `Topic.first()` olinardi — u ko'pincha
    savolsiz mavzu bo'lib, sprintga butunlay boshqa mavzudagi savollar tushardi.

    `user` berilsa — mavzular aylanadi: avval foydalanuvchi hali ko'rmagan mavzu,
    keyin eng uzoq vaqt oldin ko'rilgani. Aks holda har safar eng ko'p savolli
    mavzu (yoki exclude bilan ikki mavzu navbatma-navbat) chiqib qolardi."""
    qs = Topic.objects.annotate(n=Count('questions')).filter(n__gt=0)
    if subject:
        qs = qs.filter(subject=subject)
    if exclude_id:
        qs = qs.exclude(id=exclude_id)
    if user is None:
        return qs.order_by('-n').first()

    candidates = list(qs.values_list('id', 'n'))
    if not candidates:
        return None
    recent = (DailyLearningLoop.objects.filter(user=user, topic__isnull=False)
              .order_by('-id').values_list('topic_id', flat=True)[:200])
    last_seen = {}
    for idx, topic_id in enumerate(recent):
        last_seen.setdefault(topic_id, idx)
    never_seen = len(last_seen) + 1
    best_id = max(candidates, key=lambda c: (last_seen.get(c[0], never_seen), c[1]))[0]
    return Topic.objects.get(id=best_id)


def _pick_sprint_questions(topic, subject, count, rng):
    """Avval mavzudan, yetmasa fandan tasodifiy savollar.
    Fanning o'zida savol kam bo'lsa, fanning o'z savollari ichida qayta aralashtirib to'ldiriladi,
    lekin boshqa fan (masalan, Tarix) aralashib ketmaydi.
    `rng` sikl id'si bilan urug'langan: sahifa yangilansa ham savollar o'zgarmaydi."""
    base = practice_question_pool().filter(question_type__in=Question.SINGLE_ANSWER_TYPES)
    picked = []
    pools = []
    if topic:
        pools.append(base.filter(topic=topic))
    if subject:
        pools.append(base.filter(subject=subject))
    elif not topic:
        pools.append(base)

    for qs in pools:
        if len(picked) >= count:
            break
        ids = list(qs.exclude(id__in=picked).order_by('id').values_list('id', flat=True))
        if ids:
            picked += rng.sample(ids, min(count - len(picked), len(ids)))

    # Agar fanning o'zida savollar soni yetmasa, lekin fanda savol mavjud bo'lsa,
    # boshqa fanga o'tib ketmaslik uchun o'sha fanning savollarini qayta aralashtiramiz:
    if subject and len(picked) < count:
        subject_ids = list(base.filter(subject=subject).order_by('id').values_list('id', flat=True))
        if subject_ids:
            while len(picked) < count:
                picked.append(rng.choice(subject_ids))

    # Agar umuman fanda savol bo'lmasa (va subject berilmagan bo'lsa), umumiy bankdan olamiz:
    if len(picked) < count:
        remaining_ids = list(base.exclude(id__in=picked).order_by('id').values_list('id', flat=True))
        if remaining_ids:
            picked += rng.sample(remaining_ids, min(count - len(picked), len(remaining_ids)))

    by_id = Question.objects.prefetch_related('choices').in_bulk(picked)
    return [by_id[i] for i in picked if i in by_id]


def _loop_sprint_question_ids(loop: DailyLearningLoop) -> list:
    """Shu siklning sprint savollari ID'lari (_build_stage_data bilan bir xil urug')."""
    return [q.id for q in _loop_question_sets(loop)[0]]


def _as_int(value, default=0):
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _format_question_dict(q: Question) -> dict:
    """Savol va variantlar — javob kalitisiz. To'g'ri javob va izoh (u ko'pincha javobni
    aytadi) faqat POST /api/v1/loop/answer/ javobida qaytadi."""
    options = [{'id': opt.id, 'text': opt.text} for opt in q.choices.all()]
    # Variantlar tartibini aralashtiramiz
    random.shuffle(options)

    return {
        'id': q.id,
        'text': q.body,
        'image_url': q.image.url if getattr(q, 'image', None) and q.image else None,
        'options': options,
        'ai_hint': {
            'aha_moment': "Nega adashdingiz: Diqqat qiling, savoldagi chalg'ituvchi terminlar bir-biriga yaqin!",
            'memory_code': "To'g'ri javob variantini mavzuning qoidasi bilan bog'lab yodda saqlang.",
            'analysis_time': '10s tahlil',
        },
    }


def _explanation_for(q: Question) -> str:
    return q.explanation or (
        "Ushbu savolda asosiy kalit so'zga e'tibor qarating. "
        "To'g'ri javob variantini mavzuning qoidasi bilan bog'lab yodda saqlang."
    )


GHOST_ACCURACY = 0.55
LOOP_SESSION_TTL = timedelta(hours=30)


def _questions_by_ids(ids):
    by_id = Question.objects.prefetch_related('choices').in_bulk(ids)
    return [by_id[i] for i in ids if i in by_id]


def _loop_question_sets(loop: DailyLearningLoop):
    """(sprint savollari, arena savollari). Sessiya yaratilgan bo'lsa — aynan uning
    savollari (bank o'zgarsa ham klient ko'rgan savollar sessiyaga mos qoladi); aks holda
    sikl id'si bilan urug'langan tanlov."""
    if loop.sprint_session_id and loop.arena_session_id:
        return (_questions_by_ids(loop.sprint_session.question_ids),
                _questions_by_ids(loop.arena_session.question_ids))
    topic = loop.topic
    subject = loop.subject or (topic.subject if topic else None)
    picked = _pick_sprint_questions(topic, subject, SPRINT_QUESTION_COUNT + ARENA_QUESTION_COUNT,
                                    random.Random(loop.id))
    sprint_qs = picked[:SPRINT_QUESTION_COUNT]
    # Arena dueli sprintdagi savollarni takrorlamaydi (savol kam bo'lsa — sprintdan oladi).
    arena_pool = picked[SPRINT_QUESTION_COUNT:]
    arena_qs = arena_pool if len(arena_pool) >= ARENA_QUESTION_COUNT else sprint_qs[:ARENA_QUESTION_COUNT]
    return sprint_qs, arena_qs


def _ghost_moves(loop: DailyLearningLoop, count: int) -> list:
    """Ghost raqibning har savoldagi natijasi — serverda, sikl bo'yicha deterministik.
    Ilgari ghost bali klient taymerida tasodifiy o'sardi va g'alabani klient e'lon qilardi."""
    rng = random.Random(f"ghost:{loop.id}")
    return [rng.random() < GHOST_ACCURACY for _ in range(count)]


def _ensure_loop_sessions(loop: DailyLearningLoop):
    """Sprint va arena uchun server sessiyalarini (bir marta) yaratadi."""
    from sprint.models import QuizSession
    from sprint.services import create_quiz_session

    if loop.sprint_session_id and loop.arena_session_id:
        return
    sprint_qs, arena_qs = _loop_question_sets(loop)
    fields = []
    if not loop.sprint_session_id:
        loop.sprint_session = create_quiz_session(loop.user, QuizSession.MODE_LOOP_SPRINT,
                                                  [q.id for q in sprint_qs], ttl=LOOP_SESSION_TTL)
        fields.append('sprint_session')
    if not loop.arena_session_id:
        loop.arena_session = create_quiz_session(loop.user, QuizSession.MODE_LOOP_ARENA,
                                                 [q.id for q in arena_qs], ttl=LOOP_SESSION_TTL)
        fields.append('arena_session')
    DailyLearningLoop.objects.filter(pk=loop.pk).update(**{f: getattr(loop, f) for f in fields})


def _cleared_mistakes(loop: DailyLearningLoop) -> int:
    """Shu siklning sprint xatolaridan nechtasi qasos savolida to'g'ri yechildi."""
    from sprint.models import QuizSessionAnswer

    mistakes = list(loop.session_mistakes_ids or [])
    if not mistakes or not loop.sprint_session_id:
        return 0
    return QuizSessionAnswer.objects.filter(
        session_id=loop.sprint_session_id, question_id__in=mistakes, revenge_correct=True,
    ).count()


def _session_results(session):
    """{question_id: is_correct} — faqat birinchi (serverda tekshirilgan) javoblar."""
    if session is None:
        return {}
    return dict(session.answers.values_list('question_id', 'is_correct'))


def _resolve_user_preferred_subject(user, request=None):
    """Foydalanuvchi tanlagan maqsad fani: request query/body, sessiya yoki Profile.target_subject."""
    if request:
        slug = (
            getattr(request, 'data', {}).get('subject_slug')
            or getattr(request, 'data', {}).get('subject')
            or request.GET.get('subject_slug')
            or request.GET.get('subject')
        ) if hasattr(request, 'GET') else None
        if slug:
            s = Subject.objects.filter(Q(slug=slug) | Q(name__iexact=slug)).first()
            if s:
                return s
        sid = (
            getattr(request, 'data', {}).get('subject_id')
            or request.GET.get('subject_id')
        ) if hasattr(request, 'GET') else None
        if sid:
            s = Subject.objects.filter(id=sid).first()
            if s:
                return s
        if hasattr(request, 'session'):
            sess_subj = request.session.get('selected_subject')
            if sess_subj:
                s = Subject.objects.filter(Q(slug=sess_subj) | Q(name__iexact=sess_subj)).first()
                if s:
                    return s

    profile = getattr(user, 'profile', None)
    if profile and profile.target_subject:
        return profile.target_subject

    return None


def switch_today_loop_subject(user, subject: Subject, loop: DailyLearningLoop = None, force=False) -> DailyLearningLoop:
    """Kunlik siklning fanini o'zgartiradi va unga mos mavzu va yangi sprint/arena sessiyalarini o'rnatadi.
    Agar foydalanuvchi hali 1-bosqichda bo'lsa (yoki force=True bo'lsa), fan to'liq yangilanadi."""
    today = timezone.localdate()
    if not loop:
        loop = DailyLearningLoop.objects.filter(user=user, date=today).order_by('-cycle_number', '-id').first()
    if not loop:
        loop = _create_first_loop(user, today, preferred_subject=subject)
        return loop

    new_topic = _topic_with_questions(subject, user=user)
    loop.subject = subject
    loop.topic = new_topic

    if loop.current_stage == DailyLearningLoop.STAGE_1_WARMUP or force:
        loop.current_stage = DailyLearningLoop.STAGE_1_WARMUP
        loop.sprint_session = None
        loop.arena_session = None
        loop.session_mistakes_ids = []
        loop.sprint_score = 0
        loop.sprint_total = 0
        loop.cleanup_cleared = 0
        loop.arena_won = False

    loop.save()
    return loop


def _get_or_create_today_loop(user, request=None) -> DailyLearningLoop:
    """Bugungi kunlik yopiq siklni topish yoki eng zaif mavzu asosida yaratish."""
    today = timezone.localdate()
    preferred_subject = _resolve_user_preferred_subject(user, request=request)

    # 1. Hali tugallanmagan yoki bugungi eng oxirgi siklni qidiramiz
    loop = DailyLearningLoop.objects.filter(
        user=user,
        date=today
    ).order_by('-cycle_number', '-id').first()

    if loop:
        if preferred_subject and loop.subject_id != preferred_subject.id and loop.current_stage == DailyLearningLoop.STAGE_1_WARMUP:
            loop = switch_today_loop_subject(user, preferred_subject, loop=loop)
        return loop

    from django.db import IntegrityError, transaction
    try:
        with transaction.atomic():
            type(user).objects.select_for_update().filter(pk=user.pk).first()
            loop = DailyLearningLoop.objects.filter(user=user, date=today).order_by('-cycle_number', '-id').first()
            if loop:
                if preferred_subject and loop.subject_id != preferred_subject.id and loop.current_stage == DailyLearningLoop.STAGE_1_WARMUP:
                    loop = switch_today_loop_subject(user, preferred_subject, loop=loop)
                return loop
            return _create_first_loop(user, today, preferred_subject=preferred_subject)
    except IntegrityError:
        loop = DailyLearningLoop.objects.filter(user=user, date=today).order_by('-cycle_number', '-id').first()
        if loop and preferred_subject and loop.subject_id != preferred_subject.id and loop.current_stage == DailyLearningLoop.STAGE_1_WARMUP:
            loop = switch_today_loop_subject(user, preferred_subject, loop=loop)
        return loop


def _create_first_loop(user, today, preferred_subject=None) -> DailyLearningLoop:
    # 2. Yangi sikl: O'quvchining tanlagan/zaif mavzusini yoki fanni aniqlaymiz
    weak_subject = preferred_subject
    weak_topic = None

    if not weak_subject:
        profile = getattr(user, 'profile', None)
        if profile and profile.target_subject:
            weak_subject = profile.target_subject

    if not weak_subject:
        # O'quvchining so'nggi noto'g'ri javoblarini tekshiramiz
        recent_wrong = (
            AttemptAnswer.objects
            .filter(attempt__profile__user=user, is_correct=False, question__subject__isnull=False)
            .select_related('question__subject')
            .order_by('-id')
            .first()
        )
        if recent_wrong:
            weak_subject = recent_wrong.question.subject
            weak_topic = recent_wrong.question.topic

    if not weak_subject:
        weak_subject = Subject.objects.annotate(
            q_cnt=Count('questions')
        ).filter(q_cnt__gt=5).first() or Subject.objects.first()

    if not weak_topic and weak_subject:
        weak_topic = _topic_with_questions(weak_subject)
    if not weak_topic:
        weak_topic = _topic_with_questions()

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
    _ensure_loop_sessions(loop)
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

    # 2. STAGE 2: SPRINT SAVOLLARI (mavzu -> fan -> umumiy, tasodifiy)
    sprint_qs, arena_qs = _loop_question_sets(loop)
    sprint_questions = [_format_question_dict(q) for q in sprint_qs]
    arena_questions = [_format_question_dict(q) for q in arena_qs]

    # 3. STAGE 3: CLEANUP (Flashcards for Session Mistakes)
    cleanup_cards = []
    if loop.session_mistakes_ids:
        mistake_qs = Question.objects.filter(id__in=loop.session_mistakes_ids).prefetch_related('choices')
        for q in mistake_qs:
            correct_opt = q.choices.filter(is_correct=True).first()
            correct_text = correct_opt.text if correct_opt else "To'g'ri javob"
            cleanup_cards.append({
                'id': q.id,
                'front': q.body,
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

    arena_data = {
        'opponent': {
            'name': ghost_name,
            'avatar_url': ghost_avatar,
            'elo_rating': ghost_elo,
            'title': "Abituriyent 2026",
        },
        'duration_seconds': 60,
        'questions': arena_questions,
        # Ghostning har savoldagi natijasi (server hal qiladi; klient faqat ko'rsatadi).
        'ghost_moves': _ghost_moves(loop, len(arena_questions)),
        'points_per_correct': 20,
    }

    # 5. STAGE 5: COMPLETED (Sirli Sandiq & Eco-Daraxt)
    # Yakunlangan siklda — aynan berilgan mukofot (arena yutqazilgan bo'lsa 1.0x,
    # savollar yechilmagan bo'lsa 0); yakunlanmagan siklda — potentsial mukofot.
    if loop.current_stage == DailyLearningLoop.STAGE_5_COMPLETED and not loop.is_chest_claimed:
        reward_multiplier = 0.0
    elif loop.current_stage == DailyLearningLoop.STAGE_5_COMPLETED and not loop.arena_won:
        reward_multiplier = 1.0
    else:
        reward_multiplier = loop.combo_multiplier
    paid = reward_multiplier > 0
    rewards_data = {
        'coins': int(200 * reward_multiplier),
        'xp': int(100 * reward_multiplier),
        'free_essay_credits': 1 if paid else 0,
        'dtm_score_delta': loop.dtm_score_delta,
        'water_reward': 35 if paid else 0,
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
        loop = _get_or_create_today_loop(user, request=request)

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

        active_subj = loop.subject or (loop.topic.subject if loop.topic and loop.topic.subject else None)
        all_subjects = list(Subject.objects.values('id', 'name', 'slug', 'icon_name', 'color'))

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
            'subject': {
                'id': active_subj.id if active_subj else None,
                'name': active_subj.name if active_subj else "Biologiya",
                'slug': active_subj.slug if active_subj else "biologiya",
            },
            'available_subjects': all_subjects,
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


class LoopAnswerView(APIView):
    """
    POST /api/v1/loop/answer/
    Body: {stage: 'sprint'|'arena', question_id, option_id, revenge?: bool}

    Avtopilot sprinti va arena javoblarini serverda tekshiradi. Faqat joriy bosqichdagi
    savollarga javob qabul qilinadi; bir savolga birinchi javob bir marta yoziladi.
    """
    permission_classes = [IsAuthenticated]
    # Sprint javob endpointi bilan bir xil limit (audit LOOP-007).
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'quiz_answer'

    STAGE_MODES = {
        'sprint': (DailyLearningLoop.STAGE_2_SPRINT, 'loop_sprint', 'sprint_session_id'),
        'arena': (DailyLearningLoop.STAGE_4_ARENA, 'loop_arena', 'arena_session_id'),
    }

    def post(self, request):
        from sprint.services import QuizAnswerError, submit_quiz_answer

        if not isinstance(request.data, dict):
            return Response({'ok': False, 'error': "JSON obyekt kutilgan."}, status=status.HTTP_400_BAD_REQUEST)
        stage_key = request.data.get('stage')
        if stage_key not in self.STAGE_MODES:
            return Response({'ok': False, 'error': "stage 'sprint' yoki 'arena' bo'lishi kerak."},
                            status=status.HTTP_400_BAD_REQUEST)
        required_stage, mode, session_field = self.STAGE_MODES[stage_key]

        loop = _get_or_create_today_loop(request.user)
        _ensure_loop_sessions(loop)
        loop.refresh_from_db()
        if loop.current_stage != required_stage:
            return Response({'ok': False, 'error': "Bu bosqich hozir faol emas.", 'current_stage': loop.current_stage},
                            status=status.HTTP_409_CONFLICT)

        revenge = stage_key == 'sprint' and request.data.get('revenge') in (True, 'true', '1', 1)
        try:
            result = submit_quiz_answer(
                request.user, mode, getattr(loop, session_field),
                request.data.get('question_id'), request.data.get('option_id'), revenge=revenge,
            )
        except QuizAnswerError as exc:
            return Response({'ok': False, 'error': exc.message, 'code': exc.code}, status=exc.status_code)

        question = Question.objects.filter(pk=result['question_id']).first()
        return Response({
            'ok': True,
            'is_correct': result['is_correct'],
            'correct_option_id': result['correct_option_id'],
            'duplicate': result['duplicate'],
            'explanation': _explanation_for(question) if question else '',
        })


class AdvanceStageView(APIView):
    """
    POST /api/v1/loop/advance-stage/
    Zanjirni oldinga siljitish (State transition).
    1-bosqich -> 2-bosqich -> (agar xato bo'lsa 3-bosqich, yo'qsa 4-bosqich) -> 5-bosqich

    Natijalar (to'g'ri javoblar, xatolar, arena g'alabasi) klient payload'idan emas,
    POST /loop/answer/ orqali serverda tekshirilgan javoblardan hisoblanadi.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        from django.db import transaction

        if not isinstance(request.data, dict):
            return Response({'ok': False, 'error': "JSON obyekt kutilgan."}, status=status.HTTP_400_BAD_REQUEST)
        # from_stage majburiy (audit LOOP-006): busiz har POST bosqichni ko'r-ko'rona siljitardi.
        requested = request.data.get('from_stage')
        if not requested:
            return Response({'ok': False, 'error': "from_stage majburiy."}, status=status.HTTP_400_BAD_REQUEST)

        user = request.user
        loop = _get_or_create_today_loop(user)
        _ensure_loop_sessions(loop)
        eco_tree, _ = UserEcoTree.objects.get_or_create(user=user)

        water_result = None
        rewards_awarded = None

        # Butun o'tish qulf ostida: parallel so'rovlar bosqichni ikki marta siljitmaydi
        # va mukofotni ikki marta bermaydi.
        with transaction.atomic():
            loop = DailyLearningLoop.objects.select_for_update().get(pk=loop.pk)

            # Bosqich faqat serverdagi joriy holatdan keyingisiga o'tadi. Ilgari klient
            # `from_stage=STAGE_4_ARENA` yuborib, sprint va duelsiz to'g'ridan-to'g'ri sandiq
            # mukofotini olardi (restart-cycle bilan birga — cheksiz tanga).
            from_stage = loop.current_stage
            if requested != from_stage:
                return Response({'ok': False, 'error': "Bosqich ketma-ketligi buzildi", 'current_stage': from_stage},
                                status=status.HTTP_409_CONFLICT)

            if from_stage == DailyLearningLoop.STAGE_1_WARMUP:
                # 1-bosqich tugadi -> 2-bosqich (Sprint) boshlanadi
                loop.current_stage = DailyLearningLoop.STAGE_2_SPRINT
                # Combo tushirilmaydi: 2/3-sikl 2.0x/2.5x bilan boshlanadi (restart-cycle).
                loop.dtm_score_delta = round(loop.dtm_score_delta + 0.4, 2)
                loop.save()

            elif from_stage == DailyLearningLoop.STAGE_2_SPRINT:
                # Natija faqat serverda tekshirilgan javoblardan: javobsiz qolgan savol ham
                # xato sanaladi (aks holda hech narsa yechmay "mukammal sprint" bo'lardi).
                sprint_ids = list(loop.sprint_session.question_ids) if loop.sprint_session_id else []
                results = _session_results(loop.sprint_session)
                mistake_ids = [qid for qid in sprint_ids if results.get(qid) is not True]
                correct_count = sum(1 for qid in sprint_ids if results.get(qid) is True)
                total_count = len(sprint_ids)

                loop.sprint_score = correct_count
                loop.sprint_total = total_count
                loop.dtm_score_delta = round(loop.dtm_score_delta + (correct_count * 0.15), 2)

                if mistake_ids:
                    # Xatolar bor -> 3-bosqichga (Flashcard tozalash) o'tkazamiz
                    loop.session_mistakes_ids = mistake_ids
                    loop.current_stage = DailyLearningLoop.STAGE_3_CLEANUP
                    loop.combo_multiplier = max(loop.combo_multiplier, 1.5)
                else:
                    # 0 ta xato! Mukammal sprint -> 3-bosqichdan sakrab, 2.0x Combo bilan to'g'ri Arenaga!
                    loop.session_mistakes_ids = []
                    loop.current_stage = DailyLearningLoop.STAGE_4_ARENA
                    loop.combo_multiplier = max(loop.combo_multiplier, 2.0)

                loop.save()

            elif from_stage == DailyLearningLoop.STAGE_3_CLEANUP:
                # 3-bosqich (Xatolar Dueli) yakunlandi. Tozalangan xatolar soni klientdan emas,
                # serverda tekshirilgan qasos javoblaridan (audit LOOP-005).
                loop.cleanup_cleared = _cleared_mistakes(loop)
                loop.dtm_score_delta = round(loop.dtm_score_delta + 0.6, 2)
                loop.current_stage = DailyLearningLoop.STAGE_4_ARENA
                loop.combo_multiplier = max(loop.combo_multiplier, 2.0)
                loop.save()

            elif from_stage == DailyLearningLoop.STAGE_4_ARENA:
                # 4-bosqich (1v1 Ghost Duel) yakunlandi -> Sikl to'liq yopildi!
                from core.rewards import grant_rewards_atomic

                arena_ids = list(loop.arena_session.question_ids) if loop.arena_session_id else []
                results = _session_results(loop.arena_session)
                player_correct = sum(1 for qid in arena_ids if results.get(qid) is True)
                ghost_correct = sum(_ghost_moves(loop, len(arena_ids)))
                # Kamida bitta savolga javob berib, ghostdan kam bo'lmagan natija — g'alaba.
                arena_won = bool(results) and player_correct >= ghost_correct
                loop.arena_won = arena_won
                if arena_won:
                    loop.dtm_score_delta = round(loop.dtm_score_delta + 0.8, 2)
                    loop.combo_multiplier = min(2.5, round(loop.combo_multiplier + 0.5, 1))

                loop.current_stage = DailyLearningLoop.STAGE_5_COMPLETED

                # Agar sandiq ochilmagan bo'lsa mukofot beriladi (Double-spend oldini olish)
                # Mukofot faqat haqiqiy ish uchun (audit ECON-001): sprint va arenaning savollariga
                # javob berilgan bo'lishi shart. Ilgari 4 ta bo'sh POST bilan kuniga 3 sikl x 200 tanga olinardi.
                # Sprintda qasos savollari asl savollarni siqib chiqarishi mumkin, arenada vaqt tugashi mumkin,
                # shuning uchun oqilona minimal harakat chegarasi tekshiriladi.
                sprint_ids = list(loop.sprint_session.question_ids) if loop.sprint_session_id else []
                unique_sprint_ids = set(sprint_ids)
                unique_arena_ids = set(arena_ids)
                sprint_answered = set(_session_results(loop.sprint_session))
                effort_ok = (bool(sprint_ids) and bool(arena_ids)
                             and len(results) >= max(1, min(len(unique_arena_ids), 2))
                             and len(sprint_answered) >= max(1, min(len(unique_sprint_ids), 6)))

                if not loop.is_chest_claimed and not effort_ok:
                    # is_chest_claimed False qoladi: u "mukofot haqiqatan berilgan" degani —
                    # daily_chain_completed va share-post shunga tayanadi (ECON-001).
                    water_result = {'water_level': eco_tree.water_level, 'grew': False}
                    coins = 0
                    xp = 0
                elif not loop.is_chest_claimed:
                    # 1. Eco-Daraxtga suv quyiladi (+35%)
                    water_result = eco_tree.water(35)

                    # 2. Atomik tanga va XP. Sikl yopilsa mukofot beriladi; combo
                    # ko'paytirgichi esa faqat arena g'alabasida (yutqazsa — 1.0x).
                    # Savol banki kichik bo'lsa arena sprint savollarini qayta ishlatadi — ularning
                    # javobi sprintda allaqachon ko'rsatilgan, shuning uchun combo berilmaydi (LOOP-001).
                    reused = bool(set(arena_ids) & set(sprint_ids))
                    reward_multiplier = loop.combo_multiplier if (arena_won and not reused) else 1.0
                    coins = int(200 * reward_multiplier)
                    xp = int(100 * reward_multiplier)
                    profile = ensure_profile_for_user(user)
                    grant_rewards_atomic(profile.id, coins_delta=coins, xp_delta=xp)

                    # 3. Bepul AI Esse krediti
                    quota, _ = UserUsageQuota.objects.get_or_create(profile=profile)
                    quota.free_essay_credits = (quota.free_essay_credits or 0) + 1
                    quota.save(update_fields=['free_essay_credits'])

                    loop.is_chest_claimed = True
                else:
                    water_result = {'water_level': eco_tree.water_level, 'grew': False}
                    coins = 0
                    xp = 0

                loop.save()

                rewards_awarded = {
                    'coins': coins,
                    'xp': xp,
                    'free_essay_credits': 1 if coins else 0,
                    'dtm_score_delta': loop.dtm_score_delta,
                    'water_result': water_result,
                    'arena_won': arena_won,
                    'player_correct': player_correct,
                    'ghost_correct': ghost_correct,
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
        from django.db import transaction
        from core.reward_caps import claim_once
        from core.rewards import grant_rewards_atomic

        user = request.user
        loop = _get_or_create_today_loop(user)
        profile = ensure_profile_for_user(user)

        with transaction.atomic():
            loop = DailyLearningLoop.objects.select_for_update().get(pk=loop.pk)

            # Faqat haqiqatan yakunlangan (mukofoti olingan) sikl va har sikl uchun bitta post.
            if loop.current_stage != DailyLearningLoop.STAGE_5_COMPLETED or not loop.is_chest_claimed:
                return Response({'ok': False, 'error': "Avval kunlik siklni yakunlang."},
                                status=status.HTTP_409_CONFLICT)
            if (CommunityPost.objects.filter(author=user, post_type='achievement',
                                             created_at__gte=loop.created_at).exists()
                    or not claim_once(profile.id, 'loop_share_post', loop.id)):
                return Response({'ok': False, 'error': "Bu sikl natijasi allaqachon lentaga chiqarilgan."},
                                status=status.HTTP_409_CONFLICT)

            caption = str(request.data.get('caption') or (
                f"🚀 Bugungi 4-bosqichli Marafonni 100% yopdim (+{loop.dtm_score_delta} DTM Ball)! "
                f"Sirli Sandiq ochildi va Ilm Ildizi Daraxtimga suv quydim! 🔥🎁"
            ))[:1000]

            subject = loop.subject or (loop.topic.subject if loop.topic else None)
            post = CommunityPost.objects.create(
                author=user,
                post_type='achievement',
                title="Kunlik Avtopilot Marafoni Yakunlandi! 🎯",
                caption=caption,
                subject_name=subject.name if subject else 'Asosiy',
                subject_slug=subject.slug if subject else 'tarix',
                correct_count=loop.sprint_score,
                total_questions=loop.sprint_total,
                exam_track=profile.exam_track,
            )

            grant_rewards_atomic(profile.id, xp_delta=15)

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
        from django.db import transaction

        user = request.user
        today = timezone.localdate()
        with transaction.atomic():
            # Foydalanuvchi qatorini qulflaymiz: ikki parallel restart bir xil cycle_number
            # bilan ikkita sikl yaratib, kunlik MAX_CYCLES_PER_DAY limitini chetlab o'tmasin.
            type(user).objects.select_for_update().filter(pk=user.pk).first()
            response = self._restart(user, today)
        return response

    def _restart(self, user, today):
        last_loop = DailyLearningLoop.objects.filter(
            user=user,
            date=today
        ).order_by('-cycle_number', '-id').first()

        # Yangi sikl faqat oldingisi haqiqatan yakunlangandan keyin va kuniga MAX_CYCLES_PER_DAY
        # martagacha: har sikl sandiq mukofoti beradi.
        if last_loop and last_loop.current_stage != DailyLearningLoop.STAGE_5_COMPLETED:
            return Response({'ok': False, 'error': "Avval joriy siklni yakunlang"}, status=status.HTTP_409_CONFLICT)

        if last_loop and not last_loop.is_chest_claimed:
            # Sikl yopilgan, lekin mukofot chegarasiga yetmagan (qisman yechilgan: qasos savollari
            # sprintni siqib chiqargan yoki arenada vaqt tugagan). Bunday holatda keyingi siklga
            # o'tishga ruxsat beriladi, ammo mukofot berilmaydi — aks holda 1 ta javob bilan
            # 200 tanga olish mumkin bo'lardi. Umuman javobsiz yopilgan sikl esa qayta
            # boshlanmaydi (audit ECON-001: bo'sh POSTlar bilan sikl aylantirish).
            sprint_ans = len(_session_results(last_loop.sprint_session)) if last_loop.sprint_session_id else 0
            arena_ans = len(_session_results(last_loop.arena_session)) if last_loop.arena_session_id else 0
            if sprint_ans + arena_ans == 0:
                return Response({'ok': False, 'error': "Avval savollarga javob bering"},
                                status=status.HTTP_409_CONFLICT)

        if last_loop and last_loop.cycle_number >= MAX_CYCLES_PER_DAY:
            return Response({'ok': False, 'error': "Bugungi sikllar limiti tugadi. Ertaga davom etamiz!"},
                            status=status.HTTP_429_TOO_MANY_REQUESTS)

        new_cycle_number = (last_loop.cycle_number + 1) if last_loop else 1
        combo = 2.0 if new_cycle_number == 2 else 2.5

        # Keyingi yangi mavzuni tanlaymiz
        preferred_subject = (last_loop.subject if last_loop and last_loop.subject else None) or _resolve_user_preferred_subject(user)
        new_topic = (_topic_with_questions(preferred_subject,
                                           exclude_id=last_loop.topic_id if last_loop else None,
                                           user=user)
                     or _topic_with_questions(preferred_subject, user=user)
                     or (None if preferred_subject else _topic_with_questions(user=user)))

        from django.db import IntegrityError, transaction

        try:
            with transaction.atomic():
                new_loop = DailyLearningLoop.objects.create(
                    user=user,
                    date=today,
                    cycle_number=new_cycle_number,
                    topic=new_topic,
                    subject=preferred_subject or (new_topic.subject if new_topic else None),
                    current_stage=DailyLearningLoop.STAGE_1_WARMUP,
                    combo_multiplier=combo,  # 2-raund 2.0x, 3-raund 2.5x Super-Combo!
                    dtm_score_delta=0.4,
                )
        except IntegrityError:
            new_loop = DailyLearningLoop.objects.get(
                user=user, date=today, cycle_number=new_cycle_number,
            )

        eco_tree, _ = UserEcoTree.objects.get_or_create(user=user)
        stage_data = _build_stage_data(new_loop, user)

        topic_data = None
        if new_topic:
            topic_data = {
                'id': new_topic.id,
                'title': new_topic.title,
                'subject_name': new_loop.subject.name if new_loop.subject else 'Asosiy',
            }

        active_subj = new_loop.subject or (new_topic.subject if new_topic and new_topic.subject else None)
        all_subjects = list(Subject.objects.values('id', 'name', 'slug', 'icon_name', 'color'))

        return Response({
            'ok': True,
            'loop': {
                'id': new_loop.id,
                'date': str(new_loop.date),
                'cycle_number': new_loop.cycle_number,
                'current_stage': new_loop.current_stage,
                'combo_multiplier': new_loop.combo_multiplier,
                'dtm_score_delta': new_loop.dtm_score_delta,
                'session_mistakes_ids': new_loop.session_mistakes_ids,
                'is_chest_claimed': new_loop.is_chest_claimed,
            },
            'topic': topic_data,
            'subject': {
                'id': active_subj.id if active_subj else None,
                'name': active_subj.name if active_subj else 'Asosiy',
                'slug': active_subj.slug if active_subj else 'asosiy',
            },
            'available_subjects': all_subjects,
            'eco_tree': {
                'growth_stage': eco_tree.growth_stage,
                'stage_name': eco_tree.stage_name,
                'water_level': eco_tree.water_level,
                'root_depth_xp': eco_tree.root_depth_xp,
                'total_cycles_completed': eco_tree.total_cycles_completed,
                'needs_water': eco_tree.water_level < 25,
            },
            'stage_data': stage_data,
            'message': f"🔥 {new_cycle_number}-sikl {combo:.1f}x Super-Combo bilan boshlandi!",
        })


class SetLoopSubjectView(APIView):
    """
    POST /api/v1/loop/set-subject/
    Siklning fanini tanlash yoki o'zgartirish.
    Body:
    { "subject_slug": "biologiya" } yoki { "subject_id": 4 } yoki { "subject": "Biologiya" }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        subject_slug = request.data.get('subject_slug') or request.data.get('slug')
        subject_id = request.data.get('subject_id') or request.data.get('id')
        subject_name = request.data.get('subject') or request.data.get('name')
        force = bool(request.data.get('force', True))

        target_subject = None
        if subject_id:
            target_subject = Subject.objects.filter(id=subject_id).first()
        elif subject_slug:
            target_subject = Subject.objects.filter(slug=subject_slug).first()
        elif subject_name:
            target_subject = Subject.objects.filter(Q(slug=subject_name) | Q(name__iexact=subject_name)).first()

        if not target_subject:
            return Response({'ok': False, 'error': "Fan topilmadi"}, status=status.HTTP_404_NOT_FOUND)

        profile = getattr(user, 'profile', None)
        if profile:
            profile.target_subject = target_subject
            profile.save(update_fields=['target_subject'])
        if hasattr(request, 'session'):
            request.session['selected_subject'] = target_subject.slug
            request.session.modified = True

        loop = switch_today_loop_subject(user, target_subject, force=force)
        stage_data = _build_stage_data(loop, user)

        topic_data = None
        if loop.topic:
            topic_data = {
                'id': loop.topic.id,
                'title': loop.topic.title,
                'subject_name': loop.topic.subject.name if loop.topic.subject else target_subject.name,
            }
        else:
            topic_data = {
                'id': 0,
                'title': f"{target_subject.name} (Aralash)",
                'subject_name': target_subject.name,
            }

        all_subjects = list(Subject.objects.values('id', 'name', 'slug', 'icon_name', 'color'))

        return Response({
            'ok': True,
            'subject': {
                'id': target_subject.id,
                'name': target_subject.name,
                'slug': target_subject.slug,
            },
            'available_subjects': all_subjects,
            'topic': topic_data,
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
            'stage_data': stage_data,
        })
