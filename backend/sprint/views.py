import time
import logging
import random
from django.conf import settings
from django.utils import timezone
from django.db import models
from django.db.models import F
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.throttling import ScopedRateThrottle

from .models import MistakeExplanationCache, UserMistakeNotebook
from .serializers import (
    ExplainMistakeInputSerializer,
    QuestionSprintSerializer,
    UserMistakeNotebookSerializer,
)
from .ai_service import generate_mistake_explanation
from .models import QuizSession
from .services import QuizAnswerError, create_quiz_session, submit_quiz_answer
from core.reward_caps import claim_daily_reward
from tests_app.models import Question, Subject

logger = logging.getLogger(__name__)


class SprintSubjectsAPIView(APIView):
    """GET /api/v1/sprint/subjects/
    Fokus sprinti uchun barcha fanlar va mavjud savollar sonini qaytaradi.
    """
    permission_classes = [AllowAny]

    def get(self, request, *args, **kwargs):
        subjects = Subject.objects.all().order_by('id')
        total_questions = Question.objects.filter(
            question_type__in=['single_choice', 'mcq', 'image_based', 'table_based']
        ).count()

        result = [
            {
                'id': 0,
                'name': 'Barcha fanlar (Aralash)',
                'slug': 'all',
                'questions_count': total_questions,
                'is_available': total_questions >= 5,
            }
        ]

        for s in subjects:
            count = Question.objects.filter(
                subject=s,
                question_type__in=['single_choice', 'mcq', 'image_based', 'table_based']
            ).count()
            result.append({
                'id': s.id,
                'name': s.name,
                'slug': s.slug,
                'questions_count': count,
                'is_available': count >= 5,
            })

        return Response({
            'ok': True,
            'subjects': result,
        })


