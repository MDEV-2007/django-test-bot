"""JSON API mirroring tests_app/views.py for the Next.js frontend — see accounts/api.py
for the overall JWT-API pattern. Each endpoint here reuses the exact same helpers/queries
as its template-based counterpart; only the response shape (JSON vs render()) differs.
Grading stays server-only: is_correct is never sent back until finish()/feedback()."""
from django.conf import settings
from django.core.paginator import Paginator
from django.http import Http404, HttpResponse
from django.db.models import Avg, Count, F, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.decorators import (
    api_view, authentication_classes, permission_classes,
)
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from accounts.models import ensure_profile_for_user
from .models import (
    AIFeedback, AnswerOption, Attempt, AttemptAnswer, GroupOption, Question,
    RevisionItem, Subject, TestSet,
)
from .subject_utils import resolve_subject as _resolve_subject
from .feedback import _dispatch_ai_feedback, seed_questions_if_needed
from .services.grading import grade_open_answers
from core.ai_client import ask_groq


def _test_payload(t, social=None, unlocked=False):
    """`social` — shu testning so'nggi 7 kunlik ijtimoiy dalili
    ({'solvers': N, 'avg': X}); ma'lumot bo'lmasa None qaytadi."""
    return {
        'id': t.id, 'title': t.title, 'description': t.description, 'category': t.category,
        'subject': t.subject.slug if t.subject else None,
        'duration_minutes': t.duration_minutes,
        # `q_count` — ro'yxat so'rovida annotate qilingan (N+1 ni yo'q qilish uchun).
        'questions_count': getattr(t, 'q_count', None) if getattr(t, 'q_count', None) is not None else t.questions.count(),
        'is_premium': t.is_premium,
        # `is_unlocked` — shu O'QUVCHI uchun: global mock-test kirishi yoki aynan shu
        # test uchun tasdiqlangan to'lov bo'lsa True.
        'is_unlocked': unlocked,
        'recent_solvers': (social or {}).get('solvers', 0),
        'recent_avg_score': (social or {}).get('avg'),
    }


@api_view(['GET'])
def center_api(request):
    seed_questions_if_needed()
    profile = ensure_profile_for_user(request.user)
    subject, subjects = _resolve_subject(request)

    category = request.GET.get('category', 'all')
    search_query = request.GET.get('search', '')

    tests = TestSet.objects.filter(is_random=False, is_archived=False, is_published=True)
    if subject:
        tests = tests.filter(subject=subject)
    tests = tests.select_related('subject').annotate(q_count=Count('questions')).order_by('-created_at')
    if category != 'all':
        tests = tests.filter(category=category)
    if search_query:
        tests = tests.filter(title__icontains=search_query)

    stats = profile.attempts.aggregate(total=Count('id'), avg=Avg('score', filter=Q(is_completed=True)))

    # Ijtimoiy dalil: so'nggi 7 kunda har bir testni nechta o'quvchi yechgani va o'rtacha
    # ball. Bitta guruhlangan so'rov — testlar soniga qarab ko'paymaydi.
    week_ago = timezone.now() - timezone.timedelta(days=7)
    social_rows = (Attempt.objects
                   .filter(is_completed=True, completed_at__gte=week_ago, test__in=tests)
                   .values('test_id')
                   .annotate(solvers=Count('profile_id', distinct=True), avg=Avg('score')))
    social_by_test = {r['test_id']: {'solvers': r['solvers'], 'avg': r['avg']} for r in social_rows}

    # Mock test tarifi endi BITTA testni ochadi (to'lov o'sha testga bog'lanadi).
    # Global bayroq esa admin qo'lda bergan yoki eski, testga bog'lanmagan xaridlar uchun.
    from premium.models import SubscriptionPlan, unlocked_test_ids
    unlocked_ids = unlocked_test_ids(profile)
    mock_plan = SubscriptionPlan.objects.filter(plan_type='mock_test', is_active=True).order_by('order').first()

    return Response({
        'tests': [
            _test_payload(
                t, social_by_test.get(t.id),
                unlocked=(profile.premium_mock_test_unlocked or t.id in unlocked_ids),
            ) for t in tests
        ],
        'subjects': [{'id': s.id, 'name': s.name, 'slug': s.slug} for s in subjects],
        'selected_subject': subject.slug if subject else None,
        'selected_category': category,
        'search_query': search_query,
        'total_attempts': stats['total'] or 0,
        'avg_score': stats['avg'] or 0,
        'has_mock_test_access': profile.premium_mock_test_unlocked,
        # Darslar obunasi va mock test kirishi — IKKI XIL tarif. Frontend shu ikkalasini
        # ajratib ko'rsatishi uchun ikkalasi ham qaytariladi: "PRO" bo'lgan, lekin mock
        # testga kirolmayotgan o'quvchi nima uchun qulf turganini bilishi kerak.
        'has_lessons_access': profile.has_active_premium_lessons,
        # Qulflangan kartadan to'g'ridan-to'g'ri to'lovga o'tish uchun.
        'mock_plan': {'id': mock_plan.id, 'price': str(mock_plan.price)} if mock_plan else None,
    })


