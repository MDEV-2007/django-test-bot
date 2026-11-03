'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  getWebApp, isTelegramEnv, loadTelegramSdk, markTelegramReady, useTelegramBackButton,
} from '@/lib/telegram';
import { applyDomTheme, THEME_STORAGE_KEY, type AppTheme } from '@/hooks/useTheme';
import { getSource } from '@/lib/attribution';

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

      // ── TELEGRAM WEBAPP AVTO-AUTENTIFIKATSIYA ──
      // MiniApp ichida ochilganda foydalanuvchini login sahifasida to'xtatmasdan,
      // initData orqali avtomatik tizimga kiritish va yo'naltirish
      try {
        const { useAuthStore } = require('@/lib/auth-store');
        const state = useAuthStore.getState();
        if (!state.access && wa.initData) {
          fetch('/api/auth/telegram/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              initData: wa.initData,
              start_param: wa.initDataUnsafe?.start_param,
              source: getSource(),
            }),
          })
            .then((r) => r.json())
            .then((res) => {
              if (res?.access && res?.user) {
                state.setAccess(res.access);
                state.setUser(res.user);
                if (typeof window !== 'undefined') {
                  localStorage.setItem('ilm_access', res.access);
                  if (res.refresh) localStorage.setItem('ilm_refresh', res.refresh);
                }
                const cur = window.location.pathname;
                if (cur === '/login' || cur === '/' || cur === '/register') {
                  router.push(res.user.has_seen_onboarding ? '/dashboard' : '/onboarding');
                }
              }
            })
            .catch(() => {});
        }
      } catch {}

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
