from django.db import models

from accounts.models import Profile


class ShopItem(models.Model):
    """A purchasable cosmetic or consumable.

    Cosmetics (avatar/frame/theme/title/badge) are owned once and *equipped*;
    consumables (Streak Freeze, future boosters) are bought repeatedly and stack
    as `InventoryItem.quantity`. Type-specific render data lives in `payload`
    (JSON) so a new cosmetic kind never needs a schema migration.
    """

    CATEGORY_AVATAR = 'avatar'
    CATEGORY_FRAME = 'frame'
    CATEGORY_THEME = 'theme'
    CATEGORY_TITLE = 'title'
    CATEGORY_BADGE = 'badge'
    CATEGORY_CONSUMABLE = 'consumable'
    CATEGORY_CHOICES = [
        (CATEGORY_AVATAR, 'Avatar'),
        (CATEGORY_FRAME, 'Ramka'),
        (CATEGORY_THEME, 'Mavzu'),
        (CATEGORY_TITLE, 'Unvon'),
        (CATEGORY_BADGE, 'Nishon'),
        (CATEGORY_CONSUMABLE, 'Sarflanadigan'),
    ]
    # Categories that are worn (one active at a time). Everything else is a consumable.
    EQUIPPABLE_CATEGORIES = frozenset({
        CATEGORY_AVATAR, CATEGORY_FRAME, CATEGORY_THEME, CATEGORY_TITLE, CATEGORY_BADGE,
    })

    RARITY_CHOICES = [
        ('common', 'Oddiy'),
        ('rare', 'Noyob'),
        ('epic', 'Epik'),
        ('legendary', 'Afsonaviy'),
    ]

    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, db_index=True)
    slug = models.SlugField(unique=True, help_text="Barqaror mashina-nomi — seed va kod shu bo'yicha topadi.")
    name = models.CharField(max_length=120)
    description = models.CharField(max_length=300, blank=True)
    icon_name = models.CharField(max_length=50, default='sparkles', help_text="Lucide ikonka nomi.")
    price_coins = models.PositiveIntegerField(default=100)
    rarity = models.CharField(max_length=20, choices=RARITY_CHOICES, default='common')
    payload = models.JSONField(
        default=dict, blank=True,
        help_text="Turga xos render ma'lumoti: avatar uchun {'avatar_url': ...}, ramka uchun "
                  "{'class': 'frame-gold'}, unvon uchun {'title': '...'} va hokazo.",
    )
    is_consumable = models.BooleanField(
        default=False,
        help_text="True bo'lsa bir necha marta olinadi va miqdor sifatida to'planadi (masalan Streak Freeze).",
    )
    required_level = models.PositiveIntegerField(
        default=0, help_text="Shu darajadan past foydalanuvchilar sotib ololmaydi (0 = cheklovsiz).",
    )
    is_active = models.BooleanField(default=True, db_index=True)
    order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['order', 'price_coins', 'id']
        indexes = [models.Index(fields=['category', 'is_active', 'order'])]

    def __str__(self):
        return f"{self.get_category_display()}: {self.name} ({self.price_coins})"

    @property
    def is_equippable(self):
        return self.category in self.EQUIPPABLE_CATEGORIES


class InventoryItem(models.Model):
    """Current-state projection of what a profile owns. One row per (profile, item).
    Consumables track `quantity`; cosmetics stay at quantity=1 and use `is_equipped`."""

    profile = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name='inventory')
    item = models.ForeignKey(ShopItem, on_delete=models.CASCADE, related_name='owned_by')
    quantity = models.PositiveIntegerField(default=1)
    is_equipped = models.BooleanField(default=False)
    acquired_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('profile', 'item')
        indexes = [models.Index(fields=['profile', 'is_equipped'])]

    def __str__(self):
        return f"{self.profile.user.username} — {self.item.name} x{self.quantity}"


class StreakFreezeLog(models.Model):
    """Audit trail of automatic Streak-Freeze consumption. One row each time a returning
    student's gap in activity was bridged by spending freeze(s) instead of resetting the
    streak — powers the 'usage history' UI and lets admins see how often freezes save streaks."""

    profile = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name='freeze_logs')
    days_covered = models.PositiveIntegerField(default=1, help_text="Qoplangan (o'tkazib yuborilgan) kunlar soni.")
    streak_before = models.PositiveIntegerField(default=0)
    note = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [models.Index(fields=['profile', '-created_at'])]

    def __str__(self):
        return f"{self.profile.user.username} — {self.days_covered} kun muzlatildi"


class Purchase(models.Model):
    """Immutable audit ledger of every coin spend. `InventoryItem` is derived current
    state; this table is the permanent history (survives item deletion via the snapshot)."""

    profile = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name='purchases')
    item = models.ForeignKey(ShopItem, on_delete=models.SET_NULL, null=True, blank=True, related_name='purchases')
    item_name = models.CharField(max_length=120, help_text="Snapshot — mahsulot o'chsa ham tarix o'qiladi.")
    coins_spent = models.PositiveIntegerField()
    quantity = models.PositiveIntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [models.Index(fields=['profile', '-created_at'])]

    def __str__(self):
        return f"{self.profile.user.username} bought {self.item_name} for {self.coins_spent}"
