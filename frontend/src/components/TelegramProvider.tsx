'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  getWebApp, isTelegramEnv, loadTelegramSdk, markTelegramReady, useTelegramBackButton,
} from '@/lib/telegram';
import { applyDomTheme, THEME_STORAGE_KEY, type AppTheme } from '@/hooks/useTheme';

/* Telegram Mini App qobig'i (Apple iOS 18 Light #F2F2F7 & Dark #000000 sinxronizatsiyasi bilan). */
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

      document.documentElement.dataset.tg = 'on';
      document.documentElement.dataset.tgPlatform = wa.platform;

      const applyViewport = () => {
        const stable = wa.viewportStableHeight || wa.viewportHeight;
        if (stable) document.documentElement.style.setProperty('--tg-viewport', `${stable}px`);
      };
      applyViewport();
      wa.onEvent('viewportChanged', applyViewport);
      cleanups.push(() => wa.offEvent('viewportChanged', applyViewport));

      /* Mavzu sinxronizatsiyasi:
         1. Agar foydalanuvchi yangi `ilm_theme_v3` kaliti orqali o'zi mavzuni tanlagan bo'lsa, o'shani oladi.
         2. Aks holda Telegram'ning o'z mavzusi (`wa.colorScheme === 'dark'`) bilan avtomatik moslashadi. */
      const resolveAndApplyTheme = (fromTelegramEvent = false) => {
        let target: AppTheme = wa.colorScheme === 'dark' ? 'dark' : 'light';
        if (!fromTelegramEvent) {
          try {
            const manual = localStorage.getItem(THEME_STORAGE_KEY);
            if (manual === 'dark' || manual === 'light') {
              target = manual;
            }
          } catch {}
        } else {
          // Foydalanuvchi Telegram ilovasining o'zida mavzuni almashtirganda darhol moslashamiz
          try {
            localStorage.setItem(THEME_STORAGE_KEY, target);
          } catch {}
        }
        applyDomTheme(target);
      };

      resolveAndApplyTheme(false);
      const onThemeChanged = () => resolveAndApplyTheme(true);
      wa.onEvent('themeChanged', onThemeChanged);
      cleanups.push(() => wa.offEvent('themeChanged', onThemeChanged));

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

  const goBack = useCallback(() => {
    if (window.history.length > 1) router.back();
    else router.push('/dashboard');
  }, [router]);

  const rootPaths = ['/dashboard', '/login', '/register', '/onboarding', '/'];
  const needsBack = active && !!getWebApp() && !rootPaths.includes(pathname);
  useTelegramBackButton(needsBack ? goBack : null);

  return null;
}
