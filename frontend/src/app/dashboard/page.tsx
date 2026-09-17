'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  FileCheck2, Swords, BookOpen,
  Crown, Sparkles, Flame, Coins, Trophy,
  CheckCircle2, ChevronRight, Zap, Layers, Headphones,
  Dna, Brain, ArrowRight, Play, Check,
  Bell, CheckCheck, Heart, MessageCircle, X
} from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { useApiQuery } from '@/lib/api-cache';
import { apiFetch } from '@/lib/api-client';
import { getRankInfo } from '@/lib/rank';
import Celebration from '@/components/student/Celebration';
import { mentorNudge } from '@/lib/mentorVoice';
import AppShell from '@/components/AppShell';
import { cn } from '@/lib/utils';
import { useFeatureFlags } from '@/lib/features';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

type NotificationItem = {
  id: number;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
};

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
  unread_notifications_count?: number;
};

type LeaderboardRow = {
  profile_id: number;
  username: string;
  first_name: string;
  last_name: string;
  avatar_url: string;
  xp: number;
  level: number;
  role: string;
  is_superadmin: boolean;
  is_teacher: boolean;
};

type LeaderboardData = {
  top: LeaderboardRow[];
  my_group: (LeaderboardRow & { rank: number; is_me: boolean })[];
  my_rank: number;
};

const SKILL_CARDS = [
  {
    title: "Audio & Fokus",
    desc: "Ambient va tinglab tushunish",
    icon: Headphones,
    href: "/study",
    badge: "12 dars",
    bg: "bg-purple-500/10 hover:bg-purple-500/15 border-purple-500/25",
    iconBg: "bg-purple-500/20 text-purple-600 dark:text-purple-400",
    textHover: "group-hover:text-purple-600 dark:group-hover:text-purple-400",
  },
  {
    title: "Nazariya & Konspekt",
    desc: "Video va qisqa darslar",
    icon: BookOpen,
    href: "/learning",
    badge: "Barcha fanlar",
    bg: "bg-rose-500/10 hover:bg-rose-500/15 border-rose-500/25",
    iconBg: "bg-rose-500/20 text-rose-600 dark:text-rose-400",
    textHover: "group-hover:text-rose-600 dark:group-hover:text-rose-400",
  },
  {
    title: "Lug'at & Flashcard",
    desc: "Sanalar va formulalar",
    icon: Layers,
    href: "/flashcards",
    badge: "Anki ⚡",
    bg: "bg-emerald-500/10 hover:bg-emerald-500/15 border-emerald-500/25",
    iconBg: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400",
    textHover: "group-hover:text-emerald-600 dark:group-hover:text-emerald-400",
  },
  {
    title: "Amaliy Testlar",
    desc: "DTM & Milliy Sertifikat",
    icon: Zap,
    href: "/tests",
    badge: "Mock Test",
    bg: "bg-amber-500/10 hover:bg-amber-500/15 border-amber-500/25",
    iconBg: "bg-amber-500/20 text-amber-600 dark:text-amber-400",
    textHover: "group-hover:text-amber-600 dark:group-hover:text-amber-400",
  },
];

const POPULAR_SUBJECTS = [
  { name: "Rus tili", icon: "🇷🇺", slug: "rus-tili" },
  { name: "Tarix", icon: "🏛", slug: "tarix" },
  { name: "Ona tili", icon: "📖", slug: "ona-tili" },
  { name: "Ingliz tili", icon: "🇬🇧", slug: "ingliz-tili" },
  { name: "Matematika", icon: "📐", slug: "matematika" },
  { name: "Biologiya", icon: "🌿", slug: "biologiya" },
];

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return 'Xayrli tun';
  if (h < 12) return 'Xayrli tong';
  if (h < 18) return 'Xayrli kun';
  return 'Xayrli kech';
}

