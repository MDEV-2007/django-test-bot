from django.db import models


class DailyChannelPost(models.Model):
    """Ledger of "qiyin savol" posts sent to the Telegram channel (Feature: daily hard
    question). One row per calendar day, dedupe on `posted_date` — the daily command
    checks this before posting so a re-run never double-posts the same day.

    `question` is SET_NULL (not CASCADE): if the source Question is later deleted, this
    historical record — and the channel message_id it points at — must survive.
    """

    question = models.ForeignKey(
        'tests_app.Question', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='daily_channel_posts',
    )
    posted_date = models.DateField(unique=True, db_index=True)
    channel_message_id = models.PositiveBigIntegerField(
        null=True, blank=True,
        help_text="Telegram message_id of the post in the channel (for reference/deep-link building).",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-posted_date']

    def __str__(self):
        q = f"Q{self.question_id}" if self.question_id else "(o'chirilgan savol)"
        return f"{self.posted_date} — {q}"


class RequiredChannel(models.Model):
    """Sponsor or mandatory channel that users must join before taking tests / using bot."""
    title = models.CharField(max_length=150, help_text="Kanal nomi (masalan: 'Ilm Ildizi Rasmiy')")
    username_or_id = models.CharField(
        max_length=150,
        help_text="@username yoki raqamli -100... id"
    )
    invite_url = models.URLField(max_length=500, blank=True, help_text="Kanal havolasi (masalan: https://t.me/ilmildizi)")
    is_active = models.BooleanField(default=True, help_text="Faol holatda o'quvchilardan a'zolik talab qilinadi")
    order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['order', '-created_at']

    def __str__(self):
        return f"{self.title} ({self.username_or_id})"

