from django.db import models
from django.conf import settings


class MistakeExplanationCache(models.Model):
    """Admin yuklamasini 0% ga tushiruvchi Lazy AI Layfxaklar keshi.

    Talabgor birinchi marta xato variantni tanlaganda AI orqali 3 qatorli qisqa
    layfxak (why_wrong va memory_hack) generatsiya qilinadi va shu jadvalga saqlanadi.
    Keyingi 10,000+ o'quvchi uchun 0.01 soniyada (0 so'm xarajat bilan) PostgreSQL'dan
    kesh sifatida qaytariladi.
    """
    question = models.ForeignKey(
        'tests_app.Question',
        on_delete=models.CASCADE,
        related_name='sprint_mistake_caches',
        help_text="Xato qilingan test savoli"
    )
    selected_option_id = models.IntegerField(
        db_index=True,
        help_text="Foydalanuvchi tanlagan noto'g'ri variant ID raqami"
    )
    selected_option_text = models.CharField(
        max_length=500,
        blank=True,
        help_text="Xato variant matni"
    )
    why_wrong = models.TextField(
        help_text="Foydalanuvchi nega aynan shu xato variantni tanlagani (1-2 jumla)"
    )
    memory_hack = models.TextField(
        help_text="To'g'ri javobni eslab qolish kodi / mnemonika / formula"
    )
    hit_count = models.PositiveIntegerField(
        default=1,
        help_text="Ushbu keshdan necha marta foydalanilgani (tejalgan AI so'rovlari)"
    )
    model_name = models.CharField(
        max_length=80,
        default="groq/llama-3.3-70b-versatile",
        help_text="Generatsiya qilgan AI modeli"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'sprint_mistake_explanation_cache'
        verbose_name = "Xato Layfxak Keshi"
        verbose_name_plural = "Xato Layfxaklar Keshi"
        unique_together = ('question', 'selected_option_id')
        indexes = [
            models.Index(fields=['question', 'selected_option_id'], name='sprint_q_opt_idx'),
        ]

    def __str__(self):
        return f"Q:{self.question_id} Opt:{self.selected_option_id} (Hits: {self.hit_count})"


class UserMistakeNotebook(models.Model):
    """Aqlli Xatolar Daftari — o'quvchining xato qilgan savollari va Qasos savollari holati."""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='sprint_mistake_records'
    )
    question = models.ForeignKey(
        'tests_app.Question',
        on_delete=models.CASCADE,
        related_name='sprint_user_mistakes'
    )
    failed_option_id = models.IntegerField(
        help_text="Birinchi marta xato qilingan variant ID"
    )
    is_resolved = models.BooleanField(
        default=False,
        db_index=True,
        help_text="Qasos savoli yoki takrorlashda to'g'ri yechilganmi"
    )
    revenge_attempts_count = models.PositiveIntegerField(
        default=0,
        help_text="Qasos savolida necha marta qayta urinilgani"
    )
    last_attempted_at = models.DateTimeField(auto_now=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'sprint_user_mistake_notebook'
        verbose_name = "O'quvchi Xatolar Daftari"
        verbose_name_plural = "O'quvchi Xatolar Daftarchalari"
        unique_together = ('user', 'question')
        indexes = [
            models.Index(fields=['user', 'is_resolved'], name='sprint_usr_res_idx'),
        ]

    def __str__(self):
        status = "Hal qilingan" if self.is_resolved else "Faol xato"
        return f"User:{self.user_id} - Q:{self.question_id} [{status}]"

