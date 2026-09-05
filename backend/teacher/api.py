"""JSON API mirroring teacher/views.py for the Next.js frontend — see accounts/api.py for
the overall JWT-API pattern. The question wizard (question_add/question_detail) is the one
place that departs from the flat-POST-array convention the Django form used: the frontend
sends type-specific rows as nested JSON in `type_data`, which `_apply_type_data_json`
applies with exactly the same rules as the template version.

Bu faylda Feature 1 (o'qituvchi-orqali-sinf) endpointlari ham bor — pastdagi
"SINF" bo'limi.
"""
import json

from django.db.models import Avg, Count, Max, Q
from django.core.exceptions import ValidationError
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.html import strip_tags
from rest_framework.decorators import api_view, parser_classes, permission_classes
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.models import Profile, ensure_profile_for_user
from accounts.permissions import IsTeacher
from accounts.referrals import ensure_referral_code, get_referral_link, get_telegram_deep_link
from games.models import Game, GameItem
from learning.models import Lesson, Topic
from tests_app.models import (
    AcceptedAnswer, AnswerOption, Attempt, AttemptAnswer, ExamSection, GroupOption,
    MatchingPair, Question, QuestionGroup, SubQuestion, TestSet,
)

from .forms import GameForm, LessonForm, QuestionBaseForm, TestInfoForm
from .models import TeacherProfile, TeacherStudent


# ---- IDOR helpers: everything is scoped to the current user's own content ----
def _own_test(request, pk):
    return get_object_or_404(TestSet, pk=pk, created_by=request.user)


def _own_lesson(request, pk):
    return get_object_or_404(Lesson, pk=pk, created_by=request.user)


def _own_game(request, pk):
    return get_object_or_404(Game, pk=pk, created_by=request.user)


def _form_errors(form):
    return {field: [str(e) for e in errors] for field, errors in form.errors.items()}


# ============================================================ DASHBOARD
@api_view(['GET'])
@permission_classes([IsTeacher])
def dashboard_api(request):
    tests = TestSet.objects.filter(created_by=request.user, is_random=False)
    lessons = Lesson.objects.filter(created_by=request.user)
    games = Game.objects.filter(created_by=request.user)
    recent = (Attempt.objects
              .filter(test__created_by=request.user, is_completed=True)
              .select_related('profile__user', 'test')
              .order_by('-started_at')[:10])
    return Response({
        'stats': {
            'tests': tests.count(),
            'published_tests': tests.filter(is_published=True).count(),
            'lessons': lessons.count(),
            'games': games.count(),
            'attempts': Attempt.objects.filter(test__created_by=request.user, is_completed=True).count(),
        },
        'recent_attempts': [{
            'id': a.id,
            'student': a.profile.user.get_full_name() or a.profile.user.username,
            'test_title': a.test.title if a.test else '—',
            'score': a.score,
            'started_at': a.started_at,
        } for a in recent],
    })


# ============================================================ TESTS: list + info
@api_view(['GET'])
@permission_classes([IsTeacher])
def test_list_api(request):
    tests = (TestSet.objects.filter(created_by=request.user, is_random=False)
             .select_related('subject').order_by('-updated_at'))
    return Response({'results': [{
        'id': t.id,
        'title': t.title,
        'subject': t.subject.name if t.subject else None,
        'category': t.category,
        'status_label': 'Nashr etilgan' if t.is_published else ('Arxiv' if t.is_archived else 'Qoralama'),
        'is_published': t.is_published,
        'is_archived': t.is_archived,
        'questions_count': t.questions.count(),
        'updated_at': t.updated_at,
    } for t in tests]})


@api_view(['POST'])
@permission_classes([IsTeacher])
def test_create_api(request):
    form = TestInfoForm(request.data)
    if not form.is_valid():
        return Response({'errors': _form_errors(form)}, status=400)
    test = form.save(commit=False)
    test.created_by = request.user
    test.is_published = False
    test.save()
    return Response({'id': test.id})


@api_view(['GET', 'POST', 'PUT'])
@permission_classes([IsTeacher])
def test_info_api(request, pk):
    test = _own_test(request, pk)
    if request.method == 'GET':
        return Response({
            'id': test.id, 'title': test.title, 'subject_id': test.subject_id,
            'category': test.category, 'duration_minutes': test.duration_minutes,
            'description': test.description,
        })
    form = TestInfoForm(request.data, instance=test)
    if not form.is_valid():
        return Response({'errors': _form_errors(form)}, status=400)
    form.save()
    return Response({'ok': True})


