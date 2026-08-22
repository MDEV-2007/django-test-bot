import { useAuthStore, type Profile } from './auth-store';

/* API manzili.
 *
 * Sukut bo'yicha BO'SH satr — ya'ni so'rovlar sahifaning o'z origin'iga ketadi
 * (`/api/...`) va Next ularni `next.config.ts` dagi rewrite orqali Django'ga uzatadi.
 * Bu eng ishonchli holat: tunnel manzili o'zgarsa ham hech narsani qayta yig'ish
 * (build) shart emas, CORS muammosi umuman yo'q va telefon `localhost` ga urinmaydi.
 *
 * Alohida domen kerak bo'lsa (masalan backend boshqa serverda) — `NEXT_PUBLIC_API_URL`
 * ni to'liq manzil bilan to'ldiring. `??` emas `||` ishlatilmaydi: bo'sh satr ATAYLAB
 * "shu origin" degani. */
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function refreshAccessToken(): Promise<string | null> {
  const { refresh, setAccess, logout } = useAuthStore.getState();
  if (!refresh) return null;

  const res = await fetch(`${API_URL}/api/auth/refresh/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh }),
  });
  if (!res.ok) {
    logout();
    return null;
  }
  const data = await res.json();
  setAccess(data.access);
  return data.access as string;
}

/** JSON API call to the Django backend, attaching the JWT and retrying once on a 401
 * after a token refresh — see accounts/api.py for why this is JWT, not the session cookie. */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  let { access } = useAuthStore.getState();

  const doFetch = async (token: string | null) =>
    fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    });

  let res = await doFetch(access);
  if (res.status === 401 && useAuthStore.getState().refresh) {
    access = await refreshAccessToken();
    res = await doFetch(access);
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.error || res.statusText);
  }
  return res.json() as Promise<T>;
}

/** Same as apiFetch, but for multipart/form-data (file uploads) — the browser must set its
 * own Content-Type (with the multipart boundary), so this deliberately does NOT send one. */
export async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  let { access } = useAuthStore.getState();

  const doFetch = async (token: string | null) =>
    fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });

  let res = await doFetch(access);
  if (res.status === 401 && useAuthStore.getState().refresh) {
    access = await refreshAccessToken();
    res = await doFetch(access);
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.error || res.statusText);
  }
  return res.json() as Promise<T>;
}

export async function login(username: string, password: string) {
  const data = await apiFetch<{ access: string; refresh: string; user: Profile }>(
    '/api/auth/login/',
    { method: 'POST', body: JSON.stringify({ username, password }) },
  );
  useAuthStore.getState().setSession(data.access, data.refresh, data.user);
  return data.user;
}

export async function register(payload: { username: string; first_name: string; last_name?: string; password: string; ref?: string }) {
  const data = await apiFetch<{ access: string; refresh: string; user: Profile }>(
    '/api/auth/register/',
    { method: 'POST', body: JSON.stringify(payload) },
  );
  useAuthStore.getState().setSession(data.access, data.refresh, data.user);
  return data.user;
}

export async function fetchMe() {
  return apiFetch<Profile>('/api/auth/me/');
}

export async function fetchAuthConfig() {
  return apiFetch<{ google_client_id: string | null; telegram_bot_username: string | null }>('/api/auth/config/');
}

export async function loginWithGoogle(credential: string, ref?: string) {
  const data = await apiFetch<{ access: string; refresh: string; user: Profile }>(
    '/api/auth/google/',
    { method: 'POST', body: JSON.stringify({ credential, ref }) },
  );
  useAuthStore.getState().setSession(data.access, data.refresh, data.user);
  return data.user;
}

export async function loginWithTelegram(initData: string, startParam?: string) {
  const data = await apiFetch<{ access: string; refresh: string; user: Profile }>(
    '/api/auth/telegram/',
    { method: 'POST', body: JSON.stringify({ initData, start_param: startParam }) },
  );
  useAuthStore.getState().setSession(data.access, data.refresh, data.user);
  return data.user;
}

export { refreshAccessToken, API_URL };
