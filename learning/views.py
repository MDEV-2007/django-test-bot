import re
from datetime import date
from django.core.cache import cache
from django.db.models import Prefetch, Q
from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.http import HttpResponse, JsonResponse, Http404
from django.utils.html import escape
from accounts.models import Profile
from core.models import ProfileMission, Notification
from core.ai_client import ask_groq
from .models import Topic, Lesson, VideoLesson, AudioLesson, Flashcard, Bookmark

# Daily per-user cap on AI-backed mentor answers, to bound Groq API cost. Beyond this the
# mentor still replies, but from the rule-based fallback instead of calling the LLM.
MENTOR_AI_DAILY_LIMIT = 30


def _mentor_ai_allowed(user_id):
    """Increments today's mentor-AI counter for a user and returns whether they are
    still under the daily limit. Uses the cache (resets naturally at end of day)."""
    key = f"mentor_ai:{user_id}:{date.today().isoformat()}"
    try:
        count = cache.get_or_set(key, 0, 60 * 60 * 26)
        cache.incr(key)
    except ValueError:
        # Key expired between get_or_set and incr — treat as first use of the day.
        cache.set(key, 1, 60 * 60 * 26)
        count = 0
    return count < MENTOR_AI_DAILY_LIMIT

STOPWORDS = {
    'va', 'bu', 'bir', 'uchun', 'haqida', 'nima', 'qanday', 'kim', 'qachon',
    'the', 'is', 'a', 'an', 'of', 'in', 'on', 'about', 'what', 'who', 'when',
    'menga', 'mening', 'sizga', 'iltimos', 'ayting', 'gapiring', 'tushuntiring',
}

def _mentor_system_prompt(subject_name):
    return (
        f"Sen IlmMevasi ta'lim ilovasidagi AI Mentorsan. Foydalanuvchi hozir '{subject_name}' "
        f"fanini o'rganyapti — asosan shu fan bo'yicha, Milliy sertifikat va imtihonlarga "
        f"tayyorgarlik yuzasidan yordam berasan. Faqat o'zbek tilida, aniq va qisqa (3-6 gap) "
        f"javob ber. Agar foydalanuvchi xabarida 'Kontekst:' bilan boshlangan qism berilgan "
        f"bo'lsa, javobingizni shu kontekstga tayangan holda tuz, lekin uni so'zma-so'z takrorlama."
    )


def _strip_html(text):
    return re.sub('<[^<]+?>', ' ', text)


