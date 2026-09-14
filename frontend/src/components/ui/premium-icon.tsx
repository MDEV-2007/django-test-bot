'use client';

import React from 'react';
import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type PremiumIconTone =
  | 'emerald'
  | 'indigo'
  | 'amber'
  | 'rose'
  | 'sky'
  | 'purple'
  | 'cyan'
  | 'zinc'
  | 'gold'
  | 'primary';

export type PremiumIconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const TONE_STYLES: Record<
  PremiumIconTone,
  {
    bg: string;
    border: string;
    text: string;
    glow: string;
  }
> = {
  emerald: {
    bg: 'bg-emerald-500/12 dark:bg-emerald-500/18',
    border: 'border-emerald-500/25',
    text: 'text-emerald-600 dark:text-emerald-400',
    glow: 'shadow-[0_0_12px_-2px_rgba(16,185,129,0.35)]',
  },
  indigo: {
    bg: 'bg-indigo-500/12 dark:bg-indigo-500/18',
    border: 'border-indigo-500/25',
    text: 'text-indigo-600 dark:text-indigo-400',
    glow: 'shadow-[0_0_12px_-2px_rgba(99,102,241,0.35)]',
  },
  amber: {
    bg: 'bg-amber-500/12 dark:bg-amber-500/18',
    border: 'border-amber-500/25',
    text: 'text-amber-600 dark:text-amber-400',
    glow: 'shadow-[0_0_12px_-2px_rgba(245,158,11,0.35)]',
  },
  rose: {
    bg: 'bg-rose-500/12 dark:bg-rose-500/18',
    border: 'border-rose-500/25',
    text: 'text-rose-600 dark:text-rose-400',
    glow: 'shadow-[0_0_12px_-2px_rgba(244,63,94,0.35)]',
  },
  sky: {
    bg: 'bg-sky-500/12 dark:bg-sky-500/18',
    border: 'border-sky-500/25',
    text: 'text-sky-600 dark:text-sky-400',
    glow: 'shadow-[0_0_12px_-2px_rgba(14,165,233,0.35)]',
  },
  purple: {
    bg: 'bg-purple-500/12 dark:bg-purple-500/18',
    border: 'border-purple-500/25',
    text: 'text-purple-600 dark:text-purple-400',
    glow: 'shadow-[0_0_12px_-2px_rgba(168,85,247,0.35)]',
  },
  cyan: {
    bg: 'bg-cyan-500/12 dark:bg-cyan-500/18',
    border: 'border-cyan-500/25',
    text: 'text-cyan-600 dark:text-cyan-400',
    glow: 'shadow-[0_0_12px_-2px_rgba(6,182,212,0.35)]',
  },
  zinc: {
    bg: 'bg-zinc-500/12 dark:bg-zinc-500/18',
    border: 'border-zinc-500/25',
    text: 'text-zinc-600 dark:text-zinc-400',
    glow: 'shadow-[0_0_12px_-2px_rgba(113,113,122,0.25)]',
  },
  gold: {
    bg: 'bg-gradient-to-br from-amber-500/25 via-yellow-500/20 to-orange-500/20',
    border: 'border-amber-400/40',
    text: 'text-amber-500 dark:text-amber-300',
    glow: 'shadow-[0_0_16px_-2px_rgba(245,158,11,0.5)] ring-1 ring-amber-400/30',
  },
  primary: {
    bg: 'bg-primary/15 dark:bg-primary/20',
    border: 'border-primary/30',
    text: 'text-primary',
    glow: 'shadow-[0_0_12px_-2px_rgba(45,108,255,0.35)]',
  },
};

const SIZE_STYLES: Record<
  PremiumIconSize,
  {
    box: string;
    icon: string;
    rounded: string;
  }
> = {
  xs: {
    box: 'size-6',
    icon: 'size-3.5',
    rounded: 'rounded-md',
  },
  sm: {
    box: 'size-7',
    icon: 'size-4',
    rounded: 'rounded-lg',
  },
  md: {
    box: 'size-9',
    icon: 'size-4.5',
    rounded: 'rounded-xl',
  },
  lg: {
    box: 'size-11',
    icon: 'size-5.5',
    rounded: 'rounded-2xl',
  },
  xl: {
    box: 'size-14',
    icon: 'size-7',
    rounded: 'rounded-2xl',
  },
};

export interface PremiumIconProps {
  icon: LucideIcon;
  tone?: PremiumIconTone;
  size?: PremiumIconSize;
  glow?: boolean;
  className?: string;
  iconClassName?: string;
}

export default function PremiumIcon({
  icon: Icon,
  tone = 'primary',
  size = 'sm',
  glow = false,
  className,
  iconClassName,
}: PremiumIconProps) {
  const toneStyle = TONE_STYLES[tone] || TONE_STYLES.primary;
  const sizeStyle = SIZE_STYLES[size] || SIZE_STYLES.sm;

  return (
    <div
      className={cn(
        'relative shrink-0 flex items-center justify-center border transition-all duration-300',
        sizeStyle.box,
        sizeStyle.rounded,
        toneStyle.bg,
        toneStyle.border,
        toneStyle.text,
        glow && toneStyle.glow,
        className
      )}
    >
      <Icon className={cn(sizeStyle.icon, 'transition-transform duration-200', iconClassName)} />
    </div>
  );
}
