from django.urls import path
from . import views

app_name = 'accounts'

urlpatterns = [
    path('login/', views.login_view, name='login'),
    path('register/', views.register_view, name='register'),
    path('logout/', views.logout_view, name='logout'),
    path('tg-login/', views.tg_login, name='tg_login'),
    path('google-login/', views.google_login, name='google_login'),
    path('profile/', views.profile_view, name='profile'),
    path('onboarding/', views.onboarding_view, name='onboarding'),
]
