import { create } from 'zustand';

export type Profile = {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  role: 'superadmin' | 'teacher' | 'student';
  is_superadmin: boolean;
  is_teacher: boolean;
  avatar_url: string | null;
  xp: number;
  level: number;
  coins: number;
  streak: number;
  is_premium: boolean;
  has_seen_onboarding: boolean;
  elo_rating: number;
  next_level_xp: number;
  freeze_count: number;
  /* Do'kondan taqib olingan kosmetika. `avatar_url` server tomonda allaqachon
     taqilgan avatarga almashtirilgan; bu yerdagilar qo'shimcha bezaklar uchun:
     ramka rangi, unvon va nishon. */
  cosmetics?: Cosmetics;
  /* Hisobning O'Z rasmi (kosmetikasiz) — sozlamalarda kerak bo'lishi mumkin. */
  base_avatar_url?: string | null;
};

export type CosmeticEntry = {
  slug: string;
  name: string;
  icon_name: string;
  rarity: string;
  payload: { avatar_url?: string; ring?: string; title?: string; color?: string; accent?: string };
};

export type Cosmetics = {
  avatar?: CosmeticEntry;
  frame?: CosmeticEntry;
  title?: CosmeticEntry;
  badge?: CosmeticEntry;
  /* Mavzu — bitta `accent` rangi; qolgan tokenlar undan hisoblanadi (CosmeticTheme). */
  theme?: CosmeticEntry;
};

type AuthState = {
  access: string | null;
  refresh: string | null;
  user: Profile | null;
  hydrated: boolean;
  /* Boshlang'ich seans tekshiruvi (refresh -> access -> /me) tugadimi.
     Sahifalar "access yo'q" degan xulosani FAQAT shundan keyin chiqarishi kerak —
     aks holda tokeni bor foydalanuvchi ham bir zumga /login ga uloqtirilardi. */
  authReady: boolean;
  setSession: (access: string, refresh: string, user: Profile) => void;
  setAccess: (access: string) => void;
  logout: () => void;
  hydrate: () => void;
  setAuthReady: () => void;
};

// Access token lives only in memory (never persisted) — refresh token is the one thing
// stored, in localStorage, so a page reload doesn't force a full re-login; api-client.ts
// exchanges it for a fresh access token on first use after hydration.
const REFRESH_KEY = 'ilmildizi_refresh';

/* Telegram Mini App'da foydalanuvchi allaqachon Telegram hisobida bo'lgani uchun kirish
   avtomatik bajariladi. Lekin "Tizimdan chiqish" bosilgandan keyin ham avtomatik kirish
   ishlayversa, chiqib bo'lmaydi — sahifa darhol qayta kiritib yuboradi. Shu bayroq
   sessiya davomida avtomatik kirishni o'chiradi; ilova butunlay yopilib qayta ochilsa
   yana odatdagidek ishlaydi. */
export const TG_MANUAL_LOGOUT_KEY = 'ilm_tg_manual_logout';

export const useAuthStore = create<AuthState>((set) => ({
  access: null,
  refresh: null,
  user: null,
  hydrated: false,
  authReady: false,

  setSession: (access, refresh, user) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(REFRESH_KEY, refresh);
      // Yangi seans boshlandi — "qo'lda chiqqan edi" bayrog'i endi ahamiyatsiz.
      try { sessionStorage.removeItem(TG_MANUAL_LOGOUT_KEY); } catch { /* private mode */ }
    }
    set({ access, refresh, user, hydrated: true });
  },

  setAccess: (access) => set({ access }),

  setAuthReady: () => set({ authReady: true }),

  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(REFRESH_KEY);
      try { sessionStorage.setItem(TG_MANUAL_LOGOUT_KEY, '1'); } catch { /* private mode */ }
    }
    set({ access: null, refresh: null, user: null, hydrated: true, authReady: true });
  },

  hydrate: () => {
    if (typeof window === 'undefined') return;
    const refresh = localStorage.getItem(REFRESH_KEY);
    set({ refresh, hydrated: true });
  },
}));
