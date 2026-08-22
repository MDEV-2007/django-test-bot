'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  TrendingUp, ChevronRight, Flame, ThumbsUp, AlertTriangle,
  Radar as RadarIcon, FileCheck2, Target, Clock, Percent,
} from 'lucide-react';
import {
  Area, Bar, BarChart, CartesianGrid, ComposedChart, Line, PolarAngleAxis, PolarGrid,
  PolarRadiusAxis, Radar, RadarChart, XAxis, YAxis,
} from 'recharts';
import { apiFetch } from '@/lib/api-client';
import { useApiQuery } from '@/lib/api-cache';
import { useAuthStore } from '@/lib/auth-store';
import AppShell from '@/components/AppShell';
import PageHero from '@/components/student/PageHero';
import PredictedScore from '@/components/student/PredictedScore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig,
} from '@/components/ui/chart';

type Dashboard = {
  accuracy: number; accuracy_breakdown: { correct: number; wrong: number; skipped: number };
  total_tests: number; avg_score: number; readiness_estimate: number; time_minutes: number;
  xp: number; coins: number; streak: number; level: number;
  daily: { date: string; count: number; avg: number }[];
  monthly: { label: string; tests: number; avg: number; cum_xp: number }[];
  subject_dist: { name: string; value: number; color: string }[];
  mastery: {
    subjects: { name: string; mastery: number; color: string }[];
    topics: { id: number; title: string; mastery: number; answered: number }[];
    radar: { labels: string[]; values: number[] };
    weak: string[]; strong: string[];
  };
  recent: { id: number; test__title: string | null; score: number | null; correct_answers: number; wrong_answers: number; skipped_answers: number; completed_at: string }[];
};

function grade(pct: number) {
  if (pct >= 90) return 'A+';
  if (pct >= 80) return 'A';
  if (pct >= 70) return 'B+';
  if (pct >= 60) return 'B';
  return 'C';
}

// Radar o'qidagi uzun mavzu nomlari diagrammani siqib qo'yadi — qisqartiriladi.
function shortLabel(v: string) {
  return v.length > 22 ? `${v.slice(0, 21)}…` : v;
}

const dailyConfig = { count: { label: 'Testlar', color: 'var(--chart-1)' } } satisfies ChartConfig;
/* Oylik jarayon: ikkita o'lchov bitta grafikda — yechilgan testlar soni (maydon) va
   o'rtacha ball (chiziq). Haftalik ustunlar o'rniga maydon grafigi tanlandi: 6 oylik
   oynada tendensiya ko'rinadi, bo'sh oy esa nol bilan uzluksiz chiziladi. */
const monthlyConfig = {
  tests: { label: 'Testlar', color: 'var(--chart-1)' },
  avg: { label: "O'rtacha ball %", color: 'var(--chart-2)' },
} satisfies ChartConfig;
const radarConfig = { mastery: { label: "O'zlashtirish", color: 'var(--accent)' } } satisfies ChartConfig;