def _new_attempt(profile, test):
    attempt = Attempt.objects.create(profile=profile, test=test)
    for q in test.ordered_questions():
        AttemptAnswer.objects.create(attempt=attempt, question=q)
    return attempt


@api_view(['POST'])
def start_test_api(request, test_id):
    test = get_object_or_404(TestSet, id=test_id)
    profile = ensure_profile_for_user(request.user)
    from premium.models import unlocked_test_ids as _unlocked_ids
    if test.is_premium and not profile.premium_mock_test_unlocked and test.id not in _unlocked_ids(profile):
        return Response({'error': 'Bu test faqat premium (mock test tizimi) xaridorlariga ochiq.'}, status=403)
    attempt = _new_attempt(profile, test)
    return Response({'attempt_id': attempt.id})


@api_view(['POST'])
def start_random_test_api(request):
    seed_questions_if_needed()
    profile = ensure_profile_for_user(request.user)
    subject, _ = _resolve_subject(request)

    questions = list(Question.objects.filter(subject=subject) if subject else Question.objects.all())
    if not questions:
        return Response({'error': "Bu fanda hali savollar yo'q."}, status=400)

    import random
    random.shuffle(questions)
    questions_to_use = questions[:10]

    test = TestSet.objects.create(
        title=f"Tasodifiy {subject.name if subject else 'Tarix'} Testi",
        description="Tanlangan fandan tasodifiy tuzilgan savollar to'plami.",
        subject=subject, category='history', duration_minutes=10, is_random=True, is_premium=False,
    )
    test.questions.set(questions_to_use)
    attempt = Attempt.objects.create(profile=profile, test=test)
    for q in questions_to_use:
        AttemptAnswer.objects.create(attempt=attempt, question=q)
    return Response({'attempt_id': attempt.id})


@api_view(['POST'])
def start_mistakes_test_api(request):
    profile = ensure_profile_for_user(request.user)
    subject, _ = _resolve_subject(request)

    wrong_answers = (AttemptAnswer.objects
                      .filter(attempt__profile=profile, attempt__is_completed=True, is_correct=False)
                      .select_related('question').order_by('-attempt__completed_at'))
    if subject:
        wrong_answers = wrong_answers.filter(question__subject=subject)

    seen, questions_to_use = set(), []
    for ans in wrong_answers:
        if ans.question_id in seen or ans.is_skipped:
            continue
        seen.add(ans.question_id)
        questions_to_use.append(ans.question)
        if len(questions_to_use) >= 15:
            break

    if not questions_to_use:
        return Response({'error': "Bu fanda hali xato javoblaringiz yo'q."}, status=400)

    test = TestSet.objects.create(
        title="Xatolar ustida ishlash", description="Avval noto'g'ri javob bergan savollaringizdan tuzilgan mashq testi.",
        subject=subject, category='history', duration_minutes=max(5, len(questions_to_use)),
        is_random=True, is_premium=False,
    )
    test.questions.set(questions_to_use)
    attempt = Attempt.objects.create(profile=profile, test=test)
    for q in questions_to_use:
        AttemptAnswer.objects.create(attempt=attempt, question=q)
    return Response({'attempt_id': attempt.id})


