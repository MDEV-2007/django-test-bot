"""DTM ball bashorati tarixi (Feature 2).

Nega jadval kerak: bashorat har safar qaytadan hisoblanadi, lekin o'quvchiga eng
qimmatlisi — uning O'SISHI ("oldin 118 edi, hozir 134"). Shuning uchun har kunlik
suratni saqlaymiz va progress grafigini shundan quramiz.
"""
from django.db import models

from accounts.models import Profile


class ScorePrediction(models.Model):
    profile = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name='score_predictions')
    predicted_percent = models.FloatField(help_text="Og'irlikli o'rtacha o'zlashtirish, 0–100")
    predicted_dtm = models.PositiveIntegerField(help_text="Taxminiy DTM balli (chiziqli moslashtirish)")
    confidence = models.FloatField(help_text="0–1: javoblar hajmi va mavzu qamroviga bog'liq")
    sample_size = models.PositiveIntegerField(help_text="Hisobga olingan javoblar soni")
    calculated_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-calculated_at']
        indexes = [models.Index(fields=['profile', 'calculated_at'])]
        verbose_name = 'Ball bashorati'
        verbose_name_plural = 'Ball bashoratlari'

    def __str__(self):
        return f'{self.profile.user.username}: ~{self.predicted_dtm} ball ({self.confidence:.0%})'


class DailyActivity(models.Model):
    """Bir o'quvchi — bir kun — bitta qator. DAU/WAU/MAU va qaytish (retention) shundan
    hisoblanadi. `Profile.last_seen_at` faqat oxirgi vaqtni saqlaydi, tarix bermaydi."""

    profile = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name='daily_activity')
    date = models.DateField(db_index=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['profile', 'date'], name='uniq_daily_activity')]
        verbose_name = 'Kunlik faollik'
        verbose_name_plural = 'Kunlik faollik'

    def __str__(self):
        return f'{self.profile_id} @ {self.date}'


class ProductEvent(models.Model):
    """Monetizatsiya voronkasi hodisalari (paywall ko'rindi, tariflar sahifasi ochildi...).
    To'lov bosqichlari bu yerga yozilmaydi — ular `premium.Payment` holatlaridan olinadi."""

    profile = models.ForeignKey(Profile, on_delete=models.CASCADE, null=True, blank=True,
                                related_name='product_events')
    name = models.CharField(max_length=40, db_index=True)
    props = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [models.Index(fields=['name', 'created_at'])]
        verbose_name = 'Mahsulot hodisasi'
        verbose_name_plural = 'Mahsulot hodisalari'

    def __str__(self):
        return f'{self.name} ({self.profile_id})'
