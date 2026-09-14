'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import {
  CheckCircle2, XCircle, Sparkles, Clock, ArrowRight,
  RotateCcw, BookOpen, Bot, TrendingUp, Zap
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Button } from '@/components/ui/button';

interface Option {
  id: string;
  label: string;
  text: string;
  isCorrect: boolean;
}

const QUESTION = {
  subject: 'O\'zbekiston Tarixi',
  examType: 'Milliy Sertifikat',
  difficulty: 'O\'rta',
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
          particleCount: 50,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#059669', '#10b981', '#3b82f6', '#f59e0b'],
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
      {/* Ambient Glow */}
      <div className="absolute -inset-2.5 rounded-[32px] bg-gradient-to-r from-emerald-500/20 via-teal-500/15 to-indigo-500/20 opacity-70 blur-2xl pointer-events-none" />

      {/* Main Interactive Card */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
        
        {/* Card Header Bar */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <span className="flex size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              {QUESTION.subject}
            </span>
            <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200/60">
              {QUESTION.examType}
            </span>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs font-semibold text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/60">
            <Clock className="size-3.5 text-emerald-600" />
            <span>00:35</span>
          </div>
        </div>

        {/* Live Score Bar (Dynamic Increment) */}
        <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50/90 p-3 border border-slate-100 text-xs">
          <div className="flex items-center gap-2">
            <TrendingUp className="size-4 text-emerald-600" />
            <span className="text-slate-600 font-medium">Kutilayotgan DTM ball:</span>
            <strong className="font-mono text-slate-900 font-bold">
              {hasAnswered && isCorrect ? '181.5' : '178.4'}
            </strong>
          </div>

          {hasAnswered && isCorrect && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex items-center gap-1 font-bold text-emerald-600 bg-emerald-100/80 px-2 py-0.5 rounded-md text-[11px]"
            >
              <Zap className="size-3" /> +{scoreIncrement} ball
            </motion.div>
          )}

          {!hasAnswered && (
            <span className="text-[11px] text-slate-400">Variantni tanlang</span>
          )}
        </div>

        {/* Question Body */}
        <div className="mt-5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Savol 1 / 45</span>
          <h3 className="mt-1 text-base sm:text-lg font-bold leading-snug text-slate-900">
            {QUESTION.text}
          </h3>
        </div>

        {/* Options List */}
        <div className="mt-5 space-y-2.5">
          {QUESTION.options.map((option) => {
            const isSelected = selectedId === option.id;
            let containerStyles = 'border-slate-200 hover:border-slate-300 bg-white text-slate-800';
            let badgeStyles = 'border-slate-200 bg-slate-100 text-slate-700';

            if (hasAnswered) {
              if (option.isCorrect) {
                containerStyles = 'border-emerald-500 bg-emerald-50/70 text-emerald-950 ring-1 ring-emerald-500';
                badgeStyles = 'border-emerald-500 bg-emerald-500 text-white';
              } else if (isSelected && !option.isCorrect) {
                containerStyles = 'border-rose-400 bg-rose-50/70 text-rose-950 ring-1 ring-rose-400';
                badgeStyles = 'border-rose-400 bg-rose-500 text-white';
              } else {
                containerStyles = 'border-slate-100 bg-slate-50/40 text-slate-400 opacity-60';
              }
            }

            return (
              <button
                key={option.id}
                type="button"
                disabled={hasAnswered}
                onClick={() => handleSelect(option)}
                className={`group relative flex w-full items-center gap-3 rounded-2xl border p-3 sm:p-3.5 text-left text-xs sm:text-sm font-medium transition-all ${containerStyles} ${!hasAnswered ? 'hover:-translate-y-0.5 hover:shadow-sm cursor-pointer' : 'cursor-default'}`}
              >
                <span className={`flex size-7 shrink-0 items-center justify-center rounded-xl border text-xs font-bold transition-all ${badgeStyles}`}>
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

        {/* AI Mentor Explanation Box */}
        <AnimatePresence>
          {hasAnswered && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-5 rounded-2xl border border-emerald-500/30 bg-emerald-50/50 p-4 space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                  <Bot className="size-4 text-emerald-600" />
                  <span>AI Mentor Tahlili</span>
                </div>
                <div className="flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                  <BookOpen className="size-3.5" />
                  <span>{QUESTION.explanation.citation}</span>
                </div>
              </div>

              <p className="text-xs leading-relaxed text-slate-700">
                {isCorrect ? QUESTION.explanation.correct : QUESTION.explanation.incorrect}
              </p>

              <div className="flex items-center justify-between pt-1 border-t border-emerald-200/60 text-xs">
                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-900 font-semibold cursor-pointer"
                >
                  <RotateCcw className="size-3.5" /> Qaytadan yechish
                </button>

                <Button
                  size="sm"
                  asChild
                  className="rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                >
                  <Link href="/register">
                    To&apos;liq testni yechish <ArrowRight className="size-3.5 ml-1" />
                  </Link>
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
