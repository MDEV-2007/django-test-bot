"""Ads Manager (ads.ilmildizi.uz) uchun advertiser qatlami: ruxsat, egalik va lid maxfiyligi.

Advertiser = `core.EducationCenter.owner`. Kabinetga kirish uchun markaz statusi
`approved` bo'lishi shart. Har bir queryset shu markazga cheklanadi — boshqa
advertiserning obyekti so'ralsa 404 qaytadi (mavjudligi ham oshkor bo'lmaydi).
"""
from __future__ import annotations

import logging

from rest_framework.permissions import BasePermission

logger = logging.getLogger(__name__)


def center_for(user):
    """Foydalanuvchiga tegishli markaz (status qanday bo'lishidan qat'i nazar) yoki None."""
    if not getattr(user, 'is_authenticated', False):
        return None
    from core.models import EducationCenter
    return EducationCenter.objects.filter(owner=user).order_by('id').first()


class IsApprovedAdvertiser(BasePermission):
    """Faqat tasdiqlangan markaz egasi. `request.ad_center` ga markazni qo'yib qo'yadi."""
    message = "Reklama kabinetiga kirish uchun markazingiz tasdiqlangan bo'lishi kerak."

    def has_permission(self, request, view):
        center = center_for(request.user)
        if center is None or not center.is_approved:
            return False
        request.ad_center = center
        return True


def audit(user, action, model_name, object_id, object_repr, changes=None):
    """Advertiser amallari uchun audit yozuvi (Super Admin audit jurnalida ko'rinadi)."""
    from panel.models import AuditLog
    try:
        AuditLog.objects.create(
            user=user if getattr(user, 'is_authenticated', False) else None,
            action=action, model_name=model_name, object_id=str(object_id),
            object_repr=str(object_repr)[:300], changes=changes or {},
        )
    except Exception:
        logger.exception("AuditLog yozilmadi: %s %s", model_name, object_id)


# ─── Lid maxfiyligi ────────────────────────────────────────────────────────────

def lead_pii_allowed(lead) -> bool:
    """Telefon, Telegram va to'liq ism faqat o'quvchi aniq rozilik bergan va
    18+ / ota-ona roziligini tasdiqlagan lidlarda ko'rsatiladi."""
    return bool(lead.consent_at) and bool(lead.guardian_confirmed)


def mask_phone(phone: str) -> str:
    digits = ''.join(ch for ch in (phone or '') if ch.isdigit())
    if len(digits) < 4:
        return '***'
    return f"+{digits[:3]} ** *** ** {digits[-2:]}"


def mask_name(name: str) -> str:
    parts = [p for p in (name or '').split() if p]
    if not parts:
        return '—'
    return ' '.join(p[0] + '***' for p in parts)


def lead_row(lead, detail=False) -> dict:
    """Advertiserga ko'rsatiladigan lid. O'quvchining ichki identifikatorlari (profil id,
    username) HECH QACHON qaytarilmaydi."""
    allowed = lead_pii_allowed(lead)
    row = {
        'id': lead.id,
        'campaign_id': lead.campaign_id,
        'campaign_title': lead.campaign.title if lead.campaign else '',
        'full_name': lead.full_name if allowed else mask_name(lead.full_name),
        'phone_number': lead.phone_number if allowed else mask_phone(lead.phone_number),
        'telegram_username': (lead.telegram_username or '') if allowed else '',
        'pii_visible': allowed,
        'status': lead.status,
        'created_at': lead.created_at.isoformat(),
        'status_changed_at': lead.status_changed_at.isoformat() if lead.status_changed_at else None,
    }
    if detail:
        row.update({
            'weakest_topics': lead.weakest_topics if allowed else '',
            'predicted_dtm_score': lead.predicted_dtm_score if allowed else '',
            'consent_at': lead.consent_at.isoformat() if lead.consent_at else None,
            'guardian_confirmed': lead.guardian_confirmed,
            'note': lead.note,
        })
    return row
