"""Mashq testi natija kartasi — Pastel Studio dizaynida PNG/PDF.

Saytdagi `CertificateCard` (frontend/src/components/student/CertificateCard.tsx) bilan
bir xil ko'rinish va bir xil raqamlar: Rasch balli (70 ballik), foiz, daraja, natija raqami.
Bitta chizgich uchta joyda ishlatiladi:
  * "Rasm (PNG) yuklab olish" — `format='card'`
  * Telegram Story (9:16) — `format='story'`
  * PDF — kartaning PNG'i A4 sahifaga joylanadi (panel.api.generate_certificate_api)

Rasm 2x o'lchamda chiziladi va kichraytiriladi — PIL shakllarida antialias yo'q,
shu sababli yumaloq burchaklar silliq chiqadi.
"""
import io
import os

from PIL import Image, ImageDraw, ImageFilter, ImageFont

# Pastel Studio palitrasi
PURPLE = (118, 89, 199)
ORANGE = (255, 184, 46)
INK = (8, 8, 8)
CREAM = (255, 252, 247)
NEUTRAL = (247, 244, 239)
SAND = (242, 234, 223)
MUTED = (138, 132, 148)
SECONDARY = (107, 101, 119)
DASH = (230, 222, 210)

_ASSETS = os.path.join(os.path.dirname(__file__), 'assets')

_BOLD = [
    '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
    r'C:\Windows\Fonts\segoeuib.ttf',
    r'C:\Windows\Fonts\arialbd.ttf',
]
_REGULAR = [
    '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
    r'C:\Windows\Fonts\segoeui.ttf',
    r'C:\Windows\Fonts\arial.ttf',
]
_MONO = [
    '/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf',
    r'C:\Windows\Fonts\consolab.ttf',
    r'C:\Windows\Fonts\courbd.ttf',
]

_font_cache = {}


def _font(kind, size):
    key = (kind, int(size))
    if key in _font_cache:
        return _font_cache[key]
    paths = {'bold': _BOLD, 'regular': _REGULAR, 'mono': _MONO}[kind]
    font = None
    for path in paths:
        if os.path.exists(path):
            try:
                font = ImageFont.truetype(path, int(size))
                break
            except OSError:
                continue
    if font is None:
        try:
            font = ImageFont.load_default(size=int(size))
        except TypeError:
            font = ImageFont.load_default()
    _font_cache[key] = font
    return font


# ───────────────────────────── ma'lumot

def certificate_data(attempt, display_name=None):
    """Kartadagi barcha qiymatlar — frontend `computeCertificate` bilan bir xil qoidalar."""
    correct = attempt.correct_answers or 0
    total = correct + (attempt.wrong_answers or 0) + (attempt.skipped_answers or 0)
    score = float(attempt.score or 0)
    is_zero = correct == 0 or score == 0

    rasch = (attempt.annotations or {}).get('rasch') if isinstance(attempt.annotations, dict) else None
    if not isinstance(rasch, dict):
        try:
            from tests_app.services.rasch import evaluate_attempt_rasch
            rasch = evaluate_attempt_rasch(attempt)
        except Exception:
            rasch = None

    if is_zero:
        scaled, pct, grade = 0.0, 0.0, '—'
    else:
        scaled = rasch.get('scaled_score') if rasch else None
        if scaled is None:
            scaled = min(70.0, round(score / 100 * 70, 1))
        scaled = float(scaled)
        pct = rasch.get('percentage') if rasch else None
        pct = float(pct) if pct is not None else score
        grade = (rasch or {}).get('grade') or (
            'A+' if scaled >= 65 else 'A' if scaled >= 60 else 'B+' if scaled >= 55
            else 'B' if scaled >= 50 else 'C+' if scaled >= 46 else 'C' if scaled >= 42 else '—'
        )

    if display_name is None:
        user = attempt.profile.user
        display_name = f'{user.first_name or user.username} {user.last_name or ""}'.strip()

    aid = str(attempt.id)
    date_str = ''
    if attempt.completed_at:
        from django.utils import timezone
        dt = attempt.completed_at
        if timezone.is_aware(dt):
            dt = dt.astimezone(timezone.get_current_timezone())
        date_str = dt.strftime('%d.%m.%Y')

    return {
        'name': (display_name or "O'quvchi").upper(),
        'test_title': attempt.test.title if attempt.test else 'Test',
        'scaled': f'{scaled:.1f}',
        'scaled_comma': f'{scaled:.1f}'.replace('.', ','),
        'pct': f'{pct:.2f} %',
        'grade': grade,
        'cert_no': f'DJ26 0607{aid[-7:].zfill(7)}',
        'code': aid[-5:].zfill(5),
        'date': date_str,
        'qr_url': f'https://ilmildizi.uz/tests/{aid}/feedback',
        'correct': correct,
        'total': total,
    }


