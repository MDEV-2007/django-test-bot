'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Trophy, Crown, Zap, Users, Sparkles, Swords, ArrowUpRight } from 'lucide-react';
import { useApiQuery } from '@/lib/api-cache';
import { useAuthStore } from '@/lib/auth-store';
import AppShell from '@/components/AppShell';
import Reveal from '@/components/motion/Reveal';
import StatNumber from '@/components/motion/StatNumber';
import { Skeleton } from '@/components/ui/skeleton';
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

type RankingsData = {
  podium: Row[];
  rankings: Row[];
  my_rank: number;
  my_group: GroupRow[];
  subjects: { id: number; name: string; slug: string }[];
  selected_view: string;
};

export default function LeaderboardPage() {
  const { user } = useAuthStore();
  const [view, setView] = useState('all');
  const { data } = useApiQuery<RankingsData>(`/api/leaderboard/?subject=${view}`);

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

  /* Ro'yxat qatori — guruh va umumiy ro'yxat uchun bir xil */
  const renderRow = (r: Row, rank: number, isMe: boolean) => (
    <div
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

  /* Shohsupa: 2-o'rin chapda, 1-o'rin markazda, 3-o'rin o'ngda */
  const PODIUM = [
    { idx: 1, place: 2, label: 'Kumush', pedestal: 'h-28 sm:h-32', tone: 'bg-[var(--ps-purple)] text-white', ring: 'ring-[var(--ps-purple)]', order: 'order-2 sm:order-1' },
    { idx: 0, place: 1, label: 'Chempion', pedestal: 'h-36 sm:h-44', tone: 'bg-[var(--ps-orange)] text-[#080808]', ring: 'ring-[var(--ps-orange)]', order: 'order-1 sm:order-2' },
    { idx: 2, place: 3, label: 'Bronza', pedestal: 'h-24 sm:h-24', tone: 'bg-[var(--ps-coral)] text-white', ring: 'ring-[var(--ps-coral)]', order: 'order-3' },
  ];

  return (
    <div className="theme-pastel min-h-screen w-full">
      <AppShell />
      <main className="page-shell flex-1 p-4 pb-28 sm:p-6">
        <div className="mx-auto max-w-5xl space-y-6">
          {/* 1. Yuqori qator: bo'limlar + Arena */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-1 rounded-full bg-[var(--ps-paper)] p-1 shadow-[var(--ds-panel-shadow)]">
              <span className="inline-flex items-center gap-2 rounded-full bg-[#080808] px-4 py-2 text-[13px] font-bold text-[#FFFCF7] dark:bg-[#FFFCF7] dark:text-[#080808]">
                <Trophy className="size-4 text-[var(--ps-orange)]" />
                Liderlar ligasi
              </span>
              <Link href="/feed" className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-bold text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]">
                <Sparkles className="size-4 text-[var(--ps-green)]" />
                Hamjamiyat
              </Link>
            </div>
            <Link href="/battles" className="ps-btn ps-btn-ink !min-h-11">
              <Swords className="size-4 text-[var(--ps-orange)]" />
              1v1 Arena
              <span className="ps-btn-arrow"><ArrowUpRight className="size-4" /></span>
            </Link>
          </div>

          {/* 2. Hero */}
          <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <div className="ps-card relative overflow-hidden !rounded-[36px] p-6 sm:p-8">
              <span aria-hidden className="pointer-events-none absolute -right-14 -top-14 size-48 rounded-full bg-[var(--ps-orange)] opacity-20" />
              <span aria-hidden className="ps-dots pointer-events-none absolute bottom-4 right-6 hidden h-16 w-28 opacity-30 xl:block" />
              <span className="ps-chip relative">
                <Crown className="size-3.5 text-[var(--ps-orange)]" />
                Respublika reytingi
              </span>
              <h1 className="ps-display relative mt-5 text-[44px] sm:text-[60px]">
                Liderlar{' '}
                <span className="whitespace-nowrap">
                <span className="relative inline-block text-[var(--ps-purple)]">
                  ligasi
                  <svg aria-hidden viewBox="0 0 300 24" preserveAspectRatio="none" className="absolute -bottom-2 left-0 h-3 w-full text-[var(--ps-orange)]">
                    <path className="ps-draw" d="M4 16 C 60 4, 120 22, 180 10 S 270 8, 296 14" fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" pathLength={1} />
                  </svg>
                </span>
                <span className="text-[var(--ps-coral)]">.</span>
                </span>
              </h1>
              <p className="relative mt-5 max-w-md text-[14px] leading-relaxed text-[var(--text-secondary)]">
                Eng ko&apos;p XP to&apos;plagan abituriyentlar shohsupasi — har bir to&apos;g&apos;ri javob va sertifikat sizni yuqoriga olib chiqadi.
              </p>
            </div>

            <div className="relative flex flex-col justify-between overflow-hidden rounded-[36px] bg-[#080808] p-6 text-[#FFFCF7] sm:p-8 dark:bg-[#FFFCF7] dark:text-[#080808]">
              <span aria-hidden className="absolute -right-10 -top-10 size-40 rounded-full bg-[var(--ps-purple)] opacity-50" />
              <span aria-hidden className="absolute -bottom-8 -left-8 size-24 rounded-full bg-[var(--ps-orange)] opacity-80" />
              <p className="ps-eyebrow relative opacity-60">Sizning o&apos;rningiz</p>
              <p className="ps-num relative mt-3 text-[72px] leading-none sm:text-[88px]">
                {data && data.my_rank > 0 ? <>#{data.my_rank}</> : '—'}
              </p>
              <p className="relative mt-4 text-[13px] font-semibold leading-relaxed opacity-80">
                {!data
                  ? 'Reyting yuklanmoqda…'
                  : aheadOfMe
                    ? aheadOfMe.text
                    : data.my_rank > 0
                      ? "Siz o'z guruhingizda peshqadamsiz!"
                      : "Test yechib, reytingga kiring."}
              </p>
            </div>
          </section>

          {/* 3. Fan filtri */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {[{ slug: 'all', name: 'Umumiy reyting' }, ...(data?.subjects ?? [])].map((s) => {
              const active = view === s.slug;
              return (
                <button
                  key={s.slug}
                  type="button"
                  onClick={() => setView(s.slug)}
                  className={cn(
                    'shrink-0 cursor-pointer rounded-full px-4 py-2 text-[13px] font-bold transition-all',
                    active
                      ? 'bg-[#080808] text-[#FFFCF7] shadow-[0_10px_22px_-12px_rgba(8,8,8,0.7)] dark:bg-[#FFFCF7] dark:text-[#080808]'
                      : 'bg-[var(--ps-paper)] text-[var(--text-secondary)] hover:-translate-y-0.5 hover:text-[var(--text-primary)]'
                  )}
                >
                  {s.name}
                </button>
              );
            })}
          </div>

          {!data && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
                <Skeleton className="h-56 rounded-[32px]" />
                <Skeleton className="h-64 rounded-[32px]" />
                <Skeleton className="h-52 rounded-[32px]" />
              </div>
              <Skeleton className="h-64 w-full rounded-[32px]" />
            </div>
          )}

          {/* 4. Shohsupa */}
          {data && data.podium.length > 0 && (
            <section className="ps-card relative overflow-hidden !rounded-[36px] p-6 pb-0 sm:p-8 sm:pb-0">
              <span aria-hidden className="pointer-events-none absolute -left-16 -top-16 size-48 rounded-full bg-[var(--ps-purple)] opacity-10" />
              <div className="relative flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="ps-eyebrow text-[var(--text-muted)]">Top 3</p>
                  <h2 className="ps-display mt-2 text-[28px] sm:text-[36px]">
                    Shoh<span className="text-[var(--ps-orange)]">supa</span>
                  </h2>
                </div>
                <svg aria-hidden viewBox="0 0 24 24" className="ps-spin size-9 text-[var(--ps-orange)]">
                  <path d="M12 0 L14.2 9.8 L24 12 L14.2 14.2 L12 24 L9.8 14.2 L0 12 L9.8 9.8 Z" fill="currentColor" />
                </svg>
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
                          <span className="text-[12px] font-semibold text-[var(--text-muted)]">
                            {r.cosmetics?.title?.payload?.title ?? `${r.level}-daraja`}
                          </span>
                          <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-[var(--ps-neutral)] px-3 py-1 font-mono text-[12.5px] font-bold">
                            <Zap className="size-3.5 text-[var(--ps-orange)]" /> <StatNumber value={r.xp} /> XP
                          </span>
                        </div>
                      ) : (
                        <p className="pb-4 text-[13px] text-[var(--text-muted)]">Bo&apos;sh o&apos;rin</p>
                      )}

                      {/* Pog'ona */}
                      <div className={cn('relative flex w-full flex-col items-center justify-start overflow-hidden rounded-t-[28px] pt-3', slot.pedestal, slot.tone)}>
                        <span aria-hidden className="absolute -right-6 -top-6 size-20 rounded-full bg-white/20" />
                        <span aria-hidden className="ps-dots absolute bottom-0 left-0 h-12 w-24 opacity-25" />
                        <span className="ps-num relative text-[48px] leading-none sm:text-[56px]">{slot.place}</span>
                        <span className="relative mt-1 text-[11px] font-bold uppercase tracking-wider opacity-80">{slot.label}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* 5. Raqobat guruhi */}
          {data && data.my_group.length > 1 && (
            <section className="ps-card relative overflow-hidden !rounded-[36px] p-6 sm:p-8">
              <span aria-hidden className="pointer-events-none absolute -right-14 -top-14 size-40 rounded-full bg-[var(--ps-blue)] opacity-20" />
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

          {/* 6. Top ishtirokchilar (#4 dan) */}
          {data && (
            <section className="ps-card relative overflow-hidden !rounded-[36px] p-6 sm:p-8">
              <div className="relative flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="ps-eyebrow text-[var(--text-muted)]">Ro&apos;yxat</p>
                  <h3 className="ps-display mt-2 text-[24px] sm:text-[30px]">
                    Top <span className="text-[var(--ps-purple)]">ishtirokchilar</span>
                  </h3>
                </div>
                <span className="ps-chip">4-o&apos;rindan boshlab</span>
              </div>

              {data.rankings.length === 0 ? (
                <div className="mt-5 flex flex-col items-center gap-3 rounded-[28px] bg-[var(--ps-neutral)] p-10 text-center">
                  <span className="inline-flex size-14 items-center justify-center rounded-full bg-[var(--ps-paper)] text-[var(--text-muted)]">
                    <Users className="size-6" />
                  </span>
                  <p className="text-[13.5px] text-[var(--text-muted)]">Bu bo&apos;limda qo&apos;shimcha ishtirokchilar hali yo&apos;q.</p>
                </div>
              ) : (
                <div className="mt-5 space-y-2">
                  {data.rankings.map((r, i) => (
                    <div key={r.profile_id}>{renderRow(r, i + 4, user?.id === r.profile_id)}</div>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
