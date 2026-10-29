'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Crown, ChevronLeft, Upload, CreditCard, Copy, Check, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch, apiUpload } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import AppShell from '@/components/AppShell';
import { Skeleton } from '@/components/ui/skeleton';

type CheckoutInfo = {
  plan: { id: number; name: string; price: string };
  test: { id: number; title: string } | null;
  card_number: string;
  card_holder: string;
};

export default function CheckoutPage() {
  return (
    <Suspense fallback={null}>
      <CheckoutPageInner />
    </Suspense>
  );
}

function CheckoutPageInner() {
  const { planId } = useParams<{ planId: string }>();
  const testId = useSearchParams().get('test') || '';
  const router = useRouter();
  const { access, authReady } = useAuthStore();
  const [info, setInfo] = useState<CheckoutInfo | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (authReady && !access) {
      const currentUrl = `/premium/checkout/${planId}${testId ? `?test=${testId}` : ''}`;
      router.replace(`/register?next=${encodeURIComponent(currentUrl)}`);
      return;
    }
    if (!access) return;
    const q = testId ? `?test=${testId}` : '';
    apiFetch<CheckoutInfo>(`/api/premium/checkout/${planId}/${q}`)
      .then(setInfo)
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Yuklashda xatolik yuz berdi'));
  }, [authReady, access, planId, testId, router]);

  async function submit() {
    if (!file) {
      setError('Iltimos, to\'lov cheki skrinshotini tanlang.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('screenshot', file);
      if (testId) form.append('test', testId);
      const res = await apiUpload<{ payment_id: number }>(`/api/premium/checkout/${planId}/`, form);
      router.push(`/premium/payment/${res.payment_id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xatolik');
    } finally {
      setSubmitting(false);
    }
  }

  function copyCard() {
    if (!info) return;
    navigator.clipboard.writeText(info.card_number.replace(/\s+/g, ''));
    setCopied(true);
    toast.success('Karta raqami nusxalandi');
    setTimeout(() => setCopied(false), 2000);
  }

  if (!info) {
    return (
      <>
        <AppShell />
        <main className="page-shell-narrow flex-1 space-y-5 p-4 sm:p-6">
          <Skeleton className="h-36 w-full rounded-[28px]" />
          <Skeleton className="h-44 w-full rounded-[28px]" />
          <Skeleton className="h-36 w-full rounded-[28px]" />
        </main>
      </>
    );
  }

  return (
    <>
      <AppShell />
      <main className="page-shell-narrow flex-1 space-y-6 bg-[var(--bg-page)] p-4 pb-16 sm:p-6">
        <Link
          href="/premium"
          className="inline-flex items-center gap-1.5 rounded-full bg-white dark:bg-[#1C1C1E] px-3.5 py-2 text-[13px] font-semibold text-[#007AFF] border border-black/[0.06] dark:border-white/[0.08] shadow-2xs hover:opacity-90 active:scale-95 transition-all"
        >
          <ChevronLeft className="size-4 stroke-[2.5]" />
          <span>Tariflarga qaytish</span>
        </Link>

        {/* Apple Pay Style Order Summary Card */}
        <div className="ios-card rounded-[28px] p-6 text-center space-y-2">
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-[14px] bg-[#007AFF] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_6px_16px_rgba(0,122,255,0.3)]">
            <Crown className="size-6" />
          </div>
          <span className="inline-block rounded-full bg-[#007AFF]/10 px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider text-[#007AFF]">
            IlmIldizi Pay
          </span>
          <h1 className="text-[22px] font-bold tracking-tight text-foreground">{info.plan.name}</h1>
          {info.test && (
            <p className="text-[13px] text-[#8E8E93]">
              Ochiladigan imtihon: <strong className="text-foreground">{info.test.title}</strong>
            </p>
          )}
          <p className="pt-1 font-mono text-[32px] font-black tracking-tight text-foreground">
            {Number(info.plan.price).toLocaleString()} <span className="text-[15px] font-semibold text-[#8E8E93]">so&apos;m</span>
          </p>
        </div>

        {/* Apple Wallet Style Bank Card */}
        <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#1C1C1E] via-[#2C2C2E] to-[#1C1C1E] p-6 text-white shadow-xl border border-white/10">
          <div className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-[#007AFF]/20 blur-3xl" />
          <div className="relative flex items-center justify-between">
            <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-white/60">
              <CreditCard className="size-4 text-[#007AFF]" /> Qabul qiluvchi karta
            </span>
            <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-semibold text-white/80">
              Uzcard / Humo
            </span>
          </div>

          <div className="relative mt-6 flex items-center justify-between gap-3">
            <p className="font-mono text-[20px] sm:text-[24px] font-bold tracking-wider text-white">
              {info.card_number}
            </p>
            <button
              type="button"
              onClick={copyCard}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/15 hover:bg-white/25 px-3.5 py-1.5 text-[12px] font-semibold text-white transition-all active:scale-95 cursor-pointer"
            >
              {copied ? <Check className="size-3.5 text-[#34C759]" /> : <Copy className="size-3.5" />}
              <span>{copied ? 'Nusxalandi' : 'Nusxalash'}</span>
            </button>
          </div>

          <p className="relative mt-3 text-[13px] font-medium text-white/70">{info.card_holder}</p>
        </div>

        {error && (
          <div className="rounded-[18px] border border-[#FF3B30]/25 bg-[#FF3B30]/10 p-4 text-[13px] font-semibold text-[#FF3B30]">
            {error}
          </div>
        )}

        {/* Receipt Upload Card */}
        <div className="ios-card rounded-[28px] p-6 space-y-4">
          <div>
            <h3 className="text-[15px] font-bold text-foreground">To&apos;lov chekini biriktiring</h3>
            <p className="text-[12.5px] text-[#8E8E93] mt-0.5">
              Click, Payme yoki bank ilovasidan to&apos;lov skrinshotini yuklang
            </p>
          </div>

          <label
            htmlFor="screenshot"
            className="flex flex-col items-center justify-center gap-2 rounded-[20px] border-2 border-dashed border-black/[0.1] dark:border-white/[0.12] bg-[#F2F2F7]/60 dark:bg-[#2C2C2E]/50 p-6 text-center cursor-pointer hover:border-[#007AFF] transition-colors"
          >
            <div className="flex size-11 items-center justify-center rounded-full bg-[#007AFF]/12 text-[#007AFF]">
              <Upload className="size-5" />
            </div>
            <span className="text-[13.5px] font-semibold text-foreground">
              {file ? file.name : 'Skrinshotni tanlash uchun bosing'}
            </span>
            <span className="text-[11.5px] text-[#8E8E93]">PNG, JPG yoki WebP formatda</span>
            <input
              id="screenshot"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </label>
        </div>

        <button
          onClick={submit}
          disabled={submitting}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#007AFF] px-6 text-[15px] font-semibold text-white shadow-[0_8px_20px_-4px_rgba(0,122,255,0.45)] hover:bg-[#0071EB] active:scale-[0.98] disabled:opacity-50 transition-all cursor-pointer"
        >
          <Upload className="size-4" />
          <span>{submitting ? 'Yuborilmoqda...' : "To'lov chekini tasdiqlashga yuborish"}</span>
        </button>

        <p className="flex items-center justify-center gap-1.5 text-center text-[12px] text-[#8E8E93]">
          <ShieldCheck className="size-4 text-[#34C759]" />
          <span>Moderatorlar 5–15 daqiqa ichida obunangizni faollashtiradi</span>
        </p>
      </main>
    </>
  );
}
