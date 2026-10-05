'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Gift, Sparkles, Flame, CheckCircle2, 
  Coins, Zap, ShieldAlert, Trophy, X, ArrowRight, Clock
} from 'lucide-react';
import { celebrate } from '@/lib/confetti';
import { soundFX } from '@/lib/soundFX';
import { tgHaptic } from '@/lib/telegram';
import { apiFetch } from '@/lib/api-client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface DailyChestStatus {
  can_claim: boolean;
  seconds_remaining: number;
  streak: number;
  streak_bonus_pct: number;
  today_claim?: {
    reward_type: string;
    reward_amount: number;
    reward_title: string;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
    streak_bonus_pct: number;
    claimed_at: string;
  } | null;
}

interface DailyChestModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialStatus?: DailyChestStatus | null;
  onClaimSuccess?: (newStats: { coins: number; xp: number; level: number; streak: number }) => void;
}

export default function DailyChestModal({
  isOpen,
  onClose,
  initialStatus,
  onClaimSuccess,
}: DailyChestModalProps) {
  const [status, setStatus] = useState<DailyChestStatus | null>(initialStatus || null);
  const [loading, setLoading] = useState(false);
  const [opening, setOpening] = useState(false);
  const [openedReward, setOpenedReward] = useState<{
    reward_type: string;
    reward_amount: number;
    reward_title: string;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
    streak_bonus_pct: number;
    extra_note?: string;
  } | null>(null);

  const [countdown, setCountdown] = useState<number>(0);

  // Statusni yuklash
  useEffect(() => {
    if (isOpen) {
      if (!initialStatus) {
        apiFetch<DailyChestStatus>('/api/dashboard/daily-chest/')
          .then((res) => {
            setStatus(res);
            setCountdown(res.seconds_remaining);
          })
          .catch(() => {});
      } else {
        setStatus(initialStatus);
        setCountdown(initialStatus.seconds_remaining);
      }
    }
  }, [isOpen, initialStatus]);

  // Taymer
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const formatCountdown = (totalSec: number) => {
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleOpenChest = async () => {
    if (loading || opening) return;
    setLoading(true);
    setOpening(true);
    soundFX.click();
    tgHaptic('medium');

    try {
      // 1.2 soniya qiziqarli tebranish animatsiyasidan keyin natija ochiladi
      const res = await apiFetch<{
        success: boolean;
        claim: {
          reward_type: string;
          reward_amount: number;
          reward_title: string;
          rarity: 'common' | 'rare' | 'epic' | 'legendary';
          streak_at_claim: number;
          streak_bonus_pct: number;
          extra_note?: string;
        };
        user_stats?: { coins: number; xp: number; level: number; streak: number };
      }>('/api/dashboard/daily-chest/open/', { method: 'POST' });

      setTimeout(() => {
        setOpening(false);
        setLoading(false);
        if (res.success && res.claim) {
          setOpenedReward(res.claim);
          soundFX.success();
          tgHaptic('success');
          celebrate({ particleCount: 75, spread: 70, origin: { y: 0.6 } });

          if (res.user_stats && onClaimSuccess) {
            onClaimSuccess(res.user_stats);
          }
          // Statusni yangilaymiz
          setStatus((prev) => prev ? { ...prev, can_claim: false, today_claim: res.claim } : null);
        }
      }, 1200);

    } catch (err: unknown) {
      setOpening(false);
      setLoading(false);
      const msg = err instanceof Error ? err.message : "Sandiqni ochishda xatolik yuz berdi";
      toast.error(msg);
    }
  };

  if (!isOpen) return null;

  const currentClaim = openedReward || status?.today_claim;
  const isAlreadyClaimed = !status?.can_claim && !!currentClaim;

  const getRarityConfig = (rarity: string = 'common') => {
    switch (rarity) {
      case 'legendary':
        return {
          label: "Afsonaviy Jack-pot! 🏆",
          badgeClass: "bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-lg shadow-amber-500/20",
          glowClass: "from-amber-500/30 via-orange-500/20 to-yellow-500/30",
          textColor: "text-amber-300",
        };
      case 'epic':
        return {
          label: "Epik Yutuq! 🔮",
          badgeClass: "bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-lg shadow-purple-500/20",
          glowClass: "from-purple-500/30 via-indigo-500/20 to-fuchsia-500/30",
          textColor: "text-purple-300",
        };
      case 'rare':
        return {
          label: "Noyob Sovg'a! 💎",
          badgeClass: "bg-sky-500/20 text-sky-300 border-sky-500/40 shadow-lg shadow-sky-500/20",
          glowClass: "from-sky-500/30 via-blue-500/20 to-cyan-500/30",
          textColor: "text-sky-300",
        };
      default:
        return {
          label: "Ajoyib Yutuq! ✨",
          badgeClass: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-md",
          glowClass: "from-emerald-500/20 via-teal-500/20 to-green-500/20",
          textColor: "text-emerald-300",
        };
    }
  };

  const rarityInfo = getRarityConfig(currentClaim?.rarity);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-slate-700/80 bg-gradient-to-b from-slate-900/95 via-slate-900/90 to-slate-950 p-6 sm:p-8 text-center text-white shadow-2xl"
      >
        {/* Ambient background glow */}
        <div className={cn(
          "absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full bg-gradient-to-br blur-3xl pointer-events-none transition-all duration-700",
          rarityInfo.glowClass
        )} />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="size-5" />
        </button>

        {/* HEADER */}
        <div className="relative z-10 mb-6">
          <Badge className="mb-2 bg-amber-500/10 text-amber-300 border-amber-500/30 px-3 py-1 font-semibold text-xs tracking-wide">
            <Gift className="size-3.5 mr-1.5 inline" /> KUNDALIK SIRLI SANDIQ
          </Badge>
          <h2 className="text-2xl font-black tracking-tight sm:text-3xl">
            {isAlreadyClaimed ? "Bugungi Mukofotingiz" : "Sirli Sandiqni Ochish"}
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">
            {isAlreadyClaimed
              ? "Siz bugungi sirli sandiqni ochib bo'ldingiz."
              : "Har kuni kiring, sandiqni oching va tasodifiy mukofotlarga ega bo'ling!"}
          </p>
        </div>

        {/* CONTENT */}
        <div className="relative z-10 my-4 flex flex-col items-center justify-center">
          {/* CHEST ANIMATION / ICON AREA */}
          <div className="relative my-2 flex items-center justify-center">
            {/* Pulsing rings */}
            <div className="absolute size-36 rounded-full bg-amber-500/10 blur-xl animate-pulse" />

            {!isAlreadyClaimed ? (
              <motion.div
                animate={opening ? {
                  scale: [1, 1.15, 0.95, 1.2, 1],
                  rotate: [0, -10, 10, -15, 15, 0],
                  filter: ["brightness(1)", "brightness(1.8)", "brightness(1.2)"],
                } : {
                  y: [0, -6, 0],
                }}
                transition={opening ? { duration: 1.2, ease: "easeInOut" } : { repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                className="relative cursor-pointer select-none"
                onClick={handleOpenChest}
              >
                <div className="size-28 sm:size-32 rounded-3xl bg-gradient-to-tr from-amber-600 via-yellow-500 to-amber-300 p-0.5 shadow-[0_0_40px_rgba(245,158,11,0.35)] flex items-center justify-center">
                  <div className="size-full rounded-[22px] bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center border border-amber-400/30">
                    <Gift className="size-14 text-amber-300 drop-shadow-[0_0_15px_rgba(252,211,77,0.8)]" />
                    <span className="mt-1 text-[10px] font-black uppercase tracking-wider text-amber-200">
                      {opening ? "Ochilmoqda..." : "Bosib oching"}
                    </span>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col items-center justify-center"
              >
                <div className="size-28 sm:size-32 rounded-3xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-400 p-0.5 shadow-[0_0_40px_rgba(16,185,129,0.35)] flex items-center justify-center">
                  <div className="size-full rounded-[22px] bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center border border-emerald-400/30">
                    {currentClaim.reward_type === 'coins' ? (
                      <Coins className="size-14 text-amber-300 drop-shadow-[0_0_15px_rgba(252,211,77,0.8)]" />
                    ) : currentClaim.reward_type === 'streak_freeze' ? (
                      <ShieldAlert className="size-14 text-cyan-300 drop-shadow-[0_0_15px_rgba(34,211,238,0.8)]" />
                    ) : (
                      <Zap className="size-14 text-emerald-300 drop-shadow-[0_0_15px_rgba(52,211,153,0.8)]" />
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* REWARD DETAILS / STREAK INCENTIVE */}
          <div className="mt-6 w-full space-y-3">
            {isAlreadyClaimed && currentClaim ? (
              <div className="space-y-3">
                <Badge className={cn("px-3 py-1 font-bold text-xs uppercase", rarityInfo.badgeClass)}>
                  {rarityInfo.label}
                </Badge>
                <div className={cn("text-3xl font-black tracking-tight", rarityInfo.textColor)}>
                  {currentClaim.reward_title}
                </div>
                {currentClaim.extra_note && (
                  <p className="text-xs text-slate-300 bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/50">
                    {currentClaim.extra_note}
                  </p>
                )}
                {currentClaim.streak_bonus_pct > 0 && (
                  <div className="inline-flex items-center gap-1.5 text-xs text-orange-400 font-bold bg-orange-500/10 px-3 py-1 rounded-full border border-orange-500/20">
                    <Flame className="size-3.5 fill-orange-500" />
                    +{currentClaim.streak_bonus_pct}% streak bonusi hisobga olindi
                  </div>
                )}

                {/* Countdown to next chest */}
                <div className="pt-3 border-t border-slate-800 flex items-center justify-center gap-2 text-xs text-slate-400">
                  <Clock className="size-3.5 text-amber-400" />
                  <span>Keyingi sirli sandiq:</span>
                  <span className="font-mono font-bold text-white bg-slate-800 px-2 py-0.5 rounded">
                    {formatCountdown(countdown)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Streak Multiplier Notice */}
                {status && (
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60 text-left">
                    <div className="flex items-center gap-2.5">
                      <div className="size-8 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center">
                        <Flame className="size-4 text-orange-400 fill-orange-400" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">
                          {status.streak} kunlik olov (Streak)
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {status.streak_bonus_pct > 0
                            ? `Mukofotga +${status.streak_bonus_pct}% bonus qo'shiladi!`
                            : "Streakni uzmasangiz mukofotlar ko'payadi"}
                        </div>
                      </div>
                    </div>
                    {status.streak_bonus_pct > 0 && (
                      <span className="text-xs font-mono font-extrabold text-orange-400 bg-orange-500/10 px-2 py-1 rounded-lg border border-orange-500/20">
                        +{status.streak_bonus_pct}%
                      </span>
                    )}
                  </div>
                )}

                <div className="text-[11px] text-slate-400 flex items-center justify-center gap-3">
                  <span>🎁 500 XP gacha</span>
                  <span>•</span>
                  <span>🪙 Oltin tangalar</span>
                  <span>•</span>
                  <span>🛡 Streak Freeze</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="relative z-10 mt-6 pt-4 border-t border-slate-800 flex items-center justify-center">
          {!isAlreadyClaimed ? (
            <Button
              onClick={handleOpenChest}
              disabled={loading || opening}
              className="w-full h-12 text-base font-black rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 shadow-[0_0_25px_rgba(245,158,11,0.4)] transition-all cursor-pointer"
            >
              <Sparkles className="size-5 mr-2" />
              {opening ? "Sandiq ochilmoqda..." : "Sandiqni Ochish (100% Bepul)"}
            </Button>
          ) : (
            <Button
              onClick={onClose}
              className="w-full h-11 text-sm font-bold rounded-2xl bg-slate-800 hover:bg-slate-700 text-white transition"
            >
              Yopish
            </Button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
