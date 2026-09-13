'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileCheck2, Plus, ChevronRight, Radio, Calendar, Sparkles } from 'lucide-react';
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
  id: number;
  title: string;
  subject: string | null;
  status_label: string;
  is_published: boolean;
  is_archived: boolean;
  is_live_mock?: boolean;
  scheduled_at?: string | null;
  questions_count: number;
  updated_at: string;
};

function statusTone(row: TestRow) {
  if (row.is_published) return 'border-[var(--success)]/25 bg-[var(--success-soft)] text-[var(--success-text)]';
  if (row.is_archived) return 'border-[var(--danger)]/25 bg-[var(--danger-soft)] text-[var(--danger-text)]';
  return '';
}

export default function TeacherTestsPage() {
  const { access } = useAuthStore();
  const [tests, setTests] = useState<TestRow[] | null>(null);
  const [tab, setTab] = useState<'all' | 'live'>('all');

  useEffect(() => {
    if (!access) return;
    apiFetch<{ results: TestRow[] }>('/api/teacher/tests/').then((d) => setTests(d.results))
      .catch((e) => toast.error(e instanceof Error ? e.message : "Yuklashda xatolik yuz berdi"));
  }, [access]);

  const filteredTests = tests?.filter((t) => {
    if (tab === 'live') return Boolean(t.is_live_mock);
    return true;
  });

  const liveMocksCount = tests?.filter((t) => t.is_live_mock).length || 0;

  return (
    <TeacherShell>
      <div className="space-y-6">
        <PageHeader
          title="Mening testlarim"
          description="Yaratgan testlaringiz, jonli mock imtihonlar va savollar ro'yxati."
          actions={
            <div className="flex items-center gap-2">
              <Button asChild>
                <Link href="/teacher/tests/new">
                  <Plus className="size-4" /> Yangi test / Mock
                </Link>
              </Button>
            </div>
          }
        />

        {/* Tab filtrlari */}
        <div className="flex items-center gap-2 border-b border-border/60 pb-3">
          <Button
            variant={tab === 'all' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setTab('all')}
            className="text-xs h-8"
          >
            Barchasi ({tests?.length || 0})
          </Button>
          <Button
            variant={tab === 'live' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setTab('live')}
            className={`text-xs h-8 gap-1.5 ${tab === 'live' ? 'bg-rose-600 hover:bg-rose-500 text-white' : 'text-rose-400 hover:text-rose-300'}`}
          >
            <Radio className="size-3 animate-pulse" /> Jonli Mocklar ({liveMocksCount})
          </Button>
        </div>

        {!tests && (
          <div className="space-y-2.5">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-[74px] w-full" />)}
          </div>
        )}

        {tests && filteredTests?.length === 0 && (
          <Card>
            <CardContent className="py-14 text-center">
              <FileCheck2 className="mx-auto mb-2 size-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                {tab === 'live' ? "Hali birorta ham Jonli Mock yaratilmagan." : "Hali test yaratilmagan."}
              </p>
              <Button asChild size="sm" className="mt-4">
                <Link href="/teacher/tests/new">
                  {tab === 'live' ? "Jonli Mock yaratish" : "Birinchi testni yaratish"}
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="space-y-2.5">
          {filteredTests?.map((t, i) => (
            <Reveal key={t.id} index={i}>
              <Link href={`/teacher/tests/${t.id}/build`} className="group block">
                <Card className={`gap-0 py-0 transition-all group-hover:border-[var(--accent-border)] ${
                  t.is_live_mock ? 'border-rose-500/30 bg-rose-500/[0.02]' : ''
                }`}>
                  <CardContent className="flex items-center justify-between gap-4 p-4">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold transition-colors group-hover:text-[var(--accent-text)]">
                          {t.title}
                        </p>
                        {t.is_live_mock && (
                          <Badge variant="outline" className="border-rose-500/40 bg-rose-500/10 text-rose-400 text-[10px] font-bold gap-1 px-1.5 py-0.5">
                            <span className="size-1.5 rounded-full bg-rose-500 animate-ping" />
                            Live Mock
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>{t.subject || '—'}</span>
                        <span>·</span>
                        <span>{t.questions_count} ta savol</span>
                        {t.scheduled_at && (
                          <>
                            <span>·</span>
                            <span className="text-rose-400 flex items-center gap-1 font-medium">
                              <Calendar className="size-3" />
                              {new Date(t.scheduled_at).toLocaleString('uz-UZ', {
                                day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                              })}
                            </span>
                          </>
                        )}
                      </div>
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
