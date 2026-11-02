'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { apiFetch } from '@/lib/api-client';
import { soundFX } from '@/lib/soundFX';
import { tgHaptic } from '@/lib/telegram';
import { toast } from 'sonner';

export type LoopStage =
  | 'STAGE_1_WARMUP'
  | 'STAGE_2_SPRINT'
  | 'STAGE_3_CLEANUP'
  | 'STAGE_4_ARENA'
  | 'STAGE_5_COMPLETED';

export interface LoopTopic {
  id: number;
  title: string;
  subject_name: string;
}

export interface EcoTreeState {
  growth_stage: number;
  stage_name: string;
  water_level: number;
  root_depth_xp: number;
  total_cycles_completed?: number;
  needs_water: boolean;
}

export interface SprintQuestionOption {
  id: number;
  text: string;
  is_correct: boolean;
}

export interface SprintQuestion {
  id: number;
  text: string;
  image_url: string | null;
  options: SprintQuestionOption[];
  ai_hint: {
    aha_moment: string;
    memory_code: string;
    analysis_time: string;
  };
  explanation: string;
  isRevenge?: boolean;
}

export interface CleanupCard {
  id: number;
  front: string;
  back: string;
  tip: string;
  memory_code: string;
}

export interface ArenaOpponent {
  name: string;
  avatar_url: string;
  elo_rating: number;
  title: string;
}

export interface LoopStageData {
  warmup: {
    title: string;
    subject_name: string;
    duration_seconds: number;
    summary_bullets: string[];
    bmb_traps: string[];
    cheat_sheet_content: string;
  };
  sprint: {
    questions: SprintQuestion[];
    target_count: number;
  };
  cleanup: {
    cards: CleanupCard[];
    count: number;
  };
  arena: {
    opponent: ArenaOpponent;
    duration_seconds: number;
    questions: SprintQuestion[];
  };
  rewards: {
    coins: number;
    xp: number;
    free_essay_credits: number;
    dtm_score_delta: number;
    water_reward: number;
    share_caption: string;
  };
}

export interface LoopState {
  id: number;
  date: string;
  cycle_number: number;
  current_stage: LoopStage;
  combo_multiplier: number;
  dtm_score_delta: number;
  session_mistakes_ids: number[];
  is_chest_claimed: boolean;
  sprint_score?: number;
  sprint_total?: number;
}

