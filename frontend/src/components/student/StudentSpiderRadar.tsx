'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Zap, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type RadarStats = {
  subject_mastery: number; // 0 - 100
  logic: number;           // 0 - 100
  speed: number;           // 0 - 100
  accuracy: number;        // 0 - 100
  writing: number;         // 0 - 100
  consistency: number;     // 0 - 100
  overall_power?: number;  // 0 - 100
};

interface StudentSpiderRadarProps {
  stats?: RadarStats;
  className?: string;
}

const AXES = [
  { key: 'subject_mastery', label: 'Fan Bilimi', icon: '📚' },
  { key: 'logic', label: 'Mantiq & ELO', icon: '🧠' },
  { key: 'speed', label: 'Tezlik', icon: '⚡' },
  { key: 'accuracy', label: 'Aniqlik', icon: '🎯' },
  { key: 'writing', label: 'Esse & Tahlil', icon: '✍️' },
  { key: 'consistency', label: 'Barqarorlik', icon: '🔥' },
] as const;

export default function StudentSpiderRadar({
  stats = {
    subject_mastery: 78,
    logic: 72,
    speed: 85,
    accuracy: 80,
    writing: 65,
    consistency: 90,
    overall_power: 78,
  },
  className,
}: StudentSpiderRadarProps) {
  const size = 300;
  const center = size / 2;
  const radius = 100;
  const numAxes = 6;
  const angleStep = (Math.PI * 2) / numAxes;

  // Har bir ko'rsatkichni xavfsiz son ekanligini tekshiramiz (NaN dan himoya)
  const safeStats: RadarStats = {
    subject_mastery: typeof stats?.subject_mastery === 'number' && !isNaN(stats.subject_mastery) ? stats.subject_mastery : 75,
    logic: typeof stats?.logic === 'number' && !isNaN(stats.logic) ? stats.logic : 72,
    speed: typeof stats?.speed === 'number' && !isNaN(stats.speed) ? stats.speed : 75,
    accuracy: typeof stats?.accuracy === 'number' && !isNaN(stats.accuracy) ? stats.accuracy : 70,
    writing: typeof stats?.writing === 'number' && !isNaN(stats.writing) ? stats.writing : 65,
    consistency: typeof stats?.consistency === 'number' && !isNaN(stats.consistency) ? stats.consistency : 80,
    overall_power: typeof stats?.overall_power === 'number' && !isNaN(stats.overall_power) ? stats.overall_power : undefined,
  };

  // Grid halqalari (25%, 50%, 75%, 100%)
  const levels = [0.25, 0.5, 0.75, 1];

  function getCoordinates(index: number, valueRatio: number) {
    const angle = index * angleStep - Math.PI / 2;
    const x = center + radius * valueRatio * Math.cos(angle);
    const y = center + radius * valueRatio * Math.sin(angle);
    return { x: Number(x.toFixed(1)), y: Number(y.toFixed(1)) };
  }

  // Polygon nuqtalari
  const polygonPoints = AXES.map((axis, i) => {
    const val = safeStats[axis.key as keyof RadarStats] ?? 50;
    const numVal = typeof val === 'number' && !isNaN(val) ? val : 50;
    const ratio = Math.max(0.15, Math.min(1, numVal / 100));
    const { x, y } = getCoordinates(i, ratio);
    return `${x},${y}`;
  }).join(' ');

  const statValues = [
    safeStats.subject_mastery,
    safeStats.logic,
    safeStats.speed,
    safeStats.accuracy,
    safeStats.writing,
    safeStats.consistency,
  ];
  const overall = safeStats.overall_power || Math.round(
    statValues.reduce((a, b) => a + b, 0) / 6
  );

  return (
    <div
      className={cn(
        'relative flex flex-col items-center justify-center p-5 rounded-3xl bg-zinc-900/65 border border-white/[0.08] backdrop-blur-xl shadow-xl overflow-hidden',
        className
      )}
    >
      {/* Background radial glow */}
      <div className="absolute inset-0 bg-radial from-blue-500/10 via-transparent to-transparent pointer-events-none" />

      {/* Header with FIFA-style Overall rating badge */}
      <div className="w-full flex items-center justify-between mb-2 z-10">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
            <Sparkles className="size-4 text-blue-400" />
            Radar-Analitika (Spider Chart)
          </h3>
          <p className="text-[12px] text-zinc-400">
            6 ta asosiy ilmiy ko'nikma balansi
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-3 py-1 rounded-xl shadow-md shadow-blue-500/25">
          <Zap className="size-3.5 fill-current" />
          <span className="text-xs font-bold tracking-wider">{overall} OVR</span>
        </div>
      </div>

      {/* The SVG Radar */}
      <div className="relative w-full max-w-[300px] aspect-square flex items-center justify-center my-1 select-none">
        <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full overflow-visible">
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

          {/* Web Background Grid Hexagons */}
          {levels.map((lvl, lIdx) => {
            const points = Array.from({ length: numAxes })
              .map((_, i) => {
                const { x, y } = getCoordinates(i, lvl);
                return `${x},${y}`;
              })
              .join(' ');

            return (
              <polygon
                key={lIdx}
                points={points}
                fill="none"
                stroke="rgba(255, 255, 255, 0.08)"
                strokeWidth="1"
                strokeDasharray={lIdx === levels.length - 1 ? undefined : '2,2'}
              />
            );
          })}

          {/* Axis Radial Lines */}
          {Array.from({ length: numAxes }).map((_, i) => {
            const { x, y } = getCoordinates(i, 1);
            return (
              <line
                key={i}
                x1={center}
                y1={center}
                x2={x}
                y2={y}
                stroke="rgba(255, 255, 255, 0.12)"
                strokeWidth="1"
              />
            );
          })}

          {/* Student Stats Polygon */}
          <polygon
            points={polygonPoints}
            fill="url(#radarFillGrad)"
            stroke="url(#radarStrokeGrad)"
            strokeWidth="2.5"
            strokeLinejoin="round"
            className="transition-all duration-700 ease-out"
          />

          {/* Nodes at vertices */}
          {AXES.map((axis, i) => {
            const val = stats[axis.key as keyof RadarStats] || 50;
            const ratio = Math.max(0.15, Math.min(1, val / 100));
            const { x, y } = getCoordinates(i, ratio);

            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r="4.5"
                fill="#60A5FA"
                stroke="#FFFFFF"
                strokeWidth="1.5"
                className="drop-shadow-[0_0_6px_rgba(96,165,250,0.8)]"
              />
            );
          })}

          {/* Labels around the radar */}
          {AXES.map((axis, i) => {
            const { x, y } = getCoordinates(i, 1.26);
            const val = stats[axis.key as keyof RadarStats] || 50;

            return (
              <g key={axis.key} transform={`translate(${x}, ${y})`}>
                <text
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="fill-zinc-300 text-[12px] font-bold select-none"
                >
                  {axis.icon} {axis.label}
                </text>
                <text
                  y="12"
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="fill-blue-400 text-[11px] font-bold font-mono select-none"
                >
                  {val}%
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Footer hint */}
      <div className="w-full pt-3 mt-1 border-t border-white/[0.06] flex items-center justify-between text-[12px] text-zinc-400">
        <span>Eng kuchli tomon: <b>Tezlik (85%)</b></span>
        <span className="text-amber-400">O'sish talab: <b>Esse (65%)</b></span>
      </div>
    </div>
  );
}
