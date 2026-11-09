import random
import secrets
import uuid
from urllib.parse import quote
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.db import transaction
from core.reward_caps import claim_daily_reward
from django.db.models import F, Count
from accounts.jwt_auth import OptionalAuditAwareJWTAuthentication
from django.utils import timezone
from accounts.models import ensure_profile_for_user
from tests_app.models import Question, Subject
from .models import ArenaGhostReplay, ViralDuelChallenge, UserUsageQuota
from telegrambot.client import send_message


BOT_NAMES = [
    "Sardor Temurov", "Madina Karimova", "Javohir Aliyev", "Shahlo Mirzayeva",
    "Bekzod Rustamov", "Dilnoza Olimova", "Farrux Xolmatov", "Zilola Yusupova",
    "Bobur Samadov", "Nilufar Rahimova", "Akmal Zokirov", "Gulbahor Toshmatova"
]


EMERGENCY_ARENA_QUESTIONS = [
    {
        'id': 900001,
        'body': "Amir Temur qaysi yili Balx shahrida buyuk amir deb e'lon qilingan?",
        'choices': [
            {'id': 90001, 'text': '1365-yil', 'is_correct': False},
            {'id': 90002, 'text': '1370-yil', 'is_correct': True},
            {'id': 90003, 'text': '1385-yil', 'is_correct': False},
            {'id': 90004, 'text': '1391-yil', 'is_correct': False},
        ],
    },
    {
        'id': 900002,
        'body': "O'zbekiston hududidagi qadimgi Oks ibodatxonasi qaysi yodgorlikdan topilgan?",
        'choices': [
            {'id': 90005, 'text': 'Dalvarzintepa', 'is_correct': False},
            {'id': 90006, 'text': 'Taxti Sangin', 'is_correct': True},
            {'id': 90007, 'text': 'Xolchayon', 'is_correct': False},
            {'id': 90008, 'text': 'Qoratepa', 'is_correct': False},
        ],
    },
    {
        'id': 900003,
        'body': "Qadimgi Turon xalqlari qaysi din ta'limotiga e'tiqod qilgan?",
        'choices': [
            {'id': 90009, 'text': 'Zardushtiylik', 'is_correct': True},
            {'id': 90010, 'text': 'Buddizm', 'is_correct': False},
            {'id': 90011, 'text': 'Monaviylik', 'is_correct': False},
            {'id': 90012, 'text': 'Xristianlik', 'is_correct': False},
        ],
    },
    {
        'id': 900004,
        'body': "Al-Xorazmiyning 'Al-jabr val-muqobala' asari qaysi fanga asos solgan?",
        'choices': [
            {'id': 90013, 'text': 'Algebra', 'is_correct': True},
            {'id': 90014, 'text': 'Geometriya', 'is_correct': False},
            {'id': 90015, 'text': 'Astronomiya', 'is_correct': False},
            {'id': 90016, 'text': 'Fizika', 'is_correct': False},
        ],
    },
    {
        'id': 900005,
        'body': "Mirzo Ulug'bek rasadxonasi qaysi shahar yaqinida bunyod etilgan?",
        'choices': [
            {'id': 90017, 'text': 'Samarqand', 'is_correct': True},
            {'id': 90018, 'text': 'Buxoro', 'is_correct': False},
            {'id': 90019, 'text': 'Xiva', 'is_correct': False},
            {'id': 90020, 'text': 'Shahrisabz', 'is_correct': False},
        ],
    },
]


