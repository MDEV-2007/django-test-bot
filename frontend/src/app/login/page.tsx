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
            className="font-bold text-[var(--ps-purple)] underline-offset-4 hover:underline"
          >
            Yangi IlmIldizi ID ochish →
          </Link>
        </>
      }
    >
      <div className="space-y-5">
        {error && (
          <div className="flex items-center gap-2.5 rounded-[18px] bg-[var(--ps-coral)] p-3.5 text-[13px] font-semibold text-white">
            <AlertCircle className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <SocialLogin onSuccess={handleSocialSuccess} />

        <div className="relative flex items-center justify-center py-1">
          <div className="h-px w-full bg-[var(--border-card)]" />
          <span className="absolute bg-[var(--ps-paper)] px-3 text-[12px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            yoki login orqali
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* iOS Settings Inset Grouped Input Table */}
          <div className="space-y-2.5">
            <label htmlFor="username" className="flex cursor-text items-center gap-3 rounded-full bg-[var(--ps-neutral)] px-4 py-3.5 ring-2 ring-transparent transition focus-within:bg-[var(--ps-paper)] focus-within:ring-[var(--ps-purple)]">
              <User className="size-4 shrink-0 text-[var(--text-muted)]" />
              <span className="w-20 shrink-0 text-[13px] font-bold text-foreground">
                Login
              </span>
              <input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="masalan: aziz_ilm"
                autoComplete="username"
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
                placeholder="••••••••"
                autoComplete="current-password"
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
            <span>{loading ? 'Kirilmoqda...' : 'Hisobga kirish'}</span>
            {!loading && <ArrowRight className="size-4" />}
          </button>
        </form>
      </div>
    </AuthShell>
  );
}
