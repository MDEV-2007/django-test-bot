'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { Download, Lock, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyState, ErrorNote, Field, LeadStatusBadge, PageTitle, Panel, SkeletonRows, inputCls, textareaCls } from '@/components/ads/ui';
import { LEAD_STATUS_LABEL, adsApi, fmtDate, type Campaign, type Lead, type LeadStatus } from '@/lib/ads-api';
import { cn } from '@/lib/utils';

const STATUSES: LeadStatus[] = ['NEW', 'CONTACTED', 'ENROLLED', 'REJECTED'];

function LeadsInner() {
  const params = useSearchParams();
  const [filters, setFilters] = useState({ q: '', status: '', campaign: params.get('campaign') || '', from: '', to: '' });
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ leads: Lead[]; total: number; page_size: number; status_counts: Record<LeadStatus, number> } | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Lead | null>(null);
  const [exportOpen, setExportOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await adsApi.leads({ ...filters, page }));
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xatolik');
    }
  }, [filters, page]);

  useEffect(() => {
    const t = setTimeout(load, filters.q ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, filters.q]);
  useEffect(() => { adsApi.campaigns().then((r) => setCampaigns(r.campaigns)).catch(() => {}); }, []);

  const setF = (k: keyof typeof filters, v: string) => { setPage(1); setFilters((f) => ({ ...f, [k]: v })); };

  const open = async (l: Lead) => {
    setSelected(l);
    try { setSelected((await adsApi.lead(l.id)).lead); } catch { /* ro'yxatdagi qator bilan qoladi */ }
  };

  const doExport = async () => {
    try {
      const blob = await adsApi.exportLeads({ status: filters.status, campaign: filters.campaign, from: filters.from, to: filters.to });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setExportOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Eksport bajarilmadi');
    }
  };

  const pages = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1;

  return (
    <>
      <PageTitle title="Lidlar" description="Faqat sizning kampaniyalaringizga kelgan arizalar. Telefon va ism faqat o'quvchi rozilik bergan bo'lsa ko'rinadi."
        actions={<Button size="sm" variant="outline" onClick={() => setExportOpen(true)}><Download /> CSV eksport</Button>} />
      {error && <div className="mb-4"><ErrorNote message={error} /></div>}

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {STATUSES.map((s) => (
          <button key={s} onClick={() => setF('status', filters.status === s ? '' : s)}
            className={cn('rounded-xl border bg-[var(--surface-card)] px-4 py-3 text-left transition',
              filters.status === s ? 'border-[var(--brand)] ring-2 ring-[var(--brand-soft)]' : 'border-[var(--border-card)] hover:border-[var(--border-strong)]')}>
            <div className="text-[12px] text-[var(--text-muted)]">{LEAD_STATUS_LABEL[s]}</div>
            <div className="mt-1 text-[20px] font-semibold tabular-nums">{data?.status_counts[s] ?? '—'}</div>
          </button>
        ))}
      </div>

      <Panel>
        <div className="grid gap-3 border-b border-[var(--border-soft)] p-4 sm:grid-cols-2 lg:grid-cols-[1fr_200px_150px_150px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text-faint)]" />
            <input aria-label="Qidirish" placeholder="Ism, telefon yoki Telegram…" value={filters.q} onChange={(e) => setF('q', e.target.value)} className={cn(inputCls, 'h-9 pl-9')} />
          </div>
          <select aria-label="Kampaniya" value={filters.campaign} onChange={(e) => setF('campaign', e.target.value)} className={cn(inputCls, 'h-9')}>
            <option value="">Barcha kampaniyalar</option>
            {campaigns.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
          <input type="date" aria-label="Dan" value={filters.from} onChange={(e) => setF('from', e.target.value)} className={cn(inputCls, 'h-9')} />
          <input type="date" aria-label="Gacha" value={filters.to} onChange={(e) => setF('to', e.target.value)} className={cn(inputCls, 'h-9')} />
        </div>

        {!data ? <SkeletonRows rows={6} /> : data.leads.length === 0 ? (
          <EmptyState title="Lid topilmadi" description="Filtrlarni o'zgartiring yoki kampaniya faol bo'lishini kuting." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-[13px]">
              <thead>
                <tr className="text-left text-[12px] text-[var(--text-faint)]">
                  <th className="px-5 py-2.5 font-medium">O&apos;quvchi</th>
                  <th className="px-3 py-2.5 font-medium">Telefon</th>
                  <th className="px-3 py-2.5 font-medium">Kampaniya</th>
                  <th className="px-3 py-2.5 font-medium">Sana</th>
                  <th className="px-5 py-2.5 font-medium">Holat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-soft)]">
                {data.leads.map((l) => (
                  <tr key={l.id} onClick={() => open(l)} className="cursor-pointer hover:bg-[var(--surface-hover)]">
                    <td className="px-5 py-3 font-medium">
                      <span className="inline-flex items-center gap-1.5">{!l.pii_visible && <Lock className="size-3.5 text-[var(--text-faint)]" aria-label="Rozilik yo'q" />}{l.full_name}</span>
                    </td>
                    <td className="px-3 tabular-nums">{l.phone_number}</td>
                    <td className="max-w-[220px] truncate px-3 text-[var(--text-muted)]">{l.campaign_title}</td>
                    <td className="whitespace-nowrap px-3 text-[var(--text-muted)]">{fmtDate(l.created_at, true)}</td>
                    <td className="px-5"><LeadStatusBadge status={l.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && pages > 1 && (
          <div className="flex items-center justify-between border-t border-[var(--border-soft)] px-5 py-3 text-[13px]">
            <span className="text-[var(--text-muted)]">{data.total} ta · {page}/{pages}</span>
            <div className="flex gap-2">
              <Button size="xs" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>Oldingi</Button>
              <Button size="xs" variant="outline" disabled={page >= pages} onClick={() => setPage(page + 1)}>Keyingi</Button>
            </div>
          </div>
        )}
      </Panel>

      <LeadDialog lead={selected} onClose={() => setSelected(null)} onSaved={(l) => { setSelected(l); load(); }} />

      <Dialog open={exportOpen} onOpenChange={setExportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lidlarni eksport qilish</DialogTitle>
            <DialogDescription>
              Faylga faqat rozilik bergan o&apos;quvchilar kiritiladi (joriy filtrlar bo&apos;yicha, 5000 tagacha). Eksport audit jurnaliga yoziladi.
              Ma&apos;lumotlarni faqat o&apos;quvchi bilan bog&apos;lanish uchun ishlating va uchinchi shaxslarga bermang.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExportOpen(false)}>Bekor qilish</Button>
            <Button onClick={doExport}>Tasdiqlash va yuklab olish</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function LeadDialog({ lead, onClose, onSaved }: { lead: Lead | null; onClose: () => void; onSaved: (l: Lead) => void }) {
  const [status, setStatus] = useState<LeadStatus>('NEW');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (lead) { setStatus(lead.status); setNote(lead.note || ''); }
  }, [lead]);

  const save = async () => {
    if (!lead) return;
    setBusy(true);
    try {
      const res = await adsApi.updateLead(lead.id, { status, note });
      toast.success('Saqlandi');
      onSaved(res.lead);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Saqlanmadi');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={!!lead} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        {lead && (
          <>
            <DialogHeader>
              <DialogTitle>{lead.full_name}</DialogTitle>
              <DialogDescription>{lead.campaign_title} · {fmtDate(lead.created_at, true)}</DialogDescription>
            </DialogHeader>
            {!lead.pii_visible && (
              <div className="rounded-lg bg-[var(--warning-soft)] px-3 py-2 text-[12px] text-[var(--warning-text)]">
                O&apos;quvchi ma&apos;lumot uzatishga to&apos;liq rozilik bermagan (yoki 18+/ota-ona roziligi tasdiqlanmagan) — kontaktlar yashirilgan.
              </div>
            )}
            <dl className="grid grid-cols-[130px_1fr] gap-x-3 gap-y-2 text-[13px]">
              <dt className="text-[var(--text-muted)]">Telefon</dt>
              <dd className="tabular-nums">{lead.pii_visible ? <a className="underline" href={`tel:${lead.phone_number}`}>{lead.phone_number}</a> : lead.phone_number}</dd>
              <dt className="text-[var(--text-muted)]">Telegram</dt>
              <dd>{lead.telegram_username ? <a className="underline" href={`https://t.me/${lead.telegram_username}`} target="_blank" rel="noreferrer">@{lead.telegram_username}</a> : '—'}</dd>
              {lead.pii_visible && (<>
                <dt className="text-[var(--text-muted)]">Zaif mavzular</dt><dd>{lead.weakest_topics || '—'}</dd>
                <dt className="text-[var(--text-muted)]">Prognoz ball</dt><dd>{lead.predicted_dtm_score || '—'}</dd>
              </>)}
              <dt className="text-[var(--text-muted)]">Rozilik</dt><dd>{lead.consent_at ? fmtDate(lead.consent_at, true) : "Yo'q"}</dd>
            </dl>
            <Field label="Holat">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {STATUSES.map((s) => (
                  <button key={s} type="button" onClick={() => setStatus(s)}
                    className={cn('rounded-lg border px-2 py-1.5 text-[12px] font-medium transition',
                      status === s ? 'border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand-text)]' : 'border-[var(--border-card)]')}>
                    {LEAD_STATUS_LABEL[s]}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Ichki izoh" htmlFor="note" hint="Faqat sizning jamoangizga ko'rinadi.">
              <textarea id="note" className={textareaCls} value={note} maxLength={2000} onChange={(e) => setNote(e.target.value)} />
            </Field>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Yopish</Button>
              <Button disabled={busy} onClick={save}>Saqlash</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function LeadsPage() {
  return <Suspense fallback={<SkeletonRows rows={6} />}><LeadsInner /></Suspense>;
}
