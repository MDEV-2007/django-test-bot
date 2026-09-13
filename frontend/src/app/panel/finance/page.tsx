'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Wallet, TrendingUp, Calendar, CreditCard, ArrowUpRight, CheckCircle2,
  Clock, AlertCircle, ShoppingBag, Globe, Send, RefreshCw, BarChart3,
} from 'lucide-react';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';
import PanelShell from '@/components/panel/PanelShell';
import PageHeader from '@/components/panel/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig,
} from '@/components/ui/chart';

type FinanceData = {
  summary: {
    total_revenue: number;
    today_revenue: number;
    month_revenue: number;
    approved_count: number;
    pending_count: number;
    avg_check: number;
  };
  daily_revenue: { date: string; amount: number; count: number }[];
  by_plan: { name: string; plan_type: string; amount: number; count: number }[];
  by_source: { source: string; label: string; amount: number; count: number }[];
  status_counts: {
    approved: number;
    pending: number;
    rejected: number;
    awaiting_screenshot: number;
  };
};

const chartConfig = {
  amount: { label: "Tushum (so'm)", color: '#10b981' },
} satisfies ChartConfig;

export default function FinancePage() {
  const [data, setData] = useState<FinanceData | null>(null);
  const [loading, setLoading] = useState(true);

  function loadFinance() {
    setLoading(true);
    apiFetch<FinanceData>('/api/panel/finance/')
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : "Moliya ma'lumotlarini yuklashda xatolik");
        setLoading(false);
      });
  }

  useEffect(() => {
    loadFinance();
  }, []);

  const summary = data?.summary;
  const dailySeries = data?.daily_revenue || [];
  const byPlan = data?.by_plan || [];
  const bySource = data?.by_source || [];
  const statusCounts = data?.status_counts;

  const totalPlanRevenue = byPlan.reduce((sum, p) => sum + p.amount, 0) || 1;
  const totalSourceRevenue = bySource.reduce((sum, s) => sum + s.amount, 0) || 1;

  return (
    <PanelShell>
      <div className="space-y-6">
        <PageHeader
          title="Moliya va Daromad Analitikasi"
          description="Platformaning real tushumlari, o'sish sur'ati, tariflar va to'lov manbalari tahlili."
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadFinance}
                disabled={loading}
                className="gap-1.5 text-xs h-9 border-[#262c3d] bg-[#11141c] text-slate-300 hover:text-white"
              >
                <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} /> Yangilash
              </Button>
              <Link href="/panel/payments">
                <Button size="sm" className="gap-1.5 text-xs h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-medium">
                  <CreditCard className="size-3.5" /> Barcha To&apos;lovlar
                </Button>
              </Link>
            </div>
          }
        />

        {/* 4 ta asosiy moliyaviy KPI kartochkasi */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-[#1e2330] bg-[#11141c]/95 p-5 shadow-xs">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
              <Wallet className="size-4 text-emerald-400" />
              <span>Jami Sof Tushum</span>
            </div>
            <p className="mt-2 font-mono text-2xl font-bold tracking-tight text-white">
              {(summary?.total_revenue || 0).toLocaleString('uz-UZ')} so&apos;m
            </p>
            <p className="mt-1 text-xs text-slate-500">{summary?.approved_count || 0} ta tasdiqlangan to&apos;lov</p>
          </div>

          <div className="rounded-2xl border border-[#1e2330] bg-[#11141c]/95 p-5 shadow-xs">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
              <Calendar className="size-4 text-sky-400" />
              <span>Shu Oydagi Tushum</span>
            </div>
            <p className="mt-2 font-mono text-2xl font-bold tracking-tight text-white">
              {(summary?.month_revenue || 0).toLocaleString('uz-UZ')} so&apos;m
            </p>
            <p className="mt-1 text-xs text-slate-500">Oy boshidan buyon</p>
          </div>

          <div className="rounded-2xl border border-[#1e2330] bg-[#11141c]/95 p-5 shadow-xs">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
              <TrendingUp className="size-4 text-amber-400" />
              <span>Bugungi Tushum</span>
            </div>
            <p className="mt-2 font-mono text-2xl font-bold tracking-tight text-white">
              {(summary?.today_revenue || 0).toLocaleString('uz-UZ')} so&apos;m
            </p>
            <p className="mt-1 text-xs text-slate-500">Bugun tasdiqlangan</p>
          </div>

          <div className="rounded-2xl border border-[#1e2330] bg-[#11141c]/95 p-5 shadow-xs">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
              <CreditCard className="size-4 text-purple-400" />
              <span>O&apos;rtacha Chek (ARPU)</span>
            </div>
            <p className="mt-2 font-mono text-2xl font-bold tracking-tight text-white">
              {(summary?.avg_check || 0).toLocaleString('uz-UZ')} so&apos;m
            </p>
            <p className="mt-1 text-xs text-slate-500">Bitta to&apos;lovga to&apos;g&apos;ri keladi</p>
          </div>
        </div>

        {/* 30 Kunlik Daromad Grafigi */}
        <div className="rounded-2xl border border-[#1e2330] bg-[#11141c]/95 p-5 shadow-xs">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-white">30 Kunlik Daromad Dinamikasi</h3>
            <p className="text-xs text-slate-400 mt-0.5">Kunlik tasdiqlangan tushumlar hajmi (so&apos;mda)</p>
          </div>

          {dailySeries.length > 0 && (
            <ChartContainer config={chartConfig} className="h-64 w-full">
              <AreaChart data={dailySeries} margin={{ left: -10, right: 10, top: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e2330" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#revGrad)"
                />
              </AreaChart>
            </ChartContainer>
          )}
        </div>

        {/* Ikki ustunli tahlil: Tariflar va Manbalar */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Tariflar bo'yicha tushum */}
          <div className="rounded-2xl border border-[#1e2330] bg-[#11141c]/95 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#1e2330] pb-3">
              <div>
                <h3 className="text-sm font-semibold text-white">Tariflar Bo&apos;yicha Tushum</h3>
                <p className="text-xs text-slate-400 mt-0.5">Qaysi tarif paketi eng ko&apos;p daromad keltirmoqda</p>
              </div>
              <ShoppingBag className="size-4 text-sky-400" />
            </div>

            <div className="space-y-4">
              {byPlan.map((p, i) => {
                const pct = Math.round((p.amount / totalPlanRevenue) * 100);
                return (
                  <div key={i} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-200">{p.name}</span>
                      <span className="font-mono text-slate-400">
                        {p.amount.toLocaleString()} so&apos;m ({pct}%) • {p.count} ta
                      </span>
                    </div>
                    <Progress value={pct} className="h-2 bg-[#1b202c]" />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Manbalar va To'lov holatlari */}
          <div className="rounded-2xl border border-[#1e2330] bg-[#11141c]/95 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#1e2330] pb-3">
              <div>
                <h3 className="text-sm font-semibold text-white">To&apos;lov Manbalari & Voronka</h3>
                <p className="text-xs text-slate-400 mt-0.5">Web ilova va Telegram bot orqali tushumlar</p>
              </div>
              <Globe className="size-4 text-emerald-400" />
            </div>

            <div className="space-y-3">
              {bySource.map((s, i) => {
                const pct = Math.round((s.amount / totalSourceRevenue) * 100);
                return (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-[#171b26] border border-[#222838]">
                    <div className="flex items-center gap-2.5">
                      {s.source === 'bot' ? (
                        <Send className="size-4 text-sky-400" />
                      ) : (
                        <Globe className="size-4 text-emerald-400" />
                      )}
                      <div>
                        <p className="text-xs font-semibold text-white">{s.label}</p>
                        <p className="text-[11px] text-slate-400">{s.count} ta muvaffaqiyatli to&apos;lov</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-xs font-bold text-white">{s.amount.toLocaleString()} so&apos;m</p>
                      <p className="text-[11px] text-slate-400 font-mono">{pct}% ulush</p>
                    </div>
                  </div>
                );
              })}

              <div className="grid grid-cols-3 gap-2 pt-2">
                <div className="rounded-xl border border-emerald-900/40 bg-emerald-950/20 p-3 text-center">
                  <p className="text-[11px] text-emerald-400 font-medium">Tasdiqlangan</p>
                  <p className="font-mono text-lg font-bold text-emerald-300 mt-0.5">{statusCounts?.approved || 0}</p>
                </div>
                <div className="rounded-xl border border-amber-900/40 bg-amber-950/20 p-3 text-center">
                  <p className="text-[11px] text-amber-400 font-medium">Kutayotgan</p>
                  <p className="font-mono text-lg font-bold text-amber-300 mt-0.5">{statusCounts?.pending || 0}</p>
                </div>
                <div className="rounded-xl border border-rose-900/40 bg-rose-950/20 p-3 text-center">
                  <p className="text-[11px] text-rose-400 font-medium">Rad etilgan</p>
                  <p className="font-mono text-lg font-bold text-rose-300 mt-0.5">{statusCounts?.rejected || 0}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PanelShell>
  );
}
