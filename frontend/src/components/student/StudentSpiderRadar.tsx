'use client';

import React from 'react';
import { Sparkles, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

export type RadarAxisKey = 'subject_mastery' | 'logic' | 'speed' | 'accuracy' | 'writing' | 'consistency';

/** Server (`/api/analytics/` -> `skill_radar`) bergan o'q: qiymat bo'lmasa — ma'lumot yo'q. */
export type RadarAxis = {
  value: number | null;
  is_proxy: boolean;
  basis: string;
};

export type SkillRadar = {
  axes: Record<RadarAxisKey, RadarAxis>;
  overall: number | null;
  answered: number;
  has_data: boolean;
};

interface StudentSpiderRadarProps {
  /** undefined — yuklanmoqda; null — yuklab bo'lmadi. Soxta zaxira qiymatlar yo'q. */
  radar?: SkillRadar | null;
  className?: string;
}

const AXES: { key: RadarAxisKey; label: string; icon: string }[] = [
  { key: 'subject_mastery', label: 'Fan Bilimi', icon: '📚' },
  { key: 'logic', label: 'Mantiq (ELO)', icon: '🧠' },
  { key: 'speed', label: 'Tezlik', icon: '⚡' },
  { key: 'accuracy', label: 'Aniqlik', icon: '🎯' },
  { key: 'writing', label: 'Esse (Writing)', icon: '✍️' },
  { key: 'consistency', label: 'Barqarorlik', icon: '🔥' },
];

function axisValue(radar: SkillRadar | null | undefined, key: RadarAxisKey): number | null {
  const v = radar?.axes?.[key]?.value;
  return typeof v === 'number' && !isNaN(v) ? v : null;
}

export default function StudentSpiderRadar({ radar, className }: StudentSpiderRadarProps) {
  const size = 300;
  const center = size / 2;
  const radius = 100;
  const numAxes = AXES.length;
  const angleStep = (Math.PI * 2) / numAxes;
  const levels = [0.25, 0.5, 0.75, 1];

  function getCoordinates(index: number, valueRatio: number) {
    const angle = index * angleStep - Math.PI / 2;
    const x = center + radius * valueRatio * Math.cos(angle);
    const y = center + radius * valueRatio * Math.sin(angle);
    return { x: Number(x.toFixed(1)), y: Number(y.toFixed(1)) };
  }

  // Ma'lumot yo'q o'q markazda (0) chiziladi — 50% kabi soxta qiymat bilan to'ldirilmaydi.
  const ratios = AXES.map((a) => Math.max(0, Math.min(1, (axisValue(radar, a.key) ?? 0) / 100)));
  const polygonPoints = ratios
    .map((r, i) => {
      const { x, y } = getCoordinates(i, r);
      return `${x},${y}`;
    })
    .join(' ');

  // "Eng kuchli / zaif tomon" faqat test natijasi bo'lganda (bitta streak o'qidan xulosa yo'q).
  const measured = radar?.has_data
    ? AXES.map((a) => ({ ...a, value: axisValue(radar, a.key) })).filter(
        (a): a is typeof a & { value: number } => a.value !== null,
      )
    : [];
  const strongest = measured.length ? measured.reduce((a, b) => (b.value > a.value ? b : a)) : null;
  const weakest = measured.length > 1 ? measured.reduce((a, b) => (b.value < a.value ? b : a)) : null;
  const overall = radar?.overall ?? null;
  const hasProxy = AXES.some((a) => radar?.axes?.[a.key]?.is_proxy && axisValue(radar, a.key) !== null);

  return (
    <div
      className={cn(
        'relative flex flex-col items-center justify-center overflow-hidden rounded-[28px] bg-[var(--ps-paper,var(--surface-card))] p-6 text-[var(--text-primary)] shadow-[var(--ds-panel-shadow)] sm:p-7',
        className,
      )}
    >
      <div aria-hidden className="pointer-events-none absolute -right-14 -top-14 size-44 rounded-full bg-[var(--ps-purple,#7659C7)] opacity-15" />
      <div aria-hidden className="pointer-events-none absolute -bottom-16 -left-12 size-40 rounded-full bg-[var(--ps-orange,#FFB82E)] opacity-15" />

      <div className="relative z-10 mb-2 flex w-full items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-[22px] font-bold tracking-[-0.035em] [font-family:var(--font-grotesk),var(--font-sans),sans-serif]">
            <span className="inline-flex size-9 items-center justify-center rounded-full bg-[var(--ps-purple,#7659C7)] text-white"><Sparkles className="size-4" /></span>
            Radar-analitika
          </h3>
          <p className="mt-1 text-[12px] text-[var(--text-muted)]">
            {radar === undefined
              ? 'Yuklanmoqda...'
              : radar === null
              ? "Ma'lumotni yuklab bo'lmadi"
              : radar.has_data
              ? `${radar.answered} ta javob asosida`
              : 'Hali yakunlangan test yo\'q'}
          </p>
        </div>

        <div className="flex items-center gap-1.5 rounded-full bg-[#080808] py-1.5 pl-1.5 pr-3.5 text-[#FFFCF7] dark:bg-[#FFFCF7] dark:text-[#080808]">
          <span className="flex size-6 items-center justify-center rounded-full bg-[var(--ps-orange,#FFB82E)] text-[#080808]"><Zap className="size-3.5 fill-current" /></span>
          <span className="text-[13px] font-bold tabular-nums">{overall !== null ? `${overall} OVR` : '— OVR'}</span>
        </div>
      </div>

      <div className="relative w-full max-w-[300px] aspect-square flex items-center justify-center my-1 select-none">
        <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full overflow-visible text-[var(--text-primary)]" role="img"
             aria-label="Ko'nikmalar radari">
          <defs>
            <linearGradient id="radarFillGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#7659C7" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#F0523D" stopOpacity="0.25" />
            </linearGradient>
            <linearGradient id="radarStrokeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#7659C7" />
              <stop offset="100%" stopColor="#F0523D" />
            </linearGradient>
          </defs>

          {levels.map((lvl, lIdx) => (
            <polygon
              key={lIdx}
              points={Array.from({ length: numAxes })
                .map((_, i) => {
                  const { x, y } = getCoordinates(i, lvl);
                  return `${x},${y}`;
                })
                .join(' ')}
              fill="none"
              stroke="currentColor" strokeOpacity="0.12"
              strokeWidth="1"
              strokeDasharray={lIdx === levels.length - 1 ? undefined : '2,2'}
            />
          ))}

          {Array.from({ length: numAxes }).map((_, i) => {
            const { x, y } = getCoordinates(i, 1);
            return <line key={i} x1={center} y1={center} x2={x} y2={y} stroke="currentColor" strokeOpacity="0.16" strokeWidth="1" />;
          })}

          {measured.length > 0 && (
            <polygon
              points={polygonPoints}
              fill="url(#radarFillGrad)"
              stroke="url(#radarStrokeGrad)"
              strokeWidth="2.5"
              strokeLinejoin="round"
              className="transition-all duration-700 ease-out"
            />
          )}

          {AXES.map((axis, i) => {
            if (axisValue(radar, axis.key) === null) return null;
            const { x, y } = getCoordinates(i, ratios[i]);
            return (
              <circle key={axis.key} cx={x} cy={y} r="5" fill="#FFB82E" stroke="#080808" strokeWidth="2" />
            );
          })}

          {AXES.map((axis, i) => {
            const { x, y } = getCoordinates(i, 1.26);
            const val = axisValue(radar, axis.key);
            const isProxy = !!radar?.axes?.[axis.key]?.is_proxy;
            return (
              <g key={axis.key} transform={`translate(${x}, ${y})`}>
                <title>{radar?.axes?.[axis.key]?.basis || axis.label}</title>
                <text textAnchor="middle" dominantBaseline="central" className="fill-current text-[12px] font-bold select-none">
                  {axis.icon} {axis.label}
                </text>
                <text y="12" textAnchor="middle" dominantBaseline="central"
                      className="fill-[var(--ps-purple,#7659C7)] text-[11px] font-bold select-none">
                  {val === null ? '—' : `${isProxy ? '≈' : ''}${val}%`}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="relative mt-2 w-full space-y-1.5 rounded-[20px] bg-[var(--ps-neutral,var(--surface-input))] p-4 text-[12px] text-[var(--text-muted)]">
        {strongest ? (
          <div className="flex items-center justify-between gap-2">
            <span>Eng kuchli tomon: <b>{strongest.label} ({strongest.value}%)</b></span>
            {weakest && weakest.key !== strongest.key && (
              <span className="font-semibold text-[var(--ps-coral,#F0523D)]">O&apos;sish talab: <b>{weakest.label} ({weakest.value}%)</b></span>
            )}
          </div>
        ) : (
          <span>Test yeching — radar haqiqiy natijalaringiz asosida to&apos;ladi.</span>
        )}
        {hasProxy && <p className="text-[11px] text-[var(--text-faint)]">≈ — taxminiy ko&apos;rsatkich (bevosita o&apos;lchanmaydi). &quot;—&quot; — ma&apos;lumot yo&apos;q.</p>}
      </div>
    </div>
  );
}