class ExplainMistakeAPIView(APIView):
    """POST /api/v1/sprint/explain-mistake/

    Fokus Sprintida xato qilinganda Zero-Effort Lazy AI Caching arxitekturasi:
    - 1-qadam (Cache Check): PostgreSQL jadvalida (question_id, selected_option_id) bormi?
    - 2-qadam (Cache Hit): 0.01 soniyada (0 so'm xarajat bilan) tayyor JSON qaytadi.
    - 3-qadam (Cache Miss): LLM orqali yaratilib, bazaga saqlanadi va qaytariladi.

    Faqat tizimga kirganlar uchun: cache miss pullik LLM so'rovi, va xato o'quvchining
    "Xatolar daftari"ga yozilishi uchun foydalanuvchi ma'lum bo'lishi kerak.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        start_time = time.time()
        serializer = ExplainMistakeInputSerializer(data=request.data)
        if not serializer.is_valid():
            logger.warning("ExplainMistake validation error: %s", serializer.errors)
            return Response({'ok': False, 'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        question_id = data['question_id']
        selected_option_id = data['selected_option_id']
        selected_option_text = data.get('selected_option_text') or ''
        correct_option_id = data.get('correct_option_id')
        correct_option_text = data.get('correct_option_text') or ''
        question_body = data.get('question_body') or ''
        topic_title = data.get('topic_title') or ''

        if question_id > 0:
            # Haqiqiy savol uchun matnlar faqat bazadan olinadi. Ilgari client yuborgan
            # `correct_option_text`/`question_body` LLMga berilib, natija hamma uchun
            # umumiy keshga yozilardi (kesh "zaharlanishi").
            q_obj = (Question.objects.select_related('topic', 'subject')
                     .prefetch_related('choices').filter(pk=question_id).first())
            if q_obj is None:
                return Response({'ok': False, 'error': "Savol topilmadi."}, status=status.HTTP_404_NOT_FOUND)
            choices = list(q_obj.choices.all())
            sel_opt = next((c for c in choices if c.id == selected_option_id), None)
            if sel_opt is None:
                return Response({'ok': False, 'error': "Tanlangan variant bu savolga tegishli emas."},
                                status=status.HTTP_400_BAD_REQUEST)
            if sel_opt.is_correct:
                return Response({'ok': False, 'error': "Bu variant to'g'ri javob — tushuntirish kerak emas."},
                                status=status.HTTP_400_BAD_REQUEST)
            # Tushuntirish to'g'ri javobni ochib beradi: faqat shu savolda haqiqatan xato
            # qilgan (server qayd etgan) foydalanuvchiga beriladi — javob berishdan oldin
            # kalitni olib qo'yish mumkin bo'lmasin.
            if not UserMistakeNotebook.objects.filter(user=request.user, question_id=question_id).exists():
                return Response({'ok': False, 'error': "Avval savolga javob bering."},
                                status=status.HTTP_403_FORBIDDEN)
            corr_opt = next((c for c in choices if c.is_correct), None)
            question_body = q_obj.body
            topic_title = q_obj.topic.title if q_obj.topic else (q_obj.subject.name if q_obj.subject else "")
            selected_option_text = sel_opt.text
            correct_option_id = corr_opt.id if corr_opt else None
            correct_option_text = corr_opt.text if corr_opt else ''

        # ─── 1-QADAM: Cache Check (PostgreSQL) ────────────────────────
        cached_entry = None
        if question_id > 0:
            cached_entry = MistakeExplanationCache.objects.filter(
                question_id=question_id,
                selected_option_id=selected_option_id
            ).first()

            # Agar keshdagi yozuv eski xato fallback bo'lsa, uni o'chirib haqiqiy AI bilan yangilaymiz!
            if cached_entry and ("bu savol mantiqiga to'g'ri kelmaydi" in (cached_entry.why_wrong or '') or "bilan mustahkamlang" in (cached_entry.memory_hack or '')):
                cached_entry.delete()
                cached_entry = None

        if cached_entry:
            # Hit countni yangilash
            MistakeExplanationCache.objects.filter(pk=cached_entry.pk).update(hit_count=F('hit_count') + 1)
            cached_entry.refresh_from_db(fields=['hit_count'])

            latency_ms = int((time.time() - start_time) * 1000)
            return Response({
                'ok': True,
                'cached': True,
                'latency_ms': latency_ms,
                'data': {
                    'question_id': cached_entry.question_id,
                    'selected_option_id': cached_entry.selected_option_id,
                    'why_wrong': cached_entry.why_wrong,
                    'memory_hack': cached_entry.memory_hack,
                    'hit_count': cached_entry.hit_count,
                    'model_name': cached_entry.model_name,
                }
            })

        # ─── 2-QADAM: Cache Miss -> pullik LLM so'rovi, kunlik limit bilan ───
        if not claim_daily_reward(request.user.id, 'sprint_explain_ai'):
            latency_ms = int((time.time() - start_time) * 1000)
            return Response({
                'ok': True,
                'cached': False,
                'latency_ms': latency_ms,
                'data': {
                    'question_id': question_id,
                    'selected_option_id': selected_option_id,
                    'why_wrong': f"Siz tanlagan \"{selected_option_text or 'variant'}\" to'g'ri javob emas.",
                    'memory_hack': f"To'g'ri javob: \"{correct_option_text or '-'}\".",
                    'hit_count': 0,
                    'model_name': 'limit',
                },
            })

        # ─── 3-QADAM: LLM orqali yangi layfxak generatsiya qilish ─────
        ai_result = generate_mistake_explanation(
            question_body=question_body,
            selected_option_text=selected_option_text,
            selected_option_id=selected_option_id,
            correct_option_text=correct_option_text,
            correct_option_id=correct_option_id,
            topic_title=topic_title
        )

        why_wrong = ai_result.get('why_wrong', '')
        memory_hack = ai_result.get('memory_hack', '')
        is_fallback = ai_result.get('is_fallback', False)

        # ─── 4-QADAM: Bazaga saqlash (FAQAT haqiqiy AI yaratgan va ID haqiqiy bo'lsa keshlaymiz) ───
        if not is_fallback and question_id > 0:
            try:
                created_cache, _ = MistakeExplanationCache.objects.update_or_create(
                    question_id=question_id,
                    selected_option_id=selected_option_id,
                    defaults={
                        'selected_option_text': (selected_option_text or '')[:500],
                        'why_wrong': why_wrong,
                        'memory_hack': memory_hack,
                        'hit_count': 1,
                        'model_name': getattr(settings, 'GROQ_MODEL', 'qwen/qwen3.8-27b'),
                        # `is_ai_generated` modelda yo'q edi: update_or_create har safar
                        # FieldError berib, kesh hech qachon saqlanmasdi (har xato = LLM chaqiruvi).
                    }
                )
            except Exception as e:
                logger.error(f"MistakeExplanationCache saqlashda xatolik: {e}")

        latency_ms = int((time.time() - start_time) * 1000)
        return Response({
            'ok': True,
            'cached': False,
            'latency_ms': latency_ms,
            'data': {
                'question_id': question_id,
                'selected_option_id': selected_option_id,
                'why_wrong': why_wrong,
                'memory_hack': memory_hack,
                'hit_count': 1,
                'model_name': getattr(settings, 'GROQ_MODEL', 'qwen/qwen3.8-27b'),
            }
        })


class ResolveRevengeMistakeAPIView(APIView):
    """POST /api/v1/sprint/resolve-revenge/

    Qasos savoli to'g'ri yechilganda o'quvchining Xatolar Daftarchasidagi xatoni
    avtomatik yechildi (is_resolved = True) deb belgilaydi.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        raw_id = request.data.get('question_id')
        if not raw_id:
            return Response({'ok': False, 'error': 'question_id kiritilishi shart'}, status=400)

        val_str = str(raw_id).strip()
        if val_str.startswith('revenge_'):
            parts = val_str.split('_')
            if len(parts) >= 2 and parts[1].isdigit():
                val_str = parts[1]

        try:
            target_id = int(val_str)
        except (ValueError, TypeError):
            target_id = 0

        updated_count = 0
        if target_id > 0:
            updated_count = UserMistakeNotebook.objects.filter(
                user=request.user,
                question_id=target_id
            ).update(
                is_resolved=True,
                resolved_at=timezone.now(),
                revenge_attempts_count=F('revenge_attempts_count') + 1
            )

        return Response({
            'ok': True,
            'resolved': updated_count > 0,
            'question_id': target_id,
        })


