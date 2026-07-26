import time
from decimal import Decimal
from django.conf import settings
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.http import FileResponse, Http404
from django.shortcuts import render, redirect, get_object_or_404
from PIL import Image, UnidentifiedImageError
from accounts.models import ensure_profile_for_user
from .models import SubscriptionPlan, Payment

# Payment screenshots are user uploads shown to admins — cap the size, and verify the
# ACTUAL bytes decode as one of these raster formats. The client-supplied Content-Type
# header used to be the only check here, but that header is just whatever the browser (or
# an attacker) claims in the multipart request — trivially spoofed. A file could be renamed/
# labeled "image/jpeg" while actually being an SVG or HTML document with an embedded
# <script>; Django's FileResponse later guesses the Content-Type from the stored filename's
# extension and serves it *inline*, so an admin clicking "view screenshot" to review a
# payment would have that script execute in their authenticated session — a stored-XSS path
# straight to admin-account compromise. Confirmed exploitable in a security review before
# this fix (an evil.svg with content_type spoofed to image/jpeg sailed through and was later
# served back as Content-Type: image/svg+xml, inline, script intact).
MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024  # 5 MB
ALLOWED_IMAGE_FORMATS = {'JPEG': ('jpg', 'image/jpeg'), 'PNG': ('png', 'image/png'), 'WEBP': ('webp', 'image/webp')}


def validate_screenshot(screenshot):
    """Returns (error_message, None) if the upload is invalid, else (None, safe_extension).

    Verifies the upload really decodes as one of ALLOWED_IMAGE_FORMATS via Pillow —
    never trusts the client-supplied Content-Type or the uploaded filename's extension.
    """
    if screenshot.size > MAX_SCREENSHOT_BYTES:
        return "Rasm hajmi juda katta (maksimal 5 MB). Kichikroq skrinshot yuklang.", None
    try:
        screenshot.seek(0)
        with Image.open(screenshot) as img:
            img.verify()
        # verify() leaves the Image object unusable for further reads — reopen fresh
        # to read the now-trusted format.
        screenshot.seek(0)
        with Image.open(screenshot) as img:
            fmt = img.format
    except (UnidentifiedImageError, OSError, ValueError):
        return "Faqat haqiqiy rasm fayllari (JPG, PNG, WEBP) qabul qilinadi.", None
    finally:
        screenshot.seek(0)
    if fmt not in ALLOWED_IMAGE_FORMATS:
        return "Faqat JPG, PNG yoki WEBP formatidagi rasmlar qabul qilinadi.", None
    return None, ALLOWED_IMAGE_FORMATS[fmt][0]


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

        error, safe_ext = validate_screenshot(screenshot)
        if error:
            messages.error(request, error)
            return redirect('premium:checkout', plan_id=plan.id)

        # Rename to a server-determined name/extension from the VERIFIED format above —
        # never store the client-supplied filename, which could carry a misleading or
        # dangerous extension of its own regardless of what the bytes actually are.
        screenshot.name = f"payment_{profile.id}_{int(time.time())}.{safe_ext}"

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

    The Content-Type is re-derived from the ACTUAL file bytes here (never trusted from
    the stored filename's extension) as a second, independent layer of defense: even a
    file that somehow predates or slipped past validate_screenshot()'s upload-time check
    can never be served back with an attacker-chosen Content-Type like image/svg+xml —
    the exact path that turned an unvalidated upload into stored XSS against whichever
    admin opened it. Anything that doesn't verify as a real JPEG/PNG/WEBP is forced to
    download (as_attachment) as generic binary instead of ever rendering inline.
    """
    payment = get_object_or_404(Payment, id=payment_id)
    is_owner = payment.profile.user_id == request.user.id
    is_staff = request.user.is_staff or getattr(getattr(request.user, 'profile', None), 'is_superadmin', False)
    if not (is_owner or is_staff):
        raise Http404
    if not payment.screenshot:
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
