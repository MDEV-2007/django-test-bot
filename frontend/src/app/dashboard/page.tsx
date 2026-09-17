'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  FileCheck2, Swords, BookOpen,
  Crown, Sparkles, Flame, Coins, Trophy,
  CheckCircle2, ChevronRight, Zap, Layers, Headphones, Target,
  Dna, Brain, ArrowRight,
} from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { useApiQuery } from '@/lib/api-cache';
import { getRankInfo } from '@/lib/rank';
import PresenceRow from '@/components/student/PresenceRow';
import Celebration from '@/components/student/Celebration';
import { mentorNudge } from '@/lib/mentorVoice';
import AppShell from '@/components/AppShell';
import CardMotif from '@/components/student/CardMotif';
import { cn } from '@/lib/utils';
import { useFeatureFlags } from '@/lib/features';
import PremiumIcon, { PremiumIconTone } from '@/components/ui/premium-icon';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
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
  { href: '/tests', title: 'Amaliy Mashqlar', desc: 'DTM va mavzuli testlar', icon: FileCheck2, badge: 'Asosiy', motif: 'tests' as const, motifTone: 'text-[var(--tone-growth-text)]', iconTone: 'emerald' as PremiumIconTone, featureKey: 'tests' },
  { href: '/battles', title: 'Arena: 1v1 Jang', desc: 'Jonli intellektual bellashuv', icon: Swords, badge: 'Live ⚔️', motif: 'arena' as const, motifTone: 'text-[var(--tone-danger-text)]', iconTone: 'rose' as PremiumIconTone, featureKey: 'battles' },
  { href: '/learning', title: 'Darslar & Konspekt', desc: 'Video, audio va qisqa darslar', icon: BookOpen, badge: 'Nazariya', motif: 'lessons' as const, motifTone: 'text-[var(--tone-lesson-text)]', iconTone: 'indigo' as PremiumIconTone, featureKey: 'learning' },
  { href: '/flashcards', title: 'Quick Learn', desc: 'Sanalar va qoidalarni yodlash', icon: Layers, badge: 'Anki ⚡', motif: 'lessons' as const, motifTone: 'text-[var(--tone-growth-text)]', iconTone: 'amber' as PremiumIconTone, featureKey: 'flashcards' },
  { href: '/study', title: 'Fokus Xonasi', desc: 'Pomodoro darsi va ambient ovozlar', icon: Headphones, badge: 'Fokus', motif: 'lessons' as const, motifTone: 'text-[var(--tone-growth-text)]', iconTone: 'emerald' as PremiumIconTone },
  { href: '/reels', title: 'Bilim Reels', desc: 'Qisqa ta\'limiy videolar', icon: Sparkles, badge: 'Reels 🎬', motif: 'lessons' as const, motifTone: 'text-[var(--tone-danger-text)]', iconTone: 'rose' as PremiumIconTone, featureKey: 'reels' },
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
    <main className="page-shell flex-1 space-y-6 bg-[var(--bg-page)] p-4 pb-12 sm:p-6">
      <Skeleton className="h-28 w-full rounded-3xl" />
      <Skeleton className="h-44 w-full rounded-3xl" />
      <div className="grid gap-5 md:grid-cols-12">
        <Skeleton className="h-64 md:col-span-7 rounded-3xl" />
        <Skeleton className="h-64 md:col-span-5 rounded-3xl" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
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
  const allMissionsDone = data.missions.length > 0 && doneMissions === data.missions.length;
  const xpLeft = Math.max(0, p.next_level_xp - p.xp);

  const activeSubject = data.selected_subject?.name || 'Umumiy Ta\'lim';
  const suggestedMissionTitle = data.suggested_topic?.title || 'Bugungi Mashqlar To\'plami';

  const nudge = mentorNudge({
    firstName,
    streak: p.streak,
    freezeCount: data.freeze_count,
    missionsTotal: data.missions.length,
    missionsDone: doneMissions,
    weakTopic: data.weak_review,
    lastScore: data.recent_attempts[0]?.score ?? null,
    totalAttempts: data.recent_attempts.length,
    solvedToday: data.solved_today ?? 0,
  });

  return (
    <>
      <AppShell />
      <main className="page-shell flex-1 space-y-6 bg-[var(--bg-page)] p-4 pb-16 sm:p-6 sm:space-y-7">
        
        {/* ============================================================ */}
        {/* 1. YUQORI QATOR: SALOMLASHISH & ONLAYN FOYDALANUVCHILAR      */}
        {/* ============================================================ */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-voice text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              {greeting()}, {firstName}! 👋
            </h1>
            <p className="mt-0.5 text-xs sm:text-sm text-muted-foreground">
              Bugungi ta&apos;lim maqsadlaringiz tomon olg&apos;a!
            </p>
          </div>
          <PresenceRow
            count={data.online_count}
            peers={data.online_peers ?? []}
            solvedToday={data.solved_today ?? 0}
          />
        </div>

        {/* ============================================================ */}
        {/* 2. GAME HUD — FOYDALANUVCHI STATUSI VA PROGRESS             */}
        {/* ============================================================ */}
        <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-card p-4 sm:p-6 shadow-xs">
          <div className="pointer-events-none absolute -right-20 -top-20 size-60 rounded-full bg-primary/10 blur-3xl" />
          <div className="pointer-events-none absolute -left-20 -bottom-20 size-60 rounded-full bg-emerald-500/5 blur-3xl" />

          <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            {/* Profil va Unvon */}
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="relative shrink-0">
                <Avatar className="size-14 sm:size-16 border-2 border-primary/40 shadow-xs ring-2 ring-primary/10">
                  <AvatarImage src={p.avatar_url || undefined} alt={fullName} />
                  <AvatarFallback className="text-sm sm:text-base font-black bg-primary/20 text-primary">
                    {firstName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 flex size-5 sm:size-6 items-center justify-center rounded-full bg-background border border-border shadow-xs text-xs">
                  {rankInfo.icon}
                </div>
              </div>

              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base sm:text-lg font-black text-foreground truncate uppercase tracking-tight">
                    {fullName}
                  </h2>
                  <Badge
                    variant="outline"
                    className="border-primary/30 bg-primary/10 text-primary text-[10px] sm:text-[11px] font-extrabold px-2 py-0.5 rounded-lg gap-1"
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
                  <span>Keyingi daraja:</span>
                  <span className="font-semibold text-primary">{rankInfo.nextTitle || rankInfo.title}</span>
                  {rankInfo.nextTitle && (
                    <span className="text-[11px]">({rankInfo.pointsNeeded} ELO qoldi)</span>
                  )}
                </div>
              </div>
            </div>

            {/* Status ko'rsatkichlari: Streak, Tangalar, Arena */}
            <div className="flex items-center gap-1 self-start md:self-auto rounded-2xl bg-muted/40 border border-border/80 p-1.5 shadow-2xs">
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
                    ? `${data.freeze_count} ta muzlatgich mavjud — streak saqlanadi.`
                    : "Har kuni kamida 1 ta mashq yechib streakni oshiring."}
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
                  Do&apos;konda yangi skin va unvonlar sotib olish uchun ishlatiladi.
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

          {/* Level Progress Bari */}
          <div className="mt-4 pt-3.5 border-t border-border/60 space-y-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 font-bold text-foreground">
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 text-[11px]">
                  <Trophy className="size-3" />
                  <span>Level {p.level}</span>
                </span>
                <ChevronRight className="size-3 text-muted-foreground" />
                <span className="text-muted-foreground text-[11px]">Level {p.level + 1}</span>
              </div>

              <div className="flex items-center gap-2.5 text-xs font-mono">
                <span className="text-muted-foreground text-[11px]">
                  <strong className="text-foreground">{p.xp.toLocaleString('uz-UZ')}</strong> / {p.next_level_xp.toLocaleString('uz-UZ')} XP
                </span>
                <span className="px-1.5 py-0.5 rounded-md bg-primary/10 text-primary font-bold text-[10px]">
                  {data.xp_progress}%
                </span>
              </div>
            </div>

            <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted/60">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-primary transition-all duration-700"
                style={{ width: `${Math.min(100, Math.max(0, data.xp_progress))}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Keyingi bosqichgacha: <strong className="text-foreground font-semibold">{xpLeft.toLocaleString('uz-UZ')} XP</strong></span>
              <span className="hidden sm:inline italic">To&apos;g&apos;ri javoblar uchun +15~30 XP beriladi</span>
            </div>
          </div>
        </div>

        {/* Bayram / Yutuq lahzasi */}
        <Celebration level={p.level} streak={p.streak} completedAttempts={data.recent_attempts.length} />

        {/* ============================================================ */}
        {/* 3. HERO ACTION CARD — BUGUNGI ASOSIY MAQSAD (FOCUS)          */}
        {/* ============================================================ */}
        <Card className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-card via-card to-primary/10 p-5 sm:p-6 shadow-xs">
          <div className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-primary/15 blur-2xl" />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="space-y-2.5 max-w-xl">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary text-xs font-bold px-2.5 py-0.5 rounded-xl gap-1">
                  <Dna className="size-3" />
                  <span>{activeSubject}</span>
                </Badge>
                <span className="text-xs font-mono font-bold text-amber-500 flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-xl">
                  <Zap className="size-3" /> +120 XP Kvest
                </span>
                <span className="text-[11px] text-muted-foreground font-semibold">TAVSIYA ETILGAN</span>
              </div>

              <div>
                <h3 className="text-lg sm:text-xl font-black text-foreground tracking-tight">
                  {suggestedMissionTitle}
                </h3>
                <p className="mt-1 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Bugungi o&apos;quv rejangiz bo&apos;yicha amaliy mashqlarni yakunlang va mavzuni to&apos;liq o&apos;zlashtiring.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2.5 shrink-0">
              <Button asChild size="lg" className="w-full sm:w-auto h-11 sm:h-12 px-6 rounded-2xl font-black text-sm gap-2 bg-gradient-to-r from-emerald-600 via-primary to-teal-600 text-white shadow-md hover:opacity-95">
                <Link href="/tests">
                  <Zap className="size-4" />
                  <span>Mashqni Boshlash</span>
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="w-full sm:w-auto h-11 sm:h-12 px-5 rounded-2xl font-bold text-xs border-border/80 hover:bg-muted/50">
                <Link href="/learning">Konspekt</Link>
              </Button>
            </div>
          </div>
        </Card>

        {/* ============================================================ */}
        {/* 4. IKKI USTUNLI QISM: KUNLIK MISSIYALAR & BILIM DARAJASI     */}
        {/* ============================================================ */}
        <div className="grid gap-5 md:grid-cols-12">
          
          {/* CHAP USTUN: Kunlik Missiyalar (Daily Quests) */}
          <Card className={cn(
            "md:col-span-7 rounded-3xl border shadow-2xs overflow-hidden flex flex-col justify-between",
            allMissionsDone ? "border-emerald-500/30 bg-emerald-500/5" : "border-border/80 bg-card"
          )}>
            <CardHeader className="pb-3 border-b border-border/40">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <PremiumIcon icon={Target} tone="rose" size="sm" glow />
                  <CardTitle className="text-base font-black text-foreground">
                    Kunlik Vazifalar
                  </CardTitle>
                </div>
                <Badge variant="outline" className={cn(
                  "text-xs font-bold px-2 py-0.5",
                  allMissionsDone
                    ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30"
                    : "bg-primary/10 text-primary border-primary/25"
                )}>
                  {doneMissions} / {data.missions.length} bajarildi
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-2.5">
              {data.missions.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">Bugun uchun topshiriqlar yo&apos;q</p>
              ) : (
                data.missions.slice(0, 3).map((m) => {
                  const isReel = m.action_type === 'lesson' || m.title.toLowerCase().includes('reel');
                  const isBattle = m.action_type === 'battle' || m.title.toLowerCase().includes('arena');
                  const href = isReel ? '/reels' : isBattle ? '/battles' : '/tests';
                  const ActionIconComp = isReel ? Sparkles : isBattle ? Swords : FileCheck2;
                  const missionTone = isReel ? 'rose' : isBattle ? 'purple' : 'emerald';

                  return (
                    <div
                      key={m.title}
                      className={cn(
                        "p-3 rounded-2xl border flex items-center justify-between gap-3 transition-colors",
                        m.is_completed
                          ? "bg-emerald-500/5 border-emerald-500/25"
                          : "bg-background/60 border-border/70 hover:border-primary/40"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <PremiumIcon icon={ActionIconComp} tone={missionTone} size="xs" />
                        <div className="min-w-0">
                          <p className={cn(
                            "text-xs font-bold text-foreground truncate",
                            m.is_completed && "line-through text-muted-foreground"
                          )}>
                            {m.title}
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {m.description}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                          +{m.xp_reward} XP
                        </span>
                        {m.is_completed ? (
                          <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-xl">
                            <CheckCircle2 className="size-3.5" />
                          </span>
                        ) : (
                          <Button asChild size="sm" variant="ghost" className="h-7 px-2.5 text-xs font-bold text-primary hover:bg-primary/10 rounded-xl">
                            <Link href={href}>
                              <span>Boshlash</span>
                              <ArrowRight className="size-3 ml-1" />
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>

            {/* Kunlik Progress Bar */}
            <div className="p-3 bg-muted/20 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
              <span>Kunlik natija: {missionPct}%</span>
              <span className="font-semibold text-foreground">
                {allMissionsDone ? '🎉 Barcha vazifalar bajarildi!' : 'Barcha topshiriqlarni tugating'}
              </span>
            </div>
          </Card>

          {/* O'NG USTUN: Bilim Darajasi & Zaif Mavzu */}
          <Card className="md:col-span-5 rounded-3xl border border-border/80 bg-card p-5 flex flex-col justify-between shadow-xs">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2.5 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <PremiumIcon icon={Brain} tone="emerald" size="sm" glow />
                  <CardTitle className="text-base font-black text-foreground">
                    Bilim Darajang
                  </CardTitle>
                </div>
                <Button asChild variant="ghost" size="sm" className="h-7 text-xs font-bold text-primary hover:text-primary px-2">
                  <Link href="/analytics">
                    Tahlil <ChevronRight className="size-3.5" />
                  </Link>
                </Button>
              </div>

              {/* Fanlar bo'yicha progress */}
              <div className="space-y-2.5">
                {[
                  { name: 'Matematika', mastery: 72, color: 'from-blue-500 to-cyan-400' },
                  { name: 'Biologiya', mastery: 51, color: 'from-emerald-500 to-teal-400' },
                  { name: 'Tarix', mastery: 83, color: 'from-amber-500 to-orange-400' },
                  { name: 'Ona tili', mastery: 78, color: 'from-purple-500 to-indigo-400' },
                ].map((item) => (
                  <div key={item.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-foreground">{item.name}</span>
                      <span className="font-mono text-muted-foreground">{item.mastery}%</span>
                    </div>
                    <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted/60">
                      <div
                        className={cn("h-full rounded-full bg-gradient-to-r", item.color)}
                        style={{ width: `${item.mastery}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Zaif mavzu bo'yicha tezkor tavsiya */}
              {data.weak_review ? (
                <div className="p-2.5 rounded-xl bg-primary/5 border border-primary/20 flex items-center justify-between gap-2">
                  <p className="text-[11px] text-muted-foreground truncate">
                    Takrorlash: <strong className="text-foreground">{data.weak_review.topic_title}</strong>
                  </p>
                  <Button asChild variant="ghost" size="sm" className="h-6 text-[11px] font-bold text-primary px-2">
                    <Link href="/tests/revision">Mashq ➔</Link>
                  </Button>
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-primary/5 border border-primary/20 flex items-center justify-between gap-2">
                  <p className="text-[11px] text-muted-foreground truncate">
                    AI Mentor: <strong className="text-foreground">{nudge.cta}</strong>
                  </p>
                  <Button asChild variant="ghost" size="sm" className="h-6 text-[11px] font-bold text-primary px-2">
                    <Link href={nudge.href || '/tests'}>Boshlash ➔</Link>
                  </Button>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-border/50 text-[11px] text-muted-foreground text-center">
              Har bir yechilgan test ballingizni oshirib boradi
            </div>
          </Card>
        </div>

        {/* ============================================================ */}
        {/* 5. TEZKOR KIRISH (QUICK ACCESS — 6 TA ASOSIY BO'LIM)          */}
        {/* ============================================================ */}
        <section className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-black tracking-tight text-foreground">
              Barcha O&apos;quv Bo&apos;limlari
            </h2>
          </div>
          
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
            {QUICK_ACCESS.filter((it) => !it.featureKey || isEnabled(it.featureKey)).map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href} className="group block h-full">
                  <Card className="relative h-full gap-0 overflow-hidden py-3.5 px-3 rounded-2xl border-border/70 transition-all hover:border-primary/50 hover:shadow-xs bg-card">
                    <CardMotif shape={item.motif} className={item.motifTone} />
                    <CardContent className="relative p-0 space-y-2">
                      <div className="flex items-center justify-between">
                        <PremiumIcon
                          icon={Icon}
                          tone={item.iconTone}
                          size="sm"
                          glow
                          className="transition-transform group-hover:scale-110"
                        />
                        <Badge variant="secondary" className="text-[9px] px-1.5 py-0">{item.badge}</Badge>
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm font-bold text-foreground transition-colors group-hover:text-primary">{item.title}</p>
                        <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">{item.desc}</p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>

      </main>
    </>
  );
}
