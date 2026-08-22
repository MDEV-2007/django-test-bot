from decimal import Decimal
from PIL import Image, UnidentifiedImageError
from .models import SubscriptionPlan

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
    """Seeds the real premium plans if missing: three lessons-subscription
    durations plus the one-time mock-test unlock. Prices are placeholders —
    edit them any time in Django admin (/admin/premium/subscriptionplan/)."""
    SubscriptionPlan.objects.get_or_create(
        name="Oylik obuna — Video va Audio darslar",
        defaults=dict(
            plan_type='lessons',
            description="Barcha video va audio darslarga 30 kunlik to'liq kirish.",
            price=Decimal('25000'),
            duration_days=30,
            order=1,
            features_list="Barcha video darslar\nBarcha audio darslar\n30 kun davomida cheklovsiz kirish",
        ),
    )
    SubscriptionPlan.objects.get_or_create(
        name="6 oylik obuna — Video va Audio darslar",
        defaults=dict(
            plan_type='lessons',
            description="Barcha video va audio darslarga 6 oylik to'liq kirish — eng ommabop tarif.",
            price=Decimal('120000'),
            duration_days=180,
            order=2,
            features_list="Barcha video darslar\nBarcha audio darslar\n6 oy davomida cheklovsiz kirish\nOylikka nisbatan tejamkor",
        ),
    )
    SubscriptionPlan.objects.get_or_create(
        name="Mock Test Tizimi — Bir martalik",
        defaults=dict(
            plan_type='mock_test',
            description="Milliy sertifikat va BBA formatidagi barcha rasmiy mock testlarga muddatsiz kirish.",
            price=Decimal('15000'),
            duration_days=0,
            order=3,
            features_list="Barcha rasmiy mock testlar\nMuddatsiz kirish\nAI natija tahlili",
        ),
    )










