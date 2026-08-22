import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://ilmildizi.uz';

/* Kabinet, o'qituvchi va admin sahifalari indekslanmaydi: ular login talab qiladi,
   robot ular ortidagi kontentni ko'ra olmaydi va bo'sh sahifalar saytning qidiruvdagi
   sifatini pasaytiradi. Ochiq sahifalar — landing, kirish va ro'yxatdan o'tish. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/dashboard', '/tests', '/learning', '/mentor', '/battles', '/games',
        '/leaderboard', '/analytics', '/profile', '/shop', '/premium',
        '/onboarding', '/teacher', '/panel', '/design-system',
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
