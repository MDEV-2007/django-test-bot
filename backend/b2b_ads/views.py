import logging
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from accounts.models import ensure_profile_for_user
from b2b_ads.models import EduCenterCampaign, StudentLeadSubmission, existing_lead
from telegrambot.client import send_message
from tests_app.models import Attempt, AIFeedback

logger = logging.getLogger(__name__)


@api_view(['GET'])
@permission_classes([AllowAny])
def active_campaign_api(request):
    """Dashboarddagi AI Ustoz & O'quv Markaz Tavsiyasi uchun aktiv kampaniya va AI tahlil."""
    profile = ensure_profile_for_user(request.user) if request.user.is_authenticated else None

    # Diagnostika faqat haqiqiy ma'lumotdan: o'quvchining oxirgi yakunlangan testi va
    # AI tahlilidagi zaif mavzu. Ilgari test yechmagan o'quvchiga ham "XIX asr xonliklari —
    # 42%, prognoz 178.4" qattiq yozilgan qiymatlari qaytarilardi.
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

    # Kampaniya bo'lmasa reklama yo'q. Ilgari bu yerda bazaga soxta "Registon O'quv
    # Markazi" yaratilardi va o'quvchilar mavjud bo'lmagan markazga lid yuborardi.
    campaign = EduCenterCampaign.objects.filter(is_active=True).first()
    if not campaign:
        return Response({'campaign': None, 'diagnosis': diagnosis})

    return Response({
        'campaign': {
            'id': campaign.id,
            'center_name': campaign.center_name,
            'logo': campaign.logo or "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=120&auto=format&fit=crop&q=80",
            'title': campaign.title,
            'description': campaign.description,
            'offer_badge': campaign.offer_badge,
            'target_subject': campaign.target_subject,
            'target_region': campaign.target_region,
            'rating': campaign.rating,
            'story_video_url': campaign.story_video_url,
        },
        'diagnosis': diagnosis,
        'user_preview': {
            'full_name': (profile.user.get_full_name() or profile.user.first_name or profile.user.username) if profile else "",
            'telegram_username': getattr(profile, 'telegram_username', '') if profile else "",
        }
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def submit_lead_api(request):
    """1-Click bilan O'quv Markaziga lid yuborish (+50 Tanga bonus)."""
    profile = ensure_profile_for_user(request.user)
    data = request.data or {}

    campaign_id = data.get('campaign_id')
    campaign = EduCenterCampaign.objects.filter(id=campaign_id).first() if campaign_id else EduCenterCampaign.objects.filter(is_active=True).first()

    full_name = (data.get('full_name') or profile.user.get_full_name() or profile.user.username).strip()
    phone_number = (data.get('phone_number') or '').strip()
    telegram_username = (data.get('telegram_username') or getattr(profile, 'telegram_username', '') or profile.user.username).strip()
    # Markazga faqat haqiqiy ma'lumot ketadi. Ilgari telefon bo'lmasa "+998 90 --- -- --",
    # prognoz "178.4" va o'ylab topilgan zaif mavzular yuborilardi.
    predicted_score = str(data.get('predicted_dtm_score') or '')
    weakest_topics = (data.get('weakest_topics') or '').strip()
    if len(phone_number.replace(' ', '').replace('-', '')) < 9:
        return Response({'success': False, 'error': "Iltimos, telefon raqamingizni kiriting."}, status=400)

    previous = existing_lead(profile, campaign)
    if previous:
        return Response({
            'success': True,
            'coins_earned': 0,
            'total_coins': profile.coins,
            'already_submitted': True,
            'message': "Arizangiz allaqachon yuborilgan — markaz siz bilan bog'lanadi.",
        })

    # Lidni bazaga saqlaymiz
    lead = StudentLeadSubmission.objects.create(
        student_profile=profile,
        campaign=campaign,
        full_name=full_name,
        phone_number=phone_number,
        telegram_username=telegram_username,
        predicted_dtm_score=predicted_score,
        weakest_topics=weakest_topics,
        coins_rewarded=50,
    )

    # O'quvchiga darhol +50 Ilm Tanga qo'shamiz
    profile.add_coins(50)

    # O'quv markazning Telegram Chat ID siga xabarnoma jo'natamiz
    chat_id = campaign.telegram_webhook_or_chat_id if campaign and campaign.telegram_webhook_or_chat_id else None
    if chat_id:
        tg_text = (
            f"🔥 <b>YANGI ISSIQ LID (IlmIldizi B2B)!</b>\n\n"
            f"🏢 <b>Markaz:</b> {campaign.center_name}\n"
            f"👤 <b>O'quvchi:</b> {full_name}\n"
            f"📞 <b>Telefon:</b> <code>{phone_number}</code>\n"
            f"✈️ <b>Telegram:</b> @{telegram_username}\n"
            f"🎯 <b>Prognoz DTM:</b> {predicted_score} ball\n"
            f"⚠️ <b>Zaif mavzulari:</b> {weakest_topics}\n"
            f"🎁 <b>Aksiya:</b> {campaign.offer_badge}\n"
            f"⏰ <b>Vaqt:</b> {timezone.now().strftime('%Y-%m-%d %H:%M')}\n\n"
            f"<i>O'quvchi bilan 10 daqiqada bog'lanib, 1-bepul darsga yozing!</i>"
        )
        try:
            send_message(int(chat_id), tg_text)
        except Exception as e:
            logger.warning("Failed to dispatch B2B lead to Telegram: %s", e)

    return Response({
        'success': True,
        'coins_earned': 50,
        'total_coins': profile.coins,
        'message': f"Arizangiz '{campaign.center_name if campaign else 'Oquv markaz'}' ma'muriyatiga muvaffaqiyatli yuborildi! +50 🪙 hisobingizga qo'shildi.",
    })
