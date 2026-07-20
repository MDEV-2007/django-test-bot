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
from django.views.generic import TemplateView

urlpatterns = [
    path('admin/', admin.site.urls),

    # Offline support. sw.js MUST be served from the site root: a service worker can only
    # control pages at or below its own path, so serving it from /static/js/ would scope
    # it to /static/js/ and it would never see a single page navigation.
    path('sw.js', TemplateView.as_view(
        template_name='sw.js', content_type='application/javascript'), name='service_worker'),
    path('offline/', TemplateView.as_view(
        template_name='offline.html'), name='offline'),
    path('', include('dashboard.urls')),
    path('accounts/', include('accounts.urls')),
    path('analytics/', include('analytics.urls')),
    path('battles/', include('battles.urls')),
    path('games/', include('games.urls')),
    path('leaderboard/', include('leaderboard.urls')),
    path('learning/', include('learning.urls')),
    path('panel/', include('panel.urls')),
    path('premium/', include('premium.urls')),
    path('shop/', include('shop.urls')),
    path('teacher/', include('teacher.urls')),
    path('telegram/', include('telegrambot.urls')),
    path('tests/', include('tests_app.urls')),
    path('ckeditor5/', include('django_ckeditor_5.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
