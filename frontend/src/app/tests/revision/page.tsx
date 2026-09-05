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
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { dur, easeOut, shake, springBouncy } from '@/lib/motion';

type DeckItem = {
  item_id: number; question_id: number; body: string; type: string; explanation: string; image: string;
  topic: string; times_wrong: number; inline: boolean; choices: { id: number; text: string }[];
  /* 'choice' — variantlardan tanlanadi; 'text' — bo'shliqqa javob yoziladi yoki
     TRUE/FALSE/NOT GIVEN tugmalaridan tanlanadi. */
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

  /* Bo'shliqli va TRUE/FALSE savollar: javob matn sifatida yuboriladi va serverda
     aniq solishtiriladi (AI ishtirokisiz). */
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
    if (!result) return 'border bg-[var(--surface-input)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-foreground';
    const isCorrect = choiceId === result.correct_choice_id;
    const isSelected = choiceId === selectedChoice;
    if (isCorrect) return 'border-2 border-[var(--success)] bg-[var(--success)]/20 font-semibold text-[var(--success-text)]';
    if (isSelected) return 'border-2 border-rose-500 bg-rose-500/20 font-semibold text-rose-300';
    return 'border bg-[var(--surface-input)]/50 text-[var(--text-faint)] opacity-60';
  }

  if (!data) {
    return (
      <>
        <AppShell />
        <main className="page-shell flex-1 space-y-8 bg-[var(--bg-page)] p-4 pb-12 sm:p-6">
          <Skeleton className="h-36 w-full" />
          <Skeleton className="h-96 w-full" />
        </main>
      </>
    );
  }

  const item = data.deck[idx];

  return (
    <>
      <AppShell />
      <main className="page-shell flex-1 space-y-8 bg-[var(--bg-page)] p-4 pb-12 sm:p-6">
        <PageHero
          tone="rose"
          eyebrow="Spaced Repetition"
          eyebrowIcon={RotateCcw}
          title="Xatolar Ustida Ishlash"
          description="Imtihonlarda adashgan savollaringizni to'liq o'zlashtirmaguningizcha takrorlash tizimi."
          actions={
            <div className="space-y-1 rounded-2xl border bg-card p-3.5 font-mono text-xs">
              <div className="flex items-center gap-2">
                <span className="size-2 animate-pulse rounded-full bg-rose-400" />
                <span className="text-[var(--text-secondary)]">Faol xatolar:</span>
                <strong className="text-rose-400">{data.total - data.mastered_count} ta</strong>
              </div>
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-[var(--success)]" />
                <span className="text-[var(--text-secondary)]">Tuzatilgan:</span>
                <strong className="text-[var(--success-text)]">{data.mastered_count} ta</strong>
              </div>
            </div>
          }
        />

        {/* Combo nishoni — nishonlash lahzasi, shuning uchun yagona joyda "bouncy"
            spring ishlatiladi (kundalik UI da emas). */}
        {combo >= 3 && (
          <motion.div
            key={combo}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={springBouncy}
            className="w-fit"
          >
            <Badge variant="outline" className="border-amber-500/30 bg-amber-500/15 text-amber-300">
              <Flame className="size-3.5" /> {combo}x Combo!
            </Badge>
          </motion.div>
        )}

        {data.subjects.length > 0 && (
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

        {/* Mavzu bo'yicha filtr — API `?topic=` ni allaqachon qo'llab-quvvatlardi, lekin
            frontend uni yubormasdi. Har bir mavzu yonida faol xatolar soni ko'rsatiladi. */}
        {data.topics.length > 1 && (
          <div className="scroll-fade scroll-row flex items-center gap-2 overflow-x-auto pb-1">
            <Button
              size="sm"
              variant={topic === '' ? 'secondary' : 'ghost'}
              className="h-7 shrink-0 rounded-lg text-xs"
              onClick={() => setTopic('')}
            >
              Barcha mavzular
            </Button>
            {data.topics.map((t) => (
              <Button
                key={t.id}
                size="sm"
                variant={topic === String(t.id) ? 'secondary' : 'ghost'}
                className="h-7 shrink-0 rounded-lg text-xs"
                title={t.title}
                onClick={() => setTopic(String(t.id))}
              >
                <span className="max-w-40 truncate">{t.title}</span>
                <span className="font-mono text-xs opacity-70">{t.count}</span>
              </Button>
            ))}
          </div>
        )}

        {!item && (
          <Card>
            <CardContent className="py-16 text-center">
              {topic ? (
                <>
                  <CheckCircle2 className="mx-auto mb-2 size-8 text-[var(--success-text)]/60" />
                  <p className="text-sm text-muted-foreground">Bu mavzuda tuzatilmagan xato qolmadi.</p>
                </>
              ) : (
                <>
                  <PartyPopper className="mx-auto mb-2 size-8 text-amber-400" />
                  <p className="text-sm text-muted-foreground">Barcha savollar o&apos;zlashtirildi.</p>
                </>
              )}
            </CardContent>
          </Card>
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
          <Card>
            <CardContent className="space-y-5 pt-6">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-amber-500/20 bg-amber-500/10 font-mono text-amber-300">{item.topic}</Badge>
                <span className="flex items-center gap-1 font-mono text-xs text-rose-400">
                  <AlertTriangle className="size-3" /> {item.times_wrong} marta xato qilingan
                </span>
              </div>
              <Separator />

              <h2 className="font-voice text-base font-bold leading-relaxed sm:text-lg" dangerouslySetInnerHTML={{ __html: item.body }} />
              {item.image && <img src={item.image} alt="" className="max-h-56 rounded-2xl border object-contain" />}

              {item.inline && item.answer_mode === 'text' && (
                <TextAnswerBlock
                  item={item}
                  result={result}
                  value={textAnswer}
                  onSubmit={checkText}
                />
              )}

              {item.inline && item.answer_mode === 'choice' && (
                <div className="space-y-3">
                  {item.choices.map((c, i) => {
                    const isCorrect = result && c.id === result.correct_choice_id;
                    const isSelected = c.id === selectedChoice;
                    return (
                      <button
                        key={c.id}
                        disabled={!!result}
                        onClick={() => check(c.id)}
                        className={cn('tactile-btn flex w-full items-center justify-between gap-3 rounded-2xl p-4 text-left text-xs font-medium transition-all sm:text-sm', choiceStyle(c.id))}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="flex size-6 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-hover)] font-mono text-xs font-bold">{String.fromCharCode(65 + i)}</span>
                          <span className="leading-snug">{c.text}</span>
                        </div>
                        {result && isCorrect && <CheckCircle2 className="size-5 shrink-0 text-[var(--success-text)]" />}
                        {result && isSelected && !isCorrect && <XCircle className="size-5 shrink-0 text-rose-400" />}
                      </button>
                    );
                  })}
                </div>
              )}

              {!item.inline && !result && (
                <Button onClick={markUnderstood} className="w-full" size="lg">Tushundim</Button>
              )}

              {result && (
                <div className="animate-fadeIn space-y-3 pt-1">
                  <Card className={cn(result.correct ? 'border-[var(--success)]/25 bg-[var(--success)]/10' : 'border-rose-500/25 bg-rose-500/10')}>
                    <CardContent className="space-y-2 pt-6">
                      <p className={cn('flex items-center gap-1.5 text-xs font-bold', result.correct ? 'text-[var(--success-text)]' : 'text-rose-300')}>
                        {result.correct ? <CheckCircle2 className="size-4" /> : <XCircle className="size-4" />}
                        <span>{result.correct ? "To'g'ri!" : "Noto'g'ri."} Tushuntirish:</span>
                      </p>
                      {!result.correct && result.correct_answer && (
                        <p className="text-xs font-semibold text-[var(--success-text)]">
                          To&apos;g&apos;ri javob: {result.correct_answer}
                        </p>
                      )}
                      <p className="text-xs leading-relaxed text-[var(--text-secondary)]">{result.explanation || item.explanation}</p>
                    </CardContent>
                  </Card>

                  <div className="flex items-center justify-between gap-3 pt-2">
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      {result.mastered
                        ? <><CheckCircle2 className="size-3.5 text-[var(--success-text)]" /> Bu savol o&apos;zlashtirildi</>
                        : 'Bu savol keyinroq yana takrorlanadi.'}
                    </span>
                    <Button onClick={next} className="shrink-0">
                      Keyingi xatoga o&apos;tish <ArrowRight className="size-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          </motion.div>
        )}
      </main>
    </>
  );
}


/* Bo'shliqli (gap_fill) va TRUE/FALSE/NOT GIVEN savollarining dastadagi ko'rinishi.
   TRUE/FALSE uchun tayyor tugmalar, bo'shliq uchun bitta kiritish maydoni — ikkalasi ham
   bitta harakatda javob yuboradi, chunki dastaning maqsadi tez takrorlash. */
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
      <div className="flex flex-wrap gap-2">
        {item.tfng_options.map((option) => {
          const chosen = value.toUpperCase() === option;
          return (
            <button
              key={option}
              type="button"
              disabled={!!result}
              onClick={() => onSubmit(option)}
              className={cn(
                'tactile-btn rounded-2xl border px-4 py-3 text-sm font-semibold transition-all',
                chosen && result?.correct && 'border-2 border-[var(--success)] bg-[var(--success)]/20 text-[var(--success-text)]',
                chosen && result && !result.correct && 'border-2 border-rose-500 bg-rose-500/20 text-rose-300',
                !chosen && 'border bg-[var(--surface-input)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]',
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
      className="flex flex-wrap items-center gap-2"
    >
      <Input
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        disabled={!!result}
        autoComplete="off"
        placeholder={item.max_words && item.max_words > 1 ? `Javob (${item.max_words} so'zgacha)` : 'Javob'}
        className="max-w-xs"
      />
      <Button type="submit" disabled={!!result || !draft.trim()}>Tekshirish</Button>
    </form>
  );
}
