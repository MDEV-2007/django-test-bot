"""O'qituvchi paneli API yo'llari (Next.js frontend uchun) + Feature 1 (sinf)."""
from django.urls import path

from . import api

app_name = 'teacher_api'

urlpatterns = [
    path('', api.dashboard_api, name='dashboard'),

    # --- Testlar ---
    path('tests/', api.test_list_api, name='tests'),
    path('tests/create/', api.test_create_api, name='test_create'),
    path('tests/<int:pk>/info/', api.test_info_api, name='test_info'),
    path('tests/<int:pk>/build/', api.test_build_api, name='test_build'),
    path('tests/<int:pk>/preview/', api.test_preview_api, name='test_preview'),
    path('tests/<int:pk>/publish/', api.test_publish_api, name='test_publish'),
    path('tests/<int:pk>/delete/', api.test_delete_api, name='test_delete'),
    path('tests/<int:pk>/results/', api.test_results_api, name='test_results'),
    path('tests/<int:pk>/reorder/', api.question_reorder_api, name='question_reorder'),
    path('tests/<int:pk>/make-game/', api.game_from_test_api, name='game_from_test'),
    path('tests/<int:pk>/questions/add/', api.question_add_api, name='question_add'),
    path('tests/<int:pk>/questions/<int:qid>/', api.question_detail_api, name='question_detail'),
    path('tests/<int:pk>/questions/<int:qid>/delete/', api.question_delete_api, name='question_delete'),
    path('tests/<int:pk>/attempts/<int:attempt_id>/grade/', api.attempt_grade_api, name='attempt_grade'),

    path('topics/', api.topics_api, name='topics'),

    # --- Darslar ---
    path('lessons/', api.lesson_list_api, name='lessons'),
    path('lessons/create/', api.lesson_create_api, name='lesson_create'),
    path('lessons/<int:pk>/', api.lesson_edit_api, name='lesson_edit'),
    path('lessons/<int:pk>/delete/', api.lesson_delete_api, name='lesson_delete'),

    # --- O'yinlar ---
    path('games/', api.game_list_api, name='games'),
    path('games/create/', api.game_create_api, name='game_create'),
    path('games/<int:pk>/', api.game_edit_api, name='game_edit'),
    path('games/<int:pk>/delete/', api.game_delete_api, name='game_delete'),

    # --- Feature 1: o'qituvchi-orqali-sinf ---
    path('register/', api.register_teacher, name='register'),
    path('me/referral-link/', api.referral_link, name='referral_link'),
    path('me/dashboard/', api.class_dashboard, name='class_dashboard'),
    path('me/students/<int:student_id>/', api.student_detail, name='class_student_detail'),
]
