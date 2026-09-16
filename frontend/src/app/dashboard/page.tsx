'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  FileCheck2, Swords, BookOpen, Bot, ArrowRight, History, MapPin, HelpCircle,
  Crown, Sparkles, Flame, Coins, Trophy, Snowflake, CheckCircle2,
  ChevronRight, Zap, GraduationCap, Layers, Share2, Headphones, Target, Shield, Play,
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
  { href: '/tests', title: 'Amaliy Mashqlar', desc: 'Rasmiy formatdagi mock testlar', icon: FileCheck2, badge: 'BBA', motif: 'tests' as const, motifTone: 'text-[var(--tone-growth-text)]', iconTone: 'emerald' as PremiumIconTone, featureKey: 'tests' },
  { href: '/battles', title: 'Arena: Jonli Duel', desc: 'Jonli intellektual jang', icon: Swords, badge: 'Live ⚔️', motif: 'arena' as const, motifTone: 'text-[var(--tone-danger-text)]', iconTone: 'rose' as PremiumIconTone, featureKey: 'battles' },
  { href: '/learning', title: 'Darslar & Konspektlar', desc: 'Video va audio darslar', icon: BookOpen, badge: 'Audio', motif: 'lessons' as const, motifTone: 'text-[var(--tone-lesson-text)]', iconTone: 'indigo' as PremiumIconTone, featureKey: 'learning' },
];

const MINI_GAMES = [
  { href: '/games/timeline', title: 'Xronologik Ketma-ketlik', desc: "Voqealarni to'g'ri tartibda joylashtiring", icon: History, motif: 'timeline' as const, motifTone: 'text-[var(--tone-lesson-text)]', iconTone: 'indigo' as PremiumIconTone },
  { href: '/games/map', title: "Xarita & Qal'alar Tahlili", desc: 'Qadimgi davlatlar va joylashuvlarni toping', icon: MapPin, motif: 'map' as const, motifTone: 'text-[var(--tone-growth-text)]', iconTone: 'emerald' as PremiumIconTone },
  { href: '/games/character', title: 'Tarixiy Shaxsni Toping', desc: 'Maslahatlar orqali sarkarda yoki allomani toping', icon: HelpCircle, motif: 'character' as const, motifTone: 'text-[var(--tone-streak-text)]', iconTone: 'amber' as PremiumIconTone },
];