export default function AnalyticsPage() {
  const { access } = useAuthStore();
  const { data } = useApiQuery<Dashboard>('/api/analytics/');

  const totalDaily = data ? data.daily.reduce((s, d) => s + d.count, 0) : 0;
  const breakdownTotal = data
    ? (data.accuracy_breakdown.correct + data.accuracy_breakdown.wrong + data.accuracy_breakdown.skipped) || 1
    : 1;

  // Backend radar'ni ikkita parallel massiv qilib yuboradi — recharts uchun birlashtiramiz.
  const radarData = (data?.mastery.radar.labels ?? []).map((label, i) => ({
    topic: shortLabel(label),
    fullTopic: label,
    mastery: data?.mastery.radar.values[i] ?? 0,
  }));

  const stats = data ? [
    { label: 'Jami testlar', value: `${data.total_tests} ta`, icon: FileCheck2, tone: 'text-[var(--text-primary)]' },
    { label: "O'rtacha aniqlik", value: `${data.accuracy}%`, icon: Target, tone: 'text-[var(--accent-text)]' },
    { label: 'Sarf etilgan vaqt', value: `${data.time_minutes} daq`, icon: Clock, tone: 'text-amber-400' },
    { label: "O'rtacha ball", value: `${data.avg_score}%`, icon: Percent, tone: 'text-[var(--success-text)]' },
  ] : [];

  return (
    <>
      <AppShell />
      <main className="page-shell flex-1 space-y-8 bg-[var(--bg-page)] p-4 pb-12 sm:p-6">
        <PageHero
          eyebrow="AI analitika"
          eyebrowIcon={TrendingUp}
          title="Akademik O'sish va Natijalar"
          description="Mavzular bo'yicha o'zlashtirish, kunlik faollik va aniqlik tahlili."
          actions={data && (
            <div className="flex gap-3">
              <Card className="gap-0 border-[var(--accent-border)] py-3">
                <CardContent className="px-4 text-center">
                  <p className="font-mono text-xs font-bold uppercase text-[var(--accent-text)]">Level & XP</p>
                  <p className="mt-0.5 font-mono text-xl font-black">
                    Lvl {data.level}{' '}
                    <span className="text-xs font-semibold text-[var(--success-text)]">({data.xp.toLocaleString('uz-UZ')} XP)</span>
                  </p>
                </CardContent>
              </Card>
              {data.total_tests > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Card className="gap-0 border-amber-500/30 py-3">
                      <CardContent className="px-4 text-center">
                        <p className="font-mono text-xs font-bold uppercase text-amber-300">Taxminiy tayyorgarlik</p>
                        <p className="mt-0.5 font-mono text-xl font-black">{data.readiness_estimate}%</p>
                      </CardContent>
                    </Card>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-60">
                    Real ko&apos;rsatkichlar (o&apos;rtacha ball, test soni, streak) asosidagi taxminiy baho — rasmiy prognoz emas.
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          )}
        />

        {/* DTM ball bashorati — sahifaning eng qimmatli javobi, shuning uchun eng tepada. */}
        <PredictedScore />

        {!data && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
            </div>
            <Skeleton className="h-72 w-full" />
          </div>
        )}

        {/* Hali test yechmagan foydalanuvchi uchun nol-nol jadval o'rniga aniq yo'l. */}
        {data && data.total_tests === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
              <div className="flex size-14 items-center justify-center rounded-2xl border border-[var(--accent-border)] bg-primary/10 text-[var(--accent-text)]">
                <TrendingUp className="size-7" />
              </div>
              <div className="space-y-1.5">
                <h2 className="font-voice text-lg font-bold">Tahlil hali bo&apos;sh</h2>
                <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground">
                  Birinchi testingizni yeching — shundan so&apos;ng bu yerda kunlik faolligingiz, fanlar
                  bo&apos;yicha o&apos;zlashtirish darajangiz va zaif mavzularingiz ko&apos;rina boshlaydi.
                </p>
              </div>
              <Button asChild>
                <Link href="/tests">Birinchi testni boshlash <ChevronRight className="size-4" /></Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {data && data.total_tests > 0 && (
          <>
            <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
              {stats.map((s) => {
                const Icon = s.icon;
                return (
                  <Card key={s.label} className="gap-0 py-4">
                    <CardContent className="px-4">
                      <div className="flex items-center gap-1.5">
                        <Icon className="size-3.5 text-muted-foreground" />
                        <p className="truncate text-xs text-muted-foreground">{s.label}</p>
                      </div>
                      <p className={`mt-1 font-mono text-xl font-bold tabular-nums ${s.tone}`}>{s.value}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Javoblar taqsimoti */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Javoblar taqsimoti</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex h-3 w-full overflow-hidden rounded-full bg-[var(--surface-hover)]">
                  <div className="h-full bg-[var(--success)]" style={{ width: `${(data.accuracy_breakdown.correct / breakdownTotal) * 100}%` }} />
                  <div className="h-full bg-rose-500" style={{ width: `${(data.accuracy_breakdown.wrong / breakdownTotal) * 100}%` }} />
                  <div className="h-full bg-[var(--text-faint)]" style={{ width: `${(data.accuracy_breakdown.skipped / breakdownTotal) * 100}%` }} />
                </div>
                <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-[var(--success)]" /> {data.accuracy_breakdown.correct} to&apos;g&apos;ri</span>
                  <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-rose-500" /> {data.accuracy_breakdown.wrong} xato</span>
                  <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-[var(--text-faint)]" /> {data.accuracy_breakdown.skipped} o&apos;tkazib yuborilgan</span>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-5 lg:grid-cols-12">
              {/* 14 kunlik faollik */}
              <Card className="lg:col-span-7">
                <CardHeader className="flex-row items-start justify-between space-y-0">
                  <div>
                    <CardTitle className="text-base">14 kunlik faollik</CardTitle>
                    <CardDescription>Kunlik yechilgan testlar soni</CardDescription>
                  </div>
                  <Badge variant="outline" className="border-[var(--accent-border)] bg-primary/12 font-mono text-[var(--accent-text)]">
                    Jami: {totalDaily}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={dailyConfig} className="h-48 w-full">
                    <BarChart data={data.daily} margin={{ left: -24, right: 4, top: 8 }}>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={10} tickMargin={6} />
                      <YAxis tickLine={false} axisLine={false} fontSize={10} allowDecimals={false} width={40} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="count" fill="var(--color-count)" radius={[6, 6, 0, 0]} maxBarSize={28} />
                    </BarChart>
                  </ChartContainer>
                  <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-[var(--chart-1)]" /> Kunlik faollik</span>
                    <span className="flex items-center gap-1">Uzluksizlik: <Flame className="size-3.5 text-amber-400" /> {data.streak} kun</span>
                  </div>
                </CardContent>
              </Card>

              {/* Fanlar o'zlashtirilishi */}
              <Card className="lg:col-span-5">
                <CardHeader className="flex-row items-start justify-between space-y-0">
                  <CardTitle className="text-base">Fanlar o&apos;zlashtirilishi</CardTitle>
                  <span className="font-mono text-xs text-[var(--accent-text)]">{data.mastery.subjects.length} ta modul</span>
                </CardHeader>
                <CardContent className="space-y-4">
                  {data.mastery.subjects.length === 0 && (
                    <p className="text-sm text-muted-foreground">Hali ma&apos;lumot yo&apos;q.</p>
                  )}
                  {data.mastery.subjects.map((s) => (
                    <div key={s.name} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="truncate pr-2 font-semibold">{s.name}</span>
                        <span className="shrink-0 font-mono font-bold text-[var(--accent-text)]">
                          {s.mastery}% ({grade(s.mastery)})
                        </span>
                      </div>
                      <Progress value={s.mastery} className="h-2" />
                    </div>
                  ))}
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/tests/revision">Zaif mavzular ustida ishlash <ChevronRight className="size-4" /></Link>
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Mavzular radar — backend `mastery.radar` ni yuborardi, ilgari ishlatilmasdi. */}
            {radarData.length >= 3 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <RadarIcon className="size-4 text-[var(--accent-text)]" /> Mavzular bo&apos;yicha o&apos;zlashtirish
                  </CardTitle>
                  <CardDescription>
                    Eng ko&apos;p javob bergan {radarData.length} ta mavzu bo&apos;yicha aniqlik
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={radarConfig} className="mx-auto h-72 w-full max-w-xl">
                    <RadarChart data={radarData} outerRadius="72%">
                      <PolarGrid stroke="var(--border)" />
                      <PolarAngleAxis dataKey="topic" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                      <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9, fill: 'var(--text-faint)' }} angle={90} />
                      <ChartTooltip
                        content={<ChartTooltipContent labelKey="fullTopic" formatter={(v) => [`${v}% o'zlashtirilgan`, '']} />}
                      />
                      <Radar dataKey="mastery" stroke="var(--color-mastery)" fill="var(--color-mastery)" fillOpacity={0.25} strokeWidth={2} />
                    </RadarChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            )}

            {data.monthly.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Oylik jarayon</CardTitle>
                  <CardDescription>So&apos;nggi 6 oy: yechilgan testlar va o&apos;rtacha ball</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={monthlyConfig} className="h-52 w-full">
                    <ComposedChart data={data.monthly} margin={{ left: -20, right: 8, top: 10 }}>
                      <defs>
                        <linearGradient id="monthly-tests" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--color-tests)" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="var(--color-tests)" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} tickMargin={8} />
                      <YAxis yAxisId="left" tickLine={false} axisLine={false} fontSize={10} allowDecimals={false} width={36} />
                      <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tickLine={false} axisLine={false} fontSize={10} width={32} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Area
                        yAxisId="left" type="monotone" dataKey="tests"
                        stroke="var(--color-tests)" strokeWidth={2}
                        fill="url(#monthly-tests)"
                        dot={{ r: 3, strokeWidth: 0, fill: 'var(--color-tests)' }}
                        activeDot={{ r: 5 }}
                      />
                      <Line
                        yAxisId="right" type="monotone" dataKey="avg"
                        stroke="var(--color-avg)" strokeWidth={2} strokeDasharray="4 4"
                        dot={false}
                      />
                    </ComposedChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            )}

            {data.subject_dist.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base">Fanlar bo&apos;yicha javoblar</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {data.subject_dist.map((s) => {
                    const total = data.subject_dist.reduce((acc, d) => acc + d.value, 0) || 1;
                    return (
                      <div key={s.name} className="flex items-center gap-2 text-sm">
                        <span className="size-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
                        <span className="flex-1 truncate text-[var(--text-secondary)]">{s.name}</span>
                        <span className="shrink-0 font-mono text-xs text-muted-foreground">
                          {Math.round((s.value / total) * 100)}%
                        </span>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <Card className="border-[var(--success)]/25 bg-[var(--success)]/[0.05]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm text-[var(--success-text)]">
                    <ThumbsUp className="size-4" /> Kuchli mavzular
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  {data.mastery.strong.length
                    ? data.mastery.strong.map((w) => (
                        <Badge key={w} variant="outline" className="border-[var(--success)]/30 bg-[var(--success-soft)] text-[var(--success-text)]">{w}</Badge>
                      ))
                    : <span className="text-sm text-muted-foreground">Yo&apos;q</span>}
                </CardContent>
              </Card>

              <Card className="border-rose-500/25 bg-rose-500/[0.05]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm text-rose-300">
                    <AlertTriangle className="size-4" /> Kuchsiz mavzular
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  {data.mastery.weak.length
                    ? data.mastery.weak.map((w) => (
                        <Badge key={w} variant="outline" className="border-rose-500/30 bg-rose-500/12 text-rose-300">{w}</Badge>
                      ))
                    : <span className="text-sm text-muted-foreground">Yo&apos;q</span>}
                </CardContent>
              </Card>
            </div>

            {data.recent.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base">Oxirgi testlar</CardTitle></CardHeader>
                <CardContent>
                  {data.recent.map((r, i) => (
                    <div key={r.id}>
                      {i > 0 && <Separator />}
                      <Link href={`/tests/${r.id}/feedback`} className="flex items-center justify-between gap-3 py-2.5 transition-colors hover:text-[var(--accent-text)]">
                        <div className="min-w-0">
                          <p className="truncate text-sm">{r.test__title || 'Tasodifiy test'}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(r.completed_at).toLocaleDateString('uz-UZ')} · {r.correct_answers} to&apos;g&apos;ri, {r.wrong_answers} xato
                          </p>
                        </div>
                        <span className="shrink-0 font-mono text-sm font-semibold">
                          {r.score !== null ? `${r.score.toFixed(0)}%` : '—'}
                        </span>
                      </Link>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </main>
    </>
  );
}
