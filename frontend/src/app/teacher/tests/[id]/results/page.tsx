'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ClipboardList, PenLine } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import TeacherShell from '@/components/teacher/TeacherShell';
import PageHeader from '@/components/panel/PageHeader';
import BrandLoader from '@/components/BrandLoader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

type ResultsData = {
  attempts: { id: number; student: string; score: number | null; started_at: string }[];
  stats: { question_id: number; body: string; total: number; correct: number; pct: number }[];
};

function scoreTone(score: number | null) {
  if (score === null) return 'text-muted-foreground';
  if (score >= 80) return 'text-[var(--success-text)]';
  if (score >= 60) return 'text-[var(--warning-text)]';
  return 'text-[var(--danger-text)]';
}

export default function TestResultsPage() {
  const { id } = useParams<{ id: string }>();
  const { access } = useAuthStore();
  const [data, setData] = useState<ResultsData | null>(null);

  useEffect(() => {
    if (!access) return;
    apiFetch<ResultsData>(`/api/teacher/tests/${id}/results/`).then(setData);
  }, [access, id]);

  if (!data) return <TeacherShell><div className="py-10"><BrandLoader /></div></TeacherShell>;

  return (
    <TeacherShell>
      <div className="mx-auto max-w-3xl space-y-6">
        <PageHeader
          title="Natijalar"
          description={`${data.attempts.length} ta urinish · ${data.stats.length} ta savol`}
          backHref={`/teacher/tests/${id}/build`}
        />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Savollar bo&apos;yicha statistika</CardTitle>
            <p className="text-xs text-muted-foreground">
              Foiz — shu savolga to&apos;g&apos;ri javob berganlar ulushi. Past foiz = qiyin yoki noaniq savol.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.stats.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">Hali javob berilmagan.</p>
            )}
            {data.stats.map((s) => (
              <div key={s.question_id} className="space-y-1.5">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate" dangerouslySetInnerHTML={{ __html: s.body }} />
                  <span className={cn('shrink-0 font-mono font-bold', scoreTone(s.pct))}>
                    {s.pct}% <span className="font-normal text-muted-foreground">({s.total})</span>
                  </span>
                </div>
                <Progress value={s.pct} className="h-1.5" />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Urinishlar</CardTitle></CardHeader>
          <CardContent>
            {data.attempts.length === 0 && (
              <div className="py-10 text-center">
                <ClipboardList className="mx-auto mb-2 size-8 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">Bu testni hali hech kim yechmagan.</p>
              </div>
            )}
            {data.attempts.map((a, i) => (
              <div key={a.id}>
                {i > 0 && <Separator />}
                <div className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{a.student}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(a.started_at).toLocaleString('uz-UZ')}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className={cn('font-mono text-sm font-bold', scoreTone(a.score))}>
                      {a.score !== null ? `${a.score.toFixed(0)}%` : '—'}
                    </span>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/teacher/tests/${id}/attempts/${a.id}/grade`}>
                        <PenLine className="size-3.5" /> Baholash
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </TeacherShell>
  );
}
