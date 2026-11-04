'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';
import PanelShell from '@/components/panel/PanelShell';
import PageHeader from '@/components/panel/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

/* Super Admin: Ads Manager advertiser arizalari va kampaniya moderatsiyasi.
   Rad etish / to'xtatish sababi majburiy va advertiserga ko'rinadi. Har amal audit jurnalida. */

type Advertiser = {
  id: number; name: string; status: 'pending' | 'approved' | 'rejected' | 'suspended';
  owner_username: string | null; contact_name: string; contact_email: string; phone: string;
  city_or_region: string; website: string; description: string; telegram_username: string;
  review_note: string; campaigns_count: number; created_at: string | null; reviewed_at: string | null;
};

type Campaign = {
  id: number; title: string; description: string; advertiser: string | null; center_id: number | null;
  review_status: string; status: string; target_subject: string; target_region: string;
  banner_url: string; logo: string; offer_badge: string; submitted_at: string | null; max_leads: number | null;
  starts_at: string | null; ends_at: string | null;
};

const STATUS_LABEL: Record<Advertiser['status'], string> = {
  pending: "Ko'rib chiqilmoqda", approved: 'Tasdiqlangan', rejected: 'Rad etilgan', suspended: "To'xtatilgan",
};

type Pending =
  | { kind: 'advertiser'; id: number; action: 'approve' | 'reject' | 'suspend'; name: string }
  | { kind: 'campaign'; id: number; action: 'approve' | 'reject'; name: string };

function fmt(iso: string | null) {
  return iso ? new Date(iso).toLocaleString('uz-UZ', { dateStyle: 'short', timeStyle: 'short' }) : '—';
}

