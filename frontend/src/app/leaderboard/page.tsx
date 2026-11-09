'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Trophy,
  Crown,
  Zap,
  Users,
  Swords,
  ArrowUpRight,
  GraduationCap,
  Flame,
  TrendingUp,
  Clock,
  Building2,
  MapPin,
  Sparkles,
} from 'lucide-react';
import { useApiQuery } from '@/lib/api-cache';
import { useAuthStore } from '@/lib/auth-store';
import AppShell from '@/components/AppShell';
import Reveal from '@/components/motion/Reveal';
import StatNumber from '@/components/motion/StatNumber';
import CosmeticAvatar from '@/components/student/CosmeticAvatar';
import CosmeticBadge from '@/components/student/CosmeticBadge';
import VerifiedBadge from '@/components/ui/verified-badge';
import type { Cosmetics } from '@/lib/auth-store';
import { cn } from '@/lib/utils';

type Row = {
  profile_id: number;
  username: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  xp: number;
  level: number;
  cosmetics?: Cosmetics;
  role?: string;
  is_superadmin?: boolean;
  is_teacher?: boolean;
};

type GroupRow = Row & { rank: number; is_me: boolean };

type MicroLeagueRow = {
  rank: number;
  profile_id: number;
  username: string;
  name: string;
  avatar_url: string;
  xp: number;
  dtm_score: number;
  streak: number;
  zone: 'promotion' | 'demotion' | 'safe';
  is_me: boolean;
  has_gold_border: boolean;
};

type LeagueTier = {
  tier: string;
  level: number;
  name: string;
  subtitle: string;
  badge: string;
  min_xp: number;
  max_xp: number | null;
  has_gold_border: boolean;
};

type MicroLeagueData = {
  current_league: LeagueTier;
  next_league: LeagueTier | null;
  prev_league: LeagueTier | null;
  all_leagues: LeagueTier[];
  cohort_size: number;
  my_cohort_rank: number;
  promotion_cutoff_rank: number;
  demotion_start_rank: number | null;
  seconds_until_reset: number;
  reset_label: string;
  rows: MicroLeagueRow[];
};

type OtmCatalogItem = {
  code: string;
  name: string;
  faculty: string;
  grant_quota: number;
  contract_quota: number;
  grant_cutoff: number;
  contract_cutoff: number;
  base_applicants?: number;
};

type OtmSimulatorData = {
  selected_university: OtmCatalogItem;
  catalog: OtmCatalogItem[];
  my_dtm: number;
  max_dtm: number;
  simulated_rank: number;
  total_applicants: number;
  points_to_grant: number;
  points_to_contract: number;
  admission_probability_pct: number;
  status: 'grant' | 'contract' | 'below';
  status_label: string;
};

type RegionClan = {
  rank: number;
  region: string;
  total_xp: number;
  students_count: number;
  avg_dtm: number;
  is_my_region: boolean;
};

type SchoolClan = {
  rank: number;
  school: string;
  region: string;
  total_xp: number;
  students_count: number;
  avg_dtm: number;
  is_my_school: boolean;
};

type ClansData = {
  derby: {
    title: string;
    description: string;
    region1: { name: string; total_xp: number; students: number };
    region2: { name: string; total_xp: number; students: number };
    leader_name: string;
    xp_difference: number;
  };
  regions: RegionClan[];
  schools: SchoolClan[];
  my_region: string;
  my_school: string;
};

type RankingsData = {
  podium: Row[];
  rankings: Row[];
  my_rank: number;
  my_group: GroupRow[];
  subjects: { id: number; name: string; slug: string }[];
  selected_view: string;
  micro_league?: MicroLeagueData;
  otm_simulator?: OtmSimulatorData;
  clans?: ClansData;
};

type MainTab = 'republic' | 'micro_league' | 'otm_simulator' | 'clans';

