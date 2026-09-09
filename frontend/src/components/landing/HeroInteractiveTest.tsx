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
          colors: ['#10b981', '#14b8a6', '#f59e0b', '#ffffff'],
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
      <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-emerald-500/20 via-teal-500/10 to-indigo-500/15 opacity-60 blur-xl pointer-events-none" />

      {/* Asosiy simulyator oynasi */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-white/[0.12] bg-[#0c0e14]/90 p-5 sm:p-7 shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
        {/* Darcha boshqaruvi (macOS uslubidagi nuqtalar + Fan yorlig'i) */}
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 mr-2">
              <span className="size-2.5 rounded-full bg-rose-500/70" />
              <span className="size-2.5 rounded-full bg-amber-500/70" />
              <span className="size-2.5 rounded-full bg-emerald-500/70" />
            </div>
            <span className="rounded-full bg-white/[0.06] px-2.5 py-0.5 text-[11px] font-medium text-emerald-300 border border-emerald-500/20">
              {QUESTION.subject}
            </span>
          </div>

          <div className="flex items-center gap-1.5 font-mono text-zinc-400 text-xs">
            <Clock className="size-3.5 text-emerald-400" />
            <span>{QUESTION.time}</span>
          </div>
        </div>

        {/* Savol matni */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-[11px] text-zinc-400">
            <span>Savol #1 (Mock Test)</span>
            <span className="font-mono text-emerald-400 font-semibold">+1.5 ball</span>
          </div>
          <p className="mt-2 text-sm sm:text-base font-semibold leading-relaxed text-white">
            {QUESTION.text}
          </p>
        </div>

        {/* Variantlar ro'yxati */}
        <div className="mt-5 space-y-2.5">
          {QUESTION.options.map((option) => {
            const isSelected = selectedId === option.id;
            let btnStyle = 'border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.07] hover:border-white/[0.16] text-zinc-200';

            if (hasAnswered) {
              if (option.isCorrect) {
                btnStyle = 'border-emerald-500/70 bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30';
              } else if (isSelected && !option.isCorrect) {
                btnStyle = 'border-rose-500/70 bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30';
              } else {
                btnStyle = 'opacity-40 border-white/[0.04] bg-white/[0.01] text-zinc-400';
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
                        ? 'bg-emerald-500 text-black'
                        : isSelected && !option.isCorrect
                        ? 'bg-rose-500 text-white'
                        : 'bg-white/[0.08] text-zinc-400 group-hover:text-white'
                    }`}
                  >
                    {option.label}
                  </span>
                  <span className="leading-snug">{option.text}</span>
                </div>

                {hasAnswered && (
                  <div>
                    {option.isCorrect && (
                      <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
                    )}
                    {isSelected && !option.isCorrect && (
                      <XCircle className="size-4 shrink-0 text-rose-400" />
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* AI Mentor izohi va harakat */}
        <AnimatePresence>
          {hasAnswered && (
            <motion.div
              initial={{ opacity: 0, y: 8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: 4, height: 0 }}
              className="mt-4 overflow-hidden rounded-xl border border-emerald-500/30 bg-emerald-500/[0.08] p-3.5 backdrop-blur-xl"
            >
              <div className="flex items-start gap-3">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500 text-black shadow-md">
                  <BrainCircuit className="size-4" />
                </div>
                <div className="flex-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-emerald-300">
                      AI Mentor tushuntirishi
                    </span>
                    {isCorrect ? (
                      <span className="flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-300">
                        <Award className="size-3" /> +15 XP
                      </span>
                    ) : (
                      <span className="rounded-full bg-rose-500/20 px-2 py-0.5 font-mono text-[10px] font-bold text-rose-300">
                        Zaif nuqta qayd etildi
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 leading-relaxed text-zinc-300">
                    {isCorrect ? QUESTION.explanation.correct : QUESTION.explanation.incorrect}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/[0.08] pt-2.5">
                <button
                  onClick={handleReset}
                  className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white transition-colors"
                >
                  <RotateCcw className="size-3" /> Qayta yechish
                </button>
                <Button asChild size="sm" className="h-7 text-xs px-3 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-full shadow">
                  <Link href="/register">
                    To&apos;liq testga o&apos;tish <ArrowRight className="size-3 ml-1" />
                  </Link>
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!hasAnswered && (
          <div className="mt-3 flex items-center justify-between text-[11px] text-zinc-400">
            <span className="flex items-center gap-1">
              <Sparkles className="size-3 text-emerald-400" /> Javobni tanlang va tekshirib ko&apos;ring
            </span>
            <span className="font-mono text-zinc-400">Interaktiv namuna</span>
          </div>
        )}
      </div>
    </div>
  );
}
