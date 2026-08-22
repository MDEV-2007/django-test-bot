from django.urls import path

from . import api

app_name = 'leaderboard_api'

urlpatterns = [
    path('', api.rankings_api, name='rankings'),
]
