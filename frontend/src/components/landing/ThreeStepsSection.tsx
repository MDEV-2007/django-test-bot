'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Send, CheckCircle2, Circle, ArrowRight } from 'lucide-react';

const CHIPS = [
  { id: 'tarix', name: 'Tarix', emoji: '🏛️' },
  { id: 'ona-tili', name: 'Ona tili', emoji: '📖' },
  { id: 'matematika', name: 'Matematika', emoji: '📐' },
  { id: 'ingliz', name: 'Ingliz tili', emoji: '🇬🇧' },
];

export default function ThreeStepsSection() {
  const [selectedChips, setSelectedChips] = useState<string[]>(['tarix', 'ona-tili']);

  const toggleChip = (id: string) => {
    setSelectedChips((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <section id="qanday" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24 scroll-mt-24">
      {/* Sarlavha */}
      <div className="max-w-2xl">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
          Oddiy va tezkor
        </span>
        <h2 className="font-voice mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl md:text-5xl">
          Uch qadamda boshlaysiz
        </h2>
        <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed">
          Ro&apos;yxatdan o&apos;tishdan birinchi shaxsiy AI tahliligacha bor-yo&apos;g&apos;i 2 daqiqa.
        </p>
      </div>

      {/* Qadamlar panjarasi */}
      <div className="mt-14 grid gap-6 md:grid-cols-3">
        {/* Qadam 1 */}
        <div className="group relative flex flex-col justify-between rounded-2xl sm:rounded-3xl border border-slate-200/90 bg-white p-7 shadow-xs transition-all duration-300 hover:border-emerald-300 hover:shadow-xl">
          <div>
            <span className="font-mono text-4xl font-black text-slate-200 group-hover:text-emerald-500 transition-colors">
              01
            </span>
            <h3 className="font-voice mt-4 text-xl font-bold text-slate-900">
              Telegram orqali kiring
            </h3>
            <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
              Bot sizni bir bosishda tanib oladi. Parol eslab qolish ham, bank kartasi kiritish ham talab etilmaydi.
            </p>
          </div>

          <div className="mt-8">
            <Link
              href="/register"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-800 py-3 text-xs sm:text-sm font-bold text-slate-800 transition-all"
            >
              <Send className="size-4 text-sky-600" />
              Telegram orqali kirish
            </Link>
          </div>
        </div>

        {/* Qadam 2 */}
        <div className="group relative flex flex-col justify-between rounded-2xl sm:rounded-3xl border border-slate-200/90 bg-white p-7 shadow-xs transition-all duration-300 hover:border-emerald-300 hover:shadow-xl">
          <div>
            <span className="font-mono text-4xl font-black text-slate-200 group-hover:text-emerald-500 transition-colors">
              02
            </span>
            <h3 className="font-voice mt-4 text-xl font-bold text-slate-900">
              Fanlaringizni tanlang
            </h3>
            <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
              Imtihon topshiradigan fanlarni belgilang. Tizim siz uchun maxsus kundalik tayyorgarlik rejasini tuzadi.
            </p>
          </div>

          <div className="mt-8 flex flex-wrap gap-2">
            {CHIPS.map((chip) => {
              const active = selectedChips.includes(chip.id);
              return (
                <button
                  key={chip.id}
                  onClick={() => toggleChip(chip.id)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                    active
                      ? 'border border-emerald-500 bg-emerald-50 text-emerald-800 shadow-xs'
                      : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <span>{chip.emoji}</span>
                  <span>{chip.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Qadam 3 */}
        <div className="group relative flex flex-col justify-between rounded-2xl sm:rounded-3xl border border-slate-200/90 bg-white p-7 shadow-xs transition-all duration-300 hover:border-emerald-300 hover:shadow-xl">
          <div>
            <span className="font-mono text-4xl font-black text-slate-200 group-hover:text-emerald-500 transition-colors">
              03
            </span>
            <h3 className="font-voice mt-4 text-xl font-bold text-slate-900">
              Har kuni mashq qiling
            </h3>
            <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
              Test yeching, AI tahlilini o&apos;qing va aniqlangan zaif mavzularni birma-bir mustahkamlab boring.
            </p>
          </div>

          <div className="mt-8 space-y-2 rounded-xl border border-slate-100 bg-slate-50/80 p-3 text-xs">
            <div className="flex items-center gap-2 text-slate-900 font-semibold">
              <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
              <span>Xonliklar davri — 15 ta misol</span>
            </div>
            <div className="flex items-center gap-2 text-slate-900 font-semibold">
              <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
              <span>Xatolar tahlilini o&apos;qish</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400 font-medium">
              <Circle className="size-4 text-slate-300 shrink-0" />
              <span>Jadidlar matbuoti — takrorlash</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
