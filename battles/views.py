import random
from django.db.models import Q
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.http import HttpResponse, JsonResponse
from django.utils import timezone
from accounts.models import Profile
from core.models import Notification, ProfileMission
from tests_app.models import Question, AnswerOption
from tests_app.subject_utils import current_subject
from .models import Battle, BattleRound, BattlePlayerAnswer

BOT_NAMES = ["Sardor", "Aziza", "Jahongir", "Malika", "Bekzod", "Nodira", "Farrux", "Kamola"]
ROUNDS_PER_BATTLE = 5
POINTS_PER_CORRECT = 10


@login_required
def arena(request):
    profile = request.user.profile

    finished_battles = Battle.objects.filter(
        Q(player1=profile) | Q(player2=profile), status='finished'
    )
    total_battles = finished_battles.count()
    wins = finished_battles.filter(winner=profile).count()
    draws = finished_battles.filter(winner__isnull=True).count()
    losses = total_battles - wins - draws

    from tests_app.subject_utils import resolve_subject
    subject, subjects = resolve_subject(request)

    return render(request, 'battles/arena.html', {
        'profile': profile,
        'total_battles': total_battles,
        'wins': wins,
        'losses': losses,
        'subjects': subjects,
        'selected_subject': subject,
    })


@login_required
def start_battle_quiz(request):
    """Creates a real Battle against an AI opponent using real random questions from the question bank."""
    profile = request.user.profile

    # Battle rounds are quick-fire A/B/C/D — only question types that actually use
    # AnswerOption + is_correct are eligible. Without this filter, a randomly-picked
    # matching/grouped_item/open_written question would have no usable choices and crash
    # the bot's answer selection below (random.choice on an empty list).
    # Battle questions come from the subject the player is currently studying.
    subject = current_subject(request)
    q_filter = Question.objects.filter(question_type__in=Question.SINGLE_ANSWER_TYPES)
    if subject:
        q_filter = q_filter.filter(subject=subject)
    questions = list(q_filter.prefetch_related('choices').order_by('?')[:ROUNDS_PER_BATTLE])
    if len(questions) < 2:
        return JsonResponse({'success': False, 'error': "Bu fanda jang uchun savollar yetarli emas."}, status=400)

    bot_name = random.choice(BOT_NAMES)
    elo_offset = random.randint(-80, 80)
    bot_elo = max(500, profile.elo_rating + elo_offset)
    # Bot accuracy scales with its relative ELO strength vs the player.
    bot_accuracy = min(0.92, max(0.35, 0.6 + (bot_elo - profile.elo_rating) / 400))

    battle = Battle.objects.create(
        player1=profile,
        status='active',
        is_vs_bot=True,
        bot_name=bot_name,
        bot_avatar_url=f'https://api.dicebear.com/7.x/adventurer/svg?seed={bot_name}',
        bot_elo_rating=bot_elo,
    )

    questions_payload = []
    for idx, q in enumerate(questions, start=1):
        choices = list(q.choices.all())
        random.shuffle(choices)

        correct_choice = next((c for c in choices if c.is_correct), None)
        if correct_choice and random.random() < bot_accuracy:
            bot_choice = correct_choice
            bot_is_correct = True
        else:
            wrong_choices = [c for c in choices if not c.is_correct]
            bot_choice = random.choice(wrong_choices) if wrong_choices else correct_choice
            bot_is_correct = bool(correct_choice and bot_choice.id == correct_choice.id)

        BattleRound.objects.create(
            battle=battle,
            question=q,
            round_number=idx,
            bot_choice=bot_choice,
            bot_is_correct=bot_is_correct,
        )

        questions_payload.append({
            "round_number": idx,
            "question_id": q.id,
            "text": q.body,
            "choices": [{"id": c.id, "text": c.text} for c in choices],
        })

    return JsonResponse({
        "success": True,
        "battle_id": battle.id,
        "questions": questions_payload,
        "opponent": {
            "name": battle.bot_name,
            "avatar": battle.bot_avatar_url,
            "elo": battle.bot_elo_rating,
        }
    })


