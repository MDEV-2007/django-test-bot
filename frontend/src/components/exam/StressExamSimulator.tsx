'use client';

import React, { useState, useEffect } from 'react';
import {
  Flame, Volume2, VolumeX, AlertTriangle, Clock,
  FileSpreadsheet, ShieldAlert, Sparkles, Check, ArrowRight,
  HelpCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { tgHaptic } from '@/lib/telegram';
import { stressAudio } from '@/lib/stressAudio';
import { cn } from '@/lib/utils';

type StressExamSimulatorProps = {
  totalQuestions?: number;
  currentQIdx: number;
  secondsLeft: number | null;
  titulAnswers: Record<string, string>;
  draftAnswers: Record<number, string | null>;
  onBubbleSelect: (qIdx: number, letter: string) => void;
  onOpenBubbleDrawer?: () => void;
  examTitle?: string;
};

const BUBBLES = ['A', 'B', 'C', 'D'] as const;

export default function StressExamSimulator({
  totalQuestions = 45,
  currentQIdx,
  secondsLeft,
  titulAnswers,
  draftAnswers,
  onBubbleSelect,
  onOpenBubbleDrawer,
  examTitle = 'BMB Milliy Sertifikat Standart Testi',
}: StressExamSimulatorProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [showShockReport, setShowShockReport] = useState(false);

  const isTimeCritical = secondsLeft !== null && secondsLeft !== undefined && secondsLeft <= 600; // <= 10 min
  const isHeartbeatPanic = secondsLeft !== null && secondsLeft !== undefined && secondsLeft <= 300; // <= 5 min

  function handleBubble(qIdx: number, letter: string) {
    tgHaptic('select');
    stressAudio.playPencilSound();
    onBubbleSelect(qIdx, letter);
  }

  function handleToggleAudio() {
    const muted = stressAudio.toggleMute();
    setIsMuted(muted);
    tgHaptic('light');
  }

  // Shift Error Detection (Qatordan adashish / Tuzoq tahlili)
  const shiftErrors = React.useMemo(() => {
    const errors: { draftQ: number; draftLetter: string; titulQ: number; titulLetter: string }[] = [];
    Object.entries(draftAnswers).forEach(([idxStr, draftLetter]) => {
      const q = parseInt(idxStr);
      if (!draftLetter) return;
      // Agar qoralama q da harf bo'lib, lekin titul q da bo'sh yoki boshqa bo'lsa
      // va qo'shni qatorda (q+1 yoki q-1) da xuddi shu draftLetter turgan bo'lsa — Shift Error!
      const currentTitul = titulAnswers[String(q)];
      const nextTitul = titulAnswers[String(q + 1)];
      const prevTitul = titulAnswers[String(q - 1)];

      if (currentTitul !== draftLetter) {
        if (nextTitul === draftLetter && draftAnswers[q + 1] !== draftLetter) {
          errors.push({ draftQ: q, draftLetter, titulQ: q + 1, titulLetter: nextTitul });
        } else if (prevTitul === draftLetter && draftAnswers[q - 1] !== draftLetter) {
          errors.push({ draftQ: q, draftLetter, titulQ: q - 1, titulLetter: prevTitul });
        }
      }
    });
    return errors;
  }, [draftAnswers, titulAnswers]);

  const filledCount = Object.keys(titulAnswers).length;
  const uncopiedCount = Object.entries(draftAnswers).filter(([k, v]) => v && !titulAnswers[k]).length;

  return (
    <>
      {/* Heartbeat Vignette Effect (Qizil yurak urishi animatsiyasi) */}
      <div
        className={cn(
          "pointer-events-none fixed inset-0 z-40 transition-opacity duration-1000",
          isHeartbeatPanic
            ? "opacity-100 shadow-[inset_0_0_80px_rgba(225,29,72,0.25)] animate-pulse"
            : isTimeCritical
            ? "opacity-60 shadow-[inset_0_0_50px_rgba(245,158,11,0.15)]"
            : "opacity-0"
        )}
      />

      {/* Top Controller Bar */}
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-zinc-900/80 border border-white/[0.08] backdrop-blur-xl text-white shadow-xl mb-4">
        <div className="flex items-center gap-2.5">
          <div className="relative flex size-7 items-center justify-center rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400">
            <Flame className="size-4 animate-pulse" />
            <span className="absolute -top-0.5 -right-0.5 size-1.5 rounded-full bg-rose-500 animate-ping" />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-zinc-100 tracking-tight">
              Real BMB Stress Zali
            </span>
            <Badge variant="outline" className="text-[12px] border-rose-500/30 bg-rose-500/10 text-rose-300 font-mono">
              HARDCORE
            </Badge>
          </div>
        </div>

        {/* Audio status & Sound wave */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleToggleAudio}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-white/[0.08] bg-zinc-800/60 hover:bg-zinc-800 text-xs font-semibold text-zinc-300 transition-colors cursor-pointer"
          >
            {isMuted ? (
              <>
                <VolumeX className="size-3.5 text-zinc-500" />
                <span className="text-zinc-500 hidden sm:inline">Zal ovozi: OFF</span>
              </>
            ) : (
              <>
                <Volume2 className="size-3.5 text-emerald-400 animate-pulse" />
                <span className="text-emerald-400 hidden sm:inline">500 kishi zali: ON</span>
                {/* Micro audio bars animation */}
                <div className="flex items-center gap-0.5 h-3">
                  <span className="w-0.5 h-2 bg-emerald-400 animate-pulse" />
                  <span className="w-0.5 h-3 bg-emerald-400 animate-pulse delay-75" />
                  <span className="w-0.5 h-1.5 bg-emerald-400 animate-pulse delay-150" />
                </div>
              </>
            )}
          </button>

          {/* Mobilda Titul Drawer tugmasi */}
          {onOpenBubbleDrawer && (
            <Button
              size="sm"
              onClick={onOpenBubbleDrawer}
              className="lg:hidden text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white h-7 px-2.5 rounded-lg"
            >
              <FileSpreadsheet className="size-3 mr-1" />
              Titul ({filledCount}/{totalQuestions})
            </Button>
          )}

          {/* Shift Error Diagnostic Trigger */}
          {shiftErrors.length > 0 && (
            <button
              onClick={() => setShowShockReport(true)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-500/15 border border-rose-500/40 text-rose-400 text-xs font-bold animate-pulse cursor-pointer"
              title="Qatordan adashish aniqlandi!"
            >
              <AlertTriangle className="size-3.5" />
              <span className="hidden sm:inline">{shiftErrors.length} ta xato qator!</span>
            </button>
          )}
        </div>
      </div>

      {/* Post-Exam Shift Error Shock Modal */}
      <Dialog open={showShockReport} onOpenChange={setShowShockReport}>
        <DialogContent className="sm:max-w-md bg-zinc-950 border border-rose-500/40 text-white rounded-2xl">
          <DialogHeader className="space-y-2">
            <div className="flex items-center gap-2 text-rose-400">
              <AlertTriangle className="size-5 text-rose-500 animate-bounce" />
              <DialogTitle className="text-base font-bold text-white">
                ⚠️ BMB Titul Varaqasi Tuzog&apos;i (Shift Error)
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-zinc-300 leading-relaxed">
              Haqiqiy DTM zalida eng ko&apos;p abituriyentlarni yig&apos;latadigan xatolik: savolni qoralamada to&apos;g&apos;ri topib, Titul varaqasida 1 ta qator adashtirib bo&apos;yash!
            </DialogDescription>
          </DialogHeader>

          <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 space-y-2 text-xs">
            <p className="font-semibold text-rose-200">Aniqlangan qator adashishlari:</p>
            {shiftErrors.map((err, i) => (
              <div key={i} className="flex items-center justify-between font-mono text-[12px] p-2 bg-black/40 rounded-lg">
                <span>{err.draftQ}-savol qoralama: <strong>{err.draftLetter}</strong></span>
                <span className="text-rose-400">➡️ Titulda {err.titulQ}-qatorga bo&apos;yalgan!</span>
              </div>
            ))}
            <p className="text-[12px] text-zinc-400 pt-1">
              Bu xatolik tufayli imtihonda <strong>{(shiftErrors.length * 3.1).toFixed(1)} ball</strong> yo&apos;qotishingiz mumkin edi!
            </p>
          </div>

          <DialogFooter>
            <Button
              onClick={() => setShowShockReport(false)}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs w-full rounded-xl"
            >
              Tushundim, darhol to&apos;g&apos;rilayman
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