# ============================================================ TESTS: builder
def _question_payload(q):
    """Bitta savolning to'liq (tur-spetsifik bolalari bilan) tasviri — bilder va
    oldindan ko'rish ekranlari shundan foydalanadi."""
    group = None
    if q.group_id:
        opts = list(q.group.options.all())
        correct_idx = next((i for i, o in enumerate(opts) if o.id == q.correct_group_option_id), 0)
        group = {
            'instruction': q.group.instruction,
            'options': [{'label': o.label, 'text': o.text} for o in opts],
            'correct_index': correct_idx,
        }
    return {
        'id': q.id,
        'question_type': q.question_type,
        'body': q.body,
        'difficulty': q.difficulty,
        'points': q.points,
        'explanation': q.explanation,
        'image': q.image.url if q.image else None,
        'image_position': q.image_position,
        'options': [{'text': c.text, 'is_correct': c.is_correct} for c in q.choices.all()],
        'pairs': [{'left_key': p.left_key, 'left_text': p.left_text,
                   'right_key': p.right_key, 'right_text': p.right_text}
                  for p in q.matching_pairs.all()],
        'sub_questions': [{'label': s.label, 'text': s.text,
                           'reference_answer': s.reference_answer}
                          for s in q.sub_questions.all()],
        'reference_answer': q.reference_answer,
        'group': group,
        # --- CEFR maydonlari (oddiy savolda bo'sh) ---
        'section': q.section_id,
        'exam_number': q.exam_number,
        'max_words': q.max_words,
        'min_words': q.min_words,
        'tfng_style': q.tfng_style,
        'accepted_answers': [a.text for a in q.accepted_answers.all()],
        # Savol mavjud bankka ulangan bo'lsa, tahrirlashda o'sha bank tanlab turadi.
        'reuse_group_id': q.group_id if (q.group_id and q.group.questions.count() > 1) else None,
        'reuse_correct_label': q.correct_group_option.label if q.correct_group_option else '',
    }


@api_view(['GET'])
@permission_classes([IsTeacher])
def test_build_api(request, pk):
    test = _own_test(request, pk)
    return Response({
        'test': {'id': test.id, 'title': test.title},
        'questions': [_question_payload(q) for q in test.ordered_questions()],
        'type_choices': Question.QUESTION_TYPE_CHOICES,
        'difficulty_choices': Question.DIFFICULTY_CHOICES,
        'single_types': list(Question.SINGLE_ANSWER_TYPES),
    })


