'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Shuffle, Search, Clock, HelpCircle, Lock, ArrowRight, Loader2, FileCheck2, GraduationCap, Users, Flame, AlertCircle, X, Sparkles } from 'lucide-react';
import { apiFetch, ApiError } from '@/lib/api-client';
import { useApiQuery } from '@/lib/api-cache';
import { useAuthStore } from '@/lib/auth-store';
import { toast } from 'sonner';
import AppShell from '@/components/AppShell';
import CardMotif from '@/components/student/CardMotif';
import { cn } from '@/lib/utils';
import { cardArtwork, subjectIndex } from '@/lib/subjectTheme';
import Reveal from '@/components/motion/Reveal';
import PageHero from '@/components/student/PageHero';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

type AnswerMode = 'open' | 'closed' | 'mixed' | null;

type TestItem = {
  id: number; title: string; description: string; category: string;
  subject: string | null; duration_minutes: number; questions_count: number; is_premium: boolean;
  is_unlocked: boolean;
  is_live_mock?: boolean;
  scheduled_at?: string | null;
  recent_solvers: number; recent_avg_score: number | null;
  answer_mode: AnswerMode;
};

function formatScheduledTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const timeStr = d.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', hour12: false });
    if (isToday) {
      return `Bugun, ${timeStr}`;
    }
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (d.toDateString() === tomorrow.toDateString()) {
      return `Ertaga, ${timeStr}`;
    }
    const dateFormatted = d.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short' });
    return `${dateFormatted}, ${timeStr}`;
  } catch {
    return '';
  }
}

type CenterData = {
  tests: TestItem[];
  subjects: { id: number; name: string; slug: string; color?: string; icon_name?: string }[];
  selected_subject: string | null;
  selected_category: string;
  /* Shu fanda mavjud imtihon turlari — filtr shundan quriladi (tests_app/api.py). */
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
  } | null;
};

/* Imtihon turlari — backenddagi `Question.CATEGORY_CHOICES` bilan mos bo'lishi shart.
   U yerga yangi tur qo'shsangiz, bu yerga ham qo'shing (aks holda test katalogda
   filtrlanmaydi va nishonsiz qoladi). */
const CATEGORIES = [
  { value: 'all', label: 'Barchasi' },
  { value: 'certificate', label: 'Milliy Sertifikat' },
  { value: 'history', label: 'Mavzulashtirilgan' },
  { value: 'bba', label: 'BBA' },
  { value: 'cefr', label: 'CEFR' },
];

const CATEGORY_BADGE: Record<string, string> = {
  certificate: 'Rasmiy Format', history: 'Mavzulashtirilgan', bba: 'DTB Formati',
  cefr: 'Ingliz tili', all: 'Test',
};

const ANSWER_MODES = [
  { value: 'all', label: 'Barchasi' },
  { value: 'closed', label: 'Yopiq' },
  { value: 'open', label: 'Ochiq' },
  { value: 'mixed', label: 'Aralash' },
];

// Karta ustidagi kichik yorliq: variantli/yozma javob turi. `null` — savol yo'q (bo'sh
// test), yorliq ko'rsatilmaydi.
const ANSWER_MODE_BADGE: Record<string, { label: string; className: string }> = {
  closed: { label: 'Yopiq test', className: 'border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-300' },
  open: { label: 'Ochiq test', className: 'border-violet-500/30 bg-violet-500/10 text-violet-600 dark:text-violet-300' },
  mixed: { label: 'Aralash test', className: 'border-[var(--border-strong)] bg-[var(--surface-hover)] text-[var(--text-secondary)]' },
};

