'use client';

import { MotionConfig } from 'motion/react';

/* `reducedMotion="user"` — motion kutubxonasi tizim sozlamasini O'ZI hisobga oladi va
   transform/layout animatsiyalarini o'chiradi.

   Nega muhim: ilgari har bir komponent `useReducedMotion()` ni o'qib, `initial` ni
   shartli ravishda o'zgartirardi. Bu hook server tomonda `null`, klientda `boolean`
   qaytarganligi uchun SSR va klient HTML'i mos kelmay, hydration xatosi chiqardi.
   Endi shart bitta joyda — bu yerda. */
export default function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