def _question_screen_data(attempt, q_idx, current_answer, total_questions, seconds_left=None):
    question = current_answer.question
    data = {
        'attempt_id': attempt.id,
        'q_idx': q_idx,
        'total_questions': total_questions,
        'has_prev': q_idx > 1,
        'has_next': q_idx < total_questions,
        'prev_idx': q_idx - 1,
        'next_idx': q_idx + 1,
        'question': {
            'id': question.id,
            'body': question.body,
            'type': question.question_type,
            'difficulty': question.difficulty,
            'image': question.image.url if question.image else (question.image_url or ''),
            'image_position': question.image_position,
            'audio_url': question.audio_url or '',
        },
    }
    if seconds_left is not None:
        data['seconds_left'] = seconds_left

    qtype = question.question_type
    if qtype in Question.SINGLE_ANSWER_TYPES:
        data['choices'] = [{'id': c.id, 'text': c.text} for c in question.choices.all()]
        data['selected_choice_id'] = current_answer.selected_choice_id
    elif qtype == 'matching':
        pairs = list(question.matching_pairs.all())
        submitted = current_answer.matching_data or {}
        data['matching_options'] = [{'right_key': p.right_key, 'right_text': p.right_text} for p in pairs]
        data['matching_rows'] = [
            {'left_key': p.left_key, 'left_text': p.left_text, 'selected_right_key': submitted.get(p.left_key, '')}
            for p in pairs if p.left_key
        ]
    elif qtype == 'grouped_item':
        data['group_instruction'] = question.group.instruction if question.group_id else ''
        data['group_options'] = (
            [{'id': o.id, 'label': o.label, 'text': o.text} for o in question.group.options.all()]
            if question.group_id else []
        )
        data['selected_group_option_id'] = current_answer.grouped_option_id
    elif qtype == 'open_written':
        sub_qs = list(question.sub_questions.all())
        submitted_open = current_answer.open_answers or {}
        data['sub_question_rows'] = [
            {'label': sq.label, 'text': sq.text, 'answer': submitted_open.get(sq.label, '')} for sq in sub_qs
        ]
        data['text_answer'] = current_answer.text_answer

    return data


def _get_answers_and_current(attempt, q_idx):
    answers = list(attempt.answers.all().order_by('id'))
    total = len(answers)
    if total == 0:
        return None, None, 0
    q_idx = max(1, min(q_idx, total))
    return answers, answers[q_idx - 1], total


@api_view(['GET'])
def question_api(request, attempt_id):
    attempt = get_object_or_404(Attempt, id=attempt_id, profile=request.user.profile)
    if attempt.is_completed:
        return Response({'error': 'attempt already finished', 'completed': True}, status=409)

    q_idx = int(request.GET.get('q_idx', 1))
    answers, current_answer, total = _get_answers_and_current(attempt, q_idx)
    if current_answer is None:
        return Response({'error': 'no questions'}, status=404)
    q_idx = max(1, min(q_idx, total))

    elapsed = timezone.now() - attempt.started_at
    duration = attempt.test.duration_minutes if attempt.test else 10
    seconds_left = max(0, duration * 60 - int(elapsed.total_seconds()))

    return Response(_question_screen_data(attempt, q_idx, current_answer, total, seconds_left))