export default function TestsPage() {
  const router = useRouter();
  const { access } = useAuthStore();
  // `startError` faqat test boshlashdagi xatolar uchun; yuklash xatosi keshdan keladi.
  const [startError, setStartError] = useState<{ message: string; testId?: number; scheduledAt?: string | null } | null>(null);
  const [starting, setStarting] = useState<number | null>(null);
  const [subject, setSubject] = useState<string | null>(null);
  const [category, setCategory] = useState('all');
  const [answerMode, setAnswerMode] = useState('all');
  const [search, setSearch] = useState('');

  /* Qidiruv har harfda so'rov yubormasligi uchun 300 ms kutiladi; so'rov yo'li shu
     "sekinlashtirilgan" qiymatdan quriladi va kesh orqali o'tadi. */
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

  // Server tanlangan fanni o'zi qaytaradi — birinchi javobdan keyin uni eslab qolamiz.
  useEffect(() => {
    if (data?.selected_subject) setSubject((prev) => prev ?? data.selected_subject);
  }, [data?.selected_subject]); // eslint-disable-line react-hooks/exhaustive-deps

  async function start(testId: number) {
    setStarting(testId);
    setStartError(null);
    try {
      const res = await apiFetch<{ attempt_id: number; mode?: string }>(`/api/tests/${testId}/start/`, { method: 'POST' });
      // Partlarga bo'lingan CEFR testi o'z ekranida ochiladi: matn/audio va butun part
      // bir varaqda. Qolgan testlar eski "bitta savol — bitta ekran" oqimida qoladi.
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

  // Karta rangini fan belgilaydi, test esa faqat fanning `slug`ini biladi — shu jadval
  // ikkalasini bog'laydi.
  const subjects = subjectIndex(data?.subjects);

  /* Shu fanda haqiqatan mavjud imtihon turlari. Server `available_categories`ni
     tanlangan fan bo'yicha hisoblaydi, ya'ni CEFR faqat ingliz tilida, "Tarix" faqat
     tarixda chiqadi. Ma'lumot hali kelmagan bo'lsa — hech narsa ko'rsatmaymiz. */
  const availableCategories = data?.available_categories;
  const visibleCategories = availableCategories
    ? CATEGORIES.filter((c) => c.value === 'all' || availableCategories.includes(c.value))
    : [];

  /* Fan almashtirilganda eski kategoriya filtri qolib ketardi: masalan Tarixda
     "Tarix"ni tanlab, Ona tiliga o'tsangiz filtr o'sha holicha qolib, ro'yxat doim
     bo'sh chiqardi ("0 ta test topildi"). Tanlangan tur yangi fanda bo'lmasa —
     "Barchasi"ga qaytariladi. */
  useEffect(() => {
    if (!availableCategories) return;
    if (category !== 'all' && !availableCategories.includes(category)) setCategory('all');
  }, [availableCategories, category]);

  return (
    <>
      <AppShell />
      <main className="page-shell flex-1 space-y-8 bg-[var(--bg-page)] p-4 pb-12 sm:p-6">
        <PageHero
          eyebrow="BBA & Milliy Sertifikat"
          eyebrowIcon={GraduationCap}
          title="Test va Imtihonlar Markazi"
          description="Davlat imtihonlariga moslashgan vaqt me'yori, baholash mezonlari va xatolar ustida ishlash tizimi."
        />

        {/* Pinned Katta Mock Imtihon Banner */}
        {data?.pinned_mock && (
          <Reveal>
            <Card className="relative overflow-hidden border-2 border-amber-500/40 bg-gradient-to-r from-amber-500/[0.08] via-[var(--surface-card)] to-emerald-500/[0.08] shadow-lg">
              <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
                <div className="flex min-w-0 items-center gap-4">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-500 ring-4 ring-amber-500/10">
                    <Flame className="size-6 animate-pulse" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className="bg-amber-500 text-white font-bold text-[10px] uppercase tracking-wider px-2 py-0.5">
                        Katta Mock Imtihon
                      </Badge>
                      <Badge variant="outline" className="border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400 text-xs font-semibold">
                        {data.pinned_mock.subject}
                      </Badge>
                    </div>
                    <h3 className="text-base sm:text-lg font-extrabold text-foreground truncate">
                      {data.pinned_mock.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                      {data.pinned_mock.questions_count || 45} ta savol · {data.pinned_mock.duration_minutes || 90} daqiqa · Milliy Sertifikat Formati
                    </p>
                  </div>
                </div>

                <Button asChild size="lg" className="rounded-xl font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-md">
                  <Link href={`/tests/mock/${data.pinned_mock.id}`}>
                    Kutish zaliga kirish <ArrowRight className="ml-1.5 size-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </Reveal>
        )}

        {/* Tezkor test — sahifaning ASOSIY harakati.
            Nega: katalogdagi testlar 30-45 savoldan iborat va telefonda ularni
            oxirigacha yechish kam uchraydi (javoblarning katta qismi "o'tkazib
            yuborilgan" bo'lib qolyapti). 10 savollik format bir o'tirishda
            tugatiladi — ya'ni o'quvchi natija KO'RADI, natija esa qaytib kelish
            sababi. Ilgari bu tugma sarlavha yonida kichik "Tasodifiy test" bo'lib
            turardi va nima taklif qilinayotgani (necha savol, qancha vaqt)
            umuman ko'rinmasdi. */}
        <Card
          onClick={() => starting === null && startRandom()}
          className="tactile-btn group relative cursor-pointer overflow-hidden border-2 border-[var(--accent-border)] transition-colors hover:border-[var(--accent)]"
        >
          <CardMotif shape="quick" className="text-[var(--accent)]" />
          <CardContent className="relative flex flex-wrap items-center justify-between gap-4 pt-6">
            <div className="flex min-w-0 items-center gap-3.5">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/20 text-[var(--accent)] transition-transform group-hover:scale-110">
                <Shuffle className="size-6" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-bold transition-colors group-hover:text-[var(--accent-text)]">
                  Tezkor test
                </h3>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  10 savol · 10 daqiqa · bepul — bir o&apos;tirishda tugatasiz
                </p>
              </div>
            </div>
            <Button disabled={starting !== null} onClick={(e) => { e.stopPropagation(); startRandom(); }}>
              {starting === -1 ? <Loader2 className="size-4 animate-spin" /> : null}
              Boshlash
            </Button>
          </CardContent>
        </Card>

        {errorMessage && (
          <Reveal>
            <div
              className={cn(
                'relative overflow-hidden rounded-2xl border p-4 sm:p-5 shadow-lg backdrop-blur-sm transition-all',
                (startError?.scheduledAt || errorMessage.includes('boshlanmadi'))
                  ? 'border-amber-500/40 bg-gradient-to-r from-amber-500/15 via-[var(--surface-card)] to-amber-500/5 text-foreground'
                  : 'border-destructive/30 bg-destructive/10 text-destructive dark:border-destructive/40 dark:bg-destructive/15'
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3.5">
                  <div
                    className={cn(
                      'flex size-10 shrink-0 items-center justify-center rounded-xl ring-1',
                      (startError?.scheduledAt || errorMessage.includes('boshlanmadi'))
                        ? 'bg-amber-500/20 text-amber-500 ring-amber-500/30'
                        : 'bg-destructive/20 text-destructive ring-destructive/30'
                    )}
                  >
                    {(startError?.scheduledAt || errorMessage.includes('boshlanmadi')) ? (
                      <Clock className="size-5 animate-pulse" />
                    ) : (
                      <AlertCircle className="size-5" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground sm:text-base">
                      {(startError?.scheduledAt || errorMessage.includes('boshlanmadi'))
                        ? 'Imtihon hali boshlanmadi'
                        : 'Xatolik yuz berdi'}
                    </h4>
                    <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                      {errorMessage}
                    </p>
                    {(startError?.scheduledAt || errorMessage.includes('boshlanmadi')) && (startError?.testId || data?.pinned_mock?.id) && (
                      <div className="mt-3">
                        <Button
                          asChild
                          size="sm"
                          className="h-8 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-semibold shadow-sm"
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
                  className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  aria-label="Yopish"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>
          </Reveal>
        )}

        {/* Ilgari bu yerda "sizda darslar obunasi bor, lekin mock testlar alohida
            sotib olinadi" ogohlantirishi turardi. Endi PRO obuna barcha mock
            testlarni ochadi (tests_app/api.py), ya'ni o'sha holat ham, o'sha matn
            ham mavjud emas. */}

        {data && data.subjects.length > 0 && (
          <div className="scroll-fade scroll-row flex items-center gap-2 overflow-x-auto pb-1">
            {data.subjects.map((s) => (
              <Button
                key={s.slug}
                size="sm"
                variant="outline"
                className={cn('shrink-0 rounded-full', subject === s.slug && 'chip-active')}
                onClick={() => setSubject(s.slug)}
              >
                {s.name}
              </Button>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-3">
          {/* Faqat SHU FANDA mavjud imtihon turlari ko'rsatiladi (ro'yxat serverdan
              keladi). Ilgari bu yerda umumiy ro'yxat turardi va natijada Ona tili yoki
              Biologiya ostida ham "Tarix", "CEFR" kabi mos kelmaydigan turlar chiqib
              turardi. Bitta tur qolsa filtrning ma'nosi yo'q — umuman ko'rsatilmaydi. */}
          {visibleCategories.length > 1 && (
            <Tabs value={category} onValueChange={setCategory}>
              <TabsList>
                {visibleCategories.map((c) => (
                  <TabsTrigger key={c.value} value={c.value}>{c.label}</TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          )}

          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <Tabs value={answerMode} onValueChange={setAnswerMode}>
              <TabsList>
                {ANSWER_MODES.map((m) => <TabsTrigger key={m.value} value={m.value}>{m.label}</TabsTrigger>)}
              </TabsList>
            </Tabs>

            <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Test nomi bo'yicha qidirish..."
                className="pl-9"
              />
            </div>
          </div>
        </div>

        {data && (
          <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-muted-foreground">
            <span>
              Jami urinishlar: <strong className="font-mono text-foreground">{data.total_attempts}</strong>
              {' · '}O&apos;rtacha: <strong className="font-mono text-[var(--accent-text)]">{data.avg_score.toFixed(0)}%</strong>
            </span>
            <span>{data.tests.length} ta test topildi</span>
          </div>
        )}

        {!data && !errorMessage && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-56 w-full" />)}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data?.tests.map((t, tIdx) => {
            // Mock test tarifi BITTA testni ochadi — shuning uchun qulf har bir karta
            // uchun alohida: `is_unlocked` serverdan shu o'quvchi bo'yicha keladi.
            const locked = t.is_premium && !t.is_unlocked;
            const isLiveMock = Boolean(t.is_live_mock);
            const isScheduledFuture = Boolean(isLiveMock && t.scheduled_at && new Date(t.scheduled_at).getTime() > Date.now());
            const buyHref = data.mock_plan
              ? `/premium/checkout/${data.mock_plan.id}?test=${t.id}`
              : '/premium';
            /* Kartaning fonini fan belgilaydi (rang bazadan, motiv `subjectTheme.ts`
               dan), aniq ko'rinishini esa test `id` si — shu tufayli bitta fandagi
               o'nlab test bir-biriga o'xshab ketmaydi. */
            const art = cardArtwork(t.subject ? subjects[t.subject] : null, t.id);
            return (
              <Reveal key={t.id} index={tIdx} className="h-full">
              <Card
                style={art.style}
                className={cn(
                  "group relative flex h-full flex-col justify-between transition-all duration-300",
                  isLiveMock
                    ? "border-2 border-amber-500/50 bg-gradient-to-br from-amber-500/[0.08] via-[var(--surface-card)] to-emerald-500/[0.04] shadow-lg shadow-amber-500/5 hover:border-amber-400 hover:shadow-xl hover:shadow-amber-500/10"
                    : "transition-colors hover:border-[var(--accent-border)]"
                )}
              >
                {isLiveMock && (
                  <div className="absolute -top-px left-8 right-8 h-[2px] bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-80" />
                )}
                <CardContent className="flex flex-1 flex-col pt-6">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {isLiveMock ? (
                        <>
                          <Badge className="bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold text-[10px] uppercase tracking-wider px-2 py-0.5 gap-1.5 shadow-sm border-0">
                            <span className="relative flex size-1.5">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-80" />
                              <span className="relative inline-flex size-1.5 rounded-full bg-white" />
                            </span>
                            Jonli Mock
                          </Badge>
                          <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                            {CATEGORY_BADGE[t.category] || 'Rasmiy Format'}
                          </Badge>
                        </>
                      ) : (
                        <Badge variant="outline" className="border-[var(--accent-border)] bg-primary/12 text-[var(--accent-text)]">
                          {CATEGORY_BADGE[t.category] || t.category}
                        </Badge>
                      )}
                      {t.answer_mode && ANSWER_MODE_BADGE[t.answer_mode] && (
                        <Badge variant="outline" className={ANSWER_MODE_BADGE[t.answer_mode].className}>
                          {ANSWER_MODE_BADGE[t.answer_mode].label}
                        </Badge>
                      )}
                    </div>
                    {isLiveMock && t.scheduled_at ? (
                      <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-500 font-mono text-xs gap-1 font-semibold">
                        <Clock className="size-3" /> {formatScheduledTime(t.scheduled_at)}
                      </Badge>
                    ) : (
                      <span className="flex items-center gap-1 font-mono text-xs text-muted-foreground">
                        <Clock className="size-3.5" /> {t.duration_minutes} daq
                      </span>
                    )}
                  </div>

                  <h3 className={cn(
                    "font-voice text-base font-bold leading-snug transition-colors",
                    isLiveMock ? "text-foreground group-hover:text-amber-500" : "group-hover:text-[var(--accent-text)]"
                  )}>
                    {t.title}
                  </h3>
                  <p className="mt-1.5 line-clamp-2 flex-1 text-xs leading-relaxed text-muted-foreground">{t.description}</p>

                  <Separator className="my-3" />

                  <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1 font-mono">
                      <HelpCircle className={cn("size-3.5", isLiveMock ? "text-amber-500" : "text-[var(--accent-text)]")} /> {t.questions_count} ta savol
                    </span>
                    {t.subject && (
                      <Badge variant={isLiveMock ? "outline" : "secondary"} className={isLiveMock ? "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium" : ""}>
                        {t.subject}
                      </Badge>
                    )}
                  </div>

                  {/* Ijtimoiy dalil — raqobat emas, "bu yo'ldan boshqalar ham o'tgan" signali.
                      Ma'lumot bo'lmasa (hech kim yechmagan) umuman ko'rsatilmaydi. */}
                  {t.recent_solvers > 0 && (
                    <p className="mb-3 flex items-center gap-1.5 text-xs text-[var(--text-faint)]">
                      <Users className="size-3.5" />
                      So&apos;nggi 7 kunda <strong className="text-[var(--text-secondary)]">{t.recent_solvers}</strong> kishi yechdi
                      {t.recent_avg_score !== null && <> · o&apos;rtacha <strong className="text-[var(--text-secondary)]">{Math.round(t.recent_avg_score)}%</strong></>}
                    </p>
                  )}

                  {locked ? (
                    /* Bitta aniq signal: qulflangan kartada yagona harakat — tariflar sahifasi. */
                    <Button asChild variant="outline" className="w-full border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 hover:text-amber-200">
                      <Link href={buyHref}>
                        <Lock className="size-3.5" />
                        {data.mock_plan
                          ? `${Number(data.mock_plan.price).toLocaleString('uz-UZ')} so'mga ochish`
                          : 'Mock test tarifi bilan ochiladi'}
                        <ArrowRight className="size-4" />
                      </Link>
                    </Button>
                  ) : isLiveMock && isScheduledFuture ? (
                    <Button asChild className="w-full font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-md shadow-amber-500/20 transition-all hover:scale-[1.01]">
                      <Link href={`/tests/mock/${t.id}`}>
                        Kutish zaliga kirish (Lobby) <ArrowRight className="ml-1.5 size-4" />
                      </Link>
                    </Button>
                  ) : isLiveMock ? (
                    <Button
                      className="w-full font-bold bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-md shadow-emerald-500/25 animate-pulse"
                      onClick={() => start(t.id)}
                      disabled={starting !== null}
                    >
                      {starting === t.id ? <Loader2 className="size-4 animate-spin" /> : null}
                      {starting === t.id ? 'Boshlanmoqda...' : 'Jonli imtihonga kirish 🚀'}
                      {starting !== t.id && <ArrowRight className="size-4" />}
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full group-hover:border-transparent group-hover:bg-primary group-hover:text-[var(--on-accent)]"
                      onClick={() => start(t.id)}
                      disabled={starting !== null}
                    >
                      {starting === t.id ? <Loader2 className="size-4 animate-spin" /> : null}
                      {starting === t.id ? 'Boshlanmoqda...' : 'Testni boshlash'}
                      {starting !== t.id && <ArrowRight className="size-4" />}
                    </Button>
                  )}
                </CardContent>
              </Card>
              </Reveal>
            );
          })}
        </div>

        {data?.tests.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <FileCheck2 className="mx-auto mb-2 size-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                {search ? `"${search}" bo'yicha test topilmadi.` : "Bu bo'limda hozircha test yo'q."}
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </>
  );
}
