'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Send, ArrowRight, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const BOT_URL = 'https://t.me/ilmildiziuz_bot?start=landing';

export default function MobileStickyCta() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Hero o'tgandan keyin (350px dan keyin) ko'rsatamiz
      setVisible(window.scrollY > 350);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="fixed bottom-3 inset-x-3 z-40 md:hidden"
        >
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/90 bg-white/95 p-3 shadow-2xl backdrop-blur-xl">
            <div className="flex flex-col">
              <span className="flex items-center gap-1 text-xs font-bold text-slate-900">
                <Sparkles className="size-3.5 text-emerald-600" />
                1-test bepul
              </span>
              <span className="text-[11px] text-slate-500">
                Telegram yoki Google bilan
              </span>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={BOT_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Telegram botda ochish"
                className="flex size-9 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-sky-600 hover:bg-slate-100"
              >
                <Send className="size-4" />
              </a>

              <Link
                href="/register"
                className="flex items-center gap-1 rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-md hover:bg-emerald-500"
              >
                Boshlash <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
