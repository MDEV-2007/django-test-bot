import random
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.throttling import ScopedRateThrottle
from django.utils import timezone
from accounts.models import ensure_profile_for_user
from core.reward_caps import claim_daily_reward
from tests_app.models import Question, Subject
from .models import EssaySubmission, UserUsageQuota, LiveRepublicEvent
from .ai_grader import evaluate_open_question, evaluate_essay_bmb


class EvaluateOpenQuestionAPIView(APIView):
    """POST /api/growth/open-question/evaluate/
    36–44-topshiriqlar (qisqa ochiq javoblar) uchun Fuzzy + AI semantik baholagich.

    Har chaqiruv pullik Groq so'rovi — shuning uchun faqat tizimga kirganlar va kunlik
    limit bilan (ilgari anonim skript AI hisobini cheksiz yoqishi mumkin edi).
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        if not claim_daily_reward(request.user.id, 'open_question_ai'):
            return Response({'ok': False, 'error': "Bugungi AI baholash limiti tugadi. Ertaga qayta urinib ko'ring."},
                            status=status.HTTP_429_TOO_MANY_REQUESTS)
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
        if not claim_daily_reward(request.user.id, 'essay_ai'):
            return Response({'ok': False, 'error': "Bugungi AI esse tekshiruvi limiti tugadi. Ertaga qayta urinib ko'ring."},
                            status=status.HTTP_429_TOO_MANY_REQUESTS)

        is_vip = quota.is_vip()
        can_use = quota.can_use_essay()

        # VIP yoki bepul kreditni sarflayotgan o'quvchi to'liq tahlilni ko'radi. Ilgari
        # kredit sarflansa ham natija qulflangan qaytardi — "1 bepul AI esse tekshiruvi"
        # mukofoti amalda hech narsa bermasdi. Kredit ham, VIP ham bo'lmasa — ballar
        # ko'rinadi, xatolar ro'yxati qulflanadi.
        unlocked = is_vip or can_use
        eval_result = evaluate_essay_bmb(
            essay_text=essay_text,
            prompt_text=prompt_text,
            is_vip=unlocked
        )
        if eval_result is None:
            return Response({'ok': False, 'error': "AI tekshiruvi hozir ishlamayapti. Birozdan so'ng qayta urinib ko'ring."},
                            status=status.HTTP_503_SERVICE_UNAVAILABLE)

        # Kreditni sarflash (faqat haqiqiy baho berilganda)
        if not is_vip and can_use:
            quota.consume_essay_credit()
        if not unlocked:
            # Voronka: o'quvchi xatolar tahlili qulflanganini ko'rdi (esse paywall).
            from analytics.tracking import track_event
            track_event(profile, 'paywall_view', feature='essay')

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
        for q in selected:
            all_choices = list(q.choices.all())
            if len(all_choices) < 2 or not any(c.is_correct for c in all_choices):
                continue
            # Javob kaliti (`is_correct`) clientga yuborilmaydi — POST .../blitz/answer/ tekshiradi.
            choices = [{'id': c.id, 'text': c.text} for c in all_choices]
            # Shuffle choices
            random.shuffle(choices)
            idx = len(payload)
            payload.append({
                'index': idx + 1,
                'id': q.id,
                'body': q.body,
                'difficulty': q.difficulty,
                'topic': q.topic.title if q.topic else (q.subject.name if q.subject else "Umumiy"),
                'choices': choices,
            })

        session = None
        if payload and request.user and request.user.is_authenticated:
            from sprint.models import QuizSession
            from sprint.services import create_quiz_session
            session = create_quiz_session(request.user, QuizSession.MODE_BLITZ, [p['id'] for p in payload])

        return Response({
            'ok': True,
            'title': "7-Savollik Dofamin Blitz Diagnostika",
            'session_id': session.id if session else None,
            'total_questions': len(payload),
            'questions': payload,
            'tramplin_bonus': {
                'badge': "B+ Potensial (164.5 ball)",
                'reward_coins': 100,
                'next_step_route': "/sprint",
                'cta_text': "🚀 A darajaga chiqish: 3 daqiqalik 2-bosqichni boshlash (+100 Tanga Bonus)"
            }
        })


class BlitzAnswerAPIView(APIView):
    """POST /api/growth/onboarding/blitz/answer/
    Body: {session_id, question_id, choice_id}

    Blitz javobini serverda tekshiradi va natijani saqlaydi. Javob kaliti faqat
    javob yuborilgandan keyin (`correct_choice_id`) qaytadi. Blitz XP/tanga bermaydi;
    takroriy so'rov birinchi saqlangan natijani qaytaradi.
    """
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'quiz_answer'

    def post(self, request, *args, **kwargs):
        from sprint.models import QuizSession
        from sprint.services import QuizAnswerError, submit_quiz_answer
        try:
            result = submit_quiz_answer(
                request.user,
                QuizSession.MODE_BLITZ,
                request.data.get('session_id'),
                request.data.get('question_id'),
                request.data.get('choice_id'),
            )
        except QuizAnswerError as exc:
            return Response({'ok': False, 'error': exc.message, 'code': exc.code}, status=exc.status_code)
        return Response({
            'ok': True,
            'question_id': result['question_id'],
            'choice_id': result['selected_option_id'],
            'is_correct': result['is_correct'],
            'correct_choice_id': result['correct_option_id'],
            'duplicate': result['duplicate'],
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

