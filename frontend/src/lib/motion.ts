/* Motion tokenlari — butun sayt uchun bitta manba (UI_UX_ANALIZ_VA_REJA.md, 3.2-bo'lim).
   Qoida: interfeys uchun 180–280ms; kirish `ease-out` va tez, chiqish undan ~30% qisqa.
   Bir vaqtda faqat bitta e'tibor tortuvchi animatsiya bo'lsin. */
import type { Transition, Variants } from 'motion/react';

export const dur = {
  instant: 0.12,
  fast: 0.18,
  base: 0.24,
  slow: 0.36,
  page: 0.28,
} as const;

/* cubic-bezier(0.16, 1, 0.3, 1) — "expo out": tabiiy, tez boshlanib yumshoq to'xtaydi. */
export const easeOut = [0.16, 1, 0.3, 1] as const;
export const easeInOut = [0.65, 0, 0.35, 1] as const;

export const spring: Transition = { type: 'spring', stiffness: 320, damping: 30, mass: 0.8 };
/* Faqat mukofot / nishonlash lahzalari uchun — kundalik UI da ishlatilmaydi. */
export const springBouncy: Transition = { type: 'spring', stiffness: 400, damping: 18 };

/* Pastdan yumshoq ko'tarilib chiqish — kartalar va ro'yxat elementlari uchun. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: dur.base, ease: easeOut } },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: dur.base, ease: easeOut } },
};

/* Ro'yxat konteyneri: bolalari 40ms oralab ketma-ket chiqadi. */
export const staggerList = (stagger = 0.04, delay = 0): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: stagger, delayChildren: delay } },
});

/* Xato javob — qisqa "silkinish". Jazolash emas, e'tiborni qaratish uchun. */
export const shake = {
  x: [-5, 5, -4, 4, -2, 0],
  transition: { duration: 0.32, ease: easeInOut },
};
