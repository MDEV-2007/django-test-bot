"""B2B o'quv markaz kampaniyalari va lidlari — yagona manba (single source of truth).

Kampaniyalar faqat `b2b_ads.EduCenterCampaign` da saqlanadi. `core.TargetedCampaign` /
`core.CenterLead` eski modellar: ularni hech qaysi endpoint ishlatmaydi va bazada yozuv
yo'q, shuning uchun bu yerda qo'llab-quvvatlanmaydi. Ikkala API (`/api/v1/b2b/...` va
`/api/v1/system/ads/...`) shu modul orqali ishlaydi.
"""
import logging
import re

from django.db import transaction
from django.db.models import Avg, F, Q
from django.utils import timezone

from accounts.models import Profile
from b2b_ads.models import EduCenterCampaign, StudentLeadSubmission

logger = logging.getLogger(__name__)

LEAD_REWARD_COINS = 50
DEFAULT_LOGO = "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=120&auto=format&fit=crop&q=80"
_ANY_REGION = ('ALL', 'Onlayn', 'Barchasi')


class LeadError(Exception):
    """Lidni qabul qilib bo'lmaydi (foydalanuvchiga ko'rsatiladigan xabar bilan)."""


def normalize_uz_phone(raw: str) -> str | None:
    """'+998 90 123-45-67', '998901234567', '901234567' -> '+998901234567'. Noto'g'ri bo'lsa None."""
    digits = re.sub(r'\D', '', raw or '')
    if len(digits) == 9:
        digits = '998' + digits
    if len(digits) != 12 or not digits.startswith('998'):
        return None
    return '+' + digits


def weakest_subject_for(profile: Profile | None) -> tuple[str, float]:
    """O'quvchining oxirgi 20 ta testidagi eng past o'rtacha natijali fani: (fan nomi, foiz)."""
    if profile is None:
        return '', 0.0
    from tests_app.models import Attempt

    recent_ids = list(
        Attempt.objects.filter(profile=profile, is_completed=True, score__isnull=False)
        .order_by('-completed_at')
        .values_list('id', flat=True)[:20]
    )
    if not recent_ids:
        return '', 0.0
    row = (
        Attempt.objects.filter(id__in=recent_ids, test__subject__isnull=False)
        .values('test__subject__name')
        .annotate(avg=Avg('score'))
        .order_by('avg')
        .first()
    )
    if not row:
        return '', 0.0
    return row['test__subject__name'] or '', float(row['avg'] or 0.0)


def pick_campaign(profile: Profile | None, subject: str = '', score: float = 0.0, region: str = ''):
    """Hudud + zaif fan bo'yicha eng mos aktiv kampaniya (yoki None).

    Har bir filtr faqat natija bo'sh qolmasa qo'llanadi: mos kampaniya bo'lmasa ham
    umumiy aktiv kampaniya ko'rsatiladi, lekin mosi bo'lsa — aynan u tanlanadi.
    """
    user_region = (region or (getattr(profile, 'region', '') if profile else '') or '').strip()
    if not subject:
        subject, weak_score = weakest_subject_for(profile)
        score = score or weak_score

    qs = live_campaigns()

    if user_region:
        region_q = Q(target_region__iexact=user_region)
        for any_region in _ANY_REGION:
            region_q |= Q(target_region__iexact=any_region)
        qs_geo = qs.filter(region_q)
        if qs_geo.exists():
            qs = qs_geo

    if subject:
        qs_sub = qs.filter(Q(target_subject__icontains=subject) | Q(target_subject__iexact='ALL'))
        if qs_sub.exists():
            qs = qs_sub

    if score > 0:
        qs_score = qs.filter(max_score_threshold__gte=int(score))
        if qs_score.exists():
            qs = qs_score

    return qs.first()


def live_campaigns():
    """Hozir ko'rsatish mumkin bo'lgan kampaniyalar: faol, muddati ichida va lid limiti
    (byudjeti) tugamagan. Tugagan / to'xtatilgan kampaniya hech qayerda ko'rsatilmaydi."""
    from django.db.models import Count
    now = timezone.now()
    return (EduCenterCampaign.objects.filter(is_active=True)
            .filter(Q(starts_at__isnull=True) | Q(starts_at__lte=now))
            .filter(Q(ends_at__isnull=True) | Q(ends_at__gt=now))
            .annotate(_leads=Count('leads'))
            .filter(Q(max_leads__isnull=True) | Q(_leads__lt=F('max_leads'))))


