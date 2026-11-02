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

interface MagneticLoopCardProps {
  userName?: string;
  userStreak?: number;
}

export default function MagneticLoopCard({
  userName = "Abituriyent",
  userStreak = 7,
}: MagneticLoopCardProps) {
  const [controllerOpen, setControllerOpen] = useState(false);
  const { loop, topic, ecoTree, loading } = useContinuousLoop();

  // Bosqich holati va matni
  const currentStage = loop?.current_stage || 'STAGE_1_WARMUP';
  const combo = loop?.combo_multiplier || 1.0;
  const isCompleted = currentStage === 'STAGE_5_COMPLETED';

  // Asosiy tugma matni va gradienti
  let ctaTitle = "🚀 Kunlik Zanjirni Boshlash (1-Qadam: 60s Shpargalka & Sprint)";
  let ctaSubtitle = "10 daqiqalik yopiq sikl • 4 bosqich • Sirli Sandiq va Daraxt o'sishi";
  let ctaGradient = "from-orange-500 via-rose-500 to-rose-600 shadow-rose-600/30";

  if (currentStage === 'STAGE_2_SPRINT') {
    ctaTitle = `⚡ Zanjirni Davom Ettirish (2-Qadam: Jonli Sprint • ${combo.toFixed(1)}x Combo)`;
    ctaSubtitle = "10-15 ta tezkor savol • Qasos zanjiri faol";
  } else if (currentStage === 'STAGE_3_CLEANUP') {
    const mistakeCount = loop?.session_mistakes_ids?.length || 2;
    ctaTitle = `🧹 Zanjirni Davom Ettirish (3-Qadam: ${mistakeCount} ta Xatoni Tozalash • ${combo.toFixed(1)}x)`;
    ctaSubtitle = "90 soniyalik Flashcard tozalash • Xatolar Dueli";
  } else if (currentStage === 'STAGE_4_ARENA') {
    ctaTitle = `🔥 Zanjirni Davom Ettirish (4-Qadam: 1v1 Ghost Arena Dueli • ${combo.toFixed(1)}x)`;
    ctaSubtitle = "60 soniyalik jonli bellashuv • So'nggi qadam!";
  } else if (isCompleted) {
    ctaTitle = "🎁 Bugungi Sikl Yopildi! (2.5x Super-Combo bilan 2-Siklni Boshlash)";
    ctaSubtitle = `+${loop?.dtm_score_delta.toFixed(1) || '2.4'} DTM ball olindi • Eco-Daraxtingiz sug'orildi`;
    ctaGradient = "from-emerald-500 via-teal-600 to-cyan-600 shadow-teal-500/30";
  }

  const PIPELINE_STEPS = [
    {
      id: 'step1',
      title: '1. Shpargalka & Sprint',
      desc: '60s tayyorgarlik va 10 ta savol',
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
      desc: '+200 Tanga, XP & Suv quyish',
      icon: Gift,
      isDone: isCompleted,
      isCurrent: isCompleted,
    },
  ];

  return (
    <>
      <div className="relative overflow-hidden rounded-[28px] border border-orange-500/30 bg-gradient-to-b from-zinc-900/90 via-zinc-950 to-zinc-900/95 p-5 sm:p-7 shadow-2xl backdrop-blur-xl">
        {/* Orqa fon nurlari */}
        <div className="pointer-events-none absolute -top-24 -left-20 size-64 rounded-full bg-orange-500/15 blur-[80px]" />
        <div className="pointer-events-none absolute -bottom-24 -right-20 size-64 rounded-full bg-rose-500/15 blur-[80px]" />

        {/* ── YUQORI BLOK: SALOMLASHISH VA ECO-DARAXT STATISTIKASI ── */}
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-white/10">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-black uppercase bg-orange-500/20 text-orange-400 border border-orange-500/30">
                <Flame className="size-3.5 fill-current" />
                <span>{userStreak} kunlik olovli zanjir</span>
              </span>

              {topic && (
                <span className="text-xs font-semibold text-zinc-400">
                  • Bugungi mavzu: <strong className="text-white">{topic.title}</strong>
                </span>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Xayrli kun, {userName}! 🎯
            </h2>
            <p className="text-xs sm:text-sm text-zinc-300">
              Kunlik 4 bosqichli uzluksiz zanjirni bajaring va <strong className="text-amber-400">Sirli Sandiq</strong> hamda <strong className="text-emerald-400">Eco-Daraxtingiz</strong>ni sug'oring.
            </p>
          </div>

          {/* Eco-Tree Widget mini */}
          <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl bg-zinc-950/80 border border-emerald-500/30 shrink-0">
            <div className="size-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-sm">
              <TreeDeciduous className="size-5" />
            </div>
            <div className="text-left">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-zinc-300">Ilm Ildizi:</span>
                <span className="text-[10px] font-black uppercase text-emerald-400 bg-emerald-500/20 px-1.5 py-0.2 rounded">
                  {ecoTree.stage_name}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs font-mono font-bold text-sky-400 flex items-center gap-0.5">
                  <Droplets className="size-3 text-sky-400" />
                  {ecoTree.water_level}% suv
                </span>
                <span className="text-[10px] text-zinc-500">• {ecoTree.root_depth_xp} ildiz XP</span>
              </div>
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
                    <h4 className="text-xs font-black text-white">{step.title}</h4>
                    <p className="text-[10px] text-zinc-400 mt-0.5 line-clamp-1">{step.desc}</p>
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
            className={`w-full h-14 sm:h-16 rounded-2xl bg-gradient-to-r ${ctaGradient} hover:opacity-95 text-white font-black text-sm sm:text-base shadow-xl flex items-center justify-between px-5 sm:px-7 cursor-pointer transition-all active:scale-[0.99] group`}
          >
            <div className="text-left flex items-center gap-3">
              <div className="size-9 rounded-xl bg-white/20 flex items-center justify-center text-white shrink-0 group-hover:scale-110 transition-transform">
                <Play className="size-4 fill-current text-amber-200" />
              </div>
              <div>
                <div className="text-xs sm:text-sm font-black leading-tight tracking-tight">
                  {ctaTitle}
                </div>
                <div className="text-[11px] text-white/80 font-normal">
                  {ctaSubtitle}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-bold text-white/90 shrink-0">
              <span className="hidden sm:inline">Boshlash</span>
              <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
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
