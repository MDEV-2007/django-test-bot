import React from 'react';
import { BadgeCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface VerifiedBadgeProps {
  role?: string | null;
  isSuperadmin?: boolean | null;
  isTeacher?: boolean | null;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const SIZE_MAP = {
  xs: 'size-3.5',
  sm: 'size-4',
  md: 'size-5',
  lg: 'size-6',
};

export default function VerifiedBadge({
  role,
  isSuperadmin,
  isTeacher,
  size = 'sm',
  showLabel = false,
  className,
}: VerifiedBadgeProps) {
  const isSuper = Boolean(isSuperadmin || role === 'superadmin');
  const isTeach = Boolean(isTeacher || role === 'teacher');

  if (!isSuper && !isTeach) {
    return null;
  }

  const iconSize = SIZE_MAP[size] || SIZE_MAP.sm;

  if (isSuper) {
    return (
      <span
        className={cn('inline-flex items-center gap-1 shrink-0 align-middle select-none', className)}
        title="Tasdiqlangan Super Admin (Verified Super Admin)"
      >
        <BadgeCheck
          className={cn(
            iconSize,
            'fill-sky-500 text-white stroke-white drop-shadow-[0_0_6px_rgba(14,165,233,0.5)] transition-transform hover:scale-110'
          )}
        />
        {showLabel && (
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-sky-500/15 text-sky-400 border border-sky-500/30 backdrop-blur-md">
            Super Admin
          </span>
        )}
      </span>
    );
  }

  // Teacher: Sariq verifikatsiya (Yellow / Amber Verified Badge)
  return (
    <span
      className={cn('inline-flex items-center gap-1 shrink-0 align-middle select-none', className)}
      title="Tasdiqlangan O'qituvchi (Verified Teacher)"
    >
      <BadgeCheck
        className={cn(
          iconSize,
          'fill-amber-400 text-neutral-950 stroke-neutral-950 drop-shadow-[0_0_6px_rgba(251,191,36,0.6)] transition-transform hover:scale-110'
        )}
      />
      {showLabel && (
        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30 backdrop-blur-md">
          O&apos;qituvchi
        </span>
      )}
    </span>
  );
}
