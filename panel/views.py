import csv
import secrets
from datetime import timedelta
from decimal import Decimal

from django.contrib import messages
from django.contrib.auth import login as auth_login
from django.contrib.auth.models import User
from django.db.models import Count, Q, Sum
from django.http import HttpResponse
from django.shortcuts import render, redirect, get_object_or_404
from django.urls import reverse_lazy
from django.utils import timezone
from django.utils.html import format_html, mark_safe
from django.views.decorators.http import require_POST

from accounts.models import Profile
from accounts.permissions import superadmin_required, is_last_active_superadmin
from accounts.utils import send_telegram_message, send_telegram_photo
from tests_app.models import Subject, TestSet, Attempt, Question, AttemptAnswer
from learning.models import Lesson
from games.models import Game
from premium.models import Payment
from core.models import Notification

from .models import AuditLog, SiteSettings, Broadcast
from shop.models import ShopItem
from .forms import (
    SubjectForm, TestSetForm, LessonForm, GameForm, SiteSettingsForm,
    UserForm, TeacherCreateForm, BroadcastForm, ShopItemForm,
)
from .generic import (
    PanelListView, PanelCreateView, PanelUpdateView, PanelDeleteView, Column, badge,
)


# ============================================================ DASHBOARD
@superadmin_required
def dashboard(request):
    today = timezone.localdate()
    days = [today - timedelta(days=i) for i in range(6, -1, -1)]

    reg_series, attempt_series, labels = [], [], []
    for d in days:
        labels.append(d.strftime('%d.%m'))
        reg_series.append(User.objects.filter(date_joined__date=d).count())
        attempt_series.append(Attempt.objects.filter(started_at__date=d).count())

    # Revenue from approved payments, and how many distinct students were active today.
    total_revenue = Payment.objects.filter(status='approved').aggregate(s=Sum('amount'))['s'] or 0
    active_today = Attempt.objects.filter(started_at__date=today).values('profile').distinct().count()
    premium_users = Profile.objects.filter(Q(is_premium=True) | Q(premium_mock_test_unlocked=True)).count()

    # Hardest questions: lowest correct-rate among questions answered enough times to be
    # meaningful. Surfaces broken or too-hard questions for admins to review.
    hard_q = (AttemptAnswer.objects
              .filter(attempt__is_completed=True)
              .values('question')
              .annotate(total=Count('id'), correct=Count('id', filter=Q(is_correct=True)))
              .filter(total__gte=5)
              .order_by('correct'))[:8]
    qids = [row['question'] for row in hard_q]
    qmap = {q.id: q for q in Question.objects.filter(id__in=qids)}
    hardest_questions = []
    for row in hard_q:
        q = qmap.get(row['question'])
        if not q:
            continue
        rate = round(100 * row['correct'] / row['total']) if row['total'] else 0
        text = q.body[:90].replace('<p>', '').replace('</p>', '')
        hardest_questions.append({'id': q.id, 'text': text, 'rate': rate, 'total': row['total']})

    ctx = {
        'active_nav': 'dashboard',
        'stats': {
            'users': User.objects.count(),
            'teachers': Profile.objects.filter(role='teacher').count(),
            'students': Profile.objects.filter(role='student').count(),
            'testsets': TestSet.objects.filter(is_random=False).count(),
            'lessons': Lesson.objects.count(),
            'games': Game.objects.count(),
            'attempts_today': Attempt.objects.filter(started_at__date=today).count(),
            'attempts_total': Attempt.objects.filter(is_completed=True).count(),
            'pending_payments': Payment.objects.filter(status='pending').count(),
            'total_revenue': total_revenue,
            'active_today': active_today,
            'premium_users': premium_users,
        },
        'chart_labels': labels,
        'chart_reg': reg_series,
        'chart_attempts': attempt_series,
        'hardest_questions': hardest_questions,
        'recent_logs': AuditLog.objects.select_related('user')[:12],
    }
    return render(request, 'panel/dashboard.html', ctx)


# ============================================================ USERS
def _role_badge(profile):
    tone = {'superadmin': 'rose', 'teacher': 'blue', 'student': 'slate'}.get(profile.role, 'slate')
    return badge(profile.get_role_display(), tone)


