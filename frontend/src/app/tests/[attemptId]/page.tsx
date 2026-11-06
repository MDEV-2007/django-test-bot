'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { celebrate } from '@/lib/confetti';
import { Clock, ArrowLeft, ArrowRight, CheckCircle2, AlertCircle, AlertTriangle, Layers, X, Volume2, LogOut, WifiOff, RefreshCw, Check, FileSpreadsheet, Sparkles } from 'lucide-react';
import { apiFetch, ApiError } from '@/lib/api-client';
import { useExamAntiCheat } from '@/hooks/useExamAntiCheat';
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
import BmbStressBar from '@/components/stress/BmbStressBar';
import BmbBubbleSheet from '@/components/stress/BmbBubbleSheet';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const DIFFICULTY_LABEL: Record<string, string> = { easy: 'Oson', medium: "O'rta", hard: 'Qiyin' };

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
  const [finishNetworkError, setFinishNetworkError] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [showJumpDrawer, setShowJumpDrawer] = useState(false);
  const [answeredIdxs, setAnsweredIdxs] = useState<Set<number>>(new Set());
  const [fontKey, setFontKey] = useState<FontKey>('md');
  const inTelegram = useIsTelegram();
  useExamAntiCheat(attemptId, Boolean(data?.anti_cheat));

  // BMB Real Imtihon Zali (Stress Mode) holatlari
  const [isStressMode, setIsStressMode] = useState(false);
  const [titulAnswers, setTitulAnswers] = useState<Record<string, string>>({});
  const [draftAnswersMap, setDraftAnswersMap] = useState<Record<number, string | null>>({});
  const [showTitulDrawer, setShowTitulDrawer] = useState(false);
  const [showUncopiedWarningModal, setShowUncopiedWarningModal] = useState(false);

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

  // 45 Daqiqalik Imtihonda Javoblarni Yo'qotmaslik (Local Backup)
  const backupKey = `ilmildizi_exam_backup_${attemptId}`;

  // Mount paytida xotiradan tiklash
  useEffect(() => {
    try {
      const raw = localStorage.getItem(backupKey);
      if (raw) {
        const b = JSON.parse(raw);
        let restored = false;
        if (b.answers && typeof b.answers === 'object' && Object.keys(b.answers).length > 0) {
          setDraftAnswersMap((prev) => ({ ...b.answers, ...prev }));
          restored = true;
        }
        if (b.bubbleSheet && typeof b.bubbleSheet === 'object' && Object.keys(b.bubbleSheet).length > 0) {
          setTitulAnswers((prev) => ({ ...b.bubbleSheet, ...prev }));
          restored = true;
        }
        if (Array.isArray(b.answeredIdxs) && b.answeredIdxs.length > 0) {
          setAnsweredIdxs((prev) => new Set([...prev, ...b.answeredIdxs]));
          restored = true;
        }
        if (restored) {
          toast.success("✅ Belgilangan javoblaringiz xotiradan tiklandi");
        }
      }
    } catch (e) {
      console.warn("Backup restore failed:", e);
    }
  }, [backupKey]);

  // Har bir javob o'zgarganda avtomatik saqlash
  useEffect(() => {
    const hasAny = Object.keys(draftAnswersMap).length > 0 || Object.keys(titulAnswers).length > 0;
    if (!hasAny) return;
    try {
      localStorage.setItem(backupKey, JSON.stringify({
        answers: draftAnswersMap,
        openAnswers: {},
        bubbleSheet: titulAnswers,
        answeredIdxs: Array.from(answeredIdxs),
        updatedAt: Date.now(),
      }));
    } catch {
      // quota or private mode fallback
    }
  }, [backupKey, draftAnswersMap, titulAnswers, answeredIdxs]);

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
          if (d.is_stress_mode) setIsStressMode(true);
          if (d.titul_answers) {
            setTitulAnswers((prev) => ({ ...d.titul_answers, ...prev }));
          }
          if (d.selected_choice_id && d.choices) {
            const cIdx = d.choices.findIndex((c) => c.id === d.selected_choice_id);
            if (cIdx >= 0) {
              setDraftAnswersMap((prev) => ({ ...prev, [d.q_idx]: String.fromCharCode(65 + cIdx) }));
            }
          }
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
      if (data.choices) {
        const cIdx = data.choices.findIndex((c) => c.id === payload.choice_id);
        if (cIdx >= 0) {
          const letter = String.fromCharCode(65 + cIdx);
          setDraftAnswersMap((prev) => ({ ...prev, [currentQIdx]: letter }));
        }
      }
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

  // BMB Titul Varaqasi (Bubble Sheet) katagini to'ldirish
  async function handleBubbleSelect(questionIndex: number, letter: string) {
    const sIdx = String(questionIndex);
    const updated = { ...titulAnswers };
    if (letter) {
      updated[sIdx] = letter;
    } else {
      delete updated[sIdx];
    }
    setTitulAnswers(updated);

    try {
      await apiFetch(`/api/tests/attempts/${attemptId}/bubble-answer/`, {
        method: 'POST',
        body: JSON.stringify({ q_idx: questionIndex, letter }),
      });
    } catch {
      // offline or silent fallback
    }
  }

  // Barcha qoralamadagi javoblarni Titul varaqasiga avtomatik ko'chirish
  async function syncAllDraftsToTitul() {
    const updated = { ...titulAnswers };
    Object.entries(draftAnswersMap).forEach(([idx, letter]) => {
      if (letter) updated[idx] = letter;
    });
    setTitulAnswers(updated);
    try {
      await apiFetch(`/api/tests/attempts/${attemptId}/bubble-answer/`, {
        method: 'POST',
        body: JSON.stringify({ answers: updated }),
      });
    } catch {}
    toast.success("Barcha qoralamadagi javoblar Titul varaqasiga ko'chirildi!");
  }

  async function finish(bypassUncopiedWarning = false) {
    // Agar stress rejimida bo'lsa va titulga ko'chirilmagan javoblar bo'lsa
    if (isStressMode && !bypassUncopiedWarning) {
      const uncopied = Object.entries(draftAnswersMap).filter(([k, v]) => v && !titulAnswers[k]).length;
      if (uncopied > 0) {
        setShowUncopiedWarningModal(true);
        return;
      }
    }

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
    setFinishNetworkError(false);
    try {
      await apiFetch(`/api/tests/attempts/${attemptId}/finish/`, {
        method: 'POST',
        body: JSON.stringify({ titul_answers: titulAnswers }),
      });
      soundFX.fanfare();
      tgHaptic('success');
      // Muvaffaqiyatli topshirilgachгина tozalaymiz
      try {
        localStorage.removeItem(pendingKey);
        localStorage.removeItem(cacheKey);
        localStorage.removeItem(`ilmildizi_exam_backup_${attemptId}`);
      } catch { /* noop */ }
      try { celebrate({ particleCount: 80, spread: 70, origin: { y: 0.6 } }); } catch { /* noop */ }
      router.push(`/tests/${attemptId}/feedback`);
    } catch (e) {
      setError("Tarmoq xatosi — javoblaringiz xavfsiz saqlandi.");
      setFinishNetworkError(true);
      toast.error("🔄 Tarmoq xatosi — javoblaringiz xavfsiz saqlandi. Qayta yuborish tugmasini bosing.");
      tgHaptic('error');
      setFinishing(false);
    }
  }

  /* Javobsiz savol qolgan bo'lsa avval so'raladi: ilgari "Yakunlash" darhol topshirardi
     va tasodifiy bosish bilan test yarim yo'lda tugab qolardi. Stress rejimining o'z
     ogohlantirishi bor (titulga ko'chirilmagan javoblar), u finish() ichida. */
  const unansweredCount = data ? Math.max(0, data.total_questions - answeredIdxs.size) : 0;
  function requestFinish() {
    if (!isStressMode && unansweredCount > 0) {
      setShowFinishConfirm(true);
      return;
    }
    finish();
  }

  /* Oxirgi savolda Telegram'ning nativ pastki tugmasi "Yakunlash" bo'lib chiqadi */
  useTelegramMainButton(
    data && !data.has_next ? 'Imtihonni Yakunlash' : null,
    requestFinish,
    { loading: finishing },
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!data || showExitModal) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const q = data.question;
      const isChoiceType = q.type === 'single_choice' || q.type === 'image_based' || q.type === 'table_based' || (q.type as string) === 'mcq';

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
      <div className="theme-pastel min-h-screen w-full">
        <AppShell />
        <main className="page-shell-focus flex-1 p-6">
          <div className="ps-card flex items-start gap-3 p-6">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--ps-coral)] text-white">
              <AlertCircle className="size-5" />
            </span>
            <p className="pt-2 text-sm font-semibold">{error}</p>
          </div>
        </main>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="theme-pastel min-h-screen w-full">
        <AppShell />
        <main className="page-shell-focus flex-1 space-y-5 p-4 sm:p-6">
          <Skeleton className="h-20 w-full rounded-[28px] bg-white/40" />
          <Skeleton className="h-96 w-full rounded-[32px] bg-white/40" />
        </main>
      </div>
    );
  }

  const q = data.question;
  const timeLeft = secondsLeft ?? data.seconds_left;
  const progress = (answeredIdxs.size / Math.max(1, data.total_questions)) * 100;

  const uncopiedCount = Object.entries(draftAnswersMap).filter(([k, v]) => v && !titulAnswers[k]).length;

  return (
    <div className="theme-pastel min-h-screen w-full">
      <AppShell />
      <main className={cn(
        "flex-1 space-y-5 sm:space-y-6 p-3 sm:p-5 lg:p-6 pb-28 sm:pb-14 mx-auto w-full",
        isStressMode ? "page-shell-wide" : "page-shell-focus"
      )}>
        {/* Real BMB Imtihon Zali Audio-bosim boshqaruv paneli */}
        {isStressMode && (
          <BmbStressBar
            secondsLeft={timeLeft ?? null}
            onOpenBubbleDrawer={() => setShowTitulDrawer(true)}
            uncopiedCount={uncopiedCount}
          />
        )}

        {/* ── Yuqori boshqaruv paneli: suzuvchi pill ─────────────────── */}
        <div className="ps-runner-bar sticky top-2 z-30 rounded-[28px] p-2.5 sm:top-3 sm:p-3">
          <div className="flex items-center justify-between gap-2 sm:gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <button
                type="button"
                title="Imtihondan chiqish"
                aria-label="Imtihondan chiqish"
                onClick={() => setShowExitModal(true)}
                className="ps-runner-icon flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full transition-transform hover:rotate-90"
              >
                <X className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => setShowJumpDrawer(!showJumpDrawer)}
                aria-expanded={showJumpDrawer}
                className="ps-runner-count flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-full pl-1.5 pr-3.5 text-sm font-bold"
              >
                <span className="flex size-7 items-center justify-center rounded-full bg-[var(--ps-orange)] text-[#080808]">
                  <Layers className="size-3.5" />
                </span>
                <span className="tabular-nums">
                  {data.q_idx}<span className="opacity-50">/{data.total_questions}</span>
                </span>
              </button>

              {/* Holat: oflayn himoya / sinxron */}
              {!isOnline ? (
                <span
                  className="flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-[var(--ps-orange)] px-3 text-xs font-bold text-[#080808] animate-pulse"
                  title="Internet aloqasi yo'q. Belgilangan javoblaringiz xavfsiz saqlanmoqda."
                >
                  <WifiOff className="size-3.5" />
                  <span>Oflayn{pendingCount > 0 ? ` (${pendingCount})` : ''}</span>
                </span>
              ) : syncStatus === 'syncing' ? (
                <span className="ps-runner-chip flex h-10 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-bold">
                  <RefreshCw className="size-3.5 animate-spin text-[var(--ps-blue)]" />
                  <span className="hidden sm:inline">Sinxronlanmoqda...</span>
                </span>
              ) : syncStatus === 'synced' ? (
                <span className="ps-runner-chip flex h-10 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-bold">
                  <Check className="size-3.5 text-[var(--ps-green)]" />
                  <span className="hidden sm:inline">Saqlandi</span>
                </span>
              ) : (
                <span
                  className="ps-runner-chip hidden h-10 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-bold min-[420px]:flex"
                  title="Offline himoya faol: har bir belgilagan javobingiz lokal xotiraga zaxiralanadi va internet uzilsa ham saqlanadi"
                >
                  <span className="size-2 rounded-full bg-[var(--ps-green)] animate-pulse" />
                  Himoyalangan
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Mobilda: bitta harf tugmasi (A- → A → A+) */}
              <button
                type="button"
                onClick={() => setFontKey((prev) => (prev === 'sm' ? 'md' : prev === 'md' ? 'lg' : 'sm'))}
                className="ps-runner-icon flex size-10 items-center justify-center rounded-full text-xs font-bold active:scale-95 sm:hidden"
                title="Matn o'lchamini almashtirish"
              >
                {fontKey === 'sm' ? 'A-' : fontKey === 'lg' ? 'A+' : 'A'}
              </button>
              {/* Desktopda: 3 ta tugma */}
              <div className="ps-runner-chip hidden h-10 items-center gap-0.5 rounded-full p-1 sm:flex" title="Matn o'lchami">
                {FONT_STEPS.map((s) => (
                  <button
                    key={s.key}
                    onClick={() => setFontKey(s.key)}
                    aria-pressed={fontKey === s.key}
                    className={cn(
                      'h-8 min-w-8 cursor-pointer rounded-full px-2 text-xs font-bold transition-colors',
                      fontKey === s.key ? 'ps-runner-seg-on' : 'opacity-60 hover:opacity-100',
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              {typeof timeLeft === 'number' && (
                <span
                  className={cn(
                    'flex h-10 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-bold tabular-nums',
                    timeLeft < 300
                      ? 'animate-pulse bg-[var(--ps-coral)] text-white'
                      : 'bg-[var(--ps-orange)] text-[#080808]',
                  )}
                >
                  <Clock className="size-4" />
                  <span className="ps-num !leading-none">{formatTime(timeLeft)}</span>
                </span>
              )}
            </div>
          </div>

          {/* Jarayon */}
          <div className="mt-2.5 flex items-center gap-3 px-1">
            <div className="ps-runner-track h-2 flex-1 overflow-hidden rounded-full">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[var(--ps-purple)] to-[var(--ps-coral)] transition-[width] duration-500"
                style={{ width: `${Math.max(2, progress)}%` }}
              />
            </div>
            <span className="shrink-0 text-[11px] font-bold tabular-nums opacity-70">
              {answeredIdxs.size}/{data.total_questions} yechildi
            </span>
          </div>
        </div>

        {/* ── Savollar xaritasi ─────────────────────────────────────── */}
        {showJumpDrawer && (
          <div className="ps-card animate-fadeIn p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <p className="ps-display text-[22px]">Savollar xaritasi</p>
              <span className="ps-chip">{answeredIdxs.size} / {data.total_questions} yechildi</span>
            </div>
            <div className="mt-4 grid grid-cols-6 gap-2 sm:grid-cols-10">
              {Array.from({ length: data.total_questions }, (_, i) => i + 1).map((n) => {
                const isAnswered = answeredIdxs.has(n);
                const isCurrent = n === data.q_idx;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => { load(n); setShowJumpDrawer(false); }}
                    className={cn(
                      'h-10 cursor-pointer rounded-full text-xs font-bold tabular-nums transition-transform hover:-translate-y-0.5',
                      isCurrent
                        ? 'bg-[#080808] text-[#FFFCF7] dark:bg-[#FFFCF7] dark:text-[#080808]'
                        : isAnswered
                          ? 'bg-[var(--ps-purple)] text-white'
                          : 'bg-[var(--ps-neutral)] text-[var(--text-muted)]',
                    )}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
            <div className="mt-4 flex flex-wrap gap-3 text-[11px] font-semibold text-[var(--text-muted)]">
              <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-[var(--ps-purple)]" /> Yechilgan</span>
              <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-[var(--ps-neutral)] ring-1 ring-[var(--border-card)]" /> Yechilmagan</span>
              <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-[#080808] dark:bg-[#FFFCF7]" /> Hozirgi</span>
            </div>
          </div>
        )}

        {/* ── Savol ────────────────────────────────────────────────── */}
        <div className={cn("space-y-6", isStressMode && "lg:grid lg:grid-cols-12 lg:gap-6 lg:space-y-0")}>
          <div className={cn(isStressMode ? "lg:col-span-8 space-y-6" : "space-y-6")}>
            <section className="ps-card relative overflow-hidden !rounded-[32px] p-5 sm:p-9">
              <div aria-hidden className="pointer-events-none absolute -right-14 -top-14 size-44 rounded-full bg-[var(--ps-purple)] opacity-20" />
              <div aria-hidden className="ps-dots pointer-events-none absolute right-8 top-8 hidden size-16 text-[var(--ps-purple)] opacity-30 sm:block" />

              <div className="relative flex items-start justify-between gap-3">
                <div className="flex items-end gap-3">
                  <span className="ps-num text-[56px] text-[var(--ps-purple)] sm:text-[72px]">
                    {String(data.q_idx).padStart(2, '0')}
                  </span>
                  <span className="mb-2 sm:mb-3">
                    <span className="ps-eyebrow block text-[var(--text-muted)]">Savol</span>
                    <span className="text-sm font-bold text-[var(--text-muted)]">/ {data.total_questions}</span>
                  </span>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span
                    className={cn(
                      'rounded-full px-3 py-1 text-[11px] font-bold',
                      q.difficulty === 'easy'
                        ? 'bg-[var(--ps-green)] text-white'
                        : q.difficulty === 'hard'
                          ? 'bg-[var(--ps-coral)] text-white'
                          : 'bg-[var(--ps-orange)] text-[#080808]',
                    )}
                  >
                    {DIFFICULTY_LABEL[q.difficulty] || q.difficulty}
                  </span>
                  {data.q_idx >= 36 && (
                    <span className="rounded-full bg-[#080808] px-3 py-1 text-[11px] font-bold text-[var(--ps-orange)]">
                      ⚡ AI BMB ekspert tekshiruvi
                    </span>
                  )}
                </div>
              </div>

              <div className="relative mt-6 space-y-6">
                {/* reading-block: 70ch o'lchov + A-/A/A+ boshqaradigan --reading-size.
                    Teg <div>: PDF dan kelgan savol matnida <table> bo'lishi mumkin. */}
                <div
                  role="heading"
                  aria-level={2}
                  className="reading-block font-bold"
                  dangerouslySetInnerHTML={{ __html: q.body }}
                />

                {q.image && (
                  <div className="overflow-hidden rounded-[24px] bg-[var(--ps-neutral)]">
                    <img src={q.image} alt="" className="max-h-72 w-full object-contain" />
                  </div>
                )}

                {q.audio_url && (
                  <div className="flex items-center gap-3 rounded-full bg-[var(--ps-neutral)] p-2 pl-4">
                    <Volume2 className="size-4 text-[var(--ps-purple)]" />
                    <audio src={q.audio_url} controls className="h-8 w-full text-xs" />
                  </div>
                )}

                {(q.type === 'single_choice' || q.type === 'image_based' || q.type === 'table_based' || (q.type as string) === 'mcq') && (
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
                <div className="hidden items-center justify-between gap-3 border-t border-[var(--border-card)] pt-4 text-[12px] font-medium text-[var(--text-muted)] sm:flex">
                  <span className="flex items-center gap-1.5">
                    <kbd className="ps-kbd">A–D</kbd> yoki <kbd className="ps-kbd">1–4</kbd> variantni tanlash
                  </span>
                  <span className="flex items-center gap-1.5">
                    <kbd className="ps-kbd">Enter</kbd> yoki <kbd className="ps-kbd">→</kbd> keyingi savol
                  </span>
                </div>
              </div>
            </section>
          </div>

          {/* Desktop BMB Titul Varaqasi (Bubble Sheet) ustuni */}
          {isStressMode && (
            <div className="hidden lg:block lg:col-span-4">
              <div className="sticky top-24">
                <BmbBubbleSheet
                  totalQuestions={data.total_questions}
                  currentQIdx={data.q_idx}
                  titulAnswers={titulAnswers}
                  draftAnswers={draftAnswersMap}
                  onBubbleSelect={handleBubbleSelect}
                  onJumpToQuestion={(idx) => load(idx)}
                  onSyncAllDrafts={syncAllDraftsToTitul}
                  secondsLeft={timeLeft ?? null}
                  subjectName={data.subject_name || data.test_title || 'BMB Rasmiy Blok'}
                  attemptId={attemptId}
                />
              </div>
            </div>
          )}
        </div>

        {/* ── Navigatsiya — mobilda pastga yopishtirilgan ───────────── */}
        <div className="exam-bottom-bar ps-runner-nav fixed bottom-0 left-0 right-0 z-30 flex items-center justify-between gap-2 p-3 sm:static sm:p-0">
          <button
            type="button"
            disabled={!data.has_prev}
            onClick={() => load(data.prev_idx)}
            className="ps-btn ps-btn-ghost disabled:opacity-40"
          >
            <ArrowLeft className="size-4" /> Oldingi
          </button>

          {isStressMode && (
            <button
              type="button"
              onClick={() => setShowTitulDrawer(true)}
              className="ps-btn relative bg-[var(--ps-blue)] text-[#080808] lg:hidden"
            >
              <FileSpreadsheet className="size-4" />
              <span>Titul ({Object.keys(titulAnswers).length}/{data.total_questions})</span>
              {uncopiedCount > 0 && (
                <span className="flex size-5 items-center justify-center rounded-full bg-[var(--ps-coral)] text-[11px] font-bold text-white animate-pulse">
                  {uncopiedCount}
                </span>
              )}
            </button>
          )}

          {data.has_next ? (
            <button type="button" onClick={() => load(data.next_idx)} className="ps-btn ps-btn-ink">
              Keyingi
              <span className="ps-btn-arrow"><ArrowRight className="size-4" /></span>
            </button>
          ) : inTelegram ? (
            /* Telegram'da yakunlash Telegram'ning o'z pastki tugmasi orqali */
            null
          ) : (
            <button
              type="button"
              onClick={requestFinish}
              disabled={finishing}
              className="ps-btn bg-[var(--ps-green)] text-white shadow-[0_12px_24px_-12px_rgba(76,128,107,0.9)]"
            >
              <CheckCircle2 className="size-4" /> {finishing ? 'Yakunlanmoqda...' : 'Yakunlash'}
            </button>
          )}
        </div>

        {/* Mobilda BMB Titul Varaqasi Dialogi */}
        <Dialog open={showTitulDrawer} onOpenChange={setShowTitulDrawer}>
          <DialogContent className="ps-shell ps-dialog-bare w-[96vw] max-w-md max-h-[92vh] p-0 bg-transparent border-0 shadow-none overflow-hidden flex flex-col">
            <BmbBubbleSheet
              totalQuestions={data.total_questions}
              currentQIdx={data.q_idx}
              titulAnswers={titulAnswers}
              draftAnswers={draftAnswersMap}
              onBubbleSelect={handleBubbleSelect}
              onJumpToQuestion={(idx) => {
                load(idx);
                setShowTitulDrawer(false);
              }}
              onSyncAllDrafts={syncAllDraftsToTitul}
              secondsLeft={timeLeft ?? null}
              subjectName={data.subject_name || data.test_title || 'BMB Rasmiy Blok'}
              attemptId={attemptId}
              isCompact
            />
          </DialogContent>
        </Dialog>

        {/* Titulga ko'chirilmagan javoblar haqida qat'iy BMB ogohlantirish modali */}
        <Dialog open={showUncopiedWarningModal} onOpenChange={setShowUncopiedWarningModal}>
          <DialogContent className="ps-shell ps-dialog sm:max-w-md border-2 border-rose-500/50 bg-card">
            <DialogHeader className="space-y-2">
              <div className="flex items-center gap-2 text-rose-500">
                <AlertTriangle className="size-6 animate-bounce" />
                <DialogTitle className="text-lg font-bold text-foreground">
                  ⚠️ Titulga Ko&apos;chirilmagan Javoblar!
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Sizda <strong>{Object.entries(draftAnswersMap).filter(([k, v]) => v && !titulAnswers[k]).length} ta</strong> savol qoralamada belgilangan, ammo Titul varaqasiga ko&apos;chirilmagan!
                <br /><br />
                BMB (DTM) qat&apos;iy qoidalariga ko&apos;ra, Titul varaqasiga bo&apos;yalmagan javoblar optik skaner tomonidan o&apos;qilmaydi va <strong>0 ball</strong> hisoblanadi!
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex-col sm:flex-row gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => setShowUncopiedWarningModal(false)}
                className="text-xs"
              >
                Qaytish va tekshirish
              </Button>
              <Button
                onClick={() => {
                  syncAllDraftsToTitul();
                  setShowUncopiedWarningModal(false);
                  setTimeout(() => finish(true), 500);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
              >
                <Sparkles className="size-3.5 mr-1.5" />
                Hammasini Titulga ko&apos;chirib topshirish
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setShowUncopiedWarningModal(false);
                  finish(true);
                }}
                className="text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
              >
                Baribir topshirish (0 ballga rozi bo&apos;lish)
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showFinishConfirm} onOpenChange={setShowFinishConfirm}>
          <DialogContent className="ps-shell ps-dialog w-[calc(100%-1.5rem)] max-w-md rounded-3xl border border-amber-500/30 bg-[var(--surface-card-strong)] p-6 shadow-2xl mx-auto">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
                <AlertTriangle className="size-7" />
              </div>
              <div className="space-y-1.5">
                <DialogTitle className="text-lg sm:text-xl font-bold text-foreground">
                  {unansweredCount} ta savol javobsiz qoldi
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Yakunlasangiz, ular xato hisoblanadi va testga qaytib bo&apos;lmaydi.
                </DialogDescription>
              </div>
              <div className="w-full flex flex-col-reverse sm:flex-row items-center gap-3 pt-3">
                <Button
                  variant="outline"
                  onClick={() => { setShowFinishConfirm(false); finish(); }}
                  className="w-full sm:w-auto flex-1 rounded-2xl font-bold h-12"
                >
                  Baribir yakunlash
                </Button>
                <Button
                  onClick={() => setShowFinishConfirm(false)}
                  className="w-full sm:w-auto flex-1 rounded-2xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white h-12"
                >
                  Savollarga qaytish
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showExitModal} onOpenChange={setShowExitModal}>
          <DialogContent className="ps-shell ps-dialog w-[calc(100%-1.5rem)] max-w-md rounded-3xl border border-amber-500/30 bg-[var(--surface-card-strong)] p-6 shadow-2xl mx-auto">
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
                  className="w-full sm:w-auto flex-1 rounded-2xl font-bold bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] transition-all text-white shadow-lg shadow-emerald-600/30 h-12 sm:h-12.5 text-sm sm:text-base gap-2"
                >
                  <CheckCircle2 className="size-5" />
                  Davom etish
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
