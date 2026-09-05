'use client';

/* CEFR imtihon ekrani.

   NEGA ALOHIDA SAHIFA: oddiy test "bitta savol — bitta ekran" tarzida yechiladi, CEFR esa
   yo'q. Bu yerda o'quvchi butun partni ko'radi: chapda matn yoki audio, o'ngda o'sha
   partning barcha savollari. Bo'shliqli savollar umuman o'ng tarafda emas — ular matnning
   o'z ichida, xuddi qog'ozdagidek.

   Javoblar hech qachon "Saqlash" tugmasini kutmaydi: har bir tanlov darhol (matn uchun —
   yozish to'xtaganidan yarim soniya keyin) serverga ketadi. Internet uzilsa ham yozilgan
   matn ekranda qoladi va keyingi urinishda yuboriladi. */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  AlertCircle, ChevronLeft, ChevronRight, Clock, Flag, LayoutGrid, Loader2, X,
} from 'lucide-react';
import { apiFetch, ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import {
  useIsTelegram, useTelegramBackButton, useTelegramClosingConfirmation,
} from '@/lib/telegram';
import type {
  AnnotationMap, CefrExam, CefrQuestion, CefrSection, WritingReview,
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

/* Matn yozilayotganda har bosishda so'rov yubormaslik uchun kutish vaqti. Tanlab
   javob beriladigan turlar (variant, TRUE/FALSE) darhol yuboriladi — u yerda kutishning
   ma'nosi yo'q. */
const TEXT_SAVE_DELAY = 600;

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return `${minutes.toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
}

export default function CefrExamPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const router = useRouter();
  const { access } = useAuthStore();

  const [exam, setExam] = useState<CefrExam | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sectionIndex, setSectionIndex] = useState(0);
  const [activeQuestionId, setActiveQuestionId] = useState<number | null>(null);
  const [flagged, setFlagged] = useState<Set<number>>(new Set());
  const [annotations, setAnnotations] = useState<AnnotationMap>({});
  const [fontKey, setFontKey] = useState<FontKey>('md');
  const [showPalette, setShowPalette] = useState(false);
  const [showExit, setShowExit] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [timeUp, setTimeUp] = useState(false);

  const saveTimers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const annotationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inTelegram = useIsTelegram();

  useTelegramClosingConfirmation(true);
  useTelegramBackButton(() => setShowExit(true));

  // Zen rejimi: imtihon davomida sidebar/tab-bar yashiriladi.
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

  // Belgilangan savollar (flag) faqat shu qurilmada kerak — serverga yozilmaydi.
  useEffect(() => {
    const raw = localStorage.getItem(`ilm_flags_${attemptId}`);
    if (raw) setFlagged(new Set(JSON.parse(raw) as number[]));
  }, [attemptId]);

  useEffect(() => {
    localStorage.setItem(`ilm_flags_${attemptId}`, JSON.stringify([...flagged]));
  }, [attemptId, flagged]);

  useEffect(() => {
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
  }, [access, attemptId, router]);

  // Mahalliy sanoq — server bilan har safar bog'lanmasdan vaqt tik-tiklab tursin.
  // Haqiqiy chegara baribir serverda: u vaqt tugagach javob qabul qilmaydi.
  useEffect(() => {
    if (!exam) return;
    const timer = setInterval(() => {
      setExam((prev) => (prev && prev.seconds_left > 0 ? { ...prev, seconds_left: prev.seconds_left - 1 } : prev));
    }, 1000);
    return () => clearInterval(timer);
  }, [exam?.attempt_id]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Vaqt tugadi — test o'zi yakunlanadi va natijalar sahifasiga o'tadi. Ilgari taymer
     nolga tushgach hech narsa bo'lmasdi va urinish ochiq qolib ketardi. */
  useEffect(() => {
    if (!exam || exam.is_completed || exam.seconds_left > 0 || finishing) return;
    setTimeUp(true);
    void finish();
  }, [exam?.seconds_left]); // eslint-disable-line react-hooks/exhaustive-deps

  const sections = exam?.sections ?? [];
  const section: CefrSection | undefined = sections[sectionIndex];

  const questionsById = useMemo(() => {
    const map = new Map<number, CefrQuestion>();
    for (const s of sections) for (const q of s.questions) map.set(q.id, q);
    return map;
  }, [sections]);

  const totals = useMemo(() => {
    const all = [...questionsById.values()];
    return { total: all.length, answered: all.filter((q) => q.answered).length };
  }, [questionsById]);

  /* Javobni serverga yuborish. Ekrandagi holat darhol yangilanadi (optimistik), so'rov
     esa fonda ketadi — o'quvchi kutib turmaydi. */
  const sendAnswer = useCallback(async (questionId: number, payload: Record<string, unknown>) => {
    setSaving(true);
    try {
      await apiFetch(`/api/tests/attempts/${attemptId}/exam/answer/`, {
        method: 'POST',
        body: JSON.stringify({ question_id: questionId, ...payload }),
      });
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        // Vaqt tugagan yoki test allaqachon yakunlangan — natijalar sahifasiga o'tiladi.
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
      }).catch(() => { /* belgilar baholashga ta'sir qilmaydi — jimgina o'tkazib yuboriladi */ });
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

  function jump(targetSection: number, questionId: number) {
    setSectionIndex(targetSection);
    setActiveQuestionId(questionId);
    setShowPalette(false);
    requestAnimationFrame(() => {
      document.getElementById(`q-${questionId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

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

  if (!exam || !section) {
    return (
      <>
        <AppShell />
        <div className="mx-auto max-w-5xl space-y-4 p-4">
          <Skeleton className="h-14 w-full rounded-2xl" />
          <div className="grid gap-4 lg:grid-cols-2">
            <Skeleton className="h-[60vh] rounded-2xl" />
            <Skeleton className="h-[60vh] rounded-2xl" />
          </div>
        </div>
      </>
    );
  }

  const sectionAnnotations = annotations[String(section.id)] ?? [];
  // Matn ichida turgan bo'shliqlar — ular o'ng ustunda takrorlanmaydi.
  const inlineGapNumbers = new Set(
    [...(section.passage.matchAll(/\{\{(\d+)\}\}/g))].map((m) => Number(m[1])),
  );
  const hasLeftPane = Boolean(section.passage || section.audio || section.image);
  /* Matn ichiga tushgan bo'shliqlar o'ng ustunda takrorlanmaydi. Agar partda boshqa
     savol qolmasa (masalan Part 1 — faqat bo'shliqlar), o'ng ustun umuman chizilmaydi
     va matn butun kenglikni oladi: bo'sh ustun turgandan ko'ra shu qulayroq. */
  const sideQuestions = section.questions.filter(
    (q) => !(q.type === 'gap_fill' && q.exam_number !== null && inlineGapNumbers.has(q.exam_number)),
  );
  const hasRightPane = sideQuestions.length > 0 || section.groups.length > 0;
  const writingQuestions = section.questions.filter((q) => q.type === 'writing_task');
  const isWriting = section.skill === 'writing' && writingQuestions.length > 0;

  const gapFor = (number: number) => {
    const question = section.questions.find((q) => q.exam_number === number);
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
    <>
      <AppShell />
      <main className="mx-auto w-full max-w-[1400px] flex-1 px-3 pb-24 pt-3 sm:px-5">
        {/* Yuqori panel: vaqt, part'lar, o'lcham, yakunlash */}
        <header className="sticky top-0 z-20 -mx-3 mb-4 border-b border-border/60 bg-background/85 px-3 py-2.5 backdrop-blur sm:-mx-5 sm:px-5">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setShowExit(true)} aria-label="Chiqish">
              <X className="h-4 w-4" />
            </Button>

            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{exam.test.title}</div>
              <div className="text-[11px] text-muted-foreground">
                {totals.answered} / {totals.total} javoblandi
              </div>
            </div>

            <div className={cn(
              'ml-auto flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold tabular-nums',
              exam.seconds_left <= 300 ? 'bg-rose-500/15 text-rose-400' : 'bg-muted text-foreground',
            )}>
              <Clock className="h-4 w-4" />
              {formatTime(exam.seconds_left)}
            </div>

            <div className="flex items-center rounded-full border border-border/70 p-0.5">
              {FONT_STEPS.map((step) => (
                <button
                  key={step.key}
                  type="button"
                  onClick={() => setFontKey(step.key)}
                  className={cn(
                    'h-7 w-8 rounded-full text-xs font-semibold transition',
                    fontKey === step.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {step.label}
                </button>
              ))}
            </div>

            <Button variant="outline" size="sm" onClick={() => setShowPalette(true)} className="gap-1.5">
              <LayoutGrid className="h-4 w-4" />
              <span className="hidden sm:inline">Savollar</span>
            </Button>
          </div>

          {/* Part'lar qatori */}
          <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
            {sections.map((item, index) => {
              const done = item.questions.filter((q) => q.answered).length;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => { setSectionIndex(index); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  className={cn(
                    'shrink-0 rounded-xl border px-3 py-1.5 text-left transition',
                    index === sectionIndex
                      ? 'border-primary bg-primary/10'
                      : 'border-border/60 bg-card/40 hover:border-primary/40',
                  )}
                >
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {SKILL_LABEL[item.skill] ?? item.skill}
                  </div>
                  <div className="text-xs font-semibold">
                    Part {item.part_number}
                    <span className={cn('ml-1.5 tabular-nums',
                      done === item.questions.length ? 'text-emerald-400' : 'text-muted-foreground')}>
                      {done}/{item.questions.length}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </header>

        {timeUp && (
          <div className="mb-3 flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
            <Clock className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Test vaqti tugadi — javoblaringiz saqlandi, natija tayyorlanmoqda.</span>
          </div>
        )}

        {error && (
          <div className="mb-3 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {section.instruction && (
          <div className="mb-4 rounded-2xl border border-border/60 bg-card/40 p-3 text-sm leading-relaxed text-muted-foreground">
            {section.instruction}
          </div>
        )}

        {isWriting ? (
          <div className="mx-auto max-w-3xl space-y-8">
            {writingQuestions.map((question) => (
              <WritingTask
                key={question.id}
                question={question}
                onSave={(text) => answer(question, { text_answer: text })}
                onReview={() => reviewWriting(question.id)}
              />
            ))}
          </div>
        ) : (
          <div className={cn('grid gap-5', hasLeftPane && hasRightPane && 'lg:grid-cols-2')}>
            {hasLeftPane && (
              <div className={cn(hasRightPane
                ? 'lg:sticky lg:top-32 lg:max-h-[calc(100vh-9rem)] lg:overflow-y-auto lg:pr-2'
                : 'mx-auto w-full max-w-3xl')}>
                {section.title && (
                  <h2 className="mb-3 text-lg font-bold tracking-tight">{section.title}</h2>
                )}
                {section.audio && (
                  <div className="mb-4">
                    <ExamAudio
                      src={section.audio}
                      playLimit={section.audio_play_limit}
                      playsUsed={exam.audio_plays?.[String(section.id)] ?? 0}
                      onRequestPlay={() => requestAudioPlay(section.id)}
                    />
                  </div>
                )}
                {section.image && (
                  <img src={section.image} alt="" className="mb-4 w-full rounded-2xl border border-border/60" />
                )}
                {section.passage && (
                  <PassageView
                    html={section.passage}
                    annotations={sectionAnnotations}
                    onAnnotationsChange={(next) =>
                      saveAnnotations({ ...annotations, [String(section.id)]: next })}
                    renderGap={gapFor}
                  />
                )}
              </div>
            )}

            <div className={cn('space-y-3', !hasRightPane && 'hidden')}>
              {section.groups.map((group) => (
                <div key={group.id} className="rounded-2xl border border-border/60 bg-card/40 p-4">
                  {group.instruction && (
                    <p className="mb-3 text-sm text-muted-foreground">{group.instruction}</p>
                  )}
                  <div className="space-y-1.5">
                    {group.options.map((option) => (
                      <div key={option.id} className="flex gap-2 text-sm">
                        <span className="w-5 shrink-0 font-bold text-primary">{option.label}</span>
                        <span className="text-muted-foreground">{option.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {sideQuestions.map((question) => (
                  <div key={question.id} className="relative">
                    <ExamQuestion
                      question={question}
                      group={section.groups.find((g) => g.id === question.group_id)}
                      active={activeQuestionId === question.id}
                      onActivate={() => setActiveQuestionId(question.id)}
                      onAnswer={(payload) => answer(question, payload)}
                    />
                    <button
                      type="button"
                      onClick={() => setFlagged((prev) => {
                        const next = new Set(prev);
                        next.has(question.id) ? next.delete(question.id) : next.add(question.id);
                        return next;
                      })}
                      aria-label="Keyin qaytish uchun belgilash"
                      className={cn(
                        'absolute right-3 top-3 rounded-lg p-1.5 transition',
                        flagged.has(question.id)
                          ? 'text-amber-400'
                          : 'text-muted-foreground/40 hover:text-muted-foreground',
                      )}
                    >
                      <Flag className={cn('h-4 w-4', flagged.has(question.id) && 'fill-amber-400')} />
                    </button>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Pastki panel: part'lar orasida yurish va yakunlash */}
        <div className={cn(
          'fixed inset-x-0 bottom-0 z-20 border-t border-border/60 bg-background/90 px-3 py-2.5 backdrop-blur sm:px-5',
          inTelegram && 'pb-5',
        )}>
          <div className="mx-auto flex max-w-[1400px] items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={sectionIndex === 0}
              onClick={() => { setSectionIndex((i) => i - 1); window.scrollTo({ top: 0 }); }}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" /> Oldingi
            </Button>

            <div className="flex min-w-0 flex-1 items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-[width]"
                  style={{ width: `${totals.total ? (totals.answered / totals.total) * 100 : 0}%` }}
                />
              </div>
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
            </div>

            {sectionIndex < sections.length - 1 ? (
              <Button
                size="sm"
                onClick={() => { setSectionIndex((i) => i + 1); window.scrollTo({ top: 0 }); }}
                className="gap-1"
              >
                Keyingi <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button size="sm" onClick={() => setShowExit(true)} disabled={finishing}>
                {finishing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Yakunlash'}
              </Button>
            )}
          </div>
        </div>
      </main>

      <Dialog open={showPalette} onOpenChange={setShowPalette}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Savollar xaritasi</DialogTitle>
            <DialogDescription>
              Yashil — javoblangan, bayroqcha — keyin qaytish uchun belgilangan.
            </DialogDescription>
          </DialogHeader>
          <QuestionPalette
            sections={sections}
            activeQuestionId={activeQuestionId}
            flagged={flagged}
            onJump={jump}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showExit} onOpenChange={setShowExit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Testni yakunlaysizmi?</DialogTitle>
            <DialogDescription>
              {totals.answered < totals.total
                ? `${totals.total - totals.answered} ta savol javobsiz qolgan. Yakunlangach javoblarni o'zgartirib bo'lmaydi.`
                : "Barcha savollarga javob berdingiz. Yakunlangach javoblarni o'zgartirib bo'lmaydi."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowExit(false)}>Davom etaman</Button>
            <Button onClick={finish} disabled={finishing}>
              {finishing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Yakunlash'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