function scoreTone(score: number | null) {
  if (score === null) return 'border-[var(--border-card)] bg-[var(--surface-hover)] text-[var(--text-secondary)]';
  if (score >= 80) return 'border-[var(--success)]/30 bg-[var(--success-soft)] text-[var(--success-text)]';
  if (score >= 50) return 'border-[var(--tone-streak)]/30 bg-[var(--tone-streak-soft)] text-[var(--tone-streak-text)]';
  return 'border-[var(--danger)]/30 bg-[var(--danger-soft)] text-[var(--danger-text)]';
}

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

  return (
    <>
      <AppShell />
      <main className="page-shell flex-1 space-y-6 bg-[var(--bg-page)] p-4 pb-16 sm:p-6 sm:space-y-8">
        {/* Yuqori qator: Salomlashish & Onlayn hamrohlar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-voice text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              {greeting()}, {firstName}! 👋
            </h1>
            <p className="mt-0.5 text-xs sm:text-sm text-muted-foreground">
              {doneMissions === data.missions.length && data.missions.length > 0
                ? "Bugungi barcha missiyalar bajarildi — ajoyib yutuq! 🚀"
                : `Bugun ${data.missions.length - doneMissions} ta missiya sizni kutmoqda.`}
            </p>
          </div>
          <PresenceRow
            count={data.online_count}
            peers={data.online_peers ?? []}
            solvedToday={data.solved_today ?? 0}
          />
        </div>

        {/* ============================================================ */}
        {/* 🎮 GAME HUD — O'YINCHI STATUSI VA RPG KO'RSATKICHLARI          */}
        {/* ============================================================ */}
        <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-card via-card to-primary/5 p-4 sm:p-6 shadow-sm">
          <div className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-primary/10 blur-3xl" />
          <div className="pointer-events-none absolute -left-16 -bottom-16 size-64 rounded-full bg-rose-500/5 blur-3xl" />

          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            {/* Chap tomon: O'yinchi profili, Avatar va Unvon */}
            <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
              <div className="relative shrink-0">
                <Avatar className="size-16 sm:size-20 border-2 border-primary/40 shadow-md ring-4 ring-primary/10">
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
                  <h2 className="text-lg sm:text-2xl font-black text-foreground truncate">
                    {fullName}
                  </h2>
                  <Badge
                    variant="outline"
                    className="border-primary/30 bg-primary/10 text-primary text-[11px] sm:text-xs font-extrabold px-2.5 py-0.5 rounded-xl gap-1"
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

                {/* Unvon progresi: Navkar -> Qo'riqchi -> Sarkarda -> Olim */}
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

            {/* O'rta: Level va XP Progress Bar */}
            <div className="flex-1 max-w-md space-y-2 rounded-2xl bg-background/50 border border-border/60 p-3.5 backdrop-blur-xs">
              <div className="flex items-center justify-between text-xs">
                <span className="font-black text-foreground flex items-center gap-1.5">
                  <Trophy className="size-4 text-emerald-500" />
                  <span>DARAJA {p.level}</span>
                </span>
                <span className="font-mono font-bold text-muted-foreground">
                  <span className="text-primary font-black">{p.xp.toLocaleString('uz-UZ')}</span> / {p.next_level_xp.toLocaleString('uz-UZ')} XP
                </span>
              </div>

              <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted/60 p-0.5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 transition-all duration-700 shadow-sm"
                  style={{ width: `${Math.min(100, Math.max(0, data.xp_progress))}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>{data.xp_progress}% to&apos;ldirildi</span>
                <span>Keyingi darajaga <strong className="text-foreground">{xpLeft.toLocaleString('uz-UZ')} XP</strong></span>
              </div>
            </div>

            {/* O'ng tomon: Resurslar (HUD Counters) */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {/* Streak */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link href="/profile" className="flex items-center gap-2 px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 hover:border-amber-500/50 transition-all">
                    <Flame className="size-5 sm:size-6 text-amber-500 animate-pulse" />
                    <div>
                      <p className="text-[10px] uppercase font-bold text-amber-600/80 dark:text-amber-400/80">Streak</p>
                      <p className="font-mono text-sm sm:text-base font-black text-amber-600 dark:text-amber-400 leading-tight">
                        {p.streak} <span className="text-[10px] font-bold">kun</span>
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

              {/* Tangalar */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link href="/shop" className="flex items-center gap-2 px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-2xl bg-yellow-500/10 border border-yellow-500/25 hover:border-yellow-500/50 transition-all">
                    <Coins className="size-5 sm:size-6 text-yellow-500" />
                    <div>
                      <p className="text-[10px] uppercase font-bold text-yellow-600/80 dark:text-yellow-400/80">Tangalar</p>
                      <p className="font-mono text-sm sm:text-base font-black text-yellow-600 dark:text-yellow-400 leading-tight">
                        {p.coins.toLocaleString('uz-UZ')}
                      </p>
                    </div>
                  </Link>
                </TooltipTrigger>
                <TooltipContent className="max-w-56 text-xs">
                  Mashqlar, arena va mini-o&apos;yinlarda topiladi. Do&apos;konda sarflanadi.
                </TooltipContent>
              </Tooltip>

              {/* Arena ELO */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link href="/battles" className="flex items-center gap-2 px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/25 hover:border-rose-500/50 transition-all">
                    <Swords className="size-5 sm:size-6 text-rose-500" />
                    <div>
                      <p className="text-[10px] uppercase font-bold text-rose-600/80 dark:text-rose-400/80">Arena</p>
                      <p className="font-mono text-sm sm:text-base font-black text-rose-600 dark:text-rose-400 leading-tight">
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
        </div>

        {/* Nishonlash lahzasi */}
        <Celebration level={p.level} streak={p.streak} completedAttempts={data.recent_attempts.length} />

        {/* ============================================================ */}
        {/* 🎯 BUGUNGI MISSIYALAR (DAILY QUESTS — NEXT ACTIONS)          */}
        {/* ============================================================ */}
        <Card className={cn(
          "rounded-3xl border transition-all shadow-sm overflow-hidden",
          allMissionsDone ? "border-emerald-500/40 bg-emerald-500/5" : "border-border/80 bg-card"
        )}>
          <CardHeader className="pb-3 border-b border-border/40">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                  <Target className="size-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base font-black tracking-tight text-foreground flex items-center gap-2">
                      Bugungi Missiyalar
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
                    Har bir topshiriqni yakunlang va qo&apos;shimcha XP hamda tangalar yig&apos;ing:
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
                            "text-[10px] font-bold px-2 py-0.5 rounded-lg gap-1",
                            isReel ? "bg-rose-500/10 text-rose-600 border-rose-500/25" :
                            isBattle ? "bg-purple-500/10 text-purple-600 border-purple-500/25" :
                            "bg-emerald-500/10 text-emerald-600 border-emerald-500/25"
                          )}
                        >
                          <ActionIconComp className="size-3" />
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
        {/* INTERAKTIV REELS, ARENA & QUICK LEARN VITRINASI               */}
        {/* ============================================================ */}
        <div className="grid gap-4 sm:grid-cols-3">
          {/* 1. Bilim Reels vitrinasi */}
          {isEnabled('reels') && (
            <Link href="/reels" className="group block h-full">
              <Card className="h-full rounded-3xl border border-rose-500/25 bg-gradient-to-br from-rose-500/10 via-card to-card hover:border-rose-500/50 p-5 flex flex-col justify-between shadow-xs transition-all">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 text-[11px] font-bold gap-1">
                      <Sparkles className="size-3" /> Instagram Formati
                    </Badge>
                    <span className="text-[11px] font-bold text-rose-500">+20 XP</span>
                  </div>
                  <h3 className="text-base font-bold text-foreground group-hover:text-rose-500 transition-colors leading-snug">
                    🎬 Bilim Reels: Tezkor Mikrokvestlar
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    «Instagramga kirmay turib, Reels formatida bilim ol». Qiyin testlar va qiziqarli faktlar vertikal videolarda.
                  </p>
                </div>
                <div className="pt-3 mt-3 border-t border-border/40 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-medium">Scroll-learning</span>
                  <span className="text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    Reelsni ko&apos;rish <ArrowRight className="size-3.5" />
                  </span>
                </div>
              </Card>
            </Link>
          )}

          {/* 2. 1v1 Arena vitrinasi */}
          {isEnabled('battles') && (
            <Link href="/battles" className="group block h-full">
              <Card className="h-full rounded-3xl border border-purple-500/25 bg-gradient-to-br from-purple-500/10 via-card to-card hover:border-purple-500/50 p-5 flex flex-col justify-between shadow-xs transition-all">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30 text-[11px] font-bold gap-1">
                      <Swords className="size-3" /> Jonli Duel
                    </Badge>
                    <span className="text-[11px] font-bold text-purple-500">Live 1v1</span>
                  </div>
                  <h3 className="text-base font-bold text-foreground group-hover:text-purple-500 transition-colors leading-snug">
                    ⚔️ Arena: {firstName} vs Raqib
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Test ishlash emas, raqib bilan intellektual jang! 5 ta tezkor savol orqali unvoningizni oshiring.
                  </p>
                </div>
                <div className="pt-3 mt-3 border-t border-border/40 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-medium">Jonli raqobat</span>
                  <span className="text-purple-600 dark:text-purple-400 font-bold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    Jangga kirish <ArrowRight className="size-3.5" />
                  </span>
                </div>
              </Card>
            </Link>
          )}

          {/* 3. Quick Learn Flashcards */}
          {isEnabled('flashcards') && (
            <Link href="/flashcards" className="group block h-full">
              <Card className="h-full rounded-3xl border border-amber-500/25 bg-gradient-to-br from-amber-500/10 via-card to-card hover:border-amber-500/50 p-5 flex flex-col justify-between shadow-xs transition-all">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[11px] font-bold gap-1">
                      <Layers className="size-3" /> Tezkor Xotira
                    </Badge>
                    <span className="text-[11px] font-bold text-amber-500">+25 XP</span>
                  </div>
                  <h3 className="text-base font-bold text-foreground group-hover:text-amber-500 transition-colors leading-snug">
                    ⚡ Quick Learn: Smart Kartalar
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Qoidalar, formulalar va sanalarni 3 daqiqalik 3D kartalar orqali xotirangizda mustahkamlang.
                  </p>
                </div>
                <div className="pt-3 mt-3 border-t border-border/40 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-medium">Anki uslubi</span>
                  <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    O&apos;rganish <ArrowRight className="size-3.5" />
                  </span>
                </div>
              </Card>
            </Link>
          )}
        </div>

        {/* ============================================================ */}
        {/* HERO TAVSIYA VA 🌳 BILIM DARAJANG (SKILL MASTERY)             */}
        {/* ============================================================ */}
        <div className="grid gap-5 md:grid-cols-12">
          {/* 1. Hero Tavsiya: Bugungi Amaliyot */}
          <Card className="relative min-w-0 overflow-hidden md:col-span-7 rounded-3xl border-border/80">
            <div className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full bg-primary/10 blur-3xl" />
            <CardHeader className="relative px-6 pt-6 sm:px-8 sm:pt-8">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="border-[var(--accent-border)] bg-primary/12 text-[var(--accent-text)]">
                  <Sparkles className="size-3" /> Bugungi Tavsiya
                </Badge>
                {data.selected_subject && <Badge variant="secondary">{data.selected_subject.name}</Badge>}
              </div>
              <CardTitle className="font-voice text-xl leading-snug sm:text-2xl md:text-3xl">
                {data.suggested_topic ? data.suggested_topic.title : 'Bugun qanday bilimni egallaymiz?'}
              </CardTitle>
              <CardDescription className="max-w-xl leading-relaxed text-sm">
                {data.suggested_topic?.description
                  || "Bilim ildizingiz o'sishda davom etsin — 15 daqiqalik amaliy mashq bajaring va yangi darajaga ko'tariling."}
              </CardDescription>
            </CardHeader>
            <CardContent className="relative flex flex-1 flex-col justify-between gap-6 px-6 pb-6 sm:px-8 sm:pb-8">
              <div className="flex flex-wrap items-center gap-2.5">
                <Button asChild size="lg" className="rounded-xl font-bold gap-2">
                  <Link href="/tests">
                    <Zap className="size-4" />
                    <span>Missiyani Boshlash</span>
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                {data.suggested_topic && (
                  <Button asChild variant="outline" size="lg" className="rounded-xl font-semibold">
                    <Link href="/learning">Avval darsni o&apos;qish</Link>
                  </Button>
                )}
                <Button asChild variant="ghost" size="lg" className="rounded-xl font-semibold text-muted-foreground hover:text-foreground">
                  <Link href="/reels">Reels ko&apos;rish</Link>
                </Button>
              </div>

              {/* Hero pastki qatori */}
              <div className="grid gap-3 border-t pt-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground font-medium">Kunlik missiyalar</p>
                  <p className="font-mono text-sm font-bold tabular-nums">{doneMissions} / {data.missions.length}</p>
                  <Progress value={missionPct} className="h-1.5" />
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground font-medium">Oxirgi yutuq</p>
                  {lastAttempt ? (
                    <>
                      <p className="font-mono text-sm font-bold tabular-nums">
                        {lastAttempt.score !== null ? `${lastAttempt.score.toFixed(0)}% natija` : '—'}
                      </p>
                      <p className="truncate text-xs text-[var(--text-secondary)]">{lastAttempt.test_title}</p>
                    </>
                  ) : (
                    <>
                      <p className="font-mono text-sm font-bold">—</p>
                      <p className="text-xs text-[var(--text-secondary)]">Hali mashq bajarilmagan</p>
                    </>
                  )}
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground font-medium">Uzluksizlik</p>
                  <p className="flex items-center gap-1.5 font-mono text-sm font-bold tabular-nums">
                    <Flame className="size-3.5 text-[var(--tone-streak-text)]" /> {p.streak} kun
                  </p>
                  <p className="truncate text-xs text-[var(--text-secondary)]">
                    {data.freeze_count > 0 ? `${data.freeze_count} ta muzlatish zaxirada` : 'Bugun ham davom ettiring'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 2. 🌳 BILIM DARAJANG (SKILL MASTERY) — Picture 2 & 3 */}
          <Card className="min-w-0 md:col-span-5 rounded-3xl border-border/80 flex flex-col justify-between shadow-xs">
            <CardHeader className="pb-3 border-b border-border/40 flex-row items-center justify-between space-y-0">
              <div className="flex items-center gap-2">
                <span className="text-xl">🌳</span>
                <div>
                  <CardTitle className="text-base font-black text-foreground">
                    Bilim Darajang (Mastery)
                  </CardTitle>
                  <CardDescription className="text-[11px] mt-0.5">
                    Fanlar bo&apos;yicha o&apos;zlashtirish va ko&apos;nikmalar darajasi
                  </CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="text-[10px] font-bold border-emerald-500/30 text-emerald-600 bg-emerald-500/10">
                Skill Tree
              </Badge>
            </CardHeader>
            <CardContent className="pt-4 flex-1 flex flex-col justify-between space-y-4">
              <div className="space-y-3.5">
                {(data.subject_mastery && data.subject_mastery.length > 0 ? data.subject_mastery : [
                  { id: 1, name: 'Tarix', mastery: 83 },
                  { id: 2, name: 'Ona tili', mastery: 72 },
                  { id: 3, name: 'Biologiya', mastery: 51 },
                ]).slice(0, 4).map((sub) => (
                  <div key={sub.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-foreground">{sub.name}</span>
                      <span className="font-mono text-emerald-600 dark:text-emerald-400 font-extrabold">{sub.mastery}%</span>
                    </div>
                    <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-muted/60 p-0.5">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 transition-all duration-700"
                        style={{ width: `${Math.min(100, Math.max(5, sub.mastery))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-border/40 flex items-center justify-between text-xs">
                <span className="text-[11px] text-muted-foreground">Har bir to&apos;g&apos;ri javob Mastery foizini oshiradi</span>
                <Button asChild variant="ghost" size="sm" className="text-xs font-bold text-primary hover:text-primary gap-1">
                  <Link href="/analytics">
                    Skill Tree <ChevronRight className="size-3.5" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

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
