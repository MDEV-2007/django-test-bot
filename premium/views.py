from decimal import Decimal
from django.conf import settings
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.http import FileResponse, Http404
from django.shortcuts import render, redirect, get_object_or_404
from accounts.models import ensure_profile_for_user
from .models import SubscriptionPlan, Payment

# Payment screenshots are user uploads shown to admins — cap the size and restrict
# the content type so a user can't post a huge file or a non-image (or a disguised
# script) through the payment form.
MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024  # 5 MB
ALLOWED_SCREENSHOT_TYPES = {'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'}


def validate_screenshot(screenshot):
    """Returns an error message string if the upload is invalid, else None."""
    if screenshot.size > MAX_SCREENSHOT_BYTES:
        return "Rasm hajmi juda katta (maksimal 5 MB). Kichikroq skrinshot yuklang."
    content_type = (getattr(screenshot, 'content_type', '') or '').lower()
    if content_type and content_type not in ALLOWED_SCREENSHOT_TYPES:
        return "Faqat rasm fayllari (JPG, PNG, WEBP) qabul qilinadi."
    return None


def seed_plans_if_needed():
    """Seeds the two real premium plans if none exist yet: a monthly lessons
    subscription and a one-time mock-test unlock. Prices are placeholders —
    edit them any time in Django admin (/admin/premium/subscriptionplan/)."""
    if SubscriptionPlan.objects.exists():
        return

    SubscriptionPlan.objects.create(
        plan_type='lessons',
        name="Oylik obuna — Video va Audio darslar",
        description="Barcha video va audio darslarga 30 kunlik to'liq kirish.",
        price=Decimal('25000'),
        duration_days=30,
        order=1,
        features_list="Barcha video darslar\nBarcha audio darslar\n30 kun davomida cheklovsiz kirish",
    )
    SubscriptionPlan.objects.create(
        plan_type='mock_test',
        name="Mock Test Tizimi — Bir martalik",
        description="Milliy sertifikat va BBA formatidagi barcha rasmiy mock testlarga muddatsiz kirish.",
        price=Decimal('15000'),
        duration_days=0,
        order=2,
        features_list="Barcha rasmiy mock testlar\nMuddatsiz kirish\nAI natija tahlili",
    )


@login_required
def plans(request):
    seed_plans_if_needed()
    profile = ensure_profile_for_user(request.user)
    plan_list = SubscriptionPlan.objects.filter(is_active=True)
    return render(request, 'premium/plans.html', {
        'plans': plan_list,
        'profile': profile,
    })


@login_required
def checkout(request, plan_id):
    profile = ensure_profile_for_user(request.user)
    plan = get_object_or_404(SubscriptionPlan, id=plan_id, is_active=True)

    if request.method == 'POST':
        screenshot = request.FILES.get('screenshot')
        if not screenshot:
            messages.error(request, "Iltimos, to'lov skrinshotini yuklang.")
            return redirect('premium:checkout', plan_id=plan.id)

        error = validate_screenshot(screenshot)
        if error:
            messages.error(request, error)
            return redirect('premium:checkout', plan_id=plan.id)

        payment = Payment.objects.create(
            profile=profile,
            plan=plan,
            amount=plan.price,
            status='pending',
            source='web',
            screenshot=screenshot,
        )
        messages.success(request, "To'lovingiz qabul qilindi va ko'rib chiqilmoqda. Tasdiqlangach xabar beramiz.")
        return redirect('premium:payment_status', payment_id=payment.id)

    return render(request, 'premium/checkout.html', {
        'plan': plan,
        'profile': profile,
        'card_number': settings.PREMIUM_CARD_NUMBER,
        'card_holder': settings.PREMIUM_CARD_HOLDER,
    })


@login_required
def payment_status(request, payment_id):
    payment = get_object_or_404(Payment, id=payment_id, profile__user=request.user)
    return render(request, 'premium/payment_status.html', {'payment': payment, 'profile': payment.profile})


@login_required
def my_payments(request):
    profile = ensure_profile_for_user(request.user)
    payments = Payment.objects.filter(profile=profile)
    return render(request, 'premium/my_payments.html', {'payments': payments, 'profile': profile})


@login_required
def payment_screenshot(request, payment_id):
    """Serves a payment screenshot only to its owner or to staff.

    Payment screenshots are financial documents — they must not be reachable through
    the open MEDIA_URL by anyone who guesses the path. This gate replaces direct
    <img src="{{ payment.screenshot.url }}"> links across the panels.
    """
    payment = get_object_or_404(Payment, id=payment_id)
    is_owner = payment.profile.user_id == request.user.id
    is_staff = request.user.is_staff or getattr(getattr(request.user, 'profile', None), 'is_superadmin', False)
    if not (is_owner or is_staff):
        raise Http404
    if not payment.screenshot:
        raise Http404
    return FileResponse(payment.screenshot.open('rb'))
