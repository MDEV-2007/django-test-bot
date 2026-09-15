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
    media_type = models.CharField(
        max_length=20,
        default='text',
        choices=[('text', 'Interaktiv Matn & Savol'), ('video', 'Video Reel')],
        help_text="Reel formati: matnli interaktiv kvest yoki to'liq vertikal video"
    )
    video_url = models.URLField(max_length=500, blank=True, default='', help_text="MP4 video yoki streaming havolasi")
    video_file = models.FileField(upload_to='reels_videos/', blank=True, null=True, help_text="Yuklangan video fayli")

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
        media_icon = "🎬" if self.media_type == 'video' else "📝"
        return f"{status} {media_icon} [{self.subject_name}] {self.hook[:50]}"

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
        try:
            c_count = self.comments.count()
        except Exception:
            c_count = 0

        v_url = ''
        if self.video_file:
            try:
                v_url = self.video_file.url
            except Exception:
                v_url = ''
        if not v_url:
            v_url = self.video_url

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
            'media_type': self.media_type,
            'video_url': v_url,
            'quiz': {
                'question': self.quiz_question,
                'options': self.quiz_options,
                'correct_index': self.quiz_correct_index,
                'explanation': self.quiz_explanation,
            },
            'likes': self.likes_count,
            'shares': self.shares_count,
            'views': self.views_count,
            'comments_count': c_count,
            'is_published': self.is_published,
        }


class ReelComment(models.Model):
    """Reels videosi/savoliga qoldirilgan izohlar va javoblar."""
    reel = models.ForeignKey(Reel, on_delete=models.CASCADE, related_name='comments')
    user = models.ForeignKey('auth.User', on_delete=models.CASCADE, related_name='reel_comments')
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='replies')
    text = models.TextField(max_length=1000)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']
        verbose_name = "Reel Izohi"
        verbose_name_plural = "Reel Izohlari"

    def __str__(self):
        return f"{self.user.username}: {self.text[:30]}"

    def to_dict(self):
        full_name = self.user.get_full_name() or self.user.first_name or self.user.username
        avatar = ""
        try:
            profile = getattr(self.user, 'profile', None)
            if profile and getattr(profile, 'avatar_url', None):
                avatar = profile.avatar_url
        except Exception:
            avatar = ""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'user_name': full_name,
            'username': self.user.username,
            'user_avatar': avatar,
            'text': self.text,
            'parent_id': self.parent_id,
            'replies_count': self.replies.count(),
            'created_at': self.created_at.strftime('%d.%m.%Y, %H:%M'),
        }


# ============================================================
# COMMUNITY FEED (HAMJAMIYAT LENTASI)
# ============================================================

