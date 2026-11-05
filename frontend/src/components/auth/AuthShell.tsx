'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'motion/react';
import { BrandMark } from '@/components/BrandMark';
import { ChevronLeft, ShieldCheck, type LucideIcon } from 'lucide-react';
import { dur, easeOut } from '@/lib/motion';

/* Har bir afzallik — o'z rangidagi doira (pastel palitra) */
const POINT_TONES = [
  'bg-[var(--ps-purple)] text-white',
  'bg-[var(--ps-orange)] text-[#080808]',
  'bg-[var(--ps-green)] text-white',
  'bg-[var(--ps-coral)] text-white',
];

/* Kirish / ro'yxatdan o'tish qobig'i — dashboard bilan bir xil "Pastel Studio" uslubi */
export default function AuthShell({
  title,
  description,
  points,
  children,
  footer,
}: {
  title: string;
  description: string;
  points: { icon: LucideIcon; text: string }[];
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="theme-pastel relative flex min-h-[100svh] flex-1 flex-col justify-between overflow-x-clip p-4 sm:p-6">
      {/* Yuqori qator */}
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-2 py-2">
        <Link href="/" className="ps-chip transition-transform hover:-translate-x-0.5">
          <ChevronLeft className="size-4" /> Bosh sahifa
        </Link>
        <span className="ps-chip">
          <ShieldCheck className="size-3.5 text-[var(--ps-green)]" /> IlmIldizi ID · xavfsiz kirish
        </span>
      </header>

      <div className="mx-auto my-auto grid w-full max-w-6xl items-center gap-10 py-6 lg:grid-cols-12 lg:gap-14">
        {/* Chap ustun — brend kompozitsiyasi (desktop) */}
        <motion.div
          className="hidden lg:col-span-6 lg:block"
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: dur.slow, ease: easeOut }}
        >
          <span className="ps-chip">
            <BrandMark size={22} rounded="rounded-full" />
            Ilm<span className="-ml-1.5 text-[var(--ps-purple)]">Ildizi</span>
            <span className="text-[var(--text-muted)]">· Milliy sertifikat va DTM 2026</span>
          </span>

          <h2 className="ps-display mt-6 text-[52px] xl:text-[64px]">
            Bitta hisob.
            <br />
            Barcha{' '}
            <span className="relative inline-block text-[var(--ps-purple)]">
              imtihonlar
              <svg aria-hidden viewBox="0 0 300 24" preserveAspectRatio="none" className="absolute -bottom-2 left-0 h-3 w-full text-[var(--ps-orange)] sm:-bottom-3 sm:h-4">
                <path className="ps-draw" d="M4 16 C 60 4, 120 22, 180 10 S 270 8, 296 14" fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" pathLength={1} />
              </svg>
            </span>
            <span className="text-[var(--ps-coral)]">.</span>
          </h2>
          <p className="mt-7 max-w-md text-[15px] leading-relaxed text-[var(--text-secondary)]">
            DTM ball bashorati, Milliy sertifikat diagnostikasi, 1v1 bilim arenasi va 24/7 AI mentor — barchasi shaxsiy kabinetingizda.
          </p>

          <div className="mt-8 grid grid-cols-[auto_1fr] items-center gap-6">
            {/* Maskot doirada */}
            <div className="relative size-40 xl:size-44">
              <div aria-hidden className="absolute inset-0 rounded-full bg-[var(--ps-orange)]" />
              <div aria-hidden className="absolute -bottom-1 -left-3 size-14 rounded-tr-full bg-[var(--ps-purple)]" />
              <div className="absolute inset-[9%] overflow-hidden rounded-full border-[5px] border-[#FFFCF7] bg-[var(--ps-sky)]">
                <Image src="/images/mascot-hero.jpg" alt="IlmIldizi maskoti" fill sizes="176px" className="scale-[1.35] object-cover object-[52%_40%]" />
              </div>
            </div>
            {/* Afzalliklar */}
            <ul className="space-y-2.5">
              {points.map((p, i) => {
                const Icon = p.icon;
                return (
                  <li key={p.text} className="flex items-center gap-3 rounded-full bg-[var(--ps-paper)] py-1.5 pl-1.5 pr-4 shadow-[var(--ds-panel-shadow)]">
                    <span className={`flex size-9 shrink-0 items-center justify-center rounded-full ${POINT_TONES[i % POINT_TONES.length]}`}>
                      <Icon className="size-4" />
                    </span>
                    <span className="text-[13px] font-semibold leading-snug">{p.text}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </motion.div>

        {/* O'ng ustun — forma kartasi */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: dur.slow, ease: easeOut, delay: 0.05 }}
          className="mx-auto w-full max-w-[460px] lg:col-span-6"
        >
          <div className="ps-card relative overflow-hidden !rounded-[32px] p-6 sm:p-8">
            <div aria-hidden className="pointer-events-none absolute -right-14 -top-14 size-40 rounded-full bg-[var(--ps-purple)] opacity-15" />
            <div className="relative mb-6">
              <span className="inline-flex size-14 items-center justify-center rounded-[18px] bg-[var(--ps-neutral)] ring-4 ring-[var(--ps-lilac)]">
                <BrandMark size={40} rounded="rounded-[14px]" />
              </span>
              <h1 className="ps-display mt-5 text-[32px] sm:text-[38px]">{title}</h1>
              <p className="mt-2 text-[14px] text-[var(--text-muted)]">{description}</p>
            </div>
            <div className="relative">{children}</div>
          </div>

          {footer && (
            <div className="mt-5 text-center text-[13.5px] font-medium text-[var(--text-secondary)]">{footer}</div>
          )}
        </motion.div>
      </div>

      <footer className="mx-auto w-full max-w-6xl py-2 text-center text-[12px] text-[var(--text-muted)]">
        © 2026 IlmIldizi EdTech · Barcha ma&apos;lumotlar shifrlangan holda saqlanadi
      </footer>
    </div>
  );
}
