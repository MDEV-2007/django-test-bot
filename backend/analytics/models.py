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
