from django.db import models
from django.contrib.auth.models import User


class AuditLog(models.Model):
    """Append-only trail of who created/updated/deleted which content object, written
    automatically by the signals in panel.signals. Read-only in the Super Admin panel."""
    ACTION_CHOICES = [
        ('create', 'Yaratildi'),
        ('update', "O'zgartirildi"),
        ('delete', "O'chirildi"),
    ]

    user = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='audit_logs',
        help_text="Amalni bajargan foydalanuvchi (tizim tomonidan bo'lsa — bo'sh).",
    )
    action = models.CharField(max_length=10, choices=ACTION_CHOICES)
    model_name = models.CharField(max_length=100)
    object_id = models.CharField(max_length=50, blank=True)
    object_repr = models.CharField(max_length=300, blank=True)
    changes = models.JSONField(default=dict, blank=True, help_text="Eski/yangi qiymatlar (update uchun).")
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-timestamp']
        verbose_name = "Audit yozuvi"
        verbose_name_plural = "Audit jurnali"

    def __str__(self):
        who = self.user.username if self.user else "Tizim"
        return f"{who} — {self.get_action_display()} {self.model_name} #{self.object_id}"

    @property
    def icon(self):
        return {'create': 'plus-circle', 'update': 'edit-3', 'delete': 'trash-2'}.get(self.action, 'activity')

    @property
    def summary_uz(self):
        who = (self.user.get_full_name() or self.user.username) if self.user else "Tizim"
        verb = {'create': 'yaratdi', 'update': "o'zgartirdi", 'delete': "o'chirdi"}.get(self.action, self.action)
        return f"{who} \"{self.object_repr or self.model_name}\" ni {verb}"


class SiteSettings(models.Model):
    """Singleton site-wide settings, editable from the Super Admin panel. Always use
    SiteSettings.load() rather than creating rows directly — only pk=1 is ever used."""
    site_name = models.CharField(max_length=100, default="Ilm Ildizi")
    logo_url = models.URLField(max_length=500, blank=True)
    contact_email = models.EmailField(blank=True)
    contact_phone = models.CharField(max_length=50, blank=True)
    telegram_channel = models.CharField(max_length=150, blank=True, help_text="masalan: @ilmildizi")
    announcement = models.TextField(blank=True, help_text="Saytdagi barcha foydalanuvchilarga ko'rsatiladigan e'lon (ixtiyoriy).")
    maintenance_mode = models.BooleanField(
        default=False,
        help_text="Yoqilganda oddiy foydalanuvchilar uchun sayt vaqtincha yopiladi; faqat super admin kira oladi.",
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Sayt sozlamalari"
        verbose_name_plural = "Sayt sozlamalari"

    def __str__(self):
        return self.site_name

    CACHE_KEY = 'site_settings:singleton'

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)
        # Refresh the cache immediately so an admin edit is visible on the next request.
        from django.core.cache import cache
        cache.set(self.CACHE_KEY, self, 3600)

    @classmethod
    def load(cls):
        """Cached singleton. This is read on EVERY request (context processor + the
        maintenance-mode middleware), so hitting the DB each time was two queries on every
        single page for data that almost never changes. Cached for an hour and refreshed
        on save."""
        from django.core.cache import cache
        obj = cache.get(cls.CACHE_KEY)
        if obj is None:
            obj, _ = cls.objects.get_or_create(pk=1)
            cache.set(cls.CACHE_KEY, obj, 3600)
        return obj


class Broadcast(models.Model):
    """A message a super admin pushed to a group of users. Kept as a history record;
    the actual delivery creates a core.Notification per recipient (and, optionally, a
    Telegram message to those who linked their account)."""
    AUDIENCE_CHOICES = [
        ('all', 'Barcha foydalanuvchilar'),
        ('students', "O'quvchilar"),
        ('teachers', "O'qituvchilar"),
        ('premium', 'Premium foydalanuvchilar'),
    ]
    title = models.CharField(max_length=200)
    message = models.TextField()
    image = models.ImageField(upload_to='broadcasts/', null=True, blank=True,
                              help_text="Ixtiyoriy — xabar bilan birga ko'rinadigan rasm")
    audience = models.CharField(max_length=20, choices=AUDIENCE_CHOICES, default='all')
    via_telegram = models.BooleanField(default=False)
    recipients_count = models.IntegerField(default=0)
    telegram_sent_count = models.IntegerField(default=0)
    sent_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='broadcasts')
    sent_at = models.DateTimeField(auto_now_add=True)

    # ─── Broadcast Scheduler ─────────────────────────────────────────────
    scheduled_at = models.DateTimeField(
        null=True, blank=True,
        help_text="Xabar kelajakda ma'lum vaqtda yuboriladi. Bo'sh bo'lsa — darhol yuboriladi.",
    )
    is_sent = models.BooleanField(
        default=True,
        help_text="Rejalashtirilgan xabar yuborildi yoki yo'qligi. Darhol yuborilganlar True.",
    )

    class Meta:
        ordering = ['-sent_at']

    def __str__(self):
        return f"{self.title} ({self.get_audience_display()}, {self.recipients_count})"


