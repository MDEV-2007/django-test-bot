'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CheckCircle2, XCircle, PenLine } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import TeacherShell from '@/components/teacher/TeacherShell';
import PageHeader from '@/components/panel/PageHeader';
import BrandLoader from '@/components/BrandLoader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Answer = {
  id: number; question_body: string; question_type: string; text_answer: string;
  open_answers: Record<string, string>; is_correct: boolean;
};

export default function AttemptGradePage() {
  const { id, attemptId } = useParams<{ id: string; attemptId: string }>();
  const router = useRouter();
  const { access } = useAuthStore();
  const [answers, setAnswers] = useState<Answer[] | null>(null);
  const [grades, setGrades] = useState<Record<number, boolean>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!access) return;
    apiFetch<{ answers: Answer[] }>(`/api/teacher/tests/${id}/attempts/${attemptId}/grade/`).then((d) => {
      setAnswers(d.answers);
      setGrades(Object.fromEntries(d.answers.map((a) => [a.id, a.is_correct])));
    });
  }, [access, id, attemptId]);

  async function submit() {
    setSaving(true);
    await apiFetch(`/api/teacher/tests/${id}/attempts/${attemptId}/grade/`, {
      method: 'POST', body: JSON.stringify({ grades }),
    });
    router.push(`/teacher/tests/${id}/results`);
  }

  if (!answers) return <TeacherShell><div className="py-10"><BrandLoader /></div></TeacherShell>;

  return (
    <TeacherShell>
      <div className="mx-auto max-w-2xl space-y-6">
        <PageHeader
          title="Ochiq savollarni baholash"
          description="Baholashdan keyin urinish balli avtomatik qayta hisoblanadi."
          backHref={`/teacher/tests/${id}/results`}
        />

        {answers.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <PenLine className="mx-auto mb-2 size-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">Bu urinishda ochiq savol javoblari yo&apos;q.</p>
            </CardContent>
          </Card>
        )}

        {answers.map((a) => {
          const isCorrect = grades[a.id];
          return (
            <Card key={a.id}>
              <CardContent className="space-y-3 pt-6">
                <p className="text-sm font-medium" dangerouslySetInnerHTML={{ __html: a.question_body }} />

                {Object.keys(a.open_answers || {}).length > 0 ? (
                  <div className="space-y-1.5 rounded-xl border bg-[var(--surface-input)] p-3">
                    {Object.entries(a.open_answers).map(([label, val]) => (
                      <p key={label} className="text-sm text-[var(--text-secondary)]">
                        <b>{label})</b> {val}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-xl border bg-[var(--surface-input)] p-3 text-sm text-[var(--text-secondary)]">
                    {a.text_answer || "(bo'sh)"}
                  </p>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className={cn(
                      'flex-1',
                      isCorrect && 'border-[var(--success)]/40 bg-[var(--success-soft)] text-[var(--success-text)]',
                    )}
                    onClick={() => setGrades({ ...grades, [a.id]: true })}
                  >
                    <CheckCircle2 className="size-4" /> To&apos;g&apos;ri
                  </Button>
                  <Button
                    variant="outline"
                    className={cn(
                      'flex-1',
                      !isCorrect && 'border-[var(--danger)]/40 bg-[var(--danger-soft)] text-[var(--danger-text)]',
                    )}
                    onClick={() => setGrades({ ...grades, [a.id]: false })}
                  >
                    <XCircle className="size-4" /> Noto&apos;g&apos;ri
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {answers.length > 0 && (
          <Button onClick={submit} disabled={saving} size="lg" className="w-full">
            {saving ? 'Saqlanmoqda...' : 'Baholashni saqlash'}
          </Button>
        )}
      </div>
    </TeacherShell>
  );
}
