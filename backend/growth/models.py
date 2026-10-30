from django.db import models
from django.utils import timezone
from accounts.models import Profile
from tests_app.models import Subject, Question


class ArenaGhostReplay(models.Model):
    """1v1 Arena uchun 24/7 arvoh raqiblar (Ghost Opponents) harakat yozuvi."""
    player = models.ForeignKey(
        Profile,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='ghost_replays'
    )
    subject = models.ForeignKey(
        Subject,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='ghost_replays'
    )
    player_name = models.CharField(max_length=120, default="Abituriyent")
    avatar_url = models.URLField(max_length=500, blank=True, default="https://api.dicebear.com/7.x/adventurer/svg?seed=fighter")
    elo_rating = models.IntegerField(default=1000, db_index=True)
    
    # Harakatlar jurnali: list of dicts:
    # [{'question_id': 12, 'selected_option_id': 45, 'is_correct': True, 'time_taken_ms': 2400, 'score': 10}]
    moves_log = models.JSONField(default=list, help_text="Raqibning har bir savolga bergan javoblari va vaqti")
    question_ids = models.JSONField(default=list, help_text="O'yinda ishtirok etgan savollar ID ro'yxati")
    
    total_correct = models.IntegerField(default=0)
    total_questions = models.IntegerField(default=10)
    avg_time_ms = models.IntegerField(default=3200)
    
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['subject', 'elo_rating', 'is_active']),
        ]

    def __str__(self):
        return f"GhostReplay #{self.id} - {self.player_name} (ELO: {self.elo_rating}) - {self.total_correct}/{self.total_questions}"


class EssaySubmission(models.Model):
    """45-topshiriq (Esse) va ijodiy yozma ishlar uchun BMB 75 ballik mezon tahlili."""
    student = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name='essay_submissions')
    question = models.ForeignKey(Question, on_delete=models.SET_NULL, null=True, blank=True, related_name='essay_submissions')
    prompt_text = models.TextField(help_text="Esse mavzusi yoki berilgan matn")
    essay_text = models.TextField(help_text="O'quvchi yozgan esse matni")
    word_count = models.IntegerField(default=0)

    # Rasmiy BMB 75 ballik baholash mezonlari:
    # 1. Mazmun (0–30 ball)
    mazmun_ball = models.FloatField(default=0.0)
    # 2. Mantiq va uslub (0–20 ball)
    mantiq_uslub_ball = models.FloatField(default=0.0)
    # 3. Savodxonlik (imlo, punktuatsiya, grammatika) (0–25 ball)
    savodxonlik_ball = models.FloatField(default=0.0)
    # Jami ball (0–75 ball)
    total_ball = models.FloatField(default=0.0, db_index=True)

    summary_feedback = models.TextField(blank=True, default="")
    strengths = models.JSONField(default=list, help_text="Essening kuchli tomonlari")
    weaknesses = models.JSONField(default=list, help_text="Rivojlantirish kerak bo'lgan tomonlari")
    
    # Xatolar ro'yxati:
    # [{'original_text': 'keldi lekin', 'suggested_fix': 'keldi, lekin', 'error_type': 'punktuatsiya', 'explanation': 'Teng bog\'lovchidan oldin vergul qo\'yiladi'}]
    errors_list = models.JSONField(default=list, help_text="Batafsil xatolar tahlili")

    # Agar o'quvchi oddiy (bepul) rejimda bo'lsa va limiti tugasa:
    # Ballar ochiq ko'rinadi, lekin xatolar tahlili qulflanadi (blur)
    is_locked = models.BooleanField(default=False, help_text="VIP Paywall orqali xiralashtirilgan (Blur) holat")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Esse #{self.id} - {self.student.user.username} - {self.total_ball}/75 ball"


