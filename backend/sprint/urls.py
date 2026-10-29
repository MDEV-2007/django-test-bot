from django.urls import path
from .views import ExplainMistakeAPIView, ResolveRevengeMistakeAPIView, SprintQuestionsAPIView

urlpatterns = [
    path('questions/', SprintQuestionsAPIView.as_view(), name='sprint-questions'),
    path('explain-mistake/', ExplainMistakeAPIView.as_view(), name='sprint-explain-mistake'),
    path('resolve-revenge/', ResolveRevengeMistakeAPIView.as_view(), name='sprint-resolve-revenge'),
]