class UserListView(PanelListView):
    model = User
    title = "Foydalanuvchilar"
    icon = 'users'
    active_nav = 'users'
    search_fields = ['username', 'first_name', 'last_name', 'email',
                     'profile__telegram_username', 'profile__telegram_id']
    search_placeholder = "Ism, username, email yoki Telegram..."
    default_order = '-date_joined'
    detail_url_name = 'panel:user_detail'
    edit_url_name = 'panel:user_edit'
    delete_url_name = 'panel:user_delete'
    filters = [{'param': 'role', 'label': 'Rol', 'lookup': 'profile__role',
                'options': Profile.ROLE_CHOICES,
                }, {
        'param': 'active', 'label': 'Holat', 'lookup': 'is_active',
        'options': [('1', 'Faol'), ('0', 'Bloklangan')],
    }, {
        'param': 'tg', 'label': 'Telegram', 'lookup': 'profile__telegram_id__isnull',
        'options': [('False', "Telegram ulangan"), ('True', "Telegram ulanmagan")],
    }]
    bulk_actions = [{'value': 'block', 'label': 'Bloklash', 'tone': 'rose'},
                    {'value': 'unblock', 'label': 'Blokdan chiqarish', 'tone': 'green'}]
    columns = [
        Column("Foydalanuvchi", lambda u: f"{u.get_full_name() or u.username}", sortable='username'),
        Column("Username", 'username'),
        Column("Telegram", lambda u: (
            format_html(
                '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-600">'
                '<svg class="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.941z"/></svg>'
                '@{}</span>',
                u.profile.telegram_username)
            if hasattr(u, 'profile') and u.profile.telegram_username
            else mark_safe('<span class="text-ink-300 text-xs">—</span>')
        )),
        Column("Rol", lambda u: _role_badge(u.profile) if hasattr(u, 'profile') else ''),
        Column("Holat", lambda u: badge("Faol", 'green') if u.is_active else badge("Bloklangan", 'rose')),
        Column("Ro'yxatdan o'tgan", lambda u: u.date_joined.strftime('%Y-%m-%d'), sortable='date_joined'),
    ]

    def get_base_queryset(self):
        return User.objects.select_related('profile').all()

    def perform_bulk_action(self, action, queryset):
        if action == 'block':
            return queryset.exclude(is_superuser=True).update(is_active=False)
        if action == 'unblock':
            return queryset.update(is_active=True)
        return 0


@superadmin_required
def user_detail(request, pk):
    u = get_object_or_404(User.objects.select_related('profile'), pk=pk)
    attempts = Attempt.objects.filter(profile=u.profile, is_completed=True).select_related('test').order_by('-started_at')[:20]
    ctx = {
        'active_nav': 'users', 'u': u, 'profile': u.profile,
        'attempts': attempts,
        'test_count': TestSet.objects.filter(created_by=u).count(),
        'lesson_count': Lesson.objects.filter(created_by=u).count(),
        'payments': Payment.objects.filter(profile=u.profile).select_related('plan').order_by('-created_at')[:10],
    }
    return render(request, 'panel/user_detail.html', ctx)


class UserUpdateView(PanelUpdateView):
    model = User
    form_class = UserForm
    title = "Foydalanuvchini tahrirlash"
    active_nav = 'users'
    cancel_url_name = 'panel:users'

    def get_success_url(self):
        return reverse_lazy('panel:user_detail', args=[self.object.pk])


class UserDeleteView(PanelDeleteView):
    model = User
    success_url_name = 'panel:users'
    title = "Foydalanuvchini o'chirish"
    active_nav = 'users'

    def protect(self, obj):
        if obj.is_superuser:
            return "Super foydalanuvchini (superuser) o'chirib bo'lmaydi."
        if obj == self.request.user:
            return "O'zingizni o'chira olmaysiz."
        if is_last_active_superadmin(obj):
            return "Oxirgi faol super adminni o'chirib bo'lmaydi."
        return None


@superadmin_required
@require_POST
def user_toggle_block(request, pk):
    u = get_object_or_404(User, pk=pk)
    if u.is_superuser:
        messages.error(request, "Super foydalanuvchini bloklab bo'lmaydi.")
        return redirect('panel:user_detail', pk=pk)
    # Blocking a user sets is_active=False. Guard the two ways that could lock everyone
    # out of the admin: blocking yourself, or blocking the last remaining super admin.
    if u == request.user:
        messages.error(request, "O'zingizni bloklay olmaysiz.")
        return redirect('panel:user_detail', pk=pk)
    if u.is_active and is_last_active_superadmin(u):
        messages.error(request, "Oxirgi faol super adminni bloklab bo'lmaydi.")
        return redirect('panel:user_detail', pk=pk)
    u.is_active = not u.is_active
    u.save(update_fields=['is_active'])
    messages.success(request, "Foydalanuvchi bloklandi." if not u.is_active else "Blokdan chiqarildi.")
    return redirect('panel:user_detail', pk=pk)


