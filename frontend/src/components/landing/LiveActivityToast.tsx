'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Flame, Target, Award, Sparkles, CheckCircle2 } from 'lucide-react';

const ACTIVITIES = [
  {
    icon: Flame,
    color: 'text-orange-500 bg-orange-100 border-orange-200',
    title: "1v1 Arena jangi",
    text: "Farg'onadan Sardor g'alaba qozondi",
    time: "Hozirgina",
  },
  {
    icon: Target,
    color: 'text-emerald-600 bg-emerald-100 border-emerald-200',
    title: "Mock Test natijasi",
    text: "Samarqanddan Aziza 88.5 ball to'pladi",
    time: "2 daqiqa oldin",
  },
  {
    icon: Sparkles,
    color: 'text-indigo-600 bg-indigo-100 border-indigo-200',
    title: "AI Mentor tahlili",
    text: "Toshkentdan Shohruh zaif mavzuni yopdi",
    time: "4 daqiqa oldin",
  },
  {
    icon: Award,
    color: 'text-amber-600 bg-amber-100 border-amber-200',
    title: "Uzluksiz tayyorgarlik",
    text: "Namangandan Bobur 7 kun streakka erishdi",
    time: "6 daqiqa oldin",
  },
  {
    icon: CheckCircle2,
    color: 'text-teal-600 bg-teal-100 border-teal-200',
    title: "Diagnostika",
    text: "Buxorodan Madina 10/10 natija ko'rsatdi",
    time: "8 daqiqa oldin",
  },
];

export default function LiveActivityToast() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (dismissed) return;

    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % ACTIVITIES.length);
        setVisible(true);
      }, 500);
    }, 10000);

    return () => clearInterval(interval);
  }, [dismissed]);

  if (dismissed) return null;

  const current = ACTIVITIES[index];
  const Icon = current.icon;

  return (
    <div className="fixed bottom-6 left-6 z-40 hidden sm:block">
      <AnimatePresence mode="wait">
        {visible && (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="flex items-center gap-3 rounded-2xl border border-slate-200/90 bg-white/95 p-3 pr-4 shadow-xl backdrop-blur-xl max-w-sm"
          >
            <div className={`flex size-9 shrink-0 items-center justify-center rounded-xl border ${current.color}`}>
              <Icon className="size-4" />
            </div>

            <div className="flex-1 text-xs">
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold text-slate-900">{current.title}</span>
                <span className="font-mono text-[10px] text-slate-600">{current.time}</span>
              </div>
              <p className="mt-0.5 text-slate-800 leading-snug">{current.text}</p>
            </div>

            <button
              onClick={() => setDismissed(true)}
              aria-label="Yopish"
              className="ml-1 text-slate-600 hover:text-slate-800 transition-colors"
            >
              <X className="size-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
