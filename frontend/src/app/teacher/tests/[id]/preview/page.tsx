'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Check, HelpCircle } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import TeacherShell from '@/components/teacher/TeacherShell';
import PageHeader from '@/components/panel/PageHeader';
import BrandLoader from '@/components/BrandLoader';
import Reveal from '@/components/motion/Reveal';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type Question = {
  id: number; body: string; question_type: string; image: string;
  options: { text: string; is_correct: boolean }[];
  pairs: { left_key: string; left_text: string; right_key: string; right_text: string }[];
  sub_questions: { label: string; text: string; reference_answer: string }[];
  group: { instruction: string; options: { label: string; text: string }[]; correct_index: number } | null;
};

export default function TestPreviewPage() {
  const { id } = useParams<{ id: string }>();
  const { access } = useAuthStore();
  const [questions, setQuestions] = useState<Question[] | null>(null);

  useEffect(() => {
    if (!access) return;
    apiFetch<{ questions: Question[] }>(`/api/teacher/tests/${id}/preview/`).then((d) => setQuestions(d.questions));
  }, [access, id]);

  if (!questions) return <TeacherShell><div className="py-10"><BrandLoader /></div></TeacherShell>;

  return (
    <TeacherShell>
      <div className="mx-auto max-w-3xl space-y-6">
        <PageHeader
          title="Ko'rib chiqish"
          description="To'g'ri javoblar yashil bilan belgilangan — o'quvchiga bunday ko'rinmaydi."
          backHref={`/teacher/tests/${id}/build`}
        />

        {questions.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <HelpCircle className="mx-auto mb-2 size-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">Testda savol yo&apos;q.</p>
            </CardContent>
          </Card>
        )}

        {questions.map((q, i) => (
          <Reveal key={q.id} index={i} y={8}>
            <Card>
              <CardContent className="space-y-3 pt-6">
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0 text-sm font-semibold">
                    {i + 1}. <span dangerouslySetInnerHTML={{ __html: q.body }} />
                  </p>
                  <Badge variant="secondary" className="shrink-0">{q.question_type}</Badge>
                </div>

                {q.image && <img src={q.image} alt="" className="max-h-56 rounded-xl border" />}

                {q.question_type === 'matching' ? (
                  <div className="grid gap-3 text-sm sm:grid-cols-2">
                    <div className="space-y-1">
                      {q.pairs.filter((p) => p.left_key).map((p, pi) => (
                        <p key={pi}><b>{p.left_key}.</b> {p.left_text}</p>
                      ))}
                    </div>
                    <div className="space-y-1 text-[var(--text-secondary)]">
                      {q.pairs.map((p, pi) => <p key={pi}><b>{p.right_key})</b> {p.right_text}</p>)}
                    </div>
                  </div>
                ) : q.question_type === 'grouped_item' && q.group ? (
                  <div className="space-y-1.5">
                    <p className="text-xs text-muted-foreground">{q.group.instruction}</p>
                    {q.group.options.map((o, oi) => {
                      const correct = oi === q.group!.correct_index;
                      return (
                        <div
                          key={oi}
                          className={cn(
                            'flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm',
                            correct
                              ? 'bg-[var(--success-soft)] font-semibold text-[var(--success-text)]'
                              : 'text-[var(--text-secondary)]',
                          )}
                        >
                          <span className="flex size-6 items-center justify-center rounded-lg border text-xs">{o.label}</span>
                          {o.text}
                          {correct && <Check className="ml-auto size-4" />}
                        </div>
                      );
                    })}
                  </div>
                ) : q.question_type === 'open_written' ? (
                  <div className="space-y-1 text-sm text-muted-foreground">
                    {q.sub_questions.length > 0 ? (
                      q.sub_questions.map((s, si) => <p key={si}><b>{s.label})</b> {s.text}</p>)
                    ) : (
                      <div className="rounded-lg border border-dashed p-3 text-[var(--text-faint)]">
                        Yozma javob maydoni
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {q.options.map((o, oi) => (
                      <div
                        key={oi}
                        className={cn(
                          'flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm',
                          o.is_correct
                            ? 'bg-[var(--success-soft)] font-semibold text-[var(--success-text)]'
                            : 'text-[var(--text-secondary)]',
                        )}
                      >
                        <span
                          className={cn(
                            'size-3.5 rounded-full border-2',
                            o.is_correct ? 'border-[var(--success)] bg-[var(--success)]' : 'border-[var(--border-strong)]',
                          )}
                        />
                        {o.text}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </Reveal>
        ))}
      </div>
    </TeacherShell>
  );
}
