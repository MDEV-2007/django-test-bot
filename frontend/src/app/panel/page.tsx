'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Users, GraduationCap, UserRound, FileCheck2, BookOpen, Gamepad2,
  Activity, TrendingUp, CreditCard, Wallet, Radio, Crown, AlertTriangle, ArrowRight,
  Award, Trophy, CheckCircle2, XCircle, Clock, Calendar, Flame, Sparkles, Target,
  Zap, BarChart3, PieChart, ShieldCheck, ChevronRight, RefreshCw, Send,
  HelpCircle, UserCheck
} from 'lucide-react';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import PanelShell from '@/components/panel/PanelShell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import {
  ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';

type HardQuestion = { id: number; text: string; subject_name?: string; rate: number; total: number };
type AuditRow = { id: number; summary: string; action: string; timestamp: string };

type ScoreGroup = { count: number; pct: number };
type ScoreDistribution = {
  gold: ScoreGroup;
  silver: ScoreGroup;
  bronze: ScoreGroup;
  fail: ScoreGroup;
};

type AnswersAnatomy = {
  correct: number;
  wrong: number;
  skipped: number;
  total: number;
  correct_pct: number;
  wrong_pct: number;
  skipped_pct: number;
};

type UserRetention = {
  one_attempt: number;
  two_to_five: number;
  six_plus: number;
  active_learners: number;
  avg_attempts_per_user: number;
};

type SubjectStat = {
  id: number;
  name: string;
  total_attempts: number;
  completed_attempts: number;
  students_count: number;
  avg_score: number;
  max_score: number;
};

type MockAnalytics = {
  total_attempts: number;
  completed_count: number;
  avg_score: number;
  max_score: number;
  gold_count: number;
};

type UpcomingMock = {
  id: number;
  title: string;
  subject_name: string;
  scheduled_at: string | null;
  reminders_count: number;
};

type TopStudent = {
  rank: number;
  name: string;
  username: string;
  phone: string;
  tests_count: number;
  avg_score: number;
  max_score: number;
};

type PeakHour = {
  label: string;
  count: number;
  pct: number;
};

type Dashboard = {
  stats: Record<string, number | string>;
  chart_labels: string[];
  chart_reg: number[];
  chart_attempts: number[];
  score_distribution?: ScoreDistribution;
  answers_anatomy?: AnswersAnatomy;
  user_retention?: UserRetention;
  subject_stats?: SubjectStat[];
  mock_analytics?: MockAnalytics;
  upcoming_mock_info?: UpcomingMock | null;
  top_students?: TopStudent[];
  peak_hours?: Record<string, PeakHour>;
  hardest_questions: HardQuestion[];
  recent_logs: AuditRow[];
};

const STAT_CARDS: { key: string; label: string; icon: typeof Users; tone: string }[] = [
  { key: 'users', label: 'Foydalanuvchilar', icon: Users, tone: 'text-emerald-400' },
  { key: 'teachers', label: "O'qituvchilar", icon: GraduationCap, tone: 'text-sky-400' },
  { key: 'students', label: "O'quvchilar", icon: UserRound, tone: 'text-indigo-400' },
  { key: 'testsets', label: 'Testlar', icon: FileCheck2, tone: 'text-teal-400' },
  { key: 'lessons', label: 'Darslar', icon: BookOpen, tone: 'text-sky-400' },
  { key: 'games', label: "O'yinlar", icon: Gamepad2, tone: 'text-purple-400' },
  { key: 'attempts_today', label: 'Bugungi urinishlar', icon: Activity, tone: 'text-emerald-400' },
  { key: 'attempts_total', label: 'Jami urinishlar', icon: TrendingUp, tone: 'text-emerald-400' },
  { key: 'pending_payments', label: "Kutayotgan to'lovlar", icon: CreditCard, tone: 'text-amber-400' },
  { key: 'total_revenue', label: 'Tushum', icon: Wallet, tone: 'text-amber-400' },
  { key: 'active_today', label: 'Bugun faol', icon: Radio, tone: 'text-emerald-400' },
  { key: 'premium_users', label: 'Premium', icon: Crown, tone: 'text-amber-400' },
];

