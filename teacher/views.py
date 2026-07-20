import json

from django.contrib import messages
from django.http import JsonResponse, HttpResponseBadRequest
from django.shortcuts import render, redirect, get_object_or_404
from django.views.decorators.http import require_POST

from accounts.permissions import teacher_required
from tests_app.models import (
    TestSet, Question, AnswerOption, MatchingPair, SubQuestion,
    QuestionGroup, GroupOption, Attempt, AttemptAnswer,
)
from learning.models import Lesson
from games.models import Game, GameItem
from .forms import TestInfoForm, QuestionBaseForm, LessonForm, GameForm


# ---- IDOR helpers: everything is scoped to the current user's own content ----
def _own_test(request, pk):
    return get_object_or_404(TestSet, pk=pk, created_by=request.user)


def _own_lesson(request, pk):
    return get_object_or_404(Lesson, pk=pk, created_by=request.user)


def _own_game(request, pk):
    return get_object_or_404(Game, pk=pk, created_by=request.user)


# ============================================================ DASHBOARD
@teacher_required
def dashboard(request):
    tests = TestSet.objects.filter(created_by=request.user, is_random=False)
    lessons = Lesson.objects.filter(created_by=request.user)
    games = Game.objects.filter(created_by=request.user)
    recent_attempts = (Attempt.objects
                       .filter(test__created_by=request.user, is_completed=True)
                       .select_related('profile__user', 'test')
                       .order_by('-started_at')[:10])
    ctx = {
        'active_nav': 'dashboard',
        'stats': {
            'tests': tests.count(),
            'published_tests': tests.filter(is_published=True).count(),
            'lessons': lessons.count(),
            'games': games.count(),
            'attempts': Attempt.objects.filter(test__created_by=request.user, is_completed=True).count(),
        },
        'recent_attempts': recent_attempts,
    }
    return render(request, 'teacher/dashboard.html', ctx)


# ============================================================ TESTS: list + info
@teacher_required
def test_list(request):
    tests = TestSet.objects.filter(created_by=request.user, is_random=False).select_related('subject').order_by('-updated_at')
    return render(request, 'teacher/test_list.html', {'active_nav': 'tests', 'tests': tests})


@teacher_required
def test_create(request):
    if request.method == 'POST':
        form = TestInfoForm(request.POST)
        if form.is_valid():
            test = form.save(commit=False)
            test.created_by = request.user
            test.is_published = False
            test.save()
            messages.success(request, "Test yaratildi. Endi savollar qo'shing.")
            return redirect('teacher:test_build', pk=test.pk)
    else:
        form = TestInfoForm()
    return render(request, 'teacher/test_info_form.html', {
        'active_nav': 'tests', 'form': form, 'title': "Yangi test", 'is_create': True,
    })


@teacher_required
def test_edit_info(request, pk):
    test = _own_test(request, pk)
    if request.method == 'POST':
        form = TestInfoForm(request.POST, instance=test)
        if form.is_valid():
            form.save()
            messages.success(request, "Test ma'lumotlari saqlandi.")
            return redirect('teacher:test_build', pk=test.pk)
    else:
        form = TestInfoForm(instance=test)
    return render(request, 'teacher/test_info_form.html', {
        'active_nav': 'tests', 'form': form, 'title': "Test ma'lumotlari", 'test': test, 'is_create': False,
    })


# ============================================================ TESTS: builder
@teacher_required
def test_build(request, pk):
    test = _own_test(request, pk)
    return render(request, 'teacher/test_build.html', {
        'active_nav': 'tests', 'test': test, 'questions': test.ordered_questions(),
    })


def _question_context(test, question=None):
    """Builds the question-form context, including JSON-serialisable initial rows for the
    Alpine-driven repeatable inputs (options/pairs/sub-questions/group options) so an edit
    reopens with all existing rows pre-filled."""
    options_data, pairs_data, subs_data, group_data = [], [], [], None
    if question:
        for c in question.choices.all():
            options_data.append({'text': c.text, 'is_correct': c.is_correct})
        for p in question.matching_pairs.all():
            pairs_data.append({'left_key': p.left_key, 'left_text': p.left_text,
                               'right_key': p.right_key, 'right_text': p.right_text})
        for s in question.sub_questions.all():
            subs_data.append({'label': s.label, 'text': s.text, 'reference_answer': s.reference_answer})
        if question.group:
            opts = list(question.group.options.all())
            correct_idx = next((i for i, o in enumerate(opts)
                                if o.id == question.correct_group_option_id), 0)
            group_data = {'instruction': question.group.instruction,
                          'options': [{'label': o.label, 'text': o.text} for o in opts],
                          'correct': correct_idx}
    return {
        'test': test, 'question': question,
        'type_choices': Question.QUESTION_TYPE_CHOICES,
        'difficulty_choices': Question.DIFFICULTY_CHOICES,
        'single_types': list(Question.SINGLE_ANSWER_TYPES),
        'options_data': options_data,
        'pairs_data': pairs_data,
        'subs_data': subs_data,
        'group_data': group_data,
        'reference_answer': question.reference_answer if question else '',
    }


