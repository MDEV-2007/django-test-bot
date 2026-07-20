from django.urls import path
from . import views
app_name = 'games'
urlpatterns = [
    path('timeline/', views.timeline, name='timeline'),
    path('map/', views.map_challenge, name='map'),
    path('character/', views.character, name='character'),
]
