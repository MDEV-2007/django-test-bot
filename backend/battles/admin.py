from django.contrib import admin
from .models import Battle, BattleRound, BattlePlayerAnswer


@admin.register(Battle)
class BattleAdmin(admin.ModelAdmin):
    list_display = ('id', 'player1', 'player2', 'status', 'winner', 'created_at')
    list_filter = ('status',)


@admin.register(BattleRound)
class BattleRoundAdmin(admin.ModelAdmin):
    list_display = ('battle', 'round_number', 'question')


@admin.register(BattlePlayerAnswer)
class BattlePlayerAnswerAdmin(admin.ModelAdmin):
    list_display = ('battle_round', 'player', 'selected_choice', 'is_correct', 'response_time_ms')
