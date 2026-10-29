'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  getWebApp, isTelegramEnv, loadTelegramSdk, markTelegramReady, useTelegramBackButton,
} from '@/lib/telegram';

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

      const applyTheme = () => {
        let isDark = false;
        try {
          const manual = localStorage.getItem('ilm_theme_v2') || localStorage.getItem('ilm_theme');
          if (manual === 'dark') isDark = true;
          else if (manual === 'light') isDark = false;
          else isDark = (wa.colorScheme === 'dark');
        } catch {
          isDark = (wa.colorScheme === 'dark');
        }

        const theme = isDark ? 'dark' : 'light';
        document.documentElement.dataset.theme = theme;
        if (isDark) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }

        try {
          if (isDark) {
            wa.setHeaderColor?.('#000000');
            wa.setBackgroundColor?.('#000000');
            (wa as unknown as { setBottomBarColor?: (c: string) => void }).setBottomBarColor?.('#000000');
          } else {
            wa.setHeaderColor?.('#F2F2F7');
            wa.setBackgroundColor?.('#F2F2F7');
            (wa as unknown as { setBottomBarColor?: (c: string) => void }).setBottomBarColor?.('#F2F2F7');
          }
        } catch { /* eski versiya */ }
      };
      applyTheme();
      wa.onEvent('themeChanged', applyTheme);
      cleanups.push(() => wa.offEvent('themeChanged', applyTheme));

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
