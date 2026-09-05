"""Pullik sinf uchun admin.

O'qituvchi uchun alohida frontend ataylab qurilmagan — Django admin yetadi. Shundan
kelib chiqib, bu yerdagi eng muhim narsa KO'RINISH CHEGARASI: o'qituvchi faqat o'z
sinfining ma'lumotini ko'rishi kerak. Har bir ModelAdmin `TeacherScopedAdmin` dan
meros oladi va so'rovni o'qituvchi bo'yicha filtrlaydi; superuser hammasini ko'radi.

Vakolatlar taqsimoti:
  * O'QITUVCHI — o'z sinfidagi to'lovni tasdiqlaydi yoki rad etadi, va o'z daromadini
    ko'radi. Bundan boshqa hech narsani o'zgartira olmaydi.
  * SUPER ADMIN — qolgan hammasi: obunani tahrirlash, daromad qatorini "to'landi" deb
    belgilash, barcha sinflarni ko'rish.

O'qituvchi obunani tahrirlay olmasligining sababi: status'ni qo'lda 'active' qilish —
to'lovsiz kirish berish degani va u defterda hech qanday iz qoldirmaydi.
"""
from django.contrib import admin, messages
from django.utils import timezone
from django.utils.html import format_html

from .models import (
    AIGradingQuota, MockAttempt, MockTest, Payment, PayoutEntry, Subscription,
)
from .services import PaymentError, approve_payment, format_tashkent, reject_payment, som


def _teacher_profile(request):
    """So'rov egasining o'qituvchi profili (yo'q bo'lsa None)."""
    profile = getattr(request.user, 'profile', None)
    return getattr(profile, 'teacher_profile', None)


class TeacherScopedAdmin(admin.ModelAdmin):
    """Faqat o'z sinfining qatorlarini ko'rsatadigan admin.

    `teacher_lookup` — modeldan TeacherProfile'gacha bo'lgan yo'l. Har bir voris uni
    o'zi belgilaydi, chunki yo'l har xil: Subscription'da `teacher`, MockAttempt'da
    `mock__teacher`.
    """

    teacher_lookup = 'teacher'

    def get_queryset(self, request):
        queryset = super().get_queryset(request)
        if request.user.is_superuser:
            return queryset
        teacher = _teacher_profile(request)
        if teacher is None:
            # O'qituvchi ham, superuser ham emas — hech narsa ko'rmaydi. Bo'sh ro'yxat
            # qaytarish "hammasini ko'rsatish" dan ko'ra xavfsizroq standart.
            return queryset.none()
        return queryset.filter(**{self.teacher_lookup: teacher})

    def has_view_permission(self, request, obj=None):
        if not super().has_view_permission(request, obj):
            return False
        return obj is None or self._owns(request, obj)

    def has_change_permission(self, request, obj=None):
        if not super().has_change_permission(request, obj):
            return False
        return obj is None or self._owns(request, obj)

    def has_delete_permission(self, request, obj=None):
        if not super().has_delete_permission(request, obj):
            return False
        return obj is None or self._owns(request, obj)

    def _owns(self, request, obj):
        """Bitta qator shu foydalanuvchiniki ekanini tekshiradi.

        `get_queryset` ro'yxatni filtrlaydi, lekin to'g'ridan-to'g'ri havola bilan
        (/admin/classroom/mocktest/42/change/) begona qatorga kirishga urinish ham
        bo'lishi mumkin — o'sha yo'l aynan shu yerda yopiladi.
        """
        if request.user.is_superuser:
            return True
        teacher = _teacher_profile(request)
        if teacher is None:
            return False
        return type(obj).objects.filter(pk=obj.pk, **{self.teacher_lookup: teacher}).exists()


@admin.register(Subscription)
class SubscriptionAdmin(TeacherScopedAdmin):
    """O'qituvchi o'z o'quvchilarining obunasini KO'RADI, lekin o'zgartira olmaydi:
    status'ni qo'lda 'active' qilish — pulsiz kirish berish degani."""

    teacher_lookup = 'teacher'
    list_display = ('student', 'teacher', 'price_display', 'status', 'period_display', 'created_at')
    list_filter = ('status', 'teacher')
    search_fields = ('student__user__username', 'student__user__first_name')
    readonly_fields = ('created_at', 'updated_at')
    autocomplete_fields = ('student',)

    def has_add_permission(self, request):
        return request.user.is_superuser

    def has_change_permission(self, request, obj=None):
        if not request.user.is_superuser:
            return False
        return super().has_change_permission(request, obj)

    def has_delete_permission(self, request, obj=None):
        if not request.user.is_superuser:
            return False
        return super().has_delete_permission(request, obj)

    @admin.display(description='Narx')
    def price_display(self, obj):
        return som(obj.price_tiyin)

    @admin.display(description='Davr (Toshkent)')
    def period_display(self, obj):
        return f'{format_tashkent(obj.current_period_start)} — {format_tashkent(obj.current_period_end)}'