class SprintQuestionsAPIView(APIView):
    """GET /api/v1/sprint/questions/?count=10&subject_id=1
    Fokus Sprinti uchun bazadan tasodifiy 5-30 ta variantli savollarni yuklaydi.

    Har chaqiruv foydalanuvchi uchun yangi `QuizSession` yaratadi. Javob kaliti
    (`correct_option_id`) qaytarilmaydi — javob POST /answer/ orqali serverda tekshiriladi.
    """
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'quiz_session'

    def get(self, request, *args, **kwargs):
        try:
            count = min(30, max(5, int(request.query_params.get('count', 10))))
        except (ValueError, TypeError):
            count = 10
        raw_subject_id = request.query_params.get('subject_id')
        raw_topic_id = request.query_params.get('topic_id')

        try:
            subject_id = int(raw_subject_id) if raw_subject_id else 0
        except (ValueError, TypeError):
            subject_id = 0

        try:
            topic_id = int(raw_topic_id) if raw_topic_id else 0
        except (ValueError, TypeError):
            topic_id = 0

        qs = Question.objects.select_related('topic', 'subject').prefetch_related('choices').filter(
            question_type__in=['single_choice', 'mcq', 'image_based', 'table_based']
        )
        if topic_id > 0:
            topic_qs = qs.filter(topic_id=topic_id)
            if topic_qs.count() >= count:
                qs = topic_qs
            else:
                # Agar shu mavzuda savollar oz bo'lsa, mavzuni to'liq olib, qolganini shu fandan to'ldiramiz
                from tests_app.models import Topic
                topic_obj = Topic.objects.filter(id=topic_id).first()
                if topic_obj and topic_obj.subject_id:
                    extra_qs = qs.filter(subject_id=topic_obj.subject_id).exclude(topic_id=topic_id)
                    qs = topic_qs | extra_qs
                else:
                    qs = topic_qs or qs
        elif subject_id > 0:
            qs = qs.filter(subject_id=subject_id)

        total_available = qs.count()
        # Agar tanlangan fanda kam savol bo'lsa ham qolganlarini qaytaramiz
        if total_available == 0 and (subject_id > 0 or topic_id > 0):
            # Agar umuman test bo'lmasa, aralashdan olamiz
            qs = Question.objects.select_related('topic', 'subject').prefetch_related('choices').filter(
                question_type__in=['single_choice', 'mcq', 'image_based', 'table_based']
            )
            total_available = qs.count()

        if total_available == 0:
            return Response({'ok': True, 'count': 0, 'questions': [], 'session_id': None})

        all_ids = list(qs.values_list('id', flat=True))
        selected_ids = random.sample(all_ids, min(count, len(all_ids)))

        questions = qs.filter(id__in=selected_ids)
        result = []
        for q in questions:
            choices = sorted(q.choices.all(), key=lambda c: c.id)
            if len(choices) < 2:
                continue
            if not any(c.is_correct for c in choices):
                continue
            topic_str = q.topic.title if q.topic else (q.subject.name if q.subject else "Umumiy Tayyorgarlik")
            result.append({
                'id': q.id,
                'body': q.body,
                'topic_title': topic_str,
                'difficulty': q.difficulty,
                'options': [{'id': c.id, 'text': c.text} for c in choices],
            })

        session = None
        if result:
            session = create_quiz_session(request.user, QuizSession.MODE_SPRINT, [q['id'] for q in result])

        return Response({
            'ok': True,
            'count': len(result),
            'session_id': session.id if session else None,
            'expires_at': session.expires_at.isoformat() if session else None,
            'questions': result,
        })


class SprintAnswerAPIView(APIView):
    """POST /api/v1/sprint/answer/
    Body: {session_id, question_id, option_id, revenge?: bool}

    Javobni serverda tekshiradi. To'g'ri variant faqat shu javobdan keyin qaytadi.
    Bir savolga birinchi javob bir marta yoziladi (takroriy/parallel so'rov idempotent).
    """
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'quiz_answer'

    def post(self, request, *args, **kwargs):
        revenge = request.data.get('revenge') in (True, 'true', 'True', '1', 1)
        try:
            result = submit_quiz_answer(
                request.user,
                QuizSession.MODE_SPRINT,
                request.data.get('session_id'),
                request.data.get('question_id'),
                request.data.get('option_id'),
                revenge=revenge,
            )
        except QuizAnswerError as exc:
            return Response({'ok': False, 'error': exc.message, 'code': exc.code}, status=exc.status_code)
        return Response({'ok': True, **result})
