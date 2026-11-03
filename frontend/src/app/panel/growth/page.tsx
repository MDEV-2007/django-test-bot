'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, Users, CalendarDays, CalendarRange, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';
import PanelShell from '@/components/panel/PanelShell';
import PageHeader from '@/components/panel/PageHeader';
import { Button } from '@/components/ui/button';

type GrowthData = {
  generated_at: string;
  tracking_since: string | null;
  students_total: number;
  activity: { dau: number; wau: number; mau: number; series: { date: string; dau: number }[] };
  retention: { week_start: string; size: number; d1: number | null; d7: number | null }[];
  monetization: {
    window_days: number;
    steps: { key: string; label: string; users: number }[];
    revenue: string;
    paying_now: number;
    parent_invoices_sent: number;
  };
  sources?: { source: string; signups: number; activated: number; active_7d: number; paid: number }[];
  source_window_days?: number;
};

const pct = (part: number, whole: number) => (whole ? `${Math.round((part / whole) * 100)}%` : '—');

const fmtPct = (v: number | null) => (v === null ? '—' : `${v}%`);

function Kpi({ icon: Icon, label, value, hint }: { icon: typeof Users; label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-[#1e2330] bg-[#11141c]/95 p-5">
      <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
        <Icon className="size-4 text-emerald-400" />
        <span>{label}</span>
      </div>
      <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-white">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

export default function GrowthPage() {
  const [data, setData] = useState<GrowthData | null>(null);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    apiFetch<GrowthData>('/api/analytics/growth/')
      .then(setData)
      .catch((e) => toast.error(e instanceof Error ? e.message : "Metrikalarni yuklashda xatolik"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  const a = data?.activity;
  const m = data?.monetization;
  const maxDau = Math.max(1, ...(a?.series.map((s) => s.dau) || [0]));
  const firstStep = m?.steps[0]?.users || 0;

  return (
    <PanelShell>
      <div className="space-y-6">
        <PageHeader
          title="O'sish metrikalari"
          description="Faol o'quvchilar, qaytish va to'lov voronkasi. Faqat o'quvchilar hisoblanadi."
          actions={
            <Button
              variant="outline"
              size="sm"
              onClick={load}
              disabled={loading}
              className="h-9 gap-1.5 border-[#262c3d] bg-[#11141c] text-xs text-slate-300 hover:text-white"
            >
              <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} /> Yangilash
            </Button>
          }
        />

        {data && !data.tracking_since && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
            Faollik hali yozilmagan. O&apos;quvchilar saytga kirgan sari DAU va qaytish ko&apos;rsatkichlari to&apos;planadi.
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi icon={Users} label="Bugun faol (DAU)" value={String(a?.dau ?? '—')} hint={`Jami o'quvchilar: ${data?.students_total ?? '—'}`} />
          <Kpi icon={CalendarDays} label="7 kunda faol (WAU)" value={String(a?.wau ?? '—')} />
          <Kpi icon={CalendarRange} label="30 kunda faol (MAU)" value={String(a?.mau ?? '—')}
               hint={a && a.mau ? `DAU/MAU: ${Math.round((a.dau / a.mau) * 100)}%` : undefined} />
          <Kpi icon={Wallet} label={`Tushum (${m?.window_days ?? 30} kun)`}
               value={m ? `${Number(m.revenue).toLocaleString('uz-UZ')} so'm` : '—'}
               hint={m ? `Hozir PRO: ${m.paying_now} ta` : undefined} />
        </div>

        <section className="rounded-2xl border border-[#1e2330] bg-[#11141c]/95 p-5">
          <h2 className="text-sm font-semibold text-white">Kunlik faol o&apos;quvchilar — 30 kun</h2>
          <div className="mt-4 flex h-32 items-end gap-1" role="img" aria-label="Kunlik faol o'quvchilar grafigi">
            {a?.series.map((s) => (
              <div key={s.date} className="group relative flex-1">
                <div
                  className="w-full rounded-t-sm bg-emerald-500/70 group-hover:bg-emerald-400"
                  style={{ height: `${Math.max(2, (s.dau / maxDau) * 128)}px` }}
                />
                <span className="pointer-events-none absolute -top-6 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-black px-1.5 py-0.5 text-xs text-white group-hover:block">
                  {s.date.slice(5)}: {s.dau}
                </span>
              </div>
            ))}
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-[#1e2330] bg-[#11141c]/95 p-5">
            <h2 className="text-sm font-semibold text-white">Qaytish (haftalik kogortalar)</h2>
            <p className="mt-1 text-xs text-slate-400">
              D1 — ertasi kuni, D7 — 7-kuni qaytganlar ulushi.
              {data?.tracking_since && ` Yozuv ${data.tracking_since} dan boshlangan.`}
            </p>
            <table className="mt-4 w-full text-sm">
              <thead className="text-left text-xs text-slate-400">
                <tr><th className="py-1.5">Hafta</th><th>Yangi</th><th>D1</th><th>D7</th></tr>
              </thead>
              <tbody className="tabular-nums text-slate-200">
                {data?.retention.length ? data.retention.map((c) => (
                  <tr key={c.week_start} className="border-t border-[#1e2330]">
                    <td className="py-1.5">{c.week_start}</td>
                    <td>{c.size}</td>
                    <td>{fmtPct(c.d1)}</td>
                    <td>{fmtPct(c.d7)}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={4} className="py-3 text-xs text-slate-400">Hali ma&apos;lumot yo&apos;q.</td></tr>
                )}
              </tbody>
            </table>
          </section>

          <section className="rounded-2xl border border-[#1e2330] bg-[#11141c]/95 p-5">
            <h2 className="text-sm font-semibold text-white">To&apos;lov voronkasi — {m?.window_days ?? 30} kun</h2>
            <p className="mt-1 text-xs text-slate-400">Har bosqichdagi noyob o&apos;quvchilar soni.</p>
            <ol className="mt-4 space-y-2.5">
              {m?.steps.map((s) => (
                <li key={s.key}>
                  <div className="flex justify-between text-xs text-slate-300">
                    <span>{s.label}</span>
                    <span className="tabular-nums">{s.users}</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-[#1e2330]">
                    <div
                      className="h-2 rounded-full bg-emerald-500"
                      style={{ width: `${firstStep ? Math.min(100, (s.users / firstStep) * 100) : 0}%` }}
                    />
                  </div>
                </li>
              ))}
            </ol>
            {m && (
              <p className="mt-4 text-xs text-slate-400">
                Ota-onaga yuborilgan to&apos;lov so&apos;rovlari: <span className="tabular-nums text-slate-200">{m.parent_invoices_sent}</span>
              </p>
            )}
          </section>
        </div>

        <section className="rounded-2xl border border-[#1e2330] bg-[#11141c]/95 p-5">
          <h2 className="text-sm font-semibold text-white">
            Manbalar bo&apos;yicha — {data?.source_window_days ?? 90} kun
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Reklama havolasi: <code className="text-slate-300">?src=ig_w1_a</code> (sayt) yoki{' '}
            <code className="text-slate-300">?start=ig_w1_a</code> (bot). Faollashdi = kamida 1 ta test tugatdi.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="text-left text-xs text-slate-400">
                <tr>
                  <th className="py-1.5">Manba</th>
                  <th>Ro&apos;yxatdan o&apos;tdi</th>
                  <th>Faollashdi</th>
                  <th>7 kunda faol</th>
                  <th>To&apos;ladi</th>
                </tr>
              </thead>
              <tbody className="tabular-nums text-slate-200">
                {data?.sources?.length ? data.sources.map((r) => (
                  <tr key={r.source} className="border-t border-[#1e2330]">
                    <td className="py-1.5 font-medium">{r.source}</td>
                    <td>{r.signups}</td>
                    <td>{r.activated} <span className="text-xs text-slate-400">({pct(r.activated, r.signups)})</span></td>
                    <td>{r.active_7d} <span className="text-xs text-slate-400">({pct(r.active_7d, r.signups)})</span></td>
                    <td>{r.paid} <span className="text-xs text-slate-400">({pct(r.paid, r.signups)})</span></td>
                  </tr>
                )) : (
                  <tr><td colSpan={5} className="py-3 text-xs text-slate-400">Hali manba bilan ro&apos;yxatdan o&apos;tganlar yo&apos;q.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </PanelShell>
  );
}
