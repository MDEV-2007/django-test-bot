from django.urls import path

from . import api

app_name = 'games_api'

urlpatterns = [
    path('timeline/', api.timeline_api, name='timeline'),
    path('map/', api.map_api, name='map'),
    path('character/', api.character_api, name='character'),
]
