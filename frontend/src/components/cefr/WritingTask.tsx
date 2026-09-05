'use client';

/* Writing topshirig'i: yozish butunlay bepul va avtomatik saqlanadi, AI tekshiruvi esa
   premium. Shuning uchun tekshiruv tugmasi bosilmaguncha hech qanday so'rov ketmaydi va
   premium bo'lmagan o'quvchi ham matnini bemalol yozib, saqlab qo'yishi mumkin. */

import { useEffect, useMemo, useState } from 'react';
import { Sparkles, Lock, Loader2, CheckCircle2, PenLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import type { CefrQuestion, WritingReview } from '@/lib/cefr-types';
import { cn } from '@/lib/utils';

/* So'z sanash qoidasi backend'dagi services/writing.count_words bilan bir xil bo'lishi
   shart — aks holda o'quvchi ko'rgan raqam AI ko'rgan raqamdan farq qiladi. */
export function countWords(text: string) {
  return (text.match(/[A-Za-zЀ-ӿ][A-Za-zЀ-ӿ'’-]*/g) ?? []).length;
}

const CRITERIA: { key: keyof WritingReview; label: string }[] = [
  { key: 'task', label: 'Topshiriq bajarilishi' },
  { key: 'coherence', label: 'Matn tuzilishi' },
  { key: 'lexis', label: "So'z boyligi" },
  { key: 'grammar', label: 'Grammatika' },
];

type Props = {
  question: CefrQuestion;
  onSave: (text: string) => void;
  onReview: () => Promise<WritingReview>;
};

export default function WritingTask({ question, onSave, onReview }: Props) {
  const [text, setText] = useState(question.text_answer ?? '');
  const [review, setReview] = useState<WritingReview | null>(question.review ?? null);
  const [checking, setChecking] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => { setText(question.text_answer ?? ''); }, [question.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const words = useMemo(() => countWords(text), [text]);
  const min = question.min_words ?? 0;
  const max = question.max_words ?? 0;
  const tooShort = min > 0 && words < min;
  const tooLong = max > 0 && words > max;

  async function check() {
    setChecking(true);
    setNotice(null);
    try {
      setReview(await onReview());
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Tekshirib bo\'lmadi.');
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="space-y-4">
      <div
        className="text-[length:var(--reading-size,1.0625rem)] leading-relaxed [&_li]:ml-1 [&_p+p]:mt-2 [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5"
        dangerouslySetInnerHTML={{ __html: question.body }}
      />

      <div className="rounded-2xl border border-border/70 bg-card/60 p-1">
        <Textarea
          value={text}
          onChange={(event) => { setText(event.target.value); onSave(event.target.value); }}
          placeholder="Javobingizni shu yerga yozing..."
          className="min-h-[280px] resize-y border-0 bg-transparent text-[length:var(--reading-size,1.0625rem)] leading-[1.8] focus-visible:ring-0"
        />
        <div className="flex flex-wrap items-center gap-2 border-t border-border/60 px-3 py-2 text-xs">
          <PenLine className="h-3.5 w-3.5 text-muted-foreground" />
          <span className={cn('font-semibold tabular-nums',
            tooShort ? 'text-amber-500' : tooLong ? 'text-rose-500' : 'text-emerald-500')}>
            {words} so&apos;z
          </span>
          {(min > 0 || max > 0) && (
            <span className="text-muted-foreground">
              (talab: {min > 0 ? `kamida ${min}` : ''}{min > 0 && max > 0 ? ' — ' : ''}{max > 0 ? `ko'pi bilan ${max}` : ''})
            </span>
          )}
          <span className="ml-auto flex items-center gap-1 text-muted-foreground">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Avtomatik saqlanmoqda
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" onClick={check} disabled={checking || words === 0} className="gap-2">
          {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {review ? 'Qayta tekshirish' : 'AI tekshirsin'}
        </Button>
        <span className="text-xs text-muted-foreground">
          Yozish bepul. AI baholashi (ball + CEFR darajasi) premium.
        </span>
      </div>

      {notice && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
          <Lock className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {review && <WritingReviewCard review={review} />}
    </div>
  );
}

/* Natijalar sahifasi ham shu kartani ishlatadi — imtihon paytida ko'rgan baho bilan
   yakunda ko'rsatiladigan baho bir xil ko'rinishda bo'lsin. */
export function WritingReviewCard({ review }: { review: WritingReview }) {
  return (
    <div className="space-y-4 rounded-2xl border border-border/70 bg-card/60 p-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex h-14 w-14 flex-col items-center justify-center rounded-2xl bg-primary/15 text-primary">
          <span className="text-lg font-bold leading-none">{review.overall}</span>
          <span className="text-[10px] leading-none opacity-70">/ 5</span>
        </div>
        <div>
          <div className="text-sm text-muted-foreground">Taxminiy daraja</div>
          <Badge className="mt-1 text-sm">{review.level}</Badge>
        </div>
        {review.summary && (
          <p className="w-full text-sm leading-relaxed text-muted-foreground sm:w-auto sm:flex-1">{review.summary}</p>
        )}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {CRITERIA.map(({ key, label }) => {
          const score = Number(review[key] ?? 0);
          return (
            <div key={key} className="flex items-center gap-3">
              <span className="w-40 shrink-0 text-xs text-muted-foreground">{label}</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${(score / 5) * 100}%` }} />
              </div>
              <span className="w-8 text-right text-xs font-semibold tabular-nums">{score}</span>
            </div>
          );
        })}
      </div>

      {(review.strengths?.length || review.improvements?.length) ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {review.strengths?.length ? (
            <div>
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-emerald-400">Kuchli tomonlar</div>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {review.strengths.map((item) => <li key={item}>• {item}</li>)}
              </ul>
            </div>
          ) : null}
          {review.improvements?.length ? (
            <div>
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-400">Yaxshilash kerak</div>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {review.improvements.map((item) => <li key={item}>• {item}</li>)}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      {review.corrections?.length ? (
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Xatolar ustida</div>
          <div className="space-y-2">
            {review.corrections.map((item, index) => (
              <div key={index} className="rounded-xl border border-border/60 p-3 text-sm">
                <div className="text-rose-400 line-through decoration-rose-400/50">{item.wrong}</div>
                <div className="text-emerald-400">{item.better}</div>
                {item.why && <div className="mt-1 text-xs text-muted-foreground">{item.why}</div>}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