def _apply_type_data_json(question, test, data):
    """Same rules as teacher/views.py's _apply_type_data, reading nested JSON instead of
    flat POST arrays: skip a row with a blank primary text field, auto-letter missing
    keys/labels, wipe-and-rebuild children, and for grouped_item create-then-repoint-then-
    delete-old-group (Question.group is on_delete=CASCADE, so order matters)."""
    qtype = question.question_type
    question.choices.all().delete()
    question.matching_pairs.all().delete()
    question.sub_questions.all().delete()
    question.accepted_answers.all().delete()

    old_group = question.group
    if qtype != 'grouped_item' and question.group_id:
        question.group = None
        question.correct_group_option = None
        question.save(update_fields=['group', 'correct_group_option'])
        if old_group and old_group.questions.count() == 0:
            old_group.delete()

    if qtype in Question.SINGLE_ANSWER_TYPES:
        options = data.get('options') or []
        correct_index = data.get('correct_index')
        for i, row in enumerate(options):
            text = (row.get('text') or '').strip()
            if not text:
                continue
            AnswerOption.objects.create(
                question=question, text=text, is_correct=(i == correct_index),
            )

    elif qtype == 'matching':
        for i, row in enumerate(data.get('pairs') or []):
            right_text = (row.get('right_text') or '').strip()
            if not right_text:
                continue
            MatchingPair.objects.create(
                question=question,
                left_key=(row.get('left_key') or '').strip(),
                left_text=(row.get('left_text') or '').strip(),
                right_key=(row.get('right_key') or '').strip() or chr(97 + i),
                right_text=right_text,
                order=i,
            )

    elif qtype == 'open_written':
        question.reference_answer = (data.get('reference_answer') or '').strip()
        question.save(update_fields=['reference_answer'])
        for i, row in enumerate(data.get('sub_questions') or []):
            text = (row.get('text') or '').strip()
            if not text:
                continue
            SubQuestion.objects.create(
                question=question,
                label=(row.get('label') or '').strip() or chr(97 + i),
                text=text,
                reference_answer=(row.get('reference_answer') or '').strip(),
                order=i,
            )

    elif qtype in Question.TEXT_INPUT_TYPES:
        # Bo'shliqli savol uchun bir nechta maqbul javob bo'lishi mumkin
        # ("forest" va "the forest"); TRUE/FALSE/NOT GIVEN uchun esa bittasi.
        for i, row in enumerate(data.get('accepted_answers') or []):
            text = (row.get('text') if isinstance(row, dict) else row) or ''
            text = text.strip()
            if not text:
                continue
            AcceptedAnswer.objects.create(question=question, text=text, order=i)

    elif qtype == 'grouped_item':
        # Guruhlangan savolning javob banki `type_data.group` ichida keladi.
        group_data = data.get('group') or data

        # CEFR'da bitta bank (A-F) bir nechta savolga xizmat qiladi — masalan 15-20
        # abzatslar bitta sarlavhalar ro'yxatidan tanlanadi. Shuning uchun mavjud bankni
        # qayta ishlatish mumkin: `group_id` berilsa, yangisi yaratilmaydi.
        existing_id = group_data.get('group_id')
        if existing_id:
            group = get_object_or_404(QuestionGroup, pk=existing_id, test_set=test)
            correct_label = str(group_data.get('correct_label') or '').strip().upper()
            question.group = group
            question.correct_group_option = group.options.filter(label__iexact=correct_label).first()
            question.save(update_fields=['group', 'correct_group_option'])
            if old_group and old_group.pk != group.pk and old_group.questions.count() == 0:
                old_group.delete()
            return

        group = QuestionGroup.objects.create(
            test_set=test,
            instruction=(group_data.get('instruction') or '').strip() or 'Mos javobni tanlang',
        )
        correct_index = group_data.get('correct_index')
        correct_opt = None
        for i, row in enumerate(group_data.get('options') or []):
            text = (row.get('text') or '').strip()
            if not text:
                continue
            opt = GroupOption.objects.create(
                group=group,
                label=(row.get('label') or '').strip() or chr(65 + i),
                text=text,
                order=i,
            )
            if i == correct_index:
                correct_opt = opt
        question.group = group
        question.correct_group_option = correct_opt
        question.save(update_fields=['group', 'correct_group_option'])
        if old_group and old_group.pk != group.pk and old_group.questions.count() == 0:
            old_group.delete()


def _reject_foreign_section(question, test):
    """Savol faqat O'Z testining partiga ulanishi mumkin.

    `QuestionBaseForm` ModelForm bo'lgani uchun `section` maydonining standart tanlovi —
    bazadagi HAMMA part. Tekshiruvsiz o'qituvchi so'rovni qo'lda o'zgartirib, savolini
    boshqa birovning testidagi partga bog'lab qo'yishi mumkin edi."""
    if question.section_id and question.section.test_set_id != test.id:
        return Response({'errors': {'section': ["Bu part boshqa testga tegishli."]}}, status=400)
    return None


def _type_data(request):
    """`type_data` FormData orqali kelganda satr bo'ladi, JSON orqali kelganda lug'at."""
    raw = request.data.get('type_data') or '{}'
    if isinstance(raw, str):
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            return {}
    return raw


@api_view(['POST'])
@permission_classes([IsTeacher])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def question_add_api(request, pk):
    test = _own_test(request, pk)
    form = QuestionBaseForm(request.data, request.FILES)
    if not form.is_valid():
        return Response({'errors': _form_errors(form)}, status=400)

    question = form.save(commit=False)
    # A question inherits its subject from the test it's created in, so per-subject
    # filtering and the subject leaderboard work without asking the teacher again.
    question.subject = test.subject
    rejected = _reject_foreign_section(question, test)
    if rejected:
        return rejected
    question.save()
    _apply_type_data_json(question, test, _type_data(request))

    test.questions.add(question)
    order = list(test.question_order or [])
    order.append(question.id)
    test.question_order = order
    test.save(update_fields=['question_order'])
    return Response({'id': question.id})