# ───────────────────────────── yordamchilar

def _qr_image(url, size):
    try:
        import segno
    except ImportError:
        return None
    buf = io.BytesIO()
    segno.make(url, error='m').save(buf, kind='png', scale=10, border=1, dark='#080808', light='#FFFFFF')
    buf.seek(0)
    return Image.open(buf).convert('RGB').resize((size, size), Image.NEAREST)


def _text_w(draw, text, font):
    box = draw.textbbox((0, 0), text, font=font)
    return box[2] - box[0]


def _wrap(draw, text, font, max_w, max_lines):
    words = (text or '').split()
    lines, cur = [], ''
    for word in words:
        trial = f'{cur} {word}'.strip()
        if _text_w(draw, trial, font) <= max_w:
            cur = trial
        else:
            if cur:
                lines.append(cur)
            cur = word
        if len(lines) == max_lines:
            break
    if cur and len(lines) < max_lines:
        lines.append(cur)
    if len(lines) == max_lines and ' '.join(lines) != ' '.join(words):
        last = lines[-1]
        while last and _text_w(draw, last + '…', font) > max_w:
            last = last[:-1]
        lines[-1] = last.rstrip() + '…'
    return lines or ['']


def _fit(draw, text, kind, size, max_w, min_size):
    while size > min_size and _text_w(draw, text, _font(kind, size)) > max_w:
        size -= 1
    font = _font(kind, size)
    if _text_w(draw, text, font) <= max_w:
        return text, font
    while text and _text_w(draw, text + '…', font) > max_w:
        text = text[:-1]
    return text.rstrip() + '…', font


def _overlay_circle(img, box, color, alpha):
    layer = Image.new('RGBA', img.size, (0, 0, 0, 0))
    ImageDraw.Draw(layer).ellipse(box, fill=color + (alpha,))
    img.alpha_composite(layer)


def _dashed_hline(draw, x0, x1, y, color, width, dash, gap):
    x = x0
    while x < x1:
        draw.line((x, y, min(x + dash, x1), y), fill=color, width=width)
        x += dash + gap


# ───────────────────────────── karta

