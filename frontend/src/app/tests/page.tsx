'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { soundFX } from '@/lib/soundFX';
import { tgHaptic } from '@/lib/telegram';
import {
  Shuffle, Search, Clock, HelpCircle, Lock, ArrowRight, Loader2,
  FileCheck2, GraduationCap, Users, Flame, AlertCircle, X, Sparkles, Bell, CheckCircle2,
  ArrowLeft, BookOpen, Landmark, Calculator, Dna, Languages, Globe, ChevronRight, Layers,
} from 'lucide-react';
import { apiFetch, ApiError } from '@/lib/api-client';
import { useApiQuery } from '@/lib/api-cache';
import { toast } from 'sonner';
import AppShell from '@/components/AppShell';
import { cn } from '@/lib/utils';
import Reveal from '@/components/motion/Reveal';
import PageHero from '@/components/student/PageHero';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import VerifiedBadge from '@/components/ui/verified-badge';
import PremiumIcon from '@/components/ui/premium-icon';
import BmbStressLaunchModal from '@/components/stress/BmbStressLaunchModal';

type AnswerMode = 'open' | 'closed' | 'mixed' | null;

export type TestAuthor = {
  id: number;
  name: string;
  username: string;
  avatar?: string;
  role?: string;
  is_superadmin?: boolean;
  is_teacher?: boolean;
};

type TestItem = {
  id: number;
  title: string;
  description: string;
  category: string;
  subject: string | null;
  duration_minutes: number;
  questions_count: number;
  is_premium: boolean;
  price?: number | null;
  is_unlocked: boolean;
  is_live_mock?: boolean;
  scheduled_at?: string | null;
  recent_solvers: number;
  recent_avg_score: number | null;
  answer_mode: AnswerMode;
  author?: TestAuthor | null;
  created_at?: string | null;
  is_new?: boolean;
};

function formatScheduledTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  try {
    const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
    let year: number, month: number, day: number, hour: number, minute: number;

    if (match) {
      year = parseInt(match[1], 10);
      month = parseInt(match[2], 10) - 1;
      day = parseInt(match[3], 10);
      hour = parseInt(match[4], 10);
      minute = parseInt(match[5], 10);
    } else {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '';
      year = d.getFullYear();
      month = d.getMonth();
      day = d.getDate();
      hour = d.getHours();
      minute = d.getMinutes();
    }

    const now = new Date();
    const isToday = now.getFullYear() === year && now.getMonth() === month && now.getDate() === day;

    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow = tomorrow.getFullYear() === year && tomorrow.getMonth() === month && tomorrow.getDate() === day;

    const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

    if (isToday) return `Bugun, ${timeStr}`;
    if (isTomorrow) return `Ertaga, ${timeStr}`;

    const d = new Date(year, month, day, hour, minute);
    const dateFormatted = d.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short' });
    return `${dateFormatted}, ${timeStr}`;
  } catch {
    return '';
  }
}

function parseExamDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
  if (match) {
    return new Date(
      parseInt(match[1], 10),
      parseInt(match[2], 10) - 1,
      parseInt(match[3], 10),
      parseInt(match[4], 10),
      parseInt(match[5], 10)
    );
  }
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

type CenterData = {
  tests: TestItem[];
  subjects: { id: number; name: string; slug: string; color?: string; icon_name?: string; tests_count?: number }[];
  selected_subject: string | null;
  selected_category: string;
  available_categories: string[];
  selected_answer_mode: string;
  search_query: string;
  total_attempts: number;
  avg_score: number;
  has_mock_test_access: boolean;
  has_lessons_access: boolean;
  mock_plan: { id: number; price: string } | null;
  pinned_mock?: {
    id: number;
    title: string;
    description: string;
    subject: string;
    subject_slug: string;
    category: string;
    duration_minutes: number;
    questions_count: number;
    scheduled_at: string | null;
    is_live_mock: boolean;
    is_reminded: boolean;
    remind_users_count?: number;
    waiting_participants_count?: number;
    author?: TestAuthor | null;
  } | null;
};

const CATEGORIES = [
  { value: 'all', label: 'Barchasi' },
  { value: 'certificate', label: 'Milliy Sertifikat' },
  { value: 'history', label: 'Mavzulashtirilgan' },
  { value: 'bba', label: 'BBA (DTM)' },
  { value: 'cefr', label: 'CEFR' },
];

const CATEGORY_BADGE: Record<string, string> = {
  certificate: 'Rasmiy Format',
  history: 'Mavzulashtirilgan',
  bba: 'DTB Formati',
  cefr: 'Ingliz tili',
  all: 'Test',
};

const ANSWER_MODES = [
  { value: 'all', label: 'Barcha formatlar' },
  { value: 'closed', label: 'Yopiq (Variantli)' },
  { value: 'open', label: 'Ochiq (Yozma)' },
  { value: 'mixed', label: 'Aralash' },
];

const ANSWER_MODE_BADGE: Record<string, { label: string; className: string }> = {
  closed: { label: 'Yopiq test', className: 'border-[#007AFF]/25 bg-[#007AFF]/10 text-[#007AFF]' },
  open: { label: 'Ochiq test', className: 'border-[#5856D6]/25 bg-[#5856D6]/10 text-[#5856D6]' },
  mixed: { label: 'Aralash test', className: 'border-[#FF9500]/25 bg-[#FF9500]/10 text-[#FF9500]' },
};

interface SubjectVisual {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  subtitle: string;
  gradient: string;
  borderHover: string;
  iconBg: string;
  iconColor: string;
  tag: string;
}

