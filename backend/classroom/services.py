"""Pul va vaqt bilan ishlashning yagona joyi.

Bu yerdagi qoidalar bir necha joyda (webhook, admin, hisobot) takrorlanmasligi kerak —
takrorlangan pul hisobi ertami-kechmi bir joyda boshqacha yaxlitlana boshlaydi.
"""
from datetime import timedelta
from zoneinfo import ZoneInfo

from django.db import transaction
from django.utils import timezone

from .models import PayoutEntry, Subscription

# Obuna davri — oylik. Kalendar oyi emas, 30 kun: "1-fevralda to'ladim, 28-fevralda
# tugadi" degan noroziliksiz va oy uzunligiga bog'liq bo'lmagan yagona qoida.
SUBSCRIPTION_PERIOD_DAYS = 30

# Ko'rsatish vaqt zonasi. Bazada hamma narsa UTC; bu faqat odam o'qiydigan joylar uchun.
DISPLAY_TZ = ZoneInfo('Asia/Tashkent')


def to_tashkent(moment):
    """UTC vaqtni Toshkent vaqtiga o'giradi (ko'rsatish uchun)."""
    if moment is None:
        return None
    return timezone.localtime(moment, DISPLAY_TZ)


def format_tashkent(moment, pattern='%d.%m.%Y %H:%M'):
    local = to_tashkent(moment)
    return local.strftime(pattern) if local else '—'


def som(tiyin):
    """Tiyinni odam o'qiydigan so'm satriga aylantiradi: 4000000 -> "40 000 so'm".

    Faqat KO'RSATISH uchun. Hisob-kitobga qaytmaydi.
    """
    if tiyin is None:
        return '—'
    whole, rest = divmod(int(tiyin), 100)
    text = f'{whole:,}'.replace(',', ' ')
    return f"{text} so'm" if rest == 0 else f"{text},{rest:02d} so'm"


def split_payment(amount_tiyin, revenue_share_percent):
    """To'lovni o'qituvchi ulushi va platforma ulushiga bo'ladi.

    Butun sonda ishlaydi va qoldiqni PLATFORMAGA qoldiradi: o'qituvchiga tegadigan qism
    pastga yaxlitlanadi, farq esa platforma ulushiga qo'shiladi. Shu tartibda
    `gross == fee + net` har doim aniq bajariladi (bazadagi CheckConstraint ham shuni
    talab qiladi) va bir tiyin ham yo'qolmaydi.

        >>> split_payment(4_000_000, 75)
        (1000000, 3000000)
        >>> split_payment(3_333_333, 75)   # qoldiq platformada qoladi
        (833334, 2499999)

    Qaytaradi: (platform_fee_tiyin, net_tiyin)
    """
    amount = int(amount_tiyin)
    if amount < 0:
        raise ValueError("Summa manfiy bo'lishi mumkin emas.")
    share = int(revenue_share_percent)
    if not 0 <= share <= 100:
        raise ValueError("Ulush 0 dan 100 gacha bo'lishi kerak.")

    net = amount * share // 100
    return amount - net, net


# ---------------------------------------------------------------------------
# To'lovni tasdiqlash — pul defterga aynan shu yerda tushadi
# ---------------------------------------------------------------------------

class PaymentError(Exception):
    """To'lovni tasdiqlab bo'lmadi (holati noto'g'ri, summasi mos emas va h.k.)."""


def _period_bounds(subscription, moment):
    """Yangi obuna davrining boshi va oxiri.

    Muddati tugamagan obuna yana to'lansa, davr OXIRIDAN davom etadi — aks holda
    o'quvchi muddatidan oldin to'lagani uchun jazolangan bo'lardi. Muddati o'tgan
    bo'lsa, hisob bugundan boshlanadi.
    """
    start = subscription.current_period_end if subscription.current_period_end and subscription.current_period_end > moment else moment
    return start, start + timedelta(days=SUBSCRIPTION_PERIOD_DAYS)


