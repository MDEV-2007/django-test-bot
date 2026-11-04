"""Ads Manager API — /api/v1/advertiser/...

Faqat mavjud modellar ustida: `core.EducationCenter` (advertiser), `EduCenterCampaign`,
`StudentLeadSubmission`, `AdEvent`, `AdCreative`. Har bir endpoint backendda egalikni
tekshiradi (`IsApprovedAdvertiser` + `center=request.ad_center` filtri); frontend
marshrut himoyasiga tayanilmaydi.

Narx/billing modeli yo'q: spend, CPL va pul byudjeti hech qayerda hisoblanmaydi
(`None` qaytadi, UI "N/A" ko'rsatadi). "Byudjet" — lid limiti (`max_leads`).
"""
from __future__ import annotations

import csv
import io
import logging
from datetime import date, datetime, timedelta

from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Count, Q
from django.db.models.functions import TruncDate
from django.http import HttpResponse
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from rest_framework.decorators import api_view, parser_classes, permission_classes
from rest_framework.parsers import JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from b2b_ads.advertiser import IsApprovedAdvertiser, audit, center_for, lead_row
from b2b_ads.models import AdCreative, AdEvent, EduCenterCampaign, StudentLeadSubmission

logger = logging.getLogger(__name__)

MAX_RANGE_DAYS = 366
IMAGE_MAX_BYTES = 5 * 1024 * 1024
VIDEO_MAX_BYTES = 50 * 1024 * 1024
AUDIENCE_MIN_BUCKET = 50  # bundan kichik segment soni oshkor qilinmaydi (k-anonimlik)
LEAD_STATUSES = {'NEW', 'CONTACTED', 'ENROLLED', 'REJECTED'}
ANY_TARGET = 'ALL'

# Tasdiqlangan kampaniyada shu maydonlar o'zgarsa kampaniya qayta moderatsiyaga tushadi
# (o'quvchilarga ko'rinadigan kontent yoki nishonlash). Muddat, lid limiti — yo'q.
REVIEWED_FIELDS = {
    'title', 'description', 'offer_badge', 'cta_text', 'objective', 'target_subject',
    'target_region', 'max_score_threshold', 'logo', 'banner_url', 'story_video_url',
}


# ─── Yordamchilar ──────────────────────────────────────────────────────────────

def _bad(message, status=400, **extra):
    return Response({'error': message, **extra}, status=status)


def _parse_day(raw):
    if not raw:
        return None
    try:
        return date.fromisoformat(str(raw)[:10])
    except ValueError:
        return None


def _date_range(request):
    """?from=YYYY-MM-DD&to=YYYY-MM-DD (ikkalasi ham kiritiladi). Sukut — oxirgi 30 kun."""
    today = timezone.localdate()
    end = _parse_day(request.GET.get('to')) or today
    start = _parse_day(request.GET.get('from')) or (end - timedelta(days=29))
    if start > end:
        start, end = end, start
    if (end - start).days > MAX_RANGE_DAYS:
        start = end - timedelta(days=MAX_RANGE_DAYS)
    return start, end


def _iso(dt):
    return dt.isoformat() if dt else None


def _rate(num, den):
    return round(num / den * 100, 2) if den else None


def _campaigns_qs(center):
    return (EduCenterCampaign.objects.filter(center=center)
            .annotate(leads_total=Count('leads', distinct=True),
                      enrolled_total=Count('leads', filter=Q(leads__status='ENROLLED'), distinct=True)))


def _get_campaign(request, pk):
    return _campaigns_qs(request.ad_center).filter(pk=pk).first()


def _campaign_row(c, detail=False):
    leads = getattr(c, 'leads_total', None)
    if leads is None:
        leads = c.leads.count()
    enrolled = getattr(c, 'enrolled_total', None)
    if enrolled is None:
        enrolled = c.leads.filter(status='ENROLLED').count()
    impressions = c.impressions_count or 0
    clicks = c.clicks_count or 0
    row = {
        'id': c.id,
        'title': c.title,
        'status': c.lifecycle_status(leads_count=leads),
        'review_status': c.review_status,
        'review_note': c.review_note if c.review_status == 'rejected' else '',
        'is_active': c.is_active,
        'objective': c.objective,
        'target_subject': c.target_subject,
        'target_region': c.target_region,
        'starts_at': _iso(c.starts_at),
        'ends_at': _iso(c.ends_at),
        'max_leads': c.max_leads,
        'banner_url': c.banner_url,
        'logo': c.logo,
        'created_at': _iso(c.created_at),
        'updated_at': _iso(c.updated_at),
        'ended_manually_at': _iso(c.ended_manually_at),
        # Umrbod jami (haqiqiy hodisalar). Sana bo'yicha — /analytics/.
        'metrics': {
            'impressions': impressions,
            'clicks': clicks,
            'ctr': _rate(clicks, impressions),
            'leads': leads,
            'enrolled': enrolled,
            'conversion_rate': _rate(enrolled, leads),
            'remaining_leads': max(0, c.max_leads - leads) if c.max_leads is not None else None,
            'spend': None,
            'cpl': None,
        },
    }
    if detail:
        row.update({
            'description': c.description,
            'offer_badge': c.offer_badge,
            'cta_text': c.cta_text,
            'max_score_threshold': c.max_score_threshold,
            'story_video_url': c.story_video_url,
            'telegram_chat_id': c.telegram_webhook_or_chat_id,
            'submitted_at': _iso(c.submitted_at),
            'reviewed_at': _iso(c.reviewed_at),
        })
    return row


