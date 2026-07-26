"""One-off generator for the IlmIldizi brand assets (icon, favicon, OG image).

Replicates the exact geometry from the provided brand-kit HTML (logo.dc.html):
a vertical "stem" plus two pairs of "root" branches, each rotated around its
OWN top-center anchor point (matching CSS `transform-origin: top center`),
on a rounded-square gradient background using the site's existing accent
colors (#2d6cff -> #37b7ff) for visual continuity with the rest of the UI.

Run once: python scripts/gen_branding.py
"""
import os

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMG_DIR = os.path.join(BASE_DIR, 'static', 'img')

COLOR_A = (45, 108, 255)    # #2d6cff
COLOR_B = (55, 183, 255)    # #37b7ff
WHITE = (255, 255, 255)

# (width_frac, height_frac, top_frac, css_angle_deg, opacity)
BRANCHES = [
    (0.125,   0.44, 0.24, 0,   1.0),   # stem
    (0.1083,  0.34, 0.52, -34, 1.0),   # root L
    (0.1083,  0.34, 0.52,  34, 1.0),   # root R
    (0.0833,  0.24, 0.56, -58, 0.7),   # root L2 (shorter, fainter)
    (0.0833,  0.24, 0.56,  58, 0.7),   # root R2
]


def _capsule(w, h, fill):
    """A vertical, fully-rounded ("pill") white capsule of pixel size (w, h)."""
    img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    radius = w // 2
    d.rounded_rectangle([0, 0, w - 1, h - 1], radius=radius, fill=fill)
    return img