def approve_payment(payment, reviewer=None, moment=None):
    """To'lovni tasdiqlaydi: obunani uzaytiradi va daromad defteriga qator yozadi.

    IDEMPOTENT. Ikki marta chaqirilsa (admin tugmani ikki marta bosdi, yoki keyinchalik
    provayder webhook'i takrorlandi) ikkinchi chaqiruv hech narsani o'zgartirmaydi va
    MAVJUD daromad qatorini qaytaradi. Ikki barobar hisoblanish faqat kodning
    ehtiyotkorligiga tayanmaydi: `PayoutEntry.payment` OneToOne, ya'ni ikkinchi qator
    bazaning o'zi tomonidan rad etiladi.

    Hammasi bitta tranzaksiya ichida: obuna faollashib, defter qatori yozilmay qolgan
    holat — o'qituvchi puli yo'qolgani degani.
    """
    moment = moment or timezone.now()

    with transaction.atomic():
        # Qulf: shu qator ustida bir vaqtda ikkita tasdiqlash ketmasin.
        payment = type(payment).objects.select_for_update().select_related(
            'subscription__teacher').get(pk=payment.pk)

        existing = PayoutEntry.objects.filter(payment=payment).first()
        if existing is not None:
            # Allaqachon hisoblangan — takroriy chaqiruv. Xato emas, shunchaki takror.
            return existing

        if payment.status not in ('pending', 'success'):
            raise PaymentError(f"To'lov holati '{payment.get_status_display()}' — tasdiqlab bo'lmaydi.")
        if payment.amount_tiyin <= 0:
            raise PaymentError("To'lov summasi noldan katta bo'lishi kerak.")

        subscription = payment.subscription
        teacher = subscription.teacher

        fee_tiyin, net_tiyin = split_payment(payment.amount_tiyin, teacher.revenue_share_percent)
        entry = PayoutEntry.objects.create(
            teacher=teacher,
            payment=payment,
            gross_tiyin=payment.amount_tiyin,
            platform_fee_tiyin=fee_tiyin,
            net_tiyin=net_tiyin,
        )

        start, end = _period_bounds(subscription, moment)
        subscription.status = 'active'
        subscription.current_period_start = start
        subscription.current_period_end = end
        subscription.save(update_fields=['status', 'current_period_start', 'current_period_end', 'updated_at'])

        payment.status = 'success'
        payment.reviewed_by = reviewer
        payment.reviewed_at = moment
        payment.save(update_fields=['status', 'reviewed_by', 'reviewed_at', 'updated_at'])

    return entry


def reject_payment(payment, reviewer=None, note='', moment=None):
    """To'lovni rad etadi. Tasdiqlangan to'lovni rad etib bo'lmaydi.

    Nega: tasdiqlangan to'lov defterga qator yozgan va o'sha pul o'qituvchiga o'tkazilgan
    bo'lishi mumkin. Uni orqaga qaytarish — qaytarish (refund) oqimi, u esa v1 da qo'lda
    bajariladi.
    """
    moment = moment or timezone.now()

    with transaction.atomic():
        # Holat BAZADAN qayta o'qiladi. Chaqiruvchidagi nusxa eskirgan bo'lishi mumkin
        # (masalan to'lov shu orada boshqa oynada tasdiqlangan), va eskirgan nusxaga
        # ishonish tasdiqlangan to'lovni jimgina rad etib yuborardi.
        payment = type(payment).objects.select_for_update().get(pk=payment.pk)
        if payment.status == 'success':
            raise PaymentError("Tasdiqlangan to'lovni rad etib bo'lmaydi — qaytarish qo'lda bajariladi.")

        payment.status = 'rejected'
        payment.reviewed_by = reviewer
        payment.reviewed_at = moment
        payment.admin_note = note or payment.admin_note
        payment.save(update_fields=['status', 'reviewed_by', 'reviewed_at', 'admin_note', 'updated_at'])
    return payment


def has_class_access(student_profile, mock):
    """O'quvchi shu mock'ga kira oladimi.

    Bepul reklama mock'iga hamma kiradi. Qolganiga — faqat SHU o'qituvchiga faol obunasi
    borlar. Obunaning faolligi har safar qaytadan hisoblanadi (status + muddat), keshdan
    olinmaydi: muddati kecha tugagan obuna bugun ham ishlab turmasligi kerak.
    """
    if mock.is_free_preview:
        return True
    now = timezone.now()
    return Subscription.objects.filter(
        student=student_profile, teacher_id=mock.teacher_id,
        status='active', current_period_end__gt=now,
    ).exists()


# ---------------------------------------------------------------------------
# Mock jadvali: holat o'tishlari va kirish oynasi
# ---------------------------------------------------------------------------

# Kirish oynasi boshlanishidan qancha vaqt oldin sahifa "tayyorlaning" holatiga o'tadi.
# Faqat KO'RSATISH uchun: bu vaqtda ham kirish yopiq.
ENTRY_WARMUP_MINUTES = 15

# Kirishga ruxsat berilmaganda qaytadigan sabablar. Klient shu kodlarga qarab
# matn ko'rsatadi; matnning o'zi ham yuboriladi.
ENTRY_OK = 'ok'
ENTRY_DRAFT = 'draft'
ENTRY_TOO_EARLY = 'too_early'
ENTRY_TOO_LATE = 'too_late'
ENTRY_NO_SUBSCRIPTION = 'no_subscription'

