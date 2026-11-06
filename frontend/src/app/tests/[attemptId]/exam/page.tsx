'use client';

/* CEFR Multi-Level Imtihon Ekrani.
   3 ta asosiy bo'lim (Listening, Reading, Writing) markazi (Hub),
   bitta pagedagi uzluksiz Listening (orqaga qaytarish taqiqlangan audio),
   ikki ustunli (split-screen) Reading va qulay Writing studio. */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  AlertCircle, AlertTriangle, ArrowRight, BookOpen, CheckCircle2, ChevronLeft, ChevronRight, Clock, FileEdit, Headphones, LayoutGrid, Loader2, LogOut, ShieldAlert, Sparkles, X, GraduationCap, Flag,
} from 'lucide-react';
import { apiFetch, ApiError } from '@/lib/api-client';
import { useExamAntiCheat } from '@/hooks/useExamAntiCheat';
import { toast } from 'sonner';
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
import GroupOptionsPanel from '@/components/cefr/GroupOptionsPanel';
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
  useExamAntiCheat(attemptId, Boolean(exam?.anti_cheat && !exam.is_completed));
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
  const [finishNetworkError, setFinishNetworkError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [timeUp, setTimeUp] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState<number>(0);

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

  // Mahalliy zaxira (45 daqiqalik mehnatingizni yo'qotmaslik uchun)
  const backupKey = `ilmildizi_exam_backup_${attemptId}`;

  const saveLocalBackup = useCallback((examObj: CefrExam) => {
    try {
      const answers: Record<number, { choice_id?: number | null; group_option_id?: number | null; matches?: Record<string, string> }> = {};
      const openAnswers: Record<number, string> = {};

      const extractQ = (q: CefrQuestion) => {
        if (q.selected_choice_id != null || q.selected_group_option_id != null || q.matching_rows) {
          const matchMap: Record<string, string> = {};
          if (q.matching_rows) {
            for (const r of q.matching_rows) {
              if (r.selected_right_key) matchMap[r.left_key] = r.selected_right_key;
            }
          }
          answers[q.id] = {
            choice_id: q.selected_choice_id,
            group_option_id: q.selected_group_option_id,
            matches: Object.keys(matchMap).length > 0 ? matchMap : undefined,
          };
        }
        if (q.text_answer) {
          openAnswers[q.id] = q.text_answer;
        }
      };

      for (const s of examObj.sections) {
        for (const q of s.questions) extractQ(q);
      }
      for (const q of examObj.loose_questions) extractQ(q);

      localStorage.setItem(backupKey, JSON.stringify({
        answers,
        openAnswers,
        updatedAt: Date.now(),
      }));
    } catch {
      // ignore
    }
  }, [backupKey]);

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
        // Agar xotirada saqlangan javoblar bo'lsa, ularni tiklaymiz
        try {
          const rawBackup = localStorage.getItem(`ilmildizi_exam_backup_${attemptId}`);
          if (rawBackup) {
            const b = JSON.parse(rawBackup);
            const savedAns = b?.answers || {};
            const savedOpen = b?.openAnswers || {};
            let restoredCount = 0;

            const patchQ = (q: CefrQuestion): CefrQuestion => {
              const a = savedAns[q.id];
              const t = savedOpen[q.id];
              if (!a && t === undefined) return q;

              const next = { ...q };
              if (a) {
                if (a.choice_id !== undefined) { next.selected_choice_id = a.choice_id; restoredCount++; }
                if (a.group_option_id !== undefined) { next.selected_group_option_id = a.group_option_id; restoredCount++; }
                if (a.matches && next.matching_rows) {
                  next.matching_rows = next.matching_rows.map((row) => ({
                    ...row,
                    selected_right_key: a.matches[row.left_key] || row.selected_right_key,
                  }));
                  restoredCount++;
                }
              }
              if (t !== undefined) {
                next.text_answer = t;
                restoredCount++;
              }
              next.answered = Boolean(
                next.selected_choice_id ??
                next.selected_group_option_id ??
                (String(next.text_answer ?? '').trim().length > 0)
              );
              return next;
            };

            if (Object.keys(savedAns).length > 0 || Object.keys(savedOpen).length > 0) {
              data.sections = data.sections.map((s) => ({ ...s, questions: s.questions.map(patchQ) }));
              data.loose_questions = data.loose_questions.map(patchQ);
              if (restoredCount > 0) {
                toast.success("✅ Belgilangan javoblaringiz xotiradan tiklandi");
              }
            }
          }
        } catch (backupErr) {
          console.warn("Backup restore failed:", backupErr);
        }

        setExam(data);
        setSecondsLeft(data.seconds_left);
        setAnnotations(data.annotations ?? {});
        if (data.is_completed) router.replace(`/tests/${attemptId}/feedback`);
      })
      .catch((e: unknown) => {
        if (e instanceof ApiError && e.status === 409) { router.push(`/tests/${attemptId}/feedback`); return; }
        setError(e instanceof Error ? e.message : 'Xatolik');
      });
  }, [authReady, access, attemptId, router]);

  // Yengil Taymer (butun exam ob'ektini qayta chizmaslik uchun alohida state)
  useEffect(() => {
    if (!exam || exam.is_completed) return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setTimeUp(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [exam?.attempt_id, exam?.is_completed]);

  // Vaqt tugaganda avtomatik topshirish
  useEffect(() => {
    if (secondsLeft === 0 && exam && !exam.is_completed && !finishing && exam.seconds_left > 0) {
      setTimeUp(true);
      void finish();
    }
  }, [secondsLeft]); // eslint-disable-line react-hooks/exhaustive-deps

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

        if ('group_option_id' in payload) {
          next.selected_group_option_id = (payload.group_option_id as number | null) ?? null;
        }
        if ('choice_id' in payload) {
          next.selected_choice_id = (payload.choice_id as number | null) ?? null;
        }
        if ('text_answer' in payload) {
          next.text_answer = (payload.text_answer as string) ?? '';
        }
        if ('matches' in payload && next.matching_rows) {
          const matches = (payload.matches || {}) as Record<string, string>;
          next.matching_rows = next.matching_rows.map((row) => ({
            ...row,
            selected_right_key: matches[row.left_key] || '',
          }));
        }

        next.answered = isText
          ? String(next.text_answer ?? '').trim().length > 0
          : Boolean(
              next.selected_choice_id ??
              next.selected_group_option_id ??
              payload.choice_id ??
              payload.group_option_id ??
              payload.matches
            );
        return next;
      };
      const updated: CefrExam = {
        ...prev,
        sections: prev.sections.map((s) => ({ ...s, questions: s.questions.map(patch) })),
        loose_questions: prev.loose_questions.map(patch),
      };
      saveLocalBackup(updated);
      return updated;
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
    setFinishNetworkError(false);
    try {
      await apiFetch(`/api/tests/attempts/${attemptId}/finish/`, { method: 'POST', body: '{}' });
      try {
        localStorage.removeItem(`ilmildizi_exam_backup_${attemptId}`);
        localStorage.removeItem(`ilm_completed_skills_${attemptId}`);
        localStorage.removeItem(`ilm_flags_${attemptId}`);
      } catch { /* storage */ }
      router.push(`/tests/${attemptId}/feedback`);
    } catch (err) {
      setFinishing(false);
      setFinishNetworkError(true);
      setError("Tarmoq xatosi — javoblaringiz xavfsiz saqlandi.");
      toast.error("🔄 Tarmoq xatosi — javoblaringiz xavfsiz saqlandi. Qayta yuborish tugmasini bosing.");
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
      <div className="theme-pastel min-h-screen w-full">
        <AppShell />
        <div className="ps-scope mx-auto max-w-md p-6 text-center">
          <AlertCircle className="mx-auto mb-3 h-8 w-8 text-rose-400" />
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button className="mt-4" onClick={() => router.push('/tests')}>Testlarga qaytish</Button>
        </div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="theme-pastel min-h-screen w-full">
        <AppShell />
        <div className="mx-auto max-w-5xl space-y-4 p-4">
          <Skeleton className="h-14 w-full rounded-2xl" />
          <div className="grid gap-4 lg:grid-cols-3">
            <Skeleton className="h-[50vh] rounded-2xl" />
            <Skeleton className="h-[50vh] rounded-2xl" />
            <Skeleton className="h-[50vh] rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  const currentReadingSection = readingSections[readingPartIndex] || readingSections[0];
  const currentWritingSection = writingSections[writingPartIndex] || writingSections[0];

  return (
    <div className="theme-pastel min-h-screen w-full">
      <AppShell />
      <main className="ps-scope mx-auto w-full max-w-[1440px] flex-1 px-2.5 pb-24 pt-2.5 sm:px-6 min-w-0 max-w-full overflow-x-hidden">
        
        {/* =========================================================
            TOP HEADER BAR (Timer, Mode Switch, Palette, Submit)
            ========================================================= */}
        <header className="ps-runner-bar sticky top-2 z-30 mb-5 rounded-[28px] px-3 py-2.5 sm:top-3 sm:px-4 sm:py-3 min-w-0 max-w-full">
          <div className="flex items-center justify-between gap-2 min-w-0">
            
            {/* Left: Exit or Back to Hub */}
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {viewMode !== 'hub' ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewMode('hub')}
                  className="rounded-xl font-semibold gap-1 border-[var(--border-card)] text-muted-foreground hover:text-foreground shrink-0 h-8 px-2 sm:px-3 text-xs"
                >
                  <ChevronLeft className="size-3.5 sm:size-4" />
                  <span className="hidden sm:inline">Hub</span>
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowExit(true)}
                  aria-label="Chiqish"
                  className="rounded-xl text-muted-foreground hover:text-foreground shrink-0 size-8"
                >
                  <X className="size-4 sm:size-5" />
                </Button>
              )}

              <div className="min-w-0 flex-1">
                <div className="truncate text-xs sm:text-sm font-bold text-foreground" title={exam.test.title}>
                  {exam.test.title}
                </div>
                <div className="text-[12px] sm:text-[12px] text-muted-foreground truncate">
                  Jami: <strong className="text-foreground">{totals.answered}/{totals.total}</strong> savol
                </div>
              </div>
            </div>

            {/* Right: Timer, Questions button, Finish Button */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Countdown Timer */}
              <div className={cn(
                'flex items-center gap-1 sm:gap-1.5 rounded-full px-2 sm:px-3 py-1 text-xs font-bold font-mono tracking-wider shrink-0',
                secondsLeft <= 300
                  ? 'bg-rose-500/20 text-rose-500 animate-pulse border border-rose-500/40'
                  : 'bg-[var(--ps-orange)] text-[#080808]',
              )}>
                <Clock className="size-3 sm:size-3.5" />
                {formatTime(secondsLeft)}
              </div>

              {/* Font size picker (Reading rejimida) */}
              {viewMode === 'reading' && (
                <div className="hidden md:flex items-center rounded-xl border border-[var(--border-card)] bg-[var(--surface-card-medium)] p-0.5">
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
                className="gap-1 rounded-xl border-[var(--border-card)] text-xs font-semibold h-8 px-2 sm:px-2.5"
                title="Savollar xaritasi"
              >
                <LayoutGrid className="size-3.5 sm:size-4" />
                <span className="hidden md:inline">Savollar</span>
              </Button>

              {/* Imtihonni Yakunlash Button */}
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setShowFinishConfirm(true)}
                className="rounded-full font-bold text-xs bg-[var(--ps-coral)] hover:bg-[var(--ps-coral)]/90 text-white h-9 px-3.5 sm:px-4"
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
        {viewMode === 'hub' && (() => {
          const pct = Math.round((totals.answered / Math.max(1, totals.total)) * 100);
          const SKILLS = [
            { key: 'listening' as const, n: 1, title: 'Listening', sub: 'Tinglab tushunish', desc: 'Audio asosida monolog, suhbatlar va xaritani belgilash.', icon: Headphones, tone: 'bg-[var(--ps-purple)] text-white', bar: 'bg-white', unit: 'savol' },
            { key: 'reading' as const, n: 2, title: 'Reading', sub: "O'qish", desc: "Split-screen: chapda matn, o'ngda savollar va bo'shliqlar.", icon: BookOpen, tone: 'bg-[var(--ps-blue)] text-[#080808]', bar: 'bg-[#080808]', unit: 'savol' },
            { key: 'writing' as const, n: 3, title: 'Writing', sub: 'Yozma ish', desc: "Task 1.1 (xat), Task 1.2 (rasmiy xat), Task 2 (insho). Jonli so'z sanagich bilan.", icon: FileEdit, tone: 'bg-[var(--ps-orange)] text-[#080808]', bar: 'bg-[#080808]', unit: 'topshiriq' },
          ];
          return (
            <div className="mx-auto max-w-6xl space-y-5 py-2">
              {/* Banner */}
              <section className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
                <div className="ps-card relative overflow-hidden !rounded-[36px] p-6 sm:p-8">
                  <span aria-hidden className="pointer-events-none absolute -right-14 -top-14 size-48 rounded-full bg-[var(--ps-purple)] opacity-15" />
                  <span className="ps-chip relative"><GraduationCap className="size-3.5 text-[var(--ps-purple)]" /> CEFR Multi-Level mock</span>
                  <h1 className="ps-display relative mt-5 text-[38px] sm:text-[52px]">
                    Imtihon <span className="text-[var(--ps-purple)]">bo&apos;limlari</span>
                    <span className="text-[var(--ps-coral)]">.</span>
                  </h1>
                  <p className="relative mt-3 max-w-xl text-[14px] leading-relaxed text-[var(--text-secondary)]">
                    Imtihon 3 ta mustaqil ko&apos;nikma bo&apos;yicha topshiriladi. Har bir bo&apos;limga kirib, vazifalarni bajaring va yakunlang.
                  </p>
                </div>

                <div className="relative flex items-center justify-between gap-4 overflow-hidden rounded-[36px] bg-[#080808] p-6 text-[#FFFCF7] sm:p-8 dark:bg-[#FFFCF7] dark:text-[#080808]">
                  <span aria-hidden className="absolute -right-10 -top-10 size-36 rounded-full bg-[var(--ps-purple)] opacity-50" />
                  <div className="relative">
                    <p className="ps-eyebrow opacity-60">Umumiy progress</p>
                    <p className="ps-num mt-2 text-[52px] leading-none">
                      {totals.answered}<span className="text-[0.4em] opacity-50"> / {totals.total}</span>
                    </p>
                    <p className="mt-2 text-[12.5px] font-semibold opacity-70">ta savolga javob berildi</p>
                  </div>
                  <div
                    className="relative grid size-24 shrink-0 place-items-center rounded-full"
                    style={{ background: `conic-gradient(var(--ps-orange) ${pct * 3.6}deg, rgba(255,255,255,0.12) 0deg)` }}
                  >
                    <span className="grid size-[76px] place-items-center rounded-full bg-[#080808] font-mono text-[18px] font-black dark:bg-[#FFFCF7]">{pct}%</span>
                  </div>
                </div>
              </section>

              {/* 3 ta ko'nikma */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {SKILLS.map((sk) => {
                  const Icon = sk.icon;
                  const st = skillStats[sk.key];
                  const done = completedSkills.has(sk.key);
                  const started = st.answered > 0;
                  const tone = done ? 'bg-[var(--ps-green)] text-white' : sk.tone;
                  return (
                    <div key={sk.key} className="group flex flex-col overflow-hidden rounded-[32px] bg-[var(--ps-paper)] shadow-[var(--ds-panel-shadow)] transition-transform duration-300 hover:-translate-y-1">
                      {/* Rangli sahna */}
                      <div className={cn('relative overflow-hidden p-6', tone)}>
                        <span aria-hidden className="absolute -right-8 -top-8 size-28 rounded-full bg-white/20" />
                        <span aria-hidden className="ps-dots absolute bottom-0 right-0 h-14 w-28 opacity-25" />
                        <div className="relative flex items-start justify-between gap-2">
                          <span className="inline-flex size-14 items-center justify-center rounded-full bg-black/15 transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-105">
                            <Icon className="size-7" />
                          </span>
                          <span className="rounded-full bg-black/15 px-2.5 py-1 text-[11px] font-black uppercase tracking-wider">
                            {done ? (
                              <span className="inline-flex items-center gap-1"><CheckCircle2 className="size-3.5" /> Tugallandi</span>
                            ) : started ? 'Davom etmoqda' : 'Boshlanmagan'}
                          </span>
                        </div>
                        <p className="relative mt-5 text-[11px] font-black uppercase tracking-wider opacity-75">Skill {sk.n}</p>
                        <h3 className="ps-display relative mt-1 text-[30px] leading-none">{sk.title}</h3>
                        <p className="relative mt-1 text-[13px] font-semibold opacity-80">{sk.sub}</p>
                      </div>

                      {/* Tafsilot */}
                      <div className="flex flex-1 flex-col p-6">
                        <p className="text-[13px] leading-relaxed text-[var(--text-secondary)]">{sk.desc}</p>
                        <div className="mt-5 flex items-end justify-between">
                          <span className="text-[12px] font-bold text-[var(--text-muted)]">Javoblar</span>
                          <span className="ps-num text-[26px] leading-none">
                            {st.answered}<span className="text-[0.5em] text-[var(--text-faint)]"> / {st.total} {sk.unit}</span>
                          </span>
                        </div>
                        <div className="mt-2.5 h-2.5 overflow-hidden rounded-full bg-[var(--ds-track)]">
                          <div
                            className={cn('h-full rounded-full transition-all duration-500', done ? 'bg-[var(--ps-green)]' : 'bg-[var(--ps-purple)]')}
                            style={{ width: `${(st.answered / Math.max(1, st.total)) * 100}%` }}
                          />
                        </div>
                        <div className="mt-auto pt-5">
                          <button
                            type="button"
                            onClick={() => setViewMode(sk.key)}
                            className={cn('ps-btn w-full', done ? 'ps-btn-ghost' : 'ps-btn-ink')}
                          >
                            {done ? "Ko'rish / tahrirlash" : started ? 'Davom ettirish' : `${sk.title}ni boshlash`}
                            <span className="ps-btn-arrow"><ArrowRight className="size-4" /></span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Yakunlash */}
              <section className="relative flex flex-col items-center justify-between gap-4 overflow-hidden rounded-[32px] bg-[var(--ps-green)] p-6 text-white sm:flex-row sm:p-7">
                <span aria-hidden className="absolute -right-10 -top-10 size-36 rounded-full bg-white/15" />
                <span aria-hidden className="absolute -bottom-10 left-1/3 size-24 rounded-full bg-[var(--ps-orange)] opacity-70" />
                <div className="relative flex items-center gap-4 text-center sm:text-left">
                  <span className="hidden size-12 shrink-0 items-center justify-center rounded-full bg-white text-[var(--ps-green)] sm:inline-flex">
                    <Flag className="size-5" />
                  </span>
                  <div>
                    <h4 className="ps-display text-[22px] text-white sm:text-[26px]">Imtihonni topshirishga tayyormisiz?</h4>
                    <p className="mt-1 text-[13px] text-white/85">
                      Javoblaringiz serverga saqlangan. Yakunlagach test tugaydi va to&apos;liq tahlil beriladi.
                    </p>
                  </div>
                </div>
                <button type="button" onClick={() => setShowFinishConfirm(true)} className="ps-btn ps-btn-light relative w-full shrink-0 sm:w-auto">
                  Imtihonni yakunlash
                  <span className="ps-btn-arrow"><ArrowRight className="size-4" /></span>
                </button>
              </section>
            </div>
          );
        })()}

        {/* =========================================================
            2. LISTENING MODE: HAMMA SAVOLLAR BITTA PAGEDA + TOP AUDIO
            ========================================================= */}
        {viewMode === 'listening' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            
            {/* Top Navigation & Status */}
            <div className="flex items-center justify-between gap-2 bg-[var(--surface-card-medium)] border border-[var(--border-card)] rounded-2xl p-2.5 sm:p-4 shadow-sm min-w-0 max-w-full">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('hub')}
                className="rounded-xl font-bold gap-1 text-xs shrink-0 h-8 px-2.5"
              >
                <ChevronLeft className="size-4" /> Bo&apos;limlar
              </Button>

              <div className="text-center min-w-0 px-1">
                <span className="text-xs sm:text-sm font-bold text-foreground block truncate">
                  Listening
                </span>
                <span className="text-[12px] sm:text-[12px] text-muted-foreground truncate block">
                  {skillStats.listening.answered} / {skillStats.listening.total} savol
                </span>
              </div>

              <Button
                size="sm"
                onClick={() => {
                  markSkillCompleted('listening');
                  setViewMode('hub');
                }}
                className="rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-md gap-1 shrink-0 h-8 px-2.5"
              >
                <CheckCircle2 className="size-4" />
                <span className="hidden sm:inline">Listeningni yakunlash</span>
                <span className="sm:hidden">Yakunlash</span>
              </Button>
            </div>

            {/* Sticky Audio Player (Strict Forward, No Rewind) */}
            <div className="sticky top-18 z-20 rounded-2xl border border-violet-500/40 bg-[var(--surface-base)]/95 backdrop-blur-md p-3.5 sm:p-4 shadow-xl space-y-2 min-w-0 max-w-full">
              <div className="flex items-center justify-between text-xs gap-2 min-w-0">
                <span className="font-bold flex items-center gap-1.5 text-violet-400 truncate">
                  <Headphones className="size-4 shrink-0" /> CEFR Listening Audio
                </span>
                <span className="text-[12px] font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-md shrink-0">
                  No rewind
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
            <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 min-w-0 max-w-full scrollbar-none">
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
                  <span className="ml-1.5 text-[12px] text-violet-400">
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
                        <h3 className="text-base sm:text-lg font-bold text-foreground mt-2">
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
                        {sec.groups.length > 0 && (
                          <GroupOptionsPanel
                            groups={sec.groups}
                            questions={sec.questions}
                            activeQuestionId={activeQuestionId}
                            onSelectOption={(qId, optId) => {
                              const q = sec.questions.find((item) => item.id === qId);
                              if (q) answer(q, { group_option_id: optId });
                            }}
                          />
                        )}
                        {sideQuestions.map((q) => (
                          <div key={q.id} id={`q-${q.id}`}>
                            <ExamQuestion
                              question={q}
                              group={sec.groups.find((g) => g.id === q.group_id)}
                              active={activeQuestionId === q.id}
                              onActivate={() => setActiveQuestionId(q.id)}
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
                className="rounded-2xl font-bold text-sm sm:text-base px-8 h-13 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-xl gap-2"
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
            <div className="flex min-w-0 max-w-full flex-col justify-between gap-2.5 rounded-[28px] bg-[var(--ps-paper,var(--surface-card))] p-2.5 shadow-[var(--ds-panel-shadow)] sm:flex-row sm:items-center sm:p-3">
              <div className="flex items-center justify-between gap-2 min-w-0 w-full sm:w-auto">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode('hub')}
                  className="h-9 shrink-0 gap-1 rounded-full bg-[var(--ps-neutral,var(--surface-input))] px-3.5 text-xs font-bold"
                >
                  <ChevronLeft className="size-4" /> Bo&apos;limlar
                </Button>

                <Button
                  size="sm"
                  onClick={() => {
                    markSkillCompleted('reading');
                    setViewMode('hub');
                  }}
                  className="h-9 shrink-0 gap-1 rounded-full bg-[var(--ps-green,#4C806B)] px-3.5 text-xs font-bold text-white hover:bg-[var(--ps-green,#4C806B)]/90 sm:hidden"
                >
                  <CheckCircle2 className="size-3.5" />
                  Yakunlash
                </Button>
              </div>

              {/* Part selector pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto min-w-0 max-w-full py-0.5 scrollbar-none">
                {readingSections.map((sec, idx) => (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => {
                      setReadingPartIndex(idx);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className={cn(
                      'inline-flex shrink-0 cursor-pointer select-none items-center gap-1.5 rounded-full py-1.5 pl-3.5 pr-1.5 text-[13px] font-bold transition-all',
                      idx === readingPartIndex
                        ? 'bg-[#080808] text-[#FFFCF7] dark:bg-[#FFFCF7] dark:text-[#080808]'
                        : 'bg-[var(--ps-neutral,var(--surface-input))] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    )}
                  >
                    Part {sec.part_number}
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[11px] tabular-nums',
                        sec.questions.length > 0 && sec.questions.every((q) => q.answered)
                          ? 'bg-[var(--ps-green,#4C806B)] text-white'
                          : idx === readingPartIndex
                            ? 'bg-[var(--ps-orange,#FFB82E)] text-[#080808]'
                            : 'bg-[var(--ps-paper,var(--surface-card))]'
                      )}
                    >
                      {sec.questions.filter((q) => q.answered).length}/{sec.questions.length}
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
                className="hidden h-10 gap-1.5 rounded-full bg-[var(--ps-green,#4C806B)] px-4 text-[13px] font-bold text-white hover:bg-[var(--ps-green,#4C806B)]/90 sm:inline-flex"
              >
                <CheckCircle2 className="size-4" />
                Readingni yakunlash
              </Button>
            </div>

            {/* Instruction if any */}
            {currentReadingSection.instruction && (
              <div className="flex items-start gap-3 rounded-[24px] bg-[var(--ps-lilac,#E6B5F2)]/45 p-4 text-[13.5px] font-semibold leading-relaxed text-[var(--text-primary)] dark:bg-[var(--ps-purple,#7659C7)]/20">
                <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--ps-purple,#7659C7)] text-white">
                  <BookOpen className="size-4" />
                </span>
                <span className="pt-1">{currentReadingSection.instruction}</span>
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
              const hasGroups = (sec.groups?.length ?? 0) > 0;
              const hasSide = sideQuestions.length > 0 || hasGroups;
              const isTwoColumn = hasPassage || hasGroups;

              return (
              <>
                <div className={cn('grid gap-6', isTwoColumn && hasSide ? 'items-start lg:grid-cols-12' : 'mx-auto max-w-4xl')}>
                  
                  {/* Left Column: Passage OR Sticky Group Options (Statements / Headings) */}
                  {hasPassage ? (
                    <div
                      className={cn(
                        'space-y-4 rounded-[32px] bg-[var(--ps-paper,var(--surface-card))] p-6 shadow-[var(--ds-panel-shadow)] sm:p-8',
                        hasSide ? 'lg:sticky lg:top-24 lg:col-span-6 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto' : 'lg:col-span-12'
                      )}
                    >
                      {sec.title && (
                        <div className="flex items-center justify-between gap-3 border-b border-[var(--border-card)] pb-4">
                          <h2 className="font-[family-name:var(--font-grotesk)] text-[24px] font-bold tracking-[-0.03em] text-[var(--text-primary)] sm:text-[30px]">
                            {sec.title}
                          </h2>
                          <span className="shrink-0 rounded-full bg-[var(--ps-neutral,var(--surface-input))] px-3 py-1 text-[12px] font-bold text-[var(--text-secondary)]">
                            Part {sec.part_number}
                          </span>
                        </div>
                      )}

                      {sec.image && (
                        <img src={sec.image} alt="" className="w-full rounded-[22px]" />
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
                  ) : hasGroups ? (
                    <div className="lg:col-span-5 lg:sticky lg:top-24 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto">
                      <GroupOptionsPanel
                        groups={sec.groups}
                        questions={sec.questions}
                        activeQuestionId={activeQuestionId}
                        onSelectOption={(qId, optId) => {
                          const q = sec.questions.find((item) => item.id === qId);
                          if (q) answer(q, { group_option_id: optId });
                        }}
                      />
                    </div>
                  ) : null}

                  {/* Right Column: Questions */}
                  {hasSide && (
                    <div className={cn('space-y-5', hasPassage ? 'lg:col-span-6' : hasGroups ? 'lg:col-span-7' : 'w-full')}>
                      {/* If both passage AND groups exist, render groups above questions */}
                      {hasPassage && hasGroups && (
                        <GroupOptionsPanel
                          groups={sec.groups}
                          questions={sec.questions}
                          activeQuestionId={activeQuestionId}
                          onSelectOption={(qId, optId) => {
                            const q = sec.questions.find((item) => item.id === qId);
                            if (q) answer(q, { group_option_id: optId });
                          }}
                        />
                      )}

                      {sideQuestions.map((q) => (
                        <div key={q.id} id={`q-${q.id}`}>
                          <ExamQuestion
                            question={q}
                            group={sec.groups.find((g) => g.id === q.group_id)}
                            active={activeQuestionId === q.id}
                            onActivate={() => setActiveQuestionId(q.id)}
                            onAnswer={(payload) => answer(q, payload)}
                          />
                        </div>
                      ))}

                    </div>
                  )}

                </div>
                <div className={cn(isTwoColumn && hasSide ? '' : 'mx-auto max-w-4xl')}>
                      {/* Part Switcher & End Button */}
                      <div className="flex items-center justify-between gap-3 pt-2">
                        <Button
                          variant="outline"
                          disabled={readingPartIndex === 0}
                          onClick={() => {
                            setReadingPartIndex((prev) => Math.max(0, prev - 1));
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="h-11 rounded-full border-0 bg-[var(--ps-paper,var(--surface-card))] px-5 font-bold shadow-[var(--ds-panel-shadow)]"
                        >
                          <ChevronLeft className="mr-1 size-4" /> Oldingi part
                        </Button>

                        {readingPartIndex < readingSections.length - 1 ? (
                          <Button
                            onClick={() => {
                              setReadingPartIndex((prev) => prev + 1);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="h-11 rounded-full bg-[#080808] px-5 font-bold text-[#FFFCF7] hover:bg-[#080808]/90 dark:bg-[#FFFCF7] dark:text-[#080808]"
                          >
                            Keyingi part <ChevronRight className="size-4 ml-1" />
                          </Button>
                        ) : (
                          <Button
                            onClick={() => {
                              markSkillCompleted('reading');
                              setViewMode('hub');
                            }}
                            className="h-11 rounded-full bg-[var(--ps-green,#4C806B)] px-5 font-bold text-white hover:bg-[var(--ps-green,#4C806B)]/90"
                          >
                            Readingni yakunlash <CheckCircle2 className="size-4 ml-1" />
                          </Button>
                        )}
                      </div>
                </div>
              </>
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
      <Dialog open={showPalette} onOpenChange={setShowPalette}>
        <DialogContent className="ps-shell ps-dialog max-h-[85vh] overflow-y-auto w-[calc(100%-1.5rem)] max-w-lg rounded-2xl p-4 sm:p-6 mx-auto">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg font-bold">Savollar xaritasi</DialogTitle>
            <DialogDescription className="text-xs">
              Yashil — javoblangan, oq — javobsiz savollar. Istalganiga bosib sakrashingiz mumkin.
            </DialogDescription>
          </DialogHeader>
          <QuestionPalette
            sections={sections}
            activeQuestionId={activeQuestionId}
            flagged={flagged}
            onJump={(sectionIndex: number, questionId: number) => {
              const sec = sections[sectionIndex];
              if (sec) {
                jump(sec.id, questionId);
              }
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Chiqish Ogohlantirish Modali */}
      <Dialog open={showExit} onOpenChange={setShowExit}>
        <DialogContent className="ps-shell ps-dialog w-[calc(100%-1.5rem)] max-w-md rounded-3xl border border-amber-500/30 bg-[var(--ps-paper)] p-6 shadow-2xl mx-auto">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 shadow-lg shadow-amber-500/10">
              <AlertTriangle className="size-7" />
            </div>

            <div className="space-y-1.5">
              <DialogTitle className="text-lg sm:text-xl font-bold text-foreground">
                Imtihondan chiqmoqchimisiz?
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Imtihon sessiyangiz faol holatda qoladi.
              </DialogDescription>
            </div>

            {/* Warning info callout */}
            <div className="w-full text-left rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-200/90 leading-relaxed space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-amber-400">
                <Clock className="size-4 shrink-0" />
                <span>Diqqat: Imtihon vaqti to&apos;xtatilmaydi!</span>
              </div>
              <p className="text-[12px] text-amber-300/80">
                Sahifani yopsangiz ham serverda taymer hisoblanishda davom etadi. Belgilangan barcha javoblaringiz esa saqlab qolinadi.
              </p>
            </div>

            {finishNetworkError && (
              <div className="w-full p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center justify-between gap-2">
                <span>🔄 Tarmoq xatosi — javoblaringiz xavfsiz saqlandi.</span>
                <Button size="sm" variant="outline" onClick={finish} disabled={finishing} className="shrink-0 border-amber-500/40 text-white hover:bg-amber-500/20">
                  Qayta yuborish
                </Button>
              </div>
            )}
            <div className="w-full flex flex-col-reverse sm:flex-row items-center gap-3 pt-3">
              <Button
                variant="outline"
                onClick={() => router.push('/tests')}
                className="w-full sm:w-auto flex-1 rounded-2xl font-bold border-rose-500/40 text-rose-400 hover:bg-rose-500/15 hover:text-rose-300 active:scale-[0.98] transition-all h-12 sm:h-12.5 text-sm sm:text-base gap-2"
              >
                <LogOut className="size-5" />
                Chiqish
              </Button>
              <Button
                onClick={() => setShowExit(false)}
                className="w-full sm:w-auto flex-1 rounded-2xl font-bold bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] transition-all text-white shadow-lg shadow-emerald-600/30 h-12 sm:h-12.5 text-sm sm:text-base gap-2"
              >
                <CheckCircle2 className="size-5" />
                Davom ettirish
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Yakuniy Tasdiqlash Modal */}
      <Dialog open={showFinishConfirm} onOpenChange={setShowFinishConfirm}>
        <DialogContent className="ps-shell ps-dialog w-[calc(100%-1.5rem)] max-w-md rounded-3xl border border-emerald-500/30 bg-[var(--ps-paper)] p-6 shadow-2xl mx-auto">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shadow-lg shadow-emerald-500/10">
              <CheckCircle2 className="size-7" />
            </div>

            <div className="space-y-1">
              <DialogTitle className="text-lg sm:text-xl font-bold text-foreground">
                Imtihonni topshirasizmi?
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Topshirgach, natijalaringiz hisoblanadi va to&apos;liq tahlil taqdim etiladi.
              </DialogDescription>
            </div>

            {/* Answer stats card */}
            <div className="w-full grid grid-cols-2 gap-2.5">
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-center">
                <span className="text-[12px] font-bold uppercase tracking-wider text-emerald-400 block">Javoblangan</span>
                <span className="text-lg sm:text-xl font-bold text-emerald-300 font-mono mt-0.5 block">
                  {totals.answered} <span className="text-xs text-muted-foreground font-normal">/ {totals.total}</span>
                </span>
              </div>

              <div className={cn(
                'rounded-2xl border p-3 text-center',
                totals.total - totals.answered > 0
                  ? 'border-amber-500/30 bg-amber-500/10'
                  : 'border-[var(--border-card)] bg-[var(--surface-card-medium)]'
              )}>
                <span className={cn(
                  'text-[12px] font-bold uppercase tracking-wider block',
                  totals.total - totals.answered > 0 ? 'text-amber-400' : 'text-muted-foreground'
                )}>
                  Javobsiz qolgan
                </span>
                <span className={cn(
                  'text-lg sm:text-xl font-bold font-mono mt-0.5 block',
                  totals.total - totals.answered > 0 ? 'text-amber-300' : 'text-muted-foreground'
                )}>
                  {totals.total - totals.answered} ta
                </span>
              </div>
            </div>

            {totals.answered < totals.total && (
              <div className="w-full text-left rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-300 flex items-start gap-2">
                <AlertCircle className="size-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  {totals.total - totals.answered} ta savol javobsiz qolgan. Topshirgandan so&apos;ng javoblarni o&apos;zgartirib bo&apos;lmaydi.
                </span>
              </div>
            )}

            <div className="w-full flex flex-col-reverse sm:flex-row items-center gap-3 pt-3">
              <Button
                variant="outline"
                onClick={() => setShowFinishConfirm(false)}
                className="w-full sm:w-auto flex-1 rounded-2xl font-bold text-sm sm:text-base border-[var(--border-card)] hover:bg-[var(--surface-hover)] active:scale-[0.98] transition-all h-12 sm:h-12.5"
              >
                Savollarga qaytish
              </Button>
              <Button
                onClick={finish}
                disabled={finishing}
                className="w-full sm:w-auto flex-1 rounded-2xl font-bold text-sm sm:text-base bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg shadow-emerald-600/25 active:scale-[0.98] transition-all h-12 sm:h-12.5 gap-2"
              >
                {finishing ? <Loader2 className="size-5 animate-spin" /> : null}
                Ha, topshirish 🏁
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
