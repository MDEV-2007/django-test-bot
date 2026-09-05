'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Users, GraduationCap, UserRound, FileCheck2, BookOpen, Gamepad2,
  Activity, TrendingUp, CreditCard, Wallet, Radio, Crown, AlertTriangle, ArrowRight,
} from 'lucide-react';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import PanelShell from '@/components/panel/PanelShell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';

type HardQuestion = { id: number; text: string; rate: number; total: number };
type AuditRow = { id: number; summary: string; action: string; timestamp: string };

type Dashboard = {
  stats: Record<string, number | string>;
  chart_labels: string[];
  chart_reg: number[];
  chart_attempts: number[];
  hardest_questions: HardQuestion[];
  recent_logs: AuditRow[];
};

const STAT_CARDS: { key: string; label: string; icon: typeof Users; tone: string }[] = [
  { key: 'users', label: 'Foydalanuvchilar', icon: Users, tone: 'text-[var(--accent-text)]' },
  { key: 'teachers', label: "O'qituvchilar", icon: GraduationCap, tone: 'text-sky-400' },
  { key: 'students', label: "O'quvchilar", icon: UserRound, tone: 'text-indigo-400' },
  { key: 'testsets', label: 'Testlar', icon: FileCheck2, tone: 'text-[var(--accent-text)]' },
  { key: 'lessons', label: 'Darslar', icon: BookOpen, tone: 'text-sky-400' },
  { key: 'games', label: "O'yinlar", icon: Gamepad2, tone: 'text-purple-400' },
  { key: 'attempts_today', label: 'Bugungi urinishlar', icon: Activity, tone: 'text-[var(--success-text)]' },
  { key: 'attempts_total', label: 'Jami urinishlar', icon: TrendingUp, tone: 'text-[var(--success-text)]' },
  { key: 'pending_payments', label: "Kutayotgan to'lovlar", icon: CreditCard, tone: 'text-[var(--warning-text)]' },
  { key: 'total_revenue', label: 'Tushum', icon: Wallet, tone: 'text-[var(--warning-text)]' },
  { key: 'active_today', label: 'Bugun faol', icon: Radio, tone: 'text-[var(--success-text)]' },
  { key: 'premium_users', label: 'Premium', icon: Crown, tone: 'text-amber-400' },
];

const ACTION_TONE: Record<string, string> = {
  create: 'bg-[var(--success-soft)] text-[var(--success-text)] border-[var(--success)]/25',
  update: 'bg-primary/12 text-[var(--accent-text)] border-[var(--accent-border)]',
  delete: 'bg-[var(--danger-soft)] text-[var(--danger-text)] border-[var(--danger)]/25',
};
const ACTION_LABEL: Record<string, string> = { create: 'Yaratildi', update: "O'zgardi", delete: "O'chirildi" };

const chartConfig = {
  reg: { label: "Ro'yxatdan o'tish", color: 'var(--chart-1)' },
  attempts: { label: 'Urinishlar', color: 'var(--chart-2)' },
} satisfies ChartConfig;

function fmt(v: number | string) {
  return typeof v === 'number' ? v.toLocaleString('uz-UZ') : v;
}

export default function PanelDashboard() {
  const { access } = useAuthStore();
  const [data, setData] = useState<Dashboard | null>(null);

  useEffect(() => {
    if (!access) return;
    apiFetch<Dashboard>('/api/panel/').then(setData)
      .catch((e) => toast.error(e instanceof Error ? e.message : "Yuklashda xatolik yuz berdi"));
  }, [access]);

  // API kunlik ikkita qatorni alohida massiv qilib yuboradi — recharts uchun birlashtiramiz.
  const series = (data?.chart_labels ?? []).map((label, i) => ({
    label,
    reg: data?.chart_reg?.[i] ?? 0,
    attempts: data?.chart_attempts?.[i] ?? 0,
  }));

  return (
    <PanelShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Boshqaruv paneli</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Platformaning umumiy holati, o&apos;sish dinamikasi va so&apos;nggi harakatlar.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {!data && Array.from({ length: 12 }).map((_, i) => (
            <Card key={`sk-${i}`} className="py-4">
              <CardContent className="px-4">
                <Skeleton className="h-3.5 w-20" />
                <Skeleton className="mt-2 h-6 w-14" />
              </CardContent>
            </Card>
          ))}
          {data && STAT_CARDS.filter((c) => c.key in data.stats).map((c) => {
            const Icon = c.icon;
            return (
              <Card key={c.key} className="gap-0 py-4 transition-colors hover:border-[var(--border-strong)]">
                <CardContent className="px-4">
                  <div className="flex items-center gap-2">
                    <Icon className={`size-3.5 shrink-0 ${c.tone}`} />
                    <p className="truncate text-xs text-muted-foreground">{c.label}</p>
                  </div>
                  <p className="mt-1.5 font-mono text-xl font-bold tabular-nums">{fmt(data.stats[c.key])}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">O&apos;sish dinamikasi</CardTitle>
            <CardDescription>Kunlik ro&apos;yxatdan o&apos;tish va test urinishlari</CardDescription>
          </CardHeader>
          <CardContent>
            {!data && <Skeleton className="h-56 w-full" />}
            {data && series.length > 0 && (
              <ChartContainer config={chartConfig} className="h-56 w-full">
                <AreaChart data={series} margin={{ left: -20, right: 8, top: 8 }}>
                  <defs>
                    <linearGradient id="fillReg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-reg)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--color-reg)" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="fillAttempts" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-attempts)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--color-attempts)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} />
                  <YAxis tickLine={false} axisLine={false} fontSize={11} allowDecimals={false} width={44} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Area dataKey="reg" type="monotone" stroke="var(--color-reg)" fill="url(#fillReg)" strokeWidth={2} />
                  <Area dataKey="attempts" type="monotone" stroke="var(--color-attempts)" fill="url(#fillAttempts)" strokeWidth={2} />
                </AreaChart>
              </ChartContainer>
            )}
            {data && series.length === 0 && (
              <p className="py-10 text-center text-sm text-muted-foreground">Grafik uchun ma&apos;lumot yo&apos;q.</p>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="size-4 text-[var(--warning-text)]" />
                Eng qiyin savollar
              </CardTitle>
              <CardDescription>Eng past to&apos;g&apos;ri javob foizi bo&apos;yicha</CardDescription>
            </CardHeader>
            <CardContent>
              {!data && Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="my-2 h-8 w-full" />)}
              {data?.hardest_questions.length === 0 && (
                <p className="py-6 text-center text-sm text-muted-foreground">Hali yetarli javob yo&apos;q.</p>
              )}
              {data?.hardest_questions.map((q, i) => (
                <div key={q.id}>
                  {i > 0 && <Separator />}
                  <div className="flex items-start justify-between gap-3 py-2.5">
                    <p className="min-w-0 flex-1 text-sm leading-snug text-[var(--text-secondary)]">{q.text}</p>
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
              {!data && Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="my-2 h-8 w-full" />)}
              {data?.recent_logs.length === 0 && (
                <p className="py-6 text-center text-sm text-muted-foreground">Hali yozuv yo&apos;q.</p>
              )}
              {data?.recent_logs.slice(0, 8).map((log, i) => (
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
      </div>
    </PanelShell>
  );
}
