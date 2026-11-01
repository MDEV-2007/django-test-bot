"""Telegram Story va Natija kartasi uchun rasmiy sertifikat rasmi.

Telegram `shareToStory` ga HAVOLA beriladi, fayl emas: rasmni Telegram serverlari o'zi
yuklab oladi. Ya'ni manzil ochiq (autentifikatsiyasiz) bo'lishi shart — Telegram
`Authorization` sarlavhasini yubormaydi.

Shu sababli manzil imzolanadi: `?sig=` HMAC-SHA256 ning birinchi 16 belgisi. Imzosiz yoki
noto'g'ri imzo bilan 404 qaytadi, ya'ni urinish id'sini birma-bir sinab boshqa
o'quvchilarning natijalarini ko'rib chiqib bo'lmaydi.

Rasm 16:9 formatidagi ultra-zamonaviy gorizontal kartochka (1200x675) bo'lib, ijtimoiy tarmoqlar,
Telegram kanallar, guruhlar va hikoyalar uchun optimal moslashtirilgan.
"""
import hashlib
import hmac
import io
import math
import os
import random

from django.conf import settings
from PIL import Image, ImageDraw, ImageFilter, ImageFont

# Gorizontal zamonaviy sertifikat kartasi o'lchami (16:9).
WIDTH, HEIGHT = 1200, 675

BG_DARK = (8, 13, 23)
BORDER_CARD = (38, 54, 78)
BORDER_SUBTLE = (26, 38, 58)

ACCENT_CYAN = (6, 182, 212)      # Cyan 500
ACCENT_EMERALD = (16, 185, 129)  # Emerald 500
ACCENT_AMBER = (245, 158, 11)    # Amber 500
ACCENT_ROSE = (244, 63, 94)      # Rose 500

TEXT_WHITE = (248, 250, 252)
TEXT_MUTED = (148, 163, 184)
TEXT_DIM = (100, 116, 139)

_FONT_BOLD_CANDIDATES = [
    '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
    '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf',
    r'C:\Windows\Fonts\segoeuib.ttf',
    r'C:\Windows\Fonts\arialbd.ttf',
]
_FONT_REGULAR_CANDIDATES = [
    '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
    '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf',
    r'C:\Windows\Fonts\segoeui.ttf',
    r'C:\Windows\Fonts\arial.ttf',
]


def _font(size, bold=True):
    for path in (_FONT_BOLD_CANDIDATES if bold else _FONT_REGULAR_CANDIDATES):
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except OSError:
                continue
    try:
        return ImageFont.load_default(size=size)
    except TypeError:
        return ImageFont.load_default()


def sign_attempt(attempt_id):
    """Urinish uchun qisqa imzo. Kalit — SECRET_KEY, ya'ni alohida sozlama kerak emas."""
    msg = f'story:{attempt_id}'.encode()
    return hmac.new(settings.SECRET_KEY.encode(), msg, hashlib.sha256).hexdigest()[:16]


def signature_ok(attempt_id, signature):
    return hmac.compare_digest(sign_attempt(attempt_id), (signature or ''))


def _text_size(draw, text, font):
    box = draw.textbbox((0, 0), text, font=font)
    return box[2] - box[0], box[3] - box[1]


def _shorten(text, limit):
    text = (text or '').strip()
    if len(text) <= limit:
        return text
    clipped = text[:limit].rsplit(' ', 1)[0]
    return (clipped or text[:limit]) + '…'


def _fit_font(draw, text, max_size, max_width, min_size=22, bold=True):
    size = max_size
    while size > min_size:
        font = _font(size, bold=bold)
        if _text_size(draw, text, font)[0] <= max_width:
            return font
        size -= 2
    return _font(min_size, bold=bold)


