'use client';

import { useEffect, useRef, useState } from 'react';
import { Send, AlertCircle } from 'lucide-react';
import { fetchAuthConfig, loginWithGoogle, loginWithTelegram, ApiError } from '@/lib/api-client';
import { TG_MANUAL_LOGOUT_KEY, type Profile } from '@/lib/auth-store';
import { getWebApp, isTelegramEnv, loadTelegramSdk } from '@/lib/telegram';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (opts: { client_id: string; callback: (resp: { credential: string }) => void }) => void;
          renderButton: (el: HTMLElement, opts: Record<string, unknown>) => void;
        };
      };
    };
  }
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

export default function SocialLogin({ refCode, onSuccess }: { refCode?: string; onSuccess: (user: Profile) => void }) {
  const googleBtnRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [showTelegram, setShowTelegram] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function autoLogin() {
      const wa = getWebApp();
      if (!wa?.initData) return;
      try {
        if (sessionStorage.getItem(TG_MANUAL_LOGOUT_KEY) === '1') return;
      } catch { /* private mode */ }
      try {
        const user = await loginWithTelegram(wa.initData, refCode || wa.initDataUnsafe?.start_param);
        if (!cancelled) onSuccess(user);
      } catch {
        /* manual fallback */
      }
    }

    (async () => {
      if (!isTelegramEnv()) return;
      const wa = await loadTelegramSdk();
      if (cancelled) return;
      if (!wa?.initData) {
        setError("Telegram ma'lumotlari kelmadi. Ilovani bot menyusidagi tugma orqali oching.");
        return;
      }
      setShowTelegram(true);
      autoLogin();
    })();

    (async () => {
      const config = await fetchAuthConfig().catch(() => null);
      if (cancelled || !config?.google_client_id) return;

      await loadScript('https://accounts.google.com/gsi/client').catch(() => null);
      if (cancelled || !window.google || !googleBtnRef.current) return;
      window.google.accounts.id.initialize({
        client_id: config.google_client_id,
        callback: async (resp) => {
          try {
            const user = await loginWithGoogle(resp.credential, refCode);
            onSuccess(user);
          } catch (err) {
            setError(err instanceof ApiError ? err.message : "Google orqali kirishda xatolik yuz berdi.");
          }
        },
      });
      const width = Math.min(400, Math.round(googleBtnRef.current.offsetWidth) || 360);
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: 'outline',
        size: 'large',
        shape: 'pill',
        text: 'continue_with',
        logo_alignment: 'left',
        width,
      });
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleTelegram() {
    setError(null);
    const wa = getWebApp();
    if (!wa?.initData) return;
    try {
      const user = await loginWithTelegram(wa.initData, refCode || wa.initDataUnsafe?.start_param);
      onSuccess(user);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Telegram orqali kirishda xatolik yuz berdi.");
    }
  }

  return (
    <div className="space-y-2.5">
      {error && (
        <div className="flex items-center gap-2 rounded-[14px] border border-[#FF3B30]/25 bg-[#FF3B30]/10 p-3 text-xs font-medium text-[#FF3B30]">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      <div ref={googleBtnRef} className="flex justify-center overflow-hidden rounded-full" />
      {showTelegram && (
        <button
          type="button"
          onClick={handleTelegram}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#007AFF] px-4 text-[14px] font-semibold text-white shadow-[0_4px_14px_rgba(0,122,255,0.3)] transition-all hover:bg-[#0071EB] active:scale-[0.98]"
        >
          <Send className="h-4 w-4" />
          <span>Telegram orqali davom etish</span>
        </button>
      )}
    </div>
  );
}
