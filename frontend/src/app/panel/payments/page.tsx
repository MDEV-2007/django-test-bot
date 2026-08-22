'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, X, Crown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch, ApiError } from '@/lib/api-client';
import PanelShell from '@/components/panel/PanelShell';
import PageHeader from '@/components/panel/PageHeader';
import DataTable, { Badge, type Column, type FilterConfig } from '@/components/panel/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

const FILTERS: FilterConfig[] = [
  { param: 'status', label: 'Holat', options: [
    { value: 'awaiting_screenshot', label: 'Skrinshot kutilmoqda' }, { value: 'pending', label: "Ko'rib chiqilmoqda" },
    { value: 'approved', label: 'Tasdiqlandi' }, { value: 'rejected', label: 'Rad etildi' },
  ] },
];

type PaymentRow = {
  id: number; username: string; plan_name: string; amount: string;
  status: string; status_display: string; status_tone: string; created_at: string;
};

export default function PanelPaymentsPage() {
  const router = useRouter();
  const [refreshKey, setRefreshKey] = useState(0);
  const [busy, setBusy] = useState<number | null>(null);
  const [showGrant, setShowGrant] = useState(false);
  const [grantUsername, setGrantUsername] = useState('');
  const [granting, setGranting] = useState(false);

  async function grantPremium(action: 'grant' | 'revoke') {
    if (!grantUsername.trim()) {
      toast.error('Username kiriting.');
      return;
    }
    setGranting(true);
    try {
      await apiFetch('/api/panel/payments/grant/', {
        method: 'POST', body: JSON.stringify({ username: grantUsername, grant_action: action }),
      });
      toast.success(
        action === 'grant'
          ? `${grantUsername} uchun premium berildi`
          : `${grantUsername} uchun premium bekor qilindi`,
      );
      setGrantUsername('');
      setShowGrant(false);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Xatolik');
    } finally {
      setGranting(false);
    }
  }

  async function act(id: number, action: 'approve' | 'reject') {
    setBusy(id);
    try {
      await apiFetch(`/api/panel/payments/${id}/${action}/`, { method: 'POST' });
      toast.success(action === 'approve' ? "To'lov tasdiqlandi" : "To'lov rad etildi");
      setRefreshKey((k) => k + 1);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Xatolik');
    } finally {
      setBusy(null);
    }
  }

  const columns: Column<PaymentRow>[] = [
    { key: 'user', label: 'Foydalanuvchi', render: (p) => <span className="font-medium">{p.username}</span> },
    { key: 'plan', label: 'Reja', render: (p) => p.plan_name },
    { key: 'amount', label: 'Summa', render: (p) => <span className="font-mono tabular-nums">{Number(p.amount).toLocaleString('uz-UZ')}</span> },
    { key: 'status', label: 'Holat', render: (p) => <Badge text={p.status_display} tone={p.status_tone} /> },
    { key: 'date', label: 'Sana', render: (p) => <span className="text-muted-foreground">{new Date(p.created_at).toLocaleDateString('uz-UZ')}</span> },
    {
      key: 'actions', label: '', render: (p) => p.status === 'pending' ? (
        <div className="flex justify-end gap-1">
          <Button
            size="sm" variant="ghost" disabled={busy === p.id}
            className="h-8 text-[var(--success-text)] hover:text-[var(--success-text)]"
            onClick={(e) => { e.stopPropagation(); act(p.id, 'approve'); }}
          >
            {busy === p.id ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
            Tasdiqlash
          </Button>
          <Button
            size="sm" variant="ghost" disabled={busy === p.id}
            className="h-8 text-[var(--danger-text)] hover:text-[var(--danger-text)]"
            onClick={(e) => { e.stopPropagation(); act(p.id, 'reject'); }}
          >
            <X className="size-3.5" /> Rad etish
          </Button>
        </div>
      ) : null,
    },
  ];

  return (
    <PanelShell>
      <div className="space-y-5">
        <PageHeader
          title="To'lovlar"
          description="Skrinshot bilan yuborilgan to'lovlarni tasdiqlash yoki rad etish."
          actions={
            <Button variant="outline" onClick={() => setShowGrant(true)}>
              <Crown className="size-4" /> Qo&apos;lda premium
            </Button>
          }
        />
        <DataTable
          key={refreshKey}
          endpoint="/api/panel/payments/"
          columns={columns}
          onRowClick={(p) => router.push(`/panel/payments/${p.id}`)}
          filters={FILTERS}
        />
      </div>

      <Dialog open={showGrant} onOpenChange={setShowGrant}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Qo&apos;lda premium berish</DialogTitle>
            <DialogDescription>
              To&apos;lov yozuvisiz premium berish yoki bekor qilish. Amal audit jurnaliga yoziladi.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="g-username">Username</Label>
            <Input
              id="g-username" value={grantUsername} placeholder="masalan: aziz_ilm"
              onChange={(e) => setGrantUsername(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => grantPremium('revoke')} disabled={granting}>
              Bekor qilish
            </Button>
            <Button onClick={() => grantPremium('grant')} disabled={granting}>
              {granting && <Loader2 className="size-4 animate-spin" />}
              Premium berish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PanelShell>
  );
}