@admin.register(Payment)
class PaymentAdmin(TeacherScopedAdmin):
    """To'lovni SINF EGASI tasdiqlaydi.

    Pul o'qituvchining hisobiga tushadi, demak chek haqiqiyligini undan boshqa hech kim
    bilmaydi — tasdiqlashni super adminga qoldirish uni har bir chek uchun o'qituvchidan
    so'rashga majbur qilardi.

    Tasdiqlash daromad defteriga qator yozadi, lekin PUL AVTOMATIK O'TKAZILMAYDI: super
    admin qatorni "to'landi" deb belgilaguncha bu shunchaki hisob, ya'ni har bir qator
    o'tkazishdan oldin bir marta ko'zdan kechiriladi.

    Ko'rish chegarasi kuchida qoladi: `TeacherScopedAdmin` so'rovni sinf bo'yicha
    filtrlaydi — o'qituvchi begona to'lovni ro'yxatda ham ko'rmaydi, to'g'ridan-to'g'ri
    havola bilan ham ocha olmaydi.
    """

    teacher_lookup = 'subscription__teacher'
    list_display = ('provider', 'reference', 'student_display', 'amount_display', 'status',
                    'receipt_link', 'created_display')
    list_filter = ('provider', 'status')
    search_fields = ('provider_transaction_id', 'subscription__student__user__username')
    readonly_fields = ('subscription', 'amount_tiyin', 'provider', 'raw_payload', 'status',
                       'reviewed_by', 'reviewed_at', 'created_at', 'updated_at', 'receipt_preview')
    fields = readonly_fields + ('provider_transaction_id', 'admin_note')
    actions = ['approve_selected', 'reject_selected']

    def has_add_permission(self, request):
        # To'lov qatori o'quvchining so'rovidan tug'iladi, admin qo'lida emas.
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    @admin.display(description='Raqam')
    def reference(self, obj):
        return obj.provider_transaction_id or '—'

    @admin.display(description="O'quvchi")
    def student_display(self, obj):
        return obj.subscription.student.user.username

    @admin.display(description='Summa')
    def amount_display(self, obj):
        return som(obj.amount_tiyin)

    @admin.display(description='Chek')
    def receipt_link(self, obj):
        if not obj.receipt:
            return '—'
        return format_html('<a href="{}" target="_blank">ochish</a>', obj.receipt.url)

    @admin.display(description='Chek')
    def receipt_preview(self, obj):
        if not obj.receipt:
            return "Chek yuklanmagan"
        return format_html('<a href="{0}" target="_blank"><img src="{0}" style="max-height:320px"></a>',
                           obj.receipt.url)

    @admin.display(description='Sana (Toshkent)', ordering='created_at')
    def created_display(self, obj):
        return format_tashkent(obj.created_at)

    @admin.action(description="Tasdiqlash (obunani faollashtiradi va daromad yozadi)")
    def approve_selected(self, request, queryset):
        # `queryset` allaqachon `get_queryset` orqali sinf bo'yicha filtrlangan: o'qituvchi
        # begona to'lovni bu amalgacha olib kela olmaydi.
        approved, failed = 0, []
        for payment in queryset:
            try:
                approve_payment(payment, reviewer=request.user)
                approved += 1
            except PaymentError as exc:
                failed.append(f'#{payment.pk}: {exc}')
        if approved:
            self.message_user(request, f"{approved} ta to'lov tasdiqlandi.")
        for problem in failed:
            self.message_user(request, problem, level=messages.WARNING)

    @admin.action(description="Rad etish")
    def reject_selected(self, request, queryset):
        rejected, failed = 0, []
        for payment in queryset:
            try:
                reject_payment(payment, reviewer=request.user)
                rejected += 1
            except PaymentError as exc:
                failed.append(f'#{payment.pk}: {exc}')
        if rejected:
            self.message_user(request, f"{rejected} ta to'lov rad etildi.")
        for problem in failed:
            self.message_user(request, problem, level=messages.WARNING)


