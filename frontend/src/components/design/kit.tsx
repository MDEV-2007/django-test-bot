'use client';

/* IlmIldizi design kit — the shared building blocks of the "emerald studio" look:
 * white panels with hairline borders, tiny uppercase section labels, a dark emerald
 * hero banner with glass stat tiles, page headers and a segmented tab bar.
 * Every page (Dashboard, Tests, Study, Community, Arena, Profile) is composed from
 * these so the product reads as one system. */

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ── Panel ─────────────────────────────────────────────────────────────── */

export function Panel({
  className,
  children,
  as: Tag = 'section',
  interactive = false,
}: {
  className?: string;
  children: React.ReactNode;
  as?: 'section' | 'div' | 'article';
  interactive?: boolean;
}) {
  return (
    <Tag className={cn('ds-panel p-4 sm:p-5', interactive && 'ds-panel-interactive', className)}>
      {children}
    </Tag>
  );
}

/* ── Section label ("⚡ EXPERIENCE") with optional right slot ───────────── */

export function PanelLabel({
  icon: Icon,
  children,
  right,
  className,
}: {
  icon?: LucideIcon;
  children: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center justify-between gap-3 mb-3.5', className)}>
      <span className="ds-label ds-section-title inline-flex items-center gap-1.5">
        {Icon && <Icon className="size-3.5" strokeWidth={2} />}
        {children}
      </span>
      {right}
    </div>
  );
}

export function PanelLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="ds-link text-xs font-semibold text-muted-foreground hover:text-[var(--brand-text)] transition-colors">
      {children}
    </Link>
  );
}

/* ── Page header ("◎ EXAMINATION PORTAL / Choose your test mode") ──────── */

export function PageHeader({
  icon: Icon,
  eyebrow,
  title,
  subtitle,
  right,
  className,
}: {
  icon?: LucideIcon;
  eyebrow: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn('flex flex-col sm:flex-row sm:items-end justify-between gap-3', className)}>
      <div className="min-w-0">
        <span className="ds-label inline-flex items-center gap-1.5">
          {Icon && <Icon className="size-3.5" strokeWidth={2} />}
          {eyebrow}
        </span>
        <h1 className="ds-page-title mt-1.5 text-2xl sm:text-[28px] font-extrabold tracking-tight text-foreground leading-tight">
          {title}
        </h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </header>
  );
}

/* ── Pills / chips ─────────────────────────────────────────────────────── */

type PillTone = 'brand' | 'gold' | 'danger' | 'neutral' | 'glass';

const PILL_TONES: Record<PillTone, string> = {
  brand: 'bg-[var(--brand-soft)] text-[var(--brand-text)] border-[var(--brand-border)]',
  gold: 'bg-[var(--reward-soft)] text-[var(--reward-text)] border-[var(--reward-border)]',
  danger: 'bg-[var(--danger-soft)] text-[var(--danger-text)] border-[var(--danger)]/25',
  neutral: 'bg-[var(--surface-card)] text-muted-foreground border-[var(--border-card)]',
  glass: 'bg-white/8 text-white/85 border-white/15',
};

