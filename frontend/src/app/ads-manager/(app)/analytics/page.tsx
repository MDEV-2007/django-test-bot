'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import TrendChart from '@/components/ads/TrendChart';
import {
  CampaignStatusBadge, DateRange, EmptyState, ErrorNote, Metric, PageTitle, Panel, PanelHeader, SkeletonRows, defaultRange, inputCls,
} from '@/components/ads/ui';
import { NA, adsApi, fmtDate, fmtNum, fmtPct, type AnalyticsData, type Campaign } from '@/lib/ads-api';
import { cn } from '@/lib/utils';

function toCsv(data: AnalyticsData): string {
  const head = ['date', 'impressions', 'reach', 'clicks', 'leads', 'enrolled'];
  const rows = data.series.map((p) => [p.date, p.impressions, p.reach, p.clicks, p.leads, p.enrolled].join(','));
  return [head.join(','), ...rows].join('\n');
}

export default function AnalyticsPage() {
  const [range, setRange] = useState(defaultRange(30));
  const [campaign, setCampaign] = useState('');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => { adsApi.campaigns().then((r) => setCampaigns(r.campaigns)).catch(() => {}); }, []);
  useEffect(() => {
    let cancelled = false;
    setData(null);
    adsApi.analytics({ ...range, campaign })
      .then((d) => { if (!cancelled) { setData(d); setError(''); } })
      .catch((e) => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, [range, campaign]);

  // Agregat statistika (shaxsiy ma'lumot yo'q) — brauzerda yaratiladi.
  const downloadCsv = () => {
    if (!data) return;
    const blob = new Blob(['﻿' + toCsv(data)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${data.range.from}-${data.range.to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const t = data?.totals;

  return (
    <>
      <PageTitle title="Analitika" description="Kunlik haqiqiy hodisalar: ko'rsatish, noyob qamrov, bosish, lid va ro'yxatdan o'tish."
        actions={<>
          <select aria-label="Kampaniya" value={campaign} onChange={(e) => setCampaign(e.target.value)} className={cn(inputCls, 'h-8 w-auto max-w-[220px] text-[13px]')}>
            <option value="">Barcha kampaniyalar</option>
            {campaigns.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
          <DateRange from={range.from} to={range.to} onChange={(from, to) => setRange({ from, to })} />
          <Button size="sm" variant="outline" disabled={!data} onClick={downloadCsv}><Download /> CSV</Button>
        </>} />
      {error && <div className="mb-4"><ErrorNote message={error} /></div>}

      <Panel className="mb-6">
        {!t ? <SkeletonRows rows={2} /> : (
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-[var(--border-soft)] sm:grid-cols-4 lg:grid-cols-8">
            <Metric label="Ko'rsatish" value={fmtNum(t.impressions)} />
            <Metric label="Qamrov" value={fmtNum(t.reach)} />
            <Metric label="Bosish" value={fmtNum(t.clicks)} />
            <Metric label="CTR" value={fmtPct(t.ctr)} />
            <Metric label="Lidlar" value={fmtNum(t.leads)} />
            <Metric label="Enrolled" value={fmtNum(t.enrolled)} />
            <Metric label="Konversiya" value={fmtPct(t.conversion_rate)} />
            <Metric label="CPL" value={NA} muted hint="Billing yo'q" />
          </div>
        )}
      </Panel>

      <Panel className="mb-6">
        <PanelHeader title="Trend" description={data?.tracking_since ? `Kunlik yozuvlar ${fmtDate(data.tracking_since)} dan beri mavjud; undan oldingi davr bo'sh ko'rinadi.` : 'Kunlik yozuvlar hali yo\'q.'} />
        {data ? <TrendChart data={data.series} height={280} /> : <SkeletonRows rows={6} />}
      </Panel>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <PanelHeader title="Kampaniyalar taqqoslash" description="Tanlangan davr bo'yicha" />
          {!data ? <SkeletonRows /> : data.comparison.length === 0 ? <EmptyState title="Kampaniya yo'q" /> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-[13px]">
                <thead>
                  <tr className="text-left text-[12px] text-[var(--text-faint)]">
                    <th className="px-5 py-2.5 font-medium">Kampaniya</th>
                    <th className="px-3 py-2.5 text-right font-medium">Ko&apos;rsatish</th>
                    <th className="px-3 py-2.5 text-right font-medium">Qamrov</th>
                    <th className="px-3 py-2.5 text-right font-medium">Bosish</th>
                    <th className="px-3 py-2.5 text-right font-medium">CTR</th>
                    <th className="px-3 py-2.5 text-right font-medium">Lid</th>
                    <th className="px-5 py-2.5 text-right font-medium">Konversiya</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-soft)]">
                  {data.comparison.map((c) => (
                    <tr key={c.id} className="hover:bg-[var(--surface-hover)]">
                      <td className="px-5 py-2.5">
                        <Link href={`/campaigns/${c.id}`} className="font-medium hover:underline">{c.title}</Link>
                        <div className="mt-0.5"><CampaignStatusBadge status={c.status} /></div>
                      </td>
                      <td className="px-3 text-right tabular-nums">{fmtNum(c.impressions)}</td>
                      <td className="px-3 text-right tabular-nums">{fmtNum(c.reach)}</td>
                      <td className="px-3 text-right tabular-nums">{fmtNum(c.clicks)}</td>
                      <td className="px-3 text-right tabular-nums">{fmtPct(c.ctr)}</td>
                      <td className="px-3 text-right tabular-nums">{fmtNum(c.leads)}</td>
                      <td className="px-5 text-right tabular-nums">{fmtPct(c.conversion_rate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
        <Panel>
          <PanelHeader title="Ta'riflar" />
          <dl className="space-y-3 px-5 py-4 text-[13px]">
            {data && Object.entries(data.definitions).map(([k, v]) => (
              <div key={k}><dt className="font-medium uppercase tracking-wide text-[11px] text-[var(--text-faint)]">{k}</dt><dd className="text-[var(--text-secondary)]">{v}</dd></div>
            ))}
          </dl>
        </Panel>
      </div>
    </>
  );
}