export default function LeaderboardPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<MainTab>('republic');
  const [subjectView, setSubjectView] = useState('all');
  const [selectedOtmCode, setSelectedOtmCode] = useState<string>('TATU');

  const queryUrl = `/api/leaderboard/?subject=${subjectView}&otm=${selectedOtmCode}`;
  const { data } = useApiQuery<RankingsData>(queryUrl);

  const formatSeconds = (sec: number) => {
    const days = Math.floor(sec / 86400);
    const hours = Math.floor((sec % 86400) / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    if (days > 0) return `${days} kun ${hours} soat`;
    return `${hours} soat ${mins} daqiqa`;
  };

  const aheadOfMe = (() => {
    if (!data) return null;
    const meIdx = data.my_group.findIndex((r) => r.is_me);
    if (meIdx <= 0) return null;
    const above = data.my_group[meIdx - 1];
    const me = data.my_group[meIdx];
    const gap = Math.max(0, above.xp - me.xp);
    const who = above.first_name || above.username;
    return {
      text:
        gap > 0
          ? `${gap.toLocaleString('uz-UZ')} XP — ${who}dan oldinga o'tish uchun.`
          : `${who} bilan teng ballda turibsiz — bitta test sizni oldinga chiqaradi.`,
    };
  })();

  const name = (r: Row) => `${r.first_name || ''} ${r.last_name || ''}`.trim() || r.username;

  /* Shohsupa */
  const PODIUM = [
    { idx: 1, place: 2, label: 'Kumush', pedestal: 'h-28 sm:h-32', tone: 'bg-[var(--ps-purple)] text-white', ring: 'ring-[var(--ps-purple)]', order: 'order-2 sm:order-1' },
    { idx: 0, place: 1, label: 'Chempion', pedestal: 'h-36 sm:h-44', tone: 'bg-[var(--ps-orange)] text-[#080808]', ring: 'ring-[var(--ps-orange)]', order: 'order-1 sm:order-2' },
    { idx: 2, place: 3, label: 'Bronza', pedestal: 'h-24 sm:h-24', tone: 'bg-[var(--ps-coral)] text-white', ring: 'ring-[var(--ps-coral)]', order: 'order-3' },
  ];

  const renderRow = (r: Row, rank: number, isMe: boolean) => (
    <div
      key={r.profile_id}
      className={cn(
        'flex items-center justify-between gap-3 rounded-[22px] p-2.5 pr-4 transition-transform',
        isMe
          ? 'bg-[#080808] text-[#FFFCF7] dark:bg-[#FFFCF7] dark:text-[#080808]'
          : 'bg-[var(--ps-neutral)] hover:-translate-y-0.5'
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={cn(
            'inline-flex h-10 min-w-10 shrink-0 items-center justify-center rounded-full px-2 font-mono text-[13px] font-black',
            isMe ? 'bg-[var(--ps-orange)] text-[#080808]' : 'bg-[var(--ps-paper)] text-[var(--text-secondary)]'
          )}
        >
          #{rank}
        </span>
        <CosmeticAvatar
          className="size-10 shrink-0"
          src={r.avatar_url}
          name={name(r)}
          cosmetics={r.cosmetics}
          fallbackClassName="text-xs font-bold"
        />
        <div className="min-w-0">
          <p className="flex items-center gap-1 truncate text-[14px] font-bold">
            <span className="truncate">{name(r)}</span>
            <VerifiedBadge role={r.role} isSuperadmin={r.is_superadmin} isTeacher={r.is_teacher} size="xs" />
            <CosmeticBadge cosmetics={r.cosmetics} />
            {isMe && (
              <span className="ml-1 rounded-full bg-[var(--ps-orange)] px-2 py-0.5 text-[11px] font-bold text-[#080808]">Siz</span>
            )}
          </p>
          <span className={cn('text-[12px] font-semibold', isMe ? 'opacity-70' : 'text-[var(--text-muted)]')}>
            {r.cosmetics?.title?.payload?.title ?? `${r.level}-daraja`}
          </span>
        </div>
      </div>
      <span className="ps-num flex shrink-0 items-center gap-1 text-[18px] leading-none">
        <Zap className="size-4 text-[var(--ps-orange)]" />
        <StatNumber value={r.xp} />
        <span className="text-[0.6em] opacity-60">XP</span>
      </span>
    </div>
  );

  return (
    <div className="theme-pastel min-h-screen w-full">
      <AppShell />
      <main className="page-shell flex-1 p-4 pb-28 sm:p-6">
        <div className="mx-auto max-w-5xl space-y-6">

          {/* 1. Asosiy Bo'limlar Tab Boshqaruvi */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex flex-wrap items-center gap-1 rounded-full bg-[var(--ps-paper)] p-1.5 shadow-[var(--ds-panel-shadow)]">
              <button
                type="button"
                onClick={() => setActiveTab('republic')}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[12.5px] font-bold transition-all',
                  activeTab === 'republic'
                    ? 'bg-[#080808] text-[#FFFCF7] shadow-sm dark:bg-[#FFFCF7] dark:text-[#080808]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                )}
              >
                <Trophy className="size-4 text-[var(--ps-orange)]" />
                Respublika
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('micro_league')}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[12.5px] font-bold transition-all',
                  activeTab === 'micro_league'
                    ? 'bg-[#080808] text-[#FFFCF7] shadow-sm dark:bg-[#FFFCF7] dark:text-[#080808]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                )}
              >
                <Crown className="size-4 text-amber-400" />
                Haftalik Ligalar (30)
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('otm_simulator')}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[12.5px] font-bold transition-all',
                  activeTab === 'otm_simulator'
                    ? 'bg-[#080808] text-[#FFFCF7] shadow-sm dark:bg-[#FFFCF7] dark:text-[#080808]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                )}
              >
                <GraduationCap className="size-4 text-[var(--ps-purple)]" />
                OTM Mandat Simulyatori
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('clans')}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[12.5px] font-bold transition-all',
                  activeTab === 'clans'
                    ? 'bg-[#080808] text-[#FFFCF7] shadow-sm dark:bg-[#FFFCF7] dark:text-[#080808]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                )}
              >
                <Swords className="size-4 text-[var(--ps-coral)]" />
                Maktablar & Hududlar
              </button>
            </div>

            <Link href="/battles" className="ps-btn ps-btn-ink !min-h-11">
              <Swords className="size-4 text-[var(--ps-orange)]" />
              1v1 Duel Arena
              <span className="ps-btn-arrow"><ArrowUpRight className="size-4" /></span>
            </Link>
          </div>

          {/* TAB 1: RESPUBLIKA REYTINGI */}
          {activeTab === 'republic' && (
            <div className="space-y-6">
              {/* Hero */}
              <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
                <div className="ps-card relative overflow-hidden !rounded-[36px] p-6 sm:p-8">
                  <span aria-hidden className="pointer-events-none absolute -right-14 -top-14 size-48 rounded-full bg-[var(--ps-orange)] opacity-20" />
                  <span className="ps-chip relative">
                    <Crown className="size-3.5 text-[var(--ps-orange)]" /> Respublika reytingi
                  </span>
                  <h1 className="ps-display relative mt-5 text-[40px] sm:text-[56px]">
                    Liderlar{' '}
                    <span className="text-[var(--ps-purple)]">ligasi</span>
                    <span className="text-[var(--ps-coral)]">.</span>
                  </h1>
                  <p className="relative mt-4 max-w-md text-[14px] leading-relaxed text-[var(--text-secondary)]">
                    Eng ko&apos;p XP to&apos;plagan abituriyentlar shohsupasi — har bir to&apos;g&apos;ri javob sizni yuqoriga olib chiqadi.
                  </p>
                </div>

                <div className="relative flex flex-col justify-between overflow-hidden rounded-[36px] bg-[#080808] p-6 text-[#FFFCF7] sm:p-8 dark:bg-[#FFFCF7] dark:text-[#080808]">
                  <span aria-hidden className="absolute -right-10 -top-10 size-40 rounded-full bg-[var(--ps-purple)] opacity-50" />
                  <span aria-hidden className="absolute -bottom-8 -left-8 size-24 rounded-full bg-[var(--ps-orange)] opacity-80" />
                  <p className="ps-eyebrow relative opacity-60">Sizning o&apos;rningiz</p>
                  <p className="ps-num relative mt-3 text-[64px] leading-none sm:text-[80px]">
                    {data && data.my_rank > 0 ? <>#{data.my_rank}</> : '—'}
                  </p>
                  <p className="relative mt-4 text-[13px] font-semibold leading-relaxed opacity-80">
                    {!data
                      ? 'Yuklanmoqda…'
                      : aheadOfMe
                        ? aheadOfMe.text
                        : data.my_rank > 0
                          ? "Siz o'z guruhingizda peshqadamsiz!"
                          : "Test yechib, reytingga kiring."}
                  </p>
                </div>
              </section>

              {/* Fan filtri */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {[{ slug: 'all', name: 'Umumiy reyting' }, ...(data?.subjects ?? [])].map((s) => {
                  const active = subjectView === s.slug;
                  return (
                    <button
                      key={s.slug}
                      type="button"
                      onClick={() => setSubjectView(s.slug)}
                      className={cn(
                        'shrink-0 cursor-pointer rounded-full px-4 py-2 text-[13px] font-bold transition-all',
                        active
                          ? 'bg-[#080808] text-[#FFFCF7] shadow-md dark:bg-[#FFFCF7] dark:text-[#080808]'
                          : 'bg-[var(--ps-paper)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      )}
                    >
                      {s.name}
                    </button>
                  );
                })}
              </div>

              {/* Shohsupa Top 3 */}
              {data && data.podium.length > 0 && (
                <section className="ps-card relative overflow-hidden !rounded-[36px] p-6 pb-0 sm:p-8 sm:pb-0">
                  <div className="relative flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <p className="ps-eyebrow text-[var(--text-muted)]">Top 3</p>
                      <h2 className="ps-display mt-1 text-[28px] sm:text-[36px]">
                        Shoh<span className="text-[var(--ps-orange)]">supa</span>
                      </h2>
                    </div>
                  </div>

                  <div className="relative mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3 sm:items-end sm:gap-3">
                    {PODIUM.map((slot) => {
                      const r = data.podium[slot.idx];
                      const isChampion = slot.place === 1;
                      return (
                        <div key={slot.place} className={cn('flex flex-col items-center', slot.order)}>
                          {r ? (
                            <div className="flex flex-col items-center pb-4 text-center">
                              <div className="relative">
                                {isChampion && (
                                  <Crown className="absolute -top-7 left-1/2 size-8 -translate-x-1/2 -rotate-6 fill-[var(--ps-orange)] text-[var(--ps-orange)]" />
                                )}
                                <CosmeticAvatar
                                  className={cn('ring-4 ring-offset-4 ring-offset-[var(--ps-paper)]', slot.ring, isChampion ? 'size-20 sm:size-24' : 'size-16 sm:size-18')}
                                  src={r.avatar_url}
                                  name={name(r)}
                                  cosmetics={r.cosmetics}
                                  fallbackClassName="text-sm font-bold"
                                />
                              </div>
                              <h4 className="mt-4 flex max-w-[220px] items-center justify-center gap-1 text-[15px] font-bold">
                                <span className="truncate">{name(r)}</span>
                                <VerifiedBadge role={r.role} isSuperadmin={r.is_superadmin} isTeacher={r.is_teacher} size="xs" />
                                <CosmeticBadge cosmetics={r.cosmetics} />
                              </h4>
                              <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-[var(--ps-neutral)] px-3 py-1 font-mono text-[12.5px] font-bold">
                                <Zap className="size-3.5 text-[var(--ps-orange)]" /> <StatNumber value={r.xp} /> XP
                              </span>
                            </div>
                          ) : (
                            <p className="pb-4 text-[13px] text-[var(--text-muted)]">Bo&apos;sh o&apos;rin</p>
                          )}

                          <div className={cn('relative flex w-full flex-col items-center justify-start overflow-hidden rounded-t-[28px] pt-3', slot.pedestal, slot.tone)}>
                            <span className="ps-num relative text-[48px] leading-none sm:text-[56px]">{slot.place}</span>
                            <span className="relative mt-1 text-[11px] font-bold uppercase tracking-wider opacity-80">{slot.label}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* 3. Respublika Peshqadamlari Ro'yxati (4-o'rindan boshlab) */}
              {data && data.rankings && data.rankings.length > 0 && (
                <section className="ps-card relative overflow-hidden !rounded-[36px] p-6 sm:p-8">
                  <div className="relative flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex size-12 items-center justify-center rounded-full bg-[var(--ps-orange)]/15 text-[var(--ps-orange)]">
                        <Trophy className="size-5" />
                      </span>
                      <div>
                        <h3 className="ps-display text-[24px] sm:text-[28px]">Respublika reytingi</h3>
                        <p className="text-[12.5px] text-[var(--text-muted)]">Eng faol o&apos;quvchilar ro&apos;yxati (Top-100)</p>
                      </div>
                    </div>
                    <span className="rounded-full bg-[var(--ps-neutral)] px-3.5 py-1 font-mono text-[12px] font-bold">
                      Jami: {data.podium.length + data.rankings.length} nafar abituriyent
                    </span>
                  </div>

                  <div className="relative mt-6 space-y-2">
                    {data.rankings.map((r, i) => {
                      const rankNum = (r as any).rank || i + 4;
                      const isMe = r.username === user?.username || r.profile_id === (user as any)?.id;
                      return (
                        <Reveal key={r.profile_id} index={i} y={4}>
                          {renderRow(r, rankNum, isMe)}
                        </Reveal>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Bo'sh reyting holati uchun chaqiruv */}
              {data && data.podium.length > 0 && (!data.rankings || data.rankings.length === 0) && (
                <div className="flex flex-col items-center justify-center rounded-[32px] bg-[var(--ps-paper)] p-8 text-center border border-dashed border-[var(--border-card)]">
                  <Sparkles className="size-8 text-[var(--ps-orange)]" />
                  <p className="mt-3 text-sm font-bold text-[var(--text-primary)]">
                    Shohsupadan keyingi o&apos;rinlar hali bo&apos;sh!
                  </p>
                  <p className="mt-1 max-w-sm text-xs text-[var(--text-muted)]">
                    Test yechib, ball to&apos;plang va Respublika reytingi safiga birinchilardan bo&apos;lib kiring.
                  </p>
                  <Link href="/tests" className="ps-btn ps-btn-ink mt-4 !min-h-10 !text-xs !font-bold">
                    Test yechishga o&apos;tish
                  </Link>
                </div>
              )}

              {/* Raqobat guruhi */}
              {data && data.my_group.length > 1 && (
                <section className="ps-card relative overflow-hidden !rounded-[36px] p-6 sm:p-8">
                  <div className="relative flex items-center gap-3">
                    <span className="inline-flex size-12 items-center justify-center rounded-full bg-[var(--ps-blue)] text-[#080808]">
                      <Users className="size-5" />
                    </span>
                    <div>
                      <h3 className="ps-display text-[24px] sm:text-[28px]">Raqobat guruhingiz</h3>
                      <p className="text-[12.5px] text-[var(--text-muted)]">Sizga eng yaqin raqiblar</p>
                    </div>
                  </div>
                  <div className="relative mt-5 space-y-2">
                    {data.my_group.map((r, i) => (
                      <Reveal key={r.profile_id} index={i} y={4}>
                        {renderRow(r, r.rank, r.is_me)}
                      </Reveal>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}

          {/* TAB 2: HAFTALIK MIKRO-LIGALAR (30 KISHI) */}
          {activeTab === 'micro_league' && data?.micro_league && (
            <div className="space-y-6">
              {/* Liga Bosqichlari Zanjiri */}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {data.micro_league.all_leagues.map((lg) => {
                  const isCurrent = lg.tier === data.micro_league?.current_league.tier;
                  return (
                    <div
                      key={lg.tier}
                      className={cn(
                        'relative rounded-2xl p-3 text-center transition-all',
                        isCurrent
                          ? 'bg-[#080808] text-[#FFFCF7] shadow-lg ring-2 ring-[var(--ps-orange)] dark:bg-[#FFFCF7] dark:text-[#080808]'
                          : 'bg-[var(--ps-paper)] text-[var(--text-secondary)] opacity-70'
                      )}
                    >
                      <span className="text-2xl">{lg.badge}</span>
                      <p className="mt-1 text-xs font-bold truncate">{lg.name}</p>
                      <p className="text-[10px] opacity-70 font-mono">
                        {lg.min_xp}+ XP
                      </p>
                      {isCurrent && (
                        <span className="mt-1 inline-block rounded-full bg-[var(--ps-orange)] px-2 py-0.5 text-[9.5px] font-black text-[#080808]">
                          Siz shu yerdasiz
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Reset Timer & Status Header */}
              <section className="relative overflow-hidden rounded-[32px] bg-gradient-to-r from-[#141414] via-[#222] to-[#141414] p-6 text-white shadow-xl">
                <span aria-hidden className="absolute -right-8 -top-8 size-36 rounded-full bg-[var(--ps-orange)]/20 blur-xl" />
                <div className="relative flex flex-col justify-between gap-4 md:flex-row md:items-center">
                  <div>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-amber-300">
                      <Clock className="size-3.5" />
                      {formatSeconds(data.micro_league.seconds_until_reset)} qoldi
                    </span>
                    <h2 className="mt-2 text-2xl sm:text-3xl font-black">
                      {data.micro_league.current_league.name} Divizioni
                    </h2>
                    <p className="text-xs sm:text-sm text-white/70 max-w-lg mt-1">
                      {data.micro_league.reset_label}. Siz ushbu 30 kishilik divizionda{' '}
                      <strong className="text-[var(--ps-orange)]">#{data.micro_league.my_cohort_rank}-o&apos;rindasiz</strong>.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="inline-flex items-center gap-1 rounded-xl bg-emerald-500/20 px-3 py-2 text-emerald-400 font-bold border border-emerald-500/30">
                      🟢 Top-5: Keyingi ligaga
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-xl bg-rose-500/20 px-3 py-2 text-rose-400 font-bold border border-rose-500/30">
                      🔴 Oxirgi 5: Quyi ligaga
                    </span>
                  </div>
                </div>
              </section>

              {/* 30 Kishilik Guruh Ro'yxati */}
              <section className="ps-card relative overflow-hidden !rounded-[36px] p-6 sm:p-8">
                <div className="flex items-center justify-between pb-4 border-b border-[var(--ps-neutral)]">
                  <h3 className="ps-display text-[22px] sm:text-[26px]">
                    Haftalik Divizion <span className="text-[var(--ps-orange)]">(30 ishtirokchi)</span>
                  </h3>
                  <span className="text-xs font-bold text-[var(--text-muted)]">
                    Jami: {data.micro_league.rows.length} kishi
                  </span>
                </div>

                <div className="mt-4 space-y-2">
                  {data.micro_league.rows.map((r) => {
                    const isPromotion = r.zone === 'promotion';
                    const isDemotion = r.zone === 'demotion';

                    return (
                      <div
                        key={r.profile_id}
                        className={cn(
                          'flex items-center justify-between gap-3 rounded-[22px] p-3 pr-4 transition-all',
                          r.is_me
                            ? 'bg-[#080808] text-[#FFFCF7] ring-2 ring-[var(--ps-orange)] dark:bg-[#FFFCF7] dark:text-[#080808]'
                            : isPromotion
                              ? 'bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/20'
                              : isDemotion
                                ? 'bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/20'
                                : 'bg-[var(--ps-neutral)] hover:-translate-y-0.5'
                        )}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span
                            className={cn(
                              'inline-flex h-9 min-w-9 shrink-0 items-center justify-center rounded-full px-2 font-mono text-[13px] font-black',
                              r.is_me
                                ? 'bg-[var(--ps-orange)] text-[#080808]'
                                : isPromotion
                                  ? 'bg-emerald-500 text-white'
                                  : isDemotion
                                    ? 'bg-rose-500 text-white'
                                    : 'bg-[var(--ps-paper)] text-[var(--text-secondary)]'
                            )}
                          >
                            #{r.rank}
                          </span>

                          <div className="min-w-0">
                            <p className="flex items-center gap-1.5 truncate text-[14px] font-bold">
                              <span className="truncate">{r.name}</span>
                              {r.has_gold_border && <span title="Oltin Hoshiya">👑</span>}
                              {r.is_me && (
                                <span className="ml-1 rounded-full bg-[var(--ps-orange)] px-2 py-0.5 text-[10.5px] font-black text-[#080808]">
                                  Siz
                                </span>
                              )}
                            </p>
                            <div className="flex items-center gap-2 text-xs font-semibold opacity-70">
                              <span className="inline-flex items-center gap-1">
                                <Flame className="size-3 text-orange-500" /> {r.streak} kun
                              </span>
                              <span>·</span>
                              <span className="text-[var(--ps-purple)] font-mono font-bold">
                                {r.dtm_score} DTM ball
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span
                            className={cn(
                              'hidden sm:inline-flex rounded-full px-2.5 py-0.5 text-[10.5px] font-bold',
                              isPromotion
                                ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                                : isDemotion
                                  ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
                                  : 'bg-black/5 text-[var(--text-muted)]'
                            )}
                          >
                            {isPromotion ? '↑ Ko‘tarilish' : isDemotion ? '↓ Tushish' : 'Barqaror'}
                          </span>
                          <span className="font-mono text-sm font-bold flex items-center gap-1">
                            <Zap className="size-3.5 text-[var(--ps-orange)]" />
                            {r.xp.toLocaleString('uz-UZ')} XP
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
          )}

          {/* TAB 3: OTM MANDAT SIMULYATORI */}
          {activeTab === 'otm_simulator' && data?.otm_simulator && (
            <div className="space-y-6">
              {/* OTM Tanlash Tugmalari */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {data.otm_simulator.catalog.map((otm) => {
                  const active = selectedOtmCode.toLowerCase() === otm.code.toLowerCase();
                  return (
                    <button
                      key={otm.code}
                      type="button"
                      onClick={() => setSelectedOtmCode(otm.code)}
                      className={cn(
                        'shrink-0 cursor-pointer rounded-full px-4 py-2.5 text-xs font-bold transition-all',
                        active
                          ? 'bg-[#080808] text-[#FFFCF7] shadow-lg dark:bg-[#FFFCF7] dark:text-[#080808]'
                          : 'bg-[var(--ps-paper)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      )}
                    >
                      {otm.code}
                    </button>
                  );
                })}
              </div>

              {/* Mandat Natija Kartasi */}
              <section className="ps-card relative overflow-hidden !rounded-[36px] p-6 sm:p-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[var(--ps-neutral)]">
                  <div>
                    <span className="ps-chip">
                      <GraduationCap className="size-3.5 text-[var(--ps-purple)]" />
                      Haqiqiy DTM Mandat Simulyatsiyasi
                    </span>
                    <h2 className="mt-3 text-2xl sm:text-3xl font-black">
                      {data.otm_simulator.selected_university.name}
                    </h2>
                    <p className="text-xs sm:text-sm font-semibold text-[var(--text-muted)] mt-1">
                      Yo&apos;nalish: {data.otm_simulator.selected_university.faculty}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-black/5 dark:bg-white/5 p-4 text-center md:text-right shrink-0">
                    <p className="text-xs text-[var(--text-muted)] font-bold">Taxminiy Mandatdagi O&apos;rningiz</p>
                    <p className="text-4xl font-black text-[var(--ps-orange)]">
                      #{data.otm_simulator.simulated_rank}
                    </p>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      {data.otm_simulator.total_applicants} nafar abituriyent orasida
                    </p>
                  </div>
                </div>

                {/* Dinamik DTM Ko'rsatkichi */}
                <div className="mt-6 space-y-4">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="flex items-center gap-1.5">
                      <TrendingUp className="size-4 text-[var(--ps-green)]" />
                      Sizning Taxminiy DTM Ballingiz:
                    </span>
                    <span className="font-mono text-lg text-[var(--ps-orange)]">
                      {data.otm_simulator.my_dtm} / {data.otm_simulator.max_dtm} ball
                    </span>
                  </div>

                  {/* Progress Bar with markers */}
                  <div className="relative h-4 w-full overflow-hidden rounded-full bg-[var(--ps-neutral)]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-700"
                      style={{
                        width: `${Math.min(100, (data.otm_simulator.my_dtm / data.otm_simulator.max_dtm) * 100)}%`,
                      }}
                    />
                  </div>

                  {/* Ostonalar (Thresholds) */}
                  <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
                    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3.5">
                      <p className="font-bold text-emerald-600 dark:text-emerald-400">
                        Davlat Granti (Kvota: {data.otm_simulator.selected_university.grant_quota} ta)
                      </p>
                      <p className="text-lg font-black font-mono mt-0.5">
                        {data.otm_simulator.selected_university.grant_cutoff} ball
                      </p>
                    </div>

                    <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-3.5">
                      <p className="font-bold text-blue-600 dark:text-blue-400">
                        To&apos;lov-Kontrakt (Kvota: {data.otm_simulator.selected_university.contract_quota} ta)
                      </p>
                      <p className="text-lg font-black font-mono mt-0.5">
                        {data.otm_simulator.selected_university.contract_cutoff} ball
                      </p>
                    </div>
                  </div>

                  {/* Psixologik Tahlil & Xulosa */}
                  <div
                    className={cn(
                      'rounded-2xl p-4 text-xs font-semibold leading-relaxed flex items-center justify-between gap-4',
                      data.otm_simulator.status === 'grant'
                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                        : data.otm_simulator.status === 'contract'
                          ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                          : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/30'
                    )}
                  >
                    <div>
                      <p className="text-sm font-black mb-1">
                        {data.otm_simulator.status === 'grant'
                          ? '👑 Tabriklaymiz! Siz Davlat Granti kvotasi ichidasiz.'
                          : data.otm_simulator.status === 'contract'
                            ? `🎓 Siz to'lov-kontrakt zonasidasiz. Davlat grantiga kirish uchun yana +${data.otm_simulator.points_to_grant} ball yetishmayapti.`
                            : `⚠️ Kontrakt ostonasiga yetish uchun yana +${data.otm_simulator.points_to_contract} ball to'plashingiz zarur.`}
                      </p>
                      <p className="opacity-80">
                        Kunlik 15 daqiqalik test va xatolar ustida ishlash har hafta ballingizni +2.5 ballgacha oshiradi.
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-2xl font-black">{data.otm_simulator.admission_probability_pct}%</span>
                      <p className="text-[10px] uppercase font-bold opacity-70">Kirish ehtimoli</p>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* TAB 4: MAKTABLAR VA HUDUDLAR JANGI */}
          {activeTab === 'clans' && data?.clans && (
            <div className="space-y-6">
              {/* Featured Derby Clash Card */}
              {data.clans.derby && (
                <section className="relative overflow-hidden rounded-[36px] bg-[#080808] p-6 text-[#FFFCF7] sm:p-8 dark:bg-[#FFFCF7] dark:text-[#080808] shadow-2xl">
                  <span aria-hidden className="absolute -left-10 -bottom-10 size-40 rounded-full bg-[var(--ps-coral)] opacity-30 blur-2xl" />
                  <span aria-hidden className="absolute -right-10 -top-10 size-40 rounded-full bg-[var(--ps-orange)] opacity-30 blur-2xl" />

                  <div className="relative text-center">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-amber-300">
                      <Flame className="size-3.5 fill-amber-300" />
                      {data.clans.derby.title}
                    </span>
                    <h2 className="mt-3 text-3xl sm:text-4xl font-black">
                      {data.clans.derby.region1.name} <span className="text-[var(--ps-coral)]">VS</span> {data.clans.derby.region2.name}
                    </h2>
                    <p className="mt-1 text-xs sm:text-sm opacity-70">
                      {data.clans.derby.description}
                    </p>
                  </div>

                  <div className="relative mt-8 grid grid-cols-2 gap-4">
                    <div className="rounded-2xl bg-white/10 p-4 text-center dark:bg-black/10">
                      <p className="text-sm font-bold">{data.clans.derby.region1.name}</p>
                      <p className="mt-1 text-2xl sm:text-3xl font-black text-[var(--ps-orange)]">
                        {data.clans.derby.region1.total_xp.toLocaleString('uz-UZ')} XP
                      </p>
                      <p className="text-[11px] opacity-70">{data.clans.derby.region1.students} o&apos;quvchi</p>
                    </div>

                    <div className="rounded-2xl bg-white/10 p-4 text-center dark:bg-black/10">
                      <p className="text-sm font-bold">{data.clans.derby.region2.name}</p>
                      <p className="mt-1 text-2xl sm:text-3xl font-black text-[var(--ps-coral)]">
                        {data.clans.derby.region2.total_xp.toLocaleString('uz-UZ')} XP
                      </p>
                      <p className="text-[11px] opacity-70">{data.clans.derby.region2.students} o&apos;quvchi</p>
                    </div>
                  </div>
                </section>
              )}

              {/* Viloyatlar Reytingi */}
              <section className="ps-card relative overflow-hidden !rounded-[36px] p-6 sm:p-8">
                <div className="flex items-center justify-between pb-4 border-b border-[var(--ps-neutral)]">
                  <div>
                    <h3 className="ps-display text-[22px] sm:text-[26px]">
                      Viloyatlar <span className="text-[var(--ps-orange)]">Reytingi</span>
                    </h3>
                    <p className="text-xs text-[var(--text-muted)]">O&apos;zbekiston bo&apos;yicha 14 ta hudud chempionati</p>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  {data.clans.regions.map((reg) => (
                    <div
                      key={reg.region}
                      className={cn(
                        'flex items-center justify-between gap-3 rounded-[22px] p-3 pr-4 transition-all',
                        reg.is_my_region
                          ? 'bg-[#080808] text-[#FFFCF7] ring-2 ring-[var(--ps-orange)] dark:bg-[#FFFCF7] dark:text-[#080808]'
                          : 'bg-[var(--ps-neutral)] hover:-translate-y-0.5'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            'inline-flex h-9 min-w-9 shrink-0 items-center justify-center rounded-full px-2 font-mono text-xs font-black',
                            reg.is_my_region ? 'bg-[var(--ps-orange)] text-[#080808]' : 'bg-[var(--ps-paper)]'
                          )}
                        >
                          #{reg.rank}
                        </span>
                        <div>
                          <p className="text-sm font-bold flex items-center gap-1.5">
                            <MapPin className="size-3.5 text-[var(--ps-orange)]" />
                            <span>{reg.region}</span>
                            {reg.is_my_region && (
                              <span className="rounded-full bg-[var(--ps-orange)] px-2 py-0.2 text-[10px] font-black text-[#080808]">
                                Sizning hududingiz
                              </span>
                            )}
                          </p>
                          <p className="text-xs opacity-70">
                            {reg.students_count} o&apos;quvchi faol · O&apos;rtacha: {reg.avg_dtm} DTM ball
                          </p>
                        </div>
                      </div>

                      <span className="font-mono text-sm font-bold flex items-center gap-1">
                        <Zap className="size-3.5 text-[var(--ps-orange)]" />
                        {reg.total_xp.toLocaleString('uz-UZ')} XP
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              {/* Maktablar Reytingi */}
              <section className="ps-card relative overflow-hidden !rounded-[36px] p-6 sm:p-8">
                <div className="flex items-center justify-between pb-4 border-b border-[var(--ps-neutral)]">
                  <div>
                    <h3 className="ps-display text-[22px] sm:text-[26px]">
                      Eng Faol <span className="text-[var(--ps-purple)]">Maktablar</span>
                    </h3>
                    <p className="text-xs text-[var(--text-muted)]">Maktabingiz sha&apos;nini himoya qiling</p>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  {data.clans.schools.map((sch) => (
                    <div
                      key={`${sch.school}-${sch.region}`}
                      className={cn(
                        'flex items-center justify-between gap-3 rounded-[22px] p-3 pr-4 transition-all',
                        sch.is_my_school
                          ? 'bg-[#080808] text-[#FFFCF7] ring-2 ring-[var(--ps-orange)] dark:bg-[#FFFCF7] dark:text-[#080808]'
                          : 'bg-[var(--ps-neutral)] hover:-translate-y-0.5'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span className="inline-flex h-9 min-w-9 shrink-0 items-center justify-center rounded-full bg-[var(--ps-paper)] px-2 font-mono text-xs font-black">
                          #{sch.rank}
                        </span>
                        <div>
                          <p className="text-sm font-bold flex items-center gap-1.5">
                            <Building2 className="size-3.5 text-[var(--ps-purple)]" />
                            <span>{sch.school}</span>
                            {sch.is_my_school && (
                              <span className="rounded-full bg-[var(--ps-orange)] px-2 py-0.2 text-[10px] font-black text-[#080808]">
                                Sizning maktabingiz
                              </span>
                            )}
                          </p>
                          <p className="text-xs opacity-70">
                            {sch.region} · {sch.students_count} o&apos;quvchi
                          </p>
                        </div>
                      </div>

                      <span className="font-mono text-sm font-bold flex items-center gap-1">
                        <Zap className="size-3.5 text-[var(--ps-purple)]" />
                        {sch.total_xp.toLocaleString('uz-UZ')} XP
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
