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
    enable_b2b_ads = models.BooleanField(
        default=True,
        help_text="Geo-Targeted O'quv Markaz B2B Reklama va Lidlar",
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



# ============================================================
# B2B HYPER-TARGET ADS & LEAD GEN (O'QUV MARKAZLAR)
# ============================================================

class EducationCenter(models.Model):
    """Hamkor o'quv markazlari (Registon, Cambridge LC, Thompson va boshqalar)."""
    name = models.CharField(max_length=200, help_text="O'quv markaz nomi")
    slug = models.SlugField(max_length=200, unique=True, blank=True)
    logo_url = models.URLField(max_length=500, blank=True)
    city_or_region = models.CharField(max_length=100, default="Toshkent", help_text="Asosiy faoliyat hududi")
    phone = models.CharField(max_length=50, blank=True)
    telegram_username = models.CharField(max_length=100, blank=True)
    telegram_chat_id = models.CharField(max_length=100, blank=True, help_text="Lidlarni yuborish uchun markaz Telegram ID/guruhi")
    crm_webhook_url = models.URLField(max_length=500, blank=True)
    is_verified = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)
    sponsorship_tier = models.CharField(
        max_length=30,
        choices=[
            ('STANDARD', 'Standart Target'),
            ('VIP_SPONSOR', 'VIP Homiylik'),
            ('TOURNAMENT_HEAD', 'Turnir Bosh Homiysi'),
        ],
        default='STANDARD',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    # --- Ads Manager (ads.ilmildizi.uz) advertiser hisobi ---------------------------
    # Alohida "Advertiser" modeli yaratilmadi: reklama beruvchi — aynan shu markaz.
    # Ruxsat = foydalanuvchi `owner` va status `approved` (Profile.role o'zgarmaydi,
    # o'qituvchi yoki o'quvchi hisobi ham markaz egasi bo'lishi mumkin). Yangi ariza
    # `pending` bo'ladi va faqat Super Admin tasdiqlaydi.
    STATUS_CHOICES = [
        ('pending', "Ko'rib chiqilmoqda"),
        ('approved', 'Tasdiqlangan'),
        ('rejected', 'Rad etilgan'),
        ('suspended', "To'xtatilgan"),
    ]
    owner = models.ForeignKey(
        'auth.User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='education_centers', help_text="Ads Manager kabinetiga kira oladigan hisob",
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending', db_index=True)
    contact_name = models.CharField(max_length=150, blank=True)
    contact_email = models.EmailField(blank=True)
    website = models.URLField(max_length=300, blank=True)
    description = models.TextField(blank=True)
    review_note = models.TextField(blank=True, help_text="Rad etish / to'xtatish sababi (advertiserga ko'rinadi)")
    reviewed_by = models.ForeignKey(
        'auth.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_centers')
    reviewed_at = models.DateTimeField(null=True, blank=True)
    notify_new_leads = models.BooleanField(default=True, help_text="Yangi lid haqida Telegram xabari")
    updated_at = models.DateTimeField(auto_now=True, null=True)

    @property
    def is_approved(self):
        return self.status == 'approved'

    def save(self, *args, **kwargs):
        # `slug` noyob, lekin forma uni so'ramaydi: bo'sh slug bilan ikkinchi markaz
        # yaratilganda UNIQUE xatosi bo'lmasligi uchun avtomatik to'ldiriladi.
        if not self.slug:
            import secrets
            from django.utils.text import slugify
            base = slugify(self.name)[:180] or 'center'
            self.slug = f"{base}-{secrets.token_hex(3)}"
        super().save(*args, **kwargs)

    class Meta:
        verbose_name = "O'quv Markazi"
        verbose_name_plural = "O'quv Markazlari"

    def __str__(self):
        return f"{self.name} ({self.city_or_region})"


class TargetedCampaign(models.Model):
    """O'quv markazning giper-maqsadli (Snayper) reklama kampaniyasi."""
    center = models.ForeignKey(EducationCenter, on_delete=models.CASCADE, related_name='campaigns')
    title = models.CharField(max_length=255, help_text="Diqqatni tortuvchi og'riq sarlavhasi")
    description = models.TextField(help_text="Taklif matni va chegirma shartlari")
    cta_text = models.CharField(max_length=100, default="📞 1-bosishda ro'yxatdan o'tish (1-dars BEPUL)")
    badge_text = models.CharField(max_length=50, default="Homiylik Taklifi • -20% Chegirma")
    target_track = models.CharField(
        max_length=40,
        choices=[
            ('ALL', "Barcha yo'nalishlar"),
            ('DTM_SERTIFIKAT', 'Milliy Sertifikat & DTM'),
            ('IELTS_SAT', 'IELTS & SAT'),
            ('TOPIK_KOREAN', 'Koreys tili (TOPIK)'),
            ('ARABIC_CEFR', 'Arab tili (CEFR)'),
        ],
        default='ALL',
    )
    target_subjects = models.JSONField(default=list, blank=True, help_text="Masalan: ['Tarix', 'Ingliz tili'] yoki bo'sh")
    target_regions = models.JSONField(default=list, blank=True, help_text="Masalan: ['Farg\'ona', 'Toshkent'] yoki bo'sh")
    max_score_threshold = models.IntegerField(default=50, help_text="Natijasi shu foizdan past o'quvchilarga ko'rsatiladi")
    min_score_threshold = models.IntegerField(default=0)
    banner_url = models.URLField(max_length=500, blank=True)
    video_url = models.URLField(max_length=500, blank=True)
    is_active = models.BooleanField(default=True, db_index=True)
    leads_count = models.IntegerField(default=0)
    impressions_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Target Reklama Kampaniyasi"
        verbose_name_plural = "Target Reklama Kampaniyalari"

    def __str__(self):
        return f"[{self.center.name}] {self.title} (<{self.max_score_threshold}%)"


class CenterLead(models.Model):
    """Target reklamadan olingan issiq lid (o'quvchi kontakt va xato analitikasi)."""
    STATUS_CHOICES = [
        ('NEW', 'Yangi Lid'),
        ('CONTACTED', "Bog'lanildi"),
        ('ENROLLED', 'Kursga Yozildi'),
        ('CANCELLED', 'Bekor Qilindi'),
    ]
    center = models.ForeignKey(EducationCenter, on_delete=models.CASCADE, related_name='leads')
    campaign = models.ForeignKey(TargetedCampaign, on_delete=models.SET_NULL, null=True, blank=True, related_name='leads')
    student_profile = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name='submitted_leads')
    student_name = models.CharField(max_length=150)
    student_phone = models.CharField(max_length=50)
    subject_name = models.CharField(max_length=100)
    score_percentage = models.FloatField(default=0.0)
    weak_topics = models.TextField(blank=True, help_text="O'quvchining aynan shu testdagi zaif mavzulari")
    region = models.CharField(max_length=100, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='NEW', db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = "O'quv Markaz Lidi"
        verbose_name_plural = "O'quv Markaz Lidlari"

    def __str__(self):
        return f"{self.student_name} ({self.subject_name} {self.score_percentage}%) -> {self.center.name}"


class RewardClaim(models.Model):
    """Durable daily reward caps and "pay once" markers (audit ECON-005).

    These used to live only in the cache (Redis), so a Redis restart, eviction or FLUSHALL
    reset every daily cap and every "first try" guard. `subject_id` is a Profile id for
    rewards and a User id for AI-cost limits (the caller decides); no FK on purpose — the
    table is an append-mostly ledger that must stay cheap to write.
    """
    subject_id = models.BigIntegerField()
    source = models.CharField(max_length=64)
    day = models.DateField()
    item = models.CharField(max_length=128, blank=True, default='')
    count = models.PositiveBigIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['subject_id', 'source', 'day', 'item'], name='reward_claim_unique'),
        ]
        indexes = [models.Index(fields=['day'], name='reward_claim_day_idx')]

    def __str__(self):
        return f"{self.source}:{self.subject_id}:{self.day}:{self.item}={self.count}"


