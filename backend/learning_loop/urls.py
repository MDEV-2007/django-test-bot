from django.urls import path
from .views import (
    CurrentLoopView,
    AdvanceStageView,
    LoopAnswerView,
    ShareLoopPostView,
    RestartCycleView,
    SetLoopSubjectView,
)

urlpatterns = [
    path('current/', CurrentLoopView.as_view(), name='loop_current'),
    path('set-subject/', SetLoopSubjectView.as_view(), name='loop_set_subject'),
    path('answer/', LoopAnswerView.as_view(), name='loop_answer'),
    path('advance-stage/', AdvanceStageView.as_view(), name='loop_advance_stage'),
    path('share-post/', ShareLoopPostView.as_view(), name='loop_share_post'),
    path('restart-cycle/', RestartCycleView.as_view(), name='loop_restart_cycle'),
]
