'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { soundFX } from '@/lib/soundFX';
import { tgHaptic } from '@/lib/telegram';
import {
  Shuffle, Search, Clock, Lock, ArrowRight, Loader2,
  FileCheck2, GraduationCap, Users, Flame, AlertCircle, X, Sparkles, Bell, CheckCircle2,
  ArrowLeft, ArrowUpRight, BookOpen, Landmark, Calculator, Dna, Languages, Globe, ChevronRight, Layers,
  Headphones, Zap, Trophy, Shield, Target, Gauge, Brain, History,
} from 'lucide-react';
import { apiFetch, ApiError } from '@/lib/api-client';
import { useApiQuery } from '@/lib/api-cache';
import { toast } from 'sonner';
import AppShell from '@/components/AppShell';
import { cn } from '@/lib/utils';
import Reveal from '@/components/motion/Reveal';
import { TestsHero, ModeBento, CatalogTitle, type PastelMode } from '@/components/tests/TestsPastelHero';
import { FeatureStrip, SectionHead, CountChip, SubjectCard, PromoBand, InViewItem, TONE, TONE_CYCLE } from '@/components/tests/PastelCatalog';
import { Panel, PanelLabel, PanelLink, Pill } from '@/components/design/kit';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import VerifiedBadge from '@/components/ui/verified-badge';
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

/** Stress bonusi — serverdagi StressExamConfig'dan (admin o'zgartirishi mumkin). XP bonus
 *  `bonus_xp_multiplier`, tanga — finish_api'dagi qat'iy 1.5x. Ilgari bu yerda "Temir Asab"
 *  nishoni, "+200 tanga", "+100% Super Bonus XP", "+500 tanga · Oltin Nomzod" kabi hech
 *  qachon berilmaydigan sovrinlar yozilgan edi. */
function useStressBonusLabel(): string {
  const [label, setLabel] = useState('XP bonusi');
  useEffect(() => {
    apiFetch<{ bonus_xp_multiplier?: number }>('/api/tests/stress-config/')
      .then((cfg) => {
        const m = Number(cfg?.bonus_xp_multiplier);
        setLabel(m > 1 ? `+${Math.round((m - 1) * 100)}% XP` : 'XP bonusi yo\'q');
      })
      .catch(() => {});
  }, []);
  return label;
}

type ModeCard = {
  key: 'standard' | 'blitz' | 'stress' | 'sprint';
  icon: typeof Target;
  tone: 'brand' | 'gold' | 'danger' | 'dark';
  title: string;
  subtitle: string;
  accent: string;
  description: string;
  stats: { value: string | number; label: string }[];
  chips: string[];
  cta: string;
};

