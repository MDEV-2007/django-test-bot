'use client';

import { useEffect } from 'react';
import { useAuthStore, TG_MANUAL_LOGOUT_KEY } from '@/lib/auth-store';
import { fetchMe, loginWithTelegram, refreshAccessToken } from '@/lib/api-client';
import { isTelegramEnv, loadTelegramSdk } from '@/lib/telegram';

/** Runs once on app load: pulls the refresh token back out of localStorage, exchanges it
 * for a fresh access token, then fetches /api/auth/me/ to repopulate the user in the store.
 * Nothing is persisted except the refresh token — see auth-store.ts for why.
 *
 * Telegram Mini App ichida ochilganda: agar sessiya hali bo'lmasa, initData orqali
 * darhol avtomatik kiriladi va kanal obunasi holati tekshirilib, obuna bo'lmagan
 * o'quvchi darhol bloklanadi.
 */
export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const { hydrate, setAccess, logout, setAuthReady } = useAuthStore();

  useEffect(() => {
    hydrate();
    (async () => {
      const refresh = useAuthStore.getState().refresh;
      if (!refresh) {
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
        return;
      }
      const access = await refreshAccessToken();
      if (!access) {
        setAuthReady();
        return;
      }
      setAccess(access);
      try {
        const me = await fetchMe();
        useAuthStore.setState({ user: me });
      } catch {
        logout();
      }
      setAuthReady();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <>{children}</>;
}