@superadmin_required
@require_POST
def user_reset_password(request, pk):
    u = get_object_or_404(User, pk=pk)
    new_password = secrets.token_urlsafe(8)
    u.set_password(new_password)
    u.save()
    messages.success(request, f"Yangi parol: {new_password} — foydalanuvchiga yetkazing (qayta ko'rsatilmaydi).")
    return redirect('panel:user_detail', pk=pk)


# ============================================================ TEACHERS
class TeacherListView(PanelListView):
    model = User
    title = "O'qituvchilar"
    icon = 'graduation-cap'
    active_nav = 'teachers'
    search_fields = ['username', 'first_name', 'last_name', 'email']
    default_order = '-date_joined'
    create_url_name = 'panel:teacher_create'
    detail_url_name = 'panel:user_detail'
    delete_url_name = 'panel:user_delete'
    columns = [
        Column("O'qituvchi", lambda u: u.get_full_name() or u.username, sortable='username'),
        Column("Username", 'username'),
        Column("Testlar", lambda u: str(TestSet.objects.filter(created_by=u).count())),
        Column("Darslar", lambda u: str(Lesson.objects.filter(created_by=u).count())),
        Column("O'yinlar", lambda u: str(Game.objects.filter(created_by=u).count())),
        Column("Holat", lambda u: badge("Faol", 'green') if u.is_active else badge("Bloklangan", 'rose')),
    ]

    def get_base_queryset(self):
        return User.objects.select_related('profile').filter(profile__role='teacher')


@superadmin_required
def teacher_create(request):
    if request.method == 'POST':
        form = TeacherCreateForm(request.POST)
        if form.is_valid():
            teacher = form.save()
            messages.success(request, f"O'qituvchi '{teacher.username}' yaratildi.")
            return redirect('panel:user_detail', pk=teacher.pk)
    else:
        form = TeacherCreateForm()
    return render(request, 'panel/generic_form.html', {
        'form': form, 'title': "Yangi o'qituvchi", 'active_nav': 'teachers',
        'cancel_url': reverse_lazy('panel:teachers'),
    })


# ============================================================ SUBJECTS
class SubjectListView(PanelListView):
    model = Subject
    title = "Fanlar"
    icon = 'library'
    active_nav = 'subjects'
    search_fields = ['name']
    default_order = 'name'
    create_url_name = 'panel:subject_create'
    edit_url_name = 'panel:subject_edit'
    delete_url_name = 'panel:subject_delete'
    bulk_actions = [{'value': 'delete', 'label': "O'chirish", 'tone': 'rose'}]
    columns = [
        Column("Nomi", 'name', sortable='name'),
        Column("Slug", 'slug'),
        Column("Testlar", lambda s: str(s.test_sets.count())),
    ]


class SubjectCreateView(PanelCreateView):
    model = Subject
    form_class = SubjectForm
    title = "Yangi fan"
    active_nav = 'subjects'
    cancel_url_name = 'panel:subjects'
    success_url = reverse_lazy('panel:subjects')


class SubjectUpdateView(PanelUpdateView):
    model = Subject
    form_class = SubjectForm
    title = "Fanni tahrirlash"
    active_nav = 'subjects'
    cancel_url_name = 'panel:subjects'
    success_url = reverse_lazy('panel:subjects')


class SubjectDeleteView(PanelDeleteView):
    model = Subject
    success_url_name = 'panel:subjects'
    title = "Fanni o'chirish"
    active_nav = 'subjects'


# ============================================================ SHOP ITEMS
class ShopItemListView(PanelListView):
    model = ShopItem
    title = "Coin do'kon"
    icon = 'shopping-bag'
    active_nav = 'shop'
    search_fields = ['name', 'slug']
    default_order = 'order'
    create_url_name = 'panel:shopitem_create'
    edit_url_name = 'panel:shopitem_edit'
    delete_url_name = 'panel:shopitem_delete'
    bulk_actions = [{'value': 'delete', 'label': "O'chirish", 'tone': 'rose'}]
    filters = [
        {'param': 'category', 'label': 'Turkum', 'lookup': 'category',
         'options': ShopItem.CATEGORY_CHOICES},
        {'param': 'active', 'label': 'Holat', 'lookup': 'is_active',
         'options': [('1', 'Faol'), ('0', 'Nofaol')]},
    ]
    columns = [
        Column("Nomi", 'name', sortable='name'),
        Column("Turkum", lambda i: badge(i.get_category_display(), 'blue')),
        Column("Narx", lambda i: f"{i.price_coins} 🪙", sortable='price_coins'),
        Column("Nodirlik", lambda i: badge(i.get_rarity_display(),
               {'legendary': 'amber', 'epic': 'rose', 'rare': 'blue'}.get(i.rarity, 'gray'))),
        Column("Sarflanadigan", lambda i: badge('Ha', 'green') if i.is_consumable else badge("Yo'q", 'gray')),
        Column("Egalari", lambda i: str(i.owned_by.count())),
        Column("Holat", lambda i: badge('Faol', 'green') if i.is_active else badge('Nofaol', 'gray')),
    ]


