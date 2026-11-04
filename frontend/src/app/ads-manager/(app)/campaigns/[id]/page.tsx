'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import AdPreview from '@/components/ads/AdPreview';
import { CampaignActions } from '@/components/ads/CampaignActions';
import TrendChart from '@/components/ads/TrendChart';
import { useAds } from '@/components/ads/AdsShell';
import {
  CampaignStatusBadge, DateRange, ErrorNote, LeadStatusBadge, Metric, PageTitle, Panel, PanelHeader, SkeletonRows, defaultRange,
} from '@/components/ads/ui';
import {
  NA, OBJECTIVE_LABEL, adsApi, fmtDate, fmtNum, fmtPct, type AnalyticsData, type Campaign, type Lead,
} from '@/lib/ads-api';

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { center } = useAds();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [range, setRange] = useState(defaultRange(30));
  const [stats, setStats] = useState<AnalyticsData | null>(null);
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    adsApi.campaign(id).then((r) => setCampaign(r.campaign)).catch((e) => setError(e.message));
    adsApi.leads({ campaign: id }).then((r) => setLeads(r.leads.slice(0, 6))).catch(() => setLeads([]));
  }, [id]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    adsApi.analytics({ ...range, campaign: id }).then(setStats).catch(() => setStats(null));
  }, [id, range]);

  if (error) return <ErrorNote message={error} />;
  if (!campaign) return <SkeletonRows rows={8} />;
  const t = stats?.totals;
  const m = campaign.metrics;

  return (
    <>
      <div className="mb-2 text-[13px]"><Link href="/campaigns" className="text-[var(--text-muted)] hover:underline">← Kampaniyalar</Link></div>
      <PageTitle title={campaign.title}
        description={`${OBJECTIVE_LABEL[campaign.objective]} · yaratilgan ${fmtDate(campaign.created_at)}`}
        actions={<CampaignActions campaign={campaign} onChanged={(c, msg) => {
          if (msg) toast.success(msg);
          if (c.id !== campaign.id) router.push(`/campaigns/${c.id}/edit`); else setCampaign(c);
        }} />} />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <CampaignStatusBadge status={campaign.status} />
        {campaign.status === 'pending_review' && <span className="text-[13px] text-[var(--text-muted)]">Yuborilgan: {fmtDate(campaign.submitted_at, true)}. Administrator tekshiradi.</span>}
        {campaign.status === 'scheduled' && <span className="text-[13px] text-[var(--text-muted)]">Boshlanadi: {fmtDate(campaign.starts_at, true)}</span>}
        {campaign.status === 'exhausted' && <span className="text-[13px] text-[var(--text-muted)]">Lid limiti to&apos;ldi — kampaniya ko&apos;rsatilmayapti. Limitni oshirish moderatsiyasiz.</span>}
      </div>
      {campaign.status === 'rejected' && campaign.review_note && (
        <div className="mb-6"><ErrorNote message={`Rad etish sababi: ${campaign.review_note}`} /></div>
      )}

      <Panel className="mb-6">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-[var(--border-soft)] sm:grid-cols-4 lg:grid-cols-7">
          <Metric label="Ko'rsatish" value={fmtNum(m.impressions)} hint="Umrbod" />
          <Metric label="Bosish" value={fmtNum(m.clicks)} hint="Umrbod" />
          <Metric label="CTR" value={fmtPct(m.ctr)} />
          <Metric label="Lidlar" value={fmtNum(m.leads)} />
          <Metric label="Enrolled" value={fmtNum(m.enrolled)} />
          <Metric label="Qolgan limit" value={m.remaining_leads === null ? NA : fmtNum(m.remaining_leads)} muted={m.remaining_leads === null} />
          <Metric label="Sarf / CPL" value={NA} muted hint="Billing yo'q" />
        </div>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Panel>
            <PanelHeader title="Davr bo'yicha" description={t ? `Qamrov ${fmtNum(t.reach)} · CTR ${fmtPct(t.ctr)} · konversiya ${fmtPct(t.conversion_rate)}` : undefined}
              actions={<DateRange from={range.from} to={range.to} onChange={(from, to) => setRange({ from, to })} />} />
            {stats ? <TrendChart data={stats.series} /> : <SkeletonRows rows={5} />}
          </Panel>
          <Panel>
            <PanelHeader title="So'nggi lidlar" actions={<Link href={`/leads?campaign=${campaign.id}`} className="text-[13px] font-medium text-[var(--brand-text)] hover:underline">Barchasi →</Link>} />
            {!leads ? <SkeletonRows /> : leads.length === 0 ? (
              <p className="px-5 py-6 text-[13px] text-[var(--text-muted)]">Hali lid yo&apos;q.</p>
            ) : (
              <ul className="divide-y divide-[var(--border-soft)]">
                {leads.map((l) => (
                  <li key={l.id} className="flex items-center justify-between gap-3 px-5 py-3 text-[13px]">
                    <span className="truncate font-medium">{l.full_name}</span>
                    <span className="hidden text-[var(--text-muted)] sm:inline">{fmtDate(l.created_at, true)}</span>
                    <LeadStatusBadge status={l.status} />
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
        <div className="space-y-6">
          <Panel className="p-5">
            <AdPreview title={campaign.title} description={campaign.description || ''} badge={campaign.offer_badge} cta={campaign.cta_text}
              bannerUrl={campaign.banner_url} logoUrl={campaign.logo} centerName={center.name} />
          </Panel>
          <Panel>
            <PanelHeader title="Sozlamalar" />
            <dl className="grid grid-cols-[120px_1fr] gap-x-3 gap-y-2.5 px-5 py-4 text-[13px]">
              <dt className="text-[var(--text-muted)]">Fan</dt><dd>{campaign.target_subject === 'ALL' ? 'Barchasi' : campaign.target_subject}</dd>
              <dt className="text-[var(--text-muted)]">Hudud</dt><dd>{campaign.target_region === 'ALL' ? 'Barchasi' : campaign.target_region}</dd>
              <dt className="text-[var(--text-muted)]">Natija</dt><dd>{(campaign.max_score_threshold ?? 100) >= 100 ? 'Cheklanmagan' : `${campaign.max_score_threshold}% gacha`}</dd>
              <dt className="text-[var(--text-muted)]">Boshlanish</dt><dd>{campaign.starts_at ? fmtDate(campaign.starts_at, true) : 'Darhol'}</dd>
              <dt className="text-[var(--text-muted)]">Tugash</dt><dd>{campaign.ends_at ? fmtDate(campaign.ends_at, true) : 'Muddatsiz'}</dd>
              <dt className="text-[var(--text-muted)]">Lid limiti</dt><dd>{campaign.max_leads ?? 'Cheklanmagan'}</dd>
              <dt className="text-[var(--text-muted)]">Telegram</dt><dd className="truncate">{campaign.telegram_chat_id || 'Markaz sozlamasi'}</dd>
            </dl>
          </Panel>
        </div>
      </div>
    </>
  );
}
