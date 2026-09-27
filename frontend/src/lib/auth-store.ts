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
  last_active_date?: string | null;
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

export const ACCESS_KEY = 'ilmildizi_access';
export const REFRESH_KEY = 'ilmildizi_refresh';
export const USER_KEY = 'ilmildizi_user';
export const TG_MANUAL_LOGOUT_KEY = 'ilm_tg_manual_logout';

type AuthState = {
  access: string | null;
  refresh: string | null;
  user: Profile | null;
  hydrated: boolean;
  /* Boshlang'ich seans tekshiruvi tugadimi.
     Sahifalar "access yo'q" degan xulosani FAQAT shundan keyin chiqarishi kerak. */
  authReady: boolean;
  setSession: (access: string, refresh: string, user: Profile) => void;
  setAccess: (access: string) => void;
  setUser: (user: Profile) => void;
  logout: () => void;
  hydrate: () => void;
  setAuthReady: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  access: null,
  refresh: null,
  user: null,
  hydrated: false,
  authReady: false,

  setSession: (access, refresh, user) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(ACCESS_KEY, access);
        localStorage.setItem(REFRESH_KEY, refresh);
        localStorage.setItem(USER_KEY, JSON.stringify(user));
        sessionStorage.removeItem(TG_MANUAL_LOGOUT_KEY);
      } catch { /* private mode */ }
    }
    set({ access, refresh, user, hydrated: true });
  },

  setAccess: (access) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(ACCESS_KEY, access);
      } catch { /* private mode */ }
    }
    set({ access });
  },

  setUser: (user) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(USER_KEY, JSON.stringify(user));
      } catch { /* private mode */ }
    }
    set({ user });
  },

  setAuthReady: () => set({ authReady: true }),

  logout: () => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(ACCESS_KEY);
        localStorage.removeItem(REFRESH_KEY);
        localStorage.removeItem(USER_KEY);
        sessionStorage.setItem(TG_MANUAL_LOGOUT_KEY, '1');
      } catch { /* private mode */ }
    }
    set({ access: null, refresh: null, user: null, hydrated: true, authReady: true });
  },

  hydrate: () => {
    if (typeof window === 'undefined') return;
    try {
      const access = localStorage.getItem(ACCESS_KEY);
      const refresh = localStorage.getItem(REFRESH_KEY);
      let user: Profile | null = null;
      const rawUser = localStorage.getItem(USER_KEY);
      if (rawUser) {
        try {
          user = JSON.parse(rawUser);
        } catch {
          user = null;
        }
      }
      set({ access, refresh, user, hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },
}));

