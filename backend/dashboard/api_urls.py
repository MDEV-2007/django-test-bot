from django.urls import path

from . import api

app_name = 'dashboard_api'

urlpatterns = [
    path('home/', api.home_api, name='home'),
]
