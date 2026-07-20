from django.urls import path
from . import views

app_name = 'panel'

urlpatterns = [
    path('', views.dashboard, name='dashboard'),

    # Users
    path('users/', views.UserListView.as_view(), name='users'),
    path('users/<int:pk>/', views.user_detail, name='user_detail'),
    path('users/<int:pk>/edit/', views.UserUpdateView.as_view(), name='user_edit'),
    path('users/<int:pk>/delete/', views.UserDeleteView.as_view(), name='user_delete'),
    path('users/<int:pk>/toggle-block/', views.user_toggle_block, name='user_toggle_block'),
    path('users/<int:pk>/reset-password/', views.user_reset_password, name='user_reset_password'),
    path('users/<int:pk>/impersonate/', views.user_impersonate, name='user_impersonate'),
    path('users/<int:pk>/adjust/', views.user_adjust, name='user_adjust'),
    path('users/<int:pk>/set-premium/', views.user_set_premium, name='user_set_premium'),
    path('stop-impersonation/', views.stop_impersonation, name='stop_impersonation'),

    # Broadcast
    path('broadcast/', views.broadcast, name='broadcast'),
    path('broadcast/<int:pk>/delete/', views.broadcast_delete, name='broadcast_delete'),

    # Teachers
    path('teachers/', views.TeacherListView.as_view(), name='teachers'),
    path('teachers/create/', views.teacher_create, name='teacher_create'),

    # Subjects
    path('subjects/', views.SubjectListView.as_view(), name='subjects'),
    path('subjects/create/', views.SubjectCreateView.as_view(), name='subject_create'),
    path('subjects/<int:pk>/edit/', views.SubjectUpdateView.as_view(), name='subject_edit'),
    path('subjects/<int:pk>/delete/', views.SubjectDeleteView.as_view(), name='subject_delete'),

    # Shop items (Coin do'kon)
    path('shop/', views.ShopItemListView.as_view(), name='shop'),
    path('shop/create/', views.ShopItemCreateView.as_view(), name='shopitem_create'),
    path('shop/<int:pk>/edit/', views.ShopItemUpdateView.as_view(), name='shopitem_edit'),
    path('shop/<int:pk>/delete/', views.ShopItemDeleteView.as_view(), name='shopitem_delete'),

    # Test sets
    path('tests/', views.TestSetListView.as_view(), name='testsets'),
    path('tests/<int:pk>/', views.testset_detail, name='testset_detail'),
    path('tests/<int:pk>/edit/', views.TestSetUpdateView.as_view(), name='testset_edit'),
    path('tests/<int:pk>/delete/', views.TestSetDeleteView.as_view(), name='testset_delete'),
    path('tests/<int:pk>/duplicate/', views.testset_duplicate, name='testset_duplicate'),
    path('tests/<int:pk>/toggle-publish/', views.testset_toggle_publish, name='testset_toggle_publish'),

    # Lessons
    path('lessons/', views.LessonListView.as_view(), name='lessons'),
    path('lessons/create/', views.LessonCreateView.as_view(), name='lesson_create'),
    path('lessons/<int:pk>/edit/', views.LessonUpdateView.as_view(), name='lesson_edit'),
    path('lessons/<int:pk>/delete/', views.LessonDeleteView.as_view(), name='lesson_delete'),

    # Games
    path('games/', views.GameListView.as_view(), name='games'),
    path('games/create/', views.GameCreateView.as_view(), name='game_create'),
    path('games/<int:pk>/edit/', views.GameUpdateView.as_view(), name='game_edit'),
    path('games/<int:pk>/delete/', views.GameDeleteView.as_view(), name='game_delete'),

    # Attempts / results
    path('results/', views.AttemptListView.as_view(), name='attempts'),
    path('results/<int:pk>/', views.attempt_detail, name='attempt_detail'),
    path('results/export/', views.attempts_export, name='attempts_export'),

    # Payments
    path('payments/', views.PaymentListView.as_view(), name='payments'),
    path('payments/grant/', views.payment_grant, name='payment_grant'),
    path('payments/<int:pk>/', views.payment_detail, name='payment_detail'),
    path('payments/<int:pk>/approve/', views.payment_approve, name='payment_approve'),
    path('payments/<int:pk>/reject/', views.payment_reject, name='payment_reject'),

    # Settings & audit
    path('settings/', views.settings_edit, name='settings'),
    path('audit/', views.AuditLogListView.as_view(), name='audit'),
]
