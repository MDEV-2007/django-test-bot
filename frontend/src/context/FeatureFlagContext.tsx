'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { apiFetch } from '@/lib/api-client';

export type FeatureFlags = {
  enable_stress_simulator: boolean;
  enable_cheat_sheet_maps: boolean;
  enable_parent_radar: boolean;
  enable_teacher_class_battles: boolean;
  updated_at?: string | null;
};

const DEFAULT_FLAGS: FeatureFlags = {
  enable_stress_simulator: true,
  enable_cheat_sheet_maps: true,
  enable_parent_radar: false,
  enable_teacher_class_battles: false,
};

type FeatureFlagContextType = {
  flags: FeatureFlags;
  loading: boolean;
  refreshFlags: () => Promise<void>;
  updateFlag: (key: keyof FeatureFlags, value: boolean) => Promise<boolean>;
};

const FeatureFlagContext = createContext<FeatureFlagContextType>({
  flags: DEFAULT_FLAGS,
  loading: true,
  refreshFlags: async () => {},
  updateFlag: async () => false,
});

export function FeatureFlagProvider({ children }: { children: React.ReactNode }) {
  const [flags, setFlags] = useState<FeatureFlags>(DEFAULT_FLAGS);
  const [loading, setLoading] = useState(true);

  const fetchFlags = useCallback(async () => {
    try {
      const res = await apiFetch<FeatureFlags>('/api/v1/system/feature-flags/');
      if (res) {
        setFlags({
          enable_stress_simulator: res.enable_stress_simulator ?? true,
          enable_cheat_sheet_maps: res.enable_cheat_sheet_maps ?? true,
          enable_parent_radar: res.enable_parent_radar ?? false,
          enable_teacher_class_battles: res.enable_teacher_class_battles ?? false,
          updated_at: res.updated_at,
        });
      }
    } catch {
      // offline / fallback to defaults
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFlags();
  }, [fetchFlags]);

  const updateFlag = async (key: keyof FeatureFlags, value: boolean): Promise<boolean> => {
    // Optimistic UI update
    setFlags((prev) => ({ ...prev, [key]: value }));
    try {
      const res = await apiFetch<{ success: boolean; flags: FeatureFlags }>('/api/v1/system/admin/feature-flags/', {
        method: 'PATCH',
        body: JSON.stringify({ [key]: value }),
      });
      if (res?.flags) {
        setFlags(res.flags);
      }
      return true;
    } catch {
      // Rollback on error
      fetchFlags();
      return false;
    }
  };

  return (
    <FeatureFlagContext.Provider value={{ flags, loading, refreshFlags: fetchFlags, updateFlag }}>
      {children}
    </FeatureFlagContext.Provider>
  );
}

export function useFeatureFlags() {
  return useContext(FeatureFlagContext);
}
