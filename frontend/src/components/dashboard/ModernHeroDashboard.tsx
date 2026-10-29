'use client';

import React, { useState, useEffect } from 'react';
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
  Target,
  Gift,
  Trophy,
  Zap,
  Shield,
  AlertTriangle,
  RotateCcw,
  TrendingUp,
  Award,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  predictedScore?: {
    scaledScore?: number;
    grade?: string;
    nextGrade?: string;
    gapToNext?: number;
  };
  marathon?: {
    step1Done: boolean;
    step2Done: boolean;
    step3Done: boolean;
    mistakesCount: number;
    onStartMistakes?: () => void;
    onOpenChest?: () => void;
  };
  comboMultiplier?: number;
  theme?: string;
}

/**
 * JONLI FAOLIYAT MIKRO-TIKERI (Multiplayer Live Activity Ribbon)
 */
export function LiveActivityTicker() {
  const tickerItems = [
    { icon: Zap, tone: 'amber' as const, text: "Javohir hozirgina Tarix Milliy Sertifikat testidan 68.5 ball (A+) oldi! 🎯" },
    { icon: Swords, tone: 'rose' as const, text: "Malika 1v1 Arenada ketma-ket 5-g'alabasini qo'lga kiritdi! ⚔️" },
    { icon: Trophy, tone: 'gold' as const, text: "Oltin Ligada Shaxzoda 4,250 XP bilan haftalik yetakchilikni saqlamoqda! 👑" },
    { icon: Target, tone: 'emerald' as const, text: "Otabek 8 ta zaif mavzuli xatolarini yopib, +100 tanga yutib oldi! 💡" },
    { icon: Sparkles, tone: 'sky' as const, text: "Hozir siz bilan birga 48 ta abituriyent jimjitlikda dars qilmoqda 📚" },
  ];

  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % tickerItems.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [tickerItems.length]);

  const current = tickerItems[currentIndex];
  const Icon = current.icon;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card/90 px-4 py-2.5 shadow-2xs backdrop-blur-md">
      <div className="flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="relative flex size-2 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#34C759] opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-[#34C759]" />
          </span>
          <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            Jonli Lenta
          </span>
          <div className="flex items-center gap-1.5 truncate text-foreground font-medium animate-fadeIn">
            <Icon className="size-3.5 text-primary shrink-0" />
            <span className="truncate">{current.text}</span>
          </div>
        </div>

        <Link
          href="/feed"
          className="shrink-0 text-[11px] font-semibold text-primary hover:underline flex items-center gap-0.5"
        >
          <span>Hamjamiyat</span>
          <ChevronRight className="size-3" />
        </Link>
      </div>
    </div>
  );
}

/**
 * 1. HERO FOCUS BANNER: BUGUNGI AI MARAFON (3 BOSQICHLI AVTOPILOT ZANJIRI)
 * Barcha mustaqil elementlarni yagona konveyerga bog'laydi.
 */
