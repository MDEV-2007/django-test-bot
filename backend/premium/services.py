from PIL import Image, UnidentifiedImageError

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
    """Yetishmayotgan tariflarni yaratadi (har `/api/premium/plans/` so'rovida chaqiriladi).

    MUHIM: tarif NOM bo'yicha emas, `(plan_type, duration_days)` juftligi bo'yicha
    qidiriladi — ta'rif `premium/plan_catalog.py` faylida.

    Nega: ilgari bu funksiya `get_or_create(name=...)` ishlatardi. Tarif nomi
    o'zgargan zahoti (management komanda orqali ham, admin panelda qo'lda ham) u
    tarifni "yo'q" deb hisoblab, ESKI nom, ESKI narx va eski matn bilan yangi qator
    yaratardi — natijada katalogda ikki xil narxli ikkita bir xil tarif chiqardi.
    Endi nomni bemalol o'zgartirsa bo'ladi.

    Mavjud qatorlarga TEGILMAYDI: admin panelda qo'lda qo'yilgan narx bu yerdan
    ustidan yozilmasligi kerak (mazmunni yangilash uchun `seed_premium_plans`
    komandasi bor)."""
    from .plan_catalog import sync_plans

    sync_plans(update_existing=False)










