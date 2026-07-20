from django.urls import path
from . import views

app_name = 'battles'

urlpatterns = [
    path('', views.arena, name='arena'),
    path('start-quiz/', views.start_battle_quiz, name='start_battle_quiz'),
    path('submit-round/', views.submit_round, name='submit_round'),
    path('finish/', views.finish_battle, name='finish_battle'),
]
