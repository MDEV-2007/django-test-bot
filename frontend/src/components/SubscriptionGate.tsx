'use client';

import { useCallback, useEffect, useState } from 'react';
import { Megaphone, RefreshCw, CheckCircle2 } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { openTelegramLink, tgHaptic, useIsTelegram } from '@/lib/telegram';

/* Majburiy kanal obunasi — ikkinchi qatlam.
 *
 * Birinchi qatlam botda: /start kanalga obuna bo'lishni so'raydi (telegrambot/handlers.py).
 * Lekin Mini App'ni to'g'ridan-to'g'ri havola bilan ochish mumkin, obuna bo'lgandan keyin
 * kanalni tark etish ham mumkin — shuning uchun ilova ochilganda holat qayta tekshiriladi.
 *
 * Nega BLOKLOVCHI ekran, "keyinroq" tugmasisiz: yumshoq eslatmani deyarli hech kim
 * bosmaydi, natijada foydalanuvchi har ochilishda bezovta qilinadi, kanal esa o'smaydi.
 *
 * Nega faqat o'quvchiga: admin/o'qituvchi panelini obunaga bog'lash — bot kanalda admin
 * huquqini yo'qotgan kunda o'z platformasidan qulflanib qolish demak. Server tomonda
 * `is_subscribed` shunday hollarda ataylab "obuna" deb javob beradi, bu esa qo'shimcha
 * himoya (qarang: telegrambot/subscription.py).
 */

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
  /* Gate FAQAT Telegram ichida (bot orqali kirganda) ishlaydi. Oddiy brauzerdan
     saytga kirgan foydalanuvchi hech qachon bloklanmaydi — hisobiga Telegram
     ulangan bo'lsa ham: obuna sharti bot foydalanuvchisiga tegishli, sayt esa
     mustaqil mahsulot. Server ham xuddi shu qoidaga amal qiladi
     (accounts/permissions.py `IsChannelSubscribed`). */
  const inTelegram = useIsTelegram();
  const enabled = inTelegram && authReady && !!access && !!user && !staffExempt;

  useEffect(() => {
    if (!enabled) { setState(null); return; }
    let cancelled = false;
    apiFetch<SubscriptionState>('/api/auth/subscription/')
      .then((data) => { if (!cancelled) setState(data); })
      // Tekshiruv o'zi ishlamay qolsa ilovani bloklamaymiz — serverdagi qoida bilan bir xil.
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-[var(--bg-page)] px-5 py-10">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--border-card)] bg-[var(--surface-card-soft)]">
          <Megaphone className="h-7 w-7 text-[var(--accent-text)]" />
        </div>

        <h1 className="font-voice mt-5 text-xl font-bold text-[var(--text-primary)]">
          Kanalimizga obuna bo&apos;ling
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
          IlmIldizi bepul. Buning evaziga faqat bitta narsa so&apos;raymiz — rasmiy kanalga
          obuna. U yerda kunlik testlar, yangi funksiyalar va loyiha yangiliklari chiqadi.
        </p>

        <ul className="mt-5 space-y-2 text-left text-sm text-[var(--text-muted)]">
          {['Har kuni yangi test va tahlil', 'Yangi funksiyalar birinchi bo‘lib e’lon qilinadi', 'Imtihon muddatlari va eslatmalar'].map((line) => (
            <li key={line} className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent-text)]" />
              <span>{line}</span>
            </li>
          ))}
        </ul>

        {state.channel_url && (
          <button
            onClick={() => { tgHaptic('light'); openTelegramLink(state.channel_url); }}
            className="tactile-btn mt-6 w-full rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-hover)]"
          >
            {state.channel || 'Kanalga'} — obuna bo&apos;lish
          </button>
        )}

        <button
          onClick={recheck}
          disabled={checking}
          className="tactile-btn mt-2.5 flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--border-card)] bg-[var(--surface-card-soft)] px-4 py-3 text-sm font-semibold text-[var(--text-primary)] disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${checking ? 'animate-spin' : ''}`} />
          {checking ? 'Tekshirilmoqda…' : 'Obuna bo‘ldim, tekshirish'}
        </button>

        {missed && (
          <p className="mt-3 text-xs text-[var(--danger-text)]">
            Obuna hali ko&apos;rinmadi. Kanalga qo&apos;shilib, bir necha soniyadan so&apos;ng qayta bosing.
          </p>
        )}
      </div>
    </div>
  );
}
