'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Gift,
  Sparkles,
  Flame,
  Coins,
  Zap,
  ShieldCheck,
  Trophy,
  X,
  Clock,
} from 'lucide-react';
import { celebrate } from '@/lib/confetti';
import { soundFX } from '@/lib/soundFX';
import { tgHaptic } from '@/lib/telegram';
import { apiFetch } from '@/lib/api-client';
import { toast } from 'sonner';
import PremiumIcon from '@/components/ui/premium-icon';
import { cn } from '@/lib/utils';

export interface DailyChestClaimData {
  reward_type: string;
  reward_amount: number;
  reward_title: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  streak_bonus_pct: number;
  streak_at_claim?: number;
  extra_note?: string;
  claimed_at?: string;
}

export interface DailyChestStatus {
  can_claim: boolean;
  seconds_remaining: number;
  streak: number;
  streak_bonus_pct: number;
  today_claim?: DailyChestClaimData | null;
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
  const [openedReward, setOpenedReward] = useState<DailyChestClaimData | null>(null);
  const [countdown, setCountdown] = useState<number>(0);

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
          setStatus((prev) => (prev ? { ...prev, can_claim: false, today_claim: res.claim } : null));
        }
      }, 1100);
    } catch (err: unknown) {
      setOpening(false);
      setLoading(false);
      const msg = err instanceof Error ? err.message : 'Sandiqni ochishda xatolik yuz berdi';
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
          label: 'Afsonaviy Jackpot! 🏆',
          pillClass: 'bg-[#FF9500]/15 text-[#C93400] dark:text-[#FFD60A] border-[#FF9500]/30',
          titleClass: 'text-[#FF9500]',
          tone: 'amber' as const,
        };
      case 'epic':
        return {
          label: 'Epik Yutuq! 🔮',
          pillClass: 'bg-[#AF52DE]/15 text-[#AF52DE] border-[#AF52DE]/30',
          titleClass: 'text-[#AF52DE]',
          tone: 'purple' as const,
        };
      case 'rare':
        return {
          label: "Noyob Sovg'a! 💎",
          pillClass: 'bg-[#007AFF]/15 text-[#007AFF] border-[#007AFF]/30',
          titleClass: 'text-[#007AFF]',
          tone: 'sky' as const,
        };
      default:
        return {
          label: 'Ajoyib Yutuq! ✨',
          pillClass: 'bg-[#34C759]/15 text-[#248A3D] dark:text-[#30D158] border-[#34C759]/30',
          titleClass: 'text-[#34C759]',
          tone: 'emerald' as const,
        };
    }
  };

  const rarityInfo = getRarityConfig(currentClaim?.rarity);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-md"
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
        className="relative w-full max-w-[400px] overflow-hidden rounded-[32px] border border-border bg-card p-6 sm:p-7 text-center text-card-foreground shadow-[0_24px_64px_rgba(0,0,0,0.28)]"
      >
        {/* Subtle Apple Ambient Aura */}
        <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 size-64 rounded-full bg-[#FF9500]/15 blur-3xl" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-20 flex size-8 items-center justify-center rounded-full bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer"
          aria-label="Yopish"
        >
          <X className="size-4" />
        </button>

        {/* 1. HEADER */}
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-[#FF9500]/25 bg-[#FF9500]/12 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-[#C93400] dark:text-[#FF9F0A]">
            <PremiumIcon icon={Gift} tone="amber" size="2xs" />
            <span>Kundalik Sirli Sandiq</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-extrabold tracking-[-0.025em] text-foreground pt-1">
            {isAlreadyClaimed ? 'Bugungi Mukofotingiz' : 'Sirli Sandiqni Ochish'}
          </h2>
          <p className="text-xs sm:text-[13px] text-muted-foreground leading-relaxed max-w-xs mx-auto">
            {isAlreadyClaimed
              ? "Siz bugungi sirli sandiqni muvaffaqiyatli ochib bo'ldingiz."
              : "Har kuni kiring, sandiqni oching va tasodifiy mukofotlarga ega bo'ling!"}
          </p>
        </div>

        {/* 2. 3D APPLE SQUIRCLE CHEST STAGE */}
        <div className="relative z-10 my-6 flex flex-col items-center justify-center">
          {!isAlreadyClaimed ? (
            <motion.button
              type="button"
              animate={
                opening
                  ? {
                      scale: [1, 1.12, 0.96, 1.16, 1],
                      rotate: [0, -8, 8, -12, 12, 0],
                    }
                  : {
                      y: [0, -5, 0],
                    }
              }
              transition={
                opening
                  ? { duration: 1.1, ease: 'easeInOut' }
                  : { repeat: Infinity, duration: 2.6, ease: 'easeInOut' }
              }
              onClick={handleOpenChest}
              className="group relative flex flex-col items-center justify-center cursor-pointer select-none focus:outline-none"
            >
              <div className="absolute -inset-3 rounded-[36px] bg-gradient-to-tr from-[#FF9500]/30 to-[#FFCC00]/25 blur-xl group-hover:opacity-100 opacity-80 transition-opacity" />
              <div className="relative flex size-28 sm:size-30 flex-col items-center justify-center gap-2 rounded-[30px] bg-gradient-to-b from-[#FFCC00] via-[#FF9500] to-[#E07A00] text-white shadow-[0_14px_34px_-6px_rgba(255,149,0,0.5),inset_0_1.5px_0_rgba(255,255,255,0.45)] border border-white/25 active:scale-95 transition-transform">
                <Gift className="size-12 text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.2)] stroke-[2.2]" />
                <span className="rounded-full bg-black/20 backdrop-blur-xs px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white">
                  {opening ? 'Ochilmoqda...' : 'Bosib oching'}
                </span>
              </div>
            </motion.button>
          ) : (
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative flex flex-col items-center justify-center"
            >
              <div className="relative flex size-26 sm:size-28 flex-col items-center justify-center rounded-[28px] bg-gradient-to-b from-[#34C759] to-[#248A3D] text-white shadow-[0_14px_34px_-6px_rgba(52,199,89,0.45),inset_0_1.5px_0_rgba(255,255,255,0.45)] border border-white/25">
                {currentClaim?.reward_type === 'coins' ? (
                  <Coins className="size-12 text-white stroke-[2.2]" />
                ) : currentClaim?.reward_type === 'streak_freeze' ? (
                  <ShieldCheck className="size-12 text-white stroke-[2.2]" />
                ) : (
                  <Zap className="size-12 text-white stroke-[2.2]" />
                )}
              </div>
            </motion.div>
          )}
        </div>

        {/* 3. REWARD DETAILS OR STREAK + PRIZE POOL */}
        <div className="relative z-10 space-y-3">
          {isAlreadyClaimed && currentClaim ? (
            <div className="space-y-3">
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-extrabold uppercase',
                  rarityInfo.pillClass
                )}
              >
                {rarityInfo.label}
              </span>

              <div className={cn('text-2xl sm:text-3xl font-black tracking-tight', rarityInfo.titleClass)}>
                {currentClaim.reward_title}
              </div>

              {currentClaim.extra_note && (
                <p className="text-xs text-muted-foreground bg-muted/60 p-3 rounded-[16px] border border-border">
                  {currentClaim.extra_note}
                </p>
              )}

              {currentClaim.streak_bonus_pct > 0 && (
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#C93400] dark:text-[#FF9F0A] bg-[#FF9500]/12 px-3 py-1 rounded-full border border-[#FF9500]/25">
                  <PremiumIcon icon={Flame} tone="amber" size="2xs" />
                  <span>+{currentClaim.streak_bonus_pct}% streak bonusi qo&apos;shildi</span>
                </div>
              )}

              <div className="pt-3 border-t border-border flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Clock className="size-3.5 text-[#FF9500]" />
                <span>Keyingi sandiq:</span>
                <span className="font-mono font-bold text-foreground bg-muted px-2.5 py-0.5 rounded-full border border-border">
                  {formatCountdown(countdown)}
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Streak Multiplier Row */}
              {status && (
                <div className="flex items-center justify-between gap-2.5 p-3 rounded-[20px] bg-muted/55 border border-border text-left">
                  <div className="flex items-center gap-3 min-w-0">
                    <PremiumIcon icon={Flame} tone="amber" size="sm" solid />
                    <div className="min-w-0">
                      <p className="text-xs sm:text-[13px] font-bold text-foreground truncate">
                        {status.streak} kunlik olov (Streak)
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {status.streak_bonus_pct > 0
                          ? `Mukofotga +${status.streak_bonus_pct}% bonus qo'shiladi!`
                          : "Streakni uzmasangiz mukofotlar ko'payadi"}
                      </p>
                    </div>
                  </div>
                  {status.streak_bonus_pct > 0 && (
                    <span className="shrink-0 text-xs font-mono font-extrabold text-[#C93400] dark:text-[#FF9F0A] bg-[#FF9500]/14 px-2.5 py-1 rounded-full border border-[#FF9500]/25">
                      +{status.streak_bonus_pct}%
                    </span>
                  )}
                </div>
              )}

              {/* 3 Compact iOS Reward Tiles */}
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-[16px] border border-border bg-muted/35 p-2.5 flex flex-col items-center gap-1 text-center">
                  <PremiumIcon icon={Zap} tone="emerald" size="2xs" />
                  <span className="text-[11px] font-bold text-foreground leading-tight">500 XP gacha</span>
                </div>
                <div className="rounded-[16px] border border-border bg-muted/35 p-2.5 flex flex-col items-center gap-1 text-center">
                  <PremiumIcon icon={Coins} tone="amber" size="2xs" />
                  <span className="text-[11px] font-bold text-foreground leading-tight">Oltin tangalar</span>
                </div>
                <div className="rounded-[16px] border border-border bg-muted/35 p-2.5 flex flex-col items-center gap-1 text-center">
                  <PremiumIcon icon={ShieldCheck} tone="sky" size="2xs" />
                  <span className="text-[11px] font-bold text-foreground leading-tight">Streak Freeze</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 4. PRIMARY ACTION BUTTON */}
        <div className="relative z-10 mt-5 pt-4 border-t border-border">
          {!isAlreadyClaimed ? (
            <button
              type="button"
              onClick={handleOpenChest}
              disabled={loading || opening}
              className="ios-spring w-full h-12 rounded-full bg-gradient-to-r from-[#FF9500] to-[#FF7A00] text-white font-extrabold text-sm sm:text-[15px] shadow-[0_8px_22px_rgba(255,149,0,0.38)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              <Sparkles className="size-4 fill-white" />
              <span>{opening ? 'Sandiq ochilmoqda...' : 'Sandiqni Ochish (100% Bepul)'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="ios-spring w-full h-11 rounded-full bg-muted hover:bg-muted/80 text-foreground font-bold text-sm transition cursor-pointer"
            >
              Yopish
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
