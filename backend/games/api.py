"""JSON API mirroring games/views.py's 3 mini-games for the Next.js frontend — see
accounts/api.py for the overall JWT-API pattern. Each game's Django view kept the "current
challenge" in request.session (no session for JWT clients — see accounts/api.py's module
docstring for why the whole API is JWT). Fix: the GET response already returns the
challenge/character id, and the client echoes it back in the POST body — same pattern as
tests_app.api's revision deck (server never reveals the correct answer up front)."""
import random

from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view
from rest_framework.response import Response

from core.models import Notification
from tests_app.subject_utils import resolve_subject

from .models import HistoricalCharacter, HistoricalEvent, MapChallenge
from .services import seed_games_if_needed


@api_view(['GET', 'POST'])
def timeline_api(request):
    seed_games_if_needed()
    profile = request.user.profile

    if request.method == 'POST':
        ordered_ids = request.data.get('event_ids') or []
        try:
            ordered_ids = [int(x) for x in ordered_ids]
        except (TypeError, ValueError):
            return Response({'error': "Noto'g'ri format"}, status=400)

        events = {e.id: e for e in HistoricalEvent.objects.filter(id__in=ordered_ids)}
        ordered_events = [events[eid] for eid in ordered_ids if eid in events]
        is_correct = all(ordered_events[i].year <= ordered_events[i + 1].year for i in range(len(ordered_events) - 1))

        if is_correct:
            xp, coins = 100, 10
            profile.add_xp(xp)
            profile.add_coins(coins)
            Notification.objects.create(profile=profile, title="Timeline g'olibi!",
                                         message=f"Voqealarni to'g'ri joylashtirib +{xp} XP va +{coins} tangaga ega bo'ldingiz!",
                                         type='achievement')
            return Response({'correct': True, 'xp': xp, 'coins': coins})

        correct_order = sorted(ordered_events, key=lambda e: e.year)
        return Response({
            'correct': False,
            'correct_order': [{'id': e.id, 'title': e.title, 'year': e.year} for e in correct_order],
        })

    subject, subjects = resolve_subject(request)
    all_events = list(HistoricalEvent.objects.filter(subject=subject) if subject else HistoricalEvent.objects.all())
    selected = random.sample(all_events, 4) if len(all_events) >= 4 else []
    random.shuffle(selected)
    return Response({
        'events': [{'id': e.id, 'title': e.title} for e in selected],
        'subjects': [{'id': s.id, 'name': s.name, 'slug': s.slug} for s in subjects],
        'selected_subject': subject.slug if subject else None,
    })


@api_view(['GET', 'POST'])
def map_api(request):
    seed_games_if_needed()
    profile = request.user.profile

    if request.method == 'POST':
        challenge_id = request.data.get('challenge_id')
        region = request.data.get('region', '')
        challenge = get_object_or_404(MapChallenge, id=challenge_id)
        is_correct = region == challenge.correct_location
        if is_correct:
            xp, coins = 80, 8
            profile.add_xp(xp)
            profile.add_coins(coins)
            return Response({'correct': True, 'xp': xp, 'coins': coins, 'correct_location': challenge.correct_location})
        return Response({'correct': False, 'correct_location': challenge.correct_location})

    subject, subjects = resolve_subject(request)
    challenges = list(MapChallenge.objects.filter(subject=subject) if subject else MapChallenge.objects.all())
    challenge = random.choice(challenges) if challenges else None
    return Response({
        'challenge': {
            'id': challenge.id, 'title': challenge.title, 'description': challenge.description,
            'map_image_url': challenge.map_image_url, 'options': challenge.options or [],
        } if challenge else None,
        'subjects': [{'id': s.id, 'name': s.name, 'slug': s.slug} for s in subjects],
        'selected_subject': subject.slug if subject else None,
    })


@api_view(['GET', 'POST'])
def character_api(request):
    seed_games_if_needed()
    profile = request.user.profile

    if request.method == 'POST':
        character_id = request.data.get('character_id')
        guess = (request.data.get('guess') or '').strip()
        char = get_object_or_404(HistoricalCharacter, id=character_id)
        is_correct = guess.lower() in char.name.lower() or char.name.lower() in guess.lower()
        if is_correct:
            xp, coins = 120, 12
            profile.add_xp(xp)
            profile.add_coins(coins)
            return Response({'correct': True, 'xp': xp, 'coins': coins, 'name': char.name})
        return Response({'correct': False, 'name': char.name})

    subject, subjects = resolve_subject(request)
    characters = list(HistoricalCharacter.objects.filter(subject=subject) if subject else HistoricalCharacter.objects.all())
    char = random.choice(characters) if characters else None
    return Response({
        'character': {
            'id': char.id, 'clue_1': char.clue_1, 'clue_2': char.clue_2, 'clue_3': char.clue_3,
        } if char else None,
        'subjects': [{'id': s.id, 'name': s.name, 'slug': s.slug} for s in subjects],
        'selected_subject': subject.slug if subject else None,
    })
