'use client';

import { motion } from 'motion/react';
import { dur, easeOut } from '@/lib/motion';

/* Kontent bloklarini pastdan yumshoq ko'tarib chiqaradi. `index` berilsa, ro'yxatdagi
   elementlar ketma-ket (stagger) chiqadi.
   
   Optimizatsiya: 5-elementdan keyin stagger kechikishi cheklanadi (cap), natijada
   uzun ro'yxatlarda (testlar, reyting, do'kon) brauzer va Telegram WebApp asosiy oqimi
   (main thread) bloklanmaydi, sahifalar 60/120 FPS da yengil ochiladi. */
export default function Reveal({
  children,
  index = 0,
  delay = 0,
  className,
  y = 12,
}: {
  children: React.ReactNode;
  index?: number;
  delay?: number;
  className?: string;
  y?: number;
}) {
  const cappedIndex = Math.min(index, 5);
  const effectiveDelay = delay + cappedIndex * 0.025;

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: dur.fast || 0.18, ease: easeOut, delay: effectiveDelay }}
    >
      {children}
    </motion.div>
  );
}
