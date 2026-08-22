'use client';

import { useEffect, useState } from 'react';
import { Trophy, Crown, Zap, Users } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { useApiQuery } from '@/lib/api-cache';
import { useAuthStore } from '@/lib/auth-store';
import AppShell from '@/components/AppShell';
import Reveal from '@/components/motion/Reveal';
import StatNumber from '@/components/motion/StatNumber';
import PageHero from '@/components/student/PageHero';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import CosmeticAvatar from '@/components/student/CosmeticAvatar';
import CosmeticBadge from '@/components/student/CosmeticBadge';
import type { Cosmetics } from '@/lib/auth-store';
import { cn } from '@/lib/utils';

type Row = {
  profile_id: number; username: string; first_name: string; last_name: string;
  avatar_url: string | null; xp: number; level: number;
  /* Do'kondan taqilgan bezaklar: ramka halqasi va unvon reytingda ham ko'rinadi. */
  cosmetics?: Cosmetics;
};
type GroupRow = Row & { rank: number; is_me: boolean };
type RankingsData = {
  podium: Row[]; rankings: Row[];
  my_rank: number; my_group: GroupRow[];
  subjects: { id: number; name: string; slug: string }[]; selected_view: string;
};

/* Tartib ikki xil: telefonda oddiy ro'yxat (1 → 2 → 3), sm dan boshlab esa haqiqiy
   shohsupa (2 — 1 — 3, chempion o'rtada va bir oz yuqorida). */
const PODIUM = [
  { idx: 1, order: 'order-2 sm:order-1', label: '#2 KUMUSH', ring: 'border-slate-300', chip: 'bg-slate-300 text-slate-900', lift: '' },
  { idx: 0, order: 'order-1 sm:order-2', label: '#1 CHEMPION', ring: 'border-amber-400', chip: 'bg-gradient-to-r from-amber-400 to-yellow-500 text-black', lift: 'sm:-translate-y-4' },
  { idx: 2, order: 'order-3', label: '#3 BRONZA', ring: 'border-amber-700', chip: 'bg-amber-700 text-amber-100', lift: '' },
];

