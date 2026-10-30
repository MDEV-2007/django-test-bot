from django.urls import path
from .views import (
    EvaluateOpenQuestionAPIView,
    EvaluateEssayAPIView,
    AdaptiveOnboardingAPIView,
    UserGrowthStatusAPIView,
)
from .arena_views import (
    GhostMatchmakeAPIView,
    RecordPlayerReplayAPIView,
    CreateDuelChallengeAPIView,
    GetDuelChallengeAPIView,
    SubmitDuelResultAPIView,
)

urlpatterns = [
    # 1. AI Open-Question & Essay Grader
    path('open-question/evaluate/', EvaluateOpenQuestionAPIView.as_view(), name='growth-open-question-eval'),
    path('essay/evaluate/', EvaluateEssayAPIView.as_view(), name='growth-essay-eval'),
    path('onboarding-blitz/', AdaptiveOnboardingAPIView.as_view(), name='growth-onboarding-blitz'),
    path('status/', UserGrowthStatusAPIView.as_view(), name='growth-status'),

    # 2. Ghost PvP Arena & Viral Duels
    path('arena/matchmake/', GhostMatchmakeAPIView.as_view(), name='growth-arena-matchmake'),
    path('arena/record-replay/', RecordPlayerReplayAPIView.as_view(), name='growth-arena-record-replay'),
    path('arena/create-duel/', CreateDuelChallengeAPIView.as_view(), name='growth-arena-create-duel'),
    path('arena/duel/<str:duel_token>/', GetDuelChallengeAPIView.as_view(), name='growth-arena-get-duel'),
    path('arena/duel/<str:duel_token>/submit/', SubmitDuelResultAPIView.as_view(), name='growth-arena-submit-duel'),
]

