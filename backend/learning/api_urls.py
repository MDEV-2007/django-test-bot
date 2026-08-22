from django.urls import path

from . import api

app_name = 'learning_api'

urlpatterns = [
    path('', api.center_api, name='center'),
    path('toggle-bookmark/<int:lesson_id>/', api.toggle_bookmark_api, name='toggle_bookmark'),
    path('mentor/stream/', api.MentorStreamAPI.as_view(), name='mentor_stream'),
]