def _center_row(center):
    return {
        'id': center.id,
        'name': center.name,
        'status': center.status,
        'review_note': center.review_note if center.status in ('rejected', 'suspended') else '',
        'city_or_region': center.city_or_region,
        'phone': center.phone,
        'contact_name': center.contact_name,
        'contact_email': center.contact_email,
        'website': center.website,
        'description': center.description,
        'logo_url': center.logo_url,
        'telegram_username': center.telegram_username,
        'telegram_chat_id': center.telegram_chat_id,
        'notify_new_leads': center.notify_new_leads,
        'created_at': _iso(center.created_at),
        'reviewed_at': _iso(center.reviewed_at),
    }


def _user_row(user):
    return {'id': user.id, 'username': user.username, 'first_name': user.first_name,
            'last_name': user.last_name, 'email': user.email}


def _clean_text(value, max_len):
    return str(value or '').strip()[:max_len]


# ─── Ariza (onboarding) va profil ─────────────────────────────────────────────

def _apply_rate_limited(request):
    ip = (request.META.get('HTTP_X_FORWARDED_FOR', '').split(',')[0].strip()
          or request.META.get('REMOTE_ADDR', ''))
    key = f"ads_apply:{ip}"
    count = cache.get(key, 0) or 0
    if count >= 5:
        return True
    cache.set(key, count + 1, 60 * 60)
    return False


@api_view(['POST'])
@permission_classes([AllowAny])
def apply_api(request):
    """Advertiser arizasi. Kirgan foydalanuvchi — o'z hisobi bilan; aks holda yangi hisob
    yaratiladi. Markaz `pending` holatda yaratiladi: Super Admin tasdiqlamaguncha hech
    qanday reklama imkoniyati yo'q. Oddiy o'quvchiga avtomatik ruxsat berilmaydi."""
    if _apply_rate_limited(request):
        return _bad("Juda ko'p urinish. Birozdan so'ng qayta urinib ko'ring.", status=429)
    data = request.data or {}
    name = _clean_text(data.get('center_name'), 200)
    phone = _clean_text(data.get('phone'), 50)
    region = _clean_text(data.get('city_or_region'), 100)
    contact_name = _clean_text(data.get('contact_name'), 150)
    if len(name) < 2 or not phone or not region or not contact_name:
        return _bad("Markaz nomi, hudud, mas'ul shaxs va telefon majburiy.")
    from b2b_ads.services import normalize_uz_phone
    norm_phone = normalize_uz_phone(phone)
    if norm_phone is None:
        return _bad("Telefon raqamini +998 XX XXX XX XX formatida kiriting.")
    if data.get('accept_terms') is not True:
        return _bad("Reklama qoidalariga rozilik bering.")

    tokens = None
    with transaction.atomic():
        if request.user.is_authenticated:
            user = request.user
        else:
            username = _clean_text(data.get('username'), 150)
            password = str(data.get('password') or '')
            if len(username) < 3 or ' ' in username:
                return _bad("Login kamida 3 ta belgidan iborat va bo'sh joysiz bo'lsin.")
            if User.objects.filter(username__iexact=username).exists():
                return _bad("Bu login band.")
            try:
                validate_password(password, user=User(username=username, first_name=contact_name))
            except ValidationError as exc:
                from accounts.api import _password_error_uz
                return _bad(' '.join(_password_error_uz(e) for e in exc.error_list))
            user = User.objects.create_user(
                username=username, password=password, first_name=contact_name[:150],
                email=_clean_text(data.get('contact_email'), 254),
            )
            from accounts.models import ensure_profile_for_user
            ensure_profile_for_user(user)
            from accounts.api import _tokens_for
            tokens = _tokens_for(user)

        from core.models import EducationCenter
        if EducationCenter.objects.filter(owner=user).exists():
            return _bad("Bu hisobda allaqachon markaz arizasi bor.")
        center = EducationCenter.objects.create(
            name=name, owner=user, status='pending', phone=norm_phone, city_or_region=region,
            contact_name=contact_name, contact_email=_clean_text(data.get('contact_email'), 254),
            website=_clean_text(data.get('website'), 300), description=_clean_text(data.get('description'), 2000),
            telegram_username=_clean_text(data.get('telegram_username'), 100).lstrip('@'),
            is_verified=False,
        )
    audit(user, 'create', 'EducationCenter', center.pk, f"Advertiser arizasi: {center.name}")
    payload = {'success': True, 'center': _center_row(center), 'user': _user_row(user)}
    if tokens:
        payload.update(tokens)
    return Response(payload, status=201)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me_api(request):
    """Kabinet holati: markaz yo'q (ariza kerak) / pending / approved / rejected / suspended."""
    center = center_for(request.user)
    return Response({'user': _user_row(request.user), 'center': _center_row(center) if center else None})