class CommunityPost(models.Model):
    """O'quvchilar tomonidan platformada ulashilgan test natijalari, sertifikatlar va postlar."""
    POST_TYPES = (
        ('test_result', 'Test Natijasi'),
        ('certificate', 'Milliy Sertifikat'),
        ('achievement', 'Yutuq'),
    )

    author = models.ForeignKey('auth.User', on_delete=models.CASCADE, related_name='community_posts')
    attempt = models.ForeignKey('tests_app.Attempt', on_delete=models.SET_NULL, null=True, blank=True, related_name='community_posts')
    test = models.ForeignKey('tests_app.TestSet', on_delete=models.SET_NULL, null=True, blank=True, related_name='community_posts')

    post_type = models.CharField(max_length=20, choices=POST_TYPES, default='test_result')
    title = models.CharField(max_length=255)
    subject_name = models.CharField(max_length=100, default='Asosiy')
    subject_slug = models.CharField(max_length=50, default='tarix')

    score = models.FloatField(null=True, blank=True)
    grade = models.CharField(max_length=30, blank=True)
    correct_count = models.IntegerField(default=0)
    total_questions = models.IntegerField(default=0)

    caption = models.TextField(blank=True, max_length=1000)
    image_url = models.CharField(max_length=500, blank=True)
    custom_image = models.ImageField(upload_to='community_posts/', blank=True, null=True)

    likes_count = models.PositiveIntegerField(default=0)
    comments_count = models.PositiveIntegerField(default=0)
    is_pinned = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-is_pinned', '-created_at']
        verbose_name = "Hamjamiyat Posti"
        verbose_name_plural = "Hamjamiyat Postlari"

    def __str__(self):
        return f"{self.author.username} - {self.title} ({self.score}%)"

    def to_dict(self, current_user=None):
        profile = getattr(self.author, 'profile', None)
        author_name = self.author.get_full_name() or self.author.first_name or self.author.username
        author_avatar = getattr(profile, 'avatar_url', '') if profile else ''
        author_level = getattr(profile, 'level', 1) if profile else 1

        user_reaction = None
        if current_user and current_user.is_authenticated:
            reaction = self.reactions.filter(user=current_user).first()
            if reaction:
                user_reaction = reaction.reaction_type

        # Reaksiyalar hisobi turlari bo'yicha
        reaction_counts = {
            'fire': self.reactions.filter(reaction_type='fire').count(),
            'clap': self.reactions.filter(reaction_type='clap').count(),
            'trophy': self.reactions.filter(reaction_type='trophy').count(),
            'heart': self.reactions.filter(reaction_type='heart').count(),
        }

        img = self.image_url
        custom_img = getattr(self, 'custom_image', None)
        if not img and custom_img:
            try:
                img = custom_img.url
            except Exception:
                img = ''

        can_delete = False
        if current_user and current_user.is_authenticated:
            can_delete = (current_user.id == self.author_id or getattr(current_user, 'is_staff', False) or getattr(current_user, 'is_superuser', False))

        is_pinned = getattr(self, 'is_pinned', False)

        return {
            'id': self.id,
            'author': {
                'id': self.author_id,
                'name': author_name,
                'username': self.author.username,
                'avatar': author_avatar,
                'level': author_level,
            },
            'post_type': self.post_type,
            'title': self.title,
            'subject_name': self.subject_name,
            'subject_slug': self.subject_slug,
            'score': self.score,
            'grade': self.grade,
            'correct_count': self.correct_count,
            'total_questions': self.total_questions,
            'caption': self.caption,
            'image_url': img,
            'test_id': self.test_id,
            'attempt_id': self.attempt_id,
            'likes_count': self.likes_count,
            'comments_count': self.comments_count,
            'is_pinned': is_pinned,
            'can_delete': can_delete,
            'reaction_counts': reaction_counts,
            'user_reaction': user_reaction,
            'created_at': self.created_at.strftime('%d.%m.%Y %H:%M') if self.created_at else '',
        }


class CommunityPostReaction(models.Model):
    """Postga bildirilgan emodzi reaksiyalar: fire, clap, trophy, heart"""
    REACTION_TYPES = (
        ('fire', 'Olov'),
        ('clap', 'Qarsak'),
        ('trophy', 'Kubok'),
        ('heart', 'Yurak'),
    )
    post = models.ForeignKey(CommunityPost, on_delete=models.CASCADE, related_name='reactions')
    user = models.ForeignKey('auth.User', on_delete=models.CASCADE, related_name='post_reactions')
    reaction_type = models.CharField(max_length=15, choices=REACTION_TYPES, default='fire')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('post', 'user')
        verbose_name = "Post Reaksiyasi"
        verbose_name_plural = "Post Reaksiyalari"


class CommunityPostComment(models.Model):
    """Post ostidagi tabrik va izohlar hamda javoblar."""
    post = models.ForeignKey(CommunityPost, on_delete=models.CASCADE, related_name='comments')
    user = models.ForeignKey('auth.User', on_delete=models.CASCADE, related_name='community_comments')
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='replies')
    text = models.TextField(max_length=1000)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']
        verbose_name = "Post Izohi"
        verbose_name_plural = "Post Izohlari"

    def to_dict(self):
        profile = getattr(self.user, 'profile', None)
        return {
            'id': self.id,
            'user_id': self.user_id,
            'user_name': self.user.get_full_name() or self.user.first_name or self.user.username,
            'username': self.user.username,
            'user_avatar': getattr(profile, 'avatar_url', '') if profile else '',
            'text': self.text,
            'parent_id': self.parent_id,
            'replies_count': self.replies.count(),
            'created_at': self.created_at.strftime('%d.%m.%Y %H:%M'),
        }