export function Pill({
  tone = 'neutral',
  dot = false,
  className,
  children,
}: {
  tone?: PillTone;
  dot?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        'ds-pill inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap',
        `ds-pill-${tone}`,
        PILL_TONES[tone],
        className,
      )}
    >
      {dot && <span className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

/* ── Rounded gradient icon tile (the 36–40px squircles on mode cards) ──── */

type TileTone = 'brand' | 'gold' | 'danger' | 'dark' | 'sky' | 'violet';

const TILE_TONES: Record<TileTone, string> = {
  brand: 'from-[#3E8E68] to-[#1F5A40]',
  gold: 'from-[#E9C46A] to-[#C9962B]',
  danger: 'from-[#F0605A] to-[#C62D2D]',
  dark: 'from-[#2A5A46] to-[#143528]',
  sky: 'from-[#4BA3E3] to-[#1F6FB2]',
  violet: 'from-[#8B7CF0] to-[#5A47C9]',
};

export function IconTile({
  icon: Icon,
  tone = 'brand',
  size = 'md',
  className,
}: {
  icon: LucideIcon;
  tone?: TileTone;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const dims = size === 'sm' ? 'size-8 rounded-lg' : size === 'lg' ? 'size-11 rounded-xl' : 'size-9 rounded-[10px]';
  const icon = size === 'sm' ? 'size-4' : size === 'lg' ? 'size-5.5' : 'size-[18px]';
  return (
    <span
      className={cn(
        'ds-tile inline-flex shrink-0 items-center justify-center bg-gradient-to-br text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_2px_6px_rgba(16,40,30,0.18)]',
        `ds-tile-${tone}`,
        TILE_TONES[tone],
        dims,
        className,
      )}
    >
      <Icon className={icon} strokeWidth={2.2} />
    </span>
  );
}

/* ── Hero banner (dark emerald) ────────────────────────────────────────── */

export function HeroBanner({ className, children }: { className?: string; children: React.ReactNode }) {
  return <section className={cn('ds-hero relative overflow-hidden p-5 sm:p-7', className)}>{children}</section>;
}

export function HeroStat({
  icon: Icon,
  value,
  label,
  hint,
  iconClass = 'text-[var(--reward)]',
}: {
  icon: LucideIcon;
  value: React.ReactNode;
  label: string;
  hint?: React.ReactNode;
  iconClass?: string;
}) {
  return (
    <div className="ds-hero-stat rounded-xl border border-white/12 bg-white/[0.06] p-3 sm:p-3.5 backdrop-blur-sm min-w-0">
      <Icon className={cn('size-4', iconClass)} strokeWidth={2.2} />
      <p className="mt-2 text-xl sm:text-2xl font-extrabold tracking-tight text-white tabular-nums leading-none">{value}</p>
      <p className="mt-1 text-[11px] font-medium text-white/60 truncate">{label}</p>
      {hint && <p className="text-[10px] text-white/45 truncate">{hint}</p>}
    </div>
  );
}

export function HeroButton({
  href,
  onClick,
  icon: Icon,
  variant = 'gold',
  children,
  disabled,
}: {
  href?: string;
  onClick?: () => void;
  icon?: LucideIcon;
  variant?: 'gold' | 'ghost';
  children: React.ReactNode;
  disabled?: boolean;
}) {
  const cls = cn(
    'ds-hero-btn inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition active:scale-[0.98] disabled:opacity-60',
    `ds-hero-btn-${variant}`,
    variant === 'gold'
      ? 'bg-[var(--reward)] text-[var(--on-reward)] hover:bg-[var(--reward-hover)] shadow-[0_4px_14px_-4px_rgba(233,196,106,0.6)]'
      : 'border border-white/20 bg-white/[0.04] text-white hover:bg-white/10',
  );
  const inner = (
    <>
      {Icon && <Icon className="size-4" />}
      {children}
    </>
  );
  if (href) return <Link href={href} className={cls}>{inner}</Link>;
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={cls}>
      {inner}
    </button>
  );
}

/* ── Small stat cell (the grey boxes on mode / profile cards) ──────────── */

export function StatCell({ value, label, className }: { value: React.ReactNode; label: string; className?: string }) {
  return (
    <div className={cn('ds-stat rounded-lg bg-[var(--ds-subtle)] px-2 py-2 text-center min-w-0', className)}>
      <p className="text-sm font-bold text-foreground tabular-nums truncate">{value}</p>
      <p className="text-[10px] text-muted-foreground truncate">{label}</p>
    </div>
  );
}

/* ── Primary full-width button (emerald) ───────────────────────────────── */

export function BrandButton({
  href,
  onClick,
  children,
  className,
  disabled,
  size = 'md',
}: {
  href?: string;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  size?: 'sm' | 'md';
}) {
  const cls = cn(
    'ds-brand-btn inline-flex items-center justify-center gap-1.5 rounded-lg bg-[var(--brand)] font-semibold text-[var(--on-brand)] hover:bg-[var(--brand-hover)] transition active:scale-[0.99] disabled:opacity-60 disabled:pointer-events-none',
    size === 'sm' ? 'min-h-8 px-3 text-xs' : 'min-h-10 px-4 text-sm',
    className,
  );
  if (href) return <Link href={href} className={cls}>{children}</Link>;
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={cls}>
      {children}
    </button>
  );
}

