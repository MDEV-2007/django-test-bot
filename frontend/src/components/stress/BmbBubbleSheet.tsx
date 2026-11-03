'use client';

import React, { useState } from 'react';
import {
  FileSpreadsheet, AlertTriangle, CheckCircle2, QrCode,
  Sparkles, Check, Flame, ShieldAlert, ArrowDown, Info,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { stressAudio } from '@/lib/stressAudio';

type BmbBubbleSheetProps = {
  totalQuestions: number;
  currentQIdx: number;
  titulAnswers: Record<string, string>; // { "1": "A", "2": "C" }
  draftAnswers?: Record<number, string | null>; // { 1: "A", 2: "C" }
  onBubbleSelect: (qIdx: number, letter: string) => void;
  onJumpToQuestion?: (qIdx: number) => void;
  onSyncAllDrafts?: () => void;
  secondsLeft?: number | null;
  subjectName?: string;
  attemptId: number | string;
  isCompact?: boolean;
};

const BUBBLES = ['A', 'B', 'C', 'D'] as const;

export default function BmbBubbleSheet({
  totalQuestions,
  currentQIdx,
  titulAnswers,
  draftAnswers = {},
  onBubbleSelect,
  onJumpToQuestion,
  onSyncAllDrafts,
  secondsLeft,
  subjectName = 'Asosiy Blok',
  attemptId,
  isCompact = false,
}: BmbBubbleSheetProps) {
  const [isSyncing, setIsSyncing] = useState(false);

  const filledCount = Object.keys(titulAnswers).length;
  const isTimeCritical = secondsLeft !== null && secondsLeft !== undefined && secondsLeft <= 600; // <= 10 min
  const isTimePanic = secondsLeft !== null && secondsLeft !== undefined && secondsLeft <= 300; // <= 5 min

  function handleSelect(qIdx: number, letter: string) {
    stressAudio.playPencilSound();
    onBubbleSelect(qIdx, letter);
  }

  function handleBatchSync() {
    if (!onSyncAllDrafts) return;
    setIsSyncing(true);
    stressAudio.playPaperRustle();
    setTimeout(() => {
      onSyncAllDrafts();
      setIsSyncing(false);
      stressAudio.playPencilSound();
    }, 400);
  }

  // Count uncopied draft answers
  const uncopiedCount = Object.entries(draftAnswers).filter(([idxStr, letter]) => {
    if (!letter) return false;
    return !titulAnswers[idxStr];
  }).length;

  return (
    <div className={cn(
      "flex flex-col bg-[#fffef9] dark:bg-[#15171e] border-2 rounded-2xl shadow-xl transition-all duration-300 font-sans select-none overflow-hidden",
      isTimePanic ? "border-rose-600 shadow-rose-500/20 animate-pulse" :
      isTimeCritical ? "border-amber-500 shadow-amber-500/15" : "border-slate-300 dark:border-slate-700"
    )}>
      {/* BMB titul varaqasiga o'xshatilgan MASHQ nusxasi — davlat organi nomi bilan
          "rasmiy" ko'rinish berilmaydi. */}
      <div className="border-b-2 border-slate-300 dark:border-slate-700 p-3 sm:p-4 bg-[#f8f6ee] dark:bg-[#1a1c24] rounded-t-2xl">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              <span className="inline-block size-2 rounded-full bg-blue-600 animate-ping" />
              <p className="text-[10px] sm:text-[11px] font-black tracking-wider uppercase text-blue-900 dark:text-blue-400">
                BMB titul varaqasi namunasi · mashq
              </p>
            </div>
            <h3 className="text-sm sm:text-base font-extrabold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <span>JAVOBLAR VARAQASI</span>
              <Badge variant="outline" className="text-[10px] font-mono border-blue-600 text-blue-700 dark:text-blue-300">
                TITUL
              </Badge>
            </h3>
          </div>

          <div className="text-right font-mono text-[10px] text-slate-500 dark:text-slate-400">
            <p className="font-bold text-slate-800 dark:text-slate-200">ID: ABT-{attemptId}</p>
            <p className="hidden sm:block">VAR: #01-A</p>
          </div>
        </div>

        {/* Info Meta Strip */}
        <div className="mt-2.5 pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300">
          <span className="font-semibold truncate max-w-[150px]">{subjectName}</span>
          <span className="font-mono font-bold">
            To&apos;ldirildi: <strong className={cn(
              "text-xs",
              filledCount === totalQuestions ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
            )}>{filledCount}</strong> / {totalQuestions}
          </span>
        </div>
      </div>

      {/* Critical Countdown Alert when <= 10 min */}
      {isTimeCritical && (
        <div className={cn(
          "px-3 py-2 text-xs font-semibold flex items-center justify-between gap-2",
          isTimePanic ? "bg-rose-600 text-white animate-bounce" : "bg-amber-500 text-slate-950"
        )}>
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="size-4 shrink-0" />
            <span>
              {isTimePanic
                ? "🚨 DIQQAT: 5 daqiqa qoldi! Titulga ko'chirilmagan javoblar KUYADI!"
                : "⚠️ 10 daqiqa qoldi! Javoblarni Titulga zudlik bilan ko'chiring!"}
            </span>
          </div>
          {uncopiedCount > 0 && (
            <Badge variant="secondary" className="text-[10px] bg-white text-slate-900 font-bold shrink-0">
              {uncopiedCount} ta qoldi
            </Badge>
          )}
        </div>
      )}

      {/* Uncopied warning badge if student has drafted answers not bubbled */}
      {uncopiedCount > 0 && !isTimeCritical && (
        <div className="px-3 py-1.5 bg-amber-500/10 border-b border-amber-500/20 text-amber-800 dark:text-amber-300 text-[11px] flex items-center justify-between">
          <span className="flex items-center gap-1">
            <AlertTriangle className="size-3.5 text-amber-600 shrink-0" />
            <strong>{uncopiedCount} ta</strong> javob hali Titulga bo&apos;yalmagan!
          </span>
          {onSyncAllDrafts && (
            <button
              onClick={handleBatchSync}
              disabled={isSyncing}
              className="text-[10px] font-bold underline hover:text-amber-600 cursor-pointer"
            >
              Ko&apos;chirish
            </button>
          )}
        </div>
      )}

      {/* The Optical Bubble Sheet Grid */}
      <div className="flex-1 overflow-y-auto max-h-[calc(100vh-17rem)] min-h-[260px] p-2.5 sm:p-4 space-y-1.5 custom-scrollbar">
        {Array.from({ length: totalQuestions }, (_, i) => i + 1).map((idx) => {
          const sIdx = String(idx);
          const chosenLetter = titulAnswers[sIdx];
          const draftLetter = draftAnswers[idx];
          const isCurrent = currentQIdx === idx;
          const isDraftedNotBubbled = Boolean(draftLetter && !chosenLetter);
          const isMismatch = Boolean(draftLetter && chosenLetter && draftLetter !== chosenLetter);

          return (
            <div
              key={idx}
              onClick={() => onJumpToQuestion && onJumpToQuestion(idx)}
              className={cn(
                "flex items-center justify-between px-2.5 sm:px-3 py-1.5 rounded-xl border transition-all text-xs cursor-pointer",
                isCurrent
                  ? "bg-blue-50 dark:bg-blue-950/40 border-blue-400 dark:border-blue-700 shadow-xs"
                  : isDraftedNotBubbled
                  ? "bg-amber-50/70 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800"
                  : "bg-white/80 dark:bg-[#181a22] border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700"
              )}
            >
              {/* Question Number */}
              <div className="flex items-center gap-1.5 w-10 sm:w-12 shrink-0">
                <span className={cn(
                  "font-mono font-bold text-xs",
                  isCurrent ? "text-blue-600 dark:text-blue-400 font-black" : "text-slate-600 dark:text-slate-400"
                )}>
                  {String(idx).padStart(2, '0')}.
                </span>
                {isDraftedNotBubbled && (
                  <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" title="Qoralamada bor, lekin Titulda bo'yalmagan!" />
                )}
                {isMismatch && (
                  <span className="size-1.5 rounded-full bg-rose-500" title={`Qoralama: ${draftLetter}, Titul: ${chosenLetter}`} />
                )}
              </div>

              {/* The 4 Bubbles (A, B, C, D) */}
              <div className="flex items-center gap-2 sm:gap-2.5 md:gap-3" onClick={(e) => e.stopPropagation()}>
                {BUBBLES.map((letter) => {
                  const isSelected = chosenLetter === letter;

                  return (
                    <button
                      key={letter}
                      type="button"
                      onClick={() => handleSelect(idx, isSelected ? '' : letter)}
                      aria-label={`${idx}-savol ${letter} varianti`}
                      className={cn(
                        "size-7 sm:size-7.5 rounded-full font-mono text-[11px] font-bold flex items-center justify-center transition-transform active:scale-90 cursor-pointer border-2",
                        isSelected
                          ? "bg-slate-900 dark:bg-blue-600 border-slate-950 dark:border-blue-500 text-white shadow-inner scale-105"
                          : "bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-950/30"
                      )}
                      style={{
                        // Realistic graphite filled effect
                        boxShadow: isSelected ? 'inset 0 2px 4px rgba(0,0,0,0.5)' : undefined,
                      }}
                    >
                      {letter}
                    </button>
                  );
                })}
              </div>

              {/* Status Indicator */}
              <div className="w-6 text-right shrink-0">
                {chosenLetter ? (
                  <span className="font-mono font-bold text-[11px] text-slate-900 dark:text-blue-400">
                    {chosenLetter}
                  </span>
                ) : draftLetter ? (
                  <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400 font-bold" title="Qoralamada bor">
                    ({draftLetter})
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-300 dark:text-slate-700">—</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Titul Footer Instructions & Sync Button */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-[#f8f6ee] dark:bg-[#1a1c24] rounded-b-2xl space-y-2">
        {onSyncAllDrafts && uncopiedCount > 0 && (
          <Button
            size="sm"
            onClick={handleBatchSync}
            disabled={isSyncing}
            className="w-full text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
          >
            <Sparkles className="size-3.5 mr-1.5" />
            {isSyncing ? "Ko'chirilmoqda..." : `Barcha qoralamalarni Titulga ko'chirish (${uncopiedCount})`}
          </Button>
        )}

        <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 px-1">
          <span className="flex items-center gap-1">
            <Info className="size-3" />
            Doirachani to&apos;liq bo&apos;yang
          </span>
          <span className="font-mono">DTM 2026</span>
        </div>
      </div>
    </div>
  );
}
