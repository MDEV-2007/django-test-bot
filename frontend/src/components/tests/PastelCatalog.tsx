'use client';

/* /tests katalog sahifalari (Standart · Blits · Stress) uchun "Pastel Studio" bloklari.
   Faqat ko'rinish — matn, raqam va harakatlarning hammasi sahifadan keladi. */

import { motion } from 'motion/react';
import { ArrowUpRight, Loader2 } from 'lucide-react';

type LucideIcon = React.ComponentType<{ className?: string }>;
import { cn } from '@/lib/utils';

const EASE = [0.22, 1, 0.36, 1] as const;

export type PsTone = 'purple' | 'orange' | 'green' | 'coral' | 'blue' | 'ink';

/** Fon + matn rangi; `dark` — ustidagi matn oq bo'lsinmi. */
export const TONE: Record<PsTone, { bg: string; dark: boolean }> = {
  purple: { bg: 'bg-[var(--ps-purple)] text-white', dark: true },
  orange: { bg: 'bg-[var(--ps-orange)] text-[#080808]', dark: false },
  green: { bg: 'bg-[var(--ps-green)] text-white', dark: true },
  coral: { bg: 'bg-[var(--ps-coral)] text-white', dark: true },
  blue: { bg: 'bg-[var(--ps-blue)] text-[#080808]', dark: false },
  ink: { bg: 'bg-[#080808] text-[#FFFCF7] dark:bg-[#FFFCF7] dark:text-[#080808]', dark: true },
};

/** Fan kartalari uchun aylanma rang ritmi. */
export const TONE_CYCLE: PsTone[] = ['purple', 'orange', 'green', 'coral', 'blue', 'ink'];

export function InViewItem({ children, index = 0, className }: { children: React.ReactNode; index?: number; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-30px' }}
      transition={{ duration: 0.55, ease: EASE, delay: Math.min(index, 6) * 0.05 }}
    >
      {children}
    </motion.div>
  );
}

/* ── Rejim xususiyatlari: 4 ta rangli plitka ─────────────────────────── */

export function FeatureStrip({
  items,
}: {
  items: { icon: LucideIcon; title: string; text: React.ReactNode; tone: PsTone }[];
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {items.map((it, i) => {
        const Icon = it.icon;
        const tone = TONE[it.tone];
        return (
          <InViewItem key={it.title} index={i}>
            <div className={cn('relative h-full overflow-hidden rounded-[24px] p-4 sm:p-5', tone.bg)}>
              <div aria-hidden className="absolute -right-6 -top-6 size-20 rounded-full bg-white/15" />
              <span
                className={cn(
                  'relative inline-flex size-10 items-center justify-center rounded-full',
                  tone.dark ? 'bg-white/15' : 'bg-[#080808] text-[var(--ps-orange)]',
                )}
              >
                <Icon className="size-5" />
              </span>
              <p className="ps-display relative mt-3 text-[19px] sm:text-[21px]">{it.title}</p>
              <p className={cn('relative mt-1.5 text-[12px] leading-snug', tone.dark ? 'text-white/75' : 'text-black/65')}>
                {it.text}
              </p>
            </div>
          </InViewItem>
        );
      })}
    </div>
  );
}

/* ── Bo'lim sarlavhasi ───────────────────────────────────────────────── */

export function SectionHead({ eyebrow, title, right }: { eyebrow: string; title: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <p className="ps-eyebrow text-[var(--text-muted)]">{eyebrow}</p>
        <h2 className="ps-display mt-2 text-[28px] sm:text-[36px]">{title}</h2>
      </div>
      {right}
    </div>
  );
}

export function CountChip({ children }: { children: React.ReactNode }) {
  return <span className="ps-chip shrink-0 tabular-nums">{children}</span>;
}

/* ── Fan kartasi (Blits / Stress / Standart fanlar to'plami) ─────────── */

