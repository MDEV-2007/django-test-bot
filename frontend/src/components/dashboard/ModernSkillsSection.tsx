'use client';

import React from 'react';
import Link from 'next/link';
import {
  Headphones,
  BookOpen,
  Layers,
  Zap,
  ArrowRight,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const SKILL_CARDS = [
  {
    title: 'Audio & Fokus',
    desc: 'Ambient tovushlar va tinglab tushunish',
    icon: Headphones,
    href: '/study',
    badge: '12 dars',
    accentColor: 'text-purple-400',
    iconBg: 'bg-purple-500/15 border border-purple-500/30 text-purple-400',
    glow: 'hover:shadow-[0_0_25px_rgba(168,85,247,0.2)] hover:border-purple-500/50',
  },
  {
    title: 'Nazariya & Konspekt',
    desc: 'Video darslar va qisqa xulosalar',
    icon: BookOpen,
    href: '/learning',
    badge: 'Barcha fanlar',
    accentColor: 'text-rose-400',
    iconBg: 'bg-rose-500/15 border border-rose-500/30 text-rose-400',
    glow: 'hover:shadow-[0_0_25px_rgba(244,63,94,0.2)] hover:border-rose-500/50',
  },
  {
    title: "Lug'at & Flashcard",
    desc: 'Sanalar, formulalar va yangi so\'zlar',
    icon: Layers,
    href: '/flashcards',
    badge: 'Anki ⚡',
    accentColor: 'text-emerald-400',
    iconBg: 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400',
    glow: 'hover:shadow-[0_0_25px_rgba(16,185,129,0.2)] hover:border-emerald-500/50',
  },
  {
    title: 'Amaliy Testlar',
    desc: 'DTM & Milliy Sertifikat mock bazasi',
    icon: Zap,
    href: '/tests',
    badge: 'Mock Test',
    accentColor: 'text-amber-400',
    iconBg: 'bg-amber-500/15 border border-amber-500/30 text-amber-400',
    glow: 'hover:shadow-[0_0_25px_rgba(245,158,11,0.2)] hover:border-amber-500/50',
  },
];

export default function ModernSkillsSection() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg sm:text-xl font-black tracking-tight text-white">
            Ko&apos;nikmalarni Rivojlantirish
          </h2>
          <p className="text-xs text-slate-400">Har kuni 15 daqiqa intizomli mashq qiling</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {SKILL_CARDS.map((sk, idx) => {
          const Icon = sk.icon;
          return (
            <Link key={idx} href={sk.href} className="group block">
              <Card
                className={cn(
                  'relative overflow-hidden rounded-3xl border border-slate-800/80 bg-slate-900/50 p-5 backdrop-blur-xl transition-all duration-300 flex flex-col justify-between h-full hover:-translate-y-1.5 cursor-pointer',
                  sk.glow
                )}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className={cn('flex size-10 items-center justify-center rounded-2xl transition-transform group-hover:scale-110', sk.iconBg)}>
                      <Icon className="size-5" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-full border border-slate-700/50">
                      {sk.badge}
                    </span>
                  </div>

                  <div>
                    <h3 className={cn('text-sm sm:text-base font-black text-white transition-colors', `group-hover:${sk.accentColor}`)}>
                      {sk.title}
                    </h3>
                    <p className="mt-1 text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {sk.desc}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs font-bold text-slate-400 group-hover:text-white transition-colors">
                  <span>Kirish</span>
                  <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
