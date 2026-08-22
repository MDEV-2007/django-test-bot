from django.contrib import admin
from .models import Profile


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'telegram_username', 'level', 'xp', 'coins', 'is_premium')
    search_fields = ('user__username', 'telegram_username')
    list_filter = ('is_premium', 'language')
