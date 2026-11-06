'use client';

import React from 'react';
import { Coins, Zap, Check, X, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ─────────────────────────────────────────────────────────────
   Mini o'yinlar uchun umumiy Pastel Studio qismlari
   (/games/map, /games/character, /games/timeline).
   ───────────────────────────────────────────────────────────── */

type Tone = 'purple' | 'orange' | 'blue' | 'green' | 'coral';

const TONE: Record<Tone, { bg: string; on: string; soft: string }> = {
  purple: { bg: 'bg-[var(--ps-purple)]', on: 'text-white', soft: 'text-[var(--ps-purple)]' },
  orange: { bg: 'bg-[var(--ps-orange)]', on: 'text-[#080808]', soft: 'text-[var(--ps-orange)]' },
  blue: { bg: 'bg-[var(--ps-blue)]', on: 'text-[#080808]', soft: 'text-[var(--ps-blue)]' },
  green: { bg: 'bg-[var(--ps-green)]', on: 'text-white', soft: 'text-[var(--ps-green)]' },
  coral: { bg: 'bg-[var(--ps-coral)]', on: 'text-white', soft: 'text-[var(--ps-coral)]' },
};

export function GameHero({
  tone,
  icon: Icon,
  eyebrow,
  title,
  accent,
  description,
  xp,
  coins,
}: {
  tone: Tone;
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  accent: string;
  description: string;
  xp: number;
  coins: number;
}) {
  const t = TONE[tone];
  return (
    <section className="relative grid items-center gap-6 lg:grid-cols-[1.4fr_1fr]">
      <div>
        <span className="ps-chip">
          <Icon className={cn('size-3.5', t.soft)} /> {eyebrow}
        </span>
        <h1 className="ps-display mt-4 text-[34px] sm:text-[48px]">
          {title} <span className={t.soft}>{accent}</span>
          <span className="text-[var(--ps-coral)]">.</span>
        </h1>
        <p className="mt-3 max-w-xl text-[14.5px] leading-relaxed text-[var(--text-secondary)]">{description}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--ps-purple)] px-3.5 py-1.5 text-[12.5px] font-bold text-white">
            <Zap className="size-3.5 fill-current" /> +{xp} XP
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--ps-orange)] px-3.5 py-1.5 text-[12.5px] font-bold text-[#080808]">
            <Coins className="size-3.5" /> +{coins} tanga
          </span>
          <span className="inline-flex items-center rounded-full bg-[var(--ps-paper)] px-3.5 py-1.5 text-[12.5px] font-bold text-[var(--text-secondary)] shadow-sm">
            har to&apos;g&apos;ri javob uchun
          </span>
        </div>
      </div>

      {/* Rangli kompozitsiya */}
      <div aria-hidden className="relative mx-auto hidden aspect-square w-full max-w-[260px] lg:block">
        <div className={cn('absolute inset-[8%] rounded-full', t.bg)} />
        <div className="absolute -left-1 bottom-[6%] size-[30%] rounded-tl-full bg-[var(--ps-coral)]" />
        <div className="ps-dots absolute right-0 top-0 size-[30%] rounded-2xl opacity-25" />
        <div className="absolute inset-[26%] grid place-items-center rounded-full border-[7px] border-[#FFFCF7] bg-[#FFFCF7] shadow-[0_30px_60px_-30px_rgba(40,20,80,0.7)]">
          <Icon className={cn('size-[44%]', t.soft)} strokeWidth={1.7} />
        </div>
      </div>
    </section>
  );
}

export function SubjectChips({
  subjects,
  value,
  onChange,
}: {
  subjects: { slug: string; name: string }[];
  value: string | null;
  onChange: (slug: string) => void;
}) {
  if (subjects.length === 0) return null;
  return (
    <div className="no-scrollbar -mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1">
      {subjects.map((s) => {
        const active = value === s.slug;
        return (
          <button
            key={s.slug}
            type="button"
            onClick={() => onChange(s.slug)}
            className={cn(
              'shrink-0 cursor-pointer rounded-full px-4 py-2 text-[13px] font-bold transition-all',
              active
                ? 'bg-[#080808] text-[#FFFCF7] dark:bg-[#FFFCF7] dark:text-[#080808]'
                : 'bg-[var(--ps-paper)] text-[var(--text-secondary)] shadow-sm hover:-translate-y-0.5',
            )}
          >
            {s.name}
          </button>
        );
      })}
    </div>
  );
}

export function GameEmpty({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <div className="ps-card flex flex-col items-center gap-3 !rounded-[32px] px-6 py-14 text-center">
      <span className="inline-flex size-14 items-center justify-center rounded-full bg-[var(--ps-neutral)] text-[var(--text-muted)]">
        <Icon className="size-6" />
      </span>
      <p className="text-[14px] font-semibold text-[var(--text-muted)]">{text}</p>
    </div>
  );
}

export function GameSkeleton() {
  return <div className="h-80 w-full animate-pulse rounded-[32px] bg-[var(--ps-paper)]/70" />;
}

/** Natija banneri: to'g'ri — yashil, xato — qizil. Mukofot 0 bo'lsa (kunlik limit) shuni aytadi. */
export function ResultBanner({
  correct,
  title,
  xp,
  coins,
  children,
}: {
  correct: boolean;
  title: string;
  xp?: number;
  coins?: number;
  children?: React.ReactNode;
}) {
  return (
    <div className={cn('relative overflow-hidden rounded-[28px] p-5 text-white', correct ? 'bg-[var(--ps-green)]' : 'bg-[var(--ps-coral)]')}>
      <span aria-hidden className="absolute -right-8 -top-10 size-32 rounded-full bg-white/15" />
      <div className="relative flex items-start gap-3">
        <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-[#FFFCF7]">
          {correct ? <Check className="size-5 stroke-[3] text-[var(--ps-green)]" /> : <X className="size-5 stroke-[3] text-[var(--ps-coral)]" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-[family-name:var(--font-grotesk)] text-[19px] font-bold leading-tight">{title}</p>
          {correct && (
            <p className="mt-1 text-[13px] font-semibold text-white/85">
              {xp ? <>+{xp} XP · +{coins ?? 0} tanga qo&apos;shildi</> : "Bugungi mukofot limiti tugagan — mashq davom etaveradi"}
            </p>
          )}
          {children && <div className="mt-2 text-[13.5px] text-white/90">{children}</div>}
        </div>
      </div>
    </div>
  );
}

export const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
