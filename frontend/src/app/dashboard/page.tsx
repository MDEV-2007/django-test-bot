'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  FileCheck2, Swords, BookOpen, Bot, ArrowRight, History, MapPin, HelpCircle,
  Crown, Sparkles, Flame, Coins, Trophy, Snowflake, CheckCircle2,
  ChevronRight, Zap, GraduationCap, Layers, Share2,
} from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { apiFetch } from '@/lib/api-client';
import { useApiQuery } from '@/lib/api-cache';
import { arenaRankTitle } from '@/lib/rank';
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
  missions: { title: string; description: string; xp_reward: number; coin_reward: number; current_count: number; target_count: number; is_completed: boolean }[];
  recent_attempts: { id: number; test_title: string; score: number | null; completed_at: string | null; time_spent_display: string }[];
  suggested_topic: { id: number; title: string; description: string } | null;
  selected_subject: { id: number; name: string } | null;
};

/* Ranglar semantik "tone" tokenlaridan olinadi (globals.css): har bir rang ma'noni
   bildiradi — o'sish, uzluksizlik/mukofot, o'quv kontenti, AI. Ilgari bular
   to'g'ridan-to'g'ri Tailwind palitrasidan olingan va tizimga bog'lanmagan edi. */
/* `motif` — kartaning fonidagi naqsh (components/student/CardMotif.tsx). Har bo'lim
   o'z mazmunini aks ettiradi: testda hujjat, arenada qilichlar, darsda kitob va
   tovush to'lqinlari, mentorda suhbat pufagi. */
const QUICK_ACCESS = [
  { href: '/flashcards', title: 'Smart Flashcardlar', desc: 'Sanalar va qoidalarni yodlash', icon: Layers, badge: 'Anki', motif: 'lessons' as const, motifTone: 'text-[var(--tone-growth-text)]', iconTone: 'amber' as PremiumIconTone, featureKey: 'flashcards' },
  { href: '/tests', title: 'BBA & Sertifikat Testlari', desc: 'Rasmiy formatdagi mock testlar', icon: FileCheck2, badge: 'BBA', motif: 'tests' as const, motifTone: 'text-[var(--tone-growth-text)]', iconTone: 'emerald' as PremiumIconTone, featureKey: 'tests' },
  { href: '/battles', title: '1v1 Battle Arena', desc: 'Jonli intellektual jang', icon: Swords, badge: 'Live', motif: 'arena' as const, motifTone: 'text-[var(--tone-danger-text)]', iconTone: 'rose' as PremiumIconTone, featureKey: 'battles' },
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

/* Kun bo'yicha salomlashish — "Salom" har doim bir xil bo'lishi o'rniga vaqtga moslashadi. */
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
      <Skeleton className="h-8 w-64" />
      <div className="grid gap-5 md:grid-cols-12">
        <Skeleton className="h-60 md:col-span-8" />
        <Skeleton className="h-60 md:col-span-4" />
      </div>
      <div className="grid grid-cols-2 gap-3.5 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
      </div>
      <Skeleton className="h-44 w-full" />
    </main>
  );
}

