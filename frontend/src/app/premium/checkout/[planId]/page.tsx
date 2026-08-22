'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Crown, ChevronLeft, Upload, CreditCard } from 'lucide-react';
import { apiFetch, apiUpload } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import AppShell from '@/components/AppShell';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';

type CheckoutInfo = {
  plan: { id: number; name: string; price: string };
  // Mock test tarifi bitta testni ochadi — qaysi test sotib olinayotgani shu yerda.
  test: { id: number; title: string } | null;
  card_number: string; card_holder: string;
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
  // Qaysi testni ochish uchun to'lov qilinayotgani (?test=ID) — mock test tarifi uchun.
  const testId = useSearchParams().get('test') || '';
  const router = useRouter();
  const { access } = useAuthStore();
  const [info, setInfo] = useState<CheckoutInfo | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!access) return;
    const q = testId ? `?test=${testId}` : '';
    apiFetch<CheckoutInfo>(`/api/premium/checkout/${planId}/${q}`).then(setInfo);
  }, [access, planId, testId]);

  async function submit() {
    if (!file) { setError('Skrinshot tanlang.'); return; }
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

  if (!info) {
    return (
      <>
        <AppShell />
        <main className="page-shell-narrow flex-1 space-y-5 p-4 sm:p-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </main>
      </>
    );
  }

  return (
    <>
      <AppShell />
      <main className="page-shell-narrow flex-1 space-y-8 bg-[var(--bg-page)] p-4 pb-12 sm:p-6">
        <Button asChild variant="outline" size="sm">
          <Link href="/premium"><ChevronLeft className="size-4" /> Tariflar</Link>
        </Button>

        <Card className="border-amber-500/30 bg-gradient-to-b from-amber-500/10 to-card">
          <CardContent className="space-y-2 pt-6 text-center">
            <Badge variant="outline" className="border-amber-500/30 bg-amber-500/15 text-amber-300">
              <Crown className="size-3.5" /> To&apos;lovni yakunlash
            </Badge>
            <h1 className="font-voice text-xl font-bold">{info.plan.name}</h1>
            {info.test && (
              <p className="text-sm text-[var(--text-secondary)]">
                Ochiladigan test: <strong className="text-foreground">{info.test.title}</strong>
              </p>
            )}
            <p className="font-mono text-2xl font-black text-amber-400">{Number(info.plan.price).toLocaleString()} so&apos;m</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-1.5 pt-6">
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <CreditCard className="size-3.5" /> Karta raqami
            </p>
            <p className="font-mono text-lg font-bold">{info.card_number}</p>
            <p className="text-xs text-[var(--text-secondary)]">{info.card_holder}</p>
          </CardContent>
        </Card>

        {error && (
          <Card className="border-rose-500/25 bg-rose-500/10">
            <CardContent className="pt-6 text-sm text-rose-300">{error}</CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="space-y-3 pt-6">
            <Label htmlFor="screenshot" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              To&apos;lov chekini yuklang
            </Label>
            <Input
              id="screenshot"
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            {file && <p className="text-xs text-[var(--success-text)]">{file.name} tanlandi</p>}
          </CardContent>
        </Card>

        <Button onClick={submit} disabled={submitting} size="lg" className="w-full">
          <Upload className="size-4" /> {submitting ? 'Yuborilmoqda...' : "To'lov skrinshotini yuborish"}
        </Button>
      </main>
    </>
  );
}
