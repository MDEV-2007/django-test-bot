'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Trophy,
  ChevronRight,
  Sparkles,
  Bell,
  CheckCheck,
  Heart,
  MessageCircle,
  Swords,
  X,
  BookOpen,
  Clock,
  Layers,
  Play,
  Flame,
  Zap,
  Target,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { useApiQuery } from '@/lib/api-cache';
import { apiFetch } from '@/lib/api-client';
import { getRankInfo } from '@/lib/rank';
import PresenceRow from '@/components/student/PresenceRow';
import Celebration from '@/components/student/Celebration';
import ModernAppLayout from '@/components/layout/ModernAppLayout';
import {
  HeroFocusBanner,
  DailyGoalCard,
  BattleArenaCard,
} from '@/components/dashboard/ModernHeroDashboard';
import ModernTestCenter from '@/components/dashboard/ModernTestCenter';
import PomodoroTimerCard from '@/components/dashboard/PomodoroTimerCard';
import PremiumIcon from '@/components/ui/premium-icon';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

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
    username: string;
    first_name: string;
    last_name: string;
    avatar_url: string;
    xp: number;
    level: number;
    coins: number;
    streak: number;
    elo_rating: number;
    next_level_xp: number;
    is_premium: boolean;
  };
  xp_progress: number;
  freeze_count: number;
  online_count: number;
  online_peers: { name: string; username?: string; avatar_url: string | null; is_me?: boolean }[];
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
  recent_attempts: {
    id: number;
    test_title: string;
    score: number | null;
    completed_at: string | null;
    time_spent_display: string;
  }[];
  suggested_topic: { id: number; title: string; description: string } | null;
  selected_subject: { id: number; name: string } | null;
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
  role?: string;
  is_superadmin?: boolean;
  is_teacher?: boolean;
};

type LeaderboardData = {
  top: LeaderboardRow[];
  my_group: (LeaderboardRow & { rank: number; is_me: boolean })[];
  my_rank: number;
};

