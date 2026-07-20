from django.urls import path
from . import views

app_name = 'teacher'

urlpatterns = [
    path('', views.dashboard, name='dashboard'),

    # Tests
    path('tests/', views.test_list, name='tests'),
    path('tests/new/', views.test_create, name='test_create'),
    path('tests/<int:pk>/info/', views.test_edit_info, name='test_edit_info'),
    path('tests/<int:pk>/build/', views.test_build, name='test_build'),
    path('tests/<int:pk>/preview/', views.test_preview, name='test_preview'),
    path('tests/<int:pk>/publish/', views.test_publish, name='test_publish'),
    path('tests/<int:pk>/delete/', views.test_delete, name='test_delete'),
    path('tests/<int:pk>/results/', views.test_results, name='test_results'),
    path('tests/<int:pk>/reorder/', views.question_reorder, name='question_reorder'),
    path('tests/<int:pk>/make-game/', views.game_from_test, name='game_from_test'),
    path('tests/<int:pk>/questions/add/', views.question_add, name='question_add'),
    path('tests/<int:pk>/questions/<int:qid>/edit/', views.question_edit, name='question_edit'),
    path('tests/<int:pk>/questions/<int:qid>/delete/', views.question_delete, name='question_delete'),
    path('tests/<int:pk>/attempts/<int:attempt_id>/grade/', views.attempt_grade, name='attempt_grade'),

    # Lessons
    path('lessons/', views.lesson_list, name='lessons'),
    path('lessons/new/', views.lesson_create, name='lesson_create'),
    path('lessons/<int:pk>/edit/', views.lesson_edit, name='lesson_edit'),
    path('lessons/<int:pk>/delete/', views.lesson_delete, name='lesson_delete'),

    # Games
    path('games/', views.game_list, name='games'),
    path('games/new/', views.game_create, name='game_create'),
    path('games/<int:pk>/edit/', views.game_edit, name='game_edit'),
    path('games/<int:pk>/delete/', views.game_delete, name='game_delete'),
]
