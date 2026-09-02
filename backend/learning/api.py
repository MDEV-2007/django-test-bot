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
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.views import APIView

from core.ai_client import ask_groq_stream
from tests_app.models import Subject
from tests_app.subject_utils import resolve_subject

from .models import Bookmark, Lesson, Topic
from .services import (
    _build_mentor_context, _greeting_reply, _mentor_ai_allowed, _mentor_rate_limited,
    _mentor_system_prompt, build_mentor_reply, seed_learning_if_needed,
)


class MentorStreamAPI(APIView):
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
