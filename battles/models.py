from django.db import models
from accounts.models import Profile
from tests_app.models import Question, AnswerOption

class Battle(models.Model):
    STATUS_CHOICES = [
        ('searching', 'Mos raqib qidirilmoqda'),
        ('active', 'Jang davom etmoqda'),
        ('finished', 'Tugallangan'),
    ]
    player1 = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name='battles_as_p1')
    player2 = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name='battles_as_p2', null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='searching')
    winner = models.ForeignKey(Profile, on_delete=models.SET_NULL, null=True, blank=True, related_name='won_battles')
    is_vs_bot = models.BooleanField(default=False)
    bot_name = models.CharField(max_length=100, blank=True)
    bot_avatar_url = models.URLField(max_length=500, blank=True)
    bot_elo_rating = models.IntegerField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        p2_name = self.bot_name if self.is_vs_bot else (self.player2.user.username if self.player2 else "Kutilmoqda...")
        return f"Battle {self.id}: {self.player1.user.username} vs {p2_name} ({self.get_status_display()})"

class BattleRound(models.Model):
    battle = models.ForeignKey(Battle, on_delete=models.CASCADE, related_name='rounds')
    question = models.ForeignKey(Question, on_delete=models.CASCADE)
    round_number = models.IntegerField(default=1)
    bot_choice = models.ForeignKey(AnswerOption, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    bot_is_correct = models.BooleanField(default=False)

    class Meta:
        unique_together = ('battle', 'round_number')

    def __str__(self):
        return f"Battle {self.battle.id} - Round {self.round_number}"

class BattlePlayerAnswer(models.Model):
    battle_round = models.ForeignKey(BattleRound, on_delete=models.CASCADE, related_name='answers')
    player = models.ForeignKey(Profile, on_delete=models.CASCADE)
    selected_choice = models.ForeignKey(AnswerOption, on_delete=models.CASCADE, null=True, blank=True)
    response_time_ms = models.IntegerField(default=0)
    is_correct = models.BooleanField(default=False)

    class Meta:
        unique_together = ('battle_round', 'player')

    def __str__(self):
        return f"Battle {self.battle_round.battle.id} - Rnd {self.battle_round.round_number} - Player {self.player.user.username} - Correct: {self.is_correct}"