class ShopItemCreateView(PanelCreateView):
    model = ShopItem
    form_class = ShopItemForm
    title = "Yangi mahsulot"
    active_nav = 'shop'
    cancel_url_name = 'panel:shop'
    success_url = reverse_lazy('panel:shop')


class ShopItemUpdateView(PanelUpdateView):
    model = ShopItem
    form_class = ShopItemForm
    title = "Mahsulotni tahrirlash"
    active_nav = 'shop'
    cancel_url_name = 'panel:shop'
    success_url = reverse_lazy('panel:shop')


class ShopItemDeleteView(PanelDeleteView):
    model = ShopItem
    success_url_name = 'panel:shop'
    title = "Mahsulotni o'chirish"
    active_nav = 'shop'


# ============================================================ TEST SETS
def _testset_status(ts):
    if ts.is_archived:
        return badge("Arxivlangan", 'gray')
    return badge("Nashr etilgan", 'green') if ts.is_published else badge("Qoralama", 'amber')


class TestSetListView(PanelListView):
    model = TestSet
    title = "Testlar"
    icon = 'file-check-2'
    active_nav = 'testsets'
    search_fields = ['title', 'description']
    default_order = '-created_at'
    detail_url_name = 'panel:testset_detail'
    edit_url_name = 'panel:testset_edit'
    delete_url_name = 'panel:testset_delete'
    filters = [
        {'param': 'subject', 'label': 'Fan', 'lookup': 'subject_id', 'options': []},
        {'param': 'status', 'label': 'Holat', 'lookup': 'is_published',
         'options': [('1', 'Nashr etilgan'), ('0', 'Qoralama')]},
    ]
    bulk_actions = [{'value': 'publish', 'label': 'Nashr etish', 'tone': 'green'},
                    {'value': 'unpublish', 'label': 'Qoralamaga', 'tone': 'amber'},
                    {'value': 'archive', 'label': 'Arxivlash', 'tone': 'rose'}]
    columns = [
        Column("Sarlavha", 'title', sortable='title'),
        Column("Fan", lambda t: t.subject.name if t.subject else '—'),
        Column("Savollar", lambda t: str(t.questions.count())),
        Column("Muallif", lambda t: (t.created_by.get_full_name() or t.created_by.username) if t.created_by else '—'),
        Column("Holat", _testset_status),
        Column("Urinishlar", lambda t: str(t.attempts.count())),
    ]

    def get_base_queryset(self):
        return TestSet.objects.select_related('subject', 'created_by').filter(is_random=False)

    def get_context_data(self, **kwargs):
        ctx = super().get_context_data(**kwargs)
        for f in ctx['filters_conf']:
            if f['param'] == 'subject':
                f['options'] = [(str(s.id), s.name) for s in Subject.objects.all()]
        return ctx

    def perform_bulk_action(self, action, queryset):
        if action == 'publish':
            return queryset.update(is_published=True, is_archived=False)
        if action == 'unpublish':
            return queryset.update(is_published=False)
        if action == 'archive':
            return queryset.update(is_archived=True)
        return 0


@superadmin_required
def testset_detail(request, pk):
    ts = get_object_or_404(TestSet.objects.select_related('subject', 'created_by'), pk=pk)
    ctx = {
        'active_nav': 'testsets', 'ts': ts,
        'questions': ts.questions.all()[:100],
        'attempt_count': ts.attempts.count(),
    }
    return render(request, 'panel/testset_detail.html', ctx)


class TestSetUpdateView(PanelUpdateView):
    model = TestSet
    form_class = TestSetForm
    title = "Testni tahrirlash"
    active_nav = 'testsets'
    cancel_url_name = 'panel:testsets'

    def get_success_url(self):
        return reverse_lazy('panel:testset_detail', args=[self.object.pk])


class TestSetDeleteView(PanelDeleteView):
    model = TestSet
    success_url_name = 'panel:testsets'
    title = "Testni o'chirish"
    active_nav = 'testsets'

    def protect(self, obj):
        if obj.has_attempts:
            return ("Bu testda o'quvchilar urinishlari bor — o'chirish o'rniga arxivlang "
                    "(natijalar tarixi saqlanadi).")
        return None


