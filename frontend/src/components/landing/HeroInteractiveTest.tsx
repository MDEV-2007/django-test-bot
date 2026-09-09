'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, XCircle, Sparkles, Clock, ArrowRight, RotateCcw, BrainCircuit, Award } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Button } from '@/components/ui/button';

interface Option {
  id: string;
  label: string;
  text: string;
  isCorrect: boolean;
}

const QUESTION = {
  subject: 'Tarix · Milliy sertifikat',
  time: '00:45',
  text: "Amir Temur markazlashgan davlat tuzish jarayonida qaysi shaharni poytaxt etib belgilagan va bu voqea qaysi yili yuz bergan?",
  options: [
    { id: 'A', label: 'A', text: 'Buxoro — 1365-yil', isCorrect: false },
    { id: 'B', label: 'B', text: 'Samarqand — 1370-yil', isCorrect: true },
    { id: 'C', label: 'C', text: 'Kesh (Shahrisabz) — 1380-yil', isCorrect: false },
    { id: 'D', label: 'D', text: 'Hirot — 1405-yil', isCorrect: false },
  ] as Option[],
  explanation: {
    correct: "Barakalla! 1370-yilda Balxdagi qurultoyda Amir Temur Movarounnahrning yagona hukmdori deb e'lon qilindi va Samarqandni poytaxt etib tanladi.",
    incorrect: "E'tibor bering: To'g'ri javob — Samarqand (1370-yil). Buxoro esa keyinchalik Shayboniylar davrida poytaxt bo'lgan. Zaif nuqta aniqlandi!",
  },
};

export default function HeroInteractiveTest() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);

  const selectedOption = QUESTION.options.find((o) => o.id === selectedId);
  const isCorrect = selectedOption?.isCorrect ?? false;

  const handleSelect = (option: Option) => {
    if (hasAnswered) return;
    setSelectedId(option.id);
    setHasAnswered(true);

    if (option.isCorrect) {
      try {
        confetti({
          particleCount: 40,
          spread: 65,
          origin: { y: 0.7 },
          colors: ['#059669', '#10b981', '#f59e0b', '#3b82f6'],
        });
      } catch {
        // no-op
      }
    }
  };

  const handleReset = () => {
    setSelectedId(null);
    setHasAnswered(false);
  };

  return (
    <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
      {/* Yumshoq tashqi nur */}
      <div className="absolute -inset-2 rounded-3xl bg-gradient-to-r from-emerald-200/40 via-teal-100/30 to-sky-100/40 opacity-70 blur-2xl pointer-events-none" />

      {/* Asosiy simulyator oynasi (Oq qog'ozli test varaqasi kabi toza) */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-7 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
        {/* Darcha boshqaruvi */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 mr-2">
              <span className="size-2.5 rounded-full bg-rose-400" />
              <span className="size-2.5 rounded-full bg-amber-400" />
              <span className="size-2.5 rounded-full bg-emerald-400" />
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-700 border border-slate-200">
              {QUESTION.subject}
            </span>
          </div>

          <div className="flex items-center gap-1.5 font-mono text-slate-500 text-xs">
            <Clock className="size-3.5 text-emerald-600" />
            <span>{QUESTION.time}</span>
          </div>
        </div>

        {/* Savol matni */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>Savol #1 (Mock Test)</span>
            <span className="font-mono text-emerald-600 font-semibold">+1.5 ball</span>
          </div>
          <p className="mt-2 text-sm sm:text-base font-semibold leading-relaxed text-slate-900">
            {QUESTION.text}
          </p>
        </div>

        {/* Variantlar ro'yxati */}
        <div className="mt-5 space-y-2.5">
          {QUESTION.options.map((option) => {
            const isSelected = selectedId === option.id;
            let btnStyle = 'border-slate-200 bg-slate-50/70 hover:bg-slate-100 hover:border-slate-300 text-slate-800';

            if (hasAnswered) {
              if (option.isCorrect) {
                btnStyle = 'border-emerald-500 bg-emerald-50/90 text-emerald-900 ring-1 ring-emerald-500/40';
              } else if (isSelected && !option.isCorrect) {
                btnStyle = 'border-rose-500 bg-rose-50/90 text-rose-900 ring-1 ring-rose-500/40';
              } else {
                btnStyle = 'opacity-40 border-slate-100 bg-slate-50/30 text-slate-400';
              }
            }

            return (
              <button
                key={option.id}
                onClick={() => handleSelect(option)}
                disabled={hasAnswered}
                className={`group relative flex w-full items-center justify-between rounded-xl border p-3 text-left text-xs sm:text-sm font-medium transition-all duration-200 ${btnStyle}`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`flex size-6 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-bold transition-colors ${
                      isSelected && option.isCorrect
                        ? 'bg-emerald-600 text-white'
                        : isSelected && !option.isCorrect
                        ? 'bg-rose-600 text-white'
                        : 'bg-white border border-slate-200 text-slate-700 shadow-xs group-hover:border-slate-300'
                    }`}
                  >
                    {option.label}
                  </span>
                  <span className="leading-snug">{option.text}</span>
                </div>

                {hasAnswered && (
                  <div>
                    {option.isCorrect && (
                      <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                    )}
                    {isSelected && !option.isCorrect && (
                      <XCircle className="size-4 shrink-0 text-rose-500" />
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* AI Mentor izohi */}
        <AnimatePresence>
          {hasAnswered && (
            <motion.div
              initial={{ opacity: 0, y: 8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: 4, height: 0 }}
              className="mt-4 overflow-hidden rounded-xl border border-emerald-200 bg-emerald-50/80 p-3.5"
            >
              <div className="flex items-start gap-3">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs">
                  <BrainCircuit className="size-4" />
                </div>
                <div className="flex-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-emerald-800">
                      AI Mentor tushuntirishi
                    </span>
                    {isCorrect ? (
                      <span className="flex items-center gap-1 rounded-full bg-emerald-200/60 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-800">
                        <Award className="size-3" /> +15 XP
                      </span>
                    ) : (
                      <span className="rounded-full bg-rose-200/60 px-2 py-0.5 font-mono text-[10px] font-bold text-rose-800">
                        Zaif nuqta qayd etildi
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 leading-relaxed text-slate-700">
                    {isCorrect ? QUESTION.explanation.correct : QUESTION.explanation.incorrect}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between gap-2 border-t border-emerald-200/60 pt-2.5">
                <button
                  onClick={handleReset}
                  className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800 transition-colors"
                >
                  <RotateCcw className="size-3" /> Qayta yechish
                </button>
                <Button asChild size="sm" className="h-7 text-xs px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-full shadow-xs">
                  <Link href="/register">
                    To&apos;liq testga o&apos;tish <ArrowRight className="size-3 ml-1" />
                  </Link>
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!hasAnswered && (
          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <Sparkles className="size-3 text-emerald-600" /> Variantni tanlang va tekshiring
            </span>
            <span className="font-mono text-slate-400">Interaktiv namuna</span>
          </div>
        )}
      </div>
    </div>
  );
}