@api_view(['GET', 'POST', 'PUT'])
@permission_classes([IsTeacher])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def question_detail_api(request, pk, qid):
    test = _own_test(request, pk)
    question = get_object_or_404(Question, pk=qid, test_sets=test)
    if request.method == 'GET':
        return Response(_question_payload(question))

    form = QuestionBaseForm(request.data, request.FILES, instance=question)
    if not form.is_valid():
        return Response({'errors': _form_errors(form)}, status=400)
    question = form.save(commit=False)
    rejected = _reject_foreign_section(question, test)
    if rejected:
        return rejected
    question.save()
    _apply_type_data_json(question, test, _type_data(request))
    return Response({'ok': True})


@api_view(['POST', 'DELETE'])
@permission_classes([IsTeacher])
def question_delete_api(request, pk, qid):
    test = _own_test(request, pk)
    question = get_object_or_404(Question, pk=qid, test_sets=test)
    test.questions.remove(question)
    test.question_order = [q for q in (test.question_order or []) if q != question.id]
    test.save(update_fields=['question_order'])
    if question.test_sets.count() == 0:
        question.delete()
    return Response({'ok': True})


@api_view(['POST'])
@permission_classes([IsTeacher])
def question_reorder_api(request, pk):
    test = _own_test(request, pk)
    try:
        order = [int(x) for x in (request.data.get('order') or [])]
    except (TypeError, ValueError):
        return Response({'error': "Noto'g'ri format"}, status=400)
    valid_ids = set(test.questions.values_list('id', flat=True))
    test.question_order = [qid for qid in order if qid in valid_ids]
    test.save(update_fields=['question_order'])
    return Response({'ok': True})


@api_view(['GET'])
@permission_classes([IsTeacher])
def test_preview_api(request, pk):
    test = _own_test(request, pk)
    return Response({'questions': [_question_payload(q) for q in test.ordered_questions()]})


@api_view(['POST'])
@permission_classes([IsTeacher])
def test_publish_api(request, pk):
    test = _own_test(request, pk)
    if test.questions.count() == 0:
        return Response({'error': "Bo'sh testni nashr etib bo'lmaydi — avval savol qo'shing."}, status=400)
    test.is_published = not test.is_published
    if test.is_published:
        test.is_archived = False
    test.save()
    return Response({'is_published': test.is_published})


@api_view(['POST'])
@permission_classes([IsTeacher])
def test_delete_api(request, pk):
    test = _own_test(request, pk)
    # Urinishlar bor testni o'chirish natijalarni yo'q qilardi — o'rniga arxivlanadi.
    if test.attempts.exists():
        test.is_archived = True
        test.is_published = False
        test.save()
        return Response({'archived': True})
    test.delete()
    return Response({'deleted': True})


# ============================================================ TESTS: results + grading
@api_view(['GET'])
@permission_classes([IsTeacher])
def test_results_api(request, pk):
    test = _own_test(request, pk)
    attempts = (test.attempts.filter(is_completed=True)
                .select_related('profile__user').order_by('-started_at'))
    stats = []
    for q in test.ordered_questions():
        answers = AttemptAnswer.objects.filter(attempt__test=test, question=q, attempt__is_completed=True)
        total = answers.count()
        correct = answers.filter(is_correct=True).count()
        stats.append({
            'question_id': q.id, 'body': q.body, 'total': total, 'correct': correct,
            'pct': round(correct / total * 100) if total else 0,
        })
    return Response({
        'attempts': [{
            'id': a.id,
            'student': a.profile.user.get_full_name() or a.profile.user.username,
            'score': a.score,
            'started_at': a.started_at,
        } for a in attempts],
        'stats': stats,
    })


@api_view(['GET', 'POST'])
@permission_classes([IsTeacher])
def attempt_grade_api(request, pk, attempt_id):
    test = _own_test(request, pk)
    attempt = get_object_or_404(Attempt, pk=attempt_id, test=test)
    open_answers = attempt.answers.filter(question__question_type='open_written').select_related('question')

    if request.method == 'POST':
        grades = request.data.get('grades') or {}
        for ans in open_answers:
            if str(ans.id) in grades:
                ans.is_correct = bool(grades[str(ans.id)])
                ans.save(update_fields=['is_correct'])
        _recompute_attempt(attempt)
        return Response({'ok': True})

    return Response({'answers': [{
        'id': a.id,
        'question_body': a.question.body,
        'question_type': a.question.question_type,
        'text_answer': a.text_answer,
        'open_answers': a.open_answers,
        'is_correct': a.is_correct,
    } for a in open_answers]})