def campaign_payload(campaign: EduCenterCampaign) -> dict:
    return {
        'id': campaign.id,
        'center_name': campaign.center_name,
        'logo': campaign.logo or DEFAULT_LOGO,
        'title': campaign.title,
        'description': campaign.description,
        'offer_badge': campaign.offer_badge,
        'target_subject': campaign.target_subject,
        'target_region': campaign.target_region,
        'rating': campaign.rating,
        'story_video_url': campaign.story_video_url,
        # Reklama ekanligi UI'da aniq ko'rsatilishi uchun.
        'is_sponsored': True,
        'sponsored_label': 'Reklama',
    }


TRACK_EVENTS = {'impression': 'impressions_count', 'click': 'clicks_count'}


def track_event(campaign: EduCenterCampaign, event: str, user_id: int) -> bool:
    """Haqiqiy ko'rsatish / bosish hodisasi. Bir foydalanuvchi + kampaniya + kun uchun
    bir marta sanaladi (sahifani yangilash, takroriy va parallel so'rovlar, bot bosishlari
    hisobni sun'iy oshirmasin). Qaytaradi: hisoblandimi.

    Ilgari impression reklama API'si har chaqirilganda (prefetch, anonim so'rov ham)
    oshirilardi; click umuman yozilmasdi."""
    from django.core.cache import cache
    field = TRACK_EVENTS[event]
    key = f"b2b_track:{event}:{campaign.pk}:{user_id}:{timezone.localdate().isoformat()}"
    if not cache.add(key, 1, 26 * 60 * 60):
        return False
    EduCenterCampaign.objects.filter(pk=campaign.pk).update(**{field: F(field) + 1})
    return True


def campaign_metrics(campaign: EduCenterCampaign, leads_count: int, enrolled_count: int) -> dict:
    """Faqat haqiqiy hodisalardan hisoblanadigan ko'rsatkichlar. Narx/byudjet (so'm) modeli
    yo'q — shuning uchun spent / CPL / remaining budget soxta raqam bilan to'ldirilmaydi."""
    impressions = campaign.impressions_count or 0
    clicks = campaign.clicks_count or 0
    return {
        'impressions': impressions,
        'clicks': clicks,
        'ctr': round(clicks / impressions * 100, 2) if impressions else None,
        'leads': leads_count,
        'lead_rate': round(leads_count / clicks * 100, 2) if clicks else None,
        'enrolled': enrolled_count,
        'conversion_rate': round(enrolled_count / leads_count * 100, 2) if leads_count else None,
        'reach': None,
        'spent': None,
        'cpl': None,
        'remaining_leads': (max(0, campaign.max_leads - leads_count) if campaign.max_leads is not None else None),
    }


def server_lead_diagnosis(profile: Profile) -> tuple[str, str]:
    """(zaif mavzular, prognoz ball) — faqat serverdagi haqiqiy natijalardan."""
    from tests_app.models import AIFeedback, Attempt
    last = Attempt.objects.filter(profile=profile, is_completed=True).order_by('-completed_at').first()
    feedback = AIFeedback.objects.filter(attempt=last).first() if last else None
    topics = (feedback.weak_topics or '') if feedback else ''
    if not topics:
        subject, _ = weakest_subject_for(profile)
        topics = subject
    predicted = str(feedback.predicted_score) if feedback and feedback.predicted_score else ''
    return topics[:1000], predicted[:50]


def has_submitted(profile: Profile | None, campaign: EduCenterCampaign | None) -> bool:
    if profile is None or campaign is None:
        return False
    return StudentLeadSubmission.objects.filter(student_profile=profile, campaign=campaign).exists()


def _notify_center(lead_id: int) -> None:
    """Markazning Telegram chatiga lid xabari (fon vazifasi: so'rovni ushlab turmaydi)."""
    from telegrambot.client import send_message

    lead = StudentLeadSubmission.objects.select_related('campaign').filter(pk=lead_id).first()
    if lead is None or lead.campaign is None:
        return
    campaign = lead.campaign
    chat_id = (campaign.telegram_webhook_or_chat_id or '').strip()
    if not chat_id:
        return
    tg_handle = f"@{lead.telegram_username}" if lead.telegram_username else "—"
    text = (
        f"🔥 <b>YANGI LID (IlmIldizi B2B)</b>\n\n"
        f"🏢 <b>Markaz:</b> {campaign.center_name}\n"
        f"👤 <b>O'quvchi:</b> {lead.full_name}\n"
        f"📞 <b>Telefon:</b> <code>{lead.phone_number}</code>\n"
        f"✈️ <b>Telegram:</b> {tg_handle}\n"
        f"📚 <b>Zaif mavzu:</b> {lead.weakest_topics or '—'}\n"
        f"🎯 <b>Prognoz DTM:</b> {lead.predicted_dtm_score or '—'}\n"
        f"🎁 <b>Aksiya:</b> {campaign.offer_badge}\n"
        f"⏰ <b>Vaqt:</b> {timezone.localtime(lead.created_at).strftime('%Y-%m-%d %H:%M')}\n\n"
        f"<i>O'quvchi bepul sinov darsi uchun bog'lanishga rozilik berdi.</i>"
    )
    try:
        send_message(int(chat_id) if chat_id.lstrip('-').isdigit() else chat_id, text)
    except Exception as exc:
        logger.warning("B2B lead %s Telegram xabari yuborilmadi: %s", lead_id, exc)


