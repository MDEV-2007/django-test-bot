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

// Standart holat (tarmoq kechikishida yoki birinchi ochilishda)
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

export const useFeaturesStore = create<FeaturesStore>((set, get) => ({
  features: DEFAULT_FEATURES,
  loaded: false,
  loading: false,

  fetchFeatures: async () => {
    if (get().loading) return;
    set({ loading: true });
    try {
      const data = await apiFetch<FeaturesResponse>('/api/panel/features/public/');
      if (data && data.features) {
        set({ features: data.features, loaded: true, loading: false });
      } else {
        set({ loaded: true, loading: false });
      }
    } catch {
      // Tarmoq xatoligida mavjud standart qiymatlarda davom etadi
      set({ loaded: true, loading: false });
    }
  },

  isFeatureEnabled: (key: string) => {
    const { user } = useAuthStore.getState();
    // Super admin har doim barcha modullarni sinovdan o'tkaza oladi
    if (user?.is_superadmin) return true;

    const feat = get().features[key];
    if (!feat) return true; // noma'lum kalit bo'lsa sukut bo'yicha ruxsat
    return Boolean(feat.is_enabled);
  },

  getFeature: (key: string) => {
    return get().features[key];
  },
}));

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
