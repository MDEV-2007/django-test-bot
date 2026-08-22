'use client';

import { motion, useReducedMotion } from 'motion/react';
import { easeOut } from '@/lib/motion';

/* Brendga mos yuklanish animatsiyasi: "Yuklanmoqda..." matni o'rniga o'sib chiqayotgan
   ILDIZ va kurtak. Metafora loyiha nomidan olingan (IlmIldizi) — ildizlar pastga tortiladi,
   tana ko'tariladi, kurtak ochiladi va halqa aylanadi.

   Yengil: bitta inline SVG, tashqi fayl yo'q. `prefers-reduced-motion` da harakat
   o'chadi va statik belgi qoladi. */
export default function BrandLoader({
  label = 'Yuklanmoqda',
  size = 72,
  className,
}: { label?: string | null; size?: number; className?: string }) {
  const reduce = useReducedMotion();
  const loop = { duration: 1.6, ease: easeOut, repeat: Infinity, repeatType: 'loop' as const };

  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className ?? ''}`}>
      <div className="relative" style={{ width: size, height: size }}>
        {/* Aylanuvchi halqa — "ish ketyapti" signali */}
        {!reduce && (
          <motion.span
            className="absolute inset-0 rounded-full border-2 border-transparent border-t-[var(--accent)] border-r-[var(--accent)]/40"
            animate={{ rotate: 360 }}
            transition={{ duration: 1.1, ease: 'linear', repeat: Infinity }}
          />
        )}
        <span className="absolute inset-0 rounded-full border border-[var(--border-card)]" />

        <svg viewBox="0 0 48 48" className="absolute inset-0 m-auto" style={{ width: size * 0.62, height: size * 0.62 }}>
          {/* Ildizlar */}
          {[-1, 1].map((side) => (
            <motion.path
              key={side}
              d={`M24 34 Q ${24 + side * 5} 39 ${24 + side * 9} 42`}
              fill="none"
              stroke="var(--accent)"
              strokeOpacity="0.45"
              strokeWidth="2"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: [0, 1, 1] }}
              transition={{ ...loop, delay: side === -1 ? 0 : 0.12 }}
            />
          ))}

          {/* Tana */}
          <motion.line
            x1="24" x2="24" y1="34"
            stroke="var(--accent)"
            strokeWidth="2.5"
            strokeLinecap="round"
            initial={{ y2: 34 }}
            animate={{ y2: [34, 18, 18] }}
            transition={loop}
          />

          {/* Ikkita barg — kurtakning ochilishi */}
          {[-1, 1].map((side) => (
            <motion.ellipse
              key={side}
              cx={24 + side * 6} cy="20" rx="6" ry="3.6"
              fill="var(--accent)"
              fillOpacity="0.85"
              transform={`rotate(${side * -25} ${24 + side * 6} 20)`}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0, 1, 1], opacity: [0, 1, 1] }}
              transition={{ ...loop, delay: 0.35 + (side === -1 ? 0 : 0.1) }}
              style={{ transformOrigin: `${24 + side * 2}px 20px` }}
            />
          ))}
        </svg>
      </div>

      {label && (
        <motion.p
          className="font-mono text-xs uppercase tracking-widest text-muted-foreground"
          animate={reduce ? undefined : { opacity: [0.45, 1, 0.45] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        >
          {label}
        </motion.p>
      )}
    </div>
  );
}
