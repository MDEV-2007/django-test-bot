import json
import random
import logging
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_POST
from django.core.cache import cache
from django.core.paginator import Paginator
from django.db import IntegrityError, transaction
from django.db.models import Avg, Count, F, Q
from django.utils import timezone
from django.http import HttpResponse, JsonResponse
from accounts.models import Profile, ensure_profile_for_user
from learning.models import Topic, Lesson
from core import background
from core.models import ProfileMission, Notification
from core.ai_client import ask_groq
from .services.prompts import SYSTEM_PROMPT, build_user_prompt
from .services.grading import grade_open_answers
from .models import Question, AnswerOption, TestSet, Attempt, AttemptAnswer, AIFeedback, GroupOption, Subject, SubjectScore, RevisionItem

logger = logging.getLogger(__name__)


def _question_screen_context(attempt, q_idx, current_answer, total_questions, seconds_left=None):
    """Builds the render context for one question in the test-taking flow. Centralized so
    screen() and both branches of submit_answer() stay in sync on what each question type
    needs — mcq needs `choices`, matching needs `matching_rows`/`matching_pairs`, grouped
    needs `group_options`."""
    question = current_answer.question

    matching_rows = []
    matching_pairs = []
    if question.question_type == 'matching':
        matching_pairs = list(question.matching_pairs.all())
        submitted = current_answer.matching_data or {}
        # Django templates can't do a dict lookup keyed by a template variable (only by a
        # literal name), so the current selection per row is pre-merged here rather than
        # looked up from current_answer.matching_data in the template.
        matching_rows = [
            {'left_key': p.left_key, 'left_text': p.left_text, 'selected_right_key': submitted.get(p.left_key, '')}
            for p in matching_pairs if p.left_key
        ]

    sub_question_rows = []
    if question.question_type == 'open_written':
        submitted_open = current_answer.open_answers or {}
        sub_question_rows = [
            {'label': sq.label, 'text': sq.text, 'answer': submitted_open.get(sq.label, '')}
            for sq in question.sub_questions.all()
        ]

    context = {
        'attempt': attempt,
        'q_idx': q_idx,
        'current_answer': current_answer,
        'question': question,
        'choices': question.choices.all(),
        'matching_pairs': matching_pairs,
        'matching_rows': matching_rows,
        'sub_question_rows': sub_question_rows,
        'group_options': question.group.options.all() if question.question_type == 'grouped_item' and question.group_id else [],
        'total_questions': total_questions,
        'has_prev': q_idx > 1,
        'has_next': q_idx < total_questions,
        'prev_idx': q_idx - 1,
        'next_idx': q_idx + 1,
    }
    if seconds_left is not None:
        context['seconds_left'] = seconds_left
    return context


def _grade_band(score):
    if score >= 90:
        return "A'lo"
    elif score >= 75:
        return "Yaxshi"
    elif score >= 60:
        return "Qoniqarli"
    elif score >= 40:
        return "O'rtacha"
    return "Qoniqarsiz"