PROFILE_FIELDS = {
    'city_or_region': 100, 'phone': 50, 'contact_name': 150, 'contact_email': 254, 'website': 300,
    'description': 2000, 'telegram_username': 100, 'telegram_chat_id': 100,
}


@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def profile_api(request):
    center = center_for(request.user)
    if center is None:
        return _bad("Markaz topilmadi.", status=404)
    if request.method == 'GET':
        return Response({'center': _center_row(center)})
    if center.status == 'suspended':
        return _bad("Hisob to'xtatilgan — ma'lumotlarni o'zgartirib bo'lmaydi.", status=403)
    data = request.data or {}
    changes = {}
    for field, max_len in PROFILE_FIELDS.items():
        if field in data:
            value = _clean_text(data.get(field), max_len)
            if field == 'phone':
                from b2b_ads.services import normalize_uz_phone
                value = normalize_uz_phone(value)
                if value is None:
                    return _bad("Telefon raqami noto'g'ri.")
            if field == 'telegram_username':
                value = value.lstrip('@')
            if field == 'telegram_chat_id' and value and not value.lstrip('-').isdigit():
                return _bad("Telegram chat ID faqat raqam bo'lishi kerak (masalan: -1001234567890).")
            if getattr(center, field) != value:
                changes[field] = [getattr(center, field), value]
                setattr(center, field, value)
    if 'notify_new_leads' in data:
        value = data.get('notify_new_leads') is True
        if center.notify_new_leads != value:
            changes['notify_new_leads'] = [center.notify_new_leads, value]
            center.notify_new_leads = value
    if changes:
        center.save()
        audit(request.user, 'update', 'EducationCenter', center.pk, f"Markaz profili: {center.name}", changes)
    return Response({'center': _center_row(center)})


# ─── Kampaniyalar ─────────────────────────────────────────────────────────────

def _target_options():
    from tests_app.models import Subject
    subjects = sorted(Subject.objects.values_list('name', flat=True))
    return subjects


def _resolve_creative(center, raw, kind):
    """Kampaniyaga faqat SHU markaz yuklagan creative ulanadi. None — maydon tozalanadi."""
    if raw in (None, '', 0):
        return ''
    try:
        creative = AdCreative.objects.get(pk=int(raw), center=center)
    except (AdCreative.DoesNotExist, TypeError, ValueError):
        raise ValueError("Creative topilmadi.")
    if creative.kind != kind:
        raise ValueError("Creative turi mos emas.")
    return creative.file.url


def _apply_campaign_fields(campaign, data, center):
    """So'rovdagi maydonlarni tekshirib kampaniyaga yozadi. Qaytaradi: o'zgargan maydonlar."""
    changed = set()

    def put(field, value):
        if getattr(campaign, field) != value:
            setattr(campaign, field, value)
            changed.add(field)

    if 'title' in data:
        title = _clean_text(data.get('title'), 255)
        if len(title) < 3:
            raise ValueError("Sarlavha kamida 3 ta belgi bo'lsin.")
        put('title', title)
    if 'description' in data:
        put('description', _clean_text(data.get('description'), 2000))
    if 'offer_badge' in data:
        put('offer_badge', _clean_text(data.get('offer_badge'), 100))
    if 'cta_text' in data:
        put('cta_text', _clean_text(data.get('cta_text'), 60))
    if 'objective' in data:
        objective = str(data.get('objective') or '')
        if objective not in dict(EduCenterCampaign.OBJECTIVE_CHOICES):
            raise ValueError("Maqsad noto'g'ri.")
        put('objective', objective)
    if 'target_subject' in data:
        subject = _clean_text(data.get('target_subject'), 100) or ANY_TARGET
        if subject != ANY_TARGET and subject not in _target_options():
            raise ValueError("Bunday fan platformada yo'q.")
        put('target_subject', subject)
    if 'target_region' in data:
        put('target_region', _clean_text(data.get('target_region'), 100) or ANY_TARGET)
    if 'max_score_threshold' in data:
        try:
            threshold = int(data.get('max_score_threshold'))
        except (TypeError, ValueError):
            raise ValueError("Ball chegarasi 0–100 oralig'ida bo'lsin.")
        if not 0 <= threshold <= 100:
            raise ValueError("Ball chegarasi 0–100 oralig'ida bo'lsin.")
        put('max_score_threshold', threshold)
    for field in ('starts_at', 'ends_at'):
        if field in data:
            raw = data.get(field)
            value = parse_datetime(raw) if raw else None
            if raw and value is None:
                raise ValueError("Sana formati noto'g'ri.")
            if value is not None and timezone.is_naive(value):
                value = timezone.make_aware(value)
            put(field, value)
    if campaign.starts_at and campaign.ends_at and campaign.ends_at <= campaign.starts_at:
        raise ValueError("Tugash vaqti boshlanishdan keyin bo'lsin.")
    if 'max_leads' in data:
        raw = data.get('max_leads')
        if raw in (None, ''):
            put('max_leads', None)
        else:
            try:
                value = int(raw)
            except (TypeError, ValueError):
                raise ValueError("Lid limiti butun son bo'lsin.")
            if value < 1 or value > 100000:
                raise ValueError("Lid limiti 1 dan 100 000 gacha.")
            put('max_leads', value)
    if 'banner_creative_id' in data:
        put('banner_url', _resolve_creative(center, data.get('banner_creative_id'), 'image'))
    if 'logo_creative_id' in data:
        put('logo', _resolve_creative(center, data.get('logo_creative_id'), 'image'))
    if 'video_creative_id' in data:
        put('story_video_url', _resolve_creative(center, data.get('video_creative_id'), 'video'))
    if 'telegram_chat_id' in data:
        chat = _clean_text(data.get('telegram_chat_id'), 100)
        if chat and not chat.lstrip('-').isdigit():
            raise ValueError("Telegram chat ID faqat raqam bo'lishi kerak.")
        put('telegram_webhook_or_chat_id', chat)
    return changed