def build_mentor_reply(user_message, profile, subject=None, allow_ai=True):
    """Builds a reply grounded in the real Lesson/Topic database and the profile's own
    weak-topic history, scoped to the subject the student is currently studying. When
    allow_ai is True and Groq is configured, an LLM answer is generated; otherwise (or on
    AI failure) it falls back to rule-based logic."""
    msg_lower = user_message.lower()
    subject_name = subject.name if subject else "tanlangan fan"

    if any(greet in msg_lower for greet in ['salom', 'assalomu', 'hello', 'hi ']):
        return (f"Assalomu alaykum! Men '{subject_name}' fani bo'yicha yordamchingizman. Istalgan mavzu "
                f"yoki tushuncha haqida yozing — o'qish materiallaridan tegishli ma'lumotni topib beraman.")

    words = [w for w in re.findall(r"[\w']+", msg_lower) if len(w) > 3 and w not in STOPWORDS]

    matched_lesson = None
    if words:
        query = Q()
        for w in words:
            query |= Q(title__icontains=w) | Q(content__icontains=w)
        lesson_qs = Lesson.objects.filter(query).select_related('topic')
        if subject:
            lesson_qs = lesson_qs.filter(topic__subject=subject)
        matched_lesson = lesson_qs.first()

    context_snippet = ""
    weak_topic = ""
    if matched_lesson:
        snippet = _strip_html(matched_lesson.content).strip()
        snippet = re.sub(r'\s+', ' ', snippet)
        if len(snippet) > 420:
            snippet = snippet[:420].rsplit(' ', 1)[0] + "..."
        context_snippet = f"'{matched_lesson.title}' ({matched_lesson.topic.title}) darsi: {snippet}"
    else:
        # No direct lesson match — personalize using the profile's real weak-topic history
        # within this subject.
        from tests_app.models import Attempt
        last_attempt = (Attempt.objects.filter(
            profile=profile, is_completed=True, ai_feedback__isnull=False)
            .exclude(ai_feedback__weak_topics__startswith="Yo'q"))
        if subject:
            last_attempt = last_attempt.filter(test__subject=subject)
        last_attempt = last_attempt.order_by('-completed_at').first()
        if last_attempt:
            weak_topic = last_attempt.ai_feedback.weak_topics.split(',')[0].strip()
            context_snippet = f"Foydalanuvchining so'nggi test natijasiga ko'ra kuchsiz mavzusi: '{weak_topic}'."

    if allow_ai:
        user_prompt = f"Kontekst: {context_snippet}\n\nSavol: {user_message}" if context_snippet else user_message
        ai_reply = ask_groq([
            {"role": "system", "content": _mentor_system_prompt(subject_name)},
            {"role": "user", "content": user_prompt},
        ])
        if ai_reply:
            return ai_reply.strip()

    # Groq unavailable/unconfigured — fall back to the rule-based reply
    if matched_lesson:
        return (f"{context_snippet}\n\n"
                f"To'liq darsni O'qish bo'limida '{matched_lesson.topic.title}' mavzusidan ko'rishingiz mumkin.")

    if weak_topic:
        lesson = Lesson.objects.filter(topic__title__icontains=weak_topic).first()
        if lesson:
            return (f"Bu mavzu bo'yicha aniq materialni topa olmadim, lekin so'nggi testingiz natijalariga ko'ra "
                    f"'{weak_topic}' mavzusida ko'proq mashq qilishingiz kerak. '{lesson.title}' darsini "
                    f"O'qish bo'limida ko'rib chiqishni tavsiya qilaman.")
        return (f"Bu mavzu bo'yicha aniq materialni topa olmadim. So'nggi testingiz natijalariga ko'ra "
                f"'{weak_topic}' mavzusida ko'proq mashq qilishingizni tavsiya qilaman.")

    return (f"Bu mavzu bo'yicha o'qish materiallarida aniq moslik topa olmadim. Aniqroq kalit so'z bilan "
            f"qayta so'rab ko'ring, yoki '{subject_name}' fanidan bir test yeching — shunda sizning "
            f"kuchsiz mavzularingizga qarab tavsiya bera olaman.")

