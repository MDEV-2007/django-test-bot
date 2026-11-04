'use client';

/* /tests sahifasining yuqori qismi — dashboard bilan bir xil "Pastel Studio" uslubida.
   Faqat ko'rinish: barcha raqamlar va harakatlar sahifadan (real API va mavjud handlerlar) keladi. */

import { motion } from 'motion/react';
import { ArrowUpRight, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const EASE = [0.22, 1, 0.36, 1] as const;

export type PastelMode = {
  key: 'standard' | 'blitz' | 'stress' | 'sprint';
  icon: LucideIcon;
  title: string;
  subtitle: string;
  description: string;
  chips: string[];
  cta: string;
  stats: { value: React.ReactNode; label: string }[];
};

/* Har bir rejim — o'z rangi va o'lchami (bir xil kartalar qatori emas). */
const MODE_LOOK: Record<PastelMode['key'], { card: string; span: string; dark: boolean }> = {
  standard: { card: 'ps-ink', span: 'lg:col-span-7', dark: true },
  blitz: { card: 'ps-orange', span: 'lg:col-span-5', dark: false },
  stress: { card: 'ps-coral', span: 'lg:col-span-5', dark: true },
  sprint: { card: 'ps-purple', span: 'lg:col-span-7', dark: true },
};

export function TestsHero({
  eyebrow,
  testsCount,
  attempts,
  avgScore,
}: {
  eyebrow: string;
  testsCount?: number;
  attempts?: number;
  avgScore?: number;
}) {
  const fmt = (n?: number) => (n == null ? '—' : n.toLocaleString('uz-UZ'));
  return (
    <section className="relative grid items-center gap-8 pt-2 lg:grid-cols-[1.25fr_0.75fr] lg:pt-4">
      <div className="relative z-10 min-w-0">
        <motion.div
          className="flex flex-wrap items-center gap-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
        >
          <span className="ps-chip">
            <span className="size-2 rounded-full bg-[var(--ps-coral)]" /> {eyebrow}
          </span>
          {attempts != null && attempts > 0 && <span className="ps-chip">{fmt(attempts)} ta urinish</span>}
        </motion.div>

        <motion.h1
          className="ps-display mt-5 text-[46px] sm:text-[68px] xl:text-[80px]"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE, delay: 0.05 }}
        >
          Test rejimini{' '}
          <span className="relative inline-block text-[var(--ps-purple)]">
            tanlang
            <svg
              aria-hidden
              viewBox="0 0 300 24"
              preserveAspectRatio="none"
              className="absolute -bottom-2 left-0 h-3 w-full text-[var(--ps-orange)] sm:-bottom-3 sm:h-4"
            >
              <path
                className="ps-draw"
                d="M4 16 C 60 4, 120 22, 180 10 S 270 8, 296 14"
                fill="none"
                stroke="currentColor"
                strokeWidth="7"
                strokeLinecap="round"
                pathLength={1}
              />
            </svg>
          </span>
          <span className="text-[var(--ps-coral)]">.</span>
        </motion.h1>

        <motion.p
          className="mt-7 max-w-lg text-[15px] leading-relaxed text-[var(--text-secondary)]"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE, delay: 0.15 }}
        >
          Har bir rejim turli maqsad uchun: to&apos;liq baholash, tezkor sinov, real zal bosimi yoki kundalik sprint.
        </motion.p>
      </div>

      {/* Raqamli kompozitsiya: o'rtacha ball — katta doira, atrofida real ko'rsatkichlar */}
      <motion.div
        className="relative mx-auto aspect-square w-full max-w-[230px] sm:max-w-[340px]"
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.9, ease: EASE, delay: 0.1 }}
      >
        <div aria-hidden className="absolute inset-[4%] rounded-full bg-[var(--ps-orange)]" />
        <div aria-hidden className="absolute -left-3 bottom-[2%] size-[34%] rounded-tr-full bg-[var(--ps-purple)]" />
        <div aria-hidden className="ps-dots absolute right-0 top-0 size-[28%] rounded-2xl text-[var(--ps-ink)] opacity-25" />
        <div aria-hidden className="ps-spin absolute -right-1 bottom-[10%] size-[20%] text-[var(--ps-ink)]">
          <svg viewBox="0 0 100 100" className="size-full">
            <path d="M50 0 L61 39 L100 50 L61 61 L50 100 L39 61 L0 50 L39 39 Z" fill="currentColor" />
          </svg>
        </div>

        <div className="absolute inset-[16%] flex flex-col items-center justify-center rounded-full border-[6px] border-[#FFFCF7] bg-[#080808] text-[#FFFCF7] shadow-[0_30px_60px_-30px_rgba(40,20,80,0.7)]">
          <span className="ps-eyebrow text-[#FFFCF7]/60">O&apos;rtacha ball</span>
          <span className="ps-num mt-1 text-[56px] sm:text-[68px]">
            {avgScore == null ? '—' : Math.round(avgScore)}
            {avgScore != null && <span className="text-[0.45em] text-[var(--ps-orange)]">%</span>}
          </span>
        </div>

        <div className="ps-float absolute -left-2 top-[14%] sm:-left-6">
          <span className="ps-chip text-[13px]">{fmt(testsCount)} ta test</span>
        </div>
        <div className="ps-float-slow absolute -right-1 top-[46%] sm:-right-5">
          <span className="ps-chip !bg-[#080808] !text-[#FFFCF7] text-[13px]">{fmt(attempts)} urinish</span>
        </div>
      </motion.div>
    </section>
  );
}

