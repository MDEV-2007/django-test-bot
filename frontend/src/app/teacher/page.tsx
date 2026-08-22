'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileCheck2, BookOpen, Gamepad2, ClipboardList, CheckCircle2, Plus, Users } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import TeacherShell from '@/components/teacher/TeacherShell';
import PageHeader from '@/components/panel/PageHeader';
import Reveal from '@/components/motion/Reveal';
import StatNumber from '@/components/motion/StatNumber';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

type Dashboard = {
  stats: { tests: number; published_tests: number; lessons: number; games: number; attempts: number };
  recent_attempts: { id: number; student: string; test_title: string; score: number | null; started_at: string }[];
};

function scoreTone(score: number | null) {
  if (score === null) return 'text-muted-foreground';
  if (score >= 80) return 'text-[var(--success-text)]';
  if (score >= 60) return 'text-[var(--warning-text)]';
  return 'text-[var(--danger-text)]';
}

export default function TeacherDashboard() {
  const { access } = useAuthStore();
  const [data, setData] = useState<Dashboard | null>(null);

  useEffect(() => {
    if (!access) return;
    apiFetch<Dashboard>('/api/teacher/').then(setData);
  }, [access]);

  const tiles = data ? [
    { label: 'Testlar', value: data.stats.tests, icon: FileCheck2, tone: 'text-[var(--tone-growth-text)]', bg: 'bg-[var(--tone-growth-soft)]' },
    { label: 'Nashr etilgan', value: data.stats.published_tests, icon: CheckCircle2, tone: 'text-[var(--success-text)]', bg: 'bg-[var(--success-soft)]' },
    { label: 'Darslar', value: data.stats.lessons, icon: BookOpen, tone: 'text-[var(--tone-lesson-text)]', bg: 'bg-[var(--tone-lesson-soft)]' },
    { label: "O'yinlar", value: data.stats.games, icon: Gamepad2, tone: 'text-[var(--tone-streak-text)]', bg: 'bg-[var(--tone-streak-soft)]' },
    { label: 'Urinishlar', value: data.stats.attempts, icon: ClipboardList, tone: 'text-[var(--tone-ai-text)]', bg: 'bg-[var(--tone-ai-soft)]' },
  ] : [];

  return (
    <TeacherShell>
      <div className="space-y-6">
        <PageHeader
          title="O'qituvchi paneli"
          description="Testlar, darslar, o'yinlar va sinfingiz bir joyda."
          actions={
            <>
              <Button asChild variant="outline"><Link href="/teacher/class"><Users className="size-4" /> Mening sinfim</Link></Button>
              <Button asChild><Link href="/teacher/tests/new"><Plus className="size-4" /> Yangi test</Link></Button>
            </>
          }
        />

        {!data && (
          <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
          </div>
        )}

        {data && (
          <>
            <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-5">
              {tiles.map((t, i) => {
                const Icon = t.icon;
                return (
                  <Reveal key={t.label} index={i}>
                    <Card className="h-full gap-0 py-4">
                      <CardContent className="flex items-center gap-3 px-4">
                        <div className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl', t.bg, t.tone)}>
                          <Icon className="size-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-xs text-muted-foreground">{t.label}</p>
                          <p className="font-mono text-lg font-bold tabular-nums">
                            <StatNumber value={t.value} />
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </Reveal>
                );
              })}
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">So&apos;nggi urinishlar</CardTitle>
              </CardHeader>
              <CardContent>
                {data.recent_attempts.length === 0 && (
                  <div className="py-10 text-center">
                    <ClipboardList className="mx-auto mb-2 size-8 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">
                      Hali hech kim testlaringizni yechmagan.
                    </p>
                  </div>
                )}
                {data.recent_attempts.map((a, i) => (
                  <div key={a.id}>
                    {i > 0 && <Separator />}
                    <div className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{a.student}</p>
                        <p className="truncate text-xs text-muted-foreground">{a.test_title}</p>
                      </div>
                      <span className={cn('shrink-0 font-mono text-sm font-bold', scoreTone(a.score))}>
                        {a.score !== null ? `${a.score.toFixed(0)}%` : '—'}
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </TeacherShell>
  );
}
