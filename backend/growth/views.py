import random
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.utils import timezone
from accounts.models import ensure_profile_for_user
from tests_app.models import Question, Subject
from .models import EssaySubmission, UserUsageQuota, LiveRepublicEvent
from .ai_grader import evaluate_open_question, evaluate_essay_bmb


class EvaluateOpenQuestionAPIView(APIView):
    """POST /api/growth/open-question/evaluate/
    36–44-topshiriqlar (qisqa ochiq javoblar) uchun Fuzzy + AI semantik baholagich.
    """
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        question_id = request.data.get('question_id')
        student_answer = (request.data.get('student_answer') or '').strip()
        reference_answer = (request.data.get('reference_answer') or '').strip()

        question_body = ""
        accepted_list = []

        if question_id:
            try:
                q = Question.objects.prefetch_related('accepted_answers').get(pk=question_id)
                question_body = q.body
                if not reference_answer and hasattr(q, 'explanation'):
                    reference_answer = q.explanation or ""
                accepted_list = [a.text for a in q.accepted_answers.all()]
                if not reference_answer and accepted_list:
                    reference_answer = accepted_list[0]
            except Question.DoesNotExist:
                pass

        if not student_answer:
            return Response({
                'ok': False,
                'is_correct': False,
                'score_pct': 0,
                'feedback': "Javob kiritilmadi."
            }, status=status.HTTP_400_BAD_REQUEST)

        eval_result = evaluate_open_question(
            student_answer=student_answer,
            reference_answer=reference_answer,
            question_body=question_body,
            accepted_alternatives=accepted_list
        )

        return Response({
            'ok': True,
            'data': eval_result
        })


