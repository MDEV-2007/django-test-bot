'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap, Flame, Trophy, Gift, ArrowRight, Play,
  CheckCircle2, TreeDeciduous, Droplets, Sparkles,
  ShieldCheck, Brain, Swords, Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useContinuousLoop } from '@/hooks/useContinuousLoop';
import ContinuousLoopController from '@/components/loop/ContinuousLoopController';
import { useTransliterate } from '@/lib/transliterate';

interface MagneticLoopCardProps {
  userName?: string;
  userStreak?: number;
}

export default function MagneticLoopCard({
  userName = "Abituriyent",
  userStreak = 7,
}: MagneticLoopCardProps) {
  const [controllerOpen, setControllerOpen] = useState(false);
  const { loop, topic, ecoTree, loading, restartCycle } = useContinuousLoop();
  const { t } = useTransliterate();

  // Multi-cycle marafon ko'rsatkichlari (3 raundlik marafon: 3x 18-20 daqiqa = 60 daqiqa)
  const cycleNumber = loop?.cycle_number || 1;
  const currentStage = loop?.current_stage || 'STAGE_1_WARMUP';
  const combo = loop?.combo_multiplier || 1.0;
  const isCompleted = currentStage === 'STAGE_5_COMPLETED';

  // Raundlar bo'yicha suv foizi (Raund 1: 35%, Raund 2: 70%, Raund 3: 100%)
  const completedRounds = isCompleted ? cycleNumber : Math.max(0, cycleNumber - 1);
  const displayWater = completedRounds >= 3 ? 100 : completedRounds === 2 ? 70 : completedRounds === 1 ? 35 : Math.max(ecoTree.water_level, 15);
  const displayStageName = completedRounds >= 3 ? "Chinor (Boss Ochiq)" : completedRounds === 2 ? "Ko'chat" : "Nihol";

  // 3 ta oltin tomchi statusi
  const drop1Done = completedRounds >= 1;
  const drop2Done = completedRounds >= 2;
  const drop3Done = completedRounds >= 3;

  let dropletsText = "To'liq o'sish uchun: 0/3 sikl (1-raundda 💧 35% suv beriladi)";
  if (completedRounds === 1) {
    dropletsText = "To'liq o'sish uchun: 1/3 sikl (Yana 2 ta siklda 🎁 Oltin Sandiq ochiladi)";
  } else if (completedRounds === 2) {
    dropletsText = "To'liq o'sish uchun: 2/3 sikl (Yana 1 ta siklda 🎁 Oltin Sandiq ochiladi)";
  } else if (completedRounds >= 3) {
    dropletsText = "To'liq o'sish: 3/3 sikl — 🌳 Chinorga aylandi! (🔥 Boss Sinovi Ochiq)";
  }

  // Asosiy tugma matni va gradienti
  let ctaTitle = "🚀 60 Daqiqalik Marafon";
  let ctaSubtitle = "1-Raund (15 daq) • 4 bosqich • Daraxtga +35% suv";
  let ctaGradient = "from-orange-500 via-rose-500 to-rose-600 shadow-rose-600/30";

  if (currentStage === 'STAGE_1_WARMUP') {
    if (cycleNumber === 2) {
      ctaTitle = "🔥 2-Raundni Boshlash";
      ctaSubtitle = "15 daqiqa • 70% Suv sari • 2.0x Combo";
    } else if (cycleNumber >= 3) {
      ctaTitle = "⚡ 3-Raund: Final Sinovi";
      ctaSubtitle = "100% Suv • Chinor & Boss darajasi";
    }
  } else if (currentStage === 'STAGE_2_SPRINT') {
    ctaTitle = `⚡ 2-Qadam: Jonli Sprint (${combo.toFixed(1)}x)`;
    ctaSubtitle = "12 ta tezkor savol + Qasos zanjiri";
  } else if (currentStage === 'STAGE_3_CLEANUP') {
    const mistakeCount = loop?.session_mistakes_ids?.length || 2;
    ctaTitle = `🧹 3-Qadam: Xatolarni Tozalash (${mistakeCount} ta)`;
    ctaSubtitle = "90 soniyalik Flashcard tozalash";
  } else if (currentStage === 'STAGE_4_ARENA') {
    ctaTitle = `🔥 4-Qadam: 1v1 Ghost Arena Dueli`;
    ctaSubtitle = "60 soniyalik jonli bellashuv";
  } else if (isCompleted) {
    if (cycleNumber === 1) {
      ctaTitle = "🎁 1-Raund Yopildi! 2-Raundni Boshlash";
      ctaSubtitle = "Daraxtingiz 35% suv oldi • 2.0x Super-Combo";
      ctaGradient = "from-orange-500 via-amber-500 to-rose-600 shadow-orange-500/30";
    } else if (cycleNumber === 2) {
      ctaTitle = "⚡ 2-Raund Yopildi! 3-Raundni Boshlash";
      ctaSubtitle = "Daraxtingiz 70% suv oldi • 2.5x Ultra-Combo";
      ctaGradient = "from-amber-500 via-orange-500 to-rose-600 shadow-rose-500/30";
    } else {
      ctaTitle = "⚔️ Kunlik Boss: 15 daqiqalik Sinov";
      ctaSubtitle = "3/3 Marafon yopildi! Chinor Boss sinovi";
      ctaGradient = "from-emerald-500 via-teal-600 to-cyan-600 shadow-teal-500/30";
    }
  }

  const PIPELINE_STEPS = [
    {
      id: 'step1',
      title: '1. Shpargalka & Sprint',
      desc: '90s Shpargalka + 12 ta savol (+Qasos)',
      icon: Brain,
      isDone: currentStage !== 'STAGE_1_WARMUP',
      isCurrent: currentStage === 'STAGE_1_WARMUP' || currentStage === 'STAGE_2_SPRINT',
    },
    {
      id: 'step2',
      title: '2. Xatolarni Tozalash',
      desc: 'Nozik xatolarni flashcardda yopish',
      icon: Swords,
      isDone: currentStage === 'STAGE_4_ARENA' || isCompleted,
      isCurrent: currentStage === 'STAGE_3_CLEANUP',
    },
    {
      id: 'step3',
      title: '3. 1v1 Arena Dueli',
      desc: '60s Ghost replikaga qarshi duel',
      icon: Zap,
      isDone: isCompleted,
      isCurrent: currentStage === 'STAGE_4_ARENA',
    },
    {
      id: 'step4',
      title: '4. Sandiq & Daraxt',
      desc: '+200 Tanga, XP & +35% Suv quyish',
      icon: Gift,
      isDone: isCompleted,
      isCurrent: isCompleted,
    },
  ];

  return (
    <>
      <div className="relative overflow-hidden rounded-[24px] sm:rounded-[28px] border border-orange-500/30 bg-gradient-to-b from-zinc-900/90 via-zinc-950 to-zinc-900/95 p-4 sm:p-6 shadow-2xl backdrop-blur-xl">
        {/* Orqa fon nurlari */}
        <div className="pointer-events-none absolute -top-24 -left-20 size-64 rounded-full bg-orange-500/15 blur-[80px]" />
        <div className="pointer-events-none absolute -bottom-24 -right-20 size-64 rounded-full bg-rose-500/15 blur-[80px]" />

        {/* ── YUQORI BLOK: SALOMLASHISH VA ECO-DARAXT STATISTIKASI ── */}
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-white/10">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-black uppercase bg-orange-500/20 text-orange-400 border border-orange-500/30">
                <Flame className="size-3.5 fill-current" />
                <span>{userStreak} {t("kunlik olovli zanjir")}</span>
              </span>

              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                <span>{t('Raund')} {cycleNumber}/3</span>
                <span className="text-[10px] opacity-75">({t('60 daqiqalik marafon')})</span>
              </span>

              {topic && (
                <span className="text-xs font-semibold text-zinc-400">
                  • {t('Mavzu')}: <strong className="text-white">{t(topic.title)}</strong>
                </span>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {t('Xayrli kun')}, {userName}! 🎯
            </h2>
            <p className="text-xs sm:text-sm text-zinc-300">
              {t("3 raundlik uzluksiz marafonni yoping, Sirli Sandiq oching va Chinor darajasiga yetib Boss sinovini oching!")}
            </p>
          </div>

          {/* Eco-Tree Multi-Round Vidjeti */}
          <div className="flex flex-col gap-2 p-3 sm:px-4 sm:py-3 rounded-2xl bg-zinc-950/90 border border-emerald-500/40 shrink-0 shadow-lg shadow-emerald-950/20">
            <div className="flex items-center gap-3">
              <div className="size-11 rounded-xl bg-gradient-to-br from-emerald-500/30 to-teal-500/10 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shadow-inner">
                <TreeDeciduous className="size-6 animate-pulse" />
              </div>
              <div className="text-left">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-zinc-300">{t('Ilm Ildizi')}:</span>
                  <span className="text-[10px] font-black uppercase text-emerald-300 bg-emerald-500/25 px-2 py-0.5 rounded-md border border-emerald-500/40">
                    {t(displayStageName)}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs font-mono font-black text-sky-400 flex items-center gap-0.5">
                    <Droplets className="size-3 text-sky-400" />
                    {displayWater}% suv
                  </span>
                  <span className="text-[10px] text-zinc-400 font-semibold">• Raund {cycleNumber}/3</span>
                </div>
              </div>
            </div>

            {/* 3 ta Kichik Oltin Tomchi Indikatori */}
            <div className="pt-2 border-t border-white/10 space-y-1.5">
              <div className="flex items-center gap-1.5">
                {/* 1-Tomchi (Raund 1: 35%) */}
                <div
                  className={`flex-1 flex items-center justify-center gap-1 py-1 px-1.5 rounded-lg text-[10px] font-black transition-all border ${
                    drop1Done
                      ? 'bg-sky-500/20 border-sky-400/50 text-sky-300 shadow-sm shadow-sky-500/20'
                      : cycleNumber === 1
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 animate-pulse'
                      : 'bg-zinc-900 border-white/5 text-zinc-600'
                  }`}
                >
                  <Droplets className={`size-3 ${drop1Done ? 'fill-sky-400 text-sky-400' : 'text-zinc-500'}`} />
                  <span>35%</span>
                </div>

                {/* 2-Tomchi (Raund 2: 70%) */}
                <div
                  className={`flex-1 flex items-center justify-center gap-1 py-1 px-1.5 rounded-lg text-[10px] font-black transition-all border ${
                    drop2Done
                      ? 'bg-sky-500/20 border-sky-400/50 text-sky-300 shadow-sm shadow-sky-500/20'
                      : cycleNumber === 2
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 animate-pulse'
                      : 'bg-zinc-900 border-white/5 text-zinc-600'
                  }`}
                >
                  <Droplets className={`size-3 ${drop2Done ? 'fill-sky-400 text-sky-400' : 'text-zinc-500'}`} />
                  <span>70%</span>
                </div>

                {/* 3-Tomchi (Raund 3: 100% + Boss) */}
                <div
                  className={`flex-1 flex items-center justify-center gap-1 py-1 px-1.5 rounded-lg text-[10px] font-black transition-all border ${
                    drop3Done
                      ? 'bg-gradient-to-r from-amber-500/30 to-emerald-500/30 border-amber-400/60 text-amber-200 shadow-md shadow-amber-500/30'
                      : cycleNumber >= 3
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 animate-pulse'
                      : 'bg-zinc-900 border-white/5 text-zinc-600'
                  }`}
                >
                  <Sparkles className={`size-3 ${drop3Done ? 'fill-amber-300 text-amber-300' : 'text-zinc-500'}`} />
                  <span>100% 👑</span>
                </div>
              </div>

              <p className="text-[10px] font-bold text-zinc-400 text-center leading-tight">
                {dropletsText}
              </p>
            </div>
          </div>
        </div>

        {/* ── O'RTA BLOK: 4 TA BOSQICHLI QU VUR (PIPELINE) ── */}
        <div className="relative py-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {PIPELINE_STEPS.map((step, idx) => {
              const StepIcon = step.icon;
              return (
                <div
                  key={step.id}
                  className={`p-3.5 rounded-2xl border transition-all text-left flex flex-col justify-between ${
                    step.isCurrent
                      ? 'bg-zinc-900 border-orange-500/50 shadow-md shadow-orange-500/10 ring-1 ring-orange-500/30'
                      : step.isDone
                      ? 'bg-zinc-950/70 border-emerald-500/30 text-emerald-300'
                      : 'bg-zinc-950/50 border-white/5 opacity-70'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div
                      className={`size-7 rounded-xl flex items-center justify-center text-xs font-black ${
                        step.isDone
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : step.isCurrent
                          ? 'bg-orange-500 text-white'
                          : 'bg-zinc-900 text-zinc-500'
                      }`}
                    >
                      {step.isDone ? <CheckCircle2 className="size-4" /> : <StepIcon className="size-3.5" />}
                    </div>

                    <span className="text-[10px] font-mono font-bold text-zinc-500">
                      #{idx + 1}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-xs font-black text-white">{t(step.title)}</h4>
                    <p className="text-[10px] text-zinc-400 mt-0.5 line-clamp-1">{t(step.desc)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── PASTKI BLOK: YAGONA MAGNIT PULSATSIYALANUVCHI CTA TUGMASI ── */}
        <div className="relative pt-2">
          <Button
            type="button"
            onClick={() => setControllerOpen(true)}
            className={`w-full min-h-[58px] sm:min-h-[64px] h-auto py-2.5 sm:py-3 px-3.5 sm:px-6 rounded-2xl bg-gradient-to-r ${ctaGradient} hover:opacity-95 text-white font-black shadow-xl flex items-center justify-between gap-2.5 cursor-pointer transition-all active:scale-[0.99] group whitespace-normal max-w-full overflow-hidden`}
          >
            <div className="text-left flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
              <div className="size-8 sm:size-9 rounded-xl bg-white/20 flex items-center justify-center text-white shrink-0 group-hover:scale-110 transition-transform">
                <Play className="size-3.5 sm:size-4 fill-current text-amber-200" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs sm:text-sm font-black leading-tight tracking-tight break-words">
                  {t(ctaTitle)}
                </div>
                <div className="text-[10px] sm:text-[11px] text-white/80 font-normal leading-tight mt-0.5 break-words">
                  {t(ctaSubtitle)}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-1.5 text-xs font-bold text-white/90 shrink-0">
              <span className="hidden sm:inline">{t('Boshlash')}</span>
              <div className="size-7 sm:size-auto rounded-lg bg-white/15 sm:bg-transparent flex items-center justify-center">
                <ArrowRight className="size-3.5 sm:size-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Button>
        </div>
      </div>

      {/* Avtopilot Konveyerining to'liq ekranni qamrovchi fokus oynasi */}
      <AnimatePresence>
        {controllerOpen && (
          <ContinuousLoopController onClose={() => setControllerOpen(false)} />
        )}
      </AnimatePresence>
    </>
  );
}
