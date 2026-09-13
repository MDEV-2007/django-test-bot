'use client';

/* CEFR Multi-Level Imtihon Ekrani.
   3 ta asosiy bo'lim (Listening, Reading, Writing) markazi (Hub),
   bitta pagedagi uzluksiz Listening (orqaga qaytarish taqiqlangan audio),
   ikki ustunli (split-screen) Reading va qulay Writing studio. */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  AlertCircle, ArrowRight, BookOpen, CheckCircle2, ChevronLeft, ChevronRight,
  Clock, FileEdit, Headphones, LayoutGrid, Loader2, Sparkles, X,
} from 'lucide-react';
import { apiFetch, ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import {
  useIsTelegram, useTelegramBackButton, useTelegramClosingConfirmation,
} from '@/lib/telegram';
import type {
  AnnotationMap, CefrExam, CefrQuestion, CefrSection, CefrSkill, WritingReview,
} from '@/lib/cefr-types';
import { SKILL_LABEL } from '@/lib/cefr-types';
import AppShell from '@/components/AppShell';
import ExamAudio, { type PlayPermission } from '@/components/cefr/ExamAudio';
import ExamQuestion from '@/components/cefr/ExamQuestion';
import GapInput from '@/components/cefr/GapInput';
import PassageView from '@/components/cefr/PassageView';
import QuestionPalette from '@/components/cefr/QuestionPalette';
import WritingTask from '@/components/cefr/WritingTask';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const FONT_STEPS = [
  { key: 'sm', label: 'A-', rem: '0.9375rem' },
  { key: 'md', label: 'A', rem: '1.0625rem' },
  { key: 'lg', label: 'A+', rem: '1.25rem' },
] as const;
type FontKey = (typeof FONT_STEPS)[number]['key'];

type ExamViewMode = 'hub' | 'listening' | 'reading' | 'writing';

const TEXT_SAVE_DELAY = 600;

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return `${minutes.toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
}

export default function CefrExamPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const router = useRouter();
  const { access, authReady } = useAuthStore();

  const [exam, setExam] = useState<CefrExam | null>(null);
  const [error, setError] = useState<string | null>(null);

  // View rejim: 'hub' (3 ta card markazi) | 'listening' | 'reading' | 'writing'
  const [viewMode, setViewMode] = useState<ExamViewMode>('hub');
  // Tugallangan bo'limlar (Listening, Reading, Writing)
  const [completedSkills, setCompletedSkills] = useState<Set<CefrSkill>>(new Set());

  // Reading uchun tanlangan part indeksi (0..N)
  const [readingPartIndex, setReadingPartIndex] = useState(0);
  // Writing uchun tanlangan part indeksi
  const [writingPartIndex, setWritingPartIndex] = useState(0);

  const [activeQuestionId, setActiveQuestionId] = useState<number | null>(null);
  const [flagged, setFlagged] = useState<Set<number>>(new Set());
  const [annotations, setAnnotations] = useState<AnnotationMap>({});
  const [fontKey, setFontKey] = useState<FontKey>('md');
  const [showPalette, setShowPalette] = useState(false);
  const [showExit, setShowExit] = useState(false);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [timeUp, setTimeUp] = useState(false);

  const saveTimers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const annotationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useTelegramClosingConfirmation(true);
  useTelegramBackButton(() => {
    if (viewMode !== 'hub') {
      setViewMode('hub');
    } else {
      setShowExit(true);
    }
  });

  // Zen rejimi: imtihon davomida ortiqcha elementlar yashiriladi.
  useEffect(() => {
    document.documentElement.dataset.zen = 'on';
    return () => { delete document.documentElement.dataset.zen; };
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('ilm_reading_size') as FontKey | null;
    if (saved && FONT_STEPS.some((step) => step.key === saved)) setFontKey(saved);
  }, []);

  useEffect(() => {
    const step = FONT_STEPS.find((s) => s.key === fontKey) ?? FONT_STEPS[1];
    document.documentElement.style.setProperty('--reading-size', step.rem);
    localStorage.setItem('ilm_reading_size', fontKey);
    return () => { document.documentElement.style.removeProperty('--reading-size'); };
  }, [fontKey]);

  // Belgilangan savollar (flag)
  useEffect(() => {
    const raw = localStorage.getItem(`ilm_flags_${attemptId}`);
    if (raw) setFlagged(new Set(JSON.parse(raw) as number[]));
  }, [attemptId]);

  useEffect(() => {
    localStorage.setItem(`ilm_flags_${attemptId}`, JSON.stringify([...flagged]));
  }, [attemptId, flagged]);

  // Tugallangan bo'limlarni saqlash va yuklash
  useEffect(() => {
    const saved = localStorage.getItem(`ilm_completed_skills_${attemptId}`);
    if (saved) {
      try {
        setCompletedSkills(new Set(JSON.parse(saved) as CefrSkill[]));
      } catch {
        // ignore
      }
    }
  }, [attemptId]);

  const markSkillCompleted = useCallback((skill: CefrSkill) => {
    setCompletedSkills((prev) => {
      const next = new Set(prev).add(skill);
      localStorage.setItem(`ilm_completed_skills_${attemptId}`, JSON.stringify([...next]));
      return next;
    });
  }, [attemptId]);

  useEffect(() => {
    if (authReady && !access) {
      router.replace(`/login?next=${encodeURIComponent(`/tests/${attemptId}/exam`)}`);
      return;
    }
    if (!access) return;
    apiFetch<CefrExam>(`/api/tests/attempts/${attemptId}/exam/`)
      .then((data) => {
        setExam(data);
        setAnnotations(data.annotations ?? {});
        if (data.is_completed) router.replace(`/tests/${attemptId}/feedback`);
      })
      .catch((e: unknown) => {
        if (e instanceof ApiError && e.status === 409) { router.push(`/tests/${attemptId}/feedback`); return; }
        setError(e instanceof Error ? e.message : 'Xatolik');
      });
  }, [authReady, access, attemptId, router]);

  // Taymer
  useEffect(() => {
    if (!exam) return;
    const timer = setInterval(() => {
      setExam((prev) => (prev && prev.seconds_left > 0 ? { ...prev, seconds_left: prev.seconds_left - 1 } : prev));
    }, 1000);
    return () => clearInterval(timer);
  }, [exam?.attempt_id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Vaqt tugaganda
  useEffect(() => {
    if (!exam || exam.is_completed || exam.seconds_left > 0 || finishing) return;
    setTimeUp(true);
    void finish();
  }, [exam?.seconds_left]); // eslint-disable-line react-hooks/exhaustive-deps

  const sections = exam?.sections ?? [];

  const listeningSections = useMemo(() => sections.filter((s) => s.skill === 'listening'), [sections]);
  const readingSections = useMemo(() => sections.filter((s) => s.skill === 'reading'), [sections]);
  const writingSections = useMemo(() => sections.filter((s) => s.skill === 'writing'), [sections]);

  const questionsById = useMemo(() => {
    const map = new Map<number, CefrQuestion>();
    for (const s of sections) for (const q of s.questions) map.set(q.id, q);
    return map;
  }, [sections]);

  const totals = useMemo(() => {
    const all = [...questionsById.values()];
    return { total: all.length, answered: all.filter((q) => q.answered).length };
  }, [questionsById]);

  // Har bir ko'nikma bo'yicha statistika
  const skillStats = useMemo(() => {
    const calc = (list: CefrSection[]) => {
      const qs = list.flatMap((s) => s.questions);
      return { total: qs.length, answered: qs.filter((q) => q.answered).length };
    };
    return {
      listening: calc(listeningSections),
      reading: calc(readingSections),
      writing: calc(writingSections),
    };
  }, [listeningSections, readingSections, writingSections]);

  // Javobni serverga yuborish
  const sendAnswer = useCallback(async (questionId: number, payload: Record<string, unknown>) => {
    setSaving(true);
    try {
      await apiFetch(`/api/tests/attempts/${attemptId}/exam/answer/`, {
        method: 'POST',
        body: JSON.stringify({ question_id: questionId, ...payload }),
      });
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        setTimeUp(true);
        router.push(`/tests/${attemptId}/feedback`);
        return;
      }
      setError("Javob saqlanmadi — internetni tekshiring. Yozganingiz ekranda saqlanib turibdi.");
    } finally {
      setSaving(false);
    }
  }, [attemptId, router]);

  const answer = useCallback((question: CefrQuestion, payload: Record<string, unknown>) => {
    const isText = 'text_answer' in payload;

    setExam((prev) => {
      if (!prev) return prev;
      const patch = (q: CefrQuestion): CefrQuestion => {
        if (q.id !== question.id) return q;
        const next = { ...q, ...payload } as CefrQuestion;
        next.answered = isText
          ? String(payload.text_answer ?? '').trim().length > 0
          : Boolean(payload.choice_id ?? payload.group_option_id ?? payload.matches);
        return next;
      };
      return {
        ...prev,
        sections: prev.sections.map((s) => ({ ...s, questions: s.questions.map(patch) })),
        loose_questions: prev.loose_questions.map(patch),
      };
    });

    if (!isText) { void sendAnswer(question.id, payload); return; }

    const timers = saveTimers.current;
    const pending = timers.get(question.id);
    if (pending) clearTimeout(pending);
    timers.set(question.id, setTimeout(() => {
      timers.delete(question.id);
      void sendAnswer(question.id, payload);
    }, TEXT_SAVE_DELAY));
  }, [sendAnswer]);

  const saveAnnotations = useCallback((next: AnnotationMap) => {
    setAnnotations(next);
    if (annotationTimer.current) clearTimeout(annotationTimer.current);
    annotationTimer.current = setTimeout(() => {
      void apiFetch(`/api/tests/attempts/${attemptId}/annotations/`, {
        method: 'POST',
        body: JSON.stringify({ annotations: next }),
      }).catch(() => {});
    }, 900);
  }, [attemptId]);

  async function requestAudioPlay(sectionId: number): Promise<PlayPermission> {
    try {
      return await apiFetch<PlayPermission>(`/api/tests/attempts/${attemptId}/exam/audio-play/`, {
        method: 'POST',
        body: JSON.stringify({ section_id: sectionId }),
      });
    } catch (e) {
      if (e instanceof ApiError) {
        const body = e.payload as { message?: string; used?: number };
        return { allowed: false, left: 0, used: body?.used, message: body?.message };
      }
      throw e;
    }
  }

  async function reviewWriting(questionId: number): Promise<WritingReview> {
    try {
      return await apiFetch<WritingReview>(`/api/tests/attempts/${attemptId}/writing-review/`, {
        method: 'POST',
        body: JSON.stringify({ question_id: questionId }),
      });
    } catch (e) {
      if (e instanceof ApiError) {
        const message = (e.payload as { message?: string } | undefined)?.message;
        throw new Error(message ?? 'Tekshirib bo\'lmadi.');
      }
      throw e;
    }
  }

  async function finish() {
    setFinishing(true);
    try {
      await apiFetch(`/api/tests/attempts/${attemptId}/finish/`, { method: 'POST', body: '{}' });
      router.push(`/tests/${attemptId}/feedback`);
    } catch {
      setFinishing(false);
      setError('Testni yakunlab bo\'lmadi. Qaytadan urinib ko\'ring.');
    }
  }

  // Savolga sakrash
  function jump(targetSectionId: number, questionId: number) {
    const sec = sections.find((s) => s.id === targetSectionId);
    if (sec) {
      if (sec.skill === 'listening') {
        setViewMode('listening');
      } else if (sec.skill === 'reading') {
        const idx = readingSections.findIndex((s) => s.id === targetSectionId);
        setReadingPartIndex(Math.max(0, idx));
        setViewMode('reading');
      } else if (sec.skill === 'writing') {
        const idx = writingSections.findIndex((s) => s.id === targetSectionId);
        setWritingPartIndex(Math.max(0, idx));
        setViewMode('writing');
      }
    }
    setActiveQuestionId(questionId);
    setShowPalette(false);
    requestAnimationFrame(() => {
      document.getElementById(`q-${questionId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  // Listening partlaridagi umumiy audio manbasi
  const listeningAudioSrc = useMemo(() => {
    return exam?.test.listening_audio || listeningSections.find((s) => s.audio)?.audio || '';
  }, [exam, listeningSections]);

  const firstListeningSectionId = listeningSections[0]?.id ?? 0;

  if (error && !exam) {
    return (
      <>
        <AppShell />
        <div className="mx-auto max-w-md p-6 text-center">
          <AlertCircle className="mx-auto mb-3 h-8 w-8 text-rose-400" />
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button className="mt-4" onClick={() => router.push('/tests')}>Testlarga qaytish</Button>
        </div>
      </>
    );
  }

  if (!exam) {
    return (
      <>
        <AppShell />
        <div className="mx-auto max-w-5xl space-y-4 p-4">
          <Skeleton className="h-14 w-full rounded-2xl" />
          <div className="grid gap-4 lg:grid-cols-3">
            <Skeleton className="h-[50vh] rounded-2xl" />
            <Skeleton className="h-[50vh] rounded-2xl" />
            <Skeleton className="h-[50vh] rounded-2xl" />
          </div>
        </div>
      </>
    );
  }

  const currentReadingSection = readingSections[readingPartIndex] || readingSections[0];
  const currentWritingSection = writingSections[writingPartIndex] || writingSections[0];

  return (
    <>
      <AppShell />
      <main className="mx-auto w-full max-w-[1440px] flex-1 px-3 pb-24 pt-3 sm:px-6">
        
        {/* =========================================================
            TOP HEADER BAR (Timer, Mode Switch, Palette, Submit)
            ========================================================= */}
        <header className="sticky top-0 z-30 -mx-3 mb-5 border-b border-[var(--border-card)] bg-[var(--surface-base)]/90 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            
            {/* Left: Exit or Back to Hub */}
            <div className="flex items-center gap-2">
              {viewMode !== 'hub' ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewMode('hub')}
                  className="rounded-xl font-semibold gap-1.5 border-[var(--border-card)] text-muted-foreground hover:text-foreground"
                >
                  <ChevronLeft className="size-4" />
                  <span className="hidden sm:inline">Bo&apos;limlar markazi (Hub)</span>
                  <span className="sm:hidden">Hub</span>
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowExit(true)}
                  aria-label="Chiqish"
                  className="rounded-xl text-muted-foreground hover:text-foreground"
                >
                  <X className="size-5" />
                </Button>
              )}

              <div className="min-w-0">
                <div className="truncate text-sm sm:text-base font-bold text-foreground">
                  {exam.test.title}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Jami: <strong className="text-foreground">{totals.answered} / {totals.total}</strong> savol belgilandi
                </div>
              </div>
            </div>

            {/* Right: Timer, Questions button, Finish Button */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Countdown Timer */}
              <div className={cn(
                'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs sm:text-sm font-black font-mono tracking-wider',
                exam.seconds_left <= 300
                  ? 'bg-rose-500/20 text-rose-500 animate-pulse border border-rose-500/40'
                  : 'bg-[var(--surface-card-medium)] border border-[var(--border-card)] text-foreground',
              )}>
                <Clock className="size-3.5 sm:size-4" />
                {formatTime(exam.seconds_left)}
              </div>

              {/* Font size picker (Reading rejimida) */}
              {viewMode === 'reading' && (
                <div className="hidden sm:flex items-center rounded-xl border border-[var(--border-card)] bg-[var(--surface-card-medium)] p-0.5">
                  {FONT_STEPS.map((step) => (
                    <button
                      key={step.key}
                      type="button"
                      onClick={() => setFontKey(step.key)}
                      className={cn(
                        'h-7 w-8 rounded-lg text-xs font-bold transition',
                        fontKey === step.key
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {step.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Question Palette Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPalette(true)}
                className="gap-1.5 rounded-xl border-[var(--border-card)] text-xs font-semibold"
              >
                <LayoutGrid className="size-4" />
                <span className="hidden md:inline">Savollar</span>
              </Button>

              {/* Imtihonni Yakunlash Button */}
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setShowFinishConfirm(true)}
                className="rounded-xl font-bold text-xs shadow-md bg-rose-600 hover:bg-rose-700 text-white"
              >
                Tugatish
              </Button>
            </div>
          </div>
        </header>

        {timeUp && (
          <div className="mb-4 flex items-start gap-2.5 rounded-2xl border border-rose-500/40 bg-rose-500/15 p-4 text-sm text-rose-200">
            <Clock className="size-5 shrink-0 text-rose-400 mt-0.5" />
            <span>Test vaqti tugadi — javoblaringiz saqlandi, natijangiz hisoblanmoqda...</span>
          </div>
        )}

        {error && (
          <div className="mb-4 flex items-start gap-2.5 rounded-2xl border border-amber-500/40 bg-amber-500/15 p-4 text-sm text-amber-200">
            <AlertCircle className="size-5 shrink-0 text-amber-400 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* =========================================================
            1. HUB MODE: 3 TA CARD (LISTENING, READING, WRITING)
            ========================================================= */}
        {viewMode === 'hub' && (
          <div className="space-y-6 max-w-5xl mx-auto py-2">
            
            {/* Hub Banner */}
            <div className="rounded-3xl border border-[var(--border-card)] bg-gradient-to-br from-indigo-500/10 via-[var(--surface-card)] to-purple-500/5 p-6 sm:p-8 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <Badge className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-bold px-3 py-1">
                    CEFR MULTI-LEVEL MOCK
                  </Badge>
                  <h1 className="text-xl sm:text-2xl font-black text-foreground">
                    Imtihon Bo&apos;limlari (3 Skills)
                  </h1>
                  <p className="text-xs sm:text-sm text-muted-foreground max-w-xl">
                    Imtihon 3 ta mustaqil ko&apos;nikma bo&apos;yicha topshiriladi. Har bir bo&apos;limga kirib, vazifalarni bajaring va yakunlang.
                  </p>
                </div>

                <div className="flex items-center gap-3 bg-[var(--surface-card-medium)] border border-[var(--border-card)] rounded-2xl p-3.5 shrink-0">
                  <div className="text-right">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold block">Umumiy progress</span>
                    <span className="text-lg font-black text-foreground">
                      {totals.answered} <span className="text-xs text-muted-foreground">/ {totals.total} ta</span>
                    </span>
                  </div>
                  <div className="size-10 rounded-full border-2 border-indigo-500/40 flex items-center justify-center font-bold text-xs text-indigo-400">
                    {Math.round((totals.answered / Math.max(1, totals.total)) * 100)}%
                  </div>
                </div>
              </div>
            </div>

            {/* 3 ta Katta Card (L, R, W) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
              
              {/* CARD 1: LISTENING (L) */}
              <Card className={cn(
                'group relative rounded-3xl border transition-all duration-300 overflow-hidden flex flex-col',
                completedSkills.has('listening')
                  ? 'border-emerald-500/40 bg-emerald-500/5 hover:border-emerald-500/60 shadow-lg'
                  : 'border-violet-500/30 bg-[var(--surface-card-medium)] hover:border-violet-500/60 hover:shadow-xl hover:-translate-y-1'
              )}>
                <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex size-12 items-center justify-center rounded-2xl bg-violet-500/20 text-violet-400">
                        <Headphones className="size-6" />
                      </div>
                      {completedSkills.has('listening') ? (
                        <Badge className="bg-emerald-500 text-white font-bold text-xs gap-1">
                          <CheckCircle2 className="size-3.5" /> Tugallandi
                        </Badge>
                      ) : skillStats.listening.answered > 0 ? (
                        <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-400 font-bold text-xs">
                          Davom etmoqda
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-[var(--border-card)] text-muted-foreground font-bold text-xs">
                          Boshlanmagan
                        </Badge>
                      )}
                    </div>

                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider text-violet-400">Skill 1</div>
                      <h3 className="text-lg font-black text-foreground group-hover:text-violet-400 transition-colors">
                        Listening (Tinglab tushunish)
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        6 ta qism, 35 ta savol. Audio asosida monolog, suhbatlar va xaritani belgilash.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
                      <span>Javoblar:</span>
                      <strong className="text-foreground">{skillStats.listening.answered} / {skillStats.listening.total} ta</strong>
                    </div>

                    <div className="h-1.5 w-full bg-[var(--surface-hover)] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-violet-500 rounded-full transition-all duration-300"
                        style={{ width: `${(skillStats.listening.answered / Math.max(1, skillStats.listening.total)) * 100}%` }}
                      />
                    </div>

                    <Button
                      onClick={() => setViewMode('listening')}
                      className={cn(
                        'w-full rounded-2xl font-bold h-12 shadow-md transition-all gap-2',
                        completedSkills.has('listening')
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          : 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white'
                      )}
                    >
                      {completedSkills.has('listening')
                        ? "Ko'rish / Tahrirlash"
                        : skillStats.listening.answered > 0
                          ? 'Davom ettirish 🚀'
                          : 'Listeningni boshlash 🚀'}
                      <ArrowRight className="size-4" />
                    </Button>
                  </div>
                </div>
              </Card>

              {/* CARD 2: READING (R) */}
              <Card className={cn(
                'group relative rounded-3xl border transition-all duration-300 overflow-hidden flex flex-col',
                completedSkills.has('reading')
                  ? 'border-emerald-500/40 bg-emerald-500/5 hover:border-emerald-500/60 shadow-lg'
                  : 'border-blue-500/30 bg-[var(--surface-card-medium)] hover:border-blue-500/60 hover:shadow-xl hover:-translate-y-1'
              )}>
                <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex size-12 items-center justify-center rounded-2xl bg-blue-500/20 text-blue-400">
                        <BookOpen className="size-6" />
                      </div>
                      {completedSkills.has('reading') ? (
                        <Badge className="bg-emerald-500 text-white font-bold text-xs gap-1">
                          <CheckCircle2 className="size-3.5" /> Tugallandi
                        </Badge>
                      ) : skillStats.reading.answered > 0 ? (
                        <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-400 font-bold text-xs">
                          Davom etmoqda
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-[var(--border-card)] text-muted-foreground font-bold text-xs">
                          Boshlanmagan
                        </Badge>
                      )}
                    </div>

                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider text-blue-400">Skill 2</div>
                      <h3 className="text-lg font-black text-foreground group-hover:text-blue-400 transition-colors">
                        Reading (O&apos;qish)
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        5 ta qism, 35 ta savol. Split-screen: chapda matn, o&apos;ngda savollar va bo&apos;shliqlar.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
                      <span>Javoblar:</span>
                      <strong className="text-foreground">{skillStats.reading.answered} / {skillStats.reading.total} ta</strong>
                    </div>

                    <div className="h-1.5 w-full bg-[var(--surface-hover)] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all duration-300"
                        style={{ width: `${(skillStats.reading.answered / Math.max(1, skillStats.reading.total)) * 100}%` }}
                      />
                    </div>

                    <Button
                      onClick={() => setViewMode('reading')}
                      className={cn(
                        'w-full rounded-2xl font-bold h-12 shadow-md transition-all gap-2',
                        completedSkills.has('reading')
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          : 'bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 text-white'
                      )}
                    >
                      {completedSkills.has('reading')
                        ? "Ko'rish / Tahrirlash"
                        : skillStats.reading.answered > 0
                          ? 'Davom ettirish 🚀'
                          : 'Readingni boshlash 🚀'}
                      <ArrowRight className="size-4" />
                    </Button>
                  </div>
                </div>
              </Card>

              {/* CARD 3: WRITING (W) */}
              <Card className={cn(
                'group relative rounded-3xl border transition-all duration-300 overflow-hidden flex flex-col',
                completedSkills.has('writing')
                  ? 'border-emerald-500/40 bg-emerald-500/5 hover:border-emerald-500/60 shadow-lg'
                  : 'border-amber-500/30 bg-[var(--surface-card-medium)] hover:border-amber-500/60 hover:shadow-xl hover:-translate-y-1'
              )}>
                <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex size-12 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400">
                        <FileEdit className="size-6" />
                      </div>
                      {completedSkills.has('writing') ? (
                        <Badge className="bg-emerald-500 text-white font-bold text-xs gap-1">
                          <CheckCircle2 className="size-3.5" /> Tugallandi
                        </Badge>
                      ) : skillStats.writing.answered > 0 ? (
                        <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-400 font-bold text-xs">
                          Davom etmoqda
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-[var(--border-card)] text-muted-foreground font-bold text-xs">
                          Boshlanmagan
                        </Badge>
                      )}
                    </div>

                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider text-amber-400">Skill 3</div>
                      <h3 className="text-lg font-black text-foreground group-hover:text-amber-400 transition-colors">
                        Writing (Yozma ish)
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        Task 1.1 (xat), Task 1.2 (rasmiy xat), Task 2 (insho). Jonli so&apos;z sanagich bilan.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
                      <span>Topshiriqlar:</span>
                      <strong className="text-foreground">{skillStats.writing.answered} / {skillStats.writing.total} ta</strong>
                    </div>

                    <div className="h-1.5 w-full bg-[var(--surface-hover)] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full transition-all duration-300"
                        style={{ width: `${(skillStats.writing.answered / Math.max(1, skillStats.writing.total)) * 100}%` }}
                      />
                    </div>

                    <Button
                      onClick={() => setViewMode('writing')}
                      className={cn(
                        'w-full rounded-2xl font-bold h-12 shadow-md transition-all gap-2',
                        completedSkills.has('writing')
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          : 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white'
                      )}
                    >
                      {completedSkills.has('writing')
                        ? "Ko'rish / Tahrirlash"
                        : skillStats.writing.answered > 0
                          ? 'Davom ettirish 🚀'
                          : 'Writingni boshlash 🚀'}
                      <ArrowRight className="size-4" />
                    </Button>
                  </div>
                </div>
              </Card>

            </div>

            {/* Yakuniy Topshirish Kartasi */}
            <div className="rounded-3xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-transparent p-6 sm:p-7 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1 text-center sm:text-left">
                <h4 className="text-base sm:text-lg font-black text-foreground">
                  Imtihonni topshirishga tayyormisiz?
                </h4>
                <p className="text-xs text-muted-foreground">
                  Barcha savollar bo&apos;yicha javoblaringiz serverga saqlangan. Tugatish tugmasini bosgach, test yakunlanadi va to&apos;liq tahlil beriladi.
                </p>
              </div>

              <Button
                size="lg"
                onClick={() => setShowFinishConfirm(true)}
                className="w-full sm:w-auto rounded-2xl font-black text-sm sm:text-base px-8 h-13 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-xl shadow-emerald-600/25 shrink-0"
              >
                Imtihonni yakunlash 🏁
              </Button>
            </div>

          </div>
        )}

        {/* =========================================================
            2. LISTENING MODE: HAMMA SAVOLLAR BITTA PAGEDA + TOP AUDIO
            ========================================================= */}
        {viewMode === 'listening' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            
            {/* Top Navigation & Status */}
            <div className="flex items-center justify-between gap-3 bg-[var(--surface-card-medium)] border border-[var(--border-card)] rounded-2xl p-4 shadow-sm">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('hub')}
                className="rounded-xl font-bold gap-1 text-xs"
              >
                <ChevronLeft className="size-4" /> Bo&apos;limlar (Hub)
              </Button>

              <div className="text-center">
                <span className="text-xs sm:text-sm font-black text-foreground block">
                  Listening (Tinglab tushunish)
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {skillStats.listening.answered} / {skillStats.listening.total} savol belgilandi
                </span>
              </div>

              <Button
                size="sm"
                onClick={() => {
                  markSkillCompleted('listening');
                  setViewMode('hub');
                }}
                className="rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-md gap-1"
              >
                <CheckCircle2 className="size-4" />
                <span className="hidden sm:inline">Listeningni yakunlash</span>
                <span className="sm:hidden">Yakunlash</span>
              </Button>
            </div>

            {/* Sticky Audio Player (Strict Forward, No Rewind) */}
            <div className="sticky top-18 z-20 rounded-2xl border border-violet-500/40 bg-[var(--surface-base)]/95 backdrop-blur-md p-4 shadow-xl space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold flex items-center gap-1.5 text-violet-400">
                  <Headphones className="size-4" /> CEFR Listening Audio Trek
                </span>
                <span className="text-[11px] font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-md">
                  Qaytarish mumkin emas (No rewind)
                </span>
              </div>

              {listeningAudioSrc ? (
                <ExamAudio
                  src={listeningAudioSrc}
                  playLimit={1}
                  playsUsed={exam.audio_plays?.[String(firstListeningSectionId)] ?? 0}
                  onRequestPlay={() => requestAudioPlay(firstListeningSectionId)}
                />
              ) : (
                <div className="rounded-xl border border-dashed border-[var(--border-card)] p-3 text-center text-xs text-muted-foreground">
                  Audio trek kutilmoqda (Admin tomonidan yuklanadi). Quyidagi savollarni ko&apos;rib chiqishingiz mumkin.
                </div>
              )}
            </div>

            {/* Quick Part Anchor Bar */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {listeningSections.map((sec) => (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => {
                    document.getElementById(`sec-${sec.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className="shrink-0 rounded-xl border border-[var(--border-card)] bg-[var(--surface-card-medium)] px-3 py-1.5 text-xs font-bold hover:border-violet-500/50 transition-all text-muted-foreground hover:text-foreground"
                >
                  Part {sec.part_number}
                  <span className="ml-1.5 text-[10px] text-violet-400">
                    ({sec.questions.filter((q) => q.answered).length}/{sec.questions.length})
                  </span>
                </button>
              ))}
            </div>

            {/* Continuous List of All 6 Parts */}
            <div className="space-y-8">
              {listeningSections.map((sec) => {
                const inlineGapNumbers = new Set(
                  [...(sec.passage.matchAll(/\{\{(\d+)\}\}/g))].map((m) => Number(m[1])),
                );
                const sideQuestions = sec.questions.filter(
                  (q) => !(q.type === 'gap_fill' && q.exam_number !== null && inlineGapNumbers.has(q.exam_number)),
                );

                const gapForSec = (number: number) => {
                  const question = sec.questions.find((q) => q.exam_number === number);
                  if (!question) return null;
                  return (
                    <GapInput
                      number={number}
                      value={question.text_answer ?? ''}
                      maxWords={question.max_words}
                      active={activeQuestionId === question.id}
                      onChange={(value) => answer(question, { text_answer: value })}
                      onFocus={() => setActiveQuestionId(question.id)}
                    />
                  );
                };

                return (
                  <div
                    key={sec.id}
                    id={`sec-${sec.id}`}
                    className="rounded-3xl border border-[var(--border-card)] bg-[var(--surface-card-medium)] p-5 sm:p-7 space-y-5 shadow-lg scroll-mt-36"
                  >
                    {/* Part Header */}
                    <div className="border-b border-[var(--border-card)] pb-4">
                      <div className="flex items-center justify-between gap-2">
                        <Badge className="bg-violet-500/20 text-violet-300 font-bold text-xs px-2.5 py-0.5">
                          PART {sec.part_number}
                        </Badge>
                        <span className="text-xs text-muted-foreground font-semibold">
                          {sec.questions.length} ta savol
                        </span>
                      </div>
                      {sec.title && (
                        <h3 className="text-base sm:text-lg font-black text-foreground mt-2">
                          {sec.title}
                        </h3>
                      )}
                      {sec.instruction && (
                        <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 leading-relaxed bg-[var(--surface-hover)]/50 p-3 rounded-xl border border-[var(--border-card)]">
                          {sec.instruction}
                        </p>
                      )}
                    </div>

                    {/* Image / Map / Diagram if any */}
                    {sec.image && (
                      <div className="rounded-2xl border border-[var(--border-card)] overflow-hidden bg-[var(--surface-hover)] p-2">
                        <img src={sec.image} alt={sec.title || "Xarita"} className="w-full h-auto rounded-xl object-contain max-h-[450px]" />
                      </div>
                    )}

                    {/* Passage with inline gaps if any */}
                    {sec.passage && (
                      <div className="rounded-2xl border border-[var(--border-card)] bg-[var(--surface-hover)]/30 p-4 sm:p-5">
                        <PassageView
                          html={sec.passage}
                          annotations={annotations[String(sec.id)] ?? []}
                          onAnnotationsChange={(next) => saveAnnotations({ ...annotations, [String(sec.id)]: next })}
                          renderGap={gapForSec}
                        />
                      </div>
                    )}

                    {/* Questions of this part */}
                    {sideQuestions.length > 0 && (
                      <div className="space-y-4 pt-2">
                        {sideQuestions.map((q) => (
                          <div key={q.id} id={`q-${q.id}`}>
                            <ExamQuestion
                              question={q}
                              group={sec.groups.find((g) => g.id === q.group_id)}
                              flagged={flagged.has(q.id)}
                              onToggleFlag={() => {
                                setFlagged((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(q.id)) next.delete(q.id);
                                  else next.add(q.id);
                                  return next;
                                });
                              }}
                              onAnswer={(payload) => answer(q, payload)}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Bottom Action: Yakunlash va Reading'ga o'tish */}
            <div className="rounded-3xl border border-violet-500/30 bg-gradient-to-r from-violet-500/10 via-[var(--surface-card-medium)] to-indigo-500/10 p-6 text-center space-y-3">
              <h4 className="text-base font-bold text-foreground">
                Listening bo&apos;limi bo&apos;yicha barcha savollarga javob berdingizmi?
              </h4>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Tugallangach, avtomatik ravishda Bo&apos;limlar markaziga qaytib, keyingi Reading bosqichiga o&apos;tasiz.
              </p>
              <Button
                size="lg"
                onClick={() => {
                  markSkillCompleted('listening');
                  setViewMode('hub');
                }}
                className="rounded-2xl font-black text-sm sm:text-base px-8 h-13 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-xl gap-2"
              >
                Listeningni yakunlash va Hub&apos;ga qaytish <ArrowRight className="size-5" />
              </Button>
            </div>

          </div>
        )}

        {/* =========================================================
            3. READING MODE: SPLIT-SCREEN (CHAPDA MATN, O'NGDA SAVOLLAR)
            ========================================================= */}
        {viewMode === 'reading' && currentReadingSection && (
          <div className="space-y-4">
            
            {/* Reading Part Navigation Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-[var(--surface-card-medium)] border border-[var(--border-card)] rounded-2xl p-3 sm:p-4 shadow-sm">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('hub')}
                className="rounded-xl font-bold gap-1 text-xs"
              >
                <ChevronLeft className="size-4" /> Bo&apos;limlar (Hub)
              </Button>

              {/* Part selector pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto">
                {readingSections.map((sec, idx) => (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => {
                      setReadingPartIndex(idx);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className={cn(
                      'shrink-0 rounded-xl px-3 py-1.5 text-xs font-bold transition-all',
                      idx === readingPartIndex
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'border border-[var(--border-card)] bg-[var(--surface-hover)]/50 text-muted-foreground hover:text-foreground'
                    )}
                  >
                    Part {sec.part_number}
                    <span className="ml-1 text-[10px] opacity-80">
                      ({sec.questions.filter((q) => q.answered).length}/{sec.questions.length})
                    </span>
                  </button>
                ))}
              </div>

              <Button
                size="sm"
                onClick={() => {
                  markSkillCompleted('reading');
                  setViewMode('hub');
                }}
                className="rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-md gap-1"
              >
                <CheckCircle2 className="size-4" />
                <span className="hidden sm:inline">Readingni yakunlash</span>
                <span className="sm:hidden">Yakunlash</span>
              </Button>
            </div>

            {/* Instruction if any */}
            {currentReadingSection.instruction && (
              <div className="rounded-2xl border border-[var(--border-card)] bg-[var(--surface-card-medium)] p-3.5 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {currentReadingSection.instruction}
              </div>
            )}

            {/* Two-Column Split Screen: Left = Passage, Right = Questions */}
            {(() => {
              const sec = currentReadingSection;
              const inlineGapNumbers = new Set(
                [...(sec.passage.matchAll(/\{\{(\d+)\}\}/g))].map((m) => Number(m[1])),
              );
              const sideQuestions = sec.questions.filter(
                (q) => !(q.type === 'gap_fill' && q.exam_number !== null && inlineGapNumbers.has(q.exam_number)),
              );

              const gapForReading = (number: number) => {
                const question = sec.questions.find((q) => q.exam_number === number);
                if (!question) return null;
                return (
                  <GapInput
                    number={number}
                    value={question.text_answer ?? ''}
                    maxWords={question.max_words}
                    active={activeQuestionId === question.id}
                    onChange={(value) => answer(question, { text_answer: value })}
                    onFocus={() => setActiveQuestionId(question.id)}
                  />
                );
              };

              const hasPassage = Boolean(sec.passage || sec.image);
              const hasSide = sideQuestions.length > 0 || sec.groups.length > 0;

              return (
                <div className={cn('grid gap-6', hasPassage && hasSide ? 'lg:grid-cols-2' : 'max-w-3xl mx-auto')}>
                  
                  {/* Left Column: Passage */}
                  {hasPassage && (
                    <div className="rounded-3xl border border-[var(--border-card)] bg-[var(--surface-card-medium)] p-5 sm:p-6 lg:sticky lg:top-24 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto space-y-4 shadow-sm">
                      {sec.title && (
                        <h2 className="text-lg sm:text-xl font-black text-foreground border-b border-[var(--border-card)] pb-3">
                          {sec.title}
                        </h2>
                      )}

                      {sec.image && (
                        <img src={sec.image} alt="" className="w-full rounded-2xl border border-[var(--border-card)]" />
                      )}

                      {sec.passage && (
                        <PassageView
                          html={sec.passage}
                          annotations={annotations[String(sec.id)] ?? []}
                          onAnnotationsChange={(next) => saveAnnotations({ ...annotations, [String(sec.id)]: next })}
                          renderGap={gapForReading}
                        />
                      )}
                    </div>
                  )}

                  {/* Right Column: Questions */}
                  {hasSide && (
                    <div className="space-y-5">
                      {sideQuestions.map((q) => (
                        <div key={q.id} id={`q-${q.id}`}>
                          <ExamQuestion
                            question={q}
                            group={sec.groups.find((g) => g.id === q.group_id)}
                            flagged={flagged.has(q.id)}
                            onToggleFlag={() => {
                              setFlagged((prev) => {
                                const next = new Set(prev);
                                if (next.has(q.id)) next.delete(q.id);
                                else next.add(q.id);
                                return next;
                              });
                            }}
                            onAnswer={(payload) => answer(q, payload)}
                          />
                        </div>
                      ))}

                      {/* Part Switcher & End Button */}
                      <div className="flex items-center justify-between pt-4">
                        <Button
                          variant="outline"
                          disabled={readingPartIndex === 0}
                          onClick={() => {
                            setReadingPartIndex((prev) => Math.max(0, prev - 1));
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="rounded-xl font-bold"
                        >
                          <ChevronLeft className="size-4 mr-1" /> Oldingi part
                        </Button>

                        {readingPartIndex < readingSections.length - 1 ? (
                          <Button
                            onClick={() => {
                              setReadingPartIndex((prev) => prev + 1);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            Keyingi part <ChevronRight className="size-4 ml-1" />
                          </Button>
                        ) : (
                          <Button
                            onClick={() => {
                              markSkillCompleted('reading');
                              setViewMode('hub');
                            }}
                            className="rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            Readingni yakunlash <CheckCircle2 className="size-4 ml-1" />
                          </Button>
                        )}
                      </div>
                    </div>
                  )}

                </div>
              );
            })()}

          </div>
        )}

        {/* =========================================================
            4. WRITING MODE: STUDIO (TASK 1.1, 1.2, TASK 2)
            ========================================================= */}
        {viewMode === 'writing' && currentWritingSection && (
          <div className="space-y-5 max-w-4xl mx-auto">
            
            {/* Writing Navigation Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-[var(--surface-card-medium)] border border-[var(--border-card)] rounded-2xl p-4 shadow-sm">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('hub')}
                className="rounded-xl font-bold gap-1 text-xs"
              >
                <ChevronLeft className="size-4" /> Bo&apos;limlar (Hub)
              </Button>

              {/* Task Tabs */}
              <div className="flex items-center gap-2 overflow-x-auto">
                {writingSections.map((sec, idx) => (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => setWritingPartIndex(idx)}
                    className={cn(
                      'shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all',
                      idx === writingPartIndex
                        ? 'bg-amber-500 text-white shadow-md'
                        : 'border border-[var(--border-card)] bg-[var(--surface-hover)]/50 text-muted-foreground hover:text-foreground'
                    )}
                  >
                    Task {idx === 0 ? '1.1' : idx === 1 ? '1.2' : '2'}
                  </button>
                ))}
              </div>

              <Button
                size="sm"
                onClick={() => {
                  markSkillCompleted('writing');
                  setViewMode('hub');
                }}
                className="rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-md gap-1"
              >
                <CheckCircle2 className="size-4" />
                <span className="hidden sm:inline">Writingni yakunlash</span>
                <span className="sm:hidden">Yakunlash</span>
              </Button>
            </div>

            {/* Current Writing Task */}
            {(() => {
              const sec = currentWritingSection;
              const writingQuestions = sec.questions.filter((q) => q.type === 'writing_task');

              return (
                <div className="space-y-6">
                  {sec.instruction && (
                    <div className="rounded-2xl border border-[var(--border-card)] bg-[var(--surface-card-medium)] p-4 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      {sec.instruction}
                    </div>
                  )}

                  <div className="space-y-8">
                    {writingQuestions.map((q) => (
                      <WritingTask
                        key={q.id}
                        question={q}
                        onSave={(text) => answer(q, { text_answer: text })}
                        onReview={() => reviewWriting(q.id)}
                      />
                    ))}
                  </div>

                  {/* Task navigation */}
                  <div className="flex items-center justify-between pt-4">
                    <Button
                      variant="outline"
                      disabled={writingPartIndex === 0}
                      onClick={() => setWritingPartIndex((prev) => Math.max(0, prev - 1))}
                      className="rounded-xl font-bold"
                    >
                      <ChevronLeft className="size-4 mr-1" /> Oldingi topshiriq
                    </Button>

                    {writingPartIndex < writingSections.length - 1 ? (
                      <Button
                        onClick={() => setWritingPartIndex((prev) => prev + 1)}
                        className="rounded-xl font-bold bg-amber-500 hover:bg-amber-600 text-white"
                      >
                        Keyingi topshiriq <ChevronRight className="size-4 ml-1" />
                      </Button>
                    ) : (
                      <Button
                        onClick={() => {
                          markSkillCompleted('writing');
                          setViewMode('hub');
                        }}
                        className="rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        Writingni yakunlash <CheckCircle2 className="size-4 ml-1" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })()}

          </div>
        )}

      </main>

      {/* Savollar Palitrasi (Modal) */}
      <QuestionPalette
        open={showPalette}
        onOpenChange={setShowPalette}
        sections={sections}
        flagged={flagged}
        onSelect={(secIndex, qId) => {
          const sec = sections[secIndex];
          if (sec) {
            jump(sec.id, qId);
          }
        }}
      />

      {/* Chiqish Modal */}
      <Dialog open={showExit} onOpenChange={setShowExit}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Imtihon sahifasidan chiqmoqchimisiz?</DialogTitle>
            <DialogDescription>
              Vaqtingiz hisoblanishda davom etadi. Istalgan vaqtda qaytib kelib davom ettirishingiz mumkin.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowExit(false)} className="rounded-xl font-bold">
              Davom ettirish
            </Button>
            <Button variant="secondary" onClick={() => router.push('/tests')} className="rounded-xl font-bold">
              Chiqish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Yakuniy Tasdiqlash Modal */}
      <Dialog open={showFinishConfirm} onOpenChange={setShowFinishConfirm}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black">Imtihonni topshirasizmi?</DialogTitle>
            <DialogDescription className="space-y-2 pt-2">
              <span className="block text-sm text-foreground">
                Jami <strong className="text-emerald-400">{totals.answered}</strong> / {totals.total} ta savolga javob berildi.
              </span>
              {totals.answered < totals.total && (
                <span className="block text-xs text-amber-400">
                  ⚠️ Diqqat: {totals.total - totals.answered} ta savol javobsiz qolmoqda.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 pt-3">
            <Button variant="outline" onClick={() => setShowFinishConfirm(false)} className="rounded-xl font-bold">
              Qaytish
            </Button>
            <Button
              onClick={finish}
              disabled={finishing}
              className="rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {finishing ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
              Ha, yakunlash
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
