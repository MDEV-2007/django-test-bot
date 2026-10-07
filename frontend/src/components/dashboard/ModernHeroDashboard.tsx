'use client';

import React from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Play,
  Swords,
  Flame,
  Check,
  ChevronRight,
  Target,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface HeroDashboardProps {
  user: {
    first_name?: string;
    username: string;
    streak?: number;
    coins?: number;
    elo_rating?: number;
  };
  recommendedSprint?: {
    title: string;
    topic: string;
    durationMinutes: number;
    progressPct: number;
    subjectName: string;
    actionUrl: string;
  };
  dailyGoals?: {
    current: number;
    target: number;
    streakDays: boolean[];
  };
  battleArena?: {
    onlinePlayers: number;
    currentRank: string;
    elo: number;
  };
}

/**
 * 1. HERO FOCUS BANNER: Clean, minimalist primary call-to-action
 */
export function HeroFocusBanner({
  user,
  recommendedSprint = {
    title: "Biologiya — Genetik modellashtirish va DNK sintezi",
    topic: '15-daqiqalik Fokus Sprinti',
    durationMinutes: 15,
    progressPct: 65,
    subjectName: 'Biologiya',
    actionUrl: '/tests',
  },
}: {
  user: HeroDashboardProps['user'];
  recommendedSprint?: HeroDashboardProps['recommendedSprint'];
}) {
  const firstName = user.first_name || user.username;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 sm:p-8 transition-colors shadow-card">
      <div className="relative z-10 flex flex-col gap-6 min-w-0 max-w-full">
        {/* Left: Guidance & Information */}
        <div className="space-y-4 min-w-0 max-w-full">
          {/* AI Study Compass Chip */}
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary transition-colors">
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-primary" />
            </span>
            <span>AI Study Compass · {recommendedSprint.subjectName}</span>
            <ChevronRight className="size-3.5 text-primary" />
          </div>

          {/* Greeting & Clear Subtitle */}
          <div className="space-y-1.5">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Xayrli kun, {firstName}! 👋
            </h1>
            <p className="text-sm leading-relaxed max-w-xl text-muted-foreground font-normal">
              AI tahliliga ko&apos;ra, bugungi 15-daqiqalik fokus sprinti sizning OTM kirish ehtimolingizni{' '}
              <strong className="font-semibold text-primary">
                +8.4% ga
              </strong>{' '}
              oshiradi.
            </p>
          </div>

          {/* Recommended Sprint Progress Strip */}
          <div className="w-full max-w-xl min-w-0 rounded-xl border border-border bg-muted/40 p-3 sm:p-4 space-y-2.5">
            <div className="flex items-center justify-between gap-2 text-xs min-w-0">
              <span className="font-medium truncate min-w-0 flex-1 text-foreground">
                📌 {recommendedSprint.title}
              </span>
              <span className="shrink-0 rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-primary">
                {Math.round(recommendedSprint.progressPct)}%
              </span>
            </div>
            <div className="relative h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${Math.max(5, Math.min(100, recommendedSprint.progressPct))}%` }}
              />
            </div>
          </div>

          {/* CTAs */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href={recommendedSprint.actionUrl || '/tests'}
              className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-xs sm:text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition active:scale-98 cursor-pointer shadow-xs"
            >
              <Play className="size-3.5 fill-current" />
              <span>Sprintni Boshlash (15 daq)</span>
              <ArrowRight className="size-3.5" />
            </Link>

            <Link
              href="/study"
              className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-xs sm:text-sm font-medium text-foreground hover:bg-muted transition active:scale-98"
            >
              Fokus Xonasi (Pomodoro)
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 2. DAILY GOAL & 7-DAY STREAK CARD
 */
export function DailyGoalCard({
  user,
  dailyGoals = {
    current: 3,
    target: 3,
    streakDays: [true, true, true, true, true, false, false],
  },
}: {
  user: { streak?: number };
  dailyGoals?: HeroDashboardProps['dailyGoals'];
}) {
  const goalPct = Math.min(100, Math.round((dailyGoals.current / dailyGoals.target) * 100));
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (goalPct / 100) * circumference;
  const dayLabels = ['D', 'S', 'CH', 'P', 'J', 'SH', 'Y'];

  return (
    <Card className="rounded-2xl border border-border bg-card p-5 space-y-4 shadow-card">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg border border-amber-500/20 bg-amber-500/10 text-amber-500">
            <Flame className="size-4 fill-current" />
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
              Kunlik Marra &amp; Streak
            </h3>
            <p className="text-[11px] text-muted-foreground font-normal">
              Minimal 3 ta topshiriq
            </p>
          </div>
        </div>
        <Badge
          variant="outline"
          className="text-[11px] font-semibold px-2 py-0.5 rounded-md border-primary/20 bg-primary/10 text-primary"
        >
          {goalPct}%
        </Badge>
      </div>

      {/* Circular Progress & Message */}
      <div className="flex items-center gap-3.5">
        <div className="relative flex size-20 shrink-0 items-center justify-center">
          <svg className="size-full -rotate-90" viewBox="0 0 88 88">
            <circle
              cx="44"
              cy="44"
              r={radius}
              className="stroke-muted"
              strokeWidth="6"
              fill="transparent"
            />
            <circle
              cx="44"
              cy="44"
              r={radius}
              className="stroke-primary transition-all duration-700 ease-out"
              strokeWidth="6"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
            />
          </svg>
          <div className="absolute flex flex-col items-center justify-center text-center select-none">
            <span className="text-[10px]">🔥</span>
            <span className="text-xs font-bold font-mono text-foreground leading-none">
              {dailyGoals.current}/{dailyGoals.target}
            </span>
          </div>
        </div>

        <div className="min-w-0 space-y-0.5">
          <p className="text-xs sm:text-sm font-semibold text-foreground">
            {goalPct >= 100 ? "Bugungi marra bajarildi! 🎉" : "Sur'atni saqlang!"}
          </p>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Ketma-ket{' '}
            <strong className="font-semibold text-amber-500">
              {user.streak || 0} kundan
            </strong>{' '}
            beri faolsiz.
          </p>
        </div>
      </div>

      {/* 7-Days Streak Matrix */}
      <div className="pt-3 border-t border-border">
        <div className="grid grid-cols-7 gap-1 text-center">
          {dayLabels.map((day, idx) => {
            const active = dailyGoals.streakDays[idx] || false;
            return (
              <div key={idx} className="flex flex-col items-center gap-0.5">
                <div
                  className={cn(
                    'flex size-6 sm:size-7 items-center justify-center rounded-lg text-[10px] transition-colors',
                    active
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'border border-border bg-muted/50 text-muted-foreground font-medium'
                  )}
                >
                  {active ? <Check className="size-3 stroke-[2.5]" /> : day}
                </div>
                <span className="text-[8px] font-semibold text-muted-foreground">
                  {day}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

/**
 * 3. 1V1 BATTLE ARENA CARD
 */
export function BattleArenaCard({
  battleArena = {
    onlinePlayers: 42,
    currentRank: 'Navkar II',
    elo: 1420,
  },
}: {
  battleArena?: HeroDashboardProps['battleArena'];
}) {
  return (
    <Card className="rounded-2xl border border-border bg-card p-5 space-y-4 shadow-card">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
            <Swords className="size-4" />
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
              1v1 Jonli Bellashuv
            </h3>
            <p className="text-[11px] text-muted-foreground font-normal">
              Tezkor intellektual duel
            </p>
          </div>
        </div>

        <Badge
          variant="outline"
          className="text-[10px] font-semibold gap-1.5 px-2 py-0.5 border-border bg-muted/60 text-muted-foreground"
        >
          <span className="size-1.5 rounded-full bg-emerald-500" />
          {battleArena.onlinePlayers} onlayn
        </Badge>
      </div>

      {/* Rank / ELO Display */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="rounded-xl border border-border bg-muted/30 p-3">
          <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
            Unvon
          </span>
          <p className="text-sm font-semibold text-foreground mt-0.5">
            {battleArena.currentRank}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-muted/30 p-3">
          <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
            Joriy ELO
          </span>
          <p className="text-sm font-mono font-bold text-primary mt-0.5">
            {battleArena.elo}
          </p>
        </div>
      </div>

      {/* Match Button */}
      <Link
        href="/battles"
        className="w-full flex min-h-[40px] items-center justify-center gap-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs active:scale-98 transition-all cursor-pointer shadow-xs"
      >
        <Swords className="size-3.5" />
        <span>Raqib Qidirish</span>
        <ArrowRight className="size-3.5" />
      </Link>
    </Card>
  );
}

/**
 * Default combined ModernHeroDashboard
 */
export default function ModernHeroDashboard(props: HeroDashboardProps) {
  return (
    <div className="space-y-6">
      <HeroFocusBanner
        user={props.user}
        recommendedSprint={props.recommendedSprint}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <DailyGoalCard
          user={props.user}
          dailyGoals={props.dailyGoals}
        />
        <BattleArenaCard
          battleArena={props.battleArena}
        />
      </div>
    </div>
  );
}
