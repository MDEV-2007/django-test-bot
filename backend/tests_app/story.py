"""Telegram Story uchun natija rasmi.

Telegram `shareToStory` ga HAVOLA beriladi, fayl emas: rasmni Telegram serverlari o'zi
yuklab oladi. Ya'ni manzil ochiq (autentifikatsiyasiz) bo'lishi shart — Telegram
`Authorization` sarlavhasini yubormaydi.

Shu sababli manzil imzolanadi: `?sig=` HMAC-SHA256 ning birinchi 16 belgisi. Imzosiz yoki
noto'g'ri imzo bilan 404 qaytadi, ya'ni urinish id'sini birma-bir sinab boshqa
o'quvchilarning natijalarini ko'rib chiqib bo'lmaydi.

Rasm butunlay kod bilan chiziladi (tashqi rasm fayli yo'q): fonda platformaning ildiz
belgisi — pastdan o'sib chiqqan daraxt va uning ildizi, natija esa halqa ichida.
"""
import hashlib
import hmac
import io
import math
import os
import random

from django.conf import settings
from PIL import Image, ImageDraw, ImageFilter, ImageFont

# Telegram Story tavsiya etadigan o'lcham (9:16).
WIDTH, HEIGHT = 1080, 1920

BG_TOP = (6, 12, 14)
BG_BOTTOM = (9, 20, 22)
SURFACE = (18, 24, 28)
ACCENT = (45, 212, 191)
ACCENT_DEEP = (13, 148, 136)
TEXT = (240, 244, 245)
MUTED = (150, 163, 168)

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
    """Tizimda mavjud birinchi shriftni oladi.

    Zaxira yo'l — Pillow'ning ichki shrifti, lekin endi `size` bilan chaqiriladi: shriftsiz
    muhitda ham matn o'qishga yaroqli kattalikda chiqadi. Ilgari u har doim ~11px bo'lib,
    butun rasmni yaroqsiz qilardi. Obrazga DejaVu o'rnatiladi — qarang: Dockerfile.
    """
    for path in (_FONT_BOLD_CANDIDATES if bold else _FONT_REGULAR_CANDIDATES):
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except OSError:
                continue
    try:
        return ImageFont.load_default(size=size)
    except TypeError:      # Pillow < 10.1
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


def _centered(draw, y, text, font, fill):
    """Matnni gorizontal markazga qo'yadi; `y` — matn tepasining koordinatasi."""
    width, _ = _text_size(draw, text, font)
    draw.text(((WIDTH - width) / 2, y), text, font=font, fill=fill)


def _shorten(text, limit):
    """Uzun matnni so'z chegarasida qisqartiradi.

    So'z o'rtasidan kesish ism-familiyani ("Murodulla Ismoilov Baxtiyoro") xunuk qiladi;
    ko'p nuqta esa matn davomi borligini ochiq bildiradi.
    """
    text = (text or '').strip()
    if len(text) <= limit:
        return text
    clipped = text[:limit].rsplit(' ', 1)[0]
    return (clipped or text[:limit]) + '…'


def _fit(draw, text, size, max_width, bold=True):
    """Matn belgilangan kenglikka sig'guncha shriftni kichraytiradi.

    Test nomlari uzun bo'ladi ("Amir Temur imperiyasi va davlat boshqaruvi"); kichraytirish
    nomni butun saqlaydi, kesib tashlashdan ko'ra tushunarliroq.
    """
    while size > 26:
        font = _font(size, bold=bold)
        if _text_size(draw, text, font)[0] <= max_width:
            return font
        size -= 4
    return _font(size, bold=bold)


def _background():
    """Vertikal gradient va uning ustida yumshoq zumrad yorug'lik."""
    img = Image.new('RGB', (WIDTH, HEIGHT), BG_TOP)
    draw = ImageDraw.Draw(img)
    for y in range(HEIGHT):
        t = y / HEIGHT
        draw.line([(0, y), (WIDTH, y)],
                  fill=tuple(round(BG_TOP[i] + (BG_BOTTOM[i] - BG_TOP[i]) * t) for i in range(3)))

    # Yorug'lik ATAYLAB blur qilinadi: blursiz ellips cheti keskin yoy bo'lib ko'rinadi.
    glow = Image.new('RGB', (WIDTH, HEIGHT), (0, 0, 0))
    ImageDraw.Draw(glow).ellipse((-200, 320, WIDTH + 200, 1240), fill=(10, 74, 70))
    glow = glow.filter(ImageFilter.GaussianBlur(150))
    return Image.blend(img, glow, 0.55)