function getNotifIcon(type: string, title: string) {
  const t = (type || '').toLowerCase();
  const lowerTitle = (title || '').toLowerCase();
  if (lowerTitle.includes('reaksiya') || lowerTitle.includes('like') || lowerTitle.includes('yurak')) {
    return <div className="p-2 rounded-xl bg-rose-500/10 text-rose-500"><Heart className="size-4 fill-rose-500" /></div>;
  }
  if (lowerTitle.includes('izoh') || lowerTitle.includes('fikr') || lowerTitle.includes('comment')) {
    return <div className="p-2 rounded-xl bg-sky-500/10 text-sky-500"><MessageCircle className="size-4" /></div>;
  }
  if (t === 'battle') {
    return <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500"><Swords className="size-4" /></div>;
  }
  if (t === 'achievement') {
    return <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500"><Trophy className="size-4" /></div>;
  }
  if (t === 'mission') {
    return <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500"><Sparkles className="size-4" /></div>;
  }
  return <div className="p-2 rounded-xl bg-primary/10 text-primary"><Bell className="size-4" /></div>;
}

function DashboardSkeleton() {
  return (
    <main className="page-shell flex-1 space-y-6 bg-[var(--bg-page)] p-4 pb-16 sm:p-6">
      <Skeleton className="h-32 w-full rounded-[2rem]" />
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          <Skeleton className="h-64 w-full rounded-[2rem]" />
          <Skeleton className="h-28 w-full rounded-[1.75rem]" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-2xl" />
            ))}
          </div>
        </div>
        <div className="space-y-6 lg:col-span-4">
          <Skeleton className="h-56 w-full rounded-[1.75rem]" />
          <Skeleton className="h-72 w-full rounded-[1.75rem]" />
        </div>
      </div>
    </main>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { access, authReady } = useAuthStore();
  const { isEnabled } = useFeatureFlags();

  const { data, error } = useApiQuery<DashboardData>('/api/dashboard/home/');
  const { data: lbData } = useApiQuery<LeaderboardData>('/api/leaderboard/');

  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loadingNotifs, setLoadingNotifs] = useState(false);

  useEffect(() => {
    if (data && typeof data.unread_notifications_count === 'number') {
      setUnreadCount(data.unread_notifications_count);
    }
  }, [data]);

  const loadNotifications = async () => {
    setLoadingNotifs(true);
    try {
      const res = await apiFetch<{ notifications: NotificationItem[]; unread_count: number }>('/api/dashboard/notifications/');
      setNotifications(res.notifications || []);
      setUnreadCount(res.unread_count || 0);
    } catch (err) {
      console.error('Failed to load notifications', err);
    } finally {
      setLoadingNotifs(false);
    }
  };

  const handleOpenNotifications = () => {
    const nextState = !showNotifications;
    setShowNotifications(nextState);
    if (nextState) {
      loadNotifications();
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await apiFetch('/api/dashboard/notifications/', {
        method: 'POST',
        body: JSON.stringify({ action: 'mark_all_read' }),
      });
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('Failed to mark all as read', err);
    }
  };

  const handleMarkSingleRead = async (id: number) => {
    try {
      await apiFetch('/api/dashboard/notifications/', {
        method: 'POST',
        body: JSON.stringify({ id }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      console.error('Failed to mark notification as read', err);
    }
  };

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
  const activeSubject = data.selected_subject?.name || 'Rus tili';

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

  const lastAttempt = data.recent_attempts[0] || null;
  const continueTitle = lastAttempt
    ? lastAttempt.test_title
    : (data.suggested_topic?.title || "Rus tili — Boshlang'ich grammatika");

  // Daily Goal progress
  const targetGoals = 3;
  const currentGoals = Math.min(targetGoals, data.solved_today || (doneMissions > 0 ? doneMissions : 1));
  const goalPct = Math.min(100, Math.round((currentGoals / targetGoals) * 100));

  // Circular ring measurements
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (goalPct / 100) * circumference;

  // 7 Days of Week Dots
  const weekDays = [
    { label: 'D', active: p.streak >= 1 },
    { label: 'S', active: p.streak >= 2 },
    { label: 'CH', active: p.streak >= 3 },
    { label: 'P', active: p.streak >= 4 },
    { label: 'J', active: p.streak >= 5 },
    { label: 'SH', active: p.streak >= 6 },
    { label: 'Y', active: p.streak >= 7 },
  ];

  // Leaderboard items (fallback to realistic ranking if empty)
  const topList = lbData?.top?.slice(0, 4) || [
    { profile_id: 1, first_name: 'Shaxzoda', last_name: 'Farxodova', username: 'shaxzoda', avatar_url: '', xp: 4250, is_me: false },
    { profile_id: 2, first_name: 'Jasur', last_name: 'Bekov', username: 'jasur', avatar_url: '', xp: 3820, is_me: false },
    { profile_id: 3, first_name: 'Madina', last_name: 'Karimova', username: 'madina', avatar_url: '', xp: 3100, is_me: false },
    { profile_id: 4, first_name: 'Otabek', last_name: 'Nazarov', username: 'otabek', avatar_url: '', xp: 2750, is_me: false },
  ];

  return (
    <>
      <AppShell />
      <main className="page-shell flex-1 space-y-4 sm:space-y-6 bg-[var(--bg-page)] w-full max-w-full min-w-0 overflow-x-hidden p-3.5 sm:p-6 pb-24 sm:pb-16">
        
        {/* ============================================================ */}
        {/* 🟢 TOP LIVE ACTIVITY & ONLINE USERS (PLATFORMA TEPASIDA)     */}
        {/* ============================================================ */}
        {/* ============================================================ */}
        {/* TOP STATUS BAR: PROFILE, LIVE ONLINE & NOTIFICATIONS         */}
        {/* ============================================================ */}
        <div className="flex items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative shrink-0">
              <Avatar className="size-11 sm:size-12 border-2 border-sky-400/60 ring-2 ring-sky-400/20 shadow-xs">
                <AvatarImage src={p.avatar_url || undefined} alt={fullName} />
                <AvatarFallback className="font-black bg-sky-500/20 text-sky-600 dark:text-sky-300 text-sm">
                  {firstName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="absolute bottom-0 right-0 size-3 rounded-full bg-emerald-500 border-2 border-background ring-1 ring-emerald-400" />
            </div>
            <div className="min-w-0 space-y-0.5">
              <div className="flex items-center gap-1.5">
                <span className="text-sm sm:text-base font-black text-foreground truncate">{firstName}</span>
                {p.is_premium && (
                  <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-500 text-[9px] font-bold px-1.5 py-0 h-4 shrink-0">
                    PRO
                  </Badge>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 truncate">
                <span className="inline-flex items-center gap-1 text-emerald-500 font-semibold shrink-0">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {data.online_count || 1} onlayn
                </span>
                <span>·</span>
                <span className="truncate">{rankInfo.title}</span>
                <span>·</span>
                <span className="shrink-0 font-mono">Lvl {p.level}</span>
              </p>
            </div>
          </div>

          {/* Gamification Pills (On desktop: Streak + Coins + Arena + Bell; On mobile: Bell only since AppShell header already displays Streak & Coins) */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Streak Pill - Desktop only */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/profile"
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-all text-foreground"
                >
                  <Flame className="size-4 text-amber-500 fill-amber-500 animate-bounce" />
                  <span className="font-mono text-xs font-black">{p.streak}</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent className="text-xs font-medium">
                {p.streak} kunlik faoliyat ketma-ketligi (Streak)
              </TooltipContent>
            </Tooltip>

            {/* Coins / Gems Pill - Desktop only */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/shop"
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 transition-all text-foreground"
                >
                  <Coins className="size-4 text-sky-500 fill-sky-500" />
                  <span className="font-mono text-xs font-black">{p.coins.toLocaleString('uz-UZ')}</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent className="text-xs font-medium">
                Do&apos;konda yangi skin va unvonlar olish uchun tangalar
              </TooltipContent>
            </Tooltip>

            {/* Arena ELO - Desktop only */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/battles"
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition-all text-foreground"
                >
                  <Swords className="size-4 text-rose-500" />
                  <span className="font-mono text-xs font-black">{p.elo_rating}</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent className="text-xs font-medium">
                Arena ELO reytingi
              </TooltipContent>
            </Tooltip>

            {/* Notification Bell with Dropdown Popover */}
            <div className="relative">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={handleOpenNotifications}
                    className={cn(
                      "relative flex items-center justify-center size-9 rounded-full transition-all text-foreground",
                      showNotifications
                        ? "bg-primary text-primary-foreground shadow-sm ring-2 ring-primary/30"
                        : "bg-muted/70 hover:bg-muted border border-border/60 hover:border-primary/40"
                    )}
                    aria-label="Bildirishnomalar"
                  >
                    <Bell className={cn("size-4", unreadCount > 0 && "text-primary animate-pulse")} />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-rose-500 text-[9px] font-black text-white shadow-xs animate-bounce">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent className="text-xs font-medium">
                  Bildirishnomalar {unreadCount > 0 ? `(${unreadCount} yangi)` : ''}
                </TooltipContent>
              </Tooltip>

              {/* Notification Backdrop & Dropdown Popover */}
              {showNotifications && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowNotifications(false)}
                  />
                  <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-2xl border border-border/80 bg-background/95 backdrop-blur-md shadow-2xl z-50 overflow-hidden animate-in fade-in-50 zoom-in-95">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 bg-muted/30">
                      <div className="flex items-center gap-2">
                        <Bell className="size-4 text-primary" />
                        <h3 className="text-sm font-bold text-foreground">Bildirishnomalar</h3>
                        {unreadCount > 0 && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-primary/10 text-primary font-bold">
                            {unreadCount} yangi
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {unreadCount > 0 && (
                          <button
                            type="button"
                            onClick={handleMarkAllRead}
                            className="text-[11px] text-primary hover:underline font-medium flex items-center gap-1 px-1.5 py-1 rounded"
                            title="Barchasini o'qilgan deb belgilash"
                          >
                            <CheckCheck className="size-3.5" />
                            <span>Barchasi o&apos;qildi</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setShowNotifications(false)}
                          className="size-7 flex items-center justify-center rounded-full hover:bg-muted text-muted-foreground hover:text-foreground"
                          aria-label="Yopish"
                        >
                          <X className="size-4" />
                        </button>
                      </div>
                    </div>

                    {/* Body */}
                    <div className="max-h-[380px] overflow-y-auto divide-y divide-border/40">
                      {loadingNotifs && notifications.length === 0 ? (
                        <div className="p-6 space-y-3">
                          <Skeleton className="h-14 w-full rounded-xl" />
                          <Skeleton className="h-14 w-full rounded-xl" />
                          <Skeleton className="h-14 w-full rounded-xl" />
                        </div>
                      ) : notifications.length === 0 ? (
                        <div className="p-8 text-center space-y-2">
                          <div className="inline-flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground mx-auto">
                            <Bell className="size-6 opacity-40" />
                          </div>
                          <p className="text-sm font-bold text-foreground">Yangi bildirishnoma yo&apos;q</p>
                          <p className="text-xs text-muted-foreground max-w-[240px] mx-auto">
                            Hamjamiyatda post yozing, darslarni bajaring yoki bellashuvlarda qatnashing!
                          </p>
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <div
                            key={n.id}
                            onClick={() => !n.is_read && handleMarkSingleRead(n.id)}
                            className={cn(
                              "flex items-start gap-3 p-3.5 transition-colors cursor-pointer",
                              n.is_read ? "hover:bg-muted/40" : "bg-primary/5 hover:bg-primary/10"
                            )}
                          >
                            <div className="shrink-0 pt-0.5">
                              {getNotifIcon(n.type, n.title)}
                            </div>
                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <p className={cn("text-xs font-bold truncate", n.is_read ? "text-foreground" : "text-primary")}>
                                  {n.title}
                                </p>
                                {!n.is_read && (
                                  <span className="size-2 rounded-full bg-primary shrink-0" />
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                {n.message}
                              </p>
                              {n.created_at && (
                                <p className="text-[10px] text-muted-foreground/80 font-mono pt-0.5">
                                  {n.created_at}
                                </p>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Footer */}
                    <div className="p-2.5 border-t border-border/60 bg-muted/20 text-center">
                      <Link
                        href="/community"
                        onClick={() => setShowNotifications(false)}
                        className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
                      >
                        <span>Hamjamiyat muhokamalariga o&apos;tish</span>
                        <ChevronRight className="size-3" />
                      </Link>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* MAIN TWO-COLUMN LAYOUT (DESKTOP: 8 cols left, 4 cols right)   */}
        {/* ============================================================ */}
        <div className="grid gap-6 lg:grid-cols-12 items-start">
          
          {/* LEFT COLUMN: HERO MASCOT, CONTINUE LEARNING, SKILLS, SUBJECTS */}
          <div className="space-y-6 lg:col-span-8">
            
            {/* 1. LINGORA ACTIVE STUDY HERO CARD */}
            <div className="relative overflow-hidden rounded-[2rem] border border-sky-200/80 dark:border-sky-800/50 bg-gradient-to-br from-sky-100/90 via-sky-50/50 to-white dark:from-sky-950/40 dark:via-background dark:to-card p-4 sm:p-6 shadow-xs group">
              <div className="flex items-start justify-between gap-3">
                {/* Left: Current Subject, Lesson Title & Status */}
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-500/15 dark:bg-sky-500/25 border border-sky-500/30 text-xs font-black text-sky-600 dark:text-sky-400 shadow-2xs">
                    <span>🇷🇺</span>
                    <span>{activeSubject}</span>
                    <span className="text-muted-foreground/70 font-normal">· {lastAttempt ? "Oxirgi dars" : "Tavsiya"}</span>
                  </div>

                  <h2 className="text-base sm:text-2xl font-black text-foreground tracking-tight leading-snug line-clamp-2 group-hover:text-sky-500 transition-colors">
                    {continueTitle}
                  </h2>

                  <p className="text-xs text-muted-foreground line-clamp-1">
                    Mavzu 1 · 15 daqiqa · {data.solved_today > 0 ? `Bugun ${data.solved_today} ta test yechildi ⚡` : "Bugungi darsingizni davom ettiring!"}
                  </p>
                </div>

                {/* Right: 3D Mascot Bird Badge */}
                <div className="size-16 sm:size-24 shrink-0 rounded-2xl overflow-hidden border-2 border-white dark:border-sky-800 shadow-md ring-2 ring-sky-400/25 bg-sky-100 dark:bg-sky-950">
                  <img src="/images/mascot-hero.jpg" alt="Ilm Mascot" className="size-full object-cover group-hover:scale-105 transition-transform duration-300" />
                </div>
              </div>

              {/* Progress & Single Main CTA */}
              <div className="mt-4 pt-3.5 border-t border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <div className="h-2 w-full max-w-[180px] rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-sky-400 to-blue-600 rounded-full" style={{ width: `${lastAttempt?.score || 60}%` }} />
                  </div>
                  <span className="text-[11px] font-mono font-bold text-muted-foreground shrink-0">
                    {lastAttempt?.score || 60}% o&apos;zlashtirildi
                  </span>
                </div>

                <Button asChild className="w-full sm:w-auto rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-extrabold shadow-md shadow-sky-500/25 gap-2 px-6 h-10 text-xs sm:text-sm transition-all hover:scale-[1.02]">
                  <Link href={nudge.href || "/tests"}>
                    <Play className="size-3.5 fill-white" />
                    <span>Darsni davom ettirish</span>
                    <ArrowRight className="size-3.5 ml-0.5" />
                  </Link>
                </Button>
              </div>
            </div>

            {/* 2. BUILD YOUR SKILLS (4 PASTEL TILES) */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-black tracking-tight text-foreground">
                  Ko&apos;nikmalarni rivojlantirish
                </h2>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                {SKILL_CARDS.map((sk, idx) => {
                  const Icon = sk.icon;
                  return (
                    <Link key={idx} href={sk.href} className="group block">
                      <Card className={cn("relative overflow-hidden rounded-2xl p-3 sm:p-4 border transition-all hover:shadow-xs group h-full flex flex-col justify-between", sk.bg)}>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className={cn("flex size-9 sm:size-10 items-center justify-center rounded-xl transition-transform group-hover:scale-110", sk.iconBg)}>
                              <Icon className="size-4 sm:size-5" />
                            </div>
                            <span className="text-[9px] sm:text-[10px] font-bold text-muted-foreground/80">{sk.badge}</span>
                          </div>
                          <div>
                            <p className={cn("text-xs sm:text-sm font-extrabold text-foreground transition-colors truncate", sk.textHover)}>
                              {sk.title}
                            </p>
                            <p className="mt-0.5 text-[10px] sm:text-[11px] text-muted-foreground line-clamp-1">
                              {sk.desc}
                            </p>
                          </div>
                        </div>
                        <div className="mt-2.5 flex items-center justify-end text-muted-foreground/60 group-hover:text-foreground transition-colors">
                          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
                        </div>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* 3. POPULAR SUBJECTS (HORIZONTAL SCROLL) */}
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm sm:text-base font-black tracking-tight text-foreground truncate">
                  Fanlar bo&apos;yicha testlar
                </h3>
                <Link href="/tests" className="text-xs font-bold text-sky-500 hover:underline shrink-0">
                  Katalog &gt;
                </Link>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                {POPULAR_SUBJECTS.map((sub, idx) => (
                  <Link
                    key={idx}
                    href={`/tests?subject=${sub.slug}`}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-card border border-border/70 hover:border-sky-500/50 hover:bg-sky-500/5 transition-all text-xs font-bold text-foreground shadow-2xs group shrink-0"
                  >
                    <span className="text-base">{sub.icon}</span>
                    <span className="group-hover:text-sky-500 transition-colors whitespace-nowrap">{sub.name}</span>
                  </Link>
                ))}
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: DAILY GOAL, MINI LEADERBOARD, GIFT QUEST */}
          <div className="space-y-5 sm:space-y-6 lg:col-span-4">
            
            {/* 1. DAILY GOAL CARD (CIRCULAR RING + 7-DAY STREAK TRACKER) */}
            <Card className="rounded-[1.75rem] border border-border/70 bg-card p-4 sm:p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-black text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <span>Kunlik Maqsad</span>
                </h3>
                <Badge variant="outline" className="border-sky-500/30 bg-sky-500/10 text-sky-500 text-[10px] font-extrabold shrink-0">
                  {goalPct}%
                </Badge>
              </div>

              <div className="flex items-center gap-3.5 sm:gap-4">
                {/* Circular Progress Ring */}
                <div className="relative flex items-center justify-center size-20 sm:size-24 shrink-0">
                  <svg className="size-full -rotate-90" viewBox="0 0 96 96">
                    <circle
                      cx="48"
                      cy="48"
                      r={radius}
                      className="stroke-muted/40"
                      strokeWidth="7"
                      fill="transparent"
                    />
                    <circle
                      cx="48"
                      cy="48"
                      r={radius}
                      className="stroke-sky-500 transition-all duration-1000 ease-out"
                      strokeWidth="7"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                      fill="transparent"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center text-center">
                    <span className="text-base">🔥</span>
                    <span className="text-xs font-black text-foreground font-mono leading-none mt-0.5">
                      {currentGoals}/{targetGoals}
                    </span>
                    <span className="text-[9px] text-muted-foreground font-medium">test</span>
                  </div>
                </div>

                {/* Goal description */}
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-sm font-extrabold text-foreground leading-snug">
                    {goalPct >= 100 ? "Kunlik marra bajarildi! 🎉" : "Juda zo'r ketyapsiz!"}
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Siz <strong className="text-amber-500">{p.streak} kunlik</strong> olovli streakdasiz.
                  </p>
                </div>
              </div>

              {/* 7 Days of Week Dots (7-column responsive grid) */}
              <div className="mt-4 pt-3.5 border-t border-border/60">
                <div className="grid grid-cols-7 gap-1 sm:gap-1.5 text-center">
                  {weekDays.map((d, i) => (
                    <div key={i} className="flex flex-col items-center gap-1 min-w-0">
                      <div
                        className={cn(
                          "flex size-6 sm:size-7 items-center justify-center rounded-full text-[10px] font-bold transition-all",
                          d.active
                            ? "bg-sky-500 text-white shadow-xs shadow-sky-500/30"
                            : "border-2 border-border/80 bg-muted/40 text-muted-foreground"
                        )}
                      >
                        {d.active ? <Check className="size-3.5 stroke-[3]" /> : null}
                      </div>
                      <span className="text-[10px] font-bold text-muted-foreground">{d.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            {/* 2. MINI LEADERBOARD */}
            <Card className="rounded-[1.75rem] border border-border/70 bg-card p-4 sm:p-5 shadow-xs space-y-3.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Trophy className="size-4 text-amber-500 shrink-0" />
                  <h3 className="text-xs font-black text-foreground uppercase tracking-wider truncate">Haftalik Reyting</h3>
                </div>
                <Link href="/leaderboard" className="text-xs font-bold text-sky-500 hover:underline shrink-0">
                  Barchasi &gt;
                </Link>
              </div>

              <div className="space-y-1.5">
                {topList.map((item, idx) => {
                  const isCurrentUser = item.username === p.username;
                  const itemFullName = `${item.first_name || item.username} ${item.last_name || ''}`.trim();
                  return (
                    <div
                      key={idx}
                      className={cn(
                        "flex items-center justify-between p-2 sm:p-2.5 rounded-2xl transition-colors",
                        isCurrentUser
                          ? "bg-sky-500/15 border border-sky-500/30 text-sky-600 dark:text-sky-300 font-bold"
                          : "hover:bg-muted/40"
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className={cn(
                          "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-black",
                          idx === 0 ? "bg-amber-400 text-neutral-950 shadow-xs" :
                          idx === 1 ? "bg-slate-300 text-neutral-950" :
                          idx === 2 ? "bg-amber-700/80 text-white" : "bg-muted text-muted-foreground"
                        )}>
                          {idx + 1}
                        </span>
                        <Avatar className="size-7 shrink-0">
                          <AvatarImage src={item.avatar_url} />
                          <AvatarFallback className="text-[10px] font-bold">{item.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-bold truncate">
                          {isCurrentUser ? "Siz" : itemFullName}
                        </span>
                      </div>
                      <span className="font-mono text-xs font-black text-muted-foreground shrink-0 whitespace-nowrap pl-2">
                        {item.xp.toLocaleString('uz-UZ')} XP
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* 3. BONUS GIFT BOX QUEST */}
            <Card className="rounded-[1.75rem] border border-border/70 bg-gradient-to-br from-indigo-500/10 via-card to-purple-500/10 p-4 sm:p-5 shadow-xs space-y-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="size-12 sm:size-13 shrink-0 rounded-2xl overflow-hidden shadow-md border border-white/40">
                  <img src="/images/gift-box.jpg" alt="Gift" className="size-full object-cover" />
                </div>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="text-xs font-black text-foreground leading-snug">
                    Bugun yana 2 ta test yeching va 200 tanga bonus oling! 🎁
                  </p>
                  <p className="text-[11px] text-muted-foreground">Kvest progressi: 3 / 5</p>
                </div>
              </div>

              <div className="space-y-1">
                <div className="h-2 w-full rounded-full bg-muted/60 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-sky-500 to-indigo-500 rounded-full" style={{ width: '60%' }} />
                </div>
              </div>
            </Card>

          </div>

        </div>

      </main>
    </>
  );
}