@api_view(['GET', 'POST'])
@permission_classes([IsApprovedAdvertiser])
@parser_classes([JSONParser])
def campaigns_api(request):
    center = request.ad_center
    if request.method == 'POST':
        campaign = EduCenterCampaign(
            center=center, center_name=center.name, review_status='draft', is_active=True,
            target_subject=ANY_TARGET, target_region=ANY_TARGET, max_score_threshold=100,
            offer_badge='', logo=center.logo_url or '', rating=0,
            telegram_webhook_or_chat_id=center.telegram_chat_id or '',
        )
        try:
            _apply_campaign_fields(campaign, request.data or {}, center)
        except ValueError as exc:
            return _bad(str(exc))
        if not campaign.title:
            return _bad("Sarlavha majburiy.")
        campaign.save()
        audit(request.user, 'create', 'EduCenterCampaign', campaign.pk, f"Qoralama: {campaign.title}")
        return Response({'campaign': _campaign_row(_get_campaign(request, campaign.pk), detail=True)}, status=201)

    qs = _campaigns_qs(center).order_by('-created_at')
    q = (request.GET.get('q') or '').strip()
    if q:
        qs = qs.filter(Q(title__icontains=q) | Q(description__icontains=q))
    rows = [_campaign_row(c) for c in qs[:500]]
    status_filter = request.GET.get('status')
    summary = {}
    for row in rows:
        summary[row['status']] = summary.get(row['status'], 0) + 1
    if status_filter:
        rows = [r for r in rows if r['status'] == status_filter]
    return Response({'campaigns': rows, 'summary': summary, 'total': len(rows)})


@api_view(['GET', 'PATCH'])
@permission_classes([IsApprovedAdvertiser])
@parser_classes([JSONParser])
def campaign_detail_api(request, pk):
    campaign = _get_campaign(request, pk)
    if campaign is None:
        return _bad("Kampaniya topilmadi.", status=404)
    if request.method == 'GET':
        return Response({'campaign': _campaign_row(campaign, detail=True)})

    if campaign.ended_manually_at:
        return _bad("Yakunlangan kampaniyani tahrirlab bo'lmaydi. Nusxa oling.", status=409)
    if campaign.review_status == 'pending_review':
        return _bad("Kampaniya ko'rib chiqilmoqda — natijani kuting.", status=409)
    with transaction.atomic():
        locked = EduCenterCampaign.objects.select_for_update().get(pk=campaign.pk)
        try:
            changed = _apply_campaign_fields(locked, request.data or {}, request.ad_center)
        except ValueError as exc:
            return _bad(str(exc))
        if changed:
            note = ''
            if locked.review_status == 'approved' and changed & REVIEWED_FIELDS:
                # O'quvchiga ko'rinadigan kontent o'zgardi — qayta moderatsiya.
                locked.review_status = 'pending_review'
                locked.submitted_at = timezone.now()
                note = "Kontent o'zgardi — kampaniya qayta ko'rib chiqishga yuborildi."
            elif locked.review_status == 'rejected':
                locked.review_status = 'draft'
            locked.save()
            audit(request.user, 'update', 'EduCenterCampaign', locked.pk, f"Kampaniya: {locked.title}",
                  {'fields': sorted(changed)})
        else:
            note = ''
    return Response({'campaign': _campaign_row(_get_campaign(request, pk), detail=True), 'message': note})


