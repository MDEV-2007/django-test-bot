'use client';

/* Telegram Mini App integratsiyasi.
 *
 * MUHIM: bu modul oddiy brauzerda TO'LIQ passiv bo'lishi kerak — hech qanday tashqi
 * so'rov yubormaydi, DOM'ga tegmaydi, hech narsani o'zgartirmaydi. Shuning uchun SDK
 * skripti faqat Telegram muhiti ANIQLANGANDAN keyin yuklanadi: Telegram ilova ochganda
 * URL'ga `#tgWebAppData=...` fragmentini qo'shadi (web/desktop) yoki mobil webview'da
 * `window.TelegramWebviewProxy` obyektini beradi. Ikkalasi ham yo'q bo'lsa — bu oddiy
 * sayt va bu yerdagi barcha funksiya no-op qaytaradi.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

type BackButton = {
  show(): void;
  hide(): void;
  onClick(cb: () => void): void;
  offClick(cb: () => void): void;
};

type MainButton = {
  text: string;
  show(): void;
  hide(): void;
  enable(): void;
  disable(): void;
  showProgress(leaveActive?: boolean): void;
  hideProgress(): void;
  setParams(p: { text?: string; color?: string; text_color?: string; is_active?: boolean; is_visible?: boolean }): void;
  onClick(cb: () => void): void;
  offClick(cb: () => void): void;
};

type HapticFeedback = {
  impactOccurred(style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'): void;
  notificationOccurred(type: 'error' | 'success' | 'warning'): void;
  selectionChanged(): void;
};

export type TelegramWebApp = {
  initData: string;
  initDataUnsafe?: { start_param?: string };
  colorScheme: 'light' | 'dark';
  platform: string;
  version: string;
  viewportHeight: number;
  viewportStableHeight: number;
  isExpanded: boolean;
  ready(): void;
  expand(): void;
  close(): void;
  isVersionAtLeast(v: string): boolean;
  enableClosingConfirmation(): void;
  disableClosingConfirmation(): void;
  disableVerticalSwipes?(): void;
  setHeaderColor?(color: string): void;
  setBackgroundColor?(color: string): void;
  onEvent(event: string, cb: () => void): void;
  offEvent(event: string, cb: () => void): void;
  shareToStory?(mediaUrl: string, params?: {
    text?: string;
    widget_link?: { url: string; name?: string };
  }): void;
  BackButton: BackButton;
  MainButton: MainButton;
  HapticFeedback?: HapticFeedback;
};

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
    TelegramWebviewProxy?: unknown;
  }
}

const SDK_URL = 'https://telegram.org/js/telegram-web-app.js';
const ENV_FLAG = 'ilm_tg_env';

/** Telegram ichida ochilganmi? Natija sessiyaga yoziladi — ichki navigatsiyada
 *  `#tgWebApp...` fragmenti yo'qoladi, lekin muhit o'zgarmaydi. */
export function isTelegramEnv(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (sessionStorage.getItem(ENV_FLAG) === '1') return true;
    const hash = window.location.hash || '';
    const detected = hash.includes('tgWebAppData') || hash.includes('tgWebAppPlatform') || !!window.TelegramWebviewProxy;
    if (detected) sessionStorage.setItem(ENV_FLAG, '1');
    return detected;
  } catch {
    return !!window.TelegramWebviewProxy;
  }
}

let sdkPromise: Promise<TelegramWebApp | null> | null = null;

/** SDK'ni bir marta yuklaydi. Telegram muhiti bo'lmasa hech narsa yuklanmaydi. */
export function loadTelegramSdk(): Promise<TelegramWebApp | null> {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if (window.Telegram?.WebApp) return Promise.resolve(window.Telegram.WebApp);
  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SDK_URL}"]`);
    const script = existing ?? document.createElement('script');
    script.addEventListener('load', () => resolve(window.Telegram?.WebApp ?? null));
    script.addEventListener('error', () => resolve(null));
    if (!existing) {
      script.src = SDK_URL;
      script.async = true;
      document.head.appendChild(script);
    }
  });
  return sdkPromise;
}

/** Faqat haqiqiy Telegram muhitida WebApp obyektini qaytaradi. */
export function getWebApp(): TelegramWebApp | null {
  if (typeof window === 'undefined') return null;
  if (!isTelegramEnv()) return null;
  return window.Telegram?.WebApp ?? null;
}

/* ── Haptika ────────────────────────────────────────────────────────────────── */

export type HapticKind = 'select' | 'light' | 'medium' | 'success' | 'error' | 'warning';

/** Tebranish. Telegramdan tashqarida — no-op. Eski mijozlarda `HapticFeedback`
 *  bo'lmasligi mumkin, shuning uchun barchasi try/catch ichida. */
export function tgHaptic(kind: HapticKind = 'select') {
  const haptic = getWebApp()?.HapticFeedback;
  if (!haptic) return;
  try {
    if (kind === 'select') haptic.selectionChanged();
    else if (kind === 'light' || kind === 'medium') haptic.impactOccurred(kind);
    else haptic.notificationOccurred(kind);
  } catch {
    /* eski Telegram versiyasi — e'tiborsiz qoldiriladi */
  }
}

/* ── Orqaga tugmasi ─────────────────────────────────────────────────────────── */

/* Telegram'da faqat BITTA BackButton bor, ekranlar esa ichma-ich (masalan, imtihon
   sahifasi umumiy "orqaga"ni o'z tasdiqlash modali bilan almashtiradi). Shuning uchun
   ishlov beruvchilar stekda saqlanadi: eng oxirgi qo'shilgani ishlaydi. */