def _apply_type_data(question, test, post):
    """Rebuilds a question's type-specific child rows from POST. Called after the base
    ModelForm saves. Wipes existing children first so an edit is a clean replace."""
    qtype = question.question_type
    question.choices.all().delete()
    question.matching_pairs.all().delete()
    question.sub_questions.all().delete()

    old_group = question.group
    if qtype != 'grouped_item' and question.group_id:
        question.group = None
        question.correct_group_option = None
        question.save(update_fields=['group', 'correct_group_option'])
        if old_group and old_group.questions.count() == 0:
            old_group.delete()

    def _l(name):
        return post.getlist(name)

    if qtype in Question.SINGLE_ANSWER_TYPES:
        texts = _l('option_text')
        correct = post.get('correct_option', '')
        for i, t in enumerate(texts):
            t = t.strip()
            if not t:
                continue
            AnswerOption.objects.create(question=question, text=t, is_correct=(str(i) == correct))

    elif qtype == 'matching':
        lks, lts = _l('pair_left_key'), _l('pair_left_text')
        rks, rts = _l('pair_right_key'), _l('pair_right_text')
        for i in range(len(rts)):
            rt = rts[i].strip()
            if not rt:
                continue
            MatchingPair.objects.create(
                question=question,
                left_key=(lks[i] if i < len(lks) else '').strip(),
                left_text=(lts[i] if i < len(lts) else '').strip(),
                right_key=(rks[i] if i < len(rks) else '').strip() or chr(97 + i),
                right_text=rt, order=i,
            )

    elif qtype == 'open_written':
        question.reference_answer = post.get('reference_answer', '').strip()
        question.save(update_fields=['reference_answer'])
        labels, texts, refs = _l('sub_label'), _l('sub_text'), _l('sub_ref')
        for i in range(len(texts)):
            tx = texts[i].strip()
            if not tx:
                continue
            SubQuestion.objects.create(
                question=question,
                label=(labels[i] if i < len(labels) else '').strip() or chr(97 + i),
                text=tx,
                reference_answer=(refs[i] if i < len(refs) else '').strip(),
                order=i,
            )

    elif qtype == 'grouped_item':
        # Each grouped question owns its own answer bank here (simpler than a shared bank,
        # and fully functional for grading). Create the NEW group and re-point the question
        # first, THEN drop the old group — deleting it while the question still references it
        # would cascade-delete the question itself (Question.group is on_delete=CASCADE).
        group = QuestionGroup.objects.create(
            test_set=test, instruction=post.get('group_instruction', '').strip() or 'Mos javobni tanlang',
        )
        labels, texts = _l('group_option_label'), _l('group_option_text')
        correct_idx = post.get('group_correct', '')
        correct_opt = None
        for i, t in enumerate(texts):
            t = t.strip()
            if not t:
                continue
            opt = GroupOption.objects.create(
                group=group, label=(labels[i] if i < len(labels) else '').strip() or chr(65 + i),
                text=t, order=i,
            )
            if str(i) == correct_idx:
                correct_opt = opt
        question.group = group
        question.correct_group_option = correct_opt
        question.save(update_fields=['group', 'correct_group_option'])
        if old_group and old_group.pk != group.pk and old_group.questions.count() == 0:
            old_group.delete()


@teacher_required
def question_add(request, pk):
    test = _own_test(request, pk)
    if request.method == 'POST':
        form = QuestionBaseForm(request.POST, request.FILES)
        if form.is_valid():
            question = form.save(commit=False)
            # A question inherits its subject from the test it's created in, so per-subject
            # filtering and the subject leaderboard work without asking the teacher again.
            question.subject = test.subject
            question.save()
            _apply_type_data(question, test, request.POST)
            test.questions.add(question)
            order = list(test.question_order or [])
            order.append(question.id)
            test.question_order = order
            test.save(update_fields=['question_order'])
            messages.success(request, "Savol qo'shildi.")
            return redirect('teacher:test_build', pk=test.pk)
    else:
        form = QuestionBaseForm(initial={'points': 1})
    ctx = _question_context(test)
    ctx.update({'active_nav': 'tests', 'form': form, 'is_create': True})
    return render(request, 'teacher/question_form.html', ctx)


