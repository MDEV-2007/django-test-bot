from django.urls import path
from . import views

app_name = 'tests'

urlpatterns = [
    path('', views.center, name='center'),
    path('start/<int:test_id>/', views.start_test, name='start_test'),
    path('start-random/', views.start_random_test, name='start_random_test'),
    path('start-mistakes/', views.start_mistakes_test, name='start_mistakes_test'),
    path('revision/', views.revision_center, name='revision'),
    path('revision/check/<int:item_id>/', views.revision_check, name='revision_check'),
    path('screen/<int:attempt_id>/', views.screen, name='screen'),
    path('submit-answer/<int:attempt_id>/', views.submit_answer, name='submit_answer'),
    path('finish/<int:attempt_id>/', views.finish, name='finish'),
    path('feedback/<int:attempt_id>/', views.feedback, name='feedback'),
    path('history/', views.history, name='history'),
]
