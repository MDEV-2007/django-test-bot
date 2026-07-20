import random
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.http import HttpResponse, JsonResponse
from accounts.models import Profile
from core.models import Notification
from tests_app.subject_utils import resolve_subject
from .models import HistoricalEvent, MapChallenge, HistoricalCharacter

def seed_games_if_needed():
    """Seeds the built-in games' history content (attached to the Tarix subject) on a
    fresh database. Other subjects start empty until their content is added."""
    from tests_app.models import Subject
    tarix = Subject.objects.filter(name='Tarix').first()

    if not HistoricalEvent.objects.exists():
        HistoricalEvent.objects.create(subject=tarix, title="Amir Temur tavalludi", year=1336, era="medieval")
        HistoricalEvent.objects.create(subject=tarix, title="Temuriylar imperiyasi tashkil topishi", year=1370, era="medieval")
        HistoricalEvent.objects.create(subject=tarix, title="Ulug'bek rasadxonasi qurilishi", year=1428, era="medieval")
        HistoricalEvent.objects.create(subject=tarix, title="Alisher Navoiy tavalludi", year=1441, era="medieval")
        HistoricalEvent.objects.create(subject=tarix, title="Zahiriddin Muhammad Bobur tavalludi", year=1483, era="medieval")
        HistoricalEvent.objects.create(subject=tarix, title="Boburning Kobulni egallashi", year=1504, era="medieval")
        HistoricalEvent.objects.create(subject=tarix, title="Grijan janggi va Boburning Hindistonga yurishi", year=1526, era="medieval")

    if not MapChallenge.objects.exists():
        MapChallenge.objects.create(
            subject=tarix,
            title="Temuriylar Imperiyasi markazi",
            description="Temuriylar imperiyasi dastlab shakllangan Movarounnahr mintaqasini belgilang.",
            correct_location="Movarounnahr",
            options=["Movarounnahr", "Xuroson", "Eron", "Hindiston"],
            map_image_url="https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/Khorasan-Transoxiana-Khwarazm.svg/960px-Khorasan-Transoxiana-Khwarazm.svg.png"
        )

    if not HistoricalCharacter.objects.exists():
        HistoricalCharacter.objects.create(
            subject=tarix,
            name="Amir Temur",
            clue_1="1336-yilda Kesh (Hozirgi Shahrisabz) yaqinidagi Xoja Ilg'or qishlog'ida tavallud topgan.",
            clue_2="O'z davlatining poytaxti etib Samarqand shahrini tanlagan va uni ulug'vor poytaxtga aylantirgan.",
            clue_3="G'arbda Tamerlan nomi bilan tanilgan buyuk Movarounnahr sarkardasi va davlat arbobi.",
            difficulty="easy"
        )
        HistoricalCharacter.objects.create(
            subject=tarix,
            name="Zahiriddin Muhammad Bobur",
            clue_1="Andijon shahrida tug'ilgan va yoshligida taxtga o'tirgan.",
            clue_2="'Boburnoma' asari orqali jahon adabiyoti va geografiyasi rivojiga ulkan hissa qo'shgan.",
            clue_3="Hindistonda Boburiylar (Buyuk Mo'g'ullar) imperiyasining asoschisi.",
            difficulty="medium"
        )

