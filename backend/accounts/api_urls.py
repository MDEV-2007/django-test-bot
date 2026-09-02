from django.urls import path

from . import api

app_name = 'accounts_api'

urlpatterns = [
    path('config/', api.auth_config_api, name='config'),
    path('login/', api.login_api, name='login'),
    path('register/', api.register_api, name='register'),
    path('google/', api.google_login_api, name='google'),
    path('telegram/', api.telegram_login_api, name='telegram'),
    path('refresh/', api.SafeTokenRefreshView.as_view(), name='refresh'),
    path('me/', api.me_api, name='me'),
    path('profile/', api.profile_api, name='profile'),
    path('subscription/', api.subscription_api, name='subscription'),
    path('subscription/check/', api.subscription_check_api, name='subscription_check'),
    path('onboarding-complete/', api.onboarding_complete_api, name='onboarding_complete'),
]
