'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, CheckCircle2, Clock, Crown, Receipt, Upload, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';
import AuthImage from '@/components/common/AuthImage';
import { useAuthStore } from '@/lib/auth-store';
import AppShell from '@/components/AppShell';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

type Payment = {
  id: number; plan_name: string; amount: string; status: string;
  created_at: string; admin_note: string;
  test_title: string | null;
};

const STATUS: Record<string, { label: string; tone: string; icon: typeof Clock }> = {
  awaiting_screenshot: { label: 'Skrinshot kutilmoqda', tone: 'bg-[var(--ps-neutral)] text-[var(--text-secondary)]', icon: Upload },
  pending: { label: "Ko'rib chiqilmoqda", tone: 'bg-[var(--ps-orange)] text-[#080808]', icon: Clock },
  approved: { label: 'Tasdiqlandi', tone: 'bg-[var(--ps-green)] text-white', icon: CheckCircle2 },
  rejected: { label: 'Rad etildi', tone: 'bg-[var(--ps-coral)] text-white', icon: XCircle },
};

export default function MyPaymentsPage() {
  const { access } = useAuthStore();
  const [payments, setPayments] = useState<Payment[] | null>(null);

  useEffect(() => {
    if (!access) return;
    apiFetch<{ results: Payment[] }>('/api/premium/my-payments/').then((d) => setPayments(d.results))
      .catch((e) => toast.error(e instanceof Error ? e.message : "Yuklashda xatolik yuz berdi"));
  }, [access]);

  // Xulosa — faqat serverdan kelgan to'lovlardan hisoblanadi
  const approved = payments?.filter((p) => p.status === 'approved') ?? [];
  const waiting = payments?.filter((p) => p.status === 'pending' || p.status === 'awaiting_screenshot').length ?? 0;
  const totalPaid = approved.reduce((sum, p) => sum + Number(p.amount || 0), 0);

  return (
    <div className="theme-pastel min-h-screen w-full">
      <AppShell />
      <main className="page-shell flex-1 p-4 pb-16 sm:p-6">
        <div className="mx-auto max-w-5xl space-y-6">
          {/* 1. Hero */}
          <section className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
            <div className="ps-card relative overflow-hidden !rounded-[36px] p-6 sm:p-8">
              <span aria-hidden className="pointer-events-none absolute -right-14 -top-14 size-48 rounded-full bg-[var(--ps-purple)] opacity-15" />
              <span className="ps-chip relative">
                <Receipt className="size-3.5 text-[var(--ps-purple)]" /> Billing
              </span>
              <h1 className="ps-display relative mt-5 text-[44px] sm:text-[56px]">
                To&apos;lov<span className="text-[var(--ps-purple)]">larim</span>
                <span className="text-[var(--ps-coral)]">.</span>
              </h1>
              <p className="relative mt-3 max-w-md text-[14px] leading-relaxed text-[var(--text-secondary)]">
                Yuborilgan to&apos;lovlaringiz va ularning tasdiqlanish holati.
              </p>
              <div className="relative mt-6 flex flex-wrap gap-3">
                <Link href="/premium" className="ps-btn ps-btn-ink">
                  <Crown className="size-4 text-[var(--ps-orange)]" />
                  Tariflar
                  <span className="ps-btn-arrow"><ArrowUpRight className="size-4" /></span>
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="relative col-span-2 overflow-hidden rounded-[28px] bg-[#080808] p-5 text-[#FFFCF7] dark:bg-[#FFFCF7] dark:text-[#080808]">
                <span aria-hidden className="absolute -right-8 -top-8 size-28 rounded-full bg-[var(--ps-purple)] opacity-50" />
                <p className="ps-eyebrow relative opacity-60">Jami tasdiqlangan</p>
                <p className="ps-num relative mt-2 text-[40px] leading-none">
                  {payments ? totalPaid.toLocaleString() : '—'}
                  <span className="ml-1.5 text-[0.4em] opacity-60">so&apos;m</span>
                </p>
              </div>
              <div className="relative overflow-hidden rounded-[28px] bg-[var(--ps-green)] p-5 text-white">
                <span aria-hidden className="absolute -right-6 -top-6 size-20 rounded-full bg-white/20" />
                <CheckCircle2 className="relative size-5 opacity-85" />
                <p className="ps-num relative mt-3 text-[34px] leading-none">{payments ? approved.length : '—'}</p>
                <p className="relative mt-1 text-[12px] font-semibold opacity-80">tasdiqlangan</p>
              </div>
              <div className="relative overflow-hidden rounded-[28px] bg-[var(--ps-orange)] p-5 text-[#080808]">
                <span aria-hidden className="absolute -right-6 -top-6 size-20 rounded-full bg-white/25" />
                <Clock className="relative size-5 opacity-80" />
                <p className="ps-num relative mt-3 text-[34px] leading-none">{payments ? waiting : '—'}</p>
                <p className="relative mt-1 text-[12px] font-semibold opacity-75">kutilmoqda</p>
              </div>
            </div>
          </section>

          {/* 2. Ro'yxat */}
          <section className="ps-card relative overflow-hidden !rounded-[36px] p-5 sm:p-7">
            <div className="flex flex-wrap items-end justify-between gap-3 px-1">
              <div>
                <p className="ps-eyebrow text-[var(--text-muted)]">Tarix</p>
                <h2 className="ps-display mt-2 text-[26px] sm:text-[32px]">Barcha to&apos;lovlar</h2>
              </div>
              {payments && payments.length > 0 && <span className="ps-chip">{payments.length} ta to&apos;lov</span>}
            </div>

            {!payments && (
              <div className="mt-5 space-y-2.5">
                {[0, 1, 2].map((i) => <Skeleton key={i} className="h-[88px] w-full rounded-[24px]" />)}
              </div>
            )}

            {payments?.length === 0 && (
              <div className="mt-5 flex flex-col items-center gap-3 rounded-[28px] bg-[var(--ps-neutral)] p-10 text-center">
                <span className="inline-flex size-16 items-center justify-center rounded-full bg-[var(--ps-purple)] text-white">
                  <Receipt className="size-7" />
                </span>
                <p className="text-[15px] font-bold">Hali to&apos;lov qilinmagan</p>
                <p className="max-w-xs text-[13px] text-[var(--text-muted)]">Tarif tanlab obunani boshlang — to&apos;lovlaringiz shu yerda ko&apos;rinadi.</p>
                <Link href="/premium" className="ps-btn ps-btn-ink mt-1">
                  Tariflarni ko&apos;rish
                  <span className="ps-btn-arrow"><ArrowRight className="size-4" /></span>
                </Link>
              </div>
            )}

            {payments && payments.length > 0 && (
              <div className="mt-5 space-y-2.5">
                {payments.map((p) => {
                  const st = STATUS[p.status] ?? { label: p.status, tone: 'bg-[var(--ps-neutral)] text-[var(--text-secondary)]', icon: Clock };
                  const StIcon = st.icon;
                  return (
                    <Link
                      key={p.id}
                      href={`/premium/payment/${p.id}`}
                      className="group flex items-center gap-4 rounded-[24px] bg-[var(--ps-neutral)] p-3 pr-4 transition-transform hover:-translate-y-0.5"
                    >
                      <div className="relative size-16 shrink-0 overflow-hidden rounded-[18px] bg-[var(--ps-paper)]">
                        <Receipt className="absolute left-1/2 top-1/2 size-6 -translate-x-1/2 -translate-y-1/2 text-[var(--text-faint)]" />
                        <AuthImage
                          path={`/api/premium/payments/${p.id}/screenshot/`}
                          alt=""
                          className="relative size-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-bold">{p.plan_name}</p>
                        {p.test_title && <p className="truncate text-[12.5px] font-semibold text-[var(--ps-purple)]">{p.test_title}</p>}
                        <p className="mt-0.5 text-[12px] font-semibold text-[var(--text-muted)]">
                          #{p.id} · {new Date(p.created_at).toLocaleDateString('uz-UZ')}
                        </p>
                        {p.status === 'rejected' && p.admin_note && (
                          <p className="mt-1 line-clamp-1 text-[12px] font-semibold text-[var(--ps-coral)]">{p.admin_note}</p>
                        )}
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <p className="ps-num text-[20px] leading-none">
                          {Number(p.amount).toLocaleString()}
                          <span className="ml-1 text-[0.55em] opacity-60">so&apos;m</span>
                        </p>
                        <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-bold', st.tone)}>
                          <StIcon className="size-3.5" />
                          {st.label}
                        </span>
                      </div>
                      <ArrowRight className="hidden size-4 shrink-0 text-[var(--text-muted)] transition-transform group-hover:translate-x-0.5 sm:block" />
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
