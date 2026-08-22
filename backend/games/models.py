from django.db import models
from django.contrib.auth.models import User


class Game(models.Model):
    """A teacher-authored learning game (flashcards / match-pairs / quiz-race). Distinct
    from the built-in play experiences above (timeline, map challenge, guess-the-character),
    which are fixed platform features rather than per-teacher content."""
    GAME_TYPE_CHOICES = [
        ('flashcards', 'Flesh-kartalar'),
        ('match_pairs', 'Juftlikni top'),
        ('quiz_race', 'Tezkor viktorina'),
    ]

    title = models.CharField(max_length=200)
    game_type = models.CharField(max_length=20, choices=GAME_TYPE_CHOICES, default='flashcards')
    subject = models.ForeignKey(
        'tests_app.Subject', on_delete=models.SET_NULL, null=True, blank=True, related_name='games',
    )
    description = models.TextField(blank=True)
    created_by = models.ForeignKey(
        User, on_delete=models.CASCADE, null=True, blank=True, related_name='games',
    )
    is_published = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} ({self.get_game_type_display()})"


class GameItem(models.Model):
    game = models.ForeignKey(Game, on_delete=models.CASCADE, related_name='items')
    front_text = models.CharField(max_length=500, help_text="Old tomon / atama / savol")
    back_text = models.CharField(max_length=500, help_text="Orqa tomon / ta'rif / javob")
    image = models.ImageField(upload_to='games/%Y/%m/', null=True, blank=True)
    order = models.IntegerField(default=0)

    class Meta:
        ordering = ['order', 'id']

    def __str__(self):
        return f"{self.front_text[:30]} → {self.back_text[:30]}"


class HistoricalEvent(models.Model):
    ERA_CHOICES = [
        ('ancient', 'Qadimgi Davr'),
        ('medieval', 'O\'rta Asrlar'),
        ('modern', 'Yangi va Eng Yangi Davr'),
    ]
    subject = models.ForeignKey('tests_app.Subject', on_delete=models.SET_NULL, null=True, blank=True, related_name='timeline_events')
    title = models.CharField(max_length=200)
    year = models.IntegerField(help_text="Historical year (negative for BC)")
    description = models.TextField(blank=True)
    era = models.CharField(max_length=20, choices=ERA_CHOICES, default='medieval')
    order = models.IntegerField(default=0)

    class Meta:
        ordering = ['order', 'year']

    def __str__(self):
        year_display = f"{abs(self.year)} BC" if self.year < 0 else f"{self.year}-yil"
        return f"{self.title} ({year_display})"

class MapChallenge(models.Model):
    subject = models.ForeignKey('tests_app.Subject', on_delete=models.SET_NULL, null=True, blank=True, related_name='map_challenges')
    title = models.CharField(max_length=200)
    description = models.TextField()
    geojson_data = models.TextField(blank=True, help_text="GeoJSON representing empire boundaries/locations")
    correct_location = models.CharField(max_length=150, help_text="Name of city/region or coords")
    options = models.JSONField(default=list, blank=True, help_text="List of selectable region names shown to the player; one must match correct_location")
    map_image_url = models.URLField(max_length=500, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title

class HistoricalCharacter(models.Model):
    DIFFICULTY_CHOICES = [
        ('easy', 'Oson'),
        ('medium', 'O\'rta'),
        ('hard', 'Qiyin'),
    ]
    subject = models.ForeignKey('tests_app.Subject', on_delete=models.SET_NULL, null=True, blank=True, related_name='characters')
    name = models.CharField(max_length=150)
    avatar_url = models.URLField(max_length=500, blank=True)
    clue_1 = models.CharField(max_length=500, help_text="Easiest/broadest clue")
    clue_2 = models.CharField(max_length=500, help_text="Medium difficulty clue")
    clue_3 = models.CharField(max_length=500, help_text="Hardest/most specific clue")
    difficulty = models.CharField(max_length=10, choices=DIFFICULTY_CHOICES, default='medium')

    def __str__(self):
        return self.name
