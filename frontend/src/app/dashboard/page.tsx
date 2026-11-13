'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Trophy,
  Sparkles,
  Bell,
  Heart,
  MessageCircle,
  Swords,
  BookOpen,
  Brain,
  GraduationCap,
  Users,
  Flame,
  ArrowUpRight,
} from 'lucide-react';
import BuddyStreakModal from '@/components/gamification/BuddyStreakModal';
import { toast } from 'sonner';
import { useAuthStore } from '@/lib/auth-store';
import { useApiQuery } from '@/lib/api-cache';
import { apiFetch } from '@/lib/api-client';
import Celebration from '@/components/student/Celebration';
import DailyChestModal, { DailyChestStatus } from '@/components/student/DailyChestModal';
import ModernAppLayout from '@/components/layout/ModernAppLayout';
import MagneticLoopCard from '@/components/dashboard/MagneticLoopCard';
import NotificationsPanel from '@/components/NotificationsPanel';
import PremiumIcon from '@/components/ui/premium-icon';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { greeting, relativeTime } from '@/components/design/kit';
import { cn } from '@/lib/utils';
import {
  InView,
  PastelHero,
  StatBento,
  GrowthCard,
  MissionsCard,
  WeeklyFocus,
  UpcomingCard,
  SubjectsSection,
  NextSteps,
  ActivityCard,
  ChestFinale,
  type Recommendation,
} from '@/components/dashboard/pastel/PastelSections';

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
    estimated_dtm_score?: number;
    target_university?: string;
    target_faculty?: string;
    stability_multiplier?: number;
  };
  xp_progress: number;
  freeze_count: number;
  solved_today: number;
  weak_review: { topic_title: string; times_wrong: number; days_ago: number } | null;
  subject_mastery?: { id: number; name: string; color: string; mastery: number; answered: number }[];
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
  suggested_topic: { id: number; title: string; description: string; reason?: string; subject_name?: string; priority?: string } | null;
  selected_subject: { id: number; name: string } | null;
  upcoming_mocks?: {
    id: number;
    title: string;
    subject?: string;
    subject_name?: string;
    scheduled_at: string | null;
    duration_minutes: number;
    question_count?: number;
    participants_count?: number;
    is_premium?: boolean;
    price?: number;
    prize_description?: string;
    is_unlocked?: boolean;
    registration_id?: string | null;
    registration_status?: string;
    lifecycle_state?: string;
    is_live?: boolean;
  }[];
  unread_notifications_count?: number;
  daily_chest?: DailyChestStatus;
};

type AnalyticsData = {
  accuracy: number;
  total_tests: number;
  avg_score: number;
  time_minutes: number;
  daily: { date: string; iso?: string; weekday?: number; count: number; avg: number; minutes?: number }[];
};

type LeaderboardData = { my_rank: number };


const WEEKDAYS_UZ = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'];

function getNotifIcon(type: string, title: string) {
  const t = (type || '').toLowerCase();
  const lowerTitle = (title || '').toLowerCase();
  if (lowerTitle.includes('reaksiya') || lowerTitle.includes('like') || lowerTitle.includes('yurak')) {
    return <PremiumIcon icon={Heart} tone="rose" size="sm" solid />;
  }
  if (lowerTitle.includes('izoh') || lowerTitle.includes('fikr') || lowerTitle.includes('comment')) {
    return <PremiumIcon icon={MessageCircle} tone="sky" size="sm" solid />;
  }
  if (t === 'battle') return <PremiumIcon icon={Swords} tone="purple" size="sm" solid />;
  if (t === 'achievement') return <PremiumIcon icon={Trophy} tone="gold" size="sm" solid />;
  if (t === 'mission') return <PremiumIcon icon={Sparkles} tone="emerald" size="sm" solid />;
  return <PremiumIcon icon={Bell} tone="sky" size="sm" solid />;
}

/* Backend sends notification dates as "dd.mm.yyyy HH:MM"; turn that into a relative label. */
function notifTime(raw: string) {
  const m = raw.match(/^(\d{2})\.(\d{2})\.(\d{4}) (\d{2}):(\d{2})$/);
  if (!m) return raw;
  return relativeTime(new Date(+m[3], +m[2] - 1, +m[1], +m[4], +m[5]).toISOString());
}

