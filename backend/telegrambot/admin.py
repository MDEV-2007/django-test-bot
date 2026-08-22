from django.contrib import admin

from .models import DailyChannelPost


@admin.register(DailyChannelPost)
class DailyChannelPostAdmin(admin.ModelAdmin):
    list_display = ('posted_date', 'question', 'channel_message_id')
    list_filter = ('posted_date',)
    date_hierarchy = 'posted_date'
    autocomplete_fields = ('question',)
