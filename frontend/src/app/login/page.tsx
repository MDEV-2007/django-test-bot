'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, Lock, User, Target, Swords, Bot, ArrowRight, Loader2 } from 'lucide-react';
import { login, ApiError } from '@/lib/api-client';
import SocialLogin from '@/components/SocialLogin';
import AuthShell from '@/components/auth/AuthShell';
import type { Profile } from '@/lib/auth-store';

const POINTS = [
  { icon: Target, text: 'Rasmiy Milliy Sertifikat va BBA mock testlari + 96% aniq prognoz ball' },
  { icon: Bot, text: "24/7 AI Mentor har bir xatongizni qadam-baqadam tahlil qiladi" },
  { icon: Swords, text: "1v1 Bilim Arenasi, Bilim Reels va interaktiv xotira kartalari" },
];

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get('next');
  const targetNext = nextParam && nextParam.startsWith('/') ? nextParam : null;

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Foydalanuvchi nomi yoki parol xato!');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const user = await login(username, password);
      router.push(targetNext || (user.has_seen_onboarding ? '/dashboard' : '/onboarding'));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Kirishda xatolik yuz berdi.');
    } finally {
      setLoading(false);
    }
  }

  function handleSocialSuccess(user: Profile) {
    router.push(targetNext || (user.has_seen_onboarding ? '/dashboard' : '/onboarding'));
  }

  return (
    <AuthShell
      title="IlmIldizi ID bilan kirish"
      description="Shaxsiy o'quv kabinetingizga xush kelibsiz"
      points={POINTS}
      footer={
        <>
          Hisobingiz yo&apos;qmi?{' '}
          <Link
            href={targetNext ? `/register?next=${encodeURIComponent(targetNext)}` : '/register'}
            className="font-semibold text-[#007AFF] hover:underline"
          >
            Yangi IlmIldizi ID ochish →
          </Link>
        </>
      }
    >
      <div className="space-y-5">
        {error && (
          <div className="flex items-center gap-2.5 rounded-[16px] border border-[#FF3B30]/25 bg-[#FF3B30]/10 p-3.5 text-[13px] font-medium text-[#FF3B30]">
            <AlertCircle className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <SocialLogin onSuccess={handleSocialSuccess} />

        <div className="relative flex items-center justify-center py-1">
          <div className="h-px w-full bg-black/[0.06] dark:bg-white/[0.08]" />
          <span className="absolute bg-white dark:bg-[#1C1C1E] px-3 text-[11px] font-semibold uppercase tracking-wider text-[#8E8E93]">
            yoki login orqali
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* iOS Settings Inset Grouped Input Table */}
          <div className="overflow-hidden rounded-[18px] bg-[#F2F2F7] dark:bg-[#2C2C2E] border border-black/[0.06] dark:border-white/[0.08] divide-y divide-black/[0.06] dark:divide-white/[0.08]">
            <label htmlFor="username" className="flex items-center gap-3 px-4 py-3 cursor-text">
              <User className="size-4 shrink-0 text-[#8E8E93]" />
              <span className="w-24 shrink-0 text-[13px] font-semibold text-foreground">
                Login
              </span>
              <input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="masalan: aziz_ilm"
                autoComplete="username"
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
                placeholder="••••••••"
                autoComplete="current-password"
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
            <span>{loading ? 'Kirilmoqda...' : 'Hisobga kirish'}</span>
            {!loading && <ArrowRight className="size-4" />}
          </button>
        </form>
      </div>
    </AuthShell>
  );
}
