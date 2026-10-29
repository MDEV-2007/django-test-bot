'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import {
  CheckCircle2, XCircle, Clock, ArrowRight,
  RotateCcw, BookOpen, Bot, TrendingUp, Zap, Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface Option {
  id: string;
  label: string;
  text: string;
  isCorrect: boolean;
}

const QUESTION = {
  subject: "O'zbekiston Tarixi",
  examType: 'Milliy Sertifikat',
  difficulty: "O'rta",
  text: "Amir Temur markazlashgan davlat tuzish jarayonida qaysi shaharni poytaxt etib belgilagan va bu voqea qaysi yili yuz bergan?",
  options: [
    { id: 'A', label: 'A', text: 'Buxoro — 1365-yil (Loy jangi davri)', isCorrect: false },
    { id: 'B', label: 'B', text: 'Samarqand — 1370-yil (Balx qurultoyi)', isCorrect: true },
    { id: 'C', label: 'C', text: 'Kesh (Shahrisabz) — 1380-yil', isCorrect: false },
    { id: 'D', label: 'D', text: 'Hirot — 1405-yil (Mironshoh davri)', isCorrect: false },
  ] as Option[],
  explanation: {
    correct: "To'g'ri javob! 1370-yilda Balxdagi qurultoyda Amir Temur Movarounnahrning oliy hukmdori deb e'lon qilindi va Samarqandni saltanat poytaxtiga aylantirdi.",
    incorrect: "Diqqat qiling: 1365-yilda Ilyosxo'jaga qarshi mashhur 'Loy jangi' bo'lgan. Poytaxt esa 1370-yil Samarqand etib belgilangan.",
    citation: "7-sinf O'zbekiston tarixi, 84-bet (3-paragraf)",
  },
};