export default function PanelAdvertisersPage() {
  const [filter, setFilter] = useState<string>('pending');
  const [advertisers, setAdvertisers] = useState<Advertiser[] | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [queue, setQueue] = useState<Campaign[] | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const a = await apiFetch<{ advertisers: Advertiser[]; status_counts: Record<string, number> }>(
        `/api/panel/advertisers/${filter ? `?status=${filter}` : ''}`);
      setAdvertisers(a.advertisers);
      setCounts(a.status_counts);
      const c = await apiFetch<{ campaigns: Campaign[] }>('/api/panel/campaigns/');
      setQueue(c.campaigns.filter((x) => x.review_status === 'pending_review'));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Yuklanmadi');
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const confirm = async () => {
    if (!pending) return;
    setBusy(true);
    try {
      const url = pending.kind === 'advertiser'
        ? `/api/panel/advertisers/${pending.id}/review/`
        : `/api/panel/campaigns/${pending.id}/review/`;
      await apiFetch(url, { method: 'POST', body: JSON.stringify({ action: pending.action, note }) });
      toast.success('Bajarildi');
      setPending(null);
      setNote('');
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Bajarilmadi');
    } finally {
      setBusy(false);
    }
  };

  const needsNote = pending && pending.action !== 'approve';

  return (
    <PanelShell>
      <PageHeader title="Ads Manager moderatsiya" description="ads.ilmildizi.uz advertiser arizalari va kampaniyalarni tasdiqlash." />

      <section className="mb-8 rounded-2xl border border-white/10 bg-white/[0.03]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 p-4">
          <h2 className="text-[15px] font-semibold">Kampaniyalar navbati {queue ? `(${queue.length})` : ''}</h2>
        </div>
        {!queue ? <p className="p-4 text-sm text-slate-400">Yuklanmoqda…</p> : queue.length === 0 ? (
          <p className="p-4 text-sm text-slate-400">Moderatsiya kutayotgan kampaniya yo&apos;q.</p>
        ) : (
          <div className="divide-y divide-white/10">
            {queue.map((c) => (
              <div key={c.id} className="flex flex-col gap-4 p-4 md:flex-row">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {(c.banner_url || c.logo) && <img src={c.banner_url || c.logo} alt="" className="h-28 w-full rounded-lg object-cover md:w-52" />}
                <div className="min-w-0 flex-1 space-y-1 text-sm">
                  <div className="text-[15px] font-semibold">{c.title}</div>
                  <div className="text-slate-400">{c.advertiser || 'Super Admin'} · yuborilgan {fmt(c.submitted_at)}</div>
                  {c.offer_badge && <div className="text-amber-300">{c.offer_badge}</div>}
                  <p className="whitespace-pre-wrap text-slate-300">{c.description}</p>
                  <div className="text-slate-400">
                    Fan: {c.target_subject} · Hudud: {c.target_region} · Lid limiti: {c.max_leads ?? '∞'} · Muddat: {fmt(c.starts_at)} — {fmt(c.ends_at)}
                  </div>
                </div>
                <div className="flex shrink-0 gap-2 md:flex-col">
                  <Button size="sm" onClick={() => setPending({ kind: 'campaign', id: c.id, action: 'approve', name: c.title })}>Tasdiqlash</Button>
                  <Button size="sm" variant="destructive" onClick={() => setPending({ kind: 'campaign', id: c.id, action: 'reject', name: c.title })}>Rad etish</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 p-4">
          <h2 className="text-[15px] font-semibold">Advertiserlar</h2>
          <div className="flex flex-wrap gap-1">
            {(['pending', 'approved', 'rejected', 'suspended', ''] as const).map((s) => (
              <button key={s || 'all'} onClick={() => setFilter(s)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium ${filter === s ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-400 hover:bg-white/5'}`}>
                {s ? STATUS_LABEL[s] : 'Barchasi'} {s ? `(${counts[s] || 0})` : ''}
              </button>
            ))}
          </div>
        </div>
        {!advertisers ? <p className="p-4 text-sm text-slate-400">Yuklanmoqda…</p> : advertisers.length === 0 ? (
          <p className="p-4 text-sm text-slate-400">Yozuv yo&apos;q.</p>
        ) : (
          <div className="divide-y divide-white/10">
            {advertisers.map((a) => (
              <div key={a.id} className="flex flex-col gap-3 p-4 md:flex-row md:items-start">
                <div className="min-w-0 flex-1 space-y-1 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[15px] font-semibold">{a.name}</span>
                    <Badge variant="outline" className="text-[11px]">{STATUS_LABEL[a.status]}</Badge>
                    <span className="text-slate-500">@{a.owner_username}</span>
                  </div>
                  <div className="text-slate-400">
                    {a.contact_name} · {a.phone} {a.contact_email && `· ${a.contact_email}`} · {a.city_or_region}
                    {a.telegram_username && ` · @${a.telegram_username}`}
                  </div>
                  {a.website && <a href={a.website} target="_blank" rel="noreferrer noopener" className="text-emerald-300 underline">{a.website}</a>}
                  {a.description && <p className="text-slate-300">{a.description}</p>}
                  {a.review_note && <p className="text-amber-300">Izoh: {a.review_note}</p>}
                  <div className="text-xs text-slate-500">Ariza: {fmt(a.created_at)} · Kampaniyalar: {a.campaigns_count}</div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  {a.status !== 'approved' && <Button size="sm" onClick={() => setPending({ kind: 'advertiser', id: a.id, action: 'approve', name: a.name })}>Tasdiqlash</Button>}
                  {a.status === 'pending' && <Button size="sm" variant="destructive" onClick={() => setPending({ kind: 'advertiser', id: a.id, action: 'reject', name: a.name })}>Rad etish</Button>}
                  {a.status === 'approved' && <Button size="sm" variant="destructive" onClick={() => setPending({ kind: 'advertiser', id: a.id, action: 'suspend', name: a.name })}>To&apos;xtatish</Button>}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <Dialog open={!!pending} onOpenChange={(o) => { if (!o) { setPending(null); setNote(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {pending?.action === 'approve' ? 'Tasdiqlash' : pending?.action === 'suspend' ? "To'xtatish" : 'Rad etish'}: {pending?.name}
            </DialogTitle>
            <DialogDescription>
              {pending?.kind === 'advertiser' && pending.action === 'suspend'
                ? "Advertiser kabinetga kira olmaydi va uning barcha kampaniyalari darhol ko'rsatilmaydi."
                : needsNote ? "Sabab advertiserga ko'rsatiladi." : 'Amal audit jurnaliga yoziladi.'}
            </DialogDescription>
          </DialogHeader>
          {needsNote && (
            <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Sabab (majburiy)"
              className="min-h-24 w-full rounded-lg border border-white/10 bg-black/30 p-3 text-sm" />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPending(null)}>Bekor qilish</Button>
            <Button variant={needsNote ? 'destructive' : 'default'} disabled={busy || (!!needsNote && !note.trim())} onClick={confirm}>Tasdiqlash</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PanelShell>
  );
}