/* ── Segmented tabs (Lessons · 60-Second Notes · Flashcards …) ──────────── */

export function SegmentedTabs<T extends string>({
  items,
  value,
  onChange,
  className,
  stretch = false,
}: {
  items: { value: T; label: string; icon?: LucideIcon }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
  stretch?: boolean;
}) {
  return (
    <div
      role="tablist"
      className={cn('ds-seg flex gap-1 overflow-x-auto no-scrollbar rounded-xl bg-[var(--ds-subtle)] p-1', className)}
    >
      {items.map((it) => {
        const active = it.value === value;
        const Icon = it.icon;
        return (
          <button
            key={it.value}
            type="button"
            role="tab"
            aria-selected={active}
            data-active={active ? 'true' : undefined}
            onClick={() => onChange(it.value)}
            className={cn(
              'ds-seg-item inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs sm:text-[13px] font-semibold transition',
              stretch && 'flex-1',
              active
                ? 'bg-[var(--surface-card)] text-foreground shadow-[0_1px_3px_rgba(15,23,42,0.08)]'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {Icon && <Icon className="size-3.5" />}
            {it.label}
          </button>
        );
      })}
    </div>
  );
}

/* ── Progress bar & ring ───────────────────────────────────────────────── */

export function Bar({ value, tone = 'brand', className }: { value: number; tone?: 'brand' | 'gold' | 'danger'; className?: string }) {
  const pct = Math.max(0, Math.min(100, value));
  const fill = tone === 'gold' ? 'bg-[var(--reward)]' : tone === 'danger' ? 'bg-[var(--danger)]' : 'bg-[var(--brand)]';
  return (
    <div className={cn('ds-bar h-1.5 w-full overflow-hidden rounded-full bg-[var(--ds-track)]', className)}>
      <div className={cn('ds-bar-fill h-full rounded-full transition-[width] duration-700', fill)} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Ring({ value, size = 76, stroke = 6, children }: { value: number; size?: number; stroke?: number; children?: React.ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--ds-track)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--brand)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (c * pct) / 100}
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}

/* ── Avatar with initials fallback ─────────────────────────────────────── */

export function initialsOf(name?: string | null, fallback = '?') {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return fallback;
  return ((parts[0][0] || '') + (parts[1]?.[0] || parts[0][1] || '')).toUpperCase();
}

export function Initials({
  name,
  src,
  size = 32,
  className,
}: {
  name?: string | null;
  src?: string | null;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--brand)] font-bold text-white',
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.34)) }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="size-full object-cover" />
      ) : (
        initialsOf(name)
      )}
    </span>
  );
}

/* ── Empty state ───────────────────────────────────────────────────────── */

export function EmptyNote({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="ds-empty rounded-xl border border-dashed border-[var(--border-card)] px-4 py-6 text-center">
      <p className="text-xs text-muted-foreground">{children}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

/* ── Helpers ───────────────────────────────────────────────────────────── */

export function greeting(date = new Date()) {
  const h = date.getHours();
  if (h < 5) return 'Xayrli tun';
  if (h < 12) return 'Xayrli tong';
  if (h < 18) return 'Xayrli kun';
  return 'Xayrli kech';
}

export function relativeTime(input?: string | null) {
  if (!input) return '';
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return input;
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'hozirgina';
  if (diff < 3600) return `${Math.floor(diff / 60)} daq oldin`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} soat oldin`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} kun oldin`;
  return d.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short' });
}

export function formatMinutes(min: number) {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (!h) return `${m}d`;
  return `${h}s ${m}d`;
}
