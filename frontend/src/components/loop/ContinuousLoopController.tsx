'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, Zap, Sparkles, Trophy, X, Flame,
  Clock, ArrowRight, CheckCircle2, AlertCircle,
  HelpCircle, Swords, Check, RotateCw, Lightbulb,
  ShieldAlert, TrendingUp
} from 'lucide-react';
import { soundFX } from '@/lib/soundFX';
import { tgHaptic } from '@/lib/telegram';
import { toast } from 'sonner';
import {
  useContinuousLoop,
  LoopStage,
  SprintQuestion,
  CleanupCard
} from '@/hooks/useContinuousLoop';
import AutoplayTransitionBridge from './AutoplayTransitionBridge';
import LossAversionExitModal from './LossAversionExitModal';
import Stage5RewardCeremony from './Stage5RewardCeremony';

interface ContinuousLoopControllerProps {
  onClose: () => void;
}

export default function ContinuousLoopController({ onClose }: ContinuousLoopControllerProps) {
  const router = useRouter();
  const {
    loading,
    error,
    loop,
    topic,
    ecoTree,
    stageData,
    fetchLoop,
    advanceStage,
    submitLoopAnswer,
    isOffline,
    autoplayActive,
    autoplaySecondsLeft,
    startAutoplayTransition,
    skipAutoplay,
    cancelAutoplay,
    shareToFeed,
    restartCycle,
    showExitModal,
    setShowExitModal,
    handleRequestExit,
  } = useContinuousLoop();

  // ── STAGE 1 (WARMUP) STATE (90s Shpargalka) ──
  const [warmupSecondsLeft, setWarmupSecondsLeft] = useState(90);

  // ── STAGE 2 (SPRINT) STATE ──
  const [sprintQuestions, setSprintQuestions] = useState<SprintQuestion[]>(stageData?.sprint?.questions || []);
  const [sprintIndex, setSprintIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<number | null>(null);
  const [isAnswerChecked, setIsAnswerChecked] = useState(false);
  const [mistakeIds, setMistakeIds] = useState<number[]>([]);
  const [correctCount, setCorrectCount] = useState(0);
  const [showAiMentorSheet, setShowAiMentorSheet] = useState(false);
  const [activeHint, setActiveHint] = useState<{ aha_moment: string; memory_code: string } | null>(null);

  // ── STAGE 3 (CLEANUP FLASHCARDS) STATE ──
  const [cleanupIndex, setCleanupIndex] = useState(0);
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const [clearedCount, setClearedCount] = useState(0);

  // ── STAGE 4 (1v1 ARENA) STATE ──
  const [arenaQuestions, setArenaQuestions] = useState<SprintQuestion[]>(stageData?.arena?.questions || []);
  const [arenaIndex, setArenaIndex] = useState(0);
  const [userScore, setUserScore] = useState(0);
  const [ghostScore, setGhostScore] = useState(0);
  const [arenaTimeLeft, setArenaTimeLeft] = useState(60);
  const arenaTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Yangi sikl boshlanganda yoki loop o'zgarganda ichki bosqich holatlarini boshlang'ichga qaytarish
  useEffect(() => {
    setWarmupSecondsLeft(90);
    setSprintIndex(0);
    setSelectedOptionId(null);
    setIsAnswerChecked(false);
    setMistakeIds([]);
    setCorrectCount(0);
    setShowAiMentorSheet(false);
    setActiveHint(null);
    setCleanupIndex(0);
    setIsCardFlipped(false);
    setClearedCount(0);
    setArenaIndex(0);
    setUserScore(0);
    setGhostScore(0);
    setArenaTimeLeft(60);
  }, [loop?.id, loop?.cycle_number]);
  useEffect(() => {
    if (stageData?.sprint?.questions && stageData.sprint.questions.length > 0) {
      setSprintQuestions(stageData.sprint.questions);
    }
    if (stageData?.arena?.questions && stageData.arena.questions.length > 0) {
      setArenaQuestions(stageData.arena.questions);
    }
  }, [stageData]);

  // Stage 1 taymeri
  useEffect(() => {
    if (currentStage === 'STAGE_1_WARMUP' && warmupSecondsLeft > 0) {
      const timer = setInterval(() => {
        setWarmupSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [loop?.current_stage, warmupSecondsLeft]);

  // Stage 4 (Arena) taymeri
  useEffect(() => {
    if (currentStage === 'STAGE_4_ARENA' && arenaTimeLeft > 0) {
      arenaTimerRef.current = setInterval(() => {
        setArenaTimeLeft((prev) => {
          if (prev <= 1) {
            if (arenaTimerRef.current) clearInterval(arenaTimerRef.current);
            return 0;
          }
          // Oflayn demoda ghost tasodifiy ball yig'adi. Onlayn rejimda ghost natijasini
          // server belgilaydi (ghost_moves) va u har savoldan keyin ko'rsatiladi.
          if (isOffline && Math.random() > 0.65) {
            setGhostScore((g) => g + 10);
          }
          return prev - 1;
        });
      }, 1000);
      return () => {
        if (arenaTimerRef.current) clearInterval(arenaTimerRef.current);
      };
    }
  }, [loop?.current_stage, arenaTimeLeft]);

  // ── STAGE 1 HARAKATI: SPRINTGA START ──
  const handleStartSprint = async () => {
    tgHaptic('medium');
    soundFX.click();
    await advanceStage('STAGE_1_WARMUP');
  };

  // ── STAGE 2 HARAKATI: JAVOBNI TANLASH ──
  const handleSelectSprintOption = async (optId: number) => {
    if (isAnswerChecked) return;
    const currentQ = sprintQuestions[sprintIndex];
    if (!currentQ) return;

    setSelectedOptionId(optId);
    setIsAnswerChecked(true);

    let isCorrect: boolean;
    let explanation = currentQ.explanation;
    if (isOffline) {
      const chosen = currentQ.options.find((o) => o.id === optId);
      isCorrect = chosen?.is_correct ?? false;
    } else {
      // Javob serverda tekshiriladi; to'g'ri variant faqat shundan keyin ma'lum bo'ladi.
      const result = await submitLoopAnswer('sprint', currentQ.id, optId, !!currentQ.isRevenge);
      if (!result) {
        setSelectedOptionId(null);
        setIsAnswerChecked(false);
        return;
      }
      isCorrect = result.is_correct;
      explanation = result.explanation || explanation;
      const markOptions = (q: SprintQuestion): SprintQuestion => ({
        ...q,
        explanation,
        options: q.options.map((o) => ({ ...o, is_correct: o.id === result.correct_option_id })),
      });
      setSprintQuestions((prev) => prev.map((q, i) => (i === sprintIndex ? markOptions(q) : q)));
    }

    if (isCorrect) {
      soundFX.correct();
      tgHaptic('light');
      setCorrectCount((c) => c + 1);
      toast.success(currentQ.isRevenge ? "🔥 Qasos olindi! (+2x Ball)" : "To'g'ri javob!");
      setTimeout(() => proceedSprintToNext(), 900);
    } else {
      soundFX.incorrect();
      tgHaptic('error');
      // Xato qilingan savollar ro'yxatiga qo'shamiz
      if (!mistakeIds.includes(currentQ.id)) {
        setMistakeIds((prev) => [...prev, currentQ.id]);
      }

      // Qasos savolini currentIndex + 3 ga navbatga qo'yamiz. Javob kaliti nusxaga
      // o'tmaydi — qasos javobi ham serverda qayta tekshiriladi.
      const revengeQ: SprintQuestion = {
        ...currentQ,
        isRevenge: true,
        options: [...currentQ.options]
          .map((o) => (isOffline ? o : { id: o.id, text: o.text }))
          .sort(() => Math.random() - 0.5),
      };

      setSprintQuestions((prev) => {
        const next = [...prev];
        const insertPos = Math.min(next.length, sprintIndex + 3);
        next.splice(insertPos, 0, revengeQ);
        return next;
      });

      // AI Mentor Bottom Sheet ochamiz
      setActiveHint({
        aha_moment: currentQ.ai_hint?.aha_moment || "Nega adashdingiz: Diqqat qiling, savoldagi nozik farqqa e'tibor bering!",
        memory_code: explanation || currentQ.ai_hint?.memory_code || "Mavzuning asosiy formulasini yodda saqlang.",
      });
      setShowAiMentorSheet(true);
    }
  };

  const proceedSprintToNext = async () => {
    setSelectedOptionId(null);
    setIsAnswerChecked(false);
    setShowAiMentorSheet(false);

    if (sprintIndex + 1 < sprintQuestions.length && sprintIndex + 1 < 12) {
      setSprintIndex((prev) => prev + 1);
    } else {
      // Sprint tugadi!
      soundFX.fanfare();
      const nextTarget = mistakeIds.length > 0 ? 'STAGE_3_CLEANUP' : 'STAGE_4_ARENA';
      startAutoplayTransition(nextTarget, async () => {
        await advanceStage('STAGE_2_SPRINT', {
          mistake_question_ids: mistakeIds,
          correct_count: correctCount,
          total_count: sprintQuestions.length,
        });
      });
    }
  };

  // ── STAGE 3 HARAKATI: FLASHCARD TOZALASH ──
  const handleFlipCard = () => {
    soundFX.click();
    tgHaptic('light');
    setIsCardFlipped((f) => !f);
  };

  const handleClearCard = async () => {
    soundFX.success();
    tgHaptic('medium');
    const cards = stageData?.cleanup?.cards || [];
    setClearedCount((c) => c + 1);
    setIsCardFlipped(false);

    if (cleanupIndex + 1 < cards.length) {
      setCleanupIndex((i) => i + 1);
    } else {
      // 3-bosqich yakunlandi! 4-bosqichga o'tish
      startAutoplayTransition('STAGE_4_ARENA', async () => {
        await advanceStage('STAGE_3_CLEANUP', { cleared_count: cards.length });
      });
    }
  };

  // ── STAGE 4 HARAKATI: ARENA SAVOLIGA JAVOB BERISH ──
  const [isArenaSubmitting, setIsArenaSubmitting] = useState(false);
  const handleArenaAnswer = async (optId: number) => {
    const currentQ = arenaQuestions[arenaIndex];
    if (!currentQ || isArenaSubmitting) return;

    let isCorrect: boolean;
    if (isOffline) {
      isCorrect = currentQ.options.find((o) => o.id === optId)?.is_correct ?? false;
    } else {
      setIsArenaSubmitting(true);
      const result = await submitLoopAnswer('arena', currentQ.id, optId);
      setIsArenaSubmitting(false);
      if (!result) return;
      isCorrect = result.is_correct;
    }

    const points = stageData?.arena?.points_per_correct || 20;
    const nextUserScore = userScore + (isCorrect ? points : 0);
    if (isCorrect) {
      soundFX.correct();
      tgHaptic('medium');
    } else {
      soundFX.incorrect();
      tgHaptic('error');
    }
    setUserScore(nextUserScore);

    // Onlayn: ghost bali server bergan natijalardan (shu savolgacha).
    const ghostMoves = stageData?.arena?.ghost_moves;
    if (!isOffline && ghostMoves) {
      setGhostScore(ghostMoves.slice(0, arenaIndex + 1).filter(Boolean).length * points);
    }

    if (arenaIndex + 1 < arenaQuestions.length) {
      setArenaIndex((i) => i + 1);
    } else {
      // Arena tugadi! G'olibni server hal qiladi; bu yerdagi taxmin faqat ovoz effekti uchun.
      const ghostFinal = !isOffline && ghostMoves ? ghostMoves.filter(Boolean).length * points : ghostScore;
      if (nextUserScore >= ghostFinal) soundFX.fanfare();
      startAutoplayTransition('STAGE_5_COMPLETED', async () => {
        await advanceStage('STAGE_4_ARENA', isOffline ? { arena_won: nextUserScore >= ghostFinal } : {});
      });
    }
  };

  // ── PENDING REVENGE SAVOLLARI SONI ──
  const pendingRevengeCount = useMemo(() => {
    return sprintQuestions.slice(sprintIndex + 1).filter((q) => q.isRevenge).length;
  }, [sprintQuestions, sprintIndex]);

  // Stepper qadamlari (60 daqiqalik marafon: 90s Shpargalka + 15 savollik sprint)
  const STEPS = [
    { id: 'STAGE_1_WARMUP', label: '1. Shpargalka (90s)', icon: Brain },
    { id: 'STAGE_2_SPRINT', label: '2. Qasos Sprinti (15 savol)', icon: Zap },
    { id: 'STAGE_3_CLEANUP', label: '3. Xatolar Dueli', icon: Swords },
    { id: 'STAGE_4_ARENA', label: '4. 1v1 Arena', icon: Flame },
    { id: 'STAGE_5_COMPLETED', label: '5. Sandiq & Daraxt', icon: Trophy },
  ];

  const currentStage: LoopStage = (loop?.current_stage as LoopStage) || 'STAGE_1_WARMUP';
  const stageIdx = STEPS.findIndex((s) => s.id === currentStage);
  const currentStageIndex = stageIdx >= 0 ? stageIdx : 0;

  const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
  const warmupPct = Math.max(0, Math.min(100, (warmupSecondsLeft / 90) * 100));

  if (loading && !loop) {
    return (
      <div className="theme-pastel ps-shell fixed inset-0 z-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="inline-flex size-14 items-center justify-center rounded-full bg-[var(--ps-paper)] shadow-lg">
            <RotateCw className="size-6 animate-spin text-[var(--ps-purple)]" />
          </span>
          <p className="text-[14px] font-bold text-[var(--text-primary)]">Avtopilot konveyeri yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="theme-pastel ps-shell fixed inset-0 z-50 flex select-none flex-col overflow-y-auto text-[var(--text-primary)]">
      {/* ── 1. Sarlavha va bosqichlar zanjiri ── */}
      <header className="sticky top-0 z-30 px-3 pt-3 sm:px-6 sm:pt-4">
        <div className="mx-auto w-full max-w-5xl rounded-[28px] bg-[var(--ps-paper)]/90 p-3 shadow-[0_20px_40px_-28px_rgba(40,20,80,0.6)] backdrop-blur-xl sm:p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#080808] px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-[#FFFCF7] dark:bg-[#FFFCF7] dark:text-[#080808]">
                <Zap className="size-3 fill-[var(--ps-orange)] text-[var(--ps-orange)]" />
                Avtopilot · #{loop?.cycle_number || 1}
              </span>
              <h1 className="truncate font-[family-name:var(--font-grotesk)] text-[14px] font-bold sm:text-[17px]">
                {topic?.title || 'Kunlik zanjir'}
              </h1>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <span className="hidden items-center gap-1 rounded-full bg-[var(--ps-green)] px-3 py-1.5 text-[12px] font-bold text-white sm:inline-flex">
                <TrendingUp className="size-3.5" /> +{(loop?.dtm_score_delta ?? 0.4).toFixed(1)} DTM
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--ps-orange)] px-3 py-1.5 text-[12px] font-bold text-[#080808]">
                <Flame className="size-3.5 fill-current" /> {(loop?.combo_multiplier ?? 1.0).toFixed(1)}x
              </span>
              <button
                type="button"
                onClick={() => handleRequestExit(onClose)}
                className="inline-flex size-9 cursor-pointer items-center justify-center rounded-full bg-[var(--ps-neutral)] text-[var(--text-secondary)] transition-colors hover:bg-[#080808] hover:text-[#FFFCF7] dark:hover:bg-[#FFFCF7] dark:hover:text-[#080808]"
                title="Chiqish"
                aria-label="Chiqish"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-1">
            {STEPS.map((step, idx) => {
              const isDone = idx < currentStageIndex;
              const isCurrent = idx === currentStageIndex;
              const StepIcon = step.icon;
              return (
                <React.Fragment key={step.id}>
                  <div
                    className={`flex shrink-0 items-center gap-1.5 rounded-full p-1 transition-all ${
                      isCurrent ? 'bg-[#080808] pr-3 text-[#FFFCF7] dark:bg-[#FFFCF7] dark:text-[#080808]' : ''
                    }`}
                  >
                    <span
                      className={`inline-flex size-7 items-center justify-center rounded-full sm:size-8 ${
                        isCurrent
                          ? 'bg-[var(--ps-orange)] text-[#080808]'
                          : isDone
                            ? 'bg-[var(--ps-green)] text-white'
                            : 'bg-[var(--ps-neutral)] text-[var(--text-muted)]'
                      }`}
                    >
                      {isDone ? <Check className="size-3.5 stroke-[3]" /> : <StepIcon className="size-3.5" />}
                    </span>
                    {isCurrent && (
                      <span className="whitespace-nowrap text-[12px] font-bold">
                        <span className="sm:hidden">{idx + 1}-bosqich</span>
                        <span className="hidden sm:inline">{step.label}</span>
                      </span>
                    )}
                  </div>
                  {idx < STEPS.length - 1 && (
                    <span className={`h-1 min-w-2 flex-1 rounded-full ${idx < currentStageIndex ? 'bg-[var(--ps-green)]' : 'bg-[var(--ds-track)]'}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </header>

      {/* ── 2. Bosqich maydoni ── */}
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center p-4 pb-10 sm:p-6">
        {autoplayActive ? (
          <AutoplayTransitionBridge
            currentStageNumber={currentStageIndex}
            nextStageNumber={currentStageIndex + 1}
            nextStageTitle={STEPS[currentStageIndex]?.label || 'Keyingi bosqich'}
            nextStageBenefit={
              // 1 — sprint tugadi, keyingisi xatolar flashcardi. Ilgari `=== 2` edi va bu
              // xabar flashcardlardan KEYIN chiqardi; combo esa oshmasa ham "oshdi" deyilardi.
              mistakeIds.length > 0 && currentStageIndex === 1
                ? `Hozirgi sprintda ${mistakeIds.length} ta nozik xato aniqlandi — ularni 60 soniyada Flashcard bilan yopamiz!`
                : "Ajoyib natija! To'xtamasdan Sirli Sandiq tomon intilamiz!"
            }
            comboMultiplier={loop?.combo_multiplier || 1.0}
            secondsLeft={autoplaySecondsLeft}
            onSkip={skipAutoplay}
          />
        ) : loading ? (
          <div className="flex flex-col items-center justify-center gap-4 p-12 text-center">
            <span className="inline-flex size-14 items-center justify-center rounded-full bg-[var(--ps-paper)] shadow-lg">
              <RotateCw className="size-6 animate-spin text-[var(--ps-purple)]" />
            </span>
            <div>
              <p className="text-[14px] font-bold">Avtopilot sikli yuklanmoqda...</p>
              <p className="mt-1 text-[12.5px] text-[var(--text-muted)]">Kunlik shpargalka va qasos savollari tayyorlanmoqda</p>
            </div>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {/* ── 1-BOSQICH: 90s SHPARGALKA ── */}
            {currentStage === 'STAGE_1_WARMUP' && (
              <motion.div key="stage_1" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="w-full space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--ps-purple)] px-3 py-1.5 text-[11.5px] font-black uppercase tracking-wider text-white">
                    <Brain className="size-3.5" /> 1-bosqich · 90s shpargalka
                  </span>
                  <span className="relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-[var(--ps-paper)] py-1.5 pl-1.5 pr-3.5 text-[12.5px] font-bold shadow-sm">
                    <span
                      className="inline-flex size-6 items-center justify-center rounded-full"
                      style={{ background: `conic-gradient(var(--ps-orange) ${warmupPct}%, var(--ps-neutral) 0)` }}
                    >
                      <span className="size-3.5 rounded-full bg-[var(--ps-paper)]" />
                    </span>
                    <span className="tabular-nums">{warmupSecondsLeft}s qoldi</span>
                  </span>
                </div>

                <section className="ps-card relative overflow-hidden !rounded-[32px] p-5 sm:p-8">
                  <span aria-hidden className="pointer-events-none absolute -right-14 -top-14 size-44 rounded-full bg-[var(--ps-purple)] opacity-10" />
                  <h2 className="ps-display relative text-[26px] sm:text-[34px]">
                    {stageData?.warmup?.title || topic?.title || 'Oltin qoidalar & BMB qopqonlari'}
                  </h2>
                  <p className="relative mt-3 whitespace-pre-line text-[14px] leading-relaxed text-[var(--text-secondary)] sm:text-[15px]">
                    {stageData?.warmup?.cheat_sheet_content ||
                      "1. Savol shartini diqqat bilan o'qing: 'emas', 'noto'g'ri', 'mos kelmaydi' inkor so'zlariga urg'u bering.\n2. Birinchi taassurotga ishonmang: chalg'ituvchi variantlar odatda eng tanish tuyuladi.\n3. Istisno usulini qo'llang: mutlaqo noto'g'ri bo'lgan 2 ta javobni darhol chiqarib tashlang."}
                  </p>

                  <div className="relative mt-5">
                    <p className="flex items-center gap-1.5 text-[11.5px] font-black uppercase tracking-wider text-[var(--ps-coral)]">
                      <ShieldAlert className="size-4" /> BMB / DTM qopqonlari
                    </p>
                    <div className="mt-2.5 grid gap-2">
                      {(stageData?.warmup?.bmb_traps && stageData.warmup.bmb_traps.length > 0
                        ? stageData.warmup.bmb_traps
                        : [
                            "Mavzudagi o'xshash atamalar va yillarni aralashtirib yuborish",
                            "Savol oxiridagi 'emas' qo'shimchasini e'tibordan chetda qoldirish",
                            'Tarixiy shaxslar yoki ilmiy tushunchalarning davrini xato tanlash',
                          ]
                      ).map((trap, idx) => (
                        <div key={idx} className="flex items-center gap-3 rounded-[20px] bg-[var(--ps-neutral)] p-2 pr-4">
                          <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--ps-coral)] font-[family-name:var(--font-grotesk)] text-[13px] font-bold text-white">
                            {idx + 1}
                          </span>
                          <span className="text-[13.5px] font-semibold leading-snug">{trap.replace(/^\d+\s*-\s*Qopqon:\s*/i, '')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                <button type="button" onClick={handleStartSprint} className="ps-btn ps-btn-ink w-full !min-h-14 text-[15px]">
                  <Zap className="size-4 fill-[var(--ps-orange)] text-[var(--ps-orange)]" />
                  Tayyorman, sprintga start!
                  <span className="ps-btn-arrow"><ArrowRight className="size-4" /></span>
                </button>
              </motion.div>
            )}

            {/* ── 2-BOSQICH: QASOS SPRINTI ── */}
            {currentStage === 'STAGE_2_SPRINT' && sprintQuestions[sprintIndex] && (
              <motion.div key={`stage_2_${sprintIndex}`} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="w-full space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="rounded-full bg-[var(--ps-paper)] px-3 py-1.5 text-[12.5px] font-bold tabular-nums shadow-sm">
                      Savol {sprintIndex + 1} / {Math.min(12, sprintQuestions.length)}
                    </span>
                    {sprintQuestions[sprintIndex].isRevenge && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[var(--ps-coral)] px-3 py-1.5 text-[12px] font-bold text-white">
                        <Flame className="size-3.5 fill-current" /> Qasos savoli · 2x
                      </span>
                    )}
                  </div>
                  {pendingRevengeCount > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--ps-orange)] px-3 py-1.5 text-[12px] font-bold text-[#080808]">
                      <Clock className="size-3.5" /> {pendingRevengeCount} ta qasos kutmoqda
                    </span>
                  )}
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-[var(--ds-track)]">
                  <div
                    className="h-full rounded-full bg-[var(--ps-purple)] transition-all duration-500"
                    style={{ width: `${((sprintIndex + 1) / Math.max(1, Math.min(12, sprintQuestions.length))) * 100}%` }}
                  />
                </div>

                <section className="ps-card !rounded-[32px] p-5 sm:p-7">
                  <div className="text-[16px] font-bold leading-relaxed sm:text-[18px] [&_p]:m-0" dangerouslySetInnerHTML={{ __html: sprintQuestions[sprintIndex].text }} />
                </section>

                <div className="grid gap-2.5">
                  {sprintQuestions[sprintIndex].options.map((opt, oi) => {
                    const isSelected = selectedOptionId === opt.id;
                    const showCorrect = isAnswerChecked && opt.is_correct;
                    const showWrong = isAnswerChecked && isSelected && !opt.is_correct;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleSelectSprintOption(opt.id)}
                        disabled={isAnswerChecked}
                        className={`flex w-full cursor-pointer items-center gap-3 rounded-[22px] p-2.5 pr-4 text-left text-[14.5px] font-semibold transition-all active:scale-[0.99] ${
                          showCorrect
                            ? 'bg-[var(--ps-green)] text-white'
                            : showWrong
                              ? 'bg-[var(--ps-coral)] text-white'
                              : isSelected
                                ? 'bg-[#080808] text-[#FFFCF7] dark:bg-[#FFFCF7] dark:text-[#080808]'
                                : 'bg-[var(--ps-paper)] shadow-sm hover:-translate-y-0.5'
                        }`}
                      >
                        <span
                          className={`inline-flex size-9 shrink-0 items-center justify-center rounded-full font-[family-name:var(--font-grotesk)] text-[14px] font-bold ${
                            showCorrect || showWrong ? 'bg-white/25' : isSelected ? 'bg-[var(--ps-orange)] text-[#080808]' : 'bg-[var(--ps-neutral)]'
                          }`}
                        >
                          {showCorrect ? <Check className="size-4 stroke-[3]" /> : showWrong ? <X className="size-4 stroke-[3]" /> : LETTERS[oi] || oi + 1}
                        </span>
                        <span className="flex-1">{opt.text}</span>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* ── 3-BOSQICH: XATOLAR FLASHCARDI ── */}
            {currentStage === 'STAGE_3_CLEANUP' && stageData?.cleanup?.cards && (
              <motion.div key="stage_3" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--ps-coral)] px-3 py-1.5 text-[11.5px] font-black uppercase tracking-wider text-white">
                    <Swords className="size-3.5" /> 3-bosqich · xatolar {cleanupIndex + 1}/{stageData.cleanup.cards.length}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-[var(--ps-orange)] px-3 py-1.5 text-[12px] font-bold text-[#080808]">
                    <Flame className="size-3.5 fill-current" /> 1.5x combo faol
                  </span>
                </div>

                {stageData.cleanup.cards[cleanupIndex] && (
                  <div
                    onClick={handleFlipCard}
                    className={`relative flex min-h-[240px] cursor-pointer flex-col justify-between overflow-hidden rounded-[32px] p-6 shadow-[0_30px_60px_-34px_rgba(40,20,80,0.7)] transition-colors sm:p-8 ${
                      isCardFlipped ? 'bg-[var(--ps-green)] text-white' : 'bg-[var(--ps-paper)]'
                    }`}
                  >
                    <span aria-hidden className={`pointer-events-none absolute -right-12 -top-12 size-40 rounded-full ${isCardFlipped ? 'bg-white/15' : 'bg-[var(--ps-coral)] opacity-10'}`} />
                    {!isCardFlipped ? (
                      <div className="relative space-y-3">
                        <span className="text-[11.5px] font-black uppercase tracking-wider text-[var(--ps-coral)]">Xato qilingan savol</span>
                        <div className="text-[17px] font-bold leading-relaxed sm:text-[19px] [&_p]:m-0" dangerouslySetInnerHTML={{ __html: stageData.cleanup.cards[cleanupIndex].front }} />
                      </div>
                    ) : (
                      <div className="relative space-y-3">
                        <span className="inline-flex items-center gap-1 text-[11.5px] font-black uppercase tracking-wider text-white/80">
                          <Check className="size-3.5 stroke-[3]" /> To&apos;g&apos;ri javob va layfxak
                        </span>
                        <p className="font-[family-name:var(--font-grotesk)] text-[20px] font-bold sm:text-[24px]">{stageData.cleanup.cards[cleanupIndex].back}</p>
                        <p className="flex items-start gap-2 rounded-[18px] bg-white/15 p-3 text-[13px] font-medium">
                          <Lightbulb className="mt-0.5 size-4 shrink-0" /> {stageData.cleanup.cards[cleanupIndex].tip}
                        </p>
                      </div>
                    )}
                    <p className={`relative mt-5 text-center text-[12px] font-semibold ${isCardFlipped ? 'text-white/75' : 'text-[var(--text-muted)]'}`}>
                      {isCardFlipped ? 'Yana bosib savolga qayting' : "Karta orqasini o'qish uchun bosing"}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={handleFlipCard} className="ps-btn ps-btn-ghost">
                    <RotateCw className="size-4" /> Aylantirish
                  </button>
                  <button type="button" onClick={handleClearCard} className="ps-btn !bg-[var(--ps-green)] !text-white">
                    <CheckCircle2 className="size-4" /> Xatoni yopish
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── 4-BOSQICH: 1v1 ARENA ── */}
            {currentStage === 'STAGE_4_ARENA' && stageData?.arena && arenaQuestions[arenaIndex] && (
              <motion.div key="stage_4" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full space-y-4">
                <section className="ps-card grid grid-cols-[1fr_auto_1fr] items-center gap-3 !rounded-[32px] p-4 sm:p-5">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-full bg-[var(--ps-purple)] text-[13px] font-black text-white">SIZ</span>
                    <div className="min-w-0">
                      <p className="truncate text-[11.5px] font-bold text-[var(--text-muted)]">Sizning ballingiz</p>
                      <p className="ps-num text-[26px] leading-none">{userScore}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="inline-flex size-12 items-center justify-center rounded-full bg-[#080808] font-[family-name:var(--font-grotesk)] text-[15px] font-bold text-[var(--ps-orange)] dark:bg-[#FFFCF7]">VS</span>
                    <span className="mt-1 text-[11.5px] font-bold tabular-nums text-[var(--text-muted)]">{arenaTimeLeft}s</span>
                  </div>
                  <div className="flex min-w-0 items-center justify-end gap-2.5 text-right">
                    <div className="min-w-0">
                      <p className="truncate text-[11.5px] font-bold text-[var(--text-muted)]">{stageData.arena.opponent.name}</p>
                      <p className="ps-num text-[26px] leading-none text-[var(--ps-coral)]">{ghostScore}</p>
                    </div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={stageData.arena.opponent.avatar_url} alt="Raqib" className="size-12 shrink-0 rounded-full bg-[var(--ps-neutral)] object-cover ring-4 ring-[var(--ps-coral)]/30" />
                  </div>
                </section>

                <section className="ps-card !rounded-[32px] p-5 sm:p-7">
                  <span className="text-[11.5px] font-black uppercase tracking-wider text-[var(--ps-coral)]">
                    Tezkor duel savoli · {arenaIndex + 1}/{arenaQuestions.length}
                  </span>
                  <div className="mt-2 text-[16px] font-bold leading-relaxed sm:text-[18px] [&_p]:m-0" dangerouslySetInnerHTML={{ __html: arenaQuestions[arenaIndex].text }} />
                </section>

                <div className="grid gap-2.5 sm:grid-cols-2">
                  {arenaQuestions[arenaIndex].options.map((opt, oi) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleArenaAnswer(opt.id)}
                      disabled={isArenaSubmitting}
                      className="group flex cursor-pointer items-center gap-3 rounded-[22px] bg-[var(--ps-paper)] p-2.5 pr-4 text-left text-[14.5px] font-semibold shadow-sm transition-all hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-60"
                    >
                      <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--ps-neutral)] font-[family-name:var(--font-grotesk)] text-[14px] font-bold transition-colors group-hover:bg-[var(--ps-orange)] group-hover:text-[#080808]">
                        {LETTERS[oi] || oi + 1}
                      </span>
                      <span className="flex-1">{opt.text}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ── 5-BOSQICH: SANDIQ & DARAXT ── */}
            {currentStage === 'STAGE_5_COMPLETED' && (
              <Stage5RewardCeremony
                comboMultiplier={loop.combo_multiplier}
                dtmScoreDelta={loop.dtm_score_delta}
                coinsEarned={stageData?.rewards?.coins || 200}
                xpEarned={stageData?.rewards?.xp || 100}
                cycleNumber={loop.cycle_number || 1}
                ecoTree={ecoTree}
                onShareToFeed={shareToFeed}
                onRestartCycle={restartCycle}
                onFinishToDashboard={onClose}
                onStartBoss={() => {
                  onClose();
                  router.push('/dtm-test');
                }}
              />
            )}

            {(!loop || !stageData || !['STAGE_1_WARMUP', 'STAGE_2_SPRINT', 'STAGE_3_CLEANUP', 'STAGE_4_ARENA', 'STAGE_5_COMPLETED'].includes(loop.current_stage)) && (
              <div className="flex flex-col items-center gap-4 p-8 text-center">
                <span className="inline-flex size-16 items-center justify-center rounded-full bg-[var(--ps-purple)] text-white">
                  <Brain className="size-8" />
                </span>
                <p className="text-[15px] font-bold">Avtopilot zanjiri yuklanmoqda...</p>
                <button type="button" onClick={() => fetchLoop()} className="ps-btn ps-btn-ink">
                  <RotateCw className="size-4" /> Qayta yuklash
                </button>
              </div>
            )}
          </AnimatePresence>
        )}
      </main>

      {/* ── 3. AI mentor layfxagi (pastki oyna) ── */}
      <AnimatePresence>
        {showAiMentorSheet && activeHint && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-2xl rounded-t-[32px] bg-[var(--ps-paper)] p-5 shadow-[0_-30px_60px_-30px_rgba(40,20,80,0.7)] sm:p-7"
          >
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-[var(--ds-track)]" />
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-2 text-[12px] font-black uppercase tracking-wider text-[var(--ps-coral)]">
                <span className="inline-flex size-8 items-center justify-center rounded-full bg-[var(--ps-coral)] text-white">
                  <Lightbulb className="size-4" />
                </span>
                AI mentor layfxagi
              </span>
              <span className="rounded-full bg-[var(--ps-neutral)] px-2.5 py-1 text-[11px] font-bold text-[var(--text-muted)]">Aha moment</span>
            </div>
            <div className="space-y-2.5 rounded-[22px] bg-[var(--ps-neutral)] p-4">
              <p className="text-[14.5px] font-bold leading-snug">{activeHint.aha_moment}</p>
              <p className="text-[13.5px] leading-relaxed text-[var(--text-secondary)]">
                <strong className="text-[var(--ps-purple)]">Eslab qolish kodi:</strong> {activeHint.memory_code}
              </p>
            </div>
            <button type="button" onClick={proceedSprintToNext} className="ps-btn ps-btn-ink mt-4 w-full">
              Tushundim, davom etamiz · +5 XP
              <span className="ps-btn-arrow"><ArrowRight className="size-4" /></span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <LossAversionExitModal
        open={showExitModal}
        comboMultiplier={loop?.combo_multiplier || 1.0}
        onContinue={() => setShowExitModal(false)}
        onConfirmExit={() => {
          setShowExitModal(false);
          onClose();
        }}
      />
    </div>
  );
}
