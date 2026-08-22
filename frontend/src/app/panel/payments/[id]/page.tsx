'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Check, X, Loader2, ImageOff, Wallet, CalendarDays, User } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch, API_URL } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import PanelShell from '@/components/panel/PanelShell';
import PageHeader from '@/components/panel/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

type PaymentDetail = {
  id: number; username: string; plan_name: string; amount: string;
  status: 'pending' | 'approved' | 'rejected'; status_display: string;
  created_at: string; admin_note: string | null; screenshot: string | null;
};

const STATUS_TONE: Record<string, string> = {
  approved: 'bg-[var(--success-soft)] text-[var(--success-text)] border-[var(--success)]/25',
  rejected: 'bg-[var(--danger-soft)] text-[var(--danger-text)] border-[var(--danger)]/25',
  pending: 'bg-[var(--warning-soft)] text-[var(--warning-text)] border-[var(--warning)]/25',
};

export default function PanelPaymentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { access } = useAuthStore();
  const [data, setData] = useState<PaymentDetail | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = () => apiFetch<PaymentDetail>(`/api/panel/payments/${id}/`).then(setData);
  useEffect(() => { if (access) load(); }, [access]); // eslint-disable-line react-hooks/exhaustive-deps

  async function act(action: 'approve' | 'reject') {
    setBusy(action);
    try {
      await apiFetch(`/api/panel/payments/${id}/${action}/`, { method: 'POST' });
      toast.success(action === 'approve' ? "To'lov tasdiqlandi — premium ochildi" : "To'lov rad etildi");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Xatolik');
    } finally {
      setBusy(null);
    }
  }

  if (!data) {
    return (
      <PanelShell>
        <div className="mx-auto max-w-2xl space-y-4">
          <Skeleton className="h-9 w-64" /><Skeleton className="h-96 w-full" />
        </div>
      </PanelShell>
    );
  }

  const rows = [
    { icon: User, label: 'Foydalanuvchi', value: data.username },
    { icon: Wallet, label: 'Summa', value: `${Number(data.amount).toLocaleString('uz-UZ')} so'm` },
    { icon: CalendarDays, label: 'Yuborilgan', value: new Date(data.created_at).toLocaleString('uz-UZ') },
  ];

  return (
    <PanelShell>
      <div className="mx-auto max-w-2xl space-y-5">
        <PageHeader
          backHref="/panel/payments"
          title={data.plan_name}
          description={`To'lov #${data.id}`}
          actions={<Badge variant="outline" className={STATUS_TONE[data.status] ?? ''}>{data.status_display}</Badge>}
        />

        <Card>
          <CardHeader><CardTitle className="text-base">Tafsilotlar</CardTitle></CardHeader>
          <CardContent>
            {rows.map((r, i) => {
              const Icon = r.icon;
              return (
                <div key={r.label}>
                  {i > 0 && <Separator />}
                  <div className="flex items-center justify-between gap-3 py-2.5">
                    <span className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Icon className="size-4" /> {r.label}
                    </span>
                    <span className="text-sm font-medium">{r.value}</span>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">To&apos;lov cheki</CardTitle></CardHeader>
          <CardContent>
            {data.screenshot ? (
              <a
                href={`${API_URL}/api/premium/payments/${data.id}/screenshot/?token=${access}`}
                target="_blank" rel="noreferrer"
                className="block overflow-hidden rounded-lg border transition-colors hover:border-[var(--border-strong)]"
                title="To'liq o'lchamda ochish"
              >
                <img
                  src={`${API_URL}/api/premium/payments/${data.id}/screenshot/?token=${access}`}
                  alt="To'lov skrinshoti"
                  className="max-h-[520px] w-full object-contain"
                />
              </a>
            ) : (
              <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
                <ImageOff className="size-8 opacity-50" />
                <p className="text-sm">Skrinshot yuklanmagan.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {data.admin_note && (
          <Card>
            <CardHeader><CardTitle className="text-base">Admin izohi</CardTitle></CardHeader>
            <CardContent><p className="text-sm text-[var(--text-secondary)]">{data.admin_note}</p></CardContent>
          </Card>
        )}

        {data.status === 'pending' && (
          <div className="flex gap-2">
            <Button className="flex-1" onClick={() => act('approve')} disabled={!!busy}>
              {busy === 'approve' ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
              Tasdiqlash
            </Button>
            <Button variant="destructive" className="flex-1" onClick={() => act('reject')} disabled={!!busy}>
              {busy === 'reject' ? <Loader2 className="size-4 animate-spin" /> : <X className="size-4" />}
              Rad etish
            </Button>
          </div>
        )}
      </div>
    </PanelShell>
  );
}