def generate_seed_ghost_replay(subject: Subject = None, target_elo: int = 1050) -> ArenaGhostReplay:
    """Bazada yetarlicha o'yinchi replayi bo'lmaganda real savollardan yangi Ghost Replay yaratadi."""
    q_qs = Question.objects.filter(
        question_type__in=Question.SINGLE_ANSWER_TYPES
    ).annotate(
        choice_cnt=Count('choices')
    ).filter(
        choice_cnt__gte=2
    ).select_related('topic').prefetch_related('choices')

    questions = []
    if subject:
        questions = list(q_qs.filter(subject=subject)[:40])

    if len(questions) < 5:
        # Fallback to any single choice questions with choices
        questions = list(q_qs[:40])

    selected_qs = random.sample(questions, min(7, len(questions))) if questions else []
    moves_log = []
    total_correct = 0

    if selected_qs:
        for q in selected_qs:
            choices = list(q.choices.all())
            if not choices:
                continue
            corr = next((c for c in choices if c.is_correct), choices[0])
            is_correct = (random.random() < 0.75)
            sel_choice = corr if is_correct else (random.choice(choices) if choices else corr)

            time_taken = random.randint(1800, 4500)
            if is_correct:
                total_correct += 1

            moves_log.append({
                'question_id': q.id,
                'selected_option_id': sel_choice.id if sel_choice else None,
                'is_correct': is_correct,
                'time_taken_ms': time_taken,
                'score': 10 if is_correct else 0,
            })
    else:
        # DBda savollar bo'lmasa emergency savollardan foydalanamiz
        for eq in EMERGENCY_ARENA_QUESTIONS:
            corr = next((c for c in eq['choices'] if c['is_correct']), eq['choices'][0])
            is_correct = (random.random() < 0.75)
            sel_choice = corr if is_correct else random.choice(eq['choices'])
            time_taken = random.randint(1800, 4500)
            if is_correct:
                total_correct += 1
            moves_log.append({
                'question_id': eq['id'],
                'selected_option_id': sel_choice['id'],
                'is_correct': is_correct,
                'time_taken_ms': time_taken,
                'score': 10 if is_correct else 0,
            })

    bot_name = random.choice(BOT_NAMES)
    seed_str = abs(hash(bot_name)) % 1000
    avatar = f"https://api.dicebear.com/7.x/adventurer/svg?seed={seed_str}"
    q_ids = [q.id for q in selected_qs] if selected_qs else [eq['id'] for eq in EMERGENCY_ARENA_QUESTIONS]

    ghost = ArenaGhostReplay.objects.create(
        subject=subject,
        player_name=bot_name,
        avatar_url=avatar,
        elo_rating=max(800, target_elo + random.randint(-80, 80)),
        moves_log=moves_log,
        question_ids=q_ids,
        total_correct=total_correct,
        total_questions=len(q_ids),
        avg_time_ms=int(sum(m['time_taken_ms'] for m in moves_log) / max(1, len(moves_log))),
        is_active=True
    )
    return ghost


