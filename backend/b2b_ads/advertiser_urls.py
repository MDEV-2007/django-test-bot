from django.urls import path

from b2b_ads import advertiser_api as api

app_name = 'advertiser'

urlpatterns = [
    path('apply/', api.apply_api, name='apply'),
    path('me/', api.me_api, name='me'),
    path('profile/', api.profile_api, name='profile'),
    path('dashboard/', api.dashboard_api, name='dashboard'),
    path('campaigns/', api.campaigns_api, name='campaigns'),
    path('campaigns/<int:pk>/', api.campaign_detail_api, name='campaign_detail'),
    path('campaigns/<int:pk>/submit/', api.campaign_submit_api, name='campaign_submit'),
    path('campaigns/<int:pk>/pause/', api.campaign_pause_api, name='campaign_pause'),
    path('campaigns/<int:pk>/resume/', api.campaign_resume_api, name='campaign_resume'),
    path('campaigns/<int:pk>/end/', api.campaign_end_api, name='campaign_end'),
    path('campaigns/<int:pk>/duplicate/', api.campaign_duplicate_api, name='campaign_duplicate'),
    path('creatives/', api.creatives_api, name='creatives'),
    path('creatives/<int:pk>/', api.creative_delete_api, name='creative_delete'),
    path('audiences/', api.audiences_api, name='audiences'),
    path('leads/', api.leads_api, name='leads'),
    path('leads/export/', api.leads_export_api, name='leads_export'),
    path('leads/<int:pk>/', api.lead_detail_api, name='lead_detail'),
    path('leads/<int:pk>/status/', api.lead_status_api, name='lead_status'),
    path('analytics/', api.analytics_api, name='analytics'),
    path('billing/', api.billing_api, name='billing'),
]
