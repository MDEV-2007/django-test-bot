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

    # O'quvchining so'nggi xatolari va zaif mavzularini aniqlaymiz
    weakest_topic = "XIX asr xonliklari davri"
    weakest_percentage = 42
    predicted_score = "178.4"

    if profile:
        last_attempt = Attempt.objects.filter(profile=profile, is_completed=True).order_by('-completed_at').first()
        if last_attempt:
            feedback = AIFeedback.objects.filter(attempt=last_attempt).first()
            if feedback and feedback.weak_topics:
                wt_list = [t.strip() for t in feedback.weak_topics.split(',') if t.strip()]
                if wt_list:
                    weakest_topic = wt_list[0]
            if last_attempt.score:
                weakest_percentage = int(last_attempt.score)
            if feedback and feedback.predicted_score:
                predicted_score = str(feedback.predicted_score)

    campaign = EduCenterCampaign.objects.filter(is_active=True).first()

    # Agar bazada hali kampaniya yo'q bo'lsa, seed data yaratamiz
    if not campaign:
        campaign = EduCenterCampaign.objects.create(
            center_name="Registon O'quv Markazi",
            logo="https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=120&auto=format&fit=crop&q=80",
            title="Tarix va Ona tili intensiv DTM kursi",
            description="Registon LC da 2 oylik intensiv tayyorgarlik kursi orqali qiyin mavzularda 90%+ natijaga erishing!",
            offer_badge="1-dars BEPUL + 20% chegirma",
            target_subject="Tarix",
            target_region="Toshkent",
            max_score_threshold=65,
            rating=4.9,
            story_video_url="",
            is_active=True,
        )

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
        'diagnosis': {
            'weakest_topic': weakest_topic,
            'mastery_percentage': weakest_percentage,
            'predicted_score': predicted_score,
            'target_grade': "A+ (175+ ball)",
        },
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
    phone_number = (data.get('phone_number') or "+998 90 --- -- --").strip()
    telegram_username = (data.get('telegram_username') or getattr(profile, 'telegram_username', '') or profile.user.username).strip()
    predicted_score = str(data.get('predicted_dtm_score') or "178.4")
    weakest_topics = (data.get('weakest_topics') or "XIX asr xonliklari, Xronologiya va Esse tahlili").strip()

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
