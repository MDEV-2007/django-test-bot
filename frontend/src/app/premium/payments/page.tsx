'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Receipt } from 'lucide-react';
import { apiFetch, API_URL } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import AppShell from '@/components/AppShell';
import PageHero from '@/components/student/PageHero';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

type Payment = {
  id: number; plan_name: string; amount: string; status: string;
  created_at: string; admin_note: string;
  test_title: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  awaiting_screenshot: "Skrinshot kutilmoqda",
  pending: "Ko'rib chiqilmoqda",
  approved: 'Tasdiqlandi',
  rejected: 'Rad etildi',
};

function statusTone(status: string) {
  if (status === 'approved') return 'border-[var(--success)]/25 bg-[var(--success)]/15 text-[var(--success-text)]';
  if (status === 'rejected') return 'border-rose-500/25 bg-rose-500/15 text-rose-300';
  return '';
}

export default function MyPaymentsPage() {
  const { access } = useAuthStore();
  const [payments, setPayments] = useState<Payment[] | null>(null);

  useEffect(() => {
    if (!access) return;
    apiFetch<{ results: Payment[] }>('/api/premium/my-payments/').then((d) => setPayments(d.results));
  }, [access]);

  return (
    <>
      <AppShell />
      <main className="page-shell flex-1 space-y-8 bg-[var(--bg-page)] p-4 pb-12 sm:p-6">
        <PageHero
          tone="accent"
          eyebrow="Billing"
          eyebrowIcon={Receipt}
          title="To'lovlarim"
          description="Yuborilgan to'lovlaringiz va ularning tasdiqlanish holati."
        />

        {!payments && (
          <div className="space-y-2.5">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
          </div>
        )}

        {payments?.length === 0 && (
          <Card>
            <CardContent className="py-16 text-center">
              <Receipt className="mx-auto mb-2 size-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">Hali to&apos;lov qilinmagan.</p>
              <Button asChild size="sm" className="mt-4"><Link href="/premium">Tariflarni ko&apos;rish</Link></Button>
            </CardContent>
          </Card>
        )}

        <div className="space-y-2.5">
          {payments?.map((p) => (
            <Link key={p.id} href={`/premium/payment/${p.id}`} className="group block">
              <Card className="gap-0 py-0 transition-colors group-hover:border-[var(--accent)]/40">
                <CardContent className="flex items-center gap-4 p-4">
                  <img
                    src={`${API_URL}/api/premium/payments/${p.id}/screenshot/?token=${access}`}
                    alt="" className="size-12 rounded-xl border object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{p.plan_name}</p>
                    {p.test_title && (
                      <p className="truncate text-xs text-[var(--accent-text)]">{p.test_title}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {Number(p.amount).toLocaleString()} so&apos;m · {new Date(p.created_at).toLocaleDateString('uz-UZ')}
                    </p>
                  </div>
                  <Badge variant={statusTone(p.status) ? 'outline' : 'secondary'} className={cn('shrink-0', statusTone(p.status))}>
                    {STATUS_LABEL[p.status] || p.status}
                  </Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}
