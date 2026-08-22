import { useAuthStore } from './auth-store';

/* WebSocket manzili API bilan bir xil mantiqda: `NEXT_PUBLIC_API_URL` bo'sh bo'lsa
   sahifaning o'z origin'i ishlatiladi (https -> wss). */
function wsBase() {
  const configured = process.env.NEXT_PUBLIC_API_URL ?? '';
  if (configured) return configured.replace(/^http/, 'ws');
  if (typeof window === 'undefined') return '';
  return window.location.origin.replace(/^http/, 'ws');
}

/** Opens a WebSocket to the Django Channels backend, authenticated via `?token=<JWT>` —
 * see config/ws_auth.py for why (a cross-origin WS handshake can't rely on the Django
 * session cookie the way the old same-origin Django templates did). */
export function openSocket(path: string, extraParams: Record<string, string> = {}) {
  const access = useAuthStore.getState().access;
  const params = new URLSearchParams({ ...(access ? { token: access } : {}), ...extraParams });
  return new WebSocket(`${wsBase()}${path}?${params.toString()}`);
}