export function HeroFocusBanner({
  user,
  recommendedSprint = {
    title: "Tarix — Amir Temur davlati va harbiy yurishlari",
    topic: '15-daqiqalik Fokus Sprinti',
    durationMinutes: 15,
    progressPct: 65,
    subjectName: 'Tarix',
    actionUrl: '/tests',
  },
  predictedScore = {
    scaledScore: 58.4,
    grade: 'B+',
    nextGrade: 'A',
    gapToNext: 1.6,
  },
  marathon = {
    step1Done: false,
    step2Done: false,
    step3Done: false,
    mistakesCount: 0,
  },
  comboMultiplier = 1.5,
}: {
  user: HeroDashboardProps['user'];
  recommendedSprint?: HeroDashboardProps['recommendedSprint'];
  predictedScore?: HeroDashboardProps['predictedScore'];
  marathon?: HeroDashboardProps['marathon'];
  comboMultiplier?: number;
  theme?: string;
}) {
  const firstName = user.first_name || user.username;
  const completedSteps = (marathon.step1Done ? 1 : 0) + (marathon.step2Done ? 1 : 0) + (marathon.step3Done ? 1 : 0);
  const isMarathonComplete = completedSteps === 3;
  const progressPercent = Math.round((completedSteps / 3) * 100);

  return (
    <div className="relative overflow-hidden rounded-[28px] border border-border bg-card p-5 sm:p-7 shadow-card space-y-5">
      {/* Dynamic Ambient Background Meshes */}
      <div className="pointer-events-none absolute -right-20 -top-20 size-72 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -left-20 -bottom-20 size-72 rounded-full bg-[#34C759]/10 blur-3xl" />

      {/* ─── YUQORI QISM: Dinamik Prognoz Barometri & Combo Multiplier ─── */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3.5 pb-4 border-b border-border/70">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/12 border border-primary/20 px-3 py-0.5 text-xs font-bold text-primary">
              <Sparkles className="size-3.5 text-amber-500 animate-pulse" />
              Bugungi AI Marafon · Konveyer Oqimi
            </span>

            {/* Combo Multiplier (Flow State) */}
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 text-[11px] font-extrabold text-amber-600 dark:text-amber-400">
              <Zap className="size-3 fill-amber-500 text-amber-500" />
              {comboMultiplier}x Fokus Oqimi faol!
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
            Salom, {firstName}! 🚀
          </h1>
        </div>

        {/* Dinamik Sertifikat Barometri */}
        <div className="flex items-center gap-3 rounded-2xl bg-muted/60 border border-border/80 px-4 py-2.5 self-start md:self-auto">
          <div className="size-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 font-black text-sm">
            {predictedScore.grade || 'B+'}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <span>Sertifikat Prognozi:</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-extrabold">
                {predictedScore.scaledScore?.toFixed(1) || '58.4'} ball
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground font-medium">
              Keyingi <strong className="text-foreground font-bold">&quot;{predictedScore.nextGrade || 'A'}&quot;</strong> darajaga atigi{' '}
              <span className="font-mono font-bold text-primary">{predictedScore.gapToNext || 1.6} ball</span> qoldi! 🎯
            </p>
          </div>
        </div>
      </div>

      {/* ─── LOSS AVERSION OGOHLANTIRISHI (Agar xatolar bo'lsa) ─── */}
      {marathon.mistakesCount > 0 && (
        <div className="relative z-10 flex items-center justify-between gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-xs font-medium text-rose-600 dark:text-rose-400">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 shrink-0 text-rose-500 animate-bounce" />
            <span>
              <strong>Diqqat:</strong> Aqlli daftaringizda <strong>{marathon.mistakesCount} ta xato</strong> tozalanishi kutmoqda. Prognoz ballingiz tushib ketmasligi uchun 2-bosqichni yakunlang!
            </span>
          </div>
          {marathon.onStartMistakes && (
            <button
              onClick={marathon.onStartMistakes}
              className="shrink-0 text-xs font-bold underline hover:text-rose-700 cursor-pointer"
            >
              Hoziroq tozalash →
            </button>
          )}
        </div>
      )}

      {/* ─── 3 BOSQICHLI AVTOPILOT ZANJIRI (The Core Loop Stepper) ─── */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {/* BOSQICH 1: Fokus Sprint */}
        <div
          className={cn(
            'flex flex-col justify-between rounded-2xl border p-4 transition-all duration-200',
            marathon.step1Done
              ? 'border-emerald-500/40 bg-emerald-500/5'
              : 'border-border/80 bg-card hover:border-primary/40 hover:bg-muted/30'
          )}
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <Clock className="size-3.5 text-primary" />
                1-Bosqich · Sprint
              </span>
              {marathon.step1Done ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                  <Check className="size-3 stroke-[2.5]" /> Bajarildi
                </span>
              ) : (
                <span className="text-[10px] font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  15 daqiqa
                </span>
              )}
            </div>

            <h3 className="text-sm font-bold text-foreground leading-snug line-clamp-2">
              {recommendedSprint.title}
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Kunlik fokus sinovini yakunlab, o&apos;zlashtirishni mustahkamlang.
            </p>
          </div>

          <div className="mt-3 pt-2.5 border-t border-border/50 flex items-center justify-between">
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">+50 XP bonus</span>
            {marathon.step1Done ? (
              <Button size="sm" variant="ghost" className="h-7 text-xs font-semibold text-muted-foreground" disabled>
                Bajarildi ✓
              </Button>
            ) : (
              <Button asChild size="sm" className="h-7.5 px-3.5 rounded-xl text-xs font-semibold bg-primary gap-1">
                <Link href={recommendedSprint.actionUrl || '/tests'}>
                  <Play className="size-3 fill-current" />
                  <span>Boshlash</span>
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* BOSQICH 2: Aqlli Xatolarni Tozalash */}
        <div
          className={cn(
            'flex flex-col justify-between rounded-2xl border p-4 transition-all duration-200',
            marathon.step2Done
              ? 'border-emerald-500/40 bg-emerald-500/5'
              : 'border-border/80 bg-card hover:border-rose-500/40 hover:bg-muted/30'
          )}
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <Target className="size-3.5 text-rose-500" />
                2-Bosqich · Xatolar
              </span>
              {marathon.step2Done ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                  <Check className="size-3 stroke-[2.5]" /> Tozalandi
                </span>
              ) : (
                <span className="text-[10px] font-mono font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full">
                  {marathon.mistakesCount} ta xato
                </span>
              )}
            </div>

            <h3 className="text-sm font-bold text-foreground leading-snug">
              Aqlli Xatolar Daftari
            </h3>
            <p className="text-[11px] text-muted-foreground">
              {marathon.mistakesCount > 0
                ? `${marathon.mistakesCount} ta xatoni yanchib, bilimdagi kemtiklarni yoping.`
                : "Ajoyib! Barcha xatolar to'liq tozalangan."}
            </p>
          </div>

          <div className="mt-3 pt-2.5 border-t border-border/50 flex items-center justify-between">
            <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">+40 XP &amp; Tahlil</span>
            {marathon.step2Done ? (
              <Button size="sm" variant="ghost" className="h-7 text-xs font-semibold text-muted-foreground" disabled>
                0 ta xato ✓
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={marathon.onStartMistakes}
                className="h-7.5 px-3.5 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white gap-1 cursor-pointer"
              >
                <RotateCcw className="size-3" />
                <span>Tozalash</span>
              </Button>
            )}
          </div>
        </div>

        {/* BOSQICH 3: 1v1 Arena Dueli */}
        <div
          className={cn(
            'flex flex-col justify-between rounded-2xl border p-4 transition-all duration-200',
            marathon.step3Done
              ? 'border-emerald-500/40 bg-emerald-500/5'
              : 'border-border/80 bg-card hover:border-amber-500/40 hover:bg-muted/30'
          )}
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <Swords className="size-3.5 text-amber-500" />
                3-Bosqich · Arena
              </span>
              {marathon.step3Done ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                  <Check className="size-3 stroke-[2.5]" /> Duel o&apos;ynaldi
                </span>
              ) : (
                <span className="text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                  1v1 Jang
                </span>
              )}
            </div>

            <h3 className="text-sm font-bold text-foreground leading-snug">
              1v1 Intellektual Bellashuv
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Tengdosh abituriyent bilan real vaqtda kuch sinashib, ELO to&apos;plang.
            </p>
          </div>

          <div className="mt-3 pt-2.5 border-t border-border/50 flex items-center justify-between">
            <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">+50 Tanga yutug&apos;i</span>
            {marathon.step3Done ? (
              <Button size="sm" variant="ghost" className="h-7 text-xs font-semibold text-muted-foreground" disabled>
                Yakunlandi ✓
              </Button>
            ) : (
              <Button asChild size="sm" className="h-7.5 px-3.5 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white gap-1">
                <Link href="/battles">
                  <Swords className="size-3" />
                  <span>Jang qilish</span>
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ─── PASTKI QISM: Kundalik Sirli Sandiq Mukofoti Halqasi ─── */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-amber-500/15 via-primary/10 to-emerald-500/15 border border-amber-500/30 p-4">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0 shadow-xs">
            <Gift className="size-5 animate-bounce" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs sm:text-sm font-extrabold text-foreground">
                🎁 MUKOFOT: Kundalik Sirli Sandiq
              </h4>
              <span className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded-full">
                {completedSteps}/3 bajarildi
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {isMarathonComplete
                ? "Barcha 3 ta bosqich muvaffaqiyatli yakunlandi! Sandiqni ochishga tayyorsiz!"
                : "3 ta bosqichni to'liq yakunlang va 500 XP gacha, tangalar yoki Freeze mukofotini oling!"}
            </p>
          </div>
        </div>

        {/* Mukofotni ochish tugmasi */}
        {isMarathonComplete ? (
          <Button
            size="sm"
            onClick={marathon.onOpenChest}
            className="rounded-full bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-600 hover:to-emerald-600 text-white font-bold text-xs px-5 shadow-lg shadow-amber-500/25 animate-pulse cursor-pointer"
          >
            <span>🎁 Sandiqni Ochish!</span>
          </Button>
        ) : (
          <div className="w-32 sm:w-44 space-y-1">
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-primary transition-all duration-500 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="block text-right text-[10px] font-mono text-muted-foreground font-semibold">
              {progressPercent}% tayyor
            </span>
          </div>
        )}
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
              Kunlik maqsad rivojlanish halqasi
            </p>
          </div>
        </div>
        <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-[#34C759]/14 text-[#248A3D] dark:text-[#30D158]">
          {goalPct}%
        </span>
      </div>

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
          <div className="absolute flex flex-col items-center justify-center text-center select-none gap-0.5">
            <Flame className="size-3.5 text-[#FF9500] fill-[#FF9500]" />
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
        predictedScore={props.predictedScore}
        marathon={props.marathon}
        comboMultiplier={props.comboMultiplier}
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