/** XP progressi uchun doiraviy ko'rsatkich: 148x148, chiziq qalinligi 14px. */
function ProgressRing({ value }: { value: number }) {
  const size = 148;
  const stroke = 14;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <svg width={size} height={size} role="img" aria-label={`XP progressi ${clamped}%`}>
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke="var(--surface-hover)" strokeWidth={stroke}
      />
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke="var(--accent)" strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - clamped / 100)}
        // Boshlanish nuqtasi tepada bo'lishi uchun (SVG'da 0 daraja o'ngda).
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 700ms cubic-bezier(0.16, 1, 0.3, 1)' }}
      />
    </svg>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { access, authReady } = useAuthStore();
  const { isEnabled } = useFeatureFlags();
  // Kesh: sahifaga qaytilganda ma'lumot darhol chiziladi, yangisi fonda keladi.
  const { data, error } = useApiQuery<DashboardData>('/api/dashboard/home/');

  useEffect(() => {
    // Seans tiklanishi tugagunicha kutamiz — aks holda tokeni bor foydalanuvchi ham
    // bir zumga /login ga uloqtirilardi.
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

  /* `value` — ReactNode: raqamli ko'rsatkichlar NumberFlow bilan aylanib yangilanadi,
     matnli unvon esa oddiy matn bo'lib qoladi. */
  const stats: {
    label: string; value: React.ReactNode; icon: typeof Flame;
    tone: PremiumIconTone; href?: string; hint: string; mono?: boolean;
  }[] = [
    {
      label: 'Uzluksizlik', value: <><StatNumber value={p.streak} /> kun</>, icon: Flame,
      tone: 'amber',
      hint: data.freeze_count > 0
        ? `${data.freeze_count} ta muzlatish saqlanmoqda — kun o'tkazib yuborsangiz streak saqlanadi.`
        : 'Har kuni kamida bitta faoliyat bajarsangiz uzluksizlik o\'sadi.',
    },
    {
      // Tanga — qiymat, ya'ni oltin (premium bilan bir oila).
      label: 'Tangalar', value: <StatNumber value={p.coins} />, icon: Coins,
      tone: 'gold', href: '/shop',
      hint: "Testlar, arena va mini-o'yinlarda topiladi. Do'konda sarflanadi.",
    },
    {
      label: 'Daraja', value: <>Lvl <StatNumber value={p.level} /></>, icon: Trophy,
      tone: 'emerald', href: '/analytics',
      hint: `Keyingi darajagacha ${xpLeft.toLocaleString('uz-UZ')} XP qoldi.`,
    },
    {
      /* Bu qiymat RAQAM emas, matnli unvon — Geist Mono'ning stilize harflari
         (masalan "Navkar"dagi 'r') kichik o'lchamda boshqa harfga o'xshab ko'rinadi.
         Mono shrift faqat raqamlar uchun mo'ljallangan (layout.tsx). */
      label: 'Arena unvoni', value: arenaRankTitle(p.elo_rating), icon: Swords, mono: false,
      tone: 'rose', href: '/battles',
      hint: `Joriy ELO reytingi: ${p.elo_rating}.`,
    },
  ];

  return (
    <>
      <AppShell />
      <main className="page-shell flex-1 space-y-8 bg-[var(--bg-page)] p-4 pb-12 sm:p-6">
        {/* Sarlavha */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-voice text-2xl font-bold tracking-tight sm:text-3xl">
              {greeting()}, {firstName}!
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {doneMissions === data.missions.length && data.missions.length > 0
                ? "Bugungi barcha vazifalar bajarildi — zo'r ish!"
                : `Bugun ${data.missions.length - doneMissions} ta vazifa kutmoqda.`}
            </p>
          </div>
          <PresenceRow
            count={data.online_count}
            peers={data.online_peers ?? []}
            solvedToday={data.solved_today ?? 0}
          />
        </div>

        {/* Nishonlash lahzasi — faqat daraja oshganda, streak bosqichida yoki birinchi
            testdan keyin chiqadi; qolgan vaqtda hech narsa ko'rsatilmaydi. */}
        <Celebration level={p.level} streak={p.streak} completedAttempts={data.recent_attempts.length} />

        {/* Mentorning kunlik jumlasi — barcha ma'lumot o'quvchining o'z statistikasidan
            olinadi (zaif mavzu, streak, missiyalar, oxirgi ball). Ilgari bu yerda faqat
            "xatolar ustida ishlash" kartasi bor edi; endi u mentor ovozining bir holati. */}
        {isEnabled('ai_mentor') && (
          <Link href={nudge.href || '/tests'} className="group block">
            <Card className="tactile-btn gap-0 border-[var(--accent-border)] bg-primary/[0.05] py-4 transition-colors hover:border-[var(--accent)]/50">
              <CardContent className="flex flex-wrap items-center gap-3 px-4">
                <PremiumIcon icon={Bot} tone="primary" size="md" glow className="shrink-0 transition-transform group-hover:scale-105" />
                <p className="min-w-[16rem] flex-1 text-sm text-[var(--text-secondary)]">
                  <span className="mr-1.5 font-mono text-xs font-bold uppercase text-[var(--accent-text)]">Mentor</span>
                  {nudge.text}
                </p>
                <span className="flex shrink-0 items-center gap-1 rounded-xl bg-[var(--accent-soft)] px-3.5 py-2 text-xs font-bold text-[var(--accent-text)]">
                  {nudge.cta} <ArrowRight className="size-3.5" />
                </span>
              </CardContent>
            </Card>
          </Link>
        )}

        {/* Hero + XP halqasi */}
        <div className="grid gap-5 md:grid-cols-12">
          <Card className="relative min-w-0 overflow-hidden md:col-span-8">
            <div className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full bg-primary/10 blur-3xl" />
            <CardHeader className="relative px-6 pt-6 sm:px-8 sm:pt-8">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="border-[var(--accent-border)] bg-primary/12 text-[var(--accent-text)]">
                  <Sparkles className="size-3" /> Bugungi tavsiya
                </Badge>
                {p.is_premium && (
                  <Badge variant="outline" className="border-[var(--tone-premium)]/30 bg-[var(--tone-premium-soft)] text-[var(--tone-premium-text)]">
                    <Crown className="size-3" /> Premium
                  </Badge>
                )}
                {data.selected_subject && <Badge variant="secondary">{data.selected_subject.name}</Badge>}
              </div>
              <CardTitle className="font-voice text-xl leading-snug sm:text-2xl md:text-3xl">
                {data.suggested_topic ? data.suggested_topic.title : 'Bugun nimadan boshlaymiz?'}
              </CardTitle>
              <CardDescription className="max-w-xl leading-relaxed">
                {data.suggested_topic?.description
                  || "Bilim ildizingiz o'sishda davom etsin — yangi test yeching yoki dars ko'ring."}
              </CardDescription>
            </CardHeader>
            <CardContent className="relative flex flex-1 flex-col justify-between gap-6 px-6 pb-6 sm:px-8 sm:pb-8">
              <div className="flex flex-wrap items-center gap-2">
                <Button asChild size="lg">
                  <Link href="/tests">Testni boshlash <ArrowRight className="size-4" /></Link>
                </Button>
                {data.suggested_topic && (
                  <Button asChild variant="outline" size="lg">
                    <Link href="/learning">Avval darsni o&apos;qish</Link>
                  </Button>
                )}
              </div>

              {/* Hero pastki qatori: karta balandligini o'ng ustundagi XP halqasi bilan
                  tenglashtiradi va bo'sh joyni foydali ma'lumot bilan to'ldiradi. */}
              <div className="grid gap-3 border-t pt-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground">Kunlik missiyalar</p>
                  <p className="font-mono text-sm font-bold tabular-nums">{doneMissions} / {data.missions.length}</p>
                  <Progress value={missionPct} className="h-1.5" />
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground">Oxirgi natija</p>
                  {lastAttempt ? (
                    <>
                      <p className="font-mono text-sm font-bold tabular-nums">
                        {lastAttempt.score !== null ? `${lastAttempt.score.toFixed(0)}%` : '—'}
                      </p>
                      <p className="truncate text-xs text-[var(--text-secondary)]">{lastAttempt.test_title}</p>
                    </>
                  ) : (
                    <>
                      <p className="font-mono text-sm font-bold">—</p>
                      <p className="text-xs text-[var(--text-secondary)]">Hali test yechilmagan</p>
                    </>
                  )}
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground">Uzluksizlik</p>
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

          {/* Bilim ildizi — radial progress */}
          <Card className="min-w-0 md:col-span-4">
            <CardContent className="flex h-full flex-col items-center justify-center gap-3 pt-6 text-center">
              <div className="relative">
                {/* Bitta doiraviy progress uchun recharts (~100 KB) olib kelinardi —
                    bosh sahifa uchun eng qimmat import shu edi. Oddiy SVG halqa aynan
                    shu ko'rinishni beradi va hech qanday kutubxona talab qilmaydi. */}
                <ProgressRing value={data.xp_progress} />
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <Avatar className="size-12 border border-[var(--border-card)]">
                    <AvatarImage src={p.avatar_url || undefined} alt={fullName} />
                    <AvatarFallback className="text-xs">{firstName.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="mt-1 font-mono text-xs font-bold text-[var(--accent-text)]"><StatNumber value={data.xp_progress} suffix="%" /></span>
                </div>
              </div>

              <div className="space-y-0.5">
                <p className="text-sm font-semibold">{fullName}</p>
                <p className="text-xs text-muted-foreground">
                  Bilim Ildizi: <span className="font-bold text-[var(--accent-text)]">Daraja {p.level}</span>
                </p>
              </div>

              <p className="font-mono text-xs tabular-nums text-muted-foreground">
                <StatNumber value={p.xp} /> / {p.next_level_xp.toLocaleString('uz-UZ')} XP
              </p>
              <p className="text-xs text-[var(--text-secondary)]">
                Keyingi darajagacha <strong className="text-foreground">{xpLeft.toLocaleString('uz-UZ')} XP</strong>
              </p>

              <Button asChild variant="ghost" size="sm" className="mt-1">
                <Link href="/profile">Profilni ochish <ChevronRight className="size-3.5" /></Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Statistika */}
        <div className="grid grid-cols-2 gap-3.5 md:grid-cols-4">
          {stats.map((s, statIdx) => {
            const Icon = s.icon;
            const inner = (
              <Card className="group h-full gap-0 py-3.5 transition-all hover:border-[var(--border-strong)] hover:shadow-xs">
                <CardContent className="flex items-center gap-3 px-4">
                  <PremiumIcon
                    icon={Icon}
                    tone={s.tone}
                    size="md"
                    glow
                    className="shrink-0 transition-transform group-hover:scale-105"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-xs text-muted-foreground">{s.label}</p>
                    <p className={cn('truncate text-base font-bold sm:text-lg', s.mono !== false && 'font-mono tabular-nums')}>{s.value}</p>
                  </div>
                </CardContent>
              </Card>
            );
            return (
              <Reveal key={s.label} index={statIdx} className="min-w-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  {s.href ? <Link href={s.href} className="block">{inner}</Link> : <div>{inner}</div>}
                </TooltipTrigger>
                <TooltipContent className="max-w-56">{s.hint}</TooltipContent>
              </Tooltip>
              </Reveal>
            );
          })}
        </div>

        {/* Muzlatish eslatmasi */}
        {data.freeze_count > 0 && (
          <div className="flex items-center gap-2 rounded-xl border border-sky-500/20 bg-sky-500/[0.06] px-4 py-2.5 text-xs text-[var(--text-secondary)]">
            <Snowflake className="size-4 shrink-0 text-sky-600 dark:text-sky-300" />
            <span><strong className="text-foreground">{data.freeze_count} ta</strong> streak muzlatish saqlanmoqda — bir kun o&apos;tkazib yuborsangiz avtomatik ishlatiladi.</span>
          </div>
        )}

        {/* ============================================================ */}
        {/* INTERAKTIV DARS QILISH & BELLASHUV VITRINASI                  */}
        {/* ============================================================ */}
        {(isEnabled('flashcards') || isEnabled('battles')) && (
          <div className="grid gap-3.5 sm:grid-cols-2">
            {/* Flashcards vitrinasi */}
            {isEnabled('flashcards') && (
              <Link href="/flashcards" className="group block">
                <Card className="h-full border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-card to-card hover:border-amber-500/60 transition-all p-5 rounded-2xl flex flex-col justify-between shadow-xs">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[11px] font-bold gap-1">
                        <Sparkles className="size-3" /> Tezkor Yodlash
                      </Badge>
                      <span className="text-[11px] font-bold text-amber-500">+25 XP</span>
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-foreground group-hover:text-amber-500 transition-colors">
                      🧠 Smart Flashcardlar bilan Dars Qilish
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Test yechishdan oldin sanalar, faktlar va qoidalarni 3 daqiqalik 3D kartalar bilan yodlab oling.
                    </p>
                  </div>
                  <div className="pt-3 mt-2 border-t border-border/40 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-medium">Anki &amp; Quizlet uslubi</span>
                    <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                      Boshlash <ChevronRight className="size-3.5" />
                    </span>
                  </div>
                </Card>
              </Link>
            )}

            {/* 1v1 Arena vitrinasi */}
            {isEnabled('battles') && (
              <Link href="/battles" className="group block">
                <Card className="h-full border border-rose-500/30 bg-gradient-to-br from-rose-500/10 via-card to-card hover:border-rose-500/60 transition-all p-5 rounded-2xl flex flex-col justify-between shadow-xs">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 text-[11px] font-bold gap-1">
                        <Swords className="size-3" /> Jonli Raqobat
                      </Badge>
                      <span className="text-[11px] font-bold text-rose-500">Live Duel</span>
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-foreground group-hover:text-rose-500 transition-colors">
                      ⚔️ 1v1 Arena: Do&apos;stni Jangga Chaqiring
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Do&apos;stingizga havola yuboring yoki onlayn o&apos;quvchilar bilan 5 ta tezkor savolda bellashing.
                    </p>
                  </div>
                  <div className="pt-3 mt-2 border-t border-border/40 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-medium">Telegramga ulashish</span>
                    <span className="text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1">
                      Arenaga kirish <ChevronRight className="size-3.5" />
                    </span>
                  </div>
                </Card>
              </Link>
            )}
          </div>
        )}

        {/* Asosiy bo'limlar */}
        <section className="space-y-3">
          <h2 className="section-title">Asosiy o&apos;quv bo&apos;limlari</h2>
          <div className="grid gap-3.5 sm:grid-cols-2 md:grid-cols-4">
            {QUICK_ACCESS.filter((it) => !it.featureKey || isEnabled(it.featureKey)).map((item, qIdx) => {
              const Icon = item.icon;
              return (
                <Reveal key={item.href} index={qIdx}>
                <Link href={item.href} className="group block">
                  {/* `relative` + `overflow-hidden` — fon naqshi karta chetidan
                      chiqib ketmasligi uchun. Naqsh rangi `item.tone` dan
                      (currentColor) olinadi, shuning uchun har karta o'z rangida. */}
                  <Card className="relative h-full gap-0 overflow-hidden py-4 transition-all hover:border-[var(--accent-border)] hover:shadow-xs">
                    <CardMotif shape={item.motif} className={item.motifTone} />
                    <CardContent className="relative px-4">
                      <div className="mb-3 flex items-center justify-between">
                        <PremiumIcon
                          icon={Icon}
                          tone={item.iconTone}
                          size="md"
                          glow
                          className="transition-transform group-hover:scale-110"
                        />
                        <Badge variant="secondary">{item.badge}</Badge>
                      </div>
                      <p className="text-sm font-semibold transition-colors group-hover:text-[var(--accent-text)]">{item.title}</p>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{item.desc}</p>
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
              <Card className="tactile-btn relative overflow-hidden border-[var(--accent-border)] bg-gradient-to-r from-emerald-950/30 via-[var(--surface-card-medium)] to-[var(--surface-card-medium)] py-4 transition-all hover:border-[var(--accent)]">
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

        <div className="grid gap-5 md:grid-cols-12">
          {/* Mini o'yinlar */}
          {isEnabled('games') && (
            <section className="min-w-0 space-y-3 md:col-span-7">
              <div className="flex items-center justify-between">
                <h2 className="section-title">Interaktiv mini o&apos;yinlar</h2>
                <Badge variant="outline" className="border-[var(--tone-premium)]/25 bg-[var(--tone-premium-soft)] text-[var(--tone-premium-text)]">Bonus XP</Badge>
              </div>
              <div className="space-y-3">
                {MINI_GAMES.map((game) => {
                  const Icon = game.icon;
                  return (
                    <Link key={game.href} href={game.href} className="group block">
                      <Card className="tactile-btn relative gap-0 overflow-hidden py-4 transition-colors hover:border-[var(--accent-border)] hover:shadow-xs">
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

          <div className={cn("min-w-0 space-y-5", isEnabled('games') ? "md:col-span-5" : "md:col-span-12")}>
            {/* Kunlik missiyalar — hammasi bajarilganda karta bir marta "yashil nafas"
                oladi va ro'yxat ketma-ket belgilanadi (nishonlash lahzasi). */}
            <Card className={cn(allMissionsDone && 'border-[var(--success)]/35 bg-[var(--success)]/[0.05]')}>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-base">Kunlik missiyalar</CardTitle>
                  <CardDescription>{doneMissions} / {data.missions.length} bajarildi</CardDescription>
                </div>
                {allMissionsDone && (
                  <Badge variant="outline" className="border-[var(--success)]/25 bg-[var(--success-soft)] text-[var(--success-text)]">
                    <CheckCircle2 className="size-3" /> Tugadi
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                {data.missions.length === 0 && (
                  <p className="py-4 text-center text-sm text-muted-foreground">Bugun vazifa yo&apos;q.</p>
                )}
                {data.missions.map((m, mIdx) => {
                  const pct = Math.min(100, Math.round((m.current_count / Math.max(1, m.target_count)) * 100));
                  return (
                    <Reveal key={m.title} index={mIdx} y={6}>
                    <div className={cn(
                      'space-y-1.5 rounded-xl border p-3 transition-colors',
                      m.is_completed && 'border-[var(--success)]/25 bg-[var(--success)]/[0.06]',
                    )}>
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm font-medium ${m.is_completed ? 'text-muted-foreground line-through' : ''}`}>
                          {m.title}
                        </p>
                        <span className="flex shrink-0 items-center gap-1 font-mono text-xs font-bold text-[var(--accent-text)]">
                          <Zap className="size-3" />+{m.xp_reward}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{m.description}</p>
                      <div className="flex items-center gap-2">
                        <Progress value={pct} className="h-1.5 flex-1" />
                        <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                          {m.current_count}/{m.target_count}
                        </span>
                      </div>
                    </div>
                    </Reveal>
                  );
                })}
              </CardContent>
            </Card>

            {/* Oxirgi natijalar */}
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">Oxirgi natijalar</CardTitle>
                <Button asChild variant="ghost" size="sm" className="text-[var(--accent-text)]">
                  <Link href="/tests/history">Barchasi</Link>
                </Button>
              </CardHeader>
              <CardContent>
                {data.recent_attempts.length === 0 && (
                  <div className="py-6 text-center">
                    <FileCheck2 className="mx-auto mb-2 size-8 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">Siz hali imtihon topshirmagansiz.</p>
                    <Button asChild size="sm" variant="outline" className="mt-3">
                      <Link href="/tests">Birinchi testni boshlash</Link>
                    </Button>
                  </div>
                )}
                {data.recent_attempts.map((a, i) => (
                  <div key={a.id}>
                    {i > 0 && <Separator />}
                    <Link href={`/tests/${a.id}/feedback`} className="flex items-center justify-between gap-3 py-2.5 transition-colors hover:text-[var(--accent-text)]">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{a.test_title}</p>
                        <p className="text-xs text-muted-foreground">{a.time_spent_display}</p>
                      </div>
                      <Badge variant="outline" className={`shrink-0 font-mono ${scoreTone(a.score)}`}>
                        {a.score !== null ? `${a.score.toFixed(0)}%` : '—'}
                      </Badge>
                    </Link>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </>
  );
}
