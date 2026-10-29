'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Play,
  Pause,
  RotateCcw,
  Clock,
  ArrowRight,
  CloudRain,
  BookOpen,
  Flame,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import PremiumIcon from '@/components/ui/premium-icon';

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

  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const totalSeconds = durationMinutes * 60;
  const progressPct = Math.min(100, Math.max(0, ((totalSeconds - timeLeft) / totalSeconds) * 100));
  const strokeDashoffset = circumference - (progressPct / 100) * circumference;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isRunning) {
      setIsRunning(false);
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
        'rounded-[28px] border border-border bg-card p-5 sm:p-6 shadow-card transition-all duration-300',
        className
      )}
    >
      {/* iOS Widget Header */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <PremiumIcon icon={Clock} tone="amber" size="sm" solid />
          <div>
            <h3 className="text-sm font-bold text-foreground tracking-tight">
              Fokus Taymeri (Pomodoro)
            </h3>
            <p className="text-[11px] font-medium text-muted-foreground">
              25-daqiqalik chuqur diqqat va fokus rejimi
            </p>
          </div>
        </div>

        <span
          className={cn(
            'px-3 py-1 text-xs font-semibold rounded-full transition-colors',
            isRunning
              ? 'bg-[#34C759]/14 text-[#248A3D] dark:text-[#30D158] animate-pulse font-bold'
              : 'bg-muted text-muted-foreground'
          )}
        >
          {isRunning ? '● Fokus faol' : 'Tayyor'}
        </span>
      </div>

      {/* Center Layout: Apple Watch Ring + iOS Segmented Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center py-1">
        {/* SVG Circular Progress Ring */}
        <div className="sm:col-span-5 flex flex-col items-center justify-center">
          <div className="relative flex size-32 items-center justify-center">
            <svg className="size-full -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r={radius}
                className="stroke-muted"
                strokeWidth="7"
                fill="transparent"
              />
              <circle
                cx="50"
                cy="50"
                r={radius}
                className="stroke-primary transition-all duration-700 ease-out"
                strokeWidth="7"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>

            <div className="absolute flex flex-col items-center justify-center text-center select-none">
              <span className="text-2xl font-black font-mono tracking-tight text-foreground leading-none">
                {formattedTime}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-1">
                {isRunning ? 'Qoldi' : 'Seans'}
              </span>
            </div>
          </div>
        </div>

        {/* Controls & iOS UISegmentedControl Presets */}
        <div className="sm:col-span-7 space-y-4">
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Vaqtni tanlash
            </span>
            {/* Authentic iOS Segmented Control */}
            <div className="ios-segmented grid grid-cols-3 gap-1">
              {[15, 25, 50].map((mins) => {
                const isCurrent = durationMinutes === mins;
                return (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => handleSelectDuration(mins)}
                    className={cn(
                      'min-h-[36px] text-xs font-semibold transition-all cursor-pointer select-none',
                      isCurrent
                        ? 'ios-segmented-thumb font-bold'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {mins} daq
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Pill Buttons */}
          <div className="flex items-center gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => setIsRunning(!isRunning)}
              className={cn(
                'ios-spring flex-1 min-h-[44px] rounded-full flex items-center justify-center gap-2 font-semibold text-xs sm:text-sm cursor-pointer select-none',
                isRunning
                  ? 'bg-[#FF9500] text-white shadow-[0_6px_18px_rgba(255,149,0,0.32)]'
                  : 'bg-primary text-primary-foreground shadow-[0_6px_18px_rgba(0,122,255,0.32)]'
              )}
            >
              {isRunning ? (
                <>
                  <Pause className="size-4 fill-current" />
                  <span>Pauza</span>
                </>
              ) : (
                <>
                  <Play className="size-4 fill-current" />
                  <span>Boshlash</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="ios-spring flex size-11 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
              title="Qayta boshlash"
              aria-label="Qayta boshlash"
            >
              <RotateCcw className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {/* iOS Control Center Ambient Sound Strip */}
      <div className="mt-4 pt-3.5 border-t border-border flex items-center justify-between gap-3 text-xs flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-muted-foreground">Fon tovushi:</span>
          <div className="flex items-center gap-1.5">
            {[
              { id: 'rain', label: "Yomg'ir", icon: CloudRain, tone: 'sky' as const },
              { id: 'library', label: 'Kutubxona', icon: BookOpen, tone: 'indigo' as const },
              { id: 'fire', label: 'Olov', icon: Flame, tone: 'amber' as const },
            ].map((snd) => {
              const isSelected = activeSound === snd.id && !soundMuted;
              return (
                <button
                  key={snd.id}
                  type="button"
                  onClick={() => {
                    setActiveSound(snd.id);
                    setSoundMuted(false);
                  }}
                  className={cn(
                    'ios-spring pl-1.5 pr-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5',
                    isSelected
                      ? 'bg-primary text-primary-foreground shadow-2xs'
                      : 'bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground'
                  )}
                  title={`${snd.label} fon tovushini yoqish`}
                >
                  <PremiumIcon icon={snd.icon} tone={snd.tone} size="2xs" solid />
                  <span>{snd.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <Link
          href="/study"
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline shrink-0"
        >
          <span>Fokus xonasi</span>
          <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </Card>
  );
}