@api_view(['POST'])
def answer_api(request, attempt_id):
    attempt = get_object_or_404(Attempt, id=attempt_id, profile=request.user.profile)
    if attempt.is_completed:
        return Response({'error': 'attempt already finished', 'completed': True}, status=409)

    question_id = request.data.get('question_id')
    q_idx = int(request.data.get('q_idx', 1))
    answer = get_object_or_404(AttemptAnswer, attempt=attempt, question_id=question_id)
    question = answer.question

    if question.question_type == 'open_written':
        sub_qs = question.sub_questions.all()
        if sub_qs:
            subanswers = request.data.get('subanswers') or {}
            answer.open_answers = {sq.label: (subanswers.get(sq.label) or '').strip()
                                    for sq in sub_qs if (subanswers.get(sq.label) or '').strip()}
        else:
            answer.text_answer = (request.data.get('text_answer') or '').strip()
    elif question.question_type == 'matching':
        left_keys = [p.left_key for p in question.matching_pairs.all() if p.left_key]
        matches = request.data.get('matches') or {}
        answer.matching_data = {k: matches[k] for k in left_keys if matches.get(k)}
        answer.grade()
    elif question.question_type == 'grouped_item':
        option_id = request.data.get('group_option_id')
        answer.grouped_option = get_object_or_404(GroupOption, id=option_id, group=question.group) if option_id else None
        answer.grade()
    else:
        choice_id = request.data.get('choice_id')
        answer.selected_choice = get_object_or_404(AnswerOption, id=choice_id, question_id=question_id) if choice_id else None
        answer.grade()

    # Javob vaqti: klient shu savolda qancha turganini yuboradi (`time_spent_sec`).
    # Ishonchsiz manba bo'lgani uchun oqilona chegara qo'yiladi (0–1 soat).
    now = timezone.now()
    try:
        spent = int(request.data.get('time_spent_sec') or 0)
    except (TypeError, ValueError):
        spent = 0
    answer.time_spent_sec = max(0, min(spent, 3600)) or None
    answer.answered_at = now
    answer.save()

    answers, current_answer, total = _get_answers_and_current(attempt, q_idx)
    if current_answer is None:
        return Response({'error': 'no questions'}, status=404)
    return Response(_question_screen_data(attempt, q_idx, current_answer, total))


