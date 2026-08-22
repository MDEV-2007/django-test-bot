from django.urls import path

from . import api

app_name = 'battles_api'

urlpatterns = [
    path('', api.arena_api, name='arena'),
    path('start-quiz/', api.start_quiz_api, name='start_quiz'),
    path('submit-round/', api.submit_round_api, name='submit_round'),
    path('finish/', api.finish_battle_api, name='finish'),
]
