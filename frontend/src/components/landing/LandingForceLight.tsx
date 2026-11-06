'use client';

import { useEffect } from 'react';

/**
 * Landing har doim yorug' rejimda ko'rsatiladi: uning bo'limlari krem fon uchun
 * chizilgan, dark rejimda sarlavhalar qorong'i fonga singib ketardi.
 * Faqat DOM klassi o'zgaradi — foydalanuvchining saqlangan tanlovi (localStorage)
 * tegilmaydi va landingdan chiqqanda qayta tiklanadi.
 */
export default function LandingForceLight() {
  useEffect(() => {
    const root = document.documentElement;
    const wasDark = root.classList.contains('dark') || root.dataset.theme === 'dark';
    const apply = (dark: boolean) => {
      root.dataset.theme = dark ? 'dark' : 'light';
      root.classList.toggle('dark', dark);
      root.classList.toggle('light', !dark);
      document.body?.classList.toggle('dark', dark);
      document.body?.classList.toggle('light', !dark);
    };
    apply(false);
    return () => {
      if (wasDark) apply(true);
    };
  }, []);
  return null;
}