class UserUsageQuota(models.Model):
    """O'quvchining bepul AI Esse va AI Mentor Layfxak kvotalari."""
    profile = models.OneToOneField(Profile, on_delete=models.CASCADE, related_name='growth_quota')
    free_essay_credits = models.IntegerField(default=1, help_text="Bepul AI Esse tekshirish kreditlari soni")
    daily_ai_mentor_credits = models.IntegerField(default=5, help_text="Kunlik bepul AI Mentor Layfxak krediti")
    last_credit_reset_date = models.DateField(default=timezone.localdate)

    def is_vip(self) -> bool:
        """Foydalanuvchining VIP obunasi faolligini tekshiradi."""
        try:
            return bool(
                self.profile.is_vip or
                getattr(self.profile, 'subscription_plan', None) in ['pro', 'vip', 'premium'] or
                getattr(self.profile, 'has_active_subscription', False)
            )
        except Exception:
            return False

    def check_and_reset_daily(self):
        """Har yangi kunda 5 ta AI Mentor Layfxak kreditini yangilaydi."""
        today = timezone.localdate()
        if self.last_credit_reset_date < today:
            self.daily_ai_mentor_credits = 5
            self.last_credit_reset_date = today
            self.save(update_fields=['daily_ai_mentor_credits', 'last_credit_reset_date'])

    def can_use_essay(self) -> bool:
        if self.is_vip():
            return True
        return self.free_essay_credits > 0

    def consume_essay_credit(self) -> bool:
        if self.is_vip():
            return True
        if self.free_essay_credits > 0:
            self.free_essay_credits -= 1
            self.save(update_fields=['free_essay_credits'])
            return True
        return False

    def __str__(self):
        return f"Quota for {self.profile.user.username} (Esse: {self.free_essay_credits}, Mentor: {self.daily_ai_mentor_credits})"


class LiveRepublicEvent(models.Model):
    """Har oqshom soat 20:30 da o'tkaziladigan Umumrespublika Jonli Turniri."""
    STATUS_CHOICES = [
        ('scheduled', 'Rejalashtirilgan'),
        ('lobby', 'Kutish zali ochiq (20:15–20:30)'),
        ('active', 'Jonli jang davom etmoqda'),
        ('finished', 'Turnir yakunlangan'),
    ]

    title = models.CharField(max_length=200, default="20:30 Jonli Respublika Sprinti")
    subject = models.ForeignKey(Subject, on_delete=models.SET_NULL, null=True, blank=True)
    scheduled_time = models.DateTimeField(db_index=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='scheduled', db_index=True)
    question_ids = models.JSONField(default=list, help_text="Turnir uchun 15 ta saralangan savol ID ro'yxati")
    participants_count = models.IntegerField(default=0)
    rewards_description = models.CharField(max_length=255, default="👑 Top-3 g'olibga 1 haftalik VIP va +500 Tanga!")
    notification_sent_15m = models.BooleanField(default=False)
    notification_sent_2m = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-scheduled_time']

    def __str__(self):
        return f"{self.title} ({self.scheduled_time.strftime('%Y-%m-%d %H:%M')}) - {self.get_status_display()}"


class ViralDuelChallenge(models.Model):
    """Telegram StartParam ('startapp=duel_XXX') orqali sinfdoshni chaqirish mexanikasi."""
    STATUS_CHOICES = [
        ('pending', 'Chaqiruv yuborildi (Kutilmoqda)'),
        ('completed', 'Duel qabul qilingan va yakunlangan'),
    ]

    duel_token = models.CharField(max_length=64, unique=True, db_index=True)
    creator = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name='created_duels')
    replay = models.ForeignKey(ArenaGhostReplay, on_delete=models.CASCADE, related_name='duel_challenges')
    subject = models.ForeignKey(Subject, on_delete=models.SET_NULL, null=True, blank=True)
    
    challenger = models.ForeignKey(Profile, on_delete=models.SET_NULL, null=True, blank=True, related_name='accepted_duels')
    creator_score = models.IntegerField(default=0)
    challenger_score = models.IntegerField(default=0)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    bonus_awarded = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Duel {self.duel_token} by {self.creator.user.username} ({self.creator_score} ball)"