class AIUsageLog(models.Model):
    """Groq (yoki boshqa AI provider) API chaqiruvlarining loglari.
    Har bir AI chaqiruv (test baholash, feedback yaratish) shu yerda saqlanadi."""
    PROVIDER_CHOICES = [
        ('groq', 'Groq'),
        ('openai', 'OpenAI'),
        ('other', 'Boshqa'),
    ]
    provider = models.CharField(max_length=20, choices=PROVIDER_CHOICES, default='groq')
    model_name = models.CharField(max_length=100, default='llama-3.3-70b-versatile')
    endpoint = models.CharField(max_length=200, blank=True, help_text="Qaysi funksiya chaqirdi (masalan: grade_open_answers)")
    prompt_tokens = models.PositiveIntegerField(default=0)
    completion_tokens = models.PositiveIntegerField(default=0)
    total_tokens = models.PositiveIntegerField(default=0)
    estimated_cost_usd = models.FloatField(default=0.0, help_text="Taxminiy narx (USD)")
    response_time_ms = models.PositiveIntegerField(default=0, help_text="API javob vaqti (ms)")
    success = models.BooleanField(default=True)
    error_message = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = "AI foydalanish logi"
        verbose_name_plural = "AI foydalanish loglari"

    def __str__(self):
        return f"{self.provider}/{self.model_name} — {self.total_tokens} token ({self.created_at:%d.%m %H:%M})"