const ACTION_TONE: Record<string, string> = {
  create: 'bg-[var(--success-soft)] text-[var(--success-text)] border-[var(--success)]/25',
  update: 'bg-primary/12 text-[var(--accent-text)] border-[var(--accent-border)]',
  delete: 'bg-[var(--danger-soft)] text-[var(--danger-text)] border-[var(--danger)]/25',
};
const ACTION_LABEL: Record<string, string> = { create: 'Yaratildi', update: "O'zgardi", delete: "O'chirildi" };

const chartConfig = {
  reg: { label: "Ro'yxatdan o'tish", color: '#10b981' },
  attempts: { label: 'Urinishlar', color: '#f59e0b' },
} satisfies ChartConfig;

function fmt(v: number | string | undefined | null) {
  if (v === undefined || v === null) return '0';
  return typeof v === 'number' ? v.toLocaleString('uz-UZ') : v;
}

export default function PanelDashboard() {
  const { access } = useAuthStore();
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  function loadDashboard() {
    if (!access) return;
    setLoading(true);
    apiFetch<Dashboard>('/api/panel/')
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : "Yuklashda xatolik yuz berdi");
        setLoading(false);
      });
  }

  useEffect(() => {
    loadDashboard();
  }, [access]);

  const series = (data?.chart_labels ?? []).map((label, i) => ({
    label,
    reg: data?.chart_reg?.[i] ?? 0,
    attempts: data?.chart_attempts?.[i] ?? 0,
  }));

  const stats = data?.stats || {};
  const mockAnalytics = data?.mock_analytics;
  const upcomingMock = data?.upcoming_mock_info;
  const scoreDist = data?.score_distribution;
  const ansAnatomy = data?.answers_anatomy;
  const retention = data?.user_retention;
  const subjectStats = data?.subject_stats || [];
  const topStudents = data?.top_students || [];
  const peakHours = data?.peak_hours;

  return (
    <PanelShell>
      <div className="space-y-6">
        
        {/* ============================================================ */}
        {/* 1. ASOSIY SARLAVHA (RASMDAGI KABI) */}
        {/* ============================================================ */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Boshqaruv paneli</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Platformaning umumiy holati, o&apos;sish dinamikasi va so&apos;nggi harakatlar.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={loadDashboard}
              disabled={loading}
              className="gap-1.5 text-xs h-9"
            >
              <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} /> Yangilash
            </Button>
            <Link href="/panel/mocks">
              <Button size="sm" className="gap-1.5 text-xs h-9 font-semibold bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-xs">
                <Trophy className="size-3.5" /> Mock Hisobotlari
              </Button>
            </Link>
          </div>
        </div>

        {/* ============================================================ */}
        {/* 2. 12 TA ASOSIY STATISTIKA KARTALARI (RASMDAGI KABI 2 QATORDA) */}
        {/* ============================================================ */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {STAT_CARDS.map((c) => {
            const Icon = c.icon;
            const val = data?.stats?.[c.key];
            return (
              <div
                key={c.key}
                className="group relative overflow-hidden rounded-2xl border border-[#1e2330] bg-[#11141c]/95 p-4 shadow-sm transition-all hover:border-slate-700 hover:bg-[#151923]"
              >
                <div className="flex items-center gap-2">
                  <Icon className={`size-4 shrink-0 ${c.tone}`} />
                  <p className="truncate text-xs font-medium text-slate-400">{c.label}</p>
                </div>
                {loading ? (
                  <Skeleton className="mt-2.5 h-7 w-16 bg-slate-800" />
                ) : (
                  <p className="mt-2 font-mono text-2xl font-bold tracking-tight text-white tabular-nums">
                    {fmt(val)}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* ============================================================ */}
        {/* 3. O'SISH DINAMIKASI GRAFIGI (RASMDAGI KABI) */}
        {/* ============================================================ */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">O&apos;sish dinamikasi</CardTitle>
            <CardDescription>Kunlik ro&apos;yxatdan o&apos;tish va test urinishlari</CardDescription>
          </CardHeader>
          <CardContent>
            {loading && <Skeleton className="h-56 w-full" />}
            {!loading && series.length > 0 && (
              <ChartContainer config={chartConfig} className="h-56 w-full">
                <AreaChart data={series} margin={{ left: -20, right: 8, top: 8 }}>
                  <defs>
                    <linearGradient id="fillAttempts" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="fillReg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} />
                  <YAxis tickLine={false} axisLine={false} fontSize={11} allowDecimals={false} width={44} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Area dataKey="attempts" type="monotone" stroke="#f59e0b" fill="url(#fillAttempts)" strokeWidth={2} />
                  <Area dataKey="reg" type="monotone" stroke="#10b981" fill="url(#fillReg)" strokeWidth={2} />
                </AreaChart>
              </ChartContainer>
            )}
            {!loading && series.length === 0 && (
              <p className="py-10 text-center text-sm text-muted-foreground">Grafik uchun ma&apos;lumot yo&apos;q.</p>
            )}
          </CardContent>
        </Card>

        {/* ============================================================ */}
        {/* 4. ENG QIYIN SAVOLLAR VA SO'NGGI HARAKATLAR (RASMDAGI KABI) */}
        {/* ============================================================ */}
        <div className="grid gap-4 lg:grid-cols-2">
          
          {/* Eng qiyin savollar */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="size-4 text-[var(--warning-text)]" />
                Eng qiyin savollar
              </CardTitle>
              <CardDescription>Eng past to&apos;g&apos;ri javob foizi bo&apos;yicha</CardDescription>
            </CardHeader>
            <CardContent>
              {loading && Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="my-2 h-8 w-full" />)}
              {!loading && data?.hardest_questions.length === 0 && (
                <p className="py-6 text-center text-sm text-muted-foreground">Hali yetarli javob yo&apos;q.</p>
              )}
              {!loading && data?.hardest_questions.map((q, i) => (
                <div key={q.id}>
                  {i > 0 && <Separator />}
                  <div className="flex items-start justify-between gap-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      {q.subject_name && (
                        <span className="inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded bg-muted text-muted-foreground mb-1">
                          {q.subject_name}
                        </span>
                      )}
                      <p className="text-sm leading-snug text-[var(--text-secondary)] line-clamp-2">{q.text}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className={`font-mono text-sm font-bold ${q.rate < 40 ? 'text-[var(--danger-text)]' : 'text-[var(--warning-text)]'}`}>
                        {q.rate}%
                      </p>
                      <p className="text-xs text-muted-foreground">{q.total} javob</p>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* So'nggi harakatlar */}
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-base">So&apos;nggi harakatlar</CardTitle>
                <CardDescription>Audit jurnalidan</CardDescription>
              </div>
              <Link href="/panel/audit-log" className="flex items-center gap-1 text-xs font-medium text-[var(--accent-text)] hover:underline">
                Hammasi <ArrowRight className="size-3" />
              </Link>
            </CardHeader>
            <CardContent>
              {loading && Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="my-2 h-8 w-full" />)}
              {!loading && data?.recent_logs.length === 0 && (
                <p className="py-6 text-center text-sm text-muted-foreground">Hali yozuv yo&apos;q.</p>
              )}
              {!loading && data?.recent_logs.slice(0, 8).map((log, i) => (
                <div key={log.id}>
                  {i > 0 && <Separator />}
                  <div className="flex items-center gap-2.5 py-2.5">
                    <Badge variant="outline" className={`shrink-0 ${ACTION_TONE[log.action] ?? ''}`}>
                      {ACTION_LABEL[log.action] ?? log.action}
                    </Badge>
                    <p className="min-w-0 flex-1 truncate text-sm text-[var(--text-secondary)]">{log.summary}</p>
                    <span className="shrink-0 font-mono text-xs text-muted-foreground">
                      {new Date(log.timestamp).toLocaleDateString('uz-UZ')}
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

        </div>

        {/* ============================================================ */}
        {/* 5. KENGAYTIRILGAN CHUQUR ANALITIKA (EXECUTIVE DEEP DIVE) */}
        {/* ============================================================ */}
        <div className="pt-4 border-t border-border/60 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="size-5 text-primary" />
              <h2 className="text-lg font-bold text-foreground">Chuqur Ta&apos;limiy &amp; Strategik Analitika</h2>
            </div>
            <Badge variant="secondary" className="text-xs font-semibold">
              To&apos;liq tahlil
            </Badge>
          </div>

          {/* 4 TA STRATEGIK KO'RSATKICHLAR */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* A. Tugatish darajasi */}
            <Card className="border border-border/70 shadow-xs bg-gradient-to-br from-card to-card/60 relative overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Tugatish ko&apos;rsatkichi</span>
                  <div className="size-8 rounded-lg bg-blue-500/15 text-blue-500 flex items-center justify-center">
                    <Target className="size-4" />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-black text-foreground">
                    {loading ? <Skeleton className="h-7 w-16" /> : `${stats.completion_rate ?? 0}%`}
                  </span>
                  <span className="text-[11px] text-muted-foreground font-medium">boshlangan testlardan</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Jami {fmt(stats.attempts_total)} ta test oxirigacha topshirilgan
                </p>
              </CardContent>
            </Card>

            {/* B. O'rtacha o'zlashtirish balli */}
            <Card className="border border-border/70 shadow-xs bg-gradient-to-br from-card to-card/60 relative overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">O&apos;rtacha ko&apos;rsatkich</span>
                  <div className="size-8 rounded-lg bg-emerald-500/15 text-emerald-500 flex items-center justify-center">
                    <Flame className="size-4" />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-black text-foreground">
                    {loading ? <Skeleton className="h-7 w-16" /> : `${stats.avg_score ?? 0}%`}
                  </span>
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                    Max: {stats.max_score ?? 0}%
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Barcha testlar bo&apos;yicha umumiy o&apos;rtacha
                </p>
              </CardContent>
            </Card>

            {/* C. O'tish ko'rsatkichi (Pass Rate >= 60%) */}
            <Card className="border border-border/70 shadow-xs bg-gradient-to-br from-card to-card/60 relative overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">O&apos;tish ko&apos;rsatkichi (60%+)</span>
                  <div className="size-8 rounded-lg bg-amber-500/15 text-amber-500 flex items-center justify-center">
                    <CheckCircle2 className="size-4" />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-black text-foreground">
                    {loading ? <Skeleton className="h-7 w-16" /> : `${stats.pass_rate ?? 0}%`}
                  </span>
                  <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">sertifikat darajasi</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  60% dan yuqori to&apos;plagan muvaffaqiyatli urinishlar
                </p>
              </CardContent>
            </Card>

            {/* D. Telegram Bot Integratsiyasi */}
            <Card className="border border-border/70 shadow-xs bg-gradient-to-br from-card to-card/60 relative overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Telegram bot faolligi</span>
                  <div className="size-8 rounded-lg bg-purple-500/15 text-purple-500 flex items-center justify-center">
                    <Send className="size-4" />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-black text-foreground">
                    {loading ? <Skeleton className="h-7 w-16" /> : `${stats.tg_connected ?? 0}`}
                  </span>
                  <span className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold">
                    ({stats.tg_pct ?? 0}% ulangan)
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Username mavjud: {fmt(stats.tg_username_count)} nafar
                </p>
              </CardContent>
            </Card>
          </div>

          {/* JONLI MOCK STATUSI */}
          {(upcomingMock || (mockAnalytics && mockAnalytics.total_attempts > 0)) && (
            <Card className="border border-amber-500/40 bg-gradient-to-r from-amber-500/10 via-card to-card shadow-xs overflow-hidden">
              <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1.5 max-w-xl">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-amber-500 text-white font-bold text-[11px] gap-1 px-2">
                      <Sparkles className="size-3" /> Jonli Mock Tahlili
                    </Badge>
                    {upcomingMock?.scheduled_at && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="size-3 text-amber-500" /> {upcomingMock.scheduled_at}
                      </span>
                    )}
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-foreground">
                    {upcomingMock ? upcomingMock.title : "Tizimdagi Mock Imtihonlar Natijalari"}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {upcomingMock
                      ? `${upcomingMock.subject_name} fani bo'yicha jonli mock imtihoni. Hozirgacha ${upcomingMock.reminders_count} nafar o'quvchi Telegram orqali eslatma so'ragan.`
                      : "Mock testlarining o'rtacha bali, sertifikatlar taqsimoti va o'quvchilar ko'rsatkichi."}
                  </p>
                </div>

                {mockAnalytics && (
                  <div className="flex flex-wrap items-center gap-3 shrink-0">
                    <div className="bg-background/80 border border-border/70 rounded-xl p-3 min-w-[100px] text-center">
                      <p className="text-[11px] text-muted-foreground font-medium">Jami mocklar</p>
                      <p className="text-lg font-bold text-foreground mt-0.5">{fmt(mockAnalytics.total_attempts)} ta</p>
                    </div>
                    <div className="bg-background/80 border border-border/70 rounded-xl p-3 min-w-[100px] text-center">
                      <p className="text-[11px] text-muted-foreground font-medium">O&apos;rtacha ball</p>
                      <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{mockAnalytics.avg_score}%</p>
                    </div>
                    <div className="bg-background/80 border border-border/70 rounded-xl p-3 min-w-[100px] text-center">
                      <p className="text-[11px] text-muted-foreground font-medium">Oltin (80%+)</p>
                      <p className="text-lg font-bold text-amber-500 mt-0.5">{fmt(mockAnalytics.gold_count)} ta</p>
                    </div>
                    <Link href="/panel/mocks">
                      <Button size="sm" variant="outline" className="h-full py-3 px-3.5 gap-1 text-xs font-semibold">
                        Batafsil <ArrowRight className="size-3.5" />
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* BALLAR TAQSIMOTI VA JAVOBLAR ANATOMIYASI */}
          <div className="grid gap-4 lg:grid-cols-2">
            
            {/* Ballar darajalari taqsimoti */}
            <Card className="border border-border/70 shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Trophy className="size-4.5 text-amber-500" />
                  Ballar Darajalari Taqsimoti
                </CardTitle>
                <CardDescription>
                  Topshirilgan testlarning akademik natijalari (A+, A, B va Qoniqarsiz)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3.5">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-emerald-500 inline-block" />
                      🥇 Oltin Daraja (85% — 100%)
                    </span>
                    <span className="font-mono font-bold text-foreground">
                      {scoreDist?.gold.count || 0} ta ({scoreDist?.gold.pct || 0}%)
                    </span>
                  </div>
                  <Progress value={scoreDist?.gold.pct || 0} className="h-2 bg-emerald-500/15 [&>div]:bg-emerald-500" />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-blue-500 inline-block" />
                      🥈 Kumush Daraja (70% — 84%)
                    </span>
                    <span className="font-mono font-bold text-foreground">
                      {scoreDist?.silver.count || 0} ta ({scoreDist?.silver.pct || 0}%)
                    </span>
                  </div>
                  <Progress value={scoreDist?.silver.pct || 0} className="h-2 bg-blue-500/15 [&>div]:bg-blue-500" />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-amber-500 inline-block" />
                      🥉 Bronza Daraja (60% — 69%)
                    </span>
                    <span className="font-mono font-bold text-foreground">
                      {scoreDist?.bronze.count || 0} ta ({scoreDist?.bronze.pct || 0}%)
                    </span>
                  </div>
                  <Progress value={scoreDist?.bronze.pct || 0} className="h-2 bg-amber-500/15 [&>div]:bg-amber-500" />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-red-600 dark:text-red-400 flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-red-500 inline-block" />
                      ⚠️ Qayta tayyorlanish kerak (&lt;60%)
                    </span>
                    <span className="font-mono font-bold text-foreground">
                      {scoreDist?.fail.count || 0} ta ({scoreDist?.fail.pct || 0}%)
                    </span>
                  </div>
                  <Progress value={scoreDist?.fail.pct || 0} className="h-2 bg-red-500/15 [&>div]:bg-red-500" />
                </div>
              </CardContent>
            </Card>

            {/* Javoblar anatomiyasi */}
            <Card className="border border-border/70 shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <PieChart className="size-4.5 text-blue-500" />
                  Javoblar Anatomiyasi &amp; Aniqligi
                </CardTitle>
                <CardDescription>
                  Barcha berilgan javoblarning to&apos;g&apos;ri, xato va bo&apos;sh qoldirilgan taqsimoti
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex h-4 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      style={{ width: `${ansAnatomy?.correct_pct || 0}%` }}
                      className="bg-emerald-500 transition-all"
                      title={`To'g'ri: ${ansAnatomy?.correct_pct || 0}%`}
                    />
                    <div
                      style={{ width: `${ansAnatomy?.wrong_pct || 0}%` }}
                      className="bg-red-500 transition-all"
                      title={`Xato: ${ansAnatomy?.wrong_pct || 0}%`}
                    />
                    <div
                      style={{ width: `${ansAnatomy?.skipped_pct || 0}%` }}
                      className="bg-slate-400 transition-all"
                      title={`Bo'sh: ${ansAnatomy?.skipped_pct || 0}%`}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground px-0.5">
                    <span>Jami yechilgan savollar: <strong>{fmt(ansAnatomy?.total)} ta</strong></span>
                    <span>Aniqlik ko&apos;rsatkichi: <strong>{ansAnatomy?.correct_pct || 0}%</strong></span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2.5 pt-1">
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-center">
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center justify-center gap-1">
                      <CheckCircle2 className="size-3" /> To&apos;g&apos;ri
                    </p>
                    <p className="text-lg font-black text-foreground mt-1">{fmt(ansAnatomy?.correct)}</p>
                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                      {ansAnatomy?.correct_pct || 0}%
                    </span>
                  </div>

                  <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-center">
                    <p className="text-[11px] text-red-600 dark:text-red-400 font-semibold flex items-center justify-center gap-1">
                      <XCircle className="size-3" /> Xato
                    </p>
                    <p className="text-lg font-black text-foreground mt-1">{fmt(ansAnatomy?.wrong)}</p>
                    <span className="text-[11px] font-bold text-red-600 dark:text-red-400">
                      {ansAnatomy?.wrong_pct || 0}%
                    </span>
                  </div>

                  <div className="rounded-xl border border-slate-500/20 bg-slate-500/5 p-3 text-center">
                    <p className="text-[11px] text-muted-foreground font-semibold flex items-center justify-center gap-1">
                      <HelpCircle className="size-3" /> Bo&apos;sh / O&apos;tgan
                    </p>
                    <p className="text-lg font-black text-foreground mt-1">{fmt(ansAnatomy?.skipped)}</p>
                    <span className="text-[11px] font-bold text-muted-foreground">
                      {ansAnatomy?.skipped_pct || 0}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>

          {/* FANLAR CHUQUR DIAGNOSTIKASI JADVALI */}
          <Card className="border border-border/70 shadow-xs overflow-hidden">
            <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <BookOpen className="size-4.5 text-primary" />
                  Fanlar Kesimida O&apos;zlashtirish va Faollik
                </CardTitle>
                <CardDescription>
                  Har bir fan bo&apos;yicha yechilgan testlar soni, qatnashchilar va o&apos;rtacha ko&apos;rsatkich
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs font-semibold self-start sm:self-auto">
                {subjectStats.length} ta faol fan
              </Badge>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border/60 bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Fan nomi</th>
                    <th className="py-3 px-4 text-center">Topshirilgan testlar</th>
                    <th className="py-3 px-4 text-center">Qatnashgan o&apos;quvchilar</th>
                    <th className="py-3 px-4">O&apos;rtacha ko&apos;rsatkich</th>
                    <th className="py-3 px-4 text-right">Maksimal ball</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {subjectStats.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-xs text-muted-foreground">
                        Hali fanlar bo&apos;yicha test ma&apos;lumotlari mavjud emas.
                      </td>
                    </tr>
                  ) : (
                    subjectStats.map((s) => (
                      <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4 font-semibold text-foreground">
                          {s.name}
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-medium">
                          {s.total_attempts} ta
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-medium text-muted-foreground">
                          {s.students_count} nafar
                        </td>
                        <td className="py-3 px-4 min-w-[180px]">
                          <div className="flex items-center gap-2">
                            <Progress
                              value={s.avg_score}
                              className={`h-2 flex-1 ${
                                s.avg_score >= 75
                                ? '[&>div]:bg-emerald-500 bg-emerald-500/15'
                                : s.avg_score >= 60
                                ? '[&>div]:bg-blue-500 bg-blue-500/15'
                                : '[&>div]:bg-amber-500 bg-amber-500/15'
                              }`}
                            />
                            <span className="font-mono text-xs font-bold w-12 text-right">{s.avg_score}%</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-amber-600 dark:text-amber-400">
                          {s.max_score}%
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* FAOL SOATLAR VA SADOQAT */}
          <div className="grid gap-4 lg:grid-cols-2">
            
            {/* Faollik soatlari */}
            <Card className="border border-border/70 shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock className="size-4.5 text-blue-500" />
                  Faollik Soatlari (Peak Hours)
                </CardTitle>
                <CardDescription>
                  O&apos;quvchilar kunning qaysi vaqtida eng ko&apos;p test yechishadi
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3.5">
                {peakHours && Object.entries(peakHours).map(([key, item]) => {
                  const isEvening = key === 'evening';
                  return (
                    <div key={key} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className={`font-semibold flex items-center gap-1.5 ${isEvening ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'}`}>
                          {item.label}
                          {isEvening && <Badge variant="outline" className="text-[10px] px-1 py-0 bg-amber-500/10 border-amber-500/30 text-amber-600">Eng pik vaqt</Badge>}
                        </span>
                        <span className="font-mono font-bold text-foreground">
                          {item.pct}% ({item.count} ta)
                        </span>
                      </div>
                      <Progress
                        value={item.pct}
                        className={`h-2 ${isEvening ? 'bg-amber-500/20 [&>div]:bg-amber-500' : 'bg-muted [&>div]:bg-primary'}`}
                      />
                    </div>
                  );
                })}
                <div className="pt-2 text-[11px] text-muted-foreground flex items-center gap-1.5 border-t border-border/50">
                  <Zap className="size-3 text-amber-500 shrink-0" />
                  <span>Jonli mock imtihonlarni <strong>18:00 – 22:00</strong> oralig&apos;iga qo&apos;yish eng yuqori qatnashuvni ta&apos;minlaydi.</span>
                </div>
              </CardContent>
            </Card>

            {/* O'quvchilar sadoqati */}
            <Card className="border border-border/70 shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <UserCheck className="size-4.5 text-purple-500" />
                  O&apos;quvchilar Sadoqati (Retention)
                </CardTitle>
                <CardDescription>
                  O&apos;quvchilarning qayta test topshirish chastotasi va o&apos;rganish barqarorligi
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3.5">
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="p-3 rounded-xl border border-border/70 bg-card/60 text-center">
                    <p className="text-[11px] text-muted-foreground font-medium">1 ta topshirgan</p>
                    <p className="text-lg font-black text-foreground mt-1">{retention?.one_attempt || 0}</p>
                    <span className="text-[10px] text-muted-foreground">Yangi o&apos;quvchilar</span>
                  </div>
                  <div className="p-3 rounded-xl border border-blue-500/30 bg-blue-500/5 text-center">
                    <p className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">2–5 ta topshirgan</p>
                    <p className="text-lg font-black text-foreground mt-1">{retention?.two_to_five || 0}</p>
                    <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">Qiziquvchilar</span>
                  </div>
                  <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 text-center">
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">6+ ta topshirgan</p>
                    <p className="text-lg font-black text-foreground mt-1">{retention?.six_plus || 0}</p>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Doimiy / Sodiq</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-muted/40 border border-border/60 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Bitta o&apos;quvchiga o&apos;rtacha testlar soni:</span>
                  <span className="font-mono font-bold text-foreground text-sm">
                    {retention?.avg_attempts_per_user || 0} ta / o&apos;quvchi
                  </span>
                </div>
              </CardContent>
            </Card>

          </div>

          {/* TOP 5 PESHQADAM O'QUVCHILAR */}
          <Card className="border border-border/70 shadow-xs">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Trophy className="size-4.5 text-amber-500" />
                  Platforma Yetakchilari (Top 5)
                </CardTitle>
                <CardDescription>
                  Eng yuqori o&apos;rtacha ball va barqaror natija ko&apos;rsatgan o&apos;quvchilar
                </CardDescription>
              </div>
              <Link href="/panel/mocks" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
                Reyting <ArrowRight className="size-3" />
              </Link>
            </CardHeader>
            <CardContent>
              {topStudents.length === 0 ? (
                <p className="py-8 text-center text-xs text-muted-foreground">Hali yetarli natija yo&apos;q.</p>
              ) : (
                <div className="divide-y divide-border/40">
                  {topStudents.map((st) => (
                    <div key={st.rank} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                      <div className="flex items-center gap-2.5">
                        <span className={`inline-flex size-6 items-center justify-center rounded-full text-xs font-black ${
                          st.rank === 1
                            ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/40'
                            : st.rank === 2
                            ? 'bg-slate-400/20 text-slate-400 ring-1 ring-slate-400/40'
                            : st.rank === 3
                            ? 'bg-amber-700/20 text-amber-700 ring-1 ring-amber-700/40'
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {st.rank === 1 ? '🥇' : st.rank === 2 ? '🥈' : st.rank === 3 ? '🥉' : st.rank}
                        </span>
                        <div>
                          <p className="font-semibold text-xs text-foreground truncate max-w-[200px]">{st.name}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {st.username ? `@${st.username}` : (st.phone || 'O\'quvchi')} • {st.tests_count} ta test
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400">{st.avg_score}%</p>
                        <p className="text-[10px] text-muted-foreground">Max: {st.max_score}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

        </div>

      </div>
    </PanelShell>
  );
}
