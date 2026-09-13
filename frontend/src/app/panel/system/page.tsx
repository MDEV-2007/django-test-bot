'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Server, Database, Zap, Cpu, RefreshCw, Trash2, CheckCircle2,
  XCircle, Clock, ShieldCheck, ShieldAlert, HardDrive, Terminal,
  Download, Bot, AlertTriangle, Activity, BarChart3, Eye, FileDown
} from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch, API_URL } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import PanelShell from '@/components/panel/PanelShell';
import PageHeader from '@/components/panel/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

// Types
type SystemHealth = {
  status: 'healthy' | 'degraded';
  database: { status: string; latency_ms: number };
  cache: { status: string; latency_ms: number };
  environment: {
    python_version: string;
    django_version: string;
    server_time: string;
    debug_mode: boolean;
    time_zone: string;
  };
  table_counts: Record<string, number>;
};

type TabSwitcher = {
  attempt_id: number;
  student_name: string;
  username: string;
  test_title: string;
  tab_switch_count: number;
  score: number;
  started_at: string | null;
};

type SpeedFlag = {
  attempt_id: number;
  student_name: string;
  username: string;
  test_title: string;
  score: number;
  elapsed_seconds: number;
  allowed_minutes: number;
  completed_at: string | null;
};

type AntiCheatData = {
  tab_switchers: TabSwitcher[];
  speed_flags: SpeedFlag[];
  summary: {
    total_completed: number;
    tab_issue_count: number;
    speed_flag_count: number;
    tab_issue_pct: number;
    speed_flag_pct: number;
  };
};

type BackupFile = {
  filename: string;
  size_bytes: number;
  size_display: string;
  created_at: number;
};

type AIUsageData = {
  summary: {
    total_tokens: number;
    total_cost_usd: number;
    total_calls: number;
    today_tokens: number;
    today_cost_usd: number;
    today_calls: number;
    month_tokens: number;
    month_cost_usd: number;
    month_calls: number;
    success_rate: number;
    avg_response_ms: number;
    failed_calls: number;
  };
  daily_usage: { date: string; tokens: number; cost: number; calls: number }[];
  by_model: { model: string; tokens: number; cost: number; calls: number }[];
  recent_errors: { endpoint: string; error: string; at: string | null }[];
};

type TabKey = 'health' | 'anticheat' | 'backup' | 'ai';

