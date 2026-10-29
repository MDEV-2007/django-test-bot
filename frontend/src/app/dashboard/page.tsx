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
  Zap,
  Target,
  ArrowRight,
  Gift,
  Flame,
  Coins,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/lib/auth-store';
import { useApiQuery } from '@/lib/api-cache';
import { apiFetch } from '@/lib/api-client';
import { getRankInfo } from '@/lib/rank';
import PresenceRow from '@/components/student/PresenceRow';
import Celebration from '@/components/student/Celebration';
import DailyChestModal, { DailyChestStatus } from '@/components/student/DailyChestModal';
import ModernAppLayout from '@/components/layout/ModernAppLayout';
import { useTheme } from '@/hooks/useTheme';
import {
  HeroFocusBanner,
  DailyGoalCard,
  BattleArenaCard,
  LiveActivityTicker,
} from '@/components/dashboard/ModernHeroDashboard';
import AiMarathonBanner from '@/components/dashboard/AiMarathonBanner';
import ModernTestCenter from '@/components/dashboard/ModernTestCenter';
import PomodoroTimerCard from '@/components/dashboard/PomodoroTimerCard';
import PremiumIcon from '@/components/ui/premium-icon';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  daily_chest?: DailyChestStatus;
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
  podium?: LeaderboardRow[];
  rankings?: LeaderboardRow[];
  top?: LeaderboardRow[];
  my_group: (LeaderboardRow & { rank: number; is_me: boolean })[];
  my_rank: number;
};