@login_required
def timeline(request):
    seed_games_if_needed()
    profile = request.user.profile
    
    if request.method == 'POST' and request.headers.get('HX-Request'):
        # HTMX sorting check
        ordered_ids_raw = request.POST.get('ordered_ids', '')
        if not ordered_ids_raw:
            return HttpResponse('<div class="text-rose-400 font-bold text-xs mt-3">Xatolik: ma\'lumot uzatilmadi.</div>')
            
        ordered_ids = [int(x) for x in ordered_ids_raw.split(',') if x.strip()]
        
        # Load events
        events = {e.id: e for e in HistoricalEvent.objects.filter(id__in=ordered_ids)}
        ordered_events = [events[eid] for eid in ordered_ids if eid in events]
        
        # Check if timeline is sorted ascending by year
        is_sorted = True
        for i in range(len(ordered_events) - 1):
            if ordered_events[i].year > ordered_events[i+1].year:
                is_sorted = False
                break
                
        if is_sorted:
            # Reward
            xp_reward = 100
            coins_reward = 10
            profile.add_xp(xp_reward)
            profile.add_coins(coins_reward)
            
            Notification.objects.create(
                profile=profile,
                title="Timeline g'olibi!",
                message=f"Voqealarni to'g'ri joylashtirib +{xp_reward} XP va +{coins_reward} tangaga ega bo'ldingiz!",
                type='achievement'
            )
            
            return HttpResponse(f"""
                <div class="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl p-5 text-center mt-6 animate-scaleUp">
                    <div class="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 mx-auto mb-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check"><path d="M20 6 9 17l-5-5"/></svg>
                    </div>
                    <h4 class="font-bold text-lg">Muvaffaqiyatli!</h4>
                    <p class="text-xs text-[var(--text-secondary)] mt-1">Siz barcha voqealarni yillar ketma-ketligi bo'yicha to'g'ri joylashtirdingiz.</p>
                    <div class="flex justify-center gap-4 mt-4 text-xs font-semibold">
                        <span class="text-blue-400">+100 XP</span>
                        <span class="text-yellow-500">+10 Tanga</span>
                    </div>
                    <a href="" class="mt-4 inline-block bg-[var(--surface-invert)] text-[var(--text-on-invert)] font-bold py-2.5 px-5 rounded-xl text-xs">Yana o'ynash</a>
                </div>
            """)
        else:
            # Let's show correct order to educate
            correct_events = sorted(ordered_events, key=lambda x: x.year)
            correct_lines = " -> ".join([f"{e.title} ({e.year}-yil)" for e in correct_events])
            return HttpResponse(f"""
                <div class="bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-2xl p-5 text-center mt-6 animate-scaleUp">
                    <div class="w-12 h-12 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-400 mx-auto mb-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><path d="M18 6 6 18M6 6l12 12"/></svg>
                    </div>
                    <h4 class="font-bold text-lg">Noto'g'ri tartib!</h4>
                    <p class="text-xs text-[var(--text-muted)] mt-1">Ketma-ketlik buzilgan. To'g'ri tartib:</p>
                    <p class="text-xs text-yellow-500 font-bold mt-2 leading-relaxed">{correct_lines}</p>
                    <a href="" class="mt-4 inline-block bg-[var(--surface-hover-strong)] hover:opacity-80 text-[var(--text-primary)] font-bold py-2.5 px-5 rounded-xl text-xs transition">Qayta urinish</a>
                </div>
            """)

    # Pull 4 random events from the selected subject and shuffle.
    subject, subjects = resolve_subject(request)
    all_events = list(HistoricalEvent.objects.filter(subject=subject) if subject else HistoricalEvent.objects.all())

    # The timeline game needs at least 4 events to be playable.
    selected_events = []
    if len(all_events) >= 4:
        selected_events = random.sample(all_events, 4)
        random.shuffle(selected_events)

    return render(request, 'games/timeline.html', {
        'events': selected_events,
        'profile': profile,
        'subjects': subjects,
        'selected_subject': subject,
    })