def _recompute_attempt(attempt):
    answers = list(attempt.answers.all())
    total = len(answers)
    correct = sum(1 for a in answers if a.is_correct)
    skipped = sum(1 for a in answers if a.is_skipped)
    attempt.correct_answers = correct
    attempt.wrong_answers = total - correct - skipped
    attempt.skipped_answers = skipped
    attempt.score = round(correct / total * 100, 1) if total else 0
    attempt.save(update_fields=['correct_answers', 'wrong_answers', 'skipped_answers', 'score'])


@api_view(['GET'])
@permission_classes([IsTeacher])
def topics_api(request):
    return Response({'results': [{'id': t.id, 'title': t.title} for t in Topic.objects.all()]})


# ============================================================ LESSONS
@api_view(['GET'])
@permission_classes([IsTeacher])
def lesson_list_api(request):
    lessons = (Lesson.objects.filter(created_by=request.user)
               .select_related('topic').order_by('-updated_at'))
    return Response({'results': [{
        'id': l.id, 'title': l.title,
        'topic': l.topic.title if l.topic else None,
        'is_published': l.is_published,
        'updated_at': l.updated_at,
    } for l in lessons]})


@api_view(['POST'])
@permission_classes([IsTeacher])
def lesson_create_api(request):
    form = LessonForm(request.data)
    if not form.is_valid():
        return Response({'errors': _form_errors(form)}, status=400)
    lesson = form.save(commit=False)
    lesson.created_by = request.user
    lesson.is_published = bool(request.data.get('publish'))
    lesson.save()
    return Response({'id': lesson.id})


@api_view(['GET', 'POST', 'PUT', 'DELETE'])
@permission_classes([IsTeacher])
def lesson_edit_api(request, pk):
    lesson = _own_lesson(request, pk)
    if request.method == 'DELETE':
        lesson.delete()
        return Response({'deleted': True})
    if request.method == 'GET':
        return Response({
            'id': lesson.id, 'topic_id': lesson.topic_id, 'title': lesson.title,
            'content': lesson.content, 'video_url': lesson.video_url,
            'order': lesson.order, 'is_published': lesson.is_published,
        })
    form = LessonForm(request.data, instance=lesson)
    if not form.is_valid():
        return Response({'errors': _form_errors(form)}, status=400)
    lesson = form.save(commit=False)
    lesson.is_published = bool(request.data.get('publish'))
    lesson.save()
    return Response({'ok': True})


@api_view(['POST'])
@permission_classes([IsTeacher])
def lesson_delete_api(request, pk):
    _own_lesson(request, pk).delete()
    return Response({'deleted': True})


# ============================================================ GAMES
@api_view(['GET'])
@permission_classes([IsTeacher])
def game_list_api(request):
    games = (Game.objects.filter(created_by=request.user)
             .select_related('subject').order_by('-updated_at'))
    return Response({'results': [{
        'id': g.id, 'title': g.title,
        'game_type': g.get_game_type_display(),
        'is_published': g.is_published,
        'items_count': g.items.count(),
        'updated_at': g.updated_at,
    } for g in games]})


@api_view(['POST'])
@permission_classes([IsTeacher])
def game_create_api(request):
    form = GameForm(request.data)
    if not form.is_valid():
        return Response({'errors': _form_errors(form)}, status=400)
    game = form.save(commit=False)
    game.created_by = request.user
    game.save()
    return Response({'id': game.id})


@api_view(['GET', 'POST', 'PUT', 'DELETE'])
@permission_classes([IsTeacher])
def game_edit_api(request, pk):
    game = _own_game(request, pk)
    if request.method == 'DELETE':
        game.delete()
        return Response({'deleted': True})
    if request.method == 'GET':
        return Response({
            'id': game.id, 'title': game.title, 'game_type': game.game_type,
            'subject_id': game.subject_id, 'description': game.description,
            'is_published': game.is_published,
            'items': [{'front': it.front_text, 'back': it.back_text} for it in game.items.all()],
        })

    form = GameForm(request.data, instance=game)
    if not form.is_valid():
        return Response({'errors': _form_errors(form)}, status=400)
    form.save()

    # Elementlar to'liq almashtiriladi (wipe-and-rebuild) — tahrirda tartib va
    # o'chirilgan qatorlar bilan ovora bo'lmaslik uchun.
    game.items.all().delete()
    for i, row in enumerate(request.data.get('items') or []):
        front = (row.get('front') or '').strip()
        back = (row.get('back') or '').strip()
        if front and back:
            GameItem.objects.create(game=game, front_text=front, back_text=back, order=i)

    game.is_published = bool(request.data.get('publish'))
    game.save(update_fields=['is_published'])
    return Response({'ok': True})


