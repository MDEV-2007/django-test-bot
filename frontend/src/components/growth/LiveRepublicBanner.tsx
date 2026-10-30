'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Flame,
  Clock,
  ArrowRight,
  Users,
  Trophy,
  Zap,
  CheckCircle2,
} from 'lucide-react';
import { soundFX } from '@/lib/soundFX';
import { tgHaptic } from '@/lib/telegram';
import { cn } from '@/lib/utils';

export interface LiveRepublicBannerProps {
  initialTargetHour?: number; // 20:30 default
  registeredCount?: number;
  onRegisterClick?: () => void;
}

const PARTICIPANT_AVATARS = [
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Ali',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Zilola',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Bobur',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Nigora',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Sardor',
];

export default function LiveRepublicBanner({
  initialTargetHour = 20,
  registeredCount = 142,
  onRegisterClick,
}: LiveRepublicBannerProps) {
  const router = useRouter();
  const [timeLeft, setTimeLeft] = useState<string>('14:32');
  const [isRegistered, setIsRegistered] = useState<boolean>(false);

  // 20:30 ga qadar teskari hisoblagich
  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const target = new Date();
      target.setHours(20, 30, 0, 0);

      // Agar hozir 20:30 dan o'tgan bo'lsa, ertangi kungi 20:30 ni oladi
      if (now.getTime() > target.getTime()) {
        target.setDate(target.getDate() + 1);
      }

      const diff = Math.max(0, target.getTime() - now.getTime());
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (hours > 0) {
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      }
      return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    };

    setTimeLeft(calculateTimeLeft());
    const interval = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(interval);
  }, [initialTargetHour]);

  const handleAction = () => {
    soundFX.click();
    tgHaptic('medium');
    if (!isRegistered) {
      setIsRegistered(true);
    }
    if (onRegisterClick) {
      onRegisterClick();
    } else {
      router.push('/sprint?subject=all&count=20');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative w-full rounded-2xl bg-gradient-to-r from-rose-950/85 via-zinc-900 to-orange-950/85 border border-rose-500/30 p-3.5 sm:p-4 shadow-[0_0_30px_-8px_rgba(244,63,94,0.3)] backdrop-blur-xl select-none overflow-hidden"
    >
      {/* Orqa fon mikro-nurlari */}
      <div className="pointer-events-none absolute -top-12 -left-12 size-36 bg-rose-500/15 rounded-full blur-2xl" />
      <div className="pointer-events-none absolute -bottom-12 -right-12 size-36 bg-orange-500/15 rounded-full blur-2xl" />

      <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-3 sm:gap-4">
        {/* ── Chapda: Jonli pulsatsiyalanuvchi nuqta va Sarlavha ── */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative flex items-center justify-center size-3.5 shrink-0">
            <span className="absolute size-full rounded-full bg-rose-500 animate-ping opacity-75" />
            <span className="relative size-2.5 rounded-full bg-rose-500" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xs sm:text-sm tracking-wide uppercase text-white truncate flex items-center gap-1.5">
                <span>JONLI RESPUBLIKA SPRINTI</span>
                <span className="text-orange-400 font-mono font-bold">• 20:30</span>
              </span>
              <span className="hidden sm:inline-flex px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 uppercase">
                Turnir
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 truncate mt-0.5">
              Respublika bo&apos;yicha bir vaqtda start • 1,000,000 so&apos;mlik sovrin jamg&apos;armasi
            </p>
          </div>
        </div>

        {/* ── O'rtada: Ustma-ust joylashgan 5 ta avatar va ishtirokchilar soni ── */}
        <div className="hidden lg:flex items-center gap-2.5 shrink-0 px-3 py-1.5 rounded-xl bg-zinc-950/60 border border-white/5">
          <div className="flex items-center -space-x-2">
            {PARTICIPANT_AVATARS.map((url, i) => (
              <img
                key={i}
                src={url}
                alt="Ishtirokchi"
                className="size-6 rounded-full border border-zinc-900 bg-zinc-800 object-cover"
              />
            ))}
          </div>
          <span className="text-xs font-semibold text-zinc-300">
            +{registeredCount} abituriyent kutish xonasida
          </span>
        </div>

        {/* ── O'ngda: Teskari taymer va Ro'yxatdan o'tish tugmasi ── */}
        <div className="flex items-center justify-between md:justify-end gap-3 w-full md:w-auto shrink-0 pt-1 md:pt-0 border-t md:border-t-0 border-white/10">
          {/* Monospace taymer */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-950/80 border border-white/10 text-xs font-mono font-bold text-orange-400">
            <Clock className="size-3.5 text-orange-400 animate-pulse" />
            <span>⏳ {timeLeft}</span>
          </div>

          {/* Ro'yxatdan o'tish tugmasi */}
          <button
            type="button"
            onClick={handleAction}
            className={cn(
              'h-9 sm:h-10 px-3.5 sm:px-4 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-[0.98] cursor-pointer',
              isRegistered
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-gradient-to-r from-orange-500 to-rose-600 hover:from-orange-400 hover:to-rose-500 text-white shadow-rose-600/30'
            )}
          >
            {isRegistered ? (
              <>
                <CheckCircle2 className="size-3.5 text-emerald-400" />
                <span>Joyingiz Band Qilindi</span>
              </>
            ) : (
              <>
                <span>Ro&apos;yxatdan o&apos;tish (Bepul)</span>
                <ArrowRight className="size-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

