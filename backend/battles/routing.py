from django.urls import re_path

from . import consumers

websocket_urlpatterns = [
    re_path(r'^ws/battles/matchmaking/$', consumers.MatchmakingConsumer.as_asgi()),
    re_path(r'^ws/battles/lobby/$', consumers.LobbyConsumer.as_asgi()),
    re_path(r'^ws/battles/(?P<battle_id>\d+)/$', consumers.BattleConsumer.as_asgi()),
]