class GhostMatchmakeAPIView(APIView):
    """POST /api/growth/arena/matchmake/
    1v1 Arenaga kirganda 3 soniyalik aqlli qidiruv va Ghost Replay ulab berish.
    Autentifikatsiyadan o'tgan yoki mehmon foydalanuvchilar uchun ochiq.
    """
    authentication_classes = [OptionalAuditAwareJWTAuthentication]
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        try:
            subject_slug = request.data.get('subject_slug') or 'tarix'
            user_elo = 1000

            profile = None
            if request.user and request.user.is_authenticated:
                try:
                    profile = ensure_profile_for_user(request.user)
                    user_elo = profile.elo_rating or 1000
                except Exception:
                    profile = None

            subject = None
            if subject_slug:
                subject = Subject.objects.filter(slug=subject_slug).first()

            # 1-QADAM: Bazadan foydalanuvchining darajasiga yaqin (ELO ± 150) Ghost Replay qidirish
            ghost = None
            if subject:
                ghost_qs = ArenaGhostReplay.objects.filter(subject=subject, is_active=True)
                if profile:
                    ghost_qs = ghost_qs.exclude(player=profile)
                ghost = ghost_qs.filter(
                    elo_rating__gte=user_elo - 150,
                    elo_rating__lte=user_elo + 150
                ).order_by('?').first()

                if not ghost:
                    ghost = ghost_qs.order_by('?').first()

            if not ghost:
                # Agar mos replay bo'lmasa — yangi realistik ghost replay yaratamiz
                ghost = generate_seed_ghost_replay(subject=subject, target_elo=user_elo)

            # Replaydagi savollarni to'liq yuklash
            q_ids = [int(qid) for qid in (ghost.question_ids or []) if str(qid).isdigit()]
            questions_map = {q.id: q for q in Question.objects.filter(id__in=q_ids).prefetch_related('choices')}
            ordered_questions = []

            for q_id in q_ids:
                q = questions_map.get(q_id)
                if q:
                    choices = [{'id': c.id, 'text': c.text, 'is_correct': c.is_correct} for c in q.choices.all()]
                    if len(choices) >= 2:
                        ordered_questions.append({
                            'id': q.id,
                            'body': q.body,
                            'choices': choices,
                        })

            # Agar bazadan savollar topilmasa, emergency savollar ulanadi
            if len(ordered_questions) < 3:
                ordered_questions = [
                    {
                        'id': eq['id'],
                        'body': eq['body'],
                        'choices': eq['choices'],
                    }
                    for eq in EMERGENCY_ARENA_QUESTIONS
                ]

            match_id = f"ghost_match_{uuid.uuid4().hex[:10]}"

            return Response({
                'ok': True,
                'match_id': match_id,
                'subject_name': subject.name if subject else "Aralash Fanlar",
                'opponent': {
                    'id': ghost.id,
                    'name': ghost.player_name or "Abituriyent",
                    'avatar_url': ghost.avatar_url or "https://api.dicebear.com/7.x/adventurer/svg?seed=fighter",
                    'elo_rating': ghost.elo_rating or 1000,
                    'is_ghost': True,
                },
                'questions': ordered_questions,
                'ghost_moves': ghost.moves_log or [],
            })
        except Exception:
            # 100% kafolatlangan failsafe fallback — hech qachon 500 bermaydi
            match_id = f"ghost_match_{uuid.uuid4().hex[:10]}"
            return Response({
                'ok': True,
                'match_id': match_id,
                'subject_name': "Aralash Fanlar",
                'opponent': {
                    'id': 7777,
                    'name': "Sardor Temurov",
                    'avatar_url': "https://api.dicebear.com/7.x/adventurer/svg?seed=fighter",
                    'elo_rating': 1050,
                    'is_ghost': True,
                },
                'questions': [
                    {'id': eq['id'], 'body': eq['body'], 'choices': eq['choices']}
                    for eq in EMERGENCY_ARENA_QUESTIONS
                ],
                'ghost_moves': [
                    {
                        'question_id': eq['id'],
                        'selected_option_id': next((c['id'] for c in eq['choices'] if c['is_correct']), eq['choices'][0]['id']),
                        'is_correct': True,
                        'time_taken_ms': random.randint(2200, 3800),
                        'score': 10,
                    }
                    for eq in EMERGENCY_ARENA_QUESTIONS
                ],
            })


class RecordPlayerReplayAPIView(APIView):
    """POST /api/growth/arena/record-replay/
    Haqiqiy o'quvchi o'yin yechganda uning harakatlarini kelajakdagi boshqa o'quvchilarga
    Ghost Replay sifatida bazaga saqlash.
    """
    authentication_classes = [OptionalAuditAwareJWTAuthentication]
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        try:
            if not request.user or not request.user.is_authenticated:
                return Response({'ok': True, 'replay_id': None, 'message': 'Mehmon sessiyasi'})

            try:
                profile = ensure_profile_for_user(request.user)
            except Exception:
                return Response({'ok': True, 'replay_id': None, 'message': 'Profil topilmadi'})

            moves_log = request.data.get('moves_log', [])
            question_ids = request.data.get('question_ids', [])
            subject_id = request.data.get('subject_id')

            if not isinstance(moves_log, list) or not moves_log:
                return Response({'ok': True, 'replay_id': None, 'message': "moves_log bo'sh"})

            valid_moves = [m for m in moves_log if isinstance(m, dict)]
            total_correct = sum(1 for m in valid_moves if m.get('is_correct'))
            total_q = len(valid_moves)
            avg_time = int(sum((m.get('time_taken_ms', 3000) for m in valid_moves), 0) / max(1, total_q))

            subj = None
            if subject_id:
                try:
                    subj = Subject.objects.filter(pk=subject_id).first()
                except Exception:
                    subj = None

            player_name = profile.user.first_name or profile.user.username or "Abituriyent"
            player_avatar = profile.avatar_url or f"https://api.dicebear.com/7.x/adventurer/svg?seed={profile.user.username or 'fighter'}"
            player_elo = profile.elo_rating or 1000

            replay = ArenaGhostReplay.objects.create(
                player=profile,
                subject=subj,
                player_name=player_name,
                avatar_url=player_avatar,
                elo_rating=player_elo,
                moves_log=valid_moves,
                question_ids=question_ids if isinstance(question_ids, list) else [],
                total_correct=total_correct,
                total_questions=total_q,
                avg_time_ms=avg_time,
                is_active=True
            )

            return Response({
                'ok': True,
                'replay_id': replay.id,
                'message': "Ghost Replay muvaffaqiyatli saqlandi."
            })
        except Exception:
            return Response({'ok': True, 'replay_id': None, 'message': 'Replay saqlandi'})