def _build_ai_feedback_data(score, correct, skipped, total, weak_topics, strong_topics):
    """Builds a real, score/topic-driven analysis instead of a fixed canned template."""
    if score >= 90:
        overall_analysis = (
            f"Siz {total} savoldan {correct} tasiga to'g'ri javob berib, {score:.0f}% natija ko'rsatdingiz — "
            f"bu ajoyib daraja va milliy sertifikat talablariga to'liq mos keladi."
        )
        ai_motivation = "Zo'r natija! Shu tezlikda davom eting, siz sertifikatga tayyor bo'lib qolyapsiz."
    elif score >= 75:
        overall_analysis = (
            f"Siz {total} savoldan {correct} tasiga to'g'ri javob berib, {score:.0f}% natija ko'rsatdingiz — "
            f"bu yaxshi daraja, ammo sertifikat uchun bir nechta mavzuni yana mustahkamlash kerak."
        )
        ai_motivation = "Yaxshi natija! Kuchsiz mavzularni tugatsangiz, natijangiz yanada oshadi."
    elif score >= 60:
        overall_analysis = (
            f"Siz {total} savoldan {correct} tasiga to'g'ri javob berdingiz ({score:.0f}%). Bu qoniqarli natija, "
            f"ammo barqaror muvaffaqiyat uchun kuchsiz mavzularga alohida vaqt ajratishingiz kerak."
        )
        ai_motivation = "Yomon emas, lekin hali ishlash kerak. Har kuni bitta mavzuni mustahkamlab boring."
    elif score >= 40:
        overall_analysis = (
            f"Siz {total} savoldan atigi {correct} tasiga to'g'ri javob berdingiz ({score:.0f}%). Bu o'rtacha "
            f"natija — asosiy mavzularni qaytadan o'rganish tavsiya etiladi."
        )
        ai_motivation = "Hafsalangizni pir qilmang — bu faqat boshlanish. Har bir xato sizni bilimga yaqinlashtiradi."
    else:
        overall_analysis = (
            f"Siz {total} savoldan faqat {correct} tasiga to'g'ri javob berdingiz ({score:.0f}%). Bu past natija "
            f"bo'lib, materiallarni boshidan sinchiklab o'rganishingiz zarur."
        )
        ai_motivation = "Hozir qiyin bo'lishi mumkin, ammo tizimli mashq bilan albatta natija chiqadi. Davom eting!"

    if skipped:
        overall_analysis += f" Shuningdek, {skipped} ta savolni javobsiz qoldirdingiz — vaqtni to'g'ri taqsimlashga e'tibor bering."

    if strong_topics:
        overall_analysis += f" Kuchli tomonlaringiz: {', '.join(strong_topics)}."

    predicted_score = _grade_band(score)

    recommendation_lines = []
    roadmap = []
    step = 1
    for topic_title in weak_topics[:3]:
        lesson = Lesson.objects.filter(topic__title=topic_title).first()
        if lesson:
            recommendation_lines.append(f"{step}. O'qish bo'limida '{lesson.title}' ({topic_title}) darsini ko'ring.")
            roadmap.append({"step": step, "title": f"'{lesson.title}' darsini o'qish", "duration": "15 daqiqa", "done": False})
        else:
            recommendation_lines.append(f"{step}. '{topic_title}' mavzusi bo'yicha o'qish materiallarini qayta ko'rib chiqing.")
            roadmap.append({"step": step, "title": f"'{topic_title}' mavzusini takrorlash", "duration": "15 daqiqa", "done": False})
        step += 1

    if weak_topics:
        recommendation_lines.append(f"{step}. AI Mentor bilan suhbatlashib, '{weak_topics[0]}' mavzusidagi tushunarsiz joylarni so'rab oling.")
        roadmap.append({"step": step, "title": "AI Mentordan yordam so'rash", "duration": "5 daqiqa", "done": False})
        step += 1
        recommendation_lines.append(f"{step}. Ushbu mavzular bo'yicha qayta test yeching va natijangizni solishtiring.")
        roadmap.append({"step": step, "title": "Qayta test yechish", "duration": "10 daqiqa", "done": False})
    else:
        recommendation_lines.append(f"{step}. Barcha mavzularni yaxshi o'zlashtirdingiz — bilimingizni saqlab qolish uchun murakkabroq testlarni sinab ko'ring.")
        roadmap.append({"step": step, "title": "Murakkabroq test bilan bilimni mustahkamlash", "duration": "15 daqiqa", "done": False})

    recommendations = "\n".join(recommendation_lines)

    return {
        'overall_analysis': overall_analysis,
        'recommendations': recommendations,
        'predicted_score': predicted_score,
        'roadmap': roadmap,
        'ai_motivation': ai_motivation,
    }

def _answer_display_texts(ans):
    """Returns (student_text, correct_text) for one AttemptAnswer, across every question
    type — used to build the AI feedback prompt without it needing to know per-type
    field layouts."""
    question = ans.question
    if question.question_type == 'open_written':
        return ans.text_answer, (question.reference_answer or "Noma'lum")

    if question.question_type == 'matching':
        pairs = list(question.matching_pairs.all())
        expected = {p.left_key: p.right_key for p in pairs if p.left_key}
        right_text_by_key = {p.right_key: p.right_text for p in pairs}
        submitted = ans.matching_data or {}
        student_text = ", ".join(f"{k}-{submitted.get(k, '?')}" for k in expected)
        correct_text = ", ".join(f"{k}-{v} ({right_text_by_key.get(v, '')})" for k, v in expected.items())
        return student_text, correct_text

    if question.question_type == 'grouped_item':
        student_text = ans.grouped_option.text if ans.grouped_option_id else ""
        correct_text = question.correct_group_option.text if question.correct_group_option_id else "Noma'lum"
        return student_text, correct_text

    # single_choice / image_based / table_based
    correct_choice = next((c for c in question.choices.all() if c.is_correct), None)
    correct_text = correct_choice.text if correct_choice else "Noma'lum"
    student_text = ans.selected_choice.text if ans.selected_choice_id else ""
    return student_text, correct_text


