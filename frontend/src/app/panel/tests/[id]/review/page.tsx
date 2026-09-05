'use client';

/* Javoblarni tekshirish — PDF dan import qilingan testning to'g'ri javoblarini tasdiqlash.
 *
 * Import savollarni aniq o'qiydi, lekin to'g'ri javobni AI taxmin qiladi (imtihon varaqasida
 * javob kaliti bo'lmaydi). Shuning uchun bu sahifa bitta ishga qaratilgan: 45 ta savolni
 * imkon qadar tez ko'zdan kechirish. Savollar bittalab ko'rsatiladi, variant tanlash
 * klaviaturadan (A-F yoki 1-6) ishlaydi va tanlangandan keyin keyingi savolga o'zi o'tadi —
 * ro'yxat ko'rinishida har bir savol uchun sichqonchani izlashdan ancha tez. */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import {
  Check, ChevronLeft, ChevronRight, Eye, Loader2, Save, TriangleAlert,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import PanelShell from '@/components/panel/PanelShell';
import PageHeader from '@/components/panel/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

type Choice = { id: number; text: string; is_correct: boolean };
type GroupOption = { id: number; label: string; text: string };
type SubQuestion = { id: number; label: string; text: string; reference_answer: string };

type ReviewQuestion = {
  id: number;
  question_type: string;
  body: string;
  image_url: string | null;
  choices: Choice[];
  group: { instruction: string; options: GroupOption[]; correct_option_id: number | null } | null;
  sub_questions: SubQuestion[];
  reference_answer: string;
  needs_review: boolean;
};

type ReviewData = {
  id: number; title: string; is_published: boolean;
  questions: ReviewQuestion[]; needs_review_count: number;
};

const QUESTION_TYPE: Record<string, string> = {
  single_choice: 'Variantli', image_based: 'Rasmli', table_based: 'Jadvalli',
  matching: 'Moslashtirish', grouped_item: 'Guruhlangan', open_written: 'Yozma',
};

const LETTERS = 'ABCDEF';

/* Variant matni bazada harf bilan birga saqlanadi ("B) Puni urushlari") — o'quvchi ham
   shu ko'rinishda ko'radi. Bu yerda harf alohida nishonda chiqadi, shuning uchun matn
   boshidagi takroriy harfni olib tashlaymiz, aks holda "B  B) Puni urushlari" bo'ladi. */
function stripLabel(text: string, label: string) {
  const prefix = new RegExp(`^\\s*${label}\\s*\\)\\s*`, 'i');
  return text.replace(prefix, '');
}

export default function PanelTestReviewPage() {
  const { id } = useParams<{ id: string }>();
  const { access } = useAuthStore();
  const [data, setData] = useState<ReviewData | null>(null);
  const [index, setIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [onlyPending, setOnlyPending] = useState(false);

  useEffect(() => {
    if (!access) return;
    apiFetch<ReviewData>(`/api/panel/testsets/${id}/review/`).then(setData)
      .catch((e) => toast.error(e instanceof Error ? e.message : "Yuklashda xatolik yuz berdi"));
  }, [access, id]);

  /* Filtr yoqilganda o'sha paytdagi tekshirilmagan savollar ro'yxati muzlatib qo'yiladi.
   * Aks holda savolga javob berishingiz bilan u ro'yxatdan tushib ketardi, qolganlarining
   * tartib raqami siljib, "keyingi" bosilganda bitta savol o'tkazib yuborilardi. */
  const [pendingIds, setPendingIds] = useState<number[] | null>(null);

  const visible = useMemo(() => {
    if (!data) return [];
    if (!onlyPending || !pendingIds) return data.questions;
    const wanted = new Set(pendingIds);
    return data.questions.filter((q) => wanted.has(q.id));
  }, [data, onlyPending, pendingIds]);

  const toggleFilter = useCallback(() => {
    setOnlyPending((on) => {
      if (!on) setPendingIds(data?.questions.filter((q) => q.needs_review).map((q) => q.id) ?? []);
      return !on;
    });
    setIndex(0);
  }, [data]);

  const current = visible[Math.min(index, visible.length - 1)] ?? null;
  const total = data?.questions.length ?? 0;
  const pending = data?.questions.filter((q) => q.needs_review).length ?? 0;
  const done = total - pending;

  const move = useCallback((step: number) => {
    setIndex((i) => Math.min(Math.max(i + step, 0), Math.max(visible.length - 1, 0)));
  }, [visible.length]);

  const applyUpdate = useCallback((updated: ReviewQuestion) => {
    setData((d) => (d ? {
      ...d,
      questions: d.questions.map((q) => (q.id === updated.id ? updated : q)),
    } : d));
  }, []);

  const save = useCallback(async (question: ReviewQuestion, body: Record<string, unknown>,
                                 advance: boolean) => {
    setSaving(true);
    try {
      const res = await apiFetch<{ question: ReviewQuestion }>(
        `/api/panel/testsets/${id}/review/${question.id}/`,
        { method: 'POST', body: JSON.stringify(body) },
      );
      applyUpdate(res.question);
      if (advance) move(1);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Saqlashda xatolik');
    } finally {
      setSaving(false);
    }
  }, [applyUpdate, id, move]);

  const pick = useCallback((question: ReviewQuestion, position: number) => {
    if (question.question_type === 'grouped_item') {
      const option = question.group?.options[position];
      if (option) save(question, { group_option_id: option.id }, true);
      return;
    }
    const choice = question.choices[position];
    if (choice) save(question, { choice_id: choice.id }, true);
  }, [save]);

  /* Klaviatura: A-F yoki 1-6 — variant tanlash, o'q tugmalari — savollar orasida yurish.
   * Matn maydoniga yozayotganda o'chiriladi, aks holda yozma javobning har harfi variant
   * tanlab yuborardi.
   *
   * Listener bir marta ulanadi va joriy savolni ref orqali o'qiydi. Avval u har bir savol
   * almashganda qayta ulanardi — natijada dev rejimida (Fast Refresh) eski listenerlar
   * to'planib qolib, bitta bosish o'nlab savolga javob yozib yuborgan edi. Bitta barqaror
   * listener bunday holatni umuman imkonsiz qiladi. */
  const state = useRef({ current, saving, move, pick });
  useEffect(() => {
    state.current = { current, saving, move, pick };
  });

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const { current: question, saving: busy, move: go, pick: choose } = state.current;
      if (!question || question.question_type === 'open_written') return;

      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA'].includes(target.tagName)) return;
      if (event.key === 'ArrowRight') { go(1); return; }
      if (event.key === 'ArrowLeft') { go(-1); return; }

      const key = event.key.toUpperCase();
      const byLetter = LETTERS.indexOf(key);
      const byDigit = /^[1-6]$/.test(key) ? Number(key) - 1 : -1;
      const position = byLetter >= 0 ? byLetter : byDigit;
      if (position < 0) return;

      event.preventDefault();
      // Saqlash tugamaguncha yangi bosishni qabul qilmaymiz: tugmani bosib turganda
      // avtotakror bir nechta savolga javob yozib yuborishi mumkin edi.
      if (busy || event.repeat) return;
      choose(question, position);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!data) {
    return (
      <PanelShell>
        <div className="mx-auto max-w-3xl space-y-4">
          <Skeleton className="h-9 w-72" /><Skeleton className="h-96 w-full" />
        </div>
      </PanelShell>
    );
  }

  return (
    <PanelShell>
      <div className="mx-auto max-w-3xl space-y-5">
        <PageHeader
          backHref={`/panel/tests/${id}`}
          title="Javoblarni tekshirish"
          description={data.title}
          actions={
            pending === 0
              ? <Badge variant="outline" className="bg-[var(--success-soft)] text-[var(--success-text)] border-[var(--success)]/25">Hammasi tekshirildi</Badge>
              : <Badge variant="outline" className="bg-[var(--warning-soft)] text-[var(--warning-text)] border-[var(--warning)]/25">{pending} ta qoldi</Badge>
          }
        />

        <Card>
          <CardContent className="space-y-3 py-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--text-secondary)]">{done} / {total} savol tekshirildi</span>
              <Button variant="ghost" size="sm" onClick={toggleFilter}>
                {onlyPending ? 'Hammasini ko‘rsatish' : 'Faqat tekshirilmaganlar'}
              </Button>
            </div>
            <Progress value={total ? (done / total) * 100 : 0} />
            {pending === 0 && !data.is_published && (
              <Button asChild className="w-full">
                <Link href={`/panel/tests/${id}`}><Eye className="size-4" /> Testni nashr etishga o&apos;tish</Link>
              </Button>
            )}
          </CardContent>
        </Card>

        {!current ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Tekshirilmagan savol qolmadi.
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <Button variant="outline" size="sm" onClick={() => move(-1)} disabled={index === 0}>
                <ChevronLeft className="size-4" /> Oldingi
              </Button>
              <span className="text-sm text-muted-foreground">
                {index + 1} / {visible.length}
              </span>
              <Button variant="outline" size="sm" onClick={() => move(1)} disabled={index >= visible.length - 1}>
                Keyingi <ChevronRight className="size-4" />
              </Button>
            </div>

            <QuestionCard
              key={current.id}
              question={current}
              saving={saving}
              onPick={(position) => pick(current, position)}
              onSaveWritten={(answers) => save(current, answers, false)}
            />
          </>
        )}
      </div>
    </PanelShell>
  );
}

