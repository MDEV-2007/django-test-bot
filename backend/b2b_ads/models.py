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
    impressions_count = models.IntegerField(default=0, help_text="Reklama haqiqatan ko'rsatilgan (foydalanuvchi/kun bo'yicha takrorsiz)")
    clicks_count = models.IntegerField(default=0, help_text="CTA bosilgan (foydalanuvchi/kun bo'yicha takrorsiz)")
    # Lifecycle: is_active=False — to'xtatilgan; starts_at kelajakda — rejalashtirilgan;
    # ends_at o'tgan — tugagan; max_leads to'lgan — byudjet (lid limiti) tugagan.
    starts_at = models.DateTimeField(null=True, blank=True, help_text="Boshlanish vaqti (bo'sh — darhol)")
    ends_at = models.DateTimeField(null=True, blank=True, help_text="Tugash vaqti (bo'sh — muddatsiz)")
    max_leads = models.PositiveIntegerField(null=True, blank=True,
                                            help_text="Lid limiti (byudjet). Bo'sh — cheklanmagan")
    created_at = models.DateTimeField(auto_now_add=True)

    # --- Ads Manager ---------------------------------------------------------------
    # Egasi: tasdiqlangan advertiser markazi. Bo'sh — Super Admin yaratgan eski
    # kampaniya (faqat /panel/ boshqaradi).
    center = models.ForeignKey(
        'core.EducationCenter', on_delete=models.PROTECT, null=True, blank=True,
        related_name='ad_campaigns',
    )
    REVIEW_CHOICES = [
        ('draft', 'Qoralama'),
        ('pending_review', "Ko'rib chiqilmoqda"),
        ('approved', 'Tasdiqlangan'),
        ('rejected', 'Rad etilgan'),
    ]
    # Moderatsiya. Mavjud (SA yaratgan) kampaniyalar migratsiyada `approved` bo'ladi —
    # jonli feed o'zgarmaydi. Advertiser kampaniyasi SA tasdiqlamaguncha ko'rsatilmaydi.
    review_status = models.CharField(max_length=20, choices=REVIEW_CHOICES, default='approved', db_index=True)
    review_note = models.TextField(blank=True, help_text="Rad etish sababi (advertiserga ko'rinadi)")
    reviewed_at = models.DateTimeField(null=True, blank=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    OBJECTIVE_CHOICES = [
        ('leads', "Lid yig'ish"),
        ('course', "Kursni targ'ib qilish"),
        ('center', "Markazni targ'ib qilish"),
        ('event', 'Tadbir'),
        ('other', 'Boshqa'),
    ]
    objective = models.CharField(max_length=20, choices=OBJECTIVE_CHOICES, default='leads')
    banner_url = models.CharField(max_length=500, blank=True, help_text="Reklama banneri (yuklangan fayl manzili)")
    cta_text = models.CharField(max_length=60, blank=True, help_text="Tugma matni")
    # Advertiser kampaniyani butunlay yakunlagan (qayta yoqib bo'lmaydi). O'chirish o'rniga —
    # lidlar va statistika saqlanadi.
    ended_manually_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True, null=True)

    class Meta:
        verbose_name = "O'quv Markaz Kampaniyasi"
        verbose_name_plural = "O'quv Markaz Kampaniyalari"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.center_name} - {self.target_subject} (<{self.max_score_threshold}%)"

    def lifecycle_status(self, leads_count=None, now=None):
        """'draft' | 'pending_review' | 'rejected' | 'ended' | 'paused' | 'scheduled' |
        'exhausted' | 'active'. Har biri alohida — biri ikkinchisiga qo'shib yuborilmaydi."""
        from django.utils import timezone as tz
        now = now or tz.now()
        if self.review_status in ('draft', 'pending_review', 'rejected'):
            return self.review_status
        if self.ended_manually_at:
            return 'ended'
        if not self.is_active:
            return 'paused'
        if self.starts_at and self.starts_at > now:
            return 'scheduled'
        if self.ends_at and self.ends_at <= now:
            return 'ended'
        if self.max_leads is not None:
            count = leads_count if leads_count is not None else self.leads.count()
            if count >= self.max_leads:
                return 'exhausted'
        return 'active'


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
    # Advertiser CRM: ichki izoh va oxirgi status o'zgarishi vaqti.
    note = models.TextField(blank=True)
    status_changed_at = models.DateTimeField(null=True, blank=True)
    # O'quvchi telefon va ma'lumotlarini markazga uzatishga aniq rozilik bergan vaqt.
    consent_at = models.DateTimeField(null=True, blank=True)
    # Profilda yosh yo'q: o'quvchi "18 yoshdan kattaman yoki ota-onam/vasiyim roziligi bor"
    # deb aniq tasdiqlaydi (voyaga yetmaganlar telefoni markazga shunchaki uzatilmasin).
    guardian_confirmed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "O'quvchi Lidi"
        verbose_name_plural = "O'quvchi Lidlari"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.full_name} ({self.phone_number}) -> {self.campaign.center_name if self.campaign else 'B2B'}"


class AdEvent(models.Model):
    """Reklama ko'rsatilishi / bosilishi — bitta foydalanuvchi + kampaniya + hodisa + kun
    uchun BITTA qator (DB darajasidagi UniqueConstraint).

    Nega counter yetarli emas: `impressions_count`/`clicks_count` faqat umrbod jami —
    sana oralig'i, trend, unique reach va audit uchun vaqt qatori kerak; ilgari dedup faqat
    Redis keshida edi (kesh tozalansa qayta sanalardi). Counter'lar orqaga moslik uchun
    saqlanadi va faqat yangi qator yaratilganda oshiriladi."""
    EVENT_CHOICES = [('impression', 'Impression'), ('click', 'Click')]

    campaign = models.ForeignKey(EduCenterCampaign, on_delete=models.CASCADE, related_name='events')
    user = models.ForeignKey('auth.User', on_delete=models.CASCADE, related_name='ad_events')
    event = models.CharField(max_length=12, choices=EVENT_CHOICES)
    day = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['campaign', 'user', 'event', 'day'], name='uniq_ad_event_per_day'),
        ]
        indexes = [models.Index(fields=['campaign', 'event', 'day'])]


class AdCreative(models.Model):
    """Advertiser yuklagan rasm/video. Fayl MEDIA storage'da (bazada faqat yo'l), egasi —
    markaz: boshqa advertiser uni ko'ra ham, kampaniyasiga ulay ham olmaydi."""
    KIND_CHOICES = [('image', 'Rasm'), ('video', 'Video')]

    center = models.ForeignKey('core.EducationCenter', on_delete=models.CASCADE, related_name='creatives')
    kind = models.CharField(max_length=10, choices=KIND_CHOICES)
    file = models.FileField(upload_to='ads/creatives/%Y/%m/')
    original_name = models.CharField(max_length=200, blank=True)
    size_bytes = models.PositiveIntegerField(default=0)
    width = models.PositiveIntegerField(null=True, blank=True)
    height = models.PositiveIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']


def existing_lead(profile, campaign):
    """O'quvchining shu markazga avval yuborgan lidi (bo'lmasa None).

    Lid uchun tanga BIR MARTA beriladi: ilgari har POST yangi lid yaratib +50 tanga
    qo'shardi — skript bilan cheksiz tanga yig'ish va markazga bir xil lidni qayta-qayta
    yuborish mumkin edi."""
    if profile is None:
        return None
    return StudentLeadSubmission.objects.filter(student_profile=profile, campaign=campaign).first()