@api_view(['POST'])
@permission_classes([IsTeacher])
def game_delete_api(request, pk):
    _own_game(request, pk).delete()
    return Response({'deleted': True})


@api_view(['POST'])
@permission_classes([IsTeacher])
def game_from_test_api(request, pk):
    """Generate a flashcards game from a test: each single-answer question's body becomes
    the front, its correct option the back."""
    test = _own_test(request, pk)
    game = Game.objects.create(
        title=f'{test.title} — flesh-kartalar', game_type='flashcards',
        subject=test.subject, created_by=request.user,
        description='Testdan avtomatik yaratilgan flesh-kartalar.',
    )
    order = 0
    for q in test.ordered_questions():
        if q.question_type in Question.SINGLE_ANSWER_TYPES:
            correct = q.choices.filter(is_correct=True).first()
            if correct:
                GameItem.objects.create(
                    game=game, front_text=strip_tags(q.body)[:500],
                    back_text=correct.text[:500], order=order,
                )
                order += 1
    if order == 0:
        game.delete()
        return Response({'error': "Bu testda flesh-karta uchun mos (variantli) savollar topilmadi."}, status=400)
    return Response({'game_id': game.id, 'cards': order})


# ============================================================ SINF (Feature 1)
# Sinf dashboardida "zaif mavzu" deb hisoblanadigan chegara.
WEAK_THRESHOLD = 60
# Mavzu statistikasi ishonchli bo'lishi uchun kerak bo'lgan minimal javoblar soni.
MIN_ANSWERS_PER_TOPIC = 3