@api_view(['POST'])
def finish_api(request, attempt_id):
    attempt = get_object_or_404(Attempt, id=attempt_id, profile=request.user.profile)
    if attempt.is_completed:
        return Response({'attempt_id': attempt.id, 'already_completed': True})

    answers = list(
        attempt.answers
        .select_related('question__topic', 'selected_choice', 'grouped_option', 'question__correct_group_option')
        .prefetch_related('question__choices', 'question__matching_pairs')
    )
    total = len(answers)
    if total == 0:
        return Response({'error': 'no questions'}, status=400)

    open_written_answers = [a for a in answers if a.question.question_type == 'open_written' and not a.is_skipped]
    grading_items, item_targets = [], []
    for a in open_written_answers:
        sub_qs = list(a.question.sub_questions.all())
        if sub_qs:
            submitted = a.open_answers or {}
            for sq in sub_qs:
                student_answer = submitted.get(sq.label, '')
                if not student_answer.strip():
                    continue
                grading_items.append({'question_text': f"{a.question.body} — qism {sq.label})",
                                       'reference_answer': sq.reference_answer, 'student_answer': student_answer})
                item_targets.append((a, sq))
        else:
            grading_items.append({'question_text': a.question.body, 'reference_answer': a.question.reference_answer,
                                   'student_answer': a.text_answer})
            item_targets.append((a, None))

    if grading_items:
        results = grade_open_answers(grading_items)
        if results:
            per_answer_entries = {}
            for (a, sq), result in zip(item_targets, results):
                per_answer_entries.setdefault(a.id, []).append((sq, result))
            for a in open_written_answers:
                entries = per_answer_entries.get(a.id)
                if not entries:
                    continue
                if entries[0][0] is None:
                    _, result = entries[0]
                    a.is_correct = result['is_correct']
                    a.ai_grading_note = result['note'][:300]
                    a.save(update_fields=['is_correct', 'ai_grading_note'])
                else:
                    total_parts = a.question.sub_questions.count()
                    all_correct = len(entries) == total_parts and all(r['is_correct'] for _, r in entries)
                    a.is_correct = all_correct
                    a.open_grading = {sq.label: {'is_correct': r['is_correct'], 'note': r['note'][:300]} for sq, r in entries}
                    a.save(update_fields=['is_correct', 'open_grading'])

    correct = sum(1 for a in answers if a.is_correct)
    skipped = sum(1 for a in answers if a.is_skipped)
    wrong = total - correct - skipped
    score = (correct / total) * 100

    attempt.correct_answers = correct
    attempt.wrong_answers = wrong
    attempt.skipped_answers = skipped
    attempt.score = score
    attempt.is_completed = True
    attempt.completed_at = timezone.now()
    attempt.save()

    profile = request.user.profile
    xp_awarded = correct * 50
    coins_awarded = correct * 5
    profile.add_xp(xp_awarded)
    profile.add_coins(coins_awarded)
    profile.update_streak()

    subject = attempt.test.subject if attempt.test else None
    if subject and xp_awarded:
        from .models import SubjectScore
        score_row, _ = SubjectScore.objects.get_or_create(profile=profile, subject=subject)
        score_row.xp = F('xp') + xp_awarded
        score_row.save(update_fields=['xp'])

    for ans in answers:
        if ans.is_skipped:
            continue
        if not ans.is_correct:
            item, created = RevisionItem.objects.get_or_create(
                profile=profile, question=ans.question, defaults={'subject': ans.question.subject})
            if not created:
                item.times_wrong = F('times_wrong') + 1
                item.mastered = False
                item.save(update_fields=['times_wrong', 'mastered', 'updated_at'])
        else:
            RevisionItem.objects.filter(profile=profile, question=ans.question, mastered=False).update(
                mastered=True, times_reviewed=F('times_reviewed') + 1, last_reviewed_at=timezone.now())

    from analytics.services import bust_cache as _bust_analytics
    _bust_analytics(profile.pk)

    from core.missions import advance_missions
    advance_missions(profile, 'test')

    _dispatch_ai_feedback(attempt.id)

    return Response({'attempt_id': attempt.id, 'score': score, 'correct': correct, 'wrong': wrong, 'skipped': skipped})


@api_view(['GET'])
def feedback_api(request, attempt_id):
    attempt = get_object_or_404(Attempt, id=attempt_id, profile=request.user.profile)
    if not attempt.is_completed:
        return Response({'error': 'attempt not finished'}, status=409)

    ai_feedback = AIFeedback.objects.filter(attempt=attempt).first()
    if not ai_feedback:
        _dispatch_ai_feedback(attempt.id)
        return Response({'status': 'pending'})

    answers = (attempt.answers.select_related('question', 'selected_choice')
               .prefetch_related('question__choices').order_by('question_id'))
    review_items = []
    for ans in answers:
        q = ans.question
        correct_answer, your_answer = '', ''
        if q.question_type in Question.SINGLE_ANSWER_TYPES:
            correct_answer = ', '.join(c.text for c in q.choices.all() if c.is_correct)
            your_answer = ans.selected_choice.text if ans.selected_choice else ''
        review_items.append({
            'question_id': q.id, 'body': q.body, 'is_correct': ans.is_correct, 'is_skipped': ans.is_skipped,
            'your_answer': your_answer, 'correct_answer': correct_answer,
            'explanation': q.explanation, 'grading_note': ans.ai_grading_note,
        })

    return Response({
        'status': 'ready',
        'attempt': {'id': attempt.id, 'score': attempt.score, 'correct_answers': attempt.correct_answers,
                    'wrong_answers': attempt.wrong_answers, 'skipped_answers': attempt.skipped_answers},
        'overall_analysis': ai_feedback.overall_analysis,
        'weak_topics': [t.strip() for t in ai_feedback.weak_topics.split(',') if t.strip()],
        'strong_topics': [t.strip() for t in ai_feedback.strong_topics.split(',') if t.strip()],
        'recommendations': ai_feedback.recommendations,
        'predicted_score': ai_feedback.predicted_score,
        'roadmap': ai_feedback.roadmap,
        'ai_motivation': ai_feedback.ai_motivation,
        'detailed_mistakes': ai_feedback.detailed_mistakes,
        'review_items': review_items,
    })


