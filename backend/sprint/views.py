import logging
import time
from django.utils import timezone
from django.db.models import F
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated

from .models import MistakeExplanationCache, UserMistakeNotebook
from .serializers import (
    ExplainMistakeInputSerializer,
    MistakeExplanationCacheSerializer,
)
from .ai_service import generate_mistake_explanation
from tests_app.models import Question, AnswerOption

logger = logging.getLogger(__name__)


class ExplainMistakeAPIView(APIView):
    """POST /api/v1/sprint/explain-mistake/

    Zero-Effort Lazy AI Caching Endpoint:
    - 1-qadam (Cache Check): PostgreSQL jadvalida (question_id, selected_option_id) bormi?
    - 2-qadam (Cache Hit): 0.01 soniyada (0 so'm xarajat bilan) tayyor JSON qaytadi.
    - 3-qadam (Cache Miss): LLM orqali yaratilib, bazaga saqlanadi va qaytariladi.
    """
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        start_time = time.time()
        serializer = ExplainMistakeInputSerializer(data=request.data)
        if not serializer.is_valid():
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
        cached_entry = MistakeExplanationCache.objects.filter(
            question_id=question_id,
            selected_option_id=selected_option_id
        ).first()

        if cached_entry:
            # Hit countni yangilash
            MistakeExplanationCache.objects.filter(pk=cached_entry.pk).update(hit_count=F('hit_count') + 1)
            cached_entry.refresh_from_db(fields=['hit_count'])

            # Agar foydalanuvchi tizimga kirgan bo'lsa, Xatolar Daftarchasiga yozish
            if request.user.is_authenticated:
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
        if not question_body or not correct_option_text:
            try:
                q_obj = Question.objects.select_related('topic', 'test').prefetch_related('options').get(pk=question_id)
                if not question_body:
                    question_body = q_obj.body
                if not topic_title:
                    topic_title = q_obj.topic.title if q_obj.topic else (q_obj.test.title if q_obj.test else "")

                if not selected_option_text:
                    sel_opt = q_obj.options.filter(pk=selected_option_id).first()
                    if sel_opt:
                        selected_option_text = sel_opt.text

                if not correct_option_text:
                    corr_opt = q_obj.options.filter(is_correct=True).first()
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

        # ─── 4-QADAM: Bazaga saqlash (Keyingi 10,000 talabgor uchun kesh) ───
        try:
            created_cache, _ = MistakeExplanationCache.objects.get_or_create(
                question_id=question_id,
                selected_option_id=selected_option_id,
                defaults={
                    'selected_option_text': selected_option_text[:500],
                    'why_wrong': why_wrong,
                    'memory_hack': memory_hack,
                    'hit_count': 1,
                    'model_name': "groq/llama-3.3-70b-versatile",
                }
            )
        except Exception as e:
            logger.error(f"MistakeExplanationCache saqlashda xatolik: {e}")
            created_cache = None

        # Foydalanuvchi xatolar daftariga qayd etish
        if request.user.is_authenticated:
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
                'model_name': "groq/llama-3.3-70b-versatile",
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
        question_id = request.data.get('question_id')
        if not question_id:
            return Response({'ok': False, 'error': 'question_id kiritilishi shart'}, status=400)

        updated_count = UserMistakeNotebook.objects.filter(
            user=request.user,
            question_id=question_id
        ).update(
            is_resolved=True,
            resolved_at=timezone.now(),
            revenge_attempts_count=F('revenge_attempts_count') + 1
        )

        return Response({
            'ok': True,
            'resolved': updated_count > 0,
            'question_id': question_id,
        })

