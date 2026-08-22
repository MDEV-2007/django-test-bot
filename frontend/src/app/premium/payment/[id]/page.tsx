'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, XCircle, Clock, ChevronLeft } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import AppShell from '@/components/AppShell';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

type Payment = {
  id: number; plan_name: string; amount: string; status: 'pending' | 'approved' | 'rejected';
  created_at: string; reviewed_at: string | null; admin_note: string | null;
};

const POLL_MS = 4000;

export default function PaymentStatusPage() {
  const { id } = useParams<{ id: string }>();
  const { access } = useAuthStore();
  const [payment, setPayment] = useState<Payment | null>(null);

  useEffect(() => {
    if (!access) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const load = async () => {
      const data = await apiFetch<Payment>(`/api/premium/payments/${id}/`);
      if (cancelled) return;
      setPayment(data);
      if (data.status === 'pending') timer = setTimeout(load, POLL_MS);
    };
    load();

    return () => { cancelled = true; clearTimeout(timer); };
  }, [access, id]);

  if (!payment) {
    return (
      <>
        <AppShell />
        <main className="page-shell-narrow flex-1 space-y-5 p-4 sm:p-6">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-72 w-full" />
        </main>
      </>
    );
  }

  return (
    <>
      <AppShell />
      <main className="page-shell-narrow flex-1 space-y-8 bg-[var(--bg-page)] p-4 pb-12 sm:p-6">
        <div className="flex items-center gap-3">
          <Button asChild variant="outline" size="icon">
            <Link href="/premium" aria-label="Tariflar"><ChevronLeft className="size-4" /></Link>
          </Button>
          <h1 className="font-voice text-xl font-bold">To&apos;lov holati</h1>
        </div>

        <Card>
          <CardContent className="space-y-4 p-8 text-center">
            {payment.status === 'approved' && (
              <>
                <div className="mx-auto flex size-16 items-center justify-center rounded-full border border-[var(--success)]/30 bg-[var(--success)]/15 text-[var(--success-text)]">
                  <CheckCircle2 className="size-7" />
                </div>
                <h2 className="text-xl font-bold">Tasdiqlandi!</h2>
                <p className="text-sm text-[var(--text-secondary)]">To&apos;lovingiz tasdiqlandi va premium kirish avtomatik ochildi.</p>
              </>
            )}
            {payment.status === 'rejected' && (
              <>
                <div className="mx-auto flex size-16 items-center justify-center rounded-full border border-rose-500/30 bg-rose-500/15 text-rose-300">
                  <XCircle className="size-7" />
                </div>
                <h2 className="text-xl font-bold">Rad etildi</h2>
                <p className="text-sm text-[var(--text-secondary)]">
                  {payment.admin_note || "To'lov tasdiqlanmadi. Qo'llab-quvvatlash bilan bog'laning yoki qayta urinib ko'ring."}
                </p>
              </>
            )}
            {payment.status === 'pending' && (
              <>
                <div className="mx-auto flex size-16 animate-pulse items-center justify-center rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400">
                  <Clock className="size-7" />
                </div>
                <h2 className="text-xl font-bold">Ko&apos;rib chiqilmoqda</h2>
                <p className="text-sm text-[var(--text-secondary)]">
                  To&apos;lovingiz admin tomonidan tekshirilmoqda. Tasdiqlangach premium avtomatik ochiladi va sizga bildirishnoma keladi.
                </p>
              </>
            )}

            <Separator className="my-2" />
            <dl className="space-y-2 text-left text-xs">
              <div className="flex justify-between"><dt className="text-[var(--text-faint)]">Reja</dt><dd className="font-semibold text-[var(--text-secondary)]">{payment.plan_name}</dd></div>
              <div className="flex justify-between"><dt className="text-[var(--text-faint)]">Summa</dt><dd className="font-mono font-semibold text-[var(--text-secondary)]">{Number(payment.amount).toLocaleString()} so&apos;m</dd></div>
              <div className="flex justify-between"><dt className="text-[var(--text-faint)]">Sana</dt><dd className="font-semibold text-[var(--text-secondary)]">{new Date(payment.created_at).toLocaleString('uz-UZ')}</dd></div>
            </dl>

            {payment.status !== 'pending' && (
              <Button asChild className="w-full"><Link href="/premium/payments">To&apos;lovlarim ro&apos;yxati</Link></Button>
            )}
          </CardContent>
        </Card>
      </main>
    </>
  );
}