class FeatureFlag(models.Model):
    """IlmIldizi 2.0 modullari va sahifalarini dinamik boshqarish (Feature Flags).
    Super Admin paneldan istalgan funksiyani bir zumda yoqish, o'chirish yoki
    faqat adminlar uchun ochiq (Beta test) holatiga o'tkazish imkonini beradi."""
    CATEGORY_CHOICES = [
        ('core', 'Asosiy'),
        ('learning', "Ta'lim & O'rganish"),
        ('gamification', 'Geymifikatsiya & Jang'),
        ('analytics', 'Analitika'),
    ]

    key = models.CharField(max_length=50, unique=True, db_index=True, help_text="Modulning unikal identifikatori, masalan: flashcards")
    name = models.CharField(max_length=150, help_text="Modul nomi (o'zbek tilida)")
    description = models.TextField(blank=True, help_text="Modul vazifasi haqida qisqacha ma'lumot")
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='learning')
    is_enabled = models.BooleanField(default=True, help_text="Barcha o'quvchilar uchun yoqilganmi?")
    admin_only = models.BooleanField(default=False, help_text="Faqat Super Adminlar ko'rishi uchunmi? (Beta test)")
    badge_text = models.CharField(max_length=50, blank=True, help_text="Masalan: '2.0 Beta', 'Tez kunda'")
    target_route = models.CharField(max_length=150, blank=True, help_text="Frontend yo'li, masalan: /flashcards")
    icon_name = models.CharField(max_length=50, blank=True, default='Sparkles', help_text="Lucide ikonka nomi")
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='updated_features')

    CACHE_KEY_ALL = 'feature_flags:all_dict'

    class Meta:
        ordering = ['category', 'key']
        verbose_name = "Funksiya bayrog'i (Feature Flag)"
        verbose_name_plural = "Funksiya bayroqlari (Feature Flags)"

    def __str__(self):
        status = "Faol" if self.is_enabled else ("Faqat Admin" if self.admin_only else "O'chiq")
        return f"{self.name} ({self.key}) — {status}"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        from django.core.cache import cache
        cache.delete(self.CACHE_KEY_ALL)

    def delete(self, *args, **kwargs):
        super().delete(*args, **kwargs)
        from django.core.cache import cache
        cache.delete(self.CACHE_KEY_ALL)

    @classmethod
    def get_all_cached(cls):
        from django.core.cache import cache
        data = cache.get(cls.CACHE_KEY_ALL)
        if data is None:
            flags = list(cls.objects.all())
            if not flags:
                cls.seed_default_flags()
                flags = list(cls.objects.all())
            data = {
                f.key: {
                    'key': f.key,
                    'name': f.name,
                    'description': f.description,
                    'category': f.category,
                    'is_enabled': f.is_enabled,
                    'admin_only': f.admin_only,
                    'badge_text': f.badge_text,
                    'target_route': f.target_route,
                    'icon_name': f.icon_name,
                    'updated_at': f.updated_at.isoformat() if f.updated_at else None,
                }
                for f in flags
            }
            cache.set(cls.CACHE_KEY_ALL, data, 3600)
        return data

    @classmethod
    def seed_default_flags(cls):
        defaults = [
            {
                'key': 'reels',
                'name': 'Bilim Reels (Scroll-Learning)',
                'description': 'Instagram/TikTok formatidagi mini-darslar, vizual faktlar va tezkor mikrokvestlar.',
                'category': 'learning',
                'is_enabled': True,
                'admin_only': False,
                'badge_text': 'Viral',
                'target_route': '/reels',
                'icon_name': 'Sparkles',
            },
            {
                'key': 'flashcards',
                'name': 'Smart Flashcardlar (Yodlash)',
                'description': 'Sanalar, qoidalar va faktlarni 3D xotira kartalari (Anki uslubida) orqali yodlash.',
                'category': 'learning',
                'is_enabled': True,
                'admin_only': False,
                'badge_text': '2.0 Beta',
                'target_route': '/flashcards',
                'icon_name': 'Layers',
            },
            {
                'key': 'battles',
                'name': '1v1 Battle Arena (Jonli duel)',
                'description': "O'quvchilar o'rtasida 5 ta savoldan iborat real vaqtdagi intellektual jang.",
                'category': 'gamification',
                'is_enabled': True,
                'admin_only': False,
                'badge_text': 'Live',
                'target_route': '/battles',
                'icon_name': 'Swords',
            },
            {
                'key': 'learning',
                'name': 'Darslar & Konspektlar',
                'description': "Mavzulashtirilgan video darslar, audio ma'ruzalar va yuklab olinuvchi konspektlar.",
                'category': 'learning',
                'is_enabled': True,
                'admin_only': False,
                'badge_text': 'Audio',
                'target_route': '/learning',
                'icon_name': 'BookOpen',
            },
            {
                'key': 'games',
                'name': "Tarixiy Mini O'yinlar",
                'description': "Xronologik ketma-ketlik, xarita/qal'alar tahlili va sarkardani topish o'yinlari.",
                'category': 'gamification',
                'is_enabled': True,
                'admin_only': False,
                'badge_text': 'Bonus XP',
                'target_route': '/games/timeline',
                'icon_name': 'Gamepad2',
            },
            {
                'key': 'ai_mentor',
                'name': 'AI Shaxsiy Mentor',
                'description': "O'quvchining xatolarini tahlil qiluvchi va kunlik yo'l-yo'riq beruvchi AI ovozi.",
                'category': 'learning',
                'is_enabled': True,
                'admin_only': False,
                'badge_text': 'AI',
                'target_route': '/tests',
                'icon_name': 'Bot',
            },
            {
                'key': 'otm_predictor',
                'name': 'OTM Qabul Bashorati & Matcher',
                'description': "O'quvchining test ballari bo'yicha qaysi OTM grantiga yetishini hisoblash tizimi.",
                'category': 'analytics',
                'is_enabled': True,
                'admin_only': False,
                'badge_text': '2025/2026',
                'target_route': '/analytics',
                'icon_name': 'GraduationCap',
            },
            {
                'key': 'shop',
                'name': "Tangalar Do'koni & Kosmetika",
                'description': "Ishlab topilgan tangalarga avatar, ramkalar, unvonlar va streak muzlatish sotib olish.",
                'category': 'gamification',
                'is_enabled': True,
                'admin_only': False,
                'badge_text': 'Coin',
                'target_route': '/shop',
                'icon_name': 'ShoppingBag',
            },
            {
                'key': 'leaderboard',
                'name': 'Reyting & Peshqadamlar',
                'description': "Haftalik, oylik va umumiy top o'quvchilar ro'yxati hamda sovrinlar.",
                'category': 'gamification',
                'is_enabled': True,
                'admin_only': False,
                'badge_text': 'Top',
                'target_route': '/leaderboard',
                'icon_name': 'Trophy',
            },
            {
                'key': 'tests',
                'name': 'BBA & Rasmiy Testlar',
                'description': "Standart va blok testlar, vaqtli imtihonlar va diagnostika.",
                'category': 'core',
                'is_enabled': True,
                'admin_only': False,
                'badge_text': 'BBA',
                'target_route': '/tests',
                'icon_name': 'FileCheck2',
            },
        ]
        for item in defaults:
            cls.objects.get_or_create(key=item['key'], defaults=item)


