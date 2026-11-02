from django.contrib import admin
from .models import EduCenterCampaign, StudentLeadSubmission


@admin.register(EduCenterCampaign)
class EduCenterCampaignAdmin(admin.ModelAdmin):
    list_display = ('center_name', 'target_subject', 'target_region', 'max_score_threshold', 'is_active', 'created_at')
    list_filter = ('is_active', 'target_subject', 'target_region')
    search_fields = ('center_name', 'title', 'description')
    ordering = ('-created_at',)


@admin.register(StudentLeadSubmission)
class StudentLeadSubmissionAdmin(admin.ModelAdmin):
    list_display = ('full_name', 'phone_number', 'telegram_username', 'campaign', 'predicted_dtm_score', 'created_at')
    list_filter = ('campaign', 'created_at')
    search_fields = ('full_name', 'phone_number', 'telegram_username', 'weakest_topics')
    readonly_fields = ('created_at',)
    ordering = ('-created_at',)
