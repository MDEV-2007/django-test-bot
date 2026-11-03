import logging

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from accounts.models import ensure_profile_for_user
from b2b_ads.services import (
    LeadError,
    campaign_payload,
    has_submitted,
    pick_campaign,
    record_impression,
    submit_lead,
)
from tests_app.models import Attempt, AIFeedback

logger = logging.getLogger(__name__)


@api_view(['GET'])
@permission_classes([AllowAny])
def active_campaign_api(request):
    """Dashboarddagi O'quv Markaz Tavsiyasi: o'quvchining hududi va eng zaif faniga mos
    aktiv kampaniya hamda haqiqiy test natijasidan olingan AI diagnostika."""
    profile = ensure_profile_for_user(request.user) if request.user.is_authenticated else None

    # Diagnostika faqat haqiqiy ma'lumotdan: oxirgi yakunlangan test va AI tahlilidagi zaif mavzu.
    diagnosis = None
    if profile:
        last_attempt = Attempt.objects.filter(profile=profile, is_completed=True).order_by('-completed_at').first()
        feedback = AIFeedback.objects.filter(attempt=last_attempt).first() if last_attempt else None
        weak = [t.strip() for t in (feedback.weak_topics or '').split(',') if t.strip()] if feedback else []
        if last_attempt and last_attempt.score is not None and weak:
            diagnosis = {
                'weakest_topic': weak[0],
                'mastery_percentage': int(last_attempt.score),
                'predicted_score': str(feedback.predicted_score) if feedback.predicted_score else None,
            }

    # Kampaniya bo'lmasa reklama yo'q (soxta markaz yaratilmaydi).
    campaign = pick_campaign(profile)
    if not campaign:
        return Response({'campaign': None, 'diagnosis': diagnosis})

    record_impression(campaign)

    return Response({
        'campaign': campaign_payload(campaign),
        'diagnosis': diagnosis,
        'already_submitted': has_submitted(profile, campaign),
        'user_preview': {
            'full_name': (profile.user.get_full_name() or profile.user.first_name or profile.user.username) if profile else "",
            'telegram_username': getattr(profile, 'telegram_username', '') if profile else "",
        },
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def submit_lead_api(request):
    """O'quvchi rozilik oynasida tasdiqlagan ism va telefon bilan lid yuborish.

    Body: {campaign_id, full_name, phone_number, weakest_topics?, predicted_dtm_score?}.
    Bitta kampaniyaga bir marta +50 tanga.
    """
    profile = ensure_profile_for_user(request.user)
    data = request.data or {}
    try:
        result = submit_lead(
            profile=profile,
            campaign_id=data.get('campaign_id'),
            full_name=str(data.get('full_name') or ''),
            phone_number=str(data.get('phone_number') or ''),
            telegram_username=str(data.get('telegram_username') or ''),
            weakest_topics=str(data.get('weakest_topics') or ''),
            predicted_dtm_score=str(data.get('predicted_dtm_score') or ''),
        )
    except LeadError as exc:
        return Response({'success': False, 'error': str(exc)}, status=400)
    return Response(result)