def _branch(draw, x, y, angle, length, width, depth, rng):
    """Bitta shoxni chizadi va uchidan ikkiga bo'linib davom etadi.

    Rekursiya — daraxt shakli uchun eng qisqa yo'l. `rng` urinish id'si bilan urug'langan:
    bitta natija har safar bir xil daraxt beradi, turli o'quvchilarda esa turlicha.
    """
    if depth == 0 or length < 12:
        return
    x2 = x + math.cos(angle) * length
    y2 = y - math.sin(angle) * length
    shade = 110 + depth * 15
    draw.line([(x, y), (x2, y2)], fill=(16, shade, shade - 18), width=max(1, int(width)))
    if depth <= 2:
        draw.ellipse((x2 - 6, y2 - 6, x2 + 6, y2 + 6), fill=(20, 150, 130))

    spread = rng.uniform(0.34, 0.52)
    for direction in (-1, 1):
        _branch(draw, x2, y2,
                angle + direction * spread + rng.uniform(-0.09, 0.09),
                length * rng.uniform(0.66, 0.78),
                width * 0.68, depth - 1, rng)


def _roots_layer(seed, top):
    """Kartadan pastga o'sadigan ildiz tarmog'i.

    Ildiz ATAYLAB pastda: rasmning yuqori yarmini halqa va karta egallaydi, u yerda
    chizilgan shox ularning ortida ko'rinmay qolardi. Pastdagi bo'sh maydonda esa u to'liq
    ochiladi va platformaning nomini ("ilm ildizi") to'g'ridan-to'g'ri takrorlaydi.
    """
    layer = Image.new('RGB', (WIDTH, HEIGHT), (0, 0, 0))
    draw = ImageDraw.Draw(layer)
    rng = random.Random(seed)

    # -pi/2 — pastga; shu bitta burchak butun tarmoqni teskari yo'naltiradi.
    _branch(draw, WIDTH / 2, top, -math.pi / 2, 150, 22, 7, rng)
    draw.line([(WIDTH / 2 - 190, top), (WIDTH / 2 + 190, top)], fill=(16, 92, 86), width=3)

    return layer.filter(ImageFilter.GaussianBlur(1))


def _score_ring(draw, cx, cy, radius, fraction):
    """Natija halqasi: to'liq aylana — fon, natija ulushi — zumrad yoy."""
    box = (cx - radius, cy - radius, cx + radius, cy + radius)
    draw.arc(box, 0, 360, fill=(32, 44, 48), width=26)
    if fraction > 0:
        # -90° dan boshlanadi, ya'ni yoy tepadan soat mili yo'nalishida o'sadi.
        draw.arc(box, -90, -90 + 360 * min(fraction, 1.0), fill=ACCENT, width=26)


def render_story_png(*, score, correct, total, test_title, display_name, seed=0):
    """Natija kartasini PNG bayt sifatida qaytaradi."""
    card_top, card_bottom = 1010, 1360

    img = Image.blend(_background(), _roots_layer(seed, card_bottom + 30), 0.5)
    draw = ImageDraw.Draw(img)

    _centered(draw, 150, 'ILMILDIZI', _font(64), ACCENT)
    _centered(draw, 240, 'Milliy sertifikat va BBA', _font(36, bold=False), MUTED)

    # --- Natija halqasi
    cx, cy, radius = WIDTH / 2, 660, 240
    _score_ring(draw, cx, cy, radius, (score or 0) / 100)

    # Halqa ichida: tepada kichik yorliq, ostida raqam. Raqam halqa ichiga sig'ishi uchun
    # kenglikka qarab kichrayadi — "100%" uch xonali, ya'ni eng keng holat.
    _centered(draw, cy - 150, 'NATIJA', _font(34), MUTED)

    percent = f'{round(score or 0)}%'
    percent_font = _fit(draw, percent, 150, radius * 1.5)
    pw, ph = _text_size(draw, percent, percent_font)
    draw.text((cx - pw / 2, cy - ph / 2 + 26), percent, font=percent_font, fill=TEXT)

    # --- Ma'lumot kartasi
    draw.rounded_rectangle((80, card_top, WIDTH - 80, card_bottom),
                           radius=44, fill=SURFACE, outline=(32, 52, 52), width=2)

    title = _shorten(test_title or 'Test', 60)
    _centered(draw, card_top + 62, title, _fit(draw, title, 52, WIDTH - 240), ACCENT)
    _centered(draw, card_top + 160, f"{correct} / {total} to'g'ri javob", _font(46, bold=False), TEXT)

    if display_name:
        draw.line([(300, card_top + 248), (WIDTH - 300, card_top + 248)], fill=(38, 58, 58), width=2)
        _centered(draw, card_top + 278, _shorten(display_name, 28), _font(40), MUTED)

    # --- Chaqiruv
    _centered(draw, 1642, "Sen ham sinab ko'r", _font(44, bold=False), MUTED)

    handle = '@ilmildiziuz_bot'
    handle_font = _font(52)
    hw, hh = _text_size(draw, handle, handle_font)
    draw.rounded_rectangle(((WIDTH - hw) / 2 - 44, 1748, (WIDTH + hw) / 2 + 44, 1748 + hh + 46),
                           radius=(hh + 46) / 2, fill=ACCENT_DEEP)
    draw.text(((WIDTH - hw) / 2, 1764), handle, font=handle_font, fill=(6, 20, 20))

    buf = io.BytesIO()
    img.save(buf, format='PNG', optimize=True)
    return buf.getvalue()
