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
          colors: ['#4C806B', '#7659C7', '#7659C7', '#FFB82E'],
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
      <div className="absolute -inset-3 rounded-3xl bg-gradient-to-tr from-[#7659C7]/16 via-[#4C806B]/12 to-[#7659C7]/16 opacity-80 blur-2xl pointer-events-none" />

      {/* iOS 18 / iPadOS Floating Window Card */}
      <div className="relative overflow-hidden rounded-3xl border border-black/[0.08] bg-white/92 ios-glass p-5 sm:p-7 shadow-[0_24px_64px_-12px_rgba(0,0,0,0.10),0_4px_16px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.95)]">
        
        {/* Top Window Bar + Dynamic Island Live Activity Pill */}
        <div className="flex items-center justify-between pb-4 border-b border-black/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5">
              <span className="size-3 rounded-full bg-[#FF5F57] border border-black/10" />
              <span className="size-3 rounded-full bg-[#FEBC2E] border border-black/10" />
              <span className="size-3 rounded-full bg-[#28C840] border border-black/10" />
            </div>
            <span className="ml-1 text-xs font-bold tracking-tight text-[#080808]">
              {QUESTION.subject}
            </span>
            <span className="rounded-full bg-[#7659C7]/10 px-2.5 py-0.5 text-[12px] font-bold text-[#7659C7]">
              {QUESTION.examType}
            </span>
          </div>

          {/* Dynamic Island Timer Pill */}
          <div className="flex items-center gap-1.5 rounded-full bg-[#080808] px-3 py-1 text-white shadow-xs">
            <span className="size-1.5 rounded-full bg-[#4C806B] animate-pulse" />
            <Clock className="size-3 text-[#4C806B]" />
            <span className="font-mono text-[12px] font-semibold tracking-tight">00:35</span>
          </div>
        </div>

        {/* Apple Health-Style Live DTM Score Widget */}
        <div className="mt-4 flex items-center justify-between rounded-xl bg-[#F7F4EF] px-4 py-3 border border-black/[0.04]">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-md bg-gradient-to-b from-[#4C806B] to-[#3A6654] text-white shadow-xs">
              <TrendingUp className="size-4" />
            </div>
            <div>
              <span className="text-[12px] text-[#6B6577] font-medium block leading-none">
                Kutilayotgan DTM ball (namuna)
              </span>
              <strong className="font-mono text-base font-bold text-[#080808] tracking-tight">
                {hasAnswered && isCorrect ? '181.5' : '178.4'}{' '}
                <span className="text-[12px] font-normal text-[#8A8494]">/ 189.0</span>
              </strong>
            </div>
          </div>

          {hasAnswered && isCorrect ? (
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex items-center gap-1 font-bold text-white bg-[#4C806B] px-3 py-1 rounded-full text-[12px] shadow-[0_2px_8px_rgba(76,128,107,0.35)]"
            >
              <Zap className="size-3 fill-white" /> +{scoreIncrement} ball
            </motion.div>
          ) : (
            <span className="rounded-full bg-white px-3 py-1 text-[12px] font-semibold text-[#6B6577] shadow-2xs border border-black/[0.05]">
              Interaktiv sinov
            </span>
          )}
        </div>

        {/* Question Prompt */}
        <div className="mt-5">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-bold uppercase tracking-wider text-[#8A8494]">
              Savol 1 / 45 · Rasmiy format
            </span>
            <span className="text-[12px] font-semibold text-[#7659C7]">+3.1 ball</span>
          </div>
          <h3 className="mt-1.5 text-[15px] sm:text-[17px] font-bold leading-snug text-[#080808] tracking-[-0.01em]">
            {QUESTION.text}
          </h3>
        </div>

        {/* iOS Inset Grouped Option Rows */}
        <div className="mt-4 space-y-2">
          {QUESTION.options.map((option) => {
            const isSelected = selectedId === option.id;
            let containerStyles =
              'border-black/[0.07] bg-[#F7F4EF]/65 hover:bg-[#F7F4EF] text-[#080808]';
            let badgeStyles = 'bg-white text-[#080808] border-black/[0.08] shadow-2xs';

            if (hasAnswered) {
              if (option.isCorrect) {
                containerStyles =
                  'border-[#4C806B] bg-[#4C806B]/12 text-[#080808] ring-1 ring-[#4C806B]/50';
                badgeStyles = 'bg-[#4C806B] text-white border-transparent';
              } else if (isSelected && !option.isCorrect) {
                containerStyles =
                  'border-[#F0523D] bg-[#F0523D]/10 text-[#080808] ring-1 ring-[#F0523D]/40';
                badgeStyles = 'bg-[#F0523D] text-white border-transparent';
              } else {
                containerStyles = 'border-black/[0.04] bg-[#F7F4EF]/40 text-[#8A8494] opacity-60';
              }
            }

            return (
              <button
                key={option.id}
                type="button"
                disabled={hasAnswered}
                onClick={() => handleSelect(option)}
                className={`ios-spring group relative flex w-full items-center gap-3 rounded-xl border p-3 sm:p-3.5 text-left text-xs sm:text-[13.5px] font-semibold ${containerStyles} ${
                  !hasAnswered ? 'cursor-pointer' : 'cursor-default'
                }`}
              >
                <span
                  className={`flex size-7 shrink-0 items-center justify-center rounded-md border text-xs font-bold transition-all ${badgeStyles}`}
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
              className="mt-4 rounded-xl border border-[#7659C7]/20 bg-gradient-to-br from-[#7659C7]/[0.06] via-white to-[#7659C7]/[0.06] p-4 space-y-2.5 shadow-sm"
            >
              <div className="flex items-center justify-between flex-wrap gap-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-[#080808]">
                  <span className="flex size-6 items-center justify-center rounded-sm bg-gradient-to-b from-[#7659C7] to-[#7659C7] text-white">
                    <Sparkles className="size-3.5" />
                  </span>
                  <span>IlmIldizi Intelligence · AI Mentor</span>
                </div>
                <div className="flex items-center gap-1 rounded-full bg-[#7659C7]/10 px-2.5 py-0.5 text-[12px] font-semibold text-[#7659C7]">
                  <BookOpen className="size-3" />
                  <span>{QUESTION.explanation.citation}</span>
                </div>
              </div>

              <p className="text-xs leading-relaxed text-[#3D3846]">
                {isCorrect ? QUESTION.explanation.correct : QUESTION.explanation.incorrect}
              </p>

              <div className="flex items-center justify-between pt-2 border-t border-black/[0.06] text-xs">
                <button
                  type="button"
                  onClick={handleReset}
                  className="ios-spring inline-flex items-center gap-1.5 text-[#6B6577] hover:text-[#080808] font-semibold cursor-pointer"
                >
                  <RotateCcw className="size-3.5" /> Qaytadan yechish
                </button>

                <Link
                  href="/register"
                  className="ios-spring inline-flex items-center gap-1.5 rounded-full bg-[#7659C7] hover:bg-[#5E45A8] px-4 py-1.5 text-xs font-semibold text-white shadow-[0_4px_12px_rgba(118,89,199,0.3)]"
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
