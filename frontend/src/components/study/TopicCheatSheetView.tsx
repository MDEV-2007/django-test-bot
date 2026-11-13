'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Zap, AlertTriangle, CheckCircle2, Clock, Sparkles, ArrowRight, ShieldAlert, BookOpen, Layers, Check, Loader2, Flame, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { tgHaptic } from '@/lib/telegram';
import { soundFX } from '@/lib/soundFX';
import { apiFetch } from '@/lib/api-client';
import { cn, formatRichText } from '@/lib/utils';
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
      <div className="flex flex-col items-center justify-center gap-3 rounded-[28px] bg-[var(--ps-neutral,var(--surface-input))] p-8 text-center">
        <span className="inline-flex size-12 items-center justify-center rounded-full bg-[var(--ps-orange,#FFB82E)] text-[#080808]">
          <Zap className="size-5 animate-spin" />
        </span>
        <p className="text-sm font-bold text-[var(--text-primary)]">
          AI 60 soniyalik shpargalka va BMB qopqonlarini tayyorlamoqda...
        </p>
        <p className="text-xs text-[var(--text-muted)]">
          800 betlik kitobdan faqat imtihonda tushadigan konsentrat olinmoqda
        </p>
      </div>
    );
  }

  if (!data) return null;

  const tabs = [
    { id: 'pills' as const, label: 'Oltin faktlar', count: data.core_pills.length, icon: Zap, tone: 'bg-[var(--ps-orange,#FFB82E)] text-[#080808]' },
    { id: 'traps' as const, label: 'BMB qopqonlari', count: data.exam_traps.length, icon: AlertTriangle, tone: 'bg-[var(--ps-coral,#F0523D)] text-white' },
    ...(data.visual_chain?.length > 0
      ? [{ id: 'chain' as const, label: 'Xronologiya', count: data.visual_chain.length, icon: Clock, tone: 'bg-[var(--ps-purple,#7659C7)] text-white' }]
      : []),
  ];
  const lowTime = secondsRemaining <= 10;

  return (
    <div className="space-y-5 text-[var(--text-primary)]">
      {/* ── Sarlavha: mavzu + 60s taymer ── */}
      <section className="relative overflow-hidden rounded-[28px] bg-[#080808] p-5 text-[#FFFCF7] sm:p-6">
        <span aria-hidden className="absolute -right-12 -top-14 size-44 rounded-full bg-[var(--ps-orange,#FFB82E)] opacity-80" />
        <span aria-hidden className="absolute -right-3 -top-3 size-20 rounded-full border-2 border-dashed border-[#080808]/40" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3.5">
            <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-full bg-[var(--ps-orange,#FFB82E)] text-[#080808]">
              <Zap className="size-6" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-[var(--ps-orange,#FFB82E)]">Anti-darslik</span>
                <span className="rounded-full bg-white/12 px-2 py-0.5 text-[10.5px] font-bold text-white/80">60 soniyalik mikro-xarita</span>
              </div>
              <h3 className="mt-1 text-[22px] font-bold leading-tight tracking-[-0.03em] [font-family:var(--font-grotesk),var(--font-sans),sans-serif] sm:text-[26px]">
                {data.topic_title || topicTitle}
              </h3>
            </div>
          </div>
          {/* 60 soniyalik taymer */}
          <div className={cn('relative flex items-center gap-2 rounded-full px-3.5 py-2', lowTime ? 'animate-pulse bg-[var(--ps-coral,#F0523D)] text-white' : 'bg-[#FFFCF7] text-[#080808]')}>
            <Clock className="size-4" />
            <span className="text-[12px] font-semibold opacity-70">O&apos;qish vaqti</span>
            <span className="text-[20px] font-bold leading-none tabular-nums [font-family:var(--font-grotesk),var(--font-sans),sans-serif]">{secondsRemaining}s</span>
          </div>
        </div>
      </section>

      {/* ── Bo'limlar ── */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => { setActiveTab(tab.id); tgHaptic('select'); }}
              className={cn(
                'inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-full py-1.5 pl-1.5 pr-4 text-[13px] font-bold transition-all',
                active ? 'bg-[#080808] text-[#FFFCF7] dark:bg-[#FFFCF7] dark:text-[#080808]' : 'bg-[var(--ps-neutral,var(--surface-input))] text-[var(--text-muted)] hover:text-[var(--text-primary)]',
              )}
            >
              <span className={cn('inline-flex size-7 items-center justify-center rounded-full', tab.tone)}>
                <tab.icon className="size-3.5" />
              </span>
              {tab.label}
              <span className={cn('rounded-full px-1.5 text-[11px] tabular-nums', active ? 'bg-white/15 dark:bg-black/10' : 'bg-[var(--ps-paper,var(--surface-card))]')}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── 1. Oltin faktlar ── */}
      {activeTab === 'pills' && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {data.core_pills.map((pill, idx) => (
            <div
              key={idx}
              className="group relative overflow-hidden rounded-[22px] bg-[var(--ps-neutral,var(--surface-input))] p-4 transition-transform hover:-translate-y-0.5"
            >
              <div className="flex items-start gap-3">
                <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--ps-orange,#FFB82E)] text-[13px] font-bold text-[#080808] tabular-nums">
                  {idx + 1}
                </span>
                <div className="min-w-0 space-y-1">
                  <p className="text-[15px] font-bold leading-snug">{pill.term}</p>
                  <p className="text-[13px] leading-relaxed text-[var(--text-muted)]">{pill.definition}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── 2. BMB qopqonlari ── */}
      {activeTab === 'traps' && (
        <div className="space-y-3">
          {data.exam_traps.map((trap, idx) => (
            <div key={idx} className="space-y-2.5 rounded-[24px] bg-[var(--ps-neutral,var(--surface-input))] p-3.5">
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <div className="space-y-1.5 rounded-[18px] bg-[var(--ps-coral,#F0523D)] p-3.5 text-white">
                  <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-white/80">
                    <X className="size-3.5" /> Ko&apos;pchilik adashadi
                  </span>
                  <p className="text-[14px] font-semibold leading-relaxed">{trap.wrong}</p>
                </div>
                <div className="space-y-1.5 rounded-[18px] bg-[var(--ps-green,#4C806B)] p-3.5 text-white">
                  <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-white/80">
                    <Check className="size-3.5" /> Haqiqiy BMB javobi
                  </span>
                  <p className="text-[14px] font-bold leading-relaxed">{trap.correct}</p>
                </div>
              </div>
              {trap.explanation && (
                <p className="flex items-start gap-2 px-1 text-[12.5px] leading-relaxed text-[var(--text-secondary)]">
                  <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--ps-orange,#FFB82E)] text-[11px]">💡</span>
                  <span>
                    <b>Layfxak: </b>
                    <span
                      className="[&_p]:inline"
                      dangerouslySetInnerHTML={{ __html: formatRichText(trap.explanation) }}
                    />
                  </span>
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── 3. Xronologiya ── */}
      {activeTab === 'chain' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h4 className="text-[20px] font-bold tracking-[-0.03em] [font-family:var(--font-grotesk),var(--font-sans),sans-serif]">Mantiqiy xronologiya</h4>
              <p className="text-[12px] text-[var(--text-muted)]">Voqea va hodisalarning ketma-ket bog&apos;liqlik xaritasi</p>
            </div>
            <span className="rounded-full bg-[var(--ps-purple,#7659C7)] px-3 py-1 text-[11px] font-bold text-white">{data.visual_chain.length} ta bosqich</span>
          </div>
          <div className="relative space-y-3">
            {data.visual_chain.map((step, idx) => {
              const isLast = idx === data.visual_chain.length - 1;
              const parts = step.split(':');
              const hasPrefix = parts.length > 1;
              const stageLabel = hasPrefix ? parts[0].trim() : `Bosqich ${idx + 1}`;
              const stageContent = hasPrefix ? parts.slice(1).join(':').trim() : step;
              return (
                <div key={idx} className="relative flex items-start gap-3.5">
                  {!isLast && (
                    <div className="pointer-events-none absolute left-[19px] top-10 -bottom-3 w-0.5 bg-[var(--ps-purple,#7659C7)] opacity-30" />
                  )}
                  <span className="z-10 inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--ps-purple,#7659C7)] text-[14px] font-bold text-white">
                    {idx + 1}
                  </span>
                  <div className="flex-1 space-y-1.5 rounded-[22px] bg-[var(--ps-neutral,var(--surface-input))] p-4">
                    <span className="inline-block rounded-full bg-[var(--ps-paper,var(--surface-card))] px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-[var(--ps-purple,#7659C7)]">
                      {stageLabel}
                    </span>
                    <p className="text-[14px] font-semibold leading-relaxed">{stageContent}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Sprint CTA ── */}
      <button
        type="button"
        onClick={handleLaunchSprint}
        disabled={startingSprint}
        className="group relative flex w-full cursor-pointer flex-col items-start justify-between gap-4 overflow-hidden rounded-[28px] bg-[var(--ps-orange,#FFB82E)] p-5 text-left text-[#080808] transition-transform hover:-translate-y-0.5 active:scale-[0.99] disabled:opacity-70 sm:flex-row sm:items-center sm:p-6"
      >
        <span aria-hidden className="absolute -right-10 -top-12 size-36 rounded-full bg-white/30" />
        <div className="relative flex min-w-0 items-center gap-3.5">
          <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-full bg-[#080808] text-[var(--ps-orange,#FFB82E)]">
            {startingSprint ? <Loader2 className="size-5 animate-spin" /> : <Flame className="size-5" />}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="rounded-full bg-[#080808] px-2.5 py-0.5 text-[11px] font-bold text-white">3 daqiqalik fokus sprint</span>
              <span className="text-[11px] font-bold text-black/60">10 ta savol • +50 XP</span>
            </div>
            <p className="mt-1.5 text-[16px] font-bold leading-snug tracking-[-0.02em] [font-family:var(--font-grotesk),var(--font-sans),sans-serif]">
              Faktlar va qopqonlarni hoziroq sprintda mustahkamlang
            </p>
          </div>
        </div>
        <span className="relative inline-flex shrink-0 items-center gap-2 self-end rounded-full bg-[#080808] py-1.5 pl-4 pr-1.5 text-[13px] font-bold text-[#FFFCF7] sm:self-center">
          Mashqni boshlash
          <span className="flex size-8 items-center justify-center rounded-full bg-[var(--ps-orange,#FFB82E)] text-[#080808] transition-transform group-hover:-rotate-45">
            <ArrowRight className="size-4" />
          </span>
        </span>
      </button>
    </div>
  );
}