def _lifecycle_action(request, pk, action):
    campaign = _get_campaign(request, pk)
    if campaign is None:
        return _bad("Kampaniya topilmadi.", status=404)
    if campaign.ended_manually_at and action != 'duplicate':
        return _bad("Kampaniya yakunlangan.", status=409)
    now = timezone.now()
    with transaction.atomic():
        c = EduCenterCampaign.objects.select_for_update().get(pk=campaign.pk)
        before = c.lifecycle_status()
        if action == 'submit':
            if c.review_status not in ('draft', 'rejected'):
                return _bad("Faqat qoralama yoki rad etilgan kampaniya yuboriladi.", status=409)
            missing = []
            if not c.title:
                missing.append('sarlavha')
            if not c.description:
                missing.append('tavsif')
            if not (c.banner_url or c.logo):
                missing.append('banner yoki logo')
            if missing:
                return _bad("To'ldirilmagan: " + ', '.join(missing))
            if c.ends_at and c.ends_at <= now:
                return _bad("Tugash vaqti o'tib ketgan.")
            c.review_status = 'pending_review'
            c.submitted_at = now
            c.review_note = ''
        elif action == 'pause':
            if c.review_status != 'approved' or not c.is_active:
                return _bad("Faqat faol yoki rejalashtirilgan kampaniya to'xtatiladi.", status=409)
            c.is_active = False
        elif action == 'resume':
            if c.review_status != 'approved' or c.is_active:
                return _bad("Faqat to'xtatilgan kampaniya davom ettiriladi.", status=409)
            c.is_active = True
        elif action == 'end':
            c.ended_manually_at = now
            c.is_active = False
        elif action == 'duplicate':
            copy = EduCenterCampaign(
                center=c.center, center_name=c.center_name, review_status='draft', is_active=True,
                title=f"{c.title} (nusxa)"[:255], description=c.description, offer_badge=c.offer_badge,
                cta_text=c.cta_text, objective=c.objective, target_subject=c.target_subject,
                target_region=c.target_region, max_score_threshold=c.max_score_threshold,
                logo=c.logo, banner_url=c.banner_url, story_video_url=c.story_video_url,
                telegram_webhook_or_chat_id=c.telegram_webhook_or_chat_id, max_leads=c.max_leads, rating=0,
            )
            copy.save()
            audit(request.user, 'create', 'EduCenterCampaign', copy.pk, f"Nusxa: {copy.title}",
                  {'source': c.pk})
            return Response({'campaign': _campaign_row(_get_campaign(request, copy.pk), detail=True)}, status=201)
        c.save()
    audit(request.user, 'update', 'EduCenterCampaign', c.pk, f"Kampaniya: {c.title}",
          {'action': action, 'status': [before, c.lifecycle_status()]})
    return Response({'campaign': _campaign_row(_get_campaign(request, pk), detail=True)})


@api_view(['POST'])
@permission_classes([IsApprovedAdvertiser])
def campaign_submit_api(request, pk):
    return _lifecycle_action(request, pk, 'submit')


@api_view(['POST'])
@permission_classes([IsApprovedAdvertiser])
def campaign_pause_api(request, pk):
    return _lifecycle_action(request, pk, 'pause')


@api_view(['POST'])
@permission_classes([IsApprovedAdvertiser])
def campaign_resume_api(request, pk):
    return _lifecycle_action(request, pk, 'resume')


@api_view(['POST'])
@permission_classes([IsApprovedAdvertiser])
def campaign_end_api(request, pk):
    return _lifecycle_action(request, pk, 'end')


@api_view(['POST'])
@permission_classes([IsApprovedAdvertiser])
def campaign_duplicate_api(request, pk):
    return _lifecycle_action(request, pk, 'duplicate')


# ─── Creative'lar ─────────────────────────────────────────────────────────────

IMAGE_FORMATS = {'JPEG': 'jpg', 'PNG': 'png', 'WEBP': 'webp'}
VIDEO_TYPES = {'mp4': 'video/mp4', 'webm': 'video/webm'}


def _creative_row(creative, used_by=None):
    return {
        'id': creative.id,
        'kind': creative.kind,
        'url': creative.file.url,
        'original_name': creative.original_name,
        'size_bytes': creative.size_bytes,
        'width': creative.width,
        'height': creative.height,
        'created_at': _iso(creative.created_at),
        'used_by': used_by if used_by is not None else [],
    }


def _validate_image(upload):
    from PIL import Image, UnidentifiedImageError
    if upload.size > IMAGE_MAX_BYTES:
        raise ValueError("Rasm 5 MB dan oshmasin.")
    try:
        img = Image.open(upload)
        fmt = img.format
        width, height = img.size
        img.verify()
    except (UnidentifiedImageError, OSError, SyntaxError):
        raise ValueError("Fayl rasm emas yoki buzilgan.")
    if fmt not in IMAGE_FORMATS:
        raise ValueError("Faqat JPG, PNG yoki WEBP.")
    if width < 200 or height < 100 or width > 6000 or height > 6000:
        raise ValueError("Rasm o'lchami 200×100 dan 6000×6000 gacha bo'lsin.")
    upload.seek(0)
    return IMAGE_FORMATS[fmt], width, height


def _validate_video(upload):
    if upload.size > VIDEO_MAX_BYTES:
        raise ValueError("Video 50 MB dan oshmasin.")
    head = upload.read(16)
    upload.seek(0)
    if head[4:8] == b'ftyp':
        return 'mp4'
    if head[:4] == b'\x1a\x45\xdf\xa3':
        return 'webm'
    raise ValueError("Faqat MP4 yoki WEBM video.")


def _campaign_usage(center):
    usage = {}
    for c in EduCenterCampaign.objects.filter(center=center).only('id', 'title', 'banner_url', 'logo', 'story_video_url'):
        for url in {c.banner_url, c.logo, c.story_video_url}:
            if url:
                usage.setdefault(url, []).append({'id': c.id, 'title': c.title})
    return usage


