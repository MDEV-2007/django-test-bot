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
    site_name = models.CharField(max_length=100, default="Ilm Mevasi")
    logo_url = models.URLField(max_length=500, blank=True)
    contact_email = models.EmailField(blank=True)
    contact_phone = models.CharField(max_length=50, blank=True)
    telegram_channel = models.CharField(max_length=150, blank=True, help_text="masalan: @ilmmevasi")
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

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def load(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
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

    class Meta:
        ordering = ['-sent_at']

    def __str__(self):
        return f"{self.title} ({self.get_audience_display()}, {self.recipients_count})"