@superadmin_required
@require_POST
def testset_duplicate(request, pk):
    ts = get_object_or_404(TestSet, pk=pk)
    questions = list(ts.questions.all())
    ts.pk = None
    ts.title = f"{ts.title} (nusxa)"
    ts.is_published = False
    ts.created_by = request.user
    ts.save()
    ts.questions.set(questions)
    messages.success(request, "Test nusxalandi (qoralama sifatida).")
    return redirect('panel:testset_detail', pk=ts.pk)


@superadmin_required
@require_POST
def testset_toggle_publish(request, pk):
    ts = get_object_or_404(TestSet, pk=pk)
    ts.is_published = not ts.is_published
    if ts.is_published:
        ts.is_archived = False
    ts.save()
    messages.success(request, "Test nashr etildi." if ts.is_published else "Test qoralamaga o'tkazildi.")
    return redirect('panel:testset_detail', pk=pk)


# ============================================================ LESSONS
class LessonListView(PanelListView):
    model = Lesson
    title = "Darslar"
    icon = 'book-open'
    active_nav = 'lessons'
    search_fields = ['title', 'content']
    default_order = '-created_at'
    create_url_name = 'panel:lesson_create'
    edit_url_name = 'panel:lesson_edit'
    delete_url_name = 'panel:lesson_delete'
    bulk_actions = [{'value': 'publish', 'label': 'Nashr etish', 'tone': 'green'},
                    {'value': 'delete', 'label': "O'chirish", 'tone': 'rose'}]
    columns = [
        Column("Sarlavha", 'title', sortable='title'),
        Column("Mavzu", lambda l: l.topic.title if l.topic else '—'),
        Column("Muallif", lambda l: (l.created_by.get_full_name() or l.created_by.username) if l.created_by else '—'),
        Column("Holat", lambda l: badge("Nashr etilgan", 'green') if l.is_published else badge("Qoralama", 'amber')),
    ]

    def get_base_queryset(self):
        return Lesson.objects.select_related('topic', 'created_by').all()

    def perform_bulk_action(self, action, queryset):
        if action == 'publish':
            return queryset.update(is_published=True)
        if action == 'delete':
            n = queryset.count(); queryset.delete(); return n
        return 0


class LessonCreateView(PanelCreateView):
    model = Lesson
    form_class = LessonForm
    title = "Yangi dars"
    active_nav = 'lessons'
    cancel_url_name = 'panel:lessons'
    success_url = reverse_lazy('panel:lessons')


class LessonUpdateView(PanelUpdateView):
    model = Lesson
    form_class = LessonForm
    title = "Darsni tahrirlash"
    active_nav = 'lessons'
    cancel_url_name = 'panel:lessons'
    success_url = reverse_lazy('panel:lessons')


class LessonDeleteView(PanelDeleteView):
    model = Lesson
    success_url_name = 'panel:lessons'
    title = "Darsni o'chirish"
    active_nav = 'lessons'


# ============================================================ GAMES
class GameListView(PanelListView):
    model = Game
    title = "O'yinlar"
    icon = 'gamepad-2'
    active_nav = 'games'
    search_fields = ['title', 'description']
    default_order = '-created_at'
    create_url_name = 'panel:game_create'
    edit_url_name = 'panel:game_edit'
    delete_url_name = 'panel:game_delete'
    bulk_actions = [{'value': 'delete', 'label': "O'chirish", 'tone': 'rose'}]
    columns = [
        Column("Nomi", 'title', sortable='title'),
        Column("Turi", lambda g: g.get_game_type_display()),
        Column("Elementlar", lambda g: str(g.items.count())),
        Column("Muallif", lambda g: (g.created_by.get_full_name() or g.created_by.username) if g.created_by else '—'),
        Column("Holat", lambda g: badge("Nashr etilgan", 'green') if g.is_published else badge("Qoralama", 'amber')),
    ]

    def get_base_queryset(self):
        return Game.objects.select_related('subject', 'created_by').all()


class GameCreateView(PanelCreateView):
    model = Game
    form_class = GameForm
    title = "Yangi o'yin"
    active_nav = 'games'
    cancel_url_name = 'panel:games'
    success_url = reverse_lazy('panel:games')


class GameUpdateView(PanelUpdateView):
    model = Game
    form_class = GameForm
    title = "O'yinni tahrirlash"
    active_nav = 'games'
    cancel_url_name = 'panel:games'
    success_url = reverse_lazy('panel:games')


