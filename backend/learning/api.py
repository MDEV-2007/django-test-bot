"""SSE AI Mentor endpoint for the Next.js frontend — mirrors learning/views.py's
mentor_stream() exactly (same rate limits, same Groq/fallback chain), except chat history
is NOT kept server-side: mentor_stream() relies on request.session, which the JWT-only
Next.js client never has (see accounts/api.py's module docstring for why the whole API is
JWT instead of session cookies). The frontend keeps its own chat history and only needs
the model's reply, so no session and no new DB model are needed."""
import json

from django.db.models import Prefetch, Count
from django.http import HttpResponse, HttpResponseBadRequest, StreamingHttpResponse
from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsChannelSubscribed
from core.ai_client import ask_groq_stream
from core.reward_caps import claim_daily_reward, claim_once
from tests_app.models import Subject
from tests_app.subject_utils import resolve_subject

from .models import Bookmark, Lesson, Topic, Reel, ReelComment, CommunityPost, CommunityPostReaction, CommunityPostComment
from .services import (
    _build_mentor_context, _greeting_reply, _mentor_ai_allowed, _mentor_rate_limited,
    _mentor_system_prompt, build_mentor_reply, seed_learning_if_needed,
    ensure_lesson_for_topic,
)


class MentorStreamAPI(APIView):
    permission_classes = [IsAuthenticated, IsChannelSubscribed]

    def post(self, request):
        if _mentor_rate_limited(request.user.id):
            return HttpResponse('Juda ko\'p so\'rov yubordingiz, biroz kuting.', status=429, content_type='text/plain')

        profile = request.user.profile
        subject_slug = request.data.get('subject')
        subject = Subject.objects.filter(slug=subject_slug).first() if subject_slug else None
        user_message = (request.data.get('message') or '').strip()
        if not user_message:
            return HttpResponseBadRequest('empty message')

        seed_learning_if_needed()
        subject_name = subject.name if subject else "tanlangan fan"
        is_pro = (
            profile.has_active_premium_lessons
            or request.user.is_staff
            or request.user.is_superuser
            or getattr(profile, 'is_superadmin', False)
        )
        allow_ai = _mentor_ai_allowed(request.user.id, is_pro=is_pro)
        is_greeting = any(greet in user_message.lower() for greet in ['salom', 'assalomu', 'hello', 'hi '])

        def generate():
            if is_greeting:
                yield f"data: {json.dumps({'delta': _greeting_reply(subject_name)})}\n\n"
            else:
                streamed = False
                if allow_ai:
                    _lesson, context_snippet, _weak = _build_mentor_context(user_message, profile, subject)
                    user_prompt = f"Kontekst: {context_snippet}\n\nSavol: {user_message}" if context_snippet else user_message
                    for chunk in ask_groq_stream([
                        {"role": "system", "content": _mentor_system_prompt(subject_name)},
                        {"role": "user", "content": user_prompt},
                    ]):
                        streamed = True
                        yield f"data: {json.dumps({'delta': chunk})}\n\n"
                if not streamed:
                    full_reply = build_mentor_reply(user_message, profile, subject=subject, allow_ai=allow_ai)
                    yield f"data: {json.dumps({'delta': full_reply})}\n\n"
            yield "data: [DONE]\n\n"

        response = StreamingHttpResponse(generate(), content_type='text/event-stream')
        response['Cache-Control'] = 'no-cache'
        response['X-Accel-Buffering'] = 'no'
        return response


def _lesson_payload(lesson, has_lessons_access, is_bookmarked):
    all_videos = list(lesson.videos.all())
    all_audios = list(lesson.audios.all())
    if has_lessons_access:
        videos, audios, locked_videos, locked_audios = all_videos, all_audios, 0, 0
    else:
        videos = [v for v in all_videos if not v.is_premium]
        audios = [a for a in all_audios if not a.is_premium]
        locked_videos = sum(1 for v in all_videos if v.is_premium)
        locked_audios = sum(1 for a in all_audios if a.is_premium)
    return {
        'id': lesson.id, 'title': lesson.title, 'content': lesson.content,
        'topic': lesson.topic.title if lesson.topic_id else None,
        'is_bookmarked': is_bookmarked,
        'locked_videos_count': locked_videos, 'locked_audios_count': locked_audios,
        'videos': [{'id': v.id, 'title': v.title, 'video_url': v.video_url, 'duration_display': v.duration_display} for v in videos],
        'audios': [{'id': a.id, 'title': a.title, 'audio_url': a.audio_url, 'duration_display': a.duration_display} for a in audios],
        'flashcards': [{'front': f.front, 'back': f.back} for f in lesson.flashcards.all()],
    }


@api_view(['GET'])
def center_api(request):
    seed_learning_if_needed()
    profile = request.user.profile
    subject, subjects = resolve_subject(request)

    topic_qs = Topic.objects.filter(subject=subject) if subject else Topic.objects.all()
    topics = list(topic_qs.prefetch_related(Prefetch('lessons', queryset=Lesson.objects.filter(is_published=True))))

    # Har bir mavzu uchun darslik mavjudligini ta'minlaymiz (bo'sh qolib ketmasligi uchun)
    for t in topics:
        if not t.lessons.all():
            try:
                ensure_lesson_for_topic(t)
            except Exception:
                pass
    if topics:
        topics = list(topic_qs.prefetch_related(Prefetch('lessons', queryset=Lesson.objects.filter(is_published=True))))

    def topic_list(category):
        return [{
            'id': t.id, 'title': t.title,
            'lessons': [{'id': l.id, 'title': l.title} for l in t.lessons.all()],
        } for t in topics if t.category == category]

    all_lessons = Lesson.objects.filter(is_published=True)
    if subject:
        all_lessons = all_lessons.filter(topic__subject=subject)

    lesson_id = request.query_params.get('lesson_id')
    topic_id = request.query_params.get('topic_id')
    lesson_qs = (
        Lesson.objects.filter(is_published=True)
        .select_related('topic')
        .prefetch_related('videos', 'audios', 'flashcards')
    )
    if lesson_id:
        lesson = lesson_qs.filter(id=lesson_id).first()
    elif topic_id:
        lesson = lesson_qs.filter(topic_id=topic_id).first()
        if not lesson:
            target_topic = topic_qs.filter(id=topic_id).first()
            if target_topic:
                lesson = ensure_lesson_for_topic(target_topic)
    else:
        if topics:
            first_topic = topics[0]
            lesson = lesson_qs.filter(topic=first_topic).first()
            if not lesson:
                lesson = ensure_lesson_for_topic(first_topic)
        else:
            lesson = lesson_qs.filter(topic__subject=subject).first() if subject else lesson_qs.first()

    has_lessons_access = profile.has_active_premium_lessons
    is_bookmarked = Bookmark.objects.filter(profile=profile, lesson=lesson).exists() if lesson else False

    # "Read a lesson" daily mission — was request.session-keyed (no session for JWT
    # clients), so a cache key (profile+lesson+day) does the same once-per-day job.
    if lesson and lesson_id:
        from datetime import date

        from django.core.cache import cache

        from core.missions import advance_missions

        cache_key = f'viewed_lesson:{profile.id}:{lesson.id}:{date.today().isoformat()}'
        if cache.add(cache_key, True, 60 * 60 * 26):
            advance_missions(profile, 'lesson')

    return Response({
        'subjects': [{'id': s.id, 'name': s.name, 'slug': s.slug} for s in subjects],
        'selected_subject': subject.slug if subject else None,
        'history_topics': topic_list('history'),
        'certificate_topics': topic_list('certificate'),
        'bba_topics': topic_list('bba'),
        'has_lessons_access': has_lessons_access,
        'lesson': _lesson_payload(lesson, has_lessons_access, is_bookmarked) if lesson else None,
    })


@api_view(['POST'])
def toggle_bookmark_api(request, lesson_id):
    profile = request.user.profile
    lesson = get_object_or_404(Lesson, id=lesson_id)
    bookmark, created = Bookmark.objects.get_or_create(profile=profile, lesson=lesson)
    if not created:
        bookmark.delete()
        return Response({'bookmarked': False})
    return Response({'bookmarked': True})


# ============================================================
# SMART FLASHCARDS API (QUIZLET & ANKI STYLE LEARNING)
# ============================================================

