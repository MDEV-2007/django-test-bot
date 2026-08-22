'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, Lock, User, Target, Swords, Bot, ArrowRight, Loader2 } from 'lucide-react';
import { login, ApiError } from '@/lib/api-client';
import SocialLogin from '@/components/SocialLogin';
import AuthShell from '@/components/auth/AuthShell';
import type { Profile } from '@/lib/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

const POINTS = [
  { icon: Target, text: 'Rasmiy formatdagi mock testlar va aniq prognoz ball' },
  { icon: Bot, text: "AI mentor xatolaringizni tahlil qilib, yo'l xaritasi tuzadi" },
  { icon: Swords, text: "1v1 arena, mini-o'yinlar va kunlik vazifalar" },
];

export default function LoginPage() {
  const router = useRouter();
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
      router.push(user.has_seen_onboarding ? '/dashboard' : '/onboarding');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Kirishda xatolik yuz berdi.');
    } finally {
      setLoading(false);
    }
  }

  function handleSocialSuccess(user: Profile) {
    router.push(user.has_seen_onboarding ? '/dashboard' : '/onboarding');
  }

  return (
    <AuthShell
      title="Hisobingizga kiring"
      description="Bilim ildizingiz sizni kutmoqda."
      points={POINTS}
      footer={
        <>
          Hisobingiz yo&apos;qmi?{' '}
          <Link href="/register" className="font-semibold text-[var(--accent-text)] hover:underline">
            Ro&apos;yxatdan o&apos;tish
          </Link>
        </>
      }
    >
      <div className="space-y-5">
        {error && (
          <p className="flex items-center gap-2 rounded-xl border border-rose-500/25 bg-rose-500/10 p-3 text-sm text-rose-300">
            <AlertCircle className="size-4 shrink-0" /> {error}
          </p>
        )}

        <SocialLogin onSuccess={handleSocialSuccess} />

        <div className="relative flex items-center justify-center">
          <Separator className="absolute inset-x-0" />
          <span className="relative bg-card px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            yoki
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Foydalanuvchi nomi</Label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="masalan: aziz_ilm"
                autoComplete="username"
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Parol</Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className="pl-10"
              />
            </div>
          </div>

          <Button type="submit" size="lg" disabled={loading} className="w-full">
            {loading ? <Loader2 className="size-4 animate-spin" /> : null}
            {loading ? 'Kirilmoqda...' : 'Hisobga kirish'}
            {!loading && <ArrowRight className="size-4" />}
          </Button>
        </form>
      </div>
    </AuthShell>
  );
}
