'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Shuffle, Search, Clock, HelpCircle, Lock, ArrowRight, Loader2,
  FileCheck2, GraduationCap, Users, Flame, AlertCircle, X, Sparkles, Bell, CheckCircle2
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
  id: number; title: string; description: string; category: string;
  subject: string | null; duration_minutes: number; questions_count: number; is_premium: boolean;
  price?: number | null;
  is_unlocked: boolean;
  is_live_mock?: boolean;
  scheduled_at?: string | null;
  recent_solvers: number; recent_avg_score: number | null;
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
  subjects: { id: number; name: string; slug: string; color?: string; icon_name?: string }[];
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
  { value: 'bba', label: 'BBA' },
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
  { value: 'all', label: 'Barchasi' },
  { value: 'closed', label: 'Yopiq' },
  { value: 'open', label: 'Ochiq' },
  { value: 'mixed', label: 'Aralash' },
];

const ANSWER_MODE_BADGE: Record<string, { label: string; className: string }> = {
  closed: { label: 'Yopiq test', className: 'border-[#007AFF]/25 bg-[#007AFF]/10 text-[#007AFF]' },
  open: { label: 'Ochiq test', className: 'border-[#5856D6]/25 bg-[#5856D6]/10 text-[#5856D6]' },
  mixed: { label: 'Aralash test', className: 'border-[#FF9500]/25 bg-[#FF9500]/10 text-[#FF9500]' },
};

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
  'math': {
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
  const [startError, setStartError] = useState<{ message: string; testId?: number; scheduledAt?: string | null } | null>(null);
  const [starting, setStarting] = useState<number | null>(null);
  const [subject, setSubject] = useState<string | null>(null);
  const [category, setCategory] = useState('all');
  const [answerMode, setAnswerMode] = useState('all');
  const [search, setSearch] = useState('');

  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const params = new URLSearchParams();
  if (subject) params.set('subject', subject);
  if (category !== 'all') params.set('category', category);
  if (answerMode !== 'all') params.set('answer_mode', answerMode);
  if (debouncedSearch) params.set('search', debouncedSearch);
  const query = params.toString() ? `?${params.toString()}` : '';

  const { data, error: loadError } = useApiQuery<CenterData>(`/api/tests/${query}`);
  const errorMessage = startError?.message ?? loadError;

  useEffect(() => {
    if (data?.selected_subject) setSubject((prev) => prev ?? data.selected_subject);
  }, [data?.selected_subject]);

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
  const visibleCategories = availableCategories
    ? CATEGORIES.filter((c) => c.value === 'all' || availableCategories.includes(c.value))
    : [];

  useEffect(() => {
    if (!availableCategories) return;
    if (category !== 'all' && !availableCategories.includes(category)) setCategory('all');
  }, [availableCategories, category]);

  return (
    <>
      <AppShell />
      <main className="page-shell flex-1 space-y-6 bg-[#F2F2F7] dark:bg-[#000000] p-4 pb-20 sm:p-6">
        <PageHero
          eyebrow="BBA & Milliy Sertifikat · Rasmiy Simulyator"
          eyebrowIcon={GraduationCap}
          title="Test va Imtihonlar Markazi"
          description="Davlat imtihonlariga moslashgan vaqt me'yori, baholash mezonlari va xatolar ustida ishlash tizimi."
        />

        {/* iOS Live Activity Pinned Mock Imtihon Banner */}
        {data?.pinned_mock && (() => {
          const theme = SUBJECT_IOS_THEME[data.pinned_mock.subject_slug] || SUBJECT_IOS_THEME['tarix'];
          const isReminded = pinnedReminded ?? data.pinned_mock.is_reminded;
          return (
            <Reveal>
              <div className="relative overflow-hidden rounded-[28px] bg-white dark:bg-[#1C1C1E] border border-black/[0.06] dark:border-white/[0.08] p-5 sm:p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex min-w-0 items-start sm:items-center gap-4">
                    <div className={cn("flex size-12 shrink-0 items-center justify-center rounded-[15px] text-white shadow-xs", theme.squircle)}>
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
                          <Badge variant="outline" className="font-mono text-[11px] gap-1 font-bold border-black/[0.08] dark:border-white/[0.12] bg-[#F2F2F7] dark:bg-[#2C2C2E] text-slate-800 dark:text-slate-200">
                            <Clock className="size-3 text-[#007AFF]" /> {formatScheduledTime(data.pinned_mock.scheduled_at)}
                          </Badge>
                        )}
                        <Badge variant="outline" className="border-[#34C759]/25 bg-[#34C759]/10 text-[#248A3D] dark:text-[#30D158] font-bold text-[11px] gap-1">
                          <Users className="size-3" /> {data.pinned_mock.waiting_participants_count || 32}+ abituriyent
                        </Badge>
                      </div>
                      <h3 className="text-[17px] sm:text-[19px] font-extrabold tracking-[-0.02em] text-slate-900 dark:text-white truncate">
                        {data.pinned_mock.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12px] sm:text-[13px] text-[#8E8E93]">
                        <span>{data.pinned_mock.questions_count || 45} ta savol · {data.pinned_mock.duration_minutes || 90} daqiqa · Milliy Sertifikat Formati</span>
                        {data.pinned_mock.author && (
                          <span className="inline-flex items-center gap-1 font-semibold text-slate-800 dark:text-slate-200">
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
                        "inline-flex h-11 items-center gap-1.5 rounded-full px-4 text-[13px] font-bold border transition-all active:scale-95",
                        isReminded
                          ? "border-[#34C759]/30 bg-[#34C759]/12 text-[#248A3D] dark:text-[#30D158]"
                          : "border-[#FF9500]/30 bg-[#FF9500]/12 text-[#FF9500]"
                      )}
                    >
                      {isReminded ? (
                        <>
                          <CheckCircle2 className="size-4 text-[#34C759]" />
                          <span>Eslatma yoqilgan</span>
                        </>
                      ) : (
                        <>
                          <Bell className="size-4 text-[#FF9500]" />
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

        {/* Apple Shortcuts Style Quick Test Card */}
        <div
          onClick={() => starting === null && startRandom()}
          className="group cursor-pointer rounded-[26px] bg-white dark:bg-[#1C1C1E] border border-black/[0.06] dark:border-white/[0.08] hover:border-[#34C759]/50 p-5 sm:p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] transition-all active:scale-[0.99]"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3.5">
              <PremiumIcon icon={Shuffle} tone="emerald" size="md" solid />
              <div className="min-w-0">
                <h3 className="text-[16px] sm:text-[17px] font-bold tracking-[-0.015em] text-slate-900 dark:text-white group-hover:text-[#34C759] transition-colors">
                  Tezkor Blits Test
                </h3>
                <p className="mt-0.5 text-[13px] text-[#8E8E93]">
                  10 ta savol · 10 daqiqa · bepul — bir o&apos;tirishda bilimingizni tekshiring
                </p>
              </div>
            </div>
            <Button
              disabled={starting !== null}
              onClick={(e) => { e.stopPropagation(); startRandom(); }}
              className="rounded-full px-5 bg-[#34C759] hover:bg-[#2DB84E] shadow-[0_4px_14px_rgba(52,199,89,0.28)]"
            >
              {starting === -1 ? <Loader2 className="size-4 animate-spin" /> : null}
              BOSHLASH
            </Button>
          </div>
        </div>

        {errorMessage && (
          <Reveal>
            <div
              className={cn(
                'relative overflow-hidden rounded-[24px] border p-4 sm:p-5 transition-all',
                (startError?.scheduledAt || errorMessage.includes('boshlanmadi'))
                  ? 'border-[#FF9500]/30 bg-[#FF9500]/10 text-slate-900 dark:text-white'
                  : 'border-[#FF3B30]/30 bg-[#FF3B30]/10 text-[#D70015] dark:text-[#FF453A]'
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3.5">
                  <div
                    className={cn(
                      'flex size-10 shrink-0 items-center justify-center rounded-[12px] text-white',
                      (startError?.scheduledAt || errorMessage.includes('boshlanmadi'))
                        ? 'bg-[#FF9500]'
                        : 'bg-[#FF3B30]'
                    )}
                  >
                    {(startError?.scheduledAt || errorMessage.includes('boshlanmadi')) ? (
                      <Clock className="size-5" />
                    ) : (
                      <AlertCircle className="size-5" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-[15px] font-bold text-slate-900 dark:text-white">
                      {(startError?.scheduledAt || errorMessage.includes('boshlanmadi'))
                        ? 'Imtihon hali boshlanmadi'
                        : 'Xatolik yuz berdi'}
                    </h4>
                    <p className="mt-0.5 text-[13px] text-[#8E8E93]">
                      {errorMessage}
                    </p>
                    {(startError?.scheduledAt || errorMessage.includes('boshlanmadi')) && (startError?.testId || data?.pinned_mock?.id) && (
                      <div className="mt-3">
                        <Button
                          asChild
                          size="sm"
                          className="rounded-full bg-[#FF9500] hover:bg-[#E68600] text-white"
                        >
                          <Link href={`/tests/mock/${startError?.testId || data?.pinned_mock?.id}`}>
                            Kutish zaliga kirish (Lobby) <ArrowRight className="ml-1 size-3.5" />
                          </Link>
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setStartError(null)}
                  className="rounded-full p-1.5 text-[#8E8E93] hover:bg-black/5 dark:hover:bg-white/10"
                  aria-label="Yopish"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>
          </Reveal>
        )}

        {/* Subject Capsule Filter */}
        {data && data.subjects.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto py-1 no-scrollbar">
            {data.subjects.map((s) => {
              const active = subject === s.slug;
              return (
                <button
                  key={s.slug}
                  type="button"
                  onClick={() => setSubject(s.slug)}
                  className={cn(
                    'shrink-0 rounded-full px-4 py-2 text-[13px] font-semibold transition-all border active:scale-95',
                    active
                      ? 'bg-[#007AFF] text-white border-[#007AFF] shadow-[0_4px_12px_rgba(0,122,255,0.28)]'
                      : 'bg-white dark:bg-[#1C1C1E] text-slate-700 dark:text-slate-200 border-black/[0.06] dark:border-white/[0.08] hover:border-[#007AFF]/40'
                  )}
                >
                  {s.name}
                </button>
              );
            })}
          </div>
        )}

        {/* iOS Segmented Controls & Spotlight Search */}
        <div className="flex flex-col gap-3">
          {visibleCategories.length > 1 && (
            <Tabs value={category} onValueChange={setCategory}>
              <TabsList>
                {visibleCategories.map((c) => (
                  <TabsTrigger key={c.value} value={c.value}>
                    {c.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          )}

          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <Tabs value={answerMode} onValueChange={setAnswerMode}>
              <TabsList>
                {ANSWER_MODES.map((m) => (
                  <TabsTrigger key={m.value} value={m.value}>
                    {m.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#8E8E93]" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Test nomi bo'yicha qidirish..."
                className="pl-10 rounded-full bg-white dark:bg-[#1C1C1E]"
              />
            </div>
          </div>
        </div>

        {data && (
          <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-[12px] font-medium text-[#8E8E93]">
            <span>
              Jami urinishlar: <strong className="font-mono font-bold text-slate-900 dark:text-white">{data.total_attempts}</strong>
              {' · '}O&apos;rtacha natija: <strong className="font-mono font-bold text-[#007AFF]">{data.avg_score.toFixed(0)}%</strong>
            </span>
            <span className="font-mono font-semibold">{data.tests.length} ta test topildi</span>
          </div>
        )}

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
                    "group relative flex h-full flex-col justify-between rounded-[26px] bg-white dark:bg-[#1C1C1E] p-5 sm:p-6 transition-all duration-200 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_32px_rgba(0,122,255,0.08)]",
                    isLiveMock
                      ? "border-2 border-[#007AFF]/45"
                      : isNew
                      ? "border border-[#FF9500]/45"
                      : "border border-black/[0.06] dark:border-white/[0.08] hover:border-[#007AFF]/40"
                  )}
                >
                  <div className="flex flex-1 flex-col">
                    {/* Top Badges & Duration */}
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {isNew && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#FF9500] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                            <Sparkles className="size-2.5 fill-white" /> Yangi
                          </span>
                        )}
                        {isLiveMock ? (
                          <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white", cTheme.squircle)}>
                            <span className="size-1.5 rounded-full bg-white animate-ping" />
                            Jonli Mock
                          </span>
                        ) : (
                          <span className="rounded-full bg-[#767680]/[0.10] px-2.5 py-0.5 text-[11px] font-bold text-slate-700 dark:text-slate-200">
                            {CATEGORY_BADGE[t.category] || t.category}
                          </span>
                        )}
                        {t.answer_mode && ANSWER_MODE_BADGE[t.answer_mode] && (
                          <Badge variant="outline" className={cn("text-[10px] font-bold", ANSWER_MODE_BADGE[t.answer_mode].className)}>
                            {ANSWER_MODE_BADGE[t.answer_mode].label}
                          </Badge>
                        )}
                      </div>

                      {isLiveMock && t.scheduled_at ? (
                        <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-mono text-[11px] font-bold", cTheme.pill)}>
                          <Clock className="size-3" /> {formatScheduledTime(t.scheduled_at)}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 font-mono text-[12px] font-semibold text-[#8E8E93]">
                          <Clock className="size-3.5" /> {t.duration_minutes} daq
                        </span>
                      )}
                    </div>

                    <h3 className="text-[17px] font-bold leading-snug tracking-[-0.015em] text-slate-900 dark:text-white group-hover:text-[#007AFF] transition-colors">
                      {t.title}
                    </h3>
                    <p className="mt-1.5 line-clamp-2 flex-1 text-[13px] leading-relaxed text-[#8E8E93]">
                      {t.description}
                    </p>

                    <div className="my-3.5 h-px bg-black/[0.05] dark:bg-white/[0.07]" />

                    {t.author && (
                      <div className="mb-2.5 flex items-center gap-1.5 text-[12px]">
                        {t.author.avatar ? (
                          <img src={t.author.avatar} alt="" className="size-4.5 rounded-full object-cover" />
                        ) : (
                          <div className="flex size-4.5 items-center justify-center rounded-full bg-[#007AFF]/15 text-[10px] font-bold text-[#007AFF]">
                            {t.author.name[0] || 'O'}
                          </div>
                        )}
                        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[180px]">{t.author.name}</span>
                        <VerifiedBadge role={t.author.role} isSuperadmin={t.author.is_superadmin} isTeacher={t.author.is_teacher} size="xs" />
                      </div>
                    )}

                    <div className="mb-3 flex items-center justify-between text-[12px] text-[#8E8E93]">
                      <span className="flex items-center gap-1 font-mono font-semibold">
                        <HelpCircle className={cn("size-3.5", cTheme.accentText)} /> {t.questions_count} ta savol
                      </span>
                      {t.subject && (
                        <span className={cn("rounded-full border px-2.5 py-0.5 text-[11px] font-bold", cTheme.pill)}>
                          {t.subject}
                        </span>
                      )}
                    </div>

                    {t.recent_solvers > 0 && (
                      <p className="mb-3.5 flex items-center gap-1.5 text-[12px] text-[#8E8E93]">
                        <Users className="size-3.5 text-[#007AFF]" />
                        So&apos;nggi 7 kunda <strong className="font-bold text-slate-800 dark:text-slate-200">{t.recent_solvers}</strong> kishi yechdi
                        {t.recent_avg_score !== null && <> · o&apos;rtacha <strong className="font-bold text-[#34C759]">{Math.round(t.recent_avg_score)}%</strong></>}
                      </p>
                    )}

                    {locked ? (
                      <Link
                        href={buyHref}
                        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[14px] border border-[#FF9500]/30 bg-[#FF9500]/12 px-4 text-[13px] font-bold text-[#FF9500] hover:bg-[#FF9500]/20 transition-all active:scale-[0.98]"
                      >
                        <Lock className="size-3.5" />
                        <span>
                          {data.mock_plan
                            ? `${Number(t.price ?? data.mock_plan.price).toLocaleString('uz-UZ')} so'mga ochish`
                            : (t.price ? `${Number(t.price).toLocaleString('uz-UZ')} so'mga ochish` : 'PRO obuna bilan ochiladi')}
                        </span>
                        <ArrowRight className="size-4" />
                      </Link>
                    ) : isLiveMock && isScheduledFuture ? (
                      <Link
                        href={`/tests/mock/${t.id}`}
                        className={cn("inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-[14px] px-4 text-[13px] font-bold transition-all active:scale-[0.98]", cTheme.button)}
                      >
                        <span>Kutish zaliga kirish (Lobby)</span>
                        <ArrowRight className="size-4" />
                      </Link>
                    ) : isLiveMock ? (
                      <button
                        type="button"
                        className={cn("inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-[14px] px-4 text-[13px] font-bold transition-all active:scale-[0.98]", cTheme.button)}
                        onClick={() => start(t.id)}
                        disabled={starting !== null}
                      >
                        {starting === t.id ? <Loader2 className="size-4 animate-spin" /> : null}
                        <span>{starting === t.id ? 'Boshlanmoqda...' : 'Jonli imtihonga kirish 🚀'}</span>
                        {starting !== t.id && <ArrowRight className="size-4" />}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-[14px] bg-[#007AFF]/10 group-hover:bg-[#007AFF] px-4 text-[13px] font-bold text-[#007AFF] group-hover:text-white transition-all active:scale-[0.98]"
                        onClick={() => start(t.id)}
                        disabled={starting !== null}
                      >
                        {starting === t.id ? <Loader2 className="size-4 animate-spin" /> : null}
                        <span>{starting === t.id ? 'Boshlanmoqda...' : 'Testni boshlash'}</span>
                        {starting !== t.id && <ArrowRight className="size-4" />}
                      </button>
                    )}
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>

        {data?.tests.length === 0 && (
          <div className="rounded-[28px] bg-white dark:bg-[#1C1C1E] border border-black/[0.06] dark:border-white/[0.08] py-14 text-center space-y-2.5">
            <PremiumIcon icon={FileCheck2} tone="zinc" size="lg" className="mx-auto" />
            <p className="text-[14px] font-semibold text-[#8E8E93]">
              {search ? `"${search}" bo'yicha test topilmadi.` : "Bu bo'limda hozircha test yo'q."}
            </p>
          </div>
        )}
      </main>
    </>
  );
}
