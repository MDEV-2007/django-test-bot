'use client';

import React, { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
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
  Flame,
  HelpCircle,
  FileSpreadsheet,
  Swords,
} from 'lucide-react';
import SprintGuideModal from '@/components/sprint/SprintGuideModal';
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
    iconColor: 'text-amber-600 dark:text-amber-400',
  },
  {
    slug: 'ona-tili',
    defaultName: 'Ona tili',
    icon: BookOpen,
    iconBg: 'bg-emerald-500/10 border-emerald-500/20',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
  },
  {
    slug: 'matematika',
    defaultName: 'Matematika',
    icon: Calculator,
    iconBg: 'bg-violet-500/10 border-violet-500/20',
    iconColor: 'text-violet-600 dark:text-violet-400',
  },
  {
    slug: 'biologiya',
    defaultName: 'Biologiya',
    icon: Dna,
    iconBg: 'bg-lime-500/10 border-lime-500/20',
    iconColor: 'text-lime-600 dark:text-lime-400',
  },
  {
    slug: 'ingliz-tili',
    defaultName: 'Ingliz tili',
    icon: Languages,
    iconBg: 'bg-sky-500/10 border-sky-500/20',
    iconColor: 'text-sky-600 dark:text-sky-400',
  },
  {
    slug: 'rus-tili',
    defaultName: 'Rus tili',
    icon: Globe,
    iconBg: 'bg-blue-500/10 border-blue-500/20',
    iconColor: 'text-blue-600 dark:text-blue-400',
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
    badgeColor: 'text-sky-600 dark:text-sky-400 bg-sky-500/10 border-sky-500/20',
    xpText: '+1.0x XP',
    xpColor: 'text-muted-foreground',
  },
  {
    count: 20,
    time: '~10 daqiqa',
    badge: '⭐ Optimal (Tavsiya)',
    badgeColor: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20',
    xpText: '🔥 +1.5x XP',
    xpColor: 'text-amber-600 dark:text-amber-400',
    isPopular: true,
  },
  {
    count: 30,
    time: '~15 daqiqa',
    badge: '🧠 Chuqur Flow',
    badgeColor: 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
    xpText: '💎 +2.0x XP',
    xpColor: 'text-primary',
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
  onSelectArena?: () => void;
  loading?: boolean;
}

