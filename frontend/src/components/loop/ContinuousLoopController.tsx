'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, Zap, Sparkles, Trophy, X, Flame,
  Clock, ArrowRight, CheckCircle2, AlertCircle,
  HelpCircle, Swords, Check, RotateCw, Lightbulb,
  ShieldAlert, BookOpen, ChevronRight, Droplets
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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

  // Savollarni stageData dan yuklash
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

  if (loading && !loop) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="size-12 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
          <p className="text-sm font-bold text-zinc-300">Avtopilot Konveyeri yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-zinc-950 text-white select-none overflow-y-auto">
      {/* ========================================================================= */}
      {/* 1. TOP CHAIN STEPPER HUD (Neon Pipeline Header) */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-30 flex flex-col border-b border-white/10 bg-zinc-950/90 backdrop-blur-md px-3 sm:px-6 py-2.5">
        <div className="flex items-center justify-between gap-2">
          {/* Chapda: Mavzu va Uzluksizlik nishoni */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[12px] font-bold uppercase bg-orange-500/20 text-orange-400 border border-orange-500/30 whitespace-nowrap">
              Avtopilot • #{loop?.cycle_number || 1}
            </span>
            <h1 className="text-xs sm:text-sm font-bold text-zinc-200 truncate">
              {topic?.title || "Kunlik Zanjir"}
            </h1>
          </div>

          {/* O'ngda: DTM Ball + Combo Badge + Chiqish tugmasi */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-xl bg-zinc-900 border border-white/10 text-xs font-mono font-bold text-emerald-400">
              <Trophy className="size-3 text-emerald-400" />
              <span>+{(loop?.dtm_score_delta ?? 0.4).toFixed(1)} DTM</span>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-gradient-to-r from-orange-500/20 to-rose-500/20 border border-orange-500/40 text-xs font-mono font-bold text-orange-400 shadow-sm animate-pulse">
              <Flame className="size-3.5 fill-current" />
              <span>{(loop?.combo_multiplier ?? 1.0).toFixed(1)}x</span>
            </div>

            <button
              type="button"
              onClick={() => handleRequestExit(onClose)}
              className="size-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition cursor-pointer"
              title="Chiqish"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* 4 ta ulangan neon halqa zanjiri */}
        <div className="flex items-center justify-between gap-1 mt-2.5 max-w-2xl mx-auto w-full">
          {STEPS.map((step, idx) => {
            const isDone = idx < currentStageIndex;
            const isCurrent = idx === currentStageIndex;
            const StepIcon = step.icon;

            return (
              <React.Fragment key={step.id}>
                <div className="flex items-center gap-1.5">
                  <div
                    className={`size-7 sm:size-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      isCurrent
                        ? 'bg-gradient-to-r from-orange-500 to-rose-600 text-white shadow-lg shadow-orange-500/30 ring-2 ring-orange-400'
                        : isDone
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : 'bg-zinc-900 text-zinc-600 border border-white/5'
                    }`}
                  >
                    {isDone ? <Check className="size-3.5" /> : <StepIcon className="size-3.5" />}
                  </div>
                  <span
                    className={`hidden md:inline text-[12px] font-bold ${
                      isCurrent ? 'text-white' : isDone ? 'text-zinc-400' : 'text-zinc-600'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>

                {idx < STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-1 transition-all ${
                      idx < currentStageIndex
                        ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                        : idx === currentStageIndex
                        ? 'bg-gradient-to-r from-orange-500 to-zinc-700'
                        : 'bg-zinc-800'
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. BOSQICHLARNING ASOSIY MAYDONI (Single Container Focus View) */}
      {/* ========================================================================= */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 max-w-3xl mx-auto w-full">
        {/* Avtopilot Ko'prigi (3s Transition Bridge) */}
        {autoplayActive ? (
          <AutoplayTransitionBridge
            currentStageNumber={currentStageIndex}
            nextStageNumber={currentStageIndex + 1}
            nextStageTitle={STEPS[currentStageIndex]?.label || "Keyingi bosqich"}
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
            <RotateCw className="size-9 text-orange-500 animate-spin" />
            <div className="space-y-1">
              <p className="text-sm font-bold text-zinc-200">Avtopilot sikli yuklanmoqda...</p>
              <p className="text-xs text-zinc-400">Kunlik shpargalka va qasos savollari tayyorlanmoqda</p>
            </div>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {/* ── 1-BOSQICH: 60s ANTI-DARSLIK SHPARGALKA ── */}
            {currentStage === 'STAGE_1_WARMUP' && (
              <motion.div
                key="stage_1"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="w-full space-y-5"
              >
                <div className="flex items-center justify-between">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 text-xs font-bold uppercase">
                    <Brain className="size-3.5" />
                    <span>1-Bosqich: 90s Shpargalka</span>
                  </div>

                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900 border border-white/10 text-xs font-mono font-bold text-amber-400">
                    <Clock className="size-3.5 animate-pulse" />
                    <span>{warmupSecondsLeft}s qoldi</span>
                  </div>
                </div>

                <div className="rounded-3xl border border-white/10 bg-zinc-900/60 p-5 sm:p-7 shadow-xl space-y-4">
                  <h2 className="text-xl sm:text-2xl font-bold text-white">
                    {stageData?.warmup?.title || topic?.title || "Oltin Qoidalar & BMB Qopqonlari"}
                  </h2>
                  <p className="text-xs sm:text-sm text-zinc-300 whitespace-pre-line leading-relaxed">
                    {stageData?.warmup?.cheat_sheet_content ||
                      "1. Savol shartini diqqat bilan o'qing: 'emas', 'noto'g'ri', 'mos kelmaydi' inkor so'zlariga urg'u bering.\n2. Birinchi taassurotga ishonmang: chalg'ituvchi variantlar odatda eng tanish tuyuladi.\n3. Istisno usulini qo'llang: mutlaqo noto'g'ri bo'lgan 2 ta javobni darhol chiqarib tashlang."}
                  </p>

                  <div className="space-y-2 pt-2">
                    <h3 className="text-xs font-bold uppercase text-rose-400 tracking-wider flex items-center gap-1.5">
                      <ShieldAlert className="size-3.5" />
                      <span>BMB / DTM Qopqonlari:</span>
                    </h3>
                    <div className="grid grid-cols-1 gap-2">
                      {(stageData?.warmup?.bmb_traps && stageData.warmup.bmb_traps.length > 0
                        ? stageData.warmup.bmb_traps
                        : [
                            "Mavzudagi o'xshash atamalar va yillarni aralashtirib yuborish",
                            "Savol oxiridagi 'emas' qo'shimchasini e'tibordan chetda qoldirish",
                            "Tarixiy shaxslar yoki ilmiy tushunchalarning davrini xato tanlash",
                          ]
                      ).map((trap, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-xl bg-zinc-950/80 border border-rose-500/20 text-xs text-rose-300 flex items-start gap-2"
                        >
                          <span className="size-1.5 rounded-full bg-rose-500 shrink-0 mt-1.5" />
                          <span>{trap}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={handleStartSprint}
                  className="w-full h-13 rounded-2xl bg-gradient-to-r from-orange-500 to-rose-600 hover:from-orange-400 hover:to-rose-500 text-white font-bold text-base shadow-xl shadow-rose-600/30 cursor-pointer"
                >
                  <Zap className="size-5 fill-current" />
                  <span>Tayyorman, Sprintga start! ⚡</span>
                </Button>
              </motion.div>
            )}

            {/* ── 2-BOSQICH: JONLI QASOS SPRINTI ── */}
            {currentStage === 'STAGE_2_SPRINT' && sprintQuestions[sprintIndex] && (
              <motion.div
                key={`stage_2_${sprintIndex}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="w-full space-y-5"
              >
                {/* Savol tepasidagi indikatorlar */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-full bg-zinc-900 border border-white/10 text-xs font-mono font-bold text-zinc-300">
                      Savol {sprintIndex + 1} / {Math.min(12, sprintQuestions.length)}
                    </span>
                    {sprintQuestions[sprintIndex].isRevenge && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-bold animate-pulse">
                        <Flame className="size-3.5 fill-current text-orange-400" />
                        <span>QASOS SAVOLI (2x Ball)</span>
                      </span>
                    )}
                  </div>

                  {pendingRevengeCount > 0 && (
                    <span className="text-xs font-bold text-orange-400 flex items-center gap-1">
                      <Clock className="size-3.5" />
                      <span>{pendingRevengeCount} ta Qasos savoli kutmoqda</span>
                    </span>
                  )}
                </div>

                {/* Savol Matni */}
                <div className="rounded-3xl border border-white/10 bg-zinc-900/70 p-5 sm:p-7 shadow-xl">
                  <p className="text-base sm:text-lg font-bold text-white leading-relaxed">
                    {sprintQuestions[sprintIndex].text}
                  </p>
                </div>

                {/* Variantlar */}
                <div className="grid grid-cols-1 gap-2.5">
                  {sprintQuestions[sprintIndex].options.map((opt) => {
                    const isSelected = selectedOptionId === opt.id;
                    const showCorrect = isAnswerChecked && opt.is_correct;
                    const showWrong = isAnswerChecked && isSelected && !opt.is_correct;

                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleSelectSprintOption(opt.id)}
                        disabled={isAnswerChecked}
                        className={`w-full p-4 rounded-2xl border text-left font-semibold text-sm transition-all cursor-pointer flex items-center justify-between ${
                          showCorrect
                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-500/20'
                            : showWrong
                            ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                            : isSelected
                            ? 'bg-primary/20 border-primary text-white'
                            : 'bg-zinc-900/60 border-white/5 hover:border-white/20 text-zinc-200 hover:bg-zinc-900'
                        }`}
                      >
                        <span>{opt.text}</span>
                        {showCorrect && <CheckCircle2 className="size-5 text-emerald-400 shrink-0" />}
                        {showWrong && <AlertCircle className="size-5 text-rose-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* ── 3-BOSQICH: XATOLAR DUELI (FLASHCARDS) ── */}
            {currentStage === 'STAGE_3_CLEANUP' && stageData?.cleanup?.cards && (
              <motion.div
                key="stage_3"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full space-y-5"
              >
                <div className="flex items-center justify-between">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-bold uppercase">
                    <Swords className="size-3.5" />
                    <span>3-Bosqich: Xatolar Flashcardi ({cleanupIndex + 1}/{stageData.cleanup.cards.length})</span>
                  </div>

                  <span className="text-xs font-mono font-bold text-orange-400">
                    🔥 1.5x Combo Faol
                  </span>
                </div>

                {stageData.cleanup.cards[cleanupIndex] && (
                  <div
                    onClick={handleFlipCard}
                    className="relative min-h-[220px] rounded-3xl border border-white/10 bg-gradient-to-b from-zinc-900 via-zinc-950 to-zinc-900 p-6 sm:p-8 shadow-2xl cursor-pointer flex flex-col justify-between"
                  >
                    {!isCardFlipped ? (
                      <div className="space-y-4">
                        <span className="text-[12px] font-bold uppercase tracking-wider text-zinc-400">
                          Xato qilingan savol (Bosing va to'g'ri javobni ko'ring):
                        </span>
                        <p className="text-base sm:text-lg font-bold text-white">
                          {stageData.cleanup.cards[cleanupIndex].front}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <span className="text-[12px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                          <Check className="size-3.5" />
                          <span>To'g'ri Javob va Layfxak:</span>
                        </span>
                        <p className="text-lg sm:text-xl font-bold text-emerald-300">
                          {stageData.cleanup.cards[cleanupIndex].back}
                        </p>
                        <p className="text-xs text-zinc-300 bg-zinc-950 p-3 rounded-xl border border-white/5">
                          💡 {stageData.cleanup.cards[cleanupIndex].tip}
                        </p>
                      </div>
                    )}

                    <div className="text-center text-[12px] text-zinc-500 pt-3 border-t border-white/5">
                      {isCardFlipped ? "Yana bosib savolga qayting" : "Karta orqasini o'qish uchun bosing"}
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    type="button"
                    onClick={handleFlipCard}
                    variant="outline"
                    className="flex-1 h-12 rounded-2xl border-white/10 text-zinc-300"
                  >
                    <RotateCw className="size-4 mr-1.5" />
                    <span>Kartani Aylantirish</span>
                  </Button>

                  <Button
                    type="button"
                    onClick={handleClearCard}
                    className="flex-1 h-12 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white font-bold"
                  >
                    <CheckCircle2 className="size-4 mr-1.5" />
                    <span>Tushundim, Xatoni Yopish</span>
                  </Button>
                </div>
              </motion.div>
            )}

            {/* ── 4-BOSQICH: 1v1 GHOST ARENA DUEL ── */}
            {currentStage === 'STAGE_4_ARENA' && stageData?.arena && arenaQuestions[arenaIndex] && (
              <motion.div
                key="stage_4"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full space-y-5"
              >
                {/* 1v1 Header: Siz vs Raqib */}
                <div className="rounded-3xl border border-orange-500/30 bg-zinc-900/80 p-4 sm:p-5 shadow-xl flex items-center justify-between gap-4">
                  {/* Siz */}
                  <div className="flex items-center gap-2.5">
                    <div className="size-11 rounded-full bg-primary/20 border border-primary flex items-center justify-center font-bold text-sm text-primary">
                      SIZ
                    </div>
                    <div>
                      <div className="text-xs text-zinc-400">Sizning ballingiz</div>
                      <div className="text-lg font-bold text-white font-mono">{userScore}</div>
                    </div>
                  </div>

                  <div className="text-center font-mono font-bold text-orange-400 text-sm">
                    VS
                    <div className="text-[12px] text-zinc-500">⏱ {arenaTimeLeft}s</div>
                  </div>

                  {/* Arvoh Raqib */}
                  <div className="flex items-center gap-2.5 text-right">
                    <div>
                      <div className="text-xs text-zinc-400">{stageData.arena.opponent.name}</div>
                      <div className="text-lg font-bold text-orange-400 font-mono">{ghostScore}</div>
                    </div>
                    <img
                      src={stageData.arena.opponent.avatar_url}
                      alt="Raqib"
                      className="size-11 rounded-full border border-orange-500/40 bg-zinc-800 object-cover"
                    />
                  </div>
                </div>

                {/* Savol */}
                <div className="rounded-3xl border border-white/10 bg-zinc-900/60 p-5 sm:p-7 shadow-xl">
                  <span className="text-[12px] font-bold uppercase text-orange-400 tracking-wider">
                    Tezkor Duel Savoli ({arenaIndex + 1}/{arenaQuestions.length})
                  </span>
                  <p className="text-base sm:text-lg font-bold text-white mt-1.5">
                    {arenaQuestions[arenaIndex].text}
                  </p>
                </div>

                {/* Variantlar */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {arenaQuestions[arenaIndex].options.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleArenaAnswer(opt.id)}
                      disabled={isArenaSubmitting}
                      className="p-4 rounded-2xl border border-white/10 bg-zinc-900 hover:border-orange-500/50 hover:bg-orange-500/10 font-bold text-sm text-left transition-all active:scale-95 cursor-pointer"
                    >
                      {opt.text}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ── 5-BOSQICH: SIRLI SANDIQ & ECO-DARAXT KULMINATSIYASI ── */}
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

            {/* Fallback: agar noma'lum holat bo'lsa yoki bosqich ma'lumotlari kutilayotgan bo'lsa */}
            {(!loop || !stageData || !['STAGE_1_WARMUP', 'STAGE_2_SPRINT', 'STAGE_3_CLEANUP', 'STAGE_4_ARENA', 'STAGE_5_COMPLETED'].includes(loop.current_stage)) && (
              <div className="p-8 text-center space-y-4">
                <Brain className="size-12 text-orange-400 mx-auto animate-bounce" />
                <p className="text-zinc-300 font-bold">Avtopilot zanjiri yuklanmoqda...</p>
                <Button onClick={() => fetchLoop()} variant="outline" className="rounded-xl border-white/10 text-white">
                  Qayta yuklash
                </Button>
              </div>
            )}
          </AnimatePresence>
        )}
      </main>

      {/* ========================================================================= */}
      {/* 3. AI MENTOR LAYFXAK (BOTTOM SHEET) */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showAiMentorSheet && activeHint && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-x-0 bottom-0 z-40 rounded-t-3xl border-t border-rose-500/40 bg-zinc-950/95 backdrop-blur-xl p-5 sm:p-7 shadow-2xl max-w-2xl mx-auto"
          >
            <div className="mx-auto size-1.5 w-12 rounded-full bg-zinc-700 mb-4" />

            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase tracking-wider">
                <Lightbulb className="size-4 animate-pulse" />
                <span>AI Mentor Layfxaki (Aha Moment)</span>
              </div>
              <span className="text-[12px] font-mono text-zinc-400">10s tahlil</span>
            </div>

            <div className="space-y-3 bg-rose-950/20 border border-rose-500/30 p-4 rounded-2xl text-xs sm:text-sm text-rose-200">
              <p className="font-bold text-white">
                {activeHint.aha_moment}
              </p>
              <p className="text-zinc-300">
                <strong className="text-amber-400">Eslab Qolish Kodi:</strong> {activeHint.memory_code}
              </p>
            </div>

            <Button
              type="button"
              onClick={proceedSprintToNext}
              className="w-full h-12 mt-4 rounded-2xl bg-gradient-to-r from-orange-500 to-rose-600 hover:from-orange-400 text-white font-bold text-sm cursor-pointer"
            >
              <span>Tushundim, davom etamiz (+5 XP)</span>
              <ArrowRight className="size-4 ml-1.5" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 4. CHIQISHDAN HIMOYALASH MODALI (Loss Aversion Exit Modal) */}
      {/* ========================================================================= */}
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
