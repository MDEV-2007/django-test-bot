'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { tgHaptic, useTelegramBackButton } from '@/lib/telegram';
import type {
  QuestionItem,
  QuestionOption,
  MistakeExplanationCache,
  ExplainMistakeRequest,
  ExplainMistakeResponse,
  RevengeQueueItem,
  ComboState,
  LiveScorePredictor,
  SprintSessionSummary,
} from '@/types/sprint';

/**
 * Fisher-Yates (Knuth) Algoritmi.
 * "Qasos savoli" qaytganda variantlarni matematik jihatdan 100% teng ehtimollikda
 * aralashtiradi. O'quvchi harfni emas, mohiyatni eslab qolishga majbur bo'ladi.
 */
export function shuffleArray<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = arr[i];
    arr[i] = arr[j];
    arr[j] = temp;
  }
  return arr;
}

export type UseNeuralSprintOptions = {
  initialQuestions: QuestionItem[];
  initialDtmScore?: number;
  maxDtmScore?: number;
  initialTopicMastery?: number;
  topicTitle?: string;
  onFinish?: (summary: SprintSessionSummary) => void;
  onAnswerCorrect?: (q: QuestionItem, comboMultiplier: number) => void;
  onAnswerWrong?: (q: QuestionItem, explanation: MistakeExplanationCache | null) => void;
};

