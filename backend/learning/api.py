"""SSE AI Mentor endpoint for the Next.js frontend — mirrors learning/views.py's
mentor_stream() exactly (same rate limits, same Groq/fallback chain), except chat history
is NOT kept server-side: mentor_stream() relies on request.session, which the JWT-only
Next.js client never has (see accounts/api.py's module docstring for why the whole API is
JWT instead of session cookies). The frontend keeps its own chat history and only needs
the model's reply, so no session and no new DB model are needed."""
import json

from django.db.models import Prefetch
from django.http import HttpResponse, HttpResponseBadRequest, StreamingHttpResponse
from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsChannelSubscribed
from core.ai_client import ask_groq_stream
from tests_app.models import Subject
from tests_app.subject_utils import resolve_subject

from .models import Bookmark, Lesson, Topic
from .services import (
    _build_mentor_context, _greeting_reply, _mentor_ai_allowed, _mentor_rate_limited,
    _mentor_system_prompt, build_mentor_reply, seed_learning_if_needed,
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
        allow_ai = _mentor_ai_allowed(request.user.id, is_pro=profile.has_active_premium_lessons)
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

    def topic_list(category):
        return [{
            'id': t.id, 'title': t.title,
            'lessons': [{'id': l.id, 'title': l.title} for l in t.lessons.all()],
        } for t in topics if t.category == category]

    all_lessons = Lesson.objects.filter(is_published=True)
    if subject:
        all_lessons = all_lessons.filter(topic__subject=subject)

    lesson_id = request.query_params.get('lesson_id')
    if lesson_id:
        lesson = get_object_or_404(Lesson, id=lesson_id, is_published=True)
    else:
        lesson = all_lessons.first()

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
        'title': "Temuriylar Saltanati: Muhim Janglar va Sanalar",
        'subject': "Tarix",
        'subject_slug': "tarix",
        'icon': "Crown",
        'description': "1370-yildan 1507-yilgacha bo'lgan eng muhim g'alabalar, yurishlar va sanalarni 3 daqiqada eslab qoling.",
        'difficulty': "Asosiy",
        'xp_reward': 25,
        'cards': [
            {
                'id': 1,
                'front': "1370-yil 9-aprelda Movarounnahrda qanday tarixiy burilish yuz berdi?",
                'back': "Amir Temur Balx qurultoyida Movarounnahrning oliy hukmdori deb e'lon qilindi va Samarqandni poytaxt etib belgiladi.",
                'hint': "Buyuk davlatning tug'ilishi"
            },
            {
                'id': 2,
                'front': "1395-yil Qunduzcha (Terek) daryosi bo'yidagi jang kimlar o'rtasida bo'ldi?",
                'back': "Amir Temur va Oltin O'rda xoni To'xtamishxon o'rtasida bo'ldi. Temurning g'alabasi Oltin O'rdaning qudratiga yakuniy zarba berdi.",
                'hint': "Shimoliy dushman bilan to'qnashuv"
            },
            {
                'id': 3,
                'front': "1402-yil 20-iyuldagi Anqara jangi nima uchun jahon tarixida muhim hisoblanadi?",
                'back': "Amir Temur Usmonli sultoni Boyazid Yildirimni mag'lub etdi va Yevropani yarim asrga Usmonlilar istilosidan saqlab qoldi.",
                'hint': "Sharq va G'arb to'qnashuvi"
            },
            {
                'id': 4,
                'front': "Ulug'bek rasadxonasi qachon va qayerda bunyod etilgan?",
                'back': "1424–1428-yillarda Samarqand yaqinidagi Ko'hak (Cho'ponota) tepaligida qurilgan.",
                'hint': "Yulduzlar ilmi poydevori"
            },
            {
                'id': 5,
                'front': "'Temur tuzuklari' asari necha qismdan iborat va unda nimalar bayon qilingan?",
                'back': "2 qismdan iborat: 1-qism Amir Temurning tarjimayi holi va harbiy yurishlari, 2-qism davlatni boshqarish qonun-qoidalari.",
                'hint': "Davlat va adolat dasturi"
            },
            {
                'id': 6,
                'front': "1405-yil 18-fevralda qanday tarixiy voqea yuz berdi?",
                'back': "Amir Temur Xitoyga yurishi paytida O'tror shahrida 69 yoshida vafot etdi.",
                'hint': "Buyuk sohibqironning so'nggi manzili"
            }
        ]
    },
    {
        'id': 102,
        'title': "Ona Tili: Imlo Qoidalari va Morfologiya",
        'subject': "Ona tili",
        'subject_slug': "ona-tili",
        'icon': "BookOpen",
        'description': "BBA va Milliy Sertifikat imtihonlarida eng ko'p xato qilinadigan imlo va tinish belgilari qoidalari.",
        'difficulty': "Muhim",
        'xp_reward': 25,
        'cards': [
            {
                'id': 1,
                'front': "Tutuq belgisi (') unlidan keyin kelganda qanday talaffuz qilinadi?",
                'back': "Unli tovush cho'ziqroq talaffuz qilinadi. Masalan: ma'no, e'lon, e'tiqod, ta'sir, da'vo.",
                'hint': "Tovushning cho'zilishi"
            },
            {
                'id': 2,
                'front': "Tutuq belgisi undoshdan keyin kelganda qanday o'qiladi?",
                'back': "Undosh keyingi unlidan ajratib, to'xtam bilan aytiladi. Masalan: san'at, jur'at, mas'ul, qat'iy.",
                'hint': "Ajratish vazifasi"
            },
            {
                'id': 3,
                'front': "Qanday so'zlar har doim chiziqcha (-) bilan yoziladi?",
                'back': "Juft so'zlar (ota-ona, do'st-dushman) va takroriy so'zlar (asta-sekin, ko'pdan-ko'p, qator-qator).",
                'hint': "Juftlik va takror"
            },
            {
                'id': 4,
                'front': "Son bilan ot birikmasida ot qachon ko'plikda kelishi to'g'ri bo'ladi?",
                'back': "Faqat noaniq miqdorni bildiruvchi sonlardan keyin (o'nlab talabalar, yuzlab odamlar). Aniq sondan keyin esa ot birlikda keladi (beshta kitob).",
                'hint': "Aniq va noaniq miqdor"
            },
            {
                'id': 5,
                'front': "Egalik qo'shimchalari qo'shilganda qaysi undoshlar jaranglilashadi?",
                'back': "'k' undoshi 'g' ga (yurak -> yuragim), 'q' undoshi 'g'' ga aylanadi (quloq -> qulog'im).",
                'hint': "Tovush o'zgarishi"
            }
        ]
    },
    {
        'id': 103,
        'title': "Biologiya: Hujayra, DNK va Genetika Atamalari",
        'subject': "Biologiya",
        'subject_slug': "biologiya",
        'icon': "Sparkles",
        'description': "Mitoz, meyoz, fotosintez va genetika qonunlariga oid eng muhim atamalar to'plami.",
        'difficulty': "O'rta",
        'xp_reward': 25,
        'cards': [
            {
                'id': 1,
                'front': "Mitoz va Meyoz bo'linishlarining eng asosiy farqi nimada?",
                'back': "Mitozda bitta hujayradan 2 ta diploid (2n) tana hujayrasi; Meyozda esa 4 ta gaploid (n) jinsiy hujayra (gameta) hosil bo'ladi.",
                'hint': "Xromosoma to'plami va hujayralar soni"
            },
            {
                'id': 2,
                'front': "DNK qo'sh spirali tuzilishini kimlar va qachon kashf qilgan?",
                'back': "1953-yilda Jeyms Uotson va Frensis Krik kashf qilgan (Nobel mukofoti sohiblari).",
                'hint': "Molekulyar biologiya inqilobi"
            },
            {
                'id': 3,
                'front': "Fotosintezning yorug'lik bosqichi xloroplastning qayerida sodir bo'ladi?",
                'back': "Tilakoid membranalarida bo'lib o'tadi. Natijada ATF, NADPH va erkin kislorod (O2) hosil bo'ladi.",
                'hint': "Quyosh nuri yutiladigan joy"
            },
            {
                'id': 4,
                'front': "Transkripsiya va Translyatsiya nima?",
                'back': "Transkripsiya — DNK dan axborot RNK (iRNK) sintezi; Translyatsiya — ribosomada iRNK asosida oqsil sintezlanishi jarayoni.",
                'hint': "Genetik axborotning amalga oshishi"
            },
            {
                'id': 5,
                'front': "Mendelning 1-qonuni qanday nomlanadi?",
                'back': "Birinchi bo'g'in duragaylarining bir xilligi (dominantlik) qonuni.",
                'hint': "Genetika poydevori"
            }
        ]
    },
    {
        'id': 104,
        'title': "English: High-Yield Collocations & Idioms (B2/C1)",
        'subject': "Ingliz tili",
        'subject_slug': "ingliz-tili",
        'icon': "Zap",
        'description': "CEFR va IELTS imtihonlarida baland ball (Band 7+) olish uchun zarur bo'lgan iboralar.",
        'difficulty': "Yuqori",
        'xp_reward': 25,
        'cards': [
            {
                'id': 1,
                'front': "What does the idiom 'Cut corners' mean?",
                'back': "To do something in the easiest, cheapest, or fastest way, often compromising on quality.",
                'hint': "Taking shortcuts"
            },
            {
                'id': 2,
                'front': "What does 'Hit the nail on the head' mean?",
                'back': "To state or describe a situation or truth with absolute precision and accuracy.",
                'hint': "Exactly right"
            },
            {
                'id': 3,
                'front': "What is the key difference between 'Make' and 'Do'?",
                'back': "'Make' is for creating or producing something new (make a decision, make progress); 'Do' is for actions, obligations, or tasks (do homework, do business).",
                'hint': "Creation vs Action"
            },
            {
                'id': 4,
                'front': "What does 'Take something for granted' mean?",
                'back': "To fail to properly value or appreciate someone or something because you are overly used to it.",
                'hint': "Not appreciating worth"
            },
            {
                'id': 5,
                'front': "What does the phrase 'Every cloud has a silver lining' mean?",
                'back': "Every bad or difficult situation has some positive or hopeful aspect to it.",
                'hint': "Optimism in difficulty"
            }
        ]
    }
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
        if d['id'] == deck_id:
            return Response(d)

    # Check lesson deck
    lesson = Lesson.objects.filter(id=deck_id, is_published=True).first()
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

    xp_gain = 25
    coin_gain = 10

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

