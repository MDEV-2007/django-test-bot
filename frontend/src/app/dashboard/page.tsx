'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  FileCheck2, Swords, BookOpen, Bot, ArrowRight, History, MapPin, HelpCircle,
  Crown, Sparkles, Flame, Coins, Trophy, Snowflake, CheckCircle2,
  ChevronRight, Zap, GraduationCap, Layers, Share2, Headphones, Target, Shield, Play,
  Heart, Bookmark, Dna, Microscope, Brain,
} from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { useApiQuery } from '@/lib/api-cache';
import { getRankInfo } from '@/lib/rank';
import Reveal from '@/components/motion/Reveal';
import PresenceRow from '@/components/student/PresenceRow';
import Celebration from '@/components/student/Celebration';
import { mentorNudge } from '@/lib/mentorVoice';
import StatNumber from '@/components/motion/StatNumber';
import AppShell from '@/components/AppShell';
import CardMotif from '@/components/student/CardMotif';
import SkillTreeGraph from '@/components/student/SkillTreeGraph';
import { cn } from '@/lib/utils';
import { useFeatureFlags } from '@/lib/features';
import PremiumIcon, { PremiumIconTone } from '@/components/ui/premium-icon';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

type DashboardData = {
  profile: {
    username: string; first_name: string; last_name: string; avatar_url: string;
    xp: number; level: number; coins: number; streak: number; elo_rating: number;
    next_level_xp: number; is_premium: boolean;
  };
  xp_progress: number;
  freeze_count: number;
  online_count: number;
  online_peers: { name: string; avatar_url: string | null }[];
  solved_today: number;
  weak_review: { topic_title: string; times_wrong: number; days_ago: number } | null;
  missions: {
    title: string;
    description: string;
    xp_reward: number;
    coin_reward: number;
    current_count: number;
    target_count: number;
    is_completed: boolean;
    action_type?: string;
  }[];
  recent_attempts: { id: number; test_title: string; score: number | null; completed_at: string | null; time_spent_display: string }[];
  suggested_topic: { id: number; title: string; description: string } | null;
  selected_subject: { id: number; name: string } | null;
  subject_mastery?: { id: number; name: string; color?: string; mastery: number; answered?: number }[];
};

const QUICK_ACCESS = [
  { href: '/study', title: 'Fokus Xonasi', desc: 'Pomodoro darsi va ambient tovushlar', icon: Headphones, badge: 'Yangi 🔥', motif: 'lessons' as const, motifTone: 'text-[var(--tone-growth-text)]', iconTone: 'emerald' as PremiumIconTone },
  { href: '/reels', title: 'Bilim Reels', desc: 'Scroll-learning va mini-kvestlar', icon: Sparkles, badge: 'Viral 🎬', motif: 'lessons' as const, motifTone: 'text-[var(--tone-danger-text)]', iconTone: 'rose' as PremiumIconTone, featureKey: 'reels' },
  { href: '/flashcards', title: 'Quick Learn', desc: 'Sanalar va qoidalarni yodlash', icon: Layers, badge: 'Anki ⚡', motif: 'lessons' as const, motifTone: 'text-[var(--tone-growth-text)]', iconTone: 'amber' as PremiumIconTone, featureKey: 'flashcards' },
  { href: '/tests', title: 'Amaliy Mashqlar', desc: 'Rasmiy formatdagi mock mashqlar', icon: FileCheck2, badge: 'BBA', motif: 'tests' as const, motifTone: 'text-[var(--tone-growth-text)]', iconTone: 'emerald' as PremiumIconTone, featureKey: 'tests' },
  { href: '/battles', title: 'Arena: Jonli Duel', desc: 'Jonli intellektual jang', icon: Swords, badge: 'Live ⚔️', motif: 'arena' as const, motifTone: 'text-[var(--tone-danger-text)]', iconTone: 'rose' as PremiumIconTone, featureKey: 'battles' },
  { href: '/learning', title: 'Darslar & Konspektlar', desc: 'Video va audio darslar', icon: BookOpen, badge: 'Audio', motif: 'lessons' as const, motifTone: 'text-[var(--tone-lesson-text)]', iconTone: 'indigo' as PremiumIconTone, featureKey: 'learning' },
];

const MINI_GAMES = [
  { href: '/games/timeline', title: 'Xronologik Ketma-ketlik', desc: "Voqealarni to'g'ri tartibda joylashtiring", icon: History, motif: 'timeline' as const, motifTone: 'text-[var(--tone-lesson-text)]', iconTone: 'indigo' as PremiumIconTone },
  { href: '/games/map', title: "Xarita & Qal'alar Tahlili", desc: 'Qadimgi davlatlar va joylashuvlarni toping', icon: MapPin, motif: 'map' as const, motifTone: 'text-[var(--tone-growth-text)]', iconTone: 'emerald' as PremiumIconTone },
  { href: '/games/character', title: 'Tarixiy Shaxsni Toping', desc: 'Maslahatlar orqali sarkarda yoki allomani toping', icon: HelpCircle, motif: 'character' as const, motifTone: 'text-[var(--tone-streak-text)]', iconTone: 'amber' as PremiumIconTone },
];

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return 'Xayrli tun';
  if (h < 12) return 'Xayrli tong';
  if (h < 18) return 'Xayrli kun';
  return 'Xayrli kech';
}

