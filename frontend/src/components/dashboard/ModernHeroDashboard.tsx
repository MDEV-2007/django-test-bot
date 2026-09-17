'use client';

import React from 'react';
import Link from 'next/link';
import {
  Sparkles,
  ArrowRight,
  Play,
  Swords,
  Flame,
  Check,
  Target,
  ChevronRight,
  ShieldCheck,
  Trophy,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface HeroDashboardProps {
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

export default function ModernHeroDashboard({
  user,
  recommendedSprint = {
    title: 'Biologiya — Genetik modellashtirish va DNK sintezi',
    topic: '15-daqiqalik Fokus Sprinti',
    durationMinutes: 15,
    progressPct: 65,
    subjectName: 'Biologiya',
    actionUrl: '/tests',
  },
  dailyGoals = {
    current: 3,
    target: 3,
    streakDays: [true, true, true, true, true, false, false],
  },
  battleArena = {
    onlinePlayers: 42,
    currentRank: 'Navkar II',
    elo: 1420,
  },
}: HeroDashboardProps) {
  const firstName = user.first_name || user.username;

  // Circular progress hisob-kitobi
  const goalPct = Math.min(100, Math.round((dailyGoals.current / dailyGoals.target) * 100));
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (goalPct / 100) * circumference;

  const dayLabels = ['D', 'S', 'CH', 'P', 'J', 'SH', 'Y'];

  return (
    <div className="space-y-6">
      {/* ============================================================ */}
      {/* 1. COMMANDING AI NAVIGATOR HERO BANNER                        */}
      {/* ============================================================ */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-800/80 bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-slate-950 p-6 sm:p-8 backdrop-blur-xl border-t border-white/15 shadow-2xl">
        {/* Ambient Mesh Glow Effects in Background */}
        <div className="pointer-events-none absolute -right-20 -top-20 size-80 rounded-full bg-emerald-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 -bottom-20 size-80 rounded-full bg-purple-500/10 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:16px_16px] opacity-15" />

        <div className="relative z-10 grid gap-6 lg:grid-cols-12 items-center">
          {/* Left: Personalized Guidance */}
          <div className="lg:col-span-8 space-y-4">
            {/* Subject / AI Compass Chip */}
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-bold text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
              </span>
              <span>AI Study Compass · {recommendedSprint.subjectName}</span>
              <ChevronRight className="size-3.5 text-emerald-400" />
            </div>

            {/* Greeting & Subtitle */}
            <div className="space-y-1.5">
              <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white leading-tight">
                Xayrli kun, {firstName}! 👋
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-xl">
                AI tahliliga ko&apos;ra, bugungi 15-daqiqalik fokus sprinti sizning OTM kirish ehtimolingizni{' '}
                <strong className="text-emerald-400 font-bold">+8.4% ga</strong> oshiradi.
              </p>
            </div>

            {/* Recommended Sprint Strip */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3.5 sm:p-4 backdrop-blur-md max-w-xl space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-300 truncate pr-2">
                  📌 {recommendedSprint.title}
                </span>
                <span className="text-[11px] font-mono text-emerald-400 font-bold shrink-0">
                  {recommendedSprint.progressPct}% o&apos;zlashtirildi
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                  style={{ width: `${recommendedSprint.progressPct}%` }}
                />
              </div>
            </div>

            {/* Premium CTA Button with Continuous Shimmer Effect */}
            <div className="pt-1 flex flex-wrap items-center gap-3">
              <Link
                href={recommendedSprint.actionUrl}
                className="relative group overflow-hidden inline-flex min-h-[48px] items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 px-6 sm:px-8 py-3 text-sm sm:text-base font-black text-slate-950 shadow-[0_0_25px_rgba(16,185,129,0.4)] hover:shadow-[0_0_35px_rgba(16,185,129,0.6)] hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
              >
                {/* Continuous Shimmer Light Ray */}
                <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />

                <Play className="size-4 fill-slate-950" />
                <span>Sprintni Boshlash (15 daq)</span>
                <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
              </Link>

              <Link
                href="/study"
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/60 px-5 py-3 text-xs sm:text-sm font-bold text-slate-300 hover:text-white hover:border-slate-700 transition active:scale-95"
              >
                Fokus Xonasiga o&apos;tish
              </Link>
            </div>
          </div>

          {/* Right: 3D Hologram / Mascot Visual */}
          <div className="hidden lg:flex lg:col-span-4 justify-end">
            <div className="relative group">
              <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-emerald-500 to-teal-500 opacity-25 blur-xl group-hover:opacity-40 transition" />
              <div className="relative w-56 xl:w-64 aspect-[4/3] rounded-3xl overflow-hidden border-2 border-white/20 bg-slate-900 shadow-2xl ring-4 ring-emerald-500/20">
                <img
                  src="/images/mascot-hero.jpg"
                  alt="Ilm Mascot"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end p-4">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-300">
                    <Sparkles className="size-3.5" />
                    <span>AI Mentor Faol</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. GAMIFICATION CARDS: GOALS & 1V1 ESPORTS MATCHMAKING ARENA */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5">
        {/* CARD 1: DAILY GOAL & 7-DAY STREAK (lg:col-span-6) */}
        <Card className="lg:col-span-6 rounded-3xl border border-slate-800/80 bg-slate-900/50 p-5 sm:p-6 backdrop-blur-xl border-t border-white/10 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
                  <Target className="size-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-white uppercase tracking-wider">
                    Kunlik Marra
                  </h3>
                  <p className="text-[11px] text-slate-400">Har kungi minimal 3 ta topshiriq</p>
                </div>
              </div>
              <Badge
                variant="outline"
                className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs font-black px-2.5 py-0.5 rounded-full"
              >
                {goalPct}% bajarildi
              </Badge>
            </div>

            {/* Circular Progress & Text */}
            <div className="flex items-center gap-4 py-2">
              <div className="relative flex size-20 sm:size-24 shrink-0 items-center justify-center">
                <svg className="size-full -rotate-90" viewBox="0 0 96 96">
                  <circle
                    cx="48"
                    cy="48"
                    r={radius}
                    className="stroke-slate-800"
                    strokeWidth="8"
                    fill="transparent"
                  />
                  <circle
                    cx="48"
                    cy="48"
                    r={radius}
                    className="stroke-emerald-400 transition-all duration-1000 ease-out"
                    strokeWidth="8"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    fill="transparent"
                    style={{ filter: 'drop-shadow(0 0 6px rgba(16,185,129,0.5))' }}
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="text-sm">🔥</span>
                  <span className="text-xs font-black text-white font-mono leading-none mt-0.5">
                    {dailyGoals.current}/{dailyGoals.target}
                  </span>
                  <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">test</span>
                </div>
              </div>

              <div className="min-w-0 space-y-1">
                <p className="text-xs sm:text-sm font-extrabold text-white leading-snug">
                  {goalPct >= 100 ? "Bugungi marra yakunlandi! 🎉" : "Zo'r sur'atda ketyapsiz!"}
                </p>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Siz ketma-ket <strong className="text-amber-400">{user.streak || 0} kundan</strong> beri
                  o&apos;rganishni qoldirmayapsiz.
                </p>
              </div>
            </div>
          </div>

          {/* 7-Days Streak Matrix */}
          <div className="pt-4 border-t border-slate-800/80 mt-2">
            <div className="grid grid-cols-7 gap-1.5 text-center">
              {dayLabels.map((day, idx) => {
                const active = dailyGoals.streakDays[idx] || false;
                return (
                  <div key={idx} className="flex flex-col items-center gap-1">
                    <div
                      className={cn(
                        'flex size-7 items-center justify-center rounded-xl text-[10px] font-black transition-all',
                        active
                          ? 'bg-emerald-500 text-slate-950 font-black shadow-[0_0_10px_rgba(16,185,129,0.4)]'
                          : 'border border-slate-800 bg-slate-900/60 text-slate-500'
                      )}
                    >
                      {active ? <Check className="size-3.5 stroke-[3]" /> : day}
                    </div>
                    <span className="text-[9px] font-bold text-slate-500">{day}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        {/* CARD 2: 1V1 ESPORTS BATTLE ARENA (lg:col-span-6) */}
        <Card className="lg:col-span-6 relative overflow-hidden rounded-3xl border border-rose-500/30 bg-gradient-to-br from-rose-950/20 via-slate-900/50 to-purple-950/20 p-5 sm:p-6 backdrop-blur-xl border-t border-white/10 shadow-[0_0_30px_rgba(244,63,94,0.12)] flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-2xl bg-rose-500/20 text-rose-400 ring-2 ring-rose-500/30">
                  <Swords className="size-4.5" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-white uppercase tracking-wider">
                    1v1 Jonli Bellashuv
                  </h3>
                  <p className="text-[11px] text-slate-400">Esports formatidagi tezkor duel</p>
                </div>
              </div>

              {/* Pulsing Live Badge */}
              <Badge className="bg-rose-500/15 border border-rose-500/40 text-rose-300 text-[10px] font-black gap-1.5 px-2.5 py-0.5 animate-pulse">
                <span className="size-1.5 rounded-full bg-rose-500" />
                {battleArena.onlinePlayers} o&apos;quvchi onlayn
              </Badge>
            </div>

            {/* Rank / ELO Display */}
            <div className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/70 p-3.5 backdrop-blur-md">
              <div className="space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Ligadagi Unvon</span>
                <p className="text-sm font-black text-white flex items-center gap-1.5">
                  <span>🛡️</span>
                  <span>{battleArena.currentRank}</span>
                </p>
              </div>
              <div className="text-right space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Joriy ELO</span>
                <p className="text-base font-mono font-black text-rose-400">
                  {battleArena.elo}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Find Match Button */}
          <div className="pt-4 mt-2">
            <Link
              href="/battles"
              className="w-full flex min-h-[46px] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rose-600 to-purple-600 hover:from-rose-500 hover:to-purple-500 text-white font-black text-xs sm:text-sm shadow-[0_0_20px_rgba(244,63,94,0.35)] hover:shadow-[0_0_30px_rgba(244,63,94,0.5)] active:scale-98 transition-all cursor-pointer"
            >
              <Swords className="size-4" />
              <span>Raqib Qidirish (Find Match)</span>
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
