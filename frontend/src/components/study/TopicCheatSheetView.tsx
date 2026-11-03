'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Zap, AlertTriangle, CheckCircle2, Clock, Sparkles,
  ArrowRight, ShieldAlert, BookOpen, Layers, Check, Loader2, Flame,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { tgHaptic } from '@/lib/telegram';
import { soundFX } from '@/lib/soundFX';
import { apiFetch } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type CorePill = {
  term: string;
  definition: string;
};

type ExamTrap = {
  wrong: string;
  correct: string;
  explanation: string;
};

type CheatSheetData = {
  topic_id: number;
  topic_title: string;
  core_pills: CorePill[];
  exam_traps: ExamTrap[];
  visual_chain: string[];
  sprint_question_ids: number[];
};

type TopicCheatSheetViewProps = {
  topicId: number;
  topicTitle?: string;
  onStartSprint?: () => void;
};

export default function TopicCheatSheetView({
  topicId,
  topicTitle = 'Mavzu',
  onStartSprint,
}: TopicCheatSheetViewProps) {
  const router = useRouter();
  const [data, setData] = useState<CheatSheetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pills' | 'traps' | 'chain'>('pills');
  const [secondsRemaining, setSecondsRemaining] = useState(60);
  const [timerActive, setTimerActive] = useState(true);
  const [startingSprint, setStartingSprint] = useState(false);

  useEffect(() => {
    async function loadSheet() {
      setLoading(true);
      try {
        const res = await apiFetch<CheatSheetData>(`/api/v1/system/cheat-sheet/${topicId}/`);
        setData(res);
      } catch (e) {
        toast.error("Shpargalkani yuklashda xatolik yuz berdi");
      } finally {
        setLoading(false);
      }
    }
    loadSheet();
  }, [topicId]);

  // 60-soniyalik o'qish taymeri
  useEffect(() => {
    if (!timerActive || secondsRemaining <= 0) return;
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          tgHaptic('success');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timerActive, secondsRemaining]);

  async function handleLaunchSprint() {
    setStartingSprint(true);
    soundFX.fanfare();
    tgHaptic('medium');
    toast.success("3 daqiqalik Fokus Sprinti boshlanmoqda! Faktlarni mustahkamlang 🔥");
    if (onStartSprint) {
      onStartSprint();
      setStartingSprint(false);
      return;
    }
    const cleanTitle = data?.topic_title || topicTitle || 'Mavzu';
    router.push(`/sprint?autostart=true&topic_id=${topicId}&topic_title=${encodeURIComponent(cleanTitle)}&from=learning&count=10`);
    setStartingSprint(false);
  }

  if (loading) {
    return (
      <Card className="border border-white/[0.08] bg-[#07090E] rounded-xl p-8 text-center text-white">
        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="size-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
            <Zap className="size-5 text-amber-400 animate-spin" />
          </div>
          <p className="text-sm font-bold text-zinc-200">
            AI 60-soniyalik Shpargalka va BMB qopqonlarini tayyorlamoqda...
          </p>
          <p className="text-xs text-zinc-500">
            800 betlik kitobdan faqat imtihonda tushadigan konsentrat olinmoqda
          </p>
        </div>
      </Card>
    );
  }

  if (!data) return null;

  return (
    <Card className="border border-white/[0.08] bg-[#07090E] rounded-xl shadow-2xl text-white overflow-hidden">
      {/* Header with 60-second speed read badge */}
      <div className="p-4 sm:p-5 border-b border-white/[0.08] bg-zinc-950/60 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-lg bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400 shrink-0">
            <Zap className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-mono uppercase tracking-wider font-bold text-amber-400">
                ANTI-DARSLIK
              </span>
              <Badge variant="outline" className="text-[11px] border-amber-500/30 text-amber-300 py-0">
                60 SONIYALIK MIKRO-XARITA
              </Badge>
            </div>
            <h3 className="text-sm sm:text-base font-bold text-zinc-100 tracking-tight">
              {data.topic_title || topicTitle}
            </h3>
          </div>
        </div>

        {/* 60s Countdown Timer */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/[0.08] bg-zinc-900/80 font-mono text-xs">
          <Clock className={cn("size-3.5", secondsRemaining <= 10 ? "text-rose-400 animate-pulse" : "text-amber-400")} />
          <span className="text-zinc-400">O&apos;qish vaqti:</span>
          <span className={cn("font-bold text-sm", secondsRemaining <= 10 ? "text-rose-400" : "text-amber-400")}>
            {secondsRemaining}s
          </span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center border-b border-white/[0.08] bg-zinc-950/40 px-4 pt-2 gap-2 text-xs">
        <button
          onClick={() => { setActiveTab('pills'); tgHaptic('select'); }}
          className={cn(
            "pb-2.5 px-3 font-bold border-b-2 transition-all cursor-pointer",
            activeTab === 'pills'
              ? "border-amber-400 text-amber-400"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          )}
        >
          ⚡ 10 ta Oltin Fakt ({data.core_pills.length})
        </button>

        <button
          onClick={() => { setActiveTab('traps'); tgHaptic('select'); }}
          className={cn(
            "pb-2.5 px-3 font-bold border-b-2 transition-all cursor-pointer",
            activeTab === 'traps'
              ? "border-rose-400 text-rose-400"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          )}
        >
          🪤 BMB Qopqonlari ({data.exam_traps.length})
        </button>

        {data.visual_chain?.length > 0 && (
          <button
            onClick={() => { setActiveTab('chain'); tgHaptic('select'); }}
            className={cn(
              "pb-2.5 px-3 font-bold border-b-2 transition-all cursor-pointer",
              activeTab === 'chain'
                ? "border-blue-400 text-blue-400"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            )}
          >
            🧠 Xronologiya ({data.visual_chain.length})
          </button>
        )}
      </div>

      {/* Tab Contents */}
      <CardContent className="p-4 sm:p-5 space-y-4">
        {activeTab === 'pills' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {data.core_pills.map((pill, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg border border-white/[0.06] bg-zinc-900/50 hover:border-amber-500/30 transition-all flex items-start gap-2.5"
              >
                <span className="size-5 rounded-md bg-amber-500/10 text-amber-400 font-mono text-[12px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  #{idx + 1}
                </span>
                <div className="space-y-0.5 min-w-0">
                  <p className="text-xs font-bold text-zinc-100">{pill.term}</p>
                  <p className="text-[12px] text-zinc-400 leading-relaxed">{pill.definition}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'traps' && (
          <div className="space-y-3">
            {data.exam_traps.map((trap, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl border border-white/[0.08] bg-zinc-900/60 space-y-2.5"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {/* Left (Wrong - Red Border) */}
                  <div className="p-2.5 rounded-lg border border-rose-500/30 bg-rose-500/[0.06] space-y-1">
                    <span className="text-[12px] font-bold text-rose-400 uppercase tracking-wide flex items-center gap-1">
                      ❌ Ko&apos;pchilik adashadi:
                    </span>
                    <p className="text-zinc-200 font-medium leading-relaxed">{trap.wrong}</p>
                  </div>

                  {/* Right (Correct - Green Border) */}
                  <div className="p-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/[0.06] space-y-1">
                    <span className="text-[12px] font-bold text-emerald-400 uppercase tracking-wide flex items-center gap-1">
                      ✅ Haqiqiy BMB javobi:
                    </span>
                    <p className="text-zinc-200 font-bold leading-relaxed">{trap.correct}</p>
                  </div>
                </div>

                {trap.explanation && (
                  <p className="text-[12px] text-zinc-400 italic px-1">
                    💡 <strong>Layfxak:</strong> {trap.explanation}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'chain' && (
          <div className="rounded-2xl border border-white/[0.08] bg-zinc-900/50 p-4 sm:p-5 backdrop-blur-md space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Clock className="size-4 text-cyan-400" />
                  <span>Mantiqiy Xronologiya &amp; Zanjir</span>
                  <Badge variant="outline" className="text-[12px] font-mono border-cyan-500/30 bg-cyan-500/10 text-cyan-400">
                    {data.visual_chain.length} ta bosqich
                  </Badge>
                </h4>
                <p className="text-[12px] text-zinc-400 mt-0.5">
                  Voqea va hodisalarning ketma-ket mantiqiy bog&apos;liqlik xaritasi
                </p>
              </div>
            </div>

            <div className="relative pl-2 sm:pl-3 space-y-4 sm:space-y-5">
              {data.visual_chain.map((step, idx) => {
                const isLast = idx === data.visual_chain.length - 1;
                const parts = step.split(':');
                const hasPrefix = parts.length > 1;
                const stageLabel = hasPrefix ? parts[0].trim() : `Bosqich ${idx + 1}`;
                const stageContent = hasPrefix ? parts.slice(1).join(':').trim() : step;

                return (
                  <div key={idx} className="relative flex items-start gap-3 sm:gap-4 group">
                    {/* Connecting Vertical Line */}
                    {!isLast && (
                      <div className="absolute left-[15px] sm:left-[17px] top-8 -bottom-5 w-0.5 bg-gradient-to-b from-cyan-500/50 via-blue-500/30 to-zinc-700/40 pointer-events-none" />
                    )}

                    {/* Step Node Circle */}
                    <div className="size-8 sm:size-9 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 text-white font-bold text-xs sm:text-sm flex items-center justify-center shrink-0 shadow-md shadow-cyan-500/20 ring-4 ring-zinc-900 z-10 group-hover:scale-105 transition-transform">
                      {idx + 1}
                    </div>

                    {/* Step Content Card */}
                    <div className="flex-1 rounded-2xl border border-white/[0.08] bg-zinc-900/80 hover:bg-zinc-800/80 p-3.5 sm:p-4 transition-all space-y-1.5 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] font-bold uppercase tracking-wider text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-md">
                          {stageLabel}
                        </span>
                        <span className="text-[12px] font-mono text-zinc-500">
                          #{idx + 1}-qadam
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm font-semibold text-zinc-100 leading-relaxed">
                        {stageContent}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Sprint CTA Connection */}
        <div className="pt-3">
          <button
            onClick={handleLaunchSprint}
            disabled={startingSprint}
            className="group relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 p-[1.5px] shadow-xl shadow-orange-500/20 active:scale-[0.99] transition-all cursor-pointer text-left"
          >
            <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-[15px] bg-zinc-950/95 px-4 py-3 backdrop-blur-md group-hover:bg-zinc-900/90 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <div className="size-11 rounded-xl bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-600 flex items-center justify-center shrink-0 shadow-lg shadow-orange-500/30 group-hover:scale-105 transition-transform">
                  {startingSprint ? (
                    <Loader2 className="size-5 text-white animate-spin" />
                  ) : (
                    <Flame className="size-5 text-white fill-current animate-pulse" />
                  )}
                </div>
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[12px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full">
                      ⚡ 3 Daqiqalik Fokus Sprint
                    </span>
                    <span className="text-[12px] font-bold text-zinc-400">
                      10 ta saralangan savol • +50 XP
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-white leading-snug">
                    Ushbu 10 ta fakt va 3 ta qopqonni hoziroq Sprintda mixlab qo&apos;ying!
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 text-white font-bold text-xs shadow-md shadow-orange-500/20 shrink-0 self-end sm:self-center group-hover:opacity-95 transition-opacity">
                <span>Mashqni Boshlash</span>
                <ArrowRight className="size-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
