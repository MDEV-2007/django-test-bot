from django.contrib import admin
from .models import HistoricalEvent, MapChallenge, HistoricalCharacter


@admin.register(HistoricalEvent)
class HistoricalEventAdmin(admin.ModelAdmin):
    list_display = ('title', 'year', 'era', 'order')
    list_filter = ('era',)


@admin.register(MapChallenge)
class MapChallengeAdmin(admin.ModelAdmin):
    list_display = ('title', 'correct_location', 'created_at')


@admin.register(HistoricalCharacter)
class HistoricalCharacterAdmin(admin.ModelAdmin):
    list_display = ('name', 'difficulty')
    list_filter = ('difficulty',)