def _draw_card(data, k):
    """Kartani alohida RGBA rasm sifatida chizadi. k — 640px kenglikdagi dizaynga ko'paytiruvchi."""
    W = int(640 * k)
    px = 32 * k

    # Balandlikni oldindan hisoblash uchun vaqtinchalik draw
    probe = ImageDraw.Draw(Image.new('RGB', (10, 10)))
    title_font = _font('bold', 38 * k)
    wide_font = _font('bold', 14 * k)
    cell_w_full = W - 2 * px
    title_lines = _wrap(probe, data['test_title'], wide_font, cell_w_full - 32 * k, 2)

    header_h = 24 * k + 48 * k + 20 * k + 38 * k * 0.95 * 2 + 56 * k
    row_y = header_h - 32 * k                      # ball doirasi yuqori cheti
    rows_top = row_y + 96 * k + 20 * k
    label_h = 13 * k
    wide_h = 12 * k + label_h + 4 * k + len(title_lines) * 14 * k * 1.4 + 12 * k
    cell_h = 12 * k + label_h + 4 * k + 20 * k + 12 * k
    gap = 10 * k
    rows_bottom = rows_top + wide_h + gap + cell_h + gap + cell_h
    footer_top = rows_bottom + 20 * k
    footer_h = 20 * k + 96 * k + 20 * k
    H = int(footer_top + footer_h)

    card = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    mask = Image.new('L', (W, H), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, W - 1, H - 1), radius=int(32 * k), fill=255)

    body = Image.new('RGBA', (W, H), CREAM + (255,))
    d = ImageDraw.Draw(body)

    # Binafsha lenta + bezaklar
    d.rectangle((0, 0, W, header_h), fill=PURPLE)
    _overlay_circle(body, (W - 176 * k + 40 * k, -48 * k, W + 40 * k, 128 * k), (255, 255, 255), 38)
    _overlay_circle(body, (W - 128 * k - 64 * k, header_h - 64 * k + 28 * k, W - 128 * k, header_h + 28 * k), ORANGE, 204)
    d = ImageDraw.Draw(body)
    d.rectangle((0, header_h, W, H), fill=CREAM)  # to'q sariq doira lentadan pastga chiqmasin

    # Logo
    ly = 24 * k
    d.ellipse((px, ly, px + 48 * k, ly + 48 * k), fill=(255, 255, 255))
    icon_path = os.path.join(_ASSETS, 'brand-icon.png')
    if os.path.exists(icon_path):
        icon = Image.open(icon_path).convert('RGBA').resize((int(40 * k), int(40 * k)), Image.LANCZOS)
        imask = Image.new('L', icon.size, 0)
        ImageDraw.Draw(imask).ellipse((0, 0, icon.size[0] - 1, icon.size[1] - 1), fill=255)
        body.paste(icon, (int(px + 4 * k), int(ly + 4 * k)), imask)
    d.text((px + 60 * k, ly + 6 * k), 'IlmIldizi', font=_font('bold', 18 * k), fill=(255, 255, 255))
    d.text((px + 60 * k, ly + 30 * k), 'ONLAYN MASHQ PLATFORMASI', font=_font('bold', 10.5 * k), fill=(214, 205, 240))

    # Natija raqami pill
    pill_font = _font('mono', 11 * k)
    pw = _text_w(d, data['cert_no'], pill_font) + 24 * k
    pill = (W - px - pw, ly + 12 * k, W - px, ly + 36 * k)
    layer = Image.new('RGBA', body.size, (0, 0, 0, 0))
    ImageDraw.Draw(layer).rounded_rectangle(pill, radius=int(12 * k), fill=(0, 0, 0, 51))
    body.alpha_composite(layer)
    d = ImageDraw.Draw(body)
    d.text((pill[0] + 12 * k, pill[1] + 5 * k), data['cert_no'], font=pill_font, fill=(255, 255, 255))

    # Sarlavha
    ty = ly + 48 * k + 20 * k
    d.text((px, ty), 'Mashq testi', font=title_font, fill=(255, 255, 255))
    d.text((px, ty + 38 * k * 0.95), 'natija kartasi', font=title_font, fill=(255, 255, 255))

    # Ball doirasi
    cx0, cy0 = px, row_y
    d.ellipse((cx0, cy0, cx0 + 96 * k, cy0 + 96 * k), fill=CREAM)
    d.ellipse((cx0 + 6 * k, cy0 + 6 * k, cx0 + 90 * k, cy0 + 90 * k), fill=ORANGE)
    sf = _font('bold', 30 * k)
    sw = _text_w(d, data['scaled'], sf)
    d.text((cx0 + 48 * k - sw / 2, cy0 + 26 * k), data['scaled'], font=sf, fill=INK)
    bf = _font('bold', 10 * k)
    bw = _text_w(d, 'BALL', bf)
    d.text((cx0 + 48 * k - bw / 2, cy0 + 62 * k), 'BALL', font=bf, fill=INK)

    # Daraja doirasi
    gx1 = W - px
    gy1 = row_y + 96 * k - 8 * k
    d.ellipse((gx1 - 56 * k, gy1 - 56 * k, gx1, gy1), fill=INK)
    gf = _font('bold', 20 * k)
    gw = _text_w(d, data['grade'], gf)
    d.text((gx1 - 28 * k - gw / 2, gy1 - 28 * k - 13 * k), data['grade'], font=gf, fill=ORANGE)

    # Ism
    nx = cx0 + 96 * k + 12 * k
    name_max = gx1 - 56 * k - 16 * k - nx
    d.text((nx, row_y + 96 * k - 50 * k), 'TALABGOR', font=_font('bold', 11 * k), fill=MUTED)
    name, nf = _fit(d, data['name'], 'bold', int(20 * k), name_max, int(14 * k))
    d.text((nx, row_y + 96 * k - 33 * k), name, font=nf, fill=INK)

    # Ma'lumot kataklari
    def cell(x, y, w, h, label, value_lines, mono):
        d.rounded_rectangle((x, y, x + w, y + h), radius=int(18 * k), fill=NEUTRAL)
        d.text((x + 16 * k, y + 12 * k), label, font=_font('bold', 10.5 * k), fill=MUTED)
        vf = _font('mono', 16 * k) if mono else wide_font
        vy = y + 12 * k + label_h + 4 * k
        for line in value_lines:
            d.text((x + 16 * k, vy), line, font=vf, fill=INK)
            vy += (14 * k * 1.4) if not mono else 20 * k

    half = (cell_w_full - gap) / 2
    cell(px, rows_top, cell_w_full, wide_h, 'FAN / TEST', title_lines, False)
    y2 = rows_top + wide_h + gap
    cell(px, y2, half, cell_h, 'FOIZ KO‘RSATKICHI', [data['pct']], True)
    cell(px + half + gap, y2, half, cell_h, 'TEST SINOVI NATIJASI', [data['scaled_comma']], True)
    y3 = y2 + cell_h + gap
    cell(px, y3, half, cell_h, 'TALABGOR KODI', [data['code']], True)
    cell(px + half + gap, y3, half, cell_h, 'BERILGAN SANA', [data['date'] or '—'], True)

    # Pastki qism
    _dashed_hline(d, 0, W, footer_top, DASH, max(1, int(1.5 * k)), int(6 * k), int(5 * k))
    fy = footer_top + 20 * k
    qr_box = 96 * k
    d.text((px, fy + 10 * k), 'RASMIY HUJJAT EMAS', font=_font('bold', 11 * k), fill=PURPLE)
    note_font = _font('regular', 12 * k)
    note_w = W - 2 * px - qr_box - 24 * k
    ny = fy + 30 * k
    for line in _wrap(d, 'BMB formatidagi mashq testi natijasi. QR orqali natija sahifasini oching.', note_font, note_w, 3):
        d.text((px, ny), line, font=note_font, fill=SECONDARY)
        ny += 12 * k * 1.45
    qx = W - px - qr_box
    d.rounded_rectangle((qx, fy, qx + qr_box, fy + qr_box), radius=int(18 * k), fill=(255, 255, 255))
    qr = _qr_image(data['qr_url'], int(qr_box - 16 * k))
    if qr is not None:
        body.paste(qr, (int(qx + 8 * k), int(fy + 8 * k)))

    card.paste(body, (0, 0), mask)
    return card