export default function FocusSprintSetup({
  subjects,
  selectedSubjectId,
  onSelectSubject,
  questionCount,
  onSelectCount,
  onStart,
  onSelectArena,
  loading = false,
}: FocusSprintSetupProps) {
  const router = useRouter();
  const [guideModalOpen, setGuideModalOpen] = React.useState(false);

  useEffect(() => {
    try {
      const seen = localStorage.getItem('ilm_sprint_guide_seen_v1');
      if (!seen) {
        const timer = setTimeout(() => {
          setGuideModalOpen(true);
        }, 350);
        return () => clearTimeout(timer);
      }
    } catch {}
  }, []);

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
    <div className="relative w-full max-w-4xl mx-auto flex flex-col justify-between space-y-5 sm:space-y-6 pb-36 sm:pb-40 lg:pb-6">
      {/* ── Mayin radial yuqori nur ── */}
      <div className="pointer-events-none absolute -inset-4 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent rounded-3xl" />

      {/* ── Cockpit Container ── */}
      <div className="relative w-full space-y-5 sm:space-y-6">
        {/* ─────────────────────────────────────────────────────────────
            1. HEADER & COMPACT HERO (3 ta Feature Badge bilan)
           ───────────────────────────────────────────────────────────── */}
        <div className="space-y-3 sm:space-y-4">
          {/* Yuqori qator: Orqaga qaytish & Qo'llanma & Flow State Badge */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer group"
            >
              <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" />
              <span>Dashboardga qaytish</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  soundFX.click();
                  setGuideModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] sm:text-xs font-semibold bg-accent hover:bg-accent/80 text-foreground border border-border shadow-2xs transition-colors cursor-pointer"
              >
                <HelpCircle className="size-3.5 text-primary" />
                <span>Qo&apos;llanma</span>
              </button>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] sm:text-xs font-semibold bg-primary/10 text-primary border border-primary/20 shadow-xs">
                <Zap className="size-3.5 fill-primary text-primary" />
                <span className="tracking-wide uppercase">15 Daqiqalik Flow State</span>
              </div>
            </div>
          </div>

          {/* Sarlavha & Kunlik 3 ta Mashq Qurollari Hubi */}
          <div className="space-y-3.5">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
                <span className="inline-flex items-center justify-center size-9 sm:size-10 rounded-2xl bg-amber-500/15 text-amber-500 shadow-xs">
                  <Zap className="size-5 fill-amber-500" />
                </span>
                <span>Mashq Markazi (Fokus &amp; Qasos)</span>
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Kunlik neyron mashqi: Qasos savollari bilan mustahkamlash, 60s shpargalkalar va 1v1 Arena.
              </p>
            </div>

            {/* ─── 3 TA MASHQ QUROLI (Bento Mode Hub) ─── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              {/* 1. Fokus & Qasos Sprinti (Faol Rejim) */}
              <div className="p-3.5 rounded-2xl border-2 border-amber-500 bg-amber-500/10 shadow-md relative overflow-hidden">
                <div className="flex items-center justify-between mb-2">
                  <div className="size-8 rounded-xl bg-amber-500 text-black flex items-center justify-center font-bold shadow-xs">
                    <Zap className="size-4 fill-black" />
                  </div>
                  <span className="bg-amber-500 text-black text-[12px] font-bold uppercase px-2 py-0.5 rounded-full">
                    FAOL MASHQ
                  </span>
                </div>
                <h4 className="font-bold text-sm text-foreground">Fokus &amp; Qasos Sprinti</h4>
                <p className="text-[12px] text-muted-foreground mt-0.5 leading-snug">
                  Neyron zanjiri, 3 qadamli Qasos savollari va 2.0x Combo.
                </p>
              </div>

              {/* 2. Anti-Darslik: 60s Shpargalkalar */}
              <Link
                href="/learning"
                onClick={() => { soundFX.click(); tgHaptic('medium'); }}
                className="group p-3.5 rounded-2xl border border-border/80 bg-card hover:border-emerald-500/60 hover:bg-emerald-500/5 transition-all shadow-xs block cursor-pointer"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="size-8 rounded-xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
                    <FileSpreadsheet className="size-4" />
                  </div>
                  <span className="text-[12px] font-bold text-emerald-500 flex items-center gap-0.5">
                    Ochish <ArrowRight className="size-3" />
                  </span>
                </div>
                <h4 className="font-bold text-sm text-foreground group-hover:text-emerald-500 transition-colors">
                  60s Anti-Darslik
                </h4>
                <p className="text-[12px] text-muted-foreground mt-0.5 leading-snug">
                  800 betlik kitob o&apos;rniga 15 ta BMB qopqoni &amp; shpargalkasi.
                </p>
              </Link>

              {/* 3. 1v1 Ghost Arena (Tab trigger) */}
              <button
                type="button"
                onClick={() => {
                  soundFX.click();
                  tgHaptic('medium');
                  if (onSelectArena) {
                    onSelectArena();
                  } else {
                    router.push('/sprint?tab=arena');
                  }
                }}
                className="group p-3.5 rounded-2xl border border-border/80 bg-card hover:border-rose-500/60 hover:bg-rose-500/5 transition-all shadow-xs block cursor-pointer text-left w-full active:scale-[0.98]"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="size-8 rounded-xl bg-rose-500/15 text-rose-500 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
                    <Swords className="size-4" />
                  </div>
                  <span className="text-[12px] font-bold text-rose-500 flex items-center gap-0.5">
                    Arenaga kirish <ArrowRight className="size-3" />
                  </span>
                </div>
                <h4 className="font-bold text-sm text-foreground group-hover:text-rose-500 transition-colors">
                  1v1 Ghost Arena
                </h4>
                <p className="text-[12px] text-muted-foreground mt-0.5 leading-snug">
                  Jonli bilimdon yoki Ghost replika bilan 60s duel &amp; ELO reyting.
                </p>
              </button>
            </div>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            2. FAN TANLASH SETKASI: "1 HERO + 6 GRID"
           ───────────────────────────────────────────────────────────── */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <BookOpen className="size-3.5 text-primary" />
              <span>1. Fanni tanlang:</span>
            </span>
            <span className="text-[12px] text-muted-foreground">
              {gridCards.filter((c) => c.is_available).length + 1} ta fan faol
            </span>
          </div>

          <div className="space-y-2.5">
            {/* ── A. HERO BANNER: "Barcha fanlar (Aralash — AI Smart Mix)" ── */}
            <motion.div
              whileTap={{ scale: 0.99 }}
              onClick={() => handleSubjectClick(heroSubject.id, true, heroSubject.name)}
              className={cn(
                'relative rounded-2xl p-3.5 sm:p-4 border transition-all duration-200 select-none cursor-pointer flex items-center justify-between gap-3 overflow-hidden',
                isHeroSelected
                  ? 'border-primary bg-primary/10 shadow-[0_4px_20px_-4px_rgba(0,122,255,0.25)] ring-1 ring-primary/40'
                  : 'border-border bg-card hover:bg-accent/40 hover:border-border/80 shadow-xs'
              )}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="size-10 sm:size-11 rounded-xl bg-gradient-to-br from-primary/20 via-indigo-500/20 to-purple-500/20 border border-primary/30 flex items-center justify-center shrink-0 shadow-xs">
                  <Sparkles className="size-5 text-primary" />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-sm sm:text-base text-foreground truncate">
                      Barcha fanlar (Aralash)
                    </p>
                    <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md text-[12px] font-semibold bg-primary/15 text-primary border border-primary/25">
                      AI Smart Mix
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    AI zaif mavzularingizni avtomatik tanlaydi • {heroSubject.questions_count || 1671} ta test
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <span className="hidden md:inline-flex items-center px-2.5 py-0.5 rounded-full text-[12px] font-semibold bg-primary/15 text-primary border border-primary/25">
                  AI Tavsiyasi
                </span>

                <div
                  className={cn(
                    'size-5 rounded-full flex items-center justify-center transition-all',
                    isHeroSelected
                      ? 'bg-primary text-white shadow-[0_0_12px_rgba(0,122,255,0.8)]'
                      : 'border border-border'
                  )}
                >
                  {isHeroSelected && <Check className="size-3 stroke-[3]" />}
                </div>
              </div>
            </motion.div>

            {/* ── B. 6 TA ANIQ FAN ── */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
              {gridCards.map((subj) => {
                const isSelected = selectedSubjectId === subj.id && subj.id !== -1;
                const IconComponent = subj.icon;

                return (
                  <motion.div
                    key={subj.slug}
                    whileTap={subj.is_available ? { scale: 0.98 } : {}}
                    onClick={() => handleSubjectClick(subj.id, subj.is_available, subj.name)}
                    className={cn(
                      'relative rounded-2xl p-3 border transition-all duration-200 select-none flex items-center justify-between gap-2.5 text-left',
                      subj.is_available ? 'cursor-pointer' : 'cursor-not-allowed opacity-45 bg-muted/30 border-border/60',
                      isSelected && subj.is_available
                        ? 'border-primary bg-primary/10 shadow-[0_4px_18px_-4px_rgba(0,122,255,0.25)] ring-1 ring-primary/40'
                        : subj.is_available && 'border-border bg-card hover:bg-accent/40 hover:border-border/80 shadow-xs'
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={cn(
                          'size-9 rounded-xl flex items-center justify-center border shrink-0',
                          subj.iconBg
                        )}
                      >
                        <IconComponent className={cn('size-4.5', subj.iconColor)} />
                      </div>

                      <div className="min-w-0">
                        <p className="font-semibold text-xs sm:text-sm text-foreground truncate leading-snug">
                          {subj.name}
                        </p>
                        <p className="text-[12px] text-muted-foreground mt-0.5 truncate">
                          {subj.is_available ? `${subj.questions_count} ta test` : 'Tez kunda'}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {isSelected ? (
                        <div className="size-4.5 rounded-full bg-primary flex items-center justify-center text-white shadow-xs">
                          <Check className="size-2.5 stroke-[3]" />
                        </div>
                      ) : (
                        <div className="size-4.5 rounded-full border border-border" />
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
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Clock className="size-3.5 text-primary" />
            <span>2. Test davomiyligi:</span>
          </span>

          <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
            {DURATION_OPTIONS.map((item) => {
              const isSelected = questionCount === item.count;
              return (
                <button
                  key={item.count}
                  type="button"
                  onClick={() => handleCountClick(item.count)}
                  className={cn(
                    'relative rounded-2xl p-3 sm:p-3.5 border text-center transition-all duration-200 select-none cursor-pointer flex flex-col items-center justify-between',
                    isSelected
                      ? 'border-primary bg-primary/10 shadow-[0_4px_18px_-4px_rgba(0,122,255,0.25)] ring-1 ring-primary/40'
                      : 'border-border bg-card hover:bg-accent/40 hover:border-border/80 shadow-xs'
                  )}
                >
                  {/* Eng ommabop yorlig'i */}
                  {item.isPopular && (
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/40 shadow-xs">
                      Ommabop
                    </span>
                  )}

                  <p className="text-xs sm:text-sm font-bold text-foreground">
                    {item.count} ta savol
                  </p>
                  <p className="text-[12px] text-muted-foreground mt-0.5">{item.time}</p>

                  <span
                    className={cn(
                      'mt-1.5 text-[9.5px] sm:text-[12px] font-semibold px-2 py-0.5 rounded-md border truncate max-w-full',
                      item.badgeColor
                    )}
                  >
                    {item.badge}
                  </span>

                  <span className={cn('mt-1 text-[12px] font-bold', item.xpColor)}>
                    {item.xpText}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            4. PREMIUM CTA BUTTON (Desktop: Static in-flow, Mobile: Floating & In-flow)
           ───────────────────────────────────────────────────────────── */}
        <div className="pt-2 pb-6 lg:p-0">
          <div className="max-w-4xl mx-auto backdrop-blur-xl bg-background/95 p-1 sm:p-2 lg:p-0 rounded-2xl border border-border/80 lg:border-none shadow-lg lg:shadow-none">
            <button
              type="button"
              disabled={loading}
              onClick={handleStartClick}
              className={cn(
                'w-full h-13 sm:h-14 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold shadow-[0_4px_20px_rgba(37,99,235,0.4)] transition-all active:scale-[0.99] flex items-center justify-between px-4 sm:px-5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'
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
                    <Zap className="size-5 fill-white text-white shrink-0" />
                    <span>Testni Boshlash</span>
                    <kbd className="hidden lg:inline-flex items-center px-1.5 py-0.5 text-[12px] font-mono font-medium text-white/70 bg-white/10 rounded border border-white/20 ml-1.5">
                      ↵ Enter
                    </kbd>
                  </div>

                  {/* Toza ajratilgan pill: [Fan] • [N] ta savol -> */}
                  <div className="bg-white/20 px-2.5 sm:px-3 py-1 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-1.5 backdrop-blur-sm shrink-0">
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

      <SprintGuideModal
        open={guideModalOpen}
        onOpenChange={setGuideModalOpen}
      />
    </div>
  );
}

