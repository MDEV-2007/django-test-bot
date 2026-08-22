'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { celebrate } from '@/lib/confetti';
import { Clock, ArrowLeft, ArrowRight, CheckCircle2, AlertCircle, Layers, X, Volume2 } from 'lucide-react';
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

function formatTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function TestScreenPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const router = useRouter();
  const { access } = useAuthStore();
  const [data, setData] = useState<QuestionData | null>(null);
  const [qIdx, setQIdx] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [showJumpDrawer, setShowJumpDrawer] = useState(false);
  const [answeredIdxs, setAnsweredIdxs] = useState<Set<number>>(new Set());
  const [fontKey, setFontKey] = useState<FontKey>('md');
  const inTelegram = useIsTelegram();

  /* Telegram Mini App: imtihon davomida ilova tasodifan yopilsa javoblar oralig'i
     yo'qoladi — yopishdan oldin Telegram tasdiq so'raydi. Telegramdan tashqarida
     bu chaqiruvlar hech narsa qilmaydi. */
  useTelegramClosingConfirmation(true);

  // Telegram'ning "orqaga" tugmasi ham xuddi sahifadagi chiqish tugmasi kabi
  // tasdiqlash modalini ochadi, imtihondan to'g'ridan-to'g'ri chiqarib yubormaydi.
  useTelegramBackButton(() => setShowExitModal(true));

  // Zen Mode: imtihon davomida sidebar/header/tab-bar yashiriladi. Sahifadan chiqilganda
  // (yoki komponent unmount bo'lganda) atribut albatta tozalanadi, aks holda boshqa
  // sahifalarda ham navigatsiya yo'qolib qolardi.
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

  const load = useCallback((idx: number) => {
    apiFetch<QuestionData>(`/api/tests/attempts/${attemptId}/question/?q_idx=${idx}`)
      .then((d) => { setData(d); setQIdx(d.q_idx); })
      .catch((e: unknown) => {
        if (e instanceof ApiError && e.status === 409) { router.push(`/tests/${attemptId}/feedback`); return; }
        setError(e instanceof Error ? e.message : 'Xatolik');
      });
  }, [attemptId, router]);

  useEffect(() => { if (access) load(qIdx); }, [access]); // eslint-disable-line react-hooks/exhaustive-deps

  // Local countdown between server syncs so the timer doesn't visibly stall.
  useEffect(() => {
    if (typeof data?.seconds_left !== 'number') return;
    const timer = setInterval(() => {
      setData((prev) => (prev && typeof prev.seconds_left === 'number' && prev.seconds_left > 0
        ? { ...prev, seconds_left: prev.seconds_left - 1 } : prev));
    }, 1000);
    return () => clearInterval(timer);
  }, [data?.q_idx]); // eslint-disable-line react-hooks/exhaustive-deps

  async function submit(payload: Record<string, unknown>) {
    if (!data) return;
    try {
      const updated = await apiFetch<QuestionData>(`/api/tests/attempts/${attemptId}/answer/`, {
        method: 'POST',
        body: JSON.stringify({ question_id: data.question.id, q_idx: qIdx, ...payload }),
      });
      setData(updated);
      setAnsweredIdxs((prev) => new Set(prev).add(qIdx));
      tgHaptic('select');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xatolik');
    }
  }

  async function finish() {
    setFinishing(true);
    try {
      await apiFetch(`/api/tests/attempts/${attemptId}/finish/`, { method: 'POST' });
      soundFX.fanfare();
      tgHaptic('success');
      try { celebrate({ particleCount: 80, spread: 70, origin: { y: 0.6 } }); } catch { /* noop */ }
      router.push(`/tests/${attemptId}/feedback`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xatolik');
      tgHaptic('error');
      setFinishing(false);
    }
  }

  /* Oxirgi savolda Telegram'ning nativ pastki tugmasi "Yakunlash" bo'lib chiqadi —
     Mini App'da bu eng ko'rinadigan va eng qulay joy. */
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
  const timeLeft = data.seconds_left;
  const progress = (answeredIdxs.size / Math.max(1, data.total_questions)) * 100;

  return (
    <>
      <AppShell />
      <main className="page-shell-focus flex-1 space-y-8 bg-[var(--bg-page)] p-4 pb-24 sm:p-6 sm:pb-12">
        {/* Sticky boshqaruv paneli */}
        <Card className="sticky top-2 z-20 gap-0 border-[var(--border-card)] bg-[var(--surface-card-strong)]/95 py-0 shadow-lg backdrop-blur-xl">
          <CardContent className="space-y-2.5 p-3.5 sm:p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Button
                  variant="ghost" size="icon" className="size-8 text-muted-foreground hover:bg-rose-500/20 hover:text-rose-300"
                  title="Imtihondan chiqish" onClick={() => setShowExitModal(true)}
                >
                  <X className="size-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowJumpDrawer(!showJumpDrawer)}>
                  <Layers className="size-3.5 text-[var(--accent-text)]" />
                  Savol <span className="font-mono tabular-nums text-[var(--accent-text)]">{data.q_idx}</span> / {data.total_questions}
                </Button>
              </div>

              <span className="hidden font-mono text-xs text-[var(--text-faint)] xl:inline">A-D tanlash · → keyingi · ← oldingi</span>

              <div className="ml-auto flex items-center gap-2 sm:ml-0">
                <div className="flex items-center gap-0.5 rounded-xl border bg-[var(--surface-hover)] p-0.5" title="Matn o'lchami">
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

                {typeof timeLeft === 'number' && (
                  <Badge
                    variant="outline"
                    className={cn(
                      'gap-1.5 px-3 py-1.5 font-mono tabular-nums',
                      timeLeft < 300
                        ? 'animate-pulse border-rose-500/30 bg-rose-500/15 text-rose-300'
                        : 'border-[var(--accent)]/25 bg-primary/10 text-[var(--accent-text)]',
                    )}
                  >
                    <Clock className="size-3.5" /> {formatTime(timeLeft)}
                  </Badge>
                )}
              </div>
            </div>

            <Progress value={progress} className="h-1.5" />
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
                --reading-size. Ilgari o'lcham qattiq yozilgan (text-base/sm:text-lg) edi. */}
            <h2 className="reading-block font-bold" dangerouslySetInnerHTML={{ __html: q.body }} />

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
          <DialogContent className="sm:max-w-sm">
            <DialogHeader className="items-center text-center sm:text-center">
              <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400">
                <AlertCircle className="size-6" />
              </div>
              <DialogTitle>Imtihondan chiqmoqchimisiz?</DialogTitle>
              <DialogDescription>
                Joriy javoblaringiz saqlanadi, ammo imtihon taymeri to&apos;xtatilmaydi.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="sm:justify-center">
              <Button variant="outline" className="flex-1" onClick={() => setShowExitModal(false)}>Davom etish</Button>
              <Button variant="destructive" className="flex-1" onClick={() => router.push('/tests')}>Chiqish</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </>
  );
}
