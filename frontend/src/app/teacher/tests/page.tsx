'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileCheck2, Plus, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import TeacherShell from '@/components/teacher/TeacherShell';
import PageHeader from '@/components/panel/PageHeader';
import Reveal from '@/components/motion/Reveal';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

type TestRow = {
  id: number; title: string; subject: string | null; status_label: string;
  is_published: boolean; is_archived: boolean; questions_count: number; updated_at: string;
};

function statusTone(row: TestRow) {
  if (row.is_published) return 'border-[var(--success)]/25 bg-[var(--success-soft)] text-[var(--success-text)]';
  if (row.is_archived) return 'border-[var(--danger)]/25 bg-[var(--danger-soft)] text-[var(--danger-text)]';
  return '';
}

export default function TeacherTestsPage() {
  const { access } = useAuthStore();
  const [tests, setTests] = useState<TestRow[] | null>(null);

  useEffect(() => {
    if (!access) return;
    apiFetch<{ results: TestRow[] }>('/api/teacher/tests/').then((d) => setTests(d.results))
      .catch((e) => toast.error(e instanceof Error ? e.message : "Yuklashda xatolik yuz berdi"));
  }, [access]);

  return (
    <TeacherShell>
      <div className="space-y-6">
        <PageHeader
          title="Mening testlarim"
          description="Yaratgan testlaringiz, ularning holati va savollar soni."
          actions={<Button asChild><Link href="/teacher/tests/new"><Plus className="size-4" /> Yangi test</Link></Button>}
        />

        {!tests && (
          <div className="space-y-2.5">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-[74px] w-full" />)}
          </div>
        )}

        {tests?.length === 0 && (
          <Card>
            <CardContent className="py-14 text-center">
              <FileCheck2 className="mx-auto mb-2 size-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">Hali test yaratilmagan.</p>
              <Button asChild size="sm" className="mt-4">
                <Link href="/teacher/tests/new">Birinchi testni yaratish</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="space-y-2.5">
          {tests?.map((t, i) => (
            <Reveal key={t.id} index={i}>
              <Link href={`/teacher/tests/${t.id}/build`} className="group block">
                <Card className="gap-0 py-0 transition-colors group-hover:border-[var(--accent-border)]">
                  <CardContent className="flex items-center justify-between gap-4 p-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold transition-colors group-hover:text-[var(--accent-text)]">
                        {t.title}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {t.subject || '—'} · {t.questions_count} ta savol
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <Badge variant={statusTone(t) ? 'outline' : 'secondary'} className={cn(statusTone(t))}>
                        {t.status_label}
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