const backStack: Array<() => void> = [];
let backBound = false;

function dispatchBack() {
  backStack[backStack.length - 1]?.();
}

function syncBackButton() {
  const wa = getWebApp();
  if (!wa) return;
  if (!backBound) {
    wa.BackButton.onClick(dispatchBack);
    backBound = true;
  }
  if (backStack.length) wa.BackButton.show();
  else wa.BackButton.hide();
}

/** `handler` berilsa Telegram'ning "orqaga" tugmasi ko'rsatiladi va bosilganda shu
 *  funksiya chaqiriladi. `null` — bu ekran tugmani talab qilmaydi. */
export function useTelegramBackButton(handler: (() => void) | null) {
  const ref = useRef(handler);
  ref.current = handler;
  const enabled = !!handler;

  useEffect(() => {
    if (!enabled || !getWebApp()) return;
    const entry = () => ref.current?.();
    backStack.push(entry);
    syncBackButton();
    return () => {
      const i = backStack.lastIndexOf(entry);
      if (i >= 0) backStack.splice(i, 1);
      syncBackButton();
    };
  }, [enabled]);
}

/* ── Asosiy tugma ───────────────────────────────────────────────────────────── */

/** Telegram'ning pastki nativ tugmasi. `label` null bo'lsa tugma yashiriladi. */
export function useTelegramMainButton(
  label: string | null,
  onClick: () => void,
  opts: { loading?: boolean; disabled?: boolean } = {},
) {
  const { loading = false, disabled = false } = opts;

  /* Ishlov beruvchi ref orqali saqlanadi: aks holda chaqiruvchi har renderda yangi
     funksiya bersa, tugma har safar o'chirilib qayta qo'shilaverardi. */
  const handler = useRef(onClick);
  handler.current = onClick;
  const stableClick = useCallback(() => handler.current(), []);

  useEffect(() => {
    const wa = getWebApp();
    if (!wa || !label) return;
    const btn = wa.MainButton;
    btn.setParams({ text: label, is_visible: true });
    btn.onClick(stableClick);
    return () => {
      btn.offClick(stableClick);
      btn.hide();
    };
  }, [label, stableClick]);

  useEffect(() => {
    const btn = getWebApp()?.MainButton;
    if (!btn || !label) return;
    if (loading) btn.showProgress(true);
    else btn.hideProgress();
    if (disabled || loading) btn.disable();
    else btn.enable();
  }, [label, loading, disabled]);
}

/* ── Yopishni tasdiqlash ────────────────────────────────────────────────────── */

/** Yoqilganda foydalanuvchi Mini App'ni yopmoqchi bo'lsa Telegram so'raydi —
 *  imtihon davomida tasodifiy yopilish javoblarni yo'qotmasligi uchun. */
export function useTelegramClosingConfirmation(enabled: boolean) {
  useEffect(() => {
    const wa = getWebApp();
    if (!wa || !enabled) return;
    wa.enableClosingConfirmation();
    return () => wa.disableClosingConfirmation();
  }, [enabled]);
}

/* ── Story ulashish ─────────────────────────────────────────────────────────── */

/** Telegram Story'ga rasm qo'yish (Bot API 7.8+).
 *
 *  Diqqat: `mediaUrl` OCHIQ manzil bo'lishi shart — rasmni foydalanuvchining telefoni
 *  emas, Telegram serverlari yuklab oladi va ular hech qanday token yubormaydi.
 *
 *  Qaytadi: `false` — muhit yoki mijoz versiyasi qo'llab-quvvatlamaydi (chaqiruvchi
 *  o'shanda tugmani ko'rsatmasligi yoki boshqa ulashish usulini taklif qilishi mumkin). */
export function shareToStory(
  mediaUrl: string,
  params?: { text?: string; widget_link?: { url: string; name?: string } },
): boolean {
  const wa = getWebApp();
  if (!wa?.shareToStory) return false;
  try {
    wa.shareToStory(mediaUrl, params);
    return true;
  } catch {
    return false;
  }
}

/** Mijoz Story ulashishni qo'llab-quvvatlaydimi (tugmani ko'rsatish uchun). */
export function canShareToStory(): boolean {
  const wa = getWebApp();
  return !!wa?.shareToStory && wa.isVersionAtLeast('7.8');
}

/* ── Tayyorlik holati ───────────────────────────────────────────────────────── */

/* SDK asinxron yuklanadi, komponentlar esa undan oldin chiziladi. Shuning uchun
   "Telegram ichidamizmi" savoliga javob obuna bo'linadigan qilib saqlanadi: SDK
   tayyor bo'lganda barcha kutayotgan komponentlar qayta chiziladi. */
let telegramReady = false;
const readyListeners = new Set<() => void>();

export function markTelegramReady() {
  telegramReady = true;
  readyListeners.forEach((cb) => cb());
}

/** Komponent Telegram ichida ekanini bilishi uchun (masalan, nativ tugma bilan
 *  ikkilanmaslik uchun sahifadagi tugmani yashirish). */
export function useIsTelegram(): boolean {
  const [inTelegram, setInTelegram] = useState(false);

  useEffect(() => {
    if (telegramReady) { setInTelegram(!!getWebApp()); return; }
    const cb = () => setInTelegram(!!getWebApp());
    readyListeners.add(cb);
    return () => { readyListeners.delete(cb); };
  }, []);

  return inTelegram;
}