def _gradient(size, stops):
    """Chapdan o'ngga (biroz diagonal) pastel gradient fon."""
    w, h = size
    base = Image.new('RGB', (256, 1))
    px = base.load()
    for i in range(256):
        t = i / 255
        for j in range(len(stops) - 1):
            a, b = stops[j], stops[j + 1]
            if a[0] <= t <= b[0]:
                f = (t - a[0]) / (b[0] - a[0] or 1)
                px[i, 0] = tuple(int(a[1][c] + (b[1][c] - a[1][c]) * f) for c in range(3))
                break
    return base.resize((w, h), Image.BILINEAR).rotate(0)


_BG_STOPS = [(0.0, (230, 214, 250)), (0.5, (204, 190, 245)), (1.0, (196, 226, 243))]


def render_certificate_png(data, fmt='card'):
    """`card` — karta + yumshoq fon (yuklab olish), `story` — 1080x1920, `bare` — faqat karta (PDF)."""
    ss = 2  # supersampling

    if fmt == 'story':
        W, H = 1080 * ss, 1920 * ss
        img = _gradient((W, H), _BG_STOPS).convert('RGBA')
        k = (W - 2 * 90 * ss) / 640
        card = _draw_card(data, k)
        d = ImageDraw.Draw(img)
        brand_font = _font('bold', 46 * ss)
        sub_font = _font('bold', 30 * ss)
        cta_font = _font('bold', 32 * ss)
        block_h = 56 * ss + 44 * ss + 70 * ss + card.size[1] + 80 * ss + 84 * ss
        top = int((H - block_h) / 2)
        bw = _text_w(d, 'IlmIldizi', brand_font)
        d.text(((W - bw) / 2, top), 'IlmIldizi', font=brand_font, fill=INK)
        sub = 'Mening natijam'
        d.text(((W - _text_w(d, sub, sub_font)) / 2, top + 64 * ss), sub, font=sub_font, fill=PURPLE)
        cy = top + 56 * ss + 44 * ss + 70 * ss
        shadow = Image.new('RGBA', img.size, (0, 0, 0, 0))
        ImageDraw.Draw(shadow).rounded_rectangle(
            (110 * ss, cy + 40 * ss, W - 110 * ss, cy + card.size[1] + 20 * ss), radius=int(32 * k), fill=(60, 30, 110, 90))
        img.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(36 * ss)))
        img.alpha_composite(card, (90 * ss, cy))
        d = ImageDraw.Draw(img)
        cta = 'Siz ham sinab ko‘ring · ilmildizi.uz'
        cw = _text_w(d, cta, cta_font) + 64 * ss
        by = cy + card.size[1] + 80 * ss
        d.rounded_rectangle(((W - cw) / 2, by, (W + cw) / 2, by + 84 * ss), radius=42 * ss, fill=INK)
        d.text(((W - cw) / 2 + 32 * ss, by + 22 * ss), cta, font=cta_font, fill=CREAM)
        out = img
    elif fmt == 'bare':
        out = _draw_card(data, 1240 * ss / 640)
    else:
        k = 1000 * ss / 640
        card = _draw_card(data, k)
        pad = 60 * ss
        W, H = card.size[0] + 2 * pad, card.size[1] + 2 * pad
        img = _gradient((W, H), _BG_STOPS).convert('RGBA')
        shadow = Image.new('RGBA', img.size, (0, 0, 0, 0))
        ImageDraw.Draw(shadow).rounded_rectangle(
            (pad + 20 * ss, pad + 30 * ss, W - pad - 20 * ss, H - pad + 10 * ss), radius=int(32 * k), fill=(60, 30, 110, 80))
        img.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(26 * ss)))
        img.alpha_composite(card, (pad, pad))
        out = img

    out = out.resize((out.size[0] // ss, out.size[1] // ss), Image.LANCZOS)
    buf = io.BytesIO()
    if fmt == 'bare':
        out.save(buf, format='PNG', optimize=True)
    else:
        out.convert('RGB').save(buf, format='PNG', optimize=True)
    return buf.getvalue()
