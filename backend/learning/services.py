import re
import time
from datetime import date
from django.core.cache import cache
from django.db.models import Q
from core.ai_client import ask_groq
from .models import Topic, Lesson, VideoLesson, AudioLesson, Flashcard

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


# Separate from the daily cost cap above: bounds how many mentor requests one user can fire
# per minute, so a single user (or a script) can't hold many concurrent Groq streaming
# connections open at once and starve the worker pool for everyone else under real traffic.
MENTOR_RATE_LIMIT_PER_MIN = 8


def _mentor_rate_limited(user_id):
    key = f"mentor_rate:{user_id}:{int(time.time() // 60)}"
    try:
        count = cache.incr(key)
    except ValueError:
        cache.set(key, 1, 65)
        count = 1
    return count > MENTOR_RATE_LIMIT_PER_MIN

STOPWORDS = {
    'va', 'bu', 'bir', 'uchun', 'haqida', 'nima', 'qanday', 'kim', 'qachon',
    'the', 'is', 'a', 'an', 'of', 'in', 'on', 'about', 'what', 'who', 'when',
    'menga', 'mening', 'sizga', 'iltimos', 'ayting', 'gapiring', 'tushuntiring',
}

def _mentor_system_prompt(subject_name):
    return (
        f"Sen IlmIldizi ta'lim ilovasidagi AI Mentorsan. Foydalanuvchi hozir '{subject_name}' "
        f"fanini o'rganyapti — asosan shu fan bo'yicha, Milliy sertifikat va imtihonlarga "
        f"tayyorgarlik yuzasidan yordam berasan. Faqat o'zbek tilida, aniq va qisqa (3-6 gap) "
        f"javob ber. Agar foydalanuvchi xabarida 'Kontekst:' bilan boshlangan qism berilgan "
        f"bo'lsa, javobingizni shu kontekstga tayangan holda tuz, lekin uni so'zma-so'z takrorlama. "
        f"Sana, ism va raqamlarni faqat aniq bilsang yoz; ishonching komil bo'lmasa, taxminiy "
        f"raqam o'ylab topma — o'rniga 'aniq sanani darslikdan tekshiring' deb ayt. Noto'g'ri "
        f"fakt imtihonga tayyorlanayotgan o'quvchi uchun javob bermaslikdan ko'ra yomonroq."
    )


def _strip_html(text):
    return re.sub('<[^<]+?>', ' ', text)


def _greeting_reply(subject_name):
    return (f"Assalomu alaykum! Men '{subject_name}' fani bo'yicha yordamchingizman. Istalgan mavzu "
            f"yoki tushuncha haqida yozing — o'qish materiallaridan tegishli ma'lumotni topib beraman.")


def _build_mentor_context(user_message, profile, subject):
    """Lesson-match + weak-topic lookup shared by build_mentor_reply (non-streaming
    fallback) and the streaming view — factored out so both build the exact same
    prompt instead of duplicating this logic."""
    msg_lower = user_message.lower()
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

    return matched_lesson, context_snippet, weak_topic


def build_mentor_reply(user_message, profile, subject=None, allow_ai=True):
    """Builds a reply grounded in the real Lesson/Topic database and the profile's own
    weak-topic history, scoped to the subject the student is currently studying. When
    allow_ai is True and Groq is configured, an LLM answer is generated; otherwise (or on
    AI failure) it falls back to rule-based logic."""
    msg_lower = user_message.lower()
    subject_name = subject.name if subject else "tanlangan fan"

    if any(greet in msg_lower for greet in ['salom', 'assalomu', 'hello', 'hi ']):
        return _greeting_reply(subject_name)

    matched_lesson, context_snippet, weak_topic = _build_mentor_context(user_message, profile, subject)

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