class GameDeleteView(PanelDeleteView):
    model = Game
    success_url_name = 'panel:games'
    title = "O'yinni o'chirish"
    active_nav = 'games'


# ============================================================ ATTEMPTS (RESULTS)
class AttemptListView(PanelListView):
    model = Attempt
    title = "Natijalar"
    icon = 'clipboard-list'
    active_nav = 'attempts'
    search_fields = ['profile__user__username', 'test__title']
    default_order = '-started_at'
    detail_url_name = 'panel:attempt_detail'
    filters = [{'param': 'completed', 'label': 'Holat', 'lookup': 'is_completed',
                'options': [('1', 'Yakunlangan'), ('0', 'Tugatilmagan')]}]
    columns = [
        Column("O'quvchi", lambda a: a.profile.user.get_full_name() or a.profile.user.username),
        Column("Test", lambda a: a.test.title if a.test else 'Tasodifiy'),
        Column("Ball", lambda a: f"{a.score:.0f}%" if a.score is not None else '—'),
        Column("To'g'ri", lambda a: str(a.correct_answers)),
        Column("Sana", lambda a: a.started_at.strftime('%Y-%m-%d %H:%M'), sortable='started_at'),
    ]

    def get_base_queryset(self):
        return Attempt.objects.select_related('profile__user', 'test').all()


@superadmin_required
def attempt_detail(request, pk):
    a = get_object_or_404(Attempt.objects.select_related('profile__user', 'test'), pk=pk)
    answers = a.answers.select_related('question', 'selected_choice').all()
    return render(request, 'panel/attempt_detail.html', {
        'active_nav': 'attempts', 'a': a, 'answers': answers,
    })


@superadmin_required
def attempts_export(request):
    """CSV (UTF-8 BOM so Excel opens it cleanly) of all completed attempts."""
    response = HttpResponse(content_type='text/csv; charset=utf-8')
    response['Content-Disposition'] = 'attachment; filename="natijalar.csv"'
    response.write('﻿')
    writer = csv.writer(response)
    writer.writerow(["O'quvchi", "Username", "Test", "Ball", "To'g'ri", "Xato", "O'tkazib yuborilgan", "Sana"])
    qs = Attempt.objects.select_related('profile__user', 'test').filter(is_completed=True).order_by('-started_at')
    for a in qs:
        writer.writerow([
            a.profile.user.get_full_name() or a.profile.user.username,
            a.profile.user.username,
            a.test.title if a.test else 'Tasodifiy',
            f"{a.score:.0f}" if a.score is not None else '',
            a.correct_answers, a.wrong_answers, a.skipped_answers,
            a.started_at.strftime('%Y-%m-%d %H:%M'),
        ])
    return response


# ============================================================ PAYMENTS
class PaymentListView(PanelListView):
    model = Payment
    title = "To'lovlar"
    icon = 'credit-card'
    active_nav = 'payments'
    search_fields = ['profile__user__username']
    default_order = '-created_at'
    detail_url_name = 'panel:payment_detail'
    filters = [{'param': 'status', 'label': 'Holat', 'lookup': 'status',
                'options': [('pending', 'Kutilmoqda'), ('approved', 'Tasdiqlangan'), ('rejected', 'Rad etilgan')]}]
    columns = [
        Column("Foydalanuvchi", lambda p: p.profile.user.username),
        Column("Reja", lambda p: p.plan.name),
        Column("Summa", lambda p: f"{p.amount:,.0f}"),
        Column("Holat", lambda p: badge(p.get_status_display(),
                {'pending': 'amber', 'approved': 'green', 'rejected': 'rose'}.get(p.status, 'slate'))),
        Column("Sana", lambda p: p.created_at.strftime('%Y-%m-%d')),
    ]

    def get_base_queryset(self):
        return Payment.objects.select_related('profile__user', 'plan').all()


@superadmin_required
def payment_detail(request, pk):
    p = get_object_or_404(Payment.objects.select_related('profile__user', 'plan'), pk=pk)
    return render(request, 'panel/payment_detail.html', {'active_nav': 'payments', 'p': p})


@superadmin_required
@require_POST
def payment_approve(request, pk):
    p = get_object_or_404(Payment, pk=pk)
    if p.status == 'pending':
        p.status = 'approved'
        p.reviewed_by = request.user
        p.reviewed_at = timezone.now()
        p.save()
        p.apply_to_profile()
        Notification.objects.create(profile=p.profile, title="Premium faollashtirildi",
                                    message=f"To'lovingiz tasdiqlandi! '{p.plan.name}' faollashtirildi.", type='system')
        messages.success(request, "To'lov tasdiqlandi.")
    return redirect('panel:payment_detail', pk=pk)


