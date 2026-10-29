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
            className="font-semibold text-[#007AFF] hover:underline"
          >
            Hisobga kirish →
          </Link>
        </>
      }
    >
      <div className="space-y-5">
        {refCode && (
          <div className="flex items-start gap-2.5 rounded-[16px] border border-[#FF9500]/30 bg-[#FF9500]/10 p-3.5 text-[13px] leading-snug text-foreground">
            <Gift className="mt-0.5 size-4 shrink-0 text-[#FF9500]" />
            <span>
              <strong className="text-[#FF9500]">Taklif bonusi:</strong> sizga va do&apos;stingizga ro&apos;yxatdan o&apos;tishda{' '}
              <strong>bonus tanga</strong> taqdim etiladi.
            </span>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2.5 rounded-[16px] border border-[#FF3B30]/25 bg-[#FF3B30]/10 p-3.5 text-[13px] font-medium text-[#FF3B30]">
            <AlertCircle className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <SocialLogin refCode={refCode} onSuccess={handleSocialSuccess} />

        <div className="relative flex items-center justify-center py-1">
          <div className="h-px w-full bg-black/[0.06] dark:bg-white/[0.08]" />
          <span className="absolute bg-white dark:bg-[#1C1C1E] px-3 text-[11px] font-semibold uppercase tracking-wider text-[#8E8E93]">
            yoki ma&apos;lumotlar bilan
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* iOS Settings Inset Grouped Form */}
          <div className="overflow-hidden rounded-[18px] bg-[#F2F2F7] dark:bg-[#2C2C2E] border border-black/[0.06] dark:border-white/[0.08] divide-y divide-black/[0.06] dark:divide-white/[0.08]">
            <label htmlFor="first_name" className="flex items-center gap-3 px-4 py-3 cursor-text">
              <User className="size-4 shrink-0 text-[#8E8E93]" />
              <span className="w-24 shrink-0 text-[13px] font-semibold text-foreground">
                Ism
              </span>
              <input
                id="first_name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Azizbek"
                autoComplete="given-name"
                required
                className="w-full bg-transparent text-[14px] font-medium text-foreground placeholder:text-[#8E8E93] focus:outline-none"
              />
            </label>

            <label htmlFor="last_name" className="flex items-center gap-3 px-4 py-3 cursor-text">
              <User className="size-4 shrink-0 text-[#8E8E93]" />
              <span className="w-24 shrink-0 text-[13px] font-semibold text-foreground">
                Familiya
              </span>
              <input
                id="last_name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Qodirov"
                autoComplete="family-name"
                required
                className="w-full bg-transparent text-[14px] font-medium text-foreground placeholder:text-[#8E8E93] focus:outline-none"
              />
            </label>

            <label htmlFor="username" className="flex items-center gap-3 px-4 py-3 cursor-text">
              <AtSign className="size-4 shrink-0 text-[#8E8E93]" />
              <span className="w-24 shrink-0 text-[13px] font-semibold text-foreground">
                Login
              </span>
              <input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="azizbek_dtm"
                autoComplete="username"
                required
                className="w-full bg-transparent text-[14px] font-medium text-foreground placeholder:text-[#8E8E93] focus:outline-none"
              />
            </label>

            <label htmlFor="password" className="flex items-center gap-3 px-4 py-3 cursor-text">
              <Lock className="size-4 shrink-0 text-[#8E8E93]" />
              <span className="w-24 shrink-0 text-[13px] font-semibold text-foreground">
                Parol
              </span>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Kamida 6 belgi"
                autoComplete="new-password"
                required
                className="w-full bg-transparent text-[14px] font-medium text-foreground placeholder:text-[#8E8E93] focus:outline-none"
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#007AFF] px-6 text-[15px] font-semibold text-white shadow-[0_8px_20px_-4px_rgba(0,122,255,0.45)] hover:bg-[#0071EB] active:scale-[0.98] disabled:opacity-50 transition-all cursor-pointer"
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