@teacher_required
def question_edit(request, pk, qid):
    test = _own_test(request, pk)
    question = get_object_or_404(Question, pk=qid, test_sets=test)
    if request.method == 'POST':
        form = QuestionBaseForm(request.POST, request.FILES, instance=question)
        if form.is_valid():
            question = form.save()
            _apply_type_data(question, test, request.POST)
            messages.success(request, "Savol saqlandi.")
            return redirect('teacher:test_build', pk=test.pk)
    else:
        form = QuestionBaseForm(instance=question)
    ctx = _question_context(test, question)
    ctx.update({'active_nav': 'tests', 'form': form, 'is_create': False})
    return render(request, 'teacher/question_form.html', ctx)


@teacher_required
@require_POST
def question_delete(request, pk, qid):
    test = _own_test(request, pk)
    question = get_object_or_404(Question, pk=qid, test_sets=test)
    test.questions.remove(question)
    test.question_order = [q for q in (test.question_order or []) if q != question.id]
    test.save(update_fields=['question_order'])
    if question.test_sets.count() == 0:
        question.delete()
    messages.success(request, "Savol o'chirildi.")
    return redirect('teacher:test_build', pk=test.pk)


@teacher_required
@require_POST
def question_reorder(request, pk):
    test = _own_test(request, pk)
    try:
        order = json.loads(request.body.decode('utf-8')).get('order', [])
        order = [int(x) for x in order]
    except (ValueError, json.JSONDecodeError):
        return HttpResponseBadRequest("Noto'g'ri format")
    valid_ids = set(test.questions.values_list('id', flat=True))
    test.question_order = [qid for qid in order if qid in valid_ids]
    test.save(update_fields=['question_order'])
    return JsonResponse({'ok': True})


@teacher_required
def test_preview(request, pk):
    test = _own_test(request, pk)
    return render(request, 'teacher/test_preview.html', {
        'active_nav': 'tests', 'test': test, 'questions': test.ordered_questions(),
    })


@teacher_required
@require_POST
def test_publish(request, pk):
    test = _own_test(request, pk)
    if test.questions.count() == 0:
        messages.error(request, "Bo'sh testni nashr etib bo'lmaydi — avval savol qo'shing.")
        return redirect('teacher:test_build', pk=test.pk)
    test.is_published = not test.is_published
    if test.is_published:
        test.is_archived = False
    test.save()
    messages.success(request, "Test nashr etildi." if test.is_published else "Test qoralamaga o'tkazildi.")
    return redirect('teacher:test_build', pk=test.pk)


@teacher_required
@require_POST
def test_delete(request, pk):
    test = _own_test(request, pk)
    if test.attempts.exists():
        test.is_archived = True
        test.is_published = False
        test.save()
        messages.warning(request, "Testda urinishlar bor — o'chirish o'rniga arxivlandi (natijalar saqlandi).")
    else:
        test.delete()
        messages.success(request, "Test o'chirildi.")
    return redirect('teacher:tests')


# ============================================================ TESTS: results + grading
@teacher_required
def test_results(request, pk):
    test = _own_test(request, pk)
    attempts = (test.attempts.filter(is_completed=True)
                .select_related('profile__user').order_by('-started_at'))
    stats = []
    for q in test.ordered_questions():
        answers = AttemptAnswer.objects.filter(attempt__test=test, question=q, attempt__is_completed=True)
        total = answers.count()
        correct = answers.filter(is_correct=True).count()
        stats.append({'question': q, 'total': total, 'correct': correct,
                      'pct': round(correct / total * 100) if total else 0})
    return render(request, 'teacher/test_results.html', {
        'active_nav': 'tests', 'test': test, 'attempts': attempts, 'stats': stats,
    })


@teacher_required
def attempt_grade(request, pk, attempt_id):
    test = _own_test(request, pk)
    attempt = get_object_or_404(Attempt, pk=attempt_id, test=test)
    open_answers = attempt.answers.filter(question__question_type='open_written').select_related('question')
    if request.method == 'POST':
        for ans in open_answers:
            val = request.POST.get(f'correct_{ans.id}')
            ans.is_correct = (val == '1')
            ans.save(update_fields=['is_correct'])
        _recompute_attempt(attempt)
        messages.success(request, "Baholash saqlandi va ball qayta hisoblandi.")
        return redirect('teacher:test_results', pk=test.pk)
    return render(request, 'teacher/attempt_grade.html', {
        'active_nav': 'tests', 'test': test, 'attempt': attempt,
        'answers': attempt.answers.select_related('question', 'selected_choice').all(),
        'open_answers': open_answers,
    })


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


# ============================================================ LESSONS
@teacher_required
def lesson_list(request):
    lessons = Lesson.objects.filter(created_by=request.user).select_related('topic').order_by('-updated_at')
    return render(request, 'teacher/lesson_list.html', {'active_nav': 'lessons', 'lessons': lessons})


