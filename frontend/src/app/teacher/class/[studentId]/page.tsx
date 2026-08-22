'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { TrendingDown, FileCheck2 } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import TeacherShell from '@/components/teacher/TeacherShell';
import PageHeader from '@/components/panel/PageHeader';
import BrandLoader from '@/components/BrandLoader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

type Detail = {
  student: {
    student_id: number; name: string; username: string; avatar_url: string | null;
    level: number; xp: number; streak: number; joined_at: string;
  };
  attempts: { id: number; test_title: string; score: number | null; completed_at: string }[];
  topics: { title: string; avg_score: number; answers: number }[];
  weak_topics: { title: string; avg_score: number; answers: number }[];
};

function scoreTone(score: number | null) {
  if (score === null) return 'text-muted-foreground';
  if (score >= 80) return 'text-[var(--success-text)]';
  if (score >= 60) return 'text-[var(--warning-text)]';
  return 'text-[var(--danger-text)]';
}

export default function TeacherStudentPage() {
  const { studentId } = useParams<{ studentId: string }>();
  const { access } = useAuthStore();
  const [data, setData] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!access) return;
    apiFetch<Detail>(`/api/teacher/me/students/${studentId}/`)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Xatolik'));
  }, [access, studentId]);

  if (error) {
    return (
      <TeacherShell>
        <div className="space-y-4">
          <PageHeader title="O'quvchi" backHref="/teacher/class" />
          <Card className="border-[var(--danger)]/30">
            <CardContent className="pt-6 text-sm text-[var(--danger-text)]">{error}</CardContent>
          </Card>
        </div>
      </TeacherShell>
    );
  }
  if (!data) return <TeacherShell><div className="py-10"><BrandLoader /></div></TeacherShell>;

  const st = data.student;

  return (
    <TeacherShell>
      <div className="mx-auto max-w-3xl space-y-6">
        <PageHeader title={st.name} description={`@${st.username}`} backHref="/teacher/class" />

        <Card>
          <CardContent className="flex flex-wrap items-center gap-4 pt-6">
            <Avatar className="size-14">
              <AvatarImage src={st.avatar_url || undefined} alt={st.name} />
              <AvatarFallback>{st.name.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="ml-auto flex flex-wrap gap-2 font-mono text-xs">
              <Badge variant="secondary">Lvl {st.level}</Badge>
              <Badge variant="secondary">{st.xp.toLocaleString('uz-UZ')} XP</Badge>
              <Badge variant="secondary">{st.streak} kun streak</Badge>
            </div>
          </CardContent>
        </Card>

        {data.weak_topics.length > 0 && (
          <Card className="border-[var(--danger)]/25 bg-[var(--danger)]/[0.04]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingDown className="size-4 text-[var(--danger-text)]" /> Zaif mavzular
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.weak_topics.map((t) => (
                <div key={t.title} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate font-medium">{t.title}</span>
                    <span className={cn('shrink-0 font-mono font-bold', scoreTone(t.avg_score))}>{t.avg_score}%</span>
                  </div>
                  <Progress value={t.avg_score} className="h-1.5" />
                  <p className="text-xs text-muted-foreground">{t.answers} ta javob</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle className="text-base">So&apos;nggi natijalar</CardTitle></CardHeader>
          <CardContent>
            {data.attempts.length === 0 && (
              <div className="py-8 text-center">
                <FileCheck2 className="mx-auto mb-2 size-8 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">Bu o&apos;quvchi hali test yechmagan.</p>
              </div>
            )}
            {data.attempts.map((a, i) => (
              <div key={a.id}>
                {i > 0 && <Separator />}
                <div className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{a.test_title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(a.completed_at).toLocaleDateString('uz-UZ')}
                    </p>
                  </div>
                  <span className={cn('shrink-0 font-mono text-sm font-bold', scoreTone(a.score))}>
                    {a.score !== null ? `${Math.round(a.score)}%` : '—'}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {data.topics.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Barcha mavzular</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {data.topics.map((t) => (
                <div key={t.title} className="flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate">{t.title}</span>
                  <span className={cn('shrink-0 font-mono', scoreTone(t.avg_score))}>{t.avg_score}%</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </TeacherShell>
  );
}
