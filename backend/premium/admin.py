from django.contrib import admin
from .models import SubscriptionPlan, Payment


@admin.register(SubscriptionPlan)
class SubscriptionPlanAdmin(admin.ModelAdmin):
    list_display = ('name', 'plan_type', 'price', 'duration_days', 'is_active', 'order')
    list_editable = ('is_active', 'order')


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('profile', 'plan', 'amount', 'status', 'source', 'created_at')
    list_filter = ('status', 'source')
