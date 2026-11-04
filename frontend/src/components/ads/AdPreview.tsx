'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

/* O'quvchi ko'radigan karta taxminiy ko'rinishi (lenta banneri). Haqiqiy ko'rinish
   o'quvchi ilovasidagi TargetedAdBanner komponentida. */
export default function AdPreview({ title, description, badge, cta, bannerUrl, logoUrl, centerName }: {
  title: string; description: string; badge?: string; cta?: string;
  bannerUrl?: string; logoUrl?: string; centerName: string;
}) {
  const [device, setDevice] = useState<'mobile' | 'desktop'>('mobile');
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-medium uppercase tracking-wide text-[var(--text-faint)]">Ko&apos;rinish</span>
        <div className="inline-flex rounded-md bg-[var(--surface-hover)] p-0.5">
          {(['mobile', 'desktop'] as const).map((d) => (
            <button key={d} type="button" onClick={() => setDevice(d)}
              className={cn('rounded px-2 py-0.5 text-[11px] font-medium', device === d ? 'bg-[var(--surface-card)] shadow-xs' : 'text-[var(--text-muted)]')}>
              {d === 'mobile' ? 'Mobil' : 'Desktop'}
            </button>
          ))}
        </div>
      </div>
      <div className={cn('mx-auto rounded-2xl bg-[var(--bg-page)] p-3 transition-all', device === 'mobile' ? 'max-w-[320px]' : 'max-w-full')}>
        <div className="overflow-hidden rounded-xl border border-[var(--border-card)] bg-[var(--surface-card)]">
          {bannerUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={bannerUrl} alt="" className="aspect-[1200/628] w-full object-cover" />
          ) : (
            <div className="grid aspect-[1200/628] place-items-center bg-[var(--surface-hover)] text-[12px] text-[var(--text-faint)]">Banner</div>
          )}
          <div className="space-y-2 p-3">
            <div className="flex items-center gap-2">
              {logoUrl
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={logoUrl} alt="" className="size-6 rounded-full object-cover" />
                : <span className="size-6 rounded-full bg-[var(--surface-hover)]" />}
              <span className="truncate text-[12px] font-semibold">{centerName}</span>
              <span className="ml-auto rounded bg-[var(--surface-hover)] px-1.5 py-0.5 text-[10px] text-[var(--text-muted)]">Reklama</span>
            </div>
            {badge && <span className="inline-block rounded-full bg-[var(--reward-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--reward-text)]">{badge}</span>}
            <div className="text-[14px] font-semibold leading-snug">{title || 'Sarlavha'}</div>
            <p className="line-clamp-3 text-[12px] text-[var(--text-muted)]">{description || 'Tavsif'}</p>
            <div className="rounded-lg bg-[var(--brand)] py-2 text-center text-[13px] font-semibold text-[var(--on-brand)]">
              {cta || 'Bepul darsga yozilish'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
