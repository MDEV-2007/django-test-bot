from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from accounts.models import ensure_profile_for_user
from accounts.permissions import IsSuperAdmin

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


@api_view(['POST'])
def track_event_api(request):
    """Klientdan monetizatsiya voronkasi hodisasi (paywall_view, premium_view, checkout_view).

    Faqat ruxsat etilgan nomlar va maydonlar qabul qilinadi; bitta foydalanuvchi uchun
    daqiqasiga 30 tadan ko'p yozilmaydi (spam jadvalni to'ldirmasin)."""
    from django.core.cache import cache

    from .tracking import CLIENT_EVENTS, track_event

    name = request.data.get('name')
    if name not in CLIENT_EVENTS:
        return Response({'error': "Noma'lum hodisa"}, status=400)
    profile = ensure_profile_for_user(request.user)
    key = f'evt-rate:{profile.pk}'
    cache.add(key, 0, timeout=60)
    try:
        count = cache.incr(key)
    except ValueError:  # kalit add va incr orasida muddati tugagan bo'lsa
        cache.set(key, 1, timeout=60)
        count = 1
    if count > 30:
        return Response({'ok': False, 'throttled': True}, status=429)
    props = request.data.get('props') or {}
    track_event(profile, name, **(props if isinstance(props, dict) else {}))
    return Response({'ok': True})


@api_view(['GET'])
@permission_classes([IsSuperAdmin])
def growth_metrics_api(request):
    """Super admin: DAU/WAU/MAU, haftalik kogortalar qaytishi va to'lov voronkasi."""
    from .growth import growth_metrics

    return Response(growth_metrics())
