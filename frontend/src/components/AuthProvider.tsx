'use client';

import { useEffect } from 'react';
import { useAuthStore, TG_MANUAL_LOGOUT_KEY, REFRESH_KEY } from '@/lib/auth-store';
import { fetchMe, loginWithTelegram, refreshAccessToken } from '@/lib/api-client';
import { isTelegramEnv, loadTelegramSdk } from '@/lib/telegram';
import { useFeaturesStore } from '@/lib/features';

/** Runs once on app load: pulls access & refresh tokens from localStorage, hydrates store,
 * and validates the session in the background without blocking the UI.
 *
 * Telegram Mini App ichida ochilganda: agar sessiya hali bo'lmasa, initData orqali
 * darhol avtomatik kiriladi va kanal obunasi holati tekshiriladi.
 */
export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const { hydrate, logout, setAuthReady, setUser } = useAuthStore();

  useEffect(() => {
    hydrate();
    (async () => {
      const state = useAuthStore.getState();
      const hasRefresh = !!state.refresh || (typeof window !== 'undefined' && !!localStorage.getItem(REFRESH_KEY));
      let access = state.access;

      if (!hasRefresh && !access) {
        if (isTelegramEnv()) {
          try {
            const wa = await loadTelegramSdk();
            const manualOut = typeof window !== 'undefined' && sessionStorage.getItem(TG_MANUAL_LOGOUT_KEY) === '1';
            if (wa?.initData && !manualOut) {
              await loginWithTelegram(wa.initData, wa.initDataUnsafe?.start_param);
              setAuthReady();
              return;
            }
          } catch {
            // avtomatik kirishda tarmoq xatosi bo'lsa mehmon sifatida davom etadi
          }
        }
        setAuthReady();
        useFeaturesStore.getState().fetchFeatures();
        return;
      }

      // Agar access token bo'lmasa, refresh orqali yangilab olamiz
      if (!access && hasRefresh) {
        access = await refreshAccessToken();
      }

      // Agar foydalanuvchida token bor bo'lsa, UI darhol ochiladi (flicker va sekinlashuvsiz)
      setAuthReady();
      useFeaturesStore.getState().fetchFeatures();

      // Orqa fonda profil ma'lumotlarini (xp, coins, streak va h.k.) sinxronlash
      if (access) {
        try {
          const me = await fetchMe();
          setUser(me);
        } catch (err: unknown) {
          // MUHIM: Faqat 401 Unauthorized (token haqiqatda bekor qilingan) bo'lgandagina logout!
          // Tarmoq uzilishi (status 0), server 502/504 yoki reload paytidagi abort xatolarida
          // foydalanuvchi sessiyasi HECH QACHON o'chirilmaydi!
          const status = (err && typeof err === 'object' && 'status' in err) ? (err as { status: number }).status : 0;
          if (status === 401) {
            logout();
          }
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <>{children}</>;
}