const SUBJECT_VISUALS: Record<string, SubjectVisual> = {
  'tarix': {
    name: 'Tarix',
    icon: Landmark,
    subtitle: "O'zbekiston va Jahon tarixi",
    gradient: 'from-amber-500/15 via-amber-500/5 to-transparent',
    borderHover: 'hover:border-amber-500/50 hover:shadow-amber-500/15',
    iconBg: 'bg-amber-500/15 border-amber-500/25',
    iconColor: 'text-amber-500',
    tag: 'Milliy Sertifikat & DTM',
  },
  'ona-tili': {
    name: 'Ona tili',
    icon: BookOpen,
    subtitle: 'Grammatika va Adabiyot',
    gradient: 'from-emerald-500/15 via-emerald-500/5 to-transparent',
    borderHover: 'hover:border-emerald-500/50 hover:shadow-emerald-500/15',
    iconBg: 'bg-emerald-500/15 border-emerald-500/25',
    iconColor: 'text-emerald-500',
    tag: 'BMB Rasmiy Standart',
  },
  'matematika': {
    name: 'Matematika',
    icon: Calculator,
    subtitle: 'Algebra va Geometriya',
    gradient: 'from-blue-500/15 via-blue-500/5 to-transparent',
    borderHover: 'hover:border-blue-500/50 hover:shadow-blue-500/15',
    iconBg: 'bg-blue-500/15 border-blue-500/25',
    iconColor: 'text-blue-500',
    tag: 'Mantiqiy & Amaliy',
  },
  'biologiya': {
    name: 'Biologiya',
    icon: Dna,
    subtitle: 'Botanika va Zoologiya',
    gradient: 'from-teal-500/15 via-teal-500/5 to-transparent',
    borderHover: 'hover:border-teal-500/50 hover:shadow-teal-500/15',
    iconBg: 'bg-teal-500/15 border-teal-500/25',
    iconColor: 'text-teal-500',
    tag: 'Tibbiyot & Tabiiy fan',
  },
  'ingliz-tili': {
    name: 'Ingliz tili',
    icon: Languages,
    subtitle: 'Grammar, Reading & CEFR',
    gradient: 'from-indigo-500/15 via-indigo-500/5 to-transparent',
    borderHover: 'hover:border-indigo-500/50 hover:shadow-indigo-500/15',
    iconBg: 'bg-indigo-500/15 border-indigo-500/25',
    iconColor: 'text-indigo-500',
    tag: 'CEFR & Milliy Sertifikat',
  },
  'rus-tili': {
    name: 'Rus tili',
    icon: Globe,
    subtitle: 'Rus tili va Adabiyoti',
    gradient: 'from-sky-500/15 via-sky-500/5 to-transparent',
    borderHover: 'hover:border-sky-500/50 hover:shadow-sky-500/15',
    iconBg: 'bg-sky-500/15 border-sky-500/25',
    iconColor: 'text-sky-500',
    tag: 'Grammatika & Leksika',
  },
};

function getSubjectVisual(slug: string, name: string): SubjectVisual {
  if (SUBJECT_VISUALS[slug]) return SUBJECT_VISUALS[slug];
  return {
    name,
    icon: BookOpen,
    subtitle: `${name} fanidan rasmiy testlar`,
    gradient: 'from-primary/15 via-primary/5 to-transparent',
    borderHover: 'hover:border-primary/50 hover:shadow-primary/15',
    iconBg: 'bg-primary/15 border-primary/25',
    iconColor: 'text-primary',
    tag: 'Rasmiy testlar',
  };
}

const SUBJECT_IOS_THEME: Record<string, {
  squircle: string;
  pill: string;
  accentText: string;
  button: string;
}> = {
  'ona-tili': {
    squircle: 'bg-[#34C759]',
    pill: 'border-[#34C759]/25 bg-[#34C759]/10 text-[#248A3D] dark:text-[#30D158]',
    accentText: 'text-[#34C759]',
    button: 'bg-[#34C759] hover:bg-[#2DB84E] text-white shadow-[0_4px_14px_rgba(52,199,89,0.28)]',
  },
  'matematika': {
    squircle: 'bg-[#007AFF]',
    pill: 'border-[#007AFF]/25 bg-[#007AFF]/10 text-[#007AFF]',
    accentText: 'text-[#007AFF]',
    button: 'bg-[#007AFF] hover:bg-[#0066D6] text-white shadow-[0_4px_14px_rgba(0,122,255,0.28)]',
  },
  'tarix': {
    squircle: 'bg-[#FF9500]',
    pill: 'border-[#FF9500]/25 bg-[#FF9500]/10 text-[#FF9500]',
    accentText: 'text-[#FF9500]',
    button: 'bg-[#FF9500] hover:bg-[#E68600] text-white shadow-[0_4px_14px_rgba(255,149,0,0.28)]',
  },
  'biologiya': {
    squircle: 'bg-[#30B0C7]',
    pill: 'border-[#30B0C7]/25 bg-[#30B0C7]/10 text-[#30B0C7]',
    accentText: 'text-[#30B0C7]',
    button: 'bg-[#30B0C7] hover:bg-[#289CB0] text-white shadow-[0_4px_14px_rgba(48,176,199,0.28)]',
  },
  'cefr': {
    squircle: 'bg-[#5856D6]',
    pill: 'border-[#5856D6]/25 bg-[#5856D6]/10 text-[#5856D6]',
    accentText: 'text-[#5856D6]',
    button: 'bg-[#5856D6] hover:bg-[#4A48C4] text-white shadow-[0_4px_14px_rgba(88,86,214,0.28)]',
  },
  'ingliz-tili': {
    squircle: 'bg-[#5856D6]',
    pill: 'border-[#5856D6]/25 bg-[#5856D6]/10 text-[#5856D6]',
    accentText: 'text-[#5856D6]',
    button: 'bg-[#5856D6] hover:bg-[#4A48C4] text-white shadow-[0_4px_14px_rgba(88,86,214,0.28)]',
  },
};