@teacher_required
def lesson_create(request):
    if request.method == 'POST':
        form = LessonForm(request.POST)
        if form.is_valid():
            lesson = form.save(commit=False)
            lesson.created_by = request.user
            lesson.is_published = 'publish' in request.POST
            lesson.save()
            messages.success(request, "Dars saqlandi.")
            return redirect('teacher:lessons')
    else:
        form = LessonForm()
    return render(request, 'teacher/lesson_form.html', {'active_nav': 'lessons', 'form': form, 'title': "Yangi dars"})


@teacher_required
def lesson_edit(request, pk):
    lesson = _own_lesson(request, pk)
    if request.method == 'POST':
        form = LessonForm(request.POST, instance=lesson)
        if form.is_valid():
            lesson = form.save(commit=False)
            lesson.is_published = 'publish' in request.POST
            lesson.save()
            messages.success(request, "Dars saqlandi.")
            return redirect('teacher:lessons')
    else:
        form = LessonForm(instance=lesson)
    return render(request, 'teacher/lesson_form.html', {
        'active_nav': 'lessons', 'form': form, 'title': "Darsni tahrirlash", 'lesson': lesson,
    })


@teacher_required
@require_POST
def lesson_delete(request, pk):
    lesson = _own_lesson(request, pk)
    lesson.delete()
    messages.success(request, "Dars o'chirildi.")
    return redirect('teacher:lessons')


# ============================================================ GAMES
@teacher_required
def game_list(request):
    games = Game.objects.filter(created_by=request.user).select_related('subject').order_by('-updated_at')
    return render(request, 'teacher/game_list.html', {'active_nav': 'games', 'games': games})


@teacher_required
def game_create(request):
    if request.method == 'POST':
        form = GameForm(request.POST)
        if form.is_valid():
            game = form.save(commit=False)
            game.created_by = request.user
            game.save()
            messages.success(request, "O'yin yaratildi. Endi elementlar qo'shing.")
            return redirect('teacher:game_edit', pk=game.pk)
    else:
        form = GameForm()
    return render(request, 'teacher/game_form.html', {'active_nav': 'games', 'form': form, 'title': "Yangi o'yin", 'is_create': True})


@teacher_required
def game_edit(request, pk):
    game = _own_game(request, pk)
    if request.method == 'POST':
        form = GameForm(request.POST, instance=game)
        if form.is_valid():
            form.save()
            game.items.all().delete()
            fronts = request.POST.getlist('item_front')
            backs = request.POST.getlist('item_back')
            for i, front in enumerate(fronts):
                front = front.strip()
                back = (backs[i] if i < len(backs) else '').strip()
                if front and back:
                    GameItem.objects.create(game=game, front_text=front, back_text=back, order=i)
            game.is_published = 'publish' in request.POST
            game.save(update_fields=['is_published'])
            messages.success(request, "O'yin saqlandi.")
            return redirect('teacher:games')
    else:
        form = GameForm(instance=game)
    items = list(game.items.all())
    return render(request, 'teacher/game_form.html', {
        'active_nav': 'games', 'form': form, 'title': "O'yinni tahrirlash",
        'game': game, 'items': items, 'is_create': False,
        'items_data': [{'front': it.front_text, 'back': it.back_text} for it in items],
    })


@teacher_required
@require_POST
def game_delete(request, pk):
    game = _own_game(request, pk)
    game.delete()
    messages.success(request, "O'yin o'chirildi.")
    return redirect('teacher:games')


@teacher_required
@require_POST
def game_from_test(request, pk):
    """Generate a flashcards game from a test: each single-answer question's body becomes
    the front, its correct option the back."""
    from django.utils.html import strip_tags
    test = _own_test(request, pk)
    game = Game.objects.create(
        title=f"{test.title} — flesh-kartalar", game_type='flashcards',
        subject=test.subject, created_by=request.user,
        description="Testdan avtomatik yaratilgan flesh-kartalar.",
    )
    order = 0
    for q in test.ordered_questions():
        if q.question_type in Question.SINGLE_ANSWER_TYPES:
            correct = q.choices.filter(is_correct=True).first()
            if correct:
                GameItem.objects.create(game=game, front_text=strip_tags(q.body)[:500],
                                        back_text=correct.text[:500], order=order)
                order += 1
    if order == 0:
        game.delete()
        messages.warning(request, "Bu testda flesh-karta uchun mos (variantli) savollar topilmadi.")
        return redirect('teacher:test_build', pk=test.pk)
    messages.success(request, f"{order} ta kartadan iborat o'yin yaratildi.")
    return redirect('teacher:game_edit', pk=game.pk)
