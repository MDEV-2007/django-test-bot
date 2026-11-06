import React from 'react';

/* ─────────────────────────────────────────────────────────────
   IlmIldizi stiker-ikonkalari — Pastel Studio palitrasida chizilgan
   "yopishqoq" uslub: qora kontur, tekis pastel to'ldirish, oq yaltirash.
   Emoji o'rniga reaksiya, stiker va izoh matnlarida ishlatiladi.
   ───────────────────────────────────────────────────────────── */

const INK = '#080808';
const C = {
  purple: '#7659C7',
  orange: '#FFB82E',
  coral: '#F0523D',
  green: '#4C806B',
  blue: '#70B5D5',
  lilac: '#E6B5F2',
  cream: '#FFFCF7',
};

const S = { stroke: INK, strokeWidth: 1.8, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };

const GLYPHS = {
  fire: (
    <>
      <path {...S} fill={C.orange} d="M16 3c1.6 4.6 8 7.2 8 14.6a8 8 0 0 1-16 0c0-3.9 2.1-6.3 3.9-7.9.3 2.2 1.4 3.6 2.9 4C14.4 10.3 14.9 6.6 16 3Z" />
      <path {...S} fill={C.coral} d="M16 16c2.1 2.1 3.4 3.8 3.4 5.8a3.4 3.4 0 0 1-6.8 0c0-2 1.5-3.5 3.4-5.8Z" />
      <path d="M11.2 18.5c-.4 1.6-.2 3 .5 4.2" stroke={C.cream} strokeWidth={1.6} strokeLinecap="round" fill="none" />
    </>
  ),
  clap: (
    <>
      <path d="M5.5 7.5 7.6 10M9.6 4l.7 3.1M26.5 6.5l-2.3 2.4" stroke={INK} strokeWidth={1.8} strokeLinecap="round" />
      <rect {...S} x="8" y="9" width="9" height="17" rx="4.5" transform="rotate(-16 12.5 17.5)" fill={C.lilac} />
      <rect {...S} x="15" y="8" width="9" height="17" rx="4.5" transform="rotate(14 19.5 16.5)" fill={C.green} />
      <path d="M19 12.5v4" stroke={C.cream} strokeWidth={1.6} strokeLinecap="round" />
    </>
  ),
  trophy: (
    <>
      <path {...S} fill="none" d="M10 9H6.5v1.6a4.2 4.2 0 0 0 4.4 4.2M22 9h3.5v1.6a4.2 4.2 0 0 1-4.4 4.2" />
      <path {...S} fill={C.orange} d="M9.5 5.5h13V12a6.5 6.5 0 0 1-13 0V5.5Z" />
      <path {...S} fill={C.orange} d="M14.2 18.3h3.6v3.9h-3.6z" />
      <rect {...S} x="9.5" y="22.2" width="13" height="4.6" rx="1.6" fill={C.purple} />
      <path d="M13 8.5v3.4" stroke={C.cream} strokeWidth={1.6} strokeLinecap="round" />
    </>
  ),
  heart: (
    <>
      <path {...S} fill={C.coral} d="M16 27.2S5.5 20.9 5.5 13.6A5.8 5.8 0 0 1 16 10.2a5.8 5.8 0 0 1 10.5 3.4c0 7.3-10.5 13.6-10.5 13.6Z" />
      <path d="M9.6 13.2a2.8 2.8 0 0 1 2.4-2.1" stroke={C.cream} strokeWidth={1.7} strokeLinecap="round" fill="none" />
    </>
  ),
  brain: (
    <>
      <path {...S} fill={C.lilac} d="M16 7.2c-1.6-2.2-6.4-2.1-7.3 1.6-3.2.3-4.3 3.7-2.8 5.9-1.9 1.9-1.5 5.7 1.4 6.6.4 3.2 4 4.7 6.6 2.9L16 25V7.2Z" />
      <path {...S} fill={C.lilac} d="M16 7.2c1.6-2.2 6.4-2.1 7.3 1.6 3.2.3 4.3 3.7 2.8 5.9 1.9 1.9 1.5 5.7-1.4 6.6-.4 3.2-4 4.7-6.6 2.9L16 25V7.2Z" />
      <path d="M10.6 12.6c1.6 0 2.6 1.1 2.6 2.6M9.8 18.8c1.7-.3 3.1.3 3.6 1.9M21.4 12.6c-1.6 0-2.6 1.1-2.6 2.6M22.2 18.8c-1.7-.3-3.1.3-3.6 1.9" stroke={INK} strokeWidth={1.6} strokeLinecap="round" fill="none" />
    </>
  ),
  target: (
    <>
      <circle {...S} cx="14.5" cy="17.5" r="10.5" fill={C.coral} />
      <circle {...S} cx="14.5" cy="17.5" r="6.8" fill={C.cream} />
      <circle {...S} cx="14.5" cy="17.5" r="3.2" fill={C.coral} />
      <path d="M14.5 17.5 26 6" stroke={INK} strokeWidth={2} strokeLinecap="round" />
      <path {...S} fill={C.purple} d="M23 4.2h4.8V9L26 7.6 24.4 6Z" />
    </>
  ),
  coffee: (
    <>
      <path d="M11 4.5c-1.4 1.4 1.4 2.8 0 4.2M15.5 4.5c-1.4 1.4 1.4 2.8 0 4.2" stroke={INK} strokeWidth={1.7} strokeLinecap="round" fill="none" />
      <path {...S} fill="none" d="M22.5 14.5h1.6a3.1 3.1 0 0 1 0 6.2H22" />
      <path {...S} fill={C.blue} d="M6.5 12h16v6.5a7 7 0 0 1-7 7h-2a7 7 0 0 1-7-7V12Z" />
      <path d="M4.5 27.5h20" stroke={INK} strokeWidth={1.8} strokeLinecap="round" />
      <path d="M10 15.5v3" stroke={C.cream} strokeWidth={1.6} strokeLinecap="round" />
    </>
  ),
  books: (
    <>
      <rect {...S} x="4.5" y="21" width="23" height="5.5" rx="1.6" fill={C.coral} />
      <rect {...S} x="7" y="15.2" width="19" height="5.8" rx="1.6" fill={C.green} />
      <rect {...S} x="5.5" y="9.4" width="20" height="5.8" rx="1.6" fill={C.blue} />
      <path {...S} fill={C.orange} d="M19 9.4V5l1.8 1.4L22.6 5v4.4" />
      <path d="M8 23.8h3M10 18.1h3M8.5 12.3h3" stroke={C.cream} strokeWidth={1.5} strokeLinecap="round" />
    </>
  ),
  skull: (
    <>
      <path {...S} fill={C.cream} d="M16 4a10.5 10.5 0 0 0-10.5 10.5c0 3.5 1.7 5.9 3.7 7.3v4.2h13.6v-4.2c2-1.4 3.7-3.8 3.7-7.3A10.5 10.5 0 0 0 16 4Z" />
      <circle cx="11.8" cy="14.6" r="2.7" fill={INK} />
      <circle cx="20.2" cy="14.6" r="2.7" fill={INK} />
      <path d="M16 18.2l-1.3 2.5h2.6Z" fill={INK} />
      <path d="M13 26v-2.6M16 26v-2.6M19 26v-2.6" stroke={INK} strokeWidth={1.5} strokeLinecap="round" />
    </>
  ),
  crown: (
    <>
      <path {...S} fill={C.orange} d="M5 11l5.2 5.2L16 7l5.8 9.2L27 11l-2.6 11.5H7.6Z" />
      <rect {...S} x="7.3" y="22.5" width="17.4" height="4.3" rx="1.4" fill={C.purple} />
      <circle {...S} cx="5" cy="10.5" r="1.9" fill={C.coral} />
      <circle {...S} cx="16" cy="6.3" r="1.9" fill={C.coral} />
      <circle {...S} cx="27" cy="10.5" r="1.9" fill={C.coral} />
    </>
  ),
  party: (
    <>
      <path {...S} fill={C.orange} d="M5.5 27.5 11 12l9.5 9.5Z" />
      <path d="M9.2 17.6l5.2 5.2M7.6 22.2l2.6 2.6" stroke={INK} strokeWidth={1.5} strokeLinecap="round" />
      <circle {...S} cx="21.5" cy="7.5" r="1.6" fill={C.coral} />
      <rect {...S} x="24.4" y="15.4" width="3" height="3" rx=".6" transform="rotate(20 25.9 16.9)" fill={C.green} />
      <path d="M23 12.5c1.6-1.1 3.2-.6 3.8 1M14.2 6c.5 1.6 2.1 2.1 3.2 1.6" stroke={C.purple} strokeWidth={1.8} strokeLinecap="round" fill="none" />
    </>
  ),
  sparkle: (
    <>
      <path {...S} fill={C.orange} d="M14 4c.9 5.6 3.4 8.1 9 9-5.6.9-8.1 3.4-9 9-.9-5.6-3.4-8.1-9-9 5.6-.9 8.1-3.4 9-9Z" />
      <path {...S} fill={C.lilac} d="M24 19c.4 2.4 1.5 3.5 4 4-2.5.5-3.6 1.6-4 4-.4-2.4-1.5-3.5-4-4 2.5-.5 3.6-1.6 4-4Z" />
    </>
  ),
  bolt: (
    <path {...S} fill={C.orange} d="M18 3 7 18h7l-2 11 11-15h-7l2-11Z" />
  ),
} satisfies Record<string, React.ReactNode>;

