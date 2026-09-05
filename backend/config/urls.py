"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path, include

from config.health import healthz

urlpatterns = [
    # Docker healthcheck (konteyner ichidan chaqiriladi; nginx bu manzilni tashqariga
    # ochmaydi — u /api, /telegram, /admin dan tashqari hammasini frontendga yuboradi).
    path('healthz', healthz),

    path('admin/', admin.site.urls),

    # JSON API for the Next.js frontend (frontend/). Django endi FAQAT backend:
    # shablonlar va sahifa marshrutlari olib tashlandi, butun UI Next.js tomonida.
    path('api/auth/', include('accounts.api_urls')),
    path('api/dashboard/', include('dashboard.api_urls')),
    path('api/tests/', include('tests_app.api_urls')),
    path('api/leaderboard/', include('leaderboard.api_urls')),
    path('api/battles/', include('battles.api_urls')),
    path('api/shop/', include('shop.api_urls')),
    path('api/premium/', include('premium.api_urls')),
    path('api/learning/', include('learning.api_urls')),
    path('api/teacher/', include('teacher.api_urls')),
    path('api/panel/', include('panel.api_urls')),
    path('api/games/', include('games.api_urls')),
    path('api/analytics/', include('analytics.api_urls')),

    # Telegram webhook — bot serverdan to'g'ridan-to'g'ri chaqiradi.
    path('telegram/', include('telegrambot.urls')),
    path('ckeditor5/', include('django_ckeditor_5.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
