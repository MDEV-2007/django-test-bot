'use client';

import { motion } from 'motion/react';
import { dur, easeOut } from '@/lib/motion';

/* Next.js `template.tsx` har bir navigatsiyada QAYTA yaratiladi (layout'dan farqi shu) —
   shuning uchun sahifa o'tish animatsiyasi aynan shu yerda bo'ladi.

   DIQQAT: bu yerda faqat `opacity` animatsiya qilinadi, `transform` EMAS. AppShell'dagi
   sidebar va mobil tab-bar `position: fixed` — transformlangan ota element ular uchun
   yangi "containing block" yaratib, panellarni joyidan siljitib yuborardi. Kontent
   ichidagi 12px ko'tarilish esa `Reveal` orqali sahifa ichida beriladi. */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      className="flex min-h-full flex-1 flex-col"
      initial={{ opacity: 0.4 }}
      animate={{ opacity: 1 }}
      transition={{ duration: dur.page, ease: easeOut }}
    >
      {children}
    </motion.div>
  );
}
