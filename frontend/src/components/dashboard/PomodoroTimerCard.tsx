'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Sparkles,
  ArrowRight,
  Flame,
  Coffee,
  CheckCircle2,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface PomodoroTimerCardProps {
  onSessionComplete?: () => void;
  className?: string;
}

export default function PomodoroTimerCard({ onSessionComplete, className }: PomodoroTimerCardProps) {
  const [durationMinutes, setDurationMinutes] = useState<number>(25);
  const [timeLeft, setTimeLeft] = useState<number>(25 * 60);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [activeSound, setActiveSound] = useState<string | null>('rain');
  const [soundMuted, setSoundMuted] = useState<boolean>(true);
  const [completedSessions, setCompletedSessions] = useState<number>(2);

  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const totalSeconds = durationMinutes * 60;
  const progressPct = Math.min(100, Math.max(0, ((totalSeconds - timeLeft) / totalSeconds) * 100));
  const strokeDashoffset = circumference - (progressPct / 100) * circumference;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  // Countdown timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isRunning) {
      setIsRunning(false);
      setCompletedSessions((c) => c + 1);
      onSessionComplete?.();
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, timeLeft, onSessionComplete]);

  const handleSelectDuration = (mins: number) => {
    setDurationMinutes(mins);
    setTimeLeft(mins * 60);
    setIsRunning(false);
  };

  const handleReset = () => {
    setTimeLeft(durationMinutes * 60);
    setIsRunning(false);
  };

  return (
    <Card
      className={cn(
        'rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-[0_4px_25px_rgba(15,23,42,0.05)] transition-all duration-300',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-xl bg-blue-50 border border-blue-200/80 text-blue-600">
            <Sparkles className="size-4" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              Pomodoro Taymeri
            </h3>
            <p className="text-[11px] font-semibold text-slate-500">
              Ilmiy 25-daqiqalik chuqur fokus rejim
            </p>
          </div>
        </div>

        <Badge
          variant="outline"
          className={cn(
            'px-2.5 py-0.5 text-xs font-black rounded-full border transition-colors',
            isRunning
              ? 'border-blue-300 bg-blue-50 text-blue-700 animate-pulse'
              : 'border-slate-200 bg-slate-50 text-slate-600'
          )}
        >
          {isRunning ? '● Fokus Jarayoni' : 'Kutish rejimida'}
        </Badge>
      </div>

      {/* Center Layout: Circular Ring + Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center py-2">
        {/* SVG Circular Progress Ring */}
        <div className="sm:col-span-5 flex flex-col items-center justify-center">
          <div className="relative flex size-32 items-center justify-center">
            <svg className="size-full -rotate-90" viewBox="0 0 100 100">
              {/* Background Track */}
              <circle
                cx="50"
                cy="50"
                r={radius}
                className="stroke-slate-100"
                strokeWidth="7"
                fill="transparent"
              />
              {/* Dynamic Electric Blue Progress Arc */}
              <circle
                cx="50"
                cy="50"
                r={radius}
                className="stroke-blue-600 transition-all duration-700 ease-out"
                strokeWidth="7"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                style={{ filter: 'drop-shadow(0 2px 8px rgba(37,99,235,0.25))' }}
              />
            </svg>

            {/* Time Display Inside Circle */}
            <div className="absolute flex flex-col items-center justify-center text-center select-none">
              <span className="text-2xl font-black font-mono tracking-tight text-slate-900 leading-none">
                {formattedTime}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-1">
                {isRunning ? 'Qoldi' : 'Seans'}
              </span>
            </div>
          </div>
        </div>

        {/* Controls & Quick Presets */}
        <div className="sm:col-span-7 space-y-4">
          {/* Duration Presets */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Vaqtni tanlash
            </span>
            <div className="grid grid-cols-3 gap-2">
              {[15, 25, 50].map((mins) => {
                const isCurrent = durationMinutes === mins;
                return (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => handleSelectDuration(mins)}
                    className={cn(
                      'min-h-[44px] rounded-xl border text-xs font-black transition-all cursor-pointer select-none active:scale-95',
                      isCurrent
                        ? 'border-blue-600 bg-blue-600 text-white shadow-[0_2px_10px_rgba(37,99,235,0.3)]'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    )}
                  >
                    {mins} daq
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Buttons: Play/Pause & Reset */}
          <div className="flex items-center gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => setIsRunning(!isRunning)}
              className={cn(
                'flex-1 min-h-[48px] rounded-2xl flex items-center justify-center gap-2 font-black text-xs sm:text-sm transition-all cursor-pointer select-none active:scale-95 shadow-md',
                isRunning
                  ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-[0_4px_16px_rgba(245,158,11,0.3)]'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-[0_4px_16px_rgba(37,99,235,0.35)]'
              )}
            >
              {isRunning ? (
                <>
                  <Pause className="size-4 fill-slate-950" />
                  <span>Pauza</span>
                </>
              ) : (
                <>
                  <Play className="size-4 fill-white" />
                  <span>Boshlash</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-all cursor-pointer active:scale-95"
              title="Qayta boshlash"
              aria-label="Qayta boshlash"
            >
              <RotateCcw className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Ambient Sound Mini Selector Strip */}
      <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-slate-500">Fon tovushi:</span>
          <div className="flex items-center gap-1.5">
            {[
              { id: 'rain', label: 'Yomg\'ir', icon: '🌧️' },
              { id: 'library', label: 'Kutubxona', icon: '📚' },
              { id: 'fire', label: 'Olov', icon: '🔥' },
            ].map((snd) => (
              <button
                key={snd.id}
                type="button"
                onClick={() => {
                  setActiveSound(snd.id);
                  setSoundMuted(false);
                }}
                className={cn(
                  'px-2 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer',
                  activeSound === snd.id && !soundMuted
                    ? 'border-blue-300 bg-blue-50 text-blue-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                )}
              >
                <span>{snd.icon}</span> {snd.label}
              </button>
            ))}
          </div>
        </div>

        <Link
          href="/study"
          className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 hover:underline shrink-0"
        >
          <span>Fokus xonasi</span>
          <ArrowRight className="size-3" />
        </Link>
      </div>
    </Card>
  );
}