CURATED_DECKS = [
    {
        'id': 101,
        'title': "Temuriylar: Muhim Janglar va Sanalar",
        'subject': "Tarix",
        'subject_slug': "tarix",
        'icon': "Crown",
        'description': "1370-yildan 1507-yilgacha bo'lgan eng muhim g'alabalar, yurishlar va sanalarni tezkor eslab qoling.",
        'difficulty': "Asosiy",
        'xp_reward': 25,
        'cards': [
            {
                'id': 1,
                'front': "1370-yil 9-aprelda Movarounnahrda qanday tarixiy voqea yuz berdi?",
                'back': "Amir Temur Balx qurultoyida Movarounnahrning oliy hukmdori deb e'lon qilindi va Samarqandni poytaxt etib belgiladi.",
                'hint': "Buyuk davlatning tug'ilishi"
            },
            {
                'id': 2,
                'front': "1395-yil Qunduzcha (Terek) jangi kimlar o'rtasida bo'ldi?",
                'back': "Amir Temur va Oltin O'rda xoni To'xtamishxon o'rtasida. Temur g'alaba qozonib, Oltin O'rdani sindirdi.",
                'hint': "Oltin O'rda poytaxti Saroy Berka yakson bo'lgan"
            },
            {
                'id': 3,
                'front': "1402-yil 20-iyuldagi mashhur Anqara jangining ahamiyati nimada?",
                'back': "Amir Temur Usmonli sultoni Boyazid I Yildirimni mag'lub etib, Yevropani usmonlilar istilosidan saqlab qoldi.",
                'hint': "Ikki buyuk turkiy sarkarda to'qnashuvi"
            },
            {
                'id': 4,
                'front': "Mirzo Ulug'bek tomonidan Samarqand rasadxonasi qaysi yillarda qurilgan?",
                'back': "1428-1429 yillarda Cho'ponota tepaligida qurilgan.",
                'hint': "1018 ta yulduz jadvali (Zij)"
            }
        ]
    },
    {
        'id': 102,
        'title': "Family & Society (IELTS / CEFR)",
        'subject': "Ingliz tili",
        'subject_slug': "ingliz-tili",
        'icon': "Users",
        'description': "Oilaviy munosabatlar, jamiyat va sotsiologiyaga oid C1/B2 darajadagi eng zarur lug'at boyligi.",
        'difficulty': "IELTS 7.0+",
        'xp_reward': 30,
        'cards': [
            {
                'id': 201,
                'front': "Upbringing",
                'back': "Tarbiyalash, voyaga yetkazish (The treatment and instruction received from parents throughout childhood).",
                'hint': "Synonym: Parenting"
            },
            {
                'id': 202,
                'front': "Sibling rivalry",
                'back': "Aka-uka yoki opa-singillar o'rtasidagi raqobat va kelishmovchilik.",
                'hint': "Competition between brothers and sisters"
            },
            {
                'id': 203,
                'front': "Extended family",
                'back': "Katta oila (ota-ona, bolalar, bobo-buvilar va qarindoshlar birgalikda).",
                'hint': "Opposite: Nuclear family"
            },
            {
                'id': 204,
                'front': "Flesh and blood",
                'back': "O'z qon-qarindoshi, jigari (Someone from your own family).",
                'hint': "Idiom about close biological relatives"
            }
        ]
    },
    {
        'id': 103,
        'title': "House & Home (IELTS Vocabulary)",
        'subject': "Ingliz tili",
        'subject_slug': "ingliz-tili",
        'icon': "Home",
        'description': "Uy-joy, arxitektura va mebellar bo'yicha imtihonda ko'p uchraydigan kollokatsiyalar.",
        'difficulty': "B2",
        'xp_reward': 25,
        'cards': [
            {
                'id': 211,
                'front': "Spacious and airy",
                'back': "Keng va havodor, yorug' (Having ample room and fresh air circulation).",
                'hint': "Positive description of a room"
            },
            {
                'id': 212,
                'front': "Suburban area",
                'back': "Shahar atrofi hududi, chekka posyolka (Residential district located on the outskirts).",
                'hint': "Between rural and downtown"
            },
            {
                'id': 213,
                'front': "Affordable housing",
                'back': "Hamyonbop uy-joy (Dwellings that can be afforded by those on a median household income).",
                'hint': "Social policy term"
            }
        ]
    },
    {
        'id': 104,
        'title': "Ona tili: BMB Imlo Qoidalari & Tuzoqlar",
        'subject': "Ona tili",
        'subject_slug': "ona-tili",
        'icon': "BookOpen",
        'description': "Tutuq belgisi, qo'sh undoshlar va ko'p xato qilinadigan imlo mezonlari.",
        'difficulty': "BMB Standart",
        'xp_reward': 25,
        'cards': [
            {
                'id': 301,
                'front': "'Mutaassib' so'zi qanday yoziladi va ma'nosi nima?",
                'back': "Ikkita 'a' bilan yoziladi: 'mutaassib' — o'z fikrida qotib qolgan, fanatik.",
                'hint': "Arabcha o'zlashma, ikkita 'a'"
            },
            {
                'id': 302,
                'front': "'Muammo' va 'muddao' so'zlaridagi qo'sh undoshlar?",
                'back': "'Muammo'da ikkita 'm', 'muddao'da ikkita 'd' yoziladi.",
                'hint': "Imlo qoidasi"
            },
            {
                'id': 303,
                'front': "'Tarixiy' so'ziga 'iy' qo'shimchasi qo'shilganda qaysi harf yoziladi?",
                'back': "Qattiq 'x' bilan: 'Tarixiy'. Chunki o'zagi 'tarix'.",
                'hint': "x/h farqi"
            }
        ]
    },
    {
        'id': 105,
        'title': "Kimyo: Asosiy Formulalar & Valentlik",
        'subject': "Kimyo",
        'subject_slug': "kimyo",
        'icon': "FlaskConical",
        'description': "Mendeleyev davriy jadvalidagi asosiy elementlar, kislotalar va oksidlar formulalari.",
        'difficulty': "O'rta",
        'xp_reward': 30,
        'cards': [
            {
                'id': 401,
                'front': "Sulfat kislota formulasi va oltingugurt valentligi?",
                'back': "H2SO4. Oltingugurt (S) ning valentligi VI (oksidlanish darajasi +6).",
                'hint': "Eng muhim noorganik kislota"
            },
            {
                'id': 402,
                'front': "Bertolle tuzi formulasi nima?",
                'back': "KClO3 (Kaliy xlorat). Qizdirilganda kislorod ajratib chiqaradi.",
                'hint': "Kislorod olish laboratoriya usuli"
            },
            {
                'id': 403,
                'front': "Avogadro soni qancha?",
                'back': "6.02 x 10^23 dona zarracha (1 mol modda ichida).",
                'hint': "N_A doimiysi"
            }
        ]
    },
    {
        'id': 106,
        'title': "Koreys tili: TOPIK I Boshlang'ich Fe'llar",
        'subject': "Koreys tili",
        'subject_slug': "koreys-tili",
        'icon': "Sparkles",
        'description': "Kundalik eng ko'p ishlatiladigan 10 ta asosiy koreyscha fe'l va tarjimasi.",
        'difficulty': "TOPIK I",
        'xp_reward': 20,
        'cards': [
            {
                'id': 501,
                'front': "가다 (Kada)",
                'back': "Bormoq, ketmoq (To go).",
                'hint': "Harakat fe'li"
            },
            {
                'id': 502,
                'front': "오다 (Oda)",
                'back': "Kelmoq (To come).",
                'hint': "Qarama-qarshisi: Kada"
            },
            {
                'id': 503,
                'front': "먹다 (Mokta)",
                'back': "Yemoq (To eat).",
                'hint': "Ovqatlanish fe'li"
            }
        ]
    },
]

