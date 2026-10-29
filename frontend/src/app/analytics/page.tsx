'use client';

import Link from 'next/link';
import {
  TrendingUp, ChevronRight, Flame, ThumbsUp, AlertTriangle,
  Radar as RadarIcon, FileCheck2, Target, Clock, Percent,
  GraduationCap, BarChart2,
} from 'lucide-react';
import {
  Area, Bar, BarChart, CartesianGrid, ComposedChart, Line, PolarAngleAxis, PolarGrid,
  PolarRadiusAxis, Radar, RadarChart, XAxis, YAxis,
} from 'recharts';
import { useApiQuery } from '@/lib/api-cache';
import AppShell from '@/components/AppShell';
import PageHero from '@/components/student/PageHero';
import PredictedScore from '@/components/student/PredictedScore';
import StudentAdmissionMatcher from '@/components/student/StudentAdmissionMatcher';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PremiumIcon from '@/components/ui/premium-icon';
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
  cefr: {
    skills: { skill: string; label: string; mastery: number; answered: number }[];
    writing: { reviewed_count: number; avg_score: number | null; level: string };
    has_data: boolean;
  };
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

function shortLabel(v: string) {
  return v.length > 22 ? `${v.slice(0, 21)}…` : v;
}

const dailyConfig = { count: { label: 'Testlar', color: '#007AFF' } } satisfies ChartConfig;
const monthlyConfig = {
  tests: { label: 'Testlar', color: '#007AFF' },
  avg: { label: "O'rtacha ball %", color: '#34C759' },
} satisfies ChartConfig;
const radarConfig = { mastery: { label: "O'zlashtirish", color: '#007AFF' } } satisfies ChartConfig;

