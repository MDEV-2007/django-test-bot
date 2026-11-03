'use client';

import { useEffect, useState } from 'react';

export type AppTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'ilm_theme_v3';

export function applyDomTheme(next: AppTheme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.dataset.theme = next;
  if (next === 'dark') {
    root.classList.add('dark');
    root.classList.remove('light');
    document.body?.classList.add('dark');
    document.body?.classList.remove('light');
  } else {
    root.classList.remove('dark');
    root.classList.add('light');
    document.body?.classList.remove('dark');
    document.body?.classList.add('light');
  }

  try {
    const wa = (window as any).Telegram?.WebApp;
    if (wa) {
      if (next === 'dark') {
        wa.setHeaderColor?.('#000000');
        wa.setBackgroundColor?.('#000000');
        wa.setBottomBarColor?.('#000000');
      } else {
        wa.setHeaderColor?.('#F2F2F7');
        wa.setBackgroundColor?.('#F2F2F7');
        wa.setBottomBarColor?.('#F2F2F7');
      }
    }
  } catch {}
}

export function useTheme(): {
  theme: AppTheme;
  isLight: boolean;
  isDark: boolean;
  setTheme: (t: AppTheme) => void;
  toggleTheme: () => void;
} {
  // Birinchi render server bilan bir xil ('light') bo'lishi shart: ilgari bu yerda
  // `getInitialTheme` (localStorage) o'qilardi va mavzu tugmasi har sahifada hydration
  // xatosini berib, React butun daraxtni qayta qurardi. Haqiqiy mavzu pastdagi effektda
  // DOM'dan (layout skripti allaqachon qo'ygan klassdan) olinadi.
  const [theme, setLocalTheme] = useState<AppTheme>('light');

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const syncTheme = () => {
      const active =
        document.documentElement.dataset.theme === 'dark' ||
        document.documentElement.classList.contains('dark')
          ? 'dark'
          : 'light';
      setLocalTheme(active);
    };

    syncTheme();

    const observer = new MutationObserver(() => {
      syncTheme();
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'class'],
    });

    return () => observer.disconnect();
  }, []);

  const setTheme = (next: AppTheme) => {
    if (typeof document === 'undefined') return;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
      localStorage.setItem('ilm_theme_v2', next);
      localStorage.setItem('ilm_theme', next);
    } catch {}
    applyDomTheme(next);
    setLocalTheme(next);
  };

  const toggleTheme = () => {
    const current =
      typeof document !== 'undefined' &&
      (document.documentElement.dataset.theme === 'dark' ||
        document.documentElement.classList.contains('dark'))
        ? 'dark'
        : 'light';
    setTheme(current === 'dark' ? 'light' : 'dark');
  };

  return {
    theme,
    isLight: theme === 'light',
    isDark: theme === 'dark',
    setTheme,
    toggleTheme,
  };
}