class BuddyStreak(models.Model):
    """Do'stlik Streak'i (Juftlik Zanjiri / Co-op Streak).
    Ikki nafar do'st o'rtasida umumiy olov (Streak) bog'lanadi. Agar bugun ikkalasi ham
    kunlik normani bajarsa, umumiy streak oshadi va ikkalasiga ham +25 Ildiz tangasi beriladi.
    Agar bittasi kirmasa, 22:00 da 'Tez kirib 5 ta testingni ishla!' eslatmasi (Nudge) yuboriladi.
    """
    STATUS_CHOICES = [
        ('pending', 'Taklif kutilmoqda'),
        ('active', 'Faol juftlik'),
        ('broken', 'Uzilgan'),
    ]

    user1 = models.ForeignKey(
        Profile,
        on_delete=models.CASCADE,
        related_name='buddy_streaks_as_u1',
    )
    user2 = models.ForeignKey(
        Profile,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='buddy_streaks_as_u2',
    )
    invite_code = models.CharField(max_length=24, unique=True, db_index=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending', db_index=True)
    current_streak = models.PositiveIntegerField(default=1)
    best_streak = models.PositiveIntegerField(default=1)
    user1_last_active = models.DateField(null=True, blank=True)
    user2_last_active = models.DateField(null=True, blank=True)
    last_paired_date = models.DateField(null=True, blank=True)
    last_nudge_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']
        verbose_name = "Do'stlik Streak Juftligi"
        verbose_name_plural = "Do'stlik Streak Juftliklari"

    def __str__(self):
        p2 = self.user2.user.username if self.user2 else "Kutilmoqda..."
        return f"BuddyStreak: {self.user1.user.username} & {p2} (🔥 {self.current_streak} kun)"