export default function TestsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlSubject = searchParams.get('subject');

  const [startError, setStartError] = useState<{ message: string; testId?: number; scheduledAt?: string | null } | null>(null);
  const [starting, setStarting] = useState<number | null>(null);
  const [stressModalOpen, setStressModalOpen] = useState(false);
  const [stressPreselectedTest, setStressPreselectedTest] = useState<{ id: number; title: string } | null>(null);

  const urlMode = searchParams.get('mode');
  const urlStress = searchParams.get('stress');
  const [heroMode, setHeroMode] = useState<'standard' | 'blitz' | 'stress'>(() => {
    if (urlMode === 'stress' || urlStress === '1' || urlStress === 'true') return 'stress';
    if (urlMode === 'blitz') return 'blitz';
    return 'standard';
  });

  // subject: null bo'lsa boshlang'ich Grid (grid-cols-4 / grid-cols-2) ko'rinadi.
  // subject: 'tarix' bo'lsa shu fanning ichki subkategoriyalari va testlari ko'rinadi.
  const [subject, setSubject] = useState<string | null>(() => {
    return urlSubject && urlSubject !== 'all' ? urlSubject : null;
  });
  const [category, setCategory] = useState('all');
  const [answerMode, setAnswerMode] = useState('all');
  const [search, setSearch] = useState('');

  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // URL so'rov parametrlarini yig'ish
  const params = new URLSearchParams();
  if (subject) {
    params.set('subject', subject);
  } else {
    params.set('subject', 'all');
  }
  if (category !== 'all') params.set('category', category);
  if (answerMode !== 'all') params.set('answer_mode', answerMode);
  if (debouncedSearch) params.set('search', debouncedSearch);
  const query = params.toString() ? `?${params.toString()}` : '';

  const { data, error: loadError } = useApiQuery<CenterData>(`/api/tests/${query}`);
  const errorMessage = startError?.message ?? loadError;

  // Foydalanuvchi URL orqali kelganda holatni yangilash
  useEffect(() => {
    if (urlSubject && urlSubject !== 'all' && urlSubject !== subject) {
      setSubject(urlSubject);
    }
  }, [urlSubject]);

  async function start(testId: number) {
    setStarting(testId);
    setStartError(null);
    try {
      const res = await apiFetch<{ attempt_id: number; mode?: string }>(`/api/tests/${testId}/start/`, { method: 'POST' });
      router.push(res.mode === 'cefr' ? `/tests/${res.attempt_id}/exam` : `/tests/${res.attempt_id}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Xatolik yuz berdi';
      const sched = (e instanceof ApiError && typeof e.payload?.scheduled_at === 'string') ? e.payload.scheduled_at : null;
      setStartError({ message: msg, testId, scheduledAt: sched });
      toast.error(msg);
      setStarting(null);
    }
  }

  async function startRandom() {
    setStarting(-1);
    setStartError(null);
    try {
      const res = await apiFetch<{ attempt_id: number }>('/api/tests/start-random/', { method: 'POST' });
      router.push(`/tests/${res.attempt_id}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Xatolik yuz berdi';
      setStartError({ message: msg });
      toast.error(msg);
      setStarting(null);
    }
  }

  const [pinnedReminded, setPinnedReminded] = useState<boolean | null>(null);
  const [togglingPinnedReminder, setTogglingPinnedReminder] = useState(false);

  async function togglePinnedReminder(e: React.MouseEvent, testId: number) {
    e.preventDefault();
    e.stopPropagation();
    setTogglingPinnedReminder(true);
    try {
      const res = await apiFetch<{ reminded: boolean; message: string }>(`/api/tests/${testId}/remind/`, {
        method: 'POST',
      });
      setPinnedReminded(res.reminded);
      if (res.reminded) {
        toast.success("Eslatma yoqildi! Imtihon boshlanishidan oldin Telegramingizga xabar boradi.");
      } else {
        toast.info("Eslatma bekor qilindi.");
      }
    } catch {
      toast.error("Eslatmani o'zgartirib bo'lmadi");
    } finally {
      setTogglingPinnedReminder(false);
    }
  }

  const availableCategories = data?.available_categories;
  const visibleCategories = useMemo(() => {
    return availableCategories
      ? CATEGORIES.filter((c) => c.value === 'all' || availableCategories.includes(c.value))
      : CATEGORIES;
  }, [availableCategories]);

  useEffect(() => {
    if (!availableCategories) return;
    if (category !== 'all' && !availableCategories.includes(category)) setCategory('all');
  }, [availableCategories, category]);

  // Hozirgi tanlangan fan obyekti
  const currentSubjectObj = useMemo(() => {
    if (!subject || !data?.subjects) return null;
    return data.subjects.find((s) => s.slug === subject) || null;
  }, [subject, data?.subjects]);

  // Fanni tanlash (Ichiga kirish)
  const handleSelectSubject = (slug: string) => {
    setSubject(slug);
    setCategory('all');
    setAnswerMode('all');
    router.replace(`/tests?subject=${slug}`, { scroll: false });
  };

  // Barcha fanlarga qaytish (Grid holatiga chiqish)
  const handleBackToAllSubjects = () => {
    setSubject(null);
    setCategory('all');
    setAnswerMode('all');
    router.replace('/tests', { scroll: false });
  };

  return (
    <>
      <AppShell />
      <main className="page-shell flex-1 space-y-6 bg-background text-foreground p-4 pb-20 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
        {/* ========================================================================= */}
        {/* IMTIHON REJIMLARI TAB SWITCHER (Standart | Blits | BMB Stress) */}
        {/* ========================================================================= */}
        <div className="space-y-3.5">
          {/* Segmented Mode Switcher */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-muted/70 border border-border/80 shadow-xs max-w-xl overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => {
                tgHaptic('select');
                soundFX.click();
                setHeroMode('standard');
              }}
              className={cn(
                'flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer whitespace-nowrap select-none',
                heroMode === 'standard'
                  ? 'bg-card text-foreground shadow-sm border border-border/50 scale-[1.01]'
                  : 'text-muted-foreground hover:text-foreground hover:bg-card/40'
              )}
            >
              <GraduationCap className={cn('size-4 transition-colors', heroMode === 'standard' ? 'text-primary' : 'text-muted-foreground')} />
              <span>Standart Testlar</span>
              <span className={cn(
                'px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold leading-none',
                heroMode === 'standard' ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
              )}>
                Rasmiy
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                tgHaptic('select');
                soundFX.click();
                setHeroMode('blitz');
              }}
              className={cn(
                'flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer whitespace-nowrap select-none',
                heroMode === 'blitz'
                  ? 'bg-card text-foreground shadow-sm border border-border/50 scale-[1.01]'
                  : 'text-muted-foreground hover:text-foreground hover:bg-card/40'
              )}
            >
              <Sparkles className={cn('size-4 transition-colors', heroMode === 'blitz' ? 'text-blue-500' : 'text-muted-foreground')} />
              <span>7-Savol Blits</span>
              <span className={cn(
                'px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold leading-none',
                heroMode === 'blitz' ? 'bg-blue-500/15 text-blue-500' : 'bg-muted text-muted-foreground'
              )}>
                +100 🪙
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                tgHaptic('select');
                soundFX.click();
                setHeroMode('stress');
              }}
              className={cn(
                'flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer whitespace-nowrap select-none',
                heroMode === 'stress'
                  ? 'bg-card text-foreground shadow-sm border border-border/50 scale-[1.01]'
                  : 'text-muted-foreground hover:text-foreground hover:bg-card/40'
              )}
            >
              <Flame className={cn('size-4 transition-colors', heroMode === 'stress' ? 'text-rose-500' : 'text-muted-foreground')} />
              <span>BMB Stress Zali</span>
              <span className={cn(
                'px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold leading-none',
                heroMode === 'stress' ? 'bg-rose-500/15 text-rose-500' : 'bg-muted text-muted-foreground'
              )}>
                🔥 DTM
              </span>
            </button>
          </div>

          {/* Active Mode Card with Smooth Transition */}
          <AnimatePresence mode="wait">
            {heroMode === 'standard' && (
              <motion.div
                key="standard"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <PageHero
                  eyebrow="BBA & Milliy Sertifikat · Rasmiy Simulyator"
                  eyebrowIcon={GraduationCap}
                  title="Test va Imtihonlar Markazi"
                  description="Davlat imtihonlariga moslashgan vaqt me'yori, baholash mezonlari va xatolar ustida ishlash tizimi."
                />
              </motion.div>
            )}

            {heroMode === 'blitz' && (
              <motion.div
                key="blitz"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="relative overflow-hidden rounded-[26px] bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 p-4 sm:p-5.5 text-white shadow-lg"
              >
                <div className="pointer-events-none absolute -right-10 -bottom-10 size-40 bg-white/10 rounded-full blur-2xl" />
                <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1.5 max-w-xl">
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur-md px-3 py-0.5 text-xs font-bold text-white">
                      <Sparkles className="size-3.5 text-amber-300" /> Ilk Sinov · 3 Daqiqalik Dofamin Blits
                    </div>
                    <h3 className="text-lg sm:text-xl font-black">
                      Qaysi darajadasiz? 7 ta savolda B+ potensialini aniqlang!
                    </h3>
                    <p className="text-xs sm:text-sm text-blue-100 leading-relaxed">
                      45 ta savollik to&apos;liq testga kirishdan oldin 7 ta adaptiv savoldan o&apos;ting, kuchli va zaif mavzularingizni ko&apos;ring hamda <strong>+100 Tanga bonus</strong> oling!
                    </p>
                  </div>
                  <Button asChild size="lg" className="rounded-xl bg-white text-blue-700 hover:bg-blue-50 font-black shadow-md shrink-0 h-11 px-6 cursor-pointer">
                    <Link href="/onboarding?mode=blitz">
                      Sinovdan o&apos;tish <ArrowRight className="size-4 ml-1.5" />
                    </Link>
                  </Button>
                </div>
              </motion.div>
            )}

            {heroMode === 'stress' && (
              <motion.div
                key="stress"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="relative overflow-hidden rounded-[28px] border-2 border-rose-500/40 bg-gradient-to-r from-rose-950/90 via-slate-900 to-amber-950/80 p-5 sm:p-6 shadow-xl text-white"
              >
                <div className="absolute top-0 right-0 -mr-12 -mt-12 size-60 rounded-full bg-rose-500/10 blur-3xl pointer-events-none" />
                <div className="flex flex-wrap items-center justify-between gap-4 relative z-10">
                  <div className="flex min-w-0 items-start sm:items-center gap-4">
                    <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-rose-600/30 border border-rose-500/40 shadow-inner">
                      <Flame className="size-7 text-rose-400 animate-pulse" />
                    </div>
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className="bg-rose-600 text-white font-black text-[10px] tracking-wider uppercase border-0">
                          🔥 EKSTREMAL SIMULYATOR
                        </Badge>
                        <Badge variant="outline" className="border-rose-400/40 bg-rose-400/10 text-rose-200 text-[11px] font-bold">
                          🎧 500 Kishi Zali Akustikasi
                        </Badge>
                        <Badge variant="outline" className="border-blue-400/40 bg-blue-400/10 text-blue-200 text-[11px] font-bold">
                          📝 Titul Varaqasi (Bubble Sheet)
                        </Badge>
                        <Badge variant="outline" className="border-amber-400/40 bg-amber-400/10 text-amber-200 text-[11px] font-bold">
                          ⚡ +50% Bonus XP
                        </Badge>
                      </div>
                      <h3 className="text-lg sm:text-xl font-black tracking-tight text-white">
                        Real BMB Imtihon Zali (Stress Mode)
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                        Divanda choy ichib 80% olish boshqa, real DTM zalidagi shivir-shivir, parta g&apos;ichirlashi, nazoratchi ovozi va Titul varaqasida qo&apos;l qaltirashi boshqa! Imtihon kuni shokiga tushmaslik uchun hoziroq o&apos;zingizni sinang.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Button
                      onClick={() => {
                        setStressPreselectedTest(null);
                        setStressModalOpen(true);
                      }}
                      size="lg"
                      className="rounded-full bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-lg shadow-rose-600/30 cursor-pointer h-11 px-6 text-xs sm:text-sm active:scale-95 transition-all"
                    >
                      <Flame className="size-4.5 mr-2 animate-pulse" />
                      Imtihon Zaliga Kirish
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* LIVE ACTIVITY PINNED MOCK IMTIHON BANNER */}
        {data?.pinned_mock && (() => {
          const theme = SUBJECT_IOS_THEME[data.pinned_mock.subject_slug] || SUBJECT_IOS_THEME['tarix'];
          const isReminded = pinnedReminded ?? data.pinned_mock.is_reminded;
          return (
            <Reveal>
              <div className="relative overflow-hidden rounded-[28px] bg-card border border-border p-5 sm:p-6 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex min-w-0 items-start sm:items-center gap-4">
                    <div className={cn("flex size-12 shrink-0 items-center justify-center rounded-[16px] text-white shadow-xs", theme.squircle)}>
                      <Flame className="size-6 fill-white" />
                    </div>
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white", theme.squircle)}>
                          <span className="size-1.5 rounded-full bg-white animate-ping" />
                          Katta Mock Imtihon
                        </span>
                        <Badge variant="outline" className={cn("text-[11px] font-bold", theme.pill)}>
                          {data.pinned_mock.subject}
                        </Badge>
                        {data.pinned_mock.scheduled_at && (
                          <Badge variant="outline" className="font-mono text-[11px] gap-1 font-bold border-border bg-muted text-foreground">
                            <Clock className="size-3 text-primary" /> {formatScheduledTime(data.pinned_mock.scheduled_at)}
                          </Badge>
                        )}
                        <Badge variant="outline" className="border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[11px] gap-1">
                          <Users className="size-3" /> {data.pinned_mock.waiting_participants_count || 32}+ abituriyent
                        </Badge>
                      </div>
                      <h3 className="text-[17px] sm:text-[19px] font-extrabold tracking-tight text-foreground truncate">
                        {data.pinned_mock.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12px] sm:text-[13px] text-muted-foreground">
                        <span>{data.pinned_mock.questions_count || 45} ta savol · {data.pinned_mock.duration_minutes || 90} daqiqa · Milliy Sertifikat Formati</span>
                        {data.pinned_mock.author && (
                          <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                            <span>· {data.pinned_mock.author.name}</span>
                            <VerifiedBadge role={data.pinned_mock.author.role} isSuperadmin={data.pinned_mock.author.is_superadmin} isTeacher={data.pinned_mock.author.is_teacher} size="xs" />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      disabled={togglingPinnedReminder}
                      onClick={(e) => togglePinnedReminder(e, data.pinned_mock!.id)}
                      className={cn(
                        "inline-flex h-11 items-center gap-1.5 rounded-full px-4 text-[13px] font-bold border transition-all active:scale-95 cursor-pointer",
                        isReminded
                          ? "border-emerald-500/30 bg-emerald-500/12 text-emerald-600 dark:text-emerald-400"
                          : "border-amber-500/30 bg-amber-500/12 text-amber-500"
                      )}
                    >
                      {isReminded ? (
                        <>
                          <CheckCircle2 className="size-4 text-emerald-500" />
                          <span>Eslatma yoqilgan</span>
                        </>
                      ) : (
                        <>
                          <Bell className="size-4 text-amber-500" />
                          <span>Menga eslatish</span>
                        </>
                      )}
                    </button>

                    <Link
                      href={`/tests/mock/${data.pinned_mock.id}`}
                      className={cn("inline-flex h-11 items-center gap-1.5 rounded-full px-5 text-[13px] font-bold transition-all active:scale-95", theme.button)}
                    >
                      <span>Kutish zaliga kirish</span>
                      <ArrowRight className="size-4" />
                    </Link>
                  </div>
                </div>
              </div>
            </Reveal>
          );
        })()}

        {/* ERROR NOTIFICATION BANNER */}
        {errorMessage && (
          <Reveal>
            <div
              className={cn(
                'relative overflow-hidden rounded-[24px] border p-4 sm:p-5 transition-all',
                (startError?.scheduledAt || errorMessage.includes('boshlanmadi'))
                  ? 'border-amber-500/30 bg-amber-500/10 text-foreground'
                  : 'border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400'
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3.5">
                  <div
                    className={cn(
                      'flex size-10 shrink-0 items-center justify-center rounded-[12px] text-white',
                      (startError?.scheduledAt || errorMessage.includes('boshlanmadi'))
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                    )}
                  >
                    <AlertCircle className="size-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold">{errorMessage}</h4>
                    {startError?.scheduledAt && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Boshlanish vaqti: {formatScheduledTime(startError.scheduledAt)}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setStartError(null)}
                  className="rounded-full p-1.5 text-muted-foreground hover:bg-muted"
                  aria-label="Yopish"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>
          </Reveal>
        )}

        {/* ========================================================================= */}
        {/* 1. KIRGANDA: ASOSIY FANLAR SETKASI (Desktop: grid-cols-4, Mobile: grid-cols-2) */}
        {/* ========================================================================= */}
        {subject === null ? (
          <div className="space-y-5">
            {/* Bo'lim Sarlavhasi */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
                  <BookOpen className="size-5 text-primary" />
                  <span>Fanlar to&apos;plami</span>
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                  Fanni tanlang va unga tegishli milliy sertifikat hamda BMB testlarini yeching
                </p>
              </div>
              <span className="hidden sm:inline-flex text-xs font-bold text-muted-foreground bg-muted px-3 py-1 rounded-full border border-border">
                {data?.subjects?.length || 6} ta yo&apos;nalish faol
              </span>
            </div>

            {/* RESPONSIV GRID: Mobile: grid-cols-2, Desktop: grid-cols-4 */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-4.5">
              {(data?.subjects || []).map((s) => {
                const visual = getSubjectVisual(s.slug, s.name);
                const IconComponent = visual.icon;
                const testsCount = s.tests_count ?? 0;

                return (
                  <motion.div
                    key={s.slug}
                    whileHover={{ y: -3 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSelectSubject(s.slug)}
                    className={cn(
                      'group relative rounded-[24px] p-4 sm:p-5 border border-border bg-card hover:bg-card/90 transition-all cursor-pointer flex flex-col justify-between overflow-hidden shadow-xs select-none',
                      visual.borderHover
                    )}
                  >
                    {/* Gradient fon */}
                    <div className={cn('pointer-events-none absolute inset-0 bg-gradient-to-br opacity-50 group-hover:opacity-100 transition-opacity', visual.gradient)} />

                    <div className="relative space-y-3">
                      <div className="flex items-center justify-between">
                        <div className={cn('size-11 sm:size-12 rounded-2xl flex items-center justify-center border shadow-xs transition-transform group-hover:scale-105', visual.iconBg)}>
                          <IconComponent className={cn('size-5 sm:size-6', visual.iconColor)} />
                        </div>

                        <span className={cn(
                          'text-[10px] sm:text-[11px] font-bold px-2.5 py-0.5 rounded-full border',
                          testsCount > 0
                            ? 'border-primary/25 bg-primary/10 text-primary'
                            : 'border-border bg-muted text-muted-foreground'
                        )}>
                          {testsCount > 0 ? `${testsCount} ta test` : 'Tez kunda'}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-base sm:text-lg font-black text-foreground group-hover:text-primary transition-colors tracking-tight">
                          {s.name}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                          {visual.subtitle}
                        </p>
                      </div>
                    </div>

                    <div className="relative mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs font-bold text-primary">
                      <span className="text-[11px] text-muted-foreground font-semibold truncate max-w-[100px]">{visual.tag}</span>
                      <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform shrink-0">
                        Kirish <ArrowRight className="size-3.5" />
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Apple Shortcuts Style Quick Test Card */}
            <div
              onClick={() => starting === null && startRandom()}
              className="group cursor-pointer rounded-[26px] bg-card border border-border hover:border-emerald-500/50 p-5 sm:p-6 shadow-xs transition-all active:scale-[0.99] mt-2"
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3.5">
                  <PremiumIcon icon={Shuffle} tone="emerald" size="md" solid />
                  <div className="min-w-0">
                    <h3 className="text-[16px] sm:text-[17px] font-bold tracking-tight text-foreground group-hover:text-emerald-500 transition-colors">
                      Tezkor Blits Test
                    </h3>
                    <p className="mt-0.5 text-[13px] text-muted-foreground">
                      10 ta savol · 10 daqiqa · bepul — barcha fanlardan aralash test yechish
                    </p>
                  </div>
                </div>
                <Button
                  disabled={starting !== null}
                  onClick={(e) => { e.stopPropagation(); startRandom(); }}
                  className="rounded-full px-5 bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-500/20 cursor-pointer"
                >
                  {starting === -1 ? <Loader2 className="size-4 animate-spin mr-1.5" /> : null}
                  BOSHLASH
                </Button>
              </div>
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* 2. FAN TANLANGANDA: BREADCRUMB, SUBCATEGORIYALAR VA TESTLAR RO'YXATI        */
          /* ========================================================================= */
          <div className="space-y-6">
            {/* Yuqori Navigatsiya: Orqaga qaytish & Fanlar pills */}
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={handleBackToAllSubjects}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-bold border border-border bg-card hover:bg-accent text-foreground transition-all cursor-pointer shadow-xs active:scale-95 group"
                >
                  <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" />
                  <span>← Barcha fanlarga qaytish</span>
                </button>

                {/* Boshqa fanga tezkor o'tish tugmalari */}
                <div className="flex items-center gap-1.5 overflow-x-auto py-1 no-scrollbar max-w-full">
                  {data?.subjects.map((s) => {
                    const active = subject === s.slug;
                    return (
                      <button
                        key={s.slug}
                        type="button"
                        onClick={() => handleSelectSubject(s.slug)}
                        className={cn(
                          'shrink-0 rounded-full px-3 py-1 text-xs font-bold transition-all border active:scale-95 cursor-pointer',
                          active
                            ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                            : 'bg-card text-muted-foreground hover:text-foreground border-border'
                        )}
                      >
                        {s.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tanlangan Fanning Bosh Banneri */}
              {currentSubjectObj && (() => {
                const visual = getSubjectVisual(currentSubjectObj.slug, currentSubjectObj.name);
                const IconComponent = visual.icon;
                return (
                  <div className="relative overflow-hidden rounded-[26px] border border-border bg-card p-4 sm:p-6 shadow-xs">
                    <div className={cn('pointer-events-none absolute inset-0 bg-gradient-to-r opacity-60', visual.gradient)} />
                    <div className="relative flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-4">
                        <div className={cn('size-12 sm:size-14 rounded-2xl flex items-center justify-center border shadow-xs', visual.iconBg)}>
                          <IconComponent className={cn('size-6 sm:size-7', visual.iconColor)} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                              {currentSubjectObj.name} testlari
                            </h1>
                            <Badge variant="outline" className="text-xs font-bold border-primary/25 bg-primary/10 text-primary">
                              {visual.tag}
                            </Badge>
                          </div>
                          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                            {visual.subtitle} · Rasmiy DTM me&apos;yori va Rasch modeli baholash standarti
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-bold text-muted-foreground">Mavjud testlar:</span>
                        <p className="text-lg sm:text-2xl font-black font-mono text-primary">
                          {data?.tests?.length || 0} ta
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* ICHMA-ICH SUBKATEGORIYALAR (Nested Subcategories & Filters) */}
            <div className="rounded-[24px] border border-border bg-card p-4 sm:p-5 space-y-4 shadow-xs">
              {/* 1-QATLAM: Subkategoriya (Imtihon turi: Milliy Sertifikat, Mavzulashtirilgan, BBA...) */}
              {visibleCategories.length > 1 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Sparkles className="size-3.5 text-primary" />
                      <span>Subkategoriya (Imtihon formati):</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2 overflow-x-auto py-1 no-scrollbar">
                    {visibleCategories.map((c) => {
                      const active = category === c.value;
                      return (
                        <button
                          key={c.value}
                          type="button"
                          onClick={() => setCategory(c.value)}
                          className={cn(
                            'shrink-0 rounded-full px-4 py-1.5 text-xs sm:text-[13px] font-bold transition-all border active:scale-95 cursor-pointer',
                            active
                              ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                              : 'bg-muted/60 text-muted-foreground hover:text-foreground border-border'
                          )}
                        >
                          {c.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 2-QATLAM: Savol shakli (Yopiq / Ochiq / Aralash) va Qidiruv */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-border/60">
                <div className="flex items-center gap-2">
                  <Tabs value={answerMode} onValueChange={setAnswerMode}>
                    <TabsList className="bg-muted/70 p-1 rounded-full border border-border">
                      {ANSWER_MODES.map((m) => (
                        <TabsTrigger key={m.value} value={m.value} className="rounded-full text-xs font-bold px-3 py-1">
                          {m.label}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </Tabs>
                </div>

                <div className="relative w-full sm:w-72">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={`${currentSubjectObj?.name || 'Fan'} testlaridan qidirish...`}
                    className="pl-10 rounded-full bg-background border-border"
                  />
                </div>
              </div>
            </div>

            {/* Statistika & Topilgan testlar sanog'i */}
            {data && (
              <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-[12px] font-medium text-muted-foreground">
                <span>
                  Jami urinishlar: <strong className="font-mono font-bold text-foreground">{data.total_attempts}</strong>
                  {' · '}O&apos;rtacha natija: <strong className="font-mono font-bold text-primary">{data.avg_score.toFixed(0)}%</strong>
                </span>
                <span className="font-mono font-semibold">{data.tests.length} ta test topildi</span>
              </div>
            )}

            {/* TEST KARTALARI RO'YXATI */}
            {!data && !errorMessage && (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-56 w-full rounded-[26px]" />)}
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {data?.tests.map((t, tIdx) => {
                const locked = t.is_premium && !t.is_unlocked;
                const isLiveMock = Boolean(t.is_live_mock);
                const examDate = parseExamDate(t.scheduled_at);
                const isScheduledFuture = Boolean(isLiveMock && examDate && examDate.getTime() > Date.now());
                const isNew = Boolean(
                  t.is_new ||
                  (t.created_at && (Date.now() - new Date(t.created_at).getTime()) < 10 * 24 * 60 * 60 * 1000)
                );
                const buyHref = data.mock_plan
                  ? `/premium/checkout/${data.mock_plan.id}?test=${t.id}`
                  : '/premium';
                const cardSubjectSlug = t.subject || data.pinned_mock?.subject_slug || subject || 'tarix';
                const cTheme = SUBJECT_IOS_THEME[cardSubjectSlug] || SUBJECT_IOS_THEME['tarix'];

                return (
                  <Reveal key={t.id} index={tIdx} className="h-full">
                    <div
                      className={cn(
                        "group relative flex h-full flex-col justify-between rounded-[28px] p-5 sm:p-6 transition-all duration-300 shadow-xs hover:shadow-xl border overflow-hidden",
                        isLiveMock
                          ? "border-primary/50 bg-gradient-to-b from-primary/[0.07] via-card to-card hover:border-primary shadow-primary/10"
                          : isNew
                          ? "border-amber-500/40 bg-gradient-to-b from-amber-500/[0.06] via-card to-card hover:border-amber-500/70 shadow-amber-500/10"
                          : "border-border/80 bg-gradient-to-b from-card via-card to-muted/20 hover:border-primary/50 hover:shadow-primary/10"
                      )}
                    >
                      {/* Top highlight bar on hover */}
                      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                      <div className="flex flex-1 flex-col">
                        {/* 1. Top Badges & Duration */}
                        <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {isNew && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white shadow-xs">
                                <Sparkles className="size-2.5 fill-white" /> Yangi
                              </span>
                            )}
                            {isLiveMock ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white shadow-xs">
                                <span className="size-1.5 rounded-full bg-white animate-ping" />
                                Jonli Mock
                              </span>
                            ) : (
                              <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold text-primary">
                                {CATEGORY_BADGE[t.category] || t.category}
                              </span>
                            )}
                            {t.answer_mode && ANSWER_MODE_BADGE[t.answer_mode] && (
                              <Badge variant="outline" className={cn("text-[10px] font-bold rounded-full", ANSWER_MODE_BADGE[t.answer_mode].className)}>
                                {ANSWER_MODE_BADGE[t.answer_mode].label}
                              </Badge>
                            )}
                          </div>

                          {isLiveMock && t.scheduled_at ? (
                            <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-mono text-[11px] font-bold", cTheme.pill)}>
                              <Clock className="size-3 text-primary" /> {formatScheduledTime(t.scheduled_at)}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-muted-foreground bg-muted/60 px-2.5 py-0.5 rounded-full border border-border/70">
                              <Clock className="size-3 text-primary" /> {t.duration_minutes} daq
                            </span>
                          )}
                        </div>

                        {/* 2. Title & Description */}
                        <h3 className="text-[17px] sm:text-[18px] font-black leading-snug tracking-tight text-foreground group-hover:text-primary transition-colors">
                          {t.title}
                        </h3>
                        <p className="mt-1.5 line-clamp-2 flex-1 text-[12.5px] sm:text-[13px] leading-relaxed text-muted-foreground">
                          {t.description}
                        </p>

                        <div className="my-3.5 h-px bg-border/60" />

                        {/* 3. Author & Meta Pills */}
                        <div className="space-y-2.5 mb-4">
                          {t.author && (
                            <div className="flex items-center gap-2 text-[12px]">
                              {t.author.avatar ? (
                                <img src={t.author.avatar} alt="" className="size-5 rounded-full object-cover ring-1 ring-border" />
                              ) : (
                                <div className="flex size-5 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">
                                  {t.author.name[0] || 'O'}
                                </div>
                              )}
                              <span className="font-bold text-foreground truncate max-w-[190px]">{t.author.name}</span>
                              <VerifiedBadge role={t.author.role} isSuperadmin={t.author.is_superadmin} isTeacher={t.author.is_teacher} size="xs" />
                            </div>
                          )}

                          <div className="flex items-center justify-between gap-2 text-[12px]">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-accent/60 text-[11.5px] font-bold text-foreground border border-border/80">
                              <HelpCircle className="size-3.5 text-primary" />
                              <span>{t.questions_count} ta savol</span>
                            </span>

                            {t.subject && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-primary/10 text-[11px] font-bold text-primary border border-primary/20">
                                <BookOpen className="size-3 text-primary" />
                                <span>{t.subject}</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* 4. Action Button (Vivid, modern gradient button) */}
                        {locked ? (
                          <Link
                            href={buyHref}
                            className="inline-flex h-11.5 w-full items-center justify-center gap-2 rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-orange-500/15 px-4 text-[13px] font-bold text-amber-600 dark:text-amber-400 hover:border-amber-500/70 hover:bg-amber-500/20 transition-all active:scale-[0.98] shadow-xs"
                          >
                            <Lock className="size-3.5" />
                            <span>
                              {data.mock_plan
                                ? `${Number(t.price ?? data.mock_plan.price).toLocaleString('uz-UZ')} so'mga ochish`
                                : (t.price ? `${Number(t.price).toLocaleString('uz-UZ')} so'mga ochish` : 'PRO obuna bilan ochiladi')}
                            </span>
                            <ArrowRight className="size-4 ml-1" />
                          </Link>
                        ) : isLiveMock && isScheduledFuture ? (
                          <Link
                            href={`/tests/mock/${t.id}`}
                            className="inline-flex h-11.5 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 px-4 text-[13px] font-bold text-white shadow-md shadow-blue-600/25 transition-all active:scale-[0.98]"
                          >
                            <span>Kutish zaliga kirish (Lobby)</span>
                            <ArrowRight className="size-4" />
                          </Link>
                        ) : isLiveMock ? (
                          <button
                            type="button"
                            className="inline-flex h-11.5 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:opacity-95 px-4 text-[13px] font-bold text-white shadow-md shadow-blue-600/25 transition-all active:scale-[0.98] cursor-pointer"
                            onClick={() => start(t.id)}
                            disabled={starting !== null}
                          >
                            {starting === t.id ? <Loader2 className="size-4 animate-spin" /> : null}
                            <span>{starting === t.id ? 'Boshlanmoqda...' : 'Jonli imtihonga kirish 🚀'}</span>
                            {starting !== t.id && <ArrowRight className="size-4" />}
                          </button>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              className="inline-flex h-11.5 flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 px-4 text-[13px] sm:text-sm font-bold text-primary-foreground shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all active:scale-[0.98] cursor-pointer"
                              onClick={() => start(t.id)}
                              disabled={starting !== null}
                            >
                              {starting === t.id ? <Loader2 className="size-4 animate-spin" /> : null}
                              <span>{starting === t.id ? 'Boshlanmoqda...' : 'Testni boshlash'}</span>
                              {starting !== t.id && <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />}
                            </button>
                            <button
                              type="button"
                              title="Ushbu testni Real BMB Stress zali rejimida ishlash"
                              className="inline-flex h-11.5 items-center justify-center gap-1.5 rounded-2xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 px-3 text-xs font-bold text-rose-600 dark:text-rose-400 transition-all active:scale-[0.98] cursor-pointer shrink-0"
                              onClick={() => {
                                setStressPreselectedTest({ id: t.id, title: t.title });
                                setStressModalOpen(true);
                              }}
                            >
                              <Flame className="size-4 text-rose-500 animate-pulse" />
                              <span>Stress</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </Reveal>
                );
              })}
            </div>

            {/* Test topilmaganda Empty State */}
            {data?.tests.length === 0 && (
              <div className="rounded-[28px] bg-card border border-border py-14 px-4 text-center space-y-3">
                <PremiumIcon icon={FileCheck2} tone="zinc" size="lg" className="mx-auto" />
                <h4 className="text-base font-bold text-foreground">
                  {search ? `"${search}" bo'yicha test topilmadi` : "Bu bo'limda hozircha testlar mavjud emas"}
                </h4>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto">
                  Boshqa subkategoriya yoki formatni tanlab ko&apos;ring, yoxud barcha fanlarga qayting.
                </p>
                <div className="pt-2 flex justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setCategory('all'); setAnswerMode('all'); setSearch(''); }}
                    className="rounded-full text-xs cursor-pointer"
                  >
                    Filtrlarni tozalash
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleBackToAllSubjects}
                    className="rounded-full text-xs cursor-pointer"
                  >
                    Barcha fanlar
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
        {/* Real BMB Stress Mode Launch Modal */}
        <BmbStressLaunchModal
          open={stressModalOpen}
          onOpenChange={setStressModalOpen}
          subjects={data?.subjects || []}
          preselectedTestId={stressPreselectedTest?.id}
          preselectedTitle={stressPreselectedTest?.title}
        />
      </main>
    </>
  );
}
