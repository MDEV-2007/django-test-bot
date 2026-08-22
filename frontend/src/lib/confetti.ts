'use client';

/* canvas-confetti — o'zi kichkina emas (~13 KB gzip) va u FAQAT nishonlash lahzasida
 * kerak bo'ladi: test yakunlangan, daraja ko'tarilgan, jangda g'alaba. Har bir sahifa uni
 * statik import qilganda esa kutubxona sahifa OCHILISHIDA yuklanardi — ya'ni foydalanuvchi
 * hech qachon ko'rmasligi mumkin bo'lgan effekt uchun birinchi chizishni sekinlashtirardi.
 *
 * Bu yerda u faqat chaqirilganda yuklanadi va modul keshida qoladi. */

type Confetti = typeof import('canvas-confetti');
type ConfettiOptions = Parameters<Confetti>[0];

let loader: Promise<Confetti> | null = null;

export function celebrate(options?: ConfettiOptions) {
  if (typeof window === 'undefined') return;
  if (!loader) loader = import('canvas-confetti').then((m) => m.default ?? m);
  loader
    .then((confetti) => confetti(options))
    .catch(() => { /* nishonlash effekti — yiqilsa ham ish davom etadi */ });
}