def _paste_rotated_capsule(canvas, size, frac):
    """Draw one branch onto `canvas` (size x size), rotated around its own
    top-center point, matching CSS `rotate(deg)` + `transform-origin: top center`."""
    w_frac, h_frac, top_frac, css_deg, opacity = frac
    w = max(2, round(size * w_frac))
    h = max(2, round(size * h_frac))
    fill = (255, 255, 255, round(255 * opacity))
    capsule = _capsule(w, h, fill)

    # Work on a square big enough to hold the capsule after rotation, with the
    # capsule's TOP-CENTER point placed exactly at the square's center — so
    # rotating the whole square around ITS center is equivalent to rotating the
    # capsule around its own top-center anchor (PIL only rotates around image center).
    pad = h + w
    work = Image.new('RGBA', (pad * 2, pad * 2), (0, 0, 0, 0))
    cx, cy = pad, pad
    work.paste(capsule, (cx - w // 2, cy), capsule)

    # CSS rotate(deg) is clockwise as displayed; PIL's rotate() is counter-clockwise
    # for a positive angle, so the visual match is PIL angle = -CSS angle.
    rotated = work.rotate(-css_deg, resample=Image.BICUBIC, center=(cx, cy))

    anchor_x = size / 2
    anchor_y = size * top_frac
    paste_x = round(anchor_x - cx)
    paste_y = round(anchor_y - cy)
    canvas.alpha_composite(rotated, (paste_x, paste_y))


def build_icon(size, corner_frac=0.25):
    """The core square app icon: rounded gradient square + stem/roots motif."""
    canvas = Image.new('RGBA', (size, size), (0, 0, 0, 0))

    # Diagonal (135deg) gradient background, vectorized with numpy, then masked
    # to a rounded-rect so corners stay transparent.
    yy, xx = np.mgrid[0:size, 0:size]
    t = (xx + yy) / (2 * (size - 1))
    a, b_ = np.array(COLOR_A), np.array(COLOR_B)
    rgb = (a[None, None, :] + (b_ - a)[None, None, :] * t[:, :, None]).round().astype('uint8')
    grad = Image.fromarray(rgb, 'RGB')

    mask = Image.new('L', (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        [0, 0, size - 1, size - 1], radius=round(size * corner_frac), fill=255)
    canvas.paste(grad, (0, 0), mask)

    for frac in BRANCHES:
        _paste_rotated_capsule(canvas, size, frac)

    return canvas


def build_monochrome_icon(size, corner_frac=0.25):
    """Dark-card variant (used for the 'monochrome / dark background' kit item) —
    dark navy square, gradient stem/roots instead of a solid-color background."""
    canvas = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    bg = Image.new('RGBA', (size, size), (13, 20, 32, 255))
    mask = Image.new('L', (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        [0, 0, size - 1, size - 1], radius=round(size * corner_frac), fill=255)
    canvas.paste(bg, (0, 0), mask)

    # Gradient-colored branches instead of white, for the monochrome variant.
    for frac in BRANCHES:
        w_frac, h_frac, top_frac, css_deg, opacity = frac
        w = max(2, round(size * w_frac))
        h = max(2, round(size * h_frac))
        yy_idx = np.arange(h)
        t = yy_idx / max(1, h - 1)
        a2, b2 = np.array(COLOR_B), np.array(COLOR_A)
        rgb_col = (a2[None, :] + (b2 - a2)[None, :] * t[:, None]).round().astype('uint8')
        alpha_col = np.full((h, 1), round(255 * opacity), dtype='uint8')
        rgba_col = np.concatenate([rgb_col, alpha_col], axis=1)  # (h, 4)
        rgba = np.repeat(rgba_col[:, None, :], w, axis=1)  # (h, w, 4)
        grad = Image.fromarray(rgba, 'RGBA')
        mask2 = Image.new('L', (w, h), 0)
        ImageDraw.Draw(mask2).rounded_rectangle([0, 0, w - 1, h - 1], radius=w // 2, fill=255)
        capsule = Image.composite(grad, Image.new('RGBA', (w, h), (0, 0, 0, 0)), mask2)

        pad = h + w
        work = Image.new('RGBA', (pad * 2, pad * 2), (0, 0, 0, 0))
        cx, cy = pad, pad
        work.paste(capsule, (cx - w // 2, cy), capsule)
        rotated = work.rotate(-css_deg, resample=Image.BICUBIC, center=(cx, cy))
        anchor_x, anchor_y = size / 2, size * top_frac
        canvas.alpha_composite(rotated, (round(anchor_x - cx), round(anchor_y - cy)))
    return canvas


def build_og_image(master_icon):
    """1200x630 social share card: dark background, blurred glow, centered icon,
    wordmark + tagline — same layout family as the original IlmIldizi OG card."""
    W, H = 1200, 630
    card = Image.new('RGB', (W, H), (5, 8, 17))  # #050811

    glow = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse(
        [W / 2 - 260, H / 2 - 260, W / 2 + 260, H / 2 - 60], fill=(45, 108, 255, 90))
    glow = glow.filter(ImageFilter.GaussianBlur(90))
    card.paste(glow, (0, 0), glow)

    icon = master_icon.resize((190, 190), Image.LANCZOS)
    card.paste(icon, (W // 2 - 95, 120), icon)

    draw = ImageDraw.Draw(card)
    title_font = ImageFont.truetype(r'C:\Windows\Fonts\segoeuib.ttf', 64)
    tag_font = ImageFont.truetype(r'C:\Windows\Fonts\segoeui.ttf', 26)

    title = "IlmIldizi"
    tw = draw.textlength(title, font=title_font)
    draw.text((W / 2 - tw / 2, 335), title, font=title_font, fill=(255, 255, 255))

    tagline = "Milliy sertifikat va imtihonlarga tayyorgarlik"
    tgw = draw.textlength(tagline, font=tag_font)
    draw.text((W / 2 - tgw / 2, 425), tagline, font=tag_font, fill=(140, 161, 209))

    return card


def main():
    os.makedirs(IMG_DIR, exist_ok=True)

    master = build_icon(1024)
    master.save(os.path.join(IMG_DIR, 'icon.png'))
    master.resize((512, 512), Image.LANCZOS).save(os.path.join(IMG_DIR, 'logo.png'))
    master.resize((512, 512), Image.LANCZOS).save(os.path.join(IMG_DIR, 'logo-trimmed.png'))
    master.resize((180, 180), Image.LANCZOS).save(os.path.join(IMG_DIR, 'apple-touch-icon.png'))
    master.resize((32, 32), Image.LANCZOS).save(os.path.join(IMG_DIR, 'favicon-32.png'))

    mono = build_monochrome_icon(512)
    mono.save(os.path.join(IMG_DIR, 'icon-mono.png'))

    og = build_og_image(master)
    og.save(os.path.join(IMG_DIR, 'og-image.png'))

    print('Brand assets written to', IMG_DIR)


if __name__ == '__main__':
    main()
