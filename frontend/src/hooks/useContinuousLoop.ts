'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { apiFetch, ApiError } from '@/lib/api-client';
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
    duration_seconds: 90,
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
    cheat_sheet_content: `⚡ 90s ANTI-DARSLIK SHPARGALKA: Tarix & DTM Qopqonlari\n\nUshbu mavzu bo'yicha DTM imtihonida har yili o'rtacha 2-3 ta asosiy test savoli tushadi. Asosiy e'tiborni qoidalar ketma-ketligiga va variantlar orasidagi nozik farqlarga qarating. Sprint davomida tezlik va aniqlik yuqori Combo ko'paytirgichini faollashtiradi!`,
  },
  sprint: {
    target_count: 15,
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
      {
        id: 105,
        text: "Qang' davlati hududi qaysi daryo havzalarini o'z ichiga olgan?",
        image_url: null,
        options: [
          { id: 1, text: "Sirdaryoning o'rta va quyi havzasi", is_correct: true },
          { id: 2, text: "Amudaryoning yuqori havzasi", is_correct: false },
          { id: 3, text: "Zarafshon vodiysi", is_correct: false },
          { id: 4, text: "Murg'ob vohasi", is_correct: false },
        ],
        ai_hint: {
          aha_moment: "Qang' davlati shimoliy hududlarda, Sirdaryo havzasida vujudga kelgan.",
          memory_code: "Qang' = Sirdaryo havzasi",
          analysis_time: "10s tahlil",
        },
        explanation: "Mil. avv. III asrda Sirdaryoning o'rta va quyi havzalarida Qang' davlati vujudga kelgan.",
      },
      {
        id: 106,
        text: "Jaloliddin Manguberdi mo'g'ullarga qarshi qaysi mashhur jangda birinchi yirik g'alabaga erishgan?",
        image_url: null,
        options: [
          { id: 1, text: "Parvon jangi (1221)", is_correct: true },
          { id: 2, text: "Sind daryosi jangi", is_correct: false },
          { id: 3, text: "Loy jangi", is_correct: false },
          { id: 4, text: "Tarobiy qo'zg'oloni", is_correct: false },
        ],
        ai_hint: {
          aha_moment: "Parvon dashtida Shiki Xutuxu boshchiligidagi mo'g'ul qo'shini tor-mor etilgan.",
          memory_code: "Parvon = Jaloliddinning buyuk g'alabasi",
          analysis_time: "10s tahlil",
        },
        explanation: "1221-yil bahorida Parvon jangida Jaloliddin Manguberdi mo'g'ul qo'shinlarini to'liq mag'lub etgan.",
      },
      {
        id: 107,
        text: "Mirzo Ulug'bek tomonidan Samarqanddagi mashhur rasadxona qaysi yilda barpo etilgan?",
        image_url: null,
        options: [
          { id: 1, text: "1428-1429 yillarda", is_correct: true },
          { id: 2, text: "1409-yilda", is_correct: false },
          { id: 3, text: "1449-yilda", is_correct: false },
          { id: 4, text: "1435-yilda", is_correct: false },
        ],
        ai_hint: {
          aha_moment: "Obixahmat arig'i bo'yidagi Cho'ponota tepaligida 1428-1429 yillarda qurilgan.",
          memory_code: "1428 = Ulug'bek rasadxonasi",
          analysis_time: "10s tahlil",
        },
        explanation: "1428-1429 yillarda Mirzo Ulug'bek Samarqand yaqinida ulkan astronomik rasadxona qurdirdi.",
      },
      {
        id: 108,
        text: "Alisher Navoiy o'zining mashhur 'Xamsa' asarini necha yilda yozib tugatgan?",
        image_url: null,
        options: [
          { id: 1, text: "1483-1485 yillarda (2 yilda)", is_correct: true },
          { id: 2, text: "1470-yilda", is_correct: false },
          { id: 3, text: "1490-1495 yillarda", is_correct: false },
          { id: 4, text: "1468-yilda", is_correct: false },
        ],
        ai_hint: {
          aha_moment: "Navoiy turkiy tilda birinchi bo'lib Xamsa yaratib, buyuk jasorat ko'rsatgan.",
          memory_code: "1483-1485 = Turkiy Xamsa",
          analysis_time: "10s tahlil",
        },
        explanation: "Alisher Navoiy 1483-1485 yillar davomida turkiy tildagi birinchi 'Xamsa' dostonlar majmuasini yaratdi.",
      },
      {
        id: 109,
        text: "Kushon davlatining eng qudratli hukmdori kim bo'lgan?",
        image_url: null,
        options: [
          { id: 1, text: "Kanishka I", is_correct: true },
          { id: 2, text: "Kudzul Kadfiz", is_correct: false },
          { id: 3, text: "Vima Kadfiz", is_correct: false },
          { id: 4, text: "Huvishka", is_correct: false },
        ],
        ai_hint: {
          aha_moment: "Kanishka davrida Kushon imperiyasi Hindistongacha kengayib, buddizm gullab-yashnagan.",
          memory_code: "Kanishka = Kushon oltin davri",
          analysis_time: "10s tahlil",
        },
        explanation: "Kanishka I (milodiy II asr) davrida Kushon davlati o'zining yuksak taraqqiyot cho'qqisiga erishgan.",
      },
      {
        id: 110,
        text: "Sohibqiron Amir Temur qaysi yilda To'xtamish ustidan Qunduzcha jangida g'alaba qozondi?",
        image_url: null,
        options: [
          { id: 1, text: "1391-yilda", is_correct: true },
          { id: 2, text: "1395-yilda", is_correct: false },
          { id: 3, text: "1388-yilda", is_correct: false },
          { id: 4, text: "1402-yilda", is_correct: false },
        ],
        ai_hint: {
          aha_moment: "1391 Qunduzcha, 1395 esa Terek daryosi jangi.",
          memory_code: "1391 = Qunduzcha zafari",
          analysis_time: "10s tahlil",
        },
        explanation: "1391-yil 18-iyunda Volga bo'yidagi Qunduzcha jangida Amir Temur Oltin O'rda xoni To'xtamishni mag'lub etdi.",
      },
      {
        id: 111,
        text: "Zahiriddin Muhammad Bobur Hindistonda Boburiylar saltanatiga qachon asos solgan?",
        image_url: null,
        options: [
          { id: 1, text: "1526-yilda", is_correct: true },
          { id: 2, text: "1512-yilda", is_correct: false },
          { id: 3, text: "1530-yilda", is_correct: false },
          { id: 4, text: "1504-yilda", is_correct: false },
        ],
        ai_hint: {
          aha_moment: "1526-yil 21-apreldagi Panipat jangida Ibrohim Lo'diyni mag'lub etgan.",
          memory_code: "1526 = Panipat va Boburiylar",
          analysis_time: "10s tahlil",
        },
        explanation: "1526-yil Panipat jangidagi g'alabadan so'ng Bobur Hindistonda 300 yildan ortiq hukm surgan saltanatga asos soldi.",
      },
      {
        id: 112,
        text: "Abu Rayhon Beruniy Yer sharining radiusini qaysi qal'ada aniq hisoblab chiqqan?",
        image_url: null,
        options: [
          { id: 1, text: "Nandana qal'asida", is_correct: true },
          { id: 2, text: "G'azna saroyida", is_correct: false },
          { id: 3, text: "Samarqand rasadxonasida", is_correct: false },
          { id: 4, text: "Kat shahrida", is_correct: false },
        ],
        ai_hint: {
          aha_moment: "Beruniy Hindistondagi Nandana qal'asida trigonometrik formulalar orqali o'lchov o'tkazgan.",
          memory_code: "Nandana = Beruniy va Yer radiusi",
          analysis_time: "10s tahlil",
        },
        explanation: "Beruniy hozirgi Pokiston hududidagi Nandana qal'asida turib Yer sharining o'lchamini zamonaviy natijaga juda yaqin aniqlikda o'lchagan.",
      },
      {
        id: 113,
        text: "Mahmud Qoshg'ariyning turkiy qabilalar tili va madaniyatiga oid qomusi qanday nomlanadi?",
        image_url: null,
        options: [
          { id: 1, text: "Devonu lug'otit turk", is_correct: true },
          { id: 2, text: "Qutadg'u bilig", is_correct: false },
          { id: 3, text: "Hibat ul-haqoyiq", is_correct: false },
          { id: 4, text: "Tarixi Rashidiy", is_correct: false },
        ],
        ai_hint: {
          aha_moment: "1072-1074 yillarda Bag'dodda yozilgan turkiy ensiklopediya.",
          memory_code: "Devonu lug'otit turk = Qoshg'ariy",
          analysis_time: "10s tahlil",
        },
        explanation: "Mahmud Qoshg'ariy 1072-1074 yillarda turkiy tillarning ilk qomusi bo'lgan 'Devonu lug'otit turk' asarini yozgan.",
      },
      {
        id: 114,
        text: "Qoraxoniylar davlatida islom dini qachon rasmiy davlat dini deb e'lon qilingan?",
        image_url: null,
        options: [
          { id: 1, text: "960-yilda", is_correct: true },
          { id: 2, text: "875-yilda", is_correct: false },
          { id: 3, text: "1000-yilda", is_correct: false },
          { id: 4, text: "999-yilda", is_correct: false },
        ],
        ai_hint: {
          aha_moment: "Satuk Bug'roxonning o'g'li Muso hukmronligi davrida 960-yilda rasmiylashgan.",
          memory_code: "960 = Qoraxoniylar va Islom",
          analysis_time: "10s tahlil",
        },
        explanation: "960-yilda Qoraxoniylar davlatida 200 ming chodir turkiy xalq islomni qabul qilib, u davlat dini deb e'lon qilindi.",
      },
      {
        id: 115,
        text: "Somoniylar davlatining poytaxti qaysi shahar bo'lgan?",
        image_url: null,
        options: [
          { id: 1, text: "Buxoro", is_correct: true },
          { id: 2, text: "Samarqand", is_correct: false },
          { id: 3, text: "Marv", is_correct: false },
          { id: 4, text: "Xiva", is_correct: false },
        ],
        ai_hint: {
          aha_moment: "Ismoil Somoniy davrida Buxoro butun Sharqning ilmiy va madaniy markaziga aylandi.",
          memory_code: "Somoniylar = Buxoro poytaxti",
          analysis_time: "10s tahlil",
        },
        explanation: "Somoniylar davlati davrida Buxoro shahri poytaxt bo'lib, Sharqning eng yirik ilm-fan markaziga aylandi.",
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [loop, setLoop] = useState<LoopState>(DEFAULT_FALLBACK_LOOP);
  const [topic, setTopic] = useState<LoopTopic>({
    id: 1,
    title: "O'zbekiston tarixi & DTM Standartlari",
    subject_name: "Tarix",
  });
  const [ecoTree, setEcoTree] = useState<EcoTreeState>({
    growth_stage: 1,
    stage_name: 'Nihol',
    water_level: 35,
    root_depth_xp: 0,
    needs_water: false,
  });
  const [stageData, setStageData] = useState<LoopStageData>(DEFAULT_FALLBACK_STAGE_DATA);

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
          setLoop((prev) => ({
            ...prev,
            current_stage: res.current_stage,
            combo_multiplier: res.combo_multiplier,
            dtm_score_delta: res.dtm_score_delta,
            session_mistakes_ids: res.session_mistakes_ids,
            is_chest_claimed:
              res.current_stage === 'STAGE_5_COMPLETED' ? true : prev.is_chest_claimed,
          }));
          setEcoTree(res.eco_tree);
          setStageData(res.stage_data);
          return res;
        }
      } catch (err) {
        // Server bosqich ketma-ketligini rad etdi (409): lokal holat eskirgan — serverdan
        // qayta olinadi, soxta lokal o'tish qilinmaydi.
        if (err instanceof ApiError && err.status === 409) {
          await fetchLoop();
          return null;
        }
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
    [fetchLoop]
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

  // 2.0x / 2.5x Super-Combo bilan keyingi siklni boshlash (Multi-cycle marafon)
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
    } catch (err) {
      // Server yangi siklni rad etdi (joriy sikl tugamagan / kunlik limit) — xabar
      // ko'rsatiladi; lokal "soxta" sikl ochilmaydi.
      if (err instanceof ApiError && (err.status === 409 || err.status === 429)) {
        toast.error(err.message);
        return false;
      }
      // Fallback local multi-cycle transition (Offline / 404 da ham ishlaydi)
      let nextCycle = 2;
      setLoop((prev) => {
        nextCycle = (prev?.cycle_number || 1) + 1;
        const combo = nextCycle === 2 ? 2.0 : 2.5;
        return {
          id: (prev?.id || 1) + 1,
          date: new Date().toISOString().split('T')[0],
          cycle_number: nextCycle,
          current_stage: 'STAGE_1_WARMUP',
          combo_multiplier: combo,
          dtm_score_delta: (prev?.dtm_score_delta || 0) + 0.4,
          session_mistakes_ids: [],
          is_chest_claimed: false,
        };
      });

      setEcoTree((prev) => {
        const nextWater = Math.min(100, (prev?.water_level || 35) + 35);
        const stageName = nextWater >= 100 ? 'Chinor' : nextWater >= 70 ? "Ko'chat" : "Nihol";
        const growthStage = nextWater >= 100 ? 4 : nextWater >= 70 ? 2 : 1;
        return {
          ...prev,
          water_level: nextWater,
          stage_name: stageName,
          growth_stage: growthStage,
          total_cycles_completed: (prev?.total_cycles_completed || 0) + 1,
          needs_water: false,
        };
      });

      // Keyingi raund uchun yangi mavzu
      const nextTopicTitle = nextCycle === 2
        ? "Amir Temur va Temuriylar saltanati (BMB Standarti)"
        : "O'zbekiston tarixi: Xonliklar davri va DTM Qopqonlari";
      setTopic({ id: nextCycle, title: nextTopicTitle, subject_name: "Tarix" });

      toast.success(`🔥 ${nextCycle}-Raund Super-Combo bilan boshlandi! (+35% suv)`);
      return true;
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
