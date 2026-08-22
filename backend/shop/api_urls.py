from django.urls import path

from . import api

app_name = 'shop_api'

urlpatterns = [
    path('', api.shop_home_api, name='home'),
    path('inventory/', api.inventory_api, name='inventory'),
    path('buy/<slug:slug>/', api.purchase_api, name='purchase'),
    path('equip/<slug:slug>/', api.equip_api, name='equip'),
    path('unequip/<slug:slug>/', api.unequip_api, name='unequip'),
]
