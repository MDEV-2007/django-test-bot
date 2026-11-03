/* Ro'yxatdan o'tish manbasi (birinchi tegish).
   Reklama havolasi: ilmildizi.uz/dtm-test?src=ig_w1_a (yoki ?utm_source=instagram&utm_campaign=w1).
   Birinchi kelgan belgi 30 kun saqlanadi va ro'yxatdan o'tishda backend'ga yuboriladi —
   foydalanuvchi bir necha kundan keyin qaytib ro'yxatdan o'tsa ham manba yo'qolmaydi. */

const KEY = 'ilm_src';
const TTL_MS = 30 * 24 * 60 * 60 * 1000;

type Stored = { v: string; t: number };

function clean(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const v = raw.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, '').slice(0, 64);
  return v || null;
}

/** URL'dagi belgini o'qib, hali saqlanmagan bo'lsa saqlaydi (birinchi tegish yutadi). */
export function captureSource(): void {
  if (typeof window === 'undefined') return;
  try {
    const q = new URLSearchParams(window.location.search);
    const src = clean(q.get('src'))
      || clean([q.get('utm_source'), q.get('utm_campaign')].filter(Boolean).join('_'));
    if (!src) return;
    const existing = readStored();
    if (existing) return;
    localStorage.setItem(KEY, JSON.stringify({ v: src, t: Date.now() } satisfies Stored));
  } catch {
    // localStorage yopiq bo'lishi mumkin (maxfiy rejim) — manba shunchaki yozilmaydi.
  }
}

function readStored(): Stored | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Stored;
    if (!parsed?.v || Date.now() - parsed.t > TTL_MS) {
      localStorage.removeItem(KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/** Ro'yxatdan o'tish so'roviga qo'shiladigan manba (yo'q bo'lsa undefined). */
export function getSource(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  return readStored()?.v;
}
