from django.contrib import admin
from .models import DailyLearningLoop, UserEcoTree


@admin.register(DailyLearningLoop)
class DailyLearningLoopAdmin(admin.ModelAdmin):
    list_display = ('user', 'date', 'cycle_number', 'current_stage', 'combo_multiplier', 'dtm_score_delta', 'is_chest_claimed', 'updated_at')
    list_filter = ('current_stage', 'is_chest_claimed', 'date')
    search_fields = ('user__username', 'topic__title', 'subject__name')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(UserEcoTree)
class UserEcoTreeAdmin(admin.ModelAdmin):
    list_display = ('user', 'growth_stage', 'water_level', 'root_depth_xp', 'total_cycles_completed', 'last_watered_at')
    list_filter = ('growth_stage',)
    search_fields = ('user__username',)
