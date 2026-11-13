'use client';

import React, { useEffect, useState } from 'react';
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
  /** Shu haftalik XP */
  xp: number;
  total_xp?: number;
  dtm_score: number | null;
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
  /** false — taxminiy ball uchun javoblar hali yetarli emas */
  ready: boolean;
  my_dtm: number | null;
  max_dtm: number;
  platform_rank?: number;
  platform_total?: number;
  points_to_grant?: number;
  points_to_contract?: number;
  status: 'grant' | 'contract' | 'below' | 'unknown';
  status_label: string;
  cutoffs_note?: string;
};

type RegionClan = {
  rank: number;
  region: string;
  total_xp: number;
  students_count: number;
  avg_dtm: number | null;
  is_my_region: boolean;
};

type SchoolClan = {
  rank: number;
  school: string;
  region: string;
  total_xp: number;
  students_count: number;
  avg_dtm: number | null;
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
  // Boshqa sahifadan aniq tabga havola: /leaderboard?tab=otm_simulator (masalan, Dashboard'dagi "Mandat")
  useEffect(() => {
    const tab = new URLSearchParams(window.location.search).get('tab');
    if (tab === 'republic' || tab === 'micro_league' || tab === 'otm_simulator' || tab === 'clans') {
      setActiveTab(tab);
    }
  }, []);
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
          {activeTab === 'micro_league' && data?.micro_league && (() => {
            const ml = data.micro_league;
            const myRow = ml.rows.find((r) => r.is_me);
            const promoCount = ml.rows.filter((r) => r.zone === 'promotion').length;
            const demoCount = ml.rows.filter((r) => r.zone === 'demotion').length;
            return (
              <div className="space-y-6">
                {/* Hero */}
                <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
                  <div className="ps-card relative overflow-hidden !rounded-[36px] p-6 sm:p-8">
                    <span aria-hidden className="pointer-events-none absolute -right-14 -top-14 size-48 rounded-full bg-[var(--ps-green)] opacity-15" />
                    <div className="relative flex flex-wrap items-center gap-2">
                      <span className="ps-chip">
                        <Crown className="size-3.5 text-[var(--ps-orange)]" /> Haftalik liga
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--ps-orange)] px-3 py-1.5 text-[12px] font-bold text-[#080808]">
                        <Clock className="size-3.5" /> {formatSeconds(ml.seconds_until_reset)} qoldi
                      </span>
                    </div>
                    <h1 className="ps-display relative mt-5 text-[36px] sm:text-[50px]">
                      <span className="mr-2 inline-block align-[-0.08em]">{ml.current_league?.badge}</span>
                      {(ml.current_league?.name || 'Nihol ligasi').replace(/\s*Ligasi$/i, '')}{' '}
                      <span className="text-[var(--ps-green)]">ligasi</span>
                      <span className="text-[var(--ps-coral)]">.</span>
                    </h1>
                    <p className="relative mt-3 max-w-lg text-[14px] leading-relaxed text-[var(--text-secondary)]">
                      {ml.reset_label}. 30 kishilik divizionda haftalik XP bo&apos;yicha bellashasiz.
                    </p>
                    <div className="relative mt-4 flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--ps-green)] px-3.5 py-1.5 text-[12.5px] font-bold text-white">
                        ↑ Top-{promoCount || 5} keyingi ligaga
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--ps-coral)] px-3.5 py-1.5 text-[12.5px] font-bold text-white">
                        ↓ Oxirgi {demoCount || 5} quyi ligaga
                      </span>
                    </div>
                  </div>

                  <div className="relative flex flex-col justify-between overflow-hidden rounded-[36px] bg-[#080808] p-6 text-[#FFFCF7] sm:p-8 dark:bg-[#FFFCF7] dark:text-[#080808]">
                    <span aria-hidden className="absolute -right-10 -top-10 size-40 rounded-full bg-[var(--ps-green)] opacity-60" />
                    <span aria-hidden className="absolute -bottom-8 -left-8 size-24 rounded-full bg-[var(--ps-orange)] opacity-80" />
                    <p className="ps-eyebrow relative opacity-60">Divizionda o&apos;rningiz</p>
                    <p className="ps-num relative mt-3 text-[64px] leading-none sm:text-[80px]">
                      {ml.my_cohort_rank ? <>#{ml.my_cohort_rank}</> : '—'}
                    </p>
                    <p className="relative mt-4 text-[13px] font-semibold leading-relaxed opacity-80">
                      {myRow
                        ? myRow.zone === 'promotion'
                          ? "Ko'tarilish zonasidasiz — o'rningizni saqlang!"
                          : myRow.zone === 'demotion'
                            ? 'Tushish zonasidasiz — bugun test yeching!'
                            : `Bu hafta ${myRow.xp.toLocaleString('uz-UZ')} XP to'pladingiz.`
                        : 'Test yechib reytingga kiring va o‘z ligangizda qatnashing.'}
                    </p>
                  </div>
                </section>

                {/* Liga bosqichlari zanjiri */}
                <section className="ps-card !rounded-[32px] p-4 sm:p-5">
                  <div className="no-scrollbar -mx-1 flex items-stretch gap-1.5 overflow-x-auto px-1">
                    {ml.all_leagues.map((lg, idx) => {
                      const isCurrent = lg.tier === ml.current_league.tier;
                      const isPassed = lg.tier < ml.current_league.tier;
                      return (
                        <React.Fragment key={lg.tier}>
                          <div
                            className={cn(
                              'flex min-w-[170px] flex-1 items-center gap-2.5 rounded-[22px] p-2 pr-3',
                              isCurrent
                                ? 'bg-[#080808] text-[#FFFCF7] dark:bg-[#FFFCF7] dark:text-[#080808]'
                                : 'bg-[var(--ps-neutral)]',
                              !isCurrent && !isPassed && 'opacity-60',
                            )}
                          >
                            <span
                              className={cn(
                                'inline-flex size-10 shrink-0 items-center justify-center rounded-full text-[20px]',
                                isCurrent ? 'bg-[var(--ps-orange)]' : isPassed ? 'bg-[var(--ps-green)]' : 'bg-[var(--ps-paper)]',
                              )}
                            >
                              {lg.badge}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-[12.5px] font-bold leading-tight">{lg.name.replace(/\s*Ligasi$/i, '')}</p>
                              <p className="text-[11px] font-semibold tabular-nums opacity-65">
                                {isCurrent ? 'Siz shu yerdasiz' : `${lg.min_xp.toLocaleString('uz-UZ')}+ XP`}
                              </p>
                            </div>
                          </div>
                          {idx < ml.all_leagues.length - 1 && (
                            <span aria-hidden className={cn('my-auto h-1 w-3 shrink-0 rounded-full', isPassed || isCurrent ? 'bg-[var(--ps-green)]' : 'bg-[var(--ds-track)]')} />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </section>

                {/* 30 kishilik divizion */}
                <section className="ps-card relative overflow-hidden !rounded-[36px] p-5 sm:p-8">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex size-12 items-center justify-center rounded-full bg-[var(--ps-green)] text-white">
                        <Users className="size-5" />
                      </span>
                      <div>
                        <h3 className="ps-display text-[24px] sm:text-[28px]">Haftalik divizion</h3>
                        <p className="text-[12.5px] text-[var(--text-muted)]">Haftalik XP bo&apos;yicha tartib</p>
                      </div>
                    </div>
                    <span className="rounded-full bg-[var(--ps-neutral)] px-3.5 py-1 text-[12px] font-bold tabular-nums">
                      {ml.rows.length} / 30 ishtirokchi
                    </span>
                  </div>

                  <div className="mt-5 space-y-2">
                    {ml.rows.map((r, i) => {
                      const isPromotion = r.zone === 'promotion';
                      const isDemotion = r.zone === 'demotion';
                      const prev = ml.rows[i - 1];
                      const showPromoLine = i > 0 && prev?.zone === 'promotion' && !isPromotion;
                      const showDemoLine = i > 0 && isDemotion && prev?.zone !== 'demotion';
                      return (
                        <React.Fragment key={r.profile_id}>
                          {showPromoLine && <ZoneDivider tone="green" label="Ko'tarilish chegarasi" />}
                          {showDemoLine && <ZoneDivider tone="coral" label="Tushish chegarasi" />}
                          <div
                            className={cn(
                              'flex items-center justify-between gap-3 rounded-[22px] p-2 pr-4 transition-all',
                              r.is_me
                                ? 'bg-[#080808] text-[#FFFCF7] dark:bg-[#FFFCF7] dark:text-[#080808]'
                                : 'bg-[var(--ps-neutral)] hover:-translate-y-0.5',
                            )}
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <span
                                className={cn(
                                  'inline-flex size-11 shrink-0 items-center justify-center rounded-full font-[family-name:var(--font-grotesk)] text-[14px] font-bold tabular-nums',
                                  isPromotion
                                    ? 'bg-[var(--ps-green)] text-white'
                                    : isDemotion
                                      ? 'bg-[var(--ps-coral)] text-white'
                                      : r.is_me
                                        ? 'bg-[var(--ps-orange)] text-[#080808]'
                                        : 'bg-[var(--ps-paper)]',
                                )}
                              >
                                {r.rank}
                              </span>
                              <div className="min-w-0">
                                <p className="flex items-center gap-1.5 text-[14.5px] font-bold">
                                  <span className="truncate">{r.name}</span>
                                  {r.has_gold_border && <Crown className="size-3.5 shrink-0 fill-[var(--ps-orange)] text-[var(--ps-orange)]" aria-label="Oltin hoshiya" />}
                                  {r.is_me && (
                                    <span className="shrink-0 rounded-full bg-[var(--ps-orange)] px-2 py-0.5 text-[10.5px] font-black text-[#080808]">Siz</span>
                                  )}
                                </p>
                                <p className="flex items-center gap-2 text-[12px] font-semibold opacity-65">
                                  <span className="inline-flex items-center gap-1">
                                    <Flame className="size-3 text-[var(--ps-orange)]" /> {r.streak} kun
                                  </span>
                                  {r.dtm_score != null && <span className="tabular-nums">· ~{r.dtm_score} DTM</span>}
                                </p>
                              </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              {(isPromotion || isDemotion) && (
                                <span
                                  className={cn(
                                    'hidden rounded-full px-2.5 py-1 text-[11px] font-bold sm:inline-flex',
                                    isPromotion ? 'bg-[var(--ps-green)]/15 text-[var(--ps-green)]' : 'bg-[var(--ps-coral)]/15 text-[var(--ps-coral)]',
                                  )}
                                >
                                  {isPromotion ? '↑ Ko‘tarilish' : '↓ Tushish'}
                                </span>
                              )}
                              <span className="text-right">
                                <span className="ps-num block text-[17px] leading-none">{r.xp.toLocaleString('uz-UZ')}</span>
                                <span className="text-[10.5px] font-bold opacity-55">XP / hafta</span>
                              </span>
                            </div>
                          </div>
                        </React.Fragment>
                      );
                    })}
                  </div>
                </section>
              </div>
            );
          })()}

          {/* TAB 3: OTM MANDAT SIMULYATORI */}
          {activeTab === 'otm_simulator' && (() => {
            const otmSim = data?.otm_simulator;
            const catalog: OtmCatalogItem[] = otmSim?.catalog || (otmSim as any)?.available_otms || [];
            const selectedUni: OtmCatalogItem =
              otmSim?.selected_university ||
              (otmSim as any)?.selected_otm ||
              catalog.find((c) => c.code.toLowerCase() === selectedOtmCode.toLowerCase()) ||
              catalog[0] || {
                code: 'TATU',
                name: 'TATU (Axborot texnologiyalari universiteti)',
                faculty: 'Dasturiy injiniring',
                grant_quota: 35,
                contract_quota: 140,
                grant_cutoff: 156.4,
                contract_cutoff: 114.2,
              };
            // Taxminiy ball haqiqiy javoblardan (analytics.prediction); yetarli javob bo'lmasa null.
            const ready = Boolean(otmSim?.ready && otmSim?.my_dtm != null);
            const myDtm = ready ? Number(otmSim?.my_dtm) : 0;
            const maxDtm = Number(otmSim?.max_dtm ?? 189);
            const status = otmSim?.status ?? 'unknown';
            const pointsToGrant = Number(otmSim?.points_to_grant ?? 0);
            const pointsToContract = Number(otmSim?.points_to_contract ?? 0);
            const pct = (v: number) => `${Math.max(0, Math.min(100, (v / maxDtm) * 100))}%`;
            const grantCut = Number(selectedUni.grant_cutoff ?? 0);
            const contractCut = Number(selectedUni.contract_cutoff ?? 0);
            const statusTone = !ready
              ? 'bg-[var(--ps-neutral)] text-[var(--text-primary)]'
              : status === 'grant'
                ? 'bg-[var(--ps-green)] text-white'
                : status === 'contract'
                  ? 'bg-[var(--ps-orange)] text-[#080808]'
                  : 'bg-[var(--ps-coral)] text-white';
            return (
              <div className="space-y-6">
                {/* Hero */}
                <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
                  <div className="ps-card relative overflow-hidden !rounded-[36px] p-6 sm:p-8">
                    <span aria-hidden className="pointer-events-none absolute -right-14 -top-14 size-48 rounded-full bg-[var(--ps-purple)] opacity-15" />
                    <span className="ps-chip relative">
                      <GraduationCap className="size-3.5 text-[var(--ps-purple)]" /> OTM mandat simulyatori
                    </span>
                    <h1 className="ps-display relative mt-5 text-[36px] sm:text-[50px]">
                      Grantga <span className="text-[var(--ps-purple)]">yetasizmi</span>
                      <span className="text-[var(--ps-coral)]">?</span>
                    </h1>
                    <p className="relative mt-3 max-w-lg text-[14px] leading-relaxed text-[var(--text-secondary)]">
                      Taxminiy DTM balingizni tanlagan OTMingizning o&apos;tgan yillardagi o&apos;tish ballari bilan solishtiring.
                    </p>
                  </div>

                  <div className="relative flex flex-col justify-between overflow-hidden rounded-[36px] bg-[var(--ps-purple)] p-6 text-white sm:p-8">
                    <span aria-hidden className="absolute -right-10 -top-10 size-40 rounded-full bg-white/15" />
                    <span aria-hidden className="absolute -bottom-8 -left-8 size-24 rounded-full bg-[var(--ps-orange)]" />
                    <p className="ps-eyebrow relative opacity-75">Taxminiy DTM balingiz</p>
                    <p className="ps-num relative mt-3 text-[60px] leading-none sm:text-[76px]">
                      {ready ? myDtm : '—'}
                      <span className="ml-1 text-[20px] opacity-70">/ {maxDtm}</span>
                    </p>
                    <p className="relative mt-4 text-[13px] font-semibold leading-relaxed text-white/85">
                      {ready && otmSim?.platform_rank != null
                        ? `Shu OTMni tanlagan ${otmSim.platform_total} o'quvchi orasida #${otmSim.platform_rank}-o'rindasiz.`
                        : ready
                          ? 'Ball haqiqiy javoblaringizdan hisoblangan.'
                          : "Ko'proq test yeching — ball javoblaringizdan hisoblanadi."}
                    </p>
                  </div>
                </section>

                {/* OTM tanlash */}
                <div className="no-scrollbar -mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1">
                  {catalog.map((otm) => {
                    const active = selectedOtmCode.toLowerCase() === otm.code.toLowerCase();
                    return (
                      <button
                        key={otm.code}
                        type="button"
                        onClick={() => setSelectedOtmCode(otm.code)}
                        className={cn(
                          'shrink-0 cursor-pointer rounded-full px-4 py-2 text-[13px] font-bold transition-all',
                          active
                            ? 'bg-[#080808] text-[#FFFCF7] shadow-md dark:bg-[#FFFCF7] dark:text-[#080808]'
                            : 'bg-[var(--ps-paper)] text-[var(--text-secondary)] shadow-sm hover:-translate-y-0.5',
                        )}
                      >
                        {otm.code}
                      </button>
                    );
                  })}
                </div>

                {/* Mandat natija kartasi */}
                <section className="ps-card relative overflow-hidden !rounded-[36px] p-5 sm:p-8">
                  <div className="flex items-start gap-3">
                    <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-full bg-[var(--ps-purple)] text-white">
                      <GraduationCap className="size-5" />
                    </span>
                    <div className="min-w-0">
                      <h2 className="ps-display text-[22px] sm:text-[28px]">{selectedUni.name}</h2>
                      <p className="mt-1 text-[13px] font-semibold text-[var(--text-muted)]">Yo&apos;nalish: {selectedUni.faculty}</p>
                    </div>
                  </div>

                  {/* Ball shkalasi: siz, kontrakt va grant chegaralari */}
                  <div className="mt-8">
                    <div className="relative h-4 w-full rounded-full bg-[var(--ds-track)]">
                      {ready && (
                        <div className="absolute inset-y-0 left-0 rounded-full bg-[var(--ps-purple)] transition-all duration-700" style={{ width: pct(myDtm) }} />
                      )}
                      {contractCut > 0 && (
                        <span className="absolute -top-2 bottom-[-8px] w-1 -translate-x-1/2 rounded-full bg-[var(--ps-orange)]" style={{ left: pct(contractCut) }} />
                      )}
                      {grantCut > 0 && (
                        <span className="absolute -top-2 bottom-[-8px] w-1 -translate-x-1/2 rounded-full bg-[var(--ps-green)]" style={{ left: pct(grantCut) }} />
                      )}
                    </div>
                    <div className="mt-3 flex justify-between text-[11.5px] font-bold tabular-nums text-[var(--text-muted)]">
                      <span>0</span>
                      <span>{maxDtm} ball</span>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-2.5 sm:grid-cols-3">
                    <div className="rounded-[22px] bg-[var(--ps-neutral)] p-4">
                      <p className="flex items-center gap-1.5 text-[11.5px] font-black uppercase tracking-wider text-[var(--ps-purple)]">
                        <span className="size-2.5 rounded-full bg-[var(--ps-purple)]" /> Siz
                      </p>
                      <p className="ps-num mt-1 text-[26px] leading-none">{ready ? myDtm : '—'}</p>
                      <p className="mt-1 text-[12px] font-semibold text-[var(--text-muted)]">taxminiy ball</p>
                    </div>
                    <div className="rounded-[22px] bg-[var(--ps-neutral)] p-4">
                      <p className="flex items-center gap-1.5 text-[11.5px] font-black uppercase tracking-wider text-[var(--ps-orange)]">
                        <span className="size-2.5 rounded-full bg-[var(--ps-orange)]" /> Kontrakt
                      </p>
                      <p className="ps-num mt-1 text-[26px] leading-none">~{selectedUni.contract_cutoff}</p>
                      <p className="mt-1 text-[12px] font-semibold text-[var(--text-muted)]">kvota: {selectedUni.contract_quota ?? '—'} ta</p>
                    </div>
                    <div className="rounded-[22px] bg-[var(--ps-neutral)] p-4">
                      <p className="flex items-center gap-1.5 text-[11.5px] font-black uppercase tracking-wider text-[var(--ps-green)]">
                        <span className="size-2.5 rounded-full bg-[var(--ps-green)]" /> Grant
                      </p>
                      <p className="ps-num mt-1 text-[26px] leading-none">~{selectedUni.grant_cutoff}</p>
                      <p className="mt-1 text-[12px] font-semibold text-[var(--text-muted)]">kvota: {selectedUni.grant_quota ?? '—'} ta</p>
                    </div>
                  </div>

                  <div className={cn('relative mt-4 overflow-hidden rounded-[24px] p-4 sm:p-5', statusTone)}>
                    <span aria-hidden className="absolute -right-8 -top-10 size-28 rounded-full bg-white/15" />
                    <div className="relative flex items-start gap-3">
                      <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-[#FFFCF7] text-[#080808]">
                        {!ready ? <Sparkles className="size-5" /> : status === 'grant' ? <Crown className="size-5 text-[var(--ps-green)]" /> : status === 'contract' ? <GraduationCap className="size-5" /> : <TrendingUp className="size-5 text-[var(--ps-coral)]" />}
                      </span>
                      <div>
                        <p className="font-[family-name:var(--font-grotesk)] text-[17px] font-bold leading-snug">
                          {!ready
                            ? 'Taxminiy ball hali hisoblanmagan'
                            : status === 'grant'
                              ? "Balingiz grant o'tish balidan yuqori"
                              : status === 'contract'
                                ? `Kontrakt zonasidasiz — grantga +${pointsToGrant} ball`
                                : `Kontraktga yetish uchun yana +${pointsToContract} ball`}
                        </p>
                        <p className="mt-1 text-[13px] font-medium opacity-85">
                          {!ready
                            ? otmSim?.status_label || "Ko'proq test yeching — ball haqiqiy javoblaringiz asosida hisoblanadi."
                            : 'Qiyin savollar va turli mavzular balingizni ko‘proq ko‘taradi.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <p className="mt-3 text-[11.5px] text-[var(--text-muted)]">
                    {otmSim?.cutoffs_note || "O'tish ballari o'tgan yillar asosida taxminiy, rasmiy emas."}
                  </p>
                </section>
              </div>
            );
          })()}

          {/* TAB 4: MAKTABLAR VA HUDUDLAR */}
          {activeTab === 'clans' && (() => {
            const clans = data?.clans;
            const derby = clans?.derby;
            const reg1 = derby?.region1 || (derby as any)?.left || { name: 'Samarqand', total_xp: 0, students: 0 };
            const reg2 = derby?.region2 || (derby as any)?.right || { name: 'Buxoro', total_xp: 0, students: 0 };
            const reg1Name = reg1?.name || (reg1 as any)?.region || 'Samarqand';
            const reg2Name = reg2?.name || (reg2 as any)?.region || 'Buxoro';
            const reg1Xp = Number(reg1?.total_xp || 0);
            const reg2Xp = Number(reg2?.total_xp || 0);
            const reg1Students = Number(reg1?.students ?? (reg1 as any)?.students_count ?? 0);
            const reg2Students = Number(reg2?.students ?? (reg2 as any)?.students_count ?? 0);
            const derbyTitle = (derby?.title || 'Oy derbisi').replace(/^🔥\s*/, '');
            const derbyDesc = derby?.description || `${reg1Name} va ${reg2Name} abituriyentlari o'rtasidagi kurash.`;
            const total = reg1Xp + reg2Xp;
            const share1 = total > 0 ? (reg1Xp / total) * 100 : 50;

            const regionsList = Array.isArray(clans?.regions) ? clans.regions : [];
            const schoolsList = Array.isArray(clans?.schools) ? clans.schools : [];
            const myRegion = regionsList.find((r) => r.is_my_region);

            const rankBadge = (rank: number, mine: boolean) => (
              <span
                className={cn(
                  'inline-flex size-11 shrink-0 items-center justify-center rounded-full font-[family-name:var(--font-grotesk)] text-[14px] font-bold tabular-nums',
                  rank === 1 ? 'bg-[var(--ps-orange)] text-[#080808]'
                    : rank === 2 ? 'bg-[var(--ps-lilac)] text-[#080808]'
                    : rank === 3 ? 'bg-[var(--ps-coral)] text-white'
                    : mine ? 'bg-[var(--ps-orange)] text-[#080808]' : 'bg-[var(--ps-paper)]',
                )}
              >
                {rank}
              </span>
            );

            return (
              <div className="space-y-6">
                {/* Hero */}
                <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
                  <div className="ps-card relative overflow-hidden !rounded-[36px] p-6 sm:p-8">
                    <span aria-hidden className="pointer-events-none absolute -right-14 -top-14 size-48 rounded-full bg-[var(--ps-coral)] opacity-15" />
                    <span className="ps-chip relative">
                      <MapPin className="size-3.5 text-[var(--ps-coral)]" /> Maktablar va hududlar
                    </span>
                    <h1 className="ps-display relative mt-5 text-[36px] sm:text-[50px]">
                      Hududlar <span className="text-[var(--ps-coral)]">jangi</span>
                      <span className="text-[var(--ps-orange)]">.</span>
                    </h1>
                    <p className="relative mt-3 max-w-lg text-[14px] leading-relaxed text-[var(--text-secondary)]">
                      Har bir yechgan testingiz viloyatingiz va maktabingiz hisobiga XP qo&apos;shadi.
                    </p>
                  </div>

                  <div className="relative flex flex-col justify-between overflow-hidden rounded-[36px] bg-[#080808] p-6 text-[#FFFCF7] sm:p-8 dark:bg-[#FFFCF7] dark:text-[#080808]">
                    <span aria-hidden className="absolute -right-10 -top-10 size-40 rounded-full bg-[var(--ps-coral)] opacity-60" />
                    <span aria-hidden className="absolute -bottom-8 -left-8 size-24 rounded-full bg-[var(--ps-orange)] opacity-80" />
                    <p className="ps-eyebrow relative opacity-60">Hududingiz o&apos;rni</p>
                    <p className="ps-num relative mt-3 text-[64px] leading-none sm:text-[80px]">
                      {myRegion ? <>#{myRegion.rank}</> : '—'}
                    </p>
                    <p className="relative mt-4 text-[13px] font-semibold leading-relaxed opacity-80">
                      {myRegion ? `${myRegion.region} · ${(myRegion.total_xp || 0).toLocaleString('uz-UZ')} XP` : "Profilingizda viloyatni ko'rsating."}
                    </p>
                  </div>
                </section>

                {/* Derbi */}
                {derby && (
                  <section className="ps-card relative overflow-hidden !rounded-[36px] p-5 sm:p-8">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--ps-coral)] px-3 py-1.5 text-[11.5px] font-black uppercase tracking-wider text-white">
                        <Flame className="size-3.5 fill-current" /> {derbyTitle}
                      </span>
                      <span className="text-[12.5px] font-semibold text-[var(--text-muted)]">{derbyDesc}</span>
                    </div>

                    <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-[family-name:var(--font-grotesk)] text-[20px] font-bold sm:text-[26px]">{reg1Name}</p>
                        <p className="ps-num mt-1 text-[22px] leading-none text-[var(--ps-orange)] sm:text-[30px]">{reg1Xp.toLocaleString('uz-UZ')}</p>
                        <p className="mt-1 text-[12px] font-semibold text-[var(--text-muted)]">XP · {reg1Students} o&apos;quvchi</p>
                      </div>
                      <span className="inline-flex size-12 items-center justify-center rounded-full bg-[#080808] font-[family-name:var(--font-grotesk)] text-[15px] font-bold text-[var(--ps-orange)] dark:bg-[#FFFCF7]">VS</span>
                      <div className="min-w-0 text-right">
                        <p className="truncate font-[family-name:var(--font-grotesk)] text-[20px] font-bold sm:text-[26px]">{reg2Name}</p>
                        <p className="ps-num mt-1 text-[22px] leading-none text-[var(--ps-coral)] sm:text-[30px]">{reg2Xp.toLocaleString('uz-UZ')}</p>
                        <p className="mt-1 text-[12px] font-semibold text-[var(--text-muted)]">XP · {reg2Students} o&apos;quvchi</p>
                      </div>
                    </div>

                    <div className="mt-5 flex h-4 w-full overflow-hidden rounded-full">
                      <div className="h-full bg-[var(--ps-orange)] transition-all duration-700" style={{ width: `${share1}%` }} />
                      <div className="h-full flex-1 bg-[var(--ps-coral)]" />
                    </div>
                    <div className="mt-2 flex justify-between text-[12px] font-bold tabular-nums text-[var(--text-muted)]">
                      <span>{Math.round(share1)}%</span>
                      <span>{100 - Math.round(share1)}%</span>
                    </div>
                  </section>
                )}

                <div className="grid gap-6 xl:grid-cols-2">
                  {/* Viloyatlar */}
                  <section className="ps-card relative overflow-hidden !rounded-[36px] p-5 sm:p-8">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex size-12 items-center justify-center rounded-full bg-[var(--ps-coral)] text-white">
                        <MapPin className="size-5" />
                      </span>
                      <div>
                        <h3 className="ps-display text-[24px] sm:text-[28px]">Viloyatlar</h3>
                        <p className="text-[12.5px] text-[var(--text-muted)]">14 ta hudud chempionati</p>
                      </div>
                    </div>
                    <div className="mt-5 space-y-2">
                      {regionsList.length === 0 && <p className="py-6 text-center text-[13px] text-[var(--text-muted)]">Hozircha ma&apos;lumot yo&apos;q.</p>}
                      {regionsList.map((reg) => (
                        <div
                          key={reg.region}
                          className={cn(
                            'flex items-center justify-between gap-3 rounded-[22px] p-2 pr-4 transition-all',
                            reg.is_my_region ? 'bg-[#080808] text-[#FFFCF7] dark:bg-[#FFFCF7] dark:text-[#080808]' : 'bg-[var(--ps-neutral)] hover:-translate-y-0.5',
                          )}
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            {rankBadge(reg.rank, !!reg.is_my_region)}
                            <div className="min-w-0">
                              <p className="flex items-center gap-1.5 text-[14.5px] font-bold">
                                <span className="truncate">{reg.region}</span>
                                {reg.is_my_region && <span className="shrink-0 rounded-full bg-[var(--ps-orange)] px-2 py-0.5 text-[10.5px] font-black text-[#080808]">Siz</span>}
                              </p>
                              <p className="truncate text-[12px] font-semibold opacity-65">
                                {reg.students_count ?? (reg as any).students ?? 0} o&apos;quvchi{reg.avg_dtm != null ? ` · o'rtacha ${reg.avg_dtm} DTM` : ''}
                              </p>
                            </div>
                          </div>
                          <span className="shrink-0 text-right">
                            <span className="ps-num block text-[17px] leading-none">{(reg.total_xp || 0).toLocaleString('uz-UZ')}</span>
                            <span className="text-[10.5px] font-bold opacity-55">XP</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* Maktablar */}
                  <section className="ps-card relative overflow-hidden !rounded-[36px] p-5 sm:p-8">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex size-12 items-center justify-center rounded-full bg-[var(--ps-purple)] text-white">
                        <Building2 className="size-5" />
                      </span>
                      <div>
                        <h3 className="ps-display text-[24px] sm:text-[28px]">Eng faol maktablar</h3>
                        <p className="text-[12.5px] text-[var(--text-muted)]">Maktabingiz sha&apos;nini himoya qiling</p>
                      </div>
                    </div>
                    <div className="mt-5 space-y-2">
                      {schoolsList.length === 0 && <p className="py-6 text-center text-[13px] text-[var(--text-muted)]">Hozircha ma&apos;lumot yo&apos;q.</p>}
                      {schoolsList.map((sch) => (
                        <div
                          key={`${sch.school}-${sch.region}`}
                          className={cn(
                            'flex items-center justify-between gap-3 rounded-[22px] p-2 pr-4 transition-all',
                            sch.is_my_school ? 'bg-[#080808] text-[#FFFCF7] dark:bg-[#FFFCF7] dark:text-[#080808]' : 'bg-[var(--ps-neutral)] hover:-translate-y-0.5',
                          )}
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            {rankBadge(sch.rank, !!sch.is_my_school)}
                            <div className="min-w-0">
                              <p className="flex items-center gap-1.5 text-[14.5px] font-bold">
                                <span className="truncate">{sch.school}</span>
                                {sch.is_my_school && <span className="shrink-0 rounded-full bg-[var(--ps-orange)] px-2 py-0.5 text-[10.5px] font-black text-[#080808]">Siz</span>}
                              </p>
                              <p className="truncate text-[12px] font-semibold opacity-65">
                                {sch.region} · {sch.students_count ?? (sch as any).students ?? 0} o&apos;quvchi
                              </p>
                            </div>
                          </div>
                          <span className="shrink-0 text-right">
                            <span className="ps-num block text-[17px] leading-none">{(sch.total_xp || 0).toLocaleString('uz-UZ')}</span>
                            <span className="text-[10.5px] font-bold opacity-55">XP</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              </div>
            );
          })()}

        </div>
      </main>
    </div>
  );
}

function ZoneDivider({ tone, label }: { tone: 'green' | 'coral'; label: string }) {
  const c = tone === 'green' ? 'var(--ps-green)' : 'var(--ps-coral)';
  return (
    <div className="flex items-center gap-2 py-1" aria-hidden>
      <span className="h-0.5 flex-1 rounded-full" style={{ background: c, opacity: 0.45 }} />
      <span className="rounded-full px-2.5 py-0.5 text-[10.5px] font-black uppercase tracking-wider" style={{ color: c }}>{label}</span>
      <span className="h-0.5 flex-1 rounded-full" style={{ background: c, opacity: 0.45 }} />
    </div>
  );
}
