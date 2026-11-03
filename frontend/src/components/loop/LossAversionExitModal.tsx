'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Flame, Droplets, Lock, Play, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LossAversionExitModalProps {
  open: boolean;
  comboMultiplier: number;
  onContinue: () => void;
  onConfirmExit: () => void;
}

export default function LossAversionExitModal({
  open,
  comboMultiplier,
  onContinue,
  onConfirmExit,
}: LossAversionExitModalProps) {
  if (!open) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-md overflow-hidden rounded-2xl border border-rose-500/40 bg-gradient-to-b from-zinc-900 via-zinc-950 to-black p-6 sm:p-7 shadow-2xl text-center"
        >
          {/* Orqa fon qizil nuri */}
          <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 size-48 rounded-full bg-rose-600/25 blur-[70px]" />

          {/* Ogohlantirish ikonchasi */}
          <div className="mx-auto size-16 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 mb-4 shadow-lg shadow-rose-500/20">
            <AlertTriangle className="size-8 animate-bounce" />
          </div>

          <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            ⚠️ To'xtang! Zanjir uzilmasin!
          </h3>

          <p className="text-sm text-zinc-300 mt-2.5 leading-relaxed">
            Siklni to'liq yakunlashingizga atigi <strong className="text-white">2 daqiqa</strong> qoldi. Hozir chiqib ketsangiz:
          </p>

          {/* Yo'qotishlar ro'yxati (Loss Aversion triggers) */}
          <div className="my-4 space-y-2.5 text-left bg-zinc-950/80 p-3.5 rounded-2xl border border-white/5 text-xs text-zinc-300">
            <div className="flex items-center gap-2.5 text-rose-300">
              <Flame className="size-4 shrink-0 text-orange-400 fill-orange-400" />
              <span>
                Yig'ilgan <strong className="text-white font-mono">{comboMultiplier.toFixed(1)}x Combo</strong> bonusingiz bekor bo'ladi.
              </span>
            </div>
            <div className="flex items-center gap-2.5 text-amber-300">
              <Droplets className="size-4 shrink-0 text-sky-400" />
              <span>
                <strong>Ilm Ildizi Daraxtingiz</strong> suvsiz qoladi va sarg'ayish xavfi ortadi.
              </span>
            </div>
            <div className="flex items-center gap-2.5 text-zinc-400">
              <Lock className="size-4 shrink-0 text-amber-400" />
              <span>
                <strong>Sirli Sandiq (+200 Tanga & AI Krediti)</strong> qulflanadi.
              </span>
            </div>
          </div>

          {/* Asosiy Davom Ettirish tugmasi */}
          <Button
            type="button"
            onClick={onContinue}
            className="w-full h-12 sm:h-13 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white font-bold text-sm shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98] mb-3"
          >
            <Play className="size-4 fill-current" />
            <span>Siklni Davom Ettirish (2 daqiqa)</span>
          </Button>

          {/* Baribir chiqish kichik xira tugmasi */}
          <button
            type="button"
            onClick={onConfirmExit}
            className="text-xs text-zinc-500 hover:text-zinc-400 transition underline underline-offset-4 cursor-pointer py-1"
          >
            Baribir chiqish va bonuslarni yo'qotish
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
