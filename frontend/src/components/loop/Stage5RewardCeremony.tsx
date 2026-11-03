'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Gift, Trophy, Sparkles, Coins, Zap, Droplets,
  Share2, ArrowRight, RotateCcw, CheckCircle2,
  TreeDeciduous, Sprout, Check, Flame, Swords, ShieldAlert
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  const stageName = cycleNumber >= 3 ? "Chinor" : cycleNumber === 2 ? "Ko'chat" : "Nihol";

  return (
    <div className="relative w-full max-w-xl mx-auto py-4 px-3 sm:px-6 text-center">
      {/* Orqa fon zarhal nur */}
      <div className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 size-72 rounded-full bg-amber-500/25 blur-[90px]" />

      {!chestOpened ? (
        /* ── 1. SANDIQNI OCHISH BOSQICHI ── */
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-6"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider">
            <Trophy className="size-4 animate-bounce" />
            <span>Raund #{cycleNumber} To'liq Yopildi!</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            🎁 Tabriklaymiz! Oltin Sandiq Tayyor!
          </h2>
          <p className="text-sm text-zinc-300 max-w-md mx-auto">
            Siz ushbu 4 bosqichni uzluksiz bajardingiz. Sandiqni oching va Daraxtingizga suv quying!
          </p>

          {/* Titrab turuvchi Oltin Sandiq */}
          <motion.div
            animate={{
              rotate: [-2, 2, -2],
              scale: [1, 1.05, 1],
            }}
            transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
            onClick={handleOpenChest}
            className="mx-auto size-36 sm:size-44 rounded-3xl bg-gradient-to-br from-amber-400 via-orange-500 to-amber-600 p-1 shadow-2xl shadow-amber-500/30 cursor-pointer flex items-center justify-center group active:scale-95 transition-transform"
          >
            <div className="size-full rounded-[22px] bg-zinc-950/80 flex flex-col items-center justify-center gap-2">
              <Gift className="size-16 text-amber-400 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                Bosing va Oching!
              </span>
            </div>
          </motion.div>

          <Button
            type="button"
            onClick={handleOpenChest}
            className="h-13 px-8 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-bold text-base shadow-xl shadow-amber-500/30 cursor-pointer"
          >
            <Sparkles className="size-5 fill-current" />
            <span>Sandiqni Ochish (+{coinsEarned} Tanga)</span>
          </Button>
        </motion.div>
      ) : (
        /* ── 2. SANDIQ OCHILDI, SUV QUYILDI VA KEYINGI RAUND AVTOPILOTI ── */
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="space-y-5"
        >
          {/* Kulminatsiya Sarlavhasi */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
              <Sparkles className="size-3.5" />
              <span>Sandiq Ochildi • Raund #{cycleNumber} Yopildi</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              G'alaba va Rivojlanish! 🌳✨
            </h2>
          </div>

          {/* Eco-Tree Sug'orish Animatsiyasi */}
          <div className="relative overflow-hidden rounded-3xl border border-emerald-500/30 bg-gradient-to-b from-emerald-950/40 via-zinc-950 to-zinc-900 p-4 sm:p-5 shadow-xl text-left">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="size-13 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-inner shrink-0">
                  <TreeDeciduous className="size-7 animate-pulse text-emerald-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-zinc-400">Ilm Ildizi Daraxti</span>
                    <span className="text-[12px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      {stageName}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-white mt-0.5">
                    +35% Suv Quyildi! (Jami: {waterLevel}%) 💧
                  </p>
                </div>
              </div>

              {/* Suv Bar */}
              <div className="w-full sm:w-44 text-right">
                <div className="flex justify-between text-xs font-bold text-zinc-300 mb-1">
                  <span>Namlik</span>
                  <span className="text-sky-400 font-mono font-bold">{waterLevel}%</span>
                </div>
                <div className="h-2.5 w-full bg-zinc-800 rounded-full overflow-hidden border border-white/5">
                  <motion.div
                    className="h-full bg-gradient-to-r from-sky-500 via-teal-400 to-emerald-400 rounded-full"
                    initial={{ width: `${Math.max(0, waterLevel - 35)}%` }}
                    animate={{ width: `${waterLevel}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                  />
                </div>
              </div>
            </div>

            {/* 3 ta Oltin Tomchi Holati */}
            <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className={`size-2.5 rounded-full ${cycleNumber >= 1 ? 'bg-sky-400 shadow-sm shadow-sky-400' : 'bg-zinc-700'}`} />
                <span className={cycleNumber >= 1 ? 'text-sky-300 font-bold' : 'text-zinc-500'}>1-Raund (35%)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`size-2.5 rounded-full ${cycleNumber >= 2 ? 'bg-sky-400 shadow-sm shadow-sky-400' : 'bg-zinc-700'}`} />
                <span className={cycleNumber >= 2 ? 'text-sky-300 font-bold' : 'text-zinc-500'}>2-Raund (70%)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`size-2.5 rounded-full ${cycleNumber >= 3 ? 'bg-amber-400 shadow-sm shadow-amber-400' : 'bg-zinc-700'}`} />
                <span className={cycleNumber >= 3 ? 'text-amber-300 font-bold' : 'text-zinc-500'}>3-Raund (100% 👑)</span>
              </div>
            </div>
          </div>

          {/* Olingan mukofotlar kartochkalari */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-2xl bg-zinc-900/80 border border-amber-500/20 text-center">
              <Coins className="size-4.5 text-amber-400 mx-auto mb-1 fill-amber-400/20" />
              <div className="text-base font-bold text-amber-300 font-mono">
                +{coinsEarned}
              </div>
              <div className="text-[12px] font-bold text-zinc-400">Tanga</div>
            </div>

            <div className="p-3 rounded-2xl bg-zinc-900/80 border border-indigo-500/20 text-center">
              <Zap className="size-4.5 text-indigo-400 mx-auto mb-1 fill-indigo-400/20" />
              <div className="text-base font-bold text-indigo-300 font-mono">
                +{xpEarned}
              </div>
              <div className="text-[12px] font-bold text-zinc-400">XP Tajriba</div>
            </div>

            <div className="p-3 rounded-2xl bg-zinc-900/80 border border-emerald-500/20 text-center">
              <Trophy className="size-4.5 text-emerald-400 mx-auto mb-1" />
              <div className="text-base font-bold text-emerald-300 font-mono">
                +{dtmScoreDelta.toFixed(1)}
              </div>
              <div className="text-[12px] font-bold text-zinc-400">DTM Ball</div>
            </div>

            <div className="p-3 rounded-2xl bg-zinc-900/80 border border-purple-500/20 text-center">
              <Sparkles className="size-4.5 text-purple-400 mx-auto mb-1" />
              <div className="text-base font-bold text-purple-300 font-mono">
                +1 Bepul
              </div>
              <div className="text-[12px] font-bold text-zinc-400">AI Esse Krediti</div>
            </div>
          </div>

          {/* Strava 1-Click Auto-Post to Community Feed */}
          <div className="p-3.5 rounded-2xl bg-zinc-900/90 border border-white/10 text-left flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-orange-400 uppercase tracking-wide">
                <Share2 className="size-3.5" />
                <span>Strava Rejimi: Hamjamiyatga Ulashish</span>
              </div>
              <p className="text-xs text-zinc-300 mt-0.5">
                Bugungi g'alabangizni do'stlaringizga e'lon qiling va bonus XP oling.
              </p>
            </div>

            <Button
              type="button"
              onClick={handleShare}
              disabled={shared || sharing}
              className={`h-9 px-3.5 rounded-xl font-bold text-xs shrink-0 cursor-pointer transition-all ${
                shared
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-gradient-to-r from-orange-500 to-rose-600 text-white shadow-md'
              }`}
            >
              {shared ? (
                <>
                  <Check className="size-3.5 mr-1 text-emerald-400" />
                  <span>Ulashildi (+15 XP)</span>
                </>
              ) : (
                <>
                  <Share2 className="size-3 mr-1" />
                  <span>{sharing ? "Chiqarilmoqda..." : "Lentaga Ulashish (+15 XP)"}</span>
                </>
              )}
            </Button>
          </div>

          {/* ─────────────────────────────────────────────────────────────
              3. KEYINGI RAUND AVTOPILOTI (Loop Chaining Tramplin)
             ───────────────────────────────────────────────────────────── */}
          {cycleNumber === 1 && (
            <div className="p-4 rounded-2xl border border-orange-500/40 bg-gradient-to-r from-orange-500/15 via-rose-500/10 to-amber-500/15 text-left space-y-3 shadow-xl">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[12px] font-bold uppercase bg-orange-500/25 text-orange-300 border border-orange-500/40">
                  <Flame className="size-3.5 fill-current" />
                  <span>🔥 2.0x SUPER-COMBO YOQILDI!</span>
                </span>
                {timerActive && (
                  <span className="font-mono text-xs font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-md border border-amber-500/30">
                    Avtostart: {countdown}s
                  </span>
                )}
              </div>

              <p className="text-xs sm:text-sm text-zinc-200 leading-snug">
                Daraxtingiz <strong>35% suv</strong> oldi. Hoziroq 2-Raundni (Keyingi mavzu / Majburiy fan) <strong>2 barobar ko'p XP</strong> bilan boshlaymizmi?
              </p>

              {timerActive && (
                <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-orange-500 to-rose-500 rounded-full"
                    initial={{ width: '100%' }}
                    animate={{ width: '0%' }}
                    transition={{ duration: 5, ease: 'linear' }}
                  />
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <Button
                  type="button"
                  onClick={onRestartCycle}
                  className="flex-1 h-12 rounded-xl bg-gradient-to-r from-orange-500 via-rose-500 to-rose-600 hover:from-orange-400 hover:to-rose-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
                >
                  <Flame className="size-4 fill-current" />
                  <span>🔥 2-Raundni Boshlash (2.0x Super-Combo) {timerActive ? `(${countdown}s)` : ''}</span>
                  <ArrowRight className="size-4" />
                </Button>

                {timerActive && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={cancelTimer}
                    className="h-12 px-3 rounded-xl border-white/10 text-zinc-400 text-xs hover:text-white hover:bg-white/5"
                  >
                    To'xtatish
                  </Button>
                )}
              </div>
            </div>
          )}

          {cycleNumber === 2 && (
            <div className="p-4 rounded-2xl border border-rose-500/40 bg-gradient-to-r from-rose-500/15 via-purple-500/10 to-amber-500/15 text-left space-y-3 shadow-xl">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[12px] font-bold uppercase bg-rose-500/25 text-rose-300 border border-rose-500/40">
                  <Zap className="size-3.5 fill-current" />
                  <span>⚡ 2.5x ULTRA-COMBO!</span>
                </span>
                {timerActive && (
                  <span className="font-mono text-xs font-bold text-rose-300 bg-rose-500/20 px-2 py-0.5 rounded-md border border-rose-500/30">
                    Avtostart: {countdown}s
                  </span>
                )}
              </div>

              <p className="text-xs sm:text-sm text-zinc-200 leading-snug">
                Daraxtingiz <strong>70% suv</strong> oldi. To'liq 100% ga chiqish, Daraxtni Chinorga aylantirish va <strong>Kunlik Boss Sinovini</strong> ochish uchun 3-Raundni boshlang!
              </p>

              {timerActive && (
                <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-rose-500 to-purple-500 rounded-full"
                    initial={{ width: '100%' }}
                    animate={{ width: '0%' }}
                    transition={{ duration: 5, ease: 'linear' }}
                  />
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <Button
                  type="button"
                  onClick={onRestartCycle}
                  className="flex-1 h-12 rounded-xl bg-gradient-to-r from-rose-500 via-purple-600 to-amber-500 hover:from-rose-400 hover:to-amber-400 text-white font-bold text-xs sm:text-sm shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
                >
                  <Zap className="size-4 fill-current" />
                  <span>🚀 3-Raundni Boshlash (2.5x Ultra-Combo) {timerActive ? `(${countdown}s)` : ''}</span>
                  <ArrowRight className="size-4" />
                </Button>

                {timerActive && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={cancelTimer}
                    className="h-12 px-3 rounded-xl border-white/10 text-zinc-400 text-xs hover:text-white hover:bg-white/5"
                  >
                    To'xtatish
                  </Button>
                )}
              </div>
            </div>
          )}

          {cycleNumber >= 3 && (
            <div className="p-4 rounded-2xl border border-amber-500/50 bg-gradient-to-r from-amber-500/20 via-orange-500/15 to-emerald-500/20 text-left space-y-3 shadow-2xl">
              <div className="flex items-center gap-2">
                <span className="size-7 rounded-xl bg-amber-500/30 border border-amber-500/50 flex items-center justify-center text-amber-300">
                  <Trophy className="size-4" />
                </span>
                <div>
                  <h4 className="text-sm font-bold text-amber-300 uppercase tracking-wide">
                    👑 DARAХT 100% SUG'ORILDI VA CHINORGA AYLANDI!
                  </h4>
                  <p className="text-[12px] text-zinc-300">
                    Siz bugungi 60 daqiqalik marafonning barcha 3 ta raundini to'liq yopdingiz!
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-zinc-950/70 border border-rose-500/30 flex items-center gap-3">
                <ShieldAlert className="size-6 text-rose-400 shrink-0 animate-pulse" />
                <div className="text-xs">
                  <strong className="text-rose-300 block">KUNLIK BOSS SINTOVI QULFDAN OCHILDI!</strong>
                  <span className="text-zinc-400">15 daqiqalik Mini-BMB Stress Sinovi orqali super-reyting oling.</span>
                </div>
              </div>

              <Button
                type="button"
                onClick={onStartBoss || onRestartCycle}
                className="w-full h-13 rounded-xl bg-gradient-to-r from-rose-600 via-orange-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white font-bold text-xs sm:text-sm shadow-xl shadow-rose-600/40 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
              >
                <Swords className="size-4" />
                <span>⚔️ 15 Daqiqalik Kunlik Boss: Mini-BMB Stress Sinovini Boshlash</span>
                <ArrowRight className="size-4" />
              </Button>
            </div>
          )}

          {/* Pastki Chiqish Tugmasi */}
          <div className="pt-2">
            <Button
              type="button"
              onClick={onFinishToDashboard}
              variant="outline"
              className="w-full h-11 rounded-xl border-white/10 hover:bg-white/5 text-zinc-300 font-bold text-xs cursor-pointer"
            >
              <CheckCircle2 className="size-4 mr-1.5 text-emerald-400" />
              <span>✅ Dashboardga Qaytish</span>
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}