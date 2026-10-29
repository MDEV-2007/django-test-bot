'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { BrandMark } from '@/components/BrandMark';
import { ChevronLeft, ShieldCheck, Sparkles, CheckCircle2, type LucideIcon } from 'lucide-react';
import AuthBackground from './AuthBackground';
import { dur, easeOut } from '@/lib/motion';

const SQUIRCLE_COLORS = [
  'bg-[#007AFF]',
  'bg-[#34C759]',
  'bg-[#FF9500]',
  'bg-[#5856D6]',
];

/* Apple ID / iCloud Sign-In Experience Shell */
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
    <div className="relative flex min-h-[100svh] flex-1 flex-col justify-between p-4 sm:p-6">
      <AuthBackground />

      {/* Top iOS Navigation Bar */}
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between py-2">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-full bg-white/80 dark:bg-[#1C1C1E]/80 backdrop-blur-xl px-3.5 py-2 text-[13px] font-semibold text-[#007AFF] border border-black/[0.06] dark:border-white/[0.08] shadow-2xs hover:bg-white dark:hover:bg-[#2C2C2E] active:scale-95 transition-all"
        >
          <ChevronLeft className="size-4 stroke-[2.5]" />
          <span>Bosh sahifa</span>
        </Link>

        <div className="inline-flex items-center gap-1.5 rounded-full bg-white/70 dark:bg-[#1C1C1E]/70 backdrop-blur-xl px-3 py-1.5 text-[11px] font-semibold text-[#8E8E93] border border-black/[0.05] dark:border-white/[0.08]">
          <ShieldCheck className="size-3.5 text-[#34C759]" />
          <span>IlmIldizi ID • Xavfsiz kirish</span>
        </div>
      </header>

      {/* Main Content Grid */}
      <div className="mx-auto my-auto grid w-full max-w-5xl items-center gap-10 py-6 lg:grid-cols-12 lg:gap-12">
        {/* Left Column — Apple Keynote Product Showcase (Desktop) */}
        <motion.div
          className="hidden lg:col-span-6 lg:flex lg:flex-col lg:justify-between space-y-8"
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: dur.slow, ease: easeOut }}
        >
          <div>
            <div className="mb-6 inline-flex items-center gap-3 rounded-[20px] bg-white/85 dark:bg-[#1C1C1E]/85 p-2.5 pr-4 border border-black/[0.06] dark:border-white/[0.08] shadow-sm backdrop-blur-xl">
              <div className="flex size-11 items-center justify-center rounded-[13px] bg-gradient-to-b from-[#34C759]/15 to-[#34C759]/5 border border-[#34C759]/25">
                <BrandMark size={30} />
              </div>
              <div>
                <p className="text-[16px] font-bold tracking-tight text-foreground leading-none">
                  Ilm<span className="text-[#34C759]">Ildizi</span>
                </p>
                <p className="mt-1 text-[11px] font-medium text-[#8E8E93]">
                  Milliy Sertifikat va BBA/DTM 2026 platformasi
                </p>
              </div>
            </div>

            <h2 className="text-[34px] xl:text-[38px] font-bold tracking-[-0.035em] leading-[1.1] text-foreground">
              Bitta hisob. Barcha imtihon va darslarga to&apos;liq kirish.
            </h2>
            <p className="mt-3.5 max-w-md text-[15px] leading-relaxed text-[#8E8E93]">
              Real vaqtdagi DTM ball bashorati, Milliy sertifikat diagnostikasi, 1v1 Bilim Arenasi va 24/7 AI Mentor — barchasi sizning shaxsiy kabinetingizda.
            </p>
          </div>

          {/* iOS Inset Grouped Feature List */}
          <div className="rounded-[24px] bg-white/90 dark:bg-[#1C1C1E]/90 border border-black/[0.06] dark:border-white/[0.08] divide-y divide-black/[0.05] dark:divide-white/[0.06] shadow-[0_8px_30px_rgba(0,0,0,0.04)] overflow-hidden">
            {points.map((p, i) => {
              const Icon = p.icon;
              const sqColor = SQUIRCLE_COLORS[i % SQUIRCLE_COLORS.length];
              return (
                <div
                  key={p.text}
                  className="flex items-center gap-3.5 px-4 py-3.5 text-[13.5px] font-medium text-foreground"
                >
                  <span
                    className={`flex size-8 shrink-0 items-center justify-center rounded-[9px] ${sqColor} text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]`}
                  >
                    <Icon className="size-4 stroke-[2.2]" />
                  </span>
                  <span className="leading-snug">{p.text}</span>
                </div>
              );
            })}
          </div>

          {/* Mini iOS Live Activity Preview Card */}
          <div className="flex items-center justify-between gap-4 rounded-[22px] bg-[#1C1C1E] p-4 text-white shadow-lg border border-white/10">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-[12px] bg-[#34C759]/20 text-[#34C759]">
                <Sparkles className="size-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[12px] font-bold text-white">Milliy Sertifikat A+ prognozi</span>
                  <CheckCircle2 className="size-3.5 text-[#34C759]" />
                </div>
                <p className="text-[11px] text-[#8E8E93]">
                  4,300+ abituriyent har kuni test yechmoqda
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="font-mono text-[18px] font-black text-[#34C759]">181.5</span>
              <span className="block text-[10px] text-[#8E8E93] font-mono">/ 189 ball</span>
            </div>
          </div>
        </motion.div>

        {/* Right Column — Apple ID Sign-In Card */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: dur.slow, ease: easeOut, delay: 0.05 }}
          className="mx-auto w-full max-w-[430px] lg:col-span-6"
        >
          <div className="rounded-[32px] bg-white dark:bg-[#1C1C1E] border border-black/[0.06] dark:border-white/[0.08] p-6 sm:p-8 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)] dark:shadow-[0_24px_64px_-12px_rgba(0,0,0,0.6)]">
            {/* Apple ID Style App Squircle Header */}
            <div className="mb-6 text-center">
              <div className="mx-auto mb-3.5 flex size-16 items-center justify-center rounded-[18px] bg-gradient-to-b from-[#F2F2F7] to-white dark:from-[#2C2C2E] dark:to-[#1C1C1E] border border-black/[0.08] dark:border-white/[0.1] shadow-[0_8px_20px_-4px_rgba(0,0,0,0.08)]">
                <BrandMark size={40} />
              </div>
              <h1 className="text-[24px] font-bold tracking-[-0.025em] text-foreground">
                {title}
              </h1>
              <p className="mt-1 text-[13.5px] text-[#8E8E93]">{description}</p>
            </div>

            {children}
          </div>

          {footer && (
            <div className="mt-5 text-center text-[13.5px] font-medium text-[#8E8E93]">
              {footer}
            </div>
          )}
        </motion.div>
      </div>

      {/* Bottom Copyright */}
      <footer className="mx-auto w-full max-w-5xl py-2 text-center text-[11px] text-[#8E8E93]">
        © 2026 IlmIldizi EdTech • Barcha ma&apos;lumotlar shifrlangan holda saqlanadi
      </footer>
    </div>
  );
}
