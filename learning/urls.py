from django.urls import path
from . import views

app_name = 'learning'

urlpatterns = [
    path('', views.center, name='center'),
    path('mentor/', views.mentor, name='mentor'),
    path('toggle-bookmark/<int:lesson_id>/', views.toggle_bookmark, name='toggle_bookmark'),
]