@admin.register(PayoutEntry)
class PayoutEntryAdmin(TeacherScopedAdmin):
    teacher_lookup = 'teacher'
    list_display = ('teacher', 'net_display', 'fee_display', 'gross_display', 'status', 'created_display')
    list_filter = ('status', 'teacher')
    readonly_fields = ('teacher', 'payment', 'gross_tiyin', 'platform_fee_tiyin', 'net_tiyin',
                       'paid_at', 'created_at')
    # Yagona tahrirlanadigan narsa — qo'lda o'tkazmadan keyingi belgi va izoh.
    fields = readonly_fields + ('status', 'note')
    actions = ['mark_paid']

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    @admin.display(description="O'qituvchiga")
    def net_display(self, obj):
        return format_html('<b>{}</b>', som(obj.net_tiyin))

    @admin.display(description='Platforma')
    def fee_display(self, obj):
        return som(obj.platform_fee_tiyin)

    @admin.display(description='Jami')
    def gross_display(self, obj):
        return som(obj.gross_tiyin)

    @admin.display(description='Sana (Toshkent)')
    def created_display(self, obj):
        return format_tashkent(obj.created_at)

    @admin.action(description="Belgilangan qatorlarni 'to'landi' deb belgilash")
    def mark_paid(self, request, queryset):
        # Faqat superuser: pul o'tkazilganini o'qituvchining o'zi tasdiqlay olmaydi.
        if not request.user.is_superuser:
            self.message_user(request, "Bu amal faqat administrator uchun.", level=messages.ERROR)
            return
        updated = queryset.filter(status='accrued').update(status='paid', paid_at=timezone.now())
        self.message_user(request, f"{updated} ta qator to'landi deb belgilandi.")


@admin.register(MockTest)
class MockTestAdmin(TeacherScopedAdmin):
    teacher_lookup = 'teacher'
    list_display = ('title', 'teacher', 'subject', 'start_display', 'duration_minutes',
                    'status', 'is_free_preview', 'attempt_count')
    list_filter = ('status', 'is_free_preview', 'subject')
    search_fields = ('title',)
    readonly_fields = ('results_published_at', 'created_at', 'updated_at')

    @admin.display(description='Boshlanish (Toshkent)', ordering='scheduled_start')
    def start_display(self, obj):
        return format_tashkent(obj.scheduled_start)

    @admin.display(description='Urinishlar')
    def attempt_count(self, obj):
        return obj.attempts.count()

    def get_form(self, request, obj=None, **kwargs):
        """O'qituvchi faqat o'z test to'plamini tanlay olsin.

        Chegara formada ham kerak: `get_queryset` ro'yxatni yopadi, lekin ochiladigan
        ro'yxatda hamma to'plam turgan bo'lsa, o'qituvchi begona savollarni o'z mock'iga
        ulab olishi mumkin edi.
        """
        form = super().get_form(request, obj, **kwargs)
        teacher = _teacher_profile(request)
        if teacher is not None and not request.user.is_superuser:
            if 'teacher' in form.base_fields:
                field = form.base_fields['teacher']
                field.queryset = field.queryset.filter(pk=teacher.pk)
                field.initial = teacher.pk
            if 'test_set' in form.base_fields:
                test_field = form.base_fields['test_set']
                test_field.queryset = test_field.queryset.filter(created_by=request.user)
        return form

    def save_model(self, request, obj, form, change):
        # O'qituvchi so'rovni qo'lda o'zgartirib, mock'ni boshqa sinfga yozib qo'ymasin.
        teacher = _teacher_profile(request)
        if teacher is not None and not request.user.is_superuser:
            obj.teacher = teacher
        super().save_model(request, obj, form, change)


@admin.register(MockAttempt)
class MockAttemptAdmin(TeacherScopedAdmin):
    teacher_lookup = 'mock__teacher'
    list_display = ('student', 'mock', 'score', 'rank', 'started_display', 'submitted_display')
    list_filter = ('mock',)
    search_fields = ('student__user__username',)
    readonly_fields = ('student', 'mock', 'attempt', 'started_at', 'submitted_at', 'score',
                       'breakdown', 'rank', 'result_sent_at')

    def has_add_permission(self, request):
        return False

    @admin.display(description='Boshlandi (Toshkent)')
    def started_display(self, obj):
        return format_tashkent(obj.started_at)

    @admin.display(description='Topshirildi (Toshkent)')
    def submitted_display(self, obj):
        return format_tashkent(obj.submitted_at)


@admin.register(AIGradingQuota)
class AIGradingQuotaAdmin(admin.ModelAdmin):
    """Chegara hisobini faqat administrator ko'radi — u sinfga emas, o'quvchiga tegishli."""
    list_display = ('student', 'period', 'used', 'updated_at')
    list_filter = ('period',)
    search_fields = ('student__user__username',)
    readonly_fields = ('student', 'period', 'used', 'updated_at')

    def has_add_permission(self, request):
        return False

    def has_module_permission(self, request):
        return request.user.is_superuser
