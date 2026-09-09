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
    incorrect: "E'tibor bering: To'g'ri javob — Samarqand (1370-yil). Buxoro esa keyinchalik Shayboniylar davrida poytaxt bo'lgan. Zaif nuqta belgilandi!",
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
          particleCount: 45,
          spread: 60,
          origin: { y: 0.7 },
          colors: ['#2fb3a3', '#5cc4b6', '#f0b45c', '#ffffff'],
        });
      } catch {
        // no-op if canvas is not supported
      }
    }
  };

  const handleReset = () => {
    setSelectedId(null);
    setHasAnswered(false);
  };

  return (
    <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
      {/* Tashqi porlash (ambient glow) */}
      <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-[var(--accent)]/30 via-emerald-500/15 to-[var(--tone-premium)]/20 opacity-70 blur-xl transition-all duration-500" />

      {/* Asosiy simulyator oynasi */}
      <div className="relative overflow-hidden rounded-2xl border border-[var(--border-card)] bg-[var(--surface-card-soft)]/90 p-5 shadow-2xl backdrop-blur-xl sm:p-6">
        {/* Yuqori panel: Fan, taymer va jonli indikator */}
        <div className="flex items-center justify-between border-b border-[var(--border-card)] pb-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="flex size-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="rounded-md bg-[var(--surface-card-medium)] px-2.5 py-1 font-medium text-[var(--accent-text)] border border-[var(--accent-border)]/40">
              {QUESTION.subject}
            </span>
          </div>
          <div className="flex items-center gap-1.5 font-mono text-[var(--text-secondary)]">
            <Clock className="size-3.5 text-[var(--accent-text)]" />
            <span>{QUESTION.time}</span>
          </div>
        </div>

        {/* Savol matni */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-[var(--text-faint)]">
            <span>Savol #1 (Mock Test)</span>
            <span className="font-mono text-emerald-400 font-semibold">+1.5 ball</span>
          </div>
          <p className="mt-2 text-sm font-semibold leading-relaxed text-foreground sm:text-base">
            {QUESTION.text}
          </p>
        </div>

        {/* Variantlar */}
        <div className="mt-5 space-y-2.5">
          {QUESTION.options.map((option) => {
            const isSelected = selectedId === option.id;
            let btnStyle = 'border-[var(--border-card)] bg-[var(--surface-card-medium)]/60 hover:bg-[var(--surface-card-medium)] text-foreground';

            if (hasAnswered) {
              if (option.isCorrect) {
                btnStyle = 'border-emerald-500/80 bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/40';
              } else if (isSelected && !option.isCorrect) {
                btnStyle = 'border-rose-500/80 bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/40';
              } else {
                btnStyle = 'opacity-45 border-[var(--border-card)] bg-[var(--surface-card-medium)]/30 text-[var(--text-muted)]';
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
                        : 'bg-[var(--surface-input)] text-[var(--text-secondary)] group-hover:text-foreground'
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

        {/* AI Mentor Izohi va natija paneli */}
        <AnimatePresence>
          {hasAnswered && (
            <motion.div
              initial={{ opacity: 0, y: 10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: 5, height: 0 }}
              className="mt-4 overflow-hidden rounded-xl border border-[var(--accent-border)]/50 bg-[var(--accent-soft)]/20 p-3.5 backdrop-blur-md"
            >
              <div className="flex items-start gap-3">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[var(--accent)] text-black">
                  <BrainCircuit className="size-4" />
                </div>
                <div className="flex-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[var(--accent-text)]">
                      AI Mentor tushuntirishi
                    </span>
                    {isCorrect ? (
                      <span className="flex items-center gap-1 rounded bg-emerald-500/20 px-1.5 py-0.5 font-mono text-[10px] font-bold text-emerald-400">
                        <Award className="size-3" /> +15 XP
                      </span>
                    ) : (
                      <span className="rounded bg-rose-500/20 px-1.5 py-0.5 font-mono text-[10px] font-bold text-rose-300">
                        Zaif mavzu qayd etildi
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 leading-relaxed text-[var(--text-secondary)]">
                    {isCorrect ? QUESTION.explanation.correct : QUESTION.explanation.incorrect}
                  </p>
                </div>
              </div>

              {/* Boshqaruv tugmalari */}
              <div className="mt-3 flex items-center justify-between gap-2 border-t border-[var(--border-card)]/50 pt-2.5">
                <button
                  onClick={handleReset}
                  className="flex items-center gap-1 text-[11px] text-[var(--text-muted)] hover:text-foreground transition-colors"
                >
                  <RotateCcw className="size-3" /> Qayta yechish
                </button>
                <Button asChild size="sm" className="h-7 text-xs px-3">
                  <Link href="/register">
                    To&apos;liq testga o&apos;tish <ArrowRight className="size-3 ml-1" />
                  </Link>
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pastki yordamchi izoh */}
        {!hasAnswered && (
          <div className="mt-3 flex items-center justify-between text-[11px] text-[var(--text-muted)]">
            <span className="flex items-center gap-1">
              <Sparkles className="size-3 text-[var(--accent-text)]" /> Javobni belgilang va AI Mentor tekshirsin
            </span>
            <span className="font-mono text-[var(--text-faint)]">Interaktiv demo</span>
          </div>
        )}
      </div>
    </div>
  );
}
