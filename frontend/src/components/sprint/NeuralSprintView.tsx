'use client';

import React from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap, Flame, Trophy, Sparkles, X, ChevronRight,
  RotateCcw, Swords, BookOpen, AlertTriangle, Lightbulb,
  CheckCircle2, XCircle, ShieldAlert, Award, ArrowRight,
  Hourglass, Brain, Coins
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { QuestionItem, QuestionOption, SprintSessionSummary } from '@/types/sprint';
import { useNeuralSprint } from '@/hooks/useNeuralSprint';

interface NeuralSprintViewProps {
  questions: QuestionItem[];
  initialDtmScore?: number;
  initialTopicMastery?: number;
  topicTitle?: string;
  onExit?: () => void;
  onFinish?: (summary: SprintSessionSummary) => void;
}

const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E', 'F'];

export default function NeuralSprintView({
  questions,
  initialDtmScore = 178.4,
  initialTopicMastery = 45,
  topicTitle = "O'zbekiston Tarixi",
  onExit,
  onFinish,
}: NeuralSprintViewProps) {
  const {
    currentQuestion,
    currentIndex,
    totalQuestions,
    selectedOptionId,
    feedbackStatus,
    isVerifying,
    isFinished,

    activeExplanation,
    isExplainingLoading,
    isExplanationOpen,
    dismissExplanation,

    scorePredictor,
    combo,
    stats,

    revengeQueueCount,
    nextRevengeDistance,
    isCurrentRevenge,

    isLossAversionOpen,
    requestQuit,
    confirmQuit,
    cancelQuit,

    selectOption,
  } = useNeuralSprint({
    initialQuestions: questions,
    initialDtmScore,
    initialTopicMastery,
    topicTitle,
    onFinish,
  });

  const handleSafeExit = () => {
    if (requestQuit()) {
      if (onExit) onExit();
    }
  };

  const handleConfirmedExit = () => {
    confirmQuit();
    if (onExit) onExit();
  };

  // ─────────────────────────────────────────────────────────────
  // 1. SPRINT YAKUNI (Zero Dead-Ends Autoplay Natija Ekrani)
  // ─────────────────────────────────────────────────────────────
  if (isFinished) {
    const hasMistakes = stats.wrong > 0;
    const isMastered = scorePredictor.topicMasteryPercentage >= 80;

    return (
      <div className="relative min-h-[90vh] flex flex-col items-center justify-center p-4 sm:p-6 text-foreground">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="w-full max-w-xl mx-auto rounded-3xl border border-border/80 bg-card/95 backdrop-blur-xl p-6 sm:p-8 shadow-2xl space-y-6 text-center"
        >
          {/* Yuqori G'alaba nuri va nishoni */}
          <div className="relative mx-auto size-20 rounded-3xl bg-gradient-to-tr from-amber-500/20 via-primary/20 to-emerald-500/20 border border-primary/30 flex items-center justify-center shadow-lg shadow-primary/10">
            <Trophy className="size-10 text-amber-500 animate-bounce" />
            <Sparkles className="absolute -top-1 -right-1 size-5 text-amber-400 animate-pulse" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text">
              Fokus Sprinti Yakunlandi!
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Miyangiz yangi neyron zanjirlarini muvaffaqiyatli bog&apos;ladi
            </p>
          </div>

          {/* KPI Kartochkalari */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-2xl bg-muted/40 border border-border/60">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">To&apos;g&apos;ri</span>
              <p className="text-xl font-black text-emerald-500 mt-0.5">{stats.correct}</p>
            </div>
            <div className="p-3 rounded-2xl bg-muted/40 border border-border/60">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Qasos G&apos;alabasi</span>
              <p className="text-xl font-black text-amber-500 mt-0.5">+{stats.revengeSolved}</p>
            </div>
            <div className="p-3 rounded-2xl bg-muted/40 border border-border/60">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">DTM Ball</span>
              <p className="text-xl font-black text-primary mt-0.5">{scorePredictor.currentScore}</p>
            </div>
            <div className="p-3 rounded-2xl bg-muted/40 border border-border/60">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Mukofot</span>
              <p className="text-xl font-black text-amber-400 mt-0.5">+{stats.totalXp} XP</p>
            </div>
          </div>

          {/* ─── ZERO DEAD-ENDS: Keyingi Bosqich Tramplini (CTA) ─── */}
          <div className="pt-2 space-y-3 text-left">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-primary">
              <Sparkles className="size-3.5 text-primary" /> Keyingi Qadam (Avtopilot Oqimi)
            </span>

            {hasMistakes ? (
              // Stsenariy A: Xatolar mavjud bo'lsa Flashcard-blits
              <Card className="p-4 rounded-2xl border-2 border-primary/40 bg-gradient-to-r from-primary/10 via-primary/5 to-amber-500/10 shadow-lg space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-[10px] font-bold">
                      {stats.wrong} ta nozik nuqta
                    </Badge>
                    <span className="text-xs font-bold text-foreground">Xatolar ustida blits-mashq</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Ushbu mavzuni 100% ga yopish va ballni saqlab qolish uchun 90 soniyalik Flashcard bilan mustahkamlang.
                  </p>
                </div>
                <Button
                  asChild
                  className="w-full rounded-xl bg-gradient-to-r from-primary to-amber-500 hover:from-primary/90 hover:to-amber-500/90 text-white font-bold text-xs h-10 shadow-md shadow-primary/25 gap-2 cursor-pointer"
                >
                  <Link href="/study">
                    <BookOpen className="size-4" />
                    <span>Flashcard-blitsni Boshlash (+40 Tanga)</span>
                    <ArrowRight className="size-4 ml-auto" />
                  </Link>
                </Button>
              </Card>
            ) : isMastered ? (
              // Stsenariy B: Mavzu > 80% o'zlashtirilgan bo'lsa 1v1 Arena
              <Card className="p-4 rounded-2xl border-2 border-amber-500/40 bg-gradient-to-r from-amber-500/15 via-primary/10 to-emerald-500/10 shadow-lg space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                      Tayyorlik 85%+
                    </Badge>
                    <span className="text-xs font-bold text-foreground">Haqiqiy raqib bilan sinov</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Siz hozir bu mavzuda to&apos;liq tayyorsiz! Jonli 1v1 Arenada 60 soniyalik duelda kuch sinashing.
                  </p>
                </div>
                <Button
                  asChild
                  className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-emerald-600 hover:from-amber-600 hover:to-emerald-700 text-white font-bold text-xs h-10 shadow-md shadow-amber-500/25 gap-2 cursor-pointer"
                >
                  <Link href="/battles">
                    <Swords className="size-4" />
                    <span>1v1 Arena Dueliga Kirish (+50 XP, 2x Bonus)</span>
                    <ArrowRight className="size-4 ml-auto" />
                  </Link>
                </Button>
              </Card>
            ) : (
              // Boshqa stsenariy: Navbatdagi sprint
              <Button
                onClick={() => window.location.reload()}
                className="w-full rounded-xl bg-primary text-primary-foreground font-bold text-xs h-10 shadow-md gap-2 cursor-pointer"
              >
                <RotateCcw className="size-4" />
                <span>Yangi Fokus Sprintini Boshlash</span>
              </Button>
            )}

            {/* Ikkilamchi Tugmalar */}
            <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={onExit}
                className="text-xs gap-1.5 rounded-xl cursor-pointer"
              >
                <BookOpen className="size-3.5" />
                <span>Boshqa fanni tanlash</span>
              </Button>
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-foreground cursor-pointer rounded-xl"
              >
                <Link href="/dashboard">Dashboardga qaytish</Link>
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 2. ASOSIY SPRINT INTERFEYSI
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="relative min-h-[92vh] flex flex-col justify-between max-w-2xl mx-auto px-3.5 py-2.5 sm:py-4">
      {/* ─── A. JONLI BAROMETR HEADER (Top HUD) ─── */}
      <header className="sticky top-0 z-30 mb-4 pb-2 bg-background/80 backdrop-blur-md border-b border-border/40">
        <div className="flex items-center justify-between gap-2.5 mb-2.5">
          {/* Chiqish tugmasi */}
          <button
            type="button"
            onClick={handleSafeExit}
            aria-label="Sprintdan chiqish"
            className="size-8 rounded-full border border-border/60 bg-muted/40 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="size-4" />
          </button>

          {/* Markaziy Barometr Pillslari */}
          <div className="flex items-center gap-2 flex-wrap justify-center">
            {/* 1. DTM Kutilayotgan Ball */}
            <div className="relative inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-bold text-primary shadow-2xs">
              <Award className="size-3.5 text-primary" />
              <span>Prognoz: <b className="font-mono">{scorePredictor.currentScore}</b> / {scorePredictor.maxScore}</span>
              {scorePredictor.deltaScore !== null && (
                <span className={cn(
                  'text-[10px] font-black animate-pulse',
                  scorePredictor.deltaScore > 0 ? 'text-emerald-500' : 'text-rose-500'
                )}>
                  {scorePredictor.deltaScore > 0 ? `+${scorePredictor.deltaScore}` : scorePredictor.deltaScore}
                </span>
              )}
            </div>

            {/* 2. Combo Multiplier */}
            <div className={cn(
              'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black transition-all duration-300',
              combo.multiplier >= 2.0
                ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30 scale-105'
                : combo.multiplier >= 1.5
                ? 'bg-amber-500/15 border border-amber-500/40 text-amber-600 dark:text-amber-400'
                : 'bg-muted text-muted-foreground'
            )}>
              <Flame className={cn('size-3.5', combo.multiplier >= 1.5 && 'fill-current animate-bounce')} />
              <span>{combo.multiplier.toFixed(1)}x Combo</span>
            </div>
          </div>

          {/* Savol sanog'i */}
          <div className="text-xs font-mono font-bold text-muted-foreground shrink-0">
            {currentIndex + 1} / {totalQuestions}
          </div>
        </div>

        {/* Mavzu o'zlashtirish Progress Bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground px-0.5">
            <span className="truncate max-w-[200px]">{scorePredictor.topicName}</span>
            <span className="font-mono font-bold text-primary">{scorePredictor.topicMasteryPercentage}%</span>
          </div>
          <Progress value={scorePredictor.topicMasteryPercentage} className="h-1.5 rounded-full" />
        </div>

        {/* Qasos savoli bildirishnomasi (Open Loop) */}
        {revengeQueueCount > 0 && !isCurrentRevenge && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-2 flex items-center justify-center gap-1.5 py-1 px-2.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-[11px] font-bold text-amber-600 dark:text-amber-400"
          >
            <Hourglass className="size-3 text-amber-500 animate-spin" />
            <span>{revengeQueueCount} ta Qasos savoli navbatda ({nextRevengeDistance} qadam qoldi)</span>
          </motion.div>
        )}
      </header>

      {/* ─── B. SAVOL VA VARIANTLAR KARTASI ─── */}
      <main className="flex-1 flex flex-col justify-center my-auto space-y-4">
        {/* Qasos Savoli Olovli Banneri */}
        {isCurrentRevenge && (
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="rounded-2xl p-3 bg-gradient-to-r from-rose-500/20 via-amber-500/20 to-rose-500/20 border-2 border-amber-500/50 shadow-md text-center space-y-0.5"
          >
            <div className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-wider text-amber-500">
              <Flame className="size-4 fill-current text-amber-500 animate-bounce" />
              QASOS SAVOLI (2x Ball & XP)
            </div>
            <p className="text-[11px] font-semibold text-foreground/80">
              Boyagi xatoyingizni ildizi bilan yo&apos;q qiling!
            </p>
          </motion.div>
        )}

        {/* Savol Matni */}
        <AnimatePresence mode="wait">
          {currentQuestion && (
            <motion.div
              key={currentQuestion.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              className="space-y-4"
            >
              <div className="rounded-3xl border border-border/80 bg-card p-5 sm:p-6 shadow-sm">
                <div
                  className="text-base sm:text-lg font-bold text-foreground leading-relaxed prose dark:prose-invert max-w-none [&_p]:my-0"
                  dangerouslySetInnerHTML={{ __html: currentQuestion.body }}
                />
              </div>

              {/* Variantlar Ro'yxati (A, B, C, D) */}
              <div className="grid grid-cols-1 gap-2.5">
                {currentQuestion.options.map((opt, idx) => {
                  const isSelected = selectedOptionId === opt.id;
                  const isCorrect = opt.id === currentQuestion.correctOptionId;
                  const showResult = feedbackStatus !== 'idle';

                  let btnStyle = 'border-border/70 bg-card hover:border-primary/50 hover:bg-muted/40 text-foreground';
                  if (showResult) {
                    if (isCorrect) {
                      btnStyle = 'border-emerald-500 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold shadow-md shadow-emerald-500/20 ring-1 ring-emerald-500';
                    } else if (isSelected && !isCorrect) {
                      btnStyle = 'border-rose-500 bg-rose-500/15 text-rose-600 dark:text-rose-400 font-bold animate-shake ring-1 ring-rose-500';
                    } else {
                      btnStyle = 'border-border/40 opacity-50 bg-muted/20 text-muted-foreground';
                    }
                  }

                  return (
                    <motion.button
                      key={opt.id}
                      type="button"
                      disabled={isVerifying || feedbackStatus !== 'idle'}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => selectOption(opt.id)}
                      className={cn(
                        'w-full p-4 rounded-2xl border text-left transition-all duration-150 flex items-center justify-between gap-3 text-sm sm:text-base cursor-pointer select-none',
                        btnStyle
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={cn(
                          'size-7 shrink-0 rounded-xl flex items-center justify-center font-bold text-xs border transition-colors',
                          showResult && isCorrect
                            ? 'bg-emerald-500 text-white border-emerald-500'
                            : showResult && isSelected && !isCorrect
                            ? 'bg-rose-500 text-white border-rose-500'
                            : 'bg-muted/60 text-muted-foreground border-border/80'
                        )}>
                          {OPTION_LABELS[idx] || (idx + 1)}
                        </span>
                        <span
                          className="leading-snug break-words"
                          dangerouslySetInnerHTML={{ __html: opt.text }}
                        />
                      </div>

                      {/* Icon */}
                      {showResult && isCorrect && (
                        <CheckCircle2 className="size-5 text-emerald-500 shrink-0" />
                      )}
                      {showResult && isSelected && !isCorrect && (
                        <XCircle className="size-5 text-rose-500 shrink-0" />
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* ─── C. 10s AI MENTOR LAYFXAK KARTASI (Bottom Sheet / Drawer) ─── */}
      <AnimatePresence>
        {isExplanationOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-50 p-4 sm:p-6 bg-gradient-to-t from-background via-background/95 to-transparent backdrop-blur-lg flex justify-center"
          >
            <div className="w-full max-w-xl rounded-3xl border-2 border-rose-500/40 bg-card p-5 shadow-2xl shadow-rose-950/20 space-y-4">
              {/* Sarlavha */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-rose-500 font-bold text-xs uppercase tracking-wider">
                  <Lightbulb className="size-4 animate-bounce" />
                  <span>AI Mentor Layfxaki (Aha! Moment)</span>
                </div>
                <Badge variant="outline" className="text-[10px] text-muted-foreground font-mono">
                  10s tahlil
                </Badge>
              </div>

              {/* Shimmer / Skeleton yoki Tayyor Layfxak */}
              {isExplainingLoading ? (
                <div className="space-y-2 py-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                    <Brain className="size-3.5 animate-spin text-primary" />
                    <span>AI Mentor xatoni tahlil qilmoqda...</span>
                  </div>
                  <Skeleton className="h-4 w-full rounded-lg" />
                  <Skeleton className="h-4 w-4/5 rounded-lg" />
                </div>
              ) : activeExplanation ? (
                <div className="space-y-2.5 text-xs sm:text-sm">
                  {/* Nega adashdingiz */}
                  <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300">
                    <p className="font-bold text-[11px] uppercase tracking-wider mb-0.5">❌ Nega adashdingiz:</p>
                    <p className="leading-relaxed">{activeExplanation.whyWrong}</p>
                  </div>

                  {/* Eslab qolish kodi */}
                  <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300">
                    <p className="font-bold text-[11px] uppercase tracking-wider mb-0.5">🧠 Eslab qolish kodi:</p>
                    <p className="font-semibold leading-relaxed">{activeExplanation.memoryHack}</p>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs space-y-1">
                  <p className="font-bold text-[11px] uppercase tracking-wider">💡 Eslatma:</p>
                  <p className="leading-relaxed">Savol javobini yaxshilab eslab qoling va qasos savolida to'g'ri variantni belgilang!</p>
                </div>
              )}

              {/* Tushundim tugmasi */}
              <Button
                disabled={isExplainingLoading}
                onClick={dismissExplanation}
                className="w-full rounded-2xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold text-xs sm:text-sm h-11 shadow-lg shadow-rose-600/20 gap-2 cursor-pointer"
              >
                <span>Tushundim, davom etamiz (+5 XP)</span>
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── D. LOSS AVERSION CHIQISH MODALI (Web & Telegram BackButton) ─── */}
      <AnimatePresence>
        {isLossAversionOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md rounded-3xl border border-rose-500/40 bg-card p-6 shadow-2xl text-center space-y-4"
            >
              <div className="mx-auto size-12 rounded-2xl bg-rose-500/15 text-rose-500 flex items-center justify-center">
                <ShieldAlert className="size-6" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-lg font-bold text-foreground">
                  To&apos;xtang! G&apos;alabangizni saqlab qoling
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Sizda <b className="text-amber-500">{revengeQueueCount} ta yopilmagan Qasos savoli</b> va <b className="text-primary">{combo.multiplier.toFixed(1)}x Combo bonusi</b> bor. Hozir chiqsangiz, +0.4 prognoz balli va tanga mukofotlarini yo&apos;qotasiz.
                </p>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <Button
                  onClick={cancelQuit}
                  className="w-full rounded-xl bg-primary text-primary-foreground font-bold text-xs h-10 shadow-md cursor-pointer"
                >
                  Davom etish (G&apos;alabani rasmiylashtirish)
                </Button>
                <Button
                  onClick={handleConfirmedExit}
                  variant="ghost"
                  className="w-full rounded-xl text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 cursor-pointer"
                >
                  Ha, chiqib ketish (Bonuslarni yo&apos;qotish)
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

