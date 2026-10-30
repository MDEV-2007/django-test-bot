import random
import uuid
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
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


def generate_seed_ghost_replay(subject: Subject = None, target_elo: int = 1050) -> ArenaGhostReplay:
    """Bazada yetarlicha o'yinchi replayi bo'lmaganda real savollardan yangi Ghost Replay yaratadi."""
    q_qs = Question.objects.filter(
        question_type__in=Question.SINGLE_ANSWER_TYPES
    ).select_related('topic').prefetch_related('choices')
    
    if subject:
        q_qs = q_qs.filter(subject=subject)

    questions = list(q_qs[:40])
    if len(questions) < 5:
        # Fallback to any single choice questions
        questions = list(Question.objects.filter(question_type__in=Question.SINGLE_ANSWER_TYPES).prefetch_related('choices')[:20])

    selected_qs = random.sample(questions, min(7, len(questions)))
    moves_log = []
    total_correct = 0

    for q in selected_qs:
        choices = list(q.choices.all())
        corr = next((c for c in choices if c.is_correct), choices[0] if choices else None)
        # 75% ehtimollik bilan to'g'ri topadi
        is_correct = random.random() < 0.75
        sel_choice = corr if is_correct else random.choice(choices)
        
        # Real inson javob vaqti: 1.8 soniyadan 4.5 soniyagacha
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

    bot_name = random.choice(BOT_NAMES)
    seed_str = abs(hash(bot_name)) % 1000
    avatar = f"https://api.dicebear.com/7.x/adventurer/svg?seed={seed_str}"

    ghost = ArenaGhostReplay.objects.create(
        subject=subject,
        player_name=bot_name,
        avatar_url=avatar,
        elo_rating=max(800, target_elo + random.randint(-80, 80)),
        moves_log=moves_log,
        question_ids=[q.id for q in selected_qs],
        total_correct=total_correct,
        total_questions=len(selected_qs),
        avg_time_ms=int(sum(m['time_taken_ms'] for m in moves_log) / max(1, len(moves_log))),
        is_active=True
    )
    return ghost


class GhostMatchmakeAPIView(APIView):
    """POST /api/growth/arena/matchmake/
    1v1 Arenaga kirganda 3 soniyalik aqlli qidiruv va Ghost Replay ulab berish.
    """
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        subject_slug = request.data.get('subject_slug') or 'tarix'
        user_elo = 1000

        profile = None
        if request.user and request.user.is_authenticated:
            profile = ensure_profile_for_user(request.user)
            user_elo = profile.elo_rating or 1000

        subject = Subject.objects.filter(slug=subject_slug).first()

        # 1-QADAM: Bazadan foydalanuvchining darajasiga yaqin (ELO ± 150) Ghost Replay qidirish
        ghost = ArenaGhostReplay.objects.filter(
            subject=subject,
            is_active=True,
            elo_rating__gte=user_elo - 150,
            elo_rating__lte=user_elo + 150
        ).exclude(player=profile).order_by('?').first()

        if not ghost:
            # Agar mos replikatsiya bo'lmasa, umumiy subyekt bo'yicha
            ghost = ArenaGhostReplay.objects.filter(subject=subject, is_active=True).exclude(player=profile).order_by('?').first()

        if not ghost:
            # Agar bazada umuman yo'q bo'lsa — yangi realistik ghost replikatsiya yaratamiz
            ghost = generate_seed_ghost_replay(subject=subject, target_elo=user_elo)

        # Replaydagi savollarni to'liq yuklash
        questions_map = {q.id: q for q in Question.objects.filter(id__in=ghost.question_ids).prefetch_related('choices')}
        ordered_questions = []

        for q_id in ghost.question_ids:
            q = questions_map.get(q_id)
            if q:
                ordered_questions.append({
                    'id': q.id,
                    'body': q.body,
                    'choices': [{'id': c.id, 'text': c.text, 'is_correct': c.is_correct} for c in q.choices.all()],
                })

        match_id = f"ghost_match_{uuid.uuid4().hex[:10]}"

        return Response({
            'ok': True,
            'match_id': match_id,
            'subject_name': subject.name if subject else "Aralash Fanlar",
            'opponent': {
                'id': ghost.id,
                'name': ghost.player_name,
                'avatar_url': ghost.avatar_url,
                'elo_rating': ghost.elo_rating,
                'is_ghost': True,
            },
            'questions': ordered_questions,
            'ghost_moves': ghost.moves_log,
        })


