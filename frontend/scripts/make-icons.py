"""Bitta logo faylidan sayt uchun kerakli barcha ikonalarni yasaydi.

    python frontend/scripts/make-icons.py yol/logo.png

Kamida 512x512 kvadrat PNG bering. Skript quyidagilarni yozadi:

    src/app/favicon.ico          brauzer varag'i (16/32/48/64/128/256 bir faylda)
    src/app/icon.png             Next.js avtomatik ulaydigan 512x512 ikona
    src/app/apple-icon.png       iPhone "bosh ekranga qo'shish" (180x180)
    public/icon-192.png          PWA manifesti
    public/icon-512.png          PWA manifesti
    public/og-image.png          Telegram/ijtimoiy tarmoqlarda havola oldi ko'rinishi

Nega skript: bu fayllar bir manbadan kelib chiqadi va logo o'zgarganda hammasini qayta
yasash kerak. Qo'lda oltita faylni kesish — bittasini unutib qo'yishning eng oson yo'li.
"""
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
BRAND_BG = (59, 130, 246)      # logoning ko'k rangi — og-image foni uchun


def main(source_path):
    src = Image.open(source_path).convert('RGBA')
    if src.width != src.height:
        print(f"Ogohlantirish: logo kvadrat emas ({src.width}x{src.height}), "
              f"cho'zilib ketmasligi uchun markazidan kesiladi.")
        side = min(src.size)
        left, top = (src.width - side) // 2, (src.height - side) // 2
        src = src.crop((left, top, left + side, top + side))
    if src.width < 512:
        print(f"Ogohlantirish: manba {src.width}px — 512px tavsiya etiladi, "
              f"kattalashtirilgan ikonalar xira chiqishi mumkin.")

    app, public = ROOT / 'src' / 'app', ROOT / 'public'

    # ICO ichida bir nechta o'lcham bo'ladi; brauzer keragini o'zi tanlaydi.
    src.save(app / 'favicon.ico', sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])

    for path, size in [
        (app / 'icon.png', 512),
        (app / 'apple-icon.png', 180),
        (public / 'icon-192.png', 192),
        (public / 'icon-512.png', 512),
    ]:
        src.resize((size, size), Image.LANCZOS).save(path, optimize=True)
        print(f"  {path.relative_to(ROOT)}  {size}x{size}")

    # og:image — 1200x630, logo markazda. Telegram va ijtimoiy tarmoqlar havolani shu
    # nisbatda ko'rsatadi; kvadrat rasm qo'yilsa chetlari kesiladi.
    og = Image.new('RGB', (1200, 630), BRAND_BG)
    logo = src.resize((360, 360), Image.LANCZOS)
    og.paste(logo, ((1200 - 360) // 2, (630 - 360) // 2), logo)
    og.save(public / 'og-image.png', optimize=True)
    print(f"  public/og-image.png  1200x630")
    print('Tayyor.')


if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
