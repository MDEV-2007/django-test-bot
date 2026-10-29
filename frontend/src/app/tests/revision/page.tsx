'use client';

import { useEffect, useState } from 'react';
import { celebrate } from '@/lib/confetti';
import { RotateCcw, CheckCircle2, XCircle, ArrowRight, Flame, PartyPopper, AlertTriangle } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { soundFX } from '@/lib/soundFX';
import AppShell from '@/components/AppShell';
import PageHero from '@/components/student/PageHero';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { dur, easeOut, shake, springBouncy } from '@/lib/motion';

type DeckItem = {
  item_id: number; question_id: number; body: string; type: string; explanation: string; image: string;
  topic: string; times_wrong: number; inline: boolean; choices: { id: number; text: string }[];
  answer_mode: 'choice' | 'text';
  tfng_options: string[];
  max_words: number | null;
};
type Subject = { id: number; name: string; slug: string };
type TopicRow = { id: number; title: string; count: number };
type RevisionData = {
  deck: DeckItem[]; active_count: number; total: number; mastered_count: number;
  subjects: Subject[]; selected_subject: string;
  topics: TopicRow[]; selected_topic: string;
};
type CheckResult = {
  ok: boolean; correct: boolean; mastered: boolean;
  correct_choice_id: number | null; explanation: string; correct_answer: string;
};