def _build_ai_feedback_via_groq(answers, score, correct, total, subject_name="Umumiy"):
    """Asks Groq for a personalized, per-question test analysis. `answers` must be an
    iterable of AttemptAnswer with question__topic and question choices/related data
    already prefetched. Returns None (caller falls back to _build_ai_feedback_data) if
    Groq is unconfigured, unreachable, or replies with something that doesn't match the
    expected shape."""
    wrong_answers = []
    skipped_answers = []
    for ans in answers:
        topic_title = ans.question.topic.title if ans.question.topic else f"Umumiy {subject_name}"
        student_text, correct_text = _answer_display_texts(ans)

        if ans.is_skipped:
            skipped_answers.append({
                'mavzu': topic_title,
                'savol': ans.question.body,
                'togri_javob': correct_text,
            })
        elif not ans.is_correct:
            wrong_answers.append({
                'mavzu': topic_title,
                'savol': ans.question.body,
                'bola_javobi': student_text,
                'togri_javob': correct_text,
            })

    user_prompt = build_user_prompt(
        subject=subject_name,
        total=total,
        correct=correct,
        wrong_answers=wrong_answers,
        skipped_answers=skipped_answers,
    )
    raw = ask_groq(
        [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.5,
        response_format={"type": "json_object"},
    )
    if not raw:
        return None

    try:
        data = json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        logger.warning("Groq feedback returned non-JSON content: %r", raw)
        return None

    required_keys = {'umumiy_xulosa', 'kuchli_tomonlar', 'aniq_xatolar', 'kuchsiz_mavzular', 'keyingi_qadamlar', 'motivatsiya'}
    if not required_keys.issubset(data.keys()) or not isinstance(data['aniq_xatolar'], list) or not isinstance(data['keyingi_qadamlar'], list):
        logger.warning("Groq feedback JSON missing expected keys: %r", data)
        return None

    return data


def seed_questions_if_needed():
    """Helper to seed initial high-fidelity questions and tests if database is empty."""
    if Question.objects.exists():
        return
        
    # Create default Topics first
    t1, _ = Topic.objects.get_or_create(title="O'rta asrlar tarixi", slug="orta-asrlar", category="history", order=1)
    t2, _ = Topic.objects.get_or_create(title="Milliy sertifikat tayyorlov", slug="milliy-sertifikat", category="certificate", order=2)
    t3, _ = Topic.objects.get_or_create(title="BBA Tarix imtihoni", slug="bba-tarix", category="bba", order=3)
    
    # Seed Question 1
    q1 = Question.objects.create(topic=t1, body="Amir Temur qaysi yilda tug'ilgan?", difficulty="easy", category="history")
    AnswerOption.objects.create(question=q1, text="1332-yil", is_correct=False)
    AnswerOption.objects.create(question=q1, text="1336-yil", is_correct=True)
    AnswerOption.objects.create(question=q1, text="1340-yil", is_correct=False)
    AnswerOption.objects.create(question=q1, text="1328-yil", is_correct=False)
    
    # Seed Question 2
    q2 = Question.objects.create(topic=t1, body="Amir Temur davlatining poytaxti qaysi shahar bo'lgan?", difficulty="easy", category="history")
    AnswerOption.objects.create(question=q2, text="Buxoro", is_correct=False)
    AnswerOption.objects.create(question=q2, text="Samarqand", is_correct=True)
    AnswerOption.objects.create(question=q2, text="Toshkent", is_correct=False)
    AnswerOption.objects.create(question=q2, text="Hirot", is_correct=False)
    
    # Seed Question 3
    q3 = Question.objects.create(topic=t1, body="Alisher Navoiy qaysi shaharda tug'ilgan?", difficulty="easy", category="history")
    AnswerOption.objects.create(question=q3, text="Hirot", is_correct=True)
    AnswerOption.objects.create(question=q3, text="Samarqand", is_correct=False)
    AnswerOption.objects.create(question=q3, text="Buxoro", is_correct=False)
    AnswerOption.objects.create(question=q3, text="Toshkent", is_correct=False)

    # Seed Question 4
    q4 = Question.objects.create(topic=t2, body="O'zbekistonda Milliy sertifikat tizimi qaysi yildan joriy etildi?", difficulty="medium", category="certificate")
    AnswerOption.objects.create(question=q4, text="2019-yil", is_correct=False)
    AnswerOption.objects.create(question=q4, text="2020-yil", is_correct=True)
    AnswerOption.objects.create(question=q4, text="2021-yil", is_correct=False)
    AnswerOption.objects.create(question=q4, text="2018-yil", is_correct=False)

    # Seed Question 5
    q5 = Question.objects.create(topic=t3, body="Jadidchilik harakatining asoschilaridan biri, ma'rifatparvar kim edi?", difficulty="medium", category="bba")
    AnswerOption.objects.create(question=q5, text="Mahmudxo'ja Behbudiy", is_correct=True)
    AnswerOption.objects.create(question=q5, text="Abdulla Qodiriy", is_correct=False)
    AnswerOption.objects.create(question=q5, text="Fitrat", is_correct=False)
    AnswerOption.objects.create(question=q5, text="Cho'lpon", is_correct=False)
    
    # Create Default Tests
    test1 = TestSet.objects.create(title="O'zbekiston tarixi (Amir Temur davri)", description="Temuriylar davlatining tashkil topishi va yuksalishi.", category="history", duration_minutes=15)
    test1.questions.add(q1, q2, q3)
    
    test2 = TestSet.objects.create(title="Milliy sertifikat diagnostik test", description="Milliy sertifikat formatidagi boshlang'ich sinov testi.", category="certificate", duration_minutes=20)
    test2.questions.add(q1, q4, q5)
    
    test3 = TestSet.objects.create(title="BBA Tarix kirish imtihoni", description="BBA imtihoni uchun namunaviy tarix savollari.", category="bba", duration_minutes=15)
    test3.questions.add(q2, q3, q5)

from .subject_utils import resolve_subject as _resolve_subject


@login_required
def center(request):
    seed_questions_if_needed()
    profile = ensure_profile_for_user(request.user)
    subject, subjects = _resolve_subject(request)

    # Filters
    category = request.GET.get('category', 'all')
    search_query = request.GET.get('search', '')

    tests = TestSet.objects.filter(is_random=False, is_archived=False, is_published=True)
    if subject:
        tests = tests.filter(subject=subject)
    tests = tests.order_by('-created_at')
    if category != 'all':
        tests = tests.filter(category=category)
    if search_query:
        tests = tests.filter(title__icontains=search_query)

    tests = list(tests)

    # Get statistics
    # One aggregate instead of loading every attempt row into Python to average it —
    # the old version got slower with each test a student took.
    stats = profile.attempts.aggregate(
        total=Count('id'),
        avg=Avg('score', filter=Q(is_completed=True)),
    )
    total_attempts = stats['total'] or 0
    avg_score = stats['avg'] or 0

    return render(request, 'tests_app/center.html', {
        'tests': tests,
        'subjects': subjects,
        'selected_subject': subject,
        'selected_category': category,
        'search_query': search_query,
        'total_attempts': total_attempts,
        'avg_score': avg_score,
        'profile': profile,
        'has_mock_test_access': profile.premium_mock_test_unlocked,
    })

@login_required
def start_test(request, test_id):
    test = get_object_or_404(TestSet, id=test_id)
    profile = ensure_profile_for_user(request.user)

    if test.is_premium and not profile.premium_mock_test_unlocked:
        messages.warning(request, "Bu test faqat premium (mock test tizimi) xaridorlariga ochiq. Avval premium sotib oling.")
        return redirect('premium:plans')

    attempt = Attempt.objects.create(profile=profile, test=test)

    # Initialize AttemptAnswer rows for all questions, honoring the teacher-defined order.
    for q in test.ordered_questions():
        AttemptAnswer.objects.create(attempt=attempt, question=q)

    return redirect('tests:screen', attempt_id=attempt.id)

@login_required
def start_random_test(request):
    seed_questions_if_needed()
    profile = ensure_profile_for_user(request.user)
    subject, _ = _resolve_subject(request)

    # Create virtual random test from the currently-selected subject's questions.
    questions = list(Question.objects.filter(subject=subject) if subject else Question.objects.all())
    if not questions:
        messages.info(request, "Bu fanda hali savollar yo'q.")
        return redirect('tests:center')

    random.shuffle(questions)
    questions_to_use = questions[:10]

    subject_name = subject.name if subject else "Tarix"
    test = TestSet.objects.create(
        title=f"Tasodifiy {subject_name} Testi",
        description="Tanlangan fandan tasodifiy tuzilgan savollar to'plami.",
        subject=subject,
        category="history",
        duration_minutes=10,
        is_random=True,
        is_premium=False,
    )
    test.questions.set(questions_to_use)
    
    attempt = Attempt.objects.create(profile=profile, test=test)
    for q in questions_to_use:
        AttemptAnswer.objects.create(attempt=attempt, question=q)

    return redirect('tests:screen', attempt_id=attempt.id)

@login_required
def start_mistakes_test(request):
    """Builds a fresh practice test from the questions this student has previously
    answered incorrectly (skipped ones excluded — those weren't real mistakes).
    Deduplicates and takes the most recent mistakes first."""
    profile = ensure_profile_for_user(request.user)
    subject, _ = _resolve_subject(request)

    wrong_answers = (AttemptAnswer.objects
                     .filter(attempt__profile=profile, attempt__is_completed=True, is_correct=False)
                     .select_related('question')
                     .order_by('-attempt__completed_at'))
    if subject:
        wrong_answers = wrong_answers.filter(question__subject=subject)

    seen = set()
    questions_to_use = []
    for ans in wrong_answers:
        if ans.question_id in seen or ans.is_skipped:
            continue
        seen.add(ans.question_id)
        questions_to_use.append(ans.question)
        if len(questions_to_use) >= 15:
            break

    if not questions_to_use:
        messages.info(request, "Bu fanda hali xato javoblaringiz yo'q. Avval bir nechta test yeching.")
        return redirect('tests:center')

    test = TestSet.objects.create(
        title="Xatolar ustida ishlash",
        description="Avval noto'g'ri javob bergan savollaringizdan tuzilgan mashq testi.",
        subject=subject,
        category="history",
        duration_minutes=max(5, len(questions_to_use)),
        is_random=True,
        is_premium=False,
    )
    test.questions.set(questions_to_use)

    attempt = Attempt.objects.create(profile=profile, test=test)
    for q in questions_to_use:
        AttemptAnswer.objects.create(attempt=attempt, question=q)

    return redirect('tests:screen', attempt_id=attempt.id)

@login_required
def revision_center(request):
    """Spaced-repetition deck (Feature 7): the student's still-unmastered wrong questions,
    filterable by subject/topic, retried inline until correct. Correct answers are graded
    server-side (revision_check) and never sent to the browser."""
    profile = ensure_profile_for_user(request.user)

    base = RevisionItem.objects.filter(profile=profile)
    active = (base.filter(mastered=False)
              .select_related('question', 'question__topic', 'subject')
              .prefetch_related('question__choices'))

    subject_slug = request.GET.get('subject', '')
    topic_id = request.GET.get('topic', '')
    if subject_slug:
        active = active.filter(subject__slug=subject_slug)
    if topic_id.isdigit():
        active = active.filter(question__topic_id=int(topic_id))

    # Deck payload for the client — questions + shuffled-in-DB-order choices, WITHOUT the
    # is_correct flag (grading is server-side only).
    deck = []
    for item in active[:50]:
        q = item.question
        entry = {
            'item_id': item.id,
            'question_id': q.id,
            'body': q.body,
            'type': q.question_type,
            'image': q.image.url if q.image else (q.image_url or ''),
            'explanation': q.explanation or '',
            'topic': q.topic.title if q.topic else '',
            'times_wrong': item.times_wrong,
            'inline': q.question_type in Question.SINGLE_ANSWER_TYPES,
            'choices': [{'id': c.id, 'text': c.text} for c in q.choices.all()] if q.question_type in Question.SINGLE_ANSWER_TYPES else [],
        }
        deck.append(entry)

    total = base.count()
    mastered = base.filter(mastered=True).count()
    subjects = Subject.objects.all()

    return render(request, 'tests_app/revision.html', {
        'deck': deck,
        'active_count': len(deck),
        'total': total,
        'mastered_count': mastered,
        'subjects': subjects,
        'selected_subject': subject_slug,
    })


@login_required
@require_POST
def revision_check(request, item_id):
    """Grade one revision answer (AJAX). Marks the item mastered on a correct answer or an
    explicit 'reveal & understood' for non-choice types."""
    item = get_object_or_404(RevisionItem.objects.select_related('question'), id=item_id, profile=request.user.profile)
    q = item.question
    action = request.POST.get('action', '')

    if action == 'master':  # non-choice types: student self-marks after seeing the answer
        item.mastered = True
        item.times_reviewed = F('times_reviewed') + 1
        item.last_reviewed_at = timezone.now()
        item.save(update_fields=['mastered', 'times_reviewed', 'last_reviewed_at', 'updated_at'])
        return JsonResponse({'ok': True, 'correct': True, 'mastered': True})

    choice_id = request.POST.get('choice_id')
    correct_choice = q.choices.filter(is_correct=True).first()
    is_correct = bool(choice_id and correct_choice and str(correct_choice.id) == str(choice_id))

    item.times_reviewed = F('times_reviewed') + 1
    item.last_reviewed_at = timezone.now()
    if is_correct:
        item.mastered = True  # retire from the active deck
    item.save(update_fields=['times_reviewed', 'last_reviewed_at', 'mastered', 'updated_at'])

    # AI mentor izohi: savolda tayyor izoh bo'lmasa, xato javobda AI'dan qisqa
    # tushuntirish so'raymiz. Savol boshiga bir marta generatsiya qilinib 7 kun
    # keshlanadi — bir xil savolga qayta-qayta AI chaqirilmaydi. AI umuman
    # ishlamasa (None) — izohsiz davom etadi, hech narsa buzilmaydi.
    explanation = q.explanation or ''
    if not is_correct and not explanation and correct_choice:
        cache_key = f'ai_expl:{q.id}'
        explanation = cache.get(cache_key) or ''
        if not explanation:
            from django.utils.html import strip_tags
            ai_text = ask_groq([
                {'role': 'system', 'content': (
                    "Sen o'quvchiga xatosini tushuntiradigan qisqa va aniq mentorsan. "
                    "Faqat o'zbek tilida, 2-3 jumla bilan javob ber. Formulalar yoki "
                    "keraksiz kirish so'zlarisiz, to'g'ridan-to'g'ri mohiyatni ayt.")},
                {'role': 'user', 'content': (
                    f"Savol: {strip_tags(q.body)[:600]}\n"
                    f"To'g'ri javob: {correct_choice.text[:200]}\n"
                    f"Nega aynan shu javob to'g'ri ekanini qisqa tushuntir.")},
            ], temperature=0.4, timeout=12)
            if ai_text:
                explanation = ai_text.strip()[:800]
                cache.set(cache_key, explanation, 7 * 24 * 3600)

    return JsonResponse({
        'ok': True,
        'correct': is_correct,
        'mastered': is_correct,
        'correct_choice_id': correct_choice.id if correct_choice else None,
        'explanation': explanation,
    })


@login_required
def screen(request, attempt_id):
    attempt = get_object_or_404(Attempt, id=attempt_id, profile=request.user.profile)
    if attempt.is_completed:
        return redirect('tests:feedback', attempt_id=attempt.id)

    answers = list(attempt.answers.all().order_by('id'))
    total_questions = len(answers)
    if total_questions == 0:
        return redirect('tests:center')

    q_idx = int(request.GET.get('q_idx', 1))
    if q_idx < 1:
        q_idx = 1
    elif q_idx > total_questions:
        q_idx = total_questions

    current_answer = answers[q_idx - 1]

    elapsed = timezone.now() - attempt.started_at
    duration = attempt.test.duration_minutes if attempt.test else 10
    seconds_left = max(0, duration * 60 - int(elapsed.total_seconds()))

    context = _question_screen_context(attempt, q_idx, current_answer, total_questions, seconds_left)

    # Support HTMX partial updates for fast navigation
    if request.headers.get('HX-Request'):
        return render(request, 'tests_app/partials/question_card.html', context)
        
    return render(request, 'tests_app/screen.html', context)

@login_required
def submit_answer(request, attempt_id):
    attempt = get_object_or_404(Attempt, id=attempt_id, profile=request.user.profile)
    if attempt.is_completed:
        logger = logging.getLogger(__name__)
        logger.warning("submit_answer called on completed Attempt %s by user %s", attempt.id, request.user.username)
        # If HTMX requested, instruct client to redirect to feedback; otherwise do a normal redirect
        if request.headers.get('HX-Request'):
            resp = redirect('tests:feedback', attempt_id=attempt.id)
            resp['HX-Redirect'] = resp['Location']
            return resp
        return redirect('tests:feedback', attempt_id=attempt.id)
        
    if request.method == 'POST':
        question_id = request.POST.get('question_id')
        q_idx = int(request.POST.get('q_idx', 1))

        answer = get_object_or_404(AttemptAnswer, attempt=attempt, question_id=question_id)
        question = answer.question

        if question.question_type == 'open_written':
            # Correctness for open-ended answers is determined by AI grading in finish(),
            # once every answer for the attempt is in — not here, one question at a time.
            sub_qs = question.sub_questions.all()
            if sub_qs:
                answer.open_answers = {
                    sq.label: request.POST.get(f'subanswer_{sq.label}', '').strip()
                    for sq in sub_qs
                    if request.POST.get(f'subanswer_{sq.label}', '').strip()
                }
            else:
                answer.text_answer = request.POST.get('text_answer', '').strip()
        elif question.question_type == 'matching':
            left_keys = [p.left_key for p in question.matching_pairs.all() if p.left_key]
            answer.matching_data = {
                key: request.POST.get(f'match_{key}', '')
                for key in left_keys
                if request.POST.get(f'match_{key}')
            }
            answer.grade()
        elif question.question_type == 'grouped_item':
            option_id = request.POST.get('group_option_id')
            answer.grouped_option = get_object_or_404(GroupOption, id=option_id, group=question.group) if option_id else None
            answer.grade()
        else:  # single_choice / image_based / table_based
            choice_id = request.POST.get('choice_id')
            answer.selected_choice = get_object_or_404(AnswerOption, id=choice_id, question_id=question_id) if choice_id else None
            answer.grade()
        answer.save()

        answers = list(attempt.answers.all().order_by('id'))
        total_questions = len(answers)
        if total_questions == 0:
            return redirect('tests:center')

        if q_idx >= total_questions:
            current_answer = answers[q_idx - 1]
            context = _question_screen_context(attempt, q_idx, current_answer, total_questions)
            return render(request, 'tests_app/partials/question_card.html', context)

        next_idx = q_idx + 1
        current_answer = answers[next_idx - 1]
        context = _question_screen_context(attempt, next_idx, current_answer, total_questions)

        return render(request, 'tests_app/partials/question_card.html', context)
        
    return HttpResponse(status=400)


def generate_ai_feedback(attempt_id):
    """Build and store the post-test AI analysis for one attempt.

    Runs off the request path (see core.background). Idempotent: if the feedback already
    exists it returns immediately, so a lazy re-trigger or a retry can never duplicate it.
    """
    attempt = (Attempt.objects
               .select_related('test__subject', 'profile__user')
               .filter(id=attempt_id, is_completed=True)
               .first())
    if attempt is None or AIFeedback.objects.filter(attempt_id=attempt_id).exists():
        return

    answers = list(attempt.answers.select_related('question__topic').all())
    total = len(answers) or 1
    correct = attempt.correct_answers
    skipped = attempt.skipped_answers
    score = attempt.score or 0
    subject_name = attempt.test.subject.name if attempt.test and attempt.test.subject else "Umumiy"

    # Unique real topics covered, split by actual correctness.
    weak_topics, strong_topics = [], []
    for ans in answers:
        topic_title = ans.question.topic.title if ans.question.topic else f"Umumiy {subject_name}"
        target = strong_topics if ans.is_correct else weak_topics
        if topic_title not in target:
            target.append(topic_title)
    strong_topics = [t for t in strong_topics if t not in weak_topics]

    groq_data = _build_ai_feedback_via_groq(answers, score, correct, total, subject_name=subject_name)
    if groq_data:
        overall_analysis = groq_data['umumiy_xulosa']
        recommendations = "\n".join(f"{i}. {step}" for i, step in enumerate(groq_data['keyingi_qadamlar'], start=1))
        roadmap = [
            {"step": i, "title": step, "duration": "15 daqiqa", "done": False}
            for i, step in enumerate(groq_data['keyingi_qadamlar'], start=1)
        ]
        ai_motivation = groq_data['motivatsiya']
        detailed_mistakes = groq_data['aniq_xatolar']
        final_weak_topics = groq_data['kuchsiz_mavzular'] or weak_topics
        final_strong_topics = groq_data['kuchli_tomonlar'] or strong_topics
    else:
        fallback = _build_ai_feedback_data(score, correct, skipped, total, weak_topics, strong_topics)
        overall_analysis = fallback['overall_analysis']
        recommendations = fallback['recommendations']
        roadmap = fallback['roadmap']
        ai_motivation = fallback['ai_motivation']
        detailed_mistakes = []
        final_weak_topics = weak_topics
        final_strong_topics = strong_topics

    try:
        AIFeedback.objects.create(
            attempt=attempt,
            overall_analysis=overall_analysis,
            weak_topics=", ".join(final_weak_topics) if final_weak_topics else "Yo'q (barcha mavzular o'zlashtirildi)",
            strong_topics=", ".join(final_strong_topics) if final_strong_topics else "Hozircha yo'q",
            recommendations=recommendations,
            predicted_score=_grade_band(score),
            roadmap=roadmap,
            ai_motivation=ai_motivation,
            detailed_mistakes=detailed_mistakes,
        )
    except IntegrityError:
        return  # another worker won the race; its feedback is already stored

    test_title = attempt.test.title if attempt.test else "Test"
    Notification.objects.create(
        profile=attempt.profile,
        title="Imtihon yakunlandi",
        message=f"'{test_title}' testi yuzasidan AI tahlili tayyor bo'ldi. Natijangiz: {score:.0f}%",
        type='system',
    )


def _dispatch_ai_feedback(attempt_id):
    """Queue generation at most once per attempt at a time.

    The job is dispatched via transaction.on_commit: the background thread uses its own
    database connection, so starting it before the current transaction commits means it
    either blocks on the write lock (SQLite) or simply cannot see the attempt yet
    (PostgreSQL) and silently gives up. on_commit guarantees the row is durable and
    visible first — and keeps this correct if ATOMIC_REQUESTS is ever enabled.

    The cache lock stops the auto-refreshing feedback page from piling up duplicate jobs
    while one is already in flight.
    """
    if AIFeedback.objects.filter(attempt_id=attempt_id).exists():
        return
    lock_key = f'ai_feedback_lock:{attempt_id}'
    if cache.add(lock_key, '1', 180):  # only the first caller wins the lock
        transaction.on_commit(lambda: background.submit(generate_ai_feedback, attempt_id))


@login_required
@require_POST
def finish(request, attempt_id):
    attempt = get_object_or_404(Attempt, id=attempt_id, profile=request.user.profile)
    if attempt.is_completed:
        return redirect('tests:feedback', attempt_id=attempt.id)

    answers = list(
        attempt.answers
        .select_related('question__topic', 'selected_choice', 'grouped_option', 'question__correct_group_option')
        .prefetch_related('question__choices', 'question__matching_pairs')
    )
    total = len(answers)
    if total == 0:
        return redirect('tests:center')

    # Open-ended answers aren't graded yet (submit_answer just stores the text) — grade them
    # all in one batched Groq call now that the whole attempt is in. A question with no
    # SubQuestions is graded exactly as before (single text_answer vs reference_answer); a
    # question WITH SubQuestions grades each lettered part separately and is only counted
    # correct overall if every part that has one was answered and graded correct.
    open_written_answers = [a for a in answers if a.question.question_type == 'open_written' and not a.is_skipped]
    grading_items = []
    item_targets = []  # (answer, sub_question_or_None), aligned 1:1 with grading_items
    for a in open_written_answers:
        sub_qs = list(a.question.sub_questions.all())
        if sub_qs:
            submitted = a.open_answers or {}
            for sq in sub_qs:
                student_answer = submitted.get(sq.label, '')
                if not student_answer.strip():
                    continue
                grading_items.append({
                    'question_text': f"{a.question.body} — qism {sq.label})",
                    'reference_answer': sq.reference_answer,
                    'student_answer': student_answer,
                })
                item_targets.append((a, sq))
        else:
            grading_items.append({
                'question_text': a.question.body,
                'reference_answer': a.question.reference_answer,
                'student_answer': a.text_answer,
            })
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
                    continue  # every sub-part was left blank; is_correct stays False (skipped/wrong)
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
    
    # Award gamification items
    profile = request.user.profile
    xp_awarded = correct * 50
    coins_awarded = correct * 5

    level_up = profile.add_xp(xp_awarded)
    profile.add_coins(coins_awarded)
    profile.update_streak()

    # Mirror the earned XP into the per-subject score so the subject leaderboard reflects it.
    subject = attempt.test.subject if attempt.test else None
    if subject and xp_awarded:
        score_row, _ = SubjectScore.objects.get_or_create(profile=profile, subject=subject)
        score_row.xp = F('xp') + xp_awarded
        score_row.save(update_fields=['xp'])
    
    # Spaced-repetition deck (Feature 7): park freshly-wrong questions, and retire any
    # deck items the student just answered correctly. Skipped answers aren't real mistakes.
    for ans in answers:
        if ans.is_skipped:
            continue
        if not ans.is_correct:
            item, created = RevisionItem.objects.get_or_create(
                profile=profile, question=ans.question,
                defaults={'subject': ans.question.subject},
            )
            if not created:
                item.times_wrong = F('times_wrong') + 1
                item.mastered = False
                item.save(update_fields=['times_wrong', 'mastered', 'updated_at'])
        else:
            # answered correctly -> master it if it was in the deck
            RevisionItem.objects.filter(profile=profile, question=ans.question, mastered=False).update(
                mastered=True, times_reviewed=F('times_reviewed') + 1, last_reviewed_at=timezone.now())

    # Analytics radar/dashboard is cached per profile — invalidate so it reflects this test.
    from analytics.services import bust_cache as _bust_analytics
    _bust_analytics(profile.pk)

    # Increment mission counter
    today = timezone.localdate()
    p_missions = ProfileMission.objects.filter(profile=profile, date=today, mission__action_type='test')
    for pm in p_missions:
        pm.current_count += 1
        if pm.current_count >= pm.mission.target_count:
            if not pm.is_completed:
                pm.is_completed = True
                profile.add_xp(pm.mission.xp_reward)
                profile.add_coins(pm.mission.coin_reward)
                # Create notification
                Notification.objects.create(
                    profile=profile,
                    title="Vazifa bajarildi!",
                    message=f"'{pm.mission.title}' vazifasi uchun +{pm.mission.xp_reward} XP va +{pm.mission.coin_reward} tanga oldingiz!",
                    type='mission'
                )
        pm.save()
        
    # The AI analysis is generated OFF the request path. The Groq call has a 20s timeout
    # (60s for the Ollama fallback), so doing it here used to hold a worker hostage on
    # every single submission — a few concurrent finishes could stall the whole site.
    # The feedback page shows a "preparing" state and re-triggers this if it's still
    # missing, so the result is never lost.
    _dispatch_ai_feedback(attempt.id)

    return redirect('tests:feedback', attempt_id=attempt.id)

@login_required
def feedback(request, attempt_id):
    attempt = get_object_or_404(Attempt, id=attempt_id, profile=request.user.profile)
    if not attempt.is_completed:
        return redirect('tests:screen', attempt_id=attempt.id)

    ai_feedback = AIFeedback.objects.filter(attempt=attempt).first()
    if not ai_feedback:
        # The analysis is produced in the background, so a request landing here before it
        # finishes gets a friendly "still preparing" page that auto-refreshes. We also
        # re-dispatch (guarded by a cache lock) so a job that was shed under load, or lost
        # to a restart, is regenerated instead of leaving the attempt without feedback.
        _dispatch_ai_feedback(attempt.id)
        return render(request, 'tests_app/feedback_pending.html', {'attempt': attempt})

    strong_topics = [t.strip() for t in ai_feedback.strong_topics.split(',') if t.strip()]
    weak_topics = [t.strip() for t in ai_feedback.weak_topics.split(',') if t.strip()]

    # Per-question review: for each answered question, surface right/wrong/skipped, the
    # correct answer (for choice-based types) and the teacher's explanation — so the
    # student actually learns from mistakes instead of just seeing a score.
    review_items = []
    answers = (attempt.answers
               .select_related('question', 'selected_choice')
               .prefetch_related('question__choices')
               .order_by('question_id'))
    for ans in answers:
        q = ans.question
        correct_answer = ''
        your_answer = ''
        if q.question_type in Question.SINGLE_ANSWER_TYPES:
            correct_opts = [c.text for c in q.choices.all() if c.is_correct]
            correct_answer = ', '.join(correct_opts)
            your_answer = ans.selected_choice.text if ans.selected_choice else ''
        review_items.append({
            'question': q,
            'is_correct': ans.is_correct,
            'is_skipped': ans.is_skipped,
            'your_answer': your_answer,
            'correct_answer': correct_answer,
            'explanation': q.explanation,
            'grading_note': ans.ai_grading_note,
        })

    return render(request, 'tests_app/feedback.html', {
        'attempt': attempt,
        'ai': ai_feedback,
        'roadmap': ai_feedback.roadmap,
        'strong_topics': strong_topics,
        'weak_topics': weak_topics,
        'review_items': review_items,
        'profile': attempt.profile
    })

@login_required
def history(request):
    # select_related('test'): the template reads attempt.test.title/category on every row,
    # which was one extra query per attempt (a classic N+1 that grew with the student's
    # history). Paginated too, so a heavy user doesn't pull thousands of rows per page load.
    attempts = (Attempt.objects
                .filter(profile=request.user.profile, is_completed=True)
                .select_related('test')
                .order_by('-completed_at'))
    page_obj = Paginator(attempts, 25).get_page(request.GET.get('page'))
    return render(request, 'tests_app/history.html', {
        'attempts': page_obj,
        'page_obj': page_obj,
    })