def render_story_png(*, score, correct, total, test_title, display_name, seed=0):
    """Gorizontal (1200x675) zamonaviy natija va yutuq sertifikatini PNG bayt sifatida qaytaradi."""
    img = Image.new('RGB', (WIDTH, HEIGHT), BG_DARK)

    # 1. Orqa fon: zamonaviy ambient neon mesh
    glow_img = Image.new('RGB', (WIDTH, HEIGHT), (0, 0, 0))
    glow_draw = ImageDraw.Draw(glow_img)

    # Natija halqasi orqasidagi zumrad/feruza yorug'lik
    glow_draw.ellipse((WIDTH - 520, 40, WIDTH + 140, 640), fill=(10, 85, 75))
    # Chap yuqoridagi yumshoq safir/safir-ko'k yorug'lik
    glow_draw.ellipse((-80, -60, 480, 440), fill=(16, 38, 85))
    # Markaziy-pastki zumrad aura
    glow_draw.ellipse((350, 400, 750, 750), fill=(8, 50, 45))
    glow_img = glow_img.filter(ImageFilter.GaussianBlur(130))
    img = Image.blend(img, glow_img, 0.75)
    draw = ImageDraw.Draw(img)

    # Nozik organik dekoratsiya (Ilm Ildizi elementlari)
    rng = random.Random(seed)
    for _ in range(12):
        bx = rng.randint(WIDTH - 380, WIDTH - 40)
        by = rng.randint(HEIGHT - 240, HEIGHT - 40)
        br = rng.randint(2, 5)
        draw.ellipse((bx - br, by - br, bx + br, by + br), fill=(20, 60, 65))

    # 2. Asosiy oynasimon karta chegarasi (Glassmorphic Outer Frame)
    mx, my = 36, 32
    cw, ch = WIDTH - (mx * 2), HEIGHT - (my * 2)
    card_rect = (mx, my, mx + cw, my + ch)

    draw.rounded_rectangle(card_rect, radius=32, fill=(13, 20, 36), outline=BORDER_CARD, width=2)
    draw.line([(mx + 40, my + 1), (mx + cw - 40, my + 1)], fill=(71, 95, 125), width=1)

    # 3. Karta ichidagi yuqori sarlavha (Header)
    header_y = my + 30
    brand_font = _font(28, bold=True)
    draw.text((mx + 36, header_y), "ILM ILDIZI", font=brand_font, fill=TEXT_WHITE)

    bw, _ = _text_size(draw, "ILM ILDIZI", brand_font)
    draw.ellipse((mx + 36 + bw + 12, header_y + 9, mx + 36 + bw + 22, header_y + 19), fill=ACCENT_EMERALD)

    # Nishon: RASMIY TEST NATIJASI
    badge_text = "RASMIY TEST NATIJASI"
    badge_font = _font(12, bold=True)
    badgew, badgeh = _text_size(draw, badge_text, badge_font)
    badge_x = mx + 36 + bw + 36
    badge_y = header_y + 2
    draw.rounded_rectangle(
        (badge_x, badge_y, badge_x + badgew + 22, badge_y + badgeh + 12),
        radius=8,
        fill=(16, 185, 129, 45),
        outline=(16, 185, 129),
        width=1,
    )
    draw.text((badge_x + 11, badge_y + 6), badge_text, font=badge_font, fill=(230, 255, 245))

    # Yuqori-o'ng Telegram bot manzili kapsulasi
    handle = "@ilmildiziuz_bot"
    handle_font = _font(15, bold=True)
    hw, hh = _text_size(draw, handle, handle_font)
    handle_x = mx + cw - 36 - hw - 26
    handle_y = header_y + 2
    draw.rounded_rectangle(
        (handle_x, handle_y, handle_x + hw + 26, handle_y + hh + 12),
        radius=14,
        fill=(22, 34, 54),
        outline=(56, 75, 105),
        width=1,
    )
    draw.text((handle_x + 13, handle_y + 6), handle, font=handle_font, fill=ACCENT_CYAN)

    # Header ostidagi gorizontal ajratuvchi chiziq
    draw.line([(mx + 36, header_y + 48), (mx + cw - 36, header_y + 48)], fill=BORDER_SUBTLE, width=1)

    # 4. Chap ustun: Test nomi, O'quvchi va Bento ko'rsatkichlar
    content_x = mx + 36
    content_top = header_y + 72

    # Imtihon toifasi
    eyebrow = "MILLIY SERTIFIKAT & BMB IMTIHON STANDARTI"
    eyebrow_font = _font(12, bold=True)
    draw.text((content_x, content_top), eyebrow, font=eyebrow_font, fill=ACCENT_CYAN)

    # Test nomi (Katta, aniq va sig'ishiga qarab masshtablanadi)
    title = test_title or "Mavzulashtirilgan Test Sinovi"
    title_font = _fit_font(draw, title, 36, 640, min_size=24, bold=True)
    tw, th = _text_size(draw, title, title_font)
    draw.text((content_x, content_top + 24), title, font=title_font, fill=TEXT_WHITE)

    # Nomzod ismi kartasi
    name = (display_name or "O'quvchi").strip()
    name_str = f"Nomzod: {name}"
    name_font = _font(20, bold=True)
    nw, nh = _text_size(draw, name_str, name_font)

    name_y = content_top + 28 + th + 14
    draw.rounded_rectangle(
        (content_x, name_y, content_x + nw + 28, name_y + nh + 12),
        radius=10,
        fill=(20, 30, 48),
        outline=BORDER_SUBTLE,
        width=1,
    )
    draw.text((content_x + 14, name_y + 6), name_str, font=name_font, fill=TEXT_WHITE)

    # 5. 3 ta gorizontal Bento ko'rsatkich kartalari
    bento_y = name_y + nh + 28
    bento_w = 200
    bento_h = 104
    gap = 18

    score_val = round(score or 0)
    grade = "A+" if score_val >= 90 else "A" if score_val >= 80 else "B+" if score_val >= 70 else "B" if score_val >= 60 else "C"
    grade_desc = "A'lo" if score_val >= 80 else "Yaxshi" if score_val >= 70 else "Qoniqarli" if score_val >= 60 else "Mashq zarur"
    grade_color = ACCENT_EMERALD if score_val >= 80 else ACCENT_AMBER if score_val >= 60 else ACCENT_ROSE

    metrics = [
        {"label": "To'g'ri javoblar", "val": f"{correct} / {total}", "color": TEXT_WHITE, "sub": "Aniqlik hisobi"},
        {"label": "O'zlashtirish", "val": f"{score_val}%", "color": ACCENT_EMERALD, "sub": "Umumiy ko'rsatkich"},
        {"label": "Baholash darajasi", "val": f"{grade}", "color": grade_color, "sub": grade_desc},
    ]

    for i, m in enumerate(metrics):
        bx = content_x + i * (bento_w + gap)
        by = bento_y
        draw.rounded_rectangle((bx, by, bx + bento_w, by + bento_h), radius=18, fill=(18, 27, 44), outline=BORDER_CARD, width=1)

        lbl_font = _font(12, bold=False)
        draw.text((bx + 16, by + 14), m["label"], font=lbl_font, fill=TEXT_DIM)

        val_font = _font(30, bold=True)
        draw.text((bx + 16, by + 36), m["val"], font=val_font, fill=m["color"])

        sub_font = _font(11, bold=False)
        draw.text((bx + 16, by + 74), m["sub"], font=sub_font, fill=TEXT_MUTED)

    # 6. O'ng ustun: Doiraviy Neon Natija Halqasi (Circular Doughnut)
    cx = mx + cw - 210
    cy = my + (ch / 2) + 20
    radius = 125

    # Halqa ostidagi neon yorug'lik
    ring_glow = Image.new('RGB', (WIDTH, HEIGHT), (0, 0, 0))
    ring_glow_draw = ImageDraw.Draw(ring_glow)
    ring_glow_draw.ellipse((cx - radius - 35, cy - radius - 35, cx + radius + 35, cy + radius + 35), fill=(16, 185, 129))
    ring_glow = ring_glow.filter(ImageFilter.GaussianBlur(55))
    img = Image.blend(img, ring_glow, 0.28)
    draw = ImageDraw.Draw(img)

    # Halqa foni
    box = (cx - radius, cy - radius, cx + radius, cy + radius)
    draw.arc(box, 0, 360, fill=(28, 42, 64), width=22)

    # Faol neon yoy
    fraction = max(0.0, min(1.0, score_val / 100))
    if fraction > 0:
        arc_color = ACCENT_EMERALD if score_val >= 70 else ACCENT_AMBER if score_val >= 50 else ACCENT_ROSE
        draw.arc(box, -90, -90 + int(360 * fraction), fill=arc_color, width=22)

    # Halqa markazidagi matn
    lbl_center = "NATIJA"
    lbl_c_font = _font(14, bold=True)
    lw, lh = _text_size(draw, lbl_center, lbl_c_font)
    draw.text((cx - lw / 2, cy - 65), lbl_center, font=lbl_c_font, fill=TEXT_MUTED)

    pct_text = f"{score_val}%"
    pct_font = _font(66, bold=True)
    pw, ph = _text_size(draw, pct_text, pct_font)
    draw.text((cx - pw / 2, cy - 36), pct_text, font=pct_font, fill=TEXT_WHITE)

    # Natija ostidagi status kapsulasi
    status_text = "MUVAFFAQIYATLI" if score_val >= 70 else "YAXSHI" if score_val >= 60 else "MASHQ ZARUR"
    status_font = _font(11, bold=True)
    sw, sh = _text_size(draw, status_text, status_font)
    sp_x = cx - sw / 2 - 12
    sp_y = cy + 46
    sp_color = ACCENT_EMERALD if score_val >= 70 else ACCENT_AMBER if score_val >= 60 else ACCENT_ROSE
    draw.rounded_rectangle((sp_x, sp_y, sp_x + sw + 24, sp_y + sh + 8), radius=7, fill=(22, 34, 54), outline=sp_color, width=1)
    draw.text((sp_x + 12, sp_y + 4), status_text, font=status_font, fill=sp_color)

    # 7. Pastki footer qatori
    footer_y = my + ch - 50
    draw.line([(mx + 36, footer_y - 12), (mx + cw - 36, footer_y - 12)], fill=BORDER_SUBTLE, width=1)

    foot_left = "ilmildizi.uz — Milliy sertifikat va BMB imtihonlariga rasmiy tayyorlov platformasi"
    foot_left_font = _font(13, bold=False)
    draw.text((mx + 36, footer_y), foot_left, font=foot_left_font, fill=TEXT_DIM)

    foot_right = "Sen ham bilimingni sinab ko'r ->"
    foot_right_font = _font(14, bold=True)
    fr_w, _ = _text_size(draw, foot_right, foot_right_font)
    draw.text((mx + cw - 36 - fr_w, footer_y - 1), foot_right, font=foot_right_font, fill=ACCENT_CYAN)

    buf = io.BytesIO()
    img.save(buf, format='PNG', optimize=True)
    return buf.getvalue()
