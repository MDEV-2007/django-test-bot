from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from django.db.models.signals import post_save
from django.dispatch import receiver

class Profile(models.Model):
    ROLE_CHOICES = [
        ('superadmin', 'Super Admin'),   # to'liq nazorat — /panel/
        ('teacher', "O'qituvchi"),       # faqat o'z kontenti — /teacher/
        ('student', "O'quvchi"),         # panelga kirmaydi
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    role = models.CharField(
        max_length=20, choices=ROLE_CHOICES, default='student', db_index=True,
        help_text="Foydalanuvchi roli. Boshqaruv panellariga kirish shu bo'yicha aniqlanadi.",
    )
    telegram_id = models.CharField(max_length=100, unique=True, null=True, blank=True)
    telegram_username = models.CharField(max_length=150, null=True, blank=True)
    # Google account subject id (the stable "sub" claim from the verified ID token) — used
    # to link a "Sign in with Google" login to this profile even if the user later changes
    # their Google display name or email. Unique but nullable: Telegram/classic accounts leave it blank.
    google_id = models.CharField(max_length=100, unique=True, null=True, blank=True)
    avatar_url = models.URLField(max_length=500, null=True, blank=True)

    # --- Referral (viral loop) ---------------------------------------------------------
    # Short shareable code (see accounts.referrals). Generated lazily on first use rather
    # than at signup, so backfilling every existing profile is a non-event, not a migration.
    referral_code = models.CharField(max_length=12, unique=True, null=True, blank=True, db_index=True)
    referred_by = models.ForeignKey(
        'self', on_delete=models.SET_NULL, null=True, blank=True, related_name='referrals',
        help_text="Kim taklif qilgan (birinchi ro'yxatdan o'tishdagina o'rnatiladi).",
    )
    
    # Gamification
    xp = models.IntegerField(default=0)
    level = models.IntegerField(default=1)
    coins = models.IntegerField(default=0)
    streak = models.IntegerField(default=0)
    last_active_date = models.DateField(null=True, blank=True)
    # Real-time presence (distinct from last_active_date's day-granularity streak bookkeeping) —
    # refreshed on every authenticated request via ensure_profile_for_user, throttled to at
    # most once/minute per profile so it doesn't add a write to every single API call.
    last_seen_at = models.DateTimeField(null=True, blank=True, db_index=True)
    elo_rating = models.IntegerField(default=1000)
    
    # Premium status
    is_premium = models.BooleanField(default=False, help_text="Video/audio darslar oylik obunasi")
    premium_expires_at = models.DateTimeField(null=True, blank=True)
    premium_mock_test_unlocked = models.BooleanField(default=False, help_text="Mock test tizimi uchun bir martalik xarid")
    
    # Customizations
    biography = models.TextField(blank=True)
    language = models.CharField(max_length=10, default='uz')

    # Smart Hub Exam Track (Yo'nalish Izolyatsiyasi)
    EXAM_TRACK_CHOICES = [
        ('DTM_SERTIFIKAT', 'Milliy Sertifikat & DTM'),
        ('IELTS_SAT', 'IELTS & SAT'),
        ('TOPIK_KOREAN', 'Koreys tili (TOPIK)'),
        ('ARABIC_CEFR', 'Arab tili (CEFR)'),
    ]
    exam_track = models.CharField(
        max_length=40,
        choices=EXAM_TRACK_CHOICES,
        default='DTM_SERTIFIKAT',
        db_index=True,
        help_text="O'quvchining asosiy yo'nalishi (Izolyatsiyalangan lenta va katalog uchun)",
    )
    region = models.CharField(
        max_length=100,
        blank=True,
        default='',
        help_text="Viloyat/shahar (masalan: Farg'ona, Toshkent)",
    )
    tree_stage = models.IntegerField(default=1, help_text="Ilm Ildizi Daraxti bosqichi (1-5)")
    tree_health = models.IntegerField(default=100, help_text="Daraxt holati (3 kun kirmasa sarg'ayadi)")

    # Onboarding
    has_seen_onboarding = models.BooleanField(default=False, help_text="Loyiha haqida tanishtiruv splash-ekranlarini ko'rganmi")

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        # Index the leaderboard sort key so the overall ranking's ORDER BY xp stays fast
        # as the user table grows to thousands.
        indexes = [models.Index(fields=['-xp'], name='profile_xp_desc_idx')]

    def __str__(self):
        return f"{self.user.username}'s Profile"
        
    @property
    def is_privileged(self):
        """Super adminlar va o'qituvchilar reyting va XP hisob-kitoblaridan mustasno."""
        if self.role in ('superadmin', 'teacher'):
            return True
        try:
            user = self.user
            if user and (user.is_superuser or user.is_staff):
                return True
        except Exception:
            pass
        return False

    def save(self, *args, **kwargs):
        if self.is_privileged:
            self.xp = 0
            self.level = 1
            update_fields = kwargs.get('update_fields')
            if update_fields is not None:
                kwargs['update_fields'] = list(set(update_fields) | {'xp', 'level'})
        super().save(*args, **kwargs)

    def add_xp(self, amount):
        """Adds XP and handles leveling up with atomic row locking. Privileged users never gain XP."""
        if self.is_privileged:
            if self.xp != 0 or self.level != 1:
                self.xp = 0
                self.level = 1
                self.save(update_fields=['xp', 'level'])
            return False
        
        from django.db import transaction
        from django.db.models import F

        with transaction.atomic():
            locked = Profile.objects.select_for_update().get(pk=self.pk)
            old_xp = locked.xp
            if amount != 0:
                Profile.objects.filter(pk=self.pk).update(xp=F('xp') + amount)
                locked.refresh_from_db(fields=['xp'])
                self.xp = locked.xp

            leveled_up = False
            next_level_threshold = locked.level * 1000
            while locked.xp >= next_level_threshold:
                locked.level += 1
                leveled_up = True
                next_level_threshold = locked.level * 1000
            if leveled_up:
                locked.save(update_fields=['level'])
                self.level = locked.level

            if amount > 0 and locked.role == 'student':
                try:
                    from telegrambot.retention import check_and_send_overtake_alerts
                    check_and_send_overtake_alerts(locked, old_xp, locked.xp)
                except Exception:
                    pass

            return leveled_up

    def add_coins(self, amount):
        """Atomically adds or subtracts coins without race conditions."""
        if amount == 0:
            return
        from django.db import transaction
        from django.db.models import F
        with transaction.atomic():
            locked = Profile.objects.select_for_update().get(pk=self.pk)
            if amount < 0 and locked.coins + amount < 0:
                raise ValueError("Balansda yetarli tanga mavjud emas!")
            Profile.objects.filter(pk=self.pk).update(coins=F('coins') + amount)
            locked.refresh_from_db(fields=['coins'])
            self.coins = locked.coins

    def update_streak(self):
        """Updates the activity streak based on calendar days.

        A gap of one or more missed days is first offered to any owned Streak-Freeze
        items: if the student holds enough freezes to cover every missed day, the freezes
        are spent and the streak survives (today still increments it); otherwise it resets.
        The freeze logic lives in shop.services and is imported lazily to avoid the
        accounts -> shop -> accounts import cycle.
        """
        today = timezone.localdate()
        if self.last_active_date is None:
            self.streak = 1
        elif self.last_active_date == today:
            return  # already counted today
        else:
            missed = (today - self.last_active_date).days - 1  # full days with no activity
            if missed <= 0:
                self.streak += 1  # active yesterday -> normal continuation
            else:
                from shop.services import consume_freezes
                if consume_freezes(self, missed, streak_before=self.streak) >= missed:
                    self.streak += 1  # freezes bridged the gap; streak preserved
                else:
                    self.streak = 1   # not enough freezes -> reset
        self.last_active_date = today
        self.save()
        
    @property
    def xp_progress(self):
        """Calculates percentage progress towards the next level."""
        current_level_base = (self.level - 1) * 1000
        next_level_threshold = self.level * 1000
        xp_in_level = self.xp - current_level_base
        xp_needed_in_level = next_level_threshold - current_level_base
        if xp_needed_in_level <= 0:
            return 100
        return min(100, max(0, int((xp_in_level / xp_needed_in_level) * 100)))

    @property
    def next_level_xp(self):
        return self.level * 1000

    @property
    def has_active_premium_lessons(self):
        if not self.is_premium:
            return False
        if self.premium_expires_at is None:
            return True
        return self.premium_expires_at > timezone.now()

    @property
    def is_vip_active(self) -> bool:
        """Platforma PRO obunasi: superadmin/staff yoki faol `is_premium` muddati.

        Bu yerga ATAYLAB kirmaydi:
        - `classroom.Subscription` — bu bitta o'qituvchiga obuna; uni platforma VIP'i deb
          hisoblash arzon o'qituvchiga obuna bo'lgan o'quvchiga boshqa o'qituvchilarning
          pullik mocklarini va cheksiz AI mentorni ochib berardi
          (classroom.services.has_class_access o'qituvchi obunasini o'zi tekshiradi).
        - `premium_mock_test_unlocked` — bir martalik mock xaridi, PRO emas
          (tests_app/api.py uni alohida hisobga oladi).
        - `UserUsageQuota.is_vip()` — u o'zi `profile.is_vip` ga qaytadi, ya'ni bu yerdan
          chaqirilsa cheksiz rekursiya bo'lardi.
        """
        return self.is_privileged or self.has_active_premium_lessons

    @property
    def is_vip(self) -> bool:
        return self.is_vip_active

    @property
    def has_active_subscription(self) -> bool:
        return self.is_vip_active


    # --- Role helpers -----------------------------------------------------
    # `is_superadmin` deliberately also treats a Django superuser as a super admin,
    # so the very first `createsuperuser` account can reach /panel/ before anyone has
    # explicitly set role='superadmin'. Teacher/student checks stay strict on `role`.
    @property
    def is_superadmin(self):
        return self.role == 'superadmin' or self.user.is_superuser

    @property
    def is_teacher(self):
        return self.role == 'teacher'

    @property
    def is_student(self):
        return self.role == 'student'

    @property
    def panel_home_url_name(self):
        """The landing route for this user's role — used by the post-login redirect."""
        if self.is_superadmin:
            return 'panel:dashboard'
        if self.is_teacher:
            return 'teacher:dashboard'
        return 'dashboard:home'


def ensure_profile_for_user(user):
    profile, created = Profile.objects.get_or_create(
        user=user,
        defaults={
            'avatar_url': 'https://api.dicebear.com/7.x/adventurer/svg?seed=guest',
            'xp': 0,
            'level': 1,
            'coins': 0,
            'streak': 1,
            'last_active_date': timezone.localdate(),
            'elo_rating': 1000,
            'last_seen_at': timezone.now(),
        }
    )
    now = timezone.now()
    if profile.last_seen_at is None or (now - profile.last_seen_at).total_seconds() > 60:
        profile.last_seen_at = now
        profile.save(update_fields=['last_seen_at'])
    # O'sish analitikasi (DAU/retention). 60s shartidan tashqarida: yangi profilda
    # last_seen_at endi qo'yilgan bo'ladi. Kesh kaliti bazaga kuniga bitta yozuv qoldiradi.
    from analytics.tracking import record_activity
    record_activity(profile)
    return profile


class ReferralBonus(models.Model):
    """Permanent audit ledger of one successful referral (mirrors shop.Purchase's pattern:
    InventoryItem/Profile hold current state, this table is the immutable history).

    `referred` is a OneToOneField — not just a FK — so the database itself guarantees a
    referred profile can be rewarded at most once, independent of any check in application
    code (the app-level guard in accounts.referrals is belt-and-suspenders, not the only line
    of defense against a bug or race double-crediting the same signup)."""

    referrer = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name='referral_bonuses_given')
    referred = models.OneToOneField(Profile, on_delete=models.CASCADE, related_name='referral_bonus_received')
    coins_awarded = models.PositiveIntegerField(default=10, help_text="Coins the REFERRER received (the new user gets the same amount).")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [models.Index(fields=['referrer', '-created_at'])]

    def __str__(self):
        return f"{self.referrer.user.username} <- {self.referred.user.username} (+{self.coins_awarded})"


@receiver(post_save, sender=User)
def create_profile_for_user(sender, instance, created, **kwargs):
    if created:
        ensure_profile_for_user(instance)
    elif hasattr(instance, 'profile'):
        if instance.is_superuser or instance.is_staff:
            p = instance.profile
            if p.xp != 0 or p.level != 1:
                p.xp = 0
                p.level = 1
                p.save(update_fields=['xp', 'level'])


@receiver(post_save, sender=Profile)
def sync_role_to_groups(sender, instance, **kwargs):
    """Keep a Django Group per role in sync with Profile.role, so future granular
    permissions can hang off Groups without reworking the role field. The Profile's
    own `role` stays the single source of truth for panel access; the Group is a mirror."""
    from django.contrib.auth.models import Group
    role_group_names = {'superadmin', 'teacher', 'student'}
    desired, _ = Group.objects.get_or_create(name=instance.role)
    user = instance.user
    # Drop any other role groups this user might carry, then ensure the current one.
    stale = user.groups.filter(name__in=role_group_names - {instance.role})
    if stale.exists():
        user.groups.remove(*stale)
    if not user.groups.filter(name=instance.role).exists():
        user.groups.add(desired)
