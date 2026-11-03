from django.urls import path

from . import api

app_name = 'analytics_api'

urlpatterns = [
    path('', api.dashboard_api, name='dashboard'),
    # Feature 2 — DTM ball bashorati
    path('predicted-score/', api.predicted_score_api, name='predicted_score'),
    path('score-history/', api.score_history_api, name='score_history'),
    path('tagging-status/', api.tagging_status_api, name='tagging_status'),
    # O'sish analitikasi (biznes reja: faollik, qaytish, to'lov voronkasi)
    path('event/', api.track_event_api, name='track_event'),
    path('growth/', api.growth_metrics_api, name='growth_metrics'),
]
