from django.urls import path
from b2b_ads import views

urlpatterns = [
    path('active-campaign/', views.active_campaign_api, name='active_campaign'),
    path('submit-lead/', views.submit_lead_api, name='submit_lead'),
]
