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
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="fixed bottom-3 inset-x-3 z-40 md:hidden"
        >
          <div className="flex items-center justify-between gap-3 rounded-full border border-black/[0.08] bg-white/88 px-4 py-2.5 shadow-[0_14px_38px_rgba(0,0,0,0.14),inset_0_1px_0_rgba(255,255,255,0.9)] ios-glass">
            <div className="flex flex-col pl-1">
              <span className="flex items-center gap-1 text-xs font-bold text-[#080808]">
                <Sparkles className="size-3.5 text-[#7659C7]" />
                1-test mutlaqo bepul
              </span>
              <span className="text-[12px] text-[#6B6577]">
                Telegram yoki Google orqali
              </span>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={BOT_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Telegram botda ochish"
                className="ios-spring flex size-9 items-center justify-center rounded-full bg-[#F7F4EF] text-[#7659C7]"
              >
                <Send className="size-4" />
              </a>

              <Link
                href="/register"
                className="ios-spring flex items-center gap-1 rounded-full bg-[#7659C7] px-4 py-2 text-xs font-semibold text-white shadow-[0_4px_12px_rgba(118,89,199,0.3)]"
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