export default function RevisionPage() {
  const { access } = useAuthStore();
  const [data, setData] = useState<RevisionData | null>(null);
  const [idx, setIdx] = useState(0);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [textAnswer, setTextAnswer] = useState('');
  const [subject, setSubject] = useState<string | null>(null);
  const [topic, setTopic] = useState('');
  const [combo, setCombo] = useState(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!access) return;
    const params = new URLSearchParams();
    if (subject) params.set('subject', subject);
    if (topic) params.set('topic', topic);
    const q = params.toString() ? `?${params.toString()}` : '';
    apiFetch<RevisionData>(`/api/tests/revision/${q}`).then((d) => {
      setData(d);
      setIdx(0);
      setResult(null);
      setSelectedChoice(null);
      setTextAnswer('');
      setSubject((prev) => prev ?? (d.selected_subject || null));
    }).catch((e) => toast.error(e instanceof Error ? e.message : "Yuklashda xatolik yuz berdi"));
  }, [access, subject, topic]); // eslint-disable-line react-hooks/exhaustive-deps

  async function check(choiceId: number) {
    setSelectedChoice(choiceId);
    await submit({ choice_id: choiceId });
  }

  async function checkText(value: string) {
    if (!value.trim()) return;
    setTextAnswer(value);
    await submit({ text_answer: value });
  }

  async function submit(payload: Record<string, unknown>) {
    const item = data!.deck[idx];
    const res = await apiFetch<CheckResult>(`/api/tests/revision/${item.item_id}/check/`, {
      method: 'POST', body: JSON.stringify(payload),
    });
    setResult(res);
    if (res.correct) {
      soundFX.correct();
      setCombo((c) => c + 1);
      try { celebrate({ particleCount: 50, spread: 50, origin: { y: 0.6 } }); } catch { /* noop */ }
    } else {
      soundFX.incorrect();
      setCombo(0);
    }
  }

  async function markUnderstood() {
    const item = data!.deck[idx];
    await apiFetch(`/api/tests/revision/${item.item_id}/check/`, { method: 'POST', body: JSON.stringify({ action: 'master' }) });
    next();
  }

  function next() {
    setResult(null);
    setSelectedChoice(null);
    setTextAnswer('');
    setIdx((i) => i + 1);
  }

  function choiceStyle(choiceId: number) {
    if (!result) {
      return 'border-black/[0.06] dark:border-white/[0.08] bg-[#F2F2F7]/70 dark:bg-[#2C2C2E] text-slate-900 dark:text-white hover:border-[#007AFF]/50';
    }
    const isCorrect = choiceId === result.correct_choice_id;
    const isSelected = choiceId === selectedChoice;
    if (isCorrect) {
      return 'border-2 border-[#34C759] bg-[#34C759]/12 font-bold text-[#248A3D] dark:text-[#30D158]';
    }
    if (isSelected) {
      return 'border-2 border-[#FF3B30] bg-[#FF3B30]/12 font-bold text-[#D70015] dark:text-[#FF453A]';
    }
    return 'border-black/[0.04] dark:border-white/[0.05] bg-[#F2F2F7]/40 dark:bg-[#2C2C2E]/40 text-[#8E8E93] opacity-60';
  }

  if (!data) {
    return (
      <>
        <AppShell />
        <main className="page-shell flex-1 space-y-6 bg-[#F2F2F7] dark:bg-[#000000] p-4 pb-12 sm:p-6">
          <Skeleton className="h-36 w-full rounded-[28px]" />
          <Skeleton className="h-96 w-full rounded-[28px]" />
        </main>
      </>
    );
  }

  const item = data.deck[idx];

  return (
    <>
      <AppShell />
      <main className="page-shell flex-1 space-y-6 bg-[#F2F2F7] dark:bg-[#000000] p-4 pb-16 sm:p-6">
        <PageHero
          tone="rose"
          eyebrow="Spaced Repetition · Aqlli Xatolar Daftari"
          eyebrowIcon={RotateCcw}
          title="Xatolar Ustida Ishlash"
          description="Imtihonlarda adashgan savollaringizni to'liq o'zlashtirmaguningizcha takrorlash tizimi."
          actions={
            <div className="flex items-center gap-3 rounded-[18px] bg-[#F2F2F7] dark:bg-[#2C2C2E] px-4 py-2.5 font-mono text-[12px]">
              <div className="flex items-center gap-1.5">
                <span className="size-2 animate-pulse rounded-full bg-[#FF3B30]" />
                <span className="text-[#8E8E93]">Faol:</span>
                <strong className="font-bold text-[#FF3B30]">{data.total - data.mastered_count} ta</strong>
              </div>
              <div className="h-3.5 w-px bg-black/[0.08] dark:bg-white/[0.12]" />
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-[#34C759]" />
                <span className="text-[#8E8E93]">Tuzatilgan:</span>
                <strong className="font-bold text-[#34C759]">{data.mastered_count} ta</strong>
              </div>
            </div>
          }
        />

        {combo >= 3 && (
          <motion.div
            key={combo}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={springBouncy}
            className="w-fit"
          >
            <Badge variant="outline" className="border-[#FF9500]/30 bg-[#FF9500]/12 text-[#FF9500] font-bold">
              <Flame className="size-3.5 fill-[#FF9500]" /> {combo}x Combo!
            </Badge>
          </motion.div>
        )}

        {/* Fanlar bo'yicha iOS Capsule Filter */}
        {data.subjects.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
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
                      : 'bg-white dark:bg-[#1C1C1E] text-slate-700 dark:text-slate-200 border-black/[0.06] dark:border-white/[0.08]'
                  )}
                >
                  {s.name}
                </button>
              );
            })}
          </div>
        )}

        {/* Mavzu bo'yicha filtr */}
        {data.topics.length > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            <button
              type="button"
              onClick={() => setTopic('')}
              className={cn(
                "shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-all",
                topic === ''
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                  : "bg-white dark:bg-[#1C1C1E] text-[#8E8E93] border border-black/[0.06] dark:border-white/[0.08]"
              )}
            >
              Barcha mavzular
            </button>
            {data.topics.map((t) => {
              const active = topic === String(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  title={t.title}
                  onClick={() => setTopic(String(t.id))}
                  className={cn(
                    "shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-all inline-flex items-center gap-1.5",
                    active
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                      : "bg-white dark:bg-[#1C1C1E] text-[#8E8E93] border border-black/[0.06] dark:border-white/[0.08]"
                  )}
                >
                  <span className="max-w-44 truncate">{t.title}</span>
                  <span className="font-mono text-[11px] opacity-75">({t.count})</span>
                </button>
              );
            })}
          </div>
        )}

        {!item && (
          <div className="rounded-[28px] bg-white dark:bg-[#1C1C1E] border border-black/[0.06] dark:border-white/[0.08] py-16 px-6 text-center space-y-2 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
            {topic ? (
              <>
                <CheckCircle2 className="mx-auto mb-2 size-10 text-[#34C759]" />
                <p className="text-[16px] font-bold text-slate-900 dark:text-white">Bu mavzuda tuzatilmagan xato qolmadi!</p>
              </>
            ) : (
              <>
                <PartyPopper className="mx-auto mb-2 size-10 text-[#FF9500]" />
                <p className="text-[16px] font-bold text-slate-900 dark:text-white">Barcha xatolar muvaffaqiyatli tuzatildi!</p>
              </>
            )}
          </div>
        )}

        {item && (
          <motion.div
            key={item.item_id}
            initial={{ opacity: 0, y: 12 }}
            animate={
              reduce || !result ? { opacity: 1, y: 0, x: 0, scale: 1 }
                : result.correct ? { opacity: 1, y: 0, x: 0, scale: [1, 1.012, 1] }
                : { opacity: 1, y: 0, scale: 1, ...shake }
            }
            transition={{ duration: dur.base, ease: easeOut }}
          >
            <div className="rounded-[28px] bg-white dark:bg-[#1C1C1E] border border-black/[0.06] dark:border-white/[0.08] p-5 sm:p-7 space-y-5 shadow-[0_6px_28px_rgba(0,0,0,0.04)]">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-black/[0.06] dark:border-white/[0.08]">
                <span className="rounded-full bg-[#FF9500]/12 border border-[#FF9500]/25 px-3 py-1 font-mono text-[12px] font-bold text-[#FF9500]">
                  {item.topic}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FF3B30]/10 px-3 py-1 font-mono text-[12px] font-bold text-[#FF3B30]">
                  <AlertTriangle className="size-3.5" /> {item.times_wrong} marta xato qilingan
                </span>
              </div>

              <h2
                className="text-[17px] sm:text-[19px] font-bold leading-relaxed text-slate-900 dark:text-white"
                dangerouslySetInnerHTML={{ __html: item.body }}
              />
              {item.image && (
                <img src={item.image} alt="" className="max-h-60 rounded-[20px] border border-black/[0.06] dark:border-white/[0.08] object-contain" />
              )}

              {item.inline && item.answer_mode === 'text' && (
                <TextAnswerBlock
                  item={item}
                  result={result}
                  value={textAnswer}
                  onSubmit={checkText}
                />
              )}

              {item.inline && item.answer_mode === 'choice' && (
                <div className="space-y-2.5">
                  {item.choices.map((c, i) => {
                    const isCorrect = result && c.id === result.correct_choice_id;
                    const isSelected = c.id === selectedChoice;
                    return (
                      <button
                        key={c.id}
                        disabled={!!result}
                        onClick={() => check(c.id)}
                        className={cn(
                          'flex w-full items-center justify-between gap-3 rounded-[18px] border p-4 text-left text-[14px] font-medium transition-all active:scale-[0.99]',
                          choiceStyle(c.id)
                        )}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span className={cn(
                            "flex size-8 shrink-0 items-center justify-center rounded-[10px] font-mono text-[13px] font-bold",
                            result && isCorrect
                              ? "bg-[#34C759] text-white"
                              : result && isSelected && !isCorrect
                              ? "bg-[#FF3B30] text-white"
                              : "bg-white dark:bg-[#1C1C1E] text-slate-700 dark:text-slate-200 shadow-xs"
                          )}>
                            {String.fromCharCode(65 + i)}
                          </span>
                          <span className="leading-snug">{c.text}</span>
                        </div>
                        {result && isCorrect && <CheckCircle2 className="size-5 shrink-0 text-[#34C759]" />}
                        {result && isSelected && !isCorrect && <XCircle className="size-5 shrink-0 text-[#FF3B30]" />}
                      </button>
                    );
                  })}
                </div>
              )}

              {!item.inline && !result && (
                <Button onClick={markUnderstood} className="w-full rounded-full" size="lg">
                  Tushundim
                </Button>
              )}

              {result && (
                <div className="animate-fadeIn space-y-4 pt-2">
                  <div className={cn(
                    "rounded-[20px] border p-4 sm:p-5 space-y-2",
                    result.correct
                      ? "border-[#34C759]/30 bg-[#34C759]/10"
                      : "border-[#FF3B30]/30 bg-[#FF3B30]/10"
                  )}>
                    <p className={cn(
                      'flex items-center gap-1.5 text-[13px] font-bold',
                      result.correct ? 'text-[#248A3D] dark:text-[#30D158]' : 'text-[#D70015] dark:text-[#FF453A]'
                    )}>
                      {result.correct ? <CheckCircle2 className="size-4" /> : <XCircle className="size-4" />}
                      <span>{result.correct ? "To'g'ri javob!" : "Noto'g'ri javob."} Tushuntirish:</span>
                    </p>
                    {!result.correct && result.correct_answer && (
                      <p className="text-[13px] font-bold text-[#248A3D] dark:text-[#30D158]">
                        To&apos;g&apos;ri javob: {result.correct_answer}
                      </p>
                    )}
                    <p className="text-[13px] leading-relaxed text-slate-700 dark:text-slate-200">
                      {result.explanation || item.explanation}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <span className="flex items-center gap-1.5 text-[12px] font-medium text-[#8E8E93]">
                      {result.mastered
                        ? <><CheckCircle2 className="size-4 text-[#34C759]" /> Bu savol to&apos;liq o&apos;zlashtirildi</>
                        : 'Bu savol keyinroq yana takrorlanadi.'}
                    </span>
                    <Button onClick={next} className="shrink-0 rounded-full px-5">
                      Keyingi xatoga o&apos;tish <ArrowRight className="size-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </main>
    </>
  );
}

function TextAnswerBlock({
  item, result, value, onSubmit,
}: {
  item: DeckItem;
  result: CheckResult | null;
  value: string;
  onSubmit: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value);

  if (item.tfng_options.length > 0) {
    return (
      <div className="flex flex-wrap gap-2.5">
        {item.tfng_options.map((option) => {
          const chosen = value.toUpperCase() === option;
          return (
            <button
              key={option}
              type="button"
              disabled={!!result}
              onClick={() => onSubmit(option)}
              className={cn(
                'rounded-[16px] border px-5 py-3 text-[14px] font-bold transition-all active:scale-95',
                chosen && result?.correct && 'border-2 border-[#34C759] bg-[#34C759]/12 text-[#248A3D] dark:text-[#30D158]',
                chosen && result && !result.correct && 'border-2 border-[#FF3B30] bg-[#FF3B30]/12 text-[#D70015] dark:text-[#FF453A]',
                !chosen && 'border-black/[0.06] dark:border-white/[0.08] bg-[#F2F2F7] dark:bg-[#2C2C2E] text-slate-800 dark:text-slate-200 hover:border-[#007AFF]',
              )}
            >
              {option}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <form
      onSubmit={(event) => { event.preventDefault(); onSubmit(draft); }}
      className="flex flex-wrap items-center gap-2.5"
    >
      <Input
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        disabled={!!result}
        autoComplete="off"
        placeholder={item.max_words && item.max_words > 1 ? `Javob (${item.max_words} so'zgacha)` : 'Javobni kiriting'}
        className="max-w-xs"
      />
      <Button type="submit" disabled={!!result || !draft.trim()} className="rounded-full px-5">
        Tekshirish
      </Button>
    </form>
  );
}