@api_view(['GET', 'POST'])
@permission_classes([IsApprovedAdvertiser])
@parser_classes([MultiPartParser, JSONParser])
def creatives_api(request):
    center = request.ad_center
    if request.method == 'GET':
        usage = _campaign_usage(center)
        rows = [_creative_row(c, usage.get(c.file.url, [])) for c in AdCreative.objects.filter(center=center)[:300]]
        return Response({'creatives': rows, 'limits': {
            'image_max_bytes': IMAGE_MAX_BYTES, 'video_max_bytes': VIDEO_MAX_BYTES,
            'image_formats': list(IMAGE_FORMATS.values()), 'video_formats': list(VIDEO_TYPES),
        }})

    upload = request.FILES.get('file')
    kind = request.data.get('kind')
    if upload is None or kind not in ('image', 'video'):
        return _bad("Fayl va turi (image/video) kerak.")
    if AdCreative.objects.filter(center=center).count() >= 300:
        return _bad("Creative'lar soni chegarasi (300) to'lgan.")
    try:
        if kind == 'image':
            ext, width, height = _validate_image(upload)
        else:
            ext = _validate_video(upload)
            width = height = None
    except ValueError as exc:
        return _bad(str(exc))
    import secrets
    from django.core.files.base import File
    creative = AdCreative(center=center, kind=kind, original_name=str(upload.name)[:200],
                          size_bytes=upload.size, width=width, height=height)
    # Fayl nomi klientdan olinmaydi (yo'l/kengaytma bilan o'ynash mumkin emas).
    creative.file.save(f"c{center.pk}_{secrets.token_hex(8)}.{ext}", File(upload), save=False)
    creative.save()
    audit(request.user, 'create', 'AdCreative', creative.pk, f"Creative yuklandi: {creative.original_name}")
    return Response({'creative': _creative_row(creative)}, status=201)


@api_view(['DELETE'])
@permission_classes([IsApprovedAdvertiser])
def creative_delete_api(request, pk):
    creative = AdCreative.objects.filter(pk=pk, center=request.ad_center).first()
    if creative is None:
        return _bad("Creative topilmadi.", status=404)
    if _campaign_usage(request.ad_center).get(creative.file.url):
        return _bad("Bu creative kampaniyada ishlatilmoqda.", status=409)
    creative.file.delete(save=False)
    creative.delete()
    audit(request.user, 'delete', 'AdCreative', pk, "Creative o'chirildi")
    return Response({'success': True})


# ─── Auditoriya ───────────────────────────────────────────────────────────────

def _bucket(n):
    """Aniq son emas — pastga yaxlitlangan. Kichik segment soni oshkor qilinmaydi."""
    if n < AUDIENCE_MIN_BUCKET:
        return None
    step = 50 if n < 1000 else 500
    return n - (n % step)


@api_view(['GET'])
@permission_classes([IsApprovedAdvertiser])
def audiences_api(request):
    """Mavjud nishonlash segmentlari: fan, hudud, natija chegarasi. Faqat agregat va
    yaxlitlangan soni; alohida o'quvchini ajratib bo'ladigan filtr yo'q, sezgir
    shaxsiy xususiyatlar (yosh, jins, sog'liq va h.k.) bo'yicha nishonlash yo'q."""
    cached = cache.get('ads_audiences_v1')
    if cached is not None:
        return Response(cached)
    from accounts.models import Profile
    since = timezone.now() - timedelta(days=30)
    active = Profile.objects.filter(role='student', last_seen_at__gte=since)
    total = active.count()
    regions = []
    for row in (active.exclude(region='').values('region').annotate(n=Count('id')).order_by('-n')[:40]):
        size = _bucket(row['n'])
        if size is not None:
            regions.append({'value': row['region'], 'approx_size': size})
    payload = {
        'active_students_30d': _bucket(total),
        'subjects': [{'value': s} for s in _target_options()],
        'regions': regions,
        'any_value': ANY_TARGET,
        'score_threshold': {
            'min': 0, 'max': 100,
            'help': "Ads faqat oxirgi testlarda shu foizdan past natija olgan o'quvchilarga ko'rsatiladi.",
        },
        'placements': [
            {'value': 'feed', 'label': 'Lenta (feed) banneri', 'available': True},
            {'value': 'dashboard', 'label': "Bosh sahifa tavsiya kartasi", 'available': True},
        ],
        'min_bucket': AUDIENCE_MIN_BUCKET,
    }
    cache.set('ads_audiences_v1', payload, 60 * 30)
    return Response(payload)


# ─── Lidlar (CRM) ─────────────────────────────────────────────────────────────

def _leads_qs(request):
    qs = (StudentLeadSubmission.objects.filter(campaign__center=request.ad_center)
          .select_related('campaign').order_by('-created_at'))
    params = request.GET
    if params.get('campaign'):
        qs = qs.filter(campaign_id=params.get('campaign'))
    if params.get('status') in LEAD_STATUSES:
        qs = qs.filter(status=params.get('status'))
    start, end = _parse_day(params.get('from')), _parse_day(params.get('to'))
    if start:
        qs = qs.filter(created_at__date__gte=start)
    if end:
        qs = qs.filter(created_at__date__lte=end)
    q = (params.get('q') or '').strip()
    if q:
        # Qidiruv faqat roziligi bor lidlar shaxsiy maydonlarida — aks holda maskalangan
        # telefonni qidiruv orqali "taxmin qilib" topish mumkin bo'lardi.
        consented = Q(consent_at__isnull=False, guardian_confirmed=True)
        qs = qs.filter(consented & (Q(full_name__icontains=q) | Q(phone_number__icontains=q)
                                    | Q(telegram_username__icontains=q)))
    return qs


