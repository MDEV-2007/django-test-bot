'use client';

import { useEffect, useState } from 'react';
import {
  Server, Database, Zap, Cpu, RefreshCw, Trash2, CheckCircle2,
  XCircle, Clock, ShieldCheck, HardDrive, Terminal, FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';
import PanelShell from '@/components/panel/PanelShell';
import PageHeader from '@/components/panel/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

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

export default function SystemHealthPage() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [flushing, setFlushing] = useState(false);

  function loadHealth() {
    setLoading(true);
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
          console.warn("Logs load failed:", logsRes.reason);
        }
        setLoading(false);
      })
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : "Tizim holatini yuklashda xatolik");
        setLoading(false);
      });
  }

  useEffect(() => {
    loadHealth();
  }, []);

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
          title="Tizim Salomatligi & Server Monitoringi"
          description="Baza ulanishi, Redis kesh tezligi, muhit parametrlari va server xatoliklar logi."
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadHealth}
                disabled={loading}
                className="gap-1.5 text-xs h-9 border-[#262c3d] bg-[#11141c] text-slate-300 hover:text-white"
              >
                <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} /> Tekshirish
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleFlushCache}
                disabled={flushing}
                className="gap-1.5 text-xs h-9 bg-rose-600 hover:bg-rose-700 text-white font-medium"
              >
                <Trash2 className="size-3.5" /> {flushing ? "Tozalanmoqda..." : "Keshni Tozalash (Flush)"}
              </Button>
            </div>
          }
        />

        {/* Asosiy komponentlar holati */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Umumiy Server Holati */}
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
              Vaqt mintaqasi: {env?.time_zone || 'Osiyo/Toshkent'}
            </p>
          </div>

          {/* PostgreSQL Baza */}
          <div className="rounded-2xl border border-[#1e2330] bg-[#11141c]/95 p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
                <Database className="size-4 text-emerald-400" />
                <span>PostgreSQL Ma&apos;lumotlar Bazasi</span>
              </div>
              <span className="font-mono text-xs text-emerald-400">{health?.database?.latency_ms || 0} ms</span>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <CheckCircle2 className="size-5 text-emerald-400" />
              <p className="text-lg font-bold text-white">Ulangan (Connected)</p>
            </div>
            <p className="mt-1 text-xs text-slate-500">Jadval so&apos;rovlari kechikishsiz ishlamoqda</p>
          </div>

          {/* Redis Kesh */}
          <div className="rounded-2xl border border-[#1e2330] bg-[#11141c]/95 p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
                <Zap className="size-4 text-amber-400" />
                <span>Redis & Tezkor Kesh</span>
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

        {/* Server parametrlari va Jadvallar statistikasi */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Muhit parametrlari */}
          <div className="rounded-2xl border border-[#1e2330] bg-[#11141c]/95 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#1e2330] pb-3">
              <h3 className="text-sm font-semibold text-white">Dasturiy Muhit (Runtime)</h3>
              <Cpu className="size-4 text-sky-400" />
            </div>

            <div className="divide-y divide-[#1e2330] text-xs">
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-slate-400">Python versiyasi</span>
                <span className="font-mono font-medium text-white">{env?.python_version || '3.12'}</span>
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
                <span className="text-slate-400">Serverning joriy vaqti</span>
                <span className="font-mono text-slate-300">
                  {env?.server_time ? new Date(env.server_time).toLocaleString('uz-UZ') : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Ma'lumotlar hajmi */}
          <div className="rounded-2xl border border-[#1e2330] bg-[#11141c]/95 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#1e2330] pb-3">
              <h3 className="text-sm font-semibold text-white">Baza Yozuvlari Hajmi (Table Counts)</h3>
              <HardDrive className="size-4 text-emerald-400" />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="rounded-xl bg-[#171b26] p-3 border border-[#222838]">
                <p className="text-[11px] text-slate-400">Foydalanuvchilar</p>
                <p className="font-mono text-lg font-bold text-white mt-1">{tables.users || 0}</p>
              </div>
              <div className="rounded-xl bg-[#171b26] p-3 border border-[#222838]">
                <p className="text-[11px] text-slate-400">Test Urinishlari</p>
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

        {/* Server Voqealari & Loglar (Terminal Viewer) */}
        <div className="rounded-2xl border border-[#1e2330] bg-[#0c0e14] overflow-hidden shadow-sm">
          <div className="p-3.5 bg-[#12151f] border-b border-[#1e2330] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="size-4 text-emerald-400" />
              <span className="text-xs font-mono font-semibold text-slate-200">Server Voqealari & Xatoliklar Jurnali (Logs)</span>
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
    </PanelShell>
  );
}
