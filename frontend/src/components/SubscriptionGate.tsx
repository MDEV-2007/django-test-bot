'use client';

import { useCallback, useEffect, useState } from 'react';
import { Megaphone, RefreshCw, CheckCircle2, Sparkles, ExternalLink } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { openTelegramLink, tgHaptic, useIsTelegram } from '@/lib/telegram';

type SubscriptionState = {
  required: boolean;
  subscribed: boolean;
  channel: string;
  channel_url: string;
};

export default function SubscriptionGate() {
  const { user, access, authReady } = useAuthStore();
  const [state, setState] = useState<SubscriptionState | null>(null);
  const [checking, setChecking] = useState(false);
  const [missed, setMissed] = useState(false);

  const staffExempt = !!user && (user.is_superadmin || user.is_teacher);
  const inTelegram = useIsTelegram();
  const enabled = inTelegram && authReady && !!access && !!user && !staffExempt;

  useEffect(() => {
    if (!enabled) { setState(null); return; }
    let cancelled = false;
    apiFetch<SubscriptionState>('/api/auth/subscription/')
      .then((data) => { if (!cancelled) setState(data); })
      .catch(() => { if (!cancelled) setState(null); });
    return () => { cancelled = true; };
  }, [enabled, user?.id]);

  const recheck = useCallback(async () => {
    setChecking(true);
    setMissed(false);
    try {
      const data = await apiFetch<SubscriptionState>('/api/auth/subscription/check/', { method: 'POST' });
      setState(data);
      if (data.required && !data.subscribed) {
        setMissed(true);
        tgHaptic('error');
      } else {
        tgHaptic('success');
      }
    } catch {
      setState(null);
    } finally {
      setChecking(false);
    }
  }, []);

  if (!enabled || !state?.required || state.subscribed) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-background/85 backdrop-blur-xl px-4 py-8">
      <div className="ios-card relative w-full max-w-sm overflow-hidden rounded-[32px] p-6 sm:p-7 text-center shadow-2xl">
        <div className="pointer-events-none absolute -top-20 left-1/2 size-48 -translate-x-1/2 rounded-full bg-[#007AFF]/15 blur-3xl" />

        <div className="relative mx-auto flex size-16 items-center justify-center rounded-[20px] bg-gradient-to-b from-[#007AFF] to-[#0055D4] text-white shadow-[0_10px_24px_rgba(0,122,255,0.32),inset_0_1px_0_rgba(255,255,255,0.28)]">
          <Megaphone className="size-7" />
        </div>

        <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#007AFF]/12 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-[#007AFF]">
          <Sparkles className="size-3" /> Rasmiy hamjamiyat
        </div>

        <h1 className="mt-3 text-xl font-extrabold tracking-[-0.025em] text-foreground">
          Kanalimizga obuna bo&apos;ling
        </h1>
        <p className="mt-2 text-xs sm:text-sm leading-relaxed text-muted-foreground">
          IlmIldizi bepul. Buning evaziga faqat bitta narsa so&apos;raymiz — rasmiy kanalga
          obuna. U yerda kunlik testlar, yangi funksiyalar va loyiha yangiliklari chiqadi.
        </p>

        <ul className="mt-5 space-y-2.5 rounded-[22px] border border-border bg-muted/45 p-4 text-left text-xs text-foreground">
          {[
            'Har kuni yangi test va tahlil',
            'Yangi funksiyalar birinchi bo‘lib e’lon qilinadi',
            'Imtihon muddatlari va eslatmalar',
          ].map((line) => (
            <li key={line} className="flex items-center gap-2.5">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#34C759]/15 text-[#34C759]">
                <CheckCircle2 className="size-3.5" />
              </span>
              <span className="font-medium">{line}</span>
            </li>
          ))}
        </ul>

        {state.channel_url && (
          <button
            type="button"
            onClick={() => { tgHaptic('light'); openTelegramLink(state.channel_url); }}
            className="ios-spring mt-5 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full bg-[#007AFF] px-5 py-3 text-sm font-bold text-white shadow-[0_8px_20px_rgba(0,122,255,0.32),inset_0_1px_0_rgba(255,255,255,0.28)] transition hover:opacity-95 cursor-pointer"
          >
            <span>{state.channel || 'Kanalga'} — obuna bo&apos;lish</span>
            <ExternalLink className="size-3.5 opacity-80" />
          </button>
        )}

        <button
          type="button"
          onClick={recheck}
          disabled={checking}
          className="ios-spring mt-2.5 flex min-h-[46px] w-full items-center justify-center gap-2 rounded-full border border-border bg-muted/70 px-5 py-2.5 text-xs font-bold text-foreground transition hover:bg-muted disabled:opacity-60 cursor-pointer"
        >
          <RefreshCw className={`size-4 ${checking ? 'animate-spin' : ''}`} />
          <span>{checking ? 'Tekshirilmoqda…' : 'Obuna bo‘ldim, tekshirish'}</span>
        </button>

        {missed && (
          <p className="mt-3 rounded-[16px] bg-[#FF3B30]/10 px-3 py-2 text-xs font-semibold text-[#FF3B30]">
            Obuna hali ko&apos;rinmadi. Kanalga qo&apos;shilib, bir necha soniyadan so&apos;ng qayta bosing.
          </p>
        )}
      </div>
    </div>
  );
}