export default function LeaderboardPage() {
  const { access, user } = useAuthStore();
  const [view, setView] = useState('all');
  const { data } = useApiQuery<RankingsData>(`/api/leaderboard/?subject=${view}`);

  /* Guruhda mendan bittagina yuqoridagi ishtirokchi — "yetib olish" maqsadi.
     Faqat real farq ko'rsatiladi, hech qanday sun'iy rag'batlantirish yo'q. */
  const aheadOfMe = (() => {
    if (!data) return null;
    const meIdx = data.my_group.findIndex((r) => r.is_me);
    if (meIdx <= 0) return null;
    const above = data.my_group[meIdx - 1];
    const me = data.my_group[meIdx];
    const gap = Math.max(0, above.xp - me.xp);
    const who = above.first_name || above.username;
    return {
      // Teng ballda "0 XP kerak" degan gap mantiqsiz — o'shanda boshqa jumla ishlatiladi.
      text: gap > 0
        ? `${gap.toLocaleString('uz-UZ')} XP — ${who}dan oldinga o'tish uchun.`
        : `${who} bilan teng ballda turibsiz — bitta test sizni oldinga chiqaradi.`,
    };
  })();

  const name = (r: Row) => r.first_name || r.username;
  const initials = (r: Row) => name(r).slice(0, 2).toUpperCase();

  return (
    <>
      <AppShell />
      <main className="page-shell flex-1 space-y-8 bg-[var(--bg-page)] p-4 pb-12 sm:p-6">
        <PageHero
          tone="amber"
          eyebrow="Liderlar ligasi"
          eyebrowIcon={Trophy}
          title="Respublika Reyting Jadvali"
          description="Eng ko'p XP to'plagan o'quvchilar shu yerda ko'rinadi — har bir to'g'ri javob sizni yuqoriga olib chiqadi."
          actions={data && (
            <div className="rounded-2xl border bg-card px-4 py-3 text-center">
              <p className="font-mono text-xs uppercase text-muted-foreground">Sizning o&apos;rningiz</p>
              <p className="font-mono text-xl font-black text-[var(--accent-text)]">#{data.my_rank}</p>
            </div>
          )}
        />

        <div className="scroll-fade scroll-row flex items-center gap-2 overflow-x-auto pb-1">
          <Button
            size="sm"
            variant="outline"
            className={cn('shrink-0 rounded-full', view === 'all' && 'chip-active')}
            onClick={() => setView('all')}
          >
            Umumiy
          </Button>
          {data?.subjects.map((s) => (
            <Button
              key={s.slug}
              size="sm"
              variant="outline"
              className={cn('shrink-0 rounded-full', view === s.slug && 'chip-active')}
              onClick={() => setView(s.slug)}
            >
              {s.name}
            </Button>
          ))}
        </div>

        {!data && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3"><Skeleton className="h-44" /><Skeleton className="h-52" /><Skeleton className="h-44" /></div>
            <Skeleton className="h-64 w-full" />
          </div>
        )}

        {/* Shohsupa */}
        {/* Mobilda 3 ta ustun 375px ekranda ~110px dan qoladi: ismlar kesiladi,
            lentalar ikki qatorga tushadi. Shuning uchun telefonda shohsupa TIK
            ro'yxatga aylanadi (avatar chapda, ball o'ngda), sm dan boshlab esa
            odatdagi uch ustunli shohsupa. */}
        {data && data.podium.length > 0 && (
          <div className="grid grid-cols-1 gap-3 pb-2 pt-6 sm:grid-cols-3 sm:items-end sm:gap-6">
            {PODIUM.map((slot) => {
              const r = data.podium[slot.idx];
              const isChampion = slot.idx === 0;
              return (
                <Card
                  key={slot.label}
                  className={cn(
                    'relative transition-transform sm:items-center sm:text-center',
                    slot.order, slot.lift,
                    isChampion ? 'border-amber-500/40 bg-gradient-to-b from-amber-500/10 to-card shadow-xl shadow-amber-500/10' : '',
                  )}
                >
                  {/* Lenta karta ICHIDA, yuqori chetiga yopishtirilgan: `Card` da
                      `overflow-hidden` bor, shuning uchun `-top-3` bilan tashqariga
                      chiqarilgan yozuvning yarmi kesilib qolar edi. */}
                  <span className={cn('absolute left-3 top-0 flex items-center gap-1 rounded-b-lg px-3 py-1 font-mono text-xs font-black shadow-md sm:left-1/2 sm:-translate-x-1/2', slot.chip)}>
                    {isChampion && <Crown className="size-3" />}
                    {slot.label}
                  </span>
                  <CardContent className="flex items-center gap-3.5 pt-9 sm:flex-col sm:gap-0">
                    {r ? (
                      <>
                        <CosmeticAvatar
                          className={cn('shrink-0 border-2', slot.ring, isChampion ? 'size-12 sm:size-20' : 'size-12 sm:size-16')}
                          src={r.avatar_url}
                          name={name(r)}
                          cosmetics={r.cosmetics}
                          fallbackClassName="text-xs"
                        />
                        <div className="min-w-0 flex-1 sm:w-full sm:flex-none">
                          <h4 className={cn('flex items-center justify-center gap-1 truncate font-bold', isChampion ? 'text-sm sm:mt-2 sm:text-base' : 'text-sm sm:mt-2')}>
                            <span className="truncate">{name(r)}</span>
                            <CosmeticBadge cosmetics={r.cosmetics} />
                          </h4>
                          <span className="font-mono text-xs text-muted-foreground">
                            {/* Unvon sotib olingan bo'lsa daraja o'rniga o'sha ko'rinadi —
                                bezakning ma'nosi boshqalarga ko'rinishida. */}
                            {r.cosmetics?.title?.payload?.title ?? `Level ${r.level}`}
                          </span>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn('shrink-0 font-mono sm:mt-2', isChampion ? 'border-amber-500/30 bg-amber-500/12 text-amber-400' : 'text-muted-foreground')}
                        >
                          <Zap className="size-3" /> <StatNumber value={r.xp} /> XP
                        </Badge>
                      </>
                    ) : (
                      <p className="py-6 text-xs text-muted-foreground">Bo&apos;sh</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}


        {/* Sizning guruhingiz — global TOP emas, o'quvchining yaqin atrofi. 300-o'rindagi
            o'quvchi uchun "erishsa bo'ladigan" maqsad shu yerda ko'rinadi. */}
        {data && data.my_group.length > 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="size-4 text-[var(--accent-text)]" /> Sizning guruhingiz
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Sizga eng yaqin ishtirokchilar. {aheadOfMe ? aheadOfMe.text : 'Siz guruhingizda birinchisiz.'}
              </p>
            </CardHeader>
            <CardContent>
              {data.my_group.map((r, i) => (
                <Reveal key={r.profile_id} index={i} y={6}><div>
                  {i > 0 && <Separator />}
                  <div className={cn(
                    'flex items-center justify-between gap-3 rounded-xl px-2 py-2.5 transition-colors',
                    r.is_me && 'bg-primary/10 ring-1 ring-[var(--accent-border)]',
                  )}>
                    <div className="flex min-w-0 items-center gap-3">
                      <span className={cn(
                        'flex size-7 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-bold',
                        r.is_me ? 'bg-primary text-[var(--on-accent)]' : 'bg-[var(--surface-hover)] text-muted-foreground',
                      )}>
                        {r.rank}
                      </span>
                      <CosmeticAvatar
                        className="size-9"
                        src={r.avatar_url}
                        name={name(r)}
                        cosmetics={r.cosmetics}
                        fallbackClassName="text-xs"
                      />
                      <div className="min-w-0">
                        <p className="flex items-center gap-1 truncate text-sm font-medium">
                          <span className="truncate">{name(r)}</span>
                          <CosmeticBadge cosmetics={r.cosmetics} />
                          {r.is_me && <span className="ml-0.5 font-mono text-xs text-[var(--accent-text)]">(Siz)</span>}
                        </p>
                        <span className="font-mono text-xs text-muted-foreground">
                          {r.cosmetics?.title?.payload?.title ?? `Level ${r.level}`}
                        </span>
                      </div>
                    </div>
                    <span className="flex shrink-0 items-center gap-1 font-mono text-sm font-bold text-[var(--accent-text)]">
                      <Zap className="size-3.5" /> <StatNumber value={r.xp} />
                    </span>
                  </div>
                </div></Reveal>
              ))}
            </CardContent>
          </Card>
        )}

        {data && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Reyting yetakchilari</CardTitle>
            </CardHeader>
            <CardContent>
              {data.rankings.length === 0 && (
                <div className="py-10 text-center">
                  <Users className="mx-auto mb-2 size-8 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">Bu bo&apos;limda hali ishtirokchi yo&apos;q.</p>
                </div>
              )}
              {data.rankings.map((r, i) => {
                const isMe = user?.id === r.profile_id;
                return (
                  <div key={r.profile_id}>
                    {i > 0 && <Separator />}
                    <div className={cn(
                      'flex items-center justify-between gap-3 rounded-xl px-2 py-2.5 transition-colors',
                      isMe && 'bg-primary/10 ring-1 ring-[var(--accent-border)]',
                    )}>
                      <div className="flex min-w-0 items-center gap-3">
                        <span className={cn(
                          'flex size-7 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-bold',
                          isMe ? 'bg-primary text-[var(--on-accent)]' : 'bg-[var(--surface-hover)] text-muted-foreground',
                        )}>
                          {i + 4}
                        </span>
                        <CosmeticAvatar
                          className="size-9"
                          src={r.avatar_url}
                          name={name(r)}
                          cosmetics={r.cosmetics}
                          fallbackClassName="text-xs"
                        />
                        <div className="min-w-0">
                          <p className="flex items-center gap-1 truncate text-sm font-medium">
                            <span className="truncate">{name(r)}</span>
                            <CosmeticBadge cosmetics={r.cosmetics} />
                            {isMe && <span className="ml-0.5 font-mono text-xs text-[var(--accent-text)]">(Siz)</span>}
                          </p>
                          <span className="font-mono text-xs text-muted-foreground">
                            {r.cosmetics?.title?.payload?.title ?? `Level ${r.level}`}
                          </span>
                        </div>
                      </div>
                      <span className="flex shrink-0 items-center gap-1 font-mono text-sm font-bold text-[var(--accent-text)]">
                        <Zap className="size-3.5" /> <StatNumber value={r.xp} />
                      </span>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}
      </main>
    </>
  );
}
