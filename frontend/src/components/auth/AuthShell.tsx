'use client';

import { motion, useReducedMotion } from 'motion/react';
import { BrandMark } from '@/components/BrandMark';
import { type LucideIcon } from 'lucide-react';
import AuthBackground from './AuthBackground';
import { Card, CardContent } from '@/components/ui/card';
import { dur, easeOut } from '@/lib/motion';

/* Kirish/ro'yxat sahifalarining umumiy karkasi.

   Ilgari ikkala sahifa ham ekran o'rtasida yolg'iz turgan tor karta edi: chap va o'ng
   tomonda ~700px bo'sh joy, brend haqida hech qanday gap yo'q, sarlavha va tavsif
   markazda siqilgan. Endi desktopda ikki ustun — chapda brend va va'da, o'ngda forma;
   mobilda esa faqat forma (brend bloki yig'iladi). */
export default function AuthShell({
  title, description, points, children, footer,
}: {
  title: string;
  description: string;
  points: { icon: LucideIcon; text: string }[];
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const reduce = useReducedMotion();

  return (
    <div className="relative flex min-h-[100svh] flex-1 items-center justify-center p-4 sm:p-6">
      <AuthBackground />

      <div className="grid w-full max-w-5xl items-center gap-10 lg:grid-cols-2 lg:gap-16">
        {/* Brend ustuni — faqat kattaroq ekranlarda */}
        <motion.div
          className="hidden lg:block"
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: dur.slow, ease: easeOut }}
        >
          <div className="mb-6 flex items-center gap-3">
            <BrandMark size={48} />
            <div>
              <p className="font-voice text-xl font-bold leading-none">IlmIldizi</p>
              <p className="mt-1 text-xs text-muted-foreground">Milliy Sertifikat &amp; BBA tayyorgarlik</p>
            </div>
          </div>

          <h2 className="font-voice max-w-md text-3xl font-bold leading-tight">
            Bilim — ildiz otganda mustahkam bo&apos;ladi
          </h2>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-[var(--text-secondary)]">
            Har bir yechilgan test, tuzatilgan xato va o&apos;qilgan dars sizning bilim
            ildizingizni chuqurlashtiradi. Platforma o&apos;sishingizni kuzatib boradi va
            keyingi qadamni aynan siz uchun tanlaydi.
          </p>

          <ul className="mt-8 space-y-3">
            {points.map((p, i) => {
              const Icon = p.icon;
              return (
                <motion.li
                  key={p.text}
                  className="flex items-center gap-3 text-sm text-[var(--text-secondary)]"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: dur.base, ease: easeOut, delay: 0.15 + i * 0.08 }}
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-[var(--accent-border)] bg-[var(--accent-soft)] text-[var(--accent-text)]">
                    <Icon className="size-4" />
                  </span>
                  {p.text}
                </motion.li>
              );
            })}
          </ul>
        </motion.div>

        {/* Forma ustuni */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: dur.slow, ease: easeOut, delay: 0.05 }}
          className="mx-auto w-full max-w-md"
        >
          <Card className="border-[var(--border-strong)]/60 shadow-2xl backdrop-blur-sm">
            <CardContent className="p-6 sm:p-8">
              {/* Mobil uchun kichik brend belgisi — desktopda chap ustun bor. */}
              <div className="mb-6 text-center lg:text-left">
                <span className="mx-auto mb-4 flex justify-center lg:hidden">
                  <BrandMark size={48} />
                </span>
                <h1 className="font-voice text-2xl font-bold">{title}</h1>
                <p className="mt-1.5 text-sm text-[var(--text-secondary)]">{description}</p>
              </div>

              {children}
            </CardContent>
          </Card>

          {footer && <div className="mt-4 text-center text-sm text-muted-foreground">{footer}</div>}
        </motion.div>
      </div>
    </div>
  );
}