export default function AnalyticsPage() {
  const { data } = useApiQuery<Dashboard>('/api/analytics/');

  const totalDaily = data ? data.daily.reduce((s, d) => s + d.count, 0) : 0;
  const breakdownTotal = data
    ? (data.accuracy_breakdown.correct + data.accuracy_breakdown.wrong + data.accuracy_breakdown.skipped) || 1
    : 1;

  const radarData = (data?.mastery.radar.labels ?? []).map((label, i) => ({
    topic: shortLabel(label),
    fullTopic: label,
    mastery: data?.mastery.radar.values[i] ?? 0,
  }));

  const stats = data ? [
    { label: 'Jami testlar', value: `${data.total_tests} ta`, icon: FileCheck2, iconTone: 'sky' as const, tone: 'text-foreground' },
    { label: "O'rtacha aniqlik", value: `${data.accuracy}%`, icon: Target, iconTone: 'emerald' as const, tone: 'text-[#34C759]' },
    { label: 'Sarf etilgan vaqt', value: `${data.time_minutes} daq`, icon: Clock, iconTone: 'amber' as const, tone: 'text-[#FF9500]' },
    { label: "O'rtacha ball", value: `${data.avg_score}%`, icon: Percent, iconTone: 'indigo' as const, tone: 'text-[#5856D6]' },
  ] : [];

  return (
    <>
      <AppShell />
      <main className="page-shell flex-1 space-y-6 sm:space-y-7 bg-[var(--bg-page)] p-4 sm:p-6 pb-24 sm:pb-14 max-w-full overflow-x-hidden">
        <PageHero
          tone="sky"
          eyebrow="Apple Health uslubidagi tahlil"
          eyebrowIcon={TrendingUp}
          title="Akademik O'sish va Natijalar"
          description="Mavzular bo'yicha o'zlashtirish ko'rsatkichlari, kunlik faollik va OTM qabul bashorati."
          actions={data && (
            <div className="flex flex-wrap gap-2.5">
              <div className="rounded-[18px] bg-[#007AFF]/10 border border-[#007AFF]/20 px-4 py-2.5 text-center">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#007AFF]">Daraja va XP</p>
                <p className="mt-0.5 font-mono text-[18px] font-black text-foreground">
                  Lvl {data.level}{' '}
                  <span className="text-[12px] font-semibold text-[#34C759]">({data.xp.toLocaleString('uz-UZ')} XP)</span>
                </p>
              </div>
              {data.total_tests > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="rounded-[18px] bg-[#FF9500]/10 border border-[#FF9500]/25 px-4 py-2.5 text-center cursor-help">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#FF9500]">Tayyorgarlik</p>
                      <p className="mt-0.5 font-mono text-[18px] font-black text-foreground">{data.readiness_estimate}%</p>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-60">
                    Real ko&apos;rsatkichlar (o&apos;rtacha ball, test soni, streak) asosidagi taxminiy tayyorgarlik bahosi.
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          )}
        />

        <Tabs defaultValue="overview" className="space-y-6">
          <div className="w-full overflow-x-auto no-scrollbar">
            <TabsList className="h-11 p-1 rounded-[14px]">
              <TabsTrigger value="overview" className="px-4 py-1.5 rounded-[10px] gap-2">
                <PremiumIcon icon={TrendingUp} tone="sky" size="2xs" />
                <span>Umumiy Tahlil</span>
              </TabsTrigger>
              <TabsTrigger value="admission" className="px-4 py-1.5 rounded-[10px] gap-2">
                <PremiumIcon icon={GraduationCap} tone="emerald" size="2xs" />
                <span>OTM Bashorati</span>
                <span className="rounded-full bg-[#34C759]/15 px-2 py-0.5 text-[10px] font-bold text-[#34C759]">
                  2026
                </span>
              </TabsTrigger>
              <TabsTrigger value="topics" className="px-4 py-1.5 rounded-[10px] gap-2">
                <PremiumIcon icon={BarChart2} tone="amber" size="2xs" />
                <span>Fanlar va Mavzular</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ── TAB 1: UMUMIY TAHLIL ── */}
          <TabsContent value="overview" className="space-y-6 mt-0">
            <PredictedScore />

            {!data && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
                  {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-[22px]" />)}
                </div>
                <Skeleton className="h-72 w-full rounded-[24px]" />
              </div>
            )}

            {data && data.total_tests === 0 && (
              <Card>
                <CardContent className="flex flex-col items-center gap-4 py-14 text-center">
                  <PremiumIcon icon={TrendingUp} tone="sky" size="xl" />
                  <div className="space-y-1.5">
                    <h2 className="text-[18px] font-bold text-foreground">Tahlil hali bo&apos;sh</h2>
                    <p className="mx-auto max-w-md text-[13.5px] leading-relaxed text-[#8E8E93]">
                      Birinchi testingizni yeching — shundan so&apos;ng bu yerda kunlik faolligingiz, fanlar
                      bo&apos;yicha o&apos;zlashtirish darajangiz va zaif mavzularingiz ko&apos;rina boshlaydi.
                    </p>
                  </div>
                  <Button asChild className="rounded-full px-6">
                    <Link href="/tests">Birinchi testni boshlash <ChevronRight className="size-4" /></Link>
                  </Button>
                </CardContent>
              </Card>
            )}

            {data && data.total_tests > 0 && (
              <>
                {/* 4 Apple Health Summary Widgets */}
                <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
                  {stats.map((s) => (
                    <div key={s.label} className="ios-card rounded-[22px] p-4 flex flex-col justify-between gap-3">
                      <div className="flex items-center justify-between">
                        <PremiumIcon icon={s.icon} tone={s.iconTone} size="xs" />
                        <span className="text-[11px] font-semibold text-[#8E8E93]">{s.label}</span>
                      </div>
                      <p className={`font-mono text-[24px] font-black tracking-tight tabular-nums ${s.tone}`}>
                        {s.value}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Javoblar taqsimoti */}
                <Card>
                  <CardHeader>
                    <CardTitle>Javoblar taqsimoti</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex h-3.5 w-full overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.08]">
                      <div className="h-full bg-[#34C759]" style={{ width: `${(data.accuracy_breakdown.correct / breakdownTotal) * 100}%` }} />
                      <div className="h-full bg-[#FF3B30]" style={{ width: `${(data.accuracy_breakdown.wrong / breakdownTotal) * 100}%` }} />
                      <div className="h-full bg-[#8E8E93]/50" style={{ width: `${(data.accuracy_breakdown.skipped / breakdownTotal) * 100}%` }} />
                    </div>
                    <div className="flex flex-wrap gap-5 text-[12.5px] font-medium text-[#8E8E93]">
                      <span className="flex items-center gap-1.5">
                        <span className="size-2.5 rounded-full bg-[#34C759]" />
                        <strong className="text-foreground">{data.accuracy_breakdown.correct}</strong> to&apos;g&apos;ri
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="size-2.5 rounded-full bg-[#FF3B30]" />
                        <strong className="text-foreground">{data.accuracy_breakdown.wrong}</strong> xato
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="size-2.5 rounded-full bg-[#8E8E93]/50" />
                        <strong className="text-foreground">{data.accuracy_breakdown.skipped}</strong> o&apos;tkazib yuborilgan
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* 14 kunlik faollik */}
                <Card>
                  <CardHeader className="flex-row items-start justify-between space-y-0">
                    <div>
                      <CardTitle>14 kunlik faollik</CardTitle>
                      <CardDescription>Kunlik yechilgan testlar soni</CardDescription>
                    </div>
                    <Badge variant="outline" className="border-[#007AFF]/25 bg-[#007AFF]/10 font-mono text-[#007AFF]">
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
                    <div className="mt-3 flex items-center justify-between text-[12px] text-[#8E8E93]">
                      <span className="flex items-center gap-1.5">
                        <span className="size-2 rounded-full bg-[#007AFF]" /> Kunlik faollik
                      </span>
                      <span className="flex items-center gap-1 font-semibold text-foreground">
                        Uzluksizlik: <Flame className="size-3.5 text-[#FF9500] fill-[#FF9500]" /> {data.streak} kun
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Kuchli va Zaif mavzular */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <Card className="border-[#34C759]/25 bg-[#34C759]/[0.04]">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-[14px] text-[#34C759]">
                        <PremiumIcon icon={ThumbsUp} tone="emerald" size="2xs" /> Kuchli mavzularingiz
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-wrap gap-2">
                      {data.mastery.strong.length
                        ? data.mastery.strong.map((w) => (
                            <Badge key={w} variant="outline" className="border-[#34C759]/30 bg-[#34C759]/10 text-[#34C759]">
                              {w}
                            </Badge>
                          ))
                        : <span className="text-[13px] text-[#8E8E93]">Hozircha aniqlanmagan</span>}
                    </CardContent>
                  </Card>

                  <Card className="border-[#FF3B30]/25 bg-[#FF3B30]/[0.04]">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-[14px] text-[#FF3B30]">
                        <PremiumIcon icon={AlertTriangle} tone="rose" size="2xs" /> Diqqat talab etuvchi mavzular
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-wrap gap-2">
                      {data.mastery.weak.length
                        ? data.mastery.weak.map((w) => (
                            <Badge key={w} variant="outline" className="border-[#FF3B30]/30 bg-[#FF3B30]/10 text-[#FF3B30]">
                              {w}
                            </Badge>
                          ))
                        : <span className="text-[13px] text-[#8E8E93]">Yo&apos;q</span>}
                    </CardContent>
                  </Card>
                </div>

                {/* iOS Inset Grouped Oxirgi Testlar */}
                {data.recent.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Oxirgi yechilgan testlar</CardTitle>
                    </CardHeader>
                    <CardContent className="divide-y divide-black/[0.06] dark:divide-white/[0.08]">
                      {data.recent.map((r) => (
                        <Link
                          key={r.id}
                          href={`/tests/${r.id}/feedback`}
                          className="flex items-center justify-between gap-3 py-3 transition-colors hover:text-[#007AFF] group"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-[14px] font-semibold text-foreground group-hover:text-[#007AFF]">
                              {r.test__title || 'Tasodifiy test'}
                            </p>
                            <p className="text-[12px] text-[#8E8E93]">
                              {new Date(r.completed_at).toLocaleDateString('uz-UZ')} · {r.correct_answers} to&apos;g&apos;ri, {r.wrong_answers} xato
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="rounded-full bg-[#007AFF]/10 px-2.5 py-0.5 font-mono text-[13px] font-bold text-[#007AFF]">
                              {r.score !== null ? `${r.score.toFixed(0)}%` : '—'}
                            </span>
                            <ChevronRight className="size-4 text-[#C7C7CC]" />
                          </div>
                        </Link>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>

          {/* ── TAB 2: OTM QABUL & BASHORAT ── */}
          <TabsContent value="admission" className="space-y-6 mt-0">
            <PredictedScore />
            <StudentAdmissionMatcher />
          </TabsContent>

          {/* ── TAB 3: FANLAR & MAVZULAR ── */}
          <TabsContent value="topics" className="space-y-6 mt-0">
            {data && (
              <>
                <div className="grid gap-5 lg:grid-cols-12">
                  <Card className="lg:col-span-6">
                    <CardHeader className="flex-row items-start justify-between space-y-0">
                      <CardTitle>Fanlar o&apos;zlashtirilishi</CardTitle>
                      <span className="font-mono text-xs font-semibold text-[#007AFF]">{data.mastery.subjects.length} ta fan</span>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {data.mastery.subjects.length === 0 && (
                        <p className="text-sm text-[#8E8E93]">Hali ma&apos;lumot yo&apos;q.</p>
                      )}
                      {data.mastery.subjects.map((s) => (
                        <div key={s.name} className="space-y-1.5">
                          <div className="flex items-center justify-between text-[13px]">
                            <span className="truncate pr-2 font-semibold text-foreground">{s.name}</span>
                            <span className="shrink-0 font-mono font-bold text-[#007AFF]">
                              {s.mastery}% ({grade(s.mastery)})
                            </span>
                          </div>
                          <Progress value={s.mastery} className="h-2" />
                        </div>
                      ))}
                      <Button asChild variant="outline" className="w-full rounded-full">
                        <Link href="/tests/revision">Zaif mavzular ustida ishlash <ChevronRight className="size-4" /></Link>
                      </Button>
                    </CardContent>
                  </Card>

                  {data.subject_dist.length > 0 && (
                    <Card className="lg:col-span-6">
                      <CardHeader><CardTitle>Fanlar bo&apos;yicha test hajmi</CardTitle></CardHeader>
                      <CardContent className="space-y-2.5">
                        {data.subject_dist.map((s) => {
                          const total = data.subject_dist.reduce((acc, d) => acc + d.value, 0) || 1;
                          return (
                            <div key={s.name} className="flex items-center gap-2.5 text-[13.5px]">
                              <span className="size-3 shrink-0 rounded-full" style={{ background: s.color }} />
                              <span className="flex-1 truncate font-medium text-foreground">{s.name}</span>
                              <span className="shrink-0 font-mono text-xs font-bold text-[#8E8E93]">
                                {Math.round((s.value / total) * 100)}%
                              </span>
                            </div>
                          );
                        })}
                      </CardContent>
                    </Card>
                  )}
                </div>

                {radarData.length >= 3 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <PremiumIcon icon={RadarIcon} tone="sky" size="2xs" /> Mavzular xaritasi (Radar)
                      </CardTitle>
                      <CardDescription>
                        Eng ko&apos;p yechilgan {radarData.length} ta mavzu bo&apos;yicha aniqlik
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
                      <CardTitle>Oylik dinamika</CardTitle>
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

                {data.cefr?.has_data && (
                  <Card>
                    <CardHeader className="flex-row items-start justify-between space-y-0">
                      <CardTitle>CEFR ko&apos;nikmalari</CardTitle>
                      {data.cefr.writing.level && (
                        <span className="font-mono text-xs font-bold text-[#007AFF]">
                          Writing: {data.cefr.writing.level}
                        </span>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {data.cefr.skills.map((s) => (
                        <div key={s.skill} className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="truncate pr-2 font-semibold">{s.label}</span>
                            <span className="shrink-0 font-mono font-bold text-[#007AFF]">
                              {s.mastery}% · {s.answered} savol
                            </span>
                          </div>
                          <Progress value={s.mastery} className="h-2" />
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </>
  );
}