class RecordPlayerReplayAPIView(APIView):
    """POST /api/growth/arena/record-replay/
    Haqiqiy o'quvchi o'yin yechganda uning harakatlarini kelajakdagi boshqa o'quvchilarga
    Ghost Replay sifatida bazaga saqlash.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        profile = ensure_profile_for_user(request.user)
        moves_log = request.data.get('moves_log', [])
        question_ids = request.data.get('question_ids', [])
        subject_id = request.data.get('subject_id')

        if not moves_log:
            return Response({'ok': False, 'error': "moves_log bo'sh bo'lishi mumkin emas"}, status=400)

        total_correct = sum(1 for m in moves_log if m.get('is_correct'))
        total_q = len(moves_log)
        avg_time = int(sum(m.get('time_taken_ms', 3000) for m in moves_log) / max(1, total_q))

        subj = Subject.objects.filter(pk=subject_id).first() if subject_id else None

        replay = ArenaGhostReplay.objects.create(
            player=profile,
            subject=subj,
            player_name=profile.user.first_name or profile.user.username,
            avatar_url=profile.avatar_url,
            elo_rating=profile.elo_rating,
            moves_log=moves_log,
            question_ids=question_ids,
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

        token = f"duel_{random.randint(1000, 9999)}_{profile.user.username.lower()}"
        duel = ViralDuelChallenge.objects.create(
            duel_token=token,
            creator=profile,
            replay=replay,
            subject=replay.subject,
            creator_score=score or replay.total_correct * 10
        )

        bot_username = "ilmildiziuz_bot"
        share_url = f"https://t.me/{bot_username}/app?startapp={token}"
        subj_title = replay.subject.name if replay.subject else "Tarix"
        
        share_text = (
            f"🔥 Men IlmIldizi-da '{subj_title}' bo'yicha {replay.total_questions} tadan "
            f"{replay.total_correct} ta savolga to'g'ri javob berdim! ⚔️ Meni duelda yenga olasanmi? "
            f"Kuchingni ko'rsat 👇"
        )

        telegram_native_share_link = f"https://t.me/share/url?url={share_url}&text={share_text}"

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
        duel = ViralDuelChallenge.objects.select_related('creator').filter(duel_token=duel_token).first()
        
        if not duel:
            return Response({'ok': False, 'error': "Duel topilmadi"}, status=404)

        challenger_score = int(request.data.get('score', 0))
        duel.challenger = challenger_profile
        duel.challenger_score = challenger_score
        duel.status = 'completed'
        duel.completed_at = timezone.now()

        # Bonus taqsimoti: taklif qilgan o'quvchiga 100 tanga va 1 ta AI Esse krediti
        if not duel.bonus_awarded:
            duel.bonus_awarded = True
            duel.creator.coins += 100
            duel.creator.save(update_fields=['coins'])

            quota, _ = UserUsageQuota.objects.get_or_create(profile=duel.creator)
            quota.free_essay_credits += 1
            quota.save(update_fields=['free_essay_credits'])

            # Telegram Bot orqali taklifchiga xushxabar yuborish
            if duel.creator.telegram_id:
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

        duel.save()

        return Response({
            'ok': True,
            'creator_score': duel.creator_score,
            'challenger_score': challenger_score,
            'is_winner': challenger_score > duel.creator_score,
            'reward_received': "+50 XP, +25 Tanga"
        })

