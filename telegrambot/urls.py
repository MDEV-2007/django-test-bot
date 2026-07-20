from django.urls import path

from . import views

app_name = 'telegrambot'

urlpatterns = [
    # The path itself carries no secret — authentication is the
    # X-Telegram-Bot-Api-Secret-Token header checked in the view.
    path('webhook/', views.webhook, name='webhook'),
]