export function ModeBento({
  modes,
  activeKey,
  busyKey,
  onAction,
  t,
}: {
  modes: PastelMode[];
  activeKey: string;
  busyKey?: string | null;
  onAction: (key: PastelMode['key']) => void;
  t: (s: string) => string;
}) {
  return (
    <section aria-label="Test rejimlari" className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-12">
      {modes.map((m, i) => {
        const look = MODE_LOOK[m.key];
        const Icon = m.icon;
        const active = m.key === activeKey;
        return (
          <motion.article
            key={m.key}
            className={cn('min-w-0', look.span)}
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.6, ease: EASE, delay: (i % 2) * 0.08 }}
          >
            <div
              role="button"
              tabIndex={0}
              aria-pressed={m.key === 'sprint' ? undefined : active}
              onClick={() => onAction(m.key)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onAction(m.key);
                }
              }}
              className={cn(
                'ps-card ps-lift relative flex h-full cursor-pointer flex-col overflow-hidden !border-0 p-6 outline-none focus-visible:ring-4 focus-visible:ring-white/60 sm:p-7',
                look.card,
                active && m.key !== 'sprint' && 'ps-mode-active',
              )}
            >
              {/* Dekor */}
              <div aria-hidden className="absolute -right-12 -top-12 size-44 rounded-full bg-white/15" />
              {i % 2 === 0 ? (
                <div aria-hidden className="ps-stripes absolute -bottom-8 right-10 size-28 rounded-full text-white/20" />
              ) : (
                <div aria-hidden className="ps-dots absolute bottom-6 right-6 size-20 text-black/20" />
              )}

              <div className="relative flex items-start justify-between gap-3">
                <span
                  className={cn(
                    'inline-flex size-14 items-center justify-center rounded-2xl',
                    look.dark ? 'bg-white/15' : 'bg-[#080808] text-[var(--ps-orange)]',
                  )}
                >
                  <Icon className="size-7" />
                </span>
                <span className="flex items-center gap-2">
                  {active && m.key !== 'sprint' && (
                    <span className={cn('rounded-full px-2.5 py-1 text-[11px] font-bold', look.dark ? 'bg-white text-[#080808]' : 'bg-[#080808] text-white')}>
                      Tanlangan
                    </span>
                  )}
                  <span className="ps-num text-[44px] opacity-30">{String(i + 1).padStart(2, '0')}</span>
                </span>
              </div>

              <div className="relative mt-5">
                <p className={cn('ps-eyebrow', look.dark ? 'text-white/65' : 'text-black/60')}>{t(m.subtitle)}</p>
                <h2 className="ps-display mt-2 text-[34px] sm:text-[42px]">{t(m.title)}</h2>
                <p className={cn('mt-3 max-w-md text-sm leading-relaxed', look.dark ? 'text-white/75' : 'text-black/70')}>
                  {m.description}
                </p>
              </div>

              <div className="relative mt-6 grid grid-cols-3 gap-2">
                {m.stats.map((st) => (
                  <div key={st.label} className={cn('rounded-2xl p-3', look.dark ? 'bg-white/10' : 'bg-black/10')}>
                    <p className="ps-num truncate text-[22px] sm:text-[26px]">{st.value}</p>
                    <p className={cn('mt-1 truncate text-[11px] font-semibold', look.dark ? 'text-white/60' : 'text-black/60')}>
                      {st.label}
                    </p>
                  </div>
                ))}
              </div>

              <div className="relative mt-4 flex flex-wrap gap-1.5">
                {m.chips.map((c) => (
                  <span
                    key={c}
                    className={cn(
                      'rounded-full px-2.5 py-1 text-[11px] font-semibold',
                      look.dark ? 'bg-white/10 text-white/80' : 'bg-black/10 text-black/75',
                    )}
                  >
                    {c}
                  </span>
                ))}
              </div>

              <div className="relative mt-auto pt-6">
                <button
                  type="button"
                  disabled={busyKey === m.key}
                  onClick={(e) => {
                    e.stopPropagation();
                    onAction(m.key);
                  }}
                  className={cn('ps-btn w-full justify-between sm:w-auto', look.dark ? 'ps-btn-light' : 'ps-btn-ink')}
                >
                  {t(m.cta)}
                  <span className="ps-btn-arrow">
                    <ArrowUpRight className="size-4" />
                  </span>
                </button>
              </div>
            </div>
          </motion.article>
        );
      })}
    </section>
  );
}

export function CatalogTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 pt-4">
      <div>
        <p className="ps-eyebrow text-[var(--text-muted)]">Katalog</p>
        <h2 className="ps-display mt-2 text-[34px] sm:text-[44px]">{children}</h2>
      </div>
      {right}
    </div>
  );
}
