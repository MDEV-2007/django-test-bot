'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Trophy, Crown, Zap, Users, Sparkles, Swords } from 'lucide-react';
import { useApiQuery } from '@/lib/api-cache';
import { useAuthStore } from '@/lib/auth-store';
import AppShell from '@/components/AppShell';
import Reveal from '@/components/motion/Reveal';
import StatNumber from '@/components/motion/StatNumber';
import { Skeleton } from '@/components/ui/skeleton';
import CosmeticAvatar from '@/components/student/CosmeticAvatar';
import CosmeticBadge from '@/components/student/CosmeticBadge';
import VerifiedBadge from '@/components/ui/verified-badge';
import PremiumIcon from '@/components/ui/premium-icon';
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

const PODIUM_SLOTS = [
  {
    idx: 1,
    order: 'order-2 sm:order-1',
    badge: '🥈 #2 KUMUSH',
    ring: 'ring-2 ring-[#8E8E93]',
    chipClass: 'bg-[#8E8E93]/18 text-foreground',
    cardClass: 'ios-card',
  },
  {
    idx: 0,
    order: 'order-1 sm:order-2',
    badge: '👑 #1 CHEMPION',
    ring: 'ring-2 ring-[#FF9500]',
    chipClass: 'bg-gradient-to-r from-[#FF9500] to-[#FFCC00] text-slate-950',
    cardClass:
      'ios-card border-2 border-[#FF9500]/75 bg-gradient-to-b from-[#FF9500]/12 via-card to-card shadow-[0_14px_34px_-10px_rgba(255,149,0,0.28)] sm:-translate-y-2',
  },
  {
    idx: 2,
    order: 'order-3',
    badge: '🥉 #3 BRONZA',
    ring: 'ring-2 ring-[#C93400]',
    chipClass: 'bg-[#C93400]/16 text-[#C93400] dark:text-[#FF9F0A]',
    cardClass: 'ios-card',
  },
];

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

  return (
    <>
      <AppShell />
      <main className="page-shell flex-1 space-y-6 bg-[var(--bg-page)] p-4 pb-28 sm:p-6">
        <div className="mx-auto max-w-4xl space-y-6">
          {/* 1. iOS 18 Segmented Switcher + Quick Arena Link */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="ios-segmented inline-flex items-center">
              <div className="ios-segmented-thumb flex items-center gap-2 px-4 sm:px-5 py-1.5 text-xs sm:text-[13px] font-bold select-none">
                <PremiumIcon icon={Trophy} tone="amber" size="2xs" />
                <span>Liderlar Ligasi</span>
              </div>
              <Link
                href="/feed"
                className="flex items-center gap-2 px-4 sm:px-5 py-1.5 text-xs sm:text-[13px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                <PremiumIcon icon={Sparkles} tone="emerald" size="2xs" />
                <span>Hamjamiyat Lentasi</span>
              </Link>
            </div>

            <Link
              href="/battles"
              className="ios-spring inline-flex items-center gap-2 rounded-full bg-[#FF9500]/14 border border-[#FF9500]/25 px-3.5 py-1.5 text-xs font-bold text-[#C93400] dark:text-[#FF9F0A]"
            >
              <PremiumIcon icon={Swords} tone="amber" size="2xs" />
              <span>1v1 Arena (+50 XP)</span>
            </Link>
          </div>

          {/* 2. iOS 18 Hero Summary Card */}
          <div className="ios-card relative overflow-hidden rounded-[28px] p-5 sm:p-6">
            <div className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-[#FF9500]/12 blur-3xl" />
            <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <PremiumIcon icon={Trophy} tone="amber" size="lg" solid />
                <div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#FF9500]/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#C93400] dark:text-[#FF9F0A]">
                    Game Center · Oltin Liga
                  </span>
                  <h1 className="mt-1 text-lg sm:text-2xl font-extrabold tracking-tight text-foreground">
                    Respublika Reyting Jadvali
                  </h1>
                  <p className="mt-0.5 text-xs sm:text-sm text-muted-foreground max-w-xl">
                    Eng ko&apos;p XP to&apos;plagan abituriyentlar shohsupasi — har bir to&apos;g&apos;ri javob va sertifikat sizni yuqoriga olib chiqadi.
                  </p>
                </div>
              </div>

              {data && data.my_rank > 0 && (
                <div className="flex items-center gap-3 sm:flex-col sm:items-end sm:gap-0.5 rounded-[20px] border border-border bg-muted/40 px-4 py-3 shrink-0">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Sizning o&apos;rningiz
                  </span>
                  <span className="font-mono text-xl sm:text-2xl font-black text-primary">
                    #{data.my_rank}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 3. Subject Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            <button
              type="button"
              onClick={() => setView('all')}
              className={cn(
                'ios-spring shrink-0 rounded-full px-4 py-1.5 text-xs font-bold transition-all cursor-pointer border',
                view === 'all'
                  ? 'bg-primary text-white border-primary shadow-[0_4px_12px_rgba(0,122,255,0.3)]'
                  : 'bg-card text-muted-foreground border-border hover:text-foreground'
              )}
            >
              Umumiy Reyting
            </button>
            {data?.subjects.map((s) => (
              <button
                key={s.slug}
                type="button"
                onClick={() => setView(s.slug)}
                className={cn(
                  'ios-spring shrink-0 rounded-full px-4 py-1.5 text-xs font-bold transition-all cursor-pointer border',
                  view === s.slug
                    ? 'bg-primary text-white border-primary shadow-[0_4px_12px_rgba(0,122,255,0.3)]'
                    : 'bg-card text-muted-foreground border-border hover:text-foreground'
                )}
              >
                {s.name}
              </button>
            ))}
          </div>

          {!data && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <Skeleton className="h-44 rounded-[26px]" />
                <Skeleton className="h-48 rounded-[26px]" />
                <Skeleton className="h-44 rounded-[26px]" />
              </div>
              <Skeleton className="h-64 w-full rounded-[26px]" />
            </div>
          )}

          {/* 4. iOS 18 Game Center Top 3 Podium */}
          {data && data.podium.length > 0 && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:items-end sm:gap-4 pt-1">
              {PODIUM_SLOTS.map((slot) => {
                const r = data.podium[slot.idx];
                const isChampion = slot.idx === 0;
                return (
                  <div
                    key={slot.badge}
                    className={cn(
                      'relative rounded-[26px] p-4 sm:p-5 transition-all',
                      slot.order,
                      slot.cardClass
                    )}
                  >
                    <div className="flex items-center justify-between sm:justify-center mb-3">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full px-3 py-0.5 text-[10px] font-black tracking-wide',
                          slot.chipClass
                        )}
                      >
                        {isChampion && <Crown className="size-3" />}
                        {slot.badge}
                      </span>
                      {r && (
                        <span className="sm:hidden inline-flex items-center gap-1 rounded-full bg-[#FF9500]/14 px-2.5 py-0.5 font-mono text-xs font-extrabold text-[#C93400] dark:text-[#FF9F0A]">
                          <Zap className="size-3" /> <StatNumber value={r.xp} /> XP
                        </span>
                      )}
                    </div>

                    {r ? (
                      <div className="flex items-center gap-3.5 sm:flex-col sm:text-center sm:gap-2">
                        <CosmeticAvatar
                          className={cn(
                            'shrink-0',
                            slot.ring,
                            isChampion ? 'size-13 sm:size-18' : 'size-12 sm:size-15'
                          )}
                          src={r.avatar_url}
                          name={name(r)}
                          cosmetics={r.cosmetics}
                          fallbackClassName="text-xs font-extrabold"
                        />
                        <div className="min-w-0 flex-1 sm:w-full">
                          <h4 className="flex items-center sm:justify-center gap-1 truncate text-sm sm:text-[15px] font-extrabold text-foreground">
                            <span className="truncate">{name(r)}</span>
                            <VerifiedBadge
                              role={r.role}
                              isSuperadmin={r.is_superadmin}
                              isTeacher={r.is_teacher}
                              size="xs"
                            />
                            <CosmeticBadge cosmetics={r.cosmetics} />
                          </h4>
                          <span className="block font-mono text-[11px] text-muted-foreground">
                            {r.cosmetics?.title?.payload?.title ?? `Level ${r.level}`}
                          </span>
                        </div>
                        <span
                          className={cn(
                            'hidden sm:inline-flex items-center gap-1 rounded-full px-3 py-1 font-mono text-xs font-extrabold',
                            isChampion
                              ? 'bg-[#FF9500]/16 text-[#C93400] dark:text-[#FF9F0A]'
                              : 'bg-muted text-foreground'
                          )}
                        >
                          <Zap className="size-3 text-[#FF9500]" /> <StatNumber value={r.xp} /> XP
                        </span>
                      </div>
                    ) : (
                      <p className="py-6 text-center text-xs text-muted-foreground">Bo&apos;sh</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* 5. Sizning guruhingiz (Nearby Competitors) */}
          {data && data.my_group.length > 1 && (
            <div className="ios-card rounded-[28px] p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <PremiumIcon icon={Users} tone="sky" size="sm" solid />
                  <div>
                    <h3 className="text-sm sm:text-base font-extrabold text-foreground">
                      Sizning raqobat guruhingiz
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {aheadOfMe ? aheadOfMe.text : 'Siz o‘z guruhingizda peshqadamsiz!'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="divide-y divide-border rounded-[22px] border border-border bg-muted/25 overflow-hidden">
                {data.my_group.map((r, i) => (
                  <Reveal key={r.profile_id} index={i} y={4}>
                    <div
                      className={cn(
                        'flex items-center justify-between gap-3 px-4 py-3 transition-colors',
                        r.is_me ? 'bg-primary/10' : 'hover:bg-muted/50'
                      )}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          className={cn(
                            'flex size-7 shrink-0 items-center justify-center rounded-[9px] font-mono text-xs font-bold',
                            r.is_me
                              ? 'bg-primary text-white'
                              : 'bg-card border border-border text-muted-foreground'
                          )}
                        >
                          #{r.rank}
                        </span>
                        <CosmeticAvatar
                          className="size-9 shrink-0"
                          src={r.avatar_url}
                          name={name(r)}
                          cosmetics={r.cosmetics}
                          fallbackClassName="text-xs font-bold"
                        />
                        <div className="min-w-0">
                          <p className="flex items-center gap-1 truncate text-xs sm:text-sm font-bold text-foreground">
                            <span className="truncate">{name(r)}</span>
                            <VerifiedBadge
                              role={r.role}
                              isSuperadmin={r.is_superadmin}
                              isTeacher={r.is_teacher}
                              size="xs"
                            />
                            <CosmeticBadge cosmetics={r.cosmetics} />
                            {r.is_me && (
                              <span className="ml-0.5 rounded-full bg-primary/15 px-2 py-0.5 font-mono text-[10px] font-extrabold text-primary">
                                Siz
                              </span>
                            )}
                          </p>
                          <span className="font-mono text-[11px] text-muted-foreground">
                            {r.cosmetics?.title?.payload?.title ?? `Level ${r.level}`}
                          </span>
                        </div>
                      </div>
                      <span className="flex shrink-0 items-center gap-1 font-mono text-xs sm:text-sm font-extrabold text-primary">
                        <Zap className="size-3.5 text-[#FF9500]" /> <StatNumber value={r.xp} /> XP
                      </span>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          )}

          {/* 6. Reyting yetakchilari (#4 va undan past) */}
          {data && (
            <div className="ios-card rounded-[28px] p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm sm:text-base font-extrabold text-foreground">
                  Top Ishtirokchilar Ro&apos;yxati
                </h3>
                <span className="text-xs font-medium text-muted-foreground">
                  4-o&apos;rindan boshlab
                </span>
              </div>

              {data.rankings.length === 0 ? (
                <div className="py-10 text-center rounded-[22px] border border-dashed border-border bg-muted/20">
                  <PremiumIcon icon={Users} tone="zinc" size="lg" className="mx-auto mb-2.5" />
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Bu bo&apos;limda qo&apos;shimcha ishtirokchilar hali yo&apos;q.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border rounded-[22px] border border-border bg-muted/25 overflow-hidden">
                  {data.rankings.map((r, i) => {
                    const isMe = user?.id === r.profile_id;
                    return (
                      <div
                        key={r.profile_id}
                        className={cn(
                          'flex items-center justify-between gap-3 px-4 py-3 transition-colors',
                          isMe ? 'bg-primary/10' : 'hover:bg-muted/50'
                        )}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span
                            className={cn(
                              'flex size-7 shrink-0 items-center justify-center rounded-[9px] font-mono text-xs font-bold',
                              isMe
                                ? 'bg-primary text-white'
                                : 'bg-card border border-border text-muted-foreground'
                            )}
                          >
                            #{i + 4}
                          </span>
                          <CosmeticAvatar
                            className="size-9 shrink-0"
                            src={r.avatar_url}
                            name={name(r)}
                            cosmetics={r.cosmetics}
                            fallbackClassName="text-xs font-bold"
                          />
                          <div className="min-w-0">
                            <p className="flex items-center gap-1 truncate text-xs sm:text-sm font-bold text-foreground">
                              <span className="truncate">{name(r)}</span>
                              <VerifiedBadge
                                role={r.role}
                                isSuperadmin={r.is_superadmin}
                                isTeacher={r.is_teacher}
                                size="xs"
                              />
                              <CosmeticBadge cosmetics={r.cosmetics} />
                              {isMe && (
                                <span className="ml-0.5 rounded-full bg-primary/15 px-2 py-0.5 font-mono text-[10px] font-extrabold text-primary">
                                  Siz
                                </span>
                              )}
                            </p>
                            <span className="font-mono text-[11px] text-muted-foreground">
                              {r.cosmetics?.title?.payload?.title ?? `Level ${r.level}`}
                            </span>
                          </div>
                        </div>
                        <span className="flex shrink-0 items-center gap-1 font-mono text-xs sm:text-sm font-extrabold text-primary">
                          <Zap className="size-3.5 text-[#FF9500]" /> <StatNumber value={r.xp} /> XP
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
