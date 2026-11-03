'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap, Flame, Trophy, Gift, ArrowRight, Play,
  CheckCircle2, Droplets, Sparkles,
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

// Brand illustrations for the eco-tree stage shown in the loop card.
const TREE_ART = ['tree-2-nihol.svg', 'tree-3-kochat.svg', 'tree-4-daraxt.svg', 'tree-5-chinor.svg'];

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

  // Asosiy tugma matni. Rang har doim brand: bu sahifadagi yagona asosiy harakat.
  let ctaTitle = "🚀 60 Daqiqalik Marafon";
  let ctaSubtitle = "1-Raund (15 daq) • 4 bosqich • Daraxtga +35% suv";

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
    } else if (cycleNumber === 2) {
      ctaTitle = "⚡ 2-Raund Yopildi! 3-Raundni Boshlash";
      ctaSubtitle = "Daraxtingiz 70% suv oldi • 2.5x Ultra-Combo";
    } else {
      ctaTitle = "⚔️ Kunlik Boss: 15 daqiqalik Sinov";
      ctaSubtitle = "3/3 Marafon yopildi! Chinor Boss sinovi";
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
      <div className="relative overflow-hidden rounded-2xl border border-[var(--brand-border)] bg-card p-4 sm:p-6 shadow-[var(--shadow-card)]">
        {/* Orqa fon nuri (brand) */}
        <div className="pointer-events-none absolute -top-24 -left-20 size-64 rounded-full bg-[var(--brand-soft)] blur-[80px]" />

        {/* ── YUQORI BLOK: SALOMLASHISH VA ECO-DARAXT STATISTIKASI ── */}
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-border">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold uppercase bg-[var(--tone-streak-soft)] text-[var(--tone-streak-text)] border border-[var(--tone-streak)]/30">
                <Flame className="size-3.5 fill-current" />
                <span>{userStreak} {t("kunlik olovli zanjir")}</span>
              </span>

              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[var(--reward-soft)] text-[var(--reward-text)] border border-[var(--reward-border)]">
                <span>{t('Raund')} {cycleNumber}/3</span>
                <span className="text-[12px] opacity-75">({t('60 daqiqalik marafon')})</span>
              </span>

              {topic && (
                <span className="text-xs font-semibold text-muted-foreground">
                  • {t('Mavzu')}: <strong className="text-foreground">{t(topic.title)}</strong>
                </span>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
              {t('Xayrli kun')}, {userName}! 🎯
            </h2>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
              {t("3 raundlik uzluksiz marafonni yoping, Sirli Sandiq oching va Chinor darajasiga yetib Boss sinovini oching!")}
            </p>
          </div>

          {/* Eco-Tree Multi-Round Vidjeti */}
          <div className="flex flex-col gap-2 p-3 sm:px-4 sm:py-3 rounded-xl bg-[var(--surface-input)] border border-[var(--brand-border)] shrink-0">
            <div className="flex items-center gap-3">
              <div className="size-11 rounded-xl bg-[var(--brand-soft)] border border-[var(--brand-border)] flex items-center justify-center text-[var(--brand-text)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/brand/gamification/${TREE_ART[Math.min(completedRounds, 3)]}`}
                  alt=""
                  className="size-10 object-contain"
                />
              </div>
              <div className="text-left">
                <div className="flex items-center gap-1.5">
                  <span className="text-[12px] font-bold text-[var(--text-secondary)]">{t('Ilm Ildizi')}:</span>
                  <span className="text-[12px] font-bold uppercase text-[var(--brand-text)] bg-[var(--brand-soft)] px-2 py-0.5 rounded-md border border-[var(--brand-border)]">
                    {t(displayStageName)}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs font-bold tabular-nums text-[var(--tone-lesson-text)] flex items-center gap-0.5">
                    <Droplets className="size-3" />
                    {displayWater}% suv
                  </span>
                  <span className="text-[12px] text-muted-foreground font-semibold">• Raund {cycleNumber}/3</span>
                </div>
              </div>
            </div>

            {/* 3 ta Kichik Oltin Tomchi Indikatori */}
            <div className="pt-2 border-t border-border space-y-1.5">
              <div className="flex items-center gap-1.5">
                {/* 1-Tomchi (Raund 1: 35%) */}
                <div
                  className={`flex-1 flex items-center justify-center gap-1 py-1 px-1.5 rounded-lg text-[12px] font-bold transition-all border ${
                    drop1Done
                      ? 'bg-[var(--tone-lesson-soft)] border-[var(--tone-lesson)]/40 text-[var(--tone-lesson-text)]'
                      : cycleNumber === 1
                      ? 'bg-[var(--reward-soft)] border-[var(--reward-border)] text-[var(--reward-text)]'
                      : 'bg-card border-border text-muted-foreground'
                  }`}
                >
                  <Droplets className={`size-3 ${drop1Done ? 'fill-current' : ''}`} />
                  <span>35%</span>
                </div>

                {/* 2-Tomchi (Raund 2: 70%) */}
                <div
                  className={`flex-1 flex items-center justify-center gap-1 py-1 px-1.5 rounded-lg text-[12px] font-bold transition-all border ${
                    drop2Done
                      ? 'bg-[var(--tone-lesson-soft)] border-[var(--tone-lesson)]/40 text-[var(--tone-lesson-text)]'
                      : cycleNumber === 2
                      ? 'bg-[var(--reward-soft)] border-[var(--reward-border)] text-[var(--reward-text)]'
                      : 'bg-card border-border text-muted-foreground'
                  }`}
                >
                  <Droplets className={`size-3 ${drop2Done ? 'fill-current' : ''}`} />
                  <span>70%</span>
                </div>

                {/* 3-Tomchi (Raund 3: 100% + Boss) */}
                <div
                  className={`flex-1 flex items-center justify-center gap-1 py-1 px-1.5 rounded-lg text-[12px] font-bold transition-all border ${
                    drop3Done
                      ? 'bg-[var(--reward-soft)] border-[var(--reward-border)] text-[var(--reward-text)]'
                      : cycleNumber >= 3
                      ? 'bg-[var(--reward-soft)] border-[var(--reward-border)] text-[var(--reward-text)]'
                      : 'bg-card border-border text-muted-foreground'
                  }`}
                >
                  <Sparkles className={`size-3 ${drop3Done ? 'fill-current' : ''}`} />
                  <span>100% 👑</span>
                </div>
              </div>

              <p className="text-[12px] font-bold text-muted-foreground text-center leading-tight">
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
                      ? 'bg-card border-[var(--brand)] ring-1 ring-[var(--brand-border)]'
                      : step.isDone
                      ? 'bg-[var(--brand-soft)] border-[var(--brand-border)]'
                      : 'bg-[var(--surface-input)] border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div
                      className={`size-7 rounded-xl flex items-center justify-center text-xs font-bold ${
                        step.isDone
                          ? 'bg-[var(--brand-soft)] text-[var(--brand-text)]'
                          : step.isCurrent
                          ? 'bg-[var(--brand)] text-[var(--on-brand)]'
                          : 'bg-card text-muted-foreground'
                      }`}
                    >
                      {step.isDone ? <CheckCircle2 className="size-4" /> : <StepIcon className="size-3.5" />}
                    </div>

                    <span className="text-[12px] font-bold tabular-nums text-muted-foreground">
                      #{idx + 1}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-foreground">{t(step.title)}</h4>
                    <p className="text-[12px] text-muted-foreground mt-0.5 line-clamp-1">{t(step.desc)}</p>
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
            className={`w-full min-h-[58px] sm:min-h-[64px] h-auto py-2.5 sm:py-3 px-3.5 sm:px-6 rounded-xl bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-[var(--on-brand)] font-bold shadow-[0_10px_24px_-10px_rgba(45,106,79,0.7)] flex items-center justify-between gap-2.5 cursor-pointer transition-all active:scale-[0.99] group whitespace-normal max-w-full overflow-hidden`}
          >
            <div className="text-left flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
              <div className="size-8 sm:size-9 rounded-xl bg-white/20 flex items-center justify-center text-white shrink-0 group-hover:scale-110 transition-transform">
                <Play className="size-3.5 sm:size-4 fill-current" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs sm:text-sm font-bold leading-tight tracking-tight break-words">
                  {t(ctaTitle)}
                </div>
                <div className="text-[12px] text-white/90 font-normal leading-tight mt-0.5 break-words">
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
