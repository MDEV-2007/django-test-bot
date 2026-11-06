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
    <div className="relative mx-auto flex w-full max-w-5xl flex-col space-y-8 pb-36 sm:pb-40 lg:pb-6">
      {/* ── Yuqori qator ── */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => router.push('/dashboard')}
          className="ps-chip cursor-pointer transition-transform hover:-translate-x-0.5"
        >
          <ArrowLeft className="size-4" /> Dashboard
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              soundFX.click();
              setGuideModalOpen(true);
            }}
            className="ps-chip cursor-pointer"
          >
            <HelpCircle className="size-3.5 text-[var(--ps-purple)]" /> Qo&apos;llanma
          </button>
          <span className="ps-chip !bg-[#080808] !text-[#FFFCF7]">
            <Zap className="size-3.5 text-[var(--ps-orange)]" /> 15 daqiqalik flow state
          </span>
        </div>
      </div>

      {/* ── Hero ── */}
      <section>
        <p className="ps-eyebrow text-[var(--text-muted)]">Kunlik neyron mashqi</p>
        <h1 className="ps-display mt-3 text-[44px] sm:text-[64px] xl:text-[76px]">
          Mashq{' '}
          <span className="relative inline-block text-[var(--ps-orange)]">
            markazi
            <svg aria-hidden viewBox="0 0 300 24" preserveAspectRatio="none" className="absolute -bottom-2 left-0 h-3 w-full text-[var(--ps-purple)] sm:-bottom-3 sm:h-4">
              <path className="ps-draw" d="M4 16 C 60 4, 120 22, 180 10 S 270 8, 296 14" fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" pathLength={1} />
            </svg>
          </span>
          <span className="text-[var(--ps-coral)]">.</span>
        </h1>
        <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-[var(--text-secondary)]">
          Qasos savollari bilan mustahkamlash, 60 soniyalik shpargalkalar va 1v1 arena — bir joyda.
        </p>
      </section>

      {/* ── 3 ta mashq quroli ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="ps-mode-active relative overflow-hidden rounded-[28px] bg-[var(--ps-orange)] p-5 text-[#080808] sm:p-6">
          <span aria-hidden className="absolute -right-8 -top-8 size-28 rounded-full bg-white/25" />
          <div className="relative flex items-center justify-between">
            <span className="inline-flex size-11 items-center justify-center rounded-full bg-[#080808] text-[var(--ps-orange)]">
              <Zap className="size-5" />
            </span>
            <span className="rounded-full bg-[#080808] px-2.5 py-1 text-[11px] font-bold text-white">Faol mashq</span>
          </div>
          <h4 className="ps-display relative mt-5 text-[22px]">Fokus &amp; qasos sprinti</h4>
          <p className="relative mt-1.5 text-[12px] leading-snug text-black/65">Neyron zanjiri, 3 qadamli qasos savollari va 2.0x combo.</p>
        </div>

        <Link
          href="/learning"
          onClick={() => { soundFX.click(); tgHaptic('medium'); }}
          className="group relative block overflow-hidden rounded-[28px] bg-[var(--ps-green)] p-5 text-white transition-transform hover:-translate-y-1 sm:p-6"
        >
          <span aria-hidden className="absolute -right-8 -top-8 size-28 rounded-full bg-white/15" />
          <div className="relative flex items-center justify-between">
            <span className="inline-flex size-11 items-center justify-center rounded-full bg-black/15">
              <FileSpreadsheet className="size-5" />
            </span>
            <span className="flex size-9 items-center justify-center rounded-full bg-[#080808] transition-transform group-hover:-rotate-45">
              <ArrowRight className="size-4" />
            </span>
          </div>
          <h4 className="ps-display relative mt-5 text-[22px]">60s anti-darslik</h4>
          <p className="relative mt-1.5 text-[12px] leading-snug text-white/75">800 betlik kitob o&apos;rniga 15 ta BMB qopqoni va shpargalkasi.</p>
        </Link>

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
          className="group relative block w-full cursor-pointer overflow-hidden rounded-[28px] bg-[var(--ps-coral)] p-5 text-left text-white transition-transform hover:-translate-y-1 sm:p-6"
        >
          <span aria-hidden className="absolute -right-8 -top-8 size-28 rounded-full bg-white/15" />
          <div className="relative flex items-center justify-between">
            <span className="inline-flex size-11 items-center justify-center rounded-full bg-black/15">
              <Swords className="size-5" />
            </span>
            <span className="flex size-9 items-center justify-center rounded-full bg-[#080808] transition-transform group-hover:-rotate-45">
              <ArrowRight className="size-4" />
            </span>
          </div>
          <h4 className="ps-display relative mt-5 text-[22px]">1v1 Ghost arena</h4>
          <p className="relative mt-1.5 text-[12px] leading-snug text-white/75">Jonli bilimdon yoki ghost replika bilan 60s duel va ELO reyting.</p>
        </button>
      </div>

      {/* ── 1. Fan tanlash ── */}
      <section className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="ps-eyebrow text-[var(--text-muted)]">1-qadam</p>
            <h2 className="ps-display mt-2 text-[28px] sm:text-[34px]">Fanni <span className="text-[var(--ps-purple)]">tanlang</span></h2>
          </div>
          <span className="ps-chip">{gridCards.filter((c) => c.is_available).length + 1} ta fan faol</span>
        </div>

        {/* Aralash — AI smart mix */}
        <motion.button
          type="button"
          whileTap={{ scale: 0.99 }}
          onClick={() => handleSubjectClick(heroSubject.id, true, heroSubject.name)}
          className={cn(
            'relative flex w-full cursor-pointer select-none items-center justify-between gap-4 overflow-hidden rounded-[28px] p-5 text-left transition-all sm:p-6',
            isHeroSelected ? 'bg-[#080808] text-[#FFFCF7]' : 'bg-[var(--ps-paper)] text-[var(--text-primary)] shadow-[var(--ds-panel-shadow)] hover:-translate-y-0.5',
          )}
        >
          <span aria-hidden className={cn('absolute -right-10 -top-10 size-36 rounded-full', isHeroSelected ? 'bg-[var(--ps-purple)] opacity-60' : 'bg-[var(--ps-purple)] opacity-15')} />
          <span className="relative flex min-w-0 items-center gap-4">
            <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--ps-purple)] text-white">
              <Sparkles className="size-6" />
            </span>
            <span className="min-w-0">
              <span className="flex flex-wrap items-center gap-2">
                <span className="ps-display text-[22px] sm:text-[26px]">Barcha fanlar (aralash)</span>
                <span className="rounded-full bg-[var(--ps-orange)] px-2.5 py-0.5 text-[11px] font-bold text-[#080808]">AI smart mix</span>
              </span>
              <span className={cn('mt-1 block truncate text-[12px]', isHeroSelected ? 'text-white/65' : 'text-[var(--text-muted)]')}>
                AI zaif mavzularingizni avtomatik tanlaydi • {heroSubject.questions_count || 1671} ta test
              </span>
            </span>
          </span>
          <span className={cn('relative flex size-7 shrink-0 items-center justify-center rounded-full', isHeroSelected ? 'bg-[var(--ps-orange)] text-[#080808]' : 'ring-2 ring-[var(--border-strong)]')}>
            {isHeroSelected && <Check className="size-4 stroke-[3]" />}
          </span>
        </motion.button>

        {/* 6 ta fan */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {gridCards.map((subj, i) => {
            const isSelected = selectedSubjectId === subj.id && subj.id !== -1;
            const IconComponent = subj.icon;
            const tone = ['bg-[var(--ps-purple)] text-white', 'bg-[var(--ps-orange)] text-[#080808]', 'bg-[var(--ps-green)] text-white', 'bg-[var(--ps-coral)] text-white', 'bg-[var(--ps-blue)] text-[#080808]', 'bg-[#080808] text-[#FFFCF7]'][i % 6];
            return (
              <motion.button
                type="button"
                key={subj.slug}
                whileTap={subj.is_available ? { scale: 0.98 } : {}}
                onClick={() => handleSubjectClick(subj.id, subj.is_available, subj.name)}
                className={cn(
                  'relative flex select-none items-center justify-between gap-3 rounded-[24px] p-3.5 text-left transition-all sm:p-4',
                  !subj.is_available && 'cursor-not-allowed bg-[var(--ps-paper)] opacity-45',
                  subj.is_available && !isSelected && 'cursor-pointer bg-[var(--ps-paper)] shadow-[var(--ds-panel-shadow)] hover:-translate-y-0.5',
                  isSelected && 'cursor-pointer bg-[var(--ps-paper)] ring-[3px] ring-[#080808] dark:ring-[#FFFCF7]',
                )}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className={cn('inline-flex size-10 shrink-0 items-center justify-center rounded-2xl', tone)}>
                    <IconComponent className="size-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[14px] font-bold">{subj.name}</span>
                    <span className="block truncate text-[11px] text-[var(--text-muted)]">
                      {subj.is_available ? `${subj.questions_count} ta test` : 'Tez kunda'}
                    </span>
                  </span>
                </span>
                <span className={cn('flex size-6 shrink-0 items-center justify-center rounded-full', isSelected ? 'bg-[#080808] text-[#FFFCF7] dark:bg-[#FFFCF7] dark:text-[#080808]' : 'ring-2 ring-[var(--border-strong)]')}>
                  {isSelected && <Check className="size-3.5 stroke-[3]" />}
                </span>
              </motion.button>
            );
          })}
        </div>
      </section>

      {/* ── 2. Davomiylik ── */}
      <section className="space-y-4">
        <div>
          <p className="ps-eyebrow text-[var(--text-muted)]">2-qadam</p>
          <h2 className="ps-display mt-2 text-[28px] sm:text-[34px]">Test <span className="text-[var(--ps-green)]">davomiyligi</span></h2>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {DURATION_OPTIONS.map((item) => {
            const isSelected = questionCount === item.count;
            return (
              <button
                key={item.count}
                type="button"
                onClick={() => handleCountClick(item.count)}
                className={cn(
                  'relative flex cursor-pointer select-none flex-col items-center rounded-[24px] p-4 text-center transition-all sm:p-5',
                  isSelected ? 'bg-[var(--ps-purple)] text-white shadow-[0_18px_34px_-20px_rgba(118,89,199,0.9)]' : 'bg-[var(--ps-paper)] shadow-[var(--ds-panel-shadow)] hover:-translate-y-0.5',
                )}
              >
                {item.isPopular && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-[var(--ps-orange)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#080808]">
                    Ommabop
                  </span>
                )}
                <span className="ps-num text-[34px] sm:text-[44px]">{item.count}</span>
                <span className={cn('text-[11px] font-semibold', isSelected ? 'text-white/75' : 'text-[var(--text-muted)]')}>ta savol · {item.time}</span>
                <span className={cn('mt-2 max-w-full truncate rounded-full px-2.5 py-0.5 text-[10.5px] font-bold', isSelected ? 'bg-white/20' : 'bg-[var(--ps-neutral)] text-[var(--text-secondary)]')}>
                  {item.badge}
                </span>
                <span className={cn('mt-1.5 text-[12px] font-bold', isSelected ? 'text-[var(--ps-orange)]' : 'text-[var(--ps-green)]')}>{item.xpText}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Boshlash ── */}
      <div className="fixed inset-x-3 bottom-24 z-30 sm:bottom-24 lg:static lg:inset-auto">
        <button
          type="button"
          disabled={loading}
          onClick={handleStartClick}
          className="ps-btn ps-btn-ink h-16 w-full justify-between !rounded-full !px-6 !text-base disabled:opacity-60"
        >
          {loading ? (
            <span className="flex w-full items-center justify-center gap-2">
              <Loader2 className="size-5 animate-spin" /> Savollar tayyorlanmoqda...
            </span>
          ) : (
            <>
              <span className="flex items-center gap-2">
                <Zap className="size-5 text-[var(--ps-orange)]" />
                Testni boshlash
                <kbd className="ml-1 hidden rounded-full bg-white/15 px-2 py-0.5 font-mono text-[11px] lg:inline-flex dark:bg-black/10">↵ Enter</kbd>
              </span>
              <span className="flex items-center gap-2 text-sm font-semibold">
                <span className="hidden sm:inline">{shortSubjectLabel} • {questionCount} ta savol</span>
                <span className="ps-btn-arrow"><ArrowRight className="size-4" /></span>
              </span>
            </>
          )}
        </button>
      </div>

      <SprintGuideModal
        open={guideModalOpen}
        onOpenChange={setGuideModalOpen}
      />
    </div>
  );
}
