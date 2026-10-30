'use client';

import React, { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Zap,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  BookOpen,
  Landmark,
  Languages,
  Dna,
  Calculator,
  Globe,
  Check,
  Clock,
  Loader2,
  TrendingUp,
  Flame,
  Target,
} from 'lucide-react';
import type { SprintSubject } from '@/types/sprint';
import { soundFX } from '@/lib/soundFX';
import { tgHaptic } from '@/lib/telegram';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ============================================================================
// 1. ANIQ 6 TA FAN KONFIGURATSIYASI (Simmetrik 3x2 / 2x3 Grid uchun)
// ============================================================================
interface GridSubjectMeta {
  slug: string;
  defaultName: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
}

const GRID_SUBJECTS: GridSubjectMeta[] = [
  {
    slug: 'tarix',
    defaultName: 'Tarix',
    icon: Landmark,
    iconBg: 'bg-amber-500/10 border-amber-500/20',
    iconColor: 'text-amber-400',
  },
  {
    slug: 'ona-tili',
    defaultName: 'Ona tili',
    icon: BookOpen,
    iconBg: 'bg-emerald-500/10 border-emerald-500/20',
    iconColor: 'text-emerald-400',
  },
  {
    slug: 'matematika',
    defaultName: 'Matematika',
    icon: Calculator,
    iconBg: 'bg-violet-500/10 border-violet-500/20',
    iconColor: 'text-violet-400',
  },
  {
    slug: 'biologiya',
    defaultName: 'Biologiya',
    icon: Dna,
    iconBg: 'bg-lime-500/10 border-lime-500/20',
    iconColor: 'text-lime-400',
  },
  {
    slug: 'ingliz-tili',
    defaultName: 'Ingliz tili',
    icon: Languages,
    iconBg: 'bg-sky-500/10 border-sky-500/20',
    iconColor: 'text-sky-400',
  },
  {
    slug: 'rus-tili',
    defaultName: 'Rus tili',
    icon: Globe,
    iconBg: 'bg-blue-500/10 border-blue-500/20',
    iconColor: 'text-blue-400',
  },
];

// ============================================================================
// 2. DAVOMIYLIK KARTALARI (Segmented Intensity Options)
// ============================================================================
interface DurationOption {
  count: number;
  time: string;
  badge: string;
  badgeColor: string;
  xpText: string;
  xpColor: string;
  isPopular?: boolean;
}

const DURATION_OPTIONS: DurationOption[] = [
  {
    count: 10,
    time: '~5 daqiqa',
    badge: '⚡ Blits isinish',
    badgeColor: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
    xpText: '+1.0x XP',
    xpColor: 'text-zinc-400',
  },
  {
    count: 20,
    time: '~10 daqiqa',
    badge: '⭐ Optimal (Tavsiya)',
    badgeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    xpText: '🔥 +1.5x XP',
    xpColor: 'text-amber-400',
    isPopular: true,
  },
  {
    count: 30,
    time: '~15 daqiqa',
    badge: '🧠 Chuqur Flow',
    badgeColor: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
    xpText: '💎 +2.0x XP',
    xpColor: 'text-blue-400',
  },
];

// ============================================================================
// 3. PROPS INTERFACEYSI
// ============================================================================
export interface FocusSprintSetupProps {
  subjects: SprintSubject[];
  selectedSubjectId: number;
  onSelectSubject: (id: number) => void;
  questionCount: number;
  onSelectCount: (count: number) => void;
  onStart: (subjectId: number, count: number) => void;
  loading?: boolean;
}

