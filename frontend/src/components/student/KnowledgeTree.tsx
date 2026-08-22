'use client';

import { motion, useReducedMotion } from 'motion/react';
import { easeOut } from '@/lib/motion';

/* "Bilim Ildizi" — brend metaforasining ko'rinadigan shakli.

   Butun chizma HAQIQIY ma'lumotdan hosil bo'ladi:
   - `level`   → shoxlar soni (har 1 daraja = 1 shox, 8 tagacha)
   - `xpProgress` → tananing balandligi (joriy darajadagi o'sish, 0–100%)
   - `streak`  → barglar soni va rangining "tiriklik" darajasi
   - `badges`  → tojdagi mevalar (har bir ochilgan yutuq = 1 meva)
   Hech qanday tasodifiy yoki bezak uchun qo'shilgan element yo'q — o'quvchi o'zining
   mehnatini ko'radi. */
export default function KnowledgeTree({
  level, xpProgress, streak, badges,
}: { level: number; xpProgress: number; streak: number; badges: number }) {
  const reduce = useReducedMotion();

  const branchCount = Math.min(8, Math.max(2, level));
  const trunkHeight = 92 + Math.round((xpProgress / 100) * 46); // 92–138px
  const trunkTopY = 200 - trunkHeight;

  // Streak barglarning zichligi va yorqinligini boshqaradi.
  // Streak nol bo'lsa ham daraxt "o'lik" ko'rinmasligi kerak — minimal kurtaklar qoladi.
  const leafCount = Math.min(20, Math.max(5, streak * 2));
  const vitality = Math.min(1, streak / 14);
  const leafColor = `color-mix(in oklab, var(--accent) ${40 + Math.round(vitality * 60)}%, #4b5563)`;

  const branches = Array.from({ length: branchCount }, (_, i) => {
    const side = i % 2 === 0 ? -1 : 1;
    const t = (i + 1) / (branchCount + 1);
    const y = trunkTopY + 14 + t * (trunkHeight - 24);
    const len = 26 + (1 - t) * 26;
    return { side, y, len, i };
  });

  const leaves = Array.from({ length: leafCount }, (_, i) => {
    const b = branches[i % branches.length];
    const along = 0.55 + ((i * 0.17) % 0.45);
    return {
      x: 110 + b.side * b.len * along,
      y: b.y - 6 - ((i * 7) % 14),
      r: 4 + ((i * 3) % 3),
      i,
    };
  });

  const fruits = Array.from({ length: Math.min(12, badges) }, (_, i) => ({
    x: 110 + (i % 2 === 0 ? -1 : 1) * (14 + ((i * 11) % 40)),
    y: trunkTopY + 6 + ((i * 13) % Math.max(20, trunkHeight - 20)),
    i,
  }));

  return (
    <svg viewBox="0 0 220 240" className="h-56 w-full" role="img" aria-label="Bilim ildizi daraxti">
      {/* Yer chizig'i */}
      <ellipse cx="110" cy="202" rx="62" ry="7" fill="var(--surface-hover)" />
      <line x1="34" y1="202" x2="186" y2="202" stroke="var(--border-card)" strokeWidth="1.5" />

      {/* Ildizlar — daraja qanchalik baland bo'lsa, shunchalik chuqur */}
      {[-1, 1].map((side) => (
        <path
          key={side}
          d={`M110 202 Q ${110 + side * 24} ${212 + level * 1.5} ${110 + side * 44} ${220 + level * 2}`}
          fill="none"
          stroke="var(--text-faint)"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.65"
        />
      ))}

      {/* Tana */}
      <motion.rect
        x="104" width="12" rx="6"
        fill="color-mix(in oklab, var(--accent) 22%, #4b5563)"
        initial={{ height: 0, y: 200 }}
        animate={{ height: trunkHeight, y: trunkTopY }}
        transition={{ duration: 0.7, ease: easeOut }}
      />

      {/* Shoxlar */}
      {branches.map((b) => (
        <motion.path
          key={b.i}
          d={`M110 ${b.y} Q ${110 + b.side * b.len * 0.6} ${b.y - 6} ${110 + b.side * b.len} ${b.y - 16}`}
          fill="none"
          stroke="color-mix(in oklab, var(--accent) 30%, #4b5563)"
          strokeWidth="3"
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: easeOut, delay: 0.35 + b.i * 0.07 }}
        />
      ))}

      {/* Barglar — streak */}
      {leaves.map((l) => (
        <motion.circle
          key={l.i}
          cx={l.x} cy={l.y} r={l.r}
          fill={leafColor}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.9 }}
          transition={{ duration: 0.35, ease: easeOut, delay: 0.6 + l.i * 0.03 }}
          style={{ transformOrigin: `${l.x}px ${l.y}px` }}
        />
      ))}

      {/* Mevalar — ochilgan yutuqlar */}
      {fruits.map((f) => (
        <motion.circle
          key={f.i}
          cx={f.x} cy={f.y} r="3.5"
          fill="var(--warning-text)"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.3, ease: easeOut, delay: 0.9 + f.i * 0.05 }}
          style={{ transformOrigin: `${f.x}px ${f.y}px` }}
        />
      ))}
    </svg>
  );
}
