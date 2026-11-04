'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import TrendChart from '@/components/ads/TrendChart';
import {
  CampaignStatusBadge, DateRange, EmptyState, ErrorNote, LeadStatusBadge, Metric, PageTitle, Panel, PanelHeader,
  SkeletonRows, defaultRange,
} from '@/components/ads/ui';
import {
  CAMPAIGN_STATUS_LABEL, NA, adsApi, fmtDate, fmtNum, fmtPct, type CampaignStatus, type DashboardData,
} from '@/lib/ads-api';

const STATUS_ORDER: CampaignStatus[] = ['active', 'scheduled', 'pending_review', 'paused', 'exhausted', 'draft', 'rejected', 'ended'];

export default function AdsDashboardPage() {
  const [range, setRange] = useState(defaultRange(30));
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setError('');
    adsApi.dashboard(range.from, range.to)
      .then((d) => { if (!cancelled) setData(d); })
      .catch((e) => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, [range]);

  const t = data?.totals;
  const hasCampaigns = data && Object.keys(data.status_summary).length > 0;

  return (
    <>
      <PageTitle
        title="Umumiy ko'rinish"
        description="Barcha ko'rsatkichlar haqiqiy hodisalardan hisoblanadi. O'lchanmaydigan qiymatlar N/A deb ko'rsatiladi."
        actions={<>
          <DateRange from={range.from} to={range.to} onChange={(from, to) => setRange({ from, to })} />
          <Button asChild size="sm"><Link href="/campaigns/new"><Plus /> Kampaniya</Link></Button>
        </>}
      />
      {error && <div className="mb-4"><ErrorNote message={error} /></div>}

      <Panel className="mb-6">
        {!t ? <SkeletonRows rows={2} /> : (
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-[var(--border-soft)] sm:grid-cols-3 lg:grid-cols-5">
            <Metric label="Faol kampaniyalar" value={fmtNum(data!.active_campaigns)} />
            <Metric label="Ko'rsatish" value={fmtNum(t.impressions)} />
            <Metric label="Noyob qamrov" value={fmtNum(t.reach)} hint="Davrdagi noyob ko'ruvchilar" />
            <Metric label="Bosish" value={fmtNum(t.clicks)} />
            <Metric label="CTR" value={fmtPct(t.ctr)} />
            <Metric label="Lidlar" value={fmtNum(t.leads)} />
            <Metric label="Ro'yxatdan o'tgan" value={fmtNum(t.enrolled)} />
            <Metric label="Konversiya" value={fmtPct(t.conversion_rate)} hint="Enrolled / lidlar" />
            <Metric label="Sarf" value={NA} muted hint="Billing ulanmagan" />
            <Metric label="Qolgan lid limiti" value={data!.remaining_leads === null ? NA : fmtNum(data!.remaining_leads)} muted={data!.remaining_leads === null} hint="Byudjet = lid limiti" />
          </div>
        )}
      </Panel>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <PanelHeader title="Dinamika" description={data?.tracking_since
            ? `Kunlik statistika ${fmtDate(data.tracking_since)} dan beri yoziladi.`
            : "Kunlik statistika hali yozilmagan — birinchi ko'rsatishdan keyin paydo bo'ladi."} />
          {data ? <TrendChart data={data.series} /> : <SkeletonRows rows={5} />}
        </Panel>

        <Panel>
          <PanelHeader title="Kampaniya holatlari" />
          {!data ? <SkeletonRows /> : !hasCampaigns ? (
            <EmptyState title="Kampaniya yo'q" description="Birinchi kampaniyani yarating va moderatsiyaga yuboring."
              action={<Button asChild size="sm"><Link href="/campaigns/new">Kampaniya yaratish</Link></Button>} />
          ) : (
            <ul className="divide-y divide-[var(--border-soft)]">
              {STATUS_ORDER.filter((s) => data.status_summary[s]).map((s) => (
                <li key={s}>
                  <Link href={`/campaigns?status=${s}`} className="flex items-center justify-between px-5 py-3 hover:bg-[var(--surface-hover)]">
                    <CampaignStatusBadge status={s} />
                    <span className="sr-only">{CAMPAIGN_STATUS_LABEL[s]}</span>
                    <span className="text-[14px] font-semibold tabular-nums">{data.status_summary[s]}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel className="lg:col-span-2">
          <PanelHeader title="Kampaniyalar taqqoslash" description="Umrbod jami ko'rsatkichlar"
            actions={<Link href="/analytics" className="text-[13px] font-medium text-[var(--brand-text)] hover:underline">Analitika →</Link>} />
          {!data ? <SkeletonRows /> : data.top_campaigns.length === 0 ? (
            <EmptyState title="Ma'lumot yo'q" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-[13px]">
                <thead>
                  <tr className="text-left text-[12px] text-[var(--text-faint)]">
                    <th className="px-5 py-2 font-medium">Kampaniya</th>
                    <th className="px-3 py-2 text-right font-medium">Ko&apos;rsatish</th>
                    <th className="px-3 py-2 text-right font-medium">CTR</th>
                    <th className="px-3 py-2 text-right font-medium">Lid</th>
                    <th className="px-5 py-2 text-right font-medium">Konversiya</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-soft)]">
                  {data.top_campaigns.map((c) => (
                    <tr key={c.id} className="hover:bg-[var(--surface-hover)]">
                      <td className="px-5 py-2.5">
                        <Link href={`/campaigns/${c.id}`} className="font-medium hover:underline">{c.title}</Link>
                        <div className="mt-0.5"><CampaignStatusBadge status={c.status} /></div>
                      </td>
                      <td className="px-3 text-right tabular-nums">{fmtNum(c.metrics.impressions)}</td>
                      <td className="px-3 text-right tabular-nums">{fmtPct(c.metrics.ctr)}</td>
                      <td className="px-3 text-right tabular-nums">{fmtNum(c.metrics.leads)}</td>
                      <td className="px-5 text-right tabular-nums">{fmtPct(c.metrics.conversion_rate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel>
          <PanelHeader title="So'nggi lidlar" actions={<Link href="/leads" className="text-[13px] font-medium text-[var(--brand-text)] hover:underline">Barchasi →</Link>} />
          {!data ? <SkeletonRows /> : data.recent_leads.length === 0 ? (
            <EmptyState title="Hali lid yo'q" description="O'quvchi rozilik bilan ariza qoldirganda shu yerda ko'rinadi." />
          ) : (
            <ul className="divide-y divide-[var(--border-soft)]">
              {data.recent_leads.map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-medium">{l.full_name}</div>
                    <div className="truncate text-[12px] text-[var(--text-muted)]">{l.campaign_title} · {fmtDate(l.created_at, true)}</div>
                  </div>
                  <LeadStatusBadge status={l.status} />
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
