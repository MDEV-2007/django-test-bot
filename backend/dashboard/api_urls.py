from django.urls import path

from . import api

app_name = 'dashboard_api'

urlpatterns = [
    path('home/', api.home_api, name='home'),
    path('daily-chest/', api.daily_chest_api, name='daily_chest'),
    path('daily-chest/open/', api.daily_chest_open_api, name='daily_chest_open'),
    path('notifications/', api.notifications_api, name='notifications'),
    path('landing-leaderboard/', api.landing_leaderboard_api, name='landing_leaderboard'),
    path('landing-reviews/', api.landing_reviews_api, name='landing_reviews'),
]
