'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { celebrate } from '@/lib/confetti';
import { CheckCircle2, XCircle, ArrowRight, Flame, PartyPopper, AlertTriangle, Swords } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { soundFX } from '@/lib/soundFX';
import AppShell from '@/components/AppShell';
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


  if (!data) {
    return (
      <div className="theme-pastel min-h-screen w-full">
        <AppShell />
        <main className="page-shell flex-1 space-y-6 p-4 pb-12 sm:p-6">
          <Skeleton className="h-36 w-full rounded-[32px] bg-white/40" />
          <Skeleton className="h-96 w-full rounded-[32px] bg-white/40" />
        </main>
      </div>
    );
  }

  const item = data.deck[idx];

  return (
    <div className="theme-pastel min-h-screen w-full">
      <AppShell />
      <main className="page-shell flex-1 space-y-6 p-4 pb-16 sm:p-6">
        <section className="relative grid items-end gap-6 pt-2 sm:grid-cols-[1fr_auto]">
          <div>
            <Link href="/tests" className="ps-chip w-fit transition-transform hover:-translate-x-0.5">
              <ArrowRight className="size-4 rotate-180" /> Testlar
            </Link>
            <p className="ps-eyebrow mt-6 text-[var(--text-muted)]">Aqlli xatolar daftari</p>
            <h1 className="ps-display mt-3 text-[44px] sm:text-[64px]">
              Xatolar ustida <span className="text-[var(--ps-coral)]">ishlash</span>
              <span className="text-[var(--ps-purple)]">.</span>
            </h1>
            <p className="mt-4 max-w-lg text-[15px] text-[var(--text-secondary)]">
              Imtihonlarda adashgan savollaringizni to&apos;liq o&apos;zlashtirmaguningizcha takrorlash tizimi.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-[24px] bg-[var(--ps-coral)] px-5 py-4 text-white">
              <p className="ps-num text-[36px]">{data.total - data.mastered_count}</p>
              <p className="mt-1 text-[11px] font-semibold text-white/75">Faol xato</p>
            </div>
            <div className="rounded-[24px] bg-[var(--ps-green)] px-5 py-4 text-white">
              <p className="ps-num text-[36px]">{data.mastered_count}</p>
              <p className="mt-1 text-[11px] font-semibold text-white/75">Tuzatilgan</p>
            </div>
          </div>
        </section>

        <DailyChainBar deckDone={!item} />

        {combo >= 3 && (
          <motion.div
            key={combo}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={springBouncy}
            className="w-fit"
          >
            <Badge variant="outline" className="border-[var(--ps-orange)]/30 bg-[var(--ps-orange)]/12 text-[var(--ps-orange)] font-bold">
              <Flame className="size-3.5 fill-[var(--ps-orange)]" /> {combo}x Combo!
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
                      ? 'bg-[#080808] text-[#FFFCF7] border-[#080808] dark:bg-[#FFFCF7] dark:text-[#080808] dark:border-[#FFFCF7]'
                      : 'bg-[var(--ps-paper)] text-[var(--text-secondary)] border-transparent'
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
                  ? "bg-[var(--ps-purple)] text-white"
                  : "bg-[var(--ps-paper)] text-[var(--text-muted)]"
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
                      ? "bg-[var(--ps-purple)] text-white"
                      : "bg-[var(--ps-paper)] text-[var(--text-muted)]"
                  )}
                >
                  <span className="max-w-44 truncate">{t.title}</span>
                  <span className="font-mono text-[12px] opacity-75">({t.count})</span>
                </button>
              );
            })}
          </div>
        )}

        {!item && (
          <div className="ps-card py-16 px-6 text-center space-y-2">
            {topic ? (
              <>
                <CheckCircle2 className="mx-auto mb-2 size-10 text-[var(--ps-green)]" />
                <p className="text-[16px] font-bold text-[var(--text-primary)]">Bu mavzuda tuzatilmagan xato qolmadi!</p>
              </>
            ) : (
              <>
                <PartyPopper className="mx-auto mb-2 size-10 text-[var(--ps-orange)]" />
                <p className="text-[16px] font-bold text-[var(--text-primary)]">Barcha xatolar muvaffaqiyatli tuzatildi!</p>
              </>
            )}
            <p className="text-[13px] text-[var(--text-muted)]">Kunlik Marafon: 2/3-Qadam yopildi. Oxirgi qadam qoldi!</p>
            <div className="pt-3">
              <Button asChild size="lg" className="h-auto min-h-12 whitespace-normal rounded-full bg-[#080808] px-6 py-3 font-bold text-[#FFFCF7] hover:bg-black dark:bg-[#FFFCF7] dark:text-[#080808]">
                <Link href="/battles">
                  <Swords className="size-4 shrink-0" />
                  <span>⚔️ Yakuniy 3-Qadam: 1v1 Arena Dueliga Kirish (🎁 Sirli Sandiqni ochish)</span>
                  <ArrowRight className="size-4 shrink-0" />
                </Link>
              </Button>
            </div>
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
            <div className="ps-card !rounded-[32px] p-5 sm:p-9 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-[var(--border-card)]">
                <span className="rounded-full bg-[var(--ps-orange)]/12 border border-[var(--ps-orange)]/25 px-3 py-1 font-mono text-[12px] font-bold text-[var(--ps-orange)]">
                  {item.topic}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--ps-coral)]/10 px-3 py-1 font-mono text-[12px] font-bold text-[var(--ps-coral)]">
                  <AlertTriangle className="size-3.5" /> {item.times_wrong} marta xato qilingan
                </span>
              </div>

              <h2
                className="text-[17px] sm:text-[19px] font-bold leading-relaxed text-[var(--text-primary)]"
                dangerouslySetInnerHTML={{ __html: item.body }}
              />
              {item.image && (
                <img src={item.image} alt="" className="max-h-60 rounded-xl border border-[var(--border-card)] object-contain" />
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
                        data-state={result ? (isCorrect ? 'correct' : isSelected ? 'wrong' : 'muted') : undefined}
                        className="ps-choice reading-scale flex w-full cursor-pointer items-center justify-between gap-3.5 p-4 text-left font-medium leading-relaxed disabled:cursor-default"
                      >
                        <span className="flex min-w-0 items-center gap-3.5">
                          <span className="ps-choice-letter flex shrink-0 items-center justify-center font-bold">
                            {String.fromCharCode(65 + i)}
                          </span>
                          <span className="leading-snug">{c.text}</span>
                        </span>
                        {result && isCorrect && <CheckCircle2 className="size-5 shrink-0" />}
                        {result && isSelected && !isCorrect && <XCircle className="size-5 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}

              {!item.inline && !result && (
                <Button onClick={markUnderstood} className="w-full rounded-full bg-[#080808] text-[#FFFCF7] hover:bg-black dark:bg-[#FFFCF7] dark:text-[#080808]" size="lg">
                  Tushundim
                </Button>
              )}

              {result && (
                <div className="animate-fadeIn space-y-4 pt-2">
                  <div className={cn(
                    "rounded-[22px] border p-4 sm:p-5 space-y-2",
                    result.correct
                      ? "border-[var(--ps-green)]/30 bg-[var(--ps-green)]/10"
                      : "border-[var(--ps-coral)]/30 bg-[var(--ps-coral)]/10"
                  )}>
                    <p className={cn(
                      'flex items-center gap-1.5 text-[13px] font-bold',
                      result.correct ? 'text-[var(--ps-green)]' : 'text-[var(--ps-coral)]'
                    )}>
                      {result.correct ? <CheckCircle2 className="size-4" /> : <XCircle className="size-4" />}
                      <span>{result.correct ? "To'g'ri javob!" : "Noto'g'ri javob."} Tushuntirish:</span>
                    </p>
                    {!result.correct && result.correct_answer && (
                      <p className="text-[13px] font-bold text-[var(--ps-green)]">
                        To&apos;g&apos;ri javob: {result.correct_answer}
                      </p>
                    )}
                    <p className="text-[13px] leading-relaxed text-[var(--text-secondary)]">
                      {result.explanation || item.explanation}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <span className="flex items-center gap-1.5 text-[12px] font-medium text-[var(--text-muted)]">
                      {result.mastered
                        ? <><CheckCircle2 className="size-4 text-[var(--ps-green)]" /> Bu savol to&apos;liq o&apos;zlashtirildi</>
                        : 'Bu savol keyinroq yana takrorlanadi.'}
                    </span>
                    <Button onClick={next} className="shrink-0 rounded-full bg-[#080808] px-5 text-[#FFFCF7] hover:bg-black dark:bg-[#FFFCF7] dark:text-[#080808]">
                      Keyingi xatoga o&apos;tish <ArrowRight className="size-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {item && (
          <div className="flex flex-col items-center gap-2 pt-2 text-center">
            <p className="text-[12px] text-[var(--text-muted)]">
              Kunlik Marafon: 2/3-Qadam · Qolgan xatolar: {data.deck.length - idx} ta
            </p>
            <Button asChild variant="outline" className="h-auto min-h-11 whitespace-normal rounded-full px-5 py-2.5 font-semibold">
              <Link href="/battles">
                <span>⚔️ Yakuniy 3-Qadam: 1v1 Arena Dueliga Kirish (🎁 Sirli Sandiqni ochish)</span>
                <ArrowRight className="size-4 shrink-0" />
              </Link>
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}

function DailyChainBar({ deckDone }: { deckDone: boolean }) {
  const steps: { label: string; state: 'done' | 'current' | 'next' }[] = [
    { label: '1. Fokus Sprint', state: 'done' },
    { label: '2. Xatolarni Tozalash', state: deckDone ? 'done' : 'current' },
    { label: '3. 1v1 Arena', state: deckDone ? 'current' : 'next' },
  ];
  return (
    <div className="ps-card p-4 sm:p-5 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[12px] font-bold uppercase tracking-wider text-[var(--ps-orange)]">Kunlik Marafon: 2/3-Qadam</span>
        <Link href="/battles" className="inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--ps-purple)] hover:underline">
          3-Qadam <ArrowRight className="size-3.5" />
        </Link>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {steps.map((s) => (
          <div
            key={s.label}
            className={cn(
              'flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-[12px] font-semibold',
              s.state === 'done' && 'bg-[var(--ps-green)]/12 text-[var(--ps-green)]',
              s.state === 'current' && 'bg-[var(--ps-orange)]/12 text-[var(--ps-orange)] ring-1 ring-[var(--ps-orange)]/40',
              s.state === 'next' && 'bg-[var(--ps-neutral)] text-[var(--text-muted)]'
            )}
          >
            {s.state === 'done' ? <CheckCircle2 className="size-3.5 shrink-0" /> : <span className="size-1.5 shrink-0 rounded-full bg-current" />}
            <span className="truncate">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
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
                'rounded-lg border px-5 py-3 text-[14px] font-bold transition-all active:scale-95',
                chosen && result?.correct && 'border-2 border-[var(--ps-green)] bg-[var(--ps-green)]/12 text-[var(--ps-green)]',
                chosen && result && !result.correct && 'border-2 border-[var(--ps-coral)] bg-[var(--ps-coral)]/12 text-[var(--ps-coral)]',
                !chosen && 'border-[var(--border-card)] bg-[var(--ps-neutral)] text-[var(--text-primary)] hover:border-[var(--ps-purple)]',
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
