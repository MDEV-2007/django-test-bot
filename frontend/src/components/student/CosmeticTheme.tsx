'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/lib/auth-store';

/* Do'kondan sotib olingan MAVZU (theme) rangini butun interfeysga qo'llaydi. */

function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** `amount` musbat — ochroq, manfiy — to'qroq (0..1 oralig'ida). */
function shift([r, g, b]: [number, number, number], amount: number) {
  const mix = (c: number) => (amount >= 0
    ? Math.round(c + (255 - c) * amount)
    : Math.round(c * (1 + amount)));
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

const VARS = [
  '--accent', '--accent-hover', '--accent-soft', '--accent-border', '--accent-text', '--on-accent',
  '--primary', '--primary-foreground', '--color-primary', '--color-brand',
];

export default function CosmeticTheme() {
  const accent = useAuthStore((s) => s.user?.cosmetics?.theme?.payload?.accent);

  useEffect(() => {
    const root = document.documentElement;
    const rgb = accent ? hexToRgb(accent) : null;

    if (!rgb) {
      VARS.forEach((v) => root.style.removeProperty(v));
      return;
    }

    const [r, g, b] = rgb;
    const isLight = root.dataset.theme === 'light';
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    const onAccent = luminance > 0.62 ? '#0b1220' : '#ffffff';

    root.style.setProperty('--accent', accent!);
    root.style.setProperty('--accent-hover', shift(rgb, isLight ? -0.22 : -0.16));
    root.style.setProperty('--accent-soft', `rgba(${r}, ${g}, ${b}, ${isLight ? 0.14 : 0.16})`);
    root.style.setProperty('--accent-border', `rgba(${r}, ${g}, ${b}, ${isLight ? 0.32 : 0.35})`);
    root.style.setProperty('--accent-text', isLight ? shift(rgb, -0.35) : shift(rgb, 0.28));
    root.style.setProperty('--on-accent', onAccent);

    // Asosiy primary ranglarni ham to'g'ridan-to'g'ri yangilaymiz
    root.style.setProperty('--primary', accent!);
    root.style.setProperty('--primary-foreground', onAccent);
    root.style.setProperty('--color-primary', accent!);
    root.style.setProperty('--color-brand', accent!);

    return () => { VARS.forEach((v) => root.style.removeProperty(v)); };
  }, [accent]);

  return null;
}
