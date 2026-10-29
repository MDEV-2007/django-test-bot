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

from .models import MistakeExplanationCache, UserMistakeNotebook
from .serializers import (
    ExplainMistakeInputSerializer,
    QuestionSprintSerializer,
    UserMistakeNotebookSerializer,
)
from .ai_service import generate_mistake_explanation
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
    """
    permission_classes = [AllowAny]

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

            # Agar foydalanuvchi tizimga kirgan bo'lsa, Xatolar Daftarchasiga yozish
            if request.user.is_authenticated and question_id > 0:
                self._record_user_mistake(request.user, question_id, selected_option_id)

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

        # ─── 2-QADAM: Cache Miss -> Bazadan savol va to'g'ri variantni to'ldirish ───
        if (not question_body or not correct_option_text) and question_id > 0:
            try:
                q_obj = Question.objects.select_related('topic', 'subject').prefetch_related('choices').get(pk=question_id)
                if not question_body:
                    question_body = q_obj.body
                if not topic_title:
                    topic_title = q_obj.topic.title if q_obj.topic else (q_obj.subject.name if q_obj.subject else "")

                if not selected_option_text:
                    sel_opt = q_obj.choices.filter(pk=selected_option_id).first()
                    if sel_opt:
                        selected_option_text = sel_opt.text

                if not correct_option_text:
                    corr_opt = q_obj.choices.filter(is_correct=True).first()
                    if corr_opt:
                        correct_option_id = corr_opt.id
                        correct_option_text = corr_opt.text
            except Question.DoesNotExist:
                pass

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
                        'is_ai_generated': True,
                    }
                )
            except Exception as e:
                logger.error(f"MistakeExplanationCache saqlashda xatolik: {e}")

        # Foydalanuvchi xatolar daftariga qayd etish
        if request.user.is_authenticated and question_id > 0:
            self._record_user_mistake(request.user, question_id, selected_option_id)

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

    def _record_user_mistake(self, user, question_id, selected_option_id):
        try:
            UserMistakeNotebook.objects.update_or_create(
                user=user,
                question_id=question_id,
                defaults={
                    'failed_option_id': selected_option_id,
                    'is_resolved': False,
                }
            )
        except Exception as e:
            logger.debug(f"UserMistakeNotebook yozishda xatolik: {e}")


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
    Fokus Sprinti uchun bazadan tasodifiy 10-30 ta variantli savollarni yuklaydi.
    """
    permission_classes = [AllowAny]

    def get(self, request, *args, **kwargs):
        count = min(30, max(5, int(request.query_params.get('count', 10))))
        raw_subject_id = request.query_params.get('subject_id')

        try:
            subject_id = int(raw_subject_id) if raw_subject_id else 0
        except (ValueError, TypeError):
            subject_id = 0

        qs = Question.objects.select_related('topic', 'subject').prefetch_related('choices').filter(
            question_type__in=['single_choice', 'mcq', 'image_based', 'table_based']
        )
        if subject_id > 0:
            qs = qs.filter(subject_id=subject_id)

        total_available = qs.count()
        # Agar tanlangan fanda kam savol bo'lsa ham qolganlarini qaytaramiz
        if total_available == 0 and subject_id > 0:
            # Agar tanlangan fanda umuman test bo'lmasa, aralashdan olamiz
            qs = Question.objects.select_related('topic', 'subject').prefetch_related('choices').filter(
                question_type__in=['single_choice', 'mcq', 'image_based', 'table_based']
            )
            total_available = qs.count()

        if total_available == 0:
            return Response({'ok': True, 'count': 0, 'questions': []})

        all_ids = list(qs.values_list('id', flat=True))
        selected_ids = random.sample(all_ids, min(count, len(all_ids)))

        questions = qs.filter(id__in=selected_ids)
        result = []
        for q in questions:
            choices = list(q.choices.all().order_by('id'))
            if len(choices) < 2:
                continue
            corr = next((c for c in choices if c.is_correct), None)
            if not corr:
                continue
            topic_str = q.topic.title if q.topic else (q.subject.name if q.subject else "Umumiy Tayyorgarlik")
            result.append({
                'id': q.id,
                'body': q.body,
                'topic_title': topic_str,
                'correct_option_id': corr.id,
                'difficulty': q.difficulty,
                'options': [{'id': c.id, 'text': c.text} for c in choices],
            })

        return Response({
            'ok': True,
            'count': len(result),
            'questions': result,
        })
