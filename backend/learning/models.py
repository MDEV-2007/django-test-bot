from django.db import models
from accounts.models import Profile

class Topic(models.Model):
    CATEGORY_CHOICES = [
        ('history', 'Tarix'),
        ('certificate', 'Milliy Sertifikat'),
        ('bba', 'BBA Imtihoni'),
    ]
    title = models.CharField(max_length=200)
    slug = models.SlugField(unique=True)
    description = models.TextField(blank=True)
    # String FK ('app.Model') avoids a circular import: tests_app.models already imports
    # learning.Topic, so importing tests_app.Subject here directly would cycle.
    subject = models.ForeignKey('tests_app.Subject', on_delete=models.SET_NULL, null=True, blank=True, related_name='topics')
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='history')
    order = models.IntegerField(default=0)
    icon_name = models.CharField(max_length=50, default='book')

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"[{self.get_category_display()}] {self.title}"

class Lesson(models.Model):
    topic = models.ForeignKey(Topic, on_delete=models.CASCADE, related_name='lessons')
    title = models.CharField(max_length=200)
    content = models.TextField(help_text="Lesson reading notes and material in HTML or Markdown")
    video_url = models.URLField(max_length=500, blank=True, help_text="YouTube video havolasi (ixtiyoriy).")
    created_by = models.ForeignKey(
        'auth.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='lessons',
        help_text="Darsni yaratgan o'qituvchi/admin. Teacher panelda faqat o'z darslari ko'rinadi.",
    )
    is_published = models.BooleanField(
        default=False,
        help_text="Faqat nashr etilgan darslar o'quvchilarga ko'rinadi.",
    )
    order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"{self.topic.title} - {self.title}"

    @property
    def status_label(self):
        return "Nashr etilgan" if self.is_published else "Qoralama"

class VideoLesson(models.Model):
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name='videos')
    title = models.CharField(max_length=200)
    video_url = models.URLField(max_length=500)
    duration_seconds = models.IntegerField(default=0)
    order = models.IntegerField(default=0)
    is_premium = models.BooleanField(default=True, help_text="Faqat premium (oylik obuna) foydalanuvchilarga ochiq")

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"Video: {self.title}"

    @property
    def duration_display(self):
        minutes = self.duration_seconds // 60
        seconds = self.duration_seconds % 60
        return f"{minutes:02d}:{seconds:02d}"

class AudioLesson(models.Model):
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name='audios')
    title = models.CharField(max_length=200)
    audio_url = models.URLField(max_length=500)
    duration_seconds = models.IntegerField(default=0)
    order = models.IntegerField(default=0)
    is_premium = models.BooleanField(default=True, help_text="Faqat premium (oylik obuna) foydalanuvchilarga ochiq")

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"Audio: {self.title}"

    @property
    def duration_display(self):
        minutes = self.duration_seconds // 60
        seconds = self.duration_seconds % 60
        return f"{minutes:02d}:{seconds:02d}"

class Flashcard(models.Model):
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name='flashcards')
    front = models.TextField()
    back = models.TextField()

    def __str__(self):
        return f"Flashcard for {self.lesson.title}"

class Bookmark(models.Model):
    profile = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name='bookmarks')
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name='bookmarked_by')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('profile', 'lesson')

    def __str__(self):
        return f"{self.profile.user.username} bookmarked {self.lesson.title}"
