'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Gift, AlertCircle, Sparkles, TrendingUp, Users, ArrowRight, Loader2 } from 'lucide-react';
import { register, ApiError } from '@/lib/api-client';
import SocialLogin from '@/components/SocialLogin';
import AuthShell from '@/components/auth/AuthShell';
import type { Profile } from '@/lib/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

const POINTS = [
  { icon: Sparkles, text: 'Bepul boshlang — birinchi testdan keyin tahlil ochiladi' },
  { icon: TrendingUp, text: "Har kuni o'sishingiz daraxt bo'lib ko'rinadi" },
  { icon: Users, text: "Minglab abituriyent bilan bir xil maqsad sari" },
];

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterPageInner />
    </Suspense>
  );
}

function RegisterPageInner() {
  const router = useRouter();
  const refCode = useSearchParams().get('ref') || '';
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const user = await register({ username, first_name: firstName, last_name: lastName, password, ref: refCode });
      router.push(user.has_seen_onboarding ? '/dashboard' : '/onboarding');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Ro'yxatdan o'tishda xatolik.");
    } finally {
      setLoading(false);
    }
  }

  function handleSocialSuccess(user: Profile) {
    router.push(user.has_seen_onboarding ? '/dashboard' : '/onboarding');
  }

  return (
    <AuthShell
      title="Ro'yxatdan o'tish"
      description="Bir daqiqada hisob oching va birinchi testni yeching."
      points={POINTS}
      footer={
        <>
          Hisobingiz bormi?{' '}
          <Link href="/login" className="font-semibold text-[var(--accent-text)] hover:underline">
            Hisobim bor
          </Link>
        </>
      }
    >
      <div className="space-y-5">
        {refCode && (
          <p className="flex items-start gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-sm leading-snug text-amber-300">
            <Gift className="mt-0.5 size-4 shrink-0 text-amber-400" />
            <span>
              <strong>Taklif bonusi:</strong> sizga va do&apos;stingizga ro&apos;yxatdan o&apos;tishda{' '}
              <strong>bonus tanga</strong> beriladi.
            </span>
          </p>
        )}

        {error && (
          <p className="flex items-center gap-2 rounded-xl border border-rose-500/25 bg-rose-500/10 p-3 text-sm text-rose-300">
            <AlertCircle className="size-4 shrink-0" /> {error}
          </p>
        )}

        <SocialLogin refCode={refCode} onSuccess={handleSocialSuccess} />

        <div className="relative flex items-center justify-center">
          <Separator className="absolute inset-x-0" />
          <span className="relative bg-card px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            yoki ma&apos;lumotlar bilan
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="first_name">Ism</Label>
              <Input id="first_name" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Azizbek" autoComplete="given-name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Familiya</Label>
              <Input id="last_name" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Qodirov" autoComplete="family-name" required />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">Foydalanuvchi nomi</Label>
            <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="dilshod_bba" autoComplete="username" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Parol</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Kamida 6 belgi" autoComplete="new-password" required />
          </div>

          <Button type="submit" size="lg" disabled={loading} className="w-full">
            {loading ? <Loader2 className="size-4 animate-spin" /> : null}
            {loading ? 'Yaratilmoqda...' : "Ro'yxatdan o'tish"}
            {!loading && <ArrowRight className="size-4" />}
          </Button>
        </form>
      </div>
    </AuthShell>
  );
}
