'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { celebrate } from '@/lib/confetti';
import { Clock, ArrowLeft, ArrowRight, CheckCircle2, AlertCircle, AlertTriangle, Layers, X, Volume2, LogOut, Wifi, WifiOff, RefreshCw, Check } from 'lucide-react';
import { apiFetch, ApiError } from '@/lib/api-client';
import {
  tgHaptic, useIsTelegram, useTelegramBackButton, useTelegramClosingConfirmation, useTelegramMainButton,
} from '@/lib/telegram';
import { useAuthStore } from '@/lib/auth-store';
import { soundFX } from '@/lib/soundFX';
import type { QuestionData } from '@/lib/test-types';
import AppShell from '@/components/AppShell';
import SingleChoiceQuestion from '@/components/questions/SingleChoiceQuestion';
import MatchingQuestion from '@/components/questions/MatchingQuestion';
import GroupedItemQuestion from '@/components/questions/GroupedItemQuestion';
import OpenWrittenQuestion from '@/components/questions/OpenWrittenQuestion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const DIFFICULTY_LABEL: Record<string, string> = { easy: 'Oson', medium: "O'rta", hard: 'Qiyin' };
const DIFFICULTY_TONE: Record<string, string> = {
  easy: 'border-[var(--accent)]/25 bg-primary/15 text-[var(--accent-text)]',
  medium: 'border-amber-500/25 bg-amber-500/15 text-amber-300',
  hard: 'border-rose-500/25 bg-rose-500/15 text-rose-300',
};

/* O'quvchi tanlaydigan o'qish o'lchamlari. rem qiymatlari --reading-size CSS o'zgaruvchisiga
   beriladi, tanlov localStorage da saqlanadi — keyingi testda ham o'sha o'lcham qoladi. */
const FONT_STEPS = [
  { key: 'sm', label: 'A-', rem: '0.9375rem' },
  { key: 'md', label: 'A', rem: '1.0625rem' },
  { key: 'lg', label: 'A+', rem: '1.25rem' },
] as const;
type FontKey = (typeof FONT_STEPS)[number]['key'];

type PendingAnswer = {
  question_id: number;
  q_idx: number;
  payload: Record<string, unknown>;
  timestamp: number;
};

function formatTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function TestScreenPage() {
  const { id: _unused, attemptId } = useParams<{ id?: string; attemptId: string }>();
  const router = useRouter();
  const { access, authReady } = useAuthStore();
  const [data, setData] = useState<QuestionData | null>(null);
  const [qIdx, setQIdx] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [showJumpDrawer, setShowJumpDrawer] = useState(false);
  const [answeredIdxs, setAnsweredIdxs] = useState<Set<number>>(new Set());
  const [fontKey, setFontKey] = useState<FontKey>('md');
  const inTelegram = useIsTelegram();

  // Offline resilience holatlari
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced'>('idle');
  const isSyncingRef = useRef(false);

  const pendingKey = `ilm_pending_answers_${attemptId}`;
  const cacheKey = `ilm_cached_questions_${attemptId}`;

  // Offline saqlash yordamchilari
  const getPendingQueue = useCallback((): PendingAnswer[] => {
    try {
      const raw = localStorage.getItem(pendingKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }, [pendingKey]);

  const savePendingQueue = useCallback((queue: PendingAnswer[]) => {
    try {
      localStorage.setItem(pendingKey, JSON.stringify(queue));
      setPendingCount(queue.length);
    } catch {
      // quota or private mode fallback
    }
  }, [pendingKey]);

  const getCachedQuestions = useCallback((): Record<number, QuestionData> => {
    try {
      const raw = localStorage.getItem(cacheKey);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }, [cacheKey]);

  const cacheQuestion = useCallback((qData: QuestionData) => {
    try {
      const all = getCachedQuestions();
      all[qData.q_idx] = qData;
      localStorage.setItem(cacheKey, JSON.stringify(all));
    } catch {
      // ignore
    }
  }, [cacheKey, getCachedQuestions]);

  /* Telegram Mini App: imtihon davomida ilova tasodifan yopilsa javoblar oralig'i
     yo'qoladi — yopishdan oldin Telegram tasdiq so'raydi. Telegramdan tashqarida
     bu chaqiruvlar hech narsa qilmaydi. */
  useTelegramClosingConfirmation(true);

  // Telegram'ning "orqaga" tugmasi ham xuddi sahifadagi chiqish tugmasi kabi
  // tasdiqlash modalini ochadi, imtihondan to'g'ridan-to'g'ri chiqarib yubormaydi.
  useTelegramBackButton(() => setShowExitModal(true));

  // Zen Mode: imtihon davomida sidebar/header/tab-bar yashiriladi.
  useEffect(() => {
    document.documentElement.dataset.zen = 'on';
    return () => { delete document.documentElement.dataset.zen; };
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('ilm_reading_size') as FontKey | null;
    if (saved && FONT_STEPS.some((s) => s.key === saved)) setFontKey(saved);
  }, []);

  useEffect(() => {
    const step = FONT_STEPS.find((s) => s.key === fontKey) ?? FONT_STEPS[1];
    document.documentElement.style.setProperty('--reading-size', step.rem);
    localStorage.setItem('ilm_reading_size', fontKey);
    return () => { document.documentElement.style.removeProperty('--reading-size'); };
  }, [fontKey]);

  // Online / Offline hodisalarini kuzatish
  useEffect(() => {
    setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);
    setPendingCount(getPendingQueue().length);

    const onOnline = () => {
      setIsOnline(true);
      toast.success("Internet aloqasi tiklandi! Javoblar sinxronlanmoqda...", { duration: 3000 });
      flushPendingQueue();
    };

    const onOffline = () => {
      setIsOnline(false);
      toast.warning("Internet aloqasi uzildi. Oflayn rejimda ishlash davom etmoqda — javoblaringiz xavfsiz saqlanadi!", { duration: 4000 });
    };

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Navbatdagi javoblarni serverga sinxronlash (Background Sync)
  const flushPendingQueue = useCallback(async () => {
    if (isSyncingRef.current) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;

    const queue = getPendingQueue();
    if (queue.length === 0) return;

    isSyncingRef.current = true;
    setSyncStatus('syncing');

    let remaining = [...queue];
    for (const item of queue) {
      try {
        await apiFetch(`/api/tests/attempts/${attemptId}/answer/`, {
          method: 'POST',
          body: JSON.stringify({ question_id: item.question_id, q_idx: item.q_idx, ...item.payload }),
        });
        remaining = remaining.filter((r) => !(r.question_id === item.question_id && r.timestamp === item.timestamp));
        savePendingQueue(remaining);
      } catch {
        // Serverga yetib bormadi — navbatda qoladi
        break;
      }
    }

    isSyncingRef.current = false;
    if (remaining.length === 0) {
      setSyncStatus('synced');
      setTimeout(() => setSyncStatus('idle'), 3000);
    } else {
      setSyncStatus('idle');
    }
  }, [attemptId, getPendingQueue, savePendingQueue]);

  // Har 6 soniyada navbatda javob bo'lsa fonda sinxronlab turish
  useEffect(() => {
    const interval = setInterval(() => {
      if (getPendingQueue().length > 0 && navigator.onLine) {
        flushPendingQueue();
      }
    }, 6000);
    return () => clearInterval(interval);
  }, [flushPendingQueue, getPendingQueue]);

  const load = useCallback((idx: number) => {
    // Agar oflayn bo'lsa yoki tezkor navigatsiya uchun — avval keshdan qidiramiz
    const cachedMap = getCachedQuestions();
    if (cachedMap[idx]) {
      setData(cachedMap[idx]);
      setQIdx(idx);
    }

    // Serverga so'rov (agar online bo'lsa yangi ma'lumotlarni oladi)
    if (typeof navigator === 'undefined' || navigator.onLine) {
      apiFetch<QuestionData>(`/api/tests/attempts/${attemptId}/question/?q_idx=${idx}`)
        .then((d) => {
          setData(d);
          setQIdx(d.q_idx);
          cacheQuestion(d);
        })
        .catch((e: unknown) => {
          if (e instanceof ApiError && e.status === 409) {
            router.push(`/tests/${attemptId}/feedback`);
            return;
          }
          // Agar keshda yo'q bo'lsa va xato bersa
          if (!cachedMap[idx]) {
            setError(e instanceof Error ? e.message : 'Xatolik');
          }
        });
    }
  }, [attemptId, cacheQuestion, getCachedQuestions, router]);

  useEffect(() => {
    if (authReady && !access) {
      router.replace(`/login?next=${encodeURIComponent(`/tests/${attemptId}`)}`);
      return;
    }
    if (access) load(qIdx);
  }, [authReady, access, attemptId, load, qIdx, router]);

  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  // Local countdown between server syncs
  useEffect(() => {
    if (typeof data?.seconds_left === 'number') {
      setSecondsLeft(data.seconds_left);
    }
  }, [data?.seconds_left]);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  async function submit(payload: Record<string, unknown>) {
    if (!data) return;

    // 1. Optimistic UI update — foydalanuvchiga darhol tanlangan deb ko'rsatamiz
    const currentQIdx = qIdx;
    const currentQuestionId = data.question.id;
    let updatedLocalData: QuestionData = { ...data };

    if (payload.choice_id !== undefined) {
      updatedLocalData.selected_choice_id = payload.choice_id as number;
    }
    if (payload.group_option_id !== undefined) {
      updatedLocalData.selected_group_option_id = payload.group_option_id as number;
    }
    if (payload.matches !== undefined && updatedLocalData.matching_rows) {
      const matchObj = payload.matches as Record<string, string>;
      updatedLocalData.matching_rows = updatedLocalData.matching_rows.map((r) => ({
        ...r,
        selected_right_key: matchObj[r.left_key] ?? r.selected_right_key,
      }));
    }
    if (payload.text_answer !== undefined) {
      updatedLocalData.text_answer = payload.text_answer as string;
    }

    setData(updatedLocalData);
    cacheQuestion(updatedLocalData);
    setAnsweredIdxs((prev) => new Set(prev).add(currentQIdx));
    tgHaptic('select');

    // 2. Offline Queue ga joylash
    const queue = getPendingQueue();
    const item: PendingAnswer = {
      question_id: currentQuestionId,
      q_idx: currentQIdx,
      payload,
      timestamp: Date.now(),
    };
    const nextQueue = [...queue.filter((q) => q.question_id !== currentQuestionId), item];
    savePendingQueue(nextQueue);

    // 3. Agar internet bo'lsa, darhol serverga jo'natish
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      try {
        const updated = await apiFetch<QuestionData>(`/api/tests/attempts/${attemptId}/answer/`, {
          method: 'POST',
          body: JSON.stringify({ question_id: currentQuestionId, q_idx: currentQIdx, ...payload }),
        });
        setData(updated);
        cacheQuestion(updated);
        // Queue dan chiqarib tashlash
        const currentQ = getPendingQueue().filter((q) => q.question_id !== currentQuestionId);
        savePendingQueue(currentQ);
        setSyncStatus('synced');
        setTimeout(() => setSyncStatus('idle'), 2500);
      } catch {
        // Tarmoq xatosi yuz berganda sahifani buzmaymiz, javob local queue da qoladi
        setSyncStatus('idle');
      }
    }
  }

  async function finish() {
    // Agar oflayn bo'lsa va saqlanmagan javoblar bo'lsa — ogohlantiramiz
    const pending = getPendingQueue();
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      toast.error("Oflayn holatda testni yakunlay olmaysiz. Iltimos, internetga ulaning!", { duration: 4000 });
      return;
    }

    if (pending.length > 0) {
      setSyncStatus('syncing');
      await flushPendingQueue();
    }

    setFinishing(true);
    try {
      await apiFetch(`/api/tests/attempts/${attemptId}/finish/`, { method: 'POST' });
      soundFX.fanfare();
      tgHaptic('success');
      // Tozalash
      try {
        localStorage.removeItem(pendingKey);
        localStorage.removeItem(cacheKey);
      } catch { /* noop */ }
      try { celebrate({ particleCount: 80, spread: 70, origin: { y: 0.6 } }); } catch { /* noop */ }
      router.push(`/tests/${attemptId}/feedback`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xatolik');
      tgHaptic('error');
      setFinishing(false);
    }
  }

  /* Oxirgi savolda Telegram'ning nativ pastki tugmasi "Yakunlash" bo'lib chiqadi */
  useTelegramMainButton(
    data && !data.has_next ? 'Imtihonni Yakunlash' : null,
    finish,
    { loading: finishing },
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!data || showExitModal) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const q = data.question;
      const isChoiceType = q.type === 'single_choice' || q.type === 'image_based' || q.type === 'table_based';

      if (isChoiceType && data.choices) {
        const letterIdx = 'abcdef'.indexOf(e.key.toLowerCase());
        const numIdx = '123456'.indexOf(e.key);
        const idx = letterIdx >= 0 ? letterIdx : numIdx;
        if (idx >= 0 && idx < data.choices.length) {
          submit({ choice_id: data.choices[idx].id });
          return;
        }
      }
      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        if (data.has_next) load(data.next_idx);
      } else if (e.key === 'ArrowLeft') {
        if (data.has_prev) load(data.prev_idx);
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) {
    return (
      <>
        <AppShell />
        <main className="page-shell-focus flex-1 p-6">
          <Card className="border-rose-500/25 bg-rose-500/10">
            <CardContent className="pt-6 text-sm text-rose-300">{error}</CardContent>
          </Card>
        </main>
      </>
    );
  }

  if (!data) {
    return (
      <>
        <AppShell />
        <main className="page-shell-focus flex-1 space-y-5 p-4 sm:p-6">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-96 w-full" />
        </main>
      </>
    );
  }

  const q = data.question;
  const timeLeft = secondsLeft ?? data.seconds_left;
  const progress = (answeredIdxs.size / Math.max(1, data.total_questions)) * 100;

  return (
    <>
      <AppShell />
      <main className="page-shell-focus flex-1 space-y-8 bg-[var(--bg-page)] p-4 pb-24 sm:p-6 sm:pb-12">
        {/* Sticky boshqaruv paneli */}
        <Card className="sticky top-2 z-20 gap-0 border-[var(--border-card)] bg-[var(--surface-card-strong)]/95 py-0 shadow-lg backdrop-blur-xl">
          <CardContent className="space-y-2 p-3 sm:p-4">
            <div className="flex items-center justify-between gap-2 sm:gap-3">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost" size="icon" className="size-8 rounded-xl text-muted-foreground hover:bg-rose-500/20 hover:text-rose-400 shrink-0"
                  title="Imtihondan chiqish" onClick={() => setShowExitModal(true)}
                >
                  <X className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowJumpDrawer(!showJumpDrawer)}
                  className="h-8 rounded-xl px-2.5 sm:px-3 text-xs font-semibold gap-1.5 shrink-0"
                >
                  <Layers className="size-3.5 text-primary" />
                  <span>Savol <span className="font-mono tabular-nums text-primary">{data.q_idx}</span>/{data.total_questions}</span>
                </Button>
              </div>

              {/* Status badges: Oflayn / Sinxronlash / Saqlandi */}
              {!isOnline && (
                <Badge
                  variant="outline"
                  className="animate-pulse border-amber-500/40 bg-amber-500/15 text-amber-600 dark:text-amber-400 gap-1 text-[11px] font-medium h-7 px-2"
                  title="Internet aloqasi yo'q. Belgilangan javoblaringiz xavfsiz saqlanmoqda."
                >
                  <WifiOff className="size-3" />
                  <span className="hidden xs:inline">Oflayn</span>
                  {pendingCount > 0 && <span className="font-mono tabular-nums">({pendingCount})</span>}
                </Badge>
              )}
              {isOnline && syncStatus === 'syncing' && (
                <Badge
                  variant="outline"
                  className="border-sky-500/40 bg-sky-500/15 text-sky-600 dark:text-sky-400 gap-1 text-[11px] font-medium h-7 px-2"
                >
                  <RefreshCw className="size-3 animate-spin" />
                  <span className="hidden sm:inline">Sinxronlanmoqda...</span>
                </Badge>
              )}
              {isOnline && syncStatus === 'synced' && (
                <Badge
                  variant="outline"
                  className="border-emerald-500/40 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 gap-1 text-[11px] font-medium h-7 px-2"
                >
                  <Check className="size-3" />
                  <span className="hidden sm:inline">Saqlandi</span>
                </Badge>
              )}

              <span className="hidden font-mono text-xs text-[var(--text-faint)] xl:inline">A-D tanlash · → keyingi · ← oldingi</span>

              {/* O'ng tomon: Matn o'lchami va Taymer */}
              <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
                {/* Mobilda: ixcham 1 ta harf tugmasi (bosganda A- -> A -> A+ aylanadi) */}
                <button
                  type="button"
                  onClick={() => setFontKey((prev) => (prev === 'sm' ? 'md' : prev === 'md' ? 'lg' : 'sm'))}
                  className="sm:hidden flex size-8 items-center justify-center rounded-xl border border-[var(--border-card)] bg-[var(--surface-hover)] font-mono text-xs font-bold text-muted-foreground hover:text-foreground active:scale-95 transition-all"
                  title="Matn o'lchamini almashtirish"
                >
                  {fontKey === 'sm' ? 'A-' : fontKey === 'lg' ? 'A+' : 'A'}
                </button>

                {/* Desktopda: 3 ta alohida tugma */}
                <div className="hidden sm:flex items-center gap-0.5 rounded-xl border bg-[var(--surface-hover)] p-0.5" title="Matn o'lchami">
                  {FONT_STEPS.map((s) => (
                    <button
                      key={s.key}
                      onClick={() => setFontKey(s.key)}
                      aria-pressed={fontKey === s.key}
                      className={cn(
                        'rounded-lg px-2 py-1 font-mono text-xs font-bold transition-colors',
                        fontKey === s.key ? 'bg-primary text-[var(--on-accent)]' : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>

                {/* Taymer nishoni — chiroyli, mutanosib va sig'adigan */}
                {typeof timeLeft === 'number' && (
                  <div
                    className={cn(
                      'flex items-center gap-1.5 rounded-xl px-2.5 sm:px-3 h-8 text-xs font-mono font-bold tabular-nums border transition-colors shrink-0 shadow-sm',
                      timeLeft < 300
                        ? 'animate-pulse border-rose-500/30 bg-rose-500/15 text-rose-500'
                        : 'border-primary/25 bg-primary/10 text-primary',
                    )}
                  >
                    <Clock className="size-3.5" />
                    <span>{formatTime(timeLeft)}</span>
                  </div>
                )}
              </div>
            </div>

            <Progress value={progress} className="h-1 sm:h-1.5" />
          </CardContent>
        </Card>

        {showJumpDrawer && (
          <Card className="animate-fadeIn">
            <CardContent className="space-y-3 pt-6">
              <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
                <span>Barcha savollar bo&apos;yicha tezkor o&apos;tish:</span>
                <span>{answeredIdxs.size} / {data.total_questions} ta yechildi</span>
              </div>
              <div className="grid grid-cols-6 gap-2 sm:grid-cols-12">
                {Array.from({ length: data.total_questions }, (_, i) => i + 1).map((n) => {
                  const isAnswered = answeredIdxs.has(n);
                  return (
                    <Button
                      key={n}
                      size="sm"
                      variant={n === data.q_idx ? 'default' : isAnswered ? 'secondary' : 'outline'}
                      className={cn('h-9 px-0 text-xs font-bold', isAnswered && n !== data.q_idx && 'text-[var(--accent-text)]')}
                      onClick={() => { load(n); setShowJumpDrawer(false); }}
                    >
                      {n}
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Savol */}
        <Card>
          <CardContent className="space-y-6 p-5 sm:p-8">
            <div className="flex items-center justify-between gap-3">
              <Badge variant="secondary">Savol {data.q_idx}</Badge>
              <Badge variant="outline" className={DIFFICULTY_TONE[q.difficulty] || DIFFICULTY_TONE.medium}>
                {DIFFICULTY_LABEL[q.difficulty] || q.difficulty}
              </Badge>
            </div>
            <Separator />

            {/* reading-block: 70ch measure + 1.65 line-height + A-/A/A+ boshqaradigan
                --reading-size. Ilgari o'lcham qattiq yozilgan (text-base/sm:text-lg) edi.
                Teg <h2> emas, <div>: PDF dan import qilingan savol matni bir nechta <p>
                dan va jadvaldan iborat bo'lishi mumkin, brauzer esa <table> ni ko'rgan
                zahoti <h2> ni yopib yuboradi va jadval savoldan tashqarida qolib ketardi. */}
            <div
              role="heading"
              aria-level={2}
              className="reading-block font-bold"
              dangerouslySetInnerHTML={{ __html: q.body }}
            />

            {q.image && (
              <div className="overflow-hidden rounded-2xl border bg-black/20">
                <img src={q.image} alt="" className="max-h-72 w-full object-contain" />
              </div>
            )}

            {q.audio_url && (
              <div className="flex items-center gap-3 rounded-2xl border bg-[var(--surface-input)] p-3">
                <Volume2 className="size-4 text-muted-foreground" />
                <audio src={q.audio_url} controls className="h-8 w-full text-xs" />
              </div>
            )}

            {(q.type === 'single_choice' || q.type === 'image_based' || q.type === 'table_based') && (
              <SingleChoiceQuestion data={data} onSelect={(choiceId) => submit({ choice_id: choiceId })} />
            )}
            {q.type === 'matching' && (
              <MatchingQuestion
                data={data}
                onChange={(leftKey, rightKey) => {
                  const matches = Object.fromEntries((data.matching_rows || []).map((r) => [r.left_key, r.selected_right_key]));
                  matches[leftKey] = rightKey;
                  submit({ matches });
                }}
              />
            )}
            {q.type === 'grouped_item' && (
              <GroupedItemQuestion data={data} onSelect={(optionId) => submit({ group_option_id: optionId })} />
            )}
            {q.type === 'open_written' && (
              <OpenWrittenQuestion data={data} onSave={(payload) => submit(payload)} />
            )}

            {/* Desktop klaviatura eslatmasi */}
            <div className="hidden sm:flex items-center justify-between border-t border-[var(--border-card)] pt-3 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <kbd className="rounded border border-[var(--border-strong)] bg-[var(--surface-hover)] px-1.5 py-0.5 font-mono text-[10px]">A-D</kbd> yoki <kbd className="rounded border border-[var(--border-strong)] bg-[var(--surface-hover)] px-1.5 py-0.5 font-mono text-[10px]">1-4</kbd> — variantni tanlash
              </span>
              <span className="flex items-center gap-1.5">
                <kbd className="rounded border border-[var(--border-strong)] bg-[var(--surface-hover)] px-1.5 py-0.5 font-mono text-[10px]">Enter</kbd> yoki <kbd className="rounded border border-[var(--border-strong)] bg-[var(--surface-hover)] px-1.5 py-0.5 font-mono text-[10px]">→</kbd> — keyingi savol
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Navigatsiya — mobilda pastga yopishtirilgan */}
        <div className="exam-bottom-bar fixed bottom-0 left-0 right-0 z-30 flex items-center justify-between gap-3 border-t bg-[var(--surface-card-strong)]/95 p-3 backdrop-blur-lg sm:static sm:border-t-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
          <Button variant="outline" size="lg" disabled={!data.has_prev} onClick={() => load(data.prev_idx)}>
            <ArrowLeft className="size-4" /> Oldingi
          </Button>

          {data.has_next ? (
            <Button size="lg" onClick={() => load(data.next_idx)}>
              Keyingi <ArrowRight className="size-4" />
            </Button>
          ) : inTelegram ? (
            /* Telegram'da yakunlash Telegram'ning o'z pastki tugmasi orqali —
               ikkita bir xil tugma bir-birining ustida turmasligi uchun. */
            null
          ) : (
            <Button
              size="lg"
              onClick={finish}
              disabled={finishing}
              className="animate-pulse bg-[var(--success)] text-white shadow-lg shadow-[var(--success)]/35 hover:bg-[var(--success)]/90"
            >
              <CheckCircle2 className="size-4" /> {finishing ? 'Yakunlanmoqda...' : 'Imtihonni Yakunlash'}
            </Button>
          )}
        </div>

        <Dialog open={showExitModal} onOpenChange={setShowExitModal}>
          <DialogContent className="w-[calc(100%-1.5rem)] max-w-md rounded-3xl border border-amber-500/30 bg-[var(--surface-card-strong)] p-6 shadow-2xl mx-auto">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 shadow-lg shadow-amber-500/10">
                <AlertTriangle className="size-7" />
              </div>

              <div className="space-y-1.5">
                <DialogTitle className="text-lg sm:text-xl font-black text-foreground">
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
                <p className="text-[11px] text-amber-300/80">
                  Sahifani tark etsangiz ham taymer orqa fonda hisoblanadi. Javoblaringiz esa saqlab qolinadi.
                </p>
              </div>

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
                  onClick={() => setShowExitModal(false)}
                  className="w-full sm:w-auto flex-1 rounded-2xl font-black bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] transition-all text-white shadow-lg shadow-emerald-600/30 h-12 sm:h-12.5 text-sm sm:text-base gap-2"
                >
                  <CheckCircle2 className="size-5" />
                  Davom etish
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </>
  );
}
