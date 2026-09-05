"""Haftalik mock sikli va o'qituvchi bilan daromad taqsimoti.

NIMA UCHUN ALOHIDA ILOVA
------------------------
`premium` ilovasidagi `Payment` platformaning O'Z tariflarini sotadi: to'lov tasdiqlangach
o'quvchiga premium ochiladi va hikoya shu yerda tugaydi. Bu yerdagi to'lov esa uchinchi
tomonga — o'qituvchiga — qarzdorlik yaratadi: har bir tasdiqlangan to'lov daromad
defteriga qator yozadi va o'sha pul keyin qo'lda o'tkaziladi. Ikkalasini bitta modelga
tiqish har ikkalasini ham buzardi, shuning uchun yangi ilova.

To'lovning O'ZI hozircha `premium` bilan bir xil yo'ldan boradi (karta o'tkazmasi + chek
skrinshoti), chunki Click/Payme integratsiyasi hali yo'q.

QAYTA QURILMAGAN NARSALAR
-------------------------
* O'qituvchining o'zi — `teacher.TeacherProfile` (unga faqat to'lov maydonlari qo'shildi).
* O'quvchi ↔ o'qituvchi bog'lanishi — `teacher.TeacherStudent` (referral orqali).
* Savollar, baholash va urinish — `tests_app.TestSet` / `Attempt`. `MockTest` savol
  yaratmaydi, mavjud to'plamga vaqt jadvali va kirish huquqini qo'shadi xolos.

PUL
---
Hamma summa — BUTUN SONDAGI TIYIN. Float ishlatilmaydi: 0.1 + 0.2 != 0.3 bo'lgan joyda
o'qituvchining ulushi sekin-asta "yo'qoladi" va buni hech kim sezmaydi.

VAQT
----
Bazada hammasi UTC (settings.TIME_ZONE = 'UTC'). Asia/Tashkent'ga faqat ko'rsatishda
o'giriladi — `classroom.services.to_tashkent`.
"""
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from accounts.models import Profile
from teacher.models import TeacherProfile


class Subscription(models.Model):
    """O'quvchining bitta o'qituvchiga oylik obunasi.

    Obuna "faol" bo'lishi uchun ikkala shart ham kerak: status = active VA davr hali
    tugamagan. Ikkinchisisiz muddati o'tgan obuna cheksiz kirish berardi; birinchisisiz
    bekor qilingan obuna davr oxirigacha ishlab turaverardi.
    """

    # `pending` spetsifikatsiyada yo'q edi, lekin usiz xavfsiz standart qolmaydi: obuna
    # qatori to'lov TASDIQLANISHIDAN OLDIN yaratiladi (to'lov unga bog'lanadi), va agar u
    # darhol 'active' bo'lsa — o'quvchi hech narsa to'lamasdan kirish olardi.
    STATUS_CHOICES = [
        ('pending', "To'lov kutilmoqda"),
        ('active', 'Faol'),
        ('expired', 'Muddati tugagan'),
        ('cancelled', 'Bekor qilingan'),
    ]

    student = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name='class_subscriptions')
    teacher = models.ForeignKey(TeacherProfile, on_delete=models.CASCADE, related_name='subscriptions')
    price_tiyin = models.PositiveIntegerField(help_text="Oylik narx, TIYINDA (40 000 so'm = 4 000 000).")
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending', db_index=True)
    current_period_start = models.DateTimeField()
    current_period_end = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Obuna"
        verbose_name_plural = "Obunalar"
        ordering = ['-created_at']
        indexes = [
            # "Shu o'quvchi shu mock'ga kira oladimi?" — eng ko'p takrorlanadigan so'rov.
            models.Index(fields=['student', 'status'], name='sub_student_status_idx'),
            models.Index(fields=['teacher', 'status'], name='sub_teacher_status_idx'),
        ]
        constraints = [
            # Bitta o'quvchi bitta o'qituvchiga ikkita faol obunaga ega bo'lmasligi kerak:
            # aks holda ikki marta to'lov qilinadi va ikkalasi ham "faol" ko'rinadi.
            models.UniqueConstraint(
                fields=['student', 'teacher'], condition=models.Q(status='active'),
                name='uniq_active_subscription_per_teacher',
            ),
        ]

    def __str__(self):
        return f'{self.student.user.username} → {self.teacher.full_name} ({self.get_status_display()})'

    @property
    def is_active(self):
        return self.status == 'active' and self.current_period_end > timezone.now()

    @property
    def price_som(self):
        """Faqat ko'rsatish uchun. Hisob-kitob HAR DOIM tiyinda bajariladi."""
        return self.price_tiyin / 100


