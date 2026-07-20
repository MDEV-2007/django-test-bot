from django.contrib import admin
from .models import DailyMission, ProfileMission, Badge, ProfileBadge, Notification


@admin.register(DailyMission)
class DailyMissionAdmin(admin.ModelAdmin):
    list_display = ('title', 'action_type', 'xp_reward', 'coin_reward', 'target_count')


@admin.register(ProfileMission)
class ProfileMissionAdmin(admin.ModelAdmin):
    list_display = ('profile', 'mission', 'current_count', 'is_completed', 'date')
    list_filter = ('is_completed', 'date')


@admin.register(Badge)
class BadgeAdmin(admin.ModelAdmin):
    list_display = ('name', 'rarity', 'icon_name')


@admin.register(ProfileBadge)
class ProfileBadgeAdmin(admin.ModelAdmin):
    list_display = ('profile', 'badge', 'unlocked_at')


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('profile', 'title', 'type', 'is_read', 'created_at')
    list_filter = ('type', 'is_read')