const MODE_CARDS: ModeCard[] = [
  {
    key: 'standard',
    icon: Target,
    tone: 'brand',
    title: 'Standart test',
    subtitle: "To'liq baholash",
    accent: 'text-[var(--brand-text)]',
    description: "Rasmiy formatdagi to'liq imtihon: DTM va Milliy sertifikat vaqt me'yori, batafsil tahlil va xatolar ustida ishlash.",
    stats: [],
    chips: ['Rasmiy format', "Yakunda ko'rib chiqish", 'Batafsil tahlil', 'Xatolar ustida ishlash'],
    cta: 'Standart testni boshlash',
  },
  {
    key: 'blitz',
    icon: Zap,
    tone: 'gold',
    title: 'Blits',
    subtitle: 'Tezkor sinov',
    accent: 'text-[var(--reward-text)]',
    description: '7 ta adaptiv savol orqali bir necha daqiqada darajangiz va zaif mavzularingizni aniqlang.',
    stats: [
      { value: 7, label: 'Savol' },
      { value: '~3 daq', label: 'Davomiyligi' },
      { value: 'Bepul', label: 'Narxi' },
    ],
    chips: ['Adaptiv savollar', 'Darhol natija', 'Daraja bahosi', 'Zaif mavzular'],
    cta: 'Blitsni boshlash',
  },
  {
    key: 'stress',
    icon: Gauge,
    tone: 'danger',
    title: 'Stress zali',
    subtitle: 'Real imtihon bosimi',
    accent: 'text-[var(--danger-text)]',
    description: "Real BMB zali muhiti: umumiy taymer, titul varaqasi va zal shovqini. Imtihon kunidagi hayajonga oldindan tayyorlaning.",
    stats: [],
    chips: ['Umumiy taymer', 'Titul varaqasi', 'Zal ovozlari', 'Imtihon simulyatsiyasi'],
    cta: 'Stress zaliga kirish',
  },
  {
    key: 'sprint',
    icon: Brain,
    tone: 'dark',
    title: 'Fokus sprint',
    subtitle: 'Kundalik musobaqa',
    accent: 'text-[var(--brand-text)]',
    description: "Ketma-ket savollar bilan tezlik va aniqlikni oshiring. Har kuni 20:30 da respublika sprinti jonli o'tadi.",
    stats: [
      { value: 20, label: 'Savol' },
      { value: '20:30', label: 'Jonli sprint' },
      { value: 'Live', label: 'Reyting' },
    ],
    chips: ['Tezlik', 'Jonli reyting', 'Har kuni', 'Barcha fanlar'],
    cta: 'Sprintni boshlash',
  },
];

type RecentRow = { id: number; test__title: string | null; score: number | null; completed_at: string };

