'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import {
  CAMPAIGN_STATUS_LABEL, LEAD_STATUS_LABEL, isoDay,
  type CampaignStatus, type LeadStatus,
} from '@/lib/ads-api';

/* Ads Manager uchun kichik, tinch UI to'plami: neytral sirt, ingichka chegara,
   emerald faqat urg'u uchun. Dizayn tokenlari globals.css dan. */

export function Panel({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <section className={cn('rounded-xl border border-[var(--border-card)] bg-[var(--surface-card)]', className)}>
      {children}
    </section>
  );
}

export function PanelHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border-soft)] px-5 py-4">
      <div>
        <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">{title}</h2>
        {description && <p className="mt-0.5 text-[13px] text-[var(--text-muted)]">{description}</p>}
      </div>
      {actions}
    </div>
  );
}

export function PageTitle({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight text-[var(--text-primary)]">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-[14px] text-[var(--text-muted)]">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Metric({ label, value, hint, muted }: { label: string; value: string; hint?: string; muted?: boolean }) {
  return (
    <div className="min-w-0 bg-[var(--surface-card)] px-5 py-4">
      <div className="text-[12px] font-medium uppercase tracking-wide text-[var(--text-faint)]">{label}</div>
      <div className={cn('mt-1.5 truncate text-[24px] font-semibold tabular-nums tracking-tight',
        muted ? 'text-[var(--text-faint)]' : 'text-[var(--text-primary)]')}>{value}</div>
      {hint && <div className="mt-1 text-[12px] text-[var(--text-muted)]">{hint}</div>}
    </div>
  );
}

const CAMPAIGN_TONE: Record<CampaignStatus, string> = {
  draft: 'bg-[var(--surface-hover)] text-[var(--text-secondary)]',
  pending_review: 'bg-[var(--warning-soft)] text-[var(--warning-text)]',
  rejected: 'bg-[var(--danger-soft)] text-[var(--danger-text)]',
  scheduled: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
  active: 'bg-[var(--success-soft)] text-[var(--success-text)]',
  paused: 'bg-[var(--surface-hover-strong)] text-[var(--text-secondary)]',
  ended: 'bg-[var(--surface-hover)] text-[var(--text-muted)]',
  exhausted: 'bg-[var(--reward-soft)] text-[var(--reward-text)]',
};

export function CampaignStatusBadge({ status }: { status: CampaignStatus }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[12px] font-medium', CAMPAIGN_TONE[status])}>
      <span className={cn('size-1.5 rounded-full bg-current', status === 'active' ? 'opacity-100' : 'opacity-60')} />
      {CAMPAIGN_STATUS_LABEL[status]}
    </span>
  );
}

const LEAD_TONE: Record<LeadStatus, string> = {
  NEW: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
  CONTACTED: 'bg-[var(--warning-soft)] text-[var(--warning-text)]',
  ENROLLED: 'bg-[var(--success-soft)] text-[var(--success-text)]',
  REJECTED: 'bg-[var(--surface-hover)] text-[var(--text-muted)]',
};

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  return (
    <span className={cn('inline-flex rounded-full px-2 py-0.5 text-[12px] font-medium', LEAD_TONE[status])}>
      {LEAD_STATUS_LABEL[status]}
    </span>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="text-[15px] font-semibold text-[var(--text-primary)]">{title}</div>
      {description && <p className="mt-1 max-w-md text-[13px] text-[var(--text-muted)]">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorNote({ message }: { message: string }) {
  return (
    <div role="alert" className="rounded-lg border border-[var(--danger-soft)] bg-[var(--danger-soft)] px-4 py-3 text-[13px] text-[var(--danger-text)]">
      {message}
    </div>
  );
}

export function SkeletonRows({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2 p-5" aria-busy="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-9 animate-pulse rounded-md bg-[var(--surface-hover)]" />
      ))}
    </div>
  );
}

export const inputCls =
  'h-10 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface-card)] px-3 text-[14px] text-[var(--text-primary)] outline-none transition focus:border-[var(--brand)] focus:ring-3 focus:ring-[var(--brand-soft)] disabled:opacity-60';

export const textareaCls = inputCls.replace('h-10', 'min-h-24 py-2');

export function Field({ label, hint, error, children, htmlFor }: { label: string; hint?: string; error?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-[13px] font-medium text-[var(--text-secondary)]">{label}</label>
      {children}
      {error ? <p className="text-[12px] text-[var(--danger-text)]">{error}</p>
        : hint ? <p className="text-[12px] text-[var(--text-muted)]">{hint}</p> : null}
    </div>
  );
}

/* Sana oralig'i: tezkor tanlovlar + aniq sanalar. */
const PRESETS = [7, 30, 90] as const;

export function DateRange({ from, to, onChange }: { from: string; to: string; onChange: (from: string, to: string) => void }) {
  const today = isoDay(new Date());
  const preset = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - (days - 1));
    onChange(isoDay(start), isoDay(end));
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex rounded-lg border border-[var(--border-card)] bg-[var(--surface-card)] p-0.5">
        {PRESETS.map((d) => {
          const s = new Date();
          s.setDate(s.getDate() - (d - 1));
          const activeP = to === today && from === isoDay(s);
          return (
            <button key={d} type="button" onClick={() => preset(d)}
              className={cn('rounded-md px-2.5 py-1 text-[12px] font-medium transition',
                activeP ? 'bg-[var(--brand-soft)] text-[var(--brand-text)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]')}>
              {d} kun
            </button>
          );
        })}
      </div>
      <input type="date" aria-label="Boshlanish" value={from} max={to} onChange={(e) => e.target.value && onChange(e.target.value, to)}
        className={cn(inputCls, 'h-8 w-auto px-2 text-[13px]')} />
      <span className="text-[var(--text-faint)]">—</span>
      <input type="date" aria-label="Tugash" value={to} min={from} max={today} onChange={(e) => e.target.value && onChange(from, e.target.value)}
        className={cn(inputCls, 'h-8 w-auto px-2 text-[13px]')} />
    </div>
  );
}

export function defaultRange(days = 30): { from: string; to: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - (days - 1));
  return { from: isoDay(start), to: isoDay(end) };
}
