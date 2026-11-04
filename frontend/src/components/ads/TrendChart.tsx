'use client';

import { useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { SeriesPoint } from '@/lib/ads-api';
import { cn } from '@/lib/utils';

const SERIES = [
  { key: 'impressions', label: "Ko'rsatish" },
  { key: 'reach', label: 'Qamrov' },
  { key: 'clicks', label: 'Bosish' },
  { key: 'leads', label: 'Lid' },
] as const;

type Key = (typeof SERIES)[number]['key'];

/* Bitta metrika, bitta rang (brand). Metrikalar shkalasi juda farq qiladi
   (ko'rsatish ≫ lid), shuning uchun bir grafikda aralashtirilmaydi — tanlanadi. */
export default function TrendChart({ data, height = 240 }: { data: SeriesPoint[]; height?: number }) {
  const [metric, setMetric] = useState<Key>('impressions');
  const total = data.reduce((s, p) => s + p[metric], 0);
  const label = SERIES.find((s) => s.key === metric)!.label;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 px-5 pt-4">
        <div role="tablist" className="inline-flex rounded-lg bg-[var(--surface-hover)] p-0.5">
          {SERIES.map((s) => (
            <button key={s.key} role="tab" aria-selected={metric === s.key} onClick={() => setMetric(s.key)}
              className={cn('rounded-md px-2.5 py-1 text-[12px] font-medium transition',
                metric === s.key ? 'bg-[var(--surface-card)] text-[var(--text-primary)] shadow-xs' : 'text-[var(--text-muted)]')}>
              {s.label}
            </button>
          ))}
        </div>
        <span className="text-[12px] text-[var(--text-muted)]">Davr bo&apos;yicha jami: <b className="tabular-nums text-[var(--text-primary)]">{total}</b></span>
      </div>
      {total === 0 ? (
        <div className="grid place-items-center text-[13px] text-[var(--text-muted)]" style={{ height }}>
          Bu davrda {label.toLowerCase()} qayd etilmagan.
        </div>
      ) : (
        <div className="px-2 pb-3 pt-2" style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
              <defs>
                <linearGradient id="adsFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="var(--brand)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="var(--border-soft)" />
              <XAxis dataKey="date" tickLine={false} axisLine={false} minTickGap={24}
                tick={{ fontSize: 11, fill: 'var(--text-faint)' }} tickFormatter={(d: string) => d.slice(5).replace('-', '.')} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={44} tick={{ fontSize: 11, fill: 'var(--text-faint)' }} />
              <Tooltip
                cursor={{ stroke: 'var(--border-strong)' }}
                contentStyle={{ borderRadius: 8, border: '1px solid var(--border-card)', background: 'var(--surface-card)', fontSize: 12 }}
                labelFormatter={(d) => String(d)}
                formatter={(v) => [v as number, label]}
              />
              <Area type="monotone" dataKey={metric} stroke="var(--brand)" strokeWidth={2} fill="url(#adsFill)" dot={false} activeDot={{ r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
