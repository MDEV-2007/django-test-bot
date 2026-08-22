'use client';

import { motion } from 'motion/react';
import { dur, easeOut } from '@/lib/motion';

/* Kontent bloklarini pastdan yumshoq ko'tarib chiqaradi. `index` berilsa, ro'yxatdagi
   elementlar ketma-ket (stagger) chiqadi.

   Reduced-motion `MotionProvider` (MotionConfig reducedMotion="user") orqali global
   hal qilinadi — bu yerda shartli render YO'Q, aks holda server va klient HTML'i
   farq qilib, hydration xatosi chiqadi. */
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
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: dur.base, ease: easeOut, delay: delay + index * 0.04 }}
    >
      {children}
    </motion.div>
  );
}
