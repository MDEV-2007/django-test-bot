'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Gift, Trophy, Sparkles, Coins, Zap, Droplets,
  Share2, ArrowRight, RotateCcw, CheckCircle2,
  TreeDeciduous, Sprout, Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { soundFX } from '@/lib/soundFX';
import { tgHaptic } from '@/lib/telegram';

interface Stage5RewardCeremonyProps {
  comboMultiplier: number;
  dtmScoreDelta: number;
  coinsEarned: number;
  xpEarned: number;
  ecoTree: {
    growth_stage: number;
    stage_name: string;
    water_level: number;
    root_depth_xp: number;
  };
  onShareToFeed: (caption?: string) => Promise<boolean>;
  onRestartCycle: () => void;
  onFinishToDashboard: () => void;
}

export default function Stage5RewardCeremony({
  comboMultiplier,
  dtmScoreDelta,
  coinsEarned,
  xpEarned,
  ecoTree,
  onShareToFeed,
  onRestartCycle,
  onFinishToDashboard,
}: Stage5RewardCeremonyProps) {
  const [chestOpened, setChestOpened] = useState(false);
  const [shared, setShared] = useState(false);
  const [sharing, setSharing] = useState(false);

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

  return (
    <div className="relative w-full max-w-xl mx-auto py-4 px-3 sm:px-6 text-center">
      {/* Orqa fon zarhal nur */}
      <div className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 size-72 rounded-full bg-amber-500/25 blur-[90px]" />

      {!chestOpened ? (
        /* ── SANDIQNI OCHISH BOSQICHI ── */
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-6"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-black uppercase tracking-wider">
            <Trophy className="size-4 animate-bounce" />
            <span>4-Bosqichli Sikl To'liq Yopildi!</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            🎁 Tabriklaymiz! Oltin Sandiq Tayyor!
          </h2>
          <p className="text-sm text-zinc-300 max-w-md mx-auto">
            Siz bugungi barcha 4 ta bosqichni uzluksiz bajardingiz. Sandiqni oching va mukofotlaringizni oling!
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
              <span className="text-xs font-black text-amber-300 uppercase tracking-wider">
                Bosing va Oching!
              </span>
            </div>
          </motion.div>

          <Button
            type="button"
            onClick={handleOpenChest}
            className="h-13 px-8 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-black text-base shadow-xl shadow-amber-500/30 cursor-pointer"
          >
            <Sparkles className="size-5 fill-current" />
            <span>Sandiqni Ochish (+{coinsEarned} Tanga)</span>
          </Button>
        </motion.div>
      ) : (
        /* ── SANDIQ OCHILDI VA DARAХTGA SUV QUYILDI ── */
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="space-y-6"
        >
          {/* Kulminatsiya Sarlavhasi */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-black uppercase tracking-wider mb-2">
              <Sparkles className="size-3.5" />
              <span>Sandiq Ochildi • Daraxt Sug'orildi</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              G'alaba va Rivojlanish! 🌳✨
            </h2>
          </div>

          {/* Eco-Tree Sug'orish Animatsiyasi */}
          <div className="relative overflow-hidden rounded-3xl border border-emerald-500/30 bg-gradient-to-b from-emerald-950/40 via-zinc-950 to-zinc-900 p-5 sm:p-6 shadow-xl">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 text-left">
                <div className="size-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-inner">
                  <TreeDeciduous className="size-8 animate-pulse text-emerald-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-zinc-400">Ilm Ildizi Daraxti</span>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      {ecoTree.stage_name}
                    </span>
                  </div>
                  <p className="text-sm font-black text-white mt-0.5">
                    +35% Jonli Suv Quyildi! 💧
                  </p>
                </div>
              </div>

              {/* Suv Bar */}
              <div className="w-full sm:w-48 text-right">
                <div className="flex justify-between text-xs font-bold text-zinc-300 mb-1">
                  <span>Namlik</span>
                  <span className="text-sky-400 font-mono font-black">{ecoTree.water_level}%</span>
                </div>
                <div className="h-2.5 w-full bg-zinc-800 rounded-full overflow-hidden border border-white/5">
                  <motion.div
                    className="h-full bg-gradient-to-r from-sky-500 to-emerald-400 rounded-full"
                    initial={{ width: `${Math.max(0, ecoTree.water_level - 35)}%` }}
                    animate={{ width: `${ecoTree.water_level}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Olingan mukofotlar kartochkalari */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
            <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-amber-500/20 text-center">
              <Coins className="size-5 text-amber-400 mx-auto mb-1 fill-amber-400/20" />
              <div className="text-base sm:text-lg font-black text-amber-300 font-mono">
                +{coinsEarned}
              </div>
              <div className="text-[10px] font-bold text-zinc-400">Tanga</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-indigo-500/20 text-center">
              <Zap className="size-5 text-indigo-400 mx-auto mb-1 fill-indigo-400/20" />
              <div className="text-base sm:text-lg font-black text-indigo-300 font-mono">
                +{xpEarned}
              </div>
              <div className="text-[10px] font-bold text-zinc-400">XP Tajriba</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-emerald-500/20 text-center">
              <Trophy className="size-5 text-emerald-400 mx-auto mb-1" />
              <div className="text-base sm:text-lg font-black text-emerald-300 font-mono">
                +{dtmScoreDelta.toFixed(1)}
              </div>
              <div className="text-[10px] font-bold text-zinc-400">DTM Ball</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-purple-500/20 text-center">
              <Sparkles className="size-5 text-purple-400 mx-auto mb-1" />
              <div className="text-base sm:text-lg font-black text-purple-300 font-mono">
                +1 Bepul
              </div>
              <div className="text-[10px] font-bold text-zinc-400">AI Esse Krediti</div>
            </div>
          </div>

          {/* Strava 1-Click Auto-Post to Community Feed */}
          <div className="p-4 rounded-2xl bg-zinc-900/90 border border-white/10 text-left flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-black text-orange-400 uppercase tracking-wide">
                <Share2 className="size-3.5" />
                <span>Strava Rejimi: Hamjamiyatga Ulashish</span>
              </div>
              <p className="text-xs text-zinc-300 mt-0.5">
                Bugungi g'alabangizni lentadagi do'stlaringizga e'lon qiling va bonus XP oling.
              </p>
            </div>

            <Button
              type="button"
              onClick={handleShare}
              disabled={shared || sharing}
              className={`h-10 px-4 rounded-xl font-bold text-xs shrink-0 cursor-pointer transition-all ${
                shared
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-gradient-to-r from-orange-500 to-rose-600 text-white shadow-md'
              }`}
            >
              {shared ? (
                <>
                  <Check className="size-4 mr-1 text-emerald-400" />
                  <span>Ulashildi (+15 XP)</span>
                </>
              ) : (
                <>
                  <Share2 className="size-3.5 mr-1" />
                  <span>{sharing ? "Chiqarilmoqda..." : "Lentaga Ulashish (+15 XP)"}</span>
                </>
              )}
            </Button>
          </div>

          {/* Yakuniy Harakat Tugmalari */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              type="button"
              onClick={onRestartCycle}
              className="flex-1 h-13 rounded-2xl bg-gradient-to-r from-orange-500 via-rose-500 to-rose-600 hover:from-orange-400 hover:to-rose-500 text-white font-black text-sm shadow-xl shadow-rose-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
            >
              <RotateCcw className="size-4" />
              <span>2.5x Super-Combo bilan 2-Siklni Boshlash</span>
            </Button>

            <Button
              type="button"
              onClick={onFinishToDashboard}
              variant="outline"
              className="h-13 px-6 rounded-2xl border-white/10 hover:bg-white/5 text-zinc-300 font-bold text-sm cursor-pointer"
            >
              <CheckCircle2 className="size-4 mr-1.5 text-emerald-400" />
              <span>Dashboardga Qaytish</span>
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