def _teacher_or_403(request):
    profile = ensure_profile_for_user(request.user)
    if not (profile.is_teacher or profile.is_superadmin):
        return None, Response({'detail': "Bu bo'lim faqat o'qituvchilar uchun."}, status=403)
    return profile, None


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def register_teacher(request):
    """O'z-o'ziga xizmat: foydalanuvchi o'qituvchi bo'lib ro'yxatdan o'tadi.

    Rolni ham shu yerda beramiz — MVP'da moderatsiya yo'q (spec: "faqat self-service").
    Qayta chaqirilsa ma'lumot yangilanadi, dublikat yaratilmaydi.
    """
    profile = ensure_profile_for_user(request.user)
    full_name = (request.data.get('full_name') or '').strip()
    if not full_name:
        return Response({'detail': 'Ism-familiya kiritilishi shart.'}, status=400)

    tp, _ = TeacherProfile.objects.update_or_create(
        profile=profile,
        defaults={
            'full_name': full_name[:120],
            'subject': (request.data.get('subject') or '').strip()[:80],
            'institution': (request.data.get('institution') or '').strip()[:160],
        },
    )
    if profile.role != 'superadmin':
        profile.role = 'teacher'
        profile.save(update_fields=['role'])

    return Response({
        'ok': True,
        'full_name': tp.full_name,
        'subject': tp.subject,
        'institution': tp.institution,
        'referral_code': ensure_referral_code(profile),
        'referral_link': get_referral_link(profile, request),
        'telegram_link': get_telegram_deep_link(profile),
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def referral_link(request):
    """O'qituvchi sinfga tarqatadigan havolalar."""
    profile, err = _teacher_or_403(request)
    if err:
        return err
    return Response({
        'referral_code': ensure_referral_code(profile),
        'referral_link': get_referral_link(profile, request),
        # Telegram deep-link afzal: o'quvchi botdan chiqib ketmaydi (spec, Risks).
        'telegram_link': get_telegram_deep_link(profile),
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def class_dashboard(request):
    """Sinf kesimi: o'quvchilar ro'yxati va mavzular bo'yicha zaif joylar.

    MVP'da real-time so'rov (spec shunday ruxsat beradi) — `topic_weakness_cache`
    jadvali v2 uchun. Barcha og'ir hisob ikkita guruhlangan so'rovda bajariladi,
    o'quvchilar soniga qarab so'rovlar ko'paymaydi.
    """
    profile, err = _teacher_or_403(request)
    if err:
        return err

    links = (TeacherStudent.objects
             .filter(teacher=profile)
             .select_related('student__user')
             .order_by('-joined_at'))
    student_ids = [l.student_id for l in links]

    per_student = {
        row['profile_id']: row for row in (
            Attempt.objects
            .filter(profile_id__in=student_ids, is_completed=True)
            .values('profile_id')
            .annotate(tests=Count('id'), avg=Avg('score'), last=Max('completed_at'))
        )
    } if student_ids else {}

    topic_rows = (
        AttemptAnswer.objects
        .filter(attempt__profile_id__in=student_ids, attempt__is_completed=True,
                question__topic__isnull=False)
        .values('question__topic_id', 'question__topic__title')
        .annotate(
            answers=Count('id'),
            correct=Count('id', filter=Q(is_correct=True)),
            students=Count('attempt__profile_id', distinct=True),
        )
        .order_by()
    ) if student_ids else []

    topics = []
    for r in topic_rows:
        if r['answers'] < MIN_ANSWERS_PER_TOPIC:
            continue
        pct = round(r['correct'] / r['answers'] * 100)
        topics.append({
            'topic_id': r['question__topic_id'],
            'title': r['question__topic__title'],
            'avg_score': pct,
            'answers': r['answers'],
            'student_count': r['students'],
            'is_weak': pct < WEAK_THRESHOLD,
        })
    topics.sort(key=lambda t: t['avg_score'])

    students = []
    for link in links:
        st = per_student.get(link.student_id, {})
        students.append({
            'student_id': link.student_id,
            'name': (link.student.user.first_name or link.student.user.username),
            'username': link.student.user.username,
            'avatar_url': link.student.avatar_url,
            'level': link.student.level,
            'xp': link.student.xp,
            'tests': st.get('tests', 0),
            'avg_score': round(st['avg']) if st.get('avg') is not None else None,
            'last_active': st.get('last'),
            'joined_at': link.joined_at,
        })

    active_week = sum(
        1 for s in students
        if s['last_active'] and (timezone.now() - s['last_active']).days < 7
    )
    scored = [s['avg_score'] for s in students if s['avg_score'] is not None]

    return Response({
        'teacher': _teacher_payload(profile),
        'summary': {
            'student_count': len(students),
            'active_last_week': active_week,
            'class_avg_score': round(sum(scored) / len(scored)) if scored else None,
            'total_tests': sum(s['tests'] for s in students),
        },
        'students': students,
        'topics': topics,
        'weak_topics': [t for t in topics if t['is_weak']][:5],
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def student_detail(request, student_id: int):
    """Bitta o'quvchining batafsil progressi — faqat O'Z sinfidagi o'quvchi (IDOR himoyasi)."""
    profile, err = _teacher_or_403(request)
    if err:
        return err

    link = (TeacherStudent.objects
            .select_related('student__user')
            .filter(teacher=profile, student_id=student_id)
            .first())
    if link is None:
        return Response({'detail': "Bu o'quvchi sizning sinfingizda emas."}, status=404)

    student = link.student
    attempts = (Attempt.objects
                .filter(profile=student, is_completed=True)
                .select_related('test')
                .order_by('-completed_at')[:10])

    topic_rows = (
        AttemptAnswer.objects
        .filter(attempt__profile=student, attempt__is_completed=True, question__topic__isnull=False)
        .values('question__topic__title')
        .annotate(answers=Count('id'), correct=Count('id', filter=Q(is_correct=True)))
        .order_by()
    )
    topics = sorted(
        ({'title': r['question__topic__title'],
          'avg_score': round(r['correct'] / r['answers'] * 100),
          'answers': r['answers']}
         for r in topic_rows if r['answers'] >= MIN_ANSWERS_PER_TOPIC),
        key=lambda t: t['avg_score'],
    )

    return Response({
        'student': {
            'student_id': student.id,
            'name': (student.user.first_name or student.user.username),
            'username': student.user.username,
            'avatar_url': student.avatar_url,
            'level': student.level, 'xp': student.xp, 'streak': student.streak,
            'joined_at': link.joined_at,
        },
        'attempts': [{
            'id': a.id,
            'test_title': a.test.title if a.test else 'Tasodifiy test',
            'score': a.score,
            'completed_at': a.completed_at,
        } for a in attempts],
        'topics': topics,
        'weak_topics': [t for t in topics if t['avg_score'] < WEAK_THRESHOLD][:5],
    })


def _teacher_payload(profile: Profile):
    tp = getattr(profile, 'teacher_profile', None)
    return {
        'full_name': tp.full_name if tp else (profile.user.first_name or profile.user.username),
        'subject': tp.subject if tp else '',
        'institution': tp.institution if tp else '',
        'referral_code': ensure_referral_code(profile),
        'telegram_link': get_telegram_deep_link(profile),
    }


# ============================================================ CEFR PARTLARI
def _section_payload(section):
    return {
        'id': section.id,
        'skill': section.skill,
        'skill_label': section.get_skill_display(),
        'part_number': section.part_number,
        'title': section.title,
        'instruction': section.instruction,
        'passage': section.passage,
        'audio': section.audio_src,
        'audio_play_limit': section.audio_play_limit,
        'image': section.image.url if section.image else '',
        'duration_minutes': section.duration_minutes,
        'order': section.order,
        'question_count': section.questions.count(),
    }


def _save_section(section, data, files):
    """Formadan kelgan qiymatlarni partga yozadi. Fayl maydoni faqat yangi fayl kelganda
    almashtiriladi — aks holda matnni tahrirlash audioni o'chirib yuborardi."""
    def _int(name, default=None):
        raw = data.get(name)
        if raw in (None, '', 'null'):
            return default
        try:
            return int(raw)
        except (TypeError, ValueError):
            return default

    section.skill = data.get('skill') or section.skill or 'reading'
    section.part_number = _int('part_number', section.part_number or 1)
    section.title = (data.get('title') or '').strip()
    section.instruction = (data.get('instruction') or '').strip()
    section.passage = data.get('passage') or ''
    section.audio_url = (data.get('audio_url') or '').strip()
    section.audio_play_limit = _int('audio_play_limit', 2)
    section.duration_minutes = _int('duration_minutes')
    section.order = _int('order', section.order or 0)

    if files.get('audio'):
        section.audio = files['audio']
    if files.get('image'):
        section.image = files['image']
    if data.get('clear_audio') in ('1', 'true', True):
        section.audio = None
    if data.get('clear_image') in ('1', 'true', True):
        section.image = None
    return section


@api_view(['GET', 'POST'])
@permission_classes([IsTeacher])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def sections_api(request, pk):
    """Testning CEFR partlari: ro'yxat va yangisini yaratish.

    Part — imtihonning bitta bloki: umumiy ko'rsatma, o'qish matni yoki audio va o'sha
    blokka tegishli savollar. Ilgari buni faqat Django admin orqali yaratish mumkin edi."""
    test = _own_test(request, pk)

    if request.method == 'GET':
        return Response({
            'sections': [_section_payload(s) for s in test.sections.all()],
            'skill_options': [{'value': v, 'label': l} for v, l in ExamSection.SKILL_CHOICES],
            'banks': [{
                'id': g.id, 'instruction': g.instruction,
                'options': [{'label': o.label, 'text': o.text} for o in g.options.all()],
            } for g in test.question_groups.all()],
        })

    section = _save_section(ExamSection(test_set=test), request.data, request.FILES)
    try:
        section.validate_unique()
    except ValidationError:
        return Response({'error': "Bu ko'nikmada shu raqamli part allaqachon bor."}, status=400)
    section.save()
    return Response(_section_payload(section), status=201)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsTeacher])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def section_detail_api(request, pk, sid):
    test = _own_test(request, pk)
    section = get_object_or_404(ExamSection, pk=sid, test_set=test)

    if request.method == 'GET':
        return Response(_section_payload(section))

    if request.method == 'DELETE':
        # Partni o'chirish uning savollarini o'chirmaydi (Question.section — SET_NULL):
        # ular testda "part'siz" savol bo'lib qoladi va yo'qolmaydi.
        section.delete()
        return Response({'deleted': True})

    _save_section(section, request.data, request.FILES)
    try:
        section.validate_unique()
    except ValidationError:
        return Response({'error': "Bu ko'nikmada shu raqamli part allaqachon bor."}, status=400)
    section.save()
    return Response(_section_payload(section))
