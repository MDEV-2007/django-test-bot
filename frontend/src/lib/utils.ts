import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Katta sonlarni ixcham ko'rsatish: 9 999 gacha to'liq (masalan 4 985),
 * undan katta — 12.5K, 100K, 1.2M, 3B. Kartalarga sig'masligi uchun.
 */
export function formatCompact(value: number | null | undefined, fullBelow = 10_000): string {
  const n = Number(value) || 0;
  const abs = Math.abs(n);
  if (abs < fullBelow) return n.toLocaleString('uz-UZ');
  const units: [number, string][] = [[1e9, 'B'], [1e6, 'M'], [1e3, 'K']];
  for (const [size, suffix] of units) {
    if (abs >= size) {
      const v = n / size;
      // 100 dan katta bo'lsa kasr kerak emas (100K, 250M); kichiklarda bitta xona (12.5K)
      const rounded = Math.abs(v) >= 100 ? Math.floor(v) : Math.floor(v * 10) / 10;
      return `${String(rounded).replace(/\.0$/, '')}${suffix}`;
    }
  }
  return n.toLocaleString('uz-UZ');
}
