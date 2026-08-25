import type { MetadataRoute } from 'next';

/**
 * PWA manifesti. Loyihada service worker allaqachon bor (public/sw.js), lekin manifest
 * yo'q edi — usiz telefon "bosh ekranga qo'shish" da sayt nomini ham, ikonasini ham
 * bilmaydi va havola brauzer yorlig'i bo'lib qoladi.
 *
 * Ranglar globals.css dagi brend palitrasi bilan bir xil: `theme_color` telefon holat
 * qatorini bo'yaydi, `background_color` esa ilova ochilayotgandagi bo'sh ekranni.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "IlmIldizi — Milliy sertifikat va BBA'ga tayyorgarlik",
    short_name: 'IlmIldizi',
    description: 'Rasmiy formatdagi mock testlar, AI mentor va zaif mavzular tahlili.',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#08090c',
    theme_color: '#3b82f6',
    lang: 'uz',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
