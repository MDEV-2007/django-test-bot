'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { fetchMe, refreshAccessToken } from '@/lib/api-client';

/** Runs once on app load: pulls the refresh token back out of localStorage, exchanges it
 * for a fresh access token, then fetches /api/auth/me/ to repopulate the user in the store.
 * Nothing is persisted except the refresh token — see auth-store.ts for why.
 *
 * Bu jarayon sahifani BLOKLAMAYDI. Ilgari u tugaguncha butun ilova o'rniga to'liq ekranli
 * yuklovchi chizilardi — ya'ni har bir "sovuq" ochilishda (Telegram Mini App'da har safar)
 * foydalanuvchi ikkita tarmoq so'rovi tugashini bo'sh ekranga qarab kutardi. Endi qobiq va
 * skeletonlar darhol chiziladi, seans esa fonda tiklanadi; sahifalar `authReady` orqali
 * "hali aniqlanmoqda" va "kirilmagan" holatlarini ajratadi. */
export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const { hydrate, setAccess, logout, setAuthReady } = useAuthStore();

  useEffect(() => {
    hydrate();
    (async () => {
      const refresh = useAuthStore.getState().refresh;
      if (!refresh) {
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
