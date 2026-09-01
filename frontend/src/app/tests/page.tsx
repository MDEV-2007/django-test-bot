'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Shuffle, Search, Clock, HelpCircle, Lock, ArrowRight, Loader2, FileCheck2, GraduationCap, Users } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { useApiQuery } from '@/lib/api-cache';
import { useAuthStore } from '@/lib/auth-store';
import AppShell from '@/components/AppShell';
import { cn } from '@/lib/utils';
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
  recent_solvers: number; recent_avg_score: number | null;
  answer_mode: AnswerMode;
};

type CenterData = {
  tests: TestItem[];
  subjects: { id: number; name: string; slug: string }[];
  selected_subject: string | null;
  selected_category: string;
  selected_answer_mode: string;
  search_query: string;
  total_attempts: number;
  avg_score: number;
  has_mock_test_access: boolean;
  has_lessons_access: boolean;
  mock_plan: { id: number; price: string } | null;
};

const CATEGORIES = [
  { value: 'all', label: 'Barchasi' },
  { value: 'certificate', label: 'Milliy Sertifikat' },
  { value: 'history', label: 'Tarix' },
  { value: 'bba', label: 'BBA' },
];

const CATEGORY_BADGE: Record<string, string> = {
  certificate: 'Rasmiy Format', history: 'Mavzulashtirilgan', bba: 'DTB Formati', all: 'Test',
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
  closed: { label: 'Yopiq test', className: 'border-sky-500/30 bg-sky-500/10 text-sky-300' },
  open: { label: 'Ochiq test', className: 'border-violet-500/30 bg-violet-500/10 text-violet-300' },
  mixed: { label: 'Aralash test', className: 'border-amber-500/30 bg-amber-500/10 text-amber-300' },
};

export default function TestsPage() {
  const router = useRouter();
  const { access } = useAuthStore();
  // `setStartError` faqat test boshlashdagi xatolar uchun; yuklash xatosi keshdan keladi.
  const [startError, setStartError] = useState<string | null>(null);
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
  const error = startError ?? loadError;

  // Server tanlangan fanni o'zi qaytaradi — birinchi javobdan keyin uni eslab qolamiz.
  useEffect(() => {
    if (data?.selected_subject) setSubject((prev) => prev ?? data.selected_subject);
  }, [data?.selected_subject]); // eslint-disable-line react-hooks/exhaustive-deps

  async function start(testId: number) {
    setStarting(testId);
    try {
      const res = await apiFetch<{ attempt_id: number }>(`/api/tests/${testId}/start/`, { method: 'POST' });
      router.push(`/tests/${res.attempt_id}`);
    } catch (e) {
      setStartError(e instanceof Error ? e.message : 'Xatolik yuz berdi');
      setStarting(null);
    }
  }

  async function startRandom() {
    setStarting(-1);
    try {
      const res = await apiFetch<{ attempt_id: number }>('/api/tests/start-random/', { method: 'POST' });
      router.push(`/tests/${res.attempt_id}`);
    } catch (e) {
      setStartError(e instanceof Error ? e.message : 'Xatolik yuz berdi');
      setStarting(null);
    }
  }

  return (
    <>
      <AppShell />
      <main className="page-shell flex-1 space-y-8 bg-[var(--bg-page)] p-4 pb-12 sm:p-6">
        <PageHero
          eyebrow="BBA & Milliy Sertifikat"
          eyebrowIcon={GraduationCap}
          title="Test va Imtihonlar Markazi"
          description="Davlat imtihonlariga moslashgan vaqt me'yori, baholash mezonlari va xatolar ustida ishlash tizimi."
          actions={
            <Button onClick={startRandom} disabled={starting !== null}>
              {starting === -1 ? <Loader2 className="size-4 animate-spin" /> : <Shuffle className="size-4" />}
              Tasodifiy test
            </Button>
          }
        />

        {error && (
          <Card className="border-[var(--danger)]/30">
            <CardContent className="pt-6 text-sm text-[var(--danger-text)]">{error}</CardContent>
          </Card>
        )}

        {/* "PRO" belgisi bor, lekin mock testlar yopiq bo'lgan holat: o'quvchi nima
            uchun qulf turganini va nimani sotib olish kerakligini bilishi shart. */}
        {data && data.has_lessons_access && !data.has_mock_test_access && (
          <Card className="border-amber-500/25 bg-amber-500/[0.06]">
            <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
              <div className="flex min-w-0 items-start gap-2.5">
                <Lock className="mt-0.5 size-4 shrink-0 text-[var(--warning-text)]" />
                <p className="min-w-0 text-sm text-[var(--text-secondary)]">
                  Sizda <strong className="text-foreground">darslar obunasi</strong> faol — video va
                  audio darslar ochiq. Rasmiy <strong className="text-foreground">mock testlar</strong> esa
                  har biri alohida sotib olinadi: kartadagi tugma o&apos;sha testni ochadi.
                </p>
              </div>
              <Button asChild size="sm" variant="outline" className="shrink-0 border-amber-500/30 text-[var(--warning-text)]">
                <Link href="/premium">Mock test tarifini ko&apos;rish <ArrowRight className="size-4" /></Link>
              </Button>
            </CardContent>
          </Card>
        )}

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
          <Tabs value={category} onValueChange={setCategory}>
            <TabsList>
              {CATEGORIES.map((c) => <TabsTrigger key={c.value} value={c.value}>{c.label}</TabsTrigger>)}
            </TabsList>
          </Tabs>

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

        {!data && !error && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-56 w-full" />)}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data?.tests.map((t, tIdx) => {
            // Mock test tarifi BITTA testni ochadi — shuning uchun qulf har bir karta
            // uchun alohida: `is_unlocked` serverdan shu o'quvchi bo'yicha keladi.
            const locked = t.is_premium && !t.is_unlocked;
            const buyHref = data.mock_plan
              ? `/premium/checkout/${data.mock_plan.id}?test=${t.id}`
              : '/premium';
            return (
              <Reveal key={t.id} index={tIdx} className="h-full">
              <Card className="group flex h-full flex-col justify-between transition-colors hover:border-[var(--accent-border)]">
                <CardContent className="flex flex-1 flex-col pt-6">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="outline" className="border-[var(--accent-border)] bg-primary/12 text-[var(--accent-text)]">
                        {CATEGORY_BADGE[t.category] || t.category}
                      </Badge>
                      {t.answer_mode && ANSWER_MODE_BADGE[t.answer_mode] && (
                        <Badge variant="outline" className={ANSWER_MODE_BADGE[t.answer_mode].className}>
                          {ANSWER_MODE_BADGE[t.answer_mode].label}
                        </Badge>
                      )}
                    </div>
                    <span className="flex items-center gap-1 font-mono text-xs text-muted-foreground">
                      <Clock className="size-3.5" /> {t.duration_minutes} daq
                    </span>
                  </div>

                  <h3 className="font-voice text-base font-bold leading-snug transition-colors group-hover:text-[var(--accent-text)]">
                    {t.title}
                  </h3>
                  <p className="mt-1.5 line-clamp-2 flex-1 text-xs leading-relaxed text-muted-foreground">{t.description}</p>

                  <Separator className="my-3" />

                  <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1 font-mono">
                      <HelpCircle className="size-3.5 text-[var(--accent-text)]" /> {t.questions_count} ta savol
                    </span>
                    {t.subject && <Badge variant="secondary">{t.subject}</Badge>}
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
