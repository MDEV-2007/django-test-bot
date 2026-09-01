import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Docker uchun: `standalone` rejimi barcha kerakli node_modules'ni bitta papkaga
     yig'adi, natijada runtime obrazga `npm install` ham, butun node_modules ham kerak
     emas (obraz ~1 GB o'rniga ~200 MB). */
  output: 'standalone',

  // The repo root also has its own package-lock.json (Tailwind build for the Django
  // templates) — pin Turbopack's root to this app so it doesn't guess wrong.
  turbopack: {
    root: __dirname,
  },

  /* `next dev` begona (cross-origin) domendan kelgan ichki so'rovlarni (HMR, _next/*)
     bloklaydi, shuning uchun tunnel domeni ruxsat ro'yxatida bo'lishi kerak.

     Domen SHU FAYLGA YOZILMAYDI, muhit o'zgaruvchisidan o'qiladi: tunnel manzili har
     safar o'zgargani uchun skript bu faylni qayta-qayta tahrirlardi va har tahrirda
     izohlardagi belgilar buzilib borardi (fayl ANSI sifatida o'qilib, UTF-8 bo'lib
     qayta yozilardi). Production rejimida bu sozlama umuman ishlatilmaydi. */
  allowedDevOrigins: process.env.DEV_TUNNEL_HOST ? [process.env.DEV_TUNNEL_HOST] : [],

  /* Django API va media SHU origin ostidan uzatiladi.
     Nega: Telegram Mini App telefonda ochiladi — u yerdan `localhost:8001` ga chiqib
     bo'lmaydi. Ikkita alohida tunnel ham ishlaydi, lekin har safar manzil o'zgarganda
     frontendni qayta yig'ish kerak bo'lardi (`NEXT_PUBLIC_API_URL` build vaqtida
     kodga yoziladi). Bitta origin bo'lsa — qayta yig'ish ham, CORS ham kerak emas.

     `skipTrailingSlashRedirect` MAJBURIY: Django yo'llari oxirida slash bilan
     (`/api/auth/config/`), Next esa sukut bo'yicha uni slashsiz variantiga 308 bilan
     yo'naltiradi. Destination'da slash ochiq yozilgan — aks holda Next slashni olib
     tashlab uzatadi va Django APPEND_SLASH bilan 301 qaytarib, aylanma hosil bo'ladi
     (o'lchangan: `Location: /api/auth/config/`). */
  skipTrailingSlashRedirect: true,

  async rewrites() {
    const backend = process.env.BACKEND_ORIGIN || 'http://127.0.0.1:8001';
    return {
      beforeFiles: [
        { source: '/api/:path*', destination: `${backend}/api/:path*/` },
        { source: '/media/:path*', destination: `${backend}/media/:path*` },
        { source: '/telegram/:path*', destination: `${backend}/telegram/:path*/` },
        { source: '/ws/:path*', destination: `${backend}/ws/:path*/` },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