export default function FocusSprintSetup({
  subjects,
  selectedSubjectId,
  onSelectSubject,
  questionCount,
  onSelectCount,
  onStart,
  loading = false,
}: FocusSprintSetupProps) {
  const router = useRouter();

  // "Barcha fanlar (Aralash)" hero obyekti
  const heroSubject = useMemo(() => {
    return (
      subjects.find((s) => s.slug === 'all' || s.id === 0) || {
        id: 0,
        name: 'Barcha fanlar (Aralash)',
        slug: 'all',
        questions_count: 1671,
        is_available: true,
      }
    );
  }, [subjects]);

  // 6 ta aniq fanni backend ma'lumotlari bilan birlashtirish
  const gridCards = useMemo(() => {
    return GRID_SUBJECTS.map((meta) => {
      const fromBackend = subjects.find(
        (s) => s.slug === meta.slug || s.name.toLowerCase() === meta.defaultName.toLowerCase()
      );
      return {
        id: fromBackend ? fromBackend.id : -1,
        name: fromBackend ? fromBackend.name : meta.defaultName,
        slug: meta.slug,
        questions_count: fromBackend ? fromBackend.questions_count : 0,
        is_available: fromBackend ? fromBackend.is_available : false,
        icon: meta.icon,
        iconBg: meta.iconBg,
        iconColor: meta.iconColor,
      };
    });
  }, [subjects]);

  // Hozir tanlangan fan obyekti
  const selectedSubjectObj = useMemo(() => {
    if (selectedSubjectId === 0 || selectedSubjectId === heroSubject.id) {
      return heroSubject;
    }
    return gridCards.find((c) => c.id === selectedSubjectId) || heroSubject;
  }, [selectedSubjectId, heroSubject, gridCards]);

  // CTA matnidagi qisqa nom (qavslarsiz)
  const shortSubjectLabel = useMemo(() => {
    if (!selectedSubjectObj || selectedSubjectObj.id === 0 || selectedSubjectObj.slug === 'all') {
      return 'Aralash';
    }
    return selectedSubjectObj.name;
  }, [selectedSubjectObj]);

  // Klaviatura orqali Enter bosganda sprintni boshlash
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !loading) {
        e.preventDefault();
        soundFX.click();
        tgHaptic('medium');
        onStart(selectedSubjectId, questionCount);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [loading, selectedSubjectId, questionCount, onStart]);

  const handleSubjectClick = (id: number, isAvailable: boolean, name: string) => {
    if (!isAvailable) {
      tgHaptic('error');
      toast.info(`${name} fani bo'yicha savollar tez kunda qo'shiladi!`);
      return;
    }
    soundFX.click();
    tgHaptic('light');
    onSelectSubject(id);
  };

  const handleCountClick = (count: number) => {
    soundFX.click();
    tgHaptic('light');
    onSelectCount(count);
  };

  const handleStartClick = () => {
    if (loading) return;
    soundFX.click();
    tgHaptic('medium');
    onStart(selectedSubjectId, questionCount);
  };

  const isHeroSelected = selectedSubjectId === 0 || selectedSubjectId === heroSubject.id;

  return (
    <div className="relative min-h-screen bg-[#07090E] text-zinc-100 flex flex-col justify-between selection:bg-blue-500/30 overflow-x-hidden">
      {/* ── Mayin radial yuqori nur ── */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/15 via-transparent to-transparent" />

      {/* ── Cockpit Container (Desktopda 100vh ga ixcham sig'adi) ── */}
      <div className="relative w-full max-w-4xl mx-auto px-4 py-4 sm:py-6 lg:py-7 flex-1 flex flex-col justify-between space-y-5 sm:space-y-6 pb-28 lg:pb-6">
        {/* ─────────────────────────────────────────────────────────────
            1. HEADER & COMPACT HERO (3 ta Feature Badge bilan)
           ───────────────────────────────────────────────────────────── */}
        <div className="space-y-3 sm:space-y-4">
          {/* Yuqori qator: Orqaga qaytish & Flow State Badge */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-zinc-400 hover:text-white transition-colors cursor-pointer group"
            >
              <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" />
              <span>Dashboardga qaytish</span>
            </button>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] sm:text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-[0_0_12px_rgba(59,130,246,0.2)]">
              <Zap className="size-3.5 fill-blue-400 text-blue-400" />
              <span className="tracking-wide uppercase">15 Daqiqalik Flow State</span>
            </div>
          </div>

          {/* Sarlavha & 3 ta Ixcham Feature Badgelar */}
          <div className="space-y-2.5">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
              <span>⚡ Fokus Sprinti</span>
            </h1>

            {/* 3 ta Kapsula-Badge (Prognoz, Combo, Qasos) */}
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <TrendingUp className="size-3.5" />
                <span>Jonli DTM Prognoz (+0.2 ball)</span>
              </div>

              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Flame className="size-3.5" />
                <span>2.0x Combo & XP</span>
              </div>

              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Target className="size-3.5" />
                <span>0.2s AI Layfxak & Qasos savoli</span>
              </div>
            </div>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            2. FAN TANLASH SETKASI: "1 HERO + 6 GRID" (Hech qanday toq qolish yo'q!)
           ───────────────────────────────────────────────────────────── */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <BookOpen className="size-3.5 text-blue-400" />
              <span>1. Fanni tanlang:</span>
            </span>
            <span className="text-[11px] text-zinc-400">
              {gridCards.filter((c) => c.is_available).length + 1} ta fan faol
            </span>
          </div>

          <div className="space-y-2.5">
            {/* ── A. HERO BANNER: "Barcha fanlar (Aralash — AI Smart Mix)" ── */}
            <motion.div
              whileTap={{ scale: 0.99 }}
              onClick={() => handleSubjectClick(heroSubject.id, true, heroSubject.name)}
              className={cn(
                'relative rounded-xl p-3 sm:p-3.5 border transition-all duration-200 select-none cursor-pointer flex items-center justify-between gap-3 overflow-hidden',
                isHeroSelected
                  ? 'border-blue-500 bg-blue-500/[0.08] shadow-[0_0_25px_-5px_rgba(59,130,246,0.35)] ring-1 ring-blue-500/50'
                  : 'border-white/5 bg-zinc-900/60 hover:bg-zinc-800/70 hover:border-white/10'
              )}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="size-10 sm:size-10.5 rounded-lg bg-gradient-to-br from-blue-500/20 via-indigo-500/20 to-purple-500/20 border border-blue-500/30 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(59,130,246,0.25)]">
                  <Sparkles className="size-5 text-blue-400" />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-sm sm:text-base text-white truncate">
                      Barcha fanlar (Aralash)
                    </p>
                    <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/30">
                      AI Smart Mix
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5 truncate">
                    AI zaif mavzularingizni avtomatik tanlaydi • {heroSubject.questions_count || 1671} ta test
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <span className="hidden md:inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/30">
                  AI Tavsiyasi
                </span>

                <div
                  className={cn(
                    'size-5 rounded-full flex items-center justify-center transition-all',
                    isHeroSelected
                      ? 'bg-blue-500 text-white shadow-[0_0_12px_rgba(59,130,246,0.8)]'
                      : 'border border-white/20'
                  )}
                >
                  {isHeroSelected && <Check className="size-3 stroke-[3]" />}
                </div>
              </div>
            </motion.div>

            {/* ── B. 6 TA ANIQ FAN (Desktop: 3x2, Mobile: 2x3 = Simmetrik 6 ta karta!) ── */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-2.5">
              {gridCards.map((subj) => {
                const isSelected = selectedSubjectId === subj.id && subj.id !== -1;
                const IconComponent = subj.icon;

                return (
                  <motion.div
                    key={subj.slug}
                    whileTap={subj.is_available ? { scale: 0.98 } : {}}
                    onClick={() => handleSubjectClick(subj.id, subj.is_available, subj.name)}
                    className={cn(
                      'relative rounded-xl p-3 border transition-all duration-200 select-none flex items-center justify-between gap-2.5 text-left',
                      subj.is_available ? 'cursor-pointer' : 'cursor-not-allowed opacity-50 bg-zinc-900/30 border-white/5',
                      isSelected && subj.is_available
                        ? 'border-blue-500 bg-blue-500/[0.08] shadow-[0_0_25px_-5px_rgba(59,130,246,0.35)] ring-1 ring-blue-500/50'
                        : subj.is_available && 'border-white/5 bg-zinc-900/60 hover:bg-zinc-800/70 hover:border-white/10'
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={cn(
                          'size-9 rounded-lg flex items-center justify-center border shrink-0',
                          subj.iconBg
                        )}
                      >
                        <IconComponent className={cn('size-4.5', subj.iconColor)} />
                      </div>

                      <div className="min-w-0">
                        <p className="font-semibold text-xs sm:text-sm text-white truncate leading-snug">
                          {subj.name}
                        </p>
                        <p className="text-[11px] text-zinc-400 mt-0.5 truncate">
                          {subj.is_available ? `${subj.questions_count} ta test` : 'Tez kunda'}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {isSelected ? (
                        <div className="size-4.5 rounded-full bg-blue-500 flex items-center justify-center text-white shadow-[0_0_10px_rgba(59,130,246,0.8)]">
                          <Check className="size-2.5 stroke-[3]" />
                        </div>
                      ) : (
                        <div className="size-4.5 rounded-full border border-white/15" />
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            3. SPRINT DAVOMIYLIGI (Segmented Intensity Cards)
           ───────────────────────────────────────────────────────────── */}
        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
            <Clock className="size-3.5 text-blue-400" />
            <span>2. Sprint davomiyligi:</span>
          </span>

          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {DURATION_OPTIONS.map((item) => {
              const isSelected = questionCount === item.count;
              return (
                <button
                  key={item.count}
                  type="button"
                  onClick={() => handleCountClick(item.count)}
                  className={cn(
                    'relative rounded-xl p-2.5 sm:p-3 border text-center transition-all duration-200 select-none cursor-pointer flex flex-col items-center justify-between',
                    isSelected
                      ? 'border-blue-500 bg-gradient-to-b from-blue-500/15 via-blue-500/5 to-transparent shadow-[0_0_20px_-3px_rgba(59,130,246,0.35)] ring-1 ring-blue-500/50'
                      : 'border-white/5 bg-zinc-900/60 hover:bg-zinc-800/70 hover:border-white/10'
                  )}
                >
                  {/* Eng ommabop yorlig'i */}
                  {item.isPopular && (
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-1.5 py-0.2 rounded-full text-[8.5px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-[0_0_8px_rgba(245,158,11,0.25)]">
                      Ommabop
                    </span>
                  )}

                  <p className="text-xs sm:text-sm font-extrabold text-white">
                    {item.count} ta savol
                  </p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">{item.time}</p>

                  <span
                    className={cn(
                      'mt-1.5 text-[9.5px] sm:text-[10px] font-semibold px-2 py-0.5 rounded-md border truncate max-w-full',
                      item.badgeColor
                    )}
                  >
                    {item.badge}
                  </span>

                  <span className={cn('mt-1 text-[10px] font-bold', item.xpColor)}>
                    {item.xpText}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            4. PREMIUM CTA BUTTON (Desktop: Static, Mobile: Sticky Bottom)
           ───────────────────────────────────────────────────────────── */}
        <div className="fixed bottom-0 left-0 right-0 z-40 backdrop-blur-xl bg-[#07090E]/90 border-t border-white/10 p-3 sm:p-4 lg:static lg:bg-transparent lg:border-none lg:p-0">
          <div className="max-w-4xl mx-auto">
            <button
              type="button"
              disabled={loading}
              onClick={handleStartClick}
              className={cn(
                'w-full h-12 sm:h-13 lg:h-14 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold shadow-[0_0_30px_-5px_rgba(37,99,235,0.5)] transition-all active:scale-[0.99] flex items-center justify-between px-4 sm:px-5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {loading ? (
                <div className="w-full flex items-center justify-center gap-2">
                  <Loader2 className="size-5 animate-spin" />
                  <span className="text-sm font-bold">Savollar tayyorlanmoqda...</span>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 text-sm sm:text-base font-bold">
                    <Zap className="size-4.5 sm:size-5 fill-white text-white shrink-0" />
                    <span>Sprintni Boshlash</span>
                    <kbd className="hidden lg:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-medium text-white/70 bg-white/10 rounded border border-white/20 ml-1.5">
                      ↵ Enter
                    </kbd>
                  </div>

                  {/* Toza ajratilgan pill: [Fan] • [N] ta savol -> */}
                  <div className="bg-white/15 px-2.5 sm:px-3 py-1 rounded-lg text-xs sm:text-sm font-medium flex items-center gap-1.5 backdrop-blur-sm shrink-0">
                    <span>
                      {shortSubjectLabel} • {questionCount} ta savol
                    </span>
                    <ArrowRight className="size-3.5 sm:size-4" />
                  </div>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