function getNotifIcon(type: string, title: string) {
  const t = (type || '').toLowerCase();
  const lowerTitle = (title || '').toLowerCase();
  if (lowerTitle.includes('reaksiya') || lowerTitle.includes('like') || lowerTitle.includes('yurak')) {
    return <PremiumIcon icon={Heart} tone="rose" size="sm" glow />;
  }
  if (lowerTitle.includes('izoh') || lowerTitle.includes('fikr') || lowerTitle.includes('comment')) {
    return <PremiumIcon icon={MessageCircle} tone="sky" size="sm" glow />;
  }
  if (t === 'battle') {
    return <PremiumIcon icon={Swords} tone="purple" size="sm" glow />;
  }
  if (t === 'achievement') {
    return <PremiumIcon icon={Trophy} tone="gold" size="sm" glow />;
  }
  if (t === 'mission') {
    return <PremiumIcon icon={Sparkles} tone="emerald" size="sm" glow />;
  }
  return <PremiumIcon icon={Bell} tone="sky" size="sm" glow />;
}

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-[var(--bg-page)] p-4 sm:p-8 space-y-6">
      <Skeleton className="h-64 w-full rounded-3xl bg-slate-200/70" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Skeleton className="h-44 w-full rounded-3xl bg-slate-200/70" />
        <Skeleton className="h-44 w-full rounded-3xl bg-slate-200/70" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-3xl bg-slate-200/70" />
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { access, authReady } = useAuthStore();

  const { data, error } = useApiQuery<DashboardData>('/api/dashboard/home/');
  const { data: lbData } = useApiQuery<LeaderboardData>('/api/leaderboard/');

  // Mode Tabs: 'study' (Akademik O'quv) or 'arena' (Gamifikatsiya & Reyting)
  const [activeMode, setActiveMode] = useState<'study' | 'arena'>('study');

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
      const res = await apiFetch<{ notifications: NotificationItem[]; unread_count: number }>(
        '/api/dashboard/notifications/'
      );
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
      <div className="min-h-screen bg-[var(--bg-page)] p-6 flex items-center justify-center">
        <Card className="border-rose-200 bg-rose-50/80 p-6 text-rose-800 text-sm max-w-md rounded-3xl backdrop-blur-xl shadow-sm">
          {error}
        </Card>
      </div>
    );
  }

  if (!data) return <DashboardSkeleton />;

  const p = data.profile;
  const rankInfo = getRankInfo(p.elo_rating || 0);
  const firstName = p.first_name || p.username;
  const doneMissions = data.missions.filter((m) => m.is_completed).length;
  const activeSubject = data.selected_subject?.name || 'Rus tili';

  const lastAttempt = data.recent_attempts[0] || null;
  const continueTitle = lastAttempt
    ? lastAttempt.test_title
    : (data.suggested_topic?.title || `${activeSubject} — Asosiy mavzulashtirilgan test`);

  // Daily Goal progress
  const targetGoals = 3;
  const currentGoals = Math.min(targetGoals, data.solved_today || (doneMissions > 0 ? doneMissions : 1));

  // 7 Days of Week Dots
  const weekDays = [
    p.streak >= 1,
    p.streak >= 2,
    p.streak >= 3,
    p.streak >= 4,
    p.streak >= 5,
    p.streak >= 6,
    p.streak >= 7,
  ];

  // Leaderboard rows
  const topList = lbData?.top?.slice(0, 5) || [
    { profile_id: 1, first_name: 'Shaxzoda', last_name: 'Farxodova', username: 'shaxzoda', avatar_url: '', xp: 4250, level: 12 },
    { profile_id: 2, first_name: 'Jasur', last_name: 'Bekov', username: 'jasur', avatar_url: '', xp: 3820, level: 11 },
    { profile_id: 3, first_name: 'Madina', last_name: 'Karimova', username: 'madina', avatar_url: '', xp: 3100, level: 9 },
    { profile_id: 4, first_name: 'Otabek', last_name: 'Nazarov', username: 'otabek', avatar_url: '', xp: 2750, level: 8 },
    { profile_id: 5, first_name: 'Sardor', last_name: 'Alimov', username: 'sardor', avatar_url: '', xp: 2400, level: 7 },
  ];

  return (
    <ModernAppLayout
      user={p}
      unreadCount={unreadCount}
      onNotificationsClick={handleOpenNotifications}
      theme="light"
    >
      <Celebration
        level={p.level || 1}
        streak={p.streak || 0}
        completedAttempts={data.recent_attempts.length}
      />

      {/* ============================================================ */}
      {/* 1. TOP MODE SWITCHER TABS (O'QUV vs ARENA)                   */}
      {/* Separates Academic learning from Gamification & Esports     */}
      {/* ============================================================ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        {/* Segmented Mode Pills in Pure White with Soft Shadow */}
        <div className="inline-flex p-1.5 rounded-2xl bg-white border border-slate-200/90 shadow-[0_2px_12px_rgba(15,23,42,0.06)] backdrop-blur-xl">
          <button
            type="button"
            onClick={() => setActiveMode('study')}
            className={cn(
              'flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer select-none',
              activeMode === 'study'
                ? 'bg-blue-600 text-white shadow-[0_2px_12px_rgba(37,99,235,0.35)]'
                : 'text-slate-600 hover:text-slate-950 hover:bg-slate-50'
            )}
          >
            <BookOpen className="size-4" />
            <span>O&apos;quv Markazi</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveMode('arena')}
            className={cn(
              'flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer select-none',
              activeMode === 'arena'
                ? 'bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-[0_2px_12px_rgba(249,115,22,0.35)]'
                : 'text-slate-600 hover:text-slate-950 hover:bg-slate-50'
            )}
          >
            <Swords className="size-4" />
            <span>Arena &amp; Reyting</span>
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-orange-500" />
            </span>
          </button>
        </div>

        {/* Quick Gamified Badges in Light Mode Palette */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-orange-50 border border-orange-200 text-xs font-bold text-orange-700 shadow-2xs">
            <Flame className="size-4 text-orange-500 fill-orange-500 animate-bounce" />
            <span>Streak: <strong className="text-orange-700 font-black">{p.streak} kun</strong></span>
          </div>
          <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-xs font-bold text-amber-800 shadow-2xs">
            <span>🪙</span>
            <span className="font-mono text-amber-700 font-extrabold">{p.coins.toLocaleString('uz-UZ')} tanga</span>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. DESKTOP 2-COLUMN STRUCTURE: MAIN COLUMN + COMPANION SIDEBAR */}
      {/* Responsive Architecture: Desktop 8/4 grid, Mobile 1-column  */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ========================================================== */}
        {/* MAIN COLUMN (lg:col-span-8): ACADEMIC OR ARENA FOCUS       */}
        {/* ========================================================== */}
        <div className="lg:col-span-8 space-y-6">
          {activeMode === 'study' ? (
            <>
              {/* 1. SINGLE COMMANDING PRIMARY HERO CTA (LIGHT MODE) */}
              <HeroFocusBanner
                user={{
                  first_name: firstName,
                  username: p.username,
                  streak: p.streak,
                  coins: p.coins,
                  elo_rating: p.elo_rating,
                }}
                recommendedSprint={{
                  title: continueTitle,
                  topic: '15-daqiqalik Fokus Sprinti',
                  durationMinutes: 15,
                  progressPct: lastAttempt?.score || 65,
                  subjectName: activeSubject,
                  actionUrl: '/tests',
                }}
                theme="light"
              />

              {/* 2. CLEAN 25-MINUTE POMODORO TIMER CARD */}
              <PomodoroTimerCard />

              {/* 3. CURATED TESTS (PROGRESSIVE DISCLOSURE - ONLY 2 TESTS) */}
              <ModernTestCenter
                activeSubject={activeSubject}
                weakReviewTopic={data.weak_review?.topic_title || null}
                theme="light"
              />

              {/* 4. TEZKOR O'QUV ASBOBLARI (COMPACT CARDS IN PURE WHITE) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                    O&apos;quv Qurollari
                  </h3>
                  <span className="text-xs font-medium text-slate-500">Fokus va xotira mashqlari</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <Link
                    href="/study"
                    className="group rounded-2xl border border-slate-200/90 bg-white hover:border-slate-300 p-4 shadow-[0_2px_12px_rgba(15,23,42,0.03)] hover:shadow-md transition-all hover:-translate-y-0.5"
                  >
                    <div className="size-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 mb-2.5 group-hover:scale-110 transition-transform">
                      <Clock className="size-4" />
                    </div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                      Fokus Xonasi
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                      Pomodoro &amp; Ambient tovushlar
                    </p>
                  </Link>

                  <Link
                    href="/flashcards"
                    className="group rounded-2xl border border-slate-200/90 bg-white hover:border-slate-300 p-4 shadow-[0_2px_12px_rgba(15,23,42,0.03)] hover:shadow-md transition-all hover:-translate-y-0.5"
                  >
                    <div className="size-9 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600 mb-2.5 group-hover:scale-110 transition-transform">
                      <Layers className="size-4" />
                    </div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-purple-600 transition-colors">
                      Flashcards
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                      Interval takrorlash &amp; lug&apos;at
                    </p>
                  </Link>

                  <Link
                    href="/reels"
                    className="group rounded-2xl border border-slate-200/90 bg-white hover:border-slate-300 p-4 shadow-[0_2px_12px_rgba(15,23,42,0.03)] hover:shadow-md transition-all hover:-translate-y-0.5"
                  >
                    <div className="size-9 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600 mb-2.5 group-hover:scale-110 transition-transform">
                      <Play className="size-4" />
                    </div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-orange-600 transition-colors">
                      Bilim Reels
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                      15-sekundlik tezkor savollar
                    </p>
                  </Link>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* ARENA MODE: 1V1 DUELS & WEEKLY LEAGUE SHOWCASE */}
              <BattleArenaCard
                battleArena={{
                  onlinePlayers: data.online_count || 42,
                  currentRank: rankInfo.title,
                  elo: p.elo_rating || 1200,
                }}
                theme="light"
              />

              {/* EXPANDED WEEKLY LEADERBOARD & PODIUM IN ARENA */}
              <Card className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-[0_4px_25px_rgba(15,23,42,0.05)] space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-8 items-center justify-center rounded-xl bg-amber-50 border border-amber-200 text-amber-600">
                      <Trophy className="size-4" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-900">
                        Haftalik Liga &amp; Podest
                      </h3>
                      <p className="text-xs font-medium text-slate-500">
                        Oltin Liga yetakchilari va joriy musobaqa jadvali
                      </p>
                    </div>
                  </div>
                  <Link
                    href="/leaderboard"
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 transition"
                  >
                    Barcha Ligalar →
                  </Link>
                </div>

                {/* Top 3 Podium Visual (Light Mode) */}
                <div className="grid grid-cols-3 gap-2.5 pt-2 pb-1">
                  {/* 2nd Place */}
                  {topList[1] && (
                    <div className="flex flex-col items-center justify-end rounded-2xl border border-slate-200 bg-slate-50/70 p-3 text-center shadow-2xs">
                      <span className="text-xs">🥈</span>
                      <Avatar className="size-10 border-2 border-slate-300 my-1.5">
                        <AvatarImage src={topList[1].avatar_url} />
                        <AvatarFallback className="text-xs font-bold bg-slate-200 text-slate-700">
                          {topList[1].username.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-bold text-slate-900 truncate max-w-full">
                        {topList[1].first_name || topList[1].username}
                      </span>
                      <span className="text-[10px] font-mono font-bold text-slate-500">
                        {topList[1].xp.toLocaleString('uz-UZ')} XP
                      </span>
                    </div>
                  )}

                  {/* 1st Place Champion */}
                  {topList[0] && (
                    <div className="flex flex-col items-center justify-end rounded-2xl border border-amber-300 bg-amber-50/70 p-3.5 text-center shadow-[0_4px_16px_rgba(251,191,36,0.15)] relative -top-1">
                      <span className="text-sm">👑 🥇</span>
                      <Avatar className="size-12 border-2 border-amber-400 my-1.5 shadow-sm">
                        <AvatarImage src={topList[0].avatar_url} />
                        <AvatarFallback className="text-xs font-bold bg-amber-500 text-slate-950">
                          {topList[0].username.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs sm:text-sm font-black text-slate-900 truncate max-w-full">
                        {topList[0].first_name || topList[0].username}
                      </span>
                      <span className="text-xs font-mono font-black text-blue-600">
                        {topList[0].xp.toLocaleString('uz-UZ')} XP
                      </span>
                    </div>
                  )}

                  {/* 3rd Place */}
                  {topList[2] && (
                    <div className="flex flex-col items-center justify-end rounded-2xl border border-slate-200 bg-slate-50/70 p-3 text-center shadow-2xs">
                      <span className="text-xs">🥉</span>
                      <Avatar className="size-10 border-2 border-amber-600/60 my-1.5">
                        <AvatarImage src={topList[2].avatar_url} />
                        <AvatarFallback className="text-xs font-bold bg-slate-200 text-slate-700">
                          {topList[2].username.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-bold text-slate-900 truncate max-w-full">
                        {topList[2].first_name || topList[2].username}
                      </span>
                      <span className="text-[10px] font-mono font-bold text-slate-500">
                        {topList[2].xp.toLocaleString('uz-UZ')} XP
                      </span>
                    </div>
                  )}
                </div>

                {/* Ranked List */}
                <div className="space-y-2 pt-2">
                  {topList.map((item, idx) => {
                    const isCurrentUser = item.username === p.username;
                    const itemFullName = `${item.first_name || item.username} ${item.last_name || ''}`.trim();

                    return (
                      <div
                        key={idx}
                        className={cn(
                          'flex items-center justify-between p-3 rounded-2xl transition-colors border',
                          isCurrentUser
                            ? 'bg-blue-50/90 border-blue-200 text-blue-800 font-bold'
                            : 'border-slate-200/80 bg-white hover:bg-slate-50'
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <span className="font-mono text-xs font-bold text-slate-400 w-4 text-center">
                            #{idx + 1}
                          </span>
                          <Avatar className="size-7 border border-slate-200 shrink-0">
                            <AvatarImage src={item.avatar_url} />
                            <AvatarFallback className="text-[10px] font-bold bg-slate-100 text-slate-700">
                              {item.username.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                            {isCurrentUser ? `${itemFullName} (Siz)` : itemFullName}
                          </span>
                        </div>

                        <span className="font-mono text-xs font-black text-blue-600 shrink-0 pl-2">
                          {item.xp.toLocaleString('uz-UZ')} XP
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Arena Rules Strip */}
                <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <Zap className="size-3.5 text-orange-500" />
                    <span>G&apos;alaba: <strong>+50 XP</strong> va <strong>+25 tanga</strong></span>
                  </span>
                  <span className="text-blue-700 font-black">Oltin Liga: Top 10</span>
                </div>
              </Card>
            </>
          )}
        </div>

        {/* ========================================================== */}
        {/* COMPANION SIDEBAR (lg:col-span-4): GAMIFICATION & SOCIAL   */}
        {/* ========================================================== */}
        <div className="lg:col-span-4 space-y-5 lg:sticky lg:top-20">
          {/* 1. DAILY GOAL & STREAK WIDGET (LIGHT MODE) */}
          <DailyGoalCard
            user={{ streak: p.streak }}
            dailyGoals={{
              current: currentGoals,
              target: targetGoals,
              streakDays: weekDays,
            }}
            theme="light"
          />

          {/* 2. BONUS QUEST BOX (PURE WHITE + ENERGETIC ACCENTS) */}
          <Card className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-[0_4px_25px_rgba(15,23,42,0.05)] space-y-3">
            <div className="flex items-center gap-3">
              <div className="size-12 shrink-0 rounded-2xl overflow-hidden shadow-sm border border-slate-200 ring-2 ring-orange-500/10">
                <img src="/images/gift-box.jpg" alt="Gift" className="size-full object-cover" />
              </div>
              <div className="min-w-0 space-y-0.5">
                <Badge className="bg-orange-50 text-orange-700 border-orange-200 text-[9px] font-black px-2 py-0.2">
                  KUNLIK BONUS KVEST
                </Badge>
                <p className="text-xs sm:text-sm font-black text-slate-900 leading-snug">
                  Yana 2 ta test yeching va 200 tanga oling! 🎁
                </p>
                <p className="text-[10px] text-slate-500 font-mono font-semibold">Progress: 3 / 5 test</p>
              </div>
            </div>

            <div className="space-y-1 pt-1">
              <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full shadow-[0_0_8px_rgba(37,99,235,0.4)]"
                  style={{ width: '60%' }}
                />
              </div>
            </div>
          </Card>

          {/* 3. MINI LEADERBOARD (Shown in Study Mode for quick awareness) */}
          {activeMode === 'study' && (
            <Card className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-[0_4px_25px_rgba(15,23,42,0.05)] space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex size-6 items-center justify-center rounded-lg bg-amber-50 border border-amber-200 text-amber-600">
                    <Trophy className="size-3.5" />
                  </div>
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                    Haftalik Reyting
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveMode('arena')}
                  className="text-[11px] font-bold text-blue-600 hover:text-blue-700 transition cursor-pointer"
                >
                  To&apos;liq →
                </button>
              </div>

              <div className="space-y-2 pt-0.5">
                {topList.slice(0, 3).map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-xl border border-slate-200 bg-slate-50/70 text-xs shadow-2xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[10px] font-mono font-bold text-slate-400 w-3">
                        #{idx + 1}
                      </span>
                      <Avatar className="size-6 border border-slate-300 shrink-0">
                        <AvatarImage src={item.avatar_url} />
                        <AvatarFallback className="text-[9px] font-bold bg-slate-200 text-slate-700">
                          {item.username.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-bold text-slate-800 truncate max-w-[120px]">
                        {item.first_name || item.username}
                      </span>
                    </div>
                    <span className="font-mono text-[11px] font-black text-blue-600">
                      {item.xp.toLocaleString('uz-UZ')} XP
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* 4. ONLINE COMMUNITY PRESENCE */}
          <div className="rounded-3xl border border-slate-200/90 bg-white p-4 shadow-[0_4px_20px_rgba(15,23,42,0.04)]">
            <PresenceRow
              count={data.online_count}
              peers={data.online_peers ?? []}
              solvedToday={data.solved_today ?? 0}
            />
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* NOTIFICATION POPOVER MODAL (WHEN BELL CLICKED)              */}
      {/* High contrast, Pure White in Light Mode                      */}
      {/* ============================================================ */}
      {showNotifications && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs"
            onClick={() => setShowNotifications(false)}
          />
          <div className="fixed right-4 sm:right-8 top-20 w-[calc(100vw-2rem)] max-w-sm sm:w-96 rounded-3xl border border-slate-200 bg-white/95 backdrop-blur-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in-50 zoom-in-95">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-200 bg-slate-50/80">
              <div className="flex items-center gap-2">
                <Bell className="size-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Bildirishnomalar</h3>
                {unreadCount > 0 && (
                  <Badge className="text-[10px] px-1.5 py-0 h-4 bg-blue-50 text-blue-700 font-bold border border-blue-200">
                    {unreadCount} yangi
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="text-[11px] text-blue-600 hover:underline font-semibold flex items-center gap-1 px-1.5 py-1 rounded cursor-pointer"
                    title="Barchasini o'qilgan deb belgilash"
                  >
                    <CheckCheck className="size-3.5" />
                    <span>Barchasi o&apos;qildi</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowNotifications(false)}
                  className="size-7 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-900 cursor-pointer"
                  aria-label="Yopish"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100">
              {loadingNotifs && notifications.length === 0 ? (
                <div className="p-6 space-y-3">
                  <Skeleton className="h-14 w-full rounded-2xl bg-slate-100" />
                  <Skeleton className="h-14 w-full rounded-2xl bg-slate-100" />
                  <Skeleton className="h-14 w-full rounded-2xl bg-slate-100" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <div className="inline-flex size-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mx-auto">
                    <Bell className="size-6 opacity-40" />
                  </div>
                  <p className="text-sm font-bold text-slate-900">Yangi bildirishnoma yo&apos;q</p>
                  <p className="text-xs text-slate-500 max-w-[240px] mx-auto">
                    Hamjamiyatda post yozing, darslarni bajaring yoki bellashuvlarda qatnashing!
                  </p>
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => !n.is_read && handleMarkSingleRead(n.id)}
                    className={cn(
                      'flex items-start gap-3 p-3.5 transition-colors cursor-pointer',
                      n.is_read ? 'hover:bg-slate-50' : 'bg-blue-50/50 hover:bg-blue-50/80'
                    )}
                  >
                    <div className="shrink-0 pt-0.5">
                      {getNotifIcon(n.type, n.title)}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className={cn('text-xs font-bold truncate', n.is_read ? 'text-slate-900' : 'text-blue-800')}>
                          {n.title}
                        </p>
                        {!n.is_read && (
                          <span className="size-2 rounded-full bg-blue-600 shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                        {n.message}
                      </p>
                      {n.created_at && (
                        <p className="text-[10px] text-slate-400 font-mono pt-0.5">
                          {n.created_at}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-slate-200 bg-slate-50/80 text-center">
              <Link
                href="/community"
                onClick={() => setShowNotifications(false)}
                className="text-xs font-bold text-blue-600 hover:underline inline-flex items-center gap-1"
              >
                <span>Hamjamiyat muhokamalariga o&apos;tish</span>
                <ChevronRight className="size-3" />
              </Link>
            </div>
          </div>
        </>
      )}
    </ModernAppLayout>
  );
}