@login_required
def map_challenge(request):
    seed_games_if_needed()
    profile = request.user.profile

    if request.method == 'POST' and request.headers.get('HX-Request'):
        challenge_id = request.session.get('game_map_challenge_id')
        challenge = get_object_or_404(MapChallenge, id=challenge_id) if challenge_id else None
        if challenge is None:
            return HttpResponse('<div class="text-rose-400 font-bold text-xs mt-3">Xatolik: savol topilmadi, sahifani qayta yuklang.</div>')
        selected_region = request.POST.get('region', '')
        if selected_region == challenge.correct_location:
            xp_reward = 80
            coins_reward = 8
            profile.add_xp(xp_reward)
            profile.add_coins(coins_reward)
            
            return HttpResponse(f"""
                <div class="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl p-5 text-center mt-6 animate-scaleUp">
                    <h4 class="font-bold text-lg">To'g'ri javob!</h4>
                    <p class="text-xs text-[var(--text-secondary)] mt-1">To'g'ri, javob — {challenge.correct_location}.</p>
                    <div class="flex justify-center gap-4 mt-3 text-xs font-semibold">
                        <span class="text-blue-400">+{xp_reward} XP</span>
                        <span class="text-yellow-500">+{coins_reward} Tanga</span>
                    </div>
                    <a href="" class="mt-4 inline-block bg-[var(--surface-invert)] text-[var(--text-on-invert)] font-bold py-2.5 px-5 rounded-xl text-xs">Yana o'ynash</a>
                </div>
            """)
        else:
            return HttpResponse(f"""
                <div class="bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-2xl p-5 text-center mt-6 animate-scaleUp">
                    <h4 class="font-bold text-lg">Noto'g'ri javob!</h4>
                    <p class="text-xs text-[var(--text-muted)] mt-1">Siz {selected_region} hududini tanladingiz. To'g'ri javob — {challenge.correct_location} edi.</p>
                    <a href="" class="mt-4 inline-block bg-[var(--surface-hover-strong)] hover:opacity-80 text-[var(--text-primary)] font-bold py-2.5 px-5 rounded-xl text-xs transition">Qayta urinish</a>
                </div>
            """)

    subject, subjects = resolve_subject(request)
    challenges = list(MapChallenge.objects.filter(subject=subject) if subject else MapChallenge.objects.all())
    challenge = random.choice(challenges) if challenges else None
    request.session['game_map_challenge_id'] = challenge.id if challenge else None

    return render(request, 'games/map.html', {
        'challenge': challenge,
        'options': challenge.options if challenge and challenge.options else [],
        'profile': profile,
        'subjects': subjects,
        'selected_subject': subject,
    })

@login_required
def character(request):
    seed_games_if_needed()
    profile = request.user.profile
    
    if request.method == 'POST' and request.headers.get('HX-Request'):
        guess = request.POST.get('guess', '').strip()
        character_id = request.session.get('game_character_id')
        char_record = get_object_or_404(HistoricalCharacter, id=character_id) if character_id else None
        if char_record is None:
            return HttpResponse('<div class="text-rose-400 font-bold text-xs mt-3">Xatolik: savol topilmadi, sahifani qayta yuklang.</div>')
        
        # Case insensitive compare
        if guess.lower() in char_record.name.lower() or char_record.name.lower() in guess.lower():
            xp_reward = 120
            coins_reward = 12
            profile.add_xp(xp_reward)
            profile.add_coins(coins_reward)
            
            return HttpResponse(f"""
                <div class="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl p-5 text-center mt-6 animate-scaleUp">
                    <h4 class="font-bold text-lg">To'g'ri topdingiz!</h4>
                    <p class="text-xs text-[var(--text-secondary)] mt-1">Ushbu shaxs haqiqatdan ham <strong>{char_record.name}</strong> edi!</p>
                    <div class="flex justify-center gap-4 mt-3 text-xs font-semibold">
                        <span class="text-blue-400">+{xp_reward} XP</span>
                        <span class="text-yellow-500">+{coins_reward} Tanga</span>
                    </div>
                    <a href="" class="mt-4 inline-block bg-[var(--surface-invert)] text-[var(--text-on-invert)] font-bold py-2 px-4 rounded-xl text-xs">Keling yana bitta!</a>
                </div>
            """)
        else:
            return HttpResponse(f"""
                <div class="bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-2xl p-5 text-center mt-6 animate-scaleUp">
                    <h4 class="font-bold text-lg">Noto'g'ri taxmin!</h4>
                    <p class="text-xs text-[var(--text-muted)] mt-1">Bu shaxs <strong>{char_record.name}</strong> edi.</p>
                    <a href="" class="mt-4 inline-block bg-[var(--surface-hover-strong)] hover:opacity-80 text-[var(--text-primary)] font-bold py-2 px-4 rounded-xl text-xs transition">Keyingisi</a>
                </div>
            """)
            
    subject, subjects = resolve_subject(request)
    characters = list(HistoricalCharacter.objects.filter(subject=subject) if subject else HistoricalCharacter.objects.all())
    character = random.choice(characters) if characters else None
    request.session['game_character_id'] = character.id if character else None

    return render(request, 'games/character.html', {
        'character': character,
        'profile': profile,
        'subjects': subjects,
        'selected_subject': subject,
    })
