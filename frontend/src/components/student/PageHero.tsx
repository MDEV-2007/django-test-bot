'use client';

import type { LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/* O'quvchi sahifalarining yagona sarlavha bloki. Ilgari har bir sahifa shu gradient
   karta + badge + h1 + tavsif kombinatsiyasini o'zicha qayta yozardi — endi bitta manba. */
export default function PageHero({
  eyebrow, eyebrowIcon: EyebrowIcon, title, description, actions, tone = 'accent', className,
}: {
  eyebrow?: string;
  eyebrowIcon?: LucideIcon;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  tone?: 'accent' | 'amber' | 'rose' | 'indigo' | 'sky';
  className?: string;
}) {
  const TONE: Record<string, { border: string; badge: string; glow: string }> = {
    accent: { border: 'border-[var(--accent-border)]', badge: 'border-[var(--accent-border)] bg-primary/12 text-[var(--accent-text)]', glow: 'bg-primary/10' },
    amber: { border: 'border-amber-500/25', badge: 'border-amber-500/30 bg-amber-500/12 text-amber-300', glow: 'bg-amber-500/10' },
    rose: { border: 'border-rose-500/25', badge: 'border-rose-500/30 bg-rose-500/12 text-rose-300', glow: 'bg-rose-500/10' },
    indigo: { border: 'border-indigo-500/25', badge: 'border-indigo-500/30 bg-indigo-500/12 text-indigo-300', glow: 'bg-indigo-500/10' },
    sky: { border: 'border-sky-500/25', badge: 'border-sky-500/30 bg-sky-500/12 text-sky-300', glow: 'bg-sky-500/10' },
  };
  const t = TONE[tone] ?? TONE.accent;

  /* Bu blok — sahifaning yagona "Primary" darajasi: kattaroq ichki bo'shliq (32px),
     kattaroq sarlavha va kuchliroq yorug'lik. Qolgan kartalar "Secondary" bo'lib
     qoladi — shu tariqa ko'z birinchi qayerga tushishi aniq bo'ladi. */
  return (
    <Card className={cn('relative overflow-hidden', t.border, className)}>
      <div className={cn('pointer-events-none absolute -right-24 -top-32 size-80 rounded-full blur-3xl', t.glow)} />
      <div className={cn('pointer-events-none absolute -bottom-28 -left-20 size-64 rounded-full opacity-60 blur-3xl', t.glow)} />
      <CardContent className="relative flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div className="min-w-0">
          {eyebrow && (
            <Badge variant="outline" className={cn('mb-3', t.badge)}>
              {EyebrowIcon && <EyebrowIcon className="size-3.5" />}
              {eyebrow}
            </Badge>
          )}
          <h1 className="font-voice text-2xl font-bold sm:text-3xl">{title}</h1>
          {description && (
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--text-secondary)]">{description}</p>
          )}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </CardContent>
    </Card>
  );
}