def seed_learning_if_needed():
    """Seeds default educational materials if none exist.

    Guards on Lesson (this app's own content), not Topic — the tests_app also creates
    Topic rows independently, and guarding on a resource shared between the two apps
    meant whichever app seeded first would permanently block the other from ever seeding.
    """
    if Lesson.objects.exists():
        return

    t1, _ = Topic.objects.get_or_create(title="O'rta asrlar tarixi", defaults={"slug": "orta-asrlar-tarixi", "category": "history", "order": 1, "icon_name": "book-open"})
    t2, _ = Topic.objects.get_or_create(title="Milliy sertifikat tayyorgarligi", defaults={"slug": "milly-sertifikat-tarix", "category": "certificate", "order": 2, "icon_name": "award"})
    t3, _ = Topic.objects.get_or_create(title="BBA Tarix imtihoni", defaults={"slug": "bba-tarix-tayyorlov", "category": "bba", "order": 3, "icon_name": "compass"})
    
    # Topic 1 Lessons
    l1 = Lesson.objects.create(topic=t1, title="Temuriylar davlatining tashkil topishi", content="<p>1370-yilda Amir Temur Movarounnahr hukmdori deb e'lon qilindi va u parokanda bekliklar o'rniga yirik markazlashgan davlat barpo etishga kirishdi. Uning poytaxti etib Samarqand shahri tanlandi. Keyinchalik Amir Temur ulkan imperiya yaratdi va ilm-fan, madaniyat hamda me'morchilikning mislsiz rivojlanishiga sharoit yaratib berdi.</p>", order=1)
    VideoLesson.objects.create(lesson=l1, title="Amir Temur hayoti va janglari", video_url="https://www.youtube.com/watch?v=dQw4w9WgXcQ", duration_seconds=1455, order=1)
    AudioLesson.objects.create(lesson=l1, title="Temur tuzuklari va davlat boshqaruvi", audio_url="https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", duration_seconds=1115, order=1)
    Flashcard.objects.create(lesson=l1, front="Amir Temur nechanchi yilda Movarounnahr hukmdori bo'ldi?", back="1370-yilda")
    Flashcard.objects.create(lesson=l1, front="Amir Temur davlatining poytaxti qaysi shahar edi?", back="Samarqand shahri")

    l2 = Lesson.objects.create(topic=t1, title="Temuriylar davrida madaniy hayot", content="<p>Temuriylar davri Movarounnahr renessansi sifatida tanilgan. Bu davrda Ulug'bek rasadxonasi barpo etildi, astronomiya, matematika va geografiya fanlari yuksaldi. Shuningdek, Alisher Navoiy o'zining buyuk o'zbek asarlarini aynan shu davr yakunida yozdi.</p>", order=2)
    VideoLesson.objects.create(lesson=l2, title="Temuriylar renessansi va madaniyati", video_url="https://www.youtube.com/watch?v=dQw4w9WgXcQ", duration_seconds=1115, order=1)
    AudioLesson.objects.create(lesson=l2, title="Ulug'bek rasadxonasi va ilmiy kashfiyotlar", audio_url="https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3", duration_seconds=920, order=1)

    # Topic 2 Lessons
    l3 = Lesson.objects.create(topic=t2, title="Tarixiy manbashunoslik va arxeologiya", content="<p>Tarixiy manbalar ikki turga bo'linadi: yozma manbalar (barcha turdagi bitiklar, yilnomalar, hujjatlar) va moddiy manbalar (tangalar, uy-ro'zg'or buyumlari, arxeologik qazilmalar). Bular tarix fanining poydevori hisoblanadi.</p>", order=1)
    VideoLesson.objects.create(lesson=l3, title="Tarixiy manbalarni tasniflash", video_url="https://www.youtube.com/watch?v=dQw4w9WgXcQ", duration_seconds=1200, order=1)
    AudioLesson.objects.create(lesson=l3, title="Arxeologik topilmalar ahamiyati", audio_url="https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3", duration_seconds=900, order=1)

    # Topic 3 Lessons
    l4 = Lesson.objects.create(topic=t3, title="Jadidchilik harakati va ma'rifatparvarlar", content="<p>19-asr oxiri va 20-asr boshlarida Turkistonda jadidchilik harakati vujudga keldi. Ularning maqsadi yangi usuldagi maktablar ochish, milliy matbuotni rivojlantirish va millatni uyg'otish bo'lgan. Mahmudxo'ja Behbudiy, Abdulla Qodiriy va Fitrat ushbu oqimning yetakchilari bo'lgan.</p>", order=1)
    VideoLesson.objects.create(lesson=l4, title="Jadidlar jasorati va Turkiston jadidchiligi", video_url="https://www.youtube.com/watch?v=dQw4w9WgXcQ", duration_seconds=1510, order=1)
    AudioLesson.objects.create(lesson=l4, title="Behbudiyning ijtimoiy-siyosiy faoliyati", audio_url="https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3", duration_seconds=890, order=1)

def _resolve_subject(request):
    from tests_app.subject_utils import resolve_subject
    return resolve_subject(request)