@superadmin_required
@require_POST
def payment_reject(request, pk):
    p = get_object_or_404(Payment, pk=pk)
    if p.status == 'pending':
        p.status = 'rejected'
        p.reviewed_by = request.user
        p.reviewed_at = timezone.now()
        p.save()
        messages.success(request, "To'lov rad etildi.")
    return redirect('panel:payment_detail', pk=pk)


@superadmin_required
def payment_grant(request):
    """Manually grant/revoke premium without a payment record."""
    if request.method == 'POST':
        username = request.POST.get('username', '').strip()
        action = request.POST.get('grant_action', 'grant')
        user = User.objects.filter(username=username).select_related('profile').first()
        if not user:
            messages.error(request, "Bunday foydalanuvchi topilmadi.")
        else:
            profile = user.profile
            if action == 'grant':
                profile.is_premium = True
                profile.premium_mock_test_unlocked = True
                profile.save()
                messages.success(request, f"{username} ga premium berildi.")
            else:
                profile.is_premium = False
                profile.premium_mock_test_unlocked = False
                profile.save()
                messages.success(request, f"{username} dan premium olib tashlandi.")
        return redirect('panel:payment_grant')
    return render(request, 'panel/payment_grant.html', {'active_nav': 'payments'})


# ============================================================ SETTINGS
@superadmin_required
def settings_edit(request):
    settings_obj = SiteSettings.load()
    if request.method == 'POST':
        form = SiteSettingsForm(request.POST, instance=settings_obj)
        if form.is_valid():
            form.save()
            from django.core.cache import cache
            cache.delete('maintenance_mode')  # so the toggle takes effect immediately
            messages.success(request, "Sozlamalar saqlandi.")
            return redirect('panel:settings')
    else:
        form = SiteSettingsForm(instance=settings_obj)
    return render(request, 'panel/settings.html', {'active_nav': 'settings', 'form': form})


# ============================================================ AUDIT LOG
class AuditLogListView(PanelListView):
    model = AuditLog
    title = "Audit jurnali"
    icon = 'history'
    active_nav = 'audit'
    search_fields = ['object_repr', 'model_name', 'user__username']
    default_order = '-timestamp'
    row_actions = False
    filters = [{'param': 'action', 'label': 'Amal', 'lookup': 'action',
                'options': AuditLog.ACTION_CHOICES}]
    columns = [
        Column("Kim", lambda l: (l.user.get_full_name() or l.user.username) if l.user else 'Tizim'),
        Column("Amal", lambda l: badge(l.get_action_display(),
                {'create': 'green', 'update': 'blue', 'delete': 'rose'}.get(l.action, 'slate'))),
        Column("Model", 'model_name'),
        Column("Obyekt", 'object_repr'),
        Column("Vaqt", lambda l: l.timestamp.strftime('%Y-%m-%d %H:%M')),
    ]

    def get_base_queryset(self):
        return AuditLog.objects.select_related('user').all()


# ============================================================ BROADCAST
def _audience_profiles(audience):
    qs = Profile.objects.select_related('user').filter(user__is_active=True)
    if audience == 'students':
        return qs.filter(role='student')
    if audience == 'teachers':
        return qs.filter(role='teacher')
    if audience == 'premium':
        return qs.filter(Q(is_premium=True) | Q(premium_mock_test_unlocked=True))
    return qs


@superadmin_required
def broadcast(request):
    if request.method == 'POST':
        form = BroadcastForm(request.POST, request.FILES)
        if form.is_valid():
            bc = form.save(commit=False)
            bc.sent_by = request.user
            profiles = list(_audience_profiles(bc.audience))

            Notification.objects.bulk_create([
                Notification(profile=p, title=bc.title, message=bc.message, type='system')
                for p in profiles
            ])
            bc.recipients_count = len(profiles)
            # Save first so the image file is fully written to storage
            # before we try to open it for the Telegram sendPhoto request.
            bc.save()

            if bc.via_telegram:
                sent = 0
                caption = f"{bc.title}\n\n{bc.message}"
                has_image = bool(bc.image)
                image_path = bc.image.path if has_image else None
                for p in profiles:
                    if not p.telegram_id:
                        continue
                    if has_image:
                        ok = send_telegram_photo(p.telegram_id, image_path, caption)
                    else:
                        ok = send_telegram_message(p.telegram_id, caption)
                    if ok:
                        sent += 1
                bc.telegram_sent_count = sent
                bc.save(update_fields=['telegram_sent_count'])
            messages.success(request, f"Xabar {bc.recipients_count} foydalanuvchiga yuborildi"
                                      + (f" ({bc.telegram_sent_count} ta Telegram orqali)." if bc.via_telegram else "."))
            return redirect('panel:broadcast')
    else:
        form = BroadcastForm()

    return render(request, 'panel/broadcast.html', {
        'active_nav': 'broadcast',
        'form': form,
        'history': Broadcast.objects.select_related('sent_by')[:20],
        'audience_counts': {a[0]: _audience_profiles(a[0]).count() for a in Broadcast.AUDIENCE_CHOICES},
    })