function DashboardSkeleton() {
  return (
    <div className="theme-pastel min-h-screen p-4 sm:p-8 lg:pl-72">
      <div className="mx-auto max-w-[1180px] space-y-5">
        <div className="grid items-center gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <Skeleton className="h-7 w-40 rounded-full bg-white/40" />
            <Skeleton className="h-28 w-4/5 rounded-3xl bg-white/40" />
            <Skeleton className="h-12 w-64 rounded-full bg-white/40" />
          </div>
          <Skeleton className="mx-auto aspect-square w-full max-w-[380px] rounded-full bg-white/40" />
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-12">
          <Skeleton className="col-span-2 h-48 rounded-[28px] bg-white/40 lg:col-span-4" />
          <Skeleton className="h-48 rounded-[28px] bg-white/40 lg:col-span-3" />
          <Skeleton className="h-48 rounded-[28px] bg-white/40 lg:col-span-3" />
          <Skeleton className="col-span-2 h-48 rounded-[28px] bg-white/40 lg:col-span-2" />
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { access, authReady } = useAuthStore();

  const { data, error } = useApiQuery<DashboardData>('/api/dashboard/home/');
  const { data: stats } = useApiQuery<AnalyticsData>(access ? '/api/analytics/' : null);
  const { data: lbData } = useApiQuery<LeaderboardData>(access ? '/api/leaderboard/' : null);

  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loadingNotifs, setLoadingNotifs] = useState(false);

  const [chestModalOpen, setChestModalOpen] = useState(false);
  const [buddyModalOpen, setBuddyModalOpen] = useState(false);
  const [buddyJoinCode, setBuddyJoinCode] = useState<string | undefined>();

  // Do'stning taklif havolasi (t.me/<bot>?startapp=buddy_<KOD>) AuthProvider orqali
  // /dashboard?buddy=<KOD> ga keladi — modalni kod yozilgan holda ochamiz.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('buddy')?.trim();
    if (!code) return;
    setBuddyJoinCode(code);
    setBuddyModalOpen(true);
    params.delete('buddy');
    const rest = params.toString();
    window.history.replaceState(null, '', window.location.pathname + (rest ? `?${rest}` : ''));
  }, []);
  const [chestStatus, setChestStatus] = useState<DailyChestStatus | null>(null);
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

  useEffect(() => {
    if (data?.daily_chest) setChestStatus(data.daily_chest);
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('open_chest') === '1') setChestModalOpen(true);
      if (params.get('notifications') === '1') setShowNotifications(true);
    }
  }, [data]);

  useEffect(() => {
    if (data && typeof data.unread_notifications_count === 'number') {
      setUnreadCount(data.unread_notifications_count);
    }
    if (data?.profile) {
      const current = useAuthStore.getState().user;
      if (current) useAuthStore.getState().setUser({ ...current, ...data.profile });
    }
  }, [data]);

  // Notifications double as the "Recent activity" feed, so load them once up front.
  useEffect(() => {
    if (access) loadNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [access]);

  const closeNotifications = useCallback(() => setShowNotifications(false), []);

  const handleOpenNotifications = () => {
    setShowNotifications((v) => !v);
  };

  useEffect(() => {
    if (authReady && !access) router.push('/login');
  }, [authReady, access, router]);

  // Weekly focus: last 7 days of real per-day minutes (falls back to test counts × 0 if the
  // backend has not been redeployed yet and `minutes` is missing).
  const week = useMemo(() => {
    const daily = stats?.daily || [];
    const last7 = daily.slice(-7);
    const prev7 = daily.slice(-14, -7);
    const minutesOf = (d: AnalyticsData['daily'][number]) => d.minutes ?? 0;
    const total = last7.reduce((s, d) => s + minutesOf(d), 0);
    const prevTotal = prev7.reduce((s, d) => s + minutesOf(d), 0);
    const peak = Math.max(0, ...last7.map(minutesOf));
    return {
      days: last7.map((d) => ({
        label: typeof d.weekday === 'number' ? WEEKDAYS_UZ[d.weekday] : d.date,
        minutes: minutesOf(d),
        tests: d.count,
        isPeak: peak > 0 && minutesOf(d) === peak,
      })),
      total,
      delta: total - prevTotal,
      peak,
    };
  }, [stats]);

  if (error) {
    return (
      <div className="min-h-screen bg-[var(--bg-page)] p-6 flex items-center justify-center">
        <Card className="border-destructive/30 bg-destructive/10 p-6 text-destructive text-sm max-w-md rounded-2xl">
          {error}
        </Card>
      </div>
    );
  }

  if (!data) return <DashboardSkeleton />;

  const p = data.profile;
  const firstName = p.first_name || p.username;
  const missionsList = data.missions || [];
  const doneMissions = missionsList.filter((m) => m?.is_completed).length;
  const remainingMissions = missionsList.length - doneMissions;
  const xpRemaining = Math.max(0, (p.next_level_xp || p.level * 1000) - p.xp);
  const recentAttempts = data.recent_attempts || [];
  const lastAttempt = recentAttempts[0] || null;
  const isNewUser = recentAttempts.length === 0;
  const subjects = (data.subject_mastery || []).slice(0, 5);
  const upcoming = data.upcoming_mocks || [];
  const activity = notifications.slice(0, 4);
  const rank = lbData?.my_rank;

  const heroLine = isNewUser
    ? "Birinchi testingizni yeching — darajangiz, zaif mavzularingiz va ilk seriyangiz shu yerda paydo bo'ladi."
    : remainingMissions > 0
      ? `Siz ${p.streak} kunlik seriyadasiz. Bugun yana ${remainingMissions} ta vazifani bajarib, seriyani saqlang.`
      : `Siz ${p.streak} kunlik seriyadasiz. Bugungi barcha vazifalar bajarildi — ajoyib!`;

  const recommendations: Recommendation[] = [];
  if (data.weak_review) {
    recommendations.push({
      onClick: handleStartMistakesTest,
      icon: Brain,
      title: `Takrorlash: ${data.weak_review.topic_title}`,
      meta: `${data.weak_review.times_wrong} marta xato · ${data.weak_review.days_ago} kun oldin`,
      tag: 'Tavsiya',
    });
  }
  if (data.suggested_topic) {
    recommendations.push({
      href: '/study',
      icon: BookOpen,
      title: data.suggested_topic.title,
      meta: data.suggested_topic.reason || data.suggested_topic.subject_name || data.selected_subject?.name || "O'qish",
      tag: data.suggested_topic.priority === 'weakness' ? 'Mustahkamlash' : 'Keyingi dars',
    });
  }
  recommendations.push({
    href: '/battles',
    icon: Trophy,
    title: 'Arenada raqib bilan bellashish',
    meta: `1v1 · ELO ${p.elo_rating}`,
    tag: 'Bellashuv',
  });

  return (
    <ModernAppLayout
      variant="pastel"
      user={{ ...p, freeze_count: data.freeze_count }}
      unreadCount={unreadCount}
      onNotificationsClick={handleOpenNotifications}
    >
      <Celebration level={p.level || 1} streak={p.streak || 0} completedAttempts={data.recent_attempts.length} />

      <div className="mx-auto w-full max-w-[1180px] space-y-5 sm:space-y-6 overflow-x-clip">
        <PastelHero
          greeting={greeting()}
          firstName={firstName}
          level={p.level}
          rank={rank}
          isPremium={p.is_premium}
          heroLine={heroLine}
          isNewUser={isNewUser}
          streak={p.streak}
          solvedToday={data.solved_today}
          elo={p.elo_rating}
        />

        <InView>
          <MagneticLoopCard userName={firstName} userStreak={p.streak} />
        </InView>

        {/* Gamifikatsiya: Dinamik DTM & Do'stlik Zanjiri */}
        <InView>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Dinamik DTM Ball Indikatori */}
            <div className="ps-card relative overflow-hidden !rounded-[28px] p-5 sm:p-6 flex flex-col justify-between">
              <span aria-hidden className="absolute -right-8 -top-8 size-28 rounded-full bg-[var(--ps-purple)]/10" />
              <div>
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--ps-purple)]/15 px-3 py-1 text-xs font-bold text-[var(--ps-purple)]">
                    <GraduationCap className="size-3.5" />
                    Dinamik DTM Ball
                  </span>
                  <Link
                    href="/leaderboard"
                    className="text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center gap-1"
                  >
                    Mandat <ArrowUpRight className="size-3.5" />
                  </Link>
                </div>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="ps-num text-4xl sm:text-5xl font-black text-[var(--ps-orange)]">
                    {p.estimated_dtm_score || 94.5}
                  </span>
                  <span className="text-sm font-semibold text-[var(--text-muted)]">/ 189.0 ball</span>
                </div>
                <p className="mt-1 text-xs text-[var(--text-secondary)] font-semibold truncate">
                  Maqsad: {p.target_university || 'TATU'} — {p.target_faculty || 'Dasturiy injiniring'}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-[var(--ps-neutral)] flex items-center justify-between text-xs">
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  ⚡ Har bir test: +0.2 ball
                </span>
                <span className="rounded-full bg-black/5 dark:bg-white/5 px-2.5 py-0.5 font-bold">
                  {p.stability_multiplier || 1.0}x bonus koeffitsiyenti
                </span>
              </div>
            </div>

            {/* Do'stlik Zanjiri (Co-op Buddy Streak) */}
            <div className="ps-card relative overflow-hidden !rounded-[28px] p-5 sm:p-6 flex flex-col justify-between">
              <span aria-hidden className="absolute -right-8 -top-8 size-28 rounded-full bg-amber-500/15" />
              <div>
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-bold text-amber-600 dark:text-amber-400">
                    <Users className="size-3.5" />
                    Do&apos;stlik Zanjiri
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-orange-500">
                    <Flame className="size-3.5 fill-orange-500" /> Co-op
                  </span>
                </div>
                <h3 className="mt-3 text-lg sm:text-xl font-black">
                  Birga o&apos;qing, olovni so&apos;ndirmang!
                </h3>
                <p className="mt-1 text-xs text-[var(--text-muted)] leading-relaxed">
                  Do&apos;stingiz bilan umumiy streak bog&apos;lang. Ikkalangiz ham test ishlasangiz 1.5x tanga bonusi beriladi.
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-[var(--ps-neutral)]">
                <button
                  type="button"
                  onClick={() => setBuddyModalOpen(true)}
                  className="ps-btn ps-btn-ink !min-h-10 !w-full justify-center !text-xs !font-bold cursor-pointer"
                >
                  <Users className="size-3.5 mr-1.5" /> Do&apos;stlik Zanjirini ochish
                </button>
              </div>
            </div>
          </div>
        </InView>

        <StatBento
          streak={p.streak}
          freezeCount={data.freeze_count}
          xp={p.xp}
          coins={p.coins}
          accuracy={stats?.accuracy}
          totalTests={stats?.total_tests}
          avgScore={stats?.avg_score}
          rank={rank}
        />

        <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-12">
          <InView className="lg:col-span-5">
            <GrowthCard level={p.level} xpProgress={data.xp_progress} xpRemaining={xpRemaining} />
          </InView>
          <InView className="lg:col-span-7" delay={0.08}>
            <MissionsCard missions={data.missions} />
          </InView>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-12">
          <InView className="lg:col-span-7 xl:col-span-8">
            <WeeklyFocus
              days={week.days.length ? week.days : WEEKDAYS_UZ.map((label) => ({ label, minutes: 0, tests: 0, isPeak: false }))}
              total={week.total}
              delta={week.delta}
              peak={week.peak}
            />
          </InView>
          <InView className="lg:col-span-5 xl:col-span-4" delay={0.08}>
            <UpcomingCard mocks={upcoming} />
          </InView>
        </div>

        <InView>
          <SubjectsSection subjects={subjects} />
        </InView>

        <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-12 lg:items-start">
          <InView className="lg:col-span-7 xl:col-span-8">
            <NextSteps items={recommendations} busy={startingMistakesTest} lastAttempt={lastAttempt} />
          </InView>
          <InView className="lg:col-span-5 xl:col-span-4 lg:mt-[76px]" delay={0.08}>
            <ActivityCard
              items={activity}
              loading={loadingNotifs}
              onOpenAll={handleOpenNotifications}
              renderIcon={getNotifIcon}
              timeLabel={notifTime}
            />
          </InView>
        </div>

        <InView>
          <ChestFinale
            canClaim={!!chestStatus?.can_claim}
            claimedToday={!!chestStatus?.today_claim}
            onOpenChest={() => setChestModalOpen(true)}
          />
        </InView>
      </div>

      {/* Bildirishnomalar paneli (header bilan umumiy komponent) */}
      <NotificationsPanel
        open={showNotifications}
        onClose={closeNotifications}
        onUnreadChange={setUnreadCount}
        onChanged={loadNotifications}
      />

      {/* Daily Mystery Chest Modal */}
      <DailyChestModal
        isOpen={chestModalOpen}
        onClose={() => setChestModalOpen(false)}
        initialStatus={chestStatus}
        onClaimSuccess={() => {
          setChestStatus((prev) => (prev ? { ...prev, can_claim: false } : null));
        }}
      />

      {/* Do'stlik Zanjiri (Buddy Streak) Modali */}
      <BuddyStreakModal
        open={buddyModalOpen}
        onOpenChange={setBuddyModalOpen}
        initialJoinCode={buddyJoinCode}
      />
    </ModernAppLayout>
  );
}
