'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Droplets, Lock, Play, AlertTriangle } from 'lucide-react';

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

  const losses = [
    {
      icon: Flame,
      tone: 'bg-[var(--ps-orange)] text-[#080808]',
      text: <>Yig&apos;ilgan <b>{comboMultiplier.toFixed(1)}x combo</b> bonusingiz bekor bo&apos;ladi.</>,
    },
    {
      icon: Droplets,
      tone: 'bg-[var(--ps-blue)] text-[#080808]',
      text: <><b>Ilm Ildizi daraxtingiz</b> bugun suv olmaydi.</>,
    },
    {
      icon: Lock,
      tone: 'bg-[var(--ps-purple)] text-white',
      text: <><b>Sirli sandiq</b> qulflangan holda qoladi.</>,
    },
  ];

  return (
    <AnimatePresence>
      <div className="ps-shell fixed inset-0 z-[60] flex items-center justify-center bg-[#0B0814]/55 p-4 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          role="dialog"
          aria-label="Chiqishni tasdiqlash"
          className="relative w-full max-w-md overflow-hidden rounded-[32px] bg-[var(--ps-paper)] text-[var(--text-primary)] shadow-[0_40px_80px_-30px_rgba(40,20,80,0.7)]"
        >
          <div className="relative overflow-hidden bg-[var(--ps-coral)] px-6 pb-6 pt-6 text-white">
            <span aria-hidden className="absolute -right-10 -top-12 size-40 rounded-full bg-white/15" />
            <span className="relative inline-flex size-12 items-center justify-center rounded-full bg-[#FFFCF7] text-[var(--ps-coral)]">
              <AlertTriangle className="size-6" />
            </span>
            <h3 className="ps-display relative mt-3 text-[26px] text-white sm:text-[30px]">To&apos;xtang! Zanjir uzilmasin</h3>
            <p className="relative mt-1.5 text-[13.5px] text-white/85">Sikl hali yakunlanmadi. Hozir chiqsangiz:</p>
          </div>

          <div className="space-y-2 p-5 sm:p-6">
            {losses.map((l, i) => {
              const Icon = l.icon;
              return (
                <div key={i} className="flex items-center gap-3 rounded-[20px] bg-[var(--ps-neutral)] p-2 pr-4">
                  <span className={`inline-flex size-9 shrink-0 items-center justify-center rounded-full ${l.tone}`}>
                    <Icon className="size-4" />
                  </span>
                  <span className="text-[13.5px] leading-snug text-[var(--text-secondary)]">{l.text}</span>
                </div>
              );
            })}

            <button type="button" onClick={onContinue} className="ps-btn ps-btn-ink !mt-5 w-full">
              <Play className="size-4 fill-current" />
              Siklni davom ettirish
            </button>
            <button
              type="button"
              onClick={onConfirmExit}
              className="w-full cursor-pointer py-2 text-[12.5px] font-semibold text-[var(--text-muted)] underline-offset-4 transition-colors hover:text-[var(--ps-coral)] hover:underline"
            >
              Baribir chiqish va bonuslarni yo&apos;qotish
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