@api_view(['GET'])
def history_api(request):
    attempts = (Attempt.objects.filter(profile=request.user.profile, is_completed=True)
                .select_related('test').order_by('-completed_at'))
    page_obj = Paginator(attempts, 25).get_page(request.GET.get('page'))
    return Response({
        'results': [{
            'id': a.id, 'test_title': a.test.title if a.test else 'Tasodifiy Test',
            'score': a.score, 'correct_answers': a.correct_answers, 'wrong_answers': a.wrong_answers,
            'skipped_answers': a.skipped_answers, 'completed_at': a.completed_at,
        } for a in page_obj],
        'page': page_obj.number, 'num_pages': page_obj.paginator.num_pages,
        'has_next': page_obj.has_next(), 'has_prev': page_obj.has_previous(),
    })


@api_view(['GET'])
def revision_api(request):
    profile = ensure_profile_for_user(request.user)
    base = RevisionItem.objects.filter(profile=profile)
    active = (base.filter(mastered=False).select_related('question', 'question__topic', 'subject')
              .prefetch_related('question__choices'))

    subject_slug = request.GET.get('subject', '')
    topic_id = request.GET.get('topic', '')
    if subject_slug:
        active = active.filter(subject__slug=subject_slug)

    # Mavzular ro'yxati topic filtri QO'LLANISHIDAN OLDIN yig'iladi — aks holda mavzu
    # tanlangach ro'yxat bittaga qisqarib, boshqasiga o'tib bo'lmay qolardi.
    topic_rows = (active.exclude(question__topic__isnull=True)
                  .values('question__topic_id', 'question__topic__title')
                  .annotate(count=Count('id')).order_by('-count'))
    topics = [{'id': r['question__topic_id'], 'title': r['question__topic__title'],
               'count': r['count']} for r in topic_rows]

    if topic_id.isdigit():
        active = active.filter(question__topic_id=int(topic_id))

    deck = []
    for item in active[:50]:
        q = item.question
        deck.append({
            'item_id': item.id, 'question_id': q.id, 'body': q.body, 'type': q.question_type,
            'image': q.image.url if q.image else (q.image_url or ''), 'explanation': q.explanation or '',
            'topic': q.topic.title if q.topic else '', 'times_wrong': item.times_wrong,
            'inline': q.question_type in Question.SINGLE_ANSWER_TYPES,
            'choices': [{'id': c.id, 'text': c.text} for c in q.choices.all()] if q.question_type in Question.SINGLE_ANSWER_TYPES else [],
        })

    return Response({
        'deck': deck, 'active_count': len(deck), 'total': base.count(),
        'mastered_count': base.filter(mastered=True).count(),
        'subjects': [{'id': s.id, 'name': s.name, 'slug': s.slug} for s in Subject.objects.all()],
        'selected_subject': subject_slug,
        'topics': topics,
        'selected_topic': topic_id if topic_id.isdigit() else '',
    })