@api_view(['GET'])
@permission_classes([IsApprovedAdvertiser])
def leads_api(request):
    qs = _leads_qs(request)
    try:
        page = max(1, int(request.GET.get('page', 1)))
    except ValueError:
        page = 1
    size = 50
    total = qs.count()
    rows = [lead_row(lead) for lead in qs[(page - 1) * size: page * size]]
    counts = dict(StudentLeadSubmission.objects.filter(campaign__center=request.ad_center)
                  .values_list('status').annotate(n=Count('id')))
    return Response({'leads': rows, 'total': total, 'page': page, 'page_size': size,
                     'status_counts': {s: counts.get(s, 0) for s in sorted(LEAD_STATUSES)}})


@api_view(['GET'])
@permission_classes([IsApprovedAdvertiser])
def lead_detail_api(request, pk):
    lead = (StudentLeadSubmission.objects.filter(pk=pk, campaign__center=request.ad_center)
            .select_related('campaign').first())
    if lead is None:
        return _bad("Lid topilmadi.", status=404)
    return Response({'lead': lead_row(lead, detail=True)})


@api_view(['POST'])
@permission_classes([IsApprovedAdvertiser])
def lead_status_api(request, pk):
    new_status = str(request.data.get('status') or '').upper()
    note = request.data.get('note')
    if new_status and new_status not in LEAD_STATUSES:
        return _bad("Status: NEW, CONTACTED, ENROLLED yoki REJECTED.")
    with transaction.atomic():
        lead = (StudentLeadSubmission.objects.select_for_update()
                .filter(pk=pk, campaign__center=request.ad_center).first())
        if lead is None:
            return _bad("Lid topilmadi.", status=404)
        changes = {}
        if new_status and new_status != lead.status:
            changes['status'] = [lead.status, new_status]
            lead.status = new_status
            lead.status_changed_at = timezone.now()
        if note is not None:
            note = _clean_text(note, 2000)
            if note != lead.note:
                changes['note'] = 'updated'
                lead.note = note
        if changes:
            lead.save(update_fields=['status', 'status_changed_at', 'note'])
    if changes:
        audit(request.user, 'update', 'StudentLeadSubmission', lead.pk, f"Lid #{lead.pk}", changes)
    lead.campaign  # select_related bilan yuklangan
    return Response({'lead': lead_row(lead, detail=True)})


@api_view(['GET'])
@permission_classes([IsApprovedAdvertiser])
def leads_export_api(request):
    """CSV — FAQAT roziligi bor lidlar (rozilik yo'q lidlar umuman kiritilmaydi). Har bir
    eksport audit jurnaliga yoziladi. `?confirm=1` majburiy (UI tasdiq oynasidan keyin)."""
    if request.GET.get('confirm') != '1':
        return _bad("Eksportni tasdiqlang.")
    qs = _leads_qs(request).filter(consent_at__isnull=False, guardian_confirmed=True)[:5000]
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(['id', 'created_at', 'campaign', 'full_name', 'phone', 'telegram', 'status'])
    count = 0
    for lead in qs:
        writer.writerow([lead.id, timezone.localtime(lead.created_at).strftime('%Y-%m-%d %H:%M'),
                         lead.campaign.title if lead.campaign else '', lead.full_name,
                         lead.phone_number, lead.telegram_username, lead.status])
        count += 1
    audit(request.user, 'update', 'StudentLeadSubmission', '', f"Lidlar CSV eksporti ({count} ta)",
          {'export': count, 'filters': {k: v for k, v in request.GET.items() if k != 'confirm'}})
    response = HttpResponse('﻿' + buf.getvalue(), content_type='text/csv; charset=utf-8')
    response['Content-Disposition'] = f'attachment; filename="leads-{timezone.localdate().isoformat()}.csv"'
    response['Cache-Control'] = 'no-store'
    return response


# ─── Dashboard va analitika ───────────────────────────────────────────────────

def _period_metrics(campaign_ids, start, end):
    events = AdEvent.objects.filter(campaign_id__in=campaign_ids, day__gte=start, day__lte=end)
    impressions = events.filter(event='impression').count()
    reach = events.filter(event='impression').values('user_id').distinct().count()
    clicks = events.filter(event='click').count()
    leads_qs = StudentLeadSubmission.objects.filter(
        campaign_id__in=campaign_ids, created_at__date__gte=start, created_at__date__lte=end)
    leads = leads_qs.count()
    enrolled = leads_qs.filter(status='ENROLLED').count()
    return {
        'impressions': impressions,
        'reach': reach,
        'clicks': clicks,
        'ctr': _rate(clicks, impressions),
        'leads': leads,
        'enrolled': enrolled,
        'conversion_rate': _rate(enrolled, leads),
        'spend': None,
        'cpl': None,
    }


