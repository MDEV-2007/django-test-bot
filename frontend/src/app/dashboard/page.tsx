'use client';

import { useEffect, useMemo, useState } from 'react';
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
  Flame,
  Zap,
  Target,
  BookOpen,
  CircleCheck,
  Circle,
  TrendingUp,
  Activity,
  CalendarDays,
  Clock,
  Brain,
  History,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/lib/auth-store';
import { useApiQuery } from '@/lib/api-cache';
import { apiFetch } from '@/lib/api-client';
import Celebration from '@/components/student/Celebration';
import DailyChestModal, { DailyChestStatus } from '@/components/student/DailyChestModal';
import ModernAppLayout from '@/components/layout/ModernAppLayout';
import PremiumIcon from '@/components/ui/premium-icon';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Panel,
  PanelLabel,
  PanelLink,
  HeroBanner,
  HeroStat,
  HeroButton,
  Pill,
  IconTile,
  Bar,
  Ring,
  StatCell,
  EmptyNote,
  greeting,
  relativeTime,
  formatMinutes,
} from '@/components/design/kit';
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
  suggested_topic: { id: number; title: string; description: string } | null;
  selected_subject: { id: number; name: string } | null;
  upcoming_mocks?: { id: number; title: string; subject: string; scheduled_at: string; duration_minutes: number; is_live: boolean }[];
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
const MONTHS_SHORT = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn', 'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];

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
    <div className="min-h-screen bg-[var(--bg-page)] p-4 sm:p-8">
      <div className="mx-auto max-w-[1180px] space-y-5">
        <Skeleton className="h-60 w-full rounded-[20px] bg-muted" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-2xl bg-muted" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Skeleton className="h-56 md:col-span-2 rounded-2xl bg-muted" />
          <Skeleton className="h-56 rounded-2xl bg-muted" />
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

  const handleOpenNotifications = () => {
    const nextState = !showNotifications;
    setShowNotifications(nextState);
    if (nextState) loadNotifications();
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
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      console.error('Failed to mark notification as read', err);
    }
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
  const doneMissions = data.missions.filter((m) => m.is_completed).length;
  const remainingMissions = data.missions.length - doneMissions;
  const xpRemaining = Math.max(0, (p.next_level_xp || p.level * 1000) - p.xp);
  const lastAttempt = data.recent_attempts[0] || null;
  const isNewUser = data.recent_attempts.length === 0;
  const subjects = (data.subject_mastery || []).slice(0, 5);
  const upcoming = data.upcoming_mocks || [];
  const activity = notifications.slice(0, 4);
  const rank = lbData?.my_rank;

  const heroLine = isNewUser
    ? "Birinchi testingizni yeching — darajangiz, zaif mavzularingiz va ilk seriyangiz shu yerda paydo bo'ladi."
    : remainingMissions > 0
      ? `Siz ${p.streak} kunlik seriyadasiz. Bugun yana ${remainingMissions} ta vazifani bajarib, seriyani saqlang.`
      : `Siz ${p.streak} kunlik seriyadasiz. Bugungi barcha vazifalar bajarildi — ajoyib!`;

  const recommendations: { href?: string; onClick?: () => void; icon: typeof Brain; tone: 'brand' | 'gold' | 'dark'; title: string; meta: string; tag: string }[] = [];
  if (data.weak_review) {
    recommendations.push({
      onClick: handleStartMistakesTest,
      icon: Brain,
      tone: 'brand',
      title: `Takrorlash: ${data.weak_review.topic_title}`,
      meta: `${data.weak_review.times_wrong} marta xato · ${data.weak_review.days_ago} kun oldin`,
      tag: 'Tavsiya',
    });
  }
  if (data.suggested_topic) {
    recommendations.push({
      href: '/study',
      icon: BookOpen,
      tone: 'gold',
      title: data.suggested_topic.title,
      meta: data.selected_subject?.name || "O'qish",
      tag: 'Keyingi dars',
    });
  }
  recommendations.push({
    href: '/battles',
    icon: Trophy,
    tone: 'dark',
    title: 'Arenada raqib bilan bellashish',
    meta: `1v1 · ELO ${p.elo_rating}`,
    tag: 'Bellashuv',
  });

  return (
    <ModernAppLayout user={{ ...p, freeze_count: data.freeze_count }} unreadCount={unreadCount} onNotificationsClick={handleOpenNotifications}>
      <Celebration level={p.level || 1} streak={p.streak || 0} completedAttempts={data.recent_attempts.length} />

      <div className="mx-auto w-full max-w-[1180px] space-y-5">
        {/* ── HERO ─────────────────────────────────────────────────── */}
        <HeroBanner>
          <div className="relative grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Pill tone="glass" className="text-white">
                  <span className="size-1.5 rounded-full bg-[var(--reward)]" /> {p.level}-daraja
                </Pill>
                {rank ? <Pill tone="glass">Reytingda #{rank.toLocaleString('uz-UZ')}</Pill> : null}
                {p.is_premium && <Pill tone="glass">Premium</Pill>}
              </div>
              <h1 className="mt-3 text-[28px] sm:text-4xl font-extrabold tracking-tight leading-tight">
                {greeting()}, <span className="text-[var(--reward)]">{firstName}</span>
              </h1>
              <p className="mt-2 max-w-xl text-sm text-white/70 leading-relaxed">{heroLine}</p>
              <div className="mt-5 flex flex-wrap gap-2.5">
                {isNewUser ? (
                  <HeroButton href="/onboarding?mode=blitz" icon={Zap}>Ekspress testni boshlash</HeroButton>
                ) : (
                  <HeroButton href="/tests" icon={Zap}>Test yechish</HeroButton>
                )}
                <HeroButton href="/study" icon={BookOpen} variant="ghost">O&apos;qishni davom ettirish</HeroButton>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-2 lg:w-[300px]">
              <HeroStat
                icon={Flame}
                value={p.streak}
                label="Kunlik seriya"
                hint={`${data.freeze_count} ta muzlatish`}
                iconClass="text-[#F4A261]"
              />
              <HeroStat
                icon={Zap}
                value={p.xp.toLocaleString('uz-UZ')}
                label="Jami XP"
                hint={`${data.solved_today} ta savol bugun`}
                iconClass="text-[#74C69D]"
              />
              <HeroStat
                icon={Target}
                value={stats ? `${stats.accuracy}%` : '—'}
                label="Aniqlik"
                hint={stats ? `${stats.total_tests} ta test` : undefined}
                iconClass="text-[#74C69D]"
              />
              <HeroStat
                icon={Trophy}
                value={rank ? `#${rank.toLocaleString('uz-UZ')}` : '—'}
                label="Reyting o'rni"
                hint={`ELO ${p.elo_rating}`}
              />
            </div>
          </div>
        </HeroBanner>

        {/* ── ROW 2: Experience · Missions · Subjects ─────────────── */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          <Panel>
            <PanelLabel icon={Sparkles} right={data.solved_today > 0 ? <Pill tone="brand">{data.solved_today} savol bugun</Pill> : null}>
              Tajriba
            </PanelLabel>
            <div className="flex items-center gap-4">
              <Ring value={data.xp_progress}>
                <span className="text-base font-extrabold text-foreground tabular-nums">{data.xp_progress}%</span>
                <span className="text-[9px] text-muted-foreground">{p.level + 1}-darajagacha</span>
              </Ring>
              <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground">Joriy daraja</p>
                <p className="text-base font-bold text-foreground">{p.level}-daraja</p>
                <p className="mt-1 text-[11px] text-muted-foreground">Keyingisi: {p.level + 1}-daraja</p>
                <p className="text-xs font-semibold text-[var(--brand-text)]">{xpRemaining.toLocaleString('uz-UZ')} XP qoldi</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-4 gap-2">
              <StatCell value={stats?.total_tests ?? '—'} label="Testlar" />
              <StatCell value={stats ? `${stats.avg_score}%` : '—'} label="O'rtacha" />
              <StatCell value={p.coins.toLocaleString('uz-UZ')} label="Tanga" />
              <StatCell value={p.elo_rating} label="ELO" />
            </div>
          </Panel>

          <Panel>
            <PanelLabel icon={Target} right={<span className="text-xs font-semibold tabular-nums text-muted-foreground">{doneMissions}/{data.missions.length}</span>}>
              Kunlik vazifalar
            </PanelLabel>
            <Bar value={data.missions.length ? (doneMissions / data.missions.length) * 100 : 0} className="mb-3 h-1" />
            {data.missions.length === 0 ? (
              <EmptyNote>Bugungi vazifalar hali tayyorlanmagan.</EmptyNote>
            ) : (
              <div className="space-y-2">
                {data.missions.slice(0, 4).map((m) => (
                  <div
                    key={m.title}
                    className={cn(
                      'ds-row',
                      m.is_completed && 'border-[var(--brand-border)] bg-[var(--brand-soft)]'
                    )}
                  >
                    {m.is_completed ? (
                      <CircleCheck className="size-[18px] shrink-0 text-[var(--brand)]" />
                    ) : (
                      <Circle className="size-[18px] shrink-0 text-muted-foreground/50" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className={cn('text-xs font-semibold truncate', m.is_completed ? 'text-muted-foreground line-through' : 'text-foreground')}>
                        {m.title}
                      </p>
                      {!m.is_completed && m.target_count > 1 && (
                        <p className="text-[10px] text-muted-foreground tabular-nums">
                          {m.current_count}/{m.target_count}
                        </p>
                      )}
                    </div>
                    <Pill tone={m.is_completed ? 'brand' : 'gold'}>+{m.xp_reward} XP</Pill>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel className="md:col-span-2 xl:col-span-1">
            <PanelLabel icon={TrendingUp} right={<PanelLink href="/analytics">Batafsil</PanelLink>}>
              Fanlar bo&apos;yicha natija
            </PanelLabel>
            {subjects.every((s) => s.answered === 0) ? (
              <EmptyNote action={<PanelLink href="/tests">Test yechish →</PanelLink>}>
                Test yechganingizdan keyin har bir fan bo&apos;yicha o&apos;zlashtirish shu yerda ko&apos;rinadi.
              </EmptyNote>
            ) : (
              <div className="space-y-3.5">
                {subjects.map((s) => (
                  <div key={s.id} className="grid grid-cols-[minmax(0,110px)_1fr_auto] items-center gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{s.name}</p>
                      <p className="text-[10px] text-muted-foreground">{s.answered} ta javob</p>
                    </div>
                    <Bar value={s.mastery} tone={s.mastery < 50 ? 'danger' : s.mastery < 75 ? 'gold' : 'brand'} />
                    <span className="text-xs font-bold tabular-nums text-foreground w-9 text-right">{s.mastery}%</span>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>

        {/* ── ROW 3: Weekly focus · Upcoming tests ─────────────────── */}
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <Panel className="xl:col-span-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="ds-label inline-flex items-center gap-1.5">
                  <Activity className="size-3.5" /> O&apos;quv faolligi
                </span>
                <p className="mt-1 text-sm font-bold text-foreground">Shu haftadagi fokus vaqti</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-extrabold tracking-tight text-[var(--brand-text)] tabular-nums">
                  {formatMinutes(week.total)}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {week.delta >= 0 ? '+' : '−'}
                  {formatMinutes(Math.abs(week.delta))} o&apos;tgan haftaga nisbatan
                </p>
              </div>
            </div>

            <div className="relative mt-5 flex h-36 items-end gap-2 sm:gap-4">
              {week.total === 0 && (
                <p className="absolute inset-x-0 top-1/3 text-center text-xs text-muted-foreground">
                  Bu hafta hali test yechilmadi — birinchi sessiyangizni boshlang.
                </p>
              )}
              {(week.days.length ? week.days : WEEKDAYS_UZ.map((label) => ({ label, minutes: 0, tests: 0, isPeak: false }))).map((d, i) => {
                const h = week.peak > 0 ? Math.max(4, (d.minutes / week.peak) * 100) : 4;
                return (
                  <div key={i} className="flex flex-1 flex-col items-center gap-2 h-full justify-end group">
                    <div className="relative w-full flex-1 flex items-end">
                      <div
                        className={cn(
                          'w-full rounded-md transition-[height] duration-700',
                          d.minutes === 0 ? 'bg-[var(--ds-track)]' : d.isPeak ? 'bg-[var(--reward)]' : 'bg-[var(--brand)]'
                        )}
                        style={{ height: `${h}%` }}
                        title={`${formatMinutes(d.minutes)} · ${d.tests} ta test`}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground">{d.label}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex items-center gap-4 border-t border-[var(--ds-panel-border)] pt-3 text-[10px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-sm bg-[var(--brand)]" /> O&apos;qish sessiyalari</span>
              <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-sm bg-[var(--reward)]" /> Eng faol kun</span>
            </div>
          </Panel>

          <Panel>
            <PanelLabel icon={CalendarDays} right={<PanelLink href="/tests">Testlar</PanelLink>}>
              Kelayotgan testlar
            </PanelLabel>
            {upcoming.length === 0 ? (
              <EmptyNote action={<PanelLink href="/tests">Mock test tanlash →</PanelLink>}>
                Yaqin kunlarda rejalashtirilgan imtihon yo&apos;q.
              </EmptyNote>
            ) : (
              <div className="space-y-2">
                {upcoming.map((m, i) => {
                  const d = new Date(m.scheduled_at);
                  const soon = m.is_live || d.getTime() - Date.now() < 86400_000;
                  const tone = i === 0 ? 'bg-[var(--danger-soft)] text-[var(--danger-text)]' : i === 1 ? 'bg-[var(--reward-soft)] text-[var(--reward-text)]' : 'bg-[var(--brand-soft)] text-[var(--brand-text)]';
                  return (
                    <Link key={m.id} href={`/tests/mock/${m.id}`} className="ds-row">
                      <span className={cn('flex size-10 shrink-0 flex-col items-center justify-center rounded-lg leading-none', tone)}>
                        <span className="text-sm font-bold">{d.getDate()}</span>
                        <span className="text-[9px] font-semibold">{MONTHS_SHORT[d.getMonth()]}</span>
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-foreground truncate">{m.title}</p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {[m.subject, d.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                      {m.is_live ? (
                        <Pill tone="danger" dot>Jonli</Pill>
                      ) : soon ? (
                        <AlertCircle className="size-4 shrink-0 text-[var(--danger)]" />
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            )}
          </Panel>
        </div>

        {/* ── ROW 4: Recommended next · Recent activity ────────────── */}
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <Panel className="xl:col-span-2">
            <PanelLabel icon={Sparkles}>Keyingi qadam</PanelLabel>
            <div className="space-y-2">
              {recommendations.map((r) => {
                const inner = (
                  <>
                    <IconTile icon={r.icon} tone={r.tone} />
                    <div className="min-w-0 flex-1 text-left">
                      <p className="text-[13px] font-semibold text-foreground truncate">{r.title}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{r.meta}</p>
                    </div>
                    <Pill className="hidden sm:inline-flex">{r.tag}</Pill>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                  </>
                );
                return r.href ? (
                  <Link key={r.title} href={r.href} className="ds-row">{inner}</Link>
                ) : (
                  <button key={r.title} type="button" onClick={r.onClick} disabled={startingMistakesTest} className="ds-row w-full cursor-pointer disabled:opacity-60">
                    {inner}
                  </button>
                );
              })}
            </div>
            {lastAttempt && (
              <div className="mt-4 flex items-center justify-between gap-3 border-t border-[var(--ds-panel-border)] pt-3">
                <div className="min-w-0 flex items-center gap-2 text-xs text-muted-foreground">
                  <History className="size-3.5 shrink-0" />
                  <span className="truncate">
                    Oxirgi test: <span className="font-semibold text-foreground">{lastAttempt.test_title}</span>
                    {lastAttempt.score != null && ` · ${Math.round(lastAttempt.score)}%`}
                  </span>
                </div>
                <Link href={`/tests/${lastAttempt.id}/feedback`} className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-[var(--brand-text)]">
                  Tahlil <ArrowRight className="size-3.5" />
                </Link>
              </div>
            )}
          </Panel>

          <Panel>
            <PanelLabel icon={Clock} right={<button type="button" onClick={handleOpenNotifications} className="text-xs font-semibold text-muted-foreground hover:text-[var(--brand-text)] cursor-pointer">Hammasi</button>}>
              So&apos;nggi faollik
            </PanelLabel>
            {activity.length === 0 ? (
              <EmptyNote>{loadingNotifs ? 'Yuklanmoqda…' : "Hozircha faollik yo'q."}</EmptyNote>
            ) : (
              <ul className="space-y-3.5">
                {activity.map((n) => (
                  <li key={n.id} className="flex items-start gap-3">
                    <span className="shrink-0">{getNotifIcon(n.type, n.title)}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-foreground leading-snug line-clamp-2">
                        <span className="font-semibold">{n.title}</span>
                        {n.message ? <span className="text-muted-foreground"> — {n.message}</span> : null}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{notifTime(n.created_at)}</p>
                    </div>
                    {!n.is_read && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-[var(--brand)]" />}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
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
