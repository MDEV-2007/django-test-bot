'use client';

import { create } from 'zustand';
import { apiFetch } from './api-client';
import { useAuthStore } from './auth-store';

export type FeatureItem = {
  key: string;
  name: string;
  is_enabled: boolean;
  admin_only: boolean;
  is_beta: boolean;
  badge_text: string;
  target_route: string;
  icon_name: string;
};

type FeaturesResponse = {
  features: Record<string, FeatureItem>;
  is_superadmin: boolean;
};

type FeaturesStore = {
  features: Record<string, FeatureItem>;
  loaded: boolean;
  loading: boolean;
  fetchFeatures: () => Promise<void>;
  isFeatureEnabled: (key: string) => boolean;
  getFeature: (key: string) => FeatureItem | undefined;
};

const FEATURES_CACHE_KEY = 'ilmildizi_features_cache_v2';

// Standart zaxira holat
const DEFAULT_FEATURES: Record<string, FeatureItem> = {
  reels: { key: 'reels', name: 'Bilim Reels', is_enabled: true, admin_only: false, is_beta: false, badge_text: 'Viral', target_route: '/reels', icon_name: 'Sparkles' },
  flashcards: { key: 'flashcards', name: 'Smart Flashcardlar', is_enabled: true, admin_only: false, is_beta: false, badge_text: '2.0 Beta', target_route: '/flashcards', icon_name: 'Layers' },
  battles: { key: 'battles', name: '1v1 Battle Arena', is_enabled: true, admin_only: false, is_beta: false, badge_text: 'Live', target_route: '/battles', icon_name: 'Swords' },
  learning: { key: 'learning', name: 'Darslar & Konspektlar', is_enabled: true, admin_only: false, is_beta: false, badge_text: 'Audio', target_route: '/learning', icon_name: 'BookOpen' },
  games: { key: 'games', name: "Tarixiy Mini O'yinlar", is_enabled: true, admin_only: false, is_beta: false, badge_text: 'Bonus XP', target_route: '/games/timeline', icon_name: 'Gamepad2' },
  ai_mentor: { key: 'ai_mentor', name: 'AI Shaxsiy Mentor', is_enabled: true, admin_only: false, is_beta: false, badge_text: 'AI', target_route: '/tests', icon_name: 'Bot' },
  otm_predictor: { key: 'otm_predictor', name: 'OTM Qabul Bashorati', is_enabled: true, admin_only: false, is_beta: false, badge_text: '2025/2026', target_route: '/analytics', icon_name: 'GraduationCap' },
  shop: { key: 'shop', name: "Tangalar Do'koni", is_enabled: true, admin_only: false, is_beta: false, badge_text: 'Coin', target_route: '/shop', icon_name: 'ShoppingBag' },
  leaderboard: { key: 'leaderboard', name: 'Reyting & Peshqadamlar', is_enabled: true, admin_only: false, is_beta: false, badge_text: 'Top', target_route: '/leaderboard', icon_name: 'Trophy' },
  tests: { key: 'tests', name: 'BBA & Testlar', is_enabled: true, admin_only: false, is_beta: false, badge_text: 'BBA', target_route: '/tests', icon_name: 'FileCheck2' },
};

function getInitialFeatures(): { features: Record<string, FeatureItem>; loaded: boolean } {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(FEATURES_CACHE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') {
          return { features: { ...DEFAULT_FEATURES, ...parsed }, loaded: true };
        }
      }
    } catch {}
  }
  return { features: DEFAULT_FEATURES, loaded: false };
}

const initial = getInitialFeatures();

export const useFeaturesStore = create<FeaturesStore>((set, get) => ({
  features: initial.features,
  loaded: initial.loaded,
  loading: false,

  fetchFeatures: async () => {
    if (get().loading) return;
    set({ loading: true });
    try {
      const data = await apiFetch<FeaturesResponse>('/api/panel/features/public/');
      if (data && data.features) {
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(FEATURES_CACHE_KEY, JSON.stringify(data.features));
          } catch {}
        }
        set({ features: data.features, loaded: true, loading: false });
      } else {
        set({ loaded: true, loading: false });
      }
    } catch {
      // Tarmoq xatoligida mavjud keshdagi qiymatlarda davom etadi
      set({ loaded: true, loading: false });
    }
  },

  isFeatureEnabled: (key: string) => {
    const { user } = useAuthStore.getState();
    const feat = get().features[key];
    if (!feat) return false;

    // 1. Agar faqat admin uchun (Beta test) yoqilgan bo'lsa:
    // Faqatgina superadmin kirgan bo'lsa ko'rinadi, oddiy foydalanuvchiga yopiq
    if (feat.admin_only) {
      return Boolean(user?.is_superadmin);
    }

    // 2. Agar admin_only bo'lmasa, qat'iy is_enabled holatiga bo'ysunadi.
    // Agar admin modulni o'chirgan bo'lsa (is_enabled: false), u butunlay yopilgan
    // hisoblanadi va barchadan (shu jumladan adminga ham student menyusida) yashirinadi.
    return Boolean(feat.is_enabled);
  },

  getFeature: (key: string) => {
    return get().features[key];
  },
}));

// Brauzer tablari o'rtasida feature flags sinxronizatsiyasi
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === FEATURES_CACHE_KEY && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        if (parsed && typeof parsed === 'object') {
          useFeaturesStore.setState({ features: { ...DEFAULT_FEATURES, ...parsed }, loaded: true });
        }
      } catch {}
    }
  });
}

/**
 * React komponentlari ichida ishlatish uchun qulay hook
 */
export function useFeatureFlags() {
  const store = useFeaturesStore();

  return {
    features: store.features,
    loaded: store.loaded,
    loading: store.loading,
    refresh: store.fetchFeatures,
    isEnabled: store.isFeatureEnabled,
    getFeature: store.getFeature,
  };
}
