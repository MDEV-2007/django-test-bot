'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Gift, Trophy, Sparkles, Coins, Zap, Droplets,
  Share2, ArrowRight, RotateCcw, CheckCircle2,
  Check, Flame, Swords, ShieldAlert
} from 'lucide-react';
import { soundFX } from '@/lib/soundFX';
import { tgHaptic } from '@/lib/telegram';

interface Stage5RewardCeremonyProps {
  comboMultiplier: number;
  dtmScoreDelta: number;
  coinsEarned: number;
  xpEarned: number;
  cycleNumber?: number;
  ecoTree: {
    growth_stage: number;
    stage_name: string;
    water_level: number;
    root_depth_xp: number;
  };
  onShareToFeed: (caption?: string) => Promise<boolean>;
  onRestartCycle: () => void;
  onFinishToDashboard: () => void;
  onStartBoss?: () => void;
}

export default function Stage5RewardCeremony({
  comboMultiplier,
  dtmScoreDelta,
  coinsEarned,
  xpEarned,
  cycleNumber = 1,
  ecoTree,
  onShareToFeed,
  onRestartCycle,
  onFinishToDashboard,
  onStartBoss,
}: Stage5RewardCeremonyProps) {
  const [chestOpened, setChestOpened] = useState(false);
  const [shared, setShared] = useState(false);
  const [sharing, setSharing] = useState(false);

  // 5-Soniyalik Avtopilot Tramplini (Keyingi raundga avtomatik o'tish)
  const [countdown, setCountdown] = useState(5);
  const [timerActive, setTimerActive] = useState(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handleOpenChest = () => {
    soundFX.celebrate();
    tgHaptic('success');
    setChestOpened(true);
  };

  const handleShare = async () => {
    if (shared || sharing) return;
    setSharing(true);
    const ok = await onShareToFeed();
    if (ok) setShared(true);
    setSharing(false);
  };

  // Bekor qilingani ref'da ham saqlanadi: state yangilanishi kechiksa ham, allaqachon
  // navbatga tushgan tik keyingi raundni boshlab yubormasin.
  const cancelledRef = useRef(false);
  const firedRef = useRef(false);

  const cancelTimer = () => {
    cancelledRef.current = true;
    setTimerActive(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  // 5 soniyalik avtopilot taymeri (1- va 2-raundlar tugaganda). Taymer faqat sanaydi;
  // raundni boshlash pastdagi alohida effektda. Ilgari `onRestartCycle` setState
  // updater ichida chaqirilardi — StrictMode'da ikki marta ishlardi va "To'xtatish"
  // bosilgandan keyin ham raund boshlanib ketardi.
  useEffect(() => {
    if (!(chestOpened && cycleNumber < 3 && timerActive)) return;
    setCountdown(5);
    timerRef.current = setInterval(() => {
      setCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [chestOpened, cycleNumber, timerActive]);

  useEffect(() => {
    if (countdown !== 0 || !timerActive || cancelledRef.current || firedRef.current) return;
    if (!(chestOpened && cycleNumber < 3)) return;
    firedRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);
    onRestartCycle();
  }, [countdown, timerActive, chestOpened, cycleNumber, onRestartCycle]);

  // Suv hisobi (Raund 1: 35%, Raund 2: 70%, Raund 3: 100%)
  const waterLevel = cycleNumber >= 3 ? 100 : cycleNumber === 2 ? 70 : 35;
  const stageName = cycleNumber >= 3 ? 'Chinor' : cycleNumber === 2 ? "Ko'chat" : 'Nihol';
  const treeArt = cycleNumber >= 3 ? 'tree-5-chinor.svg' : cycleNumber === 2 ? 'tree-3-kochat.svg' : 'tree-2-nihol.svg';

  const nextRound =
    cycleNumber === 1
      ? { tone: 'bg-[var(--ps-orange)] text-[#080808]', chip: '2.0x super-combo', text: <>Daraxtingiz <b>35% suv</b> oldi. Hoziroq 2-raundni <b>2 barobar ko&apos;p XP</b> bilan boshlaymizmi?</>, cta: '2-raundni boshlash' }
      : cycleNumber === 2
        ? { tone: 'bg-[var(--ps-coral)] text-white', chip: '2.5x ultra-combo', text: <>Daraxtingiz <b>70% suv</b> oldi. 100% ga chiqib, daraxtni chinorga aylantirish va <b>kunlik boss sinovini</b> ochish uchun 3-raundni boshlang!</>, cta: '3-raundni boshlash' }
        : null;

  const rewards = [
    { icon: Coins, tone: 'bg-[var(--ps-orange)] text-[#080808]', value: `+${coinsEarned}`, label: 'Tanga' },
    { icon: Zap, tone: 'bg-[var(--ps-purple)] text-white', value: `+${xpEarned}`, label: 'XP' },
    { icon: Trophy, tone: 'bg-[var(--ps-green)] text-white', value: `+${dtmScoreDelta.toFixed(1)}`, label: 'DTM ball' },
    { icon: Sparkles, tone: 'bg-[var(--ps-lilac)] text-[#080808]', value: '+1', label: 'AI esse krediti' },
  ];

  return (
    <div className="relative mx-auto w-full max-w-xl px-1 py-2 text-center">
      {!chestOpened ? (
        /* ── 1. Sandiqni ochish ── */
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="ps-card relative overflow-hidden !rounded-[36px] p-6 sm:p-8">
          <span aria-hidden className="pointer-events-none absolute -right-14 -top-14 size-44 rounded-full bg-[var(--ps-orange)] opacity-20" />
          <span aria-hidden className="pointer-events-none absolute -bottom-16 -left-10 size-44 rounded-full bg-[var(--ps-purple)] opacity-10" />
          <span className="relative inline-flex items-center gap-1.5 rounded-full bg-[var(--ps-green)] px-3 py-1.5 text-[11.5px] font-black uppercase tracking-wider text-white">
            <Check className="size-3.5 stroke-[3]" /> Raund #{cycleNumber} yopildi
          </span>
          <h2 className="ps-display relative mt-4 text-[28px] sm:text-[36px]">
            Tabriklaymiz! <span className="text-[var(--ps-orange)]">Sandiq</span> tayyor
          </h2>
          <p className="relative mx-auto mt-2 max-w-md text-[14px] text-[var(--text-secondary)]">
            4 bosqichni uzluksiz bajardingiz. Sandiqni oching va daraxtingizga suv quying!
          </p>

          <motion.button
            type="button"
            animate={{ rotate: [-3, 3, -3], scale: [1, 1.04, 1] }}
            transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
            onClick={handleOpenChest}
            aria-label="Sandiqni ochish"
            className="relative mx-auto mt-6 grid size-40 cursor-pointer place-items-center rounded-full bg-[var(--ps-orange)] shadow-[0_30px_60px_-30px_rgba(255,184,46,0.9)] sm:size-48"
          >
            <span className="absolute inset-3 rounded-full bg-[#FFFCF7]" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/gamification/chest-closed.svg" alt="" className="relative size-24 object-contain sm:size-28" />
          </motion.button>

          <button type="button" onClick={handleOpenChest} className="ps-btn ps-btn-ink relative mt-6 w-full !min-h-14">
            <Gift className="size-4 text-[var(--ps-orange)]" />
            Sandiqni ochish · +{coinsEarned} tanga
            <span className="ps-btn-arrow"><ArrowRight className="size-4" /></span>
          </button>
        </motion.div>
      ) : (
        /* ── 2. Sandiq ochildi ── */
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }} className="space-y-3 text-left">
          <div className="text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--ps-green)] px-3 py-1.5 text-[11.5px] font-black uppercase tracking-wider text-white">
              <Sparkles className="size-3.5" /> Sandiq ochildi · raund #{cycleNumber}
            </span>
            <h2 className="ps-display mt-3 text-[28px] sm:text-[36px]">
              G&apos;alaba va <span className="text-[var(--ps-green)]">rivojlanish</span>
              <span className="text-[var(--ps-coral)]">!</span>
            </h2>
          </div>

          {/* Daraxt */}
          <section className="relative overflow-hidden rounded-[28px] bg-[var(--ps-green)] p-5 text-white">
            <span aria-hidden className="absolute -right-8 -top-8 size-28 rounded-full bg-white/15" />
            <div className="relative flex items-center gap-3.5">
              <span className="inline-flex size-16 shrink-0 items-center justify-center rounded-full bg-[#FFFCF7]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/brand/gamification/${treeArt}`} alt="" className="size-12 object-contain" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[12px] font-bold text-white/80">Ilm Ildizi daraxti</span>
                  <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-black uppercase">{stageName}</span>
                </div>
                <p className="mt-0.5 font-[family-name:var(--font-grotesk)] text-[22px] font-bold leading-tight">
                  +35% suv · jami {waterLevel}%
                </p>
              </div>
            </div>
            <div className="relative mt-4 h-3 overflow-hidden rounded-full bg-white/20">
              <motion.div
                className="h-full rounded-full bg-[#FFFCF7]"
                initial={{ width: `${Math.max(0, waterLevel - 35)}%` }}
                animate={{ width: `${waterLevel}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </div>
            <div className="relative mt-3 grid grid-cols-3 gap-1.5">
              {[1, 2, 3].map((r) => (
                <span
                  key={r}
                  className={`inline-flex items-center justify-center gap-1 rounded-full py-1.5 text-[12px] font-bold ${
                    cycleNumber >= r ? (r === 3 ? 'bg-[var(--ps-orange)] text-[#080808]' : 'bg-[#FFFCF7] text-[var(--ps-green)]') : 'bg-white/15 text-white/75'
                  }`}
                >
                  <Droplets className="size-3.5" /> {r}-raund
                </span>
              ))}
            </div>
          </section>

          {/* Mukofotlar */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {rewards.map((r) => {
              const Icon = r.icon;
              return (
                <div key={r.label} className="rounded-[22px] bg-[var(--ps-paper)] p-3 text-center shadow-sm">
                  <span className={`mx-auto inline-flex size-9 items-center justify-center rounded-full ${r.tone}`}>
                    <Icon className="size-4" />
                  </span>
                  <p className="ps-num mt-1.5 text-[20px] leading-none">{r.value}</p>
                  <p className="mt-1 text-[11.5px] font-bold text-[var(--text-muted)]">{r.label}</p>
                </div>
              );
            })}
          </div>

          {/* Lentaga ulashish */}
          <section className="flex flex-col items-start justify-between gap-3 rounded-[24px] bg-[var(--ps-paper)] p-4 shadow-sm sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--ps-blue)] text-[#080808]">
                <Share2 className="size-4" />
              </span>
              <div>
                <p className="text-[14px] font-bold">Hamjamiyatga ulashish</p>
                <p className="text-[12.5px] text-[var(--text-muted)]">Bugungi g&apos;alabangizni e&apos;lon qiling va bonus XP oling.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleShare}
              disabled={shared || sharing}
              className={`inline-flex h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-4 text-[12.5px] font-bold transition-all ${
                shared ? 'bg-[var(--ps-green)] text-white' : 'bg-[#080808] text-[#FFFCF7] dark:bg-[#FFFCF7] dark:text-[#080808]'
              }`}
            >
              {shared ? <><Check className="size-4 stroke-[3]" /> Ulashildi · +15 XP</> : <><Share2 className="size-3.5" /> {sharing ? 'Chiqarilmoqda...' : 'Lentaga ulashish · +15 XP'}</>}
            </button>
          </section>

          {/* Keyingi raund avtopiloti */}
          {nextRound && (
            <section className="ps-card space-y-3 !rounded-[28px] p-4 sm:p-5">
              <div className="flex items-center justify-between gap-2">
                <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11.5px] font-black uppercase ${nextRound.tone}`}>
                  <Flame className="size-3.5 fill-current" /> {nextRound.chip}
                </span>
                {timerActive && (
                  <span className="rounded-full bg-[var(--ps-neutral)] px-2.5 py-1 text-[12px] font-bold tabular-nums">Avtostart: {countdown}s</span>
                )}
              </div>
              <p className="text-[13.5px] leading-snug text-[var(--text-secondary)]">{nextRound.text}</p>
              {timerActive && (
                <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--ds-track)]">
                  <motion.div className="h-full rounded-full bg-[var(--ps-purple)]" initial={{ width: '100%' }} animate={{ width: '0%' }} transition={{ duration: 5, ease: 'linear' }} />
                </div>
              )}
              <div className="flex items-center gap-2">
                <button type="button" onClick={onRestartCycle} className="ps-btn ps-btn-ink flex-1">
                  {nextRound.cta}{timerActive ? ` · ${countdown}s` : ''}
                  <span className="ps-btn-arrow"><ArrowRight className="size-4" /></span>
                </button>
                {timerActive && (
                  <button type="button" onClick={cancelTimer} className="ps-btn ps-btn-ghost !px-4">
                    To&apos;xtatish
                  </button>
                )}
              </div>
            </section>
          )}

          {cycleNumber >= 3 && (
            <section className="relative space-y-3 overflow-hidden rounded-[28px] bg-[var(--ps-purple)] p-4 text-white sm:p-5">
              <span aria-hidden className="absolute -right-10 -top-10 size-32 rounded-full bg-white/15" />
              <div className="relative flex items-center gap-3">
                <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-[var(--ps-orange)] text-[#080808]">
                  <Trophy className="size-5" />
                </span>
                <div>
                  <p className="font-[family-name:var(--font-grotesk)] text-[17px] font-bold leading-tight">Daraxt 100% sug&apos;orildi va chinorga aylandi!</p>
                  <p className="mt-0.5 text-[12.5px] text-white/80">Bugungi 60 daqiqalik marafonning 3 ta raundini to&apos;liq yopdingiz.</p>
                </div>
              </div>
              <div className="relative flex items-center gap-3 rounded-[20px] bg-white/15 p-3">
                <ShieldAlert className="size-5 shrink-0" />
                <p className="text-[12.5px]"><b className="block">Kunlik boss sinovi ochildi!</b> 15 daqiqalik mini-BMB stress sinovi orqali super-reyting oling.</p>
              </div>
              <button type="button" onClick={onStartBoss || onRestartCycle} className="ps-btn ps-btn-light relative w-full">
                <Swords className="size-4" /> Boss sinovini boshlash
                <span className="ps-btn-arrow"><ArrowRight className="size-4" /></span>
              </button>
            </section>
          )}

          <button type="button" onClick={onFinishToDashboard} className="ps-btn ps-btn-ghost w-full">
            <CheckCircle2 className="size-4 text-[var(--ps-green)]" /> Dashboardga qaytish
          </button>
        </motion.div>
      )}
    </div>
  );
}