class EvaluateEssayAPIView(APIView):
    """POST /api/growth/essay/evaluate/
    45-topshiriq (Esse) uchun rasmiy BMB 75 ballik baholash + VIP Paywall.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        profile = ensure_profile_for_user(request.user)
        quota, _ = UserUsageQuota.objects.get_or_create(profile=profile)
        quota.check_and_reset_daily()

        prompt_text = (request.data.get('prompt_text') or '').strip()
        essay_text = (request.data.get('essay_text') or '').strip()
        question_id = request.data.get('question_id')

        if not essay_text:
            return Response({'ok': False, 'error': "Esse matni kiritilmadi."}, status=400)

        is_vip = quota.is_vip()
        can_use = quota.can_use_essay()

        # Agar bepul limit tugagan bo'lsa va VIP bo'lmasa:
        # Ballar hisoblanadi, lekin is_locked=True bilan xiralashtiriladi (Blur)
        eval_result = evaluate_essay_bmb(
            essay_text=essay_text,
            prompt_text=prompt_text,
            is_vip=is_vip
        )

        # Kreditni sarflash
        if not is_vip and can_use:
            quota.consume_essay_credit()

        # Bazaga saqlash
        q_obj = None
        if question_id:
            q_obj = Question.objects.filter(pk=question_id).first()

        submission = EssaySubmission.objects.create(
            student=profile,
            question=q_obj,
            prompt_text=prompt_text,
            essay_text=essay_text,
            word_count=eval_result['word_count'],
            mazmun_ball=eval_result['mazmun_ball'],
            mantiq_uslub_ball=eval_result['mantiq_uslub_ball'],
            savodxonlik_ball=eval_result['savodxonlik_ball'],
            total_ball=eval_result['total_ball'],
            summary_feedback=eval_result['summary_feedback'],
            strengths=eval_result['strengths'],
            weaknesses=eval_result['weaknesses'],
            errors_list=eval_result['errors_list'],
            is_locked=eval_result['is_locked']
        )

        return Response({
            'ok': True,
            'submission_id': submission.id,
            'data': eval_result,
            'quota': {
                'free_essay_credits': quota.free_essay_credits,
                'is_vip': is_vip,
            }
        })


class AdaptiveOnboardingAPIView(APIView):
    """GET /api/growth/onboarding-blitz/
    Yangi ro'yxatdan o'tgan o'quvchilar uchun 7-savollik Dofamin Blitz to'plami.
    1-4: EASY (dofamin), 5-6: MEDIUM, 7: HARD (zaif nuqtani aniqlash).
    """
    permission_classes = [AllowAny]

    def get(self, request, *args, **kwargs):
        subject_slug = request.GET.get('subject', '')
        q_base = Question.objects.filter(
            question_type__in=Question.SINGLE_ANSWER_TYPES
        ).select_related('topic', 'subject').prefetch_related('choices')

        if subject_slug:
            q_base = q_base.filter(subject__slug=subject_slug)

        easy_qs = list(q_base.filter(difficulty='easy')[:30])
        med_qs = list(q_base.filter(difficulty='medium')[:20])
        hard_qs = list(q_base.filter(difficulty='hard')[:15])

        # Agar yetarli bo'lmasa, mavjud savollardan to'ldiramiz
        if len(easy_qs) < 4:
            easy_qs = list(q_base[:30])
        if len(med_qs) < 2:
            med_qs = easy_qs
        if len(hard_qs) < 1:
            hard_qs = med_qs

        selected = []
        selected.extend(random.sample(easy_qs, min(4, len(easy_qs))))
        selected.extend(random.sample(med_qs, min(2, len(med_qs))))
        selected.extend(random.sample(hard_qs, min(1, len(hard_qs))))

        payload = []
        for idx, q in enumerate(selected):
            choices = [{'id': c.id, 'text': c.text, 'is_correct': c.is_correct} for c in q.choices.all()]
            # Shuffle choices
            random.shuffle(choices)
            payload.append({
                'index': idx + 1,
                'id': q.id,
                'body': q.body,
                'difficulty': q.difficulty,
                'topic': q.topic.title if q.topic else (q.subject.name if q.subject else "Umumiy"),
                'choices': choices,
            })

        return Response({
            'ok': True,
            'title': "7-Savollik Dofamin Blitz Diagnostika",
            'total_questions': len(payload),
            'questions': payload,
            'tramplin_bonus': {
                'badge': "B+ Potensial (164.5 ball)",
                'reward_coins': 100,
                'next_step_route': "/sprint",
                'cta_text': "🚀 A darajaga chiqish: 3 daqiqalik 2-bosqichni boshlash (+100 Tanga Bonus)"
            }
        })


class UserGrowthStatusAPIView(APIView):
    """GET /api/growth/status/
    Foydalanuvchi kvotalari, VIP statusi va 20:30 Jonli Turnir banneri ma'lumotlari.
    """
    permission_classes = [AllowAny]

    def get(self, request, *args, **kwargs):
        is_auth = request.user and request.user.is_authenticated
        quota_data = {
            'free_essay_credits': 1,
            'daily_ai_mentor_credits': 5,
            'is_vip': False,
        }
        if is_auth:
            profile = ensure_profile_for_user(request.user)
            quota, _ = UserUsageQuota.objects.get_or_create(profile=profile)
            quota.check_and_reset_daily()
            quota_data = {
                'free_essay_credits': quota.free_essay_credits,
                'daily_ai_mentor_credits': quota.daily_ai_mentor_credits,
                'is_vip': quota.is_vip(),
            }

        # Bugungi 20:30 Jonli Respublika Turniri ma'lumoti
        now = timezone.now()
        today = timezone.localdate()
        target_2030 = timezone.make_aware(timezone.datetime.combine(today, timezone.datetime.min.time().replace(hour=20, minute=30)))

        live_event = LiveRepublicEvent.objects.filter(
            scheduled_time__date=today
        ).first()

        event_data = None
        if live_event:
            event_data = {
                'id': live_event.id,
                'title': live_event.title,
                'scheduled_time': live_event.scheduled_time.isoformat(),
                'status': live_event.status,
                'participants_count': live_event.participants_count,
                'rewards_description': live_event.rewards_description,
                'is_lobby_open': live_event.status in ['lobby', 'active'],
            }
        else:
            event_data = {
                'title': "20:30 Jonli Respublika Sprinti",
                'scheduled_time': target_2030.isoformat(),
                'status': 'scheduled',
                'participants_count': 128,
                'rewards_description': "👑 Top-3 g'olibga 1 haftalik VIP va +500 Tanga!",
                'is_lobby_open': False,
            }

        return Response({
            'ok': True,
            'quota': quota_data,
            'live_event': event_data
        })