function QuestionCard({ question, saving, onPick, onSaveWritten }: {
  question: ReviewQuestion;
  saving: boolean;
  onPick: (position: number) => void;
  onSaveWritten: (body: Record<string, unknown>) => void;
}) {
  const isWritten = question.question_type === 'open_written';
  const options: { id: number; label: string; text: string; selected: boolean }[] =
    question.question_type === 'grouped_item'
      ? (question.group?.options ?? []).map((o) => ({
          id: o.id, label: o.label, text: o.text,
          selected: question.group?.correct_option_id === o.id,
        }))
      : question.choices.map((c, i) => {
          const label = LETTERS[i] ?? String(i + 1);
          return { id: c.id, label, text: stripLabel(c.text, label), selected: c.is_correct };
        });

  return (
    <Card>
      <CardContent className="space-y-4 py-5">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{QUESTION_TYPE[question.question_type] ?? question.question_type}</Badge>
          {question.needs_review && (
            <Badge variant="outline" className="gap-1 bg-[var(--warning-soft)] text-[var(--warning-text)] border-[var(--warning)]/25">
              <TriangleAlert className="size-3" /> Javob belgilanmagan
            </Badge>
          )}
        </div>

        {question.group?.instruction && (
          <p className="text-sm font-medium text-[var(--text-secondary)]">{question.group.instruction}</p>
        )}

        {/* Savol matni backend'da CKEditor HTML sifatida saqlanadi: savol matni <p>,
            bandlar ("1) ...", "a) ...") har biri alohida <p>, moslashtirish va jadvalli
            savollarda esa <table>. Import shu tuzilmani beradi — bu yerda faqat o'qishga
            qulay qilib bezaladi. Jadval keng bo'lsa sahifani cho'zmasdan o'zi suriladi. */}
        <div
          className="space-y-1.5 text-sm leading-relaxed [&_p]:m-0
                     [&_table]:my-2 [&_table]:block [&_table]:max-w-full [&_table]:overflow-x-auto
                     [&_table]:border-collapse [&_table]:text-[13px]
                     [&_td]:border [&_td]:border-[var(--border)] [&_td]:p-2 [&_td]:align-top
                     [&_th]:border [&_th]:border-[var(--border)] [&_th]:bg-[var(--surface-hover)]
                     [&_th]:p-2 [&_th]:text-left [&_th]:font-semibold
                     [&_tr>td:first-child]:w-10 [&_tr>td:first-child]:text-center
                     [&_tr>td:first-child]:font-medium"
          dangerouslySetInnerHTML={{ __html: question.body }}
        />

        {question.image_url && (
          <Image
            src={question.image_url}
            alt="Savol rasmi"
            width={900}
            height={600}
            unoptimized
            /* w-full + h-auto: next/image o'zining ichki o'lchamlarini shu ikkovi bilan
               masshtablaydi; w-auto bilan birga qo'yilganda rasm bir nuqtaga siqilib
               qolar edi. max-w esa balandroq xaritani ekranni egallashdan saqlaydi. */
            className="mx-auto h-auto w-full max-w-[560px] rounded-lg border bg-white p-2"
          />
        )}

        {isWritten ? (
          <WrittenAnswers question={question} saving={saving} onSave={onSaveWritten} />
        ) : (
          <div className="space-y-2">
            {options.map((option, position) => (
              <button
                key={option.id}
                type="button"
                disabled={saving}
                onClick={() => onPick(position)}
                className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left text-sm transition-colors disabled:opacity-60 ${
                  option.selected
                    ? 'border-[var(--success)] bg-[var(--success-soft)] text-[var(--success-text)]'
                    : 'hover:bg-[var(--surface-hover)]'
                }`}
              >
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border font-mono text-xs">
                  {option.label}
                </span>
                <span className="min-w-0 flex-1">{option.text}</span>
                {option.selected && <Check className="mt-0.5 size-4 shrink-0" />}
              </button>
            ))}
            <p className="pt-1 text-xs text-muted-foreground">
              Klaviatura: {LETTERS.slice(0, options.length).split('').join('/')} — variant tanlash,
              ← → — savollar orasida yurish.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function WrittenAnswers({ question, saving, onSave }: {
  question: ReviewQuestion;
  saving: boolean;
  onSave: (body: Record<string, unknown>) => void;
}) {
  const [drafts, setDrafts] = useState<Record<string, string>>(() =>
    question.sub_questions.length
      ? Object.fromEntries(question.sub_questions.map((s) => [String(s.id), s.reference_answer]))
      : { single: question.reference_answer },
  );

  const submit = () => {
    if (question.sub_questions.length) {
      onSave({ reference_answers: drafts });
    } else {
      onSave({ reference_answer: drafts.single ?? '' });
    }
  };

  return (
    <div className="space-y-3">
      {question.sub_questions.length ? (
        question.sub_questions.map((sub) => (
          <div key={sub.id} className="space-y-1.5">
            <Label htmlFor={`sub-${sub.id}`} className="text-sm font-normal text-[var(--text-secondary)]">
              {sub.label}) {sub.text}
            </Label>
            <Textarea
              id={`sub-${sub.id}`}
              rows={2}
              placeholder="Namunaviy to'g'ri javob"
              value={drafts[String(sub.id)] ?? ''}
              onChange={(e) => setDrafts({ ...drafts, [String(sub.id)]: e.target.value })}
            />
          </div>
        ))
      ) : (
        <div className="space-y-1.5">
          <Label htmlFor="single-answer" className="text-sm font-normal text-[var(--text-secondary)]">
            Namunaviy to&apos;g&apos;ri javob
          </Label>
          <Textarea
            id="single-answer"
            rows={3}
            value={drafts.single ?? ''}
            onChange={(e) => setDrafts({ ...drafts, single: e.target.value })}
          />
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Bu javob o&apos;quvchiga ko&apos;rsatilmaydi — AI o&apos;quvchining yozgan javobini shu bilan solishtirib baholaydi.
      </p>
      <Button onClick={submit} disabled={saving}>
        {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
        Saqlash
      </Button>
    </div>
  );
}
