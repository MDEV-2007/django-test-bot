'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  getWebApp, isTelegramEnv, loadTelegramSdk, markTelegramReady, useTelegramBackButton,
} from '@/lib/telegram';

/* Telegram Mini App qobig'i.
 *
 * Oddiy brauzerda bu komponent BIRINCHI shartdayoq to'xtaydi: SDK yuklanmaydi, DOM
 * o'zgarmaydi — ya'ni saytga hech qanday ta'siri yo'q.
 *
 * Telegram ichida esa:
 *   1. `ready()` — Telegram yuklanish indikatorini olib tashlaydi;
 *   2. `expand()` — ilova yarim ekranda emas, to'liq balandlikda ochiladi;
 *   3. viewport balandligi CSS o'zgaruvchisiga yoziladi (Telegram'da `100svh` noto'g'ri);
 *   4. tema Telegram temasi bilan moslanadi (agar foydalanuvchi o'zi tanlamagan bo'lsa);
 *   5. "orqaga" tugmasi butun ilova bo'ylab ishlaydi.
 */
export default function TelegramProvider() {
  const router = useRouter();
  const pathname = usePathname();
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!isTelegramEnv()) return;

    let disposed = false;
    const cleanups: Array<() => void> = [];

    loadTelegramSdk().then((wa) => {
      if (disposed || !wa) return;

      wa.ready();
      wa.expand();

      // Sahifadagi uslublar Telegram ekanini bilishi uchun.
      document.documentElement.dataset.tg = 'on';
      document.documentElement.dataset.tgPlatform = wa.platform;

      /* Balandlik: Telegram'da oyna balandligi tortish paytida o'zgaradi.
         `viewportStableHeight` — panel to'liq ochilgandagi barqaror balandlik;
         sobit (fixed) elementlar aynan shunga tayanishi kerak. */
      const applyViewport = () => {
        const stable = wa.viewportStableHeight || wa.viewportHeight;
        if (stable) document.documentElement.style.setProperty('--tg-viewport', `${stable}px`);
      };
      applyViewport();
      wa.onEvent('viewportChanged', applyViewport);
      cleanups.push(() => wa.offEvent('viewportChanged', applyViewport));

      /* Tema: Telegram Web App'da barcha sahifalar qat'iy yorug' (light) rejimda bo'lishi kerak.
         Telegram mijozi qorong'i (dark) rejimda bo'lsa ham (wa.colorScheme === 'dark'),
         veb-ilova qat'iy yorug' (light) rejimda ishlaydi. */
      const applyTheme = () => {
        document.documentElement.dataset.theme = 'light';
        try {
          localStorage.setItem('ilm_theme', 'light');
          localStorage.setItem('ilm_theme_v2', 'light');
        } catch { /* noop */ }

        // Telegram sarlavhasi (header) va foni och rangda bo'lsin (#ffffff / #F8FAFC)
        try {
          wa.setHeaderColor?.('#ffffff');
          wa.setBackgroundColor?.('#F8FAFC');
        } catch { /* eski versiya */ }
      };
      applyTheme();
      wa.onEvent('themeChanged', applyTheme);
      cleanups.push(() => wa.offEvent('themeChanged', applyTheme));

      /* Vertikal svayp bilan ilova tasodifan yopilib ketmasin — uzun ro'yxatlarni
         (testlar, liderlar ligasi) skroll qilishda eng ko'p uchraydigan muammo.
         Bu usul Bot API 7.7 dan mavjud. */
      if (wa.isVersionAtLeast('7.7')) {
        try { wa.disableVerticalSwipes?.(); } catch { /* noop */ }
      }

      markTelegramReady();
      setActive(true);
    });

    return () => {
      disposed = true;
      cleanups.forEach((fn) => fn());
    };
  }, []);

  /* Umumiy "orqaga": bosh sahifada tugma kerak emas. Alohida ekranlar (masalan,
     imtihon) `useTelegramBackButton` bilan o'z ishlov beruvchisini ustiga qo'yadi. */
  const goBack = useCallback(() => {
    if (window.history.length > 1) router.back();
    else router.push('/dashboard');
  }, [router]);

  const rootPaths = ['/dashboard', '/login', '/register', '/onboarding', '/'];
  const needsBack = active && !!getWebApp() && !rootPaths.includes(pathname);
  useTelegramBackButton(needsBack ? goBack : null);

  return null;
}
