'use client';

import { useEffect, useState } from 'react';

export type AppTheme = 'light' | 'dark';

export function getInitialTheme(): AppTheme {
  if (typeof document === 'undefined') return 'light';
  const current = document.documentElement.dataset.theme;
  if (current === 'dark' || current === 'light') return current;
  if (document.documentElement.classList.contains('dark')) return 'dark';
  try {
    const saved = localStorage.getItem('ilm_theme_v2') || localStorage.getItem('ilm_theme');
    if (saved === 'dark') return 'dark';
    if (saved === 'light') return 'light';
  } catch {}
  return 'light';
}

export function useTheme(): {
  theme: AppTheme;
  isLight: boolean;
  isDark: boolean;
  setTheme: (t: AppTheme) => void;
  toggleTheme: () => void;
} {
  const [theme, setLocalTheme] = useState<AppTheme>(getInitialTheme);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const syncTheme = () => {
      const active = (document.documentElement.dataset.theme === 'dark' || document.documentElement.classList.contains('dark')) ? 'dark' : 'light';
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
    document.documentElement.dataset.theme = next;
    if (next === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    try {
      localStorage.setItem('ilm_theme', next);
      localStorage.setItem('ilm_theme_v2', next);
    } catch {}

    try {
      const wa = (window as any).Telegram?.WebApp;
      if (wa) {
        if (next === 'dark') {
          wa.setHeaderColor?.('#0f172a');
          wa.setBackgroundColor?.('#0f172a');
        } else {
          wa.setHeaderColor?.('#ffffff');
          wa.setBackgroundColor?.('#F8FAFC');
        }
      }
    } catch {}

    setLocalTheme(next);
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return {
    theme,
    isLight: theme === 'light',
    isDark: theme === 'dark',
    setTheme,
    toggleTheme,
  };
}
