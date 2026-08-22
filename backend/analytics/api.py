from rest_framework.decorators import api_view
from rest_framework.response import Response

from accounts.models import ensure_profile_for_user

from . import prediction, services


@api_view(['GET'])
def dashboard_api(request):
    profile = ensure_profile_for_user(request.user)
    return Response(services.dashboard_data(profile))


@api_view(['GET'])
def predicted_score_api(request):
    """Joriy DTM ball bashorati + ishonch darajasi (Feature 2).

    Har chaqiruvda qayta hisoblanadi (ma'lumot doim yangi bo'lishi uchun), lekin tarix
    kuniga bir marta yoziladi — `save_prediction` shuni ta'minlaydi.
    """
    profile = ensure_profile_for_user(request.user)
    data = prediction.predict(profile)
    if data['ready']:
        prediction.save_prediction(profile)
    return Response(data)


@api_view(['GET'])
def score_history_api(request):
    """Bashorat tarixi — progress grafigi uchun (so'nggi 30 ta nuqta)."""
    profile = ensure_profile_for_user(request.user)
    rows = profile.score_predictions.all()[:30]
    return Response({'history': [{
        'predicted_percent': r.predicted_percent,
        'predicted_dtm': r.predicted_dtm,
        'confidence': r.confidence,
        'sample_size': r.sample_size,
        'calculated_at': r.calculated_at,
    } for r in reversed(list(rows))]})


@api_view(['GET'])
def tagging_status_api(request):
    """Ichki ko'rsatkich: savollar qanchalik tag'langan. Faqat superadmin uchun."""
    profile = ensure_profile_for_user(request.user)
    if not profile.is_superadmin:
        return Response({'detail': 'Faqat administrator uchun.'}, status=403)
    return Response(prediction.tagging_status())
