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
    solidBg: string;
    border: string;
    text: string;
    glow: string;
  }
> = {
  emerald: {
    bg: 'bg-[#34C759]/14 dark:bg-[#30D158]/20',
    solidBg: 'bg-gradient-to-b from-[#34C759] to-[#28A745] text-white border-transparent',
    border: 'border-[#34C759]/25',
    text: 'text-[#248A3D] dark:text-[#30D158]',
    glow: 'shadow-[0_4px_12px_-2px_rgba(52,199,89,0.4)]',
  },
  indigo: {
    bg: 'bg-[#5856D6]/14 dark:bg-[#5E5CE6]/20',
    solidBg: 'bg-gradient-to-b from-[#5856D6] to-[#4644B5] text-white border-transparent',
    border: 'border-[#5856D6]/25',
    text: 'text-[#5856D6] dark:text-[#7D7AFF]',
    glow: 'shadow-[0_4px_12px_-2px_rgba(88,86,214,0.4)]',
  },
  amber: {
    bg: 'bg-[#FF9500]/14 dark:bg-[#FF9F0A]/20',
    solidBg: 'bg-gradient-to-b from-[#FF9500] to-[#E68600] text-white border-transparent',
    border: 'border-[#FF9500]/25',
    text: 'text-[#C93400] dark:text-[#FF9F0A]',
    glow: 'shadow-[0_4px_12px_-2px_rgba(255,149,0,0.4)]',
  },
  rose: {
    bg: 'bg-[#FF2D55]/14 dark:bg-[#FF375F]/20',
    solidBg: 'bg-gradient-to-b from-[#FF2D55] to-[#E01E45] text-white border-transparent',
    border: 'border-[#FF2D55]/25',
    text: 'text-[#D70015] dark:text-[#FF375F]',
    glow: 'shadow-[0_4px_12px_-2px_rgba(255,45,85,0.4)]',
  },
  sky: {
    bg: 'bg-[#007AFF]/14 dark:bg-[#0A84FF]/20',
    solidBg: 'bg-gradient-to-b from-[#007AFF] to-[#0062CC] text-white border-transparent',
    border: 'border-[#007AFF]/25',
    text: 'text-[#007AFF] dark:text-[#0A84FF]',
    glow: 'shadow-[0_4px_12px_-2px_rgba(0,122,255,0.4)]',
  },
  purple: {
    bg: 'bg-[#AF52DE]/14 dark:bg-[#BF5AF2]/20',
    solidBg: 'bg-gradient-to-b from-[#AF52DE] to-[#8E3CBE] text-white border-transparent',
    border: 'border-[#AF52DE]/25',
    text: 'text-[#8944AB] dark:text-[#BF5AF2]',
    glow: 'shadow-[0_4px_12px_-2px_rgba(175,82,222,0.4)]',
  },
  cyan: {
    bg: 'bg-[#32ADE6]/14 dark:bg-[#64D2FF]/20',
    solidBg: 'bg-gradient-to-b from-[#32ADE6] to-[#1D8FC4] text-white border-transparent',
    border: 'border-[#32ADE6]/25',
    text: 'text-[#0071A4] dark:text-[#64D2FF]',
    glow: 'shadow-[0_4px_12px_-2px_rgba(50,173,230,0.4)]',
  },
  zinc: {
    bg: 'bg-[#8E8E93]/14 dark:bg-[#8E8E93]/20',
    solidBg: 'bg-gradient-to-b from-[#8E8E93] to-[#636366] text-white border-transparent',
    border: 'border-[#8E8E93]/25',
    text: 'text-[#636366] dark:text-[#AEAEB2]',
    glow: 'shadow-[0_4px_12px_-2px_rgba(142,142,147,0.3)]',
  },
  gold: {
    bg: 'bg-gradient-to-br from-[#FFCC00]/22 via-[#FF9500]/18 to-[#FF9500]/22',
    solidBg: 'bg-gradient-to-b from-[#FFCC00] to-[#FF9500] text-slate-950 border-transparent',
    border: 'border-[#FF9500]/35',
    text: 'text-[#B25000] dark:text-[#FFD60A]',
    glow: 'shadow-[0_4px_14px_-2px_rgba(255,149,0,0.45)]',
  },
  primary: {
    bg: 'bg-[#007AFF]/14 dark:bg-[#0A84FF]/20',
    solidBg: 'bg-gradient-to-b from-[#007AFF] to-[#0062CC] text-white border-transparent',
    border: 'border-[#007AFF]/25',
    text: 'text-[#007AFF] dark:text-[#0A84FF]',
    glow: 'shadow-[0_4px_12px_-2px_rgba(0,122,255,0.4)]',
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
    box: 'size-6.5',
    icon: 'size-3.5',
    rounded: 'rounded-[8px]',
  },
  sm: {
    box: 'size-8',
    icon: 'size-4',
    rounded: 'rounded-[10px]',
  },
  md: {
    box: 'size-9.5',
    icon: 'size-4.5',
    rounded: 'rounded-[12px]',
  },
  lg: {
    box: 'size-11',
    icon: 'size-5.5',
    rounded: 'rounded-[14px]',
  },
  xl: {
    box: 'size-14',
    icon: 'size-7',
    rounded: 'rounded-[18px]',
  },
};

export interface PremiumIconProps {
  icon: LucideIcon;
  tone?: PremiumIconTone;
  size?: PremiumIconSize;
  glow?: boolean;
  solid?: boolean;
  className?: string;
  iconClassName?: string;
}

export default function PremiumIcon({
  icon: Icon,
  tone = 'primary',
  size = 'sm',
  glow = false,
  solid = false,
  className,
  iconClassName,
}: PremiumIconProps) {
  const toneStyle = TONE_STYLES[tone] || TONE_STYLES.primary;
  const sizeStyle = SIZE_STYLES[size] || SIZE_STYLES.sm;

  return (
    <div
      className={cn(
        'relative shrink-0 flex items-center justify-center border transition-all duration-200',
        sizeStyle.box,
        sizeStyle.rounded,
        solid || glow
          ? cn(toneStyle.solidBg, 'shadow-[inset_0_1px_0_rgba(255,255,255,0.28)]', toneStyle.glow)
          : cn(toneStyle.bg, toneStyle.border, toneStyle.text),
        className
      )}
    >
      <Icon className={cn(sizeStyle.icon, 'transition-transform duration-200 stroke-[2.2]', iconClassName)} />
    </div>
  );
}