export function SubjectCard({
  index,
  tone,
  icon: Icon,
  title,
  subtitle,
  desc,
  badges = [],
  meta = [],
  cta,
  onClick,
  busy = false,
  disabled = false,
  wholeCardClick = false,
}: {
  index: number;
  tone: PsTone;
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  desc?: string;
  badges?: string[];
  meta?: { label: string; value: React.ReactNode }[];
  cta: string;
  onClick: () => void;
  busy?: boolean;
  disabled?: boolean;
  wholeCardClick?: boolean;
}) {
  const t = TONE[tone];
  return (
    <InViewItem index={index} className="h-full">
      <div
        onClick={wholeCardClick && !disabled ? onClick : undefined}
        className={cn(
          'ps-card ps-lift group relative flex h-full flex-col overflow-hidden p-5 sm:p-6',
          wholeCardClick && 'cursor-pointer',
        )}
      >
        <div aria-hidden className={cn('absolute -right-10 -top-10 size-32 rounded-full opacity-20', t.bg)} />

        <div className="relative flex items-start justify-between gap-3">
          <span className={cn('ps-zoom inline-flex size-12 shrink-0 items-center justify-center rounded-2xl', t.bg)}>
            <Icon className="size-6" />
          </span>
          <span className="ps-num text-[34px] text-[var(--text-faint)] opacity-50">{String(index + 1).padStart(2, '0')}</span>
        </div>

        {badges.length > 0 && (
          <div className="relative mt-4 flex flex-wrap gap-1.5">
            {badges.map((b) => (
              <span key={b} className="rounded-full bg-[var(--ps-neutral)] px-2.5 py-1 text-[11px] font-bold text-[var(--text-secondary)]">
                {b}
              </span>
            ))}
          </div>
        )}

        <h3 className="ps-display relative mt-3 text-[22px] sm:text-[24px]">{title}</h3>
        {subtitle && <p className="relative mt-1 text-[12px] font-semibold text-[var(--text-muted)]">{subtitle}</p>}
        {desc && <p className="relative mt-2 line-clamp-2 text-[13px] leading-relaxed text-[var(--text-muted)]">{desc}</p>}

        {meta.length > 0 && (
          <div className="relative mt-4 grid grid-cols-2 gap-2">
            {meta.map((m) => (
              <div key={m.label} className="min-w-0 rounded-2xl bg-[var(--ps-neutral)] px-3 py-2.5">
                <p className="truncate text-[13px] font-bold text-[var(--text-primary)]">{m.value}</p>
                <p className="mt-0.5 truncate text-[11px] font-semibold text-[var(--text-muted)]">{m.label}</p>
              </div>
            ))}
          </div>
        )}

        <div className="relative mt-auto pt-5">
          <button
            type="button"
            disabled={disabled}
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
            className="ps-btn ps-btn-ink w-full justify-between"
          >
            <span className="inline-flex items-center gap-2">
              {busy && <Loader2 className="size-4 animate-spin" />}
              {cta}
            </span>
            <span className="ps-btn-arrow">
              <ArrowUpRight className="size-4" />
            </span>
          </button>
        </div>
      </div>
    </InViewItem>
  );
}

/* ── Katta rangli banner (Super blits, Blok zal, Tezkor test) ─────────── */

export function PromoBand({
  tone,
  icon: Icon,
  eyebrow,
  title,
  text,
  badge,
  cta,
  onClick,
  busy = false,
  disabled = false,
}: {
  tone: PsTone;
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  text: React.ReactNode;
  badge?: string;
  cta: string;
  onClick: () => void;
  busy?: boolean;
  disabled?: boolean;
}) {
  const t = TONE[tone];
  return (
    <InViewItem>
      <section className={cn('relative overflow-hidden rounded-[32px] p-6 shadow-[0_24px_50px_-30px_rgba(60,30,110,0.6)] sm:p-9', t.bg)}>
        <div aria-hidden className="absolute -right-16 -top-20 size-64 rounded-full bg-white/15" />
        <div aria-hidden className="ps-dots absolute bottom-6 right-[30%] hidden size-24 opacity-30 sm:block" />
        <div aria-hidden className="ps-spin absolute right-8 bottom-8 hidden size-16 sm:block">
          <svg viewBox="0 0 100 100" className="size-full">
            <path d="M50 0 L61 39 L100 50 L61 61 L50 100 L39 61 L0 50 L39 39 Z" fill="currentColor" opacity="0.9" />
          </svg>
        </div>

        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  'inline-flex size-11 items-center justify-center rounded-full',
                  t.dark ? 'bg-white/15' : 'bg-[#080808] text-[var(--ps-orange)]',
                )}
              >
                <Icon className="size-5" />
              </span>
              <span className={cn('ps-eyebrow', t.dark ? 'text-white/70' : 'text-black/60')}>{eyebrow}</span>
              {badge && (
                <span className={cn('rounded-full px-3 py-1 text-[11px] font-bold', t.dark ? 'bg-white/15' : 'bg-black/10')}>
                  {badge}
                </span>
              )}
            </div>
            <h3 className="ps-display mt-4 text-[32px] sm:text-[44px]">{title}</h3>
            <p className={cn('mt-3 max-w-xl text-sm leading-relaxed', t.dark ? 'text-white/75' : 'text-black/70')}>{text}</p>
          </div>
          <button
            type="button"
            disabled={disabled}
            onClick={onClick}
            className={cn('ps-btn shrink-0', t.dark ? 'ps-btn-light' : 'ps-btn-ink')}
          >
            {busy && <Loader2 className="size-4 animate-spin" />}
            {cta}
            <span className="ps-btn-arrow">
              <ArrowUpRight className="size-4" />
            </span>
          </button>
        </div>
      </section>
    </InViewItem>
  );
}