@api_view(['GET'])
@permission_classes([AllowAny])
def flashcards_decks_api(request):
    """Returns all available flashcard decks categorized by subject."""
    # Also incorporate database flashcards from lessons
    lesson_decks = []
    lessons_with_cards = Lesson.objects.filter(is_published=True, flashcards__isnull=False).distinct()
    for l in lessons_with_cards:
        cards_cnt = l.flashcards.count()
        if cards_cnt == 0:
            continue
        lesson_decks.append({
            'id': l.id,
            'title': l.title,
            'subject': l.topic.subject.name if l.topic and l.topic.subject else "Tarix",
            'subject_slug': l.topic.subject.slug if l.topic and l.topic.subject else "tarix",
            'icon': "Layers",
            'description': f"{l.topic.title if l.topic else 'Mavzu'} bo'yicha interaktiv dars flesh-kartalari.",
            'difficulty': "O'rta",
            'xp_reward': 20,
            'total_cards': cards_cnt,
            'is_custom': True,
        })

    all_decks = []
    for d in CURATED_DECKS:
        all_decks.append({
            'id': d['id'],
            'title': d['title'],
            'subject': d['subject'],
            'subject_slug': d['subject_slug'],
            'icon': d['icon'],
            'description': d['description'],
            'difficulty': d['difficulty'],
            'xp_reward': d['xp_reward'],
            'total_cards': len(d['cards']),
            'is_custom': False,
        })
    all_decks.extend(lesson_decks)

    subjects = [
        {'slug': 'all', 'name': 'Barchasi'},
        {'slug': 'tarix', 'name': 'Tarix'},
        {'slug': 'ona-tili', 'name': 'Ona tili'},
        {'slug': 'biologiya', 'name': 'Biologiya'},
        {'slug': 'ingliz-tili', 'name': 'Ingliz tili'},
    ]

    return Response({
        'subjects': subjects,
        'decks': all_decks,
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def flashcards_deck_detail_api(request, deck_id):
    """Returns details and all cards of a flashcard deck."""
    # Check curated decks first
    for d in CURATED_DECKS:
        if str(d['id']) == str(deck_id):
            return Response(d)

    # Check database FlashcardDeck
    if str(deck_id).startswith('deck_'):
        deck_num = str(deck_id).replace('deck_', '')
        if deck_num.isdigit():
            from .models import FlashcardDeck
            fd = FlashcardDeck.objects.filter(id=int(deck_num)).first()
            if fd:
                cards = [
                    {
                        'id': c.id,
                        'front': c.front,
                        'back': c.back,
                        'hint': c.mnemonic_tip or c.example_or_context or "Eslab qoling"
                    }
                    for c in fd.cards.all()
                ]
                return Response({
                    'id': f"deck_{fd.id}",
                    'title': fd.title,
                    'subject': fd.subject.name if fd.subject else "Tarix",
                    'subject_slug': fd.subject.slug if fd.subject else "tarix",
                    'icon': fd.icon or "Zap",
                    'description': f"{fd.title} bo'yicha interaktiv yodlash kartalari.",
                    'difficulty': fd.level or "O'rta",
                    'xp_reward': 25,
                    'cards': cards,
                })

    # Check lesson deck
    if str(deck_id).isdigit():
        lesson = Lesson.objects.filter(id=int(deck_id), is_published=True).first()
        if lesson:
            cards = [
                {
                    'id': f.id,
                    'front': f.front,
                    'back': f.back,
                    'hint': "Darslik ma'lumoti"
                }
                for f in lesson.flashcards.all()
            ]
            return Response({
                'id': lesson.id,
                'title': lesson.title,
                'subject': lesson.topic.subject.name if lesson.topic and lesson.topic.subject else "Tarix",
                'subject_slug': lesson.topic.subject.slug if lesson.topic and lesson.topic.subject else "tarix",
                'icon': "Layers",
                'description': f"{lesson.title} bo'yicha interaktiv yodlash kartalari.",
                'difficulty': "O'rta",
                'xp_reward': 20,
                'cards': cards,
            })

    return Response({'error': "To'plam topilmadi"}, status=404)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def flashcards_complete_api(request):
    """Awards XP, coins, and updates streak upon completing a flashcard study session."""
    profile = request.user.profile
    deck_id = request.data.get('deck_id')
    learned_count = int(request.data.get('learned_count') or 5)

    xp_gain, coin_gain = (25, 10) if claim_daily_reward(profile.id, 'flashcards') else (0, 0)

    leveled_up = profile.add_xp(xp_gain)
    profile.add_coins(coin_gain)
    profile.update_streak()

    return Response({
        'success': True,
        'xp_earned': xp_gain,
        'coins_earned': coin_gain,
        'new_xp': profile.xp,
        'new_level': profile.level,
        'new_coins': profile.coins,
        'streak': profile.streak,
        'leveled_up': leveled_up,
        'message': f"Ajoyib! Xotira to'plamini muvaffaqiyatli yakunladingiz va +{xp_gain} XP hamda +{coin_gain} tangaga ega bo'ldingiz!"
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def study_session_complete_api(request):
    """O'quvchi Pomodoro fokus dars sessiyasini yakunlaganda XP, tanga va streak beradi."""
    profile = request.user.profile
    try:
        duration_minutes = int(request.data.get('duration_minutes', 25))
    except (ValueError, TypeError):
        duration_minutes = 25
    try:
        goals_done = int(request.data.get('goals_done', 1))
    except (ValueError, TypeError):
        goals_done = 1

    # Klient qiymatlari ishonchsiz: sessiya davomiyligi va maqsadlar sonini cheklaymiz.
    duration_minutes = max(1, min(60, duration_minutes))
    goals_done = max(0, min(5, goals_done))

    # Har 25 daqiqa dars uchun 25 XP va 10 tanga
    xp_gain = max(10, min(150, int((duration_minutes / 25) * 25) + goals_done * 5))
    coin_gain = max(5, min(50, int((duration_minutes / 25) * 10)))
    if not claim_daily_reward(profile.id, 'study_session'):
        xp_gain = coin_gain = 0

    leveled_up = profile.add_xp(xp_gain)
    profile.add_coins(coin_gain)
    profile.update_streak()

    try:
        from core.missions import advance_missions
        advance_missions(profile, 'lesson')
    except Exception:
        pass

    return Response({
        'success': True,
        'xp_earned': xp_gain,
        'coins_earned': coin_gain,
        'new_xp': profile.xp,
        'new_level': profile.level,
        'new_coins': profile.coins,
        'streak': profile.streak,
        'leveled_up': leveled_up,
        'message': f"Barakalla! {duration_minutes} daqiqa diqqat bilan dars qildingiz va +{xp_gain} XP hamda +{coin_gain} tanga qo'lga kiritdingiz! 🔥",
    })

# ============================================================ BILIM REELS (SCROLL-LEARNING)
REELS_DATA = [
    {
        'id': 1,
        'subject_name': 'Tarix',
        'subject_slug': 'tarix',
        'category_badge': 'Amir Temur & Anqara jangi (1402)',
        'tagline': 'Bilasizmi?',
        'hook': "Amir Temurning 1402-yilgi Anqara jangidagi eng ayyorona harbiy hiylasi nima edi?",
        'fact': "Sohibqiron Boyazid I qo'shinidan oldin Anqaraga yetib borib, dushmanning yagona suv manbai bo'lgan Chubuk daryosi o'zanini boshqa tomonga burib yuboradi va quduqlarni zaharlaydi/yopadi. Boyazid qo'shini suvsizlikdan sillasi qurigan holda jangga kirishga majbur bo'ladi.",
        'takeaway': "Strategik resurslarni boshqarish — qurol-yarog'dan ham ustunroq g'alaba omili hisoblangan.",
        'quiz': {
            'question': "Amir Temur 1402-yilgi Anqara jangida qaysi daryoning o'zanini burib dushmanni suvsiz qoldirgan?",
            'options': ["Chubuk daryosi", "Furot daryosi", "Dajla daryosi", "Sayxun daryosi"],
            'correct_index': 0,
            'explanation': "Chubuk (Çubuk) daryosi Anqara yaqinidagi asosiy suv o'zani bo'lib, Temur uni to'sib boyazid askarlarini sillasi qurishiga sabab bo'lgan."
        },
        'likes': 524,
        'shares': 148,
        'gradient': 'linear-gradient(145deg, #1e1b4b 0%, #311042 50%, #0f172a 100%)',
    },
    {
        'id': 2,
        'subject_name': 'Ona tili',
        'subject_slug': 'ona-tili',
        'category_badge': "Fonetika & Tutuq belgisi ( ' )",
        'tagline': 'Oltin Qoida',
        'hook': "Nega 'a'lo' va 'san'at' so'zlaridagi tutuq belgisi mutlaqo boshqa-boshqa vazifani bajaradi?",
        'fact': "Unli tovushdan keyin kelgan tutuq belgisi o'sha unlini CHO'ZIB aytilishini ta'minlaydi (a'lo, e'lon, ma'no). Undoshdan keyin kelganda esa unlini undoshdan AJRATIB aytishga xizmat qiladi (san'at, jur'at, sur'at).",
        'takeaway': "Milliy sertifikat va BBA testlarida tutuq belgisi vazifasi bo'yicha har yili savol tushadi!",
        'quiz': {
            'question': "Qaysi so'zda tutuq belgisi unli tovushni cho'zib talaffuz qilish uchun xizmat qilgan?",
            'options': ["San'at", "Ma'no", "Sur'at", "Jur'at"],
            'correct_index': 1,
            'explanation': "'Ma'no' so'zida 'a' unlisidan keyin kelib, uni cho'zib aytilishini bildiradi. Qolganlarida undoshdan keyin kelgan."
        },
        'likes': 389,
        'shares': 82,
        'gradient': 'linear-gradient(145deg, #0c4a6e 0%, #082f49 50%, #030712 100%)',
    },
    {
        'id': 3,
        'subject_name': 'Biologiya',
        'subject_slug': 'biologiya',
        'category_badge': 'Genetika & DNK sirlari',
        'tagline': 'Kashfiyot',
        'hook': "Nima uchun inson DNK zanjiridagi Adenin har doim faqat Timin bilan bog'lanadi?",
        'fact': "Komplementarlik qoidasiga ko'ra, Adenin (A) va Timin (T) o'rtasida 2 ta vodorod bog'i, Guanin (G) va Sitozin (C) o'rtasida esa 3 ta mustahkam vodorod bog'i hosil bo'ladi. Boshqacha juftlik molekulyar o'lcham tufayli barqaror bo'la olmaydi.",
        'takeaway': "Ushbu qoidani 1953-yilda Jeyms Uotson va Frensis Krik kashf etgan.",
        'quiz': {
            'question': "DNK molekulasida Guanin va Sitozin o'rtasida nechta vodorod bog'i mavjud?",
            'options': ["1 ta", "2 ta", "3 ta", "4 ta"],
            'correct_index': 2,
            'explanation': "G va C o'rtasida 3 ta, A va T o'rtasida ise 2 ta vodorod bog'i bo'ladi."
        },
        'likes': 412,
        'shares': 114,
        'gradient': 'linear-gradient(145deg, #064e3b 0%, #022c22 50%, #020617 100%)',
    },
    {
        'id': 4,
        'subject_name': 'Tarix',
        'subject_slug': 'tarix',
        'category_badge': 'Jaloliddin Manguberdi (1221)',
        'tagline': 'Tarixiy Jasorat',
        'hook': "Chingizxon Jaloliddin Manguberdining jasoratini ko'rib o'z o'g'illariga nima degan edi?",
        'fact': "1221-yil Sind daryosi bo'yidagi ayovsiz jangda Jaloliddin asir tushmaslik uchun oti bilan baland qoyadan shiddatli daryoga sakraydi va narigi qirg'oqqa o'tib oladi. Chingizxon buni ko'rib o'z askarlariga kamondan otishni taqiqlaydi.",
        'takeaway': "Chingizxon: 'Otaga mana shunday mard va jasur o'g'il kerak!' deb o'z farzandlariga ibrat qilib ko'rsatgan.",
        'quiz': {
            'question': "Jaloliddin Manguberdi va Chingizxon o'rtasidagi Sind daryosi bo'yidagi mashhur to'qnashuv qaysi yilda yuz bergan?",
            'options': ["1219-yil", "1221-yil", "1227-yil", "1231-yil"],
            'correct_index': 1,
            'explanation': "Sind jangi 1221-yil noyabr oyida bo'lib o'tgan."
        },
        'likes': 685,
        'shares': 190,
        'gradient': 'linear-gradient(145deg, #881337 0%, #4c0519 50%, #0f172a 100%)',
    },
    {
        'id': 5,
        'subject_name': 'Ingliz tili',
        'subject_slug': 'ingliz-tili',
        'category_badge': 'Idiomalar & Collocations',
        'tagline': 'IELTS & CEFR',
        'hook': "'Once in a blue moon' idiomsi aslida qanday ma'noni anglatadi?",
        'fact': "Astronomiyada 'ko'k oy' har 2.7 yilda bir marta (bitta kalendar oyida ikkinchi to'lin oy chiqqanda) sodir bo'ladi. Shu sababli bu idioma ingliz tilida 'juda ham kamdan-kam' (extremely rarely) ma'nosida ishlatiladi.",
        'takeaway': "Masalan: 'I only eat fast food once in a blue moon.'",
        'quiz': {
            'question': "Qaysi so'z 'Once in a blue moon' iborasiga to'g'ridan-to'g'ri sinonim hisoblanadi?",
            'options': ["Frequently", "Rarely", "Always", "Immediately"],
            'correct_index': 1,
            'explanation': "'Rarely' (juda kamdan-kam) to'g'ri ma'nodosh hisoblanadi."
        },
        'likes': 345,
        'shares': 76,
        'gradient': 'linear-gradient(145deg, #581c87 0%, #3b0764 50%, #030712 100%)',
    },
    {
        'id': 6,
        'subject_name': 'Tarix',
        'subject_slug': 'tarix',
        'category_badge': "Mirzo Ulug'bek & Rasadxona (1428)",
        'tagline': "Ilmiy Mo'jiza",
        'hook': "Ulug'bek teleskopsiz qanday qilib bir yil 365 kun, 6 soat, 10 daqiqa ekanini 1 soniya xatolik bilan hisoblagan?",
        'fact': "1428-yil Samarqandda qurilgan Ulug'bek rasadxonasidagi 40 metrli ulkan sekstant (Kvadrant) Quyosh va yulduzlar harakatini yer osti qorong'u tuynugi orqali o'ta yuqori aniqlikda o'lchash imkonini bergan.",
        'takeaway': "Ulug'bekning 'Ziji Jadidi Ko'ragoniy' asari 1018 ta yulduzning aniq koordinatasini bergan va butun dunyoda asrlar davomida qo'llangan.",
        'quiz': {
            'question': "Samarqanddagi Mirzo Ulug'bek rasadxonasi to'liq qaysi yilda barpo etilgan?",
            'options': ["1409-yil", "1420-yil", "1428-yil", "1449-yil"],
            'correct_index': 2,
            'explanation': "Rasadxona qurilishi 1424-yilda boshlanib, 1428-yilda to'liq yakunlangan."
        },
        'likes': 512,
        'shares': 133,
        'gradient': 'linear-gradient(145deg, #1e3a8a 0%, #172554 50%, #020617 100%)',
    }
]


def seed_default_reels():
    """Baza bo'sh bo'lganda boshlang'ich sifatli 6 ta reelni yuklaydi."""
    try:
        for item in REELS_DATA:
            gradient_theme = 'rose'
            if '0c4a6e' in item.get('gradient', ''):
                gradient_theme = 'sky'
            elif '064e3b' in item.get('gradient', ''):
                gradient_theme = 'emerald'
            elif '581c87' in item.get('gradient', ''):
                gradient_theme = 'purple'
            elif '1e3a8a' in item.get('gradient', ''):
                gradient_theme = 'sky'
            elif '1e1b4b' in item.get('gradient', ''):
                gradient_theme = 'purple'

            Reel.objects.get_or_create(
                id=item['id'],
                defaults={
                    'subject_name': item['subject_name'],
                    'subject_slug': item['subject_slug'],
                    'category_badge': item['category_badge'],
                    'tagline': item.get('tagline', 'Bilasizmi?'),
                    'hook': item['hook'],
                    'fact': item['fact'],
                    'takeaway': item['takeaway'],
                    'quiz_question': item['quiz']['question'],
                    'quiz_options': item['quiz']['options'],
                    'quiz_correct_index': item['quiz']['correct_index'],
                    'quiz_explanation': item['quiz']['explanation'],
                    'gradient_theme': gradient_theme,
                    'likes_count': item.get('likes', 150),
                    'shares_count': item.get('shares', 40),
                    'is_published': True,
                }
            )
    except Exception:
        pass


@api_view(['GET'])
@permission_classes([AllowAny])
def reels_feed_api(request):
    """TikTok/Instagram formatidagi mini-darslar va savollar lentasini bazadan qaytaradi."""
    subject_slug = request.GET.get('subject', 'for_you')

    user_weak_slugs = []
    subject_error_counts = {}
    if request.user and request.user.is_authenticated:
        try:
            from tests_app.models import AttemptAnswer
            mistakes = (
                AttemptAnswer.objects.filter(
                    attempt__profile__user=request.user,
                    is_correct=False
                )
                .values('question__subject__slug')
                .annotate(cnt=Count('id'))
                .order_by('-cnt')
            )
            for m in mistakes:
                s_slug = m.get('question__subject__slug')
                if s_slug:
                    user_weak_slugs.append(s_slug)
                    subject_error_counts[s_slug] = m['cnt']
        except Exception:
            pass

    try:
        qs = Reel.objects.filter(is_published=True).order_by('-order', '-id')
        if subject_slug and subject_slug not in ('all', 'for_you'):
            qs = qs.filter(subject_slug=subject_slug)

        reels_list = [r.to_dict() for r in qs]
    except Exception as e:
        logger.warning("reels_feed_api query error: %s", e)
        reels_list = []

    # Shaxsiylashtirish va tavsiya sababi
    for r in reels_list:
        r_slug = r.get('subject_slug')
        if r_slug in user_weak_slugs:
            err_cnt = subject_error_counts.get(r_slug, 0)
            r['is_personalized'] = True
            r['recommendation_reason'] = f"{r.get('subject_name', '')} bo'yicha xatolaringiz ({err_cnt} ta) asosida"
            r['relevance_score'] = 100 + err_cnt
        else:
            r['is_personalized'] = False
            r['recommendation_reason'] = "Siz uchun tavsiya"
            r['relevance_score'] = r.get('likes', 0)

    if subject_slug == 'for_you':
        # Zaif fanlardagi mavzularni birinchi o'ringa olib chiqish
        reels_list.sort(key=lambda x: (1 if x.get('is_personalized') else 0, x.get('relevance_score', 0)), reverse=True)
        if not user_weak_slugs and len(reels_list) > 0:
            for i, r in enumerate(reels_list[:2]):
                r['is_personalized'] = True
                r['recommendation_reason'] = "Eng yuqori reytingli tavsiya"

    subjects = [
        {'slug': 'for_you', 'name': '✨ Siz uchun'},
        {'slug': 'all', 'name': 'Barchasi'},
        {'slug': 'tarix', 'name': 'Tarix'},
        {'slug': 'ona-tili', 'name': 'Ona tili'},
        {'slug': 'biologiya', 'name': 'Biologiya'},
        {'slug': 'ingliz-tili', 'name': 'Ingliz tili'},
    ]

    return Response({
        'reels': reels_list,
        'subjects': subjects,
        'total': len(reels_list),
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def reels_quiz_answer_api(request):
    """Reeldagi mini-savolga javob berilganda +5 XP beradi va streakni oshiradi."""
    reel_id = request.data.get('reel_id')
    answer_index = request.data.get('answer_index')

    correct_index = 0
    explanation = ""

    try:
        reel = Reel.objects.filter(id=reel_id).first()
        if reel:
            correct_index = reel.quiz_correct_index
            explanation = reel.quiz_explanation
        else:
            target_reel = next((r for r in REELS_DATA if r['id'] == reel_id), None)
            if target_reel:
                correct_index = target_reel['quiz']['correct_index']
                explanation = target_reel['quiz']['explanation']
    except Exception:
        target_reel = next((r for r in REELS_DATA if r['id'] == reel_id), None)
        if target_reel:
            correct_index = target_reel['quiz']['correct_index']
            explanation = target_reel['quiz']['explanation']

    is_correct = (answer_index == correct_index)
    xp_earned = 0
    total_xp = 0
    streak_days = 1

    if request.user and request.user.is_authenticated:
        profile = getattr(request.user, 'profile', None)
        if profile:
            if is_correct:
                profile.update_streak()
                if claim_once(profile.id, 'reels_quiz', reel_id) and claim_daily_reward(profile.id, 'reels_quiz'):
                    xp_earned = 5
                    profile.add_xp(xp_earned)
            total_xp = profile.xp
            streak_days = profile.streak_days

    return Response({
        'success': True,
        'is_correct': is_correct,
        'correct_index': correct_index,
        'explanation': explanation,
        'xp_earned': xp_earned,
        'total_xp': total_xp,
        'streak_days': streak_days,
        'message': "Tabriklaymiz! +5 XP hisobingizga qo'shildi! 🔥" if is_correct else "Qayta urinib ko'ring!"
    })


@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def reels_comments_api(request, reel_id):
    """Reel izohlarini olish va yangi izoh qo'shish."""
    try:
        reel = Reel.objects.filter(id=reel_id).first()
        if not reel:
            return Response({'error': 'Reel topilmadi'}, status=404)

        if request.method == 'GET':
            try:
                comments = ReelComment.objects.filter(reel=reel).select_related('user', 'user__profile').order_by('-created_at')[:100]
                c_list = [c.to_dict() for c in comments]
                c_count = ReelComment.objects.filter(reel=reel).count()
            except Exception:
                c_list = []
                c_count = 0
            return Response({
                'comments': c_list,
                'count': c_count,
            })

        elif request.method == 'POST':
            if not request.user or not request.user.is_authenticated:
                return Response({'error': 'Izoh qoldirish uchun tizimga kiring'}, status=401)

            text = (request.data.get('text') or '').strip()
            if not text:
                return Response({'error': 'Izoh matni bo\'sh bo\'lishi mumkin emas'}, status=400)
            if len(text) > 1000:
                return Response({'error': 'Izoh 1000 belgidan oshmasligi kerak'}, status=400)

            parent_id = request.data.get('parent_id')
            parent = None
            if parent_id:
                parent = ReelComment.objects.filter(id=parent_id, reel=reel).first()

            comment = ReelComment.objects.create(
                reel=reel,
                user=request.user,
                parent=parent,
                text=text,
            )

            try:
                count = ReelComment.objects.filter(reel=reel).count()
            except Exception:
                count = 1

            return Response({
                'success': True,
                'comment': comment.to_dict(),
                'comments_count': count,
                'message': 'Izohingiz muvaffaqiyatli qoldirildi!',
            }, status=201)
    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reels_create_user_question_api(request):
    """O'quvchi tomonidan qiyin savol yaratish va Reels lentasiga chiqarish."""
    subject_slug = request.data.get('subject_slug', 'tarix')
    subject_name = request.data.get('subject_name', 'Tarix')
    quiz_question = (request.data.get('quiz_question') or '').strip()
    options = request.data.get('options') or []
    correct_index = int(request.data.get('correct_index', 0))
    explanation = (request.data.get('explanation') or '').strip()

    if not quiz_question:
        return Response({'error': 'Savol matni kiritilishi shart'}, status=400)
    if len(options) < 2:
        return Response({'error': 'Kamida 2 ta javob varianti kiritilishi kerak'}, status=400)
    if correct_index < 0 or correct_index >= len(options):
        correct_index = 0

    gradient_theme = request.data.get('gradient_theme', 'purple')
    if gradient_theme not in ['rose', 'sky', 'emerald', 'purple', 'amber']:
        gradient_theme = 'purple'

    reel = Reel.objects.create(
        created_by=request.user,
        subject_name=subject_name,
        subject_slug=subject_slug,
        category_badge=f"Abituriyent • {request.user.username}",
        tagline="Abituriyent Chaqirig'i",
        hook=quiz_question,
        fact=explanation or "Ushbu savol abituriyent tomonidan tuzilgan va bilim almashish uchun ulashilgan.",
        takeaway="Xatolaringiz ustida ishlang va boshqalarni ham sinab ko'ring!",
        quiz_question=quiz_question,
        quiz_options=options,
        quiz_correct_index=correct_index,
        quiz_explanation=explanation or "To'g'ri javob muallif tomonidan belgilangan.",
        gradient_theme=gradient_theme,
        media_type='text',
        is_published=True,
    )

    profile = getattr(request.user, 'profile', None)
    if profile:
        profile.add_xp(20)

    return Response({
        'success': True,
        'message': "Savolingiz Bilim Reels lentasiga muvaffaqiyatli qo'shildi! (+20 XP) 🔥",
        'reel': reel.to_dict(),
    }, status=201)


# ============================================================
# COMMUNITY FEED API (HAMJAMIYAT LENTASI)
# ============================================================

@api_view(['GET'])
@permission_classes([AllowAny])
def community_feed_api(request):
    """Platforma o'quvchilarining test natijalari va sertifikatlar lentasi.
    Smart Hub & Yo'nalish Izolyatsiyasi:
    1. O'quvchining yo'nalishi (exam_track) bo'yicha qat'iy izolyatsiya qilinadi.
    2. O'quvchi qaysi fanlarda test yechgan bo'lsa, o'sha fanlarga oid postlar birinchi bo'lib chiqadi.
    """
    from django.db.models import Q, Case, When, Value, IntegerField
    from tests_app.models import Attempt

    post_type = request.GET.get('type', 'all')
    subject_slug = request.GET.get('subject', 'all')
    mine = request.GET.get('mine')
    author_id = request.GET.get('author_id')
    track = request.GET.get('track')

    profile = getattr(request.user, 'profile', None) if request.user.is_authenticated else None
    user_track = getattr(profile, 'exam_track', 'DTM_SERTIFIKAT') if profile else 'DTM_SERTIFIKAT'
    active_track = track if track and track != 'all' else user_track

    qs = CommunityPost.objects.select_related('author', 'author__profile', 'test', 'attempt').prefetch_related('reactions')

    # 1. Track bo'yicha izolyatsiya (DTM o'quvchisi Koreys yoki Arab tili postlarini ko'rmaydi!)
    if active_track and active_track != 'all':
        qs = qs.filter(Q(exam_track=active_track) | Q(exam_track__isnull=True) | Q(exam_track=''))

    if mine and request.user.is_authenticated:
        qs = qs.filter(author=request.user)
    elif author_id:
        qs = qs.filter(author_id=author_id)

    if post_type and post_type != 'all':
        qs = qs.filter(post_type=post_type)

    # 2. O'quvchining amalda yechgan fanlari ro'yxatini aniqlaymiz
    user_attempted_slugs = []
    if profile:
        user_attempted_slugs = list(
            Attempt.objects.filter(profile=profile)
            .exclude(test__subject__slug__isnull=True)
            .values_list('test__subject__slug', flat=True)
            .distinct()[:6]
        )

    # 3. Fanlar bo'yicha saralash / Shaxsiylashtirish
    if subject_slug == 'my_subjects' and user_attempted_slugs:
        qs = qs.filter(subject_slug__in=user_attempted_slugs)
    elif subject_slug and subject_slug != 'all':
        qs = qs.filter(subject_slug=subject_slug)
    elif user_attempted_slugs:
        # Standart holatda o'quvchi yechayotgan fanlar postlarini eng yuqoriga chiqaramiz
        qs = qs.annotate(
            is_my_subject=Case(
                When(subject_slug__in=user_attempted_slugs, then=Value(1)),
                default=Value(0),
                output_field=IntegerField(),
            )
        ).order_by('-is_my_subject', '-id')
    else:
        qs = qs.order_by('-id')

    total = qs.count()
    posts = qs[:50]

    posts_list = [p.to_dict(current_user=request.user) for p in posts]

    subjects = [
        {'slug': 'all', 'name': 'Barchasi'},
        {'slug': 'tarix', 'name': 'Tarix'},
        {'slug': 'ona-tili', 'name': 'Ona tili'},
        {'slug': 'biologiya', 'name': 'Biologiya'},
        {'slug': 'ingliz-tili', 'name': 'Ingliz tili'},
        {'slug': 'matematika', 'name': 'Matematika'},
    ]

    return Response({
        'posts': posts_list,
        'total': total,
        'subjects': subjects,
        'user_track': active_track,
        'user_attempted_slugs': user_attempted_slugs,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def community_post_create_api(request):
    """Test natijasi yoki sertifikatni hamjamiyat lentasiga chiqarish."""
    from tests_app.models import Attempt
    from tests_app.story import sign_attempt

    attempt_id = request.data.get('attempt_id')
    caption = (request.data.get('caption') or '').strip()
    post_type = request.data.get('post_type', 'test_result')
    custom_img = request.FILES.get('image') or request.FILES.get('custom_image')

    # 1. Agar erkin yutuq yoki konspekt posti bo'lsa (attempt_id yo'q):
    if not attempt_id:
        title = (request.data.get('title') or "Mening Yutug'im").strip()
        subject_name = request.data.get('subject_name') or "Asosiy"
        subject_slug = request.data.get('subject_slug') or "tarix"

        post = CommunityPost.objects.create(
            author=request.user,
            post_type='achievement',
            title=title,
            subject_name=subject_name,
            subject_slug=subject_slug,
            caption=caption,
            custom_image=custom_img,
        )

        profile = request.user.profile
        profile.xp += 15
        profile.save(update_fields=['xp'])

        return Response({
            'success': True,
            'message': "Yutug'ingiz muvaffaqiyatli hamjamiyat lentasiga joylandi! +15 XP berildi 🔥",
            'post': post.to_dict(current_user=request.user),
            'xp_earned': 15,
        })

    # 2. Agar test natijasi bo'lsa:
    try:
        attempt = Attempt.objects.select_related('test', 'test__subject', 'profile').get(
            id=attempt_id,
            profile__user=request.user,
            is_completed=True
        )
    except Attempt.DoesNotExist:
        return Response({'error': "Urinish topilmadi yoki hali yakunlanmagan."}, status=404)

    # Allaqachon ulashilgan bo'lsa
    existing = CommunityPost.objects.filter(author=request.user, attempt=attempt).first()
    if existing:
        if caption:
            existing.caption = caption
            existing.save(update_fields=['caption'])
        return Response({
            'success': True,
            'message': "Natijangiz allaqachon hamjamiyat lentasida mavjud!",
            'post': existing.to_dict(current_user=request.user),
            'xp_earned': 0,
        })

    # Baholash darajasi
    score = attempt.score or 0.0
    if score >= 86.0:
        grade = 'A+ (Oltin)'
    elif score >= 70.0:
        grade = 'A'
    elif score >= 60.0:
        grade = 'B+'
    elif score >= 50.0:
        grade = 'B'
    elif score >= 46.0:
        grade = 'C+'
    elif score >= 40.0:
        grade = 'C'
    else:
        grade = 'Ishtirokchi'

    subject_name = attempt.test.subject.name if (attempt.test and attempt.test.subject) else "Tarix"
    subject_slug = attempt.test.subject.slug if (attempt.test and attempt.test.subject) else "tarix"
    title = attempt.test.title if attempt.test else "Katta Sinov Testi"

    total_q = attempt.correct_answers + attempt.wrong_answers + attempt.skipped_answers
    sig = sign_attempt(attempt.id)
    image_url = f"/api/tests/attempts/{attempt.id}/story/?sig={sig}"

    post = CommunityPost.objects.create(
        author=request.user,
        attempt=attempt,
        test=attempt.test,
        post_type=post_type,
        title=title,
        subject_name=subject_name,
        subject_slug=subject_slug,
        score=score,
        grade=grade,
        correct_count=attempt.correct_answers,
        total_questions=total_q or 1,
        caption=caption,
        image_url=image_url,
        custom_image=custom_img,
    )

    # 24 soatlik Rasmiy CommunityStory ham yaratamiz
    try:
        from datetime import timedelta
        from django.utils import timezone
        from learning.models import CommunityStory

        story_badge = f"🏆 {grade}" if post_type == 'certificate' else f"🎯 {score}%"
        CommunityStory.objects.create(
            author=request.user,
            story_type='certificate' if post_type == 'certificate' else 'streak',
            exam_track='ALL',
            title=f"🏆 {title}" if post_type == 'certificate' else title,
            caption=caption or f"{subject_name} fanidan {score}% natija qayd etildi!",
            badge=story_badge,
            cta_text="Sinovdan o'tish 📝",
            cta_link=f"/tests/{attempt.test_id}" if attempt.test_id else "/tests",
            expires_at=timezone.now() + timedelta(hours=24),
        )
    except Exception:
        pass

    # O'quvchiga +15 XP bonus beramiz
    profile = request.user.profile
    profile.xp += 15
    profile.save(update_fields=['xp'])

    return Response({
        'success': True,
        'message': "Natijangiz muvaffaqiyatli hamjamiyat lentasiga joylandi! +15 XP berildi 🔥",
        'post': post.to_dict(current_user=request.user),
        'xp_earned': 15,
    })


@api_view(['DELETE', 'POST'])
@permission_classes([IsAuthenticated])
def community_post_delete_api(request, post_id):
    """Post muallifi yoki super admin tomonidan postni o'chirish."""
    post = CommunityPost.objects.filter(id=post_id).first()
    if not post:
        return Response({'success': True, 'message': "Post allaqachon o'chirilgan."}, status=200)

    is_author = (post.author_id == request.user.id or post.author == request.user)
    is_admin = getattr(request.user, 'is_superuser', False) or getattr(request.user, 'is_staff', False)
    if not is_admin:
        try:
            prof = getattr(request.user, 'profile', None)
            if prof and (getattr(prof, 'is_superadmin', False) or getattr(prof, 'role', '') == 'superadmin'):
                is_admin = True
        except Exception:
            pass

    if not (is_author or is_admin):
        return Response({'error': "Faqat post muallifi o'z postini o'chira oladi."}, status=403)

    try:
        post.delete()
        return Response({'success': True, 'message': "Post muvaffaqiyatli o'chirildi."})
    except Exception as e:
        logger.exception("Error deleting community post: %s", e)
        return Response({'error': f"O'chirishda xatolik: {str(e)}"}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def community_post_pin_api(request, post_id):
    """Admin tomonidan postni eng yuqoriga qadash (pin) yoki qadashdan chiqarish."""
    if not (request.user.is_staff or request.user.is_superuser):
        return Response({'error': "Faqat adminlar postni qaday oladi."}, status=403)

    try:
        post = CommunityPost.objects.get(id=post_id)
    except CommunityPost.DoesNotExist:
        return Response({'error': "Post topilmadi."}, status=404)

    post.is_pinned = not post.is_pinned
    post.save(update_fields=['is_pinned'])
    return Response({
        'success': True,
        'is_pinned': post.is_pinned,
        'message': "Post yuqoriga qadaldi!" if post.is_pinned else "Post qadashdan chiqarildi.",
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def community_post_react_api(request, post_id):
    """Postga emodzi reaksiya bildirish yoki bekor qilish."""
    try:
        post = CommunityPost.objects.get(id=post_id)
    except CommunityPost.DoesNotExist:
        return Response({'error': "Post topilmadi."}, status=404)

    reaction_type = request.data.get('reaction_type', 'fire')
    if reaction_type not in ('fire', 'clap', 'trophy', 'heart'):
        reaction_type = 'fire'

    existing = CommunityPostReaction.objects.filter(post=post, user=request.user).first()
    if existing:
        if existing.reaction_type == reaction_type:
            # Ikkinchi marta bossa o'chiramiz
            existing.delete()
            active_reaction = None
        else:
            existing.reaction_type = reaction_type
            existing.save(update_fields=['reaction_type'])
            active_reaction = reaction_type
    else:
        CommunityPostReaction.objects.create(post=post, user=request.user, reaction_type=reaction_type)
        active_reaction = reaction_type
        from core import background
        from .notifications import send_post_reaction_notification
        background.submit(send_post_reaction_notification, post.id, request.user.id, reaction_type)

    post.likes_count = post.reactions.count()
    post.save(update_fields=['likes_count'])

    reaction_counts = {
        'fire': post.reactions.filter(reaction_type='fire').count(),
        'clap': post.reactions.filter(reaction_type='clap').count(),
        'trophy': post.reactions.filter(reaction_type='trophy').count(),
        'heart': post.reactions.filter(reaction_type='heart').count(),
    }

    return Response({
        'success': True,
        'user_reaction': active_reaction,
        'reaction_counts': reaction_counts,
        'total_likes': post.likes_count,
    })


@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def community_post_comments_api(request, post_id):
    """Post izohlarini olish yoki yangi izoh (hamda javob) qoldirish."""
    try:
        post = CommunityPost.objects.get(id=post_id)
    except CommunityPost.DoesNotExist:
        return Response({'error': "Post topilmadi."}, status=404)

    if request.method == 'GET':
        comments = post.comments.select_related('user', 'user__profile').order_by('created_at')[:100]
        return Response({
            'comments': [c.to_dict() for c in comments],
            'count': post.comments.count(),
        })

    elif request.method == 'POST':
        if not request.user or not request.user.is_authenticated:
            return Response({'error': "Izoh yozish uchun tizimga kiring."}, status=401)

        text = (request.data.get('text') or '').strip()
        if not text:
            return Response({'error': "Izoh matni bo'sh bo'lishi mumkin emas."}, status=400)

        parent_id = request.data.get('parent_id')
        parent = None
        if parent_id:
            parent = CommunityPostComment.objects.filter(id=parent_id, post=post).first()

        comment = CommunityPostComment.objects.create(
            post=post,
            user=request.user,
            parent=parent,
            text=text,
        )
        post.comments_count = post.comments.count()
        post.save(update_fields=['comments_count'])

        from core import background
        from .notifications import send_post_comment_notification
        background.submit(send_post_comment_notification, post.id, comment.id, request.user.id)

        return Response({
            'success': True,
            'comment': comment.to_dict(),
            'comments_count': post.comments_count,
        })


# ============================================================
# KUTUBXONA API (LIBRARY: DARSLIKLAR VA QO'LLANMALAR)
# ============================================================

from .models import Book, BookBookmark
from tests_app.models import Subject
from django.db.models import Q, F


@api_view(['GET'])
@permission_classes([AllowAny])
def library_books_api(request):
    """Kutubxona darslik va qo'llanmalar ro'yxati, filtrlash va toifalar."""
    current_user = request.user if request.user.is_authenticated else None

    qs = Book.objects.filter(is_published=True).select_related('subject')

    # 1. Fan bo'yicha filter
    subject_param = request.GET.get('subject', '').strip()
    if subject_param and subject_param != 'all':
        if subject_param.isdigit():
            qs = qs.filter(subject_id=int(subject_param))
        else:
            qs = qs.filter(Q(subject__slug=subject_param) | Q(subject__name__iexact=subject_param))

    # 2. Sinf bo'yicha filter
    grade_param = request.GET.get('grade', '').strip()
    if grade_param and grade_param != 'all':
        qs = qs.filter(grade=grade_param)

    # 3. Kategoriya bo'yicha filter (textbook, manual, collection, tables)
    category_param = request.GET.get('category', '').strip()
    if category_param and category_param != 'all':
        qs = qs.filter(category=category_param)

    # 4. Qidiruv
    search_q = request.GET.get('q', '').strip()
    if search_q:
        qs = qs.filter(
            Q(title__icontains=search_q) |
            Q(author__icontains=search_q) |
            Q(description__icontains=search_q)
        )

    # 5. Saqlanganlar (Faqat sevimlilar)
    bookmarked_only = request.GET.get('bookmarked') == '1'
    if bookmarked_only and current_user:
        bookmarked_ids = BookBookmark.objects.filter(user=current_user).values_list('book_id', flat=True)
        qs = qs.filter(id__in=bookmarked_ids)

    # Fanlar ro'yxati (har bir fanda nechta kitob borligi bilan)
    all_published_books = Book.objects.filter(is_published=True)
    subjects_list = []
    subjects = Subject.objects.all().order_by('order', 'name')
    for s in subjects:
        cnt = all_published_books.filter(subject=s).count()
        if cnt > 0:
            subjects_list.append({
                'id': s.id,
                'name': s.name,
                'slug': s.slug,
                'color': s.color,
                'icon_name': s.icon_name,
                'books_count': cnt,
            })

    # Kategoriyalar ro'yxati
    categories_list = [
        {'id': 'all', 'name': 'Barcha turlar', 'count': all_published_books.count()},
        {'id': 'textbook', 'name': 'Maktab darsliklari', 'count': all_published_books.filter(category='textbook').count()},
        {'id': 'manual', 'name': "Qo'llanma & Spravochnik", 'count': all_published_books.filter(category='manual').count()},
        {'id': 'tables', 'name': 'Xronologiya & Jadvallar', 'count': all_published_books.filter(category='tables').count()},
        {'id': 'collection', 'name': "Testlar to'plami", 'count': all_published_books.filter(category='collection').count()},
    ]

    # Sinflar ro'yxati
    grades_list = [
        {'id': 'all', 'name': 'Barcha sinflar'},
        {'id': '5', 'name': '5-sinf'},
        {'id': '6', 'name': '6-sinf'},
        {'id': '7', 'name': '7-sinf'},
        {'id': '8', 'name': '8-sinf'},
        {'id': '9', 'name': '9-sinf'},
        {'id': '10', 'name': '10-sinf'},
        {'id': '11', 'name': '11-sinf'},
        {'id': 'abiturient', 'name': 'Abituriyent'},
    ]

    books_data = [b.to_dict(current_user=current_user) for b in qs]

    # Umumiy statistika
    stats = {
        'total_books': all_published_books.count(),
        'total_reads': sum(all_published_books.values_list('views_count', flat=True) or [0]),
        'total_downloads': sum(all_published_books.values_list('downloads_count', flat=True) or [0]),
    }

    return Response({
        'books': books_data,
        'subjects': subjects_list,
        'categories': categories_list,
        'grades': grades_list,
        'stats': stats,
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def library_book_detail_api(request, book_id):
    """Kitob tafsilotlari va o'qish (view sanagich oshiriladi)."""
    try:
        book = Book.objects.select_related('subject').get(id=book_id, is_published=True)
    except Book.DoesNotExist:
        return Response({'error': "Kitob topilmadi."}, status=404)

    # Ko'rishlar sonini oshiramiz
    Book.objects.filter(id=book.id).update(views_count=F('views_count') + 1)
    book.views_count += 1

    current_user = request.user if request.user.is_authenticated else None
    data = book.to_dict(current_user=current_user)

    # Tavsiya etiladigan boshqa kitoblar
    related_qs = Book.objects.filter(is_published=True).exclude(id=book.id)
    if book.subject:
        related_qs = related_qs.filter(Q(subject=book.subject) | Q(grade=book.grade))
    related_books = [b.to_dict(current_user=current_user) for b in related_qs[:4]]
    data['related_books'] = related_books

    return Response(data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def library_book_bookmark_api(request, book_id):
    """Kitobni sevimlilarga qo'shish yoki olib tashlash."""
    try:
        book = Book.objects.get(id=book_id, is_published=True)
    except Book.DoesNotExist:
        return Response({'error': "Kitob topilmadi."}, status=404)

    existing = BookBookmark.objects.filter(user=request.user, book=book).first()
    if existing:
        existing.delete()
        is_bookmarked = False
        message = "Kitob saqlanganlardan olib tashlandi."
    else:
        BookBookmark.objects.create(user=request.user, book=book)
        is_bookmarked = True
        message = "Kitob saqlanganlarga qo'shildi!"

    return Response({
        'success': True,
        'is_bookmarked': is_bookmarked,
        'message': message,
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def library_book_download_api(request, book_id):
    """Yuklab olishlar sanagichini 1 taga oshirish."""
    try:
        book = Book.objects.get(id=book_id, is_published=True)
    except Book.DoesNotExist:
        return Response({'error': "Kitob topilmadi."}, status=404)

    Book.objects.filter(id=book.id).update(downloads_count=F('downloads_count') + 1)
    book.downloads_count += 1

    return Response({
        'success': True,
        'downloads_count': book.downloads_count,
    })




# ─── 1-CLICK SMART POSTS & STORIES APIS ──────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def community_auto_post_api(request):
    """Strava/GitHub uslubidagi 1-bosishda avto-postlar:
    - SOS Savol-Posti: O'quvchi qiynalgan savolini interaktiv so'rovnoma qilib chiqaradi.
    - Avto-Yutuq Posti: Sprint natijasi yoki Ildiz daraxtining yangi bosqichi (+15 XP).
    """
    post_type = request.data.get('post_type', 'achievement')
    user = request.user
    profile = getattr(user, 'profile', None)

    exam_track = getattr(profile, 'exam_track', 'DTM_SERTIFIKAT') if profile else 'DTM_SERTIFIKAT'
    subject_name = request.data.get('subject_name') or "Umumiy"
    subject_slug = request.data.get('subject_slug') or "umumiy"

    if post_type == 'sos_question':
        question_text = request.data.get('question_text', '').strip()
        options = request.data.get('options', ['A', 'B', 'C', 'D'])
        correct_option = request.data.get('correct_option', 'A')
        explanation = request.data.get('explanation', '')
        title = f"🙋‍♂️ Yordam kerak: {subject_name} bo'yicha qiyin savol!"
        caption = request.data.get('caption') or "Ushbu savolning javobini kim biladi? O'z variantingizni tanlang va izohda tushuntiring 👇"

        poll_data = {
            'question_text': question_text,
            'options': options,
            'correct_option': correct_option,
            'explanation': explanation,
            'votes': {opt: 0 for opt in options},
            'voted_users': {},
        }

        post = CommunityPost.objects.create(
            author=user,
            post_type='sos_question',
            title=title,
            subject_name=subject_name,
            subject_slug=subject_slug,
            caption=caption,
            exam_track=exam_track,
            poll_data=poll_data,
        )

        # SOS Story'sini 24 soatga yaratamiz
        try:
            from datetime import timedelta
            from django.utils import timezone
            from learning.models import CommunityStory

            CommunityStory.objects.create(
                author=user,
                story_type='streak',
                exam_track='ALL',
                title=title,
                caption=question_text[:120] if question_text else caption,
                badge="🙋 SOS Savol",
                cta_text="Yordam berish ✍️",
                cta_link="/feed",
                expires_at=timezone.now() + timedelta(hours=24),
            )
        except Exception:
            pass
    else:
        # Avto-Yutuq / Streak / Daraxt posti
        title = request.data.get('title') or "Ilm Ildizim yangi bosqichga ko'tarildi! 🌳"
        caption = request.data.get('caption') or f"Bugun {subject_name} bo'yicha ajoyib natija ko'rsatdim. Kim 1v1 Arena dueliga tayyor? 🔥"
        score_val = request.data.get('score')
        correct_val = int(request.data.get('correct_count', 0))
        total_val = int(request.data.get('total_questions', 0))

        post = CommunityPost.objects.create(
            author=user,
            post_type='achievement',
            title=title,
            subject_name=subject_name,
            subject_slug=subject_slug,
            caption=caption,
            exam_track=exam_track,
            score=score_val,
            correct_count=correct_val,
            total_questions=total_val,
        )

        # 24 soatlik Rasmiy Avto-Yutuq Story'sini yaratamiz
        try:
            from datetime import timedelta
            from django.utils import timezone
            from learning.models import CommunityStory

            if total_val > 0:
                story_badge = f"🎯 {correct_val}/{total_val}"
            elif score_val:
                story_badge = f"🔥 {score_val}% Natija"
            else:
                story_badge = "⚡ Yangi Yutuq"

            CommunityStory.objects.create(
                author=user,
                story_type='streak',
                exam_track='ALL',
                title=title,
                caption=caption,
                badge=story_badge,
                cta_text="1v1 Duelga chorlash ⚔️",
                cta_link="/battles",
                expires_at=timezone.now() + timedelta(hours=24),
            )
        except Exception:
            pass

    # Foydalanuvchiga +15 XP bonus
    if profile:
        profile.xp += 15
        profile.save(update_fields=['xp'])

    return Response({
        'success': True,
        'message': "Natijangiz Lenta va Story'ga muvaffaqiyatli joylandi! (+15 XP berildi 🔥)",
        'post': post.to_dict(current_user=user),
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def community_post_vote_poll_api(request, post_id):
    """Lentadagi SOS savoliga A/B/C/D bosib javob berish (real vaqtda foizlarni ko'rsatadi)."""
    post = CommunityPost.objects.filter(id=post_id).first()
    if not post:
        return Response({'error': "Post topilmadi."}, status=404)

    poll_data = post.poll_data or {}
    options = poll_data.get('options', [])
    votes = poll_data.get('votes', {})
    voted_users = poll_data.get('voted_users', {})
    correct_option = poll_data.get('correct_option', '')
    explanation = poll_data.get('explanation', '')

    user_id_str = str(request.user.id)
    selected_option = request.data.get('selected_option')

    if not selected_option:
        return Response({'error': "Variant tanlanmadi."}, status=400)

    # Agar foydalanuvchi hali ovoz bermagan bo'lsa
    if user_id_str not in voted_users:
        votes[selected_option] = votes.get(selected_option, 0) + 1
        voted_users[user_id_str] = selected_option
        poll_data['votes'] = votes
        poll_data['voted_users'] = voted_users
        post.poll_data = poll_data
        post.save(update_fields=['poll_data'])

        # To'g'ri topgan bo'lsa +5 XP rag'bat
        if selected_option == correct_option:
            prof = getattr(request.user, 'profile', None)
            if prof:
                prof.xp += 5
                prof.save(update_fields=['xp'])

    is_correct = (selected_option == correct_option)
    total_votes = sum(votes.values())
    pct_breakdown = {opt: round((cnt / max(1, total_votes)) * 100) for opt, cnt in votes.items()}

    return Response({
        'success': True,
        'is_correct': is_correct,
        'correct_option': correct_option,
        'explanation': explanation,
        'votes': votes,
        'percentages': pct_breakdown,
        'total_votes': total_votes,
        'user_choice': voted_users.get(user_id_str, selected_option),
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def community_stories_api(request):
    """Kunlik Streak-Story'lar va O'quv markazlarining Promo-Story'lari."""
    from datetime import timedelta
    from django.utils import timezone
    from learning.models import CommunityStory
    from django.db.models import Q

    user_track = 'DTM_SERTIFIKAT'
    if request.user.is_authenticated:
        prof = getattr(request.user, 'profile', None)
        if prof and hasattr(prof, 'exam_track'):
            user_track = prof.exam_track

    now = timezone.now()
    stories_qs = CommunityStory.objects.filter(
        expires_at__gt=now,
    ).filter(
        Q(exam_track='ALL') | Q(exam_track=user_track) | Q(story_type__in=['streak', 'certificate'])
    ).select_related('author', 'author__profile', 'center').order_by('-created_at')[:25]

    stories_data = []
    for s in stories_qs:
        author_name = s.author.get_full_name() or s.author.username if s.author else (s.center.name if s.center else "IlmIldizi")
        avatar = ''
        if s.author:
            prof = getattr(s.author, 'profile', None)
            avatar = getattr(prof, 'avatar_url', '') if prof else ''
            if not avatar:
                avatar = f"https://api.dicebear.com/7.x/adventurer/svg?seed={s.author.username}"
        elif s.center:
            avatar = s.center.logo_url or ''

        stories_data.append({
            'id': s.id,
            'author_name': author_name,
            'avatar': avatar,
            'story_type': s.story_type,
            'title': s.title,
            'caption': s.caption,
            'media_url': s.media_url,
            'badge': s.badge or ('🔥 30 Kun' if s.story_type == 'streak' else '🎯 Yutuq'),
            'cta_text': s.cta_text or "1v1 Duelga chorlash ⚔️",
            'cta_link': s.cta_link or "/battles",
            'views_count': s.views_count,
            'created_at': s.created_at.strftime('%H:%M'),
        })

    return Response({'stories': stories_data})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def community_story_create_api(request):
    """Foydalanuvchi tomonidan to'g'ridan-to'g'ri yangi 24 soatlik Story joylash."""
    from datetime import timedelta
    from django.utils import timezone
    from learning.models import CommunityStory

    user = request.user
    title = (request.data.get('title') or "Bugungi Natijam! 🔥").strip()
    caption = (request.data.get('caption') or "Bilim sinovidan o'tdim. Siz ham o'zingizni sinab ko'ring!").strip()
    badge = (request.data.get('badge') or "⚡ Yutuq").strip()
    cta_text = request.data.get('cta_text') or "1v1 Duelga chorlash ⚔️"
    cta_link = request.data.get('cta_link') or "/battles"
    story_type = request.data.get('story_type', 'streak')

    story = CommunityStory.objects.create(
        author=user,
        story_type=story_type,
        exam_track='ALL',
        title=title,
        caption=caption,
        badge=badge,
        cta_text=cta_text,
        cta_link=cta_link,
        expires_at=timezone.now() + timedelta(hours=24),
    )

    profile = getattr(user, 'profile', None)
    if profile:
        profile.xp += 15
        profile.save(update_fields=['xp'])

    return Response({
        'success': True,
        'message': "Story muvaffaqiyatli joylandi! (+15 XP berildi 🔥)",
        'story': {
            'id': story.id,
            'title': story.title,
            'caption': story.caption,
            'badge': story.badge,
        }
    })