export function useNeuralSprint({
  initialQuestions,
  initialDtmScore = 178.4,
  maxDtmScore = 189.0,
  initialTopicMastery = 45,
  topicTitle = "Umumiy Tayyorgarlik",
  onFinish,
  onAnswerCorrect,
  onAnswerWrong,
}: UseNeuralSprintOptions) {
  // Savollar navbati (Queue)
  const [questionsQueue, setQuestionsQueue] = useState<QuestionItem[]>(() => [...initialQuestions]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Tanlangan javob va holat
  const [selectedOptionId, setSelectedOptionId] = useState<string | number | null>(null);
  const [feedbackStatus, setFeedbackStatus] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [isVerifying, setIsVerifying] = useState(false);

  // AI Mentor Layfxak kartochkasi holati (Bottom Sheet / Drawer)
  const [activeExplanation, setActiveExplanation] = useState<MistakeExplanationCache | null>(null);
  const [isExplainingLoading, setIsExplainingLoading] = useState(false);
  const [isExplanationOpen, setIsExplanationOpen] = useState(false);

  // Qasos savollari navbati (Spaced Repetition Queue)
  const [revengeQueue, setRevengeQueue] = useState<RevengeQueueItem[]>([]);

  // Jonli Barometr: Kutilayotgan DTM ball va Mavzu o'zlashtirish
  const [dtmScore, setDtmScore] = useState(initialDtmScore);
  const [scoreDelta, setScoreDelta] = useState<number | null>(null);
  const [topicMastery, setTopicMastery] = useState(initialTopicMastery);

  // 🔥 Combo Multiplier
  const [combo, setCombo] = useState<ComboState>({
    currentStreak: 0,
    multiplier: 1.0,
    highestCombo: 1.0,
    comboProgress: 0,
  });

  // Statistika
  const [stats, setStats] = useState({
    correct: 0,
    wrong: 0,
    revengeSolved: 0,
    totalXp: 0,
    totalCoins: 0,
  });

  // Vaqt hisobi
  const startTimeRef = useRef<number>(Date.now());
  const autoAdvanceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Loss Aversion Modal holati
  const [isLossAversionOpen, setIsLossAversionOpen] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  const currentQuestion = questionsQueue[currentIndex] || null;

  // Rasmiy DTM / Sertifikat darajasini baholash
  const predictedGrade = useMemo(() => {
    const ratio = dtmScore / maxDtmScore;
    if (ratio >= 0.94) return 'A+ (100% OTM Imtiyozi)';
    if (ratio >= 0.88) return "A (A'lo Sertifikat)";
    if (ratio >= 0.80) return 'B+ (Juda yaxshi)';
    if (ratio >= 0.72) return 'B (Yaxshi natija)';
    if (ratio >= 0.60) return "C+ (Qoniqarli)";
    return "C (O'tish darajasi)";
  }, [dtmScore, maxDtmScore]);

  // Jonli Header Barometri ob'ekti
  const scorePredictor: LiveScorePredictor = useMemo(() => ({
    currentScore: Math.round(dtmScore * 10) / 10,
    maxScore: maxDtmScore,
    deltaScore: scoreDelta,
    predictedGrade,
    topicMasteryPercentage: Math.min(100, Math.round(topicMastery)),
    topicName: currentQuestion?.topicTitle || topicTitle,
  }), [dtmScore, maxDtmScore, scoreDelta, predictedGrade, topicMastery, currentQuestion, topicTitle]);

  // Navbatdagi Qasos savoli necha qadamdan keyin chiqishini hisoblash
  const nextRevengeDistance = useMemo(() => {
    if (revengeQueue.length === 0) return null;
    const nextItem = revengeQueue[0];
    const diff = nextItem.scheduledIndex - currentIndex;
    return diff > 0 ? diff : 1;
  }, [revengeQueue, currentIndex]);

  /**
   * Telegram WebApp BackButton tutuvchisi:
   * Agar foydalanuvchida 1.5x+ Combo yoki ochiq Qasos savoli bo'lsa,
   * Telegramning Back tugmasi to'g'ridan-to'g'ri chiqib ketmasdan Loss Aversion modalini ochadi.
   */
  const handleTelegramBack = useCallback(() => {
    if (combo.multiplier >= 1.5 || revengeQueue.length > 0) {
      tgHaptic('warning');
      setIsLossAversionOpen(true);
    } else {
      window.history.back();
    }
  }, [combo.multiplier, revengeQueue.length]);

  useTelegramBackButton(isFinished ? null : handleTelegramBack);

  /**
   * Savolga javob tanlash mexanikasi (0.2s Instant Verification + Telegram Haptics).
   */
  const selectOption = useCallback(async (optionId: string | number) => {
    if (isVerifying || feedbackStatus !== 'idle' || !currentQuestion) return;

    // Telegram Haptika: Variant bosilganda engil tebranish
    tgHaptic('select');

    setSelectedOptionId(optionId);
    setIsVerifying(true);

    const isCorrect = optionId === currentQuestion.correctOptionId;
    const isRevenge = !!currentQuestion.isRevenge;

    if (isCorrect) {
      // ─── TO'G'RI JAVOB ─────────────────────────────────────────
      // Telegram Haptika: G'alaba vibratsiyasi
      tgHaptic('success');

      setFeedbackStatus('correct');
      setIsVerifying(false);

      // Combo oshirish: 3 tada 1.5x, 6 tada 2.0x
      setCombo((prev) => {
        const nextStreak = prev.currentStreak + 1;
        let nextMultiplier: 1.0 | 1.5 | 2.0 = 1.0;
        if (nextStreak >= 6) nextMultiplier = 2.0;
        else if (nextStreak >= 3) nextMultiplier = 1.5;

        return {
          currentStreak: nextStreak,
          multiplier: nextMultiplier,
          highestCombo: Math.max(prev.highestCombo, nextMultiplier),
          comboProgress: (nextStreak % 3) / 3,
        };
      });

      // Ball va Mavzu o'sishi (Qasos savoli bo'lsa 2x)
      const baseScoreDelta = 0.2;
      const appliedDelta = isRevenge ? baseScoreDelta * 2 : baseScoreDelta * combo.multiplier;
      const xpEarned = isRevenge ? 40 : Math.round(15 * combo.multiplier);
      const coinsEarned = isRevenge ? 10 : Math.round(3 * combo.multiplier);

      setDtmScore((prev) => Math.min(maxDtmScore, Math.round((prev + appliedDelta) * 10) / 10));
      setScoreDelta(appliedDelta);
      setTopicMastery((prev) => Math.min(100, prev + (isRevenge ? 5 : 3)));

      setStats((prev) => ({
        ...prev,
        correct: prev.correct + 1,
        revengeSolved: isRevenge ? prev.revengeSolved + 1 : prev.revengeSolved,
        totalXp: prev.totalXp + xpEarned,
        totalCoins: prev.totalCoins + coinsEarned,
      }));

      // Agar bu Qasos savoli bo'lsa:
      if (isRevenge) {
        setRevengeQueue((prev: RevengeQueueItem[]) => prev.filter((r) => r.questionId !== currentQuestion.originalQuestionId && r.questionId !== currentQuestion.id));

        // Django backendga xatoni yechildi deb belgilash signali
        const targetQId = currentQuestion.originalQuestionId || currentQuestion.id;
        fetch('/api/v1/sprint/resolve-revenge/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question_id: targetQId }),
        }).catch(() => {});
      }

      onAnswerCorrect?.(currentQuestion, combo.multiplier);

      // 1.2 soniyadan so'ng silliq keyingi savolga o'tish (Autoplay)
      autoAdvanceTimerRef.current = setTimeout(() => {
        goToNext();
      }, 1200);
    } else {
      // ─── XATO JAVOB ───────────────────────────────────────────
      // Telegram Haptika: Xatolik ogohlantiruvchi tebranishi
      tgHaptic('error');

      setFeedbackStatus('wrong');
      setIsVerifying(false);

      // Combo va Ball kamayishi (Loss Aversion)
      setCombo((prev) => ({
        currentStreak: 0,
        multiplier: 1.0,
        highestCombo: prev.highestCombo,
        comboProgress: 0,
      }));

      const lossDelta = -0.1;
      setDtmScore((prev) => Math.max(0, Math.round((prev + lossDelta) * 10) / 10));
      setScoreDelta(lossDelta);

      setStats((prev) => ({
        ...prev,
        wrong: prev.wrong + 1,
      }));

      // ─── QASOS SAVOLI (Redemption Loop): Variantlarni Fisher-Yates bilan aralashtirib currentIndex + 3 ga joylash ───
      const targetIndex = Math.min(currentIndex + 3, questionsQueue.length);
      const shuffledOptions = shuffleArray(currentQuestion.options);

      const revengeQuestion: QuestionItem = {
        ...currentQuestion,
        id: `revenge_${currentQuestion.id}_${Date.now()}`,
        originalQuestionId: currentQuestion.id,
        isRevenge: true,
        failedOptionId: optionId,
        options: shuffledOptions,
      };

      setQuestionsQueue((prev: QuestionItem[]) => {
        const nextList = [...prev];
        nextList.splice(targetIndex, 0, revengeQuestion);
        return nextList;
      });

      setRevengeQueue((prev) => [
        ...prev,
        {
          questionId: currentQuestion.id,
          scheduledIndex: targetIndex,
          originalMistakeOptionId: optionId,
          addedAtStep: currentIndex,
          isResolved: false,
        },
      ]);

      // ─── LAZY AI EXPLANATION CACHING SO'ROVI (Django / Next.js) ─────
      setIsExplainingLoading(true);
      setIsExplanationOpen(true);

      const selectedOpt = currentQuestion.options.find((o: QuestionOption) => o.id === optionId);
      const correctOpt = currentQuestion.options.find((o: QuestionOption) => o.id === currentQuestion.correctOptionId);

      const payload = {
        question_id: currentQuestion.id,
        question_body: currentQuestion.body,
        selected_option_id: optionId,
        selected_option_text: selectedOpt?.text || '',
        correct_option_id: currentQuestion.correctOptionId,
        correct_option_text: correctOpt?.text || '',
        topic_title: currentQuestion.topicTitle || topicTitle,
      };

      try {
        const res = await fetch('/api/v1/sprint/explain-mistake/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const json = await res.json();
          if (json.ok && json.data) {
            const expData: MistakeExplanationCache = {
              questionId: json.data.question_id || currentQuestion.id,
              selectedOptionId: json.data.selected_option_id || optionId,
              whyWrong: json.data.why_wrong,
              memoryHack: json.data.memory_hack,
              cached: json.cached,
              modelName: json.data.model_name,
            };
            setActiveExplanation(expData);
            onAnswerWrong?.(currentQuestion, expData);
          }
        }
      } catch (err) {
        console.error("Sprint explain mistake error:", err);
      } finally {
        setIsExplainingLoading(false);
      }
    }
  }, [
    isVerifying,
    feedbackStatus,
    currentQuestion,
    combo.multiplier,
    currentIndex,
    questionsQueue.length,
    maxDtmScore,
    topicTitle,
    onAnswerCorrect,
    onAnswerWrong,
  ]);

  /**
   * Keyingi savolga o'tish logikasi.
   */
  const goToNext = useCallback(() => {
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }

    setSelectedOptionId(null);
    setFeedbackStatus('idle');
    setIsExplanationOpen(false);
    setActiveExplanation(null);
    setScoreDelta(null);

    const nextIdx = currentIndex + 1;
    if (nextIdx >= questionsQueue.length) {
      // Sprint to'liq yakunlandi
      setIsFinished(true);
      const totalTime = Math.round((Date.now() - startTimeRef.current) / 1000);
      const summary: SprintSessionSummary = {
        totalAnswered: stats.correct + stats.wrong,
        correctCount: stats.correct,
        mistakeCount: stats.wrong,
        revengeSolvedCount: stats.revengeSolved,
        totalXpEarned: stats.totalXp,
        totalCoinsEarned: stats.totalCoins,
        finalScore: dtmScore,
        initialScore: initialDtmScore,
        finalTopicMastery: topicMastery,
        timeSpentSeconds: totalTime,
        highestCombo: combo.highestCombo,
        hasUnresolvedRevenge: revengeQueue.length > 0,
      };
      onFinish?.(summary);
    } else {
      setCurrentIndex(nextIdx);
    }
  }, [
    currentIndex,
    questionsQueue.length,
    stats,
    dtmScore,
    initialDtmScore,
    topicMastery,
    combo.highestCombo,
    revengeQueue.length,
    onFinish,
  ]);

  /**
   * "Tushundim, davom etamiz (+5 XP)" tugmasi bosilganda.
   */
  const dismissExplanation = useCallback(() => {
    tgHaptic('light');
    setStats((prev) => ({ ...prev, totalXp: prev.totalXp + 5 }));
    goToNext();
  }, [goToNext]);

  /**
   * Foydalanuvchi sprintdan chiqmoqchi bo'lganda (Loss Aversion tekshiruvi).
   */
  const requestQuit = useCallback(() => {
    if (combo.multiplier >= 1.5 || revengeQueue.length > 0) {
      tgHaptic('warning');
      setIsLossAversionOpen(true);
      return false;
    }
    return true;
  }, [combo.multiplier, revengeQueue.length]);

  const confirmQuit = useCallback(() => {
    setIsLossAversionOpen(false);
    setIsFinished(true);
  }, []);

  const cancelQuit = useCallback(() => {
    setIsLossAversionOpen(false);
  }, []);

  useEffect(() => {
    return () => {
      if (autoAdvanceTimerRef.current) {
        clearTimeout(autoAdvanceTimerRef.current);
      }
    };
  }, []);

  return {
    // Holatlar
    currentQuestion,
    currentIndex,
    totalQuestions: questionsQueue.length,
    selectedOptionId,
    feedbackStatus,
    isVerifying,
    isFinished,

    // AI Mentor Layfxak (Bottom Sheet / Drawer)
    activeExplanation,
    isExplainingLoading,
    isExplanationOpen,
    dismissExplanation,

    // Jonli Barometr & Combo
    scorePredictor,
    combo,
    stats,

    // Qasos savollari
    revengeQueueCount: revengeQueue.length,
    nextRevengeDistance,
    isCurrentRevenge: !!currentQuestion?.isRevenge,

    // Chiqishni boshqarish (Loss Aversion & Telegram BackButton)
    isLossAversionOpen,
    requestQuit,
    confirmQuit,
    cancelQuit,

    // Amallar
    selectOption,
    goToNext,
  };
}
