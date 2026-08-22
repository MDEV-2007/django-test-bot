'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BookOpen, Plus, ChevronRight } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import TeacherShell from '@/components/teacher/TeacherShell';
import PageHeader from '@/components/panel/PageHeader';
import Reveal from '@/components/motion/Reveal';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

type LessonRow = { id: number; title: string; topic: string | null; is_published: boolean };

export default function TeacherLessonsPage() {
  const { access } = useAuthStore();
  const [lessons, setLessons] = useState<LessonRow[] | null>(null);

  useEffect(() => {
    if (!access) return;
    apiFetch<{ results: LessonRow[] }>('/api/teacher/lessons/').then((d) => setLessons(d.results));
  }, [access]);

  return (
    <TeacherShell>
      <div className="space-y-6">
        <PageHeader
          title="Darslarim"
          description="Yozgan darslaringiz va ularning nashr holati."
          actions={<Button asChild><Link href="/teacher/lessons/new"><Plus className="size-4" /> Yangi dars</Link></Button>}
        />

        {!lessons && (
          <div className="space-y-2.5">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-[66px] w-full" />)}
          </div>
        )}

        {lessons?.length === 0 && (
          <Card>
            <CardContent className="py-14 text-center">
              <BookOpen className="mx-auto mb-2 size-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">Hali dars qo&apos;shilmagan.</p>
              <Button asChild size="sm" className="mt-4">
                <Link href="/teacher/lessons/new">Birinchi darsni yozish</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="space-y-2.5">
          {lessons?.map((l, i) => (
            <Reveal key={l.id} index={i}>
              <Link href={`/teacher/lessons/${l.id}`} className="group block">
                <Card className="gap-0 py-0 transition-colors group-hover:border-[var(--accent-border)]">
                  <CardContent className="flex items-center justify-between gap-4 p-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold transition-colors group-hover:text-[var(--accent-text)]">
                        {l.title}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{l.topic || '—'}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <Badge
                        variant={l.is_published ? 'outline' : 'secondary'}
                        className={l.is_published ? 'border-[var(--success)]/25 bg-[var(--success-soft)] text-[var(--success-text)]' : ''}
                      >
                        {l.is_published ? 'Nashr etilgan' : 'Qoralama'}
                      </Badge>
                      <ChevronRight className="size-4 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </TeacherShell>
  );
}