export default function HeroInteractiveQuiz() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [scoreIncrement, setScoreIncrement] = useState<number>(0);

  const selectedOption = QUESTION.options.find((o) => o.id === selectedId);
  const isCorrect = selectedOption?.isCorrect ?? false;

  const handleSelect = (option: Option) => {
    if (hasAnswered) return;
    setSelectedId(option.id);
    setHasAnswered(true);

    if (option.isCorrect) {
      setScoreIncrement(3.1);
      try {
        confetti({
          particleCount: 45,
          spread: 65,
          origin: { y: 0.6 },
          colors: ['#34C759', '#007AFF', '#5856D6', '#FF9500'],
        });
      } catch {
        // ignore
      }
    } else {
      setScoreIncrement(0);
    }
  };

  const handleReset = () => {
    setSelectedId(null);
    setHasAnswered(false);
    setScoreIncrement(0);
  };

  return (
    <div className="relative mx-auto w-full max-w-xl lg:max-w-none">
      {/* Soft Apple Intelligence Ambient Aura */}
      <div className="absolute -inset-3 rounded-[40px] bg-gradient-to-tr from-[#007AFF]/16 via-[#34C759]/12 to-[#5856D6]/16 opacity-80 blur-2xl pointer-events-none" />

      {/* iOS 18 / iPadOS Floating Window Card */}
      <div className="relative overflow-hidden rounded-[32px] border border-black/[0.08] bg-white/92 ios-glass p-5 sm:p-7 shadow-[0_24px_64px_-12px_rgba(0,0,0,0.10),0_4px_16px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.95)]">
        
        {/* Top Window Bar + Dynamic Island Live Activity Pill */}
        <div className="flex items-center justify-between pb-4 border-b border-black/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5">
              <span className="size-3 rounded-full bg-[#FF5F57] border border-black/10" />
              <span className="size-3 rounded-full bg-[#FEBC2E] border border-black/10" />
              <span className="size-3 rounded-full bg-[#28C840] border border-black/10" />
            </div>
            <span className="ml-1 text-xs font-bold tracking-tight text-[#1C1C1E]">
              {QUESTION.subject}
            </span>
            <span className="rounded-full bg-[#007AFF]/10 px-2.5 py-0.5 text-[10px] font-bold text-[#007AFF]">
              {QUESTION.examType}
            </span>
          </div>

          {/* Dynamic Island Timer Pill */}
          <div className="flex items-center gap-1.5 rounded-full bg-[#1C1C1E] px-3 py-1 text-white shadow-xs">
            <span className="size-1.5 rounded-full bg-[#30D158] animate-pulse" />
            <Clock className="size-3 text-[#30D158]" />
            <span className="font-mono text-[11px] font-semibold tracking-tight">00:35</span>
          </div>
        </div>

        {/* Apple Health-Style Live DTM Score Widget */}
        <div className="mt-4 flex items-center justify-between rounded-[18px] bg-[#F2F2F7] px-4 py-3 border border-black/[0.04]">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-[10px] bg-gradient-to-b from-[#34C759] to-[#28A745] text-white shadow-xs">
              <TrendingUp className="size-4" />
            </div>
            <div>
              <span className="text-[11px] text-[#6C6C70] font-medium block leading-none">
                Kutilayotgan DTM ball
              </span>
              <strong className="font-mono text-base font-extrabold text-[#1C1C1E] tracking-tight">
                {hasAnswered && isCorrect ? '181.5' : '178.4'}{' '}
                <span className="text-[11px] font-normal text-[#8E8E93]">/ 189.0</span>
              </strong>
            </div>
          </div>

          {hasAnswered && isCorrect ? (
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex items-center gap-1 font-bold text-white bg-[#34C759] px-3 py-1 rounded-full text-[11px] shadow-[0_2px_8px_rgba(52,199,89,0.35)]"
            >
              <Zap className="size-3 fill-white" /> +{scoreIncrement} ball
            </motion.div>
          ) : (
            <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-[#6C6C70] shadow-2xs border border-black/[0.05]">
              Interaktiv sinov
            </span>
          )}
        </div>

        {/* Question Prompt */}
        <div className="mt-5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#8E8E93]">
              Savol 1 / 45 · Rasmiy format
            </span>
            <span className="text-[11px] font-semibold text-[#007AFF]">+3.1 ball</span>
          </div>
          <h3 className="mt-1.5 text-[15px] sm:text-[17px] font-bold leading-snug text-[#1C1C1E] tracking-[-0.01em]">
            {QUESTION.text}
          </h3>
        </div>

        {/* iOS Inset Grouped Option Rows */}
        <div className="mt-4 space-y-2">
          {QUESTION.options.map((option) => {
            const isSelected = selectedId === option.id;
            let containerStyles =
              'border-black/[0.07] bg-[#F2F2F7]/65 hover:bg-[#F2F2F7] text-[#1C1C1E]';
            let badgeStyles = 'bg-white text-[#1C1C1E] border-black/[0.08] shadow-2xs';

            if (hasAnswered) {
              if (option.isCorrect) {
                containerStyles =
                  'border-[#34C759] bg-[#34C759]/12 text-[#1C1C1E] ring-1 ring-[#34C759]/50';
                badgeStyles = 'bg-[#34C759] text-white border-transparent';
              } else if (isSelected && !option.isCorrect) {
                containerStyles =
                  'border-[#FF3B30] bg-[#FF3B30]/10 text-[#1C1C1E] ring-1 ring-[#FF3B30]/40';
                badgeStyles = 'bg-[#FF3B30] text-white border-transparent';
              } else {
                containerStyles = 'border-black/[0.04] bg-[#F2F2F7]/40 text-[#8E8E93] opacity-60';
              }
            }

            return (
              <button
                key={option.id}
                type="button"
                disabled={hasAnswered}
                onClick={() => handleSelect(option)}
                className={`ios-spring group relative flex w-full items-center gap-3 rounded-[18px] border p-3 sm:p-3.5 text-left text-xs sm:text-[13.5px] font-semibold ${containerStyles} ${
                  !hasAnswered ? 'cursor-pointer' : 'cursor-default'
                }`}
              >
                <span
                  className={`flex size-7 shrink-0 items-center justify-center rounded-[10px] border text-xs font-bold transition-all ${badgeStyles}`}
                >
                  {hasAnswered && option.isCorrect ? (
                    <CheckCircle2 className="size-4" />
                  ) : hasAnswered && isSelected && !option.isCorrect ? (
                    <XCircle className="size-4" />
                  ) : (
                    option.label
                  )}
                </span>
                <span className="flex-1 leading-snug">{option.text}</span>
              </button>
            );
          })}
        </div>

        {/* Apple Intelligence / Siri Style AI Mentor Sheet */}
        <AnimatePresence>
          {hasAnswered && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="mt-4 rounded-[22px] border border-[#007AFF]/20 bg-gradient-to-br from-[#007AFF]/[0.06] via-white to-[#5856D6]/[0.06] p-4 space-y-2.5 shadow-sm"
            >
              <div className="flex items-center justify-between flex-wrap gap-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-[#1C1C1E]">
                  <span className="flex size-6 items-center justify-center rounded-[8px] bg-gradient-to-b from-[#5856D6] to-[#007AFF] text-white">
                    <Sparkles className="size-3.5" />
                  </span>
                  <span>Apple Intelligence · AI Mentor</span>
                </div>
                <div className="flex items-center gap-1 rounded-full bg-[#007AFF]/10 px-2.5 py-0.5 text-[10px] font-semibold text-[#007AFF]">
                  <BookOpen className="size-3" />
                  <span>{QUESTION.explanation.citation}</span>
                </div>
              </div>

              <p className="text-xs leading-relaxed text-[#3A3A3C]">
                {isCorrect ? QUESTION.explanation.correct : QUESTION.explanation.incorrect}
              </p>

              <div className="flex items-center justify-between pt-2 border-t border-black/[0.06] text-xs">
                <button
                  type="button"
                  onClick={handleReset}
                  className="ios-spring inline-flex items-center gap-1.5 text-[#6C6C70] hover:text-[#1C1C1E] font-semibold cursor-pointer"
                >
                  <RotateCcw className="size-3.5" /> Qaytadan yechish
                </button>

                <Link
                  href="/register"
                  className="ios-spring inline-flex items-center gap-1.5 rounded-full bg-[#007AFF] hover:bg-[#0062CC] px-4 py-1.5 text-xs font-semibold text-white shadow-[0_4px_12px_rgba(0,122,255,0.3)]"
                >
                  <span>To&apos;liq testni yechish</span>
                  <ArrowRight className="size-3.5" />
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