export function useContinuousLoop() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [loop, setLoop] = useState<LoopState | null>(null);
  const [topic, setTopic] = useState<LoopTopic | null>(null);
  const [ecoTree, setEcoTree] = useState<EcoTreeState>({
    growth_stage: 1,
    stage_name: 'Nihol',
    water_level: 35,
    root_depth_xp: 0,
    needs_water: false,
  });
  const [stageData, setStageData] = useState<LoopStageData | null>(null);

  // 3-Soniyalik Avtopilot Ko'prigi (Autoplay Transition Bridge)
  const [autoplayActive, setAutoplayActive] = useState(false);
  const [autoplaySecondsLeft, setAutoplaySecondsLeft] = useState(3);
  const [autoplayNextStage, setAutoplayNextStage] = useState<LoopStage | null>(null);
  const autoplayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const autoplayCallbackRef = useRef<(() => void) | null>(null);

  // Chiqishdan himoya (Loss Aversion Exit Modal)
  const [showExitModal, setShowExitModal] = useState(false);

  // So'rovlarni yuklash
  const fetchLoop = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch<{
        ok: boolean;
        loop: LoopState;
        topic: LoopTopic;
        eco_tree: EcoTreeState;
        stage_data: LoopStageData;
      }>('/api/v1/loop/current/');

      if (res?.ok) {
        setLoop(res.loop);
        setTopic(res.topic);
        setEcoTree(res.eco_tree);
        setStageData(res.stage_data);
      } else {
        setError("Sikl ma'lumotlarini yuklab bo'lmadi");
      }
    } catch (e: any) {
      setError(e?.message || "Tarmoq xatosi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLoop();
  }, [fetchLoop]);

  // Bosqichni oldinga surish (Advance Stage)
  const advanceStage = useCallback(
    async (fromStage: LoopStage, payload: Record<string, any> = {}) => {
      try {
        const res = await apiFetch<{
          ok: boolean;
          current_stage: LoopStage;
          combo_multiplier: number;
          dtm_score_delta: number;
          session_mistakes_ids: number[];
          rewards_awarded?: any;
          eco_tree: EcoTreeState;
          stage_data: LoopStageData;
        }>('/api/v1/loop/advance-stage/', {
          method: 'POST',
          body: JSON.stringify({ from_stage: fromStage, payload }),
        });

        if (res?.ok) {
          setLoop((prev) =>
            prev
              ? {
                  ...prev,
                  current_stage: res.current_stage,
                  combo_multiplier: res.combo_multiplier,
                  dtm_score_delta: res.dtm_score_delta,
                  session_mistakes_ids: res.session_mistakes_ids,
                  is_chest_claimed:
                    res.current_stage === 'STAGE_5_COMPLETED' ? true : prev.is_chest_claimed,
                }
              : null
          );
          setEcoTree(res.eco_tree);
          setStageData(res.stage_data);
          return res;
        }
      } catch (err: any) {
        toast.error(err?.message || "Bosqichni yangilashda xatolik");
      }
      return null;
    },
    []
  );

  // 3-Soniyalik Avtopilotni ishga tushirish (Bridge Tramplin)
  const startAutoplayTransition = useCallback(
    (targetStage: LoopStage, onTrigger: () => void) => {
      if (autoplayTimerRef.current) clearInterval(autoplayTimerRef.current);
      setAutoplayNextStage(targetStage);
      setAutoplaySecondsLeft(3);
      setAutoplayActive(true);
      autoplayCallbackRef.current = onTrigger;

      let remaining = 3;
      autoplayTimerRef.current = setInterval(() => {
        remaining -= 1;
        setAutoplaySecondsLeft(remaining);
        if (remaining <= 0) {
          if (autoplayTimerRef.current) clearInterval(autoplayTimerRef.current);
          setAutoplayActive(false);
          if (autoplayCallbackRef.current) {
            autoplayCallbackRef.current();
            autoplayCallbackRef.current = null;
          }
        }
      }, 1000);
    },
    []
  );

  const skipAutoplay = useCallback(() => {
    if (autoplayTimerRef.current) clearInterval(autoplayTimerRef.current);
    setAutoplayActive(false);
    if (autoplayCallbackRef.current) {
      autoplayCallbackRef.current();
      autoplayCallbackRef.current = null;
    }
  }, []);

  const cancelAutoplay = useCallback(() => {
    if (autoplayTimerRef.current) clearInterval(autoplayTimerRef.current);
    setAutoplayActive(false);
    autoplayCallbackRef.current = null;
  }, []);

  // 1-Click Strava Post to Community Feed
  const shareToFeed = useCallback(
    async (caption?: string) => {
      tgHaptic('medium');
      soundFX.success();
      try {
        const res = await apiFetch<{ ok: boolean; post_id: number; message: string; xp_awarded: number }>(
          '/api/v1/loop/share-post/',
          {
            method: 'POST',
            body: JSON.stringify({ caption }),
          }
        );
        if (res?.ok) {
          toast.success(res.message);
          return true;
        }
      } catch (e: any) {
        toast.error(e?.message || "Lentaga ulashishda xatolik");
      }
      return false;
    },
    []
  );

  // 2.5x Super-Combo bilan 2-siklni boshlash
  const restartCycle = useCallback(async () => {
    tgHaptic('success');
    soundFX.celebrate();
    try {
      const res = await apiFetch<{
        ok: boolean;
        loop: LoopState;
        stage_data: LoopStageData;
        message: string;
      }>('/api/v1/loop/restart-cycle/', { method: 'POST' });

      if (res?.ok) {
        setLoop((prev) => (prev ? { ...prev, ...res.loop } : res.loop));
        setStageData(res.stage_data);
        toast.success(res.message);
        return true;
      }
    } catch (e: any) {
      toast.error(e?.message || "Yangi siklni boshlashda xatolik");
    }
    return false;
  }, []);

  // Chiqishni boshqarish
  const handleRequestExit = useCallback((onExit: () => void) => {
    if (!loop || loop.current_stage === 'STAGE_5_COMPLETED') {
      onExit();
    } else {
      setShowExitModal(true);
    }
  }, [loop]);

  return {
    loading,
    error,
    loop,
    topic,
    ecoTree,
    stageData,
    fetchLoop,
    advanceStage,
    // Autoplay
    autoplayActive,
    autoplaySecondsLeft,
    autoplayNextStage,
    startAutoplayTransition,
    skipAutoplay,
    cancelAutoplay,
    // Actions
    shareToFeed,
    restartCycle,
    // Loss Aversion Guard
    showExitModal,
    setShowExitModal,
    handleRequestExit,
  };
}