export default function SystemHealthPage() {
  const { access } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabKey>('health');

  // Health State
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [loadingHealth, setLoadingHealth] = useState(true);
  const [flushing, setFlushing] = useState(false);

  // Anti-Cheat State
  const [antiCheat, setAntiCheat] = useState<AntiCheatData | null>(null);
  const [loadingAntiCheat, setLoadingAntiCheat] = useState(false);

  // Backup State
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [loadingBackups, setLoadingBackups] = useState(false);
  const [creatingBackup, setCreatingBackup] = useState(false);

  // AI Usage State
  const [aiUsage, setAiUsage] = useState<AIUsageData | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  function loadHealth() {
    setLoadingHealth(true);
    Promise.allSettled([
      apiFetch<SystemHealth>('/api/panel/system/health/'),
      apiFetch<{ lines: string[] }>('/api/panel/system/logs/'),
    ])
      .then(([healthRes, logsRes]) => {
        if (healthRes.status === 'fulfilled') {
          setHealth(healthRes.value);
        } else {
          toast.error(healthRes.reason instanceof Error ? healthRes.reason.message : "Tizim holatini yuklashda xatolik");
        }

        if (logsRes.status === 'fulfilled') {
          setLogs(logsRes.value?.lines || []);
        } else {
          setLogs([]);
        }
        setLoadingHealth(false);
      })
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : "Tizim holatini yuklashda xatolik");
        setLoadingHealth(false);
      });
  }

  function loadAntiCheat() {
    setLoadingAntiCheat(true);
    apiFetch<AntiCheatData>('/api/panel/system/anti-cheat/')
      .then((data) => {
        setAntiCheat(data);
        setLoadingAntiCheat(false);
      })
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : "Anti-cheat ma'lumotlarini yuklashda xatolik");
        setLoadingAntiCheat(false);
      });
  }

  function loadBackups() {
    setLoadingBackups(true);
    apiFetch<{ backups: BackupFile[] }>('/api/panel/system/backups/')
      .then((data) => {
        setBackups(data.backups || []);
        setLoadingBackups(false);
      })
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : "Zaxira fayllarini yuklashda xatolik");
        setLoadingBackups(false);
      });
  }

  async function handleCreateBackup() {
    if (!confirm("Ma'lumotlar bazasining to'liq zaxira nusxasini (Backup) yaratishni tasdiqlaysizmi?")) return;
    setCreatingBackup(true);
    try {
      const res = await apiFetch<{ success: boolean; filename: string; size_display: string; message: string }>('/api/panel/system/backup/', {
        method: 'POST',
      });
      toast.success(res.message || "Zaxira muvaffaqiyatli yaratildi!");
      loadBackups();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Zaxiralashda xatolik yuz berdi");
    } finally {
      setCreatingBackup(false);
    }
  }

  function loadAiUsage() {
    setLoadingAi(true);
    apiFetch<AIUsageData>('/api/panel/system/ai-usage/')
      .then((data) => {
        setAiUsage(data);
        setLoadingAi(false);
      })
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : "AI sarfi ma'lumotlarini yuklashda xatolik");
        setLoadingAi(false);
      });
  }

  useEffect(() => {
    loadHealth();
  }, []);

  useEffect(() => {
    if (activeTab === 'anticheat' && !antiCheat) loadAntiCheat();
    if (activeTab === 'backup' && backups.length === 0) loadBackups();
    if (activeTab === 'ai' && !aiUsage) loadAiUsage();
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleFlushCache() {
    if (!confirm("Barcha Redis va tizim keshini tozalashni tasdiqlaysizmi?")) return;
    setFlushing(true);
    try {
      const res = await apiFetch<{ success: boolean; message: string }>('/api/panel/system/flush-cache/', {
        method: 'POST',
      });
      toast.success(res.message || "Kesh tozalandi!");
      loadHealth();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Keshni tozalashda xatolik");
    } finally {
      setFlushing(false);
    }
  }

  const isHealthy = health?.status === 'healthy';
  const env = health?.environment;
  const tables = health?.table_counts || {};

  return (
    <PanelShell>
      <div className="space-y-6">
        <PageHeader
          title="Tizim & Server Boshqaruvi"
          description="Server monitoringi, Anti-Cheat tekshiruvi, DB Backup va AI Groq sarfi nazorati."
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (activeTab === 'health') loadHealth();
                  else if (activeTab === 'anticheat') loadAntiCheat();
                  else if (activeTab === 'backup') loadBackups();
                  else if (activeTab === 'ai') loadAiUsage();
                }}
                disabled={loadingHealth || loadingAntiCheat || loadingBackups || loadingAi}
                className="gap-1.5 text-xs h-9 border-[#262c3d] bg-[#11141c] text-slate-300 hover:text-white"
              >
                <RefreshCw className={`size-3.5 ${(loadingHealth || loadingAntiCheat || loadingBackups || loadingAi) ? 'animate-spin' : ''}`} /> Yangilash
              </Button>
              {activeTab === 'health' && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleFlushCache}
                  disabled={flushing}
                  className="gap-1.5 text-xs h-9 bg-rose-600 hover:bg-rose-700 text-white font-medium"
                >
                  <Trash2 className="size-3.5" /> {flushing ? "Tozalanmoqda..." : "Keshni Tozalash"}
                </Button>
              )}
            </div>
          }
        />

        {/* Tab Tugmalari */}
        <div className="flex items-center gap-2 border-b border-[#1e2330] pb-3 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('health')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'health'
                ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30 shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#141824]'
            }`}
          >
            <Activity className="size-4" /> Server Salomatligi &amp; Logs
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('anticheat')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'anticheat'
                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#141824]'
            }`}
          >
            <ShieldAlert className="size-4" /> Anti-Cheat Dashboard
            {antiCheat?.summary?.tab_issue_count ? (
              <Badge variant="outline" className="ml-1 border-amber-500/40 bg-amber-500/20 text-amber-300 text-[10px] px-1.5 py-0">
                {antiCheat.summary.tab_issue_count}
              </Badge>
            ) : null}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('backup')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'backup'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#141824]'
            }`}
          >
            <HardDrive className="size-4" /> DB Backup (Zaxira)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ai')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'ai'
                ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30 shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#141824]'
            }`}
          >
            <Bot className="size-4" /> AI Groq Token Monitor
          </button>
        </div>

        {/* ======================================================== TAB 1: SERVER HEALTH */}
        {activeTab === 'health' && (
          <div className="space-y-6">
            {/* Asosiy komponentlar holati */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-[#1e2330] bg-[#11141c]/95 p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
                    <Server className="size-4 text-sky-400" />
                    <span>Server Holati</span>
                  </div>
                  <Badge variant="outline" className={isHealthy ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10' : 'border-amber-500/40 text-amber-400'}>
                    {isHealthy ? 'Barqaror (Healthy)' : 'Diqqat (Degraded)'}
                  </Badge>
                </div>
                <p className="mt-3 text-lg font-bold text-white">
                  {isHealthy ? 'Barcha xizmatlar faol' : 'Xizmatlarda kechikish mavjud'}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Vaqt mintaqasi: {env?.time_zone || 'Asia/Tashkent'}
                </p>
              </div>

              <div className="rounded-2xl border border-[#1e2330] bg-[#11141c]/95 p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
                    <Database className="size-4 text-emerald-400" />
                    <span>PostgreSQL Bazasi</span>
                  </div>
                  <span className="font-mono text-xs text-emerald-400">{health?.database?.latency_ms || 0} ms</span>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <CheckCircle2 className="size-5 text-emerald-400" />
                  <p className="text-lg font-bold text-white">Ulangan (Connected)</p>
                </div>
                <p className="mt-1 text-xs text-slate-500">So&apos;rovlar normal tezlikda bajarilmoqda</p>
              </div>

              <div className="rounded-2xl border border-[#1e2330] bg-[#11141c]/95 p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
                    <Zap className="size-4 text-amber-400" />
                    <span>Redis &amp; Tezkor Kesh</span>
                  </div>
                  <span className="font-mono text-xs text-amber-400">{health?.cache?.latency_ms || 0} ms</span>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <CheckCircle2 className="size-5 text-amber-400" />
                  <p className="text-lg font-bold text-white">Faol (Active Cache)</p>
                </div>
                <p className="mt-1 text-xs text-slate-500">Dashboard va sessiyalar keshda saqlanadi</p>
              </div>
            </div>

            {/* Runtime va jadvallar statistikasi */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-[#1e2330] bg-[#11141c]/95 p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-[#1e2330] pb-3">
                  <h3 className="text-sm font-semibold text-white">Dasturiy Muhit (Runtime)</h3>
                  <Cpu className="size-4 text-sky-400" />
                </div>
                <div className="divide-y divide-[#1e2330] text-xs">
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-slate-400">Python versiyasi</span>
                    <span className="font-mono font-medium text-white">{env?.python_version || '3.14'}</span>
                  </div>
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-slate-400">Django versiyasi</span>
                    <span className="font-mono font-medium text-white">{env?.django_version || '5.x'}</span>
                  </div>
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-slate-400">DEBUG Rejimi (Production)</span>
                    <Badge variant="outline" className={env?.debug_mode ? 'border-amber-500 text-amber-400' : 'border-emerald-500 text-emerald-400'}>
                      {env?.debug_mode ? 'ON (DEBUG)' : 'OFF (Qat\'iy Xavfsiz)'}
                    </Badge>
                  </div>
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-slate-400">Server joriy vaqti</span>
                    <span className="font-mono text-slate-300">
                      {env?.server_time ? new Date(env.server_time).toLocaleString('uz-UZ') : '—'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-[#1e2330] bg-[#11141c]/95 p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-[#1e2330] pb-3">
                  <h3 className="text-sm font-semibold text-white">Baza Yozuvlari Hajmi</h3>
                  <HardDrive className="size-4 text-emerald-400" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="rounded-xl bg-[#171b26] p-3 border border-[#222838]">
                    <p className="text-[11px] text-slate-400">Foydalanuvchilar</p>
                    <p className="font-mono text-lg font-bold text-white mt-1">{tables.users || 0}</p>
                  </div>
                  <div className="rounded-xl bg-[#171b26] p-3 border border-[#222838]">
                    <p className="text-[11px] text-slate-400">Urinishlar</p>
                    <p className="font-mono text-lg font-bold text-white mt-1">{tables.attempts || 0}</p>
                  </div>
                  <div className="rounded-xl bg-[#171b26] p-3 border border-[#222838]">
                    <p className="text-[11px] text-slate-400">Test To&apos;plamlari</p>
                    <p className="font-mono text-lg font-bold text-white mt-1">{tables.testsets || 0}</p>
                  </div>
                  <div className="rounded-xl bg-[#171b26] p-3 border border-[#222838]">
                    <p className="text-[11px] text-slate-400">Savollar Bazasi</p>
                    <p className="font-mono text-lg font-bold text-white mt-1">{tables.questions || 0}</p>
                  </div>
                  <div className="rounded-xl bg-[#171b26] p-3 border border-[#222838]">
                    <p className="text-[11px] text-slate-400">Darslar</p>
                    <p className="font-mono text-lg font-bold text-white mt-1">{tables.lessons || 0}</p>
                  </div>
                  <div className="rounded-xl bg-[#171b26] p-3 border border-[#222838]">
                    <p className="text-[11px] text-slate-400">To&apos;lovlar</p>
                    <p className="font-mono text-lg font-bold text-white mt-1">{tables.payments || 0}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Server Logs */}
            <div className="rounded-2xl border border-[#1e2330] bg-[#0c0e14] overflow-hidden shadow-sm">
              <div className="p-3.5 bg-[#12151f] border-b border-[#1e2330] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Terminal className="size-4 text-emerald-400" />
                  <span className="text-xs font-mono font-semibold text-slate-200">Server Voqealari &amp; Xatoliklar Jurnali (Logs)</span>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">So&apos;nggi 100 qator</span>
              </div>
              <div className="p-4 font-mono text-xs text-slate-300 max-h-80 overflow-y-auto space-y-1 select-text bg-[#090b10]">
                {logs.length === 0 ? (
                  <p className="text-slate-500 py-4 text-center">Loglar mavjud emas yoki bo&apos;sh.</p>
                ) : (
                  logs.map((line, i) => (
                    <div key={i} className="hover:bg-slate-900/60 px-1 py-0.5 rounded-sm whitespace-pre-wrap break-all">
                      <span className="text-slate-500 mr-2 select-none">{i + 1}</span>
                      <span className={line.includes('ERROR') || line.includes('crash') ? 'text-rose-400' : (line.includes('WARNING') ? 'text-amber-300' : 'text-slate-300')}>
                        {line.trim()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== TAB 2: ANTI-CHEAT DASHBOARD */}
        {activeTab === 'anticheat' && (
          <div className="space-y-6">
            {/* Statistika Kartochkalari */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
              <div className="rounded-2xl border border-[#1e2330] bg-[#11141c]/95 p-5 shadow-xs">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Jami Yakunlangan Testlar</span>
                  <CheckCircle2 className="size-4 text-sky-400" />
                </div>
                <p className="mt-2 text-2xl font-bold font-mono text-white">
                  {antiCheat?.summary?.total_completed || 0}
                </p>
                <p className="mt-1 text-xs text-slate-500">Platformadagi barcha topshirilgan urinishlar</p>
              </div>

              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 shadow-xs">
                <div className="flex items-center justify-between text-xs text-amber-400">
                  <span>Tab Almashtirganlar (3+)</span>
                  <ShieldAlert className="size-4 text-amber-400" />
                </div>
                <p className="mt-2 text-2xl font-bold font-mono text-amber-300">
                  {antiCheat?.summary?.tab_issue_count || 0}
                </p>
                <p className="mt-1 text-xs text-amber-400/80">
                  Barcha testlarning {antiCheat?.summary?.tab_issue_pct || 0}% qismida
                </p>
              </div>

              <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-5 shadow-xs">
                <div className="flex items-center justify-between text-xs text-rose-400">
                  <span>Shubhali Tezlik Belgisi</span>
                  <AlertTriangle className="size-4 text-rose-400" />
                </div>
                <p className="mt-2 text-2xl font-bold font-mono text-rose-300">
                  {antiCheat?.summary?.speed_flag_count || 0}
                </p>
                <p className="mt-1 text-xs text-rose-400/80">
                  Vaqtning 20% dan kamida topshirilgan ({antiCheat?.summary?.speed_flag_pct || 0}%)
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 shadow-xs">
                <div className="flex items-center justify-between text-xs text-emerald-400">
                  <span>Halol Urinishlar</span>
                  <ShieldCheck className="size-4 text-emerald-400" />
                </div>
                <p className="mt-2 text-2xl font-bold font-mono text-emerald-300">
                  {Math.max(0, (antiCheat?.summary?.total_completed || 0) - (antiCheat?.summary?.tab_issue_count || 0))}
                </p>
                <p className="mt-1 text-xs text-emerald-400/80">Hech qanday ogohlantirishsiz topshirganlar</p>
              </div>
            </div>

            {/* 2 Ta Jadval: Tab Almashtirganlar va Shubhali Tezlik */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Tab Almashtirganlar Jadvali */}
              <div className="rounded-2xl border border-[#1e2330] bg-[#11141c]/95 overflow-hidden shadow-xs">
                <div className="p-4 border-b border-[#1e2330] flex items-center justify-between bg-[#141824]">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <ShieldAlert className="size-4 text-amber-400" /> Ko&apos;p Tab Almashtirganlar (Top 30)
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">Test davomida brauzer tabini almashtirib turganlar</p>
                  </div>
                  <Badge variant="outline" className="border-amber-500/40 text-amber-400 bg-amber-500/10 text-xs">
                    {antiCheat?.tab_switchers?.length || 0} ta holat
                  </Badge>
                </div>

                <div className="overflow-x-auto max-h-96 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#0e1118] text-slate-400 border-b border-[#1e2330] sticky top-0">
                      <tr>
                        <th className="py-2.5 px-3">O&apos;quvchi</th>
                        <th className="py-2.5 px-3">Test</th>
                        <th className="py-2.5 px-3 text-center">Tablar</th>
                        <th className="py-2.5 px-3 text-center">Ball</th>
                        <th className="py-2.5 px-3 text-right">Amal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1e2330]">
                      {(!antiCheat?.tab_switchers || antiCheat.tab_switchers.length === 0) ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-500">
                            Shubhali tab almashtirishlar aniqlanmadi.
                          </td>
                        </tr>
                      ) : (
                        antiCheat.tab_switchers.map((s) => (
                          <tr key={s.attempt_id} className="hover:bg-[#151926] transition-colors">
                            <td className="py-2.5 px-3">
                              <p className="font-semibold text-white truncate max-w-[130px]">{s.student_name}</p>
                              <p className="text-[11px] text-slate-500 font-mono">@{s.username || 'noma\'lum'}</p>
                            </td>
                            <td className="py-2.5 px-3 text-slate-300 truncate max-w-[140px]" title={s.test_title}>
                              {s.test_title}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className="font-mono font-black px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-300">
                                {s.tab_switch_count}x
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-200">
                              {s.score}%
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <Link
                                href={`/panel/attempts/${s.attempt_id}`}
                                className="inline-flex items-center gap-1 text-[11px] text-sky-400 hover:text-sky-300"
                              >
                                <Eye className="size-3" /> Ko&apos;rish
                              </Link>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Shubhali Tezlikda Topshirganlar Jadvali */}
              <div className="rounded-2xl border border-[#1e2330] bg-[#11141c]/95 overflow-hidden shadow-xs">
                <div className="p-4 border-b border-[#1e2330] flex items-center justify-between bg-[#141824]">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <AlertTriangle className="size-4 text-rose-400" /> Shubhali Tezlikda Topshirganlar (Top 30)
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">Ajratilgan vaqtning 20% dan kamida topshirilgan</p>
                  </div>
                  <Badge variant="outline" className="border-rose-500/40 text-rose-400 bg-rose-500/10 text-xs">
                    {antiCheat?.speed_flags?.length || 0} ta holat
                  </Badge>
                </div>

                <div className="overflow-x-auto max-h-96 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#0e1118] text-slate-400 border-b border-[#1e2330] sticky top-0">
                      <tr>
                        <th className="py-2.5 px-3">O&apos;quvchi</th>
                        <th className="py-2.5 px-3">Test</th>
                        <th className="py-2.5 px-3 text-center">Ketgan vaqt</th>
                        <th className="py-2.5 px-3 text-center">Ball</th>
                        <th className="py-2.5 px-3 text-right">Amal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1e2330]">
                      {(!antiCheat?.speed_flags || antiCheat.speed_flags.length === 0) ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-500">
                            Shubhali tezlikda topshirilgan testlar yo&apos;q.
                          </td>
                        </tr>
                      ) : (
                        antiCheat.speed_flags.map((s) => {
                          const mins = Math.floor(s.elapsed_seconds / 60);
                          const secs = s.elapsed_seconds % 60;
                          const timeStr = mins > 0 ? `${mins} daq ${secs} son` : `${secs} son`;
                          return (
                            <tr key={s.attempt_id} className="hover:bg-[#151926] transition-colors">
                              <td className="py-2.5 px-3">
                                <p className="font-semibold text-white truncate max-w-[130px]">{s.student_name}</p>
                                <p className="text-[11px] text-slate-500 font-mono">@{s.username || 'noma\'lum'}</p>
                              </td>
                              <td className="py-2.5 px-3 text-slate-300 truncate max-w-[140px]" title={s.test_title}>
                                {s.test_title}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <span className="font-mono text-rose-300 font-bold px-2 py-0.5 rounded-md bg-rose-500/15 border border-rose-500/30">
                                  ⚡ {timeStr}
                                </span>
                                <span className="block text-[10px] text-slate-500 mt-0.5">
                                  (Limit: {s.allowed_minutes} daq)
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-200">
                                {s.score}%
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <Link
                                  href={`/panel/attempts/${s.attempt_id}`}
                                  className="inline-flex items-center gap-1 text-[11px] text-sky-400 hover:text-sky-300"
                                >
                                  <Eye className="size-3" /> Ko&apos;rish
                                </Link>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== TAB 3: DATABASE BACKUP */}
        {activeTab === 'backup' && (
          <div className="space-y-6">
            {/* One-Click Backup Banner */}
            <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/40 via-[#11141c] to-[#11141c] p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <HardDrive className="size-5 text-emerald-400" />
                  <h3 className="text-base font-bold text-white">One-Click Ma&apos;lumotlar Bazasi Zaxirasi</h3>
                </div>
                <p className="text-xs text-slate-400 max-w-xl">
                  Bitta tugma orqali butun bazaning (foydalanuvchilar, testlar, to&apos;lovlar, darslar) eng so&apos;nggi zaxira nusxasi yaratiladi va serverdagi xavfsiz <code className="text-emerald-300 font-mono">media/backups/</code> papkasida saqlanadi.
                </p>
              </div>

              <Button
                size="default"
                disabled={creatingBackup}
                onClick={handleCreateBackup}
                className="gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 h-11 shrink-0 shadow-md transition-all"
              >
                <Download className={`size-4 ${creatingBackup ? 'animate-bounce' : ''}`} />
                {creatingBackup ? "Zaxira yaratilmoqda..." : "Hozir Zaxiralash (Backup)"}
              </Button>
            </div>

            {/* Mavjud Zaxira Fayllari Ro'yxati */}
            <div className="rounded-2xl border border-[#1e2330] bg-[#11141c]/95 overflow-hidden shadow-xs">
              <div className="p-4 border-b border-[#1e2330] flex items-center justify-between bg-[#141824]">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Database className="size-4 text-emerald-400" /> Mavjud Zaxira Nusxalari (Backups)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Yaratilgan barcha SQL va DB fayllar ro&apos;yxati</p>
                </div>
                <span className="text-xs font-mono text-slate-400">Jami: {backups.length} ta zaxira</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#0e1118] text-slate-400 border-b border-[#1e2330]">
                    <tr>
                      <th className="py-3 px-4">Fayl Nomi</th>
                      <th className="py-3 px-4">Hajmi</th>
                      <th className="py-3 px-4">Yaratilgan Sana</th>
                      <th className="py-3 px-4 text-right">Holat &amp; Saqlash</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e2330]">
                    {backups.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-12 text-center text-slate-500">
                          Hozircha zaxira fayllari mavjud emas. Yuqoridagi &ldquo;Hozir Zaxiralash&rdquo; tugmasini bosing.
                        </td>
                      </tr>
                    ) : (
                      backups.map((b, i) => (
                        <tr key={i} className="hover:bg-[#151926] transition-colors">
                          <td className="py-3 px-4 font-mono font-semibold text-slate-200 flex items-center gap-2">
                            <FileDown className="size-4 text-emerald-400 shrink-0" />
                            <span>{b.filename}</span>
                          </td>
                          <td className="py-3 px-4 font-mono text-emerald-300 font-bold">
                            {b.size_display}
                          </td>
                          <td className="py-3 px-4 text-slate-400 font-mono">
                            {new Date(b.created_at * 1000).toLocaleString('uz-UZ')}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 bg-emerald-500/10 text-xs">
                              ✓ Xavfsiz saqlangan
                            </Badge>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== TAB 4: AI USAGE MONITOR */}
        {activeTab === 'ai' && (
          <div className="space-y-6">
            {/* Stat Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
              <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-5 shadow-xs">
                <div className="flex items-center justify-between text-xs text-purple-400">
                  <span>Jami Sarflangan Tokenlar</span>
                  <Bot className="size-4 text-purple-400" />
                </div>
                <p className="mt-2 text-2xl font-bold font-mono text-purple-200">
                  {(aiUsage?.summary?.total_tokens || 0).toLocaleString('uz-UZ')}
                </p>
                <p className="mt-1 text-xs text-purple-400/80">
                  Jami so&apos;rovlar: {aiUsage?.summary?.total_calls || 0} ta
                </p>
              </div>

              <div className="rounded-2xl border border-[#1e2330] bg-[#11141c]/95 p-5 shadow-xs">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Bugungi Sarf &amp; Narx</span>
                  <Zap className="size-4 text-amber-400" />
                </div>
                <p className="mt-2 text-2xl font-bold font-mono text-white">
                  ${(aiUsage?.summary?.today_cost_usd || 0).toFixed(4)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Bugun: {(aiUsage?.summary?.today_tokens || 0).toLocaleString('uz-UZ')} token ({aiUsage?.summary?.today_calls || 0} ta so&apos;rov)
                </p>
              </div>

              <div className="rounded-2xl border border-[#1e2330] bg-[#11141c]/95 p-5 shadow-xs">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Oylik AI Xarajati</span>
                  <BarChart3 className="size-4 text-emerald-400" />
                </div>
                <p className="mt-2 text-2xl font-bold font-mono text-emerald-300">
                  ${(aiUsage?.summary?.month_cost_usd || 0).toFixed(4)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Shu oy: {(aiUsage?.summary?.month_tokens || 0).toLocaleString('uz-UZ')} token
                </p>
              </div>

              <div className="rounded-2xl border border-[#1e2330] bg-[#11141c]/95 p-5 shadow-xs">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Muvaffaqiyat &amp; Tezlik</span>
                  <Activity className="size-4 text-sky-400" />
                </div>
                <p className="mt-2 text-2xl font-bold font-mono text-sky-300">
                  {aiUsage?.summary?.success_rate ?? 100}%
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  O&apos;rtacha tezlik: {aiUsage?.summary?.avg_response_ms || 0} ms
                </p>
              </div>
            </div>

            {/* Model Bo'yicha Taqsimot */}
            <div className="rounded-2xl border border-[#1e2330] bg-[#11141c]/95 overflow-hidden shadow-xs">
              <div className="p-4 border-b border-[#1e2330] flex items-center justify-between bg-[#141824]">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Cpu className="size-4 text-purple-400" /> AI Modellar Bo&apos;yicha Taqsimot
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Groq va boshqa provayderlar modellarining token sarfi</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#0e1118] text-slate-400 border-b border-[#1e2330]">
                    <tr>
                      <th className="py-3 px-4">Model Nomi</th>
                      <th className="py-3 px-4 text-center">So&apos;rovlar Soni</th>
                      <th className="py-3 px-4 text-center">Sarflangan Tokenlar</th>
                      <th className="py-3 px-4 text-right">Taxminiy Narx ($)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e2330]">
                    {(!aiUsage?.by_model || aiUsage.by_model.length === 0) ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-slate-500">
                          Hozircha AI chaqiruvlari jurnali bo&apos;sh.
                        </td>
                      </tr>
                    ) : (
                      aiUsage.by_model.map((m, i) => (
                        <tr key={i} className="hover:bg-[#151926] transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-slate-200">
                            {m.model}
                          </td>
                          <td className="py-3 px-4 text-center font-mono text-slate-300">
                            {m.calls}
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-bold text-purple-300">
                            {m.tokens.toLocaleString('uz-UZ')}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                            ${m.cost.toFixed(4)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </PanelShell>
  );
}
