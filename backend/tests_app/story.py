"""Telegram Story uchun natija rasmi.

Telegram `shareToStory` ga HAVOLA beriladi, fayl emas: rasmni Telegram serverlari o'zi
yuklab oladi. Ya'ni manzil ochiq (autentifikatsiyasiz) bo'lishi shart — Telegram
`Authorization` sarlavhasini yubormaydi.

Shu sababli manzil imzolanadi: `?sig=` HMAC-SHA256 ning birinchi 16 belgisi. Imzosiz yoki
noto'g'ri imzo bilan 404 qaytadi, ya'ni urinish id'sini birma-bir sinab boshqa
o'quvchilarning natijalarini ko'rib chiqib bo'lmaydi.
"""
import hashlib
import hmac
import io
import os

from django.conf import settings
from PIL import Image, ImageDraw, ImageFilter, ImageFont

# Telegram Story tavsiya etadigan o'lcham (9:16).
WIDTH, HEIGHT = 1080, 1920

BG = (8, 9, 12)
SURFACE = (22, 26, 34)
ACCENT = (47, 179, 163)
TEXT = (233, 236, 240)
MUTED = (148, 155, 166)

_FONT_CANDIDATES = [
    r'C:\Windows\Fonts\segoeuib.ttf',
    r'C:\Windows\Fonts\arialbd.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
    '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf',
]
_FONT_REGULAR_CANDIDATES = [
    r'C:\Windows\Fonts\segoeui.ttf',
    r'C:\Windows\Fonts\arial.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
    '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf',
]


def _font(size, bold=True):
    """Tizimda mavjud birinchi shriftni oladi.

    Konteynerda hech qanday TTF bo'lmasligi mumkin — o'shanda Pillow'ning ichki bitmap
    shrifti ishlatiladi. U mayda chiqadi, lekin rasm baribir yaratiladi: story ulashish
    shrift yo'qligi sababli butunlay ishlamay qolmasligi kerak.
    """
    for path in (_FONT_CANDIDATES if bold else _FONT_REGULAR_CANDIDATES):
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except OSError:
                continue
    return ImageFont.load_default()


def sign_attempt(attempt_id):
    """Urinish uchun qisqa imzo. Kalit — SECRET_KEY, ya'ni alohida sozlama kerak emas."""
    msg = f'story:{attempt_id}'.encode()
    return hmac.new(settings.SECRET_KEY.encode(), msg, hashlib.sha256).hexdigest()[:16]


def signature_ok(attempt_id, signature):
    return hmac.compare_digest(sign_attempt(attempt_id), (signature or ''))


def _centered(draw, y, text, font, fill):
    box = draw.textbbox((0, 0), text, font=font)
    draw.text(((WIDTH - (box[2] - box[0])) / 2, y), text, font=font, fill=fill)
    return box[3] - box[1]


def render_story_png(*, score, correct, total, test_title, display_name):
    """Natija kartasini PNG bayt sifatida qaytaradi."""
    img = Image.new('RGB', (WIDTH, HEIGHT), BG)
    draw = ImageDraw.Draw(img)

    # Yumshoq zumrad yorug'lik. Ellips ATAYLAB blur qilinadi: blursiz chetlari keskin
    # yoy bo'lib ko'rinadi va fon "dog'" bosgandek chiqadi.
    glow = Image.new('RGB', (WIDTH, HEIGHT), BG)
    gdraw = ImageDraw.Draw(glow)
    gdraw.ellipse((-260, 240, WIDTH + 260, 1180), fill=(14, 42, 40))
    glow = glow.filter(ImageFilter.GaussianBlur(140))
    img = Image.blend(img, glow, 0.75)
    draw = ImageDraw.Draw(img)

    # Markaziy karta
    card = (90, 520, WIDTH - 90, 1400)
    draw.rounded_rectangle(card, radius=48, fill=SURFACE, outline=(38, 44, 56), width=2)

    _centered(draw, 300, 'ILMILDIZI', _font(56), ACCENT)
    _centered(draw, 380, 'Milliy sertifikat va BBA', _font(38, bold=False), MUTED)

    _centered(draw, 620, 'NATIJA', _font(40), MUTED)
    _centered(draw, 700, f'{round(score or 0)}%', _font(240), TEXT)
    _centered(draw, 1000, f"{correct} / {total} to'g'ri javob", _font(48, bold=False), TEXT)

    title = (test_title or 'Test')
    if len(title) > 34:
        title = title[:33] + '…'
    _centered(draw, 1120, title, _font(44), ACCENT)

    _centered(draw, 1260, display_name or '', _font(40, bold=False), MUTED)
    _centered(draw, 1500, 'Sen ham sinab ko‘r', _font(46, bold=False), MUTED)
    _centered(draw, 1570, '@ilmildiziuz_bot', _font(52), ACCENT)

    buf = io.BytesIO()
    img.save(buf, format='PNG', optimize=True)
    return buf.getvalue()
