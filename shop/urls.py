from django.urls import path

from . import views

app_name = 'shop'

urlpatterns = [
    path('', views.shop_home, name='home'),
    path('inventory/', views.inventory, name='inventory'),
    path('buy/<slug:slug>/', views.purchase, name='purchase'),
    path('equip/<slug:slug>/', views.equip, name='equip'),
    path('unequip/<slug:slug>/', views.unequip, name='unequip'),
]
