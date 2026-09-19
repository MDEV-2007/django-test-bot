'use client';

import { useEffect, useState } from 'react';
import { Sun, Moon, Volume2, VolumeX } from 'lucide-react';
import { isAudioEnabled, setAudioEnabled, soundFX } from '@/lib/soundFX';

/* Ovoz va tema tugmalari — kunlik ishlatilmaydigan sozlamalar, shuning uchun
   Hisobim/Profil sahifasida turadi, tepa header'da emas (Telegram Mini App'da
   Telegram o'zining header'ini chizadi, ustiga bizniki qo'shilsa ekran ~15%
   ikki qavat header'ga ketadi). */
export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    if (typeof document !== 'undefined' && document.documentElement.dataset.tg === 'on') {
      document.documentElement.dataset.theme = 'light';
      setDark(false);
      return;
    }
    const saved = localStorage.getItem('ilm_theme_v2');
    const isDark = saved === 'dark';
    setDark(isDark);
    document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
  }, []);

  function toggle() {
    if (typeof document !== 'undefined' && document.documentElement.dataset.tg === 'on') {
      return;
    }
    const next = !dark;
    setDark(next);
    document.documentElement.dataset.theme = next ? 'dark' : 'light';
    localStorage.setItem('ilm_theme_v2', next ? 'dark' : 'light');
  }

  // Telegram Mini App ichida doim light mode
  if (typeof document !== 'undefined' && document.documentElement.dataset.tg === 'on') {
    return null;
  }

  return (
    <button
      onClick={toggle}
      className="flex min-h-12 w-full items-center gap-3 rounded-xl px-2.5 text-left text-sm text-foreground active:bg-accent"
    >
      {dark ? <Sun className="size-4 shrink-0 text-amber-400" /> : <Moon className="size-4 shrink-0 text-[var(--accent-text)]" />}
      Mavzu: {dark ? "Tungi" : "Kunduzgi"}
    </button>
  );
}

export function AudioToggle() {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => { setEnabled(isAudioEnabled()); }, []);

  function toggle() {
    const next = !enabled;
    setEnabled(next);
    setAudioEnabled(next);
    if (next) soundFX.click();
  }

  return (
    <button
      onClick={toggle}
      className="flex min-h-12 w-full items-center gap-3 rounded-xl px-2.5 text-left text-sm text-foreground active:bg-accent"
    >
      {enabled ? <Volume2 className="size-4 shrink-0 text-[var(--accent-text)]" /> : <VolumeX className="size-4 shrink-0 text-muted-foreground" />}
      Ovozli effektlar: {enabled ? "Yoqilgan" : "O'chirilgan"}
    </button>
  );
}
