"""O'qituvchi-orqali-sinf (Feature 1) modellari.

Loyihada allaqachon bor narsalar QAYTA yaratilmaydi:
  * o'qituvchi roli — `Profile.role == 'teacher'`;
  * referral kodi va Telegram deep-link — `Profile.referral_code` + `accounts/referrals.py`.
Shuning uchun bu yerda faqat ikkita yangi narsa bor: o'qituvchining qo'shimcha
ma'lumotlari (fan, muassasa) va o'quvchi ↔ o'qituvchi bog'lanishi.
"""
from django.db import models

from accounts.models import Profile


class TeacherProfile(models.Model):
    """O'qituvchining "sinf egasi" sifatidagi qo'shimcha ma'lumoti.

    Alohida `teachers` jadvali emas, `Profile` ning kengaytmasi: rol, XP, avatar,
    referral kodi — hammasi allaqachon Profile'da va ikki nusxada saqlanmasligi kerak.
    """
    profile = models.OneToOneField(Profile, on_delete=models.CASCADE, related_name='teacher_profile')
    full_name = models.CharField(max_length=120)
    subject = models.CharField(max_length=80, blank=True, help_text="Masalan: Tarix, Ona tili")
    institution = models.CharField(max_length=160, blank=True, help_text="Maktab / o'quv markazi nomi")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "O'qituvchi profili"
        verbose_name_plural = "O'qituvchi profillari"

    def __str__(self):
        return f'{self.full_name} — {self.subject or "fan ko\'rsatilmagan"}'


class TeacherStudent(models.Model):
    """O'quvchining o'qituvchi sinfiga bog'lanishi.

    MVP qoidasi: bitta o'quvchi — bitta o'qituvchi (`student` OneToOne). Ko'p sinf /
    o'qituvchini almashtirish v2 uchun ataylab qoldirilgan.

    Bog'lanish avtomatik yaratiladi: o'quvchi o'qituvchining referral kodi bilan
    ro'yxatdan o'tsa, `accounts.referrals.apply_referral` shu qatorni qo'shadi.
    """
    teacher = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name='class_students')
    student = models.OneToOneField(Profile, on_delete=models.CASCADE, related_name='teacher_link')
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Sinf o'quvchisi"
        verbose_name_plural = "Sinf o'quvchilari"
        ordering = ['-joined_at']

    def __str__(self):
        return f'{self.student.user.username} → {self.teacher.user.username}'
