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
    avatar_url = models.URLField(max_length=500, null=True, blank=True)
    
    # Gamification
    xp = models.IntegerField(default=0)
    level = models.IntegerField(default=1)
    coins = models.IntegerField(default=0)
    streak = models.IntegerField(default=0)
    last_active_date = models.DateField(null=True, blank=True)
    elo_rating = models.IntegerField(default=1000)
    
    # Premium status
    is_premium = models.BooleanField(default=False, help_text="Video/audio darslar oylik obunasi")
    premium_expires_at = models.DateTimeField(null=True, blank=True)
    premium_mock_test_unlocked = models.BooleanField(default=False, help_text="Mock test tizimi uchun bir martalik xarid")
    
    # Customizations
    biography = models.TextField(blank=True)
    language = models.CharField(max_length=10, default='uz')

    # Onboarding
    has_seen_onboarding = models.BooleanField(default=False, help_text="Loyiha haqida tanishtiruv splash-ekranlarini ko'rganmi")

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        # Index the leaderboard sort key so the overall ranking's ORDER BY xp stays fast
        # as the user table grows to thousands.
        indexes = [models.Index(fields=['-xp'], name='profile_xp_desc_idx')]

    def __str__(self):
        return f"{self.user.username}'s Profile"
        
    def add_xp(self, amount):
        """Adds XP and handles leveling up."""
        self.xp += amount
        leveled_up = False
        # Simple levelling threshold: 1000 XP per level
        next_level_threshold = self.level * 1000
        while self.xp >= next_level_threshold:
            self.level += 1
            leveled_up = True
            next_level_threshold = self.level * 1000
        self.save()
        return leveled_up

    def add_coins(self, amount):
        """Adds coins."""
        self.coins += amount
        self.save()

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
        }
    )
    return profile


@receiver(post_save, sender=User)
def create_profile_for_user(sender, instance, created, **kwargs):
    if created:
        ensure_profile_for_user(instance)


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
