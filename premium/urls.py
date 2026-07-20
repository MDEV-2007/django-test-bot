from django.urls import path
from . import views
app_name = 'premium'
urlpatterns = [
    path('', views.plans, name='plans'),
    path('checkout/<int:plan_id>/', views.checkout, name='checkout'),
    path('payment/<int:payment_id>/', views.payment_status, name='payment_status'),
    path('payment/<int:payment_id>/screenshot/', views.payment_screenshot, name='payment_screenshot'),
    path('history/', views.my_payments, name='my_payments'),
]