@login_required
def center(request):
    seed_learning_if_needed()
    profile = request.user.profile
    subject, subjects = _resolve_subject(request)

    # Fetch categorized topics, scoped to the selected subject.
    # Bitta so'rov + bitta prefetch: sidebar'dagi har topic uchun alohida lesson
    # so'rovi (N+1) o'rniga. Prefetch faqat e'lon qilingan darslarni oladi —
    # ilgari template'da topic.lessons.all draft darslarni ham ko'rsatib yuborardi.
    topic_qs = Topic.objects.filter(subject=subject) if subject else Topic.objects.all()
    topics = list(topic_qs.prefetch_related(
        Prefetch('lessons', queryset=Lesson.objects.filter(is_published=True))
    ))
    history_topics = [t for t in topics if t.category == 'history']
    certificate_topics = [t for t in topics if t.category == 'certificate']
    bba_topics = [t for t in topics if t.category == 'bba']

    # Active tab and selected lesson (for detail review)
    active_tab = request.GET.get('tab', 'videos') # videos, audios, notes, flashcards
    selected_lesson_id = request.GET.get('lesson_id')

    # Get all lessons — only published ones are visible to students; teacher drafts stay hidden.
    all_lessons = Lesson.objects.filter(is_published=True)
    if subject:
        all_lessons = all_lessons.filter(topic__subject=subject)

    if selected_lesson_id:
        try:
            lesson_id_int = int(selected_lesson_id)
        except (ValueError, TypeError):
            raise Http404("Noto'g'ri dars identifikatori.")
        lesson = get_object_or_404(Lesson, id=lesson_id_int, is_published=True)
    else:
        lesson = all_lessons.first()
        
    # Check if this lesson is bookmarked
    is_bookmarked = Bookmark.objects.filter(profile=profile, lesson=lesson).exists() if lesson else False
    
    # Accumulate lesson metrics
    has_lessons_access = profile.has_active_premium_lessons
    all_videos = lesson.videos.all() if lesson else []
    all_audios = lesson.audios.all() if lesson else []
    flashcards = lesson.flashcards.all() if lesson else []

    # Premium video/audio content is never sent to the browser for non-subscribers,
    # not just hidden in the UI — this keeps the real URLs out of the page source too.
    if has_lessons_access:
        videos = list(all_videos)
        audios = list(all_audios)
        locked_videos_count = 0
        locked_audios_count = 0
    else:
        videos = [v for v in all_videos if not v.is_premium]
        audios = [a for a in all_audios if not a.is_premium]
        locked_videos_count = sum(1 for v in all_videos if v.is_premium)
        locked_audios_count = sum(1 for a in all_audios if a.is_premium)
    
    # Register "Read Lesson" mission increment (once per lesson per day)
    if lesson and request.method == 'GET' and 'lesson_id' in request.GET:
        import datetime
        today = datetime.date.today()
        today_str = today.isoformat()
        viewed_by_date = request.session.get('viewed_lessons', {})
        viewed_today = set(viewed_by_date.get(today_str, []))

        if lesson.id not in viewed_today:
            viewed_today.add(lesson.id)
            request.session['viewed_lessons'] = {today_str: list(viewed_today)}
            request.session.modified = True

            p_missions = ProfileMission.objects.filter(profile=profile, date=today, mission__action_type='lesson')
            for pm in p_missions:
                pm.current_count += 1
                if pm.current_count >= pm.mission.target_count:
                    if not pm.is_completed:
                        pm.is_completed = True
                        profile.add_xp(pm.mission.xp_reward)
                        profile.add_coins(pm.mission.coin_reward)
                        Notification.objects.create(
                            profile=profile,
                            title="Vazifa bajarildi!",
                            message=f"'{pm.mission.title}' vazifasi uchun +{pm.mission.xp_reward} XP va +{pm.mission.coin_reward} tanga oldingiz!",
                            type='mission'
                        )
                pm.save()
            
    return render(request, 'learning/center.html', {
        'history_topics': history_topics,
        'certificate_topics': certificate_topics,
        'bba_topics': bba_topics,
        'subjects': subjects,
        'selected_subject': subject,
        'lesson': lesson,
        'active_tab': active_tab,
        'is_bookmarked': is_bookmarked,
        'videos': videos,
        'audios': audios,
        'flashcards': flashcards,
        'profile': profile,
        'has_lessons_access': has_lessons_access,
        'locked_videos_count': locked_videos_count,
        'locked_audios_count': locked_audios_count,
    })

