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
  Headphones, Zap, Trophy, Shield,
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
import { useTransliterate } from '@/lib/transliterate';

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

const FALLBACK_SUBJECTS = [
  { id: 1, slug: 'tarix', name: 'Tarix' },
  { id: 2, slug: 'ona-tili', name: 'Ona tili' },
  { id: 3, slug: 'matematika', name: 'Matematika' },
  { id: 4, slug: 'biologiya', name: 'Biologiya' },
  { id: 6, slug: 'ingliz-tili', name: 'Ingliz tili' },
  { id: 7, slug: 'rus-tili', name: 'Rus tili' },
];

const BLITZ_SUBJECT_DETAILS: Record<string, { desc: string; focus: string; questionsCount: number; duration: number; coins: number; xp: number }> = {
  'tarix': {
    desc: "Qadimgi Turondan mustaqillikkacha 7 ta saralangan o'ta muhim sana, janglar va BMB qopqonlari.",
    focus: "Xronologiya, Shaxslar & Davlatlar",
    questionsCount: 7,
    duration: 7,
    coins: 100,
    xp: 50,
  },
  'ona-tili': {
    desc: "Morfologiya, imlo qoidalari, leksika va mumtoz adabiyot durdonalaridan 7 ta tezkor savol.",
    focus: "Grammatika, Imlo & Mumtoz Adabiyot",
    questionsCount: 7,
    duration: 7,
    coins: 100,
    xp: 50,
  },
  'matematika': {
    desc: "Algebra, geometriya va mantiqiy fikrlash bo'yicha 7 ta chaqqon hisob-kitobli savol.",
    focus: "Mantiq, Algebra & Tezkor Hisob",
    questionsCount: 7,
    duration: 7,
    coins: 100,
    xp: 50,
  },
  'biologiya': {
    desc: "Hujayra tuzilishi, odam anatomiyasi, genetika va botanikadan 7 ta ekspress savol.",
    focus: "Anatomiya, Sitologiya & Genetika",
    questionsCount: 7,
    duration: 7,
    coins: 100,
    xp: 50,
  },
  'ingliz-tili': {
    desc: "Grammar, Reading va Vocabulary bo'yicha 7 ta tezkor savol. CEFR darajangizni lahzada aniqlang.",
    focus: "CEFR Grammar, Lexis & Reading",
    questionsCount: 7,
    duration: 7,
    coins: 100,
    xp: 50,
  },
  'rus-tili': {
    desc: "Rus tili grammatikasi, so'z turkumlari, orfografiya va so'z boyligidan 7 ta blitz test.",
    focus: "Орфография, Грамматика & Лексика",
    questionsCount: 7,
    duration: 7,
    coins: 100,
    xp: 50,
  },
};

const STRESS_SUBJECT_DETAILS: Record<string, { desc: string; questionsCount: number; duration: number; coins: number; bonusXp: string }> = {
  'tarix': {
    desc: "30 ta rasmiy DTM savoli, 500 kishilik zal shovqini va qora ruchkada titul varaqasini bo'yash.",
    questionsCount: 30,
    duration: 60,
    coins: 200,
    bonusXp: "+50% XP",
  },
  'ona-tili': {
    desc: "Ona tili va adabiyotidan 30 ta chuqur tahliliy test, qat'iy vaqt bosimi va titul varaqasi.",
    questionsCount: 30,
    duration: 60,
    coins: 200,
    bonusXp: "+50% XP",
  },
  'matematika': {
    desc: "30 ta algebra va geometriya masalalari, qora ruchkada doirachalarni xatosiz bo'yash testi.",
    questionsCount: 30,
    duration: 60,
    coins: 200,
    bonusXp: "+50% XP",
  },
  'biologiya': {
    desc: "Tibbiyot yo'nalishi abituriyentlari uchun 30 ta biologiya savoli va real zal shovqini muhiti.",
    questionsCount: 30,
    duration: 60,
    coins: 200,
    bonusXp: "+50% XP",
  },
  'ingliz-tili': {
    desc: "30 ta Reading, Lexis va Grammar testi, vaqt me'yori hamda BMB imtihon zali akustikasi.",
    questionsCount: 30,
    duration: 60,
    coins: 200,
    bonusXp: "+50% XP",
  },
  'rus-tili': {
    desc: "Rus tili va adabiyotidan 30 ta BMB formati testi, qat'iy nazorat va titul varaqasi.",
    questionsCount: 30,
    duration: 60,
    coins: 200,
    bonusXp: "+50% XP",
  },
};

