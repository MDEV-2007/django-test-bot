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
      /* Foydalanuvchi o'zi chiqqan bo'lsa — avtomatik kirmaymiz. Aks holda "chiqish"
         tugmasi hech qachon ishlamaydi: sahifa /login ga o'tadi va shu zahoti qayta
         kiritadi. Tugma qoladi — xohlasa bir bosishda qaytadi. */
      try {
        if (sessionStorage.getItem(TG_MANUAL_LOGOUT_KEY) === '1') return;
      } catch { /* private mode — avtomatik kirish davom etadi */ }
      try {
        const user = await loginWithTelegram(wa.initData, refCode || wa.initDataUnsafe?.start_param);
        if (!cancelled) onSuccess(user);
      } catch {
        /* tugma orqali qo'lda urinib ko'rish mumkin */
      }
    }

    /* Telegram BIRINCHI va Google'dan MUSTAQIL ishlaydi.

       Ilgari ikkalasi bitta ketma-ketlikda edi: avval `fetchAuthConfig()`, keyin
       Google skripti, keyin Telegram. Telegram'ning ichki brauzerida
       accounts.google.com ko'pincha yuklanmaydi — o'sha yerda `return` bo'lib,
       Telegram tugmasi umuman ko'rinmay qolardi. Endi biri ishlamasa ikkinchisiga
       ta'sir qilmaydi. */
    (async () => {
      if (!isTelegramEnv()) return;
      const wa = await loadTelegramSdk();
      if (cancelled) return;
      if (!wa?.initData) {
        // Mini App ichidamiz, lekin Telegram foydalanuvchi ma'lumotini bermadi —
        // sukut saqlash o'rniga sababini aytamiz, aks holda ekran "bo'sh" ko'rinadi.
        setError("Telegram ma'lumotlari kelmadi. Ilovani bot menyusidagi tugma orqali oching.");
        return;
      }
      setShowTelegram(true);

      /* Mini App'da foydalanuvchi allaqachon Telegram hisobidan kirgan — undan
         yana "kirish" tugmasini bosishni so'rash ortiqcha qadam. Jimgina kiritamiz;
         xatolik bo'lsa tugma qo'lda bosish uchun ochiq qoladi. */
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
      /* Tugma ko'rinishi qo'lda sozlanadi — Google faqat shu bir nechta parametrni
         beradi, qolgani iframe ichida va CSS bilan o'zgartirib bo'lmaydi.

         `filled_black` — qorong'i mavzuga mos (ilgari `outline` edi: qop-qora
         kartada oppoq tugma bo'lib ajralib turardi).
         Eni konteynerdan o'lchanadi, 400px — Google qo'yган yuqori chegara. Ilgari
         qattiq 320px yozilgan edi va tugma matn maydonlaridan tor bo'lib, qatorlar
         tekislanmay turardi.
         Burchaklar o'ramning `rounded-xl` + `overflow-hidden` klasslari bilan
         kesiladi (pastdagi JSX), shunda u forma tugmalari bilan bir xil bo'ladi. */
      const width = Math.min(400, Math.round(googleBtnRef.current.offsetWidth) || 400);
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: 'filled_black',
        size: 'large',
        shape: 'rectangular',
        text: 'continue_with',
        /* Logotip chap chetda. Google uni har doim OQ kvadrat ustida chizadi (brend
           talabi) va buni tashqaridan o'zgartirib bo'lmaydi — tugma iframe ichida.
           `center` bilan sinab ko'rildi: u holda oq kvadrat tugma O'RTASIDA qolib,
           yanada g'alati ko'rinadi. Chap chetda esa u standart Google tugmasidek
           o'qiladi. */
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
      /* Bot havolasidagi `?start=<kod>` Telegram tomonidan `start_param` sifatida
         uzatiladi — Mini App'da taklif kodi shu yerdan keladi. */
      const user = await loginWithTelegram(wa.initData, refCode || wa.initDataUnsafe?.start_param);
      onSuccess(user);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Telegram orqali kirishda xatolik yuz berdi.");
    }
  }

  return (
    <div className="space-y-2.5">
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-500/25 bg-rose-500/10 p-3 text-xs text-rose-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {/* Google tugmasi iframe ichida chiziladi — uning burchagini o'zgartirib
          bo'lmaydi, shuning uchun o'ram `rounded-xl` bilan kesib qo'yadi. Shu tariqa
          u formadagi boshqa tugmalar bilan bir xil ko'rinadi. */}
      <div ref={googleBtnRef} className="flex justify-center overflow-hidden rounded-xl" />
      {showTelegram && (
        <button
          type="button"
          onClick={handleTelegram}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#2AABEE] px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#2297d3]"
        >
          <Send className="h-4 w-4" />
          <span>Telegram orqali kirish</span>
        </button>
      )}
    </div>
  );
}