@login_required
def toggle_bookmark(request, lesson_id):
    profile = request.user.profile
    lesson = get_object_or_404(Lesson, id=lesson_id)
    
    bookmark, created = Bookmark.objects.get_or_create(profile=profile, lesson=lesson)
    if not created:
        bookmark.delete()
        active = False
    else:
        active = True
        
    if request.headers.get('HX-Request'):
        # Return HTMX dynamic button snippet to update UI state
        icon = 'bookmark'
        if active:
            color = 'text-yellow-500 fill-current'
            label = "Belgilangan"
        else:
            color = 'text-slate-400'
            label = "Belgilash"
            
        return HttpResponse(f"""
            <button hx-post="/learning/toggle-bookmark/{lesson.id}/" hx-target="this" hx-outerHTML="true" class="flex items-center gap-1.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-semibold py-2 px-4 rounded-xl transition text-xs">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-bookmark w-4 h-4 {color}"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>
                <span>{label}</span>
            </button>
        """)
        
    return redirect(f"/learning/?lesson_id={lesson.id}")

@login_required
def mentor(request):
    seed_learning_if_needed()
    profile = request.user.profile
    subject, subjects = _resolve_subject(request)

    # A separate conversation per subject, so switching subject gives a fresh, relevant
    # chat (and the right greeting) instead of a history-only thread.
    chat_key = f"mentor_chat_{subject.slug}" if subject else "mentor_chat"
    subject_name = subject.name if subject else "tanlangan fan"
    if chat_key not in request.session:
        request.session[chat_key] = [{
            'sender': 'ai',
            'message': f"Salom! Men '{subject_name}' fani bo'yicha AI Mentoringizman. "
                       f"Shu fandan istalgan mavzu yoki tushuncha haqida so'rang — batafsil tushuntiraman.",
        }]

    chat_history = request.session[chat_key]

    if request.method == 'POST':
        # Check if HTMX POST
        user_message = request.POST.get('message', '').strip()
        if user_message:
            # Append user message
            chat_history.append({'sender': 'user', 'message': user_message})

            allow_ai = _mentor_ai_allowed(request.user.id)
            ai_reply = build_mentor_reply(user_message, profile, subject=subject, allow_ai=allow_ai)

            chat_history.append({'sender': 'ai', 'message': ai_reply})
            request.session[chat_key] = chat_history
            request.session.modified = True

            # If HTMX request, return only the updated message bubbles fragment
            if request.headers.get('HX-Request'):
                # We return the new user bubble and the reply bubble
                return HttpResponse(f"""
                    <div class="flex justify-end animate-slideIn">
                        <div class="bg-[#2d6cff]/20 border border-[#2d6cff]/30 text-white rounded-2xl rounded-tr-none px-4 py-3.5 max-w-xs sm:max-w-md shadow-md text-sm">
                            {escape(user_message)}
                        </div>
                    </div>
                    <div class="flex gap-3 items-start animate-slideIn">
                        <div class="w-10 h-10 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center flex-shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-bot text-indigo-400"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
                        </div>
                        <div class="glass-card text-slate-300 rounded-2xl rounded-tl-none px-4 py-3.5 max-w-xs sm:max-w-md shadow-md text-sm leading-relaxed border border-white/5 bg-slate-900/30">
                            {escape(ai_reply).replace(chr(10), '<br>')}
                        </div>
                    </div>
                """)
                
    return render(request, 'learning/mentor.html', {
        'chat_history': chat_history,
        'profile': profile,
        'subjects': subjects,
        'selected_subject': subject,
    })
