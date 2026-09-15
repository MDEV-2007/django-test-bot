'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuthStore } from '@/lib/auth-store';
import { BrandMark } from './BrandMark';

const MOTIVATIONAL_MESSAGES = [
  "Milliy Sertifikat va BBA platformasi",
  "Bilim — kelajakning eng mustahkam ildizidir",
  "Shaxsiy profilingiz va testlar tayyorlanmoqda...",
  "Har bir to'g'ri javob — g'alabaga bir qadam",
];

export default function BrandSplashScreen() {
  const { authReady } = useAuthStore();
  const [visible, setVisible] = useState(true);
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    // Xabarlarni navbat bilan o'zgartirib turish
    const timer = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % MOTIVATIONAL_MESSAGES.length);
    }, 1800);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // authReady bo'lgach kamida 600ms ko'rsatib, silliq yo'qolishi
    if (authReady) {
      const hideTimeout = setTimeout(() => {
        setVisible(false);
      }, 550);
      return () => clearTimeout(hideTimeout);
    }

    // Xavfsizlik taymeri: agar tarmoq sekin bo'lsa, ko'pi bilan 2.5 soniyadan keyin ochiladi
    const safetyTimeout = setTimeout(() => {
      setVisible(false);
    }, 2800);
    return () => clearTimeout(safetyTimeout);
  }, [authReady]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="brand-splash-screen"
          initial={{ opacity: 1 }}
          exit={{
            opacity: 0,
            scale: 1.04,
            filter: 'blur(10px)',
            transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
          }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#07090e] text-white select-none overflow-hidden"
        >
          {/* Orqa fon nur effekti (Ambient Glow) */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <motion.div
              animate={{
                scale: [1, 1.25, 1],
                opacity: [0.18, 0.32, 0.18],
              }}
              transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] sm:w-[480px] h-[340px] sm:h-[480px] rounded-full bg-gradient-to-tr from-emerald-500/30 via-teal-400/20 to-indigo-600/30 blur-[90px]"
            />
            <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:24px_24px] opacity-40" />
          </div>

          <div className="relative z-10 flex flex-col items-center px-6 max-w-sm text-center">
            {/* Markaziy Logotip & Halo Halqasi */}
            <div className="relative mb-6">
              {/* Puls halqalari */}
              <motion.div
                animate={{ scale: [1, 1.4, 1.6], opacity: [0.6, 0.2, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
                className="absolute inset-0 rounded-3xl bg-emerald-500/30 blur-md"
              />
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                className="absolute -inset-2.5 rounded-[26px] border border-emerald-500/20 border-t-emerald-400/80 border-r-teal-300/40"
              />

              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="relative rounded-2xl p-1 bg-gradient-to-b from-white/10 to-transparent shadow-2xl shadow-emerald-500/20"
              >
                <BrandMark size={76} rounded="rounded-2xl" />
              </motion.div>
            </div>

            {/* Sarlavha (IlmIldizi) */}
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.15, duration: 0.4 }}
              className="space-y-1.5"
            >
              <h1 className="font-voice text-3xl sm:text-4xl font-black tracking-tight text-white drop-shadow-md">
                Ilm<span className="text-emerald-400">Ildizi</span>
              </h1>
              
              <AnimatePresence mode="wait">
                <motion.p
                  key={msgIndex}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.28 }}
                  className="text-xs sm:text-sm text-zinc-400 font-medium min-h-[20px]"
                >
                  {MOTIVATIONAL_MESSAGES[msgIndex]}
                </motion.p>
              </AnimatePresence>
            </motion.div>

            {/* Premium Chiziqli Progress Bar */}
            <div className="mt-8 w-44 sm:w-52 h-1.5 bg-white/10 rounded-full overflow-hidden p-0.5 border border-white/5">
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                transition={{
                  repeat: Infinity,
                  duration: 1.2,
                  ease: 'easeInOut',
                }}
                className="w-1/2 h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-300 to-cyan-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]"
              />
            </div>
          </div>

          {/* Pastki versiya yozuvi */}
          <div className="absolute bottom-6 z-10 text-[11px] font-mono text-zinc-500/80 tracking-wider uppercase">
            Platforma 2.0 · BBA &amp; Milliy Sertifikat
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
