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
} from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { useApiQuery } from '@/lib/api-cache';
import { apiFetch } from '@/lib/api-client';
import { getRankInfo } from '@/lib/rank';
import PresenceRow from '@/components/student/PresenceRow';
import Celebration from '@/components/student/Celebration';
import ModernAppLayout from '@/components/layout/ModernAppLayout';
import ModernHeroDashboard from '@/components/dashboard/ModernHeroDashboard';
import ModernTestCenter from '@/components/dashboard/ModernTestCenter';
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
    return <div className="p-2 rounded-xl bg-rose-500/15 text-rose-400"><Heart className="size-4 fill-rose-500" /></div>;
  }
  if (lowerTitle.includes('izoh') || lowerTitle.includes('fikr') || lowerTitle.includes('comment')) {
    return <div className="p-2 rounded-xl bg-sky-500/15 text-sky-400"><MessageCircle className="size-4" /></div>;
  }
  if (t === 'battle') {
    return <div className="p-2 rounded-xl bg-purple-500/15 text-purple-400"><Swords className="size-4" /></div>;
  }
  if (t === 'achievement') {
    return <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400"><Trophy className="size-4" /></div>;
  }
  if (t === 'mission') {
    return <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400"><Sparkles className="size-4" /></div>;
  }
  return <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400"><Bell className="size-4" /></div>;
}

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-slate-950 p-4 sm:p-8 space-y-6">
      <Skeleton className="h-64 w-full rounded-3xl bg-slate-900/60" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Skeleton className="h-44 w-full rounded-3xl bg-slate-900/60" />
        <Skeleton className="h-44 w-full rounded-3xl bg-slate-900/60" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-3xl bg-slate-900/60" />
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
      <div className="min-h-screen bg-slate-950 p-6 flex items-center justify-center">
        <Card className="border-rose-500/30 bg-rose-950/20 p-6 text-rose-300 text-sm max-w-md rounded-3xl backdrop-blur-xl">
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
    : (data.suggested_topic?.title || "Rus tili — Boshlang'ich grammatika");

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
  const topList = lbData?.top?.slice(0, 4) || [
    { profile_id: 1, first_name: 'Shaxzoda', last_name: 'Farxodova', username: 'shaxzoda', avatar_url: '', xp: 4250, is_me: false },
    { profile_id: 2, first_name: 'Jasur', last_name: 'Bekov', username: 'jasur', avatar_url: '', xp: 3820, is_me: false },
    { profile_id: 3, first_name: 'Madina', last_name: 'Karimova', username: 'madina', avatar_url: '', xp: 3100, is_me: false },
    { profile_id: 4, first_name: 'Otabek', last_name: 'Nazarov', username: 'otabek', avatar_url: '', xp: 2750, is_me: false },
  ];

  return (
    <ModernAppLayout
      user={p}
      unreadCount={unreadCount}
      onNotificationsClick={handleOpenNotifications}
    >
      <Celebration
        level={p.level || 1}
        streak={p.streak || 0}
        completedAttempts={data.recent_attempts.length}
      />

      {/* ============================================================ */}
      {/* 1. HERO DASHBOARD & GAMIFICATION STATS (NEXT ACTION + ARENA) */}
      {/* ============================================================ */}
      <ModernHeroDashboard
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
        dailyGoals={{
          current: currentGoals,
          target: targetGoals,
          streakDays: weekDays,
        }}
        battleArena={{
          onlinePlayers: data.online_count || 42,
          currentRank: rankInfo.title,
          elo: p.elo_rating || 1200,
        }}
      />

      {/* ============================================================ */}
      {/* 2. TEST & EXAM CENTER (VIP BOARDING PASS & SUBJECT TABS)     */}
      {/* ============================================================ */}
      <ModernTestCenter />

      {/* ============================================================ */}
      {/* 4. LEADERBOARD & COMMUNITY PRESENCE (2 COLUMNS)             */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Mini Leaderboard Card */}
        <Card className="lg:col-span-7 rounded-3xl border border-slate-800/80 bg-slate-900/50 p-5 sm:p-6 backdrop-blur-xl border-t border-white/10 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-400">
                <Trophy className="size-4.5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  Haftalik Reyting (Top Abituriyentlar)
                </h3>
                <p className="text-[11px] text-slate-400">Liga yetakchilari va ballar taqsimoti</p>
              </div>
            </div>
            <Link
              href="/leaderboard"
              className="text-xs font-bold text-emerald-400 hover:text-emerald-300 transition"
            >
              Barchasi →
            </Link>
          </div>

          <div className="space-y-2 pt-1">
            {topList.map((item, idx) => {
              const isCurrentUser = item.username === p.username;
              const itemFullName = `${item.first_name || item.username} ${item.last_name || ''}`.trim();

              return (
                <div
                  key={idx}
                  className={cn(
                    'flex items-center justify-between p-3 rounded-2xl transition-colors border',
                    isCurrentUser
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'border-slate-800/60 bg-slate-950/40 hover:bg-slate-800/40'
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span
                      className={cn(
                        'flex size-6 shrink-0 items-center justify-center rounded-xl text-xs font-black',
                        idx === 0
                          ? 'bg-amber-400 text-slate-950 shadow-[0_0_10px_rgba(251,191,36,0.5)]'
                          : idx === 1
                          ? 'bg-slate-300 text-slate-950'
                          : idx === 2
                          ? 'bg-amber-700/80 text-white'
                          : 'bg-slate-800 text-slate-400'
                      )}
                    >
                      {idx + 1}
                    </span>
                    <Avatar className="size-8 border border-slate-700/60 shrink-0">
                      <AvatarImage src={item.avatar_url} />
                      <AvatarFallback className="text-[10px] font-bold bg-slate-800 text-slate-300">
                        {item.username.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs sm:text-sm font-bold text-white truncate">
                      {isCurrentUser ? `${itemFullName} (Siz)` : itemFullName}
                    </span>
                  </div>

                  <span className="font-mono text-xs font-black text-emerald-400 shrink-0 pl-2">
                    {item.xp.toLocaleString('uz-UZ')} XP
                  </span>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Right: Quest Bonus & Community Presence */}
        <div className="lg:col-span-5 space-y-5 flex flex-col justify-between">
          {/* Bonus Quest Box */}
          <Card className="rounded-3xl border border-slate-800/80 bg-gradient-to-br from-indigo-950/30 via-slate-900/60 to-purple-950/30 p-5 sm:p-6 backdrop-blur-xl border-t border-white/10 shadow-xl space-y-3">
            <div className="flex items-center gap-3.5">
              <div className="size-14 shrink-0 rounded-2xl overflow-hidden shadow-lg border border-white/20 ring-2 ring-purple-500/20">
                <img src="/images/gift-box.jpg" alt="Gift" className="size-full object-cover" />
              </div>
              <div className="min-w-0 space-y-1">
                <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-[9px] font-bold px-2 py-0.2">
                  KUNLIK BONUS KVEST
                </Badge>
                <p className="text-xs sm:text-sm font-black text-white leading-snug">
                  Yana 2 ta test yeching va 200 tanga oling! 🎁
                </p>
                <p className="text-[11px] text-slate-400 font-mono">Progress: 3 / 5 test</p>
              </div>
            </div>

            <div className="space-y-1 pt-1">
              <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-indigo-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                  style={{ width: '60%' }}
                />
              </div>
            </div>
          </Card>

          {/* Online Presence Component */}
          <div className="rounded-3xl border border-slate-800/80 bg-slate-900/40 p-4 backdrop-blur-md">
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
      {/* ============================================================ */}
      {showNotifications && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowNotifications(false)}
          />
          <div className="fixed right-4 sm:right-8 top-20 w-[calc(100vw-2rem)] max-w-sm sm:w-96 rounded-3xl border border-slate-800 bg-slate-950/95 backdrop-blur-2xl shadow-2xl z-50 overflow-hidden border-t border-white/10 animate-in fade-in-50 zoom-in-95">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-800 bg-slate-900/50">
              <div className="flex items-center gap-2">
                <Bell className="size-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Bildirishnomalar</h3>
                {unreadCount > 0 && (
                  <Badge className="text-[10px] px-1.5 py-0 h-4 bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40">
                    {unreadCount} yangi
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="text-[11px] text-emerald-400 hover:underline font-medium flex items-center gap-1 px-1.5 py-1 rounded"
                    title="Barchasini o'qilgan deb belgilash"
                  >
                    <CheckCheck className="size-3.5" />
                    <span>Barchasi o&apos;qildi</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowNotifications(false)}
                  className="size-7 flex items-center justify-center rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white"
                  aria-label="Yopish"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-800/60">
              {loadingNotifs && notifications.length === 0 ? (
                <div className="p-6 space-y-3">
                  <Skeleton className="h-14 w-full rounded-2xl bg-slate-900" />
                  <Skeleton className="h-14 w-full rounded-2xl bg-slate-900" />
                  <Skeleton className="h-14 w-full rounded-2xl bg-slate-900" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <div className="inline-flex size-12 items-center justify-center rounded-2xl bg-slate-900 text-slate-400 mx-auto">
                    <Bell className="size-6 opacity-40" />
                  </div>
                  <p className="text-sm font-bold text-white">Yangi bildirishnoma yo&apos;q</p>
                  <p className="text-xs text-slate-400 max-w-[240px] mx-auto">
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
                      n.is_read ? 'hover:bg-slate-900/40' : 'bg-emerald-500/5 hover:bg-emerald-500/10'
                    )}
                  >
                    <div className="shrink-0 pt-0.5">
                      {getNotifIcon(n.type, n.title)}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className={cn('text-xs font-bold truncate', n.is_read ? 'text-white' : 'text-emerald-300')}>
                          {n.title}
                        </p>
                        {!n.is_read && (
                          <span className="size-2 rounded-full bg-emerald-400 shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
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
            <div className="p-3 border-t border-slate-800 bg-slate-900/40 text-center">
              <Link
                href="/community"
                onClick={() => setShowNotifications(false)}
                className="text-xs font-semibold text-emerald-400 hover:underline inline-flex items-center gap-1"
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
