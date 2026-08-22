from django.urls import path

from . import api

app_name = 'premium_api'

urlpatterns = [
    path('plans/', api.plans_api, name='plans'),
    path('checkout/<int:plan_id>/', api.CheckoutAPI.as_view(), name='checkout'),
    path('payments/<int:payment_id>/', api.payment_status_api, name='payment_status'),
    path('payments/<int:payment_id>/screenshot/', api.PaymentScreenshotAPI.as_view(), name='payment_screenshot'),
    path('my-payments/', api.my_payments_api, name='my_payments'),
]
