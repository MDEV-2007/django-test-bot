'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Flame,
  Clock,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { soundFX } from '@/lib/soundFX';
import { tgHaptic } from '@/lib/telegram';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

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
  const [isLiveOpen, setIsLiveOpen] = useState<boolean>(false);
  const [isRegistered, setIsRegistered] = useState<boolean>(false);

  // Saqlangan ro'yxatdan o'tish holatini tekshirish
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const today = new Date().toISOString().slice(0, 10);
      setIsRegistered(localStorage.getItem(`republic_registered_${today}`) === 'true');
    }
  }, []);

  // 20:30 ga qadar teskari hisoblagich va jonli vaqtni aniqlash
  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const target = new Date();
      target.setHours(20, 30, 0, 0);

      const targetLobby = new Date();
      targetLobby.setHours(20, 15, 0, 0);

      const targetEnd = new Date();
      targetEnd.setHours(20, 50, 0, 0);

      // Agar hozir 20:15 va 20:50 orasida bo'lsa — turnir faol (Lobby / Live)
      if (now.getTime() >= targetLobby.getTime() && now.getTime() <= targetEnd.getTime()) {
        setIsLiveOpen(true);
      } else {
        setIsLiveOpen(false);
      }

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

    // 1. Agar turnir hozir JONLI bo'lsa (soat 20:15 - 20:45) — sprintga kiradi!
    if (isLiveOpen) {
      if (onRegisterClick) {
        onRegisterClick();
      } else {
        router.push('/sprint?subject=0&count=20&autostart=true');
      }
      return;
    }

    // 2. Agar turnir vaqti hali kelmagan bo'lsa — FAOL RO'YXATDAN O'TADI (Sprintga kirmaydi!)
    if (!isRegistered) {
      setIsRegistered(true);
      if (typeof window !== 'undefined') {
        const today = new Date().toISOString().slice(0, 10);
        localStorage.setItem(`republic_registered_${today}`, 'true');
      }
      toast.success("Turnirga joyingiz muvaffaqiyatli band qilindi! Soat 20:15 da Telegram orqali eslatma yuboriladi 🔔");
      soundFX.fanfare();
      tgHaptic('success');
    } else {
      toast.info("Siz allaqachon ro'yxatdan o'tgansiz. Turnir soat 20:30 da boshlanadi!");
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
        {/* ── Chapda: Jonli pulsatsiyalanuvchi nuqta va Sarlavha (Kesiq bo'lmaydi) ── */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 w-full md:w-auto">
          <div className="relative flex items-center justify-center size-3.5 shrink-0">
            <span className="absolute size-full rounded-full bg-rose-500 animate-ping opacity-75" />
            <span className="relative size-2.5 rounded-full bg-rose-500" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold text-xs sm:text-sm tracking-wide uppercase text-white flex items-center gap-1.5">
                <span>JONLI RESPUBLIKA SPRINTI</span>
                <span className="text-orange-400 font-mono font-bold">• 20:30</span>
              </span>
              <span className="inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 uppercase">
                Turnir
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Respublika bo&apos;yicha bir vaqtda jonli start • ELO va Reyting bellashuvi
            </p>
          </div>
        </div>

        {/* ── O'ngda: Avatarlar + Teskari taymer + Harakat tugmasi ── */}
        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2.5 sm:gap-3 w-full md:w-auto shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-white/10">
          {/* Ustma-ust joylashgan avatarlar */}
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-zinc-950/60 border border-white/5">
            <div className="flex items-center -space-x-2">
              {PARTICIPANT_AVATARS.slice(0, 3).map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt="Ishtirokchi"
                  className="size-5 sm:size-6 rounded-full border border-zinc-900 bg-zinc-800 object-cover"
                />
              ))}
            </div>
            <span className="text-[11px] font-semibold text-zinc-300">
              +{registeredCount} kutishda
            </span>
          </div>

          {/* Monospace taymer */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-950/80 border border-white/10 text-xs font-mono font-bold text-orange-400 shrink-0">
            <Clock className="size-3.5 text-orange-400 animate-pulse" />
            <span>⏳ {timeLeft}</span>
          </div>

          {/* Tugma: Agar turnir boshlangan bo'lsa 'Turnirga Kirish', bo'lmasa 'Ro'yxatdan o'tish' */}
          <button
            type="button"
            onClick={handleAction}
            className={cn(
              'h-9 sm:h-10 px-3.5 sm:px-4 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-[0.98] cursor-pointer shrink-0',
              isLiveOpen
                ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-emerald-500/30 animate-pulse'
                : isRegistered
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-gradient-to-r from-orange-500 to-rose-600 hover:from-orange-400 hover:to-rose-500 text-white shadow-rose-600/30'
            )}
          >
            {isLiveOpen ? (
              <>
                <Flame className="size-3.5 text-amber-300" />
                <span>Turnirga Kirish</span>
                <ArrowRight className="size-3.5" />
              </>
            ) : isRegistered ? (
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