@login_required
def submit_round(request):
    """Server-side authoritative grading for a single battle round."""
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Method not allowed'}, status=405)

    profile = request.user.profile
    battle_id = request.POST.get('battle_id')
    round_number = request.POST.get('round_number')
    choice_id = request.POST.get('choice_id')

    battle = get_object_or_404(Battle, id=battle_id, player1=profile)
    if battle.status != 'active':
        return JsonResponse({'success': False, 'error': 'Bu jang faol emas.'}, status=400)

    battle_round = get_object_or_404(BattleRound, battle=battle, round_number=round_number)

    if BattlePlayerAnswer.objects.filter(battle_round=battle_round, player=profile).exists():
        return JsonResponse({'success': False, 'error': 'Bu raundga allaqachon javob berilgan.'}, status=400)

    selected_choice = None
    is_correct = False
    if choice_id:
        selected_choice = get_object_or_404(AnswerOption, id=choice_id, question=battle_round.question)
        is_correct = selected_choice.is_correct

    BattlePlayerAnswer.objects.create(
        battle_round=battle_round,
        player=profile,
        selected_choice=selected_choice,
        is_correct=is_correct,
    )

    correct_choice = battle_round.question.choices.filter(is_correct=True).first()

    player_score = BattlePlayerAnswer.objects.filter(
        battle_round__battle=battle, player=profile, is_correct=True
    ).count() * POINTS_PER_CORRECT
    opponent_score = BattleRound.objects.filter(
        battle=battle, round_number__lte=battle_round.round_number, bot_is_correct=True
    ).count() * POINTS_PER_CORRECT

    return JsonResponse({
        'success': True,
        'is_correct': is_correct,
        'correct_choice_id': correct_choice.id if correct_choice else None,
        'opponent_choice_id': battle_round.bot_choice_id,
        'opponent_is_correct': battle_round.bot_is_correct,
        'player_score': player_score,
        'opponent_score': opponent_score,
    })


@login_required
def finish_battle(request):
    """Computes the real outcome from persisted answers and awards prizes accordingly."""
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Method not allowed'}, status=405)

    profile = request.user.profile
    battle_id = request.POST.get('battle_id')
    battle = get_object_or_404(Battle, id=battle_id, player1=profile)

    if battle.status == 'finished':
        return JsonResponse({'success': False, 'error': 'Bu jang allaqachon yakunlangan.'}, status=400)

    total_rounds = battle.rounds.count()
    answered_rounds = BattlePlayerAnswer.objects.filter(battle_round__battle=battle, player=profile).count()
    if answered_rounds < total_rounds:
        return JsonResponse({'success': False, 'error': 'Barcha raundlarga javob berilmagan.'}, status=400)

    player_score = BattlePlayerAnswer.objects.filter(
        battle_round__battle=battle, player=profile, is_correct=True
    ).count() * POINTS_PER_CORRECT
    opponent_score = battle.rounds.filter(bot_is_correct=True).count() * POINTS_PER_CORRECT

    if player_score > opponent_score:
        result = 'win'
        battle.winner = profile
        xp_gained, coins_gained, elo_change = 200, 20, 25
    elif player_score < opponent_score:
        result = 'loss'
        xp_gained, coins_gained, elo_change = 20, 0, -15
    else:
        result = 'draw'
        xp_gained, coins_gained, elo_change = 50, 5, 0

    battle.status = 'finished'
    battle.finished_at = timezone.now()
    battle.save()

    profile.add_xp(xp_gained)
    profile.add_coins(coins_gained)
    profile.elo_rating = max(500, profile.elo_rating + elo_change)
    profile.save()

    if result == 'win':
        today = timezone.localdate()
        p_missions = ProfileMission.objects.filter(profile=profile, date=today, mission__action_type='battle')
        for pm in p_missions:
            pm.current_count += 1
            if pm.current_count >= pm.mission.target_count and not pm.is_completed:
                pm.is_completed = True
                profile.add_xp(pm.mission.xp_reward)
                profile.add_coins(pm.mission.coin_reward)
            pm.save()

    result_messages = {
        'win': ("Battle g'olibi!", f"Arena jangida g'olib bo'ldingiz! +{xp_gained} XP, +{coins_gained} tanga, +{elo_change} ELO balli berildi!"),
        'loss': ("Battle yakunlandi", f"Arena jangida yutqazdingiz. ELO reytingingiz: {elo_change} balli o'zgardi."),
        'draw': ("Battle durang!", f"Jang durang bilan yakunlandi. +{xp_gained} XP, +{coins_gained} tanga berildi."),
    }
    title, message = result_messages[result]
    Notification.objects.create(profile=profile, title=title, message=message, type='battle')

    return JsonResponse({
        'success': True,
        'result': result,
        'player_score': player_score,
        'opponent_score': opponent_score,
        'xp_gained': xp_gained,
        'coins_gained': coins_gained,
        'elo_change': elo_change,
        'msg': message,
    })
