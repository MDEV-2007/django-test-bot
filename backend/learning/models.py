from django.db import models
from accounts.models import Profile

class Topic(models.Model):
    # `tests_app.Question.CATEGORY_CHOICES` bilan bir xil ro'yxat (ikkalasi ham imtihon
    # turini bildiradi). Bittasiga qo'shsangiz — ikkinchisiga ham qo'shing.
    CATEGORY_CHOICES = [
        ('history', 'Mavzulashtirilgan'),
        ('certificate', 'Milliy Sertifikat'),
        ('bba', 'BBA Imtihoni'),
        ('cefr', 'CEFR'),
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


class Reel(models.Model):
    """TikTok / Instagram Reels formatidagi vertikal mini-dars va savollar modeli."""
    GRADIENT_CHOICES = [
        ('rose', 'Qizil Otash (Rose/Pink)'),
        ('sky', 'Moviy Osmon (Sky/Cyan)'),
        ('emerald', 'Yashil Zumrad (Emerald/Teal)'),
        ('purple', 'Binafsharang Neon (Purple/Indigo)'),
        ('amber', 'Oltin Quyosh (Amber/Orange)'),
    ]

    subject_name = models.CharField(max_length=100, help_text="Masalan: Tarix, Ona tili, Biologiya")
    subject_slug = models.CharField(max_length=100, db_index=True, help_text="Masalan: tarix, ona-tili, biologiya")
    category_badge = models.CharField(max_length=150, help_text="Masalan: Amir Temur & Anqara jangi (1402)")
    tagline = models.CharField(max_length=100, default="Bilasizmi?", help_text="Masalan: Bilasizmi?, Eng ko'p xato qilingan!, Oltin Qoida")
    hook = models.CharField(max_length=300, help_text="Diqqatni tortuvchi savol yoki fakt sarlavhasi")
    fact = models.TextField(help_text="2-3 ta qisqa va qiziqarli tushuntirish jumlasi")
    takeaway = models.CharField(max_length=300, help_text="Oltin xulosa / imtihon qoidasi")

    # Interaktiv mikrokvest
    quiz_question = models.TextField(help_text="Variantli savol matni")
    quiz_options = models.JSONField(default=list, help_text="4 ta variantlar ro'yxati")
    quiz_correct_index = models.IntegerField(default=0, help_text="To'g'ri variant indeksi (0, 1, 2 yoki 3)")
    quiz_explanation = models.TextField(blank=True, help_text="Javob berilgach ko'rsatiladigan qisqa tushuntirish")

    source_question = models.ForeignKey(
        'tests_app.Question', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='derived_reels', help_text="Platformadagi qiyin test savoli bilan bog'lanish"
    )

    gradient_theme = models.CharField(max_length=30, choices=GRADIENT_CHOICES, default='purple')
    is_published = models.BooleanField(default=True, db_index=True, help_text="O'quvchilar lentasiga chiqarish")
    order = models.IntegerField(default=0)

    likes_count = models.IntegerField(default=0)
    shares_count = models.IntegerField(default=0)
    views_count = models.IntegerField(default=0)

    created_by = models.ForeignKey(
        'auth.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='created_reels'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-order', '-id']
        verbose_name = "Bilim Reel"
        verbose_name_plural = "Bilim Reels"

    def __str__(self):
        status = "🟢 Nashr" if self.is_published else "🟡 Qoralama"
        return f"{status} [{self.subject_name}] {self.hook[:50]}"

    def get_gradient_css(self):
        gradients = {
            'rose': 'linear-gradient(145deg, #881337 0%, #4c0519 50%, #0f172a 100%)',
            'sky': 'linear-gradient(145deg, #0c4a6e 0%, #082f49 50%, #030712 100%)',
            'emerald': 'linear-gradient(145deg, #064e3b 0%, #022c22 50%, #020617 100%)',
            'purple': 'linear-gradient(145deg, #581c87 0%, #3b0764 50%, #030712 100%)',
            'amber': 'linear-gradient(145deg, #1e1b4b 0%, #311042 50%, #0f172a 100%)',
        }
        return gradients.get(self.gradient_theme, gradients['purple'])

    def to_dict(self):
        return {
            'id': self.id,
            'subject_name': self.subject_name,
            'subject_slug': self.subject_slug,
            'category_badge': self.category_badge,
            'tagline': self.tagline,
            'hook': self.hook,
            'fact': self.fact,
            'takeaway': self.takeaway,
            'gradient': self.get_gradient_css(),
            'quiz': {
                'question': self.quiz_question,
                'options': self.quiz_options,
                'correct_index': self.quiz_correct_index,
                'explanation': self.quiz_explanation,
            },
            'likes': self.likes_count,
            'shares': self.shares_count,
            'views': self.views_count,
            'is_published': self.is_published,
        }

