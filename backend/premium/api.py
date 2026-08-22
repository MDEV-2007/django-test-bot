"""JSON API mirroring premium/views.py for the Next.js frontend — see accounts/api.py for
the overall JWT-API pattern. payment_screenshot_api additionally accepts the JWT as a
`?token=` query param (see config/ws_auth.py for the same pattern on WebSockets) because a
plain <img src="..."> request from the browser can't attach an Authorization header."""
import time

from django.conf import settings
from django.http import FileResponse, Http404
from PIL import Image, UnidentifiedImageError
from rest_framework.decorators import api_view
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken

from accounts.models import ensure_profile_for_user
from .models import Payment, SubscriptionPlan
from .services import ALLOWED_IMAGE_FORMATS, seed_plans_if_needed, validate_screenshot


@api_view(['GET'])
def plans_api(request):
    seed_plans_if_needed()
    plans = SubscriptionPlan.objects.filter(is_active=True)
    profile = request.user.profile
    return Response({
        'plans': [{
            'id': p.id, 'plan_type': p.plan_type, 'name': p.name, 'description': p.description,
            'price': str(p.price), 'duration_days': p.duration_days, 'features': p.features,
        } for p in plans],
        'is_premium': profile.is_premium,
        'has_active_premium_lessons': profile.has_active_premium_lessons,
        'premium_mock_test_unlocked': profile.premium_mock_test_unlocked,
        'premium_expires_at': profile.premium_expires_at,
    })


class CheckoutAPI(APIView):
    parser_classes = [MultiPartParser]

    def post(self, request, plan_id):
        profile = ensure_profile_for_user(request.user)
        try:
            plan = SubscriptionPlan.objects.get(id=plan_id, is_active=True)
        except SubscriptionPlan.DoesNotExist:
            return Response({'error': 'Reja topilmadi.'}, status=404)

        screenshot = request.FILES.get('screenshot')
        if not screenshot:
            return Response({'error': "Iltimos, to'lov skrinshotini yuklang."}, status=400)

        error, safe_ext = validate_screenshot(screenshot)
        if error:
            return Response({'error': error}, status=400)

        screenshot.name = f"payment_{profile.id}_{int(time.time())}.{safe_ext}"
        payment = Payment.objects.create(
            profile=profile, plan=plan, amount=plan.price, status='pending', source='web',
            screenshot=screenshot, test=self._target_test(plan, request.data.get('test')),
        )
        return Response({'payment_id': payment.id})

    @staticmethod
    def _target_test(plan, test_id):
        """Mock test tarifi bitta testni ochadi — o'quvchi qaysi test kartasidan
        kelganini shu yerda bog'laymiz. Boshqa tariflarda test bog'lanmaydi."""
        if plan.plan_type != 'mock_test' or not test_id:
            return None
        from tests_app.models import TestSet
        return TestSet.objects.filter(id=test_id, is_premium=True).first()

    def get(self, request, plan_id):
        try:
            plan = SubscriptionPlan.objects.get(id=plan_id, is_active=True)
        except SubscriptionPlan.DoesNotExist:
            return Response({'error': 'Reja topilmadi.'}, status=404)
        target = self._target_test(plan, request.GET.get('test'))
        return Response({
            'plan': {'id': plan.id, 'name': plan.name, 'price': str(plan.price)},
            # Mock test tarifida qaysi test sotib olinayotgani aniq ko'rsatiladi.
            'test': {'id': target.id, 'title': target.title} if target else None,
            'card_number': settings.PREMIUM_CARD_NUMBER,
            'card_holder': settings.PREMIUM_CARD_HOLDER,
        })


def _payment_payload(payment):
    return {
        'id': payment.id, 'plan_name': payment.plan.name, 'amount': str(payment.amount),
        'test_title': payment.test.title if payment.test_id else None,
        'status': payment.status, 'created_at': payment.created_at, 'reviewed_at': payment.reviewed_at,
        'admin_note': payment.admin_note,
    }


@api_view(['GET'])
def payment_status_api(request, payment_id):
    try:
        payment = Payment.objects.select_related('plan', 'test').get(id=payment_id, profile__user=request.user)
    except Payment.DoesNotExist:
        return Response({'error': 'Topilmadi.'}, status=404)
    return Response(_payment_payload(payment))


@api_view(['GET'])
def my_payments_api(request):
    profile = ensure_profile_for_user(request.user)
    payments = Payment.objects.select_related('plan', 'test').filter(profile=profile)
    return Response({'results': [_payment_payload(p) for p in payments]})


class PaymentScreenshotAPI(APIView):
    """Auth via `?token=` (see module docstring) instead of the default header-based
    JWTAuthentication, since this is loaded as a plain <img src>."""
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request, payment_id):
        token = request.query_params.get('token')
        if not token:
            raise Http404
        try:
            auth = JWTAuthentication()
            user = auth.get_user(auth.get_validated_token(token))
        except InvalidToken:
            raise Http404

        payment = Payment.objects.filter(id=payment_id).select_related('profile__user').first()
        if not payment:
            raise Http404
        is_owner = payment.profile.user_id == user.id
        is_staff = user.is_staff or getattr(getattr(user, 'profile', None), 'is_superadmin', False)
        if not (is_owner or is_staff) or not payment.screenshot:
            raise Http404

        fh = payment.screenshot.open('rb')
        try:
            with Image.open(fh) as img:
                img.verify()
            fh.seek(0)
            with Image.open(fh) as img:
                fmt = img.format
            fh.seek(0)
        except (UnidentifiedImageError, OSError, ValueError):
            fh.seek(0)
            return FileResponse(fh, as_attachment=True, filename='screenshot.bin')

        safe_type = ALLOWED_IMAGE_FORMATS.get(fmt)
        if not safe_type:
            return FileResponse(fh, as_attachment=True, filename='screenshot.bin')
        return FileResponse(fh, content_type=safe_type[1])
