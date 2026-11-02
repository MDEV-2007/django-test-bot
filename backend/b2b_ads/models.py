from django.db import models
from django.utils import timezone
from accounts.models import Profile


class EduCenterCampaign(models.Model):
    center_name = models.CharField(max_length=200, help_text="O'quv markaz nomi (Registon, Cambridge LC, va hk.)")
    logo = models.URLField(max_length=500, blank=True, help_text="O'quv markaz logotipi URL manzili")
    title = models.CharField(max_length=255, help_text="Sarlavha (masalan: Tarix va Ona tili intensiv kursi)")
    description = models.TextField(blank=True, help_text="Qisqa tavsif yoki shartlar")
    offer_badge = models.CharField(max_length=100, default="1-dars BEPUL + 20% chegirma", help_text="Aksiya nishoni")
    target_subject = models.CharField(max_length=100, default="Tarix", help_text="Maqsadli fan (Tarix, Ona tili, Ingliz tili va h.k.)")
    target_region = models.CharField(max_length=100, default="Toshkent", help_text="Hudud (Toshkent, Farg'ona, Samarqand yoki Onlayn)")
    max_score_threshold = models.IntegerField(default=65, help_text="Shu foizdan past olgan o'quvchilarga ko'rsatilsin")
    rating = models.FloatField(default=4.9, help_text="Reyting balli (masalan: 4.9)")
    story_video_url = models.URLField(max_length=500, blank=True, help_text="Promo Story uchun video/media URL")
    telegram_webhook_or_chat_id = models.CharField(max_length=100, blank=True, help_text="O'quv markaz Telegram Chat ID yoki guruhi")
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "O'quv Markaz Kampaniyasi"
        verbose_name_plural = "O'quv Markaz Kampaniyalari"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.center_name} - {self.target_subject} (<{self.max_score_threshold}%)"


class StudentLeadSubmission(models.Model):
    student_profile = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name='b2b_lead_submissions')
    campaign = models.ForeignKey(EduCenterCampaign, on_delete=models.SET_NULL, null=True, blank=True, related_name='leads')
    full_name = models.CharField(max_length=200)
    phone_number = models.CharField(max_length=50)
    telegram_username = models.CharField(max_length=100, blank=True)
    predicted_dtm_score = models.CharField(max_length=50, blank=True, default="165.4")
    weakest_topics = models.TextField(blank=True, help_text="O'quvchining eng ko'p xato qilgan 3 ta mavzusi")
    status = models.CharField(
        max_length=30,
        default='NEW',
        choices=[
            ('NEW', 'Yangi'),
            ('CONTACTED', "Bog'lanildi"),
            ('ENROLLED', "Ro'yxatdan o'tdi"),
            ('REJECTED', 'Rad etildi'),
        ],
        db_index=True,
    )
    coins_rewarded = models.IntegerField(default=50)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "O'quvchi Lidi"
        verbose_name_plural = "O'quvchi Lidlari"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.full_name} ({self.phone_number}) -> {self.campaign.center_name if self.campaign else 'B2B'}"


def existing_lead(profile, campaign):
    """O'quvchining shu markazga avval yuborgan lidi (bo'lmasa None).

    Lid uchun tanga BIR MARTA beriladi: ilgari har POST yangi lid yaratib +50 tanga
    qo'shardi — skript bilan cheksiz tanga yig'ish va markazga bir xil lidni qayta-qayta
    yuborish mumkin edi."""
    if profile is None:
        return None
    return StudentLeadSubmission.objects.filter(student_profile=profile, campaign=campaign).first()