function DashboardSkeleton() {
  return (
    <main className="page-shell flex-1 space-y-8 bg-[var(--bg-page)] p-4 pb-12 sm:p-6">
      <Skeleton className="h-28 w-full rounded-3xl" />
      <Skeleton className="h-44 w-full rounded-3xl" />
      <div className="grid gap-5 md:grid-cols-12">
        <Skeleton className="h-60 md:col-span-8 rounded-3xl" />
        <Skeleton className="h-60 md:col-span-4 rounded-3xl" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-3xl" />)}
      </div>
    </main>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { access, authReady } = useAuthStore();
  const { isEnabled } = useFeatureFlags();
  const { data, error } = useApiQuery<DashboardData>('/api/dashboard/home/');

  useEffect(() => {
    if (authReady && !access) router.push('/login');
  }, [authReady, access, router]);

  if (error) {
    return (
      <>
        <AppShell />
        <main className="page-shell flex-1 p-6">
          <Card className="border-[var(--danger)]/30">
            <CardContent className="pt-6 text-[var(--danger-text)]">{error}</CardContent>
          </Card>
        </main>
      </>
    );
  }
  if (!data) return <><AppShell /><DashboardSkeleton /></>;

  const p = data.profile;
  const rankInfo = getRankInfo(p.elo_rating || 0);
  const firstName = p.first_name || p.username;
  const fullName = `${firstName} ${p.last_name || ''}`.trim();
  const doneMissions = data.missions.filter((m) => m.is_completed).length;
  const missionPct = data.missions.length ? Math.round((doneMissions / data.missions.length) * 100) : 0;
  const lastAttempt = data.recent_attempts[0] ?? null;
  const allMissionsDone = data.missions.length > 0 && doneMissions === data.missions.length;
  const xpLeft = Math.max(0, p.next_level_xp - p.xp);

  const nudge = mentorNudge({
    firstName,
    streak: p.streak,
    freezeCount: data.freeze_count,
    missionsTotal: data.missions.length,
    missionsDone: doneMissions,
    weakTopic: data.weak_review,
    lastScore: lastAttempt?.score ?? null,
    totalAttempts: data.recent_attempts.length,
    solvedToday: data.solved_today ?? 0,
  });

  // Tanlangan yoki faol fan
  const activeSubject = data.selected_subject?.name || 'Biologiya';
  const suggestedMissionTitle = data.suggested_topic?.title || 'Hujayra mavzusini Master qil';

  return (
    <>
      <AppShell />
      <main className="page-shell flex-1 space-y-6 bg-[var(--bg-page)] p-4 pb-16 sm:p-6 sm:space-y-8">
        {/* ============================================================ */}
        {/* YUQORI QATOR: SALOMLASHISH & ONLAYN HAMROHLAR               */}
        {/* ============================================================ */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-voice text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              {greeting()}, {firstName}! 👋
            </h1>
            <p className="mt-0.5 text-xs sm:text-sm text-muted-foreground">
              Bugun qanday bilim va ko&apos;nikmalarni kashf qilamiz?
            </p>
          </div>
          <PresenceRow
            count={data.online_count}
            peers={data.online_peers ?? []}
            solvedToday={data.solved_today ?? 0}
          />
        </div>

        {/* ============================================================ */}
        {/* 🎮 GAME HUD — O'YINCHI STATUSI (Executive Game HUD)           */}
        {/* ============================================================ */}
        <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-card/95 p-5 sm:p-6 shadow-md backdrop-blur-md">
          <div className="pointer-events-none absolute -right-20 -top-20 size-72 rounded-full bg-primary/10 blur-3xl" />
          <div className="pointer-events-none absolute -left-20 -bottom-20 size-72 rounded-full bg-emerald-500/5 blur-3xl" />

          {/* Yuqori qator: Profil va Unvon (Chapda) + Yagona Game HUD Dok (O'ngda) */}
          <div className="relative flex flex-col gap-4 sm:gap-5 md:flex-row md:items-center md:justify-between">
            {/* O'yinchi Profili & Unvon yo'li */}
            <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
              <div className="relative shrink-0">
                <Avatar className="size-16 sm:size-18 border-2 border-primary/40 shadow-lg ring-4 ring-primary/10">
                  <AvatarImage src={p.avatar_url || undefined} alt={fullName} />
                  <AvatarFallback className="text-base font-black bg-primary/20 text-primary">
                    {firstName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-full bg-background border border-border shadow-xs text-xs">
                  {rankInfo.icon}
                </div>
              </div>

              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-emerald-500 text-lg">🌱</span>
                  <h2 className="text-lg sm:text-xl font-black text-foreground truncate uppercase tracking-tight">
                    {fullName}
                  </h2>
                  <Badge
                    variant="outline"
                    className="border-primary/30 bg-primary/10 text-primary text-[11px] font-extrabold px-2.5 py-0.5 rounded-xl gap-1"
                  >
                    <span>{rankInfo.icon}</span>
                    <span className="uppercase tracking-wider">{rankInfo.title}</span>
                  </Badge>
                  {p.is_premium && (
                    <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-500 text-[10px] font-bold">
                      <Crown className="size-3 mr-0.5" /> Premium
                    </Badge>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                  <span>Unvon yo&apos;li:</span>
                  <span className="font-semibold text-foreground">{rankInfo.title}</span>
                  {rankInfo.nextTitle && (
                    <>
                      <ChevronRight className="size-3 text-muted-foreground" />
                      <span className="font-semibold text-primary">{rankInfo.nextTitle}</span>
                      <span className="text-[11px] text-muted-foreground">
                        ({rankInfo.pointsNeeded} ELO qoldi)
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* O'ng tomon: Yagona Game HUD Resurslar Dok (Streak, Tangalar, Arena) */}
            <div className="flex items-center gap-1 sm:gap-1.5 self-start md:self-auto rounded-2xl bg-background/80 border border-border/80 p-1.5 shadow-xs backdrop-blur-sm">
              {/* Streak */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href="/profile"
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-amber-500/10 transition-colors group"
                  >
                    <PremiumIcon icon={Flame} tone="amber" size="sm" glow className="group-hover:scale-110" />
                    <div>
                      <p className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground">Streak</p>
                      <p className="font-mono text-xs sm:text-sm font-black text-foreground">
                        {p.streak} <span className="text-[10px] font-medium text-muted-foreground">kun</span>
                      </p>
                    </div>
                  </Link>
                </TooltipTrigger>
                <TooltipContent className="max-w-56 text-xs">
                  {data.freeze_count > 0
                    ? `${data.freeze_count} ta muzlatish saqlanmoqda — kun o'tkazib yuborsangiz streak saqlanadi.`
                    : "Har kuni kamida 1 ta mashq ishlasangiz uzluksizlik o'sadi."}
                </TooltipContent>
              </Tooltip>

              <div className="h-6 w-px bg-border/60" />

              {/* Tangalar */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href="/shop"
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-yellow-500/10 transition-colors group"
                  >
                    <PremiumIcon icon={Coins} tone="gold" size="sm" glow className="group-hover:scale-110" />
                    <div>
                      <p className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground">Tangalar</p>
                      <p className="font-mono text-xs sm:text-sm font-black text-foreground">
                        {p.coins.toLocaleString('uz-UZ')}
                      </p>
                    </div>
                  </Link>
                </TooltipTrigger>
                <TooltipContent className="max-w-56 text-xs">
                  Mashqlar, arena va mini-o&apos;yinlarda topiladi. Do&apos;konda sarflanadi.
                </TooltipContent>
              </Tooltip>

              <div className="h-6 w-px bg-border/60" />

              {/* Arena ELO */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href="/battles"
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-rose-500/10 transition-colors group"
                  >
                    <PremiumIcon icon={Swords} tone="rose" size="sm" glow className="group-hover:scale-110" />
                    <div>
                      <p className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground">Arena</p>
                      <p className="font-mono text-xs sm:text-sm font-black text-foreground">
                        {p.elo_rating}
                      </p>
                    </div>
                  </Link>
                </TooltipTrigger>
                <TooltipContent className="max-w-56 text-xs">
                  Joriy ELO reytingi: {p.elo_rating}. Jonli 1v1 janglarda o&apos;sadi.
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Pastki qator: To'liq kenglikdagi Level Progress Bari */}
          <div className="mt-5 pt-4 border-t border-border/60 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 font-bold text-foreground">
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                  <Trophy className="size-3.5" />
                  <span>Level {p.level}</span>
                </span>
                <ChevronRight className="size-3 text-muted-foreground" />
                <span className="text-muted-foreground">Level {p.level + 1}</span>
              </div>

              <div className="flex items-center gap-3 text-xs font-mono">
                <span className="text-muted-foreground">
                  <strong className="text-foreground font-bold">{p.xp.toLocaleString('uz-UZ')}</strong> / {p.next_level_xp.toLocaleString('uz-UZ')} XP
                </span>
                <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary font-bold text-[11px]">
                  {data.xp_progress}%
                </span>
              </div>
            </div>

            {/* Smooth glowing progress track */}
            <div className="relative h-2.5 sm:h-3 w-full overflow-hidden rounded-full bg-muted/60 p-0.5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-primary transition-all duration-700 shadow-xs"
                style={{ width: `${Math.min(100, Math.max(0, data.xp_progress))}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Keyingi bosqichga: <strong className="text-foreground font-semibold">{xpLeft.toLocaleString('uz-UZ')} XP</strong></span>
              <span className="hidden sm:inline italic">Har bir to&apos;g&apos;ri mashq +15~30 XP beradi</span>
            </div>
          </div>
        </div>

        {/* Nishonlash lahzasi */}
        <Celebration level={p.level} streak={p.streak} completedAttempts={data.recent_attempts.length} />

        {/* ============================================================ */}
        {/* 🚀 BUGUNGI MISSIYA & 🌳 BILIM DARAJANG                        */}
        {/* ============================================================ */}
        <div className="grid gap-5 md:grid-cols-12">
          {/* 1. HERO CARD: BUGUNGI MISSIYA */}
          <Card className="relative overflow-hidden md:col-span-7 rounded-3xl border border-primary/25 bg-gradient-to-br from-card via-card to-primary/5 p-6 sm:p-7 shadow-md flex flex-col justify-between">
            <div className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full bg-primary/10 blur-3xl" />

            <div className="space-y-4 sm:space-y-5">
              {/* Header */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary text-xs font-bold px-2.5 py-1 rounded-xl gap-1.5 whitespace-nowrap shrink-0">
                    <Dna className="size-3.5" />
                    <span>{activeSubject}</span>
                  </Badge>
                  <span className="text-xs font-mono font-bold text-amber-500 flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-xl whitespace-nowrap shrink-0">
                    <Zap className="size-3.5" /> +120 XP Kvest
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground bg-muted/60 border border-border/40 px-2.5 py-1 rounded-xl whitespace-nowrap shrink-0">
                  <Target className="size-3.5 text-primary" />
                  <span>KUNLIK MISSIYA</span>
                </div>
              </div>

              {/* Title & Subtitle */}
              <div>
                <h3 className="text-xl sm:text-2xl font-black text-foreground tracking-tight leading-snug">
                  {suggestedMissionTitle}
                </h3>
                <p className="mt-1 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Bugungi 3 bosqichli o&apos;quv rejasini yakunlang va mavzuni to&apos;liq o&apos;zlashtiring:
                </p>
              </div>

              {/* 3 ta bosqich (Clean, structured quest rows) */}
              <div className="space-y-2.5">
                {/* Step 1: Reels */}
                <Link
                  href="/reels"
                  className="flex items-center justify-between gap-3 p-3 sm:p-3.5 rounded-2xl border border-border/80 bg-background/50 hover:bg-background hover:border-rose-500/40 hover:shadow-xs transition-all group"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <PremiumIcon icon={Sparkles} tone="rose" size="md" glow className="group-hover:scale-105 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                        <span className="text-xs sm:text-sm font-bold text-foreground group-hover:text-rose-500 transition-colors">
                          ① 5 min Reels
                        </span>
                        <span className="text-[10px] font-mono font-bold text-rose-500 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full whitespace-nowrap shrink-0">
                          +30 XP
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                        Mavzu bo&apos;yicha mikrokvest va video
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 text-xs font-bold text-rose-500 flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-500/10 group-hover:bg-rose-500 group-hover:text-white transition-all whitespace-nowrap">
                    Ko&apos;rish <ArrowRight className="size-3" />
                  </span>
                </Link>

                {/* Step 2: Mashq */}
                <Link
                  href="/tests"
                  className="flex items-center justify-between gap-3 p-3 sm:p-3.5 rounded-2xl border border-border/80 bg-background/50 hover:bg-background hover:border-emerald-500/40 hover:shadow-xs transition-all group"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <PremiumIcon icon={FileCheck2} tone="emerald" size="md" glow className="group-hover:scale-105 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                        <span className="text-xs sm:text-sm font-bold text-foreground group-hover:text-emerald-500 transition-colors">
                          ② 10 ta amaliy mashq
                        </span>
                        <span className="text-[10px] font-mono font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full whitespace-nowrap shrink-0">
                          +50 XP
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                        Bilimni mustahkamlash savollari
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500/10 group-hover:bg-emerald-600 group-hover:text-white transition-all whitespace-nowrap">
                    Ishlash <ArrowRight className="size-3" />
                  </span>
                </Link>

                {/* Step 3: Arena */}
                <Link
                  href="/battles"
                  className="flex items-center justify-between gap-3 p-3 sm:p-3.5 rounded-2xl border border-border/80 bg-background/50 hover:bg-background hover:border-purple-500/40 hover:shadow-xs transition-all group"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <PremiumIcon icon={Swords} tone="purple" size="md" glow className="group-hover:scale-105 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                        <span className="text-xs sm:text-sm font-bold text-foreground group-hover:text-purple-500 transition-colors">
                          ③ Boss Challenge (Arena)
                        </span>
                        <span className="text-[10px] font-mono font-bold text-purple-500 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-full whitespace-nowrap shrink-0">
                          +40 XP
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                        Raqib bilan 1v1 duelda g&apos;alaba qozonish
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 text-xs font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1 px-3 py-1.5 rounded-xl bg-purple-500/10 group-hover:bg-purple-600 group-hover:text-white transition-all whitespace-nowrap">
                    Jang <ArrowRight className="size-3" />
                  </span>
                </Link>
              </div>
            </div>

            {/* Asosiy Missiya Tugmalari */}
            <div className="pt-5 mt-4 border-t border-border/60 flex flex-col sm:flex-row items-center gap-3">
              <Button asChild size="lg" className="w-full sm:flex-1 h-11 sm:h-12 rounded-2xl font-black text-sm tracking-wide gap-2 bg-gradient-to-r from-emerald-600 via-primary to-teal-600 shadow-md hover:opacity-95 text-white">
                <Link href="/tests">
                  <Zap className="size-4" />
                  <span>Missiyani Boshlash (+120 XP)</span>
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="w-full sm:w-auto h-11 sm:h-12 rounded-2xl font-bold text-xs border-border/80 hover:bg-muted/50">
                <Link href="/learning">Konspektni o&apos;qish</Link>
              </Button>
            </div>
          </Card>

          {/* 2. 🌳 BILIM DARAJANG (Subject Mastery) */}
          <Card className="md:col-span-5 rounded-3xl border border-border/80 bg-card p-6 flex flex-col justify-between shadow-xs">
            <div>
              <div className="flex items-center justify-between pb-3.5 border-b border-border/60">
                <div className="flex items-center gap-2.5">
                  <PremiumIcon icon={Brain} tone="emerald" size="sm" glow />
                  <div>
                    <h3 className="text-base font-black text-foreground">
                      BILIM DARAJANG
                    </h3>
                    <p className="text-[11px] text-muted-foreground">
                      Fanlar bo&apos;yicha o&apos;zlashtirish foizlari
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px] font-bold border-emerald-500/30 text-emerald-600 bg-emerald-500/10">
                  Mastery
                </Badge>
              </div>

              {/* Fanlar bo'yicha progress barlar */}
              <div className="space-y-3 pt-4">
                {[
                  { name: 'Matematika', icon: Brain, tone: 'sky' as const, mastery: 72, color: 'from-blue-500 to-cyan-400' },
                  { name: 'Biologiya', icon: Dna, tone: 'emerald' as const, mastery: 51, color: 'from-emerald-500 to-teal-400' },
                  { name: 'Tarix', icon: BookOpen, tone: 'amber' as const, mastery: 83, color: 'from-amber-500 to-orange-400' },
                  { name: 'Ona tili', icon: Layers, tone: 'purple' as const, mastery: 78, color: 'from-purple-500 to-indigo-400' },
                ].map((item) => (
                  <div key={item.name} className="p-2.5 rounded-2xl bg-background/60 border border-border/60 space-y-1.5 hover:border-border transition-colors">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-foreground flex items-center gap-2">
                        <PremiumIcon icon={item.icon} tone={item.tone} size="xs" />
                        <span>{item.name}</span>
                      </span>
                      <span className="font-mono text-xs font-black text-foreground">
                        {item.mastery}%
                      </span>
                    </div>
                    <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted/60">
                      <div
                        className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-700", item.color)}
                        style={{ width: `${item.mastery}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Zaif fanni mustahkamlash mini tavsiya (Card bo'sh joyini to'ldiradi) */}
              <div className="mt-3.5 p-3 rounded-2xl bg-primary/5 border border-primary/20 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <PremiumIcon icon={Sparkles} tone="primary" size="xs" glow />
                  <p className="text-[11px] text-muted-foreground truncate">
                    Zaif fan: <strong className="text-foreground font-semibold">Biologiya (51%)</strong>
                  </p>
                </div>
                <Button asChild variant="ghost" size="sm" className="h-7 text-[11px] font-bold text-primary hover:text-primary px-2">
                  <Link href="/tests">Mashq qilish ➔</Link>
                </Button>
              </div>
            </div>

            <div className="pt-3 mt-3 border-t border-border/50 flex items-center justify-between text-xs">
              <span className="text-[11px] text-muted-foreground">Har bir to&apos;g&apos;ri mashq foizni oshiradi</span>
              <Button asChild variant="ghost" size="sm" className="text-xs font-bold text-primary hover:text-primary gap-1 h-7 px-2">
                <Link href="/analytics">
                  Batafsil <ChevronRight className="size-3.5" />
                </Link>
              </Button>
            </div>
          </Card>
        </div>

        {/* ============================================================ */}
        {/* 🌳 ENG KATTA O'ZGARISH: "SKILL TREE" (Picture 3 Wireframe)    */}
        {/* ============================================================ */}
        <section className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <PremiumIcon icon={Brain} tone="emerald" size="md" glow />
              <div>
                <h2 className="text-lg sm:text-xl font-black text-foreground flex items-center gap-2">
                  <span>🌳 Skill Tree (Bilim Daraxti)</span>
                </h2>
                <p className="text-xs text-muted-foreground">
                  Khan Academy & RPG modeli: Har bir shox va ko&apos;nikmani bosqichma-bosqich o&apos;zlashtiring
                </p>
              </div>
            </div>

            <Badge variant="outline" className="self-start sm:self-auto text-xs font-bold text-primary border-primary/30 bg-primary/10">
              Mastery → XP → Level
            </Badge>
          </div>

          {/* Interaktiv Skill Tree grafi */}
          <SkillTreeGraph activeSubjectName={activeSubject} />
        </section>

        {/* ============================================================ */}
        {/* ⚔️ ARENA, 📱 REELS & 🎴 QUICK LEARN (Picture 4 & 5)           */}
        {/* ============================================================ */}
        <div className="grid gap-5 md:grid-cols-3">
          {/* 1. ⚔️ BUGUNGI ARENA (Picture 4 Wireframe) */}
          <Card className="rounded-3xl border-2 border-purple-500/30 bg-gradient-to-b from-purple-500/10 via-card to-card p-5 sm:p-6 flex flex-col justify-between shadow-sm relative overflow-hidden">
            <div className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-purple-500/10 blur-2xl" />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="border-purple-500/30 bg-purple-500/15 text-purple-600 dark:text-purple-400 text-xs font-black px-2.5 py-0.5 rounded-xl gap-1.5">
                  <PremiumIcon icon={Swords} tone="purple" size="xs" glow />
                  <span>ARENA</span>
                </Badge>
                <span className="text-[11px] font-mono font-bold text-purple-500">Live 1v1</span>
              </div>

              <div className="text-center space-y-1">
                <p className="text-[11px] font-mono uppercase tracking-wider font-extrabold text-muted-foreground">
                  ⚔️ BUGUNGI JANG
                </p>
                <h4 className="text-base font-black text-foreground">
                  Intellektual Duel
                </h4>
              </div>

              {/* Matchup: Murodulla VS Azizbek (Picture 4) */}
              <div className="p-4 rounded-2xl bg-background/80 border border-border/80 flex items-center justify-between gap-3 shadow-inner">
                {/* O'yinchi */}
                <div className="flex flex-col items-center text-center space-y-1 min-w-0">
                  <Avatar className="size-12 border-2 border-primary/50 shadow-xs">
                    <AvatarImage src={p.avatar_url || undefined} alt={firstName} />
                    <AvatarFallback className="text-xs font-black bg-primary/20 text-primary">
                      {firstName.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <p className="text-xs font-black text-foreground truncate max-w-[5rem]">
                    {firstName}
                  </p>
                  <span className="text-[10px] font-mono text-muted-foreground">{p.elo_rating} ELO</span>
                </div>

                {/* Markaziy VS & 5 Savol & Score Dots */}
                <div className="flex flex-col items-center space-y-1.5 shrink-0">
                  <span className="px-2 py-0.5 rounded-lg bg-rose-500 text-white font-black text-[10px] uppercase tracking-wider shadow-xs">
                    VS
                  </span>
                  <span className="text-[11px] font-black text-foreground font-mono">
                    5 SAVOL
                  </span>
                  {/* 🟢 3   🔴 2 ko'rsatkichi (Picture 4) */}
                  <div className="flex items-center gap-1.5 font-mono text-xs font-extrabold">
                    <span className="text-emerald-500 flex items-center gap-0.5">🟢 3</span>
                    <span className="text-muted-foreground">:</span>
                    <span className="text-rose-500 flex items-center gap-0.5">🔴 2</span>
                  </div>
                </div>

                {/* Raqib */}
                <div className="flex flex-col items-center text-center space-y-1 min-w-0">
                  <Avatar className="size-12 border-2 border-purple-500/50 shadow-xs">
                    <AvatarFallback className="text-xs font-black bg-purple-500/20 text-purple-600 dark:text-purple-400">
                      AZ
                    </AvatarFallback>
                  </Avatar>
                  <p className="text-xs font-black text-foreground truncate max-w-[5rem]">
                    Azizbek
                  </p>
                  <span className="text-[10px] font-mono text-muted-foreground">1180 ELO</span>
                </div>
              </div>

              <p className="text-xs text-center text-muted-foreground italic">
                «Test ishlash emas, jang qilish hissiyoti»
              </p>
            </div>

            <div className="pt-4 mt-3 border-t border-border/50">
              <Button asChild size="lg" className="w-full rounded-2xl font-black text-xs gap-2 bg-gradient-to-r from-purple-600 to-rose-600 text-white shadow-md hover:opacity-95">
                <Link href="/battles">
                  <Swords className="size-4" />
                  <span>[ ⚔️ JANGGA KIRISH ]</span>
                </Link>
              </Button>
            </div>
          </Card>

          {/* 2. 📱 BILIM REELS (Picture 5 Smartphone Wireframe) */}
          <Card className="rounded-3xl border-2 border-rose-500/30 bg-gradient-to-b from-rose-500/10 via-card to-card p-5 sm:p-6 flex flex-col justify-between shadow-sm relative overflow-hidden">
            <div className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-rose-500/10 blur-2xl" />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="border-rose-500/30 bg-rose-500/15 text-rose-600 dark:text-rose-400 text-xs font-black px-2.5 py-0.5 rounded-xl gap-1.5">
                  <PremiumIcon icon={Sparkles} tone="rose" size="xs" glow />
                  <span>BILIM REELS</span>
                </Badge>
                <span className="text-[11px] font-bold text-rose-500">+20 XP</span>
              </div>

              {/* Smartphone Frame Mockup (Picture 5) */}
              <Link href="/reels" className="group block">
                <div className="relative mx-auto max-w-[15rem] rounded-3xl border-2 border-foreground/20 bg-gradient-to-b from-zinc-900 via-zinc-950 to-black p-4 text-white shadow-lg transition-transform group-hover:scale-[1.02]">
                  {/* Phone notch */}
                  <div className="mx-auto mb-3 h-1 w-12 rounded-full bg-zinc-700" />

                  <div className="space-y-3 text-center py-2">
                    <span className="text-3xl animate-bounce">🧬</span>

                    <h5 className="font-black text-xs sm:text-sm tracking-wide text-rose-300 uppercase leading-snug">
                      DNK NIMA UCHUN IKKI QAVATLI?
                    </h5>

                    <p className="text-[10px] text-zinc-400">
                      ↓ pastga suring va bilib oling
                    </p>

                    {/* Likes & Bookmarks (Picture 5: ❤️ 1.2K   🔖 342) */}
                    <div className="flex items-center justify-center gap-4 pt-2 border-t border-zinc-800 text-[11px] font-mono text-zinc-300">
                      <span className="flex items-center gap-1 text-rose-400 font-bold">
                        <Heart className="size-3.5 fill-rose-500 text-rose-500" /> 1.2K
                      </span>
                      <span className="flex items-center gap-1 text-amber-400 font-bold">
                        <Bookmark className="size-3.5 fill-amber-500 text-amber-500" /> 342
                      </span>
                    </div>
                  </div>
                </div>
              </Link>

              <p className="text-xs text-center text-muted-foreground italic">
                «Instagramga kirmay turib, Reels formatida bilim ol»
              </p>
            </div>

            <div className="pt-4 mt-3 border-t border-border/50">
              <Button asChild size="lg" className="w-full rounded-2xl font-black text-xs gap-2 bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-md hover:opacity-95">
                <Link href="/reels">
                  <Play className="size-4 fill-white" />
                  <span>[ 🎬 REELS BOSHLASH ]</span>
                </Link>
              </Button>
            </div>
          </Card>

          {/* 3. 🎴 QUICK LEARN (Picture 2 Wireframe: 3 daqiqalik Flashcard) */}
          <Card className="rounded-3xl border-2 border-amber-500/30 bg-gradient-to-b from-amber-500/10 via-card to-card p-5 sm:p-6 flex flex-col justify-between shadow-sm relative overflow-hidden">
            <div className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-amber-500/10 blur-2xl" />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="border-amber-500/30 bg-amber-500/15 text-amber-600 dark:text-amber-400 text-xs font-black px-2.5 py-0.5 rounded-xl gap-1.5">
                  <PremiumIcon icon={Layers} tone="amber" size="xs" glow />
                  <span>QUICK LEARN</span>
                </Badge>
                <span className="text-[11px] font-bold text-amber-500">+25 XP</span>
              </div>

              <div className="text-center space-y-1">
                <p className="text-[11px] font-mono uppercase tracking-wider font-extrabold text-muted-foreground">
                  🎴 TEZKOR XOTIRA
                </p>
                <h4 className="text-base font-black text-foreground">
                  3 daqiqalik Flashcard
                </h4>
              </div>

              {/* Flashcard 3D karta interfeysi */}
              <Link href="/flashcards" className="group block">
                <div className="p-4 rounded-2xl bg-background/80 border-2 border-dashed border-amber-500/40 text-center space-y-2 group-hover:border-amber-500 transition-colors">
                  <span className="text-2xl">⚡</span>
                  <p className="text-xs font-bold text-foreground">
                    Anki oraliq takrorlash algoritmi
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Qiyin sanalar, formulalar va terminlarni 3 daqiqada xotirangizda mustahkamlang.
                  </p>
                </div>
              </Link>

              <p className="text-xs text-center text-muted-foreground italic">
                «Kuniga 3 daqiqa — 10 barobar kuchli xotira»
              </p>
            </div>

            <div className="pt-4 mt-3 border-t border-border/50">
              <Button asChild size="lg" className="w-full rounded-2xl font-black text-xs gap-2 bg-gradient-to-r from-amber-500 to-yellow-500 text-black shadow-md hover:opacity-95 font-bold">
                <Link href="/flashcards">
                  <Zap className="size-4" />
                  <span>[ ⚡ O&apos;RGANISHNI BOSHLASH ]</span>
                </Link>
              </Button>
            </div>
          </Card>
        </div>

        {/* ============================================================ */}
        {/* KUNLIK QO'SHIMCHA VAZIFALAR (DAILY QUESTS CHECKLIST)          */}
        {/* ============================================================ */}
        <Card className={cn(
          "rounded-3xl border transition-all shadow-sm overflow-hidden",
          allMissionsDone ? "border-emerald-500/40 bg-emerald-500/5" : "border-border/80 bg-card"
        )}>
          <CardHeader className="pb-3 border-b border-border/40">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <PremiumIcon icon={Target} tone="rose" size="md" glow />
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base font-black tracking-tight text-foreground flex items-center gap-2">
                      Kunlik Missiyalar Ro&apos;yxati
                    </CardTitle>
                    <Badge variant="outline" className={cn(
                      "text-xs font-bold px-2 py-0.2",
                      allMissionsDone
                        ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30"
                        : "bg-primary/10 text-primary border-primary/25"
                    )}>
                      {doneMissions} / {data.missions.length} bajarildi
                    </Badge>
                  </div>
                  <CardDescription className="text-xs mt-0.5">
                    Har bir topshiriq uchun qo&apos;shimcha XP va tangalar yig&apos;ing:
                  </CardDescription>
                </div>
              </div>

              {allMissionsDone ? (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                  <CheckCircle2 className="size-4" />
                  <span>Kunlik barcha missiyalar yakunlandi! (+50 XP Bonus)</span>
                </div>
              ) : (
                <div className="w-full sm:w-48 space-y-1">
                  <div className="flex justify-between text-[11px] font-semibold text-muted-foreground">
                    <span>Kunlik progress</span>
                    <span>{missionPct}%</span>
                  </div>
                  <Progress value={missionPct} className="h-2 rounded-full" />
                </div>
              )}
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-5">
            <div className="grid gap-3 sm:grid-cols-3">
              {data.missions.map((m) => {
                const isReel = m.action_type === 'lesson' || m.title.toLowerCase().includes('reel');
                const isBattle = m.action_type === 'battle' || m.title.toLowerCase().includes('arena');
                const href = isReel ? '/reels' : isBattle ? '/battles' : '/tests';
                const ctaText = isReel ? 'Reels ko\'rish' : isBattle ? 'Jangga kirish' : 'Mashqni boshlash';
                const ActionIconComp = isReel ? Sparkles : isBattle ? Swords : FileCheck2;
                const missionTone = isReel ? 'rose' : isBattle ? 'purple' : 'emerald';

                return (
                  <div
                    key={m.title}
                    className={cn(
                      "p-4 rounded-2xl border flex flex-col justify-between space-y-3 transition-all",
                      m.is_completed
                        ? "bg-emerald-500/5 border-emerald-500/30"
                        : "bg-background border-border/80 hover:border-primary/40 hover:shadow-xs"
                    )}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] font-bold px-2 py-0.5 rounded-lg gap-1.5",
                            isReel ? "bg-rose-500/10 text-rose-600 border-rose-500/25" :
                            isBattle ? "bg-purple-500/10 text-purple-600 border-purple-500/25" :
                            "bg-emerald-500/10 text-emerald-600 border-emerald-500/25"
                          )}
                        >
                          <PremiumIcon icon={ActionIconComp} tone={missionTone} size="xs" />
                          <span>{isReel ? "Bilim Reels" : isBattle ? "Arena Jangi" : "Amaliy Mashq"}</span>
                        </Badge>
                        <span className="flex items-center gap-1 font-mono text-xs font-bold text-primary">
                          <Zap className="size-3" />+{m.xp_reward} XP
                        </span>
                      </div>

                      <h4 className={cn("text-sm font-bold leading-snug", m.is_completed && "line-through text-muted-foreground")}>
                        {m.title}
                      </h4>
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {m.description}
                      </p>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-border/40">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground font-medium">Bajarildi:</span>
                        <span className="font-mono font-bold text-foreground">
                          {m.current_count} / {m.target_count}
                        </span>
                      </div>

                      {m.is_completed ? (
                        <div className="w-full py-1.5 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center justify-center gap-1.5">
                          <CheckCircle2 className="size-3.5" />
                          <span>Bajarildi</span>
                        </div>
                      ) : (
                        <Button asChild size="sm" variant="outline" className="w-full text-xs font-bold rounded-xl gap-1 hover:bg-primary hover:text-primary-foreground">
                          <Link href={href}>
                            <span>{ctaText}</span>
                            <ArrowRight className="size-3.5" />
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* AI Mentorning kunlik yo'llanmasi */}
        {isEnabled('ai_mentor') && (
          <Link href={nudge.href || '/tests'} className="group block">
            <Card className="tactile-btn gap-0 border-[var(--accent-border)] bg-primary/[0.05] py-4 transition-colors hover:border-[var(--accent)]/50 rounded-2xl">
              <CardContent className="flex flex-wrap items-center gap-3 px-4">
                <PremiumIcon icon={Bot} tone="primary" size="md" glow className="shrink-0 transition-transform group-hover:scale-105" />
                <p className="min-w-[16rem] flex-1 text-sm text-[var(--text-secondary)]">
                  <span className="mr-1.5 font-mono text-xs font-bold uppercase text-[var(--accent-text)]">AI Mentor</span>
                  {nudge.text}
                </p>
                <span className="flex shrink-0 items-center gap-1 rounded-xl bg-[var(--accent-soft)] px-3.5 py-2 text-xs font-bold text-[var(--accent-text)]">
                  {nudge.cta} <ArrowRight className="size-3.5" />
                </span>
              </CardContent>
            </Card>
          </Link>
        )}

        {/* ============================================================ */}
        {/* ASOSIY O'QUV BO'LIMLARI (QUICK ACCESS)                       */}
        {/* ============================================================ */}
        <section className="space-y-3">
          <h2 className="section-title">Barcha O&apos;quv Bo&apos;limlari</h2>
          <div className="grid gap-3.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
            {QUICK_ACCESS.filter((it) => !it.featureKey || isEnabled(it.featureKey)).map((item, qIdx) => {
              const Icon = item.icon;
              return (
                <Reveal key={item.href} index={qIdx}>
                  <Link href={item.href} className="group block h-full">
                    <Card className="relative h-full gap-0 overflow-hidden py-4 rounded-2xl border-border/70 transition-all hover:border-[var(--accent-border)] hover:shadow-xs">
                      <CardMotif shape={item.motif} className={item.motifTone} />
                      <CardContent className="relative px-3.5">
                        <div className="mb-2.5 flex items-center justify-between">
                          <PremiumIcon
                            icon={Icon}
                            tone={item.iconTone}
                            size="md"
                            glow
                            className="transition-transform group-hover:scale-110"
                          />
                          <Badge variant="secondary" className="text-[10px]">{item.badge}</Badge>
                        </div>
                        <p className="text-xs sm:text-sm font-bold transition-colors group-hover:text-[var(--accent-text)]">{item.title}</p>
                        <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">{item.desc}</p>
                      </CardContent>
                    </Card>
                  </Link>
                </Reveal>
              );
            })}
          </div>
        </section>

        {/* OTM Ball Bashorati Tezkor Banneri */}
        {isEnabled('otm_predictor') && (
          <section>
            <Link href="/analytics" className="group block">
              <Card className="tactile-btn relative overflow-hidden border-[var(--accent-border)] bg-gradient-to-r from-emerald-950/30 via-[var(--surface-card-medium)] to-[var(--surface-card-medium)] py-4 transition-all hover:border-[var(--accent)] rounded-2xl">
                <div className="pointer-events-none absolute -right-10 -top-10 size-36 rounded-full bg-[var(--accent)]/10 blur-2xl" />
                <CardContent className="relative flex flex-wrap items-center justify-between gap-4 px-5">
                  <div className="flex items-center gap-3.5">
                    <PremiumIcon icon={GraduationCap} tone="emerald" size="lg" glow className="shrink-0 transition-transform group-hover:scale-105" />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-[var(--text-primary)] transition-colors group-hover:text-[var(--accent-text)]">
                          OTM Qabul Bashorati & Universitetlar Matcheri
                        </p>
                        <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-[10px] text-emerald-300">
                          2025/2026
                        </Badge>
                      </div>
                      <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                        Ballingiz qaysi OTMga Grant yoki Kontraktga yetishini Analitika sahifasida real vaqtda hisoblang.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-xs font-bold text-[var(--accent-text)]">
                    <span>Hisoblash</span>
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          </section>
        )}

        {/* Interaktiv mini o'yinlar */}
        {isEnabled('games') && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="section-title">Interaktiv Tarixiy O&apos;yinlar</h2>
              <Badge variant="outline" className="border-[var(--tone-premium)]/25 bg-[var(--tone-premium-soft)] text-[var(--tone-premium-text)]">Bonus XP</Badge>
            </div>
            <div className="grid gap-3.5 sm:grid-cols-3">
              {MINI_GAMES.map((game) => {
                const Icon = game.icon;
                return (
                  <Link key={game.href} href={game.href} className="group block">
                    <Card className="tactile-btn relative gap-0 overflow-hidden py-4 rounded-2xl transition-colors hover:border-[var(--accent-border)] hover:shadow-xs">
                      <CardMotif shape={game.motif} className={game.motifTone} />
                      <CardContent className="relative flex items-center gap-3.5 px-4">
                        <PremiumIcon
                          icon={Icon}
                          tone={game.iconTone}
                          size="md"
                          glow
                          className="shrink-0 transition-transform group-hover:scale-105"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{game.title}</p>
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">{game.desc}</p>
                        </div>
                        <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" />
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </>
  );
}
