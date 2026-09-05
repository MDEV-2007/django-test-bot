from django.urls import path

from . import api

app_name = 'panel_api'

urlpatterns = [
    path('', api.dashboard_api, name='dashboard'),

    path('users/', api.users_api, name='users'),
    path('users/<int:pk>/', api.user_detail_api, name='user_detail'),
    path('users/<int:pk>/edit/', api.user_edit_api, name='user_edit'),
    path('users/<int:pk>/toggle-block/', api.user_toggle_block_api, name='user_toggle_block'),
    path('users/<int:pk>/reset-password/', api.user_reset_password_api, name='user_reset_password'),
    path('users/<int:pk>/adjust/', api.user_adjust_api, name='user_adjust'),
    path('users/<int:pk>/set-premium/', api.user_set_premium_api, name='user_set_premium'),
    path('users/<int:pk>/impersonate/', api.user_impersonate_api, name='user_impersonate'),
    path('stop-impersonation/', api.stop_impersonation_api, name='stop_impersonation'),

    path('teachers/', api.teachers_api, name='teachers'),
    path('teachers/create/', api.teacher_create_api, name='teacher_create'),

    path('subjects/', api.subjects_api, name='subjects'),
    path('subjects/<int:pk>/', api.subject_detail_api, name='subject_detail'),

    path('shop/', api.shop_items_api, name='shop'),
    path('shop/<int:pk>/', api.shop_item_detail_api, name='shop_detail'),

    path('testsets/', api.testsets_api, name='testsets'),
    path('testsets/bulk/', api.testsets_bulk_api, name='testsets_bulk'),
    path('testsets/<int:pk>/', api.testset_detail_api, name='testset_detail'),
    path('testsets/<int:pk>/edit/', api.testset_edit_api, name='testset_edit'),
    path('testsets/<int:pk>/duplicate/', api.testset_duplicate_api, name='testset_duplicate'),
    path('testsets/<int:pk>/toggle-publish/', api.testset_toggle_publish_api, name='testset_toggle_publish'),
    path('testsets/<int:pk>/review/', api.testset_review_api, name='testset_review'),
    path('testsets/<int:pk>/review/<int:question_pk>/', api.testset_review_answer_api,
         name='testset_review_answer'),

    path('lessons/', api.lessons_api, name='lessons'),
    path('lessons/<int:pk>/', api.lesson_detail_api, name='lesson_detail'),

    path('games/', api.games_api, name='games'),
    path('games/<int:pk>/', api.game_detail_api, name='game_detail'),

    path('attempts/', api.attempts_api, name='attempts'),
    path('attempts/export/', api.attempts_export_api, name='attempts_export'),
    path('attempts/<int:pk>/', api.attempt_detail_api, name='attempt_detail'),

    path('payments/', api.payments_api, name='payments'),
    path('payments/<int:pk>/', api.payment_detail_api, name='payment_detail'),
    path('payments/<int:pk>/approve/', api.payment_approve_api, name='payment_approve'),
    path('payments/<int:pk>/reject/', api.payment_reject_api, name='payment_reject'),
    path('payments/grant/', api.payments_grant_api, name='payments_grant'),

    path('settings/', api.settings_api, name='settings'),
    path('audit-log/', api.audit_log_api, name='audit_log'),

    path('broadcast/', api.broadcast_api, name='broadcast'),
    path('broadcast/<int:pk>/delete/', api.broadcast_delete_api, name='broadcast_delete'),
]