ENTRY_MESSAGES = {
    ENTRY_DRAFT: "Bu mock hali e'lon qilinmagan.",
    ENTRY_TOO_EARLY: "Mock hali boshlanmadi.",
    ENTRY_TOO_LATE: "Mock tugagan — kirish oynasi yopiq.",
    ENTRY_NO_SUBSCRIPTION: "Bu mock faqat obunachilar uchun.",
}


def computed_status(mock, moment=None):
    """Mock'ning SERVER VAQTI bo'yicha haqiqiy holati.

    Bazadagi `status` ustuni keshdan boshqa narsa emas: uni kimdir yangilamaguncha
    "scheduled" bo'lib turaveradi. Kirish qarori esa hech qachon keshga tayanmasligi
    kerak, shuning uchun har bir tekshiruv shu funksiyadan o'tadi.

    Qoralama (draft) hech qachon o'z-o'zidan o'tmaydi: uni e'lon qilish — o'qituvchining
    ongli qarori.
    """
    if mock.status == 'draft':
        return 'draft'
    moment = moment or timezone.now()
    if moment < mock.scheduled_start:
        return 'scheduled'
    if moment < mock.scheduled_end:
        return 'live'
    return 'finished'


def refresh_status(mock, moment=None, save=True):
    """Bazadagi `status` ni haqiqiy holatga moslaydi va uni qaytaradi."""
    actual = computed_status(mock, moment)
    if save and actual != mock.status:
        mock.status = actual
        mock.save(update_fields=['status', 'updated_at'])
    return actual


def sync_mock_statuses(queryset=None, moment=None):
    """Barcha mock'larning holatini yangilaydi (cron uchun).

    Kirish qarori bunga bog'liq EMAS — u har doim `computed_status` orqali hisoblanadi.
    Bu funksiya faqat panel va ro'yxatlar to'g'ri ko'rinishi uchun kerak, ya'ni uni
    ishlatmaslik xavfsizlik teshigi emas, shunchaki noqulaylik.

    Qaytaradi: o'zgargan qatorlar soni.
    """
    from .models import MockTest

    moment = moment or timezone.now()
    queryset = queryset if queryset is not None else MockTest.objects.exclude(status='draft')
    changed = 0
    for mock in queryset.exclude(status='finished').only(
            'id', 'status', 'scheduled_start', 'duration_minutes'):
        actual = computed_status(mock, moment)
        if actual != mock.status:
            mock.status = actual
            mock.save(update_fields=['status', 'updated_at'])
            changed += 1
    return changed


def check_entry(student_profile, mock, moment=None):
    """O'quvchi shu paytda mock'ka kira oladimi.

    Qaytaradi: (allowed: bool, reason: str). Sabab kodini klient ham, testlar ham
    ishlatadi — "kira olmadingiz" degan yagona matn nima uchun ekanini aytmaydi.

    Tartib muhim: avval VAQT, keyin obuna. Aks holda obunasi yo'q o'quvchi tugagan
    mock uchun ham "obuna soting" degan xabar olardi.
    """
    moment = moment or timezone.now()
    status = computed_status(mock, moment)

    if status == 'draft':
        return False, ENTRY_DRAFT
    if status == 'scheduled':
        return False, ENTRY_TOO_EARLY
    if status == 'finished':
        return False, ENTRY_TOO_LATE
    if not has_class_access(student_profile, mock):
        return False, ENTRY_NO_SUBSCRIPTION
    return True, ENTRY_OK


def teacher_ids_for(student_profile):
    """O'quvchi qaysi o'qituvchilarning mock'larini ko'radi.

    Ikkita manba: (1) faol obuna, (2) referral orqali bog'langan sinf. Ikkinchisi
    kerak, chunki bepul reklama mock'i AYNAN obunasi yo'q o'quvchi uchun — u o'qituvchi
    havolasi orqali kelgan, lekin hali to'lamagan.
    """
    from .models import Subscription

    now = timezone.now()
    ids = set(
        Subscription.objects
        .filter(student=student_profile, status='active', current_period_end__gt=now)
        .values_list('teacher_id', flat=True)
    )

    link = getattr(student_profile, 'teacher_link', None)
    linked_teacher = getattr(getattr(link, 'teacher', None), 'teacher_profile', None)
    if linked_teacher is not None:
        ids.add(linked_teacher.pk)
    return ids


def visible_mocks(student_profile):
    """O'quvchiga ko'rinadigan mock'lar: o'z o'qituvchilarinikilar, qoralamalarsiz."""
    from .models import MockTest

    return (MockTest.objects
            .filter(teacher_id__in=teacher_ids_for(student_profile))
            .exclude(status='draft')
            .select_related('teacher', 'subject', 'test_set')
            .order_by('scheduled_start'))