class Payment(models.Model):
    """Obuna uchun to'lov.

    HOZIRGI OQIM — KARTA O'TKAZMASI. Click/Payme integratsiyasi hali yo'q: o'quvchi
    platformaning kartasiga o'tkazadi (`settings.PREMIUM_CARD_NUMBER`, `premium` ilovasi
    bilan bir xil karta) va chek skrinshotini yuklaydi. To'lovni FAQAT super admin
    tasdiqlaydi — o'qituvchi o'z o'quvchisining to'lovini tasdiqlay olmaydi, aks holda
    daromad defteriga o'zi qator yozdirib olardi.

    Provayder maydonlari BUGUN ham bor, chunki ular kelajakdagi integratsiya uchun emas,
    BUGUNGI takrorlanishni to'xtatish uchun kerak: `provider='card'` va
    `provider_transaction_id` sifatida o'tkazma raqami yozilsa, bir xil chekni ikkinchi
    marta kiritib bo'lmaydi. Click/Payme qo'shilganda shu yerga `provider='click'` bilan
    yoziladi va tasdiqlash oqimi o'zgarmaydi.

    `provider` + `provider_transaction_id` juftligi noyob (raqam ko'rsatilgan bo'lsa).
    Nega juftlik, yolg'iz id emas: raqam provayder ICHIDA noyob, Click'ning 12345 raqami
    Payme'ning 12345 raqamiga to'qnash kelishi mumkin.

    `raw_payload` HAR DOIM saqlanadi — provayder qo'shilganda uning so'rovi, hozircha esa
    o'quvchi kiritgan ma'lumot. Nizo chiqqanda boshqa manba bo'lmaydi.
    """

    PROVIDER_CHOICES = [
        ('card', "Karta o'tkazmasi"),
        ('click', 'Click'),
        ('payme', 'Payme'),
    ]
    STATUS_CHOICES = [
        ('pending', "Ko'rib chiqilmoqda"),
        ('success', 'Tasdiqlandi'),
        ('rejected', 'Rad etildi'),
        ('cancelled', 'Bekor qilingan'),
    ]

    subscription = models.ForeignKey(Subscription, on_delete=models.PROTECT, related_name='payments')
    amount_tiyin = models.PositiveIntegerField(help_text="To'langan summa, TIYINDA.")
    provider = models.CharField(max_length=10, choices=PROVIDER_CHOICES, default='card')
    provider_transaction_id = models.CharField(
        max_length=100, blank=True,
        help_text="O'tkazma / tranzaksiya raqami. Karta o'tkazmasida ixtiyoriy, lekin "
                   "yozilsa — bir xil chek ikkinchi marta kiritilmaydi.",
    )
    raw_payload = models.JSONField(
        default=dict, blank=True,
        help_text="So'rovning o'zgartirilmagan tanasi (provayder yoki o'quvchi kiritgani).",
    )
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending', db_index=True)

    # --- Qo'lda tekshirish (faqat super admin) ---
    receipt = models.ImageField(
        upload_to='classroom/receipts/%Y/%m/', null=True, blank=True,
        help_text="O'tkazma cheki skrinshoti.",
    )
    admin_note = models.TextField(blank=True, help_text="Rad etish sababi yoki izoh.")
    reviewed_by = models.ForeignKey(
        'auth.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_class_payments')
    reviewed_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Obuna to'lovi"
        verbose_name_plural = "Obuna to'lovlari"
        ordering = ['-created_at']
        constraints = [
            # Faqat raqam ko'rsatilganda amal qiladi: karta o'tkazmasida raqam bo'lmasligi
            # ham mumkin, va bo'sh satrlar bir-biriga "takror" deb hisoblanmasligi kerak.
            models.UniqueConstraint(
                fields=['provider', 'provider_transaction_id'],
                condition=~models.Q(provider_transaction_id=''),
                name='uniq_provider_transaction',
            ),
        ]

    def __str__(self):
        reference = self.provider_transaction_id or f'#{self.pk}'
        return f'{self.get_provider_display()} {reference} — {self.amount_tiyin} tiyin'


