'use client';

import type { LucideIcon } from 'lucide-react';
import PremiumIcon, { type PremiumIconTone } from '@/components/ui/premium-icon';
import { cn } from '@/lib/utils';

/* iOS 18 Large Title & Smart Stack Header Widget */
export default function PageHero({
  eyebrow,
  eyebrowIcon: EyebrowIcon,
  title,
  description,
  actions,
  tone = 'accent',
  className,
}: {
  eyebrow?: string;
  eyebrowIcon?: LucideIcon;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  tone?: 'accent' | 'amber' | 'rose' | 'indigo' | 'sky' | 'emerald';
  className?: string;
}) {
  const TONE: Record<
    string,
    { iconBg: string; badgeBg: string; badgeText: string; aura: string }
  > = {
    accent: {
      iconBg: 'bg-[#007AFF]',
      badgeBg: 'bg-[#007AFF]/10 border-[#007AFF]/20',
      badgeText: 'text-[#007AFF]',
      aura: 'bg-[#007AFF]/[0.08]',
    },
    sky: {
      iconBg: 'bg-[#007AFF]',
      badgeBg: 'bg-[#007AFF]/10 border-[#007AFF]/20',
      badgeText: 'text-[#007AFF]',
      aura: 'bg-[#007AFF]/[0.08]',
    },
    amber: {
      iconBg: 'bg-[#FF9500]',
      badgeBg: 'bg-[#FF9500]/12 border-[#FF9500]/25',
      badgeText: 'text-[#FF9500]',
      aura: 'bg-[#FF9500]/[0.08]',
    },
    rose: {
      iconBg: 'bg-[#FF3B30]',
      badgeBg: 'bg-[#FF3B30]/10 border-[#FF3B30]/20',
      badgeText: 'text-[#FF3B30]',
      aura: 'bg-[#FF3B30]/[0.08]',
    },
    indigo: {
      iconBg: 'bg-[#5856D6]',
      badgeBg: 'bg-[#5856D6]/10 border-[#5856D6]/20',
      badgeText: 'text-[#5856D6]',
      aura: 'bg-[#5856D6]/[0.08]',
    },
    emerald: {
      iconBg: 'bg-[#34C759]',
      badgeBg: 'bg-[#34C759]/10 border-[#34C759]/20',
      badgeText: 'text-[#34C759]',
      aura: 'bg-[#34C759]/[0.08]',
    },
  };
  const t = TONE[tone] ?? TONE.accent;

  return (
    <div
      className={cn(
        'ios-card relative overflow-hidden rounded-[28px] p-6 sm:p-7',
        className
      )}
    >
      <div
        className={cn(
          'pointer-events-none absolute -right-20 -top-24 size-72 rounded-full blur-[70px]',
          t.aura
        )}
      />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-2">
          {eyebrow && (
            <div className="inline-flex items-center gap-2">
              {EyebrowIcon && (
                <PremiumIcon
                  icon={EyebrowIcon}
                  tone={(tone === 'accent' ? 'sky' : tone) as PremiumIconTone}
                  size="xs"
                  solid
                />
              )}
              <span
                className={cn(
                  'rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider',
                  t.badgeBg,
                  t.badgeText
                )}
              >
                {eyebrow}
              </span>
            </div>
          )}
          <h1 className="text-[24px] sm:text-[30px] font-bold tracking-[-0.03em] text-foreground leading-tight">
            {title}
          </h1>
          {description && (
            <p className="max-w-2xl text-[14px] leading-relaxed text-[#8E8E93]">
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex shrink-0 flex-wrap items-center gap-2.5">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
