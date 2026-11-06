'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap, Flame, Trophy, Gift, ArrowRight, Play,
  CheckCircle2, Droplets, Sparkles,
  ShieldCheck, Brain, Swords, Clock
} from 'lucide-react';
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
  const { loop, topic, ecoTree, loading, error, fetchLoop } = useContinuousLoop();
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

  const STEP_TONES = [
    'bg-[var(--ps-purple)] text-white',
    'bg-[var(--ps-coral)] text-white',
    'bg-[var(--ps-orange)] text-[#080808]',
    'bg-[var(--ps-green)] text-white',
  ];
  const drops = [
    { label: '35%', done: drop1Done, current: cycleNumber === 1 && !drop1Done, icon: Droplets },
    { label: '70%', done: drop2Done, current: cycleNumber === 2 && !drop2Done, icon: Droplets },
    { label: '100% 👑', done: drop3Done, current: cycleNumber >= 3 && !drop3Done, icon: Sparkles },
  ];

  return (
    <>
      <section className="ps-card relative overflow-hidden !rounded-[36px] p-5 sm:p-8">
        <span aria-hidden className="pointer-events-none absolute -right-16 -top-16 size-52 rounded-full bg-[var(--ps-purple)] opacity-10" />
        <span aria-hidden className="pointer-events-none absolute -bottom-20 -left-10 size-44 rounded-full bg-[var(--ps-orange)] opacity-10" />

        {loading && (
          <div className="relative mb-4 inline-flex animate-pulse items-center rounded-full bg-[var(--ps-neutral)] px-4 py-2 text-[12px] font-bold text-[var(--text-secondary)]">
            {t("Kunlik marafon holati yuklanmoqda...")}
          </div>
        )}

        {!loading && error && (
          <div className="relative mb-4 flex items-center justify-between gap-2 rounded-full bg-[var(--ps-orange)] py-1.5 pl-4 pr-1.5 text-[12.5px] font-semibold text-[#080808]">
            <span>{t("Server bilan aloqa uzildi — demo/oflayn rejim faol.")}</span>
            <button
              type="button"
              onClick={() => fetchLoop()}
              className="shrink-0 cursor-pointer rounded-full bg-[#080808] px-3 py-1.5 text-[12px] font-bold text-[#FFFCF7]"
            >
              {t("Qayta urinish")}
            </button>
          </div>
        )}

        {/* ── YUQORI BLOK ── */}
        <div className="relative grid gap-5 lg:grid-cols-[1.4fr_1fr] lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--ps-coral)] px-3 py-1 text-[11.5px] font-black uppercase text-white">
                <Flame className="size-3.5 fill-current" />
                {userStreak} {t("kunlik olovli zanjir")}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--ps-orange)] px-3 py-1 text-[11.5px] font-bold text-[#080808]">
                {t('Raund')} {cycleNumber}/3 <span className="opacity-70">· {t('60 daqiqalik marafon')}</span>
              </span>
              {topic && (
                <span className="ps-chip">
                  {t('Mavzu')}: <strong>{t(topic.title)}</strong>
                </span>
              )}
            </div>

            <h2 className="ps-display mt-4 text-[32px] sm:text-[42px]">
              {t('Xayrli kun')}, <span className="text-[var(--ps-purple)]">{userName}</span>
              <span className="text-[var(--ps-coral)]">!</span>
            </h2>
            <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-[var(--text-secondary)]">
              {t("3 raundlik uzluksiz marafonni yoping, Sirli Sandiq oching va Chinor darajasiga yetib Boss sinovini oching!")}
            </p>
          </div>

          {/* Eco-daraxt vidjeti */}
          <div className="relative overflow-hidden rounded-[28px] bg-[var(--ps-green)] p-5 text-white">
            <span aria-hidden className="absolute -right-8 -top-8 size-28 rounded-full bg-white/15" />
            <span aria-hidden className="ps-dots absolute bottom-0 right-0 h-14 w-28 opacity-20" />
            <div className="relative flex items-center gap-3">
              <span className="inline-flex size-14 shrink-0 items-center justify-center rounded-full bg-[#FFFCF7]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/brand/gamification/${TREE_ART[Math.min(completedRounds, 3)]}`} alt="" className="size-11 object-contain" />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[12px] font-bold text-white/80">{t('Ilm Ildizi')}:</span>
                  <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[11.5px] font-black uppercase">{t(displayStageName)}</span>
                </div>
                <p className="mt-1 font-[family-name:var(--font-grotesk)] text-[26px] font-bold leading-none">
                  {displayWater}%<span className="ml-1 text-[13px] font-semibold opacity-80">suv · Raund {cycleNumber}/3</span>
                </p>
              </div>
            </div>

            <div className="relative mt-4 grid grid-cols-3 gap-1.5">
              {drops.map((d) => {
                const Icon = d.icon;
                return (
                  <span
                    key={d.label}
                    className={`inline-flex items-center justify-center gap-1 rounded-full py-1.5 text-[12px] font-bold ${
                      d.done
                        ? 'bg-[#FFFCF7] text-[var(--ps-green)]'
                        : d.current
                          ? 'bg-[var(--ps-orange)] text-[#080808]'
                          : 'bg-white/15 text-white/80'
                    }`}
                  >
                    <Icon className={`size-3.5 ${d.done ? 'fill-current' : ''}`} />
                    {d.label}
                  </span>
                );
              })}
            </div>
            <p className="relative mt-2.5 text-center text-[11.5px] font-semibold leading-snug text-white/85">{dropletsText}</p>
          </div>
        </div>

        {/* ── 4 BOSQICH ── */}
        <div className="relative mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          {PIPELINE_STEPS.map((step, idx) => {
            const StepIcon = step.icon;
            return (
              <div
                key={step.id}
                className={`relative flex min-h-[132px] flex-col justify-between overflow-hidden rounded-[24px] p-4 transition-transform hover:-translate-y-0.5 ${
                  step.isCurrent
                    ? 'bg-[#080808] text-[#FFFCF7] dark:bg-[#FFFCF7] dark:text-[#080808]'
                    : step.isDone
                      ? 'bg-[var(--ps-green)] text-white'
                      : 'bg-[var(--ps-neutral)] text-[var(--text-primary)]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`inline-flex size-10 items-center justify-center rounded-full ${
                      step.isDone ? 'bg-white/25' : step.isCurrent ? STEP_TONES[idx] : 'bg-[var(--ps-paper)] text-[var(--text-secondary)]'
                    }`}
                  >
                    {step.isDone ? <CheckCircle2 className="size-5" /> : <StepIcon className="size-[18px]" />}
                  </span>
                  <span className={`font-[family-name:var(--font-grotesk)] text-[22px] font-bold leading-none ${step.isCurrent || step.isDone ? 'opacity-50' : 'text-[var(--text-faint)]'}`}>
                    0{idx + 1}
                  </span>
                </div>
                <div className="mt-3">
                  <h4 className="text-[14px] font-bold leading-tight">{t(step.title.replace(/^\d+\.\s*/, ''))}</h4>
                  <p className={`mt-1 line-clamp-2 text-[12px] leading-snug ${step.isCurrent || step.isDone ? 'opacity-75' : 'text-[var(--text-muted)]'}`}>{t(step.desc)}</p>
                </div>
                {step.isCurrent && (
                  <span className="absolute right-3 top-14 rounded-full bg-[var(--ps-orange)] px-2 py-0.5 text-[10px] font-black uppercase text-[#080808]">
                    Hozir
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* ── CTA ── */}
        <button
          type="button"
          onClick={() => setControllerOpen(true)}
          className="group relative mt-5 flex w-full cursor-pointer items-center justify-between gap-3 overflow-hidden rounded-[28px] bg-[var(--ps-purple)] p-3 pr-4 text-left text-white transition-transform hover:-translate-y-0.5 active:scale-[0.99] sm:p-4 sm:pr-5"
        >
          <span aria-hidden className="absolute -right-8 -top-10 size-32 rounded-full bg-white/10" />
          <span className="relative flex min-w-0 items-center gap-3">
            <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-full bg-[#FFFCF7] text-[var(--ps-purple)] transition-transform group-hover:scale-110">
              <Play className="size-5 fill-current" />
            </span>
            <span className="min-w-0">
              <span className="block font-[family-name:var(--font-grotesk)] text-[17px] font-bold leading-tight sm:text-[19px]">{t(ctaTitle)}</span>
              <span className="mt-0.5 block text-[12.5px] font-semibold text-white/80">{t(ctaSubtitle)}</span>
            </span>
          </span>
          <span className="relative inline-flex shrink-0 items-center gap-2 text-[13px] font-bold">
            <span className="hidden sm:inline">{t('Boshlash')}</span>
            <span className="inline-flex size-10 items-center justify-center rounded-full bg-[var(--ps-orange)] text-[#080808] transition-transform group-hover:translate-x-1">
              <ArrowRight className="size-4" />
            </span>
          </span>
        </button>
      </section>

      {/* Avtopilot Konveyerining to'liq ekranni qamrovchi fokus oynasi */}
      <AnimatePresence>
        {controllerOpen && (
          <ContinuousLoopController onClose={() => setControllerOpen(false)} />
        )}
      </AnimatePresence>
    </>
  );
}
