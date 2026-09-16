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
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsChannelSubscribed
from core.ai_client import ask_groq_stream
from tests_app.models import Subject
from tests_app.subject_utils import resolve_subject

from .models import Bookmark, Lesson, Topic, Reel, ReelComment, CommunityPost, CommunityPostReaction, CommunityPostComment
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
        if not Reel.objects.filter(is_published=True).exists():
            seed_default_reels()

        qs = Reel.objects.filter(is_published=True)
        if subject_slug and subject_slug not in ('all', 'for_you'):
            qs = qs.filter(subject_slug=subject_slug)

        reels_list = [r.to_dict() for r in qs]
        if not reels_list:
            if subject_slug not in ('all', 'for_you'):
                reels_list = [r for r in REELS_DATA if r['subject_slug'] == subject_slug]
            else:
                reels_list = list(REELS_DATA)
    except Exception:
        # Fallback to in-memory list if DB tables aren't migrated yet
        if subject_slug and subject_slug not in ('all', 'for_you'):
            reels_list = [r for r in REELS_DATA if r['subject_slug'] == subject_slug]
        else:
            reels_list = list(REELS_DATA)

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
                xp_earned = 5
                profile.add_xp(xp_earned)
                profile.update_streak()
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


# ============================================================
# COMMUNITY FEED API (HAMJAMIYAT LENTASI)
# ============================================================

@api_view(['GET'])
@permission_classes([AllowAny])
def community_feed_api(request):
    """Platforma o'quvchilarining test natijalari va sertifikatlar lentasi."""
    post_type = request.GET.get('type', 'all')
    subject_slug = request.GET.get('subject', 'all')

    qs = CommunityPost.objects.select_related('author', 'author__profile', 'test', 'attempt').prefetch_related('reactions')

    if post_type and post_type != 'all':
        qs = qs.filter(post_type=post_type)

    if subject_slug and subject_slug != 'all':
        qs = qs.filter(subject_slug=subject_slug)

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
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
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

        return Response({
            'success': True,
            'comment': comment.to_dict(),
            'comments_count': post.comments_count,
        })
