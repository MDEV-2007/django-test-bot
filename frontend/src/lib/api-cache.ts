'use client';

/* GET so'rovlari uchun xotira keshi (stale-while-revalidate).
 *
 * Muammo: har bir sahifa `useEffect` ichida `apiFetch` chaqirar, natija hech qayerda
 * saqlanmasdi. Shuning uchun "Testlar -> Dashboard -> Testlar" yo'lida har safar bo'sh
 * ekran + spinner ko'rinardi, garchi ma'lumot bir necha soniya oldin olingan bo'lsa ham.
 * Telegram Mini App'da (sekin mobil tarmoq + tunnel) bu ayniqsa sezilarli edi.
 *
 * Yechim: oxirgi muvaffaqiyatli javob yo'l (path) bo'yicha saqlanadi va sahifa OCHILISHI
 * bilanoq ko'rsatiladi; yangi so'rov fonda ketadi va kelganda ma'lumot yangilanadi. Ya'ni
 * navigatsiya "bir zumda" ko'rinadi, lekin ma'lumot eskirib qolmaydi.
 *
 * Bir vaqtda bir xil yo'lni so'ragan komponentlar bitta so'rovni bo'lishadi (dedupe).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch } from './api-client';
import { useAuthStore } from './auth-store';

type Entry = { data: unknown; at: number };

const cache = new Map<string, Entry>();
const inflight = new Map<string, Promise<unknown>>();

/** Ma'lumot o'zgargandan keyin (sotib olish, test boshlash, sozlama saqlash) keshni
 *  tozalash uchun. Prefiks berilsa faqat shu bilan boshlanadigan yo'llar o'chadi. */
export function invalidateApi(prefix?: string) {
  if (!prefix) {
    cache.clear();
    return;
  }
  for (const key of [...cache.keys()]) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}

/** Keshda bor bo'lsa darhol qaytaradi; bo'lmasa so'rov yuboradi. */
function fetchShared<T>(path: string): Promise<T> {
  const existing = inflight.get(path);
  if (existing) return existing as Promise<T>;

  const p = apiFetch<T>(path)
    .then((data) => {
      cache.set(path, { data, at: Date.now() });
      return data;
    })
    .finally(() => { inflight.delete(path); });

  inflight.set(path, p);
  return p;
}

/** Sahifa ochilishidan OLDIN ma'lumotni yuklab qo'yish (havola ustiga kelganda). */
export function prefetchApi(path: string) {
  if (cache.has(path) || inflight.has(path)) return;
  if (!useAuthStore.getState().access) return;
  fetchShared(path).catch(() => { /* prefetch jim ishlaydi */ });
}

export type ApiQuery<T> = {
  data: T | null;
  error: string | null;
  /** Faqat BIRINCHI marta (keshda hech narsa bo'lmaganda) true bo'ladi. */
  loading: boolean;
  /** Fonda yangilanish ketyaptimi — nozik indikator uchun. */
  refreshing: boolean;
  refresh: () => Promise<void>;
};

/**
 * `path` null bo'lsa so'rov yuborilmaydi (shartli so'rovlar uchun).
 * Sahifa avval keshdagi ma'lumotni ko'rsatadi, keyin uni jimgina yangilaydi.
 */
export function useApiQuery<T>(path: string | null): ApiQuery<T> {
  const access = useAuthStore((s) => s.access);
  const cached = path ? (cache.get(path)?.data as T | undefined) : undefined;

  const [data, setData] = useState<T | null>(cached ?? null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  // `data` null bo'lsayu so'rov ketayotgan bo'lsa — bu birinchi yuklanish.
  const [loading, setLoading] = useState(cached === undefined);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const run = useCallback(async () => {
    if (!path) return;
    const hasCached = cache.has(path);
    if (hasCached) setRefreshing(true);
    else setLoading(true);

    try {
      const fresh = await fetchShared<T>(path);
      if (!mounted.current) return;
      setData(fresh);
      setError(null);
    } catch (e) {
      if (!mounted.current) return;
      setError(e instanceof Error ? e.message : 'Xatolik');
    } finally {
      if (mounted.current) { setLoading(false); setRefreshing(false); }
    }
  }, [path]);

  useEffect(() => {
    if (!path) return;
    // Keshdagi ma'lumot darhol ekranga chiqadi, so'ng fonda yangilanadi.
    const hit = cache.get(path);
    if (hit) setData(hit.data as T);
    if (access) run();
  }, [path, access, run]);

  const refresh = useCallback(async () => {
    if (path) cache.delete(path);
    await run();
  }, [path, run]);

  return { data, error, loading, refreshing, refresh };
}

/* Chiqishda kesh albatta tozalanadi: aks holda bitta qurilmada boshqa hisobga kirilganda
   oldingi foydalanuvchining ma'lumotlari bir zum ko'rinib qolardi. */
let prevAccess = useAuthStore.getState().access;
useAuthStore.subscribe((state) => {
  if (prevAccess && !state.access) invalidateApi();
  prevAccess = state.access;
});