def _daily_series(campaign_ids, start, end):
    days = {}
    cursor = start
    while cursor <= end:
        days[cursor] = {'date': cursor.isoformat(), 'impressions': 0, 'reach': 0, 'clicks': 0, 'leads': 0, 'enrolled': 0}
        cursor += timedelta(days=1)
    base = AdEvent.objects.filter(campaign_id__in=campaign_ids, day__gte=start, day__lte=end)
    for row in base.values('day', 'event').annotate(n=Count('id'), users=Count('user_id', distinct=True)):
        bucket = days.get(row['day'])
        if bucket is None:
            continue
        if row['event'] == 'impression':
            bucket['impressions'] = row['n']
            bucket['reach'] = row['users']
        else:
            bucket['clicks'] = row['n']
    leads = (StudentLeadSubmission.objects.filter(campaign_id__in=campaign_ids,
                                                  created_at__date__gte=start, created_at__date__lte=end)
             .annotate(d=TruncDate('created_at')).values('d')
             .annotate(n=Count('id'), e=Count('id', filter=Q(status='ENROLLED'))))
    for row in leads:
        bucket = days.get(row['d'])
        if bucket is not None:
            bucket['leads'] = row['n']
            bucket['enrolled'] = row['e']
    return list(days.values())


def _tracking_since():
    first = AdEvent.objects.order_by('day').values_list('day', flat=True).first()
    return first.isoformat() if first else None


@api_view(['GET'])
@permission_classes([IsApprovedAdvertiser])
def dashboard_api(request):
    center = request.ad_center
    start, end = _date_range(request)
    campaigns = list(_campaigns_qs(center))
    ids = [c.id for c in campaigns]
    rows = [_campaign_row(c) for c in campaigns]
    status_summary = {}
    for row in rows:
        status_summary[row['status']] = status_summary.get(row['status'], 0) + 1
    remaining = [r['metrics']['remaining_leads'] for r in rows
                 if r['status'] in ('active', 'scheduled', 'paused') and r['metrics']['remaining_leads'] is not None]
    recent_leads = (StudentLeadSubmission.objects.filter(campaign__center=center)
                    .select_related('campaign').order_by('-created_at')[:8])
    top = sorted(rows, key=lambda r: (r['metrics']['leads'], r['metrics']['impressions']), reverse=True)[:5]
    return Response({
        'range': {'from': start.isoformat(), 'to': end.isoformat()},
        'center': _center_row(center),
        'totals': _period_metrics(ids, start, end),
        'active_campaigns': status_summary.get('active', 0),
        'status_summary': status_summary,
        'remaining_leads': sum(remaining) if remaining else None,
        'series': _daily_series(ids, start, end),
        'recent_leads': [lead_row(l) for l in recent_leads],
        'top_campaigns': top,
        'tracking_since': _tracking_since(),
        'billing_available': False,
    })


@api_view(['GET'])
@permission_classes([IsApprovedAdvertiser])
def analytics_api(request):
    center = request.ad_center
    start, end = _date_range(request)
    campaigns = list(EduCenterCampaign.objects.filter(center=center).order_by('-created_at'))
    selected = request.GET.get('campaign')
    ids = [c.id for c in campaigns]
    if selected:
        try:
            selected_id = int(selected)
        except ValueError:
            return _bad("campaign noto'g'ri.")
        if selected_id not in ids:
            return _bad("Kampaniya topilmadi.", status=404)
        ids = [selected_id]
    comparison = []
    for c in campaigns:
        if selected and c.id not in ids:
            continue
        comparison.append({'id': c.id, 'title': c.title, 'status': c.lifecycle_status(),
                           **_period_metrics([c.id], start, end)})
    return Response({
        'range': {'from': start.isoformat(), 'to': end.isoformat()},
        'totals': _period_metrics(ids, start, end),
        'series': _daily_series(ids, start, end),
        'comparison': comparison,
        'tracking_since': _tracking_since(),
        'definitions': {
            'impression': "Reklama ekranda kamida 50% hajmda 1 soniya ko'ringan; foydalanuvchi+kampaniya+kun bo'yicha 1 marta.",
            'reach': "Tanlangan davrda reklamani ko'rgan noyob foydalanuvchilar.",
            'click': "CTA bosilgan; foydalanuvchi+kampaniya+kun bo'yicha 1 marta.",
            'ctr': 'clicks / impressions × 100',
            'conversion_rate': "ENROLLED lidlar / barcha lidlar × 100",
            'cpl': "Billing yo'q — hisoblanmaydi.",
        },
    })


@api_view(['GET'])
@permission_classes([IsApprovedAdvertiser])
def billing_api(request):
    return Response({
        'available': False,
        'reason': "To'lov tizimi reklama uchun hali ulanmagan. Kampaniyalar uchun pul yechilmaydi.",
        'budget_model': 'lead_cap',
        'budget_help': "Kampaniya byudjeti hozircha lid limiti bilan cheklanadi: limitga yetganda kampaniya avtomatik to'xtaydi.",
    })
