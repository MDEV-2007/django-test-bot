'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlertCircle, Lock, User, Target, Swords, Bot, ArrowRight,
  Loader2, Zap, CheckCircle2, Flame, Users, Sparkles
} from 'lucide-react';
import { login, ApiError } from '@/lib/api-client';
import SocialLogin from '@/components/SocialLogin';
import AuthShell from '@/components/auth/AuthShell';
import type { Profile } from '@/lib/auth-store';
import { Button } from '@/components/ui/button';
import { tgHaptic } from '@/lib/telegram';
import { soundFX } from '@/lib/soundFX';

const POINTS = [
  { icon: Target, text: 'Rasmiy Milliy Sertifikat va BBA mock testlari + 96% aniq prognoz ball' },
  { icon: Bot, text: "24/7 AI Mentor har bir xatongizni qadam-baqadam tahlil qiladi" },
  { icon: Swords, text: "1v1 Bilim Arenasi, Bilim Reels va interaktiv xotira kartalari" },
];

const MINI_BLITZ_QUESTIONS = [
  {
    q: "O'zbekiston Respublikasi Davlat mustaqilligi qachon e'lon qilingan?",
    options: ["1991-yil 31-avgust", "1991-yil 1-sentyabr", "1990-yil 20-iyun", "1992-yil 8-dekabr"],
    correct: 0,
    aha: "1991-yil 31-avgustda Oliy Kengash sessiyasida e'lon qilingan!",
  },
  {
    q: "Amir Temur davlatining poytaxti qaysi shahar bo'lgan?",
    options: ["Samarqand", "Buxoro", "Shahrisabz", "Hirot"],
    correct: 0,
    aha: "Amir Temur Samarqandni 'Sayqali ro'yi zamin' deb atab, poytaxt qilgan.",
  },
  {
    q: "Alisher Navoiy qaysi asari bilan turkiy tilning boyligini isbotlagan?",
    options: ["Muhokamat ul-lug'atayn", "Xamsa", "Lison ut-tayr", "Mahbub ul-qulub"],
    correct: 0,
    aha: "Muhokamat ul-lug'atayn asarida turkiy va forsiy tillarni qiyoslagan.",
  },
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

  // 3-Question DTM Mini-Blitz State
  const [showBlitz, setShowBlitz] = useState(false);
  const [blitzIdx, setBlitzIdx] = useState(0);
  const [blitzScore, setBlitzScore] = useState(0);
  const [blitzSelected, setBlitzSelected] = useState<number | null>(null);
  const [blitzDone, setBlitzDone] = useState(false);

  const handleBlitzSelect = (optIdx: number) => {
    if (blitzSelected !== null) return;
    setBlitzSelected(optIdx);
    const isCorr = optIdx === MINI_BLITZ_QUESTIONS[blitzIdx].correct;
    if (isCorr) {
      soundFX.correct?.();
      tgHaptic('light');
      setBlitzScore((s) => s + 1);
    } else {
      soundFX.incorrect?.();
      tgHaptic('medium');
    }

    setTimeout(() => {
      if (blitzIdx < MINI_BLITZ_QUESTIONS.length - 1) {
        setBlitzIdx((i) => i + 1);
        setBlitzSelected(null);
      } else {
        setBlitzDone(true);
      }
    }, 1200);
  };

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
        {/* Live onlayn indikatori */}
        <div className="flex items-center justify-between rounded-full bg-[var(--ps-green)] px-4 py-2 text-xs font-bold text-white">
          <div className="flex items-center gap-1.5">
            <span className="size-2 animate-pulse rounded-full bg-white" />
            <span>240+ o&apos;quvchi hozir platformada test yechmoqda</span>
          </div>
          <span className="rounded-full bg-white/20 px-2 py-0.5 text-[11px]">Jonli</span>
        </div>

        {/* 3-Savollik Interaktiv DTM Mini-Blits Viktorinasi */}
        <div className="space-y-3 rounded-[24px] bg-[var(--ps-orange)] p-4 text-xs text-[#080808]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-bold">
              <Zap className="size-4 fill-current" />
              <span>Ekspress Sinov: 3 ta savolda darajangizni biling</span>
            </div>
            <button
              type="button"
              onClick={() => setShowBlitz(!showBlitz)}
              className="cursor-pointer rounded-full bg-[#080808] px-3 py-1 text-xs font-bold text-[#FFFCF7]"
            >
              {showBlitz ? "Yashirish" : "Sinab ko'rish"}
            </button>
          </div>

          {showBlitz && (
            <div className="space-y-2.5 border-t border-black/10 pt-2">
              {!blitzDone ? (
                <>
                  <div className="flex items-center justify-between text-[12px] text-black/60">
                    <span>Savol {blitzIdx + 1} / {MINI_BLITZ_QUESTIONS.length}</span>
                    <span>To&apos;g&apos;ri: {blitzScore} ta</span>
                  </div>
                  <p className="text-[13px] font-bold leading-snug">
                    {MINI_BLITZ_QUESTIONS[blitzIdx].q}
                  </p>
                  <div className="grid grid-cols-1 gap-1.5 pt-1">
                    {MINI_BLITZ_QUESTIONS[blitzIdx].options.map((opt, oIdx) => {
                      const isSel = blitzSelected === oIdx;
                      const isCorr = oIdx === MINI_BLITZ_QUESTIONS[blitzIdx].correct;
                      let cls = 'bg-[#FFFCF7]/80 border-transparent text-[#080808] hover:bg-[#FFFCF7]';
                      if (blitzSelected !== null) {
                        if (isCorr) cls = 'bg-[var(--ps-green)] border-transparent text-white font-bold';
                        else if (isSel) cls = 'bg-[var(--ps-coral)] border-transparent text-white';
                      }
                      return (
                        <button
                          key={oIdx}
                          type="button"
                          disabled={blitzSelected !== null}
                          onClick={() => handleBlitzSelect(oIdx)}
                          className={`p-2.5 rounded-full px-4 border text-left text-xs transition-all flex items-center justify-between cursor-pointer ${cls}`}
                        >
                          <span>{opt}</span>
                          {blitzSelected !== null && isCorr && <CheckCircle2 className="size-3.5" />}
                        </button>
                      );
                    })}
                  </div>
                  {blitzSelected !== null && (
                    <p className="pt-1 text-[12px] font-semibold text-black/70">
                      💡 {MINI_BLITZ_QUESTIONS[blitzIdx].aha}
                    </p>
                  )}
                </>
              ) : (
                <div className="text-center py-2 space-y-2">
                  <p className="text-sm font-bold">
                    🎉 Natijangiz: {blitzScore} / {MINI_BLITZ_QUESTIONS.length} to&apos;g&apos;ri!
                  </p>
                  <p className="text-[12px] text-black/65">
                    To&apos;liq tahlil, 24/7 AI Mentor va DTM prognozini ko&apos;rish uchun tizimga kiring:
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

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
