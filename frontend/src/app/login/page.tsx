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
            className="font-semibold text-[#007AFF] hover:underline"
          >
            Yangi IlmIldizi ID ochish →
          </Link>
        </>
      }
    >
      <div className="space-y-5">
        {/* Live onlayn indikatori */}
        <div className="flex items-center justify-between px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-bold">
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>240+ o&apos;quvchi hozir platformada test yechmoqda</span>
          </div>
          <span className="font-mono text-[11px] text-emerald-400">Jonli</span>
        </div>

        {/* 3-Savollik Interaktiv DTM Mini-Blits Viktorinasi */}
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.06] p-4 text-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-bold text-amber-500">
              <Zap className="size-4 fill-current" />
              <span>Ekspress Sinov: 3 ta savolda darajangizni biling</span>
            </div>
            <button
              type="button"
              onClick={() => setShowBlitz(!showBlitz)}
              className="text-xs font-bold text-primary hover:underline cursor-pointer"
            >
              {showBlitz ? "Yashirish" : "Sinab ko'rish"}
            </button>
          </div>

          {showBlitz && (
            <div className="pt-2 border-t border-amber-500/20 space-y-2.5">
              {!blitzDone ? (
                <>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Savol {blitzIdx + 1} / {MINI_BLITZ_QUESTIONS.length}</span>
                    <span>To&apos;g&apos;ri: {blitzScore} ta</span>
                  </div>
                  <p className="font-bold text-foreground text-xs leading-snug">
                    {MINI_BLITZ_QUESTIONS[blitzIdx].q}
                  </p>
                  <div className="grid grid-cols-1 gap-1.5 pt-1">
                    {MINI_BLITZ_QUESTIONS[blitzIdx].options.map((opt, oIdx) => {
                      const isSel = blitzSelected === oIdx;
                      const isCorr = oIdx === MINI_BLITZ_QUESTIONS[blitzIdx].correct;
                      let cls = 'bg-card/70 border-border text-foreground hover:bg-card';
                      if (blitzSelected !== null) {
                        if (isCorr) cls = 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400 font-bold';
                        else if (isSel) cls = 'bg-rose-500/20 border-rose-500/40 text-rose-400';
                      }
                      return (
                        <button
                          key={oIdx}
                          type="button"
                          disabled={blitzSelected !== null}
                          onClick={() => handleBlitzSelect(oIdx)}
                          className={`p-2.5 rounded-xl border text-left text-xs transition-all flex items-center justify-between cursor-pointer ${cls}`}
                        >
                          <span>{opt}</span>
                          {blitzSelected !== null && isCorr && <CheckCircle2 className="size-3.5 text-emerald-400" />}
                        </button>
                      );
                    })}
                  </div>
                  {blitzSelected !== null && (
                    <p className="text-[11px] text-amber-400 font-medium pt-1">
                      💡 {MINI_BLITZ_QUESTIONS[blitzIdx].aha}
                    </p>
                  )}
                </>
              ) : (
                <div className="text-center py-2 space-y-2">
                  <p className="text-sm font-black text-foreground">
                    🎉 Natijangiz: {blitzScore} / {MINI_BLITZ_QUESTIONS.length} to&apos;g&apos;ri!
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    To&apos;liq tahlil, 24/7 AI Mentor va DTM prognozini ko&apos;rish uchun tizimga kiring:
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

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
