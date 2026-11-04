'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { CampaignActions } from '@/components/ads/CampaignActions';
import { CampaignStatusBadge, EmptyState, ErrorNote, PageTitle, Panel, SkeletonRows, inputCls } from '@/components/ads/ui';
import {
  CAMPAIGN_STATUS_LABEL, OBJECTIVE_LABEL, adsApi, fmtDate, fmtNum, fmtPct, type Campaign, type CampaignStatus,
} from '@/lib/ads-api';
import { cn } from '@/lib/utils';

const FILTERS: (CampaignStatus | '')[] = ['', 'active', 'scheduled', 'pending_review', 'paused', 'exhausted', 'draft', 'rejected', 'ended'];

function CampaignsInner() {
  const router = useRouter();
  const params = useSearchParams();
  const status = (params.get('status') || '') as CampaignStatus | '';
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<Campaign[] | null>(null);
  const [summary, setSummary] = useState<Partial<Record<CampaignStatus, number>>>({});
  const [error, setError] = useState('');

  const load = useCallback(async (query: string) => {
    try {
      const res = await adsApi.campaigns({ q: query });
      setRows(res.campaigns);
      setSummary(res.summary);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xatolik');
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(q), q ? 300 : 0);
    return () => clearTimeout(t);
  }, [q, load]);

  const visible = useMemo(() => (rows || []).filter((r) => !status || r.status === status), [rows, status]);
  const total = Object.values(summary).reduce((a, b) => a + (b || 0), 0);

  const setStatus = (s: string) => router.replace(s ? `/campaigns?status=${s}` : '/campaigns');

  return (
    <>
      <PageTitle title="Kampaniyalar" description="Yaratish, moderatsiyaga yuborish, to'xtatish va yakunlash."
        actions={<Button asChild size="sm"><Link href="/campaigns/new"><Plus /> Yangi kampaniya</Link></Button>} />
      {error && <div className="mb-4"><ErrorNote message={error} /></div>}

      <Panel>
        <div className="flex flex-col gap-3 border-b border-[var(--border-soft)] p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-1 overflow-x-auto" role="tablist" aria-label="Holat bo'yicha">
            {FILTERS.map((f) => {
              const count = f ? summary[f] || 0 : total;
              if (f && !count) return null;
              return (
                <button key={f || 'all'} role="tab" aria-selected={status === f} onClick={() => setStatus(f)}
                  className={cn('whitespace-nowrap rounded-md px-2.5 py-1.5 text-[13px] font-medium transition',
                    status === f ? 'bg-[var(--brand-soft)] text-[var(--brand-text)]' : 'text-[var(--text-muted)] hover:bg-[var(--surface-hover)]')}>
                  {f ? CAMPAIGN_STATUS_LABEL[f] : 'Barchasi'} <span className="tabular-nums opacity-70">{count}</span>
                </button>
              );
            })}
          </div>
          <div className="relative lg:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text-faint)]" />
            <input aria-label="Qidirish" placeholder="Sarlavha yoki tavsif…" value={q} onChange={(e) => setQ(e.target.value)} className={cn(inputCls, 'h-9 pl-9')} />
          </div>
        </div>

        {rows === null ? <SkeletonRows rows={5} /> : visible.length === 0 ? (
          <EmptyState title={total ? 'Mos kampaniya topilmadi' : "Hali kampaniya yo'q"}
            description={total ? "Filtr yoki qidiruvni o'zgartiring." : "Kampaniya yarating — u moderatsiyadan o'tgach o'quvchilarga ko'rsatiladi."}
            action={!total ? <Button asChild size="sm"><Link href="/campaigns/new">Kampaniya yaratish</Link></Button> : undefined} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-[13px]">
              <thead>
                <tr className="text-left text-[12px] text-[var(--text-faint)]">
                  <th className="px-5 py-2.5 font-medium">Kampaniya</th>
                  <th className="px-3 py-2.5 font-medium">Holat</th>
                  <th className="px-3 py-2.5 font-medium">Muddat</th>
                  <th className="px-3 py-2.5 text-right font-medium">Ko&apos;rsatish</th>
                  <th className="px-3 py-2.5 text-right font-medium">CTR</th>
                  <th className="px-3 py-2.5 text-right font-medium">Lid / limit</th>
                  <th className="px-5 py-2.5 text-right font-medium"><span className="sr-only">Amallar</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-soft)]">
                {visible.map((c) => (
                  <tr key={c.id} className="hover:bg-[var(--surface-hover)]">
                    <td className="max-w-[320px] px-5 py-3">
                      <Link href={`/campaigns/${c.id}`} className="block truncate font-medium hover:underline">{c.title}</Link>
                      <div className="truncate text-[12px] text-[var(--text-muted)]">
                        {OBJECTIVE_LABEL[c.objective]} · {c.target_subject === 'ALL' ? 'Barcha fanlar' : c.target_subject} · {c.target_region === 'ALL' ? 'Barcha hududlar' : c.target_region}
                      </div>
                    </td>
                    <td className="px-3"><CampaignStatusBadge status={c.status} /></td>
                    <td className="whitespace-nowrap px-3 text-[12px] text-[var(--text-muted)]">
                      {c.starts_at ? fmtDate(c.starts_at) : 'Darhol'} — {c.ends_at ? fmtDate(c.ends_at) : 'muddatsiz'}
                    </td>
                    <td className="px-3 text-right tabular-nums">{fmtNum(c.metrics.impressions)}</td>
                    <td className="px-3 text-right tabular-nums">{fmtPct(c.metrics.ctr)}</td>
                    <td className="px-3 text-right tabular-nums">{fmtNum(c.metrics.leads)} / {c.max_leads ?? '∞'}</td>
                    <td className="px-5 text-right">
                      <CampaignActions campaign={c} compact onChanged={(updated, msg) => {
                        if (msg) toast.success(msg);
                        if (updated.id !== c.id) router.push(`/campaigns/${updated.id}/edit`);
                        else load(q);
                      }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}

export default function AdsCampaignsPage() {
  return <Suspense fallback={<SkeletonRows rows={5} />}><CampaignsInner /></Suspense>;
}
