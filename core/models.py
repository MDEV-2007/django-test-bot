from django.db import models
from django.utils import timezone
from accounts.models import Profile

class DailyMission(models.Model):
    ACTION_CHOICES = [
        ('test', 'Test topshirish'),
        ('battle', '1v1 Arena jangi'),
        ('lesson', 'Dars o\'qish'),
    ]
    title = models.CharField(max_length=200)
    description = models.TextField()
    xp_reward = models.IntegerField(default=100)
    coin_reward = models.IntegerField(default=10)
    target_count = models.IntegerField(default=1)
    action_type = models.CharField(max_length=20, choices=ACTION_CHOICES, default='test')

    def __str__(self):
        return f"{self.title} (x{self.target_count})"

class ProfileMission(models.Model):
    profile = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name='missions')
    mission = models.ForeignKey(DailyMission, on_delete=models.CASCADE)
    current_count = models.IntegerField(default=0)
    is_completed = models.BooleanField(default=False)
    # Was auto_now_add=True, which silently ignores any date passed to create() and stores
    # the server's UTC insert-date instead. That broke get_or_create(..., date=today): the
    # get() filtered on `today` while the create() wrote a possibly-different date, so the
    # get kept missing and the create kept hitting the unique constraint. A settable default
    # (local date) lets the per-day get_or_create work — and lets its race-retry recover.
    date = models.DateField(default=timezone.localdate)

    class Meta:
        unique_together = ('profile', 'mission', 'date')

    def __str__(self):
        status = "Completed" if self.is_completed else f"{self.current_count}/{self.mission.target_count}"
        return f"{self.profile.user.username} - {self.mission.title} - {status}"

class Badge(models.Model):
    RARITY_CHOICES = [
        ('common', 'Oddiy'),
        ('rare', 'Noyob'),
        ('epic', 'Epos'),
        ('legendary', 'Afsonaviy'),
    ]
    name = models.CharField(max_length=100)
    description = models.TextField()
    icon_name = models.CharField(max_length=50, default='award', help_text="Lucide icon name")
    rarity = models.CharField(max_length=20, choices=RARITY_CHOICES, default='common')

    def __str__(self):
        return f"{self.name} ({self.get_rarity_display()})"

class ProfileBadge(models.Model):
    profile = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name='badges')
    badge = models.ForeignKey(Badge, on_delete=models.CASCADE)
    unlocked_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('profile', 'badge')

    def __str__(self):
        return f"{self.profile.user.username} unlocked {self.badge.name}"

class StreakReminderLog(models.Model):
    """Dedupe ledger for the daily Telegram streak reminder (Feature 5). The
    (profile, date) unique constraint guarantees a student is reminded at most once per
    calendar day even if the command is run several times."""

    profile = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name='streak_reminders')
    date = models.DateField(default=timezone.localdate, db_index=True)
    sent_ok = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('profile', 'date')
        ordering = ['-created_at']

    def __str__(self):
        return f"Reminder to {self.profile.user.username} on {self.date}"


class Notification(models.Model):
    TYPE_CHOICES = [
        ('mission', 'Vazifa'),
        ('battle', 'Jang'),
        ('achievement', 'Yutuq'),
        ('system', 'Tizim'),
    ]
    profile = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name='notifications')
    title = models.CharField(max_length=200)
    message = models.TextField()
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='system')
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Notification for {self.profile.user.username}: {self.title} (Read: {self.is_read})"