function getNotifIcon(type: string, title: string) {
  const t = (type || '').toLowerCase();
  const lowerTitle = (title || '').toLowerCase();
  if (lowerTitle.includes('reaksiya') || lowerTitle.includes('like') || lowerTitle.includes('yurak')) {
    return <PremiumIcon icon={Heart} tone="rose" size="sm" solid />;
  }
  if (lowerTitle.includes('izoh') || lowerTitle.includes('fikr') || lowerTitle.includes('comment')) {
    return <PremiumIcon icon={MessageCircle} tone="sky" size="sm" solid />;
  }
  if (t === 'battle') {
    return <PremiumIcon icon={Swords} tone="purple" size="sm" solid />;
  }
  if (t === 'achievement') {
    return <PremiumIcon icon={Trophy} tone="gold" size="sm" solid />;
  }
  if (t === 'mission') {
    return <PremiumIcon icon={Sparkles} tone="emerald" size="sm" solid />;
  }
  return <PremiumIcon icon={Bell} tone="sky" size="sm" solid />;
}

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-[var(--bg-page)] p-4 sm:p-8 space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-[24px] bg-muted" />
        ))}
      </div>
      <Skeleton className="h-64 w-full rounded-[28px] bg-muted" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Skeleton className="h-44 w-full rounded-[28px] bg-muted" />
        <Skeleton className="h-44 w-full rounded-[28px] bg-muted" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { access, authReady } = useAuthStore();
  const { isDark } = useTheme();

  const [activeMode, setActiveMode] = useState<'study' | 'arena'>('study');
  const { data, error, refresh: refreshDashboard } = useApiQuery<DashboardData>('/api/dashboard/home/');
  const { data: lbData } = useApiQuery<LeaderboardData>(activeMode === 'arena' ? '/api/leaderboard/' : null);

  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loadingNotifs, setLoadingNotifs] = useState(false);

  const [chestModalOpen, setChestModalOpen] = useState(false);
  const [chestStatus, setChestStatus] = useState<DailyChestStatus | null>(null);

  type MistakesSummaryData = {
    total_mistakes: number;
    subject_counts: { name: string; count: number }[];
    recent_mistakes: { id: number; body: string; subject_name: string; difficulty: number; explanation: string }[];
  };

  const { data: mistakesSummary, refresh: refreshMistakes } = useApiQuery<MistakesSummaryData>(
    access ? '/api/tests/mistakes-summary/' : null
  );
  const [startingMistakesTest, setStartingMistakesTest] = useState(false);

  const handleStartMistakesTest = async () => {
    if (startingMistakesTest) return;
    setStartingMistakesTest(true);
    try {
      const res = await apiFetch<{ attempt_id?: number; error?: string }>('/api/tests/start-mistakes/', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      if (res && res.attempt_id) {
        toast.success('Xatolar ustida ishlash testi boshlandi!');
        refreshMistakes();
        router.push(`/tests/${res.attempt_id}`);
      } else if (res?.error) {
        toast.info(res.error);
      }
    } catch (err: any) {
      toast.error(err?.message || "Xatolar ustida ishlash testini boshlab bo'lmadi");
    } finally {
      setStartingMistakesTest(false);
    }
  };

  useEffect(() => {
    if (data?.daily_chest) {
      setChestStatus(data.daily_chest);
    }
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('open_chest') === '1') {
        setChestModalOpen(true);
      }
    }
  }, [data]);

  useEffect(() => {
    if (data && typeof data.unread_notifications_count === 'number') {
      setUnreadCount(data.unread_notifications_count);
    }
    if (data?.profile) {
      const current = useAuthStore.getState().user;
      if (current) {
        useAuthStore.getState().setUser({ ...current, ...data.profile });
      }
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
        <Card className="border-destructive/30 bg-destructive/10 p-6 text-destructive text-sm max-w-md rounded-[28px] ios-glass shadow-sm">
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
    : data.suggested_topic?.title || `${activeSubject} — Asosiy mavzulashtirilgan test`;

  const targetGoals = 3;
  const currentGoals = Math.min(targetGoals, data.solved_today || (doneMissions > 0 ? doneMissions : 1));

  const weekDays = [
    p.streak >= 1,
    p.streak >= 2,
    p.streak >= 3,
    p.streak >= 4,
    p.streak >= 5,
    p.streak >= 6,
    p.streak >= 7,
  ];

  const combinedLb = [
    ...(lbData?.podium || []),
    ...(lbData?.rankings || []),
    ...(lbData?.top || []),
  ];
  const topList =
    combinedLb.length > 0
      ? combinedLb.slice(0, 8)
      : [
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
    >
      <Celebration
        level={p.level || 1}
        streak={p.streak || 0}
        completedAttempts={data.recent_attempts.length}
      />

      {/* ============================================================ */}
      {/* 1. iOS SEGMENTED CONTROL + LIVE ACTIVITY ONLINE PEERS PILL   */}
      {/* ============================================================ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Authentic iOS UISegmentedControl */}
        <div className="ios-segmented inline-flex items-center self-start">
          <button
            type="button"
            onClick={() => setActiveMode('study')}
            className={cn(
              'flex items-center gap-2 px-4 sm:px-5 py-1.5 text-xs sm:text-[13px] font-semibold transition-all cursor-pointer select-none',
              activeMode === 'study'
                ? 'ios-segmented-thumb font-bold'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <PremiumIcon icon={BookOpen} tone="sky" size="2xs" />
            <span>O&apos;quv Markazi</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveMode('arena')}
            className={cn(
              'flex items-center gap-2 px-4 sm:px-5 py-1.5 text-xs sm:text-[13px] font-semibold transition-all cursor-pointer select-none',
              activeMode === 'arena'
                ? 'ios-segmented-thumb font-bold'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <PremiumIcon icon={Swords} tone="amber" size="2xs" />
            <span>Arena &amp; Reyting</span>
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#FF9500] opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-[#FF9500]" />
            </span>
          </button>
        </div>

        {/* iOS Dynamic Island Style Online Users Pill */}
        <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-card border border-border shadow-2xs self-start sm:self-auto">
          <span className="relative flex size-2 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#34C759] opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-[#34C759]" />
          </span>
          {data.online_peers && data.online_peers.length > 0 && (
            <div className="flex -space-x-2">
              {data.online_peers.slice(0, 5).map((peer, i) => (
                <Avatar key={i} className="size-6 ring-2 ring-card shrink-0">
                  <AvatarImage src={peer.avatar_url || ''} />
                  <AvatarFallback className="bg-primary/12 text-primary text-[9px] font-bold">
                    {peer.name?.slice(0, 2).toUpperCase() || '??'}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
          )}
          <span className="text-xs font-semibold text-foreground">
            <strong className="text-[#34C759] font-extrabold font-mono">{data.online_count || 0}</strong>
            <span className="text-muted-foreground font-medium"> ta onlayn</span>
          </span>
        </div>
      </div>

      {/* JONLI FAOLIYAT MIKRO-TIKERI (Multiplayer Live Ribbon) */}
      <LiveActivityTicker />

      {/* ============================================================ */}
      {/* 2. iOS 18 HOME SCREEN GLANCEABLE WIDGETS ROW                 */}
      {/* ============================================================ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="ios-card rounded-[24px] p-4 flex items-center gap-3">
          <PremiumIcon icon={CheckCircle2} tone="emerald" size="md" solid />
          <div className="min-w-0">
            <span className="text-[11px] font-semibold text-muted-foreground block truncate">
              Bugun yechildi
            </span>
            <p className="text-base sm:text-lg font-extrabold font-mono text-foreground leading-tight">
              {data.solved_today || 0} <span className="text-xs font-normal text-muted-foreground">test</span>
            </p>
          </div>
        </div>

        <div className="ios-card rounded-[24px] p-4 flex items-center gap-3">
          <PremiumIcon icon={Flame} tone="amber" size="md" solid />
          <div className="min-w-0">
            <span className="text-[11px] font-semibold text-muted-foreground block truncate">
              Uzluksiz Streak
            </span>
            <p className="text-base sm:text-lg font-extrabold font-mono text-foreground leading-tight">
              {p.streak || 0} <span className="text-xs font-normal text-muted-foreground">kun 🔥</span>
            </p>
          </div>
        </div>

        <Link href="/shop" className="ios-card ios-card-interactive rounded-[24px] p-4 flex items-center gap-3">
          <PremiumIcon icon={Coins} tone="gold" size="md" solid />
          <div className="min-w-0">
            <span className="text-[11px] font-semibold text-muted-foreground block truncate">
              Tanga balansi
            </span>
            <p className="text-base sm:text-lg font-extrabold font-mono text-foreground leading-tight">
              {(p.coins || 0).toLocaleString()}
            </p>
          </div>
        </Link>

        <button
          type="button"
          onClick={() => setActiveMode('arena')}
          className="ios-card ios-card-interactive rounded-[24px] p-4 flex items-center gap-3 text-left cursor-pointer"
        >
          <PremiumIcon icon={Swords} tone="indigo" size="md" solid />
          <div className="min-w-0">
            <span className="text-[11px] font-semibold text-muted-foreground block truncate">
              {rankInfo.title}
            </span>
            <p className="text-base sm:text-lg font-extrabold font-mono text-primary leading-tight">
              {p.elo_rating || 1200} <span className="text-[11px] font-normal text-muted-foreground">ELO</span>
            </p>
          </div>
        </button>
      </div>

      {/* ============================================================ */}
      {/* 3. iPadOS SPLIT VIEW: MAIN COLUMN (8) + SMART STACK (4)      */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 space-y-6">
          {activeMode === 'study' ? (
            <>
              {/* ACTIVATION HOOK (0 attempts) */}
              {data.recent_attempts.length === 0 && (
                <div className="relative overflow-hidden rounded-[28px] border border-primary/25 bg-card p-5 sm:p-7 shadow-card">
                  <div className="pointer-events-none absolute -right-12 -top-12 size-48 rounded-full bg-primary/10 blur-2xl" />
                  <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-2 max-w-xl">
                      <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/12 px-3 py-0.5 text-xs font-bold text-primary">
                        <Sparkles className="size-3.5 text-[#FF9500]" /> Boshlang&apos;ich Qadam · +50 Tanga Bonus
                      </div>
                      <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
                        🎯 3 daqiqalik ekspress sinov — Darajangizni aniqlang!
                      </h2>
                      <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                        Bor-yo&apos;g&apos;i 5 ta qiziqarli savol. Testni yakunlashingiz bilan haqiqiy darajangiz (A+, B+, C),
                        zaif mavzular tahlili va <strong className="text-foreground">+50 Tanga hamda ilk olovingiz (Streak 🔥)</strong> faollashadi!
                      </p>
                    </div>
                    <Link
                      href="/tests"
                      className="ios-spring inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-xs sm:text-sm font-semibold text-primary-foreground shadow-[0_6px_18px_rgba(0,122,255,0.32)] shrink-0"
                    >
                      <Play className="size-4 fill-current" /> Hozir boshlash
                    </Link>
                  </div>
                </div>
              )}

              {/* 1. BUGUNGI AI MARAFON (3 BOSQICHLI AVTOPILOT ZANJIRI) */}
              {(() => {
                const step1Done = (data?.recent_attempts && data.recent_attempts.length > 0) || false;
                const mistakesCount = mistakesSummary?.total_mistakes ?? 0;
                const step2Done = mistakesSummary ? mistakesSummary.total_mistakes === 0 : false;
                const step3Done = (currentGoals >= 2) || ((p as any)?.recent_battles && (p as any).recent_battles.length > 0) || false;
                const completedSteps = (step1Done ? 1 : 0) + (step2Done ? 1 : 0) + (step3Done ? 1 : 0);

                const lastScore = lastAttempt?.score ?? 65;
                const scaledScore = Number(((lastScore / 100) * 70).toFixed(1));
                let predictedGrade = 'B';
                let nextGrade = 'B+';
                let gapToNext = 1.6;
                if (scaledScore >= 65) {
                  predictedGrade = 'A+'; nextGrade = 'A+'; gapToNext = 0;
                } else if (scaledScore >= 60) {
                  predictedGrade = 'A'; nextGrade = 'A+'; gapToNext = Number((65.0 - scaledScore).toFixed(1));
                } else if (scaledScore >= 55) {
                  predictedGrade = 'B+'; nextGrade = 'A'; gapToNext = Number((60.0 - scaledScore).toFixed(1));
                } else if (scaledScore >= 50) {
                  predictedGrade = 'B'; nextGrade = 'B+'; gapToNext = Number((55.0 - scaledScore).toFixed(1));
                } else if (scaledScore >= 46) {
                  predictedGrade = 'C+'; nextGrade = 'B'; gapToNext = Number((50.0 - scaledScore).toFixed(1));
                } else if (scaledScore >= 42) {
                  predictedGrade = 'C'; nextGrade = 'C+'; gapToNext = Number((46.0 - scaledScore).toFixed(1));
                } else {
                  predictedGrade = '—'; nextGrade = 'C'; gapToNext = Number((42.0 - scaledScore).toFixed(1));
                }

                return (
                  <AiMarathonBanner
                    userName={firstName}
                    userLevel={p.level}
                    userStreak={p.streak}
                    dtmScore={178.4}
                    maxDtmScore={189.0}
                    predictedGrade={`${predictedGrade} (${scaledScore} ball)`}
                    unresolvedMistakesCount={mistakesCount}
                    step1Done={step1Done}
                    step2Done={step2Done}
                    step3Done={step3Done}
                    chestStatus={chestStatus}
                    onClaimSuccess={() => {
                      if (refreshDashboard) refreshDashboard();
                    }}
                  />
                );
              })()}

              {/* 2. POMODORO TIMER CARD */}
              <PomodoroTimerCard />

              {/* 3. CURATED TESTS */}
              <ModernTestCenter
                activeSubject={activeSubject}
                weakReviewTopic={data.weak_review?.topic_title || null}
                theme={isDark ? 'dark' : 'light'}
              />

              {/* 4. SMART MISTAKES NOTEBOOK WIDGET (Apple Health Diagnostic Style) */}
              <div className="ios-card relative overflow-hidden rounded-[28px] p-5 sm:p-6">
                <div className="pointer-events-none absolute -right-12 -top-12 size-40 rounded-full bg-[#FF3B30]/10 blur-2xl" />

                <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <PremiumIcon icon={Target} tone="rose" size="lg" solid />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm sm:text-base font-extrabold text-foreground tracking-tight">
                          Aqlli Xatolar Daftari
                        </h3>
                        <span className="px-2.5 py-0.5 rounded-full bg-[#FF3B30]/12 text-[#D70015] dark:text-[#FF6961] text-[10px] font-bold uppercase tracking-wider">
                          AI Tahlil &amp; Mashq
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-snug max-w-xl">
                        Avvalgi testlarda yo&apos;l qo&apos;ygan xatolaringiz sun&apos;iy intellekt tomonidan saralandi. Qayta ishlab, bilimingizni mustahkamlang!
                      </p>
                    </div>
                  </div>

                  <Button
                    onClick={handleStartMistakesTest}
                    disabled={startingMistakesTest || mistakesSummary?.total_mistakes === 0}
                    className="ios-spring shrink-0 bg-[#FF3B30] hover:bg-[#D70015] text-white font-semibold text-xs sm:text-sm px-5 py-2.5 rounded-full shadow-[0_6px_18px_rgba(255,59,48,0.28)] flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {startingMistakesTest ? (
                      <span>Yuklanmoqda...</span>
                    ) : (
                      <>
                        <span>Xatolar ustida ishlash</span>
                        <ArrowRight className="size-4" />
                      </>
                    )}
                  </Button>
                </div>

                {/* Mistakes breakdown pills */}
                <div className="mt-4 pt-3.5 border-t border-border flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FF3B30]/10 text-xs font-bold text-[#D70015] dark:text-[#FF6961]">
                    <span className="size-2 rounded-full bg-[#FF3B30]" />
                    <span>Jami xatolar: {mistakesSummary?.total_mistakes ?? 0} ta</span>
                  </div>
                  {mistakesSummary?.subject_counts && mistakesSummary.subject_counts.length > 0 ? (
                    mistakesSummary.subject_counts.map((sc) => (
                      <div
                        key={sc.name}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted text-xs font-semibold text-foreground"
                      >
                        <span>{sc.name}:</span>
                        <span className="font-mono font-bold text-[#FF3B30]">{sc.count}</span>
                      </div>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {!mistakesSummary
                        ? 'Xatolar tahlili yuklanmoqda...'
                        : mistakesSummary.total_mistakes === 0
                        ? "Hozircha xato javoblaringiz yo'q, ajoyib natija! 🎯"
                        : 'Xatolar tahlili tayyorlanmoqda...'}
                    </span>
                  )}
                </div>
              </div>

              {/* 5. iOS CONTROL CENTER QUICK STUDY MODULES */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    O&apos;quv Qurollari · Control Center
                  </h3>
                  <span className="text-xs font-medium text-muted-foreground">Fokus va xotira mashqlari</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <Link
                    href="/study"
                    className="ios-card ios-card-interactive group rounded-[24px] p-4 flex flex-col justify-between"
                  >
                    <PremiumIcon icon={Clock} tone="sky" size="md" solid className="mb-3 group-hover:scale-105" />
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                        Fokus Xonasi
                      </h4>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                        Pomodoro &amp; Ambient tovushlar
                      </p>
                    </div>
                  </Link>

                  <Link
                    href="/flashcards"
                    className="ios-card ios-card-interactive group rounded-[24px] p-4 flex flex-col justify-between"
                  >
                    <PremiumIcon icon={Layers} tone="purple" size="md" solid className="mb-3 group-hover:scale-105" />
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-foreground group-hover:text-[#AF52DE] transition-colors">
                        Flashcards
                      </h4>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                        Interval takrorlash &amp; lug&apos;at
                      </p>
                    </div>
                  </Link>

                  <Link
                    href="/reels"
                    className="ios-card ios-card-interactive group rounded-[24px] p-4 flex flex-col justify-between"
                  >
                    <PremiumIcon icon={Play} tone="rose" size="md" solid className="mb-3 group-hover:scale-105" />
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-foreground group-hover:text-[#FF2D55] transition-colors">
                        Bilim Reels
                      </h4>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                        15-sekundlik tezkor savollar
                      </p>
                    </div>
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
                theme={isDark ? 'dark' : 'light'}
              />

              {/* iOS 18 GAME CENTER WEEKLY LEADERBOARD & PODIUM */}
              <div className="ios-card relative overflow-hidden rounded-[28px] space-y-5 p-4 sm:p-6">
                <div className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-[#FF9500]/10 blur-3xl" />

                {/* Header */}
                <div className="relative flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <PremiumIcon icon={Trophy} tone="amber" size="md" solid />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm sm:text-base font-extrabold text-foreground tracking-tight">
                          Haftalik Liga &amp; Podest
                        </h3>
                        {lbData?.my_rank ? (
                          <span className="rounded-full bg-[#FF9500]/15 px-2.5 py-0.5 font-mono text-[10px] font-bold text-[#C93400] dark:text-[#FF9F0A]">
                            O&apos;rningiz #{lbData.my_rank}
                          </span>
                        ) : null}
                      </div>
                      <p className="text-[11px] font-medium text-muted-foreground truncate">
                        Oltin Liga yetakchilari va jonli musobaqa jadvali
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href="/feed"
                      className="ios-spring flex items-center gap-1.5 text-xs font-semibold text-[#34C759] bg-[#34C759]/12 hover:bg-[#34C759]/18 px-3 py-1.5 rounded-full"
                    >
                      <PremiumIcon icon={Sparkles} tone="emerald" size="2xs" />
                      <span>Hamjamiyat</span>
                    </Link>
                    <Link
                      href="/leaderboard"
                      className="ios-spring flex items-center gap-1 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/15 px-3.5 py-1.5 rounded-full"
                    >
                      <span>Barchasi</span>
                      <ArrowRight className="size-3.5" />
                    </Link>
                  </div>
                </div>

                {/* iOS 18 Top 3 Podium (Clean internal badges, no clipped top pills) */}
                <div className="relative grid grid-cols-3 gap-2 sm:gap-3.5 items-stretch">
                  {/* 2nd Place */}
                  {topList[1] && (
                    <div className="flex flex-col items-center justify-between rounded-[22px] border border-border bg-muted/45 p-3 sm:p-4 text-center">
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#8E8E93]/18 px-2.5 py-0.5 text-[9.5px] font-extrabold text-foreground/80">
                        🥈 #2 KUMUSH
                      </span>
                      <Avatar className="size-11 sm:size-13 ring-2 ring-[#8E8E93]/60 my-2.5 shadow-xs">
                        <AvatarImage src={topList[1].avatar_url} />
                        <AvatarFallback className="text-xs font-extrabold bg-card text-foreground">
                          {(topList[1].first_name || topList[1].username).slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="w-full min-w-0">
                        <span className="block text-xs font-bold text-foreground truncate">
                          {topList[1].first_name || topList[1].username}
                        </span>
                        <span className="mt-1 inline-block rounded-full bg-card px-2 py-0.5 text-[10px] font-mono font-bold text-muted-foreground border border-border">
                          {topList[1].xp.toLocaleString('uz-UZ')} XP
                        </span>
                      </div>
                    </div>
                  )}

                  {/* 1st Place */}
                  {topList[0] && (
                    <div className="flex flex-col items-center justify-between rounded-[24px] border-2 border-[#FF9500]/75 bg-gradient-to-b from-[#FF9500]/12 via-card to-card p-3 sm:p-4 text-center shadow-[0_10px_28px_-8px_rgba(255,149,0,0.28)]">
                      <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[#FF9500] to-[#FFCC00] px-2.5 py-0.5 text-[9.5px] font-black text-slate-950 shadow-2xs">
                        👑 #1 CHEMPION
                      </span>
                      <Avatar className="size-13 sm:size-15 ring-2 ring-[#FF9500] my-2.5 shadow-md">
                        <AvatarImage src={topList[0].avatar_url} />
                        <AvatarFallback className="text-sm font-black bg-[#FF9500] text-white">
                          {(topList[0].first_name || topList[0].username).slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="w-full min-w-0">
                        <span className="block text-xs sm:text-[13px] font-extrabold text-foreground truncate">
                          {topList[0].first_name || topList[0].username}
                        </span>
                        <span className="mt-1 inline-block rounded-full bg-[#FF9500]/15 px-2.5 py-0.5 text-[10.5px] font-mono font-black text-[#C93400] dark:text-[#FF9F0A]">
                          {topList[0].xp.toLocaleString('uz-UZ')} XP
                        </span>
                      </div>
                    </div>
                  )}

                  {/* 3rd Place */}
                  {topList[2] && (
                    <div className="flex flex-col items-center justify-between rounded-[22px] border border-border bg-muted/45 p-3 sm:p-4 text-center">
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#C93400]/15 px-2.5 py-0.5 text-[9.5px] font-extrabold text-[#C93400] dark:text-[#FF9F0A]">
                        🥉 #3 BRONZA
                      </span>
                      <Avatar className="size-11 sm:size-13 ring-2 ring-[#C93400]/60 my-2.5 shadow-xs">
                        <AvatarImage src={topList[2].avatar_url} />
                        <AvatarFallback className="text-xs font-extrabold bg-card text-foreground">
                          {(topList[2].first_name || topList[2].username).slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="w-full min-w-0">
                        <span className="block text-xs font-bold text-foreground truncate">
                          {topList[2].first_name || topList[2].username}
                        </span>
                        <span className="mt-1 inline-block rounded-full bg-card px-2 py-0.5 text-[10px] font-mono font-bold text-[#C93400] dark:text-[#FF9F0A] border border-border">
                          {topList[2].xp.toLocaleString('uz-UZ')} XP
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* iOS Inset Grouped Leaderboard Rows */}
                <div className="divide-y divide-border rounded-[22px] border border-border bg-muted/25 overflow-hidden">
                  {(topList.length > 3 ? topList.slice(3, 8) : topList).map((item, i) => {
                    const rankNum = topList.length > 3 ? i + 4 : i + 1;
                    const isCurrentUser = item.username === p.username;
                    const itemFullName = `${item.first_name || item.username} ${item.last_name || ''}`.trim();

                    return (
                      <div
                        key={item.profile_id || i}
                        className={cn(
                          'flex items-center justify-between px-4 py-3 transition-colors',
                          isCurrentUser ? 'bg-primary/10' : 'hover:bg-muted/50'
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <span
                            className={cn(
                              'flex size-6.5 items-center justify-center rounded-[8px] font-mono text-[11px] font-bold shrink-0',
                              isCurrentUser
                                ? 'bg-primary text-white'
                                : 'bg-card border border-border text-muted-foreground'
                            )}
                          >
                            #{rankNum}
                          </span>
                          <Avatar className="size-8 shrink-0 border border-border">
                            <AvatarImage src={item.avatar_url} />
                            <AvatarFallback className="text-[10px] font-bold bg-card text-foreground">
                              {(item.first_name || item.username).slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <span
                              className={cn(
                                'block text-xs font-semibold truncate',
                                isCurrentUser ? 'text-primary font-bold' : 'text-foreground'
                              )}
                            >
                              {isCurrentUser ? `${itemFullName} (Siz)` : itemFullName}
                            </span>
                            <span className="font-mono text-[10px] text-muted-foreground">
                              Level {item.level || 1}
                            </span>
                          </div>
                        </div>
                        <span className="font-mono text-xs font-extrabold text-primary shrink-0 pl-2">
                          {item.xp.toLocaleString('uz-UZ')} XP
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Reward Strip */}
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-[18px] bg-[#FF9500]/12 border border-[#FF9500]/20 px-4 py-3 text-xs">
                  <span className="flex items-center gap-2 text-foreground font-medium">
                    <Zap className="size-3.5 text-[#FF9500] fill-[#FF9500]" />
                    Duel g&apos;alabasi: <strong className="text-[#C93400] dark:text-[#FF9F0A] font-bold">+50 XP</strong> va{' '}
                    <strong className="text-[#C93400] dark:text-[#FF9F0A] font-bold">+25 tanga</strong>
                  </span>
                  <span className="font-bold text-[#C93400] dark:text-[#FF9F0A] bg-[#FF9500]/15 px-2.5 py-0.5 rounded-full text-[10px]">
                    🏆 Oltin Liga
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ========================================================== */}
        {/* COMPANION SMART STACK SIDEBAR (lg:col-span-4)              */}
        {/* ========================================================== */}
        <div className="lg:col-span-4 space-y-5 lg:sticky lg:top-20">
          {/* 1. DAILY GOAL & STREAK WIDGET */}
          <DailyGoalCard
            user={{ streak: p.streak }}
            dailyGoals={{
              current: currentGoals,
              target: targetGoals,
              streakDays: weekDays,
            }}
            theme={isDark ? 'dark' : 'light'}
          />

          {/* 2. KUNDALIK SIRLI SANDIQ (Apple Arcade Style Reward Card - Marafon Zanjiriga Bog'langan) */}
          {(() => {
            const step1Done = (data?.recent_attempts && data.recent_attempts.length > 0) || false;
            const step2Done = mistakesSummary ? mistakesSummary.total_mistakes === 0 : false;
            const step3Done = (currentGoals >= 2) || ((p as any)?.recent_battles && (p as any).recent_battles.length > 0) || false;
            const completedSteps = (step1Done ? 1 : 0) + (step2Done ? 1 : 0) + (step3Done ? 1 : 0);
            const isMarathonComplete = completedSteps >= 3;
            const isClaimable = chestStatus?.can_claim !== false;

            return (
              <div
                onClick={() => setChestModalOpen(true)}
                className={cn(
                  'ios-card ios-card-interactive group relative overflow-hidden rounded-[26px] p-5 cursor-pointer select-none transition-all duration-300',
                  (isMarathonComplete && isClaimable)
                    ? 'border-amber-500/60 bg-gradient-to-br from-amber-500/20 via-card to-emerald-500/15 shadow-lg shadow-amber-500/25 ring-2 ring-amber-500/30'
                    : 'border-border/80'
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <PremiumIcon icon={Gift} tone="amber" size="lg" solid className={cn((isMarathonComplete && isClaimable) && 'animate-bounce')} />
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={cn(
                            'rounded-full text-[9px] font-bold px-2.5 py-0.5 uppercase tracking-wider',
                            (isMarathonComplete && isClaimable)
                              ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300 font-extrabold animate-pulse'
                              : !isClaimable
                              ? 'bg-muted text-muted-foreground'
                              : 'bg-primary/15 text-primary font-bold'
                          )}
                        >
                          {!isClaimable
                            ? '✅ Bugun ochildi'
                            : isMarathonComplete
                            ? '🎁 3/3 TAYYOR — Ochish!'
                            : `🔒 Marafon: ${completedSteps}/3 bajarildi`}
                        </span>
                        {chestStatus?.streak_bonus_pct ? (
                          <span className="text-[10px] font-bold text-amber-500">
                            +{chestStatus.streak_bonus_pct}% bonus
                          </span>
                        ) : null}
                      </div>
                      <h4 className="text-xs sm:text-sm font-bold text-foreground leading-snug truncate">
                        Kundalik Sirli Sandiq
                      </h4>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {!isClaimable
                          ? 'Ertaga yangi kutilmagan mukofot kutmoqda'
                          : isMarathonComplete
                          ? '500 XP gacha, tangalar yoki Freeze!'
                          : `Ochish uchun bugungi marafonni tugating (${completedSteps}/3)`}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0">
                    <span
                      className={cn(
                        'inline-flex items-center justify-center rounded-full px-3.5 py-1.5 text-xs font-bold transition-all',
                        (isMarathonComplete && isClaimable)
                          ? 'bg-gradient-to-r from-amber-500 to-emerald-500 text-white shadow-[0_4px_14px_rgba(255,149,0,0.4)] animate-pulse'
                          : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {!isClaimable ? 'Yopiq' : isMarathonComplete ? 'Ochish' : `${completedSteps}/3`}
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* 3. BONUS QUEST BOX */}
          <Card className="rounded-[26px] border border-border bg-card p-5 shadow-card space-y-3">
            <div className="flex items-center gap-3.5">
              <div className="size-12 shrink-0 rounded-[14px] overflow-hidden shadow-2xs border border-border">
                <img src="/images/gift-box.jpg" alt="Gift" className="size-full object-cover" />
              </div>
              <div className="min-w-0 space-y-0.5">
                <span className="inline-block rounded-full bg-[#FF9500]/14 text-[#C93400] dark:text-[#FF9F0A] text-[9px] font-bold px-2.5 py-0.5">
                  KUNLIK BONUS KVEST
                </span>
                <p className="text-xs sm:text-sm font-bold text-foreground leading-snug">
                  Yana 2 ta test yeching va 200 tanga oling! 🎁
                </p>
                <p className="text-[10px] text-muted-foreground font-mono font-semibold">Progress: 3 / 5 test</p>
              </div>
            </div>

            <div className="pt-1">
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full"
                  style={{ width: '60%' }}
                />
              </div>
            </div>
          </Card>

          {/* 4. MINI LEADERBOARD (iOS Inset Grouped List) */}
          {activeMode === 'study' && (
            <Card className="rounded-[26px] border border-border bg-card p-5 shadow-card space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <PremiumIcon icon={Trophy} tone="amber" size="xs" solid />
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Haftalik Reyting
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveMode('arena')}
                  className="text-xs font-semibold text-primary hover:underline transition cursor-pointer"
                >
                  To&apos;liq →
                </button>
              </div>

              <div className="divide-y divide-border rounded-[18px] bg-muted/40 border border-border overflow-hidden">
                {topList.slice(0, 3).map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between px-3.5 py-2.5 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-[10px] font-mono font-bold text-muted-foreground w-4">
                        #{idx + 1}
                      </span>
                      <Avatar className="size-6 border border-border shrink-0">
                        <AvatarImage src={item.avatar_url} />
                        <AvatarFallback className="text-[9px] font-bold bg-card text-muted-foreground">
                          {item.username.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-semibold text-foreground truncate max-w-[120px]">
                        {item.first_name || item.username}
                      </span>
                    </div>
                    <span className="font-mono text-[11px] font-bold text-primary">
                      {item.xp.toLocaleString('uz-UZ')} XP
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* 5. ONLINE COMMUNITY PRESENCE */}
          <div className="rounded-[26px] border border-border bg-card p-4 shadow-card">
            <PresenceRow
              count={data.online_count}
              peers={data.online_peers ?? []}
              solvedToday={data.solved_today ?? 0}
            />
          </div>
        </div>
      </div>

      {/* iOS NOTIFICATION CENTER SHEET POPOVER */}
      {showNotifications && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/35 backdrop-blur-xs"
            onClick={() => setShowNotifications(false)}
          />
          <div className="fixed right-4 sm:right-8 top-18 w-[calc(100vw-2rem)] max-w-sm sm:w-96 rounded-[28px] border border-border bg-card/90 ios-glass-heavy shadow-2xl z-50 overflow-hidden animate-scaleIn text-card-foreground">
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-border">
              <div className="flex items-center gap-2">
                <PremiumIcon icon={Bell} tone="sky" size="2xs" />
                <h3 className="text-sm font-bold text-foreground">Bildirishnomalar</h3>
                {unreadCount > 0 && (
                  <Badge className="text-[10px] px-2 py-0 h-4.5 rounded-full bg-primary/12 text-primary font-bold border-0">
                    {unreadCount} yangi
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="text-[11px] text-primary hover:underline font-semibold flex items-center gap-1 px-1.5 py-1 rounded cursor-pointer"
                    title="Barchasini o'qilgan deb belgilash"
                  >
                    <CheckCheck className="size-3.5" />
                    <span>O&apos;qildi</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowNotifications(false)}
                  className="size-7 flex items-center justify-center rounded-full bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                  aria-label="Yopish"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            </div>

            <div className="max-h-[380px] overflow-y-auto divide-y divide-border">
              {loadingNotifs && notifications.length === 0 ? (
                <div className="p-6 space-y-3">
                  <Skeleton className="h-14 w-full rounded-2xl bg-muted" />
                  <Skeleton className="h-14 w-full rounded-2xl bg-muted" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center space-y-2.5">
                  <PremiumIcon icon={Bell} tone="zinc" size="lg" className="mx-auto" />
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
                      'flex items-start gap-3 p-3.5 transition-colors cursor-pointer',
                      n.is_read ? 'hover:bg-muted/50' : 'bg-primary/6 hover:bg-primary/10'
                    )}
                  >
                    <div className="shrink-0 pt-0.5">
                      {getNotifIcon(n.type, n.title)}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className={cn('text-xs font-bold truncate', n.is_read ? 'text-foreground' : 'text-primary')}>
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
                        <p className="text-[10px] text-muted-foreground font-mono pt-0.5 opacity-80">
                          {n.created_at}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-3 border-t border-border bg-muted/40 text-center">
              <Link
                href="/feed"
                onClick={() => setShowNotifications(false)}
                className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
              >
                <span>Hamjamiyat muhokamalariga o&apos;tish</span>
                <ChevronRight className="size-3.5" />
              </Link>
            </div>
          </div>
        </>
      )}

      {/* Daily Mystery Chest Modal */}
      <DailyChestModal
        isOpen={chestModalOpen}
        onClose={() => setChestModalOpen(false)}
        initialStatus={chestStatus}
        onClaimSuccess={() => {
          setChestStatus((prev) => (prev ? { ...prev, can_claim: false } : null));
        }}
      />
    </ModernAppLayout>
  );
}
