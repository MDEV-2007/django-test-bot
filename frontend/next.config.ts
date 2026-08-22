import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The repo root also has its own package-lock.json (Tailwind build for the Django
  // templates) â€” pin Turbopack's root to this app so it doesn't guess wrong.
  turbopack: {
    root: __dirname,
  },

  /* Telegram Mini App'ni lokal serverda sinash uchun sahifa cloudflared tunnel
     domeni orqali ochiladi. Next dev rejimi begona (cross-origin) domendan
     kelgan ichki so'rovlarni (HMR, _next/*) sukut bo'yicha bloklaydi â€”
     tunnel manzili shu ro'yxatga qo'shilishi kerak. Tunnel manzili
     o'zgarganda bu qatorni ham yangilang. */
  allowedDevOrigins: ['ferrari-nvidia-pocket-status.trycloudflare.com'],

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
        { source: '/ws/:path*', destination: `${backend}/ws/:path*` },
      ],
      afterFiles: [],
      fallback: [],
    };
  },

};

export default nextConfig;
