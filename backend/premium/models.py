from django.db import models
from django.utils import timezone
from accounts.models import Profile

class SubscriptionPlan(models.Model):
    PLAN_TYPE_CHOICES = [
        ('lessons', "Video/Audio darslar (oylik obuna)"),
        ('mock_test', "Mock test tizimi (bir martalik)"),
    ]
    plan_type = models.CharField(max_length=20, choices=PLAN_TYPE_CHOICES, default='lessons')
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    duration_days = models.IntegerField(default=30, help_text="0 = muddatsiz (bir martalik xarid uchun)")
    features_list = models.TextField(blank=True, help_text="Har bir qatorda bitta xususiyat")
    is_active = models.BooleanField(default=True)
    order = models.IntegerField(default=0)

    class Meta:
        ordering = ['order', 'price']

    def __str__(self):
        return f"{self.name} - {self.price:.0f} so'm"

    @property
    def features(self):
        return [f.strip() for f in self.features_list.split('\n') if f.strip()]


class Payment(models.Model):
    STATUS_CHOICES = [
        ('awaiting_screenshot', "Skrinshot kutilmoqda"),
        ('pending', "Ko'rib chiqilmoqda"),
        ('approved', 'Tasdiqlandi'),
        ('rejected', 'Rad etildi'),
    ]
    SOURCE_CHOICES = [
        ('web', 'Web App'),
        ('bot', 'Telegram Bot'),
    ]
    profile = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name='payments')
    plan = models.ForeignKey(SubscriptionPlan, on_delete=models.CASCADE)
    # Mock test tarifi BITTA testni ochadi: o'quvchi qaysi test kartasidan kelgan bo'lsa,
    # o'sha test shu yerda saqlanadi. Bo'sh bo'lsa (eski to'lovlar, bot orqali xarid) —
    # eski xulq saqlanadi va barcha mock testlar ochiladi.
    test = models.ForeignKey(
        'tests_app.TestSet', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='payments', help_text="Faqat mock test tarifi uchun: qaysi test sotib olindi",
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='awaiting_screenshot', db_index=True)
    source = models.CharField(max_length=10, choices=SOURCE_CHOICES, default='web')
    screenshot = models.ImageField(upload_to='payment_screenshots/', null=True, blank=True)
    admin_note = models.TextField(blank=True)
    reviewed_by = models.ForeignKey('auth.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_payments')
    created_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Payment {self.id}: {self.profile.user.username} - {self.plan.name} ({self.get_status_display()})"

    def apply_to_profile(self):
        """Grants the real access this payment paid for. Called once, on approval.

        Mock test tarifi: agar to'lov aniq bir testga bog'langan bo'lsa, faqat o'sha test
        ochiladi (global bayroq TEGILMAYDI) — kirish `unlocked_test_ids()` orqali shu
        to'lovning o'zidan kelib chiqadi. Test bog'lanmagan bo'lsa (eski to'lovlar va bot
        orqali xaridlar) eski xulq saqlanadi: barcha mock testlar ochiladi.
        """
        profile = self.profile
        if self.plan.plan_type == 'mock_test':
            if self.test_id:
                return
            profile.premium_mock_test_unlocked = True
        else:
            base = profile.premium_expires_at if profile.has_active_premium_lessons and profile.premium_expires_at else timezone.now()
            profile.is_premium = True
            profile.premium_expires_at = base + timezone.timedelta(days=self.plan.duration_days)
        profile.save()


def unlocked_test_ids(profile) -> set:
    """Shu o'quvchi alohida sotib olgan (tasdiqlangan) testlarning id'lari."""
    return set(
        Payment.objects
        .filter(profile=profile, status='approved', plan__plan_type='mock_test', test__isnull=False)
        .values_list('test_id', flat=True)
    )
