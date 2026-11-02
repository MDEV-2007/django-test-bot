'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Zap, ArrowRight, Flame, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AutoplayTransitionBridgeProps {
  currentStageNumber: number;
  nextStageNumber: number;
  nextStageTitle: string;
  nextStageBenefit: string;
  comboMultiplier: number;
  secondsLeft: number;
  onSkip: () => void;
}

export default function AutoplayTransitionBridge({
  currentStageNumber,
  nextStageNumber,
  nextStageTitle,
  nextStageBenefit,
  comboMultiplier,
  secondsLeft,
  onSkip,
}: AutoplayTransitionBridgeProps) {
  const progressPercent = ((3 - secondsLeft) / 3) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -20 }}
      transition={{ duration: 0.3 }}
      className="relative w-full max-w-lg mx-auto overflow-hidden rounded-3xl border border-orange-500/30 bg-gradient-to-b from-zinc-900 via-zinc-950 to-black p-6 sm:p-8 shadow-2xl text-center"
    >
      {/* Orqa fon nur effekti */}
      <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 size-56 rounded-full bg-orange-500/20 blur-[80px]" />

      {/* Bosqich nishoni */}
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-400 text-xs font-black uppercase tracking-wider mb-4">
        <Sparkles className="size-3.5 animate-pulse" />
        <span>Avtopilot Ko'prigi ({secondsLeft}s)</span>
      </div>

      {/* Sarlavha */}
      <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
        🎉 {currentStageNumber}-Bosqich Muvaffaqiyatli Yakunlandi!
      </h3>

      {/* Combo badge */}
      <div className="my-4 inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-orange-500/20 to-rose-500/20 border border-orange-500/40 text-orange-300 font-extrabold text-sm sm:text-base shadow-lg">
        <Flame className="size-5 text-orange-400 fill-orange-400 animate-bounce" />
        <span>Sizning Combo Bonusingiz:</span>
        <span className="text-white bg-orange-500 px-2 py-0.5 rounded-lg font-black font-mono">
          {comboMultiplier.toFixed(1)}x
        </span>
      </div>

      {/* Izoh / Micro-copy */}
      <p className="text-sm text-zinc-300 leading-relaxed max-w-md mx-auto mb-6">
        {nextStageBenefit}
      </p>

      {/* To'luvchi taymer progress-bari */}
      <div className="w-full bg-zinc-800/80 h-2 rounded-full overflow-hidden mb-6 border border-white/5">
        <motion.div
          className="h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-full"
          initial={{ width: '0%' }}
          animate={{ width: `${progressPercent}%` }}
          transition={{ ease: 'linear', duration: 1 }}
        />
      </div>

      {/* Katta Avto-Start tugmasi */}
      <Button
        type="button"
        onClick={onSkip}
        className="w-full h-13 sm:h-14 rounded-2xl bg-gradient-to-r from-orange-500 via-rose-500 to-rose-600 hover:from-orange-400 hover:to-rose-500 text-white font-black text-sm sm:text-base shadow-xl shadow-rose-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
      >
        <Zap className="size-5 fill-current animate-pulse text-amber-300" />
        <span>
          {nextStageNumber}-Bosqichga O'tish ({secondsLeft}s)
        </span>
        <ArrowRight className="size-5 ml-1" />
      </Button>

      <p className="text-[11px] text-zinc-500 mt-3 font-medium">
        Uzluksiz fokus rejimi • Avtomatik keyingi bosqich ochiladi
      </p>
    </motion.div>
  );
}
