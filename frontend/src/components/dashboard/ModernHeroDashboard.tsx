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
  Clock,
  Sparkles,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import PremiumIcon from '@/components/ui/premium-icon';

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
  theme?: string;
}

/**
 * 1. HERO FOCUS BANNER: Apple iOS 18 Smart Stack / Apple Intelligence Focus Widget
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
  theme?: string;
}) {
  const firstName = user.first_name || user.username;

  return (
    <div className="relative overflow-hidden rounded-[28px] border border-border bg-card p-6 sm:p-8 shadow-card">
      {/* Subtle Apple Intelligence Mesh Aura */}
      <div className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-[#007AFF]/10 blur-3xl" />
      <div className="pointer-events-none absolute -left-16 -bottom-16 size-64 rounded-full bg-[#34C759]/8 blur-3xl" />

      <div className="relative z-10 flex flex-col gap-5 min-w-0 max-w-full">
        <div className="space-y-4 min-w-0 max-w-full">
          {/* iOS Dynamic Island Style Compass Pill */}
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <PremiumIcon icon={Sparkles} tone="sky" size="2xs" />
            <span>AI Study Compass · {recommendedSprint.subjectName}</span>
            <ChevronRight className="size-3.5 text-primary/70" />
          </div>

          {/* Apple Editorial Greeting */}
          <div className="space-y-1.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-[-0.025em] text-foreground">
              Xayrli kun, {firstName}! 👋
            </h1>
            <p className="text-sm leading-relaxed max-w-xl text-muted-foreground font-normal">
              AI tahliliga ko&apos;ra, bugungi 15-daqiqalik fokus sprinti sizning OTM kirish ehtimolingizni{' '}
              <strong className="font-semibold text-[#34C759] dark:text-[#30D158]">
                +8.4% ga
              </strong>{' '}
              oshiradi.
            </p>
          </div>

          {/* iOS Inset Grouped Progress Strip */}
          <div className="w-full max-w-xl min-w-0 rounded-[20px] border border-border bg-muted/45 p-4 space-y-2.5">
            <div className="flex items-center justify-between gap-2 text-xs min-w-0">
              <span className="font-semibold truncate min-w-0 flex-1 text-foreground">
                📌 {recommendedSprint.title}
              </span>
              <span className="shrink-0 rounded-full bg-primary/12 px-2.5 py-0.5 font-mono text-[11px] font-bold text-primary">
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

          {/* iOS Pill Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Link
              href={recommendedSprint.actionUrl || '/tests'}
              className="ios-spring inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-primary px-6 py-2.5 text-xs sm:text-sm font-semibold text-primary-foreground shadow-[0_6px_20px_rgba(0,122,255,0.32),inset_0_1px_0_rgba(255,255,255,0.25)] hover:opacity-95 cursor-pointer"
            >
              <Play className="size-3.5 fill-current" />
              <span>Sprintni Boshlash (15 daq)</span>
              <ArrowRight className="size-3.5" />
            </Link>

            <Link
              href="/study"
              className="ios-spring inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full border border-border bg-muted/60 hover:bg-muted px-5 py-2.5 text-xs sm:text-sm font-semibold text-foreground"
            >
              <Clock className="size-3.5 text-muted-foreground" />
              <span>Fokus Xonasi</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 2. DAILY GOAL & 7-DAY STREAK CARD (Apple Fitness Activity Ring Style)
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
  theme?: string;
}) {
  const goalPct = Math.min(100, Math.round((dailyGoals.current / dailyGoals.target) * 100));
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (goalPct / 100) * circumference;
  const dayLabels = ['D', 'S', 'CH', 'P', 'J', 'SH', 'Y'];

  return (
    <Card className="rounded-[26px] border border-border bg-card p-5 space-y-4 shadow-card">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <PremiumIcon icon={Flame} tone="amber" size="sm" solid />
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Kunlik Marra &amp; Streak
            </h3>
            <p className="text-[11px] text-muted-foreground font-normal">
              Apple Fitness uslubidagi halqa
            </p>
          </div>
        </div>
        <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-[#34C759]/14 text-[#248A3D] dark:text-[#30D158]">
          {goalPct}%
        </span>
      </div>

      {/* Circular Activity Ring & Message */}
      <div className="flex items-center gap-4">
        <div className="relative flex size-20 shrink-0 items-center justify-center">
          <svg className="size-full -rotate-90" viewBox="0 0 88 88">
            <circle
              cx="44"
              cy="44"
              r={radius}
              className="stroke-muted"
              strokeWidth="7"
              fill="transparent"
            />
            <circle
              cx="44"
              cy="44"
              r={radius}
              className="stroke-[#34C759] dark:stroke-[#30D158] transition-all duration-700 ease-out"
              strokeWidth="7"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
            />
          </svg>
          <div className="absolute flex flex-col items-center justify-center text-center select-none">
            <span className="text-[10px]">🔥</span>
            <span className="text-xs font-extrabold font-mono text-foreground leading-none">
              {dailyGoals.current}/{dailyGoals.target}
            </span>
          </div>
        </div>

        <div className="min-w-0 space-y-0.5">
          <p className="text-xs sm:text-sm font-bold text-foreground">
            {goalPct >= 100 ? 'Bugungi marra bajarildi! 🎉' : "Sur'atni saqlang!"}
          </p>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Ketma-ket{' '}
            <strong className="font-bold text-[#FF9500]">
              {user.streak || 0} kundan
            </strong>{' '}
            beri faolsiz.
          </p>
        </div>
      </div>

      {/* 7-Days iOS Habit Dots */}
      <div className="pt-3 border-t border-border">
        <div className="grid grid-cols-7 gap-1.5 text-center">
          {dayLabels.map((day, idx) => {
            const active = dailyGoals.streakDays[idx] || false;
            return (
              <div key={idx} className="flex flex-col items-center gap-1">
                <div
                  className={cn(
                    'flex size-7 items-center justify-center rounded-full text-[10px] transition-all',
                    active
                      ? 'bg-gradient-to-b from-[#FF9500] to-[#E08600] text-white font-bold shadow-[0_2px_8px_rgba(255,149,0,0.35)]'
                      : 'bg-muted/70 text-muted-foreground font-semibold'
                  )}
                >
                  {active ? <Check className="size-3.5 stroke-[2.5]" /> : day}
                </div>
                <span className="text-[9px] font-semibold text-muted-foreground">
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
 * 3. 1V1 BATTLE ARENA CARD (iOS Game Center Duel Widget)
 */
export function BattleArenaCard({
  battleArena = {
    onlinePlayers: 42,
    currentRank: 'Navkar II',
    elo: 1420,
  },
}: {
  battleArena?: HeroDashboardProps['battleArena'];
  theme?: string;
}) {
  return (
    <Card className="rounded-[26px] border border-border bg-card p-5 space-y-4 shadow-card">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <PremiumIcon icon={Swords} tone="rose" size="sm" solid />
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
              1v1 Jonli Bellashuv
            </h3>
            <p className="text-[11px] text-muted-foreground font-normal">
              Game Center intellektual duel
            </p>
          </div>
        </div>

        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#34C759]/12 text-[#248A3D] dark:text-[#30D158]">
          <span className="size-1.5 rounded-full bg-[#34C759] animate-pulse" />
          {battleArena.onlinePlayers} onlayn
        </span>
      </div>

      {/* Rank / ELO Display */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="rounded-[18px] bg-muted/50 p-3.5">
          <span className="text-[10px] uppercase font-bold text-muted-foreground block">
            Unvon
          </span>
          <p className="text-sm font-bold text-foreground mt-0.5">
            {battleArena.currentRank}
          </p>
        </div>
        <div className="rounded-[18px] bg-muted/50 p-3.5">
          <span className="text-[10px] uppercase font-bold text-muted-foreground block">
            Joriy ELO
          </span>
          <p className="text-sm font-mono font-bold text-primary mt-0.5">
            {battleArena.elo}
          </p>
        </div>
      </div>

      {/* Match Pill Button */}
      <Link
        href="/battles"
        className="ios-spring w-full flex min-h-[42px] items-center justify-center gap-2 rounded-full bg-primary hover:opacity-95 text-primary-foreground font-semibold text-xs shadow-[0_6px_18px_rgba(0,122,255,0.28)] cursor-pointer"
      >
        <Swords className="size-3.5" />
        <span>Raqib Qidirish</span>
        <ArrowRight className="size-3.5" />
      </Link>
    </Card>
  );
}

export default function ModernHeroDashboard(props: HeroDashboardProps) {
  return (
    <div className="space-y-6">
      <HeroFocusBanner
        user={props.user}
        recommendedSprint={props.recommendedSprint}
        theme={props.theme}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <DailyGoalCard
          user={props.user}
          dailyGoals={props.dailyGoals}
          theme={props.theme}
        />
        <BattleArenaCard
          battleArena={props.battleArena}
          theme={props.theme}
        />
      </div>
    </div>
  );
}
