'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Flame, Check } from 'lucide-react';

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
      className="ps-card relative mx-auto w-full max-w-lg overflow-hidden !rounded-[36px] p-6 text-center sm:p-8"
    >
      <span aria-hidden className="pointer-events-none absolute -left-12 -top-12 size-40 rounded-full bg-[var(--ps-green)] opacity-15" />
      <span aria-hidden className="pointer-events-none absolute -bottom-14 -right-10 size-40 rounded-full bg-[var(--ps-orange)] opacity-20" />

      <span className="relative mx-auto inline-flex size-16 items-center justify-center rounded-full bg-[var(--ps-green)] text-white">
        <Check className="size-8 stroke-[3]" />
      </span>

      <h3 className="ps-display relative mt-4 text-[26px] sm:text-[32px]">
        {currentStageNumber}-bosqich yakunlandi!
      </h3>

      <div className="relative mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--ps-orange)] py-1.5 pl-2 pr-4 text-[13.5px] font-bold text-[#080808]">
        <span className="inline-flex size-7 items-center justify-center rounded-full bg-[#FFFCF7]">
          <Flame className="size-4 fill-[var(--ps-coral)] text-[var(--ps-coral)]" />
        </span>
        Combo bonusingiz: {comboMultiplier.toFixed(1)}x
      </div>

      <p className="relative mx-auto mt-4 max-w-md text-[14px] leading-relaxed text-[var(--text-secondary)]">{nextStageBenefit}</p>

      <div className="relative mt-6 h-2.5 w-full overflow-hidden rounded-full bg-[var(--ds-track)]">
        <motion.div
          className="h-full rounded-full bg-[var(--ps-purple)]"
          initial={{ width: '0%' }}
          animate={{ width: `${progressPercent}%` }}
          transition={{ ease: 'linear', duration: 1 }}
        />
      </div>

      <button type="button" onClick={onSkip} className="ps-btn ps-btn-ink relative mt-5 w-full !min-h-14">
        {nextStageNumber}-bosqichga o&apos;tish · {secondsLeft}s
        <span className="ps-btn-arrow"><ArrowRight className="size-4" /></span>
      </button>

      <p className="relative mt-3 text-[12px] font-semibold text-[var(--text-muted)]">
        Uzluksiz fokus rejimi · keyingi bosqich avtomatik ochiladi
      </p>
    </motion.div>
  );
}
