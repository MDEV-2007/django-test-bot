'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Gift, AlertCircle, Sparkles, TrendingUp, Users, ArrowRight, Loader2, User, Lock, AtSign } from 'lucide-react';
import { register, ApiError } from '@/lib/api-client';
import SocialLogin from '@/components/SocialLogin';
import AuthShell from '@/components/auth/AuthShell';
import type { Profile } from '@/lib/auth-store';

const POINTS = [
  { icon: Sparkles, text: 'Bepul diagnostika — birinchi testdanoq A+/A/B darajangiz aniqlanadi' },
  { icon: TrendingUp, text: "Har kuni o'sishingiz shaxsiy Bilim Ildizi daraxtida aks etadi" },
  { icon: Users, text: "4,300+ abituriyent bilan Jonli Mock imtihonlar va 1v1 Arena" },
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
  const searchParams = useSearchParams();
  const refCode = searchParams.get('ref') || '';
  const nextParam = searchParams.get('next');
  const targetNext = nextParam && nextParam.startsWith('/') ? nextParam : null;

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
      router.push(targetNext || (user.has_seen_onboarding ? '/dashboard' : '/onboarding'));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Ro'yxatdan o'tishda xatolik.");
    } finally {
      setLoading(false);
    }
  }

  function handleSocialSuccess(user: Profile) {
    router.push(targetNext || (user.has_seen_onboarding ? '/dashboard' : '/onboarding'));
  }

  return (
    <AuthShell
      title="Yangi IlmIldizi ID"
      description="30 soniyada bepul hisob oching va birinchi testni boshlang"
      points={POINTS}
      footer={
        <>
          Hisobingiz bormi?{' '}
          <Link
            href={targetNext ? `/login?next=${encodeURIComponent(targetNext)}` : '/login'}
            className="font-bold text-[var(--ps-purple)] underline-offset-4 hover:underline"
          >
            Hisobga kirish →
          </Link>
        </>
      }
    >
      <div className="space-y-5">
        {refCode && (
          <div className="flex items-start gap-2.5 rounded-[20px] bg-[var(--ps-orange)] p-3.5 text-[13px] leading-snug text-[#080808]">
            <Gift className="mt-0.5 size-4 shrink-0" />
            <span>
              <strong>Taklif bonusi:</strong> sizga va do&apos;stingizga ro&apos;yxatdan o&apos;tishda{' '}
              <strong>bonus tanga</strong> taqdim etiladi.
            </span>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2.5 rounded-[18px] bg-[var(--ps-coral)] p-3.5 text-[13px] font-semibold text-white">
            <AlertCircle className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <SocialLogin refCode={refCode} onSuccess={handleSocialSuccess} />

        <div className="relative flex items-center justify-center py-1">
          <div className="h-px w-full bg-[var(--border-card)]" />
          <span className="absolute bg-[var(--ps-paper)] px-3 text-[12px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            yoki ma&apos;lumotlar bilan
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* iOS Settings Inset Grouped Form */}
          <div className="space-y-2.5">
            <label htmlFor="first_name" className="flex cursor-text items-center gap-3 rounded-full bg-[var(--ps-neutral)] px-4 py-3.5 ring-2 ring-transparent transition focus-within:bg-[var(--ps-paper)] focus-within:ring-[var(--ps-purple)]">
              <User className="size-4 shrink-0 text-[var(--text-muted)]" />
              <span className="w-20 shrink-0 text-[13px] font-bold text-foreground">
                Ism
              </span>
              <input
                id="first_name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Azizbek"
                autoComplete="given-name"
                required
                className="w-full bg-transparent text-[14px] font-medium text-foreground placeholder:text-[var(--text-faint)] focus:outline-none"
              />
            </label>

            <label htmlFor="last_name" className="flex cursor-text items-center gap-3 rounded-full bg-[var(--ps-neutral)] px-4 py-3.5 ring-2 ring-transparent transition focus-within:bg-[var(--ps-paper)] focus-within:ring-[var(--ps-purple)]">
              <User className="size-4 shrink-0 text-[var(--text-muted)]" />
              <span className="w-20 shrink-0 text-[13px] font-bold text-foreground">
                Familiya
              </span>
              <input
                id="last_name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Qodirov"
                autoComplete="family-name"
                required
                className="w-full bg-transparent text-[14px] font-medium text-foreground placeholder:text-[var(--text-faint)] focus:outline-none"
              />
            </label>

            <label htmlFor="username" className="flex cursor-text items-center gap-3 rounded-full bg-[var(--ps-neutral)] px-4 py-3.5 ring-2 ring-transparent transition focus-within:bg-[var(--ps-paper)] focus-within:ring-[var(--ps-purple)]">
              <AtSign className="size-4 shrink-0 text-[var(--text-muted)]" />
              <span className="w-20 shrink-0 text-[13px] font-bold text-foreground">
                Login
              </span>
              <input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="azizbek_dtm"
                autoComplete="username"
                required
                className="w-full bg-transparent text-[14px] font-medium text-foreground placeholder:text-[var(--text-faint)] focus:outline-none"
              />
            </label>

            <label htmlFor="password" className="flex cursor-text items-center gap-3 rounded-full bg-[var(--ps-neutral)] px-4 py-3.5 ring-2 ring-transparent transition focus-within:bg-[var(--ps-paper)] focus-within:ring-[var(--ps-purple)]">
              <Lock className="size-4 shrink-0 text-[var(--text-muted)]" />
              <span className="w-20 shrink-0 text-[13px] font-bold text-foreground">
                Parol
              </span>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Kamida 8 belgi"
                autoComplete="new-password"
                required
                className="w-full bg-transparent text-[14px] font-medium text-foreground placeholder:text-[var(--text-faint)] focus:outline-none"
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="ps-btn ps-btn-ink h-13 w-full !min-h-13 justify-center !text-[15px] disabled:opacity-50"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : null}
            <span>{loading ? 'Yaratilmoqda...' : "Bepul ro'yxatdan o'tish"}</span>
            {!loading && <ArrowRight className="size-4" />}
          </button>
        </form>
      </div>
    </AuthShell>
  );
}