def submit_lead(
    profile: Profile,
    campaign_id,
    full_name: str,
    phone_number: str,
    telegram_username: str = '',
    weakest_topics: str = '',
    predicted_dtm_score: str = '',
    consent: bool = False,
) -> dict:
    """O'quvchi tasdiqlagan ism va telefon bilan lid yaratadi.

    - Telefon markazga faqat aniq rozilik (`consent=True`) bilan uzatiladi.
    - Zaif mavzu va prognoz ball klientdan olinmaydi: serverdagi haqiqiy natijalardan
      (`weakest_topics`/`predicted_dtm_score` argumentlari e'tiborsiz — eski klientlar uchun).
    - Kampaniya qatori qulflanadi: parallel lidlar lid limitidan (byudjetdan) oshmaydi.

    Bitta kampaniyaga bitta lid va bir marta +50 tanga. Profil qatori qulflanadi, shuning
    uchun bir vaqtda kelgan ikki so'rov ikkinchi lid / ikkinchi mukofot yarata olmaydi.
    """
    if consent is not True:
        raise LeadError("Ma'lumotlaringizni markazga yuborishga rozilik bering.")
    phone = normalize_uz_phone(phone_number)
    if phone is None:
        raise LeadError("Telefon raqamini +998 XX XXX XX XX formatida kiriting.")
    name = (full_name or '').strip()[:200]
    if len(name) < 2:
        raise LeadError("Ism-familiyangizni kiriting.")

    try:
        campaign_pk = int(campaign_id)
    except (TypeError, ValueError):
        raise LeadError("Kampaniya topilmadi.")
    if not EduCenterCampaign.objects.filter(pk=campaign_pk).exists():
        raise LeadError("Kampaniya topilmadi.")

    weakest_topics, predicted_dtm_score = server_lead_diagnosis(profile)

    with transaction.atomic():
        campaign = EduCenterCampaign.objects.select_for_update().get(pk=campaign_pk)
        locked = Profile.objects.select_for_update().get(pk=profile.pk)
        lead = StudentLeadSubmission.objects.filter(student_profile=locked, campaign=campaign).first()
        if lead is not None:
            return {
                'success': True,
                'already_submitted': True,
                'coins_earned': 0,
                'total_coins': locked.coins,
                'lead_id': lead.id,
                'message': "Arizangiz allaqachon yuborilgan — markaz siz bilan bog'lanadi.",
            }
        if campaign.lifecycle_status() != 'active':
            raise LeadError("Bu taklif endi faol emas.")

        lead = StudentLeadSubmission.objects.create(
            student_profile=locked,
            campaign=campaign,
            full_name=name,
            phone_number=phone,
            telegram_username=(telegram_username or locked.telegram_username or '').lstrip('@')[:100],
            predicted_dtm_score=(predicted_dtm_score or '')[:50],
            weakest_topics=(weakest_topics or '')[:1000],
            coins_rewarded=LEAD_REWARD_COINS,
            consent_at=timezone.now(),
        )
        Profile.objects.filter(pk=locked.pk).update(coins=F('coins') + LEAD_REWARD_COINS)
        locked.refresh_from_db(fields=['coins'])

        from core import background
        lead_id = lead.id
        transaction.on_commit(lambda: background.submit(_notify_center, lead_id))

    return {
        'success': True,
        'already_submitted': False,
        'coins_earned': LEAD_REWARD_COINS,
        'total_coins': locked.coins,
        'lead_id': lead.id,
        'message': f"✅ Arizangiz qabul qilindi! +{LEAD_REWARD_COINS} 🪙 hisobingizga qo'shildi",
    }
