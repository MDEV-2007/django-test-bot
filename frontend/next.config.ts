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

};

export default nextConfig;
