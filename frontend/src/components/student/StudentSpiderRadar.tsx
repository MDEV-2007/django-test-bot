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
        'relative flex flex-col items-center justify-center p-5 rounded-3xl bg-zinc-900/65 border border-white/[0.08] backdrop-blur-xl shadow-xl overflow-hidden',
        className,
      )}
    >
      <div className="absolute inset-0 bg-radial from-blue-500/10 via-transparent to-transparent pointer-events-none" />

      <div className="w-full flex items-center justify-between mb-2 z-10">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
            <Sparkles className="size-4 text-blue-400" />
            Radar-Analitika
          </h3>
          <p className="text-[12px] text-zinc-400">
            {radar === undefined
              ? 'Yuklanmoqda...'
              : radar === null
              ? "Ma'lumotni yuklab bo'lmadi"
              : radar.has_data
              ? `${radar.answered} ta javob asosida`
              : 'Hali yakunlangan test yo\'q'}
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-3 py-1 rounded-xl shadow-md shadow-blue-500/25">
          <Zap className="size-3.5 fill-current" />
          <span className="text-xs font-bold tracking-wider">{overall !== null ? `${overall} OVR` : '— OVR'}</span>
        </div>
      </div>

      <div className="relative w-full max-w-[300px] aspect-square flex items-center justify-center my-1 select-none">
        <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full overflow-visible" role="img"
             aria-label="Ko'nikmalar radari">
          <defs>
            <linearGradient id="radarFillGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.25" />
            </linearGradient>
            <linearGradient id="radarStrokeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#60A5FA" />
              <stop offset="100%" stopColor="#A78BFA" />
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
              stroke="rgba(255, 255, 255, 0.08)"
              strokeWidth="1"
              strokeDasharray={lIdx === levels.length - 1 ? undefined : '2,2'}
            />
          ))}

          {Array.from({ length: numAxes }).map((_, i) => {
            const { x, y } = getCoordinates(i, 1);
            return <line key={i} x1={center} y1={center} x2={x} y2={y} stroke="rgba(255, 255, 255, 0.12)" strokeWidth="1" />;
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
              <circle key={axis.key} cx={x} cy={y} r="4.5" fill="#60A5FA" stroke="#FFFFFF" strokeWidth="1.5"
                      className="drop-shadow-[0_0_6px_rgba(96,165,250,0.8)]" />
            );
          })}

          {AXES.map((axis, i) => {
            const { x, y } = getCoordinates(i, 1.26);
            const val = axisValue(radar, axis.key);
            const isProxy = !!radar?.axes?.[axis.key]?.is_proxy;
            return (
              <g key={axis.key} transform={`translate(${x}, ${y})`}>
                <title>{radar?.axes?.[axis.key]?.basis || axis.label}</title>
                <text textAnchor="middle" dominantBaseline="central" className="fill-zinc-300 text-[12px] font-bold select-none">
                  {axis.icon} {axis.label}
                </text>
                <text y="12" textAnchor="middle" dominantBaseline="central"
                      className="fill-blue-400 text-[11px] font-bold font-mono select-none">
                  {val === null ? '—' : `${isProxy ? '≈' : ''}${val}%`}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="w-full pt-3 mt-1 border-t border-white/[0.06] space-y-1 text-[12px] text-zinc-400">
        {strongest ? (
          <div className="flex items-center justify-between gap-2">
            <span>Eng kuchli tomon: <b>{strongest.label} ({strongest.value}%)</b></span>
            {weakest && weakest.key !== strongest.key && (
              <span className="text-amber-400">O&apos;sish talab: <b>{weakest.label} ({weakest.value}%)</b></span>
            )}
          </div>
        ) : (
          <span>Test yeching — radar haqiqiy natijalaringiz asosida to&apos;ladi.</span>
        )}
        {hasProxy && <p className="text-[11px] text-zinc-500">≈ — taxminiy ko&apos;rsatkich (bevosita o&apos;lchanmaydi). &quot;—&quot; — ma&apos;lumot yo&apos;q.</p>}
      </div>
    </div>
  );
}