function RecentTestHistory() {
  const { data } = useApiQuery<{ recent: RecentRow[] }>('/api/analytics/');
  const rows = (data?.recent || []).slice(0, 4);
  if (!data || rows.length === 0) return null;
  return (
    <Panel>
      <PanelLabel icon={History} right={<PanelLink href="/tests/history">Hammasi</PanelLink>}>
        So&apos;nggi testlar tarixi
      </PanelLabel>
      <div className="space-y-2">
        {rows.map((r) => {
          const score = Math.round(r.score ?? 0);
          const passed = score >= 60;
          return (
            <Link key={r.id} href={`/tests/${r.id}/feedback`} className="ds-row">
              <span
                className={cn(
                  'flex h-8 w-11 shrink-0 items-center justify-center rounded-md text-xs font-bold tabular-nums',
                  passed ? 'bg-[var(--brand-soft)] text-[var(--brand-text)]' : 'bg-[var(--danger-soft)] text-[var(--danger-text)]'
                )}
              >
                {score}%
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-foreground truncate">{r.test__title || 'Tasodifiy test'}</p>
                <p className="text-[11px] text-muted-foreground">
                  {new Date(r.completed_at).toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short' })}
                </p>
              </div>
              <Pill tone={passed ? 'brand' : 'danger'} dot>
                {passed ? "O'tdi" : 'Qayta urinish'}
              </Pill>
            </Link>
          );
        })}
      </div>
    </Panel>
  );
}

export default function TestsPage() {
  const stressXpLabel = useStressBonusLabel();
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
  // /tests — faqat rejimlar sahifasi. Rejim tanlansa (?mode=...) yoki fan ochilsa (?subject=...)
  // alohida katalog sahifasi ko'rinadi: shu turdagi testlar ro'yxati.
  const isCatalog =
    urlMode === 'standard' || urlMode === 'blitz' || urlMode === 'stress' ||
    urlStress === '1' || urlStress === 'true' ||
    Boolean(urlSubject && urlSubject !== 'all');
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
    } else {
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
    router.replace('/tests?mode=standard', { scroll: false });
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
    <div className="theme-pastel min-h-screen w-full">
      <AppShell />
      <main className="page-shell flex-1 space-y-6 sm:space-y-8 text-foreground p-3.5 sm:p-6 lg:p-8 pb-32 sm:pb-28 max-w-7xl mx-auto w-full overflow-x-clip">
        {!isCatalog && (
          <>
        <TestsHero
          eyebrow={t("Imtihon portali")}
          testsCount={data ? (data.subjects || []).reduce((n, s) => n + (s.tests_count || 0), 0) : undefined}
          attempts={data?.total_attempts}
          avgScore={data ? data.avg_score || 0 : undefined}
        />

        <ModeBento
          t={t}
          activeKey=""
          busyKey={startingStress !== null ? 'stress' : null}
          modes={MODE_CARDS.map((m) => ({
            key: m.key as PastelMode['key'],
            icon: m.icon,
            title: m.title,
            subtitle: m.subtitle,
            description: m.description,
            chips: m.chips,
            cta: m.cta,
            stats:
              m.key === 'standard'
                ? [
                    { value: (data?.subjects || []).reduce((n, s) => n + (s.tests_count || 0), 0) || '—', label: 'Testlar' },
                    { value: data ? data.total_attempts : '—', label: 'Urinishlaringiz' },
                    { value: data ? `${Math.round(data.avg_score || 0)}%` : '—', label: "O'rtacha ball" },
                  ]
                : m.key === 'stress'
                  ? [
                      { value: 'BMB', label: 'Format' },
                      { value: 'Titul', label: 'Javob varaqasi' },
                      { value: stressXpLabel, label: 'Mukofot' },
                    ]
                  : m.stats,
          }))}
          onAction={(key) => {
            // Har bir rejim — alohida sahifa: shu turdagi testlar katalogi.
            tgHaptic('select');
            soundFX.click();
            router.push(key === 'sprint' ? '/sprint' : `/tests?mode=${key}`);
          }}
        />

        <RecentTestHistory />
          </>
        )}

        {isCatalog && (
          <div id="test-catalog" className="space-y-4 pt-2">
            <Link href="/tests" className="ps-chip w-fit transition-transform hover:-translate-x-0.5">
              <ArrowLeft className="size-4" /> Barcha rejimlar
            </Link>
            <CatalogTitle>
              {heroMode === 'blitz' ? 'Blits testlari' : heroMode === 'stress' ? 'Stress zallari' : 'Standart testlar'}
            </CatalogTitle>
          </div>
        )}

        {/* LIVE ACTIVITY PINNED MOCK IMTIHON BANNER */}
        {!isCatalog && data?.pinned_mock && (() => {
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
                          <Users className="size-3" /> {data.pinned_mock.waiting_participants_count ?? 0} abituriyent
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
        {isCatalog && (heroMode === 'blitz' ? (
          /* ── 7-SAVOL BLITS KATALOGI ─────────────────────────────────── */
          <div className="space-y-8">
            <FeatureStrip
              items={[
                { icon: Zap, title: '7 ta savol', tone: 'purple', text: "Oson, o'rtacha va zaif nuqtani aniqlovchi adaptiv tizim." },
                { icon: Sparkles, title: 'Bepul diagnostika', tone: 'orange', text: "Har bir to'liq yakunlangan blits uchun kafolatlangan bonus." },
                { icon: Clock, title: '7 daqiqa', tone: 'green', text: "Ortiqcha vaqt yo'qotishsiz lahzalik bilim diagnostikasi." },
                { icon: Trophy, title: 'B+ potensial', tone: 'ink', text: 'Darhol Milliy Sertifikat prognozi va kuchli mavzular tahlili.' },
              ]}
            />

            <SectionHead
              eyebrow="Fanni tanlang"
              title={<>Fanlar bo&apos;yicha <span className="text-[var(--ps-purple)]">blitslar</span></>}
              right={<CountChip>{displaySubjects.length} ta fan faol</CountChip>}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
              {displaySubjects.map((s, i) => {
                const visual = getSubjectVisual(s.slug, s.name);
                const details = BLITZ_SUBJECT_DETAILS[s.slug] || {
                  desc: `${s.name} fanidan 7 ta saralangan ekspress savol va qopqonlar.`,
                  focus: 'Tezkor Sinov & Natija',
                  questionsCount: 7,
                  duration: 7,
                  coins: 100,
                  xp: 50,
                };
                return (
                  <SubjectCard
                    key={s.slug}
                    index={i}
                    tone={TONE_CYCLE[i % TONE_CYCLE.length]}
                    icon={visual.icon}
                    title={s.name}
                    subtitle="7-savol blits"
                    desc={details.desc}
                    badges={['⚡ 7 savol', 'Bepul']}
                    meta={[
                      { label: 'Vaqt', value: '7 daqiqa' },
                      { label: 'Natija', value: 'Diagnostika' },
                    ]}
                    cta="Blitsni boshlash"
                    onClick={() => handleStartBlitz(s.slug)}
                  />
                );
              })}
            </div>

            <PromoBand
              tone="purple"
              icon={Sparkles}
              eyebrow="Super challenge · Barcha fanlar"
              badge="Bepul diagnostika"
              title="Aralash fanlar super blitsi"
              text="Tarix, Ona tili, Matematika, Biologiya, Ingliz va Rus tilidan saralangan 7 ta eng muhim savol. Haqiqiy umumiy savodxonlik sinovi!"
              cta="Super blitsni boshlash"
              onClick={() => handleStartBlitz()}
            />
          </div>
        ) : heroMode === 'stress' ? (
          /* ── BMB STRESS ZALI KATALOGI ───────────────────────────────── */
          <div className="space-y-8">
            <FeatureStrip
              items={[
                { icon: Headphones, title: '500 kishi akustikasi', tone: 'coral', text: 'Haqiqiy DTM zalidagi shivir-shivir va parta tovushlari.' },
                { icon: FileCheck2, title: 'Titul varaqasi', tone: 'blue', text: "Qora ruchkada doirachalarni bo'yash (Bubble Sheet) mashqi." },
                { icon: Flame, title: `${stressXpLabel} bonus`, tone: 'orange', text: <>To&apos;g&apos;ri javoblar uchun {stressXpLabel} va 1.5 baravar tanga (birinchi urinishda).</> },
                { icon: Shield, title: 'Real bosim', tone: 'ink', text: "Javoblarni vaqt ichida titulga ko'chirish — xuddi haqiqiy imtihondagidek." },
              ]}
            />

            <SectionHead
              eyebrow="Zalni tanlang"
              title={<>Fanlar bo&apos;yicha <span className="text-[var(--ps-coral)]">stress zallari</span></>}
              right={<CountChip>{displaySubjects.length} ta zal tayyor</CountChip>}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
              {displaySubjects.map((s, i) => {
                const visual = getSubjectVisual(s.slug, s.name);
                const details = STRESS_SUBJECT_DETAILS[s.slug] || {
                  desc: `${s.name} fanidan 30 ta BMB standarti testi va haqiqiy imtihon zali shovqini.`,
                  questionsCount: 30,
                  duration: 60,
                  coins: 200,
                  bonusXp: '+50% XP',
                };
                return (
                  <SubjectCard
                    key={s.slug}
                    index={i}
                    tone={TONE_CYCLE[(i + 3) % TONE_CYCLE.length]}
                    icon={visual.icon}
                    title={s.name}
                    subtitle="BMB stress zali"
                    desc={details.desc}
                    badges={['🔥 Stress', stressXpLabel]}
                    meta={[
                      { label: 'Format', value: `${details.questionsCount} savol · ${details.duration} daq` },
                      { label: 'Sovrin', value: `${stressXpLabel} · ×1.5` },
                    ]}
                    cta={startingStress === s.slug ? 'Zalga kirilmoqda…' : 'Imtihon zaliga kirish'}
                    busy={startingStress === s.slug}
                    disabled={startingStress !== null}
                    onClick={() => handleStartStress(s.slug)}
                  />
                );
              })}
            </div>

            <PromoBand
              tone="coral"
              icon={Flame}
              eyebrow="Barcha fanlar · Katta zal simulyatori"
              badge={`${stressXpLabel} · tanga ×1.5`}
              title="DTM to'liq blok imtihoni"
              text="Majburiy fanlar va asosiy mutaxassislik bloklari. 500 kishilik zal akustikasi, qat'iy vaqt me'yori va to'liq titul varaqasi!"
              cta="Blok zaliga kirish"
              onClick={() => {
                setStressPreselectedTest(null);
                setStressModalOpen(true);
              }}
            />
          </div>
        ) : (
          /* ── STANDART KATALOG ───────────────────────────────────────── */
          subject === null ? (
          <div className="space-y-8">
            <SectionHead
              eyebrow="Fanni tanlang"
              title={<>Fanlar <span className="text-[var(--ps-purple)]">to&apos;plami</span></>}
              right={<CountChip>{data?.subjects?.length || 0} ta yo&apos;nalish faol</CountChip>}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
              {(data?.subjects || []).map((s, i) => {
                const visual = getSubjectVisual(s.slug, s.name);
                const testsCount = s.tests_count ?? 0;
                return (
                  <SubjectCard
                    key={s.slug}
                    index={i}
                    tone={TONE_CYCLE[i % TONE_CYCLE.length]}
                    icon={visual.icon}
                    title={s.name}
                    subtitle={visual.subtitle}
                    badges={[testsCount > 0 ? `${testsCount} ta test` : 'Tez kunda', visual.tag]}
                    cta="Testlarni ko'rish"
                    wholeCardClick
                    onClick={() => handleSelectSubject(s.slug)}
                  />
                );
              })}
              {!data &&
                Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-60 w-full rounded-[28px] bg-white/40" />)}
            </div>

            <PromoBand
              tone="green"
              icon={Shuffle}
              eyebrow="Barcha fanlardan aralash"
              badge="Bepul"
              title="Tezkor blits test"
              text="10 ta savol · 10 daqiqa — barcha fanlardan aralash test yechib, umumiy darajangizni tekshiring."
              cta={starting === -1 ? 'Boshlanmoqda…' : 'Boshlash'}
              busy={starting === -1}
              disabled={starting !== null}
              onClick={() => startRandom()}
            />
          </div>
        ) : (
          /* ── TANLANGAN FAN: TESTLAR RO'YXATI ────────────────────────── */
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleBackToAllSubjects}
                className="ps-chip cursor-pointer transition-transform hover:-translate-x-0.5"
              >
                <ArrowLeft className="size-4" /> Barcha fanlar
              </button>
              <div className="no-scrollbar flex max-w-full items-center gap-1.5 overflow-x-auto py-1">
                {data?.subjects.map((s) => {
                  const active = subject === s.slug;
                  return (
                    <button
                      key={s.slug}
                      type="button"
                      onClick={() => handleSelectSubject(s.slug)}
                      className={cn(
                        'shrink-0 cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-bold transition-all active:scale-95',
                        active
                          ? 'bg-[#080808] text-[#FFFCF7] dark:bg-[#FFFCF7] dark:text-[#080808]'
                          : 'bg-[var(--ps-paper)] text-[var(--text-muted)] hover:text-[var(--text-primary)]',
                      )}
                    >
                      {s.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Fan banneri */}
            {currentSubjectObj && (() => {
              const visual = getSubjectVisual(currentSubjectObj.slug, currentSubjectObj.name);
              const IconComponent = visual.icon;
              const idx = Math.max(0, (data?.subjects || []).findIndex((x) => x.slug === currentSubjectObj.slug));
              const tone = TONE[TONE_CYCLE[idx % TONE_CYCLE.length]];
              return (
                <InViewItem>
                  <section className="ps-card ps-ink relative overflow-hidden !border-0 !rounded-[32px] p-6 sm:p-8">
                    <div aria-hidden className={cn('absolute -right-16 -top-16 size-64 rounded-full opacity-90', tone.bg)} />
                    <div aria-hidden className="ps-stripes absolute -bottom-10 right-1/3 size-32 rounded-full text-white/15" />
                    <div className="relative flex flex-wrap items-end justify-between gap-6">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={cn('inline-flex size-12 items-center justify-center rounded-2xl', tone.bg)}>
                            <IconComponent className="size-6" />
                          </span>
                          <span className="rounded-full bg-white/12 px-3 py-1 text-[11px] font-bold">{visual.tag}</span>
                        </div>
                        <h1 className="ps-display mt-4 text-[36px] sm:text-[52px]">
                          {currentSubjectObj.name} <span className="text-[var(--ps-orange)]">testlari</span>
                        </h1>
                        <p className="mt-2 max-w-xl text-sm text-white/65">
                          {visual.subtitle} · Rasmiy DTM me&apos;yori va Rasch modeli baholash standarti
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="ps-num text-[56px] sm:text-[72px]">{data?.tests?.length || 0}</p>
                        <p className="text-xs font-semibold text-white/60">ta test mavjud</p>
                      </div>
                    </div>
                  </section>
                </InViewItem>
              );
            })()}

            {/* Filtrlar */}
            <div className="ps-card space-y-4 p-5 sm:p-6">
              {visibleCategories.length > 1 && (
                <div className="space-y-2.5">
                  <p className="ps-eyebrow text-[var(--text-muted)]">Imtihon formati</p>
                  <div className="no-scrollbar flex items-center gap-2 overflow-x-auto py-1">
                    {visibleCategories.map((c) => {
                      const active = category === c.value;
                      return (
                        <button
                          key={c.value}
                          type="button"
                          onClick={() => setCategory(c.value)}
                          className={cn(
                            'shrink-0 cursor-pointer rounded-full px-4 py-2 text-xs font-bold transition-all active:scale-95 sm:text-[13px]',
                            active
                              ? 'bg-[var(--ps-purple)] text-white shadow-[0_8px_18px_-10px_rgba(118,89,199,0.9)]'
                              : 'bg-[var(--ps-neutral)] text-[var(--text-muted)] hover:text-[var(--text-primary)]',
                          )}
                        >
                          {c.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex flex-col justify-between gap-3 border-t border-[var(--border-card)] pt-4 sm:flex-row sm:items-center">
                <Tabs value={answerMode} onValueChange={setAnswerMode}>
                  <TabsList className="h-auto rounded-full bg-[var(--ps-neutral)] p-1">
                    {ANSWER_MODES.map((m) => (
                      <TabsTrigger
                        key={m.value}
                        value={m.value}
                        className="rounded-full px-3.5 py-1.5 text-xs font-bold data-[state=active]:bg-[#080808] data-[state=active]:text-[#FFFCF7] dark:data-[state=active]:bg-[#FFFCF7] dark:data-[state=active]:text-[#080808]"
                      >
                        {t(m.label)}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>

                <div className="relative w-full sm:w-80">
                  <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[var(--text-muted)]" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={`${currentSubjectObj?.name || 'Fan'} testlaridan qidirish...`}
                    className="!pl-11"
                  />
                </div>
              </div>
            </div>

            {data && (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-2">
                  <span className="ps-chip">Jami urinishlar: <b className="tabular-nums">{data.total_attempts}</b></span>
                  <span className="ps-chip">O&apos;rtacha natija: <b className="tabular-nums text-[var(--ps-purple)]">{data.avg_score.toFixed(0)}%</b></span>
                </div>
                <span className="ps-chip !bg-[#080808] !text-[#FFFCF7]">{data.tests.length} ta test topildi</span>
              </div>
            )}

            {!data && !errorMessage && (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-64 w-full rounded-[28px] bg-white/40" />)}
              </div>
            )}

            {/* Test kartalari */}
            <div className="grid gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3">
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

                return (
                  <InViewItem key={t.id} index={tIdx} className="h-full">
                    <div
                      className={cn(
                        'ps-card ps-lift relative flex h-full flex-col overflow-hidden p-5 sm:p-6',
                        isLiveMock && 'ring-2 ring-[var(--ps-purple)]',
                        !isLiveMock && isNew && 'ring-2 ring-[var(--ps-orange)]',
                      )}
                    >
                      <div
                        aria-hidden
                        className={cn(
                          'absolute -right-10 -top-10 size-28 rounded-full opacity-15',
                          isLiveMock ? 'bg-[var(--ps-purple)]' : isNew ? 'bg-[var(--ps-orange)]' : 'bg-[var(--ps-blue)]',
                        )}
                      />

                      {/* Belgilar va davomiylik */}
                      <div className="relative flex flex-wrap items-start justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {isNew && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--ps-orange)] px-2.5 py-1 text-[11px] font-bold text-[#080808]">
                              <Sparkles className="size-3" /> Yangi
                            </span>
                          )}
                          {isLiveMock ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--ps-purple)] px-2.5 py-1 text-[11px] font-bold text-white">
                              <span className="size-1.5 animate-ping rounded-full bg-white" /> Jonli mock
                            </span>
                          ) : (
                            <span className="rounded-full bg-[var(--ps-neutral)] px-2.5 py-1 text-[11px] font-bold text-[var(--text-secondary)]">
                              {CATEGORY_BADGE[t.category] || t.category}
                            </span>
                          )}
                          {t.answer_mode && ANSWER_MODE_BADGE[t.answer_mode] && (
                            <span className="rounded-full bg-[var(--ps-neutral)] px-2.5 py-1 text-[11px] font-bold text-[var(--text-secondary)]">
                              {ANSWER_MODE_BADGE[t.answer_mode].label}
                            </span>
                          )}
                        </div>
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#080808] px-2.5 py-1 text-[11px] font-bold text-[#FFFCF7] dark:bg-[#FFFCF7] dark:text-[#080808]">
                          <Clock className="size-3" />
                          {isLiveMock && t.scheduled_at ? formatScheduledTime(t.scheduled_at) : `${t.duration_minutes} daq`}
                        </span>
                      </div>

                      <h3 className="ps-display relative mt-4 text-[21px] leading-tight sm:text-[23px]">{t.title}</h3>
                      <p className="relative mt-2 line-clamp-2 flex-1 text-[13px] leading-relaxed text-[var(--text-muted)]">
                        {t.description}
                      </p>

                      {t.author && (
                        <div className="relative mt-4 flex items-center gap-2 text-[12px]">
                          {t.author.avatar ? (
                            <img src={t.author.avatar} alt="" className="size-6 rounded-full object-cover ring-2 ring-[var(--ps-orange)]" />
                          ) : (
                            <span className="flex size-6 items-center justify-center rounded-full bg-[var(--ps-purple)] text-[11px] font-bold text-white">
                              {t.author.name[0] || 'O'}
                            </span>
                          )}
                          <span className="max-w-[190px] truncate font-bold">{t.author.name}</span>
                          <VerifiedBadge role={t.author.role} isSuperadmin={t.author.is_superadmin} isTeacher={t.author.is_teacher} size="xs" />
                        </div>
                      )}

                      <div className="relative mt-4 grid grid-cols-2 gap-2">
                        <div className="rounded-2xl bg-[var(--ps-neutral)] px-3 py-2.5">
                          <p className="ps-num text-[22px]">{t.questions_count}</p>
                          <p className="mt-0.5 text-[11px] font-semibold text-[var(--text-muted)]">ta savol</p>
                        </div>
                        <div className="min-w-0 rounded-2xl bg-[var(--ps-neutral)] px-3 py-2.5">
                          <p className="truncate text-[13px] font-bold">{currentSubjectObj?.name || t.subject || '—'}</p>
                          <p className="mt-0.5 text-[11px] font-semibold text-[var(--text-muted)]">fan</p>
                        </div>
                      </div>

                      {/* Harakat */}
                      <div className="relative mt-5">
                        {locked ? (
                          <Link href={buyHref} className="ps-btn w-full justify-between bg-[var(--ps-orange)] text-[#080808]">
                            <span className="inline-flex items-center gap-2">
                              <Lock className="size-4" />
                              {data.mock_plan
                                ? `${Number(t.price ?? data.mock_plan.price).toLocaleString('uz-UZ')} so'mga ochish`
                                : (t.price ? `${Number(t.price).toLocaleString('uz-UZ')} so'mga ochish` : 'PRO obuna bilan ochiladi')}
                            </span>
                            <span className="ps-btn-arrow !bg-[#080808] !text-[var(--ps-orange)]"><ArrowUpRight className="size-4" /></span>
                          </Link>
                        ) : isLiveMock && isScheduledFuture ? (
                          <Link href={`/tests/mock/${t.id}`} className="ps-btn w-full justify-between bg-[var(--ps-purple)] text-white">
                            Kutish zaliga kirish
                            <span className="ps-btn-arrow"><ArrowUpRight className="size-4" /></span>
                          </Link>
                        ) : isLiveMock ? (
                          <button
                            type="button"
                            className="ps-btn w-full justify-between bg-[var(--ps-purple)] text-white"
                            onClick={() => start(t.id)}
                            disabled={starting !== null}
                          >
                            <span className="inline-flex items-center gap-2">
                              {starting === t.id && <Loader2 className="size-4 animate-spin" />}
                              {starting === t.id ? 'Boshlanmoqda...' : 'Jonli imtihonga kirish'}
                            </span>
                            <span className="ps-btn-arrow"><ArrowUpRight className="size-4" /></span>
                          </button>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              className="ps-btn ps-btn-ink flex-1 justify-between"
                              onClick={() => start(t.id)}
                              disabled={starting !== null}
                            >
                              <span className="inline-flex items-center gap-2">
                                {starting === t.id && <Loader2 className="size-4 animate-spin" />}
                                {starting === t.id ? 'Boshlanmoqda...' : 'Testni boshlash'}
                              </span>
                              <span className="ps-btn-arrow"><ArrowUpRight className="size-4" /></span>
                            </button>
                            <button
                              type="button"
                              title="Ushbu testni Real BMB Stress zali rejimida ishlash"
                              aria-label="Stress zali rejimida ishlash"
                              className="inline-flex size-12 shrink-0 cursor-pointer items-center justify-center rounded-full bg-[var(--ps-coral)] text-white transition-transform hover:-translate-y-0.5 active:scale-95"
                              onClick={() => {
                                setStressPreselectedTest({ id: t.id, title: t.title });
                                setStressModalOpen(true);
                              }}
                            >
                              <Flame className="size-5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </InViewItem>
                );
              })}
            </div>

            {data?.tests.length === 0 && (
              <div className="ps-card flex flex-col items-center px-6 py-14 text-center">
                <span className="inline-flex size-16 items-center justify-center rounded-full bg-[var(--ps-orange)] text-[#080808]">
                  <FileCheck2 className="size-7" />
                </span>
                <h4 className="ps-display mt-4 text-[24px]">
                  {search ? `"${search}" bo'yicha test topilmadi` : "Bu bo'limda hozircha testlar yo'q"}
                </h4>
                <p className="mt-2 max-w-sm text-sm text-[var(--text-muted)]">
                  Boshqa formatni tanlab ko&apos;ring yoki barcha fanlarga qayting.
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => { setCategory('all'); setAnswerMode('all'); setSearch(''); }}
                    className="ps-btn ps-btn-ghost"
                  >
                    Filtrlarni tozalash
                  </button>
                  <button type="button" onClick={handleBackToAllSubjects} className="ps-btn ps-btn-ink">
                    Barcha fanlar
                  </button>
                </div>
              </div>
            )}
          </div>
        )))}
        {/* Real BMB Stress Mode Launch Modal */}
        <BmbStressLaunchModal
          open={stressModalOpen}
          onOpenChange={setStressModalOpen}
          subjects={data?.subjects || []}
          preselectedTestId={stressPreselectedTest?.id}
          preselectedTitle={stressPreselectedTest?.title}
        />
      </main>
    </div>
  );
}
