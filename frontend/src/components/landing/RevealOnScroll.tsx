'use client';

import { motion } from 'motion/react';
import { dur, easeOut } from '@/lib/motion';

/* `Reveal` dan farqi: bu blok EKRANGA KIRGANDA jonlanadi.
   Uzun landing sahifasida barcha bo'limni bir vaqtda animatsiya qilish ma'nosiz —
   foydalanuvchi ularning ko'pini o'sha paytda ko'rmaydi.

   Reduced-motion `MotionProvider` (MotionConfig reducedMotion="user") orqali global
   hal qilinadi, shuning uchun bu yerda shartli render yo'q. */
export default function RevealOnScroll({
  children,
  index = 0,
  className,
  y = 16,
}: {
  children: React.ReactNode;
  index?: number;
  className?: string;
  y?: number;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: dur.slow, ease: easeOut, delay: index * 0.06 }}
    >
      {children}
    </motion.div>
  );
}
