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

const DEFAULT_FALLBACK_LOOP: LoopState = {
  id: 1,
  date: new Date().toISOString().split('T')[0],
  cycle_number: 1,
  current_stage: 'STAGE_1_WARMUP',
  combo_multiplier: 1.0,
  dtm_score_delta: 0.4,
  session_mistakes_ids: [],
  is_chest_claimed: false,
};

const DEFAULT_FALLBACK_STAGE_DATA: LoopStageData = {
  warmup: {
    title: "O'zbekiston tarixi & BMB Qopqonlari",
    subject_name: "Tarix",
    duration_seconds: 60,
    summary_bullets: [
      "BMB/DTM standartidagi eng ko'p tushadigan 3 ta savol mexanizmi.",
      "Asosiy formulalar va kalit atamalar: chalkashuvchi nuqtalar tahlili.",
      "Vaqtni tejash layfxaki: 1 daqiqada to'g'ri variantni topish strategiyasi.",
    ],
    bmb_traps: [
      "1-Qopqon: O'xshash nomdagi xonliklar va sanalar chalkashishi.",
      "2-Qopqon: Vaqt yetishmasligida birinchi ko'ringan chalg'ituvchi variantga shoshilish.",
      "3-Qopqon: Inkor qo'shimchalari ('...emas', '...xato')ga e'tiborsizlik.",
    ],
    cheat_sheet_content: `⚡ 60s ANTI-DARSLIK SHPARGALKA: Tarix & DTM Qopqonlari\n\nUshbu mavzu bo'yicha DTM imtihonida har yili o'rtacha 2-3 ta asosiy test savoli tushadi. Asosiy e'tiborni qoidalar ketma-ketligiga va variantlar orasidagi nozik farqlarga qarating. Sprint davomida tezlik va aniqlik yuqori Combo ko'paytirgichini faollashtiradi!`,
  },
  sprint: {
    target_count: 10,
    questions: [
      {
        id: 101,
        text: "Qadimgi Baqtriya davlati qachon vujudga kelgan?",
        image_url: null,
        options: [
          { id: 1, text: "Mil. avv. VII-VI asrlarda", is_correct: true },
          { id: 2, text: "Mil. avv. IV asrda", is_correct: false },
          { id: 3, text: "Mil. III asrda", is_correct: false },
          { id: 4, text: "Milodiy I asrda", is_correct: false },
        ],
        ai_hint: {
          aha_moment: "Diqqat qiling: Baqtriya va So'g'd davlatlari shakllanishi mil. avv. VII-VI asrlarga to'g'ri keladi.",
          memory_code: "Baqtriya = 7-6 asrlar (Qadimgi Sharq uyg'onishi)",
          analysis_time: "10s tahlil",
        },
        explanation: "Baqtriya davlati mil. avv. VII-VI asrlarda O'rta Osiyoning eng qadimgi davlatlaridan biri sifatida vujudga kelgan.",
      },
      {
        id: 102,
        text: "Amir Temur qaysi yilda buyuk saltanat asoschisi sifatida taxtga o'tirgan?",
        image_url: null,
        options: [
          { id: 1, text: "1370-yilda", is_correct: true },
          { id: 2, text: "1365-yilda", is_correct: false },
          { id: 3, text: "1380-yilda", is_correct: false },
          { id: 4, text: "1336-yilda", is_correct: false },
        ],
        ai_hint: {
          aha_moment: "1365 Loy jangi, 1370 esa Balx qurultoyida buyuk amir deb e'lon qilinishi.",
          memory_code: "1370 = Balx qurultoyi va Sohibqiron taxti",
          analysis_time: "10s tahlil",
        },
        explanation: "1370-yil 9-aprelda Balx qurultoyida Amir Temur Movarounnahrning oliy hukmdori deb e'lon qilindi.",
      },
      {
        id: 103,
        text: "Avestoning eng qadimiy qismi nima deb ataladi?",
        image_url: null,
        options: [
          { id: 1, text: "Gatlar", is_correct: true },
          { id: 2, text: "Yasna", is_correct: false },
          { id: 3, text: "Videvdat", is_correct: false },
          { id: 4, text: "Visparad", is_correct: false },
        ],
        ai_hint: {
          aha_moment: "Zardushtning o'zi tomonidan aytilgan muqaddas qo'shiqlar — Gatlar.",
          memory_code: "Gatlar = Avesto poydevori",
          analysis_time: "10s tahlil",
        },
        explanation: "Gatlar — Zardusht tomonidan yaratilgan Avestoning eng qadimgi she'riy madhiyalari hisoblanadi.",
      },
      {
        id: 104,
        text: "Buyuk Ipak yo'li orqali Xitoydan G'arbga asosan nimalar olib o'tilgan?",
        image_url: null,
        options: [
          { id: 1, text: "Ipak, chinni va choy", is_correct: true },
          { id: 2, text: "Faqat oltin va kumush", is_correct: false },
          { id: 3, text: "Paxta va qorako'l", is_correct: false },
          { id: 4, text: "Temir qurollar", is_correct: false },
        ],
        ai_hint: {
          aha_moment: "Xitoyning jahon sirlaridan bo'lgan ipak va chinni idishlari asosiy savdo tovari bo'lgan.",
          memory_code: "Ipak + Chinni = Xitoy eksporti",
          analysis_time: "10s tahlil",
        },
        explanation: "Ipak va chinni buyumlar qadimgi karvon yo'lining eng qimmatli mahsulotlari bo'lgan.",
      },
    ],
  },
  cleanup: {
    count: 0,
    cards: [],
  },
  arena: {
    duration_seconds: 60,
    opponent: {
      name: "Sardor Temurov",
      avatar_url: "https://api.dicebear.com/7.x/adventurer/svg?seed=Sardor",
      elo_rating: 1050,
      title: "Abituriyent 2026",
    },
    questions: [
      {
        id: 201,
        text: "Mirzo Ulug'bek qaysi fanga ulkan hissa qo'shgan?",
        image_url: null,
        options: [
          { id: 1, text: "Astronomiya va Matematika", is_correct: true },
          { id: 2, text: "Kimyo va Geologiya", is_correct: false },
          { id: 3, text: "Tibbiyot", is_correct: false },
          { id: 4, text: "Biologiya", is_correct: false },
        ],
        ai_hint: { aha_moment: "Ziji Jadidi Ko'ragoniy", memory_code: "Yulduzlar jadvali", analysis_time: "5s" },
        explanation: "Ulug'bek 1018 ta yulduzning joylashuvini aniqlagan buyuk astronom.",
      },
      {
        id: 202,
        text: "Al-Xorazmiy qaysi fanning asoschisi hisoblanadi?",
        image_url: null,
        options: [
          { id: 1, text: "Algebra", is_correct: true },
          { id: 2, text: "Geometriya", is_correct: false },
          { id: 3, text: "Fizika", is_correct: false },
          { id: 4, text: "Falsafa", is_correct: false },
        ],
        ai_hint: { aha_moment: "Al-Jabr", memory_code: "Algebra va Algoritm", analysis_time: "5s" },
        explanation: "Al-Xorazmiy 'Al-kitob al-muxtasar fi hisob al-jabr va al-muqobala' asari bilan algebraga asos solgan.",
      },
    ],
  },
  rewards: {
    coins: 200,
    xp: 100,
    free_essay_credits: 1,
    dtm_score_delta: 2.4,
    water_reward: 35,
    share_caption: "🚀 Bugungi 4-bosqichli Avtopilot Marafonini 100% yopdim (+2.4 DTM)! Sirli Sandiq ochildi! 🎁🔥",
  },
};

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

      if (res?.ok && res.loop && res.stage_data) {
        setLoop(res.loop);
        setTopic(res.topic);
        setEcoTree(res.eco_tree);
        setStageData(res.stage_data);
      } else {
        // Fallback default
        setLoop(DEFAULT_FALLBACK_LOOP);
        setTopic({ id: 1, title: "O'zbekiston tarixi & DTM Standartlari", subject_name: "Tarix" });
        setStageData(DEFAULT_FALLBACK_STAGE_DATA);
      }
    } catch {
      // Fallback default
      setLoop(DEFAULT_FALLBACK_LOOP);
      setTopic({ id: 1, title: "O'zbekiston tarixi & DTM Standartlari", subject_name: "Tarix" });
      setStageData(DEFAULT_FALLBACK_STAGE_DATA);
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
      } catch {
        // Fallback optimistic local transition
        setLoop((prev) => {
          if (!prev) return prev;
          let nextStage: LoopStage = 'STAGE_2_SPRINT';
          let combo = prev.combo_multiplier;
          let dtm = prev.dtm_score_delta;

          if (fromStage === 'STAGE_1_WARMUP') {
            nextStage = 'STAGE_2_SPRINT';
            dtm += 0.4;
          } else if (fromStage === 'STAGE_2_SPRINT') {
            const mistakes = payload?.mistake_question_ids || [];
            if (mistakes.length > 0) {
              nextStage = 'STAGE_3_CLEANUP';
              combo = 1.5;
            } else {
              nextStage = 'STAGE_4_ARENA';
              combo = 2.0;
            }
            dtm += 1.2;
          } else if (fromStage === 'STAGE_3_CLEANUP') {
            nextStage = 'STAGE_4_ARENA';
            combo = 2.0;
            dtm += 0.6;
          } else if (fromStage === 'STAGE_4_ARENA') {
            nextStage = 'STAGE_5_COMPLETED';
            combo = 2.5;
            dtm += 0.8;
          }

          return {
            ...prev,
            current_stage: nextStage,
            combo_multiplier: combo,
            dtm_score_delta: dtm,
            session_mistakes_ids: payload?.mistake_question_ids || prev.session_mistakes_ids,
            is_chest_claimed: nextStage === 'STAGE_5_COMPLETED',
          };
        });
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
