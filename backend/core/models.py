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


class DailyChestClaim(models.Model):
    """Foydalanuvchining kunlik sirli sandiq (Variable Reward) ochish tarixi.
    (profile, date) cheklovi tufayli bir kunda faqat bir marta ochish mumkin.
    """
    RARITY_CHOICES = [
        ('common', 'Oddiy'),
        ('rare', 'Noyob'),
        ('epic', 'Epik'),
        ('legendary', 'Afsonaviy'),
    ]

    profile = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name='daily_chest_claims')
    date = models.DateField(default=timezone.localdate, db_index=True)
    reward_type = models.CharField(max_length=50)  # 'coins', 'xp', 'streak_freeze', 'legendary_bundle'
    reward_amount = models.PositiveIntegerField(default=0)
    reward_title = models.CharField(max_length=150, blank=True)
    rarity = models.CharField(max_length=20, choices=RARITY_CHOICES, default='common')
    streak_at_claim = models.PositiveIntegerField(default=0)
    streak_bonus_pct = models.PositiveIntegerField(default=0)
    claimed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-claimed_at']
        unique_together = ('profile', 'date')

    def __str__(self):
        return f"{self.profile.user.username} claimed {self.reward_title} ({self.rarity}) on {self.date}"


# ─── 0-MODUL: Super Admin Feature Flags (Singleton Model) ───────────────────
class SystemFeatureFlags(models.Model):
    """Super Admin panelidan kodni qayta deploy qilmasdan, real vaqtda modullarni
    yoqib-o'chirish (Runtime Toggle) tizimi.
    """
    enable_stress_simulator = models.BooleanField(
        default=True,
        help_text="Imtihon Kuni Shoki / BMB Stress Rejimi",
    )
    enable_cheat_sheet_maps = models.BooleanField(
        default=True,
        help_text="60-soniyalik Anti-Darslik Shpargalka Xaritasi",
    )
    enable_parent_radar = models.BooleanField(
        default=False,
        help_text="Ota-Ona Telegram Radari va 'Ota-onam to'lab bersin' Paywall",
    )
    enable_teacher_class_battles = models.BooleanField(
        default=False,
        help_text="B2B2C O'qituvchi 'Sinf Janglari' (PIN-kodli Live Quiz)",
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Tizim Funksiyalari Holati"
        verbose_name_plural = "Tizim Funksiyalari Holati"

    @classmethod
    def load(cls):
        obj, _ = cls.objects.get_or_create(id=1)
        return obj


# ─── 2-MODUL: Anti-Darslik Shpargalka & BMB Qopqonlari Xaritasi ──────────────
class TopicCheatSheet(models.Model):
    """Har bir mavzu bo'yicha 800 betlik kitob o'rniga 60-soniyalik konsentrat:
    10 ta Oltin Fakt, BMB Qopqonlari (solishtirma) va Vizual Xronologiya.
    """
    topic = models.OneToOneField(
        'learning.Topic',
        on_delete=models.CASCADE,
        related_name='cheat_sheet',
    )
    core_pills = models.JSONField(
        default=list,
        blank=True,
        help_text="10 ta Oltin Fakt: [{'term': '...', 'definition': '...'}]",
    )
    exam_traps = models.JSONField(
        default=list,
        blank=True,
        help_text="BMB Qopqonlari: [{'wrong': '...', 'correct': '...', 'explanation': '...'}]",
    )
    visual_chain = models.JSONField(
        default=list,
        blank=True,
        help_text="Vizual Xronologiya / Zanjir: ['1365 Loy jangi', '1370 Balx qamali']",
    )
    sprint_question_ids = models.JSONField(
        default=list,
        blank=True,
        help_text="Shu faktlarga oid 3 daqiqalik sprint savollari id ro'yxati",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Mavzu Shpargalkasi"
        verbose_name_plural = "Mavzu Shpargalkalari"

    def __str__(self):
        return f"Cheat Sheet: {self.topic.title}"


# ─── 3-MODUL: Ota-Ona Telegram Radari ────────────────────────────────────────
class ParentConnection(models.Model):
    """O'quvchi va o'quvchining ota-onasi o'rtasidagi Telegram ulanish jurnali.
    Ota-onaga haftalik 'Faxr va Nazorat' hisoboti hamda VIP invoys yuboriladi.
    """
    student = models.ForeignKey(
        Profile,
        on_delete=models.CASCADE,
        related_name='parent_connections',
    )
    parent_chat_id = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        db_index=True,
        help_text="Ota-onaning Telegram Chat ID si",
    )
    parent_name = models.CharField(max_length=150, blank=True, default='')
    parent_phone = models.CharField(max_length=30, blank=True, default='')
    is_active = models.BooleanField(default=True)
    linked_at = models.DateTimeField(auto_now_add=True)
    last_report_sent_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Ota-ona Ulanishi"
        verbose_name_plural = "Ota-ona Ulanishlari"

    def __str__(self):
        return f"Parent of {self.student.user.username} (Chat: {self.parent_chat_id})"


# ─── 4-MODUL: B2B2C Sinf Janglari (Teacher Live Room) ────────────────────────
class ClassBattleRoom(models.Model):
    """O'qituvchilar (repetitorlar) uchun 6 xonali PIN-kodli jonli guruh jangi.
    """
    STATUS_CHOICES = [
        ('waiting', 'Kutilmoqda'),
        ('live', 'Jang ketmoqda'),
        ('finished', 'Tugallandi'),
    ]

    teacher = models.ForeignKey(
        'auth.User',
        on_delete=models.CASCADE,
        related_name='class_battles',
        help_text="Jangni yaratgan o'qituvchi",
    )
    title = models.CharField(max_length=200)
    subject = models.ForeignKey(
        'tests_app.Subject',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='class_battles',
    )
    topic = models.ForeignKey(
        'learning.Topic',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='class_battles',
    )
    pin_code = models.CharField(
        max_length=6,
        unique=True,
        db_index=True,
        help_text="6 xonali taklif PIN-kodi (masalan: 482910)",
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='waiting')
    question_ids = models.JSONField(default=list, blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Sinf Jangi Xonasi"
        verbose_name_plural = "Sinf Jangi Xonalari"

    def __str__(self):
        return f"[{self.pin_code}] {self.title} ({self.get_status_display()})"


class ClassBattleParticipant(models.Model):
    """Sinf jangida qatnashayotgan o'quvchi natijasi va javoblari."""
    room = models.ForeignKey(
        ClassBattleRoom,
        on_delete=models.CASCADE,
        related_name='participants',
    )
    profile = models.ForeignKey(
        Profile,
        on_delete=models.CASCADE,
        related_name='class_battle_participations',
    )
    nickname = models.CharField(max_length=100)
    score = models.IntegerField(default=0)
    correct_count = models.IntegerField(default=0)
    answers = models.JSONField(
        default=dict,
        blank=True,
        help_text="{ 'question_id': {'choice_id': 12, 'is_correct': True, 'time_ms': 3200} }",
    )
    joined_at = models.DateTimeField(auto_now_add=True)
    finished_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ('room', 'profile')
        ordering = ['-score', '-correct_count']
        verbose_name = "Sinf Jangi Qatnashchisi"
        verbose_name_plural = "Sinf Jangi Qatnashchilari"

    def __str__(self):
        return f"{self.nickname} in {self.room.pin_code} ({self.score} pts)"
