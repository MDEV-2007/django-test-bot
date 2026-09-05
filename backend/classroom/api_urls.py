from django.urls import path

from . import api

app_name = 'classroom_api'

urlpatterns = [
    path('mocks/', api.mocks_api, name='mocks'),
    path('mocks/<int:mock_id>/', api.mock_detail_api, name='mock_detail'),
    path('mocks/<int:mock_id>/start/', api.start_mock_api, name='mock_start'),
    path('mocks/<int:mock_id>/leaderboard/', api.leaderboard_api, name='mock_leaderboard'),
    # Javoblarning o'zi mavjud test endpointlari orqali saqlanadi
    # (/api/tests/attempts/<attempt_id>/answer/) — bu yerda faqat mock qobig'i.
    path('attempts/<int:mock_attempt_id>/', api.attempt_state_api, name='attempt_state'),
    path('attempts/<int:mock_attempt_id>/submit/', api.submit_attempt_api, name='attempt_submit'),
]