class PayoutEntry(models.Model):
    """Daromad defterining bitta qatori: bitta muvaffaqiyatli to'lovdan o'qituvchiga
    tegishli summa.

    `payment` — OneToOne. Spetsifikatsiyada oddiy FK deyilgan, lekin noyoblik shartisiz
    webhook ikki marta kelganda ikkita qator yozilib, o'qituvchiga ikki barobar hisoblanib
    ketardi. Bu — pulning to'g'riligini bazaning o'zi kafolatlaydigan yagona joy, kodning
    ehtiyotkorligiga tayanib bo'lmaydi.

    To'lash AVTOMATIK EMAS: bu jadval faqat hisoblaydi, pul qo'lda o'tkaziladi va admin
    qatorni `paid` deb belgilaydi.
    """

    STATUS_CHOICES = [
        ('accrued', 'Hisoblandi'),
        ('paid', "To'landi"),
    ]

    teacher = models.ForeignKey(TeacherProfile, on_delete=models.PROTECT, related_name='payout_entries')
    payment = models.OneToOneField(Payment, on_delete=models.PROTECT, related_name='payout_entry')
    gross_tiyin = models.PositiveIntegerField(help_text="To'lovning to'liq summasi, tiyinda.")
    platform_fee_tiyin = models.PositiveIntegerField(help_text="Platforma ushlab qolgan qismi, tiyinda.")
    net_tiyin = models.PositiveIntegerField(help_text="O'qituvchiga tegishli qism, tiyinda.")
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='accrued', db_index=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    note = models.CharField(max_length=200, blank=True, help_text="Qo'lda to'lash izohi (o'tkazma raqami va h.k.).")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Daromad qatori"
        verbose_name_plural = "Daromad defteri"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['teacher', 'status'], name='payout_teacher_status_idx'),
        ]
        constraints = [
            # Yaxlitlash xatosi yoki noto'g'ri hisob bazaga tushmasin: bo'linish har doim
            # to'liq bo'lishi kerak.
            models.CheckConstraint(
                condition=models.Q(gross_tiyin=models.F('platform_fee_tiyin') + models.F('net_tiyin')),
                name='payout_split_adds_up',
            ),
        ]

    def __str__(self):
        return f'{self.teacher.full_name}: {self.net_tiyin} tiyin ({self.get_status_display()})'