class CreateDuelChallengeAPIView(APIView):
    """POST /api/growth/arena/create-duel/
    Sinfdoshni duelga chaqirish uchun maxsus StartParam token yaratadi.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        profile = ensure_profile_for_user(request.user)
        replay_id = request.data.get('replay_id')
        score = int(request.data.get('score', 0))

        replay = ArenaGhostReplay.objects.filter(pk=replay_id).first()
        if not replay:
            # Agar replay ko'rsatilmagan bo'lsa, oxirgi replayini olamiz
            replay = ArenaGhostReplay.objects.filter(player=profile).first()

        if not replay:
            return Response({'ok': False, 'error': "Duel uchun replay topilmadi"}, status=404)

        # Token prefikssiz saqlanadi: havolada `startapp=duel_<token>` bo'ladi, frontend esa
        # `start_param` dan `duel_` ni olib tashlab shu tokenni so'raydi. Ilgari token
        # prefiks bilan saqlanardi va do'st havolani ochganda duel hech qachon topilmasdi.
        token = secrets.token_urlsafe(9)
        duel = ViralDuelChallenge.objects.create(
            duel_token=token,
            creator=profile,
            replay=replay,
            subject=replay.subject,
            creator_score=score or replay.total_correct * 10
        )

        bot_username = "ilmildiziuz_bot"
        share_url = f"https://t.me/{bot_username}/app?startapp=duel_{token}"
        subj_title = replay.subject.name if replay.subject else "Tarix"
        
        share_text = (
            f"🔥 Men IlmIldizi-da '{subj_title}' bo'yicha {replay.total_questions} tadan "
            f"{replay.total_correct} ta savolga to'g'ri javob berdim! ⚔️ Meni duelda yenga olasanmi? "
            f"Kuchingni ko'rsat 👇"
        )

        telegram_native_share_link = f"https://t.me/share/url?url={quote(share_url, safe='')}&text={quote(share_text, safe='')}"

        return Response({
            'ok': True,
            'duel_token': token,
            'share_url': share_url,
            'telegram_share_link': telegram_native_share_link,
            'share_text': share_text,
            'reward_preview': "+100 Tanga va +1 Bepul AI Esse tekshiruvi"
        })


class GetDuelChallengeAPIView(APIView):
    """GET /api/growth/arena/duel/<duel_token>/
    Chaqiruv havolasi orqali kirgan do'stiga raqibining Ghost Replay ma'lumotlarini taqdim etadi.
    """
    permission_classes = [AllowAny]

    def get(self, request, duel_token, *args, **kwargs):
        duel = ViralDuelChallenge.objects.select_related('creator', 'replay', 'subject').filter(duel_token=duel_token).first()
        if not duel:
            return Response({'ok': False, 'error': "Duel topilmadi yoki muddati o'tgan"}, status=404)

        replay = duel.replay
        questions_map = {q.id: q for q in Question.objects.filter(id__in=replay.question_ids).prefetch_related('choices')}
        questions_data = []

        for q_id in replay.question_ids:
            q = questions_map.get(q_id)
            if q:
                questions_data.append({
                    'id': q.id,
                    'body': q.body,
                    'choices': [{'id': c.id, 'text': c.text, 'is_correct': c.is_correct} for c in q.choices.all()],
                })

        return Response({
            'ok': True,
            'duel': {
                'token': duel.duel_token,
                'creator_name': duel.creator.user.first_name or duel.creator.user.username,
                'creator_avatar': duel.creator.avatar_url,
                'creator_score': duel.creator_score,
                'subject_name': duel.subject.name if duel.subject else "Aralash",
                'questions_count': len(questions_data),
            },
            'questions': questions_data,
            'opponent_moves': replay.moves_log,
        })


class SubmitDuelResultAPIView(APIView):
    """POST /api/growth/arena/duel/<duel_token>/submit/
    Do'sti duelni tugatganda natijani qayd etish va taklif qilgan o'quvchiga bonus berish.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, duel_token, *args, **kwargs):
        challenger_profile = ensure_profile_for_user(request.user)
        try:
            challenger_score = int(request.data.get('score', 0))
        except (TypeError, ValueError):
            challenger_score = 0

        # Qulf + bir martalik holat: ilgari duelni yaratgan o'quvchining O'ZI uni
        # topshira olardi va har yangi duel uchun +100 tanga va bepul AI esse krediti
        # olardi (cheksiz). Takroriy/parallel so'rovlar ham bonusni ikki marta berishi
        # mumkin edi.
        with transaction.atomic():
            duel = (ViralDuelChallenge.objects.select_for_update()
                    .select_related('creator', 'creator__user').filter(duel_token=duel_token).first())
            if not duel:
                return Response({'ok': False, 'error': "Duel topilmadi"}, status=404)
            if duel.creator_id == challenger_profile.id:
                return Response({'ok': False, 'error': "O'z duelingizni o'zingiz topshira olmaysiz"}, status=400)
            if duel.status == 'completed':
                return Response({'ok': False, 'error': "Bu duel allaqachon yakunlangan"}, status=409)

            duel.challenger = challenger_profile
            duel.challenger_score = challenger_score
            duel.status = 'completed'
            duel.completed_at = timezone.now()

            award_bonus = not duel.bonus_awarded
            # Kunlik limit: har yangi duel uchun +100 tanga — boshqa akkaunt bilan o'z
            # duellarini topshirib cheksiz tanga yig'ish mumkin edi.
            if award_bonus and not claim_daily_reward(duel.creator_id, 'duel_invite_bonus'):
                duel.bonus_awarded = True
                award_bonus = False
            if award_bonus:
                duel.bonus_awarded = True
                duel.creator.add_coins(100)
                quota, _ = UserUsageQuota.objects.get_or_create(profile=duel.creator)
                UserUsageQuota.objects.filter(pk=quota.pk).update(free_essay_credits=F('free_essay_credits') + 1)
            duel.save()

        # Telegram Bot orqali taklifchiga xushxabar yuborish (tranzaksiyadan tashqarida —
        # tarmoq so'rovi qatorni qulflab turmasin).
        if award_bonus and duel.creator.telegram_id:
            winner_text = "Siz g'olib bo'ldingiz! 🏆" if duel.creator_score >= challenger_score else f"{challenger_profile.user.username} ustun keldi!"
            msg = (
                f"⚔️ <b>Do'stingiz duelingizni qabul qildi va yakunladi!</b>\n\n"
                f"👤 Raqib: <b>{challenger_profile.user.username}</b>\n"
                f"📊 Sizning ballingiz: <b>{duel.creator_score}</b>\n"
                f"📊 Do'stingiz balli: <b>{challenger_score}</b>\n\n"
                f"{winner_text}\n"
                f"🎁 <i>Sizga taklif uchun +100 Tanga va 1 ta Bepul AI Esse tekshiruvi berildi!</i>"
            )
            try:
                send_message(chat_id=duel.creator.telegram_id, text=msg)
            except Exception:
                pass

        return Response({
            'ok': True,
            'creator_score': duel.creator_score,
            'challenger_score': challenger_score,
            'is_winner': challenger_score > duel.creator_score,
            'reward_received': "+50 XP, +25 Tanga"
        })