export default function TestsPage() {
  const router = useRouter();
  const { t } = useTransliterate();
  const searchParams = useSearchParams();
  const urlSubject = searchParams.get('subject');

  const [startError, setStartError] = useState<{ message: string; testId?: number; scheduledAt?: string | null } | null>(null);
  const [starting, setStarting] = useState<number | null>(null);
  const [startingStress, setStartingStress] = useState<string | null>(null);
  const [stressModalOpen, setStressModalOpen] = useState(false);
  const [stressPreselectedTest, setStressPreselectedTest] = useState<{ id: number; title: string } | null>(null);

  const urlMode = searchParams.get('mode');
  const urlStress = searchParams.get('stress');
  const [heroMode, setHeroMode] = useState<'standard' | 'blitz' | 'stress'>(() => {
    if (urlMode === 'stress' || urlStress === '1' || urlStress === 'true') return 'stress';
    if (urlMode === 'blitz') return 'blitz';
    return 'standard';
  });

  useEffect(() => {
    if (urlMode === 'stress' || urlStress === '1' || urlStress === 'true') {
      setHeroMode('stress');
    } else if (urlMode === 'blitz') {
      setHeroMode('blitz');
    } else if (urlMode === 'standard') {
      setHeroMode('standard');
    }
  }, [urlMode, urlStress]);

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

  const displaySubjects = useMemo(() => {
    return (data?.subjects && data.subjects.length > 0)
      ? data.subjects
      : FALLBACK_SUBJECTS;
  }, [data?.subjects]);

  const handleModeChange = (mode: 'standard' | 'blitz' | 'stress') => {
    tgHaptic('select');
    soundFX.click();
    setHeroMode(mode);
    const p = new URLSearchParams(searchParams.toString());
    if (mode === 'standard') {
      p.delete('mode');
      p.delete('stress');
    } else {
      p.set('mode', mode);
      p.delete('stress');
    }
    const qStr = p.toString();
    router.replace(qStr ? `/tests?${qStr}` : '/tests', { scroll: false });
  };

  const handleStartStress = async (subjectSlug?: string, testId?: number) => {
    setStartingStress(subjectSlug || 'all');
    try {
      const payload: { test_id?: number; subject_slug?: string } = {};
      if (testId) {
        payload.test_id = testId;
      } else if (subjectSlug && subjectSlug !== 'all') {
        payload.subject_slug = subjectSlug;
      }

      const res = await apiFetch<{ attempt_id: number; mode?: string; is_stress_mode?: boolean }>(
        '/api/tests/start-stress/',
        {
          method: 'POST',
          body: JSON.stringify(payload),
        }
      );

      toast.success("Imtihon zali eshiklari ochildi! Omad!", { duration: 3000 });
      router.push(`/tests/${res.attempt_id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xatolik yuz berdi");
    } finally {
      setStartingStress(null);
    }
  };

  const handleStartBlitz = (subjectSlug?: string) => {
    tgHaptic('select');
    soundFX.click();
    if (subjectSlug && subjectSlug !== 'all') {
      router.push(`/onboarding?mode=blitz&subject=${encodeURIComponent(subjectSlug)}`);
    } else {
      router.push('/onboarding?mode=blitz');
    }
  };

  return (
    <>
      <AppShell />
      <main className="page-shell flex-1 space-y-5 sm:space-y-6 bg-background text-foreground p-3.5 sm:p-6 lg:p-8 pb-32 sm:pb-28 max-w-7xl mx-auto w-full">
        {/* ========================================================================= */}
        {/* IMTIHON REJIMLARI TAB SWITCHER (Standart | Blits | BMB Stress) */}
        {/* ========================================================================= */}
        <div className="space-y-3.5">
          {/* Segmented Mode Switcher (Fully responsive grid) */}
          <div className="w-full max-w-2xl grid grid-cols-4 p-1 rounded-2xl bg-muted/80 border border-border/80 shadow-xs gap-1">
            <button
              type="button"
              onClick={() => handleModeChange('standard')}
              className={cn(
                'flex items-center justify-center gap-1 sm:gap-2 py-2 px-1 sm:px-3 rounded-xl text-[12px] sm:text-xs md:text-sm font-bold transition-all duration-200 cursor-pointer select-none text-center',
                heroMode === 'standard'
                  ? 'bg-card text-foreground shadow-sm border border-border/60'
                  : 'text-muted-foreground hover:text-foreground hover:bg-card/40'
              )}
            >
              <GraduationCap className={cn('size-3.5 sm:size-4 shrink-0 transition-colors', heroMode === 'standard' ? 'text-primary' : 'text-muted-foreground')} />
              <span className="truncate">{t("Standart")}</span>
              <span className={cn(
                'hidden md:inline-flex px-1.5 py-0.5 rounded-full text-[12px] font-mono font-bold leading-none shrink-0',
                heroMode === 'standard' ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
              )}>
                Rasmiy
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleModeChange('blitz')}
              className={cn(
                'flex items-center justify-center gap-1 sm:gap-2 py-2 px-1 sm:px-3 rounded-xl text-[12px] sm:text-xs md:text-sm font-bold transition-all duration-200 cursor-pointer select-none text-center',
                heroMode === 'blitz'
                  ? 'bg-card text-foreground shadow-sm border border-border/60'
                  : 'text-muted-foreground hover:text-foreground hover:bg-card/40'
              )}
            >
              <Sparkles className={cn('size-3.5 sm:size-4 shrink-0 transition-colors', heroMode === 'blitz' ? 'text-blue-500' : 'text-muted-foreground')} />
              <span className="truncate">{t("7-Blits")}</span>
              <span className={cn(
                'hidden md:inline-flex px-1.5 py-0.5 rounded-full text-[12px] font-mono font-bold leading-none shrink-0',
                heroMode === 'blitz' ? 'bg-blue-500/15 text-blue-500' : 'bg-muted text-muted-foreground'
              )}>
                7 savol
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleModeChange('stress')}
              className={cn(
                'flex items-center justify-center gap-1 sm:gap-2 py-2 px-1 sm:px-3 rounded-xl text-[12px] sm:text-xs md:text-sm font-bold transition-all duration-200 cursor-pointer select-none text-center',
                heroMode === 'stress'
                  ? 'bg-card text-foreground shadow-sm border border-border/60'
                  : 'text-muted-foreground hover:text-foreground hover:bg-card/40'
              )}
            >
              <Flame className={cn('size-3.5 sm:size-4 shrink-0 transition-colors', heroMode === 'stress' ? 'text-rose-500' : 'text-muted-foreground')} />
              <span className="truncate">{t("Stress Zali")}</span>
              <span className={cn(
                'hidden md:inline-flex px-1.5 py-0.5 rounded-full text-[12px] font-mono font-bold leading-none shrink-0',
                heroMode === 'stress' ? 'bg-rose-500/15 text-rose-500' : 'bg-muted text-muted-foreground'
              )}>
                🔥 DTM
              </span>
            </button>

            {/* Fokus Sprint — 4-rejim (alohida sahifa). Mobil pastki menyuda endi Sinovlar ichida. */}
            <Link
              href="/sprint"
              className="flex items-center justify-center gap-1 sm:gap-2 py-2 px-1 sm:px-3 rounded-xl text-[12px] sm:text-xs md:text-sm font-bold transition-all duration-200 cursor-pointer select-none text-center text-muted-foreground hover:text-foreground hover:bg-card/40"
            >
              <Zap className="size-3.5 sm:size-4 shrink-0 text-amber-500" />
              <span className="truncate">{t("Sprint")}</span>
            </Link>
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
                  eyebrow={t("BBA & Milliy Sertifikat · Rasmiy Simulyator")}
                  eyebrowIcon={GraduationCap}
                  title={t("Test va Imtihonlar Markazi")}
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
                className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 p-4 sm:p-5.5 text-white shadow-lg"
              >
                <div className="pointer-events-none absolute -right-10 -bottom-10 size-40 bg-white/10 rounded-full blur-2xl" />
                <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1.5 max-w-xl">
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur-md px-3 py-0.5 text-xs font-bold text-white">
                      <Sparkles className="size-3.5 text-amber-300" /> Ilk Sinov · 3 Daqiqalik Dofamin Blits
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold">
                      Qaysi darajadasiz? 7 ta savolda B+ potensialini aniqlang!
                    </h3>
                    <p className="text-xs sm:text-sm text-blue-100 leading-relaxed">
                      45 ta savollik to&apos;liq testga kirishdan oldin 7 ta adaptiv savoldan o&apos;ting, kuchli va zaif mavzularingizni bepul aniqlang.
                    </p>
                  </div>
                  <Button asChild size="lg" className="rounded-xl bg-white text-blue-700 hover:bg-blue-50 font-bold shadow-md shrink-0 h-11 px-6 cursor-pointer">
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
                className="relative overflow-hidden rounded-2xl sm:rounded-2xl border-2 border-rose-500/40 bg-gradient-to-r from-rose-950/90 via-slate-900 to-amber-950/80 p-4 sm:p-6 shadow-xl text-white"
              >
                <div className="absolute top-0 right-0 -mr-12 -mt-12 size-60 rounded-full bg-rose-500/10 blur-3xl pointer-events-none" />
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
                  <div className="flex min-w-0 items-start gap-3 sm:gap-4">
                    <div className="flex size-11 sm:size-14 shrink-0 items-center justify-center rounded-2xl bg-rose-600/30 border border-rose-500/40 shadow-inner">
                      <Flame className="size-5 sm:size-7 text-rose-400 animate-pulse" />
                    </div>
                    <div className="min-w-0 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge className="bg-rose-600 text-white font-bold text-[12px] tracking-wider uppercase border-0 shrink-0">
                          🔥 EKSTREMAL
                        </Badge>
                        <Badge variant="outline" className="border-rose-400/40 bg-rose-400/10 text-rose-200 text-[12px] sm:text-[12px] font-bold shrink-0">
                          🎧 500 Kishi Zali
                        </Badge>
                        <Badge variant="outline" className="border-blue-400/40 bg-blue-400/10 text-blue-200 text-[12px] sm:text-[12px] font-bold shrink-0">
                          📝 Titul Varaqasi
                        </Badge>
                        <Badge variant="outline" className="border-amber-400/40 bg-amber-400/10 text-amber-200 text-[12px] sm:text-[12px] font-bold shrink-0">
                          ⚡ +50% XP
                        </Badge>
                      </div>
                      <h3 className="text-base sm:text-xl font-bold tracking-tight text-white leading-tight">
                        Real BMB Imtihon Zali (Stress Mode)
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                        Divanda choy ichib 80% olish boshqa, real DTM zalidagi shivir-shivir, parta g&apos;ichirlashi, nazoratchi ovozi va Titul varaqasida qo&apos;l qaltirashi boshqa! Imtihon kuni shokiga tushmaslik uchun hoziroq o&apos;zingizni sinang.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <Button
                      onClick={() => {
                        setStressPreselectedTest(null);
                        setStressModalOpen(true);
                      }}
                      size="lg"
                      className="w-full sm:w-auto rounded-full bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-lg shadow-rose-600/30 cursor-pointer h-11 px-6 text-xs sm:text-sm active:scale-95 transition-all flex items-center justify-center"
                    >
                      <Flame className="size-4 mr-2 animate-pulse" />
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
              <div className="relative overflow-hidden rounded-2xl bg-card border border-border p-5 sm:p-6 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex min-w-0 items-start sm:items-center gap-4">
                    <div className={cn("flex size-12 shrink-0 items-center justify-center rounded-lg text-white shadow-xs", theme.squircle)}>
                      <Flame className="size-6 fill-white" />
                    </div>
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] font-bold uppercase tracking-wider text-white", theme.squircle)}>
                          <span className="size-1.5 rounded-full bg-white animate-ping" />
                          Katta Mock Imtihon
                        </span>
                        <Badge variant="outline" className={cn("text-[12px] font-bold", theme.pill)}>
                          {data.pinned_mock.subject}
                        </Badge>
                        {data.pinned_mock.scheduled_at && (
                          <Badge variant="outline" className="font-mono text-[12px] gap-1 font-bold border-border bg-muted text-foreground">
                            <Clock className="size-3 text-primary" /> {formatScheduledTime(data.pinned_mock.scheduled_at)}
                          </Badge>
                        )}
                        <Badge variant="outline" className="border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[12px] gap-1">
                          <Users className="size-3" /> {data.pinned_mock.waiting_participants_count || 32}+ abituriyent
                        </Badge>
                      </div>
                      <h3 className="text-[17px] sm:text-[19px] font-bold tracking-tight text-foreground truncate">
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
                'relative overflow-hidden rounded-2xl border p-4 sm:p-5 transition-all',
                (startError?.scheduledAt || errorMessage.includes('boshlanmadi'))
                  ? 'border-amber-500/30 bg-amber-500/10 text-foreground'
                  : 'border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400'
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3.5">
                  <div
                    className={cn(
                      'flex size-10 shrink-0 items-center justify-center rounded-md text-white',
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
        {/* REJIMLAR BO'YICHA KATALOG (7-Savol Blits | BMB Stress | Standart) */}
        {/* ========================================================================= */}
        {heroMode === 'blitz' ? (
          /* 7-SAVOL BLITS REJIMI */
          <div className="space-y-6">
            {/* Yuqori Qoidalar va Sovrinlar Ko'rgazmasi */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-2xl border border-blue-500/25 bg-blue-500/10 space-y-1">
                <div className="flex items-center gap-1.5 text-blue-500 font-bold text-xs">
                  <Zap className="size-4" />
                  <span>7 Ta Savol</span>
                </div>
                <p className="text-[12px] text-muted-foreground leading-snug">
                  Oson, o&apos;rtacha va zaif nuqtani aniqlovchi adaptiv tizim.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl border border-amber-500/25 bg-amber-500/10 space-y-1">
                <div className="flex items-center gap-1.5 text-amber-500 font-bold text-xs">
                  <Sparkles className="size-4 text-amber-400" />
                  <span>Bepul diagnostika</span>
                </div>
                <p className="text-[12px] text-muted-foreground leading-snug">
                  Har bir to&apos;liq yakunlangan blits uchun kafolatlangan dofamin bonusi.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-500 font-bold text-xs">
                  <Clock className="size-4" />
                  <span>7 Daqiqa</span>
                </div>
                <p className="text-[12px] text-muted-foreground leading-snug">
                  Ortiqcha vaqt yo&apos;qotishsiz lahzalik bilim diagnostikasi.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl border border-purple-500/25 bg-purple-500/10 space-y-1">
                <div className="flex items-center gap-1.5 text-purple-500 font-bold text-xs">
                  <Trophy className="size-4" />
                  <span>B+ Potensial</span>
                </div>
                <p className="text-[12px] text-muted-foreground leading-snug">
                  Darhol Milliy Sertifikat prognozi va kuchli mavzular tahlili.
                </p>
              </div>
            </div>

            {/* Sarlavha */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
                  <Sparkles className="size-5 text-blue-500" />
                  <span>Fanlar bo&apos;yicha 7-Savol Blitslar</span>
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                  Qaysi fandan blits topshirmoqchisiz? Fanni tanlang va zaif mavzularingizni aniqlang.
                </p>
              </div>
              <Badge variant="outline" className="border-blue-500/30 bg-blue-500/10 text-blue-500 font-mono text-xs font-bold">
                {displaySubjects.length} ta fan faol
              </Badge>
            </div>

            {/* FANLAR BLITS GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {displaySubjects.map((s) => {
                const visual = getSubjectVisual(s.slug, s.name);
                const IconComponent = visual.icon;
                const details = BLITZ_SUBJECT_DETAILS[s.slug] || {
                  desc: `${s.name} fanidan 7 ta saralangan ekspress savol va qopqonlar.`,
                  focus: "Tezkor Sinov & Natija",
                  questionsCount: 7,
                  duration: 7,
                  coins: 100,
                  xp: 50,
                };

                return (
                  <motion.div
                    key={s.slug}
                    whileHover={{ y: -3 }}
                    className="group relative rounded-2xl p-5 border border-border bg-card hover:border-blue-500/40 transition-all flex flex-col justify-between overflow-hidden shadow-xs"
                  >
                    <div className={cn('pointer-events-none absolute inset-0 bg-gradient-to-br opacity-40 group-hover:opacity-80 transition-opacity', visual.gradient)} />

                    <div className="relative space-y-3.5">
                      {/* Header Badges */}
                      <div className="flex items-center justify-between gap-2">
                        <div className={cn('size-11 rounded-2xl flex items-center justify-center border shadow-xs', visual.iconBg)}>
                          <IconComponent className={cn('size-5', visual.iconColor)} />
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                          <Badge variant="outline" className="border-blue-500/30 bg-blue-500/10 text-blue-500 text-[12px] font-bold">
                            ⚡ 7 savol
                          </Badge>
                          <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-500 text-[12px] font-bold">
                            7 savol · bepul
                          </Badge>
                        </div>
                      </div>

                      {/* Title & Desc */}
                      <div>
                        <h3 className="text-base sm:text-lg font-bold text-foreground tracking-tight group-hover:text-blue-500 transition-colors">
                          {s.name} · 7-Savol Blits
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                          {details.desc}
                        </p>
                      </div>

                      {/* Sovrin & Format Box */}
                      <div className="p-2.5 rounded-xl bg-muted/60 border border-border/80 space-y-1">
                        <div className="flex items-center justify-between text-[12px] font-bold">
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Clock className="size-3 text-primary" /> Vaqt:
                          </span>
                          <span className="font-mono text-foreground">7 daqiqa</span>
                        </div>
                        <div className="flex items-center justify-between text-[12px] font-bold">
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Trophy className="size-3 text-amber-500" /> Sovrin:
                          </span>
                          <span className="text-amber-500 font-mono font-bold">Diagnostika (mukofotsiz)</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="relative mt-4 pt-3 border-t border-border/60">
                      <Button
                        onClick={() => handleStartBlitz(s.slug)}
                        className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-10 shadow-md shadow-blue-600/20 active:scale-98 transition-all cursor-pointer"
                      >
                        <span>Blitsni Boshlash</span>
                        <ArrowRight className="size-3.5 ml-1.5" />
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Aralash Fanlar Super Blits Card */}
            <div className="relative overflow-hidden rounded-2xl border border-blue-500/30 bg-gradient-to-r from-blue-950/80 via-slate-900 to-indigo-950/80 p-5 sm:p-6 text-white shadow-lg">
              <div className="pointer-events-none absolute -right-10 -bottom-10 size-40 bg-blue-500/10 rounded-full blur-2xl" />
              <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1.5 max-w-xl">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/20 px-3 py-0.5 text-xs font-bold text-blue-300 border border-blue-500/30">
                    <Sparkles className="size-3.5 text-amber-300" /> Super Challenge · Barcha Fanlar
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold">
                    Aralash Fanlar 7-Savol Super Blitsi
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    Tarix, Ona tili, Matematika, Biologiya, Ingliz va Rus tilidan saralangan 7 ta eng muhim savol. Haqiqiy umumiy savodxonlik sinovi!
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold text-xs">
                      Bepul diagnostika
                    </Badge>
                  </div>
                </div>

                <Button
                  onClick={() => handleStartBlitz()}
                  size="lg"
                  className="rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold shadow-lg shadow-blue-500/30 shrink-0 h-11 px-6 cursor-pointer"
                >
                  Super Blitsni Boshlash <ArrowRight className="size-4 ml-1.5" />
                </Button>
              </div>
            </div>
          </div>
        ) : heroMode === 'stress' ? (
          /* BMB STRESS ZALI REJIMI */
          <div className="space-y-6">
            {/* Yuqori Stress Xususiyatlari & Sovrinlar Paneli */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
              <div className="p-3 sm:p-3.5 rounded-2xl border border-rose-500/25 bg-rose-500/10 space-y-1">
                <div className="flex items-center gap-1.5 text-rose-500 font-bold text-xs">
                  <Headphones className="size-4 shrink-0" />
                  <span className="truncate">500 Kishi Akustikasi</span>
                </div>
                <p className="text-[12px] sm:text-[12px] text-muted-foreground leading-snug line-clamp-2 sm:line-clamp-none">
                  Haqiqiy DTM zalidagi shivir-shivir va parta tovushlari.
                </p>
              </div>

              <div className="p-3 sm:p-3.5 rounded-2xl border border-blue-500/25 bg-blue-500/10 space-y-1">
                <div className="flex items-center gap-1.5 text-blue-500 font-bold text-xs">
                  <FileCheck2 className="size-4 shrink-0" />
                  <span className="truncate">Titul Varaqasi</span>
                </div>
                <p className="text-[12px] sm:text-[12px] text-muted-foreground leading-snug line-clamp-2 sm:line-clamp-none">
                  Qora ruchkada doirachalarni bo&apos;yash (Bubble Sheet) mashqi.
                </p>
              </div>

              <div className="p-3 sm:p-3.5 rounded-2xl border border-amber-500/25 bg-amber-500/10 space-y-1">
                <div className="flex items-center gap-1.5 text-amber-500 font-bold text-xs">
                  <Flame className="size-4 shrink-0" />
                  <span className="truncate">+50% Bonus XP</span>
                </div>
                <p className="text-[12px] sm:text-[12px] text-muted-foreground leading-snug line-clamp-2 sm:line-clamp-none">
                  Har bir to&apos;g&apos;ri javob uchun 1.5 baravar ko&apos;p tajriba bali.
                </p>
              </div>

              <div className="p-3 sm:p-3.5 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-500 font-bold text-xs">
                  <Shield className="size-4 shrink-0" />
                  <span className="truncate">Temir Asab</span>
                </div>
                <p className="text-[12px] sm:text-[12px] text-muted-foreground leading-snug line-clamp-2 sm:line-clamp-none">
                  Stress zalini yenggan abituriyentlarga profil maxsus nishoni.
                </p>
              </div>
            </div>

            {/* Sarlavha */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
                  <Flame className="size-5 text-rose-500" />
                  <span>Fanlar bo&apos;yicha BMB Stress Zallari</span>
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                  Qaysi fanning imtihon zaliga kirasiz? DTM zalidagi shok va bosimga oldindan tayyorlaning.
                </p>
              </div>
              <Badge variant="outline" className="border-rose-500/30 bg-rose-500/10 text-rose-500 font-mono text-xs font-bold">
                {displaySubjects.length} ta zal tayyor
              </Badge>
            </div>

            {/* FANLAR STRESS GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {displaySubjects.map((s) => {
                const visual = getSubjectVisual(s.slug, s.name);
                const IconComponent = visual.icon;
                const details = STRESS_SUBJECT_DETAILS[s.slug] || {
                  desc: `${s.name} fanidan 30 ta BMB standarti testi va haqiqiy imtihon zali shovqini.`,
                  questionsCount: 30,
                  duration: 60,
                  coins: 200,
                  bonusXp: "+50% XP",
                };
                const isLaunching = startingStress === s.slug;

                return (
                  <motion.div
                    key={s.slug}
                    whileHover={{ y: -3 }}
                    className="group relative rounded-2xl p-5 border border-rose-500/30 bg-card hover:border-rose-500/60 transition-all flex flex-col justify-between overflow-hidden shadow-xs"
                  >
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-rose-500/10 via-amber-500/5 to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />

                    <div className="relative space-y-3.5">
                      {/* Header Badges */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="size-11 rounded-2xl flex items-center justify-center border border-rose-500/30 bg-rose-500/15 text-rose-500 shadow-xs">
                          <IconComponent className="size-5" />
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                          <Badge className="bg-rose-600 text-white text-[12px] font-bold border-0">
                            🔥 STRESS
                          </Badge>
                          <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-500 text-[12px] font-bold">
                            +50% XP
                          </Badge>
                        </div>
                      </div>

                      {/* Title & Desc */}
                      <div>
                        <h3 className="text-base sm:text-lg font-bold text-foreground tracking-tight group-hover:text-rose-500 transition-colors">
                          {s.name} — BMB Stress Zali
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                          {details.desc}
                        </p>
                      </div>

                      {/* Sovrin & Format Box */}
                      <div className="p-2.5 rounded-xl bg-rose-500/5 border border-rose-500/20 space-y-1">
                        <div className="flex items-center justify-between text-[12px] font-bold">
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Clock className="size-3 text-rose-500" /> Format:
                          </span>
                          <span className="font-mono text-foreground">{details.questionsCount} ta savol · {details.duration} daqiqa</span>
                        </div>
                        <div className="flex items-center justify-between text-[12px] font-bold">
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Trophy className="size-3 text-amber-500" /> Sovrin:
                          </span>
                          <span className="text-amber-500 font-mono font-bold">+50% XP · +{details.coins} 🪙 · &quot;Temir Asab&quot;</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="relative mt-4 pt-3 border-t border-border/60">
                      <Button
                        disabled={startingStress !== null}
                        onClick={() => handleStartStress(s.slug)}
                        className="w-full rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs h-10 shadow-md shadow-rose-600/25 active:scale-98 transition-all cursor-pointer"
                      >
                        {isLaunching ? (
                          <>
                            <Loader2 className="size-3.5 animate-spin mr-1.5" />
                            <span>Zalga kirilmoqda...</span>
                          </>
                        ) : (
                          <>
                            <Flame className="size-3.5 mr-1.5 animate-pulse" />
                            <span>Imtihon Zaliga Kirish</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Katta Blok Imtihon Modal Launcher Card */}
            <div className="relative overflow-hidden rounded-2xl border border-rose-500/40 bg-gradient-to-r from-rose-950 via-slate-900 to-amber-950 p-5 sm:p-6 text-white shadow-xl">
              <div className="pointer-events-none absolute -right-10 -bottom-10 size-40 bg-rose-500/15 rounded-full blur-2xl" />
              <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1.5 max-w-xl">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/20 px-3 py-0.5 text-xs font-bold text-rose-300 border border-rose-500/30">
                    <Flame className="size-3.5 text-rose-400" /> Barcha Fanlar · Katta Zal Simulyatori
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold">
                    DTM To&apos;liq Blok Imtihoni (Hardcore Ekstremal)
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    Majburiy fanlar va asosiy mutaxassislik bloklari. 500 kishilik zal akustikasi, qat&apos;iy vaqt me&apos;yori va to&apos;liq Titul varaqasi!
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold text-xs">
                      Sovrin: +100% Super Bonus XP
                    </Badge>
                    <Badge className="bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold text-xs">
                      +500 🪙 Tanga · &quot;Oltin Nomzod&quot;
                    </Badge>
                  </div>
                </div>

                <Button
                  onClick={() => {
                    setStressPreselectedTest(null);
                    setStressModalOpen(true);
                  }}
                  size="lg"
                  className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-lg shadow-rose-600/30 shrink-0 h-11 px-6 cursor-pointer"
                >
                  <Flame className="size-4 mr-1.5 animate-pulse" />
                  Blok Zaliga Kirish
                </Button>
              </div>
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* STANDART REJIM (FANLAR SETKASI YOKI TANLANGAN FAN TESTLARI)                */
          /* ========================================================================= */
          subject === null ? (
          <div className="space-y-5">
            {/* Bo'lim Sarlavhasi */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
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
                      'group relative rounded-2xl p-4 sm:p-5 border border-border bg-card hover:bg-card/90 transition-all cursor-pointer flex flex-col justify-between overflow-hidden shadow-xs select-none',
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
                          'text-[12px] sm:text-[12px] font-bold px-2.5 py-0.5 rounded-full border',
                          testsCount > 0
                            ? 'border-primary/25 bg-primary/10 text-primary'
                            : 'border-border bg-muted text-muted-foreground'
                        )}>
                          {testsCount > 0 ? `${testsCount} ta test` : 'Tez kunda'}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-base sm:text-lg font-bold text-foreground group-hover:text-primary transition-colors tracking-tight">
                          {s.name}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                          {visual.subtitle}
                        </p>
                      </div>
                    </div>

                    <div className="relative mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs font-bold text-primary">
                      <span className="text-[12px] text-muted-foreground font-semibold truncate max-w-[100px]">{visual.tag}</span>
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
              className="group cursor-pointer rounded-2xl bg-card border border-border hover:border-emerald-500/50 p-5 sm:p-6 shadow-xs transition-all active:scale-[0.99] mt-2"
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
                  <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-xs">
                    <div className={cn('pointer-events-none absolute inset-0 bg-gradient-to-r opacity-60', visual.gradient)} />
                    <div className="relative flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-4">
                        <div className={cn('size-12 sm:size-14 rounded-2xl flex items-center justify-center border shadow-xs', visual.iconBg)}>
                          <IconComponent className={cn('size-6 sm:size-7', visual.iconColor)} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
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
                        <p className="text-lg sm:text-2xl font-bold font-mono text-primary">
                          {data?.tests?.length || 0} ta
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* ICHMA-ICH SUBKATEGORIYALAR (Nested Subcategories & Filters) */}
            <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-4 shadow-xs">
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
                          {t(m.label)}
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
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-56 w-full rounded-2xl" />)}
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
                        "group relative flex h-full flex-col justify-between rounded-2xl p-5 sm:p-6 transition-all duration-300 shadow-xs hover:shadow-xl border overflow-hidden",
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
                              <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-2.5 py-0.5 text-[12px] font-bold uppercase tracking-wider text-white shadow-xs">
                                <Sparkles className="size-2.5 fill-white" /> Yangi
                              </span>
                            )}
                            {isLiveMock ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-2.5 py-0.5 text-[12px] font-bold uppercase tracking-wider text-white shadow-xs">
                                <span className="size-1.5 rounded-full bg-white animate-ping" />
                                Jonli Mock
                              </span>
                            ) : (
                              <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[12px] font-bold text-primary">
                                {CATEGORY_BADGE[t.category] || t.category}
                              </span>
                            )}
                            {t.answer_mode && ANSWER_MODE_BADGE[t.answer_mode] && (
                              <Badge variant="outline" className={cn("text-[12px] font-bold rounded-full", ANSWER_MODE_BADGE[t.answer_mode].className)}>
                                {ANSWER_MODE_BADGE[t.answer_mode].label}
                              </Badge>
                            )}
                          </div>

                          {isLiveMock && t.scheduled_at ? (
                            <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-mono text-[12px] font-bold", cTheme.pill)}>
                              <Clock className="size-3 text-primary" /> {formatScheduledTime(t.scheduled_at)}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 font-mono text-[12px] font-bold text-muted-foreground bg-muted/60 px-2.5 py-0.5 rounded-full border border-border/70">
                              <Clock className="size-3 text-primary" /> {t.duration_minutes} daq
                            </span>
                          )}
                        </div>

                        {/* 2. Title & Description */}
                        <h3 className="text-[17px] sm:text-[18px] font-bold leading-snug tracking-tight text-foreground group-hover:text-primary transition-colors">
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
                                <div className="flex size-5 items-center justify-center rounded-full bg-primary/15 text-[12px] font-bold text-primary">
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
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-primary/10 text-[12px] font-bold text-primary border border-primary/20">
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
              <div className="rounded-2xl bg-card border border-border py-14 px-4 text-center space-y-3">
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
        ))}
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