@superadmin_required
@require_POST
def broadcast_delete(request, pk):
    """Delete a past broadcast record. Also removes the uploaded image file if present."""
    bc = get_object_or_404(Broadcast, pk=pk)
    # Remove image from disk before deleting the record
    if bc.image:
        try:
            bc.image.delete(save=False)
        except Exception:
            pass
    bc.delete()
    messages.success(request, "Broadcast o'chirildi.")
    return redirect('panel:broadcast')


# ============================================================ USER SUPERPOWERS
@superadmin_required
@require_POST
def user_impersonate(request, pk):
    """Log in AS another user to reproduce their view of the app. The original admin's id
    is stashed in the session so they can return; a banner (base.html) makes the state
    obvious. Cannot impersonate other admins/staff."""
    target = get_object_or_404(User.objects.select_related('profile'), pk=pk)
    if target.is_superuser or (hasattr(target, 'profile') and target.profile.is_superadmin):
        messages.error(request, "Boshqa adminni impersonatsiya qilib bo'lmaydi.")
        return redirect('panel:user_detail', pk=pk)
    if not target.is_active:
        messages.error(request, "Bloklangan foydalanuvchi sifatida kirib bo'lmaydi.")
        return redirect('panel:user_detail', pk=pk)

    original_id = request.user.id
    auth_login(request, target, backend='django.contrib.auth.backends.ModelBackend')
    request.session['impersonator_id'] = original_id
    messages.info(request, f"Siz endi '{target.username}' sifatida ko'ryapsiz.")
    return redirect('dashboard:home')


@require_POST
def stop_impersonation(request):
    """Return to the original super-admin account. Available to the impersonated session
    only (guarded by the presence of impersonator_id), so it needs no role decorator."""
    original_id = request.session.get('impersonator_id')
    if not original_id:
        return redirect('dashboard:home')
    admin_user = User.objects.filter(pk=original_id).first()
    request.session.pop('impersonator_id', None)
    if admin_user:
        auth_login(request, admin_user, backend='django.contrib.auth.backends.ModelBackend')
        return redirect('panel:users')
    return redirect('dashboard:home')


@superadmin_required
@require_POST
def user_adjust(request, pk):
    """Adjust a user's XP / coins / ELO from the panel (set absolute values)."""
    u = get_object_or_404(User.objects.select_related('profile'), pk=pk)
    profile = u.profile

    def _clean_int(name, current, lo=0, hi=10_000_000):
        raw = request.POST.get(name, '')
        if raw == '':
            return current
        try:
            return max(lo, min(hi, int(raw)))
        except (TypeError, ValueError):
            return current

    profile.xp = _clean_int('xp', profile.xp)
    profile.coins = _clean_int('coins', profile.coins)
    profile.elo_rating = _clean_int('elo_rating', profile.elo_rating, lo=100, hi=5000)
    # Keep level consistent with the (possibly edited) XP: 1000 XP per level.
    profile.level = max(1, profile.xp // 1000 + 1)
    profile.save()
    messages.success(request, f"{u.username} ko'rsatkichlari yangilandi.")
    return redirect('panel:user_detail', pk=pk)


@superadmin_required
@require_POST
def user_set_premium(request, pk):
    """Quick grant/revoke of premium access directly from the user detail page."""
    u = get_object_or_404(User.objects.select_related('profile'), pk=pk)
    profile = u.profile
    grant = request.POST.get('grant') == '1'
    profile.is_premium = grant
    profile.premium_mock_test_unlocked = grant
    if grant:
        profile.premium_expires_at = timezone.now() + timedelta(days=30)
    profile.save()
    Notification.objects.create(
        profile=profile, type='system',
        title="Premium holati o'zgardi",
        message=("Sizga premium kirish berildi!" if grant else "Premium kirishingiz to'xtatildi."),
    )
    messages.success(request, f"{u.username} ga premium {'berildi' if grant else 'olib tashlandi'}.")
    return redirect('panel:user_detail', pk=pk)