class MockTest(models.Model):
    """O'qituvchining jadvalga qo'yilgan mock testi.

    Savollarni bu model saqlamaydi — ular `tests_app.TestSet` da. Bu yerda faqat
    o'qituvchining sinfiga xos narsa bor: qachon boshlanadi, qancha davom etadi va kim
    kira oladi.
    """

    STATUS_CHOICES = [
        ('draft', 'Qoralama'),
        ('scheduled', 'Jadvalga qo\'yilgan'),
        ('live', 'Ketmoqda'),
        ('finished', 'Tugagan'),
    ]

    teacher = models.ForeignKey(TeacherProfile, on_delete=models.CASCADE, related_name='mock_tests')
    subject = models.ForeignKey(
        'tests_app.Subject', on_delete=models.SET_NULL, null=True, blank=True, related_name='mock_tests')
    test_set = models.ForeignKey(
        'tests_app.TestSet', on_delete=models.PROTECT, related_name='mock_tests',
        help_text="Savollar manbai. Mavjud test to'plami qayta ishlatiladi.",
    )
    title = models.CharField(max_length=200)
    scheduled_start = models.DateTimeField(
        db_index=True, help_text="Boshlanish vaqti — UTC da saqlanadi, panelda Toshkent vaqtida ko'rsatiladi.")
    duration_minutes = models.PositiveSmallIntegerField(default=60)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='draft', db_index=True)
    is_free_preview = models.BooleanField(
        default=False,
        help_text="Birinchi mock reklama uchun: obunasiz o'quvchi ham kira oladi.",
    )
    results_published_at = models.DateTimeField(
        null=True, blank=True,
        help_text="Reyting hisoblangan va natijalar yuborilgan vaqt. Ikki marta yuborilmasligi uchun.",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Mock test"
        verbose_name_plural = "Mock testlar"
        ordering = ['-scheduled_start']
        indexes = [
            models.Index(fields=['teacher', 'scheduled_start'], name='mock_teacher_start_idx'),
            models.Index(fields=['status', 'scheduled_start'], name='mock_status_start_idx'),
        ]

    def __str__(self):
        return f'{self.title} — {self.teacher.full_name}'

    def clean(self):
        # Test to'plami boshqa o'qituvchiniki bo'lsa, uning savollari begona sinfga oqib
        # ketardi. Admin formasi ham shu tekshiruvdan o'tadi.
        if self.test_set_id and self.test_set.created_by_id:
            owner = self.teacher.profile.user_id if self.teacher_id else None
            if owner and self.test_set.created_by_id != owner:
                raise ValidationError({'test_set': "Bu test to'plami boshqa o'qituvchiga tegishli."})

    @property
    def scheduled_end(self):
        return self.scheduled_start + timezone.timedelta(minutes=self.duration_minutes)

    def is_open_at(self, moment=None):
        """Shu paytda kirish oynasi ochiqmi. Faqat SERVER vaqti bilan hisoblanadi."""
        moment = moment or timezone.now()
        if self.status not in ('scheduled', 'live'):
            return False
        return self.scheduled_start <= moment < self.scheduled_end


class MockAttempt(models.Model):
    """O'quvchining bitta mock'dagi urinishi.

    Baholashning o'zi `tests_app.Attempt` da bo'ladi (savollar, javoblar, AI xulosasi —
    hammasi allaqachon o'sha yerda ishlaydi). Bu yerdagi `score` va `breakdown` — reyting
    va Telegram xabari uchun nusxa: mock tugagach ular bir marta hisoblanadi va keyin
    ro'yxatni chizishda hech qanday qo'shimcha so'rov kerak bo'lmaydi.
    """

    student = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name='mock_attempts')
    mock = models.ForeignKey(MockTest, on_delete=models.CASCADE, related_name='attempts')
    attempt = models.OneToOneField(
        'tests_app.Attempt', on_delete=models.SET_NULL, null=True, blank=True, related_name='mock_attempt',
        help_text="Javoblar va baholash shu urinishda — mavjud test dvigateli qayta ishlatiladi.",
    )
    started_at = models.DateTimeField(auto_now_add=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    score = models.FloatField(null=True, blank=True, help_text="Foiz. Pul emas, shuning uchun float mumkin.")
    breakdown = models.JSONField(default=dict, blank=True, help_text="Bo'limlar kesimidagi natija.")
    rank = models.PositiveIntegerField(
        null=True, blank=True, help_text="Shu mock ichidagi o'rin. Mock tugagach bir marta hisoblanadi.")
    result_sent_at = models.DateTimeField(
        null=True, blank=True, help_text="Telegram xabari yuborilgan vaqt (takror yuborilmasligi uchun).")

    class Meta:
        verbose_name = "Mock urinishi"
        verbose_name_plural = "Mock urinishlari"
        ordering = ['-started_at']
        unique_together = ('student', 'mock')
        indexes = [
            # Reyting: bitta mock bo'yicha ballar kesimi.
            models.Index(fields=['mock', '-score'], name='mockattempt_mock_score_idx'),
        ]

    def __str__(self):
        return f'{self.student.user.username} — {self.mock.title}'

    @property
    def deadline(self):
        """Javob qabul qilinadigan oxirgi payt. Klientning vaqti hech qachon so'ralmaydi.

        Ikkita chegaradan ERTAROG'I ishlaydi: o'quvchining o'z vaqti (boshlagan paytdan
        + mock davomiyligi) va mock oynasining tugashi. Kechikib kirgan o'quvchi
        oynadan tashqariga chiqib ketmaydi — aks holda u boshqalardan ko'proq vaqt
        olardi va reyting adolatsiz bo'lardi.
        """
        own = self.started_at + timezone.timedelta(minutes=self.mock.duration_minutes)
        return min(own, self.mock.scheduled_end)

    def is_expired(self, moment=None):
        return (moment or timezone.now()) > self.deadline


class AIGradingQuota(models.Model):
    """O'quvchining oylik AI baholash hisobi.

    Esse baholash har bir chaqiruvda pul turadi, shuning uchun chegara qat'iy: oyiga 15 ta.
    Hisob oy bo'yicha alohida qatorda yuritiladi — shunda oy almashganda hech narsani
    tozalash kerak emas, yangi qator o'zi paydo bo'ladi.
    """

    MONTHLY_LIMIT = 15

    student = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name='ai_grading_quotas')
    period = models.CharField(max_length=7, help_text="YYYY-MM (UTC bo'yicha).")
    used = models.PositiveSmallIntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "AI baholash chegarasi"
        verbose_name_plural = "AI baholash chegaralari"
        unique_together = ('student', 'period')
        ordering = ['-period']

    def __str__(self):
        return f'{self.student.user.username} {self.period}: {self.used}/{self.MONTHLY_LIMIT}'