export type IlmIconName = keyof typeof GLYPHS;

export function IlmIcon({ name, className, title }: { name: IlmIconName; className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} role={title ? 'img' : undefined} aria-hidden={title ? undefined : true} aria-label={title}>
      {GLYPHS[name]}
    </svg>
  );
}

/* Emoji → IlmIldizi ikonka. Eski izohlar va stiker matnlari ham shu orqali chiziladi. */
const EMOJI_MAP: Record<string, IlmIconName> = {
  '🔥': 'fire',
  '👏': 'clap',
  '🏆': 'trophy',
  '❤': 'heart',
  '🧠': 'brain',
  '🎯': 'target',
  '☕': 'coffee',
  '📚': 'books',
  '💀': 'skull',
  '👑': 'crown',
  '🎉': 'party',
  '✨': 'sparkle',
  '⚡': 'bolt',
};

const EMOJI_RE = new RegExp(`(${Object.keys(EMOJI_MAP).join('|')})\\uFE0F?`, 'gu');

/** Matndagi ma'lum emojilarni inline IlmIldizi ikonkalariga almashtiradi. */
export function withIlmIcons(text: string, iconClassName = 'mx-[0.08em] inline-block size-[1.3em] -translate-y-[0.1em] align-middle'): React.ReactNode {
  if (!text) return text;
  const parts: React.ReactNode[] = [];
  let last = 0;
  let i = 0;
  for (const m of text.matchAll(EMOJI_RE)) {
    const idx = m.index ?? 0;
    if (idx > last) parts.push(text.slice(last, idx));
    parts.push(<IlmIcon key={`ilm-${i++}`} name={EMOJI_MAP[m[1]]} className={iconClassName} />);
    last = idx + m[0].length;
  }
  if (parts.length === 0) return text;
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

/* Tez stikerlar — feed va reels uchun umumiy ro'yxat */
export const ILM_STICKERS: { icon: IlmIconName; label: string; text: string }[] = [
  { icon: 'brain', label: 'Daho', text: '🧠 Daho rejim yoqildi!' },
  { icon: 'target', label: 'Grand', text: "🎯 Grand kutmoqda, olg'a!" },
  { icon: 'coffee', label: 'Kofe', text: "☕ Abituriyent kofesi kuch bag'ishlasin!" },
  { icon: 'books', label: 'Kitob', text: '📚 Kitoblar titilgan, natija esa bomba!' },
  { icon: 'skull', label: 'Yiqitdi', text: '💀 Bu savol qiyin edi!' },
  { icon: 'crown', label: 'Chempion', text: '👑 Haqiqiy chempionlik natijasi!' },
];