@api_view(['POST'])
def revision_check_api(request, item_id):
    from django.core.cache import cache
    from django.db.models import F

    item = get_object_or_404(RevisionItem.objects.select_related('question'), id=item_id, profile=request.user.profile)
    q = item.question
    action = request.data.get('action', '')

    if action == 'master':
        item.mastered = True
        item.times_reviewed = F('times_reviewed') + 1
        item.last_reviewed_at = timezone.now()
        item.save(update_fields=['mastered', 'times_reviewed', 'last_reviewed_at', 'updated_at'])
        return Response({'ok': True, 'correct': True, 'mastered': True})

    choice_id = request.data.get('choice_id')
    correct_choice = q.choices.filter(is_correct=True).first()
    is_correct = bool(choice_id and correct_choice and str(correct_choice.id) == str(choice_id))

    item.times_reviewed = F('times_reviewed') + 1
    item.last_reviewed_at = timezone.now()
    if is_correct:
        item.mastered = True
    item.save(update_fields=['times_reviewed', 'last_reviewed_at', 'mastered', 'updated_at'])

    explanation = q.explanation or ''
    if not is_correct and not explanation and correct_choice:
        cache_key = f'ai_expl:{q.id}'
        explanation = cache.get(cache_key) or ''
        if not explanation:
            from django.utils.html import strip_tags
            ai_text = ask_groq([
                {'role': 'system', 'content': ("Sen o'quvchiga xatosini tushuntiradigan qisqa va aniq mentorsan. "
                                                "Faqat o'zbek tilida, 2-3 jumla bilan javob ber. Formulalar yoki "
                                                "keraksiz kirish so'zlarisiz, to'g'ridan-to'g'ri mohiyatni ayt.")},
                {'role': 'user', 'content': (f"Savol: {strip_tags(q.body)[:600]}\n"
                                              f"To'g'ri javob: {correct_choice.text[:200]}\n"
                                              f"Nega aynan shu javob to'g'ri ekanini qisqa tushuntir.")},
            ], temperature=0.4, timeout=12)
            if ai_text:
                explanation = ai_text.strip()[:800]
                cache.set(cache_key, explanation, 7 * 24 * 3600)

    return Response({
        'ok': True, 'correct': is_correct, 'mastered': is_correct,
        'correct_choice_id': correct_choice.id if correct_choice else None, 'explanation': explanation,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def story_link_api(request, attempt_id):
    """Telegram Story uchun imzolangan rasm manzili.

    Manzil OCHIQ (imzo bilan himoyalangan), chunki rasmni Telegram serverlari yuklab
    oladi — ular JWT sarlavhasini yubormaydi. Shu sababli havolani faqat urinish egasi
    oladi, lekin havolaning o'zi autentifikatsiyasiz ochiladi.
    """
    from .story import sign_attempt

    attempt = get_object_or_404(Attempt, id=attempt_id, profile=request.user.profile)
    if not attempt.is_completed:
        return Response({'error': 'attempt not finished'}, status=409)

    base = (getattr(settings, 'FRONTEND_URL', '') or getattr(settings, 'WEBAPP_URL', '') or '').rstrip('/')
    path = f'/api/tests/attempts/{attempt.id}/story/?sig={sign_attempt(attempt.id)}'
    return Response({
        'media_url': f'{base}{path}' if base else path,
        'text': f"IlmIldizi'da {round(attempt.score or 0)}% natija oldim!",
    })


@api_view(['GET'])
@authentication_classes([])
@permission_classes([AllowAny])
def story_image_api(request, attempt_id):
    """Natija kartasi (PNG). Imzo to'g'ri bo'lmasa — 404."""
    from .story import render_story_png, signature_ok

    if not signature_ok(attempt_id, request.GET.get('sig')):
        raise Http404

    attempt = get_object_or_404(
        Attempt.objects.select_related('test', 'profile__user'),
        id=attempt_id, is_completed=True,
    )
    total = attempt.correct_answers + attempt.wrong_answers + attempt.skipped_answers
    user = attempt.profile.user
    png = render_story_png(
        score=attempt.score,
        correct=attempt.correct_answers,
        total=total or 1,
        test_title=attempt.test.title if attempt.test else 'Tasodifiy test',
        display_name=(user.first_name or user.username),
    )
    response = HttpResponse(png, content_type='image/png')
    # Telegram rasmni bir necha marta so'rashi mumkin; natija o'zgarmaydi.
    response['Cache-Control'] = 'public, max-age=86400'
    return response
